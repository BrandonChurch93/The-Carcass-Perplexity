// The meshes of the Spine's land: the crest as a strip in ridge coordinates (fine where the cameras stand), the flanks down to the cloud,
// the spires built round the fins of the layout, and the canal: its wall, the rock over its mouths, and its floor.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { EXIT, FIN_DEEP, FIN_ROOT, FIN_SECTION, FLOOR, MOUTH_S, S_MAX, S_MIN, canalInFin, canalL, fin, finAxes, first, flare, frameAt, locate, sheetAt, type Spire } from '../ridge';
import { SHEETS, type SheetData } from '../shared/sheets';
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

const reliefs: Uint8Array[] = SHEETS.map((sh) => Uint8Array.from(atob(sh.relief), (c) => c.charCodeAt(0)));
/** The relief of a sheet at (u, v): 0 furthest back, 1 nearest. */
function reliefAt(sheet: number, u: number, v: number): number {
  const sh = SHEETS[sheet] as SheetData;
  const grid = reliefs[sheet] as Uint8Array;
  const x = Math.min(sh.cols - 1.001, Math.max(0, u * sh.cols - 0.5));
  const y = Math.min(sh.lines - 1.001, Math.max(0, v * sh.lines - 0.5));
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const at = (i: number, j: number): number => (grid[j * sh.cols + i] as number) / 255;
  return (at(xi, yi) * (1 - fx) + at(xi + 1, yi) * fx) * (1 - fy) + (at(xi, yi + 1) * (1 - fx) + at(xi + 1, yi + 1) * fx) * fy;
}

/** How far the relief of a spire's sheet stands out of its face, metres from furthest to nearest. */
export const reliefDepth = (sp: Spire): number => 0.1 * sp.tip;

/** A spire: a leaning broken blade cut from its feature sheet (the outline and the relief are the sheet's), and its root down the flanks into the cloud. */
// level: 2 the spire the lens comes close to, 1 one that is seen whole in a long lens, 0 one far down the ridge. The triangles are dear in a
// software renderer whether or not they are seen large, so only the first spire has the finest mesh.
export function spireMesh(sp: Spire, rng: Rng, level: number): THREE.BufferGeometry {
  const UP = level > 1.5 ? 190 : level > 0.5 ? SPIRE_MID[0] : 48;
  const DOWN = level > 1.5 ? 90 : level > 0.5 ? 18 : 8;
  const AROUND = level > 1.5 ? 400 : level > 0.5 ? SPIRE_MID[1] : 96;
  const m = finAxes(sp);
  const seed = Math.floor(rng.next() * 900);
  const pos: number[] = [];
  const top: number[] = [];
  const sl: number[] = [];
  const relief: number[] = [];
  const tipY = fin(sp, 1).y;
  const tall = sp.tip + FIN_ROOT;
  const t0 = FIN_ROOT / tall;
  const tLow = -(FIN_DEEP - FIN_ROOT) / tall;
  const depth = reliefDepth(sp);
  const ends = level > 1.5 ? canalInFin(sp) : null;
  for (let r = 0; r <= DOWN + UP + 1; r++) {
    const cap = r === DOWN + UP + 1;
    const k = Math.min(r, DOWN + UP);
    const t = k < DOWN ? tLow + (t0 - tLow) * Math.pow(k / DOWN, 0.7) : t0 + (1 - t0) * ((k - DOWN) / UP);
    const p = fin(sp, t);
    const u = t * tall;
    for (let a = 0; a < AROUND; a++) {
      // Round the blade: its two broad faces are laid out evenly across their breadth, so the sheet's relief has the same mesh everywhere
      // on them, and its two thin ends take the few that are left.
      const f = a / AROUND;
      let ln: number;
      let face: number;
      if (f < 0.46) {
        ln = 0.98 - 1.96 * (f / 0.46);
        face = 1;
      } else if (f < 0.5) {
        const g = (f - 0.46) / 0.04;
        ln = -(0.98 + 0.02 * Math.sin(Math.PI * g));
        face = g < 0.5 ? 1 : -1;
      } else if (f < 0.96) {
        ln = -0.98 + 1.96 * ((f - 0.5) / 0.46);
        face = -1;
      } else {
        const g = (f - 0.96) / 0.04;
        ln = 0.98 + 0.02 * Math.sin(Math.PI * g);
        face = g < 0.5 ? -1 : 1;
      }
      const edge = Math.pow(Math.abs(ln), 12);
      const snap = cap ? 0.12 : 1;
      const l = p.centre + ln * p.half * snap;
      const y = p.y - (cap ? 1 : 0);
      // Its faces stand in and out as the sheet's relief has them, with the small blocks of the rock on top.
      const [su, sv] = sheetAt(sp, l, y);
      let n = depth * (reliefAt(sp.sheet, su, sv) - 0.55) + 0.8 * slab(u - 0.2 * l, l + face * 700, 15, 5, seed + 7);
      n = Math.max(-0.5 * p.thick, Math.min(0.7 * p.thick + 4, n)) * (1 - 0.92 * edge);
      const body = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(ln), FIN_SECTION)), 1 / FIN_SECTION) * p.thick;
      let along = face * Math.max(0.3 * body, body + n) * snap;
      // About the mouth and the way out the face stands just outside the canal's end, so the canal is cut through a wall; the relief
      // only stands out of that wall, never in.
      if (ends) {
        const end = face < 0 ? ends.mouth : ends.exit;
        const near = Math.hypot(l - end[0], y - (FLOOR + 12));
        const w = 1 - Math.min(1, Math.max(0, (near - 60) / 45));
        const want = end[1] + face * (2 + 0.6 * Math.max(n, 0));
        along += (want - along) * w * w * (3 - 2 * w);
      }
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
  const run = (fin(sp, t0 + 0.7 * (1 - t0)).centre - fin(sp, t0).centre) / (0.7 * sp.tip);
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


