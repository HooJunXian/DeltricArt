from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from api.chatbot.embeddings import (
    build_product_embedding_text,
    content_hash,
    get_embedding_model,
)
from api.models import Product, ProductEmbedding


class Command(BaseCommand):
    help = "Generate or refresh the local semantic-search index for products."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true")
        parser.add_argument("--batch-size", type=int, default=16)
        parser.add_argument("--product-id", type=int)

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        if batch_size < 1:
            raise CommandError("--batch-size must be at least 1.")

        queryset = Product.objects.select_related("category", "category__parent").order_by("id")
        if options["product_id"]:
            queryset = queryset.filter(id=options["product_id"])

        products = list(queryset)
        if not products:
            self.stdout.write(self.style.WARNING("No products found to index."))
            return

        model_name = getattr(settings, "OLLAMA_EMBEDDING_MODEL", "embeddinggemma")
        expected_dimensions = getattr(settings, "CHATBOT_EMBEDDING_DIMENSIONS", 768)
        pending = []
        skipped = 0
        for product in products:
            text = build_product_embedding_text(product)
            digest = content_hash(text)
            if not options["force"] and ProductEmbedding.objects.filter(
                product=product,
                model_name=model_name,
                content_hash=digest,
                dimensions=expected_dimensions,
            ).exists():
                skipped += 1
                continue
            pending.append((product, text, digest))

        if not pending:
            self.stdout.write(self.style.SUCCESS(f"Index already current ({skipped} skipped)."))
            return

        embedding_model = get_embedding_model()
        indexed = 0
        for offset in range(0, len(pending), batch_size):
            batch = pending[offset : offset + batch_size]
            try:
                vectors = embedding_model.embed_documents([item[1] for item in batch])
            except Exception as error:
                raise CommandError(
                    "Unable to reach the Ollama embedding model. "
                    f"Make sure '{model_name}' is installed and Ollama is running."
                ) from error

            for (product, _text, digest), vector in zip(batch, vectors):
                if len(vector) != expected_dimensions:
                    raise CommandError(
                        f"'{model_name}' returned {len(vector)} dimensions; "
                        f"CHATBOT_EMBEDDING_DIMENSIONS is {expected_dimensions}."
                    )
                ProductEmbedding.objects.update_or_create(
                    product=product,
                    defaults={
                        "embedding": vector,
                        "dimensions": len(vector),
                        "model_name": model_name,
                        "content_hash": digest,
                    },
                )
                indexed += 1
            self.stdout.write(f"Indexed {indexed}/{len(pending)} products...")

        self.stdout.write(
            self.style.SUCCESS(f"Indexed {indexed} products; skipped {skipped} unchanged products.")
        )
