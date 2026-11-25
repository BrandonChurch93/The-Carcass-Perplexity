// The shapes of the loose rock. Each is a ball subdivided to 20,480 triangles and pushed out along its radius by a block form
// (a few broad faces that meet in worn corners, never a clean cut) and by noise at two finer scales. The pits of scoria are finer
// than any vertex and live in the skin (rock-shader.ts). Every shape comes in six levels of detail whose corners are a subset of
// the next level's, so a rock keeps its outline when it changes level.
import * as THREE from 'three';

export type RockKind = 'clinker' | 'slab' | 'block';

export interface RockShape {
  kind: RockKind;
  /** Level 0 has 20 triangles, each next level four times as many, level 5 has 20,480. */
  levels: THREE.BufferGeometry[];
  /** The lowest and highest point of the shape and its largest radius, for a shape about one unit in radius. */
  low: number;
  high: number;
  reach: number;
}

export const ROCK_LEVELS = 6;

const hash = (x: number, y: number, z: number): number => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** Smooth noise in three dimensions, 0 to 1. */
function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
  const l = (a: number, b: number, t: number): number => a + (b - a) * t;
  return l(
    l(l(hash(ix, iy, iz), hash(ix + 1, iy, iz), ux), l(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), ux), uy),
    l(l(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), ux), l(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), ux), uy),
    uz,
  );
}

interface Ball {
  /** Unit directions of the finest level. The corners of level L are the first `counts[L]` of them. */
  dirs: Float32Array;
  counts: number[];
  index: Uint16Array[];
}

let ball: Ball | null = null;

function makeBall(): Ball {
  const t = (1 + Math.sqrt(5)) / 2;
  const v: number[] = [];
  const add = (x: number, y: number, z: number): number => {
    const l = Math.hypot(x, y, z);
    v.push(x / l, y / l, z / l);
    return v.length / 3 - 1;
  };
  for (const [x, y, z] of [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ] as [number, number, number][]) add(x, y, z);
  let faces = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
  const counts = [12];
  const index = [Uint16Array.from(faces)];
  for (let level = 1; level < ROCK_LEVELS; level++) {
    const mids = new Map<number, number>();
    const mid = (a: number, b: number): number => {
      const key = a < b ? a * 65536 + b : b * 65536 + a;
      let m = mids.get(key);
      if (m === undefined) {
        m = add((v[a * 3] as number) + (v[b * 3] as number), (v[a * 3 + 1] as number) + (v[b * 3 + 1] as number), (v[a * 3 + 2] as number) + (v[b * 3 + 2] as number));
        mids.set(key, m);
      }
      return m;
    };
    const next: number[] = [];
    for (let i = 0; i < faces.length; i += 3) {
      const a = faces[i] as number;
      const b = faces[i + 1] as number;
      const c = faces[i + 2] as number;
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      next.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
    }
    faces = next;
    counts.push(v.length / 3);
    index.push(Uint16Array.from(faces));
  }
  return { dirs: Float32Array.from(v), counts, index };
}

/**
 * One shape, about one unit in radius.
 * `clinker` is a rounded lump with knobs and spines, `block` is angular with worn edges, `slab` is a plate of broken crust:
 * level and ropy on top, rough where it broke.
 */
