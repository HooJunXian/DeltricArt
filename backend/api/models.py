from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models


class Country(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=2, unique=True)
    is_show = models.BooleanField(default=True)

    class Meta:
        db_table = "country"
        ordering = ["name"]
        verbose_name_plural = "countries"

    def __str__(self):
        return f"{self.name} ({self.code})"


class User(AbstractUser):
    id = models.AutoField(primary_key=True)

    STATUS_ACTIVE = "AC"
    STATUS_TERMINATED = "TM"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_TERMINATED, "Terminated"),
    ]

    mobile = models.CharField(max_length=30, blank=True)
    email = models.EmailField(unique=True)
    country = models.ForeignKey(
        Country,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    status = models.CharField(
        max_length=2,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users"
        ordering = ["-created_at", "username"]

    def __str__(self):
        return self.username


class UserAddress(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="addresses",
    )
    addr1 = models.CharField(max_length=255)
    addr2 = models.CharField(max_length=255, blank=True)
    postcode = models.CharField(max_length=20)
    city = models.CharField(max_length=120)
    state = models.CharField(max_length=120)
    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        related_name="addresses",
    )

    class Meta:
        db_table = "user_addresses"
        ordering = ["user", "id"]
        verbose_name_plural = "user addresses"

    def __str__(self):
        return f"{self.user} - {self.city}"


class Company(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    cName = models.CharField(max_length=180)
    cAddress1 = models.CharField(max_length=255, blank=True)
    cAddress2 = models.CharField(max_length=255, blank=True)
    cPostcode = models.CharField(max_length=20, blank=True)
    cCity = models.CharField(max_length=120, blank=True)
    cState = models.CharField(max_length=120, blank=True)
    cOfficeNo = models.CharField(max_length=40, blank=True)
    cOfficeTelNo = models.CharField(max_length=40, blank=True)
    cOwner = models.CharField(max_length=120, blank=True)
    cOwnerTelNo = models.CharField(max_length=40, blank=True)
    cOfficeEmail = models.EmailField(blank=True)
    cOwnerEmail = models.EmailField(blank=True)
    cLogo = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "company"
        verbose_name_plural = "company"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(id=1),
                name="single_company_row",
            )
        ]

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return self.cName


class Postcode(models.Model):
    pId = models.AutoField(primary_key=True)
    pPostcode = models.CharField(max_length=10, db_index=True)
    pCity = models.CharField(max_length=120, db_index=True)
    pState = models.CharField(max_length=120, db_index=True)
    pCountry = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        related_name="postcodes",
    )

    class Meta:
        db_table = "postcodes"
        ordering = ["pPostcode", "pCity", "pState"]
        constraints = [
            models.UniqueConstraint(
                fields=["pPostcode", "pCity", "pState", "pCountry"],
                name="unique_postcode_city_state_country",
            )
        ]

    def __str__(self):
        return f"{self.pPostcode} {self.pCity}, {self.pState}"


class ProductCategory(models.Model):
    id = models.AutoField(primary_key=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    seq = models.IntegerField(default=0)
    is_show = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_product_categories",
    )

    class Meta:
        db_table = "product_categories"
        ordering = ["parent__id", "seq", "name"]
        verbose_name_plural = "product categories"

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name


class ExchangeRate(models.Model):
    id = models.AutoField(primary_key=True)
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="exchange_rates",
    )
    rate = models.DecimalField(max_digits=12, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_exchange_rates",
    )

    class Meta:
        db_table = "exchange_rates"
        ordering = ["-created_at", "country__name"]

    def __str__(self):
        return f"MYR to {self.country.code}: {self.rate}"


class Product(models.Model):
    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=64, blank=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_balance = models.PositiveIntegerField(default=0)
    image = models.CharField(max_length=500, blank=True)
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.PROTECT,
        related_name="products",
    )
    is_show = models.BooleanField(default=True)
    show_date_start = models.DateTimeField()
    show_date_end = models.DateTimeField()
    seq = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_products",
    )

    class Meta:
        db_table = "products"
        ordering = ["seq", "name"]

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    id = models.AutoField(primary_key=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.CharField(max_length=500)
    seq = models.IntegerField(default=0)
    is_main = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_product_images",
    )

    class Meta:
        db_table = "product_images"
        ordering = ["product", "seq", "id"]

    def __str__(self):
        return f"{self.product.name} image {self.seq}"


class ProductPrice(models.Model):
    id = models.AutoField(primary_key=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="prices",
    )
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="product_prices",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_product_prices",
    )

    class Meta:
        db_table = "product_prices"
        ordering = ["product", "country__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "country"],
                name="unique_product_price_per_country",
            )
        ]

    def __str__(self):
        return f"{self.product.name} - {self.country.code} {self.amount}"


class Cart(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_CHECKED_OUT = "checked_out"
    STATUS_ABANDONED = "abandoned"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_CHECKED_OUT, "Checked out"),
        (STATUS_ABANDONED, "Abandoned"),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="carts",
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "carts"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=models.Q(status="active"),
                name="unique_active_cart_per_user",
            )
        ]

    def __str__(self):
        return f"{self.user} cart ({self.status})"


