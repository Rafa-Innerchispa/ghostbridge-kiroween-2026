# Milestone 5: Control Room real-browser QA

**141 passed, 0 failed, 141 checks.**

**Harness retries:** 0

**Scenarios:**   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: )

Headless Chrome over CDP. Browser-only mode is served from 127.0.0.2; local mode is the real Python + SQLite server on a throwaway database. Each scenario runs on a fresh browser.

**Measurements**
- Idle page: 2377 DOM nodes, 1.8 MB JS heap, 250 KB of subresources, load 204 ms.
- Forge drawer at 1440x900: content overflow 0px.
- Showcase observed timeline (seconds from Play): {"beat1":0.4,"denied":6.2,"door":14.1,"held":26.9,"case":26.9,"recon":32.4,"evidenceMode":42.2,"responseMode":48.1,"joined":49.3,"vision":53.8,"done":58.4}; total 58.4 s.
- Measured text contrast (computed colour vs nearest solid background): source name 7.81:1, source time 9.49:1, tab hint 19.94:1, lede 17.23:1, gauge note 7.71:1, board answer 13.76:1, vision paragraph 7.85:1, outcome text 7.85:1, fine print 8.13:1, challenge note 6.41:1. Sampled elements only, not every pixel; gradients and the scene are not measured.

**Limits:** one browser engine (Chrome); 390 px is device emulation, not a real phone; contrast is sampled, not exhaustive; no screen reader was used.

