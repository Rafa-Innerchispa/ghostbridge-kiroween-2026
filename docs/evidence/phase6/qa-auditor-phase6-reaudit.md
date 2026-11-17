# qa-auditor: Phase 6 re-audit (fresh independent run)

## Verdict: PASS WITH FINDINGS

Python, all 19 node test files, `node --check`, phase6-audit (37/37) and phase6-experience (159/159 on the second run) are green, and the four product-side fixes check out. Two things are not green and I could not close them: the first phase6-experience run failed 3 checks, and both m0-signal-forge runs failed (22/27 and 45/47). Both traced to a documented browser tab reload that I measured happening 2.6 to 8.9 s after navigation, well beyond the harness's 2.2 s settle window (see "Flakiness"). I did not get a green m0 run in this session because the shell stopped responding after the m0 reruns and diagnostics (same failure as the previous audit).

## Suites (counts copied from real output)

| Suite | Result |
|---|---|
| `python -m unittest discover -s tests` | Ran 186 tests, OK (0 fail, 0 skip) |
| node --test a11y_targets | tests 9, pass 9, fail 0, cancelled 0, skipped 0 |
| node --test browser | 12 / 12 pass, 0 fail, 0 skipped |
| node --test control_room | 27 / 27 |
| node --test control_room_wiring | 15 / 15 |
| node --test correlator | 46 / 46 |
| node --test filter | 17 / 17 |
| node --test forge-parity | 2 / 2 |
| node --test guard | 72 / 72 |
| node --test hooks | 7 / 7 |
| node --test playback | 20 / 20 |
| node --test property | 9 / 9 |
| node --test reconstruction-view | 23 / 23 |
| node --test reconstruction | 39 / 39 |
| node --test showcase | 19 / 19 |
| node --test signal_forge | 17 / 17 |
| node --test time_machine | 10 / 10 (was 9; new M1 test) |
| node --test time_machine_view | 13 / 13 |
| node --test trust_lab | 10 / 10 |
| node --test trust_lab_view | 12 / 12 (was 11; new AU2.-1 regression test) |
| node --test totals | 19 files, 379 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo (summed from per-file output) |
| node --check, 17 `docs/*.mjs` + `docs/app.js` | all 18 exit 0 |
| phase6-audit.qa.mjs | **37 passed, 0 failed, 37 total** |
| phase6-experience.qa.mjs run 1 | **156 passed, 3 failed, 159 total** (S1.6.2, S1.7.2, S1.14) |
| phase6-experience.qa.mjs run 2 | **159 passed, 0 failed, 159 total** |
| m0-signal-forge.qa.mjs run 1 | **22 passed, 5 failed, 27 total** (A2, A3, B, E driver errors, plus "All 7 scenarios") |
| m0-signal-forge.qa.mjs run 2 | **45 passed, 2 failed, 47 total** (A2 driver error: `events-count` null; "All 7 scenarios") |

The previous audit had m0 at 56/56 five times in a row. Every m0 failure here is a driver error (an element is null, or `Page.navigate` timed out), not a failed product assertion.

## Status of earlier findings

| Id | Status | Evidence |
|---|---|---|
| M1 derived times | **Fixed.** | Screenshots below show "Derived UTC time 22:07:29 UTC (Derived, not recorded: the door's recorded open time plus the 120 s hold threshold.)" and beat buttons "≈ 22:07:29 UTC · derived" on beats 4 to 7. Beats 2 and 3 show recorded times 22:00:30 and 22:05:29. Beats 1 and 8 have no time. Unit test passes. |
| M2 attribution | **Partly fixed. Still wrong in 6 files.** | See below. |
| L1 two scripts write one REPORT.md | **Open.** `phase6-experience.qa.mjs:347` and `a11y-targets-after.qa.mjs:96` both write `docs/evidence/phase6/REPORT.md`. Last one run wins. Currently holds the experience result (159/159) because it ran last. |
| L2 A30 to A32 have no detail strings | **Open.** `m0-signal-forge.qa.mjs` is unchanged. |
| L3 Restore may look enabled | **Closed.** AU2 INFO: Restore disabled, opacity 0.45, and AU2.-1 passes. |
| L4 reduced-motion read at two times | **Open, by design.** AU3.9 INFO: after a live preference change without reload, Play stays disabled (value read once at mount), while `scrollBehavior()` reads it per click (AU3.8 passes). |
| AU1.A.5 | **Legitimate correction.** See below. |
| AU1.B.3 | **Legitimate, with a small residual gap.** See below. |
| AU2.-1 | **Real defect, fixed, and verified.** See below. |
| AU5.1 | **Partly a weakening.** See below. |

