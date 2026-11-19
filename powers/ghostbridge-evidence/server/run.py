"""
Entry point of the GhostBridge Evidence Power's MCP server (stdio, read-only, synthetic data only).

The engine modules next to this file are verbatim copies of the repository's ghostbridge/ package (kept in sync by
tools/sync_power.py and checked by tests/test_power.py), so the Power works wherever Kiro installs it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ghostbridge.mcp_server import SERVER_NAME, SERVER_VERSION, serve  # noqa: E402

if __name__ == "__main__":
    print(f"{SERVER_NAME} {SERVER_VERSION} ready (GhostBridge Evidence Power, stdio, read-only, synthetic)", file=sys.stderr)
    serve()
