#!/usr/bin/env python3
"""
Independent verifier for GhostBridge evidence exports.  Don't trust GhostBridge: check it yourself.

Written by Kiro (Kiroween 2026) as a deliberately separate implementation: it does not import any GhostBridge code, only the
Python standard library, and it is short enough to read in two minutes.

    python verify_evidence.py ghostbridge-evidence.json
    python verify_evidence.py ghostbridge-evidence.json --receipt ghostbridge-receipt.json

The rule it checks, for every row in order:
    hash = SHA-256( previous_hash + "\n" + canonical_json(payload) )
where the first previous_hash is 64 zeros, canonical_json sorts object keys and has no spaces, and each row's "previous" must equal
the hash of the row before it.  With a receipt it also checks that the sealed rows still end in the sealed head hash, which reveals a
history that was rewritten after the seal even if every hash was recomputed.

Exit code 0 = verified, 1 = not verified, 2 = could not read the input.
"""
import hashlib
import json
import sys

ZERO = "0" * 64


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def row_hash(previous, payload):
    return hashlib.sha256((previous + "\n" + canonical(payload)).encode("utf-8")).hexdigest()


def verify_rows(rows):
    """Returns (ok, checked, head, problem)."""
    previous = ZERO
    for i, row in enumerate(rows, 1):
        if not isinstance(row, dict) or not {"seq", "previous", "hash", "payload"} <= set(row):
            return False, i - 1, None, f"row {i}: missing seq, previous, hash or payload"
        if row["seq"] != i or isinstance(row["seq"], bool):
            return False, i - 1, None, f"row {i}: seq is {row['seq']!r}, expected {i}"
        if row["previous"] != previous:
            return False, i - 1, None, f"row {i}: 'previous' does not point at the hash of row {i - 1}"
        try:
            recomputed = row_hash(previous, row["payload"])
        except (TypeError, ValueError):
            return False, i - 1, None, f"row {i}: payload is not plain JSON"
        if row["hash"] != recomputed:
            return False, i - 1, None, f"row {i}: stored hash {str(row['hash'])[:12]}... but recomputed {recomputed[:12]}... (content changed after sealing)"
        previous = row["hash"]
    return True, len(rows), previous if rows else None, None


def check_receipt(rows, receipt):
    if not isinstance(receipt, dict):
        return False, "the receipt is not a valid ghostbridge-receipt-v1"
    n, head = receipt.get("rows"), receipt.get("head")
    if receipt.get("schema") != "ghostbridge-receipt-v1" or isinstance(n, bool) or not isinstance(n, int) or n < 1 or not isinstance(head, str) or len(head) != 64:
        return False, "the receipt is not a valid ghostbridge-receipt-v1"
    if len(rows) < n:
        return False, f"truncated: {n} rows were sealed, only {len(rows)} remain"
    if rows[n - 1]["hash"] != head:
        return False, f"rewritten: row {n} should end in the sealed hash {head[:12]}... but has {rows[n - 1]['hash'][:12]}..."
    extra = len(rows) - n
    return True, f"all {n} sealed rows unchanged" + (f"; {extra} row(s) appended after the seal" if extra else "")


def load(path):
    with open(path, "r", encoding="utf-8-sig") as fh:
        return json.load(fh)


def main(argv):
    args = list(argv[1:])
    receipt_path = None
    if "--receipt" in args:
        k = args.index("--receipt")
        if k + 1 >= len(args):
            print("usage: --receipt needs a file name"); return 2
        receipt_path = args[k + 1]
        del args[k:k + 2]
    if len(args) != 1:
        print("usage: python verify_evidence.py <ghostbridge-evidence.json> [--receipt <receipt.json>]"); return 2
    try:
        doc = load(args[0])
        receipt = load(receipt_path) if receipt_path else None
    except (OSError, ValueError) as exc:
        print(f"could not read input: {exc}"); return 2
    rows = doc if isinstance(doc, list) else doc.get("ledger") if isinstance(doc, dict) else None
    if not isinstance(rows, list):
        print("could not read input: expected a GhostBridge evidence export with a 'ledger' list"); return 2
    if receipt is not None and not isinstance(receipt, dict):
        print("could not read input: the receipt must be a JSON object"); return 2

    ok, checked, head, problem = verify_rows(rows)
    if not ok:
        print(f"NOT VERIFIED: {problem}. {checked} row(s) before it verified."); return 1
    print(f"VERIFIED: {checked} row(s); head {head}" if rows else "VERIFIED: empty ledger")
    if receipt is not None:
        r_ok, message = check_receipt(rows, receipt)
        print(("RECEIPT OK: " if r_ok else "RECEIPT FAILED: ") + message)
        if not r_ok:
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
