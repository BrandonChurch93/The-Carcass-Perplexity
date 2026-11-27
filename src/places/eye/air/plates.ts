// The pictures of the far world, one for each run of shots: where each is hung and the shots it is hung for.
// A picture is hung on a cylinder round the camera of its key, so that the key frame shows it as it was made, and it grows as the camera nears it.
import { KEYS, SHORE_HEADING } from '../cameras';
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
  /** The air its wall stands in: contrast, the grey it turns about, how far the warm of the low slopes is cooled, and the v above the waterline under which. */
  air?: [number, number, number, number];
  /** Streaks of cirrus in its sky, at most two: u and v of the middle in the picture, half length in u, tilt (v for u), how much shows. */
  cirrus?: [number, number, number, number, number][];
  /** Mip levels the picture is softened by. */
  soft?: number;
  /** How many times taller than it stands the wall lies in the water. */
  drawn?: number;
  /** True for a picture of a wall alone, with no sky in it. */
  wall?: boolean;
  /** The built land is drawn within `near` metres of the camera of this key. */
  key: keyof typeof KEYS;
  near: number;
}

const wide = KEYS.wide.position;
const shore = KEYS.shore.position;
const edge = KEYS.edge.position;
const tan = (degrees: number): number => Math.tan((degrees * Math.PI) / 180);

// How much wider the wide shot's picture is than the one it was made from: 5144 columns for 3344.
const WIDER = 5144 / 3344;

export const PLATES: Plate[] = [
  // The rim and the sky as the wide camera sees them. Its waterline is hung on the water just beyond the far lip of the shaft.
  // The picture is carried on by WIDER at each side (assets-src/eye/far-wide/): at the start of the shot the lens passes the right end of the
  // picture as it was, and what stood there was the great cave beside its own mirror image.
  { file: 'mat/far-wide.jpg', shots: ['eye-01'], at: [wide[0], 0, wide[2]], radius: 1390, bearing: 18, tanAcross: tan(20) * (16 / 9) * WIDER, tanUp: tan(20), horizon: 0.512, tone: [1, 1, 1], cirrus: [[0.5 + 0.14 / WIDER, 0.81, 0.07 / WIDER, 0.03 * WIDER, 0.5], [0.5 - 0.14 / WIDER, 0.9, 0.13 / WIDER, -0.02 * WIDER, 0.36]], key: 'wide', near: 760 },
  // The north rim from the water, for the three shots that stand in the shallows of the south shore.
  { file: 'mat/far-low.jpg', shots: ['eye-02'], at: [-110, 0, 550], radius: 1500, bearing: 5, tanAcross: tan(22.5) * (16 / 9) * 1.14, tanUp: tan(22.5), horizon: 0.545, tone: [1, 1, 1], key: 'mats', near: 420 },
  // The rim for the shot at the edge of the shaft, which looks down and has only six degrees over the water: the wall of the approved
  // picture itself, made out at four times its grain and carried on to both sides, laid out level so that the key frame shows it where
  // the picture has it, a sixth of the frame tall under a thin strip of pale evening sky. The built land stays where the shallows shot has it.
  { file: 'mat/far-edge2.jpg', shots: ['eye-03'], at: [edge[0], 0, edge[2]], radius: 1500, bearing: 2, tanAcross: 0.85, tanUp: 0.15, horizon: 0.1, tone: [1, 1, 1], soft: 0.3, drawn: 2.8, key: 'mats', near: 420 },
  // The same rim for the shore shot, hung round its own camera and half the size: a long lens far from the wall sees it low, with the sky over it.
  { file: 'mat/far-low.jpg', shots: ['eye-04'], at: [shore[0], 0, shore[2]], radius: 1500, bearing: SHORE_HEADING - 360, tanAcross: tan(22.5) * (16 / 9) * 1.14 * 0.54, tanUp: tan(22.5) * 0.54, horizon: 0.545, tone: [1, 1, 1], air: [1, 0.3, 0.5, 0.2], soft: 0.9, key: 'shore', near: 420 },
  // The north wall with its cave, for the last shot: hung on the far shore itself, round the centre of the lake, so that it stays a shore as the camera climbs.
  { file: 'mat/far-long3.jpg', shots: ['eye-05'], at: [0, 0, 0], radius: 1000, bearing: 0, tanAcross: 0.426, tanUp: 0.426 * (941 / 5016), horizon: 0.34, tone: [0.85, 0.85, 0.87], air: [1.25, 0.3, 0, 0.1], wall: true, key: 'centre', near: 420 },
];

/** The index of the picture hung for the shot the camera stands in, or -1. */
export function plateFor(): number {
  for (let i = 0; i < PLATES.length; i++) if ((PLATES[i] as Plate).shots.some((s) => during(s))) return i;
  return -1;
}
