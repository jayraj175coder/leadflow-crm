from rest_framework import serializers

from .models import BankAccount, LedgerEntry, Merchant, Payout
from .services import get_balance_snapshot


class BankAccountSerializer(serializers.ModelSerializer):
    masked_account_number = serializers.SerializerMethodField()

    class Meta:
        model = BankAccount
        fields = [
            "id",
            "bank_name",
            "account_holder_name",
            "ifsc_code",
            "masked_account_number",
        ]

    def get_masked_account_number(self, obj: BankAccount) -> str:
        return f"XXXXXX{obj.account_number[-4:]}"


class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = ["external_id", "legal_name"]


class LedgerEntrySerializer(serializers.ModelSerializer):
    payout_id = serializers.UUIDField(allow_null=True, read_only=True)

    class Meta:
        model = LedgerEntry
        fields = [
            "id",
            "payout_id",
            "bucket",
            "entry_type",
            "amount_paise",
            "reference",
            "description",
            "created_at",
        ]


class PayoutSerializer(serializers.ModelSerializer):
    bank_account = BankAccountSerializer(read_only=True)

    class Meta:
        model = Payout
        fields = [
            "id",
            "amount_paise",
            "state",
            "retry_count",
            "last_error",
            "next_retry_at",
            "processed_at",
            "created_at",
            "bank_account",
        ]


class PayoutCreateSerializer(serializers.Serializer):
    amount_paise = serializers.IntegerField(min_value=1)
    bank_account_id = serializers.IntegerField(min_value=1)


class DashboardSerializer(serializers.Serializer):
    merchant = MerchantSerializer()
    available_balance_paise = serializers.IntegerField()
    held_balance_paise = serializers.IntegerField()
    ledger_balance_paise = serializers.IntegerField()
    bank_accounts = BankAccountSerializer(many=True)
    recent_payouts = PayoutSerializer(many=True)
    recent_transactions = LedgerEntrySerializer(many=True)

    @classmethod
    def build(cls, merchant: Merchant):
        snapshot = get_balance_snapshot(merchant)
        return {
            "merchant": MerchantSerializer(merchant).data,
            "available_balance_paise": snapshot.available_balance_paise,
            "held_balance_paise": snapshot.held_balance_paise,
            "ledger_balance_paise": snapshot.ledger_balance_paise,
            "bank_accounts": BankAccountSerializer(merchant.bank_accounts.filter(is_active=True), many=True).data,
            "recent_payouts": PayoutSerializer(merchant.payouts.select_related("bank_account").order_by("-created_at")[:10], many=True).data,
            "recent_transactions": LedgerEntrySerializer(merchant.ledger_entries.order_by("-created_at")[:20], many=True).data,
        }
