"""
Adapter integration, security, idempotency and negative-case tests.

Authored by Kiro (Kiroween 2026, feat/legacy-adapters).

Covers:
  - relay_csv: valid single row, multi-row, all field combinations
  - relay_csv: negative / invalid cases (bad header, bad ID, bad timestamp,
               unknown relay, unknown state, bad duration, duplicate IDs,
               oversized file, empty CSV, missing header, extra cols)
  - relay_csv: idempotency and conflicting-ID rejection via Engine
  - relay_csv: SHA-256 chain integrity after ingestion
  - access_webhook: valid DENIED and GRANTED payloads
  - access_webhook: negative / invalid cases (missing key, extra key,
                    bad ID, bad timestamp, unknown reader, unknown decision,
                    non-string values, non-dict)
  - access_webhook: idempotency and conflicting-ID rejection via Engine
  - /api/adapters/access endpoint: valid, invalid, host/origin guards,
                    size limit, media-type check, duplicate/conflict
  - Fixture files parse cleanly
  - No mutation of the existing night-ledger fixture
"""
import json
import subprocess
import sys
import os
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

from ghostbridge.adapters.relay_csv import parse_relay_csv, RELAY_MAP
from ghostbridge.adapters.access_webhook import parse_access_webhook, READER_MAP
from ghostbridge.engine import Engine
from ghostbridge.storage import Store
from ghostbridge.server import make_server
from ghostbridge.simulator import scenario as sim_scenario

from urllib.request import Request, urlopen
from urllib.error import HTTPError


# ============================================================= #
# Helpers
# ============================================================= #

MINIMAL_CSV = "event_id,at,relay,state,duration_seconds\nR001,2026-11-08T12:01:00Z,north-door,OPEN,180\n"
CLOSED_CSV  = "event_id,at,relay,state,duration_seconds\nR002,2026-11-08T12:02:00Z,north-door,CLOSED,\n"
MULTI_CSV   = (
    "event_id,at,relay,state,duration_seconds\n"
    "R001,2026-11-08T12:01:00Z,north-door,OPEN,185\n"
    "R002,2026-11-08T12:02:00Z,north-door,CLOSED,\n"
    "R003,2026-11-08T12:10:00Z,north-door,OPEN,130\n"
)

DENIED_PAYLOAD  = {"event_id": "A001", "at": "2026-11-08T12:00:30Z", "reader": "archive-reader", "decision": "DENIED"}
GRANTED_PAYLOAD = {"event_id": "A002", "at": "2026-11-08T08:05:00Z", "reader": "archive-reader", "decision": "GRANTED"}


def make_engine():
    store = Store(":memory:")
    return Engine(store), store


# ============================================================= #
# relay_csv — valid parsing
# ============================================================= #

