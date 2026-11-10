"""
Correlator engine tests — Python.

Authored by Kiro (Kiroween 2026, feat/cross-source-cases).

Covers:
  - Happy path: access:A001 + relay:R003 produces one high-severity case
  - Exact fixture demo: 270-second gap, 130-second door hold
  - Deterministic case ID stability across repeated calls
  - Out-of-order ingest (door ingested before denial) still correlates
  - Door event exactly at boundary (300 s) matches; 301 s does not
  - Door hold exactly at threshold (120 s) matches; 119 s does not
  - Multiple denied events: each paired with the earliest unused door
  - Multiple door candidates: earliest is chosen; second used for next denial
  - Normal-shift relay fixture (45 s open) produces no case
  - No denied events → no cases
  - No qualifying door events → no cases
  - Door before denial is never matched
  - Case replay idempotency: same ledger → same cases
  - Restart persistence: cases re-derived correctly from reloaded SQLite
  - Input ledger is never mutated by correlate()
  - SHA-256 chain remains valid after correlation
  - Original night-ledger fixture is unchanged
  - /api/cases returns correct cases via HTTP
  - /api/cases returns empty list after reset
"""
import hashlib
import json
import os
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError

from ghostbridge.correlator import correlate, WINDOW_SECONDS, DOOR_HELD_THRESHOLD, RULE_NAME
from ghostbridge.engine import Engine
from ghostbridge.storage import Store
from ghostbridge.server import make_server
from ghostbridge.adapters.relay_csv import parse_relay_csv
from ghostbridge.adapters.access_webhook import parse_access_webhook
from ghostbridge.simulator import scenario as sim_scenario


# ------------------------------------------------------------------ #
# Helpers
# ------------------------------------------------------------------ #

def make_engine():
    store = Store(":memory:")
    return Engine(store), store


def ingest_fixture(engine):
    """Ingest the canonical demo fixtures: access:A001 + relay_night_shift."""
    root = Path(__file__).parents[1]
    denied = json.loads((root / "fixtures" / "access_webhook_denied.json").read_text())
    csv_text = (root / "fixtures" / "relay_night_shift.csv").read_text()
    engine.ingest(parse_access_webhook(denied))
    for e in parse_relay_csv(csv_text):
        engine.ingest(e)


def _make_event(eid, etype, at, duration=None, device=None):
    """Build a minimal valid event dict for direct ingestion."""
    if device is None:
        device = "reader-01" if "access" in etype else "door-01"
    data = {} if duration is None else {"duration_seconds": duration}
    return {"id": eid, "device": device, "type": etype, "at": at, "data": data}


# ------------------------------------------------------------------ #
# Constants
# ------------------------------------------------------------------ #

class TestConstants(unittest.TestCase):
    def test_window_seconds(self):
        self.assertEqual(WINDOW_SECONDS, 300)

    def test_door_held_threshold(self):
        self.assertEqual(DOOR_HELD_THRESHOLD, 120)

    def test_rule_name(self):
        self.assertEqual(RULE_NAME, "denied-then-held-open")


# ------------------------------------------------------------------ #
# Happy path with canonical demo fixtures
# ------------------------------------------------------------------ #

