// Bakes the small rock of the first spire. The plates and slabs of its fracture model (src/places/spine/land/heroRock.ts) are in its mesh:
// their faces, their steps and the walls between them. Baked here, on the plates' own coordinates (across the plates, and up the blade),
// is what the mesh is too coarse for: the thin flakes split off a slab's face, hairline joints and
// the grain of the break, as a tangent normal map; and a map of occlusion (the slabs' steps included), of what meets the gale, and of tone.
// Both faces of the blade are cut by the same planes, so both read the same maps.
// Run from the repo's root: npx vite-node assets-src/spine/land/bake-hero.mts [width height]
import sharp from 'sharp';
import { HERO_P, PLATES, plateEdge, plateOf, slabOf, slabStand, stripOf, stripStand, vn, type Plate, type Slab, type Strip } from '../../../src/places/spine/land/heroRock';
import { HERO_V, HERO_Y, heroYOf } from '../../../src/places/spine/land/heroShape';

const W = Number(process.argv[2] ?? 4096);
const H = Number(process.argv[3] ?? 2048);
const OUT = 'public/assets/spine/land';

let winTone = 0;
/** What stands on a slab's own face at a place: metres over the face. */
function small(k: number, q: Slab, p: number, y: number, fine: boolean): number {
  let v = 0;
  winTone = q.tone;
  for (const f of q.flakes) {
    const fv = f.th - 3 * (Math.max(0, f.p0 - p) + Math.max(0, p - f.p1)) - 1.2 * Math.max(0, y - f.y1) - 4 * Math.max(0, f.y0 - y);
    if (fv > v) {
      v = fv;
      winTone = (q.tone + 0.13) % 1;
    }
  }
  // A hairline joint beside the plate's edge, open only along parts of its length.
  const open = vn(y / 23 + k * 7.1, k * 3.7);
  if (open > 0.5) v -= (open - 0.5) * 1.2 * Math.max(0, 1 - Math.abs(p - plateEdge(k, y) - 0.5) / 0.3);
  // No face of a slab is a plane: it swells, and the break has a grain that runs along the plate.
  v += 0.5 * (vn(p / 9 + 1.3, y / 31 + 4.4) - 0.5);
  if (fine) v += 0.16 * (vn(p / 1.9 + 9.1, y / 3.1 + 2.2) - 0.5) + 0.06 * (1 - Math.abs(2 * vn(p / 0.6 + 5.5, y / 0.8 + 7.7) - 1));
  return v;
}

const height = new Float32Array(W * H);
const normal = Buffer.alloc(W * H * 3);
const mat = Buffer.alloc(W * H * 3);
const rowStep = new Float32Array(H);
const COL = (HERO_P[1] - HERO_P[0]) / W;
const E = 0.05;
const t0 = Date.now();
for (let r = 0; r < H; r++) {
  const y = heroYOf(1 - (r + 0.5) / H);
  rowStep[r] = Math.abs(heroYOf(1 - (r + 1.5) / H) - y) || 0.2;
  for (let c = 0; c < W; c++) {
    const p = HERO_P[0] + (c + 0.5) * COL;
    const k = plateOf(p, y);
    const q = (PLATES[k] as Plate).slabs[slabOf(k, p, y)] as Slab;
    const h0 = small(k, q, p, y, true);
    const tone = winTone;
    const hp = (small(k, q, p + E, y, true) - h0) / E;
    const hy = (small(k, q, p, y + E, true) - h0) / E;
    // (Across the blade at one height, and up it at one place across: a metre up is the lean's share of a metre along the plates.)
    const nx = -hp;
    const ny = -(hy + 0.85 * hp);
    const len = Math.hypot(nx, ny, 1);
    const i = r * W + c;
    height[i] = slabStand(q, p, y) + stripStand(PLATES[k] as Plate, (PLATES[k] as Plate).strips[stripOf(k, p, y)] as Strip, p, y) + h0;
    normal[i * 3] = Math.round(255 * (0.5 + (0.5 * nx) / len));
    normal[i * 3 + 1] = Math.round(255 * (0.5 + (0.5 * ny) / len));
    normal[i * 3 + 2] = Math.round(255 * (0.5 + 0.5 / len));
    mat[i * 3 + 2] = Math.round(255 * tone);
  }
}
console.log(`model: ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// What stands out of its neighbour to windward meets the gale and takes its rime, thickest at the edge.
for (let r = 0; r < H; r++) {
  for (let c = 0; c < W; c++) {
    let meets = 0;
    for (const d of [0.4, 1.2, 2.6]) {
      const n = Math.max(1, Math.round(d / COL));
      meets = Math.max(meets, (((height[r * W + c] as number) - (height[r * W + Math.max(0, c - n)] as number)) / 0.5) * (1 - d / 3.6));
    }
    mat[(r * W + c) * 3 + 1] = Math.round(255 * Math.min(1, Math.max(0, meets)));
  }
}

// Occlusion: how far a texel lies under the mean of the rock about it, at four sizes.
const blur = (radius: number): Float32Array => {
  const a = new Float32Array(W * H);
  const sum = new Float64Array(Math.max(W, H) + 1);
  const n = Math.max(1, Math.round(radius / COL));
  for (let r = 0; r < H; r++) {
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
      const m = Math.min(H >> 3, Math.max(1, Math.round(radius / (rowStep[r] as number))));
      const lo = Math.max(0, r - m);
      const hi = Math.min(H, r + m + 1);
      b[r * W + c] = ((sum[hi] as number) - (sum[lo] as number)) / (hi - lo);
    }
  }
  return b;
};
const occ = new Float32Array(W * H).fill(1);
for (const [radius, weight] of [
  [0.6, 0.5],
  [2.2, 0.55],
  [7, 0.5],
  [20, 0.35],
] as const) {
  const b = blur(radius);
  for (let i = 0; i < W * H; i++) occ[i] = (occ[i] as number) * (1 - weight * Math.min(1, Math.max(0, ((b[i] as number) - (height[i] as number)) / (0.4 * radius + 0.3))));
}
for (let i = 0; i < W * H; i++) mat[i * 3] = Math.round(255 * (occ[i] as number));
await sharp(normal, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 86, chromaSubsampling: '4:4:4' }).toFile(`${OUT}/hero-n.jpg`);
await sharp(mat, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 84, chromaSubsampling: '4:4:4' }).toFile(`${OUT}/hero-m.jpg`);
console.log(`baked ${W} x ${H}, plates from ${HERO_P[0].toFixed(0)} to ${HERO_P[1].toFixed(0)} m (${(COL * 100).toFixed(0)} cm a texel), rows ${HERO_Y.join(' ')} at ${HERO_V.join(' ')}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
