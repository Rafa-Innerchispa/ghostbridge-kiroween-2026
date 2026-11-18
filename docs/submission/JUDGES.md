# GhostBridge: The Building That Remembers

**Five signals. One explained incident. Evidence you can verify.**

Live demo: https://ghostbridge.innerchispa.us/ (runs entirely in your browser; synthetic data; nothing to install)
Source: https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026 (MIT) · Category: **Resurrection**

---

## Elevator pitch

Older buildings run on equipment that was never meant to talk to each other: a relay on the door, a card reader on another controller, a camera on a third system. Each one raises its own alarm, and a night operator has to decide, alone and fast, which alarms belong together. GhostBridge brings those old signals back to life without replacing the hardware. It records every signal in a tamper-evident SHA-256 chain, links related signals with deterministic rules an operator can read, and replays the incident moment by moment, so the conclusion can be checked rather than trusted. Today it is a working proof of concept on synthetic data; the adapters for real panels are the next step.

## Who it is for

- **Operators of residential and mixed-use buildings** with security hardware from different generations and vendors.
- **The night-shift operator** who sees several unrelated alarms and must decide which ones are one event.
- **Property managers and auditors** who later need to show what happened, in what order, and that the record was not changed afterwards.

## The problem it addresses

- **Replacing legacy hardware is expensive and disruptive.** Doors, readers and cameras are wired into the building; swapping them means construction work, downtime and new training. Many buildings keep them for years.
- **Fragmented alerts are hard to investigate.** Each system reports in its own format and its own timeline. "Badge rejected" and "door held open" arrive as two unrelated alarms, minutes apart, on different screens.
- **An explanation is only useful if it can be checked.** If a tool says "these two events are one incident", the operator and later an auditor need to see why, and need to know the underlying records were not edited.

## How GhostBridge helps (what is demonstrated)

| Capability | What you can see in the demo |
|---|---|
| Normalize old and new signals into one event contract | Relay CSV and access-controller JSON become the same event format (Legacy Bridge Demo) |
| Tamper-evident record | Every event is sealed in a SHA-256 chain; **Verify chain** recomputes every link |
| Deterministic, readable correlation | Rule: an *Access denied* followed within **300 s** by a door **held open ≥ 120 s** forms one case |
| Exact boundaries | **299 s / 120 s** forms a case; **301 s / 119 s** does not, and the app says which condition failed and by how much |
| Moment-by-moment replay | **Incident Time Machine**: eight beats drive the building scene; computed moments are labelled *derived, not recorded* |
| Evidence you can attack | **Evidence Trust Lab**: change one field in an isolated copy; the copy fails at that exact row while the original stays verified |
| Advisory response | Next steps for a human operator; GhostBridge never controls a door, camera or person |

**Not claimed:** no real hardware, camera feed or customer system is connected; ONVIF, Wiegand and physical relay integrations are future work. No AI model or cloud inference runs. The chain is local and tamper-evident, not an external certification or legal-grade signature.

## Judge walkthrough (under 1 minute to understand, under 3 to explore)

Open the live demo. Use **Reset** in the Signal lab toolbar at any time to return to an empty ledger. For a hands-off overview, press **Showcase Mode** (about one minute).

| Step | Do this | What it shows |
|---|---|---|
| A | Look at the Control Room | A quiet building: four sources, no signals yet |
| B to D | Press **Challenge A · 299 s · 120 s** | The reader shows *Access denied*; the door opens; only once it has been open 120 s does the case link appear. Rule check: 1 s inside the window, 0 s above the threshold |
| E | Press **Challenge B · 301 s · 119 s** | No case. Each condition fails by 1 s, and the text says so |
| F | Press Challenge A again, open **Timeline** and step through the **Incident Time Machine** | Each beat moves the building to that moment; beat 6 shows the case id and the two evidence hashes |
| G | Open **Evidence** and press **Verify chain** | Every row recomputed and verified |
| H to I | Open **Evidence Trust Lab**, pick row 2, field *Timestamp*, press **Tamper a copy** | *Altered copy: fails at row 2*; stored vs recomputed hash shown; the original ledger is untouched |
| J | Press **Restore** | Back to the original, verified ledger |
| Bonus | Open **Response** and press **Connect the signals** | Before: separate alarms. After: one explained incident with advisory next steps |

