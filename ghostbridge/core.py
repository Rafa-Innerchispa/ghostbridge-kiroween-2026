"""Strict event contract and deterministic rules. No physical-device adapters."""
import hashlib
import json
import re
from datetime import datetime

DEVICES = {
    "door-01": {"name": "North entrance", "kind": "contact", "protocol": "Legacy relay"},
    "zone-01": {"name": "Archive corridor", "kind": "presence", "protocol": "Access controller"},
    "reader-01": {"name": "Archive reader", "kind": "access", "protocol": "Wiegand adapter"},
    "camera-01": {"name": "Loading bay camera", "kind": "camera", "protocol": "ONVIF adapter"},
}
TYPES = {"door.open": "contact", "door.closed": "contact", "presence.dwell": "presence",
         "access.denied": "access", "access.granted": "access", "camera.offline": "camera", "camera.online": "camera"}

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)

def digest(previous, payload):
    return hashlib.sha256((previous + "\n" + canonical(payload)).encode()).hexdigest()

def validate(event):
    if not isinstance(event, dict) or set(event) != {"id", "device", "type", "at", "data"}:
        raise ValueError("Event requires exactly id, device, type, at, data")
    if not isinstance(event["id"], str) or not 1 <= len(event["id"]) <= 80:
        raise ValueError("Event id must be 1–80 characters")
    if not isinstance(event["device"], str) or event["device"] not in DEVICES:
        raise ValueError("Unknown synthetic device")
    if not isinstance(event["type"], str) or TYPES.get(event["type"]) != DEVICES[event["device"]]["kind"]:
        raise ValueError("Event type is incompatible with device")
    if not isinstance(event["at"], str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", event["at"]):
        raise ValueError("Timestamp must be UTC ISO 8601 ending in Z")
    try:
        datetime.strptime(event["at"], "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as exc:
        raise ValueError("Invalid event timestamp") from exc
    if not isinstance(event["data"], dict):
        raise ValueError("Event data must be an object")
    allowed = {"duration_seconds"} if event["type"] in ("door.open", "presence.dwell") else set()
    if set(event["data"]) != allowed:
        raise ValueError("Unexpected or missing event data fields")
    if allowed:
        duration = event["data"]["duration_seconds"]
        if isinstance(duration, bool) or not isinstance(duration, int) or not 0 <= duration <= 86400:
            raise ValueError("duration_seconds must be an integer from 0 to 86400")
    return event

def incident(event):
    kind, data = event["type"], event["data"]
    rule = None
    if kind == "door.open" and data["duration_seconds"] >= 120:
        rule = ("door-held", "high", "Door held open", f"North entrance was open for {data['duration_seconds']} seconds; threshold is 120 seconds.")
    elif kind == "presence.dwell" and data["duration_seconds"] >= 300:
        rule = ("long-dwell", "medium", "Unusual dwell time", f"Presence lasted {data['duration_seconds']} seconds; threshold is 300 seconds.")
    elif kind == "access.denied":
        rule = ("access-denied", "medium", "Access denied", "The synthetic archive controller rejected an access attempt.")
    elif kind == "camera.offline":
        rule = ("camera-offline", "high", "Camera unavailable", "The synthetic loading bay camera reported offline; coverage may be reduced.")
    if rule:
        return dict(id=f"{event['id']}:{rule[0]}", event_id=event["id"], device=event["device"],
                    rule=rule[0], severity=rule[1], title=rule[2], explanation=rule[3], at=event["at"])
    return None
