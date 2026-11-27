// The fracture model of the first spire's rock, shared by its mesh (meshes.ts) and its bake (assets-src/spine/land/bake-hero.mts).
// The rock is cut by planes that run the whole lean of the blade into tall plates; rare cross joints cut each plate into slabs, and each
// slab stands in or out of the blade by some metres and is turned a little about the lean. Where a place is on the plates is `p`: how far
// across the blade it is (toward the lee) plus the lean times its height over the foot. Nothing here touches a browser.
import { FIN_ROOT, fin } from '../ridge';
import { HERO_LEAN, HERO_Y, hero } from './heroShape';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash2 = (x: number, y: number): number => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
export function vn(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return (hash2(xi, yi) * (1 - u) + hash2(xi + 1, yi) * u) * (1 - v) + (hash2(xi, yi + 1) * (1 - u) + hash2(xi + 1, yi + 1) * u) * v;
}

export interface Flake {
  p0: number;
  p1: number;
  y0: number;
  y1: number;
  th: number;
}
export interface Slab {
  h: number;
  tx: number;
  ty: number;
  mid: number;
  ym: number;
  tone: number;
  id: number;
  flakes: Flake[];
}
/** A strip of a plate: the plate has split again along its length, and each strip stands a hand to a metre out of the next, in rungs. */
export interface Strip {
  /** Where it begins and ends across its plate, 0 to 1. */
  f0: number;
  f1: number;
  /** Heights over the foot where it steps, ascending, and how far it stands out of its slab's face over each (one more than the steps). */
  cuts: number[];
  /** How each step runs across the strip: metres up for a metre to the lee. */
  dips: number[];
  out: number[];
  /** How it is turned about the lean: metres out for a metre to the lee. No two strips face the same way, so one takes the light and the next is in shade. */
  tilt: number;
  tone: number;
  id: number;
}
export interface Plate {
  strips: Strip[];
  b0: number;
  b1: number;
  phase: number;
  /** How far short of the windward edge of the blade the plate has broken off, metres. */
  back: number;
  cuts: number[];
  dips: number[];
  slabs: Slab[];
}

