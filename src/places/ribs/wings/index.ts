// The kite-wings: feeders wading the pools, the colony on the ledges of its rock, the flock round the rib tops, a skein coming in from the sea,
// the ones that land, and the ones that run from the bore. Each is one of the Builder's pictures of the animal, stood in the place and bent
// about its joints; every pose is a function of the time of the place alone.
import * as THREE from 'three';
import { resolve } from '../../../core/cameras';
import { partOfFrame, secondsInPlace, shotById, shotsOf } from '../../../film/cut';
import { shots } from '../cameras';
import { BORE, COLONY, LEVELS, RIBS, STATIONS, T0, UNIT, keySeconds } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { partAtHeight, ribByName, surface } from '../layout';
import { foamTexture } from '../sea/chop';
import { Spray, rand } from '../sea/spray';
import { RING_SOURCE } from '../sea/tide';
import type { Ring } from '../sea/tide';
import { FEEDER_A, FEEDER_B, FEEDER_C, FLIERS, Figures, PERCHED, figureMaterials, figurePoint, placed } from './figure';
import type { Placed } from './figure';

/** The kite-wing of the approved pictures stands twice a man at the back: the old measure of its size, kept for the flock's scatter. */
const GROW = 1.35;

export const PARTS: readonly string[] = ['kite-wings'];

