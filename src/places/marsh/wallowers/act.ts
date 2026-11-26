// What the three by the lens of the wallowers do through its shot: each is staged on its own clock about the key, a pure function of the seconds.
// The herd's walk() repeats every few seconds and has the three in step with the sheet a critic is shown; this does not repeat inside the shot.
// Sides: z of the path frame is the animal's right. `near` is +1 when the lens stands on its left, -1 on its right; what is said here is for +1.
// In the skin of body.ts a head yaw above 0 turns the head to the left, and a roll above 0 tips the back to the right.
import { FEELERS, LEG_AT, MID, type Build, type Drive, type Plan } from './animal';

const clamp = (v: number): number => Math.min(1, Math.max(0, v));
/** 0 before a, 1 after b, with no speed and no push at either end: nothing starts or stops in a frame. */
const ease = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * t * (t * (6 * t - 15) + 10);
};
/** Up over the first two fifths of a to b and down over the rest: a shove and the slower drawing back. */
const pulse = (a: number, b: number, v: number): number => ease(a, a + 0.4 * (b - a), v) * (1 - ease(a + 0.4 * (b - a), b, v));

/** A foot from `from` to `from + reach` between the seconds a and b: dragged up out of the mud, carried, and set down from above. Writes x and the lift. */
function stride(foot: [number, number, number], from: number, reach: number, height: number, a: number, b: number, v: number): number {
  const u = clamp((v - a) / (b - a));
  foot[0] = from + reach * ease(0.14, 0.9, u);
  const s = Math.sin(Math.PI * Math.pow(u, 1.3));
  foot[1] = height * s * s;
  return s * s;
}

function rest(out: Drive, plan: Plan, b: Build): void {
  out.ox = plan.at[0];
  out.oz = plan.at[1];
  out.oy = plan.ground;
  out.dir = plan.dir;
  out.squash = 1;
  out.cave = 0;
  for (let l = 0; l < 4; l++) {
    const [lx, side] = LEG_AT[l] as [number, number];
    const foot = out.feet[l] as [number, number, number];
    foot[0] = lx * b.k + 0.03 * b.k;
    foot[1] = 0;
    foot[2] = side * 0.68 * b.k * b.bulk;
  }
}

function rake(out: Drive, b: Build, seconds: number, base: number): void {
  for (let f = 0; f < FEELERS; f++) out.curl[f] = base + 0.2 * Math.sin(seconds * 2.3 + f * 2.4 + b.seed * 31) + 0.08 * Math.sin(seconds * 4.1 + b.seed * 3);
}

/** The great one: head up out of the mud, down into it and a shove from the shoulders to the key, then the head swung to the lens's side and one step of the near foreleg. */
export function great(plan: Plan, b: Build, seconds: number, t: number, near: number, out: Drive): Drive {
  const { k } = b;
  rest(out, plan, b);
  const up = 1 - ease(-2.15, -0.45, t);
  const shove = ease(-1.35, 0.3, t);
  const back = ease(1.0, 3.6, t);
  const swing = ease(0.15, 1.95, t);
  // The near hind foot is brought up under it first, and the near fore foot, which stands behind its shoulder at the key, follows it after the shove.
  const hind = near > 0 ? 0 : 2;
  const fore = near > 0 ? 1 : 3;
  const off = near > 0 ? [-0.36, -0.29, 0.26, 0.09] : [0.26, 0.09, -0.36, -0.29];
  for (let l = 0; l < 4; l++) (out.feet[l] as number[])[0] += off[l] as number;
  const hindFoot = out.feet[hind] as [number, number, number];
  const foreFoot = out.feet[fore] as [number, number, number];
  const air = stride(hindFoot, hindFoot[0], 0.42, 0.19 * k, -2.72, -0.8, t) + stride(foreFoot, foreFoot[0], 0.52, 0.22 * k, 0.45, 2.4, t);
  // The weight is over the far legs while a near foot is in the air, and comes back onto the foot when it has landed.
  const lean = (v: number): number => 0.13 - 0.1 * ease(-1.2, -0.2, v) + 0.14 * ease(-0.1, 0.8, v) - 0.27 * ease(1.95, 3.1, v);
  const w = lean(t);
  out.shift = near * k * w;
  out.roll = near * 0.42 * w;
  out.sway = near * k * 0.7 * (lean(t - 0.3) - w);
  out.surge = k * (-0.15 + 0.36 * shove - 0.1 * back);
  out.breath = 1.6 * Math.sin(seconds * 1.85 + b.seed * 9);
  out.pitch = -0.05 * up + 0.07 * shove - 0.03 * back + 0.006 * out.breath;
  // It sinks as it shoves, and again as the foot it has set down takes the weight.
  out.bob = k * (0.03 * up - 0.035 * shove * (1 - 0.5 * back) - 0.018 * air - 0.022 * pulse(2.25, 3.3, t) + 0.008 * out.breath);
  out.bend = near * (0.017 + 0.07 * swing - 0.03 * (1 - ease(-2.3, -0.3, t)));
  const rooting = (1 - up) * (1 - 0.6 * pulse(0.15, 2.6, t));
  out.headYaw = near * (0.24 - 0.55 * ease(-2.3, -0.3, t) + 0.8 * swing - 0.3 * ease(2.5, 4.2, t)) + 0.05 * rooting * Math.sin(seconds * 2.1 + b.seed * 11) + 0.05 * up * Math.sin(seconds * 0.9 + b.seed * 4);
  // The head comes a little out of the mud as it swings and goes back in where it stops.
  out.headPitch = plan.hang - 0.55 * up + 0.07 * shove * (1 - back) - 0.13 * pulse(0.1, 2.2, t) + 0.025 * rooting * Math.sin(seconds * 1.9 + b.seed * 5);
  out.splay = 0.55 + 0.25 * shove * (1 - up);
  rake(out, b, seconds, 0.95 + 0.3 * shove * (1 - back) - 0.2 * up);
  return out;
}

