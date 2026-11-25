// One mud-wallower: a trunk, four legs and a fringe of feelers, each a tube of rings in the herd's one skin.
// The pose is written from a Drive, which is a pure function of the seconds (walk() for the herd; the dead and the stuck one make their own).
import { Skin, type Tube } from './skin';

const TAU = Math.PI * 2;
const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const bell = (a: number, b: number, v: number): number => smooth(a, a + (b - a) * 0.35, v) * (1 - smooth(a + (b - a) * 0.65, b, v));

export const BODY_RINGS = 64;
export const BODY_SIDES = 28;
export const LEG_RINGS = 12;
export const LEG_SIDES = 12;
export const FEELERS = 11;
export const FEELER_RINGS = 8;
export const FEELER_SIDES = 6;

// The trunk of an adult of size 1, rump to muzzle: how far along (0 to 1), x forward, y of the middle, half height, half width. Metres.
const KNOTS: [number, number, number, number, number][] = [
  [0.0, -2.08, 0.98, 0.02, 0.02],
  [0.03, -2.04, 0.99, 0.36, 0.4],
  [0.08, -1.88, 1.02, 0.63, 0.68],
  [0.18, -1.42, 1.08, 0.81, 0.88],
  [0.32, -0.72, 1.12, 0.9, 1.0],
  [0.46, 0.0, 1.15, 0.93, 1.02],
  [0.58, 0.6, 1.16, 0.9, 0.95],
  [0.68, 1.1, 1.07, 0.78, 0.83],
  [0.77, 1.52, 0.93, 0.63, 0.7],
  [0.85, 1.86, 0.77, 0.51, 0.6],
  [0.92, 2.16, 0.6, 0.41, 0.54],
  [0.97, 2.36, 0.48, 0.3, 0.46],
  [1.0, 2.45, 0.44, 0.02, 0.04],
];

function knot(s: number, col: number): number {
  let i = 0;
  while (i < KNOTS.length - 2 && s > KNOTS[i + 1][0]) i++;
  const a = KNOTS[i];
  const b = KNOTS[i + 1];
  const before = KNOTS[Math.max(0, i - 1)];
  const after = KNOTS[Math.min(KNOTS.length - 1, i + 2)];
  const h = b[0] - a[0];
  const u = clamp((s - a[0]) / h);
  const ma = i === 0 ? (b[col] - a[col]) / h : (b[col] - before[col]) / (b[0] - before[0]);
  const mb = i + 2 > KNOTS.length - 1 ? (b[col] - a[col]) / h : (after[col] - a[col]) / (after[0] - a[0]);
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * a[col] + (u3 - 2 * u2 + u) * h * ma + (-2 * u3 + 3 * u2) * b[col] + (u3 - u2) * h * mb;
}

// A hash of two integers to 0..1, and smooth noise on it. Shapes only, at creation.
const cell = (i: number, j: number, s: number): number => {
  let h = (Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 0x9e3779b1)) | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
export const lump = (x: number, y: number, s: number): number => {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const u = x - i;
  const v = y - j;
  const a = u * u * (3 - 2 * u);
  const b = v * v * (3 - 2 * v);
  return (cell(i, j, s) * (1 - a) + cell(i + 1, j, s) * a) * (1 - b) + (cell(i, j + 1, s) * (1 - a) + cell(i + 1, j + 1, s) * a) * b;
};

export interface Build {
  /** Size: 1 is an adult about 4.5 m long and 2.1 m at the back. */
  k: number;
  /** 0 an adult, 1 a young one: a larger head, a rounder trunk, shorter feelers. */
  young: number;
  seed: number;
  /** Girth, about 1. */
  bulk: number;
  /** 0 to 1: how much salt is caked on what looks up. 1 and more is a dead one, coated. */
  salt: number;
}

