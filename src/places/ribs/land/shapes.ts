// The shapes of the land: sheets of vertices bent into blades, weed skirts, stacks, the arch and the boulders.
import * as THREE from 'three';
import { hash2 } from '../../../core/rng';
import { TIDE, partAtHeight, radii, skirtPad, surface, type Rib } from '../layout';
import { fbm3, noise2, noise3, smooth } from './noise';

/** Sets the point and returns u, v and, if it has one, how open the point is to the sky (1 open, 0 deep in a hollow). */
type At = (j: number, i: number, out: THREE.Vector3) => [number, number] | [number, number, number];

/** A sheet of rows x cols vertices. A closed sheet repeats its first column as its last. Normals are smooth across the seam and point out of a tube or up from a floor. */
export function sheet(rows: number, cols: number, closed: boolean, hint: 'out' | 'up', at: At): THREE.BufferGeometry {
  const positions = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const normals = new Float32Array(rows * cols * 3);
  const shades = new Float32Array(rows * cols);
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
      shades[k] = uv[2] ?? 1;
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
  g.setAttribute('aShade', new THREE.BufferAttribute(shades, 1));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return g;
}

const unit = (i: number, salt: number): number => hash2(i | 0, salt) / 4294967296;

/** How far the rock stands out from the smooth blade at a point, metres: masses of 70 m, hollows where slabs have come away, benches of 13 m with a ledge on top, joints that run up the face, blocks of 2 m. The thin beds are the stone's picture. */
export function relief(x: number, y: number, z: number): number {
  let d = 20 * (noise3(x / 75, y / 100, z / 75) - 0.5) + 9 * (noise3(x / 26, y / 34, z / 26) - 0.5);
  // Chipped at the size of a boat: creases and spurs, sharper than they are wide.
  d += 7 * Math.abs(noise3(x / 15 + 1.7, y / 10, z / 15) - 0.5) + 5 * (noise3(x / 6.5, y / 5, z / 6.5) - 0.5);
  // Bites out of the blade the size of a house, where a block has gone.
  d -= 9 * smooth(0.6, 0.78, noise3(x / 33 + 5.1, y / 27, z / 33));
  const warp = 16 * (noise3(x / 80, y / 80, z / 80) - 0.5) + 5 * (noise3(x / 21, y / 21, z / 21) - 0.5);
  // Where a slab has come away the face steps back, most under a bench: its top is a ledge, its foot an overhang.
  const bench = (y + warp) / 13;
  const k = bench - Math.floor(bench);
  const away = smooth(0.45, 0.75, fbm3(x / 48 + 3.3, y / 30, z / 48 - 1.1, 2));
  d -= away * (2.5 + 3.5 * smooth(0.0, 0.5, k) * smooth(1.0, 0.93, k));
  d += 0.9 * smooth(0.86, 0.97, k) - 0.5 * smooth(0.0, 0.12, k);
  d += 2.4 * (fbm3(x / 9, y / 4.5, z / 9, 2) - 0.5);
  // Joints: cracks that run up the face where it will break next.
  d -= 1.5 * (1 - smooth(0, 0.06, Math.abs(noise3(x / 12, y / 60, z / 12) - 0.5)));
  d += 0.8 * (noise3(x / 2.1, y / 2.1, z / 2.1) - 0.5);
  return d;
}

/** The top of the weed over a place on the floor, metres over the sea: ragged at 30 m, at 9 m and at 3 m, between 13 and 33 m. */
export function weedTop(x: number, z: number): number {
  return TIDE - 2 + 16 * (noise2(x / 31, z / 31) - 0.5) + 6 * (noise2(x / 9, z / 9) - 0.5) + 2.6 * (noise2(x / 2.7 + 9.1, z / 2.7) - 0.5);
}

