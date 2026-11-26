# Home lab mode

Local-only. Imports the owner's own Home Assistant history into a private SHA-256 ledger that
`docs/verify/verify_evidence.py` can check. Nothing here is published, and the public site stays synthetic.

## Setup (outside the repo)

1. `homelab.json` in `%USERPROFILE%\GhostBridge-privado` (or `GHOSTBRIDGE_HOME_CONFIG`): zones (entity id -> id, name, kind
   `contact` or `motion`, `expected_open` daily windows in local time, `stuck_after_hours`), `timezone_offset_hours`,
   and `sensor_faults` the owner confirmed (zone, since, reason).
2. For live commands only: set `GHOSTBRIDGE_HA_URL` and `GHOSTBRIDGE_HA_TOKEN` in the environment. Use a token from a
   non-admin Home Assistant user. Non-local hosts are refused unless `GHOSTBRIDGE_HA_ALLOW_REMOTE=1`.

## Commands (`python -m ghostbridge.homelab ...`)

| Command | What it does | Touches HA |
|---|---|---|
| `import <csv>` | History CSV (`entity_id,state,last_changed`) into the ledger. Re-running adds nothing. | no |
| `verify`, `cases`, `export <json>` | Check the chain, list derived cases, write evidence for the verifier. | no |
| `ha-ping` | Connection check. | read |
| `ha-snapshot` | Current state of the configured zones. | read |
| `ha-history --since T --out f.csv` | Zone history as an importer-ready CSV. | read |
| `ha-notify --message M [--confirm]` | Message in the HA sidebar. Dry run unless `--confirm`. | write, one service |

## What it will not do

Arm, disarm, lock, unlock, switch or restart anything. Those services are refused before any request is sent.
Entities starting with `person.`, `device_tracker.` or `zone.` are never imported.

## Rules

- `open-outside-schedule`: open 120 s or more, with at least 120 s outside the zone's expected hours.
- `sensor-fault`: open, and the owner recorded a fault for that sensor. Reported as a fault, not a door event.
- `sensor-suspect`: open longer than `stuck_after_hours` with no close.

Importer rules: `unavailable` and `unknown` are ignored, a repeated state is a duplicate, the first state of an entity
is a baseline. All three are counted in the import summary.
