// The one light model of the Eye. Every built surface includes RIG_GLSL in its fragment shader and reads its light from these functions,
// so that the water, the land and the animals sit in the same light: a clear, still evening with one low warm sun.
// Radiance is scene linear; the grade and the exposure come after, in the post.

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
uniform vec3 uGlowDir;
uniform vec3 uGlowColour;
uniform vec3 uFill;`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}

// Radiance of the evening sky toward d. The glow is the bright low sky on the side of the sun.
vec3 skyRadiance(vec3 d) {
  float up = clamp(d.y, -1.0, 1.0);
  vec3 c = mix(uSkyHorizon, uSkyZenith, pow(clamp(up, 0.0, 1.0), 0.45));
  c = mix(c, uSkyGround, smoothstep(0.0, -0.25, up));
  float w = max(dot(normalize(vec3(d.x, 0.0, d.z) + vec3(0.0, 1e-4, 0.0)), uGlowDir), 0.0);
  float w2 = w * w;
  return c + uGlowColour * ((0.75 * w2 * w2 + 0.25 * w2) * exp(-3.2 * max(up, 0.0)) * smoothstep(-0.12, 0.02, up));
}

// Irradiance from the whole sky on a face with normal n, before anything hides the sky.
// An upright face sees half the sky and the ground; a face that leans down sees the ground alone.
vec3 skyIrradiance(vec3 n) {
  float up = 0.5 + 0.5 * n.y;
  vec3 e = mix(uSkyGround, mix(uSkyHorizon, uSkyZenith, 0.6), up);
  float w = 0.5 + 0.5 * dot(n, uGlowDir);
  return 3.14159 * (e + uGlowColour * (0.1 * w * w * up)) * uFill;
}

// The land under a point: r height in metres, g how much of the sky the ground there sees (0 to 1),
// b metres to the edge of the lake (positive on land, negative on the water), a the height below which the sun is hidden there by the land.
vec4 landAt(vec2 xz) {
  return texture2D(tLand, (xz - uLandRect.xy) * uLandRect.zw);
}

// What stands on the ground, as drawn in the contact map: the discs of the animals and the stones, stretched along the sun.
float contactDrawn(vec3 p) {
  vec2 uv = (p.xz - uContactRect.xy) * uContactRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  return texture2D(tContact, uv).r * smoothstep(0.0, 0.03, min(e.x, e.y));
}

// 0 open, 1 covered: how much of the light is hidden at the ground by something standing over it.
float contactAt(vec3 p) {
  return contactDrawn(p);
}

// 1 in the sun, 0 in the long shadow of the cliffs, from the land map alone. The edge is as soft as a shadow thrown a kilometre.
float sunOver(vec4 land, float y) {
  return smoothstep(-1.6, 1.6, y - land.a);
}

// The same with what stands on the ground: within three metres of the ground the contact map hides the sun.
float sunAt(vec3 p) {
  vec4 land = landAt(p.xz);
  return sunOver(land, p.y) * (1.0 - contactDrawn(p) * smoothstep(3.0, 0.3, p.y - max(land.r, 0.0)));
}

// How much of the sky a point sees: the land's own horizon, opening with height above the ground, and whatever stands over it.
float skyOpen(vec3 p) {
  vec4 land = landAt(p.xz);
  float above = p.y - max(land.r, 0.0);
  float vis = mix(land.g, 1.0, clamp(above / 80.0, 0.0, 1.0));
  return vis * (1.0 - 0.7 * contactDrawn(p) * smoothstep(3.0, 0.0, above));
}

// The shading every opaque surface uses. v points from the surface to the camera. occ is the surface's own small-scale occlusion, 1 for none.
vec3 rigShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  vec4 land = landAt(p.xz);
  float above = p.y - max(land.r, 0.0);
  float drawn = contactDrawn(p);
  float open = mix(land.g, 1.0, clamp(above / 80.0, 0.0, 1.0)) * (1.0 - 0.7 * drawn * smoothstep(3.0, 0.0, above)) * occ;
  float sun = sunOver(land, p.y) * (1.0 - drawn * smoothstep(3.0, 0.3, above));
  float nl = max(dot(n, uSunDir), 0.0);
  vec3 e = skyIrradiance(n) * open + uSunColour * (nl * sun * (0.4 + 0.6 * occ));
  // The warm light thrown back by sunlit rock and gravel on what is turned from the sun.
  e += uSunColour * (0.035 * (0.5 - 0.5 * n.y + 0.25) * open);
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