/** What a pose is made from. Lengths in metres of the world, angles in radians. The frame of the path: x forward, y up, z to the right. */
export interface Drive {
  /** The middle of the trunk on the ground plane, and the level its feet stand at. */
  ox: number;
  oy: number;
  oz: number;
  dir: [number, number];
  surge: number;
  shift: number;
  bob: number;
  roll: number;
  pitch: number;
  bend: number;
  headYaw: number;
  headPitch: number;
  /** -1 to 1: out and in. */
  breath: number;
  /** The belly swings sideways behind the weight, metres. */
  sway: number;
  /** The trunk's height, 1 as built: a dead one has fallen in. */
  squash: number;
  /** Feet, in the frame of the path about the origin: LH, LF, RH, RF. y is the lift above oy. */
  feet: [number, number, number][];
  /** For each feeler: how far it is curled, radians over its length. */
  curl: number[];
  /** How far the feelers stand out from the muzzle, about 0 (hanging) to 1 (spread). */
  splay: number;
}

export interface Stood {
  x: number;
  z: number;
  yaw: number;
  feet: { x: number; z: number; lift: number }[];
  muzzle: { x: number; y: number; z: number };
  belly: { x: number; y: number; z: number };
}

const LEG_AT: [number, number][] = [
  [-1.22, -1],
  [0.78, -1],
  [-1.22, 1],
  [0.78, 1],
];
// A leg from where it leaves the trunk to its sole: the radius down it, for an adult of size 1.
const LEG_R = [0.4, 0.38, 0.345, 0.31, 0.285, 0.27, 0.262, 0.268, 0.285, 0.31, 0.3, 0.02];

export class Animal {
  readonly body: Tube;
  readonly legs: Tube[] = [];
  readonly feelers: Tube[] = [];
  private readonly s = new Float32Array(BODY_RINGS);
  private readonly cx = new Float32Array(BODY_RINGS);
  private readonly cy = new Float32Array(BODY_RINGS);
  private readonly cz = new Float32Array(BODY_RINGS);
  private readonly half = new Float32Array(BODY_RINGS * 2);
  private readonly shape = new Float32Array(BODY_SIDES * 2);
  private readonly lumps = new Float32Array(BODY_RINGS * BODY_SIDES);
  private readonly feelerAt: { ring: number; angle: number; length: number; radius: number; lean: number }[] = [];
  readonly stood: Stood = { x: 0, z: 0, yaw: 0, feet: [0, 1, 2, 3].map(() => ({ x: 0, z: 0, lift: 0 })), muzzle: { x: 0, y: 0, z: 0 }, belly: { x: 0, y: 0, z: 0 } };

