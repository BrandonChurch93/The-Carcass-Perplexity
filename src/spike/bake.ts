import * as THREE from 'three';
import { config } from '../config';
import { hashString, mix32 } from '../core/rng';

export const WORLD = 3600;
export const MAP = 1024;
export const SUN = new THREE.Vector3(0.7, 0.407, 0.587).normalize();

const seedOf = (name: string): number => hashString(`spike/${name}`, config.seed);

function cell(ix: number, iy: number, seed: number): number {
  return mix32(Math.imul(ix, 0x9e3779b1) ^ Math.imul(iy, 0x85ebca77) ^ seed) / 4294967296;
}

function cell3(ix: number, iy: number, iz: number, seed: number): number {
  return mix32(Math.imul(ix, 0x9e3779b1) ^ Math.imul(iy, 0x85ebca77) ^ Math.imul(iz, 0xc2b2ae3d) ^ seed) / 4294967296;
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const wrap = (i: number, period: number): number => (period ? ((i % period) + period) % period : i);

function noise(x: number, y: number, seed: number, px = 0, py = px): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const ux = fade(x - ix);
  const uy = fade(y - iy);
  const x0 = wrap(ix, px);
  const x1 = wrap(ix + 1, px);
  const y0 = wrap(iy, py);
  const y1 = wrap(iy + 1, py);
  const a = cell(x0, y0, seed);
  const b = cell(x1, y0, seed);
  const c = cell(x0, y1, seed);
  const d = cell(x1, y1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, seed: number, octaves: number, px = 0, py = px): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * f, y * f, seed + o * 101, px * f, py * f);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

