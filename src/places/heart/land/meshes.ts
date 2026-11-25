// The meshes of the land: the wall as a ring round the lake, sheets for the bench and the buttress, and the shapes of loose rock.
import * as THREE from 'three';
import { fbm, noise } from './height';

export type Height = (x: number, z: number) => number;

const CALDERA = { x: 190, z: 90, west: 1320, east: 1100, b: 425 };

/** Metres from the middle of the caldera to the edge of the lake, along a bearing. */
function lakeRadius(c: number, s: number): number {
  const a = c < 0 ? CALDERA.west : CALDERA.east;
  return Math.pow(Math.pow(Math.abs(c) / a, 4) + Math.pow(Math.abs(s) / CALDERA.b, 4), -0.25);
}

function slopeAt(height: Height, x: number, z: number, e: number, out: Float32Array, i: number): void {
  const dx = height(x + e, z) - height(x - e, z);
  const dz = height(x, z + e) - height(x, z - e);
  const l = Math.hypot(dx, 2 * e, dz);
  out[i * 3] = -dx / l;
  out[i * 3 + 1] = (2 * e) / l;
  out[i * 3 + 2] = -dz / l;
}

export interface Rib {
  /** Where the rib starts, and the unit direction it runs in. */
  x: number;
  z: number;
  dx: number;
  dz: number;
  length: number;
  /** A rib that is off draws no strip between itself and the next. */
  on: boolean;
  /** Distances beyond the end at which the rib carries on, coarsely. */
  tail?: number[];
}

/**
 * A surface as ribs: each rib is a straight line on the map, and neighbouring ribs are joined by a strip.
 * Along a rib the rows are spread evenly over the length of the surface, not over the map, so a cliff gets as many as a flat.
 */
