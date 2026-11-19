"""SQLite atomic event/incident ledger with a locally anchored SHA-256 chain."""
import json
import sqlite3
from .core import canonical, digest

class Store:
    def __init__(self, path):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA busy_timeout=5000")
        self.db.execute("CREATE TABLE IF NOT EXISTS ledger(seq INTEGER PRIMARY KEY, event_id TEXT UNIQUE NOT NULL, payload TEXT NOT NULL, previous TEXT NOT NULL, hash TEXT NOT NULL)")
        self.db.commit()

    def append(self, event, incident):
        with self.db:
            existing = self.db.execute("SELECT payload FROM ledger WHERE event_id=?", (event["id"],)).fetchone()
            if existing:
                if json.loads(existing[0])["event"] != event:
                    raise ValueError("Event id already exists with different content")
                return False
            previous = self.db.execute("SELECT hash FROM ledger ORDER BY seq DESC LIMIT 1").fetchone()
            previous = previous[0] if previous else "0" * 64
            payload = {"event": event, "incident": incident}
            self.db.execute("INSERT INTO ledger(event_id,payload,previous,hash) VALUES(?,?,?,?)", (event["id"], canonical(payload), previous, digest(previous, payload)))
        return True

    def rows(self):
        return [dict(seq=r[0], payload=json.loads(r[1]), previous=r[2], hash=r[3])
                for r in self.db.execute("SELECT seq,payload,previous,hash FROM ledger ORDER BY seq")]

    def verify(self):
        previous = "0" * 64
        try:
            rows = self.rows()
            for seq, row in enumerate(rows, 1):
                if row["seq"] != seq or row["previous"] != previous or row["hash"] != digest(previous, row["payload"]):
                    return {"valid": False, "checked": seq - 1, "failed_at": seq}
                previous = row["hash"]
            return {"valid": True, "checked": len(rows), "head": previous}
        except (ValueError, TypeError):
            return {"valid": False, "checked": 0, "error": "Malformed ledger payload"}

    def reset(self):
        with self.db:
            self.db.execute("DELETE FROM ledger")

    def close(self):
        self.db.close()
