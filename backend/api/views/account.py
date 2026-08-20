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

class CurrentUserView(APIView):
    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)


