# Message contract between InnerOS (via Cursor) and Kiro

Written by Kiro, 2026-11-19. Purpose: one unambiguous way to hand a task to Kiro and get a verifiable result back, without pretending that writing a file is the same as executing a task.

## What Kiro can and cannot do today (measured, not assumed)
| Capability | Supported | Notes |
|---|---|---|
| Read a task file in the workspace when a person asks Kiro to | yes | Kiro reads `.kiro/inbox/*.json` as data |
| Start working on its own because a file appeared | **no** | No supported trigger starts an agent task from outside. A person must open or continue a Kiro conversation |
| Run a shell command when a file is created or saved (hook) | yes | Hooks run commands, not agent tasks; useful for tests, not for task acceptance |
| Call MCP tools configured in the workspace or a Power | yes | Verified for `ghostbridge-evidence` (14 calls) |
| Write a result file, commit, push a feature branch, open a draft PR | yes | Within the guard hook's limits |
| Merge, push to `main`, change repo settings, submit Devpost | **no** | Blocked by the guard hook and reserved for the owner |

So a task moves forward only when a person (owner or ChatGPT relaying the owner) tells Kiro to process the inbox. The contract makes every step visible.

## Files
- **Inbox (to Kiro):** `.kiro/inbox/<task_id>.json`, written by Cursor. Never edited by Kiro.
- **Outbox (from Kiro):** `.kiro/outbox/<task_id>.<state>.json`, one new file per state change, written by Kiro. Never edited by anyone afterwards. Both folders stay untracked by Git (local working copy only) unless the owner decides otherwise.

## Message fields
| Field | Type | Meaning |
|---|---|---|
| `task_id` | string | Unique, stable id from InnerOS (for example `<InnerOS order: GhostBridge MCP activation>`) |
| `correlation_id` | string | Groups related messages (for example `<correlation id>`) |
| `idempotency_key` | string | Same key = same request; Kiro processes it once |
| `source_agent` | string | `cursor`, `chatgpt`, `owner` or `kiro` |
| `target_agent` | string | `kiro` for inbox messages |
| `action` | string | What is requested, in one sentence, plus `scope` (files or features allowed) |
| `requires_owner_approval` | boolean | True for anything in the handoff's section 12 |
| `state` | enum | See below |
| `timestamp` | string | UTC ISO 8601 with `Z` |
| `evidence` | list | Links: commit SHA, PR URL, CI run URL, file paths, MCP call record |
| `error` | object or null | `{code, message, blocking: true|false}` |
| `receipt` | object or null | On terminal states: `{summary, tests: {python, node, syntax, chrome}, links}` |

## States (Kiro writes these; each is its own outbox file)
| State | Means | Is the work done? |
|---|---|---|
| `DELIVERED` | Cursor wrote the inbox file | no; Kiro has not seen it |
| `ACK` | Kiro has read and understood the message | no |
| `CLAIM` | Kiro has accepted it and will do it now, in this session | no |
| `RUNNING` | Work in progress; optional repeated heartbeats with a short note | no |
| `COMPLETED` | Done; `receipt` and `evidence` filled | yes, if the evidence checks out |
| `FAILED` | Tried and could not finish; `error` explains | no |
| `BLOCKED` | Needs a decision or authorization; `error.blocking = true` | no |
**ACK is not execution.** Only `COMPLETED` with evidence counts as done, and the reader should open the evidence links before relying on it.

## Example
Inbox `.kiro/inbox/<InnerOS order: GhostBridge MCP activation>.json`:
```json
{"task_id":"<InnerOS order: GhostBridge MCP activation>","correlation_id":"<correlation id>","idempotency_key":"<idempotency key>",
 "source_agent":"cursor","target_agent":"kiro","action":"Verify ghostbridge-evidence MCP tools from Kiro","scope":["read-only MCP calls"],
 "requires_owner_approval":false,"state":"DELIVERED","timestamp":"2026-11-17T23:03:04Z","evidence":[],"error":null,"receipt":null}
```
Outbox `.kiro/outbox/<InnerOS order: GhostBridge MCP activation>.COMPLETED.json`:
```json
{"task_id":"<InnerOS order: GhostBridge MCP activation>","correlation_id":"<correlation id>","idempotency_key":"<idempotency key>",
 "source_agent":"kiro","target_agent":"cursor","state":"COMPLETED","timestamp":"2026-11-18T13:00:00Z",
 "evidence":["docs/evidence/phase6/mcp-from-kiro.md"],"error":null,
 "receipt":{"summary":"All four tools verified from Kiro; verify_ledger via rows_json: valid 3/3, tampered copy fails at row 2","links":["https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/16"]}}
```
(Illustrative. For the real task in the handoff section 8, Cursor decides whether to close it as superseded.)

## Rules
1. Idempotency: if an outbox file with the same `idempotency_key` and a terminal state exists, Kiro does not redo the task; it points to the existing receipt.
2. One writer per file: Cursor writes inbox files, Kiro writes outbox files.
3. No secrets in messages. Evidence is links, not pasted logs with personal data.
4. Anything needing the owner's authorization goes to `BLOCKED` until the owner confirms in a way Kiro can see (in the conversation).
5. InnerOS remains the system of record; these files are the hand-off point, not a second coordination system.
