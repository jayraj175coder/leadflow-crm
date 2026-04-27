from uuid import UUID

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BankAccount, Merchant
from .serializers import BankAccountSerializer, DashboardSerializer, MerchantSerializer, PayoutCreateSerializer, PayoutSerializer
from .services import (
    IdempotencyConflictError,
    InsufficientFundsError,
    MerchantHeaderError,
    get_merchant_by_external_id,
    initiate_payout,
)


def get_request_merchant(request) -> Merchant:
    merchant_external_id = request.headers.get("X-Merchant-External-Id")
    if not merchant_external_id:
        raise MerchantHeaderError("Missing X-Merchant-External-Id header.")
    return get_merchant_by_external_id(merchant_external_id)


class MerchantListView(APIView):
    def get(self, request):
        merchants = Merchant.objects.order_by("legal_name")
        return Response(MerchantSerializer(merchants, many=True).data)


class BankAccountListView(APIView):
    def get(self, request):
        try:
            merchant = get_request_merchant(request)
        except MerchantHeaderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        bank_accounts = BankAccount.objects.filter(merchant=merchant, is_active=True).order_by("id")
        return Response(BankAccountSerializer(bank_accounts, many=True).data)


class DashboardView(APIView):
    def get(self, request):
        try:
            merchant = get_request_merchant(request)
        except MerchantHeaderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(DashboardSerializer.build(merchant))


class PayoutListCreateView(APIView):
    def get(self, request):
        try:
            merchant = get_request_merchant(request)
        except MerchantHeaderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        payouts = merchant.payouts.select_related("bank_account").order_by("-created_at")[:20]
        return Response(PayoutSerializer(payouts, many=True).data)

    def post(self, request):
        try:
            merchant = get_request_merchant(request)
        except MerchantHeaderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        raw_key = request.headers.get("Idempotency-Key")
        if not raw_key:
            return Response({"detail": "Missing Idempotency-Key header."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            idempotency_key = UUID(raw_key)
        except ValueError:
            return Response({"detail": "Idempotency-Key must be a valid UUID."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PayoutCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            payout, created = initiate_payout(
                merchant_external_id=merchant.external_id,
                amount_paise=serializer.validated_data["amount_paise"],
                bank_account_id=serializer.validated_data["bank_account_id"],
                idempotency_key=idempotency_key,
            )
        except InsufficientFundsError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
        except IdempotencyConflictError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)

        return Response(PayoutSerializer(payout).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class PayoutDetailView(APIView):
    def get(self, request, payout_id):
        try:
            merchant = get_request_merchant(request)
        except MerchantHeaderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        payout = merchant.payouts.select_related("bank_account").filter(id=payout_id).first()
        if not payout:
            return Response({"detail": "Payout not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PayoutSerializer(payout).data)

