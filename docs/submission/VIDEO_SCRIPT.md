# Demo video: script and capture plan (target 2:40, hard limit under 3:00)

Draft for the owner. Do not publish without approval. All footage must be the real app (browser) and the real Kiro IDE; no mocked tool runs. No third-party music unless licensed; no unrelated logos.

| Time | Picture (what to capture) | Narration / caption (English) | Evidence behind the claim |
|---|---|---|---|
| 0:00 to 0:20 | Hero: "When buildings start talking", the dark facade. | "Older buildings still run on relays, card readers and cameras that never talk to each other. A night shift sees five separate alarms and has to guess which ones matter." | Synthetic scenario `night`; no real building. |
| 0:20 to 0:45 | Control Room, the four source markers, Building mode; click a source to show its ledger hash. | "GhostBridge listens to those old signals, records every one in a SHA-256 chained ledger and shows the building as it was, moment by moment." | `deriveScene` is a pure function of the ledger. |
| 0:45 to 1:15 | Challenge A (299 s / 120 s): link draws when the door has been held 120 s. Then Challenge B (301 s / 119 s): no link; text "1 s outside the window, 1 s below the threshold". | "One rule: a rejected badge, then a door held open within five minutes. At 299 seconds and 120 seconds it is one incident. One second later, and one second shorter, it is not, and GhostBridge says exactly why." | Correlator; Python/JS parity on 100 configs. |
| 1:15 to 1:45 | Timeline mode, Incident Time Machine: step beats 2, 3, 4, 6 (scene follows). Evidence mode, Trust Lab: tamper row 2 in a copy; "Altered copy fails at row 2; original verified 3 of 3". | "Step through the incident beat by beat. Then try to change the past: alter one record in a copy and the chain breaks at that exact row, while the real ledger stays untouched." | `time_machine.mjs`, `trust_lab.mjs`, 159-check browser QA. Show the "derived" label on beat 4 time. |
| 1:45 to 2:15 | Kiro IDE: `.kiro/specs`, steering file, the hook firing log, the sub-agent run list (ui-director / qa-auditor), the QA report finding and the fix. | "Built with Kiro: specs and steering shaped every rule; a custom UI agent built the views and an independent QA agent found a real focus bug, which was fixed and re-audited. Hooks guard every command and re-run tests on save." | `docs/evidence/agentic-validation/`. Only show MCP if it is connected in Kiro by then; otherwise say "an MCP server is included and tested". |
| 2:15 to 2:40 | Response mode: "Disconnected alarms to one explained incident"; Product Vision chapter; closing card with `info@innerchispa.us`. | "From disconnected alarms to one explained, verifiable incident. Today a working proof of concept on synthetic data; next, adapters for real legacy panels. GhostBridge: the building that remembers." | Vision chapter is labelled as concept. |

## Capture checklist
- 1440x900 browser window, dark OS theme, zoom 100 %, notifications off.
- Reset the lab before each take (Reset button), so the ledger is deterministic.
- Record the Showcase Mode run (`?present=1`) as a B-roll fallback (about 58 s).
- Captions burned in or a YouTube caption file, English.
- Do not show the Windows user name, file paths with personal folders, tokens or email inboxes in the Kiro footage.
