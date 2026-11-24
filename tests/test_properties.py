"""
Property-based tests across GhostBridge's three implementations of the evidence rules.
Authored by Kiro (Kiroween 2026, spec .kiro/specs/evidence-properties/).

The same rules exist three times, written separately:
  1. the Python engine (ghostbridge/: Store, Engine, correlate),
  2. the browser engine (docs/engine.mjs, docs/correlator.mjs, docs/evidence_receipt.mjs),
  3. the independent verifier anyone can download (docs/verify/verify_evidence.py, standard library only).
These tests generate random synthetic ledgers with a fixed seed (so every run is reproducible; failures print the seed and the
case number) and check properties that must hold for every input, not just for hand-picked examples. Standard library only:
no new dependencies. The JavaScript side runs through tests/helpers/js_oracle.mjs and is skipped only if Node.js is missing.
"""
import copy
import importlib.util
import json
import random
import shutil
import subprocess
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from ghostbridge.core import digest
from ghostbridge.correlator import correlate

# The oracle is the rule as written in the requirements, not the correlator's own constants, so a wrong constant is caught.
WINDOW_SECONDS = 300
DOOR_HELD_THRESHOLD = 120
from ghostbridge.engine import Engine
from ghostbridge.storage import Store

ROOT = Path(__file__).resolve().parent.parent
SEED = 20261204
_spec = importlib.util.spec_from_file_location("verify_evidence", ROOT / "docs" / "verify" / "verify_evidence.py")
verifier = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(verifier)

TYPES_BY_DEVICE = {
    "door-01": ["door.open", "door.closed"],
    "zone-01": ["presence.dwell"],
    "reader-01": ["access.denied", "access.granted"],
    "camera-01": ["camera.offline", "camera.online"],
}
BASE = datetime(2026, 11, 8, 22, 0, 0, tzinfo=timezone.utc)


def iso(seconds):
    return (BASE + timedelta(seconds=seconds)).strftime("%Y-%m-%dT%H:%M:%SZ")


def make_event(eid, device, kind, at_s, duration=None):
    data = {"duration_seconds": duration} if kind in ("door.open", "presence.dwell") else {}
    return {"id": eid, "device": device, "type": kind, "at": iso(at_s), "data": data}


def near(r, limit, spread):
    """A duration or gap that often lands exactly on, or one second either side of, a rule limit."""
    return limit + r.choice([-1, 0, 1]) if r.random() < 0.35 else max(0, limit + r.randint(-spread, spread))


def random_events(r, prefix, n, span=1500):
    events = []
    for i in range(n):
        device = r.choice(list(TYPES_BY_DEVICE))
        kind = r.choice(TYPES_BY_DEVICE[device])
        duration = None
        if kind == "door.open":
            duration = near(r, DOOR_HELD_THRESHOLD, 200)
        elif kind == "presence.dwell":
            duration = near(r, 300, 300)
        events.append(make_event(f"{prefix}-{i + 1}", device, kind, r.randint(0, span), duration))
    return events


def ledger(events):
    store = Store(":memory:")
    try:
        engine = Engine(store)
        for e in events:
            engine.ingest(e)
        return store.rows(), store.verify()
    finally:
        store.close()


def mutate_payload(r, row):
    """Change one recorded value in a row so that its content really differs."""
    event = row["payload"]["event"]
    if "duration_seconds" in event["data"]:
        event["data"]["duration_seconds"] += r.choice([1, -1]) if event["data"]["duration_seconds"] > 0 else 1
    elif r.random() < 0.5:
        event["at"] = event["at"][:-3] + ("01Z" if event["at"][-3:] != "01Z" else "02Z")
    else:
        event["id"] = event["id"] + "x"


def recompute_from(rows, k):
    """What a careful forger does: after editing row k (1-based), recompute every hash from there on."""
    previous = rows[k - 2]["hash"] if k > 1 else "0" * 64
    for row in rows[k - 1:]:
        row["previous"] = previous
        row["hash"] = digest(previous, row["payload"])
        previous = row["hash"]


def receipt_for(rows, m):
    return {"schema": "ghostbridge-receipt-v1", "rows": m, "head": rows[m - 1]["hash"]}


def py_receipt_status(rows, receipt):
    ok, message = verifier.check_receipt(rows, receipt)
    if message.startswith("truncated"):
        return "truncated", ok
    if message.startswith("rewritten"):
        return "rewritten", ok
    return ("extended" if "appended" in message else "matches"), ok


