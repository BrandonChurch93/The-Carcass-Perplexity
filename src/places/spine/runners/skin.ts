// The body of a ridge-runner as one skin. A pose is a skeleton; round cones along it are joined smoothly into one signed distance field;
// the surface of that field is taken once, at creation, by surface nets (one vertex in each cell the surface crosses), and every vertex is
// weighted to the two bones nearest to it. Each pose has its own skin, so a lying or a dead one is shaped as it lies, not bent into it,
// and the bones only carry what moves after that: breath, the neck, a shift of weight, a walk.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';

export type V3 = [number, number, number];

/** Bones: 0 hips, 1 chest, 2 neck, 3 head, 4 to 7 the upper legs (fore left, fore right, hind left, hind right), 8 to 11 the lower legs. */
export const BONES = 12;
/** What a place on the skin is: the coat's length and the hide's colour follow it. */
export const KIND = { trunk: 0, neck: 1, head: 2, upper: 3, lower: 4, paw: 5, claw: 6, face: 7 } as const;

interface Prim {
  a: V3;
  b: V3;
  ra: number;
  rb: number;
  bone: number;
  kind: number;
  /** How far it melts into its neighbours, metres. */
  k: number;
}

/** A leg: each segment's angle from straight down toward the head (radians) and its splay outward. */
export interface LegPose {
  upper: [number, number];
  lower: [number, number];
  paw: [number, number];
}

export interface Pose {
  /** The trunk: roll about its length (a quarter turn lays it on its right side), pitch (head up), and how slack it lies (1 firm). */
  roll: number;
  pitch: number;
  slack: number;
  /** The neck and the head: pitch (up) and yaw (to its left) of each, in the trunk's frame. */
  neck: [number, number];
  head: [number, number];
  /** Fore left, fore right, hind left, hind right. */
  legs: [LegPose, LegPose, LegPose, LegPose];
  /** Bows the spine sideways (radians over its length): a curled sleeper. */
  curl: number;
}

