// The bore's course and the shared water numbers of the sea folder. The front and the event come from the root's anchors.
import { BORE, BORE_FRONT, WIND } from '../shared/anchors';

/** Metres a second the wall travels toward +z, and the height of its crest over the sea in the strait: the root's numbers. */
export const BORE_SPEED = BORE_FRONT.speed;
export const BORE_HEIGHT = BORE_FRONT.height;

/** The z of the bore's front at `seconds` of the place. At the event it stands at the anchor's gate. */
export const boreFront = (seconds: number): number => BORE_FRONT.gateZ + (seconds - BORE) * BORE_SPEED;

/** Seconds of the place at which the front reaches z. */
export const boreArrives = (z: number): number => BORE + (z - BORE_FRONT.gateZ) / BORE_SPEED;

/**
 * The swell: where it runs to (x, z), wavelength in metres, amplitude in metres. Two long swells come in from the open sea at the south and run up
 * the strait; the wind sea (the entries that run to +z, with the wind) comes out of the strait against them, short and steep, and it is what whitecaps.
 * The first entry times the surf at the feet of the blades.
 */
export const SWELL: [number, number, number, number][] = [
  [0.24, -0.97, 96, 1.3],
  [-0.12, -0.993, 171, 1.45],
  [0.5, 0.866, 44, 0.62],
  [0.19, 0.982, 27, 0.36],
  [0.78, 0.626, 17, 0.2],
  [0.05, -0.999, 11, 0.08],
];

export const WIND_TO = WIND.to;

/** Up to this many legs standing in water are ringed by the pools. x, z, phase, strength. */
export const MAX_RINGS = 24;
export interface Ring {
  x: number;
  z: number;
  phase: number;
  strength: number;
  /** What stands there to be mirrored: x, z, its top over the water, its radius. A negative radius is a ball (a body) centred that high. */
  stand?: [number, number, number, number];
}
/** The wings folder sets `at` when it is created: it fills the list for a time of the place, from that time alone. */
export const RING_SOURCE: { at: ((seconds: number, out: Ring[]) => void) | null } = { at: null };
