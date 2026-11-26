// Where things stand in the Breath and when things happen. Owned by the lead (the root). Every folder reads these and none writes them.
// World metres: the origin is the centre of the main shaft at shelf level. North is -z, east is +x, y is up. The shelf is at about y = 0.3.
import type { Vec3 } from '../../../core/cameras';
import { cut, eventSeconds, secondsInPlace, shotById } from '../../../film/cut';
import { RAD, SEA, channelHalf, channelX, ground, onRim } from '../land';

export const UNIT = 'breath';

/** Seconds, in the time of the place, of a key frame. */
export const keySeconds = (key: string): number => secondsInPlace(UNIT, cut.keyFrames[key] as number);

/** The reference time of the place: the key frame of the establishing picture. */
export const T0 = keySeconds('breath-0');

/** Seconds of the five keys, in the order the film shows them. */
export const KEY_TIMES = {
  'breath-0': keySeconds('breath-0'),
  'breath-4': keySeconds('breath-4'),
  'breath-3': keySeconds('breath-3'),
  'breath-1': keySeconds('breath-1'),
  'breath-2': keySeconds('breath-2'),
};

/** The first and last second of a shot, in the time of the place. Test them against `stagedSeconds()`. */
export const shotSpan = (id: string): [number, number] => {
  const s = shotById(id);
  return [secondsInPlace(UNIT, s.first) - 0.3 / 60, secondsInPlace(UNIT, s.last) + 0.7 / 60];
};

/** The shaft breathes out, seconds in the time of the place. */
export const EXHALE = eventSeconds(UNIT, 'exhale') ?? 1e9;

/** The level of the sea and of the water in the tide channel, metres. The bed of the channel is at -1.0. */
export const SEA_LEVEL = SEA;

/** The sun: low in the north-north-west, 8.5 degrees up. It does not move. `SUN_DIR` points from the ground to the sun. */
export const SUN = { bearing: -15, elevation: 8.5 };
export const SUN_DIR: Vec3 = [Math.sin(SUN.bearing * RAD) * Math.cos(SUN.elevation * RAD), Math.sin(SUN.elevation * RAD), -Math.cos(SUN.bearing * RAD) * Math.cos(SUN.elevation * RAD)];
/** The way a shadow falls along the ground, a unit vector on x and z, and how many metres it runs for each metre of height. */
export const SHADOW_WAY: [number, number] = [-Math.sin(SUN.bearing * RAD), Math.cos(SUN.bearing * RAD)];
export const SHADOW_RUN = 1 / Math.tan(SUN.elevation * RAD);

/** The wind near the ground: the way the heavy vapour slides and the plumes lean. A unit vector on x and z (toward the west and a little south). */
export const WIND: [number, number] = [-0.94, 0.34];

/** The smaller shafts: x, z, radius, how tall their vapour stands against that radius. */
export const SMALLER: [number, number, number, number][] = [
  [15, -354, 10, 0.2],
  [-107, -545, 15, 2.2],
  [52, -46, 6, 0.12],
  [-250, -900, 14, 2],
];

/** The gill-plumes on the lip: bearing round the shaft in degrees (0 is north, 90 east), metres out from the rim, height in metres. */
export const BUSHES: [number, number, number][] = [
  [-89, 2.6, 3.4],
  [-84, 2.2, 5.6],
  [-64, 2.8, 4.8],
  [-46, 2.4, 4.2],
  [-27, 3, 2.6],
  [196, 2, 4.4],
  [214, 4.5, 2.4],
  [178, 6, 1.6],
  [8, 9, 2.4],
  [26, 12, 1.8],
];
/** The scraps and seedlings away from the lip: x, z, height. */
export const SEEDLINGS: [number, number, number][] = [
  [-33, -43, 2.2],
  [-29, -38, 1.5],
  [-35.5, -50, 1.3],
  [-34, 31, 1.1],
  [-39, 20, 0.9],
];
/** Where a bush of `BUSHES` is rooted on the ground. */
export const bushAt = (index: number): [number, number] => {
  const b = BUSHES[index] as [number, number, number];
  return onRim(b[0], b[1]);
};

export interface Wader {
  x: number;
  z: number;
  /** Degrees, 0 is north. */
  heading: number;
  /** Metres a second. */
  speed: number;
  size: number;
  /** True: neck up. False: neck down, feeding. */
  up: boolean;
  phase: number;
}

/** The time the waders' places are given at: the key of the picture of them feeding. */
export const FEED_AT = keySeconds('breath-1');
/** The first nine feed in the channel in front of the camera of key breath-1 and stay between its banks; the tenth stands on the bank. */
export const NEAR_WADERS: Wader[] = [
  { x: -51.7, z: -27.4, heading: 105, speed: 0.22, size: 1.08, up: false, phase: 0 },
  { x: -47.6, z: -30.9, heading: 100, speed: 0.16, size: 1.05, up: true, phase: 1 },
  { x: -42.6, z: -33.4, heading: 112, speed: 0.1, size: 0.98, up: false, phase: 2 },
  { x: -57, z: -46, heading: 30, speed: 0.3, size: 1, up: false, phase: 3 },
  { x: -66, z: -54, heading: -60, speed: 0.25, size: 1.05, up: true, phase: 4 },
  { x: -73, z: -70, heading: 150, speed: 0.3, size: 1, up: false, phase: 5 },
  { x: -84, z: -92, heading: 70, speed: 0.28, size: 0.95, up: false, phase: 6 },
  { x: -60, z: -78, heading: -20, speed: 0.3, size: 1, up: true, phase: 7 },
  { x: -95, z: -60, heading: 200, speed: 0.3, size: 1, up: false, phase: 8 },
  { x: -35.4, z: -30.5, heading: -40, speed: 0, size: 1.08, up: true, phase: 9 },
];
/** The far flock stands 150 to 520 m out, between these bearings from the shaft, in degrees. */
export const FAR_FLOCK = { count: 46, bearing: [-52, -6] as [number, number], distance: [150, 520] as [number, number] };
/** The one that stands at the rim over the drop. Its neck is up until shot breath-04 starts and down from then on (the picture of the rim has it down). */
export const RIM_WADER: Wader = { x: -28.6, z: 15.2, heading: 72, speed: 0, size: 1.1, up: true, phase: 0 };
export const RIM_WADER_DOWN_FROM = secondsInPlace(UNIT, shotById('breath-04').first);
/** The one that stands in the sunlit mist behind the first gill-plume, as the lens of key breath-3 sees it: upper left of that frame, neck up, about 33 m from the lens. */
export const MIST_WADER: Wader = { x: -37.5, z: -27.5, heading: 60, speed: 0, size: 1.1, up: true, phase: 4 };
/** The dead one near the lip: where it lies, its turn about y in radians, its size. */
export const DEAD_WADER = { x: -27.3, z: 22.6, turn: -0.5, size: 1.08 };

/** The height a foot stands at: the ground, or the bed of the channel where the ground is under water. */
export const footing = (x: number, z: number): number => Math.max(-0.95, ground(x, z)) - 0.05;

export { SEA, channelHalf, channelX, ground, onRim };
