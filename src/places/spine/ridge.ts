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
}

const TABLE: [number, number, number, number][] = [
  [-3900, 1300, 50, 290],
  [-3100, 1150, 40, 300],
  [-2330, 950, 30, 280],
  [-1540, 740, 10, 310],
  [-732, 451, 20, 270],
  [0, 0, 0, 300],
  [827, 206, -25, 270],
  [1596, 426, -40, 270],
  [2348, 700, -70, 230],
  [3090, 1000, -110, 230],
  [3821, 1325, -150, 250],
  [4540, 1676, -190, 270],
  [5246, 2052, -230, 250],
  [5939, 2452, -270, 260],
  [6617, 2876, -310, 250],
  [7280, 3323, -350, 250],
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

function nearestIndex(x: number, z: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= SAMPLES; i++) {
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

export const spires: Spire[] = TABLE.map(([x, z, alt, tip]) => {
  const half = 0.5 * tip + 50;
  return { x, z, s: nearestIndex(x, z) * STEP - origin, alt, tip, half, thick: 0.33 * half, lean: 0.52 * half };
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
export const MOUTH_R = 20;
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
  return alt - SADDLE * (0.5 - 0.5 * Math.cos(2 * Math.PI * Math.pow(f, 0.756)));
}

export const FLOOR = crest(MOUTH_S);

export function ground(s: number, l: number): number {
  let near = spires[0] as Spire;
  for (const sp of spires) if (Math.abs(sp.s - s) < Math.abs(near.s - s)) near = sp;
  const rho = Math.hypot((s - near.s) / 150, l / 130);
  const massif = 70 * (1 - smooth(0.5, 1, rho));
  const shelf = Math.exp(-(((s - MOUTH_S + 20) / 85) ** 2));
  const stand = 16 * Math.exp(-(((s - first.s + 610) / 170) ** 2));
  const exitShelf = Math.exp(-(((s - MOUTH_S - EXIT - 5) / 60) ** 2));
  const width = (l > 0 ? 5 + 66 * shelf + 80 * exitShelf : 5 + 14 * shelf) + stand;
  const al = Math.max(0, Math.abs(l) - width);
  let fall = (1.3 * al * al) / (al + 12);
  fall *= 1 + 0.16 * Math.sin(s * 0.023 + (l > 0 ? 2.1 : -2.1)) * smooth(20, 220, al);
  let y = crest(s) + massif - fall;
  y += 40 * Math.exp(-(((s - MOUTH_S - EXIT + 12) / 26) ** 2) - ((l - canalL(EXIT)) / 34) ** 2);
  const d = s - MOUTH_S;
  if (d > -6 && d < FLARE + 2 && Math.abs(l - CANAL_L) < flare(d) + 4.5) y = Math.min(y, FLOOR - 0.4);
  if (d > -60 && d <= -6) {
    const w = smooth(-60, -6, d) * (1 - smooth(MOUTH_R * 0.7, MOUTH_R * 1.9, Math.abs(l - CANAL_L)));
    y += (Math.min(y, FLOOR - 0.4) - y) * w;
  }
  if (d > EXIT - EXIT_FLARE - 2 && d < EXIT + 6 && Math.abs(l - canalL(d)) < flare(d) + 4.5) y = Math.min(y, FLOOR - 0.4);
  if (d >= EXIT + 6 && d < EXIT + 70) {
    const w = (1 - smooth(EXIT + 6, EXIT + 70, d)) * (1 - smooth(EXIT_R * 0.7, EXIT_R * 1.9, Math.abs(l - canalL(d))));
    y += (Math.min(y, FLOOR - 0.4) - y) * w;
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
  return {
    centre: -sp.lean * Math.pow(t, 1.4),
    half: sp.half * Math.pow(q, 1.15) + 4 * q,
    thick: sp.thick * Math.pow(q, 1.2) + 3 * q,
    y: sp.alt - FIN_ROOT + (sp.tip + FIN_ROOT) * t,
  };
}

export function finEdge(sp: Spire, t: number, side: number, along = 0): Vec3 {
  const p = fin(sp, t);
  const f = frameAt(sp.s);
  const l = p.centre + side * p.half;
  return [sp.x + f.nx * l + f.tx * along * p.thick, p.y, sp.z + f.nz * l + f.tz * along * p.thick];
}

export function tipOf(sp: Spire): Vec3 {
  return finEdge(sp, 1, 0);
}
