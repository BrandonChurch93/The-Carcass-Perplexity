// One crust-walker: its proportions, its skin tables, and its pose at a time.
// The pose is solved from nothing each call: where the gait has put each pad on the crust, where the body rides over them,
// the legs from hip to pad, the neck from the shoulders to what it reaches for, and the tendrils that hang from its end.
import type { Skin, Tube } from './skin';

export type V3 = [number, number, number];

export interface Build {
  /** Size of the animal: 1 is a body that rides 9 m up. */
  k: number;
  seed: number;
  bodyLen: number;
  bodyTop: number;
  bodyKeel: number;
  bodyWide: number;
  hump: number;
  hipFore: number;
  hipSide: number;
  hipUp: number;
  femur: number;
  /** How far the knee is carried out and up from the line hip to pad: 0 hangs straight, 1 is a pond-skater. */
  kneeOut: number;
  kneeUp: number;
  /** Part of the lower leg that is above the hock. */
  hock: number;
  stanceFore: number;
  stanceSide: number;
  standH: number;
  stride: number;
  legR: number;
  padR: number;
  neckLen: number;
  neckR: number;
  tendrils: number;
  tendrilLen: number;
  /** Height of a step, metres. */
  stepH: number;
}

export interface NeckAim {
  /** 1: the tuft is down at `target`. 0: it is carried at `raised`. */
  down: number;
  /** Where it feeds, on the crust at the reference time. */
  target: [number, number];
  /** Where the tuft is carried, from the root of the neck: forward, up, right, metres. */
  raised: V3;
  /** Shape of the slack: 0 hangs under the chord, 0.5 is an S, 1 arches over it. */
  shape: number;
}

export interface Plan {
  /** Cycles of the gait walked by `seconds`. It rests where all four pads are down. */
  sigma(seconds: number): number;
  /** Where the body is, on the crust at the reference time, after `sigma` cycles, and which way it faces (radians from north, clockwise). */
  body(sigma: number): { x: number; z: number; yaw: number };
  neck(seconds: number): NeckAim;
  /** Seconds between shifts of weight for one that stands. 0: none. */
  fidget: number;
  /** One that walks and rests may shift its weight in its rests: seconds between shifts, and how much of one shows at `seconds` (0 while it walks). */
  shifts?: { every: number; weight(seconds: number): number } | undefined;
  /** How far the body sinks toward the crust when the tuft is down, metres. */
  dip: number;
  /** How far ahead of and behind its place under the body a pad is ever planted, metres. The legs are cut to it. */
  range: number;
}

export interface Env {
  /** Where the crust that was at (x, z) at the reference time is now. */
  drift(x: number, z: number, seconds: number): [number, number];
  /** The inverse. */
  undrift(x: number, z: number, seconds: number): [number, number];
  /** Metres from a point of the crust (at the reference time) to the nearest seam the pictures show, and the nearest point of it. */
  seam(x: number, z: number): { d: number; x: number; z: number };
}

export interface Stood {
  feet: { x: number; z: number; lift: number }[];
  body: { x: number; z: number; yaw: number };
  tuft: { x: number; y: number; z: number };
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const gauss = (x: number): number => Math.exp(-x * x);
const fract = (x: number): number => x - Math.floor(x);
const hash = (a: number, b: number): number => fract(Math.sin(a * 127.1 + b * 311.7 + 0.5) * 43758.5453);

function lump(x: number, y: number, seed: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const u = x - i;
  const v = y - j;
  const su = u * u * (3 - 2 * u);
  const sv = v * v * (3 - 2 * v);
  const h = (a: number, b: number): number => hash(a + seed * 17.3, b - seed * 5.1);
  return lerp(lerp(h(i, j), h(i + 1, j), su), lerp(h(i, j + 1), h(i + 1, j + 1), su), sv);
}

/** The same round a tube: `along` in lumps, `angle` in radians, `girth` the number of lumps round it. It closes on itself. */
function wrap(along: number, angle: number, girth: number, seed: number): number {
  const r = girth / 6.2832;
  return lump(along + Math.cos(angle) * r + 31, Math.sin(angle) * r + 47, seed);
}

/** The four legs: fore or aft, right or left, and when in the cycle each one swings. A walk: left hind, left fore, right hind, right fore. */
const LEGS: { fore: number; side: number; offset: number }[] = [
  { fore: -1, side: -1, offset: 0 },
  { fore: 1, side: -1, offset: 0.25 },
  { fore: -1, side: 1, offset: 0.5 },
  { fore: 1, side: 1, offset: 0.75 },
];
/** The part of a cycle a pad is on the crust. With four legs a quarter cycle apart, 0.8 leaves a moment between steps with all four down. */
const DUTY = 0.8;
/** A rest of the gait must fall in that moment. */
export const REST = 0.0125;

const BODY_RINGS = 38;
const BODY_SIDES = 26;
const NECK_RINGS = 46;
const NECK_SIDES = 12;
const NECK_END = 7;
const LEG_SIDES = 12;
const TENDRIL_RINGS = 11;
const TENDRIL_SIDES = 6;
const RAG_RINGS = 5;
const RAG_SIDES = 4;

interface Rag {
  tube: Tube;
  local: Float32Array;
  at: V3;
  length: number;
  phase: number;
  twist: number;
}

interface LegTable {
  tube: Tube;
  /** Per ring: the bone it is on, or the joint whose bend it is in, and how far along. */
  bone: Int8Array;
  joint: Int8Array;
  value: Float32Array;
  local: Float32Array;
  /** First ring of the pad. */
  pad: number;
  /** Per ring: how far the bone bows from the straight line between its joints, forward and across, metres. */
  bow: Float32Array;
}

export class Animal {
  private readonly body: Tube;
  private readonly bodyLocal: Float32Array;
  private readonly neck: Tube;
  private readonly neckLocal: Float32Array;
  private readonly legs: LegTable[] = [];
  private readonly tendrils: { tube: Tube; local: Float32Array; angle: number; out: number; length: number; phase: number; parent: number; at: number; turn: number }[] = [];
  private readonly rags: Rag[] = [];
  private readonly shreds: (Rag & { leg: number; node: number })[] = [];
  private readonly roots: Float32Array;
  private readonly ankle: number;
  private readonly fillet: [number, number, number];
  private tibia = 0;
  private meta = 0;
  private readonly centres = new Float32Array(Math.max(NECK_RINGS, 64) * 3);

