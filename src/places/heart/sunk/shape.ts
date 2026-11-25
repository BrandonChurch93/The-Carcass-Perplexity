// The shapes of the one that sank, made once at creation: the folded crust round it as a field of heights, the body and the two legs.
// Everything is in the local frame of the carcass: metres, y up, +x to the right and +z toward the camera of key heart-2
// (the refitted one, 21 m off at local (0, 4.4, 21)).
import * as THREE from 'three';
import { cells2, fbm2, fbm3, hash, mix, noise2, noise3, smooth } from './noise';

/** The local frame is the world turned by this angle about y, at SUNK. */
export const YAW = (58.6 * Math.PI) / 180;
/** Where the crust came from, in the local frame: the world's (0.611, -0.791) turned into it. */
const UPSTREAM: [number, number] = [0.611 * Math.cos(YAW) - 0.791 * Math.sin(YAW), -0.611 * Math.sin(YAW) - 0.791 * Math.cos(YAW)];

export const FIELD = { cx: -3.5, cz: 0.3, half: 14.5, size: 1024 };

export const BODY = {
  centre: new THREE.Vector3(-3.5, 0.72, -0.4),
  radii: new THREE.Vector3(2.3, 1.5, 1.55),
  // Tilted: the back turned up toward the bench side, the neck end down in the crust.
  turn: new THREE.Euler(0.3, 0.2, 0.2, 'YXZ'),
};

export type P3 = [number, number, number];

/** The two legs that stand out: the hip is inside the body, the knee is the top of the arch. */
export const LEG_A: P3[] = [
  [-2.75, 0.46, 0.25],
  [-2.15, 1.17, 0.5],
  [-1.25, 2.8, 0.74],
  [-0.05, 4.54, 0.9],
  [0.95, 5.29, 0.9],
  [1.65, 5.15, 0.8],
  [2.5, 4.08, 0.55],
  [3.55, 2.24, 0.1],
  [4.35, 0.56, -0.28],
  [4.6, -0.25, -0.4],
  [4.7, -0.9, -0.45],
];
export const LEG_B: P3[] = [
  [-3, 0.49, -0.7],
  [-2.3, 1.14, -1.25],
  [-1.3, 2.16, -1.95],
  [-0.2, 2.97, -2.55],
  [0.65, 3.2, -2.9],
  [1.55, 3.05, -3.25],
  [2.45, 2.66, -3.5],
  [3, 2.41, -3.62],
  [3.45, 1.75, -3.72],
  [3.75, 0.9, -3.82],
  [3.92, 0.1, -3.88],
  [4.0, -0.5, -3.9],
  [4.02, -0.95, -3.9],
];
export const FOOT_A: [number, number] = [4.53, -0.37];
/** The second leg goes down into the crust too, behind the first. */
export const FOOT_B: [number, number] = [3.95, -3.89];
/** The wrist of the second leg, where its pad hangs. */
export const WRIST_B: P3 = [3.22, 2.02, -3.63];

/** The tear on the side the crust left by: a rent of open lava, a crescent about two metres long. */
// Its first half runs away from the bench of key heart-2, so that camera looks down its length and sees its floor.
export const TEAR: [number, number][] = [
  [-6.35, 4.5],
  [-6.6, 3.85],
  [-6.95, 3.3],
  [-7.5, 2.95],
  [-8.1, 2.85],
];

/** The cords of the skin are counted along a phase in metres and their width swings between 3 and 10 cm. The shader does the same sums. */
export const CORD = { turn: 9, base: 10, swing: 23 };
export function cordCount(u: number): number {
  const th = CORD.turn * u;
  return CORD.base * u + CORD.swing * (0.375 * u - (0.5 * Math.cos(th)) / CORD.turn - Math.sin(2 * th) / (16 * CORD.turn));
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
  return 1.5 + 0.72 * best;
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
  const a = BODY.radii.x * 0.93;
  const b = BODY.radii.z * 0.95;
  const k = Math.hypot(u / a, w / b);
  return (k - 1) * Math.min(a, b) * (0.75 + 0.25 * Math.min(k, 2));
}

const smin = (a: number, b: number, k: number): number => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

const BQ = new THREE.Quaternion().setFromEuler(BODY.turn);

