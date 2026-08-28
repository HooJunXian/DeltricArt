from .product_search import detect_scenarios, extract_budget


def build_chat_messages(
    user_message,
    products,
    purchase_history=None,
    user=None,
    capability_context="",
):
    budget = extract_budget(user_message)
    scenarios = detect_scenarios(user_message)
    product_context = "\n".join(format_product(product) for product in products)
    purchase_context = format_purchase_history(purchase_history or [])
    user_context = format_user_context(user)

    system_prompt = f"""
You are DeltricArt's AI shopping assistant.

Rules:
- Reply in the same language as the user. If the user writes Chinese, reply in Chinese.
- Recommend only products listed in PRODUCT CONTEXT.
- Do not invent products, prices, discounts, stock, delivery terms, or policies.
- If PRODUCT CONTEXT is empty, say no matching product was found and ask one helpful follow-up question.
- For comparison requests, compare only products in PRODUCT CONTEXT.
- Mention practical reasons: scenario fit, price, category, stock, and style from description.
- Keep replies concise, warm, and shopping-focused.
- If the user asks about anything outside DeltricArt shopping capabilities, say it is outside your scope.

Detected signals:
- Budget: {budget if budget is not None else "not specified"}
- Scenarios: {", ".join(scenarios) if scenarios else "not specified"}

{user_context}

CAPABILITY CONTEXT:
{capability_context or "General DeltricArt product search, product Q&A, comparison, and shopping assistance only."}

PRODUCT CONTEXT:
{product_context or "No matching products found."}

PURCHASE HISTORY:
{purchase_context or "No purchase history available."}
""".strip()

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]


def format_product(product):
    category_path = product.category.name
    if product.category.parent:
        category_path = f"{product.category.parent.name} > {product.category.name}"
    return (
        f"- ID: {product.id}; Code: {product.code or '-'}; Name: {product.name}; "
        f"Category: {category_path}; Price: RM{product.price}; "
        f"Stock: {product.stock_balance}; Description: {product.description or '-'}"
    )


def format_purchase_history(history):
    lines = []
    for order in history:
        items = ", ".join(
            f"{item['name']} x{item['quantity']}" for item in order.get("items", [])
        )
        lines.append(
            f"- Order {order.get('order_number')}: {order.get('status')}; Items: {items or '-'}"
        )
    return "\n".join(lines)


def format_user_context(user):
    if not user or not user.is_authenticated:
        return "User: guest"
    country = getattr(getattr(user, "country", None), "code", "")
    return f"User: logged in; Country: {country or 'unknown'}"
