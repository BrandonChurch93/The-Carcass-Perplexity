// The shapes of the one that sank, made once at creation: the folded crust round it as a field of heights, the body and the two legs.
// Everything is in the local frame of the carcass: metres, y up, +x to the right and +z toward the camera of key heart-2.
import * as THREE from 'three';
import { cells2, fbm2, fbm3, mix, noise2, noise3, smooth } from './noise';

/** The local frame is the world turned by this angle about y, at SUNK. */
export const YAW = (26.5 * Math.PI) / 180;
/** Where the crust came from, in the local frame. */
const UPSTREAM: [number, number] = [0.194, -0.981];

export const FIELD = { cx: 1.0, cz: 0.2, half: 14.5, size: 1024 };

export const BODY = {
  centre: new THREE.Vector3(-1.6, 0.28, -0.25),
  radii: new THREE.Vector3(2.25, 1.22, 1.3),
  // Tilted: the back turned up toward the bench side, the neck end down.
  turn: new THREE.Euler(0.42, 0.24, -0.16, 'YXZ'),
};

export type P3 = [number, number, number];

/** The two legs that stand out: the hip is inside the body, the knee is the top of the arch. */
export const LEG_A: P3[] = [
  [-0.35, 0.45, 0.25],
  [0.25, 1.15, 0.5],
  [1.15, 2.75, 0.74],
  [2.35, 4.45, 0.9],
  [3.35, 5.18, 0.9],
  [4.05, 5.05, 0.8],
  [4.9, 4.0, 0.55],
  [5.95, 2.2, 0.1],
  [6.75, 0.55, -0.28],
  [7.0, -0.25, -0.4],
  [7.1, -0.9, -0.45],
];
export const LEG_B: P3[] = [
  [-0.6, 0.5, -0.7],
  [0.1, 1.1, -1.25],
  [1.15, 2.05, -1.95],
  [2.35, 2.72, -2.6],
  [3.15, 2.82, -2.95],
  [4.05, 2.4, -3.3],
  [4.95, 1.7, -3.55],
  [5.45, 1.25, -3.65],
];
export const FOOT_A: [number, number] = [6.93, -0.37];
/** The wrist of the second leg, where its pad hangs. */
export const WRIST_B: P3 = [5.45, 1.25, -3.65];

/** The small tear on the side the crust left by, dull red. */
export const TEAR: [number, number][] = [
  [-7.3, 1.5],
  [-6.2, 2.5],
  [-5.3, 2.75],
  [-4.4, 3.5],
  [-3.7, 4.5],
];

function polyDistance(line: [number, number][], x: number, z: number): [number, number] {
  let best = 1e9;
  let along = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i] as [number, number];
    const b = line[i + 1] as [number, number];
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    const t = Math.min(1, Math.max(0, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez || 1)));
    const d = Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t);
    if (d < best) {
      best = d;
      along = (i + t) / (line.length - 1);
    }
  }
  return [best, along];
}

const bodyYaw = BODY.turn.y;
const BC = Math.cos(bodyYaw);
const BS = Math.sin(bodyYaw);

/** Metres outside the footprint of the body at the level of the crust. Negative inside. */
function bodyDistance(x: number, z: number): number {
  const dx = x - BODY.centre.x;
  const dz = z - BODY.centre.z;
  const u = dx * BC - dz * BS;
  const w = dx * BS + dz * BC;
  const a = 2.12;
  const b = 1.16;
  const k = Math.hypot(u / a, w / b);
  return (k - 1) * Math.min(a, b) * (0.75 + 0.25 * Math.min(k, 2));
}

const smin = (a: number, b: number, k: number): number => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

const rope = (phase: number, sharp: number): number => {
  const t = 2 * (phase - Math.floor(phase)) - 1;
  return Math.pow(Math.max(0, 1 - t * t), sharp);
};

