import * as THREE from 'three';
import { PLATE_DATA, PLATE_HEIGHT, PLATE_METRES, PLATE_WIDTH } from './land/plate';

export const RAD = Math.PI / 180;
export const SEA = -0.4;
export const SHAFT = 30;
export const DEPTH = 70;
export const NEAR = 400;

export const sat = (v: number): number => Math.min(1, Math.max(0, v));
export const smooth = (v: number): number => {
  const u = sat(v);
  return u * u * (3 - 2 * u);
};
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export const bearingOf = (x: number, z: number): number => Math.atan2(x, -z);

export function bump(bearing: number, centreDeg: number, widthDeg: number): number {
  let d = Math.abs(bearing - centreDeg * RAD) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  const w = widthDeg * RAD;
  return d < w ? 0.5 + 0.5 * Math.cos((Math.PI * d) / w) : 0;
}

/** The rim of the main shaft: broken out to the east-south-east where the wall fell, bitten and ragged all round. */
export const rimRadius = (bearing: number): number =>
  SHAFT + 7 * bump(bearing, 112, 42) + 2.2 * bump(bearing, 215, 30) + 1.0 * Math.sin(5 * bearing + 1) + 0.5 * Math.sin(11 * bearing + 0.5) + 0.4 * Math.sin(29 * bearing + 2);

export const onRim = (bearingDeg: number, out = 0): [number, number] => {
  const b = bearingDeg * RAD;
  const r = rimRadius(b) + out;
  return [Math.sin(b) * r, -Math.cos(b) * r];
};

const soft = (v: number): number => 0.5 * (v + Math.sqrt(v * v + 64));
/** The channel winds: it swings a few metres either way to the south and a dozen to the north, and it narrows and widens as it goes. Not
 *  between z -40 and -16, where the waders feed under the low lens: there it runs as it was laid out. */
const reach = (z: number): number => smooth((Math.abs(z + 28) - 12) / 25);
const wind = (z: number): number => Math.sin((z + 28) / 22) * (z < -28 ? 11 : 4.5) * reach(z);
/** How wide the channel is at z against its plan: 0.6 to 1.4. */
export const channelWidth = (z: number): number => 1 + reach(z) * (0.8 * Math.sin(z / 17 + 0.6) * Math.sin(z / 41 + 2.2) - 0.1);
export const channelX = (z: number): number => -50 + 0.4 * soft(z - 5) - 0.3 * soft(-z - 10) + wind(z);
export const channelHalf = (z: number): number => (5 + 2.5 * sat((5 - z) / 15) + 14 * sat((-5 - z) / 40)) * channelWidth(z) + 140 * sat((z - 130) / 220);

