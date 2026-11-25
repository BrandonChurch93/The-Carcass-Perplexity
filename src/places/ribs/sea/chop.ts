// One tiling picture of wind chop, made once on the processor: red and green the slope of the surface, blue its height, alpha a lace for foam.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';

export const CHOP_SIZE = 256;
/** A slope of 1 in the picture is this slope on a tile of unit size: the reader scales it by its own tile. */
export const CHOP_SLOPE = 0.9;

export function chopTexture(rng: Rng, windTo: [number, number]): THREE.DataTexture {
  const N = CHOP_SIZE;
  const waves: { kx: number; kz: number; a: number; p: number }[] = [];
  const windAngle = Math.atan2(windTo[1], windTo[0]);
  for (let i = 0; i < 56; i++) {
    const k = 2 + Math.floor(Math.pow(rng.next(), 1.7) * 30);
    const angle = windAngle + (rng.next() + rng.next() - 1) * 1.1;
    const kx = Math.round(Math.cos(angle) * k);
    const kz = Math.round(Math.sin(angle) * k);
    const kk = Math.hypot(kx, kz) || 1;
    waves.push({ kx, kz, a: Math.pow(kk, -1.45), p: rng.range(0, Math.PI * 2) });
  }
  const lace: { kx: number; kz: number; a: number; p: number }[] = [];
  for (let i = 0; i < 26; i++) {
    const k = 3 + Math.floor(rng.next() * 12);
    const angle = rng.range(0, Math.PI * 2);
    lace.push({ kx: Math.round(Math.cos(angle) * k), kz: Math.round(Math.sin(angle) * k), a: 1 / Math.sqrt(k), p: rng.range(0, Math.PI * 2) });
  }
  const h = new Float32Array(N * N);
  const sx = new Float32Array(N * N);
  const sz = new Float32Array(N * N);
  const la = new Float32Array(N * N);
  const lb = new Float32Array(N * N);
  const w = (Math.PI * 2) / N;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      let hh = 0;
      let gx = 0;
      let gz = 0;
      for (const wv of waves) {
        const ph = w * (wv.kx * i + wv.kz * j) + wv.p;
        const c = Math.cos(ph);
        const s = Math.sin(ph);
        // Peaked crests, flat troughs.
        hh += wv.a * (c + 0.3 * Math.cos(2 * ph));
        const d = -wv.a * (s + 0.6 * Math.sin(2 * ph));
        gx += d * wv.kx;
        gz += d * wv.kz;
      }
      let a = 0;
      let b = 0;
      lace.forEach((wv, n) => {
        const v = wv.a * Math.cos(w * (wv.kx * i + wv.kz * j) + wv.p);
        if (n % 2) a += v;
        else b += v;
      });
      const at = j * N + i;
      h[at] = hh;
      sx[at] = gx;
      sz[at] = gz;
      la[at] = a;
      lb[at] = b;
    }
  }
  let hMax = 0;
  let sMax = 0;
  let lMax = 0;
  for (let i = 0; i < N * N; i++) {
    hMax = Math.max(hMax, Math.abs(h[i] as number));
    sMax = Math.max(sMax, Math.abs(sx[i] as number), Math.abs(sz[i] as number));
    lMax = Math.max(lMax, Math.abs(la[i] as number), Math.abs(lb[i] as number));
  }
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = Math.round(255 * (0.5 + 0.5 * (sx[i] as number) / sMax));
    data[i * 4 + 1] = Math.round(255 * (0.5 + 0.5 * (sz[i] as number) / sMax));
    data[i * 4 + 2] = Math.round(255 * (0.5 + 0.5 * (h[i] as number) / hMax));
    // Lace: thin bright lines where two fields cross zero together, with holes between.
    const line = 1 - Math.min(1, (Math.abs(la[i] as number) / lMax) * 5.5);
    const blot = 0.5 + 0.5 * (lb[i] as number) / lMax;
    data[i * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, 0.75 * line * line + 0.55 * blot * blot)));
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Distance in metres from the sea to the nearest blade's foot at sea level, 0 to `reach`, as a picture over `rect`. */
export function feetTexture(rect: { minX: number; maxX: number; minZ: number; maxZ: number }, feet: { x: number; z: number; a: number; b: number; yaw: number }[], reach: number): THREE.DataTexture {
  const W = 500;
  const H = 920;
  const data = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = rect.minX + ((i + 0.5) / W) * (rect.maxX - rect.minX);
      const z = rect.minZ + ((j + 0.5) / H) * (rect.maxZ - rect.minZ);
      let d = reach;
      for (const f of feet) {
        const dx = x - f.x;
        const dz = z - f.z;
        const u = dx * Math.cos(f.yaw) + dz * Math.sin(f.yaw);
        const v = -dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw);
        const q = Math.hypot(u / f.a, v / f.b);
        d = Math.min(d, (q - 1) * Math.min(f.a, f.b));
      }
      const at = (j * W + i) * 4;
      data[at] = Math.round(255 * Math.min(1, Math.max(0, d / reach)));
      data[at + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

/** White water has no direction: a tiling picture of round heads. r: soft cloud, g: heads with sharp creases between (cauliflower), b: fine grain, a: heads at a smaller size. */
export function foamTexture(rng: Rng): THREE.DataTexture {
  const N = 256;
  const octave = (period: number): Float32Array => {
    const lattice = new Float32Array(period * period);
    for (let i = 0; i < lattice.length; i++) lattice[i] = rng.next();
    const out = new Float32Array(N * N);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = (i / N) * period;
        const y = (j / N) * period;
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const fx = x - x0;
        const fy = y - y0;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        const at = (a: number, b: number): number => lattice[(b % period) * period + (a % period)] as number;
        out[j * N + i] = (at(x0, y0) * (1 - ux) + at(x0 + 1, y0) * ux) * (1 - uy) + (at(x0, y0 + 1) * (1 - ux) + at(x0 + 1, y0 + 1) * ux) * uy;
      }
    }
    return out;
  };
  const sum = (periods: number[], billow: boolean): Float32Array => {
    const out = new Float32Array(N * N);
    let amp = 1;
    let total = 0;
    for (const period of periods) {
      const o = octave(period);
      for (let i = 0; i < out.length; i++) out[i] = (out[i] as number) + amp * (billow ? Math.abs(2 * (o[i] as number) - 1) : (o[i] as number));
      total += amp;
      amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] = (out[i] as number) / total;
    return out;
  };
  const soft = sum([4, 8, 16, 32], false);
  const heads = sum([5, 10, 20, 40], true);
  const grain = sum([24, 48, 96], false);
  const small = sum([11, 22, 44, 88], true);
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = Math.round(255 * (soft[i] as number));
    data[i * 4 + 1] = Math.round(255 * Math.min(1, (heads[i] as number) * 1.7));
    data[i * 4 + 2] = Math.round(255 * (grain[i] as number));
    data[i * 4 + 3] = Math.round(255 * Math.min(1, (small[i] as number) * 1.7));
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}
