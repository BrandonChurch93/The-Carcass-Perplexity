// The surface of a signed distance field as one closed skin of shared vertices (surface nets: one vertex in every cell the surface crosses,
// one quad across every edge of the grid whose ends lie on either side). Done once at creation; a pure function of the field.

export interface Field {
  /** Signed distance in metres, negative inside. */
  (x: number, y: number, z: number): number;
}

export interface Shell {
  position: Float32Array;
  normal: Float32Array;
  index: Uint32Array;
  count: number;
}

export interface Box {
  min: [number, number, number];
  max: [number, number, number];
}

/** `cell` is the size of one cell in metres. `reach` is how far the field's value may be from the true distance near the surface. */
export function shell(field: Field, box: Box, cell: number, reach = 0.03): Shell {
  const BLOCK = 2;
  const nx = Math.ceil((box.max[0] - box.min[0]) / cell / BLOCK) * BLOCK + 1;
  const ny = Math.ceil((box.max[1] - box.min[1]) / cell / BLOCK) * BLOCK + 1;
  const nz = Math.ceil((box.max[2] - box.min[2]) / cell / BLOCK) * BLOCK + 1;
  const sx = nx;
  const sxy = nx * ny;
  const value = new Float32Array(nx * ny * nz).fill(1e3);
  const known = new Uint8Array(nx * ny * nz);
  const [ox, oy, oz] = box.min;
  // Only the blocks the surface can pass through are measured node by node.
  const far = (BLOCK * cell * Math.sqrt(3)) / 2 + reach + cell;
  for (let bk = 0; bk + BLOCK < nz + BLOCK - 1; bk += BLOCK) {
    for (let bj = 0; bj + BLOCK < ny + BLOCK - 1; bj += BLOCK) {
      for (let bi = 0; bi + BLOCK < nx + BLOCK - 1; bi += BLOCK) {
        const d = field(ox + (bi + BLOCK / 2) * cell, oy + (bj + BLOCK / 2) * cell, oz + (bk + BLOCK / 2) * cell);
        if (Math.abs(d) > far) {
          if (d < 0) for (let k = bk; k <= bk + BLOCK && k < nz; k++) for (let j = bj; j <= bj + BLOCK && j < ny; j++) for (let i = bi; i <= bi + BLOCK && i < nx; i++) if (!known[i + j * sx + k * sxy]) value[i + j * sx + k * sxy] = -1e3;
          continue;
        }
        for (let k = bk; k <= bk + BLOCK && k < nz; k++) {
          for (let j = bj; j <= bj + BLOCK && j < ny; j++) {
            for (let i = bi; i <= bi + BLOCK && i < nx; i++) {
              const at = i + j * sx + k * sxy;
              if (known[at]) continue;
              known[at] = 1;
              value[at] = field(ox + i * cell, oy + j * cell, oz + k * cell);
            }
          }
        }
      }
    }
  }

  const vertexOf = new Int32Array(nx * ny * nz).fill(-1);
  const pos: number[] = [];
  const corner = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const at = i + j * sx + k * sxy;
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const v = value[at + (c & 1) + ((c >> 1) & 1) * sx + ((c >> 2) & 1) * sxy] as number;
          corner[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let px = 0;
        let py = 0;
        let pz = 0;
        let n = 0;
        for (let a = 0; a < 8; a++) {
          for (let axis = 0; axis < 3; axis++) {
            const b = a | (1 << axis);
            if (b === a) continue;
            const va = corner[a] as number;
            const vb = corner[b] as number;
            if (va < 0 === vb < 0) continue;
            const t = va / (va - vb);
            px += (a & 1) + (axis === 0 ? t : 0);
            py += ((a >> 1) & 1) + (axis === 1 ? t : 0);
            pz += ((a >> 2) & 1) + (axis === 2 ? t : 0);
            n++;
          }
        }
        vertexOf[at] = pos.length / 3;
        pos.push(ox + (i + px / n) * cell, oy + (j + py / n) * cell, oz + (k + pz / n) * cell);
      }
    }
  }

  const index: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean): void => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) index.push(a, c, b, a, d, c);
    else index.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const at = i + j * sx + k * sxy;
        const v = (value[at] as number) < 0;
        if (v !== (value[at + 1] as number) < 0) quad(vertexOf[at - sx - sxy] as number, vertexOf[at - sxy] as number, vertexOf[at] as number, vertexOf[at - sx] as number, !v);
        if (v !== (value[at + sx] as number) < 0) quad(vertexOf[at - 1 - sxy] as number, vertexOf[at - 1] as number, vertexOf[at] as number, vertexOf[at - sxy] as number, !v);
        if (v !== (value[at + sxy] as number) < 0) quad(vertexOf[at - 1 - sx] as number, vertexOf[at - sx] as number, vertexOf[at] as number, vertexOf[at - 1] as number, !v);
      }
    }
  }

  const count = pos.length / 3;
  const position = new Float32Array(pos);
  const index32 = new Uint32Array(index);
  return { position, normal: normals(position, index32), index: index32, count };
}

/** The normal at each vertex from the faces round it, weighted by their area. */
export function normals(position: Float32Array, index: Uint32Array, into?: Float32Array): Float32Array {
  const out = into ?? new Float32Array(position.length);
  out.fill(0);
  for (let t = 0; t < index.length; t += 3) {
    const a = (index[t] as number) * 3;
    const b = (index[t + 1] as number) * 3;
    const c = (index[t + 2] as number) * 3;
    const ux = (position[b] as number) - (position[a] as number);
    const uy = (position[b + 1] as number) - (position[a + 1] as number);
    const uz = (position[b + 2] as number) - (position[a + 2] as number);
    const vx = (position[c] as number) - (position[a] as number);
    const vy = (position[c + 1] as number) - (position[a + 1] as number);
    const vz = (position[c + 2] as number) - (position[a + 2] as number);
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      out[v] = (out[v] as number) + nx;
      out[v + 1] = (out[v + 1] as number) + ny;
      out[v + 2] = (out[v + 2] as number) + nz;
    }
  }
  for (let v = 0; v < out.length; v += 3) {
    const l = Math.hypot(out[v] as number, out[v + 1] as number, out[v + 2] as number) || 1;
    out[v] = (out[v] as number) / l;
    out[v + 1] = (out[v + 1] as number) / l;
    out[v + 2] = (out[v + 2] as number) / l;
  }
  return out;
}