export function ribs(height: Height, list: Rib[], rows: number, grain = 0.8, flat = 0.3): THREE.BufferGeometry {
  const tail = list[0]?.tail?.length ?? 0;
  const per = rows + tail;
  const position = new Float32Array(list.length * per * 3);
  const slope = new Float32Array(list.length * per * 3);
  let hs = new Float64Array(0);
  let arc = new Float64Array(0);
  list.forEach((rib, ci) => {
    if (!rib.on && !(list[ci - 1]?.on ?? false)) return;
    const count = Math.floor(rib.length / grain) + 1;
    if (hs.length < count) {
      hs = new Float64Array(count);
      arc = new Float64Array(count);
    }
    const step = rib.length / (count - 1);
    for (let k = 0; k < count; k++) hs[k] = height(rib.x + rib.dx * k * step, rib.z + rib.dz * k * step);
    arc[0] = 0;
    for (let k = 1; k < count; k++) {
      const rise = Math.abs((hs[k] as number) - (hs[k - 1] as number));
      arc[k] = (arc[k - 1] as number) + Math.hypot(step, rise) * (flat + (1 - flat) * Math.min(1, rise / step / 0.9));
    }
    const total = arc[count - 1] as number;
    let k = 1;
    for (let j = 0; j < per; j++) {
      let d: number;
      if (j < rows) {
        const want = (total * j) / (rows - 1);
        while (k < count - 1 && (arc[k] as number) < want) k++;
        const a = arc[k - 1] as number;
        const b = arc[k] as number;
        d = (k - 1 + (b > a ? Math.min(1, (want - a) / (b - a)) : 0)) * step;
      } else d = rib.length + ((rib.tail as number[])[j - rows] as number);
      const x = rib.x + rib.dx * d;
      const z = rib.z + rib.dz * d;
      const i = ci * per + j;
      position[i * 3] = x;
      position[i * 3 + 1] = height(x, z);
      position[i * 3 + 2] = z;
      slopeAt(height, x, z, j < rows ? 0.7 : 30, slope, i);
    }
  });
  const index: number[] = [];
  let flip: boolean | null = null;
  for (let ci = 0; ci + 1 < list.length; ci++) {
    if (!(list[ci] as Rib).on) continue;
    if (flip === null) {
      // Which way the strips wind depends on which way the ribs follow each other: make them face up.
      const a = ci * per;
      const b = a + per;
      const ux = (position[(a + 1) * 3] as number) - (position[a * 3] as number);
      const uz = (position[(a + 1) * 3 + 2] as number) - (position[a * 3 + 2] as number);
      const vx = (position[b * 3] as number) - (position[a * 3] as number);
      const vz = (position[b * 3 + 2] as number) - (position[a * 3 + 2] as number);
      flip = uz * vx - ux * vz < 0;
    }
    for (let j = 0; j + 1 < per; j++) {
      const a = ci * per + j;
      const b = a + per;
      if (flip) index.push(a, b, a + 1, b, b + 1, a + 1);
      else index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aSlope', new THREE.BufferAttribute(slope, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

/** The ribs of the caldera wall: they run outward from just inside the lake's edge. `spacing(x, z)` is metres between ribs where they cross the wall; zero leaves that stretch out. */
export function wallRibs(spacing: (x: number, z: number) => number, from: number, to: number, tail: number[]): Rib[] {
  const list: Rib[] = [];
  let theta = 0;
  for (;;) {
    const t = Math.min(theta, Math.PI * 2);
    const c = Math.cos(t);
    const s = Math.sin(t);
    const r = lakeRadius(c, s);
    const w = spacing(CALDERA.x + c * (r + 150), CALDERA.z + s * (r + 150));
    list.push({ x: CALDERA.x + c * (r + from), z: CALDERA.z + s * (r + from), dx: c, dz: s, length: to - from, on: w > 0, tail });
    if (theta >= Math.PI * 2) break;
    theta += (w > 0 ? w : 40) / (r + 150);
  }
  return list;
}

/** A level grid draped on the land. `keep` chooses the triangles by their corners: a triangle is kept when it says yes for all three. */
export function sheet(x0: number, z0: number, x1: number, z1: number, cell: number, height: Height, keep: (x: number, z: number, y: number) => boolean, lift = 0, e = cell * 0.5): THREE.BufferGeometry {
  const nx = Math.max(1, Math.round((x1 - x0) / cell));
  const nz = Math.max(1, Math.round((z1 - z0) / cell));
  const total = (nx + 1) * (nz + 1);
  const ok = new Uint8Array(total);
  const ys = new Float32Array(total);
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx;
      const z = z0 + ((z1 - z0) * j) / nz;
      const y = height(x, z);
      const v = j * (nx + 1) + i;
      ys[v] = y;
      ok[v] = keep(x, z, y) ? 1 : 0;
    }
  }
  // Only the corners that a kept triangle uses are stored.
  const remap = new Int32Array(total).fill(-1);
  const index: number[] = [];
  const places: number[] = [];
  const use = (v: number): number => {
    let r = remap[v] as number;
    if (r < 0) {
      r = places.length;
      remap[v] = r;
      places.push(v);
    }
    return r;
  };
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      if (ok[a] && ok[c] && ok[b]) index.push(use(a), use(c), use(b));
      if (ok[b] && ok[c] && ok[d]) index.push(use(b), use(c), use(d));
    }
  }
  const position = new Float32Array(places.length * 3);
  const slope = new Float32Array(places.length * 3);
  places.forEach((v, r) => {
    const i = v % (nx + 1);
    const j = Math.floor(v / (nx + 1));
    const x = x0 + ((x1 - x0) * i) / nx;
    const z = z0 + ((z1 - z0) * j) / nz;
    position[r * 3] = x;
    position[r * 3 + 1] = (ys[v] as number) + lift;
    position[r * 3 + 2] = z;
    slopeAt(height, x, z, e, slope, r);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aSlope', new THREE.BufferAttribute(slope, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

function noise3(x: number, y: number, z: number): number {
  // Three slices of the plane noise, enough for the skin of a rock.
  return (noise(x + y * 0.71, z - y * 0.53) + noise(y + z * 0.67 + 19, x - z * 0.41 + 7) + noise(z + x * 0.59 + 41, y - x * 0.47 + 23)) / 3;
}

/**
 * One shape of loose rock, about a metre across: a block cut by a few planes, its edges worn and its faces pitted.
 * `n` is the number of cells along the edge of each of the six faces of the cube it is blown from.
 */
export function rockShape(seed: number, n: number, planes: number): THREE.BufferGeometry {
  let s = seed * 7919 + 13;
  const rnd = (): number => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const cuts: [number, number, number, number][] = [];
  for (let k = 0; k < planes; k++) {
    const u = rnd() * 2 - 1;
    const a = rnd() * Math.PI * 2;
    const q = Math.sqrt(1 - u * u);
    cuts.push([q * Math.cos(a), u, q * Math.sin(a), 0.5 + 0.5 * rnd()]);
  }
  const radius = (x: number, y: number, z: number): number => {
    let r = 1.25;
    for (const c of cuts) {
      const d = x * c[0] + y * c[1] + z * c[2];
      if (d > 0.05) r = Math.min(r, c[3] / d);
    }
    const o = seed * 3.7;
    return r * (0.86 + 0.2 * noise3(x * 1.7 + o, y * 1.7, z * 1.7) + 0.1 * noise3(x * 4.6 + o, y * 4.6 + 5, z * 4.6)) + 0.03 * noise3(x * 11 + o, y * 11, z * 11 + 3);
  };
  const position: number[] = [];
  const normal: number[] = [];
  const index: number[] = [];
  const point = (x: number, y: number, z: number): [number, number, number] => {
    const l = Math.hypot(x, y, z);
    const r = radius(x / l, y / l, z / l) / l;
    return [x * r, y * r, z * r];
  };
  const faces: [number[], number[], number[]][] = [
    [[1, 0, 0], [0, 1, 0], [0, 0, -1]],
    [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[0, 1, 0], [0, 0, 1], [-1, 0, 0]],
    [[0, -1, 0], [0, 0, 1], [1, 0, 0]],
    [[0, 0, 1], [0, 1, 0], [1, 0, 0]],
    [[0, 0, -1], [0, 1, 0], [-1, 0, 0]],
  ];
  for (const [o, up, right] of faces) {
    const base = position.length / 3;
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        // The tangent warp evens out the cells of a cube blown to a sphere.
        const a = Math.tan(((i / n) * 2 - 1) * 0.7854);
        const b = Math.tan(((j / n) * 2 - 1) * 0.7854);
        const d = [0, 1, 2].map((k) => (o[k] as number) + a * (right[k] as number) + b * (up[k] as number)) as [number, number, number];
        const p = point(d[0], d[1], d[2]);
        const e = 0.04;
        const pa = point(d[0] + e * (right[0] as number), d[1] + e * (right[1] as number), d[2] + e * (right[2] as number));
        const pb = point(d[0] + e * (up[0] as number), d[1] + e * (up[1] as number), d[2] + e * (up[2] as number));
        const ux = pa[0] - p[0];
        const uy = pa[1] - p[1];
        const uz = pa[2] - p[2];
        const vx = pb[0] - p[0];
        const vy = pb[1] - p[1];
        const vz = pb[2] - p[2];
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        if (nx * p[0] + ny * p[1] + nz * p[2] < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        const l = Math.hypot(nx, ny, nz) || 1;
        position.push(p[0], p[1], p[2]);
        normal.push(nx / l, ny / l, nz / l);
      }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = base + j * (n + 1) + i;
        const b = a + 1;
        const c = a + n + 1;
        const d = c + 1;
        index.push(a, b, c, b, d, c);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.setIndex(index);
  // The winding of a face depends on the handedness of its axes: make every triangle face outward.
  const idx = g.getIndex() as THREE.BufferAttribute;
  for (let t = 0; t < idx.count; t += 3) {
    const a = idx.getX(t);
    const b = idx.getX(t + 1);
    const c = idx.getX(t + 2);
    const ax = position[a * 3] as number;
    const ay = position[a * 3 + 1] as number;
    const az = position[a * 3 + 2] as number;
    const ux = (position[b * 3] as number) - ax;
    const uy = (position[b * 3 + 1] as number) - ay;
    const uz = (position[b * 3 + 2] as number) - az;
    const vx = (position[c * 3] as number) - ax;
    const vy = (position[c * 3 + 1] as number) - ay;
    const vz = (position[c * 3 + 2] as number) - az;
    const out = (uy * vz - uz * vy) * ax + (uz * vx - ux * vz) * ay + (ux * vy - uy * vx) * az;
    if (out < 0) {
      idx.setX(t + 1, c);
      idx.setX(t + 2, b);
    }
  }
  g.computeBoundingSphere();
  return g;
}

export { fbm };
