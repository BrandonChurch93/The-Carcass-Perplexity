// The herd: what each of the fourteen is (its build) and what it does (its plan).
// The staging in shared/anchors.ts says where each one is seen. The crust drifts under them, so each plan is made on the crust
// as it lay at the reference time, and is fitted so that the animal, carried by the crust, is where the staging wants it at the key frames.
import type { Rng } from '../../../core/rng';
import { KEY_TIMES, WALKERS, walkerAt } from '../shared/anchors';
import { REST, TUFT_UP, type Build, type Env, type NeckAim, type Plan, type V3 } from './animal';

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
  /** Length of leg against the staged size. */
  tall: number;
  /** Size of body against the staged size. */
  bulk: number;
  /** A young one: its whole size against the staged size. */
  young: number;
  /** The tuft: how many roots it has left and how long they are, against a whole one. */
  tuft: [number, number];
}

// No two alike. 0 is the near one, 1 to 5 the group at the seam, the others are far.
const CAST: Character[] = [
  { role: 'feeds', skater: 0.1, heavy: 1.0, neck: 1.0, wide: 0.86, hump: 0.55, tall: 1.0, bulk: 1.0, young: 1, tuft: [1, 1] },
  { role: 'feeds', skater: 0.22, heavy: 1.16, neck: 0.96, wide: 1.0, hump: 0.7, tall: 0.97, bulk: 1.1, young: 1, tuft: [1.1, 1.05] },
  { role: 'walks', skater: 0.45, heavy: 0.92, neck: 0.96, wide: 1.0, hump: 0.3, tall: 1.13, bulk: 0.84, young: 1, tuft: [0.7, 0.85] },
  { role: 'tastes', skater: 0.4, heavy: 0.9, neck: 1.15, wide: 0.82, hump: 0.9, tall: 0.9, bulk: 0.95, young: 1, tuft: [0.5, 0.65] },
  { role: 'turns', skater: 0.6, heavy: 1.0, neck: 0.95, wide: 0.95, hump: 0.85, tall: 1.08, bulk: 0.9, young: 0.62, tuft: [0.8, 0.8] },
  { role: 'shifts', skater: 0.3, heavy: 0.95, neck: 0.96, wide: 1.12, hump: 0.4, tall: 1.1, bulk: 0.9, young: 1, tuft: [1, 0.9] },
  { role: 'walks', skater: 0.7, heavy: 0.9, neck: 1.1, wide: 1.05, hump: 0.35, tall: 0.88, bulk: 1.15, young: 1, tuft: [1.2, 1.1] },
  { role: 'grazes', skater: 0.15, heavy: 1.1, neck: 0.98, wide: 0.9, hump: 0.75, tall: 1.0, bulk: 1.2, young: 1, tuft: [0.9, 1] },
  { role: 'walks', skater: 0.35, heavy: 1.0, neck: 1.05, wide: 0.8, hump: 0.5, tall: 1.15, bulk: 0.8, young: 1, tuft: [1, 1.2] },
  { role: 'grazes', skater: 0.9, heavy: 0.85, neck: 1.12, wide: 1.15, hump: 0.3, tall: 1.05, bulk: 0.95, young: 0.66, tuft: [0.8, 0.9] },
  { role: 'grazes', skater: 0.2, heavy: 1.15, neck: 0.98, wide: 1.0, hump: 0.8, tall: 0.92, bulk: 1.1, young: 1, tuft: [1.1, 0.9] },
  { role: 'walks', skater: 0.55, heavy: 0.95, neck: 1.05, wide: 0.92, hump: 0.4, tall: 1.06, bulk: 0.9, young: 1, tuft: [0.45, 0.6] },
  { role: 'grazes', skater: 0.75, heavy: 1.0, neck: 0.96, wide: 1.08, hump: 0.6, tall: 1.0, bulk: 1.0, young: 0.7, tuft: [1, 1] },
  { role: 'walks', skater: 0.05, heavy: 1.08, neck: 1.1, wide: 0.88, hump: 0.65, tall: 0.95, bulk: 1.05, young: 1, tuft: [0.9, 1.1] },
];

