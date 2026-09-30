# OpsPro landing — DESIGN.md

The single source of truth for the opspro.ae landing page. If code and this file disagree, fix one of them.

Stack: Next.js (App Router) · GSAP (+ ScrollTrigger, SplitText) · Motion (`motion/react`) · MapLibre GL · deck.gl

---

## 1. Direction

| | |
|---|---|
| **Purpose** | Show ops managers that OpsPro lets them see and trust their whole store workforce, live. |
| **Audience** | Ops heads, supervisors and manpower vendors in the UAE. Busy, practical, not designers. |
| **Tone** | Calm, precise, light. Premium logistics, not a flashy startup. Quiet UI, alive map. |
| **Memorable detail** | A live 3D map of Dubai where bikes ride real roads and stores glow teal as pickers clock in. |
| **Moodboard** | Light greyscale 3D map (Urban ride concept) + floating info cards + headline on top (Brickwise). |

**Rule of thumb:** the page is 90% neutral. Colour only appears when it *means* something.

---

## 2. Colour

Paired with the OpsPro dashboard so the site and the app feel like one product.

```css
:root {
  /* Ink (text, primary buttons) */
  --ink:        #0F1A1A;  /* headings, primary button bg */
  --ink-2:      #4A5858;  /* body text */
  --ink-3:      #5E7373;  /* captions, meta. Smallest text allowed (5:1 on white) */
  --ink-4:      #9AA8A8;  /* decorative only, never for text people must read */

  /* Surfaces */
  --bg:         #F6F8F8;  /* page */
  --surface:    #FFFFFF;  /* cards, nav */
  --surface-2:  #EEF3F3;  /* hover, subtle fills */
  --line:       #E3E8E8;  /* borders */
  --line-2:     #D2DADA;  /* stronger borders, dividers */

  /* Live (teal) — means "on shift / active / verified" and nothing else */
  --teal:       #00CCBC;  /* dots, pins, fills, map glow. NOT for text (2:1) */
  --teal-ink:   #00736B;  /* teal text and icons (5.7:1) */
  --teal-tint:  #E6FAF8;  /* soft backgrounds behind live states */
  --teal-line:  #9DEEE6;  /* live borders */

  /* Status (same meaning as the dashboard) */
  --amber:      #F59E0B;  --amber-ink: #B45309;  --amber-tint: #FEF3C7;  /* late */
  --red:        #EF4444;  --red-ink:   #DC2626;  --red-tint:   #FEE2E2;  /* no-show */
}
```

**Rules**
- Primary CTA is **ink** (black pill), not teal, as in the moodboard. Teal stays reserved for "live".
- Fill colours (`--teal`, `--amber`, `--red`) are for dots, pins and bars. Text uses the `-ink` versions.
- No gradients except the fade where the map meets the page background.
- Light mode only for v1.

> ⚠️ Open: `#00CCBC` is Deliveroo's brand teal (inherited from the dashboard). Confirm with the client before launch.

---

## 3. Typography

**Font: Satoshi** (Fontshare, free for commercial use). Self-host the woff2 files with `next/font/local`.
**Weights: 400 (Regular) and 500 (Medium) only. Never bold. No mono fonts anywhere.**

| Token | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| `display` | clamp(44px, 5.6vw, 84px) | 500 | 1.02 | -0.04em | Hero headline |
| `h2` | clamp(32px, 3.6vw, 56px) | 500 | 1.06 | -0.03em | Section titles |
| `h3` | 24px | 500 | 1.25 | -0.02em | Feature titles |
| `body-lg` | 19px | 400 | 1.55 | -0.005em | Hero subline, intros |
| `body` | 16px | 400 | 1.6 | 0 | Default text |
| `ui` | 15px | 500 | 1.3 | 0 | Buttons, nav, card titles |
| `small` | 14px | 400 | 1.5 | 0 | Card meta, captions |
| `micro` | 12px | 500 | 1.4 | 0.01em | Chips, map labels |
| `stat` | clamp(40px, 4.4vw, 64px) | 500 | 1 | -0.03em | Big numbers |