class TestRelayCsvValid(unittest.TestCase):

    def test_single_open_row(self):
        events = parse_relay_csv(MINIMAL_CSV)
        self.assertEqual(len(events), 1)
        e = events[0]
        self.assertEqual(e["id"],     "relay:R001")
        self.assertEqual(e["device"], "door-01")
        self.assertEqual(e["type"],   "door.open")
        self.assertEqual(e["at"],     "2026-11-08T12:01:00Z")
        self.assertEqual(e["data"],   {"duration_seconds": 180})

    def test_single_closed_row(self):
        events = parse_relay_csv(CLOSED_CSV)
        self.assertEqual(len(events), 1)
        e = events[0]
        self.assertEqual(e["type"],   "door.closed")
        self.assertEqual(e["data"],   {})

    def test_multi_row(self):
        events = parse_relay_csv(MULTI_CSV)
        self.assertEqual(len(events), 3)

    def test_bytes_input(self):
        events = parse_relay_csv(MINIMAL_CSV.encode("utf-8"))
        self.assertEqual(len(events), 1)

    def test_id_prefix(self):
        events = parse_relay_csv(MINIMAL_CSV)
        self.assertTrue(events[0]["id"].startswith("relay:"))

    def test_incident_produced_for_long_open(self):
        # 185s > 120s threshold → door-held incident
        engine, store = make_engine()
        try:
            events = parse_relay_csv(MINIMAL_CSV)
            result = engine.ingest(events[0])
            self.assertTrue(result["created"])
            self.assertIsNotNone(result["incident"])
            self.assertEqual(result["incident"]["rule"], "door-held")
        finally:
            store.close()

    def test_no_incident_for_short_open(self):
        csv = "event_id,at,relay,state,duration_seconds\nR099,2026-11-08T12:01:00Z,north-door,OPEN,60\n"
        engine, store = make_engine()
        try:
            events = parse_relay_csv(csv)
            result = engine.ingest(events[0])
            self.assertIsNone(result["incident"])
        finally:
            store.close()

    def test_closed_row_no_incident(self):
        engine, store = make_engine()
        try:
            events = parse_relay_csv(CLOSED_CSV)
            result = engine.ingest(events[0])
            self.assertIsNone(result["incident"])
        finally:
            store.close()

    def test_sha256_chain_valid_after_ingestion(self):
        engine, store = make_engine()
        try:
            for e in parse_relay_csv(MULTI_CSV):
                engine.ingest(e)
            integrity = store.verify()
            self.assertTrue(integrity["valid"])
            self.assertEqual(integrity["checked"], 3)
        finally:
            store.close()

    def test_known_relay_map_contains_north_door(self):
        self.assertIn("north-door", RELAY_MAP)
        self.assertEqual(RELAY_MAP["north-door"], "door-01")

    def test_fixture_file_parses(self):
        fixture = Path(__file__).parents[1] / "fixtures" / "relay_night_shift.csv"
        events = parse_relay_csv(fixture.read_text(encoding="utf-8"))
        self.assertEqual(len(events), 4)
        open_events = [e for e in events if e["type"] == "door.open"]
        self.assertEqual(len(open_events), 2)
        # Both ≥120s so both should produce incidents
        engine, store = make_engine()
        try:
            incidents = []
            for e in events:
                r = engine.ingest(e)
                if r["incident"]:
                    incidents.append(r["incident"])
            self.assertEqual(len(incidents), 2)
        finally:
            store.close()

    def test_normal_shift_fixture_no_incidents(self):
        fixture = Path(__file__).parents[1] / "fixtures" / "relay_normal_shift.csv"
        events = parse_relay_csv(fixture.read_text(encoding="utf-8"))
        engine, store = make_engine()
        try:
            incidents = [engine.ingest(e)["incident"] for e in events]
            self.assertTrue(all(i is None for i in incidents))
        finally:
            store.close()

    def test_duration_boundary_exactly_120(self):
        csv = "event_id,at,relay,state,duration_seconds\nRB,2026-11-08T12:00:00Z,north-door,OPEN,120\n"
        events = parse_relay_csv(csv)
        engine, store = make_engine()
        try:
            result = engine.ingest(events[0])
            self.assertIsNotNone(result["incident"])
            self.assertEqual(result["incident"]["rule"], "door-held")
        finally:
            store.close()

    def test_duration_boundary_119_no_incident(self):
        csv = "event_id,at,relay,state,duration_seconds\nRB2,2026-11-08T12:00:00Z,north-door,OPEN,119\n"
        events = parse_relay_csv(csv)
        engine, store = make_engine()
        try:
            result = engine.ingest(events[0])
            self.assertIsNone(result["incident"])
        finally:
            store.close()


# ============================================================= #
# relay_csv — idempotency and conflict
# ============================================================= #

