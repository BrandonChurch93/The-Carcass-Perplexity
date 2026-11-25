import * as THREE from 'three';
import type { Vec3 } from '../../core/cameras';

export interface Spire {
  x: number;
  z: number;
  s: number;
  alt: number;
  tip: number;
  half: number;
  thick: number;
  lean: number;
  /** How sharply its top hooks over: the power its lean grows by with height. */
  hook: number;
}

// Where each spire stands (x, z), the height of the crest at its foot, and its own: how tall it is, how broad for its height, how far it leans for its breadth, and its hook.
// No two are alike and they are not evenly spaced: some are horns, some are stumps the lightning has taken down.
const TABLE: [number, number, number, number, number, number, number][] = [
  [-3900, 1300, 50, 232, 1.0, 0.4, 1.8],
  [-3100, 1150, 40, 180, 0.9, 0.3, 1.6],
  [-2330, 950, 30, 252, 1.0, 0.5, 2.0],
  [-1540, 740, 10, 170, 0.9, 0.25, 1.5],
  [-732, 451, 20, 230, 1.0, 0.45, 1.9],
  [0, 0, 0, 300, 1.5, 0.5, 2.6],
  [740, 184, -25, 195, 0.85, 0.44, 2.2],
  [1596, 426, -40, 292, 0.95, 0.7, 2.8],
  [2470, 745, -70, 143, 1.1, 0.2, 1.2],
  [3010, 968, -110, 219, 0.9, 0.62, 2.6],
  [3990, 1400, -150, 112, 1.2, 0.2, 1.5],
  [4540, 1676, -190, 216, 0.9, 0.45, 1.9],
  [5246, 2052, -230, 88, 1.2, 0.2, 1.5],
  [5939, 2452, -270, 169, 1.0, 0.4, 1.8],
  [6617, 2876, -310, 75, 1.2, 0.2, 1.5],
  [7280, 3323, -350, 125, 1.0, 0.35, 1.7],
];

export const FIRST = 5;
const SAMPLES = 1600;
const curve = new THREE.CatmullRomCurve3(
  TABLE.map(([x, z]) => new THREE.Vector3(x, 0, z)),
  false,
  'centripetal',
);
const points = curve.getSpacedPoints(SAMPLES);
const STEP = curve.getLength() / SAMPLES;

