"""Home lab lights and proactive watcher tests. Invented entities, fake loopback HA, no real data."""
import json
import tempfile
import threading
import unittest
from datetime import datetime, timedelta, timezone
from http.server import HTTPServer
from pathlib import Path

try:
    from tests.test_homelab import ZONES, FakeHA, make_cfg
except ImportError:  # discover -s tests
    from test_homelab import ZONES, FakeHA, make_cfg

from ghostbridge.homelab.config import validate_config
from ghostbridge.homelab.ha_client import HAClient, SafetyError
from ghostbridge.homelab.importer import parse_time
from ghostbridge.homelab.watch import evaluate, run_watch

ALARM = "alarm_control_panel.lab"


def at(text):
    return parse_time(text)


def watch_cfg(faults=None, alert_light=None):
    cfg = make_cfg(Path(tempfile.gettempdir()) / "ghostbridge-test-watch.sqlite3", faults)
    cfg["alarm_entity"] = ALARM
    cfg["allowed_lights"] = ["light.lab_kitchen"]
    cfg["alert_light"] = alert_light
    return cfg


class LightTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), FakeHA)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        FakeHA.log.clear()
        self.client = HAClient(self.url, "t", allowed_lights=["light.lab_kitchen"])

    def test_listed_light_is_a_dry_run_until_confirmed(self):
        self.assertTrue(self.client.light("light.lab_kitchen", True)["dry_run"])
        self.assertEqual(FakeHA.log, [])
        self.assertTrue(self.client.light("light.lab_kitchen", False, confirm=True)["sent"])
        self.assertEqual(FakeHA.log[0][:2], ("POST", "/api/services/light/turn_off"))
        self.assertEqual(json.loads(FakeHA.log[0][2]), {"entity_id": "light.lab_kitchen"})

    def test_unlisted_lights_and_other_domains_are_refused(self):
        with self.assertRaises(SafetyError):
            self.client.light("light.someone_else", True, confirm=True)
        with self.assertRaises(SafetyError):
            HAClient(self.url, "t", allowed_lights=["switch.lab_pump"])
        for body in ({"entity_id": "light.lab_kitchen", "brightness": 255}, {"entity_id": "all"},
                     {"entity_id": ["light.lab_kitchen"]}, None, {}):
            with self.assertRaises(SafetyError):
                self.client._request("POST", "/api/services/light/turn_on", body)
        for service in ("alarm_control_panel/alarm_disarm", "lock/unlock", "switch/turn_on", "cover/open_cover"):
            with self.assertRaises(SafetyError):
                self.client._request("POST", f"/api/services/{service}", {"entity_id": "light.lab_kitchen"})
        self.assertEqual(FakeHA.log, [])

    def test_config_rejects_bad_light_and_alarm_settings(self):
        base = {"zones": ZONES}
        with self.assertRaises(ValueError):
            validate_config({**base, "allowed_lights": ["lock.front"]})
        with self.assertRaises(ValueError):
            validate_config({**base, "allowed_lights": ["light.a"], "alert_light": "light.b"})
        with self.assertRaises(ValueError):
            validate_config({**base, "alarm_entity": "switch.alarm"})


class WatchTests(unittest.TestCase):
    def test_armed_alarm_with_open_contact_alerts_once(self):
        cfg, sent = watch_cfg(), set()
        states = {ALARM: ("armed_away", at("2026-01-10T00:00:00Z")), "binary_sensor.lab_door": ("on", at("2026-01-10T15:00:00Z"))}
        first = evaluate(states, cfg, sent, at("2026-01-10T15:00:10Z"))
        self.assertEqual([a["rule"] for a in first], ["armed-door-open"])
        self.assertEqual(evaluate(states, cfg, sent, at("2026-01-10T15:00:40Z")), [])

    def test_open_inside_schedule_is_quiet_and_outside_is_not(self):
        cfg = watch_cfg()
        quiet = {ALARM: ("disarmed", at("2026-01-10T00:00:00Z")), "binary_sensor.lab_patio": ("on", at("2026-01-10T15:00:00Z"))}
        self.assertEqual(evaluate(quiet, cfg, set(), at("2026-01-10T18:00:00Z")), [])
        night = {ALARM: ("disarmed", at("2026-01-10T00:00:00Z")), "binary_sensor.lab_patio": ("on", at("2026-01-11T06:00:00Z"))}
        self.assertEqual(evaluate(night, cfg, set(), at("2026-01-11T06:01:00Z")), [])
        self.assertEqual([a["rule"] for a in evaluate(night, cfg, set(), at("2026-01-11T06:02:30Z"))], ["open-outside-schedule"])

    def test_faulty_sensor_is_skipped_and_reopening_alerts_again(self):
        faults = [{"zone": "lab-door", "since": "2026-01-10T00:00:00Z", "reason": "low battery"}]
        states = {"binary_sensor.lab_door": ("on", at("2026-01-10T15:00:00Z"))}
        self.assertEqual(evaluate(states, watch_cfg(faults), set(), at("2026-01-10T20:00:00Z")), [])
        cfg, sent = watch_cfg(), set()
        self.assertTrue(evaluate(states, cfg, sent, at("2026-01-10T15:03:00Z")))
        evaluate({"binary_sensor.lab_door": ("off", at("2026-01-10T15:04:00Z"))}, cfg, sent, at("2026-01-10T15:04:00Z"))
        again = {"binary_sensor.lab_door": ("on", at("2026-01-10T16:00:00Z"))}
        self.assertTrue(evaluate(again, cfg, sent, at("2026-01-10T16:03:00Z")))

    def test_run_watch_is_bounded_and_dry_by_default(self):
        class Fake:
            def __init__(self):
                self.calls = []

            def snapshot(self, entities):
                return [{"entity_id": ALARM, "state": "armed_away", "last_changed": "2026-01-10T00:00:00Z"},
                        {"entity_id": "binary_sensor.lab_door", "state": "on", "last_changed": "2026-01-10T15:00:00Z"}]

            def notify(self, title, message, confirm=False):
                self.calls.append(("notify", confirm))
                return {"dry_run": not confirm}

            def light(self, entity, on, confirm=False):
                self.calls.append(("light", entity, on, confirm))
                return {"dry_run": not confirm}

        clock = {"now": datetime(2026, 1, 10, 15, 1, tzinfo=timezone.utc)}
        sleeps = []

        def wait(seconds):
            sleeps.append(seconds)
            clock["now"] += timedelta(seconds=seconds)

        for confirm in (False, True):
            clock["now"] = datetime(2026, 1, 10, 15, 1, tzinfo=timezone.utc)
            sleeps.clear()
            fake = Fake()
            summary = run_watch(fake, watch_cfg(alert_light="light.lab_kitchen"), None, minutes=1, interval=1,
                                confirm=confirm, clock=lambda: clock["now"], sleep=wait, out=lambda _: None)
            self.assertEqual(summary["alerts"], 1)
            self.assertEqual(summary["interval"], 5)
            self.assertLessEqual(len(sleeps), 12)
            self.assertEqual(fake.calls, [("notify", confirm), ("light", "light.lab_kitchen", True, confirm)])
        clock["now"] = datetime(2026, 1, 10, 15, 1, tzinfo=timezone.utc)
        long_run = run_watch(Fake(), watch_cfg(), None, minutes=9999, interval=600, clock=lambda: clock["now"],
                             sleep=wait, out=lambda _: None)
        self.assertEqual(long_run["minutes"], 240)


if __name__ == "__main__":
    unittest.main()
