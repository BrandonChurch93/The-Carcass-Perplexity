// The kite-wings: feeders wading the pools, the colony on the ledges of its rock, the flock round the rib tops, a skein coming in from the sea,
// the ones that land, and the ones that run from the bore. The waders are bodies (body.ts) that stand and step on their own feet (gait.ts); the
// rest are still the Builder's pictures of the animal, stood in the place and bent about their joints. Every pose is a function of the time
// of the place alone.
import * as THREE from 'three';
import { config } from '../../../config';
import { resolve } from '../../../core/cameras';
import { partOfFrame, secondsInPlace, shotById, shotsOf } from '../../../film/cut';
import { approachAsScattered, approachEye, openingCamera, shots } from '../cameras';
import { BORE, COLONY, LEVELS, RIBS, STATIONS, T0, UNIT, WIND, keySeconds, shotSpan } from '../shared/anchors';
import { CRAG } from '../shared/crag';
import type { Context, Piece } from '../shared/context';
import { FLOCK, OPENING_END, inOpening } from '../shared/opening';
import { gone, leaving, type Leaver } from './leaving';
import { loopPhase } from '../shared/stage';
import { partAtHeight, ribByName, surface } from '../layout';
import { foamTexture } from '../sea/chop';
import { Spray, rand } from '../sea/spray';
import { RING_SOURCE } from '../sea/tide';
import type { Ring } from '../sea/tide';
import { BONES, Bodies, HEAD_REST, bodyMaterials, headInPlace, pose } from './body';
import type { Pose } from './body';
import { CONTACTS, MAX_CONTACTS } from './contacts';
import type { Contact } from './contacts';
import { FEEDER_C, FLIERS, Figures, PERCHED, figureMaterials, placed } from './figure';
import type { Placed } from './figure';
import { Flight, flierMaterials, flying } from './flier';
import { footAt, ramp, wayAt } from './gait';
import { SEAT, roostPose } from './roost';
import { nestMats } from './nest';
import type { Roosting, Stance } from './roost';
import type { At, Step, Way } from './gait';

/** The kite-wing of the approved pictures stands twice a man at the back: the old measure of its size, kept for the flock's scatter. */
const GROW = 1.35;

export const PARTS: readonly string[] = ['kite-wings'];

const FEEDERS = 44;
const FLIERS_N = 451;
const SPECKS = 560;
const PASSERS = 6;
const LOW = 6;
const FLEEING = 9;
/** Drops thrown and shed by one that leaves the flats. */
const KICK_DROPS = 36;
const COLONISTS = 40;
/** With those that sit low round them in clumps. */
const ROOKERY = 130;
/** Those of them nearest the colony's lens that are bodies while its shot runs: the rest, and all of them in every other shot, are sheets. */
const ROOSTING = 84;
/** And those put down beside them on the same ledges. */
const MATES = 136;
/** Whether the crouched bodies of the colony are drawn in place of its nearest sheets: not until they sit right. */
const ROOSTED: boolean = true;
/** Which of them, counted from the colony's lens, are the large ones with their sails part open: not neighbours. */
const LARGE = [0, 3, 7, 12];
const SKEIN = 22;
/** Metres a flier keeps from every lens. */
const CLEAR = 45;
/** Seconds the shutter is open, for the softness of what crosses the lens fast. */
const SHUTTER = 1 / 50;
/** The approach: no flier is near enough to be read as a model. The widest a wing stands at the lens as the film opens (radians), the metres of wing to a unit of size, and the seconds between which that limit grows away (by e to the `grow`). */
const FAR = { wing: 0.0017, span: 4.5, from: 4.5, to: 10.5, grow: 7 };

/** The approach: a colony lifts off a ledge of the first blade. Where the ledge is, the metres round it from which its fliers come, when the first leaves, over how many seconds they leave, and how long each takes to be on its own way. */
const LIFT = { at: [-236, 236, 34] as const, within: 320, from: 0.4, spread: 3, takes: 8 };
const TAU = Math.PI * 2;
const LOOP_SECONDS = config.deliver.cardLoop.seconds;

// The card loop. In the film `lp` is null and every animal is a function of the seconds of the place, as it always was.
// In the loop it is the loop's phase, 0 to 1, and every animal is a function of it alone: at phase 0 it is what the film has at the establishing key,
// and every cycle is fitted to a whole number of turns to the loop. So the world of a frame and the world one loop length earlier hold the same
// animal in the same pose, and the engine's cross-fade never shows one twice.
let lp: number | null = null;

/** The angle t * rate + shift (+ more) of a cycle. In the loop: the angle the film has at the key, and a whole number of turns round the loop. */
const turns = (t: number, rate: number, shift: number, more = 0): number =>
  lp === null ? t * rate + shift + more : T0 * rate + shift + more + Math.max(1, Math.round((Math.abs(rate) * LOOP_SECONDS) / TAU)) * Math.sign(rate) * TAU * lp;
const wave = (t: number, rate: number, shift: number, more = 0): number => Math.sin(turns(t, rate, shift, more));

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7 + 1.3) * 43758.5453;
  return s - Math.floor(s);
};
/** A value held, then changed: a new one every `every` seconds, moved to over `over` of the span. */
const held = (t: number, every: number, key: number, over = 0.22): number => {
  const u = t / every + key * 17.3;
  const n = Math.floor(u);
  return hash(n, key) + (hash(n + 1, key) - hash(n, key)) * smooth(1 - over, 1, u - n);
};
/** `held`, and in the loop the same run of values begun where the film is at the key and brought round after a whole number of them. */
const heldAt = (t: number, every: number, key: number, over = 0.22): number => {
  if (lp === null) return held(t, every, key, over);
  const count = Math.max(1, Math.round(LOOP_SECONDS / every));
  const u0 = T0 / every + key * 17.3;
  const n0 = Math.floor(u0);
  const u = u0 - n0 + lp * count;
  const k = Math.floor(u);
  const a = hash(n0 + (k % count), key);
  return a + (hash(n0 + ((k + 1) % count), key) - a) * smooth(1 - over, 1, u - k);
};

interface Spot {
  x: number;
  y: number;
  z: number;
  yaw: number;
  roll: number;
}

/** What a feeder does: 0 feeds with its tuft in the pool and lifts its head between, 1 stands on one leg and shakes its tuft dry, 2 runs with its sails up. */
type Habit = 0 | 1 | 2;
interface Feeder {
  x: number;
  z: number;
  yaw: number;
  size: number;
  habit: Habit;
  seed: number;
  period: number;
  offset: number;
  /** In the card loop a feeder's cycle is the loop's length: where in it the feeder is at the loop's start. */
  loopStart: number;
  /** A runner is at its station at this second, and is in the place only for `span` seconds either side of it. */
  at: number;
  span: number;
  /** The length of its step, the way it wades (it is at its station half a step along it), and the steps it takes each time its head is up. */
  step: number;
  way: Way;
  walks: number;
  /** In the card loop: the closed way one of the walkers goes round. */
  round: Way | null;
}
const RUN_SPEED = 5.2;
/** A runner's step, metres at size 1. */
const RUN_STEP = 1.72;
/** A feeder's hips stand this high over its ankles at size 1, and the root of its tuft this high over the bed when it feeds. */
const HIPS_HIGH = 2.0;
const TUFT_HIGH = 1.1;

