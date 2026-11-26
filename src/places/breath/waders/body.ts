// The body of a wader as one skin: trunk, neck and four legs are one signed distance field (a smooth union of sections along the skeleton),
// meshed once at creation by surface nets, and every vertex is bound to at most three bones. The pose moves the bones; the skin follows.
// Rest frame: f along the spine toward the chest, u up, r to the animal's right, metres, origin at the middle of the trunk.

export interface Shape {
  /** Size: all lengths below are already in metres. */
  k: number;
  seed: number;
  bodyLen: number;
  hipFore: number;
  hipSide: number;
  legLen: number;
  /** Part of the leg above its middle joint. */
  knee: number;
  neckLen: number;
  neckR: number;
  /** How deep the chest is and how drawn up the belly, about 1: each animal has its own trunk. */
  chest: number;
  belly: number;
  /** The back: positive is a roach, negative a sway. */
  sway: number;
  /** How far the bones stand out of it: 1 is gaunt. */
  gaunt: number;
}

/** Bones: 0 the trunk; 1 to 4 the upper legs; 5 to 8 the lower legs; 9 to 12 the feet; 13 and on, the neck. */
export const NECK_BONES = 21;
export const BONES = 13 + NECK_BONES;
/** Where along the leg the fetlock is: below it the foot is a bone of its own. */
export const FETLOCK = 0.94;
/** The pitch of the neck at rest, radians above level. */
export const NECK_REST = (27 * Math.PI) / 180;
/** Legs in the order of the pose: left hind, left fore, right hind, right fore. */
export const LEG_SIDE = [-1, -1, 1, 1];
export const LEG_FORE = [-1, 1, -1, 1];

export interface Body {
  count: number;
  index: Uint32Array;
  /** Rest position and normal, (f, u, r). */
  rest: Float32Array;
  restN: Float32Array;
  /** Three bones a vertex, their weights, and the vertex and its normal in each bone's own rest frame. */
  bone: Uint8Array;
  weight: Float32Array;
  local: Float32Array;
  localN: Float32Array;
  /** How far along a leg (0 on the trunk, 1 at the ground), along the neck (0 on the trunk, 1 at its end), the phase of the ribs, how much of a rib cage is here, how hidden from the sky, the radius of the limb. */
  legT: Float32Array;
  neckU: Float32Array;
  ribS: Float32Array;
  cage: Float32Array;
  shade: Float32Array;
  radius: Float32Array;
  /** Where the vertex is in the side view picture of a wader (mat/wader.jpg): as part of the trunk (2), as part of the limb it is on (2), and how much it is of that limb (1). */
  pic: Float32Array;
}

