// The surface of the planet: the sea, the continent that is the body, the salt pan of the hips, the lake of the Eye and the lava of the Heart.
// One sheet at sea level draws all five from the Builder's four nested satellite maps (public/assets/reveal/maps): colour by level, and the
// relief of each level as a slope picture (assets-src/reveal/land/make_relief.py). Where a map is enlarged, the ground photographs under
// public/assets/reveal/mat are laid under it by world position. The light is the rig's: one sun, the air, the shade of the cloud.
import * as THREE from 'three';
import { FPS } from '../../../config';
import { AT, KM, RING_FADE, RISE_FIRST, X, Z, handoff, rise } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { WEATHER_GLSL } from '../shared/weather';
import { LEVELS, pairFor, type Level } from './levels';

export const PARTS = ['sea', 'continent', 'salt', 'lake', 'lava'] as const;

const FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${WEATHER_GLSL}
uniform sampler2D uMapA;
uniform sampler2D uReliefA;
uniform vec4 uRectA;
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
uniform vec2 uSalt;
uniform vec2 uGlint;
uniform float uPlanetKm;
varying vec3 vWorld;

// The deep sea under the sky of this planet: what comes back from the water itself, as a reflectance.
const vec3 DEEP = vec3(0.0035, 0.009, 0.02);
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
    // Past the edge of the wide map lies the widest, and past that the open sea.
    vec2 uvA = (xz - uRectA.xy) * uRectA.zw;
    float inA = inside(uvA, 0.04);
    vec3 beyond = mix(vec3(0.0, 0.004, 0.009), texture2D(uMapA, clamp(uvA, 0.0, 1.0)).rgb, inA);
    vec3 farRelief = mix(vec3(0.5, 0.5, 0.0), texture2D(uReliefA, clamp(uvA, 0.0, 1.0)).rgb, inA);
    ground = mix(beyond, ground, inWide);
    relief = mix(farRelief, relief, inWide);
    texel = mix(uTexelKm.z, texel, inWide);
  }
  if (inClose > 0.0) {
    ground = mix(ground, texture2D(uMapClose, clamp(uvClose, 0.0, 1.0)).rgb, inClose);
    relief = mix(relief, texture2D(uReliefClose, clamp(uvClose, 0.0, 1.0)).rgb, inClose);
    texel = mix(texel, uTexelKm.y, inClose);
  }
  // Blue of the relief: over 0.3 the height of the land, under 0.25 water and how shallow it is.
  float land = smoothstep(0.255, 0.3, relief.b);
  float height = clamp((relief.b - 0.3) / 0.7, 0.0, 1.0);
  float shallow = clamp(relief.b / 0.25, 0.0, 1.0) * (1.0 - land);
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
      ground *= mix(vec3(1.0), mix(vec3(tone), country, 0.35), 0.75 * detail * land);
      vec2 a1 = texture2D(uMatRangeNh, pa).rg * 2.0 - 1.0;
      vec2 a2 = texture2D(uMatRangeNh, pb).rg * 2.0 - 1.0;
      vec2 small = mix(vec2(a1.x, a1.y) * turnA, vec2(a2.x, a2.y) * turnB, share);
      slope += small * 0.5 * detail * land * (0.4 + 0.6 * high);
    } else {
      // Under shallow water: bars, channels and silt.
      vec3 ofShelf = mix(texture2D(uMatShelf, pa * 0.5).rgb, texture2D(uMatShelf, pb * 0.5).rgb, share) / vec3(0.055, 0.159, 0.148);
      ground *= mix(vec3(1.0), clamp(ofShelf, 0.4, 2.2), 0.6 * detail * smoothstep(0.05, 0.4, shallow));
    }
  }

  // ---- the colour of this place: cold. The growth of the lowlands is dark slate and teal, the rock blue grey, the high crests the pale of old bone. ----
  lum = dot(ground, vec3(0.3, 0.55, 0.15));
  float growth = clamp((ground.g - max(ground.r, ground.b)) / max(lum, 0.02) * 4.0, 0.0, 1.0) * land;
  ground = mix(ground, lum * vec3(0.42, 0.68, 0.78), 0.85 * growth);
  ground = mix(ground, mix(vec3(lum), ground, 0.8) * vec3(0.92, 0.99, 1.09), land);
  // Only near the top of the rise does the body come together: the great ranges stand pale as old bone, the country between them falls dark and cold.
  float top = smoothstep(680.0, 1380.0, uViewKm) * land;
  float crest = smoothstep(0.3, 0.62, height);
  ground *= mix(1.0, mix(0.5, 1.12, crest), top);
  ground = mix(ground, vec3(0.74, 0.72, 0.66), 0.3 * top * smoothstep(0.5, 0.85, height));

  // ---- the light ----
  // The maps hold soft light from the upper left, and the place's sun stands on that side: the relief is lit from the slope, on top of it.
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
  float heat = exp(-d0 / 90.0) * 1.5 * swell;
  float halo = exp(-d0 / 1300.0) * (0.5 + 1.5 * uBeat);
  for (int i = 0; i < 6; i++) {
    vec3 vent = VENTS[i];
    vec2 q = fromLava - vent.xy;
    float dd = dot(q, q);
    // The lesser vents answer the beat a little late, each in its turn.
    float answer = 0.75 + 0.5 * uBeat * (0.5 + 0.5 * sin(float(i) * 2.4));
    heat += exp(-dd / (30.0 * vent.z)) * 1.8 * vent.z * answer;
    halo += exp(-dd / (420.0 * vent.z)) * 0.3 * vent.z * answer;
  }
  float vein = cracks(xz / 7.0) * exp(-d0 / 2200.0) * (0.2 + 0.6 * uBeat);
  heat = (heat + vein) * land;
  vec3 glow = blackbody(1080.0 + 380.0 * clamp(heat, 0.0, 1.4)) * 0.17 * smoothstep(0.03, 0.6, heat);
  glow += vec3(1.0, 0.3, 0.06) * 0.12 * halo * land * clamp(0.25 + 2.6 * dot(slope, fromLava / (length(fromLava) + 1.0)), 0.0, 1.8);

  // ---- the water ----
  // What comes back from under the surface: the map's own shallows, bars and silt over the deep, lit by the sun and the sky.
  vec3 light = uSunColour * uSunDir.y * shade + skyIrradiance(level);
  float pale = pow(shallow, 1.3);
  vec3 bed = mix(DEEP, max(ground * 0.34, vec3(0.006, 0.035, 0.04)), pale);
  // The lake of the Eye: black in the middle, and round it a margin of amber shallows, uneven, with tongues of it curling in.
  vec2 lakeAt = (xz - uLakeMid) / uLakeSize;
  float lakeR = length(lakeAt);
  if (lakeR < 1.3) {
    vec2 w = lakeAt + 0.2 * vec2(vnoise(lakeAt * 2.7 + 3.0), vnoise(lakeAt * 2.7 + 17.0));
    float swirl = vnoise(w * 5.0 + 2.4 * vnoise(w * 2.1 + 3.0 + uTime * 0.02));
    float amber = max(smoothstep(0.7 + 0.24 * swirl, 0.99, lakeR), smoothstep(0.08, 0.55, shallow));
    float paler = smoothstep(0.25, 0.9, shallow + 0.5 * (swirl - 0.4));
    vec3 eye = mix(vec3(0.003, 0.006, 0.014), mix(vec3(0.055, 0.026, 0.004), vec3(0.24, 0.13, 0.022), paler), amber);
    bed = mix(bed, eye, 1.0 - smoothstep(1.12, 1.3, lakeR));
  }
  vec3 water = bed * light / 3.14159;
  // The sky on the surface, and the sun on its waves: the glint lies where the surface of the planet leans half way to the sun.
  // The sea is ruffled in lanes and calm in slicks, so the glare is torn and the dark sea has grain.
  vec2 wind = xz + 60.0 * vec2(vnoise(xz / 310.0), vnoise(xz / 310.0 + 9.7));
  float calm = texture2D(uCloudTile, wind / 900.0 + vec2(0.5, 0.2)).b;
  float ruffle = texture2D(uCloudTile, wind / 140.0).b;
  float rough = mix(0.075, 0.125, clamp(0.3 + 0.6 * (calm - 0.5) + 0.4 * (ruffle - 0.5), 0.0, 1.0));
  float lean = length(xz - uGlint) / uPlanetKm;
  float t2 = lean * lean / (rough * rough);
  float lobe = exp(-t2) / (3.14159 * rough * rough);
  float fresnel = 0.02 + 0.98 * pow(1.0 - mu * 0.9, 5.0);
  water += uSkyColour * 0.2 * fresnel * (0.7 + 0.6 * ruffle);
  water += uSunColour * vec3(0.92, 0.95, 1.0) * lobe * 0.004 * shade;
  water += uSunColour * vec3(0.9, 0.94, 1.0) * 0.006 * exp(-lean * lean / 0.0062) * (0.5 + 0.5 * shade) * (0.3 + 1.0 * calm + 0.6 * (ruffle - 0.5));

  vec3 colour = mix(water, earth, land);

  // ---- the air between the surface and the eye: more of it toward the edge of the planet, less over the high ground ----
  float path = 1.0 / max(mu, 0.12);
  float far = smoothstep(120.0, 900.0, uViewKm);
  float air = 1.0 - exp(-mix(0.075, 0.03, far) * path * (1.0 - 0.5 * height * land));
  colour = mix(colour, uAirColour * (0.4 + 0.6 * shade), air);
  colour += glow * (1.0 - 0.5 * air);

  // ---- the handoff: on its first frame the rise draws what the Eye last drew, deep water and rings ----
  vec2 fromLake = xz - uLake;
  float r = length(fromLake);
  float k = clamp(floor(log(max(r, 1e-4) / uRingShape.x) / log(1.5) + 0.5), 0.0, 8.0);
  float ringAt = uRingShape.x * pow(1.5, k);
  // On the first frame (uBreak 0) the rings are the rest picture agreed with the Eye: soft bands, each stronger on one side.
  // Once the rise begins they are water and no drawn thing: each one bent out of round, broken into arcs of uneven strength,
  // wider and weaker the further out, and the whole of it soon gone.
  vec2 round = fromLake / max(r, 1e-4);
  float theta = atan(fromLake.x, -fromLake.y);
  float bentBy = vnoise(round * 2.3 + k * 3.7) + 0.5 * vnoise(round * 6.1 + k * 9.1) - 0.75;
  float rr = r * (1.0 + uBreak * 0.11 * bentBy);
  float across = (rr - ringAt) / (0.5 * uRingShape.y * ringAt * (1.0 + 0.7 * uBreak));
  float ring = exp(-across * across) * (0.35 + 0.3 * (0.5 + 0.5 * sin(2.0 * theta + 2.4 * k)));
  float arcs = smoothstep(0.38, 0.7, vnoise(round * 3.4 + k * 5.3 + 2.0) + 0.35 * (vnoise(xz * 0.9 / max(ringAt, 1e-3) * 9.0) - 0.5));
  ring *= mix(1.0, arcs * exp(-0.3 * k), uBreak);
  vec3 hand = mix(uHandWater, uHandRing, ring * uHand.y);
  colour = mix(colour, hand, max(uHand.x, ring * uHand.y * (1.0 - land)));

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
    uMapA: { value: maps[0] },
    uReliefA: { value: reliefs[0] },
    uRectA: { value: rects[0] },
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
    uSalt: { value: new THREE.Vector2(X(AT.salt.x), Z(AT.salt.y) + 10 * KM) },
    // Where on the sea the sun's own image lies, and the radius of the planet, km.
    uGlint: { value: new THREE.Vector2(X(6300), Z(600)) },
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
      const width = rise.at(RISE_FIRST + seconds * FPS).w;
      const pair = pairFor(width);
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
