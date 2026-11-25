import * as THREE from 'three';

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

const ripple = (x: number, z: number): number => (1 - 0.8 * smooth((Math.hypot(x, z) - 120) / 70)) * (0.6 * Math.sin(x * 0.07 + 0.5 * Math.sin(z * 0.05)) * Math.sin(z * 0.09 + 1.3) + 0.4 * Math.sin(x * 0.19 + z * 0.13 + 0.7));
const swell = (x: number, z: number): number => 0.65 * Math.sin(x * 0.021 + 1.9 * Math.sin(z * 0.013 + 0.4)) + 0.35 * Math.sin(z * 0.047 - x * 0.031 + 2.1);

/** The shelf is a pavement of level plates, each a hand higher than the next, with a short riser between them: metres above the mean. */
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

export function ground(x: number, z: number): number {
  const xc = channelX(z);
  // The west bank comes in closer than the east one where the channel opens out to the north.
  const half = x < xc ? 5 + 6 * sat((z - 20) / 15) + 2.5 * sat((5 - z) / 15) + 8 * sat((-25 - z) / 50) + 140 * sat((z - 130) / 220) : channelHalf(z);
  const r = Math.hypot(x, z);
  const b = bearingOf(x, z);
  let base: number;
  if (x < xc) {
    const flats = Math.max(smooth((-15 - z) / 60), smooth((xc - half - 45 - x) / 60));
    base = lerp(0.42 + 0.14 * ripple(x, z) + plates(x, z), -0.2 + 0.45 * swell(x, z) + 0.1 * ripple(x, z) + 0.5 * plates(x, z), flats);
    base -= 0.004 * Math.max(0, -x - 420);
  } else {
    const wet = smooth((r - 70) / 120) * smooth((-z - 30) / 90);
    base = lerp(0.4 + 0.13 * ripple(x, z) + plates(x, z), -0.12 + 0.42 * swell(x, z) + 0.1 * ripple(x, z) + 0.5 * plates(x, z), 0.85 * wet);
    base += lipHeight(b, r);
  }
  const south = sat((z + 5) / 12);
  const ragged = south * (x < xc ? 1.7 * Math.sin(z * 0.19 + 0.6) + 1.1 * Math.sin(z * 0.43 + 2.2) : 1.5 * Math.sin(z * 0.23 + 3.1) + 1.2 * Math.sin(z * 0.51 + 0.4));
  const bed = 1 - smooth((Math.abs(x - xc) - (half - 2 + ragged)) / lerp(4.5, 2.6, south));
  return lerp(base, -1.0, bed);
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
