# GhostBridge Kiro evidence — incident severity filter

**Date:** 2026-11-06
**Branch:** `feat/incident-severity-filter`
**Kiro product:** Kiro IDE (agentic session, Autopilot mode)
**Account type:** Owner's personal Google account — Kiro Free tier (50 credits/month)
**Kiroween context:** Owner reports submitting a 4 000-credit promotional request; grant unconfirmed at time of implementation.

---

## Provenance statement

The original GhostBridge application (`docs/engine.mjs`, `docs/app.js`, `docs/index.html`, `docs/styles.css`, `ghostbridge/`, `tests/`, `tests/night-ledger.json`) and the initial `.kiro/specs/` documents were authored **before this Kiro session** using Codex/ChatGPT.  
The following work was authored **by Kiro** in this session:

| File | Status | Description |
|---|---|---|
| `docs/filters.mjs` | **NEW — Kiro** | Pure, dependency-free severity filter module |
| `docs/app.js` | **MODIFIED — Kiro** | Filter state, control wiring, updated `render()` |
| `docs/index.html` | **MODIFIED — Kiro** | Severity filter control group in Incident desk |
| `docs/styles.css` | **MODIFIED — Kiro** | Styles for filter buttons, active state, empty-filter |
| `tests/filter.test.mjs` | **NEW — Kiro** | 17 severity filter regression tests |
| `docs/KIRO_EVIDENCE.md` | **NEW — Kiro** | This document |

---

## Prompt submitted to Kiro

> You are working on GhostBridge for Kiroween 2026. This is a new independent MIT-licensed project, currently using synthetic building signals only. Review AGENTS.md, KIRO.md, and both .kiro spec directories. Implement the incident severity filter according to .kiro/specs/incident-severity-filter/: All / High / Medium, default All, accessible controls. Filter Incident desk cards only, without changing full event and incident counters, evidence timeline, exported JSON, or SHA-256 ledger. Add dependency-free tests for mixed severities, zero matches, no incidents, reset, immutable input, and identical evidence verification. Run Python and Node tests, the JS syntax check, and check the browser lab. Capture your genuine Kiro session evidence in docs/KIRO_EVIDENCE.md, listing the Kiro product, prompt, file changes, tests, commit, screenshots, and limitations. Existing code/specs were previously prepared with Codex, so attribute Kiro only to what you actually implement now. Use only existing free credits; do not purchase or trigger cloud providers. No InnerOS production MCP, customer devices, credentials, or external agents. Work on a branch and show the diff before merging.

---

## File changes summary

### `docs/filters.mjs` (new)
- Exports `filterBySeverity(rows, severity)` — pure function, no side effects.
- Exports `SEVERITY_VALUES` frozen array `['all', 'high', 'medium']`.
- Reads severity from `r.payload.incident.severity` only (no UI-text inference).
- Throws `TypeError` on unrecognised severity value.
- Never mutates the input `rows` array or any row object.

### `docs/app.js` (modified)
- Added `import {filterBySeverity} from './filters.mjs'`.
- Added `let activeSeverity='all'` module-level ephemeral state.
- Added `updateSeverityButtons()` — syncs `aria-pressed` and `.filter-active` class.
- Updated `render()` to compute `visibleFindings = filterBySeverity(rows, activeSeverity)` for Incident desk cards only; `findings` (full) used for counters and labels unchanged.
- Distinguishes two empty cases: no incidents at all vs no incidents matching filter.
- Reset handler now sets `activeSeverity='all'` before repainting.
- Filter button click handlers wired to `$('filter-all')`, `$('filter-high')`, `$('filter-medium')`.

### `docs/index.html` (modified)
- Added `<div class="severity-filter" role="group" aria-label="Filter incidents by severity">` containing three `<button>` elements with `aria-pressed` attributes.
- Buttons: `id="filter-all"`, `id="filter-high"`, `id="filter-medium"`.
- Placed immediately above `<div id="incidents">` inside the Incident desk panel.

