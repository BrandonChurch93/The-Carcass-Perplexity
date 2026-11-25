// The shape of the marsh floor, worked out once on the processor: how far every point is from brine, how high the ground stands, and what kind of
// ground it is. The land's mesh, the rig's map and the shaders all read the same numbers from here, so a shoreline is in one place for all of them.
import * as THREE from 'three';
import {
  CREEKS, CRUST, F, K1_AT, K1_DIR, POOL_R, R, STUCK, TAU, VEIN, clamp, makePools, rel, rockHeight, smooth, type Node,
} from '../shared/anchors';
import { stream } from '../../../core/rng';

/** The two baked maps: 512 m round the seep pool in cells of a quarter metre, and 4 km in cells of two metres. */
export const NEAR = { half: 256, n: 2048 };
export const FAR = { half: 2048, n: 2048 };
/** Metres of dry ground the distance to brine is kept for. Farther than this it reads as this. */
export const DRY = 6;

export interface Hummock {
  x: number;
  z: number;
  a: number;
  b: number;
  h: number;
  yaw: number;
}

export interface Field {
  /** Metres to the nearest brine edge: negative in brine, positive on land up to DRY. */
  shore(x: number, z: number): number;
  /** Height of the ground, metres over the brine. Brine lies level at 0. */
  height(x: number, z: number): number;
  /** 0 to 1: how thin the crust is. */
  thin(x: number, z: number): number;
  near: THREE.DataTexture;
  far: THREE.DataTexture;
  hummocks: Hummock[];
  dispose(): void;
}

// Value noise on the processor, the same every run.
const hash = (x: number, y: number): number => {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};
export const vnoise = (x: number, y: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const fbm = (x: number, y: number, octaves = 4): number => {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * f + i * 17.3, y * f - i * 9.1);
    f *= 2.03;
    amp *= 0.5;
  }
  return sum / (1 - Math.pow(0.5, octaves));
};

interface Grid {
  half: number;
  n: number;
  cell: number;
  d: Float32Array;
}

function stamp(g: Grid, ax: number, az: number, ar: number, bx: number, bz: number, br: number): void {
  const pad = Math.max(ar, br) + DRY + g.cell;
  const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - pad + g.half) / g.cell));
  const i1 = Math.min(g.n - 1, Math.ceil((Math.max(ax, bx) + pad + g.half) / g.cell));
  const j0 = Math.max(0, Math.floor((Math.min(az, bz) - pad + g.half) / g.cell));
  const j1 = Math.min(g.n - 1, Math.ceil((Math.max(az, bz) + pad + g.half) / g.cell));
  const vx = bx - ax;
  const vz = bz - az;
  const len2 = vx * vx + vz * vz || 1;
  for (let j = j0; j <= j1; j++) {
    const z = -g.half + (j + 0.5) * g.cell;
    for (let i = i0; i <= i1; i++) {
      const x = -g.half + (i + 0.5) * g.cell;
      const t = clamp(((x - ax) * vx + (z - az) * vz) / len2);
      const d = Math.hypot(x - ax - vx * t, z - az - vz * t) - (ar + (br - ar) * t);
      const k = j * g.n + i;
      if (d < (g.d[k] as number)) g.d[k] = d;
    }
  }
}

function channel(grids: Grid[], nodes: Node[], per: number): void {
  const curve = new THREE.CatmullRomCurve3(nodes.map((n) => new THREE.Vector3(n[0], 0, n[1])), false, 'centripetal');
  const count = (nodes.length - 1) * per;
  let px = 0;
  let pz = 0;
  let pr = 0;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const p = curve.getPoint(t);
    const k = t * (nodes.length - 1);
    const a = Math.min(nodes.length - 2, Math.floor(k));
    const wa = (nodes[a] as Node)[2];
    const wb = (nodes[a + 1] as Node)[2];
    const r = (wa + (wb - wa) * (k - a)) / 2;
    if (i > 0) for (const g of grids) stamp(g, px, pz, pr, p.x, p.z, r);
    px = p.x;
    pz = p.z;
    pr = r;
  }
}

const sampleGrid = (g: Grid, x: number, z: number): number => {
  const u = clamp((x + g.half) / g.cell - 0.5, 0, g.n - 1.001);
  const v = clamp((z + g.half) / g.cell - 0.5, 0, g.n - 1.001);
  const i = Math.floor(u);
  const j = Math.floor(v);
  const fu = u - i;
  const fv = v - j;
  const k = j * g.n + i;
  const a = g.d[k] as number;
  const b = g.d[k + 1] as number;
  const c = g.d[k + g.n] as number;
  const d = g.d[k + g.n + 1] as number;
  return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
};

