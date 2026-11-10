# Evidence Reconstruction | Kiro implementation tasks

**Status 2026-11-10:** implemented on `feat/evidence-reconstruction` in a Kiro IDE Autopilot session; awaiting independent review. Evidence and exact results: `docs/KIRO_EVIDENCE.md`.

- [x] Pull fresh `main`, read issue #6, `KIRO.md`, `AGENTS.md` and all Evidence Reconstruction spec files. Inspect existing correlated-case and ledger API; confirm the current demo works before changes. *(Baseline 159 Python + 75 Node green on clean main.)*
- [x] Create `feat/evidence-reconstruction` branch from clean `main`; refine specification in genuine Kiro IDE session if needed. *(Design refinements are listed in the evidence file.)*
- [x] Implement read-only ledger-driven case projection with per-source events, timestamps, verified SHA-256 hash references and derived eligibility rationale. *(`docs/reconstruction.mjs`)*
- [x] Build premium 2.5D/visual entryway with light states, event-source animations and case badge. *(`docs/reconstruction-view.mjs`, `docs/styles.css`)*
- [x] Implement accessible Play/Pause/Step/Reset/timeline speed controls, screen-reader-friendly descriptions, reduced-motion handling. *(Keyboard, focus, names and reduced motion verified; no screen reader and no contrast measurement.)*
- [x] Ensure Python localhost and static browser modes both work without paid dependencies and without altering evidence contents. *(Verified in Chrome against both; no Python files changed.)*
- [x] Add tests for 270s fixture, 300s boundaries, earlier nonmatching relay R001, missing/invalid case evidence, reset, replay, no cross-source cases, source hash resolution and integrity. *(82 new Node tests.)*
- [x] Run all existing and new Python/Node tests, ensure CI/Pages gates include new tests/syntax modules; perform visual desktop and 390px mobile QA with screenshots. *(89 scripted Chrome checks; screenshots are automated captures, see limitations.)*
- [x] Document genuine Kiro IDE session steps, usage of steering/hook only if truly used, changed files, PR and tests. Preserve attribution of existing code and later reviewer edits. *(Steering used; hook configured but not observed firing.)*
- [ ] Commit/push/open PR; report URL, exact test counts, any failing checks, media still needed, and credit usage. **Stop before merge**. *(Credit usage cannot be read from the session; owner must check the usage dashboard.)*

## Still needed from the owner

- A genuine Kiro IDE screen capture or recording and the usage dashboard figure (not obtainable from inside the session).
- Confirm the on-save hook fires after restarting Kiro.
- Independent review, then merge decision. Not merged or submitted by this session.
