# Phase 7: premium product and judge experience

Branch `feat/kiro-premium-judge-experience` from `main` `beea671` (PRs #10, #14, #15, #16 merged by the owner on 2026-11-18, 08:39 to 08:43 -05:00, with CI and Pages `success` for every merge commit).

## Live site after the merge (before this phase's changes)
`tests/browser-qa/live-site.qa.mjs` against https://ghostbridge.innerchispa.us/ in real Chrome: **14/14**. Report: `docs/evidence/live/REPORT.md`.

## What changed in this phase
| Item | By | Status |
|---|---|---|
| Premium visual system: lime removed; one muted petroleum accent (`--accent #5aa9b0`, primary fill `#2d747c`); amber only for warnings; red only for critical states; ice-blue focus ring; glows, halos and pulses removed; type scale (16 px body, no text under 12 px, tabular figures); tablet header rule | ui-director run C | VERIFIED (screenshots inspected by Kiro main session; tests below) |
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
| Chrome: m5 Control Room | 141/141, with 2 harness retries in S9 |

**S9 retries are not caused by this branch:** the same scenario run 3 times on unchanged `main` failed 2 of 3 runs with "Inspected target navigated or closed" (Chrome headless replacing the tab on its own, measured earlier by qa-auditor). On this branch, S9 alone: 1 of 3 runs failed, 2 passed. Not a product defect; flagged as a harness limitation.

## Open decisions for the owner
- "Five signals": the building shows four sources; each challenge records three events; Night Watch records five. The wording is the owner's; kept.
- Colours that live in JavaScript (the scene's SVG gradients: warm lobby glow, teal cone) and JS strings ("HIGH PRIORITY CASE", "Door stays open") were not changed (CSS/HTML-only pass).
