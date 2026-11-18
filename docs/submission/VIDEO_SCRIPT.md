# Demo video: storyboard, script and recording plan

Target length **2:40** (hard limit under 3:00). English narration with burned-in or uploaded English captions.
Footage must be the real app at https://ghostbridge.innerchispa.us/ and the real Kiro IDE. No mocked tool runs, no stock footage of real buildings, no third-party music unless licensed (silence or an original or royalty-free licensed track). No unrelated logos.

## Storyboard and script

| # | Time | Picture | Narration (English) | Proof on screen |
|---|---|---|---|---|
| 1 | 0:00–0:15 | Hero of the live site, still. Slow cursor move to the four source markers. | "A door relay, a card reader, a camera. Old building systems that never talk to each other. At night, an operator sees separate alarms and has to guess which ones belong together." | Header pill: *Browser lab · synthetic data* |
| 2 | 0:15–0:30 | Hover the source strip; click one source to show its last recorded event and hash. | "GhostBridge listens to those old signals, seals each one in a SHA-256 chain, and shows the building exactly as the record says." | Hash visible in the inspector |
| 3 | 0:30–0:55 | Press **Challenge A · 299 s · 120 s**. Let the scene play: reader *Access denied*, door opens, link appears only after 120 s. Pause on the Rule check. | "One readable rule: a rejected badge, then a door held open within five minutes. Two hundred ninety-nine seconds and one hundred twenty seconds: one case. And the link appears only when the door has really been held open." | Rule check: 1 s inside, 0 s above; case chip with id |
| 4 | 0:55–1:10 | Press **Challenge B · 301 s · 119 s**. | "One second later, one second shorter: no case. GhostBridge says exactly which condition failed, and by how much." | "1 s outside the 300 s window", "1 s below the 120 s threshold" |
| 5 | 1:10–1:35 | Challenge A again. **Timeline**, step the **Incident Time Machine** through beats 2, 3, 4 and 6. | "Replay the incident beat by beat. Every moment comes from the ledger. Where a time is computed from the rule, it says so." | Building follows each beat; *Derived UTC time* label on beat 4 |
| 6 | 1:35–2:00 | **Evidence** → **Verify chain**. Then **Evidence Trust Lab**: row 2, Timestamp, **Tamper a copy**. Then **Restore**. | "Now try to change the past. Edit one record in a copy, and the chain breaks at that exact row. The original stays verified." | *Altered copy: fails at row 2*; stored vs recomputed hash; *Original ledger: verified 3 of 3* |
| 7 | 2:00–2:25 | Cut to the Kiro IDE: `.kiro/specs/immersive-control-room/requirements.md`, `.kiro/steering/control-room.md`, the hooks folder, then `docs/evidence/phase6/qa-auditor-phase6.md` open on a finding, then the Kiro MCP tool list with `ghostbridge-evidence`. | "Built with Kiro. Specs and steering set the rules. A custom UI agent built these views; an independent QA agent found real defects, and they were fixed and re-audited. Hooks guard every command. And Kiro checks the evidence itself through our own MCP server." | Only real files and the real MCP panel |
| 8 | 2:25–2:40 | Response mode: **Connect the signals** (before/after). End card. | "From disconnected alarms to one explained incident, with evidence you can verify. Today on synthetic data; next, adapters for real panels. GhostBridge: the building that remembers." | End card: name, URL, *info@innerchispa.us*, "Synthetic data. No hardware integration claimed." |

## Recording plan

1. **Setup:** Chrome, window 1440 x 900, zoom 100 %, dark OS theme, bookmarks bar hidden, notifications off. Close other tabs.
2. **Reset** the lab before each take so the ledger and case id are deterministic (`case:cfd83deb8d3af576` for Challenge A).
3. **Record per scene** (1 to 8) as separate clips; 2 to 3 takes each. Keep the cursor slow and still while narration explains.
4. **Kiro IDE clip (scene 7):** hide the Windows user name and any personal paths, tokens, inboxes or account pages. Show files, not the chat history.
5. **Fallback B-roll:** a full Showcase Mode run (`?present=1&autoplay=1`, about 58 s).
6. **Captions:** English, burned in or uploaded to YouTube as a caption file.
7. **Edit:** cut to 2:40, check every number spoken matches the screen, export 1080p, upload to YouTube as **Public**, then paste the URL into Devpost.

## Before publishing, check
- [ ] Every on-screen number matches the narration (299/120, 301/119, row 2, case id).
- [ ] No personal information, tokens or private repositories visible.
- [ ] Music is licensed or absent.
- [ ] Video is public and under 3:00.
