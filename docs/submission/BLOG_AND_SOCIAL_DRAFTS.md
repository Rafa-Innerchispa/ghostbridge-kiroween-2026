# Drafts for bonus prizes (not published; owner approval required)

## Social Blitz post (draft)
#KiroweenHackathon26 The most useful thing Kiro did for me this month was disagree with me, through a second agent. In GhostBridge (Kiroween 2026) a custom "UI director" agent built an accessibility fix, and a separate "QA auditor" agent, run independently, found that opening one panel silently dropped keyboard focus. The director fixed it, the auditor re-checked it in a real browser. Specs and steering set the rules; the agents argued inside them. Building that remembers, on synthetic data only: [repo link]

## Blog post outline (draft, written as part of Kiroween 2026)
**Title:** "Teaching a building to remember: what I learned building GhostBridge with Kiro"

1. **The problem.** Legacy building signals (relays, Wiegand readers, old cameras) produce separate alarms; operators correlate them by hand. GhostBridge is a proof of concept on synthetic data.
2. **Spec first.** How the denied-then-held-open rule (300 s window, 120 s hold) was written as EARS requirements and then implemented twice (Python and JavaScript) with a 100-configuration parity fixture.
3. **Steering as guard rails.** No innerHTML, no third-party requests, honest labels, one contact address. Why the fonts were vendored after steering flagged Google Fonts.
4. **Hooks that actually fired.** A PreToolUse guard that blocked a force-push test (and once blocked a legitimate command, a false positive we fixed); a save hook that runs the reconstruction tests and logs the result.
5. **Two custom agents and a real bug.** The audit, fix, re-audit loop, with the logs as evidence.
6. **What failed.** Hold-threshold physics was wrong in the first Showcase; a server bug made tests flaky on Windows (TCP reset on early replies); `.gitignore` nearly broke eligibility; a shell session hung near the end of Phase 6.
7. **Honesty as a feature.** "Derived, not recorded" labels; the Trust Lab tampers only copies; IMPLEMENTED / EXECUTED / VERIFIED / NOT PROVEN tables.
8. **What's next.** Real adapters, a connected MCP for auditors, mobile alerts. All labelled as roadmap.

Every claim in the final post must link to a commit, test or evidence file.

## Best Startup Project fields
Not filled. Requires the owner to confirm founder status and provide a LinkedIn URL and the startup website. Known public fact in this repo: company name InnerChispa LLC, contact `info@innerchispa.us`, site domain `innerchispa.us` (used by the Pages custom domain). Nothing else is asserted.
