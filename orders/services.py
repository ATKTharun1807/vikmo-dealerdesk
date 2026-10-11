import hashlib
import json
from datetime import datetime, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.utils import timezone as django_tz

from core.models import (
    Dealer,
    Inventory,
    Order,
    OrderItem,
    Product,
    DailyOrderSequence,
    IdempotencyRecord,
)
from core.exceptions import (
    CustomValidationError,
    IdempotencyConflictError,
    InsufficientStockError,
    InvalidTransitionError,
    NotFoundCustomError,
    OrderLockedError,
)

IST = timezone(timedelta(hours=5, minutes=30))
TAX_RATE = Decimal("0.18")
PENNY = Decimal("0.01")


def calculate_line(unit_price: Decimal, quantity: int):
    """
    18% GST calculated per line and rounded ROUND_HALF_UP to the paisa.
    line_subtotal = unit_price * quantity
    line_tax = line_subtotal * 0.18 (ROUND_HALF_UP)
    line_total = line_subtotal + line_tax
    """
    line_subtotal = (unit_price * quantity).quantize(PENNY, rounding=ROUND_HALF_UP)
    line_tax = (line_subtotal * TAX_RATE).quantize(PENNY, rounding=ROUND_HALF_UP)
    line_total = line_subtotal + line_tax
    return line_subtotal, line_tax, line_total


def generate_order_number() -> str:
    """
    Generates ORD-YYYYMMDD-NNNN.
    IST date, daily sequence starting at 0001.
    Concurrency safe using row-level locking on DailyOrderSequence.
    """
    now_ist = datetime.now(IST)
    today = now_ist.date()
    date_str = today.strftime("%Y%m%d")

    # Atomic lock on daily sequence counter
    seq_obj, _ = DailyOrderSequence.objects.select_for_update().get_or_create(
        date=today,
        defaults={"last_number": 0}
    )
    seq_obj.last_number += 1
    seq_obj.save(update_fields=["last_number"])

    return f"ORD-{date_str}-{seq_obj.last_number:04d}"


def create_draft_order(dealer_id: int, items_data: list, idempotency_key: str = None, raw_body_bytes: bytes = None):
    """
    Creates a DRAFT order.
    Validates dealer, items list, SKU existence, unique SKUs per order.
    Unit price is locked to current catalogue price.
    Does NOT deduct stock.
    Handles Idempotency-Key.
    """
    # 1. Idempotency Check
    body_hash = ""
    if idempotency_key:
        body_hash = hashlib.sha256(raw_body_bytes or b"").hexdigest()
        existing_record = IdempotencyRecord.objects.filter(key=idempotency_key).first()
        if existing_record:
            if existing_record.request_hash == body_hash:
                return existing_record.response_body, existing_record.status_code, False
            else:
                raise IdempotencyConflictError("Idempotency key reused with different request payload.")

    # 2. Validation
    if not dealer_id:
        raise CustomValidationError("dealer_id is required.")
    try:
        dealer = Dealer.objects.get(id=dealer_id)
    except Dealer.DoesNotExist:
        raise CustomValidationError(f"Dealer with id {dealer_id} does not exist.")

    if not items_data or not isinstance(items_data, list):
        raise CustomValidationError("items must be a non-empty list.")

    seen_skus = set()
    validated_lines = []

    for idx, item in enumerate(items_data):
        if not isinstance(item, dict):
            raise CustomValidationError(f"Invalid item format at index {idx}.")
        sku = item.get("sku")
        quantity = item.get("quantity")

        if not sku or not str(sku).strip():
            raise CustomValidationError(f"Item at index {idx} is missing 'sku'.")
        sku = str(sku).strip()

        if sku in seen_skus:
            raise CustomValidationError(f"Duplicate SKU '{sku}' in order items.")
        seen_skus.add(sku)

        try:
            quantity = int(quantity)
            if quantity < 1:
                raise ValueError()
        except (ValueError, TypeError):
            raise CustomValidationError(f"Quantity for SKU '{sku}' must be an integer >= 1.")

        try:
            product = Product.objects.get(sku=sku)
        except Product.DoesNotExist:
            raise CustomValidationError(f"Product with SKU '{sku}' does not exist.")

        validated_lines.append((product, quantity))

    # 3. Create Draft inside transaction
    with transaction.atomic():
        order_number = generate_order_number()
        order = Order.objects.create(
            order_number=order_number,
            dealer=dealer,
            status=Order.Status.DRAFT,
            subtotal=Decimal("0.00"),
            tax_total=Decimal("0.00"),
            grand_total=Decimal("0.00"),
        )

        subtotal = Decimal("0.00")
        tax_total = Decimal("0.00")

        order_items = []
        for product, quantity in validated_lines:
            unit_price = product.price
            line_sub, line_tx, line_tot = calculate_line(unit_price, quantity)
            subtotal += line_sub
            tax_total += line_tx

            order_items.append(
                OrderItem(
                    order=order,
                    product=product,
                    quantity=quantity,
                    unit_price=unit_price,
                    line_subtotal=line_sub,
                    line_tax=line_tx,
                    line_total=line_tot,
                )
            )

        OrderItem.objects.bulk_create(order_items)

        order.subtotal = subtotal
        order.tax_total = tax_total
        order.grand_total = subtotal + tax_total
        order.save(update_fields=["subtotal", "tax_total", "grand_total"])

    return order, 201, True


