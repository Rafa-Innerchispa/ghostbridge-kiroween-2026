# GhostBridge design system (v2, premium)

For an enterprise physical-security and evidence platform used in premium residential, corporate and retail buildings. Calm, architectural, exact. Nothing moves or glows unless a state changed.

## 1. Bands
| Band | Surface | Used for |
|---|---|---|
| **Operations (dark)** | `--ink-950 #0b0e10` to `--ink-900 #11161a` | Hero, Control Room, Signal Forge, Time Machine, Trust Lab, Your Own Log, Seal & Verify |
| **Story (light)** | `--paper #f4f2ec` with `--paper-2 #ebe8df` cards | "How it works" value band, Architecture, Product Vision, Contact/footer lead-in |
Bands are full-bleed; content max-width 1280 px; side gutter `clamp(20px, 5vw, 80px)`; vertical band padding `clamp(72px, 10vw, 160px)`.

## 2. Colour (semantic, unchanged meanings)
| Token | Dark band | Light band | Meaning |
|---|---|---|---|
| `--accent` | `#5aa9b0` | `#2d6f76` | primary, verified, links |
| `--accent-fill` | `#2d747c` | `#24606a` | the one filled button per band |
| `--warn` | `#d9a54a` | `#855a0c` (`#9a6a12` measured 4.2:1 on `--paper`) | actionable incident states only |
| `--crit` | `#e5484d` | `#b4232a` | failed evidence integrity only |
| `--info` | `#9fb0b8` | `#5b6b72` | normal negative outcomes (no case, did not happen) |
| text | `#e8edf0` / muted `#9aa8ad` | `#14191c` / muted `#4d585d` | |
Provenance (`--prov`) is neutral, never a hue: `#a9b8c2` on dark, `#4d585d` on light. There is no lavender or purple in the system. Step numbers on light bands use `--accent` (petroleum); eyebrows use muted text.
Contrast: every text pair at least 4.5:1 (3:1 for 24 px and up).

## 3. Type
- **Display:** Space Grotesk 600 (vendored), tracking -0.045 em, line height 1.02 to 1.06. Sizes: hero 64 px (desktop) / 42 px (390 px); band headline 52 / 34 px; section title 28 / 22 px.
- **Text:** DM Sans 400/500 (vendored), 17 px body (16 px at 390), line height 1.65; small 13 to 14 px; labels and eyebrows 12 px, 600, uppercase, tracking 0.14 em.
- **Data:** system monospace, tabular figures, for times, hashes and ids.
- Colour is never used for a whole headline; at most one line in `--accent`.

## 4. Controls
- **Primary:** square corners (4 px), solid `--accent-fill`, white text, 48 px tall, label + arrow `↗` or `→`. One per band.
- **Secondary:** transparent, 1 px border in the band's text colour at 40 % opacity, same size.
- **Text link:** underline 1 px, offset 4 px, arrow suffix; hover thickens the underline.
- Minimum target 40 px (44 px for primary); focus ring 3 px `--focus` with 3 px offset, always visible.

## 5. Depth and imagery
- **Hero backdrop:** an original, pre-rendered architectural plate (dusk sky gradient, distant skyline, slender tower, wet ground reflection, fine grain; the left third is darkened and empty so the copy column stays calm) generated from our own SVG in a build step and shipped as WebP (desktop 2880 w, mobile 1080 w, about 65 KB total, budget 250 KB). The live, state-driven SVG building sits on top; only the overlay reacts to the engine. Its static art (never state): glass curtain wall with thin mullions, per-pane vertical reflection gradients, warm interiors at three brightness levels, slab spandrels with a lit edge, a soffit with a soft downlight line, a lit lobby seen through the entrance glass (no people), ambient occlusion at the base and a soft lobby reflection on the wet ground. Static gradients only: no runtime SVG filters, no loops. Amber stays reserved for actionable states (including the reader's denied state).
- **Caption:** the "Illustration · synthetic demo data" label sits bottom-left under the scene, never on the facade.
- **Mobile header (<= 760 px):** brand and a compact icon + text "Pause motion" share the first row; the five nav links form one horizontally scrollable row (no scrollbar, 40 px tall, all in the DOM and keyboard reachable).
- **Product Vision:** 2 x 2 grid of equal-height cards at 1440 and 1024, one column at 390; the digital twin is a thin-line drawing with one petroleum-highlighted floor.
- **Operations sections** (Signal Forge drawer, Time Machine, Trust Lab, Seal and verify, Your own log, Case board): neutral eyebrow, 28 px title, one-line lead, cards on `--ink-900` with no decorative borders (borders only for state or selection), square primary/secondary buttons, monospace tabular data.
- No CSS glow. Elevation by surface tone and one hairline border; at most one soft shadow per card on light bands (`0 1px 2px rgb(0 0 0 / .06), 0 8px 24px rgb(0 0 0 / .06)`).
- Every illustration is labelled ("Concept" or "Synthetic demo data").

## 6. Motion grammar
| Motion | Duration / easing | When |
|---|---|---|
| Band entrance | 520 ms, `cubic-bezier(.2,.7,.2,1)`, 16 px rise + fade, once per band | the band first enters the viewport |
| State change in the scene | existing transitions (door, link, rings) | only when the ledger changes |
| Focus shift (camera) | 600 ms ease-out, ≤ 2 % scale on the scene layers | mode or beat change |
| Hover | 160 ms | buttons, links, cards |
| Parallax | pointer-based, ≤ 8 px on 5 layers, hero only | never on scroll |
- **Pause motion** control in the header; persisted in `localStorage`.
- `prefers-reduced-motion: reduce` or Pause: every entrance and parallax is off; states change instantly.
- No idle loops. No scroll-jacking: native scroll only.

## 7. Voice (US English)
- Lead with the outcome, then the mechanism: "Disconnected signals. One clear story. Evidence you can independently verify."
- Short sentences, active voice, no jargon above the fold. SHA-256, hashes and receipts appear in the evidence bands and in "How it works", not in the hero.
- Consistent terms: *signal* (input), *event* (recorded), *incident* (single-signal finding), *case* (correlated incident), *ledger*, *receipt*, *verify*.
