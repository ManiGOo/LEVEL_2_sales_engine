"""Temporal scoring helpers reused by the signal scoring logic.

Copied (and trimmed) from the scraper's ``temporal_tasks.py`` so the sales-app
can recompute scores locally without importing the Temporal workflow code.
"""
from datetime import date, datetime

MANDATE_START = date(2026, 1, 1)

PLACEHOLDER_MANUFACTURERS = {
    "under investigation", "not known", "unknown", "not available",
    "nil", "n/a", "na", "not disclosed",
}


def _as_date(value):
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            return None
    return None


def recency_weight(event_date) -> float:
    """Fresh signals are more actionable; older ones decay toward 0.6."""
    event_d = _as_date(event_date)
    if not event_d:
        return 1.0
    age_days = (datetime.utcnow().date() - event_d).days
    if age_days <= 182:      # <= 6 months
        return 1.0
    if age_days <= 365:      # <= 1 year
        return 0.9
    if age_days <= 730:      # <= 2 years
        return 0.8
    if age_days <= 1095:     # <= 3 years
        return 0.7
    return 0.6


def repeat_offender_bonus(prior_event_count: int, per_event: int = 10, cap: int = 30) -> int:
    """A manufacturer with a history of failures is higher risk. Capped at +30."""
    return min(max(prior_event_count, 0) * per_event, cap)


def mfr_key(manufacturer: str) -> str:
    """Normalize a manufacturer string for prior-event counts, or '' if
    it is a CDSCO placeholder (no real entity to track as repeat offender)."""
    if not manufacturer:
        return ""
    norm = manufacturer.strip().lower()
    if norm in PLACEHOLDER_MANUFACTURERS:
        return ""
    return norm
