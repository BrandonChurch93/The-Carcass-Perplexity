// The shapes of the fall's folder: the cliff rebuilt round the mouth, the rim and the tube, and the bed the river runs in.
import * as THREE from 'three';
import { MOUTH, ground, lerp, smooth } from '../layout';
import { FALL_FOOT } from '../shared/anchors';
import { FAN_FROM, SPLITS, TUBE, type Course } from './path';

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
const AROUND = 168;
const RIM = [1.0, 1.025, 1.06, 1.1, 1.15, 1.21, 1.28, 1.36, 1.45, 1.55];

/** How far the rim stands out of the cliff, metres, by angle. The crown overhangs most. */
const hood = (phi: number): number => 1 + 2 * Math.pow(Math.max(0, Math.sin(phi)), 1.5);
const rimShape = (k: number): number => smooth(1.5, 1.08, k) * (0.78 + 0.22 * smooth(1.0, 1.08, k)) - 0.35 * smooth(1.4, 1.55, k);
/** The outline of the arch is not a ruled curve: it leans, bulges and is notched, the same all the way in. `rho` is metres outward from the rim (negative inside). */
const outline = (phi: number, rho: number): number =>
  1 + 0.075 * (noise2(phi * 1.5 + 3.1, 0.7 + rho / 140) - 0.5) * 2 + 0.035 * (noise2(phi * 5 + 1.3, 2.2 + rho / 60) - 0.5) * 2 + 0.014 * blocks(phi * 62, rho, 4.5, 3);
/** The lip is cut back most at the upper west, above the pool, and that broad bevel is what the melt lights. Metres. */
const flare = (phi: number): number => 2 + 24 * Math.exp(-Math.pow((phi - 0.68 * Math.PI) / 0.6, 2)) + 5 * Math.exp(-Math.pow((phi - 0.3 * Math.PI) / 0.5, 2));
/** The roof goes back as a few big ribs: at each the tube steps in, more on one flank than the other, and partly opens again behind it. */
const RIBS = [
  { at: 13, step: 0.1 },
  { at: 36, step: 0.09 },
  { at: 66, step: 0.1 },
  { at: 104, step: 0.11 },
];
const ribbed = (phi: number, d: number): number => {
  let k = 1;
  RIBS.forEach((r, i) => {
    const at = r.at + 9 * (noise2(phi * 2.1 + i * 5.1, 0.3) - 0.5) + 3 * (noise2(phi * 9 + i * 2.3, 1.9) - 0.5);
    const a = r.step * (0.3 + 1.4 * noise2(phi * 1.7 + i * 3.7, 4.2));
    k -= a * smooth(at - 0.9, at + 0.9, d) - 0.55 * a * smooth(at + 3, at + 20, d);
  });
  return k;
};
/** The cut rock of the bevel and the first of the roof is broken in blocks a few metres across, some of them hanging. */
const crag = (phi: number, rho: number): number =>
  (0.022 * blocks(phi * 62, rho * 0.45, 9, 11) + 0.03 * (ridged(phi * 62 / 7 + 0.8 * noise2(rho / 12, 2.2), rho / 30) - 0.5) + 0.012 * (ridged(phi * 62 / 2.6, rho / 14 + 3) - 0.5)) *
  smooth(-60, -34, rho) *
  smooth(0, -2.5, rho) *
  (0.35 + 0.65 * Math.max(0, Math.sin(phi)));
const ragged = (phi: number, rho: number): number =>
  rho > -1e-6 ? outline(phi, rho) + flare(phi) / 70 + 0.03 * (noise2(phi * 21 + 1.3, rho / 3.4) - 0.5) * 2 * smooth(0, 3, rho) : (outline(phi, rho) + (flare(phi) / 70) * Math.exp(rho / 14) + crag(phi, rho)) * ribbed(phi, -rho);

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
  for (let d = 0; d < TUBE.depth; d += d < 112 ? 1.0 + d * 0.035 : d * 0.1) depths.push(d);
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
      const z = faceZ(x, Math.max(y, TUBE.floor - 14)) + hood(phi) * rimShape(k) + (1.4 * (noise2(x / 6, y / 6) - 0.5) + 1.5 * blocks(x, y, 6.5, 4) * smooth(1.0, 1.06, k)) * smooth(1.5, 1.2, k);
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

