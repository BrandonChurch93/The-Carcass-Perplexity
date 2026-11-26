// The small waves of the lake: three fields of slope, each a tile that repeats, worked out anew for every time from a fixed spectrum.
// Every wave of a field keeps its own height and travels at the speed water gives a wave of its length, so the long ones outrun the short,
// crests form and come apart, and nothing scrolls. A field is a pure function of the time: the same time gives the same bytes.
import * as THREE from 'three';

const N = 256;
const LOG_N = 8;
/** The side of each tile, metres: ripples, wavelets and the long slow heave. */
export const WAVE_TILES: readonly [number, number, number] = [9, 70, 520];
/** The mip levels of a field, and how much of its slope is left at each (1 at the finest). */
const LEVELS = 9;

interface Field {
  readonly texture: THREE.DataTexture;
  readonly data: Uint16Array;
  /** Per wave: its place in the grid, its two numbers at time 0 for the way it runs and the way against, and its turn a second. */
  readonly at: Int32Array;
  readonly kx: Float32Array;
  readonly ky: Float32Array;
  readonly re: Float32Array;
  readonly im: Float32Array;
  readonly re2: Float32Array;
  readonly im2: Float32Array;
  readonly omega: Float32Array;
  rms: number;
}

const COS = new Float64Array(N / 2);
const SIN = new Float64Array(N / 2);
for (let i = 0; i < N / 2; i++) {
  COS[i] = Math.cos((2 * Math.PI * i) / N);
  SIN[i] = Math.sin((2 * Math.PI * i) / N);
}
const REVERSED = new Int32Array(N);
for (let i = 0; i < N; i++) {
  let r = 0;
  for (let b = 0; b < LOG_N; b++) r |= ((i >> b) & 1) << (LOG_N - 1 - b);
  REVERSED[i] = r;
}

/** One line of the grid, backward (from waves to water), in place. */
function line(re: Float64Array, im: Float64Array, from: number, stride: number): void {
  for (let i = 0; i < N; i++) {
    const j = REVERSED[i] as number;
    if (j > i) {
      const a = from + i * stride;
      const b = from + j * stride;
      const tr = re[a] as number;
      re[a] = re[b] as number;
      re[b] = tr;
      const ti = im[a] as number;
      im[a] = im[b] as number;
      im[b] = ti;
    }
  }
  for (let size = 2; size <= N; size *= 2) {
    const half = size / 2;
    const jump = N / size;
    for (let start = 0; start < N; start += size) {
      for (let k = 0; k < half; k++) {
        const c = COS[k * jump] as number;
        const s = SIN[k * jump] as number;
        const a = from + (start + k) * stride;
        const b = a + half * stride;
        const xr = (re[b] as number) * c - (im[b] as number) * s;
        const xi = (re[b] as number) * s + (im[b] as number) * c;
        re[b] = (re[a] as number) - xr;
        im[b] = (im[a] as number) - xi;
        re[a] = (re[a] as number) + xr;
        im[a] = (im[a] as number) + xi;
      }
    }
  }
}

const gridRe = new Float64Array(N * N);
const gridIm = new Float64Array(N * N);

