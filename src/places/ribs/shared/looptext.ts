// The card loop's shader texts. Nothing is imported here, so a shader file may use it while it is being read.
/**
 * The card loop's text of a shader, made from the film's: each piece named is replaced, and a piece that is not there is an error.
 * The film's text is never touched, so no frame of the film can change with what the loop asks of its water.
 */
export function loopText(film: string, swaps: readonly (readonly [string, string])[]): string {
  let text = film;
  for (const [from, to] of swaps) {
    if (!text.includes(from)) throw new Error(`The loop's shader has no piece "${from}"`);
    text = text.split(from).join(to);
  }
  return text;
}

/** In a loop's shader: the angle a wave of `rate` radians a second stands at, with `turns` whole turns a loop. uLoop is the seconds of the first frame and the phase. */
export const loopAngle = (rate: string, turns: number): string => `(uLoop.x * ${rate} + ${(turns * Math.PI * 2).toFixed(6)} * uLoop.y)`;