/** The young one: it roots hard to the key, then lifts its head, turns it to the great one (`toward`: +1 when that is to its left) and takes two short steps along the bank. */
export function young(plan: Plan, b: Build, seconds: number, t: number, toward: number, out: Drive): Drive {
  const { k } = b;
  rest(out, plan, b);
  const up = ease(0.25, 1.25, t) - ease(3.0, 4.2, t);
  const turn = ease(0.65, 1.7, t) - ease(2.8, 4.0, t);
  const shove = (pulse(-2.75, -1.45, t) + pulse(-1.25, 0.2, t) + pulse(3.6, 5.0, t)) * (1 - up);
  const go = 0.5 * k;
  const off = [0.05, -0.05, -0.06, 0.04];
  // Fore and hind of opposite sides go nearly together, as a young animal trots off a standstill: left fore, right hind, right fore, left hind.
  const from = [2.1, 0.9, 1.2, 1.8];
  let air = 0;
  let fore = 0;
  for (let l = 0; l < 4; l++) {
    const foot = out.feet[l] as [number, number, number];
    const a = from[l] as number;
    const s = stride(foot, foot[0] + (off[l] as number), go, 0.3 * k, a, a + 0.8, t);
    air += s;
    if (l % 2 === 1) fore += s * (LEG_AT[l] as [number, number])[1];
  }
  out.surge = k * 0.14 * shove + go * ease(0.85, 2.95, t);
  // The trunk goes over the side that stands before a fore foot is lifted.
  const w = 0.11 * (ease(0.6, 1.1, t) - 2 * ease(1.45, 1.95, t) + ease(2.45, 2.95, t)) + 0.035 * Math.sin(seconds * 1.9 + b.seed * 13);
  out.shift = k * w;
  out.roll = 0.45 * w - 0.03 * fore;
  out.sway = -0.3 * k * w;
  out.breath = 1.4 * Math.sin(seconds * 3.1 + b.seed * 9);
  out.pitch = 0.05 * shove - 0.03 * up + 0.006 * out.breath;
  out.bob = k * (-0.025 * shove - 0.012 * air + 0.01 * out.breath);
  out.bend = 0.05 * turn * toward + 0.03 * (1 - up) * Math.sin(seconds * 1.5 + b.seed * 21);
  out.headYaw = (1 - up) * (0.3 * Math.sin(seconds * 2.4 + b.seed * 11) + 0.1 * Math.sin(seconds * 5.1 + b.seed * 3)) + toward * 0.5 * turn + 0.06 * up * Math.sin(seconds * 2.2 + b.seed * 4);
  out.headPitch = plan.hang - 0.5 * up + 0.07 * shove + 0.035 * Math.sin(seconds * 3.2 + b.seed * 5);
  out.splay = 0.55 + 0.25 * shove;
  rake(out, b, seconds, 0.95 + 0.3 * shove - 0.15 * up);
  return out;
}

/** The one that lies in the brine: it settles from a lean toward the lens, lies low at the key with its feelers spread on the brine, and then rolls
 * about its own length, its back going over away from the lens and the near flank coming up. Returns how far it is rolled, 0 to 1. */
export function lying(plan: Plan, b: Build, seconds: number, t: number, near: number, out: Drive): number {
  const { k } = b;
  rest(out, plan, b);
  const over = ease(0.2, 2.5, t) - ease(3.2, 5.8, t);
  const r = near * (-0.16 * (1 - ease(-2.9, -0.7, t)) + 0.04 + 0.92 * over);
  const breath = Math.sin(seconds * 1.6 + b.seed * 9);
  // It turns about the middle of its trunk, not about its feet: the trunk is carried back over the place it lies in.
  out.roll = r;
  out.shift = -MID * k * Math.sin(r);
  out.bob = MID * k * (1 - Math.cos(r)) - 0.07 * k * over + 0.03 * k * breath;
  // Its legs go over with it, folded: they stay under the brine.
  const fr = 0.6 * r;
  for (let l = 0; l < 4; l++) {
    const foot = out.feet[l] as [number, number, number];
    const z = foot[2];
    foot[1] = Math.max(0, -z * Math.sin(fr)) * 0.8;
    foot[2] = z * Math.cos(fr) - MID * k * Math.sin(r) * 0.6;
  }
  out.surge = 0.05 * k * Math.sin(seconds * 0.8 + b.seed);
  out.sway = 0;
  out.breath = 1.5 * breath;
  out.pitch = 0.02 + 0.03 * over;
  out.bend = near * 0.06 * over + 0.03 * Math.sin(seconds * 0.9 + b.seed * 21);
  // It rakes the top of the brine with its head while it lies still, and holds the head up clear of it as it goes over.
  out.headYaw = (1 - 0.7 * over) * (0.26 * Math.sin(seconds * 1.25 + b.seed * 11) + 0.08 * Math.sin(seconds * 2.9 + b.seed * 3)) - near * 0.2 * over;
  out.headPitch = plan.hang - 0.1 - 0.06 * Math.sin(seconds * 1.4 + b.seed) - 0.14 * over;
  out.splay = 0.8 + 0.1 * breath;
  rake(out, b, seconds, 0.95);
  return Math.abs(over);
}
