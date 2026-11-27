// The grade of the Ribs: what the post does to the place's scene-linear picture. One place for it, read by the unit's index.
import type { Look } from '../../../core/stage';

/** Silver on the water and slate in the shade: a little more contrast than the neutral grade (the pictures' blacks are open: their darkest twentieth stands at 18 to 45 of 255), a little less colour, a faint cool tint that leaves the one warm light alone. */
export function ribsLook(neutral: Look): Look {
  return { ...neutral, bloom: 0.03, vignette: 0.16, grain: 0.006, contrast: 1.06, saturation: 0.96, tint: [0.99, 1, 1.015] };
}
