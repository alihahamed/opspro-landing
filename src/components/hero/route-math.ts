export type Route = { store: string; path: [number, number][]; dist: number[]; total: number; dropAt: number };

export type Phase = 'picking' | 'delivering' | 'handing' | 'returning';
export type Timing = { speed: number; pick: number; hand: number };

/**
 * One delivery cycle: wait at the store while the order is picked → ride to the drop-off →
 * hand over → ride back. Returns the phase, distance along the loop, progress through the
 * phase (0–1) and which cycle this is, so callers can spot transitions.
 */
export function cycleAt(r: Route, t: number, { speed, pick, hand }: Timing) {
  const out = r.dropAt / speed, back = (r.total - r.dropAt) / speed;
  const period = pick + out + hand + back;
  const cycle = Math.floor(t / period);
  let s = t - cycle * period;
  if (s < pick) return { phase: 'picking' as Phase, d: 0, progress: s / pick, cycle };
  s -= pick;
  if (s < out) return { phase: 'delivering' as Phase, d: s * speed, progress: s / out, cycle };
  s -= out;
  if (s < hand) return { phase: 'handing' as Phase, d: r.dropAt, progress: s / hand, cycle };
  s -= hand;
  return { phase: 'returning' as Phase, d: r.dropAt + s * speed, progress: s / back, cycle };
}

// Index of the segment containing distance d (binary search over cumulative distances).
function segmentAt(dist: number[], d: number) {
  let lo = 0, hi = dist.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (dist[mid] <= d) lo = mid; else hi = mid;
  }
  return lo;
}

function lerp(r: Route, i: number, d: number): [number, number] {
  const span = r.dist[i + 1] - r.dist[i] || 1;
  const t = Math.min(1, Math.max(0, (d - r.dist[i]) / span));
  const [a, b] = r.path[i], [c, e] = r.path[i + 1];
  return [a + (c - a) * t, b + (e - b) * t];
}

const wrap = (r: Route, d: number) => ((d % r.total) + r.total) % r.total;
const positionAt = (r: Route, d: number) => lerp(r, segmentAt(r.dist, wrap(r, d)), wrap(r, d));

/**
 * Position and heading (degrees counter-clockwise from east) at distance d along the loop.
 * Heading looks `span` metres back and ahead, so bikes turn smoothly instead of snapping
 * at every vertex (and never read a zero-length segment).
 */
export function pointAt(r: Route, d: number, span = 12) {
  const [a, b] = positionAt(r, d - span), [c, e] = positionAt(r, d + span);
  const heading = (Math.atan2(e - b, (c - a) * Math.cos((b * Math.PI) / 180)) * 180) / Math.PI;
  return { position: positionAt(r, d), heading };
}

/** The route between two distances along the loop (from < to), e.g. the road still ahead of a bike. */
export function segment(r: Route, from: number, to: number) {
  from = Math.max(0, Math.min(r.total, from));
  to = Math.max(from, Math.min(r.total, to));
  const i0 = segmentAt(r.dist, from), i1 = segmentAt(r.dist, to);
  const path: [number, number][] = [lerp(r, i0, from)];
  for (let k = i0 + 1; k <= i1; k++) path.push(r.path[k]);
  path.push(lerp(r, i1, to));
  return path;
}

/** The last `len` metres behind distance d, with timestamps relative to the head (head = 0). */
export function trailFor(r: Route, d: number, len: number) {
  d = ((d % r.total) + r.total) % r.total;
  const start = Math.max(0, d - len);
  const i0 = segmentAt(r.dist, start), i1 = segmentAt(r.dist, d);
  const path: [number, number][] = [lerp(r, i0, start)];
  const timestamps = [start - d];
  for (let k = i0 + 1; k <= i1; k++) {
    path.push(r.path[k]);
    timestamps.push(r.dist[k] - d);
  }
  path.push(lerp(r, i1, d));
  timestamps.push(0);
  return { path, timestamps };
}