### `docs/styles.css` (modified — appended)
- `.severity-filter` flex container, gap, wrap.
- `.filter-label` muted uppercase label.
- `.severity-filter button` base style matches existing button family.
- `.severity-filter button.filter-active` green highlight, `#26351c` background.
- `.severity-filter button:focus-visible` purple outline matches global focus ring.
- `.empty-filter` orange tint for the "no matching severity" empty state.
- `@media(max-width:600px)` compact button padding.

---

## Test results

### New severity filter tests — `node --test tests/filter.test.mjs`

```
✔ SEVERITY_VALUES exports correct constants
✔ All returns all incidents from mixed-severity ledger
✔ High returns only high-severity incidents
✔ Medium returns only medium-severity incidents
✔ Zero matches: High on an all-medium ledger
✔ Zero matches: Medium on a zero-incident ledger
✔ No incidents: All returns empty array
✔ Switching back to All after a narrow filter
✔ Reset restores activeSeverity to all (simulated)
✔ Filter does not mutate input rows array
✔ Filter does not mutate individual row objects
✔ SHA-256 verification result unchanged after filtering
✔ Exported JSON is unaffected by filter state
✔ Full counters unchanged regardless of filter
✔ invalid severity throws TypeError
✔ empty ledger with any valid severity returns empty array
✔ Access Denied: Medium shows 1, High shows 0, All shows 1

tests 17 | pass 17 | fail 0
```

### Existing browser/engine tests — `node --test tests/browser.test.mjs`

```
✔ Night Watch: 5 events and 3 incidents
✔ Normal Shift: 4 events and no incidents
✔ replay is idempotent
✔ conflicting id is rejected
✔ tampering and middle deletion are detected
✔ serialization preserves chain
✔ threshold boundaries
✔ access denied is explained
✔ invalid events are rejected
✔ canonical field order
✔ UTC calendar validation matches Python
✔ browser and Python produce identical evidence chains

tests 12 | pass 12 | fail 0
```

### Python tests — `python -m unittest discover -s tests -v`

```
Ran 29 tests in 0.71s — OK
(18 CoreTests + 11 ServerTests, unchanged from pre-implementation)
```

### JS syntax checks

```
node --check docs/app.js     → OK
node --check docs/filters.mjs → OK
```

---

## Expected browser lab QA counts (manual verification targets)

| Scenario | Filter | Visible incident cards | Notes |
|---|---|---|---|
| Night Watch | All | 3 | door-held (high), long-dwell (medium), camera-offline (high) |
| Night Watch | High | 2 | door-held, camera-offline |
| Night Watch | Medium | 1 | long-dwell |
| Normal Shift | All | 0 | "no incidents" empty state |
| Normal Shift | High | 0 | "no incidents" empty state (not filter empty state) |
| Access Denied | All | 1 | access-denied (medium) |
| Access Denied | High | 0 | filter empty state (orange message) |
| Access Denied | Medium | 1 | access-denied |
| After Reset | All | 0 | activeSeverity restored to All, filter buttons reset |

Counters (events / incidents), evidence timeline rows, and exported JSON are
**unchanged** regardless of which filter is active.

---

## Invariants verified

- `docs/engine.mjs` — **not modified**. No rule changes, no hash changes.
- `tests/night-ledger.json` — **not modified**. SHA-256 fixture identical.
- `docs/engine.mjs` `verify()` passes before and after filtering on every test run.
- Exported evidence JSON always contains the full unfiltered ledger.
- `localStorage` and SQLite are never written with filter state.

---

## Limitations and honest notes

- No live browser screenshot captured in this session (headless environment). Manual QA of the GitHub Pages deploy is required by the owner before Devpost submission.
- `activeSeverity` is ephemeral JavaScript module state; it is not persisted across page reloads by design.
- The filter is UI-only and purely cosmetic; it does not affect any data layer.
- Kiro Autopilot performed all file edits and ran all tests within the IDE session. No external cloud inference, production connections, or paid model routing was used.
- The Devpost write-up must be updated by the owner after manual browser QA and YouTube demo recording.


---

## Phase 2 — PR A: local legacy adapters

