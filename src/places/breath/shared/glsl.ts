// The one light model of the Breath: a cold dawn under sea fog, with a low warm sun in the north-north-west. Every built surface includes RIG_GLSL
// in its fragment shader and reads its light from these functions, so that the rock, the water, the plants and the animals sit in the same light.
// Radiance is scene linear; the grade and the exposure come after, in the post. The names and arguments are the Heart's.
// What this rig costs a pixel: two texture reads (the land map and the contact map) and no loop.

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
uniform sampler2D tContact;
uniform vec4 uContactRect;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGround;
uniform vec3 uSunDir;
uniform vec3 uSunColour;
uniform vec3 uGlowColour;
uniform vec3 uFill;`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}

// The fog's glow round the sun, toward d: an orange core a quarter of a radian wide inside a pale one that reaches half the sky. Measured on the
// approved wide view. The dome, the air and every mirror read this one function. sunGlow is its brightness alone.
vec3 sunHalo(vec3 d) {
  float a = sqrt(max(2.0 - 2.0 * dot(d, uSunDir), 0.0));
  return uGlowColour * (exp(-a / 0.6) + vec3(2.3, 1.05, 0.38) * exp(-a / 0.32));
}
float sunGlow(vec3 d) {
  float a = sqrt(max(2.0 - 2.0 * dot(d, uSunDir), 0.0));
  return exp(-a / 0.6) + 1.2 * exp(-a / 0.32);
}

// Radiance of the dawn sky toward d: cold grey overhead, paler toward the horizon, gold toward the sun. The sun's own disc is the dome's.
vec3 skyRadiance(vec3 d) {
  float up = clamp(d.y, -1.0, 1.0);
  vec3 c = mix(uSkyHorizon, uSkyZenith, pow(clamp(up, 0.0, 1.0), 0.45));
  c = mix(c, uSkyGround, smoothstep(0.0, -0.25, up));
  return c + sunHalo(vec3(d.x, max(d.y, 0.0), d.z)) * smoothstep(-0.2, 0.03, up);
}

// Irradiance from the whole sky on a face with normal n, before anything hides the sky. Cold from above, with the fog's gold glow on the faces
// that are turned to the sun: that glow is what rims everything in this place, and it is not shadowed by a stone (it is a quarter of the sky).
// An underside takes the pale rock's bounce.
vec3 skyIrradiance(vec3 n) {
  float up = 0.5 + 0.5 * n.y;
  vec3 e = mix(uSkyGround, mix(uSkyHorizon, uSkyZenith, 0.55 * max(n.y, 0.0)), up) * uFill;
  float w = 0.5 + 0.5 * dot(n, uSunDir);
  return 3.14159 * (e + uGlowColour * (0.55 * w * w * w));
}

// The land under a point: r the ground's height in metres, g how much of the sky the ground there sees (0 to 1), b the height in metres above
// which the sun is seen at that place (the top of the shadow that the land throws there: equal to r where the ground is lit), a how wet the rock is.
// The map covers the shelf round the shaft. Outside it the ground is open and lit.
vec4 landAt(vec2 xz) {
  return texture2D(tLand, (xz - uLandRect.xy) * uLandRect.zw);
}

// What stands on the ground, as drawn in the contact map: 0 open, 1 covered. Drawn by whoever stands there (ctx.rig.contactDiscs).
float contactDrawn(vec3 p) {
  vec2 uv = (p.xz - uContactRect.xy) * uContactRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  return texture2D(tContact, uv).r * smoothstep(0.0, 0.03, min(e.x, e.y));
}
float contactAt(vec3 p) {
  return contactDrawn(p);
}

// How much of the sun reaches a point: 0 in the land's shadow, 1 above it. For anything: ground, an animal, a frond, a point of the air.
// The shadow's edge is soft over a third of a metre of height, which is two metres along the ground under this sun.
float sunSeen(vec4 land, float y) {
  return smoothstep(-0.35, -0.03, y - land.b);
}
float sunAt(vec3 p) {
  return sunSeen(landAt(p.xz), p.y);
}

// How much of the sky a point sees: the land's own horizon, opening with height above the ground, and whatever stands over it.
float skyOpen(vec3 p) {
  vec4 land = landAt(p.xz);
  float above = p.y - land.r;
  return mix(land.g, 1.0, clamp(above / 30.0, 0.0, 1.0)) * (1.0 - contactDrawn(p) * smoothstep(4.0, 0.0, above));
}

// The sun's mirror on a surface: one lobe, wide on rough rock and tight on water. The sun comes through fog, so it is never a point.
float sunLobe(vec3 n, vec3 v, float rough) {
  vec3 h = normalize(v + uSunDir);
  float nh = max(dot(n, h), 0.0);
  float a = max(rough * rough, 0.03);
  float d = nh * nh * (a * a - 1.0) + 1.0;
  return min(a * a / (3.14159 * d * d), 60.0);
}

// The shading every opaque surface uses. v points from the surface to the camera. occ is the surface's own small-scale occlusion, 1 for none.
vec3 rigShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  vec4 land = landAt(p.xz);
  float above = p.y - land.r;
  float contact = contactDrawn(p) * smoothstep(5.0, 0.0, above);
  float open = mix(land.g, 1.0, clamp(above / 30.0, 0.0, 1.0)) * (1.0 - 0.85 * contact) * occ;
  float sun = sunSeen(land, p.y) * (1.0 - contact) * (0.4 + 0.6 * occ);
  float nl = max(dot(n, uSunDir), 0.0);
  vec3 e = skyIrradiance(n) * open + uSunColour * (3.14159 * nl * sun);
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), skyIrradiance(n) / 3.14159, rough * rough);
  return c + f * env * open + uSunColour * (f * sunLobe(n, v, rough) * nl * sun);
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
