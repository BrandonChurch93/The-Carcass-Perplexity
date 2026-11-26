// The meshes of the Spine's land: the crest as a strip in ridge coordinates (fine where the cameras stand), the flanks down to the cloud,
// the spires built round the fins of the layout, and the canal: its wall, the rock over its mouths, and its floor.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { EXIT, FIN_DEEP, FIN_ROOT, FIN_SECTION, FLOOR, MOUTH_S, S_MAX, S_MIN, canalInFin, canalL, fin, finAxes, first, flare, frameAt, locate, sheetAt, type Spire } from '../ridge';
import { SHEETS, type SheetData } from '../shared/sheets';
import { height, heightAt, landAt, slab, vnoise } from './height';

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

const RING_LOW = 0.58;
const RING_HIGH = 0.9;
const RING_DENSE = 2.5;
/** How high on the first spire a ring stands (0 the crest, 1 the tip) for how far up the count of rings it is: closest where the kites roost. */
function ringAt(g: number): number {
  const whole = RING_LOW + RING_DENSE * (RING_HIGH - RING_LOW) + (1 - RING_HIGH);
  const w = g * whole;
  if (w < RING_LOW) return w;
  if (w < RING_LOW + RING_DENSE * (RING_HIGH - RING_LOW)) return RING_LOW + (w - RING_LOW) / RING_DENSE;
  return RING_HIGH + (w - RING_LOW - RING_DENSE * (RING_HIGH - RING_LOW));
}

const mixHash = (x: number, y: number): number => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
/** A line cut into pieces of no two lengths, `mean` long on average: which piece c lies in, and where that piece begins and ends. */
function piece(c: number, mean: number, seed: number): { i: number; lo: number; hi: number } {
  const x = c / mean;
  const end = (j: number): number => j + 0.7 * (mixHash(j, seed) - 0.5);
  let i = Math.floor(x);
  if (x < end(i)) i--;
  else if (x >= end(i + 1)) i++;
  return { i, lo: end(i) * mean, hi: end(i + 1) * mean };
}

/**
 * The jointing of a spire's rock, on the lattice of its mesh. A relief that steps where it likes (a field of slabs read at each vertex) is
 * cut by the lattice into a row of shards along every joint, as long as the step is deep. Here every joint lies on a line of the lattice:
 * a bed between two rings, an upright joint between two columns. So a block is a flat face of whole quads, and the wall of a joint or the
 * shelf of a ledge is one clean strip of them. `around` is the count of columns, `girth(y)` the way round the blade at a height in metres,
 * `fine` the size of one quad there, `great(y)` how much of the great slabs is let stand. The result is asked for by column and height: metres out of the face, and how deep a joint is cut there.
 */
