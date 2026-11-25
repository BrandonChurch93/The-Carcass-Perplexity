// Where things stand in the Heart, taken from the approved establishing picture through the layout. Owned by the root.
// World metres: origin mid caldera on the lake surface (y = 0), north is -z, east is +x.
import type { Vec3 } from '../../../core/cameras';
import { cut, eventSeconds, secondsInPlace } from '../../../film/cut';
import { MOUTH, spot } from '../layout';
import { walkerPosition, type Walker } from './standin-walkers';

export const UNIT = 'heart';

/** Seconds, in the time of the place, of a key frame. */
export const keySeconds = (key: string): number => secondsInPlace(UNIT, cut.keyFrames[key] as number);

/** The reference time of the place: the key frame of the establishing picture. The crust's drift is zero at this time. */
export const T0 = keySeconds('heart-0');

/** Seconds of the five keys, in the order the film shows them: the establishing view, the walkers feeding, the line, the one that sank, the fall. */
export const KEY_TIMES = {
  'heart-0': keySeconds('heart-0'),
  'heart-3': keySeconds('heart-3'),
  'heart-1': keySeconds('heart-1'),
  'heart-2': keySeconds('heart-2'),
  'heart-4': keySeconds('heart-4'),
};

/** The surge of the fall, seconds in the time of the place. */
export const SURGE = eventSeconds(UNIT, 'surge') ?? 1e9;

/** The near walker of the establishing picture, feeding at the shore seam. */
export const NEAR: Vec3 = spot(0.365, 0.68);
/** The middle of the group of five. */
export const GROUP: Vec3 = spot(0.585, 0.545);
/** The one that sank. */
export const SUNK: Vec3 = spot(0.69, 0.775);
/** The line where the bench meets the lake, the subject of key heart-1. */
export const LINE: [number, number] = [-507, 212];
/** Where the fall meets the lake. */
export const FALL_FOOT: [number, number] = [MOUTH.x - 6, -326];
/** The row of fountains at the right of the establishing picture, where crust founders. */
export const SPATTER_RIGHT: Vec3[] = [spot(0.8, 0.607), spot(0.86, 0.6), spot(0.93, 0.604), spot(0.985, 0.598)];
/** The smaller row at the left, under the bench. */
export const SPATTER_LEFT: Vec3[] = [spot(0.205, 0.55), spot(0.24, 0.545), spot(0.27, 0.548)];
/** The steaming sulphur crack on the bench: its upper end and its foot by the line. */
export const CRACK_TOP: Vec3 = spot(0.1, 0.645);
export const CRACK_FOOT: [number, number] = [LINE[0] + 5.5, LINE[1] - 14];
/** The fume rises here, behind the buttress, and leans west over the lake. */
export const FUME_FOOT: Vec3 = [500, 150, -390];
export const FUME_LOW: Vec3 = [760, 8, -40];

const from = (p: Vec3, dx: number, dz: number): [number, number] => [p[0] + dx, p[2] + dz];

/** The staging of the walkers. Each walks in a straight line: at `when` it is at `at`, heading and speed as given, metres a second. `feed` 1 means it stands and feeds. */
export const WALKERS: Walker[] = [
  { at: from(NEAR, 0, 0), when: T0, heading: 100, speed: 0.4, size: 1.55, feed: 1, phase: 0.1 },
  { at: from(GROUP, 0, 0), when: T0, heading: 126, speed: 0.12, size: 1.2, feed: 1, phase: 0.33 },
  { at: from(GROUP, 20, 8), when: T0, heading: 104, speed: 0.55, size: 1.0, feed: 1, phase: 0.62 },
  { at: from(GROUP, 8, -19), when: T0, heading: 72, speed: 0.2, size: 0.92, feed: 0.8, phase: 0.87 },
  { at: from(GROUP, 37, -15), when: T0, heading: 205, speed: 0.1, size: 0.84, feed: 1, phase: 0.2 },
  { at: from(GROUP, 64, -10), when: T0, heading: 300, speed: 0.3, size: 0.97, feed: 0.6, phase: 0.48 },
  { at: from(spot(0.845, 0.447), 0, 0), when: T0, heading: 250, speed: 0.7, size: 1.05, feed: 0.3, phase: 0.7 },
  { at: from(spot(0.89, 0.446), 0, 0), when: T0, heading: 235, speed: 0.6, size: 0.9, feed: 0.8, phase: 0.05 },
  { at: from(spot(0.55, 0.437), 0, 0), when: T0, heading: 95, speed: 0.8, size: 1.1, feed: 0.2, phase: 0.55 },
  { at: [FALL_FOOT[0] + 92, FALL_FOOT[1] + 46], when: T0, heading: 262, speed: 0.6, size: 1.05, feed: 0.4, phase: 0.3 },
  { at: [FALL_FOOT[0] + 148, FALL_FOOT[1] + 52], when: T0, heading: 255, speed: 0.5, size: 0.9, feed: 1, phase: 0.8 },
  { at: [-250, 60], when: T0, heading: 160, speed: 0.9, size: 1.0, feed: 0.1, phase: 0.15 },
  { at: [-140, 190], when: T0, heading: 20, speed: 0.7, size: 0.88, feed: 0.5, phase: 0.92 },
  { at: [-330, -90], when: T0, heading: 140, speed: 0.8, size: 1.12, feed: 0.2, phase: 0.4 },
];

