import argparse
from .engine import Engine
from .storage import Store
from .server import make_server

parser = argparse.ArgumentParser(description="GhostBridge local synthetic lab")
parser.add_argument("--database", default="ghostbridge.sqlite3")
parser.add_argument("--port", type=int, default=8765)
args = parser.parse_args()
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
