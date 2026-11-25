// The course of the river: from deep in the tube, over the lip, down the foot of the wall to the lake.
// Everything in this folder that needs to know where the lava is reads it from here.
import { MOUTH, lerp, smooth } from '../layout';
import { FALL_FOOT } from '../shared/anchors';

/** The tube behind the mouth. `d` is metres behind the lip, along -z. */
export const TUBE = {
  lipZ: MOUTH.z - 4,
  depth: 190,
  floor: MOUTH.floor + 0.7,
  /** The arch is a superellipse of this power: flatter than a circle, as a drained lava tube is. */
  power: 2.5,
  /** The rim flares like the bell of a horn: the first ten metres are a bevel that faces out, and it is what the river lights. */
  half: (d: number): number => lerp(MOUTH.width / 2 - 11, 39, smooth(0, 95, d)) + 11 * Math.exp(-Math.max(d, 0) / 7),
  crown: (d: number): number => lerp(MOUTH.height - 11, 41, smooth(0, 110, d)) + 11 * Math.exp(-Math.max(d, 0) / 7),
  /** The tube bends west as it goes in, so the east wall closes the view from the bench. */
  axis: (d: number): number => MOUTH.x - 58 * smooth(25, 200, d) * smooth(25, 200, d),
};

/** The window the tube is seen through: a plane that leans back with the cliff. A point is behind it when `windowSide` is negative. */
const LEAN = 0.25;
const WL = Math.hypot(1, LEAN);
export const WINDOW = { normal: [0, LEAN / WL, 1 / WL] as [number, number, number], offset: -((MOUTH.floor * LEAN) / WL + (TUBE.lipZ + 8) / WL) };
export const windowSide = (y: number, z: number): number => WINDOW.normal[1] * y + WINDOW.normal[2] * z + WINDOW.offset;

export interface Channel {
  readonly n: number;
  readonly x: Float32Array;
  readonly z: Float32Array;
  /** Metres along the course. Zero at the lip, negative inside the tube. */
  readonly len: Float32Array;
  /** Seconds the lava takes to get here from the lip. */
  readonly tau: Float32Array;
  /** Half the width of the stream, metres. */
  readonly half: Float32Array;
  /** Metres a second. */
  readonly speed: Float32Array;
  /** Height of the surface of the stream. */
  readonly y: Float32Array;
}

function spline(points: [number, number][], spacing: number): [number, number][] {
  const fine: [number, number][] = [];
  const at = (i: number): [number, number] => points[Math.min(points.length - 1, Math.max(0, i))] as [number, number];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < 24; k++) {
      const t = k / 24;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      fine.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  fine.push(at(points.length - 1));
  // Resample at an even spacing.
  const out: [number, number][] = [fine[0] as [number, number]];
  let carried = 0;
  for (let i = 1; i < fine.length; i++) {
    const a = fine[i - 1] as [number, number];
    const b = fine[i] as [number, number];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let s = spacing - carried;
    while (s <= l) {
      out.push([lerp(a[0], b[0], s / l), lerp(a[1], b[1], s / l)]);
      s += spacing;
    }
    carried = (carried + l) % spacing;
  }
  return out;
}

function table(rows: [number, number][], at: number): number {
  const first = rows[0] as [number, number];
  if (at <= first[0]) return first[1];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1] as [number, number];
    const b = rows[i] as [number, number];
    if (at <= b[0]) return lerp(a[1], b[1], smooth(a[0], b[0], at));
  }
  return (rows[rows.length - 1] as [number, number])[1];
}

const SPACING = 0.5;
// The stream leaves the floor where the wall under it begins, which is further back on the west side.
const LIP: [number, number] = [MOUTH.x - 22, TUBE.lipZ - 4];

/** The river inside the tube keeps to the west of its axis. */
const inside = (d: number): [number, number] => [TUBE.axis(d) - 16 + 6 * Math.sin(d * 0.045 + 1), TUBE.lipZ - d];

