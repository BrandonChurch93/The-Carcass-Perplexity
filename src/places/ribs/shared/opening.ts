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
 * How far the cloud is shut over the blades. The restaged opening has no shut cloud: the blades stand pale in the sun's shaft under a
 * dark sky from the first frame. Kept so that whoever read it reads nothing.
 */
export function cloudShut(_seconds: number): number {
  return 0;
}

/** 1 as the film opens, 0 from OPENING_END on and outside the approach: the weight of whatever eases back over the whole approach. */
export function openingWeight(seconds: number): number {
  return inOpening() ? 1 - smooth(0, OPENING_END, seconds) : 0;
}

/** How dark the near blade stands against the break. The restaged opening has no black blade: nothing, always. */
export function openingDark(_seconds: number): number {
  return 0;
}

/** The light of the break as the film opens: it comes up through the first two seconds, and goes with the dark. 0 outside the approach. */
export function openingLight(seconds: number): number {
  return inOpening() ? (0.6 + 0.4 * smooth(0, 2, seconds)) * (1 - smooth(2.6, 7.6, seconds)) : 0;
}

// ---- The staging of the restaged opening: the facts every folder keys off. World metres and seconds of the place (the film's first frame is 0). ----
// The lens itself is `openingCamera(seconds)` and `approachEye(seconds)` in ../cameras: it opens at (600, 880), 0.8 m up in a trough of a
// heavy swell and 290 m off the near flank of the outer right blade (OR), looking north-west (yaw -30 degrees, 13 degrees up) on a 29.5
// degree lens (50 degrees wide), and slews 5 degrees left onto its mark through the first 2.4 s. It runs 40 degrees west of north at
// 86 m/s and rides the long swell: lifted to 7.7 m at 1.5 s, down to 3.0 m over the next trough at 3.0 s (it follows the water down only a third of the way there: OPEN.floor), up to 7.7 m again at 5.7 s, and
// so on, slowing onto the old move (its own from 16 s) and crossing the shore's edge at x = -190 at 13.2 s.
// In the first frame OR is a dark wall over the right four tenths of the frame, L1 stands pale in the left third from the sea to a quarter
// from the top, and the far cage stands between them. OR is gone through the right edge at 1.9 s and R1 has come out from behind it. The
// tip of L1 is inside the frame until 3.5 s; R1's until 10 s. The lens widens from 3 s to 10 s.

/**
 * The strike: a heavy swell breaks on the shore's edge before the seaward foot of the near blade. `foot` is the middle of the burst (on
 * the line from the lens to L1's foot the whole way in from the east: a sixth in from the left edge of the first frame and 790 m from
 * the lens, a quarter in at 1 s, a fifth in at 4 s, and from 5 s it slides right against the blade as the lens sweeps west, out of the
 * right edge at 9.3 s), `half` its half length along the shore (x), `times` the seconds its water first leaves the sea, `height` the
 * metres the first burst climbs (a quarter of the frame's height in the first second; L1 is 430 m), `rises` the seconds its head takes
 * to stand at full height (thrown water slowed by the air, not a stone), `hangs` the seconds from leaving the sea to all of it being
 * down, and `lesser` the second burst's height as a part of the first.
 * The first burst left the sea before the film opens: the crest ahead of the lens hides the shore in the first frame, the lens is lifted
 * over it, and the burst comes up over the crest already climbing and stands at its full height at 0.9 s, inside the first second.
 * The second goes up through its fall. The lens passes 141 m south of `foot` at 9.2 s: the first burst is down by then and the second
 * is thin air, off to the right.
 * The sun is behind the lens' left shoulder: the burst is lit from the front, pale against the blade's shaded foot and the dark sky.
 */
export const STRIKE = {
  blade: 'L1',
  foot: [25, 0, 335] as [number, number, number],
  half: 60,
  times: [-1.2, 2.8] as [number, number],
  height: 100,
  rises: 2.1,
  hangs: 9,
  lesser: 0.6,
};

/** Seconds since strike `n` (0 or 1) left the sea, negative before it. */
export function strikeAge(seconds: number, n: 0 | 1): number {
  return seconds - STRIKE.times[n];
}

/**
 * The flock: kite-wings peel off the seaward face of L1 and stream across the frame toward the gap and R1, from before the first frame
 * (the stream is already 300 m long at frame 0) until `until`. `from` is the ledge they leave (on L1's south-east face, 150 m up),
 * `toward` the point they make for (high in the gap between the tips, over the strait), `speed` their metres a second, `swirl` the middle
 * of the many small ones that turn round the tips. All of it stays north of z = 300 and over 60 m up: the lens passes under it.
 */
export const FLOCK = {
  from: [-235, 150, 70] as [number, number, number],
  toward: [140, 230, -330] as [number, number, number],
  speed: 22,
  began: -14,
  until: 12,
  swirl: [-128, 440, -200] as [number, number, number],
};

/**
 * The shaft: the one break of low sun. It lies on the seaward face of L1 and the water before its foot from before the first frame,
 * `radius` metres wide on the ground, holds there until `stays`, and has walked to the film's own break by OPENING_END.
 * The sun stands behind the lens (SUN.toward is south and 38 degrees up), so a face turned to the sea is lit flat on and warm.
 */
export const SHAFT_TARGET = { x: -300, z: 230, radius: 260, stays: 7 };

/** A shader of the approach alone: the film's text with pieces of it swapped. The film's own text is not touched, and is what every later frame is drawn with. */
export function openingText(film: string, swaps: readonly (readonly [string, string])[]): string {
  let text = film;
  for (const [from, to] of swaps) {
    if (!text.includes(from)) throw new Error(`The approach's shader has no piece "${from}"`);
    text = text.split(from).join(to);
  }
  return text;
}
