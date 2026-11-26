// The herd: who each wader is and what it does. Where they stand is the lead's (shared/anchors.ts).
import type { Rng } from '../../../core/rng';
import { FAR_FLOCK, FEED_AT, NEAR_WADERS, RIM_WADER, RIM_WADER_DOWN_FROM, keySeconds, type Wader as Anchor } from '../shared/anchors';
import { makeBuild, type Build, type Plan } from './animal';

const RAD = Math.PI / 180;
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
/** Staged: in the view of the rim the live one has its neck down over the dead one, as the picture has it, and a second after that picture it
 *  begins to lift it and looks out over the shaft. */
const RIM_LIFTS = keySeconds('breath-2') + 0.9;
/** A feeding walk: a stride in three to four seconds. */
const PACE = 0.62;
/** Staged: where in its stride the middle one of the three in the channel is at 17.0 s: the hind leg on the camera's side lifted and trailing, as the picture has it. */
const STRIDE_AT = 0.585;

/** What each of the near ones is doing: metres a second (0 stands), how often it stops between two footfalls, how it carries its neck when it is up
 *  (0 a low S, 1 tall, 2 low and forward), which leg it stands with drawn up (0 none), how far ahead of its chest it feeds. No two alike. */
const WAYS: [number, number, number, number, number][] = [
  [0.3, 0.22, 0.3, 0, 0.62],
  [0.33, 0.12, 0, 0, 0.55],
  [0.24, 0.3, 1.6, 0, 0.42],
  [0.36, 0.18, 2, 0, 0.7],
  [0, 0, 1, 3, 0.5],
  [0.21, 0.45, 0.6, 0, 0.36],
  [0.38, 0.1, 1.8, 0, 0.66],
  [0.29, 0.28, 1, 0, 0.5],
  [0, 0, 1.3, 0, 0.74],
  [0, 0, 0.8, 1, 0.55],
];

/** Staged: more of them out on the flats to the west of the channel, strung out in a loose line with a young one at heel and one apart, as the wide
 *  picture has them. They are placed clear of the lens of the view in the channel. x, z, heading, size, speed, carry, drawn-up leg. */
const MORE: [number, number, number, number, number, number, number][] = [
  [-70, -52, 95, 0.72, 0.27, 0.4, 0],
  [-76.5, -62, 112, 1.02, 0.31, 2, 0],
  [-79.2, -63.6, 104, 0.66, 0.34, 0.2, 0],
  [-86, -84, 40, 0.94, 0, 1, 1],
  [-97, -70, -32, 1.0, 0.25, 1.5, 0],
  [-66, -95, 160, 0.86, 0, 0.5, 0],
];
const MORE_UP: [number, number][][] = [[[3.4, 6.1], [16, 20]], [[-5, 2.8], [11, 14]], [[7, 9.6]], [[-5, 30]], [[-5, 4.4], [15, 30]], [[5.2, 8]]];

/** The three seen close in the channel are three animals: a deep-chested old one, a sway-backed one, a small one with a drawn-up belly. */
const OWN: Partial<Build>[] = [
  { chest: 1.14, belly: 0.85, sway: 0.5, gaunt: 1.1 },
  { chest: 0.98, belly: 1.2, sway: -0.9, gaunt: 1.15 },
  { chest: 0.9, belly: 1.3, sway: 0.2, gaunt: 0.95 },
];

export interface Member {
  build: Build;
  plan: Plan;
  /** In the water of the channel: it gets rings round its legs and a reflection. */
  near: boolean;
}

/** When each of the near ones carries its neck up, seconds of the place. The picture of them feeding (17.0 s) has the middle one up and
 *  dripping and the two beside it down; the wide view (3.1 s) has one of seven with its neck straight up. Something lifts or goes down in every shot. */
const UP: [number, number][][] = [
  [[1.5, 5.5], [20.4, 30]],
  [[-5, 1.2], [8.4, 11.0], [15.35, 30]],
  [[4.2, 7.6], [13.3, 15.7], [18.3, 30]],
  [[-5, 2.6], [9, 13.5]],
  [[-5, 4.6], [12, 16.5]],
  [[6, 9.5], [19, 30]],
  [[-5, 6.8]],
  [[-5, 2.4], [10, 15], [21, 30]],
  [[13, 18]],
  [[-5, 14.4]],
];

function planOf(a: Anchor, up: [number, number][], rng: Rng, slack = 0, reach = 1): Plan {
  return {
    x: a.x,
    z: a.z,
    heading: a.heading * RAD,
    when: FEED_AT,
    speed: a.speed,
    fits: rng.range(0.72, 0.92),
    fitPeriod: rng.range(5.5, 9.5),
    up,
    habit: rng.range(4.5, 8),
    phase: rng.next(),
    slack,
    reach,
  };
}

