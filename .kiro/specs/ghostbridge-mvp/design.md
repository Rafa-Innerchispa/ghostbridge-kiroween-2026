# Design

Python stdlib backend with deterministic rules, atomic SQLite event/incident records
and loopback HTTP. Static ES module engine mirrors the contract using Web Crypto.
Dashboard separates sources, findings and evidence; user input is rendered with
textContent, never interpreted as HTML. No real hardware or cloud dependencies.

Tests cover rule boundaries, duplicate/conflicting IDs, malformed inputs, persistence,
tampering, origin/host restrictions and complete HTTP flow. Browser visual review
and cross-language hash fixtures are required verification checkpoints.
