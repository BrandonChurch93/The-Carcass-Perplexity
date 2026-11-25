// Smooth noise for shapes made at creation. Not for anything that runs each frame.
function hash(ix: number, iy: number): number {
  let h = (ix * 374761393 + iy * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 0 to 1, smooth, with a cell of one unit. */
export function vnoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** 0 to 1, a sum of `octaves` of vnoise, each at twice the grain and half the weight. */
export function fbm(x: number, y: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x, y);
    total += amp;
    x = x * 2.03 + 17.3;
    y = y * 2.03 + 9.1;
    amp *= 0.5;
  }
  return sum / total;
}

/** 0 to 1, ridges: sharp crests where the noise crosses its middle. */
export function ridged(x: number, y: number, octaves = 3): number {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * (1 - Math.abs(vnoise(x, y) * 2 - 1));
    total += amp;
    x = x * 2.1 + 5.7;
    y = y * 2.1 + 3.3;
    amp *= 0.5;
  }
  return sum / total;
}