export interface FieldPoint {
  /** Metres above the flat crust. */
  h: number;
  /** 0 to 1: how hot the skin is, for the tear. */
  heat: number;
  /** Metres to the body or the foot of the leg. */
  d: number;
  /** The bent distance the folds are drawn along: the fine wrinkles of the skin follow its level lines. */
  phase: number;
}

export function makeField(lakeSeam: [number, number][]): (x: number, z: number) => FieldPoint {
  return (x, z) => {
    const wx = x + 1.3 * (noise2(x * 0.27 + 3.1, z * 0.27) - 0.5) + 0.34 * (noise2(x * 1.07, z * 1.07 + 7.3) - 0.5);
    const wz = z + 1.3 * (noise2(x * 0.27 + 11.7, z * 0.27 + 5.2) - 0.5) + 0.34 * (noise2(x * 1.07 + 9.9, z * 1.07) - 0.5);
    const dBody = bodyDistance(wx, wz);
    const dFoot = Math.hypot(wx - FOOT_A[0], wz - FOOT_A[1]) - 0.3;
    const d = smin(dBody, dFoot + 0.9, 1.4);
    const dTrue = Math.min(bodyDistance(x, z), Math.hypot(x - FOOT_A[0], z - FOOT_A[1]) - 0.3);

    const ox = x - BODY.centre.x;
    const oz = z - BODY.centre.z;
    const ol = Math.hypot(ox, oz) || 1;
    const up = 0.5 + (0.5 * (ox * UPSTREAM[0] + oz * UPSTREAM[1])) / ol;
    const pile = 0.22 + 0.78 * up * up;
    const dd = Math.max(d, 0);

    // The crust heaped against what stopped it, and climbing it on the side it came from.
    let h = pile * 1.0 * Math.exp(-dd / 1.9) * smooth(-2.5, 0.4, dBody + 1.2 * up);
    h += 0.42 * Math.exp(-Math.max(dFoot, 0) / 0.55) * smooth(9, 2, dFoot);
    if (d < 0) h += 0.35 * pile * Math.min(1.6, -d);

    // The folds: bundles of rope like pushed cloth, each leaning toward what stopped it, and the smaller ropes that ride on them.
    const env = smooth(11.0, 3.5, dd);
    const lean = d / (0.62 + 0.3 * noise2(x * 0.21 + 50, z * 0.21)) + 1.2 * noise2(x * 0.45 + 20, z * 0.45 + 3) + 0.25 * noise2(x * 1.6 + 4, z * 1.6);
    const t1 = lean - Math.floor(lean);
    const skew = Math.pow(t1, 0.62);
    const big = Math.pow(Math.max(0, 1 - (2 * skew - 1) * (2 * skew - 1)), 0.62);
    const broken = 0.3 + 1.25 * smooth(0.2, 0.7, noise2(x * 0.37 + 31, z * 0.37 + 8));
    const bigAmp = env * (0.14 + 0.2 * Math.exp(-dd / 4.5)) * (0.8 + 0.4 * up) * broken;
    h += big * bigAmp;
    const ropy = smooth(0.25, 0.6, noise2(x * 0.42 + 40.5, z * 0.42 + 1.5) + 0.3 * env);
    const env2 = smooth(12.5, 6.0, dd);
    const small = rope(d / 0.21 + 2.2 * fbm2(x * 0.62 + 5, z * 0.62 + 9, 3) + 0.7 * big, 0.7);
    h += small * 0.06 * env2 * ropy * (0.45 + 1.1 * noise2(x * 1.3 + 2, z * 1.3));
    // Billows where the skin did not rope.
    h += (fbm2(x * 0.9 + 70, z * 0.9, 4) - 0.45) * 0.22 * env2 * (1 - 0.5 * ropy);

    // The tear: the lips lift, the floor is the lava under the skin.
    const [dt, at] = polyDistance(TEAR, x, z);
    const ragged = dt + 0.2 * (noise2(x * 2.6 + 8, z * 2.6) - 0.5) + 0.07 * (noise2(x * 8.1, z * 8.1 + 3) - 0.5);
    const tearWidth = 0.34 * Math.sin(Math.PI * Math.min(1, Math.max(0, at))) ** 0.7 * (0.55 + 0.9 * noise2(x * 0.9 + 14, z * 0.9 + 22));
    h += 0.22 * Math.exp(-Math.pow(Math.max(ragged - tearWidth, 0) / 0.7, 2)) * smooth(0, 0.12, tearWidth);
    const open = smooth(tearWidth, tearWidth * 0.45, ragged) * smooth(0.02, 0.1, tearWidth);
    h = mix(h, 0.05 + 0.03 * noise2(x * 6, z * 6), open);
    const heat = smooth(tearWidth * 1.15, tearWidth * 0.15, ragged) * smooth(0.02, 0.1, tearWidth);

    // The seam the lake draws on the flank: the relief opens over it and the lake shows through.
    const [ds] = polyDistance(lakeSeam, x, z);
    const seam = ds + 0.16 * (noise2(x * 2.2 + 3, z * 2.2 + 17) - 0.5);
    h += 0.16 * Math.exp(-Math.pow((seam - 0.95) / 0.5, 2));
    h = mix(h, -0.2, smooth(0.8, 0.42, seam));

    return { h, heat, d: dTrue, phase: d };
  };
}

