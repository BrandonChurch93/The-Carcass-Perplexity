// The herd: what each of the fourteen is (its build) and what it does (its plan).
// The staging in shared/anchors.ts says where each one is seen. The crust drifts under them, so each plan is made on the crust
// as it lay at the reference time, and is fitted so that the animal, carried by the crust, is where the staging wants it at the key frames.
import type { Rng } from '../../../core/rng';
import { KEY_TIMES, WALKERS, walkerAt } from '../shared/anchors';
import { REST, type Build, type Env, type NeckAim, type Plan, type V3 } from './animal';

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const fract = (x: number): number => x - Math.floor(x);
const hash = (a: number, b: number): number => fract(Math.sin(a * 127.1 + b * 311.7 + 0.5) * 43758.5453);

/** What each animal is doing, by its index in the staging. */
type Role = 'feeds' | 'walks' | 'tastes' | 'turns' | 'shifts' | 'grazes';

interface Character {
  role: Role;
  /** 0 hangs its legs straight, 1 carries its knees out and up like a pond-skater. */
  skater: number;
  /** Thickness of body and legs. */
  heavy: number;
  /** Length of neck. */
  neck: number;
  /** Width of stance. */
  wide: number;
  hump: number;
}

// No two alike. 0 is the near one, 1 to 5 the group at the seam, the others are far.
const CAST: Character[] = [
  { role: 'feeds', skater: 0.1, heavy: 1.0, neck: 1.0, wide: 0.86, hump: 0.55 },
  { role: 'feeds', skater: 0.22, heavy: 1.12, neck: 1.02, wide: 1.0, hump: 0.7 },
  { role: 'walks', skater: 0.85, heavy: 0.86, neck: 1.08, wide: 1.1, hump: 0.3 },
  { role: 'tastes', skater: 0.4, heavy: 0.92, neck: 1.15, wide: 0.82, hump: 0.45 },
  { role: 'turns', skater: 0.6, heavy: 1.05, neck: 0.9, wide: 0.95, hump: 0.85 },
  { role: 'grazes', skater: 0.3, heavy: 0.95, neck: 1.0, wide: 1.12, hump: 0.4 },
  { role: 'walks', skater: 0.7, heavy: 0.9, neck: 1.1, wide: 1.05, hump: 0.35 },
  { role: 'grazes', skater: 0.15, heavy: 1.1, neck: 0.94, wide: 0.9, hump: 0.75 },
  { role: 'walks', skater: 0.35, heavy: 1.0, neck: 1.0, wide: 0.8, hump: 0.5 },
  { role: 'grazes', skater: 0.9, heavy: 0.85, neck: 1.12, wide: 1.15, hump: 0.3 },
  { role: 'shifts', skater: 0.2, heavy: 1.15, neck: 0.96, wide: 1.0, hump: 0.8 },
  { role: 'walks', skater: 0.55, heavy: 0.95, neck: 1.05, wide: 0.92, hump: 0.4 },
  { role: 'grazes', skater: 0.75, heavy: 1.0, neck: 0.92, wide: 1.08, hump: 0.6 },
  { role: 'walks', skater: 0.05, heavy: 1.08, neck: 1.1, wide: 0.88, hump: 0.65 },
];

