from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import Cart, Order, Payment, Product
from .services import cents_to_money


def release_reserved_stock(order):
    """Release an order's reservation once. The order row must be locked."""
    if not order.stock_reserved_at or order.stock_released_at:
        return False

    for item in order.items.all():
        Product.objects.filter(pk=item.product_id).update(
            stock_balance=F("stock_balance") + item.quantity
        )
    order.stock_released_at = timezone.now()
    return True


def apply_billplz_payment_update(payment, data):
    """Apply a verified gateway event while the payment and order rows are locked."""
    order = payment.order

    # PAID is final. Duplicate or out-of-order events may update the audit payload,
    # but can never charge stock again or downgrade the order.
    if payment.status == Payment.STATUS_PAID or order.status == Order.STATUS_PAID:
        payment.raw_response = data
        payment.save(update_fields=["raw_response", "updated_at"])
        return False

    paid = str(data.get("paid", "")).lower() == "true"
    paid_amount = cents_to_money(data.get("paid_amount") or data.get("amount") or 0)
    payment.raw_response = data
    payment.paid_amount = paid_amount

    if paid and paid_amount >= order.total:
        # A gateway success is authoritative while payment is pending. Terminal
        # local outcomes are not reopened by delayed/out-of-order events.
        if order.status != Order.STATUS_PENDING_PAYMENT:
            payment.save(update_fields=["paid_amount", "raw_response", "updated_at"])
            return False
        # Compatibility for pending orders created before stock reservation was
        # introduced. New orders have already consumed available stock.
        if not order.stock_reserved_at:
            for item in order.items.all():
                Product.objects.filter(pk=item.product_id).update(
                    stock_balance=F("stock_balance") - item.quantity
                )
            order.stock_reserved_at = timezone.now()
        payment.status = Payment.STATUS_PAID
        payment.paid_at = timezone.now()
        order.status = Order.STATUS_PAID
        order.cart.status = Cart.STATUS_CHECKED_OUT
        order.cart.save(update_fields=["status", "updated_at"])
    else:
        if order.status != Order.STATUS_PENDING_PAYMENT:
            payment.save(update_fields=["paid_amount", "raw_response", "updated_at"])
            return False
        payment.status = Payment.STATUS_FAILED
        payment.paid_at = None
        order.status = Order.STATUS_FAILED
        release_reserved_stock(order)

    payment.save(
        update_fields=["status", "paid_amount", "paid_at", "raw_response", "updated_at"]
    )
    order.save(
        update_fields=["status", "stock_reserved_at", "stock_released_at", "updated_at"]
    )
    return True


@transaction.atomic
def expire_pending_order(order_id, now=None):
    """Expire one due order, safely racing against payment callbacks."""
    now = now or timezone.now()
    order = (
        Order.objects.select_for_update()
        .prefetch_related("items")
        .filter(pk=order_id)
        .first()
    )
    if (
        not order
        or order.status != Order.STATUS_PENDING_PAYMENT
        or not order.expires_at
        or order.expires_at > now
    ):
        return False

    order.status = Order.STATUS_EXPIRED
    release_reserved_stock(order)
    order.save(update_fields=["status", "stock_released_at", "updated_at"])
    return True


def expire_pending_orders(now=None):
    now = now or timezone.now()
    ids = list(
        Order.objects.filter(
            status=Order.STATUS_PENDING_PAYMENT,
            expires_at__lte=now,
        ).values_list("id", flat=True)
    )
    return sum(expire_pending_order(order_id, now=now) for order_id in ids)


@transaction.atomic
def cancel_pending_order(order_id):
    """Cancel a pending order and release its reservation exactly once."""
    order = (
        Order.objects.select_for_update()
        .prefetch_related("items")
        .filter(pk=order_id)
        .first()
    )
    if not order or order.status != Order.STATUS_PENDING_PAYMENT:
        return False
    order.status = Order.STATUS_CANCELLED
    release_reserved_stock(order)
    order.save(update_fields=["status", "stock_released_at", "updated_at"])
    return True
