import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from .core import canonical
from .simulator import scenario
from .adapters.access_webhook import parse_access_webhook
from .correlator import correlate

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, engine, lock, **kwargs):
        self.engine, self.lock = engine, lock
        super().__init__(*args, directory=str(Path(__file__).resolve().parents[1] / "docs"), **kwargs)

    def reply(self, status, payload):
        data = canonical(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        with self.lock:
            if self.path == "/api/state":
                return self.reply(200, self.engine.snapshot())
            if self.path == "/api/verify":
                return self.reply(200, self.engine.store.verify())
            if self.path == "/api/cases":
                integrity = self.engine.store.verify()
                if not integrity["valid"]:
                    return self.reply(409, {"error": "Evidence ledger integrity failed; cannot derive cases"})
                ledger = self.engine.store.rows()
                return self.reply(200, {"cases": correlate(ledger)})
        if self.path.startswith("/api/"):
            return self.reply(404, {"error": "Unknown route"})
        super().do_GET()

    # Largest unread request body we will discard after an early error reply (413/415/403).
    MAX_DRAIN = 1 << 20

    def _drain_unread_body(self):
        # Closing a socket that still holds unread request data makes TCP send RST, and the client can then lose
        # the error response it was owed. Discard a bounded amount of the body, briefly, before the connection closes.
        if getattr(self, "_body_consumed", False):
            return
        try:
            remaining = min(int(self.headers.get("Content-Length", "0") or 0), self.MAX_DRAIN)
            if remaining <= 0:
                return
            self.connection.settimeout(1.0)
            while remaining > 0:
                chunk = self.rfile.read(min(remaining, 65536))
                if not chunk:
                    break
                remaining -= len(chunk)
        except (OSError, ValueError):
            pass

    def do_POST(self):
        try:
            self._handle_post()
        finally:
            self._drain_unread_body()

    def _handle_post(self):
        # Block cross-origin browser writes and DNS-rebinding hostnames. No CORS.
        if self.headers.get("Host") not in (f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"):
            return self.reply(403, {"error": "Loopback host required"})
        origin = self.headers.get("Origin")
        if origin and origin not in (f"http://127.0.0.1:{self.server.server_port}", f"http://localhost:{self.server.server_port}"):
            return self.reply(403, {"error": "Cross-origin writes forbidden"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 16384:
                return self.reply(413, {"error": "JSON body required; maximum 16 KiB"})
            if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                return self.reply(415, {"error": "Use application/json"})
            raw = self.rfile.read(length)
            self._body_consumed = True
            payload = json.loads(raw)
            if not isinstance(payload, dict):
                raise ValueError("Body must be an object")
            with self.lock:
                if self.path == "/api/events":
                    return self.reply(200, self.engine.ingest(payload))
                if self.path == "/api/scenario":
                    events = scenario(payload.get("name"))
                    results = [self.engine.ingest(e) for e in events]
                    return self.reply(200, {"created": sum(r["created"] for r in results), "state": self.engine.snapshot()})
                if self.path == "/api/reset":
                    self.engine.store.reset()
                    return self.reply(200, self.engine.snapshot())
                if self.path == "/api/adapters/access":
                    event = parse_access_webhook(payload)
                    return self.reply(200, self.engine.ingest(event))
                return self.reply(404, {"error": "Unknown route"})
        except (ValueError, TypeError, UnicodeError) as exc:
            return self.reply(400, {"error": str(exc)})

def make_server(engine, port=8765):
    return ThreadingHTTPServer(("127.0.0.1", port), partial(Handler, engine=engine, lock=threading.Lock()))
