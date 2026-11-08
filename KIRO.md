# GhostBridge | Kiro execution handoff

**Updated: 2026-11-08.** Independent, local-first MIT-licensed Kiroween 2026 project. This repository contains only synthetic events; it does **not** connect to production InnerOS or real customer devices.

## Verified phase 1: COMPLETE

- Original GhostBridge MVP and initial `.kiro/specs/ghostbridge-mvp/` were created using Codex/ChatGPT, before authentic Kiro participation.
- **Kiro IDE Autopilot** genuinely implemented the All / High / Medium incident severity filter and 17 new tests.
- [PR #2](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/2) was reviewed and merged as commit `367cc2ee2ab46f7ac4eb12496ce6b2e3326121fe`.
- [Kiro session evidence](docs/KIRO_EVIDENCE.md) documents exactly what Kiro contributed. Original MVP remains attributed to Codex.
- Existing CI and Pages checks pass 29 Python + 29 JavaScript tests; offline Chromium interaction QA has [32/32 PASS](docs/BROWSER_QA_2026-11-07.md), with limitations clearly stated.

## Credits

The owner received an **official Kiroween 2026 email approving 4,000 promotional Kiro credits on 2026-11-08**. Whether the one-use code has been redeemed on the personal Kiro account is **not verified by this repository**. The code must be redeemed by December 4, 2026; redeemed credits expire December 31, 2026, 11:59 PM PT.

**Never commit or expose the one-use coupon URL, account tokens, credentials, or private email contents.** Do not purchase a plan or route to paid external agents.

## Phase 2: ACTIVE TASK FOR KIRO IDE (IMPLEMENTATION PENDING)

See [GitHub issue #3](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/issues/3).

Read:
- `AGENTS.md`
- `.kiro/specs/legacy-bridge-correlation/requirements.md`
- `.kiro/specs/legacy-bridge-correlation/design.md`
- `.kiro/specs/legacy-bridge-correlation/tasks.md`
- `ghostbridge/core.py`, `ghostbridge/engine.py`, `ghostbridge/storage.py`, `ghostbridge/server.py`, `docs/engine.mjs`, `docs/app.js`

**Owner's Kiro IDE / CLI prompt (paste after pulling latest main):**

> Continue GhostBridge for Kiroween 2026 using genuine Kiro IDE spec-driven development. Phase 1 severity filtering is already merged and must not be repeated. Read AGENTS.md, KIRO.md, GitHub issue #3 and all .kiro/specs/legacy-bridge-correlation/ documents. Implement Phase 2 in two bounded PRs. First build two genuinely independent, safe local ingest adapters: a legacy relay CSV/text-file importer and a loopback-only JSON access-controller webhook. Normalize both through the existing strict event contract, with safe fixture inputs, secure validation, idempotency, SQLite persistence and tests. Then add an explainable cross-signal case correlator for an access.denied event followed within 300 seconds by a door.open held >=120 seconds. The case must reference original event IDs and SHA-256 record hashes, with deterministic matching and no mutation of the ledger. Show the result in the Python localhost UI and a clearly labeled offline fixture-fed browser demo on GitHub Pages. Do not claim any physical integration. Run all existing and new tests, including Python, Node, verification/export regression and mobile UI. Update docs/KIRO_EVIDENCE.md with genuine Kiro session evidence, changed files, tests and PR links; keep the Codex-built MVP attribution honest. Open and push separate reviewable PRs. Stop after each PR with a PASS/FAIL report; do not auto-merge or submit Devpost. No paid services, other agents, production InnerOS, real devices, tokens or unattended retries. Prefer small local executions and no unrelated modifications.

## Delivery and integration guardrails

1. Branch from fresh `main` and avoid modifying any hackathon-frozen unrelated projects.
2. Build adapter PR A first. It must independently pass CI and keep old demos working.
3. Only then implement correlation PR B. Review and merge separately.
4. Do not change original `tests/night-ledger.json` or canonical hashing without a specific approved design migration.
5. Record authentic Kiro prompts, screenshots, logs, test evidence, commits and Devpost claims **after implementation**. A planning spec is not implementation.
6. The existing Devpost project page is published but **the hackathon submission has not been sent** and the video is pending.
7. Final Kiroween submission deadline: December 4, 2026 at 14:00 Pacific / 17:00 Ecuador; owner approval required for submission.

**Integration philosophy:** Kiro is a development agent. GhostBridge does not require Kiro at runtime and is not granted authority to operate InnerOS. A real InnerOS read-only adapter could be a later separately approved project.