  constructor(
    private readonly skin: Skin,
    readonly b: Build,
    readonly plan: Plan,
    private readonly env: Env,
  ) {
    const k = b.k;
    const seed = b.seed;
    this.ankle = 0.42 * k;
    this.fillet = [0.34 * k, 0.3 * k, 0.13 * k];

    // The body: a keeled sack, deepest behind the shoulders, with the hips and the shoulder blades standing out of it.
    this.body = skin.tube(BODY_RINGS, BODY_SIDES);
    this.bodyLocal = new Float32Array(BODY_RINGS * BODY_SIDES * 3);
    for (let i = 0; i < BODY_RINGS; i++) {
      const t = 0.5 - 0.5 * Math.cos((Math.PI * i) / (BODY_RINGS - 1));
      const e = Math.pow(Math.max(0, 4 * t * (1 - t)), 0.4);
      const x = (t - 0.5) * b.bodyLen;
      const top = b.bodyTop * e * (1 + 0.55 * b.hump * gauss((t - 0.62) / 0.3) - 0.14 * gauss((t - 0.43) / 0.1));
      const keel = b.bodyKeel * e * (0.72 + 0.5 * gauss((t - 0.5) / 0.2));
      const wide = b.bodyWide * e * (1 + 0.16 * gauss((t - 0.27) / 0.1) + 0.24 * gauss((t - 0.74) / 0.1) - 0.1 * gauss((t - 0.5) / 0.12));
      for (let j = 0; j < BODY_SIDES; j++) {
        const a = (j / BODY_SIDES) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        // A withered sack: lumps at three sizes, the ribs showing on the flanks, the skin hanging in folds along the keel.
        let m = 1 + 0.26 * (wrap(t * 5, a, 5, seed) - 0.5) + 0.2 * (wrap(t * 10, a, 10, seed + 1) - 0.5) + 0.09 * (wrap(t * 20, a, 18, seed + 2) - 0.5);
        m -= 0.05 * Math.sin(t * 34 + 2 * s) * gauss(s / 0.55) * gauss((t - 0.5) / 0.3);
        m += 0.3 * smooth(-0.55, -1, s) * (wrap(t * 9, a, 4, seed + 3) - 0.35);
        // The blades of the shoulders and the points of the hips, high on each side.
        const up = Math.max(0, s);
        const blade = gauss((Math.abs(c) - 0.72) / 0.3) * up;
        m += 0.22 * blade * gauss((t - 0.75) / 0.09) + 0.17 * blade * gauss((t - 0.26) / 0.09);
        // The ridge of the spine, a knob to each bone.
        m += 0.08 * gauss((a - Math.PI / 2) / 0.24) * (0.55 + 0.45 * Math.sin(t * 46));
        const pinch = s < 0 ? 1 - 0.55 * s * s : 1;
        const o = (i * BODY_SIDES + j) * 3;
        this.bodyLocal[o] = x;
        this.bodyLocal[o + 1] = s * (s > 0 ? top : keel) * m;
        this.bodyLocal[o + 2] = c * wide * pinch * m;
        const under = smooth(0.2, -0.9, s);
        const socket = Math.max(gauss((t - 0.75) / 0.12), gauss((t - 0.26) / 0.12)) * smooth(0.5, -0.2, s);
        skin.describe(this.body, i, j, x, (j / BODY_SIDES) * 5.6 * k, 0.5 - 0.3 * under - 0.12 * socket + 0.1 * blade, 1 - 0.35 * under - 0.3 * socket, Math.max(top, wide) * e, seed, 0, 0);
      }
      skin.describe(this.body, i, BODY_SIDES, x, 5.6 * k, 0.5, 1, Math.max(top, wide) * e, seed, 0, 0);
    }

    // Rags of dead skin that hang from the keel and the flanks, and shreds of it at the knees and the hocks.
    const rags = 7 + Math.floor(hash(seed, 21) * 6);
    for (let n = 0; n < rags; n++) {
      const i = Math.floor(lerp(0.22, 0.8, hash(n, seed + 22)) * (BODY_RINGS - 1));
      const j = Math.floor(lerp(0.62, 0.88, hash(n, seed + 23)) * BODY_SIDES);
      const q = (i * BODY_SIDES + j) * 3;
      const rag = this.rag(n, (0.35 + 1.3 * Math.pow(hash(n, seed + 24), 2)) * k, (0.03 + 0.09 * Math.pow(hash(n, seed + 25), 2)) * k);
      rag.at = [(this.bodyLocal[q] as number) * 0.98, (this.bodyLocal[q + 1] as number) * 0.9, -(this.bodyLocal[q + 2] as number) * 0.9];
      this.rags.push(rag);
    }
    for (let n = 0; n < 16; n++) {
      if (hash(n, seed + 31) < 0.3) continue;
      const node = 1 + (n & 1);
      const rag = this.rag(40 + n, (0.25 + 0.75 * Math.pow(hash(n, seed + 32), 2)) * k, (0.025 + 0.06 * hash(n, seed + 33)) * k);
      rag.at = [(hash(n, seed + 34) - 0.5) * 0.2 * k, -(0.1 + 0.08 * hash(n, seed + 35)) * k * b.legR, (hash(n, seed + 36) - 0.5) * 0.2 * k];
      this.shreds.push({ ...rag, leg: n >> 2, node });
    }

    // The neck: thick where it leaves the shoulders, thin along its length, a ribbed crown where the tendrils start.
    this.neck = skin.tube(NECK_RINGS, NECK_SIDES);
    this.neckLocal = new Float32Array(NECK_RINGS * NECK_SIDES * 2);
    for (let i = 0; i < NECK_RINGS; i++) {
      const s = i / (NECK_RINGS - 1);
      let r = b.neckR * (0.22 + 0.78 * Math.pow(1 - s, 1.7)) * (1 + 0.5 * gauss(s / 0.07)) + 0.07 * k * gauss((s - 0.94) / 0.045);
      if (i >= NECK_RINGS - 2) r *= i === NECK_RINGS - 1 ? 0.05 : 0.7;
      for (let j = 0; j < NECK_SIDES; j++) {
        const a = (j / NECK_SIDES) * Math.PI * 2;
        const m = 1 + 0.2 * (wrap(s * 16, a, 4, seed + 3) - 0.5) + 0.06 * Math.cos(a * 2 + s * 5) + 0.05 * Math.cos(a * 3 + 2);
        this.neckLocal[(i * NECK_SIDES + j) * 2] = Math.cos(a) * r * m;
        this.neckLocal[(i * NECK_SIDES + j) * 2 + 1] = Math.sin(a) * r * m * (1 - 0.12 * (1 - s));
      }
      for (let j = 0; j <= NECK_SIDES; j++) {
        const under = smooth(0.1, -0.8, Math.sin((j / NECK_SIDES) * Math.PI * 2));
        skin.describe(this.neck, i, j, s * b.neckLen, (j / NECK_SIDES) * Math.PI * 2 * Math.max(r, 0.16 * k), lerp(0.32, 0.5, smooth(0, 0.2, s)) + 0.45 * Math.pow(s, 2.4) - 0.1 * under, lerp(0.35, 1, smooth(0, 0.14, s)), r, seed, 1, s);
      }
    }

    // The legs.
    const lower = this.lowerLeg();
    this.tibia = lower * b.hock;
    this.meta = lower * (1 - b.hock);
    for (let j = 0; j < 4; j++) this.legs.push(this.legTable(j));

    // The tendrils: pale roots that start round the crown, and some that fork from those.
    const mains = b.tendrils;
    const forks = Math.floor(mains * 0.8);
    for (let i = 0; i < mains + forks; i++) {
      const fork = i >= mains;
      const parent = fork ? Math.floor(((i - mains) * mains) / forks) : -1;
      const tube = skin.tube(TENDRIL_RINGS, TENDRIL_SIDES);
      const local = new Float32Array(TENDRIL_RINGS * TENDRIL_SIDES * 2);
      const inner = !fork && i % 3 === 2;
      const at = fork ? 3 + Math.floor(hash(i, seed + 6) * 4) : 0;
      const whole = b.tendrilLen * (0.75 + 0.5 * hash(fork ? parent : i, seed + 2)) * (!fork && (fork ? parent : i) % 3 === 2 ? 0.8 : 1);
      const length = fork ? whole * (1 - at / (TENDRIL_RINGS - 1)) * (0.7 + 0.5 * hash(i, seed + 7)) : whole;
      const thick = (0.042 + 0.03 * hash(fork ? parent : i, seed + 1)) * k * (fork ? 0.55 * (1 - (0.6 * at) / (TENDRIL_RINGS - 1)) : 1);
      for (let r = 0; r < TENDRIL_RINGS; r++) {
        const u = r / (TENDRIL_RINGS - 1);
        const rad = r === TENDRIL_RINGS - 1 ? 0.006 * k : thick * (1 - 0.62 * Math.pow(u, 1.3)) * (1 + 0.35 * (hash(i * 3 + r, seed + 9) - 0.4));
        for (let side = 0; side < TENDRIL_SIDES; side++) {
          const a = (side / TENDRIL_SIDES) * Math.PI * 2;
          local[(r * TENDRIL_SIDES + side) * 2] = Math.cos(a) * rad;
          local[(r * TENDRIL_SIDES + side) * 2 + 1] = Math.sin(a) * rad;
        }
        for (let side = 0; side <= TENDRIL_SIDES; side++) {
          skin.describe(tube, r, side, u * length + i * 0.37, (side / TENDRIL_SIDES) * 0.4, 0.86 + 0.14 * u, lerp(fork ? 0.8 : 0.5, 1, smooth(0, 0.3, u)), rad, seed, 2, u);
        }
      }
      this.tendrils.push({
        tube,
        local,
        angle: (((fork ? parent : i) + 0.5 * hash(fork ? parent : i, seed)) / mains) * Math.PI * 2,
        out: inner ? 0.5 : 1.0 + 0.5 * hash(i, seed + 8),
        length,
        phase: hash(i, seed + 5) * 6.28,
        parent,
        at,
        turn: fork ? (hash(i, seed + 11) < 0.5 ? -1 : 1) * (0.5 + 0.5 * hash(i, seed + 12)) : 0,
      });
    }
    this.roots = new Float32Array(mains * TENDRIL_RINGS * 6);
  }

