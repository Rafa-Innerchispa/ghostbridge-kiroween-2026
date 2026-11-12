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


---

## Phase 3 — Interactive Evidence Reconstruction ([Issue #6](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/issues/6))

**Date:** 2026-11-10
**Branch:** `feat/evidence-reconstruction` (from `main` at `efb4ffa`)
**Kiro product:** Kiro IDE, Autopilot mode, spec-driven workflow
**Spec used:** `.kiro/specs/evidence-reconstruction/` (requirements, design, tasks). The specs were drafted by ChatGPT; this session implemented them and made the design changes listed below. Commit SHA and PR number are recorded in the pull request.

### Attribution

Everything below this line that is marked **Kiro** was written in this session. The baseline application and the earlier `engine.mjs`, `correlator.mjs`, adapters, and filters are unchanged in behaviour. Reviewer patches from PRs #4 and #5 are untouched. No Python file changed in this PR.

| File | Status | Description |
|---|---|---|
| `docs/reconstruction.mjs` | **NEW — Kiro** | Pure projection: verifies the chain, re-derives the case, builds ordered steps, exclusions and checks |
| `docs/playback.mjs` | **NEW — Kiro** | DOM-free playback state machine with an injectable scheduler |
| `docs/reconstruction-view.mjs` | **NEW — Kiro** | SVG 2.5D entryway, controls, inspector, error state (no `innerHTML`) |
| `docs/app.js` | **MODIFIED — Kiro** | Reconstruct button per case, open/close lifecycle, cleanup on run/reset/ledger change |
| `docs/index.html` | **MODIFIED — Kiro** | Hidden `#reconstruction` host section |
| `docs/styles.css` | **MODIFIED — Kiro** | Scene, controls, 390 px layout, focus, reduced-motion rules |
| `tests/reconstruction.test.mjs` | **NEW — Kiro** | 39 projection / integrity / no-hardcoding / CI-wiring tests |
| `tests/reconstruction-view.test.mjs` | **NEW — Kiro** | 23 view tests against a fake DOM |
| `tests/playback.test.mjs` | **NEW — Kiro** | 20 state-machine tests |
| `tests/helpers/fake-dom.mjs` | **NEW — Kiro** | Dependency-free DOM stand-in and manual scheduler |
| `.github/workflows/ci.yml`, `pages.yml` | **MODIFIED — Kiro** | New syntax checks and test files run in CI and before Pages deploy |
| `.kiro/steering/evidence-reconstruction.md` | **NEW — Kiro** | Steering rule (see below) |
| `.kiro/hooks/reconstruction-tests-on-save.json` | **NEW — Kiro** | Bounded test hook (see below) |
| `docs/evidence/screenshots/*.png` | **NEW** | 14 automated browser captures (see limitations) |

### Prompt for this session

> Continue GhostBridge from the latest main branch. Execute GitHub Issue #6: Interactive Evidence Reconstruction. Read AGENTS.md, KIRO.md, docs/WINNING_DEMO_STRATEGY.md, docs/DEMO_SCRIPT.md, and the complete .kiro/specs/evidence-reconstruction/ specification. Use Kiro IDE Autopilot and spec-driven development to build the premium, interactive 2.5D incident reconstruction directly into the working GhostBridge dashboard. Implement timeline playback, evidence-linked visualization, accessible controls, desktop/mobile responsiveness, and comprehensive tests. Preserve all existing functionality and SHA-256 ledger integrity. Use local execution and the available Kiro promotional credits. Create branch feat/evidence-reconstruction, implement, test, capture genuine Kiro evidence, push and open a PR. Stop before merging. Do not submit Devpost.

### What was built

A **Reconstruct case** button on each correlated case opens a read-only reconstruction. It shows a stylized 2.5D entryway (reader, door, desk, light pool), a causal link labelled with the measured gap, a to-scale ruler, Play / Pause / Previous / Next / Restart, a 0.5×–4× speed control, a timeline slider, an evidence sequence list, a "Why this matches" panel, and an evidence inspector showing event ID, UTC time, source device, hold duration, ledger row, detection rule, and the full SHA-256 row and previous hashes.

For the demonstration data it shows `relay:R001` (22:00:00Z) considered and excluded because it precedes the denial by 30 s, `access:A001` (22:00:30Z) as the anchor, `relay:R003` (22:05:00Z, held 130 s) as the match 270 s later, and the derived high-priority case. None of those values appear in the source: the renderer reads them from the ledger (a test scans the source for fixture literals, and another feeds different data and checks nothing leaks).

### Design decisions that differ from the draft design

