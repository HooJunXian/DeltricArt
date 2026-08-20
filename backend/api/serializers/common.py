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


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ["id", "name", "code"]


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            "id",
            "cName",
            "cAddress1",
            "cAddress2",
            "cPostcode",
            "cCity",
            "cState",
            "cOfficeNo",
            "cOfficeTelNo",
            "cOwner",
            "cOwnerTelNo",
            "cOfficeEmail",
            "cOwnerEmail",
            "cLogo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["cLogo"] = self._build_media_url(data.get("cLogo"))
        return data

    def _build_media_url(self, value):
        if not value:
            return value

        if value.startswith(("http://", "https://", "blob:", "data:")):
            return value

        request = self.context.get("request")
        if request and value.startswith("/"):
            return request.build_absolute_uri(value)

        return value


class PostcodeSerializer(serializers.ModelSerializer):
    pCountryName = serializers.CharField(source="pCountry.name", read_only=True)
    pCountryCode = serializers.CharField(source="pCountry.code", read_only=True)

    class Meta:
        model = Postcode
        fields = [
            "pId",
            "pPostcode",
            "pCity",
            "pState",
            "pCountry",
            "pCountryName",
            "pCountryCode",
        ]

