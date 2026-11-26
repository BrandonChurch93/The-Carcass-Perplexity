// Where the storm's things stand, read from the root's anchors: the six strikes with their targets, and the span of a shot.
import type { Vec3 } from '../../../core/cameras';
import { secondsInPlace, shotById } from '../../../film/cut';
import { STRIKES as SECONDS, STRIKE_IDS, STRIKE_TARGETS, UNIT, spire, strikeStand, strikeTip } from '../shared/anchors';
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

/** Where each channel leaves the cloud, set for the lens that sees it: how high over the tip, and where its top stands from the tip.
 * The root is in the frame wherever the lens allows, so that the cloud it lights is seen. Null keeps what the anchors give. */
// The fourth comes down toward the long lens that watches it and from its left: the flank the lens sees then faces the channel and takes
// its light, where a channel that stood behind the tip left that flank black.
const toLens = ((): Vec3 => {
  const x = strikeStand[0] - strikeTip[0];
  const z = strikeStand[2] - strikeTip[2];
  const l = Math.hypot(x, z) || 1;
  return [x / l, 0, z / l];
})();
const ROOTS: readonly ({ rise: number; lean: Vec3 } | null)[] = [
  { rise: 300, lean: [350, 0, 150] },
  null,
  null,
  { rise: 420, lean: [toLens[0] * 230 + toLens[2] * 110, 0, toLens[2] * 230 - toLens[0] * 110] },
  null,
  null,
];

export const STRIKES: StrikeSite[] = STRIKE_IDS.map((id, i) => {
  const given = STRIKE_TARGETS[i % STRIKE_TARGETS.length] as (typeof STRIKE_TARGETS)[number];
  const root = ROOTS[i % ROOTS.length] ?? null;
  const t = root ? { ...given, rise: root.rise, lean: root.lean } : given;
  // The channel ends a little inside the rock, so that the hot spot sits on the broken top and not over it.
  const to: Vec3 = [t.to[0], t.to[1] - SINK, t.to[2]];
  return { id, seconds: SECONDS[i] as number, to, rise: t.rise, lean: t.lean, branch: t.branch, spire: whichSpire(t.to) };
});

/** The span of a shot in seconds of the place, a little wide so that every sample of its frames is inside. */
export const during = (shot: string): { from: number; to: number } => {
  const s = shotById(shot);
  return { from: secondsInPlace(UNIT, s.first) - 0.3 / 60, to: secondsInPlace(UNIT, s.last) + 0.7 / 60 };
};
