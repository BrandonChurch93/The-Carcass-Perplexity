// Who stands where, and what each one does: the animals the close shots are about, placed from the cameras of those shots, and the herd along
// the south shore. Every animal is a pure function of time: where its hooves stand, when it shifts a leg, how far its neck is down, where it looks.
import { KEYS, SHORE_HEADING } from '../cameras';
import { DEG, at, shoreAt } from '../layout';
import type { Rng } from '../../../core/rng';
import { goneAt, paceAt, stepAt, wayAt, type Gait } from './gait';
import { restHoof, standing, type Build, type Hoof, type Pose, type V3 } from './skeleton';

export interface Drinker {
  x: number;
  z: number;
  /** Bearing it faces, degrees. */
  facing: number;
  build: Build;
  /** What it does with its neck: 0 head up, 1 mouth in the water. */
  down: (t: number) => number;
  /** True for one that watches: it looks about. */
  watches: boolean;
  /** One of the animals a close shot is about: it is drawn with the full body and has rings round its legs. */
  close: boolean;
  /** One of the herd that stands where a low camera of a close shot would meet it: it is there for the wide shot alone. */
  wideOnly?: boolean;
  /** The level its feet stand at, where that is not the ground under it. */
  level?: number;
  /** How deep it wades at most, in its own sizes, where that is not WADE. */
  wade?: number;
  /** When something ahead of it takes its whole attention: from then it looks nowhere else. */
  alert?: number;
  /** How far it gives ground when that takes it, in its own sizes: it steps back, one hoof after another. */
  gives?: number;
  /** How far it lifts its muzzle past level when that takes it. */
  lifts?: number;
  /** How far round it turns its head to what takes it, in radians, to its own left. */
  looks?: number;
  /** It walks: how, when and on what way. It is where it is placed, facing as it is placed, at the gait's key. */
  gait?: Gait;
  /** Hooves it moves at moments of its own: which leg, when, and how far to the side and forward, in its own sizes. It stands as placed at its key. */
  moves?: Move[];
  /** How it stands: each hoof before or behind where the body was made to set it, in its own sizes. */
  stance?: [number, number, number, number];
  /** It lies on the gravel with its legs folded under it. */
  lies?: boolean;
  /** A number of its own, 0 to 1: its coat, its clocks. */
  own: number;
  /** Seconds between the steps of one leg, about. */
  stepEvery: number;
  /** The moment its shot is judged by: it stands on all four then. */
  key: number;
}

export interface Move {
  leg: number;
  at: number;
  by: [number, number];
}

/** Seconds into the place at the keys of the shore shot (frame 9003) and of the mats shot (frame 8600), at 60 frames a second. */
const SHORE_KEY = (9003 - 8305) / 60;
const MATS_KEY = (8600 - 8305) / 60;
/** And at the key of the wide shot (frame 8412). */
const WIDE_KEY = (8412 - 8305) / 60;
/** The first of the list are the animals the close shots are about; the herd of the wide shot follows them. */
export const CLOSE_COUNT = 9;
/** How long the herd is looked at, seconds into the place: the wide shot, and the six seconds a critic holds its key with the world running on. */
const WIDE_ENDS = WIDE_KEY + 6.2;

/** How deep they wade: the bed they stand on is never further under the water than this, metres. */
export const WADE = -0.34;
/** How deep this one wades at most, in the world. */
export const wadeOf = (d: { wade?: number; build: { size: number } }): number => (d.wade ?? WADE) * d.build.size;

const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const ease = (lo: number, hi: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};
const part = (v: number): number => v - Math.floor(v);

const build = (size: number, own: number, calf = false): Build =>
  calf
    ? { size: size * 0.52, girth: 1.08, depth: 1.0, neck: 0.72, leg: 1.14, head: 1.1 }
    : {
        size: size * (0.94 + 0.12 * hash(own * 91)),
        girth: 1.08 + 0.2 * hash(own * 53),
        depth: 0.9 + 0.12 * hash(own * 71),
        neck: 0.9 + 0.2 * hash(own * 37),
        leg: 1.0 + 0.09 * hash(own * 29),
        head: 0.94 + 0.14 * hash(own * 13),
      };

/** The two the last shot looks past: a small head on a long neck, as the approved picture has them. */
const seenFromBehind = (d: Drinker, more: Partial<Build>): Drinker => ({ ...d, build: { ...d.build, ...more } });

