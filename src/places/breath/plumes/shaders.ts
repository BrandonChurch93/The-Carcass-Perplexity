// The gill-plumes in the light of the rig: wine-dark wet threads on pale stems, near black in the heart of the bush, blood red where the
// low sun comes through. The sway is in the vertex shader and is a function of the time alone: the whole bush leans and returns on gusts
// that travel over the shelf, each frond nods later the further out along it, each barb trembles, and the breath of the shaft lifts it.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

/** Where a point of a plume is at a time. `sway`: how far along its frond, the bush's phase, how far out on a barb, the frond's phase.
 *  `reach` is its distance from the root as a part of the bush's height. Shared by the ribbons, the stems and the drops. */
export const SWAY_GLSL = /* glsl */ `
uniform float uSeconds;
uniform float uSurge;
uniform vec2 uWind;
vec3 swayedAt(vec3 p, vec3 root, vec4 sway, float reach, float tall, float t, float surge) {
  float r = max(reach - 0.12, 0.0);
  float a = r * r * 1.3;
  vec2 away = normalize(root.xz);
  // The wind comes in gusts that travel over the shelf: no two bushes lean together.
  float gust = 0.45 + 1.1 * (0.5 + 0.5 * sin(dot(root.xz, vec2(0.23, 0.17)) - t * 1.1)) * (0.5 + 0.5 * sin(dot(root.xz, vec2(-0.071, 0.113)) - t * 0.37 + 1.3));
  // The bush: a slow lean and return, a quicker shiver after it, both later the further from the root.
  float slow = sin(t * 1.15 - r * 2.4 + sway.y) + 0.45 * sin(t * 0.49 + sway.y * 1.7);
  float quick = sin(t * 2.9 - r * 4.6 + sway.y * 2.3);
  vec2 push = uWind * (0.05 * slow + 0.018 * quick) * gust * tall * a;
  float lift = -0.018 * slow * gust * tall * a;
  // The frond: it nods on its own stem, the nod running out to the tip.
  float u = sway.x;
  float o = u * u * tall * gust;
  float nod = 0.034 * sin(t * 1.7 - u * 3.2 + sway.w) + 0.013 * sin(t * 3.6 - u * 5.5 + sway.w * 1.7);
  push += uWind * (0.7 * nod * o);
  lift += nod * o;
  // The barb: it trembles, more toward its end and toward the tip of the frond.
  float b = sway.z * sway.z * (0.35 + 0.65 * u) * tall;
  float flutter = 0.011 * sin(t * 4.4 - u * 7.0 + sway.w * 3.1 + sway.z * 2.0) + 0.006 * sin(t * 7.7 - u * 11.0 + sway.w * 5.3);
  lift += flutter * b * gust;
  push += uWind * (0.6 * flutter * b * gust);
  // The breath of the shaft comes up past the lip: the fronds are thrown up and outward and shake as it passes. Between its breaths the
  // warm air still rises past the lip.
  float shake = 0.6 + 0.4 * sin(t * 6.3 - r * 7.0 + sway.y * 3.1);
  float rise = surge * shake + 0.16 * sin(t * 2.3 - r * 3.0 + sway.y * 1.9);
  push += away * (0.17 * rise * tall * (a + 0.4 * u * u));
  lift += 0.1 * rise * tall * (a + 0.5 * u * u + 0.3 * b / tall);
  return p + vec3(push.x, lift, push.y);
}
vec3 swayed(vec3 p, vec3 root, vec4 sway, float reach, float tall) {
  return swayedAt(p, root, sway, reach, tall, uSeconds, uSurge);
}`;

