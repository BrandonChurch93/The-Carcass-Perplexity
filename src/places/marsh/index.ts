// Origin: the centre of the bubbling seep pool. North is -z (the top of the layout sketch, towards the far flats), east is +x. The basin is 18 km across with the escarpment 6 km out.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createBlockout, herd, terrain } from '../../core/blockout';
import { through, type CameraPath, type Pose, type Vec3 } from '../../core/cameras';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { stream } from '../../core/rng';
import { neutralLook } from '../../core/stage';
import { cut, eventSeconds, keyPart, secondsInPlace, shotById } from '../../film/cut';

const UNIT = 'marsh';
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const C = {
  skyTop: 0xb6b4b8,
  skyHorizon: 0xe4e1e0,
  air: 0xd9d5d4,
  salt: 0xdcd4cf,
  saltDark: 0xc6b6b0,
  apron: 0xb58f84,
  saltEdge: 0xe7e1dd,
  rust: 0x9a5a4c,
  crust: 0xaaa49f,
  crustDark: 0x9c9691,
  rock: 0xa89d92,
  rockBand: 0x8e8479,
  scarp: 0x6c686e,
  scarpBand: 0x5f5b61,
  vein: 0x7c2a27,
  veinLight: 0x96443e,
  pool: 0x6c1d1e,
  poolLight: 0x8a3431,
  dome: 0xb5665f,
  spray: 0xc4827a,
  steam: 0xe6e1df,
  rain: 0x86888f,
  stem: 0xd5c8b6,
  fan: 0xa3283b,
  hide: 0x8b7667,
  dead: 0xe9e5df,
  insect: 0x4b3a36,
  flier: 0x6f6a6c,
};

const BEARING = 52 * DEG;
const F: [number, number] = [Math.sin(BEARING), -Math.cos(BEARING)];
const R: [number, number] = [Math.cos(BEARING), Math.sin(BEARING)];
const POOL_D = 31;
const POOL_L = -14;
const POOL_R = 9.5;
const EYE: [number, number] = [-(F[0] * POOL_D + R[0] * POOL_L), -(F[1] * POOL_D + R[1] * POOL_L)];
const EYE_HEIGHT = 8.5;

const rel = (d: number, l: number): [number, number] => [EYE[0] + F[0] * d + R[0] * l, EYE[1] + F[1] * d + R[1] * l];
const at = (d: number, l: number, y: number): Vec3 => {
  const p = rel(d, l);
  return [p[0], y, p[1]];
};
const yawOf = (dx: number, dz: number): number => Math.atan2(-dz, dx);
const relYaw = (dd: number, dl: number): number => yawOf(F[0] * dd + R[0] * dl, F[1] * dd + R[1] * dl);
const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const fract = (v: number): number => v - Math.floor(v);
const bearingDir = (deg: number): [number, number] => [Math.sin(deg * DEG), -Math.cos(deg * DEG)];

const keyTime = (key: string): number => secondsInPlace(UNIT, cut.keyFrames[key] as number);
const BURST = eventSeconds(UNIT, 'burst') ?? 9;
const SMALL_BURST = keyTime('marsh-1') - 0.22;
const WALLOW_TIME = keyTime('marsh-3');

const rockHeight = (x: number, z: number): number => {
  const dx = x - EYE[0];
  const dz = z - EYE[1];
  const d = dx * F[0] + dz * F[1];
  const l = dx * R[0] + dz * R[1];
  const u = ((d + 6 + 0.32 * l) / 13) ** 2 + ((l + 12.6) / 19) ** 2 + (l < -1.5 ? 0.07 * Math.sin(l * 1.3 + d * 0.5) + 0.05 * Math.sin(l * 2.9 - d * 1.7) : 0);
  const s = smooth(0.74, 1.08, u);
  const lump = 0.5 * Math.sin(d * 0.45 + 1) * Math.cos(l * 0.38) + 0.28 * Math.sin(d * 1.1 + l * 0.9);
  return (6.9 + lump) * (1 - s) - 0.6 * s;
};

type Node = [number, number, number];
const relNodes = (nodes: Node[]): Node[] =>
  nodes.map((n) => {
    const p = rel(n[0], n[1]);
    return [p[0], p[1], n[2]];
  });

const VEIN: Node[] = relNodes([
  [-60, 44, 11], [-40, 30, 11], [-20, 16, 11], [-6, 10, 11], [6, 5.5, 11], [12.5, 1.6, 10.6], [17.5, -2, 8.6], [24.5, 1.2, 7.6],
  [33.5, 7, 7], [43.5, 11.5, 6], [57, 16.6, 5], [85, 33, 4.2], [131, 66, 3.8], [200, 110, 3.5], [330, 180, 3.2],
  [600, 330, 3], [1100, 560, 3], [2000, 900, 3], [3600, 1500, 3],
]);

