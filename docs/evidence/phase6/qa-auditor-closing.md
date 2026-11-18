# qa-auditor: Phase 6 closing review

Scope: `git diff 8c2bb25 c511d8c` (5 commits), branch `feat/kiro-winning-experience`. Fresh run, 2026-11-17.

## Verdict: PASS WITH FINDINGS

No blocker. All five commits do what they claim. Remaining findings are low severity: one stale call count in the docs, one unclosed MCP proof, and two small edge cases.

## Runs (copied from real output)

| Suite | Pass | Fail | Skip |
|---|---|---|---|
| `python -m unittest discover -s tests` | 188 (Ran 188, OK) | 0 | 0 |
| `node --test tests/time_machine_view.test.mjs` | 15 | 0 | 0 |
| `node --test tests/trust_lab_view.test.mjs` | 12 | 0 | 0 |
| `node --test tests/hooks.test.mjs` | 7 | 0 | 0 |
| `node --test tests/control_room_wiring.test.mjs` | 15 | 0 | 0 |
| `node --test tests/a11y_targets.test.mjs` | 9 | 0 | 0 |
| `node tests/browser-qa/phase6-audit.qa.mjs` | 39 | 0 | 0 (39 total) |

Extra check (not requested, cheap): running every `tests/*.test.mjs` gives 19 files and 381 tests, matching the claimed "381 in 19 files". `docs/*.mjs` plus `docs/app.js` is 18 modules, matching "18/18" (I did not rerun `node --check`).
The Python run printed server log lines to stderr (a 415 test), so the shell reported exit code 1 although unittest said OK.

Logs I read instead of rerunning (`docs/evidence/phase6/final-qa/`): phase6-experience 159/159, phase6-audit 39/39, a11y-targets-after 39/39, skip-link-audit 32/32, forge-focus-audit 40/40, m0-signal-forge 56/56, m5-control-room 141/141. The sum is 506, which matches README, STATUS and KIRO_EVIDENCE. I did not rerun m0, m5 or phase6-experience, so those logs are evidence of what Kiro ran, not of my own run.

The audit script left the working tree unchanged (`git status` before and after shows only the untracked `.kiro/inbox/`). It wrote no tracked files in this run.

## Per-item judgement

**1. `verify_ledger` (`ghostbridge/mcp_server.py` 155-187): sound.**
- Exactly one of `rows` or `rows_json` is enforced (`has_rows == has_text` raises). `rows: null` and `rows_json: "null"`, `"{}"`, `"NaN"` and 600 elements all end in a `ToolError`. Both paths feed the same `verify_rows`, so the 500-row cap and the strict hash check are shared.
- Strict: the hint is added after verification and never changes `valid`. The new test shows the dropped-`data` ledger still fails at row 1 and that a real tamper gets no hint. Any changed payload still fails.
- Every failure from `verify_rows` carries a `reason`. A hint appears only when the failing row has no `event.data` or no `payload.incident`.
- Text path: capped at 1,000,000 characters (also in the schema `maxLength`), type checked, parsed with `json.loads` only. No file, network or env access is added.
- Low: `rows_json` of 400,000 `[` characters raises `RecursionError` inside `json.loads`. It is not a `JSONDecodeError`, so it is not a `ToolError`. `serve()` catches it with `except Exception`, so the transport survives, but the client gets a generic `-32603 Internal error` instead of an `isError` result. Fix: also catch `RecursionError` and raise a `ToolError`.
- Low: the hint says "the failing row has no data" for any failing row that lacks the field, including a deliberately stripped one. It is a hint, not a verdict, and the wording ("If your client drops...") is acceptable.

**2. `docs/time_machine_view.mjs` 159-176: correct, with one small edge.**
- `keepId` is read before `build()` replaces `tm`, and only when the row signature (`n:hash,hash...`) is identical. Row hashes chain, so a different ledger cannot have the same row signature. A new ledger therefore always starts over (the test covers 299/120 then 150/200).
- No loop: `sig` and `idx` are set before `setCursor`, so the re-entrant `refresh()` sees the same signature and `getCursor() === steps[idx].cursor`, and does nothing.
- Caption and scene stay in step: `paintBeats()` and `paintCaption()` run after `idx` is restored, and the test asserts `aria-current` and the cursor. If the step id disappears, `idx` stays null.
- Low: if the user moves the ledger cursor elsewhere in the same 360 ms window, the code forces the cursor back to the kept beat. Playback is also stopped by `stop()`. Both are unlikely and not tested. Fix: keep the beat only when `getCursor()` still equals the old step's cursor.
- The test checks the index, `aria-current` and the cursor, not the caption text. Acceptable.

**3. `phase6-audit.qa.mjs`: legitimate, stricter than before.**
- AU5.2 and AU5.3 focus Run and Close, call `scrollIntoView({block:'nearest'})`, then require in view, a hit test on the button centre, and height at least 40 px. Both passed in my run. This is what the re-audit asked for. Limit: only the 390 px viewport is tested.
- AU1.B.3: I ran the old and new rules over 8 sample sentences. The new rule flags a claim that the old one excused because "not" or "no" appeared elsewhere ("Not every event matters: a correlated case is created", "One linked case appears, and no door was forced", "...is created, not a near miss"). It still passes "No correlated case is created", "The case link was not formed" and the glued "Did not happenNo correlated case is created". It flags nothing the old rule flagged less. A caption containing `case:<8+ hex>` now always fails.
- Residual gap (low): a sentence is excused when a negation phrase appears anywhere in it, so "No door forced, and a case was not created, but a correlated case is created" would pass. The camel-case splitter would also split ordinary words such as "GhostBridge". Neither affected the current captions.

