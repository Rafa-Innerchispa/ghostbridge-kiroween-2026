# Premium visual audit of GhostBridge

Audited 2026-11-19 on the published site (`main` `da69a39`) in real Chrome at 1440 x 900 and 390 x 844. Screenshots: `docs/design/before/`; measurements: `ghostbridge-facts.json`. Benchmark: `CREATORCORE_COMPARISON.md`. Target system: `GHOSTBRIDGE_DESIGN_SYSTEM.md`.

## Verdict
Functionally strong, visually "a well-made dashboard", not yet "a product you would show a corporate client tomorrow". The gap is not polish of components; it is **art direction**: no imagery or lighting, one uniform dark surface from top to bottom, display type that is too small for its role, and copy that explains mechanisms before value.

## Findings by area
| # | Area | What we see | Why it matters | Fix (system section) |
|---|---|---|---|---|
| 1 | Hero | Flat vector building on a flat dark field; headline 50 px; three equal buttons | The first 10 seconds do not feel like a premium building | Pre-rendered architectural backdrop with lit lobby and reflection under the live SVG; 64 px headline; one primary + one secondary + text link (§3, §4, §5) |
| 2 | Page rhythm | Every section is the same graphite; 18 sections without a change of tone | Reads as one long console; no story beats | Alternate dark operations bands with light story bands (§1) |
| 3 | Value story | The page jumps from the hero into the console | The visitor sees mechanisms before the value | New light "How it works" band with three numbered statements: Disconnected signals · One clear story · Evidence you can independently verify (§7) |
| 4 | Typography | Two display sizes are close together; body 16 px; eyebrows sometimes in accent | Weak hierarchy | Larger display, 17 px body, eyebrows neutral (§3) |
| 5 | Buttons and links | Rounded, filled boxes with sub-labels; similar weight everywhere | Everything competes | Square primary/secondary, arrow links (§4) |
| 6 | Signal Forge | A dense drawer of controls | Feels like a form | Section title, short lead, grouped controls with more air (§3, §4) |
| 7 | Time Machine / Trust Lab / Own Log / Seal | Good structure, uniform card borders everywhere | Visually flat, same weight as the console | Section heads with eyebrow + title + one-line lead; cards on `--ink-900` without borders; borders only for state (§2, §5) |
| 8 | Architecture | Only in docs | Judges never see the system | A light band with a clean, original architecture diagram (HTML/SVG, not a screenshot) |
| 9 | Product Vision | Dark, dense concept mock-ups | Reads as more dashboard | Light band, larger concept frames labelled "Concept" |
| 10 | Footer / contact | Minimal | No closing statement | Closing line, contact, source and the honesty note |
| 11 | Motion | State transitions only; no entrance grammar | Static between interactions | Once-per-band entrance, focus shifts, Pause motion (§6) |

## Constraints that do not change
- Every state in the scene comes from the ledger; no invented sensors, cameras or incidents.
- No third-party requests, no new runtime dependencies; total extra weight under 300 KB.
- All existing ids, behaviours and tests keep working; reduced motion respected; 40 px targets; contrast ≥ 4.5:1.
- Built-in data stays labelled synthetic; imagery labelled as illustration.

## Plan
1. ui-director: visual system, bands, typography, buttons, hero backdrop (generated from our own SVG in `tools/render-hero/`), value band, architecture band, motion grammar with Pause, copy pass.
2. Main session: performance measurement (LCP, CLS, long tasks, weight) before and after.
3. qa-auditor: independent review against this document and the design system.
4. Before/after screenshots at 1440, 1024 and 390 px: `docs/design/before/` and `docs/design/after/`.

## Performance (before = `main` `da69a39`, after = this branch)
Measured with `node tests/browser-qa/perf.qa.mjs <docsDir> <label>` in headless Chrome on a local loopback server, 5 cold launches per viewport. Raw samples: `perf-before.json`, `perf-after.json`.

| Metric | 1440 before | 1440 after | 390, CPU 4x before | 390, CPU 4x after |
|---|---|---|---|---|
| LCP from document arrival (median) | 276 ms | 335 ms | 1791 ms | 1374 ms |
| LCP element | `h1#cr-title` | hero backdrop (`hero-backdrop-2880.webp`) | `h1#cr-title` | hero backdrop (`-1080.webp`) |
| CLS | 0.0071 | 0.0104 | 0 | 0 |
| Transferred | 348 KB | 428 KB | 348 KB | 401 KB |
| Requests | 27 | 30 | 27 | 30 |
| DOM nodes | 1459 | 1692 | 1447 | 1693 |
| Frame time while a case plays (p50 / p95) | 16.7 / 16.7 ms | 16.7 / 16.7 ms | 16.7 / 16.8 ms | 16.7 / 16.8 ms |
| Frames over 33 ms in ~5 s | 0 | 0 | 1 | 1 |

Reading the numbers honestly:
- The page holds 60 fps while the scene animates a real case on both branches.
- LCP is in the same range before and after. A first run reported 2.9 s for the new page. The cause was traced to the harness, not the page: on some cold Chrome launches the HTML document itself arrived 4 to 28 s late, before any page code ran, and this happened on `main` too. The script now records `nav` (document arrival) and `lcpAfterDoc`, and retries launches whose navigation stalls (`failed` in the JSON). On this machine 1 to 9 launches per set stalled, so the 390 figures in particular are noisy (before samples: 870 to 2547 ms).
- The cost of the redesign is +80 KB (the two backdrop images are 65 KB), +3 requests and about +240 DOM nodes. That is well under the 300 KB budget. No third-party requests were added.
- The entrance animation never hides content that is in view at load (`motion.mjs` skips any band whose top is above 92 % of the viewport), so it cannot delay LCP.

## Independent QA (qa-auditor, Phase 9)
Verdict: ready with fixes, no blockers. Fixed in this branch: Vision line art darkened from `#8b9498` (2.96:1) to `#6f797d`; a broken character in the design system doc; a fade at the right edge of the mobile nav so the scrollable row reads as "more". Not a defect: the small `.v-btn` labels in the phone concept are non-interactive `<span>`s inside a labelled concept figure, so the 40 px target rule does not apply. The auditor did not open every screenshot (the 1024 set in particular) and did not test keyboard focus live; those remain unverified by an independent reviewer.

## Further improvements (not in this branch)
1. Signal Lab at 1440: the right column ends early and leaves about 500 px of empty dark space beside the Forge. Make it sticky or rebalance the grid.
2. Trust Lab at 1440 uses only the left 55 % of the width.
3. Hero: a less regular pane grid and a lobby with more depth; the building still reads as an illustration.
4. Parallax in `control_room_scene.mjs` is disabled by CSS only under reduced motion; skip the pointer listener in JavaScript too.
5. Focus ring on the light bands (`--focus` `#1d4f91`) has not been checked in a live browser.
