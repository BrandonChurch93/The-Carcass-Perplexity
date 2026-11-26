// Who stands where: the animals the close shots are about, placed from the cameras of those shots, and the herd along the south shore.
// Every animal is a pure function of time: where it stands, how far its neck is down, whether it walks or lies.
import { KEYS, SHORE_HEADING, SHORE_SWING, SHORE_TURN, onShore } from '../cameras';
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

/** Seconds into the place at the keys of the shore shot (frame 9003) and of the mats shot (frame 8600), at 60 frames a second. */
const SHORE_KEY = (9003 - 8305) / 60;
const MATS_KEY = (8600 - 8305) / 60;

export function herd(rng: Rng, riseAt: number): Drinker[] {
  const steady = (v: number, phase: number) => (t: number) => v + 0.035 * Math.sin(t * 0.9 + phase) + 0.02 * Math.sin(t * 2.3 + phase * 3);
  // One that drinks: its mouth is in the water, and once in every period it lifts its head, swallows and goes down again.
  // `at` is where in the period it is at the key of its shot, so the key is drawn as the approved picture has it.
  const sips = (period: number, keyTime: number, at: number) => (t: number) => {
    const u = ((((t - keyTime) / period + at) % 1) + 1) % 1;
    const lift = smooth(0.6, 0.72, u) * (1 - smooth(0.86, 0.98, u));
    return 0.97 - 0.42 * lift + 0.012 * Math.sin(t * 2.3 + at * 9);
  };
  const near = (x: number, out: number, facing: number, size: number, down: (t: number) => number): Drinker => {
    const p = onShore(x, out, 0);
    const eye = KEYS.shore.position;
    const c = Math.cos(SHORE_SWING * DEG);
    const s = Math.sin(SHORE_SWING * DEG);
    const east = p[0] - eye[0];
    const north = eye[2] - p[2];
    return { x: eye[0] + east * c + north * s, z: eye[2] - (north * c - east * s), facing: facing + SHORE_TURN + SHORE_SWING, size, down, walk: 0, lies: false };
  };
  const beside = (right: number, ahead: number, turned: number, size: number, down: (t: number) => number): Drinker => {
    const eye = KEYS.shore.position;
    const c = Math.cos(SHORE_HEADING * DEG);
    const s = Math.sin(SHORE_HEADING * DEG);
    return { x: eye[0] + right * c + ahead * s, z: eye[2] + right * s - ahead * c, facing: SHORE_HEADING + turned, size, down, walk: 0, lies: false };
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
    near(-86.5, -9.5, 82, 1, (t) => 0.2 + 0.07 * Math.sin(t * 0.61 + 0.3) + 0.03 * Math.sin(t * 1.7)),
    near(-83.6, -7.6, 78, 0.52, sips(4.5, SHORE_KEY, 0.12)),
    near(-79.8, -6.6, 76, 1, sips(6, SHORE_KEY, 0.3)),
    // The near one stands off the right edge of the shore shot: only its neck comes into the frame, down to the water.
    beside(5.1, 9.2, -120, 1, sips(7, SHORE_KEY, 0.12)),
    // The two of the last shot, on the brow of the bluff below the camera with their backs to it: they lift their heads as the centre swells.
    { x: centre[0] - 2.43, z: centre[2] - 29.5, facing: 7, size: 0.61, down: (t) => 0.02 + 0.3 * (1 - smooth(riseAt, riseAt + 0.9, t)), walk: 0, lies: false },
    { x: centre[0] - 0.5, z: centre[2] - 28.7, facing: 351, size: 0.47, down: (t) => 0.03 + 0.3 * (1 - smooth(riseAt + 0.25, riseAt + 1.2, t)), walk: 0, lies: false },
    // The one of the mats shot, in the shallows at its left third.
    from(KEYS.mats, -12, 17, 86, 1, sips(5, MATS_KEY, 0.45)),
    from(KEYS.mats, -22, 64, 250, 1, sips(4, MATS_KEY, 0.3)),
    from(KEYS.mats, -19, 71, 110, 0.9, sips(6, MATS_KEY, 0.05)),
  ];
  for (let i = 0; i < 30; i++) {
    const bearing = rng.range(187, 207);
    const walker = i % 4 === 0;
    const lies = !walker && i % 7 === 3;
    const r = shoreAt(bearing) + (walker ? rng.range(16, 34) : lies ? rng.range(5, 16) : rng.range(-15, -4));
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
