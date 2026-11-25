// The surface of the planet: the sea, the continent that is the body, the salt pan of the hips, the lake of the Eye and the lava of the Heart.
// One sheet at sea level draws all five, from the nested pictures of land/levels.ts (the ground's own colour, and its slope and height).
// The light is the rig's: one sun, the blue of the air, the shade of the cloud (shared/weather.ts) and the edge of the planet.
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
uniform sampler2D uGroundWide;
uniform sampler2D uShapeWide;
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
varying vec3 vWorld;

const vec3 DEEP = vec3(0.006, 0.017, 0.04);

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
  vec2 uvWide = (xz - uRectWide.xy) * uRectWide.zw;
  vec2 uvClose = (xz - uRectClose.xy) * uRectClose.zw;
  float inWide = inside(uvWide);
  float inClose = inside(uvClose) * uClose;
  vec3 ground = mix(DEEP, texture2D(uGroundWide, clamp(uvWide, 0.0, 1.0)).rgb, inWide);
  vec3 shape = mix(vec3(0.5, 0.5, 0.0), texture2D(uShapeWide, clamp(uvWide, 0.0, 1.0)).rgb, inWide);
  if (inClose > 0.0) {
    ground = mix(ground, texture2D(uGroundClose, clamp(uvClose, 0.0, 1.0)).rgb, inClose);
    shape = mix(shape, texture2D(uShapeClose, clamp(uvClose, 0.0, 1.0)).rgb, inClose);
  }
  float land = smoothstep(0.485, 0.515, shape.b);
  float height = clamp((shape.b - 0.56) / 0.44, 0.0, 1.0);
  float depth = clamp(1.0 - shape.b / 0.44, 0.0, 1.0);
  vec2 slope = shape.rg * 2.0 - 1.0;
  vec3 n = normalize(vec3(slope.x, sqrt(max(1.0 - dot(slope, slope), 0.04)), slope.y));

  float shade = cloudShade(xz);
  float mu = limbCos(xz);

  // ---- the land ----
  vec3 earth = rigShade(vWorld, n, view, ground, 0.92, shade);

  // The lava of the Heart: the chest is a black crust, and the heat shows along its cracks. It swells with the beat.
  vec2 fromLava = (xz - uLava) / 86.0;
  float field = exp(-dot(fromLava * vec2(0.8, 1.25), fromLava * vec2(0.8, 1.25)));
  float vein = cracks(xz / 9.0) * smoothstep(0.25, 0.7, field + 0.25 * (vnoise(xz / 30.0) - 0.5));
  float core = exp(-dot(fromLava, fromLava) * 36.0);
  float heat = (vein * (0.5 + 0.5 * field) + core) * (0.75 + 0.9 * uBeat) * land * (1.0 - smoothstep(0.12, 0.3, height));
  vec3 glow = blackbody(1050.0 + 520.0 * clamp(heat, 0.0, 1.3)) * 0.085 * smoothstep(0.05, 0.5, heat);
  glow += vec3(1.0, 0.24, 0.05) * 0.05 * field * uBeat * land;

  // ---- the water ----
  // What comes back from under the surface, lit by the sun and the sky.
  vec3 light = uSunColour * uSunDir.y * shade + skyIrradiance(vec3(0.0, 1.0, 0.0));
  vec3 water = ground * light / 3.14159;
  // The sky on the surface, and the sun on its waves: the glint lies where the surface of the planet leans half way to the sun.
  vec2 wind = xz + 60.0 * vec2(vnoise(xz / 310.0), vnoise(xz / 310.0 + 9.7));
  float calm = texture2D(uCloudTile, wind / 900.0 + vec2(0.5, 0.2)).b;
  float ruffle = texture2D(uCloudTile, wind / 140.0).b;
  float rough = mix(0.13, 0.27, clamp(0.25 + 0.6 * calm + 0.35 * (ruffle - 0.5) + 0.25 * depth, 0.0, 1.0));
  float lean = length(xz - uGlint) / uPlanetKm;
  float t2 = lean * lean / (rough * rough);
  float lobe = exp(-t2) / (3.14159 * rough * rough);
  float fresnel = 0.02 + 0.98 * pow(1.0 - mu * 0.9, 5.0);
  water += uSkyColour * 0.32 * fresnel;
  water += uSunColour * lobe * 0.012 * shade * (0.6 + 0.4 * depth);
  // Surf: a broken white line where the swell meets the coast.
  float surf = smoothstep(0.405, 0.47, shape.b) * (1.0 - land) * smoothstep(0.35, 0.75, ruffle + 0.4 * vnoise(xz * 1.7));
  water = mix(water, vec3(0.62) * light / 3.14159, 0.55 * surf);

  vec3 colour = mix(water, earth, land);

  // ---- the air between the surface and the eye: more of it toward the edge of the planet ----
  float path = 1.0 / max(mu, 0.12);
  float air = 1.0 - exp(-0.075 * path * (1.0 - 0.45 * height * land));
  colour = mix(colour, uAirColour * (0.55 + 0.45 * shade) * 1.25, air);
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
    uGlint: { value: new THREE.Vector2(X(6350), Z(1150)) },
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
