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
/** Where there is no skin the field lies this far under the lake's crust, and the sheet is not drawn. */
export const UNDER = -0.12;

export const BODY = {
  centre: new THREE.Vector3(-3.5, 0.8, -0.4),
  radii: new THREE.Vector3(2.55, 1.75, 1.8),
  // Tilted: the back turned up toward the bench side, the neck end down in the crust.
  turn: new THREE.Euler(0.3, 0.2, 0.2, 'YXZ'),
};

export type P3 = [number, number, number];

/** The two legs that stand out: the hip is inside the body, the knee is the top of the arch. */
export const LEG_A: P3[] = [
  [-2.75, 0.46, 0.25],
  [-2.15, 1.17, 0.5],
  [-1.15, 2.5, 0.72],
  [-0.1, 3.9, 0.87],
  [0.8, 4.95, 0.92],
  [1.1, 5.3, 0.92],
  [1.36, 5.4, 0.9],
  [1.6, 5.1, 0.86],
  [1.85, 4.6, 0.78],
  [2.5, 3.55, 0.56],
  [3.45, 1.85, 0.12],
  [4.3, 0.45, -0.27],
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
  return 3.4 + 0.5 * best;
}

// How far the skin that was pushed out ran over the lake's crust before it froze, by the same direction: a broad sheet toward
// the bench that fills the ground before it, and tongues of very different length. It ends in a front that stands on the crust.
const TONGUES: [number, number, number][] = [
  [158, 16, 6.5],
  [196, 10, 3.2],
  [252, 22, 4.5],
  [300, 9, 7.0],
  [338, 12, 2.2],
  [12, 11, 5.6],
  [38, 8, 2.5],
];
function runOut(x: number, z: number): number {
  const phi = (Math.atan2(z - FIELD.cz, x - FIELD.cx) * 180) / Math.PI;
  const front = ((((phi - 88) % 360) + 540) % 360) - 180;
  let best = 7.9 * Math.exp(-Math.pow(front / 52, 4));
  for (const [at, wide, far] of TONGUES) {
    const off = ((((phi - at) % 360) + 540) % 360) - 180;
    best = Math.max(best, far * Math.exp(-(off * off) / (wide * wide)));
  }
  return 3.0 + best;
}

/** A plate of the lake's crust that the front broke off and tilted up against itself, or a piece of one lying before it. */