**Rules**
- Hierarchy comes from **size, tracking and ink colour**, not weight.
- Sentence case everywhere. No ALL-CAPS labels.
- Line length: body text max `60ch`, hero subline max `44ch`.
- **Numbers:** do *not* use `tabular-nums`, because Satoshi's tabular "1" gets a slab foot and looks mono. For live counters, put each digit in a fixed-width slot (`display:inline-block; width:0.62em; text-align:center`) so values change without jitter.
- Headlines: `text-wrap: balance`. Body: `text-wrap: pretty`.

---

## 4. Spacing and layout

**Base unit 4px.** Only use these values:
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`

| Token | Value |
|---|---|
| Container max width | 1200px (hero map is full-bleed) |
| Side gutter | 24px desktop · 16px mobile |
| Section padding (vertical) | 128px desktop · 96px tablet · 80px mobile |
| Grid | 12 columns, 24px gap (4 columns on mobile) |
| Heading → body gap | 16px |
| Body → CTA gap | 32px |
| Card padding | 24px (map cards: 12px 16px) |

**Breakpoints:** `sm 640` · `md 768` · `lg 1024` · `xl 1280`

---

## 5. Shape and depth

| Token | Value | Use |
|---|---|---|
| `radius-pill` | 999px | Buttons, chips, status pills |
| `radius-card` | 14px | Floating map cards, small cards |
| `radius-panel` | 24px | Large feature panels, UI screenshots |
| `shadow-1` | `0 1px 2px rgba(15,26,26,.05)` | Resting cards, nav |
| `shadow-2` | `0 2px 6px rgba(15,26,26,.04), 0 12px 32px rgba(15,26,26,.08)` | Floating map cards |
| `shadow-3` | `0 24px 64px rgba(15,26,26,.12)` | Hero panels, product shots |

Borders are `1px solid var(--line)`. No cards inside cards.

---

## 6. Components

- **Primary button:** ink background, white text, `ui` type, pill, 48px tall, 20px side padding. Hover: `--ink-2` background.
- **Secondary button:** white background, `1px --line-2` border, ink text, pill, 48px tall. Hover: `--surface-2` background.
- **Nav:** floats over the hero with no bar and no background, 80px tall, on a three-column grid so the links sit on the page's exact centre.
  - **Left:** a geofence-ring logo mark plus the "OpsPro" wordmark, a divider, and a live "Dubai 20:04 GST" clock.
  - **Centre:** the links. A white pill slides between them on hover (Motion `layoutId`).
  - **Right:** "Log in ↗" as a small glass pill.
  - **No "Book a demo" in the nav:** the page has a single call to action, in the hero.
  - **Mobile:** logo and Log in only.
- **Status dot:** 8px circle in `--teal` / `--amber` / `--red`. A live dot pulses (see Motion).
- **Map card:** white, `radius-card`, `shadow-2`, 12px 16px padding. Title in `ui`, meta in `small` `--ink-3`, status dot on the left.
- **Stat:** `stat` number in ink + `small` label in `--ink-3` under it.

---

## 7. Hero map

**Layout:** nav → headline + subline + CTA centred at the top → the map fills the whole hero, full-bleed. Hero height `100svh`, min 720px.

**Concave fade:** an elliptical `--bg` fade centred behind the copy (`radial-gradient(ellipse 40% 56% at 50% 26%, …)`, 90% wide on mobile). It's solid behind the text and dissolves outward, so the map stays visible at the sides and top corners and the copy never competes with it. The stores sit below the copy via the camera `offset` (28% of height, 36% on mobile).

**Map (MapLibre, custom light style)**

| Layer | Colour |
|---|---|
| Land | `#F1F3F3` |
| Major roads | `#FFFFFF` with `#E3E8E8` casing |
| Minor roads | `#FAFBFB` |
| Water | `#D9F2F0` (teal-tinted, ties to the brand) |
| Parks | `#E4F1EA` (soft green, as in the moodboard) |
| 3D buildings | `#FBFCFC` walls, white tops, very soft shadow |
| Labels | Mostly hidden. District names only, `micro`, `--ink-4` |

