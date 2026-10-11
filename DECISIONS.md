# DECISIONS.md — VIKMO DealerDesk (Django Track)

### 1. Where exactly is overselling prevented? Cite the code, and explain what would happen without it when two confirms arrive together.
**Code Citation**: [orders/services.py](file:///d:/MAIN%20PROJECT/VIKMO_DealerDesk_Assignment%20%281%29/VIKMO%20DealerDesk%20Assignment/orders/services.py) lines 188–236 in `confirm_order()`.

**Explanation**:
Overselling is prevented by acquiring PostgreSQL row-level locks via `select_for_update()` inside an atomic transaction:
```python
with transaction.atomic():
    order = Order.objects.select_for_update().get(order_number=order_number)
    skus = sorted([item.product_id for item in items])
    inventories = {
        inv.product_id: inv
        for inv in Inventory.objects.select_for_update().filter(product_id__in=skus)
    }
```
*What would happen without it*: If two dealers attempt to confirm the final remaining unit of a SKU at the same millisecond, standard ORM queries would both read `quantity = 1` simultaneously (a Read-Modify-Write race condition). Both transactions would approve the order, deduct 1 unit, and write back `quantity = 0`, successfully selling 2 units when only 1 was in stock.
With `select_for_update()`, PostgreSQL places an exclusive lock on the inventory row. The second transaction is queued; once it acquires the lock, it reads the updated `quantity = 0`, fails the check, and is rejected with `409 INSUFFICIENT_STOCK`. SKUs are sorted before locking to eliminate database deadlocks.

---

### 2. How do you calculate and round GST? What would go wrong with floats, or with Decimal's default rounding?
**Code Citation**: [orders/services.py](file:///d:/MAIN%20PROJECT/VIKMO_DealerDesk_Assignment%20%281%29/VIKMO%20DealerDesk%20Assignment/orders/services.py) lines 32–43 in `calculate_line()`.

**Explanation**:
GST (18%) is calculated strictly per-line using Python's `Decimal` and quantized to 2 decimal places with `ROUND_HALF_UP`:
```python
line_subtotal = (unit_price * quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
line_tax = (line_subtotal * Decimal("0.18")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
line_total = line_subtotal + line_tax
```
*What goes wrong with floats*: Binary floating-point representation (IEEE 754) cannot represent decimal fractions precisely (e.g. `0.1 + 0.2 = 0.30000000000000004`), causing rounding errors and cumulative paise mismatches that fail accounting audits.
*What goes wrong with Decimal's default rounding*: Python's `Decimal` defaults to `ROUND_HALF_EVEN` (Banker's rounding), where `.005` rounds to the nearest even digit (e.g. `2.5 -> 2`). Indian GST regulations mandate standard commercial rounding (`ROUND_HALF_UP`), where half-paisa (`0.005`) unconditionally rounds up to `0.01`. Furthermore, tax is rounded per line rather than on order totals to comply with invoice line-item specifications.

---

### 3. How do you guarantee unique order numbers and idempotent order creation when duplicate requests arrive at the same moment?
**Code Citation**: [orders/services.py](file:///d:/MAIN%20PROJECT/VIKMO_DealerDesk_Assignment%20%281%29/VIKMO%20DealerDesk%20Assignment/orders/services.py) lines 46–62 in `generate_order_number()`, lines 65–85 in `create_draft_order()`, and [orders/views.py](file:///d:/MAIN%20PROJECT/VIKMO_DealerDesk_Assignment%20%281%29/VIKMO%20DealerDesk%20Assignment/orders/views.py) lines 56–66.

**Explanation**:
*Unique Order Numbers*:
`generate_order_number()` formats `ORD-YYYYMMDD-NNNN` in the `Asia/Kolkata` timezone. It manages an atomic counter table `DailyOrderSequence` locked with `select_for_update()`. Simultaneous orders serialize on the counter row, guaranteeing sequential and collision-free order numbers even under high concurrency.
*Idempotent Creation*:
When an `Idempotency-Key` header is supplied, the raw JSON request body is hashed with SHA-256. If the key already exists:
- If the body hash matches, the previously stored HTTP response payload is returned immediately without creating new records.
- If the body hash differs, the request is rejected with `409 IDEMPOTENCY_CONFLICT`.
New records are saved atomically upon successful draft creation.

---

### 4. Explain your schema: each model, its relationships, and the `on_delete` choice for every foreign key, with your reasons.
**Code Citation**: [core/models.py](file:///d:/MAIN%20PROJECT/VIKMO_DealerDesk_Assignment%20%281%29/VIKMO%20DealerDesk%20Assignment/core/models.py) lines 6–140.

**Explanation**:
1. **`Product`**: Natural primary key on `sku`. Contains catalogue attributes (`name`, `category`, `brand`, `vehicle_fitment`, `price`, `description`).
2. **`Inventory`**: `OneToOneField(Product, on_delete=models.CASCADE, primary_key=True)`. Decoupled from `Product` so high-frequency inventory updates and row-locks during order confirmation do not block read traffic on the catalogue.
3. **`Dealer`**: B2B dealership master table (`dealer_code`, credit limit, contact info).
4. **`Order`**:
   - `dealer = models.ForeignKey(Dealer, on_delete=models.PROTECT)`: **`PROTECT`** ensures a dealer who has active or historical orders cannot be accidentally deleted, which would corrupt accounting and sales history.
   - Manages state transitions and total money fields.
5. **`OrderItem`**:
   - `order = models.ForeignKey(Order, on_delete=models.CASCADE)`: If an order draft is deleted, its constituent line items are cleaned up.
   - `product = models.ForeignKey(Product, on_delete=models.PROTECT)`: **`PROTECT`** ensures catalogue items cannot be deleted if historical invoices or orders reference them, preserving complete audit trails.
6. **`DailyOrderSequence`**: Single-row-per-day counter table for collision-free order number sequences.
7. **`IdempotencyRecord`**: Stores idempotency key, SHA-256 body hash, and cached response payload.

---

### 5. Where are status transitions enforced, and how do you guarantee a cancel restores stock exactly once?
**Code Citation**: [orders/services.py](file:///d:/MAIN%20PROJECT/VIKMO_DealerDesk_Assignment%20%281%29/VIKMO%20DealerDesk%20Assignment/orders/services.py) lines 188–305 in `confirm_order()`, `dispatch_order()`, `deliver_order()`, and `cancel_order()`.

**Explanation**:
Status transitions are strictly enforced in the service layer inside atomic transactions:
- `DRAFT`: Allowed actions $\to$ `confirm`, `cancel`, `edit (PUT)`.
- `CONFIRMED`: Allowed actions $\to$ `dispatch`, `cancel`.
- `DISPATCHED`: Allowed actions $\to$ `deliver`.
- `DELIVERED` & `CANCELLED`: Terminal states (no transitions permitted).
Any violation raises `InvalidTransitionError` mapped to `409 INVALID_TRANSITION`.
*Restoring stock exactly once*:
In `cancel_order()`, the order row is locked with `select_for_update()`. If the current status is `CONFIRMED`, each line item's quantity is restored to `Inventory`, and the status is updated to `CANCELLED`. If a second cancellation request arrives, the status check detects `CANCELLED` and immediately throws `409 INVALID_TRANSITION` without executing stock restoration logic.

---

### 6. How does your supplier sync handle rate limits, failures and duplicates? How do you guarantee it changes nothing when the feed can't be fully fetched?
**Code Citation**: [core/supplier_sync.py](file:///d:/MAIN%20PROJECT/VIKMO_DealerDesk_Assignment%20%281%29/VIKMO%20DealerDesk%20Assignment/core/supplier_sync.py) lines 15–88 in `sync_supplier_catalogue()`.

**Explanation**:
- **Rate Limits (`429`)**: Inspects the `Retry-After` HTTP header and pauses execution via `time.sleep(float(retry_after))` before retrying the exact request.
- **Failures (`5xx` & network errors)**: Retries with exponential backoff (up to 5 attempts per page request).
- **Duplicates**: Across pages, records with identical SKUs are deduplicated by parsing `updated_at`; only the item with the latest timestamp is retained.
- **Guaranteeing Zero Changes on Incomplete Feed**:
  The sync operates in two discrete phases:
  1. *Fetch Phase*: All pages are retrieved and buffered into memory. If any page fails after 5 retries or 401 occurs, the process terminates immediately with `SupplierUnavailableError` (`502 SUPPLIER_UNAVAILABLE`) before any database transaction is initiated.
  2. *Commit Phase*: Only after the entire feed is validated is a `transaction.atomic()` block opened to apply changes.

---

### 7. How does the sync decide between created, updated and unchanged, and why does a second run change nothing?
**Code Citation**: [core/supplier_sync.py](file:///d:/MAIN%20PROJECT/VIKMO_DealerDesk_Assignment%20%281%29/VIKMO%20DealerDesk%20Assignment/core/supplier_sync.py) lines 105–165.

**Explanation**:
- **`created`**: The SKU does not exist in `Product`. It is inserted with starting `stock = 0` (local inventory is isolated and never set to supplier stock).
- **`updated`**: The SKU exists, and at least one catalogue field (`name`, `category`, `brand`, `vehicle_fitment`, `description`, `price`) differs. The fields are updated.
- **`unchanged`**: The SKU exists and all catalogue attributes match the database values identically.
- **Why a second run changes nothing**:
  The sync is strictly idempotent. When executed a second time on the same feed, every SKU already exists and all fields match the database state, resulting in `created = 0`, `updated = 0`, `unchanged = N`.

---

### 8. What is the weakest part of your submission, and what would you do with two more days?
**Explanation**:
- **Current Limitation**: While `select_for_update()` on `Inventory` provides absolute consistency and zero overselling, high-volume concurrent orders on identical "flash-sale" SKUs serialize at the database row level. Additionally, the supplier sync runs synchronously in the HTTP request thread within a 120-second timeout.
- **With Two More Days**:
  1. Offload `POST /api/sync/supplier/` to an asynchronous Celery task with Redis caching, returning a job ID and task status endpoint.
  2. Implement a Redis reservation pool (with Lua scripts and TTLs) for order stock reservations before database commit to handle thousands of concurrent checkouts per second.
  3. Implement Postgres partial indexes on active orders (`status='DRAFT'`) and add full audit logging on inventory adjustments.
