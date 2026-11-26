// Where things stand in the Blood Marsh and when things happen, taken from the approved pictures through the blockout. Owned by the root.
// World metres. Origin: the centre of the bubbling seep pool, on the brine (y = 0 is the level of the brine everywhere). North is -z (the top of the
// layout sketch, towards the far flats), east is +x. The basin is 18 km across with the escarpment 6 km out.
// Places are given as (d, l): metres forward and metres to the right of the eye of the establishing picture, along its bearing. `rel` turns them into x and z.
import type { Vec3 } from '../../../core/cameras';
import { stream } from '../../../core/rng';
import { cut, eventSeconds, secondsInPlace } from '../../../film/cut';

export const UNIT = 'marsh';
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const BEARING = 52 * DEG;
export const F: [number, number] = [Math.sin(BEARING), -Math.cos(BEARING)];
export const R: [number, number] = [Math.cos(BEARING), Math.sin(BEARING)];
export const POOL_D = 31;
export const POOL_L = -14;
export const POOL_R = 9.5;
export const EYE: [number, number] = [-(F[0] * POOL_D + R[0] * POOL_L), -(F[1] * POOL_D + R[1] * POOL_L)];
export const EYE_HEIGHT = 8.5;

export const rel = (d: number, l: number): [number, number] => [EYE[0] + F[0] * d + R[0] * l, EYE[1] + F[1] * d + R[1] * l];
export const at = (d: number, l: number, y: number): Vec3 => {
  const p = rel(d, l);
  return [p[0], y, p[1]];
};
export const yawOf = (dx: number, dz: number): number => Math.atan2(-dz, dx);
export const relYaw = (dd: number, dl: number): number => yawOf(F[0] * dd + R[0] * dl, F[1] * dd + R[1] * dl);
export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
export const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const fract = (v: number): number => v - Math.floor(v);
export const bearingDir = (deg: number): [number, number] => [Math.sin(deg * DEG), -Math.cos(deg * DEG)];

export const keyTime = (key: string): number => secondsInPlace(UNIT, cut.keyFrames[key] as number);
export const BURST = eventSeconds(UNIT, 'burst') ?? 9;
export const SMALL_BURST = keyTime('marsh-1') - 0.22;
export const WALLOW_TIME = keyTime('marsh-3');
/** The reference time of the place: the key frame of the establishing picture. */
export const T0 = keyTime('marsh-0');
/** The level of the brine everywhere, metres. */
export const SEA_LEVEL = 0;

export const rockHeight = (x: number, z: number): number => {
  const dx = x - EYE[0];
  const dz = z - EYE[1];
  const d = dx * F[0] + dz * F[1];
  const l = dx * R[0] + dz * R[1];
  const u = ((d + 6 + 0.32 * l) / 13) ** 2 + ((l + 12.6) / 19) ** 2 + (l < -1.5 ? 0.07 * Math.sin(l * 1.3 + d * 0.5) + 0.05 * Math.sin(l * 2.9 - d * 1.7) : 0);
  const s = smooth(0.74, 1.08, u);
  const lump = 0.5 * Math.sin(d * 0.45 + 1) * Math.cos(l * 0.38) + 0.28 * Math.sin(d * 1.1 + l * 0.9);
  return (6.9 + lump) * (1 - s) - 0.6 * s;
};

export type Node = [number, number, number];
export const relNodes = (nodes: Node[]): Node[] =>
  nodes.map((n) => {
    const p = rel(n[0], n[1]);
    return [p[0], p[1], n[2]];
  });

export const VEIN: Node[] = relNodes([
  [-60, 44, 11], [-40, 30, 11], [-20, 16, 11], [-6, 10, 11], [6, 5.5, 11], [12.5, 1.6, 10.6], [17.5, -2, 8.6], [24.5, 1.2, 7.6],
  [33.5, 7, 7], [43.5, 11.5, 6], [57, 16.6, 5], [85, 33, 4.2], [131, 66, 3.8], [200, 110, 3.5], [330, 180, 3.2],
  [600, 330, 3], [1100, 560, 3], [2000, 900, 3], [3600, 1500, 3],
]);

