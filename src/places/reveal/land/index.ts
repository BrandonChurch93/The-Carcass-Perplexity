// The surface of the planet: the sea, the continent that is the body, the salt pan of the hips, the lake of the Eye and the lava of the Heart.
// One sheet at sea level draws all five from the Builder's four nested satellite maps (public/assets/reveal/maps): colour by level, and the
// relief of each level as a slope picture (assets-src/reveal/land/make_relief.py). Where a map is enlarged, the ground photographs under
// public/assets/reveal/mat are laid under it by world position. The light is the rig's: one sun, the air, the shade of the cloud.
import * as THREE from 'three';
import { FPS } from '../../../config';
import { AT, FILM_ASPECT, KM, RING_FADE, RISE_FIRST, X, Z, handoff, rise } from '../shared/anchors';
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
uniform vec3 uHandRing;
uniform vec3 uRingShape;
uniform float uBreak;
uniform vec2 uHand;
uniform vec2 uLake;
uniform vec2 uLakeSize;
uniform vec2 uLakeMid;
uniform vec2 uLava;
uniform vec2 uThroat;
uniform vec2 uSalt;
uniform vec2 uGlint;
uniform float uPlanetKm;
varying vec3 vWorld;

// The deep sea under the sky of this planet: what comes back from the water itself, as a reflectance.
const vec3 DEEP = vec3(0.0022, 0.0065, 0.0135);
// The dearer land: false lays no ground photograph under an enlarged map (both costs in HANDOVER.md).
const bool GROUND_DETAIL = true;
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
  vec2 xz = vWorld.xz;
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
  // Between the ground and orbit the country is seen through air: the map's own hard light and dark, crest by crest, is drawn
  // toward the light of the country round it, so a range is one soft pale body with fine lines in it and no etched thing.
  float soften = mix(0.04, 0.48, smoothstep(90.0, 240.0, uViewKm)) * smoothstep(30.0, 60.0, uViewKm) * (1.0 - smoothstep(450.0, 900.0, uViewKm)) * inWide;
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
  // The stream of the Eye: it leaves the lake through the gap in its rim at the upper left and winds away up the valley.
  vec2 fromLake = (xz - uLakeMid) / uLakeSize;
  float lakeFar = length(fromLake);
  float stream = 0.0;
  // (The spits that the map runs out into the lake are drowned: its shore is one line, and the shallows grade in from it.)
  if (lakeFar < 1.0) {
    float keep = smoothstep(0.88, 0.98, lakeFar + 0.05 * (vnoise(fromLake * 7.0 + 2.0) - 0.5));
    shallow = max(shallow, 0.9 * land * (1.0 - keep) * smoothstep(0.7, 0.95, lakeFar));
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
  vec2 slope = relief.rg * 2.0 - 1.0;
  // How many pixels of the frame one texel of the map covers: past one, the map is soft and the ground photographs carry the detail.
  float enlarged = texel / max(pixelKm, 1e-5);
  float detail = smoothstep(0.8, 2.0, enlarged);

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
      slope += small * 0.62 * detail * land * (0.4 + 0.6 * high);
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
  // West and south of the skull the country is low islands and drowned ridges: dark, wet, teal and green, under the cloud of that sea.
  // The pale is the skull's alone, so it stands out of dark country as bone does out of earth.
  vec2 fromSkull = (xz - vec2(${X(1350).toFixed(1)}, ${Z(1566).toFixed(1)})) / vec2(${(330 * KM).toFixed(1)}, ${(270 * KM).toFixed(1)});
  // (The skull keeps its pale whole, so its two sockets stand dark in it from any height.)
  flank *= smoothstep(0.7, 1.1, length(fromSkull));
  float west = smoothstep(0.95, 1.4, length(fromSkull)) * (1.0 - smoothstep(${X(1600).toFixed(1)}, ${X(1800).toFixed(1)}, xz.x)) * smoothstep(110.0, 220.0, uViewKm);
  float offBone = west * land;
  float bright = dot(ground, vec3(0.3, 0.55, 0.15));
  ground = mix(ground, (0.007 + 0.034 * bright) * mix(vec3(0.05, 0.42, 0.9), ground / max(bright, 0.02), 0.1), 0.95 * offBone);
  slope *= 1.0 - 0.7 * offBone;
  lum = mix(lum, 2.2 * dot(ground, vec3(0.3, 0.55, 0.15)), offBone);
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
  ground = mix(ground, mix(lateLum * vec3(1.05, 0.6, 0.44), min(lateLum, 0.025 + 0.42 * lateLum) * vec3(1.0, 0.62, 0.47), top), mix(0.7, 0.9, top) * flank);
  ground = mix(ground, min(lateLum, 0.02 + 0.6 * lateLum) * vec3(1.9, 0.62, 0.4), 0.75 * min(1.0, 1.4 * rust) * smoothstep(200.0, 420.0, uViewKm));
  // (The crests of the great ranges are pale rock, and snow on the highest: they carry the figure, the land round them dark.)
  float crestHi = smoothstep(0.02, 0.15, height - broad) * (1.0 - lowMid) * wide * (1.0 - offBone);
  ground = mix(ground, vec3(0.7, 0.65, 0.56) * (0.42 + 1.1 * lateLum), 0.45 * crestHi);
  // From orbit the skull is one pale dome of old bone, its valleys gone into it, and the basin beside the lake of the Eye lies in
  // shade: the second socket. (Only from that height: lower down it is a massif like any other.)
  vec2 inSkull = (xz - vec2(-1474.2, -106.2)) / vec2(231.3, 201.3);
  float dome = (1.0 - smoothstep(0.62, 1.0, length(inSkull) + 0.12 * (vnoise(xz / 60.0 + 3.0) - 0.5))) * top;
  float domeLum = dot(ground, vec3(0.3, 0.55, 0.15));
  ground = mix(ground, vec3(0.6, 0.55, 0.47) * (0.3 + 0.95 * domeLum), 0.62 * dome);
  vec2 inSocket = (xz - vec2(-1431.4, -227.9)) / vec2(58.0, 42.0);
  float socket = 1.0 - smoothstep(0.7, 1.1, length(inSocket) + 0.3 * (vnoise(xz / 14.0 + 9.0) - 0.5));
  float sunk = socket * smoothstep(140.0, 250.0, uViewKm) * land;
  ground = mix(ground, vec3(0.006, 0.02, 0.03) * (0.6 + 0.8 * domeLum), 0.95 * sunk);

  // The chest round the Heart is old lava: a black crust between the ribs, which stand out of it pale.
  vec2 fromHeart = xz - uLava;
  float crust = exp(-dot(fromHeart * vec2(0.75, 1.0), fromHeart * vec2(0.75, 1.0)) / 150000.0) * (1.0 - smoothstep(0.24, 0.5, height)) * land;
  ground = mix(ground, vec3(0.013, 0.043, 0.05) * (0.5 + 2.2 * lum), min(1.0, 1.2 * crust));
  // The pan of the pelvis: salt, white under the sun, and the red brine that veins it. East of it the red runs out over the low ground
  // and into the sea, in streaks drawn along the fall of the land.
  vec2 fromPan = xz - uSalt;
  float panAt = (1.0 - smoothstep(0.6, 1.15, length(fromPan / vec2(175.0, 140.0)) + 0.5 * (texture2D(uCloudTile, xz / 420.0, 1.0).b - 0.5))) * land;
  float brine = smoothstep(0.22, 0.48, rawBrine);
  float saltFlat = panAt * (1.0 - brine);
  ground = mix(ground, vec3(0.8, 0.8, 0.78) * (0.8 + 0.5 * lum), 0.92 * saltFlat);
  ground = mix(ground, vec3(0.22, 0.02, 0.02), 0.9 * panAt * brine);
  vec2 run = vec2(0.965, 0.26);
  float alongRun = dot(fromPan, run) / 1150.0;
  float acrossRun = dot(fromPan, vec2(-run.y, run.x)) / (60.0 + 170.0 * alongRun);
  float streaks = texture2D(uCloudTile, vec2(alongRun * 0.9, acrossRun * 0.55 + 0.3) + 0.04 * slope, 1.0).b;
  float plume = exp(-acrossRun * acrossRun * 1.6) * smoothstep(0.06, 0.16, alongRun) * (1.0 - smoothstep(0.35, 1.0, alongRun)) * smoothstep(0.3, 0.75, streaks + 0.25 * (1.0 - alongRun));
  ground = mix(ground, vec3(0.1, 0.034, 0.024) * (0.5 + 1.6 * lum), 0.6 * plume * (1.0 - 0.6 * smoothstep(0.35, 0.6, height)));

  // ---- the light ----
  // The maps hold soft light from the upper left, and the place's sun stands on that side: the relief is lit from the slope, on top of it.
  // Near the ground the relief is gentle, as low sun on old worn country; from orbit it is drawn stronger, as relief is on a map.
  slope *= mix(0.25, 0.4, smoothstep(300.0, 1200.0, uViewKm)) * (1.0 - 0.5 * smoothstep(110.0, 240.0, uViewKm) * (1.0 - smoothstep(450.0, 900.0, uViewKm))) * (1.0 - 0.6 * smoothstep(0.3, 0.62, height));
  vec3 n = normalize(vec3(-slope.x, 0.8, -slope.y));
  float shade = cloudShade(xz);
  float mu = limbCos(xz);
  vec3 level = vec3(0.0, 1.0, 0.0);
  vec3 earth = rigShade(vWorld, mix(level, n, land), view, ground, 0.92, shade);

  // The lava of the Heart: vents in the black crust of the chest. The great one is the Heart, and it swells with the beat; the heat shows
  // along the cracks round it. Each is a few kilometres of molten rock: from orbit a point of orange light, and its light on the slopes that face it.
  vec2 fromLava = xz - uLava;
  float swell = 0.8 + 0.9 * uBeat;
  float d0 = dot(fromLava, fromLava);
  float heat = exp(-d0 / 26.0) * 1.5 * swell;
  float halo = exp(-d0 / 700.0) * (0.5 + 1.5 * uBeat);
  if (d0 < 160000.0) for (int i = 0; i < 6; i++) {
    vec3 vent = VENTS[i];
    vec2 q = fromLava - vent.xy;
    float dd = dot(q, q);
    // The lesser vents answer the beat a little late, each in its turn.
    float answer = 0.75 + 0.5 * uBeat * (0.5 + 0.5 * sin(float(i) * 2.4));
    heat += exp(-dd / (11.0 * vent.z)) * 2.2 * vent.z * answer;
    halo += exp(-dd / (260.0 * vent.z)) * 0.3 * vent.z * answer;
  }
  float vein = d0 < 18000.0 ? cracks(xz / 7.0) * exp(-d0 / 2200.0) * (0.2 + 0.6 * uBeat) : 0.0;
  heat = (heat + vein) * land;
  vec3 glow = blackbody(1080.0 + 380.0 * clamp(heat, 0.0, 1.4)) * 0.17 * smoothstep(0.03, 0.6, heat);
  glow += vec3(1.0, 0.3, 0.06) * 0.12 * halo * land * clamp(0.25 + 2.6 * dot(slope, fromLava / (length(fromLava) + 1.0)), 0.0, 1.8);

  // ---- the water ----
  // What comes back from under the surface: the map's own shallows, bars and silt over the deep, lit by the sun and the sky.
  vec3 light = uSunColour * uSunDir.y * shade + skyIrradiance(level);
  float pale = pow(shallow, 1.3) * (1.0 - 0.6 * west);
  // (From far the shallows along the coasts are a clear teal.)
  vec3 shoal = mix(max(ground * 0.34, vec3(0.006, 0.035, 0.04)), vec3(0.011, 0.075, 0.085) * (0.5 + 0.9 * pale * (1.0 - 0.45 * pale)), 0.6 * smoothstep(240.0, 640.0, uViewKm));
  vec3 bed = mix(DEEP, shoal, pale);
  // The red of the pan carried out to sea: sediment in the water, thinning as it goes.
  bed = mix(bed, vec3(0.2, 0.045, 0.016), 0.75 * plume * (1.0 - land));
  // The lake of the Eye: black in the middle, and round it a margin of amber shallows, uneven, with tongues of it curling in.
  vec2 lakeAt = (xz - uLakeMid) / uLakeSize;
  float lakeR = length(lakeAt);
  if (lakeR < 1.3) {
    vec2 w = lakeAt + 0.2 * vec2(vnoise(lakeAt * 2.7 + 3.0), vnoise(lakeAt * 2.7 + 17.0));
    float swirl = vnoise(w * 5.0 + 2.4 * vnoise(w * 2.1 + 3.0 + uTime * 0.02));
    // (The margin is graded, never lobed: long swirls of it are drawn round and into the dark by the turning of the water.)
    float twist = 2.6 * lakeR + 0.3;
    vec2 tw = mat2(cos(twist), sin(twist), -sin(twist), cos(twist)) * lakeAt;
    float drawn = 0.6 * vnoise(tw * vec2(2.2, 5.5) + 7.0 + 0.5 * swirl) + 0.4 * vnoise(tw * vec2(4.5, 11.0) + 19.0);
    float amber = max(pow(smoothstep(0.5 + 0.46 * drawn + 0.12 * dot(lakeAt / max(lakeR, 0.05), vec2(0.7, -0.7)), 1.02, lakeR), 1.9), 0.45 * smoothstep(0.08, 0.55, shallow) * smoothstep(0.6, 0.9, lakeR));
    float paler = smoothstep(0.35, 1.0, 0.6 * shallow + smoothstep(0.86, 1.02, lakeR) + 0.4 * (drawn - 0.5));
    vec3 eye = mix(vec3(0.002, 0.0065, 0.017), mix(vec3(0.12, 0.058, 0.006), vec3(0.4, 0.23, 0.04), paler), amber);
    bed = mix(bed, eye, (1.0 - smoothstep(1.12, 1.3, lakeR)) * (1.0 - stream * smoothstep(0.98, 1.06, lakeR)));
  }
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
  vec3 gl = mix(
    texture2D(uMatGlitter, mat2(0.8, 0.6, -0.6, 0.8) * sw / layS + 0.37 * seaLower).rgb,
    texture2D(uMatGlitter, mat2(-0.28, 0.96, -0.96, -0.28) * sw / (2.0 * layS) + 0.37 * (seaLower + 1.0)).rgb,
    seaShare);
  float sparkle = clamp(dot(gl, vec3(0.3, 0.55, 0.15)) / 0.0575, 0.4, 2.6);
  // The water of the lake, from near: a photograph of dark still water under wind (mat/lakewater.jpg), 20 km a repeat, and again at 7.
  float inLakeWater = 1.0 - smoothstep(1.0, 1.25, lakeR);
  if (inLakeWater > 0.0 && pixelKm < 0.6) {
    vec2 lw = xz - uTime * vec2(0.03, 0.012);
    float l1 = dot(texture2D(uMatLakewater, mat2(0.8, 0.6, -0.6, 0.8) * lw / 60.0, 2.5).rgb, vec3(0.3, 0.55, 0.15)) / 0.0138;
    float l2 = dot(texture2D(uMatLakewater, mat2(-0.28, 0.96, -0.96, -0.28) * lw / 110.0 + 0.4, 2.5).rgb, vec3(0.3, 0.55, 0.15)) / 0.0138;
    sparkle = mix(sparkle, clamp(0.7 + 0.3 * (0.55 * l1 + 0.45 * l2), 0.7, 1.5), inLakeWater * (1.0 - smoothstep(0.2, 0.6, pixelKm)));
  }
  // The sky on the surface, and the sun on its waves: the glint lies where the surface of the planet leans half way to the sun.
  float calm = texture2D(uCloudTile, xz / 1900.0 + vec2(0.5, 0.2), 2.0).b;
  float rough = mix(0.07, 0.125, clamp(0.25 + 0.5 * (calm - 0.5) + 0.3 * (sparkle - 1.0), 0.0, 1.0));
  // (The glint slides as the planet turns under the sun.)
  float lean = length(xz - uGlint - max(uTime - 20.0, 0.0) * vec2(4.0, 3.0)) / uPlanetKm;
  // (As the eye draws away the glint is seen smaller: a warm soft patch at the right, never a disc that fills the sea.)
  float drawIn = mix(1.0, 0.6, smoothstep(22.0, 60.0, uTime));
  rough *= drawIn;
  float t2 = lean * lean / (rough * rough);
  float lobe = drawIn * drawIn * exp(-t2) / (3.14159 * rough * rough);
  float fresnel = 0.02 + 0.98 * pow(1.0 - mu * 0.9, 5.0);
  water += uSkyColour * (0.003 + 0.028 * fresnel) * sparkle * (0.4 + 0.6 * shade);
  // On the lake, from near, the wind is seen on the water: lanes of ruffled surface that take the sky.
  water += uSkyColour * 0.012 * (sparkle - 0.8) * inLakeWater * (1.0 - smoothstep(0.2, 0.6, pixelKm));
  water += uSunColour * vec3(1.0, 0.86, 0.66) * lobe * 0.0026 * shade * (0.8 + 0.2 * sparkle);
  water += uSunColour * vec3(1.0, 0.84, 0.62) * 0.0098 * exp(-lean * lean / mix(0.0023, 0.0012, smoothstep(22.0, 60.0, uTime))) * (0.78 + 0.22 * shade) * (0.62 + 0.38 * sparkle) * (0.85 + 0.3 * calm);

  // (From orbit the sea is seen through the blue of the air over it.)
  water += vec3(0.003, 0.007, 0.011) * smoothstep(700.0, 1300.0, uViewKm) * (0.5 + 0.5 * shade);
  vec3 colour = mix(water, earth, land);
  // (A pale crust lies at the foot of the lake's rim, where the water has stood higher.)
  colour *= 1.0 + 0.45 * (1.0 - smoothstep(0.0, 0.07, abs(lakeR - 1.05))) * land * (1.0 - smoothstep(150.0, 400.0, uViewKm));

  // ---- the air between the surface and the eye: more of it toward the edge of the planet, less over the high ground ----
  float path = 1.0 / max(mu, 0.12);
  float far = smoothstep(120.0, 900.0, uViewKm);
  // From orbit the haze is thin straight down and grows toward the edge of the planet, where it lifts the darks to blue grey.
  float beyond = max(path - 1.5, 0.0);
  float air = 1.0 - exp(-(mix(0.014, 0.011, far) * path + 0.0005 * far * beyond * beyond) * (1.0 - 0.5 * height * land));
  colour = mix(colour, mix(uAirColour, vec3(0.08, 0.19, 0.27), 0.6 * far) * (0.4 + 0.6 * shade), air);
  colour += glow * (1.0 - 0.5 * air);

  // ---- the handoff: on its first frame the rise draws what the Eye last drew, deep water and rings ----
  if (uHand.x > 0.0 || uHand.y > 0.0) {
    vec2 fromLake = xz - uLake;
    float r = length(fromLake);
    float k = clamp(floor(log(max(r, 1e-4) / uRingShape.x) / log(1.5) + 0.5), 0.0, 8.0);
    float ringAt = uRingShape.x * pow(1.5, k);
    // On the first frame (uBreak 0) the rings are the rest picture agreed with the Eye: soft bands, each stronger on one side.
    // Once the rise begins they are water and no drawn thing: each one bent out of round, broken into arcs of uneven strength,
    // wider and weaker the further out, and the whole of it soon gone.
    vec2 outward = fromLake / max(r, 1e-4);
    float theta = atan(fromLake.x, -fromLake.y);
    float bentBy = vnoise(outward * 2.3 + k * 3.7) + 0.5 * vnoise(outward * 6.1 + k * 9.1) - 0.75;
    float rr = r * (1.0 + uBreak * 0.11 * bentBy);
    float across = (rr - ringAt) / (0.5 * uRingShape.y * ringAt * (1.0 + 0.7 * uBreak));
    float ring = exp(-across * across) * (0.35 + 0.3 * (0.5 + 0.5 * sin(2.0 * theta + 2.4 * k)));
    float arcs = smoothstep(0.38, 0.7, vnoise(outward * 3.4 + k * 5.3 + 2.0) + 0.35 * (vnoise(xz * 0.9 / max(ringAt, 1e-3) * 9.0) - 0.5));
    ring *= mix(1.0, arcs * exp(-0.3 * k), uBreak);
    vec3 hand = mix(uHandWater, uHandRing, ring * uHand.y);
    colour = mix(colour, hand, max(uHand.x, ring * uHand.y * (1.0 - land)));
  }

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
    uHandRing: { value: new THREE.Color(handoff.ring) },
    // The first ring's radius, km, and the width of a ring as a share of its radius.
    uBreak: { value: 0 },
    uRingShape: { value: new THREE.Vector3((handoff.ringRadii[0] as number) * handoff.revealHalfHeightKm, handoff.ringWidth, 0) },
    // x: how much of the flat water of the handoff is left. y: how much of the rings.
    uHand: { value: new THREE.Vector2(1, 1) },
    uLake: { value: new THREE.Vector2(X(AT.lake.x), Z(AT.lake.y)) },
    // The lake as map-d draws it (make_relief.py prints these): its middle, and its half axes.
    uLakeMid: { value: new THREE.Vector2(X(AT.lake.x - 5.9), Z(AT.lake.y + 5.6)) },
    uLakeSize: { value: new THREE.Vector2(62.5 * KM, 57.7 * KM) },
    uLava: { value: new THREE.Vector2(X(AT.lava.x), Z(AT.lava.y)) },
    uThroat: { value: new THREE.Vector2(X(AT.throat.x), Z(AT.throat.y)) },
    uSalt: { value: new THREE.Vector2(X(AT.salt.x), Z(AT.salt.y) + 10 * KM) },
    // Where on the sea the sun's own image lies, and the radius of the planet, km.
    uGlint: { value: new THREE.Vector2(X(6350), Z(1050)) },
    uPlanetKm: { value: 10183 * KM },
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
      (uniforms.uBreak as THREE.IUniform<number>).value = ease(1, 1.16, wide);
      (uniforms.uHand as THREE.IUniform<THREE.Vector2>).value.set(1 - ease(1, 1.7, wide), 1 - ease(RING_FADE[0], RING_FADE[1], wide));
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
