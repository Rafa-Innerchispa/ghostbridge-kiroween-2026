# qa-auditor Phase 7 review (PR #17, branch feat/kiro-premium-judge-experience)

## Verdict: PASS WITH FINDINGS

All executed suites are green. No lime, no gradient fills on UI, no infinite animations, no text under 12 px. The remaining problems are design-rule deviations (red used for a non-critical state, amber for non-warning states, two stale screenshots) and a few documentation claims that no log in the repo supports.

## Runs (this session, real output)

| Run | Result |
|---|---|
| `python -m unittest discover -s tests` | Ran 188 tests, OK (0 failures, 0 skipped) |
| `node --test tests/a11y_targets.test.mjs tests/control_room_wiring.test.mjs` | tests 24, pass 24, fail 0, skipped 0 |
| `node --test` on all 19 `tests/*.test.mjs` | tests 382, pass 382, fail 0, cancelled 0, skipped 0 |
| `node --check` docs modules | 18 files (`docs/*.mjs` + `docs/app.js`) counted. I did not re-run `--check` per file in this pass; the 382 Node tests import every module, so none has a syntax error. Treat the "18 of 18" claim as indirectly verified. |
| `node tests/browser-qa/phase6-audit.qa.mjs` (local branch) | 39 passed, 0 failed, 39 total |
| `node tests/browser-qa/live-site.qa.mjs` (published site = main, without this PR) | 14 passed, 0 failed, 14 total (no console errors, no failed requests) |
| Screenshots opened with image reader | 12 of the 13 requested/related: after/1440-01, 02, 04, 06, 07, 08, 09; 1024-01; 390-01, 02 (10 total). |

Third-party runtime requests: live-site L1.9 "no failed requests" passes; fonts are vendored (`docs/styles.css:1`). I saw no external URL in the CSS diff.

Tracked files overwritten by my runs (restore with `git checkout -- <file>` if unwanted):
- `docs/evidence/live/REPORT.md`, `docs/evidence/live/live-1440.png`
- `docs/evidence/phase6/audit-forge-390-viewport.png`, `audit-reduced-motion-1440.png`, `audit-time-machine-A-beat6-1440.png`, `qa-auditor-phase6-browser.md`

Untracked file I added: `docs/evidence/premium/css-scan.qa.mjs` (CSS scanner, run as `node docs/evidence/premium/css-scan.qa.mjs docs/styles.css`).

## Design-rule findings (by severity)

Note: the CSS diff is larger than styles.css and index.html. `docs/control_room.css` also changed (208 lines), and most state colour rules live there.

### Medium
1. **Red used for "access denied" and for evidence anchors, which are not critical incidents or integrity failures.** Rule: red only for critical incidents or failed integrity.
   - `docs/control_room.css:64` `.cr-svg[data-reader="denied"] .cr-led` fills `--crit`; `:66` `.cr-led-ring` stroke `--crit`.
   - `:80` `.cr-marker[data-state="denied"] .cr-marker-dot`; `:93` `.cr-node[data-state="denied"]::before` (red top bar over "Archive reader / Access denied", visible in 1440-02 and 1440-08).
   - `:123` `.cr-mark.is-on.cr-mark-anchor`, `:139` `.cr-ev-item.cr-kind-anchor` (red for the anchor event).
   - `docs/styles.css:33` `.case-card .severity` and `:61` `.recon-badge-sev` use `#f08a8d`; `:119` `.recon-marker-anchor.is-on` red.
   - Fix: a single denied badge is a notable event, not a failure. Use `--prov`/neutral (or `--warn` if it needs attention) for denied; keep `--crit` only for HIGH PRIORITY CASE severity text and integrity failure. If the owner wants denied red, state it as an exception in the CSS token comment (`docs/styles.css:4-6`), since it currently contradicts it.
