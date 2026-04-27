import uuid

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from .state_machine import validate_transition


class Merchant(models.Model):
    external_id = models.CharField(max_length=64, unique=True)
    legal_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.external_id} - {self.legal_name}"


class BankAccount(models.Model):
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name="bank_accounts")
    bank_name = models.CharField(max_length=120)
    account_holder_name = models.CharField(max_length=120)
    account_number = models.CharField(max_length=32)
    ifsc_code = models.CharField(max_length=16)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.bank_name} - {self.account_number[-4:]}"


class Payout(models.Model):
    class State(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.ForeignKey(Merchant, on_delete=models.PROTECT, related_name="payouts")
    bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name="payouts")
    amount_paise = models.BigIntegerField(validators=[MinValueValidator(1)])
    idempotency_key = models.UUIDField()
    request_fingerprint = models.CharField(max_length=64)
    state = models.CharField(max_length=16, choices=State.choices, default=State.PENDING)
    retry_count = models.PositiveSmallIntegerField(default=0)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=255, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["merchant", "created_at"]),
            models.Index(fields=["merchant", "idempotency_key", "created_at"]),
            models.Index(fields=["state", "next_retry_at"]),
        ]

    def transition_to(self, next_state: str, *, error_message: str = "") -> None:
        validate_transition(self.state, next_state)
        self.state = next_state
        self.last_error = error_message
        if next_state in {self.State.COMPLETED, self.State.FAILED}:
            self.processed_at = timezone.now()
            self.next_retry_at = None

    def __str__(self) -> str:
        return f"{self.id} ({self.state})"


class LedgerEntry(models.Model):
    class Bucket(models.TextChoices):
        AVAILABLE = "available", "Available"
        HELD = "held", "Held"

    class EntryType(models.TextChoices):
        CREDIT = "credit", "Credit"
        DEBIT = "debit", "Debit"

    merchant = models.ForeignKey(Merchant, on_delete=models.PROTECT, related_name="ledger_entries")
    payout = models.ForeignKey(Payout, on_delete=models.PROTECT, null=True, blank=True, related_name="ledger_entries")
    bucket = models.CharField(max_length=16, choices=Bucket.choices)
    entry_type = models.CharField(max_length=16, choices=EntryType.choices)
    amount_paise = models.BigIntegerField(validators=[MinValueValidator(1)])
    reference = models.CharField(max_length=64)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["merchant", "bucket", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.merchant.external_id} {self.bucket} {self.entry_type} {self.amount_paise}"
