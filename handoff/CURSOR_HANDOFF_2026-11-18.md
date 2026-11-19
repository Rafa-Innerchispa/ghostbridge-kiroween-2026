# Handoff: Kiro to Cursor (GhostBridge and the InnerOS bridge)

Written by Kiro (Kiro IDE, Autopilot) on 2026-11-18/19 for Cursor, which takes over the infrastructure and coordination work that Antigravity did. This file is the integration contract between Kiro and Cursor. It contains no secrets, tokens or private data. Everything here can be recovered from GitHub without the chat history.

**Public repository:** this file lives in `handoff/` at the repository root, outside `docs/`, so GitHub Pages does not publish it on the product site. The repository itself is public, so internal InnerOS identifiers are written as placeholders such as `<InnerOS order: GhostBridge MCP activation>`; Cursor reads the real ids in InnerOS.

**Ownership from now on**
| Agent | Owns |
|---|---|
| **Kiro** | GhostBridge product: `docs/` (app), `ghostbridge/` (engine), `tests/`, `powers/`, `.kiro/` specs/steering/hooks/agents, `docs/submission/`, the video plan and the judge experience |
| **Cursor** | InnerOS, the Windows bridge, MCP Small, capability deployment, agent coordination, anything outside this repository |
| **ChatGPT** | Cross-review, GitHub and Devpost administration, overall coordination |
No agent edits files owned by another without agreeing first (through ChatGPT or the owner).

## 1. Current state of GhostBridge
- Public, working, published at https://ghostbridge.innerchispa.us/ from `main`.
- `main` = `beea671` (2026-11-18): PRs #10, #14, #15 and #16 merged by the owner, with CI and Pages green for every merge. Live-site QA: 14/14 in real Chrome.
- Two draft PRs are waiting for owner approval (section 4). Merging publishes the site immediately (`.github/workflows/pages.yml` deploys on every push to `main`).

## 2. Canonical repository
https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026 (public, MIT, root `.kiro/` present and not git-ignored).

