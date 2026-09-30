// Delivery scooter for SimpleMeshLayer: metres, facing +x, z up, per-vertex colours.
// Base: "Scooter" by Poly by Google (CC-BY, poly.pizza/m/eHdEFPwUfCt), baked by scripts/convert-scooter.py.
// On top: our rider and the teal delivery box, so the front (visor, handlebars) and back (box) read at a glance.
import base from '@/data/scooter-mesh.json';

const JACKET = '#3F4E4E', WHITE = '#FFFFFF', INK = '#1F2A2A', TEAL = '#00CCBC', TEAL_DARK = '#00A89B';

type Box = [x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, hex: string];

const EXTRAS: Box[] = [
  [-0.99, -0.45, -0.27, 0.27, 0.96, 1.46, TEAL],      // delivery box on the rear rack
  [-1.0, -0.44, -0.28, 0.28, 1.46, 1.51, TEAL_DARK],  // box lid
  [-0.42, -0.08, -0.19, 0.19, 0.9, 1.44, JACKET],     // torso
  [-0.36, 0.1, 0.08, 0.2, 0.88, 1.0, JACKET],         // thighs
  [-0.36, 0.1, -0.2, -0.08, 0.88, 1.0, JACKET],
  [0.02, 0.14, 0.08, 0.2, 0.42, 0.92, JACKET],        // shins down to the floorboard
  [0.02, 0.14, -0.2, -0.08, 0.42, 0.92, JACKET],
  [-0.18, 0.26, 0.17, 0.26, 1.16, 1.25, JACKET],      // arms reaching the handlebars
  [-0.18, 0.26, -0.26, -0.17, 1.16, 1.25, JACKET],
  [-0.4, -0.1, -0.15, 0.15, 1.46, 1.74, WHITE],       // helmet
  [-0.12, -0.08, -0.12, 0.12, 1.53, 1.67, INK],       // visor, facing forward
];

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

export const SCOOTER_LENGTH = 2.0; // metres incl. the box, used to keep bikes a constant on-screen size

export function scooterMesh() {
  const pos = [...base.positions], nrm = [...base.normals], col = [...base.colors];
  const quad = (n: number[], vs: number[][], c: number[]) => {
    for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...vs[k]); nrm.push(...n); col.push(...c); }
  };
  for (const [x0, x1, y0, y1, z0, z1, hex] of EXTRAS) {
    const c = rgb(hex);
    quad([1, 0, 0], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], c);
    quad([-1, 0, 0], [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], c);
    quad([0, 1, 0], [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]], c);
    quad([0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], c);
    quad([0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c);
    quad([0, 0, -1], [[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0]], c);
  }
  return {
    positions: { value: new Float32Array(pos), size: 3 },
    normals: { value: new Float32Array(nrm), size: 3 },
    colors: { value: new Float32Array(col), size: 3 },
  };
}
