# qa-auditor: Phase 6 independent audit

Branch `feat/kiro-winning-experience`, uncommitted work (git status at start: 7 modified product/test files plus `.github/workflows/{ci,pages}.yml`, 11 untracked). Fresh run, 14 Nov 2026, headless Chrome over CDP, synthetic data only.

## Verdict: PASS WITH FINDINGS

Every required suite ran and passed. m0 passed 5 of 5 times. I found no product defect behind the earlier A30/A31/A32 failure. The findings below cover caption honesty, provenance headers, and evidence-file hygiene. None of them is a regression in behaviour.

## Suites (counts copied from real output; logs in `docs/evidence/phase6/audit-logs/`)

| Suite | Result |
|---|---|
| `python -m unittest discover -s tests -v` | Ran 186 tests, OK (0 fail, 0 skip) |
| node --test a11y_targets | 9/9 pass |
| node --test browser | 12/12 |
| node --test control_room | 27/27 |
| node --test control_room_wiring | 15/15 |
| node --test correlator | 46/46 |
| node --test filter | 17/17 |
| node --test forge-parity | 2/2 |
| node --test guard | 72/72 |
| node --test hooks | 7/7 |
| node --test playback | 20/20 |
| node --test property | 9/9 |
| node --test reconstruction-view | 23/23 |
| node --test reconstruction | 39/39 |
| node --test showcase | 19/19 |
| node --test signal_forge | 17/17 |
| node --test time_machine | 9/9 |
| node --test time_machine_view | 13/13 |
| node --test trust_lab | 10/10 |
| node --test trust_lab_view | 11/11 |
| node --test totals (19 files) | 377 pass, 0 fail, 0 skipped, 0 cancelled |
| node --check, 17 `docs/*.mjs` + `docs/app.js` | all exit 0 |
| m0-signal-forge run 1 to 5 | 56/56 each; 74 s, 80 s, 72 s, 81 s, 80 s; 0 harness retries |
| phase6-experience | 159/159 (112 s) |
| a11y-targets-after | 39/39 (37 s) |
| skip-link-audit | 32/32 (19 s) |
| forge-focus-audit | 40/40 (110 s) |
| m5-control-room (no QA_ONLY) | 141/141, 12 of 12 scenarios (288 s) |
| **phase6-audit.qa.mjs (new, mine)** | **NOT RUN** (see Limitations) |
| m0-a4-repro.qa.mjs (new diagnostic, mine) | **NOT RUN** (see Limitations) |

## m0 A30/A31/A32 intermittent failure

- **Observed here:** 0 failures in 5 consecutive full runs. No retries were logged.
- **Prior failure output:** none exists. The only m0 report (`docs/evidence/control-room/m0-signal-forge/REPORT.md`) is from a passing run. Also, A30, A31 and A32 pass no `detail` argument to `check()` (`tests/browser-qa/m0-signal-forge.qa.mjs`, A4 block), so a failure records no values.
- **Code analysis (`docs/control_room_view.mjs` lines 316-328, `docs/app.js` lines 267-272):**
  - `#signal-forge` click sets `hidden=false`. The MutationObserver then moves focus to `#forge-gap`, but only when focus is on body or the opener. The observer callback is a microtask, so it finishes inside the same `Runtime.evaluate` call as `b.click()`. It has already run before the harness focuses `#forge-gap` and presses keys.
  - `forge-close` sets `hidden=true`. The observer only moves focus when `!forge.hidden`, so it cannot pull focus away from `#signal-forge`.
  - The only asynchronous effect left is `scrollIntoView({behavior:'smooth'})`, and scrolling does not move focus.
  - I found no code path where Phase 5 or Phase 6 code changes focus or the slider value between the harness's `focus()` and its key press.
