"""
Minimal MCP client that drives ghostbridge/mcp_server.py over a real stdio subprocess and records the transcript.

Authored by Kiro (Kiroween 2026, feat/kiro-agentic-validation).
Run: python tests/mcp_demo_client.py [output.jsonl]
It speaks the protocol the same way an IDE does (initialize, initialized, tools/list, tools/call) so the server can be
demonstrated and reviewed without any network access, credentials or device. Writes a JSON Lines transcript, one
request or response per line, with a timestamp and direction.
"""
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs" / "evidence" / "agentic-validation" / "mcp-transcript.jsonl"


def main() -> int:
    proc = subprocess.Popen([sys.executable, "-m", "ghostbridge.mcp_server"], cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True, encoding="utf-8")
    log = []

    def stamp(direction, message):
        log.append({"at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z", "dir": direction, "message": message})

    def send(message):
        stamp("client->server", message)
        proc.stdin.write(json.dumps(message) + "\n")
        proc.stdin.flush()
        if "id" not in message:
            return None
        reply = json.loads(proc.stdout.readline())
        stamp("server->client", reply)
        return reply

    def tool(msg_id, tool_name, **arguments):
        reply = send({"jsonrpc": "2.0", "id": msg_id, "method": "tools/call", "params": {"name": tool_name, "arguments": arguments}})
        return json.loads(reply["result"]["content"][0]["text"]), reply["result"]["isError"]

    failures = []

    def expect(label, ok):
        print(("PASS " if ok else "FAIL ") + label)
        if not ok:
            failures.append(label)

    try:
        init = send({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "ghostbridge-demo-client", "version": "1"}}})
        send({"jsonrpc": "2.0", "method": "notifications/initialized"})
        expect("initialize returns server ghostbridge-evidence", init["result"]["serverInfo"]["name"] == "ghostbridge-evidence")
        tools = send({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})["result"]["tools"]
        expect("tools/list returns 4 read-only tools", len(tools) == 4 and all(t["annotations"]["readOnlyHint"] for t in tools))
        a, err = tool(3, "forge_boundary", delay_seconds=299, hold_seconds=120)
        expect("299/120 forms exactly one case with two evidence hashes", not err and a["decision"]["case_formed"] and len(a["cases"]) == 1 and len(a["cases"][0]["evidence_hashes"]) == 2)
        b, err = tool(4, "forge_boundary", delay_seconds=301, hold_seconds=119)
        expect("301/119 forms no case and names both failed conditions", not err and not b["decision"]["case_formed"] and len(b["decision"]["failed_conditions"]) == 2)
        n, err = tool(5, "run_scenario", name="night", tamper_seq=2)
        expect("night scenario verifies clean, tampered copy is detected at position 2", not err and n["integrity"]["valid"] and n["tamper_demo"]["verification_after_tamper"]["failed_at"] == 2)
        v, err = tool(6, "verify_ledger", rows="not a list")
        expect("invalid input is refused with isError", err is True)
    finally:
        proc.stdin.close()
        proc.wait(timeout=10)
        stderr = proc.stderr.read()
    expect("server exits cleanly on stdin close", proc.returncode == 0)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(json.dumps(x) for x in log) + "\n", encoding="utf-8")
    print(f"server stderr: {stderr.strip()}")
    print(f"transcript: {len(log)} messages -> {OUT}")
    print(f"{'ALL PASS' if not failures else 'FAILED: ' + str(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
