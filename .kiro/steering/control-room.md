---
inclusion: fileMatch
fileMatchPattern: 'docs/(control_room|showcase|vision|index|styles).*|tests/(control|showcase|property|browser-qa).*'
---

# Control Room rules

Applies when editing the Control Room scene, showcase, vision chapter, page shell or their tests.

## Truth
- The ledger (`rows`) is the only source of scene state. Never animate a result that the ledger did not produce.
- Reuse `verify`, `correlate`, `evaluateForge`, `buildReconstruction`. Do not copy thresholds (300 s window, 120 s hold) or hashing.
- `engine.mjs`, `correlator.mjs`, canonical hashing and all Python source stay unchanged.

## Local-first
- No third-party request at runtime: fonts are vendored, favicon inline, no analytics, no CDN, no remote API.
- No `innerHTML`/`outerHTML`/`insertAdjacentHTML`. Build with `createElement`/`createElementNS` and `textContent`.

## Visual system
- Graphite background; teal and lime for verified evidence; amber for risk; lavender for provenance.
- Space Grotesk for display, DM Sans for text. One idea per screen, no grids of identical cards.
- Motion must express cause (badge red, time advances, door amber, link draws, case appears). No decorative loops.
- Respect `prefers-reduced-motion`; every control keyboard operable with a visible focus ring; targets >= 40 px (sliders >= 24 px).

## Honesty
- The scene is stylized and synthetic. No camera imagery, no claim of live hardware.
- Recommendations are advisory text only; nothing controls a device or contacts a person.
- The only contact is `info@innerchispa.us`. Never invent phone numbers, addresses or prices.
- One **PRODUCT VISION** label for concept screens. No repeated disclaimers.

## Validate before claiming done
`node --test` for every Node test file, `python -m unittest discover -s tests`, `node --check` on each module, then real-browser QA with screenshots that are actually looked at.
