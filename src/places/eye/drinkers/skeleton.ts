// The bones of a drinker and how a pose becomes the matrices its skin is drawn with.
// A pose is told in the animal's own frame (x to its left, y up, z the way it faces, the origin on the ground under it), the hooves by where they
// stand: the legs are solved from the hooves up, so a planted hoof stays where it is while the body passes over it.
import { BONE_NAMES, REST } from './body.data';

export type V3 = [number, number, number];
/** Row by row. */
export type M3 = [number, number, number, number, number, number, number, number, number];

export const BONES = BONE_NAMES.length;

const J = (name: string): V3 => REST[name] as V3;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mulS = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => mulS(a, 1 / (len(a) || 1));
const mirror = (a: V3, side: number): V3 => [a[0] * side, a[1], a[2]];

const mul = (a: M3, b: M3): M3 => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
];
const apply = (m: M3, v: V3): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const rotX = (a: number): M3 => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)];
const rotY = (a: number): M3 => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)];
const rotZ = (a: number): M3 => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];
const diag = (x: number, y: number, z: number): M3 => [x, 0, 0, 0, y, 0, 0, 0, z];

/** The shortest turn that takes the unit vector `from` to the unit vector `to`. */
function arc(from: V3, to: V3): M3 {
  const v = cross(from, to);
  const c = dot(from, to);
  if (c < -0.9999) return rotX(Math.PI);
  const k = 1 / (1 + c);
  return [
    c + k * v[0] * v[0], k * v[0] * v[1] - v[2], k * v[0] * v[2] + v[1],
    k * v[1] * v[0] + v[2], c + k * v[1] * v[1], k * v[1] * v[2] - v[0],
    k * v[2] * v[0] - v[1], k * v[2] * v[1] + v[0], c + k * v[2] * v[2],
  ];
}

/** Longer or shorter along the unit vector r, the same across it. */
function stretch(r: V3, l: number): M3 {
  const k = l - 1;
  return [1 + k * r[0] * r[0], k * r[0] * r[1], k * r[0] * r[2], k * r[1] * r[0], 1 + k * r[1] * r[1], k * r[1] * r[2], k * r[2] * r[0], k * r[2] * r[1], 1 + k * r[2] * r[2]];
}

/** What makes one animal unlike the next: all 1 for the body as it was made. */
export interface Build {
  size: number;
  /** Width of the trunk and the neck. */
  girth: number;
  /** Depth of the trunk from the back to the belly. */
  depth: number;
  neck: number;
  leg: number;
  head: number;
}

export interface Hoof {
  /** Where the hoof stands, in the animal's frame, metres: y is its height over the animal's own ground. */
  at: V3;
  /** 0 planted, 1 folded at the top of a step. */
  fold: number;
}

export interface Pose {
  /** The ground under it and the bearing it faces (radians, clockwise from north). */
  x: number;
  y: number;
  z: number;
  bearing: number;
  /** The trunk: moved from where it stands at rest (metres at its own size), and turned: nose down, rolled to its left, turned to its left. */
  shift: V3;
  pitch: number;
  roll: number;
  yaw: number;
  /** The fore end and the hind end bent against the middle: to the left, and down. */
  chest: [number, number];
  pelvis: [number, number];
  /** The four joints of the neck and the head: 0 as it stands with its head up, 1 with its mouth at the ground. May pass either end. */
  neck: [number, number, number, number, number];
  /** Each of the five turned to its left, radians, added up along the neck. */
  turn: [number, number, number, number, number];
  /** Each joint of the neck swollen as a mouthful goes down it. */
  gulp: [number, number, number, number];
  /** The tail: lifted, and swung to the left. */
  tail: [number, number];
  /** Hind left, hind right, fore left, fore right. */
  hooves: [Hoof, Hoof, Hoof, Hoof];
  /** The flanks out and in with the breath: 0 at rest. */
  breath: number;
}

const DEGREES = Math.PI / 180;
const NECK = ['n0', 'n1', 'n2', 'n3', 'head', 'tip'] as const;
/** The neck with its mouth at the ground: each joint's lean from level, and the head's. */
const NECK_DOWN = [-36, -54, -66, -73, -80].map((d) => d * DEGREES);
const NECK_REST = NECK.slice(0, 5).map((n, i) => {
  const d = sub(J(NECK[i + 1] as string), J(n));
  return Math.atan2(d[1], d[2]);
});