/** Who of the herd is on its way, by its number in the herd: its pace in sizes a second, when it sets off or halts, how it is turned from where the draw faced it. */
interface Does {
  pace: number;
  from?: number;
  to?: number;
  again?: number;
  /** Seconds before the key at which it was where it is placed. */
  ahead?: number;
  facing?: number | 'in' | 'out';
  curve?: number;
  trot?: boolean;
}
const WAYS: Record<number, Does> = {
  0: { pace: 0.6, from: 5.4 },
  1: { pace: 0.62, to: 4.3 },
  2: { pace: 0.72, from: 3.8, facing: 'out' },
  3: { pace: 0.78, to: 5.2 },
  6: { pace: 0.7, from: 0.45, facing: 'out' },
  // This one is placed before one that lies, as the camera sees them: it has walked clear of it by the key.
  8: { pace: 0.55, ahead: 5.2, to: 3.9 },
  10: { pace: 0.85, facing: 'in', to: 4.9 },
  11: { pace: 0.74, to: 1.25, facing: 'in', again: 6.1 },
  13: { pace: 1.9, trot: true, to: 3.1 },
  15: { pace: 0.66, from: 1.5, facing: 'in' },
  17: { pace: 0.9, to: 3.6, again: 6.4 },
  // One has had enough and leaves: it swings round away from the rest and goes off up the bank.
  19: { pace: 1.0, from: 0.7, facing: 'out', curve: 0.22 },
  20: { pace: 0.7, to: 2.9, again: 5.0 },
  21: { pace: 0.8, to: 2.0 },
  23: { pace: 0.64, from: 4.6 },
  24: { pace: 0.5 },
};