export function makeBuild(index: number, rng: Rng): Build {
  const w = WALKERS[index] as (typeof WALKERS)[number];
  const c = CAST[index] as Character;
  // No two alike: each differs from the staged size in leg, body, neck and tuft, and three are young.
  const k = w.size * c.young;
  const v = (a: number, b: number): number => rng.range(a, b);
  return {
    k,
    seed: index * 1.618 + 0.37,
    // A small body hung between the shoulders and the hips, on four long legs that leave it at its upper sides and go down and out.
    bodyLen: 4.5 * k * c.bulk * v(0.92, 1.1),
    bodyTop: 0.8 * k * c.bulk * c.heavy * v(0.92, 1.08),
    bodyKeel: 1.05 * k * c.bulk * c.heavy * v(0.9, 1.12),
    bodyWide: 1.0 * k * c.bulk * c.heavy * v(0.92, 1.08),
    hump: c.hump,
    hipFore: 1.3 * k * c.bulk,
    hipSide: 0.78 * k * c.bulk * c.heavy,
    hipUp: 0.3 * k * c.bulk * c.heavy,
    knee: lerp(0.47, 0.43, c.skater) * v(0.96, 1.04),
    hock: lerp(0.62, 0.7, c.skater) * v(0.95, 1.05),
    slack: lerp(0.01, 0.028, c.skater),
    stanceFore: 3.9 * k * v(0.9, 1.06),
    stanceSide: 2.9 * k * c.wide,
    standH: 9.3 * k * c.tall * v(0.97, 1.03),
    stride: 4.3 * k * v(0.92, 1.08),
    legR: lerp(1.08, 0.94, c.skater) * c.heavy,
    padR: 0.8 * k * v(0.9, 1.12),
    neckLen: 10.6 * k * c.neck,
    neckR: 0.56 * k * c.heavy,
    tendrils: Math.max(4, Math.round((9 + (index % 3)) * c.tuft[0])),
    tendrilLen: 3.5 * k * c.tuft[1] * v(0.9, 1.15),
    stepH: 1.0 * k * v(0.8, 1.2),
    lean: index === 1 ? 1.1 * k : (v(0, 1) < 0.5 ? -1 : 1) * v(0.35, 1.0) * k,
  };
}

/** The shape of a neck that is down: it leaves the shoulders steeply and sweeps out low, as a rope hangs. */
const FEED_SHAPE = 0.1;
/** The pools the lake opens under the tufts of the hero and of the near one (lake/net.ts), on the crust at the reference time. */
const POOLS: readonly [number, number][] = [
  [-403.4, 202.6],
  [-493.8, 225.6],
  [-491.6, 241.0],
];

/** Where an animal stands and faces against its row of the staging: metres east, metres south, degrees. The camera of the feeding picture
 *  is tied to the hero's row, so the hero is turned three quarters on to it here: it stands about 3 m farther from that lens, a neck's reach from the pool, turned 22 degrees
 *  toward it, with the pool the lake opens for its tuft between it and the lens. */
const STAND: Record<number, [number, number, number]> = {
  1: [1.0, -3.05, 22],
};

/** The near one is seen in the wide view and again in the view of the one that sank, with two shots between in which it is not drawn:
 *  it stands and feeds in each, where its row puts it at each key, facing as given here in degrees; `cut` is when it changes places, unseen. */
const TWICE: Record<number, { cut: number; key: number; first: number; second: number }> = {
  0: { cut: 12.5, key: KEY_TIMES['heart-2'], first: 100, second: 150 },
};

const T1 = KEY_TIMES['heart-0'];
const T2 = KEY_TIMES['heart-4'];

