from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Merchant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("external_id", models.CharField(max_length=64, unique=True)),
                ("legal_name", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="BankAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("bank_name", models.CharField(max_length=120)),
                ("account_holder_name", models.CharField(max_length=120)),
                ("account_number", models.CharField(max_length=32)),
                ("ifsc_code", models.CharField(max_length=16)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("merchant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bank_accounts", to="payouts.merchant")),
            ],
        ),
        migrations.CreateModel(
            name="Payout",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("amount_paise", models.BigIntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ("idempotency_key", models.UUIDField()),
                ("request_fingerprint", models.CharField(max_length=64)),
                ("state", models.CharField(choices=[("pending", "Pending"), ("processing", "Processing"), ("completed", "Completed"), ("failed", "Failed")], default="pending", max_length=16)),
                ("retry_count", models.PositiveSmallIntegerField(default=0)),
                ("next_retry_at", models.DateTimeField(blank=True, null=True)),
                ("last_error", models.CharField(blank=True, max_length=255)),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("bank_account", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payouts", to="payouts.bankaccount")),
                ("merchant", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payouts", to="payouts.merchant")),
            ],
        ),
        migrations.CreateModel(
            name="LedgerEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("bucket", models.CharField(choices=[("available", "Available"), ("held", "Held")], max_length=16)),
                ("entry_type", models.CharField(choices=[("credit", "Credit"), ("debit", "Debit")], max_length=16)),
                ("amount_paise", models.BigIntegerField(validators=[django.core.validators.MinValueValidator(1)])),
                ("reference", models.CharField(max_length=64)),
                ("description", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("merchant", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="ledger_entries", to="payouts.merchant")),
                ("payout", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="ledger_entries", to="payouts.payout")),
            ],
        ),
        migrations.AddIndex(
            model_name="payout",
            index=models.Index(fields=["merchant", "created_at"], name="payout_merchant_created_idx"),
        ),
        migrations.AddIndex(
            model_name="payout",
            index=models.Index(fields=["merchant", "idempotency_key", "created_at"], name="payout_idem_window_idx"),
        ),
        migrations.AddIndex(
            model_name="payout",
            index=models.Index(fields=["state", "next_retry_at"], name="payout_state_retry_idx"),
        ),
        migrations.AddIndex(
            model_name="ledgerentry",
            index=models.Index(fields=["merchant", "bucket", "created_at"], name="ledger_merchant_bucket_idx"),
        ),
    ]