export function herd(rng: Rng, riseAt: number): Drinker[] {
  // One that drinks: mouth in the water and sipping, then the head comes half up and it swallows, then it stands and looks, then down again.
  // `at` is where in the period it is at the key of its shot, so the key is drawn as the approved picture has it.
  const sips = (period: number, keyTime: number, at: number) => (t: number) => {
    const u = part((t - keyTime) / period + at);
    const lift = ease(0.5, 0.62, u) * (1 - ease(0.84, 0.98, u));
    const half = ease(0.5, 0.56, u) * (1 - ease(0.6, 0.66, u));
    return 1 - 0.93 * lift + 0.3 * half * (1 - lift);
  };
  const up = (phase: number) => (t: number) => 0.04 + 0.05 * Math.sin(t * 0.61 + phase) + 0.02 * Math.sin(t * 1.7 + phase);
  let count = 0;
  const one = (x: number, z: number, facing: number, size: number, down: (t: number) => number, watches: boolean, close: boolean, calf = false): Drinker => {
    const own = hash(++count * 7.31);
    return { x, z, facing, build: build(size, own, calf), down, watches, close, own, stepEvery: 5 + 6 * hash(own * 19), key: 0 };
  };
  const from = (key: { position: [number, number, number] }, bearing: number, distance: number, facing: number, size: number, down: (t: number) => number, watches: boolean, calf = false): Drinker =>
    one(key.position[0] + Math.sin(bearing * DEG) * distance, key.position[2] - Math.cos(bearing * DEG) * distance, facing, size, down, watches, true, calf);
  const shore = (d: Drinker): Drinker => ({ ...d, key: SHORE_KEY });
  const made = (d: Drinker, as: Partial<Build>, stance: [number, number, number, number], moves: Move[]): Drinker => ({ ...d, build: { ...d.build, ...as }, stance, moves });
  // Out on the mats the bed is knee deep, and they stand on it: the lake cuts each leg half way up the cannon.
  const mats = (d: Drinker): Drinker => ({ ...d, key: MATS_KEY, wade: -0.44 });
  const centre = KEYS.centre.position;
  const H = SHORE_HEADING;
  const list: Drinker[] = [
    // Each of the close ones has a time of its own inside its shot: one lifts its head soon after the key, one late, one has only just come
    // down to the water, one drinks on. The periods are short, for the shots are: five seconds, and under three.
    // The four of the shore shot: they stand off in the shallows, side on, the low sun behind them. One has its head up, a calf beside it, two drink.
    // No two are of one build: a tall rangy one, its calf, a short deep-chested one, and the big one, long in the back. Each stands its own
    // way and shifts a hoof at its own moment, and the trunk goes with the hoof. The calf lifts its head and takes a few steps on.
    made(shore(from(KEYS.shore, H - 7.5, 31, H + 84, 1, up(0.3), true)), { leg: 1.1, neck: 1.12, girth: 1.0, depth: 0.88, long: 1.07, head: 0.96 }, [0.05, -0.07, 0.02, 0.1], [
      { leg: 1, at: SHORE_KEY - 1.9, by: [0.02, 0.15] },
      { leg: 2, at: SHORE_KEY + 0.7, by: [-0.02, 0.16] },
    ]),
    { ...shore(from(KEYS.shore, H - 5.2, 29.5, H + 96, 1, sips(4.6, SHORE_KEY, 0.36), false, true)), gait: { pace: 0.5, cycle: 0.98, duty: 0.64, curve: 0.01, key: SHORE_KEY, from: SHORE_KEY + 1.35 } },
    made(shore(from(KEYS.shore, H - 1.5, 27, H + 92, 1, sips(7.5, SHORE_KEY, 0.14), false)), { leg: 0.95, neck: 0.93, girth: 1.32, depth: 1.08, long: 0.93, head: 1.04 }, [-0.11, 0.06, 0.12, -0.02], [
      { leg: 0, at: SHORE_KEY - 0.75, by: [0, 0.17] },
      { leg: 3, at: SHORE_KEY + 1.55, by: [0.02, -0.13] },
    ]),
    made(shore(from(KEYS.shore, H + 6.5, 21, H - 82, 1.04, sips(6.2, SHORE_KEY, 0.27), false)), { leg: 1.04, neck: 1.05, girth: 1.2, depth: 1.0, long: 1.09, head: 1.0 }, [0.1, -0.08, -0.05, 0.13], [
      { leg: 3, at: SHORE_KEY - 1.45, by: [0, 0.18] },
      { leg: 0, at: SHORE_KEY + 0.35, by: [0.02, 0.16] },
      { leg: 2, at: SHORE_KEY + 1.75, by: [0, 0.12] },
    ]),
    // The two of the last shot, below the camera with their backs to it, cut by the foot of the frame. Each lifts its head to the swell, not together.
    seenFromBehind({ ...one(centre[0] - 1.42, centre[2] - 13.5, 3, 1.12, (t) => 0.39 - 0.09 * ease(riseAt + 0.95, riseAt + 1.65, t) - 0.05 * ease(riseAt + 2.4, riseAt + 4.5, t) + 0.012 * Math.sin(t * 0.9), true, false), level: centre[1] - 3.74, alert: riseAt + 0.9, gives: 0.2, lifts: 0.1, looks: -0.3, key: riseAt + 1.7 }, { head: 0.74, neck: 0.8, girth: 1.12, depth: 1.05, stem: 0.74 }),
    seenFromBehind({ ...one(centre[0] + 0.85, centre[2] - 18.5, -13, 0.82, (t) => 0.43 - 0.15 * ease(riseAt + 1.2, riseAt + 1.75, t) - 0.05 * ease(riseAt + 3.0, riseAt + 5.0, t) + 0.012 * Math.sin(t * 0.8 + 2), true, false), level: centre[1] - 3.55, alert: riseAt + 1.15, lifts: 0.16, key: riseAt + 1.7 }, { head: 0.62, neck: 0.9, girth: 0.95, stem: 0.78, long: 0.92 }),
    // The ones of the mats shot. One is near, alone, side on with its head down, as the approved picture has it; two are far off behind it, one
    // of them upright and watching.
    // It shifts a hind hoof and then a fore hoof in the shot, and the lake rings at each.
    made(mats(from(KEYS.mats, -15, 16.5, 84, 1.05, sips(5, MATS_KEY, 0.3), false)), {}, [0, 0, 0, 0], [
      { leg: 1, at: MATS_KEY - 0.95, by: [0, 0.17] },
      { leg: 2, at: MATS_KEY + 0.4, by: [0.02, 0.16] },
    ]),
    // The upright one far off is on its way along the shelf, through the shallows.
    { ...mats(from(KEYS.mats, -25, 62, 262, 1, (t) => 0.14 + 0.04 * Math.sin(t * 0.7), true)), gait: { pace: 0.6, cycle: 1.2, duty: 0.66, curve: 0.004, key: MATS_KEY } },
    mats(from(KEYS.mats, -21.5, 74, 96, 0.9, sips(9, MATS_KEY, 0.42), false)),
  ];
  // The herd along the south shore, as the wide shot sees it. They are placed from that picture: loose knots of unequal number strung along the
  // near bank between the two rocks of the foreground, most on the gravel by the water, some in the shallows, two far out on the shelf.
  // `across` is where the knot stands across the frame at the key, and `lo` to `hi` how far up the bank from the water's edge, metres.
  const knots: { across: number; wide: number; n: number; lo: number; hi: number }[] = [
    { across: 0.37, wide: 0.035, n: 4, lo: -5, hi: 7 },
    { across: 0.48, wide: 0.04, n: 4, lo: 2, hi: 13 },
    { across: 0.565, wide: 0.01, n: 1, lo: 15, hi: 18 },
    { across: 0.65, wide: 0.05, n: 6, lo: -11, hi: 8 },
    { across: 0.78, wide: 0.04, n: 5, lo: -7, hi: 14 },
    { across: 0.875, wide: 0.03, n: 4, lo: -15, hi: 1 },
    { across: 0.55, wide: 0.12, n: 2, lo: -42, hi: -26 },
  ];
  let i = 0;
  for (const knot of knots) {
    for (let k = 0; k < knot.n; k++, i++) {
      const across = knot.across + rng.range(-knot.wide, knot.wide);
      // Evenly up the bank inside the knot, then shaken: no two of a knot stand at one depth, which from this camera would be one row.
      const out = knot.lo + ((k + 0.5 + rng.range(-0.4, 0.4)) / knot.n) * (knot.hi - knot.lo);
      const bearing = 201.6 - (across - 0.3) * 19.2 + Math.max(0, -out) * 0.035 * (across - 0.5);
      let [x, z] = at(bearing, shoreAt(bearing) + out);
      // None stands inside another: one that would is moved along the bank, away from the middle of its knot, until it has room.
      for (let tries = 0; tries < 8 && list.slice(CLOSE_COUNT).some((o) => Math.hypot(o.x - x, o.z - z) < 6.5); tries++) {
        [x, z] = at(bearing + (across < knot.across ? 0.5 : -0.5) * (tries + 1), shoreAt(bearing) + out);
      }
      const period = rng.range(9, 17);
      const phase = rng.next();
      const way = rng.next() < 0.5 ? 1 : -1;
      const dry = out > -0.5;
      const edge = out > -3 && out <= 0.5;
      // The same draws as ever, so every animal stands where it stood: what it does is laid over that by its number.
      const walked = i === 3 || i === 8 || i === 13 || i === 17;
      const kind = i % 9 === 4 ? 'calf' : edge ? 'edge' : dry || i % 3 === 2 ? 'up' : i % 5 === 1 ? 'back' : 'down';
      const drawn = walked ? 18 + 90 * way + rng.range(-14, 14) : kind === 'back' || kind === 'edge' ? 18 + (hash(i * 3.1) - 0.5) * 70 : 18 + 90 * way + rng.range(-34, 34);
      const span = rng.range(1.35, 2.1) * (kind === 'calf' ? 1.1 : 1);
      // Two sizes: the grown, and the half grown of the last two years, lighter in the trunk and longer in the leg.
      const young = kind !== 'calf' && hash(i * 2.7 + 0.4) < 0.3;
      const size = span * (young ? 0.7 : 1);
      // What it does in the shot. Half the herd is on its way somewhere: along the bank, down to the water, out of it, one away from the rest.
      // Some set off in the shot and some come to a stand in it. No two keep one pace.
      const does = WAYS[i];
      const lies = dry && !does && out > 4 && (i === 5 || i === 7 || i === 16 || i === 18);
      const facing = does?.facing === undefined ? drawn : does.facing === 'in' ? 18 + (hash(i * 3.1) - 0.5) * 50 : does.facing === 'out' ? 198 + (hash(i * 3.1) - 0.5) * 50 : drawn + does.facing;
      const drinks = !does && !lies && (kind === 'down' || kind === 'edge' || (kind === 'calf' && !dry));
      // Every head has its own moment: one that drinks lifts it, one that stands lets it down, each at a time no other has; the rest sip or look.
      const when = 0.25 + 2.3 * part(i * 0.618 + 0.11);
      const plan = hash(i * 4.7 + 1.3);
      // One that walks carries its head at a height of its own: some high and looking about, some low and reaching.
      const carried = 0.04 + 0.34 * hash(i * 8.3 + 0.7);
      const sipping = sips(period * 0.5, 0, phase);
      const head = does
        ? does.to !== undefined
          ? (t: number) => carried + (1 - carried) * ease((does.to as number) + 0.6, (does.to as number) + 1.9, t) * (does.again === undefined ? 1 : 1 - ease(does.again - 1.1, does.again - 0.2, t))
          : does.from !== undefined
            ? (t: number) => carried + (0.98 - carried) * (1 - ease((does.from as number) - 1.0, (does.from as number) - 0.15, t))
            : () => carried
        : drinks
          ? plan < 0.45
            ? (t: number) => 1 - 0.9 * ease(when, when + 0.85, t) * (1 - ease(when + 2.6 + 2 * plan, when + 3.9 + 2 * plan, t))
            : sipping
          : !lies && plan < 0.4
            ? (t: number) => 0.05 + 0.95 * ease(when, when + 1.25, t) * (1 - 0.93 * ease(when + 3.4 + 3 * plan, when + 4.2 + 3 * plan, t))
            : up(phase * 6);
      const o = one(x, z, facing, size, head, !does && !drinks, false, kind === 'calf');
      const gait: Gait | undefined = does && {
        pace: does.pace,
        cycle: does.trot ? 1.9 : 1.12 + 0.2 * hash(i * 5.3),
        duty: does.trot ? 0.44 : 0.64 + 0.05 * hash(i * 9.1),
        curve: (does.curve ?? (hash(i * 6.7) - 0.5) * 0.04) / size,
        key: WIDE_KEY - (does.ahead ?? 0),
        ...(does.from === undefined ? {} : { from: does.from }),
        ...(does.to === undefined ? {} : { to: does.to }),
        ...(does.again === undefined ? {} : { again: does.again }),
        ...(does.trot ? { trot: true } : {}),
      };
      list.push({ ...o, build: young ? { ...o.build, girth: o.build.girth * 0.9, depth: o.build.depth * 0.92, leg: o.build.leg * 1.05, head: o.build.head * 1.08 } : o.build, ...(gait ? { gait } : {}), ...(lies ? { lies: true } : {}) });
    }
  }
  // None walks into another: one whose way would bring it too near a neighbour inside the shot is turned about, and if that does not clear it, stands.
  const whereAt = (d: Drinker, t: number): [number, number] => {
    if (!d.gait) return [d.x, d.z];
    const w = wayAt(d.gait, d.x, d.z, d.facing * DEG, goneAt(d.gait, d.build.size, t));
    return [w.x, w.z];
  };
  const clear = (d: Drinker, k: number): boolean =>
    [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1].every((f) => {
      const t = f * WIDE_ENDS;
      const [x, z] = whereAt(d, t);
      return list.every((other, j) => {
        if (j < CLOSE_COUNT || j === k) return true;
        const [ox, oz] = whereAt(other, t);
        return Math.hypot(ox - x, oz - z) > Math.min(Math.hypot(other.x - d.x, other.z - d.z) - 0.2, 1.45 * (d.build.size + other.build.size));
      });
    });
  for (let k = CLOSE_COUNT; k < list.length; k++) {
    const d = list[k] as Drinker;
    if (!d.gait || clear(d, k)) continue;
    const about = [180, 90, -90, 45, -45, 135, -135].map((turn) => ({ ...d, facing: d.facing + turn })).find((c) => clear(c, k));
    if (about) list[k] = about;
    else {
      const { gait: _gait, ...stands } = d;
      list[k] = stands;
    }
  }
  return list;
}

