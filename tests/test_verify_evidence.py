"""
The independent verifier (docs/verify/verify_evidence.py) must agree with the GhostBridge Python engine, and must not depend on it.

Authored by Kiro's main session (Kiroween 2026, feat/kiro-verifiable-evidence).
"""
import copy
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from ghostbridge.engine import Engine
from ghostbridge.simulator import scenario
from ghostbridge.storage import Store

ROOT = Path(__file__).resolve().parent.parent
VERIFIER = ROOT / "docs" / "verify" / "verify_evidence.py"


def ledger(events):
    store = Store(":memory:")
    try:
        engine = Engine(store)
        for e in events:
            engine.ingest(e)
        return store.rows(), store.verify()
    finally:
        store.close()


def run(*args):
    return subprocess.run([sys.executable, str(VERIFIER), *map(str, args)], capture_output=True, text=True, timeout=30)


class IndependentVerifierTests(unittest.TestCase):
    def test_it_imports_nothing_from_ghostbridge(self):
        src = VERIFIER.read_text(encoding="utf-8")
        code = re.sub(r'""".*?"""', "", src, flags=re.S)
        imports = re.findall(r"^\s*(?:import|from)\s+([\w.]+)", code, flags=re.M)
        self.assertTrue(set(imports) <= {"hashlib", "json", "sys"}, imports)

    def test_same_head_as_the_engine_for_every_scenario(self):
        spec = importlib.util.spec_from_file_location("verify_evidence", VERIFIER)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        for name in ("night", "normal", "denied"):
            rows, engine_result = ledger(scenario(name))
            ok, checked, head, problem = mod.verify_rows(rows)
            self.assertTrue(ok, problem)
            self.assertEqual((checked, head), (engine_result["checked"], engine_result["head"]), name)

    def test_command_line_verifies_detects_tampering_and_checks_receipts(self):
        rows, result = ledger(scenario("night"))
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            export = d / "e.json"
            export.write_text(json.dumps({"schema": "ghostbridge-evidence-v1", "ledger": rows}), encoding="utf-8")
            p = run(export)
            self.assertEqual(p.returncode, 0, p.stdout)
            self.assertIn(f"VERIFIED: 5 row(s); head {result['head']}", p.stdout)

            bad = copy.deepcopy(rows)
            bad[2]["payload"]["event"]["device"] = "door-01"
            (d / "bad.json").write_text(json.dumps({"ledger": bad}), encoding="utf-8")
            p = run(d / "bad.json")
            self.assertEqual(p.returncode, 1)
            self.assertIn("NOT VERIFIED: row 3", p.stdout)

            receipt = {"schema": "ghostbridge-receipt-v1", "rows": 3, "head": rows[2]["hash"]}
            (d / "r.json").write_text(json.dumps(receipt), encoding="utf-8")
            p = run(export, "--receipt", d / "r.json")
            self.assertEqual(p.returncode, 0, p.stdout)
            self.assertIn("2 row(s) appended after the seal", p.stdout)
            p = run(export, "--receipt", d / "missing.json")
            self.assertEqual(p.returncode, 2)
            (d / "t.json").write_text(json.dumps({"ledger": rows[:2]}), encoding="utf-8")
            p = run(d / "t.json", "--receipt", d / "r.json")
            self.assertEqual(p.returncode, 1)
            self.assertIn("truncated", p.stdout)
            self.assertEqual(run().returncode, 2)


if __name__ == "__main__":
    unittest.main()