const SPAN = 700;
export const PLATES: Plate[] = [];
{
  const R = rng(7015);
  let s = -SPAN;
  let id = 1;
  let phase = R() * 6.28;
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
      dips.push((R() - 0.5) * 0.9);
      // Cross joints are rare: a slab is 60 to 240 m long.
      y += 60 + 180 * R() * R() + 40 * R();
    }
    cuts.push(y);
    dips.push(0);
    const slabs: Slab[] = [];
    const mid = 0.5 * (b0 + b1);
    for (let j = 0; j < cuts.length - 1; j++) {
      const ym = 0.5 * ((cuts[j] as number) + (cuts[j + 1] as number));
      const flakes: Flake[] = [];
      const count = wide > 7 ? Math.floor(R() * 3.6) : 0;
      for (let f = 0; f < count; f++) {
        const fw = wide * (0.25 + 0.5 * R());
        const left = R() < 0.5;
        const long = 8 + 46 * R();
        const fy = (cuts[j] as number) + R() * Math.max(1, (cuts[j + 1] as number) - (cuts[j] as number) - long);
        flakes.push({ p0: left ? b0 - 1 : b1 - fw, p1: left ? b0 + fw : b1 + 1, y0: fy, y1: fy + long, th: 0.25 + 0.6 * R() * R() });
      }
      slabs.push({
        // Groups of plates stand out together as buttresses; within a group each stands a metre to five in or out of the next.
        h: 5 * (vn(mid / 60 + 3.3, ym / 150 + 1.7) - 0.5) + (R() - 0.45) * (wide < 7 ? 2.2 : 5.5),
        // No two slabs face the same way: each is turned some degrees about the lean, so one takes the light and the next is in shade.
        tx: (R() - 0.5) * 2 * Math.min(0.38, 4.5 / wide),
        ty: (R() - 0.5) * 0.08,
        mid,
        ym,
        // Whole companies of slabs are of one rock: grey here, split and tan there.
        tone: Math.min(1, Math.max(0, 0.5 + 1.7 * (vn(mid / 75 + 8.1, ym / 170 + 2.9) - 0.5) + 0.3 * (R() - 0.5))),
        id: 1 + ((id * 37) % 254),
        flakes,
      });
      id++;
    }
    const back = R() < 0.45 ? 3 * R() : 5 + 13 * R();
    // Its strips: of no two breadths, a stride and a half to six; here and there two stand level and are one.
    const strips: Strip[] = [];
    let at = 0;
    let level = (R() - 0.5) * 0.6;
    while (at < wide - 0.01) {
      let w = 1.6 + 4.4 * R() * R() + (R() < 0.25 ? 3 : 0);
      if (wide - at - w < 1.6) w = wide - at;
      if (R() < 0.55) level = (R() - 0.5) * 3.4;
      const sc: number[] = [];
      const sd: number[] = [];
      const so: number[] = [level];
      let sy = -420 + 80 * R();
      let stand = level;
      while (sy < 420) {
        sc.push(sy);
        sd.push((R() - 0.5) * 1.6);
        // Going up, a strip mostly steps back: the ledge at the head of each rung is turned to the sky and holds snow.
        stand += (R() < 0.7 ? -1 : 1) * (0.25 + 0.75 * R());
        if (Math.abs(stand - level) > 1.3) stand = level + (R() - 0.5) * 0.6;
        so.push(stand);
        sy += 9 + 60 * R() * R();
      }
      strips.push({ f0: at / wide, f1: Math.min(1, (at + w) / wide), cuts: sc, dips: sd, out: so, tilt: (R() - 0.5) * 2 * Math.min(0.4, 1.6 / w), tone: (R() - 0.5) * 0.08, id: Math.floor(R() * 254) + 1 });
      at += w;
    }
    PLATES.push({ strips, b0, b1, phase, back, cuts, dips, slabs });
    phase = R() * 6.28;
    s = b1;
  }
}
const phaseAt = (k: number): number => (k < PLATES.length ? (PLATES[k] as Plate).phase : 1.7);
const widthAt = (k: number): number => (k >= 0 && k < PLATES.length ? (PLATES[k] as Plate).b1 - (PLATES[k] as Plate).b0 : 20);
// How far a joint may stray from its line: far between broad plates, a hand by a narrow one.
const reachAt = (k: number): number => Math.min(2.6, Math.max(0.3, 0.12 * Math.min(widthAt(k - 1), widthAt(k))));
const boundAt = (k: number): number => (k < PLATES.length ? (PLATES[k] as Plate).b0 : (PLATES[PLATES.length - 1] as Plate).b1);

/** Where plate k begins at a height: its plane is not ruled, it wanders a stride either way. */
export function plateEdge(k: number, y: number): number {
  const f = phaseAt(k);
  // A joint is never ruled: it wanders, and where a piece has come away it jogs a stride or two to one side and runs on.
  const c = (y + 37 * f) / (17 + 3 * f);
  const ci = Math.floor(c);
  const u = Math.min(1, (c - ci) * 9);
  const jog = (hash2(k, ci - 1) - 0.5) * (1 - u) + (hash2(k, ci) - 0.5) * u;
  return boundAt(k) + reachAt(k) * (0.5 * Math.sin(y / 41 + f) + 0.22 * Math.sin(y / 13 + 2.3 * f) + 1.1 * jog);
}

/** Which plate a place is on. */
export function plateOf(p: number, y: number): number {
  let lo = 0;
  let hi = PLATES.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (plateEdge(m, y) <= p) lo = m;
    else hi = m - 1;
  }
  return lo;
}

/** Which slab of plate k a place is on. */
export function slabOf(k: number, p: number, y: number): number {
  const pl = PLATES[k] as Plate;
  const mid = 0.5 * (pl.b0 + pl.b1);
  let j = 0;
  while (j < pl.slabs.length - 1 && (pl.cuts[j + 1] as number) + (pl.dips[j + 1] as number) * (p - mid) < y) j++;
  return j;
}

