// The stage clock of the Ribs.
// Staging by shot (which animals stand where, which smoke is up, which stones are on the set, which light is lit) follows the camera, not the world.
// In the film the two are one clock. They part in two places: a camera held on one frame while the world runs on (the held view of the motion check), and the loop of the card, whose world runs across two cuts of the film.
// There the staging stays that of the frame the camera stands in, so that nothing is swapped in front of a camera that has not cut.
let staged = 0;

/** Set by the place before its pieces take the time: the seconds of the place that the camera stands at. */
export function setStaged(seconds: number): void {
  staged = seconds;
}

/** The seconds of the place to test a shot's span against. Every test of staging by shot reads this, never the world's seconds. */
export function stagedSeconds(): number {
  return staged;
}

let loop: number | null = null;

/** Set by the place before its pieces take the time: the phase of the card loop, 0 to 1, or null in the film. */
export function setLoopPhase(phase: number | null): void {
  loop = phase;
}

/** Null in the film. In the card loop, its phase: the same number for a frame and for the frame one loop length earlier, so what is set from it comes round. */
export function loopPhase(): number | null {
  return loop;
}
