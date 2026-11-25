// The stage clock of the Heart.
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
