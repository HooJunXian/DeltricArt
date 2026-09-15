from functools import lru_cache

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .schemas import ChatbotAnswer


class ModelUnavailableError(RuntimeError):
    pass


def generate_chat_response(messages):
    errors = []
    for provider in provider_order():
        try:
            model = get_chat_model(provider)
            structured_model = model.with_structured_output(ChatbotAnswer)
            result = structured_model.invoke(messages)
            if not isinstance(result, ChatbotAnswer):
                result = ChatbotAnswer.model_validate(result)
            return result, provider
        except Exception as error:  # Provider SDKs expose different exception types.
            errors.append(f"{provider}: {error.__class__.__name__}")

    details = "; ".join(errors) or "no provider configured"
    raise ModelUnavailableError(f"No chatbot model provider was available ({details}).")


def provider_order():
    configured = str(getattr(settings, "CHATBOT_LLM_PROVIDER", "auto")).lower()
    fallback = str(getattr(settings, "CHATBOT_LLM_FALLBACK_PROVIDER", "ollama")).lower()

    if configured == "auto":
        providers = ["gemini", "ollama"] if getattr(settings, "GEMINI_API_KEY", "") else ["ollama"]
    elif configured in {"gemini", "ollama"}:
        providers = [configured]
    else:
        raise ImproperlyConfigured(
            "CHATBOT_LLM_PROVIDER must be 'auto', 'gemini', or 'ollama'."
        )

    if fallback in {"gemini", "ollama"} and fallback not in providers:
        if fallback != "gemini" or getattr(settings, "GEMINI_API_KEY", ""):
            providers.append(fallback)
    return providers


@lru_cache(maxsize=4)
def get_chat_model(provider):
    if provider == "gemini":
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        if not api_key:
            raise ImproperlyConfigured("GEMINI_API_KEY is not configured.")

        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(
            model=getattr(settings, "GEMINI_MODEL", "gemini-3.1-flash-lite"),
            api_key=api_key,
            temperature=1.0,
            timeout=getattr(settings, "CHATBOT_LLM_TIMEOUT_SECONDS", 45),
            max_retries=getattr(settings, "CHATBOT_LLM_MAX_RETRIES", 2),
        )

    if provider == "ollama":
        base_url = str(getattr(settings, "OLLAMA_BASE_URL", "")).rstrip("/")
        model_name = getattr(settings, "OLLAMA_MODEL", "")
        if not base_url or not model_name:
            raise ImproperlyConfigured("Ollama is not configured.")

        from langchain_ollama import ChatOllama

        return ChatOllama(
            base_url=base_url,
            model=model_name,
            temperature=0,
            validate_model_on_init=False,
            client_kwargs={
                "timeout": getattr(settings, "OLLAMA_TIMEOUT_SECONDS", 60),
            },
        )

    raise ImproperlyConfigured(f"Unsupported chatbot provider: {provider}")


def clear_model_caches():
    get_chat_model.cache_clear()
