// One wader: its proportions, its skin tables, and its pose at a time.
// The pose is solved from nothing each call: where the gait has put each foot on the bed, how the body carries its weight over the feet that
// bear it, the legs from hip to foot, the neck from the shoulders to the water or up, and the tendrils that hang from its end.
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
function curve(points: readonly (readonly [number, number])[], u: number): number {
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
const HALF_H: [number, number][] = [[0, 0.04], [0.07, 0.22], [0.24, 0.345], [0.48, 0.36], [0.72, 0.31], [0.9, 0.225], [1, 0.17]];
const HALF_W: [number, number][] = [[0, 0.03], [0.07, 0.17], [0.24, 0.27], [0.48, 0.285], [0.72, 0.235], [0.9, 0.165], [1, 0.135]];
const SPINE: [number, number][] = [[0, -0.06], [0.2, 0.05], [0.45, 0.07], [0.8, 0.0], [1, -0.02]];

// The neck's pitch along its length, degrees above level: carried up (it stands off the shoulders, arches and hooks over at the end so the tuft
// hangs), and down (it leaves the chest level and goes down into the water).
const NECK_UP: [number, number][] = [[0, 58], [0.35, 76], [0.62, 62], [0.82, 8], [1, -78]];
const NECK_DOWN: [number, number][] = [[0, -8], [0.25, -42], [0.6, -68], [0.85, -80], [1, -88]];

// The legs: left hind, left fore, right hind, right fore, and where in the cycle each one steps. A slow walk: one foot at a time.
const LEGS: { side: number; fore: number; at: number }[] = [
  { side: -1, fore: -1, at: 0.0 },
  { side: -1, fore: 1, at: 0.27 },
  { side: 1, fore: -1, at: 0.5 },
  { side: 1, fore: 1, at: 0.77 },
];
/** Part of the cycle a foot bears weight. */
const DUTY = 0.8;

export function makeBuild(k: number, seed: number, far: boolean): Build {
  const j = (n: number, a: number, b: number): number => a + (b - a) * hash(seed * 7.3 + n);
  const standH = 2.28 * k * j(1, 0.95, 1.06);
  const stride = 1.15 * k * j(2, 0.9, 1.1);
  return {
    k,
    seed,
    far,
    bodyLen: 1.5 * k * j(3, 0.93, 1.08),
    standH,
    hipFore: 0.46 * k,
    hipSide: 0.17 * k,
    stanceSide: 0.2 * k * j(4, 0.85, 1.25),
    legLen: 1.035 * Math.hypot(standH - 0.2 * k, stride * DUTY * 0.5 + 0.08),
    knee: j(5, 0.44, 0.5),
    legR: 0.05 * k,
    stride,
    stepH: 0.55 * k * j(6, 0.8, 1.2),
    neckLen: 2.55 * k * j(7, 0.93, 1.08),
    neckR: 0.135 * k,
    tendrils: far ? 5 : 16,
    tendrilLen: 0.78 * k * j(8, 0.85, 1.2),
    skew: j(9, -0.12, 0.12),
  };
}

const BODY_RINGS = 15;
const BODY_SIDES = 14;
const NECK_RINGS = 22;
const NECK_SIDES = 9;
const LEG_RINGS = 15;
const LEG_SIDES = 7;
const TENDRIL_RINGS = 7;
const TENDRIL_SIDES = 4;

export class Wader {
  private readonly body: Tube;
  private readonly neck: Tube;
  private readonly legs: Tube[] = [];
  private readonly tendrils: Tube[] = [];
  private readonly bodyLocal: Float32Array;
  private readonly neckLocal: Float32Array;
  private readonly legLocal: Float32Array;
  private readonly tendrilLocal: Float32Array;
  private readonly legAlong: number[] = [];
  private readonly neckPoints: Float32Array;
  private readonly strands: { angle: number; out: number; len: number; stiff: number; phase: number }[] = [];
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

    // The trunk. Its section is not an ellipse: a ridge along the spine, flat flanks, a keel.
    this.body = skin.tube(bodyRings, bodySides);
    this.bodyLocal = new Float32Array(bodyRings * bodySides * 2);
    for (let i = 0; i < bodyRings; i++) {
      const t = i / (bodyRings - 1);
      const a = curve(HALF_H, t) * k;
      const w = curve(HALF_W, t) * k;
      for (let s = 0; s < bodySides; s++) {
        const phi = (s / bodySides) * Math.PI * 2;
        const c = Math.cos(phi);
        const sn = Math.sin(phi);
        // Narrower above than below, and hollow behind the ribs toward the rump: the hips stand out.
        const lump = 0.05 * k * Math.sin(seed + t * 9 + phi * 3) * smooth(0, 0.2, t) * smooth(1, 0.8, t);
        const x = w * c * (1 - 0.16 * sn) * (1 + 0.1 * smooth(0.45, 0.2, t) * Math.abs(c)) + lump * 0.3;
        const y = a * (sn > 0 ? sn ** 0.8 : -((-sn) ** 0.9));
        this.bodyLocal[(i * bodySides + s) * 2] = x;
        this.bodyLocal[(i * bodySides + s) * 2 + 1] = y;
      }
      for (let s = 0; s <= bodySides; s++) {
        const phi = (s / bodySides) * Math.PI * 2;
        // Under the trunk the skin is in its own shade.
        const shade = 0.55 + 0.45 * smooth(-0.9, 0.3, Math.sin(phi));
        skin.describe(this.body, i, s, t * b.bodyLen, (s / bodySides) * 2 * Math.PI * 0.32 * k, 0.5, shade, a, seed, 0, t);
      }
    }

    this.neck = skin.tube(neckRings, neckSides);
    this.neckLocal = new Float32Array(neckRings * neckSides * 2);
    this.neckPoints = new Float32Array(neckRings * 3);
    for (let i = 0; i < neckRings; i++) {
      const u = i / (neckRings - 1);
      // Thick where it leaves the chest, thin along its length, a small swelling at the end where the tendrils root.
      const r = b.neckR * (0.42 + 0.58 * (1 - u) ** 1.6 + 0.16 * smooth(0.86, 0.97, u) - 0.5 * smooth(0.97, 1, u)) * (1 + 0.5 * smooth(0.12, 0, u));
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
      const thigh = 2.3 * (1 - smooth(0, 0.3, u));
      const knuckle = 0.75 * Math.exp(-(((u - b.knee) / 0.035) ** 2)) + 0.5 * Math.exp(-(((u - 0.93) / 0.03) ** 2));
      const foot = 1.1 * smooth(0.95, 1, u);
      const r = b.legR * (0.72 + thigh + knuckle + foot);
      for (let s = 0; s < legSides; s++) {
        const phi = (s / legSides) * Math.PI * 2;
        this.legLocal[(i * legSides + s) * 2] = r * Math.cos(phi) * (1 - 0.25 * thigh / 2.3);
        this.legLocal[(i * legSides + s) * 2 + 1] = r * Math.sin(phi);
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

    // The tendrils: wet strands of unlike length that root round the end of the neck, in clumps.
    this.tendrilLocal = new Float32Array(tRings * tSides * 2);
    const tr = (far ? 0.03 : 0.017) * k;
    for (let i = 0; i < tRings; i++) {
      const u = i / (tRings - 1);
      const r = tr * (1 - 0.72 * u ** 1.4);
      for (let s = 0; s < tSides; s++) {
        const phi = (s / tSides) * Math.PI * 2;
        this.tendrilLocal[(i * tSides + s) * 2] = r * Math.cos(phi);
        this.tendrilLocal[(i * tSides + s) * 2 + 1] = r * Math.sin(phi);
      }
    }
    for (let n = 0; n < b.tendrils; n++) {
      const tube = skin.tube(tRings, tSides);
      this.tendrils.push(tube);
      const clump = Math.floor(hash(seed * 3.1 + n * 0.37) * 5);
      const strand = {
        angle: (clump / 5) * Math.PI * 2 + (hash(seed + n * 1.7) - 0.5) * 1.3,
        out: 0.35 + 0.65 * hash(seed + n * 2.9),
        len: b.tendrilLen * (0.45 + 0.75 * hash(seed * 1.3 + n * 5.1) ** 1.3),
        stiff: 0.3 + 0.7 * hash(seed + n * 9.7),
        phase: hash(seed + n * 4.3) * 6.28,
      };
      this.strands.push(strand);
      for (let i = 0; i < tRings; i++) {
        const u = i / (tRings - 1);
        for (let s = 0; s <= tSides; s++) skin.describe(tube, i, s, u * strand.len, (s / tSides) * 0.1, hash(seed + n * 6.1), 0.9, tr * (1 - 0.72 * u ** 1.4), seed + n, 2, u);
      }
    }
    this.tips = new Float32Array(b.tendrils * 3);
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
    const walked = plan.speed * (tau + (plan.fits / w) * (Math.sin(w * tau + plan.phase * 6.28) - Math.sin(plan.phase * 6.28)));
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
        const jz = (hash(b.seed + step * 5.3 + j * 7.9) - 0.5) * 0.2 * k;
        const fore = leg.fore * b.hipFore * 0.95 + jz;
        const side = leg.side * b.stanceSide + jx;
        return [o[0] + fx * fore + rx * side, o[1] + fz * fore + rz * side];
      };
      const here = plant(n);
      let x = here[0];
      let z = here[1];
      let lift = 0;
      let bear = 1;
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
      feet.push({ x, y: groundY + lift, z, lift, wet: Math.max(0, env.sea - groundY) });
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
    const cy = base + b.standH - 0.045 * k * dipSum - 0.1 * k * down + 0.012 * k * habit2;
    const yaw = plan.heading + b.skew + 0.035 * habit + 0.02 * shift;
    const pitch = (9 - 19 * down) * (Math.PI / 180) + 0.035 * nose + 0.012 * habit2;
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

    // The trunk.
    const body = this.body;
    for (let i = 0; i < body.rings; i++) {
      const t = i / (body.rings - 1);
      const a = (t - 0.5) * b.bodyLen;
      const up = curve(SPINE, t) * k;
      // It breathes: the ribs go out and in.
      const breathe = 1 + 0.018 * Math.sin(seconds * 1.9 + b.seed) * smooth(0.2, 0.5, t) * smooth(0.95, 0.6, t);
      skin.ring(body, i, cx + F[0] * a + U[0] * up, cy + F[1] * a + U[1] * up, cz + F[2] * a + U[2] * up, R[0], R[1], R[2], U[0], U[1], U[2], this.bodyLocal, i * body.sides * 2, breathe);
    }
    skin.normals(body);

    // The legs, hip to foot through one joint. The hind one bends back like a bird's, the fore one a little forward.
    for (let j = 0; j < 4; j++) {
      const leg = LEGS[j] as (typeof LEGS)[number];
      const foot = feet[j] as Foot;
      const tube = this.legs[j] as Tube;
      const hx = cx + F[0] * leg.fore * b.hipFore + R[0] * leg.side * b.hipSide - U[0] * 0.2 * k;
      const hy = cy + F[1] * leg.fore * b.hipFore + R[1] * leg.side * b.hipSide - U[1] * 0.2 * k;
      const hz = cz + F[2] * leg.fore * b.hipFore + R[2] * leg.side * b.hipSide - U[2] * 0.2 * k;
      const footY = foot.y + b.legR * 1.2;
      let dx = foot.x - hx;
      let dy = footY - hy;
      let dz = foot.z - hz;
      let d = Math.hypot(dx, dy, dz);
      const l1 = b.legLen * b.knee;
      const l2 = b.legLen - l1;
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
        const blend = smooth(b.knee - 0.08, b.knee + 0.08, u);
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
    const neck = this.neck;
    const seg = b.neckLen / (neck.rings - 1);
    const baseX = cx + F[0] * (0.5 * b.bodyLen - 0.14 * k) + U[0] * 0.07 * k;
    const baseY = cy + F[1] * (0.5 * b.bodyLen - 0.14 * k) + U[1] * 0.07 * k;
    const baseZ = cz + F[2] * (0.5 * b.bodyLen - 0.14 * k) + U[2] * 0.07 * k;
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
      const floor = Math.max(env.ground(ahead[0], ahead[1]), env.sea - 0.3 * k);
      const want = floor + (plan.reach >= 1 ? 0.1 * k : 0.55 * k) + dab;
      let lo = 0.3;
      let hi = 1.45;
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
      skin.ring(neck, i, pts[i * 3] as number, pts[i * 3 + 1] as number, pts[i * 3 + 2] as number, nx, ny, nz, bx, by, bz, this.neckLocal, i * neck.sides * 2, gulp);
      if (i === neck.rings - 1) {
        tx = ax;
        ty = ay;
        tz = az;
      }
    }
    skin.normals(neck);
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
    const rest = wet ? env.sea - 0.015 : floorY + 0.02;
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
      let x = ex + ox * b.neckR * 0.35 * st.out;
      let y = ey + oy * b.neckR * 0.35 * st.out;
      let z = ez + oz * b.neckR * 0.35 * st.out;
      const each = st.len / (tube.rings - 1);
      const swing = 0.07 * Math.sin(seconds * 1.6 + st.phase) + 0.04 * Math.sin(seconds * 3.7 + st.phase * 2.3);
      let px = x;
      let py = y;
      let pz = z;
      for (let i = 0; i < tube.rings; i++) {
        const u = i / (tube.rings - 1);
        // It leaves along the neck's end, spreads a little, and gravity takes it.
        const g = smooth(0, 0.55 + 0.4 * st.stiff, u);
        let dx = (tx + ox * 0.55 * st.out) * (1 - g) + (lagX + swing * cyw + ox * 0.12) * g;
        let dy = (ty + oy * 0.55 * st.out) * (1 - g) - g;
        let dz = (tz + oz * 0.55 * st.out) * (1 - g) + (lagZ + swing * sy + oz * 0.12) * g;
        if (y < rest + 0.03) {
          // On the water or the rock: it lies along it, fanned, drawn out by the stream where there is one.
          const fan = st.angle + 0.5 * Math.sin(st.phase);
          dx = Math.cos(fan) * 0.8 + (wet ? 0.25 : 0);
          dz = Math.sin(fan) * 0.8 + (wet ? 0.97 : 0);
          dy = (rest - y) * 4;
          dx += wet ? 0.3 * Math.sin(seconds * 1.3 + st.phase + u * 3) : 0;
        }
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
        skin.ring(tube, i, x, y, z, nx, ny, nz, bx, by, bz, this.tendrilLocal, i * tube.sides * 2);
        // How wet: what has been in the water is dark and shines.
        skin.setHeat(tube, i, wet ? smooth(rest + 0.5, rest, y) : 0);
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
