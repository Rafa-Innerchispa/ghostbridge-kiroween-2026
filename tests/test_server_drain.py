"""
Regression: early error replies must reach the client intact.

Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).

The server used to answer 413/415/403 without reading the request body. Closing a socket that still holds unread
data makes TCP send RST, so the client sometimes got a connection error instead of the status it was owed. This was
the cause of an intermittent failure in test_server.test_large and test_adapters.test_oversized_body_returns_413
(about 40% of full-suite runs on Windows). These tests use raw sockets so they see exactly what a client sees.
"""
import json
import socket
import threading
import time
import unittest

from ghostbridge.engine import Engine
from ghostbridge.server import make_server
from ghostbridge.storage import Store


class DrainTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = Store(":memory:")
        cls.server = make_server(Engine(cls.store), 0)
        cls.port = cls.server.server_port
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.store.close()

    def exchange(self, path, body, headers=None, declared=None):
        """Send one POST with a full body and return the complete response bytes, or raise on reset."""
        head = {"Host": f"127.0.0.1:{self.port}", "Content-Type": "application/json", "Content-Length": str(len(body) if declared is None else declared)}
        head.update(headers or {})
        request = f"POST {path} HTTP/1.1\r\n" + "".join(f"{k}: {v}\r\n" for k, v in head.items()) + "\r\n"
        with socket.create_connection(("127.0.0.1", self.port), timeout=5) as s:
            s.sendall(request.encode() + body)
            chunks = []
            while True:
                data = s.recv(65536)
                if not data:
                    break
                chunks.append(data)
        return b"".join(chunks)

    def status(self, response):
        return int(response.split(b" ", 2)[1])

    def test_oversized_body_gets_413_every_time(self):
        for i in range(60):
            r = self.exchange("/api/events", b" " * 16385)
            self.assertEqual(self.status(r), 413, f"iteration {i}")
            self.assertIn(b"maximum 16 KiB", r)

    def test_wrong_media_type_gets_415_every_time(self):
        body = json.dumps({"x": "y" * 8000}).encode()
        for i in range(40):
            r = self.exchange("/api/events", body, {"Content-Type": "text/plain"})
            self.assertEqual(self.status(r), 415, f"iteration {i}")

    def test_foreign_host_and_origin_get_403_with_a_body_every_time(self):
        body = b"{" + b" " * 9000 + b"}"
        for i in range(40):
            self.assertEqual(self.status(self.exchange("/api/reset", body, {"Host": "evil.example"})), 403, f"host {i}")
            self.assertEqual(self.status(self.exchange("/api/reset", body, {"Origin": "https://evil.example"})), 403, f"origin {i}")

    def test_a_huge_declared_length_does_not_hang_or_exhaust_the_server(self):
        start = time.monotonic()
        r = self.exchange("/api/events", b"{}", declared=1 << 30)
        self.assertEqual(self.status(r), 413)
        self.assertLess(time.monotonic() - start, 4.0, "the bounded drain times out instead of waiting for 1 GiB")
        # the server is still healthy afterwards
        ok = self.exchange("/api/reset", b"{}")
        self.assertEqual(self.status(ok), 200)

    def test_a_valid_request_is_unaffected(self):
        r = self.exchange("/api/reset", b"{}")
        self.assertEqual(self.status(r), 200)
        self.assertIn(b'"ledger"', r)

    def test_malformed_content_length_is_still_a_clean_400(self):
        head = f"POST /api/events HTTP/1.1\r\nHost: 127.0.0.1:{self.port}\r\nContent-Type: application/json\r\nContent-Length: abc\r\n\r\n"
        with socket.create_connection(("127.0.0.1", self.port), timeout=5) as s:
            s.sendall(head.encode())
            data = b""
            while True:
                chunk = s.recv(65536)
                if not chunk:
                    break
                data += chunk
        self.assertEqual(self.status(data), 400)


if __name__ == "__main__":
    unittest.main()
