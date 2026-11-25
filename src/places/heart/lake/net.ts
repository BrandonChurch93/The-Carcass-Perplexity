// The net of plates of the lake, baked once at creation into two maps the shaders read: one over the whole lake, one finer
// over the near shore where the cameras stand. A texel holds what the nearest seam is: metres to its centre line, a number
// for its place in the life of a seam (2 and above: a seam the pictures show, always open), the age of the plate under the
// texel, and the half width the seam reaches when it is fully open.
// The plates are cells of a fine pattern joined into large and middle plates, so that a large plate has a crooked edge made of
// short straight runs, and small plates lie between the large ones, as on a real lake.
import * as THREE from 'three';
import { FALL_FOOT, SEAMS, seamLine } from '../shared/anchors';

export const NET = { minX: -568, minZ: -352, width: 1872, height: 880, cell: 1 };
export const NET_FINE = { minX: -560, minZ: 50, width: 1280, height: 1280, cell: 0.25 };
/** The middle of the open pool at the foot of the fall, and its half axes, metres. */
export const POOL = { x: FALL_FOOT[0] + 30, z: FALL_FOOT[1] + 20, rx: 58, rz: 26 };

const FINE = 7;
const ORIGIN = { x: -640, z: -420, nx: 286, nz: 146 };

const mix32 = (x: number): number => {
  let h = x | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
};
const hash = (i: number, j: number, s: number): number => mix32(Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 0x9e3779b1)) / 4294967296;
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const noise = (x: number, z: number, s: number): number => {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const u = x - i;
  const v = z - j;
  const a = u * u * (3 - 2 * u);
  const b = v * v * (3 - 2 * v);
  return (hash(i, j, s) * (1 - a) + hash(i + 1, j, s) * a) * (1 - b) + (hash(i, j + 1, s) * (1 - a) + hash(i + 1, j + 1, s) * a) * b;
};

// The nearest cell of a jittered grid and the distance to the nearest edge with a cell of another number.
// One cell in four is joined to its neighbour, so the plates differ in size.
const cellOut = { id: 0, edge: 0 };
function cellular(x: number, z: number, size: number, seed: number): typeof cellOut {
  const gx = Math.floor(x / size);
  const gz = Math.floor(z / size);
  let best = 1e18;
  let bx = 0;
  let bz = 0;
  let bid = 0;
  const ids: number[] = [];
  const px: number[] = [];
  const pz: number[] = [];
  for (let dj = -2; dj <= 2; dj++) {
    for (let di = -2; di <= 2; di++) {
      const i = gx + di;
      const j = gz + dj;
      const sx = (i + 0.08 + 0.84 * hash(i, j, seed)) * size;
      const sz = (j + 0.08 + 0.84 * hash(i, j, seed + 1)) * size;
      const id = hash(i, j, seed + 2) < 0.27 ? (i + 1) * 8191 + j : i * 8191 + j;
      ids.push(id);
      px.push(sx);
      pz.push(sz);
      const d = (sx - x) * (sx - x) + (sz - z) * (sz - z);
      if (d < best) {
        best = d;
        bx = sx;
        bz = sz;
        bid = id;
      }
    }
  }
  let edge = 1e9;
  for (let k = 0; k < ids.length; k++) {
    if (ids[k] === bid) continue;
    const sx = px[k] as number;
    const sz = pz[k] as number;
    const d = (sx - x) * (sx - x) + (sz - z) * (sz - z);
    const e = (d - best) / (2 * Math.hypot(sx - bx, sz - bz));
    if (e < edge) edge = e;
  }
  cellOut.id = bid;
  cellOut.edge = edge;
  return cellOut;
}

interface Sites {
  x: Float64Array;
  z: Float64Array;
  label: Int32Array;
  age: Float32Array;
  /** 0 a large plate, 1 a middle one, 2 a small one. */
  kind: Uint8Array;
  /** How close the pool at the foot of the fall is: 1 in it, 0 far from it. */
  pool: Float32Array;
}

