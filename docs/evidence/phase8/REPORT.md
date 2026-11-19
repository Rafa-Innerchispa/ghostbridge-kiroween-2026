# Phase 8: Bring your own log and Seal and verify, real-browser QA

**89 passed, 0 failed, 89 checks.**

**Harness retries:** 0

**Scenarios:**   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: )

Synthetic data only. Browser-only mode served from 127.0.0.2. Screenshots in this folder are written by this script; a human must still look at them.

| Result | Check | Detail |
|---|---|---|
| PASS | S1.1 third card "Your own log" sits in the aside below the two challenges and the panel is closed | {"inSide":true,"below":true,"text":"Your own logWrite or upload events. Nothing leaves your browser.","exp":"false","hidden":true,"role":"region","label":"Bring |
| PASS | S1.2 panel opens as a labelled region, focus moves into it, textarea is monospace with >= 8 rows, file input accepts .csv,.txt, 4 sources listed | {"hidden":false,"exp":"true","role":"region","label":"Bring your own log","focus":"cr-byo-title","rows":10,"minH":223.40625,"font":"ui-monospace, \"Cascadia Mon |
| PASS | S1.3 Import is disabled before any check |  |
| PASS | S1.4 template fills the textarea (5 lines) and Import is still disabled |  |
| PASS | S1.5 Check reports "4 events ready to import" and enables Import | 4 events ready to import. |
| PASS | S1.6 editing the text disables Import again |  |
| PASS | S1.7 checking again re-enables it |  |
| PASS | S1.8 nothing is in the ledger before Import | 0 |
| PASS | S1.9 Import: events-count 4 and cases-count 1 |  |
| PASS | S1.10 ledger in localStorage holds exactly the four byo: events, in order | ["byo:B-1","byo:B-2","byo:B-3","byo:B-4"] |
| PASS | S1.11 the Control Room case chip shows a case id | {"hidden":false,"text":"HIGH PRIORITY CASE · case:a93f7500c95c4f92","kind":"case"} |
| PASS | S1.12 the result line reports the ledger’s own count (4) | 4 events sealed into the ledger’s hash chain. The Control Room shows what the rules found. |
| PASS | S1.13 the honest label is visible next to Import |  |
| PASS | S1.14 the integrity label reads Verified after import | Verified |
| PASS | S1.15 Close hides the panel and returns focus to the opener | cr-byo-open |
| PASS | S1: no console errors or exceptions |  |
| PASS | S2.1 two problems are listed with their line numbers (3 and 4) | ["Line 3: \"not-a-time\" is not a valid UTC time. Use the form 2026-11-20T21:58:00Z.","Line 4: OPEN needs duration_seconds as whole seconds, for example 120."] |
| PASS | S2.2 the summary says nothing was imported |  |
| PASS | S2.3 Import stays disabled |  |
| PASS | S2.4 the ledger in localStorage is byte-identical and the counts are unchanged |  |
| PASS | S2.5 the problems are not colour-only: neutral tone, text with line numbers, aria-live region |  |
| PASS | S2: no console errors or exceptions |  |
| PASS | S3.0 empty ledger: Seal is disabled and says why |  |
| PASS | S3.1 labelled region "Seal and verify" sits in the Evidence panel after the evidence list | {"role":"region","label":"Seal and verify","inPanel":true,"afterList":true} |
| PASS | S3.2 the fingerprint is the first 16 hex of the last ledger row hash | c36f 40d6 0371 3341 vs c36f40d603713341 |
| PASS | S3.3 row count and head hash come from the ledger |  |
| PASS | S3.4 the fingerprint is large (>= 20 px) and monospace | 30 |
| PASS | S3.5 Download receipt: Blob application/json, filename ghostbridge-receipt.json, head equals the last row hash | [{"name":"ghostbridge-receipt.json","href":"blob:http://127.0.0.2:52460/08983ecb-3231-4e83-814f-241cadaa352e"}] |
| PASS | S3.6 the object URL is revoked after the download |  |
| PASS | S3.7 checking the same receipt: matches, ok tone, "Verified against receipt" with a check icon | {"tone":"ok","status":"matches","word":"✓Verified against receipt","icon":"✓","cls":"cr-rc-verdict is-ok","msg":"All 4 sealed rows are present and unchanged."} |
| PASS | S3.8 challenge A replaced the ledger (different head, 3 rows) and cleared the shown seal and verdict | 3 rows |
| PASS | S3.9 the pasted receipt text is kept so it can be checked again |  |
| PASS | S3.10 the old receipt against the replaced ledger is a failure (truncated, per the model), shown in red with an icon and a word | {"tone":"crit","status":"truncated","word":"✕Failed: ledger truncated","icon":"✕","cls":"cr-rc-verdict is-crit","msg":"The ledger has 3 rows; 4 were sealed. 1 s |
| PASS | S3.11 the model’s message is shown | The ledger has 3 rows; 4 were sealed. 1 sealed row(s) are missing. |
| PASS | S3.12 the failed verdict is red-ish text (r > g, r > b) | rgb(240, 138, 141) |
| PASS | S3: no console errors or exceptions |  |
| PASS | S3b.1 sealed the 3-row challenge ledger |  |
| PASS | S3b.2 4 rows now, the 3-row seal no longer ends in the sealed hash: rewritten, crit | {"tone":"crit","status":"rewritten","word":"✕Failed: history rewritten","icon":"✕","cls":"cr-rc-verdict is-crit","msg":"The chain verifies on its own, but row 3 |
| PASS | S3b.3 a non-receipt is informative (info tone, "i" icon), not a failure of the evidence | {"tone":"info","status":"invalid-receipt","word":"iNot a usable receipt","icon":"i","cls":"cr-rc-verdict is-info","msg":"Unknown receipt schema; expected \"ghos |
| PASS | S3b.4 text that is not JSON is also info |  |
| PASS | S3b: no console errors or exceptions |  |
| PASS | S4.1 links and command text are as specified | {"href":"verify/verify_evidence.py","abs":"http://127.0.0.2:52460/verify/verify_evidence.py","dl":"verify_evidence.py","text":"Download the independent verifier |
| PASS | S4.2 the verifier link returns HTTP 200 from the local server (in the page and from Node), body is the Python verifier | [{"status":200,"len":0},200,200,200] |
| PASS | S4.3 the section points to the existing Export evidence JSON button, which still exists |  |
| PASS | S4.4 the Copy command button copies or admits it cannot |  |
| PASS | S4: no console errors or exceptions |  |
| PASS | S5.1 Tab from Challenge B reaches "Your own log" | cr-byo-open |
| PASS | S5.2 the opener shows a visible focus ring (outline style not none, >= 2 px) | {"id":"cr-byo-open","style":"solid","w":3} |
| PASS | S5.3 Enter opens the panel and moves focus to its heading | cr-byo-title |
| PASS | S5.4 Tab reaches "Use the template" | cr-byo-template |
| PASS | S5.5 Enter fills the template and moves focus to the textarea | cr-byo-text |
| PASS | S5.6 Tab reaches Check within a few presses; Import is not a tab stop while disabled | 2 |
| PASS | S5.7 Enter on Check says 4 events are ready |  |
| PASS | S5.8 Tab then reaches the now-enabled Import | cr-byo-import |
| PASS | S5.9 Enter on Import replaced the ledger with the 4 events and a case |  |
| PASS | S5.10 focus stayed on Import (enabled) and was not lost to the page body | cr-byo-import |
| PASS | S5.11 Tab reaches Close | cr-byo-close |
| PASS | S5.12 Enter on Close returns focus to "Your own log" | cr-byo-open |
| PASS | S5.13 Tab from Export evidence JSON reaches "Seal this ledger" (no keyboard trap, no skipped control) | 1 |
| PASS | S5.14 Seal shows a visible focus ring | {"id":"cr-rc-seal","style":"solid","w":3} |
| PASS | S5.15 Enter seals: fingerprint matches the ledger head and focus stays on Seal |  |
| PASS | S5.16 Tab reaches Download receipt | cr-rc-download |
| PASS | S5.17 Enter downloads the receipt |  |
| PASS | S5.18 Tab reaches the receipt textarea | cr-rc-paste |
| PASS | S5.19 Tab reaches "Check against this ledger" (after the file input) | 2 |
| PASS | S5.20 the typed/pasted receipt verifies: matches, ok | {"tone":"ok","status":"matches","word":"✓Verified against receipt","icon":"✓","cls":"cr-rc-verdict is-ok","msg":"All 4 sealed rows are present and unchanged."} |
| PASS | S5.21 Tab reaches the verifier link past the copy button; link has a visible focus ring | 2 {"id":"cr-rc-verifier","style":"solid","w":3} |
| PASS | S5: no console errors or exceptions |  |
| PASS | S6.1440.1 no horizontal overflow (scrollWidth 1440 <= clientWidth 1440) and no clipped elements | {"scrollW":1440,"clientW":1440,"bad":[]} |
| PASS | S6.1440.2 every new control is >= 40 px in both directions | [] |
| PASS | S6.1440.3 no text under 12 px in the new views | [] |
| PASS | S6.1440.4 body copy is 14 px or larger | 14 |
| PASS | S6.1440.5 no console errors |  |
| PASS | S6.1024.1 no horizontal overflow (scrollWidth 1024 <= clientWidth 1024) and no clipped elements | {"scrollW":1024,"clientW":1024,"bad":[]} |
| PASS | S6.1024.2 every new control is >= 40 px in both directions | [] |
| PASS | S6.1024.3 no text under 12 px in the new views | [] |
| PASS | S6.1024.4 body copy is 14 px or larger | 14 |
| PASS | S6.1024.5 no console errors |  |
| PASS | S6.390.1 no horizontal overflow (scrollWidth 390 <= clientWidth 390) and no clipped elements | {"scrollW":390,"clientW":390,"bad":[]} |
| PASS | S6.390.2 every new control is >= 40 px in both directions | [] |
| PASS | S6.390.3 no text under 12 px in the new views | [] |
| PASS | S6.390.4 body copy is 14 px or larger | 14 |
| PASS | S6.390.5 no console errors |  |
| PASS | S6.9 ZERO third-party requests | [] |
| PASS | S6.10 no failed or 4xx requests, and the two new modules were served | [] |
| PASS | S7.1 after a run the blanket re-enable is undone: Import is disabled again, Seal is enabled for the 3-row ledger |  |
| PASS | S7.2 after Reset the ledger is empty and Seal is disabled again |  |
| PASS | S7.3 with prefers-reduced-motion no transition or animation runs inside the new views | [] |
| PASS | S7: no console errors or exceptions |  |