  constructor(
    private readonly skin: Skin,
    readonly b: Build,
  ) {
    const { k, young, seed, bulk } = b;
    const sd = Math.floor(seed * 9973);
    this.body = skin.tube(BODY_RINGS, BODY_SIDES);
    for (let i = 0; i < BODY_RINGS; i++) {
      // Rings stand closer in the neck and the head, where the rolls of skin are.
      const u = i / (BODY_RINGS - 1);
      const s = u < 0.5 ? u * 1.16 : 0.58 + (u - 0.5) * 0.84;
      this.s[i] = s;
      const head = smooth(0.7, 0.9, s);
      this.half[i * 2] = k * knot(s, 3) * (1 + 0.22 * young * head + 0.08 * young) * (0.96 + 0.08 * bulk);
      this.half[i * 2 + 1] = k * knot(s, 4) * bulk * (1 + 0.2 * young * head);
    }
    for (let j = 0; j < BODY_SIDES; j++) {
      const a = (j / BODY_SIDES) * TAU;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      // Broad and flat under: a boxier section than a round one, the belly drawn up a little and the flanks hanging over it.
      const z = Math.sign(c) * Math.pow(Math.abs(c), 0.78);
      let y = Math.sign(sn) * Math.pow(Math.abs(sn), 0.86);
      if (sn < 0) y *= 0.86;
      this.shape[j * 2] = z * (1 + 0.07 * Math.exp(-((sn + 0.42) ** 2) / 0.03));
      this.shape[j * 2 + 1] = y;
    }
    for (let i = 0; i < BODY_RINGS; i++) {
      const s = this.s[i];
      const along = knot(s, 1);
      for (let j = 0; j < BODY_SIDES; j++) {
        const a = (j / BODY_SIDES) * TAU;
        const sn = Math.sin(a);
        // Rolls of slack skin round the neck and behind the shoulder, deeper under the throat; none alike.
        const neck = bell(0.56, 0.9, s);
        const wob = lump(along * 1.7 + 3, a * 1.3, sd) - 0.5;
        const rolls = Math.pow(0.5 + 0.5 * Math.sin((along + 0.16 * wob) * (TAU / 0.27) + 1.6 * wob), 1.6) - 0.4;
        let m = 1 + neck * 0.05 * rolls * (1 - 0.35 * sn);
        m += 0.07 * (lump(along * 1.1 + 9, a * 0.9 + 2, sd + 1) - 0.5) + 0.03 * (lump(along * 3.1, a * 2.6, sd + 2) - 0.5);
        // The haunch and the shoulder stand out over the legs.
        for (const [lx, side] of LEG_AT) {
          const dz = Math.cos(a) * side;
          m += 0.07 * Math.exp(-((along - lx) ** 2) / 0.2) * smooth(0.2, 0.9, dz) * smooth(-0.9, -0.1, -Math.abs(sn + 0.25));
        }
        // Two rows of vents along the back, each a low chimney: nothing on Earth breathes through its back in a row.
        const row = Math.exp(-((Math.abs(Math.cos(a)) - 0.36) ** 2) / 0.006) * smooth(0.3, 0.8, sn);
        const vent = Math.pow(Math.max(0, Math.cos((along + 1.25) * (TAU / 0.46))), 6) * bell(0.14, 0.66, s);
        m += 0.075 * row * vent;
        this.lumps[i * BODY_SIDES + j] = m;
      }
    }
    const girth = TAU * 0.9 * k;
    for (let i = 0; i < BODY_RINGS; i++) {
      const s = this.s[i];
      for (let j = 0; j <= BODY_SIDES; j++) {
        const a = (j / BODY_SIDES) * TAU;
        // Shade: the belly and the throat see little sky.
        const shade = 0.55 + 0.45 * smooth(-0.9, 0.1, Math.sin(a));
        skin.describe(this.body, i, j, (knot(s, 1) + 2.1) * k, (j / BODY_SIDES) * girth, b.salt, shade, this.half[i * 2 + 1], seed, 0, s);
      }
    }
    for (let l = 0; l < 4; l++) {
      const t = skin.tube(LEG_RINGS, LEG_SIDES);
      this.legs.push(t);
      for (let i = 0; i < LEG_RINGS; i++) {
        const u = i / (LEG_RINGS - 1);
        for (let j = 0; j <= LEG_SIDES; j++) {
          skin.describe(t, i, j, u * 1.1 * k, (j / LEG_SIDES) * TAU * 0.3 * k, b.salt, 0.5 + 0.5 * smooth(0.15, 0.7, u), LEG_R[i] * k, seed + 0.13 * (l + 1), 1, u);
        }
      }
    }
    for (let f = 0; f < FEELERS; f++) {
      const t = skin.tube(FEELER_RINGS, FEELER_SIDES);
      this.feelers.push(t);
      const u = f / (FEELERS - 1);
      // A fringe round the under lip of the muzzle, from one corner to the other, in two uneven ranks.
      const angle = Math.PI * (1.08 + 0.84 * u) + 0.12 * (cell(f, 1, sd) - 0.5);
      const ring = BODY_RINGS - 4 - (f % 2) * 2 - Math.floor(3 * Math.abs(u - 0.5));
      const length = k * (0.5 + 0.22 * cell(f, 2, sd) - 0.14 * Math.abs(u - 0.5)) * (1 - 0.3 * young);
      const radius = k * (0.042 + 0.014 * cell(f, 3, sd)) * (1 + 0.25 * young);
      this.feelerAt.push({ ring, angle, length, radius, lean: (u - 0.5) * 1.5 });
      for (let i = 0; i < FEELER_RINGS; i++) {
        const v = i / (FEELER_RINGS - 1);
        for (let j = 0; j <= FEELER_SIDES; j++) skin.describe(t, i, j, v * length, (j / FEELER_SIDES) * TAU * radius, 0, 0.75, radius, seed + 0.07 * f, 2, v);
      }
    }
  }

