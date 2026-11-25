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
uniform sampler2D tBedFine;
uniform sampler2D tCloudShade;
uniform vec4 uCloudShade;
uniform vec4 uCloudBreak;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGround;
uniform vec3 uSunDir;
uniform vec3 uSunColour;
uniform vec3 uHaze;
uniform vec3 uSkyBreak;
uniform sampler2D tSky;
uniform vec3 uSkyMean;
uniform float uCloudHeight;`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}

// Radiance of the sky toward d, for lighting and for mirrors (the sea reads it): the smooth sky under the cloud, slate above and pale at the
// horizon, brighter round the one break in the cloud (uSkyBreak, the way to it). No texture: the dome draws the cloud's own shapes over this (air/sky.ts).
vec3 skyRadiance(vec3 d) {
  float up = clamp(d.y, -1.0, 1.0);
  vec3 c = mix(uSkyHorizon, uSkyZenith, pow(clamp(up, 0.0, 1.0), 0.45));
  c = mix(c, uSkyGround, smoothstep(0.0, -0.25, up));
  float s = max(dot(d, uSkyBreak), 0.0);
  float s2 = s * s;
  return c * (1.0 + 0.9 * s2 * s2 + 3.2 * pow(s2, 24.0)) * smoothstep(-0.25, 0.0, up) + c * smoothstep(0.0, -0.25, up);
}

// Irradiance from the whole sky on a face with normal n, before anything hides the sky. An upright face takes 0.6 of a level one, a face that
// leans down loses the sky with the cube of its lean and is left with what wet ground and sea throw back up.
vec3 skyIrradiance(vec3 n) {
  float lean = 1.0 + min(n.y, 0.0);
  float seen = lean * lean * lean;
  float up = n.y >= 0.0 ? 0.5 + 0.5 * n.y : 0.5 * seen;
  // The bright side of the overcast is the sun's: a face turned to it takes a fifth more of the sky, one turned away a fifth less.
  float side = 1.0 + 0.45 * dot(n.xz, uSunDir.xz);
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

// The fine relief of the floor that the land texture is too coarse to carry, metres, within plus and minus 0.14.
// The bed under a point is landAt(xz).r + bedFine(xz); on the processor it is rig.land.height.
float bedFine(vec2 xz) {
  return 0.2 * (texture2D(tBedFine, xz / 37.0).r - 0.5) + 0.07 * (texture2D(tBedFine, xz.yx / 9.7).r - 0.5);
}

// How open the cloud sheet is over q, a place on the ground as the sun would strike it: under 0.42 closed, over 0.62 open.
// The broken sheet of the mask, and the one wide break that travels over the strait with the wind.
float cloudCover(vec2 q) {
  vec2 d = q - uCloudBreak.xy;
  return texture2D(tCloudShade, q * uCloudShade.z - uCloudShade.xy).r * 0.62 + uCloudBreak.w * exp(-dot(d, d) * uCloudBreak.z);
}

// The moving shadow of the broken cloud at a point: 1 in a gap, uCloudShade.w under cloud. One sheet for the whole place, drifting with the wind.
float cloudShade(vec3 p) {
  // The sun is not overhead: the shadow of a cloud 1500 m up lies where the ray to the sun leaves the cloud sheet.
  float c = cloudCover(p.xz - uSunDir.xz * (p.y / uSunDir.y));
  return mix(uCloudShade.w, 1.0, smoothstep(0.42, 0.62, c));
}

// The sky with its cloud, as seen from a place toward d: what the dome draws, and what a mirror (a pool, the sea) should show.
// Three texture reads. For light on a rough surface skyRadiance is enough.
vec3 skyCloud(vec3 from, vec3 d) {
  vec3 c = skyRadiance(d);
  // The cloud is one sheet at one height: the same sheet that shades the ground, seen from below.
  float up = max(d.y, 0.0);
  vec2 at = from.xz + d.xz * (uCloudHeight / (up + 0.12)) - uSunDir.xz * (uCloudHeight / uSunDir.y);
  vec2 m = at * uCloudShade.z - uCloudShade.xy;
  float gap = smoothstep(0.42, 0.62, cloudCover(at));
  vec3 wide = texture2D(tSky, m * vec2(0.45, 0.9)).rgb / uSkyMean;
  vec3 fine = texture2D(tSky, m * vec2(1.3, 2.6) + vec2(0.31, 0.57)).rgb / uSkyMean;
  vec3 shape = wide * mix(vec3(1.0), fine, 0.4);
  float s = max(dot(d, uSkyBreak), 0.0);
  float s2 = s * s;
  // Cloud bases are dark slate. In the one break the lit tops of the cloud stand white against pale sky, and the edges round it burn.
  float lum = dot(shape, vec3(0.3, 0.5, 0.2));
  vec3 body = c * pow(shape, vec3(1.5)) * mix(0.42, 0.75, gap);
  float open = smoothstep(0.9, 0.985, s + 0.04 * (lum - 1.0));
  float edge = smoothstep(0.7, 1.7, lum);
  vec3 lit = uSunColour * ((0.03 + 0.12 * s2 * s2) * edge * (0.3 + 0.7 * gap) + open * (0.14 + 0.5 * edge));
  c = body * (1.0 - 0.6 * open) + lit;
  // Toward the horizon the sheet is seen through more and more air.
  float low = smoothstep(0.2, 0.0, d.y);
  return mix(c, uHaze * (1.0 + 0.5 * s2 * s2), low);
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
  // The baked land knows nothing finer than ten metres, and inside a blade's own foot it is dark: an upright face asks for the land in front of it.
  vec4 land = landAt(p.xz + n.xz * 14.0);
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

