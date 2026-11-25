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
uniform float uViewKm;`;

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

// Irradiance of the blue sky on a face: the air's scattered light, from above.
vec3 skyIrradiance(vec3 n) {
  return uSkyColour * (0.6 + 0.4 * n.y);
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
  float sun = max(dot(n, uSunDir), 0.0) * occ;
  vec3 e = uSunColour * sun + skyIrradiance(n) * (0.55 + 0.45 * occ);
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
  return c * (1.0 - uSolo);
}`;

export const RIG_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
