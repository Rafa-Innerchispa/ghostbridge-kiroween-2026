# GhostBridge Kiro Crew App | execution checklist

**Status:** Not yet implemented as of assignment. All checkboxes require recorded verification.

- [ ] Confirm Windows Kiro CLI/Crew installation, authenticated context and user credits without reading or publishing private tokens. Report exact versions and blockers.
- [ ] Pull latest `origin/main`, read KIRO.md, Issue #12, current `.kiro/specs/ghostbridge-crew-app/`, README, existing adapters, correlator and KIRO_EVIDENCE.
- [ ] Create `feat/kiro-crew-incident-desk` from `origin/main`. Do not mix with draft PR #10 or #11 Control Room lane. Create a genuine Kiro IDE/CLI session and refine requirements/design/tasks in that session.
- [ ] Create real Crew installable app manifest in `integrations/kirocrew/ghostbridge-incident-desk/app.json` and native Crew agent/skill configuration. Verify via Crew's schema or SDK.
- [ ] Build a beautiful Crew dashboard page with supported `@kirocrew/app-sdk` hooks and original real source-linked synthetic case UI. Build Vite ESM artifact as documented.
- [ ] Integrate strict synthetic-source ingestion from existing GhostBridge ledger/CLI; refuse invalid hashes and never create a fake case.
- [ ] Add real Crew-native agent run that explains the case; capture authentic result and task ID. Surface auth/gateway errors without faking success.
- [ ] Add one opt-in or disabled-by-default Crew-native scheduled daily briefing, test its enable/run/pause lifecycle if possible. No unattended credit usage without bounds.
- [ ] Add regression tests for manifest, verifying ledger/correlator, agent mock, invalid inputs, idempotency and recovery.
- [ ] Run real Crew gateway locally, install/enable the app, inspect actual dashboard screenshot and click through agent response at desktop/mobile.
- [ ] Add genuine Kiro IDE session evidence and Crew screenshots to `docs/KIRO_EVIDENCE.md` and `docs/evidence/`, with accurate source attribution, exact credit usage if visible and tests.
- [ ] Commit/push PR `feat/kiro-crew-incident-desk`, stop before merge. Deliver a judge-ready GitHub app path, install instructions, live Crew task result, screenshot and tests.
- [ ] Coordinate with InnerOS Issue #272 without assuming the local automation bridge is finished. The app works independently.

**Proof threshold for Bonus eligibility:** real installable Crew-native app, actually enabled at local Crew Gateway with working dashboard+agent, public GitHub source and demo/evidence; only then add Best Kiro Crew App to Devpost.
