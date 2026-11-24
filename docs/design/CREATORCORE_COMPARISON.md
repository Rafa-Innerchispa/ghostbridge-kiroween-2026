# CreatorCore as a quality benchmark (not a template)

Studied on 2026-11-19 in real Chrome 157 (headless, 1440 x 900 and 390 x 844), with `tests/browser-qa/design-audit.qa.mjs`, which only photographs and measures the rendered page. No CreatorCore code or assets were copied. The CreatorCore screenshots and raw measurements are kept privately by the owner (not published here, because they show a different site).

## Measured side by side
| | CreatorCore (https://www.creatorcore.ai/) | GhostBridge before (https://ghostbridge.innerchispa.us/) |
|---|---|---|
| Display type | DM Sans 600, 62.6 px at 1440 / 49 px at 390, tracking about -0.06 em, line height 1.05 | Space Grotesk 600, 50.4 px / 40 px, tracking -0.03 em, line height 1.08 |
| Body type | DM Sans 400, 17 to 18 px, line height about 1.7 | DM Sans 16 px |
| Families | one (DM Sans) | two (Space Grotesk, DM Sans) |
| Palette | dark navy hero and feature bands alternating with warm off-white sections (`#F5F4EF`); mint accent | dark graphite throughout; petroleum accent |
| Imagery | product-style 3D renders and photographs (1672 x 941 WebP), every one labelled "Ilustración conceptual" | none; one SVG scene |
| Motion | 4 running animations at idle, one canvas, a visible "Pausar efectos" (pause effects) control; no animation library | 0 running animations at idle (state changes only) |
| Depth | lighting inside the images; almost no CSS shadows (3 elements), one backdrop blur | flat surfaces, no shadows |
| Weight | 21 requests, 1183 KB, no third-party hosts | 27 requests, 156 KB, no third-party hosts |
| LCP (measured) | 2216 ms at 1440, 860 ms at 390 | 300 ms at 1440, 384 ms at 390 |
| Page length | 6978 px at 1440, 9 sections | 5412 px at 1440 |

## What makes CreatorCore look premium
1. **Imagery carries the depth.** The cards and hero use lit, high-resolution renders. The CSS itself is plain: no glows, almost no shadows.
2. **Rhythm by alternation.** Dark bands for "the product working", warm light bands for "what we believe / what it means". Each light band opens with a small tracked eyebrow, a very large two- or three-line headline, and a short paragraph placed to the right.
3. **Very large, tightly tracked display type** with a single family; hierarchy comes from size and weight, not colour (colour is reserved for one word or line).
4. **Generous negative space**: about 160 px between bands at 1440; content widths around 1280 px with a wide left gutter.
5. **Restrained controls**: square-cornered outlined buttons with an arrow; underlined text links with an arrow; one filled primary per band.
6. **Honesty markers that also look intentional**: "Ilustración conceptual" chips on images, a pause-effects button, an explicit caption under the hero image.

## What GhostBridge already does better
- Everything shown is functional and derived from real engine state; no decorative imagery to explain away.
- Much lighter and faster (156 KB vs 1183 KB; LCP about 0.3 s vs 2.2 s on desktop).
- Accessibility and reduced-motion behaviour are tested by script.

## What we take from it (principles, not pixels)
| Principle | Applied to GhostBridge as |
|---|---|
| Depth from lighting, not from CSS effects | an original, pre-rendered architectural backdrop (dusk sky, skyline, lit lobby, ground reflection) behind the live SVG building, plus richer lighting in the SVG itself |
| Alternating bands | the operations bands (Control Room, Forge, Time Machine, Trust Lab) stay dark; the story bands (value, architecture, product vision, contact) become warm light |
| One display family, larger and tighter | one display face at 64 px desktop / 42 px mobile, tracking -0.045 em |
| Square outlined buttons and arrow links | button and link system in `GHOSTBRIDGE_DESIGN_SYSTEM.md` |
| Labels for illustrations, pause control | "Synthetic demo data" and "Concept" labels kept; a "Pause motion" control added |

## What we deliberately do not take
- CreatorCore's images, wording, layout or mint colour.
- Decorative idle animation: GhostBridge only moves when its state changes.
- Weight: the backdrop must stay under 250 KB in total.