export function makeBuild(index: number, rng: Rng): Build {
  const w = WALKERS[index] as (typeof WALKERS)[number];
  const c = CAST[index] as Character;
  const k = w.size;
  const v = (a: number, b: number): number => rng.range(a, b);
  return {
    k,
    seed: index * 1.618 + 0.37,
    bodyLen: 4.9 * k * v(0.92, 1.1),
    bodyTop: 1.0 * k * c.heavy * v(0.92, 1.08),
    bodyKeel: 1.3 * k * c.heavy * v(0.9, 1.12),
    bodyWide: 1.12 * k * c.heavy * v(0.92, 1.08),
    hump: c.hump,
    hipFore: 1.45 * k,
    hipSide: 0.7 * k * c.heavy,
    hipUp: 0.22 * k,
    femur: lerp(2.7, 2.3, c.skater) * k * v(0.95, 1.05),
    kneeOut: lerp(0.1, 0.95, c.skater),
    kneeUp: lerp(0.02, 0.75, c.skater),
    hock: lerp(0.46, 0.52, c.skater) * v(0.94, 1.06),
    stanceFore: 3.9 * k * v(0.9, 1.06),
    stanceSide: 3.2 * k * c.wide,
    standH: 9.0 * k * v(0.97, 1.03),
    stride: 4.3 * k * v(0.92, 1.08),
    legR: lerp(1.35, 1.15, c.skater) * c.heavy,
    padR: 0.62 * k * v(0.92, 1.1),
    neckLen: 10.3 * k * c.neck,
    neckR: 0.43 * k * c.heavy,
    tendrils: 13 + (index % 4),
    tendrilLen: 1.75 * k * v(0.9, 1.15),
    stepH: 1.0 * k * v(0.8, 1.2),
  };
}

const T1 = KEY_TIMES['heart-0'];
const T2 = KEY_TIMES['heart-4'];

