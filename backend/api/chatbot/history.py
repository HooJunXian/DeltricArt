from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from api.models import ChatbotConversation, ChatbotMessage


def get_or_create_conversation(user, message, conversation_id=None):
    if not user or not user.is_authenticated:
        return None

    now = timezone.now()
    if conversation_id:
        conversation = ChatbotConversation.objects.filter(
            id=conversation_id,
            user=user,
        ).first()
        if conversation:
            if not expire_conversation_if_needed(conversation, now=now):
                return conversation
            return create_conversation(user, message, now=now)

    conversation = (
        ChatbotConversation.objects.filter(
            user=user,
            status=ChatbotConversation.STATUS_ACTIVE,
        )
        .order_by("-updated_at", "-id")
        .first()
    )
    if conversation:
        if not expire_conversation_if_needed(conversation, now=now):
            return conversation

    return create_conversation(user, message, now=now)


def create_conversation(user, message, now=None):
    now = now or timezone.now()
    return ChatbotConversation.objects.create(
        user=user,
        title=build_conversation_title(message),
        status=ChatbotConversation.STATUS_ACTIVE,
        expires_at=conversation_expiration_time(now),
    )


def expire_conversation_if_needed(conversation, now=None):
    now = now or timezone.now()
    expires_at = conversation.expires_at or conversation_expiration_time(
        conversation.updated_at
    )
    if conversation.status == ChatbotConversation.STATUS_EXPIRED or expires_at <= now:
        if conversation.status != ChatbotConversation.STATUS_EXPIRED:
            ChatbotConversation.objects.filter(pk=conversation.pk).update(
                status=ChatbotConversation.STATUS_EXPIRED,
                expires_at=expires_at,
            )
            conversation.status = ChatbotConversation.STATUS_EXPIRED
            conversation.expires_at = expires_at
        return True

    if conversation.expires_at is None:
        ChatbotConversation.objects.filter(pk=conversation.pk).update(expires_at=expires_at)
        conversation.expires_at = expires_at
    return False


def conversation_expiration_time(activity_time=None):
    activity_time = activity_time or timezone.now()
    timeout_minutes = getattr(settings, "CHATBOT_IDLE_TIMEOUT_MINUTES", 60)
    return activity_time + timedelta(minutes=timeout_minutes)


def get_recent_messages(conversation, turn_limit=8):
    if conversation is None:
        return []
    message_limit = max(int(turn_limit), 0) * 2
    if not message_limit:
        return []
    messages = list(
        conversation.messages.order_by("-created_at", "-id")[:message_limit]
    )
    return [
        {"role": message.role, "content": message.content}
        for message in reversed(messages)
    ]


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
    if conversation is None:
        return None

    message = ChatbotMessage.objects.create(
        conversation=conversation,
        role=role,
        content=content,
        intent=intent,
        is_out_of_scope=is_out_of_scope,
        products_snapshot=products_snapshot or [],
        metadata=metadata or {},
    )
    now = timezone.now()
    ChatbotConversation.objects.filter(pk=conversation.pk).update(
        updated_at=now,
        status=ChatbotConversation.STATUS_ACTIVE,
        expires_at=conversation_expiration_time(now),
    )
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
                "width_cm": str(product.width_cm) if product.width_cm is not None else None,
                "height_cm": str(product.height_cm) if product.height_cm is not None else None,
                "length_cm": str(product.length_cm) if product.length_cm is not None else None,
            }
        )
    return snapshots


def build_conversation_title(message):
    normalized = " ".join(str(message or "").split())
    return normalized[:120]