class TestCorrelatorHappyPath(unittest.TestCase):

    def setUp(self):
        self.engine, self.store = make_engine()
        ingest_fixture(self.engine)

    def tearDown(self):
        self.store.close()

    def test_one_case_produced(self):
        cases = correlate(self.store.rows())
        self.assertEqual(len(cases), 1)

    def test_case_severity(self):
        case = correlate(self.store.rows())[0]
        self.assertEqual(case["severity"], "high")

    def test_case_rule(self):
        case = correlate(self.store.rows())[0]
        self.assertEqual(case["rule"], RULE_NAME)

    def test_case_event_ids(self):
        case = correlate(self.store.rows())[0]
        self.assertIn("access:A001", case["event_ids"])
        self.assertIn("relay:R003", case["event_ids"])

    def test_case_id_stable(self):
        c1 = correlate(self.store.rows())[0]["id"]
        c2 = correlate(self.store.rows())[0]["id"]
        self.assertEqual(c1, c2)
        self.assertTrue(c1.startswith("case:"))

    def test_case_id_matches_expected_hash(self):
        """Case ID must equal 'case:' + first 16 hex chars of SHA-256('access:A001|relay:R003')."""
        expected = "case:" + hashlib.sha256(b"access:A001|relay:R003").hexdigest()[:16]
        case = correlate(self.store.rows())[0]
        self.assertEqual(case["id"], expected)

    def test_evidence_hashes_match_ledger(self):
        rows = self.store.rows()
        case = correlate(rows)[0]
        ledger_hashes = {r["payload"]["event"]["id"]: r["hash"] for r in rows}
        self.assertEqual(case["evidence_hashes"][0], ledger_hashes["access:A001"])
        self.assertEqual(case["evidence_hashes"][1], ledger_hashes["relay:R003"])

    def test_case_at_is_denial_timestamp(self):
        case = correlate(self.store.rows())[0]
        self.assertEqual(case["at"], "2026-11-08T22:00:30Z")

    def test_270_second_gap_in_explanation(self):
        case = correlate(self.store.rows())[0]
        self.assertIn("270 second", case["explanation"])

    def test_case_window_seconds(self):
        case = correlate(self.store.rows())[0]
        self.assertEqual(case["window_seconds"], 300)

    def test_has_title(self):
        case = correlate(self.store.rows())[0]
        self.assertIn("title", case)
        self.assertTrue(len(case["title"]) > 5)

    def test_case_references_correct_door(self):
        """R003 (22:05:00Z, 270s after denial) should be chosen, not R001 (22:00:00Z, before denial)."""
        case = correlate(self.store.rows())[0]
        self.assertIn("relay:R003", case["event_ids"])
        self.assertNotIn("relay:R001", case["event_ids"])

    def test_sha256_chain_still_valid(self):
        rows = self.store.rows()
        correlate(rows)  # mutating rows would break this
        self.assertTrue(self.store.verify()["valid"])

    def test_input_rows_not_mutated(self):
        rows = self.store.rows()
        original = json.dumps(rows)
        correlate(rows)
        self.assertEqual(json.dumps(rows), original)


# ------------------------------------------------------------------ #
# Out-of-order ingest
# ------------------------------------------------------------------ #

class TestOutOfOrder(unittest.TestCase):

    def test_door_ingested_before_denial_still_correlates(self):
        """Events may arrive out of order; correlation uses timestamps."""
        engine, store = make_engine()
        try:
            # Ingest relay CSV first (door events), then access denial
            root = Path(__file__).parents[1]
            csv_text = (root / "fixtures" / "relay_night_shift.csv").read_text()
            for e in parse_relay_csv(csv_text):
                engine.ingest(e)
            denied = json.loads((root / "fixtures" / "access_webhook_denied.json").read_text())
            engine.ingest(parse_access_webhook(denied))

            cases = correlate(store.rows())
            self.assertEqual(len(cases), 1)
            self.assertIn("relay:R003", cases[0]["event_ids"])
        finally:
            store.close()


# ------------------------------------------------------------------ #
# Window and threshold boundaries
# ------------------------------------------------------------------ #