export interface SkirtOptions {
  /** The angles round the blade of the columns, rising, the last one a whole turn after the first. */
  phis: number[];
  rows: number;
  /** The angle round the blade and the height of a place where the weed keeps to its smooth skirt. */
  calm?: [number, number];
  /** The foot is broken rock: blocks of unlike width and height stand out from it in three steps, the weed over them. */
  broken?: boolean;
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

/** How far the weed hangs proud of its smooth skirt, metres: great hanks that hang straight down, 6 m across and 2 m across, fuller at the hem, and strands of 1 m. */
export function weedLump(x: number, y: number, z: number): number {
  const hang = 3.4 * (fbm3(x / 7, y / 45, z / 7, 2) - 0.5) + 1.5 * (noise3(x / 2.2, y / 16, z / 2.2) - 0.5);
  const hem = 1.2 * smooth(0.35, 0.65, noise3(x / 6, y / 7 + 0.4 * noise3(x / 3, 0, z / 3), z / 6));
  // Straps a hand wide that stand off the mass and hang straight.
  const strap = 0.5 * Math.abs(noise3(x / 0.42, y / 5.5, z / 0.42) - 0.5);
  return hang + hem - 0.5 + 0.5 * (noise3(x / 0.9, y / 3.6, z / 0.9) - 0.5) + strap;
}

/** The weed hangs in tiers from ledges 7 m apart: how far a tier stands out, metres, and how open it is to the sky (dark in the gap under the ledge above it). */
export function weedTier(x: number, y: number, z: number): [number, number] {
  const warp = 15 * (noise3(x / 23, 0.5, z / 23) - 0.5) + 3 * (noise3(x / 5, 2.5, z / 5) - 0.5);
  const tier = (y + warp) / 7.5;
  const k = tier - Math.floor(tier);
  const deep = 1.5 * smooth(0.3, 0.7, noise3(x / 9, Math.floor(tier) * 3.7, z / 9));
  return [1.8 * deep * (smooth(0, 0.22, k) - 0.5), 1 - 0.6 * Math.min(1, deep) * smooth(0.4, 0.02, k)];
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
  // v runs up the weed's own face in metres, so that the picture is not drawn out where the foot spreads.
  const last = new Float32Array(cols * 3);
  const run = new Float32Array(cols);
  const g = sheet(rows, cols, true, 'out', (j, i, p) => {
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
    // Round the one who hangs in it the weed lies where the layout says, so that the hanging one touches it.
    const calm = options.calm ? smooth(3, 9, Math.hypot((phi - options.calm[0]) * (a + 10), y - options.calm[1])) : 1;
    // The foot spreads over the rock and rubble the blade stands on.
    const plinth = 2.5 * smooth(5, 0, y) * (0.4 + 1.2 * noise2(foot.x / 11 + 5, foot.z / 11)) * calm;
    const tier = weedTier(foot.x, y, foot.z);
    // Broken rock under the weed: the foot stands on blocks some 11 m and 5 m along it, each with its own reach and its own top, so
    // that the skirt goes down in steps with corners and not as one smooth cone.
    let blocks = 0;
    if (options.broken) {
      const wide = Math.floor(u / 11);
      const small = Math.floor(u / 5 + 0.5);
      const base = 5 + 0.1 * Math.min(a0, b0);
      for (let n = 0; n < 3; n++) {
        const id = n === 2 ? small : wide + (n === 1 ? 0.5 : 0);
        const h = (n === 0 ? 5 : n === 1 ? 13 : 21) + 9 * noise2(id * 3.17 + rib.x * 0.07, n * 5.3 + rib.z * 0.07);
        const reachOut = base * (n === 2 ? 0.45 : 0.8) * (0.25 + 1.5 * noise2(id * 1.93 + 7 + rib.z * 0.05, n * 3.1 + rib.x * 0.05));
        blocks += reachOut * smooth(h + 0.7, h - 0.7, y);
      }
    }
    const pad = skirtPad(yy) * (1 - tuck) - 3 * tuck + ((0.6 * weedLump(foot.x, y, foot.z) + 0.3 * tier[0]) * calm + plinth + blocks) * (1 - tuck) * smooth(-5, 2, y);
    p.copy(surface(rib, t, phi, a + pad, b + pad));
    if (y < 0) p.y = y;
    if (j > 0) run[i] = (run[i] as number) + Math.hypot(p.x - (last[i * 3] as number), p.y - (last[i * 3 + 1] as number), p.z - (last[i * 3 + 2] as number));
    else run[i] = -5;
    p.toArray(last, i * 3);
    return [u, run[i] as number, 1 + 0.5 * (tier[1] - 1) * calm];
  });
  // v is counted down from the top of the weed: the wall's sheet hangs from the weed line, whatever the height of the line there.
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < cols; i++) {
    const top = uv.getY((rows - 1) * cols + i);
    for (let j = 0; j < rows; j++) uv.setY(j * cols + i, uv.getY(j * cols + i) - top);
  }
  return g;
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
  const uSpan = Math.max(1, Math.round((widest * Math.PI * 2) / 192)) * 192;
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
    return [(i / aroundCount) * 192, f * 192];
  });
}

/** A boulder about one metre in radius, worn and broken: an icosahedron pushed about by noise and cut by a few flat faces. */
export function boulderShape(seed: number, detail: number, squat: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  // Broken rock: a block cut by flat breaks on every side and by one bed plane on top, so that it is angular and low, not a ball.
  const cuts: { n: THREE.Vector3; d: number }[] = [];
  for (let k = 0; k < 10; k++) {
    const n = new THREE.Vector3(unit(seed, k * 3 + 1) - 0.5, (unit(seed, k * 3 + 2) - 0.35) * 0.7, unit(seed, k * 3 + 3) - 0.5).normalize();
    cuts.push({ n, d: 0.44 + 0.36 * unit(seed, k + 50) });
  }
  cuts.push({ n: new THREE.Vector3(0.3 * (unit(seed, 71) - 0.5), 1, 0.3 * (unit(seed, 72) - 0.5)).normalize(), d: 0.5 + 0.15 * unit(seed, 73) });
  const o = seed * 13.7;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1 + 0.4 * (fbm3(v.x * 1.1 + o, v.y * 1.1, v.z * 1.1, 3) - 0.5) + 0.06 * (noise3(v.x * 5 + o, v.y * 5, v.z * 5) - 0.5);
    for (const c of cuts) {
      const along = v.dot(c.n);
      if (along > 0) r = Math.min(r, c.d / along + 0.035 * (noise3(v.x * 3.1 + o, v.y * 3.1, v.z * 3.1) - 0.5) + 0.02 * (noise3(v.x * 9 + o, v.y * 9, v.z * 9) - 0.5));
    }
    v.multiplyScalar(r);
    v.y *= squat;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  // The icosahedron shares no vertices: weld it so that the normals are smooth where the rock is round.
  const welded = weld(g);
  welded.computeVertexNormals();
  // A break is a plane: a point that lies on one takes the plane's own normal, so that two breaks meet in an edge and the rock is no pillow.
  const at = welded.getAttribute('position') as THREE.BufferAttribute;
  const facing = welded.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < at.count; i++) {
    v.set(at.getX(i), at.getY(i) / squat, at.getZ(i));
    const length = v.length();
    v.divideScalar(length);
    let least = Infinity;
    let broken: THREE.Vector3 | null = null;
    for (const c of cuts) {
      const along = v.dot(c.n);
      if (along > 0 && c.d / along < least) {
        least = c.d / along;
        broken = c.n;
      }
    }
    if (broken === null || Math.abs(length - least) > 0.04) continue;
    v.set(broken.x, broken.y / squat, broken.z).normalize();
    facing.setXYZ(i, v.x, v.y, v.z);
  }
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
