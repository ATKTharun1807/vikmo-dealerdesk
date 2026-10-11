import csv
from decimal import Decimal
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import Dealer, Inventory, Product


class Command(BaseCommand):
    help = "Load data/catalogue.csv and data/dealers.csv into PostgreSQL. Idempotent: safe to run multiple times."

    def handle(self, *args, **options):
        data_dir = settings.DATA_DIR
        catalogue_path = data_dir / "catalogue.csv"
        dealers_path = data_dir / "dealers.csv"

        if not catalogue_path.exists():
            self.stdout.write(self.style.ERROR(f"Catalogue file not found at {catalogue_path}"))
            return
        if not dealers_path.exists():
            self.stdout.write(self.style.ERROR(f"Dealers file not found at {dealers_path}"))
            return

        with transaction.atomic():
            # 1. Seed Dealers
            dealers_count = 0
            with open(dealers_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    Dealer.objects.update_or_create(
                        dealer_code=row["dealer_code"].strip(),
                        defaults={
                            "name": row.get("name", "").strip(),
                            "city": row.get("city", "").strip(),
                            "phone": row.get("phone", "").strip(),
                            "email": row.get("email", "").strip(),
                            "gstin": row.get("gstin", "").strip(),
                            "credit_limit": Decimal(row.get("credit_limit", "0.00").strip() or "0.00"),
                        }
                    )
                    dealers_count += 1

            # 2. Seed Catalogue and Starting Inventory
            products_count = 0
            with open(catalogue_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    sku = row["sku"].strip()
                    price = Decimal(row["price"].strip())
                    stock_qty = int(row["stock"].strip())

                    product, _ = Product.objects.update_or_create(
                        sku=sku,
                        defaults={
                            "name": row["name"].strip(),
                            "category": row["category"].strip(),
                            "brand": row["brand"].strip(),
                            "vehicle_fitment": row["vehicle_fitment"].strip(),
                            "price": price,
                            "description": row.get("description", "").strip(),
                        }
                    )

                    Inventory.objects.update_or_create(
                        product=product,
                        defaults={
                            "quantity": stock_qty
                        }
                    )
                    products_count += 1

        total_dealers = Dealer.objects.count()
        total_products = Product.objects.count()
        total_inventory = Inventory.objects.count()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded! Dealers: {total_dealers}, Products: {total_products}, Inventory: {total_inventory}"
            )
        )
