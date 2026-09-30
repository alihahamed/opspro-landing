'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Map as MapLibre, Marker, type StyleSpecification } from 'maplibre-gl';
import { AmbientLight, DirectionalLight, LightingEffect } from '@deck.gl/core';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { TripsLayer } from '@deck.gl/geo-layers';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import { IconLayer, PathLayer, ScatterplotLayer, SolidPolygonLayer } from '@deck.gl/layers';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import mapStyle from '@/data/map-style.json';
import stores from '@/data/stores.json';
import routesJson from '@/data/routes.json';
import { cycleAt, pointAt, segment, trailFor, type Phase, type Route } from './route-math';
import { scooterMesh, SCOOTER_LENGTH } from './scooter';
import { visibility, zoneFor } from './zone';
import s from './hero.module.css';

export type Status = 'idle' | 'active' | 'late' | 'noshow';
/** A live moment at a store, shown as a notification: the state leads, then the store, then detail. */
export type Card = {
  kind: 'in' | 'late' | 'noshow' | 'reliever' | 'hours'; state: string; store: string; meta: string;
  /** The story's card: larger, with a halo, and the store's photo pulses. */
  featured?: boolean;
};

const TONE: Record<Card['kind'], 'teal' | 'amber' | 'red'> = { in: 'teal', reliever: 'teal', hours: 'teal', late: 'amber', noshow: 'red' };

// Small line icons for each state (no dot indicators).
const ICON: Record<Card['kind'], string> = {
  in: 'M5 12.5l4.5 4.5L19 7.5',
  late: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  noshow: 'M15 9l-6 6M9 9l6 6M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  reliever: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6',
  hours: 'M6 3h9l4 4v14H6zM9.5 14l2 2 4-4.5', // receipt with a check: verified hours

};