function makeSites(lakeDistance: (x: number, z: number) => number): Sites {
  const n = ORIGIN.nx * ORIGIN.nz;
  const s: Sites = { x: new Float64Array(n), z: new Float64Array(n), label: new Int32Array(n), age: new Float32Array(n), kind: new Uint8Array(n), pool: new Float32Array(n) };
  for (let j = 0; j < ORIGIN.nz; j++) {
    for (let i = 0; i < ORIGIN.nx; i++) {
      const k = j * ORIGIN.nx + i;
      const x = ORIGIN.x + (i + 0.1 + 0.8 * hash(i, j, 1)) * FINE;
      const z = ORIGIN.z + (j + 0.1 + 0.8 * hash(i, j, 2)) * FINE;
      s.x[k] = x;
      s.z[k] = z;
      const lake = lakeDistance(x, z);
      const pool = Math.hypot((x - POOL.x) / POOL.rx, (z - POOL.z) / POOL.rz);
      const foot = Math.hypot(x - FALL_FOOT[0], z - FALL_FOOT[1]);
      // How far inside a large plate a cell must lie to belong to it. Against the rock and round the pool the crust is all small plates.
      const margin = 1.5 + 5 * smooth(0.45, 0.8, noise(x / 90, z / 90, 5)) + 12 * smooth(12, 2, lake) + 300 * smooth(2.6, 1.3, pool);
      const big = cellular(x + 14 * (noise(x / 120, z / 120, 8) - 0.5), z + 14 * (noise(x / 120, z / 120, 9) - 0.5), 66, 11);
      let label: number;
      let kind: number;
      if (big.edge > margin) {
        label = 0x100000 + (big.id & 0xfffff);
        kind = 0;
      } else {
        const mid = cellular(x, z, 26, 23);
        if (mid.edge > 2.0 + 30 * smooth(1.9, 1.2, pool)) {
          label = 0x200000 + (mid.id & 0xfffff);
          kind = 1;
        } else {
          label = 0x400000 + k;
          kind = 2;
        }
      }
      s.label[k] = label;
      s.kind[k] = kind;
      s.pool[k] = smooth(2.8, 1.0, pool);
      // Old plates are far from the fall and large. Young ones are small, or near the fall.
      s.age[k] = Math.min(0.999, Math.max(0, 0.07 * (2 - kind) + 0.2 * smooth(50, 650, foot) + 0.74 * hash(label, 7, 3)));
    }
  }
  return s;
}

// The seams the pictures show: half width in metres at the two ends and the middle, how lumpy, and the heat class (0 hottest, 0.9 dull,
// 1.5 the open, stirred lava under a fountain).
/**
 * The pressure ridge in front of the camera of key heart-4, its steep side toward the lens: a line of slabs on edge. The one
 * that stood in front of key heart-2 is taken out (tall 0): it read as a pile of dirt in front of the one that sank.
 */
export const RIDGES: readonly { from: [number, number]; to: [number, number]; tall: number; reach: number }[] = [
  { from: [-404.9, 142.4], to: [-437.5, 119.2], tall: 2.1, reach: 2.2 },
  { from: [-515.4, 277.7], to: [-515.6, 270.6], tall: 0, reach: 1.2 },
];

