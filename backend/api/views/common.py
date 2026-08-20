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

class CountryListView(generics.ListAPIView):
    queryset = Country.objects.filter(is_show=True).order_by("name")
    serializer_class = CountrySerializer
    permission_classes = [AllowAny]


class CompanyDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        company = Company.objects.first()
        if not company:
            return Response({})
        return Response(CompanySerializer(company, context={"request": request}).data)


class AdminCompanyDetailView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    allowed_logo_content_types = {"image/jpeg", "image/png"}
    max_logo_size = 5 * 1024 * 1024

    def get(self, request):
        company = Company.objects.first()
        if not company:
            return Response({})
        return Response(CompanySerializer(company, context={"request": request}).data)

    def put(self, request):
        company = Company.objects.first()
        data = request.data.copy()
        uploaded_logo = request.FILES.get("cLogoFile")
        if uploaded_logo:
            validation_error = self._validate_company_logo(uploaded_logo)
            if validation_error:
                return validation_error
            data["cLogo"] = self._save_company_logo(uploaded_logo)
        serializer = CompanySerializer(instance=company, data=data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(id=1)
        return Response(serializer.data)

    def patch(self, request):
        company = Company.objects.first()
        data = request.data.copy()
        uploaded_logo = request.FILES.get("cLogoFile")
        if uploaded_logo:
            validation_error = self._validate_company_logo(uploaded_logo)
            if validation_error:
                return validation_error
            data["cLogo"] = self._save_company_logo(uploaded_logo)
        serializer = CompanySerializer(
            instance=company,
            data=data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(id=1)
        return Response(serializer.data)

    def _save_company_logo(self, logo_file):
        saved_path = default_storage.save(f"company/{logo_file.name}", logo_file)
        return default_storage.url(saved_path)

    def _validate_company_logo(self, logo_file):
        if logo_file.content_type not in self.allowed_logo_content_types:
            return Response(
                {"detail": "Company logo must be a JPG, JPEG, or PNG image."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if logo_file.size > self.max_logo_size:
            return Response(
                {"detail": "Company logo must not be larger than 5MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return None


class PostcodeListView(generics.ListAPIView):
    serializer_class = PostcodeSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Postcode.objects.select_related("pCountry").order_by(
            "pPostcode",
            "pCity",
            "pState",
        )
        postcode = self.request.query_params.get("postcode", "").strip()
        search = self.request.query_params.get("q", "").strip()
        country = self.request.query_params.get("country", "MY").strip()

        if postcode:
            queryset = queryset.filter(pPostcode__iexact=postcode)

        if search:
            queryset = queryset.filter(
                Q(pPostcode__icontains=search)
                | Q(pCity__icontains=search)
                | Q(pState__icontains=search)
            )

        if country:
            queryset = queryset.filter(pCountry__code__iexact=country)

        return queryset[:50]


