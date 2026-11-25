// The shapes of the fall's folder: the cliff rebuilt round the mouth, the rim and the tube, and the bed the river runs in.
import * as THREE from 'three';
import { MOUTH, ground, lerp, smooth } from '../layout';
import { FAN_FROM, TUBE, type Course } from './path';

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

/**
 * Broken rock: the ground as blocks of about `size` metres, each with its own height and tilt, with a joint between neighbours.
 * Returns metres, about -1 to 1 times the size of a block's step.
 */
export function blocks(x: number, z: number, size: number, seed: number): number {
  const gx = x / size;
  const gz = z / size;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  let d1 = Infinity;
  let d2 = Infinity;
  let cx = 0;
  let cz = 0;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const px = ix + i + 0.15 + 0.7 * hash(ix + i + seed, iz + j);
      const pz = iz + j + 0.15 + 0.7 * hash(ix + i + 17.3, iz + j + seed);
      const d = Math.hypot(px - gx, pz - gz);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        cx = px;
        cz = pz;
        id = hash(ix + i + 3.1 * seed, iz + j + 9.7);
      } else if (d < d2) d2 = d;
    }
  }
  const tiltX = hash(id * 91.7, 2.3) - 0.5;
  const tiltZ = hash(id * 53.1, 7.9) - 0.5;
  const body = (id - 0.5) * 1.3 + 1.6 * (tiltX * (gx - cx) + tiltZ * (gz - cz));
  const joint = smooth(0, 0.16, d2 - d1);
  return lerp(-0.75, body, joint);
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
  if (qy < -0.03) return false;
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
  const arc = (phi: number): number => (phi - PHI0) * 62 + 1;

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

const BED = { x0: MOUTH.x - 98, x1: MOUTH.x + 78, z0: TUBE.lipZ - TUBE.depth - 4, z1: -312, lip: TUBE.lipZ };
const ridged = (x: number, z: number): number => 1 - Math.abs(2 * noise2(x, z) - 1);
/** The edge of the tube's floor is broken, not ruled. */
const LIP_Z = new Map<number, number>();
const lipAt = (x: number): number => {
  const key = Math.round(x * 4);
  let z = LIP_Z.get(key);
  if (z === undefined) {
    z = Math.max(BED.lip - 6, Math.min(BED.lip + 12, faceZ(key / 4, TUBE.floor - 0.6))) + 1.4 * (noise2(x / 9 + 3.7, 0.5) - 0.5);
    LIP_Z.set(key, z);
  }
  return z;
};
/** Rock that stands in the stream and parts it: 0 none, 1 an island. Long with the flow, on the benches and in the fan. */
const island = (len: number, across: number, half: number, speed: number): number => {
  if (len < 14) return 0;
  const field = noise2(len / 10.5 + 1.7, across / 3.6 + 4.2) + 0.3 * smooth(FAN_FROM, FAN_FROM + 16, len) - 0.3 * smooth(6, 10, speed);
  return smooth(0.6, 0.72, field) * smooth(0.95, 0.6, Math.abs(across) / half);
};

/**
 * The floor of the tube and what the river has built on the foot of the wall, with the river in it, as one sheet.
 * `aFlow`: x seconds from the lip, y metres from the middle of the stream (signed), z half the stream's width, w metres from the lip.
 * `aBank`: xy the unit vector on the ground toward the stream, z the height of the stream there, w its speed.
 */
