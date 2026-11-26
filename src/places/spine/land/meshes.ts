// The meshes of the Spine's land: the crest as a strip in ridge coordinates (fine where the cameras stand), the flanks down to the cloud,
// the spires built round the fins of the layout, and the canal: its wall, the rock over its mouths, and its floor.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { EXIT, FIN_DEEP, FIN_ROOT, FIN_SECTION, FLOOR, MOUTH_S, S_MAX, S_MIN, canalInFin, canalL, fin, finAxes, first, flare, frameAt, locate, sheetAt, type Spire } from '../ridge';
import { SHEETS, type SheetData } from '../shared/sheets';
import { height, heightAt, landAt, slab } from './height';

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
      // The rock is jointed: great plates that stand up the face, each proud of or behind its neighbours, and the blocks they break into.
      n += 7 * slab(u - 0.25 * l, l + face * 700 + 31, 64, 21, seed + 11) + 2.8 * slab(u + 0.15 * l, l + face * 700 + 57, 23, 8, seed + 3);
      n = Math.max(-0.5 * p.thick, Math.min(0.7 * p.thick + 4, n)) * (1 - 0.92 * edge);
      // The blade the canal goes through is thinner behind than before, so the way out comes out of its back and not into a pit in it.
      const body = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(ln), FIN_SECTION)), 1 / FIN_SECTION) * p.thick * (ends && face > 0 ? 0.6 : 1);
      let along = face * Math.max(0.3 * body, body + n) * snap;
      // About the mouth and the way out the face stands just outside the canal's end, so the canal is cut through a wall; the relief
      // only stands out of that wall, never in.
      if (ends) {
        const end = face < 0 ? ends.mouth : ends.exit;
        const near = Math.hypot(l - end[0], y - (FLOOR + 12));
        const w = 1 - Math.min(1, Math.max(0, (near - 60) / 45));
        if (w > 0) {
          // The canal's end is square to the ridge there, not to the blade: the wall is laid on that plane, a little outside it.
          const target = (face < 0 ? MOUTH_S : MOUTH_S + EXIT) + face * (1.5 + 0.6 * Math.max(n, 0));
          let want = end[1];
          for (let i = 0; i < 5; i++) want += (target - locate(sp.x + m.ax * l + m.bx * want, sp.z + m.az * l + m.bz * want).s) / 0.9;
          along += (want - along) * w * w * (3 - 2 * w);
        }
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
  const half: number[] = [];
  D_LIST.forEach((d) => half.push(0.79 * flare(d) + 0.6, 0.79 * flare(d) + 0.6));
  g.setAttribute('aHalf', new THREE.Float32BufferAttribute(half, 1));
  const up: number[] = [];
  for (let i = 0; i < pos.length / 3; i++) up.push(0, 1, 0);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(up, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

/** The icicles of the canal: thick along the upper lip of the far mouth, fewer and shorter along the roof behind it. Each hangs plumb from a root in the rock. */
export function icicles(rng: Rng): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const SIDES = 5;
  const RINGS = 4;
  const hang = (d: number, ang: number, length: number, radius: number): void => {
    const f = frameAt(MOUTH_S + d);
    const r0 = flare(d);
    const r = r0 + 0.7;
    const l = canalL(d) + Math.cos(ang) * r;
    const y0 = FLOOR + 0.62 * r0 + Math.sin(ang) * r;
    const x0 = f.x + f.nx * l;
    const z0 = f.z + f.nz * l;
    const turn = rng.next() * 6.283;
    const bendX = (rng.next() - 0.5) * 0.08 * length;
    const bendZ = (rng.next() - 0.5) * 0.08 * length;
    const base = pos.length / 3;
    for (let k = 0; k <= RINGS; k++) {
      const t = k / RINGS;
      // Broad at the root, a long thin point: ice that grew by dripping.
      const rr = radius * (k === RINGS ? 0.02 : Math.pow(1 - t, 1.5) + 0.06);
      for (let a = 0; a < SIDES; a++) {
        const th = turn + (a / SIDES) * 6.283;
        const cx = Math.cos(th);
        const cz = Math.sin(th);
        pos.push(x0 + bendX * t * t + cx * rr, y0 - length * t, z0 + bendZ * t * t + cz * rr);
        nor.push(cx, 0.15, cz);
        uv.push(d, t);
      }
    }
    for (let k = 0; k < RINGS; k++) {
      for (let a = 0; a < SIDES; a++) {
        const p0 = base + k * SIDES + a;
        const p1 = base + k * SIDES + ((a + 1) % SIDES);
        index.push(p0, p0 + SIDES, p1, p1, p0 + SIDES, p1 + SIDES);
      }
    }
  };
  // The lip: rows of them, long in clumps and short between.
  for (let i = 0; i < 280; i++) {
    const ang = (0.14 + 0.72 * rng.next()) * Math.PI;
    const clump = 0.5 + 0.5 * Math.sin(ang * 9 + 1.3);
    const length = (1.2 + 3.6 * rng.next() ** 2 * (0.35 + 0.65 * clump)) / Math.max(Math.sin(ang), 0.55);
    hang(EXIT - 1.4 - 3.4 * rng.next() ** 1.5, ang, length + 0.9, 0.09 + 0.05 * length * (0.6 + 0.4 * rng.next()));
  }
  // The roof behind it.
  for (let i = 0; i < 170; i++) {
    const ang = (0.27 + 0.46 * rng.next()) * Math.PI;
    const length = 0.5 + 1.5 * rng.next() ** 2;
    hang(EXIT - 5 - 55 * rng.next() ** 1.4, ang, length + 0.9, 0.07 + 0.05 * length);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
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



/**
 * Stones about a place, each half sunk in the ground with snow on its top, and behind each a tail of snow drifted down the gale. `drifts`
 * are larger banks of the same kind, each from a point, along a heading. Seen low across the ground, a picture of stones lies down flat
 * and is lost; these stand up.
 */
export function stones(
  rng: Rng,
  centre: readonly [number, number],
  keep: readonly (readonly [number, number, number])[],
  wind: readonly [number, number],
  drifts: readonly { at: readonly [number, number]; along: readonly [number, number]; long: number; wide: number; high: number }[],
): THREE.BufferGeometry {
  const pos: number[] = [];
  const index: number[] = [];
  const top: number[] = [];
  const sl: number[] = [];
  const SEG = 9;
  const RINGS = 5;
  const tail = (x: number, z: number, ax: number, az: number, long: number, wide: number, high: number): void => {
    const base = pos.length / 3;
    const T = 7;
    const A = 6;
    for (let i = 0; i <= T; i++) {
      const t = i / T;
      for (let a = 0; a <= A; a++) {
        const k = (a / A) * 2 - 1;
        const w = wide * (1 - 0.7 * t) * k;
        const px = x + ax * long * t - az * w;
        const pz = z + az * long * t + ax * w;
        const h = high * Math.min(1, t / 0.18) * Math.pow(1 - t, 1.4) * Math.pow(Math.cos((k * Math.PI) / 2), 2) * 1.35;
        pos.push(px, height(px, pz) - 0.02 + h, pz);
        top.push(0);
        sl.push(FAR, FAR);
      }
    }
    for (let i = 0; i < T; i++) {
      for (let a = 0; a < A; a++) {
        const p = base + i * (A + 1) + a;
        index.push(p, p + 1, p + A + 1, p + 1, p + A + 2, p + A + 1);
      }
    }
  };
  for (let n = 0; n < 90; n++) {
    const u = rng.next();
    const far = 1.2 + 24 * u * u;
    const turn = rng.next() * Math.PI * 2;
    const r = 0.06 + 0.42 * Math.pow(rng.next(), 3);
    const x = centre[0] + Math.cos(turn) * far;
    const z = centre[1] + Math.sin(turn) * far;
    const spin = rng.next() * Math.PI;
    const squash = rng.range(0.45, 0.8);
    const lumps = Array.from({ length: (RINGS - 1) * SEG + 2 }, () => rng.range(0.78, 1.22));
    if (keep.some((k) => Math.hypot(x - k[0], z - k[1]) < k[2] + r)) continue;
    const y = height(x, z) + r * squash * 0.3;
    const base = pos.length / 3;
    const put = (dx: number, dy: number, dz: number, lump: number): void => {
      const lx = dx * r * lump;
      const lz = dz * r * 0.8 * lump;
      pos.push(x + Math.cos(spin) * lx - Math.sin(spin) * lz, y + dy * r * squash * lump, z + Math.sin(spin) * lx + Math.cos(spin) * lz);
      top.push(1);
      sl.push(FAR, FAR);
    };
    put(0, 1, 0, lumps[0] as number);
    for (let j = 1; j < RINGS; j++) {
      const lat = (j / RINGS) * Math.PI;
      for (let a = 0; a < SEG; a++) {
        const lon = (a / SEG) * Math.PI * 2;
        put(Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon), lumps[1 + (j - 1) * SEG + a] as number);
      }
    }
    put(0, -1, 0, lumps[lumps.length - 1] as number);
    const last = base + (RINGS - 1) * SEG + 1;
    for (let a = 0; a < SEG; a++) {
      const b = (a + 1) % SEG;
      index.push(base, base + 1 + b, base + 1 + a);
      for (let j = 0; j < RINGS - 2; j++) {
        const p = base + 1 + j * SEG;
        index.push(p + a, p + b, p + SEG + a, p + b, p + SEG + b, p + SEG + a);
      }
      index.push(last, last - SEG + a, last - SEG + b);
    }
    tail(x + wind[0] * r * 0.3, z + wind[1] * r * 0.3, wind[0], wind[1], r * rng.range(5, 9), r * 0.95, r * squash * 0.75);
  }
  for (const d of drifts) tail(d.at[0], d.at[1], d.along[0], d.along[1], d.long, d.wide, d.high);
  return finish(pos, index, top, sl);
}

/**
 * A crag: a lump of broken rock about a point, taller than it is broad, for the rock that stands near a lens. It is seen out of focus, so its
 * form is a few sizes of lump and no more.
 */
export function crag(rng: Rng, at: readonly [number, number, number], wide: number, tall: number): THREE.BufferGeometry {
  const RINGS = 40;
  const SEG = 48;
  const pos: number[] = [];
  const index: number[] = [];
  const lumps = Array.from({ length: 24 }, () => [rng.range(0, 6.283), rng.range(-1, 1), rng.range(0.25, 0.7), rng.range(-0.22, 0.3)] as const);
  for (let j = 0; j <= RINGS; j++) {
    const lat = (j / RINGS) * Math.PI;
    for (let a = 0; a <= SEG; a++) {
      const lon = (a / SEG) * Math.PI * 2;
      const dx = Math.sin(lat) * Math.cos(lon);
      const dy = Math.cos(lat);
      const dz = Math.sin(lat) * Math.sin(lon);
      let r = 1;
      for (const [lo, hi, size, deep] of lumps) {
        const cx = Math.sqrt(1 - hi * hi) * Math.cos(lo);
        const cz = Math.sqrt(1 - hi * hi) * Math.sin(lo);
        const d2 = (dx - cx) ** 2 + (dy - hi) ** 2 + (dz - cz) ** 2;
        r += deep * Math.exp(-d2 / (size * size));
      }
      pos.push(at[0] + dx * wide * r, at[1] + dy * tall * r, at[2] + dz * wide * r);
    }
  }
  for (let j = 0; j < RINGS; j++) {
    for (let a = 0; a < SEG; a++) {
      const p = j * (SEG + 1) + a;
      index.push(p, p + SEG + 1, p + 1, p + 1, p + SEG + 1, p + SEG + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
