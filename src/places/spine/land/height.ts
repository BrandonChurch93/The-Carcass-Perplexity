// The shape of the Spine's ground: the ridge of the layout (ridge.ts) with what the weather and the rock add to it.
// Nothing is added where the animals trod and where the cameras stand, so that everything placed on the layout's ground stands on this one.
import { EXIT, MOUTH_S, canalL, first, flare, frameAt, ground, locate } from '../ridge';
import { trail } from '../shared/anchors';

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

/** Metres from the trodden ground: the trail to the mouth, the threshold and the shelf at the far mouth. */
function trodden(s: number, l: number): number {
  const d = s - MOUTH_S;
  let c = 1e4;
  if (d < 8) c = Math.max(Math.abs(l - trail(s)), first.s - 790 - s, d - 8);
  if (d > -60 && d < EXIT + 90) c = Math.min(c, Math.max(0, Math.abs(l - canalL(Math.max(0, d))) - flare(d) - 6));
  return c;
}

/** The ground at ridge coordinates: s metres along the crest, l across it. */
export function heightAt(s: number, l: number): number {
  const base = ground(s, l);
  const f = frameAt(s);
  const x = f.x + f.nx * l;
  const z = f.z + f.nz * l;
  const free = smooth(4, 38, trodden(s, l));
  const out = Math.abs(l);
  // Ribs and gullies down the flanks, deeper the further down.
  const ribs = (ridged(x / 210 + 3.1, z / 210) - 0.5) * Math.min(90, 0.2 * out) + (ridged(x / 74, z / 74 + 7.7) - 0.5) * Math.min(26, 0.09 * out);
  // Outcrops: rock that stands out of the snow, in places.
  const where = smooth(0.52, 0.74, vnoise(x / 64 + 11.3, z / 64 + 4.1));
  const crag = where * (7 * ridged(x / 23, z / 23) + 2.6 * ridged(x / 7.3 + 1.7, z / 7.3) - 2.5);
  // Drifts: the snow lies in long low waves across the wind.
  const drift = 0.7 * (vnoise(x / 9 + 5.5, z / 31) - 0.5) + 0.25 * (vnoise(x / 2.7, z / 8.1 + 2.2) - 0.5);
  return base + free * (ribs + Math.max(crag, -0.6)) + smooth(1.5, 9, trodden(s, l)) * drift;
}

/** The ground at a point of the world. */
export function height(x: number, z: number): number {
  const at = locate(x, z);
  return heightAt(at.s, at.l);
}
