from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from datetime import datetime, time
import re
from rest_framework import serializers
from django.utils import timezone

from ..models import (
    Cart,
    CartItem,
    Company,
    Country,
    ExchangeRate,
    Order,
    OrderItem,
    Payment,
    Postcode,
    Product,
    ProductCategory,
)


User = get_user_model()

PICKUP_START_TIME = time(10, 0)
PICKUP_END_TIME = time(18, 0)


CURRENCY_BY_COUNTRY = {
    "MY": {"code": "MYR", "symbol": "RM"},
    "SG": {"code": "SGD", "symbol": "S$"},
    "US": {"code": "USD", "symbol": "$"},
}

DEFAULT_CURRENCY = {
    "country_code": "MY",
    "currency_code": "MYR",
    "currency_symbol": "RM",
    "exchange_rate": "1.000000",
}


def get_currency_settings(country):
    if not country:
        return DEFAULT_CURRENCY.copy()

    country_code = country.code.upper()
    latest_rate = (
        ExchangeRate.objects.filter(country__code__iexact=country_code)
        .order_by("-created_at", "-id")
        .first()
    )
    if not latest_rate:
        return DEFAULT_CURRENCY.copy()

    currency = CURRENCY_BY_COUNTRY.get(country_code)
    if not currency:
        return DEFAULT_CURRENCY.copy()

    return {
        "country_code": country_code,
        "currency_code": currency["code"],
        "currency_symbol": currency["symbol"],
        "exchange_rate": str(latest_rate.rate),
    }


class CheckoutSerializer(serializers.Serializer):
    fulfillment_method = serializers.ChoiceField(choices=Order.FULFILLMENT_CHOICES)
    payment_method = serializers.ChoiceField(choices=Order.PAYMENT_METHOD_CHOICES)
    contact_name = serializers.CharField(max_length=120)
    contact_email = serializers.EmailField()
    contact_mobile = serializers.CharField(max_length=30)
    delivery_addr1 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    delivery_addr2 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    delivery_postcode = serializers.CharField(max_length=20, required=False, allow_blank=True)
    delivery_city = serializers.CharField(max_length=120, required=False, allow_blank=True)
    delivery_state = serializers.CharField(max_length=120, required=False, allow_blank=True)
    pickup_date = serializers.DateField(required=False, allow_null=True)
    pickup_time = serializers.TimeField(required=False, allow_null=True)

    def validate(self, attrs):
        fulfillment_method = attrs["fulfillment_method"]

        if fulfillment_method == Order.FULFILLMENT_DELIVERY:
            required_delivery_fields = [
                "delivery_addr1",
                "delivery_postcode",
                "delivery_city",
                "delivery_state",
            ]
            missing_fields = [
                field
                for field in required_delivery_fields
                if not attrs.get(field, "").strip()
            ]
            if missing_fields:
                raise serializers.ValidationError(
                    {field: "This field is required for delivery." for field in missing_fields}
                )

        if fulfillment_method == Order.FULFILLMENT_SELF_PICKUP:
            pickup_date = attrs.get("pickup_date")
            pickup_time = attrs.get("pickup_time")
            if not pickup_date:
                raise serializers.ValidationError(
                    {"pickup_date": "Pickup date is required for self pickup."}
                )
            if not pickup_time:
                raise serializers.ValidationError(
                    {"pickup_time": "Pickup time is required for self pickup."}
                )
            if pickup_date.weekday() >= 5:
                raise serializers.ValidationError(
                    {"pickup_date": "Weekend pickup is unavailable."}
                )
            if pickup_time < PICKUP_START_TIME or pickup_time > PICKUP_END_TIME:
                raise serializers.ValidationError(
                    {"pickup_time": "Pickup is available from 10:00 AM to 6:00 PM on weekdays."}
                )
            pickup_at = timezone.make_aware(
                datetime.combine(pickup_date, pickup_time),
                timezone.get_current_timezone(),
            )
            if pickup_at < timezone.localtime():
                raise serializers.ValidationError(
                    {"pickup_time": "Pickup date and time cannot be earlier than now."}
                )

        return attrs