export interface Baked {
  /** Heights, metres, FIELD.size squared. */
  height: Float32Array;
  /** rg: slope in x and z (0.5 is level, the range is plus or minus 3); b: how open the sky is over the point. */
  relief: THREE.DataTexture;
  /** r: heat of the tear; g: ash; b: how far the point stands over the ground round it, 0.5 is level; a: the reach of the tear's light. */
  mask: THREE.DataTexture;
  /** r: the bent distance the folds follow, metres; gb: its direction on the ground; a: height in metres. Half float. */
  lines: THREE.DataTexture;
  at(x: number, z: number): number;
}

function blur(src: Float32Array, n: number, radius: number): Float32Array {
  const tmp = new Float32Array(n * n);
  const out = new Float32Array(n * n);
  const w = 2 * radius + 1;
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = -radius; i <= radius; i++) s += src[j * n + Math.min(n - 1, Math.max(0, i))] as number;
    for (let i = 0; i < n; i++) {
      tmp[j * n + i] = s / w;
      s += (src[j * n + Math.min(n - 1, i + radius + 1)] as number) - (src[j * n + Math.max(0, i - radius)] as number);
    }
  }
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = -radius; j <= radius; j++) s += tmp[Math.min(n - 1, Math.max(0, j)) * n + i] as number;
    for (let j = 0; j < n; j++) {
      out[j * n + i] = s / w;
      s += (tmp[Math.min(n - 1, j + radius + 1) * n + i] as number) - (tmp[Math.max(0, j - radius) * n + i] as number);
    }
  }
  return out;
}