export function makePlan(index: number, b: Build, env: Env, t0: number): Plan {
  const w = WALKERS[index] as (typeof WALKERS)[number];
  const c = CAST[index] as Character;
  const k = b.k;
  // Where the staging wants it, on the crust as it lay at the reference time.
  const wanted = (seconds: number): [number, number] => {
    const p = walkerAt(index, seconds);
    return env.undrift(p[0], p[1], seconds);
  };
  const a = wanted(T1);
  const z = wanted(T2);
  const ux = (z[0] - a[0]) / (T2 - T1);
  const uz = (z[1] - a[1]) / (T2 - T1);
  const speed = Math.hypot(ux, uz);
  const staged = (w.heading * Math.PI) / 180;
  const walksOn = speed * (T2 - T1) > 4.2 && c.role !== 'feeds' && c.role !== 'tastes' && c.role !== 'shifts';
  const reach = 0.36 * b.neckLen;
  const phase = w.phase;

  // The seam it can reach from where it stands, if there is one: the point of it nearest to where the tuft would come down.
  const feedAt = (x: number, zz: number, yaw: number, side: number): [number, number] => {
    const fx = Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = x + fx * 0.33 * b.bodyLen;
    const rz = zz + fz * 0.33 * b.bodyLen;
    let best: [number, number] = [rx + fx * reach - fz * side, rz + fz * reach + fx * side];
    let score = 1e9;
    for (let turn = -1.2; turn <= 1.2; turn += 0.15) {
      for (const far of [0.75, 1, 1.2]) {
        const dx = Math.sin(yaw + turn) * reach * far;
        const dz = -Math.cos(yaw + turn) * reach * far;
        const s = env.seam(rx + dx, rz + dz);
        const d = Math.hypot(s.x - rx, s.z - rz);
        if (s.d > 3 * k || d < 0.5 * reach || d > 1.3 * reach) continue;
        const ahead = ((s.x - rx) * fx + (s.z - rz) * fz) / d;
        if (ahead < 0.3) continue;
        const cost = Math.abs(d - reach) + (1 - ahead) * 3 * k + s.d * 0.5;
        if (cost < score) {
          score = cost;
          best = [s.x, s.z];
        }
      }
    }
    return best;
  };

  const carried = (seconds: number, low: number): V3 => [
    b.neckLen * (0.4 + 0.05 * Math.sin(seconds * 0.31 + phase * 9)),
    b.neckLen * (low + 0.05 * Math.sin(seconds * 0.23 + phase * 5)),
    b.neckLen * 0.12 * Math.sin(seconds * 0.4 + phase * 7),
  ];

  if (!walksOn) {
    const x = (a[0] + z[0]) / 2;
    const zz = (a[1] + z[1]) / 2;
    const turning = c.role === 'turns';
    // One that turns: a third of a turn, a step at a time, during the shot that looks at the group.
    const swing = turning ? 1.1 : 0;
    const cycles = turning ? 1.5 : 0;
    const sigma = (seconds: number): number => REST + cycles * smooth(8.2, 20.5, seconds);
    const yawOf = (s: number): number => staged + swing * Math.min(1, Math.max(0, (s - REST) / (cycles || 1)));
    const body = (s: number): { x: number; z: number; yaw: number } => ({ x, z: zz, yaw: yawOf(s) });
    const target = feedAt(x, zz, staged, 0);
    const neck = (seconds: number): NeckAim => {
      if (c.role === 'tastes') {
        // Trunk raised and swinging, as if tasting the air.
        return {
          down: 0,
          target,
          raised: [b.neckLen * (0.3 + 0.07 * Math.sin(seconds * 0.33 + 1)), b.neckLen * (0.16 + 0.08 * Math.sin(seconds * 0.41 + phase * 6)), b.neckLen * 0.34 * Math.sin(seconds * 0.47 + phase * 6)],
          shape: 0.86,
        };
      }
      // It feeds, and now and then lifts its tuft out of the heat for a moment.
      const beat = fract(seconds / 23 + phase);
      const up = turning ? smooth(7, 9, seconds) * (1 - smooth(20, 23, seconds)) : smooth(0.0, 0.1, beat) * (1 - smooth(0.2, 0.32, beat));
      return { down: 1 - (turning ? 0.85 : c.role === 'shifts' ? 0.35 : 0.5) * up, target, raised: carried(seconds, -0.2), shape: 0.25 * up };
    };
    return { sigma, body, neck, fidget: turning ? 0 : c.role === 'shifts' ? 3.2 : 6.5 + 4 * hash(index, 3), dip: c.role === 'tastes' ? 0 : 0.3 * k, range: turning ? 1.3 * k : 0.75 * k };
  }

  // One that walks: on a line on the crust, a few steps and a rest, so that its mean speed is the staged one.
  const dx = ux / speed;
  const dz = uz / speed;
  const yaw = Math.atan2(dx, -dz);
  const rest = c.role === 'grazes' ? 0.52 : 0.16;
  let per = 0.5;
  for (let q = 0.5; q <= 4; q += 0.25) if (Math.abs((b.stride * q) / speed - 12.5) < Math.abs((b.stride * per) / speed - 12.5)) per = q;
  const period = (b.stride * per) / speed;
  const shift = phase;
  const ease = (f: number): number => {
    const t = Math.min(1, Math.max(0, (f - rest / 2) / (1 - rest)));
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const sigma = (seconds: number): number => {
    const tau = seconds / period + shift;
    const n = Math.floor(tau);
    return REST + per * (n + ease(tau - n));
  };
  // Centre the error of the stop and go against the steady staging over the key frames.
  let low = 1e9;
  let high = -1e9;
  for (const t of Object.values(KEY_TIMES)) {
    const e = b.stride * sigma(t) - speed * (t - T1);
    low = Math.min(low, e);
    high = Math.max(high, e);
  }
  const bias = -(low + high) / 2;
  const body = (s: number): { x: number; z: number; yaw: number } => ({ x: a[0] + dx * (b.stride * s + bias), z: a[1] + dz * (b.stride * s + bias), yaw });
  const neck = (seconds: number): NeckAim => {
    const tau = seconds / period + shift;
    const n = Math.round(tau);
    const away = Math.abs(tau - n);
    const at = body(REST + per * n);
    const target = feedAt(at.x, at.z, yaw, (hash(n, index) - 0.5) * 3 * k);
    const settle = 2.6 / period;
    const depth = c.role === 'grazes' ? 1 : 0.35;
    const down = depth * smooth(rest / 2 + 0.03, Math.max(0.01, rest / 2 - settle), away);
    return { down, target, raised: carried(seconds, c.role === 'grazes' ? -0.12 : -0.3 + 0.35 * c.skater), shape: lerp(c.role === 'grazes' ? 0.75 : 0.3 + 0.5 * c.skater, 0, down) };
  };
  void t0;
  return { sigma, body, neck, fidget: 0, dip: 0.25 * k, range: 0.4 * b.stride + 0.55 * k };
}
