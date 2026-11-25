// The ground's mesh: square rings of cells that double in size outward from where the cameras stand, so there is a quarter metre under a near lens
// and sixty four metres at the escarpment. A finer ring's outer edge takes the coarser ring's heights, so there is no crack between them.
import * as THREE from 'three';

export function ringsGeometry(height: (x: number, z: number) => number, centre: [number, number], n: number, base: number, levels: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const w = n + 3;
  const h = new Float32Array(w * w);
  for (let level = 0; level < levels; level++) {
    const c = base * 2 ** level;
    const x0 = centre[0] - (n / 2) * c;
    const z0 = centre[1] - (n / 2) * c;
    for (let j = -1; j <= n + 1; j++) for (let i = -1; i <= n + 1; i++) h[(j + 1) * w + i + 1] = height(x0 + i * c, z0 + j * c);
    const at = (i: number, j: number): number => h[(j + 1) * w + i + 1] as number;
    if (level < levels - 1) {
      for (let i = 1; i < n; i += 2) {
        h[1 * w + i + 1] = (at(i - 1, 0) + at(i + 1, 0)) / 2;
        h[(n + 1) * w + i + 1] = (at(i - 1, n) + at(i + 1, n)) / 2;
        h[(i + 1) * w + 1] = (at(0, i - 1) + at(0, i + 1)) / 2;
        h[(i + 1) * w + n + 1] = (at(n, i - 1) + at(n, i + 1)) / 2;
      }
    }
    const lo = n / 4;
    const hi = (3 * n) / 4;
    const hole = (i: number, j: number): boolean => level > 0 && i >= lo && i < hi && j >= lo && j < hi;
    const slot = new Int32Array((n + 1) * (n + 1)).fill(-1);
    const vertex = (i: number, j: number): number => {
      const k = j * (n + 1) + i;
      if ((slot[k] as number) < 0) {
        slot[k] = pos.length / 3;
        pos.push(x0 + i * c, at(i, j), z0 + j * c);
        const dx = at(i + 1, j) - at(i - 1, j);
        const dz = at(i, j + 1) - at(i, j - 1);
        const len = Math.hypot(dx, 2 * c, dz);
        nor.push(-dx / len, (2 * c) / len, -dz / len);
      }
      return slot[k] as number;
    };
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        if (hole(i, j)) continue;
        const a = vertex(i, j);
        const b = vertex(i + 1, j);
        const d = vertex(i, j + 1);
        const e = vertex(i + 1, j + 1);
        idx.push(a, d, b, b, d, e);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
  g.computeBoundingSphere();
  return g;
}

/** A level patch of small cells, turned by `yaw` about its centre: for ground a lens stands close to. `paint` gives two more numbers a vertex. */
export function patchGeometry(
  height: (x: number, z: number) => number, centre: [number, number], along: [number, number], sizeU: number, sizeV: number, cell: number,
  paint: (x: number, z: number, edge: number) => [number, number],
): THREE.BufferGeometry {
  const nu = Math.round(sizeU / cell);
  const nv = Math.round(sizeV / cell);
  const side: [number, number] = [-along[1], along[0]];
  const place = (i: number, j: number): [number, number] => {
    const u = (i / nu - 0.5) * sizeU;
    const v = (j / nv - 0.5) * sizeV;
    return [centre[0] + along[0] * u + side[0] * v, centre[1] + along[1] * u + side[1] * v];
  };
  const w = nu + 3;
  const hs = new Float32Array(w * (nv + 3));
  for (let j = -1; j <= nv + 1; j++) {
    for (let i = -1; i <= nu + 1; i++) {
      const p = place(i, j);
      hs[(j + 1) * w + i + 1] = height(p[0], p[1]);
    }
  }
  const at = (i: number, j: number): number => hs[(j + 1) * w + i + 1] as number;
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3);
  const nor = new Float32Array((nu + 1) * (nv + 1) * 3);
  const extra = new Float32Array((nu + 1) * (nv + 1) * 2);
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const k = j * (nu + 1) + i;
      const p = place(i, j);
      const edge = Math.min(i, nu - i, j, nv - j) * cell;
      pos[k * 3] = p[0];
      pos[k * 3 + 1] = at(i, j) - (edge === 0 ? 0.4 : 0);
      pos[k * 3 + 2] = p[1];
      const du = (at(i + 1, j) - at(i - 1, j)) / (2 * cell);
      const dv = (at(i, j + 1) - at(i, j - 1)) / (2 * cell);
      const nx = -(du * along[0] + dv * side[0]);
      const nz = -(du * along[1] + dv * side[1]);
      const len = Math.hypot(nx, 1, nz);
      nor[k * 3] = nx / len;
      nor[k * 3 + 1] = 1 / len;
      nor[k * 3 + 2] = nz / len;
      const q = paint(p[0], p[1], edge);
      extra[k * 2] = q[0];
      extra[k * 2 + 1] = q[1];
    }
  }
  const idx = new Uint32Array(nu * nv * 6);
  let o = 0;
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i;
      idx[o++] = a;
      idx[o++] = a + nu + 1;
      idx[o++] = a + 1;
      idx[o++] = a + 1;
      idx[o++] = a + nu + 1;
      idx[o++] = a + nu + 2;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('aPaint', new THREE.BufferAttribute(extra, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
