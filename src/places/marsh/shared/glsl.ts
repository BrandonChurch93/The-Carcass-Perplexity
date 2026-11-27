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
// The brine's mirror: the scene as the level brine sees it, drawn small before each sample (brine/index.ts). uMirror is 1 while that
// picture is being drawn: the ground under the brine's level is left out of it. uMirrorMatrix takes a place in the world to that picture.
uniform float uMirror;
uniform sampler2D tMirror;
uniform mat4 uMirrorMatrix;
uniform int uEmitterCount;
uniform vec4 uEmitters[8];
uniform vec3 uEmitterRadiance[8];`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}
// Toward the brighter side of the overcast, on x and z (bearing 320 degrees), and how much more a face turned to it takes.
const vec2 RIG_KEY = vec2(-0.643, -0.766);
const float RIG_KEY_SHARE = 0.26;
// (The cloud's shade is laid over the frame by the air pass, once for each texel, and not by each surface: rigCloud is there for it.)
const float RIG_CLOUD_SHARE = 0.11;
// The grade: the light that stays where it is, and how much steeper the darks fall away under it.
const float RIG_PIVOT = 0.4;
const float RIG_CONTRAST = 0.95;

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
  // The overcast has a brighter side, where the sun stands behind it: a face turned to it takes more, one turned away less, and level
  // ground the same as before. This is what gives a body, a trunk and a bank a light side and a dull one.
  e *= 1.0 + RIG_KEY_SHARE * dot(n.xz, RIG_KEY);
  return 3.14159 * e;
}

// The slow shade of the cloud as it passes over the flats: thicker and thinner overcast, some hundreds of strides across, travelling with
// the upper wind. 1 is the mean.
float rigCloud(vec2 xz) {
  vec2 q = xz * 0.012 + vec2(0.085, 0.031) * uTime;
  float a = sin(q.x + 1.7 * sin(q.y * 0.83 + 0.6)) * sin(q.y * 1.13 + 1.3 * sin(q.x * 0.71 + 2.0));
  float b = sin(q.x * 2.3 - q.y * 1.7 + 2.0 * sin(q.y * 1.9 + 0.4));
  return 1.0 + RIG_CLOUD_SHARE * (0.7 * a + 0.3 * b);
}

// The land under a point: r height in metres, g how much of the sky the ground there sees (0 to 1),
// b distance to the edge of the brine in metres (positive on land, negative on the brine), a how thin the crust is there (0 firm, 1 thin over mud).
// The map covers the ground the cameras stand on (uLandRect); outside it the flats are open and level.
vec4 landAt(vec2 xz) {
  // (Level 0 by name, here and below: the owners call these from inside their own branches, where a level picked from screen slopes is not
  // the same from one draw to the next. Neither map has smaller levels, so nothing changes in the picture.)
  return textureLod(tLand, (xz - uLandRect.xy) * uLandRect.zw, 0.0);
}

// What stands on the ground alone, as drawn in the contact map.
float contactDrawn(vec3 p) {
  vec2 uv = (p.xz - uContactRect.xy) * uContactRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  float edge = min(e.x, e.y);
  // Outside the map nothing is drawn, and the map is not read: most of a wide frame is outside it.
  if (edge <= 0.0) return 0.0;
  return textureLod(tContact, uv, 0.0).r * smoothstep(0.0, 0.03, edge);
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
  vec4 land = textureLod(tLand, uv, 0.0);
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
  // A rough dry surface has next to no sheen even where the view skims it: only what is wet and smooth gives back the sky.
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.94 * rough);
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
// It carries the grade of the place as well, in scene-linear light and before the air lies over the surface: the darks are taken down
// and kept rust red, and what is pale loses its pink, so that salt is grey-white beside the brine.
vec3 rigGrade(vec3 c) {
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // The darks and mids lifted to the milk of the place: a gain that falls from 1.27 in the darks to 0.955 at white. (It stands in for
  // RIG_PIVOT * pow(l / RIG_PIVOT, RIG_CONTRAST), which costs every surface of every folder a power for each texel it draws.)
  float m = l * (0.94 + 0.0156 / (l + 0.042));
  // The whites are held under the sky's: salt in an overcast is pale, not lit.
  float over = max(m - 0.4, 0.0);
  m -= 0.3 * over * over / (over + 0.15);
  float pale = clamp((m - 0.1) * 2.63, 0.0, 1.0);
  c = mix(vec3(m), c * (m / max(l, 1e-5)), 1.0 - 0.42 * pale);
  return max(c * mix(vec3(1.0), vec3(0.985, 1.0, 1.03), pale), 0.0);
}
vec3 rigOut(vec3 c) {
  // (Not while the brine's mirror is drawn: what it mirrors is graded once, when the brine itself comes out.)
  return (uMirror > 0.5 ? c : rigGrade(c)) * (1.0 - uSolo);
}
// For what is not a surface (the sky): blacked when an effect is drawn alone, and not graded.
vec3 rigPlain(vec3 c) {
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
