// The meshes of the Spine's land: the crest as a strip in ridge coordinates (fine where the cameras stand), the flanks down to the cloud,
// the spires built round the fins of the layout, and the canal: its wall, the rock over its mouths, and its floor.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { EXIT, FIN_DEEP, FIN_ROOT, FIN_SECTION, FLOOR, MOUTH_S, S_MAX, S_MIN, canalL, fin, finAxes, first, flare, frameAt, locate, type Spire } from '../ridge';
import { heightAt, landAt, slab } from './height';

interface Extra {
  normals?: number[];
  relief?: number[];
  up?: [number, number, number];
}

function finish(pos: number[], index: number[], top: number[], sl: number[], extra: Extra = {}): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const count = pos.length / 3;
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aTop', new THREE.Float32BufferAttribute(top, 1));
  g.setAttribute('aSL', new THREE.Float32BufferAttribute(sl, 2));
  // How far the rock here stands out of its face (a spire's slabs), and the way its beds run up: straight up on the ground, along the lean on a spire.
  g.setAttribute('aRelief', new THREE.Float32BufferAttribute(extra.relief ?? new Array<number>(count).fill(0), 1));
  const up = extra.up ?? [0, 1, 0];
  const ups = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) ups.set(up, i * 3);
  g.setAttribute('aUp', new THREE.Float32BufferAttribute(ups, 3));
  g.setIndex(index);
  if (extra.normals) g.setAttribute('normal', new THREE.Float32BufferAttribute(extra.normals, 3));
  else g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

const FAR = 1e4;
// The mesh of the spires next to the first: [rings, around]. [170, 440] is the finer picture in the strike's long lens; its cost is in HANDOVER.md.
const SPIRE_MID: [number, number] = [104, 240];

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
  for (const l of [-520, -450, -390, -335, -290, -252, -218, -188, -162, -140]) lList.push(l);
  for (let l = -130; l < -70; l += 5) lList.push(l);
  for (let l = -70; l <= 120; l += 2.5) lList.push(l);
  for (let l = 125; l <= 300; l += 5) lList.push(l);
  for (const l of [308, 318, 330, 344, 360, 380, 404, 432, 468, 520]) lList.push(l);
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
      const here = landAt(s, l);
      const y = here.y;
      pos.push(f.x + f.nx * l, y - edge, f.z + f.nz * l);
      // The slope along the crest and across it, in the frame of the ridge here.
      const ds = (heightAt(s + E, l) - heightAt(s - E, l)) / (2 * E);
      const dl = (heightAt(s, l + E) - heightAt(s, l - E)) / (2 * E);
      const nx = -ds * f.tx - dl * f.nx;
      const nz = -ds * f.tz - dl * f.nz;
      const len = Math.hypot(nx, 1, nz);
      normals.push(nx / len, 1 / len, nz / len);
      top.push(here.rock);
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
  return finish(pos, index, top, sl, { normals });
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
  const under: boolean[] = [];
  for (let j = 0; j <= ROWS; j++) {
    for (let i = 0; i <= COLS; i++) {
      const x = cx + (i / COLS - 0.5) * W;
      const z = cz + (j / ROWS - 0.5) * D;
      const at = locate(x, z);
      // Under the strip it lies well below; beyond it, a little below, so that the two never cross.
      const here = landAt(at.s, at.l);
      pos.push(x, here.y - (Math.abs(at.l) < 470 ? 90 : 8), z);
      top.push(here.rock);
      sl.push(FAR, FAR);
      under.push(Math.abs(at.l) < 440 && at.s > S_MIN + 120 && at.s < S_MAX - 120);
    }
  }
  // What lies wholly under the strip is not drawn at all: on a knife ridge a coarse face stands out of the fine ground beside every wall.
  const index: number[] = [];
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const a = j * (COLS + 1) + i;
      const c = a + COLS + 1;
      if (!(under[a] && under[c] && under[a + 1])) index.push(a, c, a + 1);
      if (!(under[a + 1] && under[c] && under[c + 1])) index.push(a + 1, c, c + 1);
    }
  }
  return finish(pos, index, top, sl);
}

