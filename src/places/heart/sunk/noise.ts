// Noise for shapes made at creation. Plain functions of position: the same answer every run.

function h3(x: number, y: number, z: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

const fade = (t: number): number => t * t * (3 - 2 * t);

export function noise2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const u = fade(x - ix);
  const v = fade(y - iy);
  const a = h3(ix, iy, 0);
  const b = h3(ix + 1, iy, 0);
  const c = h3(ix, iy + 1, 0);
  const d = h3(ix + 1, iy + 1, 0);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const u = fade(x - ix);
  const v = fade(y - iy);
  const w = fade(z - iz);
  const l = (dz: number): number => {
    const a = h3(ix, iy, iz + dz);
    const b = h3(ix + 1, iy, iz + dz);
    const c = h3(ix, iy + 1, iz + dz);
    const d = h3(ix + 1, iy + 1, iz + dz);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const p = l(0);
  return p + (l(1) - p) * w;
}

export function fbm2(x: number, y: number, octaves = 4): number {
  let s = 0;
  let a = 0.5;
  for (let i = 0; i < octaves; i++) {
    s += a * noise2(x, y);
    x = x * 2.03 + 17.3;
    y = y * 2.03 + 9.1;
    a *= 0.5;
  }
  return s;
}

export function fbm3(x: number, y: number, z: number, octaves = 4): number {
  let s = 0;
  let a = 0.5;
  for (let i = 0; i < octaves; i++) {
    s += a * noise3(x, y, z);
    x = x * 2.03 + 17.3;
    y = y * 2.03 + 9.1;
    z = z * 2.03 + 5.7;
    a *= 0.5;
  }
  return s;
}

/** Cells in the plane: distance to the nearest seed, distance to the nearest edge, and a number for the cell. */
export function cells2(x: number, y: number): [number, number, number] {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i + 0.1 + 0.8 * h3(ix + i, iy + j, 7);
      const cy = iy + j + 0.1 + 0.8 * h3(ix + i, iy + j, 13);
      const d = Math.hypot(cx - x, cy - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = h3(ix + i, iy + j, 29);
      } else if (d < f2) f2 = d;
    }
  }
  return [f1, 0.5 * (f2 - f1), id];
}

export const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
