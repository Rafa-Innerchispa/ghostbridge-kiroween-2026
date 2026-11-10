"""
Legacy relay/contact CSV adapter.

Authored by Kiro (Kiroween 2026, feat/legacy-adapters).

CSV format (header row required):
    event_id,at,relay,state,duration_seconds

  event_id   – 1–64 ASCII chars, no commas or newlines
  at         – UTC ISO 8601, e.g. 2026-11-08T12:01:00Z
  relay      – mapped source name (see RELAY_MAP below)
  state      – OPEN or CLOSED
  duration_seconds – integer 0–86400; required when state=OPEN, must be
               absent or empty when state=CLOSED

Normalised event IDs are prefixed: relay:<event_id>  (total ≤ 80 chars).

Limits:
  Maximum 1 000 data rows per file; maximum raw file size 256 KiB.

RELAY_MAP maps source names from the CSV to the canonical synthetic device IDs.
"""
import csv
import io
import re
from datetime import datetime

# --------------------------------------------------------------------------- #
# Relay source → synthetic device mapping
# --------------------------------------------------------------------------- #
RELAY_MAP: dict[str, str] = {
    "north-door": "door-01",
}

# Allowed states and their mapped event types
_STATE_MAP: dict[str, tuple[str, bool]] = {
    # state -> (event_type, duration_required)
    "OPEN":   ("door.open",   True),
    "CLOSED": ("door.closed", False),
}

_MAX_ROWS       = 1_000
_MAX_BYTES      = 256 * 1024          # 256 KiB
_ID_PATTERN     = re.compile(r'^[A-Za-z0-9_:.\-]{1,64}$')
_TS_PATTERN     = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$')
_REQUIRED_COLS  = {"event_id", "at", "relay", "state", "duration_seconds"}


def _validate_timestamp(at: str) -> None:
    if not _TS_PATTERN.fullmatch(at):
        raise ValueError(f"Timestamp must be UTC ISO 8601 ending in Z, got: {at!r}")
    try:
        datetime.strptime(at, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as exc:
        raise ValueError(f"Invalid calendar date in timestamp: {at!r}") from exc


def parse_relay_csv(source: str | bytes) -> list[dict]:
    """
    Parse a legacy relay CSV file and return a list of normalised event dicts
    ready to pass to Engine.ingest().

    Parameters
    ----------
    source : str | bytes
        Raw CSV content (string or UTF-8 bytes).  Must not exceed _MAX_BYTES.

    Returns
    -------
    list[dict]
        Each dict matches the five-field event contract: id, device, type, at, data.

    Raises
    ------
    ValueError
        On any structural, semantic, or duplicate-ID error.
    """
    if isinstance(source, bytes):
        if len(source) > _MAX_BYTES:
            raise ValueError(f"CSV source exceeds {_MAX_BYTES} bytes")
        try:
            text = source.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise ValueError("CSV source must be valid UTF-8") from exc
    else:
        if len(source.encode("utf-8")) > _MAX_BYTES:
            raise ValueError(f"CSV source exceeds {_MAX_BYTES} bytes")
        text = source

    reader = csv.DictReader(io.StringIO(text))

    # Header validation
    if reader.fieldnames is None:
        raise ValueError("CSV source is empty or has no header row")
    header = [f.strip() for f in reader.fieldnames]
    actual_cols = set(header)
    if len(header) != len(_REQUIRED_COLS) or actual_cols != _REQUIRED_COLS:
        missing = _REQUIRED_COLS - actual_cols
        extra   = actual_cols - _REQUIRED_COLS
        parts = []
        if missing:
            parts.append(f"missing columns: {sorted(missing)}")
        if extra:
            parts.append(f"unexpected columns: {sorted(extra)}")
        if len(header) != len(_REQUIRED_COLS) and not parts:
            parts.append("duplicate column names or wrong number of columns")
        raise ValueError("CSV header mismatch — " + "; ".join(parts))

    events: list[dict] = []
    seen_ids: set[str] = set()

    for row_num, raw in enumerate(reader, start=2):   # row 1 is header
        if row_num - 1 > _MAX_ROWS:
            raise ValueError(f"CSV exceeds maximum of {_MAX_ROWS} data rows")

        # Require exactly five physical cells, rejecting surplus or missing values.
        if None in raw or any(v is None for v in raw.values()):
            raise ValueError(f"Row {row_num}: expected exactly five CSV fields")
        row = {k.strip(): v.strip() for k, v in raw.items()}

        # --- event_id ---
        event_id = row["event_id"]
        if not _ID_PATTERN.fullmatch(event_id):
            raise ValueError(f"Row {row_num}: event_id {event_id!r} contains invalid characters or is empty/too long")
        normalised_id = f"relay:{event_id}"
        if len(normalised_id) > 80:
            raise ValueError(f"Row {row_num}: normalised event id 'relay:{event_id}' exceeds 80 characters")
        if event_id in seen_ids:
            raise ValueError(f"Row {row_num}: duplicate event_id {event_id!r} in this file")
        seen_ids.add(event_id)

        # --- at ---
        _validate_timestamp(row["at"])

        # --- relay → device ---
        relay = row["relay"]
        if relay not in RELAY_MAP:
            raise ValueError(f"Row {row_num}: unknown relay {relay!r}; known relays: {sorted(RELAY_MAP)}")
        device = RELAY_MAP[relay]

        # --- state → type ---
        state = row["state"]
        if state not in _STATE_MAP:
            raise ValueError(f"Row {row_num}: unknown state {state!r}; must be OPEN or CLOSED")
        event_type, duration_required = _STATE_MAP[state]

        # --- duration_seconds ---
        dur_raw = row["duration_seconds"]
        if duration_required:
            if not dur_raw:
                raise ValueError(f"Row {row_num}: duration_seconds is required when state=OPEN")
            if not re.fullmatch(r"[0-9]+", dur_raw):
                raise ValueError(f"Row {row_num}: duration_seconds must be an integer, got {dur_raw!r}")
            duration = int(dur_raw)
            if not 0 <= duration <= 86400:
                raise ValueError(f"Row {row_num}: duration_seconds {duration} out of range 0–86400")
            data: dict = {"duration_seconds": duration}
        else:
            if dur_raw:
                raise ValueError(f"Row {row_num}: duration_seconds must be empty when state=CLOSED, got {dur_raw!r}")
            data = {}

        events.append({
            "id":     normalised_id,
            "device": device,
            "type":   event_type,
            "at":     row["at"],
            "data":   data,
        })

    if not events:
        raise ValueError("CSV contains no data rows")

    return events
