import type { Pose, Vec3 } from '../../core/cameras';

export const SIZE = 12000;

const rad = (d: number): number => (d * Math.PI) / 180;
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const bearing = (degrees: number): [number, number] => [Math.sin(rad(degrees)), -Math.cos(rad(degrees))];

const wave = (x: number, z: number): number =>
  Math.sin(x * 0.011 + 1.7 * Math.sin(z * 0.007 + 0.4)) + 0.6 * Math.sin(z * 0.017 + 1.3 * Math.sin(x * 0.009)) + 0.35 * Math.sin((x + z) * 0.031);

const CALDERA = { x: 190, z: 90, west: 1320, east: 1100, b: 425, p: 4 };

export function calderaDistance(x: number, z: number): number {
  const dx = x - CALDERA.x;
  const dz = z - CALDERA.z;
  const e = Math.pow(Math.pow(Math.abs(dx) / (dx < 0 ? CALDERA.west : CALDERA.east), CALDERA.p) + Math.pow(Math.abs(dz) / CALDERA.b, CALDERA.p), 1 / CALDERA.p);
  if (e < 1e-5) return -CALDERA.b;
  return ((e - 1) * Math.hypot(dx, dz)) / e;
}

const WALL: [number, number][] = [
  [-40, -8],
  [0, 0],
  [60, 26],
  [125, 74],
  [150, 150],
  [172, 206],
  [380, 232],
  [408, 284],
  [432, 300],
  [900, 330],
  [6000, 380],
];

function profile(table: [number, number][], d: number): number {
  const first = table[0] as [number, number];
  if (d <= first[0]) return first[1];
  for (let i = 1; i < table.length; i++) {
    const a = table[i - 1] as [number, number];
    const b = table[i] as [number, number];
    if (d <= b[0]) return lerp(a[1], b[1], (d - a[0]) / (b[0] - a[0]));
  }
  return (table[table.length - 1] as [number, number])[1];
}

export const MOUTH = { x: -30, z: -452, floor: 96, width: 118, height: 60 };

export function wallHeight(x: number, z: number): number {
  const d = calderaDistance(x, z);
  if (d < -40) return -8;
  const ragged = d + 16 * wave(x * 1.7, z * 1.7) * smooth(20, 160, d) + 30 * wave(x * 0.45 + 300, z * 0.45) * smooth(150, 450, d);
  const h = profile(WALL, ragged) + 9 * wave(x * 2.3 + 90, z * 2.3) * smooth(140, 420, d);
  return h > 0 ? h * (1 - 0.4 * smooth(260, 820, x)) : h;
}

const SHORE: [number, number][] = [
  [-380, -330],
  [-415, -150],
  [-452, 0],
  [-476, 110],
  [-502, 200],
  [-528, 262],
  [-536, 300],
  [-522, 338],
  [-480, 372],
  [-400, 398],
  [-250, 425],
  [0, 470],
];

export function benchDistance(x: number, z: number): number {
  let best = Infinity;
  let side = 1;
  for (let i = 1; i < SHORE.length; i++) {
    const a = SHORE[i - 1] as [number, number];
    const b = SHORE[i] as [number, number];
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    const t = clamp01(((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez));
    const px = a[0] + ex * t;
    const pz = a[1] + ez * t;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) {
      best = d;
      side = ex * (z - a[1]) - ez * (x - a[0]) > 0 ? 1 : -1;
    }
  }
  return best * side;
}

export function shorePoint(part: number): [number, number] {
  const n = SHORE.length - 1;
  const f = clamp01(part) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const a = SHORE[i] as [number, number];
  const b = SHORE[i + 1] as [number, number];
  return [lerp(a[0], b[0], f - i), lerp(a[1], b[1], f - i)];
}

export const SHORE_POINTS = SHORE;

const CRAG = { x: -552, z: 104, r: 46, h: 7 };

