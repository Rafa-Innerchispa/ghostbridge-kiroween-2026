# GhostBridge | Interactive Evidence Reconstruction — requirements

**Status:** creative/technical specification drafted by ChatGPT for Kiro; not Kiro-authored code or a completed feature. Goal: a **visually outstanding real UI** to support the premium Kiroween sales film, with no dependency on cloud inference.

## R1 — Make a beautiful, explorable case reconstruction
- Add a visible **Reconstruct Case** action from the existing Correlated Cases panel.
- Reconstruct the **actual verified evidence ledger** and selected correlated case. Do not hardcode case counts, timestamps, source identifiers or evidentiary hashes in the renderer.
- Draw a responsive 2.5D stylized generic high-rise lobby or entryway, with reader, door and optional camera icon. Premium enterprise aesthetic, consistent with GhostBridge palette.
- Animate or step the timeline with controls: Play/Pause, Previous/Next, Restart, speed; respect `prefers-reduced-motion`. Time compression must be visually understandable.
- Evidence inspector must show exact recorded event IDs, UTC times, source device, rule name and original row hashes from the verified ledger. Show how a case was derived, not just a decorative alert.
- A **Why this matches** panel should explain 270 s within a 300 s window and 130 s hold vs 120 s threshold; earlier relay:R001 at 22:00:00Z is correctly excluded because it precedes the 22:00:30Z denial.

## R2 — Preserve real app integrity
- Browser GitHub Pages uses existing static modules, browser-only localStorage/WebCrypto and no external services. Python localhost uses existing loopback API and SQLite.
- Reconstruction is a read-only projection, never inserted into the ledger. Must not mutate original case/event hashing, exported JSON, idempotency or counters.
- Reject/disable reconstruction on failed evidence integrity instead of showing plausible but unverified scenes.
- Support all existing scenarios, including no case, replay, reset, severity filter and export.
- No claim of actual camera images, real surveillance, facial recognition or hardware control. Those future product experiences are handled separately in commercial conceptual film.

## R3 — Polish, accessibility and performance
- Keyboard-operable semantic controls and visible focus, understandable aria labels/status; obey reduced motion.
- 1440 px desktop and 390 px mobile; no horizontal overflow; no text clipping; smooth playback with deterministic timestamps.
- Avoid excessive reflow or continuous network activity, unbounded loops or additional runtime dependencies.
- Include professional fallback/empty states, designed for the real business user.

## R4 — Evidence and judging
- Use genuine Kiro IDE spec-driven development. Add useful Kiro steering and a bounded automated regression hook only if supported on the owner's local version; do not claim those features unless actually used.
- New tests cover real ledger-derived reconstruction, 270s/300s boundary reasoning, source hashes, out-of-order events, empty/invalid ledgers, controls, reset/replay and accessibility.
- CI and Pages checks must pass. Record a genuine Kiro session/provenance and screenshots in `docs/KIRO_EVIDENCE.md`.
- Single PR `feat/evidence-reconstruction`, stop before merge. Independent review will be completed outside Kiro.
- No purchases, paid third-party models, local InnerOS production system, network scan, camera or customer data.
