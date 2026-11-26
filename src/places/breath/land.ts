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
export const channelX = (z: number): number => -50 + 0.4 * soft(z - 5) - 0.3 * soft(-z - 10);
export const channelHalf = (z: number): number => 5 + 2.5 * sat((5 - z) / 15) + 14 * sat((-5 - z) / 40) + 140 * sat((z - 130) / 220);

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
  const half = x < xc ? 5 + 6 * sat((z - 20) / 15) + 2.5 * sat((5 - z) / 15) + 8 * sat((-25 - z) / 50) + 140 * sat((z - 130) / 220) : channelHalf(z);
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
  const bank = smooth(inside / lerp(4.5, 2.6, south) + 1);
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
/** The plate's relief is drawn as this many metres from black to white. */
export const RELIEF = 0.22;
/** Under this level of the plate's relief water stands: the pool in the plate's hollow. */
export const POOL = 0.13;
const mirror = (t: number): number => {
  const m = t - 2 * Math.floor(t / 2);
  return m > 1 ? 2 - m : m;
};
/** The plate's relief at a place on the ground: 0 to 1. */
export function plateAt(x: number, z: number): number {
  const fx = Math.min(PLATE_WIDTH - 1.001, Math.max(0, mirror(x / PLATE.metres) * PLATE_WIDTH - 0.5));
  const fz = Math.min(PLATE_HEIGHT - 1.001, Math.max(0, mirror(z / PLATE.depth) * PLATE_HEIGHT - 0.5));
  const i = Math.floor(fx);
  const j = Math.floor(fz);
  const u = fx - i;
  const v = fz - j;
  const k = j * PLATE_WIDTH + i;
  return (((plateBytes[k] as number) * (1 - u) + (plateBytes[k + 1] as number) * u) * (1 - v) + ((plateBytes[k + PLATE_WIDTH] as number) * (1 - u) + (plateBytes[k + PLATE_WIDTH + 1] as number) * u) * v) / 255;
}

/** Metres a bed of the shelf stands over the next one down. */
export const BED = 0.21;
const STAIR = 0.4;
/** Metres a leaf of a bed is thick where its edge shows. */
export const LEAF = 0.04;
/** The beds of the shelf: the limestone lies in level sheets a hand or two thick, each ending in a broken edge that winds across the ground
 *  like a contour, and the sheet under it runs on from the foot of that edge. Where the smooth ground slopes (a bank, a lip of the shaft) the
 *  sheets are a stair down it. Metres to add to the smooth ground `base`. A sheet is 2 to 8 m across on the level; its edge is a riser some
 *  10 cm through, nicked every half metre. */
export function bedded(x: number, z: number, base: number): number {
  const lie = 3.4 * fbm2(x / 24 + 1.3, z / 24 + 4.1, 2) + 0.8 * fbm2(x / 6.5 + 8.2, z / 6.5 + 3.3, 2) - 2.1;
  // Less than half of a slope is taken up in steps: a bank is two or three ledges with the beds tilted between them, not a flight of stairs.
  const t = (STAIR * base) / BED + lie + 0.07 * fbm2(x / 0.8 + 2.7, z / 0.8 + 6.4, 2);
  const k = Math.floor(t);
  const f = t - k;
  // Within a sheet, the thin leaves it is made of: three or four of them show as lines a few centimetres high, each nicked on its own.
  const u = 2.3 * t + 0.6 * fbm2(x / 3.1 + 5.5, z / 3.1 + 1.9, 2) + 0.1 * fbm2(x / 0.45 + 1.2, z / 0.45 + 8.8, 2);
  const leaves = LEAF * (Math.floor(u) + smooth((u - Math.floor(u) - 0.9) / 0.1) - 2.3 * t);
  // The top of a sheet dips a little toward the edge of the one that lies on it, so the foot of every riser is a dark line.
  return BED * (k + smooth((f - 0.966) / 0.034)) - STAIR * base - 0.03 * f + leaves;
}

/** Where the dead wader lies (DEAD_WADER of shared/anchors.ts) the rock is one dry plate, level to a few centimetres for 3.2 m round, standing
 *  clear of the tide: 1 on it, 0 off it. */
const PAD: [number, number] = [-27.3, 22.6];
export const padAt = (x: number, z: number): number => 1 - smooth((Math.hypot(x - PAD[0], z - PAD[1]) - 3.2) / 1.5);
let padHeight: number | null = null;
const padLevel = (): number => (padHeight ??= Math.max(SEA + 0.45, smoothGround(PAD[0], PAD[1]) - 0.1));

/** The ground everything stands on: the smooth land with the plate's relief on it. Outside the fine rectangle the plates are too small for
 *  the mesh that draws them and the ground is the same land worn smooth. */
export function ground(x: number, z: number): number {
  const base = smoothGround(x, z);
  const edge = Math.min(x - FINE.minX, FINE.minX + FINE.size - x, z - FINE.minZ, FINE.minZ + FINE.size - z);
  const fine = smooth((edge - 2) / 9);
  if (fine <= 0) return base;
  // The beds stand out of the tide and die away under it; the picture's own cracks are shallow grooves in their tops.
  const shore = smooth((base - (SEA - 0.5)) / 0.35);
  const relief = base + fine * (shore * bedded(x, z, base) + RELIEF * (Math.max(plateAt(x, z), POOL) - 0.5));
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