// The ridge bends gently, so the nearest point is found on every 20th sample first and then among its neighbours.
function nearestIndex(x: number, z: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= SAMPLES; i += 20) {
    const p = points[i] as THREE.Vector3;
    const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  const from = Math.max(0, best - 20);
  const to = Math.min(SAMPLES, best + 20);
  for (let i = from; i <= to; i++) {
    const p = points[i] as THREE.Vector3;
    const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

const origin = nearestIndex(0, 0) * STEP;

export const spires: Spire[] = TABLE.map(([x, z, alt, tip, broad, lean, hook]) => {
  const half = (0.5 * tip + 50) * broad;
  return { x, z, s: nearestIndex(x, z) * STEP - origin, alt, tip, half, thick: 0.33 * half, lean: lean * half, hook };
});

export const S_MIN = -origin;
export const S_MAX = SAMPLES * STEP - origin;
export const first = spires[FIRST] as Spire;

export interface Frame {
  x: number;
  z: number;
  tx: number;
  tz: number;
  nx: number;
  nz: number;
}

export function frameAt(s: number): Frame {
  const f = Math.min(SAMPLES - 1e-6, Math.max(0, (s + origin) / STEP));
  const i = Math.floor(f);
  const k = f - i;
  const a = points[i] as THREE.Vector3;
  const b = points[i + 1] as THREE.Vector3;
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const tx = (b.x - a.x) / len;
  const tz = (b.z - a.z) / len;
  return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, tx, tz, nx: -tz, nz: tx };
}

export function locate(x: number, z: number): { s: number; l: number } {
  const i = nearestIndex(x, z);
  const a = points[Math.max(0, i - 1)] as THREE.Vector3;
  const b = points[Math.min(SAMPLES, i + 1)] as THREE.Vector3;
  const ex = b.x - a.x;
  const ez = b.z - a.z;
  const len2 = ex * ex + ez * ez;
  const k = Math.min(1, Math.max(0, ((x - a.x) * ex + (z - a.z) * ez) / len2));
  const px = a.x + ex * k;
  const pz = a.z + ez * k;
  const len = Math.sqrt(len2);
  const side = (-ez / len) * (x - px) + (ex / len) * (z - pz);
  const dist = Math.hypot(x - px, z - pz);
  return { s: (Math.max(0, i - 1) + k * (Math.min(SAMPLES, i + 1) - Math.max(0, i - 1))) * STEP - origin, l: side >= 0 ? dist : -dist };
}

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const MOUTH_S = first.s - 120;
export const CANAL_L = 46;
export const MOUTH_R = 26;
export const EXIT = 232;
export const EXIT_R = 13;
export const EXIT_FLARE = 30;
export const canalL = (d: number): number => CANAL_L + 0.0025 * Math.max(0, Math.min(d, EXIT + 40) - 140) ** 2;
export const FLARE = 35;
export const THROAT = 4;
const SADDLE = 22;

export function flare(d: number): number {
  if (d <= 0) return MOUTH_R;
  if (d < FLARE) return THROAT + (MOUTH_R - THROAT) * Math.pow(1 - d / FLARE, 1.6);
  const e = EXIT - d;
  if (e <= 0) return EXIT_R;
  if (e < EXIT_FLARE) return THROAT + (EXIT_R - THROAT) * Math.pow(1 - e / EXIT_FLARE, 1.6);
  return THROAT;
}

export function crest(s: number): number {
  let k = 0;
  while (k < spires.length - 2 && s > (spires[k + 1] as Spire).s) k++;
  const a = spires[k] as Spire;
  const b = spires[k + 1] as Spire;
  const f = Math.min(1, Math.max(0, (s - a.s) / (b.s - a.s)));
  const alt = a.alt + (b.alt - a.alt) * f;
  // Before the first spire the crest stands higher: the trail comes down to the mouth, and the mouth is seen from a little above.
  const approach = 22 * (1 - smooth(MOUTH_S - 400, MOUTH_S - 90, s));
  return alt + approach - SADDLE * (0.5 - 0.5 * Math.cos(2 * Math.PI * Math.pow(f, 0.756)));
}

export const FLOOR = crest(MOUTH_S);

/** The shoulder the first spire stands on, 0 to 1: on the storm side of the trail the ground climbs to the spire's foot in broken rock. */
export function shoulder(s: number, l: number): number {
  const toMouth = Math.min(1, Math.max(0, (s - MOUTH_S + 160) / 150));
  const path = CANAL_L * toMouth * toMouth;
  return smooth(first.s - 400, first.s - 70, s) * (1 - smooth(first.s + 60, first.s + 230, s)) * (1 - smooth(path - 62, path - 14, l));
}

export function ground(s: number, l: number): number {
  let near = spires[0] as Spire;
  for (const sp of spires) if (Math.abs(sp.s - s) < Math.abs(near.s - s)) near = sp;
  const rho = Math.hypot((s - near.s) / 150, l / 130);
  const massif = 0.25 * near.tip * (1 - smooth(0.4, 1, rho));
  const shelf = Math.exp(-(((s - MOUTH_S + 20) / 85) ** 2));
  // The crest is a knife, a few metres of snow with a fall on either hand; it is broad only where the carcass lies.
  const stand = 19 * Math.exp(-(((s - first.s + 641) / 48) ** 2));
  const exitShelf = Math.exp(-(((s - MOUTH_S - EXIT - 5) / 60) ** 2));
  // Under each spire the ridge is as broad as the spire's foot: a buttress across the crest that the blade stands in, falling away beyond it on both hands.
  const foot = footHalf(near);
  const buttress = (foot + 14) * Math.exp(-(((s - near.s) / (0.45 * foot + 22)) ** 2));
  const width = (l > 0 ? 3 + 66 * shelf + 80 * exitShelf : 3 + 14 * shelf) + stand + buttress;
  const al = Math.max(0, Math.abs(l) - width);
  // The lee side is the steeper: it falls to the cloud in walls.
  let fall = ((1.15 + (l > 0 ? 0.6 * smooth(60, 220, al) : 0.5 * smooth(30, 160, al))) * al * al) / (al + 10);
  fall *= 1 + 0.16 * Math.sin(s * 0.023 + (l > 0 ? 2.1 : -2.1)) * smooth(20, 220, al);
  // The first spire stands on a shoulder: on the storm side of the trail the ground climbs to its foot in broken rock.
  let y = crest(s) + massif + 72 * shoulder(s, l) - fall;
  y += 40 * Math.exp(-(((s - MOUTH_S - EXIT + 12) / 26) ** 2) - ((l - canalL(EXIT)) / 34) ** 2);
  const d = s - MOUTH_S;
  if (d > -6 && d < 0.6 && Math.abs(l - CANAL_L) < flare(d) + 4.5) y = Math.min(y, FLOOR - 0.4);
  if (d > -60 && d <= -6) {
    const w = smooth(-60, -6, d) * (1 - smooth(MOUTH_R * 0.7, MOUTH_R * 1.9, Math.abs(l - CANAL_L)));
    y += (Math.min(y, FLOOR - 0.4) - y) * w;
  }
  if (d > EXIT - 0.6 && d < EXIT + 6 && Math.abs(l - canalL(d)) < flare(d) + 4.5) y = Math.min(y, FLOOR - 0.4);
  if (d >= EXIT + 6 && d < EXIT + 70) {
    const w = (1 - smooth(EXIT + 6, EXIT + 70, d)) * (1 - smooth(EXIT_R * 0.7, EXIT_R * 1.9, Math.abs(l - canalL(d))));
    y += (Math.min(y, FLOOR - 0.4) - y) * w;
  }
  // Over the canal the rock stands as a buttress of the spire: a wall at each mouth, with the mouth in its foot, rising to the spire behind.
  if (d > 0 && d < EXIT) {
    const r = flare(d);
    const deep = Math.min(d, EXIT - d);
    const over = FLOOR + 1.62 * r + 6 + 0.5 * Math.min(deep, 90);
    const off = l - canalL(d);
    const w = 1 - smooth(r + 5, r + 26 + 0.2 * Math.min(deep, 90), Math.abs(off));
    // The wall is not a dressed front: beside the mouth, on the lee, it stands back in steps, so the mouth is a hole in the foot of a broken face.
    const back = 30 * smooth(r * 0.8, r * 1.5 + 10, off) * (0.65 + 0.35 * Math.sin(l * 0.37 + 1.3));
    y += (Math.max(y, over - 0.5 * back) - y) * w * smooth(0.4, 2.2 + 0.3 * back, deep - back);
  }
  return Math.max(y, -2700);
}

export function world(s: number, l: number, y: number): Vec3 {
  const f = frameAt(s);
  return [f.x + f.nx * l, y, f.z + f.nz * l];
}

export function on(s: number, l: number, up: number): Vec3 {
  return world(s, l, ground(s, l) + up);
}

export function heightAbove(p: Vec3): number {
  const at = locate(p[0], p[2]);
  const d = at.s - MOUTH_S;
  if (d > -6 && d < EXIT + 6 && Math.abs(at.l - canalL(d)) < flare(d) + 1.2 && p[1] < FLOOR + 2 * flare(d) + 2) return p[1] - FLOOR;
  return p[1] - ground(at.s, at.l);
}

export interface FinPoint {
  centre: number;
  half: number;
  thick: number;
  y: number;
}

export const FIN_ROOT = 110;

export function fin(sp: Spire, t: number): FinPoint {
  const q = 1 - t;
  // The top is a broken edge, not a point: a blade some metres long and a few thick, where the last of it came away.
  const blunt = 1 - q * q * q * q;
  const whole = sp.half * (0.7 * Math.pow(q, 3) + 0.3 * q) + 4 * q + 0.045 * sp.half * blunt;
  // Under the ground the blade widens no faster than the flank falls, so that its root never stands out of the ridge.
  const t0 = FIN_ROOT / (sp.tip + FIN_ROOT);
  const q0 = 1 - t0;
  const atFoot = sp.half * (0.7 * Math.pow(q0, 3) + 0.3 * q0) + 4 * q0 + 0.045 * sp.half * (1 - q0 * q0 * q0 * q0);
  const wide = t < t0 ? Math.min(whole, atFoot + 0.55 * (t0 - t) * (sp.tip + FIN_ROOT)) : whole;
  // No spire is whole: each has lost a piece of its lee edge, a notch where a slab came away and, lower, the step of a fallen shoulder.
  // Where they are and how deep is the spire's own (from its height, so that it is the same in every build).
  const own = Math.abs(Math.sin(sp.tip * 12.9898) * 43758.5453) % 1;
  const notchAt = 0.5 + 0.28 * own;
  const stepAt = 0.2 + 0.2 * ((own * 7.31) % 1);
  const bite = wide * (0.5 * Math.exp(-(((t - notchAt) / 0.04) ** 2)) + (0.16 + 0.2 * own) * smooth(stepAt - 0.015, stepAt + 0.015, t) * (1 - smooth(notchAt + 0.1, 0.97, t)));
  // A horn: a broad foot that narrows fast, a slender blade above it, and a top that hooks over toward the storm.
  return {
    centre: -sp.lean * Math.pow(t, sp.hook) - 0.5 * bite,
    half: wide - 0.5 * bite,
    thick: sp.thick * (0.6 * Math.pow(q, 2.8) + 0.4 * Math.pow(q, 1.1)) + 3 * q + 2.6 * blunt,
    y: sp.alt - FIN_ROOT + (sp.tip + FIN_ROOT) * t,
  };
}

const feet = new Map<Spire, number>();
/** Half the breadth of a spire where it leaves the ground. */
export function footHalf(sp: Spire): number {
  let v = feet.get(sp);
  if (v === undefined) {
    v = fin(sp, FIN_ROOT / (sp.tip + FIN_ROOT)).half;
    feet.set(sp, v);
  }
  return v;
}

export function finEdge(sp: Spire, t: number, side: number, along = 0): Vec3 {
  const p = fin(sp, t);
  const f = frameAt(sp.s);
  const l = p.centre + side * p.half;
  return [sp.x + f.nx * l + f.tx * along * p.thick, p.y, sp.z + f.nz * l + f.tz * along * p.thick];
}

/** The highest point of a spire: the storm-side prong of its split top. */
export function tipOf(sp: Spire): Vec3 {
  return finEdge(sp, 1, -0.7);
}