function jointing(around: number, girth: (y: number) => number, fine: (y: number) => number, great: (y: number) => number, seed: number): (a: number, y: number) => [number, number] {
  // How far round the blade a column stands, 0 to 1, for a section as thick as it is broad.
  const round_: number[] = [0];
  const at = (a: number): [number, number] => {
    const th = (2 * Math.PI * a) / around;
    const c = Math.cos(th);
    const k = Math.sin(th);
    return [Math.sign(c) * Math.pow(Math.abs(c), 2 / FIN_SECTION), Math.sign(k) * Math.pow(Math.abs(k), 2 / FIN_SECTION)];
  };
  for (let a = 1; a <= around; a++) {
    const p = at(a - 1);
    const q = at(a);
    round_.push((round_[a - 1] as number) + Math.hypot(q[0] - p[0], q[1] - p[1]));
  }
  const whole = round_[around] as number;
  const girths = new Map<number, number>();
  const girthAt = (y: number): number => {
    const key = Math.round(y * 8);
    let v = girths.get(key);
    if (v === undefined) {
      v = girth(y);
      girths.set(key, v);
    }
    return v;
  };
  // One size of block. The rock stands in upright pillars, as frost-shattered rock does: a stage of the face is cut into pillars first, and
  // each pillar into blocks by beds of its own, so no bed runs level across the face from pillar to pillar. `stage`, `bed` and `block` are
  // mean sizes in metres, `stand` how far a block stands in or out, `lean` how far its face leans over its own height and breadth. What is
  // finer than the mesh can show is left out.
  const size = (q: number, y: number, key: number, stage: number, bed: number, block: number, stand: number, lean: number): { n: number; id: number } => {
    const s = piece(y, stage, key);
    const g = girthAt(0.5 * (s.lo + s.hi));
    const ks = Math.floor(mixHash(s.i, key + 17) * 65521);
    const c = piece(q * g, block, ks);
    const kc = Math.floor(mixHash(c.i, ks + 5) * 65521);
    // The beds of a stage dip, 10 to 25 degrees one way or the other: each pillar has the stage's beds where the dip brings them to it, so
    // a bed climbs across the face pillar by pillar and is broken at every joint.
    const dip = (mixHash(s.i, key + 41) < 0.5 ? -1 : 1) * Math.tan(((10 + 15 * mixHash(s.i, key + 43)) * Math.PI) / 180);
    const shift = dip * 0.5 * (c.lo + c.hi);
    const b = piece(y - shift, bed, ks + 9);
    const id = Math.floor(mixHash(b.i, kc + 3) * 65521);
    const shown = Math.min(1, Math.max(0, (Math.min(bed, block) / fine(y) - 1.6) / 2));
    if (shown <= 0) return { n: 0, id };
    const lo = Math.max(b.lo + shift, s.lo);
    const hi = Math.min(b.hi + shift, s.hi);
    const fy = (y - lo) / Math.max(hi - lo, 1e-3) - 0.5;
    const fx = (q * g - c.lo) / (c.hi - c.lo) - 0.5;
    // More blocks lean out than in: the top of a block stands proud of the foot of the one above it, and that step is a ledge. Across its
    // breadth a block leans less, or every ledge would be a long wedge.
    const n = stand * 2 * (mixHash(id, 3) - 0.5) + lean * ((mixHash(id, 7) - 0.3) * 1.4 * fy + 0.45 * (mixHash(id, 11) - 0.5) * fx);
    return { n: n * shown, id };
  };
  const cut = (a: number, y: number): { n: number; ids: [number, number, number] } => {
    const q = (round_[((a % around) + around) % around] as number) / whole;
    // A few great parts round the blade, each with stages of its own.
    const part = piece(q * 5.3, 1, seed + 1).i;
    const k0 = Math.floor(mixHash(part, seed + 29) * 65521);
    // Great slabs that stand up the face, the plates each is broken into, their blocks, and the blocks' own.
    const slabs = size(q, y, k0, 210, 110, 46, 14, 5);
    const one = size(q, y, slabs.id, 90, 44, 16, 5.5, 2.5);
    const two = size(q, y, one.id, 40, 14, 5.5, 1.8, 1);
    const three = size(q, y, two.id, 20, 5.5, 2.3, 0.7, 0.35);
    // (`great`: where a lens comes close to the face the great slabs stand less, or one of them would be all the lens saw.)
    const gr = great(y);
    return { n: gr * slabs.n + (0.4 + 0.6 * gr) * one.n + two.n + three.n, ids: [one.id, two.id, three.id] };
  };
  return (a: number, y: number): [number, number] => {
    const here = cut(a, y);
    const next = cut(a + 1, y);
    // The upright joints are cut in: the last column of a block, where the next block begins, stands back from both.
    let slot = 0;
    if (here.ids[0] !== next.ids[0]) slot = 2.2 * (0.4 + 0.6 * mixHash(here.ids[0], 19));
    else if (here.ids[1] !== next.ids[1]) slot = 0.9 * (0.3 + 0.7 * mixHash(here.ids[1], 19));
    const shown = Math.min(1, Math.max(0, (7.5 / fine(y) - 1.6) / 2));
    return [here.n - slot * shown, slot * shown];
  };
}

// Where the kites hold: between these shares of the breadth, toward the lee edge, the relief turns from square to the face to along the thickness.
const LEE_FROM = 0.35;
const LEE_FULL = 0.65;
const LEE_BLUNT = 2.4;
const LEE_OUT = 1;
const LEE_IN = 2.5;