const sat = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, x: number): number => {
  const t = sat((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hash = (n: number): number => {
  const s = Math.sin(n * 91.7 + 17.3) * 43758.5453;
  return s - Math.floor(s);
};
function curve(points: readonly (readonly [number, number])[], u: number): number {
  const first = points[0] as readonly [number, number];
  if (u <= first[0]) return first[1];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as readonly [number, number];
    const b = points[i] as readonly [number, number];
    if (u <= b[0]) {
      const t = (u - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t * t * (3 - 2 * t);
    }
  }
  return (points[points.length - 1] as readonly [number, number])[1];
}
const smin = (a: number, b: number, k: number): number => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const smax = (a: number, b: number, k: number): number => -smin(-a, -b, k);

// The trunk in side view, rump (0) to chest (1), for a size of 1: the line of the back, the line of the belly, the half width.
// A starved runner's: high bony rump, deep narrow chest, the belly drawn up hard to the hind legs.
const TOP: [number, number][] = [[0, 0.2], [0.1, 0.34], [0.26, 0.36], [0.5, 0.315], [0.75, 0.31], [0.9, 0.3], [1, 0.25]];
const BOTTOM: [number, number][] = [[0, 0.02], [0.1, -0.12], [0.3, -0.2], [0.5, -0.33], [0.72, -0.45], [0.9, -0.38], [1, -0.16]];
const WIDTH: [number, number][] = [[0, 0.09], [0.1, 0.2], [0.25, 0.24], [0.42, 0.21], [0.7, 0.255], [0.9, 0.2], [1, 0.14]];

// A leg from above the hip (t below 0, inside the trunk: the haunch on the pelvis, the blade on the ribs) to the ground (1):
// half thickness fore and aft, half thickness across, and how far the middle of the section stands aft (-) or fore (+) of the bone. For a leg whose joint is at 0.47.
const HIND_F: [number, number][] = [[-0.16, 0.07], [-0.06, 0.17], [0.05, 0.185], [0.16, 0.13], [0.3, 0.07], [0.41, 0.04], [0.47, 0.064], [0.53, 0.03], [0.7, 0.0235], [0.88, 0.025], [0.94, 0.037], [0.97, 0.03], [1, 0.05]];
const HIND_S: [number, number][] = [[-0.16, 0.035], [-0.06, 0.07], [0.05, 0.078], [0.16, 0.066], [0.3, 0.045], [0.41, 0.032], [0.47, 0.05], [0.53, 0.026], [0.7, 0.0225], [0.88, 0.024], [0.94, 0.034], [0.97, 0.027], [1, 0.038]];
const HIND_C: [number, number][] = [[-0.16, -0.05], [0.05, -0.035], [0.3, -0.006], [0.41, 0], [0.47, -0.02], [0.53, -0.004], [0.9, 0], [0.97, 0.008], [1, 0.022]];
const FORE_F: [number, number][] = [[-0.16, 0.07], [-0.06, 0.14], [0.05, 0.15], [0.16, 0.115], [0.3, 0.068], [0.41, 0.04], [0.47, 0.064], [0.53, 0.03], [0.7, 0.0235], [0.88, 0.025], [0.94, 0.037], [0.97, 0.03], [1, 0.05]];
const FORE_S: [number, number][] = [[-0.16, 0.035], [-0.06, 0.062], [0.05, 0.07], [0.16, 0.062], [0.3, 0.045], [0.41, 0.032], [0.47, 0.05], [0.53, 0.026], [0.7, 0.0225], [0.88, 0.024], [0.94, 0.034], [0.97, 0.027], [1, 0.038]];
const FORE_C: [number, number][] = [[-0.16, 0.02], [0.05, 0.01], [0.3, 0], [0.41, 0.004], [0.47, 0.016], [0.53, 0.004], [0.9, 0], [0.97, 0.008], [1, 0.022]];

// The side view picture of a wader (1536 x 1024, head to the right): the box of its trunk (left, top, right, bottom), the line of each leg
// (top inside the trunk, joint, hoof; hind far, hind near, fore far, fore near), half the width of a leg down its length, and the arc of
// the neck with half its width, all in pixels.
const PIC_TRUNK: [number, number, number, number] = [350, 112, 835, 368];
const PIC_LEGS: [number, number][][] = [
  [[405, 250], [320, 560], [296, 975]],
  [[515, 250], [482, 540], [498, 975]],
  [[700, 280], [649, 553], [637, 975]],
  [[748, 270], [756, 567], [795, 975]],
];
const PIC_LEG_HALF: [number, number][] = [[-0.1, 60], [0.1, 52], [0.3, 30], [0.41, 20], [0.47, 25], [0.53, 15], [0.85, 13], [0.94, 18], [1, 22]];
const PIC_NECK: [number, number, number][] = [[800, 255, 62], [905, 245, 44], [1000, 187, 32], [1080, 100, 26], [1133, 55, 22], [1172, 58, 20]];

/** The fields of one animal at rest. Each is a distance in metres, near enough for a surface and a blend. */
export class Fields {
  readonly L: number;
  readonly hips: [number, number, number][] = [];
  readonly neckBase: [number, number, number];
  /** How strongly each rib shows, by its number: none is like the next. */
  ribEach(phase: number): number {
    return 0.45 + 0.55 * hash(Math.round(phase) * 3.7 + this.s.seed);
  }
  readonly neckDir: [number, number, number] = [Math.cos(NECK_REST), Math.sin(NECK_REST), 0];
  readonly ribGap: number;
  private readonly kneeWarp: number;

  constructor(readonly s: Shape) {
    const k = s.k;
    this.L = s.bodyLen;
    for (let j = 0; j < 4; j++) this.hips.push([(LEG_FORE[j] as number) * s.hipFore, -0.02 * k, (LEG_SIDE[j] as number) * s.hipSide]);
    this.neckBase = [0.5 * s.bodyLen - 0.2 * k, 0.1 * k, 0];
    this.ribGap = 0.058 * k * (0.92 + 0.16 * hash(s.seed + 3));
    // The tables are drawn for a joint at 0.47 of the leg: an animal whose joint is elsewhere has them drawn out or in.
    this.kneeWarp = s.knee / 0.47;
  }

  top(t: number): number {
    const s = this.s;
    return (curve(TOP, t) + s.sway * 0.05 * Math.sin(Math.PI * sat((t - 0.2) / 0.7))) * s.k;
  }
  bottom(t: number): number {
    const s = this.s;
    const b = curve(BOTTOM, t);
    // The chest hangs deeper or the belly is drawn up more, each animal its own way.
    return (b * (1 + (s.chest - 1) * smooth(0.4, 0.75, t)) + (s.belly - 1) * 0.1 * smooth(0.6, 0.25, t) * smooth(0, 0.15, t)) * s.k;
  }

  /** The phase of the ribs at a point (one rib a turn) and how much of the cage is there. They lean back as they go down the flank. */
  ribs(f: number, u: number, r: number): [number, number] {
    const k = this.s.k;
    const t = (f + this.L / 2) / this.L;
    const tc = sat(t);
    const top = this.top(tc);
    const bot = this.bottom(tc);
    const u0 = (top + bot) / 2;
    const a = (top - bot) / 2;
    const y = (u - u0) / a;
    const phase = (f - 0.42 * (u - u0) + 0.02 * k * Math.sin(u * 9 / k + this.s.seed)) / this.ribGap;
    const w = curve(WIDTH, tc) * k;
    const cage = smooth(0.4, 0.5, t) * smooth(0.93, 0.84, t) * smooth(0.82, 0.45, y) * smooth(-0.9, -0.45, y) * smooth(0.25, 0.6, Math.abs(r) / w);
    return [phase, cage];
  }

  trunk(f: number, u: number, r: number): number {
    const s = this.s;
    const k = s.k;
    const t = (f + this.L / 2) / this.L;
    const tc = sat(t);
    const top = this.top(tc);
    const bot = this.bottom(tc);
    const w = curve(WIDTH, tc) * k;
    const u0 = (top + bot) / 2;
    const a = (top - bot) / 2;
    const y = (u - u0) / a;
    // The section is no ellipse: it narrows to the spine like a roof, and to a keel under the chest.
    const keel = smooth(0.4, 0.8, tc);
    const yy = Math.min(1.4, Math.abs(y));
    const we = Math.max(0.035 * k, w * (y > 0 ? 1 - 0.5 * s.gaunt * yy ** 1.6 : 1 - 0.45 * keel * yy ** 2));
    const q = Math.hypot(y, r / we);
    let d = (q - 1) * Math.min(a, we);
    const over = Math.max(0, Math.abs(t - 0.5) - 0.5) * this.L;
    if (over > 0) d = Math.hypot(Math.max(d, 0), over);
    const g = s.gaunt;
    const ar = Math.abs(r);
    // The knuckles of the spine.
    if (tc > 0.06 && tc < 0.97 && u > u0) {
      const gap = 0.062 * k;
      const fm = Math.round(f / gap) * gap;
      const tm = sat((fm + this.L / 2) / this.L);
      const dk = Math.hypot(f - fm, u - (this.top(tm) - 0.012 * k), r * 1.2) - 0.024 * k * g;
      d = smin(d, dk, 0.03 * k);
    }
    // The points of the hips, the pins beside the tail, the hollow of the flank behind the last rib, the blades of the shoulders.
    const fh = (0.25 - 0.5) * this.L;
    const hipTop = this.top(0.25);
    d = smin(d, Math.hypot(f - fh, (u - (hipTop - 0.075 * k)) * 1.1, ar - curve(WIDTH, 0.25) * k * 0.74) - 0.034 * k * g, 0.11 * k);
    const fp = (0.035 - 0.5) * this.L;
    d = smin(d, Math.hypot(f - fp, u - (this.top(0.035) - 0.035 * k), ar - 0.075 * k) - 0.036 * k * g, 0.06 * k);
    const fo = (0.37 - 0.5) * this.L;
    const hollow = Math.hypot((f - fo) / (0.13 * k), (u - (u0 + 0.3 * a)) / (0.16 * k), (ar - (w + 0.035 * k)) / (0.085 * k));
    d = smax(d, -(hollow - 1) * 0.085 * k, 0.06 * k);
    const fb = (0.82 - 0.5) * this.L;
    d = smin(d, (Math.hypot((f - fb) / (0.085 * k), (u - (top - 0.11 * k)) / (0.13 * k), (ar - w * 0.56) / (0.04 * k)) - 1) * 0.03 * k, 0.09 * k);
    // The ribs.
    const [phase, cage] = this.ribs(f, u, r);
    if (cage > 0) {
      const rib = (0.5 + 0.5 * Math.cos(phase * Math.PI * 2)) ** 1.4;
      const each = 0.45 + 0.55 * hash(Math.round(phase) * 3.7 + s.seed);
      d -= (0.003 * rib * each - 0.001) * cage * k * g;
    }
    return d;
  }

  /** A leg: the distance, and how far down it the point is (0 at the hip, 1 at the ground). */
  leg(j: number, f: number, u: number, r: number): number {
    const s = this.s;
    const k = s.k;
    const hip = this.hips[j] as [number, number, number];
    const fore = (LEG_FORE[j] as number) > 0;
    const side = LEG_SIDE[j] as number;
    const t = (hip[1] - u) / s.legLen;
    const tc = Math.min(1, Math.max(-0.16, t));
    // Read the tables with the joint where this animal has it.
    const tt = tc < s.knee ? tc / this.kneeWarp : 0.47 + ((tc - s.knee) / (1 - s.knee)) * 0.53;
    const rf = curve(fore ? FORE_F : HIND_F, tt) * k;
    const rs = curve(fore ? FORE_S : HIND_S, tt) * k;
    const cf = curve(fore ? FORE_C : HIND_C, tt) * k;
    // Above the joint the muscle lies on the outside of the bone.
    const cr = side * 0.05 * k * (1 - smooth(-0.1, 0.36, tt));
    const q = Math.hypot((f - hip[0] - cf) / rf, (r - hip[2] - cr) / rs);
    let d = (q - 1) * Math.min(rf, rs);
    const over = t < -0.16 ? (-0.16 - t) * s.legLen : t > 1 ? (t - 1) * s.legLen : 0;
    if (over > 0) d = Math.hypot(Math.max(d, 0), over);
    return d;
  }

  neckRadius(u: number): number {
    const s = this.s;
    return s.neckR * (0.5 + 0.5 * (1 - u) ** 2.2 + 0.12 * smooth(0.88, 0.96, u) - 0.2 * smooth(0.97, 1, u)) * (1 + 0.85 * smooth(0.36, 0, u) ** 1.2);
  }

  neck(f: number, u: number, r: number): number {
    const s = this.s;
    const b = this.neckBase;
    const d0 = this.neckDir;
    const pf = f - b[0];
    const pu = u - b[1];
    const along = pf * d0[0] + pu * d0[1];
    const un = along / s.neckLen;
    const uc = sat(un);
    // Across the neck: ventral (v, down and forward of the axis) and sideways.
    const v = pf * d0[1] - pu * d0[0];
    const rad = this.neckRadius(uc);
    const tall = 1 + 0.22 * smooth(0.5, 0, uc);
    const q = Math.hypot(v / (rad * tall), r / rad);
    let d = (q - 1) * rad;
    // The windpipe stands off the underside, and two cords beside the spine of the neck.
    d = smin(d, Math.hypot(v - rad * 0.78 * tall, r) - rad * 0.36, rad * 0.5);
    d = smin(d, Math.hypot(v + rad * 0.72 * tall, Math.abs(r) - rad * 0.4) - rad * 0.3, rad * 0.45);
    const over = (un - uc) * s.neckLen;
    if (over !== 0) d = Math.hypot(Math.max(d, 0), over);
    return d;
  }
}

/** The surface of a field sampled on a grid: one vertex in every cell the surface crosses, a quad across every edge it cuts (surface nets). */
function surface(field: Float32Array, nx: number, ny: number, nz: number, ox: number, oy: number, oz: number, cell: number): { position: number[]; index: number[] } {
  const position: number[] = [];
  const index: number[] = [];
  const cellVertex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const at = (i: number, j: number, l: number): number => field[(l * ny + j) * nx + i] as number;
  const cid = (i: number, j: number, l: number): number => (l * (ny - 1) + j) * (nx - 1) + i;
  const corner = new Float64Array(8);
  for (let l = 0; l < nz - 1; l++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        // Far from the surface: the fields are distances near enough that this is safe.
        if (Math.abs(at(i, j, l)) > 3 * cell) continue;
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const v = at(i + (c & 1), j + ((c >> 1) & 1), l + ((c >> 2) & 1));
          corner[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (let a = 0; a < 8; a++) {
          for (let axis = 0; axis < 3; axis++) {
            const b = a | (1 << axis);
            if (b === a) continue;
            const va = corner[a] as number;
            const vb = corner[b] as number;
            if (va < 0 === vb < 0) continue;
            const t = va / (va - vb);
            sx += (a & 1) + (axis === 0 ? t : 0);
            sy += ((a >> 1) & 1) + (axis === 1 ? t : 0);
            sz += ((a >> 2) & 1) + (axis === 2 ? t : 0);
            n++;
          }
        }
        cellVertex[cid(i, j, l)] = position.length / 3;
        position.push(ox + (i + sx / n) * cell, oy + (j + sy / n) * cell, oz + (l + sz / n) * cell);
      }
    }
  }
  const quad = (a: number, b: number, c: number, d: number, flip: boolean): void => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) index.push(a, c, b, a, d, c);
    else index.push(a, b, c, a, c, d);
  };
  for (let l = 1; l < nz - 1; l++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const v0 = at(i, j, l);
        const inside = v0 < 0;
        if (i < nx - 2 && inside !== at(i + 1, j, l) < 0) quad(cellVertex[cid(i, j - 1, l - 1)] as number, cellVertex[cid(i, j, l - 1)] as number, cellVertex[cid(i, j, l)] as number, cellVertex[cid(i, j - 1, l)] as number, !inside);
        if (j < ny - 2 && inside !== at(i, j + 1, l) < 0) quad(cellVertex[cid(i - 1, j, l - 1)] as number, cellVertex[cid(i - 1, j, l)] as number, cellVertex[cid(i, j, l)] as number, cellVertex[cid(i, j, l - 1)] as number, !inside);
        if (l < nz - 2 && inside !== at(i, j, l + 1) < 0) quad(cellVertex[cid(i - 1, j - 1, l)] as number, cellVertex[cid(i, j - 1, l)] as number, cellVertex[cid(i, j, l)] as number, cellVertex[cid(i - 1, j, l)] as number, !inside);
      }
    }
  }
  return { position, index };
}