class TestBoundaries(unittest.TestCase):

    def _ledger_with(self, denied_at, door_at, duration):
        engine, store = make_engine()
        engine.ingest(_make_event("BD", "access.denied", denied_at))
        engine.ingest(_make_event("RD", "door.open", door_at, duration))
        rows = store.rows()
        store.close()
        return rows

    def test_exactly_300s_window_matches(self):
        rows = self._ledger_with("2026-11-08T10:00:00Z", "2026-11-08T10:05:00Z", 120)
        self.assertEqual(len(correlate(rows)), 1)

    def test_301s_window_no_match(self):
        rows = self._ledger_with("2026-11-08T10:00:00Z", "2026-11-08T10:05:01Z", 120)
        self.assertEqual(len(correlate(rows)), 0)

    def test_299s_window_matches(self):
        rows = self._ledger_with("2026-11-08T10:00:00Z", "2026-11-08T10:04:59Z", 120)
        self.assertEqual(len(correlate(rows)), 1)

    def test_door_hold_exactly_120s_matches(self):
        rows = self._ledger_with("2026-11-08T10:00:00Z", "2026-11-08T10:01:00Z", 120)
        self.assertEqual(len(correlate(rows)), 1)

    def test_door_hold_119s_no_match(self):
        rows = self._ledger_with("2026-11-08T10:00:00Z", "2026-11-08T10:01:00Z", 119)
        self.assertEqual(len(correlate(rows)), 0)

    def test_door_before_denial_no_match(self):
        rows = self._ledger_with("2026-11-08T10:00:00Z", "2026-11-08T09:59:59Z", 120)
        self.assertEqual(len(correlate(rows)), 0)

    def test_door_same_time_as_denial_no_match(self):
        rows = self._ledger_with("2026-11-08T10:00:00Z", "2026-11-08T10:00:00Z", 120)
        self.assertEqual(len(correlate(rows)), 0)


# ------------------------------------------------------------------ #
# Multiple events
# ------------------------------------------------------------------ #

class TestMultipleEvents(unittest.TestCase):

    def test_multiple_denials_one_door(self):
        """Two denials, one door — only one case; door is used by the first denial."""
        engine, store = make_engine()
        try:
            engine.ingest(_make_event("D1", "access.denied", "2026-11-08T10:00:00Z"))
            engine.ingest(_make_event("D2", "access.denied", "2026-11-08T10:01:00Z"))
            engine.ingest(_make_event("R1", "door.open",    "2026-11-08T10:02:00Z", 150))
            cases = correlate(store.rows())
            self.assertEqual(len(cases), 1)
            self.assertIn("D1", cases[0]["event_ids"])
        finally:
            store.close()

    def test_two_denials_two_doors_two_cases(self):
        """Two denials, two doors — two cases paired in order."""
        engine, store = make_engine()
        try:
            engine.ingest(_make_event("D1", "access.denied", "2026-11-08T10:00:00Z"))
            engine.ingest(_make_event("D2", "access.denied", "2026-11-08T10:01:00Z"))
            engine.ingest(_make_event("R1", "door.open",    "2026-11-08T10:02:00Z", 130))
            engine.ingest(_make_event("R2", "door.open",    "2026-11-08T10:03:00Z", 140))
            cases = correlate(store.rows())
            self.assertEqual(len(cases), 2)
        finally:
            store.close()

    def test_earliest_door_chosen_when_multiple_qualify(self):
        """With two qualifying doors after one denial, the earlier one is used."""
        engine, store = make_engine()
        try:
            engine.ingest(_make_event("D1", "access.denied", "2026-11-08T10:00:00Z"))
            engine.ingest(_make_event("R2", "door.open",    "2026-11-08T10:03:00Z", 130))
            engine.ingest(_make_event("R1", "door.open",    "2026-11-08T10:01:00Z", 130))
            cases = correlate(store.rows())
            self.assertEqual(len(cases), 1)
            self.assertIn("R1", cases[0]["event_ids"])
        finally:
            store.close()

    def test_door_outside_window_not_used(self):
        engine, store = make_engine()
        try:
            engine.ingest(_make_event("D1", "access.denied", "2026-11-08T10:00:00Z"))
            engine.ingest(_make_event("R9", "door.open",    "2026-11-08T10:06:00Z", 130))  # 360s — outside
            cases = correlate(store.rows())
            self.assertEqual(len(cases), 0)
        finally:
            store.close()


