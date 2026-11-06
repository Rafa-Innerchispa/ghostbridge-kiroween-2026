# GhostBridge | Kiroween 2026 demo video

**Status:** Recording-ready script. **No footage or published YouTube video is claimed.**  
**Target:** 2:40-2:55 total, English. Record a real browser session after visual QA.  
**Project:** GhostBridge: Old Signals, New Instincts | Frankenstein category | InnerChispa LLC.  
**Source:** https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026  
**Demo:** https://rafa-innerchispa.github.io/ghostbridge-kiroween-2026/  
**Kiro provenance:** https://github.com/Rafa-Innerchispa/ghostbridge-kiroween-2026/blob/main/docs/KIRO_EVIDENCE.md

## Voice-over and screen plan (English)

**0:00-0:18 | Founder introduction**  
*Visual:* Presenter on camera with discreet lower-third: “Rafael López | InnerChispa LLC.”  
*Voice:* “Hi, I'm Rafael from InnerChispa. Buildings keep decades of technology running: relay doors, badge readers, presence sensors, and cameras. But their signals often live in separate worlds.”

**0:18-0:37 | Problem and product**  
*Visual:* GhostBridge home/hero. Zoom to simulated device cards.  
*Voice:* “GhostBridge connects those signals into one understandable incident story. This demo is deliberately synthetic. It requires no customer infrastructure, no paid cloud inference, and no live surveillance.”

**0:37-1:26 | Reproducible live demo**  
*Visual:* Reset lab, click Night Watch. Show 5 events and 3 incidents. Select filter All, High, Medium (3, 2, 1 cards). Open Door held open; scroll to evidence timeline; verify chain; optionally replay and export.  
*Voice:* “Let's run Night Watch. Five events produce three explained incidents. We can view all findings, only high severity, or medium severity without changing the full evidence history. Here, a door stayed open for 180 seconds, above our 120-second threshold. Each finding links back to its original event. Replaying identical events creates no duplicates, and we can verify the SHA-256 evidence chain or export the ledger for inspection.”

**1:26-1:49 | What normal looks like**  
*Visual:* Reset lab, show filter back to All, click Normal Shift, show 4 events/0 incidents.  
*Voice:* “Now a normal shift: four signals, zero incidents. The same deterministic rules give repeatable outcomes. The browser edition runs locally with Web Crypto and local storage; the Python edition stores evidence in SQLite.”

**1:49-2:25 | Genuine Kiro work**  
*Visual:* Actual Kiro IDE session or saved real screenshots, open `.kiro/specs/incident-severity-filter/`, show committed code, `tests/filter.test.mjs`, `docs/KIRO_EVIDENCE.md`, PR #2 merged, passing CI. Don't fake a Kiro session screenshot.  
*Voice:* “For Kiroween, we used Kiro IDE in Autopilot mode to turn a detailed specification into this accessible severity filter. Kiro implemented the filter module, interface, and 17 new regression tests. The project also has 12 original JavaScript tests and 29 Python tests. GitHub Actions now runs all 58 tests before publishing. Our repo documents which work was built with Kiro and which existed before the session.”

**2:25-2:50 | Limitations, value, closing**  
*Visual:* Explainable incident -> event timeline -> project logo + GitHub URL.  
*Voice:* “GhostBridge shows how to make disconnected legacy systems easier to understand without replacing everything. The current lab simulates devices; production integrations are future work. SHA-256 checks local consistency, not legal immutability. The result is open source, reproducible, and ready to extend. GhostBridge, by InnerChispa.”

## Recording requirements

- Record the **real deployed version** after confirming it includes the merged Kiro filter and passes browser/mobile QA.
- Desktop 16:9 capture at 1080p; mobile evidence may be a brief inset, not required for the entire video.
- Turn off notifications and hide personal IDs, local IPs, access tokens, passwords, customer data, and browser profile details.
- Show filter counts: Night Watch All=3, High=2, Medium=1; Normal Shift 0; Access Denied Medium=1 if time allows.
- Display a genuine Kiro IDE screenshot or session recording and the real GitHub PR #2, not a mock recreation.
- Confirm full evidence timeline, JSON export, replay, reset, and integrity check remain available.
- **Do not** say Kiro created the original GhostBridge MVP. Original code/specs were prepared with Codex/ChatGPT, and Kiro authored the severity filter contribution.
- The current data is simulated. There is **no live ONVIF/camera integration**, no AI inference, and no certified tamper-proof evidence.
- Publish a public/unlisted-acceptable-by-rules YouTube URL only after checking the applicable requirements.
- Final Devpost submission requires explicit owner approval.
