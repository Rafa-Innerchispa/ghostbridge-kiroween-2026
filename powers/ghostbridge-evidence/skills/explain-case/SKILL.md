---
name: explain-case
description: Explain why a GhostBridge incident does or does not become a correlated case. Use when asked about the denied-then-held-open rule, the 300 second window, the 120 second hold threshold, or boundary cases such as 299/120 and 301/119.
---

# Explain a GhostBridge case decision

GhostBridge links an **access denied** event to a **door held open** event when both are true:
1. the door opens within **300 seconds after** the denial (strictly after it), and
2. the door stays open **at least 120 seconds**.

Never state a decision from memory. Ask the tool.

## Steps
1. Call `list_scenarios` once to confirm the current rule limits (`window_seconds`, `door_held_threshold_seconds`).
2. For the user's timing, call `forge_boundary` with `delay_seconds` (time from the denial to the door opening) and `hold_seconds`.
3. Report:
   - `decision.case_formed`
   - if a case formed: the case `id`, the two `event_ids` and the two `evidence_hashes`
   - if not: every entry of `decision.failed_conditions`, word for word (each says by how many seconds it missed)
4. To show the boundary, also run 299/120 (forms a case) and 301/119 (fails both conditions by one second) and put the results side by side.

## Always say
Results come from GhostBridge's deterministic rules on synthetic events. GhostBridge only recommends; it never controls a door, camera or person.
