from datetime import timedelta
import random

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .models import Payout
from .services import PayoutError, finalize_payout_failure, finalize_payout_success

BASE_RETRY_DELAY_SECONDS = 30
MAX_RETRIES = 3


def choose_outcome() -> str:
    return random.choices(["success", "failed", "stuck"], weights=[70, 20, 10], k=1)[0]


@shared_task(bind=True, name="apps.payouts.process_payout_task")
def process_payout_task(self, payout_id: str):
    with transaction.atomic():
        payout = Payout.objects.select_for_update().get(id=payout_id)

        if payout.state in {Payout.State.COMPLETED, Payout.State.FAILED}:
            return {"payout_id": payout_id, "state": payout.state, "message": "Already terminal."}

        if payout.state == Payout.State.PENDING:
            payout.transition_to(Payout.State.PROCESSING)
            payout.next_retry_at = None
            payout.save(update_fields=["state", "next_retry_at", "last_error", "processed_at", "updated_at"])
        elif payout.state == Payout.State.PROCESSING:
            if payout.next_retry_at and payout.next_retry_at > timezone.now():
                return {"payout_id": payout_id, "state": payout.state, "message": "Retry not due yet."}
            payout.next_retry_at = None
            payout.save(update_fields=["next_retry_at", "updated_at"])
        else:
            raise PayoutError("Unexpected payout state.")

    outcome = choose_outcome()
    if outcome == "success":
        payout = finalize_payout_success(payout_id)
        return {"payout_id": str(payout.id), "state": payout.state}

    if outcome == "failed":
        payout = finalize_payout_failure(payout_id, reason="processor_rejected")
        return {"payout_id": str(payout.id), "state": payout.state}

    force_failure = False
    with transaction.atomic():
        payout = Payout.objects.select_for_update().get(id=payout_id)
        if payout.state != Payout.State.PROCESSING:
            return {"payout_id": payout_id, "state": payout.state, "message": "State changed before retry scheduling."}

        if payout.retry_count >= MAX_RETRIES:
            force_failure = True
        else:
            payout.retry_count += 1
            delay_seconds = BASE_RETRY_DELAY_SECONDS * (2 ** (payout.retry_count - 1))
            payout.next_retry_at = timezone.now() + timedelta(seconds=delay_seconds)
            payout.last_error = "processor_timeout"
            payout.save(update_fields=["retry_count", "next_retry_at", "last_error", "updated_at"])
            transaction.on_commit(lambda: process_payout_task.apply_async(args=[payout_id], countdown=delay_seconds))

    if force_failure:
        payout = finalize_payout_failure(payout_id, reason="processor_timeout_max_retries")
        return {"payout_id": str(payout.id), "state": payout.state}

    return {"payout_id": payout_id, "state": "processing", "message": "Retry scheduled."}

