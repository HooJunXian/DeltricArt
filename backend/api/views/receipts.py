from django.http import HttpResponse
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Order, Payment
from ..receipts import build_receipt_pdf


class OrderReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_number):
        order = get_receipt_order(order_number, user=request.user)
        if order is None:
            return Response(
                {"detail": "Order was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return receipt_response(order)


class AdminOrderReceiptView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, order_number):
        order = get_receipt_order(order_number)
        if order is None:
            return Response(
                {"detail": "Order was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return receipt_response(order)


def get_receipt_order(order_number, user=None):
    queryset = Order.objects.select_related("payment", "user").prefetch_related("items")
    if user is not None:
        queryset = queryset.filter(user=user)
    return queryset.filter(order_number=order_number).first()


def receipt_response(order):
    payment = getattr(order, "payment", None)
    if (
        order.status != Order.STATUS_PAID
        or payment is None
        or payment.status != Payment.STATUS_PAID
    ):
        return Response(
            {"detail": "A receipt is available after payment is completed."},
            status=status.HTTP_409_CONFLICT,
        )

    response = HttpResponse(build_receipt_pdf(order), content_type="application/pdf")
    response["Content-Disposition"] = (
        f'attachment; filename="receipt-{order.order_number}.pdf"'
    )
    response["Cache-Control"] = "private, no-store"
    response["X-Content-Type-Options"] = "nosniff"
    return response
