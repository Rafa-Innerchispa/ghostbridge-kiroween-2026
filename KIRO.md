# GhostBridge Kiro execution handoff

**As of 2026-11-06:** the owner signed in to Kiro using a personal Google account on **Kiro Free (50 credits / month, 0 used when checked)** and reports submitting the Kiroween request for **4,000 promotional credits**. Credit grant or redemption is **not confirmed**.

The original GhostBridge application, and the initial `.kiro/specs/ghostbridge-mvp/` documents, were authored before Kiro participation by Codex. **No genuine Kiro code contribution has yet been verified.** Do not claim otherwise.

## First Kiro assignment: severity filter (bounded)

Read:
- `AGENTS.md`
- `.kiro/specs/ghostbridge-mvp/`
- `.kiro/specs/incident-severity-filter/requirements.md`
- `.kiro/specs/incident-severity-filter/design.md`
- `.kiro/specs/incident-severity-filter/tasks.md`

Paste this prompt in **Kiro IDE or Kiro CLI**, with this repository open:

> You are working on GhostBridge for Kiroween 2026. This is a new independent MIT-licensed project, currently using synthetic building signals only. Review AGENTS.md, KIRO.md, and both .kiro spec directories. Implement the incident severity filter according to .kiro/specs/incident-severity-filter/: All / High / Medium, default All, accessible controls. Filter Incident desk cards only, without changing full event and incident counters, evidence timeline, exported JSON, or SHA-256 ledger. Add dependency-free tests for mixed severities, zero matches, no incidents, reset, immutable input, and identical evidence verification. Run Python and Node tests, the JS syntax check, and check the browser lab. Capture your genuine Kiro session evidence in docs/KIRO_EVIDENCE.md, listing the Kiro product, prompt, file changes, tests, commit, screenshots, and limitations. Existing code/specs were previously prepared with Codex, so attribute Kiro only to what you actually implement now. Use only existing free credits; do not purchase or trigger cloud providers. No InnerOS production MCP, customer devices, credentials, or external agents. Work on a branch and show the diff before merging.

## Mandatory results

1. A real Kiro-authored implementation commit/PR, not just a ChatGPT-issued patch.
2. Genuine screenshot/session reference and a provenance note (no credentials).
3. Node + Python tests and interactive browser QA, with PASS/FAIL logs.
4. Public GitHub Pages rebuild and anonymous demo verification.
5. Update the Devpost narrative only after actual Kiro use.

## Isolation policy

Kiro is used to **develop** GhostBridge. It does not become an inference dependency or operator of InnerOS. The browser lab runs synthetic data; production devices and customer infrastructure are out of scope.

The Devpost project description and repo URLs already exist. Final Kiroween submission requires the owner's explicit authorization, plus a public YouTube demo under 3 minutes.
