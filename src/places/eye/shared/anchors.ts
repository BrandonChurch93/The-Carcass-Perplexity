// The fixed points of the Eye: where things stand, when things happen, the level of the water, the sun.
// Origin: the centre of the lake on the water surface. North is -z, east is +x, y is up. Bearings run clockwise from north.
import { cut, placeOf, secondsInPlace, shotById } from '../../../film/cut';
import { DEG } from '../layout';
import { stagedSeconds } from './stage';

export const UNIT = 'eye';

/** The level of the still water. */
export const SEA = 0;

/** The low sun: where it stands (bearing from the centre, degrees) and how high. It does not move in the 21 seconds of the place. */
export const SUN = { bearing: 258, elevation: 10 };
/** The unit vector toward the sun. */
export const SUN_DIR: [number, number, number] = [
  Math.sin(SUN.bearing * DEG) * Math.cos(SUN.elevation * DEG),
  Math.sin(SUN.elevation * DEG),
  -Math.cos(SUN.bearing * DEG) * Math.cos(SUN.elevation * DEG),
];

export const keySeconds = (key: string): number => secondsInPlace(UNIT, cut.keyFrames[key] as number);

/** The crest of the dome at the centre of the lake: key eye-4. */
export const RISE = keySeconds('eye-4');
/** The first frame of the rise to orbit. */
export const END = secondsInPlace(UNIT, placeOf(UNIT).last + 1);

/** True while the camera stands in that shot. Every test of staging by shot goes through this. */
export function during(shot: string): boolean {
  const s = shotById(shot);
  const t = stagedSeconds();
  return t >= secondsInPlace(UNIT, s.first) - 0.3 / 60 && t < secondsInPlace(UNIT, s.last) + 0.7 / 60;
}
