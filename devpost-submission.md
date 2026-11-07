# Kiroween 2026 | GhostBridge Devpost submission packet

**Status: DRAFT. The final Kiroween hackathon submission has NOT been sent.**  
**Prepared:** 2026-11-07. Do not use this file as proof of legal eligibility, a published video, or live device integration.

## Title
GhostBridge: Old Signals, New Instincts

## One-line Summary
A local-first app that transforms simulated camera, door, and access-control signals into explainable security incidents with SHA-256-verifiable evidence.

## Problem
Security infrastructure in older buildings often consists of isolated cameras, access readers, relay contacts, and sensors. Operators must manually assemble events from incompatible generations of technology and lack a straightforward explanation or inspectable event trail.

## Solution
GhostBridge normalizes **synthetic** signals into a common event contract, applies deterministic detection rules, and displays incidents connected to their original events and linked hashes. Its browser demo is fully self-contained; the local Python edition uses SQLite. No live hardware or cloud inference is required.

## Why This Matters
The prototype demonstrates how existing infrastructure could be incrementally connected rather than replaced. The value is understandable findings, reproducible behavior, and inspectable event history, while explicitly disclosing what a local hash chain cannot guarantee.

## How We Used AI
The development process used AI-powered coding tools, not AI inference at runtime. GhostBridge's incident rules are deterministic and run locally. No model classifies live camera footage or controls physical security devices.

## How We Used Kiro
On November 6, 2026, the founder used **Kiro IDE in Autopilot mode** with a personal Google-linked Kiro Free account. Kiro read the versioned specification at `.kiro/specs/incident-severity-filter/`, produced a pure `filterBySeverity` module, added keyboard-accessible All / High / Medium controls and responsive styling, and authored **17 new regression tests**. The selected severity filters **only the incident desk cards**; full event counts, timeline, exported JSON and SHA-256 verification remain unchanged.

The contribution was committed as `6b2ed7cfaa0961b1add99cffa813ee8be6cf6300` on `feat/incident-severity-filter` and merged to `main` in **PR #2**, merge commit `367cc2ee2ab46f7ac4eb12496ce6b2e3326121fe`. See [genuine Kiro provenance](docs/KIRO_EVIDENCE.md). Existing MVP features and earlier `.kiro/` documents are not claimed as Kiro-authored.

## How We Used Codex
Codex/ChatGPT prepared the initial GhostBridge prototype and original specification/steering docs during the hackathon project period, including the Python/SQLite engine, browser app, synthetic scenarios, canonical ledger hashing, test fixtures and CI setup. The Kiro-authored filter was an independent later development contribution. The public repository separates their provenance.

## Key Features
- Four deterministic incident rules: held-open door, unusual dwell, access denied, camera offline.
- Night Watch: 5 synthetic events and 3 explainable incidents.
- Normal Shift: 4 synthetic events and 0 incidents.
- All / High / Medium incident filter, without changing evidence data.
- Incident explanation, source-event inspection and complete evidence timeline.
- Idempotent replay, SHA-256 consistency verification, non-destructive tamper test, JSON export.
- Local Python/SQLite edition and browser-only Web Crypto/localStorage edition.

## Architecture
Synthetic event adapters → exact event schema → deterministic rules → atomic event/incident ledger → SHA-256 hash chain → explainable browser dashboard. Python server binds to localhost; GitHub Pages hosts static `docs/` only. No connection to InnerOS, live cameras, private customer systems, or production access controls.

## Testing Instructions
No credentials are needed. Open the browser demo, select **Reset lab**, run **Night Watch**, and confirm 5 events/3 incidents. Select **All (3), High (2), Medium (1)**. Check that the evidence timeline still shows all 5 events. Open a finding, click **Verify chain**, then **Export evidence JSON**. Replay and confirm 0 new records; test tamper detection using a disposable copy. Reset, run **Normal Shift** (4 events/0 incidents), then reset and run **Access Denied** (1 medium-severity incident, none under High).

