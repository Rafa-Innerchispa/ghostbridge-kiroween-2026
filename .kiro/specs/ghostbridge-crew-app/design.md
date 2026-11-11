# GhostBridge Incident Desk | technical design proposal for Kiro

**Status: ChatGPT-authored design input. Kiro must inspect and refine in the real session.**

## Native integration diagram

```text
Crew Dashboard (Kiro Crew App)
    |
    +--> GhostBridge Incident Desk React page
    |      @kirocrew/app-sdk useAppApi/useChatLauncher, Crew UI library
    |      live synthetic case / full source hashes / incident briefing action
    |
    +--> App backend (optional) via Crew Gateway HMAC signed reverse proxy
    |      reads only canonical GhostBridge project synthetic fixtures
    |      calls Python/JS verify + correlator, never fabricates case
    |
    +--> Crew Agent "ghostbridge-incident-investigator"
           Kiro CLI ACP session, app-scoped instruction/skill
           produces human-readable incident/next-action summary
           NO gate/door physical commands, no customer secrets
```

The Gateway lives on the Kiro workstation (Windows) or Linux AMD privately. If the workstation has an authenticated Kiro CLI already, Crew's bundled CLI via ACP can use that existing sign-in. If CLI headless mode specifically requires a Pro API key, do **not** upgrade or create one without authorization: native Crew ACP and interactive authenticated Kiro execution are permitted paths to test first.

## Proposed root folder

```text
integrations/kirocrew/ghostbridge-incident-desk/
    app.json                  Official Crew app manifest
    README.md                 Install, enable, test, screenshots, limitations
    agents/incident-investigator.json
    skills/incident-investigation/SKILL.md
    ui/package.json
    ui/vite.config.ts         External react, react-dom, lucide-react, @kirocrew/app-sdk
    ui/src/App.tsx
    ui/src/styles.css
    ui/dist/index.mjs         Built artifact required for local install (commit as needed)
    backend/                  OPTIONAL HMAC-protected read-only synthetic case source
    tests/                    API contract/fixtures/agent invocation and failure tests
```

## Official Crew app contract

App `app.json` must have at least `name`, `version`, `displayName`, `description`; add agents/skills and real `ui.entry` / `ui.pages[]`. The published Crew docs demonstrate:

- `ui.entry: "dist/index.mjs"` (check the actual app root layout and build destination; ensure manifest matches output).
- `ui.pages[].route: "/apps/ghostbridge-incident-desk"`.
- Dashboard code imports `useAppApi`, `useChatLauncher`, shared `Card`, `PageHeader`, etc. from `@kirocrew/app-sdk`.
- Vite externalizes React, ReactDOM, `react/jsx-runtime`, lucide-react and the `@kirocrew/app-sdk` virtual package.
- Native Crew agent config with `"tools":["@kirocrew-core"]` and local scope.
- Optional backend routes are reverse proxied under `/apps/{name}/api/*` with HMAC request verification using `kirocrew-client`.
- Background crons declared in `app.json` default to `enabled:false` until explicit activation; record one true execution.
- Validate app manifest with official `kirocrew-client AppManifest.validate()` if installed.
- Local install through Crew dashboard **Install from local path** or `POST http://localhost:5476/api/apps/install` with source path. Test actual app **Enable**/Disable behavior.

## Core data flow

Synthetic fixture relay CSV + access JSON → existing strict adapters → canonical `Store` / engine verified ledger → correlate → 1 high correlated case → native Crew app display. Evidence must come from the derived data, not a hardcoded URL/case display.

Native Crew agent consumes an explicitly bounded *case context JSON* and returns an explanation: situation, qualifying temporal relationship, excluded earlier signal, evidence references, recommended review steps; no remote device actuation. Store raw output only in app-scoped storage if user permits. Never ship sample credentials or access keys.

## Tests and runtime proof

1. `app.json` schema validation, UI bundle build and preview.
2. Native adapter/ledger/correlation test: five signals, three incidents, one case, R001 excluded; hashes verified.
3. Untrusted/forged ledger cannot display a valid case.
4. Kiro Crew agent invocation mocked in unit tests; one real Crew invocation necessary.
5. Owner opt-in digest cron disabled by default; one real run when enabled and then pause.
6. Mobile responsive/keyboard/reduced-motion and genuine Crew dashboard screenshot.
7. Real Gateway output: `kirocrew doctor`, `/api/apps` listing with app enabled, exact version, real session/task result. Sanitize host identifying details.
8. Github PR CI green and no production impact; fork or branch only.

## Integration with InnerOS (next stage)

InnerOS Issue #272 is separately building queue and executor adapters on the local AMD. GhostBridge Crew app should expose only documented app-controlled capabilities and not wait for the orchestration bridge to finish; the contest app can be independently installable. Later link InnnerOS approved ops task → Crew native agent → GitHub PR and Telegram, with idempotency and evidence. No localhost Gateway exposed publicly.

## Authorship

This plan is ChatGPT-written. Code must be built and recorded by actual Kiro IDE/CLI when possible. If Antigravity or Qwen changes code, record those contributions separately; do not claim they are Kiro-authored.
