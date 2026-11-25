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
uniform int uEmitterCount;
uniform vec4 uEmitters[8];
uniform vec3 uEmitterRadiance[8];
uniform vec2 uFlowFoot;
uniform float uFlowT0;`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}

// The only colour of anything that glows by its own heat. 1500 K reads 60 in red; the sky is about 0.05.
// Seam cores 1350 to 1450 K, a skin that still glows about 1100 K, dark below 900 K.
vec3 blackbody(float kelvin) {
  float r = 60.0 * exp(-23587.0 * (1.0 / kelvin - 1.0 / 1500.0));
  return vec3(r, r * 1.678 * exp(-2573.0 / kelvin), r * 3.885 * exp(-7355.0 / kelvin));
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
vec3 skyIrradiance(vec3 n) {
  float up = 0.5 + 0.5 * n.y;
  vec3 e = mix(uSkyGround, mix(uSkyHorizon, uSkyZenith, 0.55), up);
  float w = 0.5 + 0.5 * dot(n, uWarmDir);
  return 3.14159 * (e + uWarmColour * 0.35 * w * w);
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
vec3 lakeGlow(vec2 xz, float radius) {
  return textureLod(tGlow, (xz - uGlowRect.xy) * uGlowRect.zw, log2(max(radius * 2.0 * uGlowTexels, 1.0))).rgb;
}

// Irradiance from the glowing lake on a point p with normal n. Zero on a face that looks straight up at lake level.
vec3 lakeIrradiance(vec3 p, vec3 n) {
  float h = max(p.y, 0.35);
  float down = 0.5 - 0.5 * n.y;
  float side = length(n.xz);
  vec2 dir = side > 1e-4 ? n.xz / side : vec2(0.0);
  vec2 reach = dir * h * side;
  vec3 e = lakeGlow(p.xz + reach * 0.9, h * 0.8) * 0.4;
  e += lakeGlow(p.xz + reach * 2.6, h * 1.6) * 0.3;
  e += lakeGlow(p.xz + reach * 6.5, h * 4.0) * 0.2;
  e += lakeGlow(p.xz, h * 2.5) * 0.1;
  return e * 3.14159 * down;
}

// The same from one tap, for things far away.
vec3 lakeIrradianceFar(vec3 p, vec3 n) {
  float h = max(p.y, 0.35);
  float side = length(n.xz);
  vec2 dir = side > 1e-4 ? n.xz / side : vec2(0.0);
  return lakeGlow(p.xz + dir * h * side * 1.8, h * 2.2) * 3.14159 * (0.5 - 0.5 * n.y);
}

// Irradiance from the round lights: the fall, the mouth, the fountains, the surge.
vec3 emitterIrradiance(vec3 p, vec3 n) {
  vec3 e = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 d = uEmitters[i].xyz - p;
    float r2 = uEmitters[i].w * uEmitters[i].w;
    float d2 = dot(d, d) + r2;
    float c = clamp((dot(n, d) * inversesqrt(d2) + 0.25) / 1.25, 0.0, 1.0);
    e += uEmitterRadiance[i] * (3.14159 * r2 / d2) * c;
  }
  return e;
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
