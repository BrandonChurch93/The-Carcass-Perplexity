// One wader: its proportions, its skin tables, and its pose at a time.
// The pose is solved from nothing each call: where the gait has put each foot on the bed, how the body carries its weight over the feet that
// bear it, the legs from hip to foot, the neck from the shoulders to the water or up, and the tendrils that hang from its end.
import { BONES, FETLOCK, NECK_BONES, buildBody, type Body } from './body';
import type { Skin, Tube } from './skin';

export type V3 = [number, number, number];

export interface Build {
  /** Size: 1 is a back 2.6 m up. */
  k: number;
  seed: number;
  /** 0: seen close, every ring. 1: far, a third of them. */
  far: boolean;
  bodyLen: number;
  standH: number;
  hipFore: number;
  hipSide: number;
  stanceSide: number;
  legLen: number;
  /** Part of the leg above its middle joint. */
  knee: number;
  legR: number;
  stride: number;
  stepH: number;
  neckLen: number;
  neckR: number;
  tendrils: number;
  tendrilLen: number;
  /** How far the body is turned off its line of travel, radians: no animal stands square to its path. */
  skew: number;
  /** Its own trunk: how deep the chest, how drawn up the belly, the line of the back, how far the bones stand out. */
  chest: number;
  belly: number;
  sway: number;
  gaunt: number;
  /** The size of a cell of its skin, metres: 1.25 cm for one seen close. */
  cell: number;
}

export interface Plan {
  /** Where it is at `when`, and its heading, radians from north, clockwise. */
  x: number;
  z: number;
  heading: number;
  when: number;
  /** Metres a second, on average. It goes in fits: `fits` is how much of the speed comes and goes (0 steady, 0.9 nearly stops), `fitPeriod` seconds. */
  speed: number;
  fits: number;
  fitPeriod: number;
  /** Spans of seconds in which the neck is carried up. Outside them the tuft is down, feeding. */
  up: [number, number][];
  /** Its own slow sway: seconds, and where in it the animal is at time zero. */
  habit: number;
  phase: number;
  /** A hind leg stood slack on its toe, weight on the other three: 0 none, 1 the left, 2 the right. */
  slack: number;
  /** How far down the neck goes when it is down: 1 into the water, 0.8 hangs clear of the ground. */
  reach: number;
  /** Metres it is ahead of its plan: staged, so that a named one is mid-step in the picture of it. */
  ahead?: number;
}

export interface Env {
  /** The bed or the rock under a point, metres. */
  ground(x: number, z: number): number;
  /** The level of the water. */
  sea: number;
}

export interface Foot {
  x: number;
  y: number;
  z: number;
  /** Metres off the ground. */
  lift: number;
  /** Metres of water over the bed where it stands. */
  wet: number;
  /** Seconds since it was put down, or a large number; and 1 while it is carried forward. */
  since: number;
  carried: number;
}

export interface Stood {
  feet: Foot[];
  body: { x: number; y: number; z: number; yaw: number };
  tuft: { x: number; y: number; z: number };
  /** 0 to 1, how far down the neck is. */
  down: number;
  /** Seconds since the tuft last left the water, or a large number. */
  sinceLift: number;
  tips: Float32Array;
}