export function makePlan(index: number, b: Build, env: Env, t0: number): Plan {
  const w = WALKERS[index] as (typeof WALKERS)[number];
  const c = CAST[index] as Character;
  const k = b.k;
  // Where the staging wants it, on the crust as it lay at the reference time.
  const stand = STAND[index] ?? [0, 0, 0];
  const wanted = (seconds: number): [number, number] => {
    const p = walkerAt(index, seconds);
    return env.undrift(p[0] + stand[0], p[1] + stand[1], seconds);
  };
  const a = wanted(T1);
  const z = wanted(T2);
  const ux = (z[0] - a[0]) / (T2 - T1);
  const uz = (z[1] - a[1]) / (T2 - T1);
  const speed = Math.hypot(ux, uz);
  const staged = ((w.heading + stand[2]) * Math.PI) / 180;
  const twice = TWICE[index];
  const walksOn = speed * (T2 - T1) > 4.2 && c.role !== 'tastes' && c.role !== 'turns' && !twice;
  // How far ahead of its shoulders the tuft comes down when the neck is drawn out with a little slack.
  // The last part of the neck turns down to the tuft and is 0.128 of the neck forward and 0.088 down; the rest runs to it nearly taut,
  // so that it comes to the tuft still going down.
  const drop = b.standH + 0.1 * b.bodyTop - 0.5 * k - TUFT_UP * b.tendrilLen - 0.088 * b.neckLen;
  const reach = Math.sqrt(Math.max(4, 0.83 * b.neckLen * (0.83 * b.neckLen) - drop * drop)) + 0.128 * b.neckLen;
  const phase = w.phase;

  // The seam it can reach from where it stands, if there is one: the point of it nearest to where the tuft would come down.
  const feedAt = (x: number, zz: number, yaw: number, side: number): [number, number, number] => {
    const fx = Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = x + fx * 0.36 * b.bodyLen;
    const rz = zz + fz * 0.36 * b.bodyLen;
    let best: [number, number, number] = [rx + fx * reach - fz * side, rz + fz * reach + fx * side, 1e9];
    let score = 1e9;
    // The near one comes to stand astride its seam: it may bring its tuft down beside its forelegs.
    const round = index === 0 ? 2.4 : 1.2;
    for (let turn = -round; turn <= round; turn += 0.15) {
      for (const far of index === 0 ? [0.45, 0.75, 1, 1.2] : [0.75, 1, 1.2]) {
        const dx = Math.sin(yaw + turn) * reach * far;
        const dz = -Math.cos(yaw + turn) * reach * far;
        const s = env.seam(rx + dx, rz + dz);
        const d = Math.hypot(s.x - rx, s.z - rz);
        if (s.d > 3 * k || d < (index === 0 ? 0.4 : 0.6) * reach || d > 1.12 * reach) continue;
        const ahead = ((s.x - rx) * fx + (s.z - rz) * fz) / d;
        if (ahead < (index === 0 ? -0.4 : 0.3)) continue;
        // The near one brings its tuft down on its north side, where the low camera by the one that sank can see it.
        const cost = Math.abs(d - reach) + (1 - ahead) * 3 * k + s.d * 0.5 + (index === 0 ? 0.25 * Math.max(0, rz - s.z) : 0);
        if (cost < score) {
          score = cost;
          best = [s.x, s.z, cost];
        }
      }
    }
    // Where the lake has opened a pool for a tuft, the tuft goes there if it is in reach.
    for (const pool of POOLS) {
      const d = Math.hypot(pool[0] - rx, pool[1] - rz);
      if (d < 0.6 * reach || d > 1.15 * reach) continue;
      const ahead = ((pool[0] - rx) * fx + (pool[1] - rz) * fz) / d;
      if (ahead < 0.3) continue;
      const cost = Math.abs(d - reach) + (1 - ahead) * 3 * k - 3 * k;
      if (cost < score) {
        score = cost;
        best = [pool[0], pool[1], cost];
      }
    }
    return best;
  };

  // Its own slow thing, in its own time: no two of the fourteen share a period, and none is under 3 s or over 9.
  const habit = { period: 3.2 + 5.6 * (((index * 5 + 3) % 14) / 13), phase: hash(index, 17) };
  const om = (2 * Math.PI) / habit.period;
  const dig = index === 1 ? 2.5 : 2.7 + 1.6 * hash(index, 11);
  const none = (): number => -1;
  const carried = (seconds: number, low: number): V3 => [
    b.neckLen * (0.56 + 0.05 * Math.sin(seconds * om + phase * 9)),
    b.neckLen * (low + 0.06 * Math.sin(seconds * om * 0.8 + phase * 5)),
    b.neckLen * 0.17 * Math.sin(seconds * om * 0.6 + phase * 7),
  ];

  if (!walksOn) {
    const x = (a[0] + z[0]) / 2;
    const zz = (a[1] + z[1]) / 2;
    const turning = c.role === 'turns';
    // One that turns: a third of a turn, a step at a time, during the shot that looks at the group.
    const swing = turning ? 1.1 : 0;
    const cycles = turning ? 1.5 : 0;
    // Where it stands, which way it faces and where its tuft comes down: turned toward the seam it feeds at, if one is in reach within a
    // small turn of the staged heading.
    const standAt = (sx: number, sz: number, heading: number): { x: number; z: number; facing: number; target: [number, number] } => {
      let facing = heading;
      let found = feedAt(sx, sz, heading, 0);
      let least = found[2];
      for (const turn of [-0.25, 0.25, -0.5, 0.5, -0.75, 0.75]) {
        const f = feedAt(sx, sz, heading + turn, 0);
        if (f[2] + Math.abs(turn) * 1.5 * k < least) {
          least = f[2] + Math.abs(turn) * 1.5 * k;
          found = f;
          facing = heading + turn;
        }
      }
      return { x: sx, z: sz, facing, target: [found[0], found[1]] };
    };
    const first = twice ? standAt(a[0], a[1], (twice.first * Math.PI) / 180) : standAt(x, zz, staged);
    // One that is seen in two shots with a cut between stands where each is staged, and is not seen to go from the one to the other.
    const later = twice ? wanted(twice.key) : a;
    const second = twice ? standAt(later[0], later[1], (twice.second * Math.PI) / 180) : first;
    const sigma = (seconds: number): number => (twice ? REST + (seconds >= twice.cut ? 4 : 0) : REST + cycles * smooth(8.2, 20.5, seconds));
    const facing = first.facing;
    const target = first.target;
    const yawOf = (s: number): number => facing + swing * Math.min(1, Math.max(0, (s - REST) / (cycles || 1)));
    // One that turns shuffles along as it does, so that the crust does not carry it off its mark.
    const f0 = turning ? (6 - T1) / (T2 - T1) - 0.5 : 0;
    const f1 = turning ? (22.5 - T1) / (T2 - T1) - 0.5 : 0;
    const body = (s: number): { x: number; z: number; yaw: number } => {
      const u = lerp(f0, f1, Math.min(1, Math.max(0, (s - REST) / (cycles || 1))));
      if (twice) return s < 2 ? { x: first.x, z: first.z, yaw: first.facing } : { x: second.x, z: second.z, yaw: second.facing };
      return { x: x + (z[0] - a[0]) * u, z: zz + (z[1] - a[1]) * u, yaw: yawOf(s) };
    };
    const neck = (seconds: number): NeckAim => {
      if (c.role === 'tastes') {
        // Trunk raised and swinging, as if tasting the air.
        return {
          down: 0,
          target,
          raised: [b.neckLen * (0.38 + 0.05 * Math.sin(seconds * om * 0.7 + 1)), b.neckLen * (0.64 + 0.05 * Math.sin(seconds * om * 0.85 + phase * 6)), b.neckLen * 0.2 * Math.sin(seconds * om + phase * 6)],
          shape: 0.8,
        };
      }
      // It feeds, and now and then lifts its tuft out of the heat for a moment.
      // The near one and the one the long lens looks at have their tufts in the seam when the keys look at them.
      const beat = fract((seconds - (index === 0 ? 8 : index === 1 ? 12.9 : phase * 23)) / 23);
      const up = turning ? smooth(7, 9, seconds) * (1 - smooth(20, 23, seconds)) : smooth(0.0, 0.1, beat) * (1 - smooth(0.2, 0.32, beat));
      return { down: 1 - (turning ? 0.85 : c.role === 'shifts' ? 0.35 : 0.5) * up, target: twice && seconds >= twice.cut ? second.target : target, raised: carried(seconds, -0.38), shape: lerp(FEED_SHAPE, 0.2, up) };
    };
    // Each pad in its turn is put down a step off. The one the long lens looks at re-places one fore pad while it looks, and has it down before the key.
    const fidget = turning ? 0 : index === 1 ? 8 : 4.6 + 3.6 * (((index * 3 + 1) % 14) / 13);
    const lag = index === 1 ? -2.2 : hash(index, 19) * 4 * fidget;
    return { sigma, body, neck, fidget, lag, halfStep: none, habit, dig: c.role === 'tastes' ? 0 : dig, dip: c.role === 'tastes' ? 0 : 0.3 * k, range: turning ? 1.3 * k : 1.0 * k };
  }

  // One that walks: on a line on the crust, a few steps and a rest, so that its mean speed is the staged one.
  const dx = ux / speed;
  const dz = uz / speed;
  const yaw = Math.atan2(dx, -dz);
  // A few steps and a rest. It never steps faster than a tall animal can: the faster it must travel, the less it rests.
  const ramp = 0.25;
  const quickest = 3.4 * Math.sqrt(k);
  const settled = c.role === 'walks' ? 0.16 : c.role === 'grazes' ? 0.52 : 0.6;
  const rest = Math.max(0.06, Math.min(settled, 1 - (speed * quickest) / (b.stride * (1 - ramp))));
  // The near one feeds where the wide view sees it and again where the view of the one that sank sees it, and walks between.
  const bout = index === 0 ? KEY_TIMES['heart-2'] - KEY_TIMES['heart-0'] : 12.5;
  let per = 0.5;
  for (let q = 0.5; q <= 4; q += 0.25) if (Math.abs((b.stride * q) / speed - bout) < Math.abs((b.stride * per) / speed - bout)) per = q;
  const period = (b.stride * per) / speed;
  // The one that shifts its weight rests while the long lens looks at the group.
  const shift = index === 0 ? 1 - fract((KEY_TIMES['heart-0'] + KEY_TIMES['heart-2'] - period) / 2 / period) : c.role === 'shifts' ? 1 - fract(11 / period) : phase;
  const area = 1 - ramp;
  const gone = (u: number): number => ramp * (u * u * u - 0.5 * u * u * u * u);
  const ease = (f: number): number => {
    const t = Math.min(1, Math.max(0, (f - rest / 2) / (1 - rest)));
    if (t < ramp) return gone(t / ramp) / area;
    if (t > 1 - ramp) return 1 - gone((1 - t) / ramp) / area;
    return (ramp / 2 + t - ramp) / area;
  };
  const sigmaAt = (seconds: number, lag: number): number => {
    const tau = seconds / period + lag;
    const n = Math.floor(tau);
    return REST + per * (n + ease(tau - n));
  };
  // The second of the feeding picture stands, walks through the long lens's shot in three steps and stands again:
  // it is half way, a hind pad in the air, when the key looks.
  const through = (seconds: number): number => {
    const t = Math.min(1, Math.max(0, (seconds - 5.6) / 10.4));
    const u = t < ramp ? gone(t / ramp) / area : t > 1 - ramp ? 1 - gone((1 - t) / ramp) / area : (ramp / 2 + t - ramp) / area;
    return REST + 0.75 * u;
  };
  const sigma = (seconds: number): number => (index === 2 ? through(seconds) : sigmaAt(seconds, shift));
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
    if (index === 2) {
      // It carries its tuft while it walks, and lowers it where it comes to stand.
      const at = body(seconds < 10 ? REST : REST + 0.75);
      const fed = feedAt(at.x, at.z, yaw, 0);
      const down = 0.7 * (1 - smooth(2.5, 6.2, seconds)) + 0.7 * smooth(15.6, 19.5, seconds);
      return { down, target: [fed[0], fed[1]], raised: carried(seconds, -0.2 + 0.12 * c.skater), shape: lerp(0.15 + 0.6 * c.skater, FEED_SHAPE, down) };
    }
    const tau = seconds / period + shift;
    const n = Math.round(tau);
    const away = Math.abs(tau - n);
    const at = body(REST + per * n);
    const fed = feedAt(at.x, at.z, yaw, (hash(n, index) - 0.5) * 3 * k);
    const target: [number, number] = [fed[0], fed[1]];
    // The tuft starts down over the last steps and is in the heat soon after it stands.
    const settle = 0.7 / period;
    const depth = c.role === 'walks' ? 0.35 : 1;
    const down = depth * smooth(rest / 2 + 1.6 / period, Math.max(0.01, rest / 2 - settle), away);
    return { down, target, raised: carried(seconds, c.role === 'walks' ? -0.32 + 0.12 * c.skater : -0.42), shape: lerp(c.role === 'walks' ? 0.15 + 0.6 * c.skater : 0.3, FEED_SHAPE, down) };
  };
  void t0;
  // In a long rest it re-places one fore pad: it leans off it, puts it down a step off and settles over it.
  const long = rest * period;
  const halfStep = (j: number, n: number): number => {
    if (index === 2 || long < 5 || (j !== 1 && j !== 3)) return -1;
    const off = j * 0.25;
    const m = Math.ceil((n - off - REST) / per - 1e-6);
    if (Math.floor(REST + per * m + off + 1e-9) !== n) return -1;
    if ((hash(m, index + 7) < 0.5 ? 1 : 3) !== j) return -1;
    const centre = (m - shift) * period;
    // The near one has it down again just before the keys that look at it.
    if (index === 0) return centre + (centre < 10 ? 0.9 : -1.9);
    return centre - long / 2 + 0.9 + hash(m, index + 9) * (long - 3.6);
  };
  return { sigma, body, neck, fidget: 0, lag: 0, halfStep, habit, dig, dip: 0.25 * k, range: 0.4 * b.stride + 0.55 * k };
}