**Camera:** Jumeirah Village Circle (JVC), chosen because its mid-rise blocks are evenly spread and its circular road layout sits centred in the bottom band. Marina's towers made the left side too heavy and dwarfed the bikes. Pitch 56°, bearing -25°, zoom 14.9 (14.2 on mobile), with a very slow bearing drift (±5° over 80s).

**What moves**
- **Bikes only:** low-poly 3D delivery scooters (glTF), white body + **teal delivery box**. 12–20 on screen, riding precomputed real road routes (baked JSON, no live routing API).
- **Stores:** pins at real Dubai areas with generic names ("Marina Walk", "JVC", "Business Bay"). States: teal (active), amber (late), red (no-show), grey (no shift). They turn teal one by one as the "shift starts".
- **Event cards:** one card appears every ~3–4s, with at most 2 visible at once. Examples: "Marina Walk · 6/10 in", "No-show · JVC", which becomes "Reliever sent" and turns teal.
- **Live counter** under the CTA: "112 / 188 on shift", ticking up.

**Interaction:** the map is **not** draggable or zoomable; it's a living backdrop. Hovering a visible store shows its card.

**Quiet zone:** one ellipse (`zone.ts`) drives both the concave fade and where activity may appear. Bikes, trails and pins fade out before entering it, and cards only appear at stores whose pin *and* card sit clear of it, fully on screen and below the nav. All activity lives in the top corners and the full-width bottom band.

**Stores (current build):** round photo avatars floating on a stem over their spot. Parts:
- a status dot, plus an amber or red ring when late or no-show
- greyscale until the shift starts
- a dark "orders picked" pill that ticks +1 as each rider leaves
- a teal progress ring that fills while an order is being picked
- a hover photo card: banner, store, area, pickers on shift and orders picked

Names use the client's real banners (Spinneys, Viva, Carrefour). Spinneys Circle Mall JVC, Viva JVT and Viva Arjan 2 are real branches from the dashboard. **Needs client sign-off before launch.** Photos are generic Unsplash shots with no brand logos.

**Delivery cycle (`cycleAt`):** a scooter waits at the store while the order is picked (5s, progress ring) → rides to the drop-off with a teal trail (carrying), while the drop-off pin pulses → hands over with a ripple (2.4s) → rides back with a grey trail (empty) → repeat. The map is roads-only (no buildings) and the camera is static after the intro.

**Event cards = notifications:**
- Layout (272px wide): a 40px store photo with a tone-coloured icon badge on its corner (✓ clocked in, clock for late, ✕ no-show, person-plus for reliever)
- A header row with "OpsPro" on the left and "now" on the right
- A 15px headline in the tone colour, then the store, then the detail
- A caret pointing at the store
- Concentric corners (22 = 10 + 12), an inset outline on the photo, and layered shadows