class CartItem(models.Model):
    id = models.AutoField(primary_key=True)
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price_snapshot = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "cart_items"
        ordering = ["created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product"],
                name="unique_product_per_cart",
            )
        ]

    def __str__(self):
        return f"{self.cart.user} - {self.product.name} x {self.quantity}"


class Order(models.Model):
    STATUS_PENDING_PAYMENT = "PN"
    STATUS_PAID = "SC"
    STATUS_FAILED = "FL"
    STATUS_EXPIRED = "EX"
    STATUS_CANCELLED = "CN"

    STATUS_CHOICES = [
        (STATUS_PENDING_PAYMENT, "Pending payment"),
        (STATUS_PAID, "Paid"),
        (STATUS_FAILED, "Failed"),
        (STATUS_EXPIRED, "Expired"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    FULFILLMENT_DELIVERY = "delivery"
    FULFILLMENT_SELF_PICKUP = "self_pickup"

    FULFILLMENT_CHOICES = [
        (FULFILLMENT_DELIVERY, "Delivery"),
        (FULFILLMENT_SELF_PICKUP, "Self pickup"),
    ]

    PAYMENT_TNG_EWALLET = "tng_ewallet"
    PAYMENT_BILLPLZ_CARD = "billplz_card"

    PAYMENT_METHOD_CHOICES = [
        (PAYMENT_TNG_EWALLET, "TNG eWallet"),
        (PAYMENT_BILLPLZ_CARD, "Credit/Debit card"),
    ]

    id = models.AutoField(primary_key=True)
    order_number = models.CharField(max_length=32, unique=True, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    cart = models.ForeignKey(
        Cart,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    status = models.CharField(
        max_length=2,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING_PAYMENT,
    )
    fulfillment_method = models.CharField(max_length=20, choices=FULFILLMENT_CHOICES)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    contact_name = models.CharField(max_length=120)
    contact_email = models.EmailField()
    contact_mobile = models.CharField(max_length=30)
    delivery_addr1 = models.CharField(max_length=255, blank=True)
    delivery_addr2 = models.CharField(max_length=255, blank=True)
    delivery_postcode = models.CharField(max_length=20, blank=True)
    delivery_city = models.CharField(max_length=120, blank=True)
    delivery_state = models.CharField(max_length=120, blank=True)
    pickup_date = models.DateField(null=True, blank=True)
    pickup_time = models.TimeField(null=True, blank=True)
    currency_code = models.CharField(max_length=3, default="MYR")
    currency_symbol = models.CharField(max_length=8, default="RM")
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=6, default=1)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    stock_reserved_at = models.DateTimeField(null=True, blank=True)
    stock_released_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.order_number:
            self.order_number = f"ORD{self.created_at:%Y%m%d}{self.id:06d}"
            super().save(update_fields=["order_number"])

    def __str__(self):
        return self.order_number or f"Order {self.id}"


class OrderItem(models.Model):
    id = models.AutoField(primary_key=True)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="order_items",
    )
    product_name = models.CharField(max_length=255)
    product_code = models.CharField(max_length=64, blank=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "order_items"
        ordering = ["id"]

    def __str__(self):
        return f"{self.order.order_number} - {self.product_name} x {self.quantity}"


class Payment(models.Model):
    PROVIDER_MANUAL = "manual"
    PROVIDER_BILLPLZ = "billplz"

    PROVIDER_CHOICES = [
        (PROVIDER_MANUAL, "Manual"),
        (PROVIDER_BILLPLZ, "BillPlz"),
    ]

    STATUS_PENDING = "pending"
    STATUS_PAID = "paid"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_FAILED, "Failed"),
    ]

    id = models.AutoField(primary_key=True)
    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name="payment",
    )
    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        default=PROVIDER_MANUAL,
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    bill_id = models.CharField(max_length=64, blank=True, db_index=True)
    bill_url = models.URLField(max_length=500, blank=True)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_at = models.DateTimeField(null=True, blank=True)
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.provider} payment for {self.order.order_number}"


class BillplzEvent(models.Model):
    EVENT_WEBHOOK = "webhook"
    EVENT_BROWSER_RETURN = "browser_return"

    EVENT_TYPE_CHOICES = [
        (EVENT_WEBHOOK, "Webhook"),
        (EVENT_BROWSER_RETURN, "Browser return"),
    ]

    payment = models.ForeignKey(
        Payment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gateway_events",
    )
    provider = models.CharField(max_length=20, default=Payment.PROVIDER_BILLPLZ)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    gateway_reference = models.CharField(max_length=64, blank=True, db_index=True)
    signature_valid = models.BooleanField(null=True, blank=True)
    processed = models.BooleanField(default=False)
    processing_result = models.CharField(max_length=64, blank=True)
    payload = models.JSONField(default=dict)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "billplz_events"
        ordering = ["-received_at", "-id"]

    def __str__(self):
        return f"{self.provider} {self.event_type} {self.gateway_reference}"
