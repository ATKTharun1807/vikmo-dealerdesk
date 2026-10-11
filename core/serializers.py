import re
from decimal import Decimal
from rest_framework import serializers
from core.models import Dealer, Inventory, Product
from core.exceptions import CustomValidationError


MONEY_PATTERN = re.compile(r"^\d+(\.\d{1,2})?$")


class ProductSerializer(serializers.ModelSerializer):
    price = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "sku",
            "name",
            "category",
            "brand",
            "vehicle_fitment",
            "price",
            "stock",
            "description",
        ]

    def get_price(self, obj):
        return f"{obj.price:.2f}"

    def get_stock(self, obj):
        if hasattr(obj, "inventory"):
            return obj.inventory.quantity
        return 0


class ProductCreateSerializer(serializers.ModelSerializer):
    price = serializers.CharField()

    class Meta:
        model = Product
        fields = [
            "sku",
            "name",
            "category",
            "brand",
            "vehicle_fitment",
            "price",
            "description",
        ]

    def validate_sku(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("SKU cannot be empty.")
        return val

    def validate_price(self, value):
        val_str = str(value).strip()
        if not MONEY_PATTERN.match(val_str):
            raise serializers.ValidationError("Price must be a positive number with at most 2 decimal places.")
        try:
            d = Decimal(val_str)
            if d <= Decimal("0.00"):
                raise serializers.ValidationError("Price must be greater than 0.")
            return d
        except Exception:
            raise serializers.ValidationError("Invalid price format.")


class ProductUpdateSerializer(serializers.ModelSerializer):
    price = serializers.CharField(required=False)

    class Meta:
        model = Product
        fields = [
            "name",
            "category",
            "brand",
            "vehicle_fitment",
            "price",
            "description",
        ]

    def validate_price(self, value):
        if value is None:
            return value
        val_str = str(value).strip()
        if not MONEY_PATTERN.match(val_str):
            raise serializers.ValidationError("Price must be a positive number with at most 2 decimal places.")
        try:
            d = Decimal(val_str)
            if d <= Decimal("0.00"):
                raise serializers.ValidationError("Price must be greater than 0.")
            return d
        except Exception:
            raise serializers.ValidationError("Invalid price format.")


class DealerSerializer(serializers.ModelSerializer):
    credit_limit = serializers.SerializerMethodField()

    class Meta:
        model = Dealer
        fields = [
            "id",
            "dealer_code",
            "name",
            "city",
            "phone",
            "email",
            "gstin",
            "credit_limit",
        ]

    def get_credit_limit(self, obj):
        return f"{obj.credit_limit:.2f}"


class DealerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dealer
        fields = [
            "dealer_code",
            "name",
            "city",
            "phone",
            "email",
            "gstin",
            "credit_limit",
        ]
        extra_kwargs = {
            "dealer_code": {"required": True},
            "name": {"required": True},
        }

    def validate_dealer_code(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("dealer_code cannot be empty.")
        return val