// The rounded front of a sheet of lava, `inside` metres in from its edge: it rises steeply and levels off at `thick`.
function frontOf(inside: number, thick: number): number {
  if (inside <= 0) return 0;
  const k = 1 - Math.min(1, inside / 0.32);
  return thick * Math.sqrt(1 - k * k);
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
function hull(v: number, a: number, fine: boolean, p: THREE.Vector3, o: THREE.Vector3): { ring: number; s: number; furrow: number; plate: number } {
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
  let plate = 0;
  if (fine) {
    // The hide dried onto the frame in cords that run the length of the body and wind a little round it, as it twisted going down.
    const wind = a + 2.3 * along + 0.45 * Math.sin(s * 1.3 + 0.7) + 1.1 * (noise3(s * 0.4 + 9, dy, dz) - 0.5);
    const f1 = Math.abs(Math.sin(wind * 2.0 + 5.5 * noise3(s * 0.45 + 5, dy * 0.9, dz * 0.9)));
    const f2 = Math.abs(Math.sin(wind * 13 + 6.5 * noise3(s * 1.1 + 5, dy * 2.3, dz * 2.3) + 2.2 * noise3(s * 3.1, dy * 5.0, dz * 5.0 + 3) + 1.5 * f1));
    // The wrinkles are deep in some places and gone in others.
    const wrinkled = 0.25 + 1.5 * smooth(0.3, 0.7, noise3(s * 0.9 + 31, dy * 1.9, dz * 1.9));
    furrow = Math.pow(1 - f1, 1.6);
    const full = Math.min(1, ring * 1.4);
    r -= (0.21 * furrow * (0.4 + 1.2 * dry) + 0.04 * wrinkled * Math.pow(1 - f2, 2.2) * (0.4 + 1.2 * dry)) * full;
    // The frame under it: ribs across the flank, the spine as a keel.
    const ribs = Math.pow(0.5 + 0.5 * Math.cos(s * 6.8 + 1.1 * Math.sin(a * 2 + s) + 2.0 * noise2(s * 0.9, dy * 1.3)), 3);
    r += 0.03 * ribs * smooth(0.15, 0.75, Math.abs(dz)) * ring;
    const spine = Math.exp(-Math.pow(Math.min(a, Math.PI * 2 - a) / 0.13, 2));
    r += 0.06 * spine * (0.6 + 0.4 * Math.cos(s * 11));
    r += 0.025 * (noise3(s * 7, dy * 5, dz * 5) - 0.5);
    // The same plates as on the trunks, on the side that looks up: 20 to 60 cm, ragged, lifting at their edges.
    const cell = cells2((a / (Math.PI * 2)) * 20 + 0.9 * Math.sin(s * 1.9) + 1.2 * noise2(s * 0.8 + 4, a), s * 1.3 + 0.9 * noise2(a * 2, s + 3), 20);
    const id = cell[1];
    const upper = smooth(0.15, 0.75, dy) * Math.min(1, ring * 1.6);
    const gone = 1 - 0.28 * upper * (0.4 + 0.6 * smooth(0.3, 0.6, noise3(s * 0.7 + 21, dy * 1.3, dz * 1.3)) + 0.3);
    const inside = cell[0] - 0.05 - 0.1 * ((id * 57.31) % 1) + 0.12 * (noise2(a * 7, s * 3) - 0.5);
    plate = id > gone ? smooth(0, 0.07, inside) : 0;
    const toward = Math.min(1, Math.max(0, 0.5 + ((id * 711.3) % 1 > 0.5 ? 1 : -1) * cell[3] * 1.3));
    r += (plate * (0.025 + 0.06 * smooth(0.16, 0, inside) * (0.25 + 0.75 * toward))) / Math.max(0.5, ring);
    plate *= 0.72 + 0.28 * ((id * 131.7) % 1);
  }
  o.set(0, dy * R.y, dz * R.z).multiplyScalar(ring * r);
  p.set(along * R.x * (0.9 + 0.1 * r), o.y, o.z).applyQuaternion(BQ).add(BODY.centre);
  o.normalize().applyQuaternion(BQ);
  return { ring, s, furrow, plate };
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
  /** The phase the cords are counted along, metres: round the girth of a rope, and turning round it along its length. */
  phase: number;
  /** Metres along the rope the point is on, from its middle. */
  along: number;
  /** 0 to 1: how strongly the skin is corded here. */
  cords: number;
  /** 0 to 1: the skin is the folded one here. */
  folded: number;
  /** 0 to 1: the tone of the sheet of skin the point is on. */
  tone: number;
}

/** A rope of the skin: a thick round fold that runs part of the way round the body (or round the eye of the swirl beside it),
 *  moving out or in as it goes, so that ropes of different pitch cross and lie over each other. */
interface Rope {
  /** 0: round the body and the feet; 1: round the eye. */
  about: number;
  /** Angles of its two ends, radians: 0 is toward the bench, positive is to the left. They may pass the back. */
  a0: number;
  a1: number;
  /** Metres out from the body at its two ends. */
  d0: number;
  d1: number;
  /** Half its thickness, metres. */
  r: number;
  /** Its place in the pile: a rope lies over those of lower level where they cross. */
  level: number;
  sway: number;
  beat: number;
  seed: number;
  tone: number;
  main: boolean;
  /** Metres of girth the fibres turn round the rope for each metre of its length: a rope is wrung, not combed. */
  twist: number;
  /** Metres of length for a radian of its angle. */
  mean: number;
  /** A small rope keeps to a main one: it is this far across from the middle of it at its two ends. */
  parent?: Rope;
  /** The skin of this one is split along its flank and glows there, between these angles. */
  split?: [number, number];
}

const DEG = Math.PI / 180;
/** Metres a pile of ropes stands as it is counted, and the most it stands over that. */
const PILE = { knee: 0.38, over: 0.34 };
/** The eye of the swirl, on the side the crust left by. */
export const EYE: [number, number] = [-7.3, 3.2];

function makeRopes(): Rope[] {
  // The main ones, six to ten of them seen from the bench: 0.4 to 0.9 m thick.
  const main: [number, number, number, number, number, number, number][] = [
    [0, 115, -65, 0.0, 0.5, 0.36, 5],
    [0, 175, 5, 0.25, 0.95, 0.52, 4],
    [0, 65, -125, 0.7, 1.5, 0.3, 3],
    [0, 150, -25, 2.0, 1.2, 0.46, 3.5],
    [0, 35, -175, 1.9, 2.9, 0.24, 2],
    [0, 140, -60, 2.5, 3.6, 0.42, 1.5],
    [0, 85, -115, 3.8, 3.1, 0.2, 1.7],
    [0, 165, 15, 4.0, 4.9, 0.34, 1],
    [0, 25, -150, 4.5, 5.5, 0.18, 0.8],
    [1, -70, 290, 0.55, 1.25, 0.36, 4.5],
    [1, 80, 400, 1.55, 2.2, 0.22, 2.5],
  ];
  const ropes: Rope[] = main.map(([about, a0, a1, d0, d1, r, level], i) => ({
    about,
    a0: a0 * DEG,
    a1: a1 * DEG,
    d0,
    d1,
    r,
    level,
    sway: 0.16 + 0.22 * hash(i, 1, 201),
    beat: 1.7 + 2.2 * hash(i, 2, 201),
    seed: 6.28 * hash(i, 3, 201),
    tone: 0.1 + 0.8 * hash(i, 4, 201),
    main: true,
    twist: (hash(i, 15, 201) < 0.5 ? -1 : 1) * (0.14 + 0.3 * hash(i, 16, 201)),
    mean: about === 0 ? 2.4 + 0.5 * (d0 + d1) : Math.max(0.6, 0.5 * (d0 + d1)),
  }));
  (ropes[9] as Rope).split = [-95 * DEG, 55 * DEG];
  // The second size, 0.1 to 0.2 m, only on the main ones and in the gaps beside them.
  const count = ropes.length;
  for (let i = 0; i < 44; i++) {
    const parent = ropes[Math.floor(hash(i, 5, 202) * count * 0.999)] as Rope;
    const span = parent.a1 - parent.a0;
    const from = 0.05 + 0.75 * hash(i, 6, 202);
    const length = Math.min(0.95 - from, (0.5 + 1.0 * hash(i, 7, 202)) / Math.abs(span));
    ropes.push({
      about: parent.about,
      a0: parent.a0 + span * from,
      a1: parent.a0 + span * (from + length),
      d0: parent.r * 3.0 * (hash(i, 8, 202) - 0.5),
      d1: parent.r * 3.0 * (hash(i, 9, 202) - 0.5),
      r: 0.03 + 0.08 * Math.pow(hash(i, 10, 202), 1.6),
      level: parent.level + 0.2 + 0.2 * hash(i, 11, 202),
      sway: 0.03,
      beat: 7 + 5 * hash(i, 12, 202),
      seed: 6.28 * hash(i, 13, 202),
      tone: 0.1 + 0.8 * hash(i, 14, 202),
      main: false,
      twist: (hash(i, 15, 202) < 0.5 ? -1 : 1) * (0.2 + 0.5 * hash(i, 16, 202)),
      mean: parent.mean,
      parent,
    });
  }
  return ropes.sort((a, b) => a.level - b.level);
}

/** Metres out from the body of the middle of a rope at an angle, and how fast that changes with the angle. */
function ropeMiddle(k: Rope, a: number, into: [number, number]): void {
  const t = (a - k.a0) / (k.a1 - k.a0);
  let c = k.d0 + (k.d1 - k.d0) * t + k.sway * (Math.sin(k.beat * a + k.seed) + 0.5 * Math.sin(2.7 * k.beat * a + 1.9 * k.seed));
  let slope = (k.d1 - k.d0) / (k.a1 - k.a0) + k.sway * k.beat * Math.cos(k.beat * a + k.seed);
  if (k.parent) {
    ropeMiddle(k.parent, a, into);
    c += into[0];
    slope += into[1];
  }
  into[0] = c;
  into[1] = slope;
}

export function makeField(lakeSeam: [number, number][]): (x: number, z: number) => FieldPoint {
  const tent = makeTent();
  const festoons = makeFestoons();
  const ropes = makeRopes();
  const R = BODY.radii;
  const middle: [number, number] = [0, 0];
  // Metres inside the front of the skin that ran out. Its line is scalloped: each scallop is a toe of the sheet.
  const within = (x: number, z: number): number => {
    const wx = x + 1.0 * (noise2(x * 0.27 + 3.1, z * 0.27) - 0.5);
    const wz = z + 1.0 * (noise2(x * 0.27 + 11.7, z * 0.27 + 5.2) - 0.5);
    // Counted from a round middle, not from the long body: far out a front forgets the shape of what it came round.
    const d = Math.max(0, Math.min(Math.hypot(wx - BODY.centre.x, wz - BODY.centre.z) - 2.1, Math.hypot(wx - FOOT_A[0], wz - FOOT_A[1]) - 0.8, Math.hypot(wx - FOOT_B[0], wz - FOOT_B[1]) - 0.8));
    const toes = 1.5 * (noise2(x * 0.33 + 90, z * 0.33 + 14) - 0.5) + 0.9 * Math.abs(2 * noise2(x * 0.85 + 5, z * 0.85 + 71) - 1) + 0.35 * Math.abs(2 * noise2(x * 2.2 + 61, z * 2.2 + 8) - 1) - 0.6;
    const box = FIELD.half - 1.3 - Math.max(Math.abs(x - FIELD.cx), Math.abs(z - FIELD.cz));
    return Math.min(runOut(x, z) - d - toes, box);
  };
  return (x, z) => {
    const n1 = noise2(x * 0.27 + 3.1, z * 0.27);
    const n2 = noise2(x * 0.27 + 11.7, z * 0.27 + 5.2);
    const wx = x + 1.0 * (n1 - 0.5) + 0.3 * (noise2(x * 1.07, z * 1.07 + 7.3) - 0.5);
    const wz = z + 1.0 * (n2 - 0.5) + 0.3 * (noise2(x * 1.07 + 9.9, z * 1.07) - 0.5);
    const dBody = bodyDistance(wx, wz);
    const dFootA = Math.hypot(wx - FOOT_A[0], wz - FOOT_A[1]) - 0.3;
    const dFootB = Math.hypot(wx - FOOT_B[0], wz - FOOT_B[1]) - 0.2;
    // The ropes turn round the body and round the foot of each leg as one shape.
    const d = smin(smin(dBody, dFootA + 0.5, 1.6), dFootB + 0.5, 1.6);
    const dTrue = Math.min(bodyDistance(x, z), Math.hypot(x - FOOT_A[0], z - FOOT_A[1]) - 0.3, Math.hypot(x - FOOT_B[0], z - FOOT_B[1]) - 0.2);
    const dd = Math.max(d, 0);

    const ox = x - BODY.centre.x;
    const oz = z - BODY.centre.z;
    const ol = Math.hypot(ox, oz) || 1;
    const up = 0.5 + (0.5 * (ox * UPSTREAM[0] + oz * UPSTREAM[1])) / ol;

    // Where the folded skin ends. The ropes die out over the last metres of it and its low billows run on into the lake's crust.
    const out = reach(x, z);
    const wobble = 1.1 * (noise2(x * 0.45 + 33, z * 0.45 + 2) - 0.5) + 0.35 * (noise2(x * 1.9 + 3, z * 1.9 + 41) - 0.5);
    const inside = out - dd - wobble;
    // Past the mound the skin ran on as a thin sheet, to its front.
    const run = within(x, z);
    const edge = smooth(0, 3.6, inside) * smooth(0, 1.2, run);
    const sheet = smooth(-0.05, 0.35, run);

    let h = -0.1 * Math.exp(-Math.pow(dd / 2.4, 2)) * edge;
    // The skin rode up against the body and the legs: highest on the side it came from and at the end that went under first.
    const climb = (0.25 + 0.2 * up + 0.3 * (noise2(x * 0.5 + 44, z * 0.5 + 12) - 0.5)) * edge;
    h += climb * Math.exp(-Math.pow(dd / 2.6, 1.5));
    // Billows of the skin where it did not fold.
    h += ((fbm2(x * 0.6 + 70, z * 0.6, 4) - 0.47) * 0.26 + (noise2(x * 2.3 + 9, z * 2.3) - 0.5) * 0.05) * edge;

    // Rings of the skin round the foot of each leg.
    for (const [fx, fz] of [FOOT_A, FOOT_B]) {
      const r = Math.hypot(x - fx, z - fz) + 0.3 * (noise2(x * 1.3 + fx, z * 1.3) - 0.5);
      const ring = r / 0.27 + 2.5 * noise2(x * 0.8 + 5, z * 0.8 + fz);
      h += (0.1 * Math.pow(0.5 + 0.5 * Math.cos(ring * 6.2832), 0.6) + 0.22) * Math.exp(-Math.pow(r / 0.75, 2));
    }

    const bare = h;
    // The drape: a thin skin rode up over the body from the side it came from and from the end that went under first, and round
    // the base of each leg. Where it stops it stops in a rounded lip; past that the hide is bare, or a rope lies over it.
    const top = tent(x, z);
    const bu = (ox * BC - oz * BS) / R.x;
    const bw = (ox * BS + oz * BC) / R.z;
    const rag = fbm2(x * 0.9 + 14, z * 0.9 + 51, 3) - 0.5;
    let cover = 0.2 + 0.85 * bw - 0.7 * bu + 1.1 * rag;
    // Outside the body there is nothing to be bare.
    cover = Math.max(cover, smooth(-0.15, 0.25, bodyDistance(x, z)));
    let near = 9;
    for (const [lx, lz] of [
      [-2.2, 0.45],
      [-2.4, -1.2],
    ] as [number, number][]) near = Math.min(near, Math.hypot(x - lx, z - lz));
    cover = Math.max(cover, 0.6 - near * 0.75 + 0.5 * rag);
    const lip = smooth(0, 0.22, cover);
    const draped = top + 0.07;
    // Where the body stands higher than the skin climbed, it stands out of it bare: the skin ends against it.
    const rode = h + 0.2 + 0.5 * smooth(0.1, 0.9, cover) * (0.5 + 0.5 * up);
    if (draped > h) h = mix(h, Math.min(draped, rode), Math.sqrt(lip) * smooth(0, 0.12, draped - h));

    // The ropes. Each lies on what is under it: the skin, the body where it crosses the body, and the ropes of lower level.
    const angBody = Math.atan2(-(wx - BODY.centre.x), wz - BODY.centre.z);
    const rhoBody = Math.max(0.6, Math.hypot(wx - BODY.centre.x, wz - BODY.centre.z));
    const rhoEye = Math.hypot(wx - EYE[0], wz - EYE[1]);
    const angEye = Math.atan2(-(wx - EYE[0]), wz - EYE[1]);
    // They die out over the last metres of the skin.
    const fade = smooth(0.2, 3.8, inside + 1.2) * smooth(0.3, 1.5, run);
    // A rope that crosses the body lies on it, but none climbs higher than the skin could push it.
    const lying = Math.max(h, Math.min(top, bare + 0.5));
    let hard = 0;
    let soft = 0;
    let phase = 0;
    let along = 0;
    let cords = 0;
    let tone = 0.5;
    let heat = 0;
    let onRope = 0;
    if (fade > 0.01) {
      for (const k of ropes) {
        const ang = k.about === 0 ? angBody : angEye;
        const lo = Math.min(k.a0, k.a1);
        const hi = Math.max(k.a0, k.a1);
        for (let turn = -1; turn <= 1; turn++) {
          const a = ang + turn * 2 * Math.PI;
          if (a < lo || a > hi) continue;
          ropeMiddle(k, a, middle);
          const t = (a - k.a0) / (k.a1 - k.a0);
          const rho = k.about === 0 ? rhoBody : Math.max(0.3, rhoEye);
          const e = ((k.about === 0 ? d : rhoEye) - middle[0]) / Math.hypot(1, middle[1] / rho);
          // It thins to nothing at each end, where it goes under, and is not of one girth between.
          const r = k.r * Math.sqrt(smooth(0, 0.1, t) * smooth(1, 0.9, t)) * (0.78 + 0.22 * Math.sin(a * 5.3 + k.seed * 3) + 0.2 * Math.sin(a * 2.1 + k.seed * 5)) * (0.55 + 0.45 * fade);
          const ae = Math.abs(e);
          if (ae > 1.6 * r || r < 0.01) continue;
          const stands = 1.25 * r * (0.3 + 0.7 * fade);
          const wide = smooth(1.7 * r, 0.5 * r, ae);
          if (ae < r) {
            const round = Math.cos((0.5 * Math.PI * ae) / r);
            // Its middle rides on the pile under it; its edges come down to the surface that is really there, so it has no wall
            // of its own. A small rope has no pile: it lies on the flank of its main one wherever that is.
            const settle = k.main ? smooth(0, 0.7, round) : 0;
            const gap = Math.max(0, soft - hard);
            if (round > 0.001) {
              hard += gap * settle + stands * round;
              // The fibres are counted round the girth of the rope, so they are as wide on its flank as on its back: the first
              // two terms are the way over its back from its middle, which is 1.6 r at its edge.
              // Both are counted on the surface and not on the ground: where the rope climbs what is under it, or comes down onto
              // the rope under it, the height is part of the way. Without it the fibres are drawn out down every steep place.
              along = (a - 0.5 * (k.a0 + k.a1)) * k.mean + 0.7 * lying + 0.8 * gap * settle;
              // Round the body what is under a rope falls away outward, as the girth is counted: the fall is added to the way and
              // not taken from it, or the two cancel and the fibres stand upright on every flank that looks away from the body.
              phase = e + 0.6 * r * Math.sign(e) * Math.pow(ae / r, 2.2) + Math.sign(e) * gap * (1 - settle) + (k.about === 0 ? -0.9 : 0.7) * lying + 0.05 * Math.sin(a * 6.1 + k.seed) + k.twist * along;
              // Round the eye the ropes turn so tightly that strong fibres would read as rings.
              // Never nought on a rope: the shader knows a rope by it, and lays its textures by the rope there.
              cords = Math.max(0.06, smooth(0.04, 0.3, round) * (k.main ? 1 : 0.7) * (k.about === 1 ? 0.8 : 1));
              tone = k.tone;
              onRope = smooth(0, 0.25, round);
              heat = 0;
              if (k.split && a > k.split[0] && a < k.split[1]) {
                // The rent: the skin of this rope split along the flank that looks at the bench, in two or three lengths, 3 to 8 cm wide.
                const along = smooth(k.split[0], k.split[0] + 0.12, a) * smooth(k.split[1], k.split[1] - 0.12, a);
                const lengths = smooth(0.3, 0.42, noise2(a * 3.1 + 5, 2.7));
                const width = (0.022 + 0.018 * noise2(a * 9 + 1, 4.4)) * along * lengths;
                const at = e - r * (0.56 + 0.1 * noise2(a * 4.3, 8.1));
                heat = smooth(width, width * 0.35, Math.abs(at)) * smooth(0.004, 0.015, width);
              }
            }
          }
          soft = Math.max(soft, (0.5 * soft + 0.9 * stands) * wide);
        }
      }
    }
    // Ropes that lie on ropes are pressed flat: a pile is a broad low back, never a peak.
    if (hard > PILE.knee) hard = PILE.knee + PILE.over * (1 - Math.exp(-(hard - PILE.knee) / PILE.over));
    if (hard > 0) h = Math.max(h, lying + hard);

    // Elsewhere the skin is smooth, with low swells where a sheet of it lies on the next.
    // The phase is kept small, within a rope, because half floats carry it: the shader moves each rope along by its tone.
    cords *= sheet;
    const fxw = x + 0.3 * (noise2(x * 0.9 + 60, z * 0.9) - 0.5);
    const fzw = z + 0.3 * (noise2(x * 0.9, z * 0.9 + 60) - 0.5);
    let block = 1 - onRope;
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
      h += 0.035 * halo * block * sheet;
      block *= 1 - halo;
    }

    // The lake's seam runs on under the folded skin: the skin stands a little proud along it.
    const [ds] = polyDistance(lakeSeam, x, z);
    h += 0.08 * Math.exp(-Math.pow(ds / 0.7, 2)) * edge;

    // The sheet that ran out: a front that stands on the lake's crust, and inside it the fronts of the sheets that overran it.
    // Outside it the field is under the crust, so the sheet ends where it meets whatever the lake is there and not on a blend.
    h += frontOf(run, 0.09 + 0.1 * noise2(x * 0.37 + 81, z * 0.37 + 7));
    h += frontOf(run - 1.5 - 2.2 * (noise2(x * 0.5 + 15, z * 0.5 + 3) - 0.5) - 0.8 * Math.abs(2 * noise2(x * 1.1 + 27, z * 1.1 + 44) - 1), 0.08);
    h += frontOf(run - 3.6 - 3.0 * (noise2(x * 0.42 + 52, z * 0.42 + 19) - 0.5) - 0.8 * Math.abs(2 * noise2(x * 1.3 + 7, z * 1.3 + 33) - 1), 0.07);
    h = mix(UNDER, h, smooth(-0.04, 0, run));
    // The outer metres of the sheet are the lake's own skin in tone and grain: from above no edge of a pad shows on the plain.
    return { h, heat, d: dTrue, phase, along, cords: Math.min(1, Math.max(0, cords)), folded: sheet * smooth(0.2, 3.6, run), tone };
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
  /** r: metres along the rope the point is on. Half float. */
  along: THREE.DataTexture;
  /** The glowing split in three lengths: the middle of each, and the area of all of it, square metres. */
  tear: { points: P3[]; area: number };
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
  const along = new Uint16Array(n * n);
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
      along[j * n + i] = THREE.DataUtils.toHalfFloat(p.along);
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
  const hotAt: [number, number, number, number][] = [];
  for (let k = 0; k < n * n; k++) {
    if ((heat[k] as number) < 0.3) continue;
    const x = FIELD.cx - FIELD.half + ((k % n) + 0.5) * cell;
    const z = FIELD.cz - FIELD.half + (Math.floor(k / n) + 0.5) * cell;
    hotAt.push([Math.atan2(-(x - EYE[0]), z - EYE[1]), x, height[k] as number, z]);
  }
  hotAt.sort((a, b) => a[0] - b[0]);
  const third = Math.max(1, Math.ceil(hotAt.length / 3));
  const tearPoints: P3[] = [0, 1, 2].map((i) => {
    const part = hotAt.slice(i * third, (i + 1) * third);
    const m = Math.max(1, part.length);
    return [part.reduce((s, q) => s + q[1], 0) / m, part.reduce((s, q) => s + q[2], 0) / m, part.reduce((s, q) => s + q[3], 0) / m];
  });
  const linesTexture = new THREE.DataTexture(lines, n, n, THREE.RGBAFormat, THREE.HalfFloatType);
  linesTexture.minFilter = THREE.LinearFilter;
  linesTexture.magFilter = THREE.LinearFilter;
  linesTexture.colorSpace = THREE.NoColorSpace;
  linesTexture.needsUpdate = true;
  const alongTexture = new THREE.DataTexture(along, n, n, THREE.RedFormat, THREE.HalfFloatType);
  alongTexture.minFilter = THREE.LinearFilter;
  alongTexture.magFilter = THREE.LinearFilter;
  alongTexture.colorSpace = THREE.NoColorSpace;
  alongTexture.needsUpdate = true;
  return { height, relief: dataTexture(relief, n), mask: dataTexture(mask, n), lines: linesTexture, along: alongTexture, tear: { points: tearPoints, area: hotAt.length * cell * cell }, at };
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
  // The bench is toward +z: the rows nearest to it are drawn first, so a rope hides the ground behind it before that is shaded.
  const order = Array.from({ length: kept.length / 3 }, (_, i) => i).sort((i, j) => p.getZ(kept[j * 3] as number) - p.getZ(kept[i * 3] as number) || i - j);
  g.setIndex(order.flatMap((i) => [kept[i * 3] as number, kept[i * 3 + 1] as number, kept[i * 3 + 2] as number]));
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
  /** 1 on a plate of hide, 0 on the bark under it. */
  feature: number;
  /** 0 to 1: how much of the sky the point sees. */
  open: number;
  /** Legs: 0 to 1, sinew shows. Body: how deep in a furrow of the hide. */
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
  radius: (s: number, angle: number, t: number, up: number) => [number, number, number],
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
      const [r, feature, bone] = radius(t * length, a, t, n.y);
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
      surf[k * 4 + 1] = at.plate;
      surf[k * 4 + 2] = (0.45 + 0.55 * smooth(-0.05, 0.5, lava.above)) * (1 - 0.5 * at.furrow * (1 - at.plate));
      // How deep in a furrow between two cords of the hide the point is.
      surf[k * 4 + 3] = at.furrow * (1 - at.plate);
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
  /** How much of the hide is left on it: 0 about half of the side that looks up, 1 most of the limb with dark gaps. */
  cover: number;
}

/** A leg dried to tendon and joint: thin shafts, a swollen knee, cords standing out along it, plates of caked hide lifting off it. */
export function legGeometry(shape: LegShape, baked: Baked): Tube {
  const { knee, scale, seed, tendon } = shape;
  return tube(
    shape.points,
    shape.rings,
    shape.round,
    KIND.leg,
    (s, a, t, up) => {
      // A bent trunk: thick where it leaves the body, one rounded knuckle at the top, tapering as it goes down into the crust.
      const joint = 0.13 * Math.exp(-Math.pow((t - knee) / 0.032, 2)) + 0.05 * Math.exp(-Math.pow((t - knee + 0.07) / 0.025, 2)) + 0.04 * Math.exp(-Math.pow((t - knee - 0.06) / 0.02, 2));
      // The shaft dried flat: broad across the bend of the limb, thin through it, and split along its broad face.
      const flat = 1 - 0.16 * Math.cos(2 * a) * (1 - 0.7 * Math.exp(-Math.pow((t - knee) / 0.05, 2)));
      const split = 0.07 * Math.exp(-Math.pow(Math.sin(a - 0.35 * Math.sin(s * 0.9 + seed)) / 0.16, 2)) * smooth(0.35, 0.6, noise2(s * 0.5 + seed * 3, 7.7));
      const shaft = 0.2 + 0.1 * smooth(0.5, 0.0, t) - 0.05 * smooth(0.55, 1, t);
      const cords = 0.2 * Math.cos(2 * a + s * 0.8 + seed) + 0.12 * Math.cos(3 * a - s * 1.5 + seed * 2) + 0.06 * Math.cos(5 * a + s * 2.3);
      const lumps = 0.4 * (fbm3(s * 1.6 + seed, Math.cos(a) * 0.8, Math.sin(a) * 0.8, 3) - 0.47);
      const thin = tendon > 0 ? smooth(1 - tendon * 0.2, 1 - tendon, t) : 1;
      const end = smooth(0, 0.03, t) * (tendon > 0 ? 1 : smooth(1, 0.985, t));
      const core = scale * end * (0.045 + thin * ((shaft + joint) * flat * (1 + cords * 0.3 + lumps) - split - 0.045));
      // Plates of hide caked with ash, 20 to 60 cm, ragged in outline. About half of the side that looks up still has them, little
      // of the underside. Each is shrunk from its neighbours by its own margin and curls at its edge.
      const bend = 0.7 * (noise2(s * 0.8 + seed * 2, Math.cos(a) * 0.9 + 4) - 0.5);
      const fineHere = noise2(s * 0.6 + seed * 5, Math.sin(a + seed) * 0.8 + 2) > 0.62;
      const k = fineHere ? 2 : 1;
      const cell = cells2(((a / (Math.PI * 2)) * 7 + 0.35 * Math.sin(s * 1.7 + seed)) * k, (s * 0.75 + seed + bend) * k, 7 * k);
      const id = cell[1];
      const h2 = (id * 57.31) % 1;
      const h5 = (id * 711.3) % 1;
      const patch = smooth(0.35, 0.65, noise2(s * 0.7 + seed * 3, Math.cos(a + seed) * 1.1 + 1.5));
      const floor = 0.3 + 0.35 * shape.cover;
      const bare = 1 - (0.8 + 0.3 * shape.cover) * (floor + (1 - floor) * smooth(-0.35, 0.5, up)) * (0.7 + 0.6 * patch) + 0.25 * Math.exp(-Math.pow((t - knee) / 0.05, 2));
      const ragged = 0.1 * (noise2(a * 7 + seed, s * 6) - 0.5) + 0.04 * (noise2(a * 19, s * 21 + seed) - 0.5);
      const inside = (cell[0] - 0.012 - 0.06 * h2) / k + ragged / k;
      const plate = id > bare ? smooth(0, 0.045, inside) * thin : 0;
      // A plate curls: its edge stands off the limb, one side of it more than the other.
      const toward = Math.min(1, Math.max(0, 0.5 + (h5 > 0.5 ? 1 : -1) * cell[3] * 1.3));
      const curl = smooth(0.16, 0.0, inside * k) * (0.25 + 0.75 * toward);
      const lift = plate * (0.02 + (0.035 * h2 + 0.015) * curl + 0.01 * noise2(a * 5 + seed, s * 9));
      // Sinew shows pale along the cords where the hide is gone.
      const bone = (1 - plate) * smooth(-0.1, 0.25, cords) * thin + (1 - thin) * 0.6;
      // Each plate is of its own tone: the shader reads it from how far over a half the mark is.
      return [core + scale * lift, plate * (0.72 + 0.28 * ((id * 131.7) % 1)), bone];
    },
    (p, s, a, t) => {
      const lava = lavaCoat(baked, p, t > 0.5 ? 0.5 : 0.55, seed * 7);
      const recess = 0.72 + 0.28 * smooth(-0.1, 0.25, Math.cos(2 * a + s * 0.8 + seed));
      return { out: lava.out * 1.2, coat: lava.coat, feature: 0, bone: 0, open: (0.36 + 0.64 * smooth(-0.1, 0.9, lava.above)) * recess };
    },
    (c) => c.y < baked.at(c.x, c.z) - 0.55,
  );
}

/** A rag of hide that hangs from a limb: a strip torn off along the limb and held by one end, shrunk by the heat, so it is
 *  narrow, of uneven width with pieces torn out of its edges, cupped across, twisted along its length and frayed to a point. */
export function ragGeometry(at: P3, length: number, half: number, yaw: number, seed: number, rows = 56, columns = 14): THREE.BufferGeometry {
  const count = (rows + 1) * (columns + 1);
  const position = new Float32Array(count * 3);
  const map = new Float32Array(count * 4);
  const surf = new Float32Array(count * 4);
  const p = new THREE.Vector3();
  const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, yaw, 0.08));
  const top = new THREE.Vector3(at[0], at[1], at[2]);
  for (let i = 0; i <= rows; i++) {
    const v = i / rows;
    // Width: uneven, a bite out of one edge here and there, and the last third frayed down to a thread.
    const wide = half * (0.4 + 0.9 * noise2(v * 3.7 + seed * 7.1, 1.3)) * smooth(0, 0.05, v) * (1 - 0.9 * smooth(0.6, 1, v)) + 0.008;
    const biteA = 0.75 * smooth(0.55, 0.7, noise2(v * 7.3 + seed * 3.3, 5.1));
    const biteB = 0.75 * smooth(0.6, 0.75, noise2(v * 6.1 + seed * 9.7, 8.4));
    const twist = 1.4 * v * (seed % 2 === 0 ? 1 : -1) + 0.7 * Math.sin(v * 5.2 + seed);
    const ct = Math.cos(twist);
    const st = Math.sin(twist);
    // It does not hang straight: it dried with a bend and a kink in it.
    const offX = length * (0.1 * Math.sin(v * 2.4 + seed * 1.7) + 0.035 * Math.sin(v * 9 + seed));
    const offZ = length * 0.08 * Math.sin(v * 3.1 + seed * 2.9);
    const drop = v * length * (1 - 0.06 * Math.sin(v * 7 + seed));
    for (let j = 0; j <= columns; j++) {
      const a = ((j % columns) / columns) * Math.PI * 2;
      const side = Math.cos(a);
      const face = Math.sin(a);
      const x = side * wide * (side > 0 ? 1 - biteA : 1 - biteB);
      const thick = 0.012 + 0.01 * noise2(x * 30 + seed, v * 9);
      // Cupped across as it shrank, with small wrinkles across the cup.
      const z = face * thick + 0.9 * (x * x) / Math.max(0.02, wide) + 0.006 * Math.sin(v * length * 55 + 4 * side);
      p.set(x * ct - z * st + offX, -drop, x * st + z * ct + offZ);
      p.applyQuaternion(turn).add(top);
      const k = i * (columns + 1) + j;
      position[k * 3] = p.x;
      position[k * 3 + 1] = p.y;
      position[k * 3 + 2] = p.z;
      map[k * 4] = (j / columns) * 0.5;
      map[k * 4 + 1] = v * 1.6;
      map[k * 4 + 2] = 2;
      map[k * 4 + 3] = KIND.pad;
      surf[k * 4] = 0;
      // Mostly the dark inner side of the hide; the outer side keeps patches of its pale crust.
      surf[k * 4 + 1] = 0.85 * smooth(0.45, 0.65, noise2(v * 4 + seed * 5, side * 1.5 + 3)) * smooth(-0.2, 0.5, face);
      surf[k * 4 + 2] = 0.6 + 0.4 * smooth(-0.3, 0.6, face);
      surf[k * 4 + 3] = 0.35 * smooth(0.12, 0.0, v);
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
