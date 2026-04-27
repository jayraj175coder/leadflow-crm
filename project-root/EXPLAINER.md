# Payout Engine Explainer

## 1. Ledger Query (SQL)

The ledger is append-only. Current balances are derived rather than stored.

```sql
SELECT
    COALESCE(SUM(
        CASE
            WHEN bucket = 'available' AND entry_type = 'credit' THEN amount_paise
            WHEN bucket = 'available' AND entry_type = 'debit' THEN -amount_paise
            ELSE 0
        END
    ), 0) AS available_balance_paise,
    COALESCE(SUM(
        CASE
            WHEN bucket = 'held' AND entry_type = 'credit' THEN amount_paise
            WHEN bucket = 'held' AND entry_type = 'debit' THEN -amount_paise
            ELSE 0
        END
    ), 0) AS held_balance_paise,
    COALESCE(SUM(
        CASE
            WHEN entry_type = 'credit' THEN amount_paise
            WHEN entry_type = 'debit' THEN -amount_paise
            ELSE 0
        END
    ), 0) AS ledger_balance_paise
FROM payouts_ledger_entry
WHERE merchant_id = %(merchant_id)s;
```

## 2. Concurrency Locking Explanation

The critical section is payout creation. The service locks the merchant row with `SELECT ... FOR UPDATE`, then computes the available balance and creates the hold entries inside the same transaction.

If balance is `100` paise and two concurrent payouts of `60` arrive:

1. Request A locks the merchant row.
2. Request A sees `100`, creates the payout, and moves `60` from available to held.
3. Request B waits.
4. Request B resumes and now sees only `40` available.
5. Request B fails with insufficient funds.

That is why the repository includes a `TransactionTestCase` proving only one request succeeds.

## 3. Idempotency Logic

The API requires an `Idempotency-Key` UUID. The backend stores a unique `(merchant, idempotency_key)` pair and hashes the request payload with SHA-256:

- `amount_paise`
- `bank_account_id`

Behavior:

1. Same key + same payload returns the original payout response.
2. Same key + different payload is rejected with `409 Conflict`.
3. New key creates a new payout and new hold entries.

This protects against duplicate client retries, load balancer retries, and accidental double submissions.

## 4. State Machine Validation

Allowed:

- `pending -> processing`
- `processing -> completed`
- `processing -> failed`

Blocked:

- `completed -> anything`
- `failed -> completed`

Validation lives in `apps/payouts/state_machine.py` and is enforced by `Payout.transition_to(...)`. The worker cannot move a payout from `failed` back to `completed`, and a terminal payout is ignored on repeat task delivery.

Retries for stuck payouts keep the payout in `processing`. The state does not reset to `pending`; only `retry_count`, `next_retry_at`, and `last_error` change.

## 5. AI Audit

### Wrong AI Code

```python
balance = sum(entry.amount_paise for entry in merchant.ledger_entries.all())
if balance >= request.data["amount_paise"]:
    Payout.objects.create(...)
```

Why it is wrong:

- Reads balances in Python instead of PostgreSQL.
- Ignores ledger bucket semantics.
- Has no transaction.
- Has no row lock.
- Allows concurrent overspending.

### Fixed Code

```python
with transaction.atomic():
    merchant = Merchant.objects.select_for_update().get(external_id=merchant_external_id)
    available_balance = get_bucket_balance(merchant, LedgerEntry.Bucket.AVAILABLE)
    if available_balance < amount_paise:
        raise InsufficientFundsError("Insufficient available balance.")

    payout = Payout.objects.create(...)
    LedgerEntry.objects.bulk_create([
        LedgerEntry(
            merchant=merchant,
            payout=payout,
            bucket=LedgerEntry.Bucket.AVAILABLE,
            entry_type=LedgerEntry.EntryType.DEBIT,
            amount_paise=amount_paise,
            reference="payout_hold_available",
        ),
        LedgerEntry(
            merchant=merchant,
            payout=payout,
            bucket=LedgerEntry.Bucket.HELD,
            entry_type=LedgerEntry.EntryType.CREDIT,
            amount_paise=amount_paise,
            reference="payout_hold_held",
        ),
    ])
```

Why the fix is correct:

- Uses one ACID transaction.
- Serializes competing payout requests per merchant.
- Derives balances with SQL aggregation.
- Writes money movement entries atomically with payout creation.

## 6. Refund Logic

On processor failure, the worker performs one atomic transaction that:

1. Locks the payout row.
2. Locks the merchant row.
3. Transitions `processing -> failed`.
4. Debits the held bucket.
5. Credits the available bucket.

That makes refund behavior safe even if the worker crashes or Celery redelivers the task later.

## 7. Frontend Status Updates

The React dashboard polls `/api/v1/dashboard/` every five seconds. That keeps payout states, held funds, and ledger history fresh without introducing websocket complexity into the assessment.

