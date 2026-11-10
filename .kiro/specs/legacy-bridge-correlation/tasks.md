# Phase 2 Kiro execution checklist

**Status 2026-11-09:** PR A and PR B are merged, with original Kiro contributions distinguished from independent reviewer fixes. Final public-site/browser QA and Devpost submission remain separate.

## PR A — local source adapters

- [x] Open `main`, pull current changes and create `feat/legacy-adapters`.
- [x] Read `AGENTS.md`, `KIRO.md`, original MVP specs, incident filter specs and this phase 2 spec; use Kiro's spec-driven development and record real work.
- [x] Inspect existing Python CLI, local API, validator and SQLite architecture.
- [x] Implement safe legacy relay text/CSV parser and one-shot local file ingestion.
- [x] Implement the independent JSON access webhook adapter on loopback only, preserving Host/Origin, size limits, existing endpoints and hashes.
- [x] Add synthetic fixture files and 1-2 copy-paste shell commands or Python scripts to replay both sources without credentials.
- [x] Add integration/security/idempotency tests, run existing tests, commit and open PR A; **do not merge on failed CI**.

**PR A result:** [#4 merged](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/4); 113 Python + 29 Node tests and 2 syntax checks passed. Six Python tests and critical CLI/CSV hardening were independently reviewer-authored, not Kiro-authored.

## PR B — correlation and demonstration

- [x] Create `feat/cross-source-cases` after PR A integration (or explicitly branch on PR A for review if needed).
- [x] Implement deterministic denied-access -> held-open-door (<=300 seconds) correlated case from existing ledger events.
- [x] Add source-event IDs and existing evidence hashes to cases; do not edit original SHA-256 ledger or fixtures.
- [x] Build read-only case query API in Python; add JS equivalent and parity tests for the published static fixture replay.
- [x] Add accessible browser UI for correlated cases and an offline fixture-fed Legacy Bridge demo, clearly labeled as simulated.
- [x] Add tests for out-of-order arrivals, time windows, duplicates, negative paths, restart and immutable SHA-256 chain.
- [x] GitHub CI on reviewed PR B head passed 159 Python, 75 Node and 5 JS syntax checks.
- [x] Kiro authored a genuine Phase 2B session record and original tests; an independent reviewer added and labeled separate fixes in `docs/KIRO_EVIDENCE.md`.
- [x] Opened, reviewed and merged [PR #5](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/5); final Devpost edit and submission remain blocked on owner approval.


- [ ] Manually verify live public GitHub Pages/desktop/390px mobile behavior and Python localhost UI (these checks are **not** proved by CI).
## Owner-facing check

- [x] Owner reports seeing **Kiroupon successfully redeemed!** on their personal Kiro account (2026-11-09).
- [ ] Independently verify the credited promotional balance in the Kiro usage dashboard. Do not publish the one-use code URL.
- [ ] No unattended loops, no Cursor/Codex delegation, no paid model fallback, no real cameras or InnerOS production.
- [ ] Final narrated YouTube demo and Devpost submission are separate gates; require owner's explicit final approval.
