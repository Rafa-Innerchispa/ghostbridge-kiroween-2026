# Devpost texts (final drafts, English)

For project 1530261, https://devpost.com/software/ghostbridge-old-signals-new-instincts. Paste section by section. **Not submitted by Kiro.** Claims match `docs/submission/JUDGES.md`; update the numbers there first if anything changes.

---

## Tagline
The Building That Remembers: legacy security signals become one explained incident, with evidence anyone can verify.

## Inspiration
A rejected badge. A door held open. A camera going offline. In older buildings these arrive as separate alarms from systems that were never meant to talk to each other, and a night operator has to decide, alone and fast, which ones belong together. Replacing the hardware is expensive, so the old equipment stays for years. We wanted to give those old signals a second life: not an opaque AI verdict, but one explained incident that an operator can read and an auditor can check.

## What it does
GhostBridge turns legacy-style building signals into one explained, verifiable incident. Everything runs in your browser; nothing you type leaves the page.

- **Control Room:** a calm 2.5D building whose every state is derived from the evidence ledger.
- **Boundary challenges:** at **299 s / 120 s** a rejected badge and a held-open door form one case; at **301 s / 119 s** they do not, and GhostBridge says which condition failed and by how much.
- **Incident Time Machine:** replay the incident in eight beats; computed moments are labelled *derived, not recorded*.
- **Evidence Trust Lab:** alter one field in an isolated copy of the ledger and see the exact row that fails, while the original stays verified.
- **Your own log:** write or upload your own events as CSV; every line is checked against the strict event contract and imported all-or-nothing.
- **Seal and verify it yourself:** seal the ledger into a receipt; later checks tell *matches*, *extended*, *truncated* and *rewritten* apart, even if every hash was recomputed. Export the evidence and verify it on your own machine with a short standard-library Python script that contains no GhostBridge code.
- **Legacy adapters:** relay CSV and access-controller JSON normalized into one contract; a local Python edition persists to SQLite.

Built-in scenarios use synthetic events. GhostBridge does not connect to real hardware and never controls a door, camera or person.

## How we built it
Plain HTML, CSS and JavaScript on GitHub Pages, with Web Crypto SHA-256 and no third-party requests; a Python standard-library backend with SQLite for the local edition. The same rules are implemented in Python and JavaScript and proven identical on 100 configurations (same hashes, case ids and evidence hashes). Everything is deterministic: no model, no cloud inference.

Development was spec-driven in Kiro IDE (Autopilot), with custom agents, hooks, property-based tests, real-browser QA and our own MCP server, which we also packaged as a Kiro Power. The original lab, engine and the Signal Forge feature were written with ChatGPT/Codex; the later features (filtering, adapters, correlation, reconstruction, Control Room, Time Machine, Trust Lab, receipts, own-log import, independent verifier, MCP server and Power) were built in Kiro, with independent ChatGPT code reviews whose fixes are labelled separately in `docs/KIRO_EVIDENCE.md`.

## Kiro features used
- **Spec-driven development:** EARS requirements, design and tasks per feature; tasks ticked only after the validation ran.
- **Steering:** product rules (synthetic data, honest labels, local-first) and UI rules (no innerHTML, no third-party requests, one contact address), several enforced by tests.
- **Custom agents:** `ui-director` built views and the visual system (6 runs); `qa-auditor` reviewed independently (7 runs; every run is listed in `docs/evidence/phase8/agent-runs.json`) and found real defects: lost keyboard focus, computed times shown as recorded, a Restore button enabled with nothing to restore, wrong authorship headers, misused status colours. Each was fixed and re-audited.
- **Agent hooks:** a PreToolUse guard on every shell call blocks force-pushes and destructive commands; a PostFileSave hook re-runs the reconstruction tests and logs the result.
- **Property-based testing:** seeded generators over the rule boundaries, the scene, the Time Machine, tamper detection and receipt rewrites; 8 deliberate code mutations were all caught. A second set generates random ledgers and checks that the three separate implementations of the rules (Python engine, browser engine, independent verifier) agree on hashes, cases, the first tampered row and receipt verdicts.
- **Spec-driven:** that cross-implementation work has its own spec (`.kiro/specs/evidence-properties/`), and a PostFileSave hook re-runs it whenever a rule file or the Power's engine copy is saved.
- **MCP:** a read-only stdio server over the real engine (`list_scenarios`, `run_scenario`, `check_timing`, `verify_ledger`); 14 real calls from Kiro, which exposed and then verified a fix for empty JSON objects lost in structured arguments.
- **Kiro Power (built and tested; see the note):** the **GhostBridge Evidence Power** packages that MCP server with three skills (audit a ledger or receipt; explain a case decision; walk through one incident end to end into an audit hand-off), self-contained per Agent Plugins 1.0.0. *(Owner: keep this sentence only if the Power was installed and invoked in Kiro; see `docs/evidence/phase8/STATUS.md`.)*

## Challenges we ran into
- **The rule's physics.** The first replay drew the case link the instant the door opened; the rule needs 120 s of hold, so the scene now models the threshold.
- **Flaky tests that were not our code.** A Windows TCP reset on early server replies, and, much later, Chrome replacing freshly opened test tabs on its own; we measured the second one (4 of 4 trials) and removed it (0 of 4) by disabling background updates in the test browser.
- **Evidence through an AI tool.** Kiro passed structured arguments that silently dropped `"data": {}`, which changed the hashed bytes; we kept verification strict and added a text input that travels unchanged.
- **The limit of a hash chain.** A chain reveals edits but not a complete rewrite; receipts close that gap for everything sealed.

## Accomplishments that we're proud of
- Evidence a judge can verify without trusting us: their own log, their own machine, a script with no GhostBridge code.
- Exact, explained boundaries: 299/120 forms a case; 301/119 fails by one second on each condition, and the app says so.
- An honest record: every Kiro claim links to a file, a test or a log; what was not built is labelled "not built".
- 204 Python and 433 Node tests in CI and 595 real-browser checks, all passing.

## What we learned
Explanations beat verdicts: an operator trusts "1 second outside the window" more than a score. An independent auditor agent is most useful when it is allowed to disagree. And "verifiable" has to mean verifiable by someone else, with their own tools.

## What's next for GhostBridge
Adapters for real panels (Wiegand readers, relay boards, ONVIF cameras) running on a small on-site gateway; receipts anchored to an external timestamp; multi-site operations; and a mobile alert flow with human approval for every escalation.

## Built with
html, css, javascript, web-crypto, python, sqlite, kiro, mcp, github-pages

---

## Category: Resurrection
GhostBridge resurrects legacy building-security signals (relay contacts, card-reader decisions, camera status) without replacing the hardware: it normalizes them into one event contract, seals them in a SHA-256 chain, and correlates them into explained incidents that anyone can verify.

## Best Startup Project (owner to complete; only confirmed facts)
- Company: InnerChispa LLC. Contact: info@innerchispa.us. Product site: https://ghostbridge.innerchispa.us/
- Founder name, LinkedIn URL and company website: **owner to provide**. Kiro has not stated any founder, revenue, customer or team facts.
