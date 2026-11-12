# Control Room: design

Refines the ChatGPT brief after reading the actual code. Deviations from the brief are marked **(changed)**.

## Architecture (no second app, no framework)

```
rows (ledger)  ──►  control_room.mjs (pure)  ──►  control_room_view.mjs (SVG + DOM)
   ▲                  deriveScene / explainPair        scene, tabs, timeline, evidence,
   │                  buildTimeline / buildBoard        response, before/after
   │                  beforeAfter / recommend
   │
app.js  ── render() ──► controlRoom.refresh()      (one added call; no other control flow changes)
   │                    bridge: getRows, ingest, reset, openForge, reconstruct, verify
   └──── showcase.mjs (pure timer/beats) ──► showcase_view.mjs (overlay) ──► bridge (REAL ledger)
```

- **control_room.mjs**: pure, no DOM, no timers. Imports `evaluateForge`, `WINDOW_SECONDS`, `DOOR_HELD_THRESHOLD`, never copies them.
- **control_room_view.mjs**: builds the SVG and tab panels with `createElementNS`/`textContent` only (no `innerHTML`). Receives `{rows, cases, cursor, selected}` and paints.
- **showcase.mjs**: a beat table and a pausable timer with an injectable scheduler (same pattern as `playback.mjs`). **(changed)** The brief says "no hidden scene scripting": beats call `bridge.*` which uses the same `append`/`verify`/`correlate` path as manual use.
- **vision.mjs**: static concept screens (SVG/HTML), one chapter.

## Scene: why SVG, not WebGL **(changed)**
The brief allows Three.js "if justified". It is not: the story needs depth, light and cause, not free camera movement. Four SVG layers (sky, skyline, facade, foreground) with a CSS parallax on pointer move give depth, cost about 120 DOM nodes, need no dependency, and work in every browser, so there is no fallback to maintain. Motion is CSS transforms and opacity only.

## Scene state is derived, never scripted
`deriveScene(rows, cursorSeconds)` walks the ledger events with `at <= cursor` and returns
`{reader, door, camera, presence, link, caseId, nodes}`. Door "held" means `duration_seconds >= DOOR_HELD_THRESHOLD`. `explainPair(rows)` pairs the earliest `access.denied` with the next `door.open` after it and returns `kind: 'case' | 'near-miss' | 'none'` plus `gap`, `hold`, `windowPass`, `holdPass` and plain-language reasons. It must agree with `correlate()`; a test enforces that on random inputs.

## Modes preserve state
One `state = {mode, selected, cursor, caseId}` object owned by the view. Tabs only change which panel is visible, so nothing is lost on switch. The scene is shared by all modes and is not rebuilt.

## Forge integration without duplicating logic
The existing `#forge-panel` DOM node is moved into a slot beside the scene at startup. Its ids and handlers are untouched, so `runForge` still does the work. The Control Room only (a) listens to the same inputs to draw two rule gauges from `evaluateForge()`, and (b) presses the existing preset/run buttons for Challenge A and B.

## Showcase beats (about 58 s)
| # | s | Beat | Real action |
|---|---|---|---|
| 1 | 6 | The building is visible | reset lab, scene idle |
| 2 | 8 | Access denied | append `forge:denied` |
| 3 | 9 | Door held open | append `forge:later-door` |
| 4 | 9 | Signals correlate | verify, correlate, link and case appear |
| 5 | 10 | Reconstruction | append the earlier door, open the reconstruction and step it |
| 6 | 6 | Evidence and hashes | Evidence mode, verify chain |
| 7 | 5 | Operator result | Response mode |
| 8 | 5 | Product vision | scroll to the chapter, end card |

## Fonts and favicon **(changed)**
`styles.css` imports Google Fonts at runtime, a third-party request that conflicts with local-first. Vendor the two OFL variable woff2 files under `docs/fonts/` and inline the favicon.

## Risks
- `app.js` is dense and shared: keep the edit to imports, one `refresh()` call in `render()`, and a bridge object.
- Async races on rapid ledger changes: the view paints from a snapshot and ignores stale tokens (same token pattern as `renderCases`).
- Hero replaces the old decorative hero: existing ids used by tests/QA (`#workspace`, scenario buttons) are untouched.