  pose(d: Drive): Stood {
    const { k } = this.b;
    const P = this.skin.position;
    const fx = d.dir[0];
    const fz = d.dir[1];
    const rx = -fz;
    const rz = fx;
    const cr = Math.cos(d.roll);
    const sr = Math.sin(d.roll);
    const cp = Math.cos(d.pitch);
    const sp = Math.sin(d.pitch);
    const midY = 1.1 * k;
    // A point of the trunk as built, carried by the trunk's own motion (pitch about its middle, roll about the ground under it, then the shifts).
    const carry = (x: number, y: number, z: number, out: Float32Array, o: number): void => {
      const yy = y - midY;
      const x1 = x * cp + yy * sp;
      const y1 = -x * sp + yy * cp + midY;
      const y2 = y1 * cr - z * sr;
      const z2 = y1 * sr + z * cr;
      out[o] = x1 + d.surge;
      out[o + 1] = y2 + d.bob;
      out[o + 2] = z2 + d.shift;
    };
    const tmp = new Float32Array(3);
    const world = (x: number, y: number, z: number, o: number): void => {
      P[o] = d.ox + fx * x + rx * z;
      P[o + 1] = d.oy + y;
      P[o + 2] = d.oz + fz * x + rz * z;
    };

    // The spine.
    const px = 1.0 * k;
    const py = 1.1 * k;
    for (let i = 0; i < BODY_RINGS; i++) {
      const s = this.s[i];
      let x = knot(s, 1) * k;
      let y = (knot(s, 2) - 1.1) * k * d.squash + 1.1 * k * (0.35 + 0.65 * d.squash);
      let z = d.bend * k * 4 * (s - 0.42) * (s - 0.42);
      const w = smooth(0.56, 0.93, s);
      if (w > 0) {
        const th = d.headPitch * w;
        const ps = d.headYaw * w;
        const dx = x - px;
        const dy = y - py;
        const x1 = dx * Math.cos(th) + dy * Math.sin(th);
        const y1 = -dx * Math.sin(th) + dy * Math.cos(th);
        x = px + x1 * Math.cos(ps);
        z += x1 * Math.sin(ps);
        y = py + y1;
      }
      carry(x, y, z, tmp, 0);
      this.cx[i] = tmp[0];
      this.cy[i] = tmp[1];
      this.cz[i] = tmp[2];
    }
    const w = BODY_SIDES + 1;
    const ringAxes = new Float32Array(BODY_RINGS * 6);
    for (let i = 0; i < BODY_RINGS; i++) {
      const a = Math.max(0, i - 1);
      const b = Math.min(BODY_RINGS - 1, i + 1);
      let tx = this.cx[b] - this.cx[a];
      let ty = this.cy[b] - this.cy[a];
      let tz = this.cz[b] - this.cz[a];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl;
      ty /= tl;
      tz /= tl;
      // side = t x up, up' = side x t; up leans with the roll.
      const ux = 0;
      const uy = cr;
      const uz = sr;
      let nx = ty * uz - tz * uy;
      let ny = tz * ux - tx * uz;
      let nz = tx * uy - ty * ux;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const bx = ny * tz - nz * ty;
      const by = nz * tx - nx * tz;
      const bz = nx * ty - ny * tx;
      ringAxes.set([nx, ny, nz, bx, by, bz], i * 6);
      const s = this.s[i];
      const chest = bell(0.12, 0.66, s);
      const breathe = 1 + 0.028 * d.breath * chest;
      const hh = this.half[i * 2] * d.squash * breathe;
      const hw = this.half[i * 2 + 1] * (1 + 0.5 * (1 - d.squash)) * breathe;
      let o = (this.body.start + i * w) * 3;
      for (let j = 0; j < w; j++) {
        const jj = j === BODY_SIDES ? 0 : j;
        const m = this.lumps[i * BODY_SIDES + jj];
        const sy = this.shape[jj * 2 + 1];
        const lz = this.shape[jj * 2] * hw * m + d.sway * chest * Math.max(0, -sy);
        const ly = sy * hh * m;
        world(this.cx[i] + nx * lz + bx * ly, this.cy[i] + ny * lz + by * ly, this.cz[i] + nz * lz + bz * ly, o);
        o += 3;
      }
    }
    this.skin.normals(this.body);

    // The legs: from under the haunch or the shoulder, a little bent, to a foot that stays where it was put down.
    for (let l = 0; l < 4; l++) {
      const [lx, side] = LEG_AT[l];
      carry(lx * k, 0.98 * k * (0.4 + 0.6 * d.squash), side * 0.5 * k * this.b.bulk, tmp, 0);
      const ax = tmp[0];
      const ay = tmp[1];
      const az = tmp[2];
      const foot = d.feet[l];
      const kx = (ax + foot[0]) / 2 + (lx > 0 ? 0.07 : -0.05) * k;
      const ky = (ay + foot[1]) / 2 + 0.06 * k;
      const kz = (az + foot[2]) / 2 + side * 0.05 * k;
      const t = this.legs[l];
      const lw = LEG_SIDES + 1;
      for (let i = 0; i < LEG_RINGS; i++) {
        // The last rings are the pad: it stands square on the ground whatever the leg does.
        const u = Math.min(1, i / (LEG_RINGS - 2.2));
        const q = 1 - u;
        let x = q * q * ax + 2 * q * u * kx + u * u * foot[0];
        let y = q * q * ay + 2 * q * u * ky + u * u * foot[1];
        let z = q * q * az + 2 * q * u * kz + u * u * foot[2];
        let tx = 2 * q * (kx - ax) + 2 * u * (foot[0] - kx);
        let ty = 2 * q * (ky - ay) + 2 * u * (foot[1] - ky);
        let tz = 2 * q * (kz - az) + 2 * u * (foot[2] - kz);
        if (i >= LEG_RINGS - 2) {
          x = foot[0];
          z = foot[2];
          y = foot[1] + (i === LEG_RINGS - 2 ? 0.05 * k : 0);
          tx = 0;
          ty = -1;
          tz = 0;
        }
        const pad = smooth(LEG_RINGS - 5, LEG_RINGS - 2, i);
        tx *= 1 - pad;
        tz *= 1 - pad;
        ty = ty * (1 - pad) - pad;
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl;
        ty /= tl;
        tz /= tl;
        // side = t x forward.
        let nx = 0;
        let ny = tz;
        let nz = -ty;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;
        const bx = ny * tz - nz * ty;
        const by = nz * tx - nx * tz;
        const bz = nx * ty - ny * tx;
        const r = LEG_R[i] * k * (1 + 0.12 * this.b.young);
        let o = (t.start + i * lw) * 3;
        for (let j = 0; j < lw; j++) {
          const a = ((j === LEG_SIDES ? 0 : j) / LEG_SIDES) * TAU;
          const rr = r * (1 + 0.06 * Math.sin(a * 3 + l + i * 0.9));
          const c = Math.cos(a) * rr;
          const s2 = Math.sin(a) * rr;
          world(x + nx * c + bx * s2, y + ny * c + by * s2, z + nz * c + bz * s2, o);
          o += 3;
        }
      }
      this.skin.normals(t);
      const st = this.stood.feet[l];
      st.x = d.ox + fx * foot[0] + rx * foot[2];
      st.z = d.oz + fz * foot[0] + rz * foot[2];
      st.lift = foot[1];
    }

    // The feelers: each hangs from the lip and hooks back under it, and each rakes by itself.
    const fw = FEELER_SIDES + 1;
    for (let f = 0; f < FEELERS; f++) {
      const at = this.feelerAt[f];
      const i = at.ring;
      const nx = ringAxes[i * 6];
      const ny = ringAxes[i * 6 + 1];
      const nz = ringAxes[i * 6 + 2];
      const bx = ringAxes[i * 6 + 3];
      const by = ringAxes[i * 6 + 4];
      const bz = ringAxes[i * 6 + 5];
      // t = b x n (forward along the spine).
      const tx = by * nz - bz * ny;
      const ty = bz * nx - bx * nz;
      const tz = bx * ny - by * nx;
      const ca = Math.cos(at.angle);
      const sa = Math.sin(at.angle);
      const hw = this.half[i * 2 + 1] * 0.86;
      const hh = this.half[i * 2] * 0.86 * d.squash;
      let x = this.cx[i] + nx * ca * hw + bx * sa * hh;
      let y = this.cy[i] + ny * ca * hw + by * sa * hh;
      let z = this.cz[i] + nz * ca * hw + bz * sa * hh;
      // It leaves the lip forward, down and a little outward, and curls toward down and back.
      const out = 0.25 + 0.75 * d.splay;
      let dx = tx * 0.75 + (nx * ca + bx * sa) * out + nx * at.lean * 0.25;
      let dy = ty * 0.75 + (ny * ca + by * sa) * out - 0.35 * (1 - d.splay) + ny * at.lean * 0.25;
      let dz = tz * 0.75 + (nz * ca + bz * sa) * out + nz * at.lean * 0.25;
      let dl = Math.hypot(dx, dy, dz) || 1;
      dx /= dl;
      dy /= dl;
      dz /= dl;
      // The way it curls: down and back, made square to where it starts.
      let qx = -tx * 0.8;
      let qy = -ty * 0.8 - 0.9;
      let qz = -tz * 0.8;
      const along = qx * dx + qy * dy + qz * dz;
      qx -= along * dx;
      qy -= along * dy;
      qz -= along * dz;
      const ql = Math.hypot(qx, qy, qz) || 1;
      qx /= ql;
      qy /= ql;
      qz /= ql;
      // The third axis of its section.
      const sx = dy * qz - dz * qy;
      const sy = dz * qx - dx * qz;
      const sz = dx * qy - dy * qx;
      const t = this.feelers[f];
      const seg = at.length / (FEELER_RINGS - 1);
      for (let r = 0; r < FEELER_RINGS; r++) {
        const v = r / (FEELER_RINGS - 1);
        const ang = d.curl[f] * v * (0.4 + 0.6 * v);
        const c = Math.cos(ang);
        const s2 = Math.sin(ang);
        const ex = dx * c + qx * s2;
        const ey = dy * c + qy * s2;
        const ez = dz * c + qz * s2;
        const gx = -dx * s2 + qx * c;
        const gy = -dy * s2 + qy * c;
        const gz = -dz * s2 + qz * c;
        if (r > 0) {
          x += ex * seg;
          y += ey * seg;
          z += ez * seg;
        }
        const rad = r === FEELER_RINGS - 1 ? at.radius * 0.05 : at.radius * (1 - 0.72 * v) * (r === 0 ? 1.25 : 1);
        let o = (t.start + r * fw) * 3;
        for (let j = 0; j < fw; j++) {
          const a = ((j === FEELER_SIDES ? 0 : j) / FEELER_SIDES) * TAU;
          const c2 = Math.cos(a) * rad;
          const s3 = Math.sin(a) * rad;
          world(x + sx * c2 + gx * s3, y + sy * c2 + gy * s3, z + sz * c2 + gz * s3, o);
          o += 3;
        }
      }
      this.skin.normals(t);
    }

    const st = this.stood;
    st.x = d.ox + fx * d.surge + rx * d.shift;
    st.z = d.oz + fz * d.surge + rz * d.shift;
    st.yaw = Math.atan2(-fz, fx);
    const m = BODY_RINGS - 3;
    st.muzzle.x = d.ox + fx * this.cx[m] + rx * this.cz[m];
    st.muzzle.y = d.oy + this.cy[m] - this.half[m * 2];
    st.muzzle.z = d.oz + fz * this.cx[m] + rz * this.cz[m];
    const g = Math.floor(BODY_RINGS * 0.4);
    st.belly.x = d.ox + fx * this.cx[g] + rx * this.cz[g];
    st.belly.y = d.oy + this.cy[g] - this.half[g * 2] * 0.86;
    st.belly.z = d.oz + fz * this.cx[g] + rz * this.cz[g];
    return st;
  }
}

