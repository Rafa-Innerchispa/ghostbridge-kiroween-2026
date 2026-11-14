# Kiro hooks

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
