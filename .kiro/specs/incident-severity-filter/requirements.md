# GhostBridge incident severity filter — requirements

**Status:** Kiro-ready brief, prepared by ChatGPT on 2026-11-06. This file alone is NOT evidence of Kiro usage. A real Kiro session must review and implement it.

## User story
As a judge or building operator exploring a **synthetic** shift, I want to view incidents of a selected severity without losing access to the full event evidence, so I can triage findings without altering what happened.

## Acceptance criteria

### R1 — filter states
- The Incident desk exposes three keyboard-accessible filter choices: **All**, **High**, **Medium**.
- **All** is selected on initial load.
- Choices use severity values from the existing `r.payload.incident.severity` field. Do not infer classifications from UI text.
- Selecting **High** shows only high-severity incidents; **Medium** shows only medium-severity incidents; **All** shows every incident.

### R2 — no destructive filtering
- Filtering changes **only the Incident desk cards**.
- Event and incident counters still represent the full shift.
- The evidence timeline, inspection content, stored ledger, localStorage/SQLite, chain verification, tamper check, replay behavior, and JSON export remain unfiltered and unchanged.
- Both the browser-only GitHub Pages version and localhost Python version use the same UI behavior.

### R3 — empty and reset states
- If no incidents match, show a clear empty state that distinguishes "no matching incidents" from "no incidents detected in the shift".
- If there are no incidents at all, show the existing normal/no-finding message.
- Resetting the lab restores the **All** choice.
- Running a scenario and switching filters must not mutate or drop evidence.

### R4 — accessibility and responsive UI
- Selected filter is visually distinct and programmatically exposed (e.g. `aria-pressed`, accessible radio group).
- Buttons have keyboard activation and visible focus.
- Controls remain usable on narrow screens and do not obstruct incident inspection.

### R5 — correctness tests
- Test mixed severities, All/High/Medium behavior, zero matches, no incidents, switching filter back to All, and reset behavior.
- Assert filtering cannot mutate the input ledger or change canonical SHA-256 verification/export content.
- Run `python -m unittest discover -s tests -v`, `node --test tests/browser.test.mjs`, and `node --check docs/app.js`.

### R6 — honest Kiro provenance
- Implement using Kiro IDE or CLI signed in to the owner's authorized free personal account.
- Capture the actual Kiro prompt, changed files, test output, commit SHA, and a real Kiro session reference/screenshot in `docs/KIRO_EVIDENCE.md`.
- The existing application and initial `.kiro` specs were prepared with Codex; do not misattribute them to Kiro.
- No customer data, real device access, production InnerOS MCP, secrets, purchases, or paid model routing.