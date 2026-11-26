// How a gill-plume is grown, as geometry and not as a picture of one: limbs of wet flesh leave one holdfast, lean over toward the shaft
// and fork; along each limb and each fork hang thousands of single threads, gathered by the wet into pointed locks. A thread is one
// instance of a short strip that the vertex shader bends and turns to the lens (shaders.ts); a limb is a tube.
// The light inside a bush is worked out here once: the threads are counted into a grid, and each thread and each ring of a limb is told
// how much growth lies between it and the sun, and between it and the sky. The sun of the Breath does not move.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { SUN_DIR, WIND } from '../shared/anchors';

export type V3 = [number, number, number];

export interface Bush {
  x: number;
  y: number;
  z: number;
  tall: number;
  /** The way it leans, radians: toward the shaft. */
  lean: number;
  /** 1 for the ones a camera comes close to, less for the far ones: how many threads are grown and how thick each is. */
  detail: number;
  /** How far over it is combed, 0 to 1. Unset: 0.6. */
  comb?: number;
  /** A mound seen from some way off, 0 to 1: more and shorter limbs that leave the holdfast all the way round and arch over to the rock. Unset: 0. */
  mound?: number;
  /** A weeping one, 0 to 1: every limb is hung with many forks that fall straight down from it, and its locks are long. Unset: 0. */
  weep?: number;
  /** One that stands by a lens: it has no dead limb lying out from it, which would cross the lens as a bare rod. */
  tidy?: boolean;
}

/** The thread at the point of a lock, which carries a drop: the same five numbers its instance has (see `build`). */
export interface Tip {
  a: [number, number, number, number];
  b: [number, number, number, number];
  c: [number, number, number, number];
  sway: [number, number, number, number];
  tint: [number, number, number, number];
}

export interface Grown {
  threads: THREE.InstancedBufferGeometry;
  stems: THREE.BufferGeometry;
  tips: Tip[];
  count: number;
}

/** Steps along a limb. */
const ALONG = 22;
const SIDES = 7;
/** Cells a side of the grid the light inside a bush is counted in. */
const CELLS = 40;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Curve {
  points: V3[];
  tangents: V3[];
  /** Two unit vectors across the limb at every point, carried along it without twist. */
  side: V3[];
  over: V3[];
  azimuth: number[];
  elevation: number[];
  length: number;
}

/** The strip one thread is drawn as: x is how far along it (0 to 1), y is which edge (-1 or 1). */
function strip(segments: number): { position: THREE.BufferAttribute; index: number[] } {
  const position: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    // More of its steps lie near the root, where it bends most.
    const s = (i / segments) ** 1.25;
    position.push(s, -1, 0, s, 1, 0);
    if (i < segments) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  return { position: new THREE.Float32BufferAttribute(position, 3), index };
}

