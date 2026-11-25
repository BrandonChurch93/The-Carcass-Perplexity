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
  half: (d: number): number => lerp(MOUTH.width / 2 - 4, 44, smooth(0, 120, d)) + 4 * Math.exp(-Math.max(d, 0) / 7),
  crown: (d: number): number => lerp(MOUTH.height - 14, 36, smooth(0, 110, d)) + 4 * Math.exp(-Math.max(d, 0) / 7),
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
  // Down the ledges in legs: it drops over an edge straight toward the lake, then runs east and down along the ledge under it
  // to the next edge. No two legs are alike: a short drop and a long run, a long drop and a short run, and two of the bends are slow curves.
  [-55, -454],
  [-57, -450],
  [-50, -446.5],
  [-43, -443],
  [-38, -439],
  [-41, -432],
  [-46, -425],
  [-51, -418],
  [-47, -414],
  [-46, -410],
  [-50, -404],
  [-48, -399],
  [-41, -396],
  [-33, -393],
  [-29, -388],
  [-31, -382],
  [-35, -376],
  // From here it is the fan, and its middle runs straight to the foot.
  [-37, -368],
  [-38, -358],
  [-38, -348],
  [-37, -337],
  [FALL_FOOT[0], FALL_FOOT[1]],
  [FALL_FOOT[0] + 2, FALL_FOOT[1] + 13],
  [FALL_FOOT[0] + 3, FALL_FOOT[1] + 23],
];

/** Metres from the lip at which the slope eases and the stream spreads into its fan. */
export const FAN_FROM = 118;

/** The west arm of the fan. It leaves the main stream at `BRAID_FROM` metres from the lip. */
export const BRAID_FROM = FAN_FROM - 6;
const ARM_TAIL: [number, number][] = [
  [-46, -366],
  [-56, -354],
  [-63, -342],
  [-67, -331],
  [-69, -321],
];

/** Metres from the lip of the places where the stream parts round a rock and joins again. */
export const SPLITS = [16, 30, 47, 63, 77, 92];

/** Half the width of the stream by metres from the lip: a thread on the slope, a sheet only in the fan. */
const HALF: [number, number][] = [
  [-200, 6],
  [-70, 7],
  [-30, 11],
  [-3, 12],
  [5, 8],
  [13, 5.4],
  [22, 5],
  [FAN_FROM - 4, 5.6],
  [FAN_FROM + 8, 14],
  [FAN_FROM + 22, 28],
  [FAN_FROM + 40, 50],
  [FAN_FROM + 60, 74],
  [FAN_FROM + 78, 84],
];
const halfAt = (len: number): number => {
  let h = table(HALF, len) * (len > 14 && len < FAN_FROM - 4 ? 0.9 + 0.3 * Math.sin(len * 0.37 + 1.3) * Math.sin(len * 0.13) : 1);
  for (const at of SPLITS) h += 1.5 * Math.exp(-Math.pow((len - at) / 4.6, 2));
  return h;
};