function dataTexture(data: Uint8Array, n: number): THREE.DataTexture {
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export const SLOPE_RANGE = 3;

export function bakeField(field: (x: number, z: number) => FieldPoint): Baked {
  const n = FIELD.size;
  const cell = (2 * FIELD.half) / n;
  const height = new Float32Array(n * n);
  const heat = new Float32Array(n * n);
  const dist = new Float32Array(n * n);
  const phase = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const p = field(FIELD.cx - FIELD.half + (i + 0.5) * cell, FIELD.cz - FIELD.half + (j + 0.5) * cell);
      height[j * n + i] = p.h;
      heat[j * n + i] = p.heat;
      dist[j * n + i] = p.d;
      phase[j * n + i] = p.phase;
    }
  }
  // A hollow is a place lower than the ground round it, at the width of a rope and at the width of a fold.
  const near = blur(height, n, 3);
  const mid = blur(height, n, 10);
  const wide = blur(mid, n, 22);
  const warm = blur(blur(heat, n, 9), n, 9);
  const relief = new Uint8Array(n * n * 4);
  const mask = new Uint8Array(n * n * 4);
  const lines = new Uint16Array(n * n * 4);
  const byte = (v: number): number => Math.min(255, Math.max(0, Math.round(v * 255)));
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const hx = ((height[j * n + Math.min(n - 1, i + 1)] as number) - (height[j * n + Math.max(0, i - 1)] as number)) / (2 * cell);
      const hz = ((height[Math.min(n - 1, j + 1) * n + i] as number) - (height[Math.max(0, j - 1) * n + i] as number)) / (2 * cell);
      const h = height[k] as number;
      const hollow = Math.max(0, (near[k] as number) - h) * 9 + Math.max(0, (mid[k] as number) - h) * 3.2 + Math.max(0, (wide[k] as number) - h) * 1.3;
      const d = dist[k] as number;
      // What stands over the crust hides the sky from it.
      const under = 0.62 * Math.exp(-Math.max(d, 0) / 0.55) + 0.25 * Math.exp(-Math.max(d, 0) / 2.2);
      const open = Math.max(0.04, (1 - under) / (1 + hollow));
      relief[k * 4] = byte(0.5 + hx / (2 * SLOPE_RANGE));
      relief[k * 4 + 1] = byte(0.5 + hz / (2 * SLOPE_RANGE));
      relief[k * 4 + 2] = byte(open);
      relief[k * 4 + 3] = 255;
      const x = FIELD.cx - FIELD.half + (i + 0.5) * cell;
      const z = FIELD.cz - FIELD.half + (j + 0.5) * cell;
      // Ash lies where the ground is low and level.
      const level = 1 / (1 + 6 * (hx * hx + hz * hz));
      const ash = smooth(0.012, 0.07, (mid[k] as number) - h + 0.03 * (noise2(x * 1.7, z * 1.7) - 0.5)) * level;
      mask[k * 4] = byte(heat[k] as number);
      mask[k * 4 + 1] = byte(ash);
      mask[k * 4 + 2] = byte(0.5 + 2.2 * (h - (mid[k] as number)));
      const px = ((phase[j * n + Math.min(n - 1, i + 1)] as number) - (phase[j * n + Math.max(0, i - 1)] as number)) / (2 * cell);
      const pz = ((phase[Math.min(n - 1, j + 1) * n + i] as number) - (phase[Math.max(0, j - 1) * n + i] as number)) / (2 * cell);
      const pl = Math.hypot(px, pz) || 1;
      lines[k * 4] = THREE.DataUtils.toHalfFloat(phase[k] as number);
      lines[k * 4 + 1] = THREE.DataUtils.toHalfFloat(px / pl);
      lines[k * 4 + 2] = THREE.DataUtils.toHalfFloat(pz / pl);
      lines[k * 4 + 3] = THREE.DataUtils.toHalfFloat(h);
      mask[k * 4 + 3] = byte((warm[k] as number) * 2.5);
    }
  }
  const at = (x: number, z: number): number => {
    const fx = Math.min(n - 1.001, Math.max(0, (x - FIELD.cx + FIELD.half) / cell - 0.5));
    const fz = Math.min(n - 1.001, Math.max(0, (z - FIELD.cz + FIELD.half) / cell - 0.5));
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fx - i;
    const v = fz - j;
    const a = j * n + i;
    return ((height[a] as number) * (1 - u) + (height[a + 1] as number) * u) * (1 - v) + ((height[a + n] as number) * (1 - u) + (height[a + n + 1] as number) * u) * v;
  };
  const linesTexture = new THREE.DataTexture(lines, n, n, THREE.RGBAFormat, THREE.HalfFloatType);
  linesTexture.minFilter = THREE.LinearFilter;
  linesTexture.magFilter = THREE.LinearFilter;
  linesTexture.colorSpace = THREE.NoColorSpace;
  linesTexture.needsUpdate = true;
  return { height, relief: dataTexture(relief, n), mask: dataTexture(mask, n), lines: linesTexture, at };
}

