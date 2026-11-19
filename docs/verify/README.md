# Verify GhostBridge evidence yourself

You do not have to trust GhostBridge. Its evidence is plain JSON, and the rule is simple enough to check with any SHA-256 tool.

1. In the app, open **Evidence** and press **Export evidence JSON** (and, if you want, **Seal** to download a receipt).
2. Download [`verify_evidence.py`](verify_evidence.py) (Python 3 standard library only; it does not import any GhostBridge code).
3. Run:
   ```
   python verify_evidence.py ghostbridge-evidence.json
   python verify_evidence.py ghostbridge-evidence.json --receipt ghostbridge-receipt.json
   ```
4. Change one character inside the export (for example a timestamp) and run it again: it reports the exact row that no longer matches.

## The rule
For each row, in order: `hash = SHA-256(previous_hash + "\n" + canonical_json(payload))`. The first `previous_hash` is 64 zeros. `canonical_json` sorts object keys and has no spaces. Each row's `previous` must equal the hash of the row before it.

## What a receipt adds
A hash chain reveals an edited, deleted or reordered row. Someone who recomputes every hash could still replace the whole history. A receipt records the head hash and row count at a moment in time; keep it outside the lab. If the history before the seal is replaced later, the sealed row no longer ends in the sealed hash, and the verifier says **rewritten**.

## Limits
This is a local, tamper-evident record, not a legal signature or an external timestamp. The receipt protects only what was sealed, and only if the receipt itself is kept somewhere the ledger's owner cannot change it.