// Seams of the lake's own, beside those the pictures name: the fingers where the line channel leaves the shore, the seam
// that crosses the view of key heart-4 beyond its ridge, the small crack beside the one that sank.
export const OWN: { line: [number, number][]; half: [number, number, number]; lumps: number; heat: number; seed: number }[] = [
  { line: [[-497.6, 191.5], [-499.3, 188.0]], half: [0.4, 0.32, 0.1], lumps: 0.4, heat: 0.0, seed: 51 },
  { line: [[-497.0, 190.0], [-494.6, 186.2]], half: [0.4, 0.3, 0.08], lumps: 0.4, heat: 0.0, seed: 52 },
  { line: [[-496.5, 188.5], [-497.4, 184.6]], half: [0.4, 0.26, 0.08], lumps: 0.4, heat: 0.0, seed: 53 },
  { line: [[-398.0, 60.0], [-344.0, 80.0]], half: [0.5, 1.3, 0.4], lumps: 0.6, heat: 0.05, seed: 55 },
  { line: [[-517.0, 282.0], [-513.2, 284.6]], half: [0.03, 0.09, 0.02], lumps: 0.5, heat: 0.3, seed: 56 },
  // Short cracks across the view of the feeding picture, at several depths, and two that run from the pool under the tuft.
  { line: [[-427.9, 205.1], [-427.1, 208.5], [-423.5, 210.7]], half: [0.04, 0.16, 0.03], lumps: 0.9, heat: 0.08, seed: 61 },
  { line: [[-416.7, 207.2], [-413.8, 208.8], [-412.3, 212.9]], half: [0.04, 0.21, 0.03], lumps: 0.9, heat: 0.15, seed: 62 },
  { line: [[-427.3, 212.2], [-424.3, 215.3], [-420.2, 216.1]], half: [0.04, 0.26, 0.03], lumps: 0.9, heat: 0.22, seed: 63 },
  { line: [[-414.2, 185.3], [-411.8, 186.8], [-410.1, 191.3]], half: [0.04, 0.16, 0.03], lumps: 0.9, heat: 0.08, seed: 64 },
  { line: [[-397.8, 185.9], [-395.8, 190.2], [-391.8, 192.8]], half: [0.04, 0.21, 0.03], lumps: 0.9, heat: 0.15, seed: 65 },
  { line: [[-396.5, 170.1], [-392.0, 173.3], [-390.0, 178.1]], half: [0.04, 0.26, 0.03], lumps: 0.9, heat: 0.22, seed: 66 },
  { line: [[-376.4, 164.7], [-375.1, 169.4], [-370.6, 173.4]], half: [0.04, 0.16, 0.03], lumps: 0.9, heat: 0.08, seed: 67 },
  { line: [[-426.2, 193.6], [-422.3, 194.0], [-419.8, 196.9]], half: [0.04, 0.21, 0.03], lumps: 0.9, heat: 0.15, seed: 68 },
  { line: [[-404.2, 203.5], [-407.8, 207.2]], half: [0.1, 0.05, 0.02], lumps: 0.6, heat: 0.1, seed: 71 },
  { line: [[-402.4, 203.2], [-397.8, 205.6]], half: [0.1, 0.05, 0.02], lumps: 0.6, heat: 0.1, seed: 72 },
];

export const AUTHORED: Record<string, { half: [number, number, number]; lumps: number; heat: number }> = {
  line: { half: [0.55, 0.85, 0.3], lumps: 0.45, heat: 0.0 },
  group: { half: [0.45, 1.05, 0.4], lumps: 0.75, heat: 0.08 },
  nearA: { half: [0.1, 0.3, 0.14], lumps: 0.55, heat: 0.2 },
  nearB: { half: [0.14, 0.26, 0.08], lumps: 0.55, heat: 0.25 },
  spatterRight: { half: [0.5, 2.3, 0.5], lumps: 0.5, heat: 1.5 },
  spatterLeft: { half: [0.4, 1.7, 0.4], lumps: 0.5, heat: 1.5 },
  sunk: { half: [0.05, 0.16, 0.04], lumps: 0.4, heat: 0.75 },
  lead: { half: [0.3, 0.6, 0.3], lumps: 0.6, heat: 0.1 },
};

