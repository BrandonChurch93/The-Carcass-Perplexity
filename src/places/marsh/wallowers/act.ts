// What the three by the lens of the wallowers do through its shot: each is staged on its own clock about the key, a pure function of the seconds.
// None of them walks in it (kit/03-METHOD.md section 5, step 1): the two that stand keep the four feet where the key has them, and what moves is
// the trunk over those feet, the breath, and the head at the mud. The walk of gait.ts is asked for the one distance of the stand only.
// The herd's walk() repeats every few seconds and has the three in step with the sheet a critic is shown; this does not repeat inside the shot.
// Sides: z of the path frame is the animal's right. `near` is +1 when the lens stands on its left, -1 on its right; what is said here is for +1.
// In the skin of body.ts a head yaw above 0 turns the head to the left, and a roll above 0 tips the back to the right.
import { FEELERS, LEG_AT, MID, type Build, type Drive, type Plan } from './animal';
import { runUp, spell, stride as walk, type Stride } from './gait';

/** How far the great one and the young one have walked, and at what stride, as they were last asked: for the mud at their feet. */
export const trod: { s: number; pace: Stride }[] = [0, 1].map(() => ({ s: 0, pace: { length: 1, duty: 0.8, lift: 0, phase: 0, lead: 1 } }));

const clamp = (v: number): number => Math.min(1, Math.max(0, v));
/** 0 before a, 1 after b, with no speed and no push at either end: nothing starts or stops in a frame. */
const ease = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * t * (t * (6 * t - 15) + 10);
};
/** Up over the first two fifths of a to b and down over the rest: a shove and the slower drawing back. */
const pulse = (a: number, b: number, v: number): number => ease(a, a + 0.4 * (b - a), v) * (1 - ease(a + 0.4 * (b - a), b, v));

