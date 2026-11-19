# GhostBridge Evidence Power (for Kiro)

Gives Kiro a read-only evidence auditor for GhostBridge ledgers: verify a SHA-256 chain, find the first altered row, check a ledger against a sealed receipt, and explain why a denied access followed by a held-open door does or does not form a case.

## Contents
| Path | What it is |
|---|---|
| `plugin.json` | Agent Plugins manifest (schema 1.0.0) |
| `mcp.json` | One local stdio MCP server, `evidence`, started from this folder (`python server/run.py`) |
| `server/` | The server and verbatim copies of the GhostBridge engine modules it needs (synced by `tools/sync_power.py`) |
| `skills/audit-evidence/` | How to verify a ledger or a receipt, step by step |
| `skills/explain-case/` | How to explain a case decision, including the 299/120 and 301/119 boundary |

Tools: `list_scenarios`, `run_scenario` (optional `tamper_seq`), `forge_boundary`, `verify_ledger` (`rows_json` preferred). All read-only, in memory, no network, no files, no device commands.

## Install (Kiro IDE)
1. Kiro → Powers panel → **Add Custom Power** → **Import power from a folder**.
2. Select this folder: `powers/ghostbridge-evidence`.
3. Requires Python 3.11 or newer on `PATH`. No packages, accounts or API keys.

## Try it
- "Verify this GhostBridge ledger" (paste or attach an evidence export).
- "Why does 301 seconds and 119 seconds not form a case?"
- "Show me tamper detection on the night scenario."

Synthetic data only. Not a legal signature or an external timestamp. MIT licensed.
