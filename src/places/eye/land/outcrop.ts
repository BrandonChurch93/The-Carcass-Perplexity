// The broken ground of the spur under the wide camera: bedrock that has split into slabs along its joints, each slab tilted and worn at its
// edges, smaller breaks inside each, and rubble in the gaps and at their feet. It is one height field over the smooth ground of height.ts,
// worked out once: the fine mesh is raised by it and its lie, its shade and its kind (rock or rubble) are laid in one map for the shader.
// The camera's own way down the middle is kept low, and the stream keeps its bed.
import * as THREE from 'three';
import { smooth } from '../layout';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { vnoise } from '../shared/noise';
import { HEAPS, landHeight, onAxis, streamAcross } from './height';

/** The stretch of the spur that is broken ground, in the frame of the axis: metres out from the shore, metres to the right. */
export const CROP = { along0: 58, along1: 208, across0: -60, across1: 60 };
/** One texel of the map, metres. */
const TEXEL = 0.055;

function hash(ix: number, iy: number, k: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(k, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A lattice of cells, each with one site somewhere in it and three numbers of its own. Turned by `turn`, so that no joint runs with the axis. */
class Lattice {
  private readonly c: number;
  private readonly s: number;
  private readonly i0: number;
  private readonly j0: number;
  private readonly w: number;
  private readonly sx: Float32Array;
  private readonly sy: Float32Array;
  readonly a: Float32Array;
  readonly b: Float32Array;
  readonly d: Float32Array;
  /** Of the last `find`: distance to the nearest site and to the next, in metres, the index of the nearest, and the offset from it in metres. */
  f1 = 0;
  f2 = 0;
  id = 0;
  ox = 0;
  oy = 0;
  /** Of the last `find`: where the nearest site is, in the frame the place was given in. */
  px = 0;
  py = 0;

  constructor(
    private readonly cu: number,
    private readonly cv: number,
    turn: number,
    seed: number,
  ) {
    this.c = Math.cos(turn);
    this.s = Math.sin(turn);
    let u0 = Infinity;
    let u1 = -Infinity;
    let v0 = Infinity;
    let v1 = -Infinity;
    for (const [x, y] of [
      [CROP.along0 - 4, CROP.across0 - 4],
      [CROP.along1 + 4, CROP.across0 - 4],
      [CROP.along0 - 4, CROP.across1 + 4],
      [CROP.along1 + 4, CROP.across1 + 4],
    ] as [number, number][]) {
      const u = (x * this.c + y * this.s) / cu;
      const v = (-x * this.s + y * this.c) / cv;
      u0 = Math.min(u0, u);
      u1 = Math.max(u1, u);
      v0 = Math.min(v0, v);
      v1 = Math.max(v1, v);
    }
    this.i0 = Math.floor(u0) - 2;
    this.j0 = Math.floor(v0) - 2;
    this.w = Math.ceil(u1) + 2 - this.i0 + 1;
    const h = Math.ceil(v1) + 2 - this.j0 + 1;
    const n = this.w * h;
    this.sx = new Float32Array(n);
    this.sy = new Float32Array(n);
    this.a = new Float32Array(n);
    this.b = new Float32Array(n);
    this.d = new Float32Array(n);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < this.w; i++) {
        const k = j * this.w + i;
        const ix = i + this.i0;
        const iy = j + this.j0;
        this.sx[k] = ix + 0.5 + 0.84 * (hash(ix, iy, seed) - 0.5);
        this.sy[k] = iy + 0.5 + 0.84 * (hash(ix, iy, seed + 1) - 0.5);
        this.a[k] = hash(ix, iy, seed + 2);
        this.b[k] = hash(ix, iy, seed + 3);
        this.d[k] = hash(ix, iy, seed + 4);
      }
    }
  }

  find(x: number, y: number): void {
    const u = (x * this.c + y * this.s) / this.cu;
    const v = (-x * this.s + y * this.c) / this.cv;
    const ci = Math.floor(u) - this.i0;
    const cj = Math.floor(v) - this.j0;
    let f1 = 1e9;
    let f2 = 1e9;
    let id = 0;
    let ox = 0;
    let oy = 0;
    for (let dj = -1; dj <= 1; dj++) {
      const row = (cj + dj) * this.w + ci;
      for (let di = -1; di <= 1; di++) {
        const k = row + di;
        const ex = (u - (this.sx[k] as number)) * this.cu;
        const ey = (v - (this.sy[k] as number)) * this.cv;
        const dd = ex * ex + ey * ey;
        if (dd < f1) {
          f2 = f1;
          f1 = dd;
          id = k;
          ox = ex;
          oy = ey;
        } else if (dd < f2) f2 = dd;
      }
    }
    this.f1 = Math.sqrt(f1);
    this.f2 = Math.sqrt(f2);
    this.id = id;
    this.ox = ox;
    this.oy = oy;
    this.px = x - ox * this.c + oy * this.s;
    this.py = y - ox * this.s - oy * this.c;
  }
}