def update_draft_order(order_number: str, items_data: list):
    """
    PUT /api/orders/{order_number}/
    Replaces all items. Allowed only while status is DRAFT.
    """
    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(order_number=order_number)
        except Order.DoesNotExist:
            raise NotFoundCustomError(f"Order '{order_number}' not found.")

        if order.status != Order.Status.DRAFT:
            raise OrderLockedError(f"Order '{order_number}' is {order.status} and cannot be modified.")

        if not items_data or not isinstance(items_data, list):
            raise CustomValidationError("items must be a non-empty list.")

        seen_skus = set()
        validated_lines = []

        for idx, item in enumerate(items_data):
            if not isinstance(item, dict):
                raise CustomValidationError(f"Invalid item format at index {idx}.")
            sku = item.get("sku")
            quantity = item.get("quantity")

            if not sku or not str(sku).strip():
                raise CustomValidationError(f"Item at index {idx} is missing 'sku'.")
            sku = str(sku).strip()

            if sku in seen_skus:
                raise CustomValidationError(f"Duplicate SKU '{sku}' in order items.")
            seen_skus.add(sku)

            try:
                quantity = int(quantity)
                if quantity < 1:
                    raise ValueError()
            except (ValueError, TypeError):
                raise CustomValidationError(f"Quantity for SKU '{sku}' must be an integer >= 1.")

            try:
                product = Product.objects.get(sku=sku)
            except Product.DoesNotExist:
                raise CustomValidationError(f"Product with SKU '{sku}' does not exist.")

            validated_lines.append((product, quantity))

        # Replace items
        order.items.all().delete()

        subtotal = Decimal("0.00")
        tax_total = Decimal("0.00")
        order_items = []

        for product, quantity in validated_lines:
            unit_price = product.price
            line_sub, line_tx, line_tot = calculate_line(unit_price, quantity)
            subtotal += line_sub
            tax_total += line_tx

            order_items.append(
                OrderItem(
                    order=order,
                    product=product,
                    quantity=quantity,
                    unit_price=unit_price,
                    line_subtotal=line_sub,
                    line_tax=line_tx,
                    line_total=line_tot,
                )
            )

        OrderItem.objects.bulk_create(order_items)

        order.subtotal = subtotal
        order.tax_total = tax_total
        order.grand_total = subtotal + tax_total
        order.save(update_fields=["subtotal", "tax_total", "grand_total", "updated_at"])

    return order