### M2: header check (who wrote what, per the brief)
- Correct now: `docs/time_machine.mjs:3`, `docs/trust_lab.mjs:3`, `tests/time_machine.test.mjs:3`, `tests/trust_lab.test.mjs:3` (Kiro's main session agent). `docs/time_machine_view.mjs:3` (ui-director plus main session for the M1 change). `phase6-audit.qa.mjs:2` ("Written by qa-auditor"). `phase6-race-repro.qa.mjs:4` (mine).
- **Wrong:** these say "Authored by Kiro (Kiroween 2026, ...)" but the brief says ui-director wrote them:
  - `docs/trust_lab_view.mjs:3`
  - `tests/trust_lab_view.test.mjs:3`
  - `tests/time_machine_view.test.mjs:3`
  - `tests/browser-qa/phase6-experience.qa.mjs:3`
- `a11y-targets-after.qa.mjs` and `tests/a11y_targets.test.mjs` have no "Authored by" line, so they make no false claim (ui-director wrote the former; I did not check who wrote the latter's edits).
- I did not edit these: none is a file I wrote. Owner should change them to "ui-director custom Kiro agent" (plus "main session" where it edited them, for example the AU2.-1 test and the `refresh()` fix).
- `tests/browser-qa/m0-a4-repro.qa.mjs` and `phase6-audit.qa.mjs` carry qa-auditor headers. Correct.

### AU2.-1 fix (Restore enabled without an experiment)
- `docs/trust_lab_view.mjs:175-181`: `refresh()` calls `paintControls(rows)` when the signature is unchanged. `docs/time_machine_view.mjs` `refresh()` ends with `paintBeats()`.
- Regression test `tests/trust_lab_view.test.mjs:203-216` forces Restore enabled, calls `refresh()`, and expects disabled; it also checks Restore stays enabled while an experiment is shown. Passes. Real browser: AU2.-1 passes, AU2.1 to AU2.7 pass.
- I did not rerun the test with the fix removed, so "fails without the fix" is the owner's claim, not mine. The browser check AU2.-1 failed in my previous audit, which is independent evidence that the defect existed.
- Side effects, from reading the code:
  - No loop: `refresh()` does not trigger `refresh()`.
  - Focus: `paintControls` moves focus only when it is disabling the button that currently has focus (`trust_lab_view.mjs:104-108`); `paintBeats` the same via `setDisabled` fallback. Neither runs a plain `focus()` otherwise. The Close/Forge focus path (`control_room_view.mjs:325`) is untouched and still guarded to body or opener.
  - Play state: `paintBeats` recomputes Play/Pause from the `playing` flag, so a running Play stays Play-disabled/Pause-enabled. Phase6 S4.7, S4.8 pass.
  - Minor, new: because `render()` runs while app.js has every button disabled during a run (`app.js:150`, `:165`, `:222`), `paintBeats()` re-enables Time Machine Previous/Next/Play and Trust Lab Tamper mid-run. The user can click Next during a scenario run. I saw no test failure from this and no exception. Low severity.

### AU1.A.5, AU1.B.3, AU5.1 (changes to my script)
- **AU1.A.5 (`phase6-audit.qa.mjs:128-131`): legitimate.** The old check read the page after the loop ended on beat 8, whose caption has no case id, then required two occurrences. The new check removes `#cr-tm-caption` from a cloned body and requires each caption case id to appear in the remainder, and requires at least one caption case id (`capCases.length > 0`). That is what the check always meant to test, and it is not looser in what it requires.
- **AU1.B.3 (`:119-121`): legitimate, slightly looser.** The old regex matched the true statement "No correlated case is created". The new rule splits into sentences and skips sentences containing "no", "not" or "never". Residual gap: a sentence that wrongly claims a case and also contains one of those words would pass. AU1.B.5 (no case id in any near-miss caption) and the scene checks remain, so a false claim of a real case is still caught. I accept it.
- **AU5.1 (`:252-258`): partly a weakening.** The old probe force-scrolled the Forge panel to y=0 and demanded every sample point be uncovered. That scenario is artificial, because the mobile scene is deliberately pinned (m5 S5.5 and S5.6 pass), so keeping it as INFO is fair, and the INFO output still records the covered points (hit `rect.cr-facade`, `rect.cr-podium`, `rect.` at 78, 132, 185 px). The replacement checks only that the focused `#forge-gap` is in view and not covered after a real click. It does not check that Run or Close can be reached. Recommended strengthening (to be added to my script): after the click, scroll `#forge-run` and `#forge-close` into view with `scrollIntoView({block:'nearest'})` and assert each is in view and not covered. I did not add it because the shell died; this is outstanding.

## Flakiness (phase6-experience S4, plus new failures)

**Observed this run:**
- Run 1 failed S1.6.2, S1.7.2, S1.14, all beat 2 caption reads. S1.4.2 (aria-current) and S1.8 (scene state) passed for the same beat, so the caption read at that moment did not show "Beat 2 of 8". I do not know the cause. My output filter dropped the detail text, and run 2 passed. Cause unproven.
- Both m0 runs failed with null elements or `Page.navigate` timeouts.
- My own repro scripts also lost pages: "Inspected target navigated or closed" (2 of 11 attempts), `no element #cr-tab-timeline`, and a null `#cr-tm-caption`.

**Measured cause of the page-loss class (harness, not product):** `tests/browser-qa/phase6-reload-timing.qa.mjs` navigates a fresh headless Chrome to the served docs and does nothing else for 9 s, polling `performance.timeOrigin`. Six runs, ms after navigation when the document changed:
`[184, 2728]`, `[4552, 8926]`, `[3503, 8385]`, `[179, 2600]`, `[751, 5461]`, `[142, 2911]`.
Each page is replaced a second time between 2.6 s and 8.9 s after navigation, with no test action. `lib.mjs` `goto()` (lines 132-147) waits for 2.2 s of stability. On this loaded machine (49 Chrome/Edge processes, several other node agents running) the second replacement often lands after the window. A scenario then loses its state, focus and DOM mid-run. This fits the m0 null-element failures and the earlier S4 failures (S4 relies on keyboard focus and a selected beat that a reload erases). I could not prove it for the S1 beat-2 failure.
- `docs/*.mjs` and `docs/app.js` contain no `location.reload/assign/replace` call, so the product is not reloading itself.

**Product race hunt (CPU throttling via `Emulation.setCPUThrottlingRate`):**
- `phase6-race-repro.qa.mjs`: 6x throttle after the challenge (4 completed attempts) and 10x throttle from before it (5 completed attempts). Keyboard Next and Space and eight mouse picks per attempt. 0 anomalies in 9 attempts; the beat index and caption were always right. Log: `docs/evidence/phase6/audit-logs/phase6-race-repro.json`.
- Focus: all `forge-gap` focus calls happen within about 35 ms of the click (`app.js:269`, `app.js:216`, `control_room_view.mjs:325` via MutationObserver). There was no late focus. The one focus on a beat button is the designed fallback when Next becomes disabled at beat 8 (`time_machine_view.mjs:53`).
- **Latent product window found (not hit in my tests):** the Time Machine rebuilds twice after a run. The log shows rebuilds at 3584 ms and 3947 ms (the second with `cases-count` changing to 1). Cause: `app.js:123-147` `render()` calls `cr.refresh()` immediately with the old `lastCases`, then `renderCases()` (`app.js:73-90`) awaits `verify` and `correlate` and calls `cr.refresh()` again. `time_machine_view.mjs` `refresh()` includes case ids in its signature, so the second refresh sets `idx = null` and rebuilds. A user who picks a beat in that gap (about 360 ms at 6x throttle) loses the selection. The QA scripts wait for `cases-count` first, so they are not exposed, and my attempt to hit it (`phase6-sig-window.qa.mjs`, 3 completed attempts) always found cases already present. I did not prove this causes any failure.
- **Exact fixes (owner to apply, I did not edit product code):**
  1. Harness: in `lib.mjs` `withBrowser`, record `performance.timeOrigin` after `goto()`. Before the scenario returns, re-read it. If it changed, discard that scenario's checks and retry (it already retries for infrastructure errors). Optionally raise the settle window in `goto()` from 2.2 s and re-wait when the origin changes.
  2. Product (optional hardening): in `time_machine_view.mjs` `refresh()`, when the signature changes, remember `tm.steps[idx].id` and restore `idx` to the step with the same id after `build()`, instead of `idx = null`. Or drop case ids from the signature.

## New findings (by severity)

1. **Medium: attribution still wrong in 4 files** (M2 above).
2. **Medium: harness reload makes QA results non-deterministic on a loaded machine.** m0 went from 56/56 (five times, previous audit) to 22/27 and 45/47; phase6-experience failed once in 2 runs. Counts above are copied from output; I did not retry until green because that would hide the problem.
3. **Low: the two QA scripts that write `REPORT.md` still collide (L1).** Also the m0 failing run overwrote `docs/evidence/control-room/m0-signal-forge/REPORT.md` with a failing report (see "Files for the owner to restore").
4. **Low: AU5.1 is narrower than the old probe** (details above).
5. **Low: mid-run re-enable of Time Machine and Trust Lab buttons while app.js runs a scenario** (side-effect note under AU2.-1).
6. **Low (latent): double rebuild of the Time Machine after a run** (details above).

Checks that passed again this run (phase6-audit): captions trace to ledger rows and hashes (AU1.A.3, AU1.B.3, near miss has no case id), 11 tamper experiments leave the ledger bytes, indicator and DOM unchanged (AU2.1), zero localStorage writes (AU2.2), zero fetch/XHR (AU2.3), reload keeps the ledger intact (AU2.4 to AU2.6), reduced motion: Play/Pause disabled, nothing advances, no smooth scrolling, zero animation or transition durations (AU3.1 to AU3.8), no console errors in all sections.

## Screenshots inspected with the image reader
- `docs/evidence/phase6/time-machine-1440-beat6.png` (1440x1963): shows the derived label for beat 6, "Derived UTC time 22:07:29 UTC (Derived, not recorded: the door's recorded open time plus the 120 s hold threshold.)"; beats 4 to 7 show "≈ 22:07:29 UTC · derived"; ledger rows #2 `edca35aab6…23d9` and #3 `d87cf90613…537c`; case id `case:cfd83deb8d3af576`. Visual layout looks sound; no overflow visible.
- `docs/evidence/phase6/audit-time-machine-A-beat6-1440.png` (790x634): same derived text and the same row hashes; the active beat 6 has a bright border (focus/selection visible).
- I did not inspect other screenshots this run (see limitations).

## Files for the owner to restore (overwritten by the QA scripts I ran)
`git status` before my runs already listed these as modified, so some changes pre-date me. The m0 and m5 evidence files are the ones my m0 runs rewrote:
- `docs/evidence/control-room/m0-signal-forge/REPORT.md` (now a failing 45/47 report, which must not be committed)
- `docs/evidence/control-room/m0-signal-forge/before-desktop-1440-hero.png`, `before-desktop-1440-workspace.png`, `forge-299-120-reconstruction-desktop.png`, `forge-301-119-no-case-desktop.png`, `forge-mobile-390-panel.png`, `forge-mobile-390-reconstruction.png`
- `docs/evidence/control-room/m5/*` and `docs/evidence/agentic-validation/mcp-transcript.jsonl` were already modified before my session; I did not run m5 in this audit.

New files I wrote: `tests/browser-qa/phase6-race-repro.qa.mjs`, `phase6-sig-window.qa.mjs`, `phase6-reload-timing.qa.mjs`; `docs/evidence/phase6/audit-logs/phase6-race-repro.json`, `phase6-sig-window.json`; this report. The phase6-audit run also rewrote `docs/evidence/phase6/audit-*.png`.

## Limitations
- **The shell stopped responding** after the m0 reruns and diagnostics. All later commands returned exit -1 with no output. I therefore could not: rerun m0 to green, rerun the failed experience check with details, run the AU2.-1 test with the fix removed, add the AU5.1 strengthening, or run `git status` afterwards.
- Only two screenshots were inspected; the other audit-*.png files written by phase6-audit were not opened.
- The S1 beat-2 failure and the earlier S4 failures are not proven to share the reload cause; only the m0 and my own page-loss failures are directly explained.
- No test of the real Python server mode in a browser beyond the m0 scenario E, which failed in run 1 as a driver error and passed in run 2.
- Contrast was not recomputed this run (no change in the diff I audited besides the derived label, which uses the existing teal on the dark card; ratio not measured). Touch target sizes were not re-measured by me (a11y-targets-after not rerun; its unit file `a11y_targets.test.mjs` passes 9/9).
- m5-control-room, skip-link-audit, forge-focus-audit, a11y-targets-after were not run (not requested).
