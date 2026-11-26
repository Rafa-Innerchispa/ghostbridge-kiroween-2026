"""Home lab mode tests. Only invented entities and a fake local HA server: no real data, no network beyond loopback."""
import csv
import json
import re
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from ghostbridge.homelab.config import REPO_ROOT, PrivacyError, assert_private, validate_config
from ghostbridge.homelab.ha_client import HAClient, SafetyError
from ghostbridge.homelab.importer import build_events, read_rows
from ghostbridge.homelab.ledger import export_evidence, load_events, open_store
from ghostbridge.homelab.rules import derive_cases, overlap_seconds

ZONES = {
    "binary_sensor.lab_door": {"id": "lab-door", "name": "Lab door", "kind": "contact", "expected_open": [], "stuck_after_hours": 4},
    "binary_sensor.lab_patio": {"id": "lab-patio", "name": "Lab patio", "kind": "contact", "expected_open": [["08:00", "23:00"]], "stuck_after_hours": 18},
    "binary_sensor.lab_motion": {"id": "lab-motion", "name": "Lab motion", "kind": "motion"},
}


def make_cfg(db, faults=None):
    cfg = {"zones": json.loads(json.dumps(ZONES)), "timezone_offset_hours": -5, "db": str(db), "sensor_faults": faults or []}
    return validate_config(cfg)


def write_csv(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["entity_id", "state", "last_changed"])
        writer.writerows(rows)


SAMPLE = [
    ("binary_sensor.lab_patio", "unavailable", "2026-01-10T14:45:00+00:00"),
    ("binary_sensor.lab_patio", "off", "2026-01-10T14:45:00.1+00:00"),
    ("binary_sensor.lab_patio", "on", "2026-01-10T17:00:00.5+00:00"),   # 12:00 local, inside 08-23
    ("binary_sensor.lab_patio", "on", "2026-01-10T17:01:00+00:00"),     # duplicate on
    ("binary_sensor.lab_patio", "off", "2026-01-10T23:00:00+00:00"),
    ("binary_sensor.lab_door", "off", "2026-01-10T14:45:00+00:00"),
    ("binary_sensor.lab_door", "on", "2026-01-11T06:00:00Z"),          # 01:00 local, outside any window
    ("binary_sensor.lab_door", "off", "2026-01-11T06:05:00Z"),
    ("binary_sensor.lab_motion", "off", "2026-01-10T14:45:00+00:00"),
    ("binary_sensor.lab_motion", "on", "2026-01-10T15:00:00+00:00"),
    ("binary_sensor.lab_motion", "off", "2026-01-10T15:00:04+00:00"),
    ("person.someone", "home", "2026-01-10T15:00:00+00:00"),
]


class ImporterTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)

    def events(self, rows):
        write_csv(self.dir / "h.csv", rows)
        return build_events(read_rows(self.dir / "h.csv"), make_cfg(self.dir / "l.sqlite3")["zones"])

    def test_intervals_duplicates_and_baseline(self):
        events, stats = self.events(SAMPLE)
        by_id = {e["id"]: e for e in events}
        patio = by_id["lab-patio:2026-01-10T17:00:00Z:open"]
        self.assertEqual((patio["type"], patio["data"]["duration_seconds"]), ("door.open", 21600))
        self.assertEqual(stats["duplicate_states"], 1)
        self.assertEqual(stats["ignored_unavailable"], 1)
        self.assertEqual(by_id["lab-motion:2026-01-10T15:00:00Z:dwell"]["data"]["duration_seconds"], 4)
        self.assertEqual(len(events), 3)  # baseline "off" rows are not events, person.* is dropped

    def test_unresolved_open_is_its_own_event_type(self):
        events, stats = self.events([("binary_sensor.lab_door", "off", "2026-01-10T00:00:00Z"),
                                     ("binary_sensor.lab_door", "on", "2026-01-10T01:00:00Z"),
                                     ("binary_sensor.lab_motion", "off", "2026-01-10T10:00:00Z")])
        self.assertEqual(stats["unresolved"], 1)
        door = [e for e in events if e["device"] == "lab-door"][0]
        self.assertEqual((door["type"], door["data"]["duration_seconds"]), ("contact.open_unresolved", 32400))

    def test_same_csv_gives_same_events(self):
        self.assertEqual(self.events(SAMPLE), self.events(list(reversed(SAMPLE))))

    def test_person_and_tracker_entities_cannot_be_configured(self):
        for entity in ("person.x", "device_tracker.x", "zone.home"):
            with self.assertRaises(ValueError):
                validate_config({"zones": {entity: {"id": "a", "kind": "contact"}}})


class RulesTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dir = Path(self.tmp.name)

    def cases(self, rows, faults=None):
        cfg = make_cfg(self.dir / "l.sqlite3", faults)
        write_csv(self.dir / "h.csv", rows)
        events, _ = build_events(read_rows(self.dir / "h.csv"), cfg["zones"])
        store = open_store(cfg)
        self.addCleanup(store.close)
        load_events(store, events)
        return derive_cases(store.rows(), cfg)

    def test_open_inside_expected_hours_is_not_a_case_but_outside_is(self):
        cases = self.cases(SAMPLE)
        self.assertEqual([(c["rule"], c["event_ids"][0].split(":")[0]) for c in cases],
                         [("open-outside-schedule", "lab-door")])

    def test_owner_recorded_fault_is_not_a_door_case(self):
        rows = [("binary_sensor.lab_door", "off", "2026-01-10T00:00:00Z"), ("binary_sensor.lab_door", "on", "2026-01-10T01:00:00Z"),
                ("binary_sensor.lab_motion", "off", "2026-01-10T10:00:00Z")]
        faults = [{"zone": "lab-door", "since": "2026-01-10T00:00:00Z", "reason": "low battery"}]
        self.assertEqual([c["rule"] for c in self.cases(rows, faults)], ["sensor-fault"])
        self.assertEqual(sorted(c["rule"] for c in self.cases(rows)), ["open-outside-schedule", "sensor-suspect"])

    def test_short_open_outside_hours_is_not_a_case(self):
        rows = [("binary_sensor.lab_door", "off", "2026-01-10T00:00:00Z"), ("binary_sensor.lab_door", "on", "2026-01-10T06:00:00Z"),
                ("binary_sensor.lab_door", "off", "2026-01-10T06:01:59Z")]
        self.assertEqual(self.cases(rows), [])

    def test_overlap_uses_local_time(self):
        from datetime import datetime, timezone
        start = datetime(2026, 1, 10, 12, 0, tzinfo=timezone.utc)   # 07:00 local at UTC-5
        end = datetime(2026, 1, 10, 14, 0, tzinfo=timezone.utc)     # 09:00 local
        self.assertEqual(overlap_seconds(start, end, [["08:00", "23:00"]], -5), 3600)


