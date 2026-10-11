import json
import hashlib
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from core.models import Order, IdempotencyRecord
from core.exceptions import NotFoundCustomError
from core.pagination import StandardResultsSetPagination
from orders.serializers import OrderSerializer
from orders import services


class OrderListCreateView(APIView):
    """
    GET /api/orders/  - Paginated list. Filters: dealer_id, status.
    POST /api/orders/ - Create DRAFT order. Optional Idempotency-Key header.
    """
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        queryset = Order.objects.prefetch_related("items__product", "dealer").all().order_by("-created_at")

        dealer_id = request.query_params.get("dealer_id")
        if dealer_id:
            queryset = queryset.filter(dealer_id=dealer_id)

        order_status = request.query_params.get("status")
        if order_status:
            queryset = queryset.filter(status=order_status)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = OrderSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        idempotency_key = request.headers.get("Idempotency-Key") or request.META.get("HTTP_IDEMPOTENCY_KEY")
        raw_body = request.body

        data = request.data
        dealer_id = data.get("dealer_id")
        items = data.get("items")

        order_or_body, status_code, is_new = services.create_draft_order(
            dealer_id=dealer_id,
            items_data=items,
            idempotency_key=idempotency_key,
            raw_body_bytes=raw_body,
        )

        if not is_new:
            # Idempotency hit: return saved payload
            return Response(order_or_body, status=status_code)

        order_data = OrderSerializer(order_or_body).data

        if idempotency_key:
            body_hash = hashlib.sha256(raw_body or b"").hexdigest()
            IdempotencyRecord.objects.create(
                key=idempotency_key,
                request_hash=body_hash,
                response_body=order_data,
                status_code=201,
            )

        return Response(order_data, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    """
    GET /api/orders/{order_number}/ - Order details or 404
    PUT /api/orders/{order_number}/ - Replaces all items. Allowed only while DRAFT.
    """
    def get(self, request, order_number):
        try:
            order = Order.objects.prefetch_related("items__product", "dealer").get(order_number=order_number)
        except Order.DoesNotExist:
            raise NotFoundCustomError(f"Order '{order_number}' not found.")

        return Response(OrderSerializer(order).data)

    def put(self, request, order_number):
        items = request.data.get("items")
        updated_order = services.update_draft_order(order_number, items)
        return Response(OrderSerializer(updated_order).data)


class OrderConfirmView(APIView):
    """
    POST /api/orders/{order_number}/confirm/ - DRAFT -> CONFIRMED
    """
    def post(self, request, order_number):
        order = services.confirm_order(order_number)
        return Response(OrderSerializer(order).data)


class OrderDispatchView(APIView):
    """
    POST /api/orders/{order_number}/dispatch/ - CONFIRMED -> DISPATCHED
    """
    def post(self, request, order_number):
        order = services.dispatch_order(order_number)
        return Response(OrderSerializer(order).data)


class OrderDeliverView(APIView):
    """
    POST /api/orders/{order_number}/deliver/ - DISPATCHED -> DELIVERED
    """
    def post(self, request, order_number):
        order = services.deliver_order(order_number)
        return Response(OrderSerializer(order).data)


class OrderCancelView(APIView):
    """
    POST /api/orders/{order_number}/cancel/ - Cancel DRAFT or CONFIRMED order
    """
    def post(self, request, order_number):
        order = services.cancel_order(order_number)
        return Response(OrderSerializer(order).data)
