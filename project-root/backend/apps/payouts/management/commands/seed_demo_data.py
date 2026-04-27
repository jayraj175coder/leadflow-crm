from django.core.management.base import BaseCommand
from django.db import transaction

from apps.payouts.models import BankAccount, LedgerEntry, Merchant


DEMO_MERCHANTS = [
    {
        "external_id": "MERCHANT_ALPHA",
        "legal_name": "Alpha Digital Services Pvt Ltd",
        "funding_paise": 500_000,
        "bank_accounts": [
            {
                "bank_name": "HDFC Bank",
                "account_holder_name": "Alpha Digital Services Pvt Ltd",
                "account_number": "000123450001",
                "ifsc_code": "HDFC0001234",
            }
        ],
    },
    {
        "external_id": "MERCHANT_BETA",
        "legal_name": "Beta Marketplace Private Limited",
        "funding_paise": 350_000,
        "bank_accounts": [
            {
                "bank_name": "ICICI Bank",
                "account_holder_name": "Beta Marketplace Private Limited",
                "account_number": "000123450002",
                "ifsc_code": "ICIC0004321",
            }
        ],
    },
    {
        "external_id": "MERCHANT_GAMMA",
        "legal_name": "Gamma Retail Technologies LLP",
        "funding_paise": 700_000,
        "bank_accounts": [
            {
                "bank_name": "Axis Bank",
                "account_holder_name": "Gamma Retail Technologies LLP",
                "account_number": "000123450003",
                "ifsc_code": "UTIB0009876",
            }
        ],
    },
]


class Command(BaseCommand):
    help = "Seed demo merchants, bank accounts, and opening ledger balances."

    @transaction.atomic
    def handle(self, *args, **options):
        for merchant_data in DEMO_MERCHANTS:
            merchant, _ = Merchant.objects.get_or_create(
                external_id=merchant_data["external_id"],
                defaults={"legal_name": merchant_data["legal_name"]},
            )

            if merchant.legal_name != merchant_data["legal_name"]:
                merchant.legal_name = merchant_data["legal_name"]
                merchant.save(update_fields=["legal_name"])

            for account in merchant_data["bank_accounts"]:
                BankAccount.objects.get_or_create(
                    merchant=merchant,
                    account_number=account["account_number"],
                    defaults={
                        "bank_name": account["bank_name"],
                        "account_holder_name": account["account_holder_name"],
                        "ifsc_code": account["ifsc_code"],
                        "is_active": True,
                    },
                )

            if not merchant.ledger_entries.filter(reference="opening_funding").exists():
                LedgerEntry.objects.create(
                    merchant=merchant,
                    bucket=LedgerEntry.Bucket.AVAILABLE,
                    entry_type=LedgerEntry.EntryType.CREDIT,
                    amount_paise=merchant_data["funding_paise"],
                    reference="opening_funding",
                    description="Seeded opening balance for demo merchant.",
                )

        self.stdout.write(self.style.SUCCESS("Demo merchants and balances seeded successfully."))