/** Where walker `index` of the staging is at `seconds`, on the ground plane. The built walkers stay within about 3 m of this at the five key times. */
export const walkerAt = (index: number, seconds: number): [number, number] => walkerPosition(WALKERS[index] as Walker, seconds);

export { walkerPosition, type Walker };

/** The seams the pictures show, as lines on the lake at the reference time. The lake draws them hot; the walkers feed at them; the cameras look at them. */
export const SEAMS: Record<string, { from: [number, number]; to: [number, number]; width: number; wobble: number; seed: number }> = {
  /** The channel that runs out from the line, the glowing subject of key heart-1. */
  line: { from: [LINE[0] + 3.7, LINE[1] + 0.5], to: [LINE[0] + 38, LINE[1] - 24.4], width: 1.5, wobble: 1.2, seed: 2.1 },
  /** The long seam the group feeds at, key heart-3. */
  group: { from: from(GROUP, -46, 22), to: from(GROUP, 86, -20), width: 1.3, wobble: 5, seed: 1.3 },
  /** The seam under the near walker. */
  nearA: { from: [spot(0.37, 0.61)[0], spot(0.37, 0.61)[2]], to: [spot(0.47, 0.682)[0], spot(0.47, 0.682)[2]], width: 1.3, wobble: 2, seed: 0.4 },
  nearB: { from: [spot(0.47, 0.682)[0], spot(0.47, 0.682)[2]], to: [spot(0.71, 0.668)[0], spot(0.71, 0.668)[2]], width: 1.1, wobble: 3, seed: 2.1 },
  /** The fountain lines. */
  spatterRight: { from: [(SPATTER_RIGHT[0] as Vec3)[0], (SPATTER_RIGHT[0] as Vec3)[2]], to: [(SPATTER_RIGHT[3] as Vec3)[0], (SPATTER_RIGHT[3] as Vec3)[2]], width: 3.4, wobble: 4, seed: 0.9 },
  spatterLeft: { from: [(SPATTER_LEFT[0] as Vec3)[0], (SPATTER_LEFT[0] as Vec3)[2]], to: [(SPATTER_LEFT[2] as Vec3)[0], (SPATTER_LEFT[2] as Vec3)[2]], width: 2.6, wobble: 2, seed: 2.9 },
  /** The small crack beside the one that sank. */
  sunk: { from: from(SUNK, -5, -4.5), to: from(SUNK, 2, -6.5), width: 0.7, wobble: 0.5, seed: 0.3 },
};

/** A seam as a crooked line of points, the same curve the blockout drew. */
export function seamLine(name: keyof typeof SEAMS | string, steps = 16): [number, number][] {
  const s = SEAMS[name];
  if (!s) throw new Error(`No seam named ${name}`);
  const out: [number, number][] = [];
  const l = Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]) || 1;
  const nx = -(s.to[1] - s.from[1]) / l;
  const nz = (s.to[0] - s.from[0]) / l;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const k = s.wobble * (Math.sin(t * 9 + s.seed) + 0.6 * Math.sin(t * 23 + s.seed * 3)) * Math.sin(Math.PI * t);
    out.push([s.from[0] + (s.to[0] - s.from[0]) * t + nx * k, s.from[1] + (s.to[1] - s.from[1]) * t + nz * k]);
  }
  return out;
}