def confirm_order(order_number: str):
    """
    POST /api/orders/{order_number}/confirm/
    DRAFT -> CONFIRMED
    Checks and deducts stock with select_for_update.
    All-or-nothing stock deduction.
    Locks catalogue price permanently.
    """
    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(order_number=order_number)
        except Order.DoesNotExist:
            raise NotFoundCustomError(f"Order '{order_number}' not found.")

        if order.status != Order.Status.DRAFT:
            raise InvalidTransitionError(f"Cannot confirm order in '{order.status}' status.")

        items = list(order.items.select_related("product").all())
        if not items:
            raise CustomValidationError("Cannot confirm an order with no items.")

        # Sort SKUs to avoid deadlocks
        skus = sorted([item.product_id for item in items])

        # Acquire row-level locks on Inventory
        inventories = {
            inv.product_id: inv
            for inv in Inventory.objects.select_for_update().filter(product_id__in=skus)
        }

        shortages = []
        messages = []
        for item in items:
            inv = inventories.get(item.product_id)
            available = inv.quantity if inv else 0
            if available < item.quantity:
                shortages.append({
                    "sku": item.product_id,
                    "requested": item.quantity,
                    "available": available,
                })
                messages.append(
                    f"Insufficient stock for {item.product.name}. Available: {available}, Requested: {item.quantity}"
                )

        if shortages:
            raise InsufficientStockError(
                message=" ".join(messages),
                details=shortages,
            )

        # Stock is sufficient: deduct stock and lock price
        subtotal = Decimal("0.00")
        tax_total = Decimal("0.00")

        for item in items:
            inv = inventories[item.product_id]
            inv.quantity -= item.quantity
            inv.save(update_fields=["quantity", "updated_at"])

            # Lock price to current catalogue price
            item.unit_price = item.product.price
            item.line_subtotal, item.line_tax, item.line_total = calculate_line(
                item.unit_price, item.quantity
            )
            item.save(update_fields=["unit_price", "line_subtotal", "line_tax", "line_total"])

            subtotal += item.line_subtotal
            tax_total += item.line_tax

        order.subtotal = subtotal
        order.tax_total = tax_total
        order.grand_total = subtotal + tax_total
        order.status = Order.Status.CONFIRMED
        order.save(update_fields=["status", "subtotal", "tax_total", "grand_total", "updated_at"])

    return order


def dispatch_order(order_number: str):
    """
    POST /api/orders/{order_number}/dispatch/
    CONFIRMED -> DISPATCHED
    """
    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(order_number=order_number)
        except Order.DoesNotExist:
            raise NotFoundCustomError(f"Order '{order_number}' not found.")

        if order.status != Order.Status.CONFIRMED:
            raise InvalidTransitionError(f"Cannot dispatch order in '{order.status}' status.")

        order.status = Order.Status.DISPATCHED
        order.save(update_fields=["status", "updated_at"])

    return order


def deliver_order(order_number: str):
    """
    POST /api/orders/{order_number}/deliver/
    DISPATCHED -> DELIVERED
    """
    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(order_number=order_number)
        except Order.DoesNotExist:
            raise NotFoundCustomError(f"Order '{order_number}' not found.")

        if order.status != Order.Status.DISPATCHED:
            raise InvalidTransitionError(f"Cannot deliver order in '{order.status}' status.")

        order.status = Order.Status.DELIVERED
        order.save(update_fields=["status", "updated_at"])

    return order


def cancel_order(order_number: str):
    """
    POST /api/orders/{order_number}/cancel/
    DRAFT -> CANCELLED, or CONFIRMED -> CANCELLED (restores stock exactly once).
    DISPATCHED and DELIVERED cannot be cancelled.
    """
    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(order_number=order_number)
        except Order.DoesNotExist:
            raise NotFoundCustomError(f"Order '{order_number}' not found.")

        if order.status not in (Order.Status.DRAFT, Order.Status.CONFIRMED):
            raise InvalidTransitionError(f"Cannot cancel order in '{order.status}' status.")

        # If CONFIRMED, restore stock exactly once
        if order.status == Order.Status.CONFIRMED:
            items = list(order.items.select_related("product").all())
            skus = sorted([item.product_id for item in items])
            inventories = {
                inv.product_id: inv
                for inv in Inventory.objects.select_for_update().filter(product_id__in=skus)
            }
            for item in items:
                inv = inventories.get(item.product_id)
                if inv:
                    inv.quantity += item.quantity
                    inv.save(update_fields=["quantity", "updated_at"])

        order.status = Order.Status.CANCELLED
        order.save(update_fields=["status", "updated_at"])

    return order
