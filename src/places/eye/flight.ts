export interface FlightPlan {
  keyFrame: number;
  riseFrame: number;
  fps: number;
  keyHeight: number;
  keyDistance: number;
  keyPitch: number;
  keyFov: number;
  endFov: number;
  creep: number;
  settle: number;
  easeIn: number;
  easeOut: number;
  climbPerFrame: number;
  halfHeight: number;
}

export interface FlightState {
  y: number;
  z: number;
  sin: number;
  cos: number;
  fov: number;
  half: number;
}

const RAD = Math.PI / 180;

const smoother = (t: number): number => {
  const u = Math.min(1, Math.max(0, t));
  return u * u * u * (u * (u * 6 - 15) + 10);
};

const ramp = (x: number): number => (x >= 1 ? x - 0.5 : x <= 0 ? 0 : x ** 4 * (x * x - 3 * x + 2.5));

/**
 * The move up to this many frames after the key is the one that was judged, with the numbers it had then: the lens creeps in over the
 * shallows toward the centre. Every sample of the last judged frame, 115 after the key, lies before it. From there on the climb is restaged (LEAVE below) and the numbers of handoff.json steer only the new part.
 */
const JUDGED_FRAMES = 116;
const JUDGED_HALF = 212;
const JUDGED_CLIMB = 0.006;

function judged(frame: number, plan: FlightPlan): FlightState {
  const tilt = -plan.keyPitch * RAD;
  const reach = plan.keyHeight / Math.sin(tilt);
  const target = plan.keyDistance - reach * Math.cos(tilt);
  const keyHalf = reach * Math.tan((plan.keyFov * RAD) / 2);
  const slow = -plan.creep / plan.fps / reach;
  const fast = JUDGED_CLIMB;
  const span = plan.riseFrame - plan.keyFrame;
  const blend = (2 * (fast * span - Math.log(JUDGED_HALF / keyHalf))) / (fast - slow);
  const since = frame - plan.keyFrame;
  const logHalf = since >= blend ? Math.log(JUDGED_HALF) + fast * (frame - plan.riseFrame) : Math.log(keyHalf) + slow * since + (fast - slow) * blend * ramp(since / blend);
  const half = Math.exp(logHalf);
  const run = span - plan.settle;
  const u = Math.min(1, Math.max(0, since / run));
  const endTan = Math.tan((plan.endFov * RAD) / 2);
  const low = (plan.keyHeight * endTan) / keyHalf;
  const y = (half / endTan) * (low + (1 - low) * smoother(u));
  if (u >= 1) return { y, z: 0, sin: 1, cos: 0, fov: plan.endFov, half };
  const top = 1 / (1 - (plan.easeIn + plan.easeOut) / 2);
  const along = u < plan.easeIn ? top * plan.easeIn * ramp(u / plan.easeIn) : u > 1 - plan.easeOut ? 1 - top * plan.easeOut * ramp((1 - u) / plan.easeOut) : top * (plan.easeIn / 2 + u - plan.easeIn);
  const drift = ((plan.creep * Math.cos(tilt)) / plan.fps) * (run / plan.keyDistance) * u * (1 - u) ** 3 * (1 + 3 * u);
  const z = plan.keyDistance * (1 - along - drift);
  const aim = target * (1 - smoother(u / 0.5));
  const d = Math.hypot(y, z - aim);
  return { y, z, sin: y / d, cos: (z - aim) / d, fov: (2 * Math.atan(half / d)) / RAD, half };
}

/**
 * The climb off the lake, from the last judged frame to the cut. One crane move: the lens rises fast with the foot of the north cliffs
 * held at the top edge of the frame, so the far shore and the cliff stay in view at a slant until the cloud takes them. Only inside the
 * banks does it turn straight down, and it eases to the slow rate the rise begins with: the lake is never seen bare from straight above.
 * Frames are counted from the key.
 */
const LEAVE = {
  /** The ground line held at the top edge while the shore is in view, metres north of the centre. */
  hold: 1180,
  /** The nearer line the top edge is brought down to between these frames, inside the far shore: the cliffs and the rim leave by the top of the frame before the lens is high. */
  near: 560,
  lower: [164, 240],
  /** Frames over which the old tilt is caught and brought onto that line. */
  catch: 28,
  /** Between these frames the lens lets the far shore go and turns straight down. */
  release: [258, 314],
  /** The frame at which the lens stands over the centre, and the frame at which the lens is as wide as it gets. */
  over: 279,
  wide: 259,
};

function eased(s: number, p0: number, v0: number, p1: number, v1: number): number {
  const s2 = s * s;
  const s3 = s2 * s;
  const s4 = s3 * s;
  const s5 = s4 * s;
  return (1 - 10 * s3 + 15 * s4 - 6 * s5) * p0 + (s - 6 * s3 + 8 * s4 - 3 * s5) * v0 + (-4 * s3 + 7 * s4 - 3 * s5) * v1 + (10 * s3 - 15 * s4 + 6 * s5) * p1;
}

/** From p0 at f0, moving v0 a frame, to p1 at f1, moving v1 a frame, with no jolt at either end; past f1 it keeps v1. */
function run(f: number, f0: number, f1: number, p0: number, v0: number, p1: number, v1: number): number {
  const n = f1 - f0;
  const s = Math.min(1, Math.max(0, (f - f0) / n));
  return eased(s, p0, v0 * n, p1, v1 * n) + Math.max(0, f - f1) * v1;
}

export function flight(frame: number, plan: FlightPlan): FlightState {
  const from = plan.keyFrame + JUDGED_FRAMES;
  if (frame <= from) return judged(frame, plan);
  const a = judged(from, plan);
  const b = judged(from + 1, plan);
  const endTan = Math.tan((plan.endFov * RAD) / 2);
  const top = (s: FlightState): number => Math.atan2(s.sin, s.cos) - (s.fov * RAD) / 2;
  const y = Math.exp(run(frame, from, plan.riseFrame, Math.log(a.y), Math.log(b.y / a.y), Math.log(plan.halfHeight / endTan), plan.climbPerFrame));
  const over = plan.keyFrame + LEAVE.over;
  const z = frame < over ? run(frame, from, over, a.z, b.z - a.z, 0, 0) : 0;
  const wide = plan.keyFrame + LEAVE.wide;
  const fov = frame < wide ? run(frame, from, wide, a.fov, b.fov - a.fov, plan.endFov, 0) : plan.endFov;
  // The top edge of the frame, by the distance at which it meets the water: caught from where the judged move left it and held on the foot of the north cliffs.
  const far = (s: FlightState): number => Math.log(s.y / Math.tan(top(s)) / (s.z + LEAVE.hold));
  const caught = frame < from + LEAVE.catch ? run(frame, from, from + LEAVE.catch, far(a), far(b) - far(a), 0, 0) : 0;
  const line = run(frame, plan.keyFrame + (LEAVE.lower[0] as number), plan.keyFrame + (LEAVE.lower[1] as number), LEAVE.hold, 0, LEAVE.near, 0);
  const held = Math.atan2(y, (z + line) * Math.exp(caught)) + (fov * RAD) / 2;
  const down = smoother((frame - plan.keyFrame - (LEAVE.release[0] as number)) / ((LEAVE.release[1] as number) - (LEAVE.release[0] as number)));
  const pitch = held + (Math.PI / 2 - held) * down;
  const sin = down >= 1 ? 1 : Math.sin(pitch);
  const cos = down >= 1 ? 0 : Math.cos(pitch);
  return { y, z, sin, cos, fov, half: (y / Math.max(sin, 1e-6)) * Math.tan((fov * RAD) / 2) };
}
