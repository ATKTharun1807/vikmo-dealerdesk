import re
import time
from datetime import datetime
from decimal import Decimal
import requests
from django.conf import settings
from django.db import transaction

from core.models import Inventory, Product
from core.exceptions import SupplierUnavailableError

MONEY_REGEX = re.compile(r"^\d+(\.\d{1,2})?$")


def sync_supplier_catalogue():
    """
    Syncs supplier catalogue into DealerDesk.
    Adheres strictly to API_CONTRACT.md section 8:
    - Retries on 429 (respecting Retry-After) and 5xx (up to 5 attempts per request).
    - All-or-nothing: if any request fails, leaves DB untouched and raises SupplierUnavailableError (502).
    - Skips invalid items and reports them in 'rejected'.
    - Deduplicates by latest updated_at.
    - Never touches our local stock.
    - Returns created, updated, unchanged counts and page/request stats.
    """
    base_url = getattr(settings, "SUPPLIER_API_URL", "http://127.0.0.1:8099").rstrip("/")
    api_key = getattr(settings, "SUPPLIER_API_KEY", "")

    headers = {"X-Api-Key": api_key}
    cursor = None
    pages_fetched = 0
    requests_made = 0
    raw_items = []

    # --- Phase 1: Ingest all pages into memory with retries ---
    while True:
        url = f"{base_url}/v1/products?limit=20"
        if cursor:
            url += f"&cursor={cursor}"

        success = False
        response_data = None

        for attempt in range(1, 6):
            requests_made += 1
            try:
                resp = requests.get(url, headers=headers, timeout=20)
                if resp.status_code == 200:
                    response_data = resp.json()
                    success = True
                    break
                elif resp.status_code == 429:
                    retry_after = float(resp.headers.get("Retry-After", 1))
                    time.sleep(retry_after)
                elif 500 <= resp.status_code < 600:
                    time.sleep(0.5 * attempt)
                else:
                    # 401 or unexpected client error
                    break
            except requests.RequestException:
                time.sleep(0.5 * attempt)

        if not success or response_data is None:
            # All or nothing: fail without touching the database
            raise SupplierUnavailableError("Supplier API is unavailable or rejected credentials.")

        pages_fetched += 1
        page_items = response_data.get("items", [])
        raw_items.extend(page_items)

        cursor = response_data.get("next_cursor")
        if not cursor:
            break

    # --- Phase 2: Validate and filter items ---
    rejected = []
    valid_items_by_sku = {}

    for item in raw_items:
        supplier_sku = item.get("supplier_sku", "")
        sku = str(item.get("sku", "")).strip()
        if not sku:
            rejected.append({"supplier_sku": supplier_sku, "reason": "missing or empty sku"})
            continue

        raw_price = str(item.get("price", "")).strip()
        if not MONEY_REGEX.match(raw_price):
            rejected.append({"supplier_sku": supplier_sku, "reason": "invalid price"})
            continue

        try:
            price_dec = Decimal(raw_price)
            if price_dec <= Decimal("0.00"):
                rejected.append({"supplier_sku": supplier_sku, "reason": "invalid price"})
                continue
        except Exception:
            rejected.append({"supplier_sku": supplier_sku, "reason": "invalid price"})
            continue

        item_updated_at_str = item.get("updated_at")
        try:
            item_updated_at = datetime.fromisoformat(item_updated_at_str.replace("Z", "+00:00")) if item_updated_at_str else datetime.min
        except Exception:
            item_updated_at = datetime.min

        # Deduplication: keep record with latest updated_at
        if sku in valid_items_by_sku:
            prev_item, prev_dt = valid_items_by_sku[sku]
            if item_updated_at > prev_dt:
                valid_items_by_sku[sku] = (item, item_updated_at)
        else:
            valid_items_by_sku[sku] = (item, item_updated_at)

    # --- Phase 3: Apply changes inside an atomic transaction ---
    created_count = 0
    updated_count = 0
    unchanged_count = 0

    with transaction.atomic():
        existing_products = {p.sku: p for p in Product.objects.select_for_update().filter(sku__in=valid_items_by_sku.keys())}

        new_products_to_create = []
        new_inventories_to_create = []

        for sku, (item, _) in valid_items_by_sku.items():
            name = item.get("name", "").strip()
            category = item.get("category", "").strip()
            brand = item.get("brand", "").strip()
            vehicle_fitment = item.get("vehicle_fitment", "").strip()
            description = item.get("description", "").strip()
            price = Decimal(str(item["price"]).strip())

            if sku not in existing_products:
                prod = Product(
                    sku=sku,
                    name=name,
                    category=category,
                    brand=brand,
                    vehicle_fitment=vehicle_fitment,
                    price=price,
                    description=description,
                )
                new_products_to_create.append(prod)
                new_inventories_to_create.append(Inventory(product=prod, quantity=0))
                created_count += 1
            else:
                existing = existing_products[sku]
                diff = (
                    existing.name != name
                    or existing.category != category
                    or existing.brand != brand
                    or existing.vehicle_fitment != vehicle_fitment
                    or existing.description != description
                    or existing.price != price
                )
                if diff:
                    existing.name = name
                    existing.category = category
                    existing.brand = brand
                    existing.vehicle_fitment = vehicle_fitment
                    existing.description = description
                    existing.price = price
                    existing.save(update_fields=[
                        "name", "category", "brand", "vehicle_fitment", "description", "price", "updated_at"
                    ])
                    updated_count += 1
                else:
                    unchanged_count += 1

        if new_products_to_create:
            Product.objects.bulk_create(new_products_to_create)
            Inventory.objects.bulk_create(new_inventories_to_create)

    return {
        "created": created_count,
        "updated": updated_count,
        "unchanged": unchanged_count,
        "rejected": rejected,
        "pages_fetched": pages_fetched,
        "requests_made": requests_made,
    }
