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
  /** Part of the leg's length that is above the knee. */
  knee: number;
  /** Part of the rest that is above the ankle joint. */
  hock: number;
  /** What a leg has to spare at its farthest reach, as a part of its length: the more, the more it bows at rest. */
  slack: number;
  stanceFore: number;
  /** How far the pads of one side stand ahead of those of the other, metres: no animal stands square. */
  lean: number;
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
  /** Seconds between steps for one that stands: each pad in its turn is put down a good step off. 0: none. */
  fidget: number;
  /** Seconds by which the steps of one that stands are set off. */
  lag: number;
  /** One that walks and rests re-places a fore pad in a long rest: when pad `j`, standing for the `n`th time, starts to lift, or -1. */
  halfStep(j: number, n: number): number;
  /** Its own slow thing: seconds for one sway of body and neck, and where in it the animal is at time zero. */
  habit: { period: number; phase: number };
  /** Seconds between digs of the tuft in the pool. 0: none. */
  dig: number;
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

/** What sways does so in a whole number of cycles every eight seconds. */
const LOOP = Math.PI / 4;
/** Seconds a pad is in the air when one that stands re-places it. */
const STEP = 1.6;
/** Crumbs a pad drops in one swing. */
const GRIT = 12;
const BODY_RINGS = 96;
const BODY_SIDES = 32;
const NECK_RINGS = 46;
const NECK_SIDES = 12;
const NECK_END = 7;
const LEG_SIDES = 12;
/** How high over the lake the end of the neck is held when the tuft is down, in lengths of a root. */
export const TUFT_UP = 0.85;
const TENDRIL_RINGS = 11;
const TENDRIL_SIDES = 6;
const RAG_RINGS = 7;
const RAG_SIDES = 4;
const SINEW_RINGS = 7;
const SINEW_SIDES = 5;

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
  /** Strands of sinew that stand off a shaft, from knuckle to knuckle. */
  sinews: { tube: Tube; local: Float32Array; bone: number; from: number; to: number; off: number; angle: number }[];
}

export class Animal {
  private readonly body: Tube;
  private readonly bodyLocal: Float32Array;
  private readonly neck: Tube;
  private readonly neckLocal: Float32Array;
  private readonly legs: LegTable[] = [];
  private readonly tendrils: { tube: Tube; local: Float32Array; angle: number; out: number; length: number; phase: number; parent: number; at: number; turn: number }[] = [];
  private readonly rags: Rag[] = [];
  private readonly grit: { tube: Tube; local: Float32Array; leg: number; when: number; ox: number; oz: number; size: number }[] = [];
  private readonly shreds: (Rag & { leg: number; node: number })[] = [];
  private readonly roots: Float32Array;
  private readonly ankle: number;
  private readonly fillet: [number, number, number];
  private femur = 0;
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
    this.ankle = 0.6 * k;
    this.fillet = [0.34 * k, 0.3 * k, 0.13 * k];

    // The body: a keeled sack, deepest behind the shoulders, with the hips and the shoulder blades standing out of it.
    this.body = skin.tube(BODY_RINGS, BODY_SIDES);
    this.bodyLocal = new Float32Array(BODY_RINGS * BODY_SIDES * 3);
    // Where along it the hips and the shoulders stand.
    const tHip = 0.5 - b.hipFore / b.bodyLen;
    const tShoulder = 0.5 + b.hipFore / b.bodyLen;
    for (let i = 0; i < BODY_RINGS; i++) {
      const t = 0.5 - 0.5 * Math.cos((Math.PI * i) / (BODY_RINGS - 1));
      const e = Math.pow(Math.max(0, 4 * t * (1 - t)), 0.3);
      const x = (t - 0.5) * b.bodyLen;
      // It hangs between the shoulders and the hips: the back sags between them, the belly hangs lowest a little ahead of the middle.
      const sag = gauss((t - 0.5) / 0.2);
      const top = b.bodyTop * e * (1 + 0.14 * sag + 0.3 * b.hump * gauss((t - tShoulder) / 0.13) + 0.1 * gauss((t - tHip) / 0.12));
      const keel = b.bodyKeel * e * (0.72 + 0.34 * gauss((t - 0.56) / 0.22));
      const wide = b.bodyWide * e * (1 + 0.14 * gauss((t - tHip) / 0.1) + 0.2 * gauss((t - tShoulder) / 0.1) - 0.14 * sag);
      for (let j = 0; j < BODY_SIDES; j++) {
        // The skin is sewn along the keel, where its seam is out of sight.
        const a = (j / BODY_SIDES - 0.25) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        // A shrunken mass of dried flesh: lumps at three sizes and no pattern to them.
        let m = 1 + 0.42 * (wrap(t * 3.2, a, 3, seed) - 0.5) + 0.4 * (wrap(t * 6.5, a, 6, seed + 1) - 0.5) + 0.22 * (wrap(t * 12, a, 11, seed + 2) - 0.5) + 0.2 * (wrap(t * 23, a, 19, seed + 7) - 0.5);
        // It has shrivelled: creases where the hide has drawn in, each a narrow valley that wanders.
        const fromTop = Math.acos(Math.max(-1, Math.min(1, s)));
        const fold1 = Math.pow(1 - Math.abs(2 * wrap(t * 5 + 0.5 * Math.sin(a * 2 + seed), a, 5, seed + 4) - 1), 4);
        const fold2 = Math.pow(1 - Math.abs(2 * wrap(t * 11, a, 9, seed + 5) - 1), 4);
        m -= 0.15 * fold1 + 0.06 * fold2;
        // The flank has fallen in under the spine between the shoulder and the hip.
        m -= 0.13 * gauss((fromTop - 1.05) / 0.4) * sag;
        // What hangs under the belly is ragged.
        m += 0.3 * smooth(-0.55, -1, s) * (wrap(t * 9, a, 4, seed + 3) - 0.35);
        // The shoulders and the points of the hips, high on each side: the legs leave the body there.
        const up = Math.max(0, s);
        const blade = gauss((Math.abs(c) - 0.9) / 0.26) * smooth(-0.15, 0.35, s);
        m += 0.36 * blade * gauss((t - tShoulder) / 0.09) + 0.32 * blade * gauss((t - tHip) / 0.09);
        // The top outline is broken: a few big lumps along the back, none where another is.
        m += 0.34 * up * (lump(t * 4.3, 0.5, seed + 9) - 0.3) * smooth(0.05, 0.2, t) * smooth(0.97, 0.82, t);
        // The spine: a low uneven ridge.
        m += 0.13 * gauss(fromTop / 0.2) * (0.2 + 1.6 * lump(t * 13, 0.5, seed + 6)) * smooth(0.04, 0.2, t) * smooth(0.97, 0.85, t);
        const pinch = s < 0 ? 1 - 0.55 * s * s : 1;
        const o = (i * BODY_SIDES + j) * 3;
        this.bodyLocal[o] = x;
        this.bodyLocal[o + 1] = s * (s > 0 ? top : keel) * m;
        this.bodyLocal[o + 2] = c * wide * pinch * m;
        const under = smooth(0.2, -0.9, s);
        const socket = Math.max(gauss((t - tShoulder) / 0.12), gauss((t - tHip) / 0.12)) * smooth(0.5, -0.2, s);
        skin.describe(this.body, i, j, x, (j / BODY_SIDES) * 5.6 * k, 0.5 - 0.3 * under - 0.12 * socket + 0.1 * blade, (1 - 0.35 * under - 0.3 * socket) * (1 - 0.5 * fold1 - 0.25 * fold2), Math.max(top, wide) * e, seed, 0, 1 - e);
      }
      skin.describe(this.body, i, BODY_SIDES, x, 5.6 * k, 0.5, 1, Math.max(top, wide) * e, seed, 0, 1 - e);
    }

