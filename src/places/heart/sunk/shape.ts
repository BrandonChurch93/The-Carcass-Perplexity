// The shapes of the one that sank, made once at creation: the folded crust round it as a field of heights, the body and the two legs.
// Everything is in the local frame of the carcass: metres, y up, +x to the right and +z toward the camera of key heart-2
// (the refitted one, 21 m off at local (0, 4.4, 21)).
import * as THREE from 'three';
import { cells2, fbm2, fbm3, hash, mix, noise2, noise3, smooth } from './noise';

/** The local frame is the world turned by this angle about y, at SUNK. */
export const YAW = (58.6 * Math.PI) / 180;
/** Where the crust came from, in the local frame: the world's (0.611, -0.791) turned into it. */
const UPSTREAM: [number, number] = [0.611 * Math.cos(YAW) - 0.791 * Math.sin(YAW), -0.611 * Math.sin(YAW) - 0.791 * Math.cos(YAW)];

export const FIELD = { cx: -3.0, cz: 0.5, half: 14.5, size: 1024 };

export const BODY = {
  centre: new THREE.Vector3(-4.9, 0.85, -0.25),
  radii: new THREE.Vector3(3.6, 1.85, 1.9),
  // Tilted: the back turned up toward the bench side, the neck end down.
  turn: new THREE.Euler(0.42, 0.24, -0.16, 'YXZ'),
};

export type P3 = [number, number, number];

/** The two legs that stand out: the hip is inside the body, the knee is the top of the arch. */
// Each leg is three bones as on the living ones: thigh from the hip up to the knee, shank down to the hock, cannon into the crust.
// The points crowd at a joint so the curve turns there and runs nearly straight between.
const bones = (nodes: P3[], bow: number): P3[] => {
  const out: P3[] = [];
  for (let n = 0; n < nodes.length - 1; n++) {
    const a = nodes[n] as P3;
    const b = nodes[n + 1] as P3;
    const steps = [0, 0.08, 0.3, 0.5, 0.7, 0.92];
    for (const u of steps) {
      const k = Math.sin(Math.PI * u) * bow * (n === 1 ? -1 : 1);
      out.push([a[0] + (b[0] - a[0]) * u + k * 0.4, a[1] + (b[1] - a[1]) * u + k, a[2] + (b[2] - a[2]) * u - k * 0.5]);
    }
  }
  out.push(nodes[nodes.length - 1] as P3);
  return out;
};
const NODES_A: P3[] = [
  [-2.75, 0.46, 0.25],
  [0.95, 5.3, 0.9],
  [4.05, 1.25, -0.12],
  [4.7, -0.9, -0.45],
];
const NODES_B: P3[] = [
  [-3, 0.49, -0.7],
  [0.85, 3.25, -2.95],
  [3.5, 1.15, -3.72],
  [4.02, -0.95, -3.9],
];
export const LEG_A: P3[] = bones(NODES_A, 0.16);
export const LEG_B: P3[] = bones(NODES_B, 0.12);
export const FOOT_A: [number, number] = [4.53, -0.37];
/** The second leg goes down into the crust too, behind the first. */
export const FOOT_B: [number, number] = [3.95, -3.89];
/** The wrist of the second leg, where its pad hangs. */
export const WRIST_B: P3 = [3.22, 2.02, -3.63];

/** The small tear on the side the crust left by, dull red. */
// It runs away from the bench of key heart-2, so that camera looks down its length and sees the bottom of its far end.
export const TEAR: [number, number][] = [
  [-7.2, 6.1],
  [-7.55, 5.3],
  [-8.25, 4.75],
  [-8.4, 4.0],
  [-9.0, 3.4],
];

/** The ropes are counted outward from the body and their width swings between 12 and 40 cm. The shader does the same sums. */
export const ROPE = { turn: 1.7, start: 0.6 };
export function ropeCount(u: number): number {
  const th = ROPE.turn * u + ROPE.start;
  return 2.5 * u + 6 * (0.375 * u - (0.5 * Math.cos(th)) / ROPE.turn - Math.sin(2 * th) / (16 * ROPE.turn));
}
export function ropeWidth(u: number): number {
  const g = 0.5 + 0.5 * Math.sin(ROPE.turn * u + ROPE.start);
  return 1 / (2.5 + 6 * g * g);
}

// How far from the body the folded skin reaches, by the direction from the middle of the field: one broad lobe toward the bench,
// one behind where the crust came from, a small one, and two thin tongues. Between them the lake's plain crust comes in.
const LOBES: [number, number, number][] = [
  [150, 18, 4.9],
  [258, 26, 4.4],
  [8, 9, 5.4],
  [207, 9, 5.0],
  [315, 13, 2.6],
];
function reach(x: number, z: number): number {
  const phi = (Math.atan2(z - FIELD.cz, x - FIELD.cx) * 180) / Math.PI;
  // The broad one has a flat front.
  const front = ((((phi - 85) % 360) + 540) % 360) - 180;
  let best = 7.8 * Math.exp(-Math.pow(front / 64, 4));
  for (const [at, wide, far] of LOBES) {
    const off = ((((phi - at) % 360) + 540) % 360) - 180;
    best = Math.max(best, far * Math.exp(-(off * off) / (wide * wide)));
  }
  return 1.5 + best;
}

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
export function bodyDistance(x: number, z: number): number {
  const dx = x - BODY.centre.x;
  const dz = z - BODY.centre.z;
  const u = dx * BC - dz * BS;
  const w = dx * BS + dz * BC;
  const a = 3.3;
  const b = 1.55;
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
  /** The bent distance from the body the ropes are counted by, metres: the creases and strands of the skin are drawn from it. */
  phase: number;
  /** 0 to 1: how strongly the skin is roped here. */
  ropes: number;
  /** 0 to 1: the skin is the folded one here. */
  folded: number;
  /** 0 to 1: inside a break across a rope. */
  cut: number;
}