export function bed(course: Course, land: (x: number, z: number) => number): Bed {
  const at = (x: number, z: number): { y: number; n: ReturnType<Course['nearest']>; under: number; isle: number; top: number } => {
    const n = course.nearest(x, z);
    const u = n.distance / n.half;
    const side = n.distance - n.half;
    const lip = lipAt(x);
    const d = lip - z;
    // Inside: a floor that rises a little going in, turned up at the walls.
    const off = Math.abs(x - TUBE.axis(Math.max(d, 0))) / TUBE.half(Math.max(d, 0));
    const up = smooth(0.7, 1.08, off);
    const level = TUBE.floor + 0.012 * Math.max(d, 0);
    const floor = lerp(n.y, level - 0.5 + 0.9 * smooth(1.0, 1.25, u) + 9 * up * up + 0.9 * (fbm2(x / 7, z / 7) - 0.5), smooth(0.9, 1.06, u));
    // Outside: the benches the river has built, a levee each side of it, their broken flanks, and its spatter on the ground beyond.
    const ground = Math.max(land(x, z), -3);
    const shelf = 2.5 + 7 * noise2(x / 13 + 1.3, z / 13 + 4.1) + 3 * noise2(n.len / 9, n.arm ? 3.5 : 9.5);
    const levee = (0.3 + 1.1 * noise2(n.len / 5 + 3.3, n.side * 2.5)) * Math.exp(-Math.pow((side - 1.1) / 1.3, 2)) + 0.35 * smooth(0, 1.0, side);
    const flank = Math.max(0, side - shelf);
    // The flank comes down in ledges. Fine relief is kept off the steep parts, where a height field would rule it into ribs.
    const drop = 1.25 * flank + 0.6 * Math.min(flank, 3);
    const beat = drop * 0.19 + 1.6 * noise2(x / 15, z / 15) + 0.5 * noise2(x / 4.1 + 8, z / 4.1);
    const tread = beat - Math.floor(beat);
    const fall = drop + 2.4 * (smooth(0.0, 0.5, tread) - tread) * smooth(0, 3, drop) * (0.3 + 1.3 * noise2(x / 9 + 4, z / 9));
    const crag = 1.6 * (ridged(x / 7.3 + 2.2, z / 7.3) - 0.5) + 2.3 * blocks(x, z, 5.2, 1) + 0.8 * blocks(x + 40, z, 1.9, 2);
    // In the fan the stream no longer stands on a bench: it lies on the slope as a sheet.
    const sheet = smooth(FAN_FROM, FAN_FROM + 16, n.len);
    const top = lerp(n.y, Math.max(ground, 0) + 0.45, sheet);
    const bench = top + levee * (1 - 0.6 * sheet) + Math.min(crag * smooth(0.3, 3.5, side), 0.5 + 0.12 * side) - fall;
    const cover = 0.9 + 0.5 * smooth(16, 4, side) + (fbm2(x / 5.5, z / 5.5) - 0.5) * 1.2 + (0.9 * blocks(x, z, 3.4, 3) + 0.45 * blocks(x + 20, z, 1.3, 4)) * smooth(26, 10, side);
    const skirt = ground + lerp(-2.4, cover, smooth(30, 15, side) * smooth(-0.6, 0.6, ground + 0.8 * smooth(6, 0, side)));
    const rock = Math.max(bench, skirt);
    const isle = island(n.len, n.distance * n.side, n.half, n.speed);
    const stream = top + 0.25 * (1 - Math.min(1, u * u)) + isle * (0.9 + 1.4 * noise2(x / 2.3, z / 2.3));
    const outside = lerp(stream, rock, smooth(0.9, 1.06, u));
    return { y: lerp(floor, outside, smooth(-1.5, 2.5, -d)), n, under: ground, isle, top };
  };

  const xs: number[] = [];
  for (let x = BED.x0; x <= BED.x1 + 1e-6; x += 0.7) xs.push(x);
  const zs: number[] = [];
  for (let z = BED.z1; z > BED.z0; z -= z > BED.lip - 8 ? 0.6 : Math.min(1.7, 0.6 + (BED.lip - 8 - z) * 0.02)) zs.push(z);
  zs.reverse();
  const positions: number[] = [];
  const flow: number[] = [];
  const bank: number[] = [];
  const within: number[] = [];
  const keep: boolean[] = [];
  for (const z of zs) {
    for (const x of xs) {
      const p = at(x, z);
      const d = lipAt(x) - z;
      positions.push(x, p.y, z);
      flow.push(p.n.tau, p.n.distance * p.n.side, p.n.half, p.n.len);
      bank.push(p.n.toward[0], p.n.toward[1], p.top, p.n.speed);
      within.push(smooth(-2, 3, d), p.n.distance, p.isle);
      const inTube = Math.abs(x - TUBE.axis(Math.max(d, 0))) < TUBE.half(Math.max(d, 0)) * 1.1 + 3;
      keep.push((d < -2.5 || inTube) && (d > 2 || (p.y > p.under - 1.6 && p.y > -0.6)));
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
  const extra = { aFlow: { data: flow, size: 4 }, aBank: { data: bank, size: 4 }, aIn: { data: within, size: 3 } };
  return { geometry: finish(positions, index, extra), height: (x, z) => at(x, z).y };
}