  private rag(n: number, length: number, broad: number): Rag {
    const { skin } = this;
    const k = this.b.k;
    const seed = this.b.seed;
    const tube = skin.tube(RAG_RINGS, RAG_SIDES);
    const local = new Float32Array(RAG_RINGS * RAG_SIDES * 2);
    for (let r = 0; r < RAG_RINGS; r++) {
      const u = r / (RAG_RINGS - 1);
      const w = broad * (r === RAG_RINGS - 1 ? 0.15 : 1 - 0.6 * u + 0.5 * (hash(n * 5 + r, seed + 26) - 0.5));
      for (let side = 0; side < RAG_SIDES; side++) {
        const a = (side / RAG_SIDES) * Math.PI * 2;
        local[(r * RAG_SIDES + side) * 2] = Math.cos(a) * w;
        local[(r * RAG_SIDES + side) * 2 + 1] = Math.sin(a) * 0.022 * k * (1 - 0.6 * u);
      }
      for (let side = 0; side <= RAG_SIDES; side++) skin.describe(tube, r, side, u * length + n, (side / RAG_SIDES) * 2 * broad, 0.22 + 0.1 * u, 0.5 + 0.3 * u, Math.max(w, 0.03), seed, 5, u);
    }
    return { tube, local, at: [0, 0, 0], length, phase: hash(n, seed + 27) * 6.28, twist: hash(n, seed + 28) * 3.14 };
  }

  // A rag hangs from a point and swings a little behind it.
  private hang(rag: Rag, x: number, y: number, z: number, f: V3, r: V3, lean: number, seconds: number): void {
    const { skin } = this;
    let px = x;
    let py = y;
    let pz = z;
    const ct = Math.cos(rag.twist);
    const st = Math.sin(rag.twist);
    const wx = f[0] * ct + r[0] * st;
    const wz = f[2] * ct + r[2] * st;
    const wl = Math.hypot(wx, wz) || 1;
    const nx = wx / wl;
    const nz = wz / wl;
    const seg = rag.length / (RAG_RINGS - 1);
    for (let i = 0; i < RAG_RINGS; i++) {
      const uu = i / (RAG_RINGS - 1);
      const swing = uu * (0.14 * Math.sin(seconds * 1.3 + rag.phase - uu * 1.5) + 0.06 * Math.sin(seconds * 2.9 + rag.phase * 2) + lean) + 0.3 * Math.sin(rag.phase * 5) * uu + 0.5 * (hash(i, rag.phase) - 0.5);
      // It hangs: down, and across its own width by the swing.
      let dx = -nz * swing;
      let dy = -1;
      let dz = nx * swing;
      const dl = Math.hypot(dx, dy, dz);
      dx /= dl;
      dy /= dl;
      dz /= dl;
      if (i > 0) {
        px += dx * seg;
        py = Math.max(0.03, py + dy * seg);
        pz += dz * seg;
      }
      skin.ring(rag.tube, i, px, py, pz, nx, 0, nz, dy * nz, dz * nx - dx * nz, -dy * nx, rag.local, i * RAG_SIDES * 2);
    }
    skin.normals(rag.tube);
  }

  // The lower leg must reach the farthest pad of a stride with a little bend to spare: measure it over a cycle.
  private lowerLeg(): number {
    const b = this.b;
    let far = 0;
    for (const leg of LEGS) {
      for (const along of [-this.plan.range, this.plan.range]) {
        for (const lean of [-0.5 * b.k, 0.5 * b.k]) {
          const hip: V3 = [leg.fore * b.hipFore, b.standH + b.hipUp + 0.08 * b.k, leg.side * b.hipSide + lean];
          const ankle: V3 = [leg.fore * b.stanceFore + along, this.ankle, leg.side * b.stanceSide];
          const knee = this.knee(hip, ankle, [1, 0, 0], [0, 1, 0], [0, 0, 1], leg);
          far = Math.max(far, Math.hypot(ankle[0] - knee[0], ankle[1] - knee[1], ankle[2] - knee[2]));
        }
      }
    }
    return far * 1.012;
  }