export function buildBody(s: Shape, cell: number): Body {
  const k = s.k;
  const fields = new Fields(s);
  const L = fields.L;
  const d0 = fields.neckDir;
  const nb = fields.neckBase;
  // The box of the whole animal at rest.
  const pad = 4 * cell;
  const x0 = -0.5 * L - 0.12 * k - pad;
  const x1 = nb[0] + d0[0] * s.neckLen + 0.12 * k + pad;
  const y0 = -0.02 * k - s.legLen - pad;
  const y1 = Math.max(0.42 * k, nb[1] + d0[1] * s.neckLen + 0.1 * k) + pad;
  const z1 = 0.36 * k + pad;
  const nx = Math.ceil((x1 - x0) / cell) + 1;
  const ny = Math.ceil((y1 - y0) / cell) + 1;
  const nz = Math.ceil((2 * z1) / cell) + 1;
  const field = new Float32Array(nx * ny * nz).fill(1);
  const span = (lo: number, hi: number, o: number, n: number): [number, number] => [Math.max(0, Math.floor((lo - o) / cell)), Math.min(n - 1, Math.ceil((hi - o) / cell))];
  const fill = (fx: [number, number], fy: [number, number], fz: [number, number], d: (f: number, u: number, r: number) => number, blend: number): void => {
    const [i0, i1] = span(fx[0], fx[1], x0, nx);
    const [j0, j1] = span(fy[0], fy[1], y0, ny);
    const [l0, l1] = span(fz[0], fz[1], -z1, nz);
    for (let l = l0; l <= l1; l++) {
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const at = (l * ny + j) * nx + i;
          field[at] = smin(field[at] as number, d(x0 + i * cell, y0 + j * cell, -z1 + l * cell), blend);
        }
      }
    }
  };
  const m = 0.14 * k;
  fill([-0.5 * L - m, 0.5 * L + m], [-0.5 * k * Math.max(1, s.chest) - m, 0.4 * k + m], [-0.34 * k, 0.34 * k], (f, u, r) => fields.trunk(f, u, r), 0.01);
  for (let j = 0; j < 4; j++) {
    const h = fields.hips[j] as [number, number, number];
    fill([h[0] - 0.28 * k, h[0] + 0.24 * k], [h[1] - s.legLen - 0.02, h[1] + 0.2 * s.legLen], [h[2] - 0.2 * k, h[2] + 0.2 * k], (f, u, r) => fields.leg(j, f, u, r), 0.07 * k);
  }
  const nr = s.neckR * 2.6;
  fill([nb[0] - nr, nb[0] + d0[0] * s.neckLen + nr], [nb[1] - nr, nb[1] + d0[1] * s.neckLen + nr], [-nr, nr], (f, u, r) => fields.neck(f, u, r), 0.09 * k);

  const mesh = surface(field, nx, ny, nz, x0, y0, -z1, cell);
  const count = mesh.position.length / 3;
  const rest = new Float32Array(mesh.position);
  const index = new Uint32Array(mesh.index);
  // Normals from the surface itself, weighted by area.
  const restN = new Float32Array(count * 3);
  for (let i = 0; i < index.length; i += 3) {
    const a = (index[i] as number) * 3;
    const b = (index[i + 1] as number) * 3;
    const c = (index[i + 2] as number) * 3;
    const ux = (rest[b] as number) - (rest[a] as number);
    const uy = (rest[b + 1] as number) - (rest[a + 1] as number);
    const uz = (rest[b + 2] as number) - (rest[a + 2] as number);
    const vx = (rest[c] as number) - (rest[a] as number);
    const vy = (rest[c + 1] as number) - (rest[a + 1] as number);
    const vz = (rest[c + 2] as number) - (rest[a + 2] as number);
    const x = uy * vz - uz * vy;
    const y = uz * vx - ux * vz;
    const z = ux * vy - uy * vx;
    for (const o of [a, b, c]) {
      restN[o] = (restN[o] as number) + x;
      restN[o + 1] = (restN[o + 1] as number) + y;
      restN[o + 2] = (restN[o + 2] as number) + z;
    }
  }
  for (let v = 0; v < count; v++) {
    const l = Math.hypot(restN[v * 3] as number, restN[v * 3 + 1] as number, restN[v * 3 + 2] as number) || 1;
    restN[v * 3] = (restN[v * 3] as number) / l;
    restN[v * 3 + 1] = (restN[v * 3 + 1] as number) / l;
    restN[v * 3 + 2] = (restN[v * 3 + 2] as number) / l;
  }

  // The quads are wound one way or the other by the sign of the field: make sure the normals look out of the animal.
  let out = 0;
  for (let v = 0; v < count; v += 37) {
    const f = (rest[v * 3] as number) + (restN[v * 3] as number) * cell;
    const u = (rest[v * 3 + 1] as number) + (restN[v * 3 + 1] as number) * cell;
    const r = (rest[v * 3 + 2] as number) + (restN[v * 3 + 2] as number) * cell;
    let d = Math.min(fields.trunk(f, u, r), fields.neck(f, u, r));
    for (let j = 0; j < 4; j++) d = Math.min(d, fields.leg(j, f, u, r));
    out += d > 0 ? 1 : -1;
  }
  if (out < 0) {
    for (let i = 0; i < index.length; i += 3) {
      const b = index[i + 1] as number;
      index[i + 1] = index[i + 2] as number;
      index[i + 2] = b;
    }
    for (let i = 0; i < restN.length; i++) restN[i] = -(restN[i] as number);
  }

  const body: Body = {
    count,
    index,
    rest,
    restN,
    bone: new Uint8Array(count * 3),
    weight: new Float32Array(count * 3),
    local: new Float32Array(count * 9),
    localN: new Float32Array(count * 9),
    legT: new Float32Array(count),
    neckU: new Float32Array(count),
    ribS: new Float32Array(count),
    cage: new Float32Array(count),
    shade: new Float32Array(count),
    radius: new Float32Array(count),
    pic: new Float32Array(count * 5),
  };
  // The trunk at rest, end to end and top to bottom: laid over the trunk of the picture.
  let f0 = 1e9;
  let f1 = -1e9;
  let u0 = 1e9;
  let u1 = -1e9;
  for (let v = 0; v < count; v++) {
    const f = rest[v * 3] as number;
    const u = rest[v * 3 + 1] as number;
    const r = rest[v * 3 + 2] as number;
    if (fields.trunk(f, u, r) > 0.03 * k) continue;
    f0 = Math.min(f0, f);
    f1 = Math.max(f1, f);
    u0 = Math.min(u0, u);
    u1 = Math.max(u1, u);
  }
  const seg = s.neckLen / NECK_BONES;
  const l1 = s.legLen * s.knee;
  const l2 = s.legLen * (FETLOCK - s.knee);
  const third: [number, number, number] = [d0[1], -d0[0], 0];
  const bones: number[] = [];
  const weights: number[] = [];
  for (let v = 0; v < count; v++) {
    const f = rest[v * 3] as number;
    const u = rest[v * 3 + 1] as number;
    const r = rest[v * 3 + 2] as number;
    const dT = fields.trunk(f, u, r);
    bones.length = 0;
    weights.length = 0;
    let free = 1;
    // The nearest leg.
    let j = 0;
    let dL = 1e9;
    for (let n = 0; n < 4; n++) {
      const d = fields.leg(n, f, u, r);
      if (d < dL) {
        dL = d;
        j = n;
      }
    }
    const hip = fields.hips[j] as [number, number, number];
    const t = (hip[1] - u) / s.legLen;
    const wLeg = smooth(0.05 * k, -0.05 * k, dL - dT) * smooth(-0.14, 0.02, t);
    const dN = fields.neck(f, u, r);
    const un = sat(((f - nb[0]) * d0[0] + (u - nb[1]) * d0[1]) / s.neckLen);
    const wNeck = smooth(0.05 * k, -0.05 * k, dN - dT) * smooth(-0.02, 0.06, ((f - nb[0]) * d0[0] + (u - nb[1]) * d0[1]) / s.neckLen);
    if (wLeg > 0) {
      const lower = smooth(s.knee - 0.035, s.knee + 0.035, t);
      const foot = smooth(FETLOCK - 0.02, FETLOCK + 0.012, t);
      const share = wLeg;
      if (foot > 0) {
        bones.push(5 + j, 9 + j);
        weights.push(share * (1 - foot), share * foot);
      } else {
        bones.push(1 + j, 5 + j);
        weights.push(share * (1 - lower), share * lower);
      }
      free -= share;
      body.legT[v] = sat(t) * wLeg;
    }
    if (wNeck > 0 && free > 0) {
      const q = (un * s.neckLen) / seg - 0.5;
      const a = Math.min(NECK_BONES - 1, Math.max(0, Math.floor(q)));
      const b = Math.min(NECK_BONES - 1, a + 1);
      const fr = sat(q - a);
      const share = free * wNeck;
      if (bones.length < 2) {
        bones.push(13 + a, 13 + b);
        weights.push(share * (1 - fr), share * fr);
      } else {
        bones.push(13 + (fr > 0.5 ? b : a));
        weights.push(share);
      }
      free -= share;
      body.neckU[v] = un * wNeck;
    }
    if (free > 1e-4 || bones.length === 0) {
      bones.push(0);
      weights.push(Math.max(free, 1e-4));
    }
    // The three heaviest, made to add to one.
    const order = bones.map((_, i) => i).sort((a, b) => (weights[b] as number) - (weights[a] as number)).slice(0, 3);
    let sum = 0;
    for (const o of order) sum += weights[o] as number;
    for (let n = 0; n < 3; n++) {
      const o = order[n];
      const bone = o === undefined ? 0 : (bones[o] as number);
      const w = o === undefined ? 0 : (weights[o] as number) / sum;
      body.bone[v * 3 + n] = bone;
      body.weight[v * 3 + n] = w;
      // The vertex and its normal in the bone's own frame at rest.
      let ox = 0;
      let oy = 0;
      let oz = 0;
      const nxr = restN[v * 3] as number;
      const nyr = restN[v * 3 + 1] as number;
      const nzr = restN[v * 3 + 2] as number;
      const at = v * 9 + n * 3;
      if (bone === 0) {
        body.local[at] = f;
        body.local[at + 1] = u;
        body.local[at + 2] = r;
        body.localN[at] = nxr;
        body.localN[at + 1] = nyr;
        body.localN[at + 2] = nzr;
      } else if (bone < 13) {
        const leg = (bone - 1) % 4;
        const h = fields.hips[leg] as [number, number, number];
        const down = bone < 5 ? 0 : bone < 9 ? l1 : l1 + l2;
        ox = h[0];
        oy = h[1] - down;
        oz = h[2];
        // Across, down the bone, fore.
        body.local[at] = r - oz;
        body.local[at + 1] = -(u - oy);
        body.local[at + 2] = f - ox;
        body.localN[at] = nzr;
        body.localN[at + 1] = -nyr;
        body.localN[at + 2] = nxr;
      } else {
        const i = bone - 13;
        ox = nb[0] + d0[0] * seg * i;
        oy = nb[1] + d0[1] * seg * i;
        // Across, along the neck, and the third (under the neck).
        body.local[at] = r;
        body.local[at + 1] = (f - ox) * d0[0] + (u - oy) * d0[1];
        body.local[at + 2] = (f - ox) * third[0] + (u - oy) * third[1];
        body.localN[at] = nzr;
        body.localN[at + 1] = nxr * d0[0] + nyr * d0[1];
        body.localN[at + 2] = nxr * third[0] + nyr * third[1];
      }
    }
    // The picture: the trunk's box, the leg's own line from hip to hoof, the neck's own arc.
    const ax = PIC_TRUNK[0] + ((f - f0) / (f1 - f0)) * (PIC_TRUNK[2] - PIC_TRUNK[0]);
    const ay = PIC_TRUNK[1] + ((u1 - u) / (u1 - u0)) * (PIC_TRUNK[3] - PIC_TRUNK[1]);
    let bx = ax;
    let by = ay;
    let limb = 0;
    if (wLeg > 0 && wLeg >= wNeck) {
      const line = PIC_LEGS[(LEG_FORE[j] as number) > 0 ? ((LEG_SIDE[j] as number) > 0 ? 3 : 2) : (LEG_SIDE[j] as number) > 0 ? 1 : 0] as [number, number][];
      const tc = Math.min(1.02, Math.max(-0.1, t));
      const tt = tc < s.knee ? (tc / s.knee) * 0.47 : 0.47 + ((tc - s.knee) / (1 - s.knee)) * 0.53;
      const fore = (LEG_FORE[j] as number) > 0;
      const rf = curve(fore ? FORE_F : HIND_F, tt) * k;
      const cf = curve(fore ? FORE_C : HIND_C, tt) * k;
      const [top, knee, hoof] = line as [[number, number], [number, number], [number, number]];
      const g = tt < 0.47 ? tt / 0.47 : (tt - 0.47) / 0.53;
      const from = tt < 0.47 ? top : knee;
      const to = tt < 0.47 ? knee : hoof;
      bx = from[0] + (to[0] - from[0]) * g + ((f - hip[0] - cf) / rf) * curve(PIC_LEG_HALF, tt);
      by = from[1] + (to[1] - from[1]) * g;
      limb = wLeg;
    } else if (wNeck > 0) {
      const along = sat(un) * (PIC_NECK.length - 1);
      const i = Math.min(PIC_NECK.length - 2, Math.floor(along));
      const g = along - i;
      const a = PIC_NECK[i] as [number, number, number];
      const b = PIC_NECK[i + 1] as [number, number, number];
      let dx = b[0] - a[0];
      let dy = b[1] - a[1];
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl;
      dy /= dl;
      const under = ((f - nb[0]) * third[0] + (u - nb[1]) * third[1]) / fields.neckRadius(sat(un));
      const half = a[2] + (b[2] - a[2]) * g;
      bx = a[0] + (b[0] - a[0]) * g - dy * under * half;
      by = a[1] + (b[1] - a[1]) * g + dx * under * half;
      limb = wNeck;
    }
    body.pic[v * 5] = ax / 1536;
    body.pic[v * 5 + 1] = 1 - ay / 1024;
    body.pic[v * 5 + 2] = bx / 1536;
    body.pic[v * 5 + 3] = 1 - by / 1024;
    body.pic[v * 5 + 4] = limb;
    const [phase, cage] = fields.ribs(f, u, r);
    body.ribS[v] = phase;
    body.cage[v] = cage * (1 - wLeg) * (1 - wNeck);
    const ny_ = restN[v * 3 + 1] as number;
    // Under the trunk and between the legs the skin sees little of the sky.
    body.shade[v] = (0.5 + 0.5 * smooth(-0.95, 0.3, ny_)) * (1 - 0.25 * wLeg * smooth(0.3, 0, t));
    const legR = Math.min(curve(HIND_F, sat(t)), curve(HIND_S, sat(t))) * k;
    body.radius[v] = wLeg > 0.5 ? legR : wNeck > 0.5 ? fields.neckRadius(un) : 0.3 * k;
  }
  return body;
}
