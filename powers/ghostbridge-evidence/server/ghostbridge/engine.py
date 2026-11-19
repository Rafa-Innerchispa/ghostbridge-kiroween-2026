from .core import validate, incident, DEVICES

class Engine:
    def __init__(self, store):
        self.store = store

    def ingest(self, event):
        validate(event)
        finding = incident(event)
        created = self.store.append(event, finding)
        return {"created": created, "incident": finding}

    def snapshot(self):
        ledger = self.store.rows()
        return {"mode": "LOCAL_SYNTHETIC", "devices": DEVICES, "ledger": ledger,
                "events": [r["payload"]["event"] for r in ledger],
                "incidents": [r["payload"]["incident"] for r in ledger if r["payload"]["incident"]],
                "integrity": self.store.verify()}
