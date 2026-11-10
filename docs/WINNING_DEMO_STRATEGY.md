# GhostBridge — Kiroween 2026 competitive demo strategy

**Status:** Proposed production/development plan, NOT completed features or recorded media. Prepared 2026-11-09 after comparing the project against the official five judging criteria (Potential Impact, Technological Implementation, Design, Innovation/Idea, Presentation). The goal is a **compelling, truthful end-to-end demonstration**, not cosmetic animation.

**Working title:** **GHOSTBRIDGE — The Building That Couldn't Talk**
**Tagline:** *Five signals. Two incompatible sources. One story.*

## Why the existing demo may struggle to win

The code is credible: merged Kiro contributions (PR #2/#4/#5), Python/JS parity, two normalized adapter formats, synthetic multi-source case and 239 passing checks on the reviewed PR #5 head. But the public product still looks primarily like a technical lab with mock inputs. A polished film alone would improve Presentation but not prove Impact or a complete product experience. A judging video must show the actual running application, the Kiro contributions, and an understandable buyer outcome.

Do not promise a win. We can maximize credibility and the distinctiveness of this entry.

## One clear buyer problem

A property security supervisor receives separate events: access denied, relay-contact door open, and potentially camera health. Each system logs its own facts. Staff discover a causal pattern too late. GhostBridge creates a **derived case** with the two original event IDs, UTC timestamps, 270s separation, 130s held-open duration and original SHA-256 evidence hashes. The prototype is synthetic; physical integration is a separately scoped proof of concept.

## P0 | Build *Evidence Reconstruction* (genuine product feature, not a fake video overlay)

Create a separate optional **Case Reconstruction** experience in the real app, backed exclusively by **verified ledger rows**. Use lightweight responsive SVG/CSS or Canvas, existing vanilla JS, no subscriptions or stock video dependencies.

- **One-screen illustrated 2.5D floor plan** of a generic synthetic entryway with source lanes (access-reader, relay contact, optional camera offline); animate only actual recorded events. Treat a visual camera as a labeled source **icon**, not invented CCTV footage.
- **Timestamped, controllable reconstruction timeline** (play/pause/step, reduced-motion option). A denial appears at 22:00:30Z. A nonmatching earlier door-open at 22:00:00Z is correctly excluded. The matching 22:05:00Z door-open held 130 seconds creates one case. Explicitly show the 270-second correlation and 300-second window. Time compression, if used, must be clearly labeled.
- **Evidence drawer**: selecting any node reveals real case/event IDs and the corresponding original ledger hash. Must highlight *why* the correlation was made and why another candidate was rejected.
- **Outcome**: five synthetic events, three standalone incidents, one derived high-severity correlated case. No additional fake events or inferred camera frames.
- Always display **SIMULATED / OFFLINE FIXTURE REPLAY** on the public site. The live Python edition must use its normal API and verified SQLite ledger.
- Existing export, filter, replay, reset, old scenarios, case IDs, SHA-256 fixtures and accessibility must remain stable.
- Responsive at desktop 1440 px and mobile 390 px; keyboard accessible, visible focus, optional sound muted by default, respect `prefers-reduced-motion`.
- Tests: verify rendered reconstruction matches the verified ledger (not hardcoded labels), positive/negative cases, replay/reset, hash links, reduced motion, no network requests or private data, and CI/Pages successful. Record actual screenshots and a real browser QA run.

### Optional P1 | Authentic isolated hardware bench (ONLY if it can be tested)

Use an available **Raspberry Pi with a 3.3V dry-contact magnetic/reed sensor** as an isolated demo source, with GhostBridge running locally on the Pi or an isolated local machine. Generate true door open/close observations and timestamps using a **separate adapter**. A denied-access event may remain explicitly **synthetic** from the existing JSON fixture. Do NOT connect mains voltage, production gates, customer readers, DVR/NVRs, or modify InnerOS.

To demonstrate the real ≥120s held-open rule, measure a real hold or show a properly labeled accelerated replay of an actually recorded >=120s bench event. Do not silently change thresholds or claim two real devices when one is simulated.

Keep this on a separate PR and defer if parts, safety, or testing are blockers. It is an enhancement, not a requirement for truthful video completion.

## Kiro use that genuinely raises technical judging quality

The existing authentic Kiro IDE work includes specification-driven implementation. In the NEW feature, additionally use **one useful steering rule** to enforce synthetic/production separation and evidence immutability, and **one bounded automated hook** to run focused tests on changes or before handoff, only if Kiro officially supports the workflow in the owner's IDE version. Record actual config, Kiro session and observable execution. Do not install random MCP servers or fabricate a Kiro Crew app to chase points.

Keep Kiro work bounded and cost-controlled. Original baseline remains attributed to Codex; original Kiro PRs and reviewer fixes retain distinct provenance.

## Video: ~2:45 English, cinematic visual storytelling

**No long talking-head introduction. Narration over the real product, staged local footage, and screen recordings.**

| Time | Picture / truthful source | Voice-over core message |
|---|---|---|
| 0:00–0:12 | Dramatic, clearly labeled **STAGED REENACTMENT**: empty corridor, badge-reader light turns red, door ajar, separate event logs | “A rejected access. A door left open. Two systems. Neither sees the whole story.” |
| 0:12–0:28 | Split-screen recreation of the isolated logs, then genuine browser screen | “In older buildings, a supervisor has to piece it all together.” |
| 0:28–0:55 | **Real screen recording** of GhostBridge: reset, Legacy Bridge Demo, five signals, three incidents, one case | “GhostBridge normalizes incompatible legacy formats and reconstructs a single explained case.” |
| 0:55–1:30 | **Real Evidence Reconstruction feature**, with actual events, source IDs, 270s linkage, timestamp and chain hashes | “The first door event happened before the denial, so it is excluded. The later held-open door matches. The evidence never changes.” |
| 1:30–1:52 | Verify chain, export JSON, idempotent replay, quick mobile view | “Operators can inspect and verify the full chain without sending client data to the cloud.” |
| 1:52–2:19 | **Authentic Kiro IDE/PR/session footage**, specs, steering/hook execution if actually implemented, GitHub green checks | “We used Kiro to build the filter, adapters, correlation and reconstruction, with independent review and reproducible tests.” |
| 2:19–2:40 | Optional **actual bench hardware** if implemented, or a clear realistic operator-workflow summary if not | “Here is how existing infrastructure can gain a shared evidence layer without wholesale replacement.” |
| 2:40–2:52 | Final result, logo, repo/live-demo address, synthetic-only limitations | “GhostBridge: Old signals. New instincts.” |

**Editing style:** professional documentary/tech-thriller, clean typography, restrained sound design, picture-in-picture real UI and camera footage, slow/fast cuts matched to understanding. Use OBS + DaVinci Resolve/Kdenlive + Blender SVG/2.5D as local/free choices. The film **cannot replace** the real working web demo and must not falsely pass AI-generated reenactments off as customer footage.

## Product proof checklist

- [ ] True browser runtime (not a mock) shows the new reconstruction using current verified ledger.
- [ ] Generic graphic never depicts nonexistent devices, people, camera feeds, or customer locations as real.
- [ ] All event references, hashes and counts agree with the exported ledger.
- [ ] Legacy Bridge Demo replays without duplication and original scenarios still work.
- [ ] GitHub CI, GitHub Pages, local Python tests and desktop/mobile interaction QA verified.
- [ ] A genuine Kiro IDE screen capture shows use of spec plus one new relevant Kiro feature (if implemented).
- [ ] Actual footage/visuals properly label reenactment, synthetic input or hardware bench.
- [ ] Video includes real working end-to-end demonstration, finished in under 3 minutes.
- [ ] Project remains local-first, no production endpoints or extra inference dependencies.
- [ ] Devpost is edited/submitted only with explicit owner permission.

## Concrete next task

Implement **Evidence Reconstruction** in a fresh Kiro IDE branch `feat/evidence-reconstruction`. Begin with a concise new spec in `.kiro/specs/evidence-reconstruction/`, then the real UI, tests, and a reviewable PR. Stop before merge. An isolated hardware bench remains optional, independent and never blocks the real app demo.

Official Kiroween deadline is 2026-12-04 at 14:00 Pacific / 17:00 Ecuador. Development should finish well before submission to preserve enough time for genuine filming, QA and form completion.
