import re
import json
from decimal import Decimal
from django.conf import settings
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from core.models import Product, Inventory, Dealer
from core.exceptions import CustomValidationError
from orders import services


# Session memory store (in-memory per session_id)
SESSION_MEMORY = {}


def _search_parts(query="", vehicle=""):
    qs = Product.objects.select_related("inventory").all()
    if query:
        query_words = query.strip().split()
        for w in query_words:
            qs = qs.filter(Q(name__icontains=w) | Q(category__icontains=w) | Q(sku__icontains=w) | Q(brand__icontains=w))
    if vehicle:
        qs = qs.filter(vehicle_fitment__icontains=vehicle.strip())
    return list(qs[:5])


def _check_stock(sku):
    try:
        product = Product.objects.select_related("inventory").get(sku=sku)
        qty = product.inventory.quantity if hasattr(product, "inventory") else 0
        return {
            "sku": product.sku,
            "name": product.name,
            "price": str(product.price),
            "stock": qty,
            "vehicle_fitment": product.vehicle_fitment,
        }
    except Product.DoesNotExist:
        return None


class AssistantChatView(APIView):
    """
    POST /api/assistant/chat/
    Conversational assistant for dealers with tool calling and live DB grounding.
    """
    def post(self, request):
        data = request.data
        session_id = data.get("session_id")
        dealer_id = data.get("dealer_id")
        message = data.get("message", "").strip()

        if not session_id or not dealer_id or not message:
            raise CustomValidationError("session_id, dealer_id, and message are required.")

        try:
            dealer = Dealer.objects.get(id=dealer_id)
        except Dealer.DoesNotExist:
            raise CustomValidationError(f"Dealer with ID {dealer_id} not found.")

        # Initialize session history
        if session_id not in SESSION_MEMORY:
            SESSION_MEMORY[session_id] = []

        history = SESSION_MEMORY[session_id]
        tool_calls = []
        cited_skus = []
        actions = []
        reply = ""

        # Check for order creation intent: "order 5 units of BRK-1044", "create draft for BRK-1044 qty 2"
        order_pattern = re.search(r"(?:order|draft|buy|put aside)\s+(\d+)\s+(?:units?\s+(?:of\s+)?)?([A-Z]{3}-\d{4})", message, re.IGNORECASE)
        sku_order_pattern = re.search(r"([A-Z]{3}-\d{4})\s+(?:quantity|qty)?\s*[:=]?\s*(\d+)", message, re.IGNORECASE)

        if order_pattern or sku_order_pattern:
            if order_pattern:
                qty = int(order_pattern.group(1))
                sku = order_pattern.group(2).upper()
            else:
                sku = sku_order_pattern.group(1).upper()
                qty = int(sku_order_pattern.group(2))

            tool_calls.append({
                "name": "create_draft_order",
                "arguments": {"dealer_id": dealer_id, "sku": sku, "quantity": qty}
            })
            cited_skus.append(sku)

            try:
                order, _, _ = services.create_draft_order(
                    dealer_id=dealer_id,
                    items_data=[{"sku": sku, "quantity": qty}]
                )
                actions.append({
                    "type": "draft_order_created",
                    "order_number": order.order_number
                })
                reply = (
                    f"I have created a DRAFT order #{order.order_number} for dealer {dealer.name} "
                    f"with {qty} units of {sku}. Grand Total: ₹{order.grand_total} (includes 18% GST). "
                    f"You can review and confirm this order in the Orders tab."
                )
            except Exception as e:
                reply = f"Could not create draft order: {str(e)}"

        else:
            # Check for direct SKU stock check: "BRK-1044"
            sku_match = re.search(r"\b([A-Z]{3}-\d{4})\b", message, re.IGNORECASE)
            if sku_match:
                target_sku = sku_match.group(1).upper()
                tool_calls.append({
                    "name": "check_stock",
                    "arguments": {"sku": target_sku}
                })
                cited_skus.append(target_sku)
                stock_info = _check_stock(target_sku)
                if stock_info:
                    reply = (
                        f"Live stock for {stock_info['name']} ({stock_info['sku']}): "
                        f"{stock_info['stock']} units available at ₹{stock_info['price']} each "
                        f"(fits {stock_info['vehicle_fitment']})."
                    )
                else:
                    reply = f"Product SKU {target_sku} was not found in the catalogue."
            else:
                # Search parts intent
                vehicle = ""
                query = message
                # extract common vehicles
                for v in ["Pulsar 150", "Pulsar 220", "Duke 390", "Classic 350", "Apache RTR", "Activa 6G", "Splendor"]:
                    if v.lower() in message.lower():
                        vehicle = v
                        break

                tool_calls.append({
                    "name": "search_parts",
                    "arguments": {"query": query, "vehicle": vehicle}
                })

                matches = _search_parts(query=query if not vehicle else query.replace(vehicle, "").strip(), vehicle=vehicle)
                if matches:
                    cited_skus = [p.sku for p in matches[:3]]
                    parts_desc = []
                    for p in matches[:3]:
                        qty = p.inventory.quantity if hasattr(p, "inventory") else 0
                        parts_desc.append(f"{p.name} ({p.sku}) — ₹{p.price}, {qty} in stock, fits {p.vehicle_fitment}")
                    reply = f"Here are the matching parts:\n" + "\n".join(f"• {desc}" for desc in parts_desc)
                else:
                    reply = (
                        "I couldn't find any direct parts matching your description. "
                        "Could you specify the vehicle model (e.g. Pulsar 150, Duke 390) or part category (Brakes, Chain, Filters)?"
                    )

        # Store in session history
        history.append({"user": message, "reply": reply})

        return Response({
            "reply": reply,
            "cited_skus": list(set(cited_skus)),
            "tool_calls": tool_calls,
            "actions": actions
        }, status=status.HTTP_200_OK)
