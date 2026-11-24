# GhostBridge: The Building That Remembers

**Five signals. One explained incident. Evidence you can verify.**

*(The "five signals" are the five events of the Night Watch scenario: door held open, long presence, camera offline, door closed, access granted. The building shows four sources; each boundary challenge records three events.)*

Live demo: https://ghostbridge.innerchispa.us/ (runs entirely in your browser; nothing to install; nothing you type leaves the page)
Source: https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026 (MIT) · Category: **Resurrection**

---

## Elevator pitch

Older buildings run on equipment that was never meant to talk to each other: a relay on the door, a card reader on another controller, a camera on a third system. Each raises its own alarm, and a night operator must decide, alone and fast, which alarms belong together. GhostBridge brings those old signals back to life without replacing the hardware. It seals every signal in a tamper-evident SHA-256 chain, links related signals with deterministic rules an operator can read, replays the incident moment by moment, and lets anyone check the evidence with their own tools. **Don't trust us: bring your own log, seal it, and verify it without GhostBridge.**

## Who it is for

- **Operators of residential and mixed-use buildings** with security hardware from different generations and vendors.
- **The night-shift operator** who sees several unrelated alarms and must decide which ones are one event.
- **Property managers and auditors** who later need to show what happened, in what order, and that the record was not changed afterwards.

## The problem

- **Replacing legacy hardware is expensive and disruptive.** Doors, readers and cameras are wired into the building; swapping them means construction, downtime and retraining.
- **Fragmented alerts are hard to investigate.** "Badge rejected" and "door held open" arrive as two unrelated alarms, minutes apart, on different screens.
- **An explanation is only useful if it can be checked.** If a tool says "these two events are one incident", an auditor needs to see why, and to know the records were not edited afterwards.

## What is demonstrated

| Capability | What you can do in the demo |
|---|---|
| One event contract for old and new signals | Relay CSV and access-controller JSON become the same event format (Legacy Bridge Demo) |
| **Your own data** | **Your own log**: write or upload a CSV of events for the four sources; every line is checked against the strict contract and imported all-or-nothing, in your browser |
| Tamper-evident record | Every event is sealed in a SHA-256 chain; **Verify chain** recomputes every link |
| Deterministic, readable correlation | An *Access denied* followed within **300 s** by a door **held open ≥ 120 s** forms one case |
| Exact boundaries | **299 s / 120 s** forms a case; **301 s / 119 s** does not, and the app says which condition failed and by how much |
| Moment-by-moment replay | **Incident Time Machine**: eight beats drive the building scene; computed moments are labelled *derived, not recorded* |
| Evidence you can attack | **Evidence Trust Lab**: change one field in an isolated copy; the copy fails at that exact row while the original stays verified |
| **Evidence that survives a rewrite** | **Seal this ledger** downloads a receipt (head hash and row count). Checking against it tells *matches*, *extended*, *truncated* and **rewritten** apart, even if someone recomputed every hash |
| **Verification without GhostBridge** | A short, single-file, standard-library Python verifier that imports no GhostBridge code: `python verify_evidence.py ghostbridge-evidence.json --receipt ghostbridge-receipt.json` |
| Advisory response | Next steps for a human operator; GhostBridge never controls a door, camera or person |

**Not claimed:** no real hardware, camera feed or customer system is connected; ONVIF, Wiegand and physical relay integrations are future work. No AI model or cloud inference runs. The chain and the receipt are local and tamper-evident, not a legal signature or an external timestamp. Built-in scenarios use synthetic events; your own log is your data, processed only in your browser.

## Judge walkthrough (under 1 minute to understand, under 4 to explore)

Open the live demo. **Reset** (Signal lab toolbar) returns to an empty ledger at any time. For a hands-off overview, press **Showcase Mode** (about one minute).

| Step | Do this | What it shows |
|---|---|---|
| 1 | Look at the Control Room | A quiet building: four sources, no signals yet |
| 2 to 4 | **Challenge A · 299 s · 120 s** | *Access denied*; the door opens; only after 120 s held open does the case link appear |
| 5 | **Challenge B · 301 s · 119 s** | No case; each condition fails by 1 s, and the text says so |
| 6 | Challenge A again, **Timeline** → **Incident Time Machine** | Each beat moves the building to that moment; beat 6 shows the case id and the two evidence hashes |
| 7 | **Evidence** → **Verify chain** | Every row recomputed and verified |
| 8 to 9 | **Evidence Trust Lab**: row 2, *Timestamp*, **Tamper a copy** | *Altered copy: fails at row 2*; stored vs recomputed hash; original untouched |
| 10 | **Restore** | Back to the original, verified ledger |
| 11 | **Seal this ledger**, **Download receipt**; run Challenge B; **Check against this ledger** | The old receipt now reports a failure: the history it sealed is gone |
| 12 | **Your own log** → **Use the template** → edit a time → **Check** → **Import into the lab** | Your own events, sealed and correlated by the same rules. Break a line and see the exact line number |
| 13 | **Export evidence JSON**, download the verifier, run it | Your own machine confirms the head hash, with no GhostBridge code |

## Architecture

