# GhostBridge
### Old signals. New instincts.

GhostBridge turns **synthetic** signals from different generations of building
systems into explainable incidents and inspectable evidence. A local-first
**Resurrection**-category project for Kiroween 2026 by InnerChispa LLC: legacy relays, card
readers and cameras, brought back as one explained, verifiable incident.

**Status (November 17, 2026):** a stack of four draft PRs adds the immersive Control Room and the
competition features on top of `main`: [#10 Signal Forge](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/10) (ChatGPT/Codex),
[#14 Immersive Control Room](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/14),
[#15 agentic validation](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/15) and
[#16 Incident Time Machine and Evidence Trust Lab](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/16) (Kiro).
On the #16 head: **188 Python and 381 Node tests**, 18 syntax checks, CI green, plus 506 real-Chrome checks run by hand.
The stack is **not merged or deployed yet**, so the public site still shows `main`. Judges: see the
[judge guide](docs/submission/JUDGE_GUIDE.md). Full history below and in [Kiro evidence](docs/KIRO_EVIDENCE.md).

**Earlier status (November 10, 2026):** GhostBridge's **four reviewed Kiro development PRs are merged**: [#2 severity filtering](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/2), [#4 CSV/access adapters](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/4), [#5 correlated cases](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/5), and [#8 Interactive Evidence Reconstruction](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/8). PR #8 adds a **ledger-driven 2.5D case replay**, Play/Pause/Step/Speed controls, exclusion reasoning, and a full SHA-256 inspector. Independent review found no blocker and merged it as `bc747644e36913fb2ce9a6dff66b65d394945fe7`. The last PR head and merge CI passed **159 Python + 157 Node tests + 8 syntax checks = 324 checks**, zero failures. Kiro reports 89 scripted Chrome checks and 14 headless-Chrome screenshots, not an independent live-site assessment. A one-off local Python error remains unexplained, but did not recur in CI. **Further feature coding and video generation are paused pending final public-site QA**; the previous visual concepts and preliminary video cuts are retained. The final video and official Devpost entry are pending.

Source: https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026

## Run locally

Python 3.11+ and Node.js 22+ for tests. No pip/npm dependencies, API keys, cloud
inference or subscription required.

```sh
python -m ghostbridge
# Open http://127.0.0.1:8765
python -m unittest discover -s tests -v
node --test tests/*.test.mjs        # every Node suite (CI runs each file; see .github/workflows/ci.yml)
node --check docs/app.js            # and every docs/*.mjs module
python tests/mcp_demo_client.py     # drives the read-only MCP evidence server over stdio
```

Real-browser QA (needs Chrome or Edge, not part of CI): `node tests/browser-qa/<name>.qa.mjs`.

The local server binds only to `127.0.0.1`. SQLite stores the evidence chain in
`ghostbridge.sqlite3` (ignored by Git). `--database` and `--port` can override defaults.
The dashboard detects the loopback API and uses SQLite when served by this command.

## Try the lab

1. Run **Night Watch**: five synthetic events, three explainable incidents.
2. Inspect an incident: see its source event, rule, explanation and linked hash.
3. **Replay last**: no duplicate records or incidents.
4. **Verify chain**: independently recalculate every record hash.
5. **Test tamper detection**: alter a disposable copy; original evidence is retained.
6. **Export evidence JSON**: download the complete ledger and verification result.
7. Reset and run **Normal Shift**: four events, zero incidents.
8. **Access Denied** demonstrates the access-controller rule separately.
9. After Reset, select **Legacy Bridge Demo**: parse synthetic relay CSV and access-controller JSON and produce one cross-source case linking `access:A001` and `relay:R003`, 270 seconds apart. Verify original evidence and replay with zero duplicates.

Scenarios append to the current shift. Reset before comparing independent counts.
The pipeline uses short visual pacing to make processing legible; it is not cloud
latency or AI inference. Rules are deterministic and run locally.

## Browser-only edition

GitHub Pages publishes only `docs/`. The browser edition uses Web Crypto SHA-256
and localStorage. It does not connect to the Python API or any physical device.
Serve `docs/` over HTTP/HTTPS; do not open index.html as a file URL (ES modules).
GitHub Pages is configured at https://ghostbridge.innerchispa.us/ (built from `main`; see the
Pages workflow for deployment status). GitHub Actions confirmed the deployed bundle. Browser interaction
QA passed in an offline Chromium harness using the deployment artifact (32/32 checks);
a separate live anonymous-browser check remains outstanding.

## What is implemented

- Strict normalized event contract and compatible synthetic device types.
- Four deterministic rules: door held ≥120s, dwell ≥300s, access denied, camera offline.
- Idempotency by event ID, with conflicting payloads rejected.
- Atomic SQLite records containing both event and optional incident.
- Canonical JSON and SHA-256 chain over event plus explanation.
- Persistence, reset, JSON export and disposable tamper check.
- Responsive source cards, incident desk, evidence timeline and processing stages.
- **Kiro IDE-authored** incident severity filtering (All / High / Medium), accessible controls, 17 regression tests, and [authentic session provenance](docs/KIRO_EVIDENCE.md).
- Two independent synthetic **software adapters**: relay CSV imported using the Python CLI and access-controller JSON via a loopback-only HTTP webhook. Both normalize events into the existing SQLite evidence ledger.
- **Cross-source case correlator:** access denied then held-open door within 300 seconds; stable SHA-256 case ID, linked source event IDs and existing evidence hashes, and a read-only Python `/api/cases` route.
- Browser-only **Legacy Bridge Demo** with embedded offline fixtures, responsive correlated-case cards, full evidence export and local-only computation. No live device inputs or cloud AI.
- **Interactive Evidence Reconstruction** (Kiro PR #8): read-only 2.5D incident sequence built from verified ledger rows, linked source hashes, causal checks, excluded events and accessible playback controls.
- CI and Pages workflows prepared; no dependencies on InnerOS or other agents.
- In the draft PR stack (not on `main` yet):
  - **Signal Forge** (PR #10, ChatGPT/Codex): compose your own denied-then-held-open incident.
  - **Immersive Control Room** (PR #14, Kiro): living SVG building driven only by the ledger, the 299/120 and 301/119 boundary challenges, four operator modes, before/after reveal, Showcase Mode (`?present=1`).
  - **Agentic validation** (PR #15, Kiro): custom `ui-director` and `qa-auditor` agents run for real, hooks observed firing, and a read-only stdio **MCP evidence server** (`python -m ghostbridge.mcp_server`) that Kiro has called.
  - **Incident Time Machine and Evidence Trust Lab** (PR #16, Kiro): step through one incident beat by beat; tamper with a copy of the ledger and see the exact failing row while the original stays verified.

## What is not implemented

ONVIF, Wiegand and specific physical-relay/access-controller integrations are **future hardware targets**. The implemented CSV and JSON adapters work with local **synthetic data**, not physical devices. No video inference, production integration, physical actuation,
legal evidence certification, external signature, blockchain or AI model is claimed.
Device status is the latest synthetic signal, not a real uptime measurement.

The chain detects changes when hashes/links disagree. A complete chain rewrite or
suffix truncation cannot be detected without an independently stored trusted head.
Never treat this local chain as externally certified immutable evidence.

## Kiro and competition

Initial GhostBridge code and original `.kiro/` planning were prepared by **Codex/ChatGPT**, not Kiro. Real Kiro IDE Autopilot contributions were: Evidence Reconstruction (PR #8), the Control Room (PR #14), agentic validation (PR #15), the Time Machine and Trust Lab (PR #16), incident filter ([PR #2](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/2)), legacy adapters ([PR #4](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/4)) and multi-source correlator/UI ([PR #5](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/5)). Independent ChatGPT code review fixes and reviewer tests are explicitly distinguished in [evidence](docs/KIRO_EVIDENCE.md). The owner confirmed the promotional Kiro coupon redemption; remaining balance is not externally verified.

Official rules: https://kiroween.devpost.com/rules. Deadline: December 4, 2026 at 14:00 Pacific / 17:00 Ecuador. Public MIT source, root `.kiro/`, working synthetic app and automated tests exist. **Merge and deployment of the PR stack, the final video and the Devpost entry are still pending.** Owner approval is required before hackathon submission. Eligibility checklist: [docs/submission/ELIGIBILITY.md](docs/submission/ELIGIBILITY.md).

See [architecture](ARCHITECTURE.md), [handoff](docs/CODEX_HANDOFF.md) and
[demo script](docs/DEMO_SCRIPT.md). MIT licensed.
