import csv
from decimal import Decimal
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import Dealer, Inventory, Order, OrderItem, Product


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
            OrderItem.objects.all().delete()
            Order.objects.all().delete()

            # 1. Dealers
            dealers_to_upsert = []
            valid_dealer_codes = set()
            with open(dealers_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    code = row["dealer_code"].strip()
                    valid_dealer_codes.add(code)
                    dealers_to_upsert.append(
                        Dealer(
                            dealer_code=code,
                            name=row.get("name", "").strip(),
                            city=row.get("city", "").strip(),
                            phone=row.get("phone", "").strip(),
                            email=row.get("email", "").strip(),
                            gstin=row.get("gstin", "").strip(),
                            credit_limit=Decimal(row.get("credit_limit", "0.00").strip() or "0.00"),
                        )
                    )

            Dealer.objects.bulk_create(
                dealers_to_upsert,
                update_conflicts=True,
                update_fields=["name", "city", "phone", "email", "gstin", "credit_limit"],
                unique_fields=["dealer_code"],
            )
            Dealer.objects.exclude(dealer_code__in=valid_dealer_codes).delete()

            # 2. Catalogue & Inventory
            products_to_upsert = []
            inventories_to_upsert = []
            valid_skus = set()
            with open(catalogue_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    sku = row["sku"].strip()
                    valid_skus.add(sku)
                    price = Decimal(row["price"].strip())
                    stock_qty = int(row["stock"].strip())

                    p = Product(
                        sku=sku,
                        name=row["name"].strip(),
                        category=row["category"].strip(),
                        brand=row["brand"].strip(),
                        vehicle_fitment=row["vehicle_fitment"].strip(),
                        price=price,
                        description=row.get("description", "").strip(),
                    )
                    products_to_upsert.append(p)
                    inventories_to_upsert.append(Inventory(product=p, quantity=stock_qty))

            Product.objects.bulk_create(
                products_to_upsert,
                update_conflicts=True,
                update_fields=["name", "category", "brand", "vehicle_fitment", "price", "description"],
                unique_fields=["sku"],
            )

            Inventory.objects.bulk_create(
                inventories_to_upsert,
                update_conflicts=True,
                update_fields=["quantity"],
                unique_fields=["product"],
            )

            extra_products = Product.objects.exclude(sku__in=valid_skus)
            Inventory.objects.filter(product__in=extra_products).delete()
            extra_products.delete()

        total_dealers = Dealer.objects.count()
        total_products = Product.objects.count()
        total_inventory = Inventory.objects.count()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded! Dealers: {total_dealers}, Products: {total_products}, Inventory: {total_inventory}"
            )
        )
