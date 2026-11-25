// The one light model of the Heart. Every built surface includes RIG_GLSL in its fragment shader and reads its light from these functions,
// so that the lake, the land and the animals sit in the same light. Radiance is scene linear; the grade and the exposure come after, in the post.

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
uniform float uPulse;
uniform float uSolo;
uniform sampler2D tGlow;
uniform vec4 uGlowRect;
uniform float uGlowTexels;
uniform sampler2D tLand;
uniform vec4 uLandRect;
uniform sampler2D tLandFine;
uniform vec4 uLandFineRect;
uniform sampler2D tContact;
uniform vec4 uContactRect;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGround;
uniform vec3 uWarmDir;
uniform vec3 uWarmColour;
uniform float uCast;
uniform vec3 uFill;
uniform int uEmitterCount;
uniform vec4 uEmitters[8];
uniform vec3 uEmitterRadiance[8];
uniform vec2 uFlowFoot;
uniform float uFlowT0;`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}

// The only colour of anything that glows by its own heat. 1500 K reads 60 in red; the sky is about 0.05.
// Red is Planck at 610 nm. Green over red is the black body in the display's own primaries (0.036 at 1000 K, 0.085 at 1200 K, 0.15 at 1500 K), far
// redder than the ratio of two single wavelengths. The last term is the camera's clip: the knee of the look keeps the hue of what it compresses, so the
// hottest cores would stay orange for ever; from about 1450 K the colour itself walks to yellow-white, as a sensor does. Nothing below 1400 K sees it.
// On the display, with the look of the place: 1100 K dark red, 1200 K red, 1350 K deep orange, 1450 K yellow-orange, 1500 K and above yellow-white.
vec3 blackbody(float kelvin) {
  float r = 60.0 * exp(-23587.0 * (1.0 / kelvin - 1.0 / 1500.0));
  float clip = 1.0 / (1.0 + exp((1540.0 - kelvin) / 32.0));
  return r * vec3(1.0, 2.87 * exp(-4386.0 / kelvin) + 0.6 * clip, 0.003 + 0.12 * clip);
}

// Radiance of the dusk sky toward d, for lighting. The warm side is the fume lit by the lake.
vec3 skyRadiance(vec3 d) {
  float up = clamp(d.y, -1.0, 1.0);
  vec3 c = mix(uSkyHorizon, uSkyZenith, pow(clamp(up, 0.0, 1.0), 0.45));
  c = mix(c, uSkyGround, smoothstep(0.0, -0.25, up));
  float w = max(dot(normalize(vec3(d.x, max(d.y, 0.0), d.z)), uWarmDir), 0.0);
  return c + uWarmColour * w * w * w * smoothstep(-0.1, 0.05, up);
}

// Irradiance from the whole sky on a face with normal n, before anything hides the sky.
// uFill is the root's: the share of the open sky's light, band by band, that reaches the floor of the caldera through its fume.
// A face that looks up takes the zenith and the horizon as before, and exactly as much as before: every owner's albedo is set against it.
// An upright face sees half the sky, the horizon's half, and the dark ground: it takes 0.69 of what a level face takes (it took 0.92, and a block
// lit as brightly on its sides as on its top is a grey box). A face at 60 degrees takes 0.89.
// A face that leans DOWN loses the sky with the cube of its lean, not in proportion: in a caldera the low band of the sky is the far wall, which is
// dark rock, so a face 30 degrees past upright sees a sixth of the sky and an underside none. What is left to it is uSkyGround, the dusk thrown
// back by dark ground. This is where the darks of the place come from: undersides, overhangs, the lee of every stone.
vec3 skyIrradiance(vec3 n) {
  float lean = 1.0 + min(n.y, 0.0);
  float seen = lean * lean * lean;
  float up = n.y >= 0.0 ? 0.5 + 0.5 * n.y : 0.5 * seen;
  vec3 e = mix(uSkyGround, mix(uSkyHorizon, uSkyZenith, 0.55 * max(n.y, 0.0)), up) * uFill;
  // The gain is the light's, not uFill's, because the air reads uFill for its haze: it sets rock under the thinned air to the tone of the pictures.
  e *= 1.9 + 0.1 * max(n.y, 0.0);
  float w = 0.5 + 0.5 * dot(n, uWarmDir);
  return 3.14159 * (e + uWarmColour * 0.35 * w * w * seen);
}

// The land under a point: r height in metres, g how much of the sky the ground there sees (0 to 1),
// b distance to the edge of the lake in metres (positive on land, negative on the lake).
vec4 landAt(vec2 xz) {
  vec4 coarse = texture2D(tLand, (xz - uLandRect.xy) * uLandRect.zw);
  vec2 f = (xz - uLandFineRect.xy) * uLandFineRect.zw;
  vec2 e = min(f, 1.0 - f);
  float k = smoothstep(0.0, 0.06, min(e.x, e.y));
  if (k <= 0.0) return coarse;
  return mix(coarse, texture2D(tLandFine, f), k);
}

// 0 open, 1 covered: how much of the sky is hidden at the ground by something standing over it. Drawn by whoever stands there.
float contactAt(vec3 p) {
  vec2 uv = (p.xz - uContactRect.xy) * uContactRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  return texture2D(tContact, uv).r * smoothstep(0.0, 0.03, min(e.x, e.y));
}

// Mean radiance leaving the lake inside a disc of that radius, metres.
// uCast is the root's: how much of the lava's light is cast on the place. The lava as seen is tamed by the knee of the place's look, so its cast light is tamed here.
vec3 lakeGlow(vec2 xz, float radius) {
  return textureLod(tGlow, (xz - uGlowRect.xy) * uGlowRect.zw, log2(max(radius * 2.0 * uGlowTexels, 1.0))).rgb * uCast;
}

// How much of the lake's light still arrives at a height above it: the fume between takes it, and it is gone a few tens of metres up.
float lakeReach(float h) {
  return 1.0 / (1.0 + h * h / 2025.0);
}

// Irradiance from the glowing lake on a point p with normal n.
// The lake is a plane of light BELOW. A face takes it by how far it leans over it: an underside all of it, an upright face half, a level face none.
// So a belly, the inside of a leg and a rock face over a seam are lit from below, and a back, a plate of crust and the far lake are not.
// The two near taps carry five times their share: a strip of lava two metres from a leg or a rock lights it several times harder than the sky does,
// and uCast cannot say so, because the air reads lakeGlow with it.
// A level face low over the lake takes one thing more, the lip: LAKE_LIP of the lava within about a metre of it (rough ground has grains that face
// the fire). It is read at the map's finest level and is gone two metres from a gap and four metres above the lake. Nothing reads the lake wide for
// a level face any more: that wash is what turned a kilometre of crust maroon.
const float LAKE_LIP = 0.5;
vec3 lakeLip(vec3 p, float h) {
  if (h >= 4.0) return vec3(0.0);
  return lakeGlow(p.xz, 0.9) * (LAKE_LIP * smoothstep(4.0, 1.0, h));
}
vec3 lakeIrradiance(vec3 p, vec3 n) {
  float h = max(p.y, 0.35);
  float down = 0.5 - 0.5 * n.y;
  vec3 e = lakeLip(p, h);
  if (down > 0.015) {
    vec2 reach = n.xz * h;
    vec3 under = lakeGlow(p.xz + reach * 0.9, h * 0.8) * 2.0;
    under += lakeGlow(p.xz + reach * 2.6, h * 1.6) * 1.2;
    under += lakeGlow(p.xz + reach * 6.5, h * 4.0) * 0.2;
    e += under * (down * lakeReach(h));
  }
  return e * 3.14159;
}

// The same from one tap, for things far away.
vec3 lakeIrradianceFar(vec3 p, vec3 n) {
  float h = max(p.y, 0.35);
  float down = 0.5 - 0.5 * n.y;
  vec3 e = lakeLip(p, h);
  if (down > 0.015) e += lakeGlow(p.xz + n.xz * h * 1.8, max(h * 2.2, 3.0)) * (2.0 * down * lakeReach(h));
  return e * 3.14159;
}

// Irradiance from the round lights: the fall, the mouth, the fountains, the surge.
// Each is a disc of real size and falls off with the square of the distance, as light does. The fume takes it beyond that: half is left at a reach of
// 70 m + 1.5 radii (the fall: 85 to 100 m) and a sixteenth at twice as far, so the cliff beside the fall is lit for a hundred metres and a wall a
// kilometre away stays the sky's.
// A small light is the core of more open lava than its disc (three discs stand for a river 130 m long, one for a row of fountains), so it casts
// EMITTER_CORE times its own share; a light wider than 60 m (the lit fume) is its true size and casts once.
// The land between cuts it: one read of the coarse land half way to the light, only where the light would count.
const float EMITTER_CORE = 4.5;
vec3 emitterIrradiance(vec3 p, vec3 n) {
  vec3 e = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 d = uEmitters[i].xyz - p;
    float r = uEmitters[i].w;
    float d2 = dot(d, d) + r * r;
    float c = clamp((dot(n, d) * inversesqrt(d2) + 0.25) / 1.25, 0.0, 1.0);
    float reach = max(70.0 + 1.5 * r, 40.0 + 2.2 * r);
    float q = d2 / (reach * reach);
    float k = (3.14159 * r * r / d2) * c / (1.0 + q * q) * mix(EMITTER_CORE, 1.0, smoothstep(20.0, 60.0, r));
    if (k < 0.0015) continue;
    vec3 m = p + d * 0.5;
    float over = texture2D(tLand, (m.xz - uLandRect.xy) * uLandRect.zw).r - m.y;
    e += uEmitterRadiance[i] * (k * (1.0 - smoothstep(3.0, 16.0, over)));
  }
  return e * uCast;
}

// For the owners: how much of the sky a face keeps when the land in front of it stands higher than it does. 1 in the open, toward 0 in a crack,
// under a step, between blocks, at the foot of a wall. It reads the land's height at reach and at 3 x reach metres in front of the face (along the
// level direction it looks in) and takes the steeper rise, as the baked sky open does over hundreds of metres; a face that looks up is cut less
// than one that looks sideways. Multiply the occlusion you give the rig by it: rigShade(p, n, v, albedo, rough, occ * landHollow(p, n, 1.5)).
// The land map has a cell of 0.6 m on the bench near the camera and 2.7 m elsewhere, so reach is 1 to 3 m on the bench and 6 m or more on the walls.
// It costs two reads of landAt: use it on what is near, and not together with a relief that already shades the same scale.
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
  return vis * (1.0 - contactAt(p) * smoothstep(4.0, 0.0, above));
}

// The shading every opaque surface uses. v points from the surface to the camera. occ is the surface's own small-scale occlusion, 1 for none.
vec3 rigShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  float open = skyOpen(p) * occ;
  vec3 e = skyIrradiance(n) * open + lakeIrradiance(p, n) * occ + emitterIrradiance(p, n) * occ;
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), skyIrradiance(n) / 3.14159, rough * rough);
  return c + f * env * open;
}

// The last line of every built surface: gl_FragColor = vec4(rigOut(colour), 1.0). It blacks the surface when an effect is drawn alone.
vec3 rigOut(vec3 c) {
  return c * (1.0 - uSolo);
}

// The slow drift of the crust: metres a second at a point of the lake.
vec2 flowVelocity(vec2 xz) {
  float lake = -landAt(xz).b;
  vec2 out2 = xz - uFlowFoot;
  float far = length(out2);
  vec2 dir = normalize(mix(out2 / max(far, 1.0), vec2(0.94, 0.34), smoothstep(150.0, 600.0, far)));
  return dir * 0.28 * smoothstep(8.0, 140.0, lake) * smoothstep(0.0, 30.0, far);
}

// Where a point of the crust was at the reference time: draw the crust's pattern at this place and it drifts with the lake.
vec2 crustPoint(vec2 xz) {
  return xz - flowVelocity(xz) * (uTime - uFlowT0);
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
