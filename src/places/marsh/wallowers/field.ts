// The body of a mud-wallower as one signed distance field: ellipsoids and tapered limbs along its skeleton, melted into each other, with the
// slack folds of its hide pressed into the field itself. `nets.ts` takes the surface once; `body.ts` bends it by the bones.
// Rest pose of an adult of size 1, metres: x forward, y up, z to the right, the origin on the ground under the middle of the trunk.
import type { Box, Field } from './nets';

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const BONES = 17;
export const PELVIS = 0;
export const BELLY = 1;
export const CHEST = 2;
export const NECK = 3;
export const HEAD = 4;
/** Leg l (LH, LF, RH, RF) has bones LEG + 3 l (upper), + 1 (lower), + 2 (foot). */
export const LEG = 5;
/** Where each leg stands under the trunk: x, and the side. The same as the gait's. */
export const LEG_AT: [number, number][] = [
  [-1.22, -1],
  [0.78, -1],
  [-1.22, 1],
  [0.78, 1],
];

export type V3 = [number, number, number];

export interface Skeleton {
  /** The joint each bone turns about, at rest. */
  joint: V3[];
  hip: V3[];
  knee: V3[];
  ankle: V3[];
  /** Where the feelers leave the lip, and which way, in the rest frame of the head. */
  lip: { at: V3; out: V3 }[];
  muzzle: V3;
  belly: V3;
}

interface Prim {
  /** 0 an ellipsoid (c, r, turned about z by `turn`), 1 a tapered limb from a to b. */
  kind: 0 | 1;
  bone: number;
  /** How far it melts into what was there, metres. */
  melt: number;
  a: V3;
  b: V3;
  ra: number;
  rb: number;
  cos: number;
  sin: number;
  leg: number;
  horn: number;
  cut: boolean;
}

const hash3 = (i: number, j: number, k: number, s: number): number => {
  let h = (Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177) ^ Math.imul(s, 0x9e3779b1)) | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
export const noise3 = (x: number, y: number, z: number, s: number): number => {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const k = Math.floor(z);
  let u = x - i;
  let v = y - j;
  let w = z - k;
  u = u * u * (3 - 2 * u);
  v = v * v * (3 - 2 * v);
  w = w * w * (3 - 2 * w);
  const a = hash3(i, j, k, s) * (1 - u) + hash3(i + 1, j, k, s) * u;
  const b = hash3(i, j + 1, k, s) * (1 - u) + hash3(i + 1, j + 1, k, s) * u;
  const c = hash3(i, j, k + 1, s) * (1 - u) + hash3(i + 1, j, k + 1, s) * u;
  const d = hash3(i, j + 1, k + 1, s) * (1 - u) + hash3(i + 1, j + 1, k + 1, s) * u;
  return (a * (1 - v) + b * v) * (1 - w) + (c * (1 - v) + d * v) * w;
};

const ridge = (ph: number, sharp: number): number => Math.pow(Math.abs(Math.sin(Math.PI * ph)), sharp);

/** What `weigh` says of a point on the smooth skin: the two bones that carry it and the share of the first, how much of it is leg and horn,
 * how far the folds lift it along its normal (metres) and how deep in a fold it lies (1 on top, 0 in the crease). */
export interface Weighed {
  a: number;
  b: number;
  w: number;
  leg: number;
  horn: number;
  lift: number;
  fold: number;
}

export interface Body {
  field: Field;
  box: Box;
  skeleton: Skeleton;
  /** For a point on the skin: the two bones that carry it and the share of the first. */
  weigh(x: number, y: number, z: number, out: Weighed): void;
}

