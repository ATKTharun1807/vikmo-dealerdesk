from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import JsonResponse
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from core.models import Dealer, Inventory, Product
from core.serializers import (
    DealerCreateSerializer,
    DealerSerializer,
    ProductCreateSerializer,
    ProductSerializer,
    ProductUpdateSerializer,
)
from core.exceptions import (
    CustomValidationError,
    DuplicateError,
    NotFoundCustomError,
)
from core.pagination import StandardResultsSetPagination


def health(request):
    """GET /api/health/ — polls service readiness."""
    return JsonResponse({"status": "ok"})


class ProductListCreateView(APIView):
    """
    GET /api/products/  - paginated list with search, category, vehicle filters
    POST /api/products/ - create product with stock 0
    """
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        queryset = Product.objects.select_related("inventory").all().order_by("sku")

        # Filters:
        # search: case-insensitive match on sku, name or brand
        search = request.query_params.get("search")
        if search:
            search = search.strip()
            queryset = queryset.filter(
                Q(sku__icontains=search)
                | Q(name__icontains=search)
                | Q(brand__icontains=search)
            )

        # category: exact
        category = request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category.strip())

        # vehicle: case-insensitive substring of vehicle_fitment
        vehicle = request.query_params.get("vehicle")
        if vehicle:
            queryset = queryset.filter(vehicle_fitment__icontains=vehicle.strip())

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ProductSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        data = request.data
        sku = data.get("sku")
        if not sku or not str(sku).strip():
            raise CustomValidationError("SKU is required.")

        sku = str(sku).strip()
        if Product.objects.filter(sku=sku).exists():
            raise DuplicateError(f"Product with SKU '{sku}' already exists.")

        serializer = ProductCreateSerializer(data=data)
        if not serializer.is_valid():
            raise CustomValidationError(
                message="Invalid product details.",
                details=[f"{k}: {v[0]}" for k, v in serializer.errors.items()],
            )

        with transaction.atomic():
            product = serializer.save()
            Inventory.objects.create(product=product, quantity=0)

        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)


class ProductDetailView(APIView):
    """
    GET /api/products/{sku}/   - get product details
    PATCH /api/products/{sku}/ - partial update
    """
    def get_object(self, sku):
        try:
            return Product.objects.select_related("inventory").get(sku=sku)
        except Product.DoesNotExist:
            raise NotFoundCustomError(f"Product with SKU '{sku}' not found.")

    def get(self, request, sku):
        product = self.get_object(sku)
        return Response(ProductSerializer(product).data)

    def patch(self, request, sku):
        product = self.get_object(sku)
        data = request.data.copy()

        # SKU cannot be changed
        if "sku" in data and data["sku"] != sku:
            raise CustomValidationError("Product SKU cannot be changed.")

        serializer = ProductUpdateSerializer(product, data=data, partial=True)
        if not serializer.is_valid():
            raise CustomValidationError(
                message="Invalid update details.",
                details=[f"{k}: {v[0]}" for k, v in serializer.errors.items()],
            )

        updated_product = serializer.save()
        return Response(ProductSerializer(updated_product).data)


class InventoryUpdateView(APIView):
    """
    PUT /api/inventory/{sku}/ - sets the available quantity to exactly this value.
    Body: {"quantity": 25, "reason": "stock count correction"}
    """
    def put(self, request, sku):
        try:
            product = Product.objects.get(sku=sku)
        except Product.DoesNotExist:
            raise NotFoundCustomError(f"Product with SKU '{sku}' not found.")

        data = request.data
        if "quantity" not in data:
            raise CustomValidationError("quantity is required.")

        try:
            quantity = int(data["quantity"])
            if quantity < 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise CustomValidationError("quantity must be an integer >= 0.")

        with transaction.atomic():
            inventory, _ = Inventory.objects.select_for_update().get_or_create(
                product=product,
                defaults={"quantity": quantity}
            )
            inventory.quantity = quantity
            inventory.save(update_fields=["quantity", "updated_at"])

        return Response({"sku": sku, "quantity": quantity}, status=status.HTTP_200_OK)


class DealerListCreateView(APIView):
    """
    GET /api/dealers/  - paginated list of dealers
    POST /api/dealers/ - create new dealer
    """
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        queryset = Dealer.objects.all().order_by("id")
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = DealerSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        data = request.data
        dealer_code = data.get("dealer_code")
        if not dealer_code or not str(dealer_code).strip():
            raise CustomValidationError("dealer_code is required.")

        dealer_code = str(dealer_code).strip()
        if Dealer.objects.filter(dealer_code=dealer_code).exists():
            raise DuplicateError(f"Dealer with dealer_code '{dealer_code}' already exists.")

        serializer = DealerCreateSerializer(data=data)
        if not serializer.is_valid():
            raise CustomValidationError(
                message="Invalid dealer details.",
                details=[f"{k}: {v[0]}" for k, v in serializer.errors.items()],
            )

        dealer = serializer.save()
        return Response(DealerSerializer(dealer).data, status=status.HTTP_201_CREATED)


class DealerDetailView(APIView):
    """
    GET /api/dealers/{id}/ - single dealer
    """
    def get(self, request, pk):
        try:
            dealer = Dealer.objects.get(id=pk)
        except Dealer.DoesNotExist:
            raise NotFoundCustomError(f"Dealer with ID {pk} not found.")

        return Response(DealerSerializer(dealer).data)


class SupplierSyncView(APIView):
    """
    POST /api/sync/supplier/ - Sync supplier catalogue into DealerDesk
    """
    def post(self, request):
        from core.supplier_sync import sync_supplier_catalogue
        result = sync_supplier_catalogue()
        return Response(result, status=status.HTTP_200_OK)
