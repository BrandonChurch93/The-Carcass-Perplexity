// Who stands where, and what each one does: the animals the close shots are about, placed from the cameras of those shots, and the herd along
// the south shore. Every animal is a pure function of time: where its hooves stand, when it shifts a leg, how far its neck is down, where it looks.
import { KEYS, SHORE_HEADING } from '../cameras';
import { DEG, at, shoreAt } from '../layout';
import type { Rng } from '../../../core/rng';
import { restHoof, type Build, type Hoof, type Pose, type V3 } from './skeleton';

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
  /** When something ahead of it takes its whole attention: from then it looks nowhere else. */
  alert?: number;
  /** A number of its own, 0 to 1: its coat, its clocks. */
  own: number;
  /** Seconds between the steps of one leg, about. */
  stepEvery: number;
  /** The moment its shot is judged by: it stands on all four then. */
  key: number;
}

/** Seconds into the place at the keys of the shore shot (frame 9003) and of the mats shot (frame 8600), at 60 frames a second. */
const SHORE_KEY = (9003 - 8305) / 60;
const MATS_KEY = (8600 - 8305) / 60;

/** How deep they wade: the bed they stand on is never further under the water than this, metres. */
export const WADE = -0.16;

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
    return { x, z, facing, build: build(size, own, calf), down, watches, close, own, stepEvery: 9 + 9 * hash(own * 19), key: 0 };
  };
  const from = (key: { position: [number, number, number] }, bearing: number, distance: number, facing: number, size: number, down: (t: number) => number, watches: boolean, calf = false): Drinker =>
    one(key.position[0] + Math.sin(bearing * DEG) * distance, key.position[2] - Math.cos(bearing * DEG) * distance, facing, size, down, watches, true, calf);
  const shore = (d: Drinker): Drinker => ({ ...d, key: SHORE_KEY });
  const mats = (d: Drinker): Drinker => ({ ...d, key: MATS_KEY });
  const centre = KEYS.centre.position;
  const H = SHORE_HEADING;
  const list: Drinker[] = [
    // The four of the shore shot: they stand off in the shallows, side on, the low sun behind them. One has its head up, a calf beside it, two drink.
    shore(from(KEYS.shore, H - 7.5, 31, H + 84, 1, up(0.3), true)),
    shore(from(KEYS.shore, H - 5.2, 29.5, H + 96, 1, sips(9, SHORE_KEY, 0.2), false, true)),
    shore(from(KEYS.shore, H - 1.5, 27, H + 92, 1, sips(11, SHORE_KEY, 0.34), false)),
    shore(from(KEYS.shore, H + 6.5, 21, H - 82, 1.04, sips(13, SHORE_KEY, 0.08), false)),
    // The two of the last shot, below the camera with their backs to it, cut by the foot of the frame. Each lifts its head to the swell, not together.
    { ...one(centre[0] - 1.22, centre[2] - 13.5, 6, 1.12, (t) => 0.78 - 0.46 * ease(riseAt + 0.95, riseAt + 1.65, t) - 0.05 * ease(riseAt + 2.4, riseAt + 4.5, t) + 0.012 * Math.sin(t * 0.9), true, false), level: centre[1] - 3.83, alert: riseAt + 0.9, key: riseAt + 1.7 },
    { ...one(centre[0] + 0.72, centre[2] - 16.5, -8, 1.0, (t) => 0.84 - 0.54 * ease(riseAt + 1.2, riseAt + 1.75, t) - 0.05 * ease(riseAt + 3.0, riseAt + 5.0, t) + 0.012 * Math.sin(t * 0.8 + 2), true, false), level: centre[1] - 3.9, alert: riseAt + 1.15, key: riseAt + 1.7 },
    // The ones of the mats shot: out on the shelf beyond the mats, small, side on. Both companions are down at the key.
    mats(from(KEYS.mats, -13, 31, 80, 1, sips(10, MATS_KEY, 0.3), false)),
    mats(from(KEYS.mats, -21, 44, 262, 1, sips(12, MATS_KEY, 0.12), false)),
    mats(from(KEYS.mats, -17.5, 52, 96, 0.9, sips(9, MATS_KEY, 0.42), false)),
  ];
  // The herd along the south shore, as the wide shot sees it: in the shallows and on the gravel.
  // They stand in loose bands of two to five, some far out on the shelf, some up on the gravel: never one row along the water.
  let band = 196;
  let out = -10;
  for (let i = 0; i < 26; i++) {
    if (i % 4 === 0) {
      band = rng.range(187, 199);
      out = i % 8 === 0 ? rng.range(3, 12) : rng.range(-20, -1.5);
    }
    const dry = out > 0;
    const bearing = band + rng.range(-1.3, 1.3);
    const r = shoreAt(bearing) + out + rng.range(-3, 3);
    const [x, z] = at(bearing, r);
    const period = rng.range(9, 17);
    const phase = rng.next();
    const kind = i % 9 === 4 ? 'calf' : i % 5 === 1 ? 'back' : dry || i % 3 === 2 ? 'up' : 'down';
    const way = rng.next() < 0.5 ? 1 : -1;
    // None of the herd stands in front of the low cameras of the close shots: those have their own animals, placed for them.
    const hidden = Math.min(...[KEYS.mats, KEYS.edge, KEYS.shore].map((k) => Math.hypot(x - k.position[0], z - k.position[2]))) < 110;
    const facing = kind === 'back' ? 18 + (hash(i * 3.1) - 0.5) * 56 : 18 + 90 * way + rng.range(-28, 28);
    const size = rng.range(1.35, 2.1) * (kind === 'calf' ? 1.1 : 1);
    rng.next();
    list.push({
      ...one(x, z, facing, size, kind === 'up' || kind === 'back' ? up(phase * 6) : sips(period, 0, phase), kind === 'up' || kind === 'back', false, kind === 'calf'),
      wideOnly: hidden,
    });
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
  const bearing = d.facing * DEG;
  const y = d.level ?? Math.max(WADE, ground(d.x, d.z));
  const sinB = Math.sin(bearing);
  const cosB = Math.cos(bearing);
  const shift: V3 = [0, 0, 0];
  let roll = 0;
  const hooves: Hoof[] = [];
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
    const hx = rest[0] + a[0] + (c[0] - a[0]) * e;
    const hz = rest[2] + a[1] + (c[1] - a[1]) * e;
    const arcUp = Math.sin(Math.PI * e);
    // The ground under this hoof, in the world.
    const wx = d.x - cosB * hx + sinB * hz;
    const wz = d.z - sinB * hx - cosB * hz;
    const floor = d.level === undefined ? Math.max(WADE, ground(wx, wz)) - y : 0;
    hooves.push({ at: [hx, floor + 0.17 * s * arcUp, hz], fold: arcUp });
    // Its weight goes off the leg before the hoof leaves the ground and comes back on after it lands.
    const weight = Math.max(ease(1.0, 0.2, until), 1 - ease(swing * 0.6, swing + 0.7, since));
    const side = k % 2 === 0 ? 1 : -1;
    const hind = k < 2;
    shift[0] -= side * 0.06 * s * weight;
    shift[2] += (hind ? 1 : -1) * 0.03 * s * weight;
    shift[1] -= 0.012 * s * weight;
    roll += side * 0.012 * weight;
  }
  // The neck: each joint follows the one below it a little late, the head last.
  const drive = (i: number): number => d.down(t - 0.075 * i);
  const low = Math.min(1, Math.max(0, d.down(t)));
  const neck: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (let i = 0; i < 5; i++) neck[i] = drive(i) * reach;
  // One that stares holds its head level, whatever its neck does.
  if (d.alert !== undefined) neck[4] *= 1 - 0.8 * ease(d.alert, d.alert + 0.5, t);
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
  // The tail hangs and now and then flicks.
  const flickEvery = 3.2 + 4 * hash(o * 23);
  const fu = t / flickEvery + hash(o * 67);
  const fs = (fu - Math.floor(fu)) * flickEvery;
  const tail: [number, number] = [0.05 + 0.04 * Math.sin(t * 0.7 + o * 9), 0.07 * Math.sin(t * 1.3 + o * 20) + 0.55 * Math.sin(fs * 15) * Math.exp(-fs * 3.5)];
  const breathEvery = 2.7 + 1.2 * hash(o * 83);
  const breath = 0.022 * Math.sin((t / breathEvery + o) * Math.PI * 2);
  shift[0] += 0.012 * s * Math.sin(t * 0.47 + o * 12);
  shift[2] += 0.01 * s * Math.sin(t * 0.31 + o * 25) + 0.07 * s * low;
  shift[1] += 0.004 * s * Math.sin((t / breathEvery + o) * Math.PI * 2) - 0.045 * s * low - 0.02 * s;
  return {
    x: d.x,
    y,
    z: d.z,
    bearing,
    shift,
    pitch: 0.05 * low + 0.004 * Math.sin(t * 0.53 + o * 7),
    roll,
    yaw: 0.01 * Math.sin(t * 0.37 + o * 3),
    chest: [0.04 * neckTurn * free, 0.03 * low],
    pelvis: [0.3 * roll, 0],
    neck,
    turn,
    gulp,
    tail,
    hooves: hooves as [Hoof, Hoof, Hoof, Hoof],
    breath,
  };
}