  private knee(hip: V3, ankle: V3, f: V3, u: V3, r: V3, leg: { fore: number; side: number }): V3 {
    const b = this.b;
    let dx = ankle[0] - hip[0];
    let dy = ankle[1] - hip[1];
    let dz = ankle[2] - hip[2];
    const l = Math.hypot(dx, dy, dz) || 1;
    const o = b.kneeOut * leg.side;
    const fo = b.kneeOut * 0.35 * leg.fore;
    dx = dx / l + r[0] * o + u[0] * b.kneeUp + f[0] * fo;
    dy = dy / l + r[1] * o + u[1] * b.kneeUp + f[1] * fo;
    dz = dz / l + r[2] * o + u[2] * b.kneeUp + f[2] * fo;
    const m = b.femur / (Math.hypot(dx, dy, dz) || 1);
    return [hip[0] + dx * m, hip[1] + dy * m, hip[2] + dz * m];
  }

  private legTable(j: number): LegTable {
    const b = this.b;
    const k = b.k;
    const seed = b.seed + j * 3.7;
    const S1 = b.femur;
    const S2 = S1 + this.tibia;
    const S3 = S2 + this.meta;
    const S4 = S3 + this.ankle;
    const marks: number[] = [];
    const push = (s: number): void => {
      if (s >= 0 && s <= S3 - 0.02 * k) marks.push(s);
    };
    for (let s = 0; s < S3; s += 0.4 * k) push(s);
    [S1, S2].forEach((s, n) => {
      const f = this.fillet[n] as number;
      for (const d of [-1.5, -1, -0.6, -0.2, 0.2, 0.6, 1, 1.5]) push(s + d * f);
    });
    for (const d of [-0.5, -0.25]) push(S3 + d * k);
    marks.sort((x, y) => x - y);
    const along: number[] = [];
    for (const s of marks) if (along.length === 0 || s - (along[along.length - 1] as number) > 0.07 * k) along.push(s);
    // The pad: height above its sole and radius, in units of the pad's radius; the last rings close the sole.
    const PAD: [number, number][] = [
      [1, 0.17],
      [0.9, 0.2],
      [0.8, 0.3],
      [0.7, 0.48],
      [0.58, 0.68],
      [0.44, 0.84],
      [0.3, 0.94],
      [0.16, 1],
      [0.06, 0.98],
      [0.015, 0.9],
      [0, 0.7],
      [0, 0.02],
    ];
    const pad = along.length;
    const rings = pad + PAD.length;
    const tube = this.skin.tube(rings, LEG_SIDES);
    const table: LegTable = { tube, bone: new Int8Array(rings), joint: new Int8Array(rings).fill(-1), value: new Float32Array(rings), local: new Float32Array(rings * LEG_SIDES * 2), pad, bow: new Float32Array(rings * 2) };
    const starts = [0, S1, S2, S3, S4];
    const p1 = hash(seed, 1) * 6.28;
    const p2 = hash(seed, 2) * 6.28;
    for (let i = 0; i < rings; i++) {
      const inPad = i >= pad;
      const s = inPad ? S3 + this.ankle * (1 - (PAD[i - pad] as [number, number])[0]) : (along[i] as number);
      let bone = 0;
      while (bone < 3 && s > (starts[bone + 1] as number)) bone++;
      table.bone[i] = bone;
      table.value[i] = s - (starts[bone] as number);
      for (let n = 0; n < 3; n++) {
        const f = this.fillet[n] as number;
        const at = starts[n + 1] as number;
        if (Math.abs(s - at) < f && !(inPad && n < 2)) {
          table.joint[i] = n;
          table.value[i] = (s - (at - f)) / (2 * f);
        }
      }
      // Thickness: a thigh with muscle on it, then shafts that taper, with a knob at each joint.
      let r: number;
      if (s < S1) r = lerp(0.215, 0.15, s / S1) + 0.035 * gauss((s / S1 - 0.2) / 0.22);
      else if (s < S2) r = lerp(0.145, 0.105, (s - S1) / this.tibia);
      else r = lerp(0.1, 0.085, Math.min(1, (s - S2) / this.meta));
      r += 0.085 * gauss((s - S1) / (0.2 * k)) + 0.1 * gauss((s - S2) / (0.17 * k)) + 0.06 * gauss((s - S3) / (0.14 * k));
      r *= k * b.legR;
      // No bone is straight: each bows a little between its joints.
      const lens = [S1, this.tibia, this.meta];
      for (let n = 0; n < 3; n++) {
        const u = (s - (starts[n] as number)) / (lens[n] as number);
        if (u > 0 && u < 1) {
          const arc = Math.pow(Math.sin(Math.PI * u), 1.5) * (lens[n] as number);
          table.bow[i * 2] = arc * 0.05 * (hash(seed, 30 + n) - 0.35) * (n === 1 ? -1 : 1);
          table.bow[i * 2 + 1] = arc * 0.04 * (hash(seed, 40 + n) - 0.5);
        }
      }
      let shape = 0;
      if (inPad) {
        const row = PAD[i - pad] as [number, number];
        const flare = smooth(0.17, 0.5, row[1]);
        r = lerp(r, b.padR * row[1], Math.max(flare, row[1] < 0.1 ? 1 : 0));
        shape = flare;
      }
      for (let n = 0; n < LEG_SIDES; n++) {
        const a = (n / LEG_SIDES) * Math.PI * 2;
        const tendon = 1 + 0.08 * Math.cos(2 * a + 0.4) + 0.05 * Math.cos(3 * a + p1) + 0.16 * (wrap((s * 2.4) / k, a, 3, seed) - 0.5) + 0.07 * (wrap((s * 6) / k, a, 5, seed + 1) - 0.5);
        const toes = 0.94 + 0.2 * Math.cos(3 * a + p1) + 0.09 * Math.cos(2 * a + p2) + 0.07 * Math.cos(5 * a + p2 * 2) + 0.18 * Math.max(0, Math.cos(a));
        const m = lerp(tendon, toes, shape);
        table.local[(i * LEG_SIDES + n) * 2] = Math.cos(a) * r * m * lerp(1.12, 1, shape);
        table.local[(i * LEG_SIDES + n) * 2 + 1] = Math.sin(a) * r * m * lerp(0.9, 1, shape);
      }
      const knob = Math.max(gauss((s - S1) / (0.3 * k)), gauss((s - S2) / (0.26 * k)), gauss((s - S3) / (0.2 * k)));
      for (let n = 0; n <= LEG_SIDES; n++) {
        const sole = inPad && (PAD[i - pad] as [number, number])[0] <= 0.02 ? 0.6 : 1;
        this.skin.describe(tube, i, n, s + j * 1.3, (n / LEG_SIDES) * Math.PI * 2 * Math.max(r, 0.14 * k), lerp(0.36, 0.52, smooth(0, 1.5 * k, s)) - 0.26 * knob + 0.1 * shape, sole * lerp(0.4, 1, smooth(0, 1.1 * k, s)), r, b.seed, inPad ? 4 : 3, knob);
      }
    }
    return table;
  }

