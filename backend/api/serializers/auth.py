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


class RegisterSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True)
    mobile_country_code = serializers.CharField(write_only=True, required=False, allow_blank=True)
    country_id = serializers.PrimaryKeyRelatedField(
        queryset=Country.objects.all(),
        source="country",
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "password",
            "confirm_password",
            "mobile_country_code",
            "mobile",
            "email",
            "country_id",
        ]
        extra_kwargs = {
            "username": {"required": True},
            "password": {"write_only": True, "required": True},
            "mobile": {"required": True},
            "email": {"required": True},
        }

    def validate_mobile(self, value):
        digits = re.sub(r"\D", "", value)
        if not digits:
            raise serializers.ValidationError("Mobile number is required.")
        return digits

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "Password and confirm password must match."}
            )

        mobile_country_code = re.sub(r"\D", "", attrs.pop("mobile_country_code", ""))
        mobile = attrs["mobile"].lstrip("0")

        if mobile_country_code:
            attrs["mobile"] = f"{mobile_country_code}{mobile}"
        else:
            attrs["mobile"] = mobile

        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            mobile=validated_data["mobile"],
            email=validated_data["email"],
            country=validated_data["country"],
            status=User.STATUS_ACTIVE,
        )