    // Rags of dead skin that hang from the keel and the flanks, and shreds of it at the knees and the hocks.
    const rags = 16 + Math.floor(hash(seed, 21) * 8);
    for (let n = 0; n < rags; n++) {
      // Two in three hang under the keel; the rest are torn loose at the shoulders and the hips.
      const joint = n % 3 === 2;
      const along = joint ? (hash(n, seed + 22) < 0.5 ? 0.32 : 0.68) + 0.08 * (hash(n, seed + 29) - 0.5) : lerp(0.2, 0.82, hash(n, seed + 22));
      const round = joint ? (hash(n, seed + 23) < 0.5 ? 0.2 : 0.8) + 0.06 * (hash(n, seed + 30) - 0.5) : 1 + lerp(-0.14, 0.14, hash(n, seed + 23));
      const i = Math.floor(along * (BODY_RINGS - 1));
      const j = Math.floor((round % 1) * BODY_SIDES) % BODY_SIDES;
      const q = (i * BODY_SIDES + j) * 3;
      // Strings and flat torn strips, 0.3 to 1.8 m.
      const strip = hash(n, seed + 25);
      const rag = this.rag(n, (0.3 + 1.25 * Math.pow(hash(n, seed + 24), 1.6)) * k, (strip < 0.3 ? 0.02 + 0.04 * strip : 0.06 + 0.16 * Math.pow(strip - 0.3, 1.2)) * k);
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
      // It thickens again over its last quarter, to the crown the roots splay from.
      // As thick as a thigh where it leaves the body, and thinner all the way down; a small crown where the roots start.
      let r = b.neckR * (0.25 + 0.75 * Math.pow(1 - s, 2.1)) * (1 + 0.25 * gauss(s / 0.08)) + 0.1 * k * smooth(0.74, 0.95, s);
      // A few uneven swellings along its lower half, no two necks alike.
      for (let n = 0; n < 4; n++) {
        const at = 0.46 + 0.5 * ((n + 0.15 + 0.7 * hash(n, seed + 61)) / 4);
        r *= 1 + (0.1 + 0.16 * hash(n, seed + 62)) * gauss((s - at) / (0.018 + 0.022 * hash(n, seed + 63)));
      }
      if (i >= NECK_RINGS - 2) r *= i === NECK_RINGS - 1 ? 0.05 : 0.7;
      // It starts inside the shoulders, closed.
      if (i === 0) r *= 0.3;
      for (let j = 0; j < NECK_SIDES; j++) {
        const a = (j / NECK_SIDES) * Math.PI * 2;
        // Ribbed lengthwise, like sinew.
        const m = 1 + 0.16 * (wrap(s * 16, a, 4, seed + 3) - 0.5) + 0.05 * Math.cos(a * 2 + s * 5) + 0.1 * Math.cos(a * 6 + s * 2.5 + seed);
        this.neckLocal[(i * NECK_SIDES + j) * 2] = Math.cos(a) * r * m;
        this.neckLocal[(i * NECK_SIDES + j) * 2 + 1] = Math.sin(a) * r * m * (1 - 0.12 * (1 - s));
      }
      for (let j = 0; j <= NECK_SIDES; j++) {
        const under = smooth(0.1, -0.8, Math.sin((j / NECK_SIDES) * Math.PI * 2));
        skin.describe(this.neck, i, j, s * b.neckLen, (j / NECK_SIDES) * Math.PI * 2 * Math.max(r, 0.16 * k), lerp(0.32, 0.5, smooth(0, 0.2, s)) + 0.45 * Math.pow(s, 2.4) - 0.1 * under, lerp(0.35, 1, smooth(0, 0.14, s)), r, seed, 1, s);
      }
    }