/** A point of the body's hull, `v` along it and `a` round it from the spine. With `fine` it has the cords and furrows of the dried hide; without, it is
 *  the smooth shape those are cut into, which is what the skin of the lava lies on. `o` comes back as the way out of the hull there. */
function hull(v: number, a: number, fine: boolean, p: THREE.Vector3, o: THREE.Vector3): { ring: number; s: number; furrow: number } {
  const R = BODY.radii;
  const along = -Math.cos(v * Math.PI);
  const ring = Math.pow(Math.sin(v * Math.PI), 0.8);
  const s = along * R.x;
  const dy = Math.cos(a);
  const dz = Math.sin(a);
  const dry = fbm3(along * 2.1 + 3, dy * 1.4, dz * 1.4, 4);
  let r = 1 + 0.18 * (dry - 0.47);
  // One side fell in.
  r -= 0.2 * smooth(0.45, 0.8, noise3(along * 1.3 + 7, dy * 1.1 + 2, dz * 1.1)) * ring;
  let furrow = 0;
  if (fine) {
    // The hide dried onto the frame in cords that run the length of the body and wind a little round it, as it twisted going down.
    const wind = a + 1.1 * along + 0.3 * Math.sin(s * 1.3 + 0.7) + 0.5 * (noise3(s * 0.4 + 9, dy, dz) - 0.5);
    const f1 = Math.abs(Math.sin(wind * 4.5 + 2.6 * noise3(s * 0.5 + 5, dy * 1.2, dz * 1.2)));
    const f2 = Math.abs(Math.sin(wind * 15 + 2.4 * noise3(s * 0.8 + 5, dy * 1.7, dz * 1.7) + 1.5 * f1));
    furrow = Math.pow(1 - f1, 1.6);
    const full = Math.min(1, ring * 1.4);
    r -= (0.1 * furrow * (0.4 + 1.2 * dry) + 0.035 * Math.pow(1 - f2, 2.2) * (0.4 + 1.2 * dry)) * full;
    // The frame under it: ribs across the flank, the spine as a keel.
    const ribs = Math.pow(0.5 + 0.5 * Math.cos(s * 6.8 + 1.1 * Math.sin(a * 2 + s) + 2.0 * noise2(s * 0.9, dy * 1.3)), 3);
    r += 0.03 * ribs * smooth(0.15, 0.75, Math.abs(dz)) * ring;
    const spine = Math.exp(-Math.pow(Math.min(a, Math.PI * 2 - a) / 0.13, 2));
    r += 0.06 * spine * (0.6 + 0.4 * Math.cos(s * 11));
    r += 0.025 * (noise3(s * 7, dy * 5, dz * 5) - 0.5);
  }
  o.set(0, dy * R.y, dz * R.z).multiplyScalar(ring * r);
  p.set(along * R.x * (0.9 + 0.1 * r), o.y, o.z).applyQuaternion(BQ).add(BODY.centre);
  o.normalize().applyQuaternion(BQ);
  return { ring, s, furrow };
}

function legCurve(points: P3[]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    'centripetal',
  );
}

/** What the skin of the lava is draped over: the height of the top of the body, and of the base of each leg where it leaves the body and where it
 *  enters the crust, with the skin hanging off them like a cloth off a table. Metres; far below zero away from them. */
