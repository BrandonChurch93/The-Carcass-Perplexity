// The walk of a heavy animal, from its legs up. The trunk is not posed by numbers: the feet are planted in the world by the distance walked, each
// girdle (hips, shoulders) rides as high as its standing legs let it, so it vaults over a planted foot and comes down to meet the next one, and the
// trunk goes over the side that stands before a foot is lifted. Everything is a function of the seconds: `travel` gives the distance, the rest follows.
import { LEG_AT, type Build, type Drive, type Plan } from './animal';

const clamp = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const frac = (v: number): number => v - Math.floor(v);

/** The length a leg is used at, hip to ankle, at size 1. Its bones are 0.88 long: it is never quite straight. */
const REACH = 0.868;
/** The ankle stands this far out from the hip, to the side, at size 1. */
const SPLAY = 0.18;
/** The height of the hip over the ankle as the body is built, at size 1. */
const HIP = 0.84;
/** Where the hips and the shoulders are along the trunk, at size 1. */
const HIND_X = -1.24;
const FORE_X = 0.76;
/** How far a girdle goes over the foot that bears it alone, at size 1. */
const SHIFT = 0.16;
const SOFT = 60;

export interface Stride {
  /** Metres the trunk goes in one cycle of the four feet. */
  length: number;
  /** The share of a cycle a foot stands. At 0.8 there are four moments in a cycle with all four down: it can stop there. */
  duty: number;
  /** How high a foot is carried, metres. */
  lift: number;
  /** The cycle at distance 0. */
  phase: number;
  /** +1: the left hind foot leads the cycle; -1: the right one. Hind, then the fore foot of that side, then the other side. */
  lead: number;
}

/** Distance run at a speed that rises from nought over `r` seconds from `a` on, and then holds 1: seconds' worth of distance. */
export function runUp(t: number, a: number, r: number): number {
  const u = (t - a) / r;
  if (u <= 0) return 0;
  if (u >= 1) return 0.5 * r + (t - a - r);
  return r * (u * u * u - 0.5 * u * u * u * u);
}
/** Seconds' worth of distance of a walk that starts at `a`, is at full pace `r` seconds later, slows from `b - r` and stands at `b`. */
export const spell = (t: number, a: number, b: number, r: number): number => runUp(t, a, r) - runUp(t, b - r, r);

export interface Carried {
  /** For each foot LH, LF, RH, RF: where it is along and across the path from the trunk's middle (metres), how high, how far its toes hang, how much of the weight it bears. */
  x: number[];
  z: number[];
  y: number[];
  toe: number[];
  load: number[];
  hold: number[];
  /** How far the hips and the shoulders stand over or under their height at rest, and how far to the right of the path, at size 1. */
  hind: number;
  fore: number;
  hindZ: number;
  foreZ: number;
  /** How much of the swing each foot has done, 0 on the ground. */
  air: number;
}

const newCarried = (): Carried => ({ x: [0, 0, 0, 0], z: [0, 0, 0, 0], y: [0, 0, 0, 0], toe: [0, 0, 0, 0], load: [0, 0, 0, 0], hold: [0, 0, 0, 0], hind: 0, fore: 0, hindZ: 0, foreZ: 0, air: 0 });