# ------------------------------------------------------------------ #
# Negative / empty cases
# ------------------------------------------------------------------ #

class TestNegativeCases(unittest.TestCase):

    def test_empty_ledger(self):
        self.assertEqual(correlate([]), [])

    def test_no_denied_events(self):
        engine, store = make_engine()
        try:
            for e in sim_scenario("normal"):
                engine.ingest(e)
            self.assertEqual(correlate(store.rows()), [])
        finally:
            store.close()

    def test_no_qualifying_door_events(self):
        engine, store = make_engine()
        try:
            engine.ingest(_make_event("D1", "access.denied", "2026-11-08T10:00:00Z"))
            cases = correlate(store.rows())
            self.assertEqual(cases, [])
        finally:
            store.close()

    def test_normal_relay_fixture_no_cases(self):
        """Normal-shift CSV has a 45-second door open — no case."""
        engine, store = make_engine()
        try:
            root = Path(__file__).parents[1]
            for e in parse_relay_csv((root / "fixtures" / "relay_normal_shift.csv").read_text()):
                engine.ingest(e)
            self.assertEqual(correlate(store.rows()), [])
        finally:
            store.close()

    def test_night_watch_scenario_no_cases(self):
        """Standard night scenario has no cross-source events — no cases."""
        engine, store = make_engine()
        try:
            for e in sim_scenario("night"):
                engine.ingest(e)
            self.assertEqual(correlate(store.rows()), [])
        finally:
            store.close()

    def test_access_denied_scenario_no_door_no_case(self):
        """Single access.denied with no door.open — no case."""
        engine, store = make_engine()
        try:
            for e in sim_scenario("denied"):
                engine.ingest(e)
            self.assertEqual(correlate(store.rows()), [])
        finally:
            store.close()


# ------------------------------------------------------------------ #
# Idempotency and replay
# ------------------------------------------------------------------ #

class TestIdempotency(unittest.TestCase):

    def test_same_ledger_same_cases(self):
        engine, store = make_engine()
        try:
            ingest_fixture(engine)
            c1 = correlate(store.rows())
            c2 = correlate(store.rows())
            self.assertEqual(json.dumps(c1, sort_keys=True), json.dumps(c2, sort_keys=True))
        finally:
            store.close()

    def test_re_ingesting_same_events_does_not_duplicate_cases(self):
        engine, store = make_engine()
        try:
            ingest_fixture(engine)
            ingest_fixture(engine)   # idempotent — no new rows
            cases = correlate(store.rows())
            self.assertEqual(len(cases), 1)
        finally:
            store.close()


# ------------------------------------------------------------------ #
# Persistence: cases survive SQLite close/reopen
# ------------------------------------------------------------------ #

