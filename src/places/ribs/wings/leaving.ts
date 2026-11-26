// One that leaves the flats before the wall: it stands with its sails drawn in, dips and leans ahead as it opens them, pushes off both
// legs on the first down stroke, and trails its legs once it is a wing's length up. A pose of the flier's body from the time alone.
import type { Flying } from './flier';
import { footOf } from './flier';

export interface Leaver {
  /** Where it stands, and the ground there. */
  x: number;
  z: number;
  bed: number;
  /** The way it leaves (0 along z) and the speed it comes to, metres a second. */
  yaw: number;
  speed: number;
  /** When its feet leave the ground, seconds of the place. */
  t: number;
  size: number;
  seed: number;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How fast it gathers way, metres a second each second, and what it leaves the ground with. */
const GATHER = 12;
const OFF = 1.5;
/** The push: the legs go straight under it in this long, and only then do the feet leave. */
const PUSH = 0.14;

/** Metres gone along its way, `tau` seconds after its feet left. */
export const gone = (l: Leaver, tau: number): number => {
  if (tau <= 0) return 0;
  const full = (l.speed - OFF) / GATHER;
  return tau < full ? OFF * tau + 0.5 * GATHER * tau * tau : OFF * full + 0.5 * GATHER * full * full + l.speed * (tau - full);
};

/** The pose of a leaver at `seconds`, into `out`. Returns the seconds since its feet left (negative while it stands). */
export const leaving = (l: Leaver, seconds: number, out: Flying): number => {
  const tau = seconds - l.t;
  // The dip before the lift, and the lean ahead with it.
  const dip = smooth(-0.75, -0.16, tau) * (1 - smooth(-0.04, PUSH, tau));
  const onGround = Math.min(tau, PUSH);
  const legsDown = (t: number): number => 1 - 0.3 * smooth(-0.75, -0.16, t) * (1 - smooth(-0.04, PUSH, t)) + 0.1 * smooth(-0.04, PUSH, t);
  const pitchAt = (t: number): number => 0.1 - 0.24 * smooth(-0.75, -0.16, t) * (1 - smooth(-0.04, PUSH, t)) + 0.5 * smooth(-0.02, 0.3, t) * (1 - 0.8 * smooth(0.35, 1.5, t));
  const pitch = pitchAt(tau);
  // On the ground its feet hold their place under it: the shoulders stand where the legs and the lean put them.
  const foot = footOf(legsDown(onGround));
  const lean = pitchAt(onGround);
  const stand = -(foot[0] * Math.sin(lean) + foot[1] * Math.cos(lean)) * l.size;
  const air = Math.max(0, tau - PUSH);
  const rise = (1.3 + 0.7 * l.seed) * l.size * (1 - Math.exp(-air * 2.2)) + 0.5 * air + 0.25 * Math.sin(air * (1.1 + 0.6 * l.seed) + l.seed * 9) * smooth(0.5, 1.5, air);
  // Shifting its weight while it waits: it rocks, each in its own time.
  const rock = tau < 0 ? 0.03 * Math.sin(seconds * (1.3 + 0.9 * l.seed) + l.seed * 30) * (1 - dip) : 0;
  const d = gone(l, tau);
  out.x = l.x + Math.sin(l.yaw) * d;
  out.z = l.z + Math.cos(l.yaw) * d;
  out.y = l.bed + stand + rise;
  out.yaw = l.yaw;
  out.pitch = pitch + rock;
  out.roll = 0.06 * Math.sin(seconds * (0.8 + 0.5 * l.seed) + l.seed * 17) * smooth(0.3, 1.2, tau);
  out.size = l.size;
  out.tone = 0.86 + 0.24 * l.seed;
  // The sails come out and up as it dips; the first stroke down is the push, and the strokes slow as it gathers way.
  out.drawn = 1 - smooth(-0.6, -0.08, tau);
  out.deep = smooth(-0.6, -0.05, tau);
  out.stroke = tau < 0 ? -0.5 * (1 - smooth(-0.6, 0, tau)) : (8.2 + 2.2 * l.seed) * tau + 3.4 * (1 - Math.exp(-tau * 1.6));
  out.legs = tau < PUSH ? legsDown(tau) : 1.1 * (1 - smooth(PUSH, 0.75 + 0.3 * l.seed, tau));
  return tau;
};