export const CREEKS: Node[][] = [
  relNodes([[43.5, 11.5, 2.6], [54, 7.5, 2.4], [68, 2.5, 2.8], [85, -7, 2.5], [110, -13, 2.2], [150, -30, 2], [220, -42, 1.6], [330, -90, 1.2]]),
  relNodes([[85, 33, 2.4], [99, 46, 2.2], [118, 70, 2], [134, 110, 1.8], [140, 170, 1.8], [170, 260, 1.4]]),
  relNodes([[131, 66, 2.2], [160, 61, 2], [200, 50, 2], [262, 55, 2.2], [340, 28, 1.8], [470, 40, 1.4]]),
  relNodes([[57, 16.6, 2], [59, 24, 1.8], [58, 31, 1.8]]),
  relNodes([[200, 110, 2], [230, 150, 1.8], [300, 190, 2], [380, 270, 1.6]]),
];

export const CRUST: [number, number][] = [
  [8, 13.5], [13, 8.6], [17.5, 3.6], [21, 4.4], [25, 6.4], [29, 9.6], [34, 12.2], [40, 14.6], [50, 18.5], [64, 26], [80, 46], [75, 76], [45, 86], [15, 70], [-5, 40], [0, 23],
];

export const STUCK: [number, number] = [27.4, 14.7];

export interface Pool {
  x: number;
  z: number;
  r: number;
}

export interface Stalk {
  x: number;
  z: number;
  h: number;
  lean: number;
  yaw: number;
  kind: number;
  size: number;
  phase: number;
}

export interface Beast {
  d: number;
  l: number;
  head: [number, number];
  size: number;
  sink: number;
  speed: number;
  root: number;
}

export const BEASTS: Beast[] = [
  { d: 34.3, l: 3, head: [0, -1], size: 1, sink: 0.05, speed: 0.22, root: 0.07 },
  { d: 33, l: 5, head: [-0.3, -0.95], size: 0.34, sink: 0.1, speed: 0.1, root: 0.09 },
  { d: 32.3, l: 3.4, head: [-0.2, -1], size: 0.5, sink: 1.0, speed: 0.12, root: 0.03 },
  { d: 44, l: 7.9, head: [0.3, 1], size: 1.05, sink: 0.45, speed: 0.15, root: 0.04 },
  { d: 29.4, l: 6.4, head: [0.8, 0.5], size: 0.5, sink: 0.4, speed: 0.2, root: 0.06 },
  { d: 18.6, l: -3.4, head: [0.9, 0.3], size: 1, sink: 0.95, speed: 0.1, root: 0.03 },
  { d: 38.4, l: 9.6, head: [1, 0.5], size: 0.9, sink: 0.7, speed: 0.18, root: 0.05 },
  { d: 52, l: 14.6, head: [-1, -0.4], size: 1, sink: 0.8, speed: 0.14, root: 0.04 },
  { d: 48.5, l: 14.6, head: [0.2, -1], size: 0.85, sink: 0.6, speed: 0.1, root: 0.06 },
  { d: 41.5, l: 10.4, head: [-0.7, 0.6], size: 0.95, sink: 0.85, speed: 0.12, root: 0.04 },
  { d: 23.3, l: 0.6, head: [1, 0.2], size: 1, sink: 0.95, speed: 0.08, root: 0.03 },
];

export const DEAD: { d: number; l: number; size: number; yaw: number; limbs: boolean }[] = [
  { d: 24.4, l: 11.7, size: 1, yaw: 0.5, limbs: true },
  { d: 19.8, l: 8.6, size: 1.1, yaw: 2.1, limbs: true },
  { d: 21.3, l: 6.4, size: 0.8, yaw: 1.2, limbs: false },
  { d: 24.64, l: 16.7, size: 0.8, yaw: 0.2, limbs: false },
  { d: 32.1, l: 12, size: 1.1, yaw: 2.6, limbs: false },
  { d: 31, l: 19.8, size: 1.35, yaw: 1.7, limbs: false },
];
export const K2_DIR = bearingDir(22);
export const K2_RIGHT: [number, number] = [-K2_DIR[1], K2_DIR[0]];
export const K2_AT: [number, number] = [-8.84, 8.84];

