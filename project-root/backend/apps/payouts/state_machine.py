ALLOWED_TRANSITIONS = {
    "pending": {"processing"},
    "processing": {"completed", "failed"},
    "completed": set(),
    "failed": set(),
}


def can_transition(current_state: str, next_state: str) -> bool:
    return next_state in ALLOWED_TRANSITIONS.get(current_state, set())


def validate_transition(current_state: str, next_state: str) -> None:
    if not can_transition(current_state, next_state):
        raise ValueError(f"Invalid payout state transition: {current_state} -> {next_state}")