const CREEKS: Node[][] = [
  relNodes([[43.5, 11.5, 2.6], [54, 7.5, 2.4], [68, 2.5, 2.8], [85, -7, 2.5], [110, -13, 2.2], [150, -30, 2], [220, -42, 1.6], [330, -90, 1.2]]),
  relNodes([[85, 33, 2.4], [99, 46, 2.2], [118, 70, 2], [134, 110, 1.8], [140, 170, 1.8], [170, 260, 1.4]]),
  relNodes([[131, 66, 2.2], [160, 61, 2], [200, 50, 2], [262, 55, 2.2], [340, 28, 1.8], [470, 40, 1.4]]),
  relNodes([[57, 16.6, 2], [59, 24, 1.8], [58, 31, 1.8]]),
  relNodes([[200, 110, 2], [230, 150, 1.8], [300, 190, 2], [380, 270, 1.6]]),
];

const CRUST: [number, number][] = [
  [8, 13.5], [13, 8.6], [17.5, 3.6], [21, 4.4], [25, 6.4], [29, 9.6], [34, 12.2], [40, 14.6], [50, 18.5], [64, 26], [80, 46], [75, 76], [45, 86], [15, 70], [-5, 40], [0, 23],
];

const STUCK: [number, number] = [27.4, 14.7];

interface Pool {
  x: number;
  z: number;
  r: number;
}

interface Stalk {
  x: number;
  z: number;
  h: number;
  lean: number;
  yaw: number;
  kind: number;
  size: number;
  phase: number;
}

interface Beast {
  d: number;
  l: number;
  head: [number, number];
  size: number;
  sink: number;
  speed: number;
  root: number;
}

const BEASTS: Beast[] = [
  { d: 34.3, l: 3, head: [0, -1], size: 1, sink: 0.05, speed: 0.22, root: 0.07 },
  { d: 33, l: 5, head: [-0.3, -0.95], size: 0.34, sink: 0.1, speed: 0.1, root: 0.09 },
  { d: 32.3, l: 3.4, head: [-0.2, -1], size: 0.62, sink: 1.0, speed: 0.12, root: 0.03 },
  { d: 44, l: 7.9, head: [0.3, 1], size: 1.05, sink: 0.45, speed: 0.15, root: 0.04 },
  { d: 29.4, l: 6.4, head: [0.8, 0.5], size: 0.5, sink: 0.4, speed: 0.2, root: 0.06 },
  { d: 18.6, l: -3.4, head: [0.9, 0.3], size: 1, sink: 0.95, speed: 0.1, root: 0.03 },
  { d: 38.4, l: 9.6, head: [1, 0.5], size: 0.9, sink: 0.7, speed: 0.18, root: 0.05 },
  { d: 52, l: 14.6, head: [-1, -0.4], size: 1, sink: 0.8, speed: 0.14, root: 0.04 },
  { d: 48.5, l: 14.6, head: [0.2, -1], size: 0.85, sink: 0.6, speed: 0.1, root: 0.06 },
  { d: 41.5, l: 10.4, head: [-0.7, 0.6], size: 0.95, sink: 0.85, speed: 0.12, root: 0.04 },
  { d: 23.3, l: 0.6, head: [1, 0.2], size: 1, sink: 0.95, speed: 0.08, root: 0.03 },
];

const DEAD: { d: number; l: number; size: number; yaw: number; limbs: boolean }[] = [
  { d: 24.4, l: 11.7, size: 1, yaw: 0.5, limbs: true },
  { d: 19.8, l: 8.6, size: 1.1, yaw: 2.1, limbs: true },
  { d: 21.3, l: 6.4, size: 0.8, yaw: 1.2, limbs: false },
  { d: 24.64, l: 16.7, size: 0.8, yaw: 0.2, limbs: false },
  { d: 32.1, l: 12, size: 1.1, yaw: 2.6, limbs: false },
  { d: 31, l: 19.8, size: 1.35, yaw: 1.7, limbs: false },
];

const K0: Pose = { position: at(0, 0, EYE_HEIGHT), aim: at(60, 0, EYE_HEIGHT - 60 * Math.tan(12.7 * DEG)), fov: 44 };

const K2_DIR = bearingDir(22);
const K2_RIGHT: [number, number] = [-K2_DIR[1], K2_DIR[0]];
const K2_AT: [number, number] = [-8.84, 8.84];
const K2: Pose = {
  position: [K2_AT[0], 2.7, K2_AT[1]],
  aim: [K2_AT[0] + K2_DIR[0] * 20, 2.7 - 20 * Math.tan(7.6 * DEG), K2_AT[1] + K2_DIR[1] * 20],
  fov: 30,
};

const K1_DIR = bearingDir(6);
const K1_AT: [number, number] = [0.9, 11.1];
const K1: Pose = {
  position: [K1_AT[0], 0.95, K1_AT[1]],
  aim: [K1_AT[0] + K1_DIR[0] * 10, 0.95 - 10 * Math.tan(8.9 * DEG), K1_AT[1] + K1_DIR[1] * 10],
  fov: 35,
};
const HERO_DOME: [number, number] = [K1_AT[0] + bearingDir(17.5)[0] * 5, K1_AT[1] + bearingDir(17.5)[1] * 5];
const SMALL_DOME: [number, number] = [K1_AT[0] + bearingDir(-5.4)[0] * 4.5, K1_AT[1] + bearingDir(-5.4)[1] * 4.5];

const K3: Pose = { position: at(27.7, 3, 2.3), aim: at(37.7, 3.2, -0.12), fov: 30 };
const K4: Pose = { position: at(24.6, 19.6, 1.5), aim: at(27.6, 10.07, -0.39), fov: 35 };

