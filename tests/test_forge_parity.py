"""
Python/JavaScript parity for Signal Forge ledgers.

Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).

tests/forge-parity.json is produced by the JavaScript engine (tests/gen_forge_parity.mjs). Here the same
synthetic events go through the Python engine and must yield identical SHA-256 row hashes, identical case
ids and identical evidence hashes. No Python source file is changed by this feature.
"""
import json
import unittest
from pathlib import Path

from ghostbridge.correlator import correlate
from ghostbridge.engine import Engine
from ghostbridge.storage import Store

FIXTURE = Path(__file__).parent / "forge-parity.json"


class ForgeParityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(FIXTURE.read_text(encoding="utf-8"))

    def test_fixture_shape(self):
        self.assertEqual(self.data["schema"], "ghostbridge-forge-parity-v1")
        self.assertEqual(self.data["count"], len(self.data["cases"]))
        self.assertGreaterEqual(self.data["count"], 90)

    def test_every_configuration_matches_javascript(self):
        mismatches = []
        for entry in self.data["cases"]:
            cfg = entry["config"]
            store = Store(":memory:")
            try:
                engine = Engine(store)
                for event in entry["events"]:
                    self.assertTrue(engine.ingest(event)["created"])
                rows = store.rows()
                hashes = [r["hash"] for r in rows]
                cases = correlate(rows)
                got = [{"id": c["id"], "event_ids": c["event_ids"], "evidence_hashes": c["evidence_hashes"], "explanation": c["explanation"]} for c in cases]
                if hashes != entry["row_hashes"]:
                    mismatches.append((cfg, "row hashes differ"))
                if got != entry["cases"]:
                    mismatches.append((cfg, "cases differ"))
                self.assertTrue(store.verify()["valid"])
            finally:
                store.close()
        self.assertEqual(mismatches, [], f"{len(mismatches)} parity mismatches, first: {mismatches[:1]}")

    def test_rule_boundaries_agree_with_the_fixture(self):
        seen = {}
        for entry in self.data["cases"]:
            c = entry["config"]
            seen[(c["delaySeconds"], c["holdSeconds"])] = len(entry["cases"])
        self.assertEqual(seen[(299, 120)], 1)
        self.assertEqual(seen[(300, 120)], 1)
        self.assertEqual(seen[(301, 120)], 0)
        self.assertEqual(seen[(299, 119)], 0)
        self.assertEqual(seen[(301, 119)], 0)
        self.assertEqual(seen[(1, 121)], 1)

    def test_replay_does_not_change_hashes_or_cases(self):
        entry = next(e for e in self.data["cases"] if e["config"]["delaySeconds"] == 299 and e["config"]["holdSeconds"] == 120)
        store = Store(":memory:")
        try:
            engine = Engine(store)
            for event in entry["events"]:
                engine.ingest(event)
            before = (store.rows(), correlate(store.rows()))
            for event in entry["events"]:
                self.assertFalse(engine.ingest(event)["created"])
            self.assertEqual((store.rows(), correlate(store.rows())), before)
        finally:
            store.close()


if __name__ == "__main__":
    unittest.main()