const FEEDERS = 44;
const FLIERS_N = 451;
const SPECKS = 560;
const PASSERS = 6;
const LOW = 6;
const FLEEING = 9;
const COLONISTS = 150;
const SKEIN = 22;
/** Metres a flier keeps from every lens. */
const CLEAR = 45;
/** Seconds the shutter is open, for the softness of what crosses the lens fast. */
const SHUTTER = 1 / 50;

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
  /** A runner is at its station at this second, and is in the place only for `span` seconds either side of it. */
  at: number;
  span: number;
}
const TIP_A: [number, number] = [1180, 884];
const TIP_B: [number, number] = [1290, 250];
const RUN_SPEED = 5.2;

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
    const f: Feeder = { x, z, yaw, size, habit, seed: scatter.next(), period, offset: scatter.range(0, 40), at, span };
    // One stationed for a key has had its tuft in the water for half a second when the key comes.
    if (at >= 0 && habit === 0) f.offset = period - ((at - 0.5) % period);
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
  const NEARER: [number, number][] = [[-54.4, -434.4], [-55.4, -455.2], [-61.5, -464]];
  NEARER.forEach(([x, z], i) => {
    if (i === 0) addFeeder(x, z, sideOn(x, z, 0.2), 1.02, 0, feedKey);
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
  const feederSheets = [figureMaterials(ctx, FEEDER_A, LEVELS.pool, 0.5), figureMaterials(ctx, FEEDER_B, LEVELS.pool, 0.5), figureMaterials(ctx, FEEDER_C, LEVELS.pool, 0.4)];
  const feederFigures = feederSheets.map((m) => new Figures(m, feeders.length, { mirror: true }));
  const discs = rig.contactDiscs(feeders.length + 4);

  const fig = placed();
  /** Where the end of the tuft is, and how far it is in the water (0 to 1); for a runner, how hard its feet strike. */
  const tuft = { x: 0, y: 0, z: 0, wet: 0, shake: 0, here: true };

  /** One feeder at t: its figure into `fig`, its tuft into `tuft`. */
  const feederAt = (f: Feeder, t: number): void => {
    Object.assign(fig, placed());
    fig.size = f.size;
    fig.turn = f.yaw;
    fig.x = f.x;
    fig.z = f.z;
    fig.tone = 0.92 + 0.16 * f.seed;
    tuft.here = Math.abs(t - f.at) <= f.span;
    tuft.wet = 0;
    tuft.shake = 0;
    const fx = Math.sin(f.yaw);
    const fz = Math.cos(f.yaw);
    let tip: [number, number] = [0, 0];
    if (f.habit === 0) {
      // Probing, then the head comes up streaming, looks about, and goes back in.
      const ph = (((t + f.offset) % f.period) + f.period) % f.period;
      const up = smooth(f.period - 3.4, f.period - 2.5, ph) * (1 - smooth(f.period - 0.75, f.period - 0.1, ph));
      fig.limbs[0] = -0.55 * up + (1 - up) * (0.04 * Math.sin(t * 1.7 + f.seed * 20) + 0.03 * Math.sin(t * 3.9 + f.seed * 7)) + up * 0.07 * Math.sin(t * 0.9 + f.seed * 3);
      fig.limbs[1] = 0.1 * Math.sin(t * 2.1 + f.seed * 9) * (1 - up) + 0.22 * up + 0.12 * up * Math.sin(t * 5.1 + f.seed * 4);
      fig.sway = 0.012 * Math.sin(t * 0.6 + f.seed * 5) - 0.03 * up;
      tip = figurePoint(FEEDER_A, 0, TIP_A, fig.limbs);
      tuft.wet = 1 - smooth(0.02, 0.3, up);
      tuft.shake = smooth(f.period - 0.5, f.period - 0.1, ph) + (1 - smooth(0, 0.7, ph));
    } else if (f.habit === 1) {
      const bout = smooth(0.52, 0.66, held(t, 2.6, f.seed));
      fig.limbs[0] = -0.08 + 0.1 * Math.sin(t * 0.5 + f.seed * 11) + 0.05 * bout * Math.sin(t * 15);
      fig.limbs[1] = 0.16 * Math.sin(t * 0.8 + f.seed * 7) + 0.08 * Math.sin(t * 0.31 + f.seed * 3);
      fig.limbs[2] = 0.05 * Math.sin(t * 1.3 + f.seed) + 0.24 * bout * Math.sin(t * 17 + f.seed * 5);
      fig.sway = 0.015 * Math.sin(t * 0.7 + f.seed * 5);
      tip = figurePoint(FEEDER_B, 0, TIP_B, fig.limbs);
      tuft.shake = bout;
    } else {
      // Running: the legs scissor, the sails beat, the body rides up at each stride, and it goes.
      const run = t - f.at;
      const stride = run * 9.5 + f.seed * 6;
      fig.x += fx * RUN_SPEED * run;
      fig.z += fz * RUN_SPEED * run;
      fig.limbs[0] = 0.12 + 0.34 * Math.sin(run * 13 + f.seed * 9);
      fig.limbs[1] = 0.36 * Math.sin(stride);
      fig.limbs[2] = -0.36 * Math.sin(stride);
      fig.y = 0.14 * Math.abs(Math.sin(stride)) * f.size;
      tuft.shake = Math.abs(Math.cos(stride));
    }
    fig.y += ground(fig.x, fig.z);
    tuft.x = fig.x + fx * tip[0] * f.size;
    tuft.z = fig.z + fz * tip[0] * f.size;
    tuft.y = fig.y + tip[1] * f.size;
  };

  // The pools ring the legs of the feeders nearest the feeding camera.
  const ringed = feeders
    .map((f, i) => ({ i, d: Math.hypot(f.x - feedEye[0], f.z - feedEye[2] + 20) + (f.habit === 2 ? 1e6 : 0) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 8)
    .map((e) => e.i);
  RING_SOURCE.at = (seconds: number, out: Ring[]): void => {
    let n = 0;
    for (const i of ringed) {
      const f = feeders[i] as Feeder;
      feederAt(f, seconds);
      const legs = f.habit === 0 ? [-0.5, 0.5] : [0];
      for (const along of legs) {
        const ring = out[n++];
        if (ring) Object.assign(ring, { x: f.x + Math.sin(f.yaw) * along * f.size, z: f.z + Math.cos(f.yaw) * along * f.size, phase: f.seed * 20 + along * 4.2, strength: 0.3, stand: undefined });
      }
      const ring = out[n++];
      if (ring) Object.assign(ring, { x: tuft.x, z: tuft.z, phase: f.seed * 31, strength: 0.75 * tuft.wet, stand: undefined });
    }
  };

  // ---- The colony ----
  interface Sitter {
    x: number;
    y: number;
    z: number;
    yaw: number;
    size: number;
    seed: number;
    stands: boolean;
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
  // In knots of two to five along a ledge, with bare rock between the knots: animals to be read one by one.
  while (sitters.length < COLONISTS) {
    // Most of the knots sit where the colony's own shot looks, on the ledges that face its lens; the rest anywhere on the weather side.
    let tier = 0;
    let a0 = 0;
    for (let tries = 0; tries < 60; tries++) {
      tier = scatter.range(LEVELS.tide + 2, COLONY.top - 6);
      a0 = sitters.length < COLONISTS * 0.75 ? scatter.range(0, Math.PI * 2) : facing + scatter.normal() * 0.8;
      if (sitters.length >= COLONISTS * 0.75) break;
      const [r0, y0] = COLONY.perch(a0, tier, 0.5);
      seen.set(COLONY.x + Math.cos(a0) * r0, y0 + 1.5, COLONY.z + Math.sin(a0) * r0);
      const toward = (colonyEye[0] - seen.x) * Math.cos(a0) + (colonyEye[2] - seen.z) * Math.sin(a0);
      const far = Math.hypot(colonyEye[0] - seen.x, colonyEye[2] - seen.z);
      seen.project(colonyLens);
      if (toward > 0.2 * far && Math.abs(seen.x) < 0.92 && seen.y > -0.9 && seen.y < 0.8 && seen.z < 1) break;
    }
    const knot = 2 + scatter.int(6);
    let along = 0;
    for (let k = 0; k < knot && sitters.length < COLONISTS; k++) {
      const size = scatter.range(0.72, 1.25) * GROW;
      // The crag's own standing places: most sit back against the cliff behind, where the lip hides half of them from a lens that looks up.
      const a = a0 + along / COLONY.radiusAt(tier);
      const [r, perchY] = COLONY.perch(a, tier, scatter.next() < 0.6 ? scatter.range(0.1, 0.5) : scatter.range(0.4, 0.95));
      along += scatter.range(0.8, 1.9) * size;
      const x = COLONY.x + Math.cos(a) * r;
      const z = COLONY.z + Math.sin(a) * r;
      const out = Math.atan2(Math.cos(a), Math.sin(a));
      const stands = scatter.next() < 0.22;
      // A sheet reads only from its side: each stands across the colony lens's line of sight, a little turned.
      const across = Math.atan2(z - colonyEye[2], -(x - colonyEye[0])) + scatter.range(-0.85, 0.85);
      sitters.push({ x, y: perchY, z, yaw: across, size, seed: scatter.next(), stands, d: Math.hypot(x - colonyEye[0], perchY - colonyEye[1], z - colonyEye[2]) });
    }
  }
  sitters.sort((a, b) => a.d - b.d);
  const perchedSheet = figureMaterials(ctx, PERCHED, LEVELS.pool, 0.86);
  const colonyFigures = new Figures(perchedSheet, COLONISTS, { shade: true });
  /** Which of the six a sitter is: most sit hunched or crouched, some stand, a few hold a sail out or both open. */
  const cellOf = (s: Sitter): number => {
    const k = (s.seed * 977) % 1;
    return k < 0.34 ? 5 : k < 0.62 ? 0 : k < 0.74 ? 4 : k < 0.84 ? 1 : k < 0.93 ? 2 : 3;
  };
  const sitterAt = (s: Sitter, t: number): void => {
    Object.assign(fig, placed());
    const cell = cellOf(s);
    fig.cell = cell;
    fig.size = s.size * 0.46;
    // No two rows alike: half of them stand the other way round on their ledge.
    fig.turn = s.yaw + (Math.floor(s.seed * 1000) % 2 === 1 ? Math.PI : 0);
    // Never still: it shifts its weight along the ledge, rocks, and works its neck, each in its own time.
    const shift = 0.14 * s.size * Math.sin(t * (0.45 + 0.4 * s.seed) + s.seed * 23);
    fig.x = s.x + Math.sin(s.yaw) * shift;
    fig.z = s.z + Math.cos(s.yaw) * shift;
    fig.y = s.y - 0.04;
    fig.sway = 0.035 * Math.sin(t * (0.9 + 0.8 * s.seed) + s.seed * 50);
    const look = held(t, 1.6 + 2.2 * s.seed, s.seed, 0.3);
    fig.limbs[0] = (look - 0.5) * 0.7 + 0.06 * Math.sin(t * (1.7 + 1.2 * s.seed) + s.seed * 31);
    // A sail held out is flicked and beaten at a neighbour now and then.
    const row = smooth(0.55, 0.75, held(t, 2.3, s.seed + 0.6, 0.3));
    fig.limbs[1] = (cell === 3 ? -1 : 1) * (0.1 * Math.sin(t * 1.9 + s.seed * 17) + row * 0.3 * Math.sin(t * 9 + s.seed * 9));
    fig.limbs[2] = 0.1 * Math.sin(t * 1.7 + s.seed * 12) + row * 0.3 * Math.sin(t * 9 + s.seed * 9 + 0.5);
    // Weathered each to its own grey, and one in three in the shade of the rock over it.
    fig.tone = 0.62 + 0.4 * ((s.seed * 13.7) % 1);
    fig.shade = (s.seed * 7.3) % 1 < 0.36 ? 0.75 + 0.25 * ((s.seed * 3.1) % 1) : 0;
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
  const airSheet = figureMaterials(ctx, FLIERS, LEVELS.pool, 0.1, true);
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
    const ph = t * (9.5 + 3.5 * seed) + seed * 40;
    fig.stroke = sideways ? 1 - 0.44 * amp * (1 - Math.cos(ph)) : 1 - 0.27 * amp * (1 - Math.cos(ph));
    fig.roll = (sideways ? Math.atan2(vy, Math.abs(across)) : 0) + 0.14 * Math.sin(t * 0.5 + seed * 11) + (seed - 0.5) * 0.3;
    fig.size = size;
    fig.x = x;
    fig.y = y + 0.22 * amp * Math.sin(ph - 1.3) * size;
    fig.z = z;
    fig.tone = 0.86 + 0.24 * seed;
    fig.blur = [Math.min(90, (Math.abs(across) * SHUTTER * FLIERS.unit) / size), 0];
  };
  const flierAt = (f: Flier, t: number, eye: [number, number, number]): void => {
    flierPlace(f, t, spot);
    const { x, y, z } = spot;
    flierPlace(f, t + 0.05, spot);
    // Strokes in bouts, glides between.
    const bout = smooth(0.3, 0.5, held(t, 3.1 + 2 * f.seed, f.seed, 0.3));
    airborne(x, y, z, (spot.x - x) / 0.05, (spot.y - y) / 0.05, (spot.z - z) / 0.05, f.size * 0.8, f.seed, t, 0.2 + 0.8 * bout, eye);
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
  const openPath = shots['ribs-01'] as (typeof shots)[string];
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
    const cross: [number, number, number, number, number][] = [[15, -4.6, 3.6, 0, 15], [38, 9, 9, 0.1, -17], [52, -16, 13, -0.1, 15], [84, 20, 22, 0.2, -14], [112, -52, 36, 0.3, -13], [128, -24, 46, -0.6, 14]];
    for (let i = 0; i < PASSERS; i++) {
      const c = cross[i] as [number, number, number, number, number];
      skein.push({ x: eye.position[0] + fx * c[0] - fz * c[1], y: eye.position[1] + c[2], z: eye.position[2] + fz * c[0] + fx * c[1], vx: -fz * c[4] + fx * 2.5, vz: fx * c[4] + fz * 2.5, t: key + c[3], size: i === 0 ? 1 : 0.9, seed: hash(i, 9) });
    }
  }
  const skeinFigures = new Figures(airSheet, SKEIN + PASSERS + FLEEING + 2, {}, 6, 4);
  const flee = STATIONS.flee;

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
  const splash = new Spray(wet.length * SPLASH, { ...rig.uniforms, tFoam: { value: foamTexture(ctx.rng('kite-wings-splash')) } });
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
        const every = 0.45 + 0.5 * rand(key, 1);
        const u = seconds / every + rand(key, 2);
        const born = Math.floor(u);
        const a = u - born;
        const age = a * every;
        const dir = rand(key, born) * Math.PI * 2;
        const big = n % 5 === 0;
        if (f.habit === 0) {
          if (tuft.wet > 0.5) {
            // A crown where the strands go in and work: thrown up and out, falling back.
            const power = 0.5 + 1.6 * tuft.shake;
            const out = (0.1 + 0.55 * rand(key, born + 7) * a * power) * f.size;
            const up = (0.25 + 0.8 * rand(key, born + 3)) * f.size * power;
            splash.put(tuft.x + Math.cos(dir) * out, LEVELS.pool + 0.03 + up * 2 * a * (1 - a), tuft.z + Math.sin(dir) * out, (big ? 0.03 + 0.03 * rand(key, born + 5) : 0.008 + 0.014 * rand(key, born + 5)) * f.size * (1 + power * 0.4), (big ? 0.22 : 0.9) * (1 - a), rand(key, 9), dir);
          } else {
            // Lifted, the tuft streams: strings of drops fall from its strands to the pool.
            const fall = 4.9 * age * age;
            const from = tuft.y - 0.1 * f.size - fall;
            if (from < LEVELS.pool) continue;
            const off = (rand(key, 4) - 0.5) * 0.5 * f.size;
            splash.put(tuft.x + fx * off + (rand(key, 6) - 0.5) * 0.1, from, tuft.z + fz * off + (rand(key, 8) - 0.5) * 0.1, (0.006 + 0.012 * rand(key, born + 5)) * f.size, 0.85, rand(key, 9), 0, 2.4);
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
          splash.put(tuft.x + fx * along - fz * side, y, tuft.z + fz * along + fx * side, (big ? 0.03 : 0.006 + 0.012 * rand(key, born + 5)) * f.size, (big ? 0.35 : 0.85) * tuft.shake * (1 - a), rand(key, 9), dir, 1.6);
        } else {
          // Each foot of a runner throws a sheet back and up as it comes down.
          const out = (0.3 + 1.6 * rand(key, born + 40) * a) * f.size;
          const up = (0.4 + 1.3 * rand(key, born + 80)) * f.size;
          const back = dir * 0.4 - 0.2;
          const lag = RUN_SPEED * age * 0.8;
          splash.put(fig.x - fx * (lag + Math.cos(back) * out) + fz * Math.sin(back) * out, ground(fig.x, fig.z) + 0.05 + up * 2 * a * (1 - a), fig.z - fz * (lag + Math.cos(back) * out) - fx * Math.sin(back) * out, (big ? 0.12 + 0.1 * rand(key, born + 5) : 0.015 + 0.03 * rand(key, born + 5)) * f.size, (big ? 0.4 : 0.85) * (1 - a), rand(key, 9), dir);
        }
      }
    }
    splash.end();
  };

  const group = new THREE.Group();
  for (const figures of feederFigures) {
    group.add(figures.mesh);
    if (figures.mirror) group.add(figures.mirror);
  }
  group.add(colonyFigures.mesh, standers.mesh, flockFigures.mesh, skeinFigures.mesh);
  if (colonyFigures.shade) group.add(colonyFigures.shade);
  ctx.scene.add(ctx.parts.built('kite-wings', group, splash.mesh), splash.mesh);

  return {
    setTime: (seconds) => {
      const eye = eyeAt(seconds);
      for (let i = 0; i < feeders.length; i++) {
        const f = feeders[i] as Feeder;
        feederAt(f, seconds);
        feederFigures.forEach((figures, habit) => {
          if (habit === f.habit && tuft.here) figures.put(i, fig);
          else figures.hide(i);
        });
        rig.setDisc(discs, i, fig.x, fig.z, 1.1 * f.size, tuft.here ? 0.3 : 0);
      }
      for (const figures of feederFigures) figures.commit();
      splashAt(seconds);
      for (let i = 0; i < sitters.length; i++) {
        sitterAt(sitters[i] as Sitter, seconds);
        colonyFigures.put(i, fig);
      }
      colonyFigures.commit();
      for (let i = 0; i < fliers.length; i++) {
        const f = fliers[i] as Flier;
        if (f.size === 0) {
          flockFigures.hide(i);
          continue;
        }
        flierAt(f, seconds, eye);
        flockFigures.put(i, fig);
      }
      flockFigures.commit();
      for (let i = 0; i < skein.length; i++) {
        const s = skein[i] as Passer;
        const bout = smooth(0.25, 0.45, held(seconds, 3.4 + 2 * s.seed, s.seed, 0.3));
        const y = s.y + 1.2 * Math.sin(seconds * 0.6 + s.seed * 20);
        airborne(s.x + s.vx * (seconds - s.t), y, s.z + s.vz * (seconds - s.t), s.vx, 0.72 * Math.cos(seconds * 0.6 + s.seed * 20), s.vz, s.size, s.seed, seconds, i < SKEIN ? 0.25 + 0.75 * bout : 1, eye);
        skeinFigures.put(i, fig);
      }
      const lead = seconds - BORE;
      for (let i = 0; i < FLEEING; i++) {
        const side = (i - (FLEEING - 1) / 2) / FLEEING;
        // Low over the water before the wall, a wing's length over it, pale against the dark of the stacks and the green of the wall.
        const x = flee[0] + side * 42 - 14 * lead + 3 * Math.sin(i * 2.4);
        const z = flee[1] - 22 - (24 * ((i * 5) % 7)) / 7 + 12 * lead;
        const y = 2.4 + (2.6 * ((i * 3) % 4)) / 4 + 0.5 * lead + 0.4 * Math.sin(seconds * 1.3 + i);
        airborne(x, y, z, -14, 0.5, 12, 0.62 + 0.5 * hash(i, 5), hash(i, 7), seconds, 1, eye);
        skeinFigures.put(SKEIN + PASSERS + i, fig);
      }
      landers.forEach((l, i) => {
        const tau = seconds - l.t;
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
          fig.limbs[0] = (held(seconds, 1.6, l.seed) - 0.5) * 0.6;
          fig.limbs[1] = 0.25 * Math.sin(tau * 9) * Math.exp(-tau * 1.2);
          standers.put(i, fig);
          skeinFigures.hide(slot);
        }
        rig.setDisc(discs, feeders.length + i, l.at[0], l.at[1], 1.2 * l.size, 0.3 * smooth(-0.5, 0.2, tau));
      });
      skeinFigures.commit();
      standers.commit();
    },
    dispose: () => {
      for (const m of [...feederSheets, perchedSheet, airSheet]) {
        m.body.dispose();
        m.mirror.dispose();
        m.shade.dispose();
      }
      for (const figures of [...feederFigures, colonyFigures, standers, flockFigures, skeinFigures]) figures.dispose();
      splash.dispose();
    },
  };
}
