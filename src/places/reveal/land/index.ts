// The surface of the planet: the sea, the continent that is the body, the salt pan of the hips, the lake of the Eye and the lava of the Heart.
// One sheet at sea level draws all five from the Builder's four nested satellite maps (public/assets/reveal/maps): colour by level, and the
// relief of each level as a slope picture (assets-src/reveal/land/make_relief.py). Where a map is enlarged, the ground photographs under
// public/assets/reveal/mat are laid under it by world position. The light is the rig's: one sun, the air, the shade of the cloud.
import * as THREE from 'three';
import { FPS } from '../../../config';
import { AT, FILM_ASPECT, KM, RISE_FIRST, X, Z, handoff, rise } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { WEATHER_GLSL } from '../shared/weather';
import { LEVELS, pairFor, type Level } from './levels';

export const PARTS = ['sea', 'continent', 'salt', 'lake', 'lava'] as const;

const FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${WEATHER_GLSL}
uniform sampler2D uMapWide;
uniform sampler2D uReliefWide;
uniform vec4 uRectWide;
uniform sampler2D uMapClose;
uniform sampler2D uReliefClose;
uniform vec4 uRectClose;
uniform float uClose;
// Km of one texel of the wide map, of the close map, and of the widest.
uniform vec3 uTexelKm;
uniform sampler2D uMatRange;
uniform sampler2D uMatPlain;
uniform sampler2D uMatBadland;
uniform sampler2D uMatShelf;
uniform sampler2D uMatRangeNh;
uniform sampler2D uMatGlitter;
uniform sampler2D uMatLakewater;
uniform float uOnly;
uniform vec3 uHandWater;
uniform vec2 uHand;
uniform vec2 uLake;
uniform vec2 uLakeSize;
uniform vec2 uLakeMid;
uniform vec2 uLava;
uniform vec2 uThroat;
uniform vec2 uSalt;
uniform vec2 uGlint;
varying vec3 vWorld;

// The deep sea under the sky of this planet: what comes back from the water itself, as a reflectance.
const vec3 DEEP = vec3(0.0022, 0.0065, 0.0135);
// The dearer land: false lays no ground photograph under an enlarged map (both costs in HANDOVER.md).
const bool GROUND_DETAIL = true;
// The height of the highest ground, km, as the shadows of dusk are thrown: drawn taller than it stands, as relief is on a map.
const float RELIEF_KM = 16.0;
// The lesser vents: x and z from the Heart, km, and their size beside it.
const vec3 VENTS[6] = vec3[6](vec3(-42.0, -98.0, 0.5), vec3(76.0, -33.0, 0.55), vec3(170.0, -66.0, 0.45), vec3(124.0, 24.0, 0.4), vec3(-52.0, 50.0, 0.45), vec3(43.0, 79.0, 0.4));

float inside(vec2 uv, float edge) {
  vec2 m = min(uv, 1.0 - uv);
  return smoothstep(0.0, edge, min(m.x, m.y));
}

// Cracks: bright along the lines where two cells of the crust meet.
float cracks(vec2 p) {
  vec2 q = p + 0.9 * vec2(vnoise(p * 0.7 + 3.1), vnoise(p * 0.7 - 7.3));
  float a = abs(vnoise(q) - 0.5) * 2.0;
  float b = abs(vnoise(q * 2.3 + 11.0) - 0.5) * 2.0;
  return max(1.0 - smoothstep(0.0, 0.16, a), 0.6 * (1.0 - smoothstep(0.0, 0.12, b)));
}

