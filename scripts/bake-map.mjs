// One-off: bakes the hero map style and bike routes into src/data.
// Run with `npm run bake`. Output is committed, so the site never calls these services at runtime.
import { readFile, writeFile } from 'node:fs/promises';

const DATA = new URL('../src/data/', import.meta.url);
const stores = JSON.parse(await readFile(new URL('stores.json', DATA)));

// ---- Map style: OpenFreeMap "positron" layers, recoloured to DESIGN.md §7, labels removed ----
const positron = await (await fetch('https://tiles.openfreemap.org/styles/positron')).json();
const byId = Object.fromEntries(positron.layers.map((l) => [l.id, l]));
const recolor = (id, paint) => ({ ...byId[id], paint: { ...byId[id].paint, ...paint } });
const ROAD = '#FFFFFF', CASING = '#E3E8E8';

const style = {
  version: 8,
  name: 'opspro-light',
  sources: { openmaptiles: positron.sources.openmaptiles },
  sky: {
    'sky-color': '#F6F8F8', 'horizon-color': '#F6F8F8', 'fog-color': '#F6F8F8',
    'sky-horizon-blend': 1, 'horizon-fog-blend': 1, 'fog-ground-blend': 0.6,
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#F1F3F3' } },
    recolor('park', { 'fill-color': '#E4F1EA' }),
    recolor('landcover_wood', { 'fill-color': '#E4F1EA' }),
    recolor('water', { 'fill-color': '#D9F2F0' }),
    recolor('highway_minor', { 'line-color': '#FAFBFB', 'line-opacity': 1 }),
    recolor('highway_major_casing', { 'line-color': CASING }),
    recolor('highway_major_inner', { 'line-color': ROAD }),
    recolor('highway_motorway_casing', { 'line-color': CASING }),
    recolor('highway_motorway_inner', { 'line-color': ROAD }),
    recolor('highway_motorway_bridge_casing', { 'line-color': CASING }),
    recolor('highway_motorway_bridge_inner', { 'line-color': ROAD }),
    // No buildings: a calm, roads-only map lets the store photos and bikes carry the scene.
  ],
};
await writeFile(new URL('map-style.json', DATA), JSON.stringify(style));

// ---- Routes: each bike loops store → drop-off → store on real roads (OSRM demo server) ----
const BIKES = 24;
const MAX_LOOP = 6000; // metres
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); // deterministic, so re-bakes match
const R = 6371008.8, rad = Math.PI / 180;
const haversine = ([a, b], [c, d]) => {
  const x = Math.sin(((d - b) * rad) / 2) ** 2 + Math.cos(b * rad) * Math.cos(d * rad) * Math.sin(((c - a) * rad) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const routes = [];
for (let i = 0; i < BIKES; i++) {
  const store = stores[i % stores.length];
  const [lng, lat] = store.lngLat;
  // Retry drop-offs until the loop stays local; some pull the car router onto a highway detour.
  for (let attempt = 0; ; attempt++) {
    const km = 0.4 + rand() * 0.7, ang = rand() * 2 * Math.PI;
    const drop = [lng + (km / 101) * Math.cos(ang), lat + (km / 111) * Math.sin(ang)]; // ~km offset at 25°N
    const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${drop};${lng},${lat}?overview=full&geometries=geojson`;
    const res = await (await fetch(url)).json();
    await new Promise((r) => setTimeout(r, 300)); // be polite to the free demo server
    if (res.code !== 'Ok') throw new Error(`OSRM failed for bike ${i}: ${res.code}`);
    const path = res.routes[0].geometry.coordinates.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]);
    const dist = [0];
    for (let k = 1; k < path.length; k++) dist.push(+(dist[k - 1] + haversine(path[k - 1], path[k])).toFixed(1));
    if (dist.at(-1) > MAX_LOOP && attempt < 8) continue;
    // Where the bike stops to hand over: the vertex nearest the drop waypoint on the outbound leg.
    const target = res.waypoints[1].location, outbound = res.routes[0].legs[0].distance + 50;
    let dropAt = 0, best = Infinity;
    path.forEach((p, k) => {
      const m = haversine(p, target);
      if (dist[k] <= outbound && m < best) { best = m; dropAt = dist[k]; }
    });
    routes.push({ store: store.id, path, dist, total: dist.at(-1), dropAt });
    break;
  }
}
await writeFile(new URL('routes.json', DATA), JSON.stringify(routes));
console.log(`baked style (${style.layers.length} layers) and ${routes.length} routes`);
