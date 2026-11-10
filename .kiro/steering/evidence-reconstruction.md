---
inclusion: fileMatch
fileMatchPattern: 'docs/(reconstruction|playback).*\.mjs|tests/reconstruction.*'
---

# Evidence reconstruction rules

Applies when editing the interactive reconstruction modules or their tests.

- The reconstruction is a **read-only projection of the verified ledger**. Verify the
  chain with `verify()` and re-derive the case with `correlate()` before building any
  scene. If either fails, show an error state, never a plausible-looking scene.
- Never hardcode fixture values (event IDs such as the demo's access/relay IDs, timestamps,
  hashes, counts) in the renderer or projection. Every label comes from ledger rows.
  A regression test scans the source for those literals.
- Reuse `WINDOW_SECONDS`, `DOOR_HELD_THRESHOLD` and `correlate()` from
  `docs/correlator.mjs`. Do not copy the rule thresholds.
- Never mutate `rows`, a case, or `engine.mjs` hashing. Never write reconstruction state to
  localStorage, SQLite or the exported evidence JSON.
- Make no claim of camera imagery, surveillance, or hardware control. The scene is a
  stylized generic entryway driven by synthetic events.
- Respect `prefers-reduced-motion` and keep every control keyboard-operable.
- Validate with `node --test tests/reconstruction.test.mjs` plus the full suites:
  `python -m unittest discover -s tests` and the three existing Node test files.
