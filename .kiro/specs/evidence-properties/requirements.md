# GhostBridge | Evidence properties across three implementations: requirements
**Status:** written by Kiro in a Kiro IDE session (2026-11-24) at the owner's request, together with the implementation.

GhostBridge's evidence rules exist three times, written separately: the Python engine (`ghostbridge/`), the browser engine (`docs/engine.mjs`, `docs/correlator.mjs`, `docs/evidence_receipt.mjs`) and the independent verifier anyone can download (`docs/verify/verify_evidence.py`). A judge or an auditor should not have to trust that they agree. They should be able to see that they agree on every input we can generate.

## R1: Chain soundness
- WHEN any valid sequence of synthetic events is recorded by the Python engine THEN its own verification and the independent verifier SHALL both report the chain valid, with the same row count and the same head hash.

## R2: Tamper detection at the exact row
- WHEN one recorded value in row k is changed THEN verification SHALL fail at row k.
- WHEN rows i < j are swapped THEN verification SHALL fail at row i.
- WHEN a row other than the last is deleted THEN verification SHALL fail at the position of the deleted row.
- The original ledger SHALL still verify after a tampered copy is checked.

## R3: What only a receipt can see
- WHEN the last rows are cut off, or a row is edited and every later hash recomputed, THEN the chain SHALL still verify on its own (this is a known limit, stated honestly).
- WHEN a receipt sealed the first m rows THEN a check against it SHALL report `truncated` if fewer than m rows remain, `rewritten` if a row at or before m was edited and recomputed, `matches` or `extended` otherwise.

## R4: The correlation rule
- WHEN a ledger holds exactly one access denial and one door opening, with any distractor events THEN a case SHALL form exactly when the door opens strictly after the denial, at most 300 s later, and stays open at least 120 s. The test oracle SHALL use the written limits, not the correlator's constants.
- Every case in any random ledger SHALL satisfy the rule, and no denial or door event SHALL appear in two cases.
- The same ledger SHALL always give the same cases, `correlate` SHALL NOT change its input, and the order in which events arrive SHALL NOT change which events are linked.

## R5: The three implementations agree
- WHEN the same events are recorded in Python and in the browser engine THEN row hashes, case ids, linked event ids and evidence hashes SHALL be identical.
- WHEN the same tampered ledger is checked THEN the browser engine and the independent verifier SHALL name the same first bad row.
- WHEN the same ledger and receipt are checked THEN the browser receipt check and the independent verifier SHALL give the same verdict.

## R6: Kept true automatically
- A Kiro hook SHALL run these properties and the Power checks whenever a file that defines the evidence rules is saved, including the Power's engine copy.
- Standard library only; no new dependencies; fixed seeds so every run is reproducible; failures name the seed and the case.
