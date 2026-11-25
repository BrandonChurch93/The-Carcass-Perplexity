// The meshes of the Spine's land: the crest as a strip in ridge coordinates (fine where the cameras stand), the flanks down to the cloud,
// the spires built round the fins of the layout, and the canal: its wall, the rock over its mouths, and its floor.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { EXIT, FLOOR, MOUTH_S, S_MAX, S_MIN, canalL, fin, first, flare, frameAt, locate, type Spire } from '../ridge';
import { heightAt } from './height';

function finish(pos: number[], index: number[], top: number[], sl: number[], normals?: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1));
  g.setAttribute('aSL', new THREE.Float32BufferAttribute(sl, 2));
  g.setIndex(index);
  if (normals) g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  else g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

const FAR = 1e4;

/** The crest: a strip along the ridge, 520 m to each side. */
export function crestStrip(): THREE.BufferGeometry {
  const sList: number[] = [];
  for (let s = S_MIN + 40; s < S_MAX - 40; ) {
    sList.push(s);
    const near = s > first.s - 830 && s < first.s + 270;
    const mid = s > first.s - 1700 && s < first.s + 3200;
    s += near ? 2.5 : mid ? 10 : 20;
  }
  const lList: number[] = [];
  for (const l of [-520, -450, -390, -335, -290, -252, -218, -188, -162, -140, -122, -106, -92, -80]) lList.push(l);
  for (let l = -70; l <= 120; l += 2.5) lList.push(l);
  for (const l of [130, 142, 156, 172, 190, 212, 238, 268, 302, 340, 385, 440, 520]) lList.push(l);
  const rows = lList.length;
  const pos: number[] = [];
  const normals: number[] = [];
  const top: number[] = [];
  const sl: number[] = [];
  const E = 0.7;
  for (const s of sList) {
    const f = frameAt(s);
    lList.forEach((l, j) => {
      const edge = j === 0 || j === rows - 1 ? 40 : 0;
      const y = heightAt(s, l);
      pos.push(f.x + f.nx * l, y - edge, f.z + f.nz * l);
      // The slope along the crest and across it, in the frame of the ridge here.
      const ds = (heightAt(s + E, l) - heightAt(s - E, l)) / (2 * E);
      const dl = (heightAt(s, l + E) - heightAt(s, l - E)) / (2 * E);
      const nx = -ds * f.tx - dl * f.nx;
      const nz = -ds * f.tz - dl * f.nz;
      const len = Math.hypot(nx, 1, nz);
      normals.push(nx / len, 1 / len, nz / len);
      top.push(FAR);
      sl.push(s, l);
    });
  }
  const index: number[] = [];
  for (let i = 0; i < sList.length - 1; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      const c = a + rows;
      index.push(a, a + 1, c, a + 1, c + 1, c);
    }
  }
  return finish(pos, index, top, sl, normals);
}

/** The flanks: the same ground, coarse, from the strip down under the cloud on every side. */
export function flanks(): THREE.BufferGeometry {
  const W = 13600;
  const D = 9000;
  const COLS = 230;
  const ROWS = 150;
  const cx = 1700;
  const cz = 1300;
  const pos: number[] = [];
  const top: number[] = [];
  const sl: number[] = [];
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      const x = cx + (i / COLS - 0.5) * W;
      const z = cz + (j / ROWS - 0.5) * D;
      const at = locate(x, z);
      // Under the strip it lies well below; beyond it, a little below, so that the two never cross.
      pos.push(x, heightAt(at.s, at.l) - (Math.abs(at.l) < 470 ? 90 : 8), z);
      top.push(FAR);
      sl.push(FAR, FAR);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const a = j * (COLS + 1) + i;
      const c = a + COLS + 1;
      index.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
  return finish(pos, index, top, sl);
}

