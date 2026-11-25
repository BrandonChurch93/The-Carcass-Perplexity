// The net of plates of the lake, baked once at creation into two maps the shaders read: one over the whole lake, one finer
// over the near shore where the cameras stand. A texel holds what the nearest seam is: metres to its centre line, a number
// for its place in the life of a seam (2 and above: a seam the pictures show, always open), the age of the plate under the
// texel, and the half width the seam reaches when it is fully open.
// The plates are cells of a fine pattern joined into large and middle plates, so that a large plate has a crooked edge made of
// short straight runs, and small plates lie between the large ones, as on a real lake.
import * as THREE from 'three';
import { FALL_FOOT, SEAMS, seamLine } from '../shared/anchors';

export const NET = { minX: -568, minZ: -352, width: 1872, height: 880, cell: 1 };
export const NET_FINE = { minX: -560, minZ: 90, width: 1280, height: 1280, cell: 0.25 };
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
      const margin = 3.5 + 7 * noise(x / 70, z / 70, 5) + 16 * smooth(16, 2, lake) + 300 * smooth(2.6, 1.3, pool);
      const big = cellular(x + 14 * (noise(x / 120, z / 120, 8) - 0.5), z + 14 * (noise(x / 120, z / 120, 9) - 0.5), 47, 11);
      let label: number;
      let kind: number;
      if (big.edge > margin) {
        label = 0x100000 + (big.id & 0xfffff);
        kind = 0;
      } else {
        const mid = cellular(x, z, 17, 23);
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
      s.age[k] = Math.min(0.999, Math.max(0, 0.16 * (2 - kind) + 0.34 * smooth(50, 650, foot) + 0.5 * hash(label, 7, 3)));
    }
  }
  return s;
}

// The seams the pictures show: half width in metres at the two ends and the middle, how lumpy, and the heat class (0 hottest, 0.9 dull).
const AUTHORED: Record<string, { half: [number, number, number]; lumps: number; heat: number }> = {
  line: { half: [0.8, 0.7, 0.22], lumps: 0.25, heat: 0.0 },
  group: { half: [0.2, 0.62, 0.2], lumps: 0.55, heat: 0.08 },
  nearA: { half: [0.2, 0.5, 0.25], lumps: 0.4, heat: 0.2 },
  nearB: { half: [0.25, 0.42, 0.12], lumps: 0.5, heat: 0.25 },
  spatterRight: { half: [0.5, 2.3, 0.5], lumps: 0.5, heat: 0.0 },
  spatterLeft: { half: [0.4, 1.7, 0.4], lumps: 0.5, heat: 0.0 },
  sunk: { half: [0.05, 0.16, 0.04], lumps: 0.4, heat: 0.75 },
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
    const z = spec.minZ + (tj + 0.5) * cell;
    const gj = Math.floor((z - ORIGIN.z) / FINE);
    for (let ti = 0; ti < width; ti++) {
      const x = spec.minX + (ti + 0.5) * cell;
      const gi = Math.floor((x - ORIGIN.x) / FINE);
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
        const alive = hash(lo, hi, 37) < (kinds === 0 ? 0.62 : kinds < 3 ? 0.46 : 0.3) + 0.6 * pool;
        const h = hash(lo, hi, 41);
        reach = alive ? 0.035 + (kinds === 0 ? 0.5 : kinds < 3 ? 0.3 : 0.16) * h * h * h + 0.25 * pool * h : 0;
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
    for (const name of Object.keys(SEAMS)) {
      const shape = AUTHORED[name] ?? { half: [0.3, 0.5, 0.3], lumps: 0.4, heat: 0.2 };
      const seed = Math.floor((SEAMS[name] as (typeof SEAMS)[string]).seed * 10);
      const line = seamLine(name, 40);
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
            const half = along * (1 - shape.lumps + 2 * shape.lumps * noise(wx / 3.1, wz / 3.1, seed + 4)) * smooth(0, 0.03, Math.min(u, 1 - u) + 0.012);
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
