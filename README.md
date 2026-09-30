# OpsPro landing

Marketing site for [OpsPro](https://app.opspro.ae), the live workforce dashboard for store pickers in the UAE.

The hero is a live 3D map of Jumeirah Village Circle: delivery scooters run real road loops between stores and customers, store photos show pickups as they happen, and notifications surface clock-ins, late pickers and no-shows. Scrolling pins the hero and dives into one store to explain how a shift runs in OpsPro.

All activity on the map is simulated. No production data is used.

## Stack

Next.js 16 (App Router) · MapLibre GL 5 · deck.gl 9 · GSAP (ScrollTrigger, SplitText) · Motion · Lenis · Satoshi

Design rules (colour, type, spacing, motion) live in [`DESIGN.md`](./DESIGN.md).

## Scripts

```bash
npm run dev      # local dev server
npm run build    # production build
npm test         # route maths + quiet-zone checks (node --test)
npm run bake     # re-bake the map style and scooter routes into src/data (calls OpenFreeMap + the OSRM demo server)
python3 scripts/convert-scooter.py   # re-bake the scooter model into src/data/scooter-mesh.json
```

## Layout

```
src/components/hero/      hero, live map, scroll story, route maths, quiet zone, scooter mesh
src/components/features/  product section (mockup frame)
src/components/SmoothScroll.tsx
src/data/                 stores, baked routes, map style, scooter mesh
scripts/                  bake + conversion scripts, tests
public/stores/            store photos
public/models/            scooter model (source for the baked mesh)
```

## Credits

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, tiles by [OpenFreeMap](https://openfreemap.org). The on-map credit must stay visible.
- Routes from the [OSRM](https://project-osrm.org) demo server.
- Scooter model: "Scooter" by Poly by Google, [CC-BY](https://poly.pizza/m/eHdEFPwUfCt).
- Store photos from [Unsplash](https://unsplash.com) (credits in `src/data/stores.json`).
- Satoshi by [Fontshare](https://www.fontshare.com/fonts/satoshi).

Store banners (Spinneys, Viva, Carrefour) are the client's real brands and need their sign-off before launch.
