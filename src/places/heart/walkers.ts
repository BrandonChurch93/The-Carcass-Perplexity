import * as THREE from 'three';
import type { Vec3 } from '../../core/cameras';
import { bearing, lerp, smooth } from './layout';

export interface Walker {
  at: [number, number];
  when: number;
  heading: number;
  speed: number;
  size: number;
  feed: number;
  phase: number;
}

const LEGS: [number, number, number][] = [
  [1, 1, 0],
  [-1, -1, 0.5],
  [1, -1, 0.25],
  [-1, 1, 0.75],
];

export const LEG_SEGMENTS = 8;
export const NECK_SEGMENTS = 3;

const a = new THREE.Vector3();
const b = new THREE.Vector3();
const dir = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const m = new THREE.Matrix4();

export function setSegment(mesh: THREE.InstancedMesh, index: number, from: Vec3, to: Vec3, radius: number): void {
  a.set(...from);
  b.set(...to);
  dir.subVectors(b, a);
  const length = dir.length() || 1e-4;
  q.setFromUnitVectors(up, dir.divideScalar(length));
  s.set(radius, length, radius);
  m.compose(a.add(b).multiplyScalar(0.5), q, s);
  mesh.setMatrixAt(index, m);
  mesh.instanceMatrix.needsUpdate = true;
}

export function setBlob(mesh: THREE.InstancedMesh, index: number, at: Vec3, size: Vec3, yaw = 0, pitch = 0): void {
  q.setFromEuler(new THREE.Euler(0, yaw, pitch, 'YXZ'));
  a.set(...at);
  s.set(...size);
  m.compose(a, q, s);
  mesh.setMatrixAt(index, m);
  mesh.instanceMatrix.needsUpdate = true;
}

export interface WalkerMeshes {
  bodies: THREE.InstancedMesh;
  legs: THREE.InstancedMesh;
  necks: THREE.InstancedMesh;
  tufts: THREE.InstancedMesh;
}

export function walkerPosition(w: Walker, seconds: number): [number, number] {
  const [hx, hz] = bearing(w.heading);
  const d = w.speed * (seconds - w.when);
  return [w.at[0] + hx * d, w.at[1] + hz * d];
}

export function poseWalker(meshes: WalkerMeshes, index: number, w: Walker, seconds: number, floorAt: (x: number, z: number) => number): void {
  const k = w.size;
  const [hx, hz] = bearing(w.heading);
  const sx = -hz;
  const sz = hx;
  const travelled = w.speed * (seconds - w.when);
  const [px, pz] = walkerPosition(w, seconds);
  const stride = 4.6 * k;
  const sway = Math.sin(seconds * 0.9 + w.phase * 7);
  const high = 9.2 * k + 0.18 * k * Math.sin((travelled / stride) * Math.PI * 4 + w.phase) + 0.1 * sway;
  const base = floorAt(px, pz);
  const body: Vec3 = [px + sx * 0.25 * sway, base + high, pz + sz * 0.25 * sway];
  setBlob(meshes.bodies, index, body, [2.0 * k, 1.05 * k, 1.1 * k], Math.atan2(-hz, hx));
  LEGS.forEach(([fore, sideways, offset], j) => {
    const cycle = travelled / stride + offset + w.phase;
    const n = Math.floor(cycle);
    const f = cycle - n;
    const swing = smooth(0.72, 1, f);
    const along = stride * (n + swing - offset - w.phase + 0.36) + fore * 2.3 * k;
    const out = sideways * 1.9 * k;
    const fx = w.at[0] + hx * along + sx * out;
    const fz = w.at[1] + hz * along + sz * out;
    const foot: Vec3 = [fx, floorAt(fx, fz) + Math.sin(Math.PI * swing) * 1.5 * k, fz];
    const hip: Vec3 = [body[0] + hx * fore * 1.3 * k + sx * sideways * 0.6 * k, body[1], body[2] + hz * fore * 1.3 * k + sz * sideways * 0.6 * k];
    const knee: Vec3 = [lerp(hip[0], foot[0], 0.4) + (sx * sideways * 0.55 + hx * fore * 0.5) * k, lerp(hip[1], foot[1], 0.4) + 0.25 * k, lerp(hip[2], foot[2], 0.4) + (sz * sideways * 0.55 + hz * fore * 0.5) * k];
    setSegment(meshes.legs, index * LEG_SEGMENTS + j * 2, hip, knee, 0.17 * k);
    setSegment(meshes.legs, index * LEG_SEGMENTS + j * 2 + 1, knee, foot, 0.13 * k);
  });
  const feeding = w.feed * (0.5 + 0.5 * Math.sin(seconds * 0.55 + w.phase * 9)) + (w.feed > 0.9 ? 0.4 : 0);
  const down = Math.min(1, Math.max(0, feeding));
  const front: Vec3 = [body[0] + hx * 1.8 * k, body[1] + 0.2 * k, body[2] + hz * 1.8 * k];
  const reach = lerp(4.4, 5.2, down) * k;
  const tx = body[0] + hx * (1.8 * k + reach) + sx * 0.6 * sway;
  const tz = body[2] + hz * (1.8 * k + reach) + sz * 0.6 * sway;
  const tip: Vec3 = [tx, lerp(body[1] - 1.5 * k, floorAt(tx, tz) + 0.3, down), tz];
  const n1: Vec3 = [lerp(front[0], tip[0], 0.3), front[1] + lerp(1.5, 0.5, down) * k, lerp(front[2], tip[2], 0.3)];
  const n2: Vec3 = [lerp(front[0], tip[0], 0.72), lerp(front[1], tip[1], 0.5) + lerp(1.6, 1.2, down) * k, lerp(front[2], tip[2], 0.72)];
  const crown: Vec3 = [lerp(n2[0], tip[0], 0.5), lerp(n2[1], tip[1], 0.5), lerp(n2[2], tip[2], 0.5)];
  setSegment(meshes.necks, index * NECK_SEGMENTS, front, n1, 0.3 * k);
  setSegment(meshes.necks, index * NECK_SEGMENTS + 1, n1, n2, 0.24 * k);
  setSegment(meshes.necks, index * NECK_SEGMENTS + 2, n2, crown, 0.2 * k);
  setSegment(meshes.tufts, index, tip, crown, 0.6 * k);
}