## 3. Branches and SHAs (as of this handoff)
| Branch | Head | Purpose |
|---|---|---|
| `main` | `beea671` | Published product (PRs #10 to #16) |
| `feat/kiro-premium-judge-experience` | `9e2f1ee` | PR #17: sober visual system and judge package |
| `feat/kiro-verifiable-evidence` | see PR #18 | Phase 8: own log, receipts, independent verifier, Evidence Power, Devpost texts, this handoff (stacked on #17) |
Merged feature branches (`feat/signal-forge-interactive`, `feat/kiro-immersive-control-room`, `feat/kiro-agentic-validation`, `feat/kiro-winning-experience`) are history only.

## 4. Pull requests
| PR | State | Base | Notes |
|---|---|---|---|
| #10, #14, #15, #16 | merged | main | see section 1 |
| #17 | draft, CI green, mergeable | main | merge first |
| #18 (Phase 8) | draft, CI green | `feat/kiro-premium-judge-experience` | after #17 merges, change base to `main`, wait for CI, merge |
Use "Create a merge commit", not squash. `tools/integrate-stack.ps1` shows the safe pattern (base to main, ready, merge, wait for CI and Pages, stop at the first failure).

## 5. Test results (Phase 8 head)
| Suite | Result |
|---|---|
| Python `unittest discover -s tests` | 196 OK |
| Node, 23 test files | 427 of 427 |
| `node --check`, 21 `docs/*.mjs` + `app.js` | 22 of 22 |
| Real Chrome (8 suites, run by hand) | 595 checks, 0 retries |
Baseline before Phase 8: 188 / 382 / 18 / 506 (earlier reports said 556 Chrome checks; that was an addition error). The increase is the new modules and tests only.

## 6. GhostBridge MCP server
- Code: `ghostbridge/mcp_server.py`. stdio JSON-RPC, read-only, synthetic, in-memory ledgers; no network, no files, no subprocess, no device commands (enforced by `tests/test_mcp_server.py`).
- Tools: `list_scenarios`, `run_scenario {name, tamper_seq?}`, `forge_boundary {delay_seconds, hold_seconds}`, `verify_ledger {rows | rows_json}`. **Use `rows_json`** (the ledger as JSON text): structured arguments from some clients drop `"data": {}`, which changes the hashed bytes.
- Kiro workspace config: `.kiro/settings/mcp.json` (committed; four tools auto-approved; no secrets). Template: `.kiro/mcp/ghostbridge-evidence.mcp.json`.
- Also packaged as the **GhostBridge Evidence Power**: `powers/ghostbridge-evidence/` (Agent Plugins 1.0.0, self-contained copy of the engine, synced by `tools/sync_power.py`, checked by `tests/test_power.py`). Installation is a Kiro UI action by the owner.

## 7. Evidence of real calls from Kiro
`docs/evidence/phase6/mcp-from-kiro.md`: 14 calls from Kiro session `sess_7ff31803-702e-41e9-b5b1-55b645f7262e`, all four tools; the final two show `verify_ledger rows_json` returning `valid: true, checked 3` for a valid ledger and `failed_at 2` for a tampered one.

## 8. The Kiro inbox
- Location: `.kiro/inbox/` in this repository's working copy on the owner's Windows machine. **Untracked by Git** (not committed).
- Content today: one file, `win_kiro_bridge_e2e_probe.json` (2026-11-17 23:03 UTC), written by Antigravity, status `DELIVERED_TO_KIRO_INBOX`, `kiro_execution_status: AWAITING_KIRO_SESSION`, asking for the four MCP checks.
- What happened: **Kiro never picked it up automatically**, and Kiro did not write an acknowledgement into it. The checks it asks for were run later because the owner asked in chat (section 7). Treat the file as delivered but never acknowledged.

## 9. How Antigravity communicated with Kiro
Only through files in the working copy: it wrote `.kiro/settings/mcp.json` (which Kiro then loaded) and the inbox file above. There was no channel from Kiro back to Antigravity: Kiro reported results in chat, in commits and in `docs/evidence/`. Kiro has no supported way to be triggered by an external process to start an agent task; a person has to start the Kiro conversation. (Kiro hooks can run a *command* on file events such as save or create, but that is not the same as an agent accepting and executing a task.)

## 10. What Cursor should check in InnerOS
1. Find the existing orders `<InnerOS order: Windows-Kiro Bridge>` (Windows-Kiro Bridge) and `<InnerOS order: GhostBridge MCP activation>` (activate GhostBridge MCP in Kiro). The second is **done** (section 7); record that with the evidence link. Do not create equivalents.
2. Decide whether the inbox file in section 8 should be closed as "superseded: executed on owner request" (recommended) or re-sent.
3. Adopt the message contract in `handoff/KIRO_INNEROS_MESSAGE_CONTRACT.md` for any future Kiro task, and keep the coordination in InnerOS (no second coordination system).

## 11. Files Cursor must NOT modify (without agreement)
Everything under `docs/` except `handoff/`, `ghostbridge/`, `tests/`, `powers/`, `tools/`, `.github/`, `.kiro/specs/`, `.kiro/steering/`, `.kiro/hooks/`, `.kiro/agents/`, `.kiro/mcp/`, `README.md`, `ARCHITECTURE.md`, `LICENSE`. Cursor may add files under `.kiro/inbox/` (as task messages) and may propose changes to `handoff/` by PR.

## 12. Operations that need the owner's explicit authorization
Merging any PR (each merge to `main` publishes the site); changing GitHub settings, secrets or Pages; submitting or editing the Devpost form; publishing the video, blog or social posts; anything that touches real devices, customer data or production InnerOS. Kiro's guard hook blocks force-push, pushes to `main`, `gh pr merge`, hard resets and destructive deletes; do not try to route around it.

## 13. How to report results to ChatGPT
One message per task, using the contract's `COMPLETED`/`FAILED`/`BLOCKED` receipt: task id, what was done, evidence links (commit SHAs, CI run URLs, files), measured test counts, and open blockers. No claims without a link.

## 14. Open blockers
| # | Blocker | Owner |
|---|---|---|
| 1 | Merge PR #17, then PR #18 (publishes the redesign and Phase 8) | Owner |
| 2 | Install the GhostBridge Evidence Power in Kiro (Powers panel → Add Custom Power → Import power from a folder → `powers/ghostbridge-evidence`), then ask Kiro to use it once, so its use can be recorded | Owner, then Kiro |
| 3 | Record and publish the video (`docs/submission/VIDEO_SCRIPT.md`) | Owner |
| 4 | Devpost: paste `docs/submission/DEVPOST.md`, choose Resurrection, add the video URL; founder details for Best Startup Project | Owner / ChatGPT |
| 5 | Close or re-send the inbox message in section 8 | Cursor |
| 6 | Unify the two blog/social draft sets (`docs/marketing/` and `docs/submission/BLOG_AND_SOCIAL_DRAFTS.md`) | Kiro, on request |

## 15. Exact next steps
1. Owner merges #17; Kiro re-runs the live-site QA.
2. Owner merges #18 (base changed to `main` first); Kiro re-runs live-site QA and the Phase 8 browser suite against the published site.
3. Owner installs the Power; Kiro invokes it and records the calls in `docs/evidence/phase8/STATUS.md`.
4. Cursor reconciles the two InnerOS orders and the inbox message, using the message contract.
5. Owner records the video; ChatGPT updates Devpost from `DEVPOST.md` and the final video URL.