export function rockShape(seed: number, kind: RockKind): RockShape {
  ball ??= makeBall();
  let s = seed * 7919 + 13;
  const rnd = (): number => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const range = (a: number, b: number): number => a + (b - a) * rnd();

  // The block form: planes round the middle. Their soft intersection gives broad faces that meet in rounded corners;
  // the lower the power, the rounder.
  const planes: [number, number, number, number][] = [];
  const plane = (x: number, y: number, z: number, c: number): void => {
    const l = Math.hypot(x, y, z);
    planes.push([x / l, y / l, z / l, c]);
  };
  const anywhere = (c: number): void => {
    const u = rnd() * 2 - 1;
    const a = rnd() * Math.PI * 2;
    const q = Math.sqrt(1 - u * u);
    plane(q * Math.cos(a), u, q * Math.sin(a), c);
  };
  let power = 6;
  // How far each scale of noise pushes the surface, as a share of the radius: broad swells, lumps of a tenth of the size, spines.
  let swell = 0.1;
  let lump = 0.06;
  let spine = 0.03;
  if (kind === 'clinker') {
    power = range(3.2, 5);
    const count = 7 + Math.floor(rnd() * 4);
    for (let k = 0; k < count; k++) anywhere(range(0.62, 1));
    swell = range(0.12, 0.2);
    lump = range(0.1, 0.14);
    spine = range(0.06, 0.085);
  } else if (kind === 'block') {
    power = range(9, 14);
    const j = 0.3;
    plane(1, range(-j, j), range(-j, j), range(0.7, 1));
    plane(-1, range(-j, j), range(-j, j), range(0.7, 1));
    plane(range(-j, j), 1, range(-j, j), range(0.6, 0.9));
    plane(range(-j, j), -1, range(-j, j), range(0.6, 0.9));
    plane(range(-j, j), range(-j, j), 1, range(0.65, 1));
    plane(range(-j, j), range(-j, j), -1, range(0.65, 1));
    // Corners knocked off.
    const cuts = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < cuts; k++) anywhere(range(0.78, 0.98));
    swell = range(0.05, 0.08);
    lump = range(0.04, 0.06);
    spine = range(0.025, 0.04);
  } else {
    power = range(7, 10);
    plane(range(-0.08, 0.08), 1, range(-0.08, 0.08), range(0.42, 0.5));
    plane(range(-0.15, 0.15), -1, range(-0.15, 0.15), range(0.36, 0.46));
    const sides = 5 + Math.floor(rnd() * 3);
    const turn = rnd() * 6.283;
    for (let k = 0; k < sides; k++) {
      const a = turn + ((k + range(-0.3, 0.3)) / sides) * Math.PI * 2;
      plane(Math.cos(a), range(-0.35, 0.35), Math.sin(a), range(0.62, 1));
    }
    swell = range(0.04, 0.07);
    lump = range(0.035, 0.05);
    spine = range(0.03, 0.045);
  }
  const ox = range(0, 97);
  const oy = range(0, 97);
  const oz = range(0, 97);
  const ropeTurn = rnd() * Math.PI;
  const ropeCos = Math.cos(ropeTurn);
  const ropeSin = Math.sin(ropeTurn);
  const ropePhase = rnd() * 6.283;
  const bound = kind === 'block' ? 1.25 : 1.12;
  const top = kind === 'slab' ? (planes[0] as [number, number, number, number])[3] : 1;

  const n = ball.counts[ROCK_LEVELS - 1] as number;
  const position = new Float32Array(n * 3);
  const cave = new Float32Array(n);
  let low = 0;
  let high = 0;
  let reach = 0;
  for (let i = 0; i < n; i++) {
    const dx = ball.dirs[i * 3] as number;
    const dy = ball.dirs[i * 3 + 1] as number;
    const dz = ball.dirs[i * 3 + 2] as number;
    // A ball round the planes closes any side they leave open.
    let sum = Math.pow(1 / bound, power);
    for (const [nx, ny, nz, c] of planes) {
      const d = dx * nx + dy * ny + dz * nz;
      if (d > 0) sum += Math.pow(d / c, power);
    }
    const r0 = Math.pow(sum, -1 / power);
    const px = dx * r0;
    const py = dy * r0;
    const pz = dz * r0;
    const a = noise3(px * 1.7 + ox, py * 1.7 + oy, pz * 1.7 + oz) - 0.5;
    const b = noise3(px * 4.6 + oy, py * 4.6 + oz, pz * 4.6 + ox) - 0.5;
    // Spines and pocks: a ridged noise, sharp where it turns.
    const c = 1 - Math.abs(2 * noise3(px * 10.5 + oz, py * 10.5 + ox, pz * 10.5 + oy) - 1);
    // The grain of broken clinker, at the limit of the finest level.
    const d = noise3(px * 23 + ox, py * 23 + oy, pz * 23 + oz) - 0.5;
    let edge = 1;
    let rope = 0;
    if (kind === 'slab') {
      // The level top keeps its ropes and little else; the broken rim is the rough part.
      const onTop = Math.min(1, Math.max(0, (py / top - 0.72) / 0.2));
      const t = onTop * onTop * (3 - 2 * onTop);
      edge = 1.7 - 1.25 * t;
      const u = px * ropeCos + pz * ropeSin;
      const w = -px * ropeSin + pz * ropeCos;
      const bend = 0.22 * Math.sin(w * 2.3 + ropePhase) + 0.35 * a;
      rope = t * 0.045 * (0.5 + 0.5 * Math.sin((u + bend) * 23)) * (0.5 + noise3(px * 2.1 + oz, 3.1, pz * 2.1 + ox));
    }
    const push = 1 + 2 * swell * a + edge * (2 * lump * b + spine * (c - 0.6) + 0.7 * spine * d);
    const x = px * push;
    const y = py * push + rope;
    const z = pz * push;
    position[i * 3] = x;
    position[i * 3 + 1] = y;
    position[i * 3 + 2] = z;
    // 0 in a hollow, 1 on a knob: where dust gathers and where the sky does not reach.
    cave[i] = Math.min(1, Math.max(0, 0.5 + 1.3 * b + 0.5 * (c - 0.6) + 0.5 * a + 0.5 * d + (kind === 'slab' ? 8 * (rope - 0.02) : 0)));
    low = Math.min(low, y);
    high = Math.max(high, y);
    reach = Math.max(reach, Math.hypot(x, y, z));
  }

  const levels: THREE.BufferGeometry[] = [];
  for (let level = 0; level < ROCK_LEVELS; level++) {
    const count = ball.counts[level] as number;
    const index = ball.index[level] as Uint16Array;
    // Smooth normals of the pushed surface: every corner takes the mean of the faces round it, weighed by their area.
    const normal = new Float32Array(count * 3);
    for (let f = 0; f < index.length; f += 3) {
      const ia = (index[f] as number) * 3;
      const ib = (index[f + 1] as number) * 3;
      const ic = (index[f + 2] as number) * 3;
      const ax = position[ia] as number;
      const ay = position[ia + 1] as number;
      const az = position[ia + 2] as number;
      const ux = (position[ib] as number) - ax;
      const uy = (position[ib + 1] as number) - ay;
      const uz = (position[ib + 2] as number) - az;
      const vx = (position[ic] as number) - ax;
      const vy = (position[ic + 1] as number) - ay;
      const vz = (position[ic + 2] as number) - az;
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      for (const k of [ia, ib, ic]) {
        normal[k] = (normal[k] as number) + nx;
        normal[k + 1] = (normal[k + 1] as number) + ny;
        normal[k + 2] = (normal[k + 2] as number) + nz;
      }
    }
    for (let i = 0; i < count; i++) {
      const l = Math.hypot(normal[i * 3] as number, normal[i * 3 + 1] as number, normal[i * 3 + 2] as number) || 1;
      normal[i * 3] = (normal[i * 3] as number) / l;
      normal[i * 3 + 1] = (normal[i * 3 + 1] as number) / l;
      normal[i * 3 + 2] = (normal[i * 3 + 2] as number) / l;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(position.slice(0, count * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    g.setAttribute('aCave', new THREE.BufferAttribute(cave.slice(0, count), 1));
    g.setIndex(new THREE.BufferAttribute(index, 1));
    levels.push(g);
  }
  return { kind, levels, low, high, reach };
}