export function grow(bush: Bush, rng: Rng, floor: (x: number, z: number) => number): Grown {
  const { tall, lean } = bush;
  const comb = bush.comb ?? 0.6;
  const root: V3 = [bush.x, bush.y, bush.z];
  const bushPhase = rng.range(0, 6.283);
  const close = bush.detail >= 1;
  const mound = bush.mound ?? 0;
  const weep = bush.weep ?? 0;
  // Far off a thread is thinner than a pixel: there the bush is grown of fewer, thicker locks, which read the same from there.
  const coarse = close ? 1 : bush.detail >= 0.5 ? 3.6 : 6.5;

  const tA: number[] = [];
  const tB: number[] = [];
  const tC: number[] = [];
  const tSway: number[] = [];
  const tTint: number[] = [];
  const tips: Tip[] = [];
  const stemPosition: number[] = [];
  const stemNormal: number[] = [];
  const stemVane: number[] = [];
  const stemSway: number[] = [];
  const stemTint: number[] = [];
  const stemIndex: number[] = [];
  let stemCount = 0;

  const reachOf = (p: V3): number => Math.hypot(p[0] - bush.x, p[1] - bush.y, p[2] - bush.z) / tall;

  /** A limb's line: it leaves `from` at an azimuth and elevation, turns toward `toAzimuth` and sinks to `endElevation` at its tip. */
  const curve = (from: V3, azimuth: number, elevation: number, toAzimuth: number, endElevation: number, length: number, power: number): Curve => {
    const c: Curve = { points: [], tangents: [], side: [], over: [], azimuth: [], elevation: [], length };
    const wobble = rng.range(0, 6.283);
    const kink = rng.range(0.06, 0.22);
    let p: V3 = [from[0], from[1], from[2]];
    let side: V3 = [Math.cos(azimuth), 0, Math.sin(azimuth)];
    const roll = rng.range(-0.6, 0.6);
    for (let i = 0; i <= ALONG; i++) {
      const u = i / ALONG;
      const el = elevation + (endElevation - elevation) * u ** power + kink * Math.sin(u * 7 + wobble) * u;
      const az = azimuth + (toAzimuth - azimuth) * smooth(0, 0.8, u) + kink * Math.sin(u * 5.3 + wobble * 1.7);
      const t: V3 = [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
      if (i > 0) {
        p = [p[0] + (t[0] * length) / ALONG, p[1] + (t[1] * length) / ALONG, p[2] + (t[2] * length) / ALONG];
        // Where it comes down to the rock it lies on it.
        const f = floor(p[0], p[2]) + 0.04;
        if (p[1] < f && u > 0.25) p[1] = f;
      }
      const d = side[0] * t[0] + side[1] * t[1] + side[2] * t[2];
      let s: V3 = [side[0] - t[0] * d, side[1] - t[1] * d, side[2] - t[2] * d];
      const sl = Math.hypot(s[0], s[1], s[2]) || 1;
      s = [s[0] / sl, s[1] / sl, s[2] / sl];
      side = s;
      const o: V3 = [t[1] * s[2] - t[2] * s[1], t[2] * s[0] - t[0] * s[2], t[0] * s[1] - t[1] * s[0]];
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      c.points.push(p);
      c.tangents.push(t);
      c.side.push([s[0] * cr + o[0] * sr, s[1] * cr + o[1] * sr, s[2] * cr + o[2] * sr]);
      c.over.push([o[0] * cr - s[0] * sr, o[1] * cr - s[1] * sr, o[2] * cr - s[2] * sr]);
      c.azimuth.push(az);
      c.elevation.push(el);
    }
    return c;
  };

  /** A place on a limb's line, `u` of the way along it. */
  const on = (c: Curve, u: number): { p: V3; s: V3; o: V3; t: V3 } => {
    const f = Math.min(ALONG - 1e-4, Math.max(0, u * ALONG));
    const i = Math.floor(f);
    const k = f - i;
    const mix = (a: V3, b: V3): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    return { p: mix(c.points[i] as V3, c.points[i + 1] as V3), s: mix(c.side[i] as V3, c.side[i + 1] as V3), o: mix(c.over[i] as V3, c.over[i + 1] as V3), t: mix(c.tangents[i] as V3, c.tangents[i + 1] as V3) };
  };

  /** How thick a limb is at `u` of the way to where it ends as a tube. */
  const girth = (thick: number, u: number, upTo: number): number => thick * (0.08 + 0.92 * Math.max(0, 1 - u / upTo) ** 1.7);

  /** The locks along a limb. `from` is how far along its parent the limb is rooted and `phase` is its parent's, so a fork's threads move with their limb.
   *  `bare`: the part of it at the root that carries none. `long`: the length of a thread in metres. `thick`: the limb's own girth at its root. */
  const locks = (c: Curve, bare: number, phase: number, from: number, long: number, thick: number, upTo: number, dead = false): void => {
    // A lock every few centimetres of limb, of seven to ten threads. Far off: fewer locks, and each thread stands for several.
    const spacing = (close ? 0.027 : 0.034) * coarse * (0.75 + 0.25 * tall / 3.4);
    const n = Math.max(3, Math.round((c.length * (1 - bare)) / spacing));
    const width = (close ? 0.0019 : 0.0026) * Math.sqrt(coarse) * (0.8 + 0.2 * tall / 3.4);
    for (let i = 0; i < n; i++) {
      if (dead && rng.next() < 0.55) continue;
      const u = bare + (1 - bare) * ((i + rng.next()) / n);
      const g = on(c, u);
      // Round the limb, but a wet thread hangs: most leave it to the sides and below, and the wind has combed them to its lee.
      const psi = rng.range(0, 6.283);
      const cp = Math.cos(psi);
      const sp = Math.sin(psi);
      let rx = g.s[0] * cp + g.o[0] * sp + 0.3 * WIND[0];
      let ry = g.s[1] * cp + g.o[1] * sp - 0.35 - 0.4 * weep;
      let rz = g.s[2] * cp + g.o[2] * sp + 0.3 * WIND[1];
      const rl = Math.hypot(rx, ry, rz) || 1;
      rx /= rl;
      ry /= rl;
      rz /= rl;
      // Short at the root of the limb, longest past its middle, and a tassel at its end.
      const L = long * rng.range(0.55, 1.3) * (0.45 + 0.55 * smooth(bare, bare + 0.3 * (1 - bare), u)) * (1 - 0.4 * weep) * (dead ? 0.5 : 1);
      const theta = rng.range(0.28, 0.8) * (1 - 0.6 * smooth(0.8, 1, u));
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      const dir: V3 = [g.t[0] * ct + rx * st, g.t[1] * ct + ry * st, g.t[2] * ct + rz * st];
      const sag = rng.range(0.02, 0.26) + 0.18 * smooth(0.6, 1, u) + 0.35 * weep;
      const point: V3 = [g.p[0] + dir[0] * L * 0.72 + WIND[0] * L * 0.16, g.p[1] + dir[1] * L * 0.72 - L * sag, g.p[2] + dir[2] * L * 0.72 + WIND[1] * L * 0.16];
      const f = floor(point[0], point[2]) + 0.02;
      if (point[1] < f) point[1] = f;
      const lockPhase = rng.range(0, 6.283);
      const tone = rng.next();
      const members = Math.max(2, Math.round(rng.range(7, 11) / Math.sqrt(coarse)));
      const reach = reachOf(g.p);
      for (let m = 0; m < members; m++) {
        const um = Math.min(1, Math.max(bare * 0.8, u + (rng.range(-1, 1) * spacing * 0.9) / c.length));
        const h = on(c, um);
        const pm = psi + rng.range(-0.8, 0.8);
        const cm = Math.cos(pm);
        const sm = Math.sin(pm);
        const ox = h.s[0] * cm + h.o[0] * sm;
        const oy = h.s[1] * cm + h.o[1] * sm;
        const oz = h.s[2] * cm + h.o[2] * sm;
        const r = girth(thick, um, upTo) * 0.8;
        const a: V3 = [h.p[0] + ox * r, h.p[1] + oy * r, h.p[2] + oz * r];
        const Lm = L * rng.range(0.82, 1.06);
        // One thread in eight has not joined its lock: it hangs on its own, and frays the outline.
        const stray = m > 0 && rng.next() < 0.13;
        const j = stray ? 0.45 * L : 0.035 * L + 0.004;
        const end: V3 = m === 0 ? point : [point[0] + rng.range(-1, 1) * j, Math.max(f, point[1] + rng.range(-1, 1) * j), point[2] + rng.range(-1, 1) * j];
        const tm = theta + rng.range(-0.25, 0.25);
        const d1: V3 = [(h.t[0] * Math.cos(tm) + (0.6 * ox + 0.4 * rx) * Math.sin(tm)) * Lm * 0.9, (h.t[1] * Math.cos(tm) + (0.6 * oy + 0.4 * ry) * Math.sin(tm)) * Lm * 0.9, (h.t[2] * Math.cos(tm) + (0.6 * oz + 0.4 * rz) * Math.sin(tm)) * Lm * 0.9];
        const d2: V3 = [end[0] - a[0] - d1[0], end[1] - a[1] - d1[1], end[2] - a[2] - d1[2]];
        const w = width * rng.range(0.75, 1.3);
        const tn = Math.min(0.999, Math.max(0, tone + rng.range(-0.12, 0.12)));
        const A: Tip['a'] = [a[0], a[1], a[2], w];
        const B: Tip['b'] = [d1[0], d1[1], d1[2], dead ? 2 + tn : tn];
        const C: Tip['c'] = [d2[0], d2[1], d2[2], rng.next()];
        const S: Tip['sway'] = [from + (1 - from) * um, bushPhase, lockPhase, phase];
        const T: Tip['tint'] = [1, 1, reach, tall];
        tA.push(...A);
        tB.push(...B);
        tC.push(...C);
        tSway.push(...S);
        tTint.push(...T);
        if (m === 0 && !dead && L > 0.5 * long && point[1] > f + 0.25 && point[1] - g.p[1] < -0.3 * L) tips.push({ a: A, b: B, c: C, sway: S, tint: T });
      }
    }
  };

  /** The limb itself: a tube that thins toward the tip. `flesh` is how pale and swollen it is at its root. */
  const tube = (c: Curve, thick: number, upTo: number, flesh: number, phase: number, from: number, nod = 1, every = 1, sides = SIDES): void => {
    const SIDES = sides;
    const seed = rng.range(1, 90);
    const last = Math.max(2, Math.round(upTo * ALONG));
    const first = stemCount;
    let rings = 0;
    for (let i = 0; i <= last; i += every) {
      rings++;
      const u = i / ALONG;
      const p = c.points[i] as V3;
      const s = c.side[i] as V3;
      const o = c.over[i] as V3;
      const r = girth(thick, u, upTo) * (1 + 0.16 * Math.sin(u * 23 + seed) + 0.1 * Math.sin(u * 61 + seed * 2)) * (1 + 0.9 * flesh * Math.exp(-u * 9));
      for (let k = 0; k < SIDES; k++) {
        const a = (k / SIDES) * Math.PI * 2;
        const nx = s[0] * Math.cos(a) + o[0] * Math.sin(a);
        const ny = s[1] * Math.cos(a) + o[1] * Math.sin(a);
        const nz = s[2] * Math.cos(a) + o[2] * Math.sin(a);
        // A limb is not turned on a lathe: it is corded, a little flat, and swells where it forks.
        const rr = r * (1 + 0.22 * Math.sin(a * 2 + seed + u * 4) + 0.1 * Math.sin(a * 3 + seed * 3));
        const q: V3 = [p[0] + nx * rr, p[1] + ny * rr, p[2] + nz * rr];
        stemPosition.push(q[0], q[1], q[2]);
        stemNormal.push(nx, ny, nz);
        stemVane.push(u * c.length, k / SIDES, seed, flesh * (1 - smooth(0.05, 0.6, u)));
        stemSway.push(nod * (from + (1 - from) * u), bushPhase, 0, phase);
        stemTint.push(1, 1, reachOf(q), tall);
      }
    }
    for (let i = 0; i < rings - 1; i++) {
      for (let k = 0; k < SIDES; k++) {
        const v0 = first + i * SIDES + k;
        const v1 = first + i * SIDES + ((k + 1) % SIDES);
        stemIndex.push(v0, v1, v0 + SIDES, v1, v1 + SIDES, v0 + SIDES);
      }
    }
    stemCount += rings * SIDES;
  };

  /** A limb forks, and its forks fork: lesser ones leave it part way up, to one side and the other, each hung with its own locks. */
  const sprout = (c: Curve, thick: number, upTo: number, level: number, phase: number, from: number, long: number, whole: number): void => {
    const n = level === 1 ? (close ? 6 + Math.floor(rng.next() * 4) : bush.detail >= 0.5 ? 4 : 2) + Math.round(3 * weep) : close ? 2 + Math.floor(rng.next() * 3) + Math.round(2 * weep) : bush.detail >= 0.5 ? 1 : 0;
    for (let s = 0; s < n; s++) {
      const at = Math.round(rng.range(level === 1 ? 0.16 : 0.12, 0.9) * ALONG);
      const p = c.points[at] as V3;
      const way = (s % 2 === 0 ? -1 : 1) * rng.range(0.35, 1.0);
      const length = (level === 1 ? whole * rng.range(0.2, 0.46) * (1 - (0.4 * at) / ALONG) : c.length * rng.range(0.3, 0.6)) * (1 - 0.2 * weep);
      const azimuth = (c.azimuth[at] as number) + way;
      const child = curve(p, azimuth, (c.elevation[at] as number) + rng.range(-0.35, 0.4) - 0.5 * weep, level === 1 ? lean + way * (1 - comb) : azimuth - 0.5 * way, rng.range(-0.9, 0.05) * (1 - weep) + rng.range(-1.5, -1.1) * weep, length, rng.range(1.0, 1.7) - 0.4 * weep);
      const childThick = Math.max(girth(thick, at / ALONG, upTo) * 0.7, 0.0035 * tall);
      const childFrom = from + ((1 - from) * at) / ALONG;
      tube(child, childThick, 0.9, 0, phase, childFrom, 1, level === 1 ? 1 : 3, level === 1 ? SIDES : 5);
      locks(child, 0.05, phase, childFrom, long * rng.range(0.65, 1) * (level === 1 ? 1 : 0.8), childThick, 0.9);
      if (level === 1) sprout(child, childThick, 0.9, 2, phase, childFrom, long, whole);
    }
  };

  const mains = (close ? 10 : bush.detail >= 0.5 ? 8 : 5 + (rng.next() < 0.4 ? 1 : 0)) + Math.round((close ? 8 : 4) * mound);
  // Every bush has its own habit: how upright it stands, how wide it fans and how long its threads are.
  const upright = rng.range(-0.18, 0.2);
  const fan = rng.range(0.75, 1.2);
  const shag = rng.range(0.8, 1.25);
  for (let m = 0; m < mains; m++) {
    // From the crown of the bush to its skirt: the first rise steeply and bend over only at their ends, the last go out low and hang.
    // Each leaves the holdfast its own way round and all are combed toward the lean.
    const rank = Math.min(1, Math.max(0, (m + rng.range(-0.3, 0.3)) / (mains - 1)));
    const k = rng.range(-0.5, 0.5);
    // One in six grows out of the back of the bush and is turned over it by the wind.
    const back = !bush.tidy && m % 6 === 4;
    const longer = (mound > 0 ? 1.0 - 0.4 * rank : 1.3 - 0.55 * rank) * rng.range(0.6, 1.05) * (back ? 0.7 : 1);
    const length = tall * longer;
    const out = 0.045 * tall * rng.next();
    const about = rng.range(0, 6.283);
    const from: V3 = [bush.x + Math.sin(about) * out, bush.y + 0.03 * tall, bush.z + Math.cos(about) * out];
    const spread = (1.9 + 3.4 * mound) * fan;
    const azimuth = lean + (back ? Math.PI + 1.2 * k : spread * k) + rng.range(-0.25, 0.25);
    const elevation = (back ? 1.2 : 1.32 + upright - 0.85 * rank) + rng.range(-0.12, 0.1);
    const c = curve(from, azimuth, elevation, lean + (back ? 1.6 * k : (1 - comb * (1 - 0.7 * mound)) * spread * k) + rng.range(-0.2, 0.2), 0.05 - 0.45 * mound - 0.8 * rank ** 0.8 + rng.range(-0.3, 0.15) - 0.6 * weep, length, rng.range(1.6, 2.6) - 0.6 * mound);
    const phase = rng.range(0, 6.283);
    const thick = tall * 0.02 * (0.7 + 0.5 * longer) * (1 - 0.3 * mound);
    const bare = rng.range(0.14, 0.3) * (1 - 0.5 * mound);
    const long = tall * 0.058 * shag * (1 - 0.2 * mound);
    tube(c, thick, 0.94, 1, phase, 0);
    locks(c, bare, phase, 0, long, thick, 0.94);
    sprout(c, thick, 0.94, 1, phase, 0, long, length);
  }
  // Low down a limb or two is dead: brown, broken short, lying out over the rock with a few rags on it.
  const fallen = bush.tidy || close ? 0 : rng.next() < 0.3 ? 1 : 0;
  for (let d = 0; d < fallen; d++) {
    const azimuth = lean + (rng.next() < 0.5 ? -1 : 1) * rng.range(1.3, 2.6);
    const from: V3 = [bush.x, bush.y + 0.02 * tall, bush.z];
    const c = curve(from, azimuth, rng.range(0.25, 0.5), azimuth + rng.range(-0.5, 0.5), rng.range(-0.9, -0.5), tall * rng.range(0.35, 0.55), 0.8);
    tube(c, tall * 0.011, 0.8, 0.5, 0, 0);
    locks(c, 0.3, 0, 0, tall * 0.05, tall * 0.011, 0.8, true);
  }
  // The toes of the holdfast: they leave it low, thick as a wrist, and go into the cracks of the rock.
  const toes = close ? 9 : 5;
  for (let t = 0; t < toes; t++) {
    const azimuth = ((t + rng.next()) / toes) * Math.PI * 2;
    const from: V3 = [bush.x, bush.y + 0.06 * tall, bush.z];
    const c = curve(from, azimuth, rng.range(-0.1, 0.3), azimuth + rng.range(-0.9, 0.9), rng.range(-1.3, -0.8), tall * rng.range(0.1, 0.19), 0.7);
    c.points.forEach((p, i) => {
      // It lies on the rock and its end goes into it.
      const f = floor(p[0], p[2]);
      p[1] = Math.min(Math.max(p[1], f - 0.03 * tall), f + 0.07 * tall) - 0.09 * tall * smooth(0.55, 1, i / ALONG);
    });
    tube(c, tall * rng.range(0.02, 0.032), 1.0, 0.85, 0, 0, 0);
  }

  // The light inside the bush. Every thread is counted into the cell its middle lies in, as the area it shows; from that, what part of the
  // sun's light and of the sky's is left at any place after the growth it has come through.
  const count = tA.length / 4;
  let lox = Infinity;
  let loy = Infinity;
  let loz = Infinity;
  let hix = -Infinity;
  let hiy = -Infinity;
  let hiz = -Infinity;
  const mid = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = (tA[i * 4] as number) + 0.5 * (tB[i * 4] as number) + 0.25 * (tC[i * 4] as number);
    const y = (tA[i * 4 + 1] as number) + 0.5 * (tB[i * 4 + 1] as number) + 0.25 * (tC[i * 4 + 1] as number);
    const z = (tA[i * 4 + 2] as number) + 0.5 * (tB[i * 4 + 2] as number) + 0.25 * (tC[i * 4 + 2] as number);
    mid[i * 3] = x;
    mid[i * 3 + 1] = y;
    mid[i * 3 + 2] = z;
    lox = Math.min(lox, x);
    loy = Math.min(loy, y);
    loz = Math.min(loz, z);
    hix = Math.max(hix, x);
    hiy = Math.max(hiy, y);
    hiz = Math.max(hiz, z);
  }
  const cell = Math.max(hix - lox, hiy - loy, hiz - loz, 0.1) / (CELLS - 1);
  const dense = new Float32Array(CELLS * CELLS * CELLS);
  for (let i = 0; i < count; i++) {
    const ix = Math.min(CELLS - 1, Math.floor((mid[i * 3] as number - lox) / cell));
    const iy = Math.min(CELLS - 1, Math.floor((mid[i * 3 + 1] as number - loy) / cell));
    const iz = Math.min(CELLS - 1, Math.floor((mid[i * 3 + 2] as number - loz) / cell));
    const long = Math.hypot(tB[i * 4] as number, tB[i * 4 + 1] as number, tB[i * 4 + 2] as number);
    // The area a thread hides, seen from the side, for each cubic metre of its cell: the share of light a metre of path through it takes.
    const k = (iz * CELLS + iy) * CELLS + ix;
    dense[k] = (dense[k] as number) + (long * 2 * (tA[i * 4 + 3] as number)) / (cell * cell * cell);
  }
  const denseAt = (x: number, y: number, z: number): number => {
    const fx = (x - lox) / cell - 0.5;
    const fy = (y - loy) / cell - 0.5;
    const fz = (z - loz) / cell - 0.5;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const iz = Math.floor(fz);
    let sum = 0;
    for (let c = 0; c < 8; c++) {
      const jx = ix + (c & 1);
      const jy = iy + ((c >> 1) & 1);
      const jz = iz + (c >> 2);
      if (jx < 0 || jy < 0 || jz < 0 || jx >= CELLS || jy >= CELLS || jz >= CELLS) continue;
      const w = (c & 1 ? fx - ix : 1 - fx + ix) * ((c >> 1) & 1 ? fy - iy : 1 - fy + iy) * (c >> 2 ? fz - iz : 1 - fz + iz);
      sum += w * (dense[(jz * CELLS + jy) * CELLS + jx] as number);
    }
    return sum;
  };
  const span = cell * CELLS;
  /** What is left of a light that comes from the way (dx, dy, dz) when it has reached a point. */
  const left = (x: number, y: number, z: number, dx: number, dy: number, dz: number): number => {
    const steps = 14;
    const stride = (span * 0.6) / steps;
    let depth = 0;
    for (let s = 0; s < steps; s++) {
      const d = (s + 0.5) * stride;
      depth += denseAt(x + dx * d, y + dy * d, z + dz * d) * stride;
    }
    return Math.exp(-depth);
  };
  const skyLeft = (x: number, y: number, z: number): number => 0.5 * left(x, y, z, 0, 1, 0) + 0.25 * left(x, y, z, 0.6 * WIND[0], 0.8, 0.6 * WIND[1]) + 0.25 * left(x, y, z, -0.6 * WIND[1], 0.8, 0.6 * WIND[0]);
  for (let i = 0; i < count; i++) {
    const x = mid[i * 3] as number;
    const y = mid[i * 3 + 1] as number;
    const z = mid[i * 3 + 2] as number;
    tTint[i * 4] = left(x, y, z, SUN_DIR[0], SUN_DIR[1], SUN_DIR[2]);
    tTint[i * 4 + 1] = skyLeft(x, y, z);
  }
  for (const tip of tips) {
    const x = tip.a[0] + tip.b[0] + tip.c[0];
    const y = tip.a[1] + tip.b[1] + tip.c[1];
    const z = tip.a[2] + tip.b[2] + tip.c[2];
    tip.tint[0] = left(x, y, z, SUN_DIR[0], SUN_DIR[1], SUN_DIR[2]);
    tip.tint[1] = skyLeft(x, y, z);
  }
  for (let i = 0; i < stemCount; i++) {
    const x = stemPosition[i * 3] as number;
    const y = stemPosition[i * 3 + 1] as number;
    const z = stemPosition[i * 3 + 2] as number;
    stemTint[i * 4] = left(x, y, z, SUN_DIR[0], SUN_DIR[1], SUN_DIR[2]);
    stemTint[i * 4 + 1] = skyLeft(x, y, z);
  }

  const threads = new THREE.InstancedBufferGeometry();
  const made = strip(close ? 5 : 3);
  threads.setAttribute('position', made.position);
  threads.setIndex(made.index);
  threads.setAttribute('aA', new THREE.InstancedBufferAttribute(new Float32Array(tA), 4));
  threads.setAttribute('aB', new THREE.InstancedBufferAttribute(new Float32Array(tB), 4));
  threads.setAttribute('aC', new THREE.InstancedBufferAttribute(new Float32Array(tC), 4));
  threads.setAttribute('aSway', new THREE.InstancedBufferAttribute(new Float32Array(tSway), 4));
  threads.setAttribute('aTint', new THREE.InstancedBufferAttribute(new Float32Array(tTint), 4));
  threads.instanceCount = count;
  // A bush that is out of the frame is not drawn. The sphere holds it with its sway.
  const sphere = new THREE.Sphere(new THREE.Vector3(bush.x, bush.y + 0.4 * tall, bush.z), 2.2 * tall + 1);
  threads.boundingSphere = sphere;
  const stems = new THREE.BufferGeometry();
  stems.setAttribute('position', new THREE.Float32BufferAttribute(stemPosition, 3));
  stems.setAttribute('normal', new THREE.Float32BufferAttribute(stemNormal, 3));
  stems.setAttribute('aVane', new THREE.Float32BufferAttribute(stemVane, 4));
  stems.setAttribute('aSway', new THREE.Float32BufferAttribute(stemSway, 4));
  stems.setAttribute('aTint', new THREE.Float32BufferAttribute(stemTint, 4));
  stems.setIndex(stemIndex);
  stems.boundingSphere = sphere.clone();
  return { threads, stems, tips, count };
}
