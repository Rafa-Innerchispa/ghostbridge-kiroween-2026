# Milestone 0: Signal Forge (PR #10) real-browser validation

**56 passed, 0 failed, 56 checks.**

**Harness retries:** 0

**Scenarios:**   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: )

Run against branch `feat/signal-forge-interactive` BEFORE any Control Room change. Headless Chrome over CDP. Browser-only mode is served from 127.0.0.2; local mode is the real Python + SQLite server on a throwaway database.

**Known findings (pre-existing on `main`, not Forge defects; handled in the Control Room branch):**
- every page load requests a missing `/favicon.ico` (404);
- `styles.css` imports Google Fonts at runtime (fonts.googleapis.com / fonts.gstatic.com), a third-party request that conflicts with the local-first claim.

| Result | Check | Detail |
|---|---|---|
| PASS | A1 browser-only mode label |  |
| PASS | A2 forge panel hidden at start |  |
| PASS | A3 baseline load has no console errors |  |
| PASS | A4 open: panel visible, defaults 270/130 predict a match | ✓ Predicted correlation. The denied access is followed 270 s |
| PASS | A5 focus moves to the first slider |  |
| PASS | A6 pass preset sets 299/120 and predicts a match |  |
| PASS | A7 299/120 -> CORRELATED, result styled as match | ✓ CORRELATED: 1 high-priority case. Source evidence: forge:denied + forge:later- |
| PASS | A8 ledger = 3 events / 3 incidents / 1 case / Verified | {"events":3,"incidents":3,"cases":1,"integrity":"Verified"} |
| PASS | A9 result cites both source ids and two 16-char hash prefixes | ✓ CORRELATED: 1 high-priority case. Source evidence: forge:denied + forge:later-door; SHA-256 records edca35aab6fea0e7… / d87cf9061363941a…. Investigation: 3 ne |
| PASS | A10 exactly one Reconstruct button |  |
| PASS | A11 reconstruction shows the NEW case and its real ledger hashes | case:cfd83deb8d3af576 |
| PASS | A12 why-panel shows 299 s gap and 120 s hold, not the demo 270/130 | 299 sbetween signals · window 300 s120 sdoor held · threshold 120 s |
| PASS | A13 earlier door (forge:earlier-door) listed as excluded |  |
| PASS | A14 fail preset sets 301/119 and predicts NO correlation |  |
| PASS | A15 301/119 -> NO CORRELATED CASE with both reasons | ⊘ NO CORRELATED CASE: The door opens 301 seconds after denial, outside the 300-second correlation window. The door is held for 119 seconds, below the 120-second |
| PASS | A16 no case: 3 events / 2 incidents (earlier 185 s door + denial; 119 s hold is below threshold) / 0 cases, no Reconstruct button | {"events":3,"incidents":2,"cases":0,"integrity":"Verified"} |
| PASS | A17 desktop session had no console errors |  |
| PASS | A18 boundary 300s/120s -> case | {"events":3,"incidents":3,"cases":1,"integrity":"Verified"} |
| PASS | A18 boundary 299s/119s -> no case | {"events":3,"incidents":2,"cases":0,"integrity":"Verified"} |
| PASS | A18 boundary 1s/121s -> case | {"events":3,"incidents":3,"cases":1,"integrity":"Verified"} |
| PASS | A18 boundary 360s/240s -> no case | {"events":3,"incidents":3,"cases":0,"integrity":"Verified"} |
| PASS | A18 boundary 301s/120s -> no case | {"events":3,"incidents":3,"cases":0,"integrity":"Verified"} |
| PASS | A18 boundary 300s/119s -> no case | {"events":3,"incidents":2,"cases":0,"integrity":"Verified"} |
| PASS | A18 boundary 1s/60s -> no case | {"events":3,"incidents":2,"cases":0,"integrity":"Verified"} |
| PASS | A19 camera-offline adds a 4th independent event (4 events, 4 incidents) and still 1 case | {"events":4,"incidents":4,"cases":1,"integrity":"Verified"} |
| PASS | A20 camera-offline never creates a false correlation (301/119 + camera => 0 cases) | {"events":4,"incidents":3,"cases":0,"integrity":"Verified"} |
| PASS | A21 matrix session had no console errors |  |
| PASS | A22 Replay last adds 0 new events and leaves the stored ledger byte-identical |  |
| PASS | A23 Verify chain valid after Forge |  |
| PASS | A24 tamper test still detects tampering on a copy; ledger intact |  |
| PASS | A25 severity filters still work after Forge (High + Medium = All) | high=2 medium=1 |
| PASS | A26 Reset empties the lab (0/0/0) and the stored ledger |  |
| PASS | A27 Night Watch unchanged = 5/3/0 | {"events":5,"incidents":3,"cases":0,"integrity":"Verified"} |
| PASS | A27 Normal Shift unchanged = 4/0/0 | {"events":4,"incidents":0,"cases":0,"integrity":"Verified"} |
| PASS | A27 Access Denied unchanged = 1/1/0 | {"events":1,"incidents":1,"cases":0,"integrity":"Verified"} |
| PASS | A28 Legacy Bridge unchanged = 5/3/1 | {"events":5,"incidents":3,"cases":1,"integrity":"Verified"} |
| PASS | A29 regression session had no console errors |  |
| PASS | A30 ArrowRight on the delay slider changes the value and the live preview |  |
| PASS | A31 Space toggles the camera checkbox |  |
| PASS | A32 Close hides the panel and returns focus to the launcher |  |
| PASS | B1 390px: no horizontal overflow with the Forge panel open | {"scrollW":390,"clientW":390,"bad":[]} |
| PASS | B2 390px: Forge buttons are at least 40 px tall | [] |
| PASS | B3 390px: slider targets at least 24 px | [28,28] |
| PASS | B4 390px: no horizontal overflow with the reconstruction open | {"scrollW":390,"clientW":390,"bad":[]} |
| PASS | B5 390px: preview text at least 11px |  |
| PASS | B6 mobile session had no console errors |  |
| PASS | C1 reduced-motion run works and has no errors |  |
| PASS | C2 no 4xx for any local asset other than the known missing favicon | [] |
| PASS | E1 local Python mode label |  |
| PASS | E2 local 299/120 -> 3/3/1 Verified through the Python API | {"events":3,"incidents":3,"cases":1,"integrity":"Verified"} |
| PASS | E3 Python /api/cases id equals the reconstruction id | case:cfd83deb8d3af576 |
| PASS | E4 Python case id equals the browser-only case id (cross-language parity) | case:cfd83deb8d3af576 vs case:cfd83deb8d3af576 |
| PASS | E5 local 301/119 -> 0 cases and /api/cases is empty | {"events":3,"incidents":2,"cases":0,"integrity":"Verified"} |
| PASS | E6 local Reset clears the SQLite-backed state |  |
| PASS | E7 local session had no console errors |  |
| PASS | All 7 scenarios completed (none skipped) | missing:  |
