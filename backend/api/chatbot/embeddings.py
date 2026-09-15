import hashlib
import math
from functools import lru_cache

from django.conf import settings
from django.db import DatabaseError

from api.models import ProductEmbedding


class EmbeddingUnavailableError(RuntimeError):
    pass


def build_product_embedding_text(product):
    category_path = product.category.name
    if product.category.parent:
        category_path = f"{product.category.parent.name} > {product.category.name}"
    dimensions = [
        f"width {product.width_cm} cm" if product.width_cm is not None else "",
        f"height {product.height_cm} cm" if product.height_cm is not None else "",
        f"length {product.length_cm} cm" if product.length_cm is not None else "",
    ]
    return "\n".join(
        part
        for part in [
            f"Product: {product.name}",
            f"Code: {product.code}" if product.code else "",
            f"Category: {category_path}",
            f"Description: {product.description}" if product.description else "",
            f"Dimensions: {', '.join(value for value in dimensions if value)}"
            if any(dimensions)
            else "",
        ]
        if part
    )


def content_hash(content):
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


@lru_cache(maxsize=1)
def get_embedding_model():
    from langchain_ollama import OllamaEmbeddings

    return OllamaEmbeddings(
        base_url=str(getattr(settings, "OLLAMA_BASE_URL", "")).rstrip("/"),
        model=getattr(settings, "OLLAMA_EMBEDDING_MODEL", "embeddinggemma"),
        client_kwargs={
            "timeout": getattr(settings, "OLLAMA_TIMEOUT_SECONDS", 60),
        },
    )


def semantic_product_ids(message, queryset, limit=None):
    if not getattr(settings, "CHATBOT_EMBEDDING_ENABLED", True):
        return []

    model_name = getattr(settings, "OLLAMA_EMBEDDING_MODEL", "embeddinggemma")
    limit = limit or getattr(settings, "CHATBOT_SEMANTIC_CANDIDATES", 20)
    try:
        stored = list(
            ProductEmbedding.objects.filter(
                product__in=queryset,
                model_name=model_name,
            ).values_list("product_id", "embedding")
        )
    except DatabaseError:
        return []

    if not stored:
        return []

    try:
        query_vector = get_embedding_model().embed_query(str(message or ""))
    except Exception as error:
        raise EmbeddingUnavailableError("Unable to generate query embedding.") from error

    expected_dimensions = getattr(settings, "CHATBOT_EMBEDDING_DIMENSIONS", 768)
    if len(query_vector) != expected_dimensions:
        raise EmbeddingUnavailableError(
            f"Embedding model returned {len(query_vector)} dimensions; expected {expected_dimensions}."
        )

    minimum_score = getattr(settings, "CHATBOT_SEMANTIC_MIN_SCORE", 0.25)
    ranked = []
    for product_id, vector in stored:
        if not isinstance(vector, list) or len(vector) != len(query_vector):
            continue
        score = cosine_similarity(query_vector, vector)
        if score >= minimum_score:
            ranked.append((score, product_id))

    ranked.sort(key=lambda item: (-item[0], item[1]))
    return [product_id for _, product_id in ranked[:limit]]


def cosine_similarity(left, right):
    dot_product = sum(float(a) * float(b) for a, b in zip(left, right))
    left_norm = math.sqrt(sum(float(value) ** 2 for value in left))
    right_norm = math.sqrt(sum(float(value) ** 2 for value in right))
    if not left_norm or not right_norm:
        return 0.0
    return dot_product / (left_norm * right_norm)


def clear_embedding_cache():
    get_embedding_model.cache_clear()
