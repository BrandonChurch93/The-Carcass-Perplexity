// Who stands where: the animals the close shots are about, placed from the cameras of those shots, and the herd along the south shore.
// Every animal is a pure function of time: where it stands, how far its neck is down, whether it walks or lies.
import { KEYS, SHORE_HEADING } from '../cameras';
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
  /** The picture it is taken from. */
  sheet: 'down' | 'up' | 'back' | 'calf';
  /** 1 or -1: which way along its bearing the sheet is laid. */
  flip: number;
  /** One of the animals a close shot is about: it has rings round its legs. */
  close: boolean;
  /** The level its feet stand at, where that is not the ground under it. */
  level?: number;
}

/** Seconds into the place at the keys of the shore shot (frame 9003) and of the mats shot (frame 8600), at 60 frames a second. */
const SHORE_KEY = (9003 - 8305) / 60;
const MATS_KEY = (8600 - 8305) / 60;

export function herd(rng: Rng, riseAt: number): Drinker[] {
  // One that drinks: its mouth is in the water, and once in every period it lifts its head, swallows and goes down again.
  // `at` is where in the period it is at the key of its shot, so the key is drawn as the approved picture has it.
  const sips = (period: number, keyTime: number, at: number) => (t: number) => {
    const u = ((((t - keyTime) / period + at) % 1) + 1) % 1;
    const lift = smooth(0.6, 0.72, u) * (1 - smooth(0.86, 0.98, u));
    return 1 - 0.42 * lift + 0.012 * Math.sin(t * 2.3 + at * 9);
  };
  const from = (key: { position: [number, number, number] }, bearing: number, distance: number, facing: number, size: number, sheet: Drinker['sheet'], down: (t: number) => number): Drinker => ({
    x: key.position[0] + Math.sin(bearing * DEG) * distance,
    z: key.position[2] - Math.cos(bearing * DEG) * distance,
    facing,
    size,
    down,
    sheet,
    flip: 1,
    close: true,
  });
  const up = (phase: number) => (t: number) => 0.3 + 0.07 * Math.sin(t * 0.61 + phase) + 0.03 * Math.sin(t * 1.7 + phase);
  const centre = KEYS.centre.position;
  const H = SHORE_HEADING;
  const list: Drinker[] = [
    // The four of the shore shot, restaged: they stand off in the shallows, side on, the low sun behind them. One has its head up, a calf beside it, two drink.
    from(KEYS.shore, H - 7.5, 31, H + 84, 1, 'up', up(0.3)),
    from(KEYS.shore, H - 5.2, 29.5, H + 96, 1, 'calf', sips(4.5, SHORE_KEY, 0.12)),
    from(KEYS.shore, H - 1.5, 27, H + 92, 1, 'down', sips(6, SHORE_KEY, 0.3)),
    from(KEYS.shore, H + 6.5, 21, H - 82, 1.04, 'down', sips(7, SHORE_KEY, 0.12)),
    // The two of the last shot, on the brow of the bluff below the camera with their backs to it, cut by the foot of the frame.
    { x: centre[0] - 1.22, z: centre[2] - 13.5, level: centre[1] - 0.72 - 2.45 * 0.95, facing: 0, size: 0.95, down: (t) => 0.02 + 0.3 * (1 - smooth(riseAt, riseAt + 0.9, t)), sheet: 'back', flip: 1, close: false },
    { x: centre[0] + 0.86, z: centre[2] - 16.5, level: centre[1] - 1.12 - 2.45 * 0.88, facing: 0, size: 0.88, down: (t) => 0.03 + 0.3 * (1 - smooth(riseAt + 0.25, riseAt + 1.2, t)), sheet: 'back', flip: 1, close: false },
    // The ones of the mats shot, restaged: out on the shelf beyond the mats, small, side on.
    from(KEYS.mats, -13, 31, 80, 1, 'down', sips(5, MATS_KEY, 0.45)),
    from(KEYS.mats, -21, 44, 262, 1, 'up', up(1.4)),
    from(KEYS.mats, -17.5, 52, 96, 0.9, 'down', sips(6, MATS_KEY, 0.05)),
  ];
  // The herd along the south shore, as the wide shot sees it: side on to that camera or with their backs to it, in the shallows and on the gravel.
  for (let i = 0; i < 30; i++) {
    const bearing = rng.range(186, 208);
    const dry = i % 4 === 0;
    const r = shoreAt(bearing) + (dry ? rng.range(4, 26) : rng.range(-17, -3));
    const [x, z] = at(bearing, r);
    const period = rng.range(9, 17);
    const phase = rng.next();
    const kind = i % 9 === 4 ? 'calf' : i % 5 === 1 ? 'back' : dry || i % 3 === 2 ? 'up' : 'down';
    const way = rng.next() < 0.5 ? 1 : -1;
    list.push({
      x,
      z,
      facing: kind === 'back' ? 18 : 18 + 90 * way + rng.range(-28, 28),
      size: rng.range(1.75, 2.05) * (kind === 'calf' ? 1.15 : 1),
      down: kind === 'up' || kind === 'back' ? up(phase * 6) : (t) => 0.55 + 0.45 * smooth(-0.35, 0.35, Math.sin((t / period + phase) * Math.PI * 2)),
      sheet: kind,
      flip: 1,
      close: false,
    });
  }
  return list;
}
