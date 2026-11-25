---
name: incident-walkthrough
description: Walk an auditor through one GhostBridge incident from start to finish - the timing, the case decision, the evidence chain, a tamper test and how to check it independently. Use when asked to investigate an incident, prepare an audit, demo GhostBridge end to end, or "show me everything about this case".
---
# Walk through one GhostBridge incident, end to end
The goal is a short audit report an investigator could hand to someone else. Every fact in it must come from a tool result in this conversation. If a tool fails, say so and stop; do not fill gaps from memory.

## Step 1: The rule and the timing
Call `list_scenarios` once and state the rule with the limits it returns (window and hold threshold). Take the user's timing ("denied, then the door opened 4 minutes later and stayed open 2 minutes") as `delay_seconds` and `hold_seconds`. If none was given, use the reference incident: `delay_seconds: 270`, `hold_seconds: 130`.

## Step 2: The decision
Call `check_timing` with that timing. It builds a small synthetic example ledger in memory (an earlier door opening, the denial, the later door opening), runs the real rule and discards the ledger. It is a read-only "what would the rule decide" check: it never creates, changes or stores evidence, so say the case id and hashes belong to that example ledger.
- Case formed (`decision.case_formed: true`): give the case `id`, both `event_ids`, both `evidence_hashes` and the case `explanation`.
- No case: quote every `decision.failed_conditions` entry word for word.
- Then show the edges in one small table by calling `check_timing` twice more: 299/120 (case) and 301/119 (no case, each condition missed by one second). Run both; do not assume.

## Step 3: The evidence chain
From the same `check_timing` result report `integrity`: `valid`, `checked` and `head`. The second evidence hash of a case is the hash of the door row, so for the reference incident it equals `head`; say so only if the two values are actually equal. Explain in one sentence: each row's SHA-256 covers its content and the previous row's hash, so any later edit breaks the chain from that row on.
If the user has their own export (`ghostbridge-evidence.json`), also call `verify_ledger` with **`rows_json`** set to its `ledger` list as JSON text, exactly as written, and report the result.

## Step 4: Prove it detects tampering
Call `run_scenario` with `name: "night"` and `tamper_seq: 2`. From `tamper_demo` report `altered_field` and `verification_after_tamper` (`failed_at` and `reason`), and from `integrity` that the original still verifies. Then name what a chain cannot see on its own: a deleted last row, or a history rewritten with every hash recomputed. A sealed receipt covers that: it records the row count and head hash at one moment and is kept outside the system.

## Step 5: Hand-off
End with:
- **Verdict:** one line (case formed or not, chain valid or not).
- **Evidence:** case id, the two evidence hashes and the head hash, in a code block so they can be copied.
- **Check it yourself:** download https://ghostbridge.innerchispa.us/verify/verify_evidence.py and run `python verify_evidence.py ghostbridge-evidence.json --receipt ghostbridge-receipt.json`. It uses only the Python standard library and no GhostBridge code.

## Always say
Synthetic data, deterministic rules, a local tamper-evident chain. It is not a legal signature or an external timestamp, it is not connected to real doors, readers or cameras, and GhostBridge only recommends; a person decides.
