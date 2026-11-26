// The shapes of the main shaft, built dense: the ribs of cartilage that held the airway open (round in section, bowed, sagging, each one
// tapering to a point or snapped off ragged), the wall between them (bedded at the top, hollowed under every rib, jointed below), and the
// blocks that broke from them. Every vertex is pushed by the same solid noise, so no face is flat and no edge is ruled.
// `uv` is metres along and round each shape, for the stains only: the stone's picture is laid in the world by the shader, so it cannot stretch.
import * as THREE from 'three';
import { DEPTH, RAD, ground, lerp, rimRadius, sat, smooth } from '../land';

const hash3 = (ix: number, iy: number, iz: number): number => {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(iz, 2147483647 - 1013904223);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Solid noise, -1 to 1, the same wherever it is asked. */
export function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);
  const at = (i: number, j: number, k: number): number => hash3(ix + i, iy + j, iz + k);
  const a = lerp(lerp(at(0, 0, 0), at(1, 0, 0), u), lerp(at(0, 1, 0), at(1, 1, 0), u), v);
  const b = lerp(lerp(at(0, 0, 1), at(1, 0, 1), u), lerp(at(0, 1, 1), at(1, 1, 1), u), v);
  return 2 * lerp(a, b, w) - 1;
}
/** Chipped stone: broad lumps, and ridges where two breaks meet. */
const chipped = (x: number, y: number, z: number): number => 0.6 * noise3(x * 0.55, y * 0.55, z * 0.55) + 0.3 * (1 - 2 * Math.abs(noise3(x * 1.4 + 7, y * 1.4, z * 1.4))) + 0.12 * noise3(x * 4.1, y * 4.1 + 3, z * 4.1);

/** A grid of columns by rows whose rows close on themselves (the last row is the first): smooth normals across the seam, so no line shows. */
function tube(columns: number, rows: number, point: (u: number, a: number) => { at: [number, number, number]; uv: [number, number]; occ: number }): THREE.BufferGeometry {
  const count = (columns + 1) * (rows + 1);
  const position = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const occ = new Float32Array(count);
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) {
      const q = point(i / columns, ((j % rows) / rows) * 2 * Math.PI);
      const k = j * (columns + 1) + i;
      position.set(q.at, k * 3);
      uv[k * 2] = q.uv[0];
      uv[k * 2 + 1] = j === rows ? q.uv[1] + 1e-3 : q.uv[1];
      occ[k] = q.occ;
    }
  }
  const index = new Uint32Array(columns * rows * 6);
  let t = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * (columns + 1) + i;
      const b = a + columns + 1;
      index.set([a, a + 1, b, a + 1, b + 1, b], t);
      t += 6;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('occ', new THREE.BufferAttribute(occ, 1));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeVertexNormals();
  // The first row and the last are the same points: give both the mean of their two normals.
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i <= columns; i++) {
    const a = i;
    const b = rows * (columns + 1) + i;
    const x = n.getX(a) + n.getX(b);
    const y = n.getY(a) + n.getY(b);
    const z = n.getZ(a) + n.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l);
    n.setXYZ(b, x / l, y / l, z / l);
  }
  g.computeBoundingSphere();
  return g;
}

/** How far the wall of the shaft stands from the axis at a bearing and a height. The ribs stand on this. */
export function wallRadius(b: number, y: number): number {
  const r = rimRadius(b);
  const top = ground(Math.sin(b) * r * 1.002, -Math.cos(b) * r * 1.002);
  const down = sat((top - y) / (top + DEPTH));
  return r - 0.5 - 12 * down;
}

export interface Rib {
  /** Height of its middle, metres. */
  y: number;
  /** Bearings of its two ends, degrees. */
  from: number;
  to: number;
  /** Half its thickness at the thick end, metres. */
  thick: number;
  /** How it ends at `from` and at `to`: 'point' tapers into the wall, 'snap' is broken off across. */
  ends: ['point' | 'snap', 'point' | 'snap'];
  /** Metres that the `to` end hangs lower than the `from` end. */
  drop: number;
  /** Metres that the middle sags. */
  sag: number;
  /** How flat it is: 1 round, 0.4 a ledge. */
  flat?: number;
  seed: number;
  /** For the ledge at the brim: the radius and the height to follow instead of a level. */
  follow?: (bearing: number) => [number, number];
}

