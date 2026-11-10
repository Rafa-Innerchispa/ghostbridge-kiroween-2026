# GhostBridge synthetic fixtures

These files are **synthetic** test fixtures only. No real building, customer
data, or credentials are present.

## Relay CSV files

| File | Events | Description |
|---|---|---|
| `relay_night_shift.csv` | 4 | Two held-open door events (both ≥120s → incidents) plus closures |
| `relay_normal_shift.csv` | 2 | One brief open (45s, no incident) plus closure |

### Replay commands (run from repo root, Windows PowerShell or Linux/macOS shell)\n\nThe SQLite file `ghostbridge.sqlite3` is gitignored. Both imports use the same local database.

```sh
# Ingest night-shift relay events into a temporary database:
python -m ghostbridge ingest-relay fixtures/relay_night_shift.csv --database ghostbridge.sqlite3

# Ingest normal-shift relay events:
python -m ghostbridge ingest-relay fixtures/relay_normal_shift.csv --database ghostbridge.sqlite3
```

## Access-controller webhook payloads

| File | Decision | Description |
|---|---|---|
| `access_webhook_denied.json` | DENIED | Archive reader rejected; produces medium incident |
| `access_webhook_granted.json` | GRANTED | Access granted; no incident |

### Replay commands

```sh
# POST a denied access event to a running local server (port 8765):
curl -s -X POST http://127.0.0.1:8765/api/adapters/access \
     -H "Content-Type: application/json" \
     --data-binary @fixtures/access_webhook_denied.json

# POST a granted access event:
curl -s -X POST http://127.0.0.1:8765/api/adapters/access \
     -H "Content-Type: application/json" \
     --data-binary @fixtures/access_webhook_granted.json
```

## Event ID namespacing

All relay events have IDs prefixed `relay:` (e.g. `relay:R001`).
All access webhook events have IDs prefixed `access:` (e.g. `access:A001`).
These namespaces prevent collision with the built-in scenario IDs (`night-1`, etc.).
