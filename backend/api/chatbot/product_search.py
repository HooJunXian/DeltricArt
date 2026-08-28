import re
from decimal import Decimal, InvalidOperation

from django.db.models import Q

from api.models import Order, Product


SCENARIO_KEYWORDS = {
    "gift": ["gift", "present", "送礼", "礼物", "生日", "birthday", "anniversary", "housewarming", "新家"],
    "living_room": ["living room", "客厅", "客廳", "hall", "sofa", "家居", "home decor"],
    "office": ["office", "办公室", "辦公室", "workplace", "meeting room"],
    "collection": ["collection", "collector", "收藏", "珍藏"],
    "sculpture": ["sculpture", "雕塑", "摆设", "擺設"],
    "painting": ["painting", "画", "畫", "oil", "油画", "油畫"],
    "modern_minimalist": [
        "modern",
        "minimalist",
        "contemporary",
        "现代",
        "現代",
        "简约",
        "簡約",
        "现代简约",
        "現代簡約",
    ],
    "nordic": ["nordic", "scandinavian", "北欧", "北歐"],
    "traditional": ["traditional", "classic", "传统", "傳統", "古典"],
}


def extract_budget(message):
    normalized = str(message or "").replace(",", "")
    patterns = [
        r"(?:rm|myr)\s*(\d+(?:\.\d{1,2})?)",
        r"(\d+(?:\.\d{1,2})?)\s*(?:rm|myr)",
        r"(?:under|below|less than|budget|预算|預算|以下|以内|以內)\D{0,8}(\d+(?:\.\d{1,2})?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, normalized, flags=re.IGNORECASE)
        if not match:
            continue
        try:
            return Decimal(match.group(1)).quantize(Decimal("0.01"))
        except (InvalidOperation, TypeError):
            return None
    return None


def detect_scenarios(message):
    lowered = str(message or "").lower()
    return [
        scenario
        for scenario, keywords in SCENARIO_KEYWORDS.items()
        if any(keyword.lower() in lowered for keyword in keywords)
    ]


def search_products(message, limit=8):
    budget = extract_budget(message)
    scenarios = detect_scenarios(message)
    queryset = (
        Product.objects.filter(is_show=True, stock_balance__gt=0)
        .select_related("category", "category__parent")
        .prefetch_related("images")
    )

    if budget is not None:
        queryset = queryset.filter(price__lte=budget)

    query = build_product_query(message, scenarios)
    if query:
        queryset = queryset.filter(query)

    products = list(queryset.order_by("price", "name")[:limit])
    if products or not query:
        return products

    fallback = Product.objects.filter(is_show=True, stock_balance__gt=0)
    if budget is not None:
        fallback = fallback.filter(price__lte=budget)
    return list(
        fallback.select_related("category", "category__parent")
        .prefetch_related("images")
        .order_by("price", "name")[:limit]
    )


def build_product_query(message, scenarios):
    terms = extract_search_terms(message)
    for scenario in scenarios:
        terms.extend(SCENARIO_KEYWORDS.get(scenario, []))

    query = Q()
    for term in dict.fromkeys(terms):
        query |= (
            Q(name__icontains=term)
            | Q(code__icontains=term)
            | Q(description__icontains=term)
            | Q(category__name__icontains=term)
            | Q(category__parent__name__icontains=term)
        )
    return query


def extract_search_terms(message):
    cleaned = re.sub(r"[^\w\u4e00-\u9fff]+", " ", str(message or "").lower())
    terms = [term for term in cleaned.split() if len(term) >= 2 and not term.isdigit()]
    if re.search(r"[\u4e00-\u9fff]", message or ""):
        terms.append(message.strip())
    return terms[:12]


def get_purchase_history(user, limit=5):
    if not user or not user.is_authenticated:
        return []

    orders = (
        Order.objects.filter(user=user)
        .prefetch_related("items")
        .order_by("-created_at")[:limit]
    )
    history = []
    for order in orders:
        history.append(
            {
                "order_number": order.order_number,
                "status": order.status,
                "items": [
                    {
                        "name": item.product_name,
                        "code": item.product_code,
                        "quantity": item.quantity,
                    }
                    for item in order.items.all()
                ],
            }
        )
    return history