export function benchHeight(x: number, z: number): number {
  const d = benchDistance(x, z);
  if (d < 0) return -8;
  const ropes = 0.9 * Math.sin(x * 0.21 + 2.2 * Math.sin(z * 0.09)) * Math.sin(z * 0.17 + 1.1) + 0.5 * Math.sin((x - z) * 0.43);
  const steep = smooth(200, 135, z);
  const rise = lerp(21 * smooth(6, 52, d), 31 * smooth(2, 24, d), steep) + 10 * smooth(90, 260, d) * (1 - steep);
  const crag = CRAG.h * smooth(1, 0.45, Math.hypot(x - CRAG.x, z - CRAG.z) / CRAG.r) * (0.85 + 0.15 * Math.sin(x * 0.2) * Math.sin(z * 0.23));
  return 0.35 + smooth(0, 14, d) * (0.5 + ropes * smooth(4, 30, d)) + rise + crag * smooth(4, 26, d);
}

export const BUTTRESS = { root: [445, -322] as [number, number], tip: [222, 52] as [number, number], half: 66 };

export function buttressHeight(x: number, z: number): number {
  const [rx, rz] = BUTTRESS.root;
  const [tx, tz] = BUTTRESS.tip;
  const ex = tx - rx;
  const ez = tz - rz;
  const len = Math.hypot(ex, ez);
  const along = ((x - rx) * ex + (z - rz) * ez) / len;
  const across = ((x - rx) * ez - (z - rz) * ex) / len;
  const u = along / len;
  if (u < -0.4 || u > 1.3) return -8;
  const top = lerp(204, 84, smooth(0.0, 0.9, u)) * smooth(1.12, 0.9, u) * smooth(-0.16, -0.06, u);
  const half = BUTTRESS.half * (1 - 0.35 * smooth(0.5, 1.1, u)) + 9 * wave(x * 2 + 40, z * 2);
  const edge = Math.abs(across) / half;
  const cliff = smooth(1.0, 0.72, edge);
  const scree = 0.3 * smooth(1.75, 0.95, edge);
  const h = top * Math.max(cliff, scree * smooth(1.2, 0.95, u) * smooth(-0.3, -0.1, u)) + 6 * wave(x * 3, z * 3) * cliff;
  return h < 0.5 ? -8 : h;
}

export function ground(x: number, z: number): number {
  return Math.max(wallHeight(x, z), benchHeight(x, z), buttressHeight(x, z));
}

export const floor = (x: number, z: number): number => Math.max(0, ground(x, z));

export const VIEW = { position: [-580, 25, 315] as Vec3, yaw: 49, pitch: -5.2, fov: 40 };

function basis(): { f: Vec3; r: Vec3; u: Vec3 } {
  const t = rad(VIEW.yaw);
  const p = rad(VIEW.pitch);
  const f: Vec3 = [Math.sin(t) * Math.cos(p), Math.sin(p), -Math.cos(t) * Math.cos(p)];
  const r: Vec3 = [Math.cos(t), 0, Math.sin(t)];
  const u: Vec3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  return { f, r, u };
}

export function establishing(): Pose {
  const { f } = basis();
  const p = VIEW.position;
  return { position: p, aim: [p[0] + f[0] * 400, p[1] + f[1] * 400, p[2] + f[2] * 400], fov: VIEW.fov };
}

export function spot(u: number, v: number, lift = 0): Vec3 {
  const { f, r, u: up } = basis();
  const ty = Math.tan(rad(VIEW.fov / 2));
  const tx = (ty * 16) / 9;
  const a = (2 * u - 1) * tx;
  const b = (1 - 2 * v) * ty;
  const d: Vec3 = [f[0] + a * r[0] + b * up[0], f[1] + a * r[1] + b * up[1], f[2] + a * r[2] + b * up[2]];
  const p = VIEW.position;
  for (let t = 4; t < 4000; t += 1.5) {
    const x = p[0] + d[0] * t;
    const y = p[1] + d[1] * t;
    const z = p[2] + d[2] * t;
    const g = floor(x, z);
    if (y <= g) return [x, g + lift, z];
  }
  return [p[0] + d[0] * 4000, lift, p[2] + d[2] * 4000];
}