export interface Joints {
  hip: V3;
  chest: V3;
  neck: V3;
  head: V3;
  face: V3;
  /** The way the face looks. */
  lead: V3;
  /** The trunk's own axes as it lies: toward the head, out of its back, to its right. */
  fwd: V3;
  up: V3;
  right: V3;
  tops: V3[];
  knees: V3[];
  ankles: V3[];
  toes: V3[];
  /** Flesh that has slumped out of the trunk's own shape onto the ground: round cones from a to b. Only the dead have any. */
  slump?: [V3, V3, number, number][];
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const mixv = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => scale(a, 1 / Math.max(len(a), 1e-9));

const UPPER = 0.27;
const LOWER = 0.25;
const PAW = 0.12;

function segment(angle: [number, number], side: number, length: number): V3 {
  const c = Math.cos(angle[1]);
  return [Math.sin(angle[0]) * c * length, -Math.cos(angle[0]) * c * length, side * Math.sin(angle[1]) * length];
}

/** The skeleton of a pose, in the animal's own metres: x toward the head, y up, z to its right, the ground at y = 0. */
export function joints(pose: Pose): Joints {
  // In the trunk's frame the hips are the origin.
  const local: Joints = {
    hip: [0, 0, 0],
    chest: [0.62, 0.02, 0],
    neck: [0.84, 0.1, 0],
    head: [0, 0, 0],
    face: [0, 0, 0],
    lead: [1, 0, 0],
    fwd: [1, 0, 0],
    up: [0, 1, 0],
    right: [0, 0, 1],
    tops: [
      [0.66, -0.1, -0.17],
      [0.66, -0.1, 0.17],
      [-0.02, -0.06, -0.17],
      [-0.02, -0.06, 0.17],
    ],
    knees: [],
    ankles: [],
    toes: [],
  };
  const way = (a: [number, number], l: number): V3 => [Math.cos(a[0]) * Math.cos(a[1]) * l, Math.sin(a[0]) * l, -Math.cos(a[0]) * Math.sin(a[1]) * l];
  local.head = add(local.neck, way(pose.neck, 0.3));
  const headWay: [number, number] = [pose.neck[0] + pose.head[0], pose.neck[1] + pose.head[1]];
  local.face = add(local.head, way(headWay, 0.24));
  local.lead = norm(way(headWay, 1));
  pose.legs.forEach((leg, i) => {
    const side = i % 2 ? 1 : -1;
    const top = local.tops[i] as V3;
    const knee = add(top, segment(leg.upper, side, UPPER));
    const ankle = add(knee, segment(leg.lower, side, LOWER));
    local.knees.push(knee);
    local.ankles.push(ankle);
    local.toes.push(add(ankle, segment(leg.paw, side, PAW)));
  });
  // The trunk's frame into the animal's: curl about y through the middle of the back, then pitch about z, then roll about x.
  const cr = Math.cos(pose.roll);
  const sr = Math.sin(pose.roll);
  const cp = Math.cos(pose.pitch);
  const sp = Math.sin(pose.pitch);
  const place = (p: V3): V3 => {
    // The spine bowed sideways into an arc of `curl` radians a metre, about the middle of the back.
    const d = p[0] - 0.3;
    const k = pose.curl;
    const a = k * d;
    const cx = Math.abs(k) > 1e-4 ? Math.sin(a) / k : d;
    const cz = Math.abs(k) > 1e-4 ? (1 - Math.cos(a)) / k : 0;
    const q: V3 = [0.3 + cx - p[2] * Math.sin(a), p[1], cz + p[2] * Math.cos(a)];
    const x = q[0] * cp - q[1] * sp;
    const y = q[0] * sp + q[1] * cp;
    return [x, y * cr - q[2] * sr, y * sr + q[2] * cr];
  };
  const turn = (d: V3): V3 => {
    const x = d[0] * cp - d[1] * sp;
    const y = d[0] * sp + d[1] * cp;
    return [x, y * cr - d[2] * sr, y * sr + d[2] * cr];
  };
  const out: Joints = {
    hip: place(local.hip),
    chest: place(local.chest),
    neck: place(local.neck),
    head: place(local.head),
    face: place(local.face),
    lead: turn(local.lead),
    fwd: turn([1, 0, 0]),
    up: turn([0, 1, 0]),
    right: turn([0, 0, 1]),
    tops: local.tops.map(place),
    knees: local.knees.map(place),
    ankles: local.ankles.map(place),
    toes: local.toes.map(place),
  };
  // Set it on the ground: nothing goes under it, and what would is laid on it.
  const radii: [V3, number][] = [
    [out.hip, 0.24 * pose.slack],
    [out.chest, 0.28 * pose.slack],
    [out.neck, 0.15],
    [out.head, 0.12],
    [out.face, 0.07],
    ...out.tops.map((p): [V3, number] => [p, 0.11]),
    ...out.knees.map((p): [V3, number] => [p, 0.075]),
    ...out.ankles.map((p): [V3, number] => [p, 0.055]),
    ...out.toes.map((p): [V3, number] => [p, 0.035]),
  ];
  // The trunk and the feet decide how high it stands; a limb that would go under the ground lies on it.
  let low = Infinity;
  // One on its side lies on its trunk, and its under legs are pressed flat by it.
  const lying = Math.abs(pose.roll) > 0.6;
  for (const [p, r] of lying ? radii.slice(0, 2) : [...radii.slice(0, 2), ...radii.slice(-8)]) low = Math.min(low, p[1] - r);
  for (const [p, r] of radii) {
    p[1] -= low;
    if (p[1] < r) p[1] = r;
  }
  return out;
}

/** The dead one as it lies in its picture, set joint by joint and not bent out of a standing animal: on its right side and rolled a little
 * onto its belly, so the back stands up behind and the flank looks at the lens; the neck let down along the rock and the head fallen on
 * its side; the upper foreleg thrown forward over the chest with its paw flat on the snow, the under one out along the body, the hind
 * legs drawn up under the belly. Metres of the animal: x toward the head, y up from the ground, z away from the lens. */
export function carcassJoints(): Joints {
  const a = 0.42;
  const fwd: V3 = [1, 0, 0];
  const up: V3 = [0, Math.sin(a), Math.cos(a)];
  const right: V3 = [0, -Math.cos(a), Math.sin(a)];
  // Dead weight: the trunk has sunk on itself and into the snow, and the neck and the head lie on the ground.
  const hip: V3 = [0, 0.12, 0.02];
  const chest: V3 = [0.62, 0.15, 0];
  const neck: V3 = [0.86, 0.12, -0.05];
  const head: V3 = [1.1, 0.085, -0.15];
  const face: V3 = [1.3, 0.06, -0.27];
  const chain = (top: V3, d1: V3, d2: V3, d3: V3): [V3, V3, V3, V3] => {
    const knee = add(top, scale(norm(d1), UPPER));
    const ankle = add(knee, scale(norm(d2), LOWER));
    return [top, knee, ankle, add(ankle, scale(norm(d3), PAW))];
  };
  const legs = [
    // The upper foreleg has fallen off the shoulder and lies along the ground toward the lens, its paw flat and its claws on the ice.
    chain([0.62, 0.2, -0.2], [0.3, -0.42, -0.85], [0.22, -0.06, -0.97], [0.3, -0.05, -0.95]),
    // The under foreleg: out from under the chest and back along the body, its claws toward the tail.
    chain([0.64, 0.08, -0.08], [-0.45, 0, -0.9], [-0.8, -0.03, -0.6], [-0.97, -0.03, -0.25]),
    // The upper hind leg lies on the under one: the thigh forward along the belly, the shank back along the ground.
    chain([-0.02, 0.2, -0.14], [0.78, -0.25, -0.58], [-0.55, -0.1, -0.83], [-0.3, -0.04, -0.95]),
    // The under hind leg, flat under it.
    chain([-0.04, 0.08, -0.05], [0.35, 0, -0.94], [-0.85, -0.02, -0.5], [-0.95, -0.02, -0.3]),
  ];
  // The belly has run out toward the legs and lies on the ground between them; the flank has sunk between the hips and the shoulder.
  const slump: [V3, V3, number, number][] = [
    [[0.02, 0.07, -0.2], [0.5, 0.08, -0.24], 0.15, 0.17],
    [[0.2, 0.05, -0.3], [0.42, 0.05, -0.33], 0.1, 0.1],
    [[0.66, 0.07, -0.16], [0.9, 0.06, -0.14], 0.14, 0.11],
    [[-0.22, 0.06, -0.02], [0.0, 0.07, -0.12], 0.13, 0.16],
  ];
  const out: Joints = { hip, chest, neck, head, face, lead: norm(sub(face, head)), fwd, up, right, tops: legs.map((l) => l[0]), knees: legs.map((l) => l[1]), ankles: legs.map((l) => l[2]), toes: legs.map((l) => l[3]), slump };
  // Nothing of a leg is under the ground: each lies on it.
  const floor: [V3[], number][] = [[out.knees, 0.07], [out.ankles, 0.055], [out.toes, 0.04]];
  for (const [list, r] of floor) for (const p of list) if (p[1] < r) p[1] = r;
  return out;
}

function prims(j: Joints, pose: Pose): Prim[] {
  const s = pose.slack;
  const out: Prim[] = [];
  const cone = (a: V3, b: V3, ra: number, rb: number, bone: number, kind: number, k = 0.06): void => {
    out.push({ a, b, ra, rb, bone, kind, k });
  };
  const off = (p: V3, x: number, y: number, z: number): V3 => add(p, add(add(scale(j.fwd, x), scale(j.up, y)), scale(j.right, z)));
  const back = mixv(j.hip, j.chest, 0.5);
  // The trunk: hips, a deep chest, the belly slung between them, a hump over the shoulders and the line of the spine standing out of the back.
  cone(j.hip, back, 0.235 * s, 0.25 * s, 0, KIND.trunk, 0.1);
  cone(back, j.chest, 0.25 * s, 0.275 * s, 1, KIND.trunk, 0.1);
  cone(off(j.hip, 0, -0.05, 0), off(j.chest, 0, -0.08, 0), 0.19 * s, 0.21 * s, 1, KIND.trunk, 0.1);
  cone(off(j.chest, -0.02, 0.2 * s, 0), off(j.chest, 0.14, 0.17 * s, 0), 0.13, 0.11, 1, KIND.trunk, 0.12);
  cone(off(j.hip, -0.08, 0.19 * s, 0), off(j.chest, -0.05, 0.24 * s, 0), 0.055, 0.07, 0, KIND.trunk, 0.08);
  // The points of the hips and the shoulder blades: bone under the hide.
  for (const side of [-1, 1]) {
    cone(off(j.hip, 0.03, 0.14 * s, side * 0.13), off(j.hip, 0.12, 0.1 * s, side * 0.17), 0.06, 0.045, 0, KIND.trunk, 0.05);
    cone(off(j.chest, 0.02, 0.16 * s, side * 0.12), off(j.chest, 0.07, -0.02, side * 0.2), 0.07, 0.08, 1, KIND.trunk, 0.06);
  }
  for (const [a, b, ra, rb] of j.slump ?? []) cone(a, b, ra, rb, 0, KIND.trunk, 0.12);
  // A stump of a tail.
  cone(off(j.hip, -0.2, 0.1 * s, 0), off(j.hip, -0.31, 0.0, 0), 0.07, 0.035, 0, KIND.trunk, 0.06);
  // The neck, thick and short, and a blunt head that droops to the stump the tendrils grow from. No eyes, no ears, no muzzle.
  cone(j.chest, j.neck, 0.22, 0.17, 2, KIND.neck, 0.1);
  cone(j.neck, j.head, 0.165, 0.125, 2, KIND.neck, 0.08);
  cone(j.head, mixv(j.head, j.face, 0.75), 0.125, 0.085, 3, KIND.head, 0.07);
  cone(mixv(j.head, j.face, 0.75), j.face, 0.085, 0.07, 3, KIND.face, 0.04);
  // A heavy brow of bone over where eyes would be.
  cone(off(j.head, 0.02, 0.07, -0.05), off(j.head, 0.02, 0.07, 0.05), 0.06, 0.06, 3, KIND.head, 0.06);
  // The legs: a heavy upper leg, a lean lower leg with the joint standing out, a broad paw.
  for (let i = 0; i < 4; i++) {
    const top = j.tops[i] as V3;
    const knee = j.knees[i] as V3;
    const ankle = j.ankles[i] as V3;
    const toe = j.toes[i] as V3;
    const fore = i < 2;
    cone(top, knee, fore ? 0.115 : 0.13, 0.072, 4 + i, KIND.upper, 0.07);
    cone(knee, knee, 0.078, 0.078, 8 + i, KIND.lower, 0.03);
    cone(knee, ankle, 0.066, 0.05, 8 + i, KIND.lower, 0.04);
    cone(ankle, ankle, 0.058, 0.058, 8 + i, KIND.lower, 0.03);
    const mid = mixv(ankle, toe, 0.55);
    cone(ankle, mid, 0.052, 0.05, 8 + i, KIND.paw, 0.04);
    // Three toes, spread.
    const along = norm(sub(toe, ankle));
    const across = norm([-along[2], 0, along[0]]);
    for (const t of [-1, 0, 1]) cone(add(mid, scale(across, t * 0.022)), add(add(toe, scale(across, t * 0.05)), scale(along, t === 0 ? 0.02 : 0)), 0.036, 0.027, 8 + i, KIND.paw, 0.025);
  }
  return out;
}

// The distance to a round cone (Quilez).
function roundCone(px: number, py: number, pz: number, c: Prim): number {
  const bax = c.b[0] - c.a[0];
  const bay = c.b[1] - c.a[1];
  const baz = c.b[2] - c.a[2];
  const pax = px - c.a[0];
  const pay = py - c.a[1];
  const paz = pz - c.a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  if (l2 < 1e-10) return Math.hypot(pax, pay, paz) - c.ra;
  const rr = c.ra - c.rb;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const qx = pax * l2 - bax * y;
  const qy = pay * l2 - bay * y;
  const qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - c.rb;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - c.ra;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - c.ra;
}

export interface Skin {
  geometry: THREE.BufferGeometry;
  joints: Joints;
  /** A place on the skin, by the area of it: where it is, its normal, its two bones and the first one's weight, and its kind. */
  pick(rng: Rng): { p: V3; n: V3; bones: [number, number, number]; kind: number };
  /** The distance from the skin at a point, metres (over 0 outside), and the way out of it. */
  field(p: V3): number;
  out(p: V3): V3;
}

/** The skin of a pose. `cell` is the size of the cells its surface is taken on: 0.016 for an animal the lens comes close to. */
export function skin(pose: Pose, cell: number, given?: Joints): Skin {
  const j = given ?? joints(pose);
  const list = prims(j, pose);
  let lo: V3 = [Infinity, Infinity, Infinity];
  let hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const c of list) {
    const r = Math.max(c.ra, c.rb) + cell * 3;
    for (const p of [c.a, c.b]) {
      lo = [Math.min(lo[0], p[0] - r), Math.min(lo[1], p[1] - r), Math.min(lo[2], p[2] - r)];
      hi = [Math.max(hi[0], p[0] + r), Math.max(hi[1], p[1] + r), Math.max(hi[2], p[2] + r)];
    }
  }
  const nx = Math.ceil((hi[0] - lo[0]) / cell) + 1;
  const ny = Math.ceil((hi[1] - lo[1]) / cell) + 1;
  const nz = Math.ceil((hi[2] - lo[2]) / cell) + 1;
  const f = new Float32Array(nx * ny * nz).fill(10);
  for (const c of list) {
    const r = Math.max(c.ra, c.rb) + c.k + cell * 2;
    const x0 = Math.max(0, Math.floor((Math.min(c.a[0], c.b[0]) - r - lo[0]) / cell));
    const x1 = Math.min(nx - 1, Math.ceil((Math.max(c.a[0], c.b[0]) + r - lo[0]) / cell));
    const y0 = Math.max(0, Math.floor((Math.min(c.a[1], c.b[1]) - r - lo[1]) / cell));
    const y1 = Math.min(ny - 1, Math.ceil((Math.max(c.a[1], c.b[1]) + r - lo[1]) / cell));
    const z0 = Math.max(0, Math.floor((Math.min(c.a[2], c.b[2]) - r - lo[2]) / cell));
    const z1 = Math.min(nz - 1, Math.ceil((Math.max(c.a[2], c.b[2]) + r - lo[2]) / cell));
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const i = x + nx * (y + ny * z);
          const d = roundCone(lo[0] + x * cell, lo[1] + y * cell, lo[2] + z * cell, c);
          const was = f[i] as number;
          const h = Math.max(c.k - Math.abs(was - d), 0) / c.k;
          f[i] = Math.min(was, d) - h * h * c.k * 0.25;
        }
  }

  const at = (x: number, y: number, z: number): number => f[x + nx * (y + ny * z)] as number;
  const field = (p: V3): number => {
    const gx = Math.min(nx - 1.001, Math.max(0, (p[0] - lo[0]) / cell));
    const gy = Math.min(ny - 1.001, Math.max(0, (p[1] - lo[1]) / cell));
    const gz = Math.min(nz - 1.001, Math.max(0, (p[2] - lo[2]) / cell));
    const x = Math.floor(gx);
    const y = Math.floor(gy);
    const z = Math.floor(gz);
    const u = gx - x;
    const v = gy - y;
    const w = gz - z;
    const a = (at(x, y, z) * (1 - u) + at(x + 1, y, z) * u) * (1 - v) + (at(x, y + 1, z) * (1 - u) + at(x + 1, y + 1, z) * u) * v;
    const b = (at(x, y, z + 1) * (1 - u) + at(x + 1, y, z + 1) * u) * (1 - v) + (at(x, y + 1, z + 1) * (1 - u) + at(x + 1, y + 1, z + 1) * u) * v;
    return a * (1 - w) + b * w;
  };
  const out = (p: V3): V3 => {
    const e = cell;
    return norm([field([p[0] + e, p[1], p[2]]) - field([p[0] - e, p[1], p[2]]), field([p[0], p[1] + e, p[2]]) - field([p[0], p[1] - e, p[2]]), field([p[0], p[1], p[2] + e]) - field([p[0], p[1], p[2] - e])]);
  };

  // Surface nets.
  const cells = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cellAt = (x: number, y: number, z: number): number => cells[x + (nx - 1) * (y + (ny - 1) * z)] as number;
  const pos: number[] = [];
  const corner = new Float32Array(8);
  for (let z = 0; z < nz - 1; z++)
    for (let y = 0; y < ny - 1; y++)
      for (let x = 0; x < nx - 1; x++) {
        let inside = 0;
        for (let c = 0; c < 8; c++) {
          const v = at(x + (c & 1), y + ((c >> 1) & 1), z + ((c >> 2) & 1));
          corner[c] = v;
          if (v < 0) inside++;
        }
        if (inside === 0 || inside === 8) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (let a = 0; a < 8; a++)
          for (let d = 0; d < 3; d++) {
            const b = a | (1 << d);
            if (b === a) continue;
            const va = corner[a] as number;
            const vb = corner[b] as number;
            if (va < 0 === vb < 0) continue;
            const t = va / (va - vb);
            sx += (a & 1) + (d === 0 ? t : 0);
            sy += ((a >> 1) & 1) + (d === 1 ? t : 0);
            sz += ((a >> 2) & 1) + (d === 2 ? t : 0);
            n++;
          }
        cells[x + (nx - 1) * (y + (ny - 1) * z)] = pos.length / 3;
        pos.push(lo[0] + (x + sx / n) * cell, lo[1] + (y + sy / n) * cell, lo[2] + (z + sz / n) * cell);
      }
  const index: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean): void => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) index.push(a, c, b, a, d, c);
    else index.push(a, b, c, a, c, d);
  };
  for (let z = 1; z < nz - 1; z++)
    for (let y = 1; y < ny - 1; y++)
      for (let x = 1; x < nx - 1; x++) {
        const v = at(x, y, z) < 0;
        if (x < nx - 2 && v !== at(x + 1, y, z) < 0) quad(cellAt(x, y - 1, z - 1), cellAt(x, y, z - 1), cellAt(x, y, z), cellAt(x, y - 1, z), !v);
        if (y < ny - 2 && v !== at(x, y + 1, z) < 0) quad(cellAt(x - 1, y, z - 1), cellAt(x - 1, y, z), cellAt(x, y, z), cellAt(x, y, z - 1), !v);
        if (z < nz - 2 && v !== at(x, y, z + 1) < 0) quad(cellAt(x - 1, y - 1, z), cellAt(x, y - 1, z), cellAt(x, y, z), cellAt(x - 1, y, z), !v);
      }

  const count = pos.length / 3;
  const position = new Float32Array(pos);
  const normal = new Float32Array(count * 3);
  const bones = new Float32Array(count * 3);
  const kind = new Float32Array(count);
  const weigh = (p: V3): { bones: [number, number, number]; kind: number } => {
    const near = new Float32Array(BONES).fill(1e3);
    let k = 0;
    let best = 1e3;
    for (const c of list) {
      const d = roundCone(p[0], p[1], p[2], c);
      if (d < (near[c.bone] as number)) near[c.bone] = d;
      if (d < best) {
        best = d;
        k = c.kind;
      }
    }
    let b1 = 0;
    let b2 = 0;
    let d1 = 1e3;
    let d2 = 1e3;
    for (let b = 0; b < BONES; b++) {
      const d = near[b] as number;
      if (d < d1) {
        d2 = d1;
        b2 = b1;
        d1 = d;
        b1 = b;
      } else if (d < d2) {
        d2 = d;
        b2 = b;
      }
    }
    return { bones: [b1, b2, Math.min(1, 0.5 + (d2 - d1) / 0.16)], kind: k };
  };
  for (let i = 0; i < count; i++) {
    const p: V3 = [position[i * 3] as number, position[i * 3 + 1] as number, position[i * 3 + 2] as number];
    normal.set(out(p), i * 3);
    const w = weigh(p);
    bones.set(w.bones, i * 3);
    kind[i] = w.kind;
  }
  // Wind the faces to the way out.
  {
    const a = index[0] as number;
    const b = index[1] as number;
    const c = index[2] as number;
    const A = new THREE.Vector3().fromArray(position, a * 3);
    const face = new THREE.Vector3().fromArray(position, b * 3).sub(A).cross(new THREE.Vector3().fromArray(position, c * 3).sub(A));
    if (face.dot(new THREE.Vector3().fromArray(normal, a * 3)) < 0) for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2] as number, index[i + 1] as number];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('aBones', new THREE.BufferAttribute(bones, 3));
  geometry.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
  geometry.setIndex(index);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0.3, 0.5, 0), 2.6);

  // Places on the skin by area.
  const tris = index.length / 3;
  const area = new Float32Array(tris);
  let total = 0;
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const C = new THREE.Vector3();
  for (let t = 0; t < tris; t++) {
    A.fromArray(position, (index[t * 3] as number) * 3);
    B.fromArray(position, (index[t * 3 + 1] as number) * 3).sub(A);
    C.fromArray(position, (index[t * 3 + 2] as number) * 3).sub(A);
    total += B.cross(C).length() * 0.5;
    area[t] = total;
  }
  const pick: Skin['pick'] = (rng) => {
    const want = rng.next() * total;
    let a = 0;
    let b = tris - 1;
    while (a < b) {
      const m = (a + b) >> 1;
      if ((area[m] as number) < want) a = m + 1;
      else b = m;
    }
    let u = rng.next();
    let v = rng.next();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const i0 = (index[a * 3] as number) * 3;
    const i1 = (index[a * 3 + 1] as number) * 3;
    const i2 = (index[a * 3 + 2] as number) * 3;
    const p: V3 = [0, 0, 0];
    for (let d = 0; d < 3; d++) p[d] = (position[i0 + d] as number) * (1 - u - v) + (position[i1 + d] as number) * u + (position[i2 + d] as number) * v;
    const w = weigh(p);
    return { p, n: out(p), bones: w.bones, kind: w.kind };
  };
  return { geometry, joints: j, pick, field, out };
}