export const K1_DIR = bearingDir(6);
export const K1_AT: [number, number] = [0.9, 11.1];
export const HERO_DOME: [number, number] = [K1_AT[0] + bearingDir(17.5)[0] * 5, K1_AT[1] + bearingDir(17.5)[1] * 5];
export const SMALL_DOME: [number, number] = [K1_AT[0] + bearingDir(-5.4)[0] * 4.5, K1_AT[1] + bearingDir(-5.4)[1] * 4.5];

export function distToSegment(x: number, z: number, a: [number, number], b: [number, number]): number {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const t = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1));
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
}

export function makePools(): Pool[] {
  const rng = stream('marsh-pools');
  const pools: Pool[] = [];
  const fixed: [number, number, number][] = [
    [58, 31, 5.5],
    [68, -10, 4],
    [150, 18, 11],
    [136, -78, 7],
    [212, 92, 14],
    [96, 72, 6],
    [-30, 62, 5],
    [20, 80, 7],
    [70, -60, 5],
    [-10, -70, 6],
  ];
  for (const f of fixed) {
    const p = rel(f[0], f[1]);
    pools.push({ x: p[0], z: p[1], r: f[2] });
  }
  for (let i = 0; i < 70; i++) {
    const a = rng.range(0, TAU);
    const r = 130 + 1900 * Math.pow(rng.next(), 1.5);
    pools.push({ x: Math.sin(a) * r, z: -Math.cos(a) * r, r: rng.range(3, 9) + (r > 500 ? rng.range(0, 8) : 0) });
  }
  return pools;
}

