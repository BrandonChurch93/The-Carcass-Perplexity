import { config } from '../config';
import { hash2, hashString } from './rng';

export interface Sample {
  px: number;
  py: number;
  lensX: number;
  lensY: number;
  shutter: number;
}

const SOBOL_Y: number[] = (() => {
  const v: number[] = [];
  let x = 0x80000000;
  for (let i = 0; i < 32; i++) {
    v.push(x >>> 0);
    x = (x ^ (x >>> 1)) >>> 0;
  }
  return v;
})();

function vanDerCorput(i: number, scramble: number): number {
  let b = i >>> 0;
  b = ((b << 16) | (b >>> 16)) >>> 0;
  b = (((b & 0x00ff00ff) << 8) | ((b & 0xff00ff00) >>> 8)) >>> 0;
  b = (((b & 0x0f0f0f0f) << 4) | ((b & 0xf0f0f0f0) >>> 4)) >>> 0;
  b = (((b & 0x33333333) << 2) | ((b & 0xcccccccc) >>> 2)) >>> 0;
  b = (((b & 0x55555555) << 1) | ((b & 0xaaaaaaaa) >>> 1)) >>> 0;
  return ((b ^ scramble) >>> 0) / 4294967296;
}

function sobolY(i: number, scramble: number): number {
  let r = scramble >>> 0;
  for (let bit = 0, n = i >>> 0; n !== 0; bit++, n >>>= 1) if (n & 1) r = (r ^ (SOBOL_Y[bit] as number)) >>> 0;
  return r / 4294967296;
}

function disk(u: number, v: number): [number, number] {
  const a = 2 * u - 1;
  const b = 2 * v - 1;
  if (a === 0 && b === 0) return [0, 0];
  let r: number;
  let phi: number;
  if (Math.abs(a) > Math.abs(b)) {
    r = a;
    phi = (Math.PI / 4) * (b / a);
  } else {
    r = b;
    phi = Math.PI / 2 - (Math.PI / 4) * (a / b);
  }
  return [r * Math.cos(phi), r * Math.sin(phi)];
}

const STREAM = hashString('sampler', config.seed);

export function frameSamples(seq: number, count: number, seed: number = STREAM): Sample[] {
  if (count < 1 || (count & (count - 1)) !== 0) throw new Error(`sample count must be a power of two, got ${count}`);
  if (count === 1) return [{ px: 0, py: 0, lensX: 0, lensY: 0, shutter: 0.5 }];
  const key = hash2(seed, seq);
  const sx = hash2(key, 1);
  const sy = hash2(key, 2);
  const lx = hash2(key, 3);
  const ly = hash2(key, 4);
  const lensShift = hash2(key, 5) % count;
  const timeShift = hash2(key, 6) % count;
  const timeJitter = hash2(key, 7) / 4294967296;
  const out: Sample[] = [];
  for (let i = 0; i < count; i++) {
    const j = (i + lensShift) % count;
    const [lensX, lensY] = disk(vanDerCorput(j, lx), sobolY(j, ly));
    const slot = (i * 3 + timeShift) % count;
    out.push({
      px: vanDerCorput(i, sx) - 0.5,
      py: sobolY(i, sy) - 0.5,
      lensX,
      lensY,
      shutter: (slot + timeJitter) / count,
    });
  }
  return out;
}
