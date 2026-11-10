# Interactive Evidence Reconstruction — proposed architecture

**Drafted by ChatGPT for Kiro to review and revise, not implemented.**

Read existing `docs/app.js`, `docs/index.html`, `docs/styles.css`, `docs/engine.mjs`, `docs/correlator.mjs`, `ghostbridge/server.py` and `tests/correlator.test.mjs` before editing.

## Proposed modules

- `docs/reconstruction.mjs` (pure data projection, no DOM): accepts `rows` and a selected `case`, verifies case event references against ledger hash values, returns sorted explanatory playback steps, source highlighting, labels and time gaps. Favor existing verified ledger and existing JS correlator; do not duplicate security rules.
- `docs/reconstruction-view.mjs` (DOM/SVG UI): produces a unique accessible reconstruction scene and timeline controls from passed data. No hardcoded result text for case A001/R003, except generic UI words.
- `docs/app.js`: connect case buttons to the new viewer; integrate integrity check and reset handling; avoid async rendering races.
- `docs/index.html`: a dedicated accessible reconstruction section or modal with a realistic 2.5D lobby diagram, controllable timeline, source/evidence drawer. Keep the existing correlated case UI intact.
- `docs/styles.css`: visual system, glow/lighting, states, responsive layout and reduced-motion rules.
- Tests: pure projection tests in Node; optional browser-level or manual real Chromium QA for 1440px/390px.

## Sequence of the synthetic fixture

- `relay:R001` at 22:00:00, before the denied access (exclude as candidate for this case).
- `access:A001` at 22:00:30 (anchor).
- `relay:R003` at 22:05:00, duration 130 seconds (qualifies).
- Case derived from a 270-second gap within 300-second window and a hold exceeding 120s.
- Inspector references original ledger row hashes only. The case ID is stable and already generated in Python/JS; do not rehash or rewrite original events.

## Visual story for the film

Slow camera pan over stylized building entrance → red denied reader → time advances → amber held-open door → connection line drawn between source indicators → one high-priority case panel with original evidence labels → sources light up / operator sees next action. Keep it readable and not magical.

**Commercial film creative brief:** `docs/WINNING_DEMO_STRATEGY.md` and `docs/DEMO_SCRIPT.md`. The future mobile/enterprise console shots are video conceptualization and need **not** be built inside the MVP for this feature.

## Implementation approach

Build the data projection and tests first, then a simple interactive wireframe, then motion/polish. Retain privacy safeguards and default local execution. No third-party JS framework is required. Record real screenshots/PR evidence in the repo. Prepare a concise demonstration recording of the real feature for insertion into the final cinematic sales film.
