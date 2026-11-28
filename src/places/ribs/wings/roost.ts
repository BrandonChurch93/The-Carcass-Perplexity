// The colony's own: one that sits on a ledge as a body (body.ts), hunched with its neck arched over and its tuft hung before its breast, laid
// low on its nest, or stood up with its sails part open. Where it sits, its feet and its ledge are fixed when the place is made; its pose is
// a function of the time of the place alone.
import { NECK_LONG, type Pose } from './body';

/** 0 sits hunched on its folded legs, 1 lies on its nest, 2 stands. */
export type Stance = 0 | 1 | 2;
export interface Roosting {
  /** The hips over the ledge, the ledge under them, the heading (0 along z). */
  x: number;
  y: number;
  z: number;
  yaw: number;
  size: number;
  seed: number;
  stance: Stance;
  /** Each foot on the rock: x, y, z. */
  feet: [[number, number, number], [number, number, number]];
}

/** The shoulder in the body's frame, metres at size 1 (body.ts: SHOULDER). */
const SHOULDER: [number, number] = [0.755, 0.531];
/** By stance: the nose up (radians), the hips over the ledge and the feet ahead of them (metres at size 1), the neck's rise off the back, the folded sails' droop. */
export const SEAT: { up: number; more: number; hips: number; ahead: number; rise: number; droop: number }[] = [
  { up: 0.3, more: 0.18, hips: 0.56, ahead: 0.42, rise: 0.95, droop: 0.12 },
  { up: 0.2, more: 0.14, hips: 0.36, ahead: 0.85, rise: 1.25, droop: 0.03 },
  { up: 0.3, more: 0.16, hips: 1.12, ahead: 0.16, rise: 0.8, droop: 0 },
];
/** By stance, where the head is from the shoulder (ahead and up in the place, metres at size 1) and the way the neck ends (radians up from level): at rest, looking about, and working at its own breast. */
const HEADS: { rest: [number, number, number]; look: [number, number, number]; preen: [number, number, number] }[] = [
  { rest: [0.62, 0.62, -1.9], look: [0.5, 1.45, -0.7], preen: [0.3, -0.05, -2.3] },
  { rest: [0.42, 1.0, -1.7], look: [0.35, 1.7, -0.5], preen: [0.45, 0.1, -2.2] },
  { rest: [0.55, 1.15, -1.5], look: [0.45, 1.75, -0.7], preen: [0.4, 0.25, -2.1] },
];

/**
 * How an animal carries its neck when it does nothing, by its own number: where the head is from the shoulder (ahead and up, in lengths
 * of its own neck, so that a neck held out is straight and not a hoop), the way the neck ends, how far the neck stands up off the back,
 * how far the head is held to one side, and how much of its length shows: a neck drawn in lies folded in the plumage of the shoulders.
 * Hooked over with the tuft hung before the breast; tall, the head level and the tuft in the wind; laid back over its own shoulders;
 * let down ahead of it along the ledge; held out straight, up and ahead; and drawn in, the head low before the breast.
 */
const CARRIAGE: { head: [number, number, number]; rise: number; aside: number; short: number }[] = [
  { head: [0, 0, 0], rise: 0, aside: 0, short: 0.55 },
  { head: [0.2, 0.9, -0.8], rise: 0.4, aside: 0, short: 0.9 },
  { head: [-0.28, 0.35, -2.6], rise: 0.9, aside: 0.12, short: 0.5 },
  { head: [0.88, -0.22, -0.6], rise: -0.55, aside: 0, short: 0.7 },
  { head: [0.66, 0.62, -0.45], rise: 0.3, aside: 0, short: 0.8 },
  { head: [0.43, 0.22, -1.3], rise: 0.2, aside: 0.1, short: 0.42 },
];

const frac = (x: number): number => x - Math.floor(x);
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface Cycles {
  wave: (t: number, rate: number, shift: number, more?: number) => number;
  held: (t: number, every: number, key: number, over?: number) => number;
}

