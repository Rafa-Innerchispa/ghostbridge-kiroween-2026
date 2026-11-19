# Phase 8: evidence anyone can verify

Branch `feat/kiro-verifiable-evidence`, stacked on PR #17 (`feat/kiro-premium-judge-experience`, `9e2f1ee`). Draft PR; merging needs the owner.
Status words: IMPLEMENTED / EXECUTED / VERIFIED / NOT PROVEN.

## What was built and by whom
| Item | Author | Status |
|---|---|---|
| `docs/evidence_receipt.mjs`: seal a ledger; check it later as matches / extended / truncated / rewritten / broken | Kiro main session | VERIFIED: 7 tests incl. a 150-ledger property test and every-position rewrite test |
| `docs/byo_log.mjs`: own-log CSV for the four sources, strict contract, all-or-nothing, line-numbered errors | Kiro main session | VERIFIED: 7 tests |
| `docs/verify/verify_evidence.py`: independent standard-library verifier (imports nothing from GhostBridge), served by the site | Kiro main session | VERIFIED: 3 Python tests (same head as the engine for every scenario; tamper; receipt) and a cross-language Node test (browser exports and receipts verified by the script, including a rewritten history) |
| `powers/ghostbridge-evidence/`: Agent Plugins 1.0.0 Power with a self-contained MCP server and two skills | Kiro main session | VERIFIED as a package: 5 tests incl. a stdio round trip from a copy of the folder without the repository. **Install and use from Kiro: NOT PROVEN** (owner step) |
| `docs/byo_view.mjs`, `docs/receipt_view.mjs`, wiring, CSS | ui-director run D | VERIFIED: 31 view tests; Chrome suite `phase8-verifiable` 89/89 |
| Devpost texts, video script (2:45), judge guide, Cursor handoff and message contract | Kiro main session | written |

## Measured results (Phase 8 head)
| Suite | Result | Baseline (Phase 7) |
|---|---|---|
| Python | 196 OK | 188 (+3 verifier, +5 Power) |
| Node, 23 files | 427 of 427 | 382 (+7 receipt, +7 own log, +14 own-log view, +17 receipt view) |
| `node --check` | 22 of 22 | 18 (+4 modules) |
| Chrome, 8 suites | 595 checks, 0 retries | 506 (+89 Phase 8 suite; other suites unchanged). Phase 7 reports said 556; that was an addition error |

Screenshots: `byo-1440.png`, `byo-errors-1440.png`, `byo-390.png`, `seal-1440.png`, `receipt-failed-1440.png`, `seal-390.png` (inspected by ui-director and by the Kiro main session).

## qa-auditor Phase 8 review (`qa-auditor-phase8.md`): PASS WITH FINDINGS, all fixed
| Finding | Fix |
|---|---|
| Agent run counts had no log behind them | `agent-runs.json`: every run from the Kiro session log (ui-director 6, qa-auditor 7 including this review) |
| `docs/handoff/` would be published by Pages and contained InnerOS ids | moved to `handoff/` at the repo root; InnerOS ids, correlation id and idempotency key replaced by placeholders |
| Devpost text claimed the Power without the "not yet installed" condition | reworded: "packaged as a Kiro Power"; the Power bullet is marked "built and tested" with the owner note; release checklist row updated |
| Verifier crashed on a receipt that is not an object; accepted `rows: true` | exit 2 for a non-object receipt; booleans rejected; 2 new assertions in `tests/test_verify_evidence.py` |
| "About 100 lines" wording | "a short, single-file" |
| Auditor's scratch files under `docs/evidence/phase8/qa-run/` (would be published) | removed |
The auditor found no way for a changed history to report `matches` or `extended`, no innerHTML, no third-party request and no upload; the Power manifest uses only allowed keys and the bundled engine is byte-identical.

## Not proven / limits
- The Power has not been installed in Kiro yet; there is no record of Kiro invoking it.
- Real browser downloads and file pickers were exercised with test doubles in Node and in the browser only through the page's own code paths.
- 1024 px layout checked by assertions (overflow, sizes), not by eye.
