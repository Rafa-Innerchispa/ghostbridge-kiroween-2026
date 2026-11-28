"""Deterministic home lab rules. Cases are derived from the ledger and are not written back to it.

open-outside-schedule: a contact stayed open for HELD_SECONDS or more outside the hours the owner expects it open.
sensor-fault:          the owner confirmed the sensor is faulty (low battery) and it reports open. Not a door case.
sensor-suspect:        a contact has been open longer than its stuck_after_hours with no close. Needs a human look.
"""
import hashlib
from datetime import datetime, timedelta, timezone

HELD_SECONDS = 120
OPEN_TYPES = ("door.open", "contact.open_long", "contact.open_unresolved")


def _utc(text):
    return datetime.strptime(text, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def _minutes(text):
    hour, minute = text.split(":")
    return int(hour) * 60 + int(minute)


def overlap_seconds(start, end, windows, offset_hours):
    """Seconds of [start, end] (UTC) that fall inside daily [HH:MM, HH:MM] windows in local time (no overnight windows)."""
    if not windows or end <= start:
        return 0
    tz = timezone(timedelta(hours=offset_hours))
    local_start, local_end = start.astimezone(tz), end.astimezone(tz)
    total, day = 0.0, local_start.replace(hour=0, minute=0, second=0, microsecond=0)
    while day <= local_end:
        for opens, closes in windows:
            w_start = day + timedelta(minutes=_minutes(opens))
            w_end = day + timedelta(minutes=_minutes(closes))
            total += max(0.0, (min(w_end, local_end) - max(w_start, local_start)).total_seconds())
        day += timedelta(days=1)
    return int(total)


def _case_id(rule, event_id):
    return "case:" + hashlib.sha256(f"{rule}|{event_id}".encode()).hexdigest()[:16]


def _fault_for(faults, zone_id, start):
    for fault in faults:
        if fault["zone"] == zone_id and start >= _utc(fault["since"]):
            return fault
    return None


def derive_cases(rows, cfg):
    """rows: ledger rows from Store.rows(). Returns a list of cases sorted by time."""
    zones = {z["id"]: z for z in cfg["zones"].values()}
    offset, faults = cfg["timezone_offset_hours"], cfg["sensor_faults"]
    cases = []
    for row in rows:
        event = row["payload"]["event"]
        if event["type"] not in OPEN_TYPES or event["device"] not in zones:
            continue
        zone = zones[event["device"]]
        start = _utc(event["at"])
        seconds = event["data"]["duration_seconds"]
        end = start + timedelta(seconds=seconds)
        name = zone.get("name", zone["id"])
        fault = _fault_for(faults, zone["id"], start)
        if fault:
            cases.append(_case("sensor-fault", "medium", "Sensor fault, not a door event", event, row,
                               f"{name} reports open for {seconds} seconds but the owner recorded a fault: {fault['reason']}."))
            continue
        stuck = zone.get("stuck_after_hours")
        if event["type"] == "contact.open_unresolved" and stuck and seconds >= stuck * 3600:
            cases.append(_case("sensor-suspect", "medium", "Contact open with no close", event, row,
                               f"{name} has been open {seconds // 3600} h with no close; limit is {stuck} h. Check the battery or the door."))
        if seconds >= HELD_SECONDS:
            outside = seconds - overlap_seconds(start, end, zone.get("expected_open", []), offset)
            if outside >= HELD_SECONDS:
                cases.append(_case("open-outside-schedule", "high", "Door open outside its expected hours", event, row,
                                   f"{name} was open {seconds} seconds, {outside} of them outside its expected hours; threshold is {HELD_SECONDS} seconds."))
    return sorted(cases, key=lambda c: (c["at"], c["id"]))


def _case(rule, severity, title, event, row, explanation):
    return {"id": _case_id(rule, event["id"]), "rule": rule, "severity": severity, "title": title,
            "explanation": explanation, "event_ids": [event["id"]], "evidence_hashes": [row["hash"]], "at": event["at"]}
