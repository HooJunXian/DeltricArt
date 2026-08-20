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
```
