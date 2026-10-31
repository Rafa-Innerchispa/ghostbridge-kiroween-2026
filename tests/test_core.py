import copy
import json
import tempfile
import unittest
from pathlib import Path
from ghostbridge.core import validate, incident, digest
from ghostbridge.engine import Engine
from ghostbridge.storage import Store
from ghostbridge.simulator import scenario

class CoreTests(unittest.TestCase):
    def setUp(self):
        self.store = Store(":memory:")
        self.engine = Engine(self.store)

    def tearDown(self):
        self.store.close()

    def test_night_watch(self):
        for e in scenario("night"): self.engine.ingest(e)
        s = self.engine.snapshot()
        self.assertEqual((len(s["events"]), len(s["incidents"])), (5, 3))
        self.assertTrue(s["integrity"]["valid"])

    def test_normal_shift(self):
        for e in scenario("normal"): self.engine.ingest(e)
        s = self.engine.snapshot()
        self.assertEqual((len(s["events"]), len(s["incidents"])), (4, 0))

    def test_denied(self):
        self.assertEqual(self.engine.ingest(scenario("denied")[0])["incident"]["rule"], "access-denied")

    def test_duplicate(self):
        e = scenario("night")[0]
        self.assertTrue(self.engine.ingest(e)["created"])
        self.assertFalse(self.engine.ingest(e)["created"])
        self.assertEqual(len(self.engine.snapshot()["incidents"]), 1)

    def test_conflicting_id(self):
        e = scenario("night")[0]
        self.engine.ingest(e)
        e["data"]["duration_seconds"] = 200
        with self.assertRaises(ValueError): self.engine.ingest(e)

    def test_thresholds(self):
        for name, threshold in [("door-held", 120), ("long-dwell", 300)]:
            e = scenario("night")[0 if name == "door-held" else 1]
            e["data"]["duration_seconds"] = threshold-1
            self.assertIsNone(incident(e))
            e["data"]["duration_seconds"] = threshold
            self.assertEqual(incident(e)["rule"], name)

    def test_invalid_contracts(self):
        for patch in [{"id":""}, {"device":"real-camera"}, {"type":"camera.online"}, {"at":"not-a-dateZ"}, {"at":"2026-10-30"}, {"data":[]}, {"data":{"duration_seconds":True}}, {"data":{"duration_seconds":-1}}, {"data":{"duration_seconds":90000}}, {"data":{"duration_seconds":float('nan')}}, {"data":{"duration_seconds":1,"secret":"no"}}, {"extra":1}]:
            with self.subTest(patch=patch):
                e = scenario("night")[0]; e.update(patch)
                with self.assertRaises(ValueError): validate(e)

    def test_unknown_scenario(self):
        with self.assertRaises(ValueError): scenario("unknown")

    def test_utc_calendar_validation(self):
        for at in ["2026-02-30T22:00:00Z", "2026-10-30Z", "2026-10-30T22:00:00+00:00", "2026-10-30T24:00:00Z"]:
            with self.subTest(at=at):
                e = scenario("night")[0]; e["at"] = at
                with self.assertRaises(ValueError): validate(e)

    def test_empty_chain(self):
        self.assertEqual(self.store.verify()["checked"], 0)
        self.assertTrue(self.store.verify()["valid"])

    def test_reset(self):
        self.engine.ingest(scenario("night")[0]); self.store.reset()
        self.engine.ingest(scenario("normal")[0])
        self.assertTrue(self.store.verify()["valid"])
        self.assertEqual(len(self.store.rows()), 1)

    def test_payload_tamper(self):
        self.engine.ingest(scenario("night")[0])
        self.store.db.execute("UPDATE ledger SET payload=?", ('{}',))
        self.assertFalse(self.store.verify()["valid"])

    def test_hash_tamper(self):
        self.engine.ingest(scenario("night")[0])
        self.store.db.execute("UPDATE ledger SET hash='fake'")
        self.assertFalse(self.store.verify()["valid"])

    def test_previous_tamper(self):
        self.engine.ingest(scenario("night")[0])
        self.store.db.execute("UPDATE ledger SET previous='fake'")
        self.assertFalse(self.store.verify()["valid"])

    def test_middle_deletion(self):
        for e in scenario("night"): self.engine.ingest(e)
        self.store.db.execute("DELETE FROM ledger WHERE seq=2")
        self.assertFalse(self.store.verify()["valid"])

    def test_persistence(self):
        with tempfile.TemporaryDirectory() as root:
            path = str(Path(root)/"test.sqlite3")
            store = Store(path); engine = Engine(store)
            for e in scenario("night"): engine.ingest(e)
            head = store.verify()["head"]; store.close()
            restored = Store(path)
            try:
                self.assertEqual(restored.verify()["head"], head)
                self.assertEqual(len(Engine(restored).snapshot()["incidents"]), 3)
            finally: restored.close()

    def test_canonical_order(self):
        self.assertEqual(digest("0", {"a":1,"b":2}), digest("0", {"b":2,"a":1}))

    def test_shared_browser_fixture(self):
        expected = json.loads((Path(__file__).parent / "night-ledger.json").read_text(encoding="utf-8"))
        for e in scenario("night"): self.engine.ingest(e)
        self.assertEqual(self.store.rows(), expected)

if __name__ == "__main__": unittest.main()