const MAIN: [number, number][] = [
  inside(196),
  inside(165),
  inside(135),
  inside(105),
  inside(78),
  inside(54),
  inside(34),
  inside(16),
  LIP,
  [-50, -447],
  [-46, -437],
  [-38, -428],
  [-32, -418],
  [-35, -408],
  [-44, -399],
  [-51, -389],
  [-50, -379],
  [-43, -370],
  [-37, -360],
  [-36, -349],
  [-36, -338],
  [FALL_FOOT[0], FALL_FOOT[1]],
  [FALL_FOOT[0] + 2, FALL_FOOT[1] + 14],
];

/** The west arm of the braid. It leaves the main stream at `BRAID_FROM` metres from the lip. */
export const BRAID_FROM = 80;
const ARM_TAIL: [number, number][] = [
  [-58, -381],
  [-63, -370],
  [-63, -358],
  [-60, -346],
  [-59, -334],
  [-58, -322],
];

/** The benches of the main stream and of the arm: the run of each, and of the cascade off its end, metres. */
const MAIN_STEPS: [number, number][] = [
  [1, 12.5],
  [9, 4.5],
  [14, 6],
  [9, 4],
  [15, 5.5],
  [12, 5],
  [14, 5],
  [12, 4],
  [10, 4],
];
const ARM_STEPS: [number, number][] = [
  [9, 4.5],
  [11, 4],
  [10, 4],
];

/** Metres from the lip at which the slope eases and the stream spreads into its fan. */
export const FAN_FROM = 100;

/** Width of the stream by metres from the lip. */
const HALF: [number, number][] = [
  [-200, 9],
  [-40, 11],
  [0, 12],
  [14, 8.5],
  [60, 6.5],
  [100, 7],
  [FAN_FROM, 8.5],
  [FAN_FROM + 12, 17],
  [FAN_FROM + 30, 29],
  [FAN_FROM + 56, 38],
];

/** Metres the stream stands above the ground it has built on, at the head of a bench. */
const PERCH = 1.3;

/**
 * The stream does not follow the slope: it has built benches on it, runs slowly along each and drops off its end in a cascade.
 * `steps` is the run of each bench and of the cascade after it, metres. `y0` is the height where the staircase starts, at sample `lip`.
 */
