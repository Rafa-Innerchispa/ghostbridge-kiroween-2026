# Kiro hooks

## `reconstruction-tests-on-save.json` (configured; execution not yet observed)

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