const shots: Record<string, CameraPath> = {
  'marsh-01': through(K0, keyPart(shotById('marsh-01')), { forward: -9, up: 1.2 }, { forward: 12, up: 0.6 }),
  'marsh-02': through(K2, keyPart(shotById('marsh-02')), { right: -3.2, forward: -0.6 }, { right: 3.2, forward: 0.8 }),
  'marsh-03': through(K1, keyPart(shotById('marsh-03')), { forward: -2.2, up: 0.2, right: 0.6 }, { forward: 0.4, up: 0.45, turn: 8, tilt: 3 }),
  'marsh-04': [
    { at: 0, pose: { position: at(26.7, 6.6, 2.7), aim: at(36.4, 4.6, -0.1), fov: 30 } },
    { at: Math.min(0.98, Math.max(0.02, keyPart(shotById('marsh-04')))), pose: K3 },
    { at: 1, pose: { position: at(28.9, 0.7, 2.05), aim: at(38.4, 2.2, -0.1), fov: 30 } },
  ],
  'marsh-05': through(K4, keyPart(shotById('marsh-05')), { forward: -12, up: -0.6, right: -1.5 }, { forward: 1.7, up: 0.15, right: 0.5 }),
};

function ribbon(nodes: Node[], y: number, extra: number, per = 6): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(nodes.map((n) => new THREE.Vector3(n[0], 0, n[1])), false, 'centripetal');
  const count = (nodes.length - 1) * per;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const p = curve.getPoint(t);
    const tan = curve.getTangent(t);
    const k = t * (nodes.length - 1);
    const a = Math.min(nodes.length - 2, Math.floor(k));
    const wa = (nodes[a] as Node)[2];
    const wb = (nodes[a + 1] as Node)[2];
    const w = (wa + (wb - wa) * (k - a) + extra) / 2;
    const lift = y + 0.0006 * Math.hypot(p.x, p.z);
    pos.push(p.x - tan.z * w, lift, p.z + tan.x * w, p.x + tan.z * w, lift, p.z - tan.x * w);
    if (i < count) {
      const b = i * 2;
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

function blob(points: [number, number][], y: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], 0)), true, 'centripetal');
  const shape = new THREE.Shape(curve.getPoints(points.length * 6).map((p) => new THREE.Vector2(p.x, p.y)));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

function scarpRing(): THREE.BufferGeometry {
  const seg = 160;
  const radii = [5100, 5650, 5950, 6250, 7200, 12500];
  const lift = [-3, 25, 130, 215, 250, 300];
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * TAU;
    const tall = 0.8 + 0.3 * Math.sin(a * 3 + 1.2) + 0.16 * Math.sin(a * 7 + 2.1) + 0.08 * Math.sin(a * 13 + 0.4);
    const wob = 1 + 0.035 * Math.sin(a * 5 + 0.5) + 0.02 * Math.sin(a * 11 + 1.7);
    for (let j = 0; j < radii.length; j++) {
      const r = (radii[j] as number) * wob;
      pos.push(Math.sin(a) * r, (lift[j] as number) * (j === 0 ? 1 : tall), -Math.cos(a) * r);
    }
    if (i < seg) {
      for (let j = 0; j < radii.length - 1; j++) {
        const b = i * radii.length + j;
        const c = b + radii.length;
        idx.push(b, c, b + 1, b + 1, c, c + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

function beastGeometry(): THREE.BufferGeometry {
  const body = new THREE.CapsuleGeometry(0.78, 2.1, 3, 10).rotateZ(Math.PI / 2).translate(-0.1, 1.08, 0);
  const hump = new THREE.SphereGeometry(0.9, 10, 6).scale(1.2, 0.8, 0.95).translate(0.5, 1.25, 0);
  const head = new THREE.SphereGeometry(0.62, 10, 6).scale(1.25, 0.9, 0.9).translate(1.75, 0.78, 0);
  const feelers = new THREE.ConeGeometry(0.36, 0.6, 7).rotateX(Math.PI).translate(2.3, 0.32, 0);
  const legs = [
    [1.0, 0.55],
    [1.0, -0.55],
    [-1.0, 0.55],
    [-1.0, -0.55],
  ].map((p) => new THREE.CylinderGeometry(0.27, 0.3, 0.8, 7).translate(p[0] as number, 0.4, p[1] as number));
  return mergeGeometries([body, hump, head, feelers, ...legs]);
}

function limbGeometry(): THREE.BufferGeometry {
  const sticks: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = -0.9 + i * 0.3;
    const stick = new THREE.CylinderGeometry(0.045, 0.06, 1.1, 5).translate(0, 0.45, 0).rotateX(0.75 + 0.1 * Math.sin(i * 2.3)).rotateY(a);
    stick.translate(Math.sin(a) * 0.5 + (i - 3) * 0.28, 0.25, Math.cos(a) * 0.75);
    sticks.push(stick);
  }
  return mergeGeometries(sticks);
}

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const EU = new THREE.Euler();
const P = new THREE.Vector3();
const S = new THREE.Vector3();

function put(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, yaw: number, pitch: number, sx: number, sy = sx, sz = sx): void {
  EU.set(0, yaw, pitch, 'YXZ');
  Q.setFromEuler(EU);
  M.compose(P.set(x, y, z), Q, S.set(sx, sy, sz));
  mesh.setMatrixAt(i, M);
}

function lay<T extends THREE.Material>(material: T, level: number): T {
  material.polygonOffset = true;
  material.polygonOffsetFactor = -level;
  material.polygonOffsetUnits = -level * 2;
  return material;
}

function distToSegment(x: number, z: number, a: [number, number], b: [number, number]): number {
  const vx = b[0] - a[0];
  const vz = b[1] - a[1];
  const t = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1));
  return Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t);
}

