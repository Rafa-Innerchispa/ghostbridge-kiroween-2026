# qa-auditor Phase 8 review (fresh run)

Branch `feat/kiro-verifiable-evidence`, HEAD `0510fa1`. Reviewed 2026-11-18/19. I changed no product code and no doc outside `docs/evidence/`.

## Verdict: PASS WITH FINDINGS

The code is sound. I found no way for a changed history to report `matches` or `extended`, no innerHTML, no third-party request and no upload. The independent verifier rejected the tampered file. The findings are in the uncommitted docs: some claims are not backed by anything in the repo, and the handoff docs would publish internal identifiers.

## Runs

| Suite | Result (copied from output) |
|---|---|
| `python -m unittest discover -s tests` | Ran 196 tests, OK |
| `node --test` on the 5 requested files | tests 60, pass 60, fail 0, skipped 0 |
| `node --test tests/*.test.mjs` (23 files) | tests 427, pass 427, fail 0, cancelled 0, skipped 0 |
| `node --check` on `docs/*.mjs` + `docs/app.js` | 22 of 22 OK |
| `node tests/browser-qa/phase8-verifiable.qa.mjs` | 89 passed, 0 failed, 89 total (0 console errors, 0 third-party requests, no overflow at 1440/1024/390, controls >= 40 px, reduced motion honoured) |
| `python docs/verify/verify_evidence.py export.json --receipt receipt.json` (export of `scenario('night')`, 5 rows) | VERIFIED: 5 rows, head `b2dac728...9ccd`; RECEIPT OK; exit 0 |
| Same, one hex character of row 1's hash changed | `NOT VERIFIED: row 1: stored hash 7f8a243b501f... but recomputed 7f87243b501f...`; exit 1 |
| Scene 7 check (see fact-check) | case present with `22:02:59`, none with `22:03:01` |

Other Chrome suites (159, 39, 39, 32, 40, 56, 141) were not re-run. The 595 total is arithmetically correct (89+159+39+39+32+40+56+141 = 595) but I verified only the 89.

Files my runs overwrote that are tracked: `docs/evidence/phase8/REPORT.md`, `receipt-failed-1440.png`, `seal-1440.png`, `seal-390.png` (the browser QA script writes them; `git diff` shows them modified). Restore with `git checkout -- <file>` if the committed versions are wanted. I also created `docs/evidence/phase8/qa-run/` (generator scripts, export, receipt, tampered file, edge-case receipts). It is under `docs/` and would be published by Pages. Delete or keep it deliberately.

## Findings (by severity)

### High
1. **Agent run counts cannot be traced.** `docs/submission/JUDGES.md:99` and `DEVPOST.md:34` claim ui-director 6 runs and qa-auditor 6+. The only log in the repo, `docs/evidence/agentic-validation/sub-executions.json`, lists 2 ui-director and 2 qa-auditor invocations. `docs/submission/an internal status note:52` says 4 and 5. The three sources disagree. Fix: cite a log for each run or use the counts the logs support, and add Phase 7/8 invocations to a committed log. This report is itself one more qa-auditor run, but nothing committed records it.
2. **Handoff docs would become public.** `docs/` is published by Pages, and `the handoff folder` is not excluded. They contain:
   - Kiro session id `sess_7ff31803-702e-41e9-b5b1-55b645f7262e` (`the internal handoff:53`; also in `sub-executions.json`, which is already public).
   - Internal coordination details (paths, tool names, machine details).
   The product rule forbids publishing company-internal material. Fix: keep coordination documents out of the public repository.
3. **Power status wording in DEVPOST.** `DEVPOST.md:38` says "packages that MCP server with two skills", with an owner note to keep it only if the Power was installed and invoked. `phase8/STATUS.md:27` says the Power is not installed and there is no record of invocation. The sentence should stay out until that evidence exists. `DEVPOST.md:29` also says "our own MCP server and Kiro Power" with no condition. Fix: remove "and Kiro Power" from line 29 and line 38 until install and invocation are recorded. `submission/ELIGIBILITY.md:26` ("Powers: none installed") is consistent with STATUS.md and should be updated at the same time, not before.

