"""
Deterministic cross-source case correlator.

Authored by Kiro (Kiroween 2026, feat/cross-source-cases).

Rule: denied-then-held-open
  An access.denied event followed within WINDOW_SECONDS (300) by a door.open
  event whose duration_seconds >= DOOR_HELD_THRESHOLD (120) generates one
  high-severity correlated case.

Invariants:
  - Input `rows` (the verified ledger) is never mutated.
  - Cases are derived projections; they are not inserted into the ledger.
  - The rule operates on UTC event timestamps, not arrival (ledger sequence) order.
  - Each (denied, door) pair generates at most one case — earliest qualifying
    door.open wins (deterministic tie-breaking by (at, event_id)).
  - Replaying with the same ledger always produces identical cases.
  - Case IDs are derived from the two component event IDs using SHA-256 so they
    are stable and verifiable without storing extra state.
"""
import hashlib

WINDOW_SECONDS        = 300   # access.denied → door.open must arrive within this
DOOR_HELD_THRESHOLD   = 120   # door.open duration_seconds must be >= this

RULE_NAME  = "denied-then-held-open"
RULE_TITLE = "Denied access followed by held-open door"


def _iso_to_seconds(ts: str) -> int:
    """Convert UTC ISO 8601 timestamp (YYYY-MM-DDTHH:MM:SSZ) to seconds since epoch.

    Uses only the stdlib so there is no external dependency.
    """
    # datetime.fromisoformat works in Python 3.7+ but doesn't handle the Z suffix
    # until 3.11.  Replace manually for broader compatibility.
    from datetime import datetime, timezone
    return int(datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ")
               .replace(tzinfo=timezone.utc)
               .timestamp())


def _case_id(denied_event_id: str, door_event_id: str) -> str:
    """Stable SHA-256-derived case ID from the two component event IDs."""
    raw = f"{denied_event_id}|{door_event_id}"
    return "case:" + hashlib.sha256(raw.encode()).hexdigest()[:16]


def correlate(rows: list[dict]) -> list[dict]:
    """
    Derive correlated cases from a verified ledger snapshot.

    Parameters
    ----------
    rows : list[dict]
        The full ledger rows as returned by Store.rows() / engine.snapshot()['ledger'].
        Not mutated.

    Returns
    -------
    list[dict]
        Zero or more case dicts.  Each case contains:
            id              – stable "case:<16-hex>" identifier
            rule            – rule name string
            severity        – "high"
            title           – human-readable title
            explanation     – natural-language description
            event_ids       – [denied_event_id, door_event_id]
            evidence_hashes – [denied_ledger_hash, door_ledger_hash]
            at              – timestamp of the access.denied event (case open time)
            window_seconds  – the correlation window that was applied
    """
    # Build indexed lookups from the ledger.
    # We read payload.event fields; hashes come from the ledger rows directly.
    denied_rows: list[dict]    = []   # rows where event.type == access.denied
    door_rows:   list[dict]    = []   # rows where event.type == door.open AND duration >= threshold

    for row in rows:
        evt = row["payload"]["event"]
        if evt["type"] == "access.denied":
            denied_rows.append(row)
        elif evt["type"] == "door.open":
            dur = evt["data"].get("duration_seconds", 0)
            if isinstance(dur, int) and dur >= DOOR_HELD_THRESHOLD:
                door_rows.append(row)

    if not denied_rows or not door_rows:
        return []

    # Sort door candidates deterministically: (at, event_id)
    door_rows_sorted = sorted(door_rows, key=lambda r: (r["payload"]["event"]["at"],
                                                         r["payload"]["event"]["id"]))

    cases: list[dict]   = []
    used_door_ids: set  = set()   # each door row can appear in at most one case

    # Sort denied rows deterministically too, so processing order is stable.
    for denied_row in sorted(denied_rows, key=lambda r: (r["payload"]["event"]["at"],
                                                          r["payload"]["event"]["id"])):
        denied_evt  = denied_row["payload"]["event"]
        denied_at_s = _iso_to_seconds(denied_evt["at"])

        # Find the earliest qualifying door.open not already paired.
        for door_row in door_rows_sorted:
            door_evt = door_row["payload"]["event"]
            door_id  = door_evt["id"]
            if door_id in used_door_ids:
                continue
            door_at_s = _iso_to_seconds(door_evt["at"])
            # The door open must occur AFTER the access denial.
            if door_at_s <= denied_at_s:
                continue
            gap = door_at_s - denied_at_s
            if gap > WINDOW_SECONDS:
                continue  # already past the window (sorted, so no later match either)

            # Match found — emit one case.
            used_door_ids.add(door_id)
            gap_str    = f"{gap} second{'s' if gap != 1 else ''}"
            dur_str    = f"{door_evt['data']['duration_seconds']} seconds"
            cases.append({
                "id":        _case_id(denied_evt["id"], door_id),
                "rule":      RULE_NAME,
                "severity":  "high",
                "title":     RULE_TITLE,
                "explanation": (
                    f"An access attempt was rejected ({denied_evt['id']}) and "
                    f"the entrance stayed open for {dur_str} ({door_id}) "
                    f"just {gap_str} later, within the {WINDOW_SECONDS}-second correlation window."
                ),
                "event_ids":        [denied_evt["id"], door_id],
                "evidence_hashes":  [denied_row["hash"], door_row["hash"]],
                "at":               denied_evt["at"],
                "window_seconds":   WINDOW_SECONDS,
            })
            break   # one door per denial

    return cases
