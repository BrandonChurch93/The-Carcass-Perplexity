// The gill-plumes in the light of the rig: wine-red wet barbs on dark stems, near black in the heart of the bush, blood red where the low sun comes through.
// The sway is in the vertex shader and is a function of the time alone: it travels from the root to the tip, and the breath of the shaft lifts it.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

/** Where a point of a frond is at a time: shared by the stems, the vanes and the drops that hang from them. */
export const SWAY_GLSL = /* glsl */ `
uniform float uSeconds;
uniform float uSurge;
uniform vec2 uWind;
vec3 swayed(vec3 p, vec3 root, vec4 sway, float tall) {
  float h = sway.x;
  float a = h * h;
  vec2 away = normalize(root.xz);
  float t = uSeconds;
  // The stem: a slow lean and return on the wind, a quicker shiver after it, both later the higher up the stem.
  float slow = sin(t * 1.25 - h * 2.6 + sway.y) + 0.45 * sin(t * 0.53 + sway.y * 1.7);
  float quick = sin(t * 3.1 - h * 5.0 + sway.y * 2.3);
  vec2 push = uWind * (0.035 * slow + 0.012 * quick) * tall * a;
  // The breath of the shaft comes up past the lip: the fronds are thrown up and outward and shake as it passes.
  float shake = 0.6 + 0.4 * sin(t * 6.3 - h * 7.0 + sway.y * 3.1);
  push += away * (0.2 * uSurge * shake * tall * a);
  float lift = (0.11 * uSurge * shake - 0.02 * slow) * tall * a;
  // A barb on the stem: it follows late and trembles, more toward its tip.
  float u = sway.z;
  float own = u * u * tall;
  vec2 trail = uWind * own * (0.014 * sin(t * 2.2 - u * 3.0 + sway.w) + 0.006 * sin(t * 5.1 - u * 6.0 + sway.w * 1.9)) + away * (0.05 * uSurge * shake * own);
  float bob = own * (0.008 * sin(t * 2.9 - u * 3.5 + sway.w * 1.3) + 0.03 * uSurge * shake);
  return p + vec3(push.x + trail.x, lift + bob, push.y + trail.y);
}`;

