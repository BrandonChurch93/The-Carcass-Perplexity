import * as THREE from 'three';

export const DEG = Math.PI / 180;
export const SHORE = 1000;
export const DEEP = 480;
export const WORLD = 3400;

export const at = (bearing: number, r: number): [number, number] => [Math.sin(bearing * DEG) * r, -Math.cos(bearing * DEG) * r];

const wrap = (d: number): number => Math.atan2(Math.sin(d), Math.cos(d));
export const bump = (a: number, centre: number, width: number): number => Math.exp(-((wrap(a - centre * DEG) / (width * DEG)) ** 2));
export const smooth = (lo: number, hi: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

// How far the south shore, where the cameras stand, lies inside the round of the lake: the shelf there is 180 m wide, so that the black centre is a broad band from the shore.
export const FAN = 370;
export const BLUFF = 23.0;
// The east shore, under the brow, stands this far inside the round of the lake.
export const EAST_IN = 300;

export function shoreAt(bearing: number): number {
  const b = ((bearing % 360) + 360) % 360;
  return SHORE - FAN * smooth(134, 172, b) * (1 - smooth(206, 244, b)) - EAST_IN * smooth(6, 52, b) * (1 - smooth(106, 150, b));
}

export const shoreOf = (x: number, z: number): number => shoreAt(Math.atan2(x, -z) / DEG);

export const GAP_FROM: [number, number] = [-505, 870];
const gapLength = Math.hypot(-215, 420);
export const GAP_DIR: [number, number] = [-215 / gapLength, 420 / gapLength];
export const KNOLL: [number, number] = [-440, 1190];

export const LEDGE: [number, number] = [-447, 1149];

export function gapFloor(along: number): number {
  return -0.5 - 0.06 * Math.max(0, along - 120);
}

export function apronWidth(a: number): number {
  return 120 + 120 * bump(a, 270, 48) + 250 * bump(a, 182, 50) - 60 * bump(a, 92, 52) + 22 * Math.sin(5 * a + 0.7) + 14 * Math.sin(11 * a + 2.1);
}

export function landHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const a = Math.atan2(x, -z);
  const d = r - SHORE;
  const east = bump(a, 92, 52);
  const west = bump(a, 270, 48);
  const south = bump(a, 182, 50);
  const apronW = apronWidth(a);
  const apronH = 44 + 46 * west + 62 * south - 40 * east + 9 * Math.sin(7 * a + 2);
  const top = 214 + 20 * Math.sin(3 * a + 0.5) + 11 * Math.sin(8 * a + 1.9) + 6 * Math.sin(17 * a + 0.3) - 62 * west - 84 * south;
  const beach = 34;
  let y: number;
  if (d < beach) y = 0.03 * d;
  else {
    const s = Math.min(1, (d - beach) / (apronW - beach));
    const face = smooth(apronW, apronW + 58, d);
    const far = Math.max(0, d - apronW - 58);
    y = 0.03 * beach + apronH * s ** 1.25 + (top - apronH) * face + far * 0.02 + 14 * smooth(0, 500, far) * Math.sin(x * 0.0041 + 1.2) * Math.cos(z * 0.0037);
  }
  const kd = Math.hypot(x - KNOLL[0], z - KNOLL[1]);
  y += 48 * Math.exp(-((kd / 120) ** 2)) * smooth(-10, 60, d);
  y += 8.5 * Math.exp(-((Math.hypot(x - LEDGE[0], z - LEDGE[1]) / 21) ** 2));
  const ds = r - shoreOf(x, z);
  if (ds < FAN + 60) {
    const bluff = BLUFF * smooth(6, 56, ds) * (1 - smooth(95, 150, ds)) * Math.exp(-((x / 44) ** 2)) * (z > 0 ? 1 : 0);
    y = Math.max(y, Math.min(0.03 * ds, 3 + 0.012 * ds)) + bluff;
  }
  const px = x - GAP_FROM[0];
  const pz = z - GAP_FROM[1];
  const along = px * GAP_DIR[0] + pz * GAP_DIR[1];
  const across = Math.abs(px * GAP_DIR[1] - pz * GAP_DIR[0]);
  if (along > -220) {
    const open = smooth(26, 120, across + Math.max(0, -along) * 0.6);
    y = gapFloor(along) * (1 - open) + y * open;
  }
  return y;
}

export function landGeometry(): THREE.BufferGeometry {
  const rows: number[] = [];
  for (let r = 984; r < 1034; r += 6) rows.push(r);
  for (let r = 1034; r <= 1560; r += 15) rows.push(r);
  rows.push(1600, 1660, 1750, 1900, 2150, 2550, WORLD);
  const columns = 600;
  const positions: number[] = [];
  const index: number[] = [];
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i <= columns; i++) {
      const bearing = (i / columns) * 360;
      const inner = shoreAt(bearing) - 16;
      const [x, z] = at(bearing, inner + (((rows[j] as number) - 984) * (WORLD - inner)) / (WORLD - 984));
      positions.push(x, landHeight(x, z), z);
    }
  }
  const w = columns + 1;
  for (let j = 0; j < rows.length - 1; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * w + i;
      const b = a + 1;
      const c = a + w;
      const e = c + 1;
      index.push(a, b, c, b, e, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

export function ringSector(inner: number, outer: number, y: number, from = 0, to = 360, steps = 180): THREE.BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const b = from + ((to - from) * i) / steps;
    const [x0, z0] = at(b, inner);
    const [x1, z1] = at(b, outer);
    positions.push(x0, y, z0, x1, y, z1);
    if (i < steps) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

export function sweep(from: number, to: number, steps: number, profile: (bearing: number, k: number) => [number, number][]): THREE.BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  let n = 0;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const b = from + (to - from) * k;
    const pts = profile(b, k);
    n = pts.length;
    for (const [r, y] of pts) {
      const [x, z] = at(b, r);
      positions.push(x, y, z);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j;
      const b = a + 1;
      const c = a + n;
      const e = c + 1;
      index.push(a, b, c, b, e, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}