/** Sets `p` to the body of `s` at `t`. `wind` is where the wind blows to (x, z). */
export function roostPose(p: Pose, s: Roosting, t: number, cyc: Cycles, wind: [number, number]): void {
  const k1 = frac(s.seed * 17.31);
  const k2 = frac(s.seed * 41.77);
  const k3 = frac(s.seed * 73.13);
  const seat = SEAT[s.stance] as (typeof SEAT)[number];
  const heads = HEADS[s.stance] as (typeof HEADS)[number];
  const size = s.size;
  // No two of one make. Its build: lean or deep in the trunk, long or short in the neck; the small ones are the young of the year,
  // deep, short necked, pale and short in the tuft.
  const k4 = frac(s.seed * 57.3);
  const k5 = frac(s.seed * 91.7);
  const k6 = frac(s.seed * 113.9);
  const k7 = frac(s.seed * 131.3);
  const young = 1 - smooth(0.38, 0.56, size);
  // Its carriage: which way it holds its neck at rest. One that lies lets it down along the ledge more often than one that stands.
  // Few hook it over; one that sits or lies has it folded down as often as not.
  const pick = s.stance === 1 ? [0.14, 0.2, 0.36, 0.58, 0.68] : s.stance === 2 ? [0.15, 0.36, 0.44, 0.6, 0.82] : [0.16, 0.22, 0.38, 0.56, 0.68];
  const carriage = CARRIAGE[pick.filter((to) => k4 >= to).length] as (typeof CARRIAGE)[number];
  const own = carriage.rise !== 0;
  // Its sails: folded, or both held out from the flanks to dry, or one let out, by its own number; only one on its feet holds them out.
  const dries = s.stance !== 1 && young < 0.5 && k5 > 0.9;
  const stretches = s.stance !== 1 && young < 0.5 && k5 > 0.8 && k5 <= 0.9;
  // What it is doing: mostly nothing. Now and then its head comes up and it looks about; now and then it works at its breast.
  // One in eight carries its head high most of the time, and one in six is mostly at its breast: no two neighbours hold one pose.
  const habit = frac(s.seed * 29.7);
  const look = Math.max(smooth(0.72, 0.9, cyc.held(t, 2.6 + 3 * k1, s.seed + 0.11, 0.35)), habit < 0.12 ? 0.55 + 0.45 * smooth(0.3, 0.6, cyc.held(t, 3.1 + 2 * k3, s.seed + 0.23, 0.4)) : 0);
  const preen = Math.max(smooth(0.8, 0.93, cyc.held(t, 4.3 + 2.5 * k2, s.seed + 0.37, 0.3)), habit > 0.83 ? 0.5 + 0.5 * smooth(0.3, 0.6, cyc.held(t, 2.2 + 2 * k1, s.seed + 0.61, 0.4)) : 0) * (1 - look);
  const side = (cyc.held(t, 1.5 + 1.9 * k3, s.seed + 0.53, 0.3) - 0.5) * (0.5 + 1.3 * look);
  // One that stands beats its sails at a neighbour for a moment and settles.
  const row = s.stance === 2 ? smooth(0.62, 0.78, cyc.held(t, 2.9 + 1.6 * k2, s.seed + 0.71, 0.25)) : 0;
  const breath = cyc.wave(t, 1.5 + 0.6 * k1, s.seed * 40);

  // It shifts its weight across its feet, slowly, and the trunk leans the other way to keep over them.
  const shift = cyc.wave(t, 0.4 + 0.35 * k2, s.seed * 23);
  const rock = cyc.wave(t, 0.55 + 0.4 * k3, s.seed * 31);
  const sy = Math.sin(s.yaw);
  const cy = Math.cos(s.yaw);
  const lean = (s.stance === 2 ? 0.07 : 0.03) * shift * size;
  const sink = s.stance === 2 ? 0.05 * size * (0.5 + 0.5 * rock) + 0.1 * size * row * Math.abs(cyc.wave(t, 9, s.seed * 9)) : 0;
  p.x = s.x - cy * lean;
  p.z = s.z + sy * lean;
  p.y = Math.max(s.feet[0][1], s.feet[1][1]) + seat.hips * size - sink + 0.008 * size * breath;
  p.yaw = s.yaw + 0.03 * rock;
  // Some hold the back nearly level and some sit bolt upright.
  p.pitch = -(seat.up + seat.more * k1) - 0.012 * breath - 0.05 * look - 0.1 * row + (s.stance === 1 ? 0 : 0.34 * (k6 - 0.45));
  p.roll = (s.stance === 2 ? -0.05 : -0.025) * shift + 0.06 * (k2 - 0.5);
  p.size = size;
  // Weathered, each to its own grey-brown: none is clean.
  p.tone = 0.5 + 0.55 * k3 + 0.12 * young;
  p.girth = 0.86 + 0.34 * k5 + 0.16 * young;
  const idle = (1 - look) * (1 - preen);
  // On the ledge every neck is drawn in some way into the shoulders: none is the length it is let out to in the pools.
  p.neck = 0.74 * (0.84 + 0.34 * k6 - 0.2 * young) * (1 + (carriage.short - 1) * idle);
  p.warm = -0.4 + 0.95 * k7 * k7 * (1 - young);
  p.thigh = 1.45 + 0.45 * k5;
  p.shade = 1;
  for (let leg = 0; leg < 2; leg++) {
    const foot = p.feet[leg] as Pose['feet'][number];
    const at = s.feet[leg] as [number, number, number];
    foot.x = at[0];
    foot.y = at[1] + 0.055 * size;
    foot.z = at[2];
    foot.yaw = s.yaw + (leg === 0 ? -0.22 : 0.22) + 0.5 * (k1 - 0.5);
    foot.droop = 0;
  }

  // The head, from the shoulder, in the place's own level and upright; then turned into the body's frame, which is nose up.
  const cp = Math.cos(p.pitch);
  const sp = Math.sin(p.pitch);
  const rest = (i: 0 | 1 | 2): number => (own ? carriage.head[i] * (i === 2 ? 1 : NECK_LONG * p.neck) : heads.rest[i]);
  const mix = (i: 0 | 1 | 2): number => rest(i) + (heads.look[i] - rest(i)) * look + (heads.preen[i] - rest(i)) * preen;
  const nod = 0.03 * cyc.wave(t, 1.1 + 0.9 * k3, s.seed * 50);
  const a = SHOULDER[0] * cp + SHOULDER[1] * sp + mix(0) + 0.2 * (k2 - 0.5);
  const b = -SHOULDER[0] * sp + SHOULDER[1] * cp + mix(1) + 0.22 * (k3 - 0.5) + nod + 0.12 * row;
  const down = mix(2) + 0.12 * (k1 - 0.5) + 0.5 * row;
  p.head[0] = a * cp - b * sp;
  p.head[1] = a * sp + b * cp;
  p.head[2] = 0.55 * side * (1 - 0.5 * preen) * (1 - 0.7 * idle * (own ? 1 : 0)) + 0.3 * preen * (k1 < 0.5 ? 1 : -1) + carriage.aside * idle * (k2 < 0.5 ? 1 : -1);
  p.headPitch = down + p.pitch;
  p.headYaw = 0.8 * side + 2.4 * carriage.aside * idle * (k2 < 0.5 ? 1 : -1);
  p.floor = s.y + 0.02;
  // The strands hang in the wind, which comes in gusts that cross the rock, and are thrown as the head turns.
  const gust = 0.5 + 0.5 * cyc.wave(t, 0.9, (s.x * wind[0] + s.z * wind[1]) * -0.06, s.y * 0.05);
  p.trail[0] = wind[0] * (0.04 + 0.1 * gust) * size;
  p.trail[1] = 0;
  p.trail[2] = wind[1] * (0.04 + 0.1 * gust) * size;
  p.shake = 0.04 * gust + 0.3 * row;
  p.clock = t;
  p.beat = 0;
  p.sail = (s.stance === 2 && !dries ? 0.1 + 0.35 * k2 : -seat.droop * (0.6 + 0.8 * k3)) + 0.02 * breath + 0.03 * gust + row * (0.3 + 0.28 * cyc.wave(t, 9, s.seed * 9, 0.5));
  // Held out to dry they are fanned slowly, each in its own time, and the wind lifts them; one let out is drawn in again and let out.
  const fan = cyc.wave(t, 0.5 + 0.5 * k1, s.seed * 61);
  const let0 = smooth(0.25, 0.6, cyc.held(t, 3.4 + 2.2 * k3, s.seed + 0.83, 0.35));
  const spread = dries ? 0.85 + 0.4 * k2 + 0.1 * fan + 0.08 * gust : 0;
  const one = stretches ? (0.5 + 0.55 * k2) * let0 + 0.05 * fan : 0;
  p.open[0] = spread + (k1 < 0.5 ? one : 0) + 0.2 * row;
  p.open[1] = spread * (0.8 + 0.3 * k3) + (k1 < 0.5 ? 0 : one) + 0.2 * row;
  // Out of the water the strands are short and hang close.
  p.tuft = (0.38 + 0.42 * k2) * (1 - 0.45 * young);
  // Its neck stands up off its back and arches over.
  p.rise = seat.rise + 0.3 * (k2 - 0.5) + 0.25 * look - 0.5 * preen + carriage.rise * idle;
  p.seed = s.seed;
}