function rest(out: Drive, plan: Plan, b: Build): void {
  out.ox = plan.at[0];
  out.oz = plan.at[1];
  out.oy = plan.ground;
  out.dir = plan.dir;
  out.squash = 1;
  out.cave = 0;
  out.acted = 1;
  out.under = 0;
  // One on a bank stands in its mud to the shin.
  out.mud = plan.ground + 0.36 * b.k;
  for (let l = 0; l < 4; l++) out.toe[l] = 0;
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

/** The great one: it stands and roots. It shoves its head down into the mud at the key, swings the head to the lens's side, draws it half out late in the
 * shot and lets it down again. Its feet stand where the walk (gait.ts) leaves them at the stand; what is here is the weight going over them, and the head. */
export function great(plan: Plan, b: Build, seconds: number, t: number, near: number, out: Drive): Drive {
  const { k } = b;
  rest(out, plan, b);
  const pace: Stride = { length: 0.92 * k, duty: 0.8, lift: 0.2 * k, phase: 0.025, lead: near > 0 ? 1 : -1 };
  const cycle = 3.4;
  // A cycle and a quarter to the stand, from one moment with all four feet down to another; then on.
  const far = (v: number): number => (pace.length / cycle) * (spell(v, -0.55 - 0.9 - 1.25 * cycle, -0.55, 0.9) - 1.25 * cycle + runUp(v, 0.5, 0.9));
  // The head is at the mud from the first frame; it comes half out of it once, late, and goes back.
  const up = 0.45 * pulse(2.8, 5.6, t);
  const shove = ease(-1.0, 0.25, t);
  const back = ease(0.6, 2.4, t);
  const swing = ease(0.15, 1.75, t);
  // The shove is from the shoulders: the trunk goes forward over feet that stand.
  const push = (v: number): number => k * (0.1 * ease(-1.0, 0.25, v) - 0.1 * ease(0.5, 1.5, v));
  const stand = far(0);
  const w = walk(out, plan, b, stand, stand, push(t), pace);
  trod[0].s = stand;
  trod[0].pace = pace;
  // It blows: two breaths and more in the shot, the flanks going out and in, and the last of each a little deeper.
  out.breath = 1.7 * Math.sin(seconds * 2.7 + b.seed * 9) + 0.5 * Math.sin(seconds * 1.1 + b.seed * 2);
  out.pitch += -0.03 * up + 0.03 * shove * (1 - back) + 0.007 * out.breath;
  // Its weight goes from one side to the other as it stands and roots: the trunk leans over the legs that carry it and sinks on them.
  const lean = Math.sin(seconds * 1.45 + b.seed * 13) + 0.35 * Math.sin(seconds * 2.3 + b.seed * 5);
  out.roll += 0.045 * lean;
  out.sway += k * 0.06 * lean;
  out.bob += k * (0.008 * out.breath - 0.035 * lean * lean);
  out.bend += near * (0.017 + 0.07 * swing * (1 - 0.6 * ease(2.0, 3.2, t)) - 0.03 * (1 - ease(-2.3, -0.3, t)));
  const rooting = (1 - up) * (1 - 0.6 * pulse(0.15, 2.6, t));
  // It roots with the side of its face to the lens, and works the lip from side to side through the mud: a slow sweep with a quicker one on it.
  out.headYaw = near * (0.85 - 0.12 * ease(-2.3, -0.3, t) + 0.3 * swing - 0.3 * ease(2.2, 3.6, t)) - 2.2 * w.yaw + rooting * (0.24 * Math.sin(seconds * 1.9 + b.seed * 11) + 0.08 * Math.sin(seconds * 4.3 + b.seed * 3)) + 0.05 * up * Math.sin(seconds * 0.9 + b.seed * 4);
  // The head hangs from the shoulders and is late: it nods as they come down on a foot. It comes a little out of the mud as it swings and goes back in where it stops.
  out.headPitch = plan.hang - 0.5 * up + 0.07 * shove * (1 - back) - 0.13 * pulse(0.1, 2.2, t) - 0.9 * w.fore + 0.09 * rooting * Math.sin(seconds * 3.8 + b.seed * 5);
  out.splay = 0.55 + 0.25 * shove * (1 - up);
  rake(out, b, seconds, 0.5 + 0.25 * shove * (1 - back) - 0.1 * up);
  return out;
}

/** The young one, on its own time and at more than twice the great one's beat: it stands with its head carried and looks about, drops it and noses hard into
 * the mud through the key, then lifts its head and turns it to the great one (`toward`: +1 when that is to its left), and noses again at the end. */
export function young(plan: Plan, b: Build, seconds: number, t: number, toward: number, out: Drive): Drive {
  const { k } = b;
  rest(out, plan, b);
  const pace: Stride = { length: 0.8 * k, duty: 0.8, lift: 0.18 * k, phase: 0.275, lead: 1 };
  const cycle = 1.45;
  // It walks on again once it has looked: a cycle and more, from a stand.
  const far = (v: number): number => (pace.length / cycle) * (spell(v, -0.6 - 0.5 - 1.25 * cycle, -0.6, 0.5) - 1.25 * cycle + runUp(v, 1.5, 0.5));
  const up = 1 - ease(-1.0, -0.25, t) + ease(0.95, 1.55, t) - ease(3.4, 4.3, t);
  const turn = ease(1.0, 1.8, t) * (1 - 0.6 * ease(2.0, 2.7, t)) * (1 - ease(3.2, 4.0, t));
  const dig = (v: number): number => pulse(-0.45, 0.75, v) + pulse(0.6, 1.5, v) + pulse(4.0, 5.4, v);
  const shove = dig(t) * (1 - up);
  const stand = far(0);
  const w = walk(out, plan, b, stand, stand, k * 0.1 * dig(t), pace);
  trod[1].s = stand;
  trod[1].pace = pace;
  out.breath = 1.6 * Math.sin(seconds * 4.3 + b.seed * 9);
  const lean = Math.sin(seconds * 2.6 + b.seed * 13);
  out.roll += 0.05 * lean;
  out.sway += k * 0.05 * lean;
  out.pitch += 0.04 * shove - 0.03 * up + 0.006 * out.breath;
  out.bob += k * 0.01 * out.breath;
  out.bend += 0.1 * turn * toward + 0.03 * (1 - up) * Math.sin(seconds * 1.5 + b.seed * 21);
  // (With its head up it looks about: a slow turn one way and the other, away from the great one first.)
  const about = (1 - ease(-1.6, -0.6, t)) * Math.sin(seconds * 1.3 + b.seed * 4);
  out.headYaw = (1 - up) * (0.42 * Math.sin(seconds * 3.1 + b.seed * 11) + 0.12 * Math.sin(seconds * 6.3 + b.seed * 3)) + toward * 0.6 * turn - 2.2 * w.yaw + 0.06 * up * Math.sin(seconds * 2.2 + b.seed * 4) - toward * 0.35 * about;
  out.headPitch = plan.hang - 0.45 * up - 0.2 * turn + 0.07 * shove - 1.1 * w.fore * up + 0.035 * Math.sin(seconds * 3.2 + b.seed * 5);
  out.splay = 0.55 + 0.25 * shove;
  rake(out, b, seconds, 0.5 + 0.25 * shove - 0.1 * up);
  return out;
}

/** The one that lies in the brine: it settles from a lean toward the lens, lies low at the key with its feelers spread on the brine, and then rolls
 * about its own length, its back going over away from the lens and the near flank coming up. Returns how far it is rolled, 0 to 1. */
export function lying(plan: Plan, b: Build, seconds: number, t: number, near: number, out: Drive): number {
  const { k } = b;
  rest(out, plan, b);
  const over = ease(0.2, 2.5, t) - ease(3.2, 5.8, t);
  // (It wallows where it lies: a third of the way over and back, not a roll.)
  const r = near * (-0.16 * (1 - ease(-2.9, -0.7, t)) + 0.04 + 0.34 * over);
  const breath = Math.sin(seconds * 2.2 + b.seed * 9);
  // It turns about the middle of its trunk, not about its feet: the trunk is carried back over the place it lies in.
  out.roll = r;
  // The brine stands at the world's 0 and it lies with its feet on the floor of it.
  out.under = Math.max(0.05, -plan.ground / k);
  out.shift = -MID * k * Math.sin(r);
  // Before it goes over it lifts its head clear of the brine and looks about, and lets it down again.
  const look = pulse(-2.5, -0.2, t);
  out.bob = MID * k * (1 - Math.cos(r)) - 0.07 * k * over - 0.05 * k + k * (0.07 * breath + 0.015 * Math.sin(seconds * 0.7 + b.seed * 2)) + 0.03 * k * look;
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
  out.breath = 2.2 * breath;
  out.pitch = 0.02 + 0.03 * over - 0.05 * look;
  out.bend = near * 0.06 * over + 0.03 * Math.sin(seconds * 0.9 + b.seed * 21);
  // It rakes the top of the brine with its head while it lies still, and holds the head up clear of it as it goes over.
  out.headYaw = (1 - 0.7 * over) * (0.26 * Math.sin(seconds * 1.25 + b.seed * 11) + 0.08 * Math.sin(seconds * 2.9 + b.seed * 3)) - near * 0.2 * over + near * 0.4 * look;
  out.headPitch = plan.hang - 0.1 - 0.06 * Math.sin(seconds * 1.4 + b.seed) - 0.14 * over - 0.38 * look;
  out.splay = 0.8 + 0.1 * breath;
  rake(out, b, seconds, 0.95);
  return Math.abs(over);
}