class TestPersistence(unittest.TestCase):

    def test_cases_rederived_after_restart(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = os.path.join(tmpdir, "corr.sqlite3")
            store = Store(db_path)
            engine = Engine(store)
            ingest_fixture(engine)
            head = store.verify()["head"]
            store.close()

            store2 = Store(db_path)
            try:
                self.assertEqual(store2.verify()["head"], head)
                cases = correlate(store2.rows())
                self.assertEqual(len(cases), 1)
                self.assertIn("access:A001", cases[0]["event_ids"])
            finally:
                store2.close()


# ------------------------------------------------------------------ #
# Original fixtures unchanged
# ------------------------------------------------------------------ #

class TestFixturesUnchanged(unittest.TestCase):

    def test_night_ledger_fixture_unchanged(self):
        expected = json.loads(
            (Path(__file__).parent / "night-ledger.json").read_text(encoding="utf-8")
        )
        engine, store = make_engine()
        try:
            for e in sim_scenario("night"):
                engine.ingest(e)
            self.assertEqual(store.rows(), expected)
        finally:
            store.close()


# ------------------------------------------------------------------ #
# /api/cases HTTP endpoint
# ------------------------------------------------------------------ #

class TestApiCases(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.store = Store(":memory:")
        cls.engine = Engine(cls.store)
        cls.server = make_server(cls.engine, 0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.store.close()

    def _get(self, path):
        import urllib.request
        with urllib.request.urlopen(self.base + path, timeout=3) as r:
            return r.status, json.loads(r.read())

    def _post(self, path, data):
        import urllib.request
        req = urllib.request.Request(
            self.base + path,
            data=json.dumps(data).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=3) as r:
                return r.status, json.loads(r.read())
        except HTTPError as e:
            return e.code, json.loads(e.read())

    def test_cases_empty_on_start(self):
        self._post("/api/reset", {})
        status, body = self._get("/api/cases")
        self.assertEqual(status, 200)
        self.assertEqual(body["cases"], [])

    def test_cases_returned_after_fixture_ingest(self):
        self._post("/api/reset", {})
        root = Path(__file__).parents[1]
        denied = json.loads((root / "fixtures" / "access_webhook_denied.json").read_text())
        self._post("/api/adapters/access", denied)
        csv_text = (root / "fixtures" / "relay_night_shift.csv").read_text()
        for e in parse_relay_csv(csv_text):
            self._post("/api/events", e)
        status, body = self._get("/api/cases")
        self.assertEqual(status, 200)
        self.assertEqual(len(body["cases"]), 1)
        case = body["cases"][0]
        self.assertIn("access:A001", case["event_ids"])
        self.assertIn("relay:R003", case["event_ids"])
        self.assertEqual(case["severity"], "high")

    def test_cases_empty_after_reset(self):
        self._post("/api/reset", {})
        status, body = self._get("/api/cases")
        self.assertEqual(status, 200)
        self.assertEqual(body["cases"], [])

    def test_cases_idempotent_on_replay(self):
        self._post("/api/reset", {})
        root = Path(__file__).parents[1]
        denied = json.loads((root / "fixtures" / "access_webhook_denied.json").read_text())
        self._post("/api/adapters/access", denied)
        csv_text = (root / "fixtures" / "relay_night_shift.csv").read_text()
        for e in parse_relay_csv(csv_text):
            self._post("/api/events", e)
        # Replay
        self._post("/api/adapters/access", denied)
        for e in parse_relay_csv(csv_text):
            self._post("/api/events", e)
        _, body = self._get("/api/cases")
        self.assertEqual(len(body["cases"]), 1)

    def test_cases_is_read_only_get(self):
        """POST to /api/cases must return 404 (not registered as a POST route)."""
        code, _ = self._post("/api/cases", {})
        self.assertEqual(code, 404)

    def test_night_watch_scenario_no_cases(self):
        self._post("/api/reset", {})
        self._post("/api/scenario", {"name": "night"})
        _, body = self._get("/api/cases")
        self.assertEqual(body["cases"], [])


if __name__ == "__main__":
    unittest.main()


# Independent reviewer regression; not part of original Kiro-authored tests.
class TestCorrelatedCaseIntegrityGuard(unittest.TestCase):
    def test_api_refuses_correlated_cases_when_hash_chain_is_corrupt(self):
        store = Store(":memory:")
        engine = Engine(store)
        ingest_fixture(engine)
        store.db.execute("UPDATE ledger SET hash=? WHERE seq=1", ("f" * 64,))
        store.db.commit()
        self.assertFalse(store.verify()["valid"])
        server = make_server(engine, 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with self.assertRaises(HTTPError) as ctx:
                urlopen(f"http://127.0.0.1:{server.server_port}/api/cases", timeout=3)
            self.assertEqual(ctx.exception.code, 409)
            body = json.loads(ctx.exception.read())
            self.assertIn("integrity", body["error"])
        finally:
            server.shutdown()
            server.server_close()
            thread.join()
            store.close()
