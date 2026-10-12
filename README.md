# VIKMO DealerDesk — Submission

**Track:** `django`

A production-grade distributed ordering backend, inventory management engine, and resilient supplier integration system built for motorcycle and automotive parts distributors across South India.

---

## 1. Features Implemented (Django Track)

- **Part A1 · Core REST API**:
  - Filterable, paginated products endpoint (`search`, `category`, `vehicle`) with live stock.
  - Inventory management with validation (`PUT /api/inventory/{sku}/`).
  - Dealership management and creation.
  - Contract-compliant error shape across all endpoints: `{"error": {"code": "...", "message": "...", "details": []}}`.
- **Part A2 · Order Engine**:
  - Full order lifecycle state machine: `DRAFT` $\to$ `CONFIRMED` $\to$ `DISPATCHED` $\to$ `DELIVERED`, and cancellation.
  - **Zero Overselling Concurrency Engine**: Strict row-level locking via PostgreSQL `select_for_update()` inside atomic transactions with deterministic SKU sorting to eliminate deadlocks.
  - **Exact Money & GST Engine**: Per-line 18% GST calculation quantized to the paisa with `ROUND_HALF_UP` using Python `Decimal`.
  - **Unique Order Numbers**: `ORD-YYYYMMDD-NNNN` in `Asia/Kolkata` timezone with atomic sequence persistence.
  - **Duplicate-Safe Idempotency**: `Idempotency-Key` header support with SHA-256 payload verification.
- **Part B · Resilient Supplier Catalogue Sync**:
  - Cursor-based pagination following `next_cursor` until null.
  - Automatic retry with `Retry-After` header parsing on HTTP `429` rate limits.
  - Transient failure recovery with exponential backoff on HTTP `5xx` errors (up to 5 attempts per page).
  - All-or-nothing rollback: returns `502 SUPPLIER_UNAVAILABLE` without corrupting local database state if any page fails.
  - Duplicate SKU resolution keeping the record with the latest `updated_at`.
  - Catalogue isolation: local inventory is never overwritten with supplier warehouse quantities.
- **Part C · Dealer AI Assistant (Optional Bonus)**:
  - Natural language part search and live database grounding via LLM tool calling (`search_parts`, `check_stock`, `create_draft_order`).
  - Session memory persistence with prompt-injection guardrails against untrusted supplier descriptions.
- **Part D · Demand Forecast & Safety Stock Reorder (Optional Bonus)**:
  - 4-week demand forecast generated for 40 SKUs committed in `ml/forecast.csv` (160 rows).
  - Safety stock formula endpoint `GET /api/reorder-suggestions/` implementing $SS = \lceil 1.65 \times \sigma \times \sqrt{L} \rceil$ and $ROP = LTD + SS$.
- **Part E · Full-Width React Frontend (Optional Bonus)**:
  - Unified Distributor Console built with React 19 + TypeScript and custom Anthropic dark design system.
  - Complete catalogue pagination (all 612 parts), live stock audits, order fulfillment, and forecast visualization.

---

## 2. Setup & Execution

### Prerequisites
- Python 3.11+
- PostgreSQL database (e.g. Neon, Supabase, or local)

### Setup Steps
```bash
# 1. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables (.env)
cp .env.example .env
# Edit .env with your DATABASE_URL, SUPPLIER_API_URL, SUPPLIER_API_KEY

# 4. Apply migrations and seed data
python manage.py migrate --noinput
python manage.py seed_data
python manage.py seed_data  # Verified idempotent (safe to run twice)

# 5. Start development server
python manage.py runserver 0.0.0.0:8000 --noreload
```

---

## 3. Running Tests

### Automated Smoke Test
To run the automated smoke test against the live server:
```bash
# Terminal 1: Run supplier mock
python supplier_mock/mock_supplier.py

# Terminal 2: Run smoke test
python smoke_test.py --base-url http://localhost:8000 --track django
```

### Unit & Concurrency Test Suite
Run the test suite verifying concurrency row-locks, state machine transitions, and GST rounding:
```bash
python manage.py test --keepdb
```

---

## 4. Key Architectural Decisions

All 8 technical questions with file and line number citations are documented in **[DECISIONS.md](DECISIONS.md)**.

---

## 5. 5-Minute Video Walkthrough

- **Link:** `[Link to be added before final submission]`
- **Content Covered:**
  1. High-level architecture and relational model design.
  2. The Order Confirm flow from incoming HTTP request to PostgreSQL row-level locks line-by-line.
  3. Demonstration of passing tests and smoke test results.
