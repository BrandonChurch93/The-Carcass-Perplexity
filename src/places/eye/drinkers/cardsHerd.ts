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
  sheet: 'down' | 'up' | 'back' | 'calf' | 'quarter';
  /** 1 or -1: which way along its bearing the sheet is laid. */
  flip: number;
  /** One of the animals a close shot is about: it has rings round its legs. */
  close: boolean;
  /** One of the herd that stands where a low camera of a close shot would meet it: it is there for the wide shot alone. */
  wideOnly?: boolean;
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
    return 1 - 0.6 * lift + 0.012 * Math.sin(t * 2.3 + at * 9);
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
    { x: centre[0] - 1.22, z: centre[2] - 13.5, level: centre[1] - 3.15, facing: 0, size: 0.7, down: (t) => -0.2 + 0.22 * (1 - smooth(riseAt, riseAt + 0.9, t)), sheet: 'quarter', flip: 1, close: false },
    { x: centre[0] + 0.72, z: centre[2] - 16.5, level: centre[1] - 3.47, facing: 0, size: 0.75, down: (t) => -0.1 + 0.3 * (1 - smooth(riseAt + 0.25, riseAt + 1.2, t)), sheet: 'back', flip: -1, close: false },
    // The ones of the mats shot, restaged: out on the shelf beyond the mats, small, side on.
    from(KEYS.mats, -13, 31, 80, 1, 'down', sips(5, MATS_KEY, 0.45)),
    from(KEYS.mats, -21, 44, 262, 1, 'up', up(1.4)),
    from(KEYS.mats, -17.5, 52, 96, 0.9, 'down', sips(6, MATS_KEY, 0.05)),
  ];
  // The herd along the south shore, as the wide shot sees it: side on to that camera or with their backs to it, in the shallows and on the gravel.
  // They stand in loose bands of two to five, some far out on the shelf, some up on the gravel: never one row along the water.
  let band = 196;
  let out = -10;
  for (let i = 0; i < 26; i++) {
    if (i % 4 === 0) {
      band = rng.range(187, 199);
      out = i % 8 === 0 ? rng.range(3, 12) : rng.range(-20, -1.5);
    }
    const dry = out > 0;
    const bearing = band + rng.range(-1.3, 1.3);
    const r = shoreAt(bearing) + out + rng.range(-3, 3);
    const [x, z] = at(bearing, r);
    const period = rng.range(9, 17);
    const phase = rng.next();
    const kind = i % 9 === 4 ? 'calf' : i % 5 === 1 ? 'back' : dry || i % 3 === 2 ? 'up' : 'down';
    const way = rng.next() < 0.5 ? 1 : -1;
    // None of the herd stands in front of the low cameras of the close shots: those have their own animals, placed for them.
    const hidden = Math.min(...[KEYS.mats, KEYS.edge, KEYS.shore].map((k) => Math.hypot(x - k.position[0], z - k.position[2]))) < 110;
    list.push({
      x,
      z,
      facing: kind === 'back' ? 18 : 18 + 90 * way + rng.range(-28, 28),
      size: rng.range(1.35, 2.1) * (kind === 'calf' ? 1.1 : 1),
      down: kind === 'up' || kind === 'back' ? up(phase * 6) : (t) => 0.55 + 0.45 * smooth(-0.35, 0.35, Math.sin((t / period + phase) * Math.PI * 2)),
      sheet: kind,
      flip: rng.next() < 0.5 ? 1 : -1,
      close: false,
      wideOnly: hidden,
    });
  }
  return list;
}
