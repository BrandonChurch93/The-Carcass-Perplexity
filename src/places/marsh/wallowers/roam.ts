// What each of the herd does on its own time, away from the lens of the wallowers. None of them walks on and on: one takes a few steps and stops,
// and where it stops it does one thing, and the next time another: lifts its head out of the mud and looks about, shoves into the mud twice with
// the whole trunk behind it, or stands and rocks its weight from one side to the other. No two have the same period, so no two are ever in time.
// The steps come from the walk (gait.ts): feet planted in the world, the trunk carried over them. A pure function of the seconds.
import { FEELERS, type Build, type Drive, type Plan } from './animal';
import { stride, type Stride } from './gait';

const clamp = (v: number): number => Math.min(1, Math.max(0, v));
const ease = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a));
  return t * t * t * (t * (6 * t - 15) + 10);
};
const pulse = (a: number, b: number, v: number): number => ease(a, a + 0.4 * (b - a), v) * (1 - ease(a + 0.4 * (b - a), b, v));
const hash = (v: number): number => {
  const s = Math.sin(v * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const from: Plan = { at: [0, 0], when: 0, dir: [1, 0], speed: 0, ground: 0, cycle: 1, phase: 0, root: 0, hang: 0, look: 0 };
const pace: Stride = { length: 1, duty: 0.8, lift: 0, phase: 0.025, lead: 1 };

/** One of the herd at `seconds`. `sunk`: it lies in the brine to its back and wades on slowly under it; it does not stop and start. */
export function roam(plan: Plan, b: Build, seconds: number, sunk: boolean, out: Drive): Drive {
  const { k, seed } = b;
  const t = seconds - plan.when;
  const q = 1 + 0.7 * b.young;
  // Its own period, and where in it it is at its own key.
  const period = (4.3 + 2.3 * hash(seed)) / (1 + 0.25 * b.young);
  const offset = hash(seed * 1.7 + 3);
  const share = 0.5 + 0.12 * hash(seed * 2.3 + 1);
  // It goes as far in a period as it did before, in one cycle of its feet: a short walk and a stand.
  const reach = Math.min(plan.speed * period, 1.15 * k);
  const goes = !sunk && reach > 0.02 * k;
  const cycles = (v: number): number => {
    const u = v / period + offset;
    const n = Math.floor(u);
    return n + ease(0, share, u - n);
  };
  const u = t / period + offset;
  const turn = Math.floor(u);
  const part = u - turn;
  const stand = clamp((part - share) / (1 - share));
  const walking = goes ? ease(0, 0.15, part / share) * (1 - ease(0.8, 1, part / share)) : 0;
  // What it does where it stands: this time one thing, the next time another.
  const kind = Math.floor(hash(seed * 3.1 + turn * 7.7) * 3) % 3;
  const held = ease(0, 0.28, stand) * (1 - ease(0.72, 1, stand));
  // One in the brine has nothing to wait for: it does its thing through the whole of the period.
  const calm = sunk || !goes ? ease(0.05, 0.3, part) * (1 - ease(0.7, 0.95, part)) : held;
  const up = kind === 0 ? calm : 0;
  const twice = (v: number): number => pulse(0.02, 0.55, v) + pulse(0.45, 0.98, v);
  const shove = kind === 1 ? plan.root * 0.4 + (sunk || !goes ? twice(part) : twice(stand)) : plan.root * 0.4 * (1 - up);
  const rock = kind === 2 ? calm : 0;

  pace.length = goes ? Math.max(reach, 0.14 * k) : k;
  pace.lift = (0.07 + 0.15 * clamp(pace.length / (0.6 * k))) * k;
  pace.lead = hash(seed * 5.3) > 0.5 ? 1 : -1;
  const far = (v: number): number => (sunk ? (plan.speed * v) / pace.length : goes ? cycles(v) : 0);
  const s = pace.length * far(t);
  const start = pace.length * far(0);
  from.at[0] = plan.at[0] - plan.dir[0] * start;
  from.at[1] = plan.at[1] - plan.dir[1] * start;
  from.dir = plan.dir;
  from.ground = plan.ground;
  const w = stride(out, from, b, s, pace.length * far(t - 0.22), 0.16 * k * shove, pace);
  out.acted = 0;

  const slow = seconds * 1.9 * q + seed * 13;
  out.breath = Math.sin(seconds * (2.0 + 0.4 * Math.sin(seed * 17)) * q + seed * 9);
  out.pitch += 0.06 * shove - 0.035 * up + 0.008 * out.breath;
  out.bob += -0.022 * k * shove + 0.012 * k * out.breath;
  out.shift += 0.1 * k * rock * Math.sin(slow);
  out.roll += 0.05 * rock * Math.sin(slow + 0.6);
  out.sway += -0.05 * k * rock * Math.sin(slow - 0.5);
  const side = hash(seed * 9.1 + turn) > 0.5 ? 1 : -1;
  out.bend += 0.035 * Math.sin(seconds * 0.9 * q + seed * 21) + 0.1 * up * side;
  // The head sweeps the mud while it is down, is carried a little while it walks and nods late on each fore foot, and comes right up when it looks.
  const sweep = 0.34 * Math.sin(seconds * 1.45 * q + seed * 11) + 0.13 * Math.sin(seconds * 3.1 * q + seed * 3);
  out.headYaw = (0.4 + 0.6 * plan.root) * (1 - up) * (1 - 0.5 * walking) * sweep + up * (0.45 * side * Math.sin(seconds * 1.3 + seed * 4) + 0.2 * side) - 2.2 * w.yaw + 0.25 * rock * Math.sin(slow - 0.9);
  out.headPitch = plan.hang - 0.6 * up - 0.2 * walking + 0.09 * shove - 0.9 * w.fore * walking + 0.04 * Math.sin(seconds * 1.9 * q + seed * 5);
  out.splay = 0.55 + 0.25 * shove;
  for (let f = 0; f < FEELERS; f++) {
    const rate = 2.6 + 2.4 * hash(f * 7.3 + seed);
    const a = seconds * rate + f * 2.4 + seed * 31;
    out.curl[f] = 0.95 + 0.36 * Math.sin(a) + 0.14 * Math.sin(a * 2.3 + 1) + 0.3 * shove - 0.2 * up;
  }
  return out;
}
