from django.urls import path

from .views import BankAccountListView, DashboardView, MerchantListView, PayoutDetailView, PayoutListCreateView

urlpatterns = [
    path("merchants/", MerchantListView.as_view(), name="merchant-list"),
    path("bank-accounts/", BankAccountListView.as_view(), name="bank-account-list"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("payouts/", PayoutListCreateView.as_view(), name="payout-list-create"),
    path("payouts/<uuid:payout_id>/", PayoutDetailView.as_view(), name="payout-detail"),
]

