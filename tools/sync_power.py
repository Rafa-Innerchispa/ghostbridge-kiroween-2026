"""
Copy the GhostBridge engine modules the evidence MCP server needs into the Evidence Power, so the Power is self-contained.

Authored by Kiro's main session (Kiroween 2026, feat/kiro-verifiable-evidence).
Run after changing any of the listed modules:  python tools/sync_power.py
tests/test_power.py fails if the copies drift from the sources.
"""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "ghostbridge"
TARGET = ROOT / "powers" / "ghostbridge-evidence" / "server" / "ghostbridge"
MODULES = ("__init__.py", "core.py", "correlator.py", "engine.py", "simulator.py", "storage.py", "mcp_server.py")


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    for name in MODULES:
        shutil.copyfile(SOURCE / name, TARGET / name)
        print(f"copied ghostbridge/{name}")


if __name__ == "__main__":
    main()
