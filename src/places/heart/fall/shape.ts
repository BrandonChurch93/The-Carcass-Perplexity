// The shapes of the fall's folder: the cliff rebuilt round the mouth, the rim and the tube, and the bed the river runs in.
import * as THREE from 'three';
import { MOUTH, ground, lerp, smooth } from '../layout';
import { TUBE, type Course } from './path';

const fract = (v: number): number => v - Math.floor(v);
const hash = (i: number, j: number): number => fract(Math.sin(i * 127.1 + j * 311.7) * 43758.5453);

/** Value noise, 0 to 1, one cell a unit. */
export function noise2(x: number, z: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const u = x - i;
  const v = z - j;
  const a = u * u * (3 - 2 * u);
  const b = v * v * (3 - 2 * v);
  return lerp(lerp(hash(i, j), hash(i + 1, j), a), lerp(hash(i, j + 1), hash(i + 1, j + 1), a), b);
}

const fbm2 = (x: number, z: number): number => 0.5 * noise2(x, z) + 0.3 * noise2(x * 2.1 + 5.3, z * 2.1 + 1.7) + 0.2 * noise2(x * 4.3 + 9.1, z * 4.3 + 7.9);

/** The z at which the wall, before the alcove was cut, reaches height y: the cliff face as a surface over (x, y). */
export function faceZ(x: number, y: number): number {
  let z = -430;
  const step = 1.5;
  while (z > -545 && ground(x, z - step) < y) z -= step;
  let a = z;
  let b = z - step;
  for (let i = 0; i < 12; i++) {
    const m = 0.5 * (a + b);
    if (ground(x, m) < y) a = m;
    else b = m;
  }
  return 0.5 * (a + b);
}

/** A point of the arch at angle phi (0 at the east foot, pi at the west foot), scaled by k, at depth d behind the lip. */
function arch(phi: number, k: number, d: number, swell: number): [number, number] {
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const e = 2 / TUBE.power;
  const x = TUBE.axis(d) + k * swell * TUBE.half(d) * Math.sign(c) * Math.pow(Math.abs(c), e);
  const y = TUBE.floor + k * swell * TUBE.crown(d) * Math.sign(s) * Math.pow(Math.abs(s), e);
  return [x, y];
}

/** True where (x, y) lies inside the arch scaled by k, at the mouth. */
export function inArch(x: number, y: number, k: number): boolean {
  const qx = Math.abs(x - MOUTH.x) / (TUBE.half(0) * k);
  const qy = (y - TUBE.floor) / (TUBE.crown(0) * k);
  if (qy < -0.25) return false;
  return Math.pow(qx, TUBE.power) + Math.pow(Math.max(qy, 0), TUBE.power) < 1;
}

