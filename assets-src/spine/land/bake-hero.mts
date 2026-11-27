// Bakes the rock of the first spire: a fracture model of tall plates that run the whole lean of the blade, each cut by rare cross joints into
// slabs with their own stand and tilt, thin flakes split off their faces, and the grain of the break. From the model: a tangent normal map, a
// map of occlusion, of what meets the gale and of tone, a map of which slab a texel is on, and the coarse relief the mesh is displaced by.
// Run from the repo's root: npx vite-node assets-src/spine/land/bake-hero.mts [width height]
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { FIN_ROOT } from '../../../src/places/spine/ridge';
import { HERO_DOWN, HERO_LEAN, HERO_UP, HERO_V, HERO_Y, hero, heroAcross, heroRingT, heroSection, heroYOf, plateAt, sectionArcs, sectionAt } from '../../../src/places/spine/land/heroShape';

const W = Number(process.argv[2] ?? 4096);
const H = Number(process.argv[3] ?? 2048);
const OUT = 'public/assets/spine/land';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash2 = (x: number, y: number): number => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
function vn(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return (hash2(xi, yi) * (1 - u) + hash2(xi + 1, yi) * u) * (1 - v) + (hash2(xi, yi + 1) * (1 - u) + hash2(xi + 1, yi + 1) * u) * v;
}

interface Flake {
  s0: number;
  s1: number;
  y0: number;
  y1: number;
  th: number;
  ss: number;
  st: number;
  sb: number;
}
interface Slab {
  h: number;
  tx: number;
  ty: number;
  mid: number;
  ym: number;
  sL: number;
  sR: number;
  st: number;
  sb: number;
  tone: number;
  id: number;
  flakes: Flake[];
}
interface Plate {
  b0: number;
  b1: number;
  cuts: number[];
  dips: number[];
  slabs: Slab[];
}

// The plates: strips along the lean, 3 to 30 m broad and of no two breadths, from far round one face over the lee edge to far round the other.
const R = rng(7015);
const SPAN = 640;
const plates: Plate[] = [];
const bounds: number[] = [-SPAN];
const backs: number[] = [];
const phases: number[] = [R() * 6.28];
{
  let s = -SPAN;
  let id = 1;
  while (s < SPAN) {
    // Mostly broad plates with a narrow one between here and there: never a row of equals.
    const r = R();
    const wide = r < 0.16 ? 3 + 3 * R() : r < 0.6 ? 10 + 14 * R() : 24 + 20 * R();
    const b0 = s;
    const b1 = s + wide;
    const cuts: number[] = [];
    const dips: number[] = [];
    let y = -420 - 160 * R();
    while (y < 420) {
      cuts.push(y);
      dips.push((R() - 0.5) * 1.1);
      // Cross joints are rare: a slab is 60 to 240 m long.
      y += 60 + 180 * R() * R() + 40 * R();
    }
    cuts.push(y);
    dips.push(0);
    const slabs: Slab[] = [];
    for (let j = 0; j < cuts.length - 1; j++) {
      const ym = 0.5 * ((cuts[j] as number) + (cuts[j + 1] as number));
      const mid = 0.5 * (b0 + b1);
      const flakes: Flake[] = [];
      const count = wide > 7 ? Math.floor(R() * 3.6) : 0;
      for (let f = 0; f < count; f++) {
        const fw = wide * (0.25 + 0.5 * R());
        const left = R() < 0.5;
        const long = 8 + 46 * R();
        const fy = (cuts[j] as number) + R() * Math.max(1, (cuts[j + 1] as number) - (cuts[j] as number) - long);
        flakes.push({ s0: left ? b0 - 0.5 : b1 - fw, s1: left ? b0 + fw : b1 + 0.5, y0: fy, y1: fy + long, th: 0.22 + 0.75 * R() * R(), ss: 2 + 3 * R(), st: 0.8 + 1.4 * R(), sb: 3 + 4 * R() });
      }
      slabs.push({
        // Groups of plates stand out together as buttresses; within a group each has its own stand.
        // (A narrow plate stands with its neighbours: on its own it would be a trench or a fin.)
        h: 4.4 * (vn(mid / 55 + 3.3, ym / 150 + 1.7) - 0.5) + (R() - 0.42) * (wide < 9 ? 0.7 : 3.2),
        // No two slabs face the same way: each is turned some degrees about the lean, so one takes the light and the next is in shade.
        tx: (R() - 0.5) * 2 * Math.min(0.42, 4.5 / wide),
        ty: (R() - 0.5) * 0.1,
        mid,
        ym,
        sL: 2.5 + 4.5 * R(),
        sR: 2.5 + 4.5 * R(),
        st: 0.7 + 1.5 * R(),
        sb: 4 + 5 * R(),
        // Whole companies of slabs are of one rock: grey here, split and tan there.
        tone: Math.min(1, Math.max(0, 0.5 + 1.7 * (vn(mid / 75 + 8.1, ym / 170 + 2.9) - 0.5) + 0.3 * (R() - 0.5))),
        id: 1 + ((id * 37) % 254),
        flakes,
      });
      id++;
    }
    plates.push({ b0, b1, cuts, dips, slabs });
    // Where a plate comes to the windward edge of the blade it has broken off short: by a stride or two, or by a whole block.
    backs.push(R() < 0.5 ? 2.5 * R() : 4 + 12 * R());
    bounds.push(b1);
    phases.push(R() * 6.28);
    s = b1;
  }
}
const edgeAt = (k: number, y: number): number => (bounds[k] as number) + 0.8 * Math.sin(y / 41 + (phases[k] as number)) + 0.35 * Math.sin(y / 13 + 2.3 * (phases[k] as number));

