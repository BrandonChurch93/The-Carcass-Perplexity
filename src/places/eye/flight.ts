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

export function flight(frame: number, plan: FlightPlan): FlightState {
  const tilt = -plan.keyPitch * RAD;
  const reach = plan.keyHeight / Math.sin(tilt);
  const target = plan.keyDistance - reach * Math.cos(tilt);
  const keyHalf = reach * Math.tan((plan.keyFov * RAD) / 2);
  const slow = -plan.creep / plan.fps / reach;
  const fast = plan.climbPerFrame;
  const span = plan.riseFrame - plan.keyFrame;
  const blend = (2 * (fast * span - Math.log(plan.halfHeight / keyHalf))) / (fast - slow);
  const since = frame - plan.keyFrame;
  const logHalf = since >= blend ? Math.log(plan.halfHeight) + fast * (frame - plan.riseFrame) : Math.log(keyHalf) + slow * since + (fast - slow) * blend * ramp(since / blend);
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
