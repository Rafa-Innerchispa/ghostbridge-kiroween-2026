# Control Room: tasks

Each milestone ends with a validation. A box is ticked only after that validation ran; the evidence is in `docs/KIRO_EVIDENCE.md` and `docs/evidence/control-room/`.

## M0. Intake and validation of PR #10
- [x] Read the master brief, playbook, competitive review, Issue #11, PR #10 and its code.
- [x] Real Chrome validation of Signal Forge: 56/56 checks, 0 harness retries (`docs/evidence/control-room/m0-signal-forge/REPORT.md`). No Forge defect found, PR #10 untouched.
- [x] Create `feat/kiro-immersive-control-room` from the validated head.

## M1. Spec, steering, safety, assets
- [x] requirements.md, design.md, tasks.md (this folder).
- [x] Steering rule `.kiro/steering/control-room.md`.
- [x] Unattended-run guard hook + 65 tests.
- [x] Custom agents `ui-director` and `qa-auditor` created with Kiro's agent creator (`.kiro/agents/`). **Not yet invoked**: Kiro loads agent files on startup.
- [x] Vendored fonts, inline favicon. Validation: zero third-party requests and zero 404s in the browser.

## M2. Spatial flagship
- [x] `control_room.mjs` pure model + tests (derive scene, explain pair, near-miss, agreement with `correlate()`).
- [x] `control_room_scene.mjs` SVG scene with five depth layers and four source markers.
- [x] Forge composer integrated inside the stage; rule gauges; Challenge A and B. Validation: browser run of both challenges (M5 S2).
- [x] Screenshots inspected at 1440, 1280 and 390; layout defects found and fixed (see evidence).

## M3. Operator and vision
- [x] Modes Building / Timeline / Evidence / Response with preserved state.
- [x] Case board, advisory recommendations, before/after reveal.
- [x] PRODUCT VISION chapter, contact CTA `info@innerchispa.us` only.

## M4. Showcase Mode
- [x] `showcase.mjs` timer + 19 tests (pause/resume/restart, injectable scheduler).
- [x] Overlay with Play/Pause/Restart/Exit, `?present=1`. Validation: a full timed run drives the real ledger (M5 S4).

## M5. Verification and delivery
- [x] Property tests (400 seeded random + 231 exhaustive boundary configs) and a 100-configuration Python/JS hash parity fixture.
- [x] CI and Pages gates include every new file; a test now fails if any module or test file is missing from CI.
- [x] Full regression (Python 169 x 10 runs, Node 318, syntax 15/15) and real-browser QA: 141 of 141 checks with inspected screenshots (`docs/evidence/control-room/m5/REPORT.md`).
- [x] `docs/KIRO_EVIDENCE.md`, push, stacked PR onto `feat/signal-forge-interactive`. Do not merge or deploy.

## Found along the way
- A pre-existing Windows-flaky server defect (413/415/403 sent without reading the body, causing TCP RST) was root-caused and fixed in its own commit with raw-socket regression tests. It is the only Python source change.
- `explainPair` explained the earliest denial instead of the closest pair when no pair qualified. Fixed and covered by a mutation-checked test.
