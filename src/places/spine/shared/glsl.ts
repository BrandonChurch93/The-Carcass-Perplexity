import { FLOOR } from '../ridge';
import { MOUTH, canalFar } from './anchors';
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
uniform vec3 uEmitterRadiance[8];
uniform vec4 uStrikeAt;
uniform vec4 uStrikeTip;
uniform vec4 uStrikeTop;`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}
const float CANAL_FLOOR = ${FLOOR.toFixed(3)};
// The two mouths of the canal: inside it they are the light.
const vec3 CANAL_NEAR = vec3(${MOUTH[0].toFixed(1)}, ${MOUTH[1].toFixed(1)}, ${MOUTH[2].toFixed(1)});
const vec3 CANAL_FAR = vec3(${canalFar[0].toFixed(1)}, ${canalFar[1].toFixed(1)}, ${canalFar[2].toFixed(1)});
// The share of a round light's radiance that the place takes as light cast: the lens is set for the dusk, and a bolt at full radiance would white the
// ridge out for kilometres. With it a strike's channel (radiance 520, radius 70) lights the snow 800 m off about as much again as the sky does.
const float EMITTER_CAST = 0.07;
// How far in the mouth's light holds, in metres squared: at 10 m in it is half, at 30 m a tenth.
const float CANAL_REACH = 100.0;
const float CANAL_SKY = 1.8;
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
  // In the shot inside the canal the sky's values are set low, for the rock by the mouths. What stands in the open air of the canal (the
  // runners, the snow blown in) takes the mouths' light more nearly whole.
  if (uUnder > 1.5) e *= CANAL_SKY;
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

// The flash of a stroke on a face: one light from the channel, by direction, with the land's own shadow. It is what a camera sees of a
// strike: for a frame the faces that see the channel are lit blue-white and the rest keep the dusk. Nothing when no stroke burns.
const vec3 STRIKE_COLOUR = vec3(0.74, 0.8, 1.0);
// What a cloud lit from inside throws on the land, and how much of its glow comes down as light.
const vec3 INNER_COLOUR = vec3(0.62, 0.5, 1.0);
const float INNER_CAST = 0.3;
// The light falls off with the square of the distance past this many metres: the channel is a kilometre tall and lights the ridge as a line does.
const float STRIKE_REACH = 1500.0;
const float STRIKE_WRAP = 0.45;
vec3 strikeIrradiance(vec3 p, vec3 n) {
  if (uStrikeAt.w <= 0.0) return vec3(0.0);
  // The foot of the channel on what is close under it: the rock and the rime of the struck spire's top take a hard light from just over
  // the tip, gone within a hundred metres or so, so that the edges that look up at it stand out and its flanks stay dark.
  vec3 low = uStrikeTip.xyz + vec3(0.0, 14.0, 0.0) - p;
  float lowDist2 = dot(low, low);
  vec3 near = vec3(0.0);
  if (lowDist2 < 250000.0) near = STRIKE_COLOUR * (uStrikeAt.w * 2.5 * clamp(dot(n, low) * inversesqrt(lowDist2), 0.0, 1.0) / (1.0 + lowDist2 / 1600.0)) * (1.0 - lowDist2 / 250000.0);
  vec3 d = uStrikeAt.xyz - p;
  float dist = length(d);
  vec3 l = d / dist;
  // Wrapped: a stroke lights the air and the cloud about it, and they light what is turned a little from the channel; what is turned
  // well away stays in the dusk.
  // The spire that is struck stands under the channel itself: it is lit from over its tip and little comes round to its flanks, which
  // keep the storm's shadow.
  float under = smoothstep(120.0, 500.0, length(p.xz - uStrikeTip.xz));
  float wrap = STRIKE_WRAP * mix(0.2, 1.0, under);
  float facing = clamp((dot(n, l) + wrap) / (1.0 + wrap), 0.0, 1.0);
  // And a fill with no direction: the cloud over the channel is lit through and throws a little of the flash on every face under it,
  // most on what looks up, so what is turned from the bolt flares too and is not left out of the stroke.
  near += STRIKE_COLOUR * (uStrikeAt.w * 0.02 * mix(0.3, 1.0, under) * (0.45 + 0.55 * n.y) / (1.0 + dist * dist / (STRIKE_REACH * STRIKE_REACH)));
  if (facing <= 0.0) return near;
  // Faces square to the channel take the most by far: the light models the rock, it does not coat it.
  facing *= facing;
  // The land between the face and the channel: the ray is walked toward the light and is shaded wherever the ground stands over it.
  float lit = 1.0;
  float reach = min(dist * 0.9, 1400.0);
  for (int i = 0; i < 5; i++) {
    float f = (float(i) + 1.0) / 5.0;
    float t = reach * f * f * f;
    vec3 q = p + l * t;
    lit = min(lit, smoothstep(-0.6 - 0.015 * t, 0.3 + 0.004 * t, q.y - landAt(q.xz).r + 0.5 + 0.008 * t));
    if (lit <= 0.0) return near;
  }
  // (The struck spire takes the stroke at its tip, from the foot of the channel; of the channel's length over it, it sees little.)
  return near + STRIKE_COLOUR * (uStrikeAt.w * mix(0.16, 1.0, under) * facing * lit / (1.0 + dist * dist / (STRIKE_REACH * STRIKE_REACH)));
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
  e = e / (1.0 + dot(e, vec3(0.3, 0.5, 0.2)) / (EMITTER_CEILING * (1.0 + 12.0 * lift)));
  // The stroke's own flash is not held under the ceiling: it has direction and shadow, and what it does not reach stays dark.
  // The software renderer works through both sides of a branch for every pixel, so the stroke's light is compiled into a shader only
  // while a strike burns (the strikes set STRIKE_BURNS on every material that reads the rig): a frame with no strike pays nothing.
#ifdef STRIKE_BURNS
  if (uStrikeAt.w > 0.0) e += strikeIrradiance(p, n);
  // A cloud lit from inside, while no stroke burns: a low violet light with no shadow on what looks at it, wrapped as the round lights are.
  else if (uStrikeTop.w > 0.0) {
    vec3 to = normalize(0.5 * (uStrikeTip.xyz + uStrikeTop.xyz) - p);
    e += INNER_COLOUR * (uStrikeTop.w * INNER_CAST * clamp((dot(n, to) + 0.25) / 1.25, 0.0, 1.0));
  }
#endif
  return e;
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

// How far the point last asked about stands under the canal's roof: 0 in the open, 1 inside. Set by skyOpenOver.
float rigUnderRoof = 0.0;
// How much of the sky a point sees: the land's own horizon, opening with height above the ground, and whatever stands over it.
float skyOpenOver(vec3 p, out float above) {
  vec4 land = landAt(p.xz);
  above = p.y - land.r;
  float vis = mix(land.g, 1.0, clamp(above / 80.0, 0.0, 1.0));
  // Inside the canal the sky is the two mouths.
  float roof = CANAL_FLOOR + land.a;
  float under = smoothstep(0.3, 1.0, land.a) * smoothstep(roof + 1.5, roof + 0.5, p.y);
  vis = mix(vis, min(land.b * uUnder, 1.0), under);
  rigUnderRoof = under;
  return vis * (1.0 - contactDrawn(p) * smoothstep(4.0, 0.0, above));
}
float skyOpen(vec3 p) {
  float above = 0.0;
  return skyOpenOver(p, above);
}

// The shading every opaque surface uses. v points from the surface to the camera. occ is the surface's own small-scale occlusion, 1 for none.
vec3 rigShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  float above = 0.0;
  float sky = skyOpenOver(p, above);
  float open = sky * occ;
  // A crease is darker than the sky it has lost: what light does reach into it has come off dark rock on the way.
  float shut = open * (0.4 + 0.6 * open);
  // The lightning reaches a hollow as the sky does: under a roof it comes in by the mouths and no other way.
  vec3 skyE = skyIrradiance(n);
  bool outside = uUnder < 1.5;
  // Outside, what looks down from high on a spire sees the dark of the sea of cloud and little else; what leans over the snow near the
  // ground takes the sky's light thrown back up by it, cold.
  float down = clamp(-n.y, 0.0, 1.0);
  float lean = clamp(0.4 - 0.6 * n.y, 0.0, 1.0);
  float near = 1.0 - smoothstep(1.0, 22.0, above);
  if (outside) skyE = skyE * (1.0 - 0.45 * down * (1.0 - near)) + skyIrradiance(vec3(0.0, 1.0, 0.0)) * vec3(0.8, 0.86, 1.0) * (0.3 * lean * near);
  // The last light itself, low out of the dusk: it rims what looks to it, warm, and reaches no face that looks elsewhere.
  vec3 toDusk = normalize(vec3(uWarmDir.x, 0.07, uWarmDir.z));
  float rim = clamp((dot(n, toDusk) - 0.1) / 0.9, 0.0, 1.0);
  // It shows on what is pale: snow, rime, weathered rock. A small dark thing (a husk on a line) takes almost none, or it reads as rust.
  float paleOf = smoothstep(0.1, 0.4, dot(albedo, vec3(0.3, 0.5, 0.2)));
  // Inside the canal the mouths are the light: what faces the nearer mouth takes it, what is turned from it stands in the dark of the
  // rock and is seen against the mouth, not lit like the open ridge.
  if (!outside) {
    // (What the sky gives this face, before the canal's own fall is laid on it: the rim is read from it, not from a second read of the sky.)
    vec3 open0 = skyE;
    vec3 toFar = CANAL_FAR - p;
    vec3 toNear = CANAL_NEAR - p;
    vec3 toLight = normalize(normalize(toFar) / (dot(toFar, toFar) + 400.0) + 0.35 * normalize(toNear) / (dot(toNear, toNear) + 400.0));
    float faces = smoothstep(0.0, 0.9, dot(n, toLight) + 0.45 * max(n.y, 0.0));
    // The dark falls away from the mouth: the light is what the mouth lets in, and it thins with the square of the way in. Deep in, the
    // little that is left has come off the stone and is the stone's own warm; at the mouth it is the storm's violet.
    float reach = min(1.0 / (1.0 + dot(toFar, toFar) / CANAL_REACH) + 0.3 / (1.0 + dot(toNear, toNear) / CANAL_REACH), 1.0);
    // (Only under the roof. The ridge beyond the mouth stands in the open and keeps the level it had: the lens is set for the mouth.)
    // What is pale (rime on a coat, drifted snow) holds the mouth's light far better than the rock does: it is the brightest thing in
    // the canal, as in the approved picture, and falls off by the root of what the rock keeps. Dimmed as the rock, the coats went grey.
    float paleIn = smoothstep(0.5, 0.75, dot(albedo, vec3(0.3, 0.5, 0.2)));
    skyE *= mix(vec3(0.36, 0.25, 0.17), vec3(1.3, 1.16, 1.62), faces * faces * mix(0.35, 1.0, reach)) * mix(2.5, mix(0.2 + 1.25 * reach, 0.5 + 1.6 * sqrt(reach), paleIn), rigUnderRoof) / CANAL_SKY;
    // Deep in, the stone lights the stone: a low warm with no direction, most where the mouth's light is least.
    skyE += vec3(0.34, 0.2, 0.105) * ((1.0 - reach) * (1.0 - reach) * rigUnderRoof);
    // What stands edge on to the lens between it and the mouth is rimmed by the mouth: a line of violet on a back, a lip of rock.
    float edge = 1.0 - clamp(dot(n, v), 0.0, 1.0);
    skyE += open0 * vec3(0.95, 0.8, 1.5) / CANAL_SKY * (edge * edge * edge * smoothstep(-0.25, 0.45, dot(n, toLight)) * (0.25 + 1.2 * reach));
  }
  vec3 warm = uWarmColour * (outside ? 0.4 * rim * rim * sqrt(sky) * mix(0.15, 1.0, paleOf) : 0.0);
  vec3 e = skyE * shut + warm * (0.35 + 0.65 * occ) + emitterIrradiance(p, n) * (occ * min(1.0, 4.0 * sky));
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  // Only what is smooth shines: ice and wet. Snow and weathered rock scatter the sky and show no sheen at any angle.
  float smoothness = 1.0 - rough;
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * min(1.5 * smoothness * smoothness, 1.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), skyE / 3.14159, rough * rough);
  return c + f * env * shut;
}

// The last line of every built surface: gl_FragColor = vec4(rigOut(colour), 1.0). It blacks the surface when an effect is drawn alone.
vec3 rigOut(vec3 c) {
  // (And no surface hands the frame what is not a colour: one such fragment is a hole in every pass after it.)
  if (any(isnan(c)) || any(isinf(c))) return vec3(0.0);
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
