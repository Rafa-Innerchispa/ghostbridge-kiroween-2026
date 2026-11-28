# GhostBridge Home Lab — Kiro Handoff & Presentation Guide

## 1. Executive Summary

This handoff packages the work performed to migrate GhostBridge Home Lab into a fully operational, permanent InnerOS background service running on Linux infrastructure.

The dependency on external Windows machines has been completely eliminated. Home Assistant sensor signals are ingested into a cryptographically sealed SHA-256 ledger, deriving verified incident cases that can be independently audited.

---

## 2. Key Accomplishments

1. **Autonomous Service Deployment:**
   - Runs as `ghostbridge-homelab.service` under systemd.
   - Operates a high-performance, read-only FastAPI interface on loopback (`127.0.0.1:8770`).
2. **Verified Incident Derivation:**
   - 120 cryptographically chained event blocks in active ledger (`homelab.sqlite3`).
   - Incident cases derived with zero false positives on verified hardware faults.
3. **Automated Cryptographic Backup:**
   - `ghostbridge-homelab-backup.timer` validates ledger integrity prior to snapshot generation.
   - Snapshots include SHA-256 sidecar checksums and a rolling 14-day retention cycle.
4. **Complete Privacy Guard:**
   - Real customer telemetry, credentials, and network topologies live strictly in `~/GhostBridge-privado/`.
   - 100% compliance with repo privacy tests.
5. **Full Test Parity:**
   - 29/29 homelab unit tests pass; 233/233 repository tests pass.

---

## 3. How to Present the Live Evidence in Demos / Videos

When demonstrating the GhostBridge Home Lab for the Kiroween submission:

1. **Show the Live Health & Verification Endpoint:**
   ```bash
   curl -s http://127.0.0.1:8770/api/ghostbridge/health | jq
   ```
   *Demonstrates:* Service is alive, connected to Home Assistant in read-only mode, and the SHA-256 ledger hash chain is 100% valid.

2. **Inspect Derived Incidents & Cryptographic Proof:**
   ```bash
   curl -s http://127.0.0.1:8770/api/ghostbridge/incidents | jq
   ```
   *Demonstrates:* Real incidents (e.g. `open-outside-schedule`, `sensor-suspect`) derived from authentic sensor transitions.

3. **Verify a Tamper-Proof Receipt:**
   ```bash
   curl -s http://127.0.0.1:8770/api/ghostbridge/receipts/<case_id> | jq
   ```
   *Demonstrates:* The independent Merkle receipt proves that the incident record cannot be modified or forged without breaking the hash chain.

4. **Verify Ledger with Independent Verifier CLI:**
   ```bash
   python docs/verify/verify_evidence.py ~/GhostBridge-privado/homelab_evidence.json
   ```
   *Demonstrates:* Completely independent verification tool (with zero GhostBridge imports) confirming 120 valid blocks.