function makeField(tile: number, seed: () => number, wind: [number, number]): Field {
  const data = new Uint16Array(N * N * 4);
  const texture = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
  // Far off, where one pixel holds many waves, their slopes average out: what is lost there is given back as a blur of the mirror, not as noise.
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 1;
  const at: number[] = [];
  const kxs: number[] = [];
  const kys: number[] = [];
  const re: number[] = [];
  const im: number[] = [];
  const re2: number[] = [];
  const im2: number[] = [];
  const omega: number[] = [];
  const gauss = (): number => Math.sqrt(-2 * Math.log(Math.max(seed(), 1e-9))) * Math.cos(2 * Math.PI * seed());
  // Waves of 3 to 40 turns across the tile: none so long that the tile shows as a beat, none so short that the grid cannot hold its slope.
  const LOW = 3;
  const HIGH = 40;
  for (let j = -HIGH; j <= HIGH; j++) {
    for (let i = -HIGH; i <= HIGH; i++) {
      const turns = Math.hypot(i, j);
      const a1 = gauss();
      const a2 = gauss();
      const b1 = gauss();
      const b2 = gauss();
      if (turns < LOW || turns > HIGH) continue;
      const kx = (2 * Math.PI * i) / tile;
      const ky = (2 * Math.PI * j) / tile;
      const k = Math.hypot(kx, ky);
      // The height of a wave falls with its length so that every length adds about as much slope: fine ripples ride on the long ones.
      const edge = Math.min(1, (turns - LOW + 1) / 2) * Math.min(1, (HIGH - turns + 1) / 6);
      const height = edge / (k * k * Math.sqrt(k));
      // Most of them run with the air, some across it, a few against it.
      const along = (kx * wind[0] + ky * wind[1]) / k;
      const withWind = 0.12 + 0.88 * Math.pow(Math.max(along, 0), 2);
      const against = 0.12 + 0.2 * Math.pow(Math.max(-along, 0), 2);
      at.push(((j + N) % N) * N + ((i + N) % N));
      kxs.push(kx);
      kys.push(ky);
      re.push(a1 * height * Math.sqrt(withWind));
      im.push(a2 * height * Math.sqrt(withWind));
      re2.push(b1 * height * Math.sqrt(against));
      im2.push(b2 * height * Math.sqrt(against));
      // Gravity for the long waves, the skin of the water for the short ones.
      omega.push(Math.sqrt(9.81 * k + 7.4e-5 * k * k * k));
    }
  }
  return {
    texture,
    data,
    at: Int32Array.from(at),
    kx: Float32Array.from(kxs),
    ky: Float32Array.from(kys),
    re: Float32Array.from(re),
    im: Float32Array.from(im),
    re2: Float32Array.from(re2),
    im2: Float32Array.from(im2),
    omega: Float32Array.from(omega),
    rms: 0,
  };
}

/** The slope of the field at a time, into gridRe (east) and gridIm (south). */
function slopesAt(f: Field, t: number): void {
  gridRe.fill(0);
  gridIm.fill(0);
  for (let n = 0; n < f.at.length; n++) {
    const w = (f.omega[n] as number) * t;
    const c = Math.cos(w);
    const s = Math.sin(w);
    // The wave that runs the way of k turns one way in time, the one that runs against it the other: h = a e^(-iwt) + b e^(iwt).
    const hr = (f.re[n] as number) * c + (f.im[n] as number) * s + (f.re2[n] as number) * c - (f.im2[n] as number) * s;
    const hi = (f.im[n] as number) * c - (f.re[n] as number) * s + (f.im2[n] as number) * c + (f.re2[n] as number) * s;
    const kx = f.kx[n] as number;
    const ky = f.ky[n] as number;
    const o = f.at[n] as number;
    // The slope east is the real part of i kx h, the slope south of i ky h. Both are packed into one grid as (east + i south);
    // each wave gives the grid its own cell and the cell of the wave that runs the other way, which is what makes the two parts real.
    const er = -kx * hi;
    const ei = kx * hr;
    const sr = -ky * hi;
    const si = ky * hr;
    gridRe[o] = (gridRe[o] as number) + 0.5 * (er - si);
    gridIm[o] = (gridIm[o] as number) + 0.5 * (ei + sr);
    const row = Math.floor(o / N);
    const col = o - row * N;
    const m = ((N - row) % N) * N + ((N - col) % N);
    gridRe[m] = (gridRe[m] as number) + 0.5 * (er + si);
    gridIm[m] = (gridIm[m] as number) + 0.5 * (sr - ei);
  }
  for (let j = 0; j < N; j++) line(gridRe, gridIm, j * N, 1);
  for (let i = 0; i < N; i++) line(gridRe, gridIm, i, N);
}

export interface Waves {
  readonly uniforms: Record<string, THREE.IUniform>;
  setTime(seconds: number): void;
  dispose(): void;
}

