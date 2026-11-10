# Kiro Autopilot Master Brief — GhostBridge Control Room: The Building Speaks
**Prepared 2026-11-10 by ChatGPT on the owner's direction. THIS IS A PLANNING BRIEF, NOT IMPLEMENTED CODE OR AUTHENTIC KIRO WORK.**
**Owner goal:** A remarkably visual, interactive, premium, commercial security-operations product experience capable of competing at Kiroween 2026 and attracting real property managers for paid pilots.

## Authoritative context and sequencing

Repo: `Rafa-Innerchispa/ghostbridge-kiroween-2026`. Public stable application: https://ghostbridge.innerchispa.us/ (GitHub Pages + Cloudflare DNS). Never expose local Python or AMD servers to the public.

Existing authentic Kiro IDE features: PRs #2 filter, #4 relay CSV/access JSON adapters, #5 cross-source correlation, #8 2.5D Evidence Reconstruction. Their provenance stays documented in `docs/KIRO_EVIDENCE.md`; initial baseline and other ChatGPT patches must not be relabeled as Kiro contributions.

**Critical dependency:** [PR #10](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/10) is a **DRAFT**, not merged. It adds browser-only **Signal Forge**, with a user-adjustable 1–360s access-to-door gap, 60–240s door hold, optional simulated camera-offline event, two presets (299/120 matches, 301/119 does not), existing verified SHA-256 ledger and reconstructed case. Latest GitHub checks for #10 passed; *independent real desktop/mobile branch QA has not yet been signed off*. Original author: ChatGPT via GitHub, **not Kiro**.

**Your workflow:** First inspect and validate PR #10 without overwriting or merging it. If you find real bugs, fix them in its own existing branch, test and document Kiro-authored patches transparently. Then create a separate **stacked feature branch** `feat/kiro-immersive-control-room` from the validated `feat/signal-forge-interactive` head; open its PR with base `feat/signal-forge-interactive` so main and the live public site remain unchanged. Do not merge either PR. When PR #10 later merges, retarget the stacked PR to main after fetch and conflict review. Never force-push, rewrite main or touch the competition submission without authorization.

Read: `AGENTS.md`, `KIRO.md`, `README.md`, `docs/INNERCHISPA_VISUAL_PRODUCT_PLAYBOOK.md`, `docs/KIROWEEN_COMPETITIVE_REVIEW_2026-11-10.md`, `docs/WINNING_DEMO_STRATEGY.md`, `docs/DEMO_SCRIPT.md`, `docs/KIRO_EVIDENCE.md`, Issue #11, PR #10, and existing `.kiro/specs/evidence-reconstruction/` docs.

## Experience definition: “GhostBridge / The Building Speaks”

Not a generic SaaS admin with identical cards. A premium, visually stunning, cinematic **investigation cockpit**. At first contact, viewers understand that a legacy building's disconnected signals become one actionable story, through local-first processing.

### Scene 1 — Living architecture (above the fold)

- Responsive **immersive architectural scene**: a stylized 2.5D/3D residential building lobby/entry, with depth, lighting, realistic materials/texture, distinctive opening motion and clickable source nodes for door, reader, presence and synthetic camera health.
- Show spatial connections, event timing and risk elevation as controlled, meaningful animations tied to real current synthetic ledger state. Scene must be usable with keyboard and reduced-motion.
- Do not start with a wall of counters, generic AI icons or unrelated sci-fi imagery. Introduce a clear story: **“When buildings start talking.”** Subline: **“Turn disconnected signals into decisions you can trust.”**
- Primary CTA: **Forge an incident** (opens the actual Signal Forge composer). Secondary: **Watch an incident unfold** (runs the actual Legacy Bridge demo, then opens an existing correlated case reconstruction).
- Architectural scene should remain useful without WebGL. Prefer deterministic SVG/CSS/Canvas and progressive enhancement; experiment with lightweight Three.js only if it materially improves user comprehension, keeps pages fast and has a full static fallback. Vendored/pinned dependencies only, no runtime SaaS/cloud inference.

### Scene 2 — Judge controls the evidence

- Integrate existing Signal Forge (PR #10), do not reimplement event creation, validation, SHA-256 or correlation.
- A visually designed mission-control control surface: slider/dial to set delay after denial; held-open duration; optional camera offline. Live preview of expectation while controls move, then **RUN INVESTIGATION** to derive the real ledger and case.
- Two explicit challenge presets: **299s / 120s → high severity case** and **301s / 119s → no correlated case**. A clear, elegant visual indication of *why* both constraints pass or fail.
- User may select a source in the floorplan to highlight corresponding event/time and see the inspector.
- The 2.5D scene and full source hashes must be driven by `verify(rows)`, `correlate(rows)`, `buildReconstruction(rows,case)` and actual `rows`, never by decorative hardcoded event data.
- Keep replay idempotency; Reset returns empty state; JSON export reveals exact source events and hashes.

### Scene 3 — Investigate as an operator

- Mode transitions **Building / Timeline / Evidence / Response** that are seamless and preserve state.
- Evidence Reconstruction from authentic Kiro PR #8 remains central: explain eligibility/exclusion, full source ID/hash, deterministic time ordering and case provenance with Play/Pause/Previous/Next/Restart/Speed/Slider.
- Layer a concise, buyer-centered **CASE BOARD** with “What happened?”, “Why was it linked?”, “What should an operator review next?” and a visual relation of devices.
- **Response** initially displays non-executing recommended review/notification workflow; any imagined multi-site/mobile actions belong in a single designated **PRODUCT VISION** area. No fabricated real camera images, real access actuation or implied live customer connection.
- Add a polished **before/after** reveal: fragmented raw alerts on the left → one explained investigation on the right. This is the memorable 15-second screenshot/movie moment.

### Scene 4 — Commercial vision

- Present premium **PRODUCT VISION** interfaces: operator mobile push alert, building floorplan/digital twin, multi-property situation center and escalation workflow. They are designed as concept screens consistent with the current product, and the explicit chapter title appears *once*, not as a disclaimer on every element.
- Clear benefits to building operators: less hunting through separate consoles, contextualized evidence, local data control, upgrade without ripping out existing infrastructure.
- A credible and verified InnerChispa product inquiry CTA (“Explore a pilot”, “Request a building assessment”). Use an existing verified website/contact destination, **never invent a phone number, address, email or price**.
- No mandatory log-in for judges and no unsolicited tracking, paid cloud dependency or external model API.

### Scene 5 — Presentation / guided showcase mode

- Add a **45–60 second guided showcase mode** within the actual application, recordable for the future sales film: 6–8 deterministic beats, based on the real synthetic event source, state and actual reconstruction, with cinematic but restrained pans, highlights, readable titles and play/pause/restart.
- Same results as normal manual use. No hidden scene scripting that circumvents the actual ledger.
- Expose a direct `?present=1` or well-labeled button (choose implementation consistent with current routing). Accessible, safe in a public browser. Use this for genuine product footage.
- Provide optional concise on-screen English text for later narration and subtitles; do not generate final AI videos inside Kiro.

## Visual design system and creative direction

- Premium architectural technology brand; dark near-black graphite, warm concrete/steel/teal accent, controlled lime evidence highlights, subtle amber risks and lavender provenance labels.
- Typography: strong editorial scale, readable small controls, spacious spatial hierarchy. Avoid neon overuse, “AI-glow everywhere”, emoji filler, repetitive identical cards.
- The hero and spatial lobby have foreground/midground/background depth; use purposeful material and illumination changes triggered by source events.
- Animations must express cause, not just motion: badge red → time advances → door amber → edge illuminates → corroborated high-priority case.
- Five-second glance clearly communicates customer problem and answer. All detailed hashes and technical data remain accessible on demand.
- Composition verified at 1440×900 desktop, 1280×720 video capture, 390px mobile and a small laptop layout.
- Responsive touch/keyboard/scroll/focus, reduced-motion safe path and contrast review; no horizontal overflow at 390px.
- Prefer one well-designed real interaction over ten unconnected concept mockups.

## Technical boundaries

- Existing `docs/index.html`, `docs/app.js`, `docs/styles.css`, `docs/engine.mjs`, `docs/correlator.mjs`, `docs/reconstruction.mjs`, `docs/reconstruction-view.mjs`, `docs/playback.mjs`, `docs/signal_forge.mjs`, test suites and existing Python backend are authoritative; inspect before editing.
- Keep GitHub Pages static architecture and relative asset links for `ghostbridge.innerchispa.us` plus original Pages fallback. Do not enable a new production API, tunnel, customer device link or local AMD exposure.
- Preserve original canonical event contract, exact threshold values (window 300s; held open ≥120s), UTC timestamps, case ID determinism, WebCrypto SHA-256 and Python/JS parity.
- Avoid global mutation, detached event listeners, duplicate browser renders and non-idempotent async animations. Use clean modules and tests.
- Limit media size and runtime weight; lazy-load spatial enhancement/animations, have static fallback, avoid runtime third-party dependencies when possible.
- Must not break original Night Watch (5/3), Normal Shift (4/0), Access Denied, Legacy Bridge (5/3/1), Signal Forge, data export, replay/reset, severity filters, local Python/SQLite backend or case hashes.

## Genuine Kiro features to STUDY and USE

1. **Spec-driven development:** in the real Kiro IDE session create/revise `.kiro/specs/immersive-control-room/{requirements.md,design.md,tasks.md}` and actively execute tasks. Include measurable EARS-style requirements and technical tradeoffs. This assistant-authored brief is not claimed as Kiro work.
2. **Steering:** create relevant, scoped project steering for GhostBridge visual design, local-first operation, source-of-truth ledger, and build limits. Demonstrate a real steering-driven decision in Kiro session notes.
3. **Hooks:** inspect existing `.kiro/hooks` and **confirm a bounded hook actually fires**, e.g. on save of `docs/*.js` or `docs/*.mjs` to trigger focused syntax or smoke tests. Record the trigger and output; no assertion of verified hook without observed execution. Do not create infinite recursion loops.
4. **Custom agents / subagents:** if the installed Kiro version supports them, define two scoped agents: `ui-director` (architecture/interaction/visual quality) and `qa-auditor` (regression/accessibility/performance/PR evidence). Use them on actual tasks and document the result, preserving a single branch owner.
5. **MCP or Power:** only activate an existing, relevant and trusted visual/browser testing integration if available. At least one genuinely used Kiro-specific capability beyond raw chat must have evidence. If unavailable, don't fabricate or install unknown services.
6. **Property-based tests or meaningful fuzzing:** feed randomized valid time gaps/door holds to Signal Forge and assert deterministic expected case/no-case behavior and idempotency for >100 cases (bounded, reproducible seed). Keep all old tests.
7. **Checkpoints / compare:** capture initial and final UI screenshot pairs, describe design decisions based on actual rendered observations, not just generated CSS.

## Bounded execution plan

**Milestone 0 — PR #10 intake and QA**
- Fetch latest origin/main and `feat/signal-forge-interactive`; inspect diff and CI. Never assume it's merged. Confirm current CI green.
- Execute actual Chrome tests using HTTP-served local preview (not file://) at 1440px/390px, 299/120 match and 301/119 no-match, full 2.5D reconstruction/source hashes, replay/Reset, keyboard, reduced motion, failure/tamper guards.
- Fix regressions ONLY on PR #10 branch if necessary and clearly separate authorship of patches. Keep it a draft until screenshot/report signoff. Do not force-push or merge.

**Milestone 1 — Genuine Kiro spec and design system**
- Checkout branch `feat/kiro-immersive-control-room` from validated Signal Forge head. Use Kiro to write `.kiro/specs/immersive-control-room/`; wire design tokens and a clickable visual skeleton. Do not build a second standalone app.

**Milestone 2 — Spatial flagship experience**
- Implement and test responsive environmental scene with actual events, selectable sources and smooth state-driven transitions; fallback without WebGL.
- Build real Signal Forge to spatial view integration and visually meaningful positive/negative outcome.

**Milestone 3 — Operator investigation and product vision**
- Deep-link source/evidence states, actual case board, optional non-executing recommendations, before/after reveal. Product Vision screens visible as a single separate section.

**Milestone 4 — Presentation mode and polish**
- 45–60s guided interactive showcase based on genuine ledger events; elegant typography, focus/accessibility, performance/bundle checks, self-contained visual assets.

**Milestone 5 — Verification and delivery**
- Run full existing Python/Node suites, all new tests, syntax checks and Pages build gates (the existing verified baseline is 324 checks, PR #10 adds 17 Node and 1 syntax check; latest branch CI is currently green).
- Playwright/Chrome desktop/mobile QA plus visual inspection of real screenshots; record any limitations, console errors, network requests, failed cases, accessibility/reduced motion.
- Test 299/120, 300/120, 301/119, 299/119, normal/noncase, duplicates, reset, tamper, Python parity and browser persisted state.
- Screenshot/video evidence: real screenshots of desktop hero, 390px mobile, Signal Forge pass/fail and actual case reconstruction. Genuine Kiro IDE screenshots show actual spec/hook/custom-agent work (do not mislabel browser shots).
- Open stacked PR targeting `feat/signal-forge-interactive` with clear authorship, demo media links, test counts and credit usage. **STOP BEFORE MERGE.**
- Document authentic Kiro IDE work and credit usage in `docs/KIRO_EVIDENCE.md`. The Kiro promotional credit was redeemed but its remaining balance is unknown from GitHub. Report amount displayed in actual account UI if available. Do not purchase paid plan or call external inference unexpectedly.

## Definition of done

A first-time judge can:
1. Enter https://ghostbridge.innerchispa.us/ (once safely deployed after review).
2. See a compelling responsive spatial building UI that explains product value immediately.
3. Choose **Forge an incident** and set 299 seconds delay / 120 seconds hold → actually generate a high-priority correlated case, inspect original source hashes and open authentic Kiro 2.5D reconstruction.
4. Switch to 301 seconds / 119 seconds → receive no correlated case, with a clear explanation.
5. Run **Showcase Mode** and understand the business value in under 60 seconds.
6. Examine source, evidence and honest roadmap while maintaining functional parity with previous builds.

**Commercial output:** This isn't just a hackathon stunt. Make the product visibly valuable to an operations manager, ready for a future paid pilot and professional product demo.

**Contest timeline:** Friday 2026-12-04 14:00 Pacific / 17:00 Ecuador. Devpost submission and final commercial film are separate stages and require owner approval. Current main/live page must remain stable throughout this development.