```
  Sources                              GhostBridge core (the same rules in Python and the browser)
  ───────                              ───────────────────────────────────────────────────────────
  Relay CSV  ───────┐                 ┌──────────────┐   ┌───────────────────┐   ┌──────────────┐
  Access JSON ──────┼── adapters ───▶ │ event        │──▶│ SHA-256 chained    │──▶│ deterministic │
  Scenarios / Forge ┤   (validate,    │ contract     │   │ ledger (SQLite or  │   │ correlator    │
  Your own log ─────┘    normalize)   │ (strict)     │   │ browser storage)   │   │ 300 s / 120 s │
                                      └──────────────┘   └─────────┬─────────┘   └──────┬───────┘
                                                                   │ rows + hashes      │ cases
                                                                   ▼                    ▼
                          ┌─────────────────────────────────────────────────────────────────────┐
                          │ Control Room (pure functions of the ledger): building scene, Rule    │
                          │ check, Time Machine, Trust Lab, Seal and verify, Reconstruction       │
                          └──────────────────────────────┬──────────────────────────────────────┘
                                                         │ export JSON + receipt
                                                         ▼
                          independent verifier (standard-library Python, no GhostBridge code)

  Kiro side: read-only MCP server (stdio) over the same engine, packaged as the GhostBridge Evidence Power
             (list_scenarios · run_scenario · forge_boundary · verify_ledger, plus audit and explain skills)
```

- Browser edition: static files on GitHub Pages, Web Crypto SHA-256, localStorage. No server, no third-party requests.
- Local edition: `python -m ghostbridge` serves the same UI with SQLite, bound to 127.0.0.1 only.
- Python and JavaScript produce identical hashes, case ids and evidence hashes (100-configuration parity fixture); the independent verifier is cross-checked against both.

## Built with Kiro: feature and evidence matrix

"Verified" means checked by tests or an independent run, not only by an agent's statement.

| Kiro feature | How it was used | Status | Evidence |
|---|---|---|---|
| Specs | Requirements (EARS), design and tasks per feature; tasks ticked only after validation | Verified | `.kiro/specs/*/` |
| Steering | Product rules (synthetic data, honest labels, local-first) and UI rules (no innerHTML, no third-party requests, one contact) enforced by tests | Verified | `.kiro/steering/`, `tests/control_room_wiring.test.mjs` |
| Agent hooks | PreToolUse guard on every shell call (blocked force-push and recursive deletes outside the project; Kiro's own safety layer separately refused to let the agent write itself a merge approval); PostFileSave hook re-runs the reconstruction tests and logs the result | Executed and verified |
| Agent hooks (2026-11-24) | PostFileSave hook re-runs the cross-implementation evidence properties and the Power checks when a rule file or the Power's engine copy is saved | Runner and matcher tested; firing in the IDE not yet observed | `.kiro/hooks/evidence-properties-on-save.json`, `tests/hooks.test.mjs` |
| Specs (2026-11-24) | `evidence-properties`: requirements, design and tasks written by Kiro with the implementation | Implemented | `.kiro/specs/evidence-properties/` | `.kiro/hooks/`, `docs/evidence/agentic-validation/REPORT.md` §4 |
| Custom agents | `ui-director` (6 runs) built the accessibility fixes, Time Machine and Trust Lab views, the visual system and the Bring-your-own-log and Seal views; `qa-auditor` (7 runs) audited independently and found real defects that were fixed and re-audited | Executed and verified | `.kiro/agents/`, `docs/evidence/phase8/agent-runs.json` (every run, from the Kiro session log), `docs/evidence/phase6/qa-auditor-*.md`, `docs/evidence/premium/qa-auditor-phase7.md` |
| Property-based tests | Seeded generators over the rule boundaries, the scene, the Time Machine, tamper detection and receipt rewrites; 8 deliberate code mutations all caught. Cross-implementation properties: random ledgers checked so that the Python engine, the browser engine and the independent verifier agree on row hashes, cases, the first tampered row and receipt verdicts; 3 injected rule faults all caught | Verified | `tests/property.test.mjs`, `tests/time_machine.test.mjs`, `tests/trust_lab.test.mjs`, `tests/evidence_receipt.test.mjs`, `tests/test_properties.py`; `tools/mutation-check.ps1` |
| MCP | Read-only stdio server over the real engine; 14 real calls from a Kiro session; a discrepancy found from Kiro (empty objects lost in structured arguments) led to the `rows_json` input, then verified from Kiro | Executed and verified | `ghostbridge/mcp_server.py`, `docs/evidence/phase6/mcp-from-kiro.md` |
| Powers | **GhostBridge Evidence Power**: an Agent Plugins 1.0.0 power with the MCP server bundled (self-contained) and three skills (`audit-evidence`, `explain-case`, `incident-walkthrough`); installed with `kiro-cli powers install` on 2026-11-24; manifest checked against the schema, and a real stdio round trip from a copy of the folder | Built and tested; **installation and invocation from Kiro: see `docs/evidence/phase8/STATUS.md`** | `powers/ghostbridge-evidence/`, `tests/test_power.py` |
| Kiro Crew | No native Crew app was built. A Crew specification in `.kiro/specs/ghostbridge-crew-app/` was prepared by ChatGPT as task input and not implemented | Not built | |

Test totals: 204 Python tests and 433 Node tests run in CI on every change; 23 syntax checks. Real-Chrome suites run by hand (CI has no browser): Phase 8 verifiable evidence 89, Phase 6 experience 159, independent audit 39, accessibility targets 39, skip link 32, Signal Forge focus 40, Signal Forge 56, Control Room 141: 595 checks, all passing (last full run 2026-11-24; a few scenarios needed an automatic retry after a Chrome launch stalled, and each retry is logged by the suite).

## Limitations

Built-in data is synthetic. Tested in Chrome (desktop, 1024 px and 390 px emulation); no screen reader test, so no WCAG claim. A receipt protects only what was sealed, and only if it is kept where the ledger's owner cannot change it. Kiro credit usage is not reported because it was not measurable from the session.

Contact: info@innerchispa.us · InnerChispa LLC
