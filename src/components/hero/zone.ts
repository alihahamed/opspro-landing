// The copy's "quiet zone": one ellipse drives both the concave fade and where map activity may appear,
// so bikes, pins and cards never show up behind the headline. Values are fractions of the hero box.
export type Zone = { cx: number; cy: number; rx: number; ry: number };

export const ZONE_DESKTOP: Zone = { cx: 0.5, cy: 0.27, rx: 0.36, ry: 0.5 };
export const ZONE_MOBILE: Zone = { cx: 0.5, cy: 0.26, rx: 0.9, ry: 0.52 };
export const zoneFor = (width: number) => (width < 768 ? ZONE_MOBILE : ZONE_DESKTOP);

export const fadeGradient = (z: Zone) =>
  `radial-gradient(ellipse ${z.rx * 100}% ${z.ry * 100}% at ${z.cx * 100}% ${z.cy * 100}%, ` +
  'var(--bg) 58%, rgb(246 248 248 / 0.72) 78%, rgb(246 248 248 / 0) 100%)';

/** 0 inside the faded copy area, 1 once clear of the fade, smooth in between. */
export function visibility(x: number, y: number, w: number, h: number, z: Zone) {
  const r = Math.hypot((x / w - z.cx) / z.rx, (y / h - z.cy) / z.ry);
  return Math.min(1, Math.max(0, (r - 0.88) / 0.12));
}