export function createWaves(seed: () => number): Waves {
  const wind: [number, number] = [0.8, 0.6];
  const fields = WAVE_TILES.map((tile) => makeField(tile, seed, wind));
  // How much of the slope each mip level keeps, measured once on the first field at rest: the three have the same make.
  const kept = new Float32Array(LEVELS);
  fields.forEach((f, n) => {
    slopesAt(f, 0);
    let sum = 0;
    for (let i = 0; i < N * N; i++) sum += (gridRe[i] as number) ** 2 + (gridIm[i] as number) ** 2;
    f.rms = Math.sqrt(sum / (N * N));
    if (n > 0) return;
    let size = N;
    let a = Float64Array.from(gridRe);
    let b = Float64Array.from(gridIm);
    kept[0] = 1;
    for (let level = 1; level < LEVELS; level++) {
      const half = size / 2;
      const a2 = new Float64Array(half * half);
      const b2 = new Float64Array(half * half);
      let s2 = 0;
      for (let j = 0; j < half; j++) {
        for (let i = 0; i < half; i++) {
          const o = 2 * j * size + 2 * i;
          const x = 0.25 * ((a[o] as number) + (a[o + 1] as number) + (a[o + size] as number) + (a[o + size + 1] as number));
          const y = 0.25 * ((b[o] as number) + (b[o + 1] as number) + (b[o + size] as number) + (b[o + size + 1] as number));
          a2[j * half + i] = x;
          b2[j * half + i] = y;
          s2 += x * x + y * y;
        }
      }
      kept[level] = s2 / (half * half) / (f.rms * f.rms);
      a = a2;
      b = b2;
      size = half;
    }
  });
  const uniforms: Record<string, THREE.IUniform> = {
    tWave0: { value: (fields[0] as Field).texture },
    tWave1: { value: (fields[1] as Field).texture },
    tWave2: { value: (fields[2] as Field).texture },
    uWaveKept: { value: Array.from(kept) },
  };
  return {
    uniforms,
    setTime: (seconds) => {
      for (const f of fields) {
        slopesAt(f, seconds);
        const k = 1 / f.rms;
        const d = f.data;
        for (let i = 0; i < N * N; i++) {
          d[i * 4] = THREE.DataUtils.toHalfFloat((gridRe[i] as number) * k);
          d[i * 4 + 1] = THREE.DataUtils.toHalfFloat((gridIm[i] as number) * k);
        }
        f.texture.needsUpdate = true;
      }
    },
    dispose: () => {
      for (const f of fields) f.texture.dispose();
    },
  };
}

// Needs nothing before it. A field read is in units of its own spread: the caller gives each field its height.
export const WAVES_GLSL = /* glsl */ `
uniform sampler2D tWave0;
uniform sampler2D tWave1;
uniform sampler2D tWave2;
uniform float uWaveKept[${LEVELS}];

// One field read twice, the second turned and a third larger, so that no tile can be found on the water.
vec2 waveRead(sampler2D t, vec2 x, float tile, float coarser) {
  vec2 a = texture2D(t, x / tile, coarser).rg;
  vec2 q = vec2(0.809 * x.x - 0.588 * x.y, 0.588 * x.x + 0.809 * x.y) / (tile * 1.37) + 0.37;
  vec2 b = texture2D(t, q, coarser).rg;
  return (a + vec2(0.809 * b.x + 0.588 * b.y, -0.588 * b.x + 0.809 * b.y)) * 0.7071;
}

// How much of a field's slope (as a share of its square) the pixels still hold where one pixel covers this many metres of water.
float waveKept(float covers, float tile) {
  float level = clamp(log2(max(covers * ${N}.0 / tile, 1.0)), 0.0, ${LEVELS - 1}.0);
  int i = int(floor(level));
  int j = i < ${LEVELS - 1} ? i + 1 : i;
  return mix(uWaveKept[i], uWaveKept[j], level - float(i));
}`;
