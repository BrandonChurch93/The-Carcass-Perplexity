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
  /** Half the breadth of its broken top. */
  top: number;
  /** The power its breadth falls by with height: 1 a plain wedge, 2 a horn on a broad foot. */
  taper: number;
  /** The blade is turned by this about the upright, radians: its near face looks a little into the lee. */
  yaw: number;
}

// Where each spire stands (x, z), the height of the crest at its foot, and its own: how tall it is, how broad for its height, how far it leans for its breadth, and its hook.
// No two are alike and they are not evenly spaced: some are horns, some are stumps the lightning has taken down.
const TABLE: [number, number, number, number, number, number, number][] = [
  [-3900, 1300, 50, 232, 1.0, 0.4, 1.8],
  [-3100, 1150, 40, 180, 0.9, 0.3, 1.6],
  [-2330, 950, 30, 252, 1.0, 0.5, 2.0],
  [-1540, 740, 10, 170, 0.9, 0.25, 1.5],
  [-732, 451, 20, 230, 1.0, 0.45, 1.9],
  [0, 0, 0, 300, 1.25, 0.66, 1.25],
  [740, 184, -25, 168, 1.1, 0.5, 1.5],
  [1596, 426, -40, 292, 1.05, 0.42, 1.7],
  [2470, 745, -70, 128, 1.5, -0.2, 0.9],
  [3010, 968, -110, 236, 0.7, 0.8, 2.6],
  [3990, 1400, -150, 104, 1.8, 0.15, 0.9],
  [4540, 1676, -190, 232, 0.95, 0.4, 2.2],
  [5246, 2052, -230, 82, 2.0, -0.2, 0.8],
  [5939, 2452, -270, 188, 0.75, 0.7, 2.4],
  [6617, 2876, -310, 70, 2.2, 0.15, 1.0],
  [7280, 3323, -350, 140, 1.3, 0.5, 1.4],
];
// Each spire's own cut: how thick it is for its breadth, the half breadth of its top, the power of its taper, and its turn in degrees.
const CUT: [number, number, number, number][] = [
  [0.4, 7, 1.6, 10],
  [0.45, 9, 1.4, -8],
  [0.4, 6, 1.9, 14],
  [0.5, 10, 1.3, 0],
  [0.4, 7, 1.7, 18],
  [0.74, 9, 1.75, 5],
  [0.5, 5, 1.5, 12],
  [0.46, 12, 1.45, 20],
  [0.55, 14, 1.1, -10],
  [0.42, 4, 2.1, 26],
  [0.6, 12, 1.0, 5],
  [0.44, 6, 1.8, 16],
  [0.6, 10, 1.0, -14],
  [0.42, 5, 2.0, 22],
  [0.6, 9, 1.1, 8],
  [0.5, 7, 1.5, 15],
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

export const spires: Spire[] = TABLE.map(([x, z, alt, tip, broad, lean, hook], i) => {
  const [thick, top, taper, yaw] = CUT[i] as [number, number, number, number];
  // Half its breadth where it leaves the crest: a blade is about as broad at the foot as it is tall.
  const half = i === FIRST ? (0.32 * tip + 40) * broad : (0.15 * tip + 20) * broad;
  return { x, z, s: nearestIndex(x, z) * STEP - origin, alt, tip, half, thick: thick * half, lean: lean * half, hook, top, taper, yaw: (yaw * Math.PI) / 180 };
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
  // The saddle the trail crosses and the one the canal comes out on are shallow; the rest go down toward the cloud, which pours through them.
  const dip = k === FIRST - 1 ? SADDLE : k === FIRST ? 34 : 70 + 34 * Math.sin(k * 2.4);
  return alt + approach - dip * (0.5 - 0.5 * Math.cos(2 * Math.PI * Math.pow(f, 0.756)));
}

export const FLOOR = crest(MOUTH_S);

export function ground(s: number, l: number): number {
  const shelf = Math.exp(-(((s - MOUTH_S + 20) / 85) ** 2));
  // The crest is a knife, a few metres of snow with a fall on either hand; it is broad only where the carcass lies and before the mouths.
  const stand = 19 * Math.exp(-(((s - first.s + 641) / 48) ** 2));
  const exitShelf = Math.exp(-(((s - MOUTH_S - EXIT - 5) / 60) ** 2));
  const width = (l > 0 ? 3 + 66 * shelf + 80 * exitShelf : 3 + 14 * shelf) + stand;
  const al = Math.max(0, Math.abs(l) - width);
  // The lee side is the steeper: it falls to the cloud in walls.
  let fall = ((1.15 + (l > 0 ? 0.6 * smooth(60, 220, al) : 0.5 * smooth(30, 160, al))) * al * al) / (al + 10);
  fall *= 1 + 0.16 * Math.sin(s * 0.023 + (l > 0 ? 2.1 : -2.1)) * smooth(20, 220, al);
  let y = crest(s) - fall;
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
  // Over the canal the rock is the foot of the spire's own face: the near mouth is a few metres before that face and the ground carries
  // a lip of rock over it, which goes up into the blade behind it (the mouth is a hole in the ground's mesh and in the blade's).
  if (d > 0 && d < EXIT) {
    const r = flare(d);
    const deep = Math.min(d, EXIT - d);
    const off = l - canalL(d);
    const w = 1 - smooth(r + 6, r + 30, Math.abs(off) + 5 * Math.sin(l * 0.31 + 1.3));
    if (w > 0) {
      const over = FLOOR + 1.62 * r + 5 + 2.4 * Math.min(deep, 30);
      y += (Math.max(y, over) - y) * w * smooth(0.3, 2.4, deep);
    }
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

/** The power of a blade's section: 2 would be an ellipse, 1 a diamond. Between them: two faces that meet in an edge at each end and are full in the middle. */
export const FIN_SECTION = 1.55;

export function fin(sp: Spire, t: number): FinPoint {
  // h is 0 where the blade leaves the crest and 1 at its top; under the crest it is negative, and the blade goes on down the flanks as a buttress on either hand.
  const t0 = FIN_ROOT / (sp.tip + FIN_ROOT);
  const h = (t - t0) / (1 - t0);
  const q = Math.min(1, Math.max(0, 1 - h));
  const under = Math.max(0, -h) * sp.tip;
  const wide = sp.top + (sp.half - sp.top) * Math.pow(q, sp.taper) + 0.22 * under;
  const thin = 0.45 * sp.top + 2;
  const thick = thin + (sp.thick - thin) * Math.pow(q, 1.05) * (1 - 0.3 * smooth(0.3, 0.8, h)) + 0.16 * under;
  // No spire is whole: each has lost a piece of its lee edge, a notch where a slab came away and, lower, the step of a fallen shoulder.
  // Where they are and how deep is the spire's own (from its height, so that it is the same in every build).
  const own = Math.abs(Math.sin(sp.tip * 12.9898) * 43758.5453) % 1;
  const notchAt = 0.5 + 0.28 * own;
  const stepAt = 0.2 + 0.2 * ((own * 7.31) % 1);
  const bite = wide * (0.24 * Math.exp(-(((h - notchAt) / 0.04) ** 2)) + (0.05 + 0.08 * own) * smooth(stepAt - 0.015, stepAt + 0.015, h) * (1 - smooth(notchAt + 0.1, 0.97, h)));
  return {
    centre: -sp.lean * Math.pow(Math.max(h, 0), sp.hook) - 0.5 * bite,
    half: wide - 0.5 * bite,
    thick,
    y: sp.alt - FIN_ROOT + (sp.tip + FIN_ROOT) * t,
  };
}

/** The two level axes of a blade: across it (toward the lee) and along it (down the ridge), each turned by the spire's yaw. */
export function finAxes(sp: Spire): { ax: number; az: number; bx: number; bz: number } {
  const f = frameAt(sp.s);
  const c = Math.cos(sp.yaw);
  const k = Math.sin(sp.yaw);
  return { ax: f.nx * c + f.tx * k, az: f.nz * c + f.tz * k, bx: f.tx * c - f.nx * k, bz: f.tz * c - f.nz * k };
}

/** How low a blade is built: this far under the crest at its foot it is in the cloud. */
export const FIN_DEEP = 760;

/** The height of a blade's smooth body over a point of the world, or far below where the blade does not stand over it. */
export function finTop(sp: Spire, x: number, z: number): number {
  const m = finAxes(sp);
  const a = (x - sp.x) * m.ax + (z - sp.z) * m.az;
  const b = (x - sp.x) * m.bx + (z - sp.z) * m.bz;
  const inside = (t: number): boolean => {
    const p = fin(sp, t);
    return Math.pow(Math.abs(a - p.centre) / p.half, FIN_SECTION) + Math.pow(Math.abs(b) / p.thick, FIN_SECTION) < 1;
  };
  let lo = -(FIN_DEEP - FIN_ROOT) / (sp.tip + FIN_ROOT);
  if (!inside(lo)) return -1e5;
  let hi = 1;
  if (inside(hi)) return fin(sp, 1).y;
  for (let i = 0; i < 18; i++) {
    const mid = 0.5 * (lo + hi);
    if (inside(mid)) lo = mid;
    else hi = mid;
  }
  return fin(sp, lo).y;
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
  const m = finAxes(sp);
  const l = p.centre + side * p.half;
  return [sp.x + m.ax * l + m.bx * along * p.thick, p.y, sp.z + m.az * l + m.bz * along * p.thick];
}

/** The highest point of a spire: the storm-side prong of its split top. */
export function tipOf(sp: Spire): Vec3 {
  return finEdge(sp, 1, -0.7);
}
