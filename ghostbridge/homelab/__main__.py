"""python -m ghostbridge.homelab <command>. One-shot commands only: nothing runs in the background."""
import argparse
import csv
import json
import sys

from .config import assert_private, load_config
from .ha_client import HAClient, SafetyError
from .importer import build_events, read_rows
from .ledger import export_evidence, load_events, open_store
from .rules import derive_cases


def _print(value):
    print(json.dumps(value, indent=2, ensure_ascii=False))


def main(argv=None):
    parser = argparse.ArgumentParser(prog="ghostbridge.homelab")
    parser.add_argument("--config", help="path to homelab.json (outside the repo)")
    sub = parser.add_subparsers(dest="cmd", required=True)
    imp = sub.add_parser("import", help="import a Home Assistant history CSV into the private ledger")
    imp.add_argument("csv")
    sub.add_parser("verify", help="check the private ledger hash chain")
    sub.add_parser("cases", help="list derived cases")
    exp = sub.add_parser("export", help="write ledger + cases JSON for verify_evidence.py")
    exp.add_argument("out")
    sub.add_parser("ha-ping", help="task 1: check the connection (read only)")
    sub.add_parser("ha-snapshot", help="task 2: current state of the configured zones (read only)")
    hist = sub.add_parser("ha-history", help="task 3: download zone history as CSV (read only)")
    hist.add_argument("--since", required=True, help="UTC ISO time, e.g. 2026-11-25T14:45:00Z")
    hist.add_argument("--out", required=True)
    note = sub.add_parser("ha-notify", help="task 4: show a message in the HA sidebar (dry run unless --confirm)")
    note.add_argument("--message", required=True)
    note.add_argument("--confirm", action="store_true")
    args = parser.parse_args(argv)
    try:
        cfg = load_config(args.config)
        entities = list(cfg["zones"])
        if args.cmd == "import":
            events, stats = build_events(read_rows(args.csv), cfg["zones"])
            store = open_store(cfg)
            added, present = load_events(store, events)
            _print({"added": added, "already_present": present, "stats": stats, "ledger": store.verify()})
        elif args.cmd in ("verify", "cases", "export"):
            store = open_store(cfg)
            if args.cmd == "verify":
                _print(store.verify())
            elif args.cmd == "cases":
                _print(derive_cases(store.rows(), cfg))
            else:
                _print(export_evidence(store, cfg, args.out))
        else:
            client = HAClient()
            if args.cmd == "ha-ping":
                _print(client.ping())
            elif args.cmd == "ha-snapshot":
                _print(client.snapshot(entities))
            elif args.cmd == "ha-history":
                rows = client.history(entities, args.since)
                with open(assert_private(args.out), "w", newline="", encoding="utf-8") as handle:
                    writer = csv.DictWriter(handle, fieldnames=["entity_id", "state", "last_changed"])
                    writer.writeheader()
                    writer.writerows(rows)
                _print({"rows": len(rows), "out": args.out})
            elif args.cmd == "ha-notify":
                _print(client.notify("GhostBridge", args.message, confirm=args.confirm))
    except (SafetyError, ValueError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