### Medium
4. **Verifier crashes on a receipt that is not an object.** `docs/verify/verify_evidence.py` `check_receipt` (about line 58) calls `receipt.get` with no type check. A receipt file containing `[1]` gives `AttributeError: 'list' object has no attribute 'get'` with a traceback. The exit code is 1 (not a false pass), but the documented exit code for unreadable input is 2. Fix: `if not isinstance(receipt, dict): return False, "the receipt is not a valid ghostbridge-receipt-v1"`.
5. **Verifier accepts `rows: true` in a receipt.** `isinstance(n, int)` is true for booleans, so `{"rows": true}` is treated as 1 row. The JS side rejects it (`Number.isInteger(true)` is false). It cannot turn a changed ledger into a match unless the first row's hash equals the sealed head, but the two implementations differ, and the verifier already rejects bool `seq`. Fix: `isinstance(n, int) and not isinstance(n, bool)`.
6. **`JUDGES.md:40` says the verifier is "about 100 lines".** `wc` equivalent: 84 lines. Say "under 100 lines".
7. **Video scene 9 depends on an uninstalled Power** (`VIDEO_SCRIPT.md:26,29`). The script correctly has a fallback, but the table row still names the Powers panel. Record only the fallback unless install is done.

### Low
8. Python/JS serialisation can differ for floats (`1.0` is `1.0` in Python and `1` in JS). A ledger with such a payload would fail in the verifier, never pass, so it is a false NOT VERIFIED only. The engine's payloads contain only integers, so it is not reachable with built-in events.
9. Both verifiers hash only `payload`. Fields outside `payload` (other than `seq`, `previous`, `hash`) are not covered, and `payload.incident` is not re-derived from `payload.event`. This is by design of the chain and honest in `JUDGES.md:109`, but worth stating as a limit of "verified".
10. `powers/ghostbridge-evidence/mcp.json` carries a `$schema` key. The task brief lists the allowed stdio fields (`type`, `command`, `args`, `env`, `cwd`) and the server entry complies (`cwd: "./"`). I did not have the mcp schema file to confirm that a top-level `$schema` is accepted. `plugin.json` has only allowed keys.
11. `skills/audit-evidence/SKILL.md` step 3 asks the model to compare a receipt by hand; there is no receipt tool. That is accurate wording but it relies on the model, not on a tool result.
12. The native file input shows browser-locale text ("Seleccionar archivo / Ningún archivo seleccionado") in a page otherwise in English. It comes from the browser, not the page. Cosmetic.

## Security and correctness review (no defects found)

| Question | Result |
|---|---|
| Can a changed history report `matches` or `extended`? | No. `checkReceipt` (`docs/evidence_receipt.mjs`, `checkReceipt`) runs `verify` first (strict `seq`, `previous`, recomputed hash). It then requires `rows[n-1].hash === receipt.head` before `matches` or `extended`. Fewer rows gives `truncated`. A full recompute gives a different row n hash, so `rewritten`. Row n's hash covers all earlier rows. |
| Partial imports? | `parseByoLog` returns `events: []` whenever any error exists. It is all or nothing. |
| innerHTML or equivalents in `byo_view.mjs`, `receipt_view.mjs`? | None (grep for innerHTML, insertAdjacent, outerHTML, document.write, eval, fetch, XMLHttpRequest, FormData, `http`: only the UI text "not uploaded" matched). Browser QA records 0 third-party requests. |
| File inputs upload? | No. They are read client side only; the text says so and the QA confirms no requests. |
| Verifier imports GhostBridge code? | No. Imports are `hashlib`, `json`, `sys`. |
| Verifier wrong chain accepted? | Bool `seq` rejected, missing `previous`/`hash`/`payload` rejected, wrong `previous` rejected, NaN payload rejected, empty ledger with a receipt is `truncated`. Receipt edge cases are in findings 4 and 5. |
| Power manifest | `plugin.json` keys: `$schema, name, version, description, author{name,email,url}, homepage, repository, license, keywords`; all allowed. Contact is `info@innerchispa.us`. |
| Bundled engine drift | All 7 modules in `powers/ghostbridge-evidence/server/ghostbridge/` have the same SHA-256 as `ghostbridge/`. `adapters/`, `server.py` and `__main__.py` are deliberately not bundled. The bundled server opens no socket and writes no file (SQLite `:memory:`). |

## Screenshots inspected (design rules)

