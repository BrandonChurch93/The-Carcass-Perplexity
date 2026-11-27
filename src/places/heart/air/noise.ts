// The one block of noise every vapour of the Heart is cut from: 64 x 64 x 64, repeating in all three directions.
// red: billows (round lumps at three sizes, for the cauliflower of a plume), green: smooth drifts (banks, wisps),
// blue: fine billows (the ragged edge), alpha: a second smooth field, unrelated to green (to push the others about).
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

/** Toward the pale quarter of the sky, in the block's own space: the way the smoke is lit from. */
export const LUMPS_SKY: readonly [number, number, number] = [-0.58, 0.75, -0.29];
/** How far toward the sky the two shades of the block look, as shares of one repeat: the near one is the billow's own top and underside, the far one the mass over it. */
export const LUMPS_REACH = { near: 0.16, far: 0.5 };

// The block the bodies of smoke are cut from, lit before the film starts. red: the billows of the first block, as they are. green: the mean of
// those billows over the first tenth of a repeat toward the sky, blue: over the next third. alpha: the fine billows.
// A body reads its thickness and what stands between each point and the sky in one read, where it marched a second point toward the sky for
// every point it drew and knew nothing of the mass farther up. The means are taken of the field, not of a body cut from it: a body's own
// threshold is laid on each of the three alike.
export function bakeLumps(noise: THREE.Data3DTexture): { texture: THREE.Data3DTexture; mean: number } {
  const N = NOISE_SIZE;
  const from = noise.image.data as Uint8Array;
  const field = new Float32Array(N * N * N);
  let sum = 0;
  for (let i = 0; i < field.length; i++) {
    field[i] = (from[i * 4] as number) / 255;
    sum += field[i] as number;
  }
  // The taps lie at the same offsets from every cell, so each tap's eight neighbours and their weights are worked out once: the block is baked
  // in a few hundredths of a second where a read by floor and remainder for every tap of every cell took some tenths at every start.
  const TAPS = 6;
  const M = N - 1;
  const tap = (dx: number, dy: number, dz: number): { x: number; y: number; z: number; fx: number; fy: number; fz: number } => ({
    x: Math.floor(dx), y: Math.floor(dy), z: Math.floor(dz), fx: dx - Math.floor(dx), fy: dy - Math.floor(dy), fz: dz - Math.floor(dz),
  });
  const nearTaps = Array.from({ length: TAPS }, (_, t) => {
    const a = ((t + 0.5) / TAPS) * LUMPS_REACH.near * N;
    return tap(LUMPS_SKY[0] * a, LUMPS_SKY[1] * a, LUMPS_SKY[2] * a);
  });
  const farTaps = Array.from({ length: TAPS }, (_, t) => {
    const b = (LUMPS_REACH.near + ((t + 0.5) / TAPS) * (LUMPS_REACH.far - LUMPS_REACH.near)) * N;
    return tap(LUMPS_SKY[0] * b, LUMPS_SKY[1] * b, LUMPS_SKY[2] * b);
  });
  const mean = (taps: typeof nearTaps, i: number, j: number, k: number): number => {
    let total = 0;
    for (let t = 0; t < TAPS; t++) {
      const w = taps[t] as (typeof taps)[number];
      const x0 = (i + w.x) & M;
      const x1 = (x0 + 1) & M;
      const y0 = ((j + w.y) & M) * N;
      const y1 = ((j + w.y + 1) & M) * N;
      const z0 = ((k + w.z) & M) * N * N;
      const z1 = ((k + w.z + 1) & M) * N * N;
      const a = (field[z0 + y0 + x0] as number) * (1 - w.fx) + (field[z0 + y0 + x1] as number) * w.fx;
      const b = (field[z0 + y1 + x0] as number) * (1 - w.fx) + (field[z0 + y1 + x1] as number) * w.fx;
      const c = (field[z1 + y0 + x0] as number) * (1 - w.fx) + (field[z1 + y0 + x1] as number) * w.fx;
      const d = (field[z1 + y1 + x0] as number) * (1 - w.fx) + (field[z1 + y1 + x1] as number) * w.fx;
      total += (a * (1 - w.fy) + b * w.fy) * (1 - w.fz) + (c * (1 - w.fy) + d * w.fy) * w.fz;
    }
    return total / TAPS;
  };
  const data = new Uint8Array(N * N * N * 4);
  const byte = (v: number): number => Math.round(255 * Math.min(1, Math.max(0, v)));
  let o = 0;
  for (let k = 0; k < N; k++) {
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        data[o] = from[o] as number;
        data[o + 1] = byte(mean(nearTaps, i, j, k));
        data[o + 2] = byte(mean(farTaps, i, j, k));
        data[o + 3] = from[o + 2] as number;
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
  return { texture: t, mean: sum / field.length };
}
