// The grade of the Ribs: what the post does to the place's scene-linear picture. One place for it, read by the unit's index.
import type { Look } from '../../../core/stage';

/** Deep blacks in the rock and silver on the water: more contrast than the neutral grade, a little less colour, a cool slate tint that leaves the one warm light alone. */
export function ribsLook(neutral: Look): Look {
  return { ...neutral, bloom: 0.03, vignette: 0.16, grain: 0.006, contrast: 1.14, saturation: 0.94, tint: [0.985, 1, 1.02] };
}
