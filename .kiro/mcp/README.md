# GhostBridge evidence MCP server

`ghostbridge/mcp_server.py` is a read-only, stdio-only Model Context Protocol server. It lets Kiro (or any MCP client)
ask the real GhostBridge engine questions about **synthetic** data:

| Tool | What it does |
|---|---|
| `list_scenarios` | The synthetic scenarios (night, normal, denied), synthetic devices and the rule limits (300 s window, 120 s hold). |
| `run_scenario` | Runs a scenario through the Python engine in an in-memory ledger; returns incidents, correlated cases, SHA-256 row hashes and integrity. `tamper_seq` alters one event in a copy to show tamper detection. |
| `forge_boundary` | "Does a denied access followed by a door held open form a case?" for a chosen delay and hold. 299/120 forms a case; 301/119 does not, with the exact failed conditions. |
| `verify_ledger` | Verifies a SHA-256 hash chain of up to 500 supplied rows and names the first failing position with a reason. Prefer `rows_json` (the ledger as JSON text): hashes cover exact bytes, and some clients drop empty objects such as `"data": {}` when passing structured arguments. |

Safety: no socket, no file access, no subprocess, no environment access, no device commands; all ledgers are in memory and
discarded. Tests (`tests/test_mcp_server.py`) enforce this on the source.

## Verified without Kiro

```
python -m unittest tests.test_mcp_server -v        # protocol, tools, bounds, parity with the JS fixture, real stdio round trip
python tests/mcp_demo_client.py                    # drives the server like an IDE and writes a transcript
```

The recorded transcript is `docs/evidence/agentic-validation/mcp-transcript.jsonl`.

## Enabling it in Kiro (owner step)

Kiro blocks agents from writing under `.kiro/settings/` (a permission rule in this workspace), so this file is the
proposed configuration instead of an installed one. To enable it, copy `ghostbridge-evidence.mcp.json` to
`.kiro/settings/mcp.json` (or merge its `mcpServers` entry into the existing file), save, and Kiro reconnects
automatically. The `autoApprove` list contains only the four read-only tools above. Then ask Kiro, for example,
"use ghostbridge-evidence to check delay 301 and hold 119".

**Update 2026-11-17:** the owner's tooling created `.kiro/settings/mcp.json`; Kiro discovered the four tools and they were invoked from a Kiro session. On 2026-11-18 all four tools were verified from Kiro, including `verify_ledger` through `rows_json` (valid ledger 3 of 3; tampered copy fails at row 2). Details in `docs/evidence/phase6/mcp-from-kiro.md`.
