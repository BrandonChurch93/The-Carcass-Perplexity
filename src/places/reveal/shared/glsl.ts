// The one light of the rise: a planet under one sun, seen from above. Every built surface includes RIG_GLSL and takes its light from these functions.
// Radiance is scene linear; the exposure and the grade come after, in the post. Lengths are kilometres.

export const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
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
uniform float uBeat;
uniform vec3 uSunDir;
uniform vec3 uSunColour;
uniform vec3 uSkyColour;
uniform vec3 uAirColour;
uniform vec4 uLimb;
uniform float uViewKm;
uniform float uArrive;
uniform float uDusk;
uniform vec4 uTerm;
uniform vec3 uMoonDir;
uniform vec3 uMoonColour;
uniform float uGain;
uniform vec4 uCalm;
uniform vec2 uEmber;`;

export const RIG_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}

// The only colour of anything that glows by its own heat, as in the Heart: 1500 K reads 60 in red.
vec3 blackbody(float kelvin) {
  float r = 60.0 * exp(-23587.0 * (1.0 / kelvin - 1.0 / 1500.0));
  float clip = 1.0 / (1.0 + exp((1540.0 - kelvin) / 32.0));
  return r * vec3(1.0, 2.87 * exp(-4386.0 / kelvin) + 0.6 * clip, 0.003 + 0.12 * clip);
}

// How far a point of the sea plane stands from the middle of the planet's disc, 0 at the middle and 1 at the edge (uLimb: x, z, radius, one over radius).
float limbShare(vec2 xz) {
  return length(xz - uLimb.xy) * uLimb.w;
}

// The cosine of the angle between the view and the ground's own up at that point of the disc: 1 at the middle, 0 at the edge.
float limbCos(vec2 xz) {
  float d = limbShare(xz);
  return sqrt(max(1.0 - d * d, 0.0));
}

// The day at a point of the planet: 1 in full sun, falling toward the night side. The edge of the night lies off the frame on the
// side away from the sun as the rise ends, and creeps in while the titan is held: the planet turns.
float dayAt(vec2 xz) {
  float along = dot(xz, -normalize(uSunDir.xz));
  float edge = 2100.0 - 24.0 * max(uTime - 8.0, 0.0);
  return 1.0 - 0.6 * smoothstep(edge - 250.0, edge + 450.0, along);
}

// ---- the end of the day. Nothing below is reached while uDusk is 0: every caller branches on it. ----
// The sine of the sun's height over the ground at a point: the planet is round, so the sun stands lower the farther a place lies from it.
float sunHeight(vec2 xz) {
  vec2 q = (xz - uTerm.xy) * uTerm.z;
  return mix(uSunDir.y, uSunDir.y * sqrt(1.0 - min(dot(q, q), 0.96)) + dot(uSunDir.xz, q), uTerm.w);
}
// How much of the sun's disc stands over the horizon there: the terminator is a band, not a line.
float sunSeen(float h) {
  return smoothstep(-0.04, 0.1, h);
}
// The colour the air leaves the sun's light at that height: white, gold, then red.
vec3 sunTint(float h) {
  return exp(-vec3(0.01, 0.085, 0.24) * max(1.0 / (max(h, 0.0) + 0.06) - 1.702, 0.0));
}
// The light of the sky there: it outlasts the sun, and is gone a little way into the night.
float skySeen(float h) {
  float s = smoothstep(-0.17, 0.1, h);
  return s * s;
}
// Toward the sun as a place at that height sees it.
vec3 sunToward(float h) {
  float m = max(h, 0.03);
  vec2 along = normalize(uSunDir.xz);
  return normalize(mix(uSunDir, vec3(along.x * sqrt(1.0 - m * m), m, along.y * sqrt(1.0 - m * m)), uTerm.w));
}
// The sun's light on a place: its colour and how much of it is left, by the height of the sun there. day is the flat day's own figure.
vec3 sunLightAt(float h, float day) {
  return uSunColour * mix(mix(vec3(1.0, 0.8, 0.62), vec3(1.0), day) * day, sunTint(h) * sunSeen(h), uTerm.w);
}
// The sky's light on a place, as a share of the day's, and bluer as the sun goes.
vec3 skyLightAt(float h, float day) {
  return mix(vec3(0.5 + 0.5 * day), mix(vec3(0.45, 0.66, 1.15), vec3(1.0), smoothstep(0.0, 0.3, h)) * (0.16 + 0.84 * smoothstep(0.02, 0.5, h)) * skySeen(h), uTerm.w);
}
// The light the air itself throws back toward the eye there, as a share of the day's: it goes with the sun, a little after the ground.
vec3 airLightAt(float h) {
  return mix(vec3(1.0), 0.75 * sunTint(h + 0.03) * sunSeen(h + 0.05) + 0.25 * vec3(0.5, 0.68, 1.1) * skySeen(h) + 0.3 * uMoonColour, uTerm.w);
}
// The exposure of the camera, on the radiance a surface writes.
vec3 exposed(vec3 c) {
  return c * uGain;
}

// Irradiance of the blue sky on a face: the air's scattered light, from above.
vec3 skyIrradiance(vec3 n) {
  return uSkyColour * (0.45 + 0.4 * n.y);
}

// From orbit nothing stands over the ground but cloud, and the surface that draws the cloud's shade passes it as occlusion.
float skyOpen(vec3 p) {
  return 1.0;
}
float contactAt(vec3 p) {
  return 0.0;
}

// The shading every opaque surface uses. v points from the surface to the camera. occ is the share of the sun that reaches the point (cloud shade, relief shade).
vec3 rigShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  float day = dayAt(p.xz);
  if (uDusk > 0.0) {
    float sunH = sunHeight(p.xz);
    vec3 toSun = sunToward(sunH);
    vec3 sunLight = sunLightAt(sunH, day) * occ;
    vec3 eDusk = sunLight * max(dot(n, toSun), 0.0) + skyIrradiance(n) * (0.55 + 0.45 * occ) * skyLightAt(sunH, day);
    // (Under the moon the eye and the camera lose colour: the ground is read nearly grey.)
    vec3 eMoon = uMoonColour * (max(dot(n, uMoonDir), 0.0) * (0.6 + 0.4 * occ) + 0.16);
    vec3 hDusk = normalize(toSun + v);
    float aDusk = max(rough * rough, 0.002);
    float nhDusk = max(dot(n, hDusk), 0.0);
    float dDusk = aDusk * aDusk / (3.14159 * pow(nhDusk * nhDusk * (aDusk * aDusk - 1.0) + 1.0, 2.0));
    float fDusk = 0.02 + 0.98 * pow(1.0 - max(dot(v, hDusk), 0.0), 5.0);
    return (albedo * eDusk + mix(albedo, vec3(dot(albedo, vec3(0.3, 0.55, 0.15))), 0.65) * eMoon) / 3.14159 + sunLight * (dDusk * fDusk * 0.25 * step(0.0, dot(n, toSun)));
  }
  float sun = max(dot(n, uSunDir), 0.0) * occ * day;
  vec3 e = uSunColour * mix(vec3(1.0, 0.8, 0.62), vec3(1.0), day) * sun + skyIrradiance(n) * (0.55 + 0.45 * occ) * (0.5 + 0.5 * day);
  vec3 c = albedo * e / 3.14159;
  vec3 h = normalize(uSunDir + v);
  float a = max(rough * rough, 0.002);
  float nh = max(dot(n, h), 0.0);
  float d = a * a / (3.14159 * pow(nh * nh * (a * a - 1.0) + 1.0, 2.0));
  float f = 0.02 + 0.98 * pow(1.0 - max(dot(v, h), 0.0), 5.0);
  return c + uSunColour * (d * f * 0.25 * occ * step(0.0, dot(n, uSunDir)));
}

// The last line of every built surface: gl_FragColor = vec4(rigOut(colour), 1.0). It blacks the surface when an effect is drawn alone.
vec3 rigOut(vec3 c) {
  if (uDusk > 0.0) return c * uGain * (1.0 - uSolo);
  return c * (1.0 - uSolo);
}`;

export const RIG_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
