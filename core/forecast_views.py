import csv
import math
from collections import defaultdict
from pathlib import Path
from django.conf import settings
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from core.models import Inventory, Product
from core.exceptions import NotFoundCustomError


def _load_forecast_data():
    forecast_path = settings.BASE_DIR / "ml" / "forecast.csv"
    forecast_by_sku = defaultdict(list)
    if forecast_path.exists():
        with open(forecast_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                forecast_by_sku[row["sku"]].append({
                    "week_start": row["week_start"],
                    "forecast_units": float(row["forecast_units"])
                })
    return forecast_by_sku


def _load_lead_times():
    lead_path = settings.DATA_DIR / "lead_times.csv"
    lead_times = {}
    if lead_path.exists():
        with open(lead_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                lead_times[row["sku"]] = int(row["lead_time_weeks"])
    return lead_times


def _load_sales_sigma():
    sales_path = settings.DATA_DIR / "sales_history.csv"
    sku_sales = defaultdict(list)
    if sales_path.exists():
        with open(sales_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                sku_sales[row["sku"]].append({
                    "week_start": row["week_start"],
                    "units_sold": float(row["units_sold"])
                })

    sigmas = {}
    for sku, hist in sku_sales.items():
        hist.sort(key=lambda x: x["week_start"])
        recent = [x["units_sold"] for x in hist[-12:]]
        n = len(recent)
        if n > 1:
            mean = sum(recent) / n
            variance = sum((x - mean) ** 2 for x in recent) / (n - 1)
            sigma = math.sqrt(variance)
        else:
            sigma = 0.0
        sigmas[sku] = sigma
    return sigmas


class ForecastDetailView(APIView):
    """
    GET /api/forecast/{sku}/
    200 {"sku": "...", "forecast": [{"week_start": "2026-09-28", "forecast_units": 31.4}, ...]}
    """
    def get(self, request, sku):
        forecast_by_sku = _load_forecast_data()
        lead_times = _load_lead_times()

        if sku not in lead_times or sku not in forecast_by_sku:
            raise NotFoundCustomError(f"Forecast for SKU '{sku}' not found.")

        data = sorted(forecast_by_sku[sku], key=lambda x: x["week_start"])
        return Response({
            "sku": sku,
            "forecast": data
        })


class ReorderSuggestionsView(APIView):
    """
    GET /api/reorder-suggestions/
    200 {"results": [ ... ]} with 40 forecast SKUs and live stock calculation
    """
    def get(self, request):
        lead_times = _load_lead_times()
        forecast_by_sku = _load_forecast_data()
        sigmas = _load_sales_sigma()

        # Query live stocks
        target_skus = list(lead_times.keys())
        inventories = {
            inv.product_id: inv.quantity
            for inv in Inventory.objects.filter(product_id__in=target_skus)
        }

        results = []
        for sku, L in lead_times.items():
            current_stock = inventories.get(sku, 0)
            
            # First L weeks of forecast
            sku_forecast = sorted(forecast_by_sku.get(sku, []), key=lambda x: x["week_start"])
            lead_forecast_weeks = sku_forecast[:L]
            lead_time_demand = round(sum(w["forecast_units"] for w in lead_forecast_weeks), 1)

            # Sample sigma over last 12 weeks
            sigma = sigmas.get(sku, 0.0)
            safety_stock = math.ceil(1.65 * sigma * math.sqrt(L))
            reorder_point = round(lead_time_demand + safety_stock, 1)
            reorder_qty = max(0, math.ceil(reorder_point - current_stock))

            results.append({
                "sku": sku,
                "current_stock": current_stock,
                "lead_time_weeks": L,
                "lead_time_demand": lead_time_demand,
                "safety_stock": safety_stock,
                "reorder_point": reorder_point,
                "reorder_qty": reorder_qty
            })

        return Response({"results": results})

    def post(self, request):
        """
        POST /api/reorder-suggestions/
        Full Django backend procurement core:
        - Atomic transaction with row-level locking (select_for_update)
        - Deadlock prevention via deterministic SKU sorting
        - Re-evaluates exact safety stock formula SS = ceil(1.65 * sigma * sqrt(L))
        - Updates PostgreSQL Inventory state atomically
        """
        lead_times = _load_lead_times()
        forecast_by_sku = _load_forecast_data()
        sigmas = _load_sales_sigma()

        requested_skus = request.data.get("skus")
        if requested_skus and isinstance(requested_skus, list):
            target_skus = [s for s in requested_skus if s in lead_times]
        else:
            target_skus = list(lead_times.keys())

        target_skus = sorted(target_skus)

        with transaction.atomic():
            inv_qs = Inventory.objects.select_for_update().filter(product_id__in=target_skus)
            inv_map = {inv.product_id: inv for inv in inv_qs}

            procured = []
            total_units = 0

            for sku in target_skus:
                if sku not in inv_map:
                    continue
                inv = inv_map[sku]
                current_stock = inv.quantity
                L = lead_times[sku]

                sku_forecast = sorted(forecast_by_sku.get(sku, []), key=lambda x: x["week_start"])
                lead_forecast_weeks = sku_forecast[:L]
                lead_time_demand = round(sum(w["forecast_units"] for w in lead_forecast_weeks), 1)

                sigma = sigmas.get(sku, 0.0)
                safety_stock = math.ceil(1.65 * sigma * math.sqrt(L))
                reorder_point = round(lead_time_demand + safety_stock, 1)
                reorder_qty = max(0, math.ceil(reorder_point - current_stock))

                if reorder_qty > 0:
                    old_stock = inv.quantity
                    inv.quantity = old_stock + reorder_qty
                    inv.save(update_fields=["quantity", "updated_at"])
                    procured.append({
                        "sku": sku,
                        "reordered_units": reorder_qty,
                        "previous_stock": old_stock,
                        "new_stock": inv.quantity,
                        "reorder_point": reorder_point,
                    })
                    total_units += reorder_qty

        return Response({
            "status": "success",
            "message": f"Successfully procured {total_units} units across {len(procured)} SKUs via Django backend core.",
            "total_units_procured": total_units,
            "procured_count": len(procured),
            "procured_items": procured,
        }, status=status.HTTP_200_OK)