Offline Chromium QA against the exact GitHub Pages deployment artifact completed 32/32 interaction checks on desktop and 390px mobile; see [verification details](docs/BROWSER_QA_2026-11-07.md). GitHub CI and Pages workflows execute 29 Python + 29 JavaScript tests. **A separate live anonymous-browser check of the HTTPS deployment is still needed.**

## Public Demo Link
https://rafa-innerchispa.github.io/ghostbridge-kiroween-2026/

## Public Repository Link
https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026

## Demo Video
**PENDING:** public YouTube URL, real recording under three minutes. The [storyboard](docs/DEMO_SCRIPT.md) is prepared. A short silent Chromium interaction clip exists in the operator's working folder for video editing; **it is not a final YouTube submission and does not represent a recorded live website visit**. Include genuine Kiro IDE footage/screenshot and credit only the Kiro-authored change.

## Screenshot Shot List
1. Hero and synthetic source cards, desktop.
2. Night Watch: All=3, 5-event evidence timeline.
3. High=2 and Medium=1 filters, counters unchanged.
4. Chain verification and JSON export.
5. 390px mobile responsive Incident desk.
6. Real Kiro IDE screen/spec/PR and tests (requires authentic screenshot).

## Known Limitations
Synthetic signals only. No real ONVIF camera connection, no AI vision/inference, no physical actuation, no external trust anchor for the hash chain, no legal immutability certification. Local browser storage is not equivalent to remote audited evidence. No production InnerOS integration is included. Screen-captured offline QA is not a live HTTPS connectivity check.

## Official Kiroween Form Answers

| Field ID | Question | Proposed verified answer / action |
| --- | --- | --- |
| 29616 | Country | Ecuador |
| 29617 | Age majority declaration | **Owner must personally affirm; no automatic legal checkbox** |
| 29638 | Eligible jurisdiction declaration | **Owner must personally affirm** |
| 29618 | Category | Frankenstein |
| 29619 | Public GitHub | https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026 |
| 29620 | Working demo URL | https://rafa-innerchispa.github.io/ghostbridge-kiroween-2026/ |
| 29621 | Testing instructions | Use section above |
| 29622 | Main Kiro technology requirement | Use "How We Used Kiro" above and real `docs/KIRO_EVIDENCE.md` |
| 29623 | Pre-existing work | Original app/specs Codex/ChatGPT; Kiro-only filter later, documented |
| 29624 | Bonus category | Startup Project (proposed) |
| 29625 | Founder + LinkedIn + startup website | Rafael López, founder, InnerChispa LLC; https://www.linkedin.com/in/hlopezgye/ ; https://innerchispa.us/ |
| 29626–29629 | Other bonuses | Leave blank without qualifying evidence |
| 29630 | Kiroween 2025 registrant | **Unverified, owner response needed** |
| 29634 | Submitter type | Individual or Organization: confirm intended legal submitter before final form |
| 29635 | Organization | InnerChispa LLC if submitting as Organization |
| 29631 | AWS employee | **Owner must verify** |
| 29636 | Skill gains | Owner's subjective assessment, not inferred |
| 29637 | Future Kiro usage | Owner's subjective assessment, not inferred |

## Submission Readiness Notes
- [x] Devpost registration, project creation, description and links.
- [x] Public MIT source and root `.kiro/`.
- [x] Authentic Kiro-authored change, merged PR #2 and documented provenance.
- [x] GitHub CI and Pages workflow successful.
- [x] Offline Chromium functional verification 32 PASS / 0 FAIL.
- [ ] Live anonymous-browser HTTPS check on desktop/mobile.
- [ ] Genuine Kiro screenshot or screen capture accessible for video.
- [ ] Recorded public YouTube video under three minutes and URL entered.
- [ ] Devpost project thumbnail and screenshots uploaded.
- [ ] Owner's legal/eligibility and remaining subjective form answers.
- [ ] **Explicit owner authorization for final Devpost submission**, then verify submitted status.

**Official deadline:** December 4, 2026 at 22:00 UTC = 17:00 Ecuador.