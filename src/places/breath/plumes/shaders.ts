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
  // Wet and round against the bright fog: a thin warm edge on the side of the sun, and the fog's own light in the shade.
  float edge_ = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0) * clamp(0.3 + dot(n, uSunDir), 0.0, 1.0);
  colour += uSunColour * vec3(0.9, 0.35, 0.28) * (0.5 * edge_ * sunAt(vWorld)) + albedo * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.5 / 3.14159) * occ;
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

// Which pixels of a vane are barb: read from the picture of a frond (its relief stands on black), the same in the picture and in the depth the fog reads.
const VANE_TEST = /* glsl */ `
  vec3 toEye = cameraPosition - vWorld;
  float far = length(toEye);
  vec3 v = toEye / far;
  float px = uPixel * far;
  // Along the stem from the root to the tip; across it from the stem out to the ends of the barbs, on the side this vane is.
  vec2 at = vec2(0.035 + 0.945 * vVane.x, 0.5 + 0.475 * vVane.y * vVane.w);
  float relief = texture2D(tFrondH, at).r;
  // Far off the finest barbs are thinner than a pixel and would go: the frond is kept as full as it is near.
  float cut = mix(0.3, 0.05, smoothstep(0.001, 0.01, px));
  if (relief < cut) discard;
`;

export const VANE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vVane;
varying vec4 vTint;
uniform float uPixel;
uniform sampler2D tFrond;
uniform sampler2D tFrondH;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
${VANE_TEST}
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(n, v) < 0.0) n = -n;
  float tone = vTint.y;
  float reach = vTint.z;
  float within = vTint.x;
  // The colour is the picture's: wet wine-red barbs, pale and fleshy at the stem, each frond a little darker or lighter than the next.
  vec3 told = texture2D(tFrond, at).rgb;
  vec3 albedo = told * (0.7 + 0.5 * tone);
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.3, 0.5, 0.2))) * vec3(1.2, 0.5, 0.45), 0.25);
  // How thick the frond is here: its heart is many barbs deep, its edge is single hairs.
  float body = smoothstep(cut, 0.7, relief);
  // The heart of the bush is near black: the barbs shade each other where they are thick, at the stem and inside.
  float occ = mix(1.0, 0.45, body) * mix(0.3, 1.0, within * within) * mix(0.55, 1.0, smoothstep(0.0, 0.5, reach));
  // The relief of the picture turns the light a little: a lock is strands and not a blade.
  float lift = (texture2D(tFrondH, at + vec2(0.0015, 0.0)).r - relief) + (texture2D(tFrondH, at + vec2(0.0, 0.004)).r - relief);
  n = normalize(n + 1.6 * lift * normalize(vec3(uSunDir.x, 0.4, uSunDir.z)));
  vec3 colour = rigShade(vWorld, n, v, albedo, 0.3, occ);
  // Thin and wet against the low sun: the light comes through blood red, most through the single hairs at the edge and looking toward the sun.
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  float thin = (1.0 - 0.75 * body) * (0.15 + 0.85 * within);
  float lit = sunAt(vWorld);
  colour += mix(vec3(1.0, 0.1, 0.06), vec3(1.0, 0.5, 0.25), (1.0 - body) * against) * uSunColour * (thin * (0.06 + 0.94 * against * against) * 0.3 * lit) * (0.3 + 2.0 * dot(told, vec3(0.33)));
  // Wet: here and there a barb turns the sun to the lens.
  float glint = smoothstep(0.82, 0.97, vnoise(at * vec2(900.0, 340.0) + vVane.z)) * smoothstep(0.004, 0.0012, px);
  colour += uSunColour * glint * (0.03 + 0.5 * pow(against, 6.0)) * lit;
  // The fog behind and round it is bright: it fills the red from every side, so the shade in the bush is wine and not black.
  colour += albedo * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.22 / 3.14159) * (0.35 + 0.65 * occ);
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

/** The vanes cut holes: this is all the engine needs to lay their depth before the picture. */
export const VANE_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vVane;
varying vec4 vTint;
uniform float uPixel;
uniform sampler2D tFrondH;
void main() {
${VANE_TEST}  gl_FragColor = vec4(0.0);
}`;