const inside = (poly: [number, number][], x: number, z: number): boolean => {
  let on = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i] as [number, number];
    const b = poly[j] as [number, number];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) on = !on;
  }
  return on;
};
const edgeDistance = (poly: [number, number][], x: number, z: number): number => {
  let best = 1e9;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i] as [number, number];
    const b = poly[j] as [number, number];
    const vx = b[0] - a[0];
    const vz = b[1] - a[1];
    const t = clamp(((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1));
    best = Math.min(best, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return best;
};

export const STUCK_AT = rel(STUCK[0], STUCK[1]);

export function createField(): Field {
  const make = (half: number, n: number): Grid => ({ half, n, cell: (half * 2) / n, d: new Float32Array(n * n).fill(DRY) });
  const near = make(NEAR.half, NEAR.n);
  const far = make(FAR.half, FAR.n);
  const grids = [near, far];

  channel(grids, VEIN, 10);
  for (const creek of CREEKS) channel(grids, creek, 8);
  const rng = stream('marsh/land/field');
  for (let i = 0; i < 16; i++) {
    const a = rng.range(0, TAU);
    const r = 260 + 1500 * rng.next();
    let x = Math.sin(a) * r;
    let z = -Math.cos(a) * r;
    let heading = rng.range(0, TAU);
    const w = rng.range(2, 4.5);
    const nodes: Node[] = [];
    for (let k = 0; k < 9; k++) {
      nodes.push([x, z, w * (1 - k * 0.08)]);
      heading += rng.normal() * 0.5;
      const reach = rng.range(60, 150);
      x += Math.sin(heading) * reach;
      z -= Math.cos(heading) * reach;
    }
    channel(grids, nodes, 6);
  }
  for (const g of grids) stamp(g, 0, 0, POOL_R, 0, 0, POOL_R);
  for (const p of makePools()) for (const g of grids) stamp(g, p.x, p.z, p.r, p.x, p.z, p.r);
  // The shore wanders at every size, and the flats hold pools of their own: puddles a stride across near the brine, ponds further out.
  const crustAt = rel(STUCK[0], STUCK[1]);
  const ragged = (g: Grid, fine: boolean): void => {
    for (let j = 0; j < g.n; j++) {
      const z = -g.half + (j + 0.5) * g.cell;
      for (let i = 0; i < g.n; i++) {
        const k = j * g.n + i;
        let d = g.d[k] as number;
        const x = -g.half + (i + 0.5) * g.cell;
        if (fine && d < 6 && d > -6) {
          const fall = smooth(6, 3, Math.abs(d));
          d += fall * (1.5 * (fbm(x / 17 + 3, z / 17, 2) - 0.5) + 1.3 * (fbm(x / 6.3, z / 6.3, 3) - 0.5) + 0.7 * (fbm(x / 2.1 + 31, z / 2.1, 2) - 0.5) + 0.25 * (vnoise(x / 0.7 + 7, z / 0.7) - 0.5));
        }
        if (d > 0.5) {
          const r = Math.hypot(x, z);
          const pond = (0.71 + 0.3 * smooth(110, 60, r) - fbm(x / 70 + 9, z / 70, 3)) * 150;
          if (pond < d) d = pond;
          if (fine && d > 0.5 && r < 230 && Math.hypot(x - crustAt[0], z - crustAt[1]) > 11) {
            const th = 0.7 - 0.07 * Math.exp(-d / 4) - 0.12 * (fbm(x / 41 + 2, z / 41, 2) - 0.5);
            const puddle = (th - fbm(x / 3.7 + 11, z / 3.7 + 5, 3)) * 9;
            if (puddle < d) d = puddle;
          }
        }
        g.d[k] = d;
      }
    }
  };
  ragged(near, true);
  // The bank the third lens lies on: the pool's edge two strides in front of it, whatever the wander above has done there.
  for (let j = 0; j < near.n; j++) {
    const z = -near.half + (j + 0.5) * near.cell;
    if (Math.abs(z - K1_AT[1]) > 9) continue;
    for (let i = 0; i < near.n; i++) {
      const x = -near.half + (i + 0.5) * near.cell;
      if (Math.abs(x - K1_AT[0]) > 9) continue;
      const k = j * near.n + i;
      const dx = x - K1_AT[0];
      const dz = z - K1_AT[1];
      const ahead = dx * K1_DIR[0] + dz * K1_DIR[1];
      const across = -dx * K1_DIR[1] + dz * K1_DIR[0];
      // Land on the lens's side of a line that bows toward the lens at the middle of the frame.
      const want = 2.15 + 0.1 * across * across * 0.3 - ahead + 0.5 * (fbm(x / 1.3 + 2, z / 1.3, 3) - 0.5) + 0.25 * (vnoise(x / 0.4, z / 0.4) - 0.5);
      const w = smooth(8, 4.5, Math.hypot(dx, dz));
      near.d[k] = (near.d[k] as number) * (1 - w) + Math.max(-3, Math.min(3, want)) * w;
    }
  }
  ragged(far, false);

  const shore = (x: number, z: number): number => {
    if (Math.abs(x) < NEAR.half - 1 && Math.abs(z) < NEAR.half - 1) return sampleGrid(near, x, z);
    if (Math.abs(x) < FAR.half - 3 && Math.abs(z) < FAR.half - 3) return sampleGrid(far, x, z);
    return DRY;
  };

  const crust = CRUST.map((p) => rel(p[0], p[1]));
  let cx0 = 1e9;
  let cx1 = -1e9;
  let cz0 = 1e9;
  let cz1 = -1e9;
  for (const p of crust) {
    cx0 = Math.min(cx0, p[0]);
    cx1 = Math.max(cx1, p[0]);
    cz0 = Math.min(cz0, p[1]);
    cz1 = Math.max(cz1, p[1]);
  }
  const far3 = stream('marsh/land/thin');
  const patches: [number, number, number, number, number][] = [];
  for (let i = 0; i < 30; i++) {
    const a = far3.range(0, TAU);
    const r = 160 + 1800 * far3.next();
    const w = far3.range(20, 90);
    patches.push([Math.sin(a) * r, -Math.cos(a) * r, w, w * far3.range(0.4, 0.8), far3.range(0, 3)]);
  }
  const thin = (x: number, z: number): number => {
    let t = 0;
    if (x > cx0 - 4 && x < cx1 + 4 && z > cz0 - 4 && z < cz1 + 4) {
      const e = edgeDistance(crust, x, z) + 1.6 * (vnoise(x / 3.1, z / 3.1) - 0.5);
      t = inside(crust, x, z) ? smooth(0, 3.5, e) : 0;
    }
    for (const p of patches) {
      const dx = x - p[0];
      const dz = z - p[1];
      if (Math.abs(dx) > p[2] || Math.abs(dz) > p[2]) continue;
      const c = Math.cos(p[4]);
      const s = Math.sin(p[4]);
      const u = (dx * c + dz * s) / p[2];
      const v = (-dx * s + dz * c) / p[3];
      t = Math.max(t, smooth(1, 0.6, u * u + v * v));
    }
    return t;
  };

  const hrng = stream('marsh/land/hummocks');
  const hummocks: Hummock[] = [
    { x: rel(117, -40)[0], z: rel(117, -40)[1], a: 11, b: 8, h: 5.5, yaw: 0.4 },
    { x: rel(95, 27)[0], z: rel(95, 27)[1], a: 7.5, b: 5, h: 2.8, yaw: 1.2 },
    { x: rel(240, -150)[0], z: rel(240, -150)[1], a: 22, b: 15, h: 8, yaw: 0.2 },
    { x: rel(-40, -60)[0], z: rel(-40, -60)[1], a: 14, b: 9, h: 4, yaw: 2 },
  ];
  for (let i = 0; i < 26; i++) {
    const a = hrng.range(0, TAU);
    const r = 320 + 3200 * hrng.next();
    const w = hrng.range(14, 70);
    hummocks.push({ x: Math.sin(a) * r, z: -Math.cos(a) * r, a: w, b: w * hrng.range(0.5, 0.9), h: w * hrng.range(0.16, 0.3), yaw: hrng.range(0, Math.PI) });
  }
  // Salt mounds, a stride to a few metres across, by the hundred over the middle distance: they are what gives the flats their size.
  for (let i = 0; i < 260; i++) {
    const a = hrng.range(0.35, 1.55) + (hrng.next() < 0.25 ? hrng.range(-2, 2) : 0);
    const r = 34 + 620 * Math.pow(hrng.next(), 1.7);
    const w = hrng.range(0.7, 2.2) * (1 + r / 260);
    const x = Math.sin(a) * r;
    const z = -Math.cos(a) * r;
    if (shore(x, z) < w * 0.7) continue;
    hummocks.push({ x, z, a: w, b: w * hrng.range(0.5, 0.9), h: w * hrng.range(0.22, 0.42), yaw: hrng.range(0, Math.PI) });
  }
  const hummockAt = (x: number, z: number): number => {
    let h = -1;
    for (const m of hummocks) {
      const dx = x - m.x;
      const dz = z - m.z;
      const reach = m.a * 1.5;
      if (Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
      const c = Math.cos(m.yaw);
      const s = Math.sin(m.yaw);
      const u = (dx * c + dz * s) / m.a;
      const v = (-dx * s + dz * c) / m.b;
      const q = u * u + v * v + 0.25 * (fbm(x / (m.a * 0.35), z / (m.a * 0.35), 3) - 0.5);
      if (q > 1.4) continue;
      const k = 1 - smooth(0.25, 1.15, q);
      const ledges = 0.12 * m.h * (fbm(x / (m.a * 0.12) + 7, z / (m.a * 0.12), 3) - 0.5);
      h = Math.max(h, m.h * k + ledges * k - 0.4 * (1 - k));
    }
    return h;
  };

  // The rock rise the first camera leaves: beds of pale rock, stepped, with a broken foot that runs out toward the vein as low ledges.
  const spur = rel(9, -7.5);
  const rockAt = (x: number, z: number): number => {
    let base = rockHeight(x, z) * 0.8;
    const dx = x - spur[0];
    const dz = z - spur[1];
    const q = ((dx * F[0] + dz * F[1]) / 7.5) ** 2 + ((dx * R[0] + dz * R[1]) / 6) ** 2 + 0.5 * (fbm(x / 3.1 + 9, z / 3.1, 3) - 0.5);
    base = Math.max(base, 2.9 * (1 - smooth(0.15, 1.05, q)) - 0.5 * smooth(0.6, 1.05, q));
    if (base < -0.45) return base;
    const warp = 0.9 * (fbm(x / 5.2 + 3, z / 5.2, 3) - 0.5);
    const beds = base + warp;
    const bed = beds / 0.34;
    const part = bed - Math.floor(bed);
    // Each bed has a tread that leans back a little and a riser that is nearly a wall, its line broken where blocks have come away.
    const broken = 0.22 * (fbm(x / 0.6 + 4, z / 0.6, 3) - 0.5);
    const stepped = (Math.floor(bed) + 0.15 * part + 0.85 * smooth(0.78 + broken, 0.97 + broken, part)) * 0.34;
    // The beds dip, so the rock weathers into sharp ribs that run one way with broken blocks between: crests are edges, hollows are round.
    const u = x * 0.82 + z * 0.57;
    const w = -x * 0.57 + z * 0.82;
    const ridge = (a: number, b: number, o: number): number => {
      const r = 1 - Math.abs(fbm(a, b, o) - 0.5) * 2.6;
      return r > 0 ? r * r : 0;
    };
    const crag = 0.5 * (ridge(u / 6.3 + 2, w / 2.1, 3) - 0.3) + 0.24 * (ridge(u / 1.9 + 8, w / 0.8 + 3, 3) - 0.3) + 0.09 * (ridge(x / 0.45, z / 0.45 + 6, 2) - 0.3);
    const rough = 0.16 * (fbm(x / 1.7, z / 1.7, 4) - 0.5) + 0.07 * (fbm(x / 0.33, z / 0.33, 3) - 0.5) + 0.03 * (fbm(x / 0.09, z / 0.09, 2) - 0.5);
    return base * 0.25 + (stepped - warp) * 0.75 + (rough + crag) * smooth(-0.4, 0.6, base);
  };

  // The flats: a bed under the brine, a shelf a finger under its level at the shore (the brine's own edge is cut for each pixel, on this shelf),
  // then a low bank with a raised rim of salt.
  const flats = (x: number, z: number, s: number): number => {
    if (s < 0.12) return Math.max(-0.7, Math.min(-0.03, s * 0.5 + 0.02));
    const swell = 0.05 * (fbm(x / 19, z / 19, 2) - 0.35);
    const bank = -0.03 + 0.1 * smooth(0.12, 0.5, s) + 0.035 * Math.exp(-(((s - 0.55) / 0.25) ** 2)) + 0.05 * smooth(0.8, 5, s);
    return bank + Math.max(0, swell) * smooth(0.3, 3, s);
  };

  const height = (x: number, z: number): number => {
    const s = shore(x, z);
    let h = flats(x, z, s);
    const r = Math.abs(x) < 80 && Math.abs(z) < 80 ? rockAt(x, z) : -1;
    if (r > h) h = r;
    const m = hummockAt(x, z);
    if (m > h) h = m;
    return h;
  };

  const apron = ([[6, -5], [11, -8.5], [18, -12], [24, -9.5], [29, -5.4], [30, -1], [24, -2.4], [18, -5.6], [12, -3.4]] as [number, number][]).map((p) => rel(p[0], p[1]));
  const stain = (x: number, z: number): number => {
    const drift = fbm(x / 47 + 5, z / 47, 3);
    if (Math.abs(x) > 60 || Math.abs(z) > 60) return drift * 0.6;
    const e = edgeDistance(apron, x, z);
    return Math.max(drift * 0.6, inside(apron, x, z) ? 0.6 + 0.4 * smooth(0, 2.5, e) : 0.6 * smooth(3, 0, e));
  };

  // What the shaders read: red metres to brine, green thin crust, blue how stained the ground is. Green and blue change slowly, so they are worked
  // out on every fourth cell and spread.
  const texture = (g: Grid): THREE.DataTexture => {
    const n = g.n;
    const m = n / 4 + 1;
    const coarse = new Float32Array(m * m * 2);
    for (let j = 0; j < m; j++) {
      const z = -g.half + j * 4 * g.cell;
      for (let i = 0; i < m; i++) {
        const x = -g.half + i * 4 * g.cell;
        coarse[(j * m + i) * 2] = thin(x, z);
        coarse[(j * m + i) * 2 + 1] = stain(x, z);
      }
    }
    const data = new Uint16Array(n * n * 4);
    const half = THREE.DataUtils.toHalfFloat;
    for (let j = 0; j < n; j++) {
      const v = (j + 0.5) / 4;
      const j0 = Math.floor(v);
      const fv = v - j0;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / 4;
        const i0 = Math.floor(u);
        const fu = u - i0;
        const c = (j0 * m + i0) * 2;
        const k = (j * n + i) * 4;
        data[k] = half(g.d[j * n + i] as number);
        for (let q = 0; q < 2; q++) {
          const a = coarse[c + q] as number;
          const b = coarse[c + 2 + q] as number;
          const d = coarse[c + m * 2 + q] as number;
          const e = coarse[c + m * 2 + 2 + q] as number;
          data[k + 1 + q] = half(a + (b - a) * fu + (d - a) * fv + (a - b - d + e) * fu * fv);
        }
      }
    }
    // The smaller copies are made here, from the real numbers: a far pixel then reads the mean distance to brine under it.
    const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.HalfFloatType);
    const levels: { data: Uint16Array; width: number; height: number }[] = [{ data, width: n, height: n }];
    let prev = new Float32Array(n * n * 3);
    for (let k = 0; k < n * n; k++) {
      prev[k * 3] = g.d[k] as number;
      prev[k * 3 + 1] = THREE.DataUtils.fromHalfFloat(data[k * 4 + 1] as number);
      prev[k * 3 + 2] = THREE.DataUtils.fromHalfFloat(data[k * 4 + 2] as number);
    }
    for (let size = n / 2; size >= 1; size /= 2) {
      const next = new Float32Array(size * size * 3);
      const out = new Uint16Array(size * size * 4);
      const w = size * 2;
      for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
          for (let q = 0; q < 3; q++) {
            const a = (j * 2 * w + i * 2) * 3 + q;
            const v = ((prev[a] as number) + (prev[a + 3] as number) + (prev[a + w * 3] as number) + (prev[a + w * 3 + 3] as number)) / 4;
            next[(j * size + i) * 3 + q] = v;
            out[(j * size + i) * 4 + q] = half(v);
          }
        }
      }
      levels.push({ data: out, width: size, height: size });
      prev = next;
    }
    t.mipmaps = levels as unknown as THREE.DataTexture['mipmaps'];
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 1;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    return t;
  };
  const nearMap = texture(near);
  const farMap = texture(far);

  return {
    shore,
    height,
    thin,
    near: nearMap,
    far: farMap,
    hummocks,
    dispose: () => {
      nearMap.dispose();
      farMap.dispose();
    },
  };
}
