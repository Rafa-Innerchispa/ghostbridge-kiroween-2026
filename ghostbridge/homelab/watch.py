"""Bounded proactive watcher. Runs in the foreground for a fixed number of minutes, then stops.

Every cycle it reads the configured contacts (and the alarm state, read only) and raises an alert when:
  armed-door-open        the alarm is armed or triggered and a contact is open;
  open-outside-schedule  a contact has been open HELD_SECONDS or more, with that much outside its expected hours;
  sensor-suspect         a contact has been open longer than its stuck_after_hours.
Contacts with an owner-recorded fault are skipped. Each alert is sent once per open episode.
With confirm it posts a HA sidebar notification and, if configured, turns on alert_light. Without confirm it only reports.
"""
import json
import time
from datetime import datetime, timedelta, timezone

from .importer import iso, parse_time
from .rules import HELD_SECONDS, _fault_for, _utc, overlap_seconds

ARMED = {"armed_home", "armed_away", "armed_night", "armed_vacation", "armed_custom_bypass", "triggered"}
MAX_MINUTES = 240
MIN_INTERVAL = 5


def evaluate(states, cfg, alerted, now):
    """states: {entity_id: (state, last_changed_datetime)}. alerted: set mutated to remember what was sent."""
    alarm = states.get(cfg["alarm_entity"]) if cfg.get("alarm_entity") else None
    armed = bool(alarm and alarm[0] in ARMED)
    alerts = []
    for entity, zone in cfg["zones"].items():
        if zone["kind"] != "contact":
            continue
        state, since = states.get(entity, (None, None))
        if state != "on" or since is None:
            alerted.difference_update({key for key in alerted if key[0] == zone["id"]})
            continue
        if _fault_for(cfg["sensor_faults"], zone["id"], since):
            continue
        seconds = int((now - since).total_seconds())
        name = zone.get("name", zone["id"])
        checks = []
        if armed:
            checks.append(("armed-door-open", "high", f"{name} is open while the alarm is {alarm[0]}."))
        if seconds >= HELD_SECONDS:
            outside = seconds - overlap_seconds(since, now, zone.get("expected_open", []), cfg["timezone_offset_hours"])
            if outside >= HELD_SECONDS:
                checks.append(("open-outside-schedule", "high", f"{name} has been open {seconds} seconds outside its expected hours."))
        stuck = zone.get("stuck_after_hours")
        if stuck and seconds >= stuck * 3600:
            checks.append(("sensor-suspect", "medium", f"{name} has been open {seconds // 3600} h with no close. Check the battery."))
        for rule, severity, message in checks:
            key = (zone["id"], rule, iso(since))
            if key not in alerted:
                alerted.add(key)
                alerts.append({"rule": rule, "severity": severity, "zone": zone["id"], "at": iso(now), "message": message})
    return alerts


def _states(client, cfg):
    wanted = list(cfg["zones"]) + ([cfg["alarm_entity"]] if cfg.get("alarm_entity") else [])
    return {s["entity_id"]: (s["state"], parse_time(s["last_changed"])) for s in client.snapshot(wanted)}


def deliver(client, cfg, alert, confirm):
    sent = {"notify": client.notify("GhostBridge", alert["message"], confirm=confirm)}
    if cfg.get("alert_light"):
        sent["light"] = client.light(cfg["alert_light"], True, confirm=confirm)
    return sent


def run_watch(client, cfg, store=None, minutes=10, interval=15, confirm=False,
              clock=lambda: datetime.now(timezone.utc), sleep=time.sleep, out=print):
    minutes, interval = min(max(1, minutes), MAX_MINUTES), max(interval, MIN_INTERVAL)
    started = clock()
    deadline = started + timedelta(minutes=minutes)
    alerted, total = set(), 0
    while True:
        now = clock()
        for alert in evaluate(_states(client, cfg), cfg, alerted, now):
            total += 1
            result = deliver(client, cfg, alert, confirm)
            if store is not None:
                store.append({"id": f"alert:{alert['zone']}:{alert['rule']}:{alert['at']}", "device": alert["zone"],
                              "type": "alert.raised", "at": alert["at"],
                              "data": {"rule": alert["rule"], "delivered": bool(confirm)}}, None)
            out(json.dumps({**alert, "delivered": bool(confirm), "actions": result}, ensure_ascii=False))
        if now + timedelta(seconds=interval) >= deadline:
            break
        sleep(interval)
    return {"alerts": total, "minutes": minutes, "interval": interval, "confirm": bool(confirm)}
