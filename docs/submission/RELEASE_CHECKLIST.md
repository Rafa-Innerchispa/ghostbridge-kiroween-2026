# Release checklist (Kiroween 2026)

Checked by Kiro's main session on 2026-11-18. "PASS" means measured in this session; "OWNER" means the owner must do or confirm it.

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | PRs #10, #14, #15, #16 merged into `main` in order, with merge commits | PASS | `b8c5a27`, `0eb659d`, `5383081`, `beea671` |
| 2 | CI and Pages succeeded for every merge commit | PASS | GitHub Actions runs on `main` |
| 3 | Live site works in real Chrome (both challenges, Time Machine, Trust Lab, 390 px, reduced motion, Showcase) | PASS | `docs/evidence/live/REPORT.md` (14/14) |
| 4 | Python tests | PASS | 188 OK |
| 5 | Node tests | PASS | 382 of 382, 19 files |
| 6 | Syntax checks | PASS | 18 of 18 modules |
| 7 | Browser QA on the Phase 7 branch | see `docs/evidence/premium/STATUS.md` | |
| 8 | `.kiro/` at the repository root and not ignored by Git | PASS | `tests/hooks.test.mjs` fails if `.gitignore` ignores `.kiro` |
| 9 | MIT license detected by GitHub | PASS | repository About panel |
| 10 | No secrets, tokens or personal paths in tracked files | PASS (scan) | pattern scan of tracked files; GitGuardian on every PR |
| 11 | Only contact address is `info@innerchispa.us` | PASS | steering rule and `tests/control_room_wiring.test.mjs` |
| 12 | Synthetic data labelled; no hardware, AI or certification claims | PASS | page copy, `docs/submission/JUDGES.md` "Not claimed" |
| 13 | Kiro Powers and Kiro Crew not claimed | PASS | `JUDGES.md` matrix says "Not used" / "Not built" |
| 14 | Judge documentation in English | PASS | `docs/submission/JUDGES.md` |
| 15 | Video under 3 minutes, public on YouTube | OWNER | script: `docs/submission/VIDEO_SCRIPT.md` |
| 16 | Devpost form: category Resurrection, repo URL, demo URL, video URL, Kiro write-up | OWNER | paste from `JUDGES.md` |
| 17 | Eligible country and age; founder details if entering Best Startup Project | OWNER | |
| 18 | Phase 7 branch (premium visual system) merged and published | OWNER approval | draft PR, see below |

Demo URLs: https://ghostbridge.innerchispa.us/ (lab) · https://ghostbridge.innerchispa.us/?present=1 (Showcase) · https://ghostbridge.innerchispa.us/?present=1&autoplay=1 (Showcase, autoplay).

Production risks: the site is static and runs only in the visitor's browser (no server, no third-party requests), so the main risks are a broken deploy and browser compatibility. Pages runs every test suite before it deploys; only Chrome was tested.