export interface Solved {
  /** 12 numbers a bone: three rows of four, the world from the body at rest. */
  matrices: Float32Array;
  /** In the world: the tip of the muzzle and the four hooves. */
  muzzle: V3;
  hooves: [V3, V3, V3, V3];
}

const LEGS = [
  { bones: 10, side: 1, hind: true },
  { bones: 14, side: -1, hind: true },
  { bones: 18, side: 1, hind: false },
  { bones: 22, side: -1, hind: false },
] as const;

/** How high the trunk's middle joint stands over the ground on straight legs. */
export function standing(b: Build): number {
  return b.size * (1.74 * b.leg + 0.38 * b.depth);
}

export function solve(b: Build, p: Pose, out: Float32Array): Solved {
  const s = b.size;
  const sinB = Math.sin(p.bearing);
  const cosB = Math.cos(p.bearing);
  // The animal's frame in the world: its left, up, the way it faces.
  const base: M3 = [-cosB, 0, sinB, 0, 1, 0, -sinB, 0, -cosB];
  const toWorld = (v: V3): V3 => {
    const w = apply(base, v);
    return [w[0] + p.x, w[1] + p.y, w[2] + p.z];
  };
  const put = (bone: number, turnOf: M3, head: V3, restHead: V3): void => {
    const a = mul(base, turnOf);
    const h = toWorld(head);
    const o = bone * 12;
    for (let r = 0; r < 3; r++) {
      const a0 = a[r * 3] as number;
      const a1 = a[r * 3 + 1] as number;
      const a2 = a[r * 3 + 2] as number;
      out[o + r * 4] = a0;
      out[o + r * 4 + 1] = a1;
      out[o + r * 4 + 2] = a2;
      out[o + r * 4 + 3] = (h[r] as number) - (a0 * restHead[0] + a1 * restHead[1] + a2 * restHead[2]);
    }
  };

  const trunkShape = diag(s * b.girth * (1 + p.breath), s * b.depth * (1 + 0.35 * p.breath), s);
  const rootTurn = mul(rotY(p.yaw), mul(rotX(p.pitch), rotZ(p.roll)));
  const root: V3 = [p.shift[0], standing(b) + p.shift[1], J('root')[2] * s + p.shift[2]];
  const trunk = mul(rootTurn, trunkShape);
  put(0, trunk, root, J('root'));
  const pelvisAt = add(root, apply(trunk, sub(J('pelvis'), J('root'))));
  const pelvisTurn = mul(rootTurn, mul(rotY(p.pelvis[0]), rotX(p.pelvis[1])));
  const pelvis = mul(pelvisTurn, trunkShape);
  put(1, pelvis, pelvisAt, J('pelvis'));
  const chestAt = add(root, apply(trunk, sub(J('chest'), J('root'))));
  const chestTurn = mul(rootTurn, mul(rotY(p.chest[0]), rotX(p.chest[1])));
  const chest = mul(chestTurn, trunkShape);
  put(2, chest, chestAt, J('chest'));

  // The neck and the head, joint by joint from the chest.
  let at = add(chestAt, apply(chest, sub(J('n0'), J('chest'))));
  let swing = 0;
  let muzzle: V3 = [0, 0, 0];
  for (let i = 0; i < 5; i++) {
    const rest = NECK_REST[i] as number;
    const lean = rest + (p.neck[i] as number) * ((NECK_DOWN[i] as number) - rest);
    swing += p.turn[i] as number;
    const turnOf = mul(chestTurn, mul(rotY(swing), rotX(rest - lean)));
    const from = J(NECK[i] as string);
    const to = J(NECK[i + 1] as string);
    const along = unit(sub(to, from));
    const isHead = i === 4;
    const swell = isHead ? 1 : 1 + (p.gulp[i] as number);
    const shape = isHead ? diag(s * b.head, s * b.head, s * b.head) : mul(diag(s * b.girth * swell, s, s * swell), stretch(along, b.neck));
    const m = mul(turnOf, shape);
    put(3 + i, m, at, from);
    const next = add(at, apply(m, sub(to, from)));
    if (isHead) muzzle = next;
    at = next;
  }

  // The tail hangs from the rump.
  let tailAt = add(pelvisAt, apply(pelvis, sub(J('t0'), J('pelvis'))));
  for (let i = 0; i < 2; i++) {
    const from = J(i === 0 ? 't0' : 't1');
    const to = J(i === 0 ? 't1' : 't2');
    const m = mul(mul(pelvisTurn, mul(rotY(p.tail[1] * (1 + 0.6 * i)), rotX(p.tail[0] * (1 + 0.5 * i)))), diag(s, s, s));
    put(8 + i, m, tailAt, from);
    tailAt = add(tailAt, apply(m, sub(to, from)));
  }

  // The legs, from the hoof up.
  const hooves: V3[] = [];
  LEGS.forEach((leg, k) => {
    const hoof = p.hooves[k] as Hoof;
    const names = leg.hind ? ['hip', 'stifle', 'hock', 'hfet', 'htoe'] : ['shoulder', 'elbow', 'carpus', 'ffet', 'ftoe'];
    const r = names.map((n) => mirror(J(n), leg.side));
    const top = r[0] as V3;
    const r1 = sub(r[1] as V3, top);
    const r2 = sub(r[2] as V3, r[1] as V3);
    const r3 = sub(r[3] as V3, r[2] as V3);
    const l1 = len(r1) * s * b.leg;
    const l2 = len(r2) * s * b.leg;
    const l3 = len(r3) * s * b.leg;
    let from = leg.hind ? add(pelvisAt, apply(pelvis, sub(top, J('pelvis')))) : add(chestAt, apply(chest, sub(top, J('chest'))));
    const fetlock: V3 = [hoof.at[0], hoof.at[1] + (r[3] as V3)[1] * s, hoof.at[2]];
    // The cannon stands nearly upright under a planted leg, and folds as the hoof comes up: the hock goes forward over the hoof, the knee too.
    const lean = Math.atan2(-r3[2], -r3[1]) + hoof.fold * (leg.hind ? 0.75 : 0.95);
    let upper: V3 = [fetlock[0] - r3[0] * s, fetlock[1] + l3 * Math.cos(lean), fetlock[2] + l3 * Math.sin(lean)];
    let d = sub(upper, from);
    if (!leg.hind) {
      // A foreleg is a column: the trunk hangs between the shoulders and rides up and down them, the leg itself stays near straight.
      const straight = (l1 + l2) * 0.992;
      const slide = Math.min(Math.max(len(d) - straight, -0.14 * s), 0.14 * s);
      from = add(from, mulS(unit(d), slide));
      d = sub(upper, from);
    }
    const reach = Math.min(Math.max(len(d), Math.abs(l1 - l2) + 1e-3), (l1 + l2) * 0.9995);
    const dir = unit(d);
    upper = add(from, mulS(dir, reach));
    d = sub(upper, from);
    const along = (l1 * l1 - l2 * l2 + reach * reach) / (2 * reach);
    const out2 = Math.sqrt(Math.max(l1 * l1 - along * along, 0));
    const pole: V3 = [0, 0, leg.hind ? 1 : -1];
    const bend = unit(sub(pole, mulS(dir, dot(pole, dir))));
    const joint = add(add(from, mulS(dir, along)), mulS(bend, out2));
    const foot = sub(upper, mulS([-r3[0] * s / l3, Math.cos(lean), Math.sin(lean)], l3));
    const limb = (rest: V3, a: V3, c: V3): M3 => {
      const ru = unit(rest);
      return mul(arc(ru, unit(sub(c, a))), mul(diag(s, s, s), stretch(ru, b.leg)));
    };
    put(leg.bones, limb(r1, from, joint), from, top);
    put(leg.bones + 1, limb(r2, joint, upper), joint, r[1] as V3);
    put(leg.bones + 2, limb(r3, upper, foot), upper, r[2] as V3);
    // The toes hang as the hoof comes up.
    put(leg.bones + 3, mul(rotX(hoof.fold * 0.7), diag(s, s, s)), foot, r[3] as V3);
    hooves.push(toWorld([hoof.at[0], hoof.at[1], hoof.at[2]]));
  });

  return { matrices: out, muzzle: toWorld(muzzle), hooves: hooves as [V3, V3, V3, V3] };
}

/** Where a hoof stands at rest, in the animal's frame, for its build. */
export function restHoof(b: Build, k: number): V3 {
  const leg = LEGS[k] as (typeof LEGS)[number];
  const fet = J(leg.hind ? 'hfet' : 'ffet');
  return [fet[0] * leg.side * b.size * b.girth, 0, fet[2] * b.size];
}
