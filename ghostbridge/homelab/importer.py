"""Turn a Home Assistant history CSV (entity_id,state,last_changed) into ledger events."""
import csv
from collections import defaultdict
from datetime import datetime, timezone

from .config import EXCLUDED_PREFIXES, assert_private

FMT = "%Y-%m-%dT%H:%M:%SZ"


def parse_time(text):
    dt = datetime.fromisoformat(text.strip().replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def iso(dt):
    return dt.strftime(FMT)


def read_rows(path):
    rows = []
    with open(assert_private(path), newline="", encoding="utf-8-sig") as handle:
        for line in csv.DictReader(handle):
            entity = (line.get("entity_id") or "").strip()
            if not entity or entity.startswith(EXCLUDED_PREFIXES):
                continue
            rows.append((entity, (line.get("state") or "").strip(), parse_time(line["last_changed"])))
    return rows


def build_events(rows, zones, data_end=None):
    """Returns (events, stats). Events are sorted by (at, id) so the same CSV always gives the same ledger.

    Rules, all counted in stats so nothing is dropped silently:
      - states other than on/off (unavailable, unknown) are ignored;
      - a repeated state with no change in between is a duplicate and is ignored;
      - the first on/off state of an entity is a baseline, not an event, unless it is already "on";
      - an "on" with no later "off" is unresolved (still open at the end of the data).
    """
    by_entity = defaultdict(list)
    for entity, state, at in rows:
        if entity in zones:
            by_entity[entity].append((at, state))
    stats = {"rows_used": 0, "ignored_unavailable": 0, "duplicate_states": 0, "unresolved": 0}
    end = data_end or max((at for _, _, at in rows), default=None)
    events = []
    for entity, seq in by_entity.items():
        zone = zones[entity]
        state, since = None, None
        for at, value in sorted(seq):
            stats["rows_used"] += 1
            if value not in ("on", "off"):
                stats["ignored_unavailable"] += 1
                continue
            if value == state:
                stats["duplicate_states"] += 1
                continue
            if value == "on":
                since = at
            elif state == "on":
                events.append(_interval(zone, since, at))
            state = value
        if state == "on":
            stats["unresolved"] += 1
            events.append(_interval(zone, since, None, end))
    events.sort(key=lambda e: (e["at"], e["id"]))
    return events, stats


def _interval(zone, start, stop, end=None):
    unresolved = stop is None
    start = start.replace(microsecond=0)  # same whole-second precision as the ledger timestamp
    seconds = max(0, int(((stop or end).replace(microsecond=0) - start).total_seconds()))
    zid, at = zone["id"], iso(start)
    if zone["kind"] == "motion":
        kind = "presence.dwell"
    elif unresolved:
        kind = "contact.open_unresolved"
    elif seconds > 86400:
        kind = "contact.open_long"
    else:
        kind = "door.open"
    suffix = "dwell" if zone["kind"] == "motion" else "open"
    return {"id": f"{zid}:{at}:{suffix}", "device": zid, "type": kind, "at": at,
            "data": {"duration_seconds": seconds}}