/** The relief as a sheet: fine round the carcass and on the side the bench sees, coarser at the rim. */
export function fieldGeometry(baked: Baked, cellSize: number, keep: (x: number, z: number) => boolean): THREE.BufferGeometry {
  const span = 2 * FIELD.half;
  const count = Math.round(span / cellSize);
  const g = new THREE.PlaneGeometry(span, span, count, count);
  g.rotateX(-Math.PI / 2);
  g.translate(FIELD.cx, 0, FIELD.cz);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, baked.at(p.getX(i), p.getZ(i)));
  const index = g.getIndex() as THREE.BufferAttribute;
  const kept: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    const x = (p.getX(a) + p.getX(b) + p.getX(c)) / 3;
    const z = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3;
    if (keep(x, z)) kept.push(a, b, c);
  }
  g.setIndex(kept);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g.computeBoundingSphere();
  return g;
}

// A closed tube along a curve through the given points. `radius(s, angle)` is metres at s metres along and that angle round.
export interface Tube {
  geometry: THREE.BufferGeometry;
  length: number;
  /** Centre of the tube at part t, 0 to 1. */
  centre(t: number): THREE.Vector3;
}

export function tube(points: P3[], rings: number, round: number, radius: (s: number, angle: number, t: number) => number, shift?: (p: THREE.Vector3, n: THREE.Vector3, s: number, angle: number) => number): Tube {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    'centripetal',
  );
  const length = curve.getLength();
  const frames = curve.computeFrenetFrames(rings, false);
  const position = new Float32Array((rings + 1) * (round + 1) * 3);
  const uv = new Float32Array((rings + 1) * (round + 1) * 3);
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    curve.getPointAt(t, c);
    const N = frames.normals[i] as THREE.Vector3;
    const B = frames.binormals[i] as THREE.Vector3;
    for (let j = 0; j <= round; j++) {
      const a = ((j % round) / round) * Math.PI * 2;
      n.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      const r = radius(t * length, a, t);
      p.copy(c).addScaledVector(n, r);
      if (shift) p.addScaledVector(n, shift(p, n, t * length, a));
      const k = i * (round + 1) + j;
      position[k * 3] = p.x;
      position[k * 3 + 1] = p.y;
      position[k * 3 + 2] = p.z;
      uv[k * 3] = j / round;
      uv[k * 3 + 1] = t * length;
      uv[k * 3 + 2] = 3;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < round; j++) {
      const a = i * (round + 1) + j;
      const b = a + round + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aMap', new THREE.BufferAttribute(uv, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  weld(g, rings + 1, round + 1);
  g.computeBoundingSphere();
  return { geometry: g, length, centre: (t) => curve.getPointAt(Math.min(1, Math.max(0, t)), new THREE.Vector3()) };
}

// The first and last column of a wrapped grid are the same points: give them the same normal.
function weld(g: THREE.BufferGeometry, rows: number, columns: number): void {
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i < rows; i++) {
    const k0 = i * columns;
    const k1 = k0 + columns - 1;
    a.fromBufferAttribute(n, k0);
    b.fromBufferAttribute(n, k1);
    a.add(b).normalize();
    n.setXYZ(k0, a.x, a.y, a.z);
    n.setXYZ(k1, a.x, a.y, a.z);
  }
}

