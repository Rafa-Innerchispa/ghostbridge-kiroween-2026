---
name: audit-evidence
description: Audit a GhostBridge evidence ledger or receipt. Use when asked to verify a ledger, check whether evidence was tampered with, find the first altered row, or check a ledger against a sealed receipt.
---

# Audit GhostBridge evidence

You are helping an auditor decide whether a building-security evidence ledger can be trusted. Report facts from tool results only. Never guess a hash, a row number or a verdict.

## Step 1: Get the ledger as text
- If the user gives a GhostBridge evidence export (`ghostbridge-evidence.json`, an object with a `ledger` list), use the JSON text of the `ledger` list exactly as written.
- If the user has no ledger, call `run_scenario` with `name: "night"` and say that the ledger is synthetic.

## Step 2: Verify
- Call `verify_ledger` with **`rows_json`** set to the ledger list as JSON text. Do not pass the rows as structured `rows`: hashes cover exact bytes, and empty objects such as `"data": {}` can be lost when arguments are passed as structures.
- If the result is `valid: true`, report `checked` and the `head` hash.
- If `valid: false`, report `failed_at` and the `reason` exactly, then explain it in plain words:
  - "stored hash does not match" means the content of that row changed after it was sealed.
  - "previous hash does not match" means a row was removed, inserted or reordered.
  - A `hint` about missing `data` or `incident` means the ledger was probably re-encoded by a tool, not necessarily tampered with; ask for the original file.

## Step 3: Receipt (if the user has one)
A receipt (`ghostbridge-receipt-v1`) records `rows` and `head` at sealing time. Compare: the ledger's row number `rows` must have hash `head`. If not, the history before the seal was replaced even though the chain verifies on its own. If there are more rows than sealed, they were appended later.

## Step 4: Show tamper detection (optional)
Call `run_scenario` with `name: "night"` and `tamper_seq: 2` to show that altering one record in a copy fails at exactly that row while the original stays valid.

## Always say
This is a local, tamper-evident SHA-256 chain on synthetic data. It is not a legal signature, an external timestamp or a connection to real hardware. An independent verifier anyone can run is at https://ghostbridge.innerchispa.us/verify/verify_evidence.py.