let winTone = 0;
let winId = 0;
/** The rock's height out of the blade's body at s metres round from the lee edge and y metres over the foot. */
function rock(s: number, y: number, fine: boolean): number {
  let lo = 0;
  let hi = plates.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if ((bounds[m] as number) <= s) lo = m;
    else hi = m - 1;
  }
  let best = -40;
  let groove = 0;
  for (let k = Math.max(0, lo - 1); k <= Math.min(plates.length - 1, lo + 1); k++) {
    const p = plates[k] as Plate;
    const bl = edgeAt(k, y);
    const br = edgeAt(k + 1, y);
    // A hairline joint between two plates, open only along parts of its length.
    const open = vn(y / 23 + k * 7.1, k * 3.7);
    if (open > 0.5) groove = Math.max(groove, (open - 0.5) * 1.5 * Math.max(0, 1 - Math.abs(s - bl) / 0.3));
    const outL = Math.max(0, bl - s);
    const outR = Math.max(0, s - br);
    let j = 0;
    while (j < p.slabs.length - 1 && (p.cuts[j + 1] as number) + (p.dips[j + 1] as number) * (s - (p.b0 + p.b1) * 0.5) < y) j++;
    for (let i = Math.max(0, j - 1); i <= Math.min(p.slabs.length - 1, j + 1); i++) {
      const q = p.slabs[i] as Slab;
      const yb = (p.cuts[i] as number) + (p.dips[i] as number) * (s - q.mid);
      const yt = (p.cuts[i + 1] as number) + (p.dips[i + 1] as number) * (s - q.mid);
      const outer = q.h + q.tx * (s - q.mid) + q.ty * (y - q.ym);
      const v = outer - q.sL * outL - q.sR * outR - q.st * Math.max(0, y - yt) - q.sb * Math.max(0, yb - y);
      if (v > best) {
        best = v;
        winTone = q.tone;
        winId = q.id;
      }
      for (const f of q.flakes) {
        const fv = outer + f.th - f.ss * (Math.max(0, f.s0 - s) + Math.max(0, s - f.s1)) - f.st * Math.max(0, y - f.y1) - f.sb * Math.max(0, f.y0 - y);
        if (fv > best) {
          best = fv;
          winTone = (q.tone + 0.13) % 1;
          winId = q.id;
        }
      }
    }
  }
  let v = best - groove;
  // Each slab is split again into strips of a stride or two, each standing a hand or two out of the next, stepped down their length:
  // the faces a block has broken off along, which hold the frost and the snow.
  const strip = Math.floor(s / 2.3 + 0.6 * vn(y / 17 + winId * 1.3, winId * 0.7));
  const k1 = hash2(strip, winId + 7) < 0.45 ? strip - 1 : strip;
  const k2 = hash2(k1, winId + 7) < 0.3 ? k1 - 1 : k1;
  const rung = Math.floor(y / (5 + 14 * hash2(k2, winId + 3)) + 9 * hash2(k2, winId + 5) + 0.4 * (s / 2.3 - strip));
  v += 0.8 * (hash2(k2, winId) - 0.5) + 0.5 * (hash2(rung, k2 * 31 + winId) - 0.5) * (hash2(rung + 5, k2 + winId) < 0.6 ? 1 : 0.2);
  // No face of a slab is a plane: it swells, and the break has a grain that runs along the plate.
  v += 0.5 * (vn(s / 9 + 1.3, y / 31 + 4.4) - 0.5);
  if (fine) v += 0.16 * (vn(s / 1.9 + 9.1, y / 3.1 + 2.2) - 0.5) + 0.06 * (1 - Math.abs(2 * vn(s / 0.6 + 5.5, y / 0.8 + 7.7) - 1));
  return v;
}

