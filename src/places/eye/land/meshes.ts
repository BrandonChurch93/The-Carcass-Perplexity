// The shapes of the land: the socket as a grid that follows the shore and the wall, the fine ground around the wide camera, and the brow.
import * as THREE from 'three';
import { DEG, shoreAt } from '../layout';
import { vnoise } from '../shared/noise';
import { BROW, browAt, landHeight, onAxis, wallAt } from './height';

/** The fine ground: metres out from the shore along the axis of the wide camera, and metres to its right. The socket's own grid is cut out here. */
export const PATCH = { along0: -6, along1: 236, across0: -112, across1: 92, cell: 0.6 };

const FACE = 62;
const BEACH = 30;

/** The whole socket, from just under the water at the shore to far out on the plateau. */
export function socketGeometry(): THREE.BufferGeometry {
  const COLS = 2048;
  const rows: ((foot: number) => number)[] = [];
  for (const d of [-5, -2.4, -0.8, 0, 0.8, 2, 4, 7, 11, 16, 22]) rows.push(() => d);
  const APRON = 56;
  for (let i = 0; i <= APRON; i++) rows.push((foot) => BEACH + (i / APRON) ** 1.15 * (foot - BEACH));
  const WALL = 46;
  for (let i = 1; i <= WALL; i++) rows.push((foot) => foot + (i / WALL) * FACE);
  for (const d of [6, 16, 34, 70, 130, 240, 420, 700, 1100, 1700, 2600, 4200, 7000]) rows.push((foot) => foot + FACE + d);
  const R = rows.length;
  const positions = new Float32Array((COLS + 1) * R * 3);
  for (let i = 0; i <= COLS; i++) {
    const a = ((i % COLS) / COLS) * Math.PI * 2;
    const shore = shoreAt(a / DEG);
    const foot = wallAt(a).foot;
    const sx = Math.sin(a);
    const sz = -Math.cos(a);
    for (let j = 0; j < R; j++) {
      const r = shore + (rows[j] as (foot: number) => number)(foot);
      const x = sx * r;
      const z = sz * r;
      const o = (i * R + j) * 3;
      positions[o] = x;
      positions[o + 1] = Math.max(-0.6, landHeight(x, z));
      positions[o + 2] = z;
    }
  }
  const index = new Uint32Array(COLS * (R - 1) * 6);
  let n = 0;
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < R - 1; j++) {
      const a = i * R + j;
      const b = (i + 1) * R + j;
      index[n++] = a;
      index[n++] = b;
      index[n++] = a + 1;
      index[n++] = b;
      index[n++] = b + 1;
      index[n++] = a + 1;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeVertexNormals();
  // The seam: the first and the last column are the same points.
  const normal = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let j = 0; j < R; j++) {
    const a = j;
    const b = COLS * R + j;
    const x = normal.getX(a) + normal.getX(b);
    const y = normal.getY(a) + normal.getY(b);
    const z = normal.getZ(a) + normal.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    normal.setXYZ(a, x / l, y / l, z / l);
    normal.setXYZ(b, x / l, y / l, z / l);
  }
  return g;
}

/** The fine ground of the spur and the ravine. Its rim is folded down so that no gap shows where it meets the socket. */
export function patchGeometry(): THREE.BufferGeometry {
  const { along0, along1, across0, across1, cell } = PATCH;
  const nu = Math.round((along1 - along0) / cell);
  const nv = Math.round((across1 - across0) / cell);
  const positions = new Float32Array((nu + 1) * (nv + 1) * 3);
  const normals = new Float32Array((nu + 1) * (nv + 1) * 3);
  const heights = new Float32Array((nu + 3) * (nv + 3));
  const W = nu + 3;
  for (let j = -1; j <= nv + 1; j++) {
    for (let i = -1; i <= nu + 1; i++) {
      const [x, z] = onAxis(along0 + i * cell, across0 + j * cell);
      heights[(j + 1) * W + i + 1] = Math.max(-0.6, landHeight(x, z));
    }
  }
  const h = (i: number, j: number): number => heights[(j + 1) * W + i + 1] as number;
  const [ox, oz] = onAxis(0, 0);
  const [ux, uz] = onAxis(1, 0);
  const [vx, vz] = onAxis(0, 1);
  const out: [number, number] = [ux - ox, uz - oz];
  const right: [number, number] = [vx - ox, vz - oz];
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const [x, z] = onAxis(along0 + i * cell, across0 + j * cell);
      const o = (j * (nu + 1) + i) * 3;
      const rim = i === 0 || j === 0 || i === nu || j === nv;
      positions[o] = x;
      positions[o + 1] = h(i, j) - (rim ? 7 : 0);
      positions[o + 2] = z;
      const du = (h(i + 1, j) - h(i - 1, j)) / (2 * cell);
      const dv = (h(i, j + 1) - h(i, j - 1)) / (2 * cell);
      const nx = -du * out[0] - dv * right[0];
      const nz = -du * out[1] - dv * right[1];
      const l = Math.hypot(nx, 1, nz);
      normals[o] = nx / l;
      normals[o + 1] = 1 / l;
      normals[o + 2] = nz / l;
    }
  }
  const index = new Uint32Array(nu * nv * 6);
  let n = 0;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      const b = a + nu + 1;
      index[n++] = a;
      index[n++] = a + 1;
      index[n++] = b;
      index[n++] = a + 1;
      index[n++] = b + 1;
      index[n++] = b;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