| Result | Check | Detail |
|---|---|---|
| PASS | S1.1 hero headline, subline and two primary actions are present |  |
| PASS | S1.2 Showcase Mode button is present |  |
| PASS | S1.3 the scene has 5 depth layers, 4 source markers and 4 source buttons | layers=5 markers=4 nodes=4 |
| PASS | S1.4 empty ledger: building idle and quiet | {"reader":"idle","door":"closed","camera":"unknown","presence":"idle","link":"none","kase":"off","idle":"true","selected":""} |
| PASS | S1.5 empty-state caption invites action |  |
| PASS | S1.6 primary actions and the source strip are inside the first 900 px | cta.bottom=539 strip.bottom=877 |
| PASS | S1.7 the headline does not overlap the building (text column ends before the facade starts) |  |
| PASS | S1.8 both fonts are loaded from the vendored files | {"sg":true,"dm":true,"loaded":["DM Sans","Space Grotesk"]} |
| PASS | S1.9 ZERO third-party requests (no Google Fonts, no CDN) | [] |
| PASS | S1.10 no failed requests at all, including the favicon | [] |
| PASS | S1.11 light page: under 3000 DOM nodes, under 80 MB heap, under 1.2 MB of subresources | 2377 nodes, 1.8 MB, 255810 B |
| PASS | S1.12 Tab moves door -> reader with a visible focus ring | {"node":"reader","outline":"solid","w":"3px"} |
| PASS | S1: no console errors or exceptions |  |
| PASS | S2.1 Forge opens INSIDE the stage beside the building, rule gauges docked with it, headline hidden | {"inDrawer":true,"rulesInDrawer":true,"copy":"hidden","forge":"true"} |
| PASS | S2.2 the existing Signal Forge composer is reused (same controls, same ids) |  |
| PASS | S2.3 live forecast at 301/119: both gauges fail, "1 s outside" and "1 s below", labelled FORECAST | {"d":"false","h":"false","ds":"Limit 300 s · 1 s outside","hs":"Threshold 120 s · 1 s below","mode":"FORECAST"} |
| PASS | S2.4 forecast at 299/120: both gauges pass, "1 s inside" and "0 s above" | {"d":"true","h":"true","ds":"Limit 300 s · 1 s inside","hs":"Threshold 120 s · 0 s above"} |
| PASS | S2.5 the scene is still idle while only forecasting (nothing is faked before Run) |  |
| PASS | S2.6 the Run investigation button is visible without scrolling the page | {"top":569,"bottom":635,"left":63,"right":573,"w":510,"h":66,"display":"grid","visibility":"visible"} |
| PASS | S2.7 Challenge A: reader denied, door held open, link drawn, case on | {"reader":"denied","door":"held","camera":"unknown","presence":"idle","link":"case","kase":"on","idle":"false","selected":""} |
| PASS | S2.8 Challenge A: high-priority chip shows the real case id and the link reads 299 s | HIGH PRIORITY CASE · case:cfd83deb8d3af576 |
| PASS | S2.9 Challenge A: the link line is fully drawn (stroke-dashoffset 0) and the case chip is lime |  |
| PASS | S2.10 Challenge A: source strip says Held open / Access denied (words, not only colour) | {"door":"Held open","reader":"Access denied"} |
| PASS | S2.11 Challenge A: caption states the real numbers from the ledger |  |
| PASS | S2.12 clicking the reader marker opens the inspector with the REAL event id and SHA-256 row hash |  |
| PASS | S2.13 Challenge B: reader denied, door only open (119 s is not held), NEAR-MISS link, no case | {"reader":"denied","door":"open","camera":"unknown","presence":"idle","link":"near-miss","kase":"off","idle":"false","selected":"reader"} |
| PASS | S2.14 Challenge B: chip says NO CORRELATED CASE and the link reads 301 s with a cross | NO CORRELATED CASE · RULE NOT MET |
| PASS | S2.15 Challenge B: the explanation names BOTH failed conditions by exactly 1 s | A badge was rejected, but the rule is not met. Door opened 301 s (5 min 1 s) after the denial: 1 s outside the 300 s window. Door held 119 s (1 min 59 s): 1 s b |
| PASS | S2.16 Challenge B: both gauges amber after Run | {"d":"false","h":"false","mode":"FORECAST"} |
| PASS | S2.17 optional camera-offline event: camera node offline, 4 events, still exactly 1 case | {"reader":"denied","door":"held","camera":"offline","presence":"idle","link":"case","kase":"on","idle":"false","selected":"reader"} |
| PASS | S2.18 camera-offline shows as Offline in words on the source strip |  |
| PASS | S2: no console errors or exceptions |  |
| PASS | S3.1 selecting a source from the strip marks it on the building |  |
| PASS | S3.2 Timeline mode: tab selected, only its panel is visible | {"sel":"true","tp":true,"bp":true,"mode":"timeline"} |
| PASS | S3.3 the selected source is preserved across the mode change |  |
| PASS | S3.4 scrubbing to +30 s: reader already denied, door NOT yet linked, no link line | {"reader":"denied","door":"open","camera":"unknown","presence":"idle","link":"none","kase":"off","idle":"false","selected":"reader"} |
| PASS | S3.5 scrubbing changes what the strip and HUD say |  |
| PASS | S3.6 scrubbing to the end returns to live with the case link |  |
| PASS | S3.7 time cursor and selection survive a full tour of all four modes |  |
| PASS | S3.8 "Back to live" returns the building to the end of the ledger |  |
| PASS | S3.9 timeline shows one to-scale marker per recorded event, kinds anchor/match/excluded | markers=3 |
| PASS | S3.10 keyboard: ArrowRight moves to Timeline and focuses it |  |
| PASS | S3.11 keyboard: End jumps to Response |  |
| PASS | S3.12 keyboard: ArrowRight wraps from Response to Building |  |
| PASS | S3.13 exactly one tab is in the tab order (roving tabindex) |  |
| PASS | S3.14 Evidence lists every source event with its full 64-char SHA-256 hash from the ledger | ["forge:earlier-door","forge:denied","forge:later-door"] |
| PASS | S3.15 Verify chain reports the chain verified with the head hash | Chain verified: 3 ledger records from the genesis hash. Head d87cf9061363941a… |
| PASS | S3.16 Open reconstruction is enabled because a case exists |  |
| PASS | S3.17 the existing Evidence Reconstruction opens beside the console from the Control Room |  |
| PASS | S3.18 reconstruction shows the real case and the excluded earlier door |  |
| PASS | S3.19 before: three disconnected alarms, not yet connected | {"joined":"false","kind":"case","alarms":3,"count":"3"} |
| PASS | S3.20 after: "Connect the signals" dissolves the alarms and lights ONE linked incident (aria-pressed) | {"joined":"true","kind":"case","pressed":"true","op":"1","alarmOp":"0.3"} |
| PASS | S3.21 case board answers all six operator questions | ["What happened?","Where?","Why were these linked?","What was excluded?","What evidence supports it?","What should the operator review next?"] |
| PASS | S3.22 board names the exclusion, both devices, and cites hashes |  |
| PASS | S3.23 recommendations are advisory only; no actuation language anywhere in the page |  |
| PASS | S3.24 Challenge B response: outcome is NOT LINKED with the reason; the board still explains | NOT LINKEDNo correlated caseA badge was rejected, but the rule is not met. Door opened 301 s (5 min 1 s) after the denia |
| PASS | S3: no console errors or exceptions |  |
| PASS | S3b.1 one PRODUCT VISION label and the four concept screens | {"flags":1,"figs":4,"caps":["Mobile alert","Floor-by-floor digital twin","Multi-property operations","Evidence-based escalation"],"mail":["mailto:info@innerchis |
| PASS | S3b.2 call to action uses only the verified contact | ["mailto:info@innerchispa.us?subject=GhostBridge%20pilot%20inquiry","mailto:info@innerchispa.us?subject=GhostBridge%20building%20assessment"] |
| PASS | S3b.3 the human approval gate is shown in the escalation flow |  |
| PASS | S3b: no console errors or exceptions |  |
| PASS | S4.1 ?present=1 opens the Showcase overlay ready to play, nothing running yet | {"hidden":false,"status":"idle","body":"off","title":"Watch the building speak.","play":"▶ Play"} |
| PASS | S4.2 the run reaches "done" in 45-65 s of wall time | total=58.4s |
| PASS | S4.3 the BEAT ORDER follows the real ledger: denied < door < case < reconstruction < evidence < response < vision | {"beat1":0.4,"denied":6.2,"door":14.1,"held":26.9,"case":26.9,"recon":32.4,"evidenceMode":42.2,"responseMode":48.1,"joined":49.3,"vision":53.8,"done":58.4} |
| PASS | S4.4 the denial is recorded only after beat 1 and the door only after the denial (events arrive one at a time) | {"beat1":0.4,"denied":6.2,"door":14.1,"held":26.9,"case":26.9,"recon":32.4,"evidenceMode":42.2,"responseMode":48.1,"joined":49.3,"vision":53.8,"done":58.4} |
| PASS | S4.5 the door beat shows the door only OPEN with no link and no case chip; door turns amber and the case appears in the correlation beat, 6+ s later | {"doorSnap":{"door":"open","link":"none","chip":true},"seen":{"beat1":0.4,"denied":6.2,"door":14.1,"held":26.9,"case":26.9,"recon":32.4,"evidenceMode":42.2,"res |
| PASS | S4.6 the evidence beat switches to Evidence mode; the response beat joins the signals |  |
| PASS | S4.7 final ledger: exactly the 3 real forge events (denied, later door, earlier door) and one case | ["forge:denied","forge:later-door","forge:earlier-door"] |
| PASS | S4.8 the chain verifies after the run and the case count is 1 | {"events":3,"incidents":3,"cases":1,"integrity":"Verified"} |
| PASS | S4.9 the case id shown in the building matches the one in the story captions (live ledger tokens) |  |
| PASS | S4.10 captions never show unfilled {tokens} |  |
| PASS | S4.11 the run ends on the product-vision chapter |  |
| PASS | S4.12 the page and the overlay are labelled done with a Play again affordance |  |
| PASS | S4.13 Exit closes the overlay and clears showcase mode |  |
| PASS | S4: no console errors or exceptions |  |
| PASS | S4b.1 the Showcase button opens the overlay |  |
| PASS | S4b.2 playing: button reads Pause, status playing, restart enabled |  |
| PASS | S4b.3 Pause freezes the clock (no drift in 2.5 s) | 0:02 / 0:58 -> 0:02 / 0:58 |
| PASS | S4b.4 Resume continues from where it stopped | 0:02 / 0:58 -> 0:04 / 0:58 |
| PASS | S4b.5 Restart resets the real ledger to empty and goes back to beat 1 | ledger=0 |
| PASS | S4b.6 Escape exits Showcase |  |
| PASS | S4b: no console errors or exceptions |  |
| PASS | S5.1 idle: no horizontal overflow at 390 px | {"scrollW":390,"clientW":390,"bad":[]} |
| PASS | S5.2 the three actions are full width and stacked | [350,350,350] |
| PASS | S5.3 every visible control in the Control Room and Vision is at least 40 px tall | [] |
| PASS | S5.4 the building scene is shown at a usable size (at least 250 px tall, within the screen) | {"top":611,"bottom":901,"left":0,"right":390,"w":390,"h":290,"display":"block","visibility":"visible"} |
| PASS | S5.5 while forging, the building stays pinned to the top of the screen | {"top":0,"bottom":269,"left":0,"right":390,"w":390,"h":269,"display":"flex","visibility":"visible"} |
| PASS | S5.6 the pinned building does not cover the Run button | scene.bottom=269 run.top=360 |
| PASS | S5.7 forging: no horizontal overflow | {"scrollW":390,"clientW":390,"bad":[]} |
| PASS | S5.8 the chip with the case id is visible in the pinned scene |  |
| PASS | S5.9 Challenge B on mobile: near-miss chip |  |
| PASS | S5.10 the four mode tabs are comfortable touch targets | [57,57,57,57] |
| PASS | S5.11 timeline mode: no horizontal overflow | {"scrollW":390,"clientW":390,"bad":[]} |
| PASS | S5.11 evidence mode: no horizontal overflow | {"scrollW":390,"clientW":390,"bad":[]} |
| PASS | S5.11 response mode: no horizontal overflow | {"scrollW":390,"clientW":390,"bad":[]} |
| PASS | S5.12 Product Vision: no horizontal overflow | {"scrollW":390,"clientW":390,"bad":[]} |
| PASS | S5.13 Showcase overlay fits the phone and leaves most of the screen free | {"top":581,"bottom":834,"left":10,"right":380,"w":370,"h":253,"display":"block","visibility":"visible"} |
| PASS | S5.14 running Showcase: no horizontal overflow | {"scrollW":390,"clientW":390,"bad":[]} |
| PASS | S5: no console errors or exceptions |  |
| PASS | S6.1 headline and primary actions are inside the 720 px screen | {"cta":{"top":386,"bottom":447,"left":44,"right":374,"w":330,"h":61,"display":"block","visibility":"visible"},"hl":{"top":204,"bottom":324,"left":44,"right":604 |
| PASS | S6.2 no horizontal overflow at 1280 | {"scrollW":1280,"clientW":1280,"bad":[]} |
| PASS | S6.3 forging at 1280x720: the Run button is reachable inside the screen | {"top":404,"bottom":470,"left":59,"right":569,"w":510,"h":66,"display":"grid","visibility":"visible"} |
| PASS | S6.4 the drawer stays on the left, the building on the right (no overlap with the facade) | {"top":39,"bottom":573,"left":44,"right":584,"w":540,"h":534,"display":"block","visibility":"visible"} |
| PASS | S6.5 case state visible at 1280 |  |
| PASS | S6: no console errors or exceptions |  |
| PASS | S7.1 reduced motion: no pulse animation, no link or layer transitions | {"ring":"none","link":"0s","alarm":"0s","layer":"0s"} |
| PASS | S7.2 the state is still fully readable without motion (link, chip and words present) |  |
| PASS | S7.3 Showcase still drives the real ledger under reduced motion |  |
| PASS | S7.4 the pointer parallax is disabled (no --px style is ever applied) |  |
| PASS | S7: no console errors or exceptions |  |
| PASS | S8.1 local mode: the building shows the SAME case id the Python /api/cases returns | case:cfd83deb8d3af576 vs case:cfd83deb8d3af576 |
| PASS | S8.2 the door inspector shows the SQLite row hash |  |
| PASS | S8.3 after a page reload the building is rebuilt from SQLite (denied, held, case) | {"reader":"denied","door":"held","camera":"unknown","presence":"idle","link":"case","kase":"on","idle":"false","selected":""} |
| PASS | S8.4 Challenge B in local mode: near-miss and /api/cases is empty |  |
| PASS | S8.5 Showcase in local mode writes through the Python API (reset first, then denied, then door) | ["forge:denied","forge:later-door"] |
| PASS | S8.6 Reset clears SQLite and returns the building to idle |  |
| PASS | S8: no console errors or exceptions |  |
| PASS | S9.1 Night Watch unchanged = 5/3/0 | {"events":5,"incidents":3,"cases":0,"integrity":"Verified"} |
| PASS | S9.2 Night Watch in the building: camera offline, reader granted, no case link | {"reader":"granted","door":"closed","camera":"offline","presence":"long","link":"none","kase":"off","idle":"false","selected":""} |
| PASS | S9.3 severity filters unchanged (High 2 + Medium 1 = All 3) | 2/1 |
| PASS | S9.1 Normal Shift unchanged = 4/0/0 | {"events":4,"incidents":0,"cases":0,"integrity":"Verified"} |
| PASS | S9.1 Access Denied unchanged = 1/1/0 | {"events":1,"incidents":1,"cases":0,"integrity":"Verified"} |
| PASS | S9.4 Legacy Bridge unchanged = 5/3/1 | {"events":5,"incidents":3,"cases":1,"integrity":"Verified"} |
| PASS | S9.5 replay adds 0 events and leaves the stored ledger byte-identical |  |
| PASS | S9.6 the Legacy Bridge case is visible in the building: access:A001 and relay:R003, link 270 s |  |
| PASS | S9.7 Verify chain valid |  |
| PASS | S9.8 tamper test still detects tampering and leaves the ledger intact |  |
| PASS | S9.9 JSON export is unchanged: schema, 5 ledger rows, valid integrity, no case or Control Room data | {"schema":"ghostbridge-evidence-v1","n":5,"valid":true,"keys":"exported_at,integrity,ledger,mode,schema","hasCase":false} |
| PASS | S9.10 localStorage holds only the ledger (no Control Room, Showcase or reconstruction state) |  |
| PASS | S9.11 Reset returns everything to zero and the building to idle |  |
| PASS | S9.12 "Watch an incident unfold" runs the real Legacy case, then opens the real reconstruction | {"events":5,"incidents":3,"cases":1,"integrity":"Verified"} |
| PASS | S9: no console errors or exceptions |  |
| PASS | S10.1 every control has an accessible name | [] |
| PASS | S10.2 exactly one h1 and a logical h2 outline | ["From one entrance to every pro","Watch the pieces connect.","No black box. Just a clear tra","Watch the building speak."] |
| PASS | S10.3 live regions announce the caption, rule verdict, Forge result and Showcase text | ["cr-caption","forge-preview","forge-result","cr-b-node","cr-ev-note","inspection","sc-sub"] |
| PASS | S10.4 tablist: 4 tabs, exactly one selected, each controls an existing panel |  |
| PASS | S10.5 the scene is an image with a title and the document language is set |  |
| PASS | S10.6 the scene description is updated from the ledger (screen-reader equivalent of the picture) | North entrance: held open. Archive reader: access denied. Loading bay camera: no signal yet. Archive corridor: quiet. A linked case joins the reader and the doo |
| PASS | S10.7 sampled body text has contrast of at least 4.5:1 against its solid background | [] |
| PASS | S10: no console errors or exceptions |  |
| PASS | All 12 scenarios completed (none skipped) | missing:  |
