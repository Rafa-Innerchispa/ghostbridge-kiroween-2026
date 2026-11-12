# Agentic validation phase: report

Branch `feat/kiro-agentic-validation`, stacked on `feat/kiro-immersive-control-room` (PR #14, draft). PR #10 and PR #14 were not modified.
Date: 2026-11-12 (times below are UTC as logged by Kiro; local time is UTC-5). Kiro IDE, Autopilot, session `sess_7ff31803-702e-41e9-b5b1-55b645f7262e`.
Credits: **not measured**. Kiro does not expose usage inside the session; check https://kiro.dev/account/usage.

Status words: IMPLEMENTED = exists in the repo. EXECUTED = it ran. VERIFIED = its result was independently checked. NOT PROVEN = no evidence.

## 1. Summary

| Item | Implemented | Executed | Verified | Notes |
|---|---|---|---|---|
| Kiro recognizes `ui-director` and `qa-auditor` | yes | yes | yes | Both appear in the `invoke_sub_agent` agent list and ran; Kiro logged `sub_agent_start` with `subAgentName`. |
| `ui-director` real invocation (2 runs) | yes | yes | yes | Skip link, 40 px targets, Forge focus fix. |
| `qa-auditor` real invocation (2 runs, separate) | yes | yes | yes | Round 1 found a real defect; round 2 verified the fix. |
| Audit-fix-reaudit loop | yes | yes | yes | See section 3. |
| Hook `guard-destructive` (PreToolUse) | yes | yes | yes | 60 completed executions in the main session at the last extraction (the count grows with every shell call), 3 observed blocks, plus 55 inside sub-agents. |
| Hook `reconstruction-tests-on-save` (PostFileSave) | yes | yes | yes | First observed firing ever; runner now leaves a log line. |
| MCP server `ghostbridge-evidence` | yes | yes (standalone client) | yes (tests) | **Kiro-to-MCP connection NOT PROVEN**: Kiro denies agent writes to `.kiro/settings/`; owner step needed. |
| Powers | n/a | listing only | n/a | **NOT PROVEN / no compatible official option**; see section 5. |
| Credits consumed | n/a | n/a | n/a | NOT MEASURED. |

## 2. Agent invocations (from the Kiro session log)

Source: `sub-executions.json` (script extraction of `messages.jsonl` and `sub-executions/*.jsonl`). The parent log records `sub_agent_start` with `subAgentName`; the sub-execution log records the tool calls, not the name.

| # | Agent | Sub-session | Start (UTC) | End (UTC) | Tool calls | Hook runs inside | Files written |
|---|---|---|---|---|---|---|---|
| 1 | ui-director | `0ddb0d67-404d-4d0f-be13-d636da5361df` | 07:41:08 | 07:43:18 | 22 | 11 (guard, completed) | `docs/control_room.css`, `docs/index.html`, `tests/a11y_targets.test.mjs` |
| 2 | qa-auditor | `d02bccbd-ef21-4966-93b8-a2513f2bf63e` | 07:51:44 | 08:04:38 | 29 | 15 | `tests/browser-qa/skip-link-audit.qa.mjs`, `qa-auditor-round1.md` |
| 3 | ui-director | `fb47f92b-809e-4fba-95b6-5fcc85dd673d` | 08:06:30 | 08:09:49 | 13 | 9 | `docs/control_room_view.mjs` (+ test appended to `tests/a11y_targets.test.mjs`) |
| 4 | qa-auditor | `cd48b68d-1188-49ce-b144-d8e47e1bf648` | 08:09:58 | 08:24:27 | 40 | 20 | `tests/browser-qa/forge-focus-audit.qa.mjs`, `qa-auditor-round2.md` |

Boundary check from the logs: neither agent wrote engine, correlator, Python or `.github` files. The auditor wrote only under `tests/` and `docs/evidence/`.
Caveat: the agent definitions list tools `read, write, shell` but the logs show `grep_search`, `list_directory`, `str_replace`, etc. Tool restriction by agent definition is therefore NOT PROVEN; boundaries held through the prompts.
No work from earlier phases is attributed to these agents.

## 3. What the agents did

**Identification (by Kiro main, real Chrome probe, before):** `probe-before.json`. No skip link; severity filter buttons 30 px (28 px at 390); `#verify`, `#export`, `#tamper` 38 to 39 px.

**ui-director round 1:** added a skip link (first focusable, hidden until focused, 44 px tall, lime on graphite, 15.57:1), made six controls at least 40 px, added `tests/a11y_targets.test.mjs`.

**qa-auditor round 1 (independent):** Python 169/169, Node 322/322 over 14 files, `node --check` ok, Chrome m5 141/141, skip-link audit 32/32, **m0 55/56**. It reproduced the same failure on `git archive HEAD` and reported it as pre-existing. Finding: `A5 focus moves to the first slider` fails, focus stays on BODY after clicking Signal Forge.

**Root cause (owner diagnosis, confirmed by the fix):** `app.js` calls `focus()` synchronously, but the Control Room reveals the Forge drawer one microtask later through a MutationObserver, so the call hits a `display:none` element. A keyboard regression introduced by the Control Room integration (Phase 4); not present in PR #10 alone. The earlier 56/56 m0 run predated that integration, which is why it was not caught.

**ui-director round 2:** fixed it in `docs/control_room_view.mjs` only (focus `#forge-gap` after the drawer shows, only when focus is on body or `#signal-forge`, so it never steals focus). `docs/app.js` untouched.

**qa-auditor round 2 (fresh run):** Python 169, Node 323/323 (14 files), m5 141/141, m0 **56/56**, skip-link-audit 32/32, forge-focus-audit **40/40** (new; mouse, keyboard and programmatic open, no focus theft, Close, challenges A and B still 3 events and 1/0 cases). Verdict **PASS**. Findings 1 and 2 fixed. Open and unchanged: footer/nav links 13 to 17 px high, `#control-room` has no outline when focused programmatically (expected), Control Room nav link absent in the 390 px hero.
New note N1 (low, not fixed): `app.js:270` uses `behavior:'smooth'` scrolling even with reduced motion; app.js belongs to the Signal Forge author and was left alone.

Screenshots inspected by me: `skiplink-focused-1440.png` (skip link visible with lavender ring, covers the logo while focused, as expected) and `forge-focus-open-390.png` (focus ring visible on the first slider, building pinned above).

## 4. Hooks

Source: `hook-events.json`; runner log in `reconstruction-hook-run.log`.

Supported triggers in the installed Kiro (from the hook-creation tool contract): PreToolUse, PostToolUse, SessionStart, Stop, UserPromptSubmit, PreTaskExec, PostTaskExec, PreCompact, PostCompact, PostFileCreate, PostFileSave, PostFileDelete. Both existing hooks use valid triggers; `tests/hooks.test.mjs` (6 tests) enforces trigger validity, matcher behavior, script existence and a bounded 60 s timeout.

* **guard-destructive (PreToolUse on `execute_pwsh|control_pwsh_process`):** EXECUTED on every shell call; Kiro logged `ContextualHookInvoked ... completed` 60 times in the main session during this phase (at the last extraction) (and 55 times in sub-agents). Observed blocks (tool not executed, hook message returned): force-push (08:25:19), recursive delete by relative path (08:35:43), reading a secret-like file path (08:41:42). **Two of these three were my own harmless test strings or conservative matches, not attacks**: the second is a conservative rule (it cannot tell a relative path is inside the project) and the third matched a command that mentioned `.kiro\settings\mcp.json` by design. No destructive effect occurred; the blocked commands never ran.
* **reconstruction-tests-on-save (PostFileSave):** first observed firing. Appending a comment to `docs/playback.mjs` triggered it 0.37 s later (08:25:20.560 tool call, 08:25:20.932 hook, `completed`). Kiro does not log command output, so I added `.kiro/hooks/run-reconstruction-tests.mjs`, a bounded runner (3 test files, 50 s timeout, no network) that appends a JSON line. The second probe (08:37:28) wrote a log line (`exit 0, 82/82`) that I then deleted by mistake while debugging a test, so only Kiro's own record of that firing survives. The third probe (08:49:46) was kept, written by the hook and not by me: `{"at":"2026-11-12T08:49:46.018Z","hook":"reconstruction-tests-on-save","exit":0,"tests":82,"pass":82,"fail":0,"ms":311}` (`reconstruction-hook-run.log`). All probe edits were reverted with `git checkout` (no change in the diff).
* The first firing ran the old direct command, so its output is NOT PROVEN; firings two and three ran the new runner, and the third proves command, result and log.
* Limitation: PostFileSave fired for an agent file write (`fs_append`). It was not tested with a manual editor save.

## 5. MCP and Powers

**MCP (IMPLEMENTED, EXECUTED standalone, VERIFIED by tests):** `ghostbridge/mcp_server.py`, stdio only, four read-only tools (`list_scenarios`, `run_scenario` with optional `tamper_seq`, `forge_boundary`, `verify_ledger`). All answers come from the real Python engine, correlator and SHA-256 ledger in memory. Source tests forbid socket, http, file, subprocess and os usage. `tests/test_mcp_server.py` has 17 tests (protocol, bounds, parity with the JavaScript fixture over the 40+ non-camera configurations, a real stdio subprocess round trip, config safety). `tests/mcp_demo_client.py` drove the server like an IDE: 7/7 checks, 13 messages, transcript `mcp-transcript.jsonl` (299/120 forms one case with two evidence hashes; 301/119 forms none and names both failed conditions; tampering at position 2 is detected).
**NOT PROVEN: that Kiro connected to it.** Kiro rejected my write to `.kiro/settings/mcp.json` with a permission rule (deny `fs_write` under `.kiro/settings/`). I did not work around it. The ready configuration is `.kiro/mcp/ghostbridge-evidence.mcp.json`; the owner copies it to `.kiro/settings/mcp.json`, and `.kiro/mcp/README.md` gives the steps. `~/.kiro/logs/.../mcp.log` is empty, which is consistent with no server registered.

**Powers (NOT PROVEN):** `kiro_powers list` returned "No powers installed". Official powers (Datadog, Dynatrace, Figma, Neon, Netlify, Postman, Supabase, Stripe, Strands SDK, AWS Aurora per kiro.dev/docs/powers/installation) are external services that need accounts or credentials, which this phase forbids and which add nothing to a local synthetic lab. Installation is done from the IDE Powers panel, which this agent cannot operate. I did not build an untested custom power or claim a Powers integration. The documented path for a future local power is a folder with `plugin.json` plus `mcp.json` imported through Powers panel > Add Custom Power.

## 6. Test totals at the end of the phase

Measured by Kiro main at the end of the phase (Windows, Node 24, Python 3.12):

| Suite | Result |
|---|---|
| Python `unittest discover` | **186 tests, OK** (was 169; +17 MCP) |
| Node, 15 test files | **329 pass, 0 fail** (was 318 in 13 files; +5 a11y_targets, +6 hooks) |
| `node --check` on 13 `docs/*.mjs` + `docs/app.js` | 14 of 14 |
| `tests/mcp_demo_client.py` | ALL PASS (7 checks) |
| Chrome QA m0 / m5 / skip-link-audit / forge-focus-audit | 56/56, 141/141, 32/32, 40/40, **run by qa-auditor round 2** on the final product code; no product file changed afterwards. Not re-run by me. |

Total automated checks counted: 186 + 329 + 14 = 529 (Phase 4: 502), excluding the browser QA scripts, which are run by hand and are not in CI.

## 7. Limitations

Chrome 157 only; 390 px is emulation; no screen reader; contrast is sampled. Credits not measurable. Agent tool restrictions not proven. Sub-agent runs share the session's model setting ("Auto"), so the model used per agent is not recorded. The screenshots are automated Chrome captures, not Kiro IDE captures.
