import re


def filter_products_mentioned_in_reply(products, reply):
    normalized_reply = normalize_text(reply)
    mentioned_products = []

    for product in products:
        product_name = normalize_text(product.name)
        product_code = normalize_text(product.code)
        if product_name and product_name in normalized_reply:
            mentioned_products.append(product)
            continue
        if product_code and product_code in normalized_reply:
            mentioned_products.append(product)

    return mentioned_products


def normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "").strip().lower())
