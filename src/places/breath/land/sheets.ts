// The shelf is drawn as three sheets, each coarser than the one inside it: the fine one round the shaft (land/field.ts), the middle one
// out to 200 m, the far one out to the haze. Where two of them meet they are one surface: the outer sheet's edge is drawn in to the inner
// sheet's own edge and stands at its height, and every normal is taken from the ground as it lies before the part that is hidden under
// the inner sheet is sunk. Sunk first, the ring of the sheet beside the fall leaned into it, and the join was a dark line across the
// flats (frame 4409: the north edge of the fine sheet 112 m from the lens, and the north edge of the middle one at 242 m).
import * as THREE from 'three';
import { terrain } from '../../../core/blockout';
import { DEPTH, FINE, NEAR, ground, lerp, smooth } from '../land';

/** The ground as the far sheet draws it: the true ground at the corners of its cells, straight between them. */
function coarse(x: number, z: number, cell: number): number {
  const i = Math.floor(x / cell);
  const j = Math.floor(z / cell);
  const u = x / cell - i;
  const v = z / cell - j;
  const h = (a: number, b: number): number => ground(a * cell, b * cell);
  return lerp(lerp(h(i, j), h(i + 1, j), u), lerp(h(i, j + 1), h(i + 1, j + 1), u), v);
}

/** The middle sheet. Its outer edge lies on the far sheet's (cells of `farCell` metres), its inner edge on the fine sheet's. */
export function midSheet(cells: number, farCell: number): THREE.BufferGeometry {
  const cell = NEAR / cells;
  const x0 = FINE.minX;
  const x1 = FINE.minX + FINE.size;
  const z0 = FINE.minZ;
  const z1 = FINE.minZ + FINE.size;
  const g = new THREE.PlaneGeometry(NEAR, NEAR, cells, cells);
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const sunk = new Uint8Array(p.count);
  const reach = cell * 0.999;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let z = p.getZ(i);
    if (x > x0 && x < x1 && z > z0 && z < z1) {
      // Under the fine sheet. The first ring inside is drawn out to the fine sheet's edge, the rest goes under.
      if (Math.min(x - x0, x1 - x, z - z0, z1 - z) >= reach) sunk[i] = 1;
      else {
        if (x - x0 < reach) x = x0;
        else if (x1 - x < reach) x = x1;
        if (z - z0 < reach) z = z0;
        else if (z1 - z < reach) z = z1;
      }
    }
    const edge = NEAR / 2 - Math.max(Math.abs(x), Math.abs(z));
    const k = smooth(edge / 12);
    p.setXYZ(i, x, k < 1 ? lerp(coarse(x, z, farCell), ground(x, z), k) : ground(x, z), z);
  }
  g.computeVertexNormals();
  for (let i = 0; i < p.count; i++) if (sunk[i] === 1) p.setY(i, -DEPTH - 6);
  p.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

/** The far sheet: sunk under the middle one, its normals those of the ground it would have been. */
export function farSheet(world: number, cells: number): THREE.BufferGeometry {
  const g = terrain(world, world, cells, cells, ground);
  g.computeVertexNormals();
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i)) < NEAR / 2 - 1 && Math.abs(p.getZ(i)) < NEAR / 2 - 1) p.setY(i, -DEPTH - 12);
  p.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}