const routes = routesJson as Route[];
const MESH = scooterMesh();
// Jumeirah Village Circle: the circular road layout sits centred in the bottom band.
const CENTER: [number, number] = [55.2068, 25.0585];
const BEARING = -25;
const PITCH = 52;
const TIMING = { speed: 34, pick: 5, hand: 2.4 }; // simulated m/s; seconds waiting at store / drop-off
const TRAIL = 220; // metres of fading trail
const BIKE_PX = 32; // on-screen bike length
const CARD_LIFT = 150; // px from a store's ground point to the middle of its card, for the quiet-zone test
const CARD_HALF_W = 160; // px, cards never clip at the screen edge
const NAV_H = 88; // px, cards stay below the nav
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// Notification motion (Emil Kowalski's rules): grow from the pin, never from scale 0, a touch of
// blur on entry, a soft spring in; exits faster and quieter; content cascades 50ms apart.
const POP_IN = { opacity: 0, y: 14, scale: 0.94, filter: 'blur(6px)' };
const SETTLED = { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' };
const POP_OUT = { opacity: 0, y: 8, scale: 0.97, filter: 'blur(4px)' };
const ENTER = { type: 'spring', duration: 0.5, bounce: 0.18 } as const;
const EXIT = { duration: 0.18, ease: [0.4, 0, 1, 1] } as const;
const BADGE = { type: 'spring', duration: 0.4, bounce: 0.35, delay: 0.12 } as const;
const LINES = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
  exit: { opacity: 0, filter: 'blur(3px)', transition: { duration: 0.14 } },
};
const LINE = {
  hidden: { opacity: 0, y: 4, filter: 'blur(3px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.32, ease: EASE_OUT } },
};

const TEAL: [number, number, number] = [0, 204, 188];
const GREY: [number, number, number] = [154, 168, 168];
const LIGHTING = new LightingEffect({
  ambient: new AmbientLight({ color: [255, 255, 255], intensity: 1.15 }),
  sun: new DirectionalLight({ color: [255, 255, 255], intensity: 1.5, direction: [-1, -2, -3] }),
});
const MATERIAL = { ambient: 0.5, diffuse: 0.65, shininess: 12, specularColor: [40, 40, 40] as [number, number, number] };

type Bike = {
  phase: Phase; progress: number; alpha: number; carrying: boolean;
  position: [number, number]; heading: number; path: [number, number][]; timestamps: number[];
  ahead: [number, number][]; drop: [number, number]; dropAlpha: number;
};

// Destination pins (billboarded SVGs): a home while the order is on its way, a ✓ once handed over.
const pin = (fill: string, stroke: string, glyph: string) => ({
  url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="58" viewBox="0 0 48 58">` +
    `<path d="M24 56C24 56 4 36 4 22a20 20 0 0 1 40 0c0 14-20 34-20 34z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>` +
    `<g fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${glyph}</g></svg>`,
  )}`,
  width: 48, height: 58, anchorY: 58,
});
const HOME_PIN = pin('#FFFFFF', '#D2DADA', '<path d="M15 21.5 24 14l9 7.5V31H15z" stroke="#00857B"/><path d="M21.5 31v-5.5h5V31" stroke="#00857B"/>');
const DONE_PIN = pin('#00CCBC', '#00A89B', '<path d="m16 22.5 5.5 5.5L32 17" stroke="#FFFFFF"/>');

// Scroll dive: where the camera lands, and the store's clock-in radius that draws around it.
const DIVE = { zoom: 16.3, pitch: 58, bearing: -5 };
const FLY_END = 0.2; // the camera flight takes the first 20% of the story's scroll
const GEOFENCE_M = 200; // matches the dashboard's default "200m fence"
const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const geofence = ([lng, lat]: [number, number], m: number) =>
  Array.from({ length: 97 }, (_, k) => {
    const a = Math.PI / 2 - (k / 96) * 2 * Math.PI; // start at the top, draw clockwise
    return [lng + (m * Math.cos(a)) / (111320 * Math.cos((lat * Math.PI) / 180)), lat + (m * Math.sin(a)) / 110540] as [number, number];
  });

export default function HeroMap({ statuses, cards, eligible, dive, diveStore }: {
  statuses: Record<string, Status>;
  cards: Record<string, Card | undefined>;
  /** Filled here with the stores whose marker and card sit clear of the copy's fade. */
  eligible: RefObject<Map<string, number>>;
  /** Scroll progress of the dive, 0–1 (written by Hero's ScrollTrigger). */
  dive: RefObject<number>;
  diveStore: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [markerEls, setMarkerEls] = useState<HTMLElement[]>([]);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, number>>(
    () => Object.fromEntries(stores.map((st) => [st.id, st.orders])),
  );

  useEffect(() => {
    const el = box.current!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrow = innerWidth < 768;

    const map = new MapLibre({
      container: el,
      style: mapStyle as unknown as StyleSpecification, // generated by scripts/bake-map.mjs
      center: CENTER,
      zoom: narrow ? 14.2 : 14.9,
      pitch: reduced ? PITCH : 32,
      bearing: BEARING,
      interactive: false, // a living backdrop, not a map to explore
      attributionControl: false, // replaced by the quiet credit line below (OSM licence requires one)
    });

    const markers = stores.map((st) => {
      const m = document.createElement('div');
      // subpixelPositioning: whole-pixel snapping made the photos jitter.
      new Marker({ element: m, anchor: 'bottom', subpixelPositioning: true }).setLngLat(st.lngLat as [number, number]).addTo(map);
      return m;
    });
    setMarkerEls(markers);
    const storeIndex = Object.fromEntries(stores.map((st, i) => [st.id, i]));

    // Interleaved: bikes render inside the map's depth buffer and HTML markers sit above them.
    // (Needs MapLibre 5; deck 9.4 can't interleave with MapLibre 6 yet.)
    const overlay = new MapboxOverlay({ interleaved: true, effects: [LIGHTING], layers: [] });
    map.addControl(overlay);

    let bikes = narrow ? routes.slice(0, 12) : routes;
    // Bikes are sized in metres (BIKE_PX at the resting zoom), so they grow naturally as the camera dives in.
    const restZoom = narrow ? 14.2 : 14.9;
    const bikeMetres = (BIKE_PX * 78271.517 * Math.cos((CENTER[1] * Math.PI) / 180)) / 2 ** restZoom;
    const drops = routes.map((r) => pointAt(r, r.dropAt).position);
    const stagger = routes.map((_, i) => i * 7.3); // seconds, so bikes aren't in lockstep
    const lastCycle = routes.map(() => -1), lastPhase = routes.map(() => '' as Phase | '');
    const t0 = performance.now();
    let raf = 0, last = 0;

    // Camera: the intro lands on `base`; after that, scroll (dive) and the cursor (tilt) steer it.
    const diveTo = stores.find((st) => st.id === diveStore)!.lngLat as [number, number];
    const ring = geofence(diveTo, GEOFENCE_M);
    let base: { center: [number, number]; zoom: number; pitch: number; bearing: number } | null = null;
    let lastCam = '';
    const pointer = { x: 0, y: 0 }, tilt = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; };
    if (!reduced && matchMedia('(pointer: fine)').matches) addEventListener('pointermove', onPointer);

    // Degrade on measured frame time, not navigator.hardwareConcurrency (Brave randomises it).
    const frameTimes: number[] = [];
    const checkPerformance = (now: number) => {
      if (last && frameTimes.length < 120) {
        frameTimes.push(now - last);
        if (frameTimes.length === 120 && frameTimes.sort((a, b) => a - b)[60] > 30) bikes = bikes.slice(0, 10);
      }
      last = now;
    };

    const frame = (now: number) => {
      checkPerformance(now);
      const t = (now - t0) / 1000 + (reduced ? 40 : 0);
      const w = el.clientWidth, h = el.clientHeight;
      const d = dive.current ?? 0; // raw story progress
      const p = smooth(clamp01(d / FLY_END)); // camera flight progress
      // The quiet zone shrinks away as the copy lifts off during the dive.
      const z0 = zoneFor(w), zone = { ...z0, rx: Math.max(1e-3, z0.rx * (1 - p)), ry: Math.max(1e-3, z0.ry * (1 - p)) };

      if (base) {
        // Cursor tilt eases in (and fades out as the dive takes over); scroll flies the camera to the store.
        tilt.x += (pointer.x - tilt.x) * 0.05;
        tilt.y += (pointer.y - tilt.y) * 0.05;
        const k = 1 - p;
        const cam = {
          center: [base.center[0] + (diveTo[0] - base.center[0]) * p, base.center[1] + (diveTo[1] - base.center[1]) * p] as [number, number],
          zoom: base.zoom + (DIVE.zoom - (narrow ? 0.9 : 0) - base.zoom) * p, // phones land wider so the ring fits
          pitch: base.pitch + (DIVE.pitch - base.pitch) * p - tilt.y * 4 * k,
          bearing: base.bearing + (DIVE.bearing - base.bearing) * p + tilt.x * 6 * k,
          // Frame the store beside the captions: to the right on desktop, below them on phones.
          padding: { left: narrow ? 0 : w * 0.42 * p, top: narrow ? h * 0.54 * p : 0, right: 0, bottom: 0 },
        };
        const key = [cam.center[0].toFixed(7), cam.center[1].toFixed(7), cam.zoom.toFixed(4), cam.pitch.toFixed(3), cam.bearing.toFixed(3), p.toFixed(4)].join();
        if (key !== lastCam) { lastCam = key; map.jumpTo(cam); }
      }
      const seen = (lngLat: [number, number], lift = 0) => {
        const q = map.project(lngLat);
        if (q.x < -60 || q.x > w + 60 || q.y > h + 60) return 0;
        // During the dive the captions own a column (left on desktop, top on phones): keep the map out of it.
        const clearOfStory = narrow ? clamp01((q.y - lift - h * 0.4) / (h * 0.06)) : clamp01((q.x - w * 0.42) / (w * 0.05));
        return visibility(q.x, q.y - lift, w, h, zone) * (1 - p * (1 - clearOfStory));
      };

      const pickProgress = new Array(stores.length).fill(0);
      const picked: string[] = [];
      const list: Bike[] = [];
      bikes.forEach((r, i) => {
        const c = cycleAt(r, t + stagger[i], TIMING);
        const si = storeIndex[r.store];
        if (c.phase === 'picking') pickProgress[si] = Math.max(pickProgress[si], c.progress);
        // Order handed from store to rider: count it (skip the first frame so we don't count on load).
        if (lastPhase[i] === 'picking' && c.phase === 'delivering' && lastCycle[i] === c.cycle) picked.push(r.store);
        lastPhase[i] = c.phase; lastCycle[i] = c.cycle;

        const at = pointAt(r, c.d);
        const alpha = seen(at.position);
        if (alpha === 0) return;
        const moving = c.phase === 'delivering' || c.phase === 'returning';
        const trail = moving ? trailFor(r, c.d, TRAIL) : { path: [at.position, at.position], timestamps: [-1, 0] };
        // The road still ahead: to the customer while carrying, back to the store when empty,
        // and the planned route while the order is being picked.
        const ahead = c.phase === 'delivering' ? segment(r, c.d, r.dropAt)
          : c.phase === 'returning' ? segment(r, c.d, r.total)
          : c.phase === 'picking' ? segment(r, 0, r.dropAt) : [];
        list.push({
          ...at, ...trail, ahead, phase: c.phase, progress: c.progress, alpha,
          carrying: c.phase === 'delivering', drop: drops[i], dropAlpha: Math.min(alpha, seen(drops[i])),
        });
      });
      if (picked.length && !reduced) {
        setOrders((prev) => {
          const next = { ...prev };
          for (const id of picked) next[id] += 1;
          return next;
        });
      }

      // Stores: fade by the quiet zone, show pickup progress, and report which can host a card.
      const clear = new Map<string, number>(); // store id → on-screen x, so cards can keep their distance
      stores.forEach((st, i) => {
        const lngLat = st.lngLat as [number, number];
        const vis = seen(lngLat, 50); // measure from the avatar's middle, which floats above the ground point
        markers[i].style.setProperty('--vis', String(vis)); // CSS var: MapLibre rewrites the marker's own opacity
        markers[i].style.setProperty('--pick', String(pickProgress[i]));
        markers[i].style.setProperty('--picking', pickProgress[i] > 0 ? '1' : '0');
        markers[i].style.pointerEvents = vis > 0.9 ? 'auto' : 'none';
        const p = map.project(lngLat);
        const fits = p.x > CARD_HALF_W && p.x < w - CARD_HALF_W && p.y - CARD_LIFT * 2 > NAV_H && p.y < h - 24;
        if (fits && vis === 1 && seen(lngLat, CARD_LIFT) === 1) clear.set(st.id, p.x);
      });
      eligible.current = clear;

      const pulse = (Math.sin(t * 4) + 1) / 2;
      const delivering = list.filter((b) => b.carrying && b.dropAlpha > 0);
      const handing = list.filter((b) => b.phase === 'handing' && b.dropAlpha > 0);
      const destinations = list.filter((b) => b.phase !== 'returning' && b.dropAlpha > 0);
      // Step 02 of the story ("clock-ins are checked on the spot"): the geofence draws, then fills.
      const ringP = clamp01((d - 0.34) / 0.12), fillP = clamp01((d - 0.44) / 0.08);
      overlay.setProps({
        layers: [
          // Dive finale: the store's 200 m geofence draws itself, then fills.
          new SolidPolygonLayer<[number, number][]>({
            id: 'geofence-fill', data: fillP > 0 ? [ring] : [], getPolygon: (d) => d,
            getFillColor: [...TEAL, 36 * fillP],
          }),
          new PathLayer<[number, number][]>({
            id: 'geofence-line', data: ringP > 0 ? [ring.slice(0, Math.max(2, Math.ceil(ring.length * ringP)))] : [],
            getPath: (d) => d, getColor: [...TEAL, 230], widthUnits: 'pixels', getWidth: 2.5, capRounded: true, jointRounded: true,
          }),
          // Where each bike is headed: faint road ahead (teal to the customer, grey back to the store).
          new PathLayer<Bike>({
            id: 'ahead', data: list.filter((b) => b.ahead.length > 1), getPath: (b) => b.ahead,
            getColor: (b) => b.phase === 'returning' ? [...GREY, 70 * b.alpha]
              : [...TEAL, (b.phase === 'picking' ? 55 * b.progress : 80) * b.alpha],
            widthUnits: 'pixels', getWidth: 2, capRounded: true, jointRounded: true,
          }),
          // Trails: teal while carrying an order, grey on the empty ride back.
          new TripsLayer<Bike>({
            id: 'trails', data: list.filter((b) => b.phase === 'delivering' || b.phase === 'returning'),
            getPath: (b) => b.path, getTimestamps: (b) => b.timestamps,
            currentTime: 0, trailLength: TRAIL, fadeTrail: true,
            getColor: (b) => [...(b.carrying ? TEAL : GREY), (b.carrying ? 170 : 110) * b.alpha],
            widthMinPixels: 3, capRounded: true, jointRounded: true,
          }),
          // Soft ground pulse under the customer's pin while the order is on its way.
          new ScatterplotLayer<Bike>({
            id: 'drop-halo', data: delivering, getPosition: (b) => b.drop, radiusUnits: 'pixels',
            getRadius: 8 + pulse * 6, getFillColor: (b) => [...TEAL, 45 * (1 - pulse) * b.dropAlpha],
          }),
          // Hand-over: a ripple that grows and fades at the door.
          new ScatterplotLayer<Bike>({
            id: 'handover', data: handing, getPosition: (b) => b.drop, radiusUnits: 'pixels',
            stroked: true, filled: false, lineWidthUnits: 'pixels', getLineWidth: 2,
            getRadius: (b) => 6 + b.progress * 26, getLineColor: (b) => [...TEAL, 230 * (1 - b.progress) * b.dropAlpha],
          }),
          // The customer: a home pin that fades in as the order is assigned, flips to ✓ on hand-over.
          new IconLayer<Bike>({
            id: 'destinations', data: destinations, getPosition: (b) => b.drop,
            getIcon: (b) => (b.phase === 'handing' ? DONE_PIN : HOME_PIN), sizeUnits: 'pixels',
            getSize: (b) => (b.phase === 'handing' ? 28 + 6 * Math.sin(Math.min(1, b.progress * 3) * Math.PI) : 28),
            getColor: (b) => [255, 255, 255, 255 * b.dropAlpha * (
              b.phase === 'picking' ? b.progress : b.phase === 'handing' ? 1 - Math.max(0, (b.progress - 0.6) / 0.4) : 1)],
          }),
          new ScatterplotLayer<Bike>({
            id: 'shadows', data: list, getPosition: (b) => b.position,
            getRadius: bikeMetres * 0.36, radiusUnits: 'meters', getFillColor: (b) => [15, 26, 26, 30 * b.alpha],
          }),
          new SimpleMeshLayer<Bike>({
            id: 'bikes', data: list, mesh: MESH,
            getPosition: (b) => b.position, getOrientation: (b) => [0, b.heading, 0],
            getColor: (b) => [255, 255, 255, 255 * b.alpha],
            sizeScale: bikeMetres / SCOOTER_LENGTH, material: MATERIAL,
          }),
        ],
      });

      if (!reduced) raf = requestAnimationFrame(frame);
    };

    map.on('load', () => {
      setReady(true);
      // offset drops the action below the copy.
      const camera = { center: CENTER, pitch: PITCH, offset: [0, el.clientHeight * (narrow ? 0.24 : 0.26)] as [number, number] };
      if (reduced) {
        map.easeTo({ ...camera, duration: 0 });
        return map.once('idle', () => frame(performance.now())); // one still frame
      }
      map.easeTo({ ...camera, duration: 1600, easing: (x: number) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)) }); // expo.out, must end on exactly 1
      map.once('moveend', () => {
        const c = map.getCenter();
        base = { center: [c.lng, c.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() };
      });
      raf = requestAnimationFrame(frame);
    });

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', onPointer);
      map.remove();
    };
  }, [eligible, dive, diveStore]);

  return (
    // reducedMotion="user": with prefers-reduced-motion, Motion drops transforms and keeps fades.
    <MotionConfig reducedMotion="user">
    <div ref={box} className={`${s.map} ${ready ? s.mapReady : ''}`}>
      <a className={s.credit} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        © OpenStreetMap
      </a>
      {markerEls.map((el, i) => {
        const st = stores[i];
        const status = statuses[st.id] ?? 'idle';
        const [inCount, total] = st.roster;
        const card = cards[st.id];
        const hovered = hover === st.id && !card;
        return createPortal(
          <div className={s.store} data-status={status} data-featured={card?.featured ? 'true' : undefined}
            onMouseEnter={() => setHover(st.id)} onMouseLeave={() => setHover(null)}>
            <span className={s.stem} aria-hidden="true" />
            <span className={s.avatar} style={{ '--photo': `url(/stores/${st.id}.webp)` } as CSSProperties} />
            <span className={s.orders}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={orders[st.id]} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }}>
                  {orders[st.id]}
                </motion.span>
              </AnimatePresence>
            </span>
            <AnimatePresence>
              {orders[st.id] !== st.orders && (
                <motion.span key={`plus-${orders[st.id]}`} className={s.plusOne} aria-hidden="true"
                  initial={{ y: 0, opacity: 0 }} animate={{ y: -18, opacity: [0, 1, 0] }}
                  transition={{ duration: 1.1, ease: EASE_OUT }}>
                  +1
                </motion.span>
              )}
            </AnimatePresence>

            <div className={s.cardAnchor}>
              <AnimatePresence>
                {card && (
                  // One card per store: it grows out of the pin, and on a state change (no-show → reliever)
                  // it stays put while only its content cross-fades.
                  <motion.div key="note" className={s.card} data-tone={TONE[card.kind]} data-featured={card.featured ? 'true' : undefined}
                    initial={POP_IN} animate={SETTLED} exit={{ ...POP_OUT, transition: EXIT }} transition={ENTER}>
                    <span className={s.noteIcon} style={{ '--photo': `url(/stores/${st.id}.webp)` } as CSSProperties}>
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span key={card.kind} className={s.noteBadge}
                          initial={{ scale: 0.6, opacity: 0, filter: 'blur(2px)' }}
                          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                          exit={{ scale: 0.6, opacity: 0, transition: EXIT }} transition={BADGE}>
                          <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><path d={ICON[card.kind]} /></svg>
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <span className={s.noteBody}>
                      <span className={s.noteHead}><span>OpsPro</span><span>now</span></span>
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span key={card.kind + card.state} className={s.noteText}
                          variants={LINES} initial="hidden" animate="show" exit="exit">
                          <motion.span className={s.noteState} variants={LINE}>{card.state}</motion.span>
                          <motion.span className={s.noteStore} variants={LINE}>{card.store}</motion.span>
                          <motion.span className={s.noteMeta} variants={LINE}>{card.meta}</motion.span>
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </motion.div>
                )}
                {hovered && (
                  <motion.div key="detail" className={s.detail}
                    initial={POP_IN} animate={SETTLED} exit={{ ...POP_OUT, transition: EXIT }} transition={ENTER}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- tiny static crop inside a map marker */}
                    <img className={s.detailPhoto} src={`/stores/${st.id}-card.webp`} alt="" width={280} height={160} />
                    <span className={s.detailBody}>
                      <span className={s.detailBrand}>{st.brand}</span>
                      <span className={s.cardTitle}>{st.name}</span>
                      <span className={s.cardMeta}>{st.area}</span>
                      <span className={s.detailStats}>
                        <span><span className={s.statNum}>{inCount}/{total}</span> pickers on shift</span>
                        <span><span className={s.statNum}>{orders[st.id]}</span> orders picked</span>
                      </span>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>,
          el,
          st.id,
        );
      })}
    </div>
    </MotionConfig>
  );
}
