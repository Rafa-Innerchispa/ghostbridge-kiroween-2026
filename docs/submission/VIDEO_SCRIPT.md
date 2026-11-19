# Demo video: storyboard, script and recording plan (final)

Status: **script and plan only. The video has not been recorded.** Target length **2:45** (allowed 2:30 to 2:50; Devpost hard limit 3:00). English narration plus English captions.
Footage: the real app at https://ghostbridge.innerchispa.us/ (after PR #17 and the Phase 8 PR are published), a real terminal, and the real Kiro IDE. No mocked tool runs, no stock footage of real buildings, no unlicensed music, no unrelated logos.

## Recording setup
- Screen: **1920 x 1080**, browser window **1440 x 900** centred, zoom 100 %, dark OS theme, bookmarks bar hidden, notifications off. Export **1080p, 30 fps**.
- Terminal: dark theme, font 18 pt, current folder `Downloads`, prompt shortened (no user name, no paths).
- Kiro IDE: hide the user name, account and chat history; show files, the MCP panel and the Powers panel only.
- Press **Reset** before each take. Challenge A always produces `case:cfd83deb8d3af576`.
- Transitions: straight cuts or 6-frame crossfades only. No zooms faster than 1 s, no whooshes, no glitch effects.
- Optional music: silence or a licensed, quiet ambient track at about -28 LUFS under the voice.

## Storyboard and script

| # | Time | Duration | Record this | Narration | Must be visible |
|---|---|---|---|---|---|
| 1 | 0:00–0:14 | 14 s | Hero, still; cursor rests on the four source markers | "A door relay, a card reader, a camera. Old building systems that never talk to each other. At night, an operator sees separate alarms and has to guess which belong together." | *Browser lab · synthetic data* pill |
| 2 | 0:14–0:24 | 10 s | Click one source in the strip; inspector shows its last event and hash | "GhostBridge brings those signals back to life, and seals each one in a SHA-256 chain." | A hash in the inspector |
| 3 | 0:24–0:46 | 22 s | **Challenge A**; let the scene play to the case link; pause on Rule check | "One readable rule: a rejected badge, then a door held open within five minutes. Two hundred ninety-nine seconds and one hundred twenty: one case. The link appears only once the door has really been held open." | Rule check "1 s inside", "0 s above"; case chip |
| 4 | 0:46–0:58 | 12 s | **Challenge B** | "One second later, one second shorter: no case, and GhostBridge says exactly why." | "1 s outside", "1 s below" |
| 5 | 0:58–1:16 | 18 s | Challenge A again; **Timeline**; Time Machine beats 2, 3, 4, 6 | "Replay the incident beat by beat. Every moment comes from the ledger, and computed times say so." | *Derived UTC time* label |
| 6 | 1:16–1:34 | 18 s | **Evidence** → Trust Lab: row 2, Timestamp, **Tamper a copy**, then **Restore** | "Try to change the past. Edit one record in a copy: the chain breaks at that exact row. The original stays verified." | Red *Altered copy: fails at row 2* |
| 7 | 1:34–1:52 | 18 s | **Your own log** → Use the template → change `22:02:59` to `22:03:01` → Check → Import → case disappears; change back → case returns | "Don't trust our data. Bring your own log. It never leaves your browser, and the same rules decide." | "4 events ready to import"; cases count changes |
| 8 | 1:52–2:12 | 20 s | **Seal this ledger** → Download receipt; **Export evidence JSON**; cut to terminal: `python verify_evidence.py ghostbridge-evidence.json --receipt ghostbridge-receipt.json` → `VERIFIED` and `RECEIPT OK`; edit one character in the JSON, run again → `NOT VERIFIED: row 2` | "And don't trust our code either. Seal the ledger, take the receipt and the export, and verify them on your own machine with a short script that has no GhostBridge code in it." | Both terminal results |
| 9 | 2:12–2:32 | 20 s | Kiro IDE: `.kiro/specs/…/requirements.md` (2 s), `.kiro/steering/control-room.md` (2 s), a qa-auditor finding (3 s), Powers panel with **GhostBridge Evidence Power**, then a Kiro chat answering "Why does 301 and 119 not form a case?" through the power's `forge_boundary` tool (10 s) | "Built with Kiro: specs and steering set the rules, a custom UI agent built these views, an independent QA agent found real defects, and our own Kiro Power lets Kiro audit the evidence through the real engine." | Real tool call result on screen |
| 10 | 2:32–2:45 | 13 s | Response mode → **Connect the signals**; end card | "From disconnected alarms to one explained incident, with evidence anyone can verify. GhostBridge: the building that remembers." | End card: name, URL, info@innerchispa.us, "Synthetic demo data. No hardware integration claimed." |

Scene 9 must only be recorded after the Power is installed and actually answers in Kiro. If it is not installed, replace the Power part with the MCP panel and say "our own MCP server" instead of "our own Kiro Power".

## Screenshots for the storyboard
Current captures to match the shots: `docs/evidence/premium/after/1440-*.png` (scenes 1 to 6, 10) and `docs/evidence/phase8/*.png` (scenes 7 and 8).

## Before publishing
- [ ] Every number spoken matches the screen (299/120, 301/119, row 2, case id).
- [ ] No personal names, paths, tokens, e-mail inboxes or account pages visible.
- [ ] Music licensed or absent.
- [ ] Length between 2:30 and 2:50; public on YouTube; captions in English.