/** `young` 0 an adult, 1 a young one (a larger head, a rounder trunk, stubbier legs). `seed` gives each body its own folds. */
export function wallowerBody(young: number, seed: number): Body {
  const sd = Math.floor(seed * 9973);
  const prims: Prim[] = [];
  const hd = 1 + 0.24 * young;
  const lx = 1 - 0.1 * young;
  const ball = (bone: number, c: V3, r: V3, melt: number, turn = 0, cut = false): void => {
    prims.push({ kind: 0, bone, melt, a: c, b: r, ra: 0, rb: 0, cos: Math.cos(turn), sin: Math.sin(turn), leg: 0, horn: 0, cut });
  };
  const limb = (bone: number, a: V3, b: V3, ra: number, rb: number, melt: number, leg = 0, horn = 0): void => {
    prims.push({ kind: 1, bone, melt, a, b, ra, rb, cos: 1, sin: 0, leg, horn, cut: false });
  };

  // The trunk: a rump, a deep belly slung under one arch of back, a chest between the shoulders, and a head that hangs with no neck to speak of.
  ball(PELVIS, [-1.52 * lx, 1.2, 0], [0.62, 0.7, 0.7], 0);
  ball(BELLY, [-0.5 * lx, 1.27, 0], [1.02, 0.72 + 0.04 * young, 0.86], 0.3);
  ball(BELLY, [-0.1 * lx, 1.52, 0], [1.25, 0.55, 0.6], 0.25);
  ball(CHEST, [0.6 * lx, 1.22, 0], [0.82, 0.72, 0.8], 0.3);
  for (const s of [-1, 1]) {
    // The haunch and the shoulder stand out over each leg.
    ball(PELVIS, [-1.24 * lx, 1.02, s * 0.44], [0.52, 0.6, 0.4], 0.22);
    ball(CHEST, [0.74 * lx, 1.02, s * 0.47], [0.46, 0.58, 0.38], 0.22);
  }
  ball(NECK, [1.28 * lx, 1.1, 0], [0.66 * hd, 0.62 * hd, 0.6 * hd], 0.3, -0.35);
  ball(HEAD, [1.82 * lx, 0.86, 0], [0.56 * hd, 0.42 * hd, 0.45 * hd], 0.24, -0.5);
  ball(HEAD, [2.2 * lx, 0.64, 0], [0.42 * hd, 0.28 * hd, 0.36 * hd], 0.16, -0.65);
  // The lip: a broad pad that overhangs the mouth.
  ball(HEAD, [2.36 * lx, 0.52, 0], [0.2 * hd, 0.16 * hd, 0.33 * hd], 0.1, -0.7);
  // A brow with nothing under it.
  ball(HEAD, [2.02 * lx, 0.98, 0], [0.26 * hd, 0.12 * hd, 0.34 * hd], 0.14, -0.5);

  const skeleton: Skeleton = {
    joint: [],
    hip: [],
    knee: [],
    ankle: [],
    lip: [],
    muzzle: [2.5 * lx, 0.42, 0],
    belly: [-0.4 * lx, 0.58, 0],
  };
  skeleton.joint[PELVIS] = [-1.25 * lx, 1.25, 0];
  skeleton.joint[BELLY] = [-0.35 * lx, 1.3, 0];
  skeleton.joint[CHEST] = [0.2 * lx, 1.3, 0];
  skeleton.joint[NECK] = [1.12 * lx, 1.16, 0];
  skeleton.joint[HEAD] = [1.66 * lx, 0.98, 0];
  const stub = 1 - 0.12 * young;
  LEG_AT.forEach(([x0, side], l) => {
    const hind = x0 < 0;
    const x = x0 * lx;
    const hip: V3 = [x - 0.02, 0.98, side * 0.5];
    const knee: V3 = [x + (hind ? 0.1 : -0.07), 0.54 * stub, side * 0.63];
    const ankle: V3 = [x + 0.03, 0.14, side * 0.68];
    skeleton.hip.push(hip);
    skeleton.knee.push(knee);
    skeleton.ankle.push(ankle);
    const bone = LEG + 3 * l;
    skeleton.joint[bone] = hip;
    skeleton.joint[bone + 1] = knee;
    skeleton.joint[bone + 2] = ankle;
    const fat = 1 + 0.12 * young;
    limb(bone, hip, knee, 0.37 * fat, 0.27 * fat, 0.2, 1);
    limb(bone + 1, knee, [ankle[0], 0.2, ankle[2]], 0.255 * fat, 0.225 * fat, 0.1, 1);
    // A broad pad, and four blunt claws that splay from it.
    ball(bone + 2, [ankle[0] + 0.05, 0.1, ankle[2]], [0.31 * fat, 0.14, 0.28 * fat], 0.1);
    prims[prims.length - 1]!.leg = 1;
    for (let c = 0; c < 4; c++) {
      const f = (c - 1.5) / 1.5;
      const a: V3 = [ankle[0] + 0.26 * fat - 0.05 * f * f, 0.085, ankle[2] + f * 0.19 * fat];
      const b: V3 = [a[0] + 0.2 - 0.05 * f * f, 0.035, a[2] + f * 0.1 + side * 0.02];
      limb(bone + 2, a, b, 0.062, 0.03, 0.035, 1, 1);
    }
  });

  // The feelers stand in a fringe round the under lip, from one corner of the mouth to the other.
  const FRINGE = 22;
  for (let f = 0; f < FRINGE; f++) {
    const u = f / (FRINGE - 1);
    const a = (u - 0.5) * 2.5;
    const r = 0.3 * hd;
    const at: V3 = [2.3 * lx + Math.cos(a) * 0.17 * hd, 0.47 - 0.05 * Math.cos(a), Math.sin(a) * r];
    const down = 1.0 + 0.7 * hash3(f, 3, 1, sd);
    const out: V3 = [Math.cos(a) * 0.9, -down, Math.sin(a) * 0.8];
    const l = Math.hypot(out[0], out[1], out[2]);
    skeleton.lip.push({ at, out: [out[0] / l, out[1] / l, out[2] / l] });
  }

  const n = prims.length;
  const dist = new Float64Array(n);
  const near = new Float64Array(BONES);
  // A ball round each piece: far outside it the piece is measured from the ball, which costs a tenth of the true measure.
  const ballOf = new Float64Array(n * 4);
  prims.forEach((p, i) => {
    if (p.kind === 0) ballOf.set([p.a[0], p.a[1], p.a[2], Math.max(p.b[0], p.b[1], p.b[2])], i * 4);
    else ballOf.set([(p.a[0] + p.b[0]) / 2, (p.a[1] + p.b[1]) / 2, (p.a[2] + p.b[2]) / 2, Math.hypot(p.a[0] - p.b[0], p.a[1] - p.b[1], p.a[2] - p.b[2]) / 2 + Math.max(p.ra, p.rb)], i * 4);
  });
  const measure = (x: number, y: number, z: number): void => {
    for (let i = 0; i < n; i++) {
      const p = prims[i] as Prim;
      const bx = x - (ballOf[i * 4] as number);
      const by = y - (ballOf[i * 4 + 1] as number);
      const bz = z - (ballOf[i * 4 + 2] as number);
      const br = (ballOf[i * 4 + 3] as number) + 0.7;
      const b2 = bx * bx + by * by + bz * bz;
      if (b2 > br * br) {
        dist[i] = Math.sqrt(b2) - br + 0.7;
        continue;
      }
      if (p.kind === 0) {
        const px = x - p.a[0];
        const py = y - p.a[1];
        const pz = z - p.a[2];
        const qx = (px * p.cos + py * p.sin) / p.b[0];
        const qy = (-px * p.sin + py * p.cos) / p.b[1];
        const qz = pz / p.b[2];
        const k0 = Math.sqrt(qx * qx + qy * qy + qz * qz);
        const k1 = Math.sqrt((qx / p.b[0]) ** 2 + (qy / p.b[1]) ** 2 + (qz / p.b[2]) ** 2);
        dist[i] = k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(p.b[0], p.b[1], p.b[2]);
      } else {
        const abx = p.b[0] - p.a[0];
        const aby = p.b[1] - p.a[1];
        const abz = p.b[2] - p.a[2];
        const t = clamp(((x - p.a[0]) * abx + (y - p.a[1]) * aby + (z - p.a[2]) * abz) / (abx * abx + aby * aby + abz * abz));
        dist[i] = Math.hypot(x - p.a[0] - abx * t, y - p.a[1] - aby * t, z - p.a[2] - abz * t) - (p.ra + (p.rb - p.ra) * t);
      }
    }
  };
  // What `base` leaves behind for the folds: how much of the skin here is leg, and how much horn.
  let legness = 0;
  let horn = 0;
  const base = (x: number, y: number, z: number): number => {
    measure(x, y, z);
    let d = 1e9;
    let dl = 1e9;
    let dh = 1e9;
    let dt = 1e9;
    for (let i = 0; i < n; i++) {
      const p = prims[i] as Prim;
      const v = dist[i] as number;
      if (p.cut) {
        const h = Math.max(p.melt - Math.abs(-v - d), 0) / p.melt;
        d = Math.max(d, -v) + h * h * p.melt * 0.25;
        continue;
      }
      if (p.melt > 0 && d < 1e8) {
        const h = Math.max(p.melt - Math.abs(v - d), 0) / p.melt;
        d = Math.min(d, v) - h * h * p.melt * 0.25;
      } else d = Math.min(d, v);
      if (p.horn) dh = Math.min(dh, v);
      else if (p.leg) dl = Math.min(dl, v);
      else dt = Math.min(dt, v);
    }
    legness = smooth(0.1, -0.06, dl - dt);
    horn = smooth(0.012, -0.012, dh - Math.min(dl, dt));
    return d;
  };

  const space = 1 + 0.5 * young;
  let fold = 1;
  const folds = (x: number, y: number, z: number): number => {
    const w1 = noise3(x * 1.1 + 3, y * 1.1, z * 1.1, sd) - 0.5;
    const w2 = noise3(x * 2.3 + 17, y * 2.3 + 5, z * 2.3, sd + 3) - 0.5;
    const w3 = noise3(x * 5.1, y * 5.1 + 9, z * 5.1, sd + 5) - 0.5;
    const trunk = (1 - legness) * (1 - horn);
    const side = clamp(Math.abs(z) / 0.6);
    const top = smooth(1.55, 1.95, y);
    const neck = smooth(0.85 * lx, 1.25 * lx, x) * (1 - smooth(1.95 * lx, 2.3 * lx, x));
    const flank = (1 - smooth(0.7 * lx, 1.2 * lx, x)) * smooth(-2.1 * lx, -1.6 * lx, x);
    // Heavy rolls of slack hide hang down the flank, slanting back as they fall, no two the same width.
    const r1 = ridge((x + 0.22 * (y - 1.2)) / (0.3 * space) + 2.6 * w1 + 1.1 * w2, 0.55);
    // Rings round the neck and the head, closer and deeper, deepest under the throat.
    const nx = (x - 1.12 * lx) * 0.94 - (y - 1.16) * 0.34;
    const r2 = ridge(nx / (0.15 * space) + 1.7 * w1 + 0.9 * w2, 0.5);
    // The hide is gathered like a sleeve round the root of each leg, and lies in rings down it.
    let sleeve = 0;
    let r3 = 1;
    for (let l = 0; l < 4; l++) {
      const h = skeleton.hip[l] as V3;
      const d = Math.hypot(x - h[0], (y - h[1] - 0.1) * 0.9, (z - h[2]) * 0.8);
      const near = Math.exp(-(d * d) / 0.34);
      const r = ridge(d / (0.19 * space) + 0.9 * w2 + 0.4 * w1, 0.55);
      sleeve += 0.016 * near * (r - 0.62);
      r3 = Math.min(r3, 1 - near * (1 - r));
    }
    const r4 = ridge(y / (0.125 * space) + 1.5 * w2 + 0.7 * w3 + 0.3 * Math.sin(x * 9 + z * 7), 0.55);
    const shin = legness * smooth(0.1, 0.3, y) * (1 - horn);
    // Not everywhere: a slack patch here, a tight one there.
    const gate = 0.25 + 0.75 * smooth(0.35, 0.6, noise3(x * 0.9 + 7, y * 0.9, z * 0.9 + 3, sd + 9));
    let h = 0;
    h += 0.012 * gate * trunk * flank * (0.45 + 0.55 * side) * (1 - 0.6 * top) * (r1 - 0.62);
    h += 0.016 * (0.5 + 0.5 * gate) * trunk * neck * (1 - 0.35 * top) * (r2 - 0.62);
    h += sleeve * (1 - horn) * (1 - 0.7 * legness * smooth(0.6, 0.3, y));
    h += 0.012 * shin * (r4 - 0.62);
    // Slow lumps: nothing on it is a clean ellipsoid.
    h += (0.09 * w1 + 0.04 * w2 + 0.012 * w3) * (1 - horn) * (1 - 0.6 * legness);
    // The belly hangs lower behind the middle.
    h += 0.07 * trunk * flank * smooth(1.0, 0.6, y) * (0.4 + noise3(x * 0.9, 1, z * 0.9, sd + 4));
    // The spine shows as a row of knobs down the back, and the hips as two corners over the hind legs.
    h += 0.006 * trunk * Math.exp(-(z * z) / 0.02) * smooth(1.5, 1.8, y) * (0.55 + 0.45 * Math.cos((x * Math.PI * 2) / 0.2)) * flank;
    h += 0.05 * Math.exp(-((x + 1.32 * lx) ** 2) / 0.07) * Math.exp(-((Math.abs(z) - 0.42) ** 2) / 0.03) * smooth(1.45, 1.75, y);
    // The flank is hollow between the last rib and the haunch.
    h -= 0.035 * Math.exp(-((x + 0.75 * lx) ** 2) / 0.1) * smooth(0.5, 0.8, Math.abs(z)) * Math.exp(-((y - 1.3) ** 2) / 0.12);
    fold = Math.min(1, 1 - gate * trunk * flank * (0.45 + 0.55 * side) * (1 - 0.6 * top) * (1 - r1), 1 - (0.5 + 0.5 * gate) * trunk * neck * (1 - r2), 1 - shin * 0.8 * (1 - r4), r3 + horn);
    return h;
  };

  const field: Field = (x, y, z) => base(x, y, z);

  return {
    field,
    box: { min: [-2.6, -0.08, -1.25], max: [2.85, 2.35, 1.25] },
    skeleton,
    weigh: (x, y, z, out) => {
      base(x, y, z);
      out.leg = legness;
      out.horn = horn;
      out.lift = folds(x, y, z);
      out.fold = fold;
      // The nearest piece of each bone; the two nearest bones share the point.
      near.fill(1e9);
      for (let i = 0; i < n; i++) {
        const p = prims[i] as Prim;
        if (p.cut) continue;
        const v = dist[i] as number;
        if (v < (near[p.bone] as number)) near[p.bone] = v;
      }
      let a = -1;
      let b = -1;
      let da = 1e9;
      let db = 1e9;
      for (let i = 0; i < BONES; i++) {
        const v = near[i] as number;
        if (v < da) {
          b = a;
          db = da;
          a = i;
          da = v;
        } else if (v < db) {
          b = i;
          db = v;
        }
      }
      if (b < 0) b = a;
      // A claw is carried by its foot alone, and the trunk's bones share more widely than a leg's.
      const span = a >= LEG || b >= LEG ? 0.16 : 0.34;
      out.a = a;
      out.b = b;
      out.w = horn > 0.5 ? 1 : 0.5 + 0.5 * smooth(0, span, db - da);
    },
  };
}