export interface Ground {
  (x: number, z: number): number;
}

/** The pose of one that stands: it breathes, shifts its weight off a leg before it moves it, drinks, swallows, looks about. */
export function standPose(d: Drinker, t: number, ground: Ground, reach: number): Pose {
  const b = d.build;
  const s = b.size;
  const o = d.own;
  // One that walks is where its way has taken it, facing as its way runs there. Its hooves stand on places of that way (gait.ts).
  const g = d.gait;
  const gone = g ? goneAt(g, s, t) : 0;
  const way = g ? wayAt(g, d.x, d.z, d.facing * DEG, gone) : { x: d.x, z: d.z, bearing: d.facing * DEG };
  const pace = g ? paceAt(g, t) : 0;
  const bearing = way.bearing;
  const sinB = Math.sin(bearing);
  const cosB = Math.cos(bearing);
  const px = way.x;
  const pz = way.z;
  const y = d.level ?? Math.max(wadeOf(d), ground(px, pz));
  // Where in the round of its four legs it is.
  const round = g ? gone / (g.cycle * s) + o : 0;
  const shift: V3 = [0, 0, 0];
  let roll = 0;
  let tip = 0;
  const hooves: Hoof[] = [];
  // It stands on three legs and rests the fourth, a hind one: that hock is slack and forward, the toe only touches, the hip on that side hangs
  // and the trunk is carried over the three that bear. What takes its attention puts the leg back under it.
  // It does not rest one leg for ever: every few seconds, each at its own time, it sets that hoof down flat, stands square a moment, and lets
  // the other hind leg go.
  const change = (t - d.key) / (5.5 + 3.5 * hash(o * 53)) + hash(o * 29);
  const swapped = Math.floor(change);
  const into = change - swapped;
  const restLeg = Math.abs(swapped + (hash(o * 47) < 0.5 ? 0 : 1)) % 2;
  const rests = g || d.lies ? 0 : 0.8 * ease(0.07, 0.2, into) * (1 - ease(0.92, 1, into)) * (d.alert === undefined ? 1 : 1 - ease(d.alert - 0.1, d.alert + 0.3, t));
  for (let k = 0; k < 4; k++) {
    const every = d.stepEvery * (0.75 + 0.6 * hash(o * 17 + k));
    const u = (t - d.key) / every + 0.22 + 0.56 * hash(o * 31 + k * 3.7);
    const m = Math.floor(u);
    const since = (u - m) * every;
    const until = every - since;
    const swing = 0.62 + 0.3 * hash(o * 5 + k);
    const e = ease(0, swing, since);
    const offset = (j: number): [number, number] => [(hash(o * 7 + k * 13 + j * 1.37) - 0.5) * 0.14 * s, (hash(o * 11 + k * 5 + j * 2.11) - 0.5) * 0.26 * s];
    const a = offset(m - 1);
    const c = offset(m);
    const rest = restHoof(b, k);
    let hx = rest[0] + a[0] + (c[0] - a[0]) * e;
    let hz = rest[2] + a[1] + (c[1] - a[1]) * e + (d.stance?.[k] ?? 0) * s;
    let arcUp = Math.sin(Math.PI * e);
    let weight = Math.max(ease(1.0, 0.2, until), 1 - ease(swing * 0.6, swing + 0.7, since));
    // A hoof it moves at a moment of its own: the weight comes off the leg, the hoof is lifted and set down further on, and the trunk follows
    // it there. It has made the move by its key if the move is before the key, so it stands at the key as it was placed.
    for (const move of d.moves ?? []) {
      if (move.leg !== k) continue;
      const done = ease(move.at, move.at + 0.6, t);
      const far = done - (move.at < d.key ? 1 : 0);
      hx += move.by[0] * s * far;
      hz += move.by[1] * s * far;
      arcUp = Math.max(arcUp, Math.sin(Math.PI * done));
      weight = Math.max(weight, ease(move.at - 0.55, move.at - 0.05, t) * (1 - ease(move.at + 0.55, move.at + 1.05, t)));
      shift[2] += 0.32 * move.by[1] * s * (ease(move.at + 0.25, move.at + 1.2, t) - (move.at < d.key ? 1 : 0));
    }
    // One that gives ground: a hind hoof goes back, then the fore hoof across from it, then the other two. The trunk goes back with them.
    if (d.alert !== undefined && d.gives) {
      const start = d.alert + ([1.0, 0.32, 0.62, 1.3][k] as number);
      const g = ease(start, start + 0.42, t);
      hz -= d.gives * s * g;
      arcUp = Math.max(arcUp, Math.sin(Math.PI * g));
      weight = Math.max(weight, ease(start - 0.3, start - 0.04, t) * (1 - ease(start + 0.36, start + 0.75, t)));
      shift[2] -= 0.25 * d.gives * s * ease(start + 0.1, start + 0.7, t);
    }
    let lean = 0;
    if (g) {
      // The hoof stands on its place in the world while the trunk passes over it, then swings to the next. Told in the animal's own frame as
      // it is now, so a way that bends leaves no hoof turning on the ground.
      const step = stepAt(g, s, d.x, d.z, d.facing * DEG, gone, k, rest[0], rest[2], o);
      const dx = step.x - px;
      const dz = step.z - pz;
      hx = -cosB * dx - sinB * dz;
      hz = sinB * dx - cosB * dz;
      // A hoof in the air when it comes to a stand is set down where it is.
      arcUp = step.lift * Math.min(1, 2.5 * pace) * (g.trot ? 1.25 : 1);
      // Its weight is off the leg from just before the hoof leaves the ground until just after it is set down.
      weight = step.stands < 0 ? Math.min(1, 2.5 * pace) : Math.max(ease(0.82, 1, step.stands), 1 - ease(0, 0.14, step.stands)) * Math.min(1, 2.5 * pace);
      // The cannon goes with the leg: forward at the top as the hoof is left behind, back as it reaches out.
      lean = -0.42 * (hz - rest[2]) / s;
    }
    if (d.lies) {
      hx = rest[0] * 0.85;
      hz = rest[2] + (k < 2 ? 0.36 : 0.3) * s;
      arcUp = 0;
      weight = 0;
    }
    const slack = k === restLeg ? rests * (1 - arcUp) : 0;
    weight = Math.max(weight, slack);
    hz += 0.11 * s * slack;
    // The ground under this hoof, in the world.
    const wx = px - cosB * hx + sinB * hz;
    const wz = pz - sinB * hx - cosB * hz;
    const floor = d.level === undefined ? Math.max(wadeOf(d), ground(wx, wz)) - y : 0;
    hooves.push({ at: [hx, floor + (g ? 0.2 : 0.17) * s * arcUp + 0.012 * s * slack + 0.045 * s * Math.sin(Math.PI * slack / 0.8), hz], fold: d.lies ? 1 : Math.max(arcUp, 0.42 * slack), lean });
    // Its weight goes off the leg before the hoof leaves the ground and comes back on after it lands.
    const side = k % 2 === 0 ? 1 : -1;
    const hind = k < 2;
    shift[0] -= side * (g ? 0.035 : 0.08) * s * weight;
    // Seen close and side on, the weight coming off a leg is the whole trunk going the other way: forward off a hind leg, back off a fore
    // leg, down a little, and the far shoulder up as the near one sinks.
    shift[2] += (hind ? 1 : -1) * (g ? 0 : d.close ? 0.06 : 0.03) * s * weight;
    shift[1] -= (g ? 0.006 : d.close ? 0.02 : 0.012) * s * weight;
    roll += side * ((g ? (hind ? 0.03 : 0.012) : d.close ? 0.034 : 0.018) * weight + 0.075 * slack);
    tip += d.close && !g ? (hind ? 0.014 : -0.012) * weight : 0;
    shift[1] -= 0.01 * s * slack;
    // The hip over a leg at rest hangs, and the trunk stands over the other hind leg.
    shift[0] -= side * 0.085 * s * slack;
  }
  // What takes its attention sets it back on its haunches: the weight goes onto the hind legs and the croup sinks a little, then it eases.
  const taken = d.alert === undefined ? 0 : ease(d.alert - 0.05, d.alert + 0.5, t) * (1 - 0.45 * ease(d.alert + 1.6, d.alert + 4.2, t));
  shift[2] -= 0.075 * s * taken;
  shift[1] -= 0.018 * s * taken;
  // One that lies has its belly on the gravel. One that walks rises and sinks twice in a stride.
  if (d.lies) shift[1] -= standing(b) - 0.6 * s * b.depth;
  // One that walks sinks as each pair of legs takes its weight and rises over them, twice in a round; a trot throws it up off the ground.
  const tread = pace * Math.cos(round * Math.PI * 4 + 0.6);
  shift[1] += (g?.trot ? 0.05 : 0.02) * s * tread;
  // Before it sets off it leans back onto its haunches and then forward into the first step; as it halts the trunk runs on over the fore legs and settles back.
  if (g?.from !== undefined) shift[2] += s * (0.07 * ease(g.from - 0.1, g.from + 0.5, t) * (1 - ease(g.from + 0.6, g.from + 1.4, t)) - 0.05 * ease(g.from - 0.7, g.from - 0.25, t) * (1 - ease(g.from - 0.15, g.from + 0.3, t)));
  if (g?.to !== undefined) shift[2] += 0.06 * s * ease(g.to + 0.3, g.to + 0.9, t) * (1 - ease(g.to + 1.0, g.to + 2.0, t));
  // The neck: each joint follows the one below it a little late, the head last.
  // Seen close, the head leads: it levels before the neck lifts it, and tips before the neck lets it down.
  const drive = (i: number): number => (d.close ? d.down(i === 4 ? t + 0.16 : t - 0.02 * i) : d.down(t - 0.075 * i));
  const low = Math.min(1, Math.max(0, d.down(t)));
  const neck: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  // A walking head nods: down as each fore hoof takes the weight, the head a little after the neck.
  for (let i = 0; i < 5; i++) neck[i] = drive(i) * reach + 0.045 * pace * Math.sin(round * Math.PI * 4 + 1.1 - 0.5 * i);
  // One that stares holds its head level, whatever its neck does.
  if (d.alert !== undefined) neck[4] *= 1 - 0.8 * ease(d.alert, d.alert + 0.5, t);
  // One that looks up at what rises lifts its muzzle past level, and holds it there.
  if (d.alert !== undefined && d.lifts) neck[4] -= d.lifts * ease(d.alert + 0.1, d.alert + 0.9, t);
  // With its mouth in the water it sips: the head works a little and each mouthful swells the neck on its way up to the chest.
  const sipping = ease(0.9, 0.99, low);
  neck[4] += sipping * 0.012 * Math.sin(t * 13.8 + o * 40);
  const gulp: [number, number, number, number] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) gulp[i] = 0.05 * sipping * Math.max(0, Math.sin(t * 8.6 + o * 30 + i * 1.3)) ** 2;
  // One that watches turns its head to something and holds it, then to something else: the head first, the neck after it.
  const turn: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const lookEvery = 2.6 + 2.4 * hash(o * 43);
  const lu = t / lookEvery + hash(o * 3);
  const lm = Math.floor(lu);
  const ls = (lu - lm) * lookEvery;
  const lookAt = (j: number): number => (hash(o * 59 + j * 0.77) - 0.5) * (d.watches ? 1.3 : 0.5);
  const headTurn = lookAt(lm - 1) + (lookAt(lm) - lookAt(lm - 1)) * ease(0, 0.6, ls);
  const neckTurn = lookAt(lm - 1) + (lookAt(lm) - lookAt(lm - 1)) * ease(0.12, 1.1, ls);
  const free = (1 - 0.85 * sipping) * (d.alert === undefined ? 1 : 1 - 0.9 * ease(d.alert, d.alert + 0.45, t));
  for (let i = 0; i < 4; i++) turn[i] = 0.12 * neckTurn * free;
  turn[4] = 0.52 * headTurn * free;
  // What rises is off to one side of where it faces: the neck turns a little to it and the head the rest of the way.
  if (d.alert !== undefined && d.looks) {
    const to = d.looks * ease(d.alert + 0.05, d.alert + 0.75, t);
    for (let i = 0; i < 4; i++) turn[i] += 0.1 * to;
    turn[4] += 0.6 * to;
  }
  // The tail hangs and now and then flicks.
  const flickEvery = 3.2 + 4 * hash(o * 23);
  const fu = t / flickEvery + hash(o * 67);
  const fs = (fu - Math.floor(fu)) * flickEvery;
  const tail: [number, number] = [0.05 + 0.04 * Math.sin(t * 0.7 + o * 9), 0.07 * Math.sin(t * 1.3 + o * 20) + 0.55 * Math.sin(fs * 15) * Math.exp(-fs * 3.5)];
  const breathEvery = 2.7 + 1.2 * hash(o * 83);
  const breath = 0.05 * Math.sin((t / breathEvery + o) * Math.PI * 2);
  shift[0] += 0.012 * s * Math.sin(t * 0.47 + o * 12);
  shift[2] += 0.01 * s * Math.sin(t * 0.31 + o * 25) + 0.07 * s * low;
  shift[1] += 0.004 * s * Math.sin((t / breathEvery + o) * Math.PI * 2) - 0.045 * s * low - 0.02 * s;
  return {
    x: px,
    y,
    z: pz,
    bearing,
    shift,
    pitch: tip + 0.05 * low + 0.004 * Math.sin(t * 0.53 + o * 7) - 0.03 * taken + 0.014 * pace * Math.sin(round * Math.PI * 4 - 0.4),
    roll,
    yaw: 0.01 * Math.sin(t * 0.37 + o * 3),
    // In a walk the hind end swings with the hind legs and the fore end against it: the spine bends from side to side once in a round.
    chest: [0.04 * neckTurn * free - 0.05 * pace * Math.sin(round * Math.PI * 2 + 0.9), 0.03 * low],
    pelvis: [0.3 * roll + 0.07 * pace * Math.sin(round * Math.PI * 2 + 0.9), 0],
    neck,
    turn,
    gulp,
    tail,
    hooves: hooves as [Hoof, Hoof, Hoof, Hoof],
    breath,
  };
}

/** The four hooves of one that walks, in the world: where each is, how far through its stand (negative: in the air), and the animal's pace, 0 to 1. */
export function footfalls(d: Drinker, t: number): { x: number; z: number; stands: number; pace: number }[] {
  const g = d.gait;
  if (!g) return [];
  const s = d.build.size;
  const gone = goneAt(g, s, t);
  const pace = paceAt(g, t);
  return [0, 1, 2, 3].map((k) => {
    const rest = restHoof(d.build, k);
    const step = stepAt(g, s, d.x, d.z, d.facing * DEG, gone, k, rest[0], rest[2], d.own);
    return { x: step.x, z: step.z, stands: step.stands, pace };
  });
}
