// The gill-plumes in the light of the rig: wine-red wet filaments on pale fleshy stems, lit from behind by the low sun.
// The sway is in the vertex shader and is a function of the time alone: it travels from the root to the tip, and the breath of the shaft lifts it.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

/** Where a point of a strand is at a time: shared by the strands and by the drops that hang from their tips. */
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
  // The filament on the stem: its own lag and a small tremble that grows to its tip.
  float u = sway.z;
  float own = u * u * tall;
  vec2 trail = uWind * own * (0.014 * sin(t * 2.2 - u * 3.0 + sway.w) + 0.006 * sin(t * 5.1 - u * 6.0 + sway.w * 1.9)) + away * (0.05 * uSurge * shake * own);
  float bob = own * (0.008 * sin(t * 2.9 - u * 3.5 + sway.w * 1.3) + 0.03 * uSurge * shake);
  return p + vec3(push.x + trail.x, lift + bob, push.y + trail.y);
}`;

export const VERTEX = /* glsl */ `
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
varying float vThin;
varying float vAbove;
${SWAY_GLSL}
void main() {
  float tall = aTint.w;
  vec3 p = swayed(position, aRoot, aSway, tall);
  vec3 ahead = swayed(position + aTangent * 0.02 * tall, aRoot, aSway + vec4(0.0, 0.0, aSway.z > 0.0 ? 0.03 : 0.0, 0.0), tall);
  vec3 axis = normalize(ahead - p);
  vec3 toEye = cameraPosition - p;
  float far = length(toEye);
  vec3 across = normalize(cross(axis, toEye));
  // Never thinner than most of a pixel: a filament too fine to draw is drawn at that width and faded instead, so it does not flicker.
  float least = 0.6 * uPixel * far;
  float wide = max(aSide.y, least);
  vThin = clamp(aSide.y / least, 0.0, 1.0);
  p += across * aSide.x * wide;
  vWorld = p;
  vAxis = axis;
  vAcross = across;
  vSide = aSide;
  vTint = aTint;
  vAbove = position.y - aRoot.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vAxis;
varying vec3 vAcross;
varying vec4 vSide;
varying vec4 vTint;
varying float vThin;
varying float vAbove;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 toEye = cameraPosition - vWorld;
  vec3 v = normalize(toEye);
  float e = clamp(vSide.x, -1.0, 1.0);
  // A round rod seen from the side: the normal turns from one edge to the other.
  vec3 facing = normalize(cross(vAcross, vAxis));
  if (dot(facing, v) < 0.0) facing = -facing;
  vec3 n = normalize(vAcross * e * 0.92 + facing * sqrt(max(1.0 - e * e * 0.85, 0.0)));
  float kind = vSide.w;
  float u = vSide.z;
  float reach = vTint.z;
  float tone = vTint.y;
  float open = vTint.x;
  vec3 albedo;
  float rough;
  float through;
  if (kind < 0.5) {
    // A stem: pale wet flesh at the holdfast, wine-dark along it.
    float mottle = vnoise(vec2(u * 40.0 + tone * 31.0, e * 2.0 + tone * 7.0));
    vec3 flesh = mix(vec3(0.5, 0.33, 0.3), vec3(0.66, 0.5, 0.45), mottle);
    albedo = mix(flesh, vec3(0.2, 0.035, 0.045), smoothstep(0.08, 0.5, reach + 0.12 * (mottle - 0.5)));
    rough = 0.38;
    through = 0.25 * smoothstep(0.2, 0.7, reach);
  } else {
    // A filament: crimson to wine, paler and clearer toward the hanging tip.
    albedo = mix(vec3(0.3, 0.035, 0.05), vec3(0.47, 0.06, 0.07), tone);
    albedo = mix(albedo, vec3(0.55, 0.36, 0.3), smoothstep(0.55, 1.0, u) * smoothstep(0.6, 1.0, reach) * 0.8);
    rough = 0.32;
    through = 1.0;
  }
  // Inside the bush the strands shade each other, and near the rock the bush shades itself.
  float occ = mix(0.35, 1.0, open) * mix(0.45, 1.0, smoothstep(0.0, 0.5, reach));
  vec3 colour = rigShade(vWorld, n, v, albedo, rough, occ);
  // Wet and thin against the sun: the light comes through red, strongest looking toward the sun.
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  float wrap = 0.35 + 0.65 * against * against;
  vec3 glow = vec3(1.0, 0.16, 0.1) * mix(vec3(1.0), vec3(1.0, 0.55, 0.45), smoothstep(0.6, 1.0, u) * step(0.5, kind));
  colour += glow * uSunColour * (through * 0.42 * wrap * sunAt(vWorld) * (0.35 + 0.65 * open));
  // A strand drawn wider than it is counts for less: toward the colour of what is behind it, which is mostly more of the bush.
  colour *= mix(0.55, 1.0, vThin);
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;
