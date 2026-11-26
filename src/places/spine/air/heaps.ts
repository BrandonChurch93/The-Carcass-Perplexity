// The heaps of the cloud sea: one square of cloud top seen from above, repeating in both directions, with its smaller copies.
// red: the heaps (round heads at three sizes, each smaller size standing on the larger, gathered into masses with hollows between),
// green: the small billows that roughen a head (three sizes, unrelated to red), blue: red spread wide (the body a head stands on, for
// telling a head from a hollow), alpha: a smooth field unrelated to the others (for pushing them about).
// Its smaller copies are made here and not by the renderer: a far heap is read from a small copy, so the deck goes flat toward the
// horizon by itself and nothing in it glitters.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';

export const HEAP_SIZE = 512;

function points(rng: Rng, period: number): Float32Array {
  const p = new Float32Array(period * period * 2);
  for (let i = 0; i < p.length; i++) p[i] = rng.next();
  return p;
}

function slopes(rng: Rng, period: number): Float32Array {
  const g = new Float32Array(period * period * 2);
  for (let i = 0; i < period * period; i++) {
    const a = rng.range(0, Math.PI * 2);
    g[i * 2] = Math.cos(a);
    g[i * 2 + 1] = Math.sin(a);
  }
  return g;
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const wrap = (i: number, period: number): number => ((i % period) + period) % period;

// Gradient noise that repeats every `period` cells, about -0.7 to 0.7.
function smooth(g: Float32Array, period: number, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fade(fx);
  const v = fade(fy);
  let sum = 0;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const c = (wrap(yi + j, period) * period + wrap(xi + i, period)) * 2;
      sum += ((g[c] as number) * (fx - i) + (g[c + 1] as number) * (fy - j)) * (i ? u : 1 - u) * (j ? v : 1 - v);
    }
  }
  return sum;
}

// A round head on every feature point: 1 at the point, 0 where it meets its neighbours, with a crease between two heads.
function heads(p: Float32Array, period: number, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let best = 9;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const c = (wrap(yi + j, period) * period + wrap(xi + i, period)) * 2;
      const dx = xi + i + (p[c] as number) - x;
      const dy = yi + j + (p[c + 1] as number) - y;
      const d = dx * dx + dy * dy;
      if (d < best) best = d;
    }
  }
  return Math.pow(Math.max(0, 1 - best / 0.8), 0.62);
}

export function bakeHeaps(rng: Rng): THREE.DataTexture {
  const N = HEAP_SIZE;
  const big = points(rng, 8);
  const mid = points(rng, 19);
  const small = points(rng, 44);
  const fineA = points(rng, 26);
  const fineB = points(rng, 60);
  const massA = slopes(rng, 3);
  const massB = slopes(rng, 7);
  const pushA = slopes(rng, 5);
  const pushB = slopes(rng, 11);
  const other = slopes(rng, 4);
  const fineC = points(rng, 130);
  const field = new Float32Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = (i + 0.5) / N;
      const y = (j + 0.5) / N;
      // Pushed about by a smooth field, so that no head is a circle and no row of them is straight.
      const px = x + 0.022 * smooth(pushA, 5, x * 5, y * 5) + 0.008 * smooth(pushB, 11, x * 11 + 0.5, y * 11);
      const py = y + 0.022 * smooth(pushA, 5, x * 5 + 2.5, y * 5 + 1.5) + 0.008 * smooth(pushB, 11, x * 11, y * 11 + 0.5);
      const mass = Math.min(1, Math.max(0, 0.5 + 0.8 * smooth(massA, 3, x * 3, y * 3) + 0.45 * smooth(massB, 7, x * 7, y * 7)));
      const a = heads(big, 8, px * 8, py * 8);
      const b = heads(mid, 19, px * 19, py * 19);
      const c = heads(small, 44, px * 44, py * 44);
      // A smaller head stands on a larger one: on its crown it is a knob, in the crease between two it is nearly gone.
      const heap = 0.56 * a + 0.3 * b * (0.3 + 0.7 * a) + 0.14 * c * (0.25 + 0.75 * b);
      const o = (j * N + i) * 4;
      field[o] = heap * (0.3 + 0.7 * mass) + 0.16 * mass;
      field[o + 1] = 0.52 * heads(fineA, 26, px * 26, py * 26) + 0.3 * heads(fineB, 60, px * 60, py * 60) + 0.18 * heads(fineC, 130, px * 130, py * 130);
      field[o + 3] = 0.5 + 0.7 * smooth(other, 4, x * 4, y * 4);
    }
  }
  // Blue: red spread over a sixteenth of the square, by the mean of a box drawn round each point (run along x, then along y).
  const reach = N / 32;
  const row = new Float32Array(N * N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let k = -reach; k <= reach; k++) sum += field[(j * N + wrap(i + k, N)) * 4] as number;
      row[j * N + i] = sum / (2 * reach + 1);
    }
  }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      let sum = 0;
      for (let k = -reach; k <= reach; k++) sum += row[wrap(j + k, N) * N + i] as number;
      field[(j * N + i) * 4 + 2] = sum / (2 * reach + 1);
    }
  }

  const half = (v: number): number => THREE.DataUtils.toHalfFloat(v);
  const pack = (from: Float32Array): Uint16Array => {
    const out = new Uint16Array(from.length);
    for (let k = 0; k < from.length; k++) out[k] = half(from[k] as number);
    return out;
  };
  const levels: { data: Uint16Array; width: number; height: number }[] = [{ data: pack(field), width: N, height: N }];
  let prev = field;
  for (let size = N / 2; size >= 1; size /= 2) {
    const next = new Float32Array(size * size * 4);
    const w = size * 2;
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        for (let q = 0; q < 4; q++) {
          const at = (j * 2 * w + i * 2) * 4 + q;
          next[(j * size + i) * 4 + q] = ((prev[at] as number) + (prev[at + 4] as number) + (prev[at + w * 4] as number) + (prev[at + w * 4 + 4] as number)) / 4;
        }
      }
    }
    levels.push({ data: pack(next), width: size, height: size });
    prev = next;
  }
  const t = new THREE.DataTexture(levels[0]?.data, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
  t.mipmaps = levels as unknown as THREE.DataTexture['mipmaps'];
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 1;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}