/** A spire: a leaning broken blade cut from its feature sheet (the outline and the relief are the sheet's), and its root down the flanks into the cloud. */
// level: 2 the spire the lens comes close to, 1 one that is seen whole in a long lens, 0 one far down the ridge. The triangles are dear in a
// software renderer whether or not they are seen large, so only the first spire has the finest mesh.
export function spireMesh(sp: Spire, rng: Rng, level: number): THREE.BufferGeometry {
  const UP = level > 1.5 ? 230 : level > 0.5 ? SPIRE_MID[0] : 48;
  const DOWN = level > 1.5 ? 50 : level > 0.5 ? 18 : 8;
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
  const yLow = sp.alt - FIN_ROOT;
  const finAt = (y: number): ReturnType<typeof fin> => fin(sp, (y - yLow) / tall);
  // (The way round a section of power 3 is close to 3.6 times its two half axes.)
  const joints = jointing(
    AROUND,
    (y) => {
      const p = finAt(y);
      return 3.6 * (p.half + p.thick);
    },
    (y) => {
      const p = finAt(y);
      const h = (y - sp.alt) / sp.tip;
      const ring = h < 0 ? (FIN_DEEP - FIN_ROOT) / DOWN : (sp.tip / UP) * (level > 1.5 ? (h > RING_LOW && h < RING_HIGH ? 1 / RING_DENSE : 1) * (RING_LOW + RING_DENSE * (RING_HIGH - RING_LOW) + (1 - RING_HIGH)) : 1);
      return Math.max(ring, (3.6 * (p.half + p.thick)) / AROUND);
    },
    (y) => {
      const k = Math.min(1, Math.max(0, ((y - sp.alt) / sp.tip - 0.42) / 0.16));
      return level > 1.5 ? 1 - 0.8 * k * k * (3 - 2 * k) : 1;
    },
    seed,
  );
  // The bites of the windward edge: whole blocks gone from it, some 40 and 12 m high, each with a level top and foot (not a wave: a wave of
  // 5 m on an edge 140 m out stood on it as a row of teeth).
  const bite = (u: number, n: number): number => 2 * (mixHash(piece(u, n ? 12 : 40, seed + 61 + n).i, seed + 67 + n) - 0.5);
  for (let r = 0; r <= DOWN + UP + 1; r++) {
    const cap = r === DOWN + UP + 1;
    const k = Math.min(r, DOWN + UP);
    // The rings stand closer where the lens of the kites is on the face (level 2 only): two and a half to one between h 0.58 and 0.9.
    const g = (k - DOWN) / UP;
    const h = level > 1.5 ? ringAt(g) : g;
    const t = k < DOWN ? tLow + (t0 - tLow) * Math.pow(k / DOWN, 0.7) : t0 + (1 - t0) * h;
    const p = fin(sp, t);
    const u = t * tall;
    for (let a = 0; a < AROUND; a++) {
      // Round the blade: its two broad faces are laid out evenly across their breadth, so the sheet's relief has the same mesh everywhere
      // on them, and its two thin ends take the few that are left.
      const f = a / AROUND;
      // (By the angle round its section, not by its breadth: its thin ends are as deep as its faces are broad where it is high, and the
      // lens of the kites looks straight at one of them.)
      const th = 2 * Math.PI * f;
      const co = Math.cos(th);
      const ln = Math.sign(co) * Math.pow(Math.abs(co), 2 / FIN_SECTION);
      const face = Math.sin(th) >= 0 ? 1 : -1;
      const edge = Math.pow(Math.abs(ln), 12);
      const snap = cap ? 0.12 : 1;
      // The windward edge of the blade is broken: bites and shoulders of some 15 and 5 m stand in and out of its line, so that no spire
      // shows a ruled side against the sky. The lee edge keeps its line (the kites hold to it), and so does the tip.
      const rag = ln < 0 ? (bite(u, 0) * Math.min(0.2, 13 / p.half) + bite(u, 1) * Math.min(0.08, 4.5 / p.half)) * Math.pow(-ln, 3) * Math.min(1, Math.max(0, (tipY - p.y) / 30)) : 0;
      const l = p.centre + ln * p.half * snap * (1 + rag);
      const y = p.y - (cap ? 1 : 0);
      // Its faces stand in and out as the sheet's relief has them, and the rock on top of that is jointed into blocks (see `jointing`).
      const [su, sv] = sheetAt(sp, l, y);
      const [cut, joint] = joints(a, y);
      const scale = Math.min(1, Math.max(0.22, p.thick / 42));
      // The lee edge keeps its line (the kites hold to it); the windward edge is let stand in and out block by block, so it is broken against the sky.
      const keep = 1 - (ln > 0 ? 0.92 : 0.45) * edge;
      const broad = Math.max(-0.5 * p.thick, Math.min(0.7 * p.thick + 4, depth * (reliefAt(sp.sheet, su, sv) - 0.55))) * keep;
      // (Toward the lee edge the blocks stand hardly out and not far in: see `LEE_FROM`.)
      const k = Math.min(1, Math.max(0, (ln - LEE_FROM) / (LEE_FULL - LEE_FROM)));
      const lee = k * k * (3 - 2 * k);
      // (No face of a block is a plane: it swells and gives a little, smoothly, so the mesh can show it.)
      const swell = 1.3 * (vnoise(u / 6.5 + seed, l / 6.5 + face * 50) - 0.5) + 0.7 * (vnoise(u / 2.6 + 9.1, l / 2.6 + face * 50 + seed) - 0.5);
      const blocks = Math.max(-0.35 * p.thick, Math.min(0.5 * p.thick, scale * (cut + swell)));
      const n = broad + (blocks + lee * (Math.max(-LEE_IN, Math.min(LEE_OUT, blocks)) - blocks)) * keep;
      // The blade the canal goes through is thinner behind than before, so the way out comes out of its back and not into a pit in it.
      const body = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(ln), FIN_SECTION)), 1 / FIN_SECTION) * p.thick * (ends && face > 0 ? 0.6 : 1);
      // The rock stands out of the blade square to its face, not along its thickness: on the thin ends of a blade a relief pushed along the
      // thickness slides along the face instead of standing out of it, and every joint there is drawn out into shards.
      const thickHere = p.thick * (ends && face > 0 ? 0.6 : 1);
      const gl = (Math.sign(co) * Math.pow(Math.abs(ln), FIN_SECTION - 1)) / Math.max(p.half, 1);
      const gb = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(ln), FIN_SECTION)), (FIN_SECTION - 1) / FIN_SECTION) / Math.max(thickHere, 1);
      const gn = Math.hypot(gl, gb) || 1;
      // Toward the lee edge it goes back to standing along the thickness, as the blade was first built: the kites' holdfasts are set by
      // the hollows the sheet has there (kites/index.ts), and the lens of the kites looks along that face at them, so the rock under
      // and before them must be where it was.
      let across = l + ((1 - lee) * n * gl) / gn;
      // (And at the edge itself the blade is blunt, some metres through, where it was a knife: the holdfasts stand on that.)
      const pad = Math.min(1, Math.max(0, (ln - 0.86) / 0.1));
      let along = face * Math.max(0.3 * body, body + n * (gb / gn + lee * (1 - gb / gn)), LEE_BLUNT * pad * pad * (3 - 2 * pad)) * snap;
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
          const k = w * w * (3 - 2 * w);
          along += (want - along) * k;
          across += (l - across) * k;
        }
      }
      const x = sp.x + m.ax * across + m.bx * along;
      const z = sp.z + m.az * across + m.bz * along;
      pos.push(x, y, z);
      top.push(tipY - y);
      // (A joint is darker than it is deep: the light does not reach into it.)
      relief.push(n - 4 * joint * scale * keep);
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
      const rough = extra > 0 ? 3.2 * n + (5 + 0.1 * rise) * slab(d * 1.2, (a % SEG) * 4.2, 26, 13, seed) : n * Math.min(1.1, 0.16 * r0 + 0.25) + (r0 > 9 ? 0.13 * (r0 - 9) * slab(d * 1.2, (a % SEG) * 2.4, 9, 7, seed) : 0) + 0.22 * r0 * Math.max(0, Math.sin(ang) + 0.15) * slab(d * 1.2 + 40, (a % SEG) * 1.7, 11, 9, seed)
        // The far mouth is not a drawn arch: its upper lip stands in and out in lobes, more toward the open.
        + (extra > 0 ? 0 : r0 * Math.max(0, Math.sin(ang) + 0.1) * (0.13 * Math.sin(3 * ang + 1.3) + 0.08 * Math.sin(5 * ang + 0.4 + 0.05 * d)) * Math.min(1, Math.max(0, (d - (EXIT - 28)) / 20)));
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