/** True where (x, y) lies inside the cut of the rim, bevel and all, with a little to spare: the hole the face of the cliff leaves for it. */
function inRim(x: number, y: number): boolean {
  const qx = (x - MOUTH.x) / TUBE.half(0);
  const qy = (y - TUBE.floor) / TUBE.crown(0);
  if (qy < -0.03) return false;
  const k = Math.pow(Math.pow(Math.abs(qx), TUBE.power) + Math.pow(Math.max(qy, 0), TUBE.power), 1 / TUBE.power);
  const c = Math.sign(qx) * Math.pow(Math.abs(qx) / Math.max(k, 1e-6), TUBE.power / 2);
  const s2 = Math.pow(Math.max(qy, 0) / Math.max(k, 1e-6), TUBE.power / 2);
  return k < ragged(Math.atan2(s2, c), 0) * (1.08 + 0.06 * smooth(0.15, 0.5, qy));
}

/** The face of the cliff over the alcove, as the wall was before it was cut, with the arch left open. It lies just proud of the land and sinks under it at its edge. */
export function face(): THREE.BufferGeometry {
  const x0 = MOUTH.x - (MOUTH.width / 2 + 15);
  const x1 = MOUTH.x + (MOUTH.width / 2 + 15);
  const z0 = MOUTH.z - 74;
  const z1 = MOUTH.z + 2;
  const nx = Math.round((x1 - x0) / 2);
  const nz = Math.round((z1 - z0) / 0.8);
  const positions: number[] = [];
  const index: number[] = [];
  const open: boolean[] = [];
  // Under the sill the land's own wall shows.
  const low: boolean[] = [];
  // How far each point is from the edge of the patch: the shader breaks the patch up there so the land shows through and no line is drawn.
  const edges: number[] = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = lerp(x0, x1, i / nx);
      const z = lerp(z0, z1, j / nz);
      const edge = Math.min(x - x0, x1 - x, z - z0, z1 - z);
      const y = ground(x, z) + lerp(-2.5, 0.35, smooth(0, 3, edge));
      positions.push(x, y, z);
      edges.push(0, edge, 0);
      open.push(inRim(x, y) && z > MOUTH.z - 58);
      low.push(y < TUBE.floor - 3 && x > MOUTH.x - 45);
    }
  }
  const w = nx + 1;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * w + i;
      const b = a + w;
      if (open[a] || open[a + 1] || open[b] || open[b + 1]) continue;
      if (low[a] && low[a + 1] && low[b] && low[b + 1]) continue;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return finish(positions, index, { aSkin: { data: edges, size: 3 } });
}

export interface Bed {
  geometry: THREE.BufferGeometry;
  /** Height of the bed, lava included, at a point. */
  height(x: number, z: number): number;
}

const BED = { x0: MOUTH.x - (MOUTH.width / 2 + 39), x1: MOUTH.x + (MOUTH.width / 2 + 19), z0: TUBE.lipZ - TUBE.depth - 4, z1: -262, lip: TUBE.lipZ };
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
/** Rock that stands in the stream and parts it: 0 none, 1 an island. Long with the flow. */
const island = (len: number, across: number, half: number): number => {
  let isle = 0;
  for (const at of SPLITS) isle = Math.max(isle, smooth(1, 0.55, Math.pow((len - at) / 5.2, 2) + Math.pow(across / (0.47 * half), 2)));
  return isle;
};

/** The apron ends at the lake a little beyond the anchor of the foot. */
const APRON_FOOT = FALL_FOOT[1] + 5;
const LIP_X = MOUTH.x - 22;
/** How far down the apron a point is: 0 at the lip, 1 at the lake. */
const down = (x: number, z: number): number => (z - lipAt(x)) / (APRON_FOOT - lipAt(x));
/**
 * The apron: one slope of rubble from the lip to the lake, steepest under the lip and easing a little toward the water.
 * This is its smooth surface along its middle; the ledges and the blocks are laid on it in `apronBase` and `bed`.
 */
export function apronSlope(x: number, z: number): number {
  const t = down(x, z);
  if (t <= 0) return TUBE.floor;
  if (t >= 1) return -8 * (t - 1);
  return TUBE.floor * Math.pow(1 - t, 1.2);
}
/** The same broken into ledges: the rock either side of the stream. The stream keeps the smooth slope and makes its own drops. */
export function apronBase(x: number, z: number): number {
  const t = down(x, z);
  if (t <= 0 || t >= 1) return apronSlope(x, z);
  const h = apronSlope(x, z);
  // The foot of the wall is old flows laid one on another: it comes down in ledges, each a tread and a riser, and their edges wander.
  const warp = 9 * (noise2(x / 41 + 1.3, z / 41 + 7.7) - 0.5) + 3 * (noise2(x / 12 + 4.1, z / 12 + 2.2) - 0.5);
  const v = (h + warp) / LEDGE;
  const i = Math.floor(v);
  const f = v - i;
  // A tread still falls at twenty degrees: the place is seen from the lake, and a level tread would hide the stream that crosses it.
  const tread = 0.66 + 0.14 * hash(i, 3.3);
  const g = f < tread ? (0.42 * f) / tread : 0.42 + 0.58 * smooth(tread, 1, f);
  const stepped = LEDGE * (i + g) - warp;
  // No ledges at the lip, where the stream leaves the floor, and none at the lake, where the fan lies.
  return lerp(h, Math.max(stepped, 0.3 * h), smooth(0.02, 0.1, t) * smooth(0.97, 0.8, t));
}
/** Metres from one ledge of the apron to the next. */
const LEDGE = 7;

