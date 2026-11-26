"""Private home lab ledger: same SHA-256 chain and row shape as the public one, so docs/verify/verify_evidence.py checks it."""
import json
from pathlib import Path

from ..storage import Store
from .config import assert_private
from .rules import derive_cases


def open_store(cfg):
    path = assert_private(cfg["db"])
    path.parent.mkdir(parents=True, exist_ok=True)
    return Store(str(path))


def load_events(store, events):
    """Append events; returns (added, already_present). Re-running the same import adds nothing."""
    added = 0
    for event in events:
        if store.append(event, None):
            added += 1
    return added, len(events) - added


def export_evidence(store, cfg, out_path):
    """Write rows plus derived cases as JSON for the independent verifier. Returns the verification summary."""
    rows = store.rows()
    result = store.verify()
    out = assert_private(out_path)
    out.write_text(json.dumps({"ledger": rows, "cases": derive_cases(rows, cfg), "verification": result},
                              indent=2, ensure_ascii=False), encoding="utf-8")
    return result