void main() {
  // The country is not laid out with a ruler: the maps are read through a bend of the ground itself, at three sizes, so no two
  // ranges keep one spacing or one line, no shore is a circle, and no rib is the twin of the next. (None at the middle of the lake,
  // where the rise begins.)
  vec2 real = vWorld.xz;
  vec2 bendA = vec2(sin(real.y / 173.0 + 1.3) + 0.6 * sin(real.x / 97.0 + real.y / 211.0), sin(real.x / 151.0 + 4.1) + 0.6 * sin(real.y / 83.0 - real.x / 239.0 + 2.0));
  vec2 bendB = vec2(sin(real.y / 41.0 + real.x / 67.0 + 0.7), sin(real.x / 37.0 - real.y / 59.0 + 3.3));
  // (The smallest bend is under a pixel from orbit and is left out there.)
  vec2 bendC = uViewKm < 900.0 ? vec2(sin(real.y / 11.3 + real.x / 23.0 + 5.1), sin(real.x / 9.7 - real.y / 19.0 + 0.4)) : vec2(0.0);
  vec2 xz = real + (14.0 * bendA + 5.0 * bendB + 1.3 * bendC) * smoothstep(0.35, 1.0, length((real - uLakeMid) / uLakeSize));
  // (And each range is of its own kind: one worn smooth, one deeply cut, one dark, one pale, one under snow.)
  vec3 kind = vec3(0.5);
  vec3 view = normalize(cameraPosition - vWorld);
  float pixelKm = max(fwidth(xz.x), fwidth(xz.y));

  // ---- the maps: the colour of the ground, and its relief (slope in red and green, height in blue) ----
  vec2 uvWide = (xz - uRectWide.xy) * uRectWide.zw;
  vec2 uvClose = (xz - uRectClose.xy) * uRectClose.zw;
  float inWide = inside(uvWide, 0.04);
  float inClose = inside(uvClose, 0.1) * uClose;
  vec3 ground = texture2D(uMapWide, clamp(uvWide, 0.0, 1.0)).rgb;
  vec3 relief = texture2D(uReliefWide, clamp(uvWide, 0.0, 1.0)).rgb;
  float texel = uTexelKm.x;
  if (inWide < 1.0) {
    // Past the edge of the wide map lies the open sea.
    ground = mix(vec3(0.0, 0.004, 0.009), ground, inWide);
    relief = mix(vec3(0.5, 0.5, 0.0), relief, inWide);
  }
  if (inClose > 0.0) {
    ground = mix(ground, texture2D(uMapClose, clamp(uvClose, 0.0, 1.0)).rgb, inClose);
    relief = mix(relief, texture2D(uReliefClose, clamp(uvClose, 0.0, 1.0)).rgb, inClose);
    texel = mix(texel, uTexelKm.y, inClose);
  }
  // (Whole provinces are worn smooth: old fans and plains with no ridge in them. There the map is read drawn together, colour and
  // relief alike, so only the broad form of the country is left, and the coast keeps its own line.)
  float worn = 0.0;
  if (inWide > 0.0 && uViewKm > 40.0 && uViewKm < 900.0) {
    float wornAt = 0.5 + 0.5 * sin(xz.x / 231.0 + 1.1 + 1.5 * sin(xz.y / 173.0 + 0.6)) * sin(xz.y / 197.0 + 2.9 + 1.2 * sin(xz.x / 311.0));
    float open = smoothstep(40.0, 90.0, uViewKm) * (1.0 - smoothstep(560.0, 900.0, uViewKm)) * inWide * smoothstep(0.6, 1.5, length((real - uLakeMid) / uLakeSize));
    if (open > 0.0) {
      vec3 coarse = texture2D(uReliefWide, clamp(uvWide, 0.0, 1.0), 4.8).rgb;
      vec3 coarseGround = texture2D(uMapWide, clamp(uvWide, 0.0, 1.0), 4.8).rgb;
      // (The red plains are the flattest of them: old lava, level, with pits in it.)
      float red = smoothstep(0.3, 0.6, (coarseGround.r - coarseGround.b) / max(dot(coarseGround, vec3(0.3, 0.55, 0.15)), 0.02));
      worn = open * max(0.8 * smoothstep(0.42, 0.6, wornAt), 0.9 * red) * smoothstep(0.3, 0.36, coarse.b) * (1.0 - smoothstep(0.5, 0.75, coarse.b));
      relief = mix(relief, vec3(0.5 + 2.2 * (coarse.rg - 0.5), coarse.b), worn);
      ground = mix(ground, coarseGround, 0.9 * worn);
    }
  }
  // Between the ground and orbit the country is seen through air: the map's own hard light and dark, crest by crest, is drawn
  // toward the light of the country round it, so a range is one soft pale body with fine lines in it and no etched thing.
  float soften = mix(0.04, 0.57, smoothstep(90.0, 240.0, uViewKm)) * smoothstep(30.0, 60.0, uViewKm) * (1.0 - smoothstep(450.0, 900.0, uViewKm)) * inWide;
  if (soften > 0.0) {
    vec3 around = texture2D(uMapWide, clamp(uvWide, 0.0, 1.0), 4.5).rgb;
    if (inClose > 0.0) around = mix(around, texture2D(uMapClose, clamp(uvClose, 0.0, 1.0), 4.5).rgb, inClose);
    ground *= pow(max(dot(around, vec3(0.3, 0.55, 0.15)), 0.01) / max(dot(ground, vec3(0.3, 0.55, 0.15)), 0.01), soften);
  }
  // Blue of the relief: over 0.3 the height of the land, under 0.25 water and how shallow it is.
  float land = smoothstep(0.255, 0.3, relief.b);
  float height = clamp((relief.b - 0.3) / 0.7, 0.0, 1.0);
  // (The height of the country at large, its valleys and crests drawn together: what says range or lowland.)
  float broadB = texture2D(uReliefWide, clamp(uvWide, 0.0, 1.0), 4.5).b;
  float broad = clamp((mix(0.0, broadB, inWide) - 0.3) / 0.7, 0.0, 1.0);
  float shallow = clamp(relief.b / 0.25, 0.0, 1.0) * (1.0 - land);
  // West and south of the skull the map's low islands are under the sea: open deep water there, as the picture has it, and the
  // pale of the skull stands out of it alone. (The sea stands higher the farther out: so the coast it leaves follows the land.)
  vec2 fromSkull = (xz - vec2(${X(1350).toFixed(1)}, ${Z(1566).toFixed(1)})) / vec2(${(330 * KM).toFixed(1)}, ${(270 * KM).toFixed(1)});
  float west = xz.x < ${X(2700).toFixed(1)} ? westSea(xz + 150.0 * (texture2D(uCloudTile, xz / 900.0 + 0.3, 5.0).rg - 0.5)) * smoothstep(50.0, 120.0, uViewKm) : 0.0;
  float shelf = 0.0;
  if (west > 0.0) {
    float stand = 0.3 * height + broad;
    float flood = 1.0 - smoothstep(3.0 * west - 0.42, 3.0 * west + 0.04, stand);
    land *= 1.0 - flood;
    // (The drowned ground shows as a soft shelf under the water near the body, and is gone farther out: no line round it.)
    shallow *= 1.0 - 0.94 * west;
    shelf = flood * (1.0 - smoothstep(0.0, 0.7, west)) * smoothstep(-1.2, 0.0, stand - 3.0 * west);
  }
  // The stream of the Eye: it leaves the lake through the gap in its rim at the upper left and winds away up the valley.
  vec2 fromLake = (xz - uLakeMid) / uLakeSize;
  float lakeFar = length(fromLake);
  float stream = 0.0;
  // (The spits that the map runs out into the lake are drowned: its shore is one line, and the shallows grade in from it.)
  // (Its shore is ragged: wide bays, spits of rock that run out into the water, small notches. shoreR is the distance from its
  // middle in which the shore lies at 0.93.)
  float shoreR = lakeFar;
  if (lakeFar < 1.4) {
    shoreR = lakeFar + (-0.07 + 0.3 * (vnoise(fromLake * 2.1 + 5.0) - 0.5) + 0.16 * (vnoise(fromLake * 5.3 + 2.0) - 0.5) + 0.07 * (vnoise(fromLake * 13.0 + 8.0) - 0.5)) * smoothstep(0.6, 0.9, lakeFar);
    float keep = smoothstep(0.9, 0.96, shoreR);
    shallow = max(shallow, 0.9 * max(land, smoothstep(0.98, 1.02, lakeFar)) * (1.0 - keep) * smoothstep(0.7, 0.95, lakeFar));
    land *= keep;
  }
  if (lakeFar > 0.8 && lakeFar < 4.2 && uViewKm < 420.0) {
    vec2 run = normalize(vec2(-0.3, -0.95));
    float along = dot(fromLake, run);
    float aside = dot(fromLake, vec2(-run.y, run.x)) - 0.2 * sin(along * 2.6 + 0.6) * smoothstep(0.9, 1.6, along) - 0.1 * sin(along * 6.3 + 2.0) * smoothstep(0.95, 1.3, along) - 0.04 * sin(along * 14.0) * smoothstep(0.95, 1.2, along);
    float wideness = mix(0.017, 0.009, smoothstep(1.0, 3.6, along)) * (0.8 + 0.4 * vnoise(vec2(along * 9.0, 3.0)));
    float edgeKm = max(pixelKm / uLakeSize.x, 0.004);
    stream = (1.0 - smoothstep(wideness - edgeKm, wideness + edgeKm, abs(aside))) * smoothstep(0.85, 1.0, along) * (1.0 - smoothstep(3.4, 4.1, along));
    // (Its valley: the ground falls to it, darker and damp at its banks.)
    float banks = (1.0 - smoothstep(wideness, wideness + 0.09, abs(aside))) * smoothstep(0.95, 1.15, along) * (1.0 - smoothstep(3.2, 4.1, along));
    ground *= 1.0 - 0.28 * banks * land;
    land *= 1.0 - stream;
    shallow = mix(shallow, 0.5, stream);
  }
  // (North of the lake of the Eye a second crater holds water: a long dark lake, its shore uneven.)
  vec2 inUpper = (xz - uLakeMid - vec2(45.0, -137.0)) / vec2(42.0, 23.0);
  float upperR = 9.0;
  float upper = 0.0;
  if (dot(inUpper, inUpper) < 2.5) {
    upperR = length(inUpper) + 0.3 * (vnoise(xz / 11.0 + 4.0) - 0.5);
    upper = (1.0 - smoothstep(0.86, 0.98, upperR)) * smoothstep(120.0, 200.0, uViewKm);
    land *= 1.0 - upper;
    shallow = mix(shallow, 0.0, upper);
  }
  if (land > 0.0) kind = 0.5 + 0.5 * vec3(
    sin(xz.x / 143.0 + 0.9 + 1.7 * sin(xz.y / 201.0)) * sin(xz.y / 117.0 + 2.2),
    sin(xz.x / 187.0 + 3.1) * sin(xz.y / 97.0 + 0.3 + 1.4 * sin(xz.x / 263.0)),
    sin(xz.x / 109.0 + 5.0 + 1.9 * sin(xz.y / 151.0)) * sin(xz.y / 171.0 + 4.4));
  vec2 slope = relief.rg * 2.0 - 1.0;
  // How many pixels of the frame one texel of the map covers: past one, the map is soft and the ground photographs carry the detail.
  float enlarged = texel / max(pixelKm, 1e-5);
  // (A worn province has lost the map's relief: the ground photographs give it its own, finer and of another kind.)
  float detail = max(smoothstep(0.9, 2.0, enlarged), worn);

  // ---- the ground photographs under the map ----
  // Each is laid by world position at the size at which one of its texels is about a pixel, in octaves of its real size and cross-faded
  // between two octaves, each octave turned against the last, so no repeat shows and the detail keeps arriving as the eye rises.
  float lum = dot(ground, vec3(0.3, 0.55, 0.15));
  if (GROUND_DETAIL && detail > 0.0) {
    float octave = log2(max(pixelKm * 1024.0 * 1.3 / 40.0, 0.25));
    float lower = floor(octave);
    float share = smoothstep(0.15, 0.85, octave - lower);
    float layA = 40.0 * exp2(lower);
    float layB = layA * 2.0;
    float odd = mod(lower, 2.0);
    mat2 turnA = odd < 0.5 ? mat2(0.8, 0.6, -0.6, 0.8) : mat2(-0.28, 0.96, -0.96, -0.28);
    mat2 turnB = odd < 0.5 ? mat2(-0.28, 0.96, -0.96, -0.28) : mat2(0.8, 0.6, -0.6, 0.8);
    vec2 pa = turnA * xz / layA + vec2(0.17, 0.52) * (lower + 3.0);
    vec2 pb = turnB * xz / layB + vec2(0.17, 0.52) * (lower + 4.0);
    if (land > 0.0) {
      // Bare rock on the pale high ground, braided plain on the dark low ground, canyon land where the map is dry and ochre.
      float dry = smoothstep(0.05, 0.3, (ground.r - ground.b) / max(lum, 0.02));
      float high = smoothstep(0.3, 0.6, height) * (1.0 - 0.6 * dry);
      vec3 ofRange = mix(texture2D(uMatRange, pa).rgb, texture2D(uMatRange, pb).rgb, share) / vec3(0.122, 0.126, 0.125);
      vec3 ofLow = mix(
        mix(texture2D(uMatPlain, pa * 0.667).rgb, texture2D(uMatPlain, pb * 0.667).rgb, share) / vec3(0.182, 0.157, 0.12),
        mix(texture2D(uMatBadland, pa * 1.333).rgb, texture2D(uMatBadland, pb * 1.333).rgb, share) / vec3(0.235, 0.199, 0.191),
        dry);
      vec3 country = clamp(mix(ofLow, ofRange, high), 0.35, 2.4);
      // (Only the light and dark of the photograph: the colour of the ground stays the map's.)
      float tone = dot(country, vec3(0.3, 0.55, 0.15));
      ground *= mix(vec3(1.0), mix(vec3(tone), country, 0.35), 0.88 * detail * land);
      vec2 a1 = texture2D(uMatRangeNh, pa).rg * 2.0 - 1.0;
      vec2 a2 = texture2D(uMatRangeNh, pb).rg * 2.0 - 1.0;
      vec2 small = mix(vec2(a1.x, a1.y) * turnA, vec2(a2.x, a2.y) * turnB, share);
      slope += small * mix(0.62, 1.5, smoothstep(150.0, 260.0, uViewKm) * (1.0 - smoothstep(600.0, 900.0, uViewKm))) * detail * land * (0.4 + 0.6 * high);
    } else {
      // Under shallow water: bars, channels and silt.
      vec3 ofShelf = mix(texture2D(uMatShelf, pa * 0.5).rgb, texture2D(uMatShelf, pb * 0.5).rgb, share) / vec3(0.055, 0.159, 0.148);
      ground *= mix(vec3(1.0), clamp(ofShelf, 0.4, 2.2), 0.6 * detail * smoothstep(0.05, 0.4, shallow));
    }
  }

  // ---- the colour of this place: cold. The growth of the lowlands is dark slate and teal, the rock blue grey, the high crests the pale of old bone. ----
  lum = dot(ground, vec3(0.3, 0.55, 0.15));
  // (The red of the map itself, before this place's colour is laid on it: the brine of the pan.)
  float rawBrine = (ground.r - ground.g) / max(lum, 0.02);
  float growth = clamp((ground.g - max(ground.r, ground.b)) / max(lum, 0.02) * 4.0, 0.0, 1.0) * land;
  ground = mix(ground, lum * vec3(0.3, 0.7, 0.62), 0.4 * growth);
  ground = mix(ground, mix(vec3(lum), ground, 0.85) * mix(vec3(0.97, 1.0, 1.03), vec3(1.0), smoothstep(0.2, 0.5, height)), land);
  // Only near the top of the rise does the body come together: the great ranges stand pale as old bone, the country between them falls dark and cold.
  // Near the ground the country is warm tan under a soft light, its shade open.
  float near = (1.0 - smoothstep(110.0, 300.0, uViewKm)) * land;
  ground = mix(ground, pow(ground, vec3(0.72)) * 0.47 * mix(vec3(0.8, 0.92, 1.1), vec3(1.1, 0.97, 0.8), smoothstep(0.08, 0.34, lum)), 0.85 * near);
  // The rock of this country is grey, cold in its shade: the maps' warmth is taken down.
  ground = mix(ground, vec3(dot(ground, vec3(0.3, 0.55, 0.15))) * vec3(0.95, 1.0, 1.07), mix(0.3, mix(0.15, 0.75, smoothstep(0.2, 0.55, height)), smoothstep(110.0, 300.0, uViewKm)) * land * (1.0 - smoothstep(600.0, 1300.0, uViewKm)));
  // East of the skull, round the throat, the plain is rust red.
  vec2 fromThroat = (xz - uThroat - vec2(-60.0, -30.0)) / vec2(250.0, 300.0);
  float rust = exp(-dot(fromThroat, fromThroat)) * land * (1.0 - smoothstep(0.4, 0.7, height));
  ground = mix(ground, dot(ground, vec3(0.3, 0.55, 0.15)) * vec3(0.6, 0.27, 0.2), 0.9 * min(1.0, 1.4 * rust));
  // Between the ground and orbit the country is seen under a low sun through cold air: darker, its shade blue.
  float midway = smoothstep(90.0, 240.0, uViewKm) * (1.0 - smoothstep(700.0, 1300.0, uViewKm)) * land;
  // (The low country dark teal and green, the dry pans red brown, the pale kept for the crests and the bone.)
  float lowMid = (1.0 - smoothstep(0.26, 0.5, broad)) * (1.0 - smoothstep(0.38, 0.62, height));
  float dryPan = smoothstep(0.12, 0.4, (ground.r - ground.b) / max(lum, 0.02)) * smoothstep(0.0, 0.12, ground.r - ground.g) * lowMid;
  ground = mix(ground, lum * vec3(0.2, 0.52, 0.52), 0.8 * growth * midway);
  ground = mix(ground, lum * vec3(0.95, 0.4, 0.29), 0.8 * dryPan * midway);
  ground *= mix(vec3(1.0), mix(mix(vec3(0.36, 0.5, 0.6), vec3(0.7, 0.95, 1.1), smoothstep(240.0, 640.0, uViewKm)), vec3(0.6, 0.59, 0.57), 1.0 - lowMid), midway);
  ground = mix(ground, dot(ground, vec3(0.3, 0.55, 0.15)) * vec3(0.3, 1.15, 1.2), 0.8 * lowMid * midway * smoothstep(200.0, 480.0, uViewKm));
  ground = mix(ground, dot(ground, vec3(0.3, 0.55, 0.15)) * vec3(2.3, 0.85, 0.5), 0.7 * dryPan * midway);
  ground = mix(ground, dot(ground, vec3(0.3, 0.55, 0.15)) * vec3(2.4, 0.8, 0.5), 0.8 * min(1.0, 1.4 * rust) * midway);
  // (The bone is seen through air: its own light and dark drawn together, so it is one pale body cut by fine lines.)
  float boneLum = dot(ground, vec3(0.3, 0.55, 0.15));
  float crestMid = smoothstep(-0.03, 0.1, height - broad);
  ground *= mix(1.0, pow(max(boneLum, 0.01) / 0.3, -0.3) * mix(0.72, 0.95, crestMid), midway * (1.0 - lowMid));
  // (Its shade is brown, never grey: old bone, stained.)
  ground = mix(ground, dot(ground, vec3(0.3, 0.55, 0.15)) * vec3(0.96, 1.0, 1.08), 0.5 * midway * (1.0 - lowMid) * (1.0 - crestMid));
  // (From the height at which a range is seen whole its flanks are red brown, old stained bone, and only its crest is pale:
  // so the bones stand thin.)
  float flank = (1.0 - lowMid) * (1.0 - mix(crestMid, smoothstep(0.03, 0.17, height - broad), smoothstep(680.0, 1380.0, uViewKm))) * smoothstep(300.0, 600.0, uViewKm) * land;
  // (The skull keeps its pale whole, so its two sockets stand dark in it from any height.)
  flank *= smoothstep(0.7, 1.1, length(fromSkull));
  // From the height at which country is seen and no longer ground, the low country lies dark: wet, grown over, teal and slate.
  float wide = smoothstep(240.0, 640.0, uViewKm) * land;
  float lowness = (1.0 - smoothstep(0.12, 0.5, height)) * (1.0 - 0.85 * min(1.0, 1.4 * rust));
  // (And by value: the middle tones of the country fall away, the pale of the high ground stays.)
  ground *= mix(1.0, mix(0.6, 1.0, smoothstep(0.22, 0.55, lum)), wide);
  ground = mix(ground, lum * vec3(0.28, 0.62, 0.82), 0.7 * lowness * wide);
  ground *= mix(1.0, 0.5, lowness * wide);
  // The bones are ivory and tan, never chalk: the brightest of the map is taken down.
  ground *= mix(1.0, 0.74, smoothstep(0.4, 0.8, lum) * wide);
  slope *= mix(1.0, 0.55, lowness * wide);
  // (And even: from that height the low country is one dark body of growth, its small features gone into it.)
  ground = mix(ground, mix(vec3(0.011, 0.045, 0.06), vec3(0.02, 0.07, 0.078), smoothstep(680.0, 1380.0, uViewKm)) * (0.6 + 1.6 * lum), mix(0.5, 0.72, smoothstep(680.0, 1380.0, uViewKm)) * lowness * wide);
  // (Between the ranges the dark of the country is teal, never grey: wet ground under cold air.)
  float darkLum = dot(ground, vec3(0.3, 0.55, 0.15));
  float darkCountry = (1.0 - smoothstep(0.03, 0.13, darkLum)) * smoothstep(240.0, 520.0, uViewKm) * (1.0 - smoothstep(900.0, 1380.0, uViewKm)) * land * (1.0 - min(1.0, 1.4 * rust));
  ground = mix(ground, darkLum * vec3(0.3, 1.0, 1.3), 0.65 * darkCountry);
  float top = smoothstep(680.0, 1380.0, uViewKm) * land;
  float crest = smoothstep(0.3, 0.62, height);
  // (From orbit the dry plains are dark rust, never tan: the pale is the bone's alone.)
  float topLum = dot(ground, vec3(0.3, 0.55, 0.15));
  float dryTop = smoothstep(0.1, 0.35, (ground.r - ground.b) / max(topLum, 0.02)) * (1.0 - crest);
  ground = mix(ground, min(topLum, 0.1 + 0.3 * topLum) * vec3(0.4, 0.42, 0.33), 0.85 * dryTop * top);
  ground *= mix(1.0, mix(0.8, 1.0, crest), top);
  ground = mix(ground, vec3(0.6, 0.54, 0.44), 0.25 * top * smoothstep(0.5, 0.85, height));
  // The high ground is old bone: its pale is warm, never the white of snow.
  ground *= mix(vec3(1.0), vec3(0.98, 0.84, 0.66), land * smoothstep(0.25, 0.7, height) * smoothstep(0.2, 0.5, lum));

  // From orbit the warm of the land is the bone's alone: where the country is orange it is taken down to dark green brown, so the
  // pale ranges carry the figure. (The rust of the throat stays.)
  float warmLum = dot(ground, vec3(0.3, 0.55, 0.15));
  float warm = smoothstep(0.2, 0.5, (ground.r - ground.b) / max(warmLum, 0.02)) * (1.0 - smoothstep(0.3, 0.5, warmLum)) * (1.0 - min(1.0, 1.4 * rust)) * top;
  ground = mix(ground, min(warmLum, 0.03 + 0.35 * warmLum) * vec3(0.42, 0.52, 0.46), 0.85 * warm);
  // (And seen through the air of orbit the low country is cold: blue green, its red taken down.)
  ground *= mix(vec3(1.0), vec3(0.8, 1.0, 1.12), top * lowMid * (1.0 - min(1.0, 1.4 * rust)));
  // The flanks of the ranges, and the plain round the throat, laid last so nothing after takes their red away.
  float lateLum = dot(ground, vec3(0.3, 0.55, 0.15));
  ground = mix(ground, mix(lateLum * vec3(1.05, 0.6, 0.44), min(lateLum, 0.03 + 0.5 * lateLum) * vec3(0.86, 0.7, 0.58), top), mix(0.7, 0.62, top) * flank);
  ground = mix(ground, min(lateLum, 0.02 + 0.6 * lateLum) * vec3(1.9, 0.62, 0.4), 0.75 * min(1.0, 1.4 * rust) * smoothstep(200.0, 420.0, uViewKm));
  // (The rust plain is pitted: a field of small dark craters, oval, each of its own size, some run together.)
  if (rust > 0.04 && uViewKm > 120.0) {
    vec2 pg = mat2(0.9, 0.44, -0.44, 0.9) * xz / 34.0;
    vec2 pid = floor(pg);
    vec2 pat = 0.5 + 0.56 * (vec2(hash12(pid + 3.1), hash12(pid + 7.7)) - 0.5);
    vec2 pd = (fract(pg) - pat) * vec2(1.0, 1.0 + 0.9 * hash12(pid + 1.3));
    float psize = mix(0.12, 0.36, hash12(pid + 9.2));
    float pit = (1.0 - smoothstep(0.6 * psize, psize, length(pd) + 0.06 * (vnoise(pg * 4.0) - 0.5))) * step(hash12(pid + 5.5), 0.75) * (1.0 - smoothstep(0.16, 0.3, height)) * (1.0 - smoothstep(0.02, 0.1, length(slope)));
    ground = mix(ground, vec3(0.006, 0.02, 0.026), 0.95 * pit * min(1.0, 2.2 * rust) * smoothstep(120.0, 220.0, uViewKm) * (1.0 - smoothstep(900.0, 1300.0, uViewKm)));
  }
  // (From orbit the land is a country and no one stuff: here a range stands in dark forest, there in grey scree, there red brown;
  // the low ground between is green grey plain in one province and wet dark teal in the next, and pale silt lies along some shores.)
  float forest = smoothstep(0.5, 0.72, kind.g) * top;
  float scree = smoothstep(0.55, 0.8, kind.r) * (1.0 - forest) * top;
  ground = mix(ground, (0.012 + 0.5 * lateLum) * vec3(0.5, 0.74, 0.5), 0.8 * forest * flank);
  ground = mix(ground, (0.02 + 0.8 * lateLum) * vec3(0.84, 0.8, 0.74), 0.7 * scree * flank);
  float plainAt = smoothstep(0.42, 0.7, kind.b) * lowness * top * (1.0 - flank) * (1.0 - min(1.0, 1.4 * rust));
  ground = mix(ground, vec3(0.034, 0.06, 0.036) * (0.7 + 2.2 * lum), 0.7 * plainAt);
  float siltShore = (1.0 - smoothstep(0.0, 0.14, height)) * smoothstep(0.55, 0.8, 1.0 - kind.g) * top * (1.0 - min(1.0, 1.4 * rust));
  if (siltShore > 0.01) siltShore *= smoothstep(0.38, 0.62, texture2D(uCloudTile, xz / 260.0 + vec2(0.3, 0.9), 1.0).r);
  ground = mix(ground, vec3(0.2, 0.18, 0.13) * (0.7 + 1.2 * lum), 0.36 * siltShore);
  // (The crests of the great ranges are pale rock, and snow on the highest: they carry the figure, the land round them dark.)
  float crestHi = smoothstep(0.02, 0.15, height - broad) * (1.0 - lowMid) * wide * (0.3 + 0.7 * smoothstep(0.3, 0.6, kind.b));
  ground = mix(ground, vec3(0.68, 0.6, 0.5) * (0.36 + 1.0 * lateLum), 0.45 * crestHi);
  // (From orbit the crest is a thin line of pale rock: the snow is on the highest only.)
  ground *= mix(1.0, 0.82, top * smoothstep(0.25, 0.6, lateLum));
  // From orbit the skull is one pale dome of old bone, its valleys gone into it, and the basin beside the lake of the Eye lies in
  // shade: the second socket. (Only from that height: lower down it is a massif like any other.)
  vec2 inSkull = (xz - vec2(-1474.2, -106.2)) / vec2(231.3, 201.3);
  float dome = length(inSkull) < 1.1 ? (1.0 - smoothstep(0.62, 1.0, length(inSkull) + 0.12 * (vnoise(xz / 60.0 + 3.0) - 0.5))) * top : 0.0;
  float domeLum = dot(ground, vec3(0.3, 0.55, 0.15));
  ground = mix(ground, vec3(0.6, 0.54, 0.45) * (0.24 + 0.8 * domeLum), 0.62 * dome);
  vec2 inSocket = (xz - vec2(-1431.4, -227.9)) / vec2(58.0, 42.0);
  float socket = length(inSocket) < 1.3 ? 1.0 - smoothstep(0.7, 1.1, length(inSocket) + 0.3 * (vnoise(xz / 14.0 + 9.0) - 0.5)) : 0.0;
  float sunk = socket * smoothstep(140.0, 250.0, uViewKm) * land;
  ground = mix(ground, vec3(0.006, 0.02, 0.03) * (0.6 + 0.8 * domeLum), 0.95 * sunk);

  // The chest round the Heart is old lava: a black crust between the ribs, which stand out of it pale.
  vec2 fromHeart = xz - uLava;
  float crust = exp(-dot(fromHeart * vec2(0.75, 1.0), fromHeart * vec2(0.75, 1.0)) / 150000.0) * (1.0 - smoothstep(0.24, 0.5, height)) * land;
  ground = mix(ground, mix(vec3(0.028, 0.031, 0.033), vec3(0.013, 0.043, 0.05), smoothstep(800.0, 1380.0, uViewKm)) * (0.5 + 2.2 * lum), min(1.0, 1.2 * crust));
  // The pan of the pelvis: salt, white under the sun, and the red brine that veins it. East of it the red runs out over the low ground
  // and into the sea, in streaks drawn along the fall of the land.
  vec2 fromPan = xz - uSalt;
  float panAt = dot(fromPan, fromPan) < 90000.0 ? (1.0 - smoothstep(0.6, 1.15, length(fromPan / vec2(175.0, 140.0)) + 0.5 * (texture2D(uCloudTile, xz / 420.0, 1.0).b - 0.5))) * land : 0.0;
  float brine = smoothstep(0.22, 0.48, rawBrine);
  float saltFlat = panAt * (1.0 - brine);
  ground = mix(ground, vec3(0.8, 0.8, 0.78) * (0.8 + 0.5 * lum), 0.92 * saltFlat);
  ground = mix(ground, vec3(0.22, 0.02, 0.02), 0.9 * panAt * brine);
  vec2 run = vec2(0.965, 0.26);
  float alongRun = dot(fromPan, run) / 1150.0;
  float grown = clamp((uTime - 6.0) / 30.0, 0.0, 1.0);
  float acrossRun = dot(fromPan, vec2(-run.y, run.x));
  if (alongRun > 0.05 && alongRun < 1.25) acrossRun += 150.0 * grown * alongRun * alongRun * sin(3.0 * alongRun + 0.05 * uTime);
  acrossRun /= 60.0 + 170.0 * alongRun;
  float plume = 0.0;
  if (alongRun > 0.05 && alongRun < 1.25 && abs(acrossRun) < 2.2) plume = exp(-acrossRun * acrossRun * 1.6) * smoothstep(0.06, 0.16, alongRun) * (1.0 - smoothstep(0.35 * (0.9 + 0.6 * grown), 0.9 + 0.34 * grown, alongRun)) * smoothstep(0.3, 0.75, texture2D(uCloudTile, vec2(alongRun * 0.9 - 0.006 * uTime, acrossRun * 0.55 + 0.3) + 0.04 * slope, 1.0).b + 0.25 * (1.0 - alongRun));
  ground = mix(ground, vec3(0.3, 0.07, 0.035) * (0.5 + 1.6 * lum), 0.8 * plume * (1.0 - 0.6 * smoothstep(0.35, 0.6, height)));

  // ---- the light ----
  // The maps hold soft light from the upper left, and the place's sun stands on that side: the relief is lit from the slope, on top of it.
  // Near the ground the relief is gentle, as low sun on old worn country; from orbit it is drawn stronger, as relief is on a map.
  slope *= mix(0.25, 0.4, smoothstep(300.0, 1200.0, uViewKm)) * (1.0 - 0.5 * smoothstep(110.0, 240.0, uViewKm) * (1.0 - smoothstep(450.0, 900.0, uViewKm))) * (1.0 - 0.6 * smoothstep(0.3, 0.62, height));
  // (Kind by kind: worn or cut, and darker or paler rock.)
  float cut = mix(1.0, mix(0.22, 1.2, smoothstep(0.25, 0.75, kind.r)), land * (1.0 - smoothstep(900.0, 1380.0, uViewKm)) * smoothstep(30.0, 60.0, uViewKm));
  slope *= cut;
  ground *= mix(vec3(1.0), mix(vec3(0.8, 0.86, 0.95), vec3(1.1, 1.04, 0.95), smoothstep(0.25, 0.75, kind.g)), land * smoothstep(30.0, 60.0, uViewKm) * (1.0 - smoothstep(600.0, 1300.0, uViewKm)));
  // Near the ground the country is seen in its great forms: whole mountainsides stand in the sun, warm, and whole valleys lie in
  // cool blue shade with haze in them, their small relief gone soft. (The height of the country at large, read toward and away from the sun.)
  float forms = (1.0 - smoothstep(200.0, 420.0, uViewKm)) * smoothstep(22.0, 45.0, uViewKm) * land;
  float facing = 0.5;
  if (forms > 0.0) {
    vec2 sunXZ = normalize(uSunDir.xz) * 9.0;
    float hTo = mix(texture2D(uReliefWide, clamp(uvWide + sunXZ * uRectWide.zw, 0.0, 1.0), 5.0).b, texture2D(uReliefClose, clamp(uvClose + sunXZ * uRectClose.zw, 0.0, 1.0), 5.0).b, inClose);
    float hFrom = mix(texture2D(uReliefWide, clamp(uvWide - sunXZ * uRectWide.zw, 0.0, 1.0), 5.0).b, texture2D(uReliefClose, clamp(uvClose - sunXZ * uRectClose.zw, 0.0, 1.0), 5.0).b, inClose);
    facing = clamp(0.5 + 5.0 * (hFrom - hTo) + 1.2 * (height - 0.5 * (hTo + hFrom - 0.6) / 0.7), 0.0, 1.0);
    slope *= mix(1.0, mix(0.45, 1.15, facing), forms);
  }
  // The rim of the lake of the Eye: a wall of rock thrown up round the water, steep on the side of the lake and long on the other,
  // uneven in height, in width and in plan, low where the stream leaves it and slumped on one side. From near only.
  float rimSeen = (1.0 - smoothstep(260.0, 520.0, uViewKm)) * land;
  if (rimSeen > 0.0 && fromLake.x * fromLake.x + fromLake.y * fromLake.y < 4.0) {
    float rimR = length(fromLake);
    vec2 rimOut = fromLake / max(rimR, 0.05);
    float tall = 0.25 + 1.1 * vnoise(rimOut * 1.7 + 5.0) * (1.0 - 0.85 * (1.0 - smoothstep(0.0, 0.5, length(rimOut - vec2(-0.5, -0.87))))) * (1.0 - 0.7 * (1.0 - smoothstep(0.0, 0.7, length(rimOut - vec2(0.3, 0.95)))));
    float crestAt = 1.17 + 0.09 * (vnoise(rimOut * 2.6 + 11.0) - 0.5) + 0.04 * (vnoise(xz / 5.0) - 0.5) - 0.8 * (shoreR + 0.07 - rimR) * (1.0 - smoothstep(1.05, 1.4, rimR));
    // (It stands in blocks, with gaps where it has fallen.)
    tall *= 0.3 + 0.7 * smoothstep(0.3, 0.52, vnoise(rimOut * 6.5 + 23.0));
    float off = rimR - crestAt;
    float fall = off < 0.0 ? 0.075 : 0.17 + 0.12 * vnoise(rimOut * 2.1 + 31.0);
    float wall = exp(-off * off / (fall * fall)) * tall;
    slope += rimOut * (-2.0 * off / fall) * wall * mix(1.5, 0.7, smoothstep(110.0, 220.0, uViewKm)) * rimSeen;
    // (Cut by gullies that run down it, close set, each of its own depth.)
    float gully = vnoise(rimOut * 37.0 + vec2(1.7 * rimR, 0.0)) + 0.5 * vnoise(rimOut * 83.0 + vec2(0.0, 2.3 * rimR)) - 0.75;
    slope += vec2(-rimOut.y, rimOut.x) * gully * 0.8 * wall * rimSeen * (1.0 - smoothstep(110.0, 190.0, uViewKm));
    ground = mix(ground, vec3(0.62, 0.57, 0.5) * (0.5 + 1.3 * dot(ground, vec3(0.3, 0.55, 0.15))), 0.6 * wall * rimSeen);
  }
  vec3 n = normalize(vec3(-slope.x, 0.8, -slope.y));
  float shade = cloudShade(real);
  // The end of the day: the height of the sun here, and how far its light rakes (the relief stands out as it does under a low sun).
  float sunH = 0.0;
  float rake = 0.0;
  if (uDusk > 0.0) {
    sunH = sunHeight(xz);
    // (Salt under a moon would outshine the bone and the fire both: the pan lies damp by night.)
    ground *= 1.0 - 0.62 * saltFlat * uEmber.x;
    // (By night the low wet plain along the coasts lies nearly as dark as the sea, and the high country stands out of it: the land is read by its relief, not by its outline.)
    ground *= mix(1.0, mix(1.0, 1.25, smoothstep(0.0, 0.3, height)), uEmber.x * land);
    rake = uTerm.w * (1.0 - smoothstep(0.04, 0.4, sunH));
    n = normalize(vec3(-slope.x * (1.0 + 2.0 * rake + 2.5 * uEmber.x), 0.8, -slope.y * (1.0 + 2.0 * rake + 2.5 * uEmber.x)));
    // The ranges throw their shadows, longer as the sun goes down: the height of the land is read toward the sun, farther and
    // coarser at each reach, for the highest thing that stands between this place and the sun. (Only where the sun still rakes.)
    if (rake > 0.0 && inWide > 0.0) {
      // (Once the sun is gone from a place the same reading is made toward the moon, and the ranges throw the moon's shadows.)
      bool byMoon = sunH <= -0.05;
      vec2 toward = normalize(byMoon ? uMoonDir.xz : uSunDir.xz);
      float here = height * land;
      float horizon = 0.0;
      float reach = 5.0;
      for (int i = 0; i < 10; i++) {
        vec2 at = (xz + toward * reach - uRectWide.xy) * uRectWide.zw;
        float there = clamp((texture2D(uReliefWide, clamp(at, 0.0, 1.0), 0.6 * float(i)).b - 0.3) / 0.7, 0.0, 1.0);
        horizon = max(horizon, (there - here) * RELIEF_KM / reach);
        reach *= 1.62;
      }
      float low = max(sunH, 0.0) + 0.012;
      if (byMoon) {
        float moonLow = uMoonDir.y / length(uMoonDir.xz);
        moonShade = mix(1.0, smoothstep(horizon - 0.16, horizon + 0.16, moonLow), 1.0 - smoothstep(-0.2, -0.05, sunH));
      } else {
        shade *= mix(1.0, smoothstep(horizon - 0.02 - 0.25 * low, horizon + 0.02 + 0.25 * low, low), rake * smoothstep(-0.05, 0.03, sunH));
      }
    }
  }
  // (The shadows the cloud threw were the sun's: they go with it.)
  if (uDusk > 0.0) shade = mix(shade, 1.0, min(1.0, 1.7 * uEmber.x));
  float mu = limbCos(xz);
  vec3 level = vec3(0.0, 1.0, 0.0);
  vec3 earth = rigShade(vWorld, mix(level, n, land), view, ground, 0.92, shade);
  if (forms > 0.0) {
    float earthLum = dot(earth, vec3(0.3, 0.55, 0.15));
    vec3 inShade = mix(earth, vec3(earthLum), 0.45) * vec3(0.68, 0.77, 0.9) + uAirColour * 0.04;
    vec3 inSun = mix(earth, vec3(earthLum), 0.2) * vec3(1.16, 1.07, 0.95);
    earth = mix(earth, mix(inShade, inSun, smoothstep(0.25, 0.7, facing)), 0.85 * forms);
  }
  if (uViewKm < 240.0 && lakeFar < 9.0) {
    // (Round the lake, from near: the low sun stands full on the wall east of the water, and the valleys west and south west of it
    // lie under cool blue haze, their relief gone soft in it.)
    float nearLake = land * (1.0 - smoothstep(110.0, 240.0, uViewKm));
    float hazed = smoothstep(0.4, 1.7, -0.7 * fromLake.x + 0.85 * fromLake.y + 0.5 * (vnoise(xz / 38.0 + 2.0) - 0.5)) * (1.0 - 0.35 * smoothstep(0.4, 0.7, height));
    float litSide = smoothstep(0.2, 1.5, fromLake.x - 0.3 * fromLake.y) * (1.0 - smoothstep(1.6, 3.2, lakeFar));
    earth = mix(earth, vec3(dot(earth, vec3(0.3, 0.55, 0.15))) * vec3(0.6, 0.74, 0.98) * 0.8 + uAirColour * 0.04, 0.7 * hazed * nearLake);
    earth *= 1.0 + 0.3 * litSide * nearLake * vec3(1.0, 0.92, 0.8);
  }

  // The lava of the Heart: vents in the black crust of the chest. The great one is the Heart, and it swells with the beat; the heat shows
  // along the cracks round it. Each is a few kilometres of molten rock: from orbit a point of orange light, and its light on the slopes that face it.
  vec2 fromLava = xz - uLava;
  // (The molten rock works: its light wavers, never the same from one second to the next.)
  float waver = 1.0;
  if (dot(xz - uLava, xz - uLava) < 160000.0) waver = 0.8 + 0.4 * vnoise(vec2(uTime * 1.7, 5.0)) + 0.2 * vnoise(vec2(uTime * 4.3, 9.0));
  // (By night the working is calmer, so that the one beat is not lost in it.)
  // (While the frame is held the fire is seen to breathe, slow and uneven.)
  if (uLive > 0.0) waver *= mix(1.0, 0.62 + 0.76 * vnoise(vec2(uTime * 0.6, 21.0)), smoothstep(0.0, 1.5, uLive));
  if (uDusk > 0.0) waver = mix(1.0, waver, uCalm.w);
  float swell = (0.8 + 0.9 * uBeat) * waver;
  float seenFar = 1.0 + 2.2 * smoothstep(500.0, 1380.0, uViewKm);
  float d0 = dot(fromLava, fromLava);
  float heat = exp(-d0 / (26.0 * seenFar)) * 1.5 * swell;
  float halo = exp(-d0 / (700.0 * seenFar)) * (0.5 + 1.5 * uBeat) * waver;
  if (d0 < 160000.0) for (int i = 0; i < 6; i++) {
    vec3 vent = VENTS[i];
    vec2 q = fromLava - vent.xy;
    float dd = dot(q, q);
    // The lesser vents answer the beat a little late, each in its turn.
    float answer = 0.75 + 0.5 * uBeat * (0.5 + 0.5 * sin(float(i) * 2.4));
    heat += exp(-dd / (11.0 * vent.z * seenFar)) * 2.2 * vent.z * answer;
    halo += exp(-dd / (260.0 * vent.z)) * 0.3 * vent.z * answer;
  }
  float vein = d0 < 18000.0 ? cracks(xz / 7.0) * exp(-d0 / 2200.0) * (0.2 + 0.6 * uBeat) : 0.0;
  heat = (heat + vein) * land;
  vec3 glow = blackbody(1080.0 + 380.0 * clamp(heat, 0.0, 1.4)) * 0.17 * smoothstep(0.03, 0.6, heat);
  vec3 glowCore = glow;
  // (The beat itself: a dull red swell in the whole chest, on the ground and on the flanks of the ribs that face the Heart.)
  glow += vec3(1.0, 0.16, 0.03) * 0.09 * max(uBeat - 0.12, 0.0) * exp(-d0 / 30000.0) * land * (0.6 + 0.8 * clamp(0.5 + 2.6 * dot(slope, fromLava / (length(fromLava) + 1.0)), 0.0, 1.0));
  vec3 glowSwell = glow;
  glow += vec3(1.0, 0.3, 0.06) * 0.26 * halo * land * clamp(0.4 + 2.6 * dot(slope, fromLava / (length(fromLava) + 1.0)), 0.0, 1.8);

  // By night the Heart is the brightest thing on the planet: the ember swells with the beat, its fire lights the rock and the
  // flanks of the ribs that face it, falling off with distance, and veins of fire run out between the ribs.
  // (What the day drew of it was drawn for the day's exposure; and the day's swell lights the black crust as much as the bone,
  // which the night would show as a red disc: by night the fire's light is the ground's own colour, below.)
  if (uDusk > 0.0) glow = (glowCore * (1.0 - 0.93 * uEmber.x) + (glowSwell - glowCore) * mix(1.0, 0.2, uEmber.x) + (glow - glowSwell)) * pow(uGain, -1.0);
  float lakeNight = 0.0;
  if (uDusk > 0.0 && uEmber.x > 0.0) {
    float far0 = sqrt(d0);
    // The beat starts at the middle of the lake and runs outward: the net of cracks in a few frames, the fume and the flanks after it.
    float breath = min(uBeat, 0.12);
    float hit = max(uBeat - 0.12, 0.0);
    float beatNear = breath + hit * (uEmber.y > 0.0 ? smoothstep(0.0, 1.0, (uEmber.y * 420.0 - far0) / 60.0 + 1.0) : 1.0);
    float beatFar = breath + hit * (uEmber.y > 0.0 ? smoothstep(0.0, 1.0, (uEmber.y * 1100.0 - far0) / 150.0 + 1.0) : 1.0);
    float facing = clamp(0.35 + 3.0 * dot(slope, fromLava / (far0 + 1.0)), 0.0, 2.0);
    float reach = exp(-d0 / 200000.0) / (1.0 + d0 / 8000.0);
    // (After the beat it breathes, and never evenly: two slow swells that do not keep step. The light on the flanks goes with it.)
    float breathe = mix(1.0, 0.45 + 0.7 * vnoise(vec2(uTime * 1.1, 5.0)) + 0.4 * vnoise(vec2(uTime * 2.6, 9.0)), smoothstep(1.4, 3.2, uEmber.y));
    // (The swell of the fire between its beats; while the beat itself runs it stands aside, so the beat is the strongest.)
    float aside = clamp(2.5 * hit, 0.0, 1.0);
    float work = emberWork() * (1.0 - aside);
    glow += vec3(1.0, 0.3, 0.06) * ground * (0.22 * (0.3 + 0.5 * beatFar) * mix(1.0, breathe, 0.7) * reach * facing * uEmber.x * land);
    float crowd = 0.0;
    if (d0 < 250000.0) {
      // The Heart itself: a lake of fire under a cracked skin, no two sides of its shore alike. The skin glows dull red, the cracks
      // bright, hottest at the middle; and the beat widens it.
      // (And between the beats it works: the lake swells and sinks back, slow and uneven, and its shore is never still.)
      float shore = length(fromLava * mat2(0.82, 0.38, -0.5, 1.25)) / (58.0 * (1.0 + 0.9 * beatNear + 0.38 * work)) * (0.38 + 0.8 * vnoise(xz / 24.0 + 2.0) + 0.4 * vnoise(xz / 13.0 + vec2(1.3 * uTime, -0.9 * uTime)));
      float lake = 1.0 - smoothstep(0.45, 1.0, shore);
      lakeNight = lake * uEmber.x * land;
      crowd = lake * (1.5 + 0.2 * beatNear);
      float net = sqrt(cracks(xz / 27.0));
      float skin = 0.25 + 0.75 * vnoise(xz / 6.0 + 9.0);
      float hot = breathe * lake * (0.12 * skin + (0.3 + 1.9 * beatNear) * net * (0.4 + 0.45 * exp(-d0 / 1500.0)));
      glow += vec3(1.0, 0.24, 0.025) * 0.3 * hot * uEmber.x * land;
      // (The fume that stands over it, lit red from under: a soft dome, uneven as smoke is.)
      glow += vec3(1.0, 0.17, 0.035) * breathe * (0.008 + 0.05 * beatNear) * exp(-dot(fromLava - vec2(22.0, -14.0), fromLava - vec2(22.0, -14.0)) / 14000.0) * (0.35 + 1.3 * vnoise(xz / 38.0 + vec2(0.05 * uTime, 3.0))) * uEmber.x;
      // (Fire in the cracks of the crust round it, broken along its length; the beat runs out along it, as a pulse does.)
      float pulse = uEmber.y > 0.0 ? exp(-pow((far0 - 380.0 * uEmber.y) / 90.0, 2.0)) * exp(-uEmber.y / 0.7) : 0.0;
      float broken = smoothstep(0.3, 0.75, vnoise(xz / 34.0 + 4.0));
      float veins = cracks(xz / 44.0) * broken * min(1.0, 1.6 * crust) * exp(-d0 / 60000.0) * (0.3 + 0.3 * beatFar + 1.1 * pulse);
      glow += blackbody(980.0 + 220.0 * clamp(veins, 0.0, 1.0)) * 0.03 * smoothstep(0.03, 0.55, veins) * uEmber.x;
    }
    // (Fire seen by an open camera goes to a deep orange, never to white: the red is held and the rest follows it.)
    // (The whole lake is held down together when it swells, so the net of cracks keeps standing over the skin between them.)
    glow *= mix(1.0, 1.0 / ((1.0 + (0.3 - 0.17 * min(hit, 1.0) * min(crowd, 1.0)) * glow.r * uGain) * (1.0 + 0.9 * crowd)), uEmber.x);
    glow.gb = mix(glow.gb, min(glow.gb, glow.r * vec2(0.58, 0.13)), uEmber.x);
    // (Between its beats the fire lies low: the beat is seen against it.)
    glow *= mix(1.0, 0.5 + 0.5 * clamp(1.4 * hit, 0.0, 1.0), uEmber.x);
    glow *= 0.5 + 0.5 * uEmber.w;
    // (Held down as it is for the open camera, the fire would lie flat: its swell is laid on after, on the lake and on the rock it lights.)
    glow *= 1.0 + 0.7 * work;
  }

  // ---- the water ----
  // What comes back from under the surface: the map's own shallows, bars and silt over the deep, lit by the sun and the sky.
  float day = dayAt(xz);
  vec3 light = uSunColour * uSunDir.y * shade * day + skyIrradiance(level) * (0.5 + 0.5 * day);
  if (uDusk > 0.0) light = sunLightAt(sunH, day) * mix(uSunDir.y, max(sunH, 0.0), uTerm.w) * shade + skyIrradiance(level) * skyLightAt(sunH, day) + moonAt(sunH) * uMoonDir.y;
  float pale = pow(shallow, 1.3);
  // (From far the shallows along the coasts are a clear teal.)
  vec3 shoal = mix(max(ground * 0.34, vec3(0.006, 0.035, 0.04)), vec3(0.011, 0.075, 0.085) * (0.5 + 0.9 * pale * (1.0 - 0.45 * pale)), 0.6 * smoothstep(240.0, 640.0, uViewKm));
  vec3 bed = mix(DEEP, shoal, pale);
  // (From orbit the coasts stand on wide shelves: the water pales to teal over them by depth, broken by shoals and channels, no line.)
  float shelfWide = (1.0 - land) * smoothstep(0.1, 0.34, mix(0.0, broadB, inWide)) * smoothstep(600.0, 1100.0, uViewKm) * (1.0 - smoothstep(0.0, 0.35, west)) * smoothstep(0.95, 1.3, length(inSkull));
  if (shelfWide > 0.0) {
    float shoalAt = texture2D(uCloudTile, xz / 330.0 + vec2(0.45, 0.25), 1.0).g;
    bed = mix(bed, mix(vec3(0.008, 0.05, 0.062), vec3(0.03, 0.115, 0.11), shelfWide * smoothstep(0.4, 0.7, shoalAt)), 0.6 * shelfWide * (0.4 + 0.6 * smoothstep(0.3, 0.6, shoalAt)));
  }
  // (From orbit the waters inside the skull lie dark: its sockets.)
  bed = mix(bed, DEEP, 0.8 * (1.0 - smoothstep(0.85, 1.15, length(inSkull))) * smoothstep(600.0, 1100.0, uViewKm));
  // (The drowned shelf west of the skull: teal over pale ground, deepening away from the coast.)
  bed = mix(bed, vec3(0.01, 0.06, 0.07) * (0.5 + 1.2 * lum), 0.88 * shelf);
  // The red of the pan carried out to sea: sediment in the water, thinning as it goes.
  bed = mix(bed, vec3(0.3, 0.06, 0.02), 0.85 * plume * (1.0 - land));
  // (South of it, round the lower leg, the currents carry ochre silt: long curling threads of it, drawn out by the water.)
  vec2 fromSilt = (xz - uSalt - vec2(330.0, 330.0)) / vec2(520.0, 330.0);
  float siltAt = exp(-dot(fromSilt, fromSilt)) * smoothstep(680.0, 1100.0, uViewKm);
  if (siltAt > 0.02) {
    vec2 sc = xz / 520.0 + 0.5 * (texture2D(uCloudTile, xz / 900.0 + vec2(0.2, 0.7) + uTime * vec2(0.0006, -0.0004), 1.0).rg - 0.5);
    float thread = texture2D(uCloudTile, sc * vec2(0.8, 1.7) + vec2(0.4, 0.1), 0.5).b;
    bed = mix(bed, vec3(0.16, 0.1, 0.02), 0.75 * siltAt * smoothstep(0.42, 0.7, thread) * (1.0 - land));
  }
  // The lake of the Eye: black in the middle, and round it a margin of amber shallows, uneven, with tongues of it curling in.
  vec2 lakeAt = (xz - uLakeMid) / uLakeSize;
  float lakeR = length(lakeAt);
  if (lakeR < 1.4) {
    vec2 w = lakeAt + 0.2 * vec2(vnoise(lakeAt * 2.7 + 3.0), vnoise(lakeAt * 2.7 + 17.0));
    float swirl = vnoise(w * 5.0 + 2.4 * vnoise(w * 2.1 + 3.0 + uTime * 0.02));
    // (The margin is graded, never lobed: long swirls of it are drawn round and into the dark by the turning of the water.)
    float twist = 2.6 * lakeR + 0.3;
    vec2 tw = mat2(cos(twist), sin(twist), -sin(twist), cos(twist)) * lakeAt;
    float drawn = 0.6 * vnoise(tw * vec2(2.2, 5.5) + 7.0 + 0.5 * swirl) + 0.4 * vnoise(tw * vec2(4.5, 11.0) + 19.0);
    float toNE = dot(lakeAt / max(lakeR, 0.05), vec2(0.7, -0.7));
    float amber = max(pow(smoothstep(min(0.56 + 0.4 * drawn + 0.24 * toNE + 0.16 * (vnoise(lakeAt / max(lakeR, 0.05) * 1.4 + 9.0) - 0.5), 0.94), 1.0, shoreR + 0.07), 1.9) * (0.5 + 0.5 * smoothstep(0.25, 0.6, vnoise(lakeAt / max(lakeR, 0.05) * 2.3 + 3.0))), 0.45 * smoothstep(0.08, 0.55, shallow) * smoothstep(0.6, 0.9, lakeR)) * (1.0 - 0.8 * smoothstep(0.1, 0.8, toNE));
    float paler = smoothstep(0.35, 1.0, 0.25 * shallow + smoothstep(0.9, 1.0, shoreR + 0.07) + 0.3 * (drawn - 0.5));
    vec3 eye = mix(vec3(0.002, 0.0065, 0.017), mix(vec3(0.15, 0.07, 0.007), vec3(0.34, 0.185, 0.028), paler) * (0.55 + 0.9 * drawn) * (0.75 + 0.5 * swirl), amber * (0.55 + 0.45 * smoothstep(0.3, 0.6, swirl)));
    bed = mix(bed, eye, max(1.0 - smoothstep(1.03, 1.1, shoreR + 0.07), 1.0 - smoothstep(1.12, 1.3, lakeR)) * (1.0 - stream * smoothstep(0.98, 1.06, lakeR)));
  }
  // (The crater lake north of it: its shallows amber on one side, thin on the other.)
  bed = mix(bed, mix(vec3(0.11, 0.05, 0.005), vec3(0.3, 0.17, 0.03), smoothstep(0.8, 0.98, upperR)), upper * smoothstep(0.5 + 0.3 * vnoise(inUpper * 2.3 + 7.0), 0.98, upperR) * (0.35 + 0.65 * smoothstep(-0.6, 0.6, inUpper.x + inUpper.y)));
  // (The stream runs clear and cold out of the lake: blue green over its bed.)
  bed = mix(bed, vec3(0.012, 0.05, 0.075), 0.8 * stream * smoothstep(0.98, 1.06, lakeR));
  vec3 water = bed * light / 3.14159;
  // The surface is a photograph of sea under the sun from orbit (mat/glitter.jpg), read for how much each patch of it throws back:
  // lanes of wind, slicks, swell. It is laid at the size at which one of its texels is about a pixel, in octaves, and it drifts.
  float seaOctave = max(log2(max(pixelKm * 1024.0 * 1.2 / 400.0, 1e-3)), -2.0);
  float seaLower = floor(seaOctave);
  float seaShare = smoothstep(0.15, 0.85, seaOctave - seaLower);
  vec2 sw = xz - uTime * vec2(0.5, 0.22);
  float layS = 400.0 * exp2(seaLower);
  // (Read only where there is water, and one lay only where the other has no share.)
  float sparkle = 1.0;
  if (land < 1.0) {
    vec3 gl = vec3(0.0);
    if (seaShare < 1.0) gl += (1.0 - seaShare) * texture2D(uMatGlitter, mat2(0.8, 0.6, -0.6, 0.8) * sw / layS + 0.37 * seaLower).rgb;
    if (seaShare > 0.0) gl += seaShare * texture2D(uMatGlitter, mat2(-0.28, 0.96, -0.96, -0.28) * sw / (2.0 * layS) + 0.37 * (seaLower + 1.0)).rgb;
    sparkle = clamp(dot(gl, vec3(0.3, 0.55, 0.15)) / 0.0575, 0.4, 2.6);
  }
  // The water of the lake, from near: a photograph of dark still water under wind (mat/lakewater.jpg), 20 km a repeat, and again at 7.
  float inLakeWater = 1.0 - smoothstep(1.0, 1.25, lakeR);
  float ruffle = 0.0;
  if (inLakeWater > 0.0 && pixelKm < 0.6) {
    // (Laid at the size at which one of its texels is about a pixel, in octaves, as the sea is: two lays that cross, each on its own wind.)
    float lakeOctave = max(log2(pixelKm * 1024.0 * 1.1 / 20.0), -1.0);
    float lakeLower = floor(lakeOctave);
    float lakeShare = smoothstep(0.15, 0.85, lakeOctave - lakeLower);
    float layL = 20.0 * exp2(lakeLower);
    vec2 la = mat2(0.8, 0.6, -0.6, 0.8) * (xz - uTime * vec2(0.22, 0.09));
    vec2 lb = mat2(-0.28, 0.96, -0.96, -0.28) * (xz + uTime * vec2(0.05, 0.16));
    float l1 = mix(dot(texture2D(uMatLakewater, la / layL + 0.37 * lakeLower).rgb, vec3(0.3, 0.55, 0.15)), dot(texture2D(uMatLakewater, la / (2.0 * layL) + 0.37 * (lakeLower + 1.0)).rgb, vec3(0.3, 0.55, 0.15)), lakeShare) / 0.0138;
    float l2 = mix(dot(texture2D(uMatLakewater, lb / (1.6 * layL) + 0.4 + 0.21 * lakeLower).rgb, vec3(0.3, 0.55, 0.15)), dot(texture2D(uMatLakewater, lb / (3.2 * layL) + 0.4 + 0.21 * (lakeLower + 1.0)).rgb, vec3(0.3, 0.55, 0.15)), lakeShare) / 0.0138;
    // (And broad lanes where the wind lies on the water, a few kilometres across.)
    float lanes = texture2D(uCloudTile, mat2(0.9, 0.44, -0.44, 0.9) * (xz - uTime * vec2(0.3, 0.1)) / vec2(95.0, 38.0), 1.0).b;
    float lakeLight = clamp(0.5 + 0.5 * (0.55 * l1 + 0.45 * l2) * (0.35 + 1.3 * lanes), 0.5, 2.3);
    ruffle = inLakeWater * (1.0 - smoothstep(0.2, 0.6, pixelKm));
    sparkle = mix(sparkle, lakeLight, ruffle);
  }
  // The sky on the surface, and the sun on its waves: the glint lies where the surface of the planet leans half way to the sun.
  float calm = texture2D(uCloudTile, xz / 1900.0 + vec2(0.5, 0.2), 2.0).b;
  // The image of the sun on the sea: a small hot core, silver round it, falling away softly with no edge. It slides west along the
  // coast as the planet turns under the sun (uGlint is where it lies on the titan frame).
  // (It is drawn out toward the edge of the planet, as the sun's image is on a curved sea.)
  vec2 glintAt = (xz - uGlint - (uTime - 8.1) * vec2(-9.0, -8.0)) * vec2(1.0, 0.48);
  // (As the sun sets its image slides off toward it, and dies.)
  if (uDusk > 0.0) glintAt = (xz - uGlint - (uTime - 8.1) * vec2(-9.0, -8.0) - uCalm.y * normalize(uSunDir.xz)) * vec2(1.0, 0.48);
  if (uLive > 0.0) glintAt -= uLive * vec2(-20.0, 0.0) * vec2(1.0, 0.48);
  float glint = exp(-pow(dot(glintAt, glintAt) / 55000.0, 0.463));
  float fresnel = 0.02 + 0.98 * pow(1.0 - mu * 0.9, 5.0);
  vec3 waterBed = water;
  water += uSkyColour * (0.003 + 0.028 * fresnel) * sparkle * (0.4 + 0.6 * shade);
  // On the lake, from near, the wind is seen on the water: lanes of ruffled surface that take the sky.
  water += uSkyColour * 0.006 * max(sparkle - 0.7, 0.0) * ruffle;
  // (Near its middle the sea is one sheet of light; out in the skirt the wind lanes and slicks of the surface show in it.)
  vec3 glare = uSunColour * mix(vec3(0.86, 0.93, 1.0), vec3(1.0, 0.87, 0.74), smoothstep(0.03, 0.5, glint)) * mix(0.25, 0.4, smoothstep(0.25, 0.7, glint)) * glint * (0.9 + 0.2 * calm);
  vec3 waterSky = water;
  if (uDusk > 0.0) glare *= sunTint(max(uSunDir.y, 0.0)) * uCalm.z;
  water += glare * (0.35 + 0.65 * shade) * mix(0.4 + 0.6 * sparkle, 0.5 + 0.5 * sparkle, glint);
  vec3 waterGlare = water;

  // (From orbit the sea is seen through the blue of the air over it.)
  water += mix(vec3(0.0028, 0.0062, 0.0085) * smoothstep(150.0, 450.0, uViewKm), vec3(0.003, 0.007, 0.011), smoothstep(700.0, 1300.0, uViewKm)) * (0.5 + 0.5 * shade);
  if (uDusk > 0.0) {
    // The sky's image on the sea goes with the sky, the air over it with the air; and at night a faint cold sheen lies toward the moon.
    vec2 fromSheen = xz - uTerm.xy - 1500.0 * normalize(uMoonDir.xz);
    vec3 sheen = moonAt(sunH) * (0.002 + 0.006 * exp(-dot(fromSheen, fromSheen) / 3.0e6) * (0.6 + 0.4 * sparkle)) * (0.5 + 0.5 * shade);
    // (The moon does not reach the bed of the sea: by night only the surface is seen.)
    water = waterBed * (1.0 - 0.9 * uEmber.x) + (waterSky - waterBed) * skyLightAt(sunH, day) + (waterGlare - waterSky) + (water - waterGlare) * airLightAt(sunH) + sheen;
    // (Under the moon the sea has almost no colour.)
    water = mix(water, vec3(dot(water, vec3(0.3, 0.55, 0.15))) * vec3(0.8, 0.96, 1.2), 0.8 * uEmber.x);
  }
  // (The air over the glint is bright too: the land that stands in it is seen through that light.)
  vec3 colour = mix(water, earth + 0.4 * glare, land);
  // (By night the low coast has no line: the wet plain is a shade over the sea beside it and the land rises out of that into the moon's light.)
  if (uDusk > 0.0) colour = mix(colour, max(colour, water) * 0.35 + water * 0.95, 0.92 * (1.0 - smoothstep(0.0, 0.16, height)) * land * uEmber.x);
  // (A pale crust lies at the foot of the lake's rim, where the water has stood higher.)
  colour *= 1.0 + 0.45 * (1.0 - smoothstep(0.0, 0.07, abs(shoreR - 0.98))) * land * (1.0 - smoothstep(150.0, 400.0, uViewKm));

  // ---- the air between the surface and the eye: more of it toward the edge of the planet, less over the high ground ----
  float path = 1.0 / max(mu, 0.12);
  float far = smoothstep(120.0, 900.0, uViewKm);
  // From orbit the haze is thin straight down and grows toward the edge of the planet, where it lifts the darks to blue grey.
  float beyond = max(path - 1.5, 0.0);
  float air = 1.0 - exp(-(mix(0.014, 0.011, far) * path + 0.0005 * far * beyond * beyond) * (1.0 - 0.5 * height * land));
  vec3 underAir = colour;
  colour = mix(colour, mix(uAirColour, vec3(0.08, 0.19, 0.27), 0.6 * far) * (0.4 + 0.6 * shade), air);
  if (uDusk > 0.0) colour = mix(underAir, mix(uAirColour, vec3(0.08, 0.19, 0.27), 0.6 * far) * (0.4 + 0.6 * shade) * airLightAt(sunH), air);
  // (The skin of the lake of fire is black rock: the moon shows nothing of it.)
  if (uDusk > 0.0) colour *= 1.0 - 0.85 * lakeNight;
  colour += glow * (1.0 - 0.5 * air);

  // ---- the handoff: the rise begins inside the cloud that lies over the lake (join/). Under it, until the maps of the lake are near
  // enough to their own size to be water, the lake is its own deep colour with the wind on it ----
  if (uHand.x > 0.0) colour = mix(colour, uHandWater * (0.62 + 0.5 * sparkle), uHand.x);

  // ---- one part drawn alone ----
  vec2 inLake = (xz - uLakeMid) / uLakeSize;
  float lake = (1.0 - land) * (1.0 - smoothstep(1.0, 1.12, length(inLake)));
  vec2 inPan = (xz - uSalt) / vec2(150.0, 118.0);
  float pan = land * (1.0 - smoothstep(0.8, 1.1, length(inPan)));
  float show = 1.0;
  if (uOnly > 0.5) show = (1.0 - land) * (1.0 - lake);
  if (uOnly > 1.5) show = land * (1.0 - pan);
  if (uOnly > 2.5) show = pan;
  if (uOnly > 3.5) show = lake;
  if (uOnly > 4.5) { show = 1.0; colour = glow; }
  colour *= show;

  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

export function create(ctx: Context): Piece {
  const maps = LEVELS.map((l) => ctx.assets.texture(`maps/map-${l.name}.jpg`, { kind: 'colour', repeat: false }));
  const reliefs = LEVELS.map((l) => ctx.assets.texture(`land/relief-${l.name}.png`, { kind: 'data', repeat: false }));
  const rect = (l: Level): THREE.Vector4 => new THREE.Vector4(...l.rect);
  const rects = LEVELS.map(rect);
  // Km of one texel of each map: read from the picture once it is in, since larger copies of the maps may replace these.
  const texelKm = (i: number): number => {
    const image = (maps[i] as THREE.Texture).image as { width?: number } | undefined;
    return ((LEVELS[i] as Level).width * KM) / (image?.width ?? 1672);
  };

  const own = { value: 0 };
  const uniforms: Record<string, THREE.IUniform> = {
    ...ctx.rig.uniforms,
    uSolo: own,
    uMapWide: { value: maps[0] },
    uReliefWide: { value: reliefs[0] },
    uRectWide: { value: rects[0] },
    uMapClose: { value: maps[1] },
    uReliefClose: { value: reliefs[1] },
    uRectClose: { value: rects[1] },
    uClose: { value: 0 },
    uTexelKm: { value: new THREE.Vector3(1, 1, 1) },
    // The Builder's photographs of ground (assets-src/reveal/mat/RECIPE.md): colour, and the slope of the range.
    uMatRange: { value: ctx.assets.texture('mat/range.jpg', { kind: 'colour', repeat: true }) },
    uMatPlain: { value: ctx.assets.texture('mat/plain.jpg', { kind: 'colour', repeat: true }) },
    uMatBadland: { value: ctx.assets.texture('mat/badland.jpg', { kind: 'colour', repeat: true }) },
    uMatShelf: { value: ctx.assets.texture('mat/shelf.jpg', { kind: 'colour', repeat: true }) },
    uMatRangeNh: { value: ctx.assets.texture('mat/range-nh.png', { kind: 'data', repeat: true }) },
    uMatGlitter: { value: ctx.assets.texture('mat/glitter.jpg', { kind: 'colour', repeat: true }) },
    uMatLakewater: { value: ctx.assets.texture('mat/lakewater.jpg', { kind: 'colour', repeat: true }) },
    uOnly: { value: 0 },
    uHandWater: { value: new THREE.Color(handoff.water) },
    // x: how much of the deep water of the handoff is left.
    uHand: { value: new THREE.Vector2(1, 0) },
    uLake: { value: new THREE.Vector2(X(AT.lake.x), Z(AT.lake.y)) },
    // The lake as map-d draws it (make_relief.py prints these): its middle, and its half axes.
    uLakeMid: { value: new THREE.Vector2(X(AT.lake.x - 5.9), Z(AT.lake.y + 5.6)) },
    uLakeSize: { value: new THREE.Vector2(62.5 * KM, 57.7 * KM) },
    uLava: { value: new THREE.Vector2(X(AT.lava.x), Z(AT.lava.y)) },
    uThroat: { value: new THREE.Vector2(X(AT.throat.x), Z(AT.throat.y)) },
    uSalt: { value: new THREE.Vector2(X(AT.salt.x), Z(AT.salt.y) + 10 * KM) },
    // Where on the sea the sun's own image lies on the titan frame.
    uGlint: { value: new THREE.Vector2(X(5875), Z(703)) },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: RIG_VERTEX, fragmentShader: FRAGMENT });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(90000, 90000).rotateX(-Math.PI / 2), material);
  sheet.frustumCulled = false;
  sheet.renderOrder = 0;
  ctx.scene.add(ctx.parts.built('continent', sheet));
  for (const name of ['sea', 'salt', 'lake', 'lava']) ctx.parts.effect(name, 'built');

  const ONLY: Record<string, number> = { 'reveal/sea': 1, 'reveal/continent': 2, 'reveal/salt': 3, 'reveal/lake': 4, 'reveal/lava': 5 };
  const startWidth = rise.at(RISE_FIRST).w;
  const ease = (a: number, b: number, x: number): number => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  return {
    setTime: (seconds) => {
      const window = rise.at(RISE_FIRST + seconds * FPS);
      const width = window.w;
      const pair = pairFor(window.cx, window.cy, width, FILM_ASPECT);
      (uniforms.uMapWide as THREE.IUniform).value = maps[pair.coarse];
      (uniforms.uReliefWide as THREE.IUniform).value = reliefs[pair.coarse];
      (uniforms.uRectWide as THREE.IUniform).value = rects[pair.coarse];
      (uniforms.uMapClose as THREE.IUniform).value = maps[pair.fine];
      (uniforms.uReliefClose as THREE.IUniform).value = reliefs[pair.fine];
      (uniforms.uRectClose as THREE.IUniform).value = rects[pair.fine];
      (uniforms.uClose as THREE.IUniform<number>).value = pair.mix;
      (uniforms.uTexelKm as THREE.IUniform<THREE.Vector3>).value.set(texelKm(pair.coarse), texelKm(pair.fine), texelKm(0));
      const wide = width / startWidth;
      (uniforms.uHand as THREE.IUniform<THREE.Vector2>).value.set(1 - ease(1, 1.7, wide), 0);
    },
    solo: (part) => {
      const mine = part !== null && part in ONLY;
      (uniforms.uOnly as THREE.IUniform<number>).value = mine ? (ONLY[part] as number) : 0;
      // Four of the five are effects of this one sheet: drawn alone, the sheet must not black itself.
      own.value = mine ? 0 : (ctx.rig.uniforms.uSolo as THREE.IUniform<number>).value;
    },
    dispose: () => {
      sheet.geometry.dispose();
      material.dispose();
    },
  };
}
