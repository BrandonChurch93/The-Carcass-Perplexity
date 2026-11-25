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
  half: (d: number): number => lerp(MOUTH.width / 2, 39, smooth(0, 95, d)),
  crown: (d: number): number => lerp(MOUTH.height, 41, smooth(0, 110, d)),
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
const LIP: [number, number] = [MOUTH.x - 22, TUBE.lipZ];

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
  [-45, -439],
  [-39, -431],
  [-36, -422],
  [-39, -413],
  [-46, -404],
  [-52, -394],
  [-56, -384],
  [-57, -374],
  [-55, -365],
  [-50, -356],
  [-44, -347],
  [-39, -338],
  [FALL_FOOT[0], FALL_FOOT[1]],
  [FALL_FOOT[0] + 2, FALL_FOOT[1] + 14],
];

/** The west arm of the braid. It leaves the main stream at `BRAID_FROM` metres from the lip. */
export const BRAID_FROM = 104;
const ARM_TAIL: [number, number][] = [
  [-63, -362],
  [-70, -351],
  [-73, -340],
  [-71, -329],
  [-68, -317],
];

/** Width of the stream by metres from the lip. */
const HALF: [number, number][] = [
  [-200, 9],
  [-40, 11],
  [0, 12],
  [14, 6.5],
  [60, 5],
  [100, 5.5],
  [130, 7.5],
  [150, 12],
  [172, 22],
];

function build(points: [number, number][], lip: number, len0: number, tau0: number, half: (len: number) => number, height: (x: number, z: number) => number): Channel {
  const p = spline(points, SPACING);
  const n = p.length;
  const c = { n, x: new Float32Array(n), z: new Float32Array(n), len: new Float32Array(n), tau: new Float32Array(n), half: new Float32Array(n), speed: new Float32Array(n) };
  for (let i = 0; i < n; i++) {
    c.x[i] = (p[i] as [number, number])[0];
    c.z[i] = (p[i] as [number, number])[1];
    c.len[i] = len0 + (i - lip) * SPACING;
    c.half[i] = half(c.len[i] as number);
  }
  // Speed from the slope of the ground under the stream, smoothed over a few metres: 5 m/s on the flat, 15 on the steepest pitch.
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 6);
    const b = Math.min(n - 1, i + 6);
    const drop = height(c.x[a] as number, c.z[a] as number) - height(c.x[b] as number, c.z[b] as number);
    const slope = Math.max(0, drop) / ((b - a) * SPACING);
    raw[i] = (c.len[i] as number) < 0 ? 5 : 5 + 10 * smooth(0.05, 1.1, slope);
  }
  for (let i = 0; i < n; i++) {
    let s = 0;
    let w = 0;
    for (let k = -16; k <= 16; k++) {
      const j = Math.min(n - 1, Math.max(0, i + k));
      s += raw[j] as number;
      w++;
    }
    c.speed[i] = s / w;
  }
  c.tau[lip] = tau0;
  for (let i = lip + 1; i < n; i++) c.tau[i] = (c.tau[i - 1] as number) + SPACING / (0.5 * ((c.speed[i] as number) + (c.speed[i - 1] as number)));
  for (let i = lip - 1; i >= 0; i--) c.tau[i] = (c.tau[i + 1] as number) - SPACING / (0.5 * ((c.speed[i] as number) + (c.speed[i + 1] as number)));
  return c;
}

export interface Course {
  readonly main: Channel;
  readonly arm: Channel;
  /** Metres from the lip to the end of the main stream. */
  readonly length: number;
  /** The nearest point of either stream. */
  nearest(x: number, z: number): { distance: number; len: number; tau: number; half: number; speed: number; side: number; arm: boolean };
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
  const main = build(MAIN, lip, 0, 0, (len) => table(HALF, len), height);
  const fork = Math.min(main.n - 1, lip + Math.round(BRAID_FROM / SPACING));
  const armPoints: [number, number][] = [[main.x[fork - 12] as number, main.z[fork - 12] as number], [main.x[fork] as number, main.z[fork] as number], ...ARM_TAIL];
  // The arm starts 12 samples up the main stream so that it leaves along it.
  const arm = build(armPoints, 12, BRAID_FROM, main.tau[fork] as number, (len) => lerp(3.2, 13, smooth(BRAID_FROM + 20, BRAID_FROM + 66, len)), height);
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
    nearest: (x, z) => {
      const a = scan(main, x, z, 0);
      const b = scan(arm, x, z, 12);
      // Compare by how far outside each stream the point is, so the narrow arm is not swallowed by the wide one.
      const da = Math.sqrt(a.d2) - (main.half[a.i] as number);
      const db = Math.sqrt(b.d2) - (arm.half[b.i] as number);
      const useArm = db < da;
      const c = useArm ? arm : main;
      const i = useArm ? b.i : a.i;
      const j = Math.min(c.n - 1, i + 1);
      const k = Math.max(0, i - 1);
      const tx = (c.x[j] as number) - (c.x[k] as number);
      const tz = (c.z[j] as number) - (c.z[k] as number);
      const side = tx * (z - (c.z[i] as number)) - tz * (x - (c.x[i] as number)) > 0 ? 1 : -1;
      return { distance: Math.sqrt(useArm ? b.d2 : a.d2), len: c.len[i] as number, tau: c.tau[i] as number, half: c.half[i] as number, speed: c.speed[i] as number, side, arm: useArm };
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
