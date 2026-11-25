// The two pictures the water is drawn from, both made in code at creation.
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
