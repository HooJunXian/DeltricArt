from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from datetime import timedelta
from decimal import Decimal
from html import escape
from urllib.parse import urlparse
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import default_storage
from django.http import HttpResponse
from django.db import transaction
from django.db.models import Count, F, Q
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import generics, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

from ..models import (
    Cart,
    CartItem,
    Company,
    Country,
    Order,
    OrderItem,
    Payment,
    BillplzEvent,
    Postcode,
    Product,
    ProductCategory,
    ProductImage,
)
from ..payment_lifecycle import apply_billplz_payment_update, cancel_pending_order
from ..serializers import (
    AdminCategorySerializer,
    AdminMemberSerializer,
    AdminProductSerializer,
    AdminRoleSerializer,
    CartSerializer,
    CheckoutSerializer,
    CompanySerializer,
    CountrySerializer,
    CustomerProductSerializer,
    CurrentUserSerializer,
    OrderSerializer,
    PostcodeSerializer,
    RegisterSerializer,
    UserSerializer,
    get_currency_settings,
)
from ..services import (
    cents_to_money,
    create_billplz_bill,
    get_billplz_bill,
    verify_billplz_signature,
)
from ..services import build_mock_billplz_bill

User = get_user_model()

class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        roles = Group.objects.annotate(
            permission_count=Count("permissions", distinct=True),
            member_count=Count("user", distinct=True),
        ).order_by("name")
        recent_members = (
            User.objects.filter(is_superuser=False)
            .order_by("-date_joined")[:5]
        )

        return Response(
            {
                "stats": {
                    "protected_superadmin_count": User.objects.filter(username="superadmin").count(),
                    "admin_role_count": roles.count(),
                    "member_count": User.objects.filter(is_superuser=False).count(),
                    "category_count": ProductCategory.objects.count(),
                    "active_category_count": ProductCategory.objects.filter(is_show=True).count(),
                    "product_count": Product.objects.count(),
                    "active_product_count": Product.objects.filter(is_show=True).count(),
                    "low_stock_count": Product.objects.filter(stock_balance__lte=5, is_show=True).count(),
                },
                "roles": AdminRoleSerializer(roles, many=True).data,
                "recent_members": AdminMemberSerializer(recent_members, many=True).data,
                "recent_orders": [],
                "recent_products": [],
                "catalog_snapshot": [],
                "order_status_summary": [],
            }
        )


class AdminCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = AdminCategorySerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return ProductCategory.objects.select_related("parent").annotate(
            product_count=Count("products", distinct=True),
            child_count=Count("children", distinct=True),
        ).order_by("parent__name", "parent__id", "seq", "name")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        if category.products.exists():
            return Response(
                {"detail": "This category has products. Hide it instead of deleting it."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if category.children.exists():
            return Response(
                {"detail": "This main category has sub categories. Delete or move them first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)


class AdminProductViewSet(viewsets.ModelViewSet):
    serializer_class = AdminProductSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = Product.objects.select_related(
            "category",
            "category__parent",
        ).prefetch_related("images").order_by("-created_at", "name")

        search = self.request.query_params.get("search", "").strip()
        category = self.request.query_params.get("category", "").strip()
        active = self.request.query_params.get("active", "").strip().lower()

        if search:
            queryset = queryset.filter(
                Q(code__icontains=search)
                | Q(name__icontains=search)
                | Q(description__icontains=search)
            )

        if category:
            queryset = queryset.filter(Q(category_id=category) | Q(category__parent_id=category))

        if active in {"true", "false"}:
            queryset = queryset.filter(is_show=active == "true")

        return queryset

    def perform_create(self, serializer):
        now = timezone.now()
        product = serializer.save(
            created_by=self.request.user,
            show_date_start=now,
            show_date_end=now + timedelta(days=3650),
        )
        self._save_uploaded_images(product)

    def perform_update(self, serializer):
        product = serializer.save()
        if self.request.FILES.getlist("images"):
            existing_images = list(product.images.all())
            self._delete_image_files(existing_images)
            product.images.all().delete()
            self._save_uploaded_images(product)
        else:
            self._delete_removed_images(product)
            self._sync_existing_main_image(product)

    def _save_uploaded_images(self, product):
        uploaded_images = self.request.FILES.getlist("images")
        if not uploaded_images:
            return

        main_image_url = ""
        for index, image_file in enumerate(uploaded_images):
            saved_path = default_storage.save(f"products/{product.id}/{image_file.name}", image_file)
            image_url = default_storage.url(saved_path)
            if index == 0:
                main_image_url = image_url
            ProductImage.objects.create(
                product=product,
                image=image_url,
                seq=index,
                is_main=index == 0,
                created_by=self.request.user,
            )

        if main_image_url:
            product.image = main_image_url
            product.save(update_fields=["image", "updated_at"])

    def _sync_existing_main_image(self, product):
        if "image" not in self.request.data:
            return

        selected_image = self._normalize_image_value(self.request.data.get("image", ""))

        if product.image != selected_image:
            product.image = selected_image
            product.save(update_fields=["image", "updated_at"])

        product_images = list(product.images.all())
        if not product_images:
            return

        if not selected_image:
            for product_image in product_images:
                product_image.is_main = False
            ProductImage.objects.bulk_update(product_images, ["is_main"])
            return

        selected_index = next(
            (
                index
                for index, product_image in enumerate(product_images)
                if self._normalize_image_value(product_image.image) == selected_image
            ),
            None,
        )
        if selected_index is None:
            return

        ordered_images = [
            product_images[selected_index],
            *[
                product_image
                for index, product_image in enumerate(product_images)
                if index != selected_index
            ],
        ]

        for index, product_image in enumerate(ordered_images):
            product_image.seq = index
            product_image.is_main = index == 0

        ProductImage.objects.bulk_update(ordered_images, ["seq", "is_main"])

    def _delete_removed_images(self, product):
        if hasattr(self.request.data, "getlist"):
            removed_values = self.request.data.getlist("removed_images")
        else:
            removed_values = self.request.data.get("removed_images", [])
            if isinstance(removed_values, str):
                removed_values = [removed_values]
        removed_images = {
            self._normalize_image_value(value)
            for value in removed_values
            if self._normalize_image_value(value)
        }
        if not removed_images:
            return

        images_to_delete = [
            product_image
            for product_image in product.images.all()
            if self._normalize_image_value(product_image.image) in removed_images
        ]
        self._delete_image_files(images_to_delete)
        ProductImage.objects.filter(id__in=[image.id for image in images_to_delete]).delete()

    def _delete_image_files(self, product_images):
        for product_image in product_images:
            image_path = self._normalize_image_value(product_image.image)
            if not image_path or not image_path.startswith(settings.MEDIA_URL):
                continue

            storage_path = image_path[len(settings.MEDIA_URL):].lstrip("/")
            if storage_path:
                default_storage.delete(storage_path)

    def _normalize_image_value(self, value):
        if not value:
            return ""

        parsed = urlparse(value.strip())
        path = parsed.path if parsed.scheme and parsed.netloc else value.strip()
        if path.startswith(settings.MEDIA_URL):
            return path

        return value.strip()

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        product.is_show = False
        product.save(update_fields=["is_show", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