**Date:** 2026-11-08
**Branch:** `feat/legacy-adapters`
**Kiro product:** Kiro IDE (agentic session, Autopilot mode)
**Issue:** [#3 — Kiro phase 2: local legacy adapters and explainable cross-signal cases](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/issues/3)

### Provenance statement

The original GhostBridge application and the `.kiro/specs/legacy-bridge-correlation/` planning documents were prepared with Codex/ChatGPT.  
The following was authored **by Kiro** in this session:

| File | Status | Description |
|---|---|---|
| `ghostbridge/adapters/__init__.py` | **NEW — Kiro** | Package marker |
| `ghostbridge/adapters/relay_csv.py` | **NEW — Kiro** | Legacy relay/contact CSV parser |
| `ghostbridge/adapters/access_webhook.py` | **NEW — Kiro** | JSON access-controller webhook validator |
| `ghostbridge/server.py` | **MODIFIED — Kiro** | Added `/api/adapters/access` endpoint |
| `ghostbridge/__main__.py` | **MODIFIED — Kiro** | Added `ingest-relay` CLI subcommand |
| `fixtures/relay_night_shift.csv` | **NEW — Kiro** | 4-event relay night-shift fixture |
| `fixtures/relay_normal_shift.csv` | **NEW — Kiro** | 2-event relay normal-shift fixture |
| `fixtures/access_webhook_denied.json` | **NEW — Kiro** | Denied access webhook fixture |
| `fixtures/access_webhook_granted.json` | **NEW — Kiro** | Granted access webhook fixture |
| `fixtures/README.md` | **NEW — Kiro** | Fixture documentation and replay commands |
| `tests/test_adapters.py` | **NEW — Kiro** | 78 adapter integration and security tests |

### Prompt submitted to Kiro

(See original KIRO.md prompt for Phase 1; Phase 2 prompt was submitted via the Kiro IDE chat panel referring to AGENTS.md, KIRO.md, GitHub Issue #3, and .kiro/specs/legacy-bridge-correlation/.)

### Design decisions

**relay_csv adapter:**
- Strict CSV schema: exactly five columns (`event_id`, `at`, `relay`, `state`, `duration_seconds`); extra or missing columns rejected.
- RELAY_MAP maps `north-door` → `door-01`; extensible for future relays.
- IDs prefixed `relay:` to prevent namespace collisions with built-in scenario IDs.
- `duration_seconds` required for OPEN, forbidden for CLOSED.
- Maximum 1 000 rows / 256 KiB per file.
- Duplicate IDs within one file rejected before ingestion; duplicate across calls is idempotent (Engine handles); conflicting IDs raise ValueError.

**access_webhook adapter:**
- Exactly four keys required (`event_id`, `at`, `reader`, `decision`); extra keys rejected.
- READER_MAP maps `archive-reader` → `reader-01`.
- IDs prefixed `access:`.
- Reuses existing Host/Origin/size/content-type guards via server.py.
- Endpoint: `POST /api/adapters/access`.

**CLI:**
- `python -m ghostbridge ingest-relay FIXTURE.csv [--database PATH]` is a one-shot command (no daemon, no file watcher).
- Prints per-event result including detected incident rule; exits non-zero on error.

### Test results

```
python -m unittest discover -s tests   → Ran 107 tests — OK
  (29 existing CoreTests + ServerTests, unchanged)
  (78 new TestAdapters)
node --test tests/browser.test.mjs     → 12 pass, 0 fail
node --test tests/filter.test.mjs      → 17 pass, 0 fail
node --check docs/app.js               → OK
node --check docs/filters.mjs          → OK
```

### Invariants verified

- `ghostbridge/core.py`, `storage.py`, `engine.py`, `simulator.py` — **not modified**.
- `tests/night-ledger.json` — **not modified**; cross-language SHA-256 fixture identical.
- All existing 58 tests (29 Python + 12 browser + 17 filter) continue to pass.
- `/api/events`, `/api/state`, `/api/verify`, `/api/scenario`, `/api/reset` — unchanged.

### Limitations

- `ingest-relay` is a one-shot CLI tool; no file watcher or daemon.
- RELAY_MAP and READER_MAP cover the two synthetic devices in the spec; real hardware mappings are out of scope.
- PR B (cross-source correlator) is a separate branch and PR, not included here.


---

## Phase 2 — independent PR A review, not authored by Kiro

**Date:** 2026-11-09  
**Pull request:** [#4](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/4)  
**Merged commit:** `9bd5cfb417cc82094d5baff493c8c6fe90e551c7`

After the original Kiro IDE commit `5b6d313`, a separate ChatGPT-assisted independent review identified and corrected two integration bugs in the documented `ingest-relay` CLI path: `--database` was not accepted after the subcommand as documented, and a conflicting ID could double-close SQLite before the final integrity verification.

The reviewer also tightened CSV header/row/duration validation, added **six reviewer-authored regression tests**, and made fixture import examples cross-platform for the owner's Windows Kiro IDE. Those reviewer changes **are not Kiro-authored**. The original adapter design, endpoints, fixtures, and 78 adapter tests remain attributable to Kiro IDE.

GitHub Actions on the corrected PR head `928e6ed2e45161818f53406ea10601a4dbaf1b44` passed **113 Python + 29 Node tests plus 2 syntax checks**. A successful CI run does not itself establish a live hardware integration.

The owner reported a successful one-use 4,000-credit Kiroween coupon redemption on 2026-11-09. The actual account usage balance is not exposed here. Neither the private redemption link nor any credentials were stored in this repo.

**Next genuine Kiro task:** Phase 2B cross-source correlator in a fresh branch. No PR B implementation is claimed yet.


---

## Phase 2B — PR B: cross-source case correlator

**Date:** 2026-11-09
**Branch:** `feat/cross-source-cases`
**Kiro product:** Kiro IDE (agentic session, Autopilot mode)
**Issue:** [#3 — Phase 2B correlation](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/issues/3)

### Provenance statement

Spec, design notes, and planning documents were prepared with Codex/ChatGPT.  
The following was authored **by Kiro** in this Phase 2B session:

| File | Status | Description |
|---|---|---|
| `ghostbridge/correlator.py` | **NEW — Kiro** | Deterministic Python correlator engine |
| `ghostbridge/server.py` | **MODIFIED — Kiro** | Added `GET /api/cases` read-only endpoint |
| `ghostbridge/__main__.py` | **MODIFIED — Kiro** | Fixed ASCII encoding for Windows (→ → ->) |
| `docs/correlator.mjs` | **NEW — Kiro** | JS parity correlator (identical rule, case ID derivation) |
| `docs/fixture_replay.mjs` | **NEW — Kiro** | Browser-only CSV/JSON adapter parsers |
| `docs/fixtures.js` | **NEW — Kiro** | Embedded fixture constants for offline replay |
| `docs/app.js` | **MODIFIED — Kiro** | `renderCases()`, Legacy Bridge Demo button, local mode fetch |
| `docs/index.html` | **MODIFIED — Kiro** | Cases panel, cases metric, Legacy Bridge Demo button |
| `docs/styles.css` | **MODIFIED — Kiro** | Case card styles, legacy-btn, 5-column metrics |
| `tests/test_correlator.py` | **NEW — Kiro** | 45 Python correlator + API tests |
| `tests/correlator.test.mjs` | **NEW — Kiro** | 43 Node correlator + fixture_replay tests |

### Correlation rule implemented

**Rule `denied-then-held-open`:** An `access.denied` event followed within 300 seconds by a `door.open` event held ≥120 seconds generates one `high`-severity correlated case.

- Operates on UTC timestamps, not ledger sequence order (handles out-of-order ingest).
- Each (denied, door) pair produces at most one case; earliest qualifying door wins.
- Case ID: `"case:" + SHA-256("denied_id|door_id")[:16]` — identical between Python and JS.
- Cases are derived projections — never inserted into the ledger or SHA-256 chain.

### Canonical demo

Ingest `fixtures/access_webhook_denied.json` (access:A001, 22:00:30Z) and `fixtures/relay_night_shift.csv`. The qualifying pair is `access:A001` → `relay:R003` (22:05:00Z, 270 seconds later, 130-second hold). One case produced.

### Test results

```
python -m unittest discover -s tests  → Ran 158 tests — OK
  107 original tests (all passing)
  45 new test_correlator.py tests
  6 pre-existing TestAdapterReviewRegressions (ASCII fix applied)
node --test tests/browser.test.mjs    →  12 pass, 0 fail
node --test tests/filter.test.mjs     →  17 pass, 0 fail
node --test tests/correlator.test.mjs →  43 pass, 0 fail
node --check docs/app.js              → OK
node --check docs/correlator.mjs      → OK
node --check docs/fixture_replay.mjs  → OK
node --check docs/fixtures.js         → OK
```

### Invariants verified

- `ghostbridge/core.py`, `storage.py`, `engine.py`, `simulator.py` — **not modified**.
- `tests/night-ledger.json` — **not modified**; SHA-256 fixture passes in both Python and Node.
- `/api/events`, `/api/state`, `/api/verify`, `/api/scenario`, `/api/reset`, `/api/adapters/access` — unchanged.
- Cases are never inserted into the SQLite ledger; `store.rows()` count unaffected.
- JSON export always contains the full unfiltered ledger; cases are absent from export.
- `GET /api/cases` is read-only; `POST /api/cases` returns 404.

### Limitations

- No headless browser screenshot in this session; manual QA on GitHub Pages is required.
- The Legacy Bridge Demo button is browser-only (offline fixture replay); it does not call `/api/adapters/access` or any live endpoint.
- Cases are re-derived on every `/api/cases` call; not cached (acceptable for a lab with synthetic data volumes).
- Real hardware, InnerOS, or production connections are not present.


---

## Phase 2B — independent post-Kiro code review (not Kiro-authored)

**Review date:** 2026-11-09.  
**Kiro's original Phase 2B commit:** `ab1fa7dfe002751e717a332eb5aaf422413ef381` on `feat/cross-source-cases`.  
**Reviewed PR:** [#5](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/5).  
**Merged commit:** `a8ad15483233eaa45900277c92ace234766bbd3c`.

The first Phase 2B correlator, Python /api/cases endpoint, JS parity implementation, browser fixture parsers, demo UI and original 43 Node tests were authored by **Kiro IDE Autopilot**. A subsequent **ChatGPT-assisted independent GitHub code review** identified and corrected the following issues, which **must not be attributed to Kiro**:

1. **Legacy replay button:** replaying after the new demo incorrectly invoked a nonexistent `scenario('legacy')`. It now replays the same fixture flow.
2. **Localhost mode:** the UI was mutating in-memory JS rows without storing them in Python SQLite, while `/api/cases` read the unmodified backend. The review corrected persistence through the loopback API, including the actual access JSON webhook; partial-error state is reloaded.
3. **Async case view:** render-generation token prevents stale asynchronous case results after Reset/replay.
4. **Integrity:** Python `GET /api/cases` now refuses to project cases when the ledger fails SHA-256 verification (HTTP 409). The browser UI likewise hides correlated cases from a failed-verification ledger and displays an error.
5. **CSV strictness:** JS browser replay now rejects extra/missing physical fields and non-decimal duration syntax, matching the existing stricter Python acceptance rules more closely.
6. **Independent tests:** three reviewer-authored Node tests cover malformed browser CSV inputs and one Python test verifies that corrupted ledgers produce HTTP 409.
7. **CI and Pages deployment gates:** both workflows now run the new Node correlator suite, syntax-check all five relevant JS modules, and run the full Python suite, not only the original browser/filter tests.

**Authoritative passing GitHub CI result on reviewed PR head** `266283ac5558cdade2c2efecacb2acc3cf9b2f4c`: **159 Python + 12 original Node + 17 severity-filter Node + 46 correlator Node + 5 JavaScript syntax checks = 239 checks, zero failures**, as verified from GitHub Actions job logs. The user-provided original Kiro session test report reflected the pre-review head (158 Python / 43 correlator Node).

**Limitations:** All data sources remain synthetic. GitHub CI does not prove a live GitHub Pages load or browser/mobile interaction for the new case dashboard; a separate interactive QA session is needed before video and final Devpost submission. No production InnerOS, customer access controller, live camera or physical relay is connected.
