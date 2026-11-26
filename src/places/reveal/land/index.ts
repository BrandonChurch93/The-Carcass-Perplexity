// The surface of the planet: the sea, the continent that is the body, the salt pan of the hips, the lake of the Eye and the lava of the Heart.
// One sheet at sea level draws all five, from the nested pictures of land/levels.ts (the ground's own colour, and its slope and height).
// The light is the rig's: one sun, the blue of the air, the shade of the cloud (shared/weather.ts) and the edge of the planet.
import * as THREE from 'three';
import { FPS } from '../../../config';
import { AT, KM, RING_FADE, RISE_FIRST, SUN, X, Z, handoff, rise } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { WEATHER_GLSL } from '../shared/weather';
import { LEVELS, pairFor, type Level } from './levels';

export const PARTS = ['sea', 'continent', 'salt', 'lake', 'lava'] as const;

const FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${WEATHER_GLSL}
uniform sampler2D uGroundWide;
uniform sampler2D uShapeWide;
uniform sampler2D uBones;
uniform sampler2D uMatRange;
uniform sampler2D uMatPlain;
uniform sampler2D uMatBadland;
uniform sampler2D uMatRangeNh;
uniform sampler2D uMatBadlandNh;
uniform vec4 uRectA;
uniform vec4 uRectWide;
uniform sampler2D uGroundClose;
uniform sampler2D uShapeClose;
uniform vec4 uRectClose;
uniform float uClose;
uniform float uOnly;
uniform vec3 uHandWater;
uniform vec3 uHandRing;
uniform vec3 uRingShape;
uniform vec2 uHand;
uniform vec2 uLake;
uniform vec2 uLakeSize;
uniform vec2 uLava;
uniform vec2 uSalt;
uniform vec2 uGlint;
uniform float uPlanetKm;
uniform vec4 uStorm;
uniform vec3 uCyclone;
uniform vec2 uShadeOff;
varying vec3 vWorld;

const vec3 DEEP = vec3(0.006, 0.017, 0.04);
// The dearer land: false leaves the great ranges smooth from orbit (three reads of a picture fewer; both costs in HANDOVER.md).
const bool ORBIT_GRAIN = true;
// The bay in the far leg, on the rectangle of the widest level: where, and its half size.
const vec2 BAY_AT = vec2(0.79, 0.205);
const vec2 BAY_SIZE = vec2(0.027, 0.108);
// The lesser vents: x and z from the Heart, km, and their size beside it.
const vec3 VENTS[6] = vec3[6](vec3(-42.0, -98.0, 0.5), vec3(76.0, -33.0, 0.55), vec3(170.0, -66.0, 0.45), vec3(124.0, 24.0, 0.4), vec3(-52.0, 50.0, 0.45), vec3(43.0, 79.0, 0.4));

