// Breaks the mesh of a cliff into blocks. A height field draws a cliff as one skin with a smooth outline; rock breaks along joints into
// blocks, and where a block has fallen the face stands back by the block's depth. Every vertex is moved back along its own normal by the
// depth of the block it lies in, so a face is cut back level, a table top is notched, and the outline against the sky steps as rock does.
// The land's height (`landHeight`, the rig's map) does not know of it: use it where nothing stands on the ground.
import * as THREE from 'three';

export interface Joints {
  /** The size of a block, metres: across, up, across. */
  cell: [number, number, number];
  /** How far the deepest block stands back, metres. */
  depth: number;
  /** A number of the set's own. */
  seed: number;
  /** How wide the joints themselves show, metres: the sky is closed off along every joint and deepest where a block stands back beside one that does not. */
  crease?: number;
}

function hash(i: number, j: number, k: number, seed: number): number {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177) ^ Math.imul(seed, 1103515245);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// The joints do not run with the map: the lattice is turned about the upright axis and its beds dip a little.
const C = 0.891;
const S = 0.454;

/** How far the block at a point stands back, 0 to 1: most blocks stand flush or nearly, a few are gone. */
export function blockAt(x: number, y: number, z: number, j: Joints): number {
  const px = (C * x + S * z) / j.cell[0];
  const pz = (-S * x + C * z) / j.cell[2];
  const py = (y + 0.11 * x - 0.07 * z) / j.cell[1];
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const iz = Math.floor(pz);
  let best = 1e9;
  let own = 0;
  for (let c = -1; c <= 1; c++) {
    for (let b = -1; b <= 1; b++) {
      for (let a = -1; a <= 1; a++) {
        const cx = ix + a;
        const cy = iy + b;
        const cz = iz + c;
        const dx = cx + 0.15 + 0.7 * hash(cx, cy, cz, j.seed) - px;
        const dy = cy + 0.15 + 0.7 * hash(cx, cy, cz, j.seed + 17) - py;
        const dz = cz + 0.15 + 0.7 * hash(cx, cy, cz, j.seed + 31) - pz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < best) {
          best = d;
          own = hash(cx, cy, cz, j.seed + 53);
        }
      }
    }
  }
  return own * own * own;
}

/** The block at a point and the one across its nearest joint (how far each stands back, 0 to 1), and how far the point lies from that joint, metres. */
export function jointAt(x: number, y: number, z: number, j: Joints): [number, number, number] {
  const px = (C * x + S * z) / j.cell[0];
  const pz = (-S * x + C * z) / j.cell[2];
  const py = (y + 0.11 * x - 0.07 * z) / j.cell[1];
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const iz = Math.floor(pz);
  let best = 1e9;
  let next = 1e9;
  let own = 0;
  let other = 0;
  for (let c = -1; c <= 1; c++) {
    for (let b = -1; b <= 1; b++) {
      for (let a = -1; a <= 1; a++) {
        const cx = ix + a;
        const cy = iy + b;
        const cz = iz + c;
        const dx = cx + 0.15 + 0.7 * hash(cx, cy, cz, j.seed) - px;
        const dy = cy + 0.15 + 0.7 * hash(cx, cy, cz, j.seed + 17) - py;
        const dz = cz + 0.15 + 0.7 * hash(cx, cy, cz, j.seed + 31) - pz;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < best) {
          next = best;
          other = own;
          best = d;
          own = hash(cx, cy, cz, j.seed + 53);
        } else if (d < next) {
          next = d;
          other = hash(cx, cy, cz, j.seed + 53);
        }
      }
    }
  }
  const gap = 0.5 * (Math.sqrt(next) - Math.sqrt(best)) * Math.min(j.cell[0], j.cell[1], j.cell[2]);
  return [own * own * own, other * other * other, gap];
}

/**
 * Cuts the blocks into a mesh that carries `aSlope` and `aLand`. `weight(x, y, z, ny)` says how much of the cut a vertex takes, 0 to 1
 * (`ny` is how far its normal looks up). The normals are made again from the cut mesh, and a block that stands back loses some of its sky.
 */
export function fracture(g: THREE.BufferGeometry, sets: readonly Joints[], weight: (x: number, y: number, z: number, ny: number) => number): void {
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const n = g.getAttribute('aSlope') as THREE.BufferAttribute;
  const land = g.getAttribute('aLand') as THREE.BufferAttribute | undefined;
  const total = sets.reduce((s, j) => s + j.depth, 0);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const w = weight(x, y, z, n.getY(i));
    if (w <= 0) continue;
    let back = 0;
    let crease = 0;
    let rim = 0;
    for (const j of sets) {
      if (j.crease === undefined) {
        back += j.depth * blockAt(x, y, z, j);
        continue;
      }
      const [own, other, gap] = jointAt(x, y, z, j);
      back += j.depth * own;
      // A joint is a dark line; the corner under or beside a block that stands proud is the darkest of the face.
      const at = Math.max(0, 1 - gap / j.crease);
      crease = Math.max(crease, at * at * Math.min(1, 0.22 + (Math.max(0, own - other) * j.depth) / 1.2));
      // The edge of a block that stands proud of its neighbour is broken pale and open to everything: the lit line beside the dark one.
      const edge = Math.max(0, 1 - Math.abs(gap / j.crease - 0.9) / 0.6);
      rim = Math.max(rim, edge * Math.min(1, (Math.max(0, other - own) * j.depth) / 1.2));
    }
    back *= w;
    p.setXYZ(i, x - n.getX(i) * back, y - n.getY(i) * back, z - n.getZ(i) * back);
    if (land) land.setX(i, Math.min(1, land.getX(i) + (0.45 * back) / total + (0.7 * crease - 0.35 * rim * (1 - crease)) * w));
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  const made = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    // A vertex no triangle uses has no normal: it keeps its slope.
    if (made.getX(i) === 0 && made.getY(i) === 0 && made.getZ(i) === 0) continue;
    // Whichever way the strips wind, the face looks the way the land did.
    const side = made.getX(i) * n.getX(i) + made.getY(i) * n.getY(i) + made.getZ(i) * n.getZ(i) < 0 ? -1 : 1;
    n.setXYZ(i, side * made.getX(i), side * made.getY(i), side * made.getZ(i));
  }
  g.deleteAttribute('normal');
  g.computeBoundingSphere();
}
