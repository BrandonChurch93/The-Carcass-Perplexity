// The herd: who each wader is and what it does. Where they stand is the lead's (shared/anchors.ts).
import type { Rng } from '../../../core/rng';
import { FAR_FLOCK, FEED_AT, NEAR_WADERS, RIM_WADER, RIM_WADER_DOWN_FROM, type Wader as Anchor } from '../shared/anchors';
import { makeBuild, type Build, type Plan } from './animal';

const RAD = Math.PI / 180;

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
  [[4.2, 7.6], [18.3, 30]],
  [[9, 13.5]],
  [[-5, 4.6], [12, 16.5]],
  [[6, 9.5], [19, 30]],
  [[2.2, 6.8]],
  [[-5, 2.4], [10, 15], [21, 30]],
  [[13, 18]],
  [[-5, 30]],
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
    herd.push({ build: makeBuild(a.size * 1.06, 11 + i * 7.31, false), plan: planOf(a, UP[i] ?? [], rng), near: true });
  });
  // The one at the rim: it stands with its weight on three legs and looks down the shaft, then lets its neck hang.
  herd.push({ build: makeBuild(RIM_WADER.size * 1.06, 97.3, false), plan: planOf(RIM_WADER, [[-5, RIM_WADER_DOWN_FROM - 1.5]], rng, 1, 0.8), near: false });
  // The far flock: grains of rice on the shallows. No two do the same thing at the same time.
  const far = rng;
  for (let i = 0; i < FAR_FLOCK.count; i++) {
    const b = far.range(FAR_FLOCK.bearing[0], FAR_FLOCK.bearing[1]) * RAD;
    const d = far.range(FAR_FLOCK.distance[0], FAR_FLOCK.distance[1]);
    const anchor: Anchor = { x: Math.sin(b) * d, z: -Math.cos(b) * d, heading: far.range(0, 360), speed: far.range(0.15, 0.45), size: far.range(0.9, 1.12), up: far.next() < 0.35, phase: far.range(0, 6.28) };
    const start = far.range(-8, 20);
    const up: [number, number][] = far.next() < 0.14 ? [[-5, 30]] : [[start, start + far.range(2.5, 6)], [start + far.range(11, 16), start + far.range(17, 22)]];
    herd.push({ build: makeBuild(anchor.size * 1.06, 301 + i * 3.77, true), plan: planOf(anchor, up, far), near: false });
  }
  return herd;
}
