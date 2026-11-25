// The one light model of the Blood Marsh. Every built surface includes RIG_GLSL in its fragment shader and reads its light from these functions,
// so that the flats, the brine and the animals sit in the same light. Radiance is scene linear; the grade and the exposure come after, in the post.
// The light is a white overcast and nothing else: no sun, no fire. The names are the Heart's, so that code written against the Heart's rig compiles
// here; what the Heart's fire lit (lakeIrradiance, emitterIrradiance, lakeGlow) is kept as functions that return nothing.

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
uniform sampler2D tLand;
uniform vec4 uLandRect;
uniform sampler2D tContact;
uniform vec4 uContactRect;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGround;
uniform vec3 uFill;
uniform vec3 uAirColour;
uniform vec4 uAir;
uniform int uEmitterCount;
uniform vec4 uEmitters[8];
uniform vec3 uEmitterRadiance[8];`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}

// Radiance of the overcast toward d, for lighting and for what a wet surface mirrors. An overcast is brightest overhead and a third as bright
// at the horizon; this one keeps more at the horizon, where the haze over the salt is lit from below by the flats.
vec3 skyRadiance(vec3 d) {
  float up = clamp(d.y, -1.0, 1.0);
  vec3 c = mix(uSkyHorizon, uSkyZenith, pow(clamp(up, 0.0, 1.0), 0.6));
  return mix(c, uSkyGround, smoothstep(0.0, -0.25, up));
}

// Irradiance from the whole sky on a face with normal n, before anything hides the sky.
// A level face takes the whole dome. An upright face sees half the dome and half the ground, which here is pale salt and throws back a good
// share (uSkyGround). A face that leans down loses the sky with the cube of its lean and keeps the ground's light: the darks of the place are
// not undersides in the open, they are the places the land or a body closes off (skyOpen, contactAt, the surface's own occlusion).
vec3 skyIrradiance(vec3 n) {
  float lean = 1.0 + min(n.y, 0.0);
  float seen = lean * lean * lean;
  float up = n.y >= 0.0 ? 0.5 + 0.5 * n.y : 0.5 * seen;
  vec3 e = mix(uSkyGround, mix(uSkyHorizon, uSkyZenith, 0.6 * max(n.y, 0.0)), up) * uFill;
  return 3.14159 * e;
}

// The land under a point: r height in metres, g how much of the sky the ground there sees (0 to 1),
// b distance to the edge of the brine in metres (positive on land, negative on the brine), a how thin the crust is there (0 firm, 1 thin over mud).
// The map covers the ground the cameras stand on (uLandRect); outside it the flats are open and level.
vec4 landAt(vec2 xz) {
  return texture2D(tLand, (xz - uLandRect.xy) * uLandRect.zw);
}

// What stands on the ground alone, as drawn in the contact map.
float contactDrawn(vec3 p) {
  vec2 uv = (p.xz - uContactRect.xy) * uContactRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  float edge = min(e.x, e.y);
  // Outside the map nothing is drawn, and the map is not read: most of a wide frame is outside it.
  if (edge <= 0.0) return 0.0;
  return texture2D(tContact, uv).r * smoothstep(0.0, 0.03, edge);
}

// 0 open, 1 covered: how much of the sky is hidden at the ground by something standing over it. Drawn by whoever stands there.
float contactAt(vec3 p) {
  return contactDrawn(p);
}

// The Heart's fire. There is none here: these stay so that code written against the Heart's rig compiles, and they add nothing.
vec3 lakeGlow(vec2 xz, float radius) { return vec3(0.0); }
float lakeReach(float h) { return 0.0; }
vec3 lakeIrradiance(vec3 p, vec3 n) { return vec3(0.0); }
vec3 lakeIrradianceFar(vec3 p, vec3 n) { return vec3(0.0); }

// Irradiance from the round lights (ctx.rig.emitters). The marsh has none of its own; one pushed by a folder lights as in the Heart, without its shade.
vec3 emitterIrradiance(vec3 p, vec3 n) {
  vec3 e = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 d = uEmitters[i].xyz - p;
    float r = uEmitters[i].w;
    float d2 = dot(d, d) + r * r;
    float wrap = 0.5 * r * inversesqrt(d2);
    float c = clamp((dot(n, d) * inversesqrt(d2) + wrap) / (1.0 + wrap), 0.0, 1.0);
    e += uEmitterRadiance[i] * (3.14159 * r * r / d2) * c;
  }
  return e;
}

// For the owners: how much of the sky a face keeps when the land in front of it stands higher than it does. See the Heart's. The land map has
// cells of half a metre, so reach is 1 m or more.
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
  vec2 uv = (p.xz - uLandRect.xy) * uLandRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  // Outside the map the flats are open and level, and the map is not read.
  if (min(e.x, e.y) <= 0.0) return 1.0;
  vec4 land = texture2D(tLand, uv);
  float above = p.y - land.r;
  float vis = mix(land.g, 1.0, clamp(above / 12.0, 0.0, 1.0));
  return vis * (1.0 - contactDrawn(p) * smoothstep(3.0, 0.0, above));
}

// The shading every opaque surface uses. v points from the surface to the camera. occ is the surface's own small-scale occlusion, 1 for none.
// A smooth wet surface (rough near 0) mirrors the white sky at a grazing angle: that sheen against the matte salt is half of the place's depth.
vec3 rigShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  float open = skyOpen(p) * occ;
  vec3 e = skyIrradiance(n) * open;
  if (uEmitterCount > 0) e += emitterIrradiance(p, n) * occ;
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), skyIrradiance(n) / 3.14159, rough * rough);
  return c + f * env * open;
}

// The air between the lens and a surface, for a surface that wants it without the volume pass (translucent things drawn after it). The volume
// pass lays the same air over every opaque surface: an opaque surface never calls this.
vec3 rigAir(vec3 c, float distance, float height) {
  float t = exp(-distance * uAir.x * exp(-max(height, 0.0) * uAir.y));
  return c * t + uAirColour * (1.0 - t);
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
