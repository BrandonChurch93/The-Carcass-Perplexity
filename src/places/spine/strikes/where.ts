// Where the storm's things stand, read from the root's anchors: the six strikes with their targets, and the span of a shot.
import type { Vec3 } from '../../../core/cameras';
import { secondsInPlace, shotById } from '../../../film/cut';
import { STRIKES as SECONDS, STRIKE_IDS, STRIKE_TARGETS, UNIT, spire } from '../shared/anchors';
import { tipOf } from '../ridge';

export interface StrikeSite {
  id: string;
  seconds: number;
  to: Vec3;
  /** How far up the channel enters the cloud, metres over the tip. */
  rise: number;
  /** Where the top of the channel stands from the tip, or null for the storm's side. */
  lean: Vec3 | null;
  /** A second tip the bolt forks to, or null. */
  branch: Vec3 | null;
  /** Which spire is struck, counted from the first, or 0 when it is none of the near six. */
  spire: number;
}

/** How far under a spire's highest point the channel comes to ground, metres. */
const SINK = 0.4;

const whichSpire = (to: Vec3): number => {
  for (let n = 1; n <= 8; n++) {
    const t = tipOf(spire(n));
    if (Math.hypot(t[0] - to[0], t[2] - to[2]) < 1) return n;
  }
  return 0;
};

export const STRIKES: StrikeSite[] = STRIKE_IDS.map((id, i) => {
  const t = STRIKE_TARGETS[i % STRIKE_TARGETS.length] as (typeof STRIKE_TARGETS)[number];
  // The channel ends a little inside the rock, so that the hot spot sits on the broken top and not over it.
  const to: Vec3 = [t.to[0], t.to[1] - SINK, t.to[2]];
  return { id, seconds: SECONDS[i] as number, to, rise: t.rise, lean: t.lean, branch: t.branch, spire: whichSpire(t.to) };
});

/** The span of a shot in seconds of the place, a little wide so that every sample of its frames is inside. */
export const during = (shot: string): { from: number; to: number } => {
  const s = shotById(shot);
  return { from: secondsInPlace(UNIT, s.first) - 0.3 / 60, to: secondsInPlace(UNIT, s.last) + 0.7 / 60 };
};