export function create(ctx: Context): Piece {
  const rig = ctx.rig;
  const scatter = ctx.rng('kite-wings');
  // What a foot stands on. Where the bed lies deep under a pool the water is murky and the wader keeps to what bears it a hand under the surface.
  const ground = (x: number, z: number): number => Math.max(rig.land.height(x, z), LEVELS.pool - 0.2);

  // Where the cameras go: nothing flies through a lens, nothing stands on a track.
  const eyes: { t: number; at: [number, number, number] }[] = [];
  for (const shot of shotsOf(UNIT)) {
    const path = shots[shot.id];
    if (!path) continue;
    for (let frame = shot.first; frame <= shot.last; frame += 6) {
      eyes.push({ t: secondsInPlace(UNIT, frame), at: resolve(path, partOfFrame(shot, frame), frame).position });
    }
  }
  const nearTrack = (x: number, z: number, reach: number): boolean => eyes.some((e) => Math.hypot(x - e.at[0], z - e.at[2]) < reach);
  /** Where the lens is at t, to the tenth of a second: which side of itself a flier shows it. */
  const eyeAt = (t: number): [number, number, number] => {
    let best = eyes[0] as (typeof eyes)[number];
    for (const e of eyes) {
      if (e.t > t + 1e-6) break;
      best = e;
    }
    return best.at;
  };

  // ---- Feeders ----
  const feeders: Feeder[] = [];
  const addFeeder = (x: number, z: number, yaw: number, size: number, habit: Habit, at = -1, span = 1e9): void => {
    const period = scatter.range(8, 13);
    const seed = scatter.next();
    const step = 1.1 * size * (0.92 + 0.16 * hash(seed, 31));
    const way: Way = { x, z, yaw, s0: 0.5 * step, pieces: [[1e6, (hash(seed, 33) - 0.5) * 0.12]], closed: false };
    const walks = habit === 0 ? ([0, 1, 1, 2, 2][Math.floor(hash(seed, 35) * 5)] as number) : 0;
    const f: Feeder = { x, z, yaw, size, habit, seed, period, offset: scatter.range(0, 40), loopStart: 0, at, span, step, way, walks, round: null };
    // One stationed for a key has had its tuft in the water for half a second when the key comes.
    if (at >= 0 && habit === 0) f.offset = period - ((at - 0.5) % period);
    // The loop's cycle ends as the film's does (the head up, then down again), so a feeder is at the loop's start what it is at the key.
    // One that the film has more than a loop's length from lifting its head probes, as there, and lifts it later in the loop.
    const left = period - ((((T0 + f.offset) % period) + period) % period);
    f.loopStart = left <= LOOP_SECONDS ? LOOP_SECONDS - left : (left - LOOP_SECONDS) % (LOOP_SECONDS - 3.4);
    feeders.push(f);
  };
  const feedKey = keySeconds('ribs-2');
  const feedShot = shotById('ribs-04');
  const feedEye = resolve(shots['ribs-04'] as (typeof shots)[string], 0.5, feedShot.first).position;
  // The three before the feeding camera show it their sides, each a little off the square.
  const sideOn = (x: number, z: number, off: number): number => Math.atan2(z - feedEye[2], -(x - feedEye[0])) + off;
  // Staged for the establishing key: the eight of the wide picture stand off their stations, no two at one distance, so that they do not read as a row.
  STATIONS.feeders.forEach((s, i) => {
    if (i >= 8) return;
    const x = s[0] + scatter.range(-9, 9);
    const z = s[1] + scatter.range(-14, 14);
    addFeeder(x, z, s[2] + scatter.range(-0.5, 0.5), scatter.range(0.82, 1.08), i % 3 === 1 ? 1 : 0, i % 3 === 1 ? -1 : T0 + scatter.range(-2, 2));
  });
  {
    const from = STATIONS.establish;
    const out = (bearing: number, far: number): [number, number] => [from[0] + Math.sin((bearing * Math.PI) / 180) * far, from[1] - Math.cos((bearing * Math.PI) / 180) * far];
    // The second hero of the wide picture: feeding, right of centre, 47 m out.
    const hero = out(24, 47);
    addFeeder(hero[0], hero[1], -1.9, 1.05, 0, T0);
    // Staged for the establishing key: the far right one runs and lifts off with its sails spread. It is in the place for that shot alone.
    const runner = out(40, 64);
    addFeeder(runner[0], runner[1], 2.2, 1, 2, T0, 3.6);
  }
  // Staged for the feeding key: the three stand nearer its lens than their stations. The first feeds, filling the right of the frame; the
  // second shakes its tuft dry; the third runs off with its sails up, and is in the place for that shot alone.
  const NEARER: [number, number][] = [[-54.83, -434.61], [-55.4, -455.2], [-61.5, -464]];
  NEARER.forEach(([x, z], i) => {
    if (i === 0) addFeeder(x, z, sideOn(x, z, 0.2), 0.92, 0, feedKey);
    else if (i === 1) addFeeder(x, z, sideOn(x, z, -0.25), 1, 1);
    else addFeeder(x, z, sideOn(x, z, 0.12), 0.95, 2, feedKey, 2.2);
  });
  for (let tries = 0; feeders.length < FEEDERS && tries < 4000; tries++) {
    const x = scatter.range(-200, 300);
    const z = scatter.range(-1150, 90);
    const yaw = scatter.range(0, Math.PI * 2);
    const h = ground(x, z);
    if (nearTrack(x, z, 30) || h < 0.7 || h > 1.5 || Math.abs(ground(x + Math.sin(yaw) * 6, z + Math.cos(yaw) * 6) - h) > 0.5) continue;
    addFeeder(x, z, yaw, scatter.range(0.8, 1.05), scatter.next() < 0.62 ? 0 : 1);
  }
  /** In the card loop these of the wide picture walk a closed way of eight steps: out, round, back and round again into the stance of the key. */
  const walkers = [feeders[1], feeders[4], feeders[7]];
  for (const f of walkers) {
    if (!f) continue;
    const turn = 0.72 * f.size;
    const straight = 4 * f.step - Math.PI * turn;
    const side = hash(f.seed, 37) < 0.5 ? 1 : -1;
    f.round = { x: f.x, z: f.z, yaw: f.yaw, s0: 0.5 * f.step, pieces: [[straight, 0], [Math.PI * turn, side / turn], [straight, 0], [Math.PI * turn, side / turn]], closed: true };
  }
  const runnerSheet = figureMaterials(ctx, FEEDER_C, LEVELS.pool, 0.4);
  const runners = new Figures(runnerSheet, feeders.length, { mirror: true });
  const bodySheet = bodyMaterials(ctx, LEVELS.pool, 0.3);
  const bodies = new Bodies(bodySheet, feeders.length);
  const discs = rig.contactDiscs(feeders.length + 4);

  const fig = placed();
  /** The body of the feeder last asked for. */
  const P: Pose = pose();
  /** Where the end of the tuft is, and how far it is in the water (0 to 1); for a runner, how hard its feet strike. */
  const tuft = { x: 0, y: 0, z: 0, wet: 0, shake: 0, here: true };
  const stood: Step = { x: 0, z: 0, yaw: 0, carry: 0 };
  const hips: At = { x: 0, z: 0, yaw: 0 };
  const moved: [number, number, number] = [0, 0, 0];

  /**
   * A foot put somewhere else while the animal stands: where the foot of `leg` is from its place, [ahead, aside, lifted 0 to 1], and into
   * `lean` how far the weight has gone off it and how far the hips have dipped for it. `count` events to a cycle, each begun at its own time
   * in the cycle's first `span` seconds. In the film the legs take turns; in the loop one leg goes out and comes back, so that it comes round.
   */
  const lean = { off: 0, dip: 0 };
  const shuffle = (f: Feeder, leg: number, cycle: number, ph: number, span: number, count: number, out: [number, number, number]): void => {
    const own = hash(f.seed, 41) < 0.5 ? 0 : 1;
    const place = (j: number, o: [number, number]): void => {
      o[0] = (hash(f.seed + leg * 7.7, j * 3.1 + 50) - 0.5) * 0.56 * f.size;
      o[1] = (hash(f.seed + leg * 5.3, j * 2.3 + 60) - 0.35) * 0.12 * f.size;
    };
    const a: [number, number] = [0, 0];
    const b: [number, number] = [0, 0];
    let j = lp === null ? Math.floor((cycle * count + (leg === 0 ? 1 : 0)) / 2) : 0;
    let u = 0;
    const takes = 0.85;
    for (let e = 0; e < count; e++) {
      const whose = lp === null ? (cycle * count + e) % 2 : own;
      const from = 0.5 + ((e + 0.1 + 0.55 * hash(f.seed, 43 + e + (lp === null ? cycle * 3 : 0))) * span) / count;
      const side = whose === 0 ? -1 : 1;
      // The weight goes over the other foot and the hips dip before this one is lifted, and come back when it is down.
      const on = smooth(from - 0.7, from - 0.05, ph) * (1 - smooth(from + takes - 0.1, from + takes + 0.7, ph));
      if (leg === 0) {
        lean.off += side * on;
        lean.dip += smooth(from - 0.7, from - 0.2, ph) * (1 - smooth(from - 0.1, from + 0.3, ph));
      }
      if (whose !== leg) continue;
      if (ph < from) break;
      if (ph < from + takes) {
        u = (ph - from) / takes;
        break;
      }
      j++;
    }
    if (lp !== null) j %= 2;
    place(j, a);
    place(lp === null ? j + 1 : (j + 1) % 2, b);
    const e = u * u * (3 - 2 * u);
    out[0] = a[0] + (b[0] - a[0]) * e;
    out[1] = a[1] + (b[1] - a[1]) * e;
    out[2] = Math.sin(Math.PI * u);
  };
  const noNudge = (n: number, o: [number, number]): void => {
    o[0] = 0;
    o[1] = 0 * n;
  };

  /** The body of one feeder at t into `p`: where its feet are, then its hips over them, then its head. Not for a runner. */
  const stand = (f: Feeder, t: number, p: Pose): void => {
    const size = f.size;
    const period = lp === null ? f.period : LOOP_SECONDS;
    const at = lp === null ? t + f.offset : f.loopStart + LOOP_SECONDS * lp;
    const cycle = lp === null ? Math.floor(at / period) : 0;
    const ph = at - Math.floor(at / period) * period;
    const walker = lp !== null && f.round !== null;
    let way = f.way;
    let s = 0.5 * f.step;
    let up = 0;
    let shake = 0;
    let dipHead = 0;
    let span = period - 4.6;
    if (walker) {
      // Four steps, a stand with the head put down, four steps more, and a stand: each at its own time in the loop.
      way = f.round as Way;
      const long = 0.8 + 0.1 * hash(f.seed, 3);
      const u = ((((lp as number) - 0.03 - (0.97 - long) * hash(f.seed, 5)) % 1) + 1) % 1 / long;
      s += 4 * f.step * (ramp(u / 0.43) + ramp((u - 0.55) / 0.43));
      dipHead = smooth(0.42, 0.47, u) * (1 - smooth(0.53, 0.57, u)) + smooth(0.985, 1.02, u) * (1 - smooth(1 / long - 0.06, 1 / long, u));
      span = 0;
    } else if (f.habit === 0) {
      // Probing, then the head comes up streaming, looks about, and goes back in: and while it is up the animal wades on a step or two.
      up = smooth(period - 3.4, period - 2.5, ph) * (1 - smooth(period - 0.75, period - 0.1, ph));
      shake = smooth(period - 0.5, period - 0.1, ph) + (1 - smooth(0, 0.7, ph));
      if (lp === null && f.walks > 0) {
        const gone = (c: number, q: number): number => f.walks * f.step * (c + ramp((q - (f.period - 3.1)) / 2.5, 0.25));
        const ref = (f.at >= 0 ? f.at : T0) + f.offset;
        const c0 = Math.floor(ref / f.period);
        s += gone(cycle, ph) - gone(c0, ref - c0 * f.period);
      }
    } else {
      span = period - 3;
    }

    // The feet.
    let lift = 0;
    let highest = 0;
    lean.off = 0;
    lean.dip = 0;
    let bed = 0;
    for (let leg = 0; leg < 2; leg++) {
      const foot = p.feet[leg] as Pose['feet'][number];
      footAt(way, leg, s, f.step, 0.13 * size, noNudge, stood);
      let raised = 0.24 * size * Math.sin(Math.PI * stood.carry);
      let droop = 0.7 * Math.sin(Math.PI * stood.carry);
      if (span > 0) {
        shuffle(f, leg, cycle, ph, span, span > 5 && lp === null ? 4 : 2, moved);
        stood.x += Math.sin(stood.yaw) * moved[0] - Math.cos(stood.yaw) * moved[1] * (leg === 0 ? 1 : -1);
        stood.z += Math.cos(stood.yaw) * moved[0] + Math.sin(stood.yaw) * moved[1] * (leg === 0 ? 1 : -1);
        raised += 0.2 * size * moved[2];
        droop += 0.6 * moved[2];
      }
      if (f.habit === 1 && !walker && leg === (hash(f.seed, 47) < 0.5 ? 0 : 1)) {
        // It stands on one leg, the other drawn up under it, and once in its cycle sets that down, shifts, and draws it up again.
        const down = smooth(period - 2.6, period - 1.9, ph) * (1 - smooth(period - 0.9, period - 0.2, ph));
        const tucked = 1 - down;
        stood.x += Math.sin(stood.yaw) * 0.22 * size * tucked;
        stood.z += Math.cos(stood.yaw) * 0.22 * size * tucked;
        raised += (0.72 + 0.05 * wave(t, 0.7, f.seed * 13)) * size * tucked;
        droop += 0.9 * tucked;
        lean.off += (leg === 0 ? -1 : 1) * 1.5 * tucked;
        lift = tucked;
      }
      const g = ground(stood.x, stood.z);
      foot.x = stood.x;
      foot.z = stood.z;
      foot.y = g + BONES.ankle * size + raised;
      foot.yaw = stood.yaw;
      foot.droop = droop;
      bed += 0.5 * g;
      highest = Math.max(highest, raised);
    }

    // The hips: over the way, off towards the foot that bears the weight, and highest as they pass over it.
    wayAt(way, s, hips);
    const along = (Math.PI * s) / f.step;
    const striding = Math.abs(Math.sin(along));
    const idle = 0.022 * wave(t, 0.83, f.seed * 5) + 0.012 * wave(t, 1.9, f.seed * 17);
    const aside = size * (0.05 * Math.cos(along) + 0.075 * lean.off + idle);
    const fore = size * (0.03 * wave(t, 0.61, f.seed * 23) + 0.05 * dipHead - 0.03 * up);
    p.yaw = hips.yaw + 0.04 * wave(t, 0.47, f.seed * 29) - 0.05 * lean.off;
    p.x = hips.x - Math.cos(hips.yaw) * aside + Math.sin(hips.yaw) * fore;
    p.z = hips.z + Math.sin(hips.yaw) * aside + Math.cos(hips.yaw) * fore;
    p.y = bed + size * (HIPS_HIGH + 0.035 * Math.cos(2 * along) - 0.05 * lean.dip - 0.02 * Math.abs(lean.off) + 0.012 * wave(t, 1.3, f.seed * 3));
    p.roll = -0.5 * (0.05 * Math.cos(along) + 0.06 * lean.off) + 0.01 * wave(t, 0.9, f.seed * 7);
    p.size = size;
    p.tone = 0.92 + 0.16 * f.seed;
    p.seed = f.seed;

    // The head.
    const reach = HEAD_REST[0] * size;
    const under = ground(p.x + Math.sin(p.yaw) * reach, p.z + Math.cos(p.yaw) * reach);
    p.floor = under;
    const low = (Math.max(under, LEVELS.pool - 0.15) - p.y) / size + TUFT_HIGH;
    if (f.habit === 0 && !walker) {
      // Down, the tuft works the pool: along, across, and dipped; up, the animal looks about.
      const work = 1 - up;
      const dx = HEAD_REST[0] + 0.1 * wave(t, 1.7, f.seed * 20) + 0.06 * wave(t, 3.9, f.seed * 7);
      const dy = low + 0.07 * wave(t, 2.3, f.seed * 9) + 0.05 * wave(t, 5.1, f.seed * 4) - 0.1 * shake * work;
      const dz = 0.3 * wave(t, 1.1, f.seed * 31) + 0.1 * wave(t, 2.9, f.seed * 37);
      const look = wave(t, 0.9, f.seed * 3);
      p.head[0] = dx + (1.4 + 0.1 * look - dx) * up;
      p.head[1] = dy + (1.72 + 0.06 * wave(t, 1.4, f.seed * 11) - dy) * up;
      p.head[2] = dz + (0.35 * look - dz) * up;
      p.headPitch = -0.8 + 0.1 * wave(t, 2.3, f.seed * 9) + (0.7 + 0.1 * wave(t, 1.4, f.seed * 11)) * up;
      p.headYaw = 0.25 * wave(t, 1.1, f.seed * 31) * work + 0.6 * look * up;
      p.pitch = 0.07 * work - 0.03 * up + 0.015 * wave(t, 1.7, f.seed * 20);
      p.sail = 0.04 + 0.05 * up + 0.03 * wave(t, 0.37, f.seed * 41);
      p.shake = 0.5 * shake;
    } else {
      // Head up at half its height: it looks about, and in bouts shakes its tuft dry. A walker nods to its stride and puts its head down where it stands.
      const bout = walker ? 0 : smooth(0.52, 0.66, heldAt(t, 2.6, f.seed));
      const look = wave(t, 0.5, f.seed * 11);
      const nod = walker ? 0.06 * Math.cos(2 * along) * striding : 0;
      const hx = 1.95 + 0.08 * look + nod;
      const hy = 0.9 + 0.1 * wave(t, 0.8, f.seed * 7) + 0.06 * wave(t, 0.31, f.seed * 3) + 0.03 * bout * wave(t, 15, 0);
      const hz = 0.3 * look + 0.1 * bout * wave(t, 17, f.seed * 5);
      p.head[0] = hx + (HEAD_REST[0] - hx) * dipHead;
      p.head[1] = hy + (low - hy) * dipHead;
      p.head[2] = hz * (1 - dipHead);
      p.headPitch = -0.25 + 0.1 * wave(t, 0.8, f.seed * 7) - 0.5 * dipHead + 0.15 * bout * wave(t, 15, 0);
      p.headYaw = 0.45 * look * (1 - dipHead) + 0.3 * bout * wave(t, 17, f.seed * 5);
      p.pitch = 0.02 + 0.05 * dipHead + 0.012 * wave(t, 1.1, f.seed * 20) - 0.03 * lift;
      p.sail = 0.05 + 0.04 * wave(t, 0.43, f.seed * 41) + 0.1 * bout;
      p.shake = bout;
      shake = bout;
    }
    p.clock = lp === null ? t : T0 + LOOP_SECONDS * lp;
    p.beat = lp === null ? 0 : TAU / LOOP_SECONDS;
    tuft.wet = f.habit === 0 && !walker ? 1 - smooth(0.02, 0.3, up) : dipHead;
    tuft.shake = shake;
    void highest;
  };

  /** `stand` a little earlier: in the loop, earlier in the loop. */
  const Q: Pose = pose();
  const standEarlier = (f: Feeder, t: number, by: number, p: Pose): void => {
    const keep = lp;
    if (lp !== null) lp = (((lp - by / LOOP_SECONDS) % 1) + 1) % 1;
    stand(f, t - by, p);
    lp = keep;
  };

  /** A runner at t: it is at its station at its own second and runs straight through it, each foot on its own place of the ground. */
  const runs = (f: Feeder, t: number, p: Pose): void => {
    const size = f.size;
    const step = RUN_STEP * size;
    const s = RUN_SPEED * (t - f.at) + 0.5 * step;
    const along = (Math.PI * s) / step;
    let bed = 0;
    for (let leg = 0; leg < 2; leg++) {
      const foot = p.feet[leg] as Pose['feet'][number];
      footAt(f.way, leg, s, step, 0.1 * size, noNudge, stood);
      const g = ground(stood.x, stood.z);
      const swing = Math.sin(Math.PI * stood.carry);
      foot.x = stood.x;
      foot.z = stood.z;
      foot.y = g + BONES.ankle * size + 0.5 * size * swing;
      foot.yaw = stood.yaw;
      foot.droop = 1.1 * swing;
      bed += 0.5 * g;
    }
    wayAt(f.way, s, hips);
    // Over each foot in turn it rides up; between them it is low and thrown forward.
    p.x = hips.x - Math.cos(hips.yaw) * 0.04 * size * Math.cos(along);
    p.z = hips.z + Math.sin(hips.yaw) * 0.04 * size * Math.cos(along);
    p.y = bed + size * (HIPS_HIGH - 0.16 + 0.1 * Math.cos(2 * along));
    p.yaw = hips.yaw + 0.05 * Math.cos(along);
    p.roll = -0.05 * Math.cos(along);
    p.pitch = 0.16 + 0.04 * Math.cos(2 * along + 0.8);
    p.size = size;
    p.tone = 0.92 + 0.16 * f.seed;
    p.seed = f.seed;
    p.head[0] = 2.05 + 0.07 * Math.cos(2 * along + 0.5);
    p.head[1] = 0.62 + 0.07 * Math.cos(2 * along + 1.1);
    p.head[2] = 0.08 * Math.cos(along);
    p.headPitch = -0.12 + 0.08 * Math.cos(2 * along + 1.1);
    p.headYaw = 0.1 * Math.cos(along);
    p.floor = bed;
    p.sail = 0.24 + 0.16 * Math.sin((t - f.at) * 13 + f.seed * 9);
    p.shake = 0.25;
    p.clock = t;
    p.beat = 0;
  };

  /** One feeder at t: its body into `P`, its tuft into `tuft`. */
  const feederAt = (f: Feeder, t: number): void => {
    tuft.here = Math.abs((lp === null ? t : T0) - f.at) <= f.span;
    if (f.habit === 2) {
      if (lp === null) {
        runs(f, t - 0.12, Q);
        const was = headInPlace(Q).at;
        runs(f, t, P);
        const head = headInPlace(P).at;
        P.trail[0] = Math.max(-0.6, Math.min(0.6, (was[0] - head[0]) * 1.2)) * f.size;
        P.trail[1] = 0.1 * f.size;
        P.trail[2] = Math.max(-0.6, Math.min(0.6, (was[2] - head[2]) * 1.2)) * f.size;
      } else {
        // In the loop it cannot run off: it stands where the key has it, shifts its feet, and beats its sails half open in the pool.
        stand(f, t, P);
        P.sail += 0.16 + 0.12 * Math.sin(8 * TAU * lp + f.seed * 9);
      }
      const stride = (Math.PI * RUN_SPEED * (lp === null ? t - f.at : T0 - f.at)) / (RUN_STEP * f.size) + (lp === null ? 0 : 0.55 * Math.sin(3 * TAU * lp));
      fig.x = P.x;
      fig.z = P.z;
      tuft.wet = 0;
      tuft.shake = Math.abs(Math.cos(stride));
      tuft.x = P.x;
      tuft.y = P.y;
      tuft.z = P.z;
      return;
    }
    // The strands trail after the head: where it was a moment ago.
    standEarlier(f, t, 0.12, Q);
    const was = headInPlace(Q).at;
    stand(f, t, P);
    const head = headInPlace(P).at;
    const k = 1.6;
    P.trail[0] = Math.max(-0.5, Math.min(0.5, (was[0] - head[0]) * k)) * f.size;
    P.trail[1] = Math.max(-0.1, Math.min(0.3, (was[1] - head[1]) * k * 0.5)) * f.size;
    P.trail[2] = Math.max(-0.5, Math.min(0.5, (was[2] - head[2]) * k)) * f.size;
    tuft.x = head[0];
    tuft.z = head[2];
    tuft.y = Math.max(LEVELS.pool + 0.02, head[1] - 0.95 * f.size);
  };

  // The pools ring the legs of the feeders nearest the feeding camera.
  const ringed = feeders
    .map((f, i) => ({ i, d: Math.hypot(f.x - feedEye[0], f.z - feedEye[2] + 20) + (f.habit === 2 ? 1e6 : 0) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 8)
    .map((e) => e.i);
  RING_SOURCE.at = (seconds: number, out: Ring[]): void => {
    lp = loopPhase();
    let n = 0;
    for (const i of ringed) {
      const f = feeders[i] as Feeder;
      feederAt(f, seconds);
      for (let leg = 0; leg < 2; leg++) {
        const foot = P.feet[leg] as Pose['feet'][number];
        const ring = out[n++];
        // A foot lifted clear of the pool rings nothing.
        const inWater = foot.y - BONES.ankle * f.size < LEVELS.pool ? 1 : 0;
        if (ring) Object.assign(ring, { x: foot.x, z: foot.z, phase: f.seed * 20 + leg * 4.2, strength: 0.3 * inWater, stand: undefined });
      }
      const ring = out[n++];
      if (ring) Object.assign(ring, { x: tuft.x, z: tuft.z, phase: f.seed * 31, strength: 0.75 * tuft.wet, stand: undefined });
    }
  };

  // What breaks the water, for whoever draws its answer: the feet and the tuft of every wader, nearest the feeding lens first.
  {
    const order = feeders
      .map((f, i) => ({ i, d: Math.hypot(f.x - feedEye[0], f.z - feedEye[2]) }))
      .filter((e) => (feeders[e.i] as Feeder).habit !== 2)
      .sort((a, b) => a.d - b.d)
      .map((e) => e.i);
    const R: Pose = pose();
    const BACK = 0.1;
    const LOOKS = 15;
    // For foot 0, foot 1 and the tuft: is it in the water, and where.
    const now = [false, false, false];
    const then = [false, false, false];
    const spot: [number, number][] = [[0, 0], [0, 0], [0, 0]];
    const old: [number, number][] = [[0, 0], [0, 0], [0, 0]];
    const look = (f: Feeder, seconds: number, by: number, wet: boolean[], where: [number, number][]): void => {
      standEarlier(f, seconds, by, R);
      for (let leg = 0; leg < 2; leg++) {
        const foot = R.feet[leg] as Pose['feet'][number];
        wet[leg] = foot.y - BONES.ankle * f.size < LEVELS.pool - 0.005;
        (where[leg] as [number, number])[0] = foot.x;
        (where[leg] as [number, number])[1] = foot.z;
      }
      const head = headInPlace(R).at;
      wet[2] = head[1] - TUFT_HIGH * f.size < LEVELS.pool - 0.005 && R.floor < LEVELS.pool;
      (where[2] as [number, number])[0] = head[0];
      (where[2] as [number, number])[1] = head[2];
    };
    CONTACTS.at = (seconds: number, out: Contact[]): number => {
      lp = loopPhase();
      let n = 0;
      for (const i of order) {
        if (n + 3 > Math.min(out.length, MAX_CONTACTS)) break;
        const f = feeders[i] as Feeder;
        look(f, seconds, BACK, then, old);
        look(f, seconds, 0, now, spot);
        const first = n;
        for (let k = 0; k < 3; k++) {
          const c = out[n++] as Contact;
          const at = spot[k] as [number, number];
          const was = old[k] as [number, number];
          c.x = at[0];
          c.z = at[1];
          c.kind = k === 2 ? 1 : 0;
          c.wide = (k === 2 ? 0.34 : 0.07) * f.size;
          c.speed = Math.hypot(at[0] - was[0], at[1] - was[1]) / BACK;
          c.since = now[k] ? 1.5 : -1;
          c.out = now[k] ? -1 : -1;
        }
        // When each last went in or came out: looked for back through a second and a half.
        const found = [false, false, false];
        for (let b = 1; b <= LOOKS && !(found[0] && found[1] && found[2]); b++) {
          look(f, seconds, b * BACK, then, old);
          for (let k = 0; k < 3; k++) {
            if (found[k] || then[k] === now[k]) continue;
            found[k] = true;
            const c = out[first + k] as Contact;
            if (now[k]) c.since = (b - 0.5) * BACK;
            else c.out = (b - 0.5) * BACK;
          }
        }
      }
      return n;
    };
  }

  // ---- The colony ----
  interface Sitter {
    x: number;
    y: number;
    z: number;
    yaw: number;
    size: number;
    seed: number;
    stands: boolean;
    /** One of a clump: it sits low by its neighbour. */
    low?: boolean;
  }
  const colonyEye = resolve(shots['ribs-03'] as (typeof shots)[string], 0.5, shotById('ribs-03').first).position;
  const facing = Math.atan2(COLONY.side[1], COLONY.side[0]);
  const colonyPose = resolve(shots['ribs-03'] as (typeof shots)[string], 0.5, shotById('ribs-03').first);
  const colonyLens = new THREE.PerspectiveCamera(colonyPose.fov, 16 / 9, 0.5, 5000);
  colonyLens.position.set(...colonyPose.position);
  colonyLens.lookAt(...colonyPose.aim);
  colonyLens.updateMatrixWorld();
  colonyLens.updateProjectionMatrix();
  const seen = new THREE.Vector3();
  const sitters: (Sitter & { d: number })[] = [];
  const founders: [number, number][] = [];
  // Each on its own piece of ledge, alone or two together, with bare rock, lichen and white between: animals to be read one by one.
  const taken: [number, number][] = [];
  for (let tries = 0; sitters.length < COLONISTS && tries < 6000; tries++) {
    const tier = scatter.range(LEVELS.tide + 2, COLONY.top - 6);
    // Four in five sit where the colony's own shot looks, on the ledges that face its lens; the rest anywhere on the weather side.
    const forLens = sitters.length < COLONISTS * 0.8;
    const a0 = forLens ? scatter.range(0, Math.PI * 2) : facing + scatter.normal() * 0.8;
    const [r0, y0] = COLONY.perch(a0, tier, 0.5);
    seen.set(COLONY.x + Math.cos(a0) * r0, y0 + 1.5, COLONY.z + Math.sin(a0) * r0);
    const toward = (colonyEye[0] - seen.x) * Math.cos(a0) + (colonyEye[2] - seen.z) * Math.sin(a0);
    const far = Math.hypot(colonyEye[0] - seen.x, colonyEye[2] - seen.z);
    seen.project(colonyLens);
    const inFrame = Math.abs(seen.x) < 1.1 && Math.abs(seen.y) < 1.1 && seen.z < 1;
    if (forLens && !(toward > 0.2 * far && Math.abs(seen.x) < 0.95 && seen.y > -0.92 && seen.y < 0.85 && seen.z < 1)) continue;
    if (inFrame) {
      // No two knots within a fifth of the frame of each other: whole faces of the cliff stay bare.
      if (taken.some((t) => Math.hypot((t[0] - seen.x) * 1.78, t[1] - seen.y) < 0.58)) continue;
      taken.push([seen.x, seen.y]);
    }
    const knot = scatter.next() < 0.22 ? 2 : 1;
    let along = 0;
    for (let k = 0; k < knot && sitters.length < COLONISTS; k++) {
      const size = scatter.range(0.7, 1.3) * GROW;
      const a = a0 + along / COLONY.radiusAt(tier);
      const [r, perchY] = COLONY.perch(a, tier, scatter.range(0.45, 0.9));
      along += scatter.range(1.6, 2.4) * size;
      const x = COLONY.x + Math.cos(a) * r;
      const z = COLONY.z + Math.sin(a) * r;
      const stands = scatter.next() < 0.22;
      // A sheet reads only from its side: each stands across the colony lens's line of sight, a little turned.
      const across = Math.atan2(z - colonyEye[2], -(x - colonyEye[0])) + scatter.range(-0.85, 0.85);
      sitters.push({ x, y: perchY, z, yaw: across, size, seed: scatter.next(), stands, d: Math.hypot(x - colonyEye[0], perchY - colonyEye[1], z - colonyEye[2]) });
      founders.push([a, tier]);
    }
  }
  // A rookery: round each of those, more sit low on the same ledge, shoulder to shoulder, so that the rock carries clumps and bare faces between.
  const nests = ctx.rng('kite-wings-nests');
  for (let j = 0; j < founders.length && sitters.length < ROOKERY; j++) {
    const [a0, tier] = founders[j] as [number, number];
    const more = 1 + Math.floor(nests.next() * 3.4);
    let left = 0;
    let right = 0;
    for (let k = 0; k < more && sitters.length < ROOKERY; k++) {
      const size = nests.range(0.62, 1.05) * GROW;
      const gap = nests.range(1.45, 2.2) * size;
      const a = a0 + (k % 2 === 0 ? (right += gap) : -(left += gap)) / COLONY.radiusAt(tier);
      const [r, perchY] = COLONY.perch(a, tier + nests.range(-0.5, 0.5), nests.range(0.4, 0.9));
      const x = COLONY.x + Math.cos(a) * r;
      const z = COLONY.z + Math.sin(a) * r;
      const across = Math.atan2(z - colonyEye[2], -(x - colonyEye[0])) + nests.range(-0.85, 0.85);
      sitters.push({ x, y: perchY, z, yaw: across, size, seed: nests.next(), stands: false, low: true, d: Math.hypot(x - colonyEye[0], perchY - colonyEye[1], z - colonyEye[2]) + 1000 });
    }
  }
  sitters.sort((a, b) => a.d - b.d);
  const perchedSheet = figureMaterials(ctx, PERCHED, LEVELS.pool, 0.86);
  const colonyFigures = new Figures(perchedSheet, ROOKERY, { shade: true });

  // The colony's own shot: those nearest its lens are bodies that sit, lie and stand on the ledge's own rows.
  const colonySpan = shotSpan('ribs-03');
  /** The top of the rock under a place of the crag, looked for from `from` down: the mesh's own rows. */
  const ledgeUnder = (x: number, z: number, from: number): number => {
    const angle = Math.atan2(z - COLONY.z, x - COLONY.x);
    const out = Math.hypot(x - COLONY.x, z - COLONY.z);
    for (let j = Math.round((from + 0.9) / CRAG.row); j * CRAG.row > from - 3; j--) if (COLONY.cragAt(angle, j * CRAG.row) >= out) return j * CRAG.row;
    return from - 3;
  };
  const roostOrder = sitters.map((s, i) => ({ i, d: s.d % 1000 })).sort((a, b) => a.d - b.d).slice(0, ROOSTING);
  const seated = (sx: number, sy: number, sz: number, size: number, seed: number, stance: Stance): Roosting => {
    const k = (seed * 977) % 1;
    // It sits along its ledge, one way or the other, its breast turned a little out to the open air.
    const angle = Math.atan2(sz - COLONY.z, sx - COLONY.x);
    const way = Math.floor(seed * 1000) % 2 === 1 ? 1 : -1;
    const turned = 0.15 + 0.6 * ((seed * 331) % 1);
    const fx = -Math.sin(angle) * way * Math.cos(turned) + Math.cos(angle) * Math.sin(turned);
    const fz = Math.cos(angle) * way * Math.cos(turned) + Math.sin(angle) * Math.sin(turned);
    const yaw = Math.atan2(fx, fz);
    const seat = SEAT[stance] as (typeof SEAT)[number];
    const y = ledgeUnder(sx, sz, sy);
    const feet = [0, 1].map((leg) => {
      const left = (leg === 0 ? 0.19 : -0.19) * size;
      // A foot is set ahead on the same ledge; where the ledge ends before it, nearer the body.
      for (const part of [1, 0.6, 0.25, 0]) {
        const ahead = (seat.ahead + (stance === 2 ? (leg === 0 ? 0.16 : -0.12) : 0.08 * (leg === 0 ? k : 1 - k))) * size * part;
        const x = sx + fx * ahead - fz * left;
        const z = sz + fz * ahead + fx * left;
        const rock = ledgeUnder(x, z, y);
        if (Math.abs(rock - y) < 0.4 * size || part === 0) return [x, part === 0 ? y : rock, z] as [number, number, number];
      }
      return [sx, y, sz] as [number, number, number];
    }) as [[number, number, number], [number, number, number]];
    return { x: sx, y, z: sz, yaw, size, seed, stance, feet };
  };
  const roosts: Roosting[] = roostOrder.map(({ i }) => {
    const s = sitters[i] as Sitter;
    const k = (s.seed * 977) % 1;
    // Few stand: a colony at rest is down on its nests.
    const stance: Stance = LARGE.includes(i) ? (i % 2 === 0 ? 2 : 0) : s.stands ? (k < 0.5 ? 2 : 0) : s.low ? (k < 0.45 ? 1 : 0) : k < 0.2 ? 1 : 0;
    return seated(s.x, s.y, s.z, s.size * (LARGE.includes(i) ? 0.8 : 0.66), s.seed, stance);
  });
  // The ledges nearest the colony's lens are packed: beside each sitter another is down on its nest where the same ledge has room, and on
  // the ledge over it and the ledge under it, and beside those in their turn.
  const room = (x: number, y: number, z: number, size: number): boolean =>
    !roosts.some((o) => Math.hypot(o.x - x, o.z - z) < 0.72 * (o.size + size) + 0.5 && Math.abs(o.y - y) < 1.5) &&
    // And only where the ledge is deep enough to hold it: one put on a narrow step hangs on the face.
    Math.abs(ledgeUnder(x + ((x - COLONY.x) / Math.hypot(x - COLONY.x, z - COLONY.z)) * 0.4 * size, z + ((z - COLONY.z) / Math.hypot(x - COLONY.x, z - COLONY.z)) * 0.4 * size, y) - y) < 0.16;
  for (let j = 0; j < roosts.length && roosts.length < ROOSTING + MATES; j++) {
    const by = roosts[j] as Roosting;
    if (Math.hypot(by.x - colonyEye[0], by.y - colonyEye[1], by.z - colonyEye[2]) > 60) continue;
    const angle = Math.atan2(by.z - COLONY.z, by.x - COLONY.x);
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    for (let n = 0; n < 4 && roosts.length < ROOSTING + MATES; n++) {
      const seed = (by.seed * 7.13 + 0.37 * (n + 1)) % 1;
      const size = by.size * (0.74 + 0.3 * ((seed * 53) % 1)) * (by.size > 1.5 ? 0.85 : 1);
      const stance: Stance = (seed * 977) % 1 < 0.5 ? 1 : (seed * 977) % 1 < 0.9 ? 0 : 2;
      if (n < 2) {
        const along = (n === 0 ? 1 : -1) * (1.2 + 0.7 * ((seed * 211) % 1)) * by.size;
        const inward = (((seed * 131) % 1) - 0.35) * 0.5 * by.size;
        const x = by.x - sa * along - ca * inward;
        const z = by.z + ca * along - sa * inward;
        if (Math.abs(ledgeUnder(x, z, by.y) - by.y) > 0.16 || !room(x, by.y, z, size)) continue;
        roosts.push(seated(x, by.y, z, size, seed, stance));
        continue;
      }
      // Up the crag or down it: to where the rock next stands a step higher or lower, and a little way onto that ledge.
      const up = n === 2;
      const slip = (((seed * 311) % 1) - 0.5) * 1.6 * by.size;
      for (let d = 0.2; d < 3.4; d += 0.2) {
        const out = up ? -d : d;
        const x = by.x + ca * out - sa * slip;
        const z = by.z + sa * out + ca * slip;
        const rock = ledgeUnder(x, z, by.y + 3);
        if (up ? rock < by.y + 0.6 : rock > by.y - 0.6) continue;
        const on = (up ? -0.4 : 0.9) * size;
        const x2 = x + ca * on;
        const z2 = z + sa * on;
        const y2 = ledgeUnder(x2, z2, rock + (up ? 0.6 : 0));
        if (Math.abs(y2 - rock) < 0.35 && Math.abs(y2 - by.y) < 4 && room(x2, y2, z2, size)) roosts.push(seated(x2, y2, z2, size, seed, stance));
        break;
      }
    }
  }
  // Each that is down sits in a mat of weed, and most that stand have one under them.
  const mats = nestMats(
    ctx,
    roosts
      .filter((r) => r.stance !== 2 || (r.seed * 613) % 1 < 0.6)
      // Only where the ledge is deep enough to hold one: a mat that hangs off a narrow step is a dark rag on the face.
      .filter((r) => {
        const out = Math.atan2(r.z - COLONY.z, r.x - COLONY.x);
        return Math.abs(ledgeUnder(r.x + Math.cos(out) * 0.75 * r.size, r.z + Math.sin(out) * 0.75 * r.size, r.y) - r.y) < 0.16;
      })
      .map((r) => ({ x: r.x + Math.sin(r.yaw) * 0.38 * r.size, y: r.y, z: r.z + Math.cos(r.yaw) * 0.38 * r.size, size: r.size * (r.stance === 1 ? 1.15 : 1), seed: r.seed })),
    ledgeUnder,
  );
  const roostBodies = new Bodies(bodyMaterials(ctx, LEVELS.pool, 0.55, 'feeder-a', undefined, 0.12), ROOSTING + MATES);
  const roosting = new Set(roostOrder.map((o) => o.i));
  const R: Pose = pose();
  /** Which of the six a sitter is: most sit hunched or crouched, some stand, a few hold a sail out or both open. */
  const cellOf = (s: Sitter, rank: number): number => {
    // The nearest to the colony's lens stand with their sails part open.
    if (LARGE.includes(rank)) return rank % 2 === 0 ? 3 : 2;
    const k = (s.seed * 977) % 1;
    if (s.low) return k < 0.4 ? 5 : k < 0.7 ? 0 : k < 0.86 ? 4 : 1;
    return k < 0.24 ? 5 : k < 0.44 ? 0 : k < 0.57 ? 4 : k < 0.7 ? 1 : k < 0.86 ? 2 : 3;
  };
  const sitterAt = (s: Sitter, rank: number, t: number): void => {
    Object.assign(fig, placed());
    const cell = cellOf(s, rank);
    fig.cell = cell;
    fig.size = s.size * (LARGE.includes(rank) ? 0.8 : 0.6);
    // No two rows alike: half of them stand the other way round on their ledge.
    fig.turn = s.yaw + (Math.floor(s.seed * 1000) % 2 === 1 ? Math.PI : 0);
    // Never still: it shifts its weight along the ledge, rocks, and works its neck, each in its own time.
    const shift = 0.14 * s.size * wave(t, 0.45 + 0.4 * s.seed, s.seed * 23);
    fig.x = s.x + Math.sin(s.yaw) * shift;
    fig.z = s.z + Math.cos(s.yaw) * shift;
    fig.y = s.y - 0.04;
    fig.sway = 0.035 * wave(t, 0.9 + 0.8 * s.seed, s.seed * 50);
    const look = heldAt(t, 1.6 + 2.2 * s.seed, s.seed, 0.3);
    fig.limbs[0] = (s.seed - 0.5) * 0.7 + (look - 0.5) * 0.6 + 0.06 * wave(t, 1.7 + 1.2 * s.seed, s.seed * 31);
    // A sail held out is flicked and beaten at a neighbour now and then.
    const row = smooth(0.55, 0.75, heldAt(t, 2.3, s.seed + 0.6, 0.3));
    fig.limbs[1] = (cell === 3 ? -1 : 1) * (0.1 * wave(t, 1.9, s.seed * 17) + row * 0.3 * wave(t, 9, s.seed * 9));
    fig.limbs[2] = 0.1 * wave(t, 1.7, s.seed * 12) + row * 0.3 * wave(t, 9, s.seed * 9, 0.5);
    // Weathered each to its own grey, and one in three in the shade of the rock over it.
    fig.tone = 0.74 + 0.36 * ((s.seed * 13.7) % 1);
    fig.shade = (s.seed * 7.3) % 1 < 0.3 ? 0.4 + 0.25 * ((s.seed * 3.1) % 1) : 0;
    // Those of a clump lay no shade of their own on the rock (below zero tells the sheet so): shades laid one over another are a black blot.
    // In the film none lays it: it is drawn on whatever stands nearer than the sheet, and was a dark blot on the rock in front.
    if (s.low || lp === null) fig.shade = -1 - fig.shade;
  };

  // ---- The flock in the air ----
  interface Flier {
    cx: number;
    cz: number;
    radius: number;
    y: number;
    rate: number;
    phase: number;
    squash: number;
    size: number;
    seed: number;
    dark: number;
  }
  const homes = ['R1', 'R1', 'R1', 'R2', 'L2', 'L1', 'L3', 'R3', 'OL', 'OR'];
  const fliers: Flier[] = [];
  const flierPlace = (f: Flier, t: number, out: Spot): void => {
    const a = f.phase + f.rate * t;
    out.x = f.cx + Math.cos(a) * f.radius;
    out.y = f.y + 9 * Math.sin(a * 2.3 + f.phase);
    out.z = f.cz + Math.sin(a) * f.radius * f.squash;
    const way = Math.sign(f.rate);
    out.yaw = Math.atan2(-Math.sin(a) * way, Math.cos(a) * f.squash * way);
    out.roll = -way * 0.32;
  };
  // A built animal is a shape against the sky and never more: none comes within this of a lens.
  const probe: Spot = { x: 0, y: 0, z: 0, yaw: 0, roll: 0 };
  const clearOfLenses = (f: Flier, clear = CLEAR): void => {
    for (let tries = 0; tries < 24; tries++) {
      const hit = eyes.some((e) => {
        flierPlace(f, e.t, probe);
        return Math.hypot(probe.x - e.at[0], probe.y - e.at[1], probe.z - e.at[2]) < clear;
      });
      if (!hit) return;
      f.phase += 0.7;
      if (tries % 6 === 5) f.y += 12;
    }
    f.size = 0;
  };
  for (let i = 0; i < FLIERS_N + SPECKS; i++) {
    const rib = ribByName(homes[scatter.int(homes.length)] as string);
    const low = i < LOW;
    if (i >= FLIERS_N) {
      // The specks: the crowd that wheels tight round the head of every blade, and thickest over the colony.
      const colony = scatter.next() < 0.07;
      const top = RIBS[scatter.int(RIBS.length)] as (typeof RIBS)[number];
      // Round the head of the blade itself: the blade's own middle line, near its top.
      const high = top.height * (1 - 0.3 * scatter.next() ** 2);
      const head = surface(top, partAtHeight(top, high), 0, 0, 0);
      const radius = colony ? scatter.range(110, 260) : 12 + 90 * scatter.next() ** 2;
      fliers.push({
        cx: colony ? COLONY.x + scatter.range(-20, 20) : head.x + scatter.range(-12, 12),
        cz: colony ? COLONY.z + scatter.range(-20, 20) : head.z + scatter.range(-12, 12),
        radius,
        y: colony ? scatter.range(COLONY.top - 10, COLONY.top + 120) : high + scatter.range(-25, 35),
        rate: ((scatter.next() < 0.5 ? 1 : -1) * scatter.range(11, 17)) / radius,
        phase: scatter.range(0, Math.PI * 2),
        squash: scatter.range(0.55, 1),
        size: scatter.range(0.9, 1.2) * GROW,
        seed: scatter.next(),
        dark: colony ? -0.7 : 0.7,
      });
      clearOfLenses(fliers[fliers.length - 1] as Flier, colony ? 110 : CLEAR);
      continue;
    }
    const radius = low ? scatter.range(120, 200) : 50 + 190 * scatter.next() ** 2;
    const up = low ? scatter.range(38, 80) : rib.height * scatter.range(0.3, 1.05);
    const mid = low ? { x: COLONY.x, z: COLONY.z } : surface(rib, partAtHeight(rib, Math.min(up, rib.height)), 0, 0, 0);
    const f: Flier = {
      cx: mid.x + (low ? 0 : scatter.range(-30, 30)),
      cz: mid.z + scatter.range(-40, 40),
      radius,
      y: up,
      rate: ((scatter.next() < 0.5 ? 1 : -1) * scatter.range(11, 17)) / radius,
      phase: scatter.range(0, Math.PI * 2),
      squash: scatter.range(0.55, 1),
      size: scatter.range(0.9, 1.2) * GROW,
      seed: scatter.next(),
      dark: low ? 0.1 : 0.7,
    };
    clearOfLenses(f, low ? 60 : CLEAR);
    fliers.push(f);
  }
  const airSheet = figureMaterials(ctx, FLIERS, LEVELS.pool, 0.6, true);
  const flockFigures = new Figures(airSheet, FLIERS_N + SPECKS, {}, 6, 4);
  const spot: Spot = { x: 0, y: 0, z: 0, yaw: 0, roll: 0 };
  /** One in the air into `fig`: where it is, the way it goes (metres a second), how hard it strokes (0 a glide, 1 full), at its own phase. */
  const airborne = (x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, seed: number, t: number, amp: number, eye: [number, number, number]): void => {
    Object.assign(fig, placed());
    const dx = x - eye[0];
    const dz = z - eye[2];
    const d = Math.hypot(dx, dz) || 1;
    const across = (vx * -dz + vz * dx) / d;
    const toward = (vx * dx + vz * dz) / d;
    const speed = Math.hypot(vx, vz) || 1;
    const sideways = Math.abs(across) > 0.5 * speed;
    fig.cell = sideways ? (seed < 0.55 ? 0 : 1) : toward > 0 ? 2 : 3;
    fig.turn = across < 0 ? -1 : 1;
    const ph = turns(t, 9.5 + 3.5 * seed, seed * 40);
    fig.stroke = sideways ? 1 - 0.44 * amp * (1 - Math.cos(ph)) : 1 - 0.27 * amp * (1 - Math.cos(ph));
    fig.roll = (sideways ? Math.atan2(vy, Math.abs(across)) : 0) + 0.14 * wave(t, 0.5, seed * 11) + (seed - 0.5) * 0.3;
    fig.size = size;
    fig.x = x;
    fig.y = y + 0.22 * amp * Math.sin(ph - 1.3) * size;
    fig.z = z;
    fig.tone = 0.86 + 0.24 * seed;
    fig.blur = [Math.min(90, (Math.abs(across) * SHUTTER * FLIERS.unit) / size), 0];
  };
  /**
   * The card loop's flight: what is in the air at the key at (x, y, z) going (vx, vy, vz) flies one closed turn to the loop, a circle that
   * touches its way at the key and is as long as its speed takes it in the loop's length, to the side given (1 or -1). Into `fig`, as `airborne`.
   */
  const circuit = (x: number, y: number, z: number, vx: number, vy: number, vz: number, side: number, size: number, seed: number, amp: number, eye: [number, number, number]): void => {
    const speed = Math.hypot(vx, vz) || 1;
    const radius = (speed * LOOP_SECONDS) / TAU;
    const hx = vx / speed;
    const hz = vz / speed;
    const nx = -hz * side;
    const nz = hx * side;
    const a = TAU * (lp ?? 0);
    const round = Math.sin(a);
    const out = 1 - Math.cos(a);
    // The climb of the key carries on as a rise and fall, once round.
    const high = (vy * LOOP_SECONDS) / TAU;
    airborne(x + radius * (hx * round + nx * out), y + high * round, z + radius * (hz * round + nz * out), speed * (hx * Math.cos(a) + nx * round), vy * Math.cos(a), speed * (hz * Math.cos(a) + nz * round), size, seed, T0, amp, eye);
  };
  const flierAt = (f: Flier, t: number, eye: [number, number, number]): void => {
    const at = lp === null ? t : T0;
    flierPlace(f, at, spot);
    const { x, y, z } = spot;
    flierPlace(f, at + 0.05, spot);
    // Strokes in bouts, glides between.
    const bout = smooth(0.3, 0.5, heldAt(t, 3.1 + 2 * f.seed, f.seed, 0.3));
    if (lp === null) airborne(x, y, z, (spot.x - x) / 0.05, (spot.y - y) / 0.05, (spot.z - z) / 0.05, f.size * 0.8, f.seed, t, 0.2 + 0.8 * bout, eye);
    else circuit(x, y, z, (spot.x - x) / 0.05, (spot.y - y) / 0.05, (spot.z - z) / 0.05, Math.sign(f.rate), f.size * 0.8, f.seed, 0.2 + 0.8 * bout, eye);
  };

  // ---- The skein that comes in from the sea with the camera ----
  interface Passer {
    x: number;
    y: number;
    z: number;
    vx: number;
    vz: number;
    t: number;
    size: number;
    seed: number;
  }
  const skein: Passer[] = [];
  const opening = shotById('ribs-01');
  const openPath = approachAsScattered;
  for (let i = 0; i < SKEIN; i++) {
    const part = i < 9 ? scatter.range(0.035, 0.2) : scatter.range(0.2, 0.92);
    const frame = opening.first + part * (opening.last - opening.first);
    const eye = resolve(openPath, part, frame);
    const dx = eye.aim[0] - eye.position[0];
    const dz = eye.aim[2] - eye.position[2];
    const l = Math.hypot(dx, dz) || 1;
    const side = (scatter.next() < 0.5 ? -1 : 1) * scatter.range(40, 95);
    const speed = scatter.range(12, 16);
    // They cross the camera's way as they go in, each a little off its line.
    const off = scatter.range(-0.5, 0.5);
    skein.push({
      x: eye.position[0] + (-dz / l) * side,
      y: Math.max(4.5, eye.position[1] + scatter.range(9, 32)),
      z: eye.position[2] + (dx / l) * side,
      vx: ((dx / l) * Math.cos(off) - (dz / l) * Math.sin(off)) * speed,
      vz: ((dz / l) * Math.cos(off) + (dx / l) * Math.sin(off)) * speed,
      t: secondsInPlace(UNIT, frame),
      size: scatter.range(0.8, 1.05),
      seed: scatter.next(),
    });
  }
  // And the ones that cross before the colony camera: one large and near, soft with its own speed, the light in its sails; two behind it; three far.
  {
    const shot = shotById('ribs-03');
    const key = keySeconds('ribs-3');
    const eye = resolve(shots['ribs-03'] as (typeof shots)[string], 0.5, shot.first + Math.round((shot.last - shot.first) / 2));
    const dx = eye.aim[0] - eye.position[0];
    const dz = eye.aim[2] - eye.position[2];
    const l = Math.hypot(dx, dz) || 1;
    const fx = dx / l;
    const fz = dz / l;
    // [metres ahead, metres to the right at its moment, metres over the lens, seconds from the key, metres a second to the right]
    const cross: [number, number, number, number, number][] = [[24, -6.5, 4.6, 0, 15], [38, 9, 9, 0.1, -17], [52, -16, 13, -0.1, 15], [84, 20, 22, 0.2, -14], [112, -52, 36, 0.3, -13], [128, -24, 46, -0.6, 14]];
    for (let i = 0; i < PASSERS; i++) {
      const c = cross[i] as [number, number, number, number, number];
      skein.push({ x: eye.position[0] + fx * c[0] - fz * c[1], y: eye.position[1] + c[2], z: eye.position[2] + fz * c[0] + fx * c[1], vx: -fz * c[4] + fx * 2.5, vz: fx * c[4] + fz * 2.5, t: key + c[3], size: i === 0 ? 1 : 0.9, seed: hash(i, 9) });
    }
  }
  const skeinFigures = new Figures(airSheet, SKEIN + PASSERS + FLEEING + 2, {}, 6, 4);
  const flee = STATIONS.flee;
  const gatePose = resolve(shots['ribs-06'] as (typeof shots)[string], 0.5, shotById('ribs-06').first);
  const gateEye = gatePose.position;
  const gateLong = Math.hypot(gatePose.aim[0] - gateEye[0], gatePose.aim[2] - gateEye[2]) || 1;
  const gateAhead: [number, number] = [(gatePose.aim[0] - gateEye[0]) / gateLong, (gatePose.aim[2] - gateEye[2]) / gateLong];
  const gateRight: [number, number] = [-gateAhead[1], gateAhead[0]];

  // ---- Two that land by the establishing camera, about its key ----
  const standers = new Figures(perchedSheet, 2);
  const est = resolve(shots['ribs-02'] as (typeof shots)[string], 0.5, shotById('ribs-02').first);
  const ex = est.aim[0] - est.position[0];
  const ez = est.aim[2] - est.position[2];
  const el = Math.hypot(ex, ez) || 1;
  const ahead = (d: number, right: number): [number, number] => [est.position[0] + (ex / el) * d + (-ez / el) * right, est.position[2] + (ez / el) * d + (ex / el) * right];
  const landers = [
    { at: ahead(150, 34), yaw: Math.atan2(-ez / el, ex / el) + 0.5, t: T0 + 0.42, size: 1, seed: 0.37 },
    { at: ahead(210, -40), yaw: 2.2, t: T0 - 2.1, size: 0.94, seed: 0.81 },
  ];

  // Thrown water: where a tuft works the pool, what streams from one lifted and flies from one shaken, and where a runner's feet come down.
  const SPLASH = 70;
  const wet = [...new Set([...ringed, ...feeders.map((f, i) => (f.habit === 2 ? i : -1)).filter((i) => i >= 0)])];
  const splash = new Spray(wet.length * SPLASH + FLEEING * KICK_DROPS, { ...rig.uniforms, tFoam: { value: foamTexture(ctx.rng('kite-wings-splash')) } });
  const splashAt = (seconds: number): void => {
    splash.begin();
    for (const i of wet) {
      const f = feeders[i] as Feeder;
      feederAt(f, seconds);
      if (!tuft.here) continue;
      const fx = Math.sin(f.yaw);
      const fz = Math.cos(f.yaw);
      for (let n = 0; n < SPLASH; n++) {
        const key = i * 31 + n;
        // In the loop a whole number of drops are born to the loop, and the run of them comes round.
        const drops = Math.max(1, Math.round(LOOP_SECONDS / (0.45 + 0.5 * rand(key, 1))));
        const every = lp === null ? 0.45 + 0.5 * rand(key, 1) : LOOP_SECONDS / drops;
        const u = lp === null ? seconds / every + rand(key, 2) : lp * drops + rand(key, 2);
        const born = lp === null ? Math.floor(u) : Math.floor(u) % drops;
        const a = u - Math.floor(u);
        const age = a * every;
        const dir = rand(key, born) * Math.PI * 2;
        const big = n % 5 === 0;
        if (f.habit === 0) {
          if (tuft.wet > 0.5) {
            // A crown where the strands go in and work: thrown up and out, falling back.
            const power = 0.5 + 1.6 * tuft.shake;
            const out = (0.1 + 0.95 * rand(key, born + 7) * a * power) * f.size;
            const up = (0.3 + 1.2 * rand(key, born + 3)) * f.size * power;
            // Seven tenths of its time in the air, a drop drawn out along its flight; then the ring it leaves where it lands.
            const b = a / 0.7;
            const wide = (0.006 + 0.01 * rand(key, born + 5)) * f.size * (big ? 1.5 : 1);
            if (b < 1) splash.put(tuft.x + Math.cos(dir) * out, LEVELS.pool + 0.03 + up * 4 * b * (1 - b) * 0.5, tuft.z + Math.sin(dir) * out, wide, 0.95, rand(key, 9), 0, -(1.6 + 2.2 * Math.abs(1 - 2 * b)));
            else splash.put(tuft.x + Math.cos(dir) * out, LEVELS.pool + 0.012, tuft.z + Math.sin(dir) * out, (0.03 + 0.2 * (b - 1) / 0.43) * f.size, 0.5 * (1 - (b - 1) / 0.43), rand(key, 9), 0, -100.22);
          } else {
            // Lifted, the tuft streams: strings of drops fall from its strands to the pool.
            const fall = 4.9 * age * age;
            const from = tuft.y - 0.1 * f.size - fall;
            if (from < LEVELS.pool) continue;
            const off = (rand(key, 4) - 0.5) * 0.5 * f.size;
            splash.put(tuft.x + fx * off + (rand(key, 6) - 0.5) * 0.1, from, tuft.z + fz * off + (rand(key, 8) - 0.5) * 0.1, (0.005 + 0.008 * rand(key, born + 5)) * f.size, 0.85, rand(key, 9), 0, -2.6);
          }
        } else if (f.habit === 1) {
          // Shaken, the strands throw the water off in a fan.
          if (tuft.shake < 0.15) continue;
          const v = 2.2 + 3 * rand(key, born + 3);
          const el = (rand(key, born + 11) - 0.3) * 1.6;
          const along = Math.cos(el) * v * age;
          const side = (rand(key, born + 13) - 0.5) * 0.8 * v * age;
          const y = tuft.y + Math.sin(el) * v * age - 4.9 * age * age;
          if (y < LEVELS.pool) continue;
          splash.put(tuft.x + fx * along - fz * side, y, tuft.z + fz * along + fx * side, (big ? 0.014 : 0.005 + 0.008 * rand(key, born + 5)) * f.size, 0.9 * tuft.shake * (1 - a), rand(key, 9), 0, -2.2);
        } else {
          // Each foot of a runner throws a sheet back and up as it comes down.
          const out = (0.3 + 1.6 * rand(key, born + 40) * a) * f.size;
          const up = (0.4 + 1.3 * rand(key, born + 80)) * f.size;
          const back = dir * 0.4 - 0.2;
          const lag = RUN_SPEED * age * 0.8 * (lp === null ? 1 : 0.15);
          splash.put(fig.x - fx * (lag + Math.cos(back) * out) + fz * Math.sin(back) * out, ground(fig.x, fig.z) + 0.05 + up * 2 * a * (1 - a), fig.z - fz * (lag + Math.cos(back) * out) - fx * Math.sin(back) * out, (big ? 0.07 + 0.06 * rand(key, born + 5) : 0.008 + 0.012 * rand(key, born + 5)) * f.size, (big ? 0.3 : 0.9) * (1 - a), rand(key, 9), big ? dir : 0, big ? 1.4 : -(1.6 + 2 * Math.abs(1 - 2 * a)));
        }
      }
    }
    if (lp === null) {
      for (let i = 0; i < FLEEING; i++) {
        const l = leavers[i] as Leaver;
        const tau = seconds - l.t;
        if (tau < -0.05 || tau > 1.5) continue;
        const fx = Math.sin(l.yaw);
        const fz = Math.cos(l.yaw);
        for (let n = 0; n < KICK_DROPS; n++) {
          const key = i * 97 + n;
          if (n < 22) {
            // The push throws a sheet back and up from under the feet: it stands a moment and falls.
            const a = (tau + 0.05 - 0.12 * rand(key, 3)) / (0.5 + 0.35 * rand(key, 4));
            if (a < 0 || a > 1) continue;
            const dir = (rand(key, 5) - 0.5) * 2.4;
            const out = (0.3 + 2.2 * rand(key, 6)) * a * l.size;
            const up = (0.5 + 1.5 * rand(key, 7)) * l.size;
            const big = n < 8;
            splash.put(l.x - fx * Math.cos(dir) * out + fz * Math.sin(dir) * out, l.bed + 0.05 + up * 4 * a * (1 - a) * 0.5, l.z - fz * Math.cos(dir) * out - fx * Math.sin(dir) * out, (big ? 0.1 + 0.1 * rand(key, 8) : 0.012 + 0.016 * rand(key, 8)) * l.size, (big ? 0.35 : 0.9) * (1 - a), rand(key, 9), big ? dir : 0, big ? 1.5 : -(1.6 + 2 * Math.abs(1 - 2 * a)));
          } else {
            // Water runs off the trailed feet for a second after: drops let go one by one and fall behind it.
            const born = 0.1 + 1.1 * rand(key, 3);
            const age = tau - born;
            if (age < 0) continue;
            const from = l.bed + (1.3 + 0.7 * l.seed) * l.size * (1 - Math.exp(-(born - 0.14) * 2.2)) + 0.4;
            const y = from - 4.9 * age * age;
            if (y < l.bed) continue;
            const d = gone(l, born) - 1.6 * l.size + 0.6 * gone(l, born + age) - 0.6 * gone(l, born);
            splash.put(l.x + fx * d + (rand(key, 6) - 0.5) * 0.3, y, l.z + fz * d + (rand(key, 8) - 0.5) * 0.3, (0.01 + 0.012 * rand(key, 5)) * l.size, 0.85, rand(key, 9), 0, -(1.5 + 3 * age));
          }
        }
      }
    }
    splash.end();
  };


  // ---- The stream of the approach: bodies that leave a ledge of the near blade one after another, cross to the gap and wheel there; and the many that turn round the tips ----
  const STREAM = 110;
  const SWIRL = 260;
  const airBodies = flierMaterials(ctx, LEVELS.pool);
  const LEAD = 126;
  /** Of the leaders, those that stand in the first frame itself. */
  const FIRST = 14;
  /** The side the wind of the storm sets them to: 1 or -1. */
  const CRAB = 1;
  const flight = new Flight(airBodies, STREAM + SWIRL + LEAD);
  const F = flying();
  const streamWay = { x: FLOCK.toward[0] - FLOCK.from[0], y: FLOCK.toward[1] - FLOCK.from[1], z: FLOCK.toward[2] - FLOCK.from[2], long: 1, hx: 0, hz: 0 };
  streamWay.long = Math.hypot(streamWay.x, streamWay.y, streamWay.z);
  streamWay.x /= streamWay.long;
  streamWay.y /= streamWay.long;
  streamWay.z /= streamWay.long;
  {
    const flat = Math.hypot(streamWay.x, streamWay.z) || 1;
    streamWay.hx = streamWay.x / flat;
    streamWay.hz = streamWay.z / flat;
  }
  /** Where the i-th of the stream is at t, into `out`; false before it has left the ledge. */
  const streamPlace = (i: number, t: number, out: Spot): boolean => {
    const left = FLOCK.began + ((FLOCK.until - FLOCK.began) * (i + hash(i, 71))) / STREAM;
    const tau = t - left;
    if (tau < 0) return false;
    // It drops off the ledge slow and is at its speed in a few strokes.
    const d = FLOCK.speed * tau - (FLOCK.speed - 7) * 1.6 * (1 - Math.exp(-tau / 1.6));
    const wide = smooth(0, 150, d);
    const a = (hash(i, 73) + hash(i, 74) - 1) * 34 * wide + 5 * wide * Math.sin(tau * (0.4 + 0.3 * hash(i, 75)) + i);
    const b = (hash(i, 76) + hash(i, 77) - 1) * 22 * wide + 3 * wide * Math.sin(tau * (0.3 + 0.3 * hash(i, 78)) + i * 1.7) - 8 * Math.sin(Math.PI * Math.min(1, tau / 2.6));
    // Across the way, level: to the right of it.
    const px = streamWay.hz;
    const pz = -streamWay.hx;
    const along = Math.min(d, streamWay.long);
    let x = FLOCK.from[0] + streamWay.x * along + px * a;
    let y = FLOCK.from[1] + streamWay.y * along + b;
    let z = FLOCK.from[2] + streamWay.z * along + pz * a;
    if (d > streamWay.long) {
      // At the gap it goes into a wheel that its way touches, to its own side and of its own width, and rides the air there.
      const side = hash(i, 79) < 0.5 ? 1 : -1;
      const radius = 70 + 120 * hash(i, 80);
      const round = (d - streamWay.long) / radius;
      x += radius * (px * side * (1 - Math.cos(round)) + streamWay.hx * Math.sin(round));
      z += radius * (pz * side * (1 - Math.cos(round)) + streamWay.hz * Math.sin(round));
      y += streamWay.y * radius * Math.sin(round) + 14 * Math.sin(round * 0.37 + i);
    }
    out.x = x;
    out.y = y;
    out.z = z;
    return true;
  };
  const swirl: Flier[] = [];
  for (let i = 0; i < SWIRL; i++) {
    const radius = 14 + 130 * scatter.next() ** 2;
    swirl.push({
      cx: FLOCK.swirl[0] + scatter.normal() * 55,
      cz: FLOCK.swirl[2] + scatter.normal() * 55,
      radius,
      y: FLOCK.swirl[1] + scatter.normal() * 45,
      rate: ((scatter.next() < 0.5 ? 1 : -1) * scatter.range(11, 17)) / radius,
      phase: scatter.range(0, Math.PI * 2),
      squash: scatter.range(0.55, 1),
      size: scatter.range(0.85, 1.25),
      seed: scatter.next(),
      dark: 0,
    });
  }
  // Some of the stream turn out to sea, and the lens of the approach passes them: each is abeam of it once, at its own time, well off
  // to a side and mostly over it, on a straight way from the ledge. They are what gives the blades their size.
  // The last is abeam by the seventh second: after it the lens is among the blades, and a flier that large before the first foot is
  // pasted on the frame. Every second one keeps well off.
  const leads = Array.from({ length: LEAD }, (_, k) => {
    // Where it is in the frame at its own time: ahead of the lens along its look, to a side, mostly over the middle.
    // Of those in the first frame, four come near enough that the bent sail and the body read: no two side by side. The lens runs in
    // at four times a flier's speed and crabs to its left, so one that meets it is gone in a third of a second and is cut by the frame
    // as it goes. The four go its way instead, stooping ahead of it and to its left as it crabs: it comes up on them from behind, each
    // holds its place against the sky of the gap and grows, whole from the first frame until it is at its nearest after the first second.
    const slot = (k * 5) % FIRST;
    const near = k < FIRST && slot < 4;
    const at = near ? ([1.08, 1.3, 1.55, 1.8][slot] as number) : k < FIRST ? 0.2 * hash(k, 91) : -0.4 + (7.4 * (k - FIRST + hash(k, 91))) / (LEAD - FIRST);
    const cam = openingCamera(at);
    const ax = cam.aim[0] - cam.position[0];
    const ay = cam.aim[1] - cam.position[1];
    const az = cam.aim[2] - cam.position[2];
    const al = Math.hypot(ax, ay, az) || 1;
    const fl = Math.hypot(ax, az) || 1;
    // One that meets the lens in the first second is far enough at its own time that it is still well ahead when that second is over.
    const meets = 90 + 107 * (1.6 - at);
    const far = near ? ([30, 33, 36, 40][slot] as number) : Math.max(meets, k < FIRST ? 60 + (140 * slot) / FIRST : (k % 2 === 0 ? 60 : 170) + 95 * hash(k, 93));
    const side = near ? ([0.3, 0.2, 0.33, 0.36][slot] as number) * far : (k < FIRST ? ((k + 0.5) / FIRST) * 2 - 1 + 0.08 * (hash(k, 92) - 0.5) : 2 * hash(k, 92) - 1) * 0.42 * far;
    const over = (near ? ([0.13, 0.05, -0.02, 0.14][slot] as number) : -0.05 + 0.27 * hash(k, 94)) * far;
    const x = cam.position[0] + (ax / al) * far - (az / fl) * side;
    const y = Math.max(cam.position[1] + (ay / al) * far + over, 9);
    const z = cam.position[2] + (az / al) * far + (ax / fl) * side;
    // The way of the four: forty degrees to the left of the lens's look, and down.
    const dx = near ? (0.766 * ax + 0.643 * az) / fl : x - FLOCK.from[0];
    const dz = near ? (0.766 * az - 0.643 * ax) / fl : z - FLOCK.from[2];
    const dy = near ? -0.37 : y - FLOCK.from[1];
    const l = Math.hypot(dx, dy, dz) || 1;
    const flat = Math.hypot(dx, dz) || 1;
    return { at, x, y, z, dx: dx / l, dy: dy / l, dz: dz / l, px: dz / flat, pz: -dx / flat, speed: near ? 27 + 2 * hash(k, 95) : FLOCK.speed * (0.85 + 0.3 * hash(k, 95)), seed: hash(k, 96), sway: near ? 0.25 : 1 };
  });
  const leadPlace = (k: number, t: number, out: Spot): void => {
    const b = leads[k] as (typeof leads)[number];
    const gone = b.speed * (t - b.at);
    const aside = b.sway * (5 * Math.sin(t * (0.35 + 0.3 * b.seed) + k * 2.1) + 2 * Math.sin(t * (0.9 + 0.4 * b.seed) + k));
    out.x = b.x + b.dx * gone + b.px * aside;
    out.y = b.y + b.dy * gone + 2.2 * Math.sin(t * (0.5 + 0.3 * b.seed) + k * 1.3);
    out.z = b.z + b.dz * gone + b.pz * aside;
  };
  // ---- Those that leave the flats before the wall: each stands, dips, pushes off and gathers way, one after another about the bore ----
  const LEFT = [-1.25, -0.1, -0.8, 0.35, -0.45, 0.75, -1.7, -0.95, -0.3];
  const fleet = new Flight(airBodies, FLEEING, true);
  const leavers: Leaver[] = Array.from({ length: FLEEING }, (_, i) => {
    const staged = i < 6;
    // Where it is at the bore's event if it has left by then: six staged across the middle of the bore's frame, the rest by the flats.
    const far = staged ? ([37, 30, 44, 33, 28, 40][i] as number) : 0;
    const off = staged ? ([-15, -8, -2.5, 4.5, 10, 16.5][i] as number) + 2 : 0;
    const side = (i - (FLEEING - 1) / 2) / FLEEING;
    const vx = staged ? -gateRight[0] * 14 - gateAhead[0] * 6.5 : -14;
    const vz = staged ? -gateRight[1] * 14 - gateAhead[1] * 6.5 : 12;
    const speed = Math.hypot(vx, vz);
    const l: Leaver = {
      x: staged ? gateEye[0] + gateAhead[0] * far + gateRight[0] * off : flee[0] + side * 42 + 3 * Math.sin(i * 2.4),
      z: staged ? gateEye[2] + gateAhead[1] * far + gateRight[1] * off : flee[1] - 22 - (24 * ((i * 5) % 7)) / 7,
      bed: 0,
      yaw: Math.atan2(vx, vz),
      speed,
      t: BORE + (LEFT[i] as number),
      size: staged ? 1.3 + 0.3 * hash(i, 5) : 0.7 + 0.5 * hash(i, 5),
      seed: hash(i, 7),
    };
    const back = gone(l, Math.max(0, -(LEFT[i] as number)));
    l.x -= (vx / speed) * back;
    l.z -= (vz / speed) * back;
    l.bed = ground(l.x, l.z);
    return l;
  });

  const was: Spot = { x: 0, y: 0, z: 0, yaw: 0, roll: 0 };
  const next: Spot = { x: 0, y: 0, z: 0, yaw: 0, roll: 0 };
  /** A body in the air into `F` from where it was, is and will be a twentieth of a second apart: it heads the way it goes, noses up as it climbs and banks into its turn. */
  const borne = (size: number, seed: number, t: number, hard: number): void => {
    const h = 0.05;
    const vx = (next.x - was.x) / (2 * h);
    const vy = (next.y - was.y) / (2 * h);
    const vz = (next.z - was.z) / (2 * h);
    const speed = Math.hypot(vx, vz) || 1;
    const before = Math.atan2(spot.x - was.x, spot.z - was.z);
    const after = Math.atan2(next.x - spot.x, next.z - spot.z);
    let turned = after - before;
    if (turned > Math.PI) turned -= TAU;
    if (turned < -Math.PI) turned += TAU;
    // Strokes in bouts, glides between, each at its own beat; one just off the ledge strokes hard.
    const bout = Math.max(hard, smooth(0.3, 0.5, held(t, 3.1 + 2 * seed, seed, 0.3)));
    F.x = spot.x;
    F.y = spot.y;
    F.z = spot.z;
    F.yaw = Math.atan2(vx, vz);
    F.pitch = Math.atan2(vy, speed) + 0.05 * bout;
    F.roll = Math.max(-1, Math.min(1, Math.atan(((turned / h) * speed) / 9.8))) + 0.1 * Math.sin(t * (0.5 + 0.4 * seed) + seed * 11);
    F.size = size;
    F.tone = 0.86 + 0.24 * seed;
    F.stroke = t * (7.2 + 3 * seed) + seed * 40;
    F.deep = 0.12 + 0.88 * bout;
    F.drawn = 0;
    F.legs = 0;
    // The nose rides the stroke, and the neck is drawn back in a glide and reaches out in a bout, each to its own measure and in its own time.
    F.pitch += 0.045 * F.deep * Math.sin(F.stroke - 0.7);
    F.neck = (0.3 + 0.5 * ((seed * 7.13) % 1) + 0.18 * Math.sin(t * (0.31 + 0.4 * seed) + seed * 23)) * (1 - 0.45 * bout);
  };

  // ---- In the film the skein, those that cross before the colony's lens and the low ones round the colony are bodies, and a crowd wheels over the colony ----
  const ROOK = 150;
  const escort = new Flight(airBodies, SKEIN + PASSERS + LOW + ROOK);
  const crowd = ctx.rng('kite-wings-crowd');
  const rooks: Flier[] = [];
  for (let i = 0; i < ROOK; i++) {
    const radius = 45 + 190 * crowd.next() ** 2;
    rooks.push({
      cx: COLONY.x + crowd.normal() * 35,
      cz: COLONY.z + crowd.normal() * 35,
      radius,
      y: COLONY.top - 12 + 120 * crowd.next() ** 1.5,
      rate: ((crowd.next() < 0.5 ? 1 : -1) * crowd.range(11, 17)) / radius,
      phase: crowd.range(0, Math.PI * 2),
      squash: crowd.range(0.55, 1),
      size: crowd.range(0.85, 1.25),
      seed: crowd.next(),
      dark: 0,
    });
  }
  /** A body on a straight way into `F`: where it is, the way it goes, how hard it strokes. */
  const straight = (x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, seed: number, t: number, amp: number): void => {
    F.x = x;
    F.y = y;
    F.z = z;
    F.yaw = Math.atan2(vx, vz);
    F.pitch = Math.atan2(vy, Math.hypot(vx, vz) || 1) + 0.05 * amp;
    F.roll = 0.14 * Math.sin(t * (0.5 + 0.4 * seed) + seed * 11) + (seed - 0.5) * 0.3;
    F.size = size;
    F.tone = 0.86 + 0.24 * seed;
    F.stroke = t * (7.2 + 3 * seed) + seed * 40;
    F.deep = 0.12 + 0.88 * amp;
    F.drawn = 0;
    F.legs = 0;
    F.neck = (0.3 + 0.5 * ((seed * 7.13) % 1)) * (1 - 0.45 * amp);
  };

  const group = new THREE.Group();
  group.add(flight.mesh, fleet.mesh, escort.mesh);
  if (fleet.mirror) group.add(fleet.mirror);
  group.add(bodies.mesh, bodies.mirror, runners.mesh);
  if (runners.mirror) group.add(runners.mirror);
  // ---- The card loop's own: a knot that stoops into the sky of the establishing picture and climbs out over the top of the frame ----
  // It is in no frame of the film. Its way is one closed ring to the loop, tilted: high and near at the loop's start, where it is over the
  // top of the frame, so that frame 0 is the key's picture; low and far at the middle of the loop.
  // [the part of the loop it is behind the first, metres outside the ring, metres over it, size]
  const SWOOP: [number, number, number, number][] = [[0, 0, 0, 1], [0.012, 3.2, -1.8, 0.9], [-0.016, -2.6, 1.5, 0.95], [0.03, 1.4, 2.6, 0.86], [-0.034, -4.1, -0.6, 1.02], [0.045, 4.4, -2.8, 0.92], [-0.05, -1.2, 3.1, 0.88]];
  /** The ring: its middle in metres ahead of the establishing lens, to its right and over it; metres a second round it; metres it falls and climbs. */
  const STOOP = { ahead: 120, right: 3, over: 42.5, speed: 22, fall: 15 };
  const swoopFigures = new Figures(airSheet, SWOOP.length, {}, 6, 4);
  const swoopAt = (i: number, eye: [number, number, number]): void => {
    const [lag, wide, over, size] = SWOOP[i] as [number, number, number, number];
    const a = TAU * ((lp ?? 0) - lag);
    const ring = (STOOP.speed * LOOP_SECONDS) / TAU + wide;
    const turn = TAU / LOOP_SECONDS;
    const along = STOOP.ahead - ring * Math.cos(a);
    const side = STOOP.right + ring * Math.sin(a);
    const goAlong = ring * Math.sin(a) * turn;
    const goSide = ring * Math.cos(a) * turn;
    const fx = ex / el;
    const fz = ez / el;
    // It glides down and strokes hard to climb.
    const amp = 0.2 + 0.8 * smooth(-0.3, 0.5, -Math.sin(a));
    airborne(STATIONS.establish[0] + fx * along - fz * side, eye[1] + STOOP.over + over + STOOP.fall * Math.cos(a), STATIONS.establish[1] + fz * along + fx * side, fx * goAlong - fz * goSide, -STOOP.fall * Math.sin(a) * turn, fz * goAlong + fx * goSide, size, hash(i, 3), T0, amp, eye);
    // Seen from under, against the bright of the sky, it is dark.
    fig.tone = 0.5 + 0.1 * hash(i, 9);
  };
  group.add(mats.mesh, roostBodies.mesh, colonyFigures.mesh, standers.mesh, flockFigures.mesh, skeinFigures.mesh, swoopFigures.mesh);
  if (colonyFigures.shade) group.add(colonyFigures.shade);
  ctx.scene.add(ctx.parts.built('kite-wings', group, splash.mesh), splash.mesh);

  return {
    setTime: (seconds) => {
      lp = loopPhase();
      const eye = eyeAt(lp === null ? seconds : T0);
      // In the loop what flies straight through the film is where the key has it, and from there flies its closed turn.
      const at = lp === null ? seconds : T0;
      for (let i = 0; i < feeders.length; i++) {
        const f = feeders[i] as Feeder;
        feederAt(f, seconds);
        runners.hide(i);
        if (tuft.here) bodies.put(i, P);
        else bodies.hide(i);
        rig.setDisc(discs, i, P.x, P.z, 1.1 * f.size, tuft.here ? 0.3 : 0);
      }
      runners.commit();
      bodies.commit();
      splashAt(seconds);

      // The stream and the swirl are the film's: the card loop begins after they have gone to the gap.
      // Hidden by drawing none of them, never by the mesh's own switch: the solo view owns that switch and a part that sets it again shows in every other part's solo.
      flight.draw(lp === null ? STREAM + SWIRL + LEAD : 0);
      if (lp === null) {
        for (let i = 0; i < STREAM; i++) {
          if (!streamPlace(i, seconds - 0.05, was) || !streamPlace(i, seconds, spot) || !streamPlace(i, seconds + 0.05, next)) {
            flight.hide(i);
            continue;
          }
          const gone = seconds - 0.05 - (FLOCK.began + ((FLOCK.until - FLOCK.began) * (i + hash(i, 71))) / STREAM);
          borne((0.95 + 0.4 * hash(i, 81)) * smooth(0, 0.4, gone), hash(i, 82), seconds, 1 - smooth(2, 5, gone));
          flight.put(i, F);
        }
        for (let i = 0; i < swirl.length; i++) {
          const f = swirl[i] as Flier;
          flierPlace(f, seconds - 0.05, was);
          flierPlace(f, seconds + 0.05, next);
          flierPlace(f, seconds, spot);
          borne(f.size, f.seed, seconds, 0);
          flight.put(STREAM + i, F);
        }
        for (let k = 0; k < LEAD; k++) {
          if (seconds > OPENING_END + 2) {
            flight.hide(STREAM + SWIRL + k);
            continue;
          }
          leadPlace(k, seconds - 0.05, was);
          leadPlace(k, seconds + 0.05, next);
          leadPlace(k, seconds, spot);
          borne(1 + 0.3 * hash(k, 97), (leads[k] as (typeof leads)[number]).seed, seconds, 0.75);
          // They come on at the lens, and one that flies straight at it is a flat spread outline: each holds its head off its way into the
          // wind of the storm, by its own amount, one sail low, so that a flank and the top of a sail are what the lens has of it.
          F.yaw += CRAB * (0.34 + 0.3 * hash(k, 98));
          F.roll += CRAB * (0.24 + 0.2 * hash(k, 99));
          flight.put(STREAM + SWIRL + k, F);
        }
        flight.commit();
      }
      const roost = ROOSTED && lp === null && seconds >= colonySpan.from && seconds <= colonySpan.to;
      for (let i = 0; i < sitters.length; i++) {
        if (roost && roosting.has(i)) {
          colonyFigures.hide(i);
          continue;
        }
        sitterAt(sitters[i] as Sitter, i, seconds);
        colonyFigures.put(i, fig);
      }
      roostBodies.draw(roost ? roosts.length : 0);
      mats.draw(roost);
      if (roost) {
        for (let i = 0; i < roosts.length; i++) {
          roostPose(R, roosts[i] as Roosting, seconds, { wave, held: heldAt }, WIND.to);
          roostBodies.put(i, R);
        }
        roostBodies.commit();
      }
      for (let i = sitters.length; i < ROOKERY; i++) colonyFigures.hide(i);
      colonyFigures.commit();
      // In the approach no animal comes near the lens: the skein that flew in beside it is not drawn (none of it is ahead of any later lens),
      // and the flock round the blade tops is specks, each beating its own beat, until the camera has closed on it.
      const approaching = inOpening();
      const lens = approaching && seconds < FAR.to ? approachEye(seconds) : null;
      // The widest a wing may stand at the lens, radians: a few pixels of the full frame as the film opens, and it grows past any flier's
      // real size before FAR.to, from where every flier is its own size again.
      const widest = FAR.wing * Math.exp(FAR.grow * smooth(FAR.from, FAR.to, seconds));
      const lifting = approaching && seconds < LIFT.from + LIFT.spread + LIFT.takes;
      const far = (): void => {
        if (!lens) return;
        const away = Math.hypot(fig.x - lens[0], fig.y - lens[1], fig.z - lens[2]);
        fig.size *= Math.min(1, (widest * away) / (FAR.span * fig.size));
      };
      for (let i = 0; i < fliers.length; i++) {
        const f = fliers[i] as Flier;
        if (f.size === 0) {
          flockFigures.hide(i);
          continue;
        }
        if (lp === null && i < LOW) {
          flierPlace(f, seconds - 0.05, was);
          flierPlace(f, seconds + 0.05, next);
          flierPlace(f, seconds, spot);
          borne(f.size * 0.8, f.seed, seconds, 0);
          escort.put(SKEIN + PASSERS + i, F);
          flockFigures.hide(i);
          continue;
        }
        flierAt(f, seconds, eye);
        if (lifting) {
          // Those whose way lies near the ledge start on it: they leave it one after another and are on their own way seconds later.
          const dx = fig.x - LIFT.at[0];
          const dy = fig.y - LIFT.at[1];
          const dz = fig.z - LIFT.at[2];
          const near = smooth(LIFT.within, 0.7 * LIFT.within, Math.hypot(dx, dy, dz));
          if (near > 0) {
            const gone = smooth(0, 1, (seconds - LIFT.from - LIFT.spread * hash(i, 31)) / LIFT.takes);
            const held = (1 - gone) * near;
            fig.x -= dx * held;
            fig.y -= dy * held;
            fig.z -= dz * held;
            fig.size *= 1 - near * (1 - smooth(0, 0.06, gone));
          }
        }
        far();
        flockFigures.put(i, fig);
      }
      flockFigures.commit();
      for (let i = 0; i < skein.length; i++) {
        const s = skein[i] as Passer;
        if (approaching && i < SKEIN) {
          skeinFigures.hide(i);
          escort.hide(i);
          continue;
        }
        const bout = smooth(0.25, 0.45, heldAt(seconds, 3.4 + 2 * s.seed, s.seed, 0.3));
        const y = s.y + 1.2 * Math.sin(at * 0.6 + s.seed * 20);
        const amp = i < SKEIN ? 0.25 + 0.75 * bout : lp === null ? 0.7 : 1;
        if (lp === null) {
          straight(s.x + s.vx * (seconds - s.t), y, s.z + s.vz * (seconds - s.t), s.vx, 0.72 * Math.cos(seconds * 0.6 + s.seed * 20), s.vz, s.size, s.seed, seconds, amp);
          escort.put(i, F);
          skeinFigures.hide(i);
          continue;
        }
        circuit(s.x + s.vx * (at - s.t), y, s.z + s.vz * (at - s.t), s.vx, 0.72 * Math.cos(at * 0.6 + s.seed * 20), s.vz, s.seed < 0.5 ? 1 : -1, s.size, s.seed, amp, eye);
        far();
        skeinFigures.put(i, fig);
      }
      const lead = at - BORE;
      // In the film they are bodies that leave the ground; the card loop keeps its circuits.
      fleet.draw(lp === null ? FLEEING : 0);
      for (let i = 0; i < FLEEING; i++) {
        if (lp === null) {
          if (lead < -2.4) fleet.hide(i);
          else {
            leaving(leavers[i] as Leaver, seconds, F);
            fleet.put(i, F);
          }
          skeinFigures.hide(SKEIN + PASSERS + i);
          continue;
        }
        const side = (i - (FLEEING - 1) / 2) / FLEEING;
        // Low over the water before the wall, a wing's length over it, pale against the dark of the stacks and the green of the wall.
        if (i < 6) {
          // Staged for the bore's key: six flee toward its lens across the middle of the frame, each about a tenth of it wide, dark against the white water.
          const far = [44, 35, 52, 40, 33, 48][i] as number;
          const off = ([-19, -10, -3, 6, 13, 21][i] as number) + 5;
          const vx = -gateRight[0] * 10 - gateAhead[0] * 12;
          const vz = -gateRight[1] * 10 - gateAhead[1] * 12;
          const x = gateEye[0] + gateAhead[0] * far + gateRight[0] * off + vx * lead;
          const z = gateEye[2] + gateAhead[1] * far + gateRight[1] * off + vz * lead;
          const y = 2.5 + (1.6 * ((i * 3) % 4)) / 4 + 0.5 * lead + 0.4 * Math.sin(at * 1.3 + i);
          if (lp === null) airborne(x, y, z, vx, 0.5, vz, 1.15 + 0.3 * hash(i, 5), hash(i, 7), seconds, 1, eye);
          else circuit(x, y, z, vx, 0.5, vz, i % 2 === 0 ? 1 : -1, 1.15 + 0.3 * hash(i, 5), hash(i, 7), 1, eye);
          fig.tone = 0.42 + 0.16 * hash(i, 9);
          skeinFigures.put(SKEIN + PASSERS + i, fig);
          continue;
        }
        const x = flee[0] + side * 42 - 14 * lead + 3 * Math.sin(i * 2.4);
        const z = flee[1] - 22 - (24 * ((i * 5) % 7)) / 7 + 12 * lead;
        const y = 2.4 + (2.6 * ((i * 3) % 4)) / 4 + 0.5 * lead + 0.4 * Math.sin(at * 1.3 + i);
        if (lp === null) airborne(x, y, z, -14, 0.5, 12, 0.62 + 0.5 * hash(i, 5), hash(i, 7), seconds, 1, eye);
        else circuit(x, y, z, -14, 0.5, 12, i % 2 === 0 ? 1 : -1, 0.62 + 0.5 * hash(i, 5), hash(i, 7), 1, eye);
        skeinFigures.put(SKEIN + PASSERS + i, fig);
      }
      if (lp === null) fleet.commit();
      // While the lens is far out at sea none of them is a pixel wide: not drawn.
      const escorted = lp === null && lens === null;
      // The crowd over the colony is drawn where a lens is near enough to tell one of it from the specks of the flock.
      const off = Math.hypot(eye[0] - COLONY.x, eye[2] - COLONY.z);
      const crowded = off < 540;
      // They come up out of nothing as the lens nears, so that none is seen to start.
      const grown = smooth(540, 430, off);
      escort.draw(escorted ? SKEIN + PASSERS + LOW + (crowded ? ROOK : 0) : 0);
      if (escorted) {
        for (let i = 0; crowded && i < ROOK; i++) {
          const f = rooks[i] as Flier;
          flierPlace(f, seconds - 0.05, was);
          flierPlace(f, seconds + 0.05, next);
          flierPlace(f, seconds, spot);
          borne(f.size * grown, f.seed, seconds, 0);
          escort.put(SKEIN + PASSERS + LOW + i, F);
        }
        escort.commit();
      }
      landers.forEach((l, i) => {
        // In the loop both are down: the one the key has a moment from the ground has landed, and neither is seen to come in twice.
        const tau = lp === null ? seconds - l.t : Math.max(0.8, T0 - l.t);
        const bed = ground(l.at[0], l.at[1]);
        const slot = SKEIN + PASSERS + FLEEING + i;
        if (tau < 0) {
          // Coming down: the legs reach for the ground, the sails cup the air.
          const b = -tau;
          const dist = b < 2 ? b * (1.2 + 2.95 * b) : 14.2 + 13 * (b - 2);
          const high = 0.2 * dist + 0.3 * (1 - Math.exp(-b * 3)) + 1.9 * l.size;
          const speed = b < 2 ? 1.2 + 5.9 * b : 13;
          airborne(l.at[0] - Math.sin(l.yaw) * dist, bed + high, l.at[1] - Math.cos(l.yaw) * dist, Math.sin(l.yaw) * speed, -0.2 * speed, Math.cos(l.yaw) * speed, l.size, l.seed, seconds, 1, eye);
          if (b < 1.5) fig.cell = 3;
          skeinFigures.put(slot, fig);
          standers.hide(i);
        } else {
          // Down: it stands with a sail still out, shuts it, and looks about.
          Object.assign(fig, placed());
          fig.cell = tau < 2.2 ? 2 : 1;
          fig.size = l.size * 0.62;
          fig.turn = l.yaw;
          fig.x = l.at[0];
          fig.z = l.at[1];
          fig.y = bed;
          fig.sway = 0.05 * Math.exp(-tau * 3) * Math.cos(tau * 5.5);
          fig.limbs[0] = (heldAt(seconds, 1.6, l.seed) - 0.5) * 0.6;
          fig.limbs[1] = 0.25 * Math.sin(tau * 9) * Math.exp(-tau * 1.2) + (lp === null ? 0 : 0.07 * Math.sin(2 * TAU * lp + l.seed * 9));
          standers.put(i, fig);
          skeinFigures.hide(slot);
        }
        rig.setDisc(discs, feeders.length + i, l.at[0], l.at[1], 1.2 * l.size, 0.3 * smooth(-0.5, 0.2, tau));
      });
      skeinFigures.commit();
      standers.commit();
      for (let i = 0; i < SWOOP.length; i++) {
        if (lp === null) swoopFigures.hide(i);
        else {
          swoopAt(i, eye);
          swoopFigures.put(i, fig);
        }
      }
      swoopFigures.commit();
    },
    dispose: () => {
      for (const m of [runnerSheet, perchedSheet, airSheet]) {
        m.body.dispose();
        m.mirror.dispose();
        m.shade.dispose();
        m.late.dispose();
      }
      bodySheet.body.dispose();
      airBodies.body.dispose();
      airBodies.mirror.dispose();
      flight.dispose();
      fleet.dispose();
      escort.dispose();
      bodySheet.mirror.dispose();
      bodies.dispose();
      for (const figures of [runners, colonyFigures, standers, flockFigures, skeinFigures, swoopFigures]) figures.dispose();
      roostBodies.dispose();
      mats.dispose();
      splash.dispose();
    },
  };
}