  /** The pads of the gait: where pad `j` stands for the `n`th time, on the crust at the reference time. */
  private plant(j: number, n: number, shift: number): [number, number] {
    const leg = LEGS[j] as (typeof LEGS)[number];
    const b = this.b;
    const at = this.plan.body(n - leg.offset + DUTY * 0.5);
    const fx = Math.sin(at.yaw);
    const fz = -Math.cos(at.yaw);
    const h1 = hash(j * 7.1 + n * 3.3 + shift * 1.7, b.seed) - 0.5;
    const h2 = hash(j * 2.9 + n * 5.7 + shift * 4.1, b.seed + 1) - 0.5;
    const jitter = shift === 0 ? 0.5 : 0.9;
    const fore = leg.fore * b.stanceFore + h1 * jitter * b.k;
    const side = leg.side * b.stanceSide + h2 * jitter * b.k;
    let x = at.x + fx * fore - fz * side;
    let z = at.z + fz * fore + fx * side;
    // No pad goes down in open lava: one that would is put down beside the seam.
    const near = this.env.seam(x, z);
    const clear = b.padR + 0.9;
    if (near.d < clear) {
      const l = near.d > 1e-3 ? near.d : 1;
      const ox = near.d > 1e-3 ? (x - near.x) / l : fx;
      const oz = near.d > 1e-3 ? (z - near.z) / l : fz;
      x = near.x + ox * clear;
      z = near.z + oz * clear;
    }
    return [x, z];
  }

