import json
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from ghostbridge.engine import Engine
from ghostbridge.storage import Store
from ghostbridge.server import make_server
from ghostbridge.simulator import scenario

class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = Store(":memory:")
        cls.server = make_server(Engine(cls.store), 0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join(); cls.store.close()

    def request(self, path, data=None, headers=None, raw=None):
        req = Request(self.base+path, data=raw if raw is not None else json.dumps(data).encode() if data is not None else None,
                      headers=headers or ({"Content-Type":"application/json"} if data is not None or raw is not None else {}))
        try:
            with urlopen(req, timeout=3) as r: return r.status, r.read()
        except HTTPError as r: return r.code, r.read()

    def test_state(self): self.assertEqual(self.request('/api/state')[0], 200)
    def test_root(self): self.assertIn(b'GhostBridge', self.request('/')[1])
    def test_unknown_route(self): self.assertEqual(self.request('/api/nope')[0], 404)
    def test_malformed(self): self.assertEqual(self.request('/api/events', raw=b'{')[0], 400)
    def test_array(self): self.assertEqual(self.request('/api/events', [1])[0], 400)
    def test_invalid_event(self): self.assertEqual(self.request('/api/events', {})[0], 400)
    def test_origin(self): self.assertEqual(self.request('/api/reset', {}, {'Content-Type':'application/json','Origin':'https://evil.example'})[0], 403)
    def test_rebinding(self): self.assertEqual(self.request('/api/reset', {}, {'Content-Type':'application/json','Host':'evil.example'})[0], 403)
    def test_media(self): self.assertEqual(self.request('/api/reset', {}, {'Content-Type':'text/plain'})[0], 415)
    def test_large(self): self.assertEqual(self.request('/api/events', raw=b' '*16385)[0], 413)
    def test_full_flow(self):
        self.request('/api/reset', {})
        code, body = self.request('/api/scenario', {'name':'night'})
        s = json.loads(body)
        self.assertEqual(code, 200); self.assertEqual(s['created'], 5)
        self.assertEqual(len(s['state']['incidents']), 3)
        self.assertEqual(json.loads(self.request('/api/scenario', {'name':'night'})[1])['created'], 0)
        self.assertTrue(json.loads(self.request('/api/verify')[1])['valid'])
        self.request('/api/reset', {})
        self.assertEqual(len(json.loads(self.request('/api/state')[1])['ledger']), 0)
