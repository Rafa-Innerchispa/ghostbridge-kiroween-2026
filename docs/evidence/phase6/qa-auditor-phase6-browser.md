# qa-auditor Phase 6 independent browser audit

**37 passed, 0 failed, 37 checks.**

**Harness retries:** 0

**Scenarios:**   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: );   (attempts: )

Computed (not recorded) times shown in captions: ["beat 4: 2026-11-08T22:07:29Z = a ledger time + 120 s threshold (computed, not a recorded event)","beat 5: 2026-11-08T22:07:29Z = a ledger time + 120 s threshold (computed, not a recorded event)","beat 6: 2026-11-08T22:07:29Z = a ledger time + 120 s threshold (computed, not a recorded event)","beat 7: 2026-11-08T22:07:29Z = a ledger time + 120 s threshold (computed, not a recorded event)"]

Third-party/unknown requests seen by the static server: []

| Result | Check | Detail |
|---|---|---|
| PASS | AU1.A.0 ledger rows exist in localStorage | rows=3 keys=seq,payload,previous,hash |
| PASS | AU1.A.1 ledger rows link to the previous hash (previous) | previous |
| PASS | AU1.A.2 eight beats | 8 |
| PASS | AU1.A.3 every id, row number, hash, time and seconds value in all 8 captions traces to the ledger |  |
| PASS | AU1.A.4 captions cite at least two ledger events overall | 9 |
| PASS | AU1.A.5 every case id in a caption also appears outside the caption on the page | ["case:cfd83deb8d3af576"] |
| PASS | AU1.A.7 no console errors |  |
| PASS | AU1.B.0 ledger rows exist in localStorage | rows=3 keys=seq,payload,previous,hash |
| PASS | AU1.B.1 ledger rows link to the previous hash (previous) | previous |
| PASS | AU1.B.2 eight beats | 8 |
| PASS | AU1.B.3 every id, row number, hash, time and seconds value in all 8 captions traces to the ledger |  |
| PASS | AU1.B.4 captions cite at least two ledger events overall | 5 |
| PASS | AU1.B.5 near miss: no case id appears in any caption | [] |
| PASS | AU1.B.7 no console errors |  |
| PASS | AU2.-1 with no experiment Restore is disabled and looks disabled (opacity < 1) | {"disabled":true,"opacity":"0.45","color":"rgb(238, 244, 233)"} |
| PASS | AU2.0 baseline: indicator says Verified | Verified |
| PASS | AU2.1 11 tamper experiments: lab reports the right row, ledger bytes, indicator and surrounding DOM unchanged |  |
| PASS | AU2.2 zero localStorage writes (setItem/removeItem/clear) during all experiments | [] |
| PASS | AU2.3 zero fetch/XHR calls and zero new server requests during experiments | [] new=0 |
| PASS | AU2.4 after reload with a tamper left on screen: ledger bytes identical, indicator Verified | Verified |
| PASS | AU2.5 the lab holds no stored state (storage keys unchanged) | ["ghostbridge-ledger-v1"] |
| PASS | AU2.6 after reload the lab chain of the real ledger shows every block verified | ["verified","verified","verified"] |
| PASS | AU2.7 no console errors |  |
| PASS | AU3.0 prefers-reduced-motion: reduce is in effect |  |
| PASS | AU3.1 Play and Pause are disabled and the region explains reduced motion in words | {"play":true,"pause":true} |
| PASS | AU3.2 3.5 s after pressing Play nothing is current and the cursor never moved |  |
| PASS | AU3.3 Next moves exactly one beat and 2.8 s later nothing advanced by itself | 0 |
| PASS | AU3.4 html scroll-behavior is auto (no smooth scrolling) under reduce | auto |
| PASS | AU3.5 scrollIntoView requests under reduce: at least one made and none "smooth" | ["auto","auto","auto"] |
| PASS | AU3.6 no running CSS animation or transition inside the Time Machine or Trust Lab | [] |
| PASS | AU3.7 no element in either region has a non-zero transition or animation duration | 0 |
| PASS | AU3.8 control: after switching the preference off, scrollIntoView does ask for smooth (page reads the preference at click time) | ["smooth"] |
| PASS | AU3.10 no console errors |  |
| PASS | AU4.1 Play is enabled without the preference |  |
| PASS | AU4.2 Play advances on its own (so the reduced-motion no-advance result is meaningful) | 1 |
| PASS | AU4.3 no console errors |  |
| PASS | AU5.1 after opening the Forge on mobile, the focused first slider is in view and not covered | {"focused":true,"top":420,"bottom":448,"inView":true,"hitIsGap":true} |