function finish(positions: number[], index: number[], extra: Record<string, { data: number[]; size: number }>): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  for (const name of Object.keys(extra)) {
    const e = extra[name] as { data: number[]; size: number };
    g.setAttribute(name, new THREE.Float32BufferAttribute(e.data, e.size));
  }
  g.setIndex(index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

const PHI0 = -0.13;
const PHI1 = Math.PI + 0.13;
const AROUND = 132;
const RIM = [1.0, 1.025, 1.06, 1.1, 1.15, 1.21, 1.28, 1.36, 1.45, 1.55];

/** How far the rim stands out of the cliff, metres, by angle. The crown overhangs most. */
const hood = (phi: number): number => 4.5 + 9.5 * Math.pow(Math.max(0, Math.sin(phi)), 1.5);
const rimShape = (k: number): number => smooth(1.5, 1.08, k) * (0.78 + 0.22 * smooth(1.0, 1.08, k)) - 0.35 * smooth(1.4, 1.55, k);
/** The rock is ragged: the arch swells and shrinks by a few metres round its edge and along its length. `rho` is metres outward from the rim (negative inside). */
const ragged = (phi: number, rho: number): number => 1 + 0.085 * (fbm2(phi * 5.2 + 3.1, rho / 13 + 0.7) - 0.5) * 2 + 0.03 * (noise2(phi * 21 + 1.3, rho / 3.4) - 0.5) * 2;

/**
 * The rim of the mouth and the tube behind it, as one skin: rings from the darkness at the back, forward to the rim, then outward over the cliff.
 * `aSkin`: x metres round the arch, y metres along the tube (negative inside), z is 1 inside the tube and 0 on the cliff.
 */
export function shell(): THREE.BufferGeometry {
  const positions: number[] = [];
  const skin: number[] = [];
  const index: number[] = [];
  const phis: number[] = [];
  for (let j = 0; j <= AROUND; j++) phis.push(lerp(PHI0, PHI1, j / AROUND));

  // The rim ring, on the face of the cliff and pushed out by the hood.
  const front = phis.map((phi) => {
    const [x, y] = arch(phi, 1, 0, ragged(phi, 0));
    return faceZ(x, Math.max(y, TUBE.floor - 6)) + hood(phi) * rimShape(1);
  });
  const mean = front.reduce((a, b) => a + b, 0) / front.length;

  const depths: number[] = [];
  for (let d = 0; d < TUBE.depth; d += Math.max(1.1, d * 0.085)) depths.push(d);
  depths.push(TUBE.depth);
  depths.reverse();

  const rings: number[][] = [];
  const ring = (make: (phi: number, j: number) => [number, number, number, number, number, number]): void => {
    const row: number[] = [];
    phis.forEach((phi, j) => {
      const [x, y, z, a, b, c] = make(phi, j);
      row.push(positions.length / 3);
      positions.push(x, y, z);
      skin.push(a, b, c);
    });
    rings.push(row);
  };
  const arc = (phi: number): number => phi * 62;

  for (const d of depths) {
    ring((phi, j) => {
      const z = lerp(front[j] as number, mean, smooth(0, 55, d)) - d;
      const [x, y] = arch(phi, 1, TUBE.lipZ - z, ragged(phi, -d));
      return [x, y, z, arc(phi), -d, smooth(0, 6, d)];
    });
  }
  for (let r = 1; r < RIM.length; r++) {
    const k = RIM[r] as number;
    ring((phi) => {
      const rho = (k - 1) * 70;
      const [x, y] = arch(phi, k, 0, ragged(phi, rho));
      const z = faceZ(x, Math.max(y, TUBE.floor - 14)) + hood(phi) * rimShape(k) + 1.4 * (noise2(x / 6, y / 6) - 0.5) * smooth(1.5, 1.2, k);
      return [x, y, z, arc(phi), rho, 0];
    });
  }
  for (let r = 0; r < rings.length - 1; r++) {
    const a = rings[r] as number[];
    const b = rings[r + 1] as number[];
    for (let j = 0; j < AROUND; j++) index.push(a[j] as number, b[j] as number, a[j + 1] as number, a[j + 1] as number, b[j] as number, b[j + 1] as number);
  }
  return finish(positions, index, { aSkin: { data: skin, size: 3 } });
}

/** The face of the cliff over the alcove, as the wall was before it was cut, with the arch left open. It lies just proud of the land and sinks under it at its edge. */
export function face(): THREE.BufferGeometry {
  const x0 = MOUTH.x - 84;
  const x1 = MOUTH.x + 84;
  const z0 = MOUTH.z - 74;
  const z1 = MOUTH.z + 2;
  const nx = Math.round((x1 - x0) / 1.4);
  const nz = Math.round((z1 - z0) / 0.55);
  const positions: number[] = [];
  const index: number[] = [];
  const open: boolean[] = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = lerp(x0, x1, i / nx);
      const z = lerp(z0, z1, j / nz);
      const edge = Math.min(x - x0, x1 - x, z - z0, z1 - z);
      const y = ground(x, z) + lerp(-2.5, 0.35, smooth(0, 9, edge));
      positions.push(x, y, z);
      open.push(inArch(x, y, 1.09) && z > MOUTH.z - 58);
    }
  }
  const w = nx + 1;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * w + i;
      const b = a + w;
      if (open[a] || open[a + 1] || open[b] || open[b + 1]) continue;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const skin = new Array<number>((positions.length / 3) * 3).fill(0);
  return finish(positions, index, { aSkin: { data: skin, size: 3 } });
}