    // The legs.
    // Cut to the stance of the build. The body is then carried as high as its straightest leg lets it (see the pose),
    // so a standing leg is close to one line whatever the pads do.
    const whole = Math.hypot(b.stanceFore - b.hipFore, b.standH + b.hipUp - this.ankle, b.stanceSide - b.hipSide) * (1 + b.slack);
    this.femur = whole * b.knee;
    this.tibia = (whole - this.femur) * b.hock;
    this.meta = whole - this.femur - this.tibia;
    for (let j = 0; j < 4; j++) this.legs.push(this.legTable(j));

    // Grit: crumbs of crust that a pad takes up with it and drops as it swings.
    for (let j = 0; j < 4; j++) {
      for (let n = 0; n < GRIT; n++) {
        const tube = skin.tube(3, 3);
        const local = new Float32Array(3 * 3 * 2);
        const size = (0.05 + 0.08 * hash(n, seed + j * 5 + 70)) * Math.sqrt(k);
        for (let r = 0; r < 3; r++) {
          for (let side = 0; side < 3; side++) {
            const a = (side / 3) * Math.PI * 2 + n;
            const w = r === 1 ? size * (0.7 + 0.6 * hash(n * 3 + side, seed + 71)) : 0.012;
            local[(r * 3 + side) * 2] = Math.cos(a) * w;
            local[(r * 3 + side) * 2 + 1] = Math.sin(a) * w;
          }
          for (let side = 0; side <= 3; side++) skin.describe(tube, r, side, r * size + n, side * size, 0.3, 0.55, size, seed, 4, 0);
        }
        const turn = hash(n, seed + j * 7 + 72) * 6.283;
        const far = b.padR * Math.sqrt(hash(n, seed + j * 7 + 73));
        this.grit.push({ tube, local, leg: j, when: 0.03 + 0.6 * hash(n, seed + j * 3 + 74), ox: Math.cos(turn) * far, oz: Math.sin(turn) * far, size });
      }
    }

