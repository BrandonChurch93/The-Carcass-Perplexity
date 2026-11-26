import { FLOOR } from '../ridge';
// The one light model of the Spine. Every built surface includes RIG_GLSL in its fragment shader and reads its light from these functions,
// so that the rock, the snow, the animals and the kites sit in the same light. Radiance is scene linear; the grade and the exposure come after, in the post.
// The light: dusk above the cloud. No sun. Cold blue-grey from above, a last band of orange low on the open side (uWarmDir), the storm standing dark
// on the other side (uStormDir), and the lightning: the round lights of the rig (uEmitters), which the strikes push and time, and uFlash, the storm
// cloud lit from inside by them.

export const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float vnoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), u.x), mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), u.x), u.y);
  float b = mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), u.x), mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), u.x), u.y);
  return mix(a, b, u.z);
}
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec2(17.3, 9.1);
    a *= 0.5;
  }
  return s;
}`;


export const RIG_UNIFORMS_GLSL = /* glsl */ `
uniform float uTime;
uniform float uSolo;
uniform sampler2D tLand;
uniform vec4 uLandRect;
uniform sampler2D tLandFine;
uniform vec4 uLandFineRect;
uniform sampler2D tContact;
uniform vec4 uContactRect;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGround;
uniform vec3 uSkyStorm;
uniform vec3 uStormDir;
uniform vec3 uWarmDir;
uniform vec3 uWarmColour;
uniform vec3 uFill;
uniform float uUnder;
uniform vec3 uFlash;
uniform vec4 uWind;
uniform int uEmitterCount;
uniform vec4 uEmitters[8];
uniform vec3 uEmitterRadiance[8];`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}
const float CANAL_FLOOR = ${FLOOR.toFixed(3)};
// The share of a round light's radiance that the place takes as light cast: the lens is set for the dusk, and a bolt at full radiance would white the
// ridge out for kilometres. With it a strike's channel (radiance 520, radius 70) lights the snow 800 m off about as much again as the sky does.
const float EMITTER_CAST = 0.07;
// What a strike casts closes on this, about as much again as the dusk gives level snow: the approved frames with a bolt in them keep the dusk's shade.
const float EMITTER_CEILING = 0.12;
// The storm lit from inside, as the land and the sky take it: it closes on a ceiling too.
vec3 flashCast() {
  return uFlash / (1.0 + dot(uFlash, vec3(0.33)) / 0.05);
}
// The key of the place: the last light comes over the cloud sea from the lee and a little from behind the lens of the wide shot, low. It
// warms the rock that looks to the lee and leaves what looks to the storm in the storm's dark. The band the dome draws is where uWarmDir says.
const vec3 KEY_DIR = normalize(vec3(-0.6, 0.18, 0.78));

// How far a direction looks into the storm: 1 level into it, 0 away from it and overhead.
float stormSide(vec3 d) {
  float level = dot(d.xz, uStormDir.xz) * inversesqrt(max(dot(d.xz, d.xz), 1e-6));
  return smoothstep(-0.25, 0.6, level) * smoothstep(0.95, 0.3, d.y);
}

// Radiance of the dusk sky toward d, for lighting and for mirrors. Below the horizon it is the cloud sea. The dome draws the same and adds its cloud.
vec3 skyRadiance(vec3 d) {
  float up = clamp(d.y, -1.0, 1.0);
  vec3 c = mix(uSkyHorizon, uSkyZenith, pow(clamp(up, 0.0, 1.0), 0.45));
  float storm = stormSide(d);
  c = mix(c, uSkyStorm * 0.33, 0.9 * storm) + flashCast() * storm;
  c = mix(c, uSkyGround, smoothstep(0.0, -0.25, up));
  float w = max(dot(d.xz, uWarmDir.xz) * inversesqrt(max(dot(d.xz, d.xz), 1e-6)), 0.0);
  float band = (exp(-up * up / 0.00011) + 0.04 * exp(-up * up / 0.002)) * smoothstep(-0.02, 0.0, up);
  // The band is the one saturated thing in the sky: it stands in place of the grey at the horizon, not on top of it.
  return mix(c, uWarmColour * vec3(0.42, 0.32, 0.19), clamp(band * w * w, 0.0, 1.0));
}

// Irradiance from the whole sky on a face with normal n, before anything hides the sky.
// A level face takes the zenith and the horizon; an upright face half the sky and the cloud sea below; an underside the cloud sea alone.
// A face turned to the storm takes the storm's dark in place of the open sky (and the storm's flash when a strike lights it from inside);
// a face turned to the last light takes the orange band, which is thin and low: it warms upright rock and leaves level snow cold.
vec3 skyIrradiance(vec3 n) {
  float lean = 1.0 + min(n.y, 0.0);
  float seen = lean * lean * lean;
  float up = n.y >= 0.0 ? 0.5 + 0.5 * n.y : 0.5 * seen;
  vec3 open = mix(uSkyHorizon, uSkyZenith, 0.55 * max(n.y, 0.0));
  float s = clamp(0.5 + 0.5 * dot(n, uStormDir), 0.0, 1.0);
  float stormShare = s * s * (1.0 - 0.45 * max(n.y, 0.0));
  // The flash counts for more on what it lights than in the sky itself: the cloud is a wall of it for the land, and a glow for the lens.
  // Under the rock (the lens exposed for the dark there) the flash does not come by the sky's share: it comes in by the mouths alone,
  // and the canal's own shader gives it from them.
  open = mix(open, uSkyStorm, 0.8 * stormShare) + flashCast() * (2.6 * stormShare * (uUnder > 1.5 ? 0.12 : 1.0));
  vec3 e = mix(uSkyGround, open, up) * uFill;
  float w = clamp((dot(n, KEY_DIR) + 0.12) / 1.12, 0.0, 1.0);
  // One low source: what looks to it is lit warm, by the square, and what looks away keeps the cold of the sky alone.
  return 3.14159 * (e * (0.72 + 0.28 * (1.0 - w)) + uWarmColour * (0.26 * w * w * seen));
}

// The land under a point: r height in metres, g how much of the sky the ground there sees (0 to 1), a the roof of the canal under it
// (metres over the canal floor, 0 where the ground is solid), b the share of light that reaches into the canal there. Outside the maps the land is far below and open.
vec4 landAt(vec2 xz) {
  vec2 c = (xz - uLandRect.xy) * uLandRect.zw;
  vec2 ce = min(c, 1.0 - c);
  vec4 coarse = mix(vec4(-3000.0, 1.0, 0.0, 0.0), textureLod(tLand, c, 0.0), smoothstep(0.0, 0.02, min(ce.x, ce.y)));
  vec2 f = (xz - uLandFineRect.xy) * uLandFineRect.zw;
  vec2 e = min(f, 1.0 - f);
  float k = smoothstep(0.0, 0.06, min(e.x, e.y));
  if (k <= 0.0) return coarse;
  return mix(coarse, textureLod(tLandFine, f, 0.0), k);
}

// What stands on the ground, as drawn in the contact map.
float contactDrawn(vec3 p) {
  vec2 uv = (p.xz - uContactRect.xy) * uContactRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  return textureLod(tContact, uv, 0.0).r * smoothstep(0.0, 0.03, min(e.x, e.y));
}

// 0 open, 1 covered: how much of the sky is hidden at the ground by something standing over it. Drawn by whoever stands there.
float contactAt(vec3 p) {
  return contactDrawn(p);
}

// Irradiance from the round lights: the lightning. Each is a ball of real size (a bolt a kilometre long is a row of them, or one tall one) and falls
// off with the square of the distance, as light does, and with nothing else: the air above the cloud is clear and a strike lights the ridge for
// kilometres. A light wraps a quarter round a face, so that a spire lit from behind keeps a rim. No read of any map.
vec3 emitterIrradiance(vec3 p, vec3 n) {
  vec3 e = vec3(0.0);
  float lift = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 d = uEmitters[i].xyz - p;
    float r = uEmitters[i].w;
    float d2 = dot(d, d) + r * r;
    float c = clamp((dot(n, d) * inversesqrt(d2) + 0.25) / 1.25, 0.0, 1.0);
    e += uEmitterRadiance[i] * (3.14159 * r * r / d2 * c);
    // A small light close by (the one at a struck tip) lifts the ceiling for the rock right under it.
    lift += r < 20.0 ? r * r / d2 : 0.0;
  }
  // A strike lights the rock; it does not bleach it. However strong a light is made, what it casts closes on a ceiling.
  e *= EMITTER_CAST;
  return e / (1.0 + dot(e, vec3(0.3, 0.5, 0.2)) / (EMITTER_CEILING * (1.0 + 12.0 * lift)));
}

// For the owners: how much of the sky a face keeps when the land in front of it stands higher than it does. 1 in the open, toward 0 in a crack,
// under a step, at the foot of a wall. Multiply the occlusion you give the rig by it. It costs two reads of landAt.
float landHollow(vec3 p, vec3 n, float reach) {
  float side = length(n.xz);
  if (side < 0.05) return 1.0;
  vec2 dir = n.xz / side;
  float rise = max(landAt(p.xz + dir * reach).r - p.y, (landAt(p.xz + dir * reach * 3.0).r - p.y) / 3.0) / reach;
  rise = max(rise, 0.0);
  return 1.0 - (0.35 + 0.65 * side) * rise * inversesqrt(1.0 + rise * rise);
}

// How much of the sky a point sees: the land's own horizon, opening with height above the ground, and whatever stands over it.
float skyOpen(vec3 p) {
  vec4 land = landAt(p.xz);
  float above = p.y - land.r;
  float vis = mix(land.g, 1.0, clamp(above / 80.0, 0.0, 1.0));
  // Inside the canal the sky is the two mouths.
  float roof = CANAL_FLOOR + land.a;
  float under = smoothstep(0.3, 1.0, land.a) * smoothstep(roof + 1.5, roof + 0.5, p.y);
  vis = mix(vis, min(land.b * uUnder, 1.0), under);
  return vis * (1.0 - contactDrawn(p) * smoothstep(4.0, 0.0, above));
}

// The shading every opaque surface uses. v points from the surface to the camera. occ is the surface's own small-scale occlusion, 1 for none.
vec3 rigShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  float sky = skyOpen(p);
  float open = sky * occ;
  // The lightning reaches a hollow as the sky does: under a roof it comes in by the mouths and no other way.
  vec3 skyE = skyIrradiance(n);
  vec3 e = skyE * open + emitterIrradiance(p, n) * (occ * min(1.0, 4.0 * sky));
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), skyE / 3.14159, rough * rough);
  return c + f * env * open;
}

// The last line of every built surface: gl_FragColor = vec4(rigOut(colour), 1.0). It blacks the surface when an effect is drawn alone.
vec3 rigOut(vec3 c) {
  return c * (1.0 - uSolo);
}`;

// A plain vertex shader for a built mesh: world position and normal, with instancing.
export const RIG_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 p = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
  p = instanceMatrix * p;
  n = mat3(instanceMatrix) * n;
  #endif
  vec4 w = modelMatrix * p;
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