/** One rib: an arc of the wall's ring, bowed out from the wall in its middle and buried in it toward a pointed end. */
export function rib(spec: Rib): THREE.BufferGeometry {
  const flat = spec.flat ?? 1;
  const mid = wallRadius(((spec.from + spec.to) / 2) * RAD, spec.y);
  const length = Math.abs(spec.to - spec.from) * RAD * mid;
  const columns = Math.max(24, Math.round(length / 0.16));
  const rows = 44;
  const s0 = spec.seed * 7.31;
  return tube(columns, rows, (u, a) => {
    const b = lerp(spec.from, spec.to, u) * RAD;
    const s = u * length;
    // Its thickness along its run: thick at the root, thinner toward a point, with knuckles, and closed at each end.
    const k0 = spec.ends[0] === 'point' ? 0.42 : 1;
    const k1 = spec.ends[1] === 'point' ? 0.42 : 1;
    const run = lerp(k0, k1, smooth(u)) * (1 + 0.14 * noise3(s * 0.11, s0, 1.5) + 0.07 * noise3(s * 0.37, s0, 4.5));
    const close = (d: number, kind: 'point' | 'snap', ragged: number): number => (kind === 'point' ? sat(d / 3.2) ** 0.55 : smooth((d + ragged) / 0.5));
    const jag = 0.55 * noise3(Math.cos(a) * 1.3 + s0, Math.sin(a) * 1.3, 2.2) + 0.3 * Math.sin(a + s0);
    const end = Math.min(close(s, spec.ends[0], jag), close(length - s, spec.ends[1], -jag * 0.8 + 0.2));
    const k = run * (0.03 + 0.97 * end);
    // Where it runs: out from the wall in its middle, back into it toward a point; it hangs, and it is never level.
    const bow = Math.sin(Math.PI * sat(u * 1.04 - 0.02));
    const [baseR, baseY] = spec.follow ? spec.follow(b) : [wallRadius(b, spec.y), spec.y + spec.drop * (u - 0.5) - spec.sag * bow + 0.35 * noise3(s * 0.06, s0, 9.5)];
    const wide = spec.thick * 1.3 * k;
    const tall = spec.thick * flat * k;
    const centre = baseR + (spec.follow ? 0.9 : 0.5 - spec.thick * (0.25 + 0.55 * bow)) + 0.3 * noise3(s * 0.09, s0, 6.5);
    // The section: round, a little squared, with flutes that run along it and chips out of it.
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const cx = Math.sign(ca) * Math.abs(ca) ** (flat < 0.7 ? 0.5 : 0.8);
    const cy = Math.sign(sa) * Math.abs(sa) ** (flat < 0.7 ? 0.5 : 0.8);
    const px = Math.sin(b) * (centre - cx * wide);
    const pz = -Math.cos(b) * (centre - cx * wide);
    const py = baseY + cy * tall;
    const rough = 0.17 * chipped(px, py, pz) + 0.035 * Math.sin(a * 7 + 2.5 * noise3(s * 0.2, s0, a)) * (flat < 0.7 ? 0.3 : 1);
    const swell = 1 + (rough * Math.min(1, k * 2.5)) / Math.max(0.2, spec.thick);
    const rr = centre - cx * wide * swell;
    const yy = baseY + cy * tall * swell;
    return {
      at: [Math.sin(b) * rr, yy, -Math.cos(b) * rr],
      uv: [s + s0 * 3, a * spec.thick * (1.15 + flat) * 0.5],
      // Its underside and the side against the wall are in its own shade.
      occ: lerp(0.5, 1, smooth(0.55 + 0.45 * sa + 0.35 * ca)),
    };
  });
}

/** The wall of the shaft from under the brim to the floor: beds at the top, a hollow under the line of every rib, upright joints below. */
export function wall(levels: number[]): THREE.BufferGeometry {
  const columns = 760;
  const rows = 120;
  const count = (columns + 1) * (rows + 1);
  const position = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const occ = new Float32Array(count);
  for (let j = 0; j <= rows; j++) {
    // Most of the rows are in the top third, where the lens looks.
    const v = (j / rows) ** 1.7;
    for (let i = 0; i <= columns; i++) {
      const b = ((i % columns) / columns) * 2 * Math.PI;
      const r = rimRadius(b);
      const top = ground(Math.sin(b) * r * 1.002, -Math.cos(b) * r * 1.002) - 0.3;
      const y = lerp(top, -DEPTH, v);
      const depth = top - y;
      // Under a rib the wall is eaten back: an alcove, deepest just under the rib and closing toward the next one down.
      let alcove = 0;
      for (const level of levels) {
        const under = level - 1.2 - y;
        if (under > -0.6 && under < 6.4) alcove = Math.max(alcove, smooth((under + 0.6) / 1.1) * (1 - smooth((under - 1.5) / 4.9)));
      }
      const bx = Math.sin(b) * r;
      const bz = -Math.cos(b) * r;
      // Beds in the top metres: each stands out or back from the next, with a ragged edge.
      const bedAt = y * 2.1 + 0.7 * noise3(bx * 0.12, 3.3, bz * 0.12);
      const bed = (hash3(Math.floor(bedAt), 7, 1) - 0.5) * smooth((bedAt - Math.floor(bedAt)) / 0.15) * (1 - smooth((bedAt - Math.floor(bedAt) - 0.85) / 0.15));
      const beds = 0.9 * bed * (1 - smooth((depth - 5) / 6)) * smooth(depth / 0.6);
      // Upright joints: the wall breaks into columns a few metres wide.
      const joint = 1 - 2 * Math.abs(noise3(bx * 0.33, y * 0.05, bz * 0.33));
      const lumps = 0.9 * noise3(bx * 0.2, y * 0.2, bz * 0.2) + 0.5 * joint + 0.22 * noise3(bx * 0.9, y * 0.9, bz * 0.9);
      const torn = 1 + 1.4 * smooth((r - 31) / 5);
      const rr = wallRadius(b, y) + 1.5 * alcove + beds + torn * 0.55 * lumps * smooth(depth / 1.5) - 0.25 * smooth(depth / 0.8) + 0.15;
      const k = j * (columns + 1) + i;
      position.set([Math.sin(b) * rr, y, -Math.cos(b) * rr], k * 3);
      uv[k * 2] = (i / columns) * 2 * Math.PI * 30;
      uv[k * 2 + 1] = y;
      occ[k] = lerp(1, 0.6, alcove) * lerp(1, 0.75, smooth(-bed * 3));
    }
  }
  const index = new Uint32Array(columns * rows * 6);
  let t = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * (columns + 1) + i;
      const c = a + columns + 1;
      // Seen from inside the shaft.
      index.set([a, c, a + 1, a + 1, c, c + 1], t);
      t += 6;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('occ', new THREE.BufferAttribute(occ, 1));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeVertexNormals();
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let j = 0; j <= rows; j++) {
    const a = j * (columns + 1);
    const c = a + columns;
    const x = n.getX(a) + n.getX(c);
    const y = n.getY(a) + n.getY(c);
    const z = n.getZ(a) + n.getZ(c);
    const l = Math.hypot(x, y, z) || 1;
    n.setXYZ(a, x / l, y / l, z / l);
    n.setXYZ(c, x / l, y / l, z / l);
  }
  g.computeBoundingSphere();
  return g;
}

