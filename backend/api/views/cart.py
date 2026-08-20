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

def get_active_cart(user):
    return Cart.objects.get_or_create(user=user, status=Cart.STATUS_ACTIVE)[0]


class CartDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart = get_active_cart(request.user)
        cart = Cart.objects.prefetch_related(
            "items__product__category",
            "items__product__category__parent",
            "items__product__images",
        ).get(id=cart.id)
        return Response(CartSerializer(cart, context={"request": request}).data)


class CartItemAddView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get("product_id")
        try:
            quantity = int(request.data.get("quantity", 1) or 1)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Quantity must be a whole number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity < 1:
            return Response(
                {"detail": "Quantity must be at least 1."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            product = Product.objects.get(id=product_id, is_show=True)
        except Product.DoesNotExist:
            return Response(
                {"detail": "Product is not available."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if product.stock_balance <= 0:
            return Response(
                {"detail": "This product is currently out of stock."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart = get_active_cart(request.user)
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={
                "quantity": 0,
                "unit_price_snapshot": product.price,
            },
        )

        next_quantity = item.quantity + quantity
        if next_quantity > product.stock_balance:
            return Response(
                {"detail": "Requested quantity is higher than available stock."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.quantity = next_quantity
        if created or item.unit_price_snapshot != product.price:
            item.unit_price_snapshot = product.price
        item.save(update_fields=["quantity", "unit_price_snapshot", "updated_at"])

        return Response(
            CartSerializer(
                Cart.objects.prefetch_related(
                    "items__product__category",
                    "items__product__category__parent",
                    "items__product__images",
                ).get(id=cart.id),
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class CartItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, product_id):
        try:
            quantity = int(request.data.get("quantity", 1) or 0)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Quantity must be a whole number."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cart = get_active_cart(request.user)

        try:
            item = CartItem.objects.select_related("product").get(
                cart=cart,
                product_id=product_id,
            )
        except CartItem.DoesNotExist:
            return Response(
                {"detail": "Cart item was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if quantity <= 0:
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if quantity > item.product.stock_balance:
            return Response(
                {"detail": "Requested quantity is higher than available stock."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, product_id):
        cart = get_active_cart(request.user)
        CartItem.objects.filter(cart=cart, product_id=product_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


