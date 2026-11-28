"""GhostBridge Home Lab - Private Read-Only Service.
Exposes cryptographic evidence, sensor status, and incidents strictly to localhost/private network.
All operations are read-only: no writes to Home Assistant, no alarm control, no token leakage.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import os
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse

from .config import load_config
from .ha_client import HAClient
from .ledger import open_store
from .rules import derive_cases

app = FastAPI(
    title="GhostBridge Private Home Lab Service",
    description="Read-only private API for Home Assistant sensor telemetry, SHA-256 evidence, and incident verification.",
    version="1.0.0",
)

_cfg: Optional[Dict[str, Any]] = None
_store: Optional[Any] = None


def get_cfg_and_store():
    global _cfg, _store
    if _cfg is None or _store is None:
        _cfg = load_config()
        _store = open_store(_cfg)
    return _cfg, _store


@app.get("/api/ghostbridge/health")
def get_health() -> Dict[str, Any]:
    cfg, store = get_cfg_and_store()
    integrity = store.verify()
    
    ha_ok = False
    ha_url = os.environ.get("GHOSTBRIDGE_HA_URL", "http://localhost:8123")
    try:
        client = HAClient(url=ha_url, timeout=3)
        ha_res = client.ping()
        ha_ok = ha_res.get("message") == "API running."
    except Exception:
        ha_ok = False

    return {
        "status": "ok",
        "service": "ghostbridge-homelab-private",
        "node": os.environ.get("GHOSTBRIDGE_NODE_ID", "intel-homelab-primary"),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "ledger": {
            "valid": integrity.get("valid", False),
            "checked": integrity.get("checked", 0),
            "head": integrity.get("head"),
        },
        "ha_connection": {
            "url": ha_url,
            "connected": ha_ok,
            "read_only": True,
        },
    }


@app.get("/api/ghostbridge/sensors")
def get_sensors() -> List[Dict[str, Any]]:
    cfg, store = get_cfg_and_store()
    zones = cfg.get("zones", {})
    
    live_states: Dict[str, Any] = {}
    try:
        client = HAClient(timeout=3)
        for st in client.snapshot(list(zones.keys())):
            live_states[st["entity_id"]] = st
    except Exception:
        pass

    results = []
    for entity_id, zone in zones.items():
        st = live_states.get(entity_id, {})
        results.append({
            "entity_id": entity_id,
            "id": zone.get("id"),
            "name": zone.get("name", zone.get("id")),
            "kind": zone.get("kind"),
            "expected_open": zone.get("expected_open", []),
            "stuck_after_hours": zone.get("stuck_after_hours"),
            "live_state": st.get("state", "unknown"),
            "last_changed": st.get("last_changed"),
        })
    return results


@app.get("/api/ghostbridge/events")
def get_events(limit: int = Query(default=100, ge=1, le=1000)) -> List[Dict[str, Any]]:
    cfg, store = get_cfg_and_store()
    rows = store.rows()
    # return the latest rows within limit
    return rows[-limit:]


@app.get("/api/ghostbridge/incidents")
def get_incidents() -> List[Dict[str, Any]]:
    cfg, store = get_cfg_and_store()
    rows = store.rows()
    cases = derive_cases(rows, cfg)
    return cases


@app.get("/api/ghostbridge/evidence/{case_id}")
def get_evidence(case_id: str) -> Dict[str, Any]:
    cfg, store = get_cfg_and_store()
    rows = store.rows()
    cases = derive_cases(rows, cfg)
    
    target_case = next((c for c in cases if c.get("id") == case_id), None)
    if not target_case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        
    evidence_hashes = set(target_case.get("evidence_hashes", []))
    event_ids = set(target_case.get("event_ids", []))
    
    matching_rows = [
        r for r in rows
        if r.get("hash") in evidence_hashes or (r.get("payload", {}).get("event", {}).get("id") in event_ids)
    ]
    
    return {
        "case": target_case,
        "matching_rows": matching_rows,
        "ledger_head": store.verify().get("head"),
        "cryptographic_proof": {
            "algorithm": "SHA-256",
            "chain_valid": store.verify().get("valid", False),
            "evidence_count": len(matching_rows),
        },
    }


@app.get("/api/ghostbridge/receipts/{receipt_id}")
def get_receipt(receipt_id: str) -> Dict[str, Any]:
    cfg, store = get_cfg_and_store()
    rows = store.rows()
    cases = derive_cases(rows, cfg)
    
    # Check if receipt_id matches a case_id
    target_case = next((c for c in cases if c.get("id") == receipt_id), None)
    if target_case:
        receipt_hash = hashlib.sha256(
            f"{target_case['id']}|{target_case['at']}|{','.join(target_case['evidence_hashes'])}".encode()
        ).hexdigest()
        return {
            "receipt_id": receipt_id,
            "type": "incident_case_receipt",
            "hash": receipt_hash,
            "status": "VERIFIED",
            "case": target_case,
            "timestamp": target_case.get("at"),
            "ledger_head": store.verify().get("head"),
        }
        
    # Check if receipt_id matches a row hash
    target_row = next((r for r in rows if r.get("hash") == receipt_id), None)
    if target_row:
        return {
            "receipt_id": receipt_id,
            "type": "event_ledger_receipt",
            "hash": target_row.get("hash"),
            "seq": target_row.get("seq"),
            "status": "VERIFIED",
            "event": target_row.get("payload", {}).get("event"),
            "prev_hash": target_row.get("prev_hash"),
            "at": target_row.get("payload", {}).get("event", {}).get("at"),
        }
        
    raise HTTPException(status_code=404, detail=f"Receipt {receipt_id} not found in cases or ledger")
