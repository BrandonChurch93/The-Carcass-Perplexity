// How a gill-plume is grown, as geometry and not as a picture of one. It is a thing that forks: stalks of wet flesh leave one holdfast,
// low and fanned, and are swept the way the bush leans. Every stalk forks at a narrow angle into branches that run on beside it, every
// branch into wiry branchlets, every branchlet into short filaments. Nothing is set across its limb: each fork leaves forward, so a stalk
// with all it carries is one long feather that thins to open ends, and no limb shows as a rib with a fringe.
// Stalks and branches are tubes. Branchlets and filaments are instances of one strip that the vertex shader turns to the lens (shaders.ts).
// The light inside a bush is worked out here once: the strips are counted into a grid, and each strip and each ring of a tube is told how
// much growth lies between it and the sun, and between it and the sky. The sun of the Breath does not move.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { SUN_DIR, WIND } from '../shared/anchors';

export type V3 = [number, number, number];

export type Habit = 'sweep' | 'fountain' | 'hang';

export interface Bush {
  x: number;
  y: number;
  z: number;
  /** Metres. A swept one stands about 0.8 of this and reaches 1.2 of it; a fountain is about 0.5 of it high and as wide as it. */
  tall: number;
  /** The way it leans, radians: toward the shaft. */
  lean: number;
  /** 1 for the ones a camera comes close to, less for the far ones: how far down the forking is grown and how thick each strip is. */
  detail: number;
  /** sweep: a fan of feathers combed one way. fountain: stalks all round that arch over to the rock. hang: a fan that falls from its root. */
  habit: Habit;
  /** More or fewer stalks than its habit has. Unset: 1. */
  full?: number;
  /** Stalks leave the root within this many radians either side of the lean. Unset: the habit's own. */
  spread?: number;
  /** How much longer its stalks are than its height gives: one that hangs over the pit reaches far and its hair is no longer for it. Unset: 1. */
  reach?: number;
}

/** The strip at the end of a spray, which carries a drop: the numbers its instance has (see `grow`). */
export interface Tip {
  a: [number, number, number, number];
  b: [number, number, number, number];
  c: [number, number, number, number];
  sway: [number, number, number, number];
  tint: [number, number, number, number];
  /** How open the air under the point is, 0 to 1: a drop falls clear only from the underside of the bush. */
  under: number;
}

export interface Grown {
  threads: THREE.InstancedBufferGeometry;
  stems: THREE.BufferGeometry;
  tips: Tip[];
  count: number;
  /** For the shaders: the root and the bush's own phase, and its height. */
  root: THREE.Vector4;
  tall: number;
}

/** Cells a side of the grid the light inside a bush is counted in. */
const CELLS = 40;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const unit = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** A unit vector square to `t`, turned `psi` round it. */
const aside = (t: V3, psi: number): V3 => {
  const s = unit(cross(t, Math.abs(t[1]) < 0.92 ? [0, 1, 0] : [1, 0, 0]));
  const o = cross(t, s);
  const c = Math.cos(psi);
  const k = Math.sin(psi);
  return [s[0] * c + o[0] * k, s[1] * c + o[1] * k, s[2] * c + o[2] * k];
};

interface Path {
  points: V3[];
  tangents: V3[];
  length: number;
  /** How far along the whole bush each point is, 0 at the holdfast to 1 at the end of a stalk or a branch: what the sway reads. */
  u: number[];
}

/** A place on a path, `v` of the way along it. */
const on = (c: Path, v: number): { p: V3; t: V3; u: number } => {
  const last = c.points.length - 1;
  const f = Math.min(last - 1e-4, Math.max(0, v * last));
  const i = Math.floor(f);
  const k = f - i;
  const a = c.points[i] as V3;
  const b = c.points[i + 1] as V3;
  const ta = c.tangents[i] as V3;
  const tb = c.tangents[i + 1] as V3;
  return {
    p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
    t: unit([ta[0] + (tb[0] - ta[0]) * k, ta[1] + (tb[1] - ta[1]) * k, ta[2] + (tb[2] - ta[2]) * k]),
    u: (c.u[i] as number) + ((c.u[i + 1] as number) - (c.u[i] as number)) * k,
  };
};