class TestRelayCsvIdempotency(unittest.TestCase):

    def test_idempotent_reingest(self):
        engine, store = make_engine()
        try:
            events = parse_relay_csv(MINIMAL_CSV)
            r1 = engine.ingest(events[0])
            r2 = engine.ingest(events[0])   # identical → skip
            self.assertTrue(r1["created"])
            self.assertFalse(r2["created"])
            self.assertEqual(store.verify()["checked"], 1)
        finally:
            store.close()

    def test_conflicting_id_raises(self):
        engine, store = make_engine()
        try:
            events = parse_relay_csv(MINIMAL_CSV)
            engine.ingest(events[0])
            # Same event_id but different duration → conflict
            csv2 = "event_id,at,relay,state,duration_seconds\nR001,2026-11-08T12:01:00Z,north-door,OPEN,200\n"
            events2 = parse_relay_csv(csv2)
            with self.assertRaises(ValueError):
                engine.ingest(events2[0])
        finally:
            store.close()

    def test_chain_intact_after_idempotent_double_ingest(self):
        engine, store = make_engine()
        try:
            for e in parse_relay_csv(MULTI_CSV):
                engine.ingest(e)
            for e in parse_relay_csv(MULTI_CSV):
                engine.ingest(e)
            self.assertEqual(store.verify()["checked"], 3)
        finally:
            store.close()


# ============================================================= #
# relay_csv — negative / invalid inputs
# ============================================================= #

class TestRelayCsvNegative(unittest.TestCase):

    def _bad(self, csv_text, msg_fragment=None):
        with self.assertRaises(ValueError) as ctx:
            parse_relay_csv(csv_text)
        if msg_fragment:
            self.assertIn(msg_fragment, str(ctx.exception).lower())

    def test_empty_string(self):
        self._bad("")

    def test_header_only(self):
        self._bad("event_id,at,relay,state,duration_seconds\n")

    def test_missing_column(self):
        self._bad("event_id,at,relay,state\nR1,2026-11-08T00:00:00Z,north-door,OPEN\n")

    def test_extra_column(self):
        self._bad("event_id,at,relay,state,duration_seconds,extra\nR1,2026-11-08T00:00:00Z,north-door,OPEN,180,x\n")

    def test_empty_event_id(self):
        self._bad("event_id,at,relay,state,duration_seconds\n,2026-11-08T00:00:00Z,north-door,OPEN,180\n")

    def test_event_id_too_long(self):
        long_id = "X" * 65
        self._bad(f"event_id,at,relay,state,duration_seconds\n{long_id},2026-11-08T00:00:00Z,north-door,OPEN,180\n")

    def test_invalid_timestamp_format(self):
        self._bad("event_id,at,relay,state,duration_seconds\nR1,2026-11-08,north-door,OPEN,180\n")

    def test_invalid_calendar_date(self):
        self._bad("event_id,at,relay,state,duration_seconds\nR1,2026-02-30T00:00:00Z,north-door,OPEN,180\n")

    def test_unknown_relay(self):
        self._bad("event_id,at,relay,state,duration_seconds\nR1,2026-11-08T00:00:00Z,south-door,OPEN,180\n")

    def test_unknown_state(self):
        self._bad("event_id,at,relay,state,duration_seconds\nR1,2026-11-08T00:00:00Z,north-door,AJAR,\n")

    def test_missing_duration_for_open(self):
        self._bad("event_id,at,relay,state,duration_seconds\nR1,2026-11-08T00:00:00Z,north-door,OPEN,\n")

    def test_non_integer_duration(self):
        self._bad("event_id,at,relay,state,duration_seconds\nR1,2026-11-08T00:00:00Z,north-door,OPEN,1.5\n")

    def test_negative_duration(self):
        self._bad("event_id,at,relay,state,duration_seconds\nR1,2026-11-08T00:00:00Z,north-door,OPEN,-1\n")

    def test_duration_exceeds_86400(self):
        self._bad("event_id,at,relay,state,duration_seconds\nR1,2026-11-08T00:00:00Z,north-door,OPEN,86401\n")

    def test_duration_present_for_closed(self):
        self._bad("event_id,at,relay,state,duration_seconds\nR1,2026-11-08T00:00:00Z,north-door,CLOSED,30\n")

    def test_duplicate_event_ids_in_file(self):
        self._bad(
            "event_id,at,relay,state,duration_seconds\n"
            "R1,2026-11-08T00:00:00Z,north-door,OPEN,180\n"
            "R1,2026-11-08T00:01:00Z,north-door,CLOSED,\n"
        )

    def test_oversized_bytes(self):
        big = b"event_id,at,relay,state,duration_seconds\n" + b"X" * (256 * 1024 + 1)
        with self.assertRaises(ValueError):
            parse_relay_csv(big)

    def test_invalid_utf8_bytes(self):
        with self.assertRaises(ValueError):
            parse_relay_csv(b"\xff\xfe")

    def test_event_id_special_chars(self):
        self._bad("event_id,at,relay,state,duration_seconds\nR 1,2026-11-08T00:00:00Z,north-door,OPEN,180\n")


