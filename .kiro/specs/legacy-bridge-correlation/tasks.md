# Phase 2 Kiro execution checklist

**Status 2026-11-09:** PR A merged after genuine Kiro contribution and independent ChatGPT review. PR B is pending. Planning specs alone are not evidence of Kiro code.

## PR A — local source adapters

- [x] Open `main`, pull current changes and create `feat/legacy-adapters`.
- [x] Read `AGENTS.md`, `KIRO.md`, original MVP specs, incident filter specs and this phase 2 spec; use Kiro's spec-driven development and record real work.
- [x] Inspect existing Python CLI, local API, validator and SQLite architecture.
- [x] Implement safe legacy relay text/CSV parser and one-shot local file ingestion.
- [x] Implement the independent JSON access webhook adapter on loopback only, preserving Host/Origin, size limits, existing endpoints and hashes.
- [x] Add synthetic fixture files and 1-2 copy-paste shell commands or Python scripts to replay both sources without credentials.
- [x] Add integration/security/idempotency tests, run existing tests, commit and open PR A; **do not merge on failed CI**.

**PR A result:** [#4 merged](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/4); 113 Python + 29 Node tests and 2 syntax checks passed. Six Python tests and critical CLI/CSV hardening were independently reviewer-authored, not Kiro-authored.\n\n## PR B — correlation and demonstration

- [ ] Create `feat/cross-source-cases` after PR A integration (or explicitly branch on PR A for review if needed).
- [ ] Implement deterministic denied-access -> held-open-door (<=300 seconds) correlated case from existing ledger events.
- [ ] Add source-event IDs and existing evidence hashes to cases; do not edit original SHA-256 ledger or fixtures.
- [ ] Build read-only case query API in Python; add JS equivalent and parity tests for the published static fixture replay.
- [ ] Add accessible browser UI for correlated cases and an offline fixture-fed Legacy Bridge demo, clearly labeled as simulated.
- [ ] Add tests for out-of-order arrivals, time windows, duplicates, negative paths, restart and immutable SHA-256 chain.
- [ ] Run all Python/Node tests and manual browser/mobile QA. Check GitHub Pages is publicly reachable after merge.
- [ ] Record authentic prompts, screenshots/session evidence, test commands, PRs and commit SHAs in `docs/KIRO_EVIDENCE.md` without exposing Kiro coupon/account secrets.
- [ ] Open PR B, merge only after tests and review. Update Devpost ONLY to claim functions that were verified and merged.

## Owner-facing check

- [x] Owner reports seeing **Kiroupon successfully redeemed!** on their personal Kiro account (2026-11-09).\n- [ ] Independently verify the credited promotional balance in the Kiro usage dashboard. Do not publish the one-use code URL.
- [ ] No unattended loops, no Cursor/Codex delegation, no paid model fallback, no real cameras or InnerOS production.
- [ ] Final narrated YouTube demo and Devpost submission are separate gates; require owner's explicit final approval.