function ridged(x: number, y: number, seed: number, octaves: number, px = 0, py = px): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  let weight = 1;
  for (let o = 0; o < octaves; o++) {
    const r = 1 - Math.abs(2 * noise(x * f, y * f, seed + o * 101, px * f, py * f) - 1);
    const v = r * r * weight;
    weight = Math.min(1, Math.max(0, v * 2));
    sum += amp * v;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

function noise3(x: number, y: number, z: number, seed: number, period: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const ux = fade(x - ix);
  const uy = fade(y - iy);
  const uz = fade(z - iz);
  const x0 = wrap(ix, period);
  const x1 = wrap(ix + 1, period);
  const y0 = wrap(iy, period);
  const y1 = wrap(iy + 1, period);
  const z0 = wrap(iz, period);
  const z1 = wrap(iz + 1, period);
  const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
  const front = lerp(lerp(cell3(x0, y0, z0, seed), cell3(x1, y0, z0, seed), ux), lerp(cell3(x0, y1, z0, seed), cell3(x1, y1, z0, seed), ux), uy);
  const back = lerp(lerp(cell3(x0, y0, z1, seed), cell3(x1, y0, z1, seed), ux), lerp(cell3(x0, y1, z1, seed), cell3(x1, y1, z1, seed), ux), uy);
  return lerp(front, back, uz);
}

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const centre = (z: number): number => 180 * Math.sin(z / 700);

const S = {
  width: seedOf('width'),
  shore: seedOf('shore'),
  ridge: seedOf('ridge'),
  rough: seedOf('rough'),
  swell: seedOf('swell'),
  isle: seedOf('isle'),
  heat: seedOf('heat'),
  tone: seedOf('tone'),
};

export interface Ground {
  height: number;
  lake: number;
  heat: number;
  tone: number;
}

export function ground(x: number, z: number): Ground {
  const d = Math.abs(x - centre(z));
  const end = smooth(1150, 1650, z) + smooth(-1500, -1750, z);
  const half = (430 + 140 * (2 * fbm(z / 800, 7.3, S.width, 2) - 1) + 70 * (2 * fbm(x / 170, z / 170, S.shore, 3) - 1)) * (1 - end);
  const s = d - half;
  const isleNoise = s < -40 ? fbm(x / 310, z / 310, S.isle, 3) : 0;
  const isle = smooth(0.66, 0.78, isleNoise) * smooth(70, 190, d);
  const lake = (1 - smooth(-5, 5, s)) * (1 - smooth(0.02, 0.2, isle));
  const tone = fbm(x / 37, z / 37, S.tone, 4);
  let rock = 0;
  if (lake < 1) {
    const out = Math.max(s, 0);
    const rough = fbm(x / 95, z / 95, S.rough, 4);
    const cliff = 120 * smooth(0, 95, out) * (0.7 + 0.6 * rough);
    const far = out > 120 ? 330 * smooth(120, 950, out) * ridged(x / 640, z / 640, S.ridge, 5) : 0;
    rock = 3 + cliff + far + 30 * rough * smooth(0, 70, out) + isle * (55 + 60 * rough);
  }
  const swell = lake > 0 ? 1.6 * (fbm(x / 260, z / 260, S.swell, 3) - 0.5) : 0;
  const margin = smooth(-70, -8, s);
  const heat = lake > 0 ? Math.min(1, smooth(0.38, 0.72, fbm(x / 430, z / 430, S.heat, 3)) + 0.7 * margin + 0.8 * smooth(0, 0.05, isle)) : 0;
  return { height: rock * (1 - lake) + swell * lake, lake, heat, tone };
}

const half16 = (v: number): number => THREE.DataUtils.toHalfFloat(v);

export interface Baked {
  map: THREE.DataTexture;
  slope: THREE.DataTexture;
  detail: THREE.DataTexture;
  fume: THREE.Data3DTexture;
  heights: Float32Array;
}

function dataTexture(data: Uint16Array, size: number): THREE.DataTexture {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

function blurred(source: Float32Array, size: number, radius: number, passes: number): Float32Array {
  let a = source;
  let b = new Float32Array(size * size);
  const width = 2 * radius + 1;
  const pass = (from: Float32Array, to: Float32Array, stride: number, line: number): void => {
    for (let l = 0; l < size; l++) {
      const base = l * line;
      let sum = 0;
      for (let i = -radius; i <= radius; i++) sum += from[base + Math.min(size - 1, Math.max(0, i)) * stride] as number;
      for (let i = 0; i < size; i++) {
        to[base + i * stride] = sum / width;
        sum += (from[base + Math.min(size - 1, i + radius + 1) * stride] as number) - (from[base + Math.max(0, i - radius) * stride] as number);
      }
    }
  };
  for (let p = 0; p < passes; p++) {
    pass(a, b, 1, size);
    pass(b, a === source ? (a = new Float32Array(size * size)) : a, size, 1);
  }
  return a;
}

export function bake(): Baked {
  const heights = new Float32Array(MAP * MAP);
  const glowSource = new Float32Array(MAP * MAP);
  const map = new Uint16Array(MAP * MAP * 4);
  const step = WORLD / MAP;
  for (let j = 0; j < MAP; j++) {
    const z = (j + 0.5) * step - WORLD / 2;
    for (let i = 0; i < MAP; i++) {
      const x = (i + 0.5) * step - WORLD / 2;
      const g = ground(x, z);
      const k = j * MAP + i;
      heights[k] = g.height;
      glowSource[k] = g.lake * g.heat;
      map[k * 4] = half16(g.height);
      map[k * 4 + 1] = half16(g.lake);
      map[k * 4 + 2] = half16(g.heat);
      map[k * 4 + 3] = half16(g.tone);
    }
  }

  const glow = blurred(glowSource, MAP, 24, 3);
  const slope = new Uint16Array(MAP * MAP * 4);
  const at = (i: number, j: number): number => heights[Math.min(MAP - 1, Math.max(0, j)) * MAP + Math.min(MAP - 1, Math.max(0, i))] as number;
  for (let j = 0; j < MAP; j++) {
    for (let i = 0; i < MAP; i++) {
      const k = (j * MAP + i) * 4;
      slope[k] = half16((at(i + 1, j) - at(i - 1, j)) / (2 * step));
      slope[k + 1] = half16((at(i, j + 1) - at(i, j - 1)) / (2 * step));
      slope[k + 2] = half16(glow[j * MAP + i] as number);
      slope[k + 3] = half16(1);
    }
  }

  const D = 256;
  const detail = new Uint8Array(D * D * 4);
  const sd = { a: seedOf('detail-a'), b: seedOf('detail-b'), c: seedOf('detail-c'), d: seedOf('detail-d') };
  for (let j = 0; j < D; j++) {
    for (let i = 0; i < D; i++) {
      const u = i / D;
      const v = j / D;
      const k = (j * D + i) * 4;
      const warp = fbm(u * 4, v * 4, sd.d, 3, 4);
      detail[k] = Math.round(255 * fbm(u * 8, v * 8, sd.a, 5, 8));
      detail[k + 1] = Math.round(255 * ridged(u * 3 + warp * 0.9, v * 12 + warp * 1.4, sd.b, 4, 3, 12));
      detail[k + 2] = Math.round(255 * fbm(u * 48, v * 48, sd.c, 3, 48));
      detail[k + 3] = Math.round(255 * warp);
    }
  }
  const detailTexture = new THREE.DataTexture(detail, D, D, THREE.RGBAFormat, THREE.UnsignedByteType);
  detailTexture.wrapS = THREE.RepeatWrapping;
  detailTexture.wrapT = THREE.RepeatWrapping;
  detailTexture.minFilter = THREE.LinearMipmapLinearFilter;
  detailTexture.magFilter = THREE.LinearFilter;
  detailTexture.generateMipmaps = true;
  detailTexture.anisotropy = 8;
  detailTexture.colorSpace = THREE.NoColorSpace;
  detailTexture.needsUpdate = true;

  const F = 64;
  const fume = new Uint8Array(F * F * F);
  const sf = seedOf('fume');
  for (let k = 0; k < F; k++) {
    for (let j = 0; j < F; j++) {
      for (let i = 0; i < F; i++) {
        let sum = 0;
        let amp = 0.5;
        let norm = 0;
        let f = 4;
        for (let o = 0; o < 3; o++) {
          const n = noise3((i / F) * f, (j / F) * f, (k / F) * f, sf + o * 977, f);
          sum += amp * (o === 0 ? n : 1 - Math.abs(2 * n - 1));
          norm += amp;
          amp *= 0.5;
          f *= 2;
        }
        fume[(k * F + j) * F + i] = Math.round(255 * (sum / norm));
      }
    }
  }
  const fumeTexture = new THREE.Data3DTexture(fume, F, F, F);
  fumeTexture.format = THREE.RedFormat;
  fumeTexture.type = THREE.UnsignedByteType;
  fumeTexture.minFilter = THREE.LinearFilter;
  fumeTexture.magFilter = THREE.LinearFilter;
  fumeTexture.wrapS = THREE.RepeatWrapping;
  fumeTexture.wrapT = THREE.RepeatWrapping;
  fumeTexture.wrapR = THREE.RepeatWrapping;
  fumeTexture.unpackAlignment = 1;
  fumeTexture.needsUpdate = true;

  return { map: dataTexture(map, MAP), slope: dataTexture(slope, MAP), detail: detailTexture, fume: fumeTexture, heights };
}
