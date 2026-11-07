# GhostBridge
### Old signals. New instincts.

GhostBridge turns **synthetic** signals from different generations of building
systems into explainable incidents and inspectable evidence. A local-first
Frankenstein-category project for Kiroween 2026 by InnerChispa LLC.

**Status (November 7, 2026):** initial GhostBridge MVP created October 30; the authentic Kiro IDE Autopilot incident-severity filter was implemented November 6, reviewed and merged as [PR #2](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/2). The automated suite runs **29 Python tests and 29 JavaScript tests** (12 original and 17 Kiro-authored); GitHub CI and Pages deployment succeeded. A separate offline Chromium QA run against the exact published Pages artifact [passed 32 interaction checks](docs/BROWSER_QA_2026-11-07.md). This is **not** a live remote browser check. Devpost registration and the project draft exist, but the final hackathon entry **has not been sent**. MIT and root `.kiro/` are public.

Source: https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026

## Run locally

Python 3.11+ and Node.js 22+ for tests. No pip/npm dependencies, API keys, cloud
inference or subscription required.

```sh
python -m ghostbridge
# Open http://127.0.0.1:8765
python -m unittest discover -s tests -v
node --check docs/app.js
node --check docs/filters.mjs
node --test tests/browser.test.mjs
node --test tests/filter.test.mjs
```

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

Scenarios append to the current shift. Reset before comparing independent counts.
The pipeline uses short visual pacing to make processing legible; it is not cloud
latency or AI inference. Rules are deterministic and run locally.

## Browser-only edition

GitHub Pages publishes only `docs/`. The browser edition uses Web Crypto SHA-256
and localStorage. It does not connect to the Python API or any physical device.
Serve `docs/` over HTTP/HTTPS; do not open index.html as a file URL (ES modules).
GitHub Pages is configured at
https://rafa-innerchispa.github.io/ghostbridge-kiroween-2026/ — see the Pages workflow
for deployment status. GitHub Actions confirmed the deployed bundle. Browser interaction
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
- CI and Pages workflows prepared; no dependencies on InnerOS or other agents.

## What is not implemented

ONVIF, Wiegand, relay and access-controller labels are **adapter targets**, not real
hardware connections. No video inference, production integration, physical actuation,
legal evidence certification, external signature, blockchain or AI model is claimed.
Device status is the latest synthetic signal, not a real uptime measurement.

The chain detects changes when hashes/links disagree. A complete chain rewrite or
suffix truncation cannot be detected without an independently stored trusted head.
Never treat this local chain as externally certified immutable evidence.

## Kiro and competition

Initial GhostBridge code and the first `.kiro/` requirements and steering were prepared by **Codex/ChatGPT**, and must not be attributed to Kiro. On November 6, 2026, **Kiro IDE Autopilot** authored a separate, verifiable severity-filter improvement and 17 regression tests. See [PR #2](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/2), [Kiro evidence](docs/KIRO_EVIDENCE.md), and [browser QA](docs/BROWSER_QA_2026-11-07.md). The owner reported approximately 4.69 Kiro credits used in the session. A promotional 4,000-credit request was reported but the grant is not confirmed.

Official rules: https://kiroween.devpost.com/rules. Deadline: December 4, 2026 at 14:00 PST (17:00 Ecuador). Public MIT source, root `.kiro/` directory and working app exist. **Final video and final Devpost entry are still pending**. Startup bonus requires founder confirmation and verified public links. We will not submit without explicit owner approval.

See [architecture](ARCHITECTURE.md), [handoff](docs/CODEX_HANDOFF.md) and
[demo script](docs/DEMO_SCRIPT.md). MIT licensed.