export function makeField(lakeSeam: [number, number][]): (x: number, z: number) => FieldPoint {
  return (x, z) => {
    const wx = x + 1.3 * (noise2(x * 0.27 + 3.1, z * 0.27) - 0.5) + 0.34 * (noise2(x * 1.07, z * 1.07 + 7.3) - 0.5);
    const wz = z + 1.3 * (noise2(x * 0.27 + 11.7, z * 0.27 + 5.2) - 0.5) + 0.34 * (noise2(x * 1.07 + 9.9, z * 1.07) - 0.5);
    const dBody = bodyDistance(wx, wz);
    const dFoot = Math.hypot(wx - FOOT_A[0], wz - FOOT_A[1]) - 0.3;
    const dFootB = Math.hypot(wx - FOOT_B[0], wz - FOOT_B[1]) - 0.25;
    const d = smin(smin(dBody, dFoot + 0.9, 1.4), dFootB + 0.9, 1.4);
    const dTrue = Math.min(bodyDistance(x, z), Math.hypot(x - FOOT_A[0], z - FOOT_A[1]) - 0.3, Math.hypot(x - FOOT_B[0], z - FOOT_B[1]) - 0.25);

    const ox = x - BODY.centre.x;
    const oz = z - BODY.centre.z;
    const ol = Math.hypot(ox, oz) || 1;
    const up = 0.5 + (0.5 * (ox * UPSTREAM[0] + oz * UPSTREAM[1])) / ol;
    const pile = 0.22 + 0.78 * up * up;
    const dd = Math.max(d, 0);

    // The crust heaped against what stopped it, and climbing it on the side it came from.
    let h = pile * 1.25 * Math.exp(-dd / 2.2) * smooth(-2.5, 0.4, dBody + 1.2 * up);
    h += 0.3 * Math.exp(-Math.max(dFoot, 0) / 0.55) * smooth(9, 2, dFoot);
    h += 0.26 * Math.exp(-Math.max(dFootB, 0) / 0.5) * smooth(9, 2, dFootB);
    // The end of the body that went under first: the skin rode up over it and lies on it in a hump.
    const hump = Math.exp(-(Math.pow((wx - BODY.centre.x + 3.5) / 2.0, 2) + Math.pow((wz - BODY.centre.z - 0.3) / 2.2, 2)));
    h += 0.95 * hump;
    if (d < 0) h += 0.35 * pile * Math.min(1.6, -d);

    // The folds: bundles of rope like pushed cloth, each leaning toward what stopped it, and the smaller ropes that ride on them.
    const out = reach(x, z);
    const wobble = 1.1 * (noise2(x * 0.45 + 33, z * 0.45 + 2) - 0.5) + 0.35 * (noise2(x * 1.9 + 3, z * 1.9 + 41) - 0.5);
    const edge = smooth(out, out - 2.2, dd + wobble) * smooth(9.3, 8.3, Math.hypot(x - FIELD.cx, z - FIELD.cz));
    h *= edge;
    const env = smooth(out + 1.0, 0.35 * out, dd) * edge;
    const lean = d / (1.0 + 0.5 * noise2(x * 0.21 + 50, z * 0.21)) + 2.5 * noise2(x * 0.34 + 20, z * 0.34 + 3) + 0.25 * noise2(x * 1.6 + 4, z * 1.6);
    const t1 = lean - Math.floor(lean);
    const skew = Math.pow(t1, 0.62);
    const big = Math.pow(Math.max(0, 1 - (2 * skew - 1) * (2 * skew - 1)), 0.62);
    const broken = 0.3 + 1.25 * smooth(0.2, 0.7, noise2(x * 0.37 + 31, z * 0.37 + 8));
    const bigAmp = env * (0.24 + 0.3 * Math.exp(-dd / 4.5)) * (0.8 + 0.4 * up) * broken;
    h += big * bigAmp;
    const ropy = smooth(0.25, 0.6, noise2(x * 0.42 + 40.5, z * 0.42 + 1.5) + 0.3 * env);
    const env2 = smooth(out + 1.5, 0.5 * out, dd) * edge;
    // The pad is toes of lava of different ages, a few metres across. Some kept the ropes that run round the body; the others
    // have their own, arcing round where each came from, and each lies a little over the next with a groove between.
    const lobeAt = cells2(x * 0.3 + 0.6 * (noise2(x * 0.25 + 71, z * 0.25 + 5) - 0.5), z * 0.3 + 0.6 * (noise2(x * 0.25 + 13, z * 0.25 + 88) - 0.5), 4096);
    const lobe = Math.floor(lobeAt[1] * 4096);
    const bend = 1.12 * fbm2(x * 0.62 + 5, z * 0.62 + 9, 3);
    const turn = hash(lobe, 2, 9) * Math.PI * 2;
    const back = 1.6 + 2.5 * hash(lobe, 3, 9);
    const own = Math.hypot(lobeAt[2] / 0.3 - back * Math.cos(turn), lobeAt[3] / 0.3 - back * Math.sin(turn)) + 9 * hash(lobe, 4, 9) + 0.6 * bend;
    const bent = hash(lobe, 1, 9) < 0.6 ? own : d + bend + 0.23 * big;
    h += 0.17 * hash(lobe, 5, 9) * smooth(0, 0.05, lobeAt[0]) * env;
    const count = ropeCount(bent);
    const width = ropeWidth(bent);
    const small = rope(count, 0.42);
    const ropes = env2 * ropy * (0.45 + 1.1 * noise2(x * 1.3 + 2, z * 1.3));
    const ropeHigh = Math.min(0.15, 0.44 * width) * Math.min(1, ropes);
    // The ropes broke across as they cooled and were pushed on: a ragged notch nearly to the crease, every few hands along.
    const id = Math.floor(count);
    const piece = 0.5 + 1.1 * hash(id, 3, 1);
    const run = (Math.atan2(ox, oz) * (3 + Math.max(bent, 0))) / piece + 9 * hash(id, 5, 2);
    const nearest = Math.round(run);
    const parted = hash(nearest, id, 7) > 0.66 ? 1 : 0;
    const toBreak = Math.abs(run - nearest) * piece + 0.05 * (noise2(x * 13 + 1, z * 13) - 0.5) + 0.02 * (noise2(x * 31, z * 31 + 5) - 0.5);
    const cut = parted * smooth(0.05 + 0.04 * hash(nearest, id, 11), 0.012, toBreak) * smooth(0.15, 0.5, ropes);
    h += small * ropeHigh * (1 - 0.8 * cut);
    // Lobes: toes of lava that broke out between the ropes and swelled, a metre or so across, a crease round each.
    const cell = cells2(x * 0.85 + 0.5 * noise2(x * 0.6, z * 0.6 + 40), z * 0.85 + 0.5 * noise2(x * 0.6 + 17, z * 0.6), 4096);
    const lobed = smooth(0.32, 0.62, noise2(x * 0.3 + 61, z * 0.3 + 13)) * env;
    h += lobed * (0.12 + 0.2 * cell[1]) * (Math.sqrt(smooth(0, 0.3, cell[0])) - 0.5) * (0.7 + 0.6 * Math.exp(-dd / 3));
    // Rubble at the edge: bits of broken skin the pad pushed ahead of it, lying on the lake's plates past where the folds end.
    const fringe = smooth(out + 1.6, out - 0.6, dd + wobble) * (1 - smooth(0.25, 0.8, edge)) * smooth(9.3, 8.3, Math.hypot(x - FIELD.cx, z - FIELD.cz));
    const bit = cells2(x * 3.1 + 0.4 * noise2(x * 1.1, z * 1.1 + 9), z * 3.1 + 0.4 * noise2(x * 1.1 + 5, z * 1.1), 4096);
    const bitSize = (bit[1] * 977) % 1;
    if (bit[1] > 0.6) h += fringe * (0.03 + 0.1 * bitSize) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.hypot(bit[2], bit[3]) / (0.16 + 0.3 * bitSize), 2)));
    // Billows where the skin did not rope.
    h += (fbm2(x * 0.9 + 70, z * 0.9, 4) - 0.45) * 0.22 * env2 * (1 - 0.5 * ropy);

    // The tear: the lips lift, the floor is the lava under the skin.
    const [dt, at] = polyDistance(TEAR, x, z);
    const ragged = dt + 0.2 * (noise2(x * 2.6 + 8, z * 2.6) - 0.5) + 0.07 * (noise2(x * 8.1, z * 8.1 + 3) - 0.5);
    const tearWidth = 0.21 * Math.sin(Math.PI * Math.min(1, Math.max(0, at))) ** 0.7 * (0.6 + 0.85 * noise2(x * 0.9 + 14, z * 0.9 + 22));
    // It lies in a hollow of the folds, and its lips are low at the end the bench looks in by.
    const within = smooth(0, 0.08, tearWidth);
    h -= 0.3 * Math.exp(-Math.pow(dt / 1.1, 2)) * edge;
    h += (0.02 + 0.09 * at) * Math.exp(-Math.pow(Math.max(ragged - tearWidth, 0) / 0.4, 2)) * within * edge;
    const open = smooth(tearWidth, tearWidth * 0.3, ragged) * smooth(0.02, 0.1, tearWidth);
    const floor = -0.62 + 0.05 * noise2(x * 6, z * 6);
    const lipHeight = h;
    h = mix(h, floor, open);
    // The walls are hot only toward the bottom.
    const heat = smooth(tearWidth * 1.1, tearWidth * 0.2, ragged) * smooth(0.02, 0.1, tearWidth) * smooth(lipHeight - 0.1, floor + 0.26, h);

    // The lake's seam runs on under the folded skin: the skin stands a little proud along it.
    const [ds] = polyDistance(lakeSeam, x, z);
    h += 0.08 * Math.exp(-Math.pow(ds / 0.7, 2)) * edge;

    return { h, heat, d: dTrue + 3 * hump, phase: bent, ropes: Math.min(1, ropes) * (1 - open), folded: edge, cut: cut * (1 - open) };
  };
}

