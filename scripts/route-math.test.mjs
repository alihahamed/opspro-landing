// `npm test` — checks the bike position/trail maths on a tiny synthetic route.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cycleAt, pointAt, segment, trailFor } from '../src/components/hero/route-math.ts';
import { visibility, ZONE_DESKTOP } from '../src/components/hero/zone.ts';

// East 100 m, then north 100 m (roughly, at the equator).
const r = { store: 's', path: [[0, 0], [0.0009, 0], [0.0009, 0.0009]], dist: [0, 100, 200], total: 200, dropAt: 100 };

test('pointAt interpolates and reports heading', () => {
  const a = pointAt(r, 50);
  assert.ok(Math.abs(a.position[0] - 0.00045) < 1e-9 && a.position[1] === 0);
  assert.ok(Math.abs(a.heading) < 1e-6); // heading east
  assert.ok(Math.abs(pointAt(r, 150).heading - 90) < 1e-6); // heading north
});

test('pointAt wraps around the loop', () => {
  assert.deepEqual(pointAt(r, 250).position, pointAt(r, 50).position);
});

test('trailFor spans the corner with head at t=0', () => {
  const t = trailFor(r, 150, 100);
  assert.equal(t.timestamps.at(-1), 0);
  assert.equal(t.timestamps[0], -100);
  assert.deepEqual(t.path[1], [0.0009, 0]); // includes the corner vertex
  assert.equal(t.path.length, t.timestamps.length);
});

test('trailFor clamps at the start of the loop', () => {
  assert.equal(trailFor(r, 30, 100).timestamps[0], -30);
});

test('segment returns the road between two distances, corner included', () => {
  const s = segment(r, 50, 150);
  assert.equal(s.length, 3);
  assert.ok(Math.abs(s[0][0] - 0.00045) < 1e-9);
  assert.deepEqual(s[1], [0.0009, 0]);
  assert.ok(Math.abs(s[2][1] - 0.00045) < 1e-9);
});

test('cycleAt runs pick → deliver → hand over → return, then repeats', () => {
  const loop = { ...r, dropAt: 120 }; // 120 m out, 80 m back
  const T = { speed: 10, pick: 4, hand: 2 }; // 4s + 12s + 2s + 8s = 26s period
  assert.deepEqual(cycleAt(loop, 1, T), { phase: 'picking', d: 0, progress: 0.25, cycle: 0 });
  assert.equal(cycleAt(loop, 10, T).phase, 'delivering');
  assert.equal(cycleAt(loop, 10, T).d, 60);
  assert.equal(cycleAt(loop, 17, T).phase, 'handing');
  assert.equal(cycleAt(loop, 17, T).d, 120);
  assert.equal(cycleAt(loop, 22, T).phase, 'returning');
  assert.equal(cycleAt(loop, 22, T).d, 160);
  assert.equal(cycleAt(loop, 27, T).phase, 'picking');
  assert.equal(cycleAt(loop, 27, T).cycle, 1);
});

test('visibility hides activity behind the copy and shows it outside the fade', () => {
  const z = ZONE_DESKTOP, W = 1440, H = 900;
  assert.equal(visibility(W * z.cx, H * z.cy, W, H, z), 0); // headline centre
  assert.equal(visibility(W * z.cx, H * (z.cy + z.ry * 0.7), W, H, z), 0); // CTA area, still solid fade
  assert.equal(visibility(W * z.cx, H * 0.97, W, H, z), 1); // bottom band
  assert.equal(visibility(20, 60, W, H, z), 1); // top-left corner
  const edge = visibility(W * z.cx, H * (z.cy + z.ry * 0.9), W, H, z);
  assert.ok(edge > 0 && edge < 1); // eases in across the fade edge
});
