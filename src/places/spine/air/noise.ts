// The one block of noise the cloud of the Spine is cut from: 64 x 64 x 64, repeating in all three directions.
// red: billows (round lumps at three sizes), green: smooth drifts (banks, wisps), blue: fine billows (the ragged edge),
// alpha: a second smooth field, unrelated to green (to push the others about). The recipe is the Heart's.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';

export const NOISE_SIZE = 64;

function lattice(rng: Rng, period: number): Float32Array {
  const g = new Float32Array(period * period * period * 3);
  for (let i = 0; i < period * period * period; i++) {
    const z = rng.range(-1, 1);
    const a = rng.range(0, Math.PI * 2);
    const r = Math.sqrt(1 - z * z);
    g[i * 3] = r * Math.cos(a);
    g[i * 3 + 1] = r * Math.sin(a);
    g[i * 3 + 2] = z;
  }
  return g;
}

function points(rng: Rng, period: number): Float32Array {
  const p = new Float32Array(period * period * period * 3);
  for (let i = 0; i < p.length; i++) p[i] = rng.next();
  return p;
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);

// Gradient noise that repeats every `period` cells. About -0.7 to 0.7.
function perlin(g: Float32Array, period: number, x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const fx = x - xi;
  const fy = y - yi;
  const fz = z - zi;
  const u = fade(fx);
  const v = fade(fy);
  const w = fade(fz);
  let sum = 0;
  for (let k = 0; k < 2; k++) {
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        const c = ((((zi + k) % period) * period + ((yi + j) % period)) * period + ((xi + i) % period)) * 3;
        const d = (g[c] as number) * (fx - i) + (g[c + 1] as number) * (fy - j) + (g[c + 2] as number) * (fz - k);
        sum += d * (i ? u : 1 - u) * (j ? v : 1 - v) * (k ? w : 1 - w);
      }
    }
  }
  return sum;
}

// 1 at a feature point, 0 a cell away: round lumps that repeat every `period` cells.
function lumps(p: Float32Array, period: number, x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  let best = 9;
  for (let k = -1; k <= 1; k++) {
    const ck = (zi + k + period) % period;
    for (let j = -1; j <= 1; j++) {
      const cj = (yi + j + period) % period;
      for (let i = -1; i <= 1; i++) {
        const ci = (xi + i + period) % period;
        const c = ((ck * period + cj) * period + ci) * 3;
        const dx = xi + i + (p[c] as number) - x;
        const dy = yi + j + (p[c + 1] as number) - y;
        const dz = zi + k + (p[c + 2] as number) - z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < best) best = d;
      }
    }
  }
  return 1 - Math.min(1, Math.sqrt(best));
}

export function bakeNoise(rng: Rng): THREE.Data3DTexture {
  const N = NOISE_SIZE;
  const gA = [4, 8, 16].map((p) => lattice(rng, p));
  const gB = [3, 6, 12].map((p) => lattice(rng, p));
  const gC = lattice(rng, 4);
  const wA = [3, 6, 12].map((p) => points(rng, p));
  const wB = [8, 16].map((p) => points(rng, p));
  const data = new Uint8Array(N * N * N * 4);
  const byte = (v: number): number => Math.round(255 * Math.min(1, Math.max(0, v)));
  let o = 0;
  for (let k = 0; k < N; k++) {
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = (i + 0.5) / N;
        const y = (j + 0.5) / N;
        const z = (k + 0.5) / N;
        const billow = 0.56 * lumps(wA[0] as Float32Array, 3, x * 3, y * 3, z * 3) + 0.29 * lumps(wA[1] as Float32Array, 6, x * 6, y * 6, z * 6) + 0.15 * lumps(wA[2] as Float32Array, 12, x * 12, y * 12, z * 12);
        const base = 0.5 + 0.9 * perlin(gC, 4, x * 4, y * 4, z * 4);
        // Lumps carried on a smooth field, so that the lumps gather into masses instead of filling space evenly.
        data[o] = byte(billow * 1.25 * (0.55 + 0.6 * base) + 0.12 * base);
        data[o + 1] = byte(0.5 + 0.62 * perlin(gA[0] as Float32Array, 4, x * 4, y * 4, z * 4) + 0.31 * perlin(gA[1] as Float32Array, 8, x * 8, y * 8, z * 8) + 0.16 * perlin(gA[2] as Float32Array, 16, x * 16, y * 16, z * 16));
        data[o + 2] = byte(0.62 * lumps(wB[0] as Float32Array, 8, x * 8, y * 8, z * 8) + 0.38 * lumps(wB[1] as Float32Array, 16, x * 16, y * 16, z * 16) + 0.12);
        data[o + 3] = byte(0.5 + 0.62 * perlin(gB[0] as Float32Array, 3, x * 3, y * 3, z * 3) + 0.31 * perlin(gB[1] as Float32Array, 6, x * 6, y * 6, z * 6) + 0.16 * perlin(gB[2] as Float32Array, 12, x * 12, y * 12, z * 12));
        o += 4;
      }
    }
  }
  const t = new THREE.Data3DTexture(data, N, N, N);
  t.format = THREE.RGBAFormat;
  t.type = THREE.UnsignedByteType;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.wrapR = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}