export interface Baked {
  /** Heights, metres, FIELD.size squared. */
  height: Float32Array;
  /** rg: slope in x and z (0.5 is level, the range is plus or minus 3); b: how open the sky is over the point; a: the folded skin. */
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
  t.anisotropy = 2;
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
  const ropes = new Float32Array(n * n);
  const folded = new Float32Array(n * n);
  const cut = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const p = field(FIELD.cx - FIELD.half + (i + 0.5) * cell, FIELD.cz - FIELD.half + (j + 0.5) * cell);
      height[j * n + i] = p.h;
      heat[j * n + i] = p.heat;
      dist[j * n + i] = p.d;
      phase[j * n + i] = p.phase;
      ropes[j * n + i] = p.ropes;
      folded[j * n + i] = p.folded;
      cut[j * n + i] = p.cut;
    }
  }
  // A hollow is a place lower than the ground round it, at the width of a rope and at the width of a fold.
  const near = blur(height, n, 3);
  const mid = blur(height, n, 10);
  const wide = blur(mid, n, 22);
  const warm = blur(blur(heat, n, 10), n, 10);
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
      const open = Math.max(0.04, ((1 - under) * (1 - 0.8 * (cut[k] as number))) / (1 + hollow));
      relief[k * 4] = byte(0.5 + hx / (2 * SLOPE_RANGE));
      relief[k * 4 + 1] = byte(0.5 + hz / (2 * SLOPE_RANGE));
      relief[k * 4 + 2] = byte(open);
      relief[k * 4 + 3] = byte(folded[k] as number);
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
      lines[k * 4 + 3] = THREE.DataUtils.toHalfFloat(ropes[k] as number);
      mask[k * 4 + 3] = byte((warm[k] as number) * 5.0);
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
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    let y = baked.at(x, z);
    // Where the lava heaped onto the back, the sheet stays under the hide: a strip of it came out over the spine as a black hoop.
    const d = bodyDistance(x, z);
    if (d < -0.3 && x > BODY.centre.x - 2.2) {
      const inward = Math.min(1, -d / 1.55);
      const roof = BODY.centre.y + BODY.radii.y * 0.7 * Math.sqrt(1 - (1 - inward) * (1 - inward)) - 0.2;
      y = mix(y, Math.min(y, roof), smooth(BODY.centre.x - 2.2, BODY.centre.x - 1.3, x));
    }
    p.setY(i, y);
  }
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

