// The body as land, seen from orbit (assets-src/reveal/land/body/make_body.py): a height field of the whole continent worn by
// running water, with the bones as its great ranges, and from it three pictures of the size of the wide map's own: the colour of
// the country (computed from height, slope and drainage, province by province), its relief, and its baked light. Below 940 km of
// half height the old maps are drawn alone; from 1380 km these; between, both, crossed over by height.
// The text here is set into the land sheet's one shader (index.ts) at four places.

/** The pictures of the body: read beside the old ones only by the program that crosses from one to the other. */
export const BODY_UNIFORMS = /* glsl */ `
#if defined(BODY) && !defined(BODYONLY)
uniform sampler2D uBodyMap;
uniform sampler2D uBodyRelief;
uniform sampler2D uBodyLight;
#endif
// How strongly the relief of the body is lit from orbit, how long its ranges' shadows are drawn, and how much finer it is read.
uniform vec4 uBodyRelief2;
// The plate of the hips from orbit: the heights between which its salt ends, and how much thinner the red mark is drawn.
#define PAN_LOW 0.135
#define PAN_HIGH 0.165
#define PAN_THIN 0.12
`;

/** The body's pictures are worked at the size the picture holds: from orbit they are read nearly at their own grain. */
export const BODY_BIAS = /* glsl */ `
#ifdef BODY
  orbitBias *= 1.0 - uBodyRelief2.z * smoothstep(940.0, 1380.0, uViewKm) * (1.0 - 0.3 * uEmber.x);
#endif
`;

/** After the maps are read: how far the body has come together, and its own colour, relief and light. */
export const BODY_READ = /* glsl */ `
#ifdef BODY
  float joined = smoothstep(940.0, 1380.0, uViewKm);
  vec3 body = ground;
#ifndef BODYONLY
  body = readWide(uBodyMap, clamp(uvWide, 0.0, 1.0), orbitBias).rgb;
  ground = mix(ground, body, joined);
  relief = mix(relief, readWide(uBodyRelief, clamp(uvWide, 0.0, 1.0), orbitBias).rgb, joined);
  bake = mix(bake, readWide(uBodyLight, clamp(uvWide, 0.0, 1.0), 2.0 * orbitBias).rgb, joined);
#endif
#endif
`;

/** The height of the country at large, for the program that crosses over. */
export const BODY_COARSE = /* glsl */ `
#if defined(BODY) && !defined(BODYONLY)
  coarse = mix(coarse, readWide(uBodyRelief, clamp(uvWide, 0.0, 1.0), 4.5).rgb, joined);
#endif
`;

/** The colours the land sheet lays on the old maps on the way up are not compiled into the programs that draw the body alone:
 *  there the country is the body's own picture, and what the places after it read is set here to what it is at that height. */
export const BODY_PILE = /* glsl */ `
#ifndef BODYONLY
`;
export const BODY_PILE_END = /* glsl */ `
#else
  lum = dot(ground, vec3(0.3, 0.55, 0.15));
  float rawBrine = (ground.r - ground.g) / max(lum, 0.02);
  float top = smoothstep(940.0, 1380.0, uViewKm) * land;
  float buried = 0.0;
  float eased = 0.0;
#endif
`;

/** Before the places are laid on the ground: from orbit the country is the body's own picture. */
export const BODY_GROUND = /* glsl */ `
#ifdef BODY
  ground = mix(ground, body, joined);
  // (By night the bones are broad pale ranges under the moon, each in its whole body, as the high ground stands: not their crest lines alone.)
  float boneBody = joined * land * smoothstep(0.25, 0.45, height) * smoothstep(0.14, 0.32, dot(coarseGround, vec3(0.3, 0.55, 0.15)));
  ground = mix(ground, vec3(0.62, 0.59, 0.52), 0.35 * uEmber.x * boneBody);
#endif
`;

/** The light of the relief from orbit: the crests are not eased, every ridge has a lit side and a shaded one, and the low
 *  country lies quieter than the ranges. (By night the moon rakes it already: the relief is not drawn stronger twice.) */
export const BODY_LIGHT = /* glsl */ `
#ifdef BODY
  float bodySlope = uBodyRelief2.x * (1.0 - 0.65 * uEmber.x) * mix(0.55, 1.0, smoothstep(0.12, 0.5, height)) / (1.0 - 0.6 * (1.0 - uEmber.x) * smoothstep(0.3, 0.62, height));
#ifndef BODYONLY
  bodySlope /= mix(1.0, 0.55, lowness * wide);
#endif
  slope *= mix(1.0, bodySlope, joined);
  // (The salt of the pan lies damp and dark by night: no pale disc under the moon.)
  ground *= 1.0 - 0.45 * saltFlat * uEmber.x * joined;
  // (By night the moon lights the ranges in their whole body, broad, as it does the high ground of any land seen from orbit: the
  // body of a bone stands toward it, and the fine relief is a grain on that, not a wire drawing.)
  slope = mix(slope, 0.7 * slope, uEmber.x * joined) - uBodyRelief2.w * boneBody * uEmber.x * normalize(uMoonDir.xz);
#endif
`;

/** The reach of the ranges' shadows from orbit. */
export const BODY_CAST = /* glsl */ `
#ifdef BODY
  castKm *= mix(1.0, uBodyRelief2.y, joined);
#endif
`;

/** How high the wet plain that lies as dark as the sea by night reaches: the body's own country is low over most of its width,
 *  and only its coastal flats are that plain. (The old maps' figure where they are drawn.) */
export const BODY_WET = /* glsl */ `
#ifdef BODY
mix(0.34, 0.045, smoothstep(940.0, 1380.0, uViewKm))
#else
0.34
#endif
`;

/** The pan of the hips from orbit: salt on the level floor of its basin and no higher, so its shore is the foot of the ranges
 *  round it, broken by their headlands, and nothing of it lies as a haze on the country beyond. */
export const BODY_PAN = /* glsl */ `
#ifdef BODY
  // (From orbit the plate of the hips is the floor of its basin and no ellipse: salt lies where the ground is level, out along the
  // valleys that open on it, and the ranges stand into it as headlands. The red is a branching mark on it, thinner than the plate.)
  if (joined > 0.0) {
    float reach = length(fromPan / vec2(212.0, 168.0)) + 0.55 * (vnoise(xz / 95.0 + 3.0) - 0.5) + 0.25 * (vnoise(xz / 31.0 + 9.0) - 0.5);
    float plate = (1.0 - smoothstep(0.8, 1.3, reach)) * (1.0 - smoothstep(PAN_LOW, PAN_HIGH, height)) * land;
    panAt = mix(panAt, plate, joined);
    rawBrine -= PAN_THIN * joined;
  }
#endif
`;