function makePools(): Pool[] {
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

function makeStalks(pools: Pool[]): Stalk[] {
  const rng = stream('marsh-stalks');
  const out: Stalk[] = [];
  const keepOut: { a: [number, number]; b: [number, number]; r: number }[] = [
    { a: [K2_AT[0] - K2_RIGHT[0] * 4.2 - K2_DIR[0], K2_AT[1] - K2_RIGHT[1] * 4.2 - K2_DIR[1]], b: [K2_AT[0] + K2_RIGHT[0] * 4.2 + K2_DIR[0], K2_AT[1] + K2_RIGHT[1] * 4.2 + K2_DIR[1]], r: 2.6 },
    { a: [K1_AT[0] - K1_DIR[0] * 3.5, K1_AT[1] - K1_DIR[1] * 3.5], b: [K1_AT[0] + K1_DIR[0] * 4, K1_AT[1] + K1_DIR[1] * 4], r: 1.5 },
    { a: [K1_AT[0], K1_AT[1]], b: [K1_AT[0] + K1_DIR[0] * 2, K1_AT[1] + K1_DIR[1] * 2], r: 2.6 },
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
  near(2.8, -1.5, 3.4, 0.05, 1);
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

function create(): Place {
  const parts = new Parts(UNIT);
  const kit = createBlockout(parts);
  const scene = new THREE.Scene();
  const part = (name: string): THREE.Group => scene.add(parts.standIn(name, new THREE.Group())).children.at(-1) as THREE.Group;

  scene.add(parts.standIn('sky', kit.sky(C.skyTop, C.skyHorizon, C.air)));
  kit.air(C.air, 0.00042);

  const pools = makePools();
  const stalks = makeStalks(pools);
  const rng = stream('marsh-scatter');

  const land = part('land');
  const saltMat = kit.flow(C.salt, C.saltDark, { speed: 0, scale: 6 });
  land.add(new THREE.Mesh(terrain(18000, 18000, 120, 120, () => 0), saltMat));
  land.add(new THREE.Mesh(scarpRing(), kit.flat(C.scarp, { band: C.scarpBand, step: 45, side: THREE.DoubleSide })));
  const rockMat = kit.flat(C.rock, { band: C.rockBand, step: 1.1 });
  const rockCentre = rel(-6, -12.6);
  land.add(new THREE.Mesh(terrain(64, 64, 80, 80, rockHeight, rockCentre), rockMat));
  const hummockMat = kit.flat(C.rock, { band: C.rockBand, step: 1.4 });
  const rustMat = lay(kit.flat(C.rust, { side: THREE.DoubleSide }), 2);
  const edgeMat = lay(kit.flat(C.saltEdge, { side: THREE.DoubleSide }), 1);
  const hummocks: [number, number, number, number, number, number][] = [
    [...rel(117, -40), 11, 8, 5.5, 0.4],
    [...rel(95, 27), 7.5, 5, 2.8, 1.2],
    [...rel(240, -150), 22, 15, 8, 0.2],
    [...rel(-40, -60), 14, 9, 4, 2],
  ];
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, TAU);
    const r = 320 + 3200 * rng.next();
    const w = rng.range(14, 70);
    hummocks.push([Math.sin(a) * r, -Math.cos(a) * r, w, w * rng.range(0.5, 0.9), w * rng.range(0.16, 0.3), rng.range(0, Math.PI)]);
  }
  const mound = new THREE.SphereGeometry(1, 20, 10);
  const disc = new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2);
  const hummockMesh = herd(mound, hummockMat, hummocks.length);
  const hummockSkirt = herd(disc, rustMat, hummocks.length);
  hummocks.forEach((h, i) => {
    put(hummockMesh, i, h[0], -h[4] * 0.12, h[1], h[5], 0, h[2], h[4], h[3]);
    put(hummockSkirt, i, h[0], 0.03 + 0.0006 * Math.hypot(h[0], h[1]), h[1], h[5], 0, h[2] * 1.14, 1, h[3] * 1.18);
  });
  land.add(hummockMesh, hummockSkirt);
  land.add(new THREE.Mesh(blob([[6, -5], [11, -8.5], [18, -12], [24, -9.5], [29, -5.4], [30, -1], [24, -2.4], [18, -5.6], [12, -3.4]].map((p) => rel(p[0] as number, p[1] as number)), 0.02), lay(kit.flat(C.apron, { side: THREE.DoubleSide }), 1)));
  land.add(new THREE.Mesh(ribbon(VEIN, 0.02, 1.7), edgeMat));
  land.add(new THREE.Mesh(ribbon(VEIN, 0.03, 1.1), rustMat));
  for (const creek of CREEKS) land.add(new THREE.Mesh(ribbon(creek, 0.03, 0.8), rustMat));
  const rimMat = kit.flat(C.saltEdge, { band: C.salt, step: 0.16 });
  const rims = herd(new THREE.TorusGeometry(1, 0.075, 5, 30).rotateX(Math.PI / 2), rimMat, pools.length + 1);
  const poolSkirt = herd(disc, rustMat, pools.length + 1);
  put(rims, 0, 0, 0, 0, 0, 0, POOL_R * 1.045, POOL_R * 0.42, POOL_R * 1.045);
  put(poolSkirt, 0, 0, 0.035, 0, 0, 0, POOL_R + 0.2);
  pools.forEach((p, i) => {
    put(rims, i + 1, p.x, 0, p.z, 0, 0, p.r * 1.05, p.r * 0.45, p.r * 1.05);
    put(poolSkirt, i + 1, p.x, 0.035 + 0.0006 * Math.hypot(p.x, p.z), p.z, 0, 0, p.r + 0.2);
  });
  land.add(rims, poolSkirt);

  const crust = part('crust');
  const crustMat = lay(kit.flow(C.crust, C.crustDark, { speed: 0, scale: 1.6, side: THREE.DoubleSide }), 1);
  crust.add(new THREE.Mesh(blob(CRUST.map((p) => rel(p[0], p[1])), 0.025), crustMat));
  const farCrust = herd(disc, crustMat, 30);
  for (let i = 0; i < 30; i++) {
    const a = rng.range(0, TAU);
    const r = 160 + 1800 * rng.next();
    const w = rng.range(20, 90);
    put(farCrust, i, Math.sin(a) * r, 0.02 + 0.0005 * r, -Math.cos(a) * r, rng.range(0, 3), 0, w, 1, w * rng.range(0.4, 0.8));
  }
  crust.add(farCrust);

  const brine = part('brine');
  const veinMat = lay(kit.flow(C.vein, C.veinLight, { direction: [-F[0], -F[1]], speed: 0.45, scale: 0.6, side: THREE.DoubleSide }), 4);
  brine.add(new THREE.Mesh(ribbon(VEIN, 0.05, 0), veinMat));
  for (const creek of CREEKS) brine.add(new THREE.Mesh(ribbon(creek, 0.05, 0), veinMat));
  const creekRng = stream('marsh-creeks');
  for (let i = 0; i < 16; i++) {
    const a = creekRng.range(0, TAU);
    const r = 220 + 1500 * creekRng.next();
    let x = Math.sin(a) * r;
    let z = -Math.cos(a) * r;
    let heading = creekRng.range(0, TAU);
    const w = creekRng.range(2, 4.5);
    const nodes: Node[] = [];
    for (let k = 0; k < 9; k++) {
      nodes.push([x, z, w * (1 - k * 0.08)]);
      heading += creekRng.normal() * 0.5;
      const step = creekRng.range(60, 150);
      x += Math.sin(heading) * step;
      z -= Math.cos(heading) * step;
    }
    brine.add(new THREE.Mesh(ribbon(nodes, 0.06, 0), veinMat));
    land.add(new THREE.Mesh(ribbon(nodes, 0.04, 1.6), rustMat));
  }
  const poolMat = lay(kit.flow(C.pool, C.poolLight, { direction: [0.6, 0.8], speed: 0.12, scale: 0.55 }), 4);
  const mainPool = new THREE.Mesh(new THREE.CircleGeometry(POOL_R, 48).rotateX(-Math.PI / 2), poolMat);
  mainPool.position.y = 0.06;
  brine.add(mainPool);
  const farPools = herd(disc, lay(kit.flow(C.pool, C.poolLight, { direction: [0.6, 0.8], speed: 0.1, scale: 0.9 }), 4), pools.length);
  pools.forEach((p, i) => put(farPools, i, p.x, 0.06 + 0.0006 * Math.hypot(p.x, p.z), p.z, 0, 0, p.r));
  brine.add(farPools);

  const rain = part('rain');
  const rainMat = kit.flat(C.rain);
  const rainRng = stream('marsh-rain');
  const streaks = new THREE.Group();
  for (let i = 0; i < 46; i++) {
    const b = (50 + 36 * (i / 45) + rainRng.range(-0.3, 0.3)) * DEG;
    const r = 4300 + rainRng.range(-250, 250);
    const tall = rainRng.range(650, 1100);
    const streak = new THREE.Mesh(new THREE.BoxGeometry(rainRng.range(22, 60), tall, 8), rainMat);
    streak.position.set(Math.sin(b) * r, tall / 2 + rainRng.range(0, 60), -Math.cos(b) * r);
    streak.rotation.set(0, -b, 0.05);
    streaks.add(streak);
  }
  rain.add(streaks);

  const steam = part('steam');
  const steamMat = kit.flat(C.steam);
  const puffs = herd(new THREE.SphereGeometry(1, 10, 6), steamMat, 14);
  steam.add(puffs);
  const puffSeed = Array.from({ length: 14 }, () => ({ a: rng.range(0, TAU), r: rng.range(0, 3), period: rng.range(7, 12), phase: rng.next(), size: rng.range(0.6, 1.1) }));
  const steamAt = bearingDir(300);

  const stalkPart = part('stalks');
  const stemMat = kit.flat(C.stem, { band: 0xc0b09c, step: 0.5 });
  const fanMat = kit.flat(C.fan, { band: 0x8a1f30, step: 0.22 });
  const stems = herd(new THREE.CylinderGeometry(0.72, 1, 1, 6).translate(0, 0.5, 0), stemMat, stalks.length);
  const fans = herd(new THREE.ConeGeometry(1, 1.6, 8).rotateX(Math.PI).translate(0, 0.25, 0), fanMat, stalks.length);
  stalks.forEach((s, i) => {
    const thick = (s.h > 2.6 ? 0.09 : 0.07) * s.size;
    put(stems, i, s.x, -0.05, s.z, s.yaw, -s.lean, thick, s.h + 0.05, thick);
  });
  stalkPart.add(stems, fans);

  const insectPart = part('insects');
  const insects = herd(new THREE.BoxGeometry(0.036, 0.012, 0.02), kit.flat(C.insect), 90);
  insectPart.add(insects);
  const stuckAt = rel(STUCK[0], STUCK[1]);
  const swarm = Array.from({ length: 90 }, (_, i) => {
    const home: Vec3 =
      i < 46
        ? [K2_AT[0] + K2_DIR[0] * rng.range(1.7, 3.6) + K2_RIGHT[0] * rng.range(-0.9, 1.3), rng.range(2.5, 3.5), K2_AT[1] + K2_DIR[1] * rng.range(1.7, 3.6) + K2_RIGHT[1] * rng.range(-0.9, 1.3)]
        : i < 70
          ? [stuckAt[0] + rng.range(-2.5, 2.5), rng.range(0.7, 2), stuckAt[1] + rng.range(-2.5, 2.5)]
          : [rng.range(-6, 6), rng.range(0.4, 1.6), rng.range(-6, 9)];
    return { home, w: [rng.range(1.2, 3.2), rng.range(1.5, 3.6), rng.range(1.1, 3)], p: [rng.range(0, TAU), rng.range(0, TAU), rng.range(0, TAU)], reach: rng.range(0.25, 0.8) };
  });

  const wallowers = part('wallowers');
  const hideMat = kit.flat(C.hide, { band: 0x7a5648, step: 0.7 });
  const beastGeo = beastGeometry();
  const beasts = herd(beastGeo, hideMat, BEASTS.length + 2);
  wallowers.add(beasts);

  const dead = part('dead');
  const deadMat = kit.flat(C.dead, { band: 0xd6d0c8, step: 0.3 });
  const mounds = herd(new THREE.SphereGeometry(1, 10, 6), deadMat, DEAD.length);
  const limbCount = DEAD.filter((d) => d.limbs).length;
  const limbs = herd(limbGeometry(), kit.flat(0xd9c9b4), limbCount);
  let limbIndex = 0;
  DEAD.forEach((d, i) => {
    const p = rel(d.d, d.l);
    put(mounds, i, p[0], 0.1, p[1], d.yaw, 0, 1.75 * d.size, 0.8 * d.size, 1.05 * d.size);
    if (d.limbs) put(limbs, limbIndex++, p[0], 0, p[1], d.yaw, 0, d.size);
  });
  dead.add(mounds, limbs);

  const domes = part('domes');
  const domeMat = kit.flat(C.dome, { band: 0xc98078, step: 0.18 });
  const ringMat = lay(kit.flat(C.poolLight, { side: THREE.DoubleSide }), 6);
  const domeSeed: { x: number; z: number; size: number; period: number; phase: number }[] = [
    { x: HERO_DOME[0], z: HERO_DOME[1], size: 0.66, period: 0, phase: 0 },
    { x: SMALL_DOME[0], z: SMALL_DOME[1], size: 0.42, period: 0, phase: 0 },
    { x: K1_AT[0] - 0.95, z: K1_AT[1] - 3.3, size: 0.17, period: 5.5, phase: 0.2 },
    { x: K1_AT[0] - 0.5, z: K1_AT[1] - 3.05, size: 0.11, period: 4.1, phase: 0.6 },
    { x: K1_AT[0] - 1.4, z: K1_AT[1] - 3.7, size: 0.13, period: 6.3, phase: 0.45 },
  ];
  for (let i = 0; i < 9; i++) {
    const a = rng.range(0, TAU);
    const r = rng.range(0.5, 6.5);
    domeSeed.push({ x: Math.sin(a) * r - 1.5, z: Math.cos(a) * r - 1, size: rng.range(0.25, 0.5), period: rng.range(3.2, 6.5), phase: rng.next() });
  }
  const domeMesh = herd(new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, Math.PI / 2), domeMat, domeSeed.length);
  const ringMesh = herd(new THREE.RingGeometry(0.86, 1, 36).rotateX(-Math.PI / 2), ringMat, domeSeed.length * 2);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.8, 1, 12, 1, true).translate(0, 0.5, 0), kit.flat(C.spray, { side: THREE.DoubleSide }));
  crown.position.set(SMALL_DOME[0], 0.06, SMALL_DOME[1]);
  domes.add(domeMesh, ringMesh, crown);

  const burst = part('burst');
  const sprayMat = kit.flat(C.spray, { side: THREE.DoubleSide });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.75, 1, 12).translate(0, 0.5, 0), kit.flat(C.dome, { band: C.spray, step: 0.5 }));
  const bigCrown = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.8, 1, 16, 1, true).translate(0, 0.5, 0), sprayMat);
  const bigRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2), lay(kit.flat(C.spray, { side: THREE.DoubleSide }), 7));
  const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), steamMat);
  const drops = herd(new THREE.SphereGeometry(1, 6, 4), sprayMat, 70);
  const secondRing = new THREE.Mesh(bigRing.geometry, bigRing.material);
  for (const o of [column, bigCrown, bigRing, secondRing, cloud]) o.position.set(HERO_DOME[0], 0.06, HERO_DOME[1]);
  burst.add(column, bigCrown, bigRing, secondRing, cloud, drops);
  const dropSeed = Array.from({ length: 70 }, (_, i) => {
    const a = rng.range(0, TAU);
    const out = rng.range(0.4, 2.2);
    const puff = i % 6 === 0;
    const lift = rng.next();
    const big = rng.next();
    return { vx: Math.sin(a) * out, vz: Math.cos(a) * out, vy: puff ? 2.6 + 1.6 * lift : 3.2 + 4.2 * lift, size: puff ? 0.16 + 0.1 * big : 0.04 + 0.07 * big, tall: puff ? 1 : 1.8, delay: rng.range(0, 0.4) };
  });

  const fliers = part('fliers');
  const flock = herd(new THREE.ConeGeometry(0.5, 1.6, 4).rotateZ(-Math.PI / 2), kit.flat(C.flier), 16);
  fliers.add(flock);
  const flockSeed = Array.from({ length: 16 }, () => ({ d: rng.range(-35, 35), l: rng.range(-40, 40), y: rng.range(16, 30), p: rng.range(0, TAU) }));

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.15, 30000);

  const setTime = (t: number): void => {
    kit.setTime(t);
    streaks.rotation.y = -0.0007 * t;

    for (let i = 0; i < puffSeed.length; i++) {
      const s = puffSeed[i] as (typeof puffSeed)[number];
      const u = fract(t / s.period + s.phase);
      const grow = Math.sqrt(Math.sin(Math.PI * u)) * (0.25 + 0.55 * u) * s.size;
      const x = steamAt[0] * 6 + Math.sin(s.a) * s.r - 1.2 * u;
      const z = steamAt[1] * 6 + Math.cos(s.a) * s.r - 1.5 * u;
      put(puffs, i, x, 0.4 + 3.8 * u, z, 0, 0, grow * 1.25, grow, grow * 1.25);
    }
    puffs.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < stalks.length; i++) {
      const s = stalks[i] as Stalk;
      const dir = [Math.cos(s.yaw), -Math.sin(s.yaw)];
      const reach = Math.sin(s.lean) * s.h;
      const x = s.x + (dir[0] as number) * reach;
      const z = s.z + (dir[1] as number) * reach;
      const y = Math.cos(s.lean) * s.h;
      const breathe = 1 + 0.06 * Math.sin(t * 0.9 + s.phase);
      if (s.kind === 0) put(fans, i, x, y + 0.1 * s.size, z, s.yaw, -s.lean - 0.25, 0.28 * s.size * breathe, 0.27 * s.size, 0.28 * s.size * breathe);
      else if (s.kind === 3) put(fans, i, x, y + 0.1 * s.size, z, s.yaw, -s.lean - 0.45, 0.16 * s.size * breathe, 0.27 * s.size, 0.16 * s.size * breathe);
      else if (s.kind === 1) put(fans, i, x, y + 0.1 * s.size, z, s.yaw, -s.lean, 0.09 * s.size, 0.25 * s.size, 0.09 * s.size);
      else put(fans, i, x, y, z, 0, 0, 0);
    }
    fans.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < swarm.length; i++) {
      const s = swarm[i] as (typeof swarm)[number];
      const w = s.w as [number, number, number];
      const p = s.p as [number, number, number];
      const x = s.home[0] + s.reach * Math.sin(w[0] * t + p[0]) + 0.3 * Math.sin(0.4 * t + p[1]);
      const y = s.home[1] + 0.5 * s.reach * Math.sin(w[1] * t + p[1]);
      const z = s.home[2] + s.reach * Math.cos(w[2] * t + p[2]) + 0.3 * Math.cos(0.33 * t + p[0]);
      put(insects, i, x, y, z, w[0] * t + p[0], 0, 1, 1, 1 + 2.2 * Math.abs(Math.sin(t * 38 + p[2])));
    }
    insects.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < BEASTS.length; i++) {
      const b = BEASTS[i] as Beast;
      const n = Math.hypot(b.head[0], b.head[1]);
      const hd = b.head[0] / n;
      const hl = b.head[1] / n;
      const go = b.speed * (t - WALLOW_TIME);
      const p = rel(b.d + hd * go, b.l + hl * go);
      const pitch = -b.root * (0.6 + 0.4 * Math.sin(t * 1.3 + i * 1.7));
      put(beasts, i, p[0], -b.sink * b.size + 0.03 * Math.sin(t * 2.2 + i), p[1], relYaw(hd, hl) + 0.05 * Math.sin(t * 0.7 + i), pitch, b.size);
    }
    const bank = bearingDir(37);
    const walk = 0.2 * (t - keyTime('marsh-2'));
    put(beasts, BEASTS.length, bank[0] * 13.8 - walk, -0.12 + 0.03 * Math.sin(t * 2.1), bank[1] * 13.8 - walk * 0.12, yawOf(-1, -0.12), -0.06 - 0.03 * Math.sin(t * 1.4), 1);
    put(beasts, BEASTS.length + 1, stuckAt[0], -0.92 + 0.07 * Math.sin(t * 1.9) + 0.03 * Math.sin(t * 4.3), stuckAt[1], relYaw(-0.97, -0.03) + 0.07 * Math.sin(t * 1.1), 0.25 + 0.07 * Math.sin(t * 1.9 + 0.8), 1);
    beasts.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < domeSeed.length; i++) {
      const d = domeSeed[i] as (typeof domeSeed)[number];
      let grow: number;
      let age: number;
      if (i === 0) {
        grow = t < BURST ? Math.pow(clamp((t - (BURST - 7.5)) / 7, 0.2, 1), 0.6) : Math.pow(clamp((t - BURST - 4) / 9), 0.6);
        age = t - BURST;
      } else if (i === 1) {
        grow = t < SMALL_BURST ? Math.pow(clamp((t - (SMALL_BURST - 6)) / 5.6, 0.15, 1), 0.6) : Math.pow(clamp((t - SMALL_BURST - 3) / 6), 0.6);
        age = t - SMALL_BURST;
      } else {
        const u = fract(t / d.period + d.phase);
        grow = Math.pow(Math.min(1, u / 0.85), 0.6);
        age = u * d.period;
      }
      const r = d.size * grow;
      put(domeMesh, i, d.x, 0.05, d.z, 0, 0, r, r * 0.72, r);
      for (let k = 0; k < 2; k++) {
        const a = age - k * 0.45;
        const live = a > 0 && a < 2.6 && i !== 0;
        put(ringMesh, i * 2 + k, d.x, 0.075, d.z, 0, 0, live ? d.size * 1.2 + 1.1 * a : 0);
      }
    }
    domeMesh.instanceMatrix.needsUpdate = true;
    ringMesh.instanceMatrix.needsUpdate = true;
    const sa = t - SMALL_BURST;
    const sLive = sa > 0 && sa < 0.7;
    crown.scale.set(sLive ? 0.22 + 0.5 * sa : 0, sLive ? 0.4 * Math.sin((Math.PI * sa) / 0.7) + 0.01 : 0, sLive ? 0.22 + 0.5 * sa : 0);

    const a = t - BURST;
    const on = a >= 0;
    const rise = on && a < 0.5 ? 1.3 * Math.sin((Math.PI * a) / 0.5) : 0;
    column.scale.set(rise > 0 ? 0.2 : 0, rise + 0.01, rise > 0 ? 0.2 : 0);
    const crownUp = on && a < 0.6 ? 0.34 * Math.sin((Math.PI * a) / 0.6) : 0;
    bigCrown.scale.set(crownUp > 0 ? 0.3 + 0.55 * a : 0, crownUp + 0.01, crownUp > 0 ? 0.3 + 0.55 * a : 0);
    const ringR = on ? Math.min(POOL_R - 0.5, 0.9 + 2.6 * a) : 0;
    bigRing.scale.set(ringR, 1, ringR);
    bigRing.position.y = 0.08;
    const laterR = a > 0.55 ? Math.min(POOL_R - 0.5, 0.6 + 2.1 * (a - 0.55)) : 0;
    secondRing.scale.set(laterR, 1, laterR);
    secondRing.position.y = 0.08;
    const cloudR = on && a < 4 ? (0.18 + 0.2 * a) * Math.sqrt(Math.sin((Math.PI * a) / 4)) : 0;
    cloud.scale.set(cloudR * 1.2, cloudR, cloudR * 1.2);
    cloud.position.y = 0.8 + 1.1 * Math.max(0, a);
    for (let i = 0; i < dropSeed.length; i++) {
      const d = dropSeed[i] as (typeof dropSeed)[number];
      const da = a - d.delay;
      const y = d.vy * da - 4.9 * da * da;
      const live = da > 0 && y > -0.05;
      put(drops, i, HERO_DOME[0] + d.vx * da, 0.1 + y, HERO_DOME[1] + d.vz * da, 0, 0, live ? d.size : 0, live ? d.size * d.tall : 0, live ? d.size : 0);
    }
    drops.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < flockSeed.length; i++) {
      const f = flockSeed[i] as (typeof flockSeed)[number];
      const p = rel(190 + f.d, -70 + 14 * t + f.l);
      put(flock, i, p[0], f.y + 1.5 * Math.sin(t * 0.8 + f.p), p[1], relYaw(0, 1), 0, 1.6, 0.3, 1.6 + 1.6 * Math.abs(Math.sin(t * 5 + f.p)));
    }
    flock.instanceMatrix.needsUpdate = true;
  };

  setTime(0);

  return {
    unit: UNIT,
    scene,
    camera,
    look: { ...neutralLook(), bloom: 0.02, vignette: 0.1, grain: 0.006 },
    volume: null,
    parts,
    setTime,
    solo: (name) => kit.solo(name),
  };
}

const place: PlaceModule = { unit: UNIT, shots, create };

export default place;
