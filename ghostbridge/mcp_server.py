"""
GhostBridge evidence MCP server (stdio, read-only, synthetic data only).

Authored by Kiro (Kiroween 2026, feat/kiro-agentic-validation).

A Model Context Protocol server that lets an AI client (Kiro) ask GhostBridge questions and get answers computed by the
real Python engine, correlator and SHA-256 ledger: run a synthetic scenario, test the 299/120 and 301/119 boundary of the
denied-then-held-open rule, or verify a ledger for tampering.

Safety properties (each one is covered by tests/test_mcp_server.py):
  - Transport is stdio only. It opens no socket, makes no network request and never reads or writes a file.
  - Every ledger lives in memory (sqlite ``:memory:``) and is discarded after the call.
  - All inputs are validated and bounded. Devices and events are the fixed synthetic ones from ghostbridge.core.
  - No tool changes state outside the process. There is no tool that sends a command to a device.

Run: ``python -m ghostbridge.mcp_server`` (protocol: newline-delimited JSON-RPC 2.0 on stdin/stdout, logs on stderr).
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone

from .core import DEVICES, digest
from .correlator import DOOR_HELD_THRESHOLD, WINDOW_SECONDS, correlate
from .engine import Engine
from .simulator import scenario
from .storage import Store

SERVER_NAME = "ghostbridge-evidence"
SERVER_VERSION = "0.1.0"
SUPPORTED_PROTOCOLS = ("2025-06-18", "2025-03-26", "2024-11-05")
SCENARIOS = ("night", "normal", "denied")
MAX_LEDGER_ROWS = 500
FORGE_ANCHOR_UTC = "2026-11-08T22:00:30Z"  # same anchor as docs/signal_forge.mjs


class ToolError(Exception):
    """Invalid arguments or a refused request. Returned to the client as an isError tool result."""


# ---------------------------------------------------------------- pure helpers


def _ledger(events: list[dict]) -> tuple[Store, dict]:
    store = Store(":memory:")
    engine = Engine(store)
    for event in events:
        engine.ingest(event)
    return store, engine.snapshot()


def _summary(snapshot: dict) -> dict:
    rows = snapshot["ledger"]
    cases = correlate(rows)
    return {
        "mode": snapshot["mode"],
        "event_count": len(snapshot["events"]),
        "incidents": snapshot["incidents"],
        "cases": cases,
        "integrity": snapshot["integrity"],
        "row_hashes": [r["hash"] for r in rows],
    }


def _int(args: dict, key: str, lo: int, hi: int) -> int:
    value = args.get(key)
    if isinstance(value, bool) or not isinstance(value, int):
        raise ToolError(f"{key} must be an integer from {lo} to {hi}")
    if not lo <= value <= hi:
        raise ToolError(f"{key} must be an integer from {lo} to {hi}")
    return value


def verify_rows(rows: object) -> dict:
    """Check a SHA-256 hash chain exactly like Store.verify(), but over rows supplied by the caller."""
    if not isinstance(rows, list) or len(rows) > MAX_LEDGER_ROWS:
        raise ToolError(f"rows must be a list of at most {MAX_LEDGER_ROWS} ledger rows")
    previous = "0" * 64
    for seq, row in enumerate(rows, 1):
        try:
            if row["seq"] != seq or row["previous"] != previous or row["hash"] != digest(previous, row["payload"]):
                return {"valid": False, "checked": seq - 1, "failed_at": seq}
            previous = row["hash"]
        except (KeyError, TypeError, ValueError):
            return {"valid": False, "checked": seq - 1, "failed_at": seq, "error": "malformed row"}
    return {"valid": True, "checked": len(rows), "head": previous}


# ---------------------------------------------------------------- tools


def tool_list_scenarios(_args: dict) -> dict:
    return {
        "scenarios": {name: scenario(name) for name in SCENARIOS},
        "devices": DEVICES,
        "rule": {"window_seconds": WINDOW_SECONDS, "door_held_threshold_seconds": DOOR_HELD_THRESHOLD},
        "note": "Synthetic data only. No real devices.",
    }


def tool_run_scenario(args: dict) -> dict:
    name = args.get("name")
    if name not in SCENARIOS:
        raise ToolError("name must be one of: " + ", ".join(SCENARIOS))
    store, snapshot = _ledger(scenario(name))
    try:
        out = _summary(snapshot)
        out["scenario"] = name
        tamper = args.get("tamper_seq")
        if tamper is not None:
            seq = _int(args, "tamper_seq", 1, len(snapshot["ledger"]))
            rows = json.loads(json.dumps(snapshot["ledger"]))  # deep copy; the in-memory ledger is never changed
            rows[seq - 1]["payload"]["event"]["at"] = "2026-01-01T00:00:00Z"
            out["tamper_demo"] = {"altered_seq": seq, "altered_field": "event.at", "verification_after_tamper": verify_rows(rows)}
        return out
    finally:
        store.close()


def tool_forge_boundary(args: dict) -> dict:
    delay = _int(args, "delay_seconds", 1, 3600)
    hold = _int(args, "hold_seconds", 0, 86400)
    anchor = datetime.strptime(FORGE_ANCHOR_UTC, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    stamp = lambda dt: dt.strftime("%Y-%m-%dT%H:%M:%SZ")  # noqa: E731
    events = [
        {"id": "forge:earlier-door", "device": "door-01", "type": "door.open", "at": stamp(anchor - timedelta(seconds=30)), "data": {"duration_seconds": 185}},
        {"id": "forge:denied", "device": "reader-01", "type": "access.denied", "at": FORGE_ANCHOR_UTC, "data": {}},
        {"id": "forge:later-door", "device": "door-01", "type": "door.open", "at": stamp(anchor + timedelta(seconds=delay)), "data": {"duration_seconds": hold}},
    ]
    store, snapshot = _ledger(events)
    try:
        out = _summary(snapshot)
        out["config"] = {"delay_seconds": delay, "hold_seconds": hold}
        reasons = []
        if delay > WINDOW_SECONDS:
            reasons.append(f"the door opened {delay} s after the denial; the window is {WINDOW_SECONDS} s ({delay - WINDOW_SECONDS} s too late)")
        if hold < DOOR_HELD_THRESHOLD:
            reasons.append(f"the door was held {hold} s; the threshold is {DOOR_HELD_THRESHOLD} s ({DOOR_HELD_THRESHOLD - hold} s short)")
        out["decision"] = {"case_formed": bool(out["cases"]), "failed_conditions": reasons}
        if bool(out["cases"]) == bool(reasons):
            raise ToolError("internal consistency check failed between correlator and explanation")
        return out
    finally:
        store.close()


def tool_verify_ledger(args: dict) -> dict:
    return verify_rows(args.get("rows"))


TOOLS = {
    "list_scenarios": {
        "fn": tool_list_scenarios,
        "description": "List GhostBridge's synthetic scenarios (night, normal, denied), the synthetic devices and the correlation rule limits. Read-only.",
        "inputSchema": {"type": "object", "properties": {}, "additionalProperties": False},
    },
    "run_scenario": {
        "fn": tool_run_scenario,
        "description": "Run a synthetic scenario through the real Python engine in an in-memory ledger and return incidents, correlated cases, SHA-256 row hashes and integrity. Optionally alter one event (tamper_seq) in a copy to show tamper detection. Read-only; nothing is stored.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "enum": list(SCENARIOS)},
                "tamper_seq": {"type": "integer", "minimum": 1, "description": "1-based ledger position to alter in a copy before verifying"},
            },
            "required": ["name"],
            "additionalProperties": False,
        },
    },
    "forge_boundary": {
        "fn": tool_forge_boundary,
        "description": "Ask whether a denied access followed by a door held open forms a case, for a chosen delay after the denial and hold time. 299/120 forms a case; 301/119 does not. Returns the case and evidence hashes, or the exact failed condition.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "delay_seconds": {"type": "integer", "minimum": 1, "maximum": 3600},
                "hold_seconds": {"type": "integer", "minimum": 0, "maximum": 86400},
            },
            "required": ["delay_seconds", "hold_seconds"],
            "additionalProperties": False,
        },
    },
    "verify_ledger": {
        "fn": tool_verify_ledger,
        "description": "Verify a SHA-256 hash chain of ledger rows (seq, payload, previous, hash), as produced by run_scenario or the GhostBridge export. Returns valid or the first failing position. At most 500 rows.",
        "inputSchema": {
            "type": "object",
            "properties": {"rows": {"type": "array", "maxItems": MAX_LEDGER_ROWS, "items": {"type": "object"}}},
            "required": ["rows"],
            "additionalProperties": False,
        },
    },
}


# ---------------------------------------------------------------- JSON-RPC


def _result(msg_id, result):
    return {"jsonrpc": "2.0", "id": msg_id, "result": result}


def _error(msg_id, code, message):
    return {"jsonrpc": "2.0", "id": msg_id, "error": {"code": code, "message": message}}


def handle(message: object) -> dict | None:
    """Handle one JSON-RPC message. Returns the response, or None for notifications."""
    if not isinstance(message, dict) or message.get("jsonrpc") != "2.0" or not isinstance(message.get("method"), str):
        return _error(message.get("id") if isinstance(message, dict) else None, -32600, "Invalid Request")
    method, msg_id, params = message["method"], message.get("id"), message.get("params") or {}
    is_notification = "id" not in message
    if not isinstance(params, dict):
        return None if is_notification else _error(msg_id, -32602, "params must be an object")
    if method == "initialize":
        wanted = params.get("protocolVersion")
        version = wanted if wanted in SUPPORTED_PROTOCOLS else SUPPORTED_PROTOCOLS[0]
        return _result(msg_id, {
            "protocolVersion": version,
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {"name": SERVER_NAME, "version": SERVER_VERSION},
            "instructions": "Read-only synthetic GhostBridge evidence tools. No real devices, no network.",
        })
    if is_notification:
        return None  # notifications/initialized, notifications/cancelled, ...
    if method == "ping":
        return _result(msg_id, {})
    if method == "tools/list":
        return _result(msg_id, {"tools": [
            {"name": n, "description": t["description"], "inputSchema": t["inputSchema"], "annotations": {"readOnlyHint": True, "openWorldHint": False, "destructiveHint": False}}
            for n, t in TOOLS.items()]})
    if method == "tools/call":
        tool = TOOLS.get(params.get("name"))
        if tool is None:
            return _error(msg_id, -32602, "Unknown tool")
        arguments = params.get("arguments") or {}
        if not isinstance(arguments, dict):
            return _error(msg_id, -32602, "arguments must be an object")
        try:
            payload, is_error = tool["fn"](arguments), False
        except ToolError as exc:
            payload, is_error = {"error": str(exc)}, True
        return _result(msg_id, {"content": [{"type": "text", "text": json.dumps(payload, indent=2, sort_keys=True)}], "isError": is_error})
    return _error(msg_id, -32601, "Method not found")


def serve(stdin=None, stdout=None) -> None:
    stdin, stdout = stdin or sys.stdin, stdout or sys.stdout
    for line in stdin:
        line = line.strip()
        if not line:
            continue
        try:
            response = handle(json.loads(line))
        except json.JSONDecodeError:
            response = _error(None, -32700, "Parse error")
        except Exception as exc:  # never crash the transport on a bad request
            print(f"{SERVER_NAME}: internal error: {type(exc).__name__}", file=sys.stderr)
            response = _error(None, -32603, "Internal error")
        if response is not None:
            stdout.write(json.dumps(response, separators=(",", ":")) + "\n")
            stdout.flush()


if __name__ == "__main__":
    print(f"{SERVER_NAME} {SERVER_VERSION} ready (stdio, read-only, synthetic)", file=sys.stderr)
    serve()
