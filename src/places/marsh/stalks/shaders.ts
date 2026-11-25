// The stalks of the marsh: salt-crusted tubes, each with a crimson plume it can draw back into itself, and the small insects round them.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

/** How far a plume is out, 0 drawn in to 1 spread. kind: 0 open, 1 a bud, 2 broken and empty, 3 half out. */
const OPEN_GLSL = /* glsl */ `
uniform float uSeconds;
float plumeOpen(float kind, float phase, float seed) {
  float base = kind < 0.5 ? 1.0 : kind < 1.5 ? 0.0 : kind < 2.5 ? 0.0 : 0.5;
  float period = 11.0 + 9.0 * fract(seed * 7.31);
  float c = fract(uSeconds / period + fract(phase * 0.159 + seed * 3.7));
  // It snaps shut, stays shut a while and feels its way out again. One in three does it.
  float shut = smoothstep(0.0, 0.025, c) * (1.0 - smoothstep(0.14, 0.5, c)) * step(fract(seed * 13.7), 0.34);
  float breathe = 0.04 * sin(uSeconds * 0.9 + phase);
  return clamp(base * (1.0 - 0.88 * shut) + breathe * (0.5 + base), 0.0, 1.0);
}`;

export const STEM_VERTEX = /* glsl */ `
attribute float aSkin;
attribute vec4 aBase;
attribute vec4 aAxis;
attribute vec4 aKind;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vCoord;
varying vec4 vKind;
${OPEN_GLSL}
float wob(float a, float s) {
  return sin(a * 3.0 + s * 9.0) * 0.5 + sin(a * 7.0 + s * 23.0) * 0.3 + sin(a * 13.0 + s * 41.0) * 0.2;
}
vec3 stemPoint(float a, float v) {
  float h = aBase.w;
  float R = aAxis.w;
  float kind = aKind.x;
  float seed = aKind.w;
  float lean = aAxis.z + 0.01 * sin(uSeconds * 0.7 + aKind.y);
  float y;
  float r;
  if (aSkin < 0.5) {
    // The tube: stacked rings, each flaring at its upper lip, and a ragged collar at the mouth.
    y = v * h;
    float sp = 0.14 * aKind.z;
    float q = fract(y / sp + seed);
    float flare = smoothstep(0.5, 0.92, q) * (1.0 - smoothstep(0.92, 1.0, q));
    float collar = smoothstep(h - 0.1, h, y);
    r = R * (1.12 - 0.12 * v) * (1.0 + 0.13 * flare * (0.6 + 0.5 * wob(a, floor(y / sp + seed))) + 0.035 * wob(a + y * 3.0, seed));
    r *= 1.0 + collar * (0.2 + 0.16 * wob(a, seed + 2.0));
    float torn = kind > 1.5 && kind < 2.5 ? 0.13 : 0.035;
    y += collar * torn * wob(a * 0.7, seed + 5.0);
    // The foot spreads into the crust.
    r *= 1.0 + 0.5 * exp(-y / 0.09);
  } else if (aSkin < 1.5) {
    // The inside of the mouth.
    float torn = kind > 1.5 && kind < 2.5 ? 0.13 : 0.035;
    y = h + torn * wob(a * 0.7, seed + 5.0) * (1.0 - v) - 0.4 * v;
    r = R * mix(1.0 + 0.2 + 0.16 * wob(a, seed + 2.0), 0.7, smoothstep(0.0, 0.2, v));
  } else {
    // The body of the plume in the mouth: a pointed bud when it is drawn in, a low throat when it is out.
    float open = plumeOpen(kind, aKind.y, seed);
    float len = (kind > 1.5 && kind < 2.5 ? 0.0 : 1.0) * aKind.z * mix(0.5, 0.22, open);
    y = h - 0.06 + len * v;
    r = R * (kind > 1.5 && kind < 2.5 ? 0.0 : 1.0) * mix(1.45, 0.8, open) * pow(max(sin(3.14159 * pow(mix(0.12, 1.0, v), 0.8)), 0.0), 0.8) * (1.0 + 0.06 * sin(a * 9.0 + v * 4.0));
  }
  vec3 A = vec3(aAxis.x * sin(lean), cos(lean), aAxis.y * sin(lean));
  vec3 U = vec3(aAxis.x * cos(lean), -sin(lean), aAxis.y * cos(lean));
  vec3 W = vec3(-aAxis.y, 0.0, aAxis.x);
  return aBase.xyz + A * y + (U * cos(a) + W * sin(a)) * r;
}
void main() {
  float a = position.x;
  float v = position.y;
  vec3 p = stemPoint(a, v);
  vec3 da = stemPoint(a + 0.05, v) - p;
  vec3 dv = stemPoint(a, v + 0.004) - p;
  vec3 n = normalize(cross(dv, da));
  if (aSkin > 0.5 && aSkin < 1.5) n = -n;
  vWorld = p;
  vNormal = n;
  vCoord = vec4(a, v * aBase.w, aSkin, v);
  vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const STEM_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vCoord;
varying vec4 vKind;
uniform sampler2D tSalt;
uniform sampler2D tSaltNh;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float seed = vKind.w;
  float skin = vCoord.z;
  vec3 c;
  if (skin < 0.5) {
    float y = vCoord.y;
    float sp = 0.14 * vKind.z;
    float q = fract(y / sp + seed);
    vec2 uv = vec2(vCoord.x * 0.16, y) / 0.42 + seed * vec2(3.1, 7.7);
    vec3 salt = texture2D(tSalt, uv).rgb;
    vec3 nh = texture2D(tSaltNh, uv).rgb;
    float patchy = fbm(vec2(vCoord.x * 1.3, y * 3.0) + seed * 11.0);
    // Under the salt the tube is horn brown; it shows where the crust has flaked and under each lip, where the brine has run and left rust.
    float bare = smoothstep(0.5, 0.7, patchy + 0.3 * (0.5 - nh.b));
    float under = (1.0 - smoothstep(0.0, 0.3, q)) + 0.6 * smoothstep(0.9, 1.0, q);
    vec3 horn = vec3(0.3, 0.19, 0.12) * (0.6 + 0.8 * nh.b);
    vec3 rust = vec3(0.42, 0.16, 0.07);
    vec3 albedo = salt * 2.0 + 0.1;
    albedo = mix(albedo, horn, 0.75 * bare);
    albedo = mix(albedo, rust, clamp(under * (0.25 + 0.75 * smoothstep(0.35, 0.7, fbm(vec2(vCoord.x * 2.0, y * 9.0) + seed))), 0.0, 0.8));
    // The foot stands in red brine and mud.
    float wet = 1.0 - smoothstep(0.1, 0.45 + 0.3 * patchy, vWorld.y);
    albedo = mix(albedo, albedo * vec3(0.5, 0.2, 0.16) + vec3(0.03, 0.005, 0.004), wet);
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(cross(up, n) + 1e-5);
    vec3 B = cross(n, T);
    n = normalize(n - (T * (nh.r - 0.5) + B * (nh.g - 0.5)) * 1.6);
    float occ = (0.55 + 0.45 * smoothstep(0.0, 0.35, q)) * (0.75 + 0.25 * nh.b) * (0.6 + 0.4 * smoothstep(0.0, 0.25, y));
    c = rigShade(vWorld, n, v, albedo, mix(0.95, 0.4, wet), occ);
  } else if (skin < 1.5) {
    float down = vCoord.w;
    c = rigShade(vWorld, n, v, vec3(0.16, 0.08, 0.06), 0.9, 0.5 * (1.0 - smoothstep(0.0, 0.5, down)));
  } else {
    float groove = 0.6 + 0.4 * abs(sin(vCoord.x * 12.0 + vCoord.w * 3.0));
    vec3 albedo = mix(vec3(0.2, 0.02, 0.035), vec3(0.42, 0.06, 0.08), vCoord.w) * groove;
    c = rigShade(vWorld, n, v, albedo, 0.45, 0.5 + 0.5 * vCoord.w);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const PLUME_VERTEX = /* glsl */ `
