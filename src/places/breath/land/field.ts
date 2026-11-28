// The near map of the Breath's shelf: the ground round the shaft and the channel baked once, 6 cm a cell, with the loose stones that lie on it.
// The mesh is displaced from it and the shader takes the normal, the sun's shadow and the hollows from it, never from a flat face.
// tNear: r height (metres), g the height above which the sun is seen there, b how hollow the place is (0.5 level, less in a hollow or at the
// foot of a step, more on a crest), a the tone of a loose stone (0 where there is none).  tNearS: r, g the slope on x and z, b 1 where water stands.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { DEPTH, FINE, POOL, bearingOf, ground, inFine, noise2, plateAt, rimRadius, smoothGround, padAt } from '../land';
import { SEA_LEVEL, SHADOW_RUN, SUN_DIR } from '../shared/anchors';

export interface NearMap {
  texture: THREE.DataTexture;
  slopes: THREE.DataTexture;
  /** minX, minZ, 1 / size. */
  rect: THREE.Vector4;
  /** The height with the stones, the shaft filled level with its rim: metres. */
  heightAt(x: number, z: number): number;
  mesh(cells: number): THREE.BufferGeometry;
  dispose(): void;
}

function mipChain(data: Uint16Array, size: number, channels: number, floats: Float32Array): { data: Uint16Array; width: number; height: number }[] {
  const out = [{ data, width: size, height: size }];
  let src = floats;
  let n = size;
  while (n > 1) {
    const m = n >> 1;
    const dst = new Float32Array(m * m * channels);
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < m; i++) {
        for (let c = 0; c < channels; c++) {
          const a = (2 * j * n + 2 * i) * channels + c;
          dst[(j * m + i) * channels + c] = 0.25 * ((src[a] as number) + (src[a + channels] as number) + (src[a + n * channels] as number) + (src[a + n * channels + channels] as number));
        }
      }
    }
    const half = new Uint16Array(dst.length);
    for (let k = 0; k < dst.length; k++) half[k] = THREE.DataUtils.toHalfFloat(dst[k] as number);
    out.push({ data: half, width: m, height: m });
    src = dst;
    n = m;
  }
  return out;
}

