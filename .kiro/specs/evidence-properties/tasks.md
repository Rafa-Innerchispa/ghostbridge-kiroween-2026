# Evidence properties | Kiro implementation tasks
**Status 2026-11-24:** implemented by Kiro in a Kiro IDE session on `feat/kiro-premium-art-direction` (PR #19), at the owner's request.

- [x] Read the three implementations and the existing property tests; confirm what is already covered (`tests/property.test.mjs`). *(Browser engine and Signal Forge covered; Python, verifier, receipts and cross-implementation agreement were not.)*
- [x] R1, R2: chain soundness and exact-row tamper detection against the independent verifier. *(300 and 400 random ledgers.)*
- [x] R3: truncation and recomputed rewrites, with and without a receipt. *(300 random ledgers.)*
- [x] R4: the correlation rule against a literal oracle, soundness, uniqueness, determinism, no mutation, order independence. *(600 + 300 random ledgers.)*
- [x] R5: Python and browser engine and verifier agree, through `tests/helpers/js_oracle.mjs`. *(150 ledgers, 150 tampered copies, 450 receipt checks.)*
- [x] Check the tests catch real faults: window 301, hold 119, hold 121 injected in memory. *(All three caught.)*
- [x] R6: PostFileSave hook and bounded runner, with tests in `tests/hooks.test.mjs` for the matcher and a real run.
- [x] Add the `incident-walkthrough` skill to the Evidence Power (1.1.0); every step uses fields the tools really return.
- [ ] Owner: see the hook fire in the IDE by saving one of the matched files, and use the Power's new skill in a recorded Kiro chat.