/** How one of the herd lives: where it is, how it walks and how hard it roots. */
export interface Plan {
  at: [number, number];
  when: number;
  dir: [number, number];
  /** Metres a second along dir. */
  speed: number;
  /** The level its feet stand at. */
  ground: number;
  /** Seconds of one cycle of the walk. */
  cycle: number;
  phase: number;
  /** 0 to 1: how hard it works the mud. */
  root: number;
  /** How far the head hangs, radians. */
  hang: number;
}

/** The share of a cycle a foot is down. */
const DUTY = 0.8;
/** LH, LF, RH, RF: the hind foot of a side goes first and the fore foot of that side follows it. */
const ORDER = [0, 0.22, 0.5, 0.72];

/** The walk and the rooting of one of the herd at `seconds`: the weight goes over the feet that stay down before a foot is lifted. */
export function walk(plan: Plan, b: Build, seconds: number, out: Drive): Drive {
  const { k } = b;
  const t = seconds - plan.when;
  const c = t / plan.cycle + plan.phase;
  const stride = plan.speed * plan.cycle * DUTY;
  out.ox = plan.at[0] + plan.dir[0] * plan.speed * t;
  out.oz = plan.at[1] + plan.dir[1] * plan.speed * t;
  out.oy = plan.ground;
  out.dir = plan.dir;
  let liftSum = 0;
  let front = 0;
  for (let l = 0; l < 4; l++) {
    const ph = c + ORDER[l] - Math.floor(c + ORDER[l]);
    const [lx, side] = LEG_AT[l];
    let x: number;
    let y = 0;
    if (ph < DUTY) x = stride * (0.5 - ph / DUTY);
    else {
      const u = (ph - DUTY) / (1 - DUTY);
      const e = u * u * (3 - 2 * u);
      x = stride * (-0.5 + e);
      // It drags out of the mud, hangs, and is set down: slow up, quicker down.
      y = 0.2 * k * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1.5);
      liftSum += Math.sin(Math.PI * u);
      if (lx > 0) front += Math.sin(Math.PI * u) * side;
    }
    out.feet[l][0] = lx * k + 0.03 * k + x;
    out.feet[l][1] = y;
    out.feet[l][2] = side * 0.6 * k * b.bulk;
  }
  // The left pair swings about 0.79 of the cycle and the right pair about 0.29: the trunk is over the other side a tenth of a cycle before.
  const lean = Math.cos(TAU * (c - 0.69));
  const walking = clamp(plan.speed / 0.1);
  out.shift = 0.13 * k * lean * walking;
  out.roll = 0.045 * lean * walking - 0.03 * front;
  out.sway = -0.09 * k * Math.cos(TAU * (c - 0.8)) * walking;
  out.bend = 0.05 * Math.sin(TAU * (c - 0.1)) * walking;
  // Rooting: a shove into the mud and a slower drawing back, the whole trunk behind it.
  const rootRate = 0.31 + 0.11 * (b.seed - Math.floor(b.seed));
  const rc = seconds * rootRate + b.seed * 7.3;
  const rp = rc - Math.floor(rc);
  const shove = (rp < 0.35 ? smooth(0, 0.35, rp) : 1 - smooth(0.35, 1, rp)) * plan.root;
  out.surge = 0.11 * k * shove;
  out.pitch = 0.035 * shove + 0.012 * liftSum * 0;
  out.bob = -0.02 * k * shove - 0.012 * k * liftSum;
  out.headPitch = plan.hang + 0.1 * shove + 0.03 * Math.sin(seconds * 1.3 + b.seed * 5);
  // The head sweeps the mud from side to side, slowly, and not evenly.
  out.headYaw = plan.root * (0.3 * Math.sin(seconds * 0.52 + b.seed * 11) + 0.12 * Math.sin(seconds * 1.17 + b.seed * 3));
  out.breath = Math.sin(seconds * (1.05 + 0.3 * Math.sin(b.seed * 17)) + b.seed * 9);
  out.squash = 1;
  out.splay = 0.1 + 0.25 * shove;
  for (let f = 0; f < FEELERS; f++) {
    const w = 2.1 + 1.9 * cell(f, 7, Math.floor(b.seed * 9973));
    const a = seconds * w + f * 2.4 + b.seed * 31;
    // Each rakes: curled, then flicked out, each to its own time.
    out.curl[f] = 1.25 + 0.55 * Math.sin(a) + 0.25 * Math.sin(a * 2.3 + 1) + 0.5 * shove;
  }
  return out;
}

export function newDrive(): Drive {
  return {
    ox: 0,
    oy: 0,
    oz: 0,
    dir: [1, 0],
    surge: 0,
    shift: 0,
    bob: 0,
    roll: 0,
    pitch: 0,
    bend: 0,
    headYaw: 0,
    headPitch: 0,
    breath: 0,
    sway: 0,
    squash: 1,
    feet: LEG_AT.map(([x, s]) => [x, 0, s * 0.6] as [number, number, number]),
    curl: Array.from({ length: FEELERS }, () => 1.2),
    splay: 0.1,
  };
}