/** How high the floor of the canal stands over its ice, l metres across from the canal's middle at d along it, where the floor is w wide to
 * each side: snow banked against the right wall (the herd lies along the left, on the ice), drifts in the flare of the far mouth, and a
 * lip of drift across the mouth itself, low where the one that stands walks out. */
export function floorRise(l: number, d: number, w: number): number {
  const u = Math.abs(l) / w;
  const k = Math.min(1, Math.max(0, (u + 0.18 * (vnoise(d * 0.23, 1.7) - 0.5) - 0.42) / 0.58));
  const right = l > 0 ? Math.pow(k * k * (3 - 2 * k), 1.3) * (0.7 + 0.6 * vnoise(d * 0.11, 5.2)) : 0;
  const j = Math.min(1, Math.max(0, (Math.abs(l) - 3.3 - 0.8 * vnoise(d * 0.3, 8.4)) / 3.5));
  const left = l < 0 ? j * j * (3 - 2 * j) * (0.5 + 0.7 * vnoise(d * 0.13, 3.9)) : 0;
  const e = Math.min(1, Math.max(0, (d + 3 * (vnoise(l * 0.5, 9.1) - 0.5) - (EXIT - 10)) / 7));
  const path = 0.2 + 0.8 * Math.min(1, Math.max(0, (Math.abs(l + 0.85) - 1.4) / 2.2));
  const lip = e * e * (3 - 2 * e) * (0.2 + 0.75 * vnoise(l * 0.33, 2.2)) * path;
  const snow = Math.min(1, (right + left + lip) / 0.12);
  return right + left + lip + 0.07 * snow * (vnoise(l * 1.4, d * 1.4) - 0.5);
}

