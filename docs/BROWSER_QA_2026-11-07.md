# Browser interaction QA — 2026-11-07

**Verification scope:** Automated Chromium interaction against the **exact `docs/` source files retrieved from GitHub Pages deployment artifact #13535360951**, corresponding to GitHub Actions run [42280422784](https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/actions/runs/42280422784), commit `54b5759343c4c47c1c2a80a8ddacf10a19360c71`.

**Result:** 32 checks **PASS**, 0 **FAIL** across desktop 1440px and mobile 390px.

## Environment and limitations

The test environment prohibits all Chromium navigation to local and public URLs. For this reason, the downloaded deployment HTML and CSS were loaded into an in-memory Chromium document. The **actual published JavaScript engine, filter, and app logic** were concatenated only to replace static ES module import/export declarations; logic was not changed. A test-only SHA-256 shim delegates `crypto.subtle.digest` to Python `hashlib.sha256`. A test-only `localStorage` shim simulates browser persistence across documents. External web fonts were not fetched.

**Important:** This is *offline functional browser QA of the exact published source artifact*, not an independent live anonymous visit to GitHub Pages, and not a complete end-to-end test of HTTPS, browser storage APIs, or remote deployment headers. It is separate from the Kiro IDE authorship session documented in `KIRO_EVIDENCE.md`. Screenshots and full results were retained as locally generated QA artifacts in the operator's conversation workspace; they are **not yet committed to this repository**, so this document alone does not claim that public screenshot files exist.

## Checks verified

| Area | Result |
| --- | --- |
| Initial state: All selected; zero incidents; simulation explicitly labeled | PASS |
| Night Watch: 5 events, 3 incidents, 5 complete timeline entries | PASS |
| Filter All / High / Medium: 3 / 2 / 1 visible incident cards | PASS |
| `aria-pressed` and selected visual state | PASS |
| Aggregate counters and timeline unchanged by filtering | PASS |
| Incident inspection opens the source and linked evidence | PASS |
| SHA-256 verification of all 5 evidence records | PASS |
| JSON export contains full ledger, unchanged across severity filters | PASS |
| Replay generates no duplicate events | PASS |
| Tamper test detects a change in a disposable copy | PASS |
| Original chain still verifies after tamper demo | PASS |
| Persistence through simulated page reload; UI filter resets to All | PASS |
| Reset clears the ledger and restores All | PASS |
| Normal Shift: 4 events, zero incidents; correct no-incident text | PASS |
| Access Denied: All=1, High=0 (different empty state), Medium=1 | PASS |
| Mobile 390px: High=2; controls visible; no horizontal overflow | PASS |
| No uncaught JavaScript exceptions on desktop/mobile | PASS |

The individual checks total 32 in the retained structured QA result.

## Follow-up gates

1. Independently open the live public [GhostBridge demo](https://rafa-innerchispa.github.io/ghostbridge-kiroween-2026/) in an anonymous browser, on desktop and mobile, to verify live loading and downloads.
2. Capture a genuine Kiro IDE screenshot or screen recording to support the real contribution. The `.kiro/` docs prepared by Codex are not Kiro authorship evidence by themselves.
3. Record and publish a real project video under the hackathon time limit; Devpost does not yet have one.
4. Confirm owner eligibility answers and submit the hackathon entry only after explicit authorization.

These QA tests **do not** claim physical hardware integration, live detection, AI inference, legally certified evidence, or access to production InnerOS.