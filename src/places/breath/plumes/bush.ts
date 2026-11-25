// How a gill-plume grows: a gnarled holdfast in a crack of the rock, a few thick stems that rise from it and arch over toward the shaft,
// a few side stems off each, and along every stem two vanes of fine barbs that hang (vanes.ts). Few fronds, and large.
import type { Rng } from '../../../core/rng';
import type { Ribbons, V3 } from './ribbons';
import type { Vanes } from './vanes';

export interface Bush {
  x: number;
  y: number;
  z: number;
  tall: number;
  /** The way it leans, radians: toward the shaft. */
  lean: number;
  /** 1 for the ones the camera comes close to, less for the far ones: how many fronds are grown. */
  detail: number;
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A stem that leaves `from` at an elevation and a yaw, arches toward the lean and droops at its end. */
function grow(from: V3, yaw: number, rise: number, droop: number, length: number, lean: number, pull: number, segments: number, wobble: () => [number, number]): V3[] {
  const points: V3[] = [from];
  let [x, y, z] = from;
  let heading = yaw;
  const ds = length / segments;
  for (let i = 0; i < segments; i++) {
    const s = (i + 0.5) / segments;
    const [wy, we] = wobble();
    const elevation = rise - (rise + droop) * s ** 1.5 + we;
    // The whole bush is combed one way by the breath of the shaft: every stem turns toward the lean as it goes.
    let turn = lean - heading;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    heading += turn * pull * (1 / segments) * 2 + wy;
    x += Math.sin(heading) * Math.cos(elevation) * ds;
    y += Math.sin(elevation) * ds;
    z -= Math.cos(heading) * Math.cos(elevation) * ds;
    points.push([x, y, z]);
  }
  return points;
}

export function growBush(stems: Ribbons, vanes: Vanes, bush: Bush, rng: Rng, floor: (x: number, z: number) => number): void {
  const { tall, lean, detail } = bush;
  const root: V3 = [bush.x, bush.y, bush.z];
  const fronds = Math.max(5, Math.round((tall > 3 ? 13 : 8) * (0.55 + 0.45 * detail)));
  const heightOf = (p: V3): number => Math.min(1, Math.max(0, (p[1] - bush.y) / tall));
  const barbMax = 0.17 * tall;

  const frond = (points: V3[], phase: number, from: number, barb: number, thick: number, open: number, droop: number): void => {
    const n = points.length;
    // No frond lies in the rock: where it would, it lies on it.
    for (const p of points) p[1] = Math.max(p[1], floor(p[0], p[2]) + 0.04);
    const at = points.map(heightOf);
    const tone = rng.next();
    stems.add({
      points,
      // Thick and fleshy where it leaves the holdfast, a wire at its end.
      half: points.map((_, i) => thick * (from === 0 ? 1 + 2.4 * smooth(0.2, 0, i / (n - 1)) : 1) * (1 - 0.82 * (i / (n - 1)))),
      kind: 0,
      stemAt: (u) => at[Math.min(n - 1, Math.round(u * (n - 1)))] as number,
      stemPhase: phase,
      phase,
      open,
      tone,
      tall,
      root,
      reach: (u) => from + (1 - from) * u,
    });
    const start = from === 0 ? 0.14 : 0.03;
    vanes.add({
      points,
      at,
      phase,
      barb: points.map((_, i) => {
        const u = i / (n - 1);
        return barb * smooth(start, start + 0.16, u) * (1 - 0.45 * u ** 3) * (0.85 + 0.3 * rng.next());
      }),
      droop: points.map((_, i) => droop * (0.75 + 0.5 * (i / (n - 1)))),
      twist: rng.range(-0.25, 0.25),
      seed: rng.range(1, 90),
      open,
      tone,
      tall,
      root,
      reach: points.map((_, i) => from + (1 - from) * (i / (n - 1))),
    });
  };

  for (let t = 0; t < fronds; t++) {
    const k = (t + rng.range(0.25, 0.75)) / fronds - 0.5;
    const yaw = lean + k * 2.9 + rng.range(-0.2, 0.2);
    const length = tall * rng.range(0.6, 1.15) * (1 - 0.3 * Math.abs(k));
    const rise = rng.range(1.0, 1.3) - 0.55 * Math.abs(k);
    const out = 0.07 * tall * rng.range(0.2, 1);
    const base: V3 = [bush.x + Math.sin(yaw) * out, bush.y + 0.02 * tall, bush.z - Math.cos(yaw) * out];
    const points = grow(base, yaw, rise, rng.range(0.5, 1.5), length, lean, 0.3, 20, () => [rng.range(-0.09, 0.09), rng.range(-0.08, 0.08)]);
    const phase = rng.range(0, 6.28);
    const open = 1 - 0.55 * (1 - 2 * Math.abs(k));
    frond(points, phase, 0, barbMax * rng.range(0.85, 1.15), 0.011 * tall * rng.range(0.8, 1.2), open, rng.range(0.9, 1.35));
    const branches = Math.round(rng.range(3, 6.4) * (0.4 + 0.6 * detail));
    for (let b = 0; b < branches; b++) {
      const s = 0.2 + 0.65 * ((b + rng.next()) / branches);
      const i = Math.min(points.length - 2, Math.floor(s * (points.length - 1)));
      const from = points[i] as V3;
      const next = points[i + 1] as V3;
      const heading = Math.atan2(next[0] - from[0], -(next[2] - from[2]));
      const elevation = Math.asin(Math.max(-1, Math.min(1, (next[1] - from[1]) / Math.hypot(next[0] - from[0], next[1] - from[1], next[2] - from[2]))));
      const side = (b % 2 === 0 ? 1 : -1) * rng.range(0.3, 1.1);
      const l = length * (1 - s) * rng.range(0.6, 1.3) + 0.12 * tall;
      const pts = grow([from[0], from[1], from[2]], heading + side, elevation + rng.range(0, 0.3), rng.range(0.5, 1.1), l, lean, 0.25, 11, () => [rng.range(-0.11, 0.11), rng.range(-0.1, 0.1)]);
      frond(pts, phase + rng.range(-0.5, 0.5), s, barbMax * rng.range(0.6, 0.9), 0.005 * tall, Math.min(1, open + 0.25), rng.range(1.0, 1.4));
    }
  }
}