/**
 * The floor of the tube and what the river has built on the foot of the wall, with the river in it, as one sheet.
 * `aFlow`: x seconds from the lip, y metres from the middle of the stream (signed), z half the stream's width, w metres from the lip.
 * `aBank`: xy the unit vector on the ground toward the stream, z the height of the stream there, w its speed.
 */
export function bed(course: Course, land: (x: number, z: number) => number): Bed {
  const at = (x: number, z: number): { y: number; n: ReturnType<Course['nearest']>; under: number; isle: number; top: number; on: number; far: number } => {
    const n = course.nearest(x, z);
    const u = n.distance / n.half;
    const side = n.distance - n.half;
    const lip = lipAt(x);
    const d = lip - z;
    // Inside: a floor that rises a little going in, turned up at the walls.
    const off = Math.abs(x - TUBE.axis(Math.max(d, 0))) / TUBE.half(Math.max(d, 0));
    const up = smooth(0.7, 1.08, off);
    const level = TUBE.floor + 0.012 * Math.max(d, 0);
    // Roof fall lies heaped on the floor each side of the river, highest against the walls, so the sill of the mouth is not a level line.
    const heap = (12 * Math.pow(smooth(0, 42, side - 1), 1.3) + 4.5 * (fbm2(x / 9 + 2, z / 9 + 3) - 0.5) * smooth(0, 8, side) + 1.6 * blocks(x, z, 4.2, 7) * smooth(1, 6, side)) * smooth(80, 25, d) * smooth(0.5, 17, d) * lerp(0.08, 1, smooth(-0.3, 0.3, n.toward[0]));
    // East of the pool the floor is a shelf of melt that has skinned over: level, a hand lower than the open melt, as far in as the eye goes.
    const shelf = smooth(0.3, -0.3, n.toward[0]) * smooth(0.95, 0.7, off) * smooth(70, 45, d);
    const floor = lerp(n.y, lerp(level - 0.5 + 0.9 * smooth(1.0, 1.25, u) + heap + 9 * up * up + 0.9 * (fbm2(x / 7, z / 7) - 0.5), n.y - 0.15 + 0.12 * noise2(x / 2.1, z / 2.1), shelf), smooth(0.9, 1.06, u));
    // Outside: the apron. It is 25 m wide under the lip and spreads to the lake; beyond its edge it falls away at the angle rubble lies at.
    const ground = Math.max(land(x, z), -3);
    const t = Math.min(1, Math.max(0, down(x, z)));
    const middle = lerp(LIP_X, FALL_FOOT[0] - 8, t);
    const reach = lerp(12.5, 41, Math.pow(t, 0.85)) + (13 * (noise2(z / 15 + (x < middle ? 0 : 7.7), 3.3) - 0.5) + 6 * (noise2(z / 5.5 + (x < middle ? 3 : 11.1), 6.1) - 0.5)) * smooth(0, 0.15, t);
    // Under the sill to the east the rubble leans on the wall as a shoulder, and the wall's bare panel there is under it.
    const out = Math.max(0, Math.abs(x - middle) - reach - (x > middle ? 26 * smooth(0.32, 0.04, t) : 0));
    const on = smooth(9, 0, out);
    const base = apronBase(x, z) - 0.8 * out - 0.012 * out * out + 5 * (fbm2(x / 23 + 3, z / 23 + 8) - 0.5) * smooth(0, 10, out);
    // Broad heaps, and blocks big enough for the sheet to hold; the smaller rubble is the shader's.
    const rubble = (1.4 * (fbm2(x / 12 + 5, z / 12) - 0.5) + 0.7 * (fbm2(x / 4.3 + 9, z / 4.3 + 2) - 0.5) + 1.25 * blocks(x, z, 3.7, 1) + 0.6 * blocks(x + 31, z + 17, 1.9, 5)) * (1 + 0.8 * smooth(0, 12, out));
    // In the fan the stream no longer keeps a bed: it lies on the slope as a sheet of crust with channels in it.
    const sheet = smooth(FAN_FROM, FAN_FROM + 12, n.len);
    // The fan is a flow a man's height thick that thins to its edge and goes out on the lake in lobes: nothing of it ends on a straight line.
    // Where the two small walkers of the fall's picture stand it is whole and level.
    const stood = Math.min(Math.hypot(x + 51.1, z + 298.4), Math.hypot(x + 28.3, z + 282.1));
    const lobe = u * lerp(0.74 + 0.55 * fbm2(x / 11 + 1.7, z / 11 + 4.1) + 0.12 * (noise2(x / 3.1, z / 3.1) - 0.5), 0.8, smooth(9, 4, stood));
    const body = 0.3 + 1.0 * smooth(1.0, 0.62, lobe) - 1.0 * smooth(0.9, 1.06, lobe);
    const top = lerp(n.y, Math.max(base, ground, 0) + body, sheet);
    // Beside the stream the rubble is what the stream has let stand: a low levee, then the slope. The bank on the lake's side is kept
    // below the stream, or from the shore the stream would hide behind it.
    const lakeward = n.len > 2 ? smooth(0.05, 0.6, n.toward[0] * 0.56 - n.toward[1] * 0.83) : 0;
    const levee = (0.25 + 0.55 * noise2(n.len / 4 + 3.3, n.side * 2.5)) * Math.exp(-Math.pow((side - 0.9) / 1.0, 2)) * (1 - lakeward);
    const near = smooth(1.2, 11, side);
    const bank = lerp(n.y + levee + 0.3 * smooth(0, 1.2, side) * (1 - lakeward) + 0.35 * rubble * smooth(0.3, 3, side), base + rubble, near) - 1.5 * lakeward * smooth(12, 0.5, side) * smooth(0, 1, side);
    const rock0 = Math.max(lerp(bank, Math.max(base, ground) + 0.25 * rubble, sheet * smooth(1.3, 1.0, u)), ground - 2.4);
    // Away from the apron the sheet does not go down the wall: it ends as a sill a little below the floor, and the wall under it is the wall.
    const far = smooth(6, 16, out);
    const rock = lerp(rock0, Math.max(rock0, TUBE.floor - 2 + 1.2 * (fbm2(x / 3.7, z / 3.7) - 0.5)), far * smooth(7, 2, -d));
    const isle = island(n.len, n.distance * n.side, n.half) * (1 - sheet);
    const stream = top + 0.2 * (1 - Math.min(1, u * u)) * (1 - sheet) + isle * (1.1 + 1.3 * noise2(x / 2.3, z / 2.3)) + 0.3 * sheet * (fbm2(x / 3.1, z / 3.1) - 0.5);
    const outside = lerp(stream, rock, smooth(0.9, 1.06, u));
    return { y: lerp(floor, outside, smooth(-1.5, 2.5, -d)), n, under: ground, isle, top, on: on * smooth(-1, 2, -d) - shelf * smooth(0.95, 1.1, u) * smooth(1.5, 4, d), far };
  };

  const xs: number[] = [];
  for (let x = BED.x0; x <= BED.x1 + 1e-6; x += 0.9) xs.push(x);
  const zs: number[] = [];
  for (let z = BED.z1; z > BED.z0; z -= z > -325 ? 1.3 : z > BED.lip - 8 ? 0.75 : Math.min(2.2, 0.75 + (BED.lip - 8 - z) * 0.03)) zs.push(z);
  zs.reverse();
  const positions: number[] = [];
  const flow: number[] = [];
  const bank: number[] = [];
  const within: number[] = [];
  const apron: number[] = [];
  const keep: boolean[] = [];
  for (const row of zs) {
    for (const x of xs) {
      // Near the lip the rows of the sheet are bent to run along it, so the drop over it is not cut into a saw by the grid.
      const z = row + (lipAt(x) - BED.lip) * smooth(45, 12, Math.abs(row - BED.lip));
      const p = at(x, z);
      const d = lipAt(x) - z;
      positions.push(x, p.y, z);
      flow.push(p.n.tau, p.n.distance * p.n.side, p.n.half, p.n.len);
      bank.push(p.n.toward[0], p.n.toward[1], p.top, p.n.speed);
      within.push(smooth(-2, 3, d), p.n.distance, p.isle);
      apron.push(p.on);
      const inTube = Math.abs(x - TUBE.axis(Math.max(d, 0))) < TUBE.half(Math.max(d, 0)) * 1.1 + 3;
      keep.push((d < -2.5 ? p.far < 0.5 : inTube) && (d > 2 || (p.y > p.under - 1.6 && p.y > -0.6)));
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
  const extra = { aFlow: { data: flow, size: 4 }, aBank: { data: bank, size: 4 }, aIn: { data: within, size: 3 }, aApron: { data: apron, size: 1 } };
  return { geometry: finish(positions, index, extra), height: (x, z) => at(x, z).y };
}