function build(points: [number, number][], lip: number, len0: number, tau0: number, half: (len: number) => number, height: (x: number, z: number) => number, y0: number, steps: [number, number][], falls: number[]): Channel {
  const p = spline(points, SPACING);
  const n = p.length;
  const c = { n, x: new Float32Array(n), z: new Float32Array(n), len: new Float32Array(n), tau: new Float32Array(n), half: new Float32Array(n), speed: new Float32Array(n), y: new Float32Array(n) };
  const ground = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    c.x[i] = (p[i] as [number, number])[0];
    c.z[i] = (p[i] as [number, number])[1];
    c.len[i] = len0 + (i - lip) * SPACING;
    c.half[i] = half(c.len[i] as number);
  }
  // The ground under the stream is the highest ground under its whole width, or the slope would bury its uphill half.
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)] as [number, number];
    const b = p[Math.min(n - 1, i + 1)] as [number, number];
    const run = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ax = -(b[1] - a[1]) / run;
    const az = (b[0] - a[0]) / run;
    let top = -0.4;
    for (const k of i < lip ? [0] : [-1, -0.5, 0, 0.5, 1]) top = Math.max(top, height((c.x[i] as number) + ax * k * (c.half[i] as number), (c.z[i] as number) + az * k * (c.half[i] as number)));
    ground[i] = top;
  }
  for (let i = lip; i >= 0; i--) c.y[i] = y0 + 0.012 * (lip - i) * SPACING;
  let i = lip;
  let stepAt = 0;
  while (i < n - 1) {
    const [tread, run] = steps[Math.min(stepAt, steps.length - 1)] as [number, number];
    stepAt++;
    const end = Math.min(n - 1, i + Math.round(tread / SPACING));
    for (let k = i + 1; k <= end; k++) {
      const low = smooth(3, 0, ground[k] as number);
      c.y[k] = Math.max((c.y[k - 1] as number) - lerp(0.34, 0.14, low) * SPACING, (ground[k] as number) + lerp(0.5, PERCH, smooth(2, 14, ground[k] as number)), 0.12);
    }
    i = end;
    if (i >= n - 1) break;
    const foot = Math.min(n - 1, i + Math.round(run / SPACING));
    const target = (ground[foot] as number) + lerp(0.5, PERCH, smooth(2, 14, ground[foot] as number));
    const top = c.y[i] as number;
    if (top - target < 2.5 || (c.len[i] as number) > FAN_FROM - 6) continue;
    falls.push(c.len[Math.round(0.5 * (i + foot))] as number);
    for (let k = i + 1; k <= foot; k++) {
      const t = (k - i) / (foot - i);
      c.y[k] = Math.max(lerp(top, target, t * t * (3 - 2 * t)), (ground[k] as number) + 0.5);
    }
    i = foot;
  }
  // Speed from the slope of the stream, smoothed over a few metres: 5 m/s on a bench, 15 down the steepest cascade.
  const raw = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const a = Math.max(0, k - 3);
    const b = Math.min(n - 1, k + 3);
    const slope = Math.max(0, (c.y[a] as number) - (c.y[b] as number)) / ((b - a) * SPACING);
    raw[k] = (c.len[k] as number) < 0 ? 5 : 5 + 10 * smooth(0.04, 1.3, slope);
  }
  for (let i = 0; i < n; i++) {
    let s = 0;
    let w = 0;
    for (let k = -7; k <= 7; k++) {
      const j = Math.min(n - 1, Math.max(0, i + k));
      s += raw[j] as number;
      w++;
    }
    c.speed[i] = s / w;
  }
  c.tau[lip] = tau0;
  // The seconds are counted along the stream as it really runs, down its slope.
  for (let i = lip + 1; i < n; i++) c.tau[i] = (c.tau[i - 1] as number) + Math.hypot(SPACING, (c.y[i] as number) - (c.y[i - 1] as number)) / (0.5 * ((c.speed[i] as number) + (c.speed[i - 1] as number)));
  for (let i = lip - 1; i >= 0; i--) c.tau[i] = (c.tau[i + 1] as number) - SPACING / (0.5 * ((c.speed[i] as number) + (c.speed[i + 1] as number)));
  // A cascade is narrower than the pool above it.
  for (let i = 0; i < n; i++) c.half[i] = (c.half[i] as number) * (1.2 - 0.42 * smooth(5.5, 12, c.speed[i] as number));
  return c;
}

export interface Course {
  readonly main: Channel;
  readonly arm: Channel;
  /** Metres from the lip to the end of the main stream. */
  readonly length: number;
  /** Metres from the lip of the middle of each cascade of the main stream. */
  readonly falls: number[];
  /** The nearest point of either stream. `toward` is the unit vector on the ground from the point to the stream. */
  nearest(x: number, z: number): { distance: number; len: number; tau: number; half: number; speed: number; side: number; arm: boolean; y: number; toward: [number, number] };
  /** A point of the main stream by metres from the lip: position on the ground plane, direction, speed. */
  at(len: number): { x: number; z: number; dx: number; dz: number; speed: number; tau: number; half: number };
}