export function makeHerd(rng: Rng): Member[] {
  const herd: Member[] = [];
  NEAR_WADERS.forEach((a, i) => {
    const way = WAYS[i] as [number, number, number, number, number];
    const plan: Plan = { ...planOf(a, UP[i] ?? [], rng), speed: way[0] * PACE, pauses: way[1], pauseMax: 2.6, carry: way[2], tuck: way[3], feedAt: way[4] };
    if (i === 1) plan.strideAt = STRIDE_AT;
    // Staged: the one on the bank stands clear of the lens of the view in the channel, which drifts toward it.
    if (i === 9) {
      plan.x += 2.4;
      plan.z += 0.65;
    }
    herd.push({ build: makeBuild(a.size * 1.06, 11 + i * 7.31, false, i < 3 ? 0.0125 : 0.022, OWN[i] ?? {}), plan, near: true });
  });
  // The one at the rim: it stands with its weight on three legs and looks down the shaft, then lets its neck hang.
  // It is the stocky one of the herd: short in the leg, deep in the barrel, its back arched, and when its neck is down the tuft lies on the rock.
  const lank = makeBuild(RIM_WADER.size * 1.06, 97.3, false, 0.014, { chest: 1.14, belly: 0.9, sway: 0.7, gaunt: 1.15 });
  const stocky: Build = { ...lank, standH: lank.standH * 0.8, legLen: lank.legLen * 0.806, legR: lank.legR * 1.35, neckR: lank.neckR * 1.18, bodyLen: lank.bodyLen * 1.08 };
  herd.push({ build: stocky, plan: planOf(RIM_WADER, [[-5, RIM_WADER_DOWN_FROM - 1.5], [RIM_LIFTS, RIM_LIFTS + 60]], rng, 1, 1), near: false });
  // The far flock: grains of rice on the shallows. No two do the same thing at the same time.
  const far = rng;
  for (let i = 0; i < FAR_FLOCK.count; i++) {
    const b = far.range(FAR_FLOCK.bearing[0], FAR_FLOCK.bearing[1]) * RAD;
    const d = far.range(FAR_FLOCK.distance[0], FAR_FLOCK.distance[1]);
    const anchor: Anchor = { x: Math.sin(b) * d, z: -Math.cos(b) * d, heading: far.range(0, 360), speed: far.range(0.15, 0.45), size: far.range(0.68, 1.14), up: far.next() < 0.35, phase: far.range(0, 6.28) };
    const start = far.range(-8, 20);
    const up: [number, number][] = far.next() < 0.3 ? [[-5, 30]] : [[start, start + far.range(2.5, 6)], [start + far.range(11, 16), start + far.range(17, 22)]];
    // Some stand, one or two of them on three legs; the rest walk at their own pace and stop when they like.
    const lot = hash(i * 7.13 + 3);
    const plan: Plan = { ...planOf(anchor, up, far), speed: lot < 0.3 ? 0 : anchor.speed * PACE, pauses: 0.1 + 0.4 * hash(i * 3.3 + 1), carry: 2 * hash(i * 5.7 + 2), tuck: lot < 0.12 ? 1 + 2 * Math.floor(hash(i * 9.1) * 2) : 0, feedAt: 0.38 + 0.36 * hash(i * 2.9 + 4), reach: hash(i * 4.7 + 6) < 0.38 ? 0 : 1 };
    herd.push({ build: makeBuild(anchor.size * 1.06, 301 + i * 3.77, true), plan, near: false });
  }
  MORE.forEach((m, i) => {
    const anchor: Anchor = { x: m[0], z: m[1], heading: m[2], speed: m[4] * PACE, size: m[3], up: false, phase: i };
    const own: Partial<Build> = { chest: 0.92 + 0.24 * hash(i * 4.1 + 7), belly: 0.85 + 0.4 * hash(i * 6.3 + 8), sway: -0.8 + 1.5 * hash(i * 8.7 + 9), gaunt: 0.95 + 0.2 * hash(i * 2.3 + 6) };
    const plan: Plan = { ...planOf(anchor, MORE_UP[i] ?? [], rng), pauses: 0.12 + 0.3 * hash(i * 3.9 + 5), pauseMax: 3, carry: m[5], tuck: m[6], feedAt: 0.4 + 0.3 * hash(i * 5.1 + 3) };
    herd.push({ build: makeBuild(m[3] * 1.06, 501 + i * 9.17, false, 0.024, own), plan, near: true });
  });
  return herd;
}
