// The herd: who each wader is and what it does. Where they stand is the lead's (shared/anchors.ts).
import type { Rng } from '../../../core/rng';
import { FAR_FLOCK, FEED_AT, KEY_TIMES, NEAR_WADERS, RIM_WADER, RIM_WADER_DOWN_FROM, keySeconds, type Wader as Anchor } from '../shared/anchors';
import { makeBuild, shuffle, type Build, type Plan } from './animal';

const RAD = Math.PI / 180;
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};
/** Staged: in the view of the rim the live one has its neck down over the dead one, as the picture has it, and a second after that picture it
 *  begins to lift it and looks out over the shaft. */
const RIM_LIFTS = keySeconds('breath-2') + 0.9;
/** A feeding walk: a stride in two and a half to three seconds. */
const PACE = 0.85;
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
const STRIDES: Record<number, number> = { 0: 0.94, 4: 0.8 };
const MORE_UP: [number, number][][] = [[[3.4, 6.1], [16, 20]], [[-5, 2.8], [11, 14]], [[7, 9.6]], [[-5, 30]], [[-5, 4.4], [15, 30]], [[-5, 8]]];

/** The three seen close in the channel are three animals: a deep-chested old one, a sway-backed one, a small one with a drawn-up belly. */
const OWN: Partial<Build>[] = [
  { chest: 1.12, belly: 0.85, sway: 0.5, gaunt: 0.7 },
  { chest: 1.0, belly: 0.95, sway: 0.7, gaunt: 0.62 },
  { chest: 0.94, belly: 1.05, sway: 0.3, gaunt: 0.55 },
];

/** Staged: the far herd is laid out for the lens of the wide view (key breath-0), which stands here: a row across these bearings from it,
 *  degrees, this many metres out at its two ends, and the way the row runs. The count in the row is the lead's far flock and a third more. */
export const WIDE_EYE = { x: -41.5, z: 42.3 };
const ROW = FAR_FLOCK.count + 16;
const CROSSING = 7;
const ROW_BEARING: [number, number] = [-18.5, 7];
/** How far from that eye each band of it stands, metres, from the left of the view to the right. */
const ROW_BANDS = [172, 318, 226, 148, 286, 204, 338, 250, 182];
const ROW_HEADING = 59;

