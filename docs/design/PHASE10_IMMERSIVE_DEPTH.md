# Phase 10: immersive depth

The owner said the Phase 9 site still looked basic. He asked for vivid colour, real movement in everything that appears, and components with depth that read as 3D, while the site stays minimal and sober. ui-director started this phase. Its run was cut off partway, and the main session reviewed, corrected and finished the work. Screenshots: `docs/design/phase10/after/` (1440, 1024, 390).

## What changed
- **New layer `docs/depth.css`**, loaded after `premium.css`. Code in `docs/motion.mjs` (`initDepth`), with no new script tag.
- **Hero with depth.** The scene has separate layers: aurora, warm glow, pointer spotlight and a perspective floor grid. They move at different rates with the pointer and with scroll. A slow camera drift runs only while the hero is on screen and the tab is visible. When a case opens, the stage light turns amber, the semantic colour for actionable incidents.
- **Elevation.** Cards and panels get layered shadows, an inner highlight edge and a fine grain. Feature cards tilt up to 6° under a fine pointer, with a spring return and a light that follows the cursor.
- **Vivid fields.** "How it works" and Product Vision sit on teal and cyan gradient fields with a warm counterpoint. Text on them is at least 5.0:1. The Vision band also declares its brightest field colour as a solid background so contrast checks see the worst case.
- **Motion.**
  - Scroll-driven reveals use CSS `view()` timelines, with an IntersectionObserver fallback.
  - Ledger rows and timeline rows enter one after another.
  - Hashes decode in when they appear, and the chain links grow from row to row.
  - A metric that changes gives one pulse.
  - On the architecture diagram, one signal pulse runs node to node.
  - A section progress bar sits at the top. A section rail shows only from 1600 px up, so it never covers the building.
- **Primary actions** get a cyan, lime and teal gradient border that turns on hover and focus.

## Corrections the main session made to the partial run
- Removed the count-up on the rule limits (300 s, 120 s) and on the concept alert (2 min 10 s). Mid-animation they showed wrong values, such as "1 min 6 s" or a 87 s threshold, which an evidence product must never show.
- Removed coral and red from the progress bar and the primary-button border, because red is reserved for failed integrity. When a case opens, the floor and aurora now use amber instead of lime.
- Moved the section rail to 1600 px and up.
- Fixed the Vision band contrast check, which had dropped to 1.07:1 because the field was only a pseudo-element.

## Motion off
Pause motion and `prefers-reduced-motion` set `html[data-motion=off]`. That clears the hero variables, releases tilt, shows armed reveals and stops every animation. Nothing is hidden without JavaScript, and nothing in view at load is hidden.

## Tests
- Python: 204 tests, OK.
- Node: 437 of 437 (24 files), including new `motion.test.mjs` cases for `tiltFor`, `countValue` and `activeSection`.
- Syntax checks: 23 of 23.
- Chrome: 595 of 595 across phase8 (89), phase6-experience (159), phase6-audit (39), a11y (39), skip-link (32), forge-focus (40), m0 (56) and m5 (141). The m5 suite was re-run after the last CSS changes.

## Performance
`perf.qa.mjs`, 5 cold launches, median, measured in headless Chrome with `--disable-gpu`, so everything is software-rasterised. Raw data: `perf-phase10.json`.

| | Phase 9 (main) | Phase 10 |
|---|---|---|
| LCP 1440, from document arrival | 335 ms | 195 ms |
| LCP 390, CPU 4x | 1374 ms | 648 ms |
| CLS 1440 | 0.0104 | 0.015 |
| Transferred | 428 KB | 459 KB |
| Frames in ~5 s while a case plays, 1440 | ~294 (p95 16.7 ms) | ~270 (p95 33.3 ms, 2 to 9 frames over 33 ms) |
| Frames, 390 CPU 4x | p95 16.8 ms | p95 16.8 ms |

How to read this:
- First paint did not get slower.
- During the busiest 5 seconds of a case, the desktop page dropped from about 59 to about 54 frames per second in this software-rendered harness.
- Probes showed the cost is spread across the new transitions and animations, not one effect. Removing all of them restores 292 frames.
- On a machine with GPU compositing the cost should be lower, but that was not measured.

## Not verified
- No independent review by qa-auditor yet.
- No real-GPU or real-phone measurement.
- No screen-reader pass.
