"""
GhostBridge Evidence Power: manifest shape, self-contained server, and a real stdio round trip from a copy of the Power folder.

Authored by Kiro's main session (Kiroween 2026, feat/kiro-verifiable-evidence).
Manifest rules are taken from the Agent Plugins 1.0.0 schemas (plugin.schema.json and mcp.schema.json).
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POWER = ROOT / "powers" / "ghostbridge-evidence"
MODULES = ("__init__.py", "core.py", "correlator.py", "engine.py", "simulator.py", "storage.py", "mcp_server.py")
PLUGIN_KEYS = {"$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"}


class PowerManifestTests(unittest.TestCase):
    def test_plugin_json_follows_the_agent_plugins_schema(self):
        p = json.loads((POWER / "plugin.json").read_text(encoding="utf-8"))
        self.assertEqual(p["$schema"], "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json")
        self.assertTrue(set(p) <= PLUGIN_KEYS, set(p) - PLUGIN_KEYS)
        self.assertRegex(p["name"], r"^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$")
        self.assertLessEqual(len(p["name"]), 64)
        self.assertTrue(set(p["author"]) <= {"name", "email", "url"})
        self.assertEqual(p["author"]["email"], "info@innerchispa.us")
        self.assertTrue(all(isinstance(k, str) for k in p["keywords"]))
        self.assertEqual(p["license"], "MIT")

    def test_mcp_json_is_one_local_stdio_server_rooted_in_the_power(self):
        m = json.loads((POWER / "mcp.json").read_text(encoding="utf-8"))
        self.assertEqual(m["$schema"], "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json")
        self.assertEqual(set(m), {"$schema", "mcpServers"})
        self.assertEqual(len(m["mcpServers"]), 1)
        s = next(iter(m["mcpServers"].values()))
        self.assertTrue(set(s) <= {"type", "command", "args", "env", "cwd"})
        self.assertEqual(s["type"], "stdio")
        self.assertRegex(s["cwd"], r"^(?:\./|\$\{PLUGIN_ROOT\}(?:/|$)|\$\{PLUGIN_DATA\}(?:/|$))")
        self.assertTrue((POWER / s["cwd"] / s["args"][0]).is_file())
        text = json.dumps(m).lower()
        for word in ("token", "secret", "password", "api_key", "http://", "https://localhost"):
            self.assertNotIn(word, text)
        self.assertFalse(set(s.get("env", {})) & {"PLUGIN_ROOT", "PLUGIN_DATA"})

    def test_skills_have_front_matter_with_name_and_description(self):
        skills = sorted((POWER / "skills").glob("*/SKILL.md"))
        self.assertGreaterEqual(len(skills), 2)
        for f in skills:
            text = f.read_text(encoding="utf-8")
            m = re.match(r"^---\nname: ([a-z0-9-]+)\ndescription: (.+?)\n---\n", text.replace("\r\n", "\n"), re.S)
            self.assertIsNotNone(m, f.name)
            self.assertEqual(m.group(1), f.parent.name)
            self.assertIn("rows_json" if f.parent.name == "audit-evidence" else "forge_boundary", text)

    def test_bundled_engine_is_a_verbatim_copy_of_the_repository_engine(self):
        for name in MODULES:
            self.assertEqual((POWER / "server" / "ghostbridge" / name).read_bytes(), (ROOT / "ghostbridge" / name).read_bytes(),
                             f"{name} drifted: run python tools/sync_power.py")


class PowerServerTests(unittest.TestCase):
    def test_server_runs_from_a_copy_of_the_power_folder_without_the_repository(self):
        with tempfile.TemporaryDirectory() as d:
            copy = Path(d) / "installed-power"
            shutil.copytree(POWER, copy, ignore=shutil.ignore_patterns("__pycache__"))
            m = json.loads((copy / "mcp.json").read_text(encoding="utf-8"))
            s = m["mcpServers"]["evidence"]
            env = {k: v for k, v in os.environ.items() if k != "PYTHONPATH"}
            env.update(s.get("env", {}))
            reqs = [
                {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "t", "version": "0"}}},
                {"jsonrpc": "2.0", "method": "notifications/initialized"},
                {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
                {"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "forge_boundary", "arguments": {"delay_seconds": 299, "hold_seconds": 120}}},
            ]
            p = subprocess.run([sys.executable, *s["args"]], cwd=copy / s["cwd"], env=env, input="\n".join(map(json.dumps, reqs)) + "\n",
                               capture_output=True, text=True, timeout=30)
            self.assertEqual(p.returncode, 0, p.stderr)
            self.assertIn("Evidence Power", p.stderr)
            replies = [json.loads(line) for line in p.stdout.splitlines()]
            self.assertEqual(sorted(t["name"] for t in replies[1]["result"]["tools"]), ["forge_boundary", "list_scenarios", "run_scenario", "verify_ledger"])
            out = json.loads(replies[2]["result"]["content"][0]["text"])
            self.assertEqual(out["cases"][0]["id"], "case:cfd83deb8d3af576")


if __name__ == "__main__":
    unittest.main()
