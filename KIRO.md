# GhostBridge | Kiro execution handoff

**Updated:** 2026-11-09. **Current priority: Phase 2 PR B, cross-source correlation.**

## Completed and verified

- Initial GhostBridge MVP and the initial `.kiro` plans were authored using Codex/ChatGPT, **not** Kiro.
- **Phase 1 (Kiro):** All / High / Medium filters and 17 regression tests. [PR #2 merged](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/2).
- **Phase 2A (Kiro):** local legacy relay CSV adapter and loopback-only JSON access webhook. Kiro authored the adapters, fixtures, 78 tests and integration in [PR #4](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/4). **Merged** as `9bd5cfb417cc82094d5baff493c8c6fe90e551c7`.
- **Independent ChatGPT review of PR #4 (not Kiro):** corrected CSV CLI argument position / duplicate SQLite closing, hardened malformed CSV handling, created six reviewer-authored regressions and fixed cross-platform command examples. Current PR A merge checks passed **113 Python + 29 Node tests + 2 JS syntax checks**. See [evidence](docs/KIRO_EVIDENCE.md).
- Existing offline Chromium QA for the *earlier* severity filter passed 32 checks, with acknowledged test-harness limitations; this does not validate the still-unbuilt correlation UI.

## Kiro credits

On 2026-11-09 the owner **confirmed that the one-use Kiroween promotional-credit redemption displayed "Kiroupon successfully redeemed!"** on the intended personal Kiro account. The actual 4,000-credit ledger balance should be checked in https://kiro.dev/account/usage; it is not independently readable from this repository. **Never share, log or commit the private coupon URL.** Credit validity ends 2026-12-31 23:59 Pacific. No purchases or other paid agents.

## ACTIVE: Phase 2B — correlated multi-source cases

Read first:
- `AGENTS.md`
- [GitHub Issue #3](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/issues/3)
- `.kiro/specs/legacy-bridge-correlation/requirements.md`
- `.kiro/specs/legacy-bridge-correlation/design.md`
- `.kiro/specs/legacy-bridge-correlation/tasks.md`
- `fixtures/README.md`
- `ghostbridge/adapters/relay_csv.py` and `ghostbridge/adapters/access_webhook.py`
- `ghostbridge/core.py`, `ghostbridge/engine.py`, `ghostbridge/storage.py`, `ghostbridge/server.py`
- `docs/engine.mjs`, `docs/app.js`, `docs/filters.mjs`.

### Paste this into the signed-in Kiro IDE session (on a fresh main)

> Continue GhostBridge Kiroween 2026. **Phase 2A PR #4 is already merged**, and the promotional-credit code has been redeemed. Pull the latest `main`. Read AGENTS.md, KIRO.md, GitHub issue #3, and the full `.kiro/specs/legacy-bridge-correlation/` requirements, design and tasks. Implement **Phase 2B ONLY**, using the real Kiro IDE spec-driven workflow. Create `feat/cross-source-cases` off updated `main`. Build a deterministic derived multi-source case: an `access.denied` followed within 300 seconds by a `door.open` held at least 120 seconds, using normalized source events. The correlated case must have stable ID, severity, explanation, original event IDs, record hashes and rule provenance. Handle out-of-order ingest, time boundaries and duplicates; derive cases from the verified ledger without mutating SHA-256 events, hashes, exports or existing fixtures. Add read-only `GET /api/cases` on loopback Python, a visible correlated-cases panel and a **clearly labeled offline fixture-replay** flow on the browser-only GitHub Pages demo. The static site must parse synthetic CSV/JSON adapters in-browser and must not claim to run a live HTTP webhook or connect real cameras. Add comprehensive Python/JS parity and security/regression tests. Validate original scenarios, all existing tests, integrity/export and 390px mobile UI. Document real Kiro prompts, steps, code, screenshots, tests, changes and limits in `docs/KIRO_EVIDENCE.md`. Open a PR with CI green and show the code changes. **Stop before merging** and report PR link, real tests and credit usage. No cloud model fallback, paid subscriptions, production InnerOS, real physical devices or customer data. Do not publish a Devpost submission.

### Exact demonstration acceptance check

- Ingest `fixtures/access_webhook_denied.json` and `fixtures/relay_night_shift.csv` via their **real** parsers into one local ledger.
- The fixture access rejection is at 22:00:30Z and the qualifying subsequent held-open relay event is at 22:05:00Z (270 seconds later), within the 300-second rule. The earlier 22:00:00Z relay event is **not** after the denial.
- Show **one** correlated case referencing `access:A001` and `relay:R003`, their actual ledger hashes and an explanation. The original individual incidents and full evidence chain remain separate.
- Verify that replays produce no duplicates, cases remain deterministic after restart, and normal fixtures yield no cases.
- After PR B review and merge, repeat browser QA and update Devpost only with tested capabilities.

## Delivery guardrails

Do not repeat PR A or reopen PR #2 or #4. Do not change unrelated hackathon repos. Kiro is a development agent, not a runtime dependency. No real hardware or InnerOS production integration is claimed. Final Kiroween submission is **not sent** and requires owner approval plus the real under-3-minute video. Deadline: December 4, 2026 at 14:00 Pacific / 17:00 Ecuador.