- **Pattern:** A30, A31 and A32 failed together. They use three different controls and three different keys (ArrowRight, Space, Enter), and they share only one thing: CDP `Input.dispatchKeyEvent` into that one tab. A focus race would hit one control. A key that never reached the page, or a page that reset under the test, hits all three. `lib.mjs` `goto()` documents exactly such a reset: Chrome reloads a newly opened tab about 1.5 s after the first navigation. A4 is also the shortest scenario. It sends keys a few hundred ms after open, with no wait and no `document.hasFocus()` check.
- **Conclusion:** most likely a harness timing or input-delivery issue, not a product defect. This conclusion comes from code reasoning plus 5 clean runs. I have not reproduced the failure.
- **Not yet done:** `tests/browser-qa/m0-a4-repro.qa.mjs` repeats A4 N times. For each attempt it records `document.hasFocus()`, `visibilityState`, a `performance.timeOrigin` reload check, the trusted keydown log and ms from open to key. It also runs a synthetic DOM-only control that never uses CDP input. It is written but not run. Run `node tests/browser-qa/m0-a4-repro.qa.mjs 20`. A failing attempt with `keysSeen=0` or `reload=true`, while `synthetic` passes, confirms a harness cause.
- **Harness fixes (test-only, owner's choice):**
  1. Add detail strings to A30, A31 and A32: value, `activeElement.id`, `document.hasFocus()`, `performance.timeOrigin`.
  2. In A4, wait until `#forge-panel` is visible and the document has focus before sending keys.
- **Product fix needed:** none.

## Findings by severity

### Medium

**M1. Time Machine shows computed times as "UTC time" with no label.**
- Beats 4 to 7 ("Door stays open", "Rule conditions", "Case appears", "Evidence chain") show `22:07:29 UTC`. No ledger row has that time.
- The time comes from `heldAt = door.sec + DOOR_HELD_THRESHOLD` (`docs/time_machine.mjs`, steps array, `at:` of the door-held, threshold, case and evidence steps).
- The ledger only holds `forge:later-door` at 22:05:29 with `duration_seconds: 120`. The case is created when that row is appended, not at 22:07:29.
- Seen in `docs/evidence/phase6/time-machine-1440-beat6.png` ("Beat 6 of 8 Case appears, UTC time 22:07:29 UTC") and `time-machine-390.png`.
- The number can be traced (ledger time + rule constant), but the page presents it the same way as a recorded time. This breaks check (9): it does not trace to a ledger row.
- **Fix:** label these as "computed: door opened 22:05:29 + 120 s threshold", or show a time only on beats that map to a recorded event.
- **Reproduce:** Challenge A, then Timeline, then click beat 6. Compare with `JSON.parse(localStorage['ghostbridge-ledger-v1']).map(r=>r.payload.event.at)`, which gives `22:00:00, 22:00:30, 22:05:29`.

**M2. Provenance headers say "Authored by Kiro" on files the brief says the owner wrote.**
- Files: `docs/time_machine.mjs:3`, `docs/trust_lab.mjs:3`, `tests/time_machine.test.mjs:3`, `tests/trust_lab.test.mjs:3`. Each reads "Authored by Kiro (Kiroween 2026, feat/kiro-winning-experience)".
- The brief says these were "written by the owner, not by an agent". AGENTS.md forbids claiming Kiro-generated work without evidence.
- **Fix:** the owner should correct the attribution, or attach evidence that Kiro produced the files.

### Low

**L1. Two QA scripts write the same report file.**
- Both `phase6-experience.qa.mjs` and `a11y-targets-after.qa.mjs` write `docs/evidence/phase6/REPORT.md`, and the last one to run wins.
- After my run, REPORT.md reads "a11y targets after (phase 6) 39 passed". The 159-check Phase 6 report is gone from disk. Its result is kept only in `audit-logs/phase6-experience.log`.
- **Fix:** give each script its own filename.

**L2. A30 to A32 cannot be diagnosed after a failure.**
- These checks carry no detail strings (see the m0 section), so a red run leaves nothing to analyse.

**L3. Restore may not look disabled in one screenshot.**
- In `trust-lab-valid-1440.png`, taken before any experiment, the Restore button looks as bright as Tamper.
- The code disables it (`paintControls`, `docs/trust_lab_view.mjs`), and `styles.css` sets `button:disabled{opacity:.45}`. Pause in the Time Machine shots is visibly dimmed by the same rule.
- Not confirmed. My script's check AU2.-1 (disabled and computed opacity < 1) was not run.

**L4. The reduced-motion preference is read at two different times.**
- `app.js` `scrollBehavior()` (line 12) reads the preference on every click.
- `mountControlRoom({reducedMotion})` and the Time Machine Play gate get a value once at mount.
- A user who changes the OS setting without reloading gets mixed behaviour. My check AU3.9 would record this but was not run. This comes from reading the source only.

**Info.** `docs/evidence/control-room/m0-signal-forge/forge-mobile-390-panel.png` shows the Forge preview text cut off by the building scene. This is the designed pinned stage (m5 S5.5 and S5.6 pass: the pinned scene does not cover Run). Element-clip screenshots under a sticky stage give a misleading picture. My AU5 occlusion probe was not run.

### Checks that passed (with the evidence)

1. **Captions and hashes match the ledger.** phase6-experience S1.14 to S1.18 read localStorage `ghostbridge-ledger-v1` and compare event ids, `#seq`, full hashes and the `title` attributes (all PASS). In the screenshots, beat 6 cites `edca35aab6…23d9` (row 2) and `d87cf90613…537c` (row 3). The Trust Lab blocks #2 and #3 show the same hashes. The near miss names "1 s outside the 300 s window" and "1 s below the 120 s threshold" (S2.7). My independent re-check (AU1) was not run.
2. **The Trust Lab leaves the real ledger alone.** S3.10, S3.14 and S3.15 (11 experiments): ledger bytes identical and the integrity label still "Verified". S3.17: only the ledger key exists in localStorage. In code, `tamperCopy` uses `structuredClone` (`docs/trust_lab.mjs`), and the view never writes storage.
3. **No innerHTML, no third-party requests, no console errors.**
   - Grep of `docs/*.mjs`, `app.js` and `index.html` finds `innerHTML` only in comments that say it is not used. The only `http://` strings are SVG namespaces.
   - m5 S1.9 and phase6 S6.9 found zero third-party requests. m0 C prints `external resources requested: []`.
   - Every suite's no-error checks passed.
4. **Keyboard-only path through both features:** phase6 S4.1 to S4.20 PASS. Focus rings are visible, and focus is never left on a disabled button.
5. **Reduced motion:**
   - phase6 S5.1 to S5.6: Play and Pause are disabled with a worded hint, nothing auto-advances, and transitions are 0s.
   - a11y-after: nav clicks jump instantly at all 3 viewports. For example at 1440, #vision scrollY goes straight to 1481, with the same value immediately and 700 ms later.
   - styles.css now sets `scroll-behavior:smooth` only under `no-preference`. All 3 `scrollIntoView` calls in app.js use `scrollBehavior()`.
6. **Target sizes and overflow:** a11y-after found 37 controls, all at least 40x40, at 1440x900, 1280x720 and 390x844. Phase6 S6 checked Time Machine and Trust Lab controls (including tampered state) at the same 3 sizes. Overflow: none. The Control Room nav link is visible at 390 (hero-390.png).
7. **Contrast:** hand-estimated WCAG ratios, because the script was not executed.

   | Text | Colours | Ratio |
   |---|---|---|
   | Muted text | #98a8a9 on #121b1e | ≈7.2:1 |
   | Teal times | #5fd4c4 on #101a1d | ≈10:1 |
   | Orange "did not happen" | #ffb17d on #17130f | ≈10:1 |
   | Purple hashes | #baaeeb on #101a1d | ≈9:1 |
   | Caption text | #e1ebe8 on #101a1d | ≈15:1 |
   | Unverifiable status | muted at opacity .9 | ≈6:1 |

   No text falls under 4.5:1. Disabled Pause and Restore buttons (opacity .45) are exempt under WCAG.
8. **Honesty:** the new modules contain no wording about real hardware or customers. The Trust Lab line reads "Experiment on an isolated copy. The ledger above is never changed." Contact: only `info@innerchispa.us` (index.html line 63, 3 occurrences). Exception: M2.

## Screenshots inspected with the image reader

All from this run:
- `phase6/time-machine-1440-beat6.png`, `time-machine-1440-near-miss-beat6.png`, `time-machine-390.png`
- `phase6/trust-lab-valid-1440.png`, `trust-lab-tampered-1440.png`, `trust-lab-390.png`
- `phase6/hero-1440.png`, `hero-390.png`, `nav-reduced-390.png`
- `control-room/m0-signal-forge/forge-301-119-no-case-desktop.png`, `forge-mobile-390-panel.png`

Not opened: `phase6/hero-1280.png`, `nav-reduced-1280.png`, `nav-reduced-1440.png`. Visual not verified for those three.

## Files I wrote (all under tests/ or docs/evidence/)

- `tests/browser-qa/phase6-audit.qa.mjs`: asserting independent re-check of (1), (2) and (5), plus an AU5 occlusion probe. All selectors are role, aria-label or text based. Not run.
- `tests/browser-qa/m0-a4-repro.qa.mjs`: A4 diagnostic. Not run.
- `docs/evidence/phase6/audit-logs/`:
  - `_chain.txt` and the per-suite `*.log` files
  - `run-chain.ps1`, `run-audit.ps1`, `contrast.mjs`
  - `_pre-status.txt`
- This report.

## Tracked files overwritten by the QA scripts (owner restores)

- `docs/evidence/control-room/m0-signal-forge/`:
  - REPORT.md
  - before-desktop-1440-hero.png, before-desktop-1440-workspace.png
  - forge-299-120-reconstruction-desktop.png, forge-301-119-no-case-desktop.png
  - forge-mobile-390-reconstruction.png, forge-mobile-390-panel.png
  - (5 runs, so the last run's files are on disk)
- `docs/evidence/control-room/m5/`:
  - REPORT.md
  - desktop-1440-01-hero, 02-challenge-A, 03-challenge-B, 04-timeline, 05-evidence-reconstruction, 06-response-after, 07-product-vision
  - showcase-1440-beat4-correlate, showcase-1440-beat6-evidence
  - mobile-390-01-hero to 05-showcase
  - desktop-1280-01-hero, desktop-1280-02-forge-case
  - plus any other shots in m5 not listed by name (all .png)
- `docs/evidence/agentic-validation/`:
  - forge-focus-open-1440.png, forge-focus-open-390.png, forge-focus-audit.json
  - skiplink-focused-1440.png, skiplink-focused-390.png, skip-link-audit.json
- `docs/evidence/phase6/` is untracked. Its REPORT.md and PNGs were regenerated by this run.

I could not run `git status` after the runs to confirm this list (see Limitations). It comes from the scripts' output paths.

## Limitations

- **The shell stopped responding** after the browser-QA chain finished. Every later `execute_pwsh` call (including `echo`) returned exit -1 with no output, and background starts produced no files. As a result:
  - `phase6-audit.qa.mjs` and `m0-a4-repro.qa.mjs` were written but not executed, and not `node --check`ed. So the independent checks (1), (2) and (5) were not re-run with my own selectors.
  - Coverage of (1), (2) and (5) relies on ui-director's phase6-experience script, which I ran myself (159/159), plus source reading.
  - The contrast script did not run. The ratios above are hand estimates.
  - No post-run `git status`.
- I could not reproduce the m0 A30 to A32 failure (0 of 5). The harness-cause conclusion rests on code analysis and has not been confirmed experimentally.
- One engine only (Chrome headless). 390 px is device emulation. No screen reader. Contrast was not measured from rendered pixels.
- `.github/workflows/ci.yml` and `pages.yml` are modified in the working tree: they add node --check and node --test for the 4 new modules and tests. I did not edit them and did not audit CI runs.
