# GhostBridge | Competitive analysis and win strategy
**As of:** 2026-11-10 | **Category:** Kiroween 2026 Frankenstein | **Owner:** InnerChispa LLC

## Official judging criteria (five, scored 1 to 5)
1. Potential Impact: meaningful real user problem, usability, actual usefulness
2. Technological Implementation: depth/strategy of genuine Kiro use, variety of features, experimentation
3. Design: complete, intuitive, polished product (not merely a tech proof of concept)
4. Innovation/Idea: difference from existing work, meaningful combinations of unusual tech/data
5. Presentation: working end-to-end in the video, clear audience/problem/value, creativity and memorability

Official source: https://kiroween.devpost.com/ (live Devpost criteria verified 2026-11-10). All criteria matter; there is no public ranking of 2026 entrants at this time. The official project gallery currently says **"The hackathon managers haven't published this gallery yet"**: https://kiroween.devpost.com/project-gallery.

## Publicly visible projects that declare Kiroween 2026 participation

| Public project | Verified public description | Why it competes | Gap for GhostBridge to close |
|---|---|---|---|
| [Dinosaur Survival MUD 3D](https://devpost.com/software/jurassic-park-mud-3d-isla-nublar-survival) | Retro 80s CRT commands + Three.js 3D + an optional Gemini Live dynamically changing the world | Memorable interactive experience, 3D motion, blended technologies | Let judges CONTROL the synthetic conditions and visibly change outputs, not just replay one fixture |
| [Ghost from the Past](https://devpost.com/software/ghost-from-the-past) | Browser extension + Cloudflare Worker + D1 + semantic search + MCP; Kiro CLI specs/hooks and documented test suite | Tangible end-to-end user workflow, integrates unrelated real technologies | Prove a genuinely useful data-bridge ingestion-to-investigation flow, source tracking and audit |
| [PHANToM Grid](https://devpost.com/software/phantom-grid-dark-night-titan-tui-frankenstein-engine) | Rust C-ABI + Triton + Python MCP and graphical ANSI TUI, extensive Kiro architecture claims | Broad engineering appeal, packaged visuals and demonstration | Lean into practical building operations, not outnumbering another project's algorithms |
| [IncidentOps Starter](https://devpost.com/software/incidentops-starter) | Local-model Qwen assisted security incident categorization, reproducible testing and public walkthrough | Model-assisted decisions and real local inference | Explain GhostBridge's deterministic, verifiable events; optional local AI as narrative enhancement only after evidence integrity |
| [Frankenstein Arterial Monitor](https://devpost.com/software/frankenstein-arterial-monitor) | Synthetic ANPR forecaster + point-process wake-up filter + Kiro orchestration | Real cross-source streaming + mathematically evaluated detection | Make cross-source temporal decisions adjustable and visible to judges |

These are individual public project statements, not an exhaustive competitor census and not independently audited results. Some project names or features may evolve.

## 2025 winners worth learning from

The [official 2025 winner gallery](https://kiroween-2025.devpost.com/project-gallery) prominently lists:
- **UnitSet**, a Frankensteined UI canvas+AI+code+live sandboxes experience
- **SpookBnB**, a rental site transformed into an interactive horror experience
- **Faxi**, an old fax bridge that lets seniors access modern services
- **InteractionKit**, gesture-controlled games/apps with Kiro

Strong pattern: the *user interacts with a transformation* rather than watching a dashboard counter.

## SWOT: GhostBridge, as it exists now

- **Strengths:** verified Kiro authorship across PR #2/#4/#5/#8; working public HTTPS frontend; 2.5D reconstruction; local-only browser demo; Python/SQLite adapters; cross-source explanation; source hashes; 324 green automated checks; professional domain ghostbridge.innerchispa.us.
- **Weaknesses:** only pre-scripted fixtures in main public flow; no freely controllable event inputs; no demonstrated hardware device; no local AI action layer; owner expects stronger cinematic video; Kiro save-hook firing not verified; published Devpost still lacks final 3-minute video and formal submission.
- **Opportunity:** become a *living security investigation playground* where judges alter the evidence and see deterministic source correlation, case reconstruction and on-device incident reasoning. Later stage an isolated physical sensor for a filmed proof if existing hardware and time permit.
- **Risk:** shiny but nonfunctional scenes, production/customer device exposure, scope creep, authorship ambiguity, Devpost deadline. Demonstrate working app first, then conceptual finished-product video.

## P0: GhostBridge Signal Forge (a dynamic choose-your-own-incident lab)

**Objective:** Let the judge *create* a unique synthetic incident in under 30 seconds, not just play a fixed example. It must use existing canonical events, SHA-256 evidence chain and case correlator; no second engine or cloud dependency.

1. New prominently labeled **Signal Forge / Create your own incident** experience in the public frontend, integrated alongside existing Legacy Bridge Demo. Minimal interactive controls: denied-access time, delay to door-opening (e.g. 30–360s), door hold (e.g. 60–240s), and optional synthetic camera-offline toggle.
2. On **Run investigation**, reset or use an isolated deterministic branch of the local ledger (never corrupt existing evidence); produce new **valid** canonical access/door events from the entered values using existing `append` or API, including unique validation-safe event IDs; verify SHA-256 before deriving cases.
3. Feed the actual `correlate` and `buildReconstruction` modules. The 2.5D viewer and evidence inspector must display *the new case* from the data, not any hardcoded event text. If threshold fails, show a clear and respectful **"No correlated case"** explanation with exact reason.
4. Expose two preset boundary challenges: **299s/120s** yields a case; **301s/119s** does not. Show why, let visitor change back manually. No game leaderboard, no invented AI prediction, no user accounts or telemetry.
5. Live visual pipeline shows source adapter contracts and actual evidence row hashes. Action controls and mobile 390px accessibility.
6. Preserve current Night Watch, Normal Shift, Legacy Bridge Demo, tamper refusal, replay, all previous tests, hash chain, local Python/SQLite mode and GitHub Pages hosting.
7. Strong automated JS+Python parity tests and desktop/mobile Playwright tests; zero remote APIs, no new paid services.
8. Build on an isolated branch `feat/signal-forge-interactive` with an independently reviewable PR and documented tests, merge **only after** owner-facing QA approval. This work is delegated to **local AMD/Qwen** and must be attributed as such; do not falsely attribute it to Kiro.

**Business value:** security staff train on changing conditions, not on one static sample; users can explore thresholds, false correlations and evidence integrity independently. The cinematic film can show the operator deliberately varying inputs and inspecting each decision.

## P1 (only after P0): physically observed isolated test bench

Demonstrate a real **low-voltage dry-contact or Home Assistant test entity** as the door source with a locally recorded timestamp and no physical actuation. Combine that observed contact with an explicitly synthetic access-denied event in a private lab to prove the integration boundary. No production building hardware, no customer data, no remotely reachable Python localhost. The public site remains the safe judge-accessible interactive lab; the video can show authentic local bench footage if available.

## Project presentation

Video: one 2:52 premium product film combining actual public Signal Forge demo, 2.5D reconstruction, contextual business outcome, authentic Kiro IDE specs/hooks/PRs, and a concise PRODUCT VISION montage of future mobile/multi-property integrations. Previous animatic/visuals can be reused; do not generate new cinematic assets until the new interactive product is signed off. The user already verified public hostname, and Antigravity reported successful HTTPS + desktop/mobile QA; independent screenshot evidence recovery is still requested.

**Competition target:** Best Frankenstein, top overall placements, **Best Startup Project** (founder proof and professional website required), **Best Demo**. No claim of probable win.

**Deadline:** 2026-12-04 14:00 PT / 17:00 Ecuador. Submissions are not final until submitted via Devpost and a public video is attached.