let slabs: Lattice | null = null;
let breaks: Lattice | null = null;
let scree: Lattice | null = null;
let rubble: Lattice | null = null;

/** Of the last `outcrop`: 1 on the top of a slab, 0 on rubble and grit. */
export const LAST = { rock: 0 };

/** How much of the ground at a place is standing rock: nothing down the camera's way and in the stream, most on the two shoulders. */
function bank(along: number, across: number): number {
  const edge = smooth(CROP.along0, CROP.along0 + 10, along) * smooth(CROP.along1, CROP.along1 - 8, along) * smooth(CROP.across0, CROP.across0 + 10, across) * smooth(CROP.across1, CROP.across1 - 10, across);
  if (edge <= 0) return 0;
  const side = smooth(1.6, 7, Math.abs(across + 0.8 * Math.sin(along / 7)));
  const patchy = 0.6 * vnoise(along / 17 + 3, across / 17 + 8) + 0.4 * vnoise(along / 6.1 + 1, across / 6.1 + 5);
  let b = side * (0.3 + 1.5 * smooth(0.25, 0.75, patchy)) * (0.4 + 0.6 * smooth(78, 112, along));
  // The heaps at the corners of the wide picture are the thickest of it.
  for (const [a, c, wide] of HEAPS) {
    const d = Math.hypot(along - a, across - c) / (wide * 1.6);
    if (d < 2.5) b += 0.9 * Math.exp(-d * d) * side;
  }
  const clear = smooth(1.2, 3.2, Math.abs(across - streamAcross(along)));
  return Math.min(1.4, b) * edge * clear;
}

// The smooth ground of height.ts under the broken ground, on a grid of half a metre: what the slabs are cut from.
const GRID = 0.5;
let base: Float32Array | null = null;
let baseWide = 0;
function baseAt(along: number, across: number): number {
  if (!base) {
    baseWide = Math.ceil((CROP.along1 - CROP.along0) / GRID) + 1;
    const tall = Math.ceil((CROP.across1 - CROP.across0) / GRID) + 1;
    base = new Float32Array(baseWide * tall);
    for (let j = 0; j < tall; j++) {
      for (let i = 0; i < baseWide; i++) {
        const [x, z] = onAxis(CROP.along0 + i * GRID, CROP.across0 + j * GRID);
        base[j * baseWide + i] = landHeight(x, z);
      }
    }
  }
  const u = Math.min(Math.max((along - CROP.along0) / GRID, 0), baseWide - 1.001);
  const v = Math.min(Math.max((across - CROP.across0) / GRID, 0), base.length / baseWide - 1.001);
  const i = Math.floor(u);
  const j = Math.floor(v);
  const k = j * baseWide + i;
  const fu = u - i;
  const fv = v - j;
  return ((base[k] as number) * (1 - fu) + (base[k + 1] as number) * fu) * (1 - fv) + ((base[k + baseWide] as number) * (1 - fu) + (base[k + baseWide + 1] as number) * fu) * fv;
}