export const VANE_VERTEX = /* glsl */ `
attribute vec4 aVane;
attribute vec4 aSway;
attribute vec4 aTint;
attribute vec3 aRoot;
varying vec3 vWorld;
varying vec4 vVane;
varying vec4 vTint;
varying float vAlong;
${SWAY_GLSL}
void main() {
  vec3 p = swayed(position, aRoot, aSway, aTint.z, aTint.w);
  vWorld = p;
  vVane = aVane;
  vTint = aTint;
  vAlong = aSway.x;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

// Which pixels of a ribbon are thread: read from the cover made for it (plumes/frond-a.png, red: a distance to the edge of a thread, 0.5 at
// the edge, a sixteenth to a pixel of the picture), the same in the picture and in the depth the fog reads.
const VANE_TEST = /* glsl */ `
  vec3 toEye = cameraPosition - vWorld;
  float far = length(toEye);
  vec3 v = toEye / far;
  float px = uPixel * far;
  vec2 at = vVane.xy;
  // Two pictures of a frond: the full one, and (4th of the vane 2 or more) the sparse ragged one.
  bool ragged = vVane.w > 1.5;
  vec4 made = ragged ? texture2D(tFrondBA, at) : texture2D(tFrondA, at);
  float deadOne = mod(vVane.w, 2.0);
  float cover = made.r;
  // The ragged one gives the outline of a frond and the full one its threads: inside the outline it is combed into single threads,
  // never a blade.
  if (ragged) cover = min(cover, texture2D(tFrondA, vec2(at.x * 0.93 + 0.03, 0.5 + (at.y - 0.5) * 0.9)).r + 0.1 * smoothstep(0.62, 0.8, made.r));
  // Far off the threads are thinner than a pixel and would go: there each is cut a little outside its edge, and the frond stays as full as it is near.
  float cut = mix(0.5, 0.26, smoothstep(0.004, 0.024, px));
  // The dead ones are broken short and half gone.
  if (deadOne > 0.5 && vnoise(at * vec2(14.0, 5.0) + vVane.z) > 0.52) discard;
  if (cover < cut) discard;
