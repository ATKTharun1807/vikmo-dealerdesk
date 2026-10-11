import threading
from decimal import Decimal
from django.test import TestCase, TransactionTestCase
from core.models import Dealer, Inventory, Order, OrderItem, Product
from orders import services
from core.exceptions import (
    InsufficientStockError,
    InvalidTransitionError,
    OrderLockedError,
    IdempotencyConflictError,
)


class OrderEngineUnitTests(TestCase):
    def setUp(self):
        self.dealer = Dealer.objects.create(
            dealer_code="DLR-TEST-01",
            name="Test Dealer 1",
            city="Bengaluru",
            credit_limit=Decimal("50000.00"),
        )
        self.product1 = Product.objects.create(
            sku="TEST-BRK-01",
            name="Test Brake Pad",
            category="Brakes",
            brand="Brembo",
            vehicle_fitment="Duke 390",
            price=Decimal("1459.50"),
        )
        self.inventory1 = Inventory.objects.create(
            product=self.product1,
            quantity=10,
        )

    def test_gst_calculation_and_rounding(self):
        """
        Verify 18% GST calculation per line with ROUND_HALF_UP.
        Price: 1459.50, Qty: 3 -> Subtotal: 4378.50, Tax: 788.13, Total: 5166.63
        """
        subtotal, tax, total = services.calculate_line(Decimal("1459.50"), 3)
        self.assertEqual(subtotal, Decimal("4378.50"))
        self.assertEqual(tax, Decimal("788.13"))
        self.assertEqual(total, Decimal("5166.63"))

    def test_create_draft_order_does_not_touch_stock(self):
        order, status_code, is_new = services.create_draft_order(
            dealer_id=self.dealer.id,
            items_data=[{"sku": self.product1.sku, "quantity": 5}],
        )
        self.assertEqual(order.status, Order.Status.DRAFT)
        self.assertEqual(self.inventory1.quantity, 10)
        self.inventory1.refresh_from_db()
        self.assertEqual(self.inventory1.quantity, 10)

    def test_confirm_order_deducts_stock(self):
        order, _, _ = services.create_draft_order(
            dealer_id=self.dealer.id,
            items_data=[{"sku": self.product1.sku, "quantity": 4}],
        )
        confirmed_order = services.confirm_order(order.order_number)
        self.assertEqual(confirmed_order.status, Order.Status.CONFIRMED)
        self.inventory1.refresh_from_db()
        self.assertEqual(self.inventory1.quantity, 6)

    def test_confirm_order_insufficient_stock_fails(self):
        order, _, _ = services.create_draft_order(
            dealer_id=self.dealer.id,
            items_data=[{"sku": self.product1.sku, "quantity": 15}],
        )
        with self.assertRaises(InsufficientStockError):
            services.confirm_order(order.order_number)
        # Stock untouched
        self.inventory1.refresh_from_db()
        self.assertEqual(self.inventory1.quantity, 10)

    def test_cancel_confirmed_order_restores_stock_once(self):
        order, _, _ = services.create_draft_order(
            dealer_id=self.dealer.id,
            items_data=[{"sku": self.product1.sku, "quantity": 4}],
        )
        services.confirm_order(order.order_number)
        self.inventory1.refresh_from_db()
        self.assertEqual(self.inventory1.quantity, 6)

        services.cancel_order(order.order_number)
        self.inventory1.refresh_from_db()
        self.assertEqual(self.inventory1.quantity, 10)

        # Repeated cancel must fail with INVALID_TRANSITION and never restore stock again
        with self.assertRaises(InvalidTransitionError):
            services.cancel_order(order.order_number)
        self.inventory1.refresh_from_db()
        self.assertEqual(self.inventory1.quantity, 10)

    def test_order_status_state_machine(self):
        order, _, _ = services.create_draft_order(
            dealer_id=self.dealer.id,
            items_data=[{"sku": self.product1.sku, "quantity": 1}],
        )
        # DRAFT cannot be directly dispatched
        with self.assertRaises(InvalidTransitionError):
            services.dispatch_order(order.order_number)

        # Confirm -> Dispatch -> Deliver
        services.confirm_order(order.order_number)
        services.dispatch_order(order.order_number)
        services.deliver_order(order.order_number)

        # Delivered order cannot be cancelled
        with self.assertRaises(InvalidTransitionError):
            services.cancel_order(order.order_number)


class ConcurrencyAndIdempotencyTests(TransactionTestCase):
    def setUp(self):
        self.dealer = Dealer.objects.create(
            dealer_code="DLR-CONC-01",
            name="Concurrent Dealer",
            credit_limit=Decimal("100000.00"),
        )
        self.product = Product.objects.create(
            sku="CONC-SKU-01",
            name="Limited Edition Part",
            category="Engine",
            brand="Bosch",
            vehicle_fitment="Universal",
            price=Decimal("100.00"),
        )
        self.inventory = Inventory.objects.create(
            product=self.product,
            quantity=1,  # Only 1 unit available!
        )

    def test_concurrent_confirms_never_oversell(self):
        """
        Two orders created for the last unit. Both threads try to confirm simultaneously.
        Exactly one must succeed, one must fail with InsufficientStockError.
        Stock must never drop below 0.
        """
        order1, _, _ = services.create_draft_order(
            dealer_id=self.dealer.id,
            items_data=[{"sku": self.product.sku, "quantity": 1}],
        )
        order2, _, _ = services.create_draft_order(
            dealer_id=self.dealer.id,
            items_data=[{"sku": self.product.sku, "quantity": 1}],
        )

        results = []

        def try_confirm(ord_num):
            try:
                services.confirm_order(ord_num)
                results.append("SUCCESS")
            except InsufficientStockError:
                results.append("INSUFFICIENT_STOCK")

        t1 = threading.Thread(target=try_confirm, args=(order1.order_number,))
        t2 = threading.Thread(target=try_confirm, args=(order2.order_number,))

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        self.assertIn("SUCCESS", results)
        self.assertIn("INSUFFICIENT_STOCK", results)

        self.inventory.refresh_from_db()
        self.assertEqual(self.inventory.quantity, 0)
