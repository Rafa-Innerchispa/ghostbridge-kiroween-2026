# qa-auditor round 1: skip link and 40px targets

Branch `feat/kiro-agentic-validation`, uncommitted work from ui-director plus owner CI lines. Everything below comes from runs I did myself in this session.

## Verdict: PASS WITH FINDINGS

No regressions found. All of ui-director's claims were reproduced independently. Findings are one pre-existing failing check, one misleading QA script, and minor accessibility notes.

## Suites

| Suite | Pass | Fail | Skip | Notes |
|---|---|---|---|---|
| `python -m unittest discover -s tests -v` | 169 | 0 | 0 | "Ran 169 tests ... OK". Shell exit code was 1 only because of my `Select-Object` pipe over stderr. |
| node --test a11y_targets | 4 | 0 | 0 | |
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
| node --check docs/*.mjs (13 files) + docs/app.js | 14 files | 0 | 0 | all exit 0 |
| browser-qa m5-control-room | 141 | 0 | 0 | 12 scenarios, exit 0 |
| browser-qa m0-signal-forge | 55 | **1** | 0 | fails `A5 focus moves to the first slider` (run twice, same result) |
| browser-qa a11y-targets | n/a | n/a | n/a | exit 0, but see finding 2: it has no assertions |
| browser-qa skip-link-audit (mine) | 32 | 0 | 0 | new file |

The node total is 322 tests, all passing. The `tests/*.test.mjs` list was enumerated from the directory (14 files).

## Independent skip-link audit (`tests/browser-qa/skip-link-audit.qa.mjs`)

Results are in `docs/evidence/agentic-validation/skip-link-audit.json`.

| Check | 1440x900 | 390x844 |
|---|---|---|
| (a) first Tab lands on the skip link | PASS. `a.skip-link`, href `#control-room`, at x=12, y=12, 182x44. | PASS, same. |
| Focus ring | PASS. Outline is solid 3px rgb(186,174,235), 9.54:1 against the page. Seen in the screenshot. | PASS, same. |
| (b) Enter | Focus moves to `section#control-room`. Hash is `#control-room`. scrollY went 0 to 67 and the section top is at 25px. | Focus moves to the section. scrollY went 0 to 84. |
| (c) six controls | All at least 40px high. Widths are 43.2, 53.8, 73, 104, 160.5 and 148.5. | All at least 40px high. Widths are 40, 45.8, 65, 104, 160.5 and 148.5. |
| (c) overflow | No overflow, scrollWidth is not above innerWidth. | No overflow. |
| (d) contrast | rgb(197,247,106) on rgb(11,14,16) is 15.57:1, background opaque. | Same. |
| (e) reduced motion | Matched. Transition `0s / none`, animation `none`, scroll-behavior `auto` on html, body and target. | Same. |
| Console errors | 0 | 0 |

With motion not reduced, the skip link's computed transition is also `0s all`, so the reveal is an instant jump and not an animation.

## Screenshots inspected

I opened all of these with the image reader:
- `docs/evidence/agentic-validation/skiplink-focused-1440.png` and `skiplink-focused-390.png`
- `docs/evidence/control-room/m5/desktop-1440-01-hero.png` and `mobile-390-01-hero.png`
- `docs/evidence/control-room/m0-signal-forge/before-desktop-1440-workspace.png`, which shows the filter row and the Verify, Export and Tamper row
- `docs/evidence/control-room/m5/mobile-390-02-forge-pinned.png`

What I saw:
- The focused skip link is clearly visible, with a lime border and a lavender ring. At 1440 it covers the logo and brand text while focused, which is expected for a skip link.
- The 1440 and 390 heroes look intact, with no visible overlap or clipping.
- The All, High and Medium chips and the three bottom buttons look consistent in height.
- The m5 1440 hero shows a lavender focus ring on the "Archive reader" tile. This is a leftover focus state from the scenario, not a defect.

## Findings (by severity)

1. **Low, pre-existing: m0 check `A5 focus moves to the first slider` fails.**
   - Reproduction: `node tests/browser-qa/m0-signal-forge.qa.mjs`. After `#signal-forge` is clicked, `document.activeElement` is `BODY`, not `#forge-gap`.
   - I ran a temporary probe against `git archive HEAD docs` and against the worktree, two runs each. Both gave `BODY`. So this is not caused by the uncommitted diff.
   - It is most likely a harness or headless focus quirk, or a real regression from before this work. `app.js:268` calls `$('forge-gap').focus()`, but the panel's scroll or reveal may run first. I did not diagnose the root cause.
   - Owner call: either fix or relax the check, or accept it as a known issue.

2. **Low: `tests/browser-qa/a11y-targets.qa.mjs` is not a real QA script.**
   - Its header says "TEMPORARY inspection probe ... removed before commit". It has no `check()` assertions and writes only to `%TEMP%\probe_a11y.json`. It always exits 0 and produces no screenshots.
   - Recommendation: delete it before commit, or replace it with `skip-link-audit.qa.mjs`, which has real assertions.
   - `tests/a11y_targets.test.mjs` reads source text only (it says so itself). It cannot prove rendered size. The browser audit above covers that.

3. **Low, scope note: other small targets remain.**
   - ui-director's probe in `%TEMP%\probe_a11y.json` lists the header and nav links and other inline links at 13 to 17px high. It lists no 40px violations among the six named controls.
   - I did not re-measure the whole page myself. The claim "six controls at least 40px" is true. A claim of "all targets at least 40px" would be false.

4. **Info: `#control-room:focus{outline:none}`.** After the skip link is used, the focused section shows no indicator. This is common for `tabindex="-1"` landmarks and is acceptable. The next Tab shows a ring.

5. **Info: the Control Room nav link is absent in the 390 hero screenshot.** The mobile nav shows only 4 links. This looks pre-existing and I did not investigate it.

6. **Info: line endings and evidence overwrite.**
   - git warns that LF will be replaced by CRLF in the 4 modified tracked files.
   - The browser QA runs overwrote tracked files under `docs/evidence/control-room/` (m0 and m5, the PNGs and REPORT.md). That was expected. The owner should restore them with `git checkout -- docs/evidence/control-room` if the old images are wanted.

## Other checks

- Python and JS test counts match ui-director's claims (169 and 4).
- CI: the diff adds `node --test tests/a11y_targets.test.mjs` to `ci.yml` and `pages.yml`, and the test passes.
- Evidence and honesty: the diff touches no data, hardware or Kiro claims. I saw no contact info in the diff. I did not grep the whole repo for `info@innerchispa.us`.
- Third-party requests: the m0 run printed `INFO external resources requested: []`. My script only sees same-origin requests, so it proves nothing about cross-origin ones. The m5 report may say more. I did not read it.
- Product code was not edited. I wrote only `tests/browser-qa/skip-link-audit.qa.mjs` and files under `docs/evidence/`. The temporary probe and the `%TEMP%` copy of HEAD were removed.

## Needed fixes for ui-director or owner

None for the skip link or the target sizes. For the owner: decide on finding 1, and drop or replace the temporary probe (finding 2).

## Limitations

- I ran only headless Chrome or Edge, via CDP. I did no manual screen-reader testing, so this is not a WCAG validation.
- I tested keyboard navigation with synthetic key events only.
- I did not run Safari or Firefox.
- I did not reproduce the pre-existing A5 failure on real hardware.
- I inspected 7 screenshots and did not open the rest of the m5 set (26 images).
- Contrast was computed for the skip link only, not for the whole page. The whole-page contrast comes from ui-director's probe, which reported `low: []`. I did not verify that probe.
- Visual verification applies only to the screenshots listed above.