// A lattice noise that is the same wherever and whenever it is asked: 0 to 1.
const hash2 = (ix: number, iz: number): number => {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export function noise2(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm2(x: number, z: number, octaves: number): number {
  let s = 0;
  let a = 0.5;
  let n = 0;
  for (let i = 0; i < octaves; i++) {
    s += a * noise2(x, z);
    n += a;
    x = x * 2.03 + 17.3;
    z = z * 2.03 + 9.1;
    a *= 0.5;
  }
  return s / n;
}

const ripple = (x: number, z: number): number => (1 - 0.8 * smooth((Math.hypot(x, z) - 120) / 70)) * (0.6 * Math.sin(x * 0.07 + 0.5 * Math.sin(z * 0.05)) * Math.sin(z * 0.09 + 1.3) + 0.4 * Math.sin(x * 0.19 + z * 0.13 + 0.7));
const swell = (x: number, z: number): number => 0.65 * Math.sin(x * 0.021 + 1.9 * Math.sin(z * 0.013 + 0.4)) + 0.35 * Math.sin(z * 0.047 - x * 0.031 + 2.1);

/** Kept for the blockout: the old pavement of sines. */
export function plates(x: number, z: number): number {
  const s = 0.5 * Math.sin(x * 0.045 + 1.7 * Math.sin(z * 0.031 + 0.3)) + 0.3 * Math.sin(z * 0.083 + 1.3 * Math.sin(x * 0.052 + 2.0)) + 0.2 * Math.sin(x * 0.13 - z * 0.11 + 1.1);
  const t = s * 2.3 + 0.35 * Math.sin(x * 0.31 + 0.6 * Math.sin(z * 0.27)) * Math.sin(z * 0.29 + 1.9);
  const f = t - Math.floor(t);
  return 0.2 * (Math.floor(t) + smooth((f - 0.93) / 0.07));
}

export function lipHeight(bearing: number, r: number): number {
  const out = r - rimRadius(bearing);
  const north = 3.4 * bump(bearing, 40, 95) * (1 - smooth((out - 3) / 13));
  const south = 2.6 * bump(bearing, 158, 34) * (1 - smooth((out - 1) / 11));
  const west = 1.5 * bump(bearing, -72, 50) * (1 - smooth((out - 1) / 7));
  return north + south + west;
}

/** The smooth ground under the plates: the shelf, the lips of the shaft, the flats, the tide channel with its shallows. */
export function smoothGround(x: number, z: number): number {
  const xc = channelX(z);
  // The west bank comes in closer than the east one where the channel opens out to the north.
  const half = x < xc ? (5 - 1.2 * sat((z - 12) / 12) + 2.5 * sat((5 - z) / 15) + 8 * sat((-25 - z) / 50)) * channelWidth(z) + 140 * sat((z - 130) / 220) : channelHalf(z);
  const r = Math.hypot(x, z);
  const b = bearingOf(x, z);
  const broad = 0.6 * (fbm2(x / 23 + 3.1, z / 23 + 7.7, 3) - 0.5);
  let base: number;
  if (x < xc) {
    const flats = Math.max(smooth((-15 - z) / 60), smooth((xc - half - 45 - x) / 60));
    base = lerp(0.5 + 0.14 * ripple(x, z) + 1.5 * broad, -0.2 + 0.45 * swell(x, z) + 0.1 * ripple(x, z) + 0.7 * broad, flats);
    base -= 0.004 * Math.max(0, -x - 420);
  } else {
    const wet = smooth((r - 70) / 120) * smooth((-z - 30) / 90);
    base = lerp(0.5 + 0.13 * ripple(x, z) + 1.5 * broad, -0.12 + 0.42 * swell(x, z) + 0.1 * ripple(x, z) + 0.7 * broad, 0.85 * wet);
    base += lipHeight(b, r);
  }
  const south = sat((z + 5) / 12);
  const ragged =
    south * (x < xc ? 1.7 * Math.sin(z * 0.19 + 0.6) + 1.1 * Math.sin(z * 0.43 + 2.2) : 1.5 * Math.sin(z * 0.23 + 3.1) + 1.2 * Math.sin(z * 0.51 + 0.4)) + 5 * (noise2(z / 9 + (x < xc ? 40 : 0), 0.5) - 0.5) + 2.2 * (noise2(z / 2.7 + (x < xc ? 11 : 0), 3.5) - 0.5);
  // Metres inside the bank: the bed shelves gently, ankle deep for a long way, and only the middle of the wide reach is deeper.
  const inside = half - 2 + ragged - Math.abs(x - xc);
  // The bank is a broken edge of plate, not a beach: the rock stands to the water and the bed begins a stride inside it.
  const bank = smooth(inside / lerp(2.4, 1.6, south) + 1);
  const bedLevel = SEA - 0.06 - 0.16 * smooth(inside / 4) - 0.5 * smooth((inside - 9) / 6);
  let h = lerp(base, bedLevel, bank);
  // A bar of rock in the shallows, just awash: it lies under the lens of the picture of the waders feeding.
  const dx = x + 50.4;
  const dz = z + 22.6;
  h += 0.62 * Math.exp(-(dx * dx * 0.5 + dz * dz) / 7) + 0.3 * Math.exp(-((x + 46.5) * (x + 46.5) + (z + 24.2) * (z + 24.2)) / 2.5);
  return h;
}

/** The rectangle of ground that is drawn fine and baked into the near map (land/field.ts): it holds every camera of the place and the whole rim. */
export const FINE = { minX: -84, minZ: -70, size: 122.88, cells: 2048 };
export const inFine = (x: number, z: number, margin = 0): boolean => x > FINE.minX + margin && x < FINE.minX + FINE.size - margin && z > FINE.minZ + margin && z < FINE.minZ + FINE.size - margin;

// The plate of the shelf (public/assets/breath/mat/shelfplate.jpg and its relief): 48 m by 27 m of the pavement seen from straight above,
// laid over the whole shelf turn and turn about (each repeat is the mirror of the last, so no edge shows). Its relief is the shape of the
// ground and its colour is the colour of the ground: the two are one picture, so every crack is dark and every plate has its own edge.
const plateBytes = Uint8Array.from(atob(PLATE_DATA), (c) => c.charCodeAt(0));
export const PLATE = { metres: PLATE_METRES, depth: (PLATE_METRES * PLATE_HEIGHT) / PLATE_WIDTH };
// The plate's beds run across its picture. Every lens of this place looks north, so laid square they ran across every frame, and a low
// lens drew them out into long parallel streaks like the grain of a plank. The plate is laid turned, its beds running nearly away from the lens.
export const PLATE_TURN = { cos: Math.cos(1.25), sin: Math.sin(1.25) };
/** The plate's relief is drawn as this many metres from black to white. */
export const RELIEF = 0.08;
/** Under this level of the plate's relief water stands: the pool in the plate's hollow. */
export const POOL = 0.11;
const mirror = (t: number): number => {
  const m = t - 2 * Math.floor(t / 2);
  return m > 1 ? 2 - m : m;
};
/** The plate's relief at a place on the ground: 0 to 1. */
export function plateAt(wx: number, wz: number): number {
  const x = PLATE_TURN.cos * wx + PLATE_TURN.sin * wz;
  const z = PLATE_TURN.cos * wz - PLATE_TURN.sin * wx;
  const fx = Math.min(PLATE_WIDTH - 1.001, Math.max(0, mirror(x / PLATE.metres) * PLATE_WIDTH - 0.5));
  const fz = Math.min(PLATE_HEIGHT - 1.001, Math.max(0, mirror(z / PLATE.depth) * PLATE_HEIGHT - 0.5));
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const u = fx - i;
  const v = fz - j;
  const k = j * PLATE_WIDTH + i;
  return (((plateBytes[k] as number) * (1 - u) + (plateBytes[k + 1] as number) * u) * (1 - v) + ((plateBytes[k + PLATE_WIDTH] as number) * (1 - u) + (plateBytes[k + PLATE_WIDTH + 1] as number) * u) * v) / 255;
}

/** Metres a plate of the shelf is across, about. */
const SLAB = 7.5;
/** The heights a plate may lie at, as the risers between them going up: none the same as the next, a hand to two feet. They repeat. */
const RISERS = [0.3, 0.12, 0.45, 0.2, 0.6, 0.08, 0.35];
const RUN = RISERS.reduce((sum, r) => sum + r, 0);
const levelOf = (v: number): number => {
  const n = Math.floor(v / RUN);
  let rest = v - n * RUN;
  let at = 0;
  for (const r of RISERS) {
    if (rest < r) break;
    rest -= r;
    at += r;
  }
  return n * RUN + at;
};
/** One plate: where its middle is, how high its top is there, and how its top leans (metres a metre, east and south). */
interface Slab {
  x: number;
  z: number;
  top: number;
  tx: number;
  tz: number;
}
const slabs = new Map<number, Slab>();
function slabOf(i: number, j: number): Slab {
  const key = (i + 2048) * 4096 + (j + 2048);
  const known = slabs.get(key);
  if (known) return known;
  const x = (i + 0.12 + 0.76 * hash2(i * 3 + 1, j * 3 + 7)) * SLAB;
  const z = (j + 0.12 + 0.76 * hash2(i * 3 + 5, j * 3 + 2)) * SLAB;
  const base = smoothGround(x, z);
  const gx = (smoothGround(x + 1.5, z) - smoothGround(x - 1.5, z)) / 3;
  const gz = (smoothGround(x, z + 1.5) - smoothGround(x, z - 1.5)) / 3;
  // It lies at one of the levels, near the smooth ground under its middle; it leans most of the way with that ground and a degree or two
  // its own way; and no two of a level are quite level with each other, so even they part at a crack with a lip of a few centimetres.
  const slab: Slab = {
    x,
    z,
    top: levelOf(base + 0.5 * (fbm2(x / 30 + 1.3, z / 30 + 4.1, 2) - 0.5) + 40 * RUN) - 40 * RUN + 0.1 + 0.07 * (hash2(i * 7 + 3, j * 5 + 11) - 0.5),
    tx: 0.7 * Math.max(-0.25, Math.min(0.25, gx)) + 0.05 * (hash2(i * 5 + 9, j * 7 + 4) - 0.5),
    tz: 0.7 * Math.max(-0.25, Math.min(0.25, gz)) + 0.05 * (hash2(i * 11 + 2, j * 3 + 13) - 0.5),
  };
  slabs.set(key, slab);
  return slab;
}
/** The plates of the shelf: the limestone breaks in plates some metres across, each with a top that is nearly level and leans its own way,
 *  lying at its own height (5 to 60 cm between two that differ, and most neighbours do not), parted from the next by a broken edge that
 *  follows the plate picture's own cracks and is never straight for long. Gives the height of the ground there, metres. */
export function bedded(x: number, z: number): number {
  // Where a place looks for its plate is pushed about: broadly, by the plate picture's own relief (so an edge runs along a crack of the
  // picture), and finely (so an edge is snapped into pieces of a metre or two).
  const wx = x + 4.2 * (fbm2(x / 11 + 7.1, z / 11 + 2.3, 2) - 0.5) + 1.3 * (plateAt(x + 1.7, z - 0.9) - 0.5) + 0.7 * (noise2(x / 1.7 + 3.3, z / 1.7 + 9.1) - 0.5) + 0.32 * (noise2(x / 0.5 + 6.1, z / 0.5 + 1.4) - 0.5);
  const wz = z + 4.2 * (fbm2(x / 11 + 31.4, z / 11 + 18.6, 2) - 0.5) + 1.3 * (plateAt(x - 1.1, z + 2.3) - 0.5) + 0.7 * (noise2(x / 1.7 + 14.7, z / 1.7 + 5.2) - 0.5) + 0.32 * (noise2(x / 0.5 + 2.9, z / 0.5 + 8.3) - 0.5);
  const ci = Math.floor(wx / SLAB);
  const cj = Math.floor(wz / SLAB);
  let d1 = 1e9;
  let d2 = 1e9;
  let s1: Slab | null = null;
  let s2: Slab | null = null;
  for (let a = -2; a <= 2; a++) {
    for (let b = -2; b <= 2; b++) {
      const s = slabOf(ci + a, cj + b);
      const d = Math.hypot(wx - s.x, wz - s.z);
      if (d < d1) {
        d2 = d1;
        s2 = s1;
        d1 = d;
        s1 = s;
      } else if (d < d2) {
        d2 = d;
        s2 = s;
      }
    }
  }
  if (!s1 || !s2) return smoothGround(x, z);
  const h1 = s1.top + s1.tx * (x - s1.x) + s1.tz * (z - s1.z);
  const h2 = s2.top + s2.tx * (x - s2.x) + s2.tz * (z - s2.z);
  // Metres to the edge of the plate, about. The riser is a third of a metre through (the mesh that draws it has cells of 18 cm), and a crack runs along its foot.
  const edge = 0.5 * (d2 - d1);
  const k = 1 - smooth(edge / 0.17);
  return h1 + 0.5 * (h2 - h1) * k - 0.05 * (1 - smooth(edge / 0.07)) * (h1 < h2 + 0.03 ? 1 : 0.2);
}

/** Where the dead wader lies (DEAD_WADER of shared/anchors.ts) the rock is one dry plate, level to a few centimetres for 3.2 m round, standing
 *  clear of the tide: 1 on it, 0 off it. */
const PAD: [number, number] = [-27.3, 22.6];
/** Its edge is a plate's: broken, never round, 3.2 to 5 m from the middle, and a riser a third of a metre through. */
export const padAt = (x: number, z: number): number =>
  1 - smooth((Math.hypot(x - PAD[0], (z - PAD[1]) * 1.25) - 3.6 - 2.2 * (fbm2(x / 4.5 + 9.3, z / 4.5 + 2.8, 2) - 0.36) - 0.5 * (noise2(x / 1.1 + 4.4, z / 1.1 + 7.7) - 0.5)) / 0.35);
let padHeight: number | null = null;
const padLevel = (): number => (padHeight ??= Math.max(SEA + 0.45, smoothGround(PAD[0], PAD[1]) - 0.1));

/** The ground everything stands on: the smooth land with the plate's relief on it. Outside the fine rectangle the plates are too small for
 *  the mesh that draws them and the ground is the same land worn smooth. */
export function ground(x: number, z: number): number {
  const base = smoothGround(x, z);
  const edge = Math.min(x - FINE.minX, FINE.minX + FINE.size - x, z - FINE.minZ, FINE.minZ + FINE.size - z);
  const fine = smooth((edge - 2) / 9);
  if (fine <= 0) return base;
  // The plates stand out of the tide and die away at its edge; the picture's own cracks are shallow grooves in their tops.
  // (The bed of the channel is never higher than 6 cm under the tide: it stays as it was laid, for the feet that stand on it.)
  const shore = smooth((base - (SEA - 0.04)) / 0.08);
  const relief = lerp(base, lerp(base, bedded(x, z), shore) + RELIEF * (Math.max(plateAt(x, z), POOL) - 0.5), fine);
  const pad = padAt(x, z);
  return pad > 0 ? lerp(relief, padLevel() - 0.03 * sat(Math.hypot(x - PAD[0], z - PAD[1]) / 3.2) ** 2, pad) : relief;
}

export function nearLand(cells: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(NEAR, NEAR, cells, cells);
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const cell = NEAR / cells;
  const band = cell * 2.1;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    const b = bearingOf(x, z);
    const rim = rimRadius(b);
    if (r > rim + cell * 0.6) {
      p.setY(i, ground(x, z));
      continue;
    }
    const k = r > 0.001 ? rim / r : 0;
    const top = ground(x * k * 1.001, z * k * 1.001);
    if (r >= rim - 0.05) p.setXYZ(i, x * k, top, z * k);
    else if (r > rim - band) p.setXYZ(i, x * k, lerp(top, -DEPTH, (rim - r) / band), z * k);
    else p.setY(i, -DEPTH);
  }
  p.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

/** The ground between the fine rectangle and the far land: sunk out of sight under the fine rectangle. */
export function midGround(x: number, z: number): number {
  // The margin is wider than a cell of the mesh that draws this (400 m in 300), or the fall would begin outside the fine rectangle.
  if (inFine(x, z, 1.6)) return -DEPTH - 6;
  return ground(x, z) - (inFine(x, z) ? 0.06 : 0);
}

export function farGround(x: number, z: number): number {
  if (Math.abs(x) < NEAR / 2 - 1 && Math.abs(z) < NEAR / 2 - 1) return -DEPTH - 12;
  return ground(x, z);
}

export function surface(columns: number, rows: number, point: (u: number, v: number) => [number, number, number]): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(1, 1, columns, rows);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = point(p.getX(i) + 0.5, p.getY(i) + 0.5);
    p.setXYZ(i, x, y, z);
  }
  p.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

export const CAVE: [number, number] = [1980, -2163];
const ALONG: [number, number] = [-0.177, -0.984];
const BEHIND: [number, number] = [0.984, -0.177];

export const cliffPoint = (s: number, p: number): [number, number] => [CAVE[0] + s * ALONG[0] + p * BEHIND[0], CAVE[1] + s * ALONG[1] + p * BEHIND[1]];

export function cliffTop(s: number): number {
  const fall = 1 - 0.5 * smooth((s - 2600) / 3200) - 0.35 * smooth((-s - 1800) / 2500);
  return (700 + 40 * Math.sin(s * 0.0031 + 0.6) + 24 * Math.sin(s * 0.0083 + 2)) * fall;
}

export function cliffHeight(s: number, p: number): number {
  const top = cliffTop(s);
  const scree = 0.2 * smooth((p + 700) / 560);
  const face = 0.8 * smooth((p + 150) / 110);
  const back = 0.08 * sat(p / 1300);
  return top * (scree + face + back);
}
