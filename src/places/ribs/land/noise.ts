// Noise on the processor for the shapes of the land: the same every run, no state.
import { hash2 } from '../../../core/rng';

const INV = 1 / 4294967296;
const h2 = (x: number, y: number): number => hash2(x | 0, y | 0) * INV;
const h3 = (x: number, y: number, z: number): number => hash2(hash2(x | 0, y | 0), z | 0) * INV;
const fade = (t: number): number => t * t * (3 - 2 * t);

/** Value noise, 0 to 1. */
export function noise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const a = h2(xi, yi);
  const b = h2(xi + 1, yi);
  const c = h2(xi, yi + 1);
  const d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Value noise, 0 to 1. */
export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const u = fade(x - xi);
  const v = fade(y - yi);
  const w = fade(z - zi);
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
  const x00 = lerp(h3(xi, yi, zi), h3(xi + 1, yi, zi), u);
  const x10 = lerp(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u);
  const x01 = lerp(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u);
  const x11 = lerp(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}

export function fbm2(x: number, y: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x + i * 17.3, y - i * 9.1);
    total += amp;
    x *= 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return sum / total;
}

export function fbm3(x: number, y: number, z: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let total = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x + i * 17.3, y - i * 9.1, z + i * 5.7);
    total += amp;
    x *= 2.03;
    y *= 2.03;
    z *= 2.03;
    amp *= 0.5;
  }
  return sum / total;
}

/**
 * Cells of broken rock: the number of the cell a place lies in (0 to 1) and how far it is from the wall to the next cell, in cells.
 * One hash for each of the 27 cells round the place.
 */
export function cells3(x: number, y: number, z: number, out: { id: number; edge: number }): void {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  let f1 = 1e9;
  let f2 = 1e9;
  let id = 0;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dy = -1; dy <= 1; dy++) {
      const hy = hash2((yi + dy) | 0, (zi + dz) | 0);
      for (let dx = -1; dx <= 1; dx++) {
        const h = hash2((xi + dx) | 0, hy | 0);
        const px = xi + dx + 0.1 + 0.8 * ((h & 1023) / 1023) - x;
        const py = yi + dy + 0.1 + 0.8 * (((h >>> 10) & 1023) / 1023) - y;
        const pz = zi + dz + 0.1 + 0.8 * (((h >>> 20) & 1023) / 1023) - z;
        const d = px * px + py * py + pz * pz;
        if (d < f1) {
          f2 = f1;
          f1 = d;
          id = h;
        } else if (d < f2) f2 = d;
      }
    }
  }
  out.id = (hash2(id | 0, 77) >>> 0) * INV;
  out.edge = (Math.sqrt(f2) - Math.sqrt(f1)) * 0.5;
}

export const smooth = (lo: number, hi: number, v: number): number => {
  const k = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return k * k * (3 - 2 * k);
};
