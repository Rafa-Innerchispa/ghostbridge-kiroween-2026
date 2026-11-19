# Phase 7: premium product and judge experience

Branch `feat/kiro-premium-judge-experience` from `main` `beea671` (PRs #10, #14, #15, #16 merged by the owner on 2026-11-18, 08:39 to 08:43 -05:00, with CI and Pages `success` for every merge commit).

## Live site after the merge (before this phase's changes)
`tests/browser-qa/live-site.qa.mjs` against https://ghostbridge.innerchispa.us/ in real Chrome: **14/14**. Report: `docs/evidence/live/REPORT.md`.

## What changed in this phase
| Item | By | Status |
|---|---|---|
| Premium visual system: lime removed; one muted petroleum accent (`--accent #5aa9b0`, primary fill `#2d747c`); ice-blue focus ring; decorative glow shadows and infinite pulse animations removed (state halos such as `.cr-led-halo` and `.cr-led-ring` remain, static, and appear only when their state applies); type scale (16 px body, no text under 12 px, tabular figures); tablet header rule | ui-director run C | VERIFIED (screenshots inspected by Kiro main session; tests below) |
| Status colours brought in line with the owner's rules after qa-auditor's Phase 7 review: **red only for failed evidence integrity** (Altered, Broken link, failing copy); **amber for actionable incident states** (Access denied, Held open, Camera offline, Long dwell); **neutral `--info`** for "No case" / near miss / failed rule conditions / beats that did not happen | Kiro main session | VERIFIED by re-captured screenshots and the browser suites below |
| Controls brought to at least 40 px (Forge sliders, timeline scrubber, reconstruction slider); camera checkbox 22 px inside a full-width label; reconstruction markers 24 px (mouse shortcuts; the slider and step list are the keyboard path) | Kiro main session | VERIFIED by tests below |
| Headline "Five signals. One explained incident." with "Evidence you can verify." (owner's wording) | ui-director run C | VERIFIED on screen |
| Failed evidence integrity (Altered, Broken link, failing copy, reason) moved from amber to red, per the owner's rule | Kiro main session | VERIFIED: contrast 7.50:1 text, 13.92:1 reason, 4.78:1 border |
| m5 S1.1 updated to the new headline | Kiro main session | VERIFIED (m5 141/141) |
| English judge package: `docs/submission/JUDGES.md`, `VIDEO_SCRIPT.md`, `RELEASE_CHECKLIST.md` | Kiro main session | written |
| Screenshot tooling: `tests/browser-qa/screens-capture.qa.mjs`, live-site QA | Kiro main session | EXECUTED |

Before and after screenshots (1440, 1024, 390 px, 10 screens each): `before/` and `after/`.

## Measured results on this branch
| Suite | Result |
|---|---|
| Python | 188 OK |
| Node, 19 files | 382 of 382 |
| `node --check` | 18 of 18 |
| Chrome: Phase 6 experience / independent audit / a11y targets / skip link / Forge focus / m0 | 159/159, 39/39, 39/39, 32/32, 40/40, 56/56 |
| Chrome: m5 Control Room | 141/141 |

All seven Chrome suites above (556 checks) ran on the final CSS with **0 harness retries**.

**Root cause of the intermittent "Inspected target navigated or closed" failures (seen since Phase 4), found and fixed in this phase:** with a fresh profile, Chrome 157.0.8103.79 replaced the newly opened tab on its own in 4 of 4 trials; with background component updates and networking disabled (`--disable-component-update`, `--disable-background-networking` and related flags, now the default in `tests/browser-qa/lib.mjs`), 0 of 4. Before the fix, the same failure also occurred on unchanged `main` (S9 failed 2 of 3 runs), confirming it was the harness, not the product.

## Open decisions for the owner
- "Five signals": the building shows four sources; each challenge records three events; Night Watch records five. The wording is the owner's; kept.
- Colours that live in JavaScript (the scene's SVG gradients: warm lobby glow, teal cone) and JS strings ("HIGH PRIORITY CASE", "Door stays open") were not changed (CSS/HTML-only pass).
