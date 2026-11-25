// The kite-wings: feeders wading the pools, the colony on the ledges of its rock, the flock round the rib tops, a skein coming in from the sea,
// the ones that land and lift off, and the ones that run from the bore. Every pose is a function of the time of the place alone.
import * as THREE from 'three';
import { resolve } from '../../../core/cameras';
import { partOfFrame, secondsInPlace, shotById, shotsOf } from '../../../film/cut';
import { shots } from '../cameras';
import { BORE, COLONY, LEVELS, RIBS, STATIONS, T0, UNIT, keySeconds } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { partAtHeight, ribByName, surface } from '../layout';
import { foamTexture } from '../sea/chop';
import { Spray, rand } from '../sea/spray';
import { RING_SOURCE, boreArrives } from '../sea/tide';
import type { Ring } from '../sea/tide';
import { FAR, Flock, NEAR, STAND, animalMaterial, blend, stand } from './animal';
import type { Pose } from './animal';

/** The kite-wing of the approved pictures stands twice a man at the back: every free animal is this much larger than the animal of size 1. */
const GROW = 1.35;

export const PARTS: readonly string[] = ['kite-wings'];

const FEEDERS = 44;
const FLIERS = 451;
const SPECKS = 560;
const PASSERS = 6;
/** The run of the hero by the establishing camera: seconds it lasts, centred on the key, and its mean speed. */
const RUN = { seconds: 9, speed: 3.7 };
const LOW = 110;
const FLEEING = 9;
const COLONISTS = 78;
const COLONY_NEAR = 78;
const SKEIN = 22;
const NECK = 1.5;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const ease = (x: number): number => x - Math.sin(2 * Math.PI * x) / (2 * Math.PI);
const hash = (a: number, b: number): number => {
  const s = Math.sin(a * 127.1 + b * 311.7 + 1.3) * 43758.5453;
  return s - Math.floor(s);
};
const turnTo = (from: number, to: number, k: number): number => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return from + d * k;
};
/** A value held, then changed: a new one every `every` seconds, moved to over `over` of the span. */
const held = (t: number, every: number, key: number, over = 0.22): number => {
  const u = t / every + key * 17.3;
  const n = Math.floor(u);
  return hash(n, key) + (hash(n + 1, key) - hash(n, key)) * smooth(1 - over, 1, u - n);
};

/** How high the tip of the neck stands over the hip, and how far ahead, for a pose (the vertex shader's own sum). */
function neckTip(p: Pose): [number, number] {
  const pitch = 0.32 + p.pitch;
  let y = Math.sin(pitch) * 0.36 + Math.cos(pitch) * 0.1;
  let z = Math.cos(pitch) * 0.36 - Math.sin(pitch) * 0.1;
  for (let i = 0; i < 8; i++) {
    const s = (i + 0.5) / 8;
    const th = p.rise + p.bend * (0.35 * s + 0.65 * s * s) + p.tuck * Math.cos(Math.PI * s);
    y += (Math.sin(th) * NECK) / 8;
    z += (Math.cos(th) * NECK) / 8;
  }
  return [y, z];
}

/** The flying pose: stroke `amp` at phase `ph`. */
function fly(p: Pose, amp: number, ph: number): Pose {
  p.pitch = -0.3;
  p.spread = 1;
  p.flap = 0.1 + amp * Math.sin(ph);
  p.lag = -0.45 * amp * Math.cos(ph);
  p.rise = 0.12;
  p.bend = 0.12;
  p.sweep = 0;
  p.tuck = 0.22;
  p.leftZ = -1.5;
  p.leftY = -0.14;
  p.rightZ = -1.52;
  p.rightY = -0.1;
  p.y += 0.1 * amp * Math.sin(ph - 1.3) * p.size;
  return p;
}

interface Feeder {
  x0: number;
  z0: number;
  yaw: number;
  size: number;
  stride: number;
  cycles: number;
  cycle: number;
  period: number;
  offset: number;
  seed: number;
  leave: number;
  away: number;
  /** What it does in its pauses: under 0.55 it feeds, under 0.75 it looks about, over that both. Under 0 it varies pause by pause. */
  habit: number;
  runs: boolean;
}