`;

export const VANE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vVane;
varying vec4 vTint;
varying float vAlong;
uniform float uPixel;
uniform sampler2D tFrond;
uniform sampler2D tFrondA;
uniform sampler2D tFrondB;
uniform sampler2D tFrondBA;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
${VANE_TEST}
  vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(n, v) < 0.0) n = -n;
  float tone = vTint.y;
  float reach = vTint.z;
  float within = vTint.x;
  vec3 told = ragged ? texture2D(tFrondB, at).rgb : texture2D(tFrond, at).rgb;
  float light = dot(told, vec3(0.4, 0.35, 0.25));
  // Wet, it is darker than the picture of it and deeper in the red: wine, and the pale of the stem stays pale.
  float pale = smoothstep(0.32, 0.6, min(told.g, told.b) / max(told.r, 0.02));
  vec3 albedo = mix(pow(told, vec3(1.45)) * vec3(0.66, 0.58, 0.62), told * vec3(0.64, 0.58, 0.56), pale) * (0.7 + 0.5 * tone);
  // The ends of the threads are bleached: pale, a little pink.
  float tip = smoothstep(0.72, 1.0, vAlong) * (1.0 - made.g) * smoothstep(0.4, 0.9, tone + 0.4 * vnoise(at * 40.0 + vVane.z));
  albedo = mix(albedo, vec3(0.46, 0.25, 0.2), 0.4 * tip);
  // The dead ones are brown and dry.
  float dead = step(0.5, deadOne);
  albedo = mix(albedo, light * vec3(0.55, 0.36, 0.24), dead);
  // How thick the growth is here: where the barbs meet the stem it is many threads deep, at its ends single ones.
  float body = smoothstep(0.25, 0.75, made.g) * (ragged ? 0.5 : 1.0);
  // The heart of the bush is near black: the fronds shade each other where they cross, at the root and inside.
  float occ = mix(1.0, 0.3, body) * mix(0.14, 1.0, within) * mix(0.3, 1.0, smoothstep(0.05, 0.5, reach));
  // A thread is round and hangs: what light it turns is from above and from the side of the sun, not from the face of the ribbon.
  n = normalize(n * 0.45 + vec3(0.0, 0.5, 0.0) + (light - 0.25) * 1.2 * normalize(vec3(uSunDir.x, 0.3, uSunDir.z)));
  float lit = sunAt(vWorld + vec3(0.0, 0.3, 0.0));
  float open = skyOpen(vec3(vWorld.x, vWorld.y + 6.0, vWorld.z));
  vec3 sky = skyIrradiance(n);
  float nl = max(dot(n, uSunDir), 0.0);
  vec3 colour = albedo * (sky * (open * occ * 0.6) + uSunColour * (3.14159 * nl * lit * occ)) / 3.14159;
  // Thin and wet against the low sun: the light comes through it. Every thread between the lens and the sun has a hot rim,
  // the single ones glow through, and only the core and the side away from the light stay maroon.
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  float thin = 1.0 - body;
  float rim = smoothstep(cut + 0.16, cut, cover);
  float through = (0.12 + 0.88 * thin) * (0.3 + 0.7 * rim) * (0.2 + 0.8 * within) * (0.3 + 0.7 * smoothstep(0.1, 0.7, reach)) * (0.1 + 0.9 * against * against);
  // Far off a bush is one dark wine mass: the glow is in single threads, and none is seen there.
  float close = mix(0.22, 1.0, smoothstep(0.0075, 0.0025, px));
  vec3 blood = mix(vec3(1.0, 0.27, 0.17), vec3(1.0, 0.5, 0.36), 0.5 * tip + 0.35 * pale);
  colour += blood * uSunColour * (1.5 * through * (0.35 + 0.65 * through) * lit * close * (1.0 - 0.8 * dead)) * (0.3 + 1.7 * light);
  // Wet: here and there a thread turns the sun to the lens, and against the light the wet edges of the threads are lined with it.
  float glint = smoothstep(0.972, 0.995, vnoise(at * vec2(700.0, 260.0) + vVane.z)) * smoothstep(0.004, 0.0012, px) * rim;
  colour += uSunColour * vec3(1.0, 0.8, 0.6) * glint * (1.6 * pow(against, 5.0)) * lit * (0.3 + 0.7 * within);
  // The film of water on every thread gives back a little of the bright air round it, so its dark is wine and never black.
  colour += skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.02 / 3.14159) * open;
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

/** The ribbons cut holes: this is all the engine needs to lay their depth before the picture. */
export const VANE_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vVane;
varying vec4 vTint;
varying float vAlong;
uniform float uPixel;
uniform sampler2D tFrondA;
uniform sampler2D tFrondBA;
${NOISE_GLSL}
void main() {
${VANE_TEST}  gl_FragColor = vec4(0.0);
}`;

