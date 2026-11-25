// The one light model of the Ribs. Every built surface includes RIG_GLSL in its fragment shader and reads its light from these functions,
// so that the land, the blades, the sea and the animals sit in the same light. Radiance is scene linear; the grade and the exposure come after, in the post.
// The names and arguments are the Heart's. What is new here is a sun: one direction, one colour, a shadow baked once (the sun does not move
// in the place's 42 seconds) and one drifting mask of cloud shadow. Every read of a texture is paid by the processor: rigShade makes three.

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
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}`;

export const RIG_UNIFORMS_GLSL = /* glsl */ `
uniform float uTime;
uniform float uSolo;
uniform sampler2D tLand;
uniform vec4 uLandRect;
uniform sampler2D tContact;
uniform vec4 uContactRect;
uniform sampler2D tCloudShade;
uniform vec4 uCloudShade;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGround;
uniform vec3 uSunDir;
uniform vec3 uSunColour;
uniform vec3 uHaze;`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}

// Radiance of the sky toward d, for lighting and for mirrors (the sea reads it): the smooth sky under the cloud, slate above and pale at the
// horizon, brighter round the sun where the cloud is thin. No texture: the dome draws the cloud's own shapes over this (air/sky.ts).
vec3 skyRadiance(vec3 d) {
  float up = clamp(d.y, -1.0, 1.0);
  vec3 c = mix(uSkyHorizon, uSkyZenith, pow(clamp(up, 0.0, 1.0), 0.45));
  c = mix(c, uSkyGround, smoothstep(0.0, -0.25, up));
  float s = max(dot(d, uSunDir), 0.0);
  float s2 = s * s;
  return c * (1.0 + 0.9 * s2 * s2 + 2.2 * pow(s2, 24.0)) * smoothstep(-0.25, 0.0, up) + c * smoothstep(0.0, -0.25, up);
}

// Irradiance from the whole sky on a face with normal n, before anything hides the sky. An upright face takes 0.6 of a level one, a face that
// leans down loses the sky with the cube of its lean and is left with what wet ground and sea throw back up.
vec3 skyIrradiance(vec3 n) {
  float lean = 1.0 + min(n.y, 0.0);
  float seen = lean * lean * lean;
  float up = n.y >= 0.0 ? 0.5 + 0.5 * n.y : 0.5 * seen;
  // The bright side of the overcast is the sun's: a face turned to it takes a fifth more of the sky, one turned away a fifth less.
  float side = 1.0 + 0.2 * dot(n.xz, uSunDir.xz);
  return 3.14159 * side * mix(uSkyGround, mix(uSkyHorizon, uSkyZenith, 0.6 * max(n.y, 0.0)), up);
}

// The land under a point: r height of the ground in metres (the bed: sand, rock; below 0 is under the sea), g how much of the sky the
// ground there sees (0 to 1), b how much of the sun reaches the ground there (0 in the shadow of a blade), a the same 60 m above the ground.
vec4 landAt(vec2 xz) {
  return texture2D(tLand, (xz - uLandRect.xy) * uLandRect.zw);
}

// What stands on the ground, as drawn in the contact map.
float contactDrawn(vec3 p) {
  vec2 uv = (p.xz - uContactRect.xy) * uContactRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  return texture2D(tContact, uv).r * smoothstep(0.0, 0.03, min(e.x, e.y));
}

// 0 open, 1 covered: how much of the sky is hidden at the ground by something standing over it. Drawn by whoever stands there.
float contactAt(vec3 p) {
  return contactDrawn(p);
}

// The moving shadow of the broken cloud at a point: 1 in a gap, uCloudShade.w under cloud. One mask for the whole place, drifting with the wind.
float cloudShade(vec3 p) {
  // The sun is not overhead: the shadow of a cloud 1500 m up lies where the ray to the sun leaves the cloud sheet.
  vec2 q = (p.xz - uSunDir.xz * (p.y / uSunDir.y)) * uCloudShade.z - uCloudShade.xy;
  float c = texture2D(tCloudShade, q).r;
  return mix(uCloudShade.w, 1.0, smoothstep(0.42, 0.62, c));
}

// How much of the sun reaches p through the blades and the land (baked once) and the cloud (drifting).
float sunAt(vec3 p, vec4 land) {
  float baked = mix(land.b, land.a, clamp((p.y - land.r) / 60.0, 0.0, 1.0));
  baked = mix(baked, 1.0, clamp((p.y - land.r - 60.0) / 200.0, 0.0, 1.0));
  return baked * cloudShade(p);
}

// How much of the sky a point sees: the land's own horizon (the blades stand in it), opening with height above the ground, and whatever stands over it.
float skyOpen(vec3 p) {
  vec4 land = landAt(p.xz);
  float above = p.y - land.r;
  float vis = mix(land.g, 1.0, clamp(above / 120.0, 0.0, 1.0));
  return vis * (1.0 - contactDrawn(p) * smoothstep(4.0, 0.0, above));
}

// The shading every opaque surface uses. v points from the surface to the camera. occ is the surface's own small-scale occlusion, 1 for none.
vec3 rigShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  vec4 land = landAt(p.xz);
  float above = p.y - land.r;
  float open = mix(land.g, 1.0, clamp(above / 120.0, 0.0, 1.0)) * (1.0 - contactDrawn(p) * smoothstep(4.0, 0.0, above)) * occ;
  float sun = sunAt(p, land) * occ;
  float nl = max(dot(n, uSunDir), 0.0);
  vec3 e = skyIrradiance(n) * open + uSunColour * (nl * sun);
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), skyIrradiance(n) / 3.14159, rough * rough);
  // The sun's own glint on what is wet: a lobe as wide as the roughness.
  vec3 h = normalize(v + uSunDir);
  float gloss = 2.0 / max(rough * rough * rough * rough, 2e-4);
  float spec = pow(max(dot(n, h), 0.0), gloss) * (gloss + 8.0) * 0.0398;
  return c + f * (env * open + uSunColour * (spec * nl * sun));
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