/** A block that broke from a rib or the brim: a lump cut by its own fracture planes, so it has faces and edges, worn by the same solid noise. */
export function block(seed: number, size: [number, number, number], at: [number, number, number], turn: [number, number, number]): THREE.BufferGeometry {
  const planes: [number, number, number, number][] = [];
  const h = (k: number): number => hash3(Math.floor(seed * 131), k, 5);
  // The six sides, each leaning, and four more that take a corner or an edge off.
  for (let k = 0; k < 10; k++) {
    let nx: number;
    let ny: number;
    let nz: number;
    let d: number;
    if (k < 6) {
      const axis = k >> 1;
      const sign = k & 1 ? -1 : 1;
      nx = (axis === 0 ? sign : 0) + 0.34 * (h(k * 3) - 0.5);
      ny = (axis === 1 ? sign : 0) + 0.26 * (h(k * 3 + 1) - 0.5);
      nz = (axis === 2 ? sign : 0) + 0.34 * (h(k * 3 + 2) - 0.5);
      d = 1;
    } else {
      nx = (h(k * 3) > 0.5 ? 1 : -1) * (0.5 + 0.5 * h(k * 5));
      ny = (h(k * 3 + 1) > 0.4 ? 1 : -1) * (0.3 + 0.6 * h(k * 5 + 1));
      nz = (h(k * 3 + 2) > 0.5 ? 1 : -1) * (0.5 + 0.5 * h(k * 5 + 2));
      d = 0.98 + 0.3 * h(k * 7);
    }
    const l = Math.hypot(nx, ny, nz);
    planes.push([nx / l, ny / l, nz / l, d * (k < 6 ? 1 : 1.25)]);
  }
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(turn[0], turn[1], turn[2], 'YXZ')), new THREE.Vector3(1, 1, 1));
  const p = new THREE.Vector3();
  const longest = Math.max(size[0], size[2]);
  const columns = Math.max(28, Math.round((longest * 3.4) / 0.36));
  const rows = Math.max(18, Math.round((Math.max(size[1], Math.min(size[0], size[2])) * 3) / 0.4));
  const g = tube(columns, rows, (u, a) => {
    // A direction on the ball: u runs pole to pole along the block's long side, a goes round it.
    const e = (u - 0.5) * Math.PI;
    const dx = Math.sin(e);
    const dy = Math.cos(e) * Math.sin(a);
    const dz = Math.cos(e) * Math.cos(a);
    // Out along it to the nearest of the planes: that is the block. The meeting of two planes is an edge, softened a little.
    let reach = 0;
    let soft = 0;
    for (const [nx, ny, nz, d] of planes) {
      const along = nx * dx + ny * dy + nz * dz;
      if (along <= 0.02) continue;
      const w = (along / d) ** 9;
      reach += w * (along / d);
      soft += w;
    }
    const t = soft > 0 ? soft / reach : 1;
    p.set(dx * t * size[0] * 0.5, dy * t * size[1] * 0.5, dz * t * size[2] * 0.5);
    const lx = p.x;
    const ly = p.y;
    const lz = p.z;
    const rough = 0.22 * chipped(lx + seed * 9, ly, lz - seed * 5);
    p.multiplyScalar(1 + rough / Math.max(0.6, p.length()));
    p.applyMatrix4(m);
    return { at: [p.x, p.y, p.z], uv: [lx + seed * 13, ly + lz], occ: lerp(0.55, 1, smooth(dy * 0.8 + 0.75)) };
  });
  return g;
}
