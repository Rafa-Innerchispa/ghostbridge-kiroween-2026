"""
Tests for the read-only stdio MCP server (ghostbridge/mcp_server.py).

Authored by Kiro (Kiroween 2026, feat/kiro-agentic-validation).
Covers the protocol handshake, every tool, input validation, parity with the JavaScript-generated fixture, a real
subprocess round trip over stdio, and the "no network, no files" property of the source.
"""
import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

from ghostbridge import mcp_server as m

ROOT = Path(__file__).resolve().parent.parent
FIXTURE = json.loads((ROOT / "tests" / "forge-parity.json").read_text(encoding="utf-8"))


def call(name, arguments=None, msg_id=1):
    reply = m.handle({"jsonrpc": "2.0", "id": msg_id, "method": "tools/call", "params": {"name": name, "arguments": arguments or {}}})
    result = reply["result"]
    return json.loads(result["content"][0]["text"]), result["isError"]


class ProtocolTests(unittest.TestCase):
    def test_initialize_negotiates_a_supported_version(self):
        r = m.handle({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05"}})["result"]
        self.assertEqual(r["protocolVersion"], "2024-11-05")
        self.assertEqual(r["serverInfo"]["name"], "ghostbridge-evidence")
        self.assertIn("tools", r["capabilities"])
        r = m.handle({"jsonrpc": "2.0", "id": 2, "method": "initialize", "params": {"protocolVersion": "1999-01-01"}})["result"]
        self.assertEqual(r["protocolVersion"], m.SUPPORTED_PROTOCOLS[0])

    def test_notifications_get_no_reply(self):
        self.assertIsNone(m.handle({"jsonrpc": "2.0", "method": "notifications/initialized"}))

    def test_ping_unknown_method_and_bad_requests(self):
        self.assertEqual(m.handle({"jsonrpc": "2.0", "id": 3, "method": "ping"})["result"], {})
        self.assertEqual(m.handle({"jsonrpc": "2.0", "id": 4, "method": "resources/list"})["error"]["code"], -32601)
        self.assertEqual(m.handle([1, 2])["error"]["code"], -32600)
        self.assertEqual(m.handle({"jsonrpc": "1.0", "id": 5, "method": "ping"})["error"]["code"], -32600)
        self.assertEqual(m.handle({"jsonrpc": "2.0", "id": 6, "method": "tools/call", "params": {"name": "rm_rf"}})["error"]["code"], -32602)

    def test_tools_list_is_exactly_four_read_only_tools(self):
        tools = m.handle({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})["result"]["tools"]
        self.assertEqual(sorted(t["name"] for t in tools), ["forge_boundary", "list_scenarios", "run_scenario", "verify_ledger"])
        for t in tools:
            self.assertTrue(t["annotations"]["readOnlyHint"])
            self.assertFalse(t["annotations"]["destructiveHint"])
            self.assertFalse(t["annotations"]["openWorldHint"])
            self.assertFalse(t["inputSchema"]["additionalProperties"])


class ToolTests(unittest.TestCase):
    def test_list_scenarios(self):
        out, err = call("list_scenarios")
        self.assertFalse(err)
        self.assertEqual(sorted(out["scenarios"]), ["denied", "night", "normal"])
        self.assertEqual(out["rule"], {"window_seconds": 300, "door_held_threshold_seconds": 120})

    def test_run_scenario_night_matches_the_engine(self):
        out, err = call("run_scenario", {"name": "night"})
        self.assertFalse(err)
        self.assertEqual(out["event_count"], 5)
        self.assertEqual(len(out["incidents"]), 3)
        self.assertTrue(out["integrity"]["valid"])
        self.assertEqual(len(out["row_hashes"]), 5)
        self.assertEqual(out["cases"], [])

    def test_run_scenario_rejects_unknown_names(self):
        for bad in (None, "", "../night", "Night", 3):
            _, err = call("run_scenario", {"name": bad})
            self.assertTrue(err, bad)

    def test_tamper_demo_is_detected_and_does_not_change_the_clean_result(self):
        clean, _ = call("run_scenario", {"name": "night"})
        out, err = call("run_scenario", {"name": "night", "tamper_seq": 2})
        self.assertFalse(err)
        self.assertEqual(out["row_hashes"], clean["row_hashes"])
        self.assertEqual(out["integrity"], clean["integrity"])
        self.assertEqual(out["tamper_demo"]["verification_after_tamper"], {"valid": False, "checked": 1, "failed_at": 2})
        for bad in (0, 6, "2", True, 2.5):
            _, err = call("run_scenario", {"name": "night", "tamper_seq": bad})
            self.assertTrue(err, bad)

    def test_boundary_299_120_forms_a_case_and_301_119_does_not(self):
        out, err = call("forge_boundary", {"delay_seconds": 299, "hold_seconds": 120})
        self.assertFalse(err)
        self.assertTrue(out["decision"]["case_formed"])
        self.assertEqual(out["decision"]["failed_conditions"], [])
        self.assertEqual(len(out["cases"]), 1)
        self.assertEqual(len(out["cases"][0]["evidence_hashes"]), 2)
        out, err = call("forge_boundary", {"delay_seconds": 301, "hold_seconds": 119})
        self.assertFalse(err)
        self.assertFalse(out["decision"]["case_formed"])
        self.assertEqual(out["cases"], [])
        self.assertEqual(len(out["decision"]["failed_conditions"]), 2)
        self.assertIn("1 s too late", out["decision"]["failed_conditions"][0])
        self.assertIn("1 s short", out["decision"]["failed_conditions"][1])

    def test_single_failed_condition_is_named_exactly(self):
        out, _ = call("forge_boundary", {"delay_seconds": 301, "hold_seconds": 120})
        self.assertEqual(len(out["decision"]["failed_conditions"]), 1)
        self.assertIn("window", out["decision"]["failed_conditions"][0])
        out, _ = call("forge_boundary", {"delay_seconds": 299, "hold_seconds": 119})
        self.assertEqual(len(out["decision"]["failed_conditions"]), 1)
        self.assertIn("threshold", out["decision"]["failed_conditions"][0])
        out, _ = call("forge_boundary", {"delay_seconds": 300, "hold_seconds": 120})
        self.assertTrue(out["decision"]["case_formed"])

    def test_boundary_matches_the_javascript_generated_fixture(self):
        checked = 0
        for entry in FIXTURE["cases"]:
            cfg = entry["config"]
            if cfg["cameraOffline"] or not 1 <= cfg["delaySeconds"] <= 3600:
                continue
            out, err = call("forge_boundary", {"delay_seconds": cfg["delaySeconds"], "hold_seconds": cfg["holdSeconds"]})
            self.assertFalse(err, cfg)
            self.assertEqual(out["row_hashes"], entry["row_hashes"][:3], cfg)
            self.assertEqual([c["id"] for c in out["cases"]], [c["id"] for c in entry["cases"]], cfg)
            self.assertEqual([c["evidence_hashes"] for c in out["cases"]], [c["evidence_hashes"] for c in entry["cases"]], cfg)
            checked += 1
        self.assertGreaterEqual(checked, 40)

    def test_boundary_rejects_bad_arguments(self):
        bad_args = [{}, {"delay_seconds": 0, "hold_seconds": 120}, {"delay_seconds": 3601, "hold_seconds": 120},
                    {"delay_seconds": 300, "hold_seconds": -1}, {"delay_seconds": 300, "hold_seconds": 86401},
                    {"delay_seconds": "300", "hold_seconds": 120}, {"delay_seconds": True, "hold_seconds": 120},
                    {"delay_seconds": 300.5, "hold_seconds": 120}, {"delay_seconds": None, "hold_seconds": 120}]
        for args in bad_args:
            _, err = call("forge_boundary", args)
            self.assertTrue(err, args)

    def test_verify_ledger_accepts_a_clean_chain_and_names_the_first_break(self):
        rows = []
        store, snap = m._ledger(m.scenario("night"))
        try:
            rows = snap["ledger"]
        finally:
            store.close()
        out, err = call("verify_ledger", {"rows": rows})
        self.assertFalse(err)
        self.assertTrue(out["valid"])
        self.assertEqual(out["checked"], 5)
        bad = json.loads(json.dumps(rows))
        bad[3]["payload"]["event"]["at"] = "2026-01-01T00:00:00Z"
        out, _ = call("verify_ledger", {"rows": bad})
        self.assertEqual((out["valid"], out["checked"], out["failed_at"]), (False, 3, 4))
        out, _ = call("verify_ledger", {"rows": [{"nope": 1}]})
        self.assertFalse(out["valid"])
        out, _ = call("verify_ledger", {"rows": []})
        self.assertEqual((out["valid"], out["checked"]), (True, 0))

    def test_verify_ledger_is_bounded(self):
        _, err = call("verify_ledger", {"rows": [{}] * (m.MAX_LEDGER_ROWS + 1)})
        self.assertTrue(err)
        _, err = call("verify_ledger", {"rows": "not a list"})
        self.assertTrue(err)


class TransportTests(unittest.TestCase):
    def test_real_subprocess_round_trip_over_stdio(self):
        requests = [
            {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "test", "version": "0"}}},
            {"jsonrpc": "2.0", "method": "notifications/initialized"},
            {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
            {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "forge_boundary", "arguments": {"delay_seconds": 301, "hold_seconds": 119}}},
        ]
        proc = subprocess.run([sys.executable, "-m", "ghostbridge.mcp_server"], cwd=ROOT, input="\n".join(json.dumps(r) for r in requests) + "\nnot json\n",
                              capture_output=True, text=True, timeout=30)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        replies = [json.loads(line) for line in proc.stdout.splitlines()]
        self.assertEqual([r.get("id") for r in replies], [1, 2, 3, None])  # no reply to the notification; parse error last
        self.assertEqual(replies[0]["result"]["protocolVersion"], "2025-06-18")
        self.assertEqual(len(replies[1]["result"]["tools"]), 4)
        self.assertFalse(json.loads(replies[2]["result"]["content"][0]["text"])["decision"]["case_formed"])
        self.assertEqual(replies[3]["error"]["code"], -32700)
        self.assertIn("ready", proc.stderr)  # logs go to stderr, never to the protocol stream

    def test_source_has_no_network_or_file_access(self):
        src = (ROOT / "ghostbridge" / "mcp_server.py").read_text(encoding="utf-8")
        code = re.sub(r'""".*?"""', "", src, flags=re.S)
        for forbidden in (r"\bimport\s+(socket|http|urllib|requests|ssl|ftplib|smtplib|subprocess|os|shutil|pathlib)\b",
                          r"\bfrom\s+(socket|http|urllib|requests|ssl|subprocess|os|shutil|pathlib)\b",
                          r"\bopen\s*\(", r"\beval\s*\(", r"\bexec\s*\(", r"__import__"):
            self.assertIsNone(re.search(forbidden, code), forbidden)


class ConfigTests(unittest.TestCase):
    def test_proposed_kiro_config_is_local_read_only_and_credential_free(self):
        cfg = json.loads((ROOT / ".kiro" / "mcp" / "ghostbridge-evidence.mcp.json").read_text(encoding="utf-8"))
        server = cfg["mcpServers"]["ghostbridge-evidence"]
        self.assertEqual((server["command"], server["args"]), ("python", ["-m", "ghostbridge.mcp_server"]))
        self.assertNotIn("url", server)
        self.assertEqual(set(server["autoApprove"]), set(m.TOOLS))  # approved tools == the four read-only tools, nothing else
        self.assertFalse(server["disabled"])
        text = json.dumps(cfg).lower()
        for word in ("token", "secret", "password", "api_key", "authorization", "http"):
            self.assertNotIn(word, text)


if __name__ == "__main__":
    unittest.main()