/** The feet and the two girdles after `s` metres, for a body of size k whose trunk is `surge` metres ahead of its place on the path. */
export function carry(s: number, surge: number, k: number, bulk: number, g: Stride, out: Carried): Carried {
  const c = s / g.length + g.phase;
  const half = 0.5 * g.length * g.duty;
  let air = 0;
  const sink = [0, 0];
  const side = [0, 0];
  const weight = [0, 0];
  for (let l = 0; l < 4; l++) {
    const [lx, sd] = LEG_AT[l] as [number, number];
    const fore = lx > 0 ? 1 : 0;
    // Hind foot, then the fore foot of its side a quarter later, then the other side.
    const f = frac(c - (fore ? 0.25 : 0) + (sd * g.lead > 0 ? 0.5 : 0));
    let x: number;
    let y = 0;
    let toe = 0;
    let load: number;
    // 1 where the foot holds the girdle to its reach: on the ground, and for the end of the swing, as the girdle comes down to meet the ground with it.
    let hold: number;
    if (f < g.duty) {
      x = half * (1 - (2 * f) / g.duty);
      // It takes the weight over the first sixth of its stand and gives it up over the last quarter, before it is lifted.
      load = smooth(0, 0.16 * g.duty, f) * (1 - smooth(0.74 * g.duty, 0.98 * g.duty, f));
      hold = 1;
      // The heel peels off the mud before the toes leave it.
      const peel = smooth(0.88 * g.duty, g.duty, f);
      toe = 0.3 * peel;
      y = 0.05 * k * peel - 0.02 * k * load;
      // The leg gives as the weight comes onto it.
      sink[fore] = (sink[fore] as number) + smooth(0, 0.1 * g.duty, f) * (1 - smooth(0.1 * g.duty, 0.42 * g.duty, f));
    } else {
      const u = (f - g.duty) / (1 - g.duty);
      // Dragged out, carried, set down from above: slow to leave, quick over the middle, slow to land.
      const e = u * u * u * (u * (6 * u - 15) + 10);
      x = half * (-1 + 2 * e);
      const up = Math.sin(Math.PI * Math.pow(u, 0.85));
      y = 0.05 * k * (1 - smooth(0, 0.5, u)) + g.lift * Math.pow(up, 1.3);
      toe = (0.3 + 0.35 * Math.sin(Math.PI * clamp(u / 0.55)) - 0.75 * smooth(0.3, 0.8, u)) * (1 - smooth(0.82, 1, u));
      load = 0;
      hold = Math.max(1 - smooth(0, 0.3, u), smooth(0.55, 0.97, u));
      air += Math.sin(Math.PI * u);
    }
    out.x[l] = (lx + 0.03) * k + x;
    out.z[l] = sd * 0.68 * k * bulk;
    out.y[l] = y;
    out.toe[l] = toe;
    out.load[l] = load;
    out.hold[l] = hold;
    side[fore] = (side[fore] as number) + load * sd;
    weight[fore] = (weight[fore] as number) + load;
  }
  // Each girdle goes over the foot that bears it.
  out.hindZ = (SHIFT * (side[0] as number)) / Math.max(0.5, weight[0] as number);
  out.foreZ = (SHIFT * (side[1] as number)) / Math.max(0.5, weight[1] as number);
  const low = [0, 0];
  for (let l = 0; l < 4; l++) {
    const [lx, sd] = LEG_AT[l] as [number, number];
    const fore = lx > 0 ? 1 : 0;
    // How high the hip can stand over this foot: the leg at its reach, from the ankle where it is.
    const d = ((out.x[l] as number) - surge) / k - lx + 0.02;
    const w = SPLAY * sd - (fore ? out.foreZ : out.hindZ);
    const can = Math.sqrt(Math.max(0.04, REACH * REACH - w * w - d * d)) + (out.y[l] as number) / k - HIP + (1 - (out.hold[l] as number)) * 0.3;
    // The lower of the two, taken softly: the girdle rides on the leg that can reach least.
    low[fore] = (low[fore] as number) + Math.exp(-can * SOFT);
  }
  out.hind = -Math.log(0.5 * (low[0] as number)) / SOFT - 0.012 - 0.04 * (sink[0] as number);
  out.fore = -Math.log(0.5 * (low[1] as number)) / SOFT - 0.012 - 0.04 * (sink[1] as number);
  out.air = air;
  return out;
}

const now = newCarried();
const then = newCarried();

export interface Walked {
  /** How much of a swing is in the air, summed over the feet. */
  air: number;
  /** How far the shoulders are under their height at rest, at size 1: the head is held to the mud against it. */
  fore: number;
  /** The turn of the trunk off its path, radians. */
  yaw: number;
}
const walked: Walked = { air: 0, fore: 0, yaw: 0 };

/**
 * Writes the feet and the trunk of one that has walked `s` metres from `plan.at` along `plan.dir`, and that was at `sWas` a third of a second ago
 * (what hangs on it, the belly and the head, is still where the trunk was then). `surge` is how far the trunk is shoved ahead of its feet, metres.
 * Sets the place, the feet, the toes, bob, pitch, shift, roll, sway and bend; the caller adds the head, the breath and the feelers.
 */
export function stride(out: Drive, plan: Plan, b: Build, s: number, sWas: number, surge: number, g: Stride): Walked {
  const { k } = b;
  carry(sWas, surge, k, b.bulk, g, then);
  carry(s, surge, k, b.bulk, g, now);
  const span = FORE_X - HIND_X;
  // The trunk turns a little off its path as the shoulders go over one foot and the hips over another.
  const yaw = ((now.foreZ - now.hindZ) / span) * 0.8;
  const mid = now.foreZ - FORE_X * ((now.foreZ - now.hindZ) / span);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const fx = plan.dir[0];
  const fz = plan.dir[1];
  out.dir = [fx * cy - fz * sy, fz * cy + fx * sy];
  out.ox = plan.at[0] + fx * s;
  out.oz = plan.at[1] + fz * s;
  out.oy = plan.ground;
  for (let l = 0; l < 4; l++) {
    const foot = out.feet[l] as [number, number, number];
    const X = now.x[l] as number;
    const Z = now.z[l] as number;
    foot[0] = X * cy + Z * sy;
    foot[1] = now.y[l] as number;
    foot[2] = -X * sy + Z * cy;
    out.toe[l] = now.toe[l] as number;
  }
  const pitch = (now.hind - now.fore) / span;
  out.pitch = pitch;
  out.bob = k * (now.fore + FORE_X * pitch);
  out.shift = k * mid;
  out.surge = surge;
  // The side whose feet are in the air sags.
  const lean = (now.load[2] as number) + (now.load[3] as number) - (now.load[0] as number) - (now.load[1] as number);
  out.roll = -0.04 * lean;
  // The belly is slung: it is still coming over when the trunk has arrived.
  const midWas = then.foreZ - FORE_X * ((then.foreZ - then.hindZ) / span);
  out.sway = 0.9 * k * (midWas - mid);
  out.bend = 0.5 * yaw;
  out.squash = 1;
  out.cave = 0;
  out.acted = 1;
  out.under = 0;
  out.mud = plan.ground + 0.36 * k;
  walked.air = now.air;
  walked.fore = then.fore;
  walked.yaw = yaw;
  return walked;
}