/** Metres of broken rock over the smooth ground at a place of the axis frame. */
export function outcropAt(along: number, across: number): number {
  LAST.rock = 0;
  if (along <= CROP.along0 || along >= CROP.along1 || across <= CROP.across0 || across >= CROP.across1) return 0;
  if (!slabs) {
    slabs = new Lattice(5.6, 3.7, 0.47, 11);
    breaks = new Lattice(1.5, 1.05, -0.31, 23);
    scree = new Lattice(1.3, 1.1, 0.83, 51);
    rubble = new Lattice(0.42, 0.42, 0.2, 37);
  }
  const S = slabs as Lattice;
  const B = breaks as Lattice;
  const R = rubble as Lattice;
  const C = scree as Lattice;
  const amount = bank(along, across);
  const edge = smooth(CROP.along0, CROP.along0 + 6, along) * smooth(CROP.along1, CROP.along1 - 6, along) * smooth(CROP.across0, CROP.across0 + 6, across) * smooth(CROP.across1, CROP.across1 - 6, across);
  const clear = smooth(1.5, 3.4, Math.abs(across - streamAcross(along)));
  // The joints are not straight: the ground is pulled about before it is cut.
  const wx = along + 1.5 * (vnoise(along / 4.7 + 9, across / 4.7 + 2) - 0.5) + 0.35 * (vnoise(along / 0.9, across / 0.9 + 4) - 0.5);
  const wy = across + 1.5 * (vnoise(along / 4.7 + 31, across / 4.7 + 17) - 0.5) + 0.35 * (vnoise(along / 0.9 + 13, across / 0.9) - 0.5);

  let h = 0;
  let rock = 0;
  // How nearly a place is the standing face of a slab. The map lies flat and sees such a face edge on: whatever is laid on it there
  // would be drawn out down the face in streaks, so a face carries nothing but its own sweep.
  let face = 0;
  S.find(wx, wy);
  const key = S.a[S.id] as number;
  // Where the ground is steep no rubble lies on it: it is bedrock there whatever else.
  const here = baseAt(along, across);
  const steep = Math.hypot(baseAt(along + 1, across) - baseAt(along - 1, across), baseAt(along, across + 1) - baseAt(along, across - 1)) / 2;
  if (key < 0.22 + 0.62 * Math.min(1, amount) + 0.7 * smooth(0.5, 0.95, steep) * edge) {
    const tall = (0.18 + 1.05 * (S.b[S.id] as number) ** 1.6) * (0.2 + 0.8 * Math.max(amount, smooth(0.5, 0.95, steep)));
    const lean = 0.2 * Math.min(1, 0.3 + amount);
    // A slab is a bed of the rock: its top lies nearly level at the height the ground has at its middle, so that a slope of them is
    // a flight of ledges and a mound of them stands in blocks.
    const ledge = Math.max(-2.4, Math.min(2.4, 0.8 * (baseAt(S.px, S.py) - here)));
    const top = tall + ledge + lean * (((S.d[S.id] as number) - 0.5) * S.ox + (key * 4.5 - Math.floor(key * 4.5) - 0.5) * S.oy);
    // Worn round at its edge: a quarter turn from its top down to the joint, and the higher the face the further it leans back.
    const bevel = 0.35 + 0.8 * tall + 0.75 * Math.abs(ledge);
    const r = Math.min(1, (S.f2 - S.f1) / bevel);
    // No face stands upright: a height field cuts an upright face into a saw's teeth, one to each cell of its mesh.
    const shape = r * (2 - r);
    h = top * shape;
    rock = smooth(0.0, 0.5, r);
    face = smooth(0.45, 1.1, (2 * Math.abs(top) * (1 - r)) / bevel);
    const flat = 1 - face;
    // It is broken again inside itself: each piece stands a little higher or lower than the next, a thin crack between.
    B.find(wx, wy);
    const gap = B.f2 - B.f1;
    const piece = ((B.a[B.id] as number) - 0.5) * 0.3 * Math.min(1, tall * 1.4);
    h += flat * shape * (piece * smooth(0, 0.12, gap) - 0.09 * Math.min(1, tall * 2) * (1 - smooth(0, 0.05, gap)));
    // Its top is not planed: it dips and rises by a few fingers.
    h += flat * shape * 0.07 * (vnoise(along / 0.33 + 5, across / 0.33) - 0.5) * Math.min(1, tall * 2);
    if (h < -2.4) h = -2.4;
  }
  const drift = 0.6 * vnoise(along / 5.3 + 7, across / 5.3 + 2) + 0.4 * vnoise(along / 1.9, across / 1.9 + 9);
  // Scree: broken stone that has come down off the slabs, graded as a slope grades it. Coarse high on the spur and at the feet of the
  // outcrop, from a head to a barrel; finer toward the water, where it gives out into grit.
  C.find(wx, wy);
  const grade = smooth(60, 138, along);
  const heaped = 0.6 * vnoise(along / 11 + 21, across / 11 + 4) + 0.4 * vnoise(along / 3.1 + 2, across / 3.1 + 15);
  if (h < 0.15 && face < 0.2 && (C.a[C.id] as number) < 0.12 + 0.5 * grade + 0.45 * smooth(0.4, 0.7, heaped) + 0.2 * Math.min(1, amount)) {
    const size = (0.14 + 0.44 * (C.b[C.id] as number) ** 1.7) * (0.4 + 0.75 * grade);
    const d = C.f1 / size;
    if (d < 1) {
      // A broken stone has a top and sides, not a dome: its top leans its own way.
      const top = size * (0.55 + 0.5 * (C.d[C.id] as number)) * (1 + (0.9 * ((C.d[C.id] as number) - 0.5) * C.ox + 0.9 * ((C.b[C.id] as number) - 0.5) * C.oy) / size);
      const lump = Math.max(0, top) * Math.min(1, (1 - d) / 0.32);
      if (lump > h) {
        h = lump;
        rock = Math.max(rock, smooth(0, 0.25, 1 - d));
      }
    }
  }
  // Rubble: stones from a fist to a head, thick against the feet of the slabs and in drifts between, none on a high top.
  R.find(wx, wy);
  const low = 1 - smooth(0.08, 0.5, h);
  const many = 0.12 + 0.55 * smooth(0.35, 0.7, drift) + 0.3 * Math.min(1, amount);
  if (low > 0 && face < 0.2 && (R.a[R.id] as number) < many) {
    const size = 0.07 + 0.17 * (R.b[R.id] as number) ** 2;
    const d = R.f1 / size;
    if (d < 1) h += low * size * 0.8 * Math.sqrt(1 - d * d);
  }
  LAST.rock = rock * edge * clear;
  return h * edge * clear;
}