export interface Bed {
  geometry: THREE.BufferGeometry;
  /** Height of the bed, lava included, at a point. */
  height(x: number, z: number): number;
}

const BED = { x0: MOUTH.x - 98, x1: MOUTH.x + 78, z0: TUBE.lipZ - TUBE.depth - 4, z1: -314, lip: TUBE.lipZ };

/**
 * The floor of the tube and the foot of the wall under the fall, with the river in it, as one sheet.
 * `aFlow`: x seconds from the lip, y metres from the middle of the stream, z half the stream's width, w metres from the lip.
 */
export function bed(course: Course, land: (x: number, z: number) => number): Bed {
  const height = (x: number, z: number): number => {
    const n = course.nearest(x, z);
    const u = n.distance / n.half;
    const d = BED.lip - z;
    // Inside: a floor that rises a little going in, turned up at the walls.
    const off = Math.abs(x - TUBE.axis(d)) / TUBE.half(d);
    const up = smooth(0.7, 1.08, off);
    const floor = TUBE.floor - 0.6 + 0.012 * Math.max(0, d) + 9 * up * up + 0.9 * (fbm2(x / 7, z / 7) - 0.5) * smooth(0.9, 1.25, u) + 0.9 * smooth(1.0, 1.2, u);
    // Outside: the land, with what the river has built on it. Levees beside the stream, spatter and lobes further out.
    const levee = 2.5 * Math.exp(-Math.pow((n.distance - n.half - 1.6) / 2.3, 2));
    const apron = 0.7 + 1.0 * smooth(n.half + 24, n.half + 4, n.distance);
    const bumps = (fbm2(x / 6.5, z / 6.5) - 0.5) * 2.2 * smooth(n.half, n.half + 7, n.distance) + (noise2(x / 1.5 + 7, z / 1.5) - 0.5) * 0.6;
    const rock = (apron + levee + bumps) * smooth(0.82, 1.08, u);
    const stream = u < 1.08 ? 1.1 + 0.6 * (1 - Math.min(1, u * u)) : 0;
    const edge = Math.min(x - BED.x0, BED.x1 - x, BED.z1 - z);
    const lift = lerp(-2.5, Math.max(rock, stream), smooth(0, 8, edge));
    const outside = Math.max(land(x, z), -3) + lift;
    return lerp(floor, outside, smooth(BED.lip - 5, BED.lip + 3, z));
  };

  const xs: number[] = [];
  for (let x = BED.x0; x <= BED.x1 + 1e-6; x += 0.7) xs.push(x);
  const zs: number[] = [];
  for (let z = BED.z1; z > BED.z0; z -= z > BED.lip - 4 ? 0.6 : Math.min(1.7, 0.6 + (BED.lip - 4 - z) * 0.02)) zs.push(z);
  zs.reverse();
  const positions: number[] = [];
  const flow: number[] = [];
  const within: number[] = [];
  const keep: boolean[] = [];
  for (const z of zs) {
    const d = BED.lip - z;
    for (const x of xs) {
      const n = course.nearest(x, z);
      const y = height(x, z);
      positions.push(x, y, z);
      flow.push(n.tau, n.distance, n.half, n.len);
      within.push(smooth(BED.lip + 2, BED.lip - 3, z));
      const inTube = Math.abs(x - TUBE.axis(d)) < TUBE.half(d) * 1.1 + 3;
      keep.push((z > BED.lip - 3 || inTube) && y > -2.2);
    }
  }
  const w = xs.length;
  const index: number[] = [];
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < w - 1; i++) {
      const a = j * w + i;
      const b = a + w;
      if (!(keep[a] && keep[a + 1] && keep[b] && keep[b + 1])) continue;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return { geometry: finish(positions, index, { aFlow: { data: flow, size: 4 }, aIn: { data: within, size: 1 } }), height };
}
