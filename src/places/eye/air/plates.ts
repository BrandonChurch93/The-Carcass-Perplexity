// The pictures of the far world, one for each run of shots: where each is hung and the shots it is hung for.
// A picture is hung on a cylinder round the camera of its key, so that the key frame shows it as it was made, and it grows as the camera nears it.
import { KEYS } from '../cameras';
import { during } from '../shared/anchors';

export interface Plate {
  file: string;
  shots: string[];
  /** The middle of the cylinder: x, the level of the picture's horizon, z. */
  at: [number, number, number];
  radius: number;
  /** The bearing of the picture's middle, degrees. */
  bearing: number;
  /** Tan of half the field of the picture, across and up. */
  tanAcross: number;
  tanUp: number;
  /** The v of the picture's horizon row, 0 at its foot. */
  horizon: number;
  tone: [number, number, number];
  /** True for a picture of a wall alone, with no sky in it. */
  wall?: boolean;
  /** The built land is drawn within `near` metres of the camera of this key. */
  key: keyof typeof KEYS;
  near: number;
}

const wide = KEYS.wide.position;
const tan = (degrees: number): number => Math.tan((degrees * Math.PI) / 180);

export const PLATES: Plate[] = [
  // The rim and the sky as the wide camera sees them. Its waterline is hung on the water just beyond the far lip of the shaft.
  { file: 'mat/far.jpg', shots: ['eye-01'], at: [wide[0], 0, wide[2]], radius: 1390, bearing: 18, tanAcross: tan(20) * (16 / 9), tanUp: tan(20), horizon: 0.512, tone: [1, 1, 1], key: 'wide', near: 760 },
  // The north rim from the water, for the three shots that stand in the shallows of the south shore.
  { file: 'mat/far-low.jpg', shots: ['eye-02', 'eye-03', 'eye-04'], at: [-110, 0, 550], radius: 1500, bearing: 5, tanAcross: tan(22.5) * (16 / 9) * 1.14, tanUp: tan(22.5), horizon: 0.545, tone: [1, 1, 1], key: 'mats', near: 420 },
  // The north wall with its cave, for the last shot: hung on the far shore itself, round the centre of the lake, so that it stays a shore as the camera climbs.
  { file: 'mat/far-long.jpg', shots: ['eye-05'], at: [0, 0, 0], radius: 1000, bearing: 0, tanAcross: 0.215, tanUp: 0.215 * (9 / 16), horizon: 0.45, tone: [0.8, 0.8, 0.82], wall: true, key: 'centre', near: 420 },
];

/** The index of the picture hung for the shot the camera stands in, or -1. */
export function plateFor(): number {
  for (let i = 0; i < PLATES.length; i++) if ((PLATES[i] as Plate).shots.some((s) => during(s))) return i;
  return -1;
}