/** How far a slab's face stands out of the blade at a place, metres. */
export const slabStand = (q: Slab, p: number, y: number): number => q.h + q.tx * (p - q.mid) + q.ty * (y - q.ym);

/** Which strip of plate k a place is on. */
export function stripOf(k: number, p: number, y: number): number {
  const pl = PLATES[k] as Plate;
  const a = plateEdge(k, y);
  const f = (p - a) / (plateEdge(k + 1, y) - a);
  let j = 0;
  while (j < pl.strips.length - 1 && (pl.strips[j] as Strip).f1 <= f) j++;
  return j;
}

/** How far a strip stands out of its slab's face at a height. */
export function stripStand(pl: Plate, t: Strip, p: number, y: number): number {
  const off = p - (pl.b0 + 0.5 * (t.f0 + t.f1) * (pl.b1 - pl.b0));
  let i = 0;
  while (i < t.cuts.length && (t.cuts[i] as number) + (t.dips[i] as number) * off < y) i++;
  return (t.out[i] as number) + t.tilt * off;
}

/** The rock's face at a place on plate k, strip j: how far it stands out of the blade, its tone and its number. */
export function faceAt(k: number, j: number, p: number, y: number): { stand: number; tone: number; id: number } {
  const pl = PLATES[k] as Plate;
  const q = pl.slabs[slabOf(k, p, y)] as Slab;
  const t = pl.strips[j] as Strip;
  return { stand: slabStand(q, p, y) + stripStand(pl, t, p, y), tone: Math.min(1, Math.max(0, q.tone + t.tone)), id: q.id };
}

/** A column of the first spire's mesh: a line up the lean on plate k, `part` of the way across it (0 and 1 are its two edges). */
export interface HeroColumn {
  k: number;
  j: number;
  part: number;
  /** 0 a column inside a strip, -1 the one a hand inside its windward edge, 1 inside its lee edge. */
  side: number;
}

// The mesh has a column a hand inside each edge of each strip of each plate (so the step from one to the next is a wall between two
// columns) and columns every 4.5 m or less between.
const INSET = 0.1;
/** Where a column is at a height. */
export function columnAt(c: HeroColumn, y: number): number {
  const a = plateEdge(c.k, y);
  const b = plateEdge(c.k + 1, y);
  return a + (b - a) * c.part - c.side * INSET;
}

/** The blade's windward and lee edges on the plates at a height over the foot. */
function reach(y: number): [number, number] {
  const f = fin(hero, (y + FIN_ROOT) / (hero.tip + FIN_ROOT));
  return [f.centre - f.half + HERO_LEAN * y, f.centre + f.half + HERO_LEAN * y];
}
/** The plates the blade has, from the lowest row of the maps to the tip: `HERO_P[0]` to `HERO_P[1]`. */
export const HERO_P: [number, number] = [1e9, -1e9];
for (let y = HERO_Y[0] as number; y <= hero.tip; y += 4) {
  const [a, b] = reach(y);
  HERO_P[0] = Math.min(HERO_P[0], a - 4);
  HERO_P[1] = Math.max(HERO_P[1], b + 4);
}
/** The columns of one face, from windward to lee. */
export const HERO_COLUMNS: HeroColumn[] = [];
for (let k = plateOf(HERO_P[0], 0); k <= plateOf(HERO_P[1], 0); k++) {
  const pl = PLATES[k] as Plate;
  pl.strips.forEach((t, j) => {
    const n = Math.max(1, Math.ceil(((t.f1 - t.f0) * (pl.b1 - pl.b0)) / 4.5));
    for (let i = 0; i <= n; i++) HERO_COLUMNS.push({ k, j, part: t.f0 + ((t.f1 - t.f0) * i) / n, side: i === 0 ? -1 : i === n ? 1 : 0 });
  });
}