# ============================================================= #
# access_webhook — valid payloads
# ============================================================= #

class TestAccessWebhookValid(unittest.TestCase):

    def test_denied_normalises_correctly(self):
        e = parse_access_webhook(DENIED_PAYLOAD)
        self.assertEqual(e["id"],     "access:A001")
        self.assertEqual(e["device"], "reader-01")
        self.assertEqual(e["type"],   "access.denied")
        self.assertEqual(e["data"],   {})

    def test_granted_normalises_correctly(self):
        e = parse_access_webhook(GRANTED_PAYLOAD)
        self.assertEqual(e["type"],  "access.granted")
        self.assertEqual(e["id"],    "access:A002")

    def test_denied_produces_incident(self):
        engine, store = make_engine()
        try:
            result = engine.ingest(parse_access_webhook(DENIED_PAYLOAD))
            self.assertIsNotNone(result["incident"])
            self.assertEqual(result["incident"]["rule"], "access-denied")
        finally:
            store.close()

    def test_granted_no_incident(self):
        engine, store = make_engine()
        try:
            result = engine.ingest(parse_access_webhook(GRANTED_PAYLOAD))
            self.assertIsNone(result["incident"])
        finally:
            store.close()

    def test_known_reader_map(self):
        self.assertIn("archive-reader", READER_MAP)
        self.assertEqual(READER_MAP["archive-reader"], "reader-01")

    def test_id_prefix(self):
        e = parse_access_webhook(DENIED_PAYLOAD)
        self.assertTrue(e["id"].startswith("access:"))

    def test_sha256_chain_valid_after_ingestion(self):
        engine, store = make_engine()
        try:
            engine.ingest(parse_access_webhook(DENIED_PAYLOAD))
            engine.ingest(parse_access_webhook(GRANTED_PAYLOAD))
            self.assertTrue(store.verify()["valid"])
            self.assertEqual(store.verify()["checked"], 2)
        finally:
            store.close()

    def test_denied_fixture_file_parses(self):
        fixture = Path(__file__).parents[1] / "fixtures" / "access_webhook_denied.json"
        payload = json.loads(fixture.read_text(encoding="utf-8"))
        e = parse_access_webhook(payload)
        self.assertEqual(e["type"], "access.denied")

    def test_granted_fixture_file_parses(self):
        fixture = Path(__file__).parents[1] / "fixtures" / "access_webhook_granted.json"
        payload = json.loads(fixture.read_text(encoding="utf-8"))
        e = parse_access_webhook(payload)
        self.assertEqual(e["type"], "access.granted")


# ============================================================= #
# access_webhook — idempotency and conflict
# ============================================================= #

class TestAccessWebhookIdempotency(unittest.TestCase):

    def test_idempotent_reingest(self):
        engine, store = make_engine()
        try:
            e = parse_access_webhook(DENIED_PAYLOAD)
            r1 = engine.ingest(e)
            r2 = engine.ingest(e)
            self.assertTrue(r1["created"])
            self.assertFalse(r2["created"])
        finally:
            store.close()

    def test_conflicting_id_raises(self):
        engine, store = make_engine()
        try:
            engine.ingest(parse_access_webhook(DENIED_PAYLOAD))
            conflict = dict(DENIED_PAYLOAD)
            conflict["at"] = "2026-11-08T13:00:00Z"  # same id, different payload
            with self.assertRaises(ValueError):
                engine.ingest(parse_access_webhook(conflict))
        finally:
            store.close()


# ============================================================= #
# access_webhook — negative / invalid inputs
# ============================================================= #