/** The body: a deep small hull, its hide sunk between the ribs of the frame, tilted in the crust. */
export function bodyGeometry(): THREE.BufferGeometry {
  const rows = 150;
  const columns = 220;
  const position = new Float32Array((rows + 1) * (columns + 1) * 3);
  const uv = new Float32Array((rows + 1) * (columns + 1) * 3);
  const q = new THREE.Quaternion().setFromEuler(BODY.turn);
  const p = new THREE.Vector3();
  const R = BODY.radii;
  for (let i = 0; i <= rows; i++) {
    // The poles lie on the long axis, so the rings are the ribs.
    const v = i / rows;
    const along = -Math.cos(v * Math.PI);
    const ring = Math.sin(v * Math.PI);
    for (let j = 0; j <= columns; j++) {
      const a = ((j % columns) / columns) * Math.PI * 2;
      const dy = Math.cos(a);
      const dz = Math.sin(a);
      // A hull deeper than it is wide, with a keel of spine along the back.
      let r = 1;
      const s = along * R.x;
      const ribs = Math.pow(0.5 + 0.5 * Math.cos(s * 9.2 + 0.8 * Math.sin(a * 2)), 3);
      const flank = smooth(0.15, 0.75, Math.abs(dz));
      const dry = fbm3(along * 2.1 + 3, dy * 1.4, dz * 1.4, 4);
      r -= 0.13 * (1 - ribs) * flank * ring * (0.4 + 1.2 * dry);
      r += 0.05 * ribs * flank * ring;
      r += 0.085 * Math.exp(-Math.pow((a - 0) / 0.16, 2)) * (0.6 + 0.4 * Math.cos(s * 14)) + 0.085 * Math.exp(-Math.pow((a - Math.PI * 2) / 0.16, 2)) * (0.6 + 0.4 * Math.cos(s * 14));
      r += 0.16 * (dry - 0.47);
      // One side fell in.
      r -= 0.2 * smooth(0.45, 0.8, noise3(along * 1.3 + 7, dy * 1.1 + 2, dz * 1.1)) * ring;
      r += 0.02 * (noise3(along * 19, dy * 15, dz * 15) - 0.5);
      p.set(along * R.x * (0.9 + 0.1 * r), dy * R.y * ring * r, dz * R.z * ring * r * (1 - 0.25 * smooth(0, 1, dy)));
      p.applyQuaternion(q).add(BODY.centre);
      const k = i * (columns + 1) + j;
      position[k * 3] = p.x;
      position[k * 3 + 1] = p.y;
      position[k * 3 + 2] = p.z;
      uv[k * 3] = j / columns;
      uv[k * 3 + 1] = v * 5.4;
      uv[k * 3 + 2] = 12;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      const a = i * (columns + 1) + j;
      const b = a + columns + 1;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aMap', new THREE.BufferAttribute(uv, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  weld(g, rows + 1, columns + 1);
  g.computeBoundingSphere();
  return g;
}

/** A leg dried to tendon and joint: thin shafts, a swollen knee, cords standing out along it. */
export function legGeometry(points: P3[], knee: number, scale: number, seed: number): Tube {
  return tube(points, 520, 72, (s, a, t) => {
    const joint = 0.19 * Math.exp(-Math.pow((t - knee) / 0.045, 2)) + 0.07 * Math.exp(-Math.pow((t - 0.93) / 0.03, 2));
    const shaft = 0.2 + 0.1 * smooth(0.5, 0.0, t) + 0.05 * smooth(0.6, 1, t);
    const cords = 0.16 * Math.cos(2 * a + s * 0.9 + seed) + 0.09 * Math.cos(3 * a - s * 1.7 + seed * 2) + 0.05 * Math.cos(5 * a + s * 2.3);
    const lumps = 0.35 * (fbm3(s * 1.6 + seed, Math.cos(a) * 0.8, Math.sin(a) * 0.8, 3) - 0.47);
    const flakes = cells2(a * 3.2 + seed, s * 2.2);
    const plate = (flakes[2] > 0.42 ? 0.04 : 0) * smooth(0, 0.06, flakes[1]);
    const end = smooth(0, 0.03, t) * smooth(1, 0.985, t);
    return scale * end * ((shaft + joint) * (1 + cords * 0.55 + lumps) + plate);
  });
}
