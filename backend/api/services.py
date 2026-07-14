import base64
import hashlib
import hmac
import json
from decimal import Decimal, ROUND_HALF_UP
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone


BILLPLZ_DEFAULT_BASE_URL = "https://www.billplz-sandbox.com/api/v3"

BILLPLZ_CALLBACK_FIELDS = {
    "amount",
    "collection_id",
    "due_at",
    "email",
    "id",
    "mobile",
    "name",
    "paid_amount",
    "transaction_id",
    "transaction_status",
    "paid_at",
    "paid",
    "state",
    "url",
}


def money_to_cents(amount):
    return int((Decimal(amount) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def cents_to_money(amount):
    return (Decimal(amount or 0) / Decimal("100")).quantize(Decimal("0.01"))


def get_billplz_config():
    config = {
        "api_key": getattr(settings, "BILLPLZ_API_KEY", ""),
        "collection_id": getattr(settings, "BILLPLZ_COLLECTION_ID", ""),
        "x_signature_key": getattr(settings, "BILLPLZ_X_SIGNATURE_KEY", ""),
        "base_url": getattr(settings, "BILLPLZ_BASE_URL", BILLPLZ_DEFAULT_BASE_URL),
    }
    missing = [key for key, value in config.items() if key != "x_signature_key" and not value]
    if missing:
        raise ImproperlyConfigured(
            "BillPlz is not configured. Missing: " + ", ".join(missing)
        )
    return config


def create_billplz_bill(*, order, callback_url, redirect_url):
    config = get_billplz_config()
    payload = {
        "collection_id": config["collection_id"],
        "email": order.contact_email,
        "mobile": order.contact_mobile,
        "name": order.contact_name,
        "amount": money_to_cents(order.total),
        "description": f"Payment for {order.order_number}",
        "callback_url": callback_url,
        "redirect_url": redirect_url,
        "reference_1_label": "Order Number",
        "reference_1": order.order_number,
    }

    body = urlencode(payload).encode("utf-8")
    credentials = base64.b64encode(f"{config['api_key']}:".encode("utf-8")).decode("ascii")
    request = Request(
        f"{config['base_url'].rstrip('/')}/bills",
        data=body,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )

    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def get_billplz_bill(bill_id):
    """Retrieve payment truth directly from BillPlz's authenticated API."""
    config = get_billplz_config()
    credentials = base64.b64encode(f"{config['api_key']}:".encode("utf-8")).decode("ascii")
    request = Request(
        f"{config['base_url'].rstrip('/')}/bills/{bill_id}",
        headers={"Authorization": f"Basic {credentials}"},
        method="GET",
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def build_mock_billplz_bill(*, order, bill_id, bill_url, callback_url, redirect_url):
    collection_id = (
        getattr(settings, "BILLPLZ_COLLECTION_ID", "")
        or getattr(settings, "BILLPLZ_TEST_COLLECTION_ID", "")
        or "inbmmepb"
    )
    return {
        "id": bill_id,
        "collection_id": collection_id,
        "paid": "false",
        "state": "due",
        "amount": money_to_cents(order.total),
        "paid_amount": 0,
        "due_at": timezone.localdate().isoformat(),
        "email": order.contact_email,
        "mobile": order.contact_mobile or None,
        "name": order.contact_name.upper(),
        "url": bill_url,
        "reference_1_label": "Order Number",
        "reference_1": order.order_number,
        "reference_2_label": None,
        "reference_2": None,
        "redirect_url": redirect_url,
        "callback_url": callback_url,
        "description": f"Payment for {order.order_number}",
        "paid_at": None,
    }


def build_billplz_signature(data, x_signature_key):
    # Billplz sorts the completed key+value pairs, not the keys alone.
    # Keep callback values as their original strings until verification.
    signable_items = []
    for key in BILLPLZ_CALLBACK_FIELDS:
        if key not in data:
            continue

        value = data.get(key)
        if value is None:
            value = ""
        signable_items.append(f"{key}{value}")

    signable_items.sort(key=str.casefold)
    payload = "|".join(signable_items)
    return hmac.new(
        x_signature_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_billplz_signature(data):
    signature = data.get("x_signature", "")
    x_signature_key = getattr(settings, "BILLPLZ_X_SIGNATURE_KEY", "")
    if not signature or not x_signature_key:
        return False

    expected_signature = build_billplz_signature(data, x_signature_key)
    return hmac.compare_digest(signature, expected_signature)