export function create(ctx: Context): Piece {
  const rig = ctx.rig;
  const scatter = ctx.rng('kite-wings');
  // What a foot stands on. Where the bed lies deep under a pool the water is murky and the wader keeps to what bears it a hand under the surface.
  const ground = (x: number, z: number): number => Math.max(rig.land.height(x, z), LEVELS.pool - 0.2);
  const material = animalMaterial(ctx, LEVELS.pool);

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

  // ---- Feeders ----
  const feeders: Feeder[] = [];
  const gait = (f: Feeder, t: number): number => {
    if (f.runs) return f.cycles * smooth(T0 - RUN.seconds / 2, T0 + RUN.seconds / 2, t);
    const u = (t + f.offset) / f.period;
    const m = Math.floor(u);
    const tau = (u - m) * f.period;
    const walk = f.cycles * f.cycle;
    return (m + (tau < walk ? ease(tau / walk) : 1)) * f.cycles;
  };
  const addFeeder = (x: number, z: number, yaw: number, small: number, stationed: boolean, habit = -1, at = T0, runs = false): void => {
    const size = small * GROW;
    const f: Feeder = {
      x0: x,
      z0: z,
      yaw,
      size,
      stride: scatter.range(0.75, 0.95) * size,
      cycles: stationed ? 1 : 1 + scatter.int(3),
      cycle: scatter.range(1.5, 2.1),
      period: scatter.range(10, 17),
      offset: scatter.range(0, 40),
      seed: scatter.next(),
      leave: boreArrives(z) - scatter.range(5, 13),
      away: scatter.range(-0.5, 0.5),
      habit,
      runs,
    };
    if (runs) {
      f.stride = 1.5 * size;
      f.cycles = (RUN.speed * RUN.seconds) / f.stride;
    }
    // A stationed feeder is at its station on the establishing key, in the middle of a pause.
    if (stationed) f.offset = f.period * (0.45 + 0.35 * f.seed) - at;
    const p = gait(f, at);
    f.x0 = x - Math.sin(yaw) * f.stride * p;
    f.z0 = z - Math.cos(yaw) * f.stride * p;
    feeders.push(f);
  };
  // The stations: the eight of the wide picture stand tall more than they feed, and the nearest runs with its sails half up;
  // the three before the feeding camera are at their stations on that key, the nearest with its tuft in the water.
  const HABITS = [0.6, 0.62, 0.9, 0.64, 0.66, 0.3, 0.68, 0.9];
  const feedKey = keySeconds('ribs-2');
  STATIONS.feeders.forEach((s, i) => {
    if (i === 0) addFeeder(s[0], s[1], Math.atan2(Math.cos(0.14), Math.sin(0.14)) + 0.25, s[3], true, 0.6, T0, true);
    else if (i < 8) addFeeder(s[0], s[1], s[2], s[3], true, HABITS[i] as number, T0);
    else addFeeder(s[0], s[1], s[2], s[3], true, i === 8 ? 0.3 : i === 9 ? 0.9 : 0.6, feedKey);
  });
  {
    // The second hero of the wide picture: walking tall, right of centre, 47 m out.
    const from = STATIONS.establish;
    const bearing = (24 * Math.PI) / 180;
    addFeeder(from[0] + Math.sin(bearing) * 47, from[1] - Math.cos(bearing) * 47, -1.9, 1.12, true, 0.6, T0);
  }
  for (let tries = 0; feeders.length < FEEDERS && tries < 4000; tries++) {
    const x = scatter.range(-200, 300);
    const z = scatter.range(-1250, 90);
    const yaw = scatter.range(0, Math.PI * 2);
    const h = ground(x, z);
    if (nearTrack(x, z, 30) || h < 0.7 || h > 1.5 || Math.abs(ground(x + Math.sin(yaw) * 6, z + Math.cos(yaw) * 6) - h) > 0.5) continue;
    addFeeder(x, z, yaw, scatter.range(0.95, 1.2), false);
  }
  const feederFlock = new Flock(NEAR, material, feeders.length);
  const discs = rig.contactDiscs(feeders.length + 4);
  const runner = feeders.findIndex((f) => f.runs);

  const pose = stand();
  const foot = [0, 0, 0, 0, 0, 0];
  const stance = [0, 0];
  let feeding = 0;
  let tuftX = 0;
  let tuftZ = 0;

  /** One feeder at t: its pose into `pose`, its feet (x, z, wet) into `foot`, how far it is feeding and where its tuft meets the water. */
  const feederAt = (f: Feeder, t: number): void => {
    const tg = Math.min(t, f.leave);
    const fx = Math.sin(f.yaw);
    const fz = Math.cos(f.yaw);
    const p = gait(f, tg);
    const bx = f.x0 + fx * f.stride * p;
    const bz = f.z0 + fz * f.stride * p;
    const u = (tg + f.offset) / f.period;
    const m = Math.floor(u);
    const tau = (u - m) * f.period;
    const walk = f.cycles * f.cycle;
    const q = (tau - walk) / (f.period - walk);
    const kind = f.habit >= 0 ? f.habit : hash(m, f.seed * 91);
    const ru = clamp01((tg - T0) / RUN.seconds + 0.5);
    const run = f.runs ? Math.min(1, 6 * ru * (1 - ru)) : 0;
    const going = f.runs ? run : 1 - smooth(walk - 0.3, walk + 0.5, tau) + smooth(f.period - 0.6, f.period, tau);
    let feed = 0;
    let alert = 0;
    if (f.runs) alert = 0.7 * (1 - run);
    else if (q > 0) {
      if (kind < 0.55) feed = smooth(0.06, 0.24, q) * (1 - smooth(0.74, 0.92, q));
      else if (kind < 0.75) alert = smooth(0.05, 0.16, q) * (1 - smooth(0.7, 0.9, q));
      else {
        feed = smooth(0.05, 0.2, q) * (1 - smooth(0.42, 0.52, q));
        alert = smooth(0.52, 0.6, q) * (1 - smooth(0.8, 0.93, q));
      }
    }
    Object.assign(pose, stand(f.seed));
    pose.size = f.size;
    pose.yaw = f.yaw;
    // Walking: the neck leads, the head nods with the stride.
    blend(pose, { rise: 1.05, bend: -0.25 + 0.12 * Math.sin(p * Math.PI * 4), tuck: 0.34, pitch: -0.06 }, going);
    const dip = 0.035 * Math.cos(p * Math.PI * 4) * going + 0.05 * smooth(f.period - 0.7, f.period - 0.1, tau);
    let hip = STAND - 0.05 - dip;
    if (feed > 0) {
      // Reach for the water: tip the body, lower the hip, and bend the neck until the tuft trails in the pool.
      const reach: Pose = { ...pose, pitch: -0.34, rise: -0.6, tuck: 0.0, bend: -0.6 };
      const want = (LEVELS.pool - ground(bx, bz)) / f.size - (hip - 0.07) + 0.5;
      let lo = -1.7;
      let hi = 0.5;
      for (let i = 0; i < 12; i++) {
        reach.bend = (lo + hi) / 2;
        if (neckTip(reach)[0] > want) hi = reach.bend;
        else lo = reach.bend;
      }
      reach.bend += 0.05 * Math.sin(t * 2.3 + f.seed * 30);
      blend(pose, { pitch: reach.pitch, rise: reach.rise, tuck: reach.tuck, bend: reach.bend, sweep: 0.55 * Math.sin(t * 0.8 + f.seed * 50) }, feed);
      hip -= 0.07 * feed;
    }
    // Running: body forward, sails half up and working, the stride long and high.
    if (run > 0) blend(pose, { spread: 0.5, flap: 0.42 + 0.16 * Math.sin(p * Math.PI * 2 + 0.6), pitch: -0.24, rise: 0.82, bend: -0.1, tuck: 0.36, lag: -0.1 * Math.cos(p * Math.PI * 2 + 0.6) }, run);
    if (alert > 0) blend(pose, { rise: 1.46, bend: -0.12, tuck: 0.12, pitch: 0.06, sweep: (held(t, 1.9, f.seed) - 0.5) * 2.2 }, alert);
    feeding = feed;
    const tip = neckTip(pose);
    tuftX = bx + fx * (tip[1] + 0.2) * f.size;
    tuftZ = bz + fz * (tip[1] + 0.2) * f.size;
    const bed = ground(bx, bz);
    pose.x = bx;
    pose.z = bz;
    pose.y = bed + hip * f.size;
    for (let k = 0; k < 2; k++) {
      const pk = p + 0.5 * k;
      const fr = pk - Math.floor(pk);
      let rel = 0.3 - fr;
      let lift = 0;
      if (fr >= 0.6) {
        const e = (fr - 0.6) / 0.4;
        rel = -0.3 + 0.6 * (e * e * (3 - 2 * e));
        lift = (0.24 + 0.3 * run) * Math.sin(Math.PI * e);
      }
      const side = (k === 0 ? -1 : 1) * 0.13 * f.size;
      const wx = bx + fx * f.stride * rel + Math.cos(f.yaw) * side;
      const wz = bz + fz * f.stride * rel - Math.sin(f.yaw) * side;
      const under = ground(wx, wz);
      const relY = (under + lift * f.size - pose.y) / f.size;
      const relZ = (f.stride * rel) / f.size;
      if (k === 0) {
        pose.leftZ = relZ;
        pose.leftY = relY;
      } else {
        pose.rightZ = relZ;
        pose.rightY = relY;
      }
      foot[k * 3] = wx;
      foot[k * 3 + 1] = wz;
      foot[k * 3 + 2] = under < LEVELS.pool - 0.01 && lift < 0.05 ? 1 : 0;
      stance[k] = fr < 0.6 ? fr / 0.6 : -1;
    }
    // The bore is coming: crouch, throw the sails open, go.
    const tl = t - f.leave;
    if (tl > -0.6) {
      const crouch = smooth(-0.6, -0.05, tl) * (1 - smooth(0, 0.35, tl));
      pose.y -= 0.28 * crouch * f.size;
      pose.leftY += 0.28 * crouch;
      pose.rightY += 0.28 * crouch;
      blend(pose, { spread: 0.45, flap: 0.5, pitch: -0.25, rise: 0.9 }, smooth(-0.6, 0, tl));
      if (tl > 0) {
        const run = Math.min(tl, 2);
        const dist = 3 * run * run + (tl > 2 ? 12 * (tl - 2) : 0);
        const turn = smooth(0, 3, tl);
        const yaw = turnTo(f.yaw, f.away, turn);
        const high = Math.min(60, 2.4 * tl * (1 + 0.2 * tl));
        const air = smooth(0, 0.7, tl);
        const rate = 17 - 6 * smooth(0.5, 4, tl);
        const flown: Pose = fly({ ...pose, y: pose.y }, 0.78 - 0.25 * smooth(1, 5, tl), tl * rate + f.seed * 6);
        blend(pose, flown, air);
        pose.pitch = -0.3 + 0.45 * (1 - smooth(0, 2.5, tl));
        pose.x = bx + (Math.sin(f.yaw) * (1 - turn) + Math.sin(f.away) * turn) * dist;
        pose.z = bz + (Math.cos(f.yaw) * (1 - turn) + Math.cos(f.away) * turn) * dist;
        pose.y = bed + hip * f.size + high + 0.1 * Math.sin(tl * rate + f.seed * 6 - 1.3);
        pose.yaw = yaw;
        foot[2] = 0;
        foot[5] = 0;
        feeding = 0;
      }
    }
  };

  // The pools ring the legs of the feeders nearest the feeding camera.
  const feedShot = shotById('ribs-04');
  const feedEye = resolve(shots['ribs-04'] as (typeof shots)[string], 0.5, feedShot.first).position;
  const ringed = feeders
    .map((f, i) => ({ i, d: Math.hypot(f.x0 - feedEye[0], f.z0 - feedEye[2] + 20) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 8)
    .map((e) => e.i);
  RING_SOURCE.at = (seconds: number, out: Ring[]): void => {
    let n = 0;
    for (const i of ringed) {
      const f = feeders[i] as Feeder;
      feederAt(f, seconds);
      for (let k = 0; k < 2; k++) {
        const ring = out[n++];
        if (ring) Object.assign(ring, { x: foot[k * 3], z: foot[k * 3 + 1], phase: f.seed * 20 + k * 2.1, strength: (foot[k * 3 + 2] as number) * 0.7, stand: [foot[k * 3], foot[k * 3 + 1], pose.y - LEVELS.pool, 0.05 * f.size] });
      }
      const ring = out[n++];
      if (ring) Object.assign(ring, { x: tuftX, z: tuftZ, phase: f.seed * 31, strength: feeding, stand: [pose.x + Math.sin(f.yaw) * 0.1 * f.size, pose.z + Math.cos(f.yaw) * 0.1 * f.size, pose.y - LEVELS.pool + 0.12 * f.size, -0.42 * f.size] });
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
      tier = Math.floor(scatter.range(LEVELS.tide + 2, COLONY.top - 6) / COLONY.step) * COLONY.step;
      a0 = sitters.length < COLONISTS * 0.75 ? scatter.range(0, Math.PI * 2) : facing + scatter.normal() * 0.8;
      if (sitters.length >= COLONISTS * 0.75) break;
      const r0 = COLONY.radiusAt(tier + COLONY.step) + 1;
      seen.set(COLONY.x + Math.cos(a0) * r0, tier + 1.5, COLONY.z + Math.sin(a0) * r0);
      const toward = (colonyEye[0] - seen.x) * Math.cos(a0) + (colonyEye[2] - seen.z) * Math.sin(a0);
      const far = Math.hypot(colonyEye[0] - seen.x, colonyEye[2] - seen.z);
      seen.project(colonyLens);
      if (toward > 0.2 * far && Math.abs(seen.x) < 0.92 && seen.y > -0.9 && seen.y < 0.8 && seen.z < 1) break;
    }
    const knot = 2 + scatter.int(4);
    let along = 0;
    for (let k = 0; k < knot && sitters.length < COLONISTS; k++) {
      const size = scatter.range(1.05, 1.4) * GROW;
      const r = COLONY.radiusAt(tier + COLONY.step) + scatter.range(0.7, COLONY.step * COLONY.slope - 0.5);
      const a = a0 + along / r;
      along += scatter.range(1.5, 2.6) * size;
      const x = COLONY.x + Math.cos(a) * r;
      const z = COLONY.z + Math.sin(a) * r;
      const out = Math.atan2(Math.cos(a), Math.sin(a));
      sitters.push({ x, y: tier, z, yaw: out + scatter.range(-1.1, 1.1), size, seed: scatter.next(), stands: scatter.next() < 0.22, d: Math.hypot(x - colonyEye[0], tier - colonyEye[1], z - colonyEye[2]) });
    }
  }
  sitters.sort((a, b) => a.d - b.d);
  const colonyNear = new Flock(NEAR, material, COLONY_NEAR);
  const colonyFar = new Flock(FAR, material, COLONISTS - COLONY_NEAR);
  const sitterAt = (s: Sitter, t: number): void => {
    Object.assign(pose, stand(s.seed));
    pose.size = s.size;
    pose.yaw = s.yaw;
    const up = s.stands ? 1 : smooth(0.86, 0.97, held(t, 7 + 6 * s.seed, s.seed + 0.5, 0.3));
    const hip = 0.36 + (STAND - 0.42) * up;
    pose.x = s.x;
    pose.z = s.z;
    pose.y = s.y + hip * s.size;
    pose.leftZ = 0.14 * (1 - up);
    pose.rightZ = 0.1 * (1 - up) - 0.05 * up;
    pose.leftY = -hip;
    pose.rightY = -hip;
    pose.pitch = -0.16 * (1 - up);
    const look = held(t, 2.1 + 2.5 * s.seed, s.seed);
    const high = held(t, 5.3 + 3 * s.seed, s.seed + 0.25, 0.15);
    pose.sweep = (look - 0.5) * 2.4;
    // Hunched under its sails with the tuft hanging, until it looks up.
    pose.rise = 1.15 + 0.35 * high;
    pose.tuck = 0.45 - 0.3 * high;
    pose.bend = -2.5 + 2.3 * high;
    // Now and then one opens its sails and shakes them.
    const shake = smooth(0.9, 0.97, held(t, 4.5, s.seed + 0.75, 0.25));
    // Perched, the sails hang round it as a tent; one that stands holds them half open to the wind and the light comes through.
    if (s.stands) {
      pose.spread = 0.6 + 0.2 * Math.sin(t * 0.7 + s.seed * 40);
      pose.flap = 0.3 + 0.12 * Math.sin(t * 1.9 + s.seed * 17);
    } else {
      pose.spread = 2 - shake;
      pose.flap = -1.0 + 0.04 * Math.sin(t * 1.3 + s.seed * 30) + shake * (1.2 + 0.35 * Math.sin(t * 15 + s.seed * 9));
    }
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
  }
  const homes = ['R1', 'R1', 'R1', 'R2', 'L2', 'L1', 'L3', 'R3', 'OL', 'OR'];
  const fliers: Flier[] = [];
  const flierPlace = (f: Flier, t: number, out: Pose): void => {
    const a = f.phase + f.rate * t;
    out.x = f.cx + Math.cos(a) * f.radius;
    out.y = f.y + 9 * Math.sin(a * 2.3 + f.phase);
    out.z = f.cz + Math.sin(a) * f.radius * f.squash;
    const way = Math.sign(f.rate);
    out.yaw = Math.atan2(-Math.sin(a) * way, Math.cos(a) * f.squash * way);
    out.roll = -way * 0.32;
  };
  for (let i = 0; i < FLIERS + SPECKS; i++) {
    const rib = ribByName(homes[scatter.int(homes.length)] as string);
    const low = i < LOW;
    if (i >= FLIERS) {
      // The specks: the crowd that wheels tight round the head of every blade, and thickest over the colony.
      const colony = scatter.next() < 0.45;
      const top = RIBS[scatter.int(RIBS.length)] as (typeof RIBS)[number];
      // Round the head of the blade itself: the blade's own middle line, near its top.
      const high = top.height * (1 - 0.3 * scatter.next() ** 2);
      const head = surface(top, partAtHeight(top, high), 0, 0, 0);
      const radius = colony ? scatter.range(30, 120) * (0.4 + 0.6 * scatter.next()) : 12 + 90 * scatter.next() ** 2;
      fliers.push({
        cx: colony ? COLONY.x + scatter.range(-20, 20) : head.x + scatter.range(-12, 12),
        cz: colony ? COLONY.z + scatter.range(-20, 20) : head.z + scatter.range(-12, 12),
        radius,
        y: colony ? scatter.range(LEVELS.tide + 20, COLONY.top + 50) : high + scatter.range(-25, 35),
        rate: ((scatter.next() < 0.5 ? 1 : -1) * scatter.range(11, 17)) / radius,
        phase: scatter.range(0, Math.PI * 2),
        squash: scatter.range(0.55, 1),
        size: scatter.range(0.9, 1.2) * GROW,
        seed: scatter.next(),
      });
      continue;
    }
    const radius = low ? scatter.range(78, 130) : 50 + 190 * scatter.next() ** 2;
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
    };
    // Keep clear of every lens.
    for (let tries = 0; tries < 12; tries++) {
      const hit = eyes.some((e) => {
        flierPlace(f, e.t, pose);
        return Math.hypot(pose.x - e.at[0], pose.y - e.at[1], pose.z - e.at[2]) < 7;
      });
      if (!hit) break;
      f.phase += 0.7;
    }
    fliers.push(f);
  }
  const lowFlock = new Flock(NEAR, material, LOW);
  const highFlock = new Flock(FAR, material, FLIERS + SPECKS - LOW);
  const flierAt = (f: Flier, t: number): void => {
    Object.assign(pose, stand(f.seed));
    pose.size = f.size;
    flierPlace(f, t, pose);
    // Strokes in bouts, glides between.
    const bout = smooth(0.3, 0.5, held(t, 3.1 + 2 * f.seed, f.seed, 0.3));
    fly(pose, 0.12 + 0.5 * bout, t * (10.5 + 3 * f.seed) + f.seed * 40);
    pose.sweep = (held(t, 2.7, f.seed + 0.4) - 0.5) * 0.7;
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
    const side = (scatter.next() < 0.5 ? -1 : 1) * scatter.range(9, 46);
    const speed = scatter.range(12, 16);
    skein.push({
      x: eye.position[0] + (-dz / l) * side,
      y: Math.max(4.5, eye.position[1] + scatter.range(-2, 13)),
      z: eye.position[2] + (dx / l) * side,
      vx: (dx / l) * speed,
      vz: (dz / l) * speed,
      t: secondsInPlace(UNIT, frame),
      size: scatter.range(0.95, 1.2) * GROW,
      seed: scatter.next(),
    });
  }
  // And the ones that cross close before the colony camera: large in its picture at the key, and one more before and after.
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
    const cross: [number, number, number, number, number][] = [[17, -6, 5.5, 0, 12], [29, 4, 10, 0.2, -13], [44, -16, 14, -0.4, 14], [23, 0, 7, 1.5, -12], [36, -6, 12, -1.3, 13], [58, -24, 20, 0.6, 15]];
    for (let i = 0; i < PASSERS; i++) {
      const c = cross[i] as [number, number, number, number, number];
      skein.push({ x: eye.position[0] + fx * c[0] - fz * c[1], y: eye.position[1] + c[2], z: eye.position[2] + fz * c[0] + fx * c[1], vx: -fz * c[4] + fx * 2.5, vz: fx * c[4] + fz * 2.5, t: key + c[3], size: 1.1 * GROW, seed: scatter.next() });
    }
  }
  const skeinFlock = new Flock(NEAR, material, SKEIN + PASSERS);

  // ---- The ones that run from the bore ----
  const fleeFlock = new Flock(NEAR, material, FLEEING);
  const flee = STATIONS.flee;

  // ---- One that lands by the establishing camera, on the key ----
  const landFlock = new Flock(NEAR, material, 4);
  interface Lander {
    x: number;
    z: number;
    y: number | null;
    yaw: number;
    t: number;
    size: number;
    seed: number;
  }
  const est = resolve(shots['ribs-02'] as (typeof shots)[string], 0.5, shotById('ribs-02').first);
  const ex = est.aim[0] - est.position[0];
  const ez = est.aim[2] - est.position[2];
  const el = Math.hypot(ex, ez) || 1;
  const ahead = (d: number, right: number): [number, number] => [est.position[0] + (ex / el) * d + (-ez / el) * right, est.position[2] + (ez / el) * d + (ex / el) * right];
  const landers: Lander[] = [];
  {
    const a = ahead(34, 15);
    landers.push({ x: a[0], z: a[1], y: null, yaw: Math.atan2(-ez / el, ex / el) + 0.5, t: T0 + 0.42, size: 1.12 * GROW, seed: 0.37 });
    const b = ahead(120, -22);
    landers.push({ x: b[0], z: b[1], y: null, yaw: 2.2, t: T0 - 2.1, size: 1.05 * GROW, seed: 0.81 });
  }
  // Two come in to the ledges past the colony camera.
  for (let k = 0; k < 2; k++) {
    const s = sitters[6 + k * 9] as Sitter;
    landers.push({ x: s.x, z: s.z, y: s.y, yaw: s.yaw + Math.PI * 0.6, t: secondsInPlace(UNIT, shotById('ribs-03').first) + 1.3 + k * 1.2, size: 1.08 * GROW, seed: 0.2 + 0.5 * k });
    s.size = 0;
  }
  const landerAt = (l: Lander, t: number): void => {
    Object.assign(pose, stand(l.seed));
    pose.size = l.size;
    pose.yaw = l.yaw;
    const bed = l.y ?? ground(l.x, l.z);
    const tau = t - l.t;
    const low = STAND * 0.88;
    if (tau < 0) {
      const b = -tau;
      const dist = b < 2 ? b * (1.2 + 2.95 * b) : 14.2 + 13 * (b - 2);
      const high = 0.2 * dist + 0.3 * (1 - Math.exp(-b * 3));
      pose.x = l.x - Math.sin(l.yaw) * dist;
      pose.z = l.z - Math.cos(l.yaw) * dist;
      pose.y = bed + low * l.size + high;
      const flare = smooth(1.5, 0.15, b);
      fly(pose, 0.45 + 0.35 * flare, t * (11 + 7 * flare) + l.seed * 9);
      blend(pose, { pitch: 0.5, leftZ: 0.3, rightZ: 0.12, leftY: -low, rightY: -low, rise: 0.95, bend: -0.5, tuck: 0.3 }, flare);
    } else {
      const hip = STAND * (1 - 0.12 * Math.exp(-tau * 3) * Math.cos(tau * 5.5));
      pose.x = l.x;
      pose.z = l.z;
      pose.y = bed + hip * l.size;
      pose.leftZ = 0.3 * (1 - smooth(0, 1.2, tau)) + 0.06;
      pose.rightZ = 0.12 * (1 - smooth(0, 1.2, tau)) - 0.08;
      pose.leftY = -hip;
      pose.rightY = -hip;
      const shut = smooth(0.35, 1.7, tau);
      pose.spread = 1 - shut;
      pose.flap = 0.55 + (-1.25 - 0.55) * shut + 0.2 * Math.sin(tau * 14) * (1 - shut);
      pose.pitch = 0.5 * (1 - smooth(0, 0.9, tau));
      pose.rise = 0.95 + 0.4 * smooth(0, 1, tau);
      pose.bend = -0.5 + 0.3 * smooth(0, 1, tau);
      pose.sweep = (held(t, 1.6, l.seed) - 0.5) * 1.6 * smooth(0.6, 1.6, tau);
    }
  };

  // Thrown water where a tuft works the pool and where the runner's feet come down.
  const SPLASH = 90;
  const splash = new Spray((ringed.length + 2) * SPLASH + 80, { ...rig.uniforms, tFoam: { value: foamTexture(ctx.rng('kite-wings-splash')) } });
  const wet = [...new Set([...ringed, feeders.length - 1])];
  const splashAt = (seconds: number): void => {
    splash.begin();
    for (const i of wet) {
      const f = feeders[i] as Feeder;
      feederAt(f, seconds);
      if (feeding < 0.3) continue;
      for (let n = 0; n < SPLASH; n++) {
        const every = 0.55 + 0.5 * rand(i * 31 + n, 1);
        const u = seconds / every + rand(i * 31 + n, 2);
        const born = Math.floor(u);
        const a = u - born;
        const dir = rand(i * 31 + n, born) * Math.PI * 2;
        const out = (0.12 + 0.5 * rand(i * 31 + n, born + 7) * a) * f.size;
        const up = (0.35 + 0.75 * rand(i * 31 + n, born + 3)) * f.size;
        splash.put(tuftX + Math.cos(dir) * out, LEVELS.pool + 0.04 + up * 4 * a * (1 - a) * 0.5, tuftZ + Math.sin(dir) * out, n % 5 === 0 ? (0.07 + 0.05 * rand(i * 31 + n, born + 5)) * f.size : (0.007 + 0.011 * rand(i * 31 + n, born + 5)) * f.size, (n % 5 === 0 ? 0.55 : 1.6) * (feeding - 0.3) * (1 - a * a), rand(i * 31 + n, born + 9), n % 5 === 0 ? 0 : dir, n % 5 === 0 ? 0.45 : 1.8);
      }
    }
    if (runner >= 0) {
      const f = feeders[runner] as Feeder;
      feederAt(f, seconds);
      const ru = clamp01((seconds - T0) / RUN.seconds + 0.5);
      const run = Math.min(1, 6 * ru * (1 - ru));
      for (let k = 0; k < 2; k++) {
        const a = stance[k] as number;
        if (a < 0 || run < 0.2) continue;
        const stride = Math.floor(gait(f, seconds) + 0.5 * k);
        for (let n = 0; n < 40; n++) {
          const dir = f.yaw + Math.PI + (rand(stride * 2 + k, n) - 0.5) * 2.6;
          const out = (0.2 + 1.5 * rand(stride * 2 + k, n + 40) * a) * f.size;
          const up = (0.3 + 1.1 * rand(stride * 2 + k, n + 80)) * f.size;
          splash.put((foot[k * 3] as number) + Math.sin(dir) * out, ground(foot[k * 3] as number, foot[k * 3 + 1] as number) + 0.05 + up * 2 * a * (1 - a), (foot[k * 3 + 1] as number) + Math.cos(dir) * out, (n % 5 === 0 ? 0.1 + 0.1 * rand(stride * 2 + k, n + 120) : 0.015 + 0.03 * rand(stride * 2 + k, n + 120)) * f.size * (0.6 + a), (n % 5 === 0 ? 0.5 : 1.5) * run * (1 - a), rand(stride * 2 + k, n + 160), dir, 1.4);
        }
      }
    }
    splash.end();
  };

  const group = new THREE.Group();
  group.add(feederFlock.mesh, colonyNear.mesh, colonyFar.mesh, lowFlock.mesh, highFlock.mesh, skeinFlock.mesh, fleeFlock.mesh, landFlock.mesh);
  ctx.scene.add(ctx.parts.built('kite-wings', group, splash.mesh), splash.mesh);

  return {
    setTime: (seconds) => {
      for (let i = 0; i < feeders.length; i++) {
        const f = feeders[i] as Feeder;
        feederAt(f, seconds);
        feederFlock.put(i, pose);
        const down = seconds < f.leave ? 1 : 1 - smooth(0, 1.5, seconds - f.leave);
        rig.setDisc(discs, i, pose.x, pose.z, 1.1 * f.size, 0.3 * down);
      }
      feederFlock.commit();
      splashAt(seconds);
      for (let i = 0; i < sitters.length; i++) {
        const s = sitters[i] as Sitter;
        const flock = i < COLONY_NEAR ? colonyNear : colonyFar;
        const at = i < COLONY_NEAR ? i : i - COLONY_NEAR;
        if (s.size === 0) {
          flock.hide(at);
          continue;
        }
        sitterAt(s, seconds);
        flock.put(at, pose);
      }
      colonyNear.commit();
      colonyFar.commit();
      for (let i = 0; i < fliers.length; i++) {
        flierAt(fliers[i] as Flier, seconds);
        if (i < LOW) lowFlock.put(i, pose);
        else highFlock.put(i - LOW, pose);
      }
      lowFlock.commit();
      highFlock.commit();
      for (let i = 0; i < skein.length; i++) {
        const s = skein[i] as Passer;
        Object.assign(pose, stand(s.seed));
        pose.size = s.size;
        pose.x = s.x + s.vx * (seconds - s.t);
        pose.z = s.z + s.vz * (seconds - s.t);
        pose.y = s.y + 1.2 * Math.sin(seconds * 0.6 + s.seed * 20);
        pose.yaw = Math.atan2(s.vx, s.vz);
        pose.roll = 0.12 * Math.sin(seconds * 0.5 + s.seed * 11);
        const bout = smooth(0.25, 0.45, held(seconds, 3.4 + 2 * s.seed, s.seed, 0.3));
        fly(pose, 0.14 + 0.5 * bout, seconds * (10 + 3 * s.seed) + s.seed * 40);
        pose.sweep = (held(seconds, 2.3, s.seed + 0.4) - 0.5) * 0.8;
        skeinFlock.put(i, pose);
      }
      skeinFlock.commit();
      const lead = seconds - BORE;
      for (let i = 0; i < FLEEING; i++) {
        const side = (i - (FLEEING - 1) / 2) / FLEEING;
        Object.assign(pose, stand(hash(i, 3)));
        pose.size = 1.25 * GROW;
        pose.x = flee[0] + side * 44 - 9 * lead + 3 * Math.sin(i * 2.4);
        pose.z = flee[1] - (16 * ((i * 5) % 7)) / 7 + 17 * lead;
        pose.y = 2.9 + (2.4 * ((i * 3) % 4)) / 4 + 0.5 * lead + 0.4 * Math.sin(seconds * 1.3 + i);
        pose.yaw = Math.atan2(-9, 17);
        pose.roll = 0.2 * Math.sin(seconds * 1.1 + i * 1.7);
        fly(pose, 0.7, seconds * (14 + 2.5 * hash(i, 7)) + i * 1.9);
        fleeFlock.put(i, pose);
      }
      fleeFlock.commit();
      for (let i = 0; i < landers.length; i++) {
        const l = landers[i] as Lander;
        landerAt(l, seconds);
        landFlock.put(i, pose);
        rig.setDisc(discs, feeders.length + i, pose.x, pose.z, 1.2 * l.size, seconds > l.t - 0.5 && l.y === null ? 0.3 * smooth(-0.5, 0.2, seconds - l.t) : 0);
      }
      landFlock.commit();
    },
    dispose: () => {
      material.dispose();
    },
  };
}
