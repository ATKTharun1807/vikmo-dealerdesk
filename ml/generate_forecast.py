import csv
import math
import os
from collections import defaultdict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
ML_DIR = BASE_DIR / "ml"

def generate_forecast():
    lead_times_file = DATA_DIR / "lead_times.csv"
    sales_history_file = DATA_DIR / "sales_history.csv"
    promo_calendar_file = DATA_DIR / "promo_calendar.csv"
    forecast_output = ML_DIR / "forecast.csv"

    # Read target SKUs
    target_skus = []
    with open(lead_times_file, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            target_skus.append(row["sku"])

    # Read promos
    promos = defaultdict(lambda: 0)
    with open(promo_calendar_file, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            promos[(row["sku"], row["week_start"])] = int(row.get("promo_flag", 0))

    # Read sales history
    sku_history = defaultdict(list)
    with open(sales_history_file, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sku = row["sku"]
            if sku in target_skus:
                sku_history[sku].append({
                    "week_start": row["week_start"],
                    "units_sold": float(row["units_sold"]),
                    "promo_flag": int(row.get("promo_flag", 0))
                })

    forecast_weeks = ["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"]

    rows = []
    for sku in target_skus:
        history = sku_history.get(sku, [])
        if history:
            # Sort by week_start
            history.sort(key=lambda x: x["week_start"])
            recent_12 = history[-12:]
            
            # Baseline non-promo average
            non_promo_sales = [x["units_sold"] for x in recent_12 if x["promo_flag"] == 0]
            promo_sales = [x["units_sold"] for x in recent_12 if x["promo_flag"] == 1]
            
            baseline = sum(non_promo_sales) / len(non_promo_sales) if non_promo_sales else (sum(x["units_sold"] for x in recent_12) / len(recent_12))
            promo_multiplier = (sum(promo_sales) / len(promo_sales) / max(baseline, 1)) if promo_sales and baseline > 0 else 1.35
            if promo_multiplier < 1.1:
                promo_multiplier = 1.25
        else:
            baseline = 20.0
            promo_multiplier = 1.3

        for week in forecast_weeks:
            is_promo = promos.get((sku, week), 0)
            lift = promo_multiplier if is_promo else 1.0
            
            # Slight seasonal bump for October festival ramp-up (weeks 2, 3, 4)
            seasonal_lift = 1.0
            if week == "2026-10-12":
                seasonal_lift = 1.08
            elif week == "2026-10-19":
                seasonal_lift = 1.15
                
            pred = round(max(0.0, baseline * lift * seasonal_lift), 1)
            rows.append({
                "sku": sku,
                "week_start": week,
                "forecast_units": pred
            })

    # Write output
    ML_DIR.mkdir(parents=True, exist_ok=True)
    with open(forecast_output, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["sku", "week_start", "forecast_units"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Generated {len(rows)} forecast rows in {forecast_output}")

if __name__ == "__main__":
    generate_forecast()
