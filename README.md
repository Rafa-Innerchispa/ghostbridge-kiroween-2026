# GhostBridge
### Old signals. New instincts.

GhostBridge turns **synthetic** signals from different generations of building
systems into explainable incidents and inspectable evidence. A local-first
Frankenstein-category project for Kiroween 2026 by InnerChispa LLC.

**Status:** new implementation created October 30, 2026. 29 Python tests and
12 JavaScript engine tests pass locally. Public source is on `main`; MIT and root
`.kiro/` are visible. GitHub CI and Pages deployment passed; public HTML, JavaScript,
module and CSS return HTTP 200. Visual browser QA and authentic Kiro development evidence remain pending.
Devpost registration was verified on 2026-11-06; the project is still a submission draft. See [verification evidence](docs/VERIFICATION.md).
No recovered ZIP or previous history is claimed.

Source: https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026

## Run locally

Python 3.11+ and Node.js 22+ for tests. No pip/npm dependencies, API keys, cloud
inference or subscription required.

```sh
python -m ghostbridge
# Open http://127.0.0.1:8765
python -m unittest discover -s tests -v
node --check docs/app.js
node --test tests/browser.test.mjs
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
for deployment status. Anonymous HTTP access was verified; browser interaction
verification is still pending.

## What is implemented

- Strict normalized event contract and compatible synthetic device types.
- Four deterministic rules: door held ≥120s, dwell ≥300s, access denied, camera offline.
- Idempotency by event ID, with conflicting payloads rejected.
- Atomic SQLite records containing both event and optional incident.
- Canonical JSON and SHA-256 chain over event plus explanation.
- Persistence, reset, JSON export and disposable tamper check.
- Responsive source cards, incident desk, evidence timeline and processing stages.
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

`.kiro/` contains requirements, design, tasks and steering prepared by Codex. This
is **not proof of Kiro use**. A functional Kiro-authored improvement and authentic
session evidence are still required. See [Kiro session plan](KIRO.md).

Official rules: https://kiroween.devpost.com/rules — submission deadline December 4,
2026 at 14:00 PST (17:00 Ecuador). Requires actual Kiro use, public GitHub source,
visible open-source license, root `.kiro/`, a working app and public YouTube video
under three minutes. Startup bonus requires verified founder details, LinkedIn and
startup website. Devpost registration is complete; the final hackathon submission is NOT sent.
The owner reports requesting 4,000 promotional Kiro credits, but grant/redemption is not verified.
The Kiro Free plan currently has 50 covered monthly credits, with 0 consumed at last check.
Actual Kiro implementation remains mandatory. See the bounded Kiro task at
[incident severity spec](.kiro/specs/incident-severity-filter/requirements.md) and [KIRO.md](KIRO.md).
Final submission requires owner approval.

See [architecture](ARCHITECTURE.md), [handoff](docs/CODEX_HANDOFF.md) and
[demo script](docs/DEMO_SCRIPT.md). MIT licensed.