function toTexture(data: Float32Array, width: number, height: number): THREE.DataTexture {
  const half = new Uint16Array(data.length);
  for (let i = 0; i < data.length; i++) half[i] = THREE.DataUtils.toHalfFloat(data[i] as number);
  const t = new THREE.DataTexture(half, width, height, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

function bake(spec: typeof NET, sites: Sites, authored: boolean): Float32Array {
  const { width, height, cell } = spec;
  const out = new Float32Array(width * height * 4);
  const { nx } = ORIGIN;
  const sx = sites.x;
  const sz = sites.z;
  const label = sites.label;
  for (let tj = 0; tj < height; tj++) {
    const z0 = spec.minZ + (tj + 0.5) * cell;
    for (let ti = 0; ti < width; ti++) {
      // The edge of a plate is crooked at every size.
      const tx = spec.minX + (ti + 0.5) * cell;
      const x = tx + 3.4 * (noise(tx / 11, z0 / 11, 61) - 0.5) + 1.1 * (noise(tx / 2.9, z0 / 2.9, 62) - 0.5);
      const z = z0 + 3.4 * (noise(tx / 11, z0 / 11, 63) - 0.5) + 1.1 * (noise(tx / 2.9, z0 / 2.9, 64) - 0.5);
      const gi = Math.floor((x - ORIGIN.x) / FINE);
      const gj = Math.floor((z - ORIGIN.z) / FINE);
      let best = 1e18;
      let bk = 0;
      for (let dj = -1; dj <= 1; dj++) {
        const row = (gj + dj) * nx + gi;
        for (let di = -1; di <= 1; di++) {
          const k = row + di;
          const ax = (sx[k] as number) - x;
          const az = (sz[k] as number) - z;
          const d = ax * ax + az * az;
          if (d < best) {
            best = d;
            bk = k;
          }
        }
      }
      const la = label[bk] as number;
      const bx = sx[bk] as number;
      const bz = sz[bk] as number;
      let edge = 30;
      let other = -1;
      for (let dj = -2; dj <= 2; dj++) {
        const row = bk + dj * nx;
        for (let di = -2; di <= 2; di++) {
          const k = row + di;
          if (label[k] === la) continue;
          const ax = (sx[k] as number) - x;
          const az = (sz[k] as number) - z;
          const cx = (sx[k] as number) - bx;
          const cz = (sz[k] as number) - bz;
          const e = (ax * ax + az * az - best) / (2 * Math.sqrt(cx * cx + cz * cz));
          if (e < edge) {
            edge = e;
            other = k;
          }
        }
      }
      let phase = 0;
      let reach = 0;
      if (other >= 0) {
        const lb = label[other] as number;
        const lo = Math.min(la, lb);
        const hi = Math.max(la, lb);
        phase = hash(lo, hi, 31);
        const kinds = (sites.kind[bk] as number) + (sites.kind[other] as number);
        const pool = sites.pool[bk] as number;
        // Not every edge between two plates is a seam that lives: the rest stay shut, dark cracks.
        const alive = hash(lo, hi, 37) < (kinds === 0 ? 0.7 : kinds < 3 ? 0.5 : 0.22) + 0.6 * pool;
        const h = hash(lo, hi, 41);
        reach = alive ? 0.06 + (kinds === 0 ? 0.75 : kinds < 3 ? 0.4 : 0.24) * h * h + 0.25 * pool * h : 0;
        // A shut edge between two large plates may be a pressure ridge: its number then says how tall, 0.5 to 1. Other shut edges stay under 0.25.
        if (!alive) phase = kinds === 0 && hash(lo, hi, 43) < 0.4 ? 0.5 + 0.5 * hash(lo, hi, 47) : 0.25 * phase;
      }
      const o = (tj * width + ti) * 4;
      out[o] = edge;
      out[o + 1] = phase;
      out[o + 2] = sites.age[bk] as number;
      out[o + 3] = reach;
    }
  }
  if (authored) {
    const reachOut = 16;
    const all = Object.keys(SEAMS).map((name) => ({
      name,
      shape: AUTHORED[name] ?? { half: [0.3, 0.5, 0.3] as [number, number, number], lumps: 0.4, heat: 0.2 },
      seed: Math.floor((SEAMS[name] as (typeof SEAMS)[string]).seed * 10),
      line: seamLine(name, 40),
    }));
    for (const own of OWN) {
      const line: [number, number][] = [];
      const a = own.line[0] as [number, number];
      const b = own.line[1] as [number, number];
      for (let k = 0; k <= 16; k++) line.push([a[0] + ((b[0] - a[0]) * k) / 16, a[1] + ((b[1] - a[1]) * k) / 16]);
      all.push({ name: '', shape: { half: own.half, lumps: own.lumps, heat: own.heat }, seed: own.seed, line });
    }
    for (const { name, shape, seed, line } of all) {
      const count = line.length - 1;
      for (let s = 0; s < count; s++) {
        const a = line[s] as [number, number];
        const b = line[s + 1] as [number, number];
        const ex = b[0] - a[0];
        const ez = b[1] - a[1];
        const l2 = ex * ex + ez * ez || 1;
        const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - reachOut - spec.minX) / cell));
        const i1 = Math.min(width - 1, Math.ceil((Math.max(a[0], b[0]) + reachOut - spec.minX) / cell));
        const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - reachOut - spec.minZ) / cell));
        const j1 = Math.min(height - 1, Math.ceil((Math.max(a[1], b[1]) + reachOut - spec.minZ) / cell));
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const wx = spec.minX + (i + 0.5) * cell;
            const wz = spec.minZ + (j + 0.5) * cell;
            // A real seam is crooked at every size: bend the ground under the line.
            const x = wx + 2.2 * (noise(wx / 6.5, wz / 6.5, seed) - 0.5) + 0.9 * (noise(wx / 1.9, wz / 1.9, seed + 1) - 0.5);
            const z = wz + 2.2 * (noise(wx / 6.5, wz / 6.5, seed + 2) - 0.5) + 0.9 * (noise(wx / 1.9, wz / 1.9, seed + 3) - 0.5);
            const t = Math.min(1, Math.max(0, ((x - a[0]) * ex + (z - a[1]) * ez) / l2));
            const d = Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t);
            const u = (s + t) / count;
            const along = u < 0.5 ? (shape.half[0] as number) + ((shape.half[1] as number) - (shape.half[0] as number)) * smooth(0, 0.5, u) : (shape.half[1] as number) + ((shape.half[2] as number) - (shape.half[1] as number)) * smooth(0.5, 1, u);
            let half = along * (1 - shape.lumps + 2 * shape.lumps * noise(wx / 3.1, wz / 3.1, seed + 4)) * smooth(0, 0.03, Math.min(u, 1 - u) + 0.012);
            // Under the tuft of the one that feeds, the seam opens into a pool.
            // The walkers owner gave these points on the crust at T0: the hero's on the group seam, the near walker's at the wide key and at the key of the one that sank.
            if (name === 'group') half += 1.25 * Math.exp(-((wx + 403.4) ** 2 + (wz - 202.6) ** 2) / 5.0);
            if (name === 'nearA') half += 1.1 * Math.exp(-((wx + 493.8) ** 2 + (wz - 225.6) ** 2) / 4.0);
            if (name === 'nearB') half += 1.1 * Math.exp(-((wx + 491.6) ** 2 + (wz - 241.0) ** 2) / 4.0);
            const o = (j * width + i) * 4;
            const had = out[o] as number;
            const hadReach = out[o + 3] as number;
            if (d - half < had - hadReach) {
              out[o] = d;
              out[o + 1] = 2 + shape.heat;
              out[o + 3] = half;
            }
          }
        }
      }
    }
  }
  return out;
}

export interface Net {
  wide: THREE.DataTexture;
  fine: THREE.DataTexture;
}

export function bakeNet(lakeDistance: (x: number, z: number) => number): Net {
  const sites = makeSites(lakeDistance);
  return {
    wide: toTexture(bake(NET, sites, false), NET.width, NET.height),
    fine: toTexture(bake(NET_FINE, sites, true), NET_FINE.width, NET_FINE.height),
  };
}
