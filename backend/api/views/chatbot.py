from django.core.exceptions import ImproperlyConfigured
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..chatbot.ai_client import ask_ollama
from ..chatbot.history import (
    build_products_snapshot,
    get_or_create_conversation,
    save_chatbot_message,
)
from ..chatbot.knowledge import (
    build_capability_context,
    build_greeting_reply,
    build_out_of_scope_reply,
    classify_chatbot_intent,
    INTENT_GREETING,
    INTENT_OUT_OF_SCOPE,
    is_supported_request,
    retrieve_capability_context,
)
from ..chatbot.product_search import get_purchase_history, search_products
from ..chatbot.prompts import build_chat_messages
from ..chatbot.response_products import filter_products_mentioned_in_reply
from ..chatbot.throttles import ChatbotRateThrottle
from ..models import ChatbotMessage
from ..serializers import ChatbotRequestSerializer, CustomerProductSerializer


class ChatbotView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ChatbotRateThrottle]

    def post(self, request):
        serializer = ChatbotRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data["message"]
        conversation = get_or_create_conversation(request.user, message)
        capability_documents = retrieve_capability_context(message)
        intent = classify_chatbot_intent(message, capability_documents)
        is_out_of_scope = intent == INTENT_OUT_OF_SCOPE

        save_chatbot_message(
            conversation=conversation,
            role=ChatbotMessage.ROLE_USER,
            content=message,
            intent=intent,
            is_out_of_scope=is_out_of_scope,
        )

        if intent == INTENT_GREETING:
            reply = build_greeting_reply(message)
            save_chatbot_message(
                conversation=conversation,
                role=ChatbotMessage.ROLE_ASSISTANT,
                content=reply,
                intent=intent,
            )
            return Response(
                {
                    "conversation_id": conversation.id,
                    "reply": reply,
                    "products": [],
                }
            )

        if not is_supported_request(message, capability_documents):
            reply = build_out_of_scope_reply(message)
            save_chatbot_message(
                conversation=conversation,
                role=ChatbotMessage.ROLE_ASSISTANT,
                content=reply,
                intent=intent,
                is_out_of_scope=True,
            )
            return Response(
                {
                    "conversation_id": conversation.id,
                    "reply": reply,
                    "products": [],
                }
            )

        products = search_products(message)
        purchase_history = (
            get_purchase_history(request.user)
            if intent == "purchase_history"
            else []
        )
        messages = build_chat_messages(
            message,
            products,
            purchase_history=purchase_history,
            user=request.user,
            capability_context=build_capability_context(capability_documents),
        )

        try:
            reply = ask_ollama(messages)
        except (ImproperlyConfigured, RuntimeError):
            reply = "AI assistant is temporarily unavailable. Please try again later."
            save_chatbot_message(
                conversation=conversation,
                role=ChatbotMessage.ROLE_ASSISTANT,
                content=reply,
                intent=intent,
                metadata={"error": "ai_unavailable"},
            )
            return Response({"detail": reply}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        response_products = filter_products_mentioned_in_reply(products, reply)
        products_snapshot = build_products_snapshot(response_products)
        save_chatbot_message(
            conversation=conversation,
            role=ChatbotMessage.ROLE_ASSISTANT,
            content=reply,
            intent=intent,
            products_snapshot=products_snapshot,
        )

        return Response(
            {
                "conversation_id": conversation.id,
                "reply": reply,
                "products": CustomerProductSerializer(
                    response_products,
                    many=True,
                    context={"request": request},
                ).data,
            }
        )
