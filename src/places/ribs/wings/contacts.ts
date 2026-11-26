// Where and when the animals of the shore break the water: every foot and every tuft that stands in a pool, from the time of the place alone.
// The wings folder sets `at` when it is created; whoever draws the water's answer (rings, crowns) reads it.

export interface Contact {
  /** Where it breaks the surface. */
  x: number;
  z: number;
  /** 0 a foot, 1 a tuft of strands. */
  kind: 0 | 1;
  /** The metres across of what stands in the water there. */
  wide: number;
  /** Seconds since it came down through the surface, to a second and a half; -1 if it is out of the water. */
  since: number;
  /** Seconds since it was lifted out, to a second and a half; -1 if it is in the water or has been out longer. */
  out: number;
  /** Metres a second it moves over the water now: a tuft working the pool, a foot dragged. */
  speed: number;
}

/** The most contacts `at` fills. */
export const MAX_CONTACTS = 96;

/** Fills `out` from its start and returns how many it filled. In the card loop it is a function of the loop's phase, as every animal is. */
export const CONTACTS: { at: ((seconds: number, out: Contact[]) => number) | null } = { at: null };
