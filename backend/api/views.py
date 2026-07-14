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

from .models import (
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
from .payment_lifecycle import apply_billplz_payment_update, cancel_pending_order
from .serializers import (
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
from .services import (
    cents_to_money,
    create_billplz_bill,
    get_billplz_bill,
    verify_billplz_signature,
)
from .services import build_mock_billplz_bill


User = get_user_model()


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    "success": True,
                    "message": "User registered successfully",
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            {
                "success": False,
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


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


class CustomerProductListView(generics.ListAPIView):
    serializer_class = CustomerProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Product.objects.filter(is_show=True).select_related(
            "category",
            "category__parent",
        ).prefetch_related("images").order_by("-created_at", "name")


class CurrentUserView(APIView):
    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)


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


class BillPlzCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @transaction.atomic
    def post(self, request):
        data = request.data.copy()
        payload = {key: data.get(key) for key in data.keys()}
        bill_id = str(data.get("id", ""))
        payment_ref = Payment.objects.only("id", "order_id").filter(bill_id=bill_id).first()
        signature_valid = verify_billplz_signature(data)
        event = BillplzEvent.objects.create(
            payment=payment_ref,
            event_type=BillplzEvent.EVENT_WEBHOOK,
            gateway_reference=bill_id,
            signature_valid=signature_valid,
            payload=payload,
        )
        verified_via_api = False
        if not signature_valid:
            # Never trust an invalid callback directly. For a bill already known
            # to us, ask BillPlz's authenticated API for the current state.
            try:
                gateway_data = get_billplz_bill(bill_id) if payment_ref else None
            except (ImproperlyConfigured, OSError, ValueError):
                gateway_data = None
            if (
                not gateway_data
                or str(gateway_data.get("id", "")) != bill_id
                or str(gateway_data.get("paid", "")).lower() != "true"
            ):
                event.processing_result = "invalid_signature"
                event.save(update_fields=["processing_result"])
                return Response(
                    {"detail": "Invalid BillPlz signature."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            data = gateway_data
            verified_via_api = True

        try:
            if not payment_ref:
                raise Payment.DoesNotExist
            order = (
                Order.objects.select_for_update()
                .select_related("cart")
                .prefetch_related("items")
                .get(pk=payment_ref.order_id)
            )
            payment = Payment.objects.select_for_update().get(pk=payment_ref.pk)
            payment.order = order
        except Payment.DoesNotExist:
            event.processing_result = "payment_not_found"
            event.save(update_fields=["processing_result"])
            return Response(
                {"detail": "Payment was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        changed = apply_billplz_payment_update(payment, data)
        event.processed = True
        if verified_via_api:
            event.processing_result = "verified_via_api" if changed else "api_verified_terminal"
        else:
            event.processing_result = "applied" if changed else "duplicate_or_terminal"
        event.save(update_fields=["processed", "processing_result"])

        return Response({"success": True})


class BillPlzMockBillView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @transaction.atomic
    def get(self, request, bill_id):
        payment_mode = str(getattr(settings, "CHECKOUT_PAYMENT_MODE", "manual")).lower()
        if not getattr(settings, "DEBUG", False) and payment_mode != "manual":
            return Response(
                {"detail": "BillPlz mock payments are only available in manual checkout mode."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payment_ref = Payment.objects.only("id", "order_id").filter(bill_id=bill_id).first()
        if not payment_ref:
            return Response(
                {"detail": "Payment was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        order = (
            Order.objects.select_for_update()
            .select_related("cart")
            .prefetch_related("items")
            .get(pk=payment_ref.order_id)
        )
        payment = Payment.objects.select_for_update().get(pk=payment_ref.pk)
        payment.order = order

        action = request.query_params.get("action", "")
        if action in {"paid", "failed"}:
            paid = action == "paid"
            amount = int(payment.raw_response.get("amount") or 0)
            data = {
                **payment.raw_response,
                "id": payment.bill_id,
                "paid": "true" if paid else "false",
                "state": "paid" if paid else "due",
                "paid_amount": amount if paid else 0,
                "paid_at": timezone.now().isoformat() if paid else None,
            }
            apply_billplz_payment_update(payment, data)
            return redirect(
                f"{payment.raw_response.get('redirect_url')}"
                f"?billplz[id]={payment.bill_id}&billplz[paid]={str(paid).lower()}"
            )

        amount = cents_to_money(payment.raw_response.get("amount", 0))
        html = f"""
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BillPlz Mock Bill</title>
    <style>
      body {{ margin: 0; font-family: Arial, sans-serif; background: #f5f5f4; color: #1c1917; }}
      main {{ min-height: 100vh; display: grid; place-items: center; padding: 24px; }}
      section {{ width: min(520px, 100%); background: white; border: 1px solid #e7e5e4; border-radius: 8px; padding: 28px; box-shadow: 0 18px 45px rgba(28, 25, 23, 0.08); }}
      h1 {{ margin: 0 0 8px; font-size: 24px; }}
      p {{ margin: 0; color: #57534e; line-height: 1.6; }}
      dl {{ display: grid; grid-template-columns: 140px 1fr; gap: 12px; margin: 24px 0; }}
      dt {{ color: #78716c; }}
      dd {{ margin: 0; font-weight: 700; overflow-wrap: anywhere; }}
      div {{ display: flex; gap: 12px; flex-wrap: wrap; }}
      a {{ display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 18px; border-radius: 6px; text-decoration: none; font-weight: 700; }}
      .paid {{ background: #166534; color: white; }}
      .failed {{ background: #f5f5f4; color: #7f1d1d; border: 1px solid #d6d3d1; }}
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>BillPlz Mock Bill</h1>
        <p>This local test bill uses the same order update path as the BillPlz callback.</p>
        <dl>
          <dt>Bill ID</dt><dd>{escape(payment.bill_id)}</dd>
          <dt>Order</dt><dd>{escape(order.order_number)}</dd>
          <dt>Name</dt><dd>{escape(order.contact_name.upper())}</dd>
          <dt>Email</dt><dd>{escape(order.contact_email)}</dd>
          <dt>Amount</dt><dd>RM {amount}</dd>
          <dt>State</dt><dd>{escape(str(payment.raw_response.get("state", "due")))}</dd>
        </dl>
        <div>
          <a class="paid" href="?action=paid">Mark as paid</a>
          <a class="failed" href="?action=failed">Mark as failed</a>
        </div>
      </section>
    </main>
  </body>
</html>
"""
        return HttpResponse(html)


class BillPlzReturnView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        bill_id = request.query_params.get("billplz[id]", request.query_params.get("id", ""))
        payment = Payment.objects.select_related("order").filter(bill_id=bill_id).first()
        BillplzEvent.objects.create(
            payment=payment,
            event_type=BillplzEvent.EVENT_BROWSER_RETURN,
            gateway_reference=bill_id,
            processed=False,
            processing_result="display_only",
            payload={key: request.query_params.get(key) for key in request.query_params.keys()},
        )
        frontend_base_url = str(getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")).rstrip("/")

        if payment:
            return redirect(
                f"{frontend_base_url}/receipt/{payment.order.order_number}"
            )

        return redirect(f"{frontend_base_url}/receipt")


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
            product.images.all().delete()
            self._save_uploaded_images(product)
        else:
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
        selected_image = self._normalize_image_value(self.request.data.get("image", ""))
        if not selected_image:
            return

        if product.image != selected_image:
            product.image = selected_image
            product.save(update_fields=["image", "updated_at"])

        product_images = list(product.images.all())
        if not product_images:
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
