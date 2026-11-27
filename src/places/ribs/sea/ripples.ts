// The small waves the wind raises on the film of water that lies over the flat: a field of travelling ripples computed where it is
// asked for, from the place and the time alone. No picture is read: each wave runs at the pace of its own length (short ones on
// the skin of the water, long ones on its depth), so the pattern never repeats and never slides as one sheet.
import { WIND } from '../shared/anchors';

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : v.toFixed(5));

/** Metres of water the long ripples feel under them, and the pull of the water's skin over its weight (m3/s2). */
const UNDER = 0.05;
const SKIN = 7.4e-5;
/** The pace of every wave against the true one: a flat seen from a few metres is slow water. */
const PACE = 0.8;
/**
 * One crossing pair for each length: metres from crest to crest, the slope of each wave of the pair, and the degrees either wave runs
 * off the wind's way. The two cross, so crests are short and lie in diamonds, and their beat sends them out in packets.
 */
const PAIRS: readonly [number, number, number, number][] = [
  [1.31, 0.022, -38, 19],
  [0.72, 0.032, 33, -14],
  [0.39, 0.044, -22, 41],
  [0.22, 0.055, 12, -44],
  [0.12, 0.06, -35, 27],
  [0.066, 0.055, 47, -9],
];

interface Wave {
  kx: number;
  kz: number;
  /** The wave comes in groups a few crests long and a few wide: the vector the groups lie along. */
  gx: number;
  gz: number;
  rate: number;
  slope: number;
  phase: number;
}
const WAVES: Wave[] = PAIRS.flatMap(([length, slope, a, b], n) =>
  [a, b].map((degrees, m) => {
    // The second of a pair is a little shorter than the first: their beat is not a standing one.
    const k = ((Math.PI * 2) / length) * (m === 0 ? 1 : 1.17);
    const angle = Math.atan2(WIND.to[1], WIND.to[0]) + (degrees * Math.PI) / 180;
    const group = angle + ((m === 0 ? 63 : -71) * Math.PI) / 180;
    return { kx: Math.cos(angle) * k, kz: Math.sin(angle) * k, gx: (Math.cos(group) * k) / 4.3, gz: (Math.sin(group) * k) / 4.3, rate: PACE * Math.sqrt(9.81 * k * Math.tanh(k * UNDER) + SKIN * k * k * k), slope, phase: ((n * 2 + m) * 2.399963) % (Math.PI * 2) };
  }),
);

/**
 * `flatRipple(p, t, footX, footY)`: p in metres on the flat, t the seconds of the place, footX and footY the pixel's foot on the water
 * (dFdx and dFdy of p, taken once at the top of main). x, y: the slope of the water there. z: the mean square of the slopes too fine
 * for the pixel to hold. A wave is faded by the radians it turns across the pixel along its own way, so a crest that lies across the
 * eye's line is kept as far out as it can be told from its neighbour, and one seen end on goes to roughness a little way out.
 * `flatBreak(slope, v, high)`: how much of a thing's image on the water is gone at this place (0 whole, 1 gone): `v` from the water to
 * the eye, `high` the metres the mirrored point stands over the water. A flank that throws the eye's line aside by more than a leg's
 * breadth shows the sky there and not the thing; at the foot of what stands in the water its image is whole.
 */
export const FLAT_RIPPLE_GLSL = /* glsl */ `
vec3 flatRipple(vec2 p, float t, vec2 footX, vec2 footY) {
  // No crest runs straight: the slow water under the ripples bends them.
  vec2 q = p + vec2(0.35 * sin(0.23 * p.y + 0.11 * p.x + 1.7) + 0.16 * sin(0.9 * p.y - 0.4 * p.x) + 0.05 * sin(3.7 * p.y + 1.9 * p.x),
                    0.35 * sin(0.19 * p.x - 0.07 * p.y + 0.4) + 0.16 * sin(0.8 * p.x + 0.5 * p.y + 2.0) + 0.05 * sin(4.3 * p.x - 2.1 * p.y));
  vec2 s = vec2(0.0);
  float lost = 0.0;
${WAVES.map(
  (w) => `  {
    vec2 k = vec2(${f(w.kx)}, ${f(w.kz)});
    float across = dot(k, footX);
    float along = dot(k, footY);
    float keep = 1.0 - smoothstep(0.5, 6.0, across * across + along * along);
    if (keep > 0.002) {
      float group = 0.6 + 0.55 * sin(dot(vec2(${f(w.gx)}, ${f(w.gz)}), q) - ${f(w.rate * 0.12)} * t + ${f((w.phase * 3.7) % (Math.PI * 2))});
      s += k * (${f(w.slope / Math.hypot(w.kx, w.kz))} * keep * group * cos(dot(k, q) - ${f(w.rate)} * t + ${f(w.phase)}));
    }
    lost += ${f(0.5 * w.slope * w.slope)} * (1.0 - keep * keep);
  }`,
).join('\n')}
  return vec3(s, lost);
}
float flatBreak(vec2 slope, vec3 v, float high) {
  vec2 side = normalize(vec2(-v.z, v.x) + 1e-5);
  float back = high / max(v.y, 0.03);
  // A slope along the eye's line only slides the image along itself: it counts for less than one across it.
  float thrown = length(vec2(dot(slope, side), 0.4 * dot(slope, vec2(side.y, -side.x)))) * 2.0 * (0.15 + back / (1.0 + 0.25 * back));
  return smoothstep(0.1, 0.32, thrown);
}`;