/** A spire: a leaning broken blade built round the fin of the layout, and its root down the flanks into the cloud. Its tip and its lee edge stay where the layout has them, to within a few metres. */
// level: 2 the spire the lens comes close to, 1 one that is seen whole in a long lens, 0 one far down the ridge. The triangles are dear in a
// software renderer whether or not they are seen large, so only the first spire has the finest mesh.
export function spireMesh(sp: Spire, rng: Rng, level: number): THREE.BufferGeometry {
  const UP = level > 1.5 ? 190 : level > 0.5 ? SPIRE_MID[0] : 48;
  const DOWN = level > 1.5 ? 34 : level > 0.5 ? 18 : 8;
  const AROUND = level > 1.5 ? 400 : level > 0.5 ? SPIRE_MID[1] : 96;
  const m = finAxes(sp);
  const seed = Math.floor(rng.next() * 900);
  const own = rng.next();
  const pos: number[] = [];
  const top: number[] = [];
  const sl: number[] = [];
  const relief: number[] = [];
  const tipY = fin(sp, 1).y;
  const tall = sp.tip + FIN_ROOT;
  const t0 = FIN_ROOT / tall;
  const tLow = -(FIN_DEEP - FIN_ROOT) / tall;
  const E = 2 / FIN_SECTION;
  // The plates of a great spire are great plates.
  const big = Math.max(0.45, sp.tip / 300);
  const bench = (26 + 16 * own) * big;
  for (let r = 0; r <= DOWN + UP + 1; r++) {
    const cap = r === DOWN + UP + 1;
    const k = Math.min(r, DOWN + UP);
    const t = k < DOWN ? tLow + (t0 - tLow) * Math.pow(k / DOWN, 0.7) : t0 + (1 - t0) * ((k - DOWN) / UP);
    const p = fin(sp, t);
    const u = t * tall;
    const h = (t - t0) / (1 - t0);
    // The storm edge goes up in benches: a wall, a ledge where a block came away, a wall. The lee edge keeps to the layout (the kites are made fast to it).
    const ph = u / bench + 0.7 * slab(u, 3, 90 * big, 40, seed + 17);
    const saw = ph - Math.floor(ph);
    const storm = -0.05 * saw * (1 - 0.6 * Math.max(0, h)) + Math.min(0.07, Math.max(-0.05, 0.2 * slab(u, -40, 30 * big, 60, seed + 11)));
    const lee = Math.min(0.035, Math.max(-0.03, 0.2 * slab(u, 40, 30 * big, 60, seed + 11)));
    const fade = 0.3 + 0.7 * Math.min(1, Math.max(0, 1 - h));
    for (let a = 0; a < AROUND; a++) {
      const ang = (a / AROUND) * Math.PI * 2;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      const face = s >= 0 ? 1 : -1;
      const edge = Math.pow(Math.abs(c), 8);
      const across = Math.sign(c) * Math.pow(Math.abs(c), E) * p.half;
      // Its faces are slabs that lean as it leans: great plates, and the smaller blocks they have broken into.
      const v = across + face * 700;
      let n = big * (22 * slab(u, v, 150 * big, 46 * big, seed) + 9 * slab(u + 0.25 * v, v, 50 * big, 15 * big, seed + 3)) + 2.6 * slab(u - 0.2 * v, v, 15, 5, seed + 7);
      n = Math.max(-0.5 * p.thick, Math.min(0.6 * p.thick, n * fade)) * (1 - 0.92 * edge);
      // The broken top: split in two prongs, the one toward the storm the higher.
      const snap = cap ? 0.12 : 1;
      const l = p.centre + across * (1 + (c < 0 ? storm : lee) * Math.min(1, Math.abs(c) * 3)) * snap;
      const body = Math.pow(Math.abs(s), E) * p.thick;
      const along = face * Math.max(0.3 * body, body + n) * snap;
      const q = Math.max(0, (t - 0.86) / 0.14);
      // The cleft is a notch a little to the lee of the middle, so that each prong keeps the breadth of the blade under it and the split
      // reads from far off; the lee prong is the lower.
      const cleft = Math.exp(-(((c - 0.12) / 0.24) ** 2));
      const split = q * q * (0.125 * sp.tip * cleft + 0.055 * sp.tip * Math.min(1, Math.max(0, (c - 0.12) / 0.3))) + q * 5 * (slab(v, 0, 9, 9, seed + 5) + 0.4);
      const y = p.y - split - (cap ? 2 : 0);
      const x = sp.x + m.ax * l + m.bx * along;
      const z = sp.z + m.az * l + m.bz * along;
      pos.push(x, y, z);
      top.push(tipY - y);
      relief.push(n);
      // Where it is on the ridge, for the spire the canal goes through: the canal is cut out of it.
      if (level > 1.5) {
        const at = locate(x, z);
        sl.push(at.s, at.l);
      } else sl.push(FAR, FAR);
    }
  }
  const index: number[] = [];
  for (let r = 0; r <= DOWN + UP; r++) {
    for (let a = 0; a < AROUND; a++) {
      const p0 = r * AROUND + a;
      const p1 = r * AROUND + ((a + 1) % AROUND);
      index.push(p0, p0 + AROUND, p1, p1, p0 + AROUND, p1 + AROUND);
    }
  }
  // The beds of its rock run up along its lean.
  const run = -sp.lean / sp.tip;
  const len = Math.hypot(run, 1);
  return finish(pos, index, top, sl, { relief, up: [(m.ax * run) / len, 1 / len, (m.az * run) / len] });
}