export interface Member {
  build: Build;
  plan: Plan;
  /** One of the far herd: staged by the view. */
  row?: boolean;
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

const TRIO: [number, number][] = [
  [-1.35, -0.36],
  [-0.36, 1.35],
  [-0.7, 2.9],
];

/** Staged: the herd is not one age: beyond the three in the channel there are young ones and old ones. The size of each, as a part of its own. */
const AGES = [1, 1, 1, 0.62, 1.15, 0.84, 1.1, 1, 0.7, 1];

export function makeHerd(rng: Rng): Member[] {
  const herd: Member[] = [];
  NEAR_WADERS.forEach((a, i) => {
    const way = WAYS[i] as [number, number, number, number, number];
    const plan: Plan = { ...planOf(a, UP[i] ?? [], rng), speed: way[0] * PACE, pauses: way[1], pauseMax: 2.6, carry: way[2], tuck: way[3], feedAt: way[4] };
    if (i === 1) plan.strideAt = STRIDE_AT;
    // Staged: where the three stand in the view in the channel, as the picture has them: the near one half out of the frame on the left,
    // the middle one nearer, the far one nearer and further right.
    const move = TRIO[i];
    if (move) {
      plan.x += move[0];
      plan.z += move[1];
    }
    // Staged: the one on the bank stands clear of the lens of the view in the channel, which drifts toward it.
    if (i === 9) {
      plan.x += 2.4;
      plan.z += 0.65;
    }
    // Staged: one of those far out on the flats has lain down.
    if (i === 7) {
      plan.rest = 1;
      plan.speed = 0;
    }
    herd.push({ build: makeBuild(a.size * 1.06 * (AGES[i] ?? 1), 11 + i * 7.31, false, i < 3 ? 0.0125 : 0.022, OWN[i] ?? {}), plan, near: true });
  });
  // The one at the rim: it stands with its weight on three legs and looks down the shaft, then lets its neck hang.
  // It is the stocky one of the herd: short in the leg, deep in the barrel, its back arched, and when its neck is down the tuft lies on the rock.
  const lank = makeBuild(RIM_WADER.size * 1.06, 97.3, false, 0.014, { chest: 1.14, belly: 0.9, sway: 0.7, gaunt: 0.7 });
  const stocky: Build = { ...lank, standH: lank.standH * 0.8, legLen: lank.legLen * 0.806, legR: lank.legR * 1.35, neckR: lank.neckR * 1.18, bodyLen: lank.bodyLen * 1.08 };
  herd.push({ build: stocky, plan: { ...planOf(RIM_WADER, [[-5, RIM_WADER_DOWN_FROM - 1.5], [RIM_LIFTS, RIM_LIFTS + 60]], rng, 1, 1), feedAt: 0.31, carry: 0.5, restless: 7, restlessAt: 0.129 }, near: false });
  // The numbers the far flock once drew here are drawn still, so that those made after it are who they were.
  for (let i = 0; i < FAR_FLOCK.count; i++) {
    for (let d = 0; d < 8; d++) rng.next();
    if (rng.next() >= 0.14) for (let d = 0; d < 3; d++) rng.next();
    for (let d = 0; d < 4; d++) rng.next();
  }
  MORE.forEach((m, i) => {
    const anchor: Anchor = { x: m[0], z: m[1], heading: m[2], speed: m[4] * PACE, size: m[3], up: false, phase: i };
    const own: Partial<Build> = { chest: 0.92 + 0.24 * hash(i * 4.1 + 7), belly: 0.85 + 0.4 * hash(i * 6.3 + 8), sway: -0.3 + 1.1 * hash(i * 8.7 + 9), gaunt: 0.55 + 0.25 * hash(i * 2.3 + 6) };
    const plan: Plan = { ...planOf(anchor, MORE_UP[i] ?? [], rng), pauses: 0.12 + 0.3 * hash(i * 3.9 + 5), pauseMax: 3, carry: m[5], tuck: m[6], feedAt: 0.4 + 0.3 * hash(i * 5.1 + 3), rest: i === 5 ? 1 : 0 };
    // Staged: two of them are not feeding but crossing the flats, neck up, at a walk: a long stride, steady, with hardly a stop.
    const pace = STRIDES[i];
    if (pace !== undefined) {
      own.stride = m[3] * 1.06 * 1.72;
      plan.speed = pace * m[3];
      plan.fits = 0.2;
      plan.pauses = 0.03;
      plan.pauseMax = 1;
      plan.up = [[-5, 60]];
    }
    herd.push({ build: makeBuild(m[3] * 1.06, 501 + i * 9.17, false, 0.024, own), plan, near: true });
  });
  // The far herd, as the wide picture has it: a long loose row on the shallows, small and pale, most of them bent down feeding; a thin
  // second rank behind it; and a few that cross the flats between the row and the channel at a walk. No two do the same thing at one time.
  const far = rng;
  // Not one rank at one distance: bands of a few animals each, one nearer, the next far out, with open water between them.
  const share = ROW_BANDS.map((d) => Math.pow(d / 250, 1.8));
  const whole = share.reduce((sum, w) => sum + w, 0);
  const place = (i: number): [number, number] => {
    const along = Math.min(0.999, Math.max(0, (i + 1.7 * (hash(i * 3.1 + 1) - 0.5)) / ROW)) * whole;
    // The far bands are long and hold many; a near one is a few animals well apart.
    let band = 0;
    let before = 0;
    while (band < ROW_BANDS.length - 1 && before + (share[band] as number) < along) before += share[band++] as number;
    const within = (along - before) / (share[band] as number);
    const from = ROW_BEARING[0] + ((ROW_BEARING[1] - ROW_BEARING[0]) * band) / ROW_BANDS.length;
    const wide = (ROW_BEARING[1] - ROW_BEARING[0]) / ROW_BANDS.length;
    const far = ROW_BANDS[band] as number;
    const reach = far < 200 ? 1.5 : 0.8;
    const bearing = (from + wide * (0.5 + reach * (within - 0.5)) + 0.5 * (hash(i * 2.3 + 11) - 0.5)) * RAD;
    const d = far + 16 * (within - 0.5) * (hash(band * 7.7 + 3) < 0.5 ? -1 : 1) + (far < 200 ? 50 : 26) * (hash(i * 4.3 + 17) - 0.5);
    return [WIDE_EYE.x + Math.sin(bearing) * d, WIDE_EYE.z - Math.cos(bearing) * d];
  };
  for (let i = 0; i < ROW + CROSSING; i++) {
    const crosses = i >= ROW;
    let [x, z] = place(i);
    if (crosses) {
      const bearing = (-17 + 21 * hash(i * 3.7 + 21)) * RAD;
      const d = 84 + 50 * hash(i * 5.9 + 22);
      x = WIDE_EYE.x + Math.sin(bearing) * d;
      z = WIDE_EYE.z - Math.cos(bearing) * d;
    }
    // Most work along the row, either way, so they are seen from the side; a few go their own way.
    const way = ROW_HEADING + (hash(i * 1.9 + 13) < 0.5 ? 0 : 180);
    const anchor: Anchor = { x, z, heading: hash(i * 8.3 + 12) < 0.8 ? way + 70 * (hash(i * 2.7 + 14) - 0.5) : far.range(0, 360), speed: far.range(0.15, 0.4), size: far.range(0.6, 0.98), up: false, phase: far.range(0, 6.28) };
    // One in five keeps at the heel of the one before it, and is young.
    const last = herd[herd.length - 1];
    if (!crosses && i > 0 && last && hash(i * 5.3 + 31) < 0.2) {
      const off = (hash(i * 3.1 + 16) * 2 - 1) * Math.PI;
      const gap = 1.8 + 2.4 * hash(i * 4.3 + 33);
      anchor.x = last.plan.x + Math.sin(off) * gap;
      anchor.z = last.plan.z - Math.cos(off) * gap;
      anchor.heading = last.plan.heading / RAD + 40 * (hash(i * 6.7 + 18) - 0.5);
      anchor.size = 0.54 + 0.16 * hash(i * 9.7 + 20);
    }
    // What it does: lies, stands (some of those turn about on the spot), crosses at a walk, or feeds along at a shuffle with stops.
    const lot = hash(i * 7.13 + 3);
    const lies = !crosses && lot < 0.05;
    const stands = !crosses && lot >= 0.05 && lot < 0.2;
    const strides = crosses || (lot >= 0.2 && lot < 0.36);
    const k = anchor.size * 1.06;
    const build = makeBuild(k, 301 + i * 3.77, true, 0.02, strides ? { stride: k * (1.55 + 0.4 * hash(i * 2.1 + 41)) } : {});
    // Heads: most are down for the whole of the wide view; some lift once in it, each at its own moment; a few are up and go down.
    const head = hash(i * 9.3 + 51);
    const at = 0.2 + 4.6 * hash(i * 4.9 + 52);
    const up: [number, number][] = strides ? [[-5, 60]] : head < 0.58 ? [[9 + 6 * hash(i * 1.3 + 53), 13 + 8 * hash(i * 1.3 + 54)]] : head < 0.84 ? [[at, at + 1.6 + 2.4 * hash(i * 6.3 + 55)]] : [[-5, at]];
    const plan: Plan = {
      ...planOf(anchor, up, far),
      when: KEY_TIMES['breath-0'],
      speed: lies || stands ? 0 : strides ? k * (0.78 + 0.34 * hash(i * 3.9 + 42)) : anchor.speed * PACE,
      fits: strides ? 0.2 : far.range(0.72, 0.92),
      pauses: strides ? 0.03 : 0.1 + 0.4 * hash(i * 3.3 + 1),
      pauseMax: strides ? 1.2 : 2.6,
      carry: strides ? 1.5 + 0.5 * hash(i * 5.7 + 2) : 2 * hash(i * 5.7 + 2),
      tuck: stands && lot < 0.1 ? 1 + 2 * Math.floor(hash(i * 9.1) * 2) : 0,
      feedAt: 0.38 + 0.36 * hash(i * 2.9 + 4),
      reach: hash(i * 4.7 + 6) < 0.2 ? 0 : 1,
      rest: lies ? 1 : 0,
    };
    if (stands && lot >= 0.1) {
      // It turns about where it stands, a foot at a time, and a while later turns again.
      const first = 0.3 + 2.6 * hash(i * 8.9 + 61);
      const turn = (hash(i * 7.7 + 62) < 0.5 ? -1 : 1) * (0.45 + 0.5 * hash(i * 6.9 + 63));
      plan.steps = [...shuffle(build, first, 0.3 * k, 0, turn, 0.6, 0.14, i % 2), ...shuffle(build, first + 4.4 + 2 * hash(i * 2.9 + 64), 0.2 * k, 0, -0.7 * turn, 0.6, 0.2, (i + 1) % 2)];
      plan.stepsRef = KEY_TIMES['breath-0'];
    }
    herd.push({ build, plan, near: false, row: true });
  }
  return herd;
}