2. **Amber used for "no case / rule not met" and the challenge B result, which is a normal, non-warning outcome.**
   - Screenshot 1440-08: chip "NO CORRELATED CASE · RULE NOT MET" and the whole Forge result box are amber; `docs/styles.css:193` `.forge-preview.is-fail`, `:200` `.forge-result.is-no-match`, `:135` `.is-fail .recon-check-icon`; `docs/control_room.css:182` `.cr-bar[data-pass="false"] .cr-fill`; "Challenge B 301 s · 119 s" figure in amber (1440-04, 1440-08).
   - Rule: amber only for warnings/actionable incident states. Fix: render "no case" with `--prov`/`--text-muted` and a neutral border; keep amber for the near-miss that an operator should still look at only if the product defines it as actionable (document it).
3. **Screenshot 1440-07-trust-lab-tampered.png is stale.** It shows "Altered", "Altered copy" card border and the reason bar in amber (`#e0a`-type orange), while the CSS now uses red (`docs/control_room.css:357,358,380,383`). The visual verdict for the red-integrity change is therefore "visual not verified". Fix: re-run `tests/browser-qa/screens-capture.qa.mjs`, then re-inspect.

### Low
4. **Controls under 40 px** (scan output, `docs/control_room.css` / `docs/styles.css`):
   - `docs/styles.css:114` `.recon-slider` min-height 32px; `docs/control_room.css:129` `.cr-scrub-row input[type=range]` min-height 32px; `docs/styles.css:184` `.forge-control input` height 28px (the slider in the Forge, 1440-02); `:188` `.forge-camera input` 18×18 checkbox; `:118` `.recon-marker` 20px.
   - Fix: give the range and checkbox a wrapper with `min-height:44px` (the label already surrounds the checkbox; make the `label` the 44px target), and for the slider use `height:44px` with a thin track via `::-webkit-slider-runnable-track`.
5. **Hero photo-like decoration at 390 px:** in 390-01 and 390-02 the building scene is below the fold. The case chip and clock overlay the scene top but the scene is only ~70 px tall in the viewport; the Forge result is not visible after pressing Challenge A. Not a rule violation, but the forge-case screenshot does not demonstrate the case. Fix: scroll the scene into view in the capture script before screenshotting.
6. **Mobile nav at 390 px wraps to two lines** with link text at ~13 px and no padding (390-01): targets look under 40 px high. Fix: `nav a{display:inline-flex;min-height:40px;align-items:center}` under 600 px.
7. **Gradients:** `docs/control_room.css:9` `.cr-stage::before` is a dark-to-transparent legibility scrim (acceptable, not saturated). `:235` `.sc-progress i.is-now` uses a hard-stop progress gradient (acceptable, encodes progress).
8. **Box-shadow:** only `docs/control_room.css:320,321` `inset 0 0 0 1px` (outline, not a glow). OK.
9. **Green:** `--ok:#6dbba9` (`docs/styles.css:10`) is used for granted/online/dwell markers and the source-strip bar. It is teal-green and close to the accent, so it does not break the "one accent" look, but it is a second status hue the owner's rules do not list. Mention to the owner.

### Checks that passed
- No `#c5f76a`, no "lime" in `docs/*.css`, `docs/index.html`.
- No `infinite` and no `@keyframes` in `docs/styles.css` or `docs/control_room.css`; no pulsing. `.cr-marker-pulse` (`control_room.css:78`) is a static ring that appears when `data-attention="true"` (state-driven), not animated.
- No font size under 12px in either stylesheet (scan found none).
- Reduced motion: `docs/styles.css:167-168` and Phase 6 audit AU3.x all PASS (Play/Pause disabled, no smooth scroll, no running transitions).
- Focus ring `--focus:#b4cfee` (ice blue on `#0d1114`, contrast roughly 11:1 by estimate); visible in 1440-02 on the first Forge slider (white/blue box).
- Contrast estimates: body text `#e8edf0` on `#0d1114` ≈ 16:1; muted `#9aa7b0` on `#12171b` ≈ 7:1; primary button white on `#2d747c` ≈ 5.3:1; amber `#d9a54a` on `#171d22` ≈ 7.5:1; red text `#f08a8d` on dark ≈ 7:1. These are estimates from hex values, not measured in a browser.
- Hero (1440-01, 1024-01): sober graphite, single teal accent, no glow. Layout fine at 1024 (no wrap). No horizontal overflow in the Phase 6 audit and live run at 390.

