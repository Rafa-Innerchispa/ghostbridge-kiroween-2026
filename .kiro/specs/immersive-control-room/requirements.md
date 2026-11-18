# GhostBridge Control Room: The Building Speaks. Requirements

**Status:** being executed in a Kiro IDE Autopilot session on `feat/kiro-immersive-control-room`, stacked on `feat/signal-forge-interactive` (PR #10, draft, authored by ChatGPT, not Kiro).
Primary brief: `docs/KIRO_IMMERSIVE_CONTROL_ROOM_MASTER_BRIEF.md` (ChatGPT-authored planning, not Kiro work). Issue: #11.
Requirements below are written in EARS form so each one can be tested.

## Glossary
- **Ledger**: the SHA-256 chained `rows` array (browser) or SQLite ledger (Python). The single source of truth.
- **Scene**: the architectural SVG building view. **Showcase**: the guided presentation mode.
- **Case**: a derived `denied-then-held-open` correlation from `correlate()`.

## R1. Living architecture (first viewport)
1. WHEN the page loads, THE SYSTEM SHALL show a stylized residential building entrance with at least four depth layers, a door, a reader, a camera and a presence zone.
2. THE SYSTEM SHALL render the scene's device states from `rows` only. No device state SHALL come from a hardcoded animation.
3. WHEN the ledger holds an `access.denied` event, THE reader SHALL show a denied state; WHEN it holds a held-open `door.open`, THE door SHALL show an open-held state; WHEN a camera event is present THE camera SHALL show online or offline accordingly.
4. WHEN a case exists, THE SYSTEM SHALL draw a link between reader and door labelled with the measured gap in seconds and show the case ID.
5. WHEN the ledger is empty, THE SYSTEM SHALL show the building idle with an inviting empty state and two primary actions: **Forge an incident** and **Watch an incident unfold**.
6. Each source node SHALL be a keyboard-operable button that opens an inspector with that device's latest recorded event, UTC time and row hash, or "Awaiting signal".

## R2. Signal Forge integration
1. WHEN the user presses **Forge an incident**, THE SYSTEM SHALL open the existing Signal Forge composer (no second implementation of event creation, validation, hashing or correlation).
2. WHILE the user moves the delay, hold or camera controls, THE SYSTEM SHALL show a live forecast computed from `evaluateForge()` using the real rule constants (window 300 s, hold 120 s).
3. THE SYSTEM SHALL offer **Challenge A (299 s / 120 s)** and **Challenge B (301 s / 119 s)**. A SHALL yield one high-severity case. B SHALL yield no case and explain which condition failed and by how many seconds.
4. WHEN no case is derived but a denial is followed by a door event, THE scene SHALL show a broken ("near-miss") link with the exact gap and hold and the failed condition, computed from `rows`.
5. Replay SHALL remain idempotent and Reset SHALL return the scene to idle.

## R3. Operator experience
1. THE SYSTEM SHALL provide four modes, **Building / Timeline / Evidence / Response**, as an accessible tablist. Switching modes SHALL preserve the selected node, time cursor and open case.
2. **Timeline** SHALL draw the recorded events to scale and let the user scrub; scrubbing SHALL change the scene to the state at that time.
3. **Evidence** SHALL list each source event with ID, UTC time, device, row hash and previous hash, and SHALL offer the existing Evidence Reconstruction and chain verification.
4. **Response** SHALL answer: what happened, where, why linked, which observations were excluded, what evidence supports it, what to investigate next.
5. Recommendations SHALL be advisory text. THE SYSTEM SHALL NOT control, unlock, or message any real device or person.
6. THE SYSTEM SHALL include a **Disconnected alarms to one explained incident** before/after comparison built from the actual events in the ledger.

## R4. Product vision
1. THE SYSTEM SHALL present one **PRODUCT VISION** chapter with concept screens for mobile alerts, floor-by-floor digital twin, multi-property operations, evidence-based escalation and authorized operator workflow, and local integration with legacy infrastructure.
2. THE chapter SHALL be labelled once; individual panels SHALL NOT repeat disclaimers.
3. THE commercial call to action SHALL use only the verified contact **info@innerchispa.us**. THE SYSTEM SHALL NOT display invented phone numbers, addresses or prices.

## R5. Showcase Mode
1. THE SYSTEM SHALL provide a 45-60 second guided mode with Play, Pause, Restart and Exit, reachable by a button and by `?present=1`.
2. Its technical beats SHALL be produced by the real ledger: reset, append real forge events one by one, verify, correlate, reconstruct. It SHALL NOT replay a scripted animation of results.
3. THE beats SHALL cover: building visible, access denied, door held open, correlation, reconstruction, evidence hashes, operator result, transition to product vision.
4. Pausing SHALL freeze the timer; resuming SHALL continue the current beat's remaining time.
5. WHEN `prefers-reduced-motion` is set, THE SYSTEM SHALL not auto-animate camera pans; beats SHALL advance on the same timer with instant transitions.

## R6. Preservation
THE SYSTEM SHALL keep Night Watch 5/3, Normal Shift 4/0, Access Denied 1/1, Legacy Bridge 5/3/1, Signal Forge, Evidence Reconstruction, severity filters, replay idempotency, reset, tamper test, JSON export, SHA-256 verification, Python/SQLite mode and browser-only mode unchanged. No Python source file SHALL change. `docs/engine.mjs`, `docs/correlator.mjs` and the canonical hashing SHALL NOT change.

## R7. Quality
1. THE page SHALL work at 1440x900, 1280x720 and 390 px with no horizontal overflow.
2. Every control SHALL be keyboard operable with a visible focus ring; touch targets SHALL be at least 40 px (sliders at least 24 px).
3. THE page SHALL make no third-party network request: fonts SHALL be vendored and the favicon inline.
4. THE page SHALL produce no console errors.
5. THE scene SHALL not use WebGL. SVG and CSS are sufficient, keep the page light, and need no fallback.

## R8. Verification
Random boundary tests (seeded, at least 300 cases) SHALL check the correlation rule, determinism, idempotency, insertion-order independence, and Python/JavaScript hash parity. Real-browser screenshots SHALL be inspected, not assumed.

## R9. Honesty
No existing ChatGPT or Codex code SHALL be attributed to Kiro. The scene is stylized and synthetic, not camera footage. Credits SHALL be reported only if observable.
