// The first spire's baked rock (assets-src/spine/land/bake-hero.mts) and its mesh agree on these: how the baked maps are laid on the blade.
// u of a map is the way round the blade's section (0 and 1 the lee edge, 0.5 the windward edge); v is its height, closer where the lens of
// the kites is. Nothing here touches a browser: the bake runs it in node.
import { FIN_DEEP, FIN_ROOT, FIN_SECTION, fin, first, type Spire } from '../ridge';

/** Heights over the spire's foot, metres, and the share of the maps' rows each stands at: most rows where the lens comes close. */
export const HERO_Y: readonly number[] = [-320, 0, 174, 270, 300];
export const HERO_V: readonly number[] = [0, 0.14, 0.46, 0.87, 1];

/** A height over the foot to a map's v. */
export function heroV(y: number): number {
  for (let i = 1; i < HERO_Y.length; i++) {
    if (y <= (HERO_Y[i] as number) || i === HERO_Y.length - 1) {
      const a = HERO_Y[i - 1] as number;
      const b = HERO_Y[i] as number;
      const k = Math.min(1, Math.max(0, (y - a) / (b - a)));
      return (HERO_V[i - 1] as number) + ((HERO_V[i] as number) - (HERO_V[i - 1] as number)) * k;
    }
  }
  return 1;
}

/** A map's v to a height over the foot. */
export function heroYOf(v: number): number {
  for (let i = 1; i < HERO_V.length; i++) {
    if (v <= (HERO_V[i] as number) || i === HERO_V.length - 1) {
      const a = HERO_V[i - 1] as number;
      const b = HERO_V[i] as number;
      const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
      return (HERO_Y[i - 1] as number) + ((HERO_Y[i] as number) - (HERO_Y[i - 1] as number)) * k;
    }
  }
  return HERO_Y[HERO_Y.length - 1] as number;
}

/** The blade's section at a height over its foot: half its breadth, half its depth on the far face and on the mouth's, where its middle is. */
export function heroSection(sp: Spire, y: number): { half: number; thickBack: number; thickFront: number; centre: number } {
  const p = fin(sp, (y + FIN_ROOT) / (sp.tip + FIN_ROOT));
  return { half: p.half, thickBack: 0.6 * p.thick, thickFront: p.thick, centre: p.centre };
}

/** A point of the section, q of the way round it (0 the lee edge), in metres across and through the blade from its middle. */
export function sectionAt(q: number, half: number, thickBack: number, thickFront: number): [number, number] {
  const th = 2 * Math.PI * q;
  const c = Math.cos(th);
  const k = Math.sin(th);
  return [Math.sign(c) * Math.pow(Math.abs(c), 2 / FIN_SECTION) * half, Math.sign(k) * Math.pow(Math.abs(k), 2 / FIN_SECTION) * (k >= 0 ? thickBack : thickFront)];
}

/**
 * The way round the section in metres, measured from the lee edge: positive round the far face, negative round the face with the mouth.
 * `n` columns; the result has n + 1 entries, the last being the first again (the lee edge) from the other side.
 */
export function sectionArcs(n: number, half: number, thickBack: number, thickFront: number): Float32Array {
  const out = new Float32Array(n + 1);
  let prev = sectionAt(0, half, thickBack, thickFront);
  let sum = 0;
  const run = new Float32Array(n + 1);
  for (let i = 1; i <= n; i++) {
    const p = sectionAt(i / n, half, thickBack, thickFront);
    sum += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    run[i] = sum;
    prev = p;
  }
  const mid = n >> 1;
  for (let i = 0; i <= n; i++) out[i] = i <= mid ? (run[i] as number) : (run[i] as number) - sum;
  return out;
}

/** How far the plates of the rock run to windward for a metre of height: the lean of the lee edge between the canal's roof and the tip. */
export const HERO_LEAN = 0.85;

/**
 * Where the first spire's face is across the blade, metres, q of the way round its section at a height over its foot: the section's own
 * outline, and on the windward side the notch of the plate that ends there (`back`, metres: how far short of the edge it has broken off).
 */
export function heroAcross(sp: Spire, q: number, y: number, back: number): number {
  const p = fin(sp, (y + FIN_ROOT) / (sp.tip + FIN_ROOT));
  const c = Math.cos(2 * Math.PI * q);
  const ln = Math.sign(c) * Math.pow(Math.abs(c), 2 / FIN_SECTION);
  const edge = p.centre + ln * p.half;
  return ln < 0 ? edge + Math.min(0.5 * p.half, back) * Math.pow(-ln, 2.5) * Math.min(1, Math.max(0, (sp.tip - y) / 24)) : edge;
}

/** Which plate of the rock a place is on, by where the plates begin: `from` ascending. */
export function plateAt(from: readonly number[], l: number, y: number): number {
  const s = l + HERO_LEAN * y;
  let lo = 0;
  let hi = from.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((from[mid] as number) <= s) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** The rings of the first spire's mesh: so many under the crest and over it, closer where the lens of the kites is on the face. */
export const HERO_DOWN = 50;
export const HERO_UP = 230;
export const RING_LOW = 0.58;
export const RING_HIGH = 0.9;
export const RING_DENSE = 2.5;
/** How high on the first spire a ring stands (0 the crest, 1 the tip) for how far up the count of rings it is: closest where the kites roost. */
export function ringAt(g: number): number {
  const whole = RING_LOW + RING_DENSE * (RING_HIGH - RING_LOW) + (1 - RING_HIGH);
  const w = g * whole;
  if (w < RING_LOW) return w;
  if (w < RING_LOW + RING_DENSE * (RING_HIGH - RING_LOW)) return RING_LOW + (w - RING_LOW) / RING_DENSE;
  return RING_HIGH + (w - RING_LOW - RING_DENSE * (RING_HIGH - RING_LOW));
}
/** Where along the blade (the `t` of `fin`) ring k of the first spire's mesh stands. */
export function heroRingT(sp: Spire, k: number): number {
  const tall = sp.tip + FIN_ROOT;
  const t0 = FIN_ROOT / tall;
  const tLow = -(FIN_DEEP - FIN_ROOT) / tall;
  return k < HERO_DOWN ? tLow + (t0 - tLow) * Math.pow(k / HERO_DOWN, 0.7) : t0 + (1 - t0) * ringAt((k - HERO_DOWN) / HERO_UP);
}

export const hero = first;
