import * as THREE from 'three';
import type { Vec3 } from '../../core/cameras';
import { SHEETS, type SheetData } from './shared/sheets';

export interface Spire {
  x: number;
  z: number;
  s: number;
  alt: number;
  tip: number;
  /** Half its breadth where it leaves the crest. */
  half: number;
  /** Half its thickness there. */
  thick: number;
  /** Which feature sheet it is cut from (SHEETS), and whether the sheet is turned over. */
  sheet: number;
  flip: boolean;
  /** Metres to a pixel of its sheet, up and across. */
  mv: number;
  mh: number;
  /** The pixel column of its sheet that stands at l0 across the ridge. */
  col0: number;
  l0: number;
  /** How far the sheet is sheared toward the storm, metres for a metre of height: its lean beyond the sheet's own. */
  shear: number;
  /** The blade is turned by this about the upright, radians. */
  yaw: number;
}

// Where each spire stands (x, z), the height of the crest at its foot, and its own: how tall it is, which sheet it is cut from (0 the tower with the
// mouth, 1 the snapped stump, 2 the hooked horn), how broad for the sheet (negative: the sheet turned over), how thick for its breadth, and its turn in degrees.
// No two are alike and they are not evenly spaced: some are horns, some are stumps the lightning has taken down.
const TABLE: [number, number, number, number, number, number, number, number][] = [
  [-3900, 1300, 50, 232, 2, 1.0, 0.5, 10],
  [-3100, 1150, 40, 180, 1, 0.9, 0.55, -8],
  [-2330, 950, 30, 252, 2, -0.8, 0.5, 14],
  [-1540, 740, 10, 170, 1, 1.2, 0.5, 0],
  [-732, 451, 20, 230, 2, 0.9, 0.5, 18],
  [0, 0, 0, 300, 0, 0.62, 0.79, 21],
  [740, 184, -25, 168, 2, 1.25, 0.55, 12],
  [1596, 452, -40, 292, 0, 0.85, 0.62, 20],
  [2470, 745, -70, 250, 1, 1.1, 0.55, -10],
  [3010, 968, -110, 300, 2, 0.7, 0.5, 26],
  [3990, 1400, -150, 250, 1, 1.0, 0.6, 5],
  [4540, 1676, -190, 232, 2, 1.1, 0.5, 16],
  [5246, 2052, -230, 82, 1, -1.8, 0.6, -14],
  [5939, 2452, -270, 188, 2, -0.75, 0.5, 22],
  [6617, 2876, -310, 70, 1, 2.0, 0.6, 8],
  [7280, 3323, -350, 140, 2, 1.3, 0.5, 15],
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

export const spires: Spire[] = TABLE.map(([x, z, alt, tip, sheet, broad, thick, yaw]) => ({
  x,
  z,
  s: nearestIndex(x, z) * STEP - origin,
  alt,
  tip,
  half: 0,
  thick,
  sheet,
  flip: broad < 0,
  mv: 0,
  mh: Math.abs(broad),
  col0: 0,
  l0: 0,
  shear: 0,
  yaw: (yaw * Math.PI) / 180,
}));

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

/** Where the mouth is painted on the tower's sheet: its middle, in pixels. */
const SHEET_MOUTH: [number, number] = [583, 727];
/** The edges of a sheet at a pixel row, in pixels; under its foot it goes on down, widening. */
function outline(sh: SheetData, row: number): [number, number] {
  const f = ((row - sh.tip) / (sh.foot - sh.tip)) * (sh.left.length - 1);
  const i = Math.min(sh.left.length - 2, Math.max(0, Math.floor(f)));
  const k = Math.min(1, Math.max(0, f - i));
  const under = Math.max(0, row - sh.foot);
  return [(sh.left[i] as number) * (1 - k) + (sh.left[i + 1] as number) * k - 0.25 * under, (sh.right[i] as number) * (1 - k) + (sh.right[i + 1] as number) * k + 0.25 * under];
}
// Each spire is set on its sheet. The first by its mouth: the painted mouth lies on the canal's. The others stand with a fifth of their sheet under the crest.
spires.forEach((sp, i) => {
  const sh = SHEETS[sp.sheet] as SheetData;
  if (i === FIRST) {
    sp.mv = (sp.alt + sp.tip - (FLOOR + 17)) / (SHEET_MOUTH[1] - sh.tip);
    sp.mh *= sp.mv;
    sp.col0 = SHEET_MOUTH[0];
    sp.l0 = canalInFin(sp).mouth[0];
    sp.shear = 0.2;
  } else {
    sp.mv = sp.tip / (0.8 * (sh.foot - sh.tip));
    sp.mh *= sp.mv;
    const [a, b] = outline(sh, sh.tip + sp.tip / sp.mv);
    sp.col0 = 0.5 * (a + b);
    sp.l0 = 0;
    // The third (the one the long lens sees struck) stands more upright than its sheet: its steep side to the storm, its long shoulder to the lee.
    sp.shear = i === FIRST + 2 ? -0.3 : 0.12 * Math.sin(i * 2.7 + 1);
  }
  const [a, b] = outline(sh, sh.tip + sp.tip / sp.mv);
  sp.half = 0.5 * (b - a) * sp.mh;
  sp.thick *= sp.half;
});

/** Where the canal's two ends lie in a blade's own frame: metres across it and metres along the ridge from its middle. The ridge bends, so these are not the ridge's own s and l. */
export function canalInFin(sp: Spire): { mouth: [number, number]; exit: [number, number] } {
  const m = finAxes(sp);
  const at = (s: number): [number, number] => {
    const f = frameAt(s);
    const x = f.x + f.nx * CANAL_L - sp.x;
    const z = f.z + f.nz * CANAL_L - sp.z;
    return [x * m.ax + z * m.az, x * m.bx + z * m.bz];
  };
  return { mouth: at(MOUTH_S), exit: at(MOUTH_S + EXIT) };
}

/** The same as numbers for a shader: u = (l + shear * y) * [0] + [1], v = y * [2] + [3]. */
export function sheetMap(sp: Spire): [number, number, number, number] {
  const sh = SHEETS[sp.sheet] as SheetData;
  const k = sp.flip ? -1 : 1;
  // A picture's v runs up from its foot in a shader, and its rows run down from its top.
  return [k / (sp.mh * sh.width), (sp.col0 - (k * (sp.l0 + sp.shear * sp.alt)) / sp.mh) / sh.width, 1 / (sp.mv * sh.height), 1 - (sh.tip + (sp.alt + sp.tip) / sp.mv) / sh.height];
}

/** Where a point of a spire lies on its sheet: l metres across the blade and y metres up give (u, v), 0 to 1 from the left and from the top. */
export function sheetAt(sp: Spire, l: number, y: number): [number, number] {
  const sh = SHEETS[sp.sheet] as SheetData;
  const col = sp.col0 + ((sp.flip ? -1 : 1) * (l + sp.shear * (y - sp.alt) - sp.l0)) / sp.mh;
  const row = sh.tip + (sp.alt + sp.tip - y) / sp.mv;
  return [col / sh.width, row / sh.height];
}

export function ground(s: number, l: number): number {
  const shelf = Math.exp(-(((s - MOUTH_S + 20) / 85) ** 2));
  // The crest is a knife, a few metres of snow with a fall on either hand; it is broad only where the carcass lies and before the mouths.
  const stand = 19 * Math.exp(-(((s - first.s + 641) / 48) ** 2));
  const exitShelf = Math.exp(-(((s - MOUTH_S - EXIT - 5) / 60) ** 2));
  const width = (l > 0 ? 3 + 66 * shelf + 80 * exitShelf : 3 + 14 * shelf) + stand;
  const al = Math.max(0, Math.abs(l) - width);
  // The lee side is the steeper: it falls to the cloud in walls.
  // Under the crest the flanks are shoulders of snow with the rock standing out of them; they steepen as they go down to the cloud.
  let fall = ((l > 0 ? 0.42 + 0.95 * smooth(40, 210, al) : 0.6 + 0.9 * smooth(30, 170, al)) * al * al) / (al + 10);
  fall *= 1 + 0.16 * Math.sin(s * 0.023 + (l > 0 ? 2.1 : -2.1)) * smooth(20, 220, al);
  let y = crest(s) - fall;
  y += 40 * Math.exp(-(((s - MOUTH_S - EXIT + 12) / 26) ** 2) - ((l - canalL(EXIT)) / 34) ** 2);
  const d = s - MOUTH_S;
  if (d > -6 && d < 0.6 && Math.abs(l - CANAL_L) < flare(d) + 4.5) y = Math.min(y, FLOOR - 0.4);
  if (d > -60 && d <= -6) {
    const w = smooth(-60, -6, d) * (1 - smooth(MOUTH_R * 0.7, MOUTH_R * 1.9, Math.abs(l - CANAL_L)));
    y += (Math.min(y, FLOOR - 0.4) - y) * w;
  }
  // The near mouth is half drifted shut: a bank of snow lies across it a little before the rock, high on the lee hand and low where the trail goes in.
  if (d > -45 && d < -5) {
    const along = Math.exp(-(((d + 17) / 5.5) ** 2));
    y += along * (9 * Math.exp(-(((l - CANAL_L - 15) / 12) ** 2)) + 5.5 * Math.exp(-(((l - CANAL_L + 19) / 8) ** 2)));
  }
  if (d > EXIT - 0.6 && d < EXIT + 6 && Math.abs(l - canalL(d)) < flare(d) + 4.5) y = Math.min(y, FLOOR - 0.4);
  if (d >= EXIT + 6 && d < EXIT + 300) {
    // Beyond the far mouth the floor does not go on as a plain: it breaks into a gully of snow that falls away to the cloud, veering to
    // the lee, so that from inside the mouth holds a slope going down, the far spires and the sea of cloud.
    const run = d - EXIT - 6;
    // The mouth looks out along the canal's own bend, which carries the eye to the lee at about half a metre a metre.
    const off = l - canalL(EXIT + 6) - 0.46 * run;
    const lee = off - 8 - 0.22 * run;
    const w = (1 - smooth(EXIT + 170, EXIT + 300, d)) * (1 - smooth(EXIT_R * 0.7 + 0.1 * run, EXIT_R * 1.9 + 0.6 * run, Math.abs(lee)));
    y += (Math.min(y, FLOOR - 0.4 - (0.55 * run * run) / (run + 22)) - y) * w;
    // On the windward hand of it a shoulder of drifted snow stands up and goes down across the mouth's view into the gully.
    const shoulder = FLOOR - 0.4 + 5 * Math.exp(-(((run - 50) / 30) ** 2));
    y += (Math.max(y, shoulder) - y) * smooth(-26, -52, off) * (1 - smooth(-70, -120, off)) * smooth(0, 14, run);
  }
  // Over the canal the rock is the foot of the spire's own face: the near mouth is a few metres before that face and the ground carries
  // a lip of rock over it, which goes up into the blade behind it (the mouth is a hole in the ground's mesh and in the blade's).
  if (d > 0 && d < EXIT) {
    const r = flare(d);
    const deep = Math.min(d, EXIT - d);
    const off = l - canalL(d);
    const w = 1 - smooth(r + 6, r + 30, Math.abs(off) + 5 * Math.sin(l * 0.31 + 1.3));
    if (w > 0) {
      const over = FLOOR + 1.62 * r + 5 + 0.8 * Math.min(deep, 30);
      // It starts well inside the blade: the blade's face is the wall the mouth is cut through.
      y += (Math.max(y, over) - y) * w * smooth(20, 26, deep);
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
export const FIN_SECTION = 3;

function notchHash(n: number, seed: number): number {
  const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
/** How far a blade's edge stands out at a height, metres: blocks in beds, each with its own stand and its own slope, in two sizes. */
function notch(y: number, seed: number): number {
  let sum = 0;
  const sizes: [number, number][] = [
    [31, 5.5],
    [9, 1.8],
  ];
  for (const [bed, far] of sizes) {
    const at = y / bed + 3 * notchHash(seed, bed);
    const i = Math.floor(at);
    // The beds are not all one height: every bed's top is thrown up or down within it.
    const top = 0.25 + 0.5 * notchHash(i, seed + 3);
    const f = at - i;
    const cell = f < top ? i : i + 0.5;
    const within = f < top ? f / top : (f - top) / (1 - top);
    sum += far * (notchHash(cell, seed + 7) - 0.5 + 0.7 * (notchHash(cell, seed + 13) - 0.5) * (within - 0.5));
  }
  return sum;
}

export function fin(sp: Spire, t: number): FinPoint {
  // h is 0 where the blade leaves the crest and 1 at its top; under the crest it is negative, and the blade goes on down the flanks as a buttress on either hand.
  const t0 = FIN_ROOT / (sp.tip + FIN_ROOT);
  const h = (t - t0) / (1 - t0);
  const q = Math.min(1, Math.max(0, 1 - h));
  const under = Math.max(0, -h) * sp.tip;
  // Its outline is its sheet's.
  const sh = SHEETS[sp.sheet] as SheetData;
  // Under the crest it keeps the outline it has a little below the crest and widens evenly: the sheet's own foot is a ragged fan.
  const low = Math.min(under, 0.28 * sp.tip);
  const [a, b] = outline(sh, sh.tip + ((1 - Math.min(h, 1)) * sp.tip + low) / sp.mv);
  const k = sp.flip ? -1 : 1;
  const lean = sp.shear * Math.min(h, 1) * sp.tip;
  const l1 = sp.l0 + k * (a - sp.col0) * sp.mh - lean;
  const l2 = sp.l0 + k * (b - sp.col0) * sp.mh - lean;
  // Its edges are broken rock, not a drawn line: each steps in and out as its blocks have fallen away, in beds of no two heights.
  const full = Math.min(1, (0.5 * Math.abs(l2 - l1)) / 22) * (1 - smooth(0.9, 1, h));
  const yy = sp.alt + h * sp.tip;
  const nA = full * notch(yy, sp.x * 0.37 + 11);
  const nB = full * notch(yy, sp.x * 0.37 + 57);
  const lo = Math.min(l1, l2) - nA;
  const hi = Math.max(l1, l2) + nB;
  const wide = Math.max(1.5, 0.5 * (hi - lo)) + 0.3 * (under - low);
  const thin = Math.min(0.45 * wide + 2, sp.thick);
  const thick = thin + (sp.thick - thin) * Math.pow(q, 1.05) * (1 - 0.3 * smooth(0.3, 0.8, h)) + 0.2 * under;
  return { centre: 0.5 * (lo + hi), half: wide, thick, y: sp.alt - FIN_ROOT + (sp.tip + FIN_ROOT) * t };
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

/** The highest point of a spire. */
export function tipOf(sp: Spire): Vec3 {
  return finEdge(sp, 1, 0);
}
