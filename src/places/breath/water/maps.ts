// The pictures the water is drawn from, all made in code at creation.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';

/** Depth of the water over a square of the land. r: depth from -0.5 m (dry) to 2 m, g: 1 where the land falls away into a shaft. */
export function bedMap(height: (x: number, z: number) => number, sea: number, cx: number, cz: number, half: number, cells: number): THREE.DataTexture {
  const data = new Uint8Array(cells * cells * 4);
  const cell = (2 * half) / cells;
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const h = height(cx - half + (i + 0.5) * cell, cz - half + (j + 0.5) * cell);
      const depth = sea - h;
      const o = (j * cells + i) * 4;
      data[o] = Math.round(255 * Math.min(1, Math.max(0, (depth + 0.5) / 2.5)));
      data[o + 1] = depth > 5 ? 255 : 0;
      data[o + 2] = 0;
      data[o + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, cells, cells, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

/** A square of small waves that repeats without a seam: r and g the slope on x and z, b the height. Sines of whole wave numbers, so the edges meet. */
export function waveMap(rng: Rng, size = 256, least = 2, most = 24, fall = 1.15, count = 40): THREE.DataTexture {
  const waves: { kx: number; kz: number; amp: number; phase: number }[] = [];
  for (let i = 0; i < count; i++) {
    const k = least + Math.floor((most - least) * rng.next() ** 1.6);
    const a = rng.range(0, Math.PI * 2);
    const kx = Math.round(k * Math.cos(a));
    const kz = Math.round(k * Math.sin(a));
    const len = Math.hypot(kx, kz) || 1;
    waves.push({ kx, kz, amp: rng.range(0.5, 1) / len ** fall, phase: rng.range(0, Math.PI * 2) });
  }
  const gx = new Float32Array(size * size);
  const gz = new Float32Array(size * size);
  const hh = new Float32Array(size * size);
  let peak = 1e-6;
  let high = 1e-6;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const u = (i / size) * Math.PI * 2;
      const v = (j / size) * Math.PI * 2;
      let sx = 0;
      let sz = 0;
      let h = 0;
      for (const w of waves) {
        const arg = w.kx * u + w.kz * v + w.phase;
        // Sharpened crests: small waves on shallow water are not sines.
        const s = Math.sin(arg);
        const c = Math.cos(arg);
        h += w.amp * (s - 0.25 * Math.cos(2 * arg));
        const d = w.amp * (c + 0.5 * Math.sin(2 * arg));
        sx += d * w.kx;
        sz += d * w.kz;
      }
      const o = j * size + i;
      gx[o] = sx;
      gz[o] = sz;
      hh[o] = h;
      peak = Math.max(peak, Math.abs(sx), Math.abs(sz));
      high = Math.max(high, Math.abs(h));
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let o = 0; o < size * size; o++) {
    data[o * 4] = Math.round(127.5 + 127.5 * ((gx[o] as number) / peak));
    data[o * 4 + 1] = Math.round(127.5 + 127.5 * ((gz[o] as number) / peak));
    data[o * 4 + 2] = Math.round(127.5 + 127.5 * ((hh[o] as number) / high));
    data[o * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** One band of waves, as a square that repeats without a seam. Every wave in it is nearly of one length and runs within a quarter turn of +x,
 *  so all of them have nearly one frequency w, and the slope of the water at time t is A cos(wt) + B sin(wt): r and g hold A (on x and z),
 *  b and a hold B. The square stands for four times the root mean square of the slope either side of the middle grey. */
export function bandMap(rng: Rng, size = 256, middle = 12, count = 56): THREE.DataTexture {
  const waves: { kx: number; kz: number; amp: number; phase: number }[] = [];
  for (let i = 0; i < count; i++) {
    const k = middle * rng.range(0.72, 1.4);
    // Most run with the wind, a few well across it: the crests are short and do not line up.
    const a = (rng.next() < 0.75 ? 0.5 : 1.15) * (rng.next() + rng.next() - 1);
    const kx = Math.round(k * Math.cos(a));
    const kz = Math.round(k * Math.sin(a));
    const len = Math.hypot(kx, kz) || 1;
    waves.push({ kx, kz, amp: rng.range(0.4, 1) / len ** 1.5, phase: rng.range(0, Math.PI * 2) });
  }
  const held = new Float32Array(size * size * 4);
  let sum = 0;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const u = (i / size) * Math.PI * 2;
      const v = (j / size) * Math.PI * 2;
      let ax = 0;
      let az = 0;
      let bx = 0;
      let bz = 0;
      for (const w of waves) {
        const arg = w.kx * u + w.kz * v + w.phase;
        const c = w.amp * Math.cos(arg);
        const d = w.amp * Math.sin(arg);
        ax += c * w.kx;
        az += c * w.kz;
        bx += d * w.kx;
        bz += d * w.kz;
      }
      const o = (j * size + i) * 4;
      held[o] = ax;
      held[o + 1] = az;
      held[o + 2] = bx;
      held[o + 3] = bz;
      sum += ax * ax + az * az + bx * bx + bz * bz;
    }
  }
  const rms = Math.sqrt(sum / (size * size * 4)) || 1;
  const data = new Uint8Array(size * size * 4);
  for (let o = 0; o < size * size * 4; o++) data[o] = Math.round(127.5 + 127.5 * Math.min(1, Math.max(-1, (held[o] as number) / (4 * rms))));
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.premultiplyAlpha = false;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