function makeTent(): (x: number, z: number) => number {
  const cell = 0.1;
  const n = Math.round((2 * FIELD.half) / cell);
  const x0 = FIELD.cx - FIELD.half;
  const z0 = FIELD.cz - FIELD.half;
  const top = new Float32Array(n * n).fill(-9);
  const put = (x: number, z: number, y: number): void => {
    const i = Math.floor((x - x0) / cell);
    const j = Math.floor((z - z0) / cell);
    if (i < 0 || j < 0 || i >= n || j >= n) return;
    if (y > (top[j * n + i] as number)) top[j * n + i] = y;
  };
  const p = new THREE.Vector3();
  const o = new THREE.Vector3();
  for (let i = 0; i <= 260; i++) {
    for (let j = 0; j < 400; j++) {
      hull(i / 260, (j / 400) * Math.PI * 2, false, p, o);
      put(p.x, p.z, p.y);
    }
  }
  // The skin climbed each leg a little: where it leaves the body, and where it goes into the crust.
  for (const [points, radius] of [
    [LEG_A, 0.42],
    [LEG_B, 0.28],
  ] as [P3[], number][]) {
    const curve = legCurve(points);
    for (let i = 0; i <= 600; i++) {
      const t = i / 600;
      curve.getPointAt(t, p);
      const limit = t < 0.5 ? 0.0 : 0.45;
      if (p.y > limit) continue;
      for (let a = 0; a < 16; a++) {
        for (const rr of [0.5, 1]) put(p.x + Math.cos(a * 0.3927) * radius * rr, p.z + Math.sin(a * 0.3927) * radius * rr, p.y + 0.1);
      }
      put(p.x, p.z, p.y + 0.1);
    }
  }
  // Hang the cloth: every point is at least as high as its neighbour less the fall of the cloth over the step between them.
  const fall = 1.7;
  const s1 = fall * cell;
  const s2 = s1 * Math.SQRT2;
  const relax = (k: number, m: number, s: number): void => {
    const v = (top[m] as number) - s;
    if (v > (top[k] as number)) top[k] = v;
  };
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 1; j < n - 1; j++) {
      for (let i = 1; i < n - 1; i++) {
        const k = j * n + i;
        relax(k, k - 1, s1);
        relax(k, k - n, s1);
        relax(k, k - n - 1, s2);
        relax(k, k - n + 1, s2);
      }
    }
    for (let j = n - 2; j > 0; j--) {
      for (let i = n - 2; i > 0; i--) {
        const k = j * n + i;
        relax(k, k + 1, s1);
        relax(k, k + n, s1);
        relax(k, k + n + 1, s2);
        relax(k, k + n - 1, s2);
      }
    }
  }
  const soft = blur(top, n, 1);
  return (x, z) => {
    const fx = Math.min(n - 1.001, Math.max(0, (x - x0) / cell - 0.5));
    const fz = Math.min(n - 1.001, Math.max(0, (z - z0) / cell - 0.5));
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fx - i;
    const v = fz - j;
    const a = j * n + i;
    return ((soft[a] as number) * (1 - u) + (soft[a + 1] as number) * u) * (1 - v) + ((soft[a + n] as number) * (1 - u) + (soft[a + n + 1] as number) * u) * v;
  };
}

/** A festoon: a bundle of cords bent in an arc across the way the skin was pushed. */
interface Festoon {
  x: number;
  z: number;
  cos: number;
  sin: number;
  /** Half the width of the arc, metres. */
  half: number;
  /** How far the bundle runs along the push, metres: its cords times their width. */
  length: number;
  /** How far the ends of the arc trail behind its middle, as a part of the half width. */
  bow: number;
  rank: number;
  tone: number;
}

const FESTOON_CELL = 2.2;