float inside(vec2 uv) {
  vec2 m = min(uv, 1.0 - uv);
  return smoothstep(0.0, 0.03, min(m.x, m.y));
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

  // ---- the two pictures of the ground ----
  // Round the lake of the Eye the pictures are read through a small bend, so its shore has bays and spits and is no drawn ellipse.
  vec2 lakeAt = (xz - uLake) / uLakeSize;
  float lakeR = length(lakeAt);
  float bendBy = (1.0 - smoothstep(1.25, 2.1, lakeR)) * smoothstep(0.25, 0.75, lakeR);
  vec2 read = xz;
  if (bendBy > 0.0) {
    vec2 bendOf = vec2(vnoise(lakeAt * 2.6 + 3.0) + 0.5 * vnoise(lakeAt * 8.0 + 7.0), vnoise(lakeAt * 2.6 + 19.0) + 0.5 * vnoise(lakeAt * 8.0 + 31.0)) - 0.75;
    read += bendBy * 0.16 * uLakeSize * bendOf;
  }
  vec2 uvWide = (read - uRectWide.xy) * uRectWide.zw;
  vec2 uvClose = (read - uRectClose.xy) * uRectClose.zw;
  float inWide = inside(uvWide);
  float inClose = inside(uvClose) * uClose;
  vec3 ground = mix(DEEP, texture2D(uGroundWide, clamp(uvWide, 0.0, 1.0)).rgb, inWide);
  vec3 shape = mix(vec3(0.5, 0.5, 0.0), texture2D(uShapeWide, clamp(uvWide, 0.0, 1.0)).rgb, inWide);
  if (inClose > 0.0) {
    ground = mix(ground, texture2D(uGroundClose, clamp(uvClose, 0.0, 1.0)).rgb, inClose);
    shape = mix(shape, texture2D(uShapeClose, clamp(uvClose, 0.0, 1.0)).rgb, inClose);
  }
  // A bay breaks the outline of the far leg: the sea comes in from the north coast to the foot of the range. It is cut here, in the
  // shader, and not in the pictures: the floor falls from the shore to the middle, and the colour of the water follows the floor.
  vec2 inBay = mat2(0.94, 0.34, -0.34, 0.94) * (((read - uRectA.xy) * uRectA.zw - BAY_AT) / BAY_SIZE);
  float bayEdge = length(inBay);
  if (bayEdge < 1.6) {
    bayEdge += 0.36 * (vnoise(xz / 43.0 + 3.0) - 0.5) + 0.16 * (vnoise(xz / 13.0 + 8.0) - 0.5);
    float floorOf = mix(0.06, 0.58, smoothstep(0.3, 1.08, bayEdge));
    float wet = 1.0 - smoothstep(0.42, 0.5, floorOf);
    ground = mix(ground, mix(vec3(0.012, 0.04, 0.056), vec3(0.075, 0.16, 0.14), smoothstep(0.3, 0.48, floorOf)), wet * step(floorOf, shape.b));
    shape.b = min(shape.b, floorOf);
    shape.rg = mix(shape.rg, vec2(0.5), 1.0 - smoothstep(0.9, 1.25, bayEdge));
  }
  float land = smoothstep(0.485, 0.515, shape.b);
  float height = clamp((shape.b - 0.56) / 0.44, 0.0, 1.0);
  float depth = clamp(1.0 - shape.b / 0.44, 0.0, 1.0);
  vec2 slope = shape.rg * 2.0 - 1.0;
  // From far the relief is drawn up, as it is on a map, and read across the whole width of a range: a lit side and a shadow side.
  float far = smoothstep(120.0, 900.0, uViewKm);
  slope *= 1.0 + 0.6 * far;
  slope *= min(1.0, 0.97 / max(length(slope), 1e-3));
  // From near the rock is not smooth between the valleys the pictures hold: gullies and ribs too small for them.
  float nearby = 1.0 - smoothstep(50.0, 320.0, uViewKm);
  if (nearby > 0.0) {
    vec2 g1 = xz * 1.4;
    vec2 g2 = xz * 4.3 + 11.0;
    float h1 = vnoise(g1);
    float h2 = vnoise(g2);
    vec2 fine = vec2(vnoise(g1 + vec2(0.3, 0.0)) - h1, vnoise(g1 + vec2(0.0, 0.3)) - h1) * 1.3 + vec2(vnoise(g2 + vec2(0.3, 0.0)) - h2, vnoise(g2 + vec2(0.0, 0.3)) - h2) * 0.8;
    slope += fine * nearby * land * (0.25 + 0.75 * smoothstep(0.02, 0.3, length(slope)));
  }
  // Three kinds of country, from the photographs under mat: bare ranges on the high ground, braided plains on the low, canyon land on the
  // uplands and in the dry provinces. Each is laid twice, at its real size and wider and turned, and the two are bent, so no repeat shows.
  // They give the colour its grain and the relief its small shapes; the large shape stays the place's own.
  vec3 country = vec3(1.0);
  float tableland = 0.0;
  float grain = (1.0 - smoothstep(560.0, 1050.0, uViewKm)) * land;
  if (uViewKm < 1050.0) {
    float high = smoothstep(0.2, 0.42, height);
    float dry = smoothstep(0.4, 0.62, vnoise(xz / 173.0 + 41.0));
    float low = (1.0 - smoothstep(0.03, 0.16, height)) * (1.0 - 0.85 * dry);
    // In the dry provinces the ranges give way to tableland: the valleys of the large shape are laid almost flat and the canyons take over.
    float mesa = dry * (1.0 - smoothstep(0.5, 0.74, height)) * smoothstep(0.1, 0.2, height) * grain;
    slope *= 1.0 - 0.62 * mesa;
    float inRange = high * (1.0 - mesa);
    float inPlain = (1.0 - high) * low;
    float inBadland = max((1.0 - high) * (1.0 - low), mesa);
    vec2 bent = xz + 7.0 * vec2(vnoise(xz / 23.0 + 5.0), vnoise(xz / 23.0 + 15.0));
    float wider = 0.25 + 0.5 * smoothstep(90.0, 450.0, uViewKm);
    mat2 turnA = mat2(0.8, 0.6, -0.6, 0.8);
    mat2 turnB = mat2(-0.28, 0.96, -0.96, -0.28);
    vec2 r1 = turnA * bent / 40.0 + vec2(0.17, 0.52);
    vec2 r2 = turnB * bent / 137.0 + vec2(0.61, 0.08);
    vec2 p1 = turnB * bent / 60.0 + vec2(0.4, 0.33);
    vec2 p2 = turnA * bent / 191.0 + vec2(0.72, 0.9);
    vec2 b1 = turnA * bent / 30.0 + vec2(0.05, 0.77);
    vec2 b2 = turnB * bent / 109.0 + vec2(0.48, 0.26);
    vec3 ofRange = mix(texture2D(uMatRange, r1).rgb, texture2D(uMatRange, r2).rgb, wider) / vec3(0.122, 0.126, 0.125);
    vec3 ofPlain = mix(texture2D(uMatPlain, p1).rgb, texture2D(uMatPlain, p2).rgb, wider) / vec3(0.182, 0.157, 0.12) * vec3(1.1, 1.0, 0.86);
    vec3 ofBadland = mix(texture2D(uMatBadland, b1).rgb, texture2D(uMatBadland, b2).rgb, wider) / vec3(0.235, 0.199, 0.191) * vec3(1.1, 0.97, 0.9);
    country = clamp(inRange * ofRange + inPlain * ofPlain + inBadland * ofBadland, 0.3, 2.6);
    vec2 a1 = texture2D(uMatRangeNh, r1).rg * 2.0 - 1.0;
    vec2 a2 = texture2D(uMatRangeNh, r2).rg * 2.0 - 1.0;
    vec2 c1 = texture2D(uMatBadlandNh, b1).rg * 2.0 - 1.0;
    vec2 c2 = texture2D(uMatBadlandNh, b2).rg * 2.0 - 1.0;
    vec2 small = inRange * ((vec2(a1.x, -a1.y) * turnA) * (1.0 - wider) + (vec2(a2.x, -a2.y) * turnB) * wider)
      + inBadland * ((vec2(c1.x, -c1.y) * turnA) * (1.0 - wider) + (vec2(c2.x, -c2.y) * turnB) * wider);
    slope += small * (0.55 + 0.35 * mesa) * grain;
    tableland = mesa;
    slope *= min(1.0, 0.97 / max(length(slope), 1e-3));
  }
  // From orbit the great ranges keep the grain of rock: the range photograph again, laid very wide (330 and 610 km a repeat, where a pixel can still show its valleys), on the bones most of all,
  // so a rib is a range with spurs and valleys of its own and not a smooth bank.
  float spur = 0.0;
  vec2 uvA = (read - uRectA.xy) * uRectA.zw;
  float skeleton = texture2D(uBones, clamp(uvA, 0.0, 1.0)).r * inside(uvA);
  if (ORBIT_GRAIN && uViewKm >= 1050.0) {
    mat2 turnA = mat2(0.8, 0.6, -0.6, 0.8);
    mat2 turnB = mat2(-0.28, 0.96, -0.96, -0.28);
    vec2 r3 = turnB * xz / 330.0 + vec2(0.61, 0.08);
    vec2 r4 = turnA * xz / 610.0 + vec2(0.23, 0.47);
    // (Read at a level worked out here from the size of a pixel on the ground: one plain read each, which is what keeps this cheap.)
    float texels = max(fwidth(xz.x), fwidth(xz.y)) * 1024.0;
    float lod3 = log2(max(texels / 330.0, 1.0));
    float lod4 = log2(max(texels / 610.0, 1.0));
    vec2 a3 = textureLod(uMatRangeNh, r3, lod3).rg * 2.0 - 1.0;
    vec2 a4 = textureLod(uMatRangeNh, r4, lod4).rg * 2.0 - 1.0;
    grain = smoothstep(1050.0, 1300.0, uViewKm) * land * (0.25 + 0.75 * skeleton);
    country = clamp(textureLod(uMatRange, r3, lod3).rgb / vec3(0.122, 0.126, 0.125), 0.45, 1.9);
    vec2 spurs = (vec2(a3.x, -a3.y) * turnB) * 0.55 + (vec2(a4.x, -a4.y) * turnA) * 0.5;
    slope += spurs * 0.9 * grain;
    spur = dot(spurs, normalize(uSunDir.xz)) * grain;
    slope *= min(1.0, 0.97 / max(length(slope), 1e-3));
  }
  vec3 n = normalize(vec3(slope.x, sqrt(max(1.0 - dot(slope, slope), 0.04)), slope.y));
  vec2 toSunUv = normalize(uSunDir.xz) * (9.0 / 4096.0) * uRectWide.zw / abs(uRectWide.z);
  float ahead = texture2D(uShapeWide, clamp(uvWide + toSunUv, 0.0, 1.0), 2.5).b;
  float behind = texture2D(uShapeWide, clamp(uvWide - toSunUv, 0.0, 1.0), 2.5).b;
  float side = clamp((max(behind, 0.5) - max(ahead, 0.5)) * 6.0, -1.0, 1.0) * inWide * mix(0.6, 1.0, far);

  float shade = cloudShade(xz);
  // The storm on the spine and the cyclone stand high: their shade falls on the sea beside them, away from the sun.
  vec2 underStorm = (xz - uStorm.xy - uShadeOff * 1.0) / uStorm.zw;
  shade *= 1.0 - 0.72 * (1.0 - smoothstep(0.55, 1.05, length(underStorm)));
  vec2 underCyclone = (xz - uCyclone.xy - uShadeOff * 0.8) / uCyclone.z;
  shade *= 1.0 - 0.45 * (1.0 - smoothstep(0.1, 0.75, length(underCyclone)));
  float mu = limbCos(xz);

  // ---- the land ----
  // Seen from far, the lowlands are dark with growth and the ranges pale with bare rock.
  float fromFar = smoothstep(40.0, 400.0, uViewKm);
  vec3 sea = ground;
  // (The salt of the pan is the one pale thing on low ground: it keeps its white.)
  float salt = smoothstep(0.4, 0.65, min(sea.r, min(sea.g, sea.b))) * (1.0 - smoothstep(0.1, 0.2, height));
  ground *= mix(1.0, mix(0.68, 1.0, smoothstep(0.02, 0.4, height)), land * fromFar * (1.0 - salt));
  // From orbit a whole range is read as one pale body against the dark of the plains, before any one of its ridges is.
  float massif = smoothstep(0.6, 0.73, texture2D(uShapeWide, clamp(uvWide, 0.0, 1.0), 4.0).b);
  // The great ranges, the bones, stand over the lesser ones: the cover of the cloud knows them (the cloud banks against them).
  float bones = smoothstep(0.12, 0.55, texture2D(uCloudCover, clamp((xz - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0), 1.0).b);
  ground *= mix(1.0, mix(0.44, 1.05, max(massif, salt)) * mix(0.7, 1.45, max(bones, salt)), land * far * inWide);
  // The crests of the bones are bare pale rock, the colour of old bone: from orbit they are the palest thing on the land but the salt.
  ground = mix(ground, vec3(0.62, 0.55, 0.45), 0.4 * bones * smoothstep(0.2, 0.5, height) * (1.0 - salt) * land * far * inWide);
  // Only near the top of the rise do the bones come together: the great ranges stand bare and pale, the land between them dark.
  // (The picture of the bones is the traced outline of the ranges, on the rectangle of the widest level.)
  float top = smoothstep(680.0, 1380.0, uViewKm) * land * (1.0 - salt) * smoothstep(70.0, 200.0, length((xz - uSalt) * vec2(0.8, 1.0)));
  // (The pale of the bones follows their relief: full on the crests and the high slopes, thin in the valleys that cut them, so the
  // range is seen as rock with its own valleys and not as a band of colour.)
  float crest = smoothstep(0.1, 0.46, height);
  ground = mix(ground, vec3(0.57, 0.545, 0.49), 0.46 * skeleton * top * mix(0.42, 1.12, crest));
  ground *= mix(vec3(1.0), vec3(0.86, 0.97, 1.04), top);
  ground *= mix(1.0, 0.72, (1.0 - skeleton) * top) * mix(1.0, 0.8, top);
  // Bare rock is the colour of old bone, not of snow: the snow lies on the highest crests alone.
  float bare = smoothstep(0.1, 0.26, height) * (1.0 - smoothstep(0.58, 0.76, height));
  ground *= mix(vec3(1.0), vec3(0.84, 0.7, 0.54), bare * mix(0.5, 1.0, fromFar));
  if (land > 0.0) {
    // No two ranges are one rock: warm and cold by turns over tens of km, so the relief does not read as one pattern laid down again.
    vec2 strata = xz + 30.0 * vec2(vnoise(xz / 61.0 + 8.0), vnoise(xz / 61.0 + 27.0));
    ground *= mix(vec3(1.12, 1.0, 0.86), vec3(0.86, 0.95, 1.05), smoothstep(0.25, 0.75, vnoise(strata / 47.0 + 1.0))) * (0.84 + 0.32 * vnoise(strata / 13.0 + 6.0));
    ground = mix(ground, vec3(0.86, 0.89, 0.93), 0.55 * smoothstep(0.64, 0.82, height) * fromFar);
    // The plains are not one colour: dry steppe, dark growth, red earth, in provinces hundreds of km across.
    float plain = (1.0 - smoothstep(0.05, 0.22, height)) * fromFar;
    if (plain > 0.0) {
      vec2 province = xz + 90.0 * vec2(vnoise(xz / 230.0 + 4.0), vnoise(xz / 230.0 + 31.0));
      vec3 soil = mix(vec3(1.28, 1.04, 0.7), vec3(0.7, 0.93, 0.68), smoothstep(0.35, 0.65, vnoise(province / 420.0 + 3.1)));
      soil = mix(soil, vec3(1.32, 0.8, 0.6), smoothstep(0.55, 0.8, vnoise(province / 290.0 + 17.0)));
      ground *= mix(vec3(1.0), soil, 0.8 * plain * (1.0 - salt));
    }
  }
  ground *= mix(vec3(1.0), country, 0.8 * grain * (1.0 - salt));
  ground = mix(ground, vec3(0.235, 0.165, 0.13) * country, 0.5 * tableland * (1.0 - salt));
  vec3 earth = rigShade(vWorld, n, view, ground, 0.92, shade);
  earth *= 1.0 + 0.6 * max(side, 0.0) + 0.55 * min(side, 0.0);
  earth *= 1.0 + clamp(1.5 * spur, -0.5, 0.7);
  // The light the sunlit slopes throw back into the shaded ones: without it every shadow is the blue of the sky.
  earth += ground * uSunColour * 0.085 * (0.4 + 0.6 * shade);

  // The lava of the Heart: vents in the black crust of the chest. The great one is the Heart, and it swells with the beat; the heat shows
  // along the cracks round it. Each is a few kilometres of molten rock: from orbit a point of orange light with a glow in the haze over it.
  vec2 fromLava = xz - uLava;
  float swell = 0.8 + 0.9 * uBeat;
  float d0 = dot(fromLava, fromLava);
  float heat = exp(-d0 / 200.0) * 1.3 * swell;
  float halo = exp(-d0 / 1600.0) * (0.6 + 1.4 * uBeat);
  for (int i = 0; i < 6; i++) {
    vec3 vent = VENTS[i];
    vec2 q = fromLava - vent.xy;
    float dd = dot(q, q);
    // The lesser vents answer the beat a little late, each in its turn.
    float answer = 0.75 + 0.5 * uBeat * (0.5 + 0.5 * sin(float(i) * 2.4));
    heat += exp(-dd / (60.0 * vent.z)) * 1.6 * vent.z * answer;
    halo += exp(-dd / (500.0 * vent.z)) * 0.3 * vent.z * answer;
  }
  float vein = cracks(xz / 7.0) * exp(-d0 / 2600.0) * (0.25 + 0.6 * uBeat);
  heat = (heat + vein) * land * (1.0 - smoothstep(0.14, 0.3, height));
  vec3 glow = blackbody(1080.0 + 380.0 * clamp(heat, 0.0, 1.4)) * 0.15 * smoothstep(0.03, 0.6, heat);
  glow += vec3(1.0, 0.3, 0.06) * 0.3 * halo * land;

  // ---- the water ----
  // What comes back from under the surface, lit by the sun and the sky.
  vec3 light = uSunColour * uSunDir.y * shade + skyIrradiance(vec3(0.0, 1.0, 0.0));
  // The sea is not one colour: pale over the shelves, stained red brown where the rivers of the pelvis run out, green and blue by turns in the deep.
  if (lakeR < 1.4) {
    // The lake of the Eye: black in the middle, and round it a broad shelf of amber shallows, uneven, with tongues of it reaching in.
    float shelfIn = 0.7 + 0.3 * (vnoise(lakeAt * 3.1 + 5.0) - 0.5) + 0.14 * (vnoise(lakeAt * 9.0 + 9.0) - 0.5);
    float amber = smoothstep(shelfIn - 0.12, shelfIn + 0.1, lakeR);
    float paler = smoothstep(0.02, 0.34, lakeR - shelfIn) * (0.35 + 0.65 * vnoise(lakeAt * 11.0 + 2.0 + 3.0 * vnoise(lakeAt * 4.0)));
    vec3 eye = mix(vec3(0.002, 0.004, 0.011), mix(vec3(0.04, 0.019, 0.003), vec3(0.17, 0.092, 0.013), paler), amber);
    sea = mix(sea, eye, 1.0 - smoothstep(1.2, 1.4, lakeR));
  }
  float stain = smoothstep(0.0, 0.14, sea.r - sea.b);
  float shelf = 1.0 - smoothstep(0.0, 0.7, depth);
  if (land < 1.0) {
    vec2 gyre = xz + 140.0 * vec2(vnoise(xz / 520.0 + 7.0), vnoise(xz / 520.0 + 23.0));
    float bloom = vnoise(gyre / 380.0 + 11.0);
    sea *= mix(vec3(0.78, 0.92, 1.12), vec3(1.0, 1.22, 1.05), smoothstep(0.3, 0.75, bloom));
  }
  sea = mix(sea, sea * vec3(1.7, 0.75, 0.5), stain);
  vec3 water = sea * light * (0.2 + 0.12 * shelf + 0.3 * stain) * mix(vec3(1.0), vec3(0.52, 0.76, 0.9), far * (1.0 - shelf) * (1.0 - stain));
  // The sky on the surface, and the sun on its waves: the glint lies where the surface of the planet leans half way to the sun.
  vec2 wind = xz + 60.0 * vec2(vnoise(xz / 310.0), vnoise(xz / 310.0 + 9.7));
  float calm = texture2D(uCloudTile, wind / 900.0 + vec2(0.5, 0.2)).b;
  float ruffle = texture2D(uCloudTile, wind / 140.0).b;
  float rough = mix(0.07, 0.115, clamp(0.3 + 0.5 * (calm - 0.5) + 0.3 * (ruffle - 0.5) + 0.3 * depth, 0.0, 1.0));
  float lean = length(xz - uGlint) / uPlanetKm;
  float t2 = lean * lean / (rough * rough);
  float lobe = exp(-t2) / (3.14159 * rough * rough);
  float fresnel = 0.02 + 0.98 * pow(1.0 - mu * 0.9, 5.0);
  water += uSkyColour * mix(0.22, 0.1, far) * fresnel;
  water += uSunColour * vec3(1.0, 0.86, 0.66) * lobe * 0.0036 * shade * (0.6 + 0.4 * depth);
  // Round the glint the low sun lies on the sea as a broad warm glare.
  water += uSunColour * vec3(1.0, 0.84, 0.62) * 0.0064 * exp(-lean * lean / 0.0062) * (0.5 + 0.5 * shade) * (0.3 + 1.0 * calm + 0.6 * (ruffle - 0.5));
  // Surf: a broken white line where the swell meets the coast.
  float surf = smoothstep(0.405, 0.47, shape.b) * (1.0 - land) * smoothstep(0.35, 0.75, ruffle + 0.4 * vnoise(xz * 1.7));
  water = mix(water, vec3(0.62) * light / 3.14159, 0.55 * surf);

  vec3 colour = mix(water, earth, land);

  // ---- the air between the surface and the eye: more of it toward the edge of the planet ----
  float path = 1.0 / max(mu, 0.12);
  float air = 1.0 - exp(-mix(0.0125, 0.008, far) * path * (1.0 - 0.45 * height * land));
  colour = mix(colour, uAirColour * (0.36 + 0.32 * shade), air);
  // Haze lies in the valleys and over the plains, and thins up the ranges.
  float low = land * (1.0 - smoothstep(0.0, 0.3, height)) * (0.6 + 0.8 * vnoise(xz / 70.0));
  colour = mix(colour, (uAirColour * 1.2 + vec3(0.03)) * (0.55 + 0.45 * shade), 0.012 * low * path);
  colour += glow * (1.0 - 0.5 * air);

  // ---- the handoff: on its first frame the rise draws what the Eye last drew, deep water and rings ----
  vec2 fromLake = xz - uLake;
  float r = length(fromLake);
  float k = clamp(floor(log(max(r, 1e-4) / uRingShape.x) / log(1.5) + 0.5), 0.0, 8.0);
  float ringAt = uRingShape.x * pow(1.5, k);
  float pixel = fwidth(r);
  float ring = 1.0 - smoothstep(-pixel, pixel, abs(r - ringAt) - 0.5 * uRingShape.y * ringAt);
  vec3 hand = mix(uHandWater, uHandRing, ring * uHand.y);
  colour = mix(colour, hand, max(uHand.x, ring * uHand.y * step(shape.b, 0.3)));

  // ---- one part drawn alone ----
  vec2 inLake = fromLake / uLakeSize;
  float lake = (1.0 - land) * (1.0 - smoothstep(1.0, 1.12, length(inLake)));
  vec2 inPan = (xz - uSalt) / vec2(150.0, 118.0);
  float pan = land * (1.0 - smoothstep(0.8, 1.1, length(inPan))) * (1.0 - smoothstep(0.1, 0.2, height));
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
  const grounds = LEVELS.map((l) => ctx.assets.texture(`land/ground-${l.name}.jpg`, { kind: 'colour', repeat: false }));
  const shapes = LEVELS.map((l) => ctx.assets.texture(`land/shape-${l.name}.jpg`, { kind: 'data', repeat: false }));
  const rect = (l: Level): THREE.Vector4 => new THREE.Vector4(...l.rect);
  const rects = LEVELS.map(rect);

  const own = { value: 0 };
  const uniforms: Record<string, THREE.IUniform> = {
    ...ctx.rig.uniforms,
    uSolo: own,
    uGroundWide: { value: grounds[0] },
    uShapeWide: { value: shapes[0] },
    uRectWide: { value: rects[0] },
    uBones: { value: ctx.assets.texture('land/bones.jpg', { kind: 'data', repeat: false }) },
    // The Builder's photographs of ground (assets-src/reveal/mat/RECIPE.md): colour, and the slope of two of them.
    uMatRange: { value: ctx.assets.texture('mat/range.jpg', { kind: 'colour', repeat: true }) },
    uMatPlain: { value: ctx.assets.texture('mat/plain.jpg', { kind: 'colour', repeat: true }) },
    uMatBadland: { value: ctx.assets.texture('mat/badland.jpg', { kind: 'colour', repeat: true }) },
    uMatRangeNh: { value: ctx.assets.texture('mat/range-nh.png', { kind: 'data', repeat: true }) },
    uMatBadlandNh: { value: ctx.assets.texture('mat/badland-nh.png', { kind: 'data', repeat: true }) },
    uRectA: { value: rects[0] },
    uGroundClose: { value: grounds[1] },
    uShapeClose: { value: shapes[1] },
    uRectClose: { value: rects[1] },
    uClose: { value: 0 },
    uOnly: { value: 0 },
    uHandWater: { value: new THREE.Color(handoff.water) },
    uHandRing: { value: new THREE.Color(handoff.ring) },
    // The first ring's radius, km, and the width of a ring as a share of its radius.
    uRingShape: { value: new THREE.Vector3((handoff.ringRadii[0] as number) * handoff.revealHalfHeightKm, handoff.ringWidth, 0) },
    // x: how much of the flat water of the handoff is left. y: how much of the rings.
    uHand: { value: new THREE.Vector2(1, 1) },
    uLake: { value: new THREE.Vector2(X(AT.lake.x), Z(AT.lake.y)) },
    uLakeSize: { value: new THREE.Vector2(57 * KM, 50 * KM) },
    uLava: { value: new THREE.Vector2(X(AT.lava.x), Z(AT.lava.y)) },
    uSalt: { value: new THREE.Vector2(X(AT.salt.x), Z(AT.salt.y) + 10 * KM) },
    // Where on the sea the sun's own image lies, and the radius of the planet, km.
    uGlint: { value: new THREE.Vector2(X(6300), Z(800)) },
    uPlanetKm: { value: 10183 * KM },
    // The storm: its middle and its half sizes, km. The cyclone: its middle and its radius. And how far a shade falls for a cloud 7 km up.
    uStorm: { value: new THREE.Vector4(X(AT.storm.x), Z(AT.storm.y), 150 * KM, 115 * KM) },
    uCyclone: { value: new THREE.Vector3(X(AT.cyclone.x), Z(AT.cyclone.y), 640 * KM) },
    uShadeOff: { value: new THREE.Vector2((-SUN[0] / SUN[1]) * 7, (-SUN[2] / SUN[1]) * 7) },
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
      const width = rise.at(RISE_FIRST + seconds * FPS).w;
      const pair = pairFor(width);
      (uniforms.uGroundWide as THREE.IUniform).value = grounds[pair.coarse];
      (uniforms.uShapeWide as THREE.IUniform).value = shapes[pair.coarse];
      (uniforms.uRectWide as THREE.IUniform).value = rects[pair.coarse];
      (uniforms.uGroundClose as THREE.IUniform).value = grounds[pair.fine];
      (uniforms.uShapeClose as THREE.IUniform).value = shapes[pair.fine];
      (uniforms.uRectClose as THREE.IUniform).value = rects[pair.fine];
      (uniforms.uClose as THREE.IUniform<number>).value = pair.mix;
      const wide = width / startWidth;
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