| Image | Observation |
|---|---|
| `byo-1440.png` (526 wide panel) | Sober dark panel, one teal accent, template loaded, "4 events ready to import." No red. Visible focus ring on the textarea. Table of sources readable. |
| `byo-errors-1440.png` | Two errors with line numbers, "nothing was imported"; Import disabled; shown in neutral colour, not red. Correct under "red only for failed integrity". |
| `seal-1440.png` | Fingerprint `c36f 40d6 0371 3341`, 4 rows, full head hash, Download receipt. Verifier command and links shown. |
| `receipt-failed-1440.png` | Red used for "Failed: ledger truncated" (failed integrity). Text is shown beside an icon, so it does not rely on colour alone. The red text on the dark panel looks roughly 5:1 or better; I estimated this by eye, not measured. |
| `byo-390.png` / `seal-390.png` | No horizontal overflow, controls full size, long hash wraps. The Chrome script measured no overflow and all controls >= 40 px. `seal-390` shows an invalid receipt with a neutral info style, not red. |

Contrast ratios were not measured by me. The script states text >= 12 px and body >= 14 px.

## Doc fact-check

| Claim | Source | Verdict |
|---|---|---|
| Python 196 | my run: 196 OK | confirmed |
| Node 427 in 23 files | my run: 427 pass, 23 `tests/*.test.mjs` | confirmed |
| 22 syntax checks | my run: 22 OK | confirmed |
| Chrome 595 = 89+159+39+39+32+40+56+141 | arithmetic correct; only the 89 re-run | partly verified |
| Phase 8 additions (+3, +5, +7, +7, +14, +17 = 382 -> 427) | `STATUS.md:19-22`: 382+45 = 427; 188+8 = 196 | arithmetic consistent |
| ui-director 6 runs, qa-auditor 6+ | `sub-executions.json` has 2 + 2; `an internal status note:52` has 4 + 5 | **not supported** (finding 1) |
| 14 MCP calls from Kiro | `docs/evidence/phase6/mcp-from-kiro.md` | confirmed; the file itself says "14 calls" and lists rows to 14 |
| `case:cfd83deb8d3af576` for Challenge A | `mcp-from-kiro.md` row 2 (299/120). I did not run the browser forge for this id. | matches the recorded MCP id; browser value not re-run |
| Scene 7: changing 22:02:59 to 22:03:01 removes the case | I ran `correlate()` on the template: 1 case (`case:a93f7500c95c4f92`); with 22:03:01: `[]` | confirmed. Note the template case id differs from the Challenge A id, so the video should not say it is the same. The camera outage and denial incidents remain after the change, only the case disappears. |
| Verifier "about 100 lines" (`JUDGES.md:40`) | 84 lines | imprecise (finding 6) |
| Power status (STATUS.md:27 "not installed ... no record of invoking it") | `STATUS.md:27` | honest. `JUDGES.md:102` wording "Built and tested; installation and invocation ... see STATUS.md" is acceptable. DEVPOST is not (finding 3). |
| Crew "not built" | `JUDGES.md:103`, `ELIGIBILITY.md:21` | honest |
| Attribution: lab, engine, Signal Forge by ChatGPT/Codex; later work by Kiro | `DEVPOST.md:29`, `ELIGIBILITY.md:18` | consistent across docs. I did not check git authorship. |
| One contact `info@innerchispa.us` | grep of the reviewed docs | no other addresses found in the files reviewed |
| "No secrets" in handoff (`the internal handoff:3`) | contents | no credentials or tokens found, but ids listed in finding 2 are internal |
| Own log "never leaves your browser" | module and browser QA | confirmed (0 third-party requests) |
| `RELEASE_CHECKLIST.md:19` "Powers and Crew not claimed: PASS" | `DEVPOST.md:29,38` mention Power | **contradicted** until finding 3 is fixed |

## Limitations

- Did not re-run the other seven Chrome suites, or any run against the live site.
- Did not measure contrast ratios or test a screen reader. Screenshots were inspected at the sizes returned by the viewer; the 1440 views are panel crops (526 and 790 px wide), not full pages.
- Did not check the `mcp.json` `$schema` key against the actual schema file, nor the real Agent Plugins schema for `plugin.json` beyond the key list given in the brief.
- Did not install or invoke the Power in Kiro, and could not confirm agent run counts beyond the committed log.
- Did not check git authorship for attribution claims, and did not scan the whole repo for secrets (only reviewed docs and handoff files).
- `.kiro/inbox/` is untracked; I did not open it.

> Note by Kiro's main session: identifiers and details of other company systems quoted in this report were removed, because this repository is public; the coordination documents were taken out of the repository.