function makeFestoons(): { cells: Festoon[][]; count: number; at: (x: number, z: number) => Festoon[] } {
  const span = 2 * FIELD.half;
  const count = Math.ceil(span / FESTOON_CELL);
  const cells: Festoon[][] = Array.from({ length: count * count }, () => []);
  const x0 = FIELD.cx - FIELD.half;
  const z0 = FIELD.cz - FIELD.half;
  const step = 1.55;
  const m = Math.ceil(span / step);
  const all: Festoon[] = [];
  for (let j = 0; j < m; j++) {
    for (let i = 0; i < m; i++) {
      if (hash(i, j, 101) > 0.82) continue;
      const x = x0 + (i + hash(i, j, 102)) * step;
      const z = z0 + (j + hash(i, j, 103)) * step;
      // The skin was pushed outward from where the body went down, and each sheet of it turned a little as it went.
      const away = Math.atan2(z - BODY.centre.z, x - BODY.centre.x) + 2.2 * (hash(i, j, 104) - 0.5);
      const big = hash(i, j, 105);
      const long = hash(i, j, 106);
      all.push({
        x,
        z,
        cos: Math.cos(away),
        sin: Math.sin(away),
        half: 0.5 + 1.5 * big * big,
        length: 0.3 + 0.7 * long + 1.6 * long * long * long,
        bow: 0.25 + 0.5 * hash(i, j, 107),
        rank: hash(i, j, 108),
        tone: hash(i, j, 110),
      });
    }
  }
  all.sort((a, b) => b.rank - a.rank);
  for (const f of all) {
    const r = Math.hypot(f.half * 1.15, f.length + f.bow * f.half) + 0.4;
    const i0 = Math.max(0, Math.floor((f.x - r - x0) / FESTOON_CELL));
    const i1 = Math.min(count - 1, Math.floor((f.x + r - x0) / FESTOON_CELL));
    const j0 = Math.max(0, Math.floor((f.z - r - z0) / FESTOON_CELL));
    const j1 = Math.min(count - 1, Math.floor((f.z + r - z0) / FESTOON_CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) (cells[j * count + i] as Festoon[]).push(f);
  }
  const none: Festoon[] = [];
  return {
    cells,
    count,
    at: (x, z) => {
      const i = Math.floor((x - x0) / FESTOON_CELL);
      const j = Math.floor((z - z0) / FESTOON_CELL);
      return i < 0 || j < 0 || i >= count || j >= count ? none : (cells[j * count + i] as Festoon[]);
    },
  };
}

export interface FieldPoint {
  /** Metres above the flat crust. */
  h: number;
  /** 0 to 1: how hot the skin is, for the tear. */
  heat: number;
  /** Metres to the body or the foot of the leg. */
  d: number;
  /** The phase the cords are counted along, metres. */
  phase: number;
  /** 0 to 1: how strongly the skin is corded here. */
  cords: number;
  /** 0 to 1: the skin is the folded one here. */
  folded: number;
  /** 0 to 1: the tone of the sheet of skin the point is on. */
  tone: number;
}

/** Folds to the turn of the swirl: how far out a fold moves in one turn round the body, metres. */
const SWIRL = { arms: 14, seam: [0.35, -0.94] as [number, number] };

export function makeField(lakeSeam: [number, number][]): (x: number, z: number) => FieldPoint {
  const tent = makeTent();
  const festoons = makeFestoons();
  const R = BODY.radii;
  return (x, z) => {
    const n1 = noise2(x * 0.27 + 3.1, z * 0.27);
    const n2 = noise2(x * 0.27 + 11.7, z * 0.27 + 5.2);
    const wx = x + 1.3 * (n1 - 0.5) + 0.34 * (noise2(x * 1.07, z * 1.07 + 7.3) - 0.5);
    const wz = z + 1.3 * (n2 - 0.5) + 0.34 * (noise2(x * 1.07 + 9.9, z * 1.07) - 0.5);
    const dBody = bodyDistance(wx, wz);
    const dFootA = Math.hypot(wx - FOOT_A[0], wz - FOOT_A[1]) - 0.3;
    const dFootB = Math.hypot(wx - FOOT_B[0], wz - FOOT_B[1]) - 0.2;
    // The folds turn round the body and round the foot of each leg as one shape.
    // The tear is in the eye of it: the innermost folds go round the rent as they go round the body.
    const d = smin(smin(smin(dBody, dFootA + 0.5, 1.6), dFootB + 0.5, 1.6), polyDistance(TEAR, wx, wz)[0] + 0.25, 2.2);
    const dTrue = Math.min(bodyDistance(x, z), Math.hypot(x - FOOT_A[0], z - FOOT_A[1]) - 0.3, Math.hypot(x - FOOT_B[0], z - FOOT_B[1]) - 0.2);
    const dd = Math.max(d, 0);

    const ox = x - BODY.centre.x;
    const oz = z - BODY.centre.z;
    const ol = Math.hypot(ox, oz) || 1;
    const up = 0.5 + (0.5 * (ox * UPSTREAM[0] + oz * UPSTREAM[1])) / ol;

    // Where the folded skin ends: in toes of different reach, each a sheet that lies on the lake's plates.
    const out = reach(x, z);
    const toe = cells2(x * 0.42 + 0.7 * (n1 - 0.5), z * 0.42 + 0.7 * (n2 - 0.5), 4096);
    const wobble = 1.1 * (noise2(x * 0.45 + 33, z * 0.45 + 2) - 0.5) + 0.35 * (noise2(x * 1.9 + 3, z * 1.9 + 41) - 0.5) + 1.3 * (toe[1] - 0.5);
    const radial = Math.hypot(x - FIELD.cx, z - FIELD.cz);
    const inside = out - dd - wobble;
    const edge = smooth(0, 2.4, inside) * smooth(9.0, 7.8, radial);
    const sheet = smooth(-2.6, -0.4, inside) * smooth(9.15, 8.0, radial);

    // The swirl: the skin turned round the body as it went down, and its folds run out from it in a slow spiral, thick near the
    // body and lower outward, each leaning on the next. They are arcs, not rings: a fold dies away and another takes up beside it.
    // The angle wraps behind the body, where the bench does not see.
    const theta = Math.atan2(-(ox * SWIRL.seam[0] + oz * SWIRL.seam[1]), ox * SWIRL.seam[1] - oz * SWIRL.seam[0]);
    const turn = (theta / (2 * Math.PI)) * SWIRL.arms;
    const bend = 1.7 * noise2(x * 0.23 + 20, z * 0.23 + 3) + 0.7 * noise2(x * 0.55 + 4, z * 0.55 + 31) + 0.25 * noise2(x * 1.3 + 4, z * 1.3);
    // The folds are thick against the body, about a metre, and thin away from it.
    const u = d + bend;
    const wp = u / 0.58 - 2.4 * (1 - Math.exp(-Math.max(u, -0.6) / 3)) + turn;
    const gap = 1 / (1 / 0.58 - 0.8 * Math.exp(-Math.max(u, -0.6) / 3));
    const fold = Math.floor(wp);
    const t1 = wp - fold;
    // A fold is a bundle of two to five ropes of unequal girth, each of them round, with a tight crease between it and the next.
    const ropes = 2 + Math.floor(hash(fold, 3, 71) * 3.99);
    const lean = 0.65 + 0.7 * hash(fold, 5, 71);
    const tr = Math.pow(t1, lean) * ropes;
    const rope = Math.floor(tr);
    const e2 = 2 * (tr - rope) - 1;
    // How wide the rope is on the ground: the bundle's share, by where in the leaning bundle it lies.
    const wide = (gap / ropes / lean) * Math.pow(Math.max(t1, 0.02), 1 - lean);
    const girth = 0.5 + 0.5 * hash(fold, rope, 73);
    const e1 = 2 * t1 - 1;
    const bundle = Math.pow(Math.max(0, 1 - e1 * e1), 0.8);
    const ropeUp = Math.pow(Math.max(0, 1 - e2 * e2), 0.9);
    const big = bundle * ropeUp;
    const alive = smooth(0.2, 0.55, noise2(x * 0.3 + fold * 13.7, z * 0.3 + 5) + 0.45 * Math.exp(-dd / 3.0));
    const lively = edge * alive * (0.55 + 0.45 * Math.exp(-dd / 4.5));
    const weltAmp = lively * (0.05 + 0.36 * Math.exp(-dd / 3.2)) * (0.7 + 0.6 * up) * (0.5 + hash(fold, 9, 71));
    const ropeAmp = lively * 0.8 * Math.min(wide, 0.5) * (0.6 + 0.4 * girth);
    let h = -0.1 * Math.exp(-Math.pow(dd / 2.4, 2)) * edge;
    h += bundle * weltAmp + ropeUp * ropeAmp * Math.sqrt(bundle);
    // The skin rode up against the body and the legs: highest on the side it came from and at the end that went under first.
    const climb = (0.25 + 0.2 * up + 0.3 * (noise2(x * 0.5 + 44, z * 0.5 + 12) - 0.5)) * edge;
    h += climb * Math.exp(-Math.pow(dd / 2.6, 1.5));
    // Billows of the skin where it did not fold.
    h += ((fbm2(x * 0.6 + 70, z * 0.6, 4) - 0.47) * 0.26 + (noise2(x * 2.3 + 9, z * 2.3) - 0.5) * 0.05) * edge;
    // The front of each toe is a rounded step onto the lake's plates.
    h += 0.07 * Math.sqrt(smooth(0, 0.3, inside)) * smooth(9.0, 7.8, radial);

    // Rings of the skin round the foot of each leg.
    for (const [fx, fz] of [FOOT_A, FOOT_B]) {
      const r = Math.hypot(x - fx, z - fz) + 0.3 * (noise2(x * 1.3 + fx, z * 1.3) - 0.5);
      const ring = r / 0.27 + 2.5 * noise2(x * 0.8 + 5, z * 0.8 + fz);
      h += (0.1 * Math.pow(0.5 + 0.5 * Math.cos(ring * 6.2832), 0.6) + 0.22) * Math.exp(-Math.pow(r / 0.75, 2));
    }

    // The drape: the skin rode up over the body from the side it came from and from the end that went under first, and round
    // the base of each leg. Where it stops it stops in a thick rounded lip; past that the hide is bare.
    const top = tent(x, z);
    const bu = ((ox * BC - oz * BS) / R.x) * 1.0;
    const bw = (ox * BS + oz * BC) / R.z;
    const rag = fbm2(x * 0.9 + 14, z * 0.9 + 51, 3) - 0.5;
    const lobe = cells2(x * 1.6 + 3 * rag, z * 1.6, 4096);
    let cover = 0.2 + 0.85 * bw - 0.7 * bu + 1.1 * rag + 0.3 * (lobe[1] - 0.5) + 0.12 * Math.sqrt(lobe[0]);
    // Outside the body there is nothing to be bare.
    cover = Math.max(cover, smooth(-0.15, 0.25, bodyDistance(x, z)));
    let near = 9;
    for (const [lx, lz] of [
      [-2.2, 0.45],
      [-2.4, -1.2],
    ] as [number, number][]) near = Math.min(near, Math.hypot(x - lx, z - lz));
    cover = Math.max(cover, 0.6 - near * 0.75 + 0.5 * rag);
    const lip = smooth(0, 0.22, cover);
    // On the body the skin lies in the same ropes, thinner.
    const thick = 0.07 + 0.11 * big * (0.4 + 0.6 * alive);
    const draped = top + thick;
    // Where the body stands higher than the skin climbed, it stands out of it bare: the skin ends against it.
    const rode = h + 0.25 + 1.1 * smooth(0.1, 0.9, cover) * (0.5 + 0.5 * up);
    if (draped > h) h = mix(h, Math.min(draped, rode), Math.sqrt(lip) * smooth(0, 0.12, draped - h));

    // The cords. On a fold of the swirl they run along it, a bundle to each fold; elsewhere the skin is smooth or lies in festoons.
    // The phase is kept small, within a fold or a festoon, because half floats carry it: the shader moves each sheet along by its tone.
    let phase = t1 * gap;
    let cords = alive * smooth(0.2, 0.6, big) * sheet * (0.5 + 0.5 * smooth(6.5, 3.5, dd));
    let tone = 0.15 + 0.7 * hash(fold, 2, 77);
    const fxw = x + 0.3 * (noise2(x * 0.9 + 60, z * 0.9) - 0.5);
    const fzw = z + 0.3 * (noise2(x * 0.9, z * 0.9 + 60) - 0.5);
    let block = 1;
    let chosen = false;
    for (const f of festoons.at(x, z)) {
      const ex = fxw - f.x;
      const ez = fzw - f.z;
      const s = (-ex * f.sin + ez * f.cos) / f.half;
      const as = Math.abs(s);
      if (as > 1.2) continue;
      // The cords crowd together toward the ends of the arc.
      const ph = (ex * f.cos + ez * f.sin + f.bow * f.half * s * s) / (1 - 0.45 * s * s);
      if (ph < -0.12 || ph > f.length + 0.12) continue;
      const halo = smooth(1.2, 1.0, as) * smooth(-0.12, 0, ph) * smooth(f.length + 0.12, f.length, ph);
      const amp = smooth(1.0, 0.72, as) * smooth(0, 0.08, ph) * smooth(f.length, f.length - 0.08, ph);
      h += 0.035 * halo * block * sheet;
      if (!chosen && amp * block > 0.002) {
        // A festoon lies over the folds of the swirl only where they are low.
        const over = block * (1 - 0.85 * smooth(0.08, 0.2, bundle * weltAmp + ropeAmp));
        if (over > 0.05) {
          chosen = true;
          cords = Math.min(1, amp * 1.3) * over * sheet;
          phase = ph;
          tone = f.tone;
        }
      }
      block *= 1 - halo;
      if (!chosen) cords *= 1 - halo;
    }

    // The tear: the lips lift, the floor is open lava.
    const [dt, at] = polyDistance(TEAR, x, z);
    const ragged = dt + 0.16 * (noise2(x * 2.6 + 8, z * 2.6) - 0.5) + 0.06 * (noise2(x * 8.1, z * 8.1 + 3) - 0.5);
    const tearWidth = 0.2 * Math.sin(Math.PI * Math.min(1, Math.max(0, at))) ** 0.6 * (0.7 + 0.6 * noise2(x * 0.9 + 14, z * 0.9 + 22));
    const within = smooth(0, 0.08, tearWidth);
    h -= 0.22 * Math.exp(-Math.pow(dt / 1.0, 2)) * edge;
    h += 0.07 * Math.exp(-Math.pow(Math.max(ragged - tearWidth, 0) / 0.3, 2)) * within * edge;
    const open = smooth(tearWidth, tearWidth * 0.45, ragged) * smooth(0.02, 0.1, tearWidth);
    const floor = Math.min(h - 0.2, -0.16) + 0.04 * noise2(x * 6, z * 6);
    const lipHeight = h;
    h = mix(h, floor, open);
    const heat = smooth(tearWidth * 1.05, tearWidth * 0.3, ragged) * smooth(0.02, 0.1, tearWidth) * smooth(lipHeight - 0.03, floor + 0.08, h);
    cords *= 1 - smooth(tearWidth + 0.25, tearWidth, ragged);

    // The lake's seam runs on under the folded skin: the skin stands a little proud along it.
    const [ds] = polyDistance(lakeSeam, x, z);
    h += 0.08 * Math.exp(-Math.pow(ds / 0.7, 2)) * edge;

    return { h, heat, d: dTrue, phase, cords: Math.min(1, Math.max(0, cords)), folded: sheet, tone };
  };
}

export interface Baked {
  /** Heights, metres, FIELD.size squared. */
  height: Float32Array;
  /** rg: slope in x and z (0.5 is level, the range is plus or minus 3); b: how open the sky is over the point; a: the folded skin. */
  relief: THREE.DataTexture;
  /** r: heat of the tear; g: ash; b: how far the point stands over the ground round it, 0.5 is level; a: the tone of the sheet of skin. */
  mask: THREE.DataTexture;
  /** r: the phase the cords are counted along, metres; gb: its direction on the ground; a: how strongly the skin is corded. Half float. */
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
  const cords = new Float32Array(n * n);
  const folded = new Float32Array(n * n);
  const tone = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const p = field(FIELD.cx - FIELD.half + (i + 0.5) * cell, FIELD.cz - FIELD.half + (j + 0.5) * cell);
      height[j * n + i] = p.h;
      heat[j * n + i] = p.heat;
      dist[j * n + i] = p.d;
      phase[j * n + i] = p.phase;
      cords[j * n + i] = p.cords;
      folded[j * n + i] = p.folded;
      tone[j * n + i] = p.tone;
    }
  }
  // A hollow is a place lower than the ground round it, at the width of a rope and at the width of a fold.
  const near = blur(height, n, 3);
  const mid = blur(height, n, 10);
  const wide = blur(mid, n, 22);
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
      const hollow = Math.max(0, (near[k] as number) - h) * 16 + Math.max(0, (mid[k] as number) - h) * 5 + Math.max(0, (wide[k] as number) - h) * 1.3;
      const d = dist[k] as number;
      // What stands over the crust hides the sky from it.
      const under = 0.45 * Math.exp(-Math.max(d, 0) / 0.4) + 0.1 * Math.exp(-Math.max(d, 0) / 1.5);
      const open = Math.max(0.04, (1 - under) / (1 + hollow));
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
      mask[k * 4 + 2] = byte(0.5 + 4 * (h - (near[k] as number)) + 1.5 * (h - (mid[k] as number)));
      const px = ((phase[j * n + Math.min(n - 1, i + 1)] as number) - (phase[j * n + Math.max(0, i - 1)] as number)) / (2 * cell);
      const pz = ((phase[Math.min(n - 1, j + 1) * n + i] as number) - (phase[Math.max(0, j - 1) * n + i] as number)) / (2 * cell);
      const pl = Math.hypot(px, pz) || 1;
      lines[k * 4] = THREE.DataUtils.toHalfFloat(phase[k] as number);
      lines[k * 4 + 1] = THREE.DataUtils.toHalfFloat(px / pl);
      lines[k * 4 + 2] = THREE.DataUtils.toHalfFloat(pz / pl);
      lines[k * 4 + 3] = THREE.DataUtils.toHalfFloat(cords[k] as number);
      mask[k * 4 + 3] = byte(tone[k] as number);
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
    p.setY(i, baked.at(x, z));
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

