// How a kite-wing walks: a way over the ground, and for every metre gone along it where each foot is. A foot stands on its own place
// of the ground while the body passes over it, then is carried to its next place: nothing here knows the time, only how far the animal has come.

/** A way: where it is at `s0` metres along, heading `yaw` there, and its pieces from there on as [metres, turn in radians a metre]. */
export interface Way {
  x: number;
  z: number;
  yaw: number;
  s0: number;
  pieces: [number, number][];
  /** A closed way comes back to (x, z, yaw) after its pieces and goes round again. */
  closed: boolean;
}
export interface At {
  x: number;
  z: number;
  yaw: number;
}

export function wayAt(way: Way, s: number, out: At): void {
  let d = s - way.s0;
  let x = way.x;
  let z = way.z;
  let yaw = way.yaw;
  if (way.closed) {
    let total = 0;
    for (const p of way.pieces) total += p[0];
    d = ((d % total) + total) % total;
  }
  const go = (far: number, turn: number): void => {
    if (Math.abs(turn) < 1e-6) {
      x += Math.sin(yaw) * far;
      z += Math.cos(yaw) * far;
    } else {
      const to = yaw + turn * far;
      x -= (Math.cos(to) - Math.cos(yaw)) / turn;
      z += (Math.sin(to) - Math.sin(yaw)) / turn;
      yaw = to;
    }
  };
  if (d < 0) {
    go(d, (way.pieces[0] as [number, number])[1]);
  } else {
    for (let i = 0; i < way.pieces.length && d > 0; i++) {
      const p = way.pieces[i] as [number, number];
      const far = i === way.pieces.length - 1 && !way.closed ? d : Math.min(d, p[0]);
      go(far, p[1]);
      d -= far;
    }
  }
  out.x = x;
  out.z = z;
  out.yaw = yaw;
}

/** The part of a stride, either side of the moment the body is over the foot, that the foot stands: in step lengths. */
export const STANDS = 0.62;

export interface Step {
  /** Where the foot is over the ground, the way its toes point. */
  x: number;
  z: number;
  yaw: number;
  /** 0 standing; 0 to 1 through its carry. */
  carry: number;
  /** Standing: below 0 just set down and settling, 0 flat under the weight, to 1 as the body goes off it and the ankle comes up over the toes. */
  roll: number;
}

/**
 * Where a foot is when the animal is `s` metres along its way. The left foot (0) stands at 0, 2, 4 step lengths, the right (1) at 1, 3, 5:
 * each stands while the hips are within STANDS of a step length of it and is carried the two step lengths to its next place while they go
 * the rest. `half` is half the width of the track; `nudge(n)` moves the nth place a little, [ahead, aside], so that no two prints are alike.
 */
export function footAt(way: Way, leg: number, s: number, step: number, half: number, nudge: (n: number, out: [number, number]) => void, out: Step): void {
  const c = (s - leg * step) / (2 * step);
  const n = Math.round(c);
  const d = (c - n) * 2 * step;
  let from = n;
  let u = 0;
  if (d > STANDS * step) u = (d - STANDS * step) / ((2 - 2 * STANDS) * step);
  else if (d < -STANDS * step) {
    from = n - 1;
    u = 0.5 + (d + step) / ((2 - 2 * STANDS) * step);
  }
  const at: At = { x: 0, z: 0, yaw: 0 };
  const off: [number, number] = [0, 0];
  const place = (k: number, o: At): void => {
    nudge(k * 2 + leg, off);
    wayAt(way, (2 * k + leg) * step + off[0], o);
    const side = (leg === 0 ? 1 : -1) * (half + off[1]);
    o.x += -Math.cos(o.yaw) * side;
    o.z += Math.sin(o.yaw) * side;
  };
  place(from, at);
  out.roll = 0;
  if (u <= 0) {
    out.x = at.x;
    out.z = at.z;
    out.yaw = at.yaw;
    out.carry = 0;
    const late = Math.min(1, Math.max(0, (d / step - 0.18) / (STANDS - 0.18)));
    const early = Math.min(1, Math.max(0, (-d / step - STANDS + 0.2) / 0.2));
    out.roll = late * late * (3 - 2 * late) - early * early;
    return;
  }
  const to: At = { x: 0, z: 0, yaw: 0 };
  place(from + 1, to);
  // Picked up slowly, swung through fast, set down slowly.
  const e = u * u * u * (u * (u * 6 - 15) + 10);
  out.x = at.x + (to.x - at.x) * e;
  out.z = at.z + (to.z - at.z) * e;
  out.yaw = at.yaw + (to.yaw - at.yaw) * e;
  out.carry = u;
}

/** A ramp from 0 to 1 that picks up over its first fifth and slows over its last: a walk begun and ended, even between. */
export function ramp(u: number, k = 0.2): number {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const top = 1 / (1 - k);
  if (u < k) return (0.5 * top * u * u) / k;
  if (u > 1 - k) return 1 - (0.5 * top * (1 - u) * (1 - u)) / k;
  return top * (u - 0.5 * k);
}