class ChainProperties(unittest.TestCase):
    def test_every_random_ledger_verifies_and_the_independent_verifier_agrees(self):
        r = random.Random(SEED)
        for case in range(300):
            rows, own = ledger(random_events(r, f"c{case}", r.randint(1, 14)))
            ok, checked, head, problem = verifier.verify_rows(rows)
            with self.subTest(seed=SEED, case=case):
                self.assertTrue(own["valid"])
                self.assertTrue(ok, problem)
                self.assertEqual(checked, len(rows))
                self.assertEqual(head, own["head"])

    def test_any_single_edit_reorder_or_deletion_is_caught_at_exactly_the_right_row(self):
        r = random.Random(SEED + 1)
        tried = {"edit": 0, "swap": 0, "delete": 0}
        for case in range(400):
            rows, _ = ledger(random_events(r, f"t{case}", r.randint(2, 12)))
            n = len(rows)
            bad = copy.deepcopy(rows)
            kind = r.choice(list(tried))
            if kind == "edit":
                k = r.randint(1, n)
                mutate_payload(r, bad[k - 1])
                expected = k
            elif kind == "swap":
                i, j = sorted(r.sample(range(1, n + 1), 2))
                bad[i - 1], bad[j - 1] = bad[j - 1], bad[i - 1]
                expected = i
            else:
                k = r.randint(1, n - 1)          # not the last row: see the receipt test for that
                del bad[k - 1]
                expected = k
            tried[kind] += 1
            ok, checked, _, problem = verifier.verify_rows(bad)
            with self.subTest(seed=SEED + 1, case=case, kind=kind):
                self.assertFalse(ok)
                self.assertEqual(checked + 1, expected, problem)
                self.assertTrue(verifier.verify_rows(rows)[0], "the original must stay valid")
        self.assertTrue(all(v > 50 for v in tried.values()), tried)

    def test_a_chain_alone_cannot_see_truncation_or_a_recomputed_rewrite_but_a_receipt_always_does(self):
        r = random.Random(SEED + 2)
        for case in range(300):
            rows, _ = ledger(random_events(r, f"r{case}", r.randint(2, 12)))
            n = len(rows)
            m = r.randint(1, n)                  # the receipt seals the first m rows
            receipt = receipt_for(rows, m)
            with self.subTest(seed=SEED + 2, case=case, n=n, m=m):
                self.assertEqual(py_receipt_status(rows, receipt), ("extended" if n > m else "matches", True))
                # Truncation below the seal: the shorter chain still verifies on its own; the receipt catches it.
                cut = r.randint(1, m) - 1
                if cut >= 1:
                    short = rows[:cut]
                    self.assertTrue(verifier.verify_rows(short)[0])
                    self.assertEqual(py_receipt_status(short, receipt), ("truncated", False))
                # Rewrite with recomputed hashes: the chain verifies, and the receipt catches it iff the edit is at or before the seal.
                k = r.randint(1, n)
                forged = copy.deepcopy(rows)
                mutate_payload(r, forged[k - 1])
                recompute_from(forged, k)
                self.assertTrue(verifier.verify_rows(forged)[0])
                if k <= m:
                    self.assertEqual(py_receipt_status(forged, receipt), ("rewritten", False))
                else:
                    self.assertTrue(py_receipt_status(forged, receipt)[1], "rows after the seal are not covered by it")


class CorrelationProperties(unittest.TestCase):
    def test_one_denial_and_one_door_form_a_case_exactly_when_the_rule_says_so(self):
        r = random.Random(SEED + 3)
        seen = {True: 0, False: 0}
        for case in range(600):
            denied_at = r.randint(0, 600)
            gap = near(r, WINDOW_SECONDS, 360) if r.random() < 0.8 else -r.randint(0, 60)
            hold = near(r, DOOR_HELD_THRESHOLD, 120)
            events = [make_event("deny", "reader-01", "access.denied", denied_at),
                      make_event("door", "door-01", "door.open", denied_at + gap, hold)]
            for i in range(r.randint(0, 5)):    # distractors that the rule must ignore
                device = r.choice(["door-01", "zone-01", "reader-01", "camera-01"])
                kind = {"door-01": "door.closed", "zone-01": "presence.dwell", "reader-01": "access.granted", "camera-01": "camera.offline"}[device]
                events.append(make_event(f"x{i}", device, kind, r.randint(0, 1500), r.randint(0, 900) if kind == "presence.dwell" else None))
            r.shuffle(events)
            rows, _ = ledger(events)
            expected = 0 < gap <= WINDOW_SECONDS and hold >= DOOR_HELD_THRESHOLD
            seen[expected] += 1
            cases = correlate(rows)
            with self.subTest(seed=SEED + 3, case=case, gap=gap, hold=hold):
                self.assertEqual(len(cases), 1 if expected else 0)
                if expected:
                    self.assertEqual(cases[0]["event_ids"], ["deny", "door"])
        self.assertTrue(seen[True] > 100 and seen[False] > 100, seen)

    def test_every_case_in_a_random_ledger_is_sound_unique_and_order_independent(self):
        r = random.Random(SEED + 4)
        total = 0
        for case in range(300):
            events = random_events(r, f"k{case}", r.randint(2, 16), span=r.choice([400, 900, 1500]))
            rows, _ = ledger(events)
            before = copy.deepcopy(rows)
            cases = correlate(rows)
            total += len(cases)
            by_id = {row["payload"]["event"]["id"]: row["payload"]["event"] for row in rows}
            shuffled = list(events)
            r.shuffle(shuffled)
            other, _ = ledger(shuffled)
            with self.subTest(seed=SEED + 4, case=case):
                self.assertEqual(rows, before, "correlate must not mutate the ledger")
                self.assertEqual(correlate(rows), cases, "same ledger, same cases")
                self.assertEqual([(c["id"], c["event_ids"]) for c in correlate(other)], [(c["id"], c["event_ids"]) for c in cases],
                                 "arrival order must not change the outcome")
                denials, doors = set(), set()
                for c in cases:
                    d, o = (by_id[x] for x in c["event_ids"])
                    gap = (datetime.strptime(o["at"], "%Y-%m-%dT%H:%M:%SZ") - datetime.strptime(d["at"], "%Y-%m-%dT%H:%M:%SZ")).total_seconds()
                    self.assertEqual((d["type"], o["type"]), ("access.denied", "door.open"))
                    self.assertTrue(0 < gap <= WINDOW_SECONDS, gap)
                    self.assertGreaterEqual(o["data"]["duration_seconds"], DOOR_HELD_THRESHOLD)
                    self.assertNotIn(d["id"], denials)
                    self.assertNotIn(o["id"], doors)
                    denials.add(d["id"]); doors.add(o["id"])
        self.assertGreater(total, 50, "the generator must produce real cases, not only empty ledgers")


