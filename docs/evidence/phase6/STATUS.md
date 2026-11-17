# Phase 6: Resurrection experience and competition readiness

Branch `feat/kiro-winning-experience`, created from the PR #15 head after the eligibility fix (`2dffd0c`). PRs #10, #14 and #15 are unchanged apart from that one fix commit on #15.
Status words: IMPLEMENTED / EXECUTED / VERIFIED / NOT PROVEN.

## What was built and by whom
| Item | Author | Status |
|---|---|---|
| Eligibility fix: stop git-ignoring `.kiro/hooks/logs/` (PR #15) | Kiro main session | VERIFIED (test fails if `.kiro` is ignored again) |
| `docs/time_machine.mjs`, `docs/trust_lab.mjs` (pure models) + tests | Kiro main session | VERIFIED: unit + property tests; 8 of 8 deliberate mutations caught |
| Reduced-motion scrolling, 40 px nav/footer targets, restored mobile Control Room nav link | ui-director, run A | VERIFIED by qa-auditor (a11y-targets-after 39/39) |
| Incident Time Machine and Evidence Trust Lab views | ui-director, run B | VERIFIED by qa-auditor (see below) |
| Fix M1: derived times labelled "Derived, not recorded" | Kiro main session | VERIFIED by qa-auditor re-audit (screenshots) |
| Fix AU2.-1: Trust Lab Restore re-enabled by app.js's blanket button re-enable | Kiro main session | VERIFIED: regression test fails without the fix, passes with it; browser audit 37/37 |
| Corrections to qa-auditor's script (AU1.A.5, AU1.B.3) and reclassification of AU5 | Kiro main session | Reviewed by qa-auditor re-audit: A.5 and B.3 legitimate; AU5.1 "partly a weakening" (see open items) |
| Harness: retry a failed scenario when the browser replaced the page on its own | Kiro main session | IMPLEMENTED; effect measured in the final run below |
| Submission package `docs/submission/` | Kiro main session | Drafts; nothing published |

## Custom agent invocations in this phase
ui-director run A (accessibility), ui-director run B (views), qa-auditor Phase 6 audit, qa-auditor re-audit. Their reports: `qa-auditor-phase6.md`, `qa-auditor-phase6-reaudit.md`. Defects they found that were real: M1 (unlabelled derived times), M2 (wrong attribution headers), AU2.-1 (Restore enabled without an experiment, caused by `app.js`), the stray root file created by ui-director run B (removed).

## Open items (not fixed in this phase)
- AU5.1 checks only the focused slider after opening the Forge on mobile; the auditor asked to also check Run and Close.
- The Time Machine rebuilds twice after a run (case ids arrive about 360 ms after the rows); a beat chosen in that gap resets. Not observed in tests.
- L1: `phase6-experience.qa.mjs` and `a11y-targets-after.qa.mjs` both write `docs/evidence/phase6/REPORT.md`.
- L2: m0 checks A30 to A32 record no detail values.
- Twice during this phase the Kiro shell stopped responding after a long qa-auditor run, and a Kiro restart was needed.