export function makeStalks(pools: Pool[]): Stalk[] {
  const rng = stream('marsh-stalks');
  const out: Stalk[] = [];
  const keepOut: { a: [number, number]; b: [number, number]; r: number }[] = [
    { a: [K2_AT[0] - K2_RIGHT[0] * 4.2 - K2_DIR[0], K2_AT[1] - K2_RIGHT[1] * 4.2 - K2_DIR[1]], b: [K2_AT[0] + K2_RIGHT[0] * 4.2 + K2_DIR[0], K2_AT[1] + K2_RIGHT[1] * 4.2 + K2_DIR[1]], r: 2.6 },
    { a: [K1_AT[0] - K1_DIR[0] * 3.5, K1_AT[1] - K1_DIR[1] * 3.5], b: [K1_AT[0] + K1_DIR[0] * 4, K1_AT[1] + K1_DIR[1] * 4], r: 1.5 },
    { a: [K1_AT[0], K1_AT[1]], b: [K1_AT[0] + K1_DIR[0] * 2, K1_AT[1] + K1_DIR[1] * 2], r: 2.6 },
    // The start of the walk along the bank (marsh-02) and the last of the walk past the wallowers (marsh-04).
    { a: [K2_AT[0] - K2_RIGHT[0] * 2.2 - K2_DIR[0] * 2.6, K2_AT[1] - K2_RIGHT[1] * 2.2 - K2_DIR[1] * 2.6], b: [K2_AT[0], K2_AT[1]], r: 2.8 },
    { a: rel(26.9, 6.3), b: rel(28.3, 1.5), r: 2.4 },
  ];
  const free = (x: number, z: number): boolean => keepOut.every((k) => distToSegment(x, z, k.a, k.b) > k.r);
  const one = (x: number, z: number, tall = 1): void => {
    const roll = rng.next();
    out.push({ x, z, h: rng.range(1.8, 4.3) * tall, lean: rng.range(0, 0.22), yaw: rng.range(0, TAU), kind: roll < 0.6 ? 0 : roll < 0.85 ? 1 : 2, size: rng.range(0.75, 1.2), phase: rng.range(0, TAU) });
  };
  let made = 0;
  while (made < 120) {
    const b = rng.range(0, 360);
    const weight = b > 215 ? 1 : b < 60 ? 0.75 : b < 140 ? 0.9 : 0.1;
    if (rng.next() > weight) continue;
    const r = POOL_R + 0.7 + Math.min(5.2, Math.abs(rng.normal()) * 2.3);
    const dir = bearingDir(b);
    const x = dir[0] * r;
    const z = dir[1] * r;
    if (!free(x, z)) continue;
    one(x, z, b > 215 && b < 300 ? 1.15 : 1);
    made++;
  }
  for (let i = 0; i < 7; i++) {
    const p = rel(rng.range(31, 35), rng.range(-3.4, -0.9));
    one(p[0], p[1], 1.1);
  }
  for (const pool of pools) {
    const n = 3 + rng.int(8);
    const centre = rng.range(0, TAU);
    for (let i = 0; i < n; i++) {
      const a = centre + rng.normal() * 0.9;
      const r = pool.r + 0.6 + Math.abs(rng.normal()) * 2;
      one(pool.x + Math.sin(a) * r, pool.z + Math.cos(a) * r);
    }
  }
  for (let i = 0; i < 46; i++) {
    const a = rng.range(0, TAU);
    const r = 45 + 700 * Math.pow(rng.next(), 1.6);
    const cx = Math.sin(a) * r;
    const cz = -Math.cos(a) * r;
    const dx = cx - EYE[0];
    const dz = cz - EYE[1];
    const d = dx * F[0] + dz * F[1];
    const l = dx * R[0] + dz * R[1];
    if (d < 30 && Math.abs(l) < 45) continue;
    if (d > 8 && d < 82 && l > 4 && l < 80) continue;
    const n = 3 + rng.int(7);
    for (let k = 0; k < n; k++) one(cx + rng.normal() * 3, cz + rng.normal() * 3, 0.9);
  }
  const hero = (forward: number, right: number, h: number, lean: number, kind: number, size: number): void => {
    const top: [number, number] = [K2_AT[0] + K2_DIR[0] * forward + K2_RIGHT[0] * right, K2_AT[1] + K2_DIR[1] * forward + K2_RIGHT[1] * right];
    const back = h * Math.sin(lean);
    out.push({ x: top[0] - K2_RIGHT[0] * back, z: top[1] - K2_RIGHT[1] * back, h, lean, yaw: yawOf(K2_RIGHT[0], K2_RIGHT[1]), kind, size, phase: forward });
  };
  hero(1.9, -0.42, 2.6, 0.25, 0, 1.15);
  hero(2.3, 0.05, 2.4, 0.27, 3, 0.9);
  hero(2.7, 0.55, 2.28, 0.25, 1, 1.15);
  hero(2.7, 0.82, 2.02, 0.22, 2, 1);
  hero(1.15, -0.72, 2.78, 0.2, 0, 1.1);
  hero(1.35, -0.86, 2.36, 0.3, 0, 1.1);
  hero(5.2, -1.75, 2.9, 0.3, 0, 0.8);
  hero(4.4, -2.6, 2.6, 0.12, 1, 0.9);
  const k1Right: [number, number] = [-K1_DIR[1], K1_DIR[0]];
  const near = (forward: number, right: number, h: number, lean: number, kind: number): void => {
    out.push({ x: K1_AT[0] + K1_DIR[0] * forward + k1Right[0] * right, z: K1_AT[1] + K1_DIR[1] * forward + k1Right[1] * right, h, lean, yaw: yawOf(k1Right[0], k1Right[1]), kind, size: 1, phase: forward });
  };
  near(3.3, -1.32, 3.4, 0.05, 1);
  const edge = stream('marsh-left');
  for (let i = 0; i < 18; i++) {
    const d = edge.range(15.5, 19.5);
    const p = rel(d, -0.718 * d * edge.range(0.8, 1.02));
    if (!free(p[0], p[1]) || Math.hypot(p[0], p[1]) < POOL_R + 0.6) continue;
    out.push({ x: p[0], z: p[1], h: edge.range(4.6, 7.4), lean: edge.range(0, 0.16), yaw: edge.range(0, TAU), kind: i % 3 === 0 ? 1 : 0, size: edge.range(1.2, 1.7), phase: edge.range(0, TAU) });
  }
  for (const k of [[31.8, 1.5, 4.3], [32.6, 1, 3.7], [33.2, 0.4, 3.1], [32.2, 0.2, 2.4]]) {
    const p = rel(k[0] as number, k[1] as number);
    out.push({ x: p[0], z: p[1], h: k[2] as number, lean: 0.12, yaw: (k[2] as number) * 2, kind: (k[2] as number) > 3.5 ? 0 : 1, size: 1, phase: k[2] as number });
  }
  return out;
}
