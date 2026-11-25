// The shape of the Spine's ground: the ridge of the layout (ridge.ts) with what the weather and the rock add to it.
// Nothing is added where the animals trod and where the cameras stand, so that everything placed on the layout's ground stands on this one.
import { CANAL_L, EXIT, MOUTH_R, MOUTH_S, canalL, first, flare, frameAt, ground, locate } from '../ridge';
import { CARCASS_S, trail } from '../shared/anchors';

const hash = (x: number, y: number): number => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

const ridged = (x: number, y: number): number => 1 - Math.abs(2 * vnoise(x, y) - 1);
const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Fractured rock: the plane broken into slabs of no two shapes, each a flat face with its own height and tilt. u runs along the beds, v across them, in metres; about -0.8 to 0.8. */
export function slab(u: number, v: number, long: number, wide: number, seed: number): number {
  const x = u / long;
  const y = v / wide;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let best = 1e9;
  let bi = 0;
  let bj = 0;
  let bx = 0;
  let by = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i;
      const cy = yi + j;
      const px = cx + hash(cx * 3 + seed, cy * 7 + 1);
      const py = cy + hash(cx * 5 + 2, cy * 3 + seed);
      const d = (px - x) * (px - x) + (py - y) * (py - y);
      if (d < best) {
        best = d;
        bi = cx;
        bj = cy;
        bx = px;
        by = py;
      }
    }
  }
  const k = bi * 31 + seed * 101;
  return hash(k, bj) - 0.5 + 0.6 * (hash(k + 7, bj + 3) - 0.5) * (x - bx) + 0.6 * (hash(k + 13, bj + 5) - 0.5) * (y - by);
}

/** Metres from the trodden ground: the trail to the mouth, the threshold and the shelf at the far mouth. */
function trodden(s: number, l: number): number {
  const d = s - MOUTH_S;
  let c = 1e4;
  if (d < 0.5) c = Math.max(Math.abs(l - trail(s)), first.s - 790 - s);
  // The apron before the near mouth, between the trail and the rock, is drifted snow and nothing else: the mouth is seen from far up the trail.
  if (d > -175 && d < 0.5 && l > trail(s) && l < CANAL_L + MOUTH_R + 4) c = 0;
  // Where the lightning came to ground the snow is open: the carcass lies on a bare saddle, with the band beyond it.
  c = Math.min(c, Math.max(0, Math.hypot(s - CARCASS_S - 14, l - 16) - 36));
  if ((d > -60 && d < 2) || (d > EXIT - 2 && d < EXIT + 90)) c = Math.min(c, Math.max(0, Math.abs(l - canalL(Math.max(0, d))) - flare(d) - 6));
  return c;
}

/** The ground at ridge coordinates (s metres along the crest, l across it) and how much of it there is bare rock standing out of the snow. */
export function landAt(s: number, l: number): { y: number; rock: number } {
  const base = ground(s, l);
  const f = frameAt(s);
  const x = f.x + f.nx * l;
  const z = f.z + f.nz * l;
  const near = trodden(s, l);
  const free = smooth(3, 16, near);
  const out = Math.abs(l);
  // Ribs and gullies down the flanks, deeper the further down.
  const ribs = (ridged(x / 210 + 3.1, z / 210) - 0.5) * Math.min(90, 0.2 * out) + (ridged(x / 74, z / 74 + 7.7) - 0.5) * Math.min(26, 0.09 * out);
  // Outcrops: rock that stands out of the snow in broken slabs, here and there on the crest and over most of the steep flanks.
  const patch = smooth(0.36, 0.54, vnoise(x / 58 + 11.3, z / 58 + 4.1));
  const steep = 0.9 * smooth(30, 110, out) * smooth(0.22, 0.48, vnoise(x / 150 + 2.2, z / 150 + 8.8));
  // The buttress over the canal is rock, all of it.
  const d = s - MOUTH_S;
  const over = d > 0 && d < EXIT && Math.abs(l - canalL(d)) < flare(d) + 30 ? 0.9 : 0;
  const small = 0.85 * smooth(0.5, 0.64, vnoise(x / 19 + 3.7, z / 19 + 9.4));
  const where = Math.max(patch, small, steep, over);
  const u = 0.82 * x + 0.57 * z;
  const v = -0.57 * x + 0.82 * z;
  const crag = where * (9 * slab(u, v, 40, 14, 3) + 3.6 * slab(u + 0.4 * v, v, 14, 6, 5) + 3 * ridged(x / 23, z / 23) - 0.6);
  // Drifts: the snow lies in long low waves across the wind.
  const drift = 1.5 * (ridged(x / 16 + 5.5, z / 52) - 0.6) + 0.7 * (vnoise(x / 9 + 5.5, z / 31) - 0.5) + 0.25 * (vnoise(x / 2.7, z / 8.1 + 2.2) - 0.5);
  return { y: base + free * (ribs + Math.max(crag, -0.8)) + smooth(1.5, 9, near) * drift, rock: free * smooth(0.2, 1.6, crag) };
}

export function heightAt(s: number, l: number): number {
  return landAt(s, l).y;
}

/** The ground at a point of the world. */
export function height(x: number, z: number): number {
  const at = locate(x, z);
  return heightAt(at.s, at.l);
}
