from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from .ai_client import generate_chat_response
from .company_info import get_company_contact_answer
from .knowledge import (
    INTENT_COMPANY_CONTACT,
    INTENT_COURTESY,
    INTENT_GREETING,
    INTENT_OUT_OF_SCOPE,
    build_capability_context,
    build_courtesy_reply,
    build_greeting_reply,
    build_out_of_scope_reply,
    classify_chatbot_intent,
    retrieve_capability_context,
)
from .product_search import get_purchase_history, search_products
from .prompts import build_chat_messages
from .schemas import ChatbotAnswer, detect_language


class ChatbotState(TypedDict, total=False):
    message: str
    user: Any
    history: list[dict]
    capability_documents: list[dict]
    intent: str
    products: list[Any]
    purchase_history: list[dict]
    answer: ChatbotAnswer
    provider: str


def analyze_request(state):
    documents = retrieve_capability_context(state["message"])
    return {
        "capability_documents": documents,
        "intent": classify_chatbot_intent(state["message"], documents),
    }


def route_request(state):
    if state["intent"] == INTENT_COMPANY_CONTACT:
        return "company_contact"
    if state["intent"] == INTENT_COURTESY:
        return "courtesy"
    if state["intent"] == INTENT_GREETING:
        return "greeting"
    if state["intent"] == INTENT_OUT_OF_SCOPE:
        return "out_of_scope"
    return "retrieve"


def create_greeting(state):
    return {
        "products": [],
        "answer": ChatbotAnswer(
            response_type="greeting",
            language=detect_language(state["message"]),
            summary=build_greeting_reply(state["message"]),
        ),
        "provider": "deterministic",
    }


def create_courtesy_reply(state):
    return {
        "products": [],
        "answer": ChatbotAnswer(
            response_type="courtesy",
            language=detect_language(state["message"]),
            summary=build_courtesy_reply(state["message"]),
        ),
        "provider": "deterministic",
    }


def create_company_contact_reply(state):
    summary, details = get_company_contact_answer(state["message"])
    return {
        "products": [],
        "answer": ChatbotAnswer(
            response_type="company_contact",
            language=detect_language(state["message"]),
            summary=summary,
            details=details,
        ),
        "provider": "deterministic",
    }


def create_out_of_scope_reply(state):
    return {
        "products": [],
        "answer": ChatbotAnswer(
            response_type="out_of_scope",
            language=detect_language(state["message"]),
            summary=build_out_of_scope_reply(state["message"]),
        ),
        "provider": "deterministic",
    }


def retrieve_context(state):
    purchase_history = (
        get_purchase_history(state.get("user"))
        if state["intent"] == "purchase_history"
        else []
    )
    return {
        "products": search_products(state["message"]),
        "purchase_history": purchase_history,
    }


def generate_answer(state):
    messages = build_chat_messages(
        state["message"],
        state.get("products", []),
        purchase_history=state.get("purchase_history", []),
        user=state.get("user"),
        capability_context=build_capability_context(state.get("capability_documents", [])),
        conversation_history=state.get("history", []),
    )
    answer, provider = generate_chat_response(messages)
    return {"answer": answer, "provider": provider}


def build_chatbot_graph():
    graph = StateGraph(ChatbotState)
    graph.add_node("analyze", analyze_request)
    graph.add_node("company_contact", create_company_contact_reply)
    graph.add_node("courtesy", create_courtesy_reply)
    graph.add_node("greeting", create_greeting)
    graph.add_node("out_of_scope", create_out_of_scope_reply)
    graph.add_node("retrieve", retrieve_context)
    graph.add_node("generate", generate_answer)
    graph.add_edge(START, "analyze")
    graph.add_conditional_edges(
        "analyze",
        route_request,
        {
            "company_contact": "company_contact",
            "courtesy": "courtesy",
            "greeting": "greeting",
            "out_of_scope": "out_of_scope",
            "retrieve": "retrieve",
        },
    )
    graph.add_edge("company_contact", END)
    graph.add_edge("courtesy", END)
    graph.add_edge("greeting", END)
    graph.add_edge("out_of_scope", END)
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", END)
    return graph.compile()


chatbot_graph = build_chatbot_graph()


def run_chatbot_workflow(*, message, user=None, history=None):
    return chatbot_graph.invoke(
        {
            "message": message,
            "user": user,
            "history": history or [],
        }
    )
