// The shapes of the land: sheets of vertices bent into blades, weed skirts, stacks, the arch and the boulders.
import * as THREE from 'three';
import { hash2 } from '../../../core/rng';
import { TIDE, partAtHeight, radii, skirtPad, surface, type Rib } from '../layout';
import { fbm3, noise2, noise3, smooth } from './noise';

type At = (j: number, i: number, out: THREE.Vector3) => [number, number];

/** A sheet of rows x cols vertices. A closed sheet repeats its first column as its last. Normals are smooth across the seam and point out of a tube or up from a floor. */
export function sheet(rows: number, cols: number, closed: boolean, hint: 'out' | 'up', at: At): THREE.BufferGeometry {
  const positions = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const normals = new Float32Array(rows * cols * 3);
  const p = new THREE.Vector3();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const uv = at(j, i, p);
      const k = j * cols + i;
      positions[k * 3] = p.x;
      positions[k * 3 + 1] = p.y;
      positions[k * 3 + 2] = p.z;
      uvs[k * 2] = uv[0];
      uvs[k * 2 + 1] = uv[1];
    }
  }
  const get = (j: number, i: number, out: THREE.Vector3): THREE.Vector3 => out.fromArray(positions, (j * cols + i) * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  const n = new THREE.Vector3();
  const mid = new THREE.Vector3();
  let facing = 0;
  for (let j = 0; j < rows; j++) {
    mid.set(0, 0, 0);
    for (let i = 0; i < cols; i++) mid.add(get(j, i, a));
    mid.multiplyScalar(1 / cols);
    for (let i = 0; i < cols; i++) {
      let il = i - 1;
      let ir = i + 1;
      if (closed) {
        if (il < 0) il = cols - 2;
        if (ir > cols - 1) ir = 1;
      } else {
        il = Math.max(0, il);
        ir = Math.min(cols - 1, ir);
      }
      get(j, il, a);
      get(j, ir, b);
      get(Math.max(0, j - 1), i, c);
      get(Math.min(rows - 1, j + 1), i, d);
      n.crossVectors(d.sub(c), b.sub(a));
      if (n.lengthSq() < 1e-12) n.set(0, 1, 0);
      n.normalize();
      n.toArray(normals, (j * cols + i) * 3);
      get(j, i, a);
      facing += hint === 'up' ? n.y : n.dot(a.sub(mid));
    }
  }
  const flip = facing < 0;
  if (flip) for (let k = 0; k < normals.length; k++) normals[k] = -(normals[k] as number);
  const index = new Uint32Array((rows - 1) * (cols - 1) * 6);
  let w = 0;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const v0 = j * cols + i;
      const v1 = v0 + 1;
      const v2 = v0 + cols;
      const v3 = v2 + 1;
      if (flip) {
        index[w++] = v0; index[w++] = v1; index[w++] = v2;
        index[w++] = v1; index[w++] = v3; index[w++] = v2;
      } else {
        index[w++] = v0; index[w++] = v2; index[w++] = v1;
        index[w++] = v1; index[w++] = v2; index[w++] = v3;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return g;
}

const unit = (i: number, salt: number): number => hash2(i | 0, salt) / 4294967296;

/** How far the rock stands out from the smooth blade at a point, metres: masses of 50 m, beds of 10 m with undercut ledges, flutes and joints of 5 m, blocks of 2 m. */
export function relief(x: number, y: number, z: number): number {
  let d = 10 * (fbm3(x / 70, y / 95, z / 70, 3) - 0.5);
  const warp = 4 * (noise3(x / 45, y / 45, z / 45) - 0.5);
  const beds = (y + warp) / 9.5;
  const bedAt = Math.floor(beds);
  const k = beds - bedAt;
  const here = unit(bedAt, 11);
  const above = unit(bedAt + 1, 11);
  d += 3.2 * (here + (above - here) * smooth(0.82, 1, k) - 0.5);
  const thin = (y + warp * 0.5) / 2.3;
  const thinAt = Math.floor(thin);
  const kt = thin - thinAt;
  const th = unit(thinAt, 23);
  d += 0.8 * (th + (unit(thinAt + 1, 23) - th) * smooth(0.75, 1, kt) - 0.5);
  d += 2.2 * (fbm3(x / 6.5, y / 26, z / 6.5, 2) - 0.5);
  d += 0.8 * (noise3(x / 2.1, y / 2.1, z / 2.1) - 0.5);
  return d;
}

export interface BladeOptions {
  around: number;
  /** Metres between rings low on the blade. */
  fine: number;
}

/** A blade of the layout with its relief. u runs round it in metres, v along it in metres. */
export function bladeShape(rib: Rib, options: BladeOptions): THREE.BufferGeometry {
  const tTop = rib.cut === undefined ? 1 : partAtHeight(rib, rib.cut);
  const ts: number[] = [];
  const along: number[] = [];
  let t = 0;
  let run = 0;
  const here = new THREE.Vector3();
  while (t < tTop) {
    ts.push(t);
    along.push(run);
    here.copy(surface(rib, t, 0, 0, 0));
    const ahead = surface(rib, Math.min(1, t + 0.002), 0, 0, 0);
    const speed = Math.max(1, ahead.distanceTo(here) / 0.002);
    const want = options.fine + (6 - options.fine) * smooth(50, 180, here.y);
    t += want / speed;
    run += want;
  }
  ts.push(tTop);
  along.push(run);
  const cap = [0.82, 0.55, 0.25, 0.0];
  const body = ts.length;
  const rows = body + cap.length + 1;
  const cols = options.around + 1;
  const [a0, b0] = radii(rib, 0);
  const girth = Math.PI * (3 * (a0 + b0) - Math.sqrt((3 * a0 + b0) * (a0 + 3 * b0)));
  const uSpan = Math.max(1, Math.round(girth / 96)) * 96;
  const base = new THREE.Vector3();
  const out = new THREE.Vector3();
  return sheet(rows, cols, true, 'out', (j, i, p) => {
    const phi = ((i % options.around) / options.around) * Math.PI * 2;
    const u = (i / options.around) * uSpan;
    if (j === 0) {
      const [a, b] = radii(rib, 0);
      p.copy(surface(rib, 0, phi, a + 2, b + 2));
      p.y -= 16;
      return [u, -16];
    }
    const r = Math.min(j - 1, body - 1);
    const tr = ts[r] as number;
    const [a, b] = radii(rib, tr);
    const shrink = j - 1 < body ? 1 : (cap[j - 1 - body] as number);
    base.copy(surface(rib, tr, phi, a * shrink, b * shrink));
    out.copy(surface(rib, tr, phi, a * shrink + 1, b * shrink + 1)).sub(base);
    if (shrink < 1) {
      // The tip, or the broken top of a stump: closed over, a little proud of the last ring.
      const lift = (1 - shrink) * Math.min(a, b) * (rib.cut === undefined ? 0.7 : 0.25);
      const top = surface(rib, Math.min(1, tr + 0.004), 0, 0, 0).sub(surface(rib, tr, 0, 0, 0)).normalize();
      base.addScaledVector(top, lift);
    }
    const slim = Math.min(1, Math.min(a, b) / 28);
    const low = 0.35 + 0.65 * smooth(22, 60, base.y);
    const d = relief(base.x, base.y, base.z) * slim * low * (shrink < 1 ? 0.5 + 0.5 * shrink : 1);
    p.copy(base).addScaledVector(out, d);
    return [u, (along[r] as number) + (1 - shrink) * Math.min(a, b)];
  });
}

/** The top of the weed over a place on the floor, metres over the sea: ragged at 13 m and at 3 m. */
export function weedTop(x: number, z: number): number {
  return TIDE - 1 + 7 * (noise2(x / 13, z / 13) - 0.5) + 2.6 * (noise2(x / 2.7 + 9.1, z / 2.7) - 0.5);
}

export interface SkirtOptions {
  /** The angles round the blade of the columns, rising, the last one a whole turn after the first. */
  phis: number[];
  rows: number;
}

/** Evenly spaced angles, with a finer run between `from` and `to`. */
export function turns(coarse: number, fine?: { from: number; to: number; count: number }): number[] {
  const out: number[] = [];
  if (!fine) {
    for (let i = 0; i <= coarse; i++) out.push((i / coarse) * Math.PI * 2);
    return out;
  }
  for (let i = 0; i < fine.count; i++) out.push(fine.from + ((fine.to - fine.from) * i) / fine.count);
  const rest = Math.PI * 2 - (fine.to - fine.from);
  for (let i = 0; i <= coarse; i++) out.push(fine.to + (rest * i) / coarse);
  return out;
}

/** How far the weed hangs proud of its smooth skirt, metres: masses of 5 m and hanks of 1 m, longer than they are wide. */
export function weedLump(x: number, y: number, z: number): number {
  return 1.7 * (fbm3(x / 5.5, y / 15, z / 5.5, 3) - 0.5) + 0.5 * (noise3(x / 0.9, y / 3.6, z / 0.9) - 0.5);
}

/** The hanging weed round the foot of a blade, from under the sand to its ragged top. u runs round it in metres, v is the height in metres. */
export function skirtShape(rib: Rib, options: SkirtOptions): THREE.BufferGeometry {
  const [a0, b0] = radii(rib, 0);
  const reach = (a0 + b0) / 2 + 12;
  const uSpan = Math.max(1, Math.round((reach * Math.PI * 2) / 28)) * 28;
  const cols = options.phis.length;
  const first = options.phis[0] as number;
  const rows = options.rows + 1;
  const t0 = partAtHeight(rib, 0);
  const tTide = partAtHeight(rib, TIDE);
  const foot = new THREE.Vector3();
  return sheet(rows, cols, true, 'out', (j, i, p) => {
    const phi = options.phis[i] as number;
    const u = ((phi - first) / (Math.PI * 2)) * uSpan;
    const f = j / options.rows;
    const [at, bt] = radii(rib, tTide);
    foot.copy(surface(rib, tTide, phi, at, bt));
    const top = weedTop(foot.x, foot.z);
    const y = -5 + (top + 5) * f;
    const tuck = smooth(0.9, 1, f);
    const yy = Math.max(0, y);
    const t = yy > 0 ? partAtHeight(rib, yy) : t0;
    const [a, b] = radii(rib, t);
    const pad = skirtPad(yy) * (1 - tuck) - 3 * tuck + weedLump(foot.x, y, foot.z) * (1 - tuck) * smooth(-5, 2, y);
    p.copy(surface(rib, t, phi, a + pad, b + pad));
    if (y < 0) p.y = y;
    return [u, y];
  });
}

/** A stack or a mound turned round a centre. `profile` gives the rows from the bottom up as height and radius; `shift` moves a point in or out by where it is. */
export function lathe(cx: number, cz: number, profile: [number, number][], around: number, shift: (y: number, radius: number, angle: number, row: number) => [number, number]): THREE.BufferGeometry {
  const run: number[] = [0];
  for (let j = 1; j < profile.length; j++) {
    const h = profile[j] as [number, number];
    const l = profile[j - 1] as [number, number];
    run.push((run[j - 1] as number) + Math.hypot(h[0] - l[0], h[1] - l[1]));
  }
  let widest = 0;
  for (const row of profile) widest = Math.max(widest, row[1]);
  const uSpan = Math.max(1, Math.round((widest * Math.PI * 2) / 96)) * 96;
  return sheet(profile.length, around + 1, true, 'out', (j, i, p) => {
    const row = profile[j] as [number, number];
    const angle = ((i % around) / around) * Math.PI * 2;
    const [y, r] = shift(row[0], row[1], angle, j);
    p.set(cx + Math.cos(angle) * r, y, cz + Math.sin(angle) * r);
    return [(i / around) * uSpan, run[j] as number];
  });
}

/** A rock arch: a thick half ring standing on the floor, `span` metres between its feet, with the relief of rock. */
export function archShape(span: number, height: number, thick: number, deep: number, alongCount: number, aroundCount: number): THREE.BufferGeometry {
  return sheet(alongCount + 1, aroundCount + 1, true, 'out', (j, i, p) => {
    const f = j / alongCount;
    const s = -0.25 + 1.5 * f;
    const theta = Math.PI * Math.min(1, Math.max(0, s));
    const psi = ((i % aroundCount) / aroundCount) * Math.PI * 2;
    let cx = -Math.cos(theta) * span * 0.5;
    let cy = Math.sin(theta) * height;
    // The feet go straight down under the sand.
    if (s < 0) cy = s * 60;
    if (s > 1) cy = -(s - 1) * 60;
    const foot = 1 + 0.9 * Math.pow(Math.abs(Math.cos(theta)), 3);
    const nx = -Math.cos(theta);
    const ny = Math.sin(theta) * (height / (span * 0.5));
    const nl = Math.hypot(nx, ny) || 1;
    const lump = 1 + 0.5 * (fbm3(cx / 25 + 3, cy / 25, psi * 1.3, 2) - 0.5);
    const ro = thick * foot * lump * Math.cos(psi);
    const rz = deep * foot * lump * Math.sin(psi);
    cx += (nx / nl) * ro;
    cy += (ny / nl) * ro;
    const d = 0.3 * relief(cx * 1.7 + 40, cy * 1.7, rz * 1.7 - 20);
    p.set(cx + (nx / nl) * Math.cos(psi) * d, cy + (ny / nl) * Math.cos(psi) * d, rz + Math.sin(psi) * d);
    return [(i / aroundCount) * 96, f * 192];
  });
}

/** A boulder about one metre in radius, worn and broken: an icosahedron pushed about by noise and cut by a few flat faces. */
export function boulderShape(seed: number, detail: number, squat: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const cuts: { n: THREE.Vector3; d: number }[] = [];
  for (let k = 0; k < 7; k++) {
    const n = new THREE.Vector3(unit(seed, k * 3 + 1) - 0.5, (unit(seed, k * 3 + 2) - 0.3) * 0.8, unit(seed, k * 3 + 3) - 0.5).normalize();
    cuts.push({ n, d: 0.62 + 0.3 * unit(seed, k + 50) });
  }
  const o = seed * 13.7;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1 + 0.5 * (fbm3(v.x * 1.1 + o, v.y * 1.1, v.z * 1.1, 3) - 0.5) + 0.12 * (noise3(v.x * 5 + o, v.y * 5, v.z * 5) - 0.5);
    for (const c of cuts) {
      const along = v.dot(c.n);
      if (along > 0) r = Math.min(r, c.d / along + 0.03 * (noise3(v.x * 7 + o, v.y * 7, v.z * 7) - 0.5));
    }
    v.multiplyScalar(r);
    v.y *= squat;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  // The icosahedron shares no vertices: weld it so that the normals are smooth where the rock is round.
  const welded = weld(g);
  welded.computeVertexNormals();
  welded.computeBoundingSphere();
  return welded;
}

function weld(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const seen = new Map<string, number>();
  const points: number[] = [];
  const index: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${Math.round(x * 2e4)},${Math.round(y * 2e4)},${Math.round(z * 2e4)}`;
    let at = seen.get(key);
    if (at === undefined) {
      at = points.length / 3;
      points.push(x, y, z);
      seen.set(key, at);
    }
    index.push(at);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  out.setIndex(index);
  g.dispose();
  return out;
}

/** The floor as a sheet over two lists of lines, finer where the cameras stand. */
export function floorShape(xs: number[], zs: number[], height: (x: number, z: number) => number): THREE.BufferGeometry {
  return sheet(zs.length, xs.length, false, 'up', (j, i, p) => {
    const x = xs[i] as number;
    const z = zs[j] as number;
    p.set(x, height(x, z), z);
    return [x, z];
  });
}

/** Lines from lo to hi: `fine` metres apart between a and b, growing by a fifth a line outside. */
export function lines(lo: number, hi: number, a: number, b: number, fine: number, coarse: number): number[] {
  const out: number[] = [];
  for (let v = a; v <= b + 1e-6; v += fine) out.push(v);
  let gap = fine;
  let v = b;
  while (v < hi) {
    gap = Math.min(coarse, gap * 1.2);
    v = Math.min(hi, v + gap);
    out.push(v);
  }
  gap = fine;
  v = a;
  while (v > lo) {
    gap = Math.min(coarse, gap * 1.2);
    v = Math.max(lo, v - gap);
    out.unshift(v);
  }
  return out;
}
