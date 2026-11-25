// The bore's course and the shared water numbers of the sea folder. The front and the event come from the root's anchors.
import { BORE, BORE_FRONT, WIND } from '../shared/anchors';

/** TEMPORARY until the anchor BORE_FRONT says the same (asked of the lead). Metres a second the wall travels toward +z: slower than the blockout, a wall this high reads as a model when it crosses its own height in under half a second. */
export const BORE_SPEED = 45;
/** Height of the wall's crest over the sea, metres, in the strait. */
export const BORE_HEIGHT = 23;

/** The z of the bore's front at `seconds` of the place. At the event it stands at the anchor's gate. */
export const boreFront = (seconds: number): number => BORE_FRONT.gateZ + (seconds - BORE) * BORE_SPEED;

/** Seconds of the place at which the front reaches z. */
export const boreArrives = (z: number): number => BORE + (z - BORE_FRONT.gateZ) / BORE_SPEED;

/** The swell: where it runs to (x, z), wavelength in metres, amplitude in metres. It comes in from the open sea at the south and runs up the strait. */
export const SWELL: [number, number, number, number][] = [
  [0.24, -0.97, 68, 0.8],
  [-0.1, -0.995, 41, 0.42],
  [0.5, -0.866, 27, 0.26],
  [0.05, -0.999, 17, 0.15],
  [-0.35, -0.937, 11, 0.08],
];

export const WIND_TO = WIND.to;

/** Up to this many legs standing in water are ringed by the pools. The wings folder fills the list each time. x, z, phase, strength. */
export const MAX_RINGS = 24;
export const RINGS: { x: number; z: number; phase: number; strength: number }[] = Array.from({ length: MAX_RINGS }, () => ({ x: 0, z: 0, phase: 0, strength: 0 }));
