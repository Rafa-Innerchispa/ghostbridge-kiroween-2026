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