attribute vec4 aTop;
attribute vec4 aAx;
attribute vec4 aFil;
attribute vec4 aMore;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLook;
${OPEN_GLSL}
vec3 filamentPoint(float u, float open, vec3 axis, vec3 radial) {
  float L = aFil.z;
  float R = aTop.w;
  float spread = aFil.y;
  float seed = aFil.w;
  // Out: it leaves the mouth along the tube, arches over and hangs. In: it lies along the bud.
  vec3 d0 = normalize(axis * (1.0 - 0.45 * spread) + radial * (0.2 + 1.1 * spread));
  float droop = (0.22 + 0.7 * spread) * (0.8 + 0.4 * fract(seed * 5.3));
  vec3 outP = radial * R * 0.55 + d0 * L * u - vec3(0.0, 1.0, 0.0) * L * droop * u * u + radial * L * 0.12 * spread * u * u * u;
  float bulge = sin(3.14159 * pow(mix(0.12, 1.0, u), 0.8));
  vec3 inP = axis * (0.5 * aMore.z * u - 0.05) + radial * R * 1.5 * bulge;
  vec3 p = mix(inP, outP, open);
  // The air moves it: the whole plume leans and comes back, and each tip shivers by itself.
  float reach = open * u * u;
  float gust = sin(uSeconds * 1.1 + aAx.w + dot(aTop.xz, vec2(0.21, 0.17))) + 0.5 * sin(uSeconds * 2.3 + aAx.w * 1.7);
  p += vec3(0.8, 0.0, 0.6) * (0.045 * L * reach * gust);
  p += (radial * sin(uSeconds * 4.1 + seed * 40.0) + axis * cos(uSeconds * 3.3 + seed * 17.0)) * (0.012 * L * reach * u);
  return aTop.xyz + p;
}
void main() {
  vec3 axis = aAx.xyz;
  vec3 W = normalize(cross(axis, vec3(0.0, 1.0, 0.0) + vec3(0.0013, 0.0, 0.0021)));
  vec3 U = cross(W, axis);
  vec3 radial = U * cos(aFil.x) + W * sin(aFil.x);
  float open = plumeOpen(aMore.x, aAx.w, aMore.y);
  float u = position.y;
  vec3 p = filamentPoint(u, open, axis, radial);
  vec3 t = normalize(filamentPoint(u + 0.03, open, axis, radial) - p);
  vec3 toCam = normalize(cameraPosition - p);
  vec3 side = normalize(cross(t, toCam));
  float wide = aMore.w * (1.0 - 0.8 * u * u) * (0.35 + 0.65 * smoothstep(0.0, 0.12, u));
  p += side * position.x * wide;
  vWorld = p;
  // Round across its width.
  vNormal = normalize(cross(side, t) + side * position.x * 0.9);
  vLook = vec3(u, aFil.w, open);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const PLUME_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLook;
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float u = vLook.x;
  float tone = fract(vLook.y * 7.7);
  vec3 albedo = mix(vec3(0.17, 0.018, 0.03), vec3(0.5, 0.075, 0.105), smoothstep(0.0, 0.8, u) * (0.6 + 0.4 * tone));
  albedo = mix(albedo, vec3(0.6, 0.3, 0.3), 0.35 * smoothstep(0.85, 1.0, u));
  float occ = mix(0.3, 1.0, smoothstep(0.0, 0.55, u)) * mix(0.6, 1.0, vLook.z);
  vec3 c = rigShade(vWorld, n, v, albedo, 0.4, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

/** Where an insect is: a slow wander round its home with quicker darts on it. The same lines serve its body and its wings. */
const INSECT_GLSL = /* glsl */ `
attribute vec4 aHome;
attribute vec4 aRate;
attribute vec4 aPhase;
uniform float uSeconds;
vec3 insectAt(float t) {
  float reach = aHome.w;
  return aHome.xyz + vec3(
    reach * sin(aRate.x * t + aPhase.x) + 0.3 * sin(0.4 * t + aPhase.y) + 0.05 * sin(7.3 * t + aPhase.z),
    0.5 * reach * sin(aRate.y * t + aPhase.y) + 0.03 * sin(9.1 * t + aPhase.x),
    reach * cos(aRate.z * t + aPhase.z) + 0.3 * cos(0.33 * t + aPhase.x) + 0.05 * cos(6.7 * t + aPhase.y));
}
vec3 insectPlace(vec3 local, out vec3 fwd, out vec3 right, out vec3 up) {
  vec3 at = insectAt(uSeconds);
  vec3 vel = insectAt(uSeconds + 0.05) - insectAt(uSeconds - 0.05);
  fwd = normalize(vel + vec3(1e-4, 0.0, 0.0));
  // It hangs tail down as it flies, the way a mayfly does.
  fwd = normalize(vec3(fwd.x, fwd.y * 0.4 + 0.35, fwd.z));
  right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  up = cross(right, fwd);
  return at + (fwd * local.x + up * local.y + right * local.z) * aPhase.w;
}`;

export const INSECT_VERTEX = /* glsl */ `
${INSECT_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTone;
void main() {
  vec3 fwd;
  vec3 right;
  vec3 up;
  vec3 p = insectPlace(position, fwd, right, up);
  vWorld = p;
  vNormal = normalize(fwd * normal.x + up * normal.y + right * normal.z);
  vTone = uv.x;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const INSECT_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTone;
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 albedo = mix(vec3(0.16, 0.11, 0.07), vec3(0.42, 0.33, 0.2), vTone);
  vec3 c = rigShade(vWorld, n, v, albedo, 0.5, 1.0);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const WING_VERTEX = /* glsl */ `
${INSECT_GLSL}
varying vec3 vWorld;
varying vec2 vWing;
void main() {
  vec3 fwd;
  vec3 right;
  vec3 up;
  // position: x along the body, y the length of the wing from its root, z which side and which of the pair.
  float side = sign(position.z);
  float beat = sin(uSeconds * (38.0 + 14.0 * fract(aPhase.x)) + aPhase.y + abs(position.z) * 1.3);
  float ang = 0.35 + 0.75 * beat;
  vec3 local = vec3(position.x - 0.12 * position.y, position.y * sin(ang), side * position.y * cos(ang));
  vec3 p = insectPlace(local, fwd, right, up);
  vWorld = p;
  vWing = vec2(uv.x, uv.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const WING_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vWing;
${RIG_GLSL}
void main() {
  // A clear wing with a few dark veins: it takes the white of the sky and lets most of what is behind it through.
  float vein = smoothstep(0.75, 1.0, abs(sin(vWing.x * 16.0 + vWing.y * 5.0)));
  float edge = smoothstep(0.0, 0.25, vWing.x) * smoothstep(1.0, 0.75, vWing.x) * smoothstep(1.0, 0.8, vWing.y);
  vec3 c = mix(skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 * 0.75, vec3(0.05, 0.035, 0.03), vein) * skyOpen(vWorld);
  float a = (0.3 + 0.4 * vein) * edge * (1.0 - uSolo);
  gl_FragColor = vec4(c * (1.0 - uSolo), a);
}`;