/** The claws: three hooked horns on each paw, built on the pose. Tubes that taper to a point. */
export function claws(j: Joints): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const bones: number[] = [];
  const kind: number[] = [];
  const index: number[] = [];
  const RING = 7;
  const SEG = 6;
  for (let i = 0; i < 4; i++) {
    const ankle = j.ankles[i] as V3;
    const toe = j.toes[i] as V3;
    const along = norm(sub(toe, ankle));
    const across = norm([-along[2], 0, along[0]]);
    const upish = norm([along[1] * -along[0], 1 - along[1] * along[1], along[1] * -along[2]]);
    for (const t of [-1, 0, 1]) {
      const root = add(add(toe, scale(across, t * 0.05)), scale(along, (t === 0 ? 0.02 : 0) + 0.005));
      const way = norm(add(along, scale(across, t * 0.28)));
      const long = 0.085 + 0.02 * (t === 0 ? 1 : 0) + 0.012 * ((i * 3 + t + 4) % 3);
      const base = pos.length / 3;
      for (let s = 0; s <= SEG; s++) {
        const u = s / SEG;
        // Out and up a little, then hooked down to the ground.
        const c = add(add(root, scale(way, long * (u - 0.25 * u * u))), scale(upish, long * (0.22 * u - 0.75 * u * u)));
        const r = 0.02 * (1 - u) ** 0.8 + 0.0012;
        const ahead = norm(add(scale(way, 1 - 0.5 * u), scale(upish, 0.22 - 1.5 * u)));
        const side = norm([ahead[1] * upish[2] - ahead[2] * upish[1], ahead[2] * upish[0] - ahead[0] * upish[2], ahead[0] * upish[1] - ahead[1] * upish[0]]);
        const over: V3 = [side[1] * ahead[2] - side[2] * ahead[1], side[2] * ahead[0] - side[0] * ahead[2], side[0] * ahead[1] - side[1] * ahead[0]];
        for (let k = 0; k < RING; k++) {
          const a = (k / RING) * Math.PI * 2;
          const n = add(scale(side, Math.cos(a) * 0.8), scale(over, Math.sin(a)));
          const p = add(c, scale(n, r));
          pos.push(p[0], Math.max(p[1], 0.002), p[2]);
          nor.push(...norm(n));
          bones.push(8 + i, 8 + i, 1);
          kind.push(KIND.claw);
        }
      }
      for (let s = 0; s < SEG; s++)
        for (let k = 0; k < RING; k++) {
          const a = base + s * RING + k;
          const b = base + s * RING + ((k + 1) % RING);
          index.push(a, b, a + RING, b, b + RING, a + RING);
        }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aBones', new THREE.Float32BufferAttribute(bones, 3));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  g.setIndex(index);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0.3, 0.5, 0), 2.6);
  return g;
}

export interface CoatOptions {
  /** Clumps of locks, and locks in a clump. */
  clumps: number;
  locks: number;
  /** How far the coat of the flanks hangs free, 0 to 1. */
  hang?: number;
  /** 1 the usual length. */
  long: number;
  /** Where the coat is burned off, in the animal's metres, and how far (0 for none). */
  burn: [number, number, number, number];
  /** The way along the body, down which the burn is narrow, and how much narrower less one. */
  burnAxis?: V3;
  burnNarrow?: number;
  /** The way the wind lays the coat, in the animal's frame, and how much. */
  wind: V3;
  /** Where no clump is grown: the side an animal lies on, that no lens sees. */
  skip?: (p: V3, n: V3) => boolean;
  /** True where the coat lies over the lips of the burn and is not cut short there. */
  lips?: boolean;
  /** The length of the coat by kind of place, where it is not the usual. */
  lengths?: number[];
}

export interface Coat {
  root: Float32Array;
  ctrl: Float32Array;
  tip: Float32Array;
  card: Float32Array;
  bones: Float32Array;
  count: number;
}

const LENGTH = [0.2, 0.18, 0.15, 0.14, 0.06, 0, 0, 0.09];

/** The coat: locks in clumps. The locks of a clump are rooted round one place and their ends are drawn together to one point, as wet hair
 * mats. Each hangs: it leaves the skin along its normal, is laid back by the wind, and falls. */
export function coat(body: Skin, rng: Rng, o: CoatOptions): Coat {
  const most = o.clumps * o.locks;
  const root = new Float32Array(most * 3);
  const ctrl = new Float32Array(most * 3);
  const tip = new Float32Array(most * 3);
  const card = new Float32Array(most * 4);
  const bones = new Float32Array(most * 4);
  let count = 0;
  // How far a place is from the middle of the burn, in the burn's own reach: narrow along the body, long round it.
  const burnAt = (p: V3 | number[]): number => {
    if (o.burn[3] <= 0) return 9;
    const r: V3 = [(p[0] as number) - o.burn[0], (p[1] as number) - o.burn[1], (p[2] as number) - o.burn[2]];
    const ax = o.burnAxis ?? [0, 0, 0];
    const along = (r[0] * ax[0] + r[1] * ax[1] + r[2] * ax[2]) * (o.burnNarrow ?? 0);
    return Math.hypot(r[0] + ax[0] * along, r[1] + ax[1] * along, r[2] + ax[2] * along) / o.burn[3];
  };
  for (let c = 0; c < o.clumps; c++) {
    const at = body.pick(rng);
    const base = (o.lengths ?? LENGTH)[at.kind] as number;
    if (base <= 0) continue;
    if (o.skip && o.skip(at.p, at.n)) continue;
    // The face end of the head is bare; under the belly and inside the legs the coat hangs long.
    // The burn is on the trunk; a leg that lies in front of it keeps its coat. With the lips kept, the bare split closes toward its ends.
    const reach = o.burn[3] > 0 ? Math.hypot(at.p[0] - o.burn[0], at.p[1] - o.burn[1], at.p[2] - o.burn[2]) / o.burn[3] : 0;
    const ends = Math.min(1, Math.max(0, (reach - 0.45) / 0.55));
    const burned = o.lips && at.kind >= KIND.upper ? 9 : burnAt(at.p) + (o.lips ? 0.5 * ends * ends * (3 - 2 * ends) : 0);
    // Behind the split the coat is combed away from it and grows to its very lip; ahead of it the coat lies over it.
    const behind = o.lips === true && ((at.p[0] - o.burn[0]) * (o.burnAxis?.[0] ?? 0) + (at.p[1] - o.burn[1]) * (o.burnAxis?.[1] ?? 0) + (at.p[2] - o.burn[2]) * (o.burnAxis?.[2] ?? 0)) < 0;
    const bare = behind ? 0.55 : 0.75;
    const singe = Math.min(1, Math.max(0, (burned - bare) / (behind ? 0.45 : 0.8)));
    if (burned < bare || (burned < bare + 0.25 && rng.next() < 0.5)) continue;
    // On the flanks of one that rests the coat hangs in long matted curtains to the floor.
    const flank = (o.hang ?? 0) * Math.max(0, 1 - 1.3 * Math.abs(at.n[1])) * (at.p[1] > 0.25 ? 1 : 0.4);
    const long = base * o.long * rng.range(0.7, 1.35) * (0.12 + 0.88 * singe) * (1 + 0.5 * Math.max(0, -at.n[1])) * (1 + 1.6 * flank);
    // The way the clump lies: down the skin as gravity and the wind comb it, standing off it only a little, so the coat keeps the shape
    // of what is under it. Under the belly it hangs free.
    // Combed toward the tail, as any coat grows.
    const pull: V3 = add([-0.55, -1, 0], scale(o.wind, 0.6 + 0.8 * rng.next()));
    const into = pull[0] * at.n[0] + pull[1] * at.n[1] + pull[2] * at.n[2];
    const slide = sub(pull, scale(at.n, Math.min(0, into)));
    const jitter: V3 = [rng.range(-0.22, 0.22), rng.range(-0.1, 0.1), rng.range(-0.22, 0.22)];
    let fall = norm(add(add(slide, jitter), scale(at.n, 0.06)));
    // A coat never stands on end.
    if (fall[1] > 0.05) fall = norm([fall[0], 0.05, fall[2]]);
    if (flank > 0) fall = norm([fall[0] * (1 - 0.75 * flank), fall[1] - 1.3 * flank, fall[2] * (1 - 0.75 * flank)]);
    // Round the burn the melted coat froze again as it stood: clotted spikes, white with ice, standing off the hide.
    const spike = burned >= 1.0 && burned < 1.55 && rng.next() < (o.lips ? 0.18 : 0.55);
    if (spike) fall = norm(add(scale(fall, 0.8), scale(at.n, 0.55)));
    const end = add(at.p, add(scale(at.n, long * 0.14), scale(fall, long * (spike ? 1.15 : 1))));
    const spread = 0.016 + 0.022 * rng.next();
    const tx = norm([at.n[1] - at.n[2], at.n[2] - at.n[0], at.n[0] - at.n[1]]);
    const ty: V3 = [at.n[1] * tx[2] - at.n[2] * tx[1], at.n[2] * tx[0] - at.n[0] * tx[2], at.n[0] * tx[1] - at.n[1] * tx[0]];
    const frost = rng.next();
    for (let l = 0; l < o.locks; l++) {
      const a = rng.range(0, Math.PI * 2);
      const r = spread * Math.sqrt(rng.next()) * (l === 0 ? 0 : 1);
      let p = add(at.p, add(scale(tx, Math.cos(a) * r), scale(ty, Math.sin(a) * r)));
      // Back onto the skin, a little under it so no root shows.
      const n = body.out(p);
      p = add(p, scale(n, -body.field(p) - 0.006));
      const own = add(p, add(scale(n, long * 0.14), scale(fall, long * rng.range(0.7, 1.05))));
      const e: V3 = mixv(own, end, spike ? 0.97 : 0.55);
      // A lock lies on the coat: its end is never far out of the body.
      // (Far from the skin the field is not known: there the end is drawn back toward its root first.)
      for (let tries = 0; tries < (spike || flank > 0.35 ? 0 : 4); tries++) {
        const f = body.field(e);
        if (f <= long * 0.2) break;
        if (f > 0.25) {
          e[0] = (e[0] + p[0]) * 0.5;
          e[1] = (e[1] + p[1]) * 0.5;
          e[2] = (e[2] + p[2]) * 0.5;
          continue;
        }
        const o2 = body.out(e);
        const far = f - long * 0.2;
        e[0] -= o2[0] * far;
        e[1] -= o2[1] * far;
        e[2] -= o2[2] * far;
      }
      // The ground stops a lock.
      if (e[1] < 0.012) e[1] = 0.012 + 0.01 * rng.next();
      if (o.burn[3] > 0) {
        const over = burned > 8 ? 9 : burnAt(e);
        if (over < 0.8 && !spike) {
          const keep = o.lips ? 0.5 + 0.35 * rng.next() : 0.25 + 0.3 * rng.next();
          e[0] = p[0] + (e[0] - p[0]) * keep;
          e[1] = p[1] + (e[1] - p[1]) * keep;
          e[2] = p[2] + (e[2] - p[2]) * keep;
        }
      }
      const mid = add(mixv(p, e, 0.45), scale(n, long * rng.range(0.06, 0.14)));
      if (mid[1] < 0.02) mid[1] = 0.02;
      root.set(p, count * 3);
      ctrl.set(mid, count * 3);
      tip.set(e, count * 3);
      card.set([long * 0.115 * rng.range(0.85, 1.3) * (0.6 + 0.4 * singe), rng.next(), spike ? 2.2 : frost, spike ? 1 : singe * (0.4 + 0.6 * Math.min(1, Math.max(0, (burned - 0.7) / 1.4)))], count * 4);
      bones.set([at.bones[0], at.bones[1], at.bones[2], at.kind], count * 4);
      count++;
    }
  }
  return { root, ctrl, tip, card, bones, count };
}

/** One lock, before it is laid on its curve: x across it (-1 to 1), y along it (0 at the root). */
export function lockGeometry(segments: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const index: number[] = [];
  for (let s = 0; s <= segments; s++) pos.push(-1, s / segments, 0, 1, s / segments, 0);
  for (let s = 0; s < segments; s++) {
    const a = s * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  return g;
}

export function tendrilGeometry(round = 7, along = 20): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(1, 1, 1, round, along, true);
  g.translate(0, 0.5, 0);
  return g;
}
