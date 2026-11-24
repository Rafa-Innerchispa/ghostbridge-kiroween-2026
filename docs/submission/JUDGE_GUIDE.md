# Judge guide: GhostBridge in five minutes

GhostBridge is a working proof of concept on **synthetic** data. It does not connect to real buildings, cameras or customer systems.

## Quick start (browser only, nothing to install)
1. Open the app URL from the Devpost entry.
2. Press **Showcase Mode** for a 1-minute guided run, or follow the steps below.
3. **Reset** (lab toolbar) returns to a clean, empty ledger at any time.

## Five-minute walkthrough
1. **Challenge A: 299 s / 120 s.** Press it. The badge reader turns red, the door opens, and only after it has been open 120 s does the case link appear. One case, with two evidence hashes.
2. **Challenge B: 301 s / 119 s.** Press it. No case. The text names both failed conditions, each by 1 second.
3. **Timeline, Incident Time Machine.** Step through the eight beats; the building above follows. Times marked "derived" are computed from the rule (door open time + 120 s), not recorded events.
4. **Evidence, Evidence Trust Lab.** Pick row 2, field "Timestamp", press "Tamper a copy". The copy fails at row 2; the original ledger stays verified. Press Restore.
5. **Response.** The before/after view: the separate alarms on the left, one explained incident on the right, with advisory next steps (text only; nothing controls a device).

## Run locally (optional)
```
python -m ghostbridge          # http://127.0.0.1:8765, binds to loopback only
python -m unittest discover -s tests
node --test tests/*.test.mjs   # or each file listed in .github/workflows/ci.yml
```
No API keys, accounts or downloads. Python 3.11+, Node 22+.

## Where the Kiro evidence is
| Kiro feature | Where to look |
|---|---|
| Specs | `.kiro/specs/*/` (requirements, design, tasks per feature) |
| Steering | `.kiro/steering/` (product rules, control-room rules) |
| Hooks | `.kiro/hooks/` and `docs/evidence/agentic-validation/REPORT.md` section 4 (observed firings and blocks) |
| Custom agents | `.kiro/agents/`; real invocations and the audit, fix, re-audit loop in `docs/evidence/agentic-validation/` and `docs/evidence/phase6/` |
| Property-based tests | `tests/property.test.mjs`, `tests/time_machine.test.mjs`, `tests/trust_lab.test.mjs` (seeded); `tests/test_properties.py` (Python engine, browser engine and independent verifier agree; spec `.kiro/specs/evidence-properties/`) |
| MCP | `ghostbridge/mcp_server.py`, `.kiro/mcp/README.md`; tested with a standalone client. Kiro-side connection: see README status. |
| History | `docs/KIRO_EVIDENCE.md` |

## Limitations
Synthetic data only; no hardware integration is claimed. Tested in Chrome (desktop and 390 px emulation); not tested with a screen reader. Kiro credit usage is not reported because it was not measurable from the session.