**Motion (Emil Kowalski's rules):**
- The card grows out of the store's pin (transform origin at the pin), from 0.94 scale, 14px down and 6px blur, on a soft spring (0.5s, bounce 0.18). It never scales from 0.
- The lines cascade in 50ms apart.
- Exits are faster and quieter (180ms ease-in, small drop, blur).
- On a state change (no-show → reliever) the card stays put, while the content cross-fades with blur and the badge pops.
- `MotionConfig reducedMotion="user"` drops the transforms when reduced motion is on.

**No dot indicators anywhere on the map:** status shows through the photo's ring (amber or red) and the notification.

**Data:** 100% simulated. **Never** real worker names, faces or production data.

**Build notes:** tiles from OpenFreeMap (free, no key). The OpenStreetMap licence requires a visible credit, kept as one faint "© OpenStreetMap" line. Routes are baked once from the OSRM demo server with `npm run bake`, as local loops under 6 km with a recorded drop-off point. Pinned to **MapLibre 5**, because deck.gl 9.4 only draws *inside* the map with v5. Markers use `subpixelPositioning` (whole-pixel snapping made them jitter).

**Fallbacks**
- `prefers-reduced-motion`: one still frame, one static card.
- Slow devices: detected from *measured* frame time (median under ~33fps), not `hardwareConcurrency`, because Brave randomises that. They get fewer bikes. Phones get 12 bikes.

---

## 8. Motion

**Libraries (one job each, never both on the same element)**
- **GSAP:** hero intro timeline, scroll scenes (ScrollTrigger), headline reveal (SplitText).
- **Motion (`motion/react`, never import `framer-motion`):** component enter/exit, hover, map cards.

**Tokens**

| Token | Value | Use |
|---|---|---|
| `instant` | 120ms | Hover, focus, dot state change |
| `fast` | 200ms | Buttons, chips |
| `normal` | 360ms | Cards in/out |
| `slow` | 600ms | Section reveals |
| `crawl` | 1000ms | Hero intro only |
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` (GSAP `expo.out`) | Default for anything entering |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` (GSAP `power3.inOut`) | Camera moves, scrubbed scroll |
| `stagger` | 60ms | Lists, headline lines |
| `distance` | 16px (small) · 24px (reveals) | Translate-in distance |

**Choreography**
1. **Hero intro (~1.6s total):** headline lines slide up from behind a line mask (SplitText, stagger 60ms), nav drops in 8px, and subline/CTA/counter rise 24px → subline + CTA → map fades in, camera eases from pitch 30° to 55° → bikes start → first store turns teal.
2. **Ambient (continuous):** bikes ride, the camera drifts, live dots pulse (scale 1 → 1.8, opacity 0.6 → 0, 2s loop).
3. **Scroll dive (built):** the hero pins for 140vh and is scrubbed by scroll.
   1. The copy lifts 80px and fades, and the fade layer and quiet zone clear.
   2. The camera flies from the resting view into Spinneys Circle Mall JVC (zoom 16.6, pitch 60; phones land 0.9 zoom levels wider).
   3. The store's 200 m geofence draws clockwise, then fills.
   4. The "Clocked in at 09:58 · selfie matched · inside the 200 m geofence" notification lands.

   New events pause while diving, and scrolling up reverses everything. Next, it should hand off into "How it works".
4. **Cursor tilt:** on mouse devices the camera leans toward the pointer (±6° bearing, ±4° pitch), smoothed, and fades out as the dive takes over.
5. **Headline arc:** a teal arc draws under "every store" 0.9s after the headline reveal. It's re-placed on every re-split, so it tracks line wraps.
6. **CTA "Book a live demo":** on hover the dashed geofence ring closes, fills teal and a ✓ draws in. The label rolls letter by letter (14ms stagger) to "Pick a time →", and a light sweeps across once.
4. **Sections:** reveal once on enter (fade + 24px rise, `slow`). No re-animating on scroll back up.

**Rules**
- Animate `transform` and `opacity` only.
- Every animation must guide attention, show state, or keep spatial continuity. Otherwise cut it.
- No scroll-jacking apart from the hero dive. No parallax on text.
- `prefers-reduced-motion` turns every transform off, leaving opacity fades of 200ms or less.

---

## 9. Voice

- Short, plain, confident. No hype words ("revolutionary", "seamless", "cutting-edge").
- Use the product's words: **picker, reliever, store, shift, clock-in, no-show, billable days**.
- Times in GST, 24-hour (`10:00`), matching the app.
- Real numbers only with client permission. Until then use rounded ("100+ stores").

---

## 10. Don'ts

- No bold, no mono, no ALL-CAPS labels.
- No teal text on white (use `--teal-ink`).
- No purple/blue gradients, glassmorphism, blobs or stock photos.
- No real client data, names, faces or client logos without permission.
- No cards inside cards. No animation without a reason.