export const STEM_VERTEX = /* glsl */ `
attribute vec4 aVane;
attribute vec4 aSway;
attribute vec4 aTint;
attribute vec3 aRoot;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vVane;
varying vec4 vTint;
${SWAY_GLSL}
void main() {
  vec3 p = swayed(position, aRoot, aSway, aTint.z, aTint.w);
  vWorld = p;
  vNormal = normal;
  vVane = aVane;
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const STEM_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vVane;
varying vec4 vTint;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // Wet stem: wine-dark and stringy where it carries barbs, swelling pale and fleshy toward the holdfast, with dark in its folds.
  float strings = vnoise(vec2(vVane.y * 9.0 + vVane.z, vVane.x * 3.0)) * 0.6 + 0.4 * vnoise(vec2(vVane.y * 23.0, vVane.x * 11.0 + vVane.z));
  float knots = smoothstep(0.55, 0.8, vnoise(vec2(vVane.x * 14.0 + vVane.z, vVane.y * 3.0)));
  float flesh = vVane.w;
  vec3 dark = mix(vec3(0.14, 0.035, 0.03), vec3(0.36, 0.11, 0.08), strings);
  vec3 fleshy = mix(vec3(0.24, 0.1, 0.09), vec3(0.6, 0.42, 0.37), strings);
  vec3 albedo = mix(dark, fleshy, flesh * (0.55 + 0.45 * strings)) * (1.0 - 0.45 * knots);
  n = normalize(n + 0.5 * (strings - 0.5) * cross(n, vec3(0.0, 1.0, 0.0)));
  float occ = mix(0.35, 1.0, vTint.x) * mix(0.55, 1.0, smoothstep(0.02, 0.3, vTint.z)) * (0.6 + 0.4 * strings);
  float lit = sunAt(vWorld + vec3(0.0, 0.3, 0.0));
  float open = skyOpen(vec3(vWorld.x, vWorld.y + 6.0, vWorld.z));
  float nl = max(dot(n, uSunDir), 0.0);
  vec3 colour = albedo * (skyIrradiance(n) * (open * occ) + uSunColour * (3.14159 * nl * lit * occ)) / 3.14159;
  // Wet: a line of the sky and of the sun along it.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  colour += f * skyRadiance(r) * open * occ * 0.6 + uSunColour * (f * sunLobe(n, v, 0.3) * nl * lit * occ);
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

/** The drops: one that hangs at the end of a barb and swells, and one that has left it and falls. Each is where the time alone puts it. */
export const DROP_VERTEX = /* glsl */ `
attribute vec4 aSway;
attribute vec4 aTint;
attribute vec3 aRoot;
attribute vec4 aDrop;
attribute vec3 aCorner;
uniform float uPixel;
varying vec2 vAt;
varying vec3 vWorld;
varying float vKind;
varying float vShow;
${SWAY_GLSL}
void main() {
  // aDrop: seconds between two drops, where in that beat it is at time 0, its size in metres, 0 hangs and 1 falls. aCorner.z: the ground under it.
  float since = mod(uSeconds + aDrop.y, aDrop.x);
  float falls = aDrop.w;
  float then = uSeconds - since * falls;
  vec3 c = swayedAt(position, aRoot, aSway, aTint.z, aTint.w, then, uSurge);
  float size = aDrop.z * mix(0.5 + 0.5 * smoothstep(0.0, aDrop.x, since), 0.85, falls);
  c.y -= size + falls * 4.9 * since * since;
  vShow = mix(1.0, step(since, 0.62) * step(aCorner.z, c.y), falls);
  vec3 toEye = cameraPosition - c;
  float far = length(toEye);
  vec3 across = normalize(cross(vec3(0.0, 1.0, 0.0), toEye));
  // A drop is a few millimetres: it is drawn no narrower than a pixel and dimmed by as much as it was widened.
  float wide = max(size, 0.75 * uPixel * far);
  // The shutter is open a 120th of a second: one that falls is drawn out along its fall.
  float tall = max(wide, size * 1.25) + falls * 9.8 * since * 0.0045;
  vec3 p = c + across * aCorner.x * wide + vec3(0.0, aCorner.y * tall, 0.0);
  vAt = aCorner.xy;
  vWorld = p;
  vKind = size / wide;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const DROP_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vAt;
varying vec3 vWorld;
varying float vKind;
varying float vShow;
${RIG_GLSL}
void main() {
  if (vShow < 0.5) discard;
  float d = dot(vAt, vAt);
  if (d > 1.0) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  float bead = smoothstep(1.0, 0.6, d);
  // Water against the light: a drop is a lens. It shows the bright air upside down, dark at its top, and it gathers the low sun in a point.
  float against = max(dot(-v, uSunDir), 0.0);
  float lit = sunAt(vWorld);
  vec3 through = skyRadiance(normalize(vec3(-v.x, 0.25 + 0.5 * vAt.y, -v.z))) * mix(0.35, 1.1, smoothstep(0.5, -0.7, vAt.y));
  vec2 hot = vAt - vec2(0.3, -0.35);
  vec3 colour = through + uSunColour * (0.6 + 5.0 * pow(against, 4.0)) * lit * smoothstep(0.22, 0.0, dot(hot, hot));
  float alpha = bead * min(1.0, vKind) * 0.85 * (1.0 - uSolo);
  gl_FragColor = vec4(colour * alpha, alpha);
}`;