- **Case is re-derived, not trusted.** `buildReconstruction` verifies the SHA-256 chain, then calls `correlate()` and requires the supplied case to match the derived one (ID, event IDs, hashes). A forged, stale, or tampered case produces an explicit error state and no scene.
- **Playback split into `playback.mjs`** so timing logic is testable without a browser.
- **Thresholds are imported** from `correlator.mjs`, never copied.
- **Camera icon omitted.** The spec called it optional; including it risked implying camera imagery. The UI states it is not camera footage and not a live connection.
- **Reconstruction closes** on scenario run, Legacy Bridge Demo, replay, reset, or when its case leaves the verified ledger, so it can never outlive its evidence.
- **Reduced motion:** transitions and the pulse animation are disabled. Auto-play remains available only on explicit user request and can always be paused.

### Kiro steering and hook (what is and is not claimed)

- **Steering rule — used.** `.kiro/steering/evidence-reconstruction.md` (file-match inclusion) records the invariants for this feature: verify before drawing, no hardcoded fixture values, reuse correlator thresholds, never mutate or persist, no surveillance claims. I followed it while building, and two tests enforce it (the source scan and the threshold-import check).
- **Hook — configured, not observed.** `.kiro/hooks/reconstruction-tests-on-save.json` was created with Kiro's `createHook` tool. The tool reported it becomes active at the next session start. **I did not see it fire**, so it is not claimed as working automation. The command it runs was executed manually and passed.

### Test results

| Check | Result |
|---|---|
| `python -m unittest discover -s tests` | 159 tests, OK (unchanged; no Python files changed) |
| `tests/browser.test.mjs` | 12 pass |
| `tests/filter.test.mjs` | 17 pass |
| `tests/correlator.test.mjs` | 46 pass |
| `tests/reconstruction.test.mjs` | **39 pass (new)** |
| `tests/reconstruction-view.test.mjs` | **23 pass (new)** |
| `tests/playback.test.mjs` | **20 pass (new)** |
| `node --check` on 8 modules wired into CI | 8 OK |

Totals: 159 Python + 157 Node + 8 syntax checks = **324** (previously 159 + 75 + 5 = 239; the new work adds 82 Node tests and 3 syntax checks).

Baseline was confirmed green on clean `main` before any edit.

**Mutation sanity check.** I deliberately broke six guards and confirmed the tests fail: skipping the integrity check (3 tests failed), skipping the case/hash comparison (2), a reader that never shows "denied" (2), an always-visible case chip (2), a never-disabled Next button (1). One mutant survived: removing the row-hash comparison, because `correlate()` derives those hashes from the same rows, so that branch is currently unreachable. It is kept as defense in depth and the corresponding "Source hashes match" and "Hash chain verified" checks are computed from data instead of hardcoded.

### Browser QA

89 scripted checks, all passing, run in headless Google Chrome driven over the DevTools protocol against (a) the browser-only build served from a non-localhost address and (b) the real Python + SQLite server on a throwaway database. They covered: the 5 events / 3 incidents / 1 case result; the step-by-step story and the 270 s link; keyboard operation (Enter, ArrowRight, visible focus ring); real-timer auto-play and pause; focus return on close; replay adding 0 duplicates; severity filters (3 / 2 / 1); verify and tamper detection; persisted ledger contains no case or reconstruction data; Night Watch 5/3/0, Normal Shift 4/0/0, Access Denied 1/1/0 unchanged; reset; 390 px layout (no horizontal overflow, controls ≥ 44 px, accessible names); `prefers-reduced-motion`; a tampered stored ledger being refused with no button and no scene; Python `/api/cases` ID equals the browser-derived ID; inspector hashes equal the SQLite ledger hashes; SQLite persistence across reload; and zero page exceptions or console errors.

**Problems the QA found and I fixed:** (1) my first screenshots were captured mid-transition, so the link and progress bar were missing; capture now waits for transitions to settle. (2) At 390 px the case chip was overlaid on the small scene and hid the 270 s label; the HUD now flows above the scene on narrow screens. (3) The Next button wrapped alone onto its own row on mobile; the three step buttons now share one row.

### Screenshots (`docs/evidence/screenshots/`)

`desktop-01…05` (case panel, start, denied, held-open with link, case derived), `mobile-01/02` (390 px), `local-01…05` and `local-python-final` (real Python + SQLite server), `refusal-tampered-ledger`.

### Limitations — please read

