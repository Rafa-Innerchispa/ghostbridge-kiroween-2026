# qa-auditor round 2: Forge focus hand-off

Branch `feat/kiro-agentic-validation`, uncommitted. Fresh run. Every number below comes from output I produced in this session. I did not trust ui-director's claims.

## Verdict: PASS (no blocking defect, 3 low/info notes)

Round-1 finding 1 is fixed and verified in a real browser. Finding 2 is fixed (file deleted). The observer cannot loop, does not steal focus from a control in use, and does not break Close, Challenge A/B or the skip link.

## Suites

| Suite | Pass | Fail | Skip | Notes |
|---|---|---|---|---|
| `python -m unittest discover -s tests -v` | 169 | 0 | 0 | "Ran 169 tests ... OK" |
| node --test a11y_targets | 5 | 0 | 0 | was 4 in round 1 |
| node --test browser | 12 | 0 | 0 | |
| node --test control_room | 27 | 0 | 0 | |
| node --test control_room_wiring | 15 | 0 | 0 | |
| node --test correlator | 46 | 0 | 0 | |
| node --test filter | 17 | 0 | 0 | |
| node --test forge-parity | 2 | 0 | 0 | |
| node --test guard | 72 | 0 | 0 | |
| node --test playback | 20 | 0 | 0 | |
| node --test property | 9 | 0 | 0 | |
| node --test reconstruction-view | 23 | 0 | 0 | |
| node --test reconstruction | 39 | 0 | 0 | |
| node --test showcase | 19 | 0 | 0 | |
| node --test signal_forge | 17 | 0 | 0 | |
| node --check docs/*.mjs (13) + docs/app.js | 14 files | 0 | 0 | all exit 0 |
| browser-qa m5-control-room | 141 | 0 | 0 | 12 scenarios, exit 0, 0 retries |
| browser-qa m0-signal-forge | 56 | 0 | 0 | `A5 focus moves to the first slider` now PASS; `external resources requested: []` |
| browser-qa skip-link-audit | 32 | 0 | 0 | |
| browser-qa forge-focus-audit (new) | 40 | 0 | 0 | see below |

Node total: 323 tests (14 files, enumerated from the directory), all passing. Node ran v24.19.0 with the tap reporter to get counts.

## 1. Critical read of the diff (`docs/control_room_view.mjs`, +6 lines at ~L313-322)

```js
new MutationObserver(() => { ...; refresh();
  if (!forge.hidden) { const doc = root.ownerDocument, active = doc && doc.activeElement;
    if (!active || active === doc.body || active === $('signal-forge')) $('forge-gap').focus(); }
}).observe(forge, {attributes: true, attributeFilter: ['hidden']});
```

- Loop: no. It watches only the `hidden` attribute. `focus()` does not write that attribute, so it cannot re-trigger.
- Theft: no. It only acts when focus is on body, null or the opener. The slider, checkbox and Close paths are untouched (tested, see below). Residual: a real user who clicks the opener moves focus to the button first, so the `#signal-forge` branch is needed and was tested (F1b).
- Close: `hidden=true` makes the guard false, and app.js then focuses `#signal-forge`. Tested.
- Challenges: `challenge()` calls `openForge()` then clicks the preset and Run. The observer runs as a microtask after the challenge click handler. By then `document.activeElement` is the challenge button, not body, so no steal. Tested.
- Showcase: the 141 m5 checks include the Showcase scenarios and all pass. I did not add a Showcase-specific focus test.
- Side effect: calling `focus()` on a slider while the page is scrolled far away causes an instant scroll jump, which then competes with app.js's `scrollIntoView({behavior:'smooth'})`. See note N1.

## 2. forge-focus-audit.qa.mjs (new, `tests/browser-qa/`)

Run at 1440x900 and 390x844 (mobile emulation), fresh browser per scenario. Detail in `forge-focus-audit.json`.

| Check | 1440 | 390 |
|---|---|---|
| F1 programmatic click on `#signal-forge` (focus starts on BODY, the round-1 failure) -> `#forge-gap` | PASS | PASS |
| F1b real mouse click on `#signal-forge` -> `#forge-gap` | PASS | PASS |
| F1c keyboard Enter -> `#forge-gap`, `:focus-visible`, ring present, inside viewport | PASS | PASS |
| F2 input on `#forge-hold` keeps focus on `#forge-hold` | PASS | PASS |
| F2b camera toggle keeps focus on `#forge-camera` | PASS | PASS |
| F2c/F2d `#forge-pass` / `#forge-fail` move focus to `#forge-gap` | PASS | PASS |
| F3 Close hides panel, focus lands on `#signal-forge` | PASS | PASS |
| F3b reopen after Close focuses `#forge-gap`; F3c second Close lands on `#signal-forge` | PASS | PASS |
| F4 first Tab lands on the skip link | PASS | PASS |
| F5 Tab from `#forge-gap` moves on (no trap) | PASS | PASS |
| F6 Challenge A -> 3 events, 1 case; Challenge B -> 3 events, 0 cases; B from a fresh page -> 3 / 0; Close works afterwards | PASS | PASS |
| Console errors | 0 | 0 |

F2c/F2d: moving focus to `#forge-gap` on a preset click is the existing app.js `forgePreset()` behaviour (`app.js:215`), not the observer. The observer does not fire there because `hidden` does not change.

First run of my script had 3 failures that were my harness, not the product: the page uses CSS smooth scrolling, so my mouse click measured a moving target (mouse click missed, panel never opened) and the viewport check ran while the smooth scroll was still in flight (settled by about 1 s in a probe). I fixed the script (instant scroll, waits) and re-ran: 40/40. I deleted the temporary probe file.

## 3. Screenshots inspected (image reader)

- `forge-focus-open-1440.png`: Forge docked on the left of the stage. A lavender square ring is clearly visible around the "Time after denied access" slider. Close, presets and Run are visible. Looks intact.
- `forge-focus-open-390.png`: Forge below the scene. The lavender ring is visible around the first slider. The Rule check gauges are partly scrolled off the top, which is expected after the focus scroll. No clipping or overflow seen.
- `docs/evidence/control-room/m5/desktop-1440-01-hero.png`: headline, 3 actions and source strip intact. A lavender ring is on the "Archive reader" tile (leftover scenario focus, not a defect).
- `docs/evidence/control-room/m5/mobile-390-01-hero.png`: hero stacked correctly, no overlap.

## 4. Round-1 findings

| # | Finding | Status |
|---|---|---|
| 1 | m0 A5 focus stayed on BODY | **Fixed.** m0 A5 PASS, and F1/F1b/F1c pass at both sizes. |
| 2 | `a11y-targets.qa.mjs` had no assertions | **Fixed.** The file is gone. Only `forge-focus-audit`, `skip-link-audit`, `m0`, `m5` and `lib.mjs` remain. |
| 3 | Other small targets (header/nav links 13-17px) | **Unchanged.** I did not re-measure the whole page. |
| 4 | `#control-room:focus{outline:none}` | **Unchanged, acceptable** for a `tabindex=-1` landmark. |
| 5 | Control Room nav link missing at 390 | **Unchanged.** The 390 hero shows 4 links (Product vision, Signal lab, How it works, Source). |
| 6 | Evidence overwrite and LF/CRLF warnings | **Unchanged.** See N3. |

## 5. New findings

- **N1 (Low, UX): focus jump plus smooth scroll.** When the opener is far from the top of the page, opening the Forge at 1440 first jumps the page (`focus()`, scrollY about 1830 with the gap at -1498 px at 100 ms) and then smooth-scrolls to the top (scrollY 23 at 500 ms, 0 at 1 s). Final state is correct. `app.js:270` uses `behavior:'smooth'` regardless of `prefers-reduced-motion`. I did not run a reduced-motion test of this path. The same call in `control_room_view.mjs` does honor `reducedMotion` for `challenge()`. Suggested fix for the owner: in `app.js:270` use `behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'`, and optionally call `$('forge-gap').focus({preventScroll:true})` in the observer so only one scroll runs.
- **N2 (Info, process): leaked env var.** My shell had `QA_ONLY=S2` set. The first m5 run therefore ran only scenario S2 (19 checks) and overwrote `docs/evidence/control-room/m5/REPORT.md` with that partial report. I noticed, cleared the variable, and re-ran m5 in full (141/141). `REPORT.md` now says 141. Anyone running m5 should check that `QA_ONLY` is unset.
- **N3 (Info): tracked evidence overwritten.** The m0 and m5 runs rewrite tracked PNGs and `REPORT.md` under `docs/evidence/control-room/` (visible in `git status`). That is expected for these scripts. The owner decides whether to keep them or run `git checkout -- docs/evidence/control-room`. I did not do either.

## Needed fixes

None blocking. Optional: N1 as described above.

## Limitations

- Headless Chrome via CDP only. No Firefox or Safari. No screen reader. Not a WCAG validation.
- Keyboard and mouse input are synthetic CDP events. Real touch input on a phone was not tested (390 is viewport emulation).
- I did not test focus behavior with `prefers-reduced-motion` on the Forge open path (N1 is from reading `app.js` plus a scroll trace without reduced motion).
- No Showcase-specific focus test; Showcase is covered only by the m5 scenarios.
- Whole-page target sizes and contrast were not re-measured. The `external resources requested: []` line comes from m0 and only covers what that harness records.
- I viewed 4 screenshots and did not open the other m5 and m0 images.
- Evidence integrity (ledger rows, synthetic data, `info@innerchispa.us` contact, no hardware or Kiro-generated claims) was not re-audited this round beyond the diff, which touches none of it.
- Files I wrote: `tests/browser-qa/forge-focus-audit.qa.mjs`, files under `docs/evidence/agentic-validation/`. No product code, `.github`, commit or push.
