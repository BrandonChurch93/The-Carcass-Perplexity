// The staging of the approach (the film's first shot, ribs-01): the weather the camera comes in through. Everything here is a function of the
// seconds of the place, and all of it is exactly nothing from the last frame of the approach on: the strait's shot runs on in the same move,
// in the place's own light. Whoever stages for the approach reads its weights here and branches on zero.
import { shotSpan } from './anchors';
import { loopPhase, stagedSeconds } from './stage';

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

let span: { from: number; to: number } | null = null;

/** True while the camera stands in the approach (never in the card loop). */
export function inOpening(): boolean {
  if (loopPhase() !== null) return false;
  span ??= shotSpan('ribs-01');
  const staged = stagedSeconds();
  return staged >= span.from && staged < span.to;
}

/** The seconds every staging of the approach has gone back to the place's own by: frame 960 of 1041. */
export const OPENING_END = 16;

/**
 * How far the cloud is shut over the blades: 1 as the film opens (the blades stand in its shade, dark against the break behind them),
 * and it opens as the camera closes, to nothing by 14 seconds. 0 outside the approach.
 */
export function cloudShut(seconds: number): number {
  return inOpening() ? 1 - smooth(1.5, 14, seconds) : 0;
}

/** 1 as the film opens, 0 from OPENING_END on and outside the approach: the weight of whatever eases back over the whole approach. */
export function openingWeight(seconds: number): number {
  return inOpening() ? 1 - smooth(0, OPENING_END, seconds) : 0;
}

/**
 * How dark the near blade stands against the break as the film opens: 1 through the first two seconds, the air before it clear, and the
 * place's own light is back by the eighth second. 0 outside the approach.
 */
export function openingDark(seconds: number): number {
  return inOpening() ? 1 - smooth(2.6, 7.6, seconds) : 0;
}

/** The light of the break as the film opens: it comes up through the first two seconds, and goes with the dark. 0 outside the approach. */
export function openingLight(seconds: number): number {
  return inOpening() ? (0.6 + 0.4 * smooth(0, 2, seconds)) * (1 - smooth(2.6, 7.6, seconds)) : 0;
}

/** A shader of the approach alone: the film's text with pieces of it swapped. The film's own text is not touched, and is what every later frame is drawn with. */
export function openingText(film: string, swaps: readonly (readonly [string, string])[]): string {
  let text = film;
  for (const [from, to] of swaps) {
    if (!text.includes(from)) throw new Error(`The approach's shader has no piece "${from}"`);
    text = text.split(from).join(to);
  }
  return text;
}
