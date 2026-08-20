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

def get_checkout_delivery_fee():
    return Decimal(str(getattr(settings, "CHECKOUT_DELIVERY_FEE", "10.00"))).quantize(
        Decimal("0.01")
    )


def get_payment_urls(request):
    return {
        "callback_url": request.build_absolute_uri("/api/payments/billplz/callback/"),
        "redirect_url": request.build_absolute_uri("/api/payments/billplz/return/"),
    }


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        checkout_data = serializer.validated_data

        try:
            cart = (
                Cart.objects.select_for_update()
                .prefetch_related("items__product")
                .get(user=request.user, status=Cart.STATUS_ACTIVE)
            )
        except Cart.DoesNotExist:
            return Response(
                {"detail": "Your cart is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cart_items = list(cart.items.select_related("product"))
        if not cart_items:
            return Response(
                {"detail": "Your cart is empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Lock the inventory rows so concurrent checkouts cannot both reserve
        # the same last unit.
        products = {
            product.id: product
            for product in Product.objects.select_for_update().filter(
                id__in=[item.product_id for item in cart_items]
            )
        }
        for item in cart_items:
            product = products[item.product_id]
            if not product.is_show:
                return Response(
                    {"detail": f"{product.name} is no longer available."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if item.quantity > product.stock_balance:
                return Response(
                    {"detail": f"{product.name} does not have enough stock."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        subtotal = sum(products[item.product_id].price * item.quantity for item in cart_items)
        delivery_fee = (
            Decimal("0.00")
            if checkout_data["fulfillment_method"] == Order.FULFILLMENT_SELF_PICKUP
            else get_checkout_delivery_fee()
        )
        total = subtotal + delivery_fee
        currency_settings = get_currency_settings(request.user.country)
        now = timezone.now()
        ttl_minutes = int(getattr(settings, "PAYMENT_PENDING_TTL_MINUTES", 30))

        order = Order.objects.create(
            user=request.user,
            cart=cart,
            status=Order.STATUS_PENDING_PAYMENT,
            fulfillment_method=checkout_data["fulfillment_method"],
            payment_method=checkout_data["payment_method"],
            contact_name=checkout_data["contact_name"],
            contact_email=checkout_data["contact_email"],
            contact_mobile=checkout_data["contact_mobile"],
            delivery_addr1=checkout_data.get("delivery_addr1", ""),
            delivery_addr2=checkout_data.get("delivery_addr2", ""),
            delivery_postcode=checkout_data.get("delivery_postcode", ""),
            delivery_city=checkout_data.get("delivery_city", ""),
            delivery_state=checkout_data.get("delivery_state", ""),
            pickup_date=checkout_data.get("pickup_date"),
            pickup_time=checkout_data.get("pickup_time"),
            currency_code=currency_settings["currency_code"],
            currency_symbol=currency_settings["currency_symbol"],
            exchange_rate=currency_settings["exchange_rate"],
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total=total,
            expires_at=now + timedelta(minutes=ttl_minutes),
            stock_reserved_at=now,
        )

        order_items = [
            OrderItem(
                order=order,
                product=products[item.product_id],
                product_name=products[item.product_id].name,
                product_code=products[item.product_id].code,
                quantity=item.quantity,
                unit_price=products[item.product_id].price,
                line_total=products[item.product_id].price * item.quantity,
            )
            for item in cart_items
        ]
        OrderItem.objects.bulk_create(order_items)

        for item in cart_items:
            Product.objects.filter(pk=item.product_id).update(
                stock_balance=F("stock_balance") - item.quantity
            )
        cart.status = Cart.STATUS_CHECKED_OUT
        cart.save(update_fields=["status", "updated_at"])

        payment_mode = str(getattr(settings, "CHECKOUT_PAYMENT_MODE", "manual")).lower()
        payment = Payment.objects.create(order=order, provider=Payment.PROVIDER_BILLPLZ)

        if payment_mode == "billplz":
            payment_urls = get_payment_urls(request)
            try:
                bill = create_billplz_bill(
                    order=order,
                    callback_url=payment_urls["callback_url"],
                    redirect_url=payment_urls["redirect_url"],
                )
            except ImproperlyConfigured as error:
                transaction.set_rollback(True)
                return Response(
                    {"detail": str(error)},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            payment.bill_id = bill.get("id", "")
            payment.bill_url = bill.get("url", "")
            payment.raw_response = bill
            payment.save(update_fields=["bill_id", "bill_url", "raw_response", "updated_at"])
        elif payment_mode == "manual":
            payment_urls = get_payment_urls(request)
            bill_id = f"TEST{order.id:06d}"
            bill_url = request.build_absolute_uri(f"/api/payments/billplz/mock/{bill_id}/")
            bill = build_mock_billplz_bill(
                order=order,
                bill_id=bill_id,
                bill_url=bill_url,
                callback_url=payment_urls["callback_url"],
                redirect_url=payment_urls["redirect_url"],
            )
            payment.bill_id = bill["id"]
            payment.bill_url = bill["url"]
            payment.raw_response = bill
            payment.save(update_fields=["bill_id", "bill_url", "raw_response", "updated_at"])
        else:
            transaction.set_rollback(True)
            return Response(
                {"detail": f"Unsupported checkout payment mode: {payment_mode}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "order": OrderSerializer(order).data,
                "payment_url": payment.bill_url,
                "checkout_mode": payment_mode,
            },
            status=status.HTTP_201_CREATED,
        )


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_number):
        try:
            order = (
                Order.objects.select_related("payment")
                .prefetch_related("items")
                .get(order_number=order_number, user=request.user)
            )
        except Order.DoesNotExist:
            return Response(
                {"detail": "Order was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(OrderSerializer(order).data)


class OrderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = (
            Order.objects.select_related("payment")
            .prefetch_related("items")
            .filter(user=request.user)
            .order_by("-created_at")
        )
        return Response(OrderSerializer(orders, many=True).data)


class OrderCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_number):
        order = Order.objects.filter(
            order_number=order_number,
            user=request.user,
        ).first()
        if not order:
            return Response(
                {"detail": "Order was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not cancel_pending_order(order.id):
            return Response(
                {"detail": "Only pending-payment orders can be cancelled."},
                status=status.HTTP_409_CONFLICT,
            )
        order.refresh_from_db()
        return Response(OrderSerializer(order).data)


