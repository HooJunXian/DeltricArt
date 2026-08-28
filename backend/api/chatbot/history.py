from django.utils import timezone

from api.models import ChatbotConversation, ChatbotMessage


def get_or_create_conversation(user, message):
    conversation = ChatbotConversation.objects.filter(user=user).order_by("-updated_at", "-id").first()
    if conversation:
        return conversation

    return ChatbotConversation.objects.create(
        user=user,
        title=build_conversation_title(message),
    )


def save_chatbot_message(
    *,
    conversation,
    role,
    content,
    intent="",
    is_out_of_scope=False,
    products_snapshot=None,
    metadata=None,
):
    message = ChatbotMessage.objects.create(
        conversation=conversation,
        role=role,
        content=content,
        intent=intent,
        is_out_of_scope=is_out_of_scope,
        products_snapshot=products_snapshot or [],
        metadata=metadata or {},
    )
    ChatbotConversation.objects.filter(pk=conversation.pk).update(updated_at=timezone.now())
    return message


def build_products_snapshot(products):
    snapshots = []
    for product in products:
        category_path = product.category.name
        if product.category.parent:
            category_path = f"{product.category.parent.name} > {product.category.name}"
        snapshots.append(
            {
                "id": product.id,
                "code": product.code,
                "name": product.name,
                "price": str(product.price),
                "category_path": category_path,
            }
        )
    return snapshots


def build_conversation_title(message):
    normalized = " ".join(str(message or "").split())
    return normalized[:120]
