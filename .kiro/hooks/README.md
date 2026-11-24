# Kiro hooks

## `evidence-properties-on-save.json` (added 2026-11-24)
Written by Kiro as a file in this repository (not with the `createHook` tool). When a file that defines the evidence rules is saved (`ghostbridge/{core,correlator,storage,engine}.py`, `docs/{engine,correlator,evidence_receipt}.mjs`, `docs/verify/verify_evidence.py`, the Power's engine copy, or the property tests themselves) it runs `node .kiro/hooks/run-evidence-properties.mjs`, which executes
```
python -m unittest tests.test_properties tests.test_power
```
in about 3 seconds: random-ledger properties checking that the Python engine, the browser engine and the independent verifier still agree, and that the Power's engine copy is identical. It appends one JSON line to `<system temp>/ghostbridge-hooks/evidence-properties-hook.log`. Bounded at 55 seconds; no server, no network.
**Honest status:** the runner and the matcher are tested (`tests/hooks.test.mjs`) and the runner was run by hand. The IDE firing it on save has not been observed yet. To confirm: save `ghostbridge/correlator.py` without changes and check the log.

## `guard-destructive-commands.json`
PreToolUse guard on shell tools: blocks destructive commands, merges and pushes to `main`, and reading secret-like files. It has blocked real actions during development (for example, a recursive delete and a read of user MCP configuration files on 2026-11-24).

> **Update (agentic-validation phase, 2026-11-12):** the hook below has now been observed firing. It runs
> `node .kiro/hooks/run-reconstruction-tests.mjs`, a bounded runner that executes those three test files and appends a
> JSON line (time, exit code, counts) to `<system temp>/ghostbridge-hooks/reconstruction-hook.log` (outside the repository: the Kiroween rules forbid git-ignoring `.kiro` or its subfolders). Evidence:
> `docs/evidence/agentic-validation/REPORT.md`, section 4. The section below is the original, now superseded note.

## `reconstruction-tests-on-save.json` (originally configured with no observed execution; see update above)

Created in the `feat/evidence-reconstruction` Kiro session with Kiro's `createHook` tool.
On saving a reconstruction or playback module (or its test) it runs only:

```
node --test tests/reconstruction.test.mjs tests/reconstruction-view.test.mjs tests/playback.test.mjs
```

It is bounded: 60 second timeout, no servers, no network, no loops.

**Honest status:** the tool reported the hook becomes active on the next Kiro session start.
It has **not** been observed firing, so it is not claimed as working automation or as
test evidence. The same command was run manually and passed (see `docs/KIRO_EVIDENCE.md`).
To confirm: restart Kiro, save `docs/playback.mjs`, and check that the hook ran.
