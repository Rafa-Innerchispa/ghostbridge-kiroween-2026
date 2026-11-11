# When Buildings Start Talking: What Kiro Taught Us About Building GhostBridge

**By InnerChispa LLC | Kiroween 2026 | Draft for publication on a third-party blog platform**

> A rejected badge. A door held open. Two independent systems recording facts that an operator must connect.

At 10:00 p.m., a security reader rejects a credential. Minutes later, a relay reports that a nearby door has remained open. On many properties these observations live in separate systems, separate dashboards and separate export files. Neither device knows the other exists. The person monitoring the building is expected to make sense of it.

We built **GhostBridge** to explore a different possibility: give legacy signals a common language, derive explainable incidents and let an operator inspect the original evidence. Our starting point was deliberately modest: deterministic rules, synthetic source data, local storage, and transparent hashes. Then **Kiro** helped us turn the idea into a more capable, testable product.

This is a story about the value of structured agentic development, but also about something less glamorous: learning when an AI agent should *not* guess.

## Frankenstein, but with operational purpose

Kiroween's Frankenstein challenge rewards bringing incompatible pieces together. Buildings have been doing that accidentally for years. Door relays, access controllers, camera-health APIs, attendance readers and older network gear all report different observations in different formats.

GhostBridge demonstrates the integration pattern with synthetic CSV relay data and JSON access-controller decisions. Both enter the same event contract. A local SHA-256-linked ledger keeps the source record history inspectable. An incident engine applies transparent thresholds. A cross-source correlator adds context.

In the canonical example, access `A001` is denied at 22:00:30 UTC. Relay `R003` reports a door held open for 130 seconds at 22:05:00 UTC. The 270-second gap is inside the 300-second window; the hold exceeds the 120-second threshold. One high-priority correlated case results. An earlier relay event at 22:00:00 is not paired because it happened **before** the denial.

Crucially, the engine can explain both decisions.

## From an initial prototype to Kiro-built capabilities

We started the original GhostBridge lab with Codex/ChatGPT before the main Kiro feature sessions. The initial event ledger, Python/SQLite architecture, browser simulator and early project planning were not authored by Kiro. Keeping those origins explicit makes the genuinely new work easier to evaluate.

Using **Kiro IDE Autopilot and spec-driven development**, we built four substantive contributions, each in a reviewed GitHub pull request:

**1. Severity filtering (PR #2).** Kiro added All/High/Medium views with accessible controls and focused regression tests. The important constraint was that filtering must never change the evidence ledger.

**2. Legacy adapters (PR #4).** Kiro built a strict relay CSV importer and normalized JSON access webhook with fixtures and test coverage. The adapters turn different input shapes into a common contract. They are software adapters for synthetic input, not claims of live production wiring.

**3. Cross-source cases (PR #5).** Kiro implemented corresponding Python and JavaScript correlators, stable case identifiers, source-record hashes and a read-only `/api/cases` endpoint. The browser-only replay made the capability easy for a judge to explore with no credentials.

**4. Interactive Evidence Reconstruction (PR #8).** Kiro transformed case inspection into a visual, ledger-derived scene: a stylized 2.5D entrance with Play/Pause/Step controls, a timeline, excluded candidates, a “Why this matches” explanation and full source SHA-256 references. A corrupted ledger or forged case should not be shown as a valid reconstruction.

The last merged phase passed **159 Python tests, 157 Node tests and eight JavaScript syntax checks** in CI. Automated browser checks were also reported during the Kiro session. Those numbers mean little without the underlying design discipline, but they do give reviewers reproducible evidence that the software remained stable as its behavior evolved.

## The biggest lesson: specifications beat repeated guessing

At first glance, a spec can feel slower than simply asking an assistant to code. The opposite became apparent once we needed Python and JavaScript parity, deterministic time windows, tamper refusal and a UI that had to remain synchronized with the evidence.

The distinction was not “more documentation.” It was **testable invariants**: a 300-second boundary must not move; a source event must not become a fabricated case; a replay must not duplicate the underlying record; a visual label must come from the ledger rather than a hardcoded story.

Kiro's steering documents reinforced these conventions throughout implementation. We also configured a bounded on-save test hook; during that phase its firing was not independently observed, so we describe it as configured rather than verified. An independent review found and fixed some issues after Kiro's original work, with those fixes attributed separately in the repository.

The practical lesson is that agents are most valuable when they operate within an explicit contract, and reviews can challenge that contract instead of merely admiring the generated code.

## Why local-first architecture matters

Security evidence is sensitive operational data. We wanted an architecture where a judge can run the entire scenario in a browser and an operator can run a Python/SQLite edition locally without an external inference service.

The current prototype uses synthetic data. A hash chain provides local consistency checks, not an external legal trust anchor or a guarantee of intrusion prevention. That is intentional: our first obligation was to make the core evidence path understandable and testable.

It also provides a strong foundation for the commercial product vision: genuine building adapters, device-health overlays, mobile incident response, site-level digital twins and multi-property operational oversight. Those are future stages, and we are designing a visual product experience to explain how they fit together.

## What we're learning next

A good demo should not depend on a memorized sequence. We are exploring a **Signal Forge** interaction in which an operator changes the time gap or the door-open duration and immediately discovers whether a real correlation rule qualifies. This feature is in an independently authored draft PR, not yet part of the publicly released baseline.

The next level is a full **Control Room** that turns raw alarms into an intuitive investigation surface, without losing the exact evidence beneath it. We are also exploring Kiro Crew for persistent, locally hosted task automation and a potential installable GhostBridge Crew app.

We are interested in more than a competition entry. An operations manager should be able to see how the same software could reduce time spent searching across unrelated security systems, while retaining local control over their data.

## Explore the project

- **Public interactive application:** https://ghostbridge.innerchispa.us/
- **Open-source repository:** https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026
- **Authentic Kiro contribution evidence:** https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/blob/main/docs/KIRO_EVIDENCE.md
- **Project page:** https://devpost.com/software/ghostbridge-old-signals-new-instincts

**GhostBridge — Old signals. New instincts.**

*Publication note: Publish this article on a public third-party blog platform during the Kiroween 2026 submission period (October 30–December 4, 2026). After publishing, copy the permanent article URL into the Devpost Bonus Blog Prize field. This GitHub draft itself is not the bonus eligibility proof.*
