from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ..chatbot.ai_client import ModelUnavailableError
from ..chatbot.history import (
    build_products_snapshot,
    get_or_create_conversation,
    get_recent_messages,
    save_chatbot_message,
)
from ..chatbot.knowledge import INTENT_OUT_OF_SCOPE
from ..chatbot.response_products import select_products_by_ids
from ..chatbot.throttles import ChatbotRateThrottle
from ..chatbot.workflow import run_chatbot_workflow
from ..models import ChatbotMessage
from ..serializers import ChatbotRequestSerializer, CustomerProductSerializer


class ChatbotView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ChatbotRateThrottle]

    def post(self, request):
        serializer = ChatbotRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data["message"]
        requested_conversation_id = serializer.validated_data.get("conversation_id")
        conversation = get_or_create_conversation(
            request.user,
            message,
            requested_conversation_id,
        )
        conversation_was_reset = bool(
            requested_conversation_id
            and conversation
            and conversation.id != requested_conversation_id
        )
        history = get_recent_messages(
            conversation,
            turn_limit=getattr(settings, "CHATBOT_HISTORY_TURNS", 8),
        )
        user_message = save_chatbot_message(
            conversation=conversation,
            role=ChatbotMessage.ROLE_USER,
            content=message,
        )

        try:
            result = run_chatbot_workflow(
                message=message,
                user=request.user,
                history=history,
            )
        except ModelUnavailableError:
            reply = "AI assistant is temporarily unavailable. Please try again later."
            save_chatbot_message(
                conversation=conversation,
                role=ChatbotMessage.ROLE_ASSISTANT,
                content=reply,
                metadata={"error": "ai_unavailable"},
            )
            return Response({"detail": reply}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        answer = result["answer"]
        intent = result["intent"]
        products = result.get("products", [])
        requested_product_ids = [
            recommendation.product_id for recommendation in answer.recommendations
        ]
        response_products = select_products_by_ids(products, requested_product_ids)
        valid_product_ids = {product.id for product in response_products}
        answer.recommendations = [
            recommendation
            for recommendation in answer.recommendations
            if recommendation.product_id in valid_product_ids
        ]
        reply = answer.render_text()
        products_snapshot = build_products_snapshot(response_products)

        if user_message is not None:
            user_message.intent = intent
            user_message.is_out_of_scope = intent == INTENT_OUT_OF_SCOPE
            user_message.save(update_fields=["intent", "is_out_of_scope"])

        save_chatbot_message(
            conversation=conversation,
            role=ChatbotMessage.ROLE_ASSISTANT,
            content=reply,
            intent=intent,
            is_out_of_scope=intent == INTENT_OUT_OF_SCOPE,
            products_snapshot=products_snapshot,
            metadata={
                "provider": result.get("provider", "unknown"),
                "structured_answer": answer.model_dump(mode="json"),
            },
        )

        return Response(
            {
                "conversation_id": conversation.id if conversation else None,
                "conversation_was_reset": conversation_was_reset,
                "reply": reply,
                "answer": answer.model_dump(mode="json"),
                "provider": result.get("provider", "unknown"),
                "products": CustomerProductSerializer(
                    response_products,
                    many=True,
                    context={"request": request},
                ).data,
            }
        )
