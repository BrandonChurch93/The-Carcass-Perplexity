// The bed of the strait: the floor the tide has left, in metres over sea level, without its fine relief (the rig lays that over it).
// The pools and runnels stand at LEVELS.pool wherever the bed is lower.
import { FLOOR, landAt as layoutLand } from '../layout';
import { fbm2, noise2, smooth } from './noise';

export function bed(x: number, z: number): number {
  const base = layoutLand(x, z);
  const edge = Math.min(FLOOR.south - z, z - FLOOR.north, x - FLOOR.west, FLOOR.east - x);
  const on = smooth(-60, 40, edge);
  if (on <= 0) return base;
  // Bars and hollows the size of a boat, then of a step.
  const bars = 0.8 * (fbm2(x / 58, z / 58, 3) - 0.5) + 0.2 * (noise2(x / 7.3, z / 7.3) - 0.5);
  // Runnel beds: thin channels that wander down the strait, where the last of the tide runs off.
  const wander = fbm2(x / 130 + 3.1, z / 420 - 1.7, 3) - 0.5;
  const runnel = 1 - smooth(0.006, 0.03, Math.abs(wander));
  return base + on * (0.1 + bars - 0.35 * runnel);
}
