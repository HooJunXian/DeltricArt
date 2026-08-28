import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


def ask_ollama(messages):
    base_url = str(getattr(settings, "OLLAMA_BASE_URL", "")).rstrip("/")
    model = getattr(settings, "OLLAMA_MODEL", "")

    if not base_url or not model:
        raise ImproperlyConfigured("Ollama is not configured.")

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.35,
            "top_p": 0.9,
        },
    }
    request = Request(
        f"{base_url}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=getattr(settings, "OLLAMA_TIMEOUT_SECONDS", 60)) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise RuntimeError(f"Ollama returned HTTP {error.code}.") from error
    except (TimeoutError, URLError, OSError, ValueError) as error:
        raise RuntimeError("Unable to reach Ollama. Please make sure Ollama is running.") from error

    return strip_qwen_thinking(data.get("message", {}).get("content", "").strip())


def strip_qwen_thinking(content):
    return re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL | re.IGNORECASE).strip()
