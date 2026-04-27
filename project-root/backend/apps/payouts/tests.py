import threading
import uuid
from datetime import timedelta

from django.db import close_old_connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import BankAccount, LedgerEntry, Merchant, Payout
from .services import InsufficientFundsError, get_balance_snapshot, initiate_payout


class IdempotencyApiTestCase(APITestCase):
    def setUp(self):
        self.merchant = Merchant.objects.create(external_id="MERCHANT_TEST", legal_name="Test Merchant")
        self.bank_account = BankAccount.objects.create(
            merchant=self.merchant,
            bank_name="Test Bank",
            account_holder_name="Test Merchant",
            account_number="1234567890",
            ifsc_code="TEST0001234",
        )
        LedgerEntry.objects.create(
            merchant=self.merchant,
            bucket=LedgerEntry.Bucket.AVAILABLE,
            entry_type=LedgerEntry.EntryType.CREDIT,
            amount_paise=10_000,
            reference="opening_funding",
            description="Test funding",
        )

    def test_same_idempotency_key_returns_same_payout(self):
        payload = {"amount_paise": 2_500, "bank_account_id": self.bank_account.id}
        idem_key = str(uuid.uuid4())
        headers = {
            "HTTP_X_MERCHANT_EXTERNAL_ID": self.merchant.external_id,
            "HTTP_IDEMPOTENCY_KEY": idem_key,
        }

        first = self.client.post("/api/v1/payouts/", payload, format="json", **headers)
        second = self.client.post("/api/v1/payouts/", payload, format="json", **headers)

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(Payout.objects.count(), 1)

    def test_idempotency_key_can_be_reused_after_24_hours(self):
        payout = Payout.objects.create(
            merchant=self.merchant,
            bank_account=self.bank_account,
            amount_paise=1_000,
            idempotency_key=uuid.UUID("11111111-1111-1111-1111-111111111111"),
            request_fingerprint="stale-fingerprint",
            state=Payout.State.COMPLETED,
        )
        Payout.objects.filter(id=payout.id).update(created_at=timezone.now() - timedelta(hours=25))

        fresh_payout, created = initiate_payout(
            merchant_external_id=self.merchant.external_id,
            amount_paise=2_500,
            bank_account_id=self.bank_account.id,
            idempotency_key=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        )

        self.assertTrue(created)
        self.assertNotEqual(fresh_payout.id, payout.id)
        self.assertEqual(Payout.objects.count(), 2)


class ConcurrencyTransactionTestCase(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.merchant = Merchant.objects.create(external_id="MERCHANT_CONCURRENCY", legal_name="Concurrency Merchant")
        self.bank_account = BankAccount.objects.create(
            merchant=self.merchant,
            bank_name="Concurrency Bank",
            account_holder_name="Concurrency Merchant",
            account_number="9999999999",
            ifsc_code="CONC0001234",
        )
        LedgerEntry.objects.create(
            merchant=self.merchant,
            bucket=LedgerEntry.Bucket.AVAILABLE,
            entry_type=LedgerEntry.EntryType.CREDIT,
            amount_paise=100,
            reference="opening_funding",
            description="Concurrency test funding",
        )

    def test_only_one_payout_succeeds_under_concurrency(self):
        barrier = threading.Barrier(2)
        results = []
        errors = []

        def worker():
            close_old_connections()
            barrier.wait()
            try:
                payout, created = initiate_payout(
                    merchant_external_id=self.merchant.external_id,
                    amount_paise=60,
                    bank_account_id=self.bank_account.id,
                    idempotency_key=uuid.uuid4(),
                )
                results.append((str(payout.id), created))
            except InsufficientFundsError as exc:
                errors.append(str(exc))
            finally:
                close_old_connections()

        threads = [threading.Thread(target=worker) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(len(results), 1)
        self.assertEqual(len(errors), 1)
        self.assertEqual(Payout.objects.count(), 1)

        snapshot = get_balance_snapshot(self.merchant)
        self.assertEqual(snapshot.available_balance_paise, 40)
        self.assertEqual(snapshot.held_balance_paise, 60)
        self.assertEqual(snapshot.ledger_balance_paise, 100)
