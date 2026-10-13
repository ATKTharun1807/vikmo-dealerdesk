# VIKMO DealerDesk — 5-Minute Video Walkthrough Script

> **Evaluation Criteria (Section 12 of PDF):**
> *"Up to 5 minutes in your own voice, as an unlisted YouTube, Loom or Google Drive link in your README. **No slides: open your code and walk through it.** Django track: the order-confirm flow, from request to database, line by line. AI / ML track: your assistant's tool-calling loop, from user message to final reply."*

---

## 🎬 Setup Before Pressing "Record"

1. **Window 1 (VS Code):**
   - Open [`orders/services.py`](orders/services.py) and scroll to line 253 (`def confirm_order`).
   - Have tabs ready for:
     - [`core/models.py`](core/models.py)
     - [`orders/services.py`](orders/services.py) (line 31 `calculate_line`)
     - [`core/assistant.py`](core/assistant.py)
2. **Window 2 (Terminal):**
   - In folder `VIKMO DealerDesk Assignment`, ready to run:
     ```powershell
     cd "VIKMO DealerDesk Assignment"; .venv\Scripts\python.exe manage.py test --keepdb
     ```
3. **Window 3 (Web Browser):**
   - Open `http://localhost:5173/` in full-screen.

---

## ⏱️ Timeline & Word-For-Word Script

---

### [0:00 – 0:40] Introduction & High-Level Architecture
🖥️ **On Screen:** Show VS Code project tree (`core/`, `orders/`, `ml/`) and briefly open [`core/models.py`](core/models.py).

🗣️ **Spoken Words:**
> "Hi everyone, welcome to the technical walkthrough of my VIKMO DealerDesk submission.
> 
> DealerDesk is a single-operator B2B commerce operating system for an automotive parts distributor in Bengaluru supplying 25 regional dealerships across South India from a 600-product catalogue.
> 
> The backend is built with Django 4.2 and Django REST Framework on PostgreSQL. In `core/models.py`, we model `Product`, `Inventory`, and `Dealer`. In `orders/models.py`, we have `Order` and `OrderItem` supporting full state tracking and tax breakdowns.
> 
> In this video, I will walk you through our concurrency-safe order confirmation engine line-by-line, the status state machine, our grounded AI assistant, and demonstrate our passing test suite and frontend console."

---

### [0:40 – 2:30] The Order-Confirm Flow Line-By-Line (Core Grader Requirement)
🖥️ **On Screen:** Switch to [`orders/services.py`](orders/services.py), line 253 (`def confirm_order`). Highlight the lines as you mention them.

🗣️ **Spoken Words:**
> "Let's walk through the core of the assignment: the `confirm_order` flow in `orders/services.py` starting at line 253.
> 
> **1. Atomic Transaction (Line 261):**
> Everything executes inside `with transaction.atomic():`. This ensures that row locks, stock adjustments, and order state updates succeed or roll back as a single unit of work.
> 
> **2. State Transition Check (Lines 267–268):**
> We verify that `order.status` is strictly `DRAFT`. If the order is already confirmed, dispatched, or cancelled, we immediately raise `InvalidTransitionError`, which returns HTTP 409.
> 
> **3. Deadlock Prevention & Row-Level Locking (Lines 274–281):**
> At line 275, we sort the SKUs: `skus = sorted([item.product_id for item in items])`. Sorting the lock acquisition order prevents database deadlocks when two concurrent orders contain the same parts in different sequences.
> 
> At line 280, we query:
> `Inventory.objects.select_for_update().filter(product_id__in=skus)`
> This executes a PostgreSQL `FOR UPDATE` row lock on each inventory record. Any concurrent request attempting to confirm an order with these same parts will wait until this transaction commits. This is the exact line where overselling is strictly prevented.
> 
> **4. All-or-Nothing Stock Validation (Lines 283–302):**
> We inspect all lines. If even one SKU lacks available stock, we collect every shortage and raise `InsufficientStockError`, returning HTTP 409 Conflict with the exact message and detail structure required by Section 7.3. No stock is touched.
> 
> **5. Stock Deduction & Catalogue Price Locking (Lines 308–322):**
> When stock is sufficient, line 310 decrements `inv.quantity`.
> At line 314, we permanently lock `item.unit_price = item.product.price`. Any future price changes by the supplier will never alter this confirmed order.
> 
> **6. Exact 18% GST Rounding (Lines 31–41):**
> Now let's jump up to line 31 to look at `calculate_line()`. We use Python's `Decimal` type with `ROUND_HALF_UP` to the exact paisa (`Decimal('0.01')`). Tax is calculated and rounded per line, not on the total. Using `Decimal` instead of floating point numbers guarantees that we never suffer from 1-paisa rounding reconciliation errors."

