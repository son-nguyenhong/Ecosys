"""
Document State Machine — FR-009, BR-001
Transitions: draft → review → approved → archived
No role restriction — any authenticated user can transition
"""
from fastapi import HTTPException

VALID_TRANSITIONS: dict[str, list[str]] = {
    "draft":    ["review"],
    "review":   ["approved", "draft"],   # reject = back to draft
    "approved": ["archived"],
    "archived": [],
}

ACTION_MAP: dict[str, tuple[str, str]] = {
    "submit_review": ("draft",     "review"),
    "approve":       ("review",    "approved"),
    "reject":        ("review",    "draft"),
    "archive":       ("approved",  "archived"),
}


def apply_transition(current_status: str, action: str) -> str:
    """Returns new status or raises HTTPException."""
    if action not in ACTION_MAP:
        raise HTTPException(400, f"Unknown action '{action}'. Valid: {list(ACTION_MAP.keys())}")
    required_from, target = ACTION_MAP[action]
    if current_status != required_from:
        raise HTTPException(
            409,
            f"Cannot '{action}' from status '{current_status}'. "
            f"Document must be in '{required_from}' state.",
        )
    return target
