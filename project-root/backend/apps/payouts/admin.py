from django.contrib import admin

from .models import BankAccount, LedgerEntry, Merchant, Payout


@admin.register(Merchant)
class MerchantAdmin(admin.ModelAdmin):
    list_display = ("external_id", "legal_name", "created_at")
    search_fields = ("external_id", "legal_name")


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ("merchant", "bank_name", "account_number", "ifsc_code", "is_active")
    list_filter = ("is_active", "bank_name")


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ("id", "merchant", "amount_paise", "state", "retry_count", "created_at", "processed_at")
    list_filter = ("state",)
    search_fields = ("merchant__external_id",)


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ("merchant", "bucket", "entry_type", "amount_paise", "reference", "created_at")
    list_filter = ("bucket", "entry_type", "reference")
    search_fields = ("merchant__external_id", "reference")

