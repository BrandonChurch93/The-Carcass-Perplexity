// A walk told by the distance walked, not by the clock: every hoof is set down at a place on the animal's way and stays on that place in the
// world while the trunk passes over it, whatever the pace does meanwhile. So an animal can set off, slow, turn and halt, and no hoof slides.

export interface Gait {
  /** Sizes a second at its full pace. */
  pace: number;
  /** How far the trunk goes in one round of the four legs, in its sizes. */
  cycle: number;
  /** The part of a round a hoof stands. */
  duty: number;
  /** When it sets off and when it halts, seconds into the place. Without the first it walks from the start, without the second to the end. */
  from?: number;
  to?: number;
  /** When it sets off once more after its halt. */
  again?: number;
  /** How its way bends: radians of bearing a metre walked. */
  curve: number;
  /** The moment it is where it was placed. */
  key: number;
  /** Diagonal legs together and a moment off the ground: a trot. */
  trot?: boolean;
}

export interface Way {
  x: number;
  z: number;
  /** Radians, clockwise from north. */
  bearing: number;
}

const ramp = (a: number, b: number, t: number): number => {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
/** The ramp summed up to t: seconds at full pace. */
const ramped = (a: number, b: number, t: number): number => {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return (b - a) * (u * u * u - 0.5 * u * u * u * u) + Math.max(0, t - b);
};

/** It takes this long to come up to its pace, and to come to a stand. */
const SETS_OFF = 1.1;
const HALTS = 0.9;

/** 0 standing, 1 at its full pace. */
export function paceAt(g: Gait, t: number): number {
  return (g.from === undefined ? 1 : ramp(g.from, g.from + SETS_OFF, t)) - (g.to === undefined ? 0 : ramp(g.to, g.to + HALTS, t)) + (g.again === undefined ? 0 : ramp(g.again, g.again + SETS_OFF, t));
}

/** Metres walked since the key: behind it before, ahead of it after. */
export function goneAt(g: Gait, size: number, t: number): number {
  const full = (at: number): number => (g.from === undefined ? at : ramped(g.from, g.from + SETS_OFF, at)) - (g.to === undefined ? 0 : ramped(g.to, g.to + HALTS, at)) + (g.again === undefined ? 0 : ramped(g.again, g.again + SETS_OFF, at));
  return g.pace * size * (full(t) - full(g.key));
}

/** Where its way is after `gone` metres from where it was placed. */
export function wayAt(g: Gait, x: number, z: number, bearing: number, gone: number): Way {
  if (Math.abs(g.curve) < 1e-6) return { x: x + Math.sin(bearing) * gone, z: z - Math.cos(bearing) * gone, bearing };
  const b = bearing + g.curve * gone;
  return { x: x + (Math.cos(bearing) - Math.cos(b)) / g.curve, z: z + (Math.sin(bearing) - Math.sin(b)) / g.curve, bearing: b };
}

/** When in a round each leg is set down: hind left, hind right, fore left, fore right. A walk goes hind, fore of that side, other hind, its fore. */
const WALK = [0, 0.5, 0.75, 0.25] as const;
const TROT = [0, 0.5, 0.5, 0] as const;

export interface Step {
  /** In the world, on the level of the way. */
  x: number;
  z: number;
  /** 0 on the ground, 1 at the top of its swing. */
  lift: number;
  /** How far through its stand (0 to 1) or, negative, through its swing (-1 to 0). */
  stands: number;
}

/**
 * The hoof of leg k: `restX` to the animal's left and `restZ` ahead of the middle of its way is where the hoof is under it half way through its stand.
 * `own` sets the round apart from every other animal's.
 */
export function stepAt(g: Gait, size: number, x: number, z: number, bearing: number, gone: number, k: number, restX: number, restZ: number, own: number): Step {
  const round = g.cycle * size;
  const phase = own + ((g.trot ? TROT : WALK)[k] as number);
  const u = gone / round + phase;
  const n = Math.floor(u);
  const into = u - n;
  const set = (m: number): [number, number] => {
    const w = wayAt(g, x, z, bearing, (m + 0.5 * g.duty - phase) * round);
    const s = Math.sin(w.bearing);
    const c = Math.cos(w.bearing);
    return [w.x - c * restX + s * restZ, w.z - s * restX - c * restZ];
  };
  const here = set(n);
  if (into < g.duty) return { x: here[0], z: here[1], lift: 0, stands: into / g.duty };
  const swung = (into - g.duty) / (1 - g.duty);
  const next = set(n + 1);
  // The hoof leaves the ground slowly, goes fast through the middle and reaches out to be set down.
  const e = swung * swung * (3 - 2 * swung);
  return { x: here[0] + (next[0] - here[0]) * e, z: here[1] + (next[1] - here[1]) * e, lift: Math.sin(Math.PI * Math.pow(swung, 0.85)), stands: swung - 1 };
}
