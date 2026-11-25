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
| `skills/incident-walkthrough/` | One incident end to end: rule, decision, edges, chain, tamper test and an audit hand-off with the independent verifier |

Tools: `list_scenarios`, `run_scenario` (optional `tamper_seq`), `check_timing`, `verify_ledger` (`rows_json` preferred). All read-only, in memory, no network, no files, no device commands.

## Install
- Kiro CLI: `kiro-cli powers install <path-to>/powers/ghostbridge-evidence` (also shows up in the IDE Powers panel).
- Kiro IDE: Powers panel → **Add Custom Power** → **Import power from a folder** → select `powers/ghostbridge-evidence`.
- Requires Python 3.11 or newer on `PATH`. No packages, accounts or API keys.

## Try it
- "Verify this GhostBridge ledger" (paste or attach an evidence export).
- "Why does 301 seconds and 119 seconds not form a case?"
- "Show me tamper detection on the night scenario."
- "Investigate the incident: denied, then the door opened 270 seconds later for 130 seconds. Give me an audit report."

Synthetic data only. Not a legal signature or an external timestamp. MIT licensed.
