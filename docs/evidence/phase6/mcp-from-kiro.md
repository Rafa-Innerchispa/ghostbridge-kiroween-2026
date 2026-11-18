# ghostbridge-evidence MCP: calls made from Kiro (2026-11-17)

Session `sess_7ff31803-702e-41e9-b5b1-55b645f7262e`, Kiro IDE, Autopilot. The workspace file `.kiro/settings/mcp.json` (created 2026-11-17 17:52 local time by the owner's tooling, not by this agent, which is denied writes under `.kiro/settings/`) registers the server from `.kiro/mcp/ghostbridge-evidence.mcp.json`. Kiro then listed four tools under `ghostbridge-evidence` in the agent's tool catalogue, and the agent called them through Kiro's MCP client (tool ids `tool::ghostbridge-evidence::*`). All data is synthetic.

| Status | Result |
|---|---|
| Installed (config present) | YES |
| Connected (tools discovered by Kiro) | YES: `list_scenarios`, `run_scenario`, `forge_boundary`, `verify_ledger` |
| Invoked from Kiro | YES, 11 calls in this session (1 to 7 below, 8 to 11 in the follow-up) |

## Calls and results
| # | Tool and arguments | Result returned through Kiro | As expected? |
|---|---|---|---|
| 1 | `list_scenarios {}` | 3 scenarios (night 5 events, normal 4, denied 1), 4 synthetic devices, rule window 300 s, hold 120 s, note "Synthetic data only. No real devices." | yes |
| 2 | `forge_boundary {299, 120}` | `case_formed: true`, one case `case:cfd83deb8d3af576`, evidence hashes `edca35aab6…23d9` and `d87cf90613…537c`, integrity valid 3/3 | yes; same case id and hashes as the browser app (Time Machine screenshot) and the JS fixture |
| 3 | `forge_boundary {301, 119}` | `case_formed: false`; failed conditions "301 s … (1 s too late)" and "119 s … (1 s short)" | yes |
| 4 | `run_scenario {night, tamper_seq: 2}` | 3 incidents, 0 cases, integrity valid 5/5 (head `b2dac728…9ccd`); tampered copy fails at row 2 (`checked 1, failed_at 2`) | yes |
| 5 | `run_scenario {"Night"}` | refused: `name must be one of: night, normal, denied` (isError) | yes, input validation |
| 6 to 7 | `verify_ledger` with a 3-row ledger built by the Python engine | `valid: false, checked 0, failed_at 1` | **NO** |

## Follow-up the same day (after Kiro reloaded the server with the typed schema and failure reasons)
| # | Call | Result | Reading |
|---|---|---|---|
| 8 | `verify_ledger rows` (3 rows; row 1 has `"data": {}`) | `failed_at 1`, reason "stored hash does not match the SHA-256 recomputed from this row's payload" | the type of `seq` is not the cause (the new code would say so) |
| 9 | `verify_ledger rows` (new 3-row ledger: row 1 has no empty object, row 3 has `"data": {}`) | `checked 2, failed_at 3`, same reason | rows without an empty object verify; the row with `{}` fails |

**Finding:** in every call, a row whose event carries an empty object `"data": {}` failed and every row without one verified. The empty object is most likely dropped between the agent's tool call and the server, which changes the hashed bytes. Verification is correct to fail. One observation is **not explained**: in call 9 the agent sent row 2 without `"incident": null` and it still verified, which suggests the payload was changed in transit in more than one way. The exact transformation is not proven.

**Fix (in PR #16):** `verify_ledger` accepts `rows_json`, the ledger as JSON text, which travels unchanged; it stays strict and adds a `hint` when the failing row lacks `data` or `incident`. Covered by `tests/test_mcp_server.py` (19 of 19). Kiro had not loaded this version by the end of the session (calls 10 and 11 returned the old error, `rows must be a list`), so **`rows_json` from Kiro is NOT PROVEN yet**. To close: in a new Kiro turn, call `verify_ledger` with `rows_json` set to the text of `rows.json` from `python tests/mcp_demo_client.py` or any GhostBridge export.

## The verify_ledger discrepancy (first observation)
The same rows verify locally (`valid: true, checked 3`), and tampering row 2 locally fails at row 2. Through Kiro the tool reported a failure at row 1, which locally happens only when `seq` is not an integer (for example the string "1"). Two causes are possible and **neither is proven**: Kiro's MCP client encoding the loosely typed `items: object` argument differently, or the agent's own tool arguments (the agent also omitted `incident: null` on rows 2 and 3, which would fail at row 2, not row 1).
Change made: `verify_ledger` now declares typed row fields (`seq` integer, 64-char `previous` and `hash`, `payload` object) and returns a `reason` for every failure; it stays strict. Covered by `tests/test_mcp_server.py` (17 of 17). Kiro's running server process still has the old code; it reloads when Kiro restarts or when `.kiro/settings/mcp.json` changes. **To close:** restart Kiro, then call `verify_ledger` again with rows that include `incident: null`, and record the `reason`.

## Inbox file
`.kiro/inbox/win_kiro_bridge_e2e_probe.json` appeared at the same time (owner/Antigravity bridge). It asks for exactly these checks. This agent read it as data and did not write any acknowledgement or status into it; the checks above were run because the owner's Phase 6 order asked for them.