export function createCourse(height: (x: number, z: number) => number): Course {
  const mainPoints = spline(MAIN, SPACING);
  let lip = 0;
  let best = Infinity;
  mainPoints.forEach((p, i) => {
    const d = Math.hypot(p[0] - LIP[0], p[1] - LIP[1]);
    if (d < best) {
      best = d;
      lip = i;
    }
  });
  const falls: number[] = [];
  const main = build(MAIN, lip, 0, 0, (len) => table(HALF, len), height, TUBE.floor, MAIN_STEPS, falls);
  const fork = Math.min(main.n - 1, lip + Math.round(BRAID_FROM / SPACING));
  const armPoints: [number, number][] = [[main.x[fork - 12] as number, main.z[fork - 12] as number], [main.x[fork] as number, main.z[fork] as number], ...ARM_TAIL];
  // The arm starts 12 samples up the main stream so that it leaves along it.
  const arm = build(armPoints, 12, BRAID_FROM, main.tau[fork] as number, (len) => lerp(3.2, 22, smooth(BRAID_FROM + 12, BRAID_FROM + 42, len)), height, main.y[fork] as number, ARM_STEPS, []);
  for (let i = 0; i < 12; i++) arm.y[i] = main.y[fork - 12 + i] as number;
  const length = main.len[main.n - 1] as number;

  const scan = (c: Channel, x: number, z: number, from: number): { i: number; d2: number } => {
    let bi = from;
    let bd = Infinity;
    for (let i = from; i < c.n; i += 4) {
      const dx = (c.x[i] as number) - x;
      const dz = (c.z[i] as number) - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bd) {
        bd = d2;
        bi = i;
      }
    }
    for (let i = Math.max(from, bi - 4); i <= Math.min(c.n - 1, bi + 4); i++) {
      const dx = (c.x[i] as number) - x;
      const dz = (c.z[i] as number) - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bd) {
        bd = d2;
        bi = i;
      }
    }
    return { i: bi, d2: bd };
  };

  return {
    main,
    arm,
    length,
    falls,
    nearest: (x, z) => {
      const a = scan(main, x, z, 0);
      const b = scan(arm, x, z, 12);
      // Compare by how far outside each stream the point is, so the narrow arm is not swallowed by the wide one.
      const da = Math.sqrt(a.d2) - (main.half[a.i] as number);
      const db = Math.sqrt(b.d2) - (arm.half[b.i] as number);
      const useArm = db < da;
      const c = useArm ? arm : main;
      const near = useArm ? b.i : a.i;
      // Between the samples: the foot of the perpendicular on the nearer of the two segments that meet at the nearest sample.
      let i = near;
      let f = 0;
      let d2 = Infinity;
      for (const k of [Math.max(0, near - 1), Math.min(c.n - 2, near)]) {
        const ax = c.x[k] as number;
        const az = c.z[k] as number;
        const sx = (c.x[k + 1] as number) - ax;
        const sz = (c.z[k + 1] as number) - az;
        const t = Math.min(1, Math.max(0, ((x - ax) * sx + (z - az) * sz) / (sx * sx + sz * sz || 1)));
        const qx = ax + sx * t - x;
        const qz = az + sz * t - z;
        if (qx * qx + qz * qz < d2) {
          d2 = qx * qx + qz * qz;
          i = k;
          f = t;
        }
      }
      const j = i + 1;
      const px = lerp(c.x[i] as number, c.x[j] as number, f);
      const pz = lerp(c.z[i] as number, c.z[j] as number, f);
      const tx = (c.x[j] as number) - (c.x[i] as number);
      const tz = (c.z[j] as number) - (c.z[i] as number);
      const side = tx * (z - pz) - tz * (x - px) > 0 ? 1 : -1;
      const distance = Math.sqrt(d2);
      const far = Math.max(distance, 1e-3);
      const toward: [number, number] = [(px - x) / far, (pz - z) / far];
      const mixed = (v: Float32Array): number => lerp(v[i] as number, v[j] as number, f);
      return { distance, len: mixed(c.len), tau: mixed(c.tau), half: mixed(c.half), speed: mixed(c.speed), side, arm: useArm, y: mixed(c.y), toward };
    },
    at: (len) => {
      const f = Math.min(main.n - 1.001, Math.max(0, lip + len / SPACING));
      const i = Math.floor(f);
      const u = f - i;
      const j = Math.min(main.n - 1, i + 1);
      const dx = (main.x[j] as number) - (main.x[i] as number);
      const dz = (main.z[j] as number) - (main.z[i] as number);
      const l = Math.hypot(dx, dz) || 1;
      return {
        x: lerp(main.x[i] as number, main.x[j] as number, u),
        z: lerp(main.z[i] as number, main.z[j] as number, u),
        dx: dx / l,
        dz: dz / l,
        speed: lerp(main.speed[i] as number, main.speed[j] as number, u),
        tau: lerp(main.tau[i] as number, main.tau[j] as number, u),
        half: lerp(main.half[i] as number, main.half[j] as number, u),
      };
    },
  };
}