**4. m0 A30-A32 and a11y report: legitimate.** A30-A32 now pass real values (before, after, label, checked, focus, hidden, reloads) as the detail string. Their pass conditions are unchanged. `a11y-targets-after` writes `a11y-targets-REPORT.md`, so it no longer overwrites the shared `REPORT.md`. The file exists and the commit diff shows it. I did not rerun either script.

**5. Documents: numbers accurate, a few wording issues.**
- Counts match the logs and my runs: 188, 381, 19 files, 18 checks, 506 Chrome checks. README says "CI green"; I did not check CI.
- No Power and no Crew claim: ELIGIBILITY says "Powers: none installed; do not claim them. Kiro Crew: no native app" and marks the Crew bonus NOT ELIGIBLE. README claims "custom `ui-director` and `qa-auditor` agents", hooks and MCP "that Kiro has called". `mcp-from-kiro.md` supports the MCP claim for 4 tools, with the `verify_ledger` failures reported openly.
- The `rows_json` claim is honest: both `mcp-from-kiro.md` and STATUS say a Kiro-side `rows_json` call is NOT PROVEN. I can neither confirm nor refute calls 8 to 10 from the repository.
- Deployment is honest: README says the stack is not merged or deployed and the public site shows `main`; ELIGIBILITY marks the app URL NOT VERIFIED.
- Resurrection wording ("legacy relays, card readers and cameras, brought back as one explained, verifiable incident") sits beside README line 91, which says ONVIF, Wiegand and physical relays are future hardware targets, and README says the browser edition connects to no physical device. The judge guide says no hardware integration is claimed. The wording is honest, though "legacy relays, card readers and cameras" in the lead sentence could be read as real devices. Suggest adding "synthetic" or "simulated" there (README line 5).
- Low: stale counts. STATUS ("MCP from Kiro ... 7 calls") and KIRO_EVIDENCE ("invoked (7 calls)") still say 7, while `mcp-from-kiro.md` now records calls up to number 10 (8 and 9 are the follow-up table, 10 is cited in the text). The README no longer says "Frankenstein", but it still contains the old "GitHub Actions confirmed the deployed bundle ... 32/32 offline Chromium" sentence, which describes an earlier deployment of `main` and was not re-verified.
- Low: STATUS says the near-miss rule was "checked on 6 sample sentences". I ran 8 of my own and cannot find that sample set in the repository, so the claim is not reproducible from the files.

**6. `.kiro/settings/mcp.json`: safe.** Command `python`, args `-m ghostbridge.mcp_server`, env only `PYTHONDONTWRITEBYTECODE=1`, no secret, token or absolute or personal path. `autoApprove` lists all four tools (`list_scenarios`, `run_scenario`, `forge_boundary`, `verify_ledger`). The tests enforce that the server uses no socket, file, subprocess or environment access, and the tools only compute on in-memory synthetic data, so auto-approving them is acceptable. `rows_json` adds a size-capped parse only. It relies on `python` resolving to the project interpreter and on the working directory being the repo root, which is a portability note, not a risk.

## Findings by severity

1. No blocker, no high, no medium.
2. Low: `RecursionError` from deeply nested `rows_json` escapes as `-32603` rather than a tool error (`mcp_server.py` ~173).
3. Low: Time Machine keep-beat overrides a user cursor move made in the same refresh (`time_machine_view.mjs` ~165-170).
4. Low: stale "7 calls" in STATUS.md and KIRO_EVIDENCE.md (about 582-585); `mcp-from-kiro.md` records at least 10.
5. Low: near-miss rule excuses a sentence if any negation phrase appears in it; AU5.2/AU5.3 only cover 390 px.
6. Low: README lead sentence says "legacy relays, card readers and cameras" without "synthetic" (README line 5); the "6 sample sentences" check is not in the repo.
7. Info: Kiro-side `rows_json` call is unproven (documented as such).

## Limitations

- I did not rerun m0, m5, phase6-experience, a11y-targets, skip-link, forge-focus or `node --check`. For those I checked Kiro's logs against the claimed counts, and I cannot confirm the logs were produced on the final commit.
- Screenshots: the audit script wrote its screenshots. I did not open them in this run, so **visual not verified** here. `docs/evidence/phase6/audit-forge-390-viewport.png` and the two Time Machine beat-6 PNGs changed in the commits; I did not look at them.
- I cannot see Kiro's session, so calls 8 to 10 in `mcp-from-kiro.md` and the "hooks observed firing" claim rest on the documents alone.
- CI status and the live site were not checked. `.kiro/inbox/` is untracked and was not reviewed; a guard hook blocked one command that listed it.
- Contrast, console errors and third-party requests were only covered where phase6-audit asserts them (AU1.x/AU2.7/AU3.10/AU4.3: no console errors; AU2.3: no new requests). I did not inspect the product for new issues beyond the five commits.
