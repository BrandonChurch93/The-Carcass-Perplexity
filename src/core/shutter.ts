import { FPS, config } from '../config';
import type { CameraState, Stage } from './stage';
import { SHUTTER } from './time';

type V = [number, number, number];

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V): V => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

const AXES: V[] = [[0, 1, 0], [1, 0, 0], [0, 0, 1]];
const EDGE: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

function frameOf(c: CameraState, ref: V): { f: V; r: V; u: V } {
  const f = unit(sub(c.aim, c.position));
  const r = unit(cross(f, ref));
  return { f, r, u: cross(r, f) };
}

/**
 * How far the camera's own move from `a` to `b` carries the plane of its subject across the frame, as a share of the frame's width.
 * The plane stands at the focus distance of `a`, square to its view. The largest shift among the middles of the four edges and the four corners counts.
 */
export function smearShare(a: CameraState, b: CameraState, aspect: number): number {
  const fa = unit(sub(a.aim, a.position));
  // One reference for both views, the world axis that lies furthest from the view, so that a view straight down has a steady frame.
  let ref = AXES[0] as V;
  for (const axis of AXES) if (Math.abs(dot(fa, axis)) < Math.abs(dot(fa, ref)) - 0.2) ref = axis;
  const A = frameOf(a, ref);
  const B = frameOf(b, ref);
  const d = a.lens.focus > 0 && Number.isFinite(a.lens.focus) ? a.lens.focus : Math.hypot(...sub(a.aim, a.position)) || 1;
  const ta = Math.tan((a.lens.fovDegrees * Math.PI) / 360);
  const tb = Math.tan((b.lens.fovDegrees * Math.PI) / 360);
  let worst = 0;
  for (const [x, y] of EDGE) {
    const p: V = [
      a.position[0] + d * (A.f[0] + x * ta * aspect * A.r[0] + y * ta * A.u[0]),
      a.position[1] + d * (A.f[1] + x * ta * aspect * A.r[1] + y * ta * A.u[1]),
      a.position[2] + d * (A.f[2] + x * ta * aspect * A.r[2] + y * ta * A.u[2]),
    ];
    const v = sub(p, b.position);
    const z = dot(v, B.f);
    if (z <= 1e-9) return Infinity;
    const dx = (dot(v, B.r) / (z * tb * aspect) - x) / 2;
    const dy = (dot(v, B.u) / (z * tb) - y) / (2 * aspect);
    worst = Math.max(worst, Math.hypot(dx, dy));
  }
  return worst;
}

/**
 * The share of the film's shutter that the camera keeps open in a frame: 1, or less when the camera's own move would carry its subject further than `film.maxSmearShare` of the frame's width while the full shutter is open.
 * A fast move then closes the camera's shutter early, so the land stays readable and a frame's few samples never stand apart as copies. What moves in the world is still drawn across the whole shutter: the engine lets the world run on by the rest.
 * A unit named in `film.fullShutterUnits` keeps the whole shutter for its camera too.
 */
export function shutterShare(stage: Stage, frame: number, aspect: number): number {
  const limit = config.film.maxSmearShare;
  if (!(limit > 0) || SHUTTER <= 0) return 1;
  if (stage.unit !== null && (config.film.fullShutterUnits as readonly string[]).includes(stage.unit)) return 1;
  const smear = smearShare(stage.cameraAt(frame / FPS), stage.cameraAt((frame + SHUTTER) / FPS), aspect);
  return smear > limit ? limit / smear : 1;
}
