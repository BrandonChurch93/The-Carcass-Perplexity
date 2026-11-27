// What the gale and the frost cut into the crest at a size the wide mesh cannot hold: sastrugi in the snow, and the broken edges of the
// rock that stands out of it. It is added to the ground only in the fine field of the crest (meshes.ts), clear of the trail and of the
// dead one, so that everything placed on the layout's ground still stands on it.
import { first } from '../ridge';
import { CARCASS, CARCASS_S, trail } from '../shared/anchors';
import { slab, vnoise } from './height';

const hash = (x: number, y: number): number => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const FIELD_FROM = first.s - 700;
export const FIELD_TO = first.s - 330;
export const FIELD_WIDE = 45;

/** One set of sastrugi: lanes along the gale, each cut into tongues of no two lengths, a steep nose into the wind and a long tail down it. */
function tongues(a: number, w: number, wide: number, long: number, seed: number): number {
  const ka = a / wide + 0.9 * (vnoise(w / (4.5 * long) + seed, a / (3 * wide)) - 0.5);
  const k = Math.floor(ka);
  const f = ka - k;
  const t = w / (long * (0.6 + 0.9 * hash(k, seed + 3))) + 7.3 * hash(k, seed + 11) + 0.5 * (vnoise(a / (2.7 * wide), w / (2.1 * long) + seed) - 0.5);
  const m = Math.floor(t);
  const g = t - m;
  const stands = Math.max(0, hash(k * 7 + seed, m) - 0.22) / 0.78;
  const across = smooth(0, 0.5 + 0.3 * hash(k + seed, m * 3), (1 - Math.abs(2 * f - 1)) * (1 - 0.55 * g));
  return stands * across * smooth(0, 0.07, g) * Math.pow(1 - g, 1.25);
}

/** Metres added to the ground at (x, z), ridge coordinates (s, l), the rock it lays bare (0 to 1), and how far the snow stands over or under the middle of its relief. */
export function driftAt(s: number, l: number, x: number, z: number): { y: number; rock: number; snow: number } {
  const edge = Math.min(smooth(0, 9, s - FIELD_FROM), smooth(0, 9, FIELD_TO - s), smooth(0, 7, FIELD_WIDE - Math.abs(l)));
  const path = Math.abs(l - trail(s));
  const clear = edge * smooth(1.6, 5.5, path) * smooth(5, 10, Math.hypot(x - CARCASS[0], z - CARCASS[2]));
  if (clear <= 0) return { y: 0, rock: 0, snow: 0 };
  // The rock, as height.ts has it, with the edges of its slabs as steep as this mesh can cut them.
  const near = Math.min(path, Math.max(0, Math.hypot(s - CARCASS_S - 14, l - 16) - 36));
  const free = smooth(2.5, l > 0 ? 16 : 30, near);
  const out = Math.abs(l);
  const patch = smooth(0.4, 0.58, vnoise(x / 58 + 11.3, z / 58 + 4.1));
  const steep = 0.9 * smooth(16, 70, out) * (0.5 + 0.5 * smooth(0.22, 0.48, vnoise(x / 150 + 2.2, z / 150 + 8.8)));
  const small = 0.85 * smooth(0.52, 0.66, vnoise(x / 19 + 3.7, z / 19 + 9.4));
  const where = free * Math.max(patch, small, steep);
  const u = 0.82 * x + 0.57 * z;
  const v = -0.57 * x + 0.82 * z;
  const broad = 7 * slab(u, v, 40, 14, 3, 3.2) + 3.6 * slab(u + 0.4 * v, v, 14, 6, 5, 2.8);
  const cut = 7 * slab(u, v, 40, 14, 3, 0.45) + 3.6 * slab(u + 0.4 * v, v, 14, 6, 5, 0.4);
  const stands = smooth(0.5, 2.6, where * (broad + 1.5 * (vnoise(x / 6.5 + 2.1, z / 6.5) - 0.5) + 2 * (1 - Math.abs(2 * vnoise(x / 23, z / 23) - 1)) - 0.6));
  const blocks = stands * (1.5 * slab(u + 0.3 * v, v, 5.2, 2.3, 17, 0.3) + 0.5 * slab(u, v - 0.2 * u, 1.9, 1.1, 23, 0.25));
  const rock = where * (cut - broad) + blocks;
  // The snow: two sets of sastrugi a little turned against each other, none where the wind has polished the pack and none on the rock.
  const a = 0.98 * x - 0.2 * z;
  const w = 0.2 * x + 0.98 * z;
  const a2 = 0.94 * x - 0.34 * z;
  const w2 = 0.34 * x + 0.94 * z;
  const field = 0.25 + 0.75 * smooth(0.3, 0.62, vnoise(x / 37 + 9.2, z / 37 + 1.4));
  const snow = (1 - stands) * (field * Math.max(0.75 * tongues(a, w, 3.1, 11, 1), 0.48 * tongues(a2, w2, 1.7, 6, 5)) + 0.09 * tongues(a, w, 0.8, 2.6, 9));
  return { y: clear * (rock + snow), rock: clear * stands, snow: clear * (1 - stands) * (snow - 0.12) };
}
