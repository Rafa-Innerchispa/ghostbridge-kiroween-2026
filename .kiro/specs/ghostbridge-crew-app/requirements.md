# Kiro Crew App | GhostBridge Incident Desk — requirements

**Owner approval 2026-11-10:** Build a real Kiro Crew application for Kiroween 2026 **Best Kiro Crew App**, using genuine Kiro CLI/IDE credits. This file was prepared by ChatGPT as task input, not as evidence of Kiro-authored code.

## Product

A property-security manager can open **GhostBridge Incident Desk** inside the official **Kiro Crew dashboard**, load the existing synthetic denied-access/held-open-door evidence from the public GhostBridge lab, verify its original source hashes, and ask a dedicated Kiro Crew agent to produce a concise, explainable response briefing.

The app must demonstrate real Crew-native integration, not merely host an iframe of GhostBridge or rename a static dashboard.

## EARS-style acceptance

- **R1 Authentic Crew:** WHEN the app installs through Kiro Crew's supported app lifecycle, THE Crew Gateway SHALL list it as an enabled app; its actual dashboard page SHALL mount without unverified npm imports or fake API calls.
- **R2 Working synthetic ingest:** WHEN a visitor selects *Load Night Incident*, THE app SHALL read or generate genuine canonical GhostBridge synthetic events using the existing project contract and SHALL verify the SHA-256 evidence chain before presenting a correlated case. No production or customer data.
- **R3 Case detail:** WHEN a verified correlated case is selected, THE UI SHALL display the exact event IDs (`access:A001`, `relay:R003`), relevant timestamps, the 270-second gap and 130-second door hold, exclusions (earlier `relay:R001`) and full SHA-256 hashes copied from the true verified ledger.
- **R4 Native agent invocation:** WHEN the user chooses *Explain incident with Kiro*, THE application SHALL invoke a **real Kiro Crew agent** through the documented Gateway/SDK API with strict bounded context (synthetic case only) and display a traceable result. A mocked response or deterministic fallback SHALL be labeled clearly and must not be passed off as a Crew agent invocation.
- **R5 Persistence/resilience:** WHEN a job is submitted, THE UI SHALL display queued/running/completed/failed states, a meaningful error on missing Crew authentication/network, and a stable task/slot reference. Repeated user action SHALL not create unbounded duplicates.
- **R6 Crew-native automation:** WHEN an explicitly enabled app-owned scheduled digest or watcher fires, THE app SHALL record the execution ID, source and result. It SHALL default to **disabled/paused** until approved, and the evidence must show one true run before claiming automation.
- **R7 Frontend quality:** WHEN viewed at desktop 1440px or mobile 390px, THE Crew app SHALL display an attractive security-operations surface, clear actions, accessible controls, readable source hashes and a cohesive GhostBridge visual identity. It must not copy the existing GhostBridge website as a substitute for Crew integration.
- **R8 Security:** IF a request is missing Crew app permissions or verified source integrity, THEN the app SHALL refuse to process it. Secrets, `.app_secret`, browser tokens, customer data, local IPs and private credentials must never enter source control, logs or public screenshots.
- **R9 Local-first:** WHEN operating, the Crew Gateway SHALL remain bound to loopback on the host or private authenticated transport, and the app SHALL not require cloud inference outside the sanctioned Kiro CLI/ACP provider. Never open router ports or expose Kiro Gateway through public Cloudflare.
- **R10 Provenance:** WHEN submitting the PR, Kiro SHALL record actual files authored, Kiro CLI/IDE session evidence, CLI and Crew versions, exact tests, real UI screenshots, credits if visible, limitations and a self-contained installation procedure. Do not misattribute the Codex baseline or ChatGPT-prepared specs.

## Competition deliverable

Public GitHub repository path `integrations/kirocrew/ghostbridge-incident-desk/` containing valid `app.json`, native Crew agent, skill(s), a real Crew dashboard UI and optional authenticated backend. Include a runnable install/test path, proof of real Gateway, screenshot and a real agent response before requesting bonus eligibility. **No final Devpost submission in this task.**

## Explicit boundaries

Kiro may use owner's redeemed promotional credits for this development without purchasing additional credits or upgrading plans. Do not use `--trust-all-tools` unbounded on production Windows. Keep Git branch isolated `feat/kiro-crew-incident-desk`; no changes to deployed GhostBridge `docs/` unless necessary for a verifiable read-only integration. Existing Signal Forge draft PR #10 and Control Room Issue #11 belong to other development lanes; don't alter them.

Official docs:
- https://kiro.dev/docs/crew/apps/build-first-app/
- https://kiro.dev/docs/crew/apps/manifest/
- https://kiro.dev/docs/crew/apps/sdk/
- https://kiro.dev/docs/crew/installation/
- https://kiro.dev/docs/cli/headless/
