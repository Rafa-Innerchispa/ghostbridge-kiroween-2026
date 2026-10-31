# Architecture and boundaries

Synthetic source → event contract → deterministic incident rule → atomic ledger
record → SQLite / browser storage → inspectable dashboard.

Python: `core.py` validates and evaluates; `storage.py` owns persistence and chain;
`engine.py` orchestrates; `simulator.py` generates deterministic fixtures;
`server.py` exposes loopback HTTP. `docs/engine.mjs` mirrors rules for the static lab.
No proprietary code was imported from InnerOS.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | /api/state | Devices, events, incidents, ledger and integrity |
| GET | /api/verify | Recompute chain |
| POST | /api/events | One normalized synthetic event |
| POST | /api/scenario | `{ "name": "night" }`, normal or denied |
| POST | /api/reset | `{}` clears this local lab |

Writes require JSON, ≤16 KiB, loopback Host and same-origin Origin when supplied.
There is no CORS access, authentication, remote API exposure or physical action.
The server serializes writes; SQLite transactions store event and incident together.

## Event contract

Exactly `id`, `device`, `type`, `at`, `data`. UTC ISO timestamp ending in Z. Duration
events require integer `duration_seconds` in 0..86400; other events require empty data.
IDs are 1..80 characters and must identify an immutable event. Source adapters can
be added later behind this contract after explicit authorization and testing.

## Integrity format

`SHA256(previous_hash + "\n" + canonical_json({event,incident}))`.
Canonical JSON sorts object keys, has no whitespace and preserves array order.
The first previous hash is 64 zeroes. Sequence gaps, changed payloads, changed hashes
and broken links are detected. Rewriting all hashes or deleting the tail is outside
the protection of a self-contained local chain. Export and independently store the
head hash if comparing against a trusted external checkpoint in future work.

## Threat and privacy boundaries

Synthetic data only. Browser localStorage is per-origin and editable by the user.
No multi-tenant/public ingestion, secrets, client surveillance or safety-critical use.
Public Pages is a static educational lab, not a remotely managed building service.
