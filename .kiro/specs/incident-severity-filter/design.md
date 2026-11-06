# Incident severity filter — design proposal for Kiro review

**Origin:** ChatGPT pre-implementation design brief (2026-11-06). Kiro must review, refine as needed, implement, and record its actual work.

## Current verified code boundaries
- `docs/app.js`: `render()` derives `findings = rows.filter(r => r.payload.incident)` and paints Incident desk cards. `rows` is the full ledger.
- `docs/index.html`: Incident desk container `#incidents` and label `#finding-label`.
- `docs/engine.mjs`: `incident(e)` returns `severity` as `high` or `medium`. `verify(rows)` checks the full chain.
- `tests/browser.test.mjs`: Node built-in test runner. Python tests cover local service and ledger.
- `docs/styles.css`: responsive UI styles. No frontend framework, bundler, or extra dependencies.

## Proposed approach
1. Introduce UI-only state `activeSeverity = 'all'`. It is ephemeral and never written into `rows`, localStorage, SQLite, or exported evidence.
2. Implement a small pure filter function, preferably exported from a separate dependency-free module (e.g. `docs/filters.mjs`), with explicit accepted values `all`, `high`, `medium`. Do not mutate inputs.
3. Keep `findings` (all incidents) for aggregate counts and status labels. Compute `visibleFindings` for the Incident desk cards only.
4. Add accessible control group near the Incident desk title in `docs/index.html`, style in `docs/styles.css`, and wire change handling to `render()`. Use `aria-pressed` or proper radio semantics to identify selection.
5. Distinguish the two empty cases: no recorded incidents vs incidents exist but none match selected severity.
6. Change Reset handler to restore `activeSeverity='all'` before repainting.
7. Add tests for pure filter results and immutable ledger. Test selection and reset through DOM with a lightweight test harness if feasible without new packages.
8. Verify the existing hash fixtures remain identical and Python server endpoints are unchanged.

## Invariants
- Never replace or truncate `rows` when filtering.
- Never change `docs/engine.mjs` rules or canonical hashing to implement a UI-only feature.
- Never alter downloaded JSON payload based on a UI filter.
- Never imply real surveillance, AI-based anomaly detection, or certified immutable evidence.
- Keep the GitHub Pages demo working without a backend.

## Review checklist
- Desktop and 390px mobile: buttons readable, focus visible.
- Night Watch: **5 events / 3 incidents**. All -> 3, High -> 2, Medium -> 1.
- Normal Shift after reset: **4 events / 0 incidents** and clear empty state.
- Access Denied after reset: **1 event / 1 medium incident**; High shows no matching results; Medium shows 1.
- Evidence JSON and chain head identical before/after filtering.