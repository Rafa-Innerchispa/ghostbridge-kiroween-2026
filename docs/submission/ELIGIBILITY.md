# Kiroween 2026 eligibility checklist (GhostBridge)

Checked 2026-11-12 by Kiro against the public overview page https://kiroween.devpost.com/ (the Rules tab returned HTTP 403 to our fetch, so the full Official Rules were **not** read; the owner should read them before submitting).

| Requirement (overview page) | Status | Evidence |
|---|---|---|
| Built during the Submission Period (Oct 30 to Dec 4, 2026) | PASS | First commit `6fbafaa` dated 2026-10-30; GitHub repo created 2026-10-31T00:50Z. |
| Public GitHub repository | PASS | `gh repo view`: visibility PUBLIC. |
| Open source license detectable in the About section | PASS | MIT, detected by GitHub (`licenseInfo.key = mit`). |
| `/.kiro` at the repository root | PASS | specs, steering, hooks, agents, mcp under `.kiro/`. |
| `.kiro` or its subfolders not in `.gitignore` | PASS (fixed) | PR #15 had added `.kiro/hooks/logs/`; removed in `2dffd0c`; `tests/hooks.test.mjs` now fails if it comes back. |
| URL to a working app | NOT VERIFIED | GitHub Pages is configured at `https://ghostbridge.innerchispa.us/` (built from `main` by workflow). The PR stack #10/#14/#15/Phase 6 is **not** on `main`, so the public site does not show this work yet. Publishing needs owner approval. |
| Category selected | NOT DONE (on Devpost) | README now says Resurrection (PR #16). The owner selects the category in the Devpost form. |
| Text description | NOT DONE | Draft material: this folder. |
| Demo video under 3 minutes, public on YouTube | NOT DONE | Script: `VIDEO_SCRIPT.md`. |
| Write-up on how Kiro was used | PARTIAL | `docs/KIRO_EVIDENCE.md` (phases 1 to 5) plus `docs/evidence/agentic-validation/REPORT.md`. Needs a one-page judge version. |
| No secrets or private data in the repo | PASS (scan) | `git grep` for user paths, AWS/GitHub/OpenAI key patterns, private keys and passwords: no hits; the only email is `info@innerchispa.us`. A scan is not a proof. |
| Accurate attribution (Kiro vs other tools) | PASS with care | `KIRO_EVIDENCE.md` separates Codex/ChatGPT work (incl. PR #10) from Kiro work and custom-agent work. |
| Eligible country / age of entrant | NOT VERIFIED | Owner to confirm (excluded list on the overview page). |
| Bonus: Best Startup Project | NOT VERIFIED | Needs founder confirmation, LinkedIn and startup website from the owner. Nothing invented here. |
| Bonus: Best Kiro Crew App | NOT ELIGIBLE (as of now) | No native Kiro Crew app was built or demonstrated in this repo. Custom IDE agents are not a Crew app. |

## Open risks before submission
1. The public site shows `main`, not the draft PR stack. Judges would see an older app unless the stack is merged and deployed.
2. ~~README category text says Frankenstein~~ fixed in PR #16 (Resurrection).
3. MCP: connected, invoked and all four tools verified from Kiro (last on 2026-11-18) (see `docs/evidence/phase6/mcp-from-kiro.md`). Powers: none installed; do not claim them. Kiro Crew: no native app; do not enter that bonus.