@unittest.skipUnless(shutil.which("node"), "Node.js is required for the Python/JavaScript comparison")
class CrossImplementationProperties(unittest.TestCase):
    """Python engine, browser engine and independent verifier must agree on every random input."""

    @classmethod
    def setUpClass(cls):
        r = random.Random(SEED + 5)
        cls.ledgers, cls.tampered, cls.receipts = [], [], []
        for case in range(150):
            events = random_events(r, f"j{case}", r.randint(1, 14))
            rows, _ = ledger(events)
            cls.ledgers.append((events, rows))
            bad = copy.deepcopy(rows)
            if len(bad) > 1 and r.random() < 0.5:
                i, j = sorted(r.sample(range(len(bad)), 2)); bad[i], bad[j] = bad[j], bad[i]
            else:
                mutate_payload(r, bad[r.randrange(len(bad))])
            cls.tampered.append(bad)
            m = r.randint(1, len(rows))
            forged = copy.deepcopy(rows)
            k = r.randint(1, len(rows))
            mutate_payload(r, forged[k - 1]); recompute_from(forged, k)
            for variant in (rows, rows[:max(0, m - 1)], forged):
                cls.receipts.append((variant, receipt_for(rows, m)))
        job = {"ledgers": [{"events": e} for e, _ in cls.ledgers], "tampered": [{"rows": t} for t in cls.tampered],
               "receipts": [{"rows": v, "receipt": rc} for v, rc in cls.receipts]}
        proc = subprocess.run(["node", str(ROOT / "tests" / "helpers" / "js_oracle.mjs")], input=json.dumps(job),
                              capture_output=True, text=True, encoding="utf-8", timeout=120, cwd=ROOT)
        if proc.returncode != 0:
            raise RuntimeError("js_oracle failed: " + proc.stderr[-2000:])
        cls.js = json.loads(proc.stdout)

    def test_same_events_give_identical_row_hashes_and_cases_in_python_and_javascript(self):
        for case, ((_, rows), js) in enumerate(zip(self.ledgers, self.js["ledgers"])):
            with self.subTest(seed=SEED + 5, case=case):
                self.assertEqual(js["hashes"], [row["hash"] for row in rows])
                self.assertEqual(js["cases"], [{"id": c["id"], "event_ids": c["event_ids"], "evidence_hashes": c["evidence_hashes"]} for c in correlate(rows)])

    def test_all_three_find_the_same_first_bad_row_in_a_tampered_ledger(self):
        for case, (bad, js) in enumerate(zip(self.tampered, self.js["tampered"])):
            ok, checked, _, _ = verifier.verify_rows(bad)
            with self.subTest(seed=SEED + 5, case=case):
                self.assertFalse(ok)
                self.assertFalse(js["valid"])
                self.assertEqual(js["failed_at"], checked + 1)

    def test_python_verifier_and_browser_receipt_check_give_the_same_verdict(self):
        for case, ((rows, receipt), js) in enumerate(zip(self.receipts, self.js["receipts"])):
            with self.subTest(seed=SEED + 5, case=case):
                if not rows:
                    self.assertEqual(js["status"], "truncated")
                    continue
                self.assertEqual((js["status"], js["ok"]), py_receipt_status(rows, receipt))


if __name__ == "__main__":
    unittest.main()
