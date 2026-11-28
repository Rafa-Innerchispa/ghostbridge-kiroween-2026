"""Tests for ghostbridge.homelab.service private FastAPI read-only endpoints."""

import json
import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

from ghostbridge.homelab.config import validate_config
from ghostbridge.homelab.ledger import open_store, load_events
from ghostbridge.homelab.importer import build_events, parse_time
from ghostbridge.homelab import service

SAMPLE_ZONES = {
    "binary_sensor.test_door": {
        "id": "TDoor",
        "name": "Test Door",
        "kind": "contact",
        "expected_open": [["08:00", "20:00"]],
        "stuck_after_hours": 4,
    },
    "binary_sensor.test_motion": {
        "id": "TMotion",
        "name": "Test Motion",
        "kind": "motion",
    },
}

SAMPLE_ROWS = [
    ("binary_sensor.test_door", "off", parse_time("2026-01-10T12:00:00Z")),
    ("binary_sensor.test_door", "on", parse_time("2026-01-11T06:00:00Z")),
    ("binary_sensor.test_door", "off", parse_time("2026-01-11T06:05:00Z")),
    ("binary_sensor.test_motion", "off", parse_time("2026-01-10T12:00:00Z")),
    ("binary_sensor.test_motion", "on", parse_time("2026-01-10T12:05:00Z")),
    ("binary_sensor.test_motion", "off", parse_time("2026-01-10T12:05:30Z")),
]


class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "test_homelab.sqlite3"
        self.cfg = validate_config({
            "zones": SAMPLE_ZONES,
            "timezone_offset_hours": -5,
            "db": str(self.db_path),
            "sensor_faults": [],
        })
        self.store = open_store(self.cfg)
        events, stats = build_events(SAMPLE_ROWS, self.cfg["zones"])
        load_events(self.store, events)

        # Inject config and store into service module
        service._cfg = self.cfg
        service._store = self.store
        self.client = TestClient(service.app)

    def tearDown(self):
        service._cfg = None
        service._store = None
        self.tmp.cleanup()

    def test_health_endpoint(self):
        resp = self.client.get("/api/ghostbridge/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ok")
        self.assertTrue(data["ledger"]["valid"])
        self.assertGreater(data["ledger"]["checked"], 0)
        self.assertTrue(data["ledger"]["head"])

    def test_sensors_endpoint(self):
        resp = self.client.get("/api/ghostbridge/sensors")
        self.assertEqual(resp.status_code, 200)
        sensors = resp.json()
        self.assertEqual(len(sensors), 2)
        sensor_ids = {s["id"] for s in sensors}
        self.assertEqual(sensor_ids, {"TDoor", "TMotion"})

    def test_events_endpoint(self):
        resp = self.client.get("/api/ghostbridge/events")
        self.assertEqual(resp.status_code, 200)
        events = resp.json()
        self.assertGreater(len(events), 0)
        for e in events:
            self.assertIn("hash", e)
            self.assertIn("seq", e)
            self.assertIn("payload", e)

    def test_incidents_endpoint(self):
        resp = self.client.get("/api/ghostbridge/incidents")
        self.assertEqual(resp.status_code, 200)
        incidents = resp.json()
        self.assertIsInstance(incidents, list)
        self.assertGreater(len(incidents), 0)
        self.assertTrue(any(c["rule"] == "open-outside-schedule" for c in incidents))

    def test_evidence_endpoint_found_and_not_found(self):
        inc_resp = self.client.get("/api/ghostbridge/incidents")
        incidents = inc_resp.json()
        case_id = incidents[0]["id"]

        resp = self.client.get(f"/api/ghostbridge/evidence/{case_id}")
        self.assertEqual(resp.status_code, 200)
        ev = resp.json()
        self.assertEqual(ev["case"]["id"], case_id)
        self.assertTrue(ev["cryptographic_proof"]["chain_valid"])

        bad_resp = self.client.get("/api/ghostbridge/evidence/case:nonexistent")
        self.assertEqual(bad_resp.status_code, 404)

    def test_receipt_endpoint(self):
        inc_resp = self.client.get("/api/ghostbridge/incidents")
        case_id = inc_resp.json()[0]["id"]

        resp = self.client.get(f"/api/ghostbridge/receipts/{case_id}")
        self.assertEqual(resp.status_code, 200)
        receipt = resp.json()
        self.assertEqual(receipt["status"], "VERIFIED")
        self.assertEqual(receipt["type"], "incident_case_receipt")

        bad_resp = self.client.get("/api/ghostbridge/receipts/receipt:unknown")
        self.assertEqual(bad_resp.status_code, 404)

    def test_read_only_post_blocked(self):
        resp = self.client.post("/api/ghostbridge/events", json={"forbidden": True})
        self.assertEqual(resp.status_code, 405)
