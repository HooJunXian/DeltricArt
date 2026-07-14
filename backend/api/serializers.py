from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from datetime import datetime, time
import re
from rest_framework import serializers
from django.utils import timezone

from .models import (
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


class CurrentUserSerializer(serializers.ModelSerializer):
    country = CountrySerializer(read_only=True)
    currency = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "mobile",
            "status",
            "country",
            "currency",
            "is_staff",
            "is_superuser",
        ]

    def get_currency(self, obj):
        return get_currency_settings(obj.country)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "first_name",
            "last_name",
            "mobile",
            "country",
            "status",
        ]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class AdminRoleSerializer(serializers.ModelSerializer):
    permission_count = serializers.IntegerField(read_only=True)
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Group
        fields = ["id", "name", "permission_count", "member_count"]


class AdminMemberSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "name", "email", "mobile", "status", "date_joined"]

    def get_name(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name or obj.username


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


class CartItemSerializer(serializers.ModelSerializer):
    product = CustomerProductSerializer(read_only=True)
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product_id",
            "product",
            "quantity",
            "unit_price_snapshot",
            "line_total",
            "created_at",
            "updated_at",
        ]

    def get_line_total(self, obj):
        return obj.quantity * obj.unit_price_snapshot


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id",
            "status",
            "items",
            "item_count",
            "subtotal",
            "created_at",
            "updated_at",
        ]

    def get_item_count(self, obj):
        return sum(item.quantity for item in obj.items.all())

    def get_subtotal(self, obj):
        return sum(item.quantity * item.unit_price_snapshot for item in obj.items.all())


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


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_code",
            "quantity",
            "unit_price",
            "line_total",
        ]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "provider",
            "status",
            "bill_id",
            "bill_url",
            "paid_amount",
            "paid_at",
            "created_at",
            "updated_at",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "fulfillment_method",
            "payment_method",
            "contact_name",
            "contact_email",
            "contact_mobile",
            "delivery_addr1",
            "delivery_addr2",
            "delivery_postcode",
            "delivery_city",
            "delivery_state",
            "pickup_date",
            "pickup_time",
            "currency_code",
            "currency_symbol",
            "exchange_rate",
            "subtotal",
            "delivery_fee",
            "total",
            "expires_at",
            "items",
            "payment",
            "created_at",
            "updated_at",
        ]