## Architecture (one picture)

```
  Synthetic sources                   GhostBridge core (same rules in Python and the browser)
  ─────────────────                   ─────────────────────────────────────────────────────────
  Relay CSV  ───────┐                 ┌──────────────┐   ┌───────────────────┐   ┌──────────────┐
  Access JSON ──────┼── adapters ───▶ │ event        │──▶│ SHA-256 chained    │──▶│ deterministic │
  Scenario events ──┤   (validate,    │ contract     │   │ ledger (SQLite or  │   │ correlator    │
  Signal Forge ─────┘    normalize)   │ (strict)     │   │ browser storage)   │   │ 300 s / 120 s │
                                      └──────────────┘   └─────────┬─────────┘   └──────┬───────┘
                                                                   │ rows + hashes      │ cases
                                                                   ▼                    ▼
                                ┌──────────────────────────────────────────────────────────────┐
                                │ Control Room (pure functions of the ledger): building scene,  │
                                │ Rule check, Time Machine, Trust Lab, Reconstruction, Response │
                                └──────────────────────────────────────────────────────────────┘
                                                                   │
                         read-only MCP server (stdio) ─────────────┘  list_scenarios · run_scenario
                         used by Kiro during development               forge_boundary · verify_ledger
```

- Browser edition: static files on GitHub Pages, Web Crypto SHA-256, localStorage. No server, no third-party requests.
- Local edition: `python -m ghostbridge` serves the same UI with SQLite, bound to 127.0.0.1 only.
- Python and JavaScript produce identical hashes, case ids and evidence hashes (100-configuration parity fixture).

## Built with Kiro: feature and evidence matrix

Every row links to files in the repository. "Verified" means checked by tests or an independent run, not only by an agent's statement.

| Kiro feature | How it was used | Status | Evidence |
|---|---|---|---|
| Specs | Requirements (EARS), design and tasks per feature; tasks ticked only after validation | Verified | `.kiro/specs/*/` |
| Steering | Product rules (synthetic only, honest labels, local-first) and UI rules (no innerHTML, no third-party requests, one contact) enforced by tests | Verified | `.kiro/steering/`, `tests/control_room_wiring.test.mjs` |
| Agent hooks | PreToolUse guard on every shell call (blocked force-push and destructive commands, including Kiro's own attempt to self-approve a merge); PostFileSave hook re-runs reconstruction tests and logs the result | Executed and verified | `.kiro/hooks/`, `docs/evidence/agentic-validation/REPORT.md` §4 |
| Custom agents | `ui-director` built the accessibility fixes, Time Machine and Trust Lab views and the premium visual system; `qa-auditor` audited independently and found real defects that were then fixed and re-audited | Executed and verified | `.kiro/agents/`, `docs/evidence/agentic-validation/sub-executions.json`, `docs/evidence/phase6/qa-auditor-*.md` |
| Property-based tests | Seeded generators over the rule boundaries, the scene, the Time Machine and tamper detection; deliberate mutations caught 8 of 8 | Verified | `tests/property.test.mjs`, `tests/time_machine.test.mjs`, `tests/trust_lab.test.mjs` |
| MCP | Read-only stdio server over the real engine; 14 real calls from a Kiro session; a Kiro-side discrepancy (empty objects lost in structured arguments) led to the `rows_json` input, then verified from Kiro | Executed and verified | `ghostbridge/mcp_server.py`, `docs/evidence/phase6/mcp-from-kiro.md` |
| Powers | Not used (no compatible local power; official ones need external accounts) | Not used | |
| Kiro Crew | No native Crew app was built | Not built | |

Test totals on the released code: 188 Python tests and 382 Node tests in CI; 18 syntax checks; 520 real-Chrome checks run by hand, including 14 against the live site.

## Limitations

Synthetic data only. Tested in Chrome (desktop, 1024 px and 390 px emulation); no screen reader test, so no WCAG claim. The local chain detects edits, deletions and reordering, but a full rewrite of the chain cannot be detected without an independently stored head. Kiro credit usage is not reported because it was not measurable from the session.

Contact: info@innerchispa.us · InnerChispa LLC