- **These screenshots are automated headless-Chrome captures, not Kiro IDE screenshots.** I cannot capture the Kiro IDE window. A genuine screen capture or recording of the Kiro session, and the Kiro usage dashboard, must be supplied by the owner.
- **Kiro credit consumption was not measured.** I have no access to the usage dashboard from this session, so no credit figure is reported. Check https://kiro.dev/account/usage.
- **Browser coverage is one browser.** Only Chrome was exercised. Firefox, Safari, and real mobile devices were not tested; the 390 px result is Chrome device emulation.
- **Accessibility is partly verified.** Keyboard operation, focus visibility, accessible names, target sizes, and reduced motion were checked. Colour contrast was not measured, and no screen reader was used. This is not a WCAG conformance claim.
- **Clicks in the QA run used `element.click()`**, with real key events only for the keyboard checks.
- **The scene is stylized and synthetic.** It is not camera footage and implies no hardware connection or surveillance.
- **The hook has not been observed running** (above).
- **CI result:** PR [#8](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/8), feature commit `5b59027`. GitHub Actions `test` passed on the Linux runner (Python 159 OK; Node 12, 17, 46, 39, 23 and 20 passing, 0 failing), and GitGuardian passed.
- **One unexplained transient Python error.** During local final verification a single run reported `FAILED (errors=1)`. The traceback was not captured and it did not recur in 17 later runs (clean and under CPU load), nor in CI. No Python file is changed in this PR, but the cause is unknown.
- This feature is a build for the product demonstration. The cinematic film, mobile app concepts and multi-site console in the demo script are separate and not built here.


---

## Phase 4: Immersive Control Room ([Issue #11](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/issues/11))

**Date:** 2026-11-11
**Branch:** `feat/kiro-immersive-control-room`, stacked on `feat/signal-forge-interactive` (PR #10, still a draft)
**Pull request:** [PR #14](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/14), **draft**, base `feat/signal-forge-interactive`. It depends on [PR #10](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/10) (Signal Forge, also a draft). Neither PR is merged, and #14 stays a draft until #10 is reviewed and integrated, after which #14 must be retargeted to `main`.
**CI on PR #14 (GitHub Actions):** `test` (x2) and GitGuardian passed. The log shows Python `Ran 169 tests`, 13 Node suites with 318 pass and 0 fail, and the new suites executed.
**Kiro product:** Kiro IDE, Autopilot mode, spec-driven workflow
**Spec:** `.kiro/specs/immersive-control-room/` (requirements in EARS form, design, tasks). The master brief (`docs/KIRO_IMMERSIVE_CONTROL_ROOM_MASTER_BRIEF.md`) was written by ChatGPT; it was read, challenged where the code disagreed (see "Design changes"), and implemented here.

### Attribution

| Authored by | What |
|---|---|
| Codex / ChatGPT (not Kiro) | The baseline lab, `engine.mjs`, adapters, and **Signal Forge (PR #10: `signal_forge.mjs`, its composer markup, its `runForge` code and tests)**. Not edited. At runtime the Control Room moves the composer's DOM node into a drawer beside the building; its ids and handlers are untouched. |
| Kiro (earlier PRs) | Severity filter (#2), adapters (#4), correlator (#5), Evidence Reconstruction (#8). Reused as is. |
| **Kiro (this phase)** | Everything listed in the file table below. |

PR #10 was **validated, not edited**: 56 real-browser checks, no Forge defect found (`docs/evidence/control-room/m0-signal-forge/REPORT.md`).

### What was built

- **Living building (first viewport).** A stylized residential entrance in five SVG depth layers with a pointer parallax, four source markers (door, reader, camera, presence), and four keyboard-operable source buttons. Every device state is derived from the ledger by `deriveScene()`; nothing is a canned animation.
- **Physics of the rule.** A door is "open" when it opens and "held open" only once the hold threshold has been reached; the case link is drawn at that moment, not when the door opens. Cause is visible: badge red, time advances, door amber, link draws, case chip.
- **Signal Forge inside the building.** The existing composer is moved (not re-implemented) into a drawer beside the facade, with live rule gauges (window 300 s, hold 120 s, read from the correlator) and two boundary challenges: A = 299 s / 120 s (a case), B = 301 s / 119 s (no case, with the exact failed condition by "1 s"). On a phone the building is pinned to the top while the controls scroll.
- **Operator modes.** Building, Timeline, Evidence, Response. State (selected source, time cursor) survives mode changes. The Timeline scrubs the building through recorded time; Evidence shows full SHA-256 hashes, chain verification and the existing Evidence Reconstruction; Response answers six operator questions and shows the **Disconnected alarms to one explained incident** reveal. Recommendations are advisory text; nothing controls a device.
- **PRODUCT VISION.** One labelled chapter with four concept screens (mobile alert, floor-by-floor twin, multi-property portfolio, evidence-based escalation with a human approval gate). The only contact is `info@innerchispa.us` (owner-provided); no phone, address or price.
- **Showcase Mode.** About 58 s, 8 beats, Play / Pause / Restart / Exit, `?present=1`. Each beat drives the **real ledger**: reset, append the real forge events one at a time, verify, correlate, reconstruct. Captions are filled from the live ledger.

### Files

| File | Status |
|---|---|
| `docs/control_room.mjs` | **NEW** pure model: scene, pair explanation, timeline, before/after, board, recommendations |
| `docs/control_room_scene.mjs` | **NEW** SVG scene |
| `docs/control_room_view.mjs` | **NEW** view and controller |
| `docs/showcase.mjs`, `docs/showcase_view.mjs` | **NEW** timer state machine, and overlay with real-ledger actions |
| `docs/control_room.css` | **NEW** scene, console, vision, showcase, responsive, reduced motion |
| `docs/index.html`, `docs/app.js`, `docs/styles.css` | **MODIFIED** hero replaced; a bridge object; `@import` of Google Fonts replaced by local `@font-face` |
| `docs/fonts/*`, inline favicon | **NEW** vendored OFL fonts (the page made two third-party requests and one 404 on every load before) |
| `ghostbridge/server.py` | **MODIFIED, separate commit**: drain unread request bodies (see "Defects found") |
| `tests/*` | **NEW** 7 Node suites, 1 Python suite (fixture + drain), browser QA harness and scripts |
| `.kiro/specs/immersive-control-room/*`, `.kiro/steering/control-room.md`, `.kiro/hooks/*`, `.kiro/agents/*` | **NEW** |

### Kiro features actually used

- **Spec-driven development.** `requirements.md` (EARS, R1 to R9), `design.md`, `tasks.md`, ticked only after each validation ran. The spec was revised by what the code taught: WebGL was rejected with reasons; the "no hidden scripting" rule shaped the Showcase to call the real ledger.
- **Steering.** `.kiro/steering/control-room.md` (file-match). It drove concrete decisions: no `innerHTML`, no third-party requests (which is why the fonts were vendored), contact limited to one address, advisory-only recommendations. Three tests enforce it.
- **Hooks (observed).** A `PreToolUse` hook (`guard-destructive`) blocks force-push, pushes to `main`, `reset --hard`, PR merges, process kills by name, recursive deletes outside the project/temp, system changes and secret reads. **It fired during this session**: it blocked a legitimate command (`Exit 2`, reason shown) because the rule for secret files mistook `process.env` for a `.env` file. That is both the first observed execution and a real defect in my rule; I fixed it (the file name may not follow a word character), made the rule catch both orders (`type .env` was previously missed), and added regression tests. The guard has 72 tests.
- **Custom agents.** `ui-director` and `qa-auditor` were created with Kiro's agent creator and written to `.kiro/agents/`. They were **not invoked**: Kiro loads agent files at startup and no restart happened in this session. No contribution is claimed for them.
- **Sub-agent.** The `custom-agent-creator` sub-agent was used for the two agent files above.
- **MCP / Powers.** None installed or used: no browser or design tool was available in this workspace, so real-browser QA was done with a small dependency-free Chrome DevTools harness written for this repo.
- **Property-based tests.** Seeded generators (400 random configurations plus 231 exhaustive boundary points) check the engine, the explanation, the scene and the reconstruction against an independent oracle, and monotonicity, determinism, idempotency, arrival-order independence and tamper detection.
- **Mutation checking.** Six deliberate breaks of the Control Room model (`<` for `<=` in the window, `>` for `>=` in the hold, ignoring evidence hashes, drawing a near-miss as a case, and two more) were made to confirm the tests catch them. One initially survived: with a single denial the code fell back to a path that hid the difference, which was a real gap in multi-denial coverage. Tests were added and all six now fail when the code is broken.

### Design changes made after reading the code

1. **SVG, not WebGL.** The brief allowed Three.js "if justified". It is not: the story needs depth, light and cause, not a free camera. About 120 nodes, no dependency, no fallback to maintain.
2. **Forge as a drawer inside the stage.** The first version left the composer below the fold; running it scrolled the building out of view. Screenshots showed the problem; the composer now sits beside the building.
3. **Hold-threshold physics.** The first Showcase run showed the link appearing the instant the door event arrived, leaving beat 4 with nothing to show, and it was physically wrong (the rule needs 120 s of hold). The scene now models the threshold.
4. **`explainPair` fallback.** With no qualifying pair it explained the earliest denial; it now explains the closest pair, which is the one an operator wonders about.
5. **Third-party fonts removed.** `fonts.googleapis.com` and `fonts.gstatic.com` were requested on every visit, which contradicted the local-first claim.

### Defects found and fixed along the way

- **`ghostbridge/server.py` (pre-existing, baseline code).** 413, 415 and 403 replies were sent without reading the request body; closing a socket with unread data makes TCP send RST and the client could lose the reply. It made `test_server.test_large` and `test_adapters.test_oversized_body_returns_413` fail in **5 of 12** full runs on Windows (this was the unexplained `FAILED (errors=1)` reported in the previous phase). Root-caused with raw-socket tests that fail 4 of 4 against the old server and pass 8 of 8 against the fix. Separate commit; the full Python suite is green in **20 of 20** runs afterwards.
- **Chrome and Edge 157 reload a new tab once, about 1.5 s after the first navigation** (measured on a plain text file with a fresh profile). My first full QA run lost clicks to it. Not a GhostBridge defect; the harness now waits for the document to be stable.
- **Harness leak.** `proc.kill()` left Chrome children alive (115 orphans earlier). The whole process tree is killed now.

### Test results

Measured on this machine at the end of the work (Windows, Node 24, Python 3.12, Chrome 157):

| Check | Result |
|---|---|
| Python `unittest discover` | **169 tests**, green in **10 of 10** full runs (was 159; +4 forge parity, +6 server drain) |
| Node, 13 suites | **318 pass, 0 fail** (browser 12, filter 17, correlator 46, reconstruction 39, reconstruction-view 23, playback 20, signal_forge 17, **control_room 27, showcase 19, property 9, forge-parity 2, control_room_wiring 15, guard 72**) |
| `node --check` on every `docs/*.mjs|js` | 15 of 15 |
| Python/JavaScript parity | 100 configurations: identical SHA-256 row hashes, case ids and evidence hashes |
| Property tests | 400 seeded random + 231 exhaustive boundary configurations; plus monotonicity, determinism, idempotency, arrival order, tamper |
| **Real-browser QA, Control Room** | **141 of 141 checks**, 12 scenarios, **0 harness retries** (`docs/evidence/control-room/m5/REPORT.md`) |
| Real-browser QA, Signal Forge intake | 56 of 56 checks (`docs/evidence/control-room/m0-signal-forge/REPORT.md`) |

Total automated checks: 169 + 318 + 15 = **502** (previous baseline on `main`: 324). The Chrome QA scripts (`tests/browser-qa/`) are run by hand and are not part of CI, which has no browser.

The browser QA covered, in Chrome: the first viewport at 1440x900 and 1280x720; both challenges with the exact failed conditions; scene, strip, chip and link states; source inspector hashes against the ledger; mode switching with preserved state and keyboard (roving tabindex, arrows, Home, End); timeline scrubbing; evidence hashes and chain verification; reconstruction from the Control Room; before/after reveal and the six-question board; product vision; a **full timed Showcase run** (beat order observed against ledger writes, wall time 45 to 65 s, final ledger of 3 real events and 1 case, chain verified); pause, resume, restart, Escape; 390 px (no overflow, pinned building while forging, 40 px targets); reduced motion; local Python + SQLite (case id equals `/api/cases`, persistence across reload, Showcase writing through the Python API); every older feature (Night 5/3/0, Normal 4/0/0, Denied 1/1/0, Legacy 5/3/1, filters, replay, tamper, JSON export, reset, "Watch an incident unfold"); accessibility names, roles, live regions and sampled text contrast; zero third-party requests, zero 404s, zero console errors.

Screenshots (automated, inspected): `docs/evidence/control-room/m5/` and `.../m0-signal-forge/`.

### Limitations

- **Screenshots are automated Chrome captures, not Kiro IDE screenshots.** A real capture of the Kiro session and the usage dashboard must come from the owner.
- **Kiro credit use could not be observed** from inside the session, so no figure is given.
- **One browser engine.** Chrome 157 (and Edge 157 for one probe). 390 px is device emulation, not a real phone. Safari and Firefox were not tested.
- **Accessibility is partly verified:** names, roles, tab order, focus rings, target sizes, reduced motion and sampled text contrast were checked; no screen reader was used and this is not a WCAG claim.
- **The scene is stylized and synthetic**: not camera footage, no live hardware, no device control.
- **The custom agents are untested** (not invoked) and the Python-side `ui-director` / `qa-auditor` boundaries are enforced only by their prompts.
- **PR #10 is a draft.** This stack must be retargeted to `main` after #10 merges; the branch was not deployed.
