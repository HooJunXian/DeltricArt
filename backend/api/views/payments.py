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


def get_gateway_bill(bill_id):
    """Use the public api.views hook when tests patch the legacy path."""
    import sys

    public_views = sys.modules.get("api.views")
    bill_lookup = getattr(public_views, "get_billplz_bill", get_billplz_bill)
    return bill_lookup(bill_id)


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
                gateway_data = get_gateway_bill(bill_id) if payment_ref else None
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