const sat = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, x: number): number => {
  const t = sat((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** A value read off a few points (u, value), eased between them. */
/** The trunk's half height and half width, rump (0) to chest (1), for a size of 1: an egg, the deeper end behind the middle, closed and round at both ends. */
export const bodyHalfH = (t: number): number => 0.33 * Math.max(0, Math.sin(Math.PI * t ** 0.8)) ** 0.5;
export const bodyHalfW = (t: number): number => 0.235 * Math.max(0, Math.sin(Math.PI * t ** 0.86)) ** 0.5;

export function curve(points: readonly (readonly [number, number])[], u: number): number {
  const first = points[0] as readonly [number, number];
  if (u <= first[0]) return first[1];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as readonly [number, number];
    const b = points[i] as readonly [number, number];
    if (u <= b[0]) {
      const t = (u - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t * t * (3 - 2 * t);
    }
  }
  return (points[points.length - 1] as readonly [number, number])[1];
}

// The trunk, rump (0) to chest (1): half height, half width, and how far the spine stands over the axis. A plucked bird's: high round rump, deep keel, narrow chest.
export const HALF_H: [number, number][] = [[0, 0.05], [0.06, 0.25], [0.2, 0.385], [0.42, 0.41], [0.66, 0.37], [0.86, 0.27], [1, 0.19]];
export const HALF_W: [number, number][] = [[0, 0.03], [0.06, 0.16], [0.2, 0.25], [0.42, 0.27], [0.66, 0.24], [0.86, 0.17], [1, 0.13]];
const SPINE: [number, number][] = [[0, -0.1], [0.2, 0.05], [0.45, 0.09], [0.8, 0.02], [1, -0.02]];

// The neck's pitch along its length, degrees above level: carried up (it stands off the shoulders, arches and hooks over at the end so the tuft
// hangs), and down (it leaves the chest level and goes down into the water).
const NECK_UP: [number, number][] = [[0, 38], [0.22, 74], [0.52, 86], [0.72, 58], [0.87, 0], [1, -74]];
const NECK_DOWN: [number, number][] = [[0, 16], [0.18, -14], [0.45, -66], [0.75, -84], [1, -80]];

// The legs: left hind, left fore, right hind, right fore, and where in the cycle each one steps. A slow walk: one foot at a time.
const LEGS: { side: number; fore: number; at: number }[] = [
  { side: -1, fore: -1, at: 0.0 },
  { side: -1, fore: 1, at: 0.27 },
  { side: 1, fore: -1, at: 0.5 },
  { side: 1, fore: 1, at: 0.77 },
];
/** Part of the cycle a foot bears weight. */
const DUTY = 0.8;

export function makeBuild(k: number, seed: number, far: boolean, cell = 0.02, own: Partial<Build> = {}): Build {
  const j = (n: number, a: number, b: number): number => a + (b - a) * hash(seed * 7.3 + n);
  const standH = 2.28 * k * j(1, 0.95, 1.06);
  const stride = 0.36 * k * j(2, 0.9, 1.1);
  return {
    k,
    seed,
    far,
    bodyLen: 1.2 * k * j(3, 0.93, 1.08),
    standH,
    hipFore: 0.34 * k,
    hipSide: 0.105 * k,
    stanceSide: 0.16 * k * j(4, 0.85, 1.25),
    legLen: 1.006 * Math.hypot(standH - 0.02 * k, stride * DUTY * 0.5 + 0.06),
    knee: j(5, 0.44, 0.5),
    legR: 0.026 * k,
    stride,
    stepH: 0.55 * k * j(6, 0.8, 1.2),
    neckLen: 2.1 * k * j(7, 0.93, 1.08),
    neckR: (far ? 0.082 : 0.092) * k,
    tendrils: far ? 6 : 320,
    tendrilLen: 0.62 * k * j(8, 0.85, 1.2),
    skew: j(9, -0.12, 0.12),
    chest: j(10, 0.9, 1.14),
    belly: j(11, 0.75, 1.25),
    sway: j(12, -1, 1),
    gaunt: j(13, 0.85, 1.15),
    cell,
    ...own,
  };
}

const BODY_RINGS = 25;
const BODY_SIDES = 24;
const NECK_RINGS = 22;
const NECK_SIDES = 9;
const LEG_RINGS = 21;
const LEG_SIDES = 10;
const TENDRIL_RINGS = 13;
const TENDRIL_SIDES = 4;

export class Wader {
  private body: Tube | null = null;
  private neck: Tube | null = null;
  /** One seen near: its trunk, neck and legs are one skin on bones. */
  private blob: Tube | null = null;
  private skinned: Body | null = null;
  private readonly boneO = new Float32Array(BONES * 3);
  private readonly boneE = new Float32Array(BONES * 9);
  private readonly neckRings: number;
  private readonly legs: Tube[] = [];
  private readonly tendrils: Tube[] = [];
  private bodyLocal = new Float32Array(0);
  private neckLocal = new Float32Array(0);
  private legLocal = new Float32Array(0);
  private readonly tendrilLocal: Float32Array;
  private readonly legAlong: number[] = [];
  private readonly bodyT: number[] = [];
  private neckPoints = new Float32Array(0);
  private readonly strands: { angle: number; out: number; len: number; stiff: number; phase: number; root: number; thick: number }[] = [];
  readonly tips: Float32Array;

  constructor(
    private readonly skin: Skin,
    readonly b: Build,
    readonly plan: Plan,
    private readonly env: Env,
  ) {
    const { k, far, seed } = b;
    const bodyRings = far ? 7 : BODY_RINGS;
    const bodySides = far ? 6 : BODY_SIDES;
    const neckRings = far ? 9 : NECK_RINGS;
    const neckSides = far ? 5 : NECK_SIDES;
    const legRings = far ? 5 : LEG_RINGS;
    const legSides = far ? 4 : LEG_SIDES;
    const tRings = far ? 4 : TENDRIL_RINGS;
    const tSides = far ? 3 : TENDRIL_SIDES;

    this.neckRings = far ? neckRings : NECK_BONES + 1;
    this.neckPoints = new Float32Array(this.neckRings * 3);
    if (!far) {
      const body = buildBody(b, b.cell * k);
      this.skinned = body;
      this.blob = skin.blob(body.count, body.index);
      for (let v = 0; v < body.count; v++) {
        skin.describeAt(
          this.blob.start + v,
          [body.rest[v * 3] as number, body.rest[v * 3 + 1] as number, body.rest[v * 3 + 2] as number],
          [body.restN[v * 3] as number, body.restN[v * 3 + 1] as number, body.restN[v * 3 + 2] as number],
          [body.ribS[v] as number, body.cage[v] as number],
          [body.legT[v] as number, body.shade[v] as number, body.radius[v] as number, seed],
          [4, body.neckU[v] as number],
        );
      }
    }
    // The trunk of one seen far off. Its section is not an ellipse: a ridge along the spine, flat flanks, a keel.
    if (far) {
    this.body = skin.tube(bodyRings, bodySides);
    this.bodyLocal = new Float32Array(bodyRings * bodySides * 2);
    for (let i = 0; i < bodyRings; i++) {
      // The rings stand closer at the two ends, where the trunk rounds off.
      const t = 0.5 - 0.5 * Math.cos((Math.PI * i) / (bodyRings - 1));
      this.bodyT[i] = t;
      const lean = (1 - 0.34 * smooth(0.62, 1, t)) * (1 - 0.22 * smooth(0.3, 0, t));
      const a = bodyHalfH(t) * k * lean;
      const w = bodyHalfW(t) * k * lean;
      for (let s = 0; s < bodySides; s++) {
        const phi = (s / bodySides) * Math.PI * 2;
        const c = Math.cos(phi);
        const sn = Math.sin(phi);
        // Gaunt: the flank fallen in behind the last rib, the belly drawn up toward the hind legs, a keel under the chest like a bird's,
        // the spine a low ridge, the hips and the shoulders two soft swellings under the skin.
        const keel = smooth(0.35, 0.85, t);
        const tuck = smooth(0.55, 0.15, t);
        const hollow = 0.1 * Math.exp(-(((t - 0.33) / 0.12) ** 2)) * smooth(0.8, 0.1, Math.abs(sn));
        const hip = 0.055 * k * Math.exp(-(((t - 0.2) / 0.11) ** 2)) * Math.exp(-(((Math.abs(c) - 0.6) / 0.4) ** 2)) * smooth(-0.95, 0.3, sn);
        const blade = 0.045 * k * Math.exp(-(((t - 0.78) / 0.1) ** 2)) * Math.exp(-(((Math.abs(c) - 0.6) / 0.4) ** 2)) * smooth(-0.95, 0.3, sn);
        const ridge = 0.028 * k * Math.exp(-(((phi - Math.PI / 2) / 0.3) ** 2)) * smooth(0.04, 0.25, t) * smooth(1, 0.8, t);
        const narrow = sn > 0 ? 1 - 0.2 * sn : 1 - 0.42 * keel * (-sn) ** 1.5;
        const x = w * c * narrow * (1 - hollow) + (hip + blade) * c;
        const y = a * (sn > 0 ? sn ** 0.85 : -((-sn) ** (0.9 + 0.2 * keel)) * (1 - 0.36 * tuck)) + ridge + 0.5 * (hip + blade);
        this.bodyLocal[(i * bodySides + s) * 2] = x;
        this.bodyLocal[(i * bodySides + s) * 2 + 1] = y;
      }
      for (let s = 0; s <= bodySides; s++) {
        const phi = (s / bodySides) * Math.PI * 2;
        // Under the trunk the skin is in its own shade.
        const shade = 0.55 + 0.45 * smooth(-0.95, 0.35, Math.sin(phi));
        skin.describe(this.body, i, s, t * b.bodyLen, (s / bodySides) * 2 * Math.PI * 0.32, 0.5, shade, a, seed, 0, t);
      }
    }

    this.neck = skin.tube(neckRings, neckSides);
    this.neckLocal = new Float32Array(neckRings * neckSides * 2);
    for (let i = 0; i < neckRings; i++) {
      const u = i / (neckRings - 1);
      // Thick where it leaves the chest, thin along its length, a small swelling at the end where the tendrils root.
      const r = b.neckR * (0.5 + 0.5 * (1 - u) ** 2.2 + 0.1 * smooth(0.88, 0.97, u) - 0.25 * smooth(0.97, 1, u)) * (1 + 1.0 * smooth(0.34, 0, u) ** 1.2);
      for (let s = 0; s < neckSides; s++) {
        const phi = (s / neckSides) * Math.PI * 2;
        // The windpipe and the cords stand a little off the round.
        const rr = r * (1 + 0.07 * Math.cos(phi * 2) + 0.05 * Math.sin(phi * 3 + u * 14 + seed));
        this.neckLocal[(i * neckSides + s) * 2] = rr * Math.cos(phi);
        this.neckLocal[(i * neckSides + s) * 2 + 1] = rr * Math.sin(phi);
      }
      for (let s = 0; s <= neckSides; s++) skin.describe(this.neck, i, s, u * b.neckLen, (s / neckSides) * 2 * Math.PI * r, 0.5 + 0.3 * u, 0.85, r, seed, 1, u);
    }

    // The legs: thin hard shanks with a knuckle at the middle joint and another above the foot, and a small splayed foot.
    this.legLocal = new Float32Array(legRings * legSides * 2);
    for (let i = 0; i < legRings; i++) {
      const u = i / (legRings - 1);
      this.legAlong[i] = u;
      // A thigh that is skin on bone and tapers to the joint; the joint a knot; a narrow shank; a knuckle over a cloven foot.
      const thigh = 1.1 * (1 - smooth(-0.1, 0.2, u)) ** 1.3 + 1.5 * (1 - smooth(0.0, 0.46, u)) ** 0.7 + 0.35 * Math.exp(-(((u - b.knee + 0.07) / 0.045) ** 2));
      const knuckle = 2.4 * Math.exp(-(((u - b.knee) / 0.028) ** 2)) + 0.5 * Math.exp(-(((u - b.knee - 0.05) / 0.05) ** 2)) + 1.7 * Math.exp(-(((u - 0.93) / 0.022) ** 2));
      const foot = 1.5 * smooth(0.955, 1, u);
      // The head of the thigh is inside the trunk: it narrows to the hip, so no end of it shows.
      const r = b.legR * (0.9 + thigh + knuckle + foot);
      // The haunch: muscle on the bone where it leaves the trunk, wide fore and aft and flat from side to side, gone by the knee.
      const haunch = 2.3 * (1 - smooth(0.08, b.knee - 0.04, u)) ** 1.4 * smooth(-0.12, 0.1, u);
      for (let s = 0; s < legSides; s++) {
        const phi = (s / legSides) * Math.PI * 2;
        this.legLocal[(i * legSides + s) * 2] = (r + 0.3 * b.legR * haunch) * Math.cos(phi) * (1 - 0.15 * Math.min(1, thigh / 2.4));
        this.legLocal[(i * legSides + s) * 2 + 1] = (r + b.legR * haunch) * Math.sin(phi);
      }
    }
    for (let j = 0; j < 4; j++) {
      const tube = skin.tube(legRings, legSides);
      this.legs.push(tube);
      for (let i = 0; i < legRings; i++) {
        const u = this.legAlong[i] as number;
        const r = Math.hypot(this.legLocal[i * legSides * 2] as number, this.legLocal[i * legSides * 2 + 1] as number);
        for (let s = 0; s <= legSides; s++) skin.describe(tube, i, s, u * b.legLen, (s / legSides) * 2 * Math.PI * r, 0.5, 0.75 + 0.25 * smooth(0.1, 0.4, u), r, seed + j, 3, u);
      }
    }

    }

    // The tendrils: wet strands of unlike length that root round the end of the neck, in clumps.
    this.tendrilLocal = new Float32Array(tRings * tSides * 2);
    const tr = (far ? 0.012 : 0.0075) * k;
    for (let i = 0; i < tRings; i++) {
      const u = i / (tRings - 1);
      const r = tr * (1 - 0.6 * u ** 1.6);
      for (let s = 0; s < tSides; s++) {
        const phi = (s / tSides) * Math.PI * 2;
        this.tendrilLocal[(i * tSides + s) * 2] = r * Math.cos(phi);
        this.tendrilLocal[(i * tSides + s) * 2 + 1] = r * Math.sin(phi);
      }
    }
    for (let n = 0; n < b.tendrils; n++) {
      const tube = skin.tube(tRings, tSides);
      this.tendrils.push(tube);
      const clump = Math.floor(hash(seed * 3.1 + n * 0.37) * 7);
      const strand = {
        angle: (clump / 7) * Math.PI * 2 + (hash(seed + n * 1.7) - 0.5) * 0.8,
        out: 0.15 + 0.85 * hash(seed + n * 2.9),
        len: b.tendrilLen * (0.3 + 0.95 * hash(seed * 1.3 + n * 5.1) ** 1.4),
        stiff: 0.3 + 0.7 * hash(seed + n * 9.7),
        phase: hash(seed + n * 4.3) * 6.28,
        // Most root at the very end of the neck, the rest a little way back up it: a mop, not a brush in a ferrule.
        root: 1 - 0.24 * hash(seed + n * 8.9) ** 1.5,
        thick: far ? 1 : 0.26 + 0.75 * hash(seed + n * 12.7) ** 3.0,
      };
      this.strands.push(strand);
      for (let i = 0; i < tRings; i++) {
        const u = i / (tRings - 1);
        for (let s = 0; s <= tSides; s++) skin.describe(tube, i, s, u * strand.len, (s / tSides) * 0.1, hash(seed + n * 6.1), 0.9, tr * (1 - 0.6 * u ** 1.6), seed + n, 2, u);
      }
    }
    this.tips = new Float32Array(b.tendrils * 3);
  }

  /** The skin follows the bones: every vertex is where its three bones put it, by their weights. `breath` lifts the ribs, metres. */
  private wrap(breath: number): void {
    const body = this.skinned;
    const blob = this.blob;
    if (!body || !blob) return;
    const O = this.boneO;
    const E = this.boneE;
    const p = this.skin.position;
    const n = this.skin.normal;
    const { bone, weight, local, localN, cage } = body;
    let o = blob.start * 3;
    for (let v = 0; v < body.count; v++) {
      let x = 0;
      let y = 0;
      let z = 0;
      let nx = 0;
      let ny = 0;
      let nz = 0;
      for (let s = 0; s < 3; s++) {
        const w = weight[v * 3 + s] as number;
        if (w === 0) continue;
        const i = (bone[v * 3 + s] as number) * 9;
        const j = (bone[v * 3 + s] as number) * 3;
        const at = v * 9 + s * 3;
        const a = local[at] as number;
        const b = local[at + 1] as number;
        const c = local[at + 2] as number;
        x += w * ((O[j] as number) + (E[i] as number) * a + (E[i + 3] as number) * b + (E[i + 6] as number) * c);
        y += w * ((O[j + 1] as number) + (E[i + 1] as number) * a + (E[i + 4] as number) * b + (E[i + 7] as number) * c);
        z += w * ((O[j + 2] as number) + (E[i + 2] as number) * a + (E[i + 5] as number) * b + (E[i + 8] as number) * c);
        const na = localN[at] as number;
        const nb = localN[at + 1] as number;
        const nc = localN[at + 2] as number;
        nx += w * ((E[i] as number) * na + (E[i + 3] as number) * nb + (E[i + 6] as number) * nc);
        ny += w * ((E[i + 1] as number) * na + (E[i + 4] as number) * nb + (E[i + 7] as number) * nc);
        nz += w * ((E[i + 2] as number) * na + (E[i + 5] as number) * nb + (E[i + 8] as number) * nc);
      }
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      const lift = breath * (cage[v] as number);
      p[o] = x + nx * lift;
      p[o + 1] = y + ny * lift;
      p[o + 2] = z + nz * lift;
      n[o] = nx;
      n[o + 1] = ny;
      n[o + 2] = nz;
      o += 3;
    }
  }

  /** 0 to 1: how far down the neck is at a time, and the seconds since it last left the water. */
  private neckDown(seconds: number): { down: number; since: number } {
    let down = 1;
    let since = 1e3;
    for (const [from, to] of this.plan.up) {
      // It lifts in a little over a second and goes down more slowly.
      const up = smooth(from, from + 1.25, seconds) * (1 - smooth(to, to + 1.9, seconds));
      down = Math.min(down, 1 - up);
      if (seconds > from + 0.3 && seconds < to + 0.5) since = Math.min(since, seconds - from - 0.3);
    }
    return { down, since };
  }

  /** Where the body's place on its path is after `walked` metres. */
  private along(walked: number): [number, number] {
    const p = this.plan;
    return [p.x + Math.sin(p.heading) * walked, p.z - Math.cos(p.heading) * walked];
  }

  pose(seconds: number): Stood {
    const { b, plan, env, skin } = this;
    const k = b.k;
    const tau = seconds - plan.when;
    const w = (Math.PI * 2) / plan.fitPeriod;
    // It goes in fits: the metres walked are the mean speed with a slow come and go on it, never backward.
    const walked = plan.speed * (tau + (plan.fits / w) * (Math.sin(w * tau + plan.phase * 6.28) - Math.sin(plan.phase * 6.28))) + (plan.ahead ?? 0);
    const fx = Math.sin(plan.heading);
    const fz = -Math.cos(plan.heading);
    const rx = -fz;
    const rz = fx;

    // The feet. Each is put down a stride on and stays there while the body passes over it.
    const feet: Foot[] = [];
    let shift = 0;
    let dipSum = 0;
    let roll = 0;
    let nose = 0;
    const cyc = walked / b.stride + 1000;
    for (let j = 0; j < 4; j++) {
      const leg = LEGS[j] as (typeof LEGS)[number];
      const c = cyc + leg.at;
      const n = Math.floor(c);
      const f = c - n;
      const plant = (step: number): [number, number] => {
        const at = (step + DUTY / 2 - leg.at - 1000) * b.stride;
        const o = this.along(at);
        const jx = (hash(b.seed + step * 3.7 + j * 11.3) - 0.5) * 0.16 * k;
        const jz = (hash(b.seed + step * 5.3 + j * 7.9) - 0.5) * 0.1 * k;
        const fore = leg.fore * b.hipFore * 0.95 + jz;
        const side = leg.side * b.stanceSide + jx;
        return [o[0] + fx * fore + rx * side, o[1] + fz * fore + rz * side];
      };
      const here = plant(n);
      let x = here[0];
      let z = here[1];
      let lift = 0;
      let bear = 1;
      const since = plan.speed < 0.01 ? 1e3 : f >= DUTY ? 1e3 : (f * b.stride) / Math.max(0.05, plan.speed);
      if (f >= DUTY) {
        const u = (f - DUTY) / (1 - DUTY);
        const next = plant(n + 1);
        // It is drawn up and back first, carried forward, and reached down: the foot leads at the end.
        const e = u * u * (3 - 2 * u);
        x += (next[0] - x) * e;
        z += (next[1] - z) * e;
        lift = b.stepH * Math.sin(Math.PI * u ** 0.85) ** 1.2;
        bear = 0.4 - 0.4 * Math.sin(Math.PI * u);
      } else {
        // The weight comes off a foot before it lifts and goes back on after it lands.
        bear = Math.min(1 - 0.6 * smooth(DUTY - 0.17, DUTY, f), 0.4 + 0.6 * smooth(0, 0.11, f));
      }
      let groundY = env.ground(x, z);
      // The slack hind leg rests on its toe, drawn in under the body.
      if (plan.slack === (leg.side < 0 ? 1 : 2) && leg.fore < 0 && plan.speed === 0) {
        x += -rx * leg.side * 0.1 * k + fx * 0.22 * k;
        z += -rz * leg.side * 0.1 * k + fz * 0.22 * k;
        groundY = env.ground(x, z);
        bear = 0.25;
      }
      const off = 1 - bear;
      shift -= leg.side * off;
      dipSum += off;
      roll += leg.side * off;
      nose += leg.fore * off;
      feet.push({ x, y: groundY + lift, z, lift, wet: Math.max(0, env.sea - groundY), since, carried: f >= DUTY && plan.speed >= 0.01 ? 1 : 0 });
    }

    const neckState = this.neckDown(seconds);
    const down = neckState.down;
    const habit = Math.sin((seconds / plan.habit + plan.phase) * Math.PI * 2);
    const habit2 = Math.sin((seconds / (plan.habit * 0.37) + plan.phase * 3.1) * Math.PI * 2);

    // The body rides over the feet that bear it: it goes over to the other side before a foot comes up, and sinks a little on three legs.
    const o = this.along(walked);
    const side = 0.085 * k * shift + 0.03 * k * habit;
    const cx = o[0] + rx * side;
    const cz = o[1] + rz * side;
    const base = (feet[0]!.y - feet[0]!.lift + feet[1]!.y - feet[1]!.lift + feet[2]!.y - feet[2]!.lift + feet[3]!.y - feet[3]!.lift) / 4;
    const cy = base + b.standH - 0.03 * k * dipSum - 0.025 * k * down + 0.01 * k * habit2;
    const yaw = plan.heading + b.skew + 0.035 * habit + 0.02 * shift;
    const pitch = (5 - 9 * down) * (Math.PI / 180) + 0.03 * nose + 0.01 * habit2;
    const lean = -0.06 * roll + 0.015 * habit;

    // The body's frame: F along the spine toward the chest, R to its right, U out of its back.
    const sy = Math.sin(yaw);
    const cyw = Math.cos(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const F: V3 = [sy * cp, sp, -cyw * cp];
    const Rh: V3 = [cyw, 0, sy];
    const U0: V3 = [-sy * sp, cp, cyw * sp];
    const cl = Math.cos(lean);
    const sl = Math.sin(lean);
    const R: V3 = [Rh[0] * cl + U0[0] * sl, Rh[1] * cl + U0[1] * sl, Rh[2] * cl + U0[2] * sl];
    const U: V3 = [U0[0] * cl - Rh[0] * sl, U0[1] * cl - Rh[1] * sl, U0[2] * cl - Rh[2] * sl];

    const O = this.boneO;
    const E = this.boneE;
    const bone = (i: number, ox: number, oy: number, oz: number, e1: V3, e2: V3, e3: V3): void => {
      O[i * 3] = ox;
      O[i * 3 + 1] = oy;
      O[i * 3 + 2] = oz;
      E.set(e1, i * 9);
      E.set(e2, i * 9 + 3);
      E.set(e3, i * 9 + 6);
    };
    bone(0, cx, cy, cz, F, U, R);

    // The trunk.
    const body = this.body;
    for (let i = 0; body && i < body.rings; i++) {
      const t = this.bodyT[i] as number;
      const a = (t - 0.5) * b.bodyLen;
      const up = curve(SPINE, t) * k;
      // It breathes: the ribs go out and in.
      const breathe = 1 + 0.018 * Math.sin(seconds * 1.9 + b.seed) * smooth(0.2, 0.5, t) * smooth(0.95, 0.6, t);
      skin.ring(body, i, cx + F[0] * a + U[0] * up, cy + F[1] * a + U[1] * up, cz + F[2] * a + U[2] * up, -R[0], -R[1], -R[2], U[0], U[1], U[2], this.bodyLocal, i * body.sides * 2, breathe);
    }
    if (body) skin.normals(body);

    // The legs, hip to foot through one joint. The hind one bends back like a bird's, the fore one a little forward.
    for (let j = 0; j < 4; j++) {
      const leg = LEGS[j] as (typeof LEGS)[number];
      const foot = feet[j] as Foot;
      const hx = cx + F[0] * leg.fore * b.hipFore + R[0] * leg.side * b.hipSide - U[0] * 0.02 * k;
      const hy = cy + F[1] * leg.fore * b.hipFore + R[1] * leg.side * b.hipSide - U[1] * 0.02 * k;
      const hz = cz + F[2] * leg.fore * b.hipFore + R[2] * leg.side * b.hipSide - U[2] * 0.02 * k;
      // One seen near has a foot of its own below the fetlock: flat on the ground while it stands, and it trails toe down when it is lifted.
      const whole = this.blob ? b.legLen * FETLOCK : b.legLen;
      const flex = this.blob ? 1.05 * smooth(0, 0.22 * k, foot.lift) : 0;
      const hoof: V3 = [-Math.sin(flex) * sy, -Math.cos(flex), Math.sin(flex) * cyw];
      const hoofLen = b.legLen - whole;
      const footX = foot.x - hoof[0] * hoofLen;
      const footY = this.blob ? foot.y - hoof[1] * hoofLen : foot.y + b.legR * 1.2;
      const footZ = foot.z - hoof[2] * hoofLen;
      let dx = footX - hx;
      let dy = footY - hy;
      let dz = footZ - hz;
      let d = Math.hypot(dx, dy, dz);
      // A leg that stands is all but straight: the little it has to give is taken up in the joints, not shown as a bend.
      const long = Math.min(whole * 1.02, Math.max(d * (leg.fore > 0 ? 1.014 : 1.028), whole * 0.972));
      const l1 = (long * b.knee * b.legLen) / whole;
      const l2 = long - l1;
      const reach = Math.min(d, (l1 + l2) * 0.9995);
      dx /= d;
      dy /= d;
      dz /= d;
      d = reach;
      const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      // The joint goes out along the body's axis, at right angles to the leg.
      const s = leg.fore > 0 ? 0.8 : -1;
      let bx = F[0] * s + R[0] * leg.side * 0.12;
      let by = F[1] * s + R[1] * leg.side * 0.12;
      let bz = F[2] * s + R[2] * leg.side * 0.12;
      const dot = bx * dx + by * dy + bz * dz;
      bx -= dot * dx;
      by -= dot * dy;
      bz -= dot * dz;
      const bl = Math.hypot(bx, by, bz) || 1;
      bx /= bl;
      by /= bl;
      bz /= bl;
      const kx = hx + dx * a + bx * h;
      const ky = hy + dy * a + by * h;
      const kz = hz + dz * a + bz * h;
      const ex = hx + dx * d;
      const ey = hy + dy * d;
      const ez = hz + dz * d;
      if (this.blob) {
        const frame = (at: number, ox: number, oy: number, oz: number, ax: number, ay: number, az: number, scale: number): void => {
          const al = Math.hypot(ax, ay, az) || 1;
          ax /= al;
          ay /= al;
          az /= al;
          const dt = R[0] * ax + R[1] * ay + R[2] * az;
          let nx = R[0] - dt * ax;
          let ny = R[1] - dt * ay;
          let nz = R[2] - dt * az;
          const nl = Math.hypot(nx, ny, nz) || 1;
          nx /= nl;
          ny /= nl;
          nz /= nl;
          bone(at, ox, oy, oz, [nx, ny, nz], [ax * scale, ay * scale, az * scale], [-(ay * nz - az * ny), -(az * nx - ax * nz), -(ax * ny - ay * nx)]);
        };
        frame(1 + j, hx, hy, hz, kx - hx, ky - hy, kz - hz, Math.hypot(kx - hx, ky - hy, kz - hz) / (b.legLen * b.knee));
        frame(5 + j, kx, ky, kz, ex - kx, ey - ky, ez - kz, Math.hypot(ex - kx, ey - ky, ez - kz) / (b.legLen * (FETLOCK - b.knee)));
        frame(9 + j, ex, ey, ez, hoof[0], hoof[1], hoof[2], 1);
        continue;
      }
      const tube = this.legs[j] as Tube;
      for (let i = 0; i < tube.rings; i++) {
        const u = this.legAlong[i] as number;
        // The centre line is the two bones with the corner at the joint taken off.
        let px: number;
        let py: number;
        let pz: number;
        let ax: number;
        let ay: number;
        let az: number;
        const q = u < b.knee ? u / b.knee : (u - b.knee) / (1 - b.knee);
        if (u < b.knee) {
          px = hx + (kx - hx) * q;
          py = hy + (ky - hy) * q;
          pz = hz + (kz - hz) * q;
        } else {
          px = kx + (ex - kx) * q;
          py = ky + (ey - ky) * q;
          pz = kz + (ez - kz) * q;
        }
        const rise = (1 - smooth(0, 0.1, u)) * 0.12 * k;
        px += U[0] * rise;
        py += U[1] * rise;
        pz += U[2] * rise;
        const blend = smooth(b.knee - 0.1, b.knee + 0.1, u);
        ax = (kx - hx) / l1 + ((ex - kx) / l2 - (kx - hx) / l1) * blend;
        ay = (ky - hy) / l1 + ((ey - ky) / l2 - (ky - hy) / l1) * blend;
        az = (kz - hz) / l1 + ((ez - kz) / l2 - (kz - hz) / l1) * blend;
        const al = Math.hypot(ax, ay, az) || 1;
        ax /= al;
        ay /= al;
        az /= al;
        // The ring's plane: across the leg (the body's right, squared to the bone) and fore-and-aft.
        let nx = R[0] - (R[0] * ax + R[1] * ay + R[2] * az) * ax;
        let ny = R[1] - (R[0] * ax + R[1] * ay + R[2] * az) * ay;
        let nz = R[2] - (R[0] * ax + R[1] * ay + R[2] * az) * az;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;
        const cxr = ay * nz - az * ny;
        const cyr = az * nx - ax * nz;
        const czr = ax * ny - ay * nx;
        skin.ring(tube, i, px, py, pz, nx, ny, nz, cxr, cyr, czr, this.legLocal, i * tube.sides * 2);
      }
      skin.normals(tube);
    }

    // The neck: a chain of fixed length whose pitch along it goes from carried to down. How far down is solved, so the tuft comes to the water.
    const neck = { rings: this.neckRings };
    const seg = b.neckLen / (neck.rings - 1);
    const baseX = cx + F[0] * (0.5 * b.bodyLen - 0.2 * k) + U[0] * 0.1 * k;
    const baseY = cy + F[1] * (0.5 * b.bodyLen - 0.2 * k) + U[1] * 0.1 * k;
    const baseZ = cz + F[2] * (0.5 * b.bodyLen - 0.2 * k) + U[2] * 0.1 * k;
    // It works the water from side to side when it is down, and looks about slowly when it is up.
    const sweep = down * (0.42 * Math.sin(seconds * 1.15 + b.seed * 2.1) + 0.16 * Math.sin(seconds * 2.7 + b.seed)) + (1 - down) * (0.3 * habit + 0.1 * habit2);
    const dab = down * 0.03 * Math.sin(seconds * 3.3 + b.seed * 1.7);
    const fhx = Math.sin(yaw);
    const fhz = -Math.cos(yaw);
    const chain = (amount: number, write: boolean): number => {
      let x = baseX;
      let y = baseY;
      let z = baseZ;
      const pts = this.neckPoints;
      for (let i = 0; i < neck.rings; i++) {
        const u = i / (neck.rings - 1);
        if (write) {
          pts[i * 3] = x;
          pts[i * 3 + 1] = y;
          pts[i * 3 + 2] = z;
        }
        const um = u + 0.5 / (neck.rings - 1);
        const th = Math.max(-104, curve(NECK_UP, um) + (curve(NECK_DOWN, um) - curve(NECK_UP, um)) * amount) * (Math.PI / 180) + pitch * (1 - um);
        const ps = sweep * um ** 1.4;
        const c = Math.cos(th);
        x += seg * c * (fhx * Math.cos(ps) + cyw * Math.sin(ps));
        y += seg * Math.sin(th);
        z += seg * c * (fhz * Math.cos(ps) + sy * Math.sin(ps));
      }
      return y;
    };
    let amount = 0;
    if (down > 0.001) {
      // Where the tuft would come down, and how far the neck must go for its end to be a hand above the bed there.
      const ahead = this.along(walked + 0.5 * b.bodyLen + 0.55 * b.neckLen);
      // The end of the neck stays out of the water: it is the mop that hangs from it that goes in.
      const floor = Math.max(env.ground(ahead[0], ahead[1]), env.sea);
      const want = floor + (plan.reach >= 1 ? 0.25 * k : 0.6 * k) + dab;
      let lo = 0.3;
      let hi = 1.3;
      for (let i = 0; i < 9; i++) {
        const mid = (lo + hi) / 2;
        if (chain(mid, false) > want) lo = mid;
        else hi = mid;
      }
      amount = ((lo + hi) / 2) * down;
    }
    chain(amount, true);
    const pts = this.neckPoints;
    let tx = 0;
    let ty = -1;
    let tz = 0;
    for (let i = 0; i < neck.rings; i++) {
      const a = Math.max(0, i - 1);
      const c = Math.min(neck.rings - 1, i + 1);
      let ax = (pts[c * 3] as number) - (pts[a * 3] as number);
      let ay = (pts[c * 3 + 1] as number) - (pts[a * 3 + 1] as number);
      let az = (pts[c * 3 + 2] as number) - (pts[a * 3 + 2] as number);
      const al = Math.hypot(ax, ay, az) || 1;
      ax /= al;
      ay /= al;
      az /= al;
      let nx = Rh[0] - (Rh[0] * ax + Rh[2] * az) * ax;
      let ny = -(Rh[0] * ax + Rh[2] * az) * ay;
      let nz = Rh[2] - (Rh[0] * ax + Rh[2] * az) * az;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const bx = ay * nz - az * ny;
      const by = az * nx - ax * nz;
      const bz = ax * ny - ay * nx;
      // A swallow goes up the neck now and then.
      const u = i / (neck.rings - 1);
      const gulp = 1 + 0.16 * (1 - down) * Math.exp(-(((u - ((seconds * 0.45 + b.seed) % 1.6)) / 0.07) ** 2));
      if (this.neck) skin.ring(this.neck, i, pts[i * 3] as number, pts[i * 3 + 1] as number, pts[i * 3 + 2] as number, nx, ny, nz, bx, by, bz, this.neckLocal, i * this.neck.sides * 2, gulp);
      if (i === neck.rings - 1) {
        tx = ax;
        ty = ay;
        tz = az;
      }
    }
    if (this.neck) skin.normals(this.neck);
    if (this.blob) {
      // A bone from each point of the neck to the next: across the neck, along it, and under it.
      for (let i = 0; i < NECK_BONES; i++) {
        let ax = (pts[i * 3 + 3] as number) - (pts[i * 3] as number);
        let ay = (pts[i * 3 + 4] as number) - (pts[i * 3 + 1] as number);
        let az = (pts[i * 3 + 5] as number) - (pts[i * 3 + 2] as number);
        const al = Math.hypot(ax, ay, az) || 1;
        ax /= al;
        ay /= al;
        az /= al;
        const dt = Rh[0] * ax + Rh[2] * az;
        let nx = Rh[0] - dt * ax;
        let ny = -dt * ay;
        let nz = Rh[2] - dt * az;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;
        bone(13 + i, pts[i * 3] as number, pts[i * 3 + 1] as number, pts[i * 3 + 2] as number, [nx, ny, nz], [ax, ay, az], [ay * nz - az * ny, az * nx - ax * nz, ax * ny - ay * nx]);
      }
      this.wrap(0.005 * k * Math.sin(seconds * 1.9 + b.seed));
    }
    const last = (neck.rings - 1) * 3;
    const ex = pts[last] as number;
    const ey = pts[last + 1] as number;
    const ez = pts[last + 2] as number;

    // The tendrils hang from the end of the neck. They are wet and heavy: they follow the neck late, lie on the water where they reach it and
    // trail down the channel, and lie on the rock where there is rock.
    const lagX = -Math.cos(seconds * 1.15 + b.seed * 2.1 - 0.5) * 0.3 * down * cyw;
    const lagZ = -Math.cos(seconds * 1.15 + b.seed * 2.1 - 0.5) * 0.3 * down * sy;
    const floorY = env.ground(ex, ez);
    const wet = floorY < env.sea;
    // In water the strands do not sink to the bed: they trail just under the surface.
    const rest = wet ? env.sea + 0.012 : floorY + 0.02;
    // A frame across the end of the neck.
    let ux = Rh[0];
    let uy = 0;
    let uz = Rh[2];
    const ud = ux * tx + uz * tz;
    ux -= ud * tx;
    uy -= ud * ty;
    uz -= ud * tz;
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const vx = ty * uz - tz * uy;
    const vy = tz * ux - tx * uz;
    const vz = tx * uy - ty * ux;
    for (let n = 0; n < this.tendrils.length; n++) {
      const tube = this.tendrils[n] as Tube;
      const st = this.strands[n] as (typeof this.strands)[number];
      const ca = Math.cos(st.angle);
      const sa = Math.sin(st.angle);
      const ox = ux * ca + vx * sa;
      const oy = uy * ca + vy * sa;
      const oz = uz * ca + vz * sa;
      const ru = st.root * (neck.rings - 1);
      const r0 = Math.min(neck.rings - 2, Math.floor(ru));
      const rf = ru - r0;
      const back = smooth(0.985, 0.94, st.root);
      const rad = b.neckR * (0.45 * st.out + 0.4 * back);
      let x = (pts[r0 * 3] as number) * (1 - rf) + (pts[r0 * 3 + 3] as number) * rf + ox * rad;
      let y = (pts[r0 * 3 + 1] as number) * (1 - rf) + (pts[r0 * 3 + 4] as number) * rf + oy * rad;
      let z = (pts[r0 * 3 + 2] as number) * (1 - rf) + (pts[r0 * 3 + 5] as number) * rf + oz * rad;
      const splay = 0.5 * st.out + 0.7 * back;
      const each = st.len / (tube.rings - 1);
      const swing = 0.07 * Math.sin(seconds * 1.6 + st.phase) + 0.04 * Math.sin(seconds * 3.7 + st.phase * 2.3);
      let px = x;
      let py = y;
      let pz = z;
      for (let i = 0; i < tube.rings; i++) {
        const u = i / (tube.rings - 1);
        // It leaves along the neck's end, spreads a little, and gravity takes it.
        const g = smooth(0, 0.14 + 0.5 * st.stiff * st.stiff, u);
        // In the water a strand weighs little: it drifts and spreads there instead of hanging straight.
        const under = wet ? smooth(env.sea + 0.02, env.sea - 0.12, y) : 0;
        const drift = under * (0.3 * Math.sin(seconds * 0.9 + st.phase + u * 2) + 0.35 * st.out);
        let dx = (tx + ox * splay) * (1 - g) + (lagX + swing * cyw + ox * (0.03 + drift)) * g;
        let dy = (ty + oy * splay) * (1 - g) - g * (1 - 0.55 * under);
        let dz = (tz + oz * splay) * (1 - g) + (lagZ + swing * sy + oz * (0.03 + drift)) * g;
        if (y < rest + 0.03) {
          // On the water or the rock: it lies along it, fanned, drawn out by the stream where there is one.
          const fan = st.angle + 0.5 * Math.sin(st.phase);
          dx = Math.cos(fan) * 0.45 + lagX * 2;
          dz = Math.sin(fan) * 0.45 + lagZ * 2;
          dy = (rest - y) * 4;
          dx += wet ? 0.3 * Math.sin(seconds * 1.3 + st.phase + u * 3) : 0;
        }
        // No strand hangs straight: each is kinked and curled its own way, more toward its end.
        const curl = (0.15 + 0.6 * u) * (0.34 * Math.sin(u * (3 + 7 * st.stiff) + st.phase * 5) + 0.26 * Math.sin(u * 19 + st.phase * 11) + 0.14 * Math.sin(u * 41 + st.phase * 17));
        dx += Math.cos(st.phase * 3) * curl;
        dz += Math.sin(st.phase * 3) * curl;
        dy += 0.35 * curl * Math.sin(st.phase * 7);
        const dl = Math.hypot(dx, dy, dz) || 1;
        dx /= dl;
        dy /= dl;
        dz /= dl;
        if (i > 0) {
          x = px + dx * each;
          y = Math.max(rest - 0.02, py + dy * each);
          z = pz + dz * each;
        }
        let nx = dy * 0 - dz * 1;
        let ny = dz * 0 - dx * 0;
        let nz = dx * 1 - dy * 0;
        // (d x up); where the strand is upright, any axis across it will do.
        let nl = Math.hypot(nx, ny, nz);
        if (nl < 0.2) {
          nx = 1 - dx * dx;
          ny = -dx * dy;
          nz = -dx * dz;
          nl = Math.hypot(nx, ny, nz) || 1;
        }
        nx /= nl;
        ny /= nl;
        nz /= nl;
        const bx = dy * nz - dz * ny;
        const by = dz * nx - dx * nz;
        const bz = dx * ny - dy * nx;
        skin.ring(tube, i, x, y, z, nx, ny, nz, bx, by, bz, this.tendrilLocal, i * tube.sides * 2, st.thick);
        // How wet: what has been in the water is dark and shines.
        skin.setHeat(tube, i, wet ? smooth(env.sea + 0.35, env.sea, y) : 0);
        px = x;
        py = y;
        pz = z;
      }
      skin.normals(tube);
      this.tips[n * 3] = x;
      this.tips[n * 3 + 1] = y;
      this.tips[n * 3 + 2] = z;
    }

    return { feet, body: { x: cx, y: cy, z: cz, yaw }, tuft: { x: ex, y: ey, z: ez }, down, sinceLift: neckState.since, tips: this.tips };
  }
}