/** The same at a place of the world. */
export function outcrop(x: number, z: number, axisOf: (x: number, z: number) => [number, number]): number {
  const [along, across] = axisOf(x, z);
  return outcropAt(along, across);
}

export interface Crop {
  geometry: THREE.BufferGeometry;
  /** r, g: the fall of the relief along and across the axis, as the sine of its angle; b: how much of the sky a place sees; a: rock or rubble. */
  map: THREE.DataTexture;
  /** along0, across0, one over its length, one over its width. */
  rect: THREE.Vector4;
}

/** The fine mesh of the broken ground and its map. */
export function cropGround(): Crop {
  // The map.
  const W = Math.round((CROP.along1 - CROP.along0) / TEXEL);
  const H = Math.round((CROP.across1 - CROP.across0) / TEXEL);
  const high = new Float32Array(W * H);
  const data = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    const across = CROP.across0 + (j + 0.5) * TEXEL;
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      high[k] = outcropAt(CROP.along0 + (i + 0.5) * TEXEL, across);
      data[k * 4 + 3] = Math.round(255 * LAST.rock);
    }
  }
  // How much of the sky each place sees: the ground about it, taken wide and taken close, stands over it or does not.
  const wide = blurred(high, W, H, Math.round(0.55 / TEXEL));
  const close = blurred(high, W, H, Math.round(0.14 / TEXEL));
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(W - 1, i + 1);
      const j0 = Math.max(0, j - 1);
      const j1 = Math.min(H - 1, j + 1);
      const gx = ((high[j * W + i1] as number) - (high[j * W + i0] as number)) / ((i1 - i0) * TEXEL);
      const gy = ((high[j1 * W + i] as number) - (high[j0 * W + i] as number)) / ((j1 - j0) * TEXEL);
      data[k * 4] = Math.round(127.5 + 127.5 * (gx / Math.sqrt(1 + gx * gx)));
      data[k * 4 + 1] = Math.round(127.5 + 127.5 * (gy / Math.sqrt(1 + gy * gy)));
      const h = high[k] as number;
      const under = Math.max(0, (wide[k] as number) - h) / 0.45 + 1.4 * Math.max(0, (close[k] as number) - h) / 0.12;
      data[k * 4 + 2] = Math.round(255 * Math.max(0.12, 1 - Math.min(1, under)));
    }
  }
  const map = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.generateMipmaps = true;
  map.anisotropy = 8;
  map.needsUpdate = true;

  // The mesh: a hand's width a cell where the wide camera passes close, coarser out on the shoulders.
  const us: number[] = [];
  for (let a = CROP.along0; a < CROP.along1 + 1e-6; a += 0.16) us.push(a);
  const vs: number[] = [];
  const FINE = 27;
  for (let c = CROP.across0; c < -FINE - 1e-6; c += 0.45) vs.push(c);
  for (let c = -FINE; c < FINE - 1e-6; c += 0.13) vs.push(c);
  for (let c = FINE; c < CROP.across1 + 1e-6; c += 0.45) vs.push(c);
  const nu = us.length;
  const nv = vs.length;
  const base = new Float32Array(nu * nv);
  const lay = new Float32Array(nu * nv * 2);
  const positions = new Float32Array(nu * nv * 3);
  const normals = new Float32Array(nu * nv * 3);
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const along = us[i] as number;
      const across = vs[j] as number;
      const [x, z] = onAxis(along, across);
      const y = Math.max(-0.6, landHeight(x, z));
      const o = (j * nu + i) * 3;
      const rim = i === 0 || j === 0 || i === nu - 1 || j === nv - 1;
      base[j * nu + i] = y;
      positions[o] = x;
      positions[o + 1] = y + outcropAt(along, across) - (rim ? 7 : 0);
      positions[o + 2] = z;
      // Wet beside the stream, and how much standing rock the place has.
      lay[(j * nu + i) * 2] = smooth(4.2, 1.4, Math.abs(across - streamAcross(along)) + 1.2 * (vnoise(along / 1.7, across / 1.7) - 0.5));
      lay[(j * nu + i) * 2 + 1] = Math.min(1, bank(along, across));
    }
  }
  // The normal each corner carries is that of the smooth ground: the relief's own lie comes from the map, finer than the mesh.
  const [ox, oz] = onAxis(0, 0);
  const [ax, az] = onAxis(1, 0);
  const [bx, bz] = onAxis(0, 1);
  for (let j = 0; j < nv; j++) {
    const j0 = Math.max(0, j - 1);
    const j1 = Math.min(nv - 1, j + 1);
    for (let i = 0; i < nu; i++) {
      const i0 = Math.max(0, i - 1);
      const i1 = Math.min(nu - 1, i + 1);
      const du = ((base[j * nu + i1] as number) - (base[j * nu + i0] as number)) / ((us[i1] as number) - (us[i0] as number));
      const dv = ((base[j1 * nu + i] as number) - (base[j0 * nu + i] as number)) / ((vs[j1] as number) - (vs[j0] as number));
      const nx = -du * (ax - ox) - dv * (bx - ox);
      const nz = -du * (az - oz) - dv * (bz - oz);
      const l = Math.hypot(nx, 1, nz);
      const o = (j * nu + i) * 3;
      normals[o] = nx / l;
      normals[o + 1] = 1 / l;
      normals[o + 2] = nz / l;
    }
  }
  const index = new Uint32Array((nu - 1) * (nv - 1) * 6);
  let n = 0;
  for (let j = 0; j < nv - 1; j++) {
    for (let i = 0; i < nu - 1; i++) {
      const a = j * nu + i;
      const b = a + nu;
      index[n++] = a;
      index[n++] = a + 1;
      index[n++] = b;
      index[n++] = a + 1;
      index[n++] = b + 1;
      index[n++] = b;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('aLay', new THREE.BufferAttribute(lay, 2));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  return { geometry, map, rect: new THREE.Vector4(CROP.along0, CROP.across0, 1 / (CROP.along1 - CROP.along0), 1 / (CROP.across1 - CROP.across0)) };
}

/** The mean over a square of `reach` cells each way, by running sums. */
function blurred(src: Float32Array, W: number, H: number, reach: number): Float32Array {
  const mid = new Float32Array(W * H);
  const out = new Float32Array(W * H);
  const span = 2 * reach + 1;
  for (let j = 0; j < H; j++) {
    let sum = 0;
    const row = j * W;
    for (let i = -reach; i <= reach; i++) sum += src[row + Math.min(W - 1, Math.max(0, i))] as number;
    for (let i = 0; i < W; i++) {
      mid[row + i] = sum / span;
      sum += (src[row + Math.min(W - 1, i + reach + 1)] as number) - (src[row + Math.max(0, i - reach)] as number);
    }
  }
  for (let i = 0; i < W; i++) {
    let sum = 0;
    for (let j = -reach; j <= reach; j++) sum += mid[Math.min(H - 1, Math.max(0, j)) * W + i] as number;
    for (let j = 0; j < H; j++) {
      out[j * W + i] = sum / span;
      sum += (mid[Math.min(H - 1, j + reach + 1) * W + i] as number) - (mid[Math.max(0, j - reach) * W + i] as number);
    }
  }
  return out;
}

export const CROP_VERTEX = /* glsl */ `
attribute vec2 aLay;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vLay;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vLay = aLay;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const CROP_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vLay;
uniform sampler2D tCrop;
uniform vec4 uCropRect;
uniform vec4 uAxis;
uniform sampler2D tFace;
uniform sampler2D tFaceNh;
uniform sampler2D tGravel;
uniform sampler2D tGravelNh;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  // The lie of the ground across the screen is taken before any branch, and every sheet is read with it: see rock.ts.
  vec3 gx = dFdx(vWorld);
  vec3 gy = dFdy(vWorld);
  if (beyondNear(vWorld)) discard;
  vec3 p = vWorld;
  vec2 q = p.xz - uAxis.xy;
  vec2 right = vec2(uAxis.w, -uAxis.z);
  vec4 m = textureGrad(tCrop, (vec2(dot(q, uAxis.zw), dot(q, right)) - uCropRect.xy) * uCropRect.zw, vec2(dot(gx.xz, uAxis.zw), dot(gx.xz, right)) * uCropRect.zw, vec2(dot(gy.xz, uAxis.zw), dot(gy.xz, right)) * uCropRect.zw);
  vec2 s = m.xy * 2.0 - 1.0;
  vec2 g = s / sqrt(max(1.0 - s * s, 0.02));
  vec2 gw = uAxis.zw * g.x + right * g.y;
  vec3 nb = normalize(vNormal);
  vec3 n = normalize(vec3(nb.x / nb.y - gw.x, 1.0, nb.z / nb.y - gw.y));
  // A standing face is seen edge on by the map, which lies flat: its shade there is evened out.
  float ao = mix(m.b, 0.62, 0.7 * smoothstep(0.62, 0.3, n.y));
  float rock = m.a;
  vec3 v = normalize(cameraPosition - p);
  float away = length(cameraPosition - p);
  float close = 1.0 - smoothstep(18.0, 46.0, away);

  // The skin of the rock: the limestone sheet at its true size on the face the point looks out of most, and on a second where the rock turns.
  vec3 w = pow(abs(n), vec3(6.0));
  w /= w.x + w.y + w.z;
  w = max(w - 0.28, 0.0);
  w /= w.x + w.y + w.z;
  vec3 skin = vec3(0.0);
  vec3 lean = vec3(0.0);
  float high = 0.0;
  if (w.x > 0.0) {
    vec2 u = p.zy / 1.5;
    vec3 h = textureGrad(tFaceNh, u, gx.zy / 1.5, gy.zy / 1.5).rgb;
    skin += textureGrad(tFace, u, gx.zy / 1.5, gy.zy / 1.5).rgb * w.x;
    lean += vec3(0.0, h.g - 0.5, h.r - 0.5) * w.x;
    high += h.b * w.x;
  }
  if (w.y > 0.0) {
    vec2 u = vec2(p.x * 0.92 - p.z * 0.39, p.x * 0.39 + p.z * 0.92) / 1.5 + 0.37;
    vec2 ux = vec2(gx.x * 0.92 - gx.z * 0.39, gx.x * 0.39 + gx.z * 0.92) / 1.5;
    vec2 uy = vec2(gy.x * 0.92 - gy.z * 0.39, gy.x * 0.39 + gy.z * 0.92) / 1.5;
    vec3 h = textureGrad(tFaceNh, u, ux, uy).rgb;
    skin += textureGrad(tFace, u, ux, uy).rgb * w.y;
    vec2 l = h.rg - 0.5;
    lean += vec3(0.92 * l.x + 0.39 * l.y, 0.0, -0.39 * l.x + 0.92 * l.y) * w.y;
    high += h.b * w.y;
  }
  if (w.z > 0.0) {
    vec2 u = p.xy / 1.5 + 0.71;
    vec3 h = textureGrad(tFaceNh, u, gx.xy / 1.5, gy.xy / 1.5).rgb;
    skin += textureGrad(tFace, u, gx.xy / 1.5, gy.xy / 1.5).rgb * w.z;
    lean += vec3(h.r - 0.5, h.g - 0.5, 0.0) * w.z;
    high += h.b * w.z;
  }
  // The same sheet four times larger, turned: the mottle of a whole slab, so that the small sheet's repeat is not found.
  vec3 broad = textureGrad(tFace, vec2(p.x * 0.5 + p.z * 0.87, -p.x * 0.87 + p.z * 0.5) / 6.1 + p.y * 0.13, vec2(gx.x * 0.5 + gx.z * 0.87, -gx.x * 0.87 + gx.z * 0.5) / 6.1 + gx.y * 0.13, vec2(gy.x * 0.5 + gy.z * 0.87, -gy.x * 0.87 + gy.z * 0.5) / 6.1 + gy.y * 0.13).rgb / vec3(0.34, 0.33, 0.31);

  // Warm weathered limestone: buff and grey in fields of several metres, each stretch of its own tone, rust in the joints.
  float field = 0.6 * vnoise(p.xz / 3.7 + 11.0) + 0.4 * vnoise(p.xz / 1.3 + p.y * 0.7);
  vec3 stone = mix(vec3(0.46, 0.42, 0.36), vec3(0.76, 0.68, 0.55), smoothstep(0.2, 0.85, field));
  stone *= mix(vec3(1.0), skin / vec3(0.34, 0.33, 0.31), 0.8) * (0.55 + 0.45 * broad);
  // Beds show on a standing face as bands along its lie.
  float beds = vnoise(vec2(p.y * 9.0 + 0.8 * vnoise(p.xz / 2.1), dot(p.xz, vec2(0.21, 0.17))));
  stone *= mix(1.0, 0.72 + 0.5 * beds, smoothstep(0.75, 0.45, n.y));
  float stain = vnoise(p.xz * 0.9 + p.y * 0.6) * 0.6 + vnoise(p.zx * 2.7 + 5.0) * 0.4;
  stone = mix(stone, stone * vec3(1.0, 0.72, 0.46), 0.45 * smoothstep(0.55, 0.75, stain) * smoothstep(0.9, 0.5, ao));
  // What grows on old stone: pale and rusty crusts on the tops, a dark film where water stands in the creases.
  float lichen = vnoise(p.xz * 2.1 + p.y * 1.3 + 3.0);
  float patches = smoothstep(0.6, 0.74, lichen + 0.25 * (high - 0.5)) * smoothstep(0.55, 0.9, n.y) * smoothstep(0.6, 0.95, ao);
  stone = mix(stone, mix(vec3(0.6, 0.58, 0.5), vec3(0.46, 0.27, 0.1), step(0.62, fract(lichen * 9.0 + stain * 3.0))), 0.42 * patches);

  // Rubble and grit between: the gravel sheet at its true size, and again larger and turned.
  vec2 um = vec2(p.x * 0.8 - p.z * 0.6, p.x * 0.6 + p.z * 0.8) / 7.9 + 0.37;
  vec2 umx = vec2(gx.x * 0.8 - gx.z * 0.6, gx.x * 0.6 + gx.z * 0.8) / 7.9;
  vec2 umy = vec2(gy.x * 0.8 - gy.z * 0.6, gy.x * 0.6 + gy.z * 0.8) / 7.9;
  vec3 cm = textureGrad(tGravel, um, umx, umy).rgb;
  vec3 hm = textureGrad(tGravelNh, um, umx, umy).rgb;
  vec3 cf = vec3(0.32);
  vec3 hf = vec3(0.5);
  if (close > 0.0) {
    cf = textureGrad(tGravel, p.xz / 2.3, gx.xz / 2.3, gy.xz / 2.3).rgb;
    hf = textureGrad(tGravelNh, p.xz / 2.3, gx.xz / 2.3, gy.xz / 2.3).rgb;
  }
  float aged = 0.6 * vnoise(p.xz / 23.0 + 5.0) + 0.4 * vnoise(p.xz / 6.0);
  vec3 grit = cm * mix(vec3(1.0), cf / vec3(0.32), 0.7 * close) * mix(vec3(1.1, 1.04, 0.96), vec3(1.5, 1.36, 1.14), aged);
  // Fine dark soil lies where the stones leave room for it.
  float gh = mix(hm.b, hm.b * (0.5 + hf.b), 0.6 * close);
  grit *= mix(0.4, 1.0, smoothstep(0.15, 0.5, gh));
  vec2 gl = (hm.rg - 0.5) * 2.4;
  gl = vec2(0.8 * gl.x + 0.6 * gl.y, -0.6 * gl.x + 0.8 * gl.y) + (hf.rg - 0.5) * 2.6 * close;

  vec3 albedo = mix(grit, stone, rock);
  vec3 bent = mix(vec3(gl.x, 0.0, gl.y), lean * 1.5, rock);
  n = normalize(n + bent * (1.0 - smoothstep(120.0, 260.0, away)));
  float fine = mix(gh, high, rock);

  // Dirt in the creases, and low dry growth rooted in it: dark, a little olive, in tufts.
  float crease = smoothstep(0.75, 0.3, ao);
  albedo *= mix(1.0, 0.4, crease);
  float tuft = smoothstep(0.52, 0.7, 0.6 * vnoise(p.xz * 1.9 + 7.0) + 0.4 * vnoise(p.xz * 7.0)) * crease * smoothstep(0.3, 0.7, n.y);
  albedo = mix(albedo, vec3(0.085, 0.08, 0.04) * (0.6 + 0.8 * vnoise(p.xz * 37.0)), 0.75 * tuft);
  // By the stream the stone is wet and dark as high as the water throws.
  float damp = vLay.x * smoothstep(0.2, 0.6, 0.5 + 0.5 * (stain - 0.5) + vLay.x - 0.5);
  albedo *= mix(1.0, 0.45, damp);
  float occ = ao * (0.6 + 0.4 * smoothstep(0.1, 0.6, fine)) * mix(1.0, 0.55, smoothstep(0.7, 0.3, n.y) * (1.0 - ao * 0.5));
  vec3 c = rigShade(p, n, v, clamp(albedo, 0.0, 0.9), mix(0.92, 0.38, damp), occ);
  if (damp > 0.02) c += damp * 0.5 * rigGlint(p, n, v, 0.4);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