// Noise on a spire's skin: i round it, j up it. It closes round the spire.
function skin(rng: Rng, around: number, rings: number): (a: number, r: number) => number {
  const layer = (cells: number, rows: number): ((u: number, v: number) => number) => {
    const g = new Float32Array(cells * (rows + 2));
    for (let i = 0; i < g.length; i++) g[i] = rng.next();
    return (u, v) => {
      const x = u * cells;
      const y = v * rows;
      const xi = Math.floor(x);
      const yi = Math.min(rows, Math.floor(y));
      const fx = x - xi;
      const fy = y - yi;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const at = (i: number, j: number): number => g[j * cells + (((i % cells) + cells) % cells)] as number;
      return (at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx) * (1 - sy) + (at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx) * sy;
    };
  };
  const big = layer(5, 4);
  const mid = layer(14, 9);
  const small = layer(36, 44);
  const COLUMNS = 18;
  const LEDGES = 15;
  const column = new Float32Array(COLUMNS);
  for (let i = 0; i < COLUMNS; i++) column[i] = rng.next();
  const block = new Float32Array(COLUMNS * (LEDGES + 6));
  for (let i = 0; i < block.length; i++) block[i] = rng.next();
  const wrap = (i: number): number => ((i % COLUMNS) + COLUMNS) % COLUMNS;
  // Slabs: the blade is split along its lean into columns, and each column across into blocks; each block stands proud of its neighbours or back from them.
  const slabs = (u: number, v: number): number => {
    const k = (u + 0.1 * v) * COLUMNS;
    const ki = Math.floor(k);
    const kf = k - ki;
    const one = (c: number): number => {
      const i = wrap(c);
      const row = v * LEDGES + 4 * (column[i] as number);
      const ri = Math.floor(row);
      const rf = row - ri;
      const a = block[ri * COLUMNS + i] as number;
      const b = block[(ri + 1) * COLUMNS + i] as number;
      const t = Math.min(1, Math.max(0, (rf - 0.82) / 0.18));
      return 0.5 * ((column[i] as number) - 0.5) + 0.5 * (a + (b - a) * t * t * (3 - 2 * t) - 0.5);
    };
    const t = Math.min(1, Math.max(0, (kf - 0.84) / 0.16));
    const a = one(ki);
    return a + (one(ki + 1) - a) * t * t * (3 - 2 * t);
  };
  return (a, r) => {
    const u = a / around;
    const v = r / rings;
    return 0.4 * (big(u, v) - 0.5) + 0.9 * slabs(u, v) + 0.22 * (1 - Math.abs(2 * mid(u, v) - 1) - 0.5) + 0.1 * (small(u, v) - 0.5);
  };
}

/** A spire: a leaning broken blade built round the fin of the layout. Its tip and its edges stay where the layout has them, to within a few metres. */
export function spireMesh(sp: Spire, rng: Rng, fineMesh: boolean): THREE.BufferGeometry {
  const RINGS = fineMesh ? 150 : 56;
  const AROUND = fineMesh ? 112 : 48;
  const f = frameAt(sp.s);
  const rough = skin(rng, AROUND, RINGS);
  const pos: number[] = [];
  const top: number[] = [];
  const sl: number[] = [];
  const tipY = fin(sp, 1).y;
  for (let r = 0; r <= RINGS + 1; r++) {
    const cap = r === RINGS + 1;
    const t = Math.min(1, r / RINGS);
    const p = fin(sp, t);
    for (let a = 0; a < AROUND; a++) {
      const ang = (a / AROUND) * Math.PI * 2;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      // A blade: thin edges at the two ends of the long axis, flat faces between.
      const edge = Math.pow(Math.abs(c), 6);
      const n = rough(a, Math.min(r, RINGS));
      const swell = 1 + (0.5 * n * (1 - 0.85 * edge) + 0.05 * n * edge) * (0.45 + 0.55 * (1 - t));
      // The broken top: the edge of the last ring is ragged in height.
      const snap = cap ? 0.12 : 1;
      // The edges keep to the layout: a notch goes in no more than a thirtieth, a block stands out no more than a twelfth.
      const l = p.centre + Math.sign(c) * Math.pow(Math.abs(c), 0.8) * p.half * (1 + Math.min(0.085, Math.max(-0.032, 0.16 * n))) * snap;
      const along = Math.sign(s) * Math.pow(Math.abs(s), 1.25) * p.thick * swell * snap;
      const y = p.y + (cap ? 1.5 : 0) + (t > 0.9 ? (t - 0.9) * 10 * 7 * n : 0);
      pos.push(sp.x + f.nx * l + f.tx * along, y, sp.z + f.nz * l + f.tz * along);
      top.push(tipY - y);
      sl.push(FAR, FAR);
    }
  }
  const index: number[] = [];
  for (let r = 0; r <= RINGS; r++) {
    for (let a = 0; a < AROUND; a++) {
      const p0 = r * AROUND + a;
      const p1 = r * AROUND + ((a + 1) % AROUND);
      index.push(p0, p0 + AROUND, p1, p1, p0 + AROUND, p1 + AROUND);
    }
  }
  return finish(pos, index, top, sl);
}