// A closed tube along a curve through the given points. `radius(s, angle, t)` is metres at s metres along and that angle round.
// `finish` may move a point along its normal and says what the surface is there.
export interface Tube {
  geometry: THREE.BufferGeometry;
  length: number;
}

export interface Surface {
  /** Metres to move the point out along its normal. */
  out: number;
  /** 0 to 1: lava that climbed it and froze. */
  coat: number;
  /** Legs: 1 on a plate of hide, 0 on bare tendon. Body: 1 inside a split. */
  feature: number;
  /** 0 to 1: how much of the sky the point sees. */
  open: number;
  /** 0 to 1: bone or sinew shows. */
  bone: number;
}

const KIND = { leg: 0, body: 1, pad: 2 };

function finishGeometry(position: Float32Array, map: Float32Array, surf: Float32Array, index: number[], rows: number, columns: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aMap', new THREE.BufferAttribute(map, 4));
  g.setAttribute('aSurf', new THREE.BufferAttribute(surf, 4));
  g.setIndex(index);
  g.computeVertexNormals();
  weld(g, rows, columns);
  g.computeBoundingSphere();
  return g;
}

export function tube(
  points: P3[],
  rings: number,
  round: number,
  kind: number,
  radius: (s: number, angle: number, t: number) => [number, number, number],
  finish: (p: THREE.Vector3, s: number, angle: number, t: number) => Surface,
  hidden?: (c: THREE.Vector3) => boolean,
): Tube {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    'centripetal',
  );
  const length = curve.getLength();
  const frames = curve.computeFrenetFrames(rings, false);
  const count = (rings + 1) * (round + 1);
  const position = new Float32Array(count * 3);
  const map = new Float32Array(count * 4);
  const surf = new Float32Array(count * 4);
  const skip = new Uint8Array(rings + 1);
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    curve.getPointAt(t, c);
    skip[i] = hidden?.(c) ? 1 : 0;
    const N = frames.normals[i] as THREE.Vector3;
    const B = frames.binormals[i] as THREE.Vector3;
    for (let j = 0; j <= round; j++) {
      const a = ((j % round) / round) * Math.PI * 2;
      n.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
      const [r, feature, bone] = radius(t * length, a, t);
      p.copy(c).addScaledVector(n, r);
      const f = finish(p, t * length, a, t);
      p.addScaledVector(n, f.out);
      const k = i * (round + 1) + j;
      position[k * 3] = p.x;
      position[k * 3 + 1] = p.y;
      position[k * 3 + 2] = p.z;
      map[k * 4] = j / round;
      map[k * 4 + 1] = t * length;
      map[k * 4 + 2] = 3;
      map[k * 4 + 3] = kind;
      surf[k * 4] = f.coat;
      surf[k * 4 + 1] = feature;
      surf[k * 4 + 2] = f.open;
      surf[k * 4 + 3] = bone;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < rings; i++) {
    if (skip[i] && skip[i + 1]) continue;
    for (let j = 0; j < round; j++) {
      const a = i * (round + 1) + j;
      const b = a + round + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return { geometry: finishGeometry(position, map, surf, index, rings + 1, round + 1), length };
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

// The lava that climbed a thing and froze on it: thick at the crust, thinning upward, ending in drips that hang where the surface faces down.
function lavaCoat(baked: Baked, p: THREE.Vector3, reach: number, seed: number): { coat: number; out: number; above: number } {
  const above = p.y - baked.at(p.x, p.z);
  const drips = Math.pow(noise2(p.x * 4.3 + seed, p.z * 4.3), 2) * 0.9 + 0.25 * noise2(p.x * 13 + seed, p.z * 13 + 5);
  const line = reach * (0.55 + 0.9 * noise2(p.x * 0.8 + seed + 3, p.z * 0.8 + 7)) + 0.22 * drips;
  const coat = smooth(line + 0.1, line - 0.4, above);
  const out = coat * (0.035 + 0.14 * smooth(0.75, 0, above) + 0.05 * drips * smooth(line - 0.5, line, above));
  return { coat, out, above };
}

/** The splits of the hide: where along the body (metres), where round it (radians from the spine), half width and half length in metres, slant, bend. Long, narrow and no two alike. */
const SPLITS: [number, number, number, number, number, number][] = [
  [-0.55, 0.8, 0.085, 1.0, 0.38, 0.09],
  [1.15, 0.52, 0.06, 0.55, -0.8, -0.05],
  [-2.15, 1.05, 0.045, 0.4, 1.35, 0.03],
];
const HIDE_ROUND = 26;
/** Metres round the body for one radian, near enough. */
const GIRTH = 1.87;

export interface HidePoint {
  /** Metres a plate of dried hide stands off the hide under it here. */
  lift: number;
  /** 1 in the open, less under the lifted edge of a plate. */
  shade: number;
  /** 0 where there is no plate, else its tone from tan (0.4) to bone (1). */
  plate: number;
  /** 0 to 1: inside a split. */
  hole: number;
  /** Metres inside the nearest split, negative outside. */
  gap: number;
}

/** The hide at an angle round the body (from the spine) and a place along it, metres. Both the mesh and the map of the plates are made from it. */
export function hideAt(a: number, s: number, sharp: number): HidePoint {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  // The splits first: nothing lies across them.
  let gap = -9;
  const ragged = 0.035 * (noise3(ca * 9, sa * 9, s * 5.1) - 0.5) + 0.014 * (noise3(ca * 31, sa * 31, s * 17) - 0.5);
  for (const [ss, at, w, l, slant, bend] of SPLITS) {
    const du = s - ss;
    const dm = ((a > Math.PI ? a - Math.PI * 2 : a) - at) * GIRTH;
    const cs = Math.cos(slant);
    const sn = Math.sin(slant);
    const along = (dm * cs - du * sn) / l;
    const across = du * cs + dm * sn - bend * Math.sin(along * 2.6 + ss);
    const wide = Math.abs(along) < 1 ? w * Math.pow(1 - along * along, 0.75) * (0.65 + 0.7 * noise2(along * 2.3 + ss * 3, 1.5)) : -0.05 * (Math.abs(along) - 1);
    const e = wide - Math.abs(across) + ragged;
    if (e > gap) gap = e;
  }
  const hole = smooth(0, sharp, gap);
  // The lips of a split curl back and stand off.
  const lip = gap < 0 ? 0.035 * Math.exp(gap / 0.045) : 0.035 * (1 - hole);
  const rim = smooth(-0.04, -0.012, gap) * (1 - hole);

  // The plates: cells of two sizes, each shrunk from its neighbours by its own margin, so none fits the next.
  const wx = 0.9 * (noise3(ca * 2.2 + 5, sa * 2.2, s * 0.55) - 0.5);
  const wy = 0.9 * (noise3(ca * 2.2, sa * 2.2 + 9, s * 0.55 + 3) - 0.5);
  const A = (a / (Math.PI * 2)) * HIDE_ROUND;
  const S = s * 2.25;
  const fineHere = noise3(ca * 1.3 + 2, sa * 1.3, s * 0.5 + 11) > 0.56;
  const k = fineHere ? 2 : 1;
  const cell = cells2(A * k + wx * k, S * k + wy * k, HIDE_ROUND * k);
  const metres = 0.45 / k;
  const id = cell[1];
  const h2 = (id * 57.31) % 1;
  const h4 = (id * 131.7) % 1;
  const h5 = (id * 711.3) % 1;
  // They are left in patches, thicker on the back than low on the flank.
  const patch = smooth(0.3, 0.7, noise3(ca * 0.9 + 7, sa * 0.9 + 1, s * 0.42 + 7));
  const present = id > 0.42 + 0.5 * patch && gap < -0.06;
  const edgeNoise = 0.11 * (noise3(ca * 6.5, sa * 6.5, s * 3.4) - 0.5) + 0.04 * (noise3(ca * 19, sa * 19, s * 10) - 0.5) + 0.014 * (noise3(ca * 47, sa * 47, s * 25) - 0.5);
  const inside = (cell[0] - 0.02 - 0.08 * h2) * metres + edgeNoise;
  let lift = lip;
  let shade = 1;
  let plate = 0.75 * rim;
  if (present) {
    // Each curls most at one edge, as a dried leaf does.
    const way = h4 * Math.PI * 2;
    const toward = Math.max(0, (cell[2] * Math.cos(way) + cell[3] * Math.sin(way)) * 2);
    const curl = 0.015 + 0.1 * h5 * toward * toward;
    if (inside > 0) {
      const on = smooth(0, sharp, inside);
      lift = Math.max(lift, on * (0.02 + 0.02 * h2 + curl * Math.exp(-inside / 0.07) + 0.006 * noise3(ca * 23, sa * 23, s * 12)));
      // The curled edge stands in the light of the sky.
      plate = Math.max(plate, on * Math.min(1, (0.4 + 0.5 * ((id * 37.7) % 1)) * (1 + 4 * curl * Math.exp(-inside / 0.05))));
    } else {
      // The dark line a plate throws under itself, widest on its low side.
      shade = 1 - (0.6 + 4 * curl) * (0.5 + 0.9 * smooth(-0.15, 0.35, a < Math.PI ? cell[2] : -cell[2])) * Math.exp(inside / (0.022 + 0.6 * curl));
    }
  }
  return { lift, shade: Math.max(0.12, shade), plate, hole, gap };
}

/** The map of the plates and splits of the body: across is the way round, up is the way along (in metres, not in rows). */
export function bakeHide(): THREE.DataTexture {
  const w = 2048;
  const h = 1024;
  const data = new Uint8Array(w * h * 4);
  const byte = (v: number): number => Math.min(255, Math.max(0, Math.round(v * 255)));
  for (let j = 0; j < h; j++) {
    const s = ((j + 0.5) / h - 0.5) * 2 * BODY.radii.x;
    for (let i = 0; i < w; i++) {
      const p = hideAt(((i + 0.5) / w) * Math.PI * 2, s, 0.007);
      const k = (j * w + i) * 4;
      data[k] = byte(p.lift / 0.12);
      data[k + 1] = byte(p.shade);
      data[k + 2] = byte(p.plate);
      data[k + 3] = byte(p.hole);
    }
  }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = true;
  t.anisotropy = 2;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** The body: a deep small hull, its hide sunk between the ribs of the frame and split open over them, tilted in the crust. */
export function bodyGeometry(baked: Baked, rows = 360, columns = 300, seenOnly = false): THREE.BufferGeometry {
  // Rows 3 cm apart at the most, so the lips of the splits and the edges of the plates are not stairs.
  const count = (rows + 1) * (columns + 1);
  const position = new Float32Array(count * 3);
  const map = new Float32Array(count * 4);
  const surf = new Float32Array(count * 4);
  const q = new THREE.Quaternion().setFromEuler(BODY.turn);
  const p = new THREE.Vector3();
  const o = new THREE.Vector3();
  const R = BODY.radii;
  for (let i = 0; i <= rows; i++) {
    // The poles lie on the long axis, so the rings are the ribs.
    const v = i / rows;
    const along = -Math.cos(v * Math.PI);
    const ring = Math.sin(v * Math.PI);
    const s = along * R.x;
    for (let j = 0; j <= columns; j++) {
      const a = ((j % columns) / columns) * Math.PI * 2;
      const dy = Math.cos(a);
      const dz = Math.sin(a);
      const ribs = Math.pow(0.5 + 0.5 * Math.cos(s * 8.4 + 1.1 * Math.sin(a * 2 + s) + 2.0 * noise2(s * 0.9, a * 0.7)), 3);
      const flank = smooth(0.15, 0.75, Math.abs(dz));
      const dry = fbm3(along * 2.1 + 3, dy * 1.4, dz * 1.4, 4);
      // A hull deeper than it is wide, the hide sunk between the ribs, a keel of spine along the back.
      let r = 1;
      r -= 0.11 * (1 - ribs) * flank * ring * (0.2 + 1.5 * dry);
      r += 0.03 * ribs * flank * ring;
      // Plates of hide that have dried and lifted at an edge. Only on the flank that is seen: a plate standing off the far
      // side shows over the back as a black hoop.
      const hp = hideAt(a, s, 0.03);
      r += (hp.lift / GIRTH) * smooth(-0.1, 0.3, dz);
      const spine = Math.exp(-Math.pow(Math.min(a, Math.PI * 2 - a) / 0.15, 2));
      r += 0.08 * spine * (0.7 + 0.3 * Math.cos(s * 14));
      r += 0.16 * (dry - 0.47);
      // One side fell in.
      r -= 0.2 * smooth(0.45, 0.8, noise3(along * 1.3 + 7, dy * 1.1 + 2, dz * 1.1)) * ring;
      // The wrinkles of dried hide run round the body, finer than the ribs.
      // No two alike: a regular ripple here turns the grain of the hide into chevrons.
      r += 0.03 * (noise2(s * 8.5 + 3, a * 2.6) - 0.5) * (0.4 + 0.6 * noise2(s * 1.1, a * 1.3 + 7)) * flank;
      // And the hide hangs in long pleats from the spine where the flesh under it has gone.
      // They are cords of several widths, and they wind a little round the body as it twisted when it went down.
      const wind = a + 0.16 * s + 0.1 * Math.sin(s * 1.3 + 0.7);
      const cord = Math.abs(Math.sin(wind * 5 + 2.2 * noise2(s * 0.55 + 5, a * 1.1) + 0.5 * Math.sin(s * 1.7)));
      const pleat = Math.abs(Math.sin(wind * 18 + 2.4 * noise2(s * 0.8 + 5, a * 1.6) + 2.0 * cord));
      r -= (0.1 * Math.pow(1 - cord, 1.6) * (0.3 + 1.4 * dry) + 0.032 * Math.pow(1 - pleat, 2.2) * (0.4 + 1.2 * dry)) * ring;

      // The splits: the hide parted between two ribs, the ribs bare across the gap.
      const hole = smooth(-0.01, 0.05, hp.gap);
      const bar = hole * smooth(0.35, 0.7, ribs);
      r -= 0.15 * hole * (1 - 0.5 * bar) - 0.012 * hole * (noise3(along * 23, dy * 19, dz * 19) - 0.5);

      o.set(0, dy * R.y, dz * R.z * (1 - 0.25 * smooth(0, 1, dy))).multiplyScalar(ring * r);
      p.set(along * R.x * (0.9 + 0.1 * r), o.y, o.z).applyQuaternion(q).add(BODY.centre);
      const lava = lavaCoat(baked, p, 0.24, 11);
      o.normalize().applyQuaternion(q);
      p.addScaledVector(o, lava.out * (1 - hole));
      const k = i * (columns + 1) + j;
      position[k * 3] = p.x;
      position[k * 3 + 1] = p.y;
      position[k * 3 + 2] = p.z;
      map[k * 4] = j / columns;
      map[k * 4 + 1] = v * 5.4;
      map[k * 4 + 2] = 12;
      map[k * 4 + 3] = KIND.body;
      surf[k * 4] = lava.coat * (1 - hole);
      surf[k * 4 + 1] = hole;
      surf[k * 4 + 2] = (0.34 + 0.66 * smooth(-0.1, 0.8, lava.above)) * (1 - 0.72 * hole * (1 - bar)) * (0.75 + 0.25 * smooth(0.0, 0.4, ribs + 1 - flank));
      surf[k * 4 + 3] = bar;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      const a = i * (columns + 1) + j;
      const b = a + columns + 1;
      // The near mesh is only ever seen from the bench side: its far flank, below the back, is left out.
      const round = (j / columns) * Math.PI * 2;
      if (seenOnly && round > Math.PI * 1.08 && round < Math.PI * 2 - 0.7) continue;
      // Nothing is drawn of what lies well under the crust.
      if (position[a * 3 + 1]! < baked.at(position[a * 3]!, position[a * 3 + 2]!) - 0.35 && position[(b + 1) * 3 + 1]! < baked.at(position[(b + 1) * 3]!, position[(b + 1) * 3 + 2]!) - 0.35) continue;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return finishGeometry(position, map, surf, index, rows + 1, columns + 1);
}

export interface LegShape {
  points: P3[];
  /** Part of the length where the knee is, and the hock. */
  knee: number;
  hock: number;
  scale: number;
  seed: number;
  rings: number;
  round: number;
  /** The last part of the length thins to the tendon the pad hangs by. */
  tendon: number;
}

/** A leg dried to tendon and joint: thin shafts, a swollen knee, cords standing out along it, plates of caked hide lifting off it. */
export function legGeometry(shape: LegShape, baked: Baked): Tube {
  const { knee, scale, seed, tendon } = shape;
  return tube(
    shape.points,
    shape.rings,
    shape.round,
    KIND.leg,
    (s, a, t) => {
      // A thigh with a little left on it, then shafts that taper, and a knuckle at the knee and at the hock.
      const head = (d: number, w: number): number => 0.5 * Math.exp(-Math.pow(d / w, 2)) + 0.5 * Math.exp(-Math.abs(d) / (2.2 * w));
      const joint = 0.12 * head(t - knee, 0.022) + 0.1 * head(t - shape.hock, 0.018);
      const shaft = t < knee ? mix(0.2, 0.125, t / knee) : t < shape.hock ? mix(0.105, 0.078, (t - knee) / (shape.hock - knee)) : 0.07;
      const cords = 0.2 * Math.cos(2 * a + s * 0.8 + seed) + 0.12 * Math.cos(3 * a - s * 1.5 + seed * 2) + 0.06 * Math.cos(5 * a + s * 2.3);
      const lumps = 0.4 * (fbm3(s * 1.6 + seed, Math.cos(a) * 0.8, Math.sin(a) * 0.8, 3) - 0.47);
      const thin = tendon > 0 ? smooth(1 - tendon * 0.2, 1 - tendon, t) : 1;
      const end = smooth(0, 0.03, t) * (tendon > 0 ? 1 : smooth(1, 0.985, t));
      const core = scale * end * (0.045 + thin * ((shaft + joint) * (1 + cords * 0.5 + lumps) - 0.045));
      // Flakes of hide caked with ash, long as bark and of two sizes. Each is shrunk from its neighbours by its own margin and
      // lifts from one end, so they read as things peeling off the limb and not as its paving.
      const bend = 0.7 * (noise2(s * 0.8 + seed * 2, Math.cos(a) * 0.9 + 4) - 0.5);
      const fineHere = noise2(s * 0.6 + seed * 5, Math.sin(a + seed) * 0.8 + 2) > 0.55;
      const k = fineHere ? 2 : 1;
      const cell = cells2(((a / (Math.PI * 2)) * 5 + 0.35 * Math.sin(s * 1.7 + seed)) * k, (s * 1.25 + seed + bend) * k, 5 * k);
      const id = cell[1];
      const h2 = (id * 57.31) % 1;
      const h5 = (id * 711.3) % 1;
      // They went in patches: whole stretches of the limb are bare, with a flake or two left on them.
      const bare = 0.1 + 0.62 * smooth(0.36, 0.6, noise2(s * 0.75 + seed * 3, Math.cos(a + seed) * 1.1 + 1.5)) + 0.2 * Math.exp(-Math.pow((t - knee) / 0.05, 2));
      const inside = (cell[0] - 0.04 - 0.13 * h2) / k + 0.04 * (noise2(a * 9 + seed, s * 14) - 0.5) + 0.015 * (noise2(a * 23, s * 37 + seed) - 0.5);
      const plate = id > bare ? smooth(0, 0.02, inside) * thin : 0;
      const toward = Math.min(1, Math.max(0, 0.5 + (h5 > 0.5 ? 1 : -1) * cell[3] * 1.3));
      const lift = plate * (0.018 + 0.085 * h2 * h5 * 2 * toward * toward + 0.015 * noise2(a * 5 + seed, s * 9));
      // Sinew shows pale along the cords where the hide is gone.
      const bone = (1 - plate) * smooth(-0.1, 0.25, cords) * thin + (1 - thin) * 0.6;
      return [core + scale * lift, plate, bone];
    },
    (p, s, a, t) => {
      const lava = lavaCoat(baked, p, t > 0.5 ? 0.5 : 0.55, seed * 7);
      const recess = 0.72 + 0.28 * smooth(-0.1, 0.25, Math.cos(2 * a + s * 0.8 + seed));
      return { out: lava.out * 1.2, coat: lava.coat, feature: 0, bone: 0, open: (0.36 + 0.64 * smooth(-0.1, 0.9, lava.above)) * recess };
    },
    (c) => c.y < baked.at(c.x, c.z) - 0.55,
  );
}

/** The pad of the second leg: a broad flat foot dried to a curled leaf, hanging from the wrist by its tendon. The rags of hide that hang under the arch are the same leaf, smaller and narrower. */
export function padGeometry(at: P3 = [WRIST_B[0] + 0.01, WRIST_B[1] + 0.04, WRIST_B[2]], size = 1, narrow = 1, yaw = 0.55, rows = 64, columns = 84): THREE.BufferGeometry {
  const count = (rows + 1) * (columns + 1);
  const position = new Float32Array(count * 3);
  const map = new Float32Array(count * 4);
  const surf = new Float32Array(count * 4);
  const p = new THREE.Vector3();
  const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.16, yaw, 0.12));
  const top = new THREE.Vector3(at[0], at[1], at[2]);
  for (let i = 0; i <= rows; i++) {
    const v = i / rows;
    // The pole at v = 0 is where the tendon holds it; the pad hangs down from there.
    const down = 0.5 - 0.5 * Math.cos(v * Math.PI);
    const ring = Math.sin(v * Math.PI);
    for (let j = 0; j <= columns; j++) {
      const a = ((j % columns) / columns) * Math.PI * 2;
      const side = Math.cos(a);
      const face = Math.sin(a);
      // A leaf: narrow at the wrist, broad below, four blunt toes at the lower edge.
      const broad = 0.06 + 0.6 * Math.pow(smooth(0.02, 0.62, down), 0.8) * (1 - 0.3 * smooth(0.8, 1, down));
      const toes = 1 + 0.1 * smooth(0.6, 1, down) * Math.cos(side * 6.5 + 0.7);
      const x = side * ring * broad * toes * narrow;
      const wrinkle = 0.022 * Math.sin(x * 34 + 3 * noise2(down * 5, side * 3)) * smooth(0.1, 0.5, down);
      const thick = (0.035 + 0.03 * (1 - down)) * (0.7 + 0.6 * noise2(x * 6 + 2, down * 7));
      // The edges curl toward one face as it dried, and the whole pad cups.
      const curl = 0.22 * Math.pow(Math.abs(side) * ring, 2.2) * smooth(0.15, 0.7, down) + 0.1 * Math.sin(down * 2.6) * down;
      p.set(x, -down * 1.12, face * ring * thick + curl + wrinkle);
      p.multiplyScalar(size).applyQuaternion(turn).add(top);
      const k = i * (columns + 1) + j;
      position[k * 3] = p.x;
      position[k * 3 + 1] = p.y;
      position[k * 3 + 2] = p.z;
      map[k * 4] = j / columns;
      map[k * 4 + 1] = v * 1.6;
      map[k * 4 + 2] = 2;
      map[k * 4 + 3] = KIND.pad;
      surf[k * 4] = 0;
      surf[k * 4 + 1] = smooth(0.35, 0.65, noise2(x * 5 + 9, down * 6));
      surf[k * 4 + 2] = 0.55 + 0.45 * smooth(-0.3, 0.6, face) * (1 - 0.5 * smooth(0.1, 0.4, curl));
      surf[k * 4 + 3] = 0.35 * smooth(0.12, 0.0, down);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      const a = i * (columns + 1) + j;
      const b = a + columns + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return finishGeometry(position, map, surf, index, rows + 1, columns + 1);
}
