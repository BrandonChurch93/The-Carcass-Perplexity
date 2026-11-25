import * as THREE from 'three';

export type Vec3 = [number, number, number];

export interface Pose {
  position: Vec3;
  aim: Vec3;
  fov: number;
  up?: Vec3;
  roll?: number;
  focus?: number;
  aperture?: number;
}

export interface MoveNode {
  at: number;
  pose: Pose;
}

export type Move = MoveNode[];
export type CameraPath = Move | ((part: number, frame: number) => Pose);

const EASE = 0.3;

export function ease(t: number, amount = EASE): number {
  const u = Math.min(1, Math.max(0, t));
  return u - (amount * Math.sin(2 * Math.PI * u)) / (2 * Math.PI);
}

function tangent(p0: number, p1: number, p2: number, t0: number, t1: number, t2: number): number {
  const a = (p1 - p0) / (t1 - t0);
  const b = (p2 - p1) / (t2 - t1);
  return (a * (t2 - t1) + b * (t1 - t0)) / (t2 - t0);
}

function hermite(p0: number, p1: number, m0: number, m1: number, h: number, s: number): number {
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * m1;
}

function channel(values: number[], knots: number[], u: number): number {
  const n = values.length;
  if (n === 1) return values[0] as number;
  let i = 0;
  while (i < n - 2 && u > (knots[i + 1] as number)) i++;
  const t0 = knots[i] as number;
  const t1 = knots[i + 1] as number;
  const p0 = values[i] as number;
  const p1 = values[i + 1] as number;
  const h = t1 - t0;
  const m0 = i > 0 ? tangent(values[i - 1] as number, p0, p1, knots[i - 1] as number, t0, t1) : (p1 - p0) / h;
  const m1 = i < n - 2 ? tangent(p0, p1, values[i + 2] as number, t0, t1, knots[i + 2] as number) : (p1 - p0) / h;
  return hermite(p0, p1, m0, m1, h, Math.min(1, Math.max(0, (u - t0) / h)));
}

export function focusOf(pose: Pose): number {
  if (pose.focus !== undefined) return pose.focus;
  return Math.hypot(pose.aim[0] - pose.position[0], pose.aim[1] - pose.position[1], pose.aim[2] - pose.position[2]);
}

export function checkMove(move: Move): void {
  if (move.length === 0) throw new Error('A camera move has no node');
  for (let i = 0; i < move.length; i++) {
    const at = (move[i] as MoveNode).at;
    if (!(at >= 0 && at <= 1)) throw new Error(`A camera node lies outside its shot: ${at}`);
    if (i > 0 && at <= (move[i - 1] as MoveNode).at) throw new Error('The nodes of a camera move are not in order');
  }
}

export function poseAt(move: Move, part: number, amount = EASE): Pose {
  const knots = move.map((n) => ease(n.at, amount));
  const u = ease(part, amount);
  const pick = (f: (p: Pose) => number): number => channel(move.map((n) => f(n.pose)), knots, u);
  const vec = (f: (p: Pose) => Vec3): Vec3 => [pick((p) => f(p)[0]), pick((p) => f(p)[1]), pick((p) => f(p)[2])];
  const first = (move[0] as MoveNode).pose;
  const pose: Pose = {
    position: vec((p) => p.position),
    aim: vec((p) => p.aim),
    fov: Math.exp(pick((p) => Math.log(p.fov))),
    roll: pick((p) => p.roll ?? 0),
    focus: Math.exp(pick((p) => Math.log(focusOf(p)))),
    aperture: pick((p) => p.aperture ?? 0),
  };
  if (first.up) pose.up = vec((p) => p.up ?? [0, 1, 0]);
  return pose;
}

export function resolve(path: CameraPath, part: number, frame: number): Pose {
  return typeof path === 'function' ? path(part, frame) : poseAt(path, part);
}

const forward = new THREE.Vector3();

export function applyPose(camera: THREE.PerspectiveCamera, pose: Pose): void {
  camera.position.set(...pose.position);
  camera.up.set(...(pose.up ?? [0, 1, 0]));
  camera.lookAt(...pose.aim);
  if (pose.roll) {
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    camera.rotateOnWorldAxis(forward, (pose.roll * Math.PI) / 180);
  }
  camera.fov = pose.fov;
}

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const mix = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

export function norm(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export interface Travel {
  forward?: number;
  right?: number;
  up?: number;
  turn?: number;
  tilt?: number;
  fov?: number;
}

export function moved(pose: Pose, t: Travel): Pose {
  const f = norm(sub(pose.aim, pose.position));
  const r = norm(cross(f, pose.up ?? [0, 1, 0]));
  const shift = add(add(scale(f, t.forward ?? 0), scale(r, t.right ?? 0)), [0, t.up ?? 0, 0]);
  const position = add(pose.position, shift);
  let aim = add(pose.aim, shift);
  if (t.turn || t.tilt) {
    const d = sub(aim, position);
    const len = Math.hypot(d[0], d[1], d[2]);
    const yaw = Math.atan2(d[0], -d[2]) + ((t.turn ?? 0) * Math.PI) / 180;
    const pitch = Math.asin(d[1] / len) + ((t.tilt ?? 0) * Math.PI) / 180;
    aim = add(position, [Math.sin(yaw) * Math.cos(pitch) * len, Math.sin(pitch) * len, -Math.cos(yaw) * Math.cos(pitch) * len]);
  }
  return { ...pose, position, aim, fov: t.fov ?? pose.fov };
}

export function through(key: Pose, keyAt: number, before: Travel, after: Travel): Move {
  const at = Math.min(0.98, Math.max(0.02, keyAt));
  return [
    { at: 0, pose: moved(key, before) },
    { at, pose: key },
    { at: 1, pose: moved(key, after) },
  ];
}
