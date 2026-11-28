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
uniform vec3 uBodyRelief2;
`;

/** The body's pictures are worked at the size the picture holds: from orbit they are read nearly at their own grain. */
export const BODY_BIAS = /* glsl */ `
#ifdef BODY
  orbitBias *= 1.0 - uBodyRelief2.z * smoothstep(940.0, 1380.0, uViewKm);
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

/** Before the places are laid on the ground: from orbit the country is the body's own picture. */
export const BODY_GROUND = /* glsl */ `
#ifdef BODY
  ground = mix(ground, body, top);
#endif
`;

/** The light of the relief from orbit: the crests are not eased, every ridge has a lit side and a shaded one. */
export const BODY_LIGHT = /* glsl */ `
#ifdef BODY
  // (By night the moon rakes it already: the relief is not drawn stronger twice.)
  slope *= mix(1.0, uBodyRelief2.x * (1.0 - 0.5 * uEmber.x) / (1.0 - 0.6 * smoothstep(0.3, 0.62, height)), joined);
#endif
`;

/** The reach of the ranges' shadows from orbit. */
export const BODY_CAST = /* glsl */ `
#ifdef BODY
  castKm *= mix(1.0, uBodyRelief2.y, joined);
#endif
`;
