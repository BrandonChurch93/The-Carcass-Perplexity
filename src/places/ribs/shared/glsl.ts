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
uniform vec4 uCloudBreak2;
uniform vec3 uSkyZenith;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyGround;
uniform vec3 uSunDir;
uniform vec3 uSunColour;
uniform vec3 uHaze;
uniform vec3 uBounce;
uniform vec3 uSkyBreak;
uniform sampler2D tSky;
uniform vec4 uSkyTurn;
uniform sampler2D tDome;
uniform vec4 uDome;`;

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
  // The bright side of the overcast is the sun's: a face turned to it takes a sixth more of the sky, one turned away a sixth less.
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

// The fine relief of the floor that the land texture is too coarse to carry, metres, within plus and minus 0.14.
// The bed under a point is landAt(xz).r + bedFine(xz); on the processor it is rig.land.height.
float bedFine(vec2 xz) {
  return 0.2 * (texture2D(tBedFine, xz / 37.0).r - 0.5) + 0.07 * (texture2D(tBedFine, xz.yx / 9.7).r - 0.5);
}

// How open the cloud sheet is over q, a place on the ground as the sun would strike it: under 0.42 closed, over 0.62 open.
// The broken sheet of the mask, the one wide break that travels over the strait with the wind, and the small one that stands on the first blade as the film opens.
float cloudBreaks(vec2 q) {
  vec2 d = q - uCloudBreak.xy;
  vec2 e = q - uCloudBreak2.xy;
  // Each break is long the sun's way (the wide one two and a half times its width, the small one four): a low sun through a round hole
  // would light a blade's foot or its head, never both.
  float sun2 = 1.0 - uSunDir.y * uSunDir.y;
  float along = dot(d, uSunDir.xz);
  float along2 = dot(e, uSunDir.xz);
  return uCloudBreak.w * exp(-(dot(d, d) - 0.84 * along * along / sun2) * uCloudBreak.z) + uCloudBreak2.w * exp(-(dot(e, e) - 0.94 * along2 * along2 / sun2) * uCloudBreak2.z);
}
float cloudCover(vec2 q) {
  return texture2D(tCloudShade, q * uCloudShade.z - uCloudShade.xy).r * 0.62 + cloudBreaks(q);
}

// The moving shadow of the broken cloud at a point: 1 in a gap, uCloudShade.w under cloud. One sheet for the whole place, drifting with the wind.
// The same inside a march of the air, where the places read jump from pixel to pixel: the level of the picture is named.
float cloudShadeMarched(vec3 p) {
  vec2 q = p.xz - uSunDir.xz * (p.y / uSunDir.y);
  float c = textureLod(tCloudShade, q * uCloudShade.z - uCloudShade.xy, 1.5).r * 0.62 + cloudBreaks(q);
  return mix(uCloudShade.w, 1.0, smoothstep(0.42, 0.62, c));
}
float cloudShade(vec3 p) {
  // The sun is not overhead: the shadow of a cloud 1500 m up lies where the ray to the sun leaves the cloud sheet.
  float c = cloudCover(p.xz - uSunDir.xz * (p.y / uSunDir.y));
  return mix(uCloudShade.w, 1.0, smoothstep(0.42, 0.62, c));
}

// The sky with its cloud, toward d: what the dome draws, and what a mirror (a pool, the sea) should show. from is where it is seen from.
// One picture of a breaking storm sky (tDome) laid round the dome by heading and height and mirrored behind, turning slowly with the wind
// while its lumps work. The picture is a bright afternoon's: domeTone makes it the storm's (slate, heavy bases, the white heads kept) and
// lays the air over it, thick at the horizon and thin overhead, so that the dome, the far sea and the last blades end in one colour.
// uDome: x the shot's gain of the whole sky, y the depth of air straight up (the veil at a height is 1 - exp(-y / sin)), z what the
// break is given, w how far the white is shut away from the break.
vec3 domeTone(vec3 c, vec3 d, float el) {
  float grey = dot(c, vec3(0.3, 0.5, 0.2));
  c = mix(vec3(grey), c, 0.8);
  c *= 0.18 + 0.72 * smoothstep(0.1, 0.6, grey);
  // Straight overhead the picture runs out: the slate of the cloud's base.
  c = mix(c, uSkyZenith * 0.8, smoothstep(1.0, 1.35, el));
  float s = max(dot(d, uSkyBreak), 0.0);
  float s2 = s * s;
  float near = s2 * s2;
  near = near * near * near;
  // One break: the picture's white heads stand where the rig's break is, and away from it they are shut down to the storm's grey.
  c *= mix(1.0 - uDome.w * smoothstep(0.2, 0.7, grey), 1.0 + uDome.z, near);
  float veil = 1.0 - exp(-uDome.y / max(d.y, 0.008));
  return uDome.x * mix(c, uHaze * (0.85 + 0.5 * s2 * s2), veil);
}
vec2 domeAt(vec3 d, out float el) {
  float az = atan(d.x, -d.z);
  el = asin(clamp(d.y, 0.0, 1.0));
  // The picture's own pale foot stands under the horizon: the air's veil is the horizon's light, and cloud comes down to it.
  // The picture's break lies 0.47 radians right of its middle; the rig turns it as if it lay 0.715 right (the first picture's place).
  return vec2(0.5 + (az - uSkyTurn.x - 0.245) / 2.62, 1.0 - 0.91 * exp(-el / 0.82));
}
vec3 skyCloud(vec3 from, vec3 d) {
  float el;
  vec2 uv = domeAt(d, el);
  vec2 work = texture2D(tCloudShade, uv * vec2(1.3, 0.9) + uSkyTurn.yz).rg - 0.5;
  return domeTone(texture2D(tDome, uv + 0.012 * work).rgb, d, el);
}
// The same sky for a mirror that names the level of the picture it reads (a rippled sheet read by its own slopes costs several times
// more): the cloud's slow working is left out, the ripples bend the picture far more than it does.
vec3 skyMirror(vec3 d, float level) {
  float el;
  vec2 uv = domeAt(d, el);
  return domeTone(textureLod(tDome, uv, level).rgb, d, el);
}

// How much of the sun reaches p through the blades and the land (baked once) and the cloud (drifting).
float sunBaked(vec3 p, vec4 land) {
  float baked = mix(land.b, land.a, clamp((p.y - land.r) / 60.0, 0.0, 1.0));
  return mix(baked, 1.0, clamp((p.y - land.r - 60.0) / 200.0, 0.0, 1.0));
}
float sunAt(vec3 p, vec4 land) {
  return sunBaked(p, land) * cloudShade(p);
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
  float gap = cloudShade(p);
  float sun = sunBaked(p, land) * gap * occ;
  float nl = max(dot(n, uSunDir), 0.0);
  // The lit flats throw the low sun back up: a face that looks down or stands upright over sunlit ground takes it warm, and the more of
  // it the higher it stands over its own shadow. This is what keeps a lee face from going to the sky's cold grey alone.
  vec3 bounce = uSunColour * uBounce * (uSunDir.y * (gap - uCloudShade.w) * (0.5 - 0.5 * n.y) * (0.3 + 0.7 * clamp(above / 90.0, 0.0, 1.0)));
  vec3 e = (skyIrradiance(n) + bounce) * open + uSunColour * (nl * sun);
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
  // The glint is the sun on water: silver-white, with a third of the light's own warmth.
  vec3 glint = mix(vec3(dot(uSunColour, vec3(0.3, 0.5, 0.2))), uSunColour, 0.35);
  return c + f * (env * open + glint * (spec * nl * sun));
}

// The last line of every built surface: gl_FragColor = vec4(rigOut(colour), 1.0). It blacks the surface when an effect is drawn alone.
vec3 rigOut(vec3 c) {
  // Nothing below nothing and nothing that is not a number leaves a surface: one such value blackens its whole pixel at the lens.
  vec3 safe = vec3(isnan(c.x) ? 0.0 : c.x, isnan(c.y) ? 0.0 : c.y, isnan(c.z) ? 0.0 : c.z);
  return clamp(safe, 0.0, 4000.0) * (1.0 - uSolo);
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