const D_LIST: number[] = [];
for (let d = -5; d <= EXIT + 5; d += 1.25) D_LIST.push(d);
const SEG = 40;

/** The canal: a tube through the ridge. `grow` 0 is its inner wall; more is the rock that stands over its two mouths, with a lip that closes onto the wall. */
export function canalShell(rng: Rng, grow: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const top: number[] = [];
  const sl: number[] = [];
  const lip = grow > 0;
  const bumps = new Float32Array(64 * 64);
  for (let i = 0; i < bumps.length; i++) bumps[i] = rng.next();
  const bump = (a: number, k: number): number => {
    const x = (a / SEG) * 16;
    const y = k * 0.21;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const at = (i: number, j: number): number => bumps[(j % 64) * 64 + (i % 16)] as number;
    return (at(xi, yi) * (1 - fx) + at(xi + 1, yi) * fx) * (1 - fy) + (at(xi, yi + 1) * (1 - fx) + at(xi + 1, yi + 1) * fx) * fy;
  };
  const ring = (d: number, k: number, extra: number): void => {
    const f = frameAt(MOUTH_S + d);
    const r0 = flare(d);
    const cy = FLOOR + 0.62 * r0;
    for (let a = 0; a <= SEG; a++) {
      const ang = (a / SEG) * Math.PI * 2;
      const n = bump(a % SEG, k) - 0.5;
      const r = r0 + extra + n * (extra > 0 ? 3.2 : Math.min(1.1, 0.16 * r0 + 0.25));
      const l = canalL(d) + Math.cos(ang) * r;
      pos.push(f.x + f.nx * l, cy + Math.sin(ang) * r, f.z + f.nz * l);
      top.push(FAR);
      sl.push(FAR, FAR);
    }
  };
  let count = D_LIST.length;
  if (lip) {
    ring(D_LIST[0] as number, 0, 0);
    count++;
  }
  D_LIST.forEach((d, k) => ring(d, k, grow));
  if (lip) {
    ring(D_LIST[D_LIST.length - 1] as number, D_LIST.length - 1, 0);
    count++;
  }
  const index: number[] = [];
  for (let r = 0; r < count - 1; r++) {
    for (let a = 0; a < SEG; a++) {
      const p0 = r * (SEG + 1) + a;
      index.push(p0, p0 + SEG + 1, p0 + 1, p0 + 1, p0 + SEG + 1, p0 + SEG + 2);
    }
  }
  return finish(pos, index, top, sl);
}

/** The ice on the canal floor. */
export function canalFloor(): THREE.BufferGeometry {
  const pos: number[] = [];
  const index: number[] = [];
  D_LIST.forEach((d, i) => {
    const f = frameAt(MOUTH_S + d);
    const w = 0.79 * flare(d) + 0.6;
    const c = canalL(d);
    pos.push(f.x + f.nx * (c - w), FLOOR + 0.03, f.z + f.nz * (c - w), f.x + f.nx * (c + w), FLOOR + 0.03, f.z + f.nz * (c + w));
    if (i > 0) index.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const up: number[] = [];
  for (let i = 0; i < pos.length / 3; i++) up.push(0, 1, 0);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(up, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

/** Under the ground: the canal's roof over its floor and the share of the sky's light that reaches a point of it from the two mouths. */
export function hollow(x: number, z: number): { roof: number; light: number } | null {
  const at = locate(x, z);
  const d = at.s - MOUTH_S;
  if (d < 0.5 || d > EXIT - 0.5) return null;
  const r = flare(d);
  if (Math.abs(at.l - canalL(d)) > r + 1.5) return null;
  const near = 400 / (d * d + 400);
  const e = EXIT - d;
  const far = 169 / (e * e + 169);
  return { roof: 1.62 * r + 2.5, light: Math.min(1, 0.9 * (near + far) + 0.02) };
}


