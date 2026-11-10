"""
JSON access-controller webhook adapter.

Authored by Kiro (Kiroween 2026, feat/legacy-adapters).

Expected JSON payload (POST /api/adapters/access):
    {
        "event_id": "A001",
        "at":       "2026-11-08T12:00:00Z",
        "reader":   "archive-reader",
        "decision": "DENIED"
    }

Exactly those four keys are required; no extras allowed.

  event_id  – 1–64 ASCII chars matching [A-Za-z0-9_.:-]+
  at        – UTC ISO 8601 timestamp ending in Z
  reader    – mapped source name (see READER_MAP below)
  decision  – DENIED or GRANTED

Normalised event IDs are prefixed: access:<event_id>  (total ≤ 80 chars).
"""
import re
from datetime import datetime

# --------------------------------------------------------------------------- #
# Reader source → synthetic device mapping
# --------------------------------------------------------------------------- #
READER_MAP: dict[str, str] = {
    "archive-reader": "reader-01",
}

_DECISION_MAP: dict[str, str] = {
    "DENIED":  "access.denied",
    "GRANTED": "access.granted",
}

_ID_PATTERN = re.compile(r'^[A-Za-z0-9_:.\-]{1,64}$')
_TS_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$')
_REQUIRED_KEYS = frozenset({"event_id", "at", "reader", "decision"})


def _validate_timestamp(at: str) -> None:
    if not _TS_PATTERN.fullmatch(at):
        raise ValueError(f"Timestamp must be UTC ISO 8601 ending in Z, got: {at!r}")
    try:
        datetime.strptime(at, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as exc:
        raise ValueError(f"Invalid calendar date in timestamp: {at!r}") from exc


def parse_access_webhook(payload: dict) -> dict:
    """
    Validate a parsed access-controller webhook payload and return a normalised
    event dict ready to pass to Engine.ingest().

    Parameters
    ----------
    payload : dict
        Already-decoded JSON object.

    Returns
    -------
    dict
        Five-field event: id, device, type, at, data.

    Raises
    ------
    ValueError
        On any schema, semantic or unknown-value error.
    TypeError
        If payload is not a dict.
    """
    if not isinstance(payload, dict):
        raise TypeError("Access webhook payload must be a JSON object")

    actual_keys = set(payload.keys())
    if actual_keys != _REQUIRED_KEYS:
        missing = _REQUIRED_KEYS - actual_keys
        extra   = actual_keys - _REQUIRED_KEYS
        parts = []
        if missing:
            parts.append(f"missing keys: {sorted(missing)}")
        if extra:
            parts.append(f"unexpected keys: {sorted(extra)}")
        raise ValueError("Access webhook schema mismatch — " + "; ".join(parts))

    # event_id
    event_id = payload["event_id"]
    if not isinstance(event_id, str):
        raise ValueError("event_id must be a string")
    if not _ID_PATTERN.fullmatch(event_id):
        raise ValueError(f"event_id {event_id!r} contains invalid characters or is empty/too long")
    normalised_id = f"access:{event_id}"
    if len(normalised_id) > 80:
        raise ValueError(f"Normalised event id 'access:{event_id}' exceeds 80 characters")

    # at
    at = payload["at"]
    if not isinstance(at, str):
        raise ValueError("at must be a string")
    _validate_timestamp(at)

    # reader → device
    reader = payload["reader"]
    if not isinstance(reader, str):
        raise ValueError("reader must be a string")
    if reader not in READER_MAP:
        raise ValueError(f"Unknown reader {reader!r}; known readers: {sorted(READER_MAP)}")
    device = READER_MAP[reader]

    # decision → type
    decision = payload["decision"]
    if not isinstance(decision, str):
        raise ValueError("decision must be a string")
    if decision not in _DECISION_MAP:
        raise ValueError(f"Unknown decision {decision!r}; must be DENIED or GRANTED")
    event_type = _DECISION_MAP[decision]

    return {
        "id":     normalised_id,
        "device": device,
        "type":   event_type,
        "at":     at,
        "data":   {},
    }
