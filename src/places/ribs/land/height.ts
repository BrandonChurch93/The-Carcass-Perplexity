// The bed of the strait: the floor the tide has left, in metres over sea level, without its fine relief (the rig lays that over it).
// The pools and runnels stand at LEVELS.pool wherever the bed is lower.
import { STATIONS } from '../cameras';
import { FLOOR, landAt as layoutLand } from '../layout';
import { fbm2, noise2, smooth } from './noise';

/** Where the bars lie: chosen so that the establishing camera stands at the edge of one, with sheets of water before it. */
export const BAR: [number, number] = [13.66, 0.38];

export function bed(x: number, z: number): number {
  const base = layoutLand(x, z);
  const edge = Math.min(FLOOR.south - z, z - FLOOR.north, x - FLOOR.west, FLOOR.east - x);
  const on = smooth(-60, 40, edge);
  if (on <= 0) return base;
  // The floor is nearly level: bars of shingle a foot over the pools, long down the strait; between them braided channels and hollows a hand under the pools.
  const bar = smooth(0.5, 0.62, 0.45 * noise2(x / 43 + BAR[0], z / 110 + BAR[1]) + 0.33 * noise2(x / 14 + 0.3 * noise2(x / 9, z / 9), z / 31) + 0.22 * noise2(x / 5.1 + 3.3, z / 9.7));
  const level = 1.2 + 0.3 * (base - 1) + 0.22 * (fbm2(x / 58, z / 58, 3) - 0.5) + 0.26 * bar;
  const low = 1 - 0.85 * bar;
  const channel = (1 - smooth(0, 0.3, Math.abs(noise2(x / 12 + z / 40, z / 26) - 0.5) * 2)) * low;
  const hollow = smooth(0.47, 0.22, noise2(x / 17 + 7.3, z / 17 - 2.1)) * low;
  const steps = 0.14 * (noise2(x / 5.3, z / 5.3) - 0.5);
  // Runnel beds: thin channels that wander down the strait, where the last of the tide runs off.
  const wander = fbm2(x / 130 + 3.1, z / 420 - 1.7, 3) - 0.5;
  const runnel = 1 - smooth(0.006, 0.03, Math.abs(wander));
  let h = level - 0.3 * channel - 0.27 * hollow + steps - 0.3 * runnel;
  // Where the feeders stand the floor is a shallow pool.
  for (const f of STATIONS.feeders) {
    const near = smooth(7, 2.5, Math.hypot(x - f[0], z - f[1]));
    if (near > 0) h += (1.03 + 0.04 * steps - h) * near;
  }
  return base + on * (h - base);
}