export const STEM_VERTEX = /* glsl */ `
attribute vec3 aTangent;
attribute vec4 aSide;
attribute vec4 aSway;
attribute vec4 aTint;
attribute vec3 aRoot;
uniform float uPixel;
varying vec3 vWorld;
varying vec3 vAxis;
varying vec3 vAcross;
varying vec4 vSide;
varying vec4 vTint;
${SWAY_GLSL}
void main() {
  float tall = aTint.w;
  vec3 p = swayed(position, aRoot, aSway, tall);
  vec3 ahead = swayed(position + aTangent * 0.02 * tall, aRoot, aSway, tall);
  vec3 axis = normalize(ahead - p);
  vec3 toEye = cameraPosition - p;
  float far = length(toEye);
  vec3 across = normalize(cross(axis, toEye));
  // Never thinner than a pixel: a stem too fine to draw would flicker.
  float wide = max(aSide.y, 0.6 * uPixel * far);
  p += across * aSide.x * wide;
  vWorld = p;
  vAxis = axis;
  vAcross = across;
  vSide = aSide;
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const STEM_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vAxis;
varying vec3 vAcross;
varying vec4 vSide;
varying vec4 vTint;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float e = clamp(vSide.x, -1.0, 1.0);
  // A round rod seen from the side: the normal turns from one edge to the other.
  vec3 facing = normalize(cross(vAcross, vAxis));
  if (dot(facing, v) < 0.0) facing = -facing;
  vec3 n = normalize(vAcross * e * 0.92 + facing * sqrt(max(1.0 - e * e * 0.85, 0.0)));
  float u = vSide.z;
  float reach = vTint.z;
  float tone = vTint.y;
  // Pale wet flesh, knotted, where it leaves the holdfast; wine-dark along its length.
  float mottle = vnoise(vec2(u * 46.0 + tone * 31.0, e * 2.0 + tone * 7.0));
  vec3 flesh = mix(vec3(0.34, 0.2, 0.19), vec3(0.5, 0.36, 0.33), mottle);
  vec3 albedo = mix(flesh, vec3(0.2, 0.035, 0.04), smoothstep(0.04, 0.3, reach + 0.1 * (mottle - 0.5)));
  float occ = mix(0.6, 1.0, vTint.x) * mix(0.5, 1.0, smoothstep(0.0, 0.5, reach));
  vec3 colour = rigShade(vWorld, n, v, albedo, 0.35, occ);
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

export const VANE_VERTEX = /* glsl */ `
attribute vec4 aVane;
attribute vec4 aSway;
attribute vec4 aTint;
attribute vec3 aRoot;
varying vec3 vWorld;
varying vec4 vVane;
varying vec4 vTint;
${SWAY_GLSL}
void main() {
  vec3 p = swayed(position, aRoot, aSway, aTint.w);
  vWorld = p;
  vVane = aVane;
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

// Which pixels of a vane are barb or bead: the same lines in the picture and in the depth the fog reads.
const VANE_TEST = /* glsl */ `
  vec3 toEye = cameraPosition - vWorld;
  float far = length(toEye);
  vec3 v = toEye / far;
  float px = uPixel * far;
  float seed = vVane.z;
  float len = max(vVane.w, 0.001);
  float b = vVane.y;
  // The barbs do not hang straight: each lock of them wanders a little as it goes down.
  float a = vVane.x + len * b * b * (0.9 * (vnoise(vec2(vVane.x * 5.0 + seed, b * 1.6 + seed)) - 0.5) + 0.22 * (vnoise(vec2(vVane.x * 33.0 + seed, b * 6.0 - seed)) - 0.5));
  // Wet barbs gather into locks: the barbs of one lock leave the stem side by side and come together at its point.
  float wide = 0.03 + 0.035 * hash12(vec2(seed, 3.1));
  float cell = floor(a / wide);
  float h1 = hash12(vec2(cell, seed));
  float h2 = hash12(vec2(cell + 17.0, seed * 1.7));
  float centre = (cell + 0.5 + 0.5 * (h1 - 0.5)) * wide;
  float lockLen = 0.3 + 0.7 * h2;
  float t = b / lockLen;
  // A bead of water at the point of a lock, on most of them.
  float bead = length(vec2(a - centre, (b - lockLen) * len + 0.004));
  bool drop = h1 > 0.72 && bead < 0.0036 + 0.5 * px && vTint.z > 0.3 && px < 0.004;
  float gather = (0.45 + 0.3 * h1) * smoothstep(0.05, 1.0, t);
  float fan = 1.0 - gather;
  float rootAt = centre + (a - centre) / fan;
  float spacing = 0.0045;
  float id = floor(rootAt / spacing);
  // Barbs finer than a pixel are not told apart: there the lock has one length and one colour.
  float whole = smoothstep(3.5 * px, 1.5 * px, spacing * fan);
  float hb = mix(hash12(vec2(id, seed)), 0.55, smoothstep(1.6 * px, 0.6 * px, spacing * fan));
  float line = abs(fract(rootAt / spacing) - 0.5) * spacing * fan;
  float thick = max(0.0013 * (1.0 - 0.45 * t), 0.75 * px);
  // A gap between two barbs narrower than a pixel is not a gap the lens can see: there the lock is drawn whole.
  thick = max(thick, 0.5 * spacing * fan - 0.5 * px + 1.6 * px * whole);
  bool barb = t <= 1.0 && rootAt > cell * wide && rootAt < (cell + 1.0) * wide && t < 0.4 + 0.6 * hb + 0.3 * step(abs(rootAt - centre), spacing) && line < thick;
  if (!barb && !drop) discard;
`;

export const VANE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vVane;
varying vec4 vTint;
uniform float uPixel;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
${VANE_TEST}
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(n, v) < 0.0) n = -n;
  float tone = vTint.y;
  float reach = vTint.z;
  float within = vTint.x;
  // Wine red, each barb a little unlike the next; darker at the stem, a little paler and clearer at the hanging end.
  vec3 albedo = mix(vec3(0.07, 0.006, 0.014), vec3(0.2, 0.018, 0.032), 0.45 * tone + 0.3 * hb + 0.25 * h2);
  albedo = mix(albedo, vec3(0.36, 0.07, 0.06), 0.45 * smoothstep(0.6, 1.0, t) * h1);
  // The heart of the bush is near black: the barbs shade each other where they are thick, at the stem and inside.
  float occ = mix(0.26, 1.0, smoothstep(0.0, 0.8, t * lockLen)) * mix(0.2, 1.0, within * within) * mix(0.4, 1.0, smoothstep(0.0, 0.5, reach));
  // Each barb is a round wet hair: dark where it meets the next, so a lock is strands and not a blade.
  float across = clamp(line / max(0.5 * spacing * fan, 1e-5), 0.0, 1.0);
  float strand = mix(1.0, 0.25 + 0.75 * sqrt(1.0 - across * across), smoothstep(0.7 * px, 2.2 * px, spacing * fan));
  occ *= strand;
  albedo *= 0.75 + 0.5 * hb;
  vec3 colour = rigShade(vWorld, n, v, albedo, 0.3, occ);
  // Thin and wet against the low sun: the light comes through blood red, most at the thin edge of the vane and looking toward the sun.
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  float thin = smoothstep(0.35, 1.0, t) * (0.15 + 0.85 * within);
  colour += vec3(1.0, 0.06, 0.05) * uSunColour * (thin * (0.05 + 0.95 * against * against) * 0.4 * sunAt(vWorld));
  if (drop && (!barb || bead < 0.0028 + 0.35 * px)) {
    // The bead: it gathers the sun and the bright fog behind it, and a little of the red it hangs from.
    colour = 0.4 * colour + uSunColour * (0.06 + 3.0 * pow(against, 8.0)) * sunAt(vWorld) + 0.35 * skyRadiance(vec3(-v.x, 0.25, -v.z));
  }
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

/** The vanes cut holes: this is all the engine needs to lay their depth before the picture. */
export const VANE_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vVane;
varying vec4 vTint;
uniform float uPixel;
${NOISE_GLSL}
void main() {
${VANE_TEST}  gl_FragColor = vec4(0.0);
}`;
