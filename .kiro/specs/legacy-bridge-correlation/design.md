# Phase 2 design notes — review/refine in Kiro before coding

**This is a planning proposal, not completed implementation.** Check existing code and preserve contracts.

## Existing verified code

- `ghostbridge/core.py` validates exactly `id, device, type, at, data`; `DEVICES` maps `door-01`, `reader-01`, `camera-01` and `zone-01`. Existing rules detect 120s door-open, 300s dwell, access.denied and camera.offline.
- `ghostbridge/engine.py` calls validation and stores each event with optional incident.
- `ghostbridge/storage.py` maintains a SQLite `ledger` table and SHA-256 previous/hash linkage.
- `ghostbridge/server.py` serves static `docs/` and `/api/events`, `/api/state`, `/api/verify`, `/api/scenario`, `/api/reset` from loopback. Existing POST code enforces Host/Origin, content type and 16 KiB max.
- `docs/engine.mjs` mirrors canonical contract; `docs/app.js` runs the browser-only dashboard and calls localhost API when available.
- `docs/filters.mjs` and UI buttons are genuine earlier Kiro contributions. `tests/night-ledger.json` is the existing cross-language fixed hash fixture.

## Proposed format A: legacy relay text file

An explicit, size-bounded local fixture read from a CLI option or user-selected upload. Proposed CSV columns:

`event_id,at,relay,state,duration_seconds`

Example: `R001,2026-11-08T12:01:00Z,north-door,OPEN,180`

Map `north-door` -> `door-01`, `OPEN` -> `door.open`, `CLOSED` -> `door.closed`; duration is mandatory only for OPEN. Prefix IDs (e.g. `relay:R001`) within the existing 80-character constraint. Reject unknown relays/states, invalid UTC timestamps, duplicate CSV IDs in one file, malformed quoting and invalid durations.

Prefer command `python -m ghostbridge ingest-relay <fixture> --database <path>`, with no daemon or file watcher needed. Review existing CLI code before choosing exact option order. Ensure safe idempotency by passing normalized events through `Engine.ingest`.

## Proposed format B: access-controller JSON webhook

Proposed POST endpoint `/api/adapters/access`, loopback only, using existing Host/Origin + request-size policy. Payload example:

```json
{"event_id":"A001","at":"2026-11-08T12:00:00Z","reader":"archive-reader","decision":"DENIED"}
```

Map `archive-reader` -> `reader-01`, `DENIED`/`GRANTED` -> `access.denied`/`access.granted`. Prefix IDs `access:A001`. Invalid decision, reader, calendar, extra fields or repeated conflicting payload should fail. No credentials included in fixtures.

Optional third fixture: camera health JSON to represent `camera.offline`, but keep the main acceptance case working with exactly two source formats.

## Correlation algorithm

Read full verified event rows, not only existing per-event incident cards. Sort candidate events deterministically by `(at, event_id)`. For each access.denied, select the earliest unmatched qualifying `door.open` at the same synthetic site with a timestamp in `[denied_at, denied_at + 300s]` and `duration_seconds >=120`. Enforce a clear dedup strategy so one pair generates one case. If multiple candidates exist, stable selection regardless of ingest order is required.

Emit a derived, non-persisted `case` object like:

```json
{
  "id": "case:<stable digest>",
  "rule": "denied-then-held-open",
  "severity": "high",
  "title": "Denied access followed by held-open door",
  "event_ids": ["access:A001", "relay:R001"],
  "evidence_hashes": ["<existing ledger hash A>", "<existing ledger hash R>"],
  "explanation": "An access attempt was rejected and the entrance stayed open for 180 seconds within five minutes.",
  "window_seconds": 300
}
```

The case object is **not** inserted into the existing ledger unless carefully justified. Use the same case rules in Python and browser fixture mode, test parity, and document local-hash-chain limitations. Include optional camera-offline context as a referenced event only if the code genuinely detects it.

## User-facing demo

- New **Legacy Bridge** action to replay adapters' prepared fixtures and show **Sources -> Normalization -> Cross-source case -> Source evidence hashes**.
- Local app: route fixture ingestion through the actual parser/ingest logic, not direct `scenario('night')` calls.
- Browser Pages: the same public fixture content is parsed locally (CSV + JSON); clearly label it **Offline fixture replay**, no live endpoint.
- Show counts and individual incidents separately from correlated cases; no misleading automatic intrusion response.

## Delivery architecture

PR A: adapters + source fixture parser + security + persistence tests; keep existing UI behavior.  
PR B: deterministic case correlator, read-only API, JS parity, dashboard panel, browser tests and Kiro evidence.  
Use standard-library Python and vanilla JS. No paid backend, external inference, dependencies or production InnerOS access.

## Required QA

Before merge: validate all existing Night Watch fixture hashes, 29+ Python, 29+ JS, new adapter/correlation cases, accessibility, 390px mobile and no regression in export/verification. After merge: verify Pages deploy and a genuinely public anonymous browser load. Record PRs and genuine Kiro session evidence.