    // The tendrils: pale roots that start round the crown, and some that fork from those.
    const mains = b.tendrils;
    const forks = Math.round(mains * 1.0);
    for (let i = 0; i < mains + forks; i++) {
      const fork = i >= mains;
      const parent = fork ? Math.floor(((i - mains) * mains) / forks) : -1;
      const tube = skin.tube(TENDRIL_RINGS, TENDRIL_SIDES);
      const local = new Float32Array(TENDRIL_RINGS * TENDRIL_SIDES * 2);
      const inner = !fork && i % 3 === 2;
      const at = fork ? 3 + Math.floor(hash(i, seed + 6) * 4) : 0;
      // A brush of roots of every length: some reach the melt, some hang short of it.
      const whole = b.tendrilLen * (0.9 + 0.55 * hash(fork ? parent : i, seed + 2)) * (!fork && i % 4 === 3 ? 0.7 : 1);
      const length = fork ? whole * (1 - at / (TENDRIL_RINGS - 1)) * (0.7 + 0.5 * hash(i, seed + 7)) : whole;
      const thick = (0.1 + 0.06 * hash(fork ? parent : i, seed + 1)) * k * (fork ? 0.62 * (1 - (0.6 * at) / (TENDRIL_RINGS - 1)) : 1);
      for (let r = 0; r < TENDRIL_RINGS; r++) {
        const u = r / (TENDRIL_RINGS - 1);
        // Round and fibrous: thick where it leaves the crown, a thread at its end, knotted on the way.
        const rad = r === TENDRIL_RINGS - 1 ? 0.008 * k : thick * (1 - 0.72 * Math.pow(u, 1.3)) * (1 + 0.3 * (hash(i * 3 + r, seed + 9) - 0.4));
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
        out: inner ? 0.35 : 0.7 + 0.6 * hash(i, seed + 8),
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
      // Now and then a shiver runs through the rags.
      const shiver = Math.pow(Math.max(0, Math.sin(seconds * this.om * 0.5 + rag.phase * 0.2)), 12);
      const swing = uu * (0.2 * Math.sin(seconds * LOOP * 2 + rag.phase - uu * 1.5) + 0.08 * Math.sin(seconds * LOOP * 4 + rag.phase * 2) + 0.16 * shiver * Math.sin(seconds * 11 + rag.phase * 3 - uu * 4) + lean) + 0.3 * Math.sin(rag.phase * 5) * uu + 0.5 * (hash(i, rag.phase) - 0.5);
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

  // Three straight bones from the hip to the ankle: a long one to the knee, half way down, one to the ankle joint just above the foot,
  // a short one to the foot. What the leg has to spare it takes up as a bow, both joints bent the same way and the knee the more:
  // a stilt that gives a little, never a Z.
  private bones(hip: V3, ankle: V3, out: V3): [V3, V3, V3] {
    let ex = ankle[0] - hip[0];
    let ey = ankle[1] - hip[1];
    let ez = ankle[2] - hip[2];
    const far = Math.hypot(ex, ey, ez) || 1;
    ex /= far;
    ey /= far;
    ez /= far;
    const l0 = this.femur;
    const l1 = this.tibia;
    const l2 = this.meta;
    const d = Math.min(far, (l0 + l1 + l2) * 0.9992);
    const along = out[0] * ex + out[1] * ey + out[2] * ez;
    let qx = out[0] - ex * along;
    let qy = out[1] - ey * along;
    let qz = out[2] - ez * along;
    const ql = Math.hypot(qx, qy, qz) || 1;
    qx /= ql;
    qy /= ql;
    qz /= ql;
    let lo = 0;
    let hi = 1.3;
    let bend = 0;
    let first = 0;
    for (let it = 0; it < 22; it++) {
      bend = (lo + hi) / 2;
      first = Math.atan2(l1 * Math.sin(bend) + l2 * Math.sin(1.6 * bend), l0 + l1 * Math.cos(bend) + l2 * Math.cos(1.6 * bend));
      const reach = l0 * Math.cos(first) + l1 * Math.cos(first - bend) + l2 * Math.cos(first - 1.6 * bend);
      if (reach > d) lo = bend;
      else hi = bend;
    }
    const node = (from: V3, length: number, angle: number): V3 => {
      const ca = Math.cos(angle) * length;
      const sa = Math.sin(angle) * length;
      return [from[0] + ex * ca + qx * sa, from[1] + ey * ca + qy * sa, from[2] + ez * ca + qz * sa];
    };
    const knee = node(hip, l0, first);
    const hock = node(knee, l1, first - bend);
    const end = node(hock, l2, first - 1.6 * bend);
    return [knee, hock, end];
  }

  private legTable(j: number): LegTable {
    const b = this.b;
    const k = b.k;
    const seed = b.seed + j * 3.7;
    const S1 = this.femur;
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
      for (const d of [-3.4, -2.3, -1.5, -1, -0.6, -0.2, 0.2, 0.6, 1, 1.5, 2.3, 3.4]) push(s + d * f);
    });
    for (const d of [-0.5, -0.25]) push(S3 + d * k);
    marks.sort((x, y) => x - y);
    const along: number[] = [];
    for (const s of marks) if (along.length === 0 || s - (along[along.length - 1] as number) > 0.07 * k) along.push(s);
    // The pad: height above its sole and radius, in units of the pad's radius; the last rings close the sole.
    // A flat plate, thin at its rim, with the ankle standing in the middle of it: not a stand that widens all the way down.
    const PAD: [number, number][] = [
      [1, 0.2],
      [0.8, 0.23],
      [0.62, 0.29],
      [0.47, 0.38],
      [0.35, 0.51],
      [0.25, 0.67],
      [0.17, 0.83],
      [0.11, 0.95],
      [0.06, 1],
      [0.02, 0.97],
      [0, 0.78],
      [0, 0.02],
    ];
    const pad = along.length;
    const rings = pad + PAD.length;
    const tube = this.skin.tube(rings, LEG_SIDES);
    const table: LegTable = { tube, bone: new Int8Array(rings), joint: new Int8Array(rings).fill(-1), value: new Float32Array(rings), local: new Float32Array(rings * LEG_SIDES * 2), pad, bow: new Float32Array(rings * 2), sinews: [] };
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
      // A thigh twice as thick as the shin all the way to the knee, thickest where it leaves the shoulder.
      if (s < S1) r = lerp(0.36, 0.215, smooth(0, 0.4, s / S1)) - 0.05 * smooth(0.4, 1, s / S1);
      else if (s < S2) r = lerp(0.095, 0.082, (s - S1) / this.tibia);
      else r = lerp(0.08, 0.074, Math.min(1, (s - S2) / this.meta));
      // A bone widens toward its end before the knuckle itself.
      const head = (d: number, w: number): number => 0.5 * gauss(d / (w * k)) + 0.5 * Math.exp(-Math.abs(d) / (2.2 * w * k));
      r += 0.105 * head(s - S1, 0.34) + 0.1 * head(s - S2, 0.24) + 0.05 * head(s - S3, 0.16);
      r *= k * b.legR;
      // No bone is straight: each bows a little between its joints.
      const lens = [S1, this.tibia, this.meta];
      for (let n = 0; n < 3; n++) {
        const u = (s - (starts[n] as number)) / (lens[n] as number);
        if (u > 0 && u < 1) {
          const arc = Math.pow(Math.sin(Math.PI * u), 1.5) * (lens[n] as number);
          table.bow[i * 2] = arc * 0.022 * (hash(seed, 30 + n) - 0.5);
          table.bow[i * 2 + 1] = arc * 0.022 * (hash(seed, 40 + n) - 0.5);
        }
      }
      const knob = Math.max(gauss((s - S1) / (0.42 * k)), gauss((s - S2) / (0.3 * k)), gauss((s - S3) / (0.2 * k)));
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
        // The pad is round, more or less: its rim is ragged, broken off here and caked there, and no two are the same.
        const toes = 0.8 + 0.36 * hash(n + j * 13, seed + 60) + 0.1 * Math.cos(2 * a + p2) - (hash(n * 3 + j, seed + 61) < 0.16 ? 0.22 : 0);
        // A shaft is flat and twists as it goes down; a knuckle is round, with two heads to it.
        const shaft = (1 - shape) * (1 - knob) * smooth(0, 0.8 * k, s);
        const heads = 1 + knob * (1 - shape) * (0.2 * Math.cos(2 * a + p2) + 0.1 * Math.cos(3 * a + p1));
        const m = lerp(tendon, toes, shape) * heads;
        const lx = Math.cos(a) * r * m * lerp(1, 1.2, shaft);
        const ly = Math.sin(a) * r * m * lerp(1, 0.78, shaft);
        const twist = (p1 + (0.34 * s) / k) * (1 - shape);
        table.local[(i * LEG_SIDES + n) * 2] = lx * Math.cos(twist) - ly * Math.sin(twist);
        table.local[(i * LEG_SIDES + n) * 2 + 1] = lx * Math.sin(twist) + ly * Math.cos(twist);
      }
      for (let n = 0; n <= LEG_SIDES; n++) {
        const sole = inPad && (PAD[i - pad] as [number, number])[0] <= 0.02 ? 0.6 : 1;
        this.skin.describe(tube, i, n, s + j * 1.3, (n / LEG_SIDES) * Math.PI * 2 * Math.max(r, 0.14 * k), (inPad ? 0.38 : lerp(0.36, 0.52, smooth(0, 1.5 * k, s)) - 0.26 * knob + 0.1 * shape), sole * lerp(0.4, 1, smooth(0, 1.1 * k, s)), r, b.seed, inPad ? 4 : 3, knob);
      }
    }
    // Sinew behind the two shafts below the knee: a strand from knuckle to knuckle that stands off the bone between them.
    [this.tibia, this.meta].forEach((length, n) => {
      const tube = this.skin.tube(SINEW_RINGS, SINEW_SIDES);
      const local = new Float32Array(SINEW_RINGS * SINEW_SIDES * 2);
      const thick = (0.02 + 0.012 * hash(seed, 50 + n)) * k;
      for (let i = 0; i < SINEW_RINGS; i++) {
        const u = i / (SINEW_RINGS - 1);
        const w = thick * (1 + 1.1 * Math.pow(Math.abs(2 * u - 1), 3));
        for (let side = 0; side < SINEW_SIDES; side++) {
          const a = (side / SINEW_SIDES) * Math.PI * 2;
          local[(i * SINEW_SIDES + side) * 2] = Math.cos(a) * w;
          local[(i * SINEW_SIDES + side) * 2 + 1] = Math.sin(a) * w * 1.5;
        }
        for (let side = 0; side <= SINEW_SIDES; side++) this.skin.describe(tube, i, side, u * length + j, (side / SINEW_SIDES) * 6.28 * 0.14 * k, 0.6, 0.85, w, b.seed, 3, 0);
      }
      table.sinews.push({ tube, local, bone: n + 1, from: 0.06 * length, to: 0.95 * length, off: (n === 0 ? 0.15 : 0.13) * k * b.legR, angle: Math.PI + (hash(seed, 52 + n) - 0.5) * 0.9 });
    });
    return table;
  }

  /** The pads of the gait: where pad `j` stands for the `n`th time, on the crust at the reference time. */
  private plant(j: number, n: number, shift: number, out = 0): [number, number] {
    const leg = LEGS[j] as (typeof LEGS)[number];
    const b = this.b;
    const at = this.plan.body(n - leg.offset + DUTY * 0.5);
    const fx = Math.sin(at.yaw);
    const fz = -Math.cos(at.yaw);
    const h1 = hash(j * 7.1 + n * 3.3 + shift * 1.7, b.seed) - 0.5;
    const h2 = hash(j * 2.9 + n * 5.7 + shift * 4.1, b.seed + 1) - 0.5;
    const jitter = shift === 0 ? 0.5 : 0.9;
    let fore = leg.fore * b.stanceFore + leg.side * b.lean * (leg.fore < 0 ? 1 : 0.45) + h1 * jitter * b.k;
    let side = leg.side * b.stanceSide + h2 * jitter * b.k;
    const size = Math.min(b.k, 1.25);
    if (shift !== 0) {
      // One that stands puts a pad down a good step from where it left: round its place, more than a third of a turn on each time.
      const turn = shift * 2.4 + hash(j, b.seed + 6) * 6.283;
      const far = size * (0.72 + 0.24 * hash(shift, j + b.seed));
      fore = leg.fore * b.stanceFore + leg.side * b.lean * (leg.fore < 0 ? 1 : 0.45) + Math.cos(turn) * far;
      side = leg.side * b.stanceSide + Math.sin(turn) * far * 0.85;
    }
    if (out > 0) {
      // A fore pad re-placed in a rest goes forward and outward.
      const turn = (hash(n, j + b.seed + 2) - 0.5) * 1.6;
      const far = size * (1.3 + 0.35 * hash(n, j + b.seed + 3));
      fore += Math.cos(turn) * far * 0.8;
      side += leg.side * (0.2 + 0.6 * Math.abs(Math.sin(turn))) * far * 0.75;
    }
    let x = at.x + fx * fore - fz * side;
    let z = at.z + fz * fore + fx * side;
    // No pad goes down in open lava: one that would is put down beside the seam.
    const near = this.env.seam(x, z);
    const clear = b.padR * 1.35 + 1.3;
    if (near.d < clear) {
      const l = near.d > 1e-3 ? near.d : 1;
      const ox = near.d > 1e-3 ? (x - near.x) / l : fx;
      const oz = near.d > 1e-3 ? (z - near.z) / l : fz;
      x = near.x + ox * clear;
      z = near.z + oz * clear;
    }
    return [x, z];
  }

  private om = 1;
  private gulp = -1;

  pose(seconds: number): Stood {
    const { b, plan, env, skin } = this;
    const k = b.k;
    const sg = plan.sigma(seconds);
    const at = plan.body(sg);
    const aim = plan.neck(seconds);

    // The pads.
    const feet: { x: number; z: number; lift: number; pitch: number; unload: number; land: number; fx: number; fz: number; w: number; from: [number, number]; to: [number, number]; high: number; dur: number }[] = [];
    const rate = (plan.sigma(seconds + 0.05) - plan.sigma(seconds - 0.05)) / 0.1;
    let shiftSide = 0;
    let shiftFore = 0;
    let dip = 0;
    let lean = 0;
    let followX = 0;
    let followZ = 0;
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
        const beat = (seconds + plan.lag) / (plan.fidget * 4) + leg.offset;
        event = Math.floor(beat);
        const ff = beat - event;
        const win = STEP / (plan.fidget * 4);
        w = ff > 1 - win ? (ff - (1 - win)) / win : -1;
        unload = ff < 0.5 * win ? 1 - smooth(-0.3 * win, 0.5 * win, ff) : smooth(1 - 1.45 * win, 1 - win, ff) * (1 - smooth(1 - 0.3 * win, 1 + 0.5 * win, ff));
        land = ff < 0.45 * win ? Math.pow(Math.sin((Math.PI * ff) / (0.45 * win)), 2) : 0;
        high = b.stepH * (0.45 + 0.4 * hash(event, j + b.seed));
      }
      // One that walks and rests re-places a fore pad once in a long rest, and walks on from where it put it.
      const walking = w >= 0;
      const half = plan.fidget > 0 || walking ? -1 : plan.halfStep(j, n);
      const since = half < 0 ? -1 : (seconds - half) / STEP;
      if (half >= 0 && w < 0) {
        if (since >= 0 && since < 1) w = since;
        unload = 1 - (1 - unload) * (1 - smooth(-0.45, 0, since) * (1 - smooth(0.7, 1.5, since)));
        if (since >= 1 && since < 1.45) land = Math.pow(Math.sin((Math.PI * (since - 1)) / 0.45), 2);
        high = b.stepH * 0.6;
      }
      const stepsOut = half >= 0 && since >= 0 && since < 1;
      const placed = plan.fidget > 0 ? -1 : walking ? plan.halfStep(j, n) : half;
      const from = plan.fidget > 0 ? this.plant(j, Math.floor(sg), event + 101) : this.plant(j, n, 0, placed >= 0 && seconds >= placed + STEP ? 1 : 0);
      let px = from[0];
      let pz = from[1];
      let lift = 0;
      let pitch = 0;
      let fx = Math.sin(at.yaw);
      let fz = -Math.cos(at.yaw);
      let goes = from;
      if (w >= 0) {
        const to = plan.fidget > 0 ? this.plant(j, Math.floor(sg), event + 102) : stepsOut ? this.plant(j, n, 0, 1) : this.plant(j, n + 1, 0);
        // The heel peels first, the pad swings low and is put down toe first.
        const e = smooth(0.05, 0.96, w);
        const e2 = e * e * (3 - 2 * e) * 0.25 + e * 0.75;
        goes = to;
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
      const world = env.drift(px, pz, seconds);
      feet.push({ x: world[0], z: world[1], lift, pitch, unload, land, fx, fz, w, from, to: goes, high, dur: plan.fidget > 0 || stepsOut ? STEP : (1 - DUTY) / Math.max(rate, 0.02) });
      shiftSide -= leg.side * unload;
      shiftFore -= leg.fore * unload;
      dip += land;
      lean = 1 - (1 - lean) * (1 - unload);
      if (plan.fidget > 0) {
        // The body of one that stands follows its pads: it rides over the middle of the four.
        const home = this.plant(j, Math.floor(sg), 0);
        followX += (px - home[0]) / 4;
        followZ += (pz - home[1]) / 4;
      }
    }

    // The body rides over the pads that carry it: it leans off a pad before the pad lifts and settles as the pad takes weight again.
    const centre = env.drift(at.x + followX, at.z + followZ, seconds);
    // Its own slow thing: it sways over its pads and looks round, in its own time.
    const om = (2 * Math.PI) / plan.habit.period;
    const turn = om * seconds + plan.habit.phase * 6.283;
    const idle = Math.sin(turn);
    const idle2 = Math.sin(turn * 0.62 + b.seed * 4);
    const look = 0.055 * Math.sin(turn + 1.9) + 0.03 * idle2;
    const fwd: V3 = [Math.sin(at.yaw + look), 0, -Math.cos(at.yaw + look)];
    const right: V3 = [-fwd[2], 0, fwd[0]];
    // The tuft works in the pool: it is lifted a little, set down beside where it was and pushed in, and the animal pulls back on it.
    let digX = 0;
    let digZ = 0;
    let digY = 0;
    let pull = 0;
    let gulp = -1;
    if (plan.dig > 0 && aim.down > 0.5) {
      const much = smooth(0.5, 0.95, aim.down);
      const beat = seconds / plan.dig + b.seed;
      const e = Math.floor(beat);
      const ff = beat - e;
      const move = smooth(0, 0.34, ff);
      const a0 = e * 2.4 + b.seed;
      const a1 = a0 + 2.4;
      const r0 = 0.5 * k * (0.5 + 0.5 * hash(e, b.seed + 21));
      const r1 = 0.5 * k * (0.5 + 0.5 * hash(e + 1, b.seed + 21));
      digX = much * lerp(Math.cos(a0) * r0, Math.cos(a1) * r1, move);
      digZ = much * lerp(Math.sin(a0) * r0, Math.sin(a1) * r1, move);
      digY = much * k * (0.45 * Math.sin(Math.PI * move) - 0.2 * smooth(0.34, 0.5, ff) * (1 - smooth(0.82, 1, ff)));
      pull = much * smooth(0.45, 0.7, ff) * (1 - smooth(0.8, 1, ff));
      gulp = ff;
    }
    const sideways = shiftSide * 0.4 * k + 0.2 * k * idle2;
    const forwards = shiftFore * 0.25 * k + 0.2 * k * idle - 0.5 * k * aim.down * (plan.dip > 0 ? 1 : 0.3) - 0.28 * k * pull;
    const cx = centre[0] + right[0] * sideways + fwd[0] * forwards;
    const cz = centre[1] + right[2] * sideways + fwd[2] * forwards;
    const pitch = -0.1 * aim.down - 0.035 * shiftFore + 0.02 * idle2 + 0.025 * pull;
    const roll = 0.06 * shiftSide + 0.018 * idle;
    // The body stands on stilts: it rides as high as the leg that is most stretched lets it, and sinks when a pad goes out far.
    // A soft least of the four, so that it does not jerk when another leg becomes the one that holds it down.
    const span = (this.femur + this.tibia + this.meta) * 0.992;
    let soft = 0;
    let least = 1e9;
    const tops: number[] = [];
    for (let j = 0; j < 4; j++) {
      const leg = LEGS[j] as (typeof LEGS)[number];
      const foot = feet[j] as (typeof feet)[number];
      const hx = cx + fwd[0] * leg.fore * b.hipFore + right[0] * leg.side * b.hipSide;
      const hz = cz + fwd[2] * leg.fore * b.hipFore + right[2] * leg.side * b.hipSide;
      const flat = Math.hypot(hx - foot.x, hz - foot.z);
      // Height of the body's centre at which this leg is straight.
      const top = Math.sqrt(Math.max(1, span * span - flat * flat)) + this.ankle + foot.lift - b.hipUp - leg.fore * b.hipFore * Math.sin(pitch) - leg.side * b.hipSide * Math.sin(roll);
      tops.push(top);
      least = Math.min(least, top);
    }
    for (const top of tops) soft += Math.exp(-(top - least) / (0.12 * k));
    const ride = least - 0.12 * k * Math.log(soft);
    const cy = ride - 0.15 * k * dip - 0.09 * k * lean - plan.dip * aim.down - 0.05 * k * (1 - Math.sin(turn + 0.9));
    this.om = om;
    this.gulp = gulp;
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
      // A pad that carries weight is pressed into the crust; it comes up out of it as the weight goes off it.
      const sole: V3 = [foot.x, -0.025 * k * (1 - foot.unload) * (1 - smooth(0, 0.1 * k, foot.lift)) + foot.lift + b.padR * sq * 0.95, foot.z];
      const ankle: V3 = [sole[0] + axis[0] * this.ankle, sole[1] + axis[1] * this.ankle, sole[2] + axis[2] * this.ankle];
      // The leg bows out and away from the body, each leg a little its own way; a lifted one bends forward at the knee.
      const turnOut = 0.5 + 0.6 * hash(j, b.seed + 44);
      const lifted = smooth(0, 0.5 * k, foot.lift);
      const out: V3 = [
        right[0] * leg.side * 0.8 + fwd[0] * (leg.fore * turnOut + 1.4 * lifted),
        0.12,
        right[2] * leg.side * 0.8 + fwd[2] * (leg.fore * turnOut + 1.4 * lifted),
      ];
      const [knee, hock, end] = this.bones(hip, ankle, out);
      // If the leg is at full stretch the ankle is where the bones put it, and the pad with it.
      const base: V3 = [end[0] - axis[0] * this.ankle, end[1] - axis[1] * this.ankle, end[2] - axis[2] * this.ankle];
      this.writeLeg(table, [hip, knee, hock, end, base], fwd, 1 - 0.07 * smooth(0, 0.2 * k, foot.lift));
      // Grit leaves the pad as it swings and falls to the crust.
      for (const g of this.grit) {
        if (g.leg !== j) continue;
        let gx = foot.x;
        let gy = 0;
        let gz = foot.z;
        let big = 0;
        if (foot.w > g.when) {
          const e = smooth(0.05, 0.96, g.when);
          const e2 = e * e * (3 - 2 * e) * 0.25 + e * 0.75;
          const fell = (foot.w - g.when) * foot.dur;
          const y = foot.high * Math.pow(Math.sin(Math.PI * Math.pow(g.when, 0.85)), 1.3) + 0.1 * k - 4.9 * fell * fell;
          if (y > 0) {
            const left = env.drift(lerp(foot.from[0], foot.to[0], e2), lerp(foot.from[1], foot.to[1], e2), seconds);
            gx = left[0] + g.ox;
            gy = y;
            gz = left[1] + g.oz;
            big = 1;
          }
        }
        for (let i = 0; i < 3; i++) skin.ring(g.tube, i, gx, gy + (i - 1) * g.size * 0.6, gz, 1, 0, 0, 0, 0, 1, g.local, i * 6, big);
        skin.normals(g.tube);
      }
      for (const shred of this.shreds) {
        if (shred.leg !== j) continue;
        const at = shred.node === 1 ? knee : hock;
        this.hang(shred, at[0] + shred.at[0], at[1] + shred.at[1], at[2] + shred.at[2], fwd, right, 0, seconds);
      }
    }

    // Neck.
    const root: V3 = [
      cx + f[0] * 0.36 * b.bodyLen + u[0] * 0.1 * b.bodyTop,
      cy + f[1] * 0.36 * b.bodyLen + u[1] * 0.1 * b.bodyTop,
      cz + f[2] * 0.36 * b.bodyLen + u[2] * 0.1 * b.bodyTop,
    ];
    const fed = env.drift(aim.target[0], aim.target[1], seconds);
    const low: V3 = [fed[0] + digX, TUFT_UP * b.tendrilLen + digY, fed[1] + digZ];
    const high: V3 = [
      root[0] + fwd[0] * aim.raised[0] + right[0] * aim.raised[2],
      Math.max(1.05 * b.tendrilLen, root[1] + aim.raised[1]),
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
    for (const sinew of table.sinews) {
      const at = nodes[sinew.bone] as V3;
      const d = dirs[sinew.bone] as V3;
      const dot = fwd[0] * d[0] + fwd[1] * d[1] + fwd[2] * d[2];
      let nx = fwd[0] - d[0] * dot;
      let ny = fwd[1] - d[1] * dot;
      let nz = fwd[2] - d[2] * dot;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const bx = d[1] * nz - d[2] * ny;
      const by = d[2] * nx - d[0] * nz;
      const bz = d[0] * ny - d[1] * nx;
      for (let i = 0; i < SINEW_RINGS; i++) {
        const u = i / (SINEW_RINGS - 1);
        const v = lerp(sinew.from, sinew.to, u);
        // It leaves one knuckle, stands clear of the shaft and runs into the next.
        const off = sinew.off * (0.25 + 0.75 * Math.pow(Math.sin(Math.PI * u), 0.6));
        const turn = sinew.angle + 0.5 * (u - 0.5);
        const ca = Math.cos(turn) * off;
        const sa = Math.sin(turn) * off;
        skin.ring(sinew.tube, i, at[0] + d[0] * v + nx * ca + bx * sa, at[1] + d[1] * v + ny * ca + by * sa, at[2] + d[2] * v + nz * ca + bz * sa, nx, ny, nz, bx, by, bz, sinew.local, i * SINEW_SIDES * 2);
      }
      skin.normals(sinew.tube);
    }
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
    // A neck that hangs to a tuft that is down turns most where it leaves the shoulders: steep there, then sweeping out low and level.
    const sweep = lerp(1, 0.75, smooth(0.22, 0.1, shape));
    // It comes to the tuft still going down: it does not rise again before it turns to hang.
    const over = lerp(2, 1.1, smooth(0.22, 0.1, shape));
    const phi = (s: number): number => c1 * (1 - over * Math.pow(s, sweep)) + c2 * Math.sin(2 * Math.PI * s);
    const hang = lerp(-1.42, -0.85, smooth(0.22, 0.1, shape));
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
      const wave = b.k * (0.26 + 0.34 * (1 - down)) * Math.sin(Math.PI * Math.min(1, s * 1.15)) * Math.sin(seconds * this.om + b.seed * 5 - s * 3.2) * smooth(0, 0.25, s);
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
      // A swallow travels up the trunk from the tuft, slowly: a soft swelling, and the next one is on its way before it is gone.
      let swell = 1;
      if (this.gulp >= 0) {
        const s = i / (NECK_RINGS - 1);
        for (let q = 0; q < 2; q++) {
          const at = 0.92 - ((this.gulp + q) / 2) * 1.05;
          const off = (s - at) / 0.05;
          swell += 0.15 * Math.exp(-off * off) * smooth(-0.1, 0.1, at) * smooth(0.95, 0.8, at);
        }
      }
      skin.ring(this.neck, i, c[i * 3] as number, c[i * 3 + 1] as number, c[i * 3 + 2] as number, nx, ny, nz, bx, by, bz, this.neckLocal, i * NECK_SIDES * 2, swell);
    }
    skin.normals(this.neck);

    // The tendrils start round the crown, hang, and lie outward on the crust where they reach it.
    const crown = (NECK_RINGS - 3) * 3;
    const ox = c[crown] as number;
    const oy = c[crown + 1] as number;
    const oz = c[crown + 2] as number;
    const rim = b.neckR * 0.3 + 0.13 * b.k;
    const roots = this.roots;
    const under = this.env.undrift(ox, oz, seconds);
    const sink = smooth(2.4, 0.9, this.env.seam(under[0], under[1]).d);
    // How near the crown is to the lake: a tuft that is down splays, one that is carried hangs as a brush.
    const near = smooth(1.8 * b.tendrilLen, 1.0 * b.tendrilLen, oy);
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
      // Outward from the crown, on the level, all the way round it.
      const hx0 = Math.cos(t.angle + b.seed);
      const hz0 = Math.sin(t.angle + b.seed);
      // Over a seam the roots go down into the melt; on crust they lie on it.
      const floor = lerp((0.03 + 0.02 * Math.sin(t.phase * 3)) * b.k, -0.4 * b.k, sink);
      for (let i = 0; i < TENDRIL_RINGS; i++) {
        const uu = i / (TENDRIL_RINGS - 1);
        if (i > 0) {
          // A root is stiff: it bears down and out from the crown, near straight, with a knot here and there. One that is carried hangs closer.
          // It grew crooked, as a root does: it wanders as it goes, each in its own way.
          const kink = 0.34 * (hash(index * 7 + i, b.seed + 13) - 0.5);
          // Each has one elbow, at its own height, where it turns in or out and to one side.
          const elbow = 0.2 + 0.6 * hash(index, b.seed + 23);
          const past = smooth(elbow - 0.08, elbow + 0.08, uu);
          const bend = 0.25 * Math.sin(uu * (5.2 + 3.6 * hash(index, b.seed + 21)) + t.phase * 5) + 1.5 * (hash(index, b.seed + 24) - 0.5) * past * (1 - 0.5 * smooth(elbow + 0.2, elbow + 0.5, uu));
          const wind = 0.5 * Math.sin(uu * (4.4 + 3.2 * hash(index, b.seed + 22)) + t.phase * 9);
          const sway = 0.05 * Math.sin(seconds * LOOP * 2 + t.phase + uu * 2.4) + 0.03 * Math.sin(seconds * LOOP * 3 + t.phase * 2 + uu * 4) + kink + bend;
          const splay = t.out * lerp(0.14, 1.25, near) * (1 - 0.85 * smooth(0.1, 0.85, uu)) * lerp(1, 0.3 + 1.4 * hash(index, b.seed + 25), past);
          dx = dx * 0.5 + (hx0 * splay - hz0 * wind * 0.5 + rx * sway) * 0.5;
          dy = dy * 0.5 - 0.5;
          dz = dz * 0.5 + (hz0 * splay + hx0 * wind * 0.5 + rz * sway) * 0.5;
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
        // A root does not glow. Only a tip that is under the melt shows a faint heat: its end, a hand above the lake, over a seam.
        let heat = smooth(0.5, 0.95, uu) * smooth(0.25 * b.k, 0.0, py);
        if (heat > 0.01) {
          const crust = this.env.undrift(px, pz, seconds);
          heat *= smooth(2.0, 0.7, this.env.seam(crust[0], crust[1]).d);
        }
        skin.setHeat(t.tube, i, heat);
      }
      skin.normals(t.tube);
    });
    return [c[(NECK_RINGS - 1) * 3] as number, c[(NECK_RINGS - 1) * 3 + 1] as number, c[(NECK_RINGS - 1) * 3 + 2] as number];
  }
}
