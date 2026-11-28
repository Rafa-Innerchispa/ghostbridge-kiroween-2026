# GhostBridge Home Lab — InnerOS Deployment Architecture

## 1. Overview & Architecture

GhostBridge Home Lab provides an authenticated, cryptographic ledger bridge between local smart home telemetry (Home Assistant, Intelbras ANM_24_NET, UniFi, Hubitat) and the GhostBridge verifiable incident engine.

Unlike the public demonstration site which uses purely synthetic events and client-side simulation, the private Home Lab service runs on the local Linux server under InnerOS supervision.

```
+-------------------------------------------------------------------+
|                        Local Home Environment                     |
|                                                                   |
|   +-----------------------+         +-------------------------+   |
|   | Home Assistant        |         | Intelbras Alarm / Hub   |   |
|   | (Docker, Port 8123)   | <-----> | (Local Bus / LAN)       |   |
|   +-----------------------+         +-------------------------+   |
|              ^                                                    |
|              | HTTP REST (Read-Only Allowlist)                    |
|              v                                                    |
|   +-----------------------------------------------------------+   |
|   | ghostbridge-homelab.service (Systemd User Unit)           |   |
|   | FastAPI Service on 127.0.0.1:8770                         |   |
|   | - GET /api/ghostbridge/health                             |   |
|   | - GET /api/ghostbridge/sensors                            |   |
|   | - GET /api/ghostbridge/events                             |   |
|   | - GET /api/ghostbridge/incidents                          |   |
|   | - GET /api/ghostbridge/evidence/{case_id}                 |   |
|   | - GET /api/ghostbridge/receipts/{receipt_id}              |   |
|   +-----------------------------------------------------------+   |
|              ^                                                    |
|              | Reads / Appends                                    |
|              v                                                    |
|   +-----------------------------------------------------------+   |
|   | Private Cryptographic SQLite Ledger                       |   |
|   | ~/GhostBridge-privado/homelab.sqlite3                     |   |
|   | (SHA-256 hash chaining, Merkle receipts)                  |   |
|   +-----------------------------------------------------------+   |
|              |                                                    |
|              | Automated Nightly Backup (04:00 UTC)               |
|              v                                                    |
|   +-----------------------------------------------------------+   |
|   | ghostbridge-homelab-backup.timer                          |   |
|   | Snapshot + SHA-256 Checksum (14-day retention)            |   |
|   +-----------------------------------------------------------+   |
+-------------------------------------------------------------------+
```

---

## 2. Systemd Service Specification

The service runs under the user systemd manager on the host server:

- **Service Unit:** `~/.config/systemd/user/ghostbridge-homelab.service`
- **Working Directory:** `/home/rlopez/inneros/inneros_core/workspaces/ghostbridge-kiroween-2026`
- **Environment:** `GHOSTBRIDGE_PRIVATE_DIR=~/GhostBridge-privado`
- **Secrets & Configuration:** `~/GhostBridge-privado/ha.env`, `~/GhostBridge-privado/homelab.json`
- **Restart Policy:** `always` (5s backoff)
- **Execution Endpoint:** `http://127.0.0.1:8770`

### Unit Definition:
```ini
[Unit]
Description=GhostBridge Home Lab Read-Only Telemetry & Evidence Service
After=network-online.target homeassistant.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/home/rlopez/inneros/inneros_core/workspaces/ghostbridge-kiroween-2026
Environment=PYTHONUNBUFFERED=1
Environment=PYTHONPATH=/home/rlopez/inneros/inneros_core/workspaces/ghostbridge-kiroween-2026
Environment=GHOSTBRIDGE_PRIVATE_DIR=/home/rlopez/GhostBridge-privado
EnvironmentFile=-/home/rlopez/GhostBridge-privado/ha.env
ExecStart=/home/rlopez/inneros/inneros_core/platform/venv/bin/python3 -m ghostbridge.homelab --config /home/rlopez/GhostBridge-privado/homelab.json service --host 127.0.0.1 --port 8770
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

---

## 3. Operational Management

```bash
# Check service status
systemctl --user status ghostbridge-homelab.service

# View live stream logs
journalctl --user -u ghostbridge-homelab.service -f

# Restart service
systemctl --user restart ghostbridge-homelab.service

# Run manual ledger verification
python -m ghostbridge.homelab --config ~/GhostBridge-privado/homelab.json verify
```