class TestAccessWebhookNegative(unittest.TestCase):

    def _bad(self, payload, exc=ValueError):
        with self.assertRaises(exc):
            parse_access_webhook(payload)

    def test_not_a_dict(self):
        self._bad([1, 2], TypeError)

    def test_missing_key(self):
        self._bad({"event_id": "A1", "at": "2026-11-08T00:00:00Z", "reader": "archive-reader"})

    def test_extra_key(self):
        p = dict(DENIED_PAYLOAD, extra="x")
        self._bad(p)

    def test_empty_event_id(self):
        self._bad({**DENIED_PAYLOAD, "event_id": ""})

    def test_event_id_not_string(self):
        self._bad({**DENIED_PAYLOAD, "event_id": 123})

    def test_invalid_timestamp(self):
        self._bad({**DENIED_PAYLOAD, "at": "not-a-timestamp"})

    def test_invalid_calendar(self):
        self._bad({**DENIED_PAYLOAD, "at": "2026-02-30T00:00:00Z"})

    def test_unknown_reader(self):
        self._bad({**DENIED_PAYLOAD, "reader": "lobby-reader"})

    def test_reader_not_string(self):
        self._bad({**DENIED_PAYLOAD, "reader": 99})

    def test_unknown_decision(self):
        self._bad({**DENIED_PAYLOAD, "decision": "MAYBE"})

    def test_decision_not_string(self):
        self._bad({**DENIED_PAYLOAD, "decision": True})

    def test_at_not_string(self):
        self._bad({**DENIED_PAYLOAD, "at": 12345678})

    def test_event_id_invalid_chars(self):
        self._bad({**DENIED_PAYLOAD, "event_id": "A 001"})  # space not allowed


# ============================================================= #
# /api/adapters/access endpoint
# ============================================================= #

