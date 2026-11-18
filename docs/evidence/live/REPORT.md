# Live site QA (https://ghostbridge.innerchispa.us/)

**14 passed, 0 failed, 14 checks.**

**Harness retries:** 0

**Scenarios:**   (attempts: );   (attempts: );   (attempts: )

Run 2026-11-18T13:55:27.754Z against the published site, Chrome headless, fresh profile per scenario.

| Result | Check | Detail |
|---|---|---|
| PASS | L1.1 page served over HTTPS from the custom domain |  |
| PASS | L1.2 new modules present (Time Machine, Trust Lab, skip link) |  |
| PASS | L1.3 challenge A (299/120) forms the expected case id | case:cfd83deb8d3af576 |
| PASS | L1.4 Time Machine beat 6 shows the case id and labels its time as derived | Beat 6 of 8Case appearsDerived UTC time 22:07:29 UTC (Derived, not recorded: the door's recorded open time plus the 120  |
| PASS | L1.5 Trust Lab: the altered copy fails at row 2 | Altered copy: fails at row 2 |
| PASS | L1.6 Trust Lab: the real ledger is byte-identical |  |
| PASS | L1.7 challenge B (301/119) forms no case |  |
| PASS | L1.8 no console errors |  |
| PASS | L1.9 no failed requests | [] |
| PASS | L2.1 390 px: no horizontal overflow | {"scrollW":390,"clientW":390,"bad":[]} |
| PASS | L2.2 reduced motion: Play is disabled |  |
| PASS | L2.3 no console errors |  |
| PASS | L3.1 ?present=1 opens the Showcase overlay |  |
| PASS | L3.2 no console errors |  |