const hash1 = (k: number, seed: number): number => {
  const v = Math.sin(k * 127.1 + seed * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * The stream comes down the apron in small drops: it runs a few metres on a tread that is flatter than the slope, then falls off its end.
 * `height` is the smooth surface of the apron. `y0` is the height at sample `lip`, where the count of metres is `len0`.
 */
function build(points: [number, number][], lip: number, len0: number, tau0: number, half: (len: number) => number, height: (x: number, z: number) => number, y0: number, falls: number[]): Channel {
  const p = spline(points, SPACING);
  const n = p.length;
  const c = { n, x: new Float32Array(n), z: new Float32Array(n), len: new Float32Array(n), tau: new Float32Array(n), half: new Float32Array(n), speed: new Float32Array(n), y: new Float32Array(n) };
  for (let i = 0; i < n; i++) {
    c.x[i] = (p[i] as [number, number])[0];
    c.z[i] = (p[i] as [number, number])[1];
    c.len[i] = len0 + (i - lip) * SPACING;
    c.half[i] = half(c.len[i] as number);
  }
  for (let i = lip; i >= 0; i--) c.y[i] = y0 + 0.012 * (lip - i) * SPACING;
  // Each tread and its drop: where it starts, how long it runs, how far it stands off the slope, how long its drop is.
  let from = 3;
  let before = 0;
  let k = 0;
  let period = 7.5 + 6 * hash1(k, 1);
  let rise = 1.2 + 2.6 * hash1(k, 2);
  let fall = 1.8 + 1.4 * hash1(k, 3);
  let next = 1.2 + 2.6 * hash1(k + 1, 2);
  const start = (c.y[lip] as number) - height(c.x[lip] as number, c.z[lip] as number);
  for (let i = lip + 1; i < n; i++) {
    const len = c.len[i] as number;
    while (len > from + period) {
      falls.push(from + period - 0.5 * fall);
      from += period;
      before = next;
      k++;
      period = 7.5 + 6 * hash1(k, 1);
      rise = next;
      fall = 1.8 + 1.4 * hash1(k, 3);
      next = 1.2 + 2.6 * hash1(k + 1, 2);
    }
    const t = (len - from) / period;
    const tread = 1 - fall / period;
    let off = len < 3 ? 0 : t < tread ? lerp(-0.5 * before, 0.5 * rise, t / tread) : lerp(0.5 * rise, -0.5 * next, smooth(tread, 1, t));
    off *= smooth(len0 + 1, len0 + 8, len) * smooth(FAN_FROM - 2, FAN_FROM - 12, len);
    const plane = height(c.x[i] as number, c.z[i] as number) + start * smooth(len0 + 6, len0, len);
    c.y[i] = Math.max(Math.min(c.y[i - 1] as number, plane + off), 0.12);
  }
  while (falls.length > 0 && (falls[falls.length - 1] as number) > FAN_FROM - 8) falls.pop();
  // Speed from the slope of the stream, smoothed over a few metres: 1.5 to 2 m/s on a tread, 6 down a drop.
  const raw = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const a = Math.max(0, k - 3);
    const b = Math.min(n - 1, k + 3);
    const slope = Math.max(0, (c.y[a] as number) - (c.y[b] as number)) / ((b - a) * SPACING);
    raw[k] = (c.len[k] as number) < 0 ? 1.6 : 1.4 + 4.6 * smooth(0.12, 1.3, slope);
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
  for (let i = 0; i < n; i++) c.half[i] = (c.half[i] as number) * (1.12 - 0.2 * smooth(2.4, 5.5, c.speed[i] as number));
  return c;
}

const mainAt = (len: number): [number, number] => {
  const pts = spline(MAIN, SPACING);
  let lip = 0;
  let best = Infinity;
  pts.forEach((q, i) => {
    const d = Math.hypot(q[0] - LIP[0], q[1] - LIP[1]);
    if (d < best) {
      best = d;
      lip = i;
    }
  });
  return pts[Math.min(pts.length - 1, lip + Math.round(len / SPACING))] as [number, number];
};
/** Where the fan's marks are laid out from: the point of the main stream 15 m above the fan. */
export const FAN_HEAD: [number, number] = mainAt(FAN_FROM - 15);
/** Where the cascade lands on the fan and stands a moment as a pool. */
export const FAN_POOL: [number, number] = mainAt(FAN_FROM + 9);

/**
 * The side channels: each leaves the main stream, runs beside it round a mass of rock and joins it again.
 * `from` and `to` are metres from the lip, `side` is +1 east of the stream and -1 west, `out` how many metres it stands off at its widest.
 */
const BRAIDS = [
  { from: 8, to: 26, side: 1, out: 6, half: 1.6 },
  { from: 30, to: 56, side: -1, out: 9, half: 1.9 },
  { from: 34, to: 52, side: 1, out: 6, half: 1.5 },
  { from: 60, to: 80, side: 1, out: 7, half: 1.7 },
  { from: 88, to: 106, side: -1, out: 7, half: 1.7 },
];

export interface Course {
  readonly main: Channel;
  readonly arm: Channel;
  /** Metres from the lip to the end of the main stream. */
  readonly length: number;
  /** Metres from the lip of the middle of each cascade of the main stream. */
  readonly falls: number[];
  /** The nearest point of any stream. `toward` is the unit vector on the ground from the point to the stream. */
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
  const main = build(MAIN, lip, 0, 0, halfAt, height, TUBE.floor, falls);
  const fork = Math.min(main.n - 1, lip + Math.round(BRAID_FROM / SPACING));
  const armPoints: [number, number][] = [[main.x[fork - 12] as number, main.z[fork - 12] as number], [main.x[fork] as number, main.z[fork] as number], ...ARM_TAIL];
  // The arm starts 12 samples up the main stream so that it leaves along it.
  const arm = build(armPoints, 12, BRAID_FROM, main.tau[fork] as number, (len) => lerp(1.6, 17, smooth(BRAID_FROM + 6, BRAID_FROM + 40, len)), height, main.y[fork] as number, []);
  for (let i = 0; i < 12; i++) arm.y[i] = main.y[fork - 12 + i] as number;
  const length = main.len[main.n - 1] as number;

  // The side channels. Each starts 12 samples up the main stream so that it leaves along it, and its last metres come down to the main stream's level.
  const sides: Channel[] = [arm];
  BRAIDS.filter((b) => b.to < FAN_FROM - 2).forEach((b, k) => {
    const i0 = lip + Math.round(b.from / SPACING);
    const i1 = Math.min(main.n - 14, lip + Math.round(b.to / SPACING));
    const pts: [number, number][] = [[main.x[i0 - 12] as number, main.z[i0 - 12] as number]];
    const steps = Math.max(4, Math.round((b.to - b.from) / 4));
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const i = Math.round(lerp(i0, i1, t));
      const tx = (main.x[i + 2] as number) - (main.x[i - 2] as number);
      const tz = (main.z[i + 2] as number) - (main.z[i - 2] as number);
      const l = Math.hypot(tx, tz) || 1;
      const off = b.side * b.out * Math.pow(Math.sin(Math.PI * t), 0.7) * (0.85 + 0.3 * hash1(k * 13 + j, 5));
      pts.push([(main.x[i] as number) - (tz / l) * off, (main.z[i] as number) + (tx / l) * off]);
    }
    pts.push([main.x[i1 + 12] as number, main.z[i1 + 12] as number]);
    const c = build(pts, 12, b.from, main.tau[i0] as number, (len) => b.half * (0.75 + 0.5 * lerp(hash1(Math.floor(len / 5), k + 0.5), hash1(Math.floor(len / 5) + 1, k + 0.5), len / 5 - Math.floor(len / 5))), height, main.y[i0] as number, []);
    for (let i = 0; i < 12; i++) c.y[i] = main.y[i0 - 12 + i] as number;
    const end = main.y[i1] as number;
    const last = c.n - 1 - Math.round(12 / SPACING / 2);
    for (let i = 12; i < c.n; i++) c.y[i] = lerp(Math.max(c.y[i] as number, end + 0.02 * (last - i) * SPACING * (i < last ? 1 : 0)), end, smooth(last - 10, last, i));
    sides.push(c);
  });
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
      // Compare by how far outside each stream the point is, so a narrow side channel is not swallowed by the wide one.
      let c = main;
      let near = a.i;
      let least = Math.sqrt(a.d2) - (main.half[a.i] as number);
      let useArm = false;
      for (const side of sides) {
        const b = scan(side, x, z, 12);
        const db = Math.sqrt(b.d2) - (side.half[b.i] as number);
        if (db < least) {
          least = db;
          c = side;
          near = b.i;
          useArm = side === arm;
        }
      }
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
