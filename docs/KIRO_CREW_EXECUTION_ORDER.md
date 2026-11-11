# GhostBridge | Official Kiro Crew development assignment

**Owner explicitly authorized use of Kiro promotional credits on 2026-11-10.** Implementation assigned to genuine Kiro IDE/CLI; ChatGPT wrote the handoff only.

## Mission

Develop a **functional Kiro Crew app, GhostBridge Incident Desk**, as a real installable product for the **Kiroween 2026 Best Kiro Crew App** bonus. It must also provide a reusable operational component for InnerOS/PC Doctor. No dummy web app.

Start by reading:
- `.kiro/specs/ghostbridge-crew-app/requirements.md`, `design.md`, `tasks.md`
- [GitHub Issue #12](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/issues/12)
- `docs/INNERCHISPA_VISUAL_PRODUCT_PLAYBOOK.md`, `KIRO.md`, `docs/KIRO_EVIDENCE.md`
- Official Crew docs: https://kiro.dev/docs/crew/apps/build-first-app/ and https://kiro.dev/docs/crew/apps/sdk/.

## Autonomous execution

1. Use owner's existing Kiro session and promotional credits, not paid external agents. Confirm installed CLI/Crew first (`kiro-cli --version`, `kirocrew doctor`).
2. If Crew is absent, install the official signed desktop package or documented wheel, run Gateway locally and authenticate via existing account. Never put tokens into chat/GitHub/CI logs; do not upgrade subscription without owner's approval.
3. Create isolated `feat/kiro-crew-incident-desk` branch off main.
4. Build app under `integrations/kirocrew/ghostbridge-incident-desk/`: manifest, agent, skill, native dashboard UI, source-linked synthetic case, real Crew agent invocation and optional opt-in cron.
5. Genuine Kiro spec-driven session must implement and test each checklist milestone; real crew install/enabled, agent message and result, screenshot, errors and retry recorded.
6. No direct client camera connection, local server public exposure, unsafe device actuation, customer data or unapproved API calls.
7. Complete tests, commit, push, open PR, report proof, stop before merge.
8. After real Crew app is working, link to InnerOS separately per https://github.com/Rafa-Innerchispa/innerops-agentic-platform/issues/272; no need to hold bonus app hostage to automation bridge.

## Authorship and contest entry

Code produced by Kiro should remain clearly Kiro-authored. ChatGPT prepared the task/requirements, so those are not counted as Kiro-authored implementation. Judge bonus form field 29627 should point to the public Crew app GitHub folder and describe genuine working functionality; do not fill the field with a speculative repo URL.

**Current Kiro Crew app work = NOT yet implemented.** The goal is to deliver a genuine working implementation, not a promise.
