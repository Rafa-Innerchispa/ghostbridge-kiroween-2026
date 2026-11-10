# GhostBridge | Kiroween 2026 final demo video storyboard

**Status:** Script ready for real recording. **No new video or genuine Kiro footage has been captured by this document.**  
**Goal:** 2:40–2:55 total, narrated English, 16:9 1080p. Never exceed the contest's video limit.  
**Project:** GhostBridge: Old Signals, New Instincts | Frankenstein | InnerChispa LLC.  
**Source:** https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026  
**Demo:** https://rafa-innerchispa.github.io/ghostbridge-kiroween-2026/  
**Evidence:** https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/blob/main/docs/KIRO_EVIDENCE.md

## Narrative and real on-screen recording plan

**0:00–0:18 | The problem / founder**  
*Visual:* Real presenter intro; lower third: “InnerChispa LLC · GhostBridge · Kiroween 2026.”  
*Voice:* “Older buildings run on layers of technology: relay contacts, access readers, presence sensors, and cameras. Their signals rarely tell one coherent story. GhostBridge is a local-first approach to connecting them.”

**0:18–0:37 | What we built**  
*Visual:* Live site hero, synthetic source cards, processing stages.  
*Voice:* “This is a reproducible, open-source synthetic lab, not a production surveillance system. It normalizes legacy-shaped events, applies explainable rules, and preserves a local, inspectable evidence chain. No cloud model or customer hardware is needed.”

**0:37–1:27 | The most compelling feature: multi-source case**  
*Visual:* On the **real deployed site after QA**, click **Reset lab**, then **Legacy Bridge Demo**. Show five events, three individual incidents, and one derived high-severity correlated case. Open the case inspection so full event IDs and hashes are visible. Then show full evidence timeline and hash verification; click **Replay last** and verify zero duplicate events and one case.  
*Voice:* “Two independent adapters bring in synthetic relay CSV signals and access-controller JSON events. Here, access A001 was rejected. Four minutes and thirty seconds later, relay R003 reports a held-open door. GhostBridge correlates those sources into one high-severity case, with the original event IDs and SHA-256 record hashes. A separate earlier door event is excluded because it happened before the access rejection. Replay creates no duplicate evidence.”

**1:27–1:52 | Baseline scenarios, filtering, and safe export**  
*Visual:* Reset and run Night Watch, All / High / Medium (3 / 2 / 1); briefly show export and normal shift (4 / 0).  
*Voice:* “Independent event rules still work. Severity filtering changes only what you see, never the underlying ledger. You can inspect, export, and verify the source evidence. A normal shift produces no incidents.”

**1:52–2:28 | Authentic Kiro use and engineering discipline**  
*Visual:* Genuine Kiro IDE screen or genuine previously captured session image; `.kiro/specs/legacy-bridge-correlation/`; open merged GitHub PRs [#2](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/2), [#4](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/4), [#5](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/pull/5); show a **real** passing CI run and evidence provenance.  
*Voice:* “We used Kiro IDE Autopilot and spec-driven development to add severity filtering, two legacy-source adapters, and Python and JavaScript correlation. The original lab was created earlier with Codex, and our repository attributes contributions transparently. Independent review caught integration bugs before merging. The reviewed build passed 159 Python tests, 75 JavaScript tests, and five syntax checks in GitHub Actions.”

**2:28–2:52 | Limitations, value, and closing**  
*Visual:* One correlated case linking two original evidence entries, then logo and repo URL.  
*Voice:* “The current demo uses only synthetic data, and its SHA-256 chain checks local consistency, not legal immutability. Real hardware and production integrations remain future work. But the idea is simple: let old systems speak a common language, and turn disconnected signals into evidence people can understand. GhostBridge, by InnerChispa.”

## Before recording: mandatory checks

- [ ] Live public GitHub Pages site anonymously serves the merged PR #5 commit, with no missing modules, CORS or console errors.
- [ ] In a clean session, Legacy Bridge Demo produces **5 events, 3 individual incidents and 1 correlated case**; inspect links to `access:A001` and `relay:R003` and their actual source-record hashes.
- [ ] Replay last adds zero events; Reset returns to zero and restores All filter.
- [ ] Verify normal shift and Night Watch controls, evidence chain, JSON export and tamper test.
- [ ] Check desktop and mobile 390px for clipping, button accessibility, legibility and responsive presentation.
- [ ] Capture genuine Kiro IDE footage or screenshot from the owner's actual session. No counterfeit session imagery.
- [ ] Use only public synthetic fixture data; mask browser profile details, GitHub credentials, Kiro coupon URLs, personal documents and local IPs.
- [ ] Narrate or record the **real application**, not mockups. Screen-capture artifacts from earlier isolated QA are supplemental B-roll only and must be labeled as such if used.
- [ ] Confirm actual rendered duration under the contest limit and publish a permitted YouTube URL.
- [ ] Do not claim Kiro authored the original Codex MVP, independent ChatGPT reviewer patches, or physical device integration.
- [ ] Devpost edits and final submission require owner authorization.

**Current truth:** PRs #2/#4/#5 are merged. The 239 checks passed on the reviewed PR #5 head. Live anonymous-browser QA, the actual final video and the contest submission are not yet verified complete.
