# DeltricArt

DeltricArt is a Django REST API with a React/Vite frontend.

## Project Structure

```text
backend/
  api/
    views_*.py          Domain-focused API views
    serializers_*.py    Domain-focused DRF serializers
    services.py         Payment gateway helpers
    payment_lifecycle.py
  backend/
    settings.py
frontend/
  src/
    admin/              Admin routes, pages, components, layout
    customer/           Storefront routes, pages, components, context, utilities
    components/         Shared storefront components
    pages/              Remaining global pages such as admin login and not-found
```

## Backend

```powershell
cd backend
..\env\Scripts\python.exe manage.py migrate
..\env\Scripts\python.exe manage.py runserver
```

Run checks and tests:

```powershell
cd backend
..\env\Scripts\python.exe manage.py check
..\env\Scripts\python.exe manage.py test api
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Run lint/build:

```powershell
cd frontend
npm run lint
npm run build
```

## Environment

Backend secrets and deployment values should live in `.env`, not in committed source files. Key settings include:

```text
DB_NAME
DB_USER
DB_PASSWORD
DB_HOST
DB_PORT
FRONTEND_BASE_URL
CHECKOUT_PAYMENT_MODE
BILLPLZ_API_KEY
BILLPLZ_COLLECTION_ID
BILLPLZ_X_SIGNATURE_KEY
BILLPLZ_BASE_URL
OLLAMA_BASE_URL
OLLAMA_MODEL
OLLAMA_TIMEOUT_SECONDS
OLLAMA_EMBEDDING_MODEL
GEMINI_API_KEY
GEMINI_MODEL
CHATBOT_LLM_PROVIDER
CHATBOT_LLM_FALLBACK_PROVIDER
CHATBOT_LLM_TIMEOUT_SECONDS
CHATBOT_LLM_MAX_RETRIES
CHATBOT_HISTORY_TURNS
CHATBOT_IDLE_TIMEOUT_MINUTES
CHATBOT_EMBEDDING_ENABLED
CHATBOT_EMBEDDING_DIMENSIONS
CHATBOT_SEMANTIC_CANDIDATES
CHATBOT_SEMANTIC_MIN_SCORE
CHATBOT_THROTTLE_RATE
```

## Chatbot AI and semantic search

The chatbot uses a LangGraph workflow, a structured Pydantic response, and a
configurable model provider. `CHATBOT_LLM_PROVIDER=auto` uses Gemini when
`GEMINI_API_KEY` is present and falls back to Ollama. Set it explicitly to
`gemini` or `ollama` to force one provider.

Authenticated conversations use a rolling idle timeout. Each message extends
the conversation by `CHATBOT_IDLE_TIMEOUT_MINUTES` (60 by default), including
across midnight. After expiry, the next message starts a new conversation and
the old record is marked `expired`. Della receives the latest
`CHATBOT_HISTORY_TURNS` complete user/assistant turns (8 by default).

The default local embedding model is the 768-dimension `embeddinggemma` model.
Install it and build the product semantic index after migrations:

```powershell
ollama pull embeddinggemma
cd backend
..\env\Scripts\python.exe manage.py migrate
..\env\Scripts\python.exe manage.py index_product_embeddings
```

Run `index_product_embeddings` again after product names, descriptions,
categories, or dimensions change. Unchanged products are skipped; use `--force`
to rebuild every vector. If Ollama or the semantic index is unavailable, product
search automatically falls back to the existing SQL keyword search.

The current database host does not expose the PostgreSQL `vector` extension, so
embeddings are stored in a separate JSON-backed index and ranked in the Django
process. This is suitable for the current catalogue size and keeps the model
separate for a later pgvector migration.

The Gemini free tier should not receive personal, sensitive, payment, or
confidential information. Only public catalogue data and non-identifying
shopping context should be sent to a free-tier provider.

## View In My Room

Customers can open `/room-customizer` to upload a room photo, calibrate a wall
with four corners and real measurements, and place dimensioned artworks at
real-world scale. Guests can design and download locally; signing in is
required to save a private, editable room.

Saved rooms are available at `/my-rooms`. Their source photos are stored under
`backend/private_media/` and can only be read through the authenticated room
image endpoint. Apply migrations before using the feature:

```powershell
cd backend
..\env\Scripts\python.exe manage.py migrate
```