class LedgerTests(unittest.TestCase):
    def test_import_twice_adds_nothing_and_verifier_accepts_export_and_rejects_tamper(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            cfg = make_cfg(tmp / "l.sqlite3")
            write_csv(tmp / "h.csv", SAMPLE)
            events, _ = build_events(read_rows(tmp / "h.csv"), cfg["zones"])
            store = open_store(cfg)
            self.assertEqual(load_events(store, events), (3, 0))
            self.assertEqual(load_events(store, events), (0, 3))
            out = tmp / "evidence.json"
            self.assertTrue(export_evidence(store, cfg, out)["valid"])
            verifier = REPO_ROOT / "docs" / "verify" / "verify_evidence.py"
            ok = subprocess.run([sys.executable, str(verifier), str(out)], capture_output=True, text=True)
            self.assertEqual(ok.returncode, 0, ok.stdout)
            doc = json.loads(out.read_text(encoding="utf-8"))
            doc["ledger"][0]["payload"]["event"]["data"]["duration_seconds"] += 1
            out.write_text(json.dumps(doc), encoding="utf-8")
            bad = subprocess.run([sys.executable, str(verifier), str(out)], capture_output=True, text=True)
            self.assertEqual(bad.returncode, 1)
            store.close()


class FakeHA(BaseHTTPRequestHandler):
    log = []

    def _send(self, body, code=200):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        FakeHA.log.append(("GET", self.path, self.headers.get("Authorization")))
        if self.path == "/api/":
            self._send({"message": "API running."})
        elif self.path == "/api/states":
            self._send([{"entity_id": "binary_sensor.lab_door", "state": "off", "last_changed": "2026-01-10T00:00:00+00:00", "attributes": {"secret": 1}},
                        {"entity_id": "person.someone", "state": "home", "last_changed": "x"}])
        elif self.path.startswith("/api/history/period/"):
            self._send([[{"entity_id": "binary_sensor.lab_door", "state": "off", "last_changed": "2026-01-10T00:00:00+00:00"},
                         {"state": "on", "last_changed": "2026-01-10T01:00:00+00:00"}]])
        else:
            self._send({}, 404)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        FakeHA.log.append(("POST", self.path, self.rfile.read(length).decode()))
        self._send([])

    def log_message(self, *args):
        pass


class HAClientTests(unittest.TestCase):
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
        self.client = HAClient(self.url, "test-token-123")

    def test_read_tasks(self):
        self.assertEqual(self.client.ping(), {"message": "API running."})
        snap = self.client.snapshot(["binary_sensor.lab_door", "person.someone"])
        self.assertEqual([s["entity_id"] for s in snap], ["binary_sensor.lab_door"])
        self.assertNotIn("attributes", snap[0])
        rows = self.client.history(["binary_sensor.lab_door"], "2026-01-10T00:00:00Z")
        self.assertEqual([(r["entity_id"], r["state"]) for r in rows], [("binary_sensor.lab_door", "off"), ("binary_sensor.lab_door", "on")])
        self.assertTrue(all(m == "GET" for m, _, _ in FakeHA.log))
        self.assertTrue(all(auth == "Bearer test-token-123" for _, _, auth in FakeHA.log))

    def test_notify_is_a_dry_run_unless_confirmed(self):
        self.assertTrue(self.client.notify("t", "hello")["dry_run"])
        self.assertEqual(FakeHA.log, [])
        self.assertTrue(self.client.notify("t", "hello", confirm=True)["sent"])
        self.assertEqual([(m, p) for m, p, _ in FakeHA.log], [("POST", "/api/services/persistent_notification/create")])

    def test_everything_else_is_refused_before_any_request(self):
        for service in ("alarm_control_panel/alarm_arm_away", "alarm_control_panel/alarm_disarm", "lock/unlock",
                        "light/turn_on", "switch/turn_off", "homeassistant/restart"):
            with self.assertRaises(SafetyError):
                self.client._request("POST", f"/api/services/{service}", {})
        for method, path in (("GET", "/api/config"), ("GET", "/api/error_log"), ("DELETE", "/api/states/x"), ("PUT", "/api/states/x")):
            with self.assertRaises(SafetyError):
                self.client._request(method, path)
        self.assertEqual(FakeHA.log, [])

    def test_remote_hosts_need_explicit_opt_in_and_token_is_not_shown(self):
        with self.assertRaises(SafetyError):
            HAClient("https://example.com", "t", allow_remote=False)
        HAClient("https://example.com", "t", allow_remote=True)
        self.assertNotIn("test-token-123", repr(self.client))
        with self.assertRaises(SafetyError):
            HAClient("", "")


class PrivacyTests(unittest.TestCase):
    def test_paths_inside_the_repo_are_refused(self):
        with self.assertRaises(PrivacyError):
            assert_private(REPO_ROOT / "docs" / "history.csv")
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(assert_private(Path(tmp) / "x.csv").parent, Path(tmp).resolve())

    def test_repo_holds_no_home_lab_data(self):
        patterns = [re.compile(p) for p in (r"192\.168\.\d+\.\d+", r"binary_sensor\.[a-z_]*zona_\d+", r"eyJ[A-Za-z0-9_-]{20,}", r"ops_[0-9a-f]{12}")]
        skip_dirs = {".git", "node_modules", "__pycache__", ".pytest_cache", "evidence", "qa-design-audit", "wip", "inbox"}
        this = Path(__file__).resolve()
        for path in REPO_ROOT.rglob("*"):
            if not path.is_file() or path.resolve() == this or skip_dirs & set(path.parts) or path.suffix.lower() in {".png", ".jpg", ".woff2", ".webp", ".ico", ".sqlite3"}:
                continue
            self.assertNotIn(path.name.lower(), {"history.csv", "alarma_history.csv", "homelab.json"}, str(path))
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            for pattern in patterns:
                self.assertIsNone(pattern.search(text), f"{path.relative_to(REPO_ROOT)} matches {pattern.pattern}")


if __name__ == "__main__":
    unittest.main()