function dataTexture(floats: Float32Array, size: number): THREE.DataTexture {
  const half = new Uint16Array(floats.length);
  for (let k = 0; k < floats.length; k++) half[k] = THREE.DataUtils.toHalfFloat(floats[k] as number);
  const t = new THREE.DataTexture(half, size, size, THREE.RGBAFormat, THREE.HalfFloatType);
  // The smaller levels are made here: a half-float picture cannot be asked to make its own on every machine.
  t.mipmaps = mipChain(half, size, 4, floats) as unknown as THREE.DataTexture['mipmaps'];
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export function bakeNear(rng: Rng): NearMap {
  const n = FINE.cells;
  const cell = FINE.size / n;
  const h = new Float32Array(n * n);
  const hole = new Uint8Array(n * n);
  const stone = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    const z = FINE.minZ + (j + 0.5) * cell;
    for (let i = 0; i < n; i++) {
      const x = FINE.minX + (i + 0.5) * cell;
      const r = Math.hypot(x, z);
      if (r < 40) {
        const rim = rimRadius(bearingOf(x, z));
        if (r < rim) {
          // Inside the shaft the map holds the rim's own height, so that the slope at the brim is the shelf's and not a cliff's.
          const k = r > 0.001 ? (rim * 1.001) / r : 0;
          h[j * n + i] = k > 0 ? ground(x * k, z * k) : 0;
          hole[j * n + i] = 1;
          continue;
        }
      }
      h[j * n + i] = ground(x, z);
    }
  }

  // Loose rock: what broke off the beds lies in drifts, in the hollows and at the foot of the steps. One large, a few middling, many small.
  const stamp = (x: number, z: number, radius: number, tall: number, squash: number, turn: number, tone: number): void => {
    const ci = (x - FINE.minX) / cell - 0.5;
    const cj = (z - FINE.minZ) / cell - 0.5;
    const reach = Math.ceil((radius * 1.25) / cell);
    const i0 = Math.round(ci);
    const j0 = Math.round(cj);
    if (i0 < reach + 1 || j0 < reach + 1 || i0 > n - reach - 2 || j0 > n - reach - 2) return;
    if (hole[j0 * n + i0]) return;
    const foot = (h[j0 * n + i0] as number) - tall * 0.35;
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    for (let j = j0 - reach; j <= j0 + reach; j++) {
      for (let i = i0 - reach; i <= i0 + reach; i++) {
        const dx = (i - ci) * cell;
        const dz = (j - cj) * cell;
        const u = (c * dx + s * dz) / radius;
        const w = (-s * dx + c * dz) / (radius * squash);
        // Blocky, not a dome: a broken piece of a bed with a flattish top and worn corners.
        const q = Math.pow(Math.pow(Math.abs(u), 3) + Math.pow(Math.abs(w), 3), 1 / 3);
        if (q >= 1) continue;
        const y = foot + tall * Math.min(1, 2.2 * Math.pow(1 - q * q * q, 0.6)) * (1 + 0.22 * (u * 0.7 + w * 0.4));
        const k = j * n + i;
        if (hole[k]) continue;
        if (y > (h[k] as number)) {
          h[k] = y;
          stone[k] = tone;
        }
      }
    }
  };
  const count = 170000;
  for (let k = 0; k < count; k++) {
    const x = FINE.minX + rng.next() * FINE.size;
    const z = FINE.minZ + rng.next() * FINE.size;
    const size = rng.next();
    const turn = rng.next() * Math.PI;
    const squash = 0.55 + 0.45 * rng.next();
    const tone = 0.35 + 0.65 * rng.next();
    // Drifts: a broad field says where rubble lies at all, a finer one clumps it.
    const drift = noise2(x / 13 + 31.7, z / 13 + 4.2) * 0.65 + noise2(x / 3.1 + 8.8, z / 3.1 + 60.1) * 0.35;
    // Along the brim of the shaft and the banks of the channel the beds are broken up and there is more of it.
    const r = Math.hypot(x, z);
    const brim = Math.exp(-Math.abs(r - rimRadius(bearingOf(x, z)) - 4) / 5);
    if (drift + 0.2 * brim < 0.42) continue;
    if (smoothGround(x, z) < SEA_LEVEL - 0.12) continue;
    if (!inFine(x, z, 6)) continue;
    // None on the plate the dead wader lies on.
    if (padAt(x, z) > 0) continue;
    // The loose stone lies where it fell: at the foot of a broken edge. One in fourteen has rolled out onto the open plate.
    const here = ground(x, z);
    const foot = Math.max(ground(x + 0.4, z), ground(x - 0.4, z), ground(x, z + 0.4), ground(x, z - 0.4)) - here > 0.1;
    if (plateAt(x, z) < POOL + 0.03) continue;
    if (rng.next() > (foot ? 0.8 : 0.03)) continue;
    // Cobbles of a hand or two; a few as big as a head.
    const radius = 0.04 + 0.07 * size * size + (size > 0.985 ? 0.08 : 0);
    stamp(x, z, radius, radius * (0.45 + 0.4 * squash), squash, turn, tone);
  }

  // The sun's shadow, swept from the rows nearest the sun, as the rig does it for the whole land but at this map's own fine cell.
  const shadow = new Float32Array(n * n);
  const toSunX = SUN_DIR[0] / -SUN_DIR[2];
  const drop = (cell * Math.hypot(1, toSunX)) / SHADOW_RUN;
  const shift = toSunX;
  const lit = (k: number): number => (hole[k] ? -DEPTH : (h[k] as number));
  for (let i = 0; i < n; i++) shadow[i] = lit(i);
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const fx = Math.min(n - 1.001, Math.max(0, i + shift));
      const i0 = Math.floor(fx);
      const u = fx - i0;
      const before = (shadow[(j - 1) * n + i0] as number) * (1 - u) + (shadow[(j - 1) * n + i0 + 1] as number) * u - drop;
      shadow[j * n + i] = Math.max(lit(j * n + i), before);
    }
  }

  // How hollow each place is: its height against the mean height round it (a box of 0.8 m, made in two passes).
  const R = 6;
  const tmp = new Float32Array(n * n);
  const mean = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    let sum = 0;
    for (let i = -R; i <= R; i++) sum += h[j * n + Math.min(n - 1, Math.max(0, i))] as number;
    for (let i = 0; i < n; i++) {
      tmp[j * n + i] = sum / (2 * R + 1);
      sum += (h[j * n + Math.min(n - 1, i + R + 1)] as number) - (h[j * n + Math.max(0, i - R)] as number);
    }
  }
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = -R; j <= R; j++) sum += tmp[Math.min(n - 1, Math.max(0, j)) * n + i] as number;
    for (let j = 0; j < n; j++) {
      mean[j * n + i] = sum / (2 * R + 1);
      sum += (tmp[Math.min(n - 1, j + R + 1) * n + i] as number) - (tmp[Math.max(0, j - R) * n + i] as number);
    }
  }

  const a = new Float32Array(n * n * 4);
  const b = new Float32Array(n * n * 4);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const xl = h[j * n + Math.max(0, i - 1)] as number;
      const xr = h[j * n + Math.min(n - 1, i + 1)] as number;
      const zu = h[Math.max(0, j - 1) * n + i] as number;
      const zd = h[Math.min(n - 1, j + 1) * n + i] as number;
      a[k * 4] = h[k] as number;
      a[k * 4 + 1] = shadow[k] as number;
      a[k * 4 + 2] = Math.min(1, Math.max(0, 0.5 + ((h[k] as number) - (mean[k] as number)) * 4));
      a[k * 4 + 3] = stone[k] as number;
      b[k * 4] = (xr - xl) / (2 * cell);
      b[k * 4 + 1] = (zd - zu) / (2 * cell);
      // The pool: where the plate's hollow holds water.
      b[k * 4 + 2] = hole[k] || stone[k] || padAt(FINE.minX + (i + 0.5) * cell, FINE.minZ + (j + 0.5) * cell) > 0 ? 0 : plateAt(FINE.minX + (i + 0.5) * cell, FINE.minZ + (j + 0.5) * cell) < POOL + 0.012 ? 1 : 0;
    }
  }
  const texture = dataTexture(a, n);
  const slopes = dataTexture(b, n);

  const heightAt = (x: number, z: number): number => {
    const fx = Math.min(n - 1.001, Math.max(0, (x - FINE.minX) / cell - 0.5));
    const fz = Math.min(n - 1.001, Math.max(0, (z - FINE.minZ) / cell - 0.5));
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fx - i;
    const v = fz - j;
    const k = j * n + i;
    return ((h[k] as number) * (1 - u) + (h[k + 1] as number) * u) * (1 - v) + ((h[k + n] as number) * (1 - u) + (h[k + n + 1] as number) * u) * v;
  };

  const mesh = (cells: number): THREE.BufferGeometry => {
    const g = new THREE.PlaneGeometry(FINE.size, FINE.size, cells, cells);
    g.rotateX(-Math.PI / 2);
    g.translate(FINE.minX + FINE.size / 2, 0, FINE.minZ + FINE.size / 2);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const step = FINE.size / cells;
    const deep = new Uint8Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const r = Math.hypot(x, z);
      const rim = r < 42 ? rimRadius(bearingOf(x, z)) : 0;
      if (r >= rim) {
        p.setY(i, heightAt(x, z));
        continue;
      }
      // Inside the shaft: the first ring of the grid is drawn out to the rim itself, the rest is not drawn.
      const k = r > 0.001 ? rim / r : 0;
      const top = heightAt(x * k * 1.001, z * k * 1.001);
      if (r > rim - step * 1.05) p.setXYZ(i, x * k, top, z * k);
      else {
        // No skirt hangs under the brim: its lower edge was a row of teeth. The wall's own top (land/wall.ts) stands there.
        p.setXYZ(i, x * k * 0.99, top - 1.7, z * k * 0.99);
        deep[i] = 1;
      }
    }
    const index = g.getIndex() as THREE.BufferAttribute;
    const kept: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      const i0 = index.getX(t);
      const i1 = index.getX(t + 1);
      const i2 = index.getX(t + 2);
      if (deep[i0] || deep[i1] || deep[i2]) continue;
      kept.push(i0, i1, i2);
    }
    g.setIndex(kept);
    g.computeVertexNormals();
    // The outermost ring is tucked a finger under the edge of the sheet beyond it (land/sheets.ts), once its normals are taken: dropped
    // half a metre before them, as it was, the ring beside it leaned after it and the edge of this sheet was a dark line.
    for (let i = 0; i < p.count; i++) if (!inFine(p.getX(i), p.getZ(i), step * 0.5)) p.setY(i, p.getY(i) - 0.02);
    p.needsUpdate = true;
    g.computeBoundingSphere();
    return g;
  };

  return {
    texture,
    slopes,
    rect: new THREE.Vector4(FINE.minX, FINE.minZ, 1 / FINE.size, 0),
    heightAt,
    mesh,
    dispose: () => {
      texture.dispose();
      slopes.dispose();
    },
  };
}