  pose(seconds: number): Stood {
    const { b, plan, env, skin } = this;
    const k = b.k;
    const sg = plan.sigma(seconds);
    const at = plan.body(sg);
    const aim = plan.neck(seconds);

    // The pads.
    const feet: { x: number; z: number; lift: number; pitch: number; unload: number; land: number; fx: number; fz: number }[] = [];
    let shiftSide = 0;
    let shiftFore = 0;
    let dip = 0;
    for (let j = 0; j < 4; j++) {
      const leg = LEGS[j] as (typeof LEGS)[number];
      const cycle = sg + leg.offset;
      const n = Math.floor(cycle);
      const f = cycle - n;
      let event = 0;
      let w = -1;
      // It leans off a pad before the pad lifts and comes back over it only after the pad has taken weight again.
      let unload = f < 0.1 ? 1 - smooth(-0.08, 0.1, f) : smooth(0.52, DUTY, f) * (1 - smooth(0.92, 1.1, f));
      let land = f < 0.16 ? Math.pow(Math.sin((Math.PI * f) / 0.16), 2) : 0;
      let high = b.stepH;
      if (f >= DUTY) w = (f - DUTY) / (1 - DUTY);
      if (plan.fidget > 0) {
        // One that stands shifts its weight: each pad in its turn is lifted and put down again a little way off.
        const beat = seconds / (plan.fidget * 4) + leg.offset + hash(j, b.seed + 4) * 0.05;
        event = Math.floor(beat);
        const ff = beat - event;
        const win = 1.6 / (plan.fidget * 4);
        w = ff > 1 - win ? (ff - (1 - win)) / win : -1;
        unload = ff < 0.7 * win ? 1 - smooth(-0.4 * win, 0.7 * win, ff) : smooth(1 - 2.6 * win, 1 - win, ff) * (1 - smooth(1 - 0.4 * win, 1 + 0.7 * win, ff));
        land = ff < 0.4 * win ? Math.pow(Math.sin((Math.PI * ff) / (0.4 * win)), 2) : 0;
        high = b.stepH * (0.3 + 0.5 * hash(event, j + b.seed));
      }
      const from = plan.fidget > 0 ? this.plant(j, 0, event + 1) : this.plant(j, n, 0);
      let px = from[0];
      let pz = from[1];
      let lift = 0;
      let pitch = 0;
      let fx = Math.sin(at.yaw);
      let fz = -Math.cos(at.yaw);
      if (w >= 0) {
        const to = plan.fidget > 0 ? this.plant(j, 0, event + 2) : this.plant(j, n + 1, 0);
        // The heel peels first, the pad swings low and is put down toe first.
        const e = smooth(0.05, 0.96, w);
        const e2 = e * e * (3 - 2 * e) * 0.25 + e * 0.75;
        px = lerp(from[0], to[0], e2);
        pz = lerp(from[1], to[1], e2);
        lift = high * Math.pow(Math.sin(Math.PI * Math.pow(w, 0.85)), 1.3);
        pitch = 0.85 * Math.sin(Math.PI * Math.pow(w, 0.7)) * (1 - 0.3 * w);
        const tx = to[0] - from[0];
        const tz = to[1] - from[1];
        const tl = Math.hypot(tx, tz);
        if (tl > 0.5) {
          fx = tx / tl;
          fz = tz / tl;
        }
      }
      if (plan.shifts && w < 0) {
        // In a rest between steps: the pad is lifted and put down where it was.
        const much = plan.shifts.weight(seconds);
        if (much > 0) {
          const beat = seconds / (plan.shifts.every * 4) + leg.offset;
          const ff = beat - Math.floor(beat);
          const win = 1.6 / (plan.shifts.every * 4);
          const up = ff > 1 - win ? (ff - (1 - win)) / win : -1;
          const lean = ff < 0.7 * win ? 1 - smooth(-0.4 * win, 0.7 * win, ff) : smooth(1 - 2.6 * win, 1 - win, ff) * (1 - smooth(1 - 0.4 * win, 1 + 0.7 * win, ff));
          unload += much * lean * (1 - unload);
          if (ff < 0.4 * win) land += much * Math.pow(Math.sin((Math.PI * ff) / (0.4 * win)), 2) * (1 - land);
          if (up >= 0) {
            lift = much * b.stepH * (0.3 + 0.4 * hash(Math.floor(beat), j + b.seed)) * Math.pow(Math.sin(Math.PI * Math.pow(up, 0.85)), 1.3);
            pitch = much * 0.6 * Math.sin(Math.PI * Math.pow(up, 0.7)) * (1 - 0.3 * up);
          }
        }
      }
      const world = env.drift(px, pz, seconds);
      feet.push({ x: world[0], z: world[1], lift, pitch, unload, land, fx, fz });
      shiftSide -= leg.side * unload;
      shiftFore -= leg.fore * unload;
      dip += land;
    }

    // The body rides over the pads that carry it: it leans off a pad before the pad lifts and settles as the pad takes weight again.
    const centre = env.drift(at.x, at.z, seconds);
    const fwd: V3 = [Math.sin(at.yaw), 0, -Math.cos(at.yaw)];
    const right: V3 = [-fwd[2], 0, fwd[0]];
    const idle = Math.sin(seconds * 0.7 + b.seed * 9);
    const idle2 = Math.sin(seconds * 0.43 + b.seed * 4);
    const sideways = shiftSide * 0.42 * k + 0.12 * k * idle2;
    const forwards = shiftFore * 0.22 * k + 0.1 * k * idle - 0.5 * k * aim.down * (plan.dip > 0 ? 1 : 0.3);
    const cx = centre[0] + right[0] * sideways + fwd[0] * forwards;
    const cz = centre[1] + right[2] * sideways + fwd[2] * forwards;
    const cy = b.standH - 0.09 * k * dip - plan.dip * aim.down + 0.05 * k * idle;
    const pitch = -0.1 * aim.down - 0.03 * shiftFore + 0.012 * idle2;
    const roll = 0.045 * shiftSide + 0.01 * idle;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const f: V3 = [fwd[0] * cp, sp, fwd[2] * cp];
    const u0: V3 = [-fwd[0] * sp, cp, -fwd[2] * sp];
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const r: V3 = [right[0] * cr + u0[0] * sr, right[1] * cr + u0[1] * sr, right[2] * cr + u0[2] * sr];
    const u: V3 = [u0[0] * cr - right[0] * sr, u0[1] * cr - right[1] * sr, u0[2] * cr - right[2] * sr];

    // Body: rigid. Local x is forward, y up, z left.
    {
      const p = skin.position;
      const w = BODY_SIDES + 1;
      const local = this.bodyLocal;
      for (let i = 0; i < BODY_RINGS; i++) {
        let o = (this.body.start + i * w) * 3;
        for (let j = 0; j < w; j++) {
          const q = (i * BODY_SIDES + (j === BODY_SIDES ? 0 : j)) * 3;
          const lx = local[q] as number;
          const ly = local[q + 1] as number;
          const lz = -(local[q + 2] as number);
          p[o++] = cx + f[0] * lx + u[0] * ly + r[0] * lz;
          p[o++] = cy + f[1] * lx + u[1] * ly + r[1] * lz;
          p[o++] = cz + f[2] * lx + u[2] * ly + r[2] * lz;
        }
      }
      skin.normals(this.body);
    }

    // The rags hang from the body and swing a little behind it.
    for (const rag of this.rags) {
      this.hang(rag, cx + f[0] * rag.at[0] + u[0] * rag.at[1] + r[0] * rag.at[2], cy + f[1] * rag.at[0] + u[1] * rag.at[1] + r[1] * rag.at[2], cz + f[2] * rag.at[0] + u[2] * rag.at[1] + r[2] * rag.at[2], f, r, 0.5 * roll, seconds);
    }

    // Legs.
    for (let j = 0; j < 4; j++) {
      const leg = LEGS[j] as (typeof LEGS)[number];
      const foot = feet[j] as (typeof feet)[number];
      const table = this.legs[j] as LegTable;
      const hip: V3 = [
        cx + f[0] * leg.fore * b.hipFore + r[0] * leg.side * b.hipSide + u[0] * b.hipUp,
        cy + f[1] * leg.fore * b.hipFore + r[1] * leg.side * b.hipSide + u[1] * b.hipUp,
        cz + f[2] * leg.fore * b.hipFore + r[2] * leg.side * b.hipSide + u[2] * b.hipUp,
      ];
      // The pad turns on the ankle: flat on the crust when it stands, toe down while it is in the air.
      const cq = Math.cos(foot.pitch);
      const sq = Math.sin(foot.pitch);
      const axis: V3 = [foot.fx * sq, cq, foot.fz * sq];
      const sole: V3 = [foot.x, 0.02 + foot.lift + b.padR * sq * 0.95, foot.z];
      const ankle: V3 = [sole[0] + axis[0] * this.ankle, sole[1] + axis[1] * this.ankle, sole[2] + axis[2] * this.ankle];
      const knee = this.knee(hip, ankle, f, u, r, leg);
      // Two bones from the knee to the ankle; the hock bends back on a hind leg and forward on a fore leg, and a little out.
      let ex = ankle[0] - knee[0];
      let ey = ankle[1] - knee[1];
      let ez = ankle[2] - knee[2];
      let d = Math.hypot(ex, ey, ez) || 1;
      ex /= d;
      ey /= d;
      ez /= d;
      const reach = (this.tibia + this.meta) * 0.9985;
      if (d > reach) d = reach;
      const ca = Math.min(1, Math.max(-1, (this.tibia * this.tibia + d * d - this.meta * this.meta) / (2 * this.tibia * d)));
      const sa = Math.sqrt(1 - ca * ca);
      let qx = fwd[0] * leg.fore * 0.8 + right[0] * leg.side * 0.6;
      let qy = 0.1;
      let qz = fwd[2] * leg.fore * 0.8 + right[2] * leg.side * 0.6;
      const along = qx * ex + qy * ey + qz * ez;
      qx -= ex * along;
      qy -= ey * along;
      qz -= ez * along;
      const ql = Math.hypot(qx, qy, qz) || 1;
      const hock: V3 = [knee[0] + this.tibia * (ca * ex + (sa * qx) / ql), knee[1] + this.tibia * (ca * ey + (sa * qy) / ql), knee[2] + this.tibia * (ca * ez + (sa * qz) / ql)];
      // If the leg is at full stretch the ankle is where the bones put it, and the pad with it.
      const hx = ankle[0] - hock[0];
      const hy = ankle[1] - hock[1];
      const hz = ankle[2] - hock[2];
      const hl = Math.hypot(hx, hy, hz) || 1;
      const end: V3 = [hock[0] + (hx / hl) * this.meta, hock[1] + (hy / hl) * this.meta, hock[2] + (hz / hl) * this.meta];
      const base: V3 = [end[0] - axis[0] * this.ankle, end[1] - axis[1] * this.ankle, end[2] - axis[2] * this.ankle];
      this.writeLeg(table, [hip, knee, hock, end, base], fwd, 1 - 0.07 * smooth(0, 0.2 * k, foot.lift));
      for (const shred of this.shreds) {
        if (shred.leg !== j) continue;
        const at = shred.node === 1 ? knee : hock;
        this.hang(shred, at[0] + shred.at[0], at[1] + shred.at[1], at[2] + shred.at[2], fwd, right, 0, seconds);
      }
    }

    // Neck.
    const root: V3 = [
      cx + f[0] * 0.41 * b.bodyLen - u[0] * 0.14 * b.bodyKeel,
      cy + f[1] * 0.41 * b.bodyLen - u[1] * 0.14 * b.bodyKeel,
      cz + f[2] * 0.41 * b.bodyLen - u[2] * 0.14 * b.bodyKeel,
    ];
    const fed = env.drift(aim.target[0], aim.target[1], seconds);
    const low: V3 = [fed[0], 0.36 * b.tendrilLen, fed[1]];
    const high: V3 = [
      root[0] + fwd[0] * aim.raised[0] + right[0] * aim.raised[2],
      Math.max(0.8 * b.tendrilLen, root[1] + aim.raised[1]),
      root[2] + fwd[2] * aim.raised[0] + right[2] * aim.raised[2],
    ];
    const tip: V3 = [lerp(high[0], low[0], aim.down), lerp(high[1], low[1], aim.down), lerp(high[2], low[2], aim.down)];
    const tuft = this.writeNeck(root, tip, aim.shape, fwd, seconds, aim.down);

    return { feet: feet.map((p) => ({ x: p.x, z: p.z, lift: p.lift })), body: { x: cx, z: cz, yaw: at.yaw }, tuft: { x: tuft[0], y: tuft[1], z: tuft[2] } };
  }