/** The strip one branchlet is drawn as: x is how far along it (0 to 1), y is which edge (-1 or 1). */
function strip(segments: number): { position: THREE.BufferAttribute; index: number[] } {
  const position: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    position.push(s, -1, 0, s, 1, 0);
    if (i < segments) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  return { position: new THREE.Float32BufferAttribute(position, 3), index };
}

export function grow(bush: Bush, rng: Rng, floor: (x: number, z: number) => number): Grown {
  const { tall, lean, habit } = bush;
  const extent = tall * (bush.reach ?? 1);
  const close = bush.detail >= 1;
  const middle = !close && bush.detail >= 0.5;
  const far = !close && !middle;
  const bushPhase = rng.range(0, 6.283);
  const leanDir: V3 = [Math.sin(lean), 0, -Math.cos(lean)];
  // Far off a strip is thinner than a pixel: there the bush is grown of fewer, thicker strips, which read the same from there.
  const coarse = close ? 1 : middle ? 2.2 : 4.5;

  const tA: number[] = [];
  const tB: number[] = [];
  const tC: number[] = [];
  const tSway: number[] = [];
  const tTint: number[] = [];
  const tipAt: number[] = [];
  const stemPosition: number[] = [];
  const stemNormal: number[] = [];
  const stemVane: number[] = [];
  const stemSway: number[] = [];
  const stemTint: number[] = [];
  const stemIndex: number[] = [];
  let stemCount = 0;

  const reachOf = (p: V3): number => Math.hypot(p[0] - bush.x, p[1] - bush.y, p[2] - bush.z) / extent;
  const onRock = (p: V3, lift: number): void => {
    const f = floor(p[0], p[2]) + lift;
    if (p[1] < f) p[1] = f;
  };

  /** A limb's line: it leaves `from` along `d0` and turns to `d1` by its end, never quite straight. `u0` to `u1` is its part of the bush. */
  const path = (from: V3, d0: V3, d1: V3, length: number, steps: number, power: number, kink: number, u0: number, u1: number, lie: boolean): Path => {
    const c: Path = { points: [], tangents: [], length, u: [] };
    const w1 = rng.range(0, 6.283);
    const w2 = rng.range(0, 6.283);
    const s1 = aside(d0, rng.range(0, 6.283));
    const s2 = cross(d0, s1);
    let p: V3 = [from[0], from[1], from[2]];
    for (let i = 0; i <= steps; i++) {
      const v = i / steps;
      const w = v ** power;
      const a = kink * Math.sin(v * 7.3 + w1) * v;
      const b = kink * Math.sin(v * 5.1 + w2) * v;
      const t = unit([d0[0] + (d1[0] - d0[0]) * w + s1[0] * a + s2[0] * b, d0[1] + (d1[1] - d0[1]) * w + s1[1] * a + s2[1] * b, d0[2] + (d1[2] - d0[2]) * w + s1[2] * a + s2[2] * b]);
      if (i > 0) {
        p = [p[0] + (t[0] * length) / steps, p[1] + (t[1] * length) / steps, p[2] + (t[2] * length) / steps];
        // Where it comes down to the rock it lies on it.
        if (lie && v > 0.2) onRock(p, 0.03);
      }
      c.points.push(p);
      c.tangents.push(t);
      c.u.push(u0 + (u1 - u0) * v);
    }
    return c;
  };

  /** The limb itself: a tube that thins toward its end. `flesh` is how pale and swollen it is at its root. */
  const tube = (c: Path, thick: number, thin: number, flesh: number, phase: number, sides: number, still = false): void => {
    const seed = rng.range(1, 90);
    const rings = c.points.length;
    const first = stemCount;
    let side = aside(c.tangents[0] as V3, rng.range(0, 6.283));
    let along = 0;
    for (let i = 0; i < rings; i++) {
      const v = i / (rings - 1);
      const p = c.points[i] as V3;
      const t = c.tangents[i] as V3;
      // The frame is carried along the limb without twist.
      const d = side[0] * t[0] + side[1] * t[1] + side[2] * t[2];
      side = unit([side[0] - t[0] * d, side[1] - t[1] * d, side[2] - t[2] * d]);
      const over = cross(t, side);
      if (i > 0) along += c.length / (rings - 1);
      const r = (thin + (thick - thin) * (1 - v) ** 1.6) * (1 + 0.14 * Math.sin(v * 23 + seed) + 0.08 * Math.sin(v * 61 + seed * 2)) * (1 + 1.3 * flesh * Math.exp(-v * 7));
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const nx = side[0] * Math.cos(a) + over[0] * Math.sin(a);
        const ny = side[1] * Math.cos(a) + over[1] * Math.sin(a);
        const nz = side[2] * Math.cos(a) + over[2] * Math.sin(a);
        // A limb is not turned on a lathe: it is corded and a little flat.
        const rr = r * (1 + 0.2 * Math.sin(a * 2 + seed + v * 4) + 0.1 * Math.sin(a * 3 + seed * 3));
        const q: V3 = [p[0] + nx * rr, p[1] + ny * rr, p[2] + nz * rr];
        stemPosition.push(q[0], q[1], q[2]);
        stemNormal.push(nx, ny, nz);
        stemVane.push(along, k / sides, seed, flesh * (still ? 1 - 0.4 * smooth(0.4, 1, v) : 1 - smooth(0.05, 0.45, v)));
        stemSway.push(still ? 0 : (c.u[i] as number), 0, 0, phase);
        stemTint.push(1, 1, reachOf(q), extent);
      }
    }
    for (let i = 0; i < rings - 1; i++) {
      for (let k = 0; k < sides; k++) {
        const v0 = first + i * sides + k;
        const v1 = first + i * sides + ((k + 1) % sides);
        stemIndex.push(v0, v1, v0 + sides, v1, v1 + sides, v0 + sides);
      }
    }
    stemCount += rings * sides;
  };

  /** One strip: it leaves `a` along `d0`, `long` metres of it, and has turned to `d1` by its end. Returns where its numbers start. */
  const lay = (a: V3, d0: V3, d1: V3, long: number, half: number, tone: number, u0: number, u1: number, tremble: number, phase: number, level: number): number => {
    const at = tA.length;
    // a + b s + c s s: its tangent is b at the root and b + 2 c at the end.
    const b: V3 = [d0[0] * long, d0[1] * long, d0[2] * long];
    const c: V3 = [(d1[0] * long - b[0]) / 2, (d1[1] * long - b[1]) / 2, (d1[2] * long - b[2]) / 2];
    // An end that would go into the rock lies on it.
    const end: V3 = [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]];
    const f = floor(end[0], end[2]) + 0.015;
    if (end[1] < f) c[1] += f - end[1];
    tA.push(a[0], a[1], a[2], half);
    tB.push(b[0], b[1], b[2], tone);
    tC.push(c[0], c[1], c[2], rng.next());
    tSway.push(u0, u1, tremble, phase);
    tTint.push(1, 1, level, 0);
    return at;
  };
  const along = (at: number, s: number): { p: V3; t: V3 } => ({
    p: [(tA[at] as number) + (tB[at] as number) * s + (tC[at] as number) * s * s, (tA[at + 1] as number) + (tB[at + 1] as number) * s + (tC[at + 1] as number) * s * s, (tA[at + 2] as number) + (tB[at + 2] as number) * s + (tC[at + 2] as number) * s * s],
    t: unit([(tB[at] as number) + 2 * (tC[at] as number) * s, (tB[at + 1] as number) + 2 * (tC[at + 1] as number) * s, (tB[at + 2] as number) + 2 * (tC[at + 2] as number) * s]),
  });

  // What every fork of this bush does: how far the wet has combed it the way the bush leans, and how much its ends hang.
  const comb = habit === 'sweep' ? 0.42 : habit === 'hang' ? 0.12 : 0.1;
  const wet = habit === 'hang' ? 1.5 : 1;
  /** Where a fork is heading by its end: on beside its limb, combed, and hanging by `hang`. */
  const heading = (t: V3, d0: V3, hang: number): V3 => unit([0.62 * t[0] + 0.3 * d0[0] + comb * leanDir[0], 0.62 * t[1] + 0.3 * d0[1] - hang * wet, 0.62 * t[2] + 0.3 * d0[2] + comb * leanDir[2]]);
  /** The way a fork leaves a limb: forward, at a narrow angle. */
  const leave = (t: V3, lo: number, hi: number): V3 => {
    const theta = rng.range(lo, hi);
    const n = aside(t, rng.range(0, 6.283));
    return unit([t[0] * Math.cos(theta) + n[0] * Math.sin(theta), t[1] * Math.cos(theta) + n[1] * Math.sin(theta) + 0.08, t[2] * Math.cos(theta) + n[2] * Math.sin(theta)]);
  };

  // A fountain is finer brush than a swept plume: more stalks, shorter hair.
  const long2 = tall * (habit === 'fountain' ? 0.16 : 0.2);
  const half2 = tall * 0.00105 * Math.sqrt(coarse);
  const half3 = tall * 0.0007;
  /** The branchlets along a limb from `v0` of the way, each with its filaments. `scale`: how long they are against the bush's longest. */
  const feather = (c: Path, v0: number, phase: number, scale: number, tone0: number): void => {
    const spacing = 0.016 * tall * coarse;
    const n = Math.max(2, Math.round((c.length * (1 - v0)) / spacing));
    for (let i = 0; i <= n; i++) {
      // The last one is the end of the limb itself, which thins into a branchlet.
      const tip = i === n;
      const v = tip ? 1 : v0 + (1 - v0) * ((i + rng.next()) / n);
      const g = on(c, v);
      const d0 = tip ? g.t : leave(g.t, 0.16, 0.5);
      const L = long2 * scale * rng.range(0.55, 1.25) * (tip ? 1.2 : 1 - 0.35 * v);
      const d1 = heading(g.t, d0, rng.range(0.35, 1.1) + 0.5 * v);
      const tone = Math.min(0.999, Math.max(0, tone0 + rng.range(-0.2, 0.2)));
      const u1 = g.u + 0.22;
      // A branchlet that carries filaments does not tremble on its own: its filaments are rooted on where it is.
      const parent = lay(g.p, d0, d1, L, half2 * rng.range(0.8, 1.25), tone, g.u, u1, close || middle ? -1 : rng.range(0, 6.283), phase, 2);
      if (far) {
        tipAt.push(parent);
        continue;
      }
      const twigs = close ? 3 + Math.floor(rng.next() * 3) : 2;
      for (let k = 0; k < twigs; k++) {
        const s = rng.range(0.05, 0.6);
        const h = along(parent, s);
        const e0 = leave(h.t, 0.08, 0.3);
        const e1 = heading(h.t, e0, rng.range(0.5, 1.5));
        const us = g.u + 0.22 * s;
        const child = lay(h.p, e0, e1, L * rng.range(0.55, 1.0) * (1 - 0.5 * s), half3 * rng.range(0.8, 1.3) * (close ? 1 : 1.5), Math.min(0.999, Math.max(0, tone + rng.range(-0.12, 0.12))), us, us + 0.1, rng.range(0, 6.283), phase, 3);
        if (k === 0) tipAt.push(child);
      }
    }
  };

  const full = bush.full ?? 1;
  const stalks = Math.max(3, Math.round((habit === 'fountain' ? (close ? 30 : middle ? 26 : 13) : habit === 'hang' ? 9 : close ? 11 : middle ? 9 : 7) * full));
  const spread = bush.spread ?? (habit === 'fountain' ? Math.PI : habit === 'hang' ? 0.5 : 0.95);
  for (let m = 0; m < stalks; m++) {
    // From the crown of the bush to its skirt: the first rise and bend over only at their ends, the last go out low and hang.
    const rank = Math.min(1, Math.max(0, (m + rng.range(-0.3, 0.3)) / (stalks - 1)));
    const k = rng.range(-1, 1);
    let el0: number;
    let el1: number;
    let length: number;
    let turn: number;
    if (habit === 'sweep') {
      el0 = 1.3 - 1.0 * rank + rng.range(-0.1, 0.1);
      el1 = -0.35 - 0.55 * rank + rng.range(-0.2, 0.15);
      length = tall * (1.22 - 0.3 * rank) * rng.range(0.8, 1.08);
      turn = 0.3;
    } else if (habit === 'fountain') {
      el0 = 1.4 - 0.65 * rank + rng.range(-0.12, 0.1);
      el1 = -0.55 - 0.55 * rank + rng.range(-0.25, 0.15);
      length = tall * (1.05 - 0.35 * rank) * rng.range(0.7, 1.1);
      turn = 0.85;
    } else {
      el0 = 1.12 - 0.3 * rank + rng.range(-0.1, 0.1);
      el1 = -0.75 - 0.3 * rank + rng.range(-0.15, 0.15);
      length = extent * (1.1 - 0.3 * rank) * rng.range(0.8, 1.1);
      turn = 0.6;
    }
    const az0 = lean + spread * k + rng.range(-0.15, 0.15);
    const az1 = lean + turn * spread * k + rng.range(-0.15, 0.15);
    const d0: V3 = [Math.sin(az0) * Math.cos(el0), Math.sin(el0), -Math.cos(az0) * Math.cos(el0)];
    const d1: V3 = [Math.sin(az1) * Math.cos(el1), Math.sin(el1), -Math.cos(az1) * Math.cos(el1)];
    const out = 0.04 * tall * rng.next();
    const from: V3 = [bush.x + Math.sin(az0) * out, bush.y + 0.02 * tall, bush.z - Math.cos(az0) * out];
    const phase = rng.range(0, 6.283);
    const tone0 = rng.range(0.25, 0.75);
    const stalk = path(from, d0, d1, length, close ? 26 : middle ? 16 : 10, habit === 'fountain' ? rng.range(1.2, 1.9) : habit === 'hang' ? rng.range(2.0, 3.0) : rng.range(1.5, 2.3), rng.range(0.1, 0.22), 0, 1, true);
    const thick = tall * 0.013 * (0.75 + 0.5 * (length / tall)) * rng.range(0.85, 1.15);
    tube(stalk, thick, tall * 0.0012, 1, phase, close ? 9 : middle ? 6 : 4);
    // Its branches: none on the bare foot of the stalk, the longest a third of the way up, shorter to the end, as a feather's.
    const bare = habit === 'hang' ? rng.range(0.3, 0.42) : rng.range(0.06, 0.11);
    const gap = (close ? 0.06 : middle ? 0.085 : 0.13) * (habit === 'fountain' ? 1.3 : 1) * rng.range(0.85, 1.15);
    for (let v = bare; v < 0.97; v += gap * rng.range(0.6, 1.4)) {
      const g = on(stalk, v);
      const e0 = leave(g.t, 0.3, 0.7);
      const e1 = heading(g.t, e0, rng.range(0.3, 0.9) + (habit === 'hang' ? 0.5 : 0));
      const shape = smooth(bare - 0.04, bare + 0.07, v) * (1 - 0.72 * v ** 1.4);
      const bl = length * rng.range(0.26, 0.46) * shape;
      if (bl < 0.03 * tall) continue;
      const branch = path(g.p, e0, e1, bl, close ? 9 : middle ? 6 : 4, rng.range(0.8, 1.4), rng.range(0.05, 0.2), g.u, g.u + (1 - g.u) * 0.6 + 0.1, true);
      const bt = Math.min(thick * 0.5, tall * 0.0034 * (0.5 + 0.5 * shape));
      if (far) {
        // From far off a branch is one more strip.
        const mid = on(branch, 0.5);
        const end = on(branch, 1);
        lay(g.p, unit([mid.p[0] - g.p[0], mid.p[1] - g.p[1], mid.p[2] - g.p[2]]), end.t, bl, half2 * 1.3, tone0, g.u, end.u, -1, phase, 1);
      } else {
        tube(branch, bt, tall * 0.0008, 0, phase, close ? 5 : 4);
      }
      feather(branch, 0.06, phase, 0.55 + 0.45 * shape, tone0);
    }
    // Past its middle the stalk is thin and carries branchlets itself, to its end.
    feather(stalk, habit === 'hang' ? 0.55 : 0.35, phase, 0.8, tone0);
  }
  // The toes of the holdfast: they leave it low, thick as a wrist, and go into the cracks of the rock.
  const toes = close ? 12 : middle ? 6 : 0;
  for (let t = 0; t < toes; t++) {
    const azimuth = ((t + rng.next()) / toes) * Math.PI * 2;
    const from: V3 = [bush.x, bush.y + 0.03 * tall, bush.z];
    const e0 = rng.range(-0.3, 0.05);
    const a1 = azimuth + rng.range(-0.9, 0.9);
    const c = path(from, [Math.sin(azimuth) * Math.cos(e0), Math.sin(e0), -Math.cos(azimuth) * Math.cos(e0)], [Math.sin(a1) * 0.45, -0.9, -Math.cos(a1) * 0.45], tall * rng.range(0.1, 0.2), 12, 0.7, 0.1, 0, 0, false);
    c.points.forEach((p, i) => {
      // It lies on the rock and its end goes into it.
      const f = floor(p[0], p[2]);
      const v = i / 12;
      p[1] = Math.min(Math.max(p[1], f - 0.03 * tall), f + 0.04 * tall * (1 - smooth(0.0, 0.25, v)) - 0.006 * tall) - 0.07 * tall * smooth(0.45, 1, v);
    });
    tube(c, tall * rng.range(0.012, 0.022), tall * 0.002, 0.85, 0, 7, true);
  }

  // The light inside the bush. Every strip is counted into the cell its middle lies in, as the area it shows; from that, what part of the
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
    const ix = Math.min(CELLS - 1, Math.floor(((mid[i * 3] as number) - lox) / cell));
    const iy = Math.min(CELLS - 1, Math.floor(((mid[i * 3 + 1] as number) - loy) / cell));
    const iz = Math.min(CELLS - 1, Math.floor(((mid[i * 3 + 2] as number) - loz) / cell));
    const long = Math.hypot(tB[i * 4] as number, tB[i * 4 + 1] as number, tB[i * 4 + 2] as number);
    // The area a strip hides, seen from the side, for each cubic metre of its cell: the share of light a metre of path through it takes.
    const k = (iz * CELLS + iy) * CELLS + ix;
    dense[k] = (dense[k] as number) + (long * 1.5 * (tA[i * 4 + 3] as number)) / (cell * cell * cell);
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
  const tips: Tip[] = [];
  for (const at of tipAt) {
    const e: V3 = unit([(tB[at] as number) + 2 * (tC[at] as number), (tB[at + 1] as number) + 2 * (tC[at + 1] as number), (tB[at + 2] as number) + 2 * (tC[at + 2] as number)]);
    const x = (tA[at] as number) + (tB[at] as number) + (tC[at] as number);
    const y = (tA[at + 1] as number) + (tB[at + 1] as number) + (tC[at + 1] as number);
    const z = (tA[at + 2] as number) + (tB[at + 2] as number) + (tC[at + 2] as number);
    // A drop gathers at an end that hangs, with air under it.
    if (e[1] > -0.3 || y < floor(x, z) + 0.25) continue;
    const pick = <T extends number[]>(from: number[]): T => [from[at] as number, from[at + 1] as number, from[at + 2] as number, from[at + 3] as number] as T;
    tips.push({ a: pick(tA), b: pick(tB), c: pick(tC), sway: pick(tSway), tint: pick(tTint), under: left(x, y - 0.03, z, 0, -1, 0) });
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
  const sphere = new THREE.Sphere(new THREE.Vector3(bush.x, bush.y + 0.3 * extent, bush.z), 1.9 * extent + 1);
  threads.boundingSphere = sphere;
  const stems = new THREE.BufferGeometry();
  stems.setAttribute('position', new THREE.Float32BufferAttribute(stemPosition, 3));
  stems.setAttribute('normal', new THREE.Float32BufferAttribute(stemNormal, 3));
  stems.setAttribute('aVane', new THREE.Float32BufferAttribute(stemVane, 4));
  stems.setAttribute('aSway', new THREE.Float32BufferAttribute(stemSway, 4));
  stems.setAttribute('aTint', new THREE.Float32BufferAttribute(stemTint, 4));
  stems.setIndex(stemIndex);
  stems.boundingSphere = sphere.clone();
  return { threads, stems, tips, count, root: new THREE.Vector4(bush.x, bush.y, bush.z, bushPhase), tall: extent };
}
