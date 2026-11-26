// The gill-plumes in the light of the rig: wine-red wet threads on dark stems, near black in the heart of the bush, blood red where the low sun comes through.
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
  vec2 push = uWind * (0.07 * slow + 0.024 * quick) * tall * a;
  // The breath of the shaft comes up past the lip: the fronds are thrown up and outward and shake as it passes.
  float shake = 0.6 + 0.4 * sin(t * 6.3 - h * 7.0 + sway.y * 3.1);
  push += away * (0.2 * uSurge * shake * tall * a);
  float lift = (0.11 * uSurge * shake - 0.02 * slow) * tall * a;
  // A barb on the stem: it follows late and trembles, more toward its tip.
  float u = sway.z;
  float own = u * u * tall;
  vec2 trail = uWind * own * (0.03 * sin(t * 2.2 - u * 3.0 + sway.w) + 0.012 * sin(t * 5.1 - u * 6.0 + sway.w * 1.9)) + away * (0.05 * uSurge * shake * own);
  float bob = own * (0.008 * sin(t * 2.9 - u * 3.5 + sway.w * 1.3) + 0.03 * uSurge * shake);
  return p + vec3(push.x + trail.x, lift + bob, push.y + trail.y);
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

// Which pixels of a spray are thread: read from the cover of the picture, the same in the picture and in the depth the fog reads.
const VANE_TEST = /* glsl */ `
  vec3 toEye = cameraPosition - vWorld;
  float far = length(toEye);
  vec3 v = toEye / far;
  float px = uPixel * far;
  vec2 at = vVane.xy;
  vec3 told = texture2D(tPlume, at).rgb;
  // The picture stands on black: between its threads it is dark, and there the spray is open.
  float cover = texture2D(tPlumeA, at).r * smoothstep(0.035, 0.12, told.r);
  // Far off the threads are thinner than a pixel and would go: the spray is kept as full as it is near.
  float cut = mix(0.5, 0.2, smoothstep(0.002, 0.012, px));
  if (cover < cut) discard;
`;

export const VANE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vVane;
varying vec4 vTint;
uniform float uPixel;
uniform sampler2D tPlume;
uniform sampler2D tPlumeA;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
${VANE_TEST}
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(n, v) < 0.0) n = -n;
  float tone = vTint.y;
  float reach = vTint.z;
  float within = vTint.x;
  // Wet, it is darker than the picture of it and deeper in the red: the pale of the stem stays, the mid tones go to wine.
  vec3 albedo = pow(told, vec3(1.2)) * vec3(1.3, 0.52, 0.58) * (0.6 + 0.5 * tone);
  // The drops that hang at the ends of the threads are water, not red.
  float most = max(told.r, max(told.g, told.b));
  float drop = smoothstep(0.4, 0.2, (most - min(told.r, min(told.g, told.b))) / max(most, 0.01)) * smoothstep(0.3, 0.55, most);
  albedo = mix(albedo, vec3(0.5, 0.47, 0.44), drop);
  // How thick the spray is here: its heart is many threads deep, its edge is single ones.
  float body = smoothstep(0.25, 0.85, texture2D(tPlumeA, at, 4.0).r);
  // The heart of the bush is near black: the threads shade each other where they are thick, at the stem and inside.
  float occ = mix(1.0, 0.45, body) * mix(0.22, 1.0, within) * mix(0.45, 1.0, smoothstep(0.05, 0.5, reach));
  // A thread is round and hangs: what light it turns is from above and from the side of the sun, not from the face of the sheet.
  float fine = dot(told, vec3(0.5, 0.3, 0.2));
  n = normalize(n * 0.5 + vec3(0.0, 0.55, 0.0) + (fine - 0.25) * 1.4 * normalize(vec3(uSunDir.x, 0.3, uSunDir.z)));
  vec3 colour = rigShade(vWorld, n, v, albedo, 0.3, occ);
  // Thin and wet against the low sun: the light comes through blood red, most through the single threads at the edge and looking toward the sun.
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  float lit = sunAt(vWorld);
  float hair = (1.0 - body) * (1.0 - body);
  float thin = (0.12 + 0.88 * hair) * (0.25 + 0.75 * within);
  colour += mix(vec3(0.8, 0.05, 0.03), vec3(1.0, 0.24, 0.1), hair * against) * uSunColour * (thin * (0.05 + 0.95 * against * against) * 0.22 * lit) * (0.3 + 2.0 * dot(told, vec3(0.33)));
  // Wet: here and there a thread turns the sun to the lens.
  float glint = smoothstep(0.95, 0.995, vnoise(at * vec2(700.0, 500.0) + vVane.z)) * smoothstep(0.003, 0.001, px);
  colour += uSunColour * glint * (0.02 + 0.4 * pow(against, 6.0)) * lit * (0.3 + 0.7 * within);
  // The fog behind and round it is bright: it fills the red from every side, so the shade in the bush is wine and not black.
  colour += albedo * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.3 / 3.14159) * (0.2 + 0.8 * occ);
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

/** The sprays cut holes: this is all the engine needs to lay their depth before the picture. */
export const VANE_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vVane;
varying vec4 vTint;
uniform float uPixel;
uniform sampler2D tPlume;
uniform sampler2D tPlumeA;
void main() {
${VANE_TEST}  gl_FragColor = vec4(0.0);
}`;
