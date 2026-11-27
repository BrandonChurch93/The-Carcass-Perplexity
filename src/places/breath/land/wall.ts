// The wall of the main shaft: dark bedded stone, broken along its courses and its upright joints, eaten back into a deep recess under every
// arch. The arches themselves are land/arches.ts, each a closed skin of its own: built from a picture's relief (as this file did) they were
// thin fluted ledges on striped strata, three rounds running. The wall is the part `shaft`, the arches are the part `hoops`.
import * as THREE from 'three';
import { DEPTH, RAD, rimRadius, sat, smooth } from '../land';
import { ARCHES, arch, archTop, archesOver, bandAt, brim, cap } from './arches';
import { noise3 } from './ribs';

/** The join, degrees: where the mesh of the wall begins and ends, under the south rim. */
const JOIN = 190;

// A lattice value that is the same wherever it is asked: 0 to 1.
const hash = (i: number, j: number): number => {
  let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
/** The courses of the wall, from the brim down: the depth each one begins at. A hand and a half to more than two metres thick, no two alike. */
const COURSES: number[] = [];
for (let k = 0, d = 0; d < 80; k++) {
  COURSES.push(d);
  d += 0.45 + 1.9 * hash(k, 91) ** 1.6;
}
/** How far the rock of the wall stands back from the plain wall at a place, metres: 0 to about 1.4. The wall between the ribs is bedded
 *  stone, broken along its beds and its upright joints: every course is set back its own way, and of the blocks a course is jointed into
 *  most are nearly flush and one in five has gone, leaving a hole a block wide with a ledge for a floor. `arc` is metres round the shaft. */
function courseBack(arc: number, depth: number): number {
  let k = 0;
  while (k + 1 < COURSES.length && (COURSES[k + 1] as number) <= depth) k++;
  // A course is eaten back along its length by the seep, in bays some metres long with no upright joints: jointed into blocks, with one
  // in five gone, it was a wall of laid bricks.
  const bay = noise3(arc * 0.085 + k * 3.1, k * 1.7, 2.2) + 0.35 * noise3(arc * 0.31, k * 5.3, 7.7);
  return 0.3 * hash(k, 39) + (0.35 + 0.6 * hash(k, 5)) * smooth((bay - 0.1) / 0.55) + 0.07 * noise3(arc * 0.9, k * 2.9, 4.1);
}

export interface WallPoint {
  at: [number, number, number];
  /** Metres round the shaft and metres up: the stains are laid by these. */
  u: number;
  v: number;
  /** How near an arch the place is, 0 to 1, and how much of the sky overhead the place sees. */
  relief: number;
  open: number;
}

/** The point of the wall at a bearing (radians) and a depth under the brim (metres). The arches are not of this mesh (land/arches.ts):
 *  the wall is the dark bedded stone they stand out of, eaten back into a recess under each one. */
export function wallPoint(b: number, depth: number): WallPoint {
  // The bearing as degrees from the join round to the join.
  let deg = b / RAD;
  deg -= 360 * Math.floor((deg - (JOIN - 360)) / 360);
  const r0 = rimRadius(b);
  // The wall starts a hand under the brim. Starting a finger over it, its dark back stood up past the shelf's edge as a black line along
  // the rim from a lens that stands low beside it.
  const top = brim(deg) - 0.12;
  const y = top - depth;
  const over = archesOver(deg, y);
  // The courses dip a little and wander.
  const hang = smooth(depth / 7) * (1.7 * noise3(deg * 0.031, 4.4, 1.2) + 0.7 * noise3(deg * 0.09, 9.1, 3.3));
  const down = sat(depth / (top + DEPTH));
  const inset = smooth(depth / 0.9);
  const back = smooth((depth - 0.25) / 0.5) * courseBack(deg * RAD * 30, depth + 0.6 * hang + 0.5 * noise3(deg * 0.11, 2.2, 8.1));
  // The wall is no cone: it has broad buttresses and hollows some metres across, and upright breaks where a sheet of it has come away.
  const broad = smooth(depth / 4) * (0.8 * noise3(deg * 0.06, y * 0.08, 3.3) + 0.45 * (1 - 2 * Math.abs(noise3(deg * 0.21 + 5, y * 0.11, 8.8))));
  // Flowstone: where water has run down the face it has left upright ribs a pace or two wide that drape over the courses.
  const fold = 1 - Math.abs(noise3(deg * 0.42, y * 0.05, 5.5));
  const drape = 0.55 * smooth(depth / 2.5) * fold * fold * fold * (0.55 + 0.45 * noise3(deg * 0.11, y * 0.09, 1.1));
  // The tiers carried on round the side that fell: each a band that stands a stride out of the wall.
  const band = bandAt(deg, y);
  const r = r0 + 0.03 - inset * 0.6 - 12 * down + back * (1 - 0.5 * over.back) * (1 - 0.6 * fold * fold) * (1 - band) + 2.3 * over.back + broad - drape * (1 - band) - 0.95 * band;
  return { at: [Math.sin(b) * r, y, -Math.cos(b) * r], u: deg * RAD * 30, v: y, relief: over.on, open: (1 - 0.88 * over.shut) * (1 - 0.3 * sat(back / 0.9)) };
}

/** The top of the arch of the nth tier down from the brim at a bearing (degrees): where a fallen block can lie. */
export function ledge(bearing: number, nth: number): [number, number, number] {
  return archTop(bearing, nth) ?? wallPoint(bearing * RAD, 6 + nth * 7).at;
}

/** The wall, and the arches that stand out of it. */
export function buildWall(): { ribs: THREE.BufferGeometry[]; wall: THREE.BufferGeometry } {
  const columns = 1056;
  // 17.5 cm rows for the 42 m a lens can see into; coarser below, in the mist.
  const fineRows = 240;
  const rows = fineRows + 40;
  const count = (columns + 1) * (rows + 1);
  const position = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const occ = new Float32Array(count);
  // Rows even in depth, as the wall had them. Laid along the wall's own outline instead (tried: evenly, and thick where it turns) they
  // took the lines off the tops of the ribs, but they made the ribs' tops and edges, most of what the far lens sees of the shaft, a mesh
  // of triangles a few pixels across, and that cost 3 to 6 s a sample at 4221.
  for (let j = 0; j <= rows; j++) {
    const depth = j <= fineRows ? j * 0.175 : 42 + ((j - fineRows) / 40) * (DEPTH - 42 + 2);
    for (let i = 0; i <= columns; i++) {
      const b = (JOIN - 360 + (i / columns) * 360) * RAD;
      const q = wallPoint(b, depth);
      const k = j * (columns + 1) + i;
      position.set(q.at, k * 3);
      uv[k * 2] = q.u;
      uv[k * 2 + 1] = q.v;
      occ[k] = q.open;
    }
  }
  // What the rock over a point leaves it of the sky. The wall here stands in its own shade, so a ledge shows by this and not by the sun:
  // under rock that stands out the face is dark, and the top and the brow of what stands out itself are open and pale. Asked of the
  // column over each point for two metres up; the edge of the dark is as wide as the ledge is deep.
  const reach = (k: number): number => Math.hypot(position[k * 3] as number, position[k * 3 + 2] as number);
  for (let j = 1; j <= fineRows; j++) {
    for (let i = 0; i <= columns; i++) {
      const k = j * (columns + 1) + i;
      const r = reach(k);
      let shut = 0;
      let clear = 1;
      for (let n = 1; n <= Math.min(j, 11); n++) {
        const over = r - reach(k - n * (columns + 1));
        shut = Math.max(shut, sat((over - 0.05 - 0.02 * n) / 0.45) * (1 - 0.07 * n));
        if (n <= 4) clear = Math.min(clear, sat((0.12 - over) / 0.3));
      }
      occ[k] = (occ[k] as number) * (1 - 0.6 * shut) * (1 + 0.35 * clear * smooth((j - 4) / 6));
    }
  }
  const all: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * (columns + 1) + i;
      const c = a + columns + 1;
      // Seen from inside the shaft.
      const quad = [a, c, a + 1, a + 1, c, c + 1];
      all.push(...quad);
    }
  }
  const wall = new THREE.BufferGeometry();
  wall.setAttribute('position', new THREE.BufferAttribute(position, 3));
  wall.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  wall.setAttribute('occ', new THREE.BufferAttribute(occ, 1));
  wall.setIndex(new THREE.BufferAttribute(new Uint32Array(all), 1));
  wall.computeVertexNormals();
  wall.computeBoundingSphere();
  // The arches: fine where a lens comes near, coarser down in the mist.
  const ribs = ARCHES.map((a) => arch(a, a.tier < 3 ? 0.15 : a.tier < 4 ? 0.22 : 0.34));
  ribs.push(cap(0.2));
  return { ribs, wall };
}
