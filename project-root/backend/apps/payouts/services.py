import hashlib
import json
from dataclasses import dataclass
from datetime import timedelta

from django.db import transaction
from django.db.models import BigIntegerField, Case, ExpressionWrapper, F, Sum, Value, When
from django.utils import timezone

from .models import BankAccount, LedgerEntry, Merchant, Payout


class PayoutError(Exception):
    pass


class MerchantHeaderError(PayoutError):
    pass


class InsufficientFundsError(PayoutError):
    pass


class IdempotencyConflictError(PayoutError):
    pass


@dataclass(frozen=True)
class BalanceSnapshot:
    available_balance_paise: int
    held_balance_paise: int
    ledger_balance_paise: int


NEGATIVE_AMOUNT = ExpressionWrapper(F("amount_paise") * Value(-1), output_field=BigIntegerField())
IDEMPOTENCY_TTL = timedelta(hours=24)


def build_request_fingerprint(*, amount_paise: int, bank_account_id: int) -> str:
    payload = json.dumps(
        {"amount_paise": amount_paise, "bank_account_id": bank_account_id},
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _balance_case(*, bucket: str | None = None) -> Case:
    filters = {}
    if bucket is not None:
        filters["bucket"] = bucket

    return Case(
        When(**filters, entry_type=LedgerEntry.EntryType.CREDIT, then=F("amount_paise")),
        When(**filters, entry_type=LedgerEntry.EntryType.DEBIT, then=NEGATIVE_AMOUNT),
        default=Value(0),
        output_field=BigIntegerField(),
    )


def get_bucket_balance(merchant: Merchant, bucket: str) -> int:
    total = LedgerEntry.objects.filter(merchant=merchant).aggregate(balance=Sum(_balance_case(bucket=bucket))).get("balance")
    return int(total or 0)


def get_balance_snapshot(merchant: Merchant) -> BalanceSnapshot:
    rows = LedgerEntry.objects.filter(merchant=merchant).aggregate(
        available_balance=Sum(_balance_case(bucket=LedgerEntry.Bucket.AVAILABLE)),
        held_balance=Sum(_balance_case(bucket=LedgerEntry.Bucket.HELD)),
        ledger_balance=Sum(_balance_case()),
    )
    return BalanceSnapshot(
        available_balance_paise=int(rows["available_balance"] or 0),
        held_balance_paise=int(rows["held_balance"] or 0),
        ledger_balance_paise=int(rows["ledger_balance"] or 0),
    )


def get_merchant_by_external_id(merchant_external_id: str) -> Merchant:
    try:
        return Merchant.objects.get(external_id=merchant_external_id)
    except Merchant.DoesNotExist as exc:
        raise MerchantHeaderError("Unknown merchant identifier.") from exc


def initiate_payout(*, merchant_external_id: str, amount_paise: int, bank_account_id: int, idempotency_key) -> tuple[Payout, bool]:
    fingerprint = build_request_fingerprint(amount_paise=amount_paise, bank_account_id=bank_account_id)
    idempotency_cutoff = timezone.now() - IDEMPOTENCY_TTL

    with transaction.atomic():
        merchant = Merchant.objects.select_for_update().get(external_id=merchant_external_id)
        bank_account = BankAccount.objects.select_related("merchant").get(
            id=bank_account_id,
            merchant=merchant,
            is_active=True,
        )

        existing = (
            Payout.objects.select_related("bank_account")
            .filter(
                merchant=merchant,
                idempotency_key=idempotency_key,
                created_at__gte=idempotency_cutoff,
            )
            .order_by("-created_at")
            .first()
        )
        if existing:
            if existing.request_fingerprint != fingerprint:
                raise IdempotencyConflictError("Idempotency key reuse with different request payload.")
            return existing, False

        available_balance = get_bucket_balance(merchant, LedgerEntry.Bucket.AVAILABLE)
        if available_balance < amount_paise:
            raise InsufficientFundsError("Insufficient available balance.")

        payout = Payout.objects.create(
            merchant=merchant,
            bank_account=bank_account,
            amount_paise=amount_paise,
            idempotency_key=idempotency_key,
            request_fingerprint=fingerprint,
            state=Payout.State.PENDING,
        )

        LedgerEntry.objects.bulk_create(
            [
                LedgerEntry(
                    merchant=merchant,
                    payout=payout,
                    bucket=LedgerEntry.Bucket.AVAILABLE,
                    entry_type=LedgerEntry.EntryType.DEBIT,
                    amount_paise=amount_paise,
                    reference="payout_hold_available",
                    description="Funds moved from available balance into hold.",
                ),
                LedgerEntry(
                    merchant=merchant,
                    payout=payout,
                    bucket=LedgerEntry.Bucket.HELD,
                    entry_type=LedgerEntry.EntryType.CREDIT,
                    amount_paise=amount_paise,
                    reference="payout_hold_held",
                    description="Funds reserved for payout execution.",
                ),
            ]
        )

        from .tasks import process_payout_task

        transaction.on_commit(lambda: process_payout_task.delay(str(payout.id)))
        return payout, True


def finalize_payout_success(payout_id) -> Payout:
    with transaction.atomic():
        payout = Payout.objects.select_for_update().select_related("merchant").get(id=payout_id)
        if payout.state == Payout.State.COMPLETED:
            return payout
        if payout.state != Payout.State.PROCESSING:
            raise PayoutError("Payout is not in processing state.")

        Merchant.objects.select_for_update().get(id=payout.merchant_id)
        payout.transition_to(Payout.State.COMPLETED)
        payout.save(update_fields=["state", "last_error", "processed_at", "next_retry_at", "updated_at"])

        LedgerEntry.objects.create(
            merchant=payout.merchant,
            payout=payout,
            bucket=LedgerEntry.Bucket.HELD,
            entry_type=LedgerEntry.EntryType.DEBIT,
            amount_paise=payout.amount_paise,
            reference="payout_complete_held_release",
            description="Held funds released as completed payout settlement.",
        )
        return payout


def finalize_payout_failure(payout_id, *, reason: str) -> Payout:
    with transaction.atomic():
        payout = Payout.objects.select_for_update().select_related("merchant").get(id=payout_id)
        if payout.state == Payout.State.FAILED:
            return payout
        if payout.state != Payout.State.PROCESSING:
            raise PayoutError("Payout is not in processing state.")

        Merchant.objects.select_for_update().get(id=payout.merchant_id)
        payout.transition_to(Payout.State.FAILED, error_message=reason)
        payout.save(update_fields=["state", "last_error", "processed_at", "next_retry_at", "updated_at"])

        LedgerEntry.objects.bulk_create(
            [
                LedgerEntry(
                    merchant=payout.merchant,
                    payout=payout,
                    bucket=LedgerEntry.Bucket.HELD,
                    entry_type=LedgerEntry.EntryType.DEBIT,
                    amount_paise=payout.amount_paise,
                    reference="payout_fail_held_release",
                    description="Held funds released after payout failure.",
                ),
                LedgerEntry(
                    merchant=payout.merchant,
                    payout=payout,
                    bucket=LedgerEntry.Bucket.AVAILABLE,
                    entry_type=LedgerEntry.EntryType.CREDIT,
                    amount_paise=payout.amount_paise,
                    reference="payout_fail_available_refund",
                    description="Funds returned to available balance after payout failure.",
                ),
            ]
        )
        return payout