const D_LIST: number[] = [];
for (let d = 1.25; d <= EXIT - 1.2; d += 1.25) D_LIST.push(d);
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
  const seed = Math.floor(rng.next() * 900);
  const ring = (d: number, k: number, extra: number): void => {
    const f = frameAt(MOUTH_S + d);
    const r0 = flare(d);
    const cy = FLOOR + 0.62 * r0;
    // The rock over the canal is a buttress of the spire: low over the mouth, rising to the spire's own face behind it.
    const near = Math.min(Math.max(d, 0), EXIT - Math.max(d, 0));
    const rise = extra > 0 ? Math.min(0.62 * Math.min(near, 100), 62) : 0;
    const flank = extra > 0 ? 0.16 * Math.min(near, 100) : 0;
    for (let a = 0; a <= SEG; a++) {
      const ang = (a / SEG) * Math.PI * 2;
      const up = Math.max(Math.sin(ang), 0);
      const n = bump(a % SEG, k) - 0.5;
      const rough = extra > 0 ? 3.2 * n + (5 + 0.1 * rise) * slab(d * 1.2, (a % SEG) * 4.2, 26, 13, seed) : n * Math.min(1.1, 0.16 * r0 + 0.25) + (r0 > 9 ? 0.13 * (r0 - 9) * slab(d * 1.2, (a % SEG) * 2.4, 9, 7, seed) : 0);
      const r = r0 + extra + flank + rise * Math.pow(up, 1.5) + rough;
      const l = canalL(d) + Math.cos(ang) * r;
      pos.push(f.x + f.nx * l, cy + Math.sin(ang) * r, f.z + f.nz * l);
      top.push(FAR);
      sl.push(MOUTH_S + d, l);
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
  // Across the floor from wall to wall, -1 to 1, and metres along it: the snow banks lie against the walls.
  const uv: number[] = [];
  D_LIST.forEach((d) => uv.push(-1, d, 1, d));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
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
  // The dusk does not reach far in: a few metres past each mouth the canal is dark.
  const near = Math.exp(-d / 4.5);
  const far = Math.exp(-(EXIT - d) / 4.5);
  return { roof: 1.62 * r + 2.5, light: Math.min(1, 0.55 * (near + far) + 0.012) };
}


