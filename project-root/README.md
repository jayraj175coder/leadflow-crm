# Playto Payout Engine

Production-grade payout engine built with Django, Django REST Framework, PostgreSQL, Celery, Redis, React, and TailwindCSS.

## Stack

- Backend: Django 5, DRF, PostgreSQL
- Worker: Celery + Redis
- Frontend: React + Vite + TailwindCSS
- Data integrity: append-only ledger in paise, transactional holds, idempotent payout creation, row-level locking

## Repository Layout

```text
project-root/
  backend/
    apps/payouts/
    config/
    manage.py
  frontend/
    src/
  README.md
  EXPLAINER.md
  requirements.txt
  docker-compose.yml
```

## Quick Start With Docker

1. Copy `.env.example` values into your shell or environment.
2. From the repository root run:

```bash
docker compose up --build
```

3. Services:

- Backend API: `http://localhost:8000/api/v1`
- Frontend: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

The backend container runs migrations and seeds demo data automatically.

## Local Backend Setup

1. Create and activate a Python virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Export environment variables from `.env.example`.
4. Run migrations:

```bash
python backend/manage.py migrate
```

5. Seed merchants and ledger data:

```bash
python backend/manage.py seed_demo_data
```

6. Start the Django API:

```bash
python backend/manage.py runserver
```

7. Start Celery:

```bash
celery -A config worker --workdir backend --loglevel=info
```

## Local Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Ensure `VITE_API_BASE_URL=http://localhost:8000/api/v1`.

## Demo Merchants

`seed_demo_data` creates:

- `MERCHANT_ALPHA`
- `MERCHANT_BETA`
- `MERCHANT_GAMMA`

Each merchant includes at least one bank account and a funded ledger balance.

## API Summary

- `GET /api/v1/merchants/`
- `GET /api/v1/bank-accounts/` with `X-Merchant-External-Id`
- `GET /api/v1/dashboard/` with `X-Merchant-External-Id`
- `GET /api/v1/payouts/` with `X-Merchant-External-Id`
- `POST /api/v1/payouts/` with `X-Merchant-External-Id` and `Idempotency-Key`

## Running Tests

Use PostgreSQL for concurrency semantics:

```bash
python backend/manage.py test apps.payouts
```

## Money Integrity Rules

- All money is stored as paise in `BigIntegerField`.
- No floating point arithmetic is used anywhere in the backend money flow.
- Available balance and held balance are derived via SQL aggregation.
- Payout creation is wrapped in a single database transaction.
- Merchant row locking prevents double spending under concurrency.

