# GhostBridge
### Old signals. New instincts.

GhostBridge turns **synthetic** signals from different generations of building
systems into explainable incidents and inspectable evidence. A local-first
Frankenstein-category project for Kiroween 2026 by InnerChispa LLC.

**Status (November 9, 2026):** GhostBridge now includes a **genuine Kiro IDE-authored** severity filter ([PR #2](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/2)), legacy CSV and access webhook adapters ([PR #4](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/4)), and a deterministic cross-source case correlator with browser UI ([PR #5](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/5)). All three PRs have been reviewed and merged. Independent review fixes are attributed separately in [KIRO_EVIDENCE.md](docs/KIRO_EVIDENCE.md). **159 Python + 75 Node tests and 5 JS syntax checks passed on PR #5**, all in GitHub CI. Earlier offline Chromium QA (32/32) predates the new correlator and **does not verify its UI**. Live anonymous browser/mobile QA and the under-3-minute video are still outstanding. **Kiroween submission NOT sent**; no actual device connectivity or production InnerOS integration is claimed.

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
node --check docs/correlator.mjs
node --check docs/fixture_replay.mjs
node --check docs/fixtures.js
node --test tests/browser.test.mjs
node --test tests/filter.test.mjs
node --test tests/correlator.test.mjs
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
9. After Reset, select **Legacy Bridge Demo**: parse synthetic relay CSV and access-controller JSON and produce one cross-source case linking `access:A001` and `relay:R003`, 270 seconds apart. Verify original evidence and replay with zero duplicates.

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
- Two independent synthetic **software adapters**: relay CSV imported using the Python CLI and access-controller JSON via a loopback-only HTTP webhook. Both normalize events into the existing SQLite evidence ledger.
- **Cross-source case correlator:** access denied then held-open door within 300 seconds; stable SHA-256 case ID, linked source event IDs and existing evidence hashes, and a read-only Python `/api/cases` route.
- Browser-only **Legacy Bridge Demo** with embedded offline fixtures, responsive correlated-case cards, full evidence export and local-only computation. No live device inputs or cloud AI.
- CI and Pages workflows prepared; no dependencies on InnerOS or other agents.

## What is not implemented

ONVIF, Wiegand and specific physical-relay/access-controller integrations are **future hardware targets**. The implemented CSV and JSON adapters work with local **synthetic data**, not physical devices. No video inference, production integration, physical actuation,
legal evidence certification, external signature, blockchain or AI model is claimed.
Device status is the latest synthetic signal, not a real uptime measurement.

The chain detects changes when hashes/links disagree. A complete chain rewrite or
suffix truncation cannot be detected without an independently stored trusted head.
Never treat this local chain as externally certified immutable evidence.

## Kiro and competition

Initial GhostBridge code and original `.kiro/` planning were prepared by **Codex/ChatGPT**, not Kiro. Real Kiro IDE Autopilot contributions were: incident filter ([PR #2](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/2)), legacy adapters ([PR #4](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/4)) and multi-source correlator/UI ([PR #5](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/5)). Independent ChatGPT code review fixes and reviewer tests are explicitly distinguished in [evidence](docs/KIRO_EVIDENCE.md). The owner confirmed the promotional Kiro coupon redemption; remaining balance is not externally verified.

Official rules: https://kiroween.devpost.com/rules. Deadline: December 4, 2026 at 14:00 Pacific / 17:00 Ecuador. Public MIT source, root `.kiro/`, working synthetic app and automated tests exist. **Live browser QA, final video and final Devpost entry are still pending.** Owner approval is required before hackathon submission.

See [architecture](ARCHITECTURE.md), [handoff](docs/CODEX_HANDOFF.md) and
[demo script](docs/DEMO_SCRIPT.md). MIT licensed.