/** The brow: a roof of rock that hangs out from the east wall over the shore, swept along the wall. */
export function browGeometry(): THREE.BufferGeometry {
  const FROM = 22;
  const TO = 146;
  const COLS = 420;
  // The profile, around the section: [metres out from the wall behind (as a share of the reach), metres above the under side of the lip (as a share of the thickness), fixed metres up].
  const profile: [number, number, number][] = [
    [-0.55, -0.62, 0],
    [-0.2, -0.5, 0],
    [0.15, -0.36, 0],
    [0.45, -0.24, 0],
    [0.7, -0.13, 0],
    [0.88, -0.04, 0],
    [0.97, 0.06, 0],
    [1.0, 0.24, 0],
    [0.97, 0.5, 0],
    [0.9, 0.78, 0],
    [0.76, 1.0, 3],
    [0.55, 1.18, 8],
    [0.3, 1.34, 15],
    [0.05, 1.5, 24],
    [-0.2, 1.64, 36],
    [-0.5, 1.75, 52],
  ];
  const P = profile.length;
  const positions = new Float32Array((COLS + 1) * P * 3);
  for (let i = 0; i <= COLS; i++) {
    const b = FROM + ((TO - FROM) * i) / COLS;
    const a = b * DEG;
    const e = browAt(a);
    const wall = shoreAt(b) + wallAt(a).foot;
    const reach = BROW.reach * e * (0.82 + 0.36 * vnoise(b / 5.5, 1.7));
    const thick = BROW.thick * (0.35 + 0.65 * e) * (0.8 + 0.4 * vnoise(b / 7.3, 9.2));
    const level = BROW.lipLevel * (0.55 + 0.45 * e) + 9 * (vnoise(b / 9, 4.4) - 0.5);
    for (let j = 0; j < P; j++) {
      const [out, up, lift] = profile[j] as [number, number, number];
      const rough = 5 * (vnoise(b / 1.7 + j * 3.1, j * 1.3) - 0.5) + 2.2 * (vnoise(b / 0.5 + j, j * 2.7) - 0.5);
      const r = wall - out * reach + rough + 6;
      const y = level + up * thick + lift * e + 0.6 * rough;
      const o = (i * P + j) * 3;
      positions[o] = Math.sin(a) * r;
      positions[o + 1] = y;
      positions[o + 2] = -Math.cos(a) * r;
    }
  }
  const index = new Uint32Array(COLS * (P - 1) * 6);
  let n = 0;
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < P - 1; j++) {
      const a = i * P + j;
      const b = (i + 1) * P + j;
      index[n++] = a;
      index[n++] = b;
      index[n++] = a + 1;
      index[n++] = a + 1;
      index[n++] = b;
      index[n++] = b + 1;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeVertexNormals();
  return g;
}

/** A stone: a ball pushed about by noise, flattened, with corners. `seed` picks which. */
export function stoneGeometry(seed: number, detail = 2): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = vnoise(x * 1.3 + seed * 7.1, z * 1.3 + y * 1.7 + seed * 3.3);
    const b = vnoise(x * 3.1 + y * 2.3 + seed, z * 3.1 + seed * 5.7);
    // Planes cut into the ball make the faces and the corners of a broken block.
    let k = 0.96 + 0.1 * a + 0.05 * b;
    for (let c = 0; c < 9; c++) {
      const cx = Math.sin(seed * 12.9 + c * 4.1);
      const cy = Math.sin(seed * 7.3 + c * 2.7) * 0.9;
      const cz = Math.cos(seed * 5.1 + c * 3.3);
      const l = Math.hypot(cx, cy, cz);
      const d = (x * cx + y * cy + z * cz) / l;
      const cutAt = 0.5 + 0.22 * Math.sin(seed * 3.7 + c * 1.9);
      if (d * k > cutAt) k = cutAt / d;
    }
    k *= 1 + 0.035 * (b - 0.5);
    p.setXYZ(i, x * k, y * k * 0.72, z * k);
  }
  g.computeVertexNormals();
  return g;
}
