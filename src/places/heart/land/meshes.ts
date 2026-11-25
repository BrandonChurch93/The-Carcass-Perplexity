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

type P3 = [number, number, number];

/**
 * One shape of loose rock, about a metre across: a block broken out of a flow. It is a true solid with flat faces and sharp edges,
 * a box cut by `planes` planes: the first few take whole sides off it, the rest only knock off corners and edges.
 * Every face has its own corners, so the faces are lit flat.
 */
export function rockShape(seed: number, planes: number): THREE.BufferGeometry {
  let s = seed * 7919 + 13;
  const rnd = (): number => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const ex = 0.78 + 0.22 * rnd();
  const ey = 0.78 + 0.22 * rnd();
  const ez = 0.78 + 0.22 * rnd();
  // Faces as loops of corners, counter-clockwise seen from outside.
  let faces: P3[][] = [
    [[ex, -ey, -ez], [ex, ey, -ez], [ex, ey, ez], [ex, -ey, ez]],
    [[-ex, -ey, ez], [-ex, ey, ez], [-ex, ey, -ez], [-ex, -ey, -ez]],
    [[-ex, ey, -ez], [-ex, ey, ez], [ex, ey, ez], [ex, ey, -ez]],
    [[-ex, -ey, ez], [-ex, -ey, -ez], [ex, -ey, -ez], [ex, -ey, ez]],
    [[-ex, -ey, ez], [ex, -ey, ez], [ex, ey, ez], [-ex, ey, ez]],
    [[ex, -ey, -ez], [-ex, -ey, -ez], [-ex, ey, -ez], [ex, ey, -ez]],
  ];
  for (let k = 0; k < planes; k++) {
    const u = rnd() * 2 - 1;
    const a = rnd() * Math.PI * 2;
    const q = Math.sqrt(1 - u * u);
    const n: P3 = [q * Math.cos(a), u, q * Math.sin(a)];
    const reach = Math.abs(n[0]) * ex + Math.abs(n[1]) * ey + Math.abs(n[2]) * ez;
    const c = reach * (k < 4 ? 0.42 + 0.26 * rnd() : 0.68 + 0.24 * rnd());
    const side = (p: P3): number => p[0] * n[0] + p[1] * n[1] + p[2] * n[2] - c;
    const cut: P3[] = [];
    const kept: P3[][] = [];
    for (const f of faces) {
      const out: P3[] = [];
      for (let i = 0; i < f.length; i++) {
        const p = f[i] as P3;
        const r = f[(i + 1) % f.length] as P3;
        const dp = side(p);
        const dr = side(r);
        if (dp <= 0) out.push(p);
        if (dp <= 0 !== dr <= 0) {
          const t = dp / (dp - dr);
          const m: P3 = [p[0] + (r[0] - p[0]) * t, p[1] + (r[1] - p[1]) * t, p[2] + (r[2] - p[2]) * t];
          out.push(m);
          cut.push(m);
        }
      }
      if (out.length >= 3) kept.push(out);
    }
    if (cut.length >= 6) {
      // The new face: the cut points in order round the plane's normal.
      const o: P3 = [0, 0, 0];
      for (const p of cut) {
        o[0] += p[0] / cut.length;
        o[1] += p[1] / cut.length;
        o[2] += p[2] / cut.length;
      }
      const h: P3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const e1: P3 = [n[1] * h[2] - n[2] * h[1], n[2] * h[0] - n[0] * h[2], n[0] * h[1] - n[1] * h[0]];
      const e2: P3 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
      const angle = (p: P3): number => Math.atan2((p[0] - o[0]) * e2[0] + (p[1] - o[1]) * e2[1] + (p[2] - o[2]) * e2[2], (p[0] - o[0]) * e1[0] + (p[1] - o[1]) * e1[1] + (p[2] - o[2]) * e1[2]);
      const ring = cut.map((p) => ({ p, a: angle(p) })).sort((x, y) => x.a - y.a);
      const loop: P3[] = [];
      for (const r of ring) {
        const last = loop[loop.length - 1];
        if (!last || Math.hypot(r.p[0] - last[0], r.p[1] - last[1], r.p[2] - last[2]) > 1e-5) loop.push(r.p);
      }
      const first = loop[0] as P3;
      const end = loop[loop.length - 1] as P3;
      if (loop.length > 3 && Math.hypot(first[0] - end[0], first[1] - end[1], first[2] - end[2]) < 1e-5) loop.pop();
      if (loop.length >= 3) kept.push(loop);
    }
    faces = kept;
  }
  // Sheared, so that no two faces stay square to each other: a broken block, not a cut cube. Flat faces stay flat.
  const kxy = 0.7 * (rnd() - 0.5);
  const kzy = 0.7 * (rnd() - 0.5);
  const kxz = 0.6 * (rnd() - 0.5);
  faces = faces.map((f) => f.map((p): P3 => [p[0] + kxy * p[1] + kxz * p[2], p[1], p[2] + kzy * p[1]]));
  const position: number[] = [];
  const normal: number[] = [];
  for (const f of faces) {
    // Newell's sum: the normal of a loop, whatever its number of corners.
    let nx = 0;
    let ny = 0;
    let nz = 0;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < f.length; i++) {
      const p = f[i] as P3;
      const r = f[(i + 1) % f.length] as P3;
      nx += (p[1] - r[1]) * (p[2] + r[2]);
      ny += (p[2] - r[2]) * (p[0] + r[0]);
      nz += (p[0] - r[0]) * (p[1] + r[1]);
      cx += p[0] / f.length;
      cy += p[1] / f.length;
      cz += p[2] / f.length;
    }
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-9) continue;
    const flip = nx * cx + ny * cy + nz * cz < 0;
    const sign = flip ? -1 / l : 1 / l;
    for (let i = 1; i + 1 < f.length; i++) {
      const tri = flip ? [f[0], f[i + 1], f[i]] : [f[0], f[i], f[i + 1]];
      for (const p of tri as P3[]) {
        position.push(p[0], p[1], p[2]);
        normal.push(nx * sign, ny * sign, nz * sign);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.computeBoundingSphere();
  return g;
}

export { fbm };

/**
 * The spatter rind of the shore: a lip of glass that the lake has built out over itself, hung with frozen dribbles and undercut.
 * It runs along the line where the bench meets the lake, from one end point to the other; `distance` is the layout's distance to that line
 * (positive on the bench) and `wobble` any smooth noise of two numbers between 0 and 1.
 */
export function shoreLip(height: Height, distance: Height, wobble: Height, from: [number, number], length: number): THREE.BufferGeometry {
  const gap = 0.07;
  const count = Math.floor(length / gap);
  let [x, z] = from;
  const sections: { x: number; z: number; nx: number; nz: number; d0: number }[] = [];
  for (let i = 0; i < count; i++) {
    let nx = 0;
    let nz = 0;
    for (let k = 0; k < 4; k++) {
      const d = distance(x, z);
      const gx = (distance(x + 0.2, z) - distance(x - 0.2, z)) / 0.4;
      const gz = (distance(x, z + 0.2) - distance(x, z - 0.2)) / 0.4;
      const l = Math.hypot(gx, gz) || 1;
      nx = gx / l;
      nz = gz / l;
      x -= (d * nx) / l;
      z -= (d * nz) / l;
    }
    // Where the ground itself comes out of the lake, going inland.
    let d0 = 1.2;
    for (let d = -0.4; d < 1.2; d += 0.04) {
      if (height(x + nx * d, z + nz * d) > 0.02) {
        d0 = d;
        break;
      }
    }
    sections.push({ x, z, nx, nz, d0 });
    // On along the shore, the lake on the left.
    x += nz * gap;
    z -= nx * gap;
  }
  const position: number[] = [];
  const index: number[] = [];
  const RING = 10;
  for (let i = 0; i < count; i++) {
    const c = sections[i] as (typeof sections)[number];
    let d0 = 0;
    let n = 0;
    for (let k = Math.max(0, i - 6); k <= Math.min(count - 1, i + 6); k++) {
      d0 += (sections[k] as (typeof sections)[number]).d0;
      n++;
    }
    d0 /= n;
    const s = i * gap;
    const ends = Math.min(1, s / 1.5, (count - 1 - i) * gap / 1.5);
    // Whole stretches of it have broken off and gone under.
    const whole = Math.min(1, Math.max(0, (wobble(s / 6.3, 4.7) - 0.3) * 5)) * Math.max(0, ends);
    const over = (0.2 + 0.32 * wobble(s / 1.9, 1.3)) * whole;
    const ground = height(c.x + c.nx * (d0 + 0.5), c.z + c.nz * (d0 + 0.5));
    const top = Math.min(0.5, Math.max(0.27, ground)) + 0.03 + 0.07 * (wobble(s / 0.8, 9.1) - 0.5) + 0.1 * (wobble(s / 2.7, 0.4) - 0.5);
    const thick = 0.09 + 0.07 * wobble(s / 1.1, 5.5);
    // Dribbles: most of the edge hangs a little, here and there a tongue runs down to the crust.
    const tooth = wobble(s / 0.16, 2.2);
    const tongue = wobble(s / 0.55, 7.7);
    const drip = (0.03 + 0.1 * tooth * tooth + 0.3 * Math.pow(Math.max(0, tongue - 0.45) / 0.55, 2) * (0.4 + 0.6 * tooth)) * whole;
    const nose = -over - 0.04 * (tooth - 0.5) * whole;
    const under = Math.max(top - thick - drip, 0.01);
    // Clots of spatter: the top is lumpy, and its inland edge ragged.
    const reach = 0.2 + 0.36 * wobble(s / 0.9, 6.1) * whole + 0.22 * Math.pow(wobble(s / 0.27, 1.9), 2) * whole;
    const lumpA = 0.15 * (wobble(s / 0.31, 3.3) - 0.5);
    const lumpB = 0.15 * (wobble(s / 0.23, 8.3) - 0.5);
    const ring: [number, number][] = [
      [reach, height(c.x + c.nx * (d0 + reach), c.z + c.nz * (d0 + reach)) - 0.04],
      [0.62 * reach, Math.max(ground, top - 0.06) + 0.01 + lumpA],
      [0.25 * reach, top + lumpB],
      [nose + 0.12, top - 0.008 + lumpA],
      [nose + 0.03, top - 0.035],
      [nose, top - 0.5 * thick],
      [nose + 0.025, under],
      [nose + 0.09, Math.max(top - thick - 0.2 * drip, 0.03)],
      [-0.02, top - thick - 0.02],
      [0.04, -0.08],
    ];
    for (const [d, y] of ring) position.push(c.x + c.nx * (d0 + d), y, c.z + c.nz * (d0 + d));
    if (i > 0) {
      const a = (i - 1) * RING;
      const b = i * RING;
      for (let k = 0; k + 1 < RING; k++) index.push(a + k, b + k, a + k + 1, a + k + 1, b + k, b + k + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  // The winding follows the way the shore is walked: turned over if its top looks down.
  const normal = g.getAttribute('normal') as THREE.BufferAttribute;
  if (normal.getY(2) < 0) {
    for (let i = 0; i < index.length; i += 3) {
      const t = index[i + 1] as number;
      index[i + 1] = index[i + 2] as number;
      index[i + 2] = t;
    }
    g.setIndex(index);
    g.computeVertexNormals();
  }
  g.setAttribute('aSlope', g.getAttribute('normal'));
  g.computeBoundingSphere();
  return g;
}
