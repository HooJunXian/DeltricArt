from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.storage import storages
from django.test import TestCase, override_settings
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import hashlib
import hmac
import json
from unittest.mock import patch
from urllib.parse import urlparse
from rest_framework.test import APIClient

from .models import (
    Cart,
    ChatbotConversation,
    ChatbotMessage,
    Company,
    Country,
    Order,
    Payment,
    BillplzEvent,
    Postcode,
    Product,
    ProductCategory,
    ProductImage,
    RoomCustomization,
    RoomCustomizationProduct,
)
from .services import build_billplz_signature
from .signals import SUPERADMIN_USERNAME


User = get_user_model()


class RoomCustomizationApiTests(TestCase):
    def setUp(self):
        self.storage_override = override_settings(
            STORAGES={
                "default": {
                    "BACKEND": "django.core.files.storage.memory.InMemoryStorage",
                },
                "private_rooms": {
                    "BACKEND": "django.core.files.storage.memory.InMemoryStorage",
                },
                "staticfiles": {
                    "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
                },
            }
        )
        self.storage_override.enable()
        self.addCleanup(self.storage_override.disable)
        room_image_field = RoomCustomization._meta.get_field("room_image")
        original_storage = room_image_field.storage
        room_image_field.storage = storages["private_rooms"]
        self.addCleanup(setattr, room_image_field, "storage", original_storage)

        self.client = APIClient()
        self.user = User.objects.create_user(
            username="roomowner",
            email="roomowner@example.com",
            password="Secret123!",
        )
        self.other_user = User.objects.create_user(
            username="otherroomowner",
            email="otherroomowner@example.com",
            password="Secret123!",
        )
        self.staff_user = User.objects.create_user(
            username="roomstaff",
            email="roomstaff@example.com",
            password="Secret123!",
            is_staff=True,
        )
        self.category = ProductCategory.objects.create(
            name="Wall Art",
            created_by=self.staff_user,
        )
        now = timezone.now()
        self.product = Product.objects.create(
            code="ROOM-ART-001",
            name="Room Preview Painting",
            price=Decimal("450.00"),
            stock_balance=2,
            width_cm=Decimal("80.00"),
            height_cm=Decimal("120.00"),
            image="/media/products/room-art.jpg",
            category=self.category,
            is_show=True,
            show_date_start=now,
            show_date_end=now + timedelta(days=365),
            created_by=self.staff_user,
        )

    def room_payload(self):
        return {
            "name": "Living Room",
            "room_image": SimpleUploadedFile(
                "living-room.jpg",
                b"test room image",
                content_type="image/jpeg",
            ),
            "wall_width_cm": "400.00",
            "wall_height_cm": "280.00",
            "wall_corners": json.dumps(
                [
                    {"x": 0.1, "y": 0.1},
                    {"x": 0.1, "y": 0.9},
                    {"x": 0.9, "y": 0.9},
                    {"x": 0.9, "y": 0.1},
                ]
            ),
            "image_width_px": 1600,
            "image_height_px": 1200,
            "placements_payload": json.dumps(
                [
                    {
                        "product_id": self.product.id,
                        "position_x_cm": "40.00",
                        "position_y_cm": "50.00",
                        "z_index": 0,
                    },
                    {
                        "product_id": self.product.id,
                        "position_x_cm": "180.00",
                        "position_y_cm": "50.00",
                        "z_index": 1,
                    },
                ]
            ),
        }

    def test_room_customizations_require_login(self):
        response = self.client.get("/api/room-customizations/")
        self.assertEqual(response.status_code, 401)

    def test_owner_can_create_room_with_repeated_artwork_placements(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/room-customizations/",
            self.room_payload(),
            format="multipart",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(
            response.data["wall_corners"],
            [
                {"x": 0.1, "y": 0.1},
                {"x": 0.9, "y": 0.1},
                {"x": 0.9, "y": 0.9},
                {"x": 0.1, "y": 0.9},
            ],
        )
        room = RoomCustomization.objects.get(user=self.user)
        self.assertEqual(room.placements.count(), 2)
        self.assertEqual(
            list(room.placements.values_list("product_id", flat=True)),
            [self.product.id, self.product.id],
        )
        self.assertTrue(
            all(item.width_cm == self.product.width_cm for item in room.placements.all())
        )

    def test_room_detail_is_private_to_owner(self):
        room = RoomCustomization.objects.create(
            user=self.user,
            name="Private Room",
            room_image=SimpleUploadedFile("private.jpg", b"private", content_type="image/jpeg"),
            wall_width_cm=400,
            wall_height_cm=280,
            wall_corners=[
                {"x": 0, "y": 0},
                {"x": 1, "y": 0},
                {"x": 1, "y": 1},
                {"x": 0, "y": 1},
            ],
        )
        self.client.force_authenticate(user=self.other_user)

        response = self.client.get(f"/api/room-customizations/{room.id}/")
        self.assertEqual(response.status_code, 404)

        image_response = self.client.get(f"/api/room-customizations/{room.id}/image/")
        self.assertEqual(image_response.status_code, 404)

        self.client.force_authenticate(user=self.user)
        owner_image_response = self.client.get(f"/api/room-customizations/{room.id}/image/")
        self.assertEqual(owner_image_response.status_code, 200)
        self.assertEqual(owner_image_response["Content-Type"], "image/jpeg")

    def test_update_replaces_placements_and_refreshes_dimension_snapshot(self):
        room = RoomCustomization.objects.create(
            user=self.user,
            name="Editable Room",
            room_image=SimpleUploadedFile("editable.jpg", b"editable", content_type="image/jpeg"),
            wall_width_cm=400,
            wall_height_cm=280,
            wall_corners=[
                {"x": 0, "y": 0},
                {"x": 1, "y": 0},
                {"x": 1, "y": 1},
                {"x": 0, "y": 1},
            ],
        )
        existing_placement = RoomCustomizationProduct.objects.create(
            room_customization=room,
            product=self.product,
            position_x_cm=10,
            position_y_cm=10,
            width_cm=self.product.width_cm,
            height_cm=self.product.height_cm,
        )
        self.product.width_cm = Decimal("90.00")
        self.product.height_cm = Decimal("130.00")
        self.product.save(update_fields=["width_cm", "height_cm"])
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            f"/api/room-customizations/{room.id}/",
            {
                "name": "Updated Room",
                "placements": [
                    {
                        "placement_id": existing_placement.id,
                        "product_id": self.product.id,
                        "position_x_cm": "100.00",
                        "position_y_cm": "80.00",
                        "z_index": 0,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        room.refresh_from_db()
        self.assertEqual(room.name, "Updated Room")
        self.assertEqual(room.placements.count(), 1)
        self.assertEqual(room.placements.get().position_x_cm, Decimal("100.00"))
        self.assertEqual(room.placements.get().width_cm, Decimal("80.00"))
        self.assertEqual(room.placements.get().height_cm, Decimal("120.00"))


class BillplzSignatureTests(TestCase):
    def test_callback_signature_sorts_completed_pairs_and_ignores_extra_fields(self):
        key = "test-x-signature-key"
        payload = {
            "paid": "false",
            "paid_at": "",
            "paid_amount": "0",
            "id": "bill-123",
            "amount": "981000",
            "state": "due",
            "extra_field": "must-not-be-signed",
            "x_signature": "must-not-be-signed",
        }
        signing_string = (
            "amount981000|idbill-123|paid_amount0|paid_at|paidfalse|statedue"
        )
        expected = hmac.new(
            key.encode("utf-8"),
            signing_string.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        self.assertEqual(build_billplz_signature(payload, key), expected)


class SuperAdminProtectionTests(TestCase):
    def test_protected_superadmin_is_created(self):
        superadmin = User.objects.get(username=SUPERADMIN_USERNAME)

        self.assertTrue(superadmin.is_superuser)
        self.assertTrue(superadmin.is_staff)
        self.assertTrue(superadmin.groups.filter(name="Super Admin").exists())

    def test_protected_superadmin_flags_are_restored_on_save(self):
        superadmin = User.objects.get(username=SUPERADMIN_USERNAME)
        superadmin.is_superuser = False
        superadmin.is_staff = False
        superadmin.is_active = False
        superadmin.save()
        superadmin.refresh_from_db()

        self.assertTrue(superadmin.is_superuser)
        self.assertTrue(superadmin.is_staff)
        self.assertTrue(superadmin.is_active)

    def test_super_admin_group_cannot_be_renamed(self):
        group = Group.objects.get(name="Super Admin")
        group.name = "Changed"

        with self.assertRaises(ValueError):
            group.save()


class AdminDashboardApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username="staffmember",
            email="staffmember@example.com",
            password="Secret123!",
            is_staff=True,
        )

    def test_admin_dashboard_requires_staff_user(self):
        normal_user = User.objects.create_user(
            username="member",
            email="member@example.com",
            password="Secret123!",
        )
        self.client.force_authenticate(user=normal_user)

        response = self.client.get("/api/admin/dashboard/")

        self.assertEqual(response.status_code, 403)

    def test_admin_dashboard_returns_expected_sections(self):
        self.client.force_authenticate(user=self.staff_user)

        response = self.client.get("/api/admin/dashboard/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("stats", response.data)
        self.assertIn("roles", response.data)
        self.assertIn("recent_members", response.data)
        self.assertIn("recent_orders", response.data)
        self.assertIn("recent_products", response.data)
        self.assertIn("catalog_snapshot", response.data)
        self.assertIn("order_status_summary", response.data)

    def test_admin_order_list_requires_staff_user(self):
        normal_user = User.objects.create_user(
            username="order-viewer",
            email="order-viewer@example.com",
            password="Secret123!",
        )
        self.client.force_authenticate(user=normal_user)

        response = self.client.get("/api/admin/orders/")

        self.assertEqual(response.status_code, 403)

    def test_admin_order_list_filters_orders(self):
        customer = User.objects.create_user(
            username="filter-customer",
            email="filter-customer@example.com",
            password="Secret123!",
        )
        cart = Cart.objects.create(user=customer)
        order = Order.objects.create(
            user=customer,
            cart=cart,
            status=Order.STATUS_PAID,
            fulfillment_method=Order.FULFILLMENT_DELIVERY,
            payment_method=Order.PAYMENT_BILLPLZ_CARD,
            contact_name="Filter Customer",
            contact_email=customer.email,
            contact_mobile="0123456789",
            subtotal=Decimal("120.00"),
            total=Decimal("120.00"),
        )
        self.client.force_authenticate(user=self.staff_user)

        response = self.client.get(
            "/api/admin/orders/",
            {
                "order_id": order.order_number,
                "customer": customer.username,
                "status": "paid",
                "date": order.created_at.date().isoformat(),
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["order_number"], order.order_number)
        self.assertEqual(response.data[0]["username"], customer.username)

        dashboard_response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(dashboard_response.data["stats"]["monthly_earnings"], "120.00")
        self.assertEqual(dashboard_response.data["stats"]["monthly_earnings_currency"], "MYR")


class AdminProductImageApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username="productstaff",
            email="productstaff@example.com",
            password="Secret123!",
            is_staff=True,
        )
        self.category = ProductCategory.objects.create(
            name="Paintings",
            created_by=self.staff_user,
        )
        now = timezone.now()
        self.product = Product.objects.create(
            code="ART-IMAGES",
            name="Product with images",
            category=self.category,
            price=Decimal("100.00"),
            stock_balance=1,
            image="/media/products/1/main.jpg",
            show_date_start=now,
            show_date_end=now + timedelta(days=365),
            created_by=self.staff_user,
        )
        self.main_image = ProductImage.objects.create(
            product=self.product,
            image="/media/products/1/main.jpg",
            seq=0,
            is_main=True,
            created_by=self.staff_user,
        )
        self.second_image = ProductImage.objects.create(
            product=self.product,
            image="/media/products/1/second.jpg",
            seq=1,
            is_main=False,
            created_by=self.staff_user,
        )
        self.client.force_authenticate(user=self.staff_user)

    def test_removing_main_image_promotes_selected_remaining_image(self):
        response = self.client.patch(
            f"/api/admin/products/{self.product.id}/",
            {
                "image": "http://testserver/media/products/1/second.jpg",
                "removed_images": "http://testserver/media/products/1/main.jpg",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(ProductImage.objects.filter(id=self.main_image.id).exists())
        self.second_image.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(self.product.image, "/media/products/1/second.jpg")
        self.assertEqual(self.second_image.seq, 0)
        self.assertTrue(self.second_image.is_main)

    def test_removing_last_image_clears_product_image(self):
        self.second_image.delete()

        response = self.client.patch(
            f"/api/admin/products/{self.product.id}/",
            {
                "image": "",
                "removed_images": "http://testserver/media/products/1/main.jpg",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.image, "")
        self.assertFalse(self.product.images.exists())


class CartApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="cartuser",
            email="cartuser@example.com",
            password="Secret123!",
        )
        self.staff_user = User.objects.create_user(
            username="catalogstaff",
            email="catalogstaff@example.com",
            password="Secret123!",
            is_staff=True,
        )
        self.category = ProductCategory.objects.create(
            name="Painting",
            created_by=self.staff_user,
        )
        now = timezone.now()
        self.product = Product.objects.create(
            code="ART-001",
            name="Cart Product",
            description="",
            price=120,
            stock_balance=3,
            category=self.category,
            is_show=True,
            show_date_start=now,
            show_date_end=now + timedelta(days=365),
            created_by=self.staff_user,
        )

    def test_cart_requires_authenticated_user(self):
        response = self.client.get("/api/cart/")

        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_add_and_update_cart_item(self):
        self.client.force_authenticate(user=self.user)

        add_response = self.client.post(
            "/api/cart/items/",
            {"product_id": self.product.id, "quantity": 2},
            format="json",
        )

        self.assertEqual(add_response.status_code, 201)
        self.assertEqual(add_response.data["item_count"], 2)
        self.assertEqual(Cart.objects.get(user=self.user).items.count(), 1)

        update_response = self.client.patch(
            f"/api/cart/items/{self.product.id}/",
            {"quantity": 1},
            format="json",
        )
        cart_response = self.client.get("/api/cart/")

        self.assertEqual(update_response.status_code, 204)
        self.assertEqual(cart_response.data["items"][0]["quantity"], 1)

    def test_cart_rejects_quantity_above_stock(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/cart/items/",
            {"product_id": self.product.id, "quantity": 4},
            format="json",
        )

        self.assertEqual(response.status_code, 400)


@override_settings(CHECKOUT_PAYMENT_MODE="manual")
class CheckoutApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="checkoutuser",
            email="checkoutuser@example.com",
            password="Secret123!",
            mobile="60123456789",
        )
        self.staff_user = User.objects.create_user(
            username="checkoutstaff",
            email="checkoutstaff@example.com",
            password="Secret123!",
            is_staff=True,
        )
        self.category = ProductCategory.objects.create(
            name="Painting",
            created_by=self.staff_user,
        )
        now = timezone.now()
        self.product = Product.objects.create(
            code="ART-002",
            name="Checkout Product",
            description="",
            price=Decimal("120.00"),
            stock_balance=3,
            category=self.category,
            is_show=True,
            show_date_start=now,
            show_date_end=now + timedelta(days=365),
            created_by=self.staff_user,
        )

    def add_cart_item(self, quantity=2):
        self.client.force_authenticate(user=self.user)
        return self.client.post(
            "/api/cart/items/",
            {"product_id": self.product.id, "quantity": quantity},
            format="json",
        )

    def get_future_weekday(self):
        pickup_date = timezone.localdate() + timedelta(days=1)
        while pickup_date.weekday() >= 5:
            pickup_date += timedelta(days=1)
        return pickup_date

    def get_past_weekday(self):
        pickup_date = timezone.localdate() - timedelta(days=1)
        while pickup_date.weekday() >= 5:
            pickup_date -= timedelta(days=1)
        return pickup_date

    def test_checkout_calculates_total_on_server(self):
        self.add_cart_item(quantity=2)

        response = self.client.post(
            "/api/checkout/",
            {
                "fulfillment_method": "delivery",
                "payment_method": "billplz_card",
                "contact_name": "Checkout User",
                "contact_email": "checkoutuser@example.com",
                "contact_mobile": "60123456789",
                "delivery_addr1": "No 1",
                "delivery_postcode": "47100",
                "delivery_city": "Puchong",
                "delivery_state": "Selangor",
                "total": "0.01",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(order_number=response.data["order"]["order_number"])
        cart = Cart.objects.get(id=order.cart_id)
        self.assertEqual(order.subtotal, Decimal("240.00"))
        self.assertEqual(order.delivery_fee, Decimal("10.00"))
        self.assertEqual(order.total, Decimal("250.00"))
        self.assertEqual(order.payment.provider, Payment.PROVIDER_BILLPLZ)
        self.assertEqual(order.payment.status, Payment.STATUS_PENDING)
        self.assertEqual(order.payment.bill_id, f"TEST{order.id:06d}")
        self.assertIn("/api/payments/billplz/mock/", order.payment.bill_url)
        self.assertEqual(response.data["payment_url"], order.payment.bill_url)
        self.assertEqual(response.data["checkout_mode"], "manual")
        self.assertEqual(cart.status, Cart.STATUS_CHECKED_OUT)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_balance, 1)
        self.assertIsNotNone(order.expires_at)
        self.assertIsNotNone(order.stock_reserved_at)
        self.assertEqual(str(order.payment.raw_response["paid"]).lower(), "false")
        self.assertEqual(order.payment.raw_response["state"], "due")
        self.assertEqual(order.payment.raw_response["amount"], 25000)
        self.assertEqual(order.payment.raw_response["email"], "checkoutuser@example.com")
        self.assertEqual(order.payment.raw_response["name"], "CHECKOUT USER")

    def test_manual_billplz_mock_payment_marks_order_paid(self):
        self.add_cart_item(quantity=2)

        response = self.client.post(
            "/api/checkout/",
            {
                "fulfillment_method": "delivery",
                "payment_method": "billplz_card",
                "contact_name": "Checkout User",
                "contact_email": "checkoutuser@example.com",
                "contact_mobile": "60123456789",
                "delivery_addr1": "No 1",
                "delivery_postcode": "47100",
                "delivery_city": "Puchong",
                "delivery_state": "Selangor",
            },
            format="json",
        )
        payment_url = response.data["payment_url"]
        mock_path = urlparse(payment_url).path

        mock_response = self.client.get(f"{mock_path}?action=paid")

        self.assertEqual(mock_response.status_code, 302)
        order = Order.objects.get(order_number=response.data["order"]["order_number"])
        cart = Cart.objects.get(id=order.cart_id)
        order.payment.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertEqual(order.payment.status, Payment.STATUS_PAID)
        self.assertEqual(order.payment.paid_amount, Decimal("250.00"))
        self.assertEqual(cart.status, Cart.STATUS_CHECKED_OUT)
        self.assertEqual(self.product.stock_balance, 1)

    def test_failed_payment_releases_reserved_stock_once(self):
        self.add_cart_item(quantity=2)
        response = self.client.post(
            "/api/checkout/",
            {
                "fulfillment_method": "delivery",
                "payment_method": "billplz_card",
                "contact_name": "Checkout User",
                "contact_email": "checkoutuser@example.com",
                "contact_mobile": "60123456789",
                "delivery_addr1": "No 1",
                "delivery_postcode": "47100",
                "delivery_city": "Puchong",
                "delivery_state": "Selangor",
            },
            format="json",
        )
        mock_path = urlparse(response.data["payment_url"]).path

        self.client.get(f"{mock_path}?action=failed")
        self.client.get(f"{mock_path}?action=failed")

        order = Order.objects.get(order_number=response.data["order"]["order_number"])
        self.product.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_FAILED)
        self.assertIsNotNone(order.stock_released_at)
        self.assertEqual(self.product.stock_balance, 3)

    @override_settings(PAYMENT_PENDING_TTL_MINUTES=30)
    def test_expiry_worker_expires_order_and_releases_stock_once(self):
        self.add_cart_item(quantity=2)
        response = self.client.post(
            "/api/checkout/",
            {
                "fulfillment_method": "delivery",
                "payment_method": "billplz_card",
                "contact_name": "Checkout User",
                "contact_email": "checkoutuser@example.com",
                "contact_mobile": "60123456789",
                "delivery_addr1": "No 1",
                "delivery_postcode": "47100",
                "delivery_city": "Puchong",
                "delivery_state": "Selangor",
            },
            format="json",
        )
        order = Order.objects.get(order_number=response.data["order"]["order_number"])
        Order.objects.filter(pk=order.pk).update(expires_at=timezone.now() - timedelta(seconds=1))

        call_command("expire_pending_orders")
        call_command("expire_pending_orders")

        order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_EXPIRED)
        self.assertIsNotNone(order.stock_released_at)
        self.assertEqual(self.product.stock_balance, 3)

    def test_user_can_cancel_pending_order_and_release_stock(self):
        self.add_cart_item(quantity=2)
        response = self.client.post(
            "/api/checkout/",
            {
                "fulfillment_method": "delivery",
                "payment_method": "billplz_card",
                "contact_name": "Checkout User",
                "contact_email": "checkoutuser@example.com",
                "contact_mobile": "60123456789",
                "delivery_addr1": "No 1",
                "delivery_postcode": "47100",
                "delivery_city": "Puchong",
                "delivery_state": "Selangor",
            },
            format="json",
        )
        order_number = response.data["order"]["order_number"]

        cancel_response = self.client.post(f"/api/orders/{order_number}/cancel/")
        second_response = self.client.post(f"/api/orders/{order_number}/cancel/")

        self.product.refresh_from_db()
        self.assertEqual(cancel_response.status_code, 200)
        self.assertEqual(cancel_response.data["status"], Order.STATUS_CANCELLED)
        self.assertEqual(second_response.status_code, 409)
        self.assertEqual(self.product.stock_balance, 3)

    def test_order_list_returns_authenticated_users_orders(self):
        other_user = User.objects.create_user(
            username="otherbuyer",
            email="otherbuyer@example.com",
            password="Secret123!",
        )
        cart = Cart.objects.create(user=self.user, status=Cart.STATUS_CHECKED_OUT)
        order = Order.objects.create(
            user=self.user,
            cart=cart,
            status=Order.STATUS_PAID,
            fulfillment_method=Order.FULFILLMENT_DELIVERY,
            payment_method=Order.PAYMENT_BILLPLZ_CARD,
            contact_name="Checkout User",
            contact_email="checkoutuser@example.com",
            contact_mobile="60123456789",
            delivery_addr1="No 1",
            delivery_postcode="47100",
            delivery_city="Puchong",
            delivery_state="Selangor",
            subtotal=Decimal("120.00"),
            delivery_fee=Decimal("10.00"),
            total=Decimal("130.00"),
        )
        order.items.create(
            product=self.product,
            product_name=self.product.name,
            product_code=self.product.code,
            quantity=1,
            unit_price=self.product.price,
            line_total=self.product.price,
        )
        Payment.objects.create(order=order, status=Payment.STATUS_PAID)
        other_cart = Cart.objects.create(user=other_user, status=Cart.STATUS_CHECKED_OUT)
        other_order = Order.objects.create(
            user=other_user,
            cart=other_cart,
            status=Order.STATUS_PAID,
            fulfillment_method=Order.FULFILLMENT_DELIVERY,
            payment_method=Order.PAYMENT_BILLPLZ_CARD,
            contact_name="Other Buyer",
            contact_email="otherbuyer@example.com",
            contact_mobile="60111111111",
            delivery_addr1="No 2",
            delivery_postcode="47100",
            delivery_city="Puchong",
            delivery_state="Selangor",
            subtotal=Decimal("120.00"),
            delivery_fee=Decimal("10.00"),
            total=Decimal("130.00"),
        )
        Payment.objects.create(order=other_order, status=Payment.STATUS_PAID)
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/orders/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["order_number"], order.order_number)
        self.assertEqual(response.data[0]["status"], Order.STATUS_PAID)

    def test_checkout_rejects_weekend_self_pickup(self):
        self.add_cart_item(quantity=1)

        response = self.client.post(
            "/api/checkout/",
            {
                "fulfillment_method": "self_pickup",
                "payment_method": "tng_ewallet",
                "contact_name": "Checkout User",
                "contact_email": "checkoutuser@example.com",
                "contact_mobile": "60123456789",
                "pickup_date": "2026-06-06",
                "pickup_time": "10:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("pickup_date", response.data)

    def test_checkout_rejects_past_self_pickup_datetime(self):
        self.add_cart_item(quantity=1)
        pickup_date = self.get_past_weekday()

        response = self.client.post(
            "/api/checkout/",
            {
                "fulfillment_method": "self_pickup",
                "payment_method": "tng_ewallet",
                "contact_name": "Checkout User",
                "contact_email": "checkoutuser@example.com",
                "contact_mobile": "60123456789",
                "pickup_date": pickup_date.isoformat(),
                "pickup_time": "10:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("pickup_time", response.data)

    def test_checkout_rejects_self_pickup_outside_working_hours(self):
        self.add_cart_item(quantity=1)
        pickup_date = self.get_future_weekday()

        response = self.client.post(
            "/api/checkout/",
            {
                "fulfillment_method": "self_pickup",
                "payment_method": "tng_ewallet",
                "contact_name": "Checkout User",
                "contact_email": "checkoutuser@example.com",
                "contact_mobile": "60123456789",
                "pickup_date": pickup_date.isoformat(),
                "pickup_time": "09:59",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("pickup_time", response.data)

    @override_settings(
        CHECKOUT_PAYMENT_MODE="billplz",
        BILLPLZ_API_KEY="",
        BILLPLZ_COLLECTION_ID="",
    )
    def test_checkout_requires_billplz_configuration_without_mock(self):
        self.add_cart_item(quantity=1)
        pickup_date = self.get_future_weekday()

        response = self.client.post(
            "/api/checkout/",
            {
                "fulfillment_method": "self_pickup",
                "payment_method": "tng_ewallet",
                "contact_name": "Checkout User",
                "contact_email": "checkoutuser@example.com",
                "contact_mobile": "60123456789",
                "pickup_date": pickup_date.isoformat(),
                "pickup_time": "10:00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(Order.objects.count(), 0)

    @patch("django.conf.settings.BILLPLZ_X_SIGNATURE_KEY", "test-signature-key")
    def test_billplz_callback_marks_order_paid_once(self):
        cart = Cart.objects.create(user=self.user)
        order = Order.objects.create(
            user=self.user,
            cart=cart,
            fulfillment_method=Order.FULFILLMENT_SELF_PICKUP,
            payment_method=Order.PAYMENT_TNG_EWALLET,
            contact_name="Checkout User",
            contact_email="checkoutuser@example.com",
            contact_mobile="60123456789",
            pickup_date="2026-06-05",
            pickup_time="10:00",
            subtotal=Decimal("120.00"),
            delivery_fee=Decimal("0.00"),
            total=Decimal("120.00"),
        )
        order.items.create(
            product=self.product,
            product_name=self.product.name,
            product_code=self.product.code,
            quantity=1,
            unit_price=self.product.price,
            line_total=self.product.price,
        )
        Payment.objects.create(order=order, bill_id="bill-paid-1")
        payload = {
            "id": "bill-paid-1",
            "paid": "true",
            "paid_amount": "12000",
            "amount": "12000",
        }
        payload["x_signature"] = build_billplz_signature(payload, "test-signature-key")

        response = self.client.post(
            "/api/payments/billplz/callback/",
            payload,
            format="json",
        )
        second_response = self.client.post(
            "/api/payments/billplz/callback/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        order.refresh_from_db()
        self.product.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertEqual(order.payment.status, Payment.STATUS_PAID)
        self.assertEqual(self.product.stock_balance, 2)
        events = BillplzEvent.objects.filter(
            gateway_reference="bill-paid-1",
            event_type=BillplzEvent.EVENT_WEBHOOK,
        ).order_by("id")
        self.assertEqual(events.count(), 2)
        self.assertEqual(events[0].processing_result, "applied")
        self.assertEqual(events[1].processing_result, "duplicate_or_terminal")

    @patch("django.conf.settings.BILLPLZ_X_SIGNATURE_KEY", "test-signature-key")
    def test_invalid_callback_is_recorded_but_not_applied(self):
        response = self.client.post(
            "/api/payments/billplz/callback/",
            {"id": "unknown-bill", "paid": "true", "x_signature": "invalid"},
            format="json",
        )

        event = BillplzEvent.objects.get(gateway_reference="unknown-bill")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(event.signature_valid)
        self.assertFalse(event.processed)
        self.assertEqual(event.processing_result, "invalid_signature")

    @patch("api.views.get_billplz_bill")
    @patch("django.conf.settings.BILLPLZ_X_SIGNATURE_KEY", "test-signature-key")
    def test_invalid_signature_can_be_verified_through_billplz_api(
        self, get_bill_mock
    ):
        cart = Cart.objects.create(user=self.user)
        order = Order.objects.create(
            user=self.user,
            cart=cart,
            fulfillment_method=Order.FULFILLMENT_SELF_PICKUP,
            payment_method=Order.PAYMENT_TNG_EWALLET,
            contact_name="Checkout User",
            contact_email="checkoutuser@example.com",
            contact_mobile="60123456789",
            pickup_date="2026-06-05",
            pickup_time="10:00",
            subtotal=Decimal("120.00"),
            delivery_fee=Decimal("0.00"),
            total=Decimal("120.00"),
        )
        order.items.create(
            product=self.product,
            product_name=self.product.name,
            quantity=1,
            unit_price=self.product.price,
            line_total=self.product.price,
        )
        Payment.objects.create(order=order, bill_id="api-verified-bill")
        get_bill_mock.return_value = {
            "id": "api-verified-bill",
            "paid": True,
            "amount": 12000,
            "paid_amount": 12000,
        }

        response = self.client.post(
            "/api/payments/billplz/callback/",
            {"id": "api-verified-bill", "paid": "true", "x_signature": "invalid"},
            format="json",
        )

        order.refresh_from_db()
        event = BillplzEvent.objects.get(gateway_reference="api-verified-bill")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.status, Order.STATUS_PAID)
        self.assertFalse(event.signature_valid)
        self.assertTrue(event.processed)
        self.assertEqual(event.processing_result, "verified_via_api")

    def test_browser_return_is_audited_without_changing_payment(self):
        cart = Cart.objects.create(user=self.user)
        order = Order.objects.create(
            user=self.user,
            cart=cart,
            fulfillment_method=Order.FULFILLMENT_SELF_PICKUP,
            payment_method=Order.PAYMENT_TNG_EWALLET,
            contact_name="Checkout User",
            contact_email="checkoutuser@example.com",
            contact_mobile="60123456789",
            pickup_date="2026-06-05",
            pickup_time="10:00",
            subtotal=Decimal("120.00"),
            delivery_fee=Decimal("0.00"),
            total=Decimal("120.00"),
        )
        Payment.objects.create(order=order, bill_id="return-only")

        response = self.client.get(
            "/api/payments/billplz/return/?billplz%5Bid%5D=return-only&billplz%5Bpaid%5D=true"
        )

        order.refresh_from_db()
        event = BillplzEvent.objects.get(gateway_reference="return-only")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(order.status, Order.STATUS_PENDING_PAYMENT)
        self.assertEqual(event.event_type, BillplzEvent.EVENT_BROWSER_RETURN)
        self.assertEqual(event.processing_result, "display_only")


class CompanyApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username="companystaff",
            email="companystaff@example.com",
            password="Secret123!",
            is_staff=True,
        )

    def test_public_company_endpoint_returns_company_details(self):
        Company.objects.create(cName="Deltric Art", cOfficeEmail="hello@example.com")

        response = self.client.get("/api/company/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["cName"], "Deltric Art")
        self.assertEqual(response.data["cOfficeEmail"], "hello@example.com")

    def test_admin_can_create_single_company_profile(self):
        self.client.force_authenticate(user=self.staff_user)

        response = self.client.put(
            "/api/admin/company/",
            {
                "cName": "Deltric Art",
                "cAddress1": "No. 1",
                "cOfficeEmail": "office@example.com",
                "cLogo": "/media/company/logo.png",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["cLogo"], "http://testserver/media/company/logo.png")
        self.assertEqual(Company.objects.count(), 1)
        self.assertEqual(Company.objects.get().id, 1)


class PostcodeApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.malaysia = Country.objects.get(code="MY")
        Postcode.objects.get_or_create(
            pPostcode="47100",
            pCity="Puchong",
            pState="Selangor",
            pCountry=self.malaysia,
        )

    def test_postcode_lookup_returns_city_and_state(self):
        response = self.client.get("/api/postcodes/?postcode=47100")

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["pPostcode"], "47100")
        self.assertEqual(response.data[0]["pCity"], "Puchong")
        self.assertEqual(response.data[0]["pState"], "Selangor")


class RegisterApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.country = Country.objects.get(code="MY")

    def test_register_creates_user_with_hashed_password(self):
        response = self.client.post(
            "/api/register/",
            {
                "username": "customer1",
                "password": "Secret123!",
                "confirm_password": "Secret123!",
                "mobile_country_code": "+60",
                "mobile": "0123456789",
                "email": "customer1@example.com",
                "country_id": self.country.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data,
            {"success": True, "message": "User registered successfully"},
        )

        user = User.objects.get(username="customer1")
        self.assertEqual(user.status, User.STATUS_ACTIVE)
        self.assertEqual(user.country, self.country)
        self.assertEqual(user.mobile, "60123456789")
        self.assertNotEqual(user.password, "Secret123!")
        self.assertTrue(user.check_password("Secret123!"))

    def test_register_returns_errors_for_password_mismatch(self):
        response = self.client.post(
            "/api/register/",
            {
                "username": "customer2",
                "password": "Secret123!",
                "confirm_password": "Different123!",
                "mobile": "60123456789",
                "email": "customer2@example.com",
                "country_id": self.country.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])
        self.assertIn("confirm_password", response.data["errors"])


class LoginApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.member = User.objects.create_user(
            username="memberlogin",
            email="memberlogin@example.com",
            password="Secret123!",
        )
        self.staff_user = User.objects.create_user(
            username="stafflogin",
            email="stafflogin@example.com",
            password="Secret123!",
            is_staff=True,
        )

    def test_member_login_accepts_member_user(self):
        response = self.client.post(
            "/api/member/login/",
            {"username": "memberlogin", "password": "Secret123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_member_login_rejects_staff_user(self):
        response = self.client.post(
            "/api/member/login/",
            {"username": "stafflogin", "password": "Secret123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_admin_login_accepts_staff_user(self):
        response = self.client.post(
            "/api/admin/login/",
            {"username": "stafflogin", "password": "Secret123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_admin_login_rejects_member_user(self):
        response = self.client.post(
            "/api/admin/login/",
            {"username": "memberlogin", "password": "Secret123!"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)


class ChatbotApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="chatbotuser",
            email="chatbotuser@example.com",
            password="Secret123!",
        )
        self.staff_user = User.objects.create_user(
            username="chatbotstaff",
            email="chatbotstaff@example.com",
            password="Secret123!",
            is_staff=True,
        )
        self.category = ProductCategory.objects.create(
            name="Painting",
            created_by=self.staff_user,
        )
        now = timezone.now()
        self.product = Product.objects.create(
            code="ART-CHAT-001",
            name="Living Room Oil Painting",
            description="Warm oil painting suitable for living room decoration.",
            price=Decimal("280.00"),
            stock_balance=2,
            category=self.category,
            is_show=True,
            show_date_start=now,
            show_date_end=now + timedelta(days=365),
            created_by=self.staff_user,
        )

    def test_chatbot_is_available_to_guests_without_saving_account_history(self):
        response = self.client.post(
            "/api/chatbot/",
            {"message": "hi"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["conversation_id"])
        self.assertIn("DeltricArt", response.data["reply"])
        self.assertEqual(response.data["products"], [])
        self.assertFalse(ChatbotConversation.objects.exists())
        self.assertFalse(ChatbotMessage.objects.exists())

    @patch("api.views.chatbot.ask_ollama")
    def test_chatbot_returns_ai_reply_and_matching_products(self, ask_ollama_mock):
        ask_ollama_mock.return_value = "Living Room Oil Painting 适合客厅，也符合 RM300 以下的预算。"
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/chatbot/",
            {"message": "推荐 RM300 以下适合客厅的画"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["reply"], ask_ollama_mock.return_value)
        self.assertIn("conversation_id", response.data)
        self.assertEqual(len(response.data["products"]), 1)
        self.assertEqual(response.data["products"][0]["id"], self.product.id)
        conversation = ChatbotConversation.objects.get(id=response.data["conversation_id"])
        messages = list(conversation.messages.order_by("id"))
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0].role, ChatbotMessage.ROLE_USER)
        self.assertEqual(messages[0].content, "推荐 RM300 以下适合客厅的画")
        self.assertEqual(messages[1].role, ChatbotMessage.ROLE_ASSISTANT)
        self.assertEqual(messages[1].content, ask_ollama_mock.return_value)
        self.assertEqual(messages[1].products_snapshot[0]["id"], self.product.id)

    @patch("api.views.chatbot.ask_ollama")
    def test_chatbot_only_returns_product_cards_mentioned_in_reply(self, ask_ollama_mock):
        extra_product = Product.objects.create(
            code="ART-CHAT-002",
            name="Lonely",
            description="Figurative oil painting.",
            price=Decimal("750.00"),
            stock_balance=3,
            category=self.category,
            is_show=True,
            show_date_start=timezone.now(),
            show_date_end=timezone.now() + timedelta(days=365),
            created_by=self.staff_user,
        )
        ask_ollama_mock.return_value = "I recommend Living Room Oil Painting for this room."
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/chatbot/",
            {"message": "recommend painting"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [product["id"] for product in response.data["products"]],
            [self.product.id],
        )
        self.assertNotIn(extra_product.id, [product["id"] for product in response.data["products"]])

    @patch("api.views.chatbot.ask_ollama")
    def test_chatbot_greeting_does_not_return_products(self, ask_ollama_mock):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/chatbot/",
            {"message": "hi"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("DeltricArt", response.data["reply"])
        self.assertEqual(response.data["products"], [])
        ask_ollama_mock.assert_not_called()
        self.assertEqual(ChatbotMessage.objects.count(), 2)

    @patch("api.views.chatbot.ask_ollama")
    def test_chatbot_accepts_style_follow_up_requests(self, ask_ollama_mock):
        ask_ollama_mock.return_value = "现代简约风格可以考虑线条干净、色彩克制的作品。"
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/chatbot/",
            {"message": "现代简约"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["reply"], ask_ollama_mock.return_value)
        ask_ollama_mock.assert_called_once()

    @patch("api.views.chatbot.ask_ollama", side_effect=RuntimeError("Unable to reach Ollama."))
    def test_chatbot_returns_service_error_when_ollama_is_unavailable(self, _ask_ollama_mock):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/chatbot/",
            {"message": "show me products"},
            format="json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.data["detail"],
            "AI assistant is temporarily unavailable. Please try again later.",
        )
        assistant_message = ChatbotMessage.objects.filter(
            role=ChatbotMessage.ROLE_ASSISTANT
        ).latest("id")
        self.assertEqual(assistant_message.metadata["error"], "ai_unavailable")

    @patch("api.views.chatbot.ask_ollama")
    def test_chatbot_rejects_out_of_scope_request_without_calling_ollama(self, ask_ollama_mock):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/chatbot/",
            {"message": "Can you write Python code for my homework?"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("outside the scope", response.data["reply"])
        self.assertEqual(response.data["products"], [])
        ask_ollama_mock.assert_not_called()
        self.assertEqual(ChatbotMessage.objects.count(), 2)

    @patch("api.views.chatbot.ask_ollama")
    def test_chatbot_rejects_chinese_out_of_scope_request_without_calling_ollama(self, ask_ollama_mock):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/chatbot/",
            {"message": "你可以帮我写投资建议吗？"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("不在 DeltricArt AI 购物助手的能力范围", response.data["reply"])
        self.assertEqual(response.data["products"], [])
        ask_ollama_mock.assert_not_called()
        self.assertEqual(ChatbotMessage.objects.count(), 2)