class TestAccessEndpoint(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = Store(":memory:")
        cls.server = make_server(Engine(cls.store), 0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.store.close()

    def request(self, path, data=None, headers=None, raw=None):
        req = Request(
            self.base + path,
            data=raw if raw is not None else (json.dumps(data).encode() if data is not None else None),
            headers=headers or ({"Content-Type": "application/json"} if (data is not None or raw is not None) else {}),
        )
        try:
            with urlopen(req, timeout=3) as r:
                return r.status, json.loads(r.read())
        except HTTPError as r:
            return r.code, json.loads(r.read())

    def test_valid_denied_returns_200(self):
        code, body = self.request("/api/adapters/access", DENIED_PAYLOAD)
        self.assertEqual(code, 200)
        self.assertTrue(body["created"])
        self.assertEqual(body["incident"]["rule"], "access-denied")

    def test_valid_granted_returns_200(self):
        code, body = self.request("/api/adapters/access", GRANTED_PAYLOAD)
        self.assertEqual(code, 200)
        self.assertIsNone(body["incident"])

    def test_idempotent_reingest_via_http(self):
        payload = {"event_id": "IDEM01", "at": "2026-11-09T10:00:00Z",
                   "reader": "archive-reader", "decision": "DENIED"}
        c1, b1 = self.request("/api/adapters/access", payload)
        c2, b2 = self.request("/api/adapters/access", payload)
        self.assertEqual(c1, 200)
        self.assertEqual(c2, 200)
        self.assertTrue(b1["created"])
        self.assertFalse(b2["created"])

    def test_invalid_schema_returns_400(self):
        code, _ = self.request("/api/adapters/access", {"event_id": "X"})
        self.assertEqual(code, 400)

    def test_unknown_reader_returns_400(self):
        bad = dict(DENIED_PAYLOAD, event_id="BDRDR", reader="lobby-reader")
        code, _ = self.request("/api/adapters/access", bad)
        self.assertEqual(code, 400)

    def test_invalid_decision_returns_400(self):
        bad = dict(DENIED_PAYLOAD, event_id="BDDEC", decision="MAYBE")
        code, _ = self.request("/api/adapters/access", bad)
        self.assertEqual(code, 400)

    def test_invalid_timestamp_returns_400(self):
        bad = dict(DENIED_PAYLOAD, event_id="BDTS", at="bad-ts")
        code, _ = self.request("/api/adapters/access", bad)
        self.assertEqual(code, 400)

    def test_wrong_content_type_returns_415(self):
        code, _ = self.request(
            "/api/adapters/access",
            headers={"Content-Type": "text/plain"},
            raw=json.dumps(DENIED_PAYLOAD).encode(),
        )
        self.assertEqual(code, 415)

    def test_oversized_body_returns_413(self):
        code, _ = self.request(
            "/api/adapters/access",
            raw=b" " * 16385,
        )
        self.assertEqual(code, 413)

    def test_cross_origin_rejected(self):
        bad_headers = {
            "Content-Type": "application/json",
            "Origin": "https://evil.example",
        }
        code, _ = self.request("/api/adapters/access",
                               headers=bad_headers,
                               raw=json.dumps(DENIED_PAYLOAD).encode())
        self.assertEqual(code, 403)

    def test_rebinding_rejected(self):
        bad_headers = {
            "Content-Type": "application/json",
            "Host": "evil.example",
        }
        code, _ = self.request("/api/adapters/access",
                               headers=bad_headers,
                               raw=json.dumps(DENIED_PAYLOAD).encode())
        self.assertEqual(code, 403)

    def test_malformed_json_returns_400(self):
        code, _ = self.request("/api/adapters/access", raw=b"{not json}")
        self.assertEqual(code, 400)

    def test_conflicting_id_returns_400(self):
        uid = "CONFLICT01"
        base = {"event_id": uid, "at": "2026-11-09T11:00:00Z",
                "reader": "archive-reader", "decision": "DENIED"}
        self.request("/api/adapters/access", base)
        conflict = dict(base, at="2026-11-09T12:00:00Z")
        code, body = self.request("/api/adapters/access", conflict)
        self.assertEqual(code, 400)
        self.assertIn("already exists", body.get("error", ""))


# ============================================================= #
# Cross-adapter: both sources together in one ledger
# ============================================================= #

class TestCrossAdapterIngestion(unittest.TestCase):

    def test_relay_and_access_events_in_same_ledger(self):
        engine, store = make_engine()
        try:
            for e in parse_relay_csv(MULTI_CSV):
                engine.ingest(e)
            engine.ingest(parse_access_webhook(DENIED_PAYLOAD))
            snap = engine.snapshot()
            self.assertEqual(len(snap["events"]), 4)
            # Two held-open incidents + one access-denied incident
            incident_rules = {i["rule"] for i in snap["incidents"]}
            self.assertIn("door-held", incident_rules)
            self.assertIn("access-denied", incident_rules)
            self.assertTrue(snap["integrity"]["valid"])
        finally:
            store.close()

    def test_namespace_no_collision_with_scenario_ids(self):
        """relay: and access: prefixes must not collide with scenario IDs like night-1."""
        engine, store = make_engine()
        try:
            for e in sim_scenario("night"):
                engine.ingest(e)
            for e in parse_relay_csv(MINIMAL_CSV):
                engine.ingest(e)
            engine.ingest(parse_access_webhook(DENIED_PAYLOAD))
            self.assertTrue(store.verify()["valid"])
            self.assertEqual(store.verify()["checked"], 7)
        finally:
            store.close()

    def test_original_night_ledger_unchanged(self):
        """Importing adapters must not alter the fixed SHA-256 night-ledger fixture."""
        import json as _json
        fixture = Path(__file__).parent / "night-ledger.json"
        expected = _json.loads(fixture.read_text(encoding="utf-8"))
        engine, store = make_engine()
        try:
            for e in sim_scenario("night"):
                engine.ingest(e)
            actual = store.rows()
            self.assertEqual(actual, expected)
        finally:
            store.close()


# ============================================================= #
# Persistence test
# ============================================================= #

class TestAdapterPersistence(unittest.TestCase):

    def test_relay_events_persist_across_store_reopen(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = os.path.join(tmpdir, "persist_test.sqlite3")
            store = Store(db_path)
            engine = Engine(store)
            for e in parse_relay_csv(MULTI_CSV):
                engine.ingest(e)
            head = store.verify()["head"]
            store.close()

            store2 = Store(db_path)
            try:
                self.assertEqual(store2.verify()["head"], head)
                self.assertEqual(store2.verify()["checked"], 3)
            finally:
                store2.close()

    def test_access_events_persist_across_store_reopen(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = os.path.join(tmpdir, "access_persist.sqlite3")
            store = Store(db_path)
            Engine(store).ingest(parse_access_webhook(DENIED_PAYLOAD))
            head = store.verify()["head"]
            store.close()

            store2 = Store(db_path)
            try:
                self.assertEqual(store2.verify()["head"], head)
            finally:
                store2.close()


if __name__ == "__main__":
    unittest.main()


# Reviewer-added regression tests for PR A; not authored in the original Kiro session.
class TestAdapterReviewRegressions(unittest.TestCase):
    def test_duplicate_header_rejected(self):
        raw = ("event_id,event_id,at,relay,state,duration_seconds\n"
               "R1,R2,2026-11-08T12:01:00Z,north-door,OPEN,180\n")
        with self.assertRaises(ValueError):
            parse_relay_csv(raw)

    def test_extra_data_cell_rejected_as_value_error(self):
        raw = ("event_id,at,relay,state,duration_seconds\n"
               "R1,2026-11-08T12:01:00Z,north-door,OPEN,180,EXTRA\n")
        with self.assertRaises(ValueError):
            parse_relay_csv(raw)

    def test_missing_physical_data_cell_rejected(self):
        raw = ("event_id,at,relay,state,duration_seconds\n"
               "R1,2026-11-08T12:01:00Z,north-door,CLOSED\n")
        with self.assertRaises(ValueError):
            parse_relay_csv(raw)

    def test_non_decimal_duration_rejected(self):
        raw = ("event_id,at,relay,state,duration_seconds\n"
               "R1,2026-11-08T12:01:00Z,north-door,OPEN,1_0\n")
        with self.assertRaises(ValueError):
            parse_relay_csv(raw)

    def _run_cli(self, *args):
        return subprocess.run(
            [sys.executable, "-m", "ghostbridge", *map(str, args)],
            cwd=Path(__file__).resolve().parents[1],
            capture_output=True, text=True, timeout=25,
        )

    def test_documented_cli_option_order_and_idempotent_replay(self):
        with tempfile.TemporaryDirectory() as td:
            csv_path = Path(td) / "signal.csv"
            db_path = Path(td) / "signals.sqlite3"
            csv_path.write_text(MINIMAL_CSV, encoding="utf-8")
            # Documented order: --database after subcommand and CSV path.
            first = self._run_cli("ingest-relay", csv_path, "--database", db_path)
            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertIn("Ingested 1 new event(s)", first.stdout)
            # Legacy order remains accepted, and the same event is idempotent.
            again = self._run_cli("--database", db_path, "ingest-relay", csv_path)
            self.assertEqual(again.returncode, 0, again.stderr)
            self.assertIn("1 skipped", again.stdout)

    def test_conflicting_cli_event_exits_cleanly_without_closed_database_error(self):
        with tempfile.TemporaryDirectory() as td:
            csv_path = Path(td) / "signal.csv"
            db_path = Path(td) / "signals.sqlite3"
            csv_path.write_text(MINIMAL_CSV, encoding="utf-8")
            first = self._run_cli("ingest-relay", csv_path, "--database", db_path)
            self.assertEqual(first.returncode, 0, first.stderr)
            csv_path.write_text(MINIMAL_CSV.replace(",180\\n", ",200\\n"), encoding="utf-8")
            conflict = self._run_cli("ingest-relay", csv_path, "--database", db_path)
            self.assertEqual(conflict.returncode, 1)
            self.assertIn("already exists", conflict.stderr)
            self.assertNotIn("ProgrammingError", conflict.stderr)
            self.assertNotIn("Traceback", conflict.stderr)