  private writeLeg(table: LegTable, nodes: V3[], fwd: V3, spread: number): void {
    const { skin } = this;
    const tube = table.tube;
    const dirs: V3[] = [];
    for (let n = 0; n < 4; n++) {
      const a = nodes[n] as V3;
      const c = nodes[n + 1] as V3;
      const l = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) || 1;
      dirs.push([(c[0] - a[0]) / l, (c[1] - a[1]) / l, (c[2] - a[2]) / l]);
    }
    for (let i = 0; i < tube.rings; i++) {
      let px: number;
      let py: number;
      let pz: number;
      let tx: number;
      let ty: number;
      let tz: number;
      const joint = table.joint[i] as number;
      const v = table.value[i] as number;
      if (joint >= 0) {
        // In the bend of a joint: a curve from one bone to the next, so the skin turns the corner without a step.
        const at = nodes[joint + 1] as V3;
        const a = dirs[joint] as V3;
        const c = dirs[joint + 1] as V3;
        const rr = this.fillet[joint] as number;
        const w0 = (1 - v) * (1 - v);
        const w2 = v * v;
        px = at[0] - a[0] * rr * w0 + c[0] * rr * w2;
        py = at[1] - a[1] * rr * w0 + c[1] * rr * w2;
        pz = at[2] - a[2] * rr * w0 + c[2] * rr * w2;
        tx = lerp(a[0], c[0], v);
        ty = lerp(a[1], c[1], v);
        tz = lerp(a[2], c[2], v);
      } else {
        const bone = table.bone[i] as number;
        const at = nodes[bone] as V3;
        const a = dirs[bone] as V3;
        px = at[0] + a[0] * v;
        py = at[1] + a[1] * v;
        pz = at[2] + a[2] * v;
        tx = a[0];
        ty = a[1];
        tz = a[2];
      }
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl;
      ty /= tl;
      tz /= tl;
      const dot = fwd[0] * tx + fwd[1] * ty + fwd[2] * tz;
      let nx = fwd[0] - tx * dot;
      let ny = fwd[1] - ty * dot;
      let nz = fwd[2] - tz * dot;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const bx = ty * nz - tz * ny;
      const by = tz * nx - tx * nz;
      const bz = tx * ny - ty * nx;
      const b0 = table.bow[i * 2] as number;
      const b1 = table.bow[i * 2 + 1] as number;
      skin.ring(tube, i, px + nx * b0 + bx * b1, py + ny * b0 + by * b1, pz + nz * b0 + bz * b1, nx, ny, nz, bx, by, bz, table.local, i * LEG_SIDES * 2, i >= table.pad ? spread : 1);
    }
    skin.normals(tube);
  }

