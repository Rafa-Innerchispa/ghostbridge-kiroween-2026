# GhostBridge Home Lab — Backup & Disaster Recovery Runbook

## 1. Overview

GhostBridge Home Lab persists its tamper-evident incident log in an append-only SQLite ledger using SHA-256 hash chaining.
Because every row's cryptographic digest depends on its predecessor, preserving database file integrity is vital.

This runbook documents:
1. Automated daily backup architecture.
2. Verification of backup snapshots.
3. Disaster recovery and restore procedures.

---

## 2. Automated Backup Strategy

The backup routine is executed daily at 04:00 UTC via a systemd user timer (`ghostbridge-homelab-backup.timer`):

- **Script:** `~/GhostBridge-privado/backup_homelab_ledger.sh`
- **Backup Directory:** `~/GhostBridge-privado/backups/`
- **Snapshot Format:** `homelab_YYYYMMDDTHHMMSSZ.sqlite3`
- **Integrity File:** `homelab_YYYYMMDDTHHMMSSZ.sqlite3.sha256`
- **Pre-backup Validation:** Runs `python -m ghostbridge.homelab verify` before backing up. If the active ledger is corrupted, backup aborts to avoid overwriting good archives.
- **Retention:** Rolling 14-day window; archives older than 14 days are automatically pruned.

---

## 3. Disaster Recovery Procedure

In case of disk corruption or accidental deletion:

### Step 1: Stop Service
```bash
systemctl --user stop ghostbridge-homelab.service
```

### Step 2: Identify Latest Valid Snapshot
```bash
cd ~/GhostBridge-privado/backups
ls -lt homelab_*.sqlite3 | head -n 5
```

### Step 3: Verify Checksum
```bash
sha256sum -c homelab_YYYYMMDDTHHMMSSZ.sqlite3.sha256
```

### Step 4: Restore Database
```bash
cp homelab_YYYYMMDDTHHMMSSZ.sqlite3 ~/GhostBridge-privado/homelab.sqlite3
```

### Step 5: Test Cryptographic Ledger Integrity
```bash
python -m ghostbridge.homelab --config ~/GhostBridge-privado/homelab.json verify
```

### Step 6: Restart Daemon
```bash
systemctl --user start ghostbridge-homelab.service
systemctl --user status ghostbridge-homelab.service
```