// Where the mesh has the face, ring by ring: between two rings its face is straight, and the rock is laid on that.
const RINGS = HERO_DOWN + HERO_UP + 1;
const ringY = new Float32Array(RINGS);
const ringL = new Float32Array(RINGS * W);
for (let k = 0; k < RINGS; k++) {
  const y = -FIN_ROOT + (hero.tip + FIN_ROOT) * heroRingT(hero, k);
  ringY[k] = y;
  const sec = heroSection(hero, y);
  const short = backs[plateAt(bounds, sec.centre - sec.half, y)] as number;
  for (let c = 0; c < W; c++) ringL[k * W + c] = heroAcross(hero, (c + 0.5) / W, y, short);
}
const height = new Float32Array(W * H);
const normal = Buffer.alloc(W * H * 3);
const mat = Buffer.alloc(W * H * 3);
const ids = Buffer.alloc(W * H);
const catchOf = new Float32Array(W * H);
const rowStep = new Float32Array(H);
const colStep = new Float32Array(H);
const E = 0.05;
const t0 = Date.now();
for (let r = 0; r < H; r++) {
  const y = heroYOf(1 - (r + 0.5) / H);
  const sec = heroSection(hero, y);
  const arcs = sectionArcs(W, sec.half, sec.thickBack, sec.thickFront);
  let ring = 0;
  while (ring < RINGS - 2 && (ringY[ring + 1] as number) <= y) ring++;
  const part = Math.min(1, Math.max(0, (y - (ringY[ring] as number)) / ((ringY[ring + 1] as number) - (ringY[ring] as number))));
  rowStep[r] = Math.abs(heroYOf(1 - (r + 1.5) / H) - y) || 0.2;
  colStep[r] = ((arcs[W >> 1] as number) - (arcs[(W >> 1) + 1] as number)) / W;
  for (let c = 0; c < W; c++) {
    // The plates are planes that cut the whole blade along its lean: where a texel is on them is how far across the blade it is, less the lean.
    const q = (c + 0.5) / W;
    const fore = sectionAt(q + 0.25 / W, sec.half, sec.thickBack, sec.thickFront);
    const back = sectionAt(q - 0.25 / W, sec.half, sec.thickBack, sec.thickFront);
    // How far across the blade a metre along its face goes, away from the lee edge.
    const turn = ((c < W >> 1 ? 1 : -1) * (fore[0] - back[0])) / (Math.hypot(fore[0] - back[0], fore[1] - back[1]) || 1);
    const s = (ringL[ring * W + c] as number) * (1 - part) + (ringL[(ring + 1) * W + c] as number) * part + HERO_LEAN * y;
    const h0 = rock(s, y, true);
    const tone = winTone;
    const id = winId;
    const hs = (rock(s + E, y, true) - h0) / E;
    const hy = (rock(s, y + E, true) - h0) / E;
    const nx = -hs * turn;
    const ny = -(hy + HERO_LEAN * hs);
    const len = Math.hypot(nx, ny, 1);
    const i = r * W + c;
    height[i] = h0;
    // What stands out of its neighbour to windward meets the gale and takes its rime, thickest at the edge.
    let meets = 0;
    for (const d of [0.5, 1.2, 2.6]) meets = Math.max(meets, ((h0 - rock(s - d, y, false)) / 0.4) * (1 - d / 3.6));
    catchOf[i] = Math.min(1, Math.max(0, meets));
    normal[i * 3] = Math.round(255 * (0.5 + (0.5 * nx) / len));
    normal[i * 3 + 1] = Math.round(255 * (0.5 + (0.5 * ny) / len));
    normal[i * 3 + 2] = Math.round(255 * (0.5 + 0.5 / len));
    mat[i * 3 + 2] = Math.round(255 * tone);
    ids[i] = id;
  }
}
console.log(`model: ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// Occlusion: how far a texel lies under the mean of the rock about it, at three sizes.
const blur = (radius: number): Float32Array => {
  const a = new Float32Array(W * H);
  const sum = new Float64Array(Math.max(W, H) + 1);
  for (let r = 0; r < H; r++) {
    const n = Math.min(W >> 3, Math.max(1, Math.round(radius / (colStep[r] as number))));
    sum[0] = 0;
    for (let c = 0; c < W; c++) sum[c + 1] = (sum[c] as number) + (height[r * W + c] as number);
    for (let c = 0; c < W; c++) {
      const lo = Math.max(0, c - n);
      const hi = Math.min(W, c + n + 1);
      a[r * W + c] = ((sum[hi] as number) - (sum[lo] as number)) / (hi - lo);
    }
  }
  const b = new Float32Array(W * H);
  for (let c = 0; c < W; c++) {
    sum[0] = 0;
    for (let r = 0; r < H; r++) sum[r + 1] = (sum[r] as number) + (a[r * W + c] as number);
    for (let r = 0; r < H; r++) {
      const n = Math.min(H >> 3, Math.max(1, Math.round(radius / (rowStep[r] as number))));
      const lo = Math.max(0, r - n);
      const hi = Math.min(H, r + n + 1);
      b[r * W + c] = ((sum[hi] as number) - (sum[lo] as number)) / (hi - lo);
    }
  }
  return b;
};
const occ = new Float32Array(W * H).fill(1);
for (const [radius, weight] of [
  [0.6, 0.55],
  [2.5, 0.5],
  [9, 0.4],
] as const) {
  const b = blur(radius);
  for (let i = 0; i < W * H; i++) occ[i] = (occ[i] as number) * (1 - weight * Math.min(1, Math.max(0, ((b[i] as number) - (height[i] as number)) / (0.45 * radius))));
}
const RELIEF_MIN = -9;
const RELIEF_SPAN = 18;
for (let i = 0; i < W * H; i++) {
  mat[i * 3] = Math.round(255 * (occ[i] as number));
  mat[i * 3 + 1] = Math.round(255 * (catchOf[i] as number));
}

// The mesh's relief: the mean height on a coarse grid.
const GC = 512;
const GR = 384;
const grid = Buffer.alloc(GC * GR);
const coarse = new Float32Array(GC * GR);
for (let j = 0; j < GR; j++) {
  for (let i = 0; i < GC; i++) {
    let sum = 0;
    let n = 0;
    for (let r = Math.floor((j * H) / GR); r < Math.floor(((j + 1) * H) / GR); r++) {
      for (let c = Math.floor((i * W) / GC); c < Math.floor(((i + 1) * W) / GC); c++) {
        sum += height[r * W + c] as number;
        n++;
      }
    }
    coarse[j * GC + i] = sum / n;
  }
}
// (A mesh of half a metre cannot stand a slab's side up as a wall without teeth: the side is a ramp of three of its quads.)
for (let j = 0; j < GR; j++) {
  for (let i = 0; i < GC; i++) {
    let sum = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) sum += coarse[Math.min(GR - 1, Math.max(0, j + dj)) * GC + ((i + di + GC) % GC)] as number;
    grid[j * GC + i] = Math.round(255 * Math.min(1, Math.max(0, (sum / 9 - RELIEF_MIN) / RELIEF_SPAN)));
  }
}
writeFileSync(
  'src/places/spine/land/heroRelief.ts',
  `// Made by assets-src/spine/land/bake-hero.mts. Do not edit by hand.\n// The relief of the first spire's rock on a grid of cols (round the blade) by rows (down from the tip, by the maps' v), a byte each, base64.\nexport const HERO_RELIEF = { cols: ${GC}, rows: ${GR}, min: ${RELIEF_MIN}, span: ${RELIEF_SPAN}, data: '${grid.toString('base64')}' };\n// The plates of its rock: where each begins across the blade (less the lean), metres, and how far short of the windward edge each has broken off.\nexport const HERO_PLATES = { from: [${bounds.map((b) => b.toFixed(2)).join(', ')}], back: [${backs.map((b) => b.toFixed(2)).join(', ')}] };\n`,
);
await sharp(normal, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 86, chromaSubsampling: '4:4:4' }).toFile(`${OUT}/hero-n.jpg`);
await sharp(mat, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 82, chromaSubsampling: '4:4:4' }).toFile(`${OUT}/hero-m.jpg`);
await sharp(ids, { raw: { width: W, height: H, channels: 1 } }).png({ compressionLevel: 9 }).toFile(`${OUT}/hero-id.png`);
console.log(`baked ${W} x ${H}, ${plates.length} plates, rows ${HERO_Y.join(' ')} at ${HERO_V.join(' ')}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
