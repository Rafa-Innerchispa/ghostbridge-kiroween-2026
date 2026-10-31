# Requirements — initial implementation by Codex

1. WHEN a synthetic event is received, validate its exact schema, UTC timestamp,
   device/type compatibility and bounded duration before storing it.
2. WHEN an identical ID and payload are replayed, create no duplicate record.
   WHEN the same ID has a different payload, reject it explicitly.
3. WHEN door duration ≥120s, dwell ≥300s, access is denied or camera is offline,
   create an explainable incident linked to the source event.
4. Night Watch SHALL yield 5 events / 3 incidents; Normal Shift 4 / 0 after reset.
5. Each ledger record SHALL bind event and incident with canonical SHA-256 linkage.
6. Verification SHALL detect payload changes, broken links and middle deletion.
   Documentation SHALL disclose full rewrite and tail-truncation limitations.
7. The UI SHALL allow inspection, reset, replay, JSON export and a disposable-copy
   tamper test. Data mode and synthetic sources SHALL be explicit.
8. SQLite SHALL survive reopening. The local API SHALL bind only to loopback.
9. Static Pages SHALL run browser-only without exposing API or SQLite.
10. Authentic Kiro development evidence SHALL be captured before claiming compliance.
