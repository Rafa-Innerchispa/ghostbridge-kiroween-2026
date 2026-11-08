# Phase 2: Local legacy signal adapters + cross-source correlation

**Status:** IMPLEMENTATION PENDING. Specification prepared by ChatGPT, not evidence of Kiro-authored code. Use a genuine authenticated Kiro IDE/CLI session.

## Goal

Demonstrate that two **distinct source formats and ingestion paths**, representing different generations of building technology, can produce normalized events and an **explainable cross-signal security case**. This goes beyond manually pressing simulated scenario buttons. Keep every source synthetic and local: no customer devices, production InnerOS MCP, credentials, cloud inference, subscriptions or paid services are needed.

## R1 — real ingest boundaries for two fixture-backed formats

1. Implement a **legacy relay/contact text adapter** using a bounded, explicitly selected local fixture file or text stream. Parse a strict, documented pipe-delimited or CSV record format with event ID, UTC timestamp, source name, state and optional hold duration. Normalize accepted inputs to the existing five-field `{id, device, type, at, data}` contract.
2. Implement a **JSON access-controller webhook adapter** on the existing Python **loopback-only** HTTP server (e.g., `POST /api/adapters/access`). Accept an explicit JSON schema for synthetic badge/door reader decisions. Normalize to the same existing contract. The endpoint must reuse or strengthen current host/origin checks, JSON content limits and strict validation.
3. Supply example fixture files and local replay commands. Data must enter through both **real ingest code paths** rather than calling the hardcoded scenario builder.
4. Map each source to the existing known synthetic devices (`door-01`, `reader-01`, optionally `camera-01`). No unverified real hardware compatibility claims. Keep the existing local `/api/events` contract functioning.

## R2 — deterministic correlation with explainability

1. Correlate **access.denied** and **door.open held >=120s** at the synthetic site within **300 seconds**, using UTC event timestamps (not arrival order).
2. Produce one **high-severity correlated case** with a deterministic case ID, explicit rule name, a natural-language explanation, and references to **both source event IDs and existing ledger hashes**.
3. Optionally enrich the case with a camera-offline event in the same time window, and explain whether it is part of the required rule or additional context.
4. Replays cannot create extra cases. Include deterministic tie-breaking for multiple candidate events. A late/out-of-order event can correctly complete a case. No false cases across a window boundary.
5. Keep correlated cases a **derived projection of the verified ledger**, unless an explicit migration and cross-language hash-compatibility review proves necessary. Never rewrite earlier event payloads or break existing SHA-256 fixtures.

## R3 — usable demo in both modes

1. On the local Python/SQLite edition, show correlated cases and their source/hash links via a safe read-only API and a visible UI panel.
2. On the public GitHub Pages edition, provide a clearly labeled **offline fixture-fed** replay of the same story that uses adapter-parsing code and preserves browser-only operation. The static site must not pretend it receives live webhooks.
3. Keep Night Watch (5/3), Normal Shift (4/0), Access Denied (1/1), severity filters, replay, verification, tamper test and JSON export unchanged.
4. Explain the distinction between existing single-signal incidents and new multi-signal correlated cases; do not double-count cases as individual incidents.

## R4 — operational and security guardrails

- Bind HTTP to loopback `127.0.0.1` only. No exposure on LAN/Internet, no permissive CORS or disabled host validation.
- Strict input schemas, caps on payload and file sizes, invalid timestamp rejection, safe filename handling, no path traversal or unsafe shell execution.
- Clear idempotency on source IDs. Reject conflicting duplicate IDs; do not silently alter existing evidence.
- No actual ONVIF or Wiegand device connection is claimed unless implemented and physically verified later in a separately approved task.
- No changes to InnerOS, customer cameras, production databases, firewall, server resources, or secrets. No external paid coding agents.

## R5 — test and delivery gates

- Tests for adapter valid/invalid formats; malformed/oversized and spoofed input; duplicate/conflicting event IDs.
- Tests for correlation happy path, event-order independence, >=120s boundary, 299/300/301-second window boundaries, ambiguous event matching, missing access/door, optional camera context, restart persistence, and unchanged original ledger verification.
- Test both Python and JS modes, including fixture parity, original 58 tests, browser UI desktop/mobile, download/export behavior and GitHub CI/Pages.
- Deliver two small reviewable PRs if feasible: **PR A adapters + fixtures**, **PR B correlator + browser UI**.
- Document genuine Kiro IDE use (spec revisions, prompts, code diff, tests and actual screenshots) in `docs/KIRO_EVIDENCE.md`; keep Codex/ChatGPT baseline attribution.
- Do not submit Devpost or claim phase 2 features until merged and verified.