/** The body: a deep rounded hull, its hide dried onto the frame in long cords, tilted in the crust and more than half under the skin of the lava. */
export function bodyGeometry(baked: Baked, rows = 360, columns = 300, seenOnly = false): THREE.BufferGeometry {
  const count = (rows + 1) * (columns + 1);
  const position = new Float32Array(count * 3);
  const map = new Float32Array(count * 4);
  const surf = new Float32Array(count * 4);
  const p = new THREE.Vector3();
  const o = new THREE.Vector3();
  for (let i = 0; i <= rows; i++) {
    // The poles lie on the long axis.
    const v = i / rows;
    for (let j = 0; j <= columns; j++) {
      const a = ((j % columns) / columns) * Math.PI * 2;
      const at = hull(v, a, true, p, o);
      const lava = lavaCoat(baked, p, 0.2, 11);
      p.addScaledVector(o, lava.out * 0.6);
      const k = i * (columns + 1) + j;
      position[k * 3] = p.x;
      position[k * 3 + 1] = p.y;
      position[k * 3 + 2] = p.z;
      map[k * 4] = j / columns;
      map[k * 4 + 1] = at.s;
      map[k * 4 + 2] = 12;
      map[k * 4 + 3] = KIND.body;
      surf[k * 4] = lava.coat;
      // How deep in a furrow between two cords of the hide the point is.
      surf[k * 4 + 1] = at.furrow;
      surf[k * 4 + 2] = (0.45 + 0.55 * smooth(-0.05, 0.5, lava.above)) * (1 - 0.5 * at.furrow);
      surf[k * 4 + 3] = 0;
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
      // Nothing is drawn of what lies well under the skin.
      if (position[a * 3 + 1]! < baked.at(position[a * 3]!, position[a * 3 + 2]!) - 0.3 && position[(b + 1) * 3 + 1]! < baked.at(position[(b + 1) * 3]!, position[(b + 1) * 3 + 2]!) - 0.3) continue;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return finishGeometry(position, map, surf, index, rows + 1, columns + 1);
}

export interface LegShape {
  points: P3[];
  /** Part of the length where the knee is. */
  knee: number;
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
      // A bent trunk: thick where it leaves the body, one rounded knuckle at the top, tapering as it goes down into the crust.
      const joint = 0.1 * Math.exp(-Math.pow((t - knee) / 0.07, 2)) + 0.05 * Math.exp(-Math.pow((t - knee + 0.09) / 0.03, 2));
      const shaft = 0.2 + 0.1 * smooth(0.5, 0.0, t) - 0.05 * smooth(0.55, 1, t);
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
      const cell = cells2(((a / (Math.PI * 2)) * 6 + 0.35 * Math.sin(s * 1.7 + seed)) * k, (s * 2.3 + seed + bend) * k, 6 * k);
      const id = cell[1];
      const h2 = (id * 57.31) % 1;
      const h5 = (id * 711.3) % 1;
      // They went in patches: stretches of the limb are bare bark, with a scab or two left on them.
      const bare = 0.1 + 0.55 * smooth(0.4, 0.64, noise2(s * 0.9 + seed * 3, Math.cos(a + seed) * 1.3 + 1.5)) + 0.2 * Math.exp(-Math.pow((t - knee) / 0.05, 2));
      const inside = (cell[0] - 0.035 - 0.1 * h2) / k + 0.03 * (noise2(a * 9 + seed, s * 14) - 0.5) + 0.012 * (noise2(a * 23, s * 37 + seed) - 0.5);
      const plate = id > bare ? smooth(0, 0.015, inside) * thin : 0;
      // A plate curls: its edge stands off the limb, one side of it more than the other.
      const toward = Math.min(1, Math.max(0, 0.5 + (h5 > 0.5 ? 1 : -1) * cell[3] * 1.3));
      const curl = smooth(0.16, 0.0, inside * k) * (0.25 + 0.75 * toward);
      const lift = plate * (0.016 + (0.03 * h2 + 0.008) * curl + 0.008 * noise2(a * 5 + seed, s * 9));
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
