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


class AdminCategorySerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(
        queryset=ProductCategory.objects.all(),
        allow_null=True,
        required=False,
    )
    parent_name = serializers.CharField(source="parent.name", read_only=True)
    active = serializers.BooleanField(source="is_show", required=False)
    product_count = serializers.IntegerField(read_only=True)
    child_count = serializers.IntegerField(read_only=True)
    category_type = serializers.SerializerMethodField()

    class Meta:
        model = ProductCategory
        fields = [
            "id",
            "parent",
            "parent_name",
            "name",
            "description",
            "active",
            "category_type",
            "product_count",
            "child_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "parent_name",
            "category_type",
            "product_count",
            "child_count",
            "created_at",
            "updated_at",
        ]

    def get_category_type(self, obj):
        return "Sub category" if obj.parent_id else "Main category"

    def validate(self, attrs):
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        if self.instance and parent and parent.id == self.instance.id:
            raise serializers.ValidationError({"parent": "A category cannot be its own parent."})
        if parent and parent.parent_id:
            raise serializers.ValidationError(
                {"parent": "Choose a main category as the parent."}
            )
        return attrs


class AdminProductSerializer(serializers.ModelSerializer):
    active = serializers.BooleanField(source="is_show", required=False)
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_parent = serializers.IntegerField(source="category.parent_id", read_only=True)
    category_parent_name = serializers.CharField(source="category.parent.name", read_only=True)
    category_path = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    width_cm = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True, required=False)
    height_cm = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True, required=False)
    length_cm = serializers.DecimalField(max_digits=8, decimal_places=2, allow_null=True, required=False)

    class Meta:
        model = Product
        fields = [
            "id",
            "code",
            "name",
            "category",
            "category_name",
            "category_parent",
            "category_parent_name",
            "category_path",
            "description",
            "price",
            "stock_balance",
            "width_cm",
            "height_cm",
            "length_cm",
            "image",
            "images",
            "active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "category_name",
            "category_parent",
            "category_parent_name",
            "category_path",
            "images",
            "created_at",
            "updated_at",
        ]

    def get_category_path(self, obj):
        if obj.category.parent:
            return f"{obj.category.parent.name} > {obj.category.name}"
        return obj.category.name

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["image"] = self._build_media_url(data.get("image"))
        return data

    def get_images(self, obj):
        image_urls = [self._build_media_url(item.image) for item in obj.images.all()]
        main_image = self._build_media_url(obj.image)
        if main_image and main_image not in image_urls:
            return [main_image, *image_urls]
        return image_urls

    def _build_media_url(self, value):
        if not value:
            return value

        if value.startswith(("http://", "https://", "blob:", "data:")):
            return value

        request = self.context.get("request")
        if request and value.startswith("/"):
            return request.build_absolute_uri(value)

        return value


class CustomerProductSerializer(AdminProductSerializer):
    _id = serializers.SerializerMethodField()
    subCategory = serializers.SerializerMethodField()
    sizes = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    bestseller = serializers.SerializerMethodField()

    class Meta(AdminProductSerializer.Meta):
        fields = [
            "_id",
            "id",
            "code",
            "name",
            "category",
            "category_name",
            "category_parent",
            "category_parent_name",
            "category_path",
            "subCategory",
            "description",
            "price",
            "stock_balance",
            "width_cm",
            "height_cm",
            "length_cm",
            "image",
            "images",
            "sizes",
            "date",
            "bestseller",
            "active",
            "created_at",
            "updated_at",
        ]

    def get__id(self, obj):
        return str(obj.id)

    def get_subCategory(self, obj):
        return obj.category.name

    def get_sizes(self, obj):
        return ["Original"]

    def get_date(self, obj):
        return int(obj.created_at.timestamp() * 1000)

    def get_bestseller(self, obj):
        return False

