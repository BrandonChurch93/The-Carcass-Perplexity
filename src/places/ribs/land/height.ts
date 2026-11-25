// The bed of the strait: the floor the tide has left, in metres over sea level, without its fine relief (the rig lays that over it).
// The pools and runnels stand at LEVELS.pool wherever the bed is lower.
import { FLOOR, landAt as layoutLand } from '../layout';
import { fbm2, noise2, smooth } from './noise';

export function bed(x: number, z: number): number {
  const base = layoutLand(x, z);
  const edge = Math.min(FLOOR.south - z, z - FLOOR.north, x - FLOOR.west, FLOOR.east - x);
  const on = smooth(-60, 40, edge);
  if (on <= 0) return base;
  // The floor is nearly level: bars a hand over the pools, braided channels and hollows a hand under them, at the size of a boat and of a step.
  const level = 1.3 + 0.3 * (base - 1) + 0.22 * (fbm2(x / 58, z / 58, 3) - 0.5);
  const channel = 1 - smooth(0, 0.3, Math.abs(noise2(x / 12 + z / 40, z / 26) - 0.5) * 2);
  const hollow = smooth(0.47, 0.22, noise2(x / 17 + 7.3, z / 17 - 2.1));
  const steps = 0.14 * (noise2(x / 5.3, z / 5.3) - 0.5);
  // Runnel beds: thin channels that wander down the strait, where the last of the tide runs off.
  const wander = fbm2(x / 130 + 3.1, z / 420 - 1.7, 3) - 0.5;
  const runnel = 1 - smooth(0.006, 0.03, Math.abs(wander));
  return base + on * (level - base - 0.3 * channel - 0.27 * hollow + steps - 0.3 * runnel);
}