  // The neck is a curve of fixed length from the shoulders to where the tuft is wanted. The slack is taken up by its shape:
  // it hangs under the chord when the tuft is down, and arches over it when the tuft is carried.
  private writeNeck(root: V3, tip: V3, shape: number, fwd: V3, seconds: number, down: number): V3 {
    const { b, skin } = this;
    const main = NECK_RINGS - 1 - NECK_END;
    const ds = b.neckLen / (NECK_RINGS - 1);
    const mainLen = ds * main;
    let gx = tip[0] - root[0];
    let gz = tip[2] - root[2];
    let gl = Math.hypot(gx, gz);
    if (gl < 0.3) {
      gx = fwd[0];
      gz = fwd[2];
      gl = 1;
    }
    gx /= gl;
    gz /= gl;
    const run = (tip[0] - root[0]) * gx + (tip[2] - root[2]) * gz;
    const rise = tip[1] - root[1];
    const c1 = -Math.cos(shape * Math.PI);
    const c2 = 0.8 * Math.sin(shape * Math.PI);
    const phi = (s: number): number => c1 * (1 - 2 * s) + c2 * Math.sin(2 * Math.PI * s);
    const hang = -1.42;
    // The last part of the neck turns to hang. Find where the main part must end for the tuft to arrive at the tip.
    let endRun = 0;
    let endRise = -ds * NECK_END * 0.8;
    let beta = 0;
    let base = 0;
    for (let pass = 0; pass < 3; pass++) {
      const mr = run - endRun;
      const my = rise - endRise;
      const chord = Math.min(0.985, Math.max(0.3, Math.hypot(mr, my) / mainLen));
      let lo = 0;
      let hi = 3;
      let sx = 1;
      let sy = 0;
      for (let it = 0; it < 24; it++) {
        beta = (lo + hi) / 2;
        sx = 0;
        sy = 0;
        for (let i = 0; i < main; i++) {
          const a = beta * phi((i + 0.5) / main);
          sx += Math.cos(a);
          sy += Math.sin(a);
        }
        sx /= main;
        sy /= main;
        if (Math.hypot(sx, sy) > chord) lo = beta;
        else hi = beta;
      }
      base = Math.atan2(my, mr) - Math.atan2(sy, sx);
      const last = base + beta * phi(1);
      endRun = 0;
      endRise = 0;
      for (let i = 0; i < NECK_END; i++) {
        const a = lerp(last, hang, smooth(0, 1, (i + 0.5) / NECK_END));
        endRun += Math.cos(a) * ds;
        endRise += Math.sin(a) * ds;
      }
    }
    const last = base + beta * phi(1);
    // Centres of the rings, with a slow wave across the plane of the neck that dies at both ends.
    const c = this.centres;
    const qx = -gz;
    const qz = gx;
    let h = 0;
    let y = 0;
    for (let i = 0; i < NECK_RINGS; i++) {
      if (i > 0) {
        const a = i <= main ? base + beta * phi((i - 0.5) / main) : lerp(last, hang, smooth(0, 1, (i - main - 0.5) / NECK_END));
        h += Math.cos(a) * ds;
        y += Math.sin(a) * ds;
      }
      const s = i / (NECK_RINGS - 1);
      const wave = b.k * (0.16 + 0.3 * (1 - down)) * Math.sin(Math.PI * Math.min(1, s * 1.15)) * Math.sin(seconds * 0.8 + b.seed * 5 - s * 3.2) * smooth(0, 0.25, s);
      c[i * 3] = root[0] + gx * h + qx * wave;
      c[i * 3 + 1] = root[1] + y;
      c[i * 3 + 2] = root[2] + gz * h + qz * wave;
    }
    let tx = 0;
    let ty = -1;
    let tz = 0;
    let nx = -qx;
    let ny = 0;
    let nz = -qz;
    let bx = 0;
    let by = 1;
    let bz = 0;
    for (let i = 0; i < NECK_RINGS; i++) {
      const a = Math.max(0, i - 1) * 3;
      const d = Math.min(NECK_RINGS - 1, i + 1) * 3;
      tx = (c[d] as number) - (c[a] as number);
      ty = (c[d + 1] as number) - (c[a + 1] as number);
      tz = (c[d + 2] as number) - (c[a + 2] as number);
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl;
      ty /= tl;
      tz /= tl;
      const dot = -qx * tx - qz * tz;
      nx = -qx - tx * dot;
      ny = -ty * dot;
      nz = -qz - tz * dot;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      bx = ty * nz - tz * ny;
      by = tz * nx - tx * nz;
      bz = tx * ny - ty * nx;
      skin.ring(this.neck, i, c[i * 3] as number, c[i * 3 + 1] as number, c[i * 3 + 2] as number, nx, ny, nz, bx, by, bz, this.neckLocal, i * NECK_SIDES * 2);
    }
    skin.normals(this.neck);

    // The tendrils start round the crown, hang, and lie outward on the crust where they reach it.
    const crown = (NECK_RINGS - 3) * 3;
    const ox = c[crown] as number;
    const oy = c[crown + 1] as number;
    const oz = c[crown + 2] as number;
    const rim = b.neckR * 0.3 + 0.05 * b.k;
    const roots = this.roots;
    this.tendrils.forEach((t, index) => {
      const ca = Math.cos(t.angle);
      const sa = Math.sin(t.angle);
      let ex = nx * ca + bx * sa;
      let ey = ny * ca + by * sa;
      let ez = nz * ca + bz * sa;
      let px = ox + ex * rim * t.out;
      let py = oy + ey * rim * t.out;
      let pz = oz + ez * rim * t.out;
      let dx = tx * 0.8 + ex * 0.9 * t.out;
      let dy = ty * 0.8 + ey * 0.9 * t.out;
      let dz = tz * 0.8 + ez * 0.9 * t.out;
      // Across the tendril, for the frame of its rings.
      let rx = ey * tz - ez * ty;
      let ry = ez * tx - ex * tz;
      let rz = ex * ty - ey * tx;
      if (t.parent >= 0) {
        // A fork leaves its root part of the way down and bears off to one side.
        const q = (t.parent * TENDRIL_RINGS + t.at) * 6;
        px = roots[q] as number;
        py = roots[q + 1] as number;
        pz = roots[q + 2] as number;
        ex += rx * t.turn * 1.3;
        ey += ry * t.turn * 1.3;
        ez += rz * t.turn * 1.3;
        const el = Math.hypot(ex, ey, ez) || 1;
        ex /= el;
        ey /= el;
        ez /= el;
        dx = (roots[q + 3] as number) + ex * 0.8;
        dy = (roots[q + 4] as number) + ey * 0.8;
        dz = (roots[q + 5] as number) + ez * 0.8;
      }
      const seg = t.length / (TENDRIL_RINGS - 1);
      const floor = (0.03 + 0.02 * Math.sin(t.phase * 3)) * b.k;
      for (let i = 0; i < TENDRIL_RINGS; i++) {
        const uu = i / (TENDRIL_RINGS - 1);
        if (i > 0) {
          const kink = 1.1 * (hash(index * 7 + i, b.seed + 13) - 0.5);
          const sway = 0.09 * Math.sin(seconds * 1.1 + t.phase + uu * 2.4) + 0.05 * Math.sin(seconds * 2.3 + t.phase * 2 + uu * 4) + kink;
          dx = dx * 0.72 + ex * (0.16 * t.out + sway * 0.4) + rx * sway;
          dy = dy * 0.72 - 0.34 - 0.3 * uu + ey * 0.1 * t.out;
          dz = dz * 0.72 + ez * (0.16 * t.out + sway * 0.4) + rz * sway;
          const dl = Math.hypot(dx, dy, dz) || 1;
          dx /= dl;
          dy /= dl;
          dz /= dl;
          if (py + dy * seg < floor) {
            // It has reached the crust: it lies along it, outward.
            dy = Math.max(-1, (floor - py) / seg);
            let hx = dx + ex * 0.6;
            let hz = dz + ez * 0.6;
            const hl = Math.hypot(hx, hz) || 1;
            const flat = Math.sqrt(Math.max(0, 1 - dy * dy));
            hx = (hx / hl) * flat;
            hz = (hz / hl) * flat;
            dx = hx;
            dz = hz;
          }
          px += dx * seg;
          py += dy * seg;
          pz += dz * seg;
        }
        if (t.parent < 0) {
          const q = (index * TENDRIL_RINGS + i) * 6;
          roots[q] = px;
          roots[q + 1] = py;
          roots[q + 2] = pz;
          roots[q + 3] = dx;
          roots[q + 4] = dy;
          roots[q + 5] = dz;
        }
        const dot = rx * dx + ry * dy + rz * dz;
        let ax = rx - dx * dot;
        let ay = ry - dy * dot;
        let az = rz - dz * dot;
        const al = Math.hypot(ax, ay, az) || 1;
        ax /= al;
        ay /= al;
        az /= al;
        const cx2 = dy * az - dz * ay;
        const cy2 = dz * ax - dx * az;
        const cz2 = dx * ay - dy * ax;
        skin.ring(t.tube, i, px, py, pz, ax, ay, az, cx2, cy2, cz2, t.local, i * TENDRIL_SIDES * 2);
        // The part of a root that lies on the crust: where the lake is open under it, the hide makes it glow.
        const heat = smooth(0.25, 0.85, uu) * smooth(0.45 * b.k, 0.1 * b.k, py);
        skin.setHeat(t.tube, i, heat);
      }
      skin.normals(t.tube);
    });
    return [c[(NECK_RINGS - 1) * 3] as number, c[(NECK_RINGS - 1) * 3 + 1] as number, c[(NECK_RINGS - 1) * 3 + 2] as number];
  }
}