---

### [2:30 – 3:30] State Machine, Cancel Restock & Supplier Sync
🖥️ **On Screen:** Scroll down to line 350 (`def cancel_order`) in [`orders/services.py`](orders/services.py), then glance at [`core/supplier_sync.py`](core/supplier_sync.py).

🗣️ **Spoken Words:**
> "Now let's examine the rest of the order state machine.
> 
> Orders transition strictly from `DRAFT -> CONFIRMED -> DISPATCHED -> DELIVERED`.
> 
> At line 365, look at `cancel_order`: if a confirmed order is cancelled, we acquire row locks with `select_for_update()` and restore the stock back to the warehouse. Cancelling is idempotent: cancelling an already cancelled order safely returns the existing state without double-restocking. Once an order is dispatched or delivered, cancellation is forbidden.
> 
> Next, in `core/supplier_sync.py` for Part B, our supplier sync handles cursor pagination and resilient retries. On HTTP 429 rate limits, it inspects the `Retry-After` header and sleeps accordingly. On 5xx errors, it retries up to 5 times with exponential backoff. If the sync fails after 5 retries, the entire operation aborts atomically and returns HTTP 502 `SUPPLIER_UNAVAILABLE`, ensuring zero partial or corrupted catalogue data. Duplicate SKUs in the feed are resolved by keeping the record with the latest `updated_at`."

---

### [3:30 – 4:15] AI Dealer Assistant & ML Demand Forecasting
🖥️ **On Screen:** Open [`core/assistant.py`](core/assistant.py) showing the tools dictionary, then open [`ml/forecast.csv`](ml/forecast.csv).

🗣️ **Spoken Words:**
> "For Part C, our Dealer Assistant in `core/assistant.py` is an AI agent grounded on our live database using Gemini function calling.
> 
> It provides three tools: `search_parts`, `check_stock`, and `create_draft_order`. The assistant never invents or hallucinates prices or quantities: it must invoke database tools, ensuring that every answer given to a dealer reflects live inventory. The assistant is restricted to creating DRAFT orders only, so human confirmation is always required.
> 
> For Part D, demand forecasting in `ml/forecast.py` projects 4 weeks of demand across 40 SKUs, saved in `ml/forecast.csv` (160 rows). This directly powers `GET /api/reorder-suggestions/`, which implements the Section 10 safety stock formula: $1.65 \times \sigma \times \sqrt{L}$, calculating exact reorder points based on rolling 12-week sales volatility and supplier lead times."

---

### [4:15 – 5:00] Live Demonstration: Automated Tests & Operator Console
🖥️ **On Screen:** 
1. Switch to Terminal and run: `python manage.py test --keepdb` (show 7/7 passing tests).
2. Switch to Web Browser at `http://localhost:5173/` (show Catalogue, Orders, and Forecast).

🗣️ **Spoken Words:**
> "Finally, let's verify everything live.
> 
> In the terminal, running `python manage.py test --keepdb`: all 7 unit and integration tests pass with zero errors. Furthermore, the automated `smoke_test.py` script passes with 100% compliance across auth, products, stock locking, and supplier feeds.
> 
> Switching over to our live Distributor Console in the browser: you can see our unified desk with 600 components, live inventory levels, seamless pagination, one-click draft creation for regional dealerships, and real-time GST invoice generation.
> 
> That concludes my technical walkthrough of VIKMO DealerDesk. Thank you for your time, and I look forward to the live technical round!"

---

## 📌 Post-Recording Checklist

1. **Stop recording** and check the video length (ideal: **4m 30s to 4m 55s**).
2. **Upload video:**
   - **YouTube:** Set visibility to **Unlisted**.
   - **Loom:** Copy the public share link.
   - **Google Drive:** Set access to *"Anyone with the link can view"*.
3. **Add link to `README.md`:**
   Open [`README.md`](README.md) line 99 and paste your URL:
   ```markdown
   ## 5. 5-Minute Video Walkthrough
   - **Link:** `https://youtu.be/YOUR_LINK_HERE`
   ```
4. **Git Commit & Push:**
   ```bash
   git add README.md
   git commit -m "Add video walkthrough link to README"
   git push origin main
   ```
