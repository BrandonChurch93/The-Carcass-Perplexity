// Who stands where: the animals the close shots are about, placed from the cameras of those shots, and the herd along the south shore.
// Every animal is a pure function of time: where it stands, how far its neck is down, whether it walks or lies.
import { KEYS, SHORE_TURN, onShore } from '../cameras';
import { DEG, at, shoreAt, smooth } from '../layout';
import type { Rng } from '../../../core/rng';

export interface Drinker {
  x: number;
  z: number;
  /** Bearing it faces, degrees. */
  facing: number;
  size: number;
  /** 0 neck up, 1 mouth in the water. */
  down: (t: number) => number;
  /** Metres a second toward the water; 0 stands. */
  walk: number;
  /** Lies on the gravel. */
  lies: boolean;
}

/** Every animal is this much larger than the blockout's, which the critics found half the size of the picture's. */
export const SCALE = 1.75;

export function herd(rng: Rng, riseAt: number): Drinker[] {
  const steady = (v: number, phase: number) => (t: number) => v + 0.035 * Math.sin(t * 0.9 + phase) + 0.02 * Math.sin(t * 2.3 + phase * 3);
  const near = (x: number, out: number, facing: number, size: number, down: (t: number) => number): Drinker => {
    const p = onShore(x, out, 0);
    return { x: p[0], z: p[2], facing: facing + SHORE_TURN, size, down, walk: 0, lies: false };
  };
  const from = (key: { position: [number, number, number] }, bearing: number, distance: number, facing: number, size: number, down: (t: number) => number): Drinker => ({
    x: key.position[0] + Math.sin(bearing * DEG) * distance,
    z: key.position[2] - Math.cos(bearing * DEG) * distance,
    facing,
    size,
    down,
    walk: 0,
    lies: false,
  });
  const centre = KEYS.centre.position;
  const list: Drinker[] = [
    // The four of the shore shot: one with its head up, a calf, and two that drink.
    near(-86.5, -9.5, 82, 1, steady(0.05, 0.3)),
    near(-83.6, -7.6, 78, 0.52, steady(0.9, 1.1)),
    near(-79.8, -6.6, 76, 1, steady(0.97, 2.2)),
    near(-71.4, -1.4, 283, 1, steady(0.97, 4)),
    // The two of the last shot, on the brow of the bluff below the camera with their backs to it: they lift their heads as the centre swells.
    { x: centre[0] - 2.43, z: centre[2] - 29.5, facing: 7, size: 0.61, down: (t) => 0.02 + 0.3 * (1 - smooth(riseAt, riseAt + 0.9, t)), walk: 0, lies: false },
    { x: centre[0] - 0.5, z: centre[2] - 28.7, facing: 351, size: 0.47, down: (t) => 0.03 + 0.3 * (1 - smooth(riseAt + 0.25, riseAt + 1.2, t)), walk: 0, lies: false },
    // The one of the mats shot, in the shallows at its left third.
    from(KEYS.mats, -12, 17, 86, 1, steady(0.96, 0.7)),
    from(KEYS.mats, -22, 64, 250, 1, steady(0.95, 3.1)),
    from(KEYS.mats, -19, 71, 110, 0.9, steady(0.2, 5.2)),
  ];
  for (let i = 0; i < 30; i++) {
    const bearing = rng.range(187, 207);
    const walker = i % 4 === 0;
    const lies = !walker && i % 7 === 3;
    const r = shoreAt(bearing) + (walker ? rng.range(16, 34) : lies ? rng.range(5, 16) : rng.range(-9, 2));
    const [x, z] = at(bearing, r);
    const period = rng.range(9, 17);
    const phase = rng.next();
    const calf = i % 9 === 4;
    list.push({
      x,
      z,
      facing: bearing + 180 + rng.range(-50, 50) + (lies ? 90 : 0),
      size: calf ? 0.52 : rng.range(0.9, 1.08),
      down: walker ? (t) => 0.1 + 0.25 * smooth(14, 18, t + phase * 4) : lies ? steady(0.08, phase * 6) : (t) => smooth(-0.35, 0.35, Math.sin((t / period + phase) * Math.PI * 2)),
      walk: walker ? rng.range(0.7, 1.0) : 0,
      lies,
    });
  }
  return list;
}
