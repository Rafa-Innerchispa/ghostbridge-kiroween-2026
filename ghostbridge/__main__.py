"""
GhostBridge local synthetic lab — CLI entry point.

Usage:
  Start the web server:
      python -m ghostbridge [--database PATH] [--port PORT]

  Ingest a legacy relay CSV file:
      python -m ghostbridge ingest-relay FIXTURE.csv [--database PATH]
"""
import argparse
import sys
from .engine import Engine
from .storage import Store
from .server import make_server
from .adapters.relay_csv import parse_relay_csv

# --------------------------------------------------------------------------- #
# Argument parsing
# --------------------------------------------------------------------------- #
parser = argparse.ArgumentParser(
    description="GhostBridge local synthetic lab",
    formatter_class=argparse.RawDescriptionHelpFormatter,
)
parser.add_argument("--database", default="ghostbridge.sqlite3",
                    help="SQLite database path (default: ghostbridge.sqlite3)")
parser.add_argument("--port", type=int, default=8765,
                    help="HTTP server port (default: 8765; server subcommand only)")

subparsers = parser.add_subparsers(dest="command")

relay_parser = subparsers.add_parser(
    "ingest-relay",
    help="Ingest a legacy relay CSV file into the local SQLite ledger",
    description=(
        "Parse a legacy relay/contact CSV file and ingest each event into the\n"
        "GhostBridge SQLite ledger.  Duplicate event IDs are silently skipped\n"
        "(idempotent).  Conflicting IDs (same ID, different payload) raise an error.\n\n"
        "CSV format (header row required):\n"
        "  event_id,at,relay,state,duration_seconds\n\n"
        "Example row:\n"
        "  R001,2026-11-08T12:01:00Z,north-door,OPEN,180"
    ),
    formatter_class=argparse.RawDescriptionHelpFormatter,
)
relay_parser.add_argument("fixture", metavar="FIXTURE.csv",
                          help="Path to the CSV fixture file")
relay_parser.add_argument("--database", default=argparse.SUPPRESS,
                          help="SQLite path (supports --database after the subcommand)")

# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #
args = parser.parse_args()

# ---- ingest-relay subcommand ----
if args.command == "ingest-relay":
    from pathlib import Path
    fixture_path = Path(args.fixture)
    if not fixture_path.exists():
        print(f"error: file not found: {fixture_path}", file=sys.stderr)
        sys.exit(1)
    raw = fixture_path.read_bytes()
    try:
        events = parse_relay_csv(raw)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)

    store = Store(args.database)
    engine = Engine(store)
    created = skipped = 0
    try:
        for event in events:
            try:
                result = engine.ingest(event)
                if result["created"]:
                    created += 1
                    label = f"  + {event['id']} -> {event['type']}"
                    if event["data"]:
                        label += f" ({event['data']['duration_seconds']}s)"
                    if result["incident"]:
                        label += f"  [INCIDENT: {result['incident']['rule']}]"
                    print(label)
                else:
                    skipped += 1
                    print(f"  ~ {event['id']} already in ledger (skipped)")
            except ValueError as exc:
                print(f"error: event {event.get('id')!r}: {exc}", file=sys.stderr)
                sys.exit(1)
    finally:
        integrity = store.verify()
        store.close()

    print(f"\nIngested {created} new event(s), {skipped} skipped.")
    print(f"Ledger integrity: {'OK' if integrity['valid'] else 'FAILED'} "
          f"({integrity.get('checked', 0)} record(s) verified)")
    if not integrity["valid"]:
        sys.exit(1)
    sys.exit(0)

# ---- default: start HTTP server ----
store = Store(args.database)
server = make_server(Engine(store), args.port)
print(f"GhostBridge: http://127.0.0.1:{server.server_port} (synthetic data only)", flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
    store.close()