## Documentation findings

| # | Claim | Finding |
|---|---|---|
| D1 | JUDGES.md: "188 Python tests and 382 Node tests in CI; 18 syntax checks" | Matches my runs (188, 382 in 19 files, 18 modules). |
| D2 | JUDGES.md: "520 real-Chrome checks run by hand, including 14 against the live site" | Not in any log. It equals 159+39+39+32+40+56+141+14 = 520, using STATUS.md's table. The m5 count has "2 harness retries" and the figure sums different scripts (phase6-audit 39 and a11y 39 are separate scripts, fine). Say "sum of the per-script counts" or list the scripts. The 14 live checks passed again here. |
| D3 | "14 real calls" from a Kiro session | Matches `docs/evidence/phase6/mcp-from-kiro.md` (14 calls). OK. |
| D4 | Case id `case:cfd83deb8d3af576` | Matches the UI in 1440-02 and 1440-04, and `live/REPORT.md`. OK. |
| D5 | "Powers not used / Kiro Crew not built" | Consistent with the page, but `.kiro/specs/ghostbridge-crew-app/` exists and its files are headed "ChatGPT-authored design input" (requirements/design/tasks). A judge browsing `.kiro/specs` will see a Crew spec. JUDGES.md should say the Crew spec is a design proposal only, not built, and was not authored by Kiro. |
| D6 | "Property-based tests... deliberate mutations caught 8 of 8" | No log found in `docs/evidence/` or `tests/` for the 8-of-8 mutation run (only STATUS.md of another phase mentions it, not reproduced here). Either link the log or drop the number. |
| D7 | "Five signals" (hero H1) vs four sources | The UI shows 4 sources (source strip), challenges record 3 events. STATUS.md already lists this as an owner decision. JUDGES.md still repeats "Five signals" in its title line without explaining it. Add one sentence ("four sources; five events in the Night Watch scenario") or change the claim. |
| D8 | "100-configuration parity fixture" | `tests/forge-parity.json` has 100 cases. OK. |
| D9 | RELEASE_CHECKLIST item 3 "14/14" and item 5 "382 of 382, 19 files" | Match my runs. Item 7 and 18 correctly deferred. Item 10 "PASS (scan)" has no scan log in the repo; keep it as owner-checked or add the log. |
| D10 | Contact only info@innerchispa.us | No other e-mail found in the changed docs/HTML. |
| D11 | Kiro-generated claims | JUDGES.md "Executed and verified" rows cite files that exist (`.kiro/hooks`, `docs/evidence/agentic-validation/`). I did not verify hook execution logs in this pass. |
| D12 | STATUS.md "no text under 12 px", "glows, halos and pulses removed" | Text part is true. "Halos removed" is not fully true: `.cr-led-halo` (`docs/control_room.css:63,64`) and `.cr-bollard-glow` remain as soft SVG fills (opacity .2), and 1440-02 shows a ring around the red LED (`.cr-led-ring`, scale 2.1). They are state-driven, but the doc overstates. |
| D13 | STATUS.md says S9 retry cause "not caused by this branch" | I did not run m5 S9, so I cannot confirm. |

## Limitations
- I did not run m5-control-room, phase6-experience, a11y-targets-after, skip-link or forge-focus scripts (not requested); their counts in STATUS.md are not independently confirmed here.
- `node --check` was not run per file this time (see table).
- Screenshots 1440-04, 06, 08, 09 and 390/1024 were inspected visually; I did not open the remaining before/ images or 390-03..10 and 1024-02..10.
- Colour contrast ratios are estimates from hex values; I did not measure them in a browser. Touch-target sizes come from CSS source, plus screenshots for the nav; I did not measure computed sizes in Chrome for every control.
- The live-site run tests the published site (main), not this PR.
- Chrome only; no screen reader.
- Tool unavailable: `sed`; a first CSS scan used a one-off script (kept at `docs/evidence/premium/css-scan.qa.mjs`).