/** The floor of the canal: ice down its middle, and the snow that lies on it. */
export function canalFloor(): THREE.BufferGeometry {
  const pos: number[] = [];
  const index: number[] = [];
  const uv: number[] = [];
  const half: number[] = [];
  const ACROSS = 20;
  // A row every 0.62 m: the drifts have a shape of their own under a lens that stands 0.7 m over the ice.
  const rows: number[] = [];
  for (let d = D_LIST[0] as number; d <= (D_LIST[D_LIST.length - 1] as number) + 1e-6; d += 0.625) rows.push(d);
  rows.forEach((d, i) => {
    const f = frameAt(MOUTH_S + d);
    const w = 0.79 * flare(d) + 0.6;
    const c = canalL(d);
    for (let a = 0; a <= ACROSS; a++) {
      const x = (a / ACROSS) * 2 - 1;
      // Closer rows of points toward the walls, where the banks are.
      const l = w * Math.sign(x) * (1 - Math.pow(1 - Math.abs(x), 1.4));
      pos.push(f.x + f.nx * (c + l), FLOOR + 0.03 + floorRise(l, d, w), f.z + f.nz * (c + l));
      // Across the floor from wall to wall, -1 to 1, and metres along it.
      uv.push(l / w, d);
      half.push(w);
    }
    if (i > 0) {
      for (let a = 0; a < ACROSS; a++) {
        const p0 = (i - 1) * (ACROSS + 1) + a;
        const p1 = i * (ACROSS + 1) + a;
        index.push(p0, p0 + 1, p1, p0 + 1, p1 + 1, p1);
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aHalf', new THREE.Float32BufferAttribute(half, 1));
  g.setIndex(index);
  g.computeVertexNormals();
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
