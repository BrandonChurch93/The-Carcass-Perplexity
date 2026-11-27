// The gill-plumes in the light of the rig: wet threads in pointed locks on limbs of pale flesh, near black in the heart of the bush, ruby
// where the low sun comes through. A thread is a strip bent and turned to the lens here, and shaded as the round wet thing it is.
// The sway is in the vertex shader and is a function of the time alone: gusts cross the shelf and pass through a bush from its windward
// side to its lee, the limbs lean and spring back, each lock swings after its limb, and the breath of the shaft lifts it all.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

/** Where a point of a bush is at a time. The sway is one field over the whole bush: a place is moved by where it is (`p`, at rest), by
 *  how far along the forking it is (`u`: 0 at the holdfast, 1 at the end of a stalk, more on the branchlets) and by its stalk's phase, so
 *  that whatever is rooted on a limb stays on it. Shared by the strips, the tubes and the drops. */
export const SWAY_GLSL = /* glsl */ `
uniform float uSeconds;
uniform float uSurge;
uniform vec2 uWind;
// The wind at a place, 0 in a lull to 1 in a gust: three trains of gusts of unlike length that travel to the lee at their own pace,
// the longest 19 m from crest to crest at 4 m/s, the shortest shorter than a bush, so a gust is seen to go through it.
float gustAt(vec2 xz, vec2 lee, float t) {
  float down = dot(xz, lee);
  float cross_ = xz.x * lee.y - xz.y * lee.x;
  float a = sin(down * 0.33 + cross_ * 0.07 - t * 1.31);
  float b = sin(down * 0.87 - cross_ * 0.31 - t * 2.63 + 1.7);
  float c = sin(down * 2.3 + cross_ * 0.9 - t * 5.3 + 0.6);
  return clamp(0.46 + 0.3 * a + 0.2 * b * (0.6 + 0.4 * a) + 0.05 * c, 0.0, 1.0);
}
vec3 swayAt(vec3 p, vec4 bush, float tall, float u, float phase, float t, float surge) {
  float r = max(length(p - bush.xyz) / tall - 0.1, 0.0);
  float a = r * r;
  float uu = u * u;
  // At the lip the air is drawn to the shaft: a bush is combed that way, and that way the gusts go through it and bow it further.
  vec2 lee = -normalize(bush.xz);
  float g = gustAt(p.xz, lee, t);
  // The stalk leans with the gust and springs back on its own beat, the spring running out to its end; no two stalks keep time.
  float beat = 1.5 + 0.5 * fract(phase * 3.7);
  float own = sin(t * beat - u * 2.6 + phase) + 0.4 * sin(t * beat * 2.3 - u * 5.0 + phase * 1.9);
  float whole = sin(t * 0.83 + bush.w - r * 1.7);
  float bend = (0.13 * (g - 0.4) + 0.025 * whole) * a + 0.024 * own * (0.35 + g) * uu;
  vec2 push = lee * (bend * tall);
  // Leaning over, an arched limb goes down; let go, it comes up again.
  float lift = (-0.45 * bend + 0.012 * own * (0.35 + g) * uu) * tall;
  // The breath of the shaft comes up past the lip: everything is thrown up and outward and shakes as it passes. Between its breaths
  // the warm air still rises past the lip.
  vec2 away = normalize(p.xz);
  float shake = 0.6 + 0.4 * sin(t * 6.3 - r * 7.0 + bush.w * 3.1);
  float rise = surge * shake + 0.1 * sin(t * 2.3 - r * 3.0 + bush.w * 1.9);
  push += away * (0.17 * rise * tall * (a + 0.4 * uu));
  lift += 0.1 * rise * tall * (a + 0.5 * uu);
  // The fine ends shiver: short waves run down the wind through the bush, and only what is thin and far out answers them.
  float down = dot(p.xz, lee);
  float fine = max(u - 0.55, 0.0);
  fine *= fine;
  float w1 = sin(down * 4.3 + p.y * 2.1 - t * 3.4 + phase);
  float w2 = sin(down * 9.1 - p.y * 5.3 - t * 5.9 + phase * 2.3);
  push += lee * (0.014 * tall * (w1 + 0.4 * w2) * (0.25 + g) * fine);
  lift += 0.006 * tall * (w2 - 0.6 * w1) * (0.25 + g) * fine;
  return p + vec3(push.x, lift, push.y);
}
// A strip: rooted at a, it leaves along b and is turned by c (a + b s + c s s). One that carries nothing (sway.z is not negative) swings
// at its end to the lee in a gust, a moment after its limb has moved, and trembles on its own.
vec3 stripAt(vec3 a, vec3 b, vec3 c, vec4 sway, vec4 bush, float tall, float s, float t, float surge, out vec3 tangent) {
  vec3 rest = a + b * s + c * (s * s);
  tangent = b + 2.0 * s * c;
  vec3 p = swayAt(rest, bush, tall, mix(sway.x, sway.y, s), sway.w, t, surge);
  if (sway.z >= 0.0) {
    float len = length(b);
    vec2 lee = -normalize(bush.xz);
    float g = gustAt(a.xz, lee, t - 0.22);
    float swing = 0.3 * (g - 0.4) + (0.05 * sin(t * 2.9 + sway.z) + 0.015 * sin(t * 5.3 + sway.z * 2.7)) * (0.3 + g);
    vec3 bent = vec3(lee.x * swing, 0.16 * max(g - 0.4, 0.0) + 0.4 * surge, lee.y * swing) * len;
    p += bent * (s * s);
    tangent += 2.0 * s * bent;
  }
  return p;
}`;

export const THREAD_VERTEX = /* glsl */ `
attribute vec4 aA;
attribute vec4 aB;
attribute vec4 aC;
attribute vec4 aSway;
attribute vec4 aTint;
uniform float uPixel;
uniform vec4 uBush;
uniform float uTall;
varying vec3 vWorld;
varying vec3 vAlong;
varying vec3 vSide;
varying vec4 vTint;
varying vec4 vAt;
varying vec3 vLight;
${RIG_GLSL}
${SWAY_GLSL}
void main() {
  float s = position.x;
  vec3 tangent;
  vec3 p = stripAt(aA.xyz, aB.xyz, aC.xyz, aSway, uBush, uTall, s, uSeconds, uSurge, tangent);
  tangent = normalize(tangent);
  vec3 toEye = cameraPosition - p;
  float far = length(toEye);
  vec3 side = normalize(cross(tangent, toEye));
  // It thins to a point. Far off it is thinner than a pixel and would break into dots: there it is drawn a pixel wide.
  float thin = 1.0 - 0.8 * s * sqrt(s);
  float least = 0.55 * uPixel * far;
  float wide = max(aA.w * thin, least);
  p += side * (position.y * wide);
  vWorld = p;
  vAlong = tangent;
  vSide = side;
  vTint = aTint;
  // How far along, which edge, the spray's tone, its own number.
  vAt = vec4(s, position.y, aB.w, aC.w);
  // The land's shadow and the open sky are the same along a strip: read once here, not at every pixel. z: how much wider than itself it is drawn.
  vLight = vec3(sunAt(vec3(aA.x, aA.y + 0.3, aA.z)), skyOpen(vec3(aA.x, aA.y + 6.0, aA.z)), least / max(aA.w, 1e-5));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const THREAD_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vAlong;
varying vec3 vSide;
varying vec4 vTint;
varying vec4 vAt;
varying vec3 vLight;
uniform float uGlow;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 t = normalize(vAlong);
  float across = vAt.y;
  // The strip is a round thread: its normal turns from one edge to the other.
  vec3 n = normalize(normalize(vSide) * across + v * sqrt(max(1.0 - across * across, 0.0)));
  float s = vAt.x;
  float dead = step(1.5, vAt.z);
  float tone = fract(vAt.z);
  float own = vAt.w;
  float sunLeft = vTint.x;
  float skyLeft = vTint.y;
  float lit = vLight.x;
  float open = vLight.y;
  // Wet flesh: wine at the limb, crimson along it, and at the very end bleached to a pale pink that the light goes through. A lock
  // here and there is browner or more purple than its neighbours.
  vec3 wine = mix(vec3(0.085, 0.014, 0.027), vec3(0.24, 0.03, 0.055), tone * tone);
  wine = mix(wine, wine.r * vec3(1.0, 0.3, 0.16), smoothstep(0.78, 0.95, own) * 0.7);
  wine = mix(wine, wine.r * vec3(0.85, 0.1, 0.3), smoothstep(0.2, 0.05, own) * 0.6);
  float end = smoothstep(0.6, 1.0, s) * (0.3 + 0.7 * smoothstep(0.7, 1.2, tone + 0.5 * own));
  vec3 albedo = mix(wine * (0.6 + 0.4 * smoothstep(0.0, 0.35, s)), vec3(0.45, 0.16, 0.16), 0.5 * end);
  albedo = mix(albedo, vec3(0.2, 0.12, 0.07) * (0.6 + 0.8 * tone), dead);
  // Far off a thread is drawn wider than it is and the gaps between threads are gone: what is seen there is the light among them,
  // and the dark between them is in it.
  float mass = clamp((vLight.z - 1.0) / 6.0, 0.0, 1.0);
  albedo = mix(albedo, wine * 0.62, mass);
  // The light that reaches it: the sky from above, less of it the deeper in the bush, and the sun where it finds a way in. A thin wet
  // thread takes the light on all sides of it.
  float wrap = 0.2 + 0.8 * max(dot(n, uSunDir), 0.0);
  vec3 colour = albedo * (skyIrradiance(n) * (open * (0.32 + 0.68 * skyLeft)) + uSunColour * (3.14159 * wrap * lit * (0.05 + 0.95 * sunLeft))) / 3.14159;
  // Against the low sun the light comes through: every thread between the lens and the sun that the sun still reaches is ruby, hot
  // at its edges and at its pale end. Deep in the bush nothing comes through and it stays near black.
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  float edge = across * across;
  float through = (0.06 + 0.94 * against * against) * sunLeft * sqrt(sunLeft) * (0.35 + 0.65 * edge) * (1.0 - 0.85 * dead);
  // Toward its end a lock is thin and the sun is through all of it: there it glows orange red.
  float thin = smoothstep(0.3, 1.0, s);
  vec3 blood = mix(mix(vec3(0.42, 0.008, 0.035), vec3(0.8, 0.15, 0.045), thin), vec3(0.9, 0.3, 0.26), 0.25 * end);
  colour += blood * uSunColour * (0.4 * (0.5 + 0.5 * smoothstep(1.5, 3.0, vTint.z)) * (0.3 + 2.2 * thin * thin) * through * lit * (0.5 + 0.8 * tone)) * (1.0 - 0.75 * mass) * uGlow;
  // Wet: the sun runs along a thread as a line of light where it lies right to it, and breaks into beads.
  vec3 h = normalize(uSunDir + v);
  float th = dot(t, h);
  float line = pow(max(1.0 - th * th, 0.0), 12.0);
  float beads = 0.75 + 0.25 * smoothstep(0.35, 0.8, vnoise(vec2(s * 9.0 + own * 91.0, own * 37.0)));
  // A thread thinner than a pixel is drawn a pixel wide: its line of light is dimmed by as much, or it sparks from frame to frame.
  colour += uSunColour * vec3(1.0, 0.78, 0.5) * (0.05 * line * beads * lit * sunLeft * (1.0 - 0.6 * dead)) * (1.0 - 0.7 * mass) / max(vLight.z, 1.0);
  // And the film of water on it gives back the bright air round it, most at its edges: its dark is wine and never black.
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  float f = 0.03 + 0.97 * pow(1.0 - sqrt(max(1.0 - edge, 0.0)), 4.0);
  colour += min(skyRadiance(r), vec3(1.2)) * (f * 0.12 * open * (0.1 + 0.9 * skyLeft * skyLeft) * (1.0 - 0.7 * dead) * (1.0 - 0.75 * mass));
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

export const STEM_VERTEX = /* glsl */ `
attribute vec4 aVane;
attribute vec4 aSway;
attribute vec4 aTint;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vVane;
varying vec4 vTint;
uniform vec4 uBush;
uniform float uTall;
${SWAY_GLSL}
void main() {
  // A toe of the holdfast (0 along) is in the rock and does not move.
  vec3 p = aSway.x > 0.0 ? swayAt(position, uBush, uTall, aSway.x, aSway.w, uSeconds, uSurge) : position;
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
  vec3 dark = mix(vec3(0.06, 0.012, 0.016), vec3(0.2, 0.035, 0.04), strings);
  // The flesh is sinew: cords run along it, mauve on their backs and wine in the creases between them, with a vein here and there.
  float cords = 0.5 + 0.5 * sin(vVane.y * 19.0 + vVane.z + 2.5 * vnoise(vec2(vVane.x * 5.0 + vVane.z, vVane.y * 2.0)));
  float vein = smoothstep(0.12, 0.0, abs(vnoise(vec2(vVane.x * 4.0 + vVane.z * 3.0, vVane.y * 5.0)) - 0.5));
  vec3 fleshy = mix(vec3(0.13, 0.035, 0.04), vec3(0.46, 0.2, 0.19), strings * (0.35 + 0.65 * cords));
  fleshy = mix(fleshy, vec3(0.2, 0.035, 0.07), 0.5 * vein);
  vec3 albedo = mix(dark, fleshy, flesh * (0.55 + 0.45 * strings)) * (1.0 - 0.45 * knots);
  n = normalize(n + (0.25 * (strings - 0.5) + 0.3 * flesh * (cords - 0.5)) * cross(n, vec3(0.0, 1.0, 0.0)));
  float occ = mix(0.45, 1.0, vTint.y) * mix(0.55, 1.0, smoothstep(0.02, 0.3, vTint.z)) * (0.6 + 0.4 * strings) * (1.0 - 0.35 * flesh * (1.0 - cords));
  float lit = sunAt(vWorld + vec3(0.0, 0.3, 0.0)) * vTint.x;
  float open = skyOpen(vec3(vWorld.x, vWorld.y + 6.0, vWorld.z));
  float nl = max(dot(n, uSunDir), 0.0);
  vec3 colour = albedo * (skyIrradiance(n) * (open * occ) + uSunColour * (3.14159 * nl * lit * occ)) / 3.14159;
  // Under the bush the lit rock throws its warm light back up into the flesh.
  colour += albedo * uSunColour * (0.07 * sunAt(vec3(vWorld.x, vWorld.y + 4.0, vWorld.z)) * (0.6 - 0.4 * n.y) * (0.3 + 0.7 * flesh));
  // Wet: a line of the sky and of the sun along it.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  colour += f * min(skyRadiance(r), vec3(1.5)) * open * occ * 0.45 + uSunColour * ((f + 0.05) * sunLobe(n, v, 0.22) * nl * lit * occ);
  // Wet flesh is not opaque: against the low sun the light comes through its edges, pink.
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  colour += mix(vec3(0.7, 0.08, 0.07), vec3(0.8, 0.14, 0.1), flesh) * uSunColour * (0.045 * against * against * pow(1.0 - nv, 1.5) * lit * smoothstep(0.1, 0.4, vTint.z));
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

/** The drops: one that hangs at the point of a lock and swells, and one that has left it and falls. Each is where the time alone puts it. */
export const DROP_VERTEX = /* glsl */ `
attribute vec4 aA;
attribute vec4 aB;
attribute vec4 aC;
attribute vec4 aSway;
attribute vec4 aTint;
attribute vec4 aDrop;
attribute vec4 aBush;
attribute vec3 aCorner;
uniform float uPixel;
varying vec2 vAt;
varying vec3 vWorld;
varying float vWide;
varying float vKind;
varying float vShow;
varying float vFalls;
${SWAY_GLSL}
void main() {
  // aDrop: seconds between two drops, where in that beat it is at time 0, its size in metres, 0 hangs and 1 falls. aCorner.z: the ground under it.
  float since = mod(uSeconds + aDrop.y, aDrop.x);
  float falls = aDrop.w;
  // The one that falls left the lock's point where that point was when it let go, and keeps the pace the lock had.
  float then = uSeconds - since * falls;
  vec3 tangent;
  vec3 c = stripAt(aA.xyz, aB.xyz, aC.xyz, aSway, aBush, aTint.w, 1.0, then, uSurge, tangent);
  float size = aDrop.z * mix(0.45 + 0.55 * smoothstep(0.0, aDrop.x, since), 0.9, falls);
  vShow = mix(1.0, step(since, 0.85) * step(aCorner.z, c.y - 4.9 * since * since), falls);
  vec3 toEye = cameraPosition - c;
  float far = length(toEye);
  vec3 across = normalize(cross(vec3(0.0, 1.0, 0.0), toEye));
  // A drop is a few millimetres: it is drawn no narrower than a pixel and dimmed by as much as it was widened.
  float wide = max(size, 0.75 * uPixel * far);
  // A hanging drop is a bead at the end of a neck of water drawn out from the point of the lock, and the neck grows as the bead
  // does. The shutter is open a 120th of a second: one that falls is drawn out along its fall.
  float tall = mix(wide * (1.6 + 1.4 * smoothstep(0.3 * aDrop.x, aDrop.x, since)), wide + 9.8 * since * 0.012, falls);
  c.y -= mix(tall, tall + 4.9 * since * since, falls);
  vec3 p = c + across * aCorner.x * wide + vec3(0.0, aCorner.y * tall, 0.0);
  vFalls = falls;
  // x over y of the quad: the bead stays round however long the neck.
  vWide = wide / tall;
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
varying float vFalls;
varying float vWide;
${RIG_GLSL}
void main() {
  if (vShow < 0.5) discard;
  // The bead is round and at the foot; above it the water is drawn to a neck that thins up to the thread it hangs from. One that
  // falls is the bead alone, drawn out.
  float low = (vAt.y + 1.0) / vWide - 1.0;
  float bead_ = vAt.x * vAt.x + low * low;
  float neckWide = 0.1 + 0.75 * exp(-1.6 * max(low, 0.0));
  float neck = low > 0.0 ? (vAt.x * vAt.x) / (neckWide * neckWide) : 2.0;
  float whole = vAt.x * vAt.x + vAt.y * vAt.y;
  float d = mix(min(bead_, neck), whole, vFalls);
  if (d > 1.0) discard;
  vec2 at = mix(vec2(vAt.x, clamp(low, -1.0, 1.0)), vAt, vFalls);
  vec3 v = normalize(cameraPosition - vWorld);
  float bead = smoothstep(1.0, 0.72, d);
  // Water against the light: a drop is a lens. It shows the bright air upside down, dark at its top and at its rim, and it gathers
  // the low sun in a point.
  float against = max(dot(-v, uSunDir), 0.0);
  float lit = sunAt(vWorld);
  vec3 through = skyRadiance(normalize(vec3(-v.x, 0.25 + 0.5 * vAt.y, -v.z))) * mix(0.3, 1.1, smoothstep(0.5, -0.7, at.y)) * (1.0 - 0.5 * smoothstep(0.5, 1.0, d));
  vec2 hot = at - vec2(0.28, -0.35);
  // The sun's point in it is gold and small, and only a bead that is drawn at its own size has one: a drop smaller than a pixel is a
  // dim grey point, not a white one.
  float own = min(1.0, vKind);
  vec3 colour = min(through, vec3(1.3)) * 0.75 + uSunColour * vec3(1.0, 0.8, 0.55) * ((0.9 + 2.4 * pow(against, 4.0)) * lit * own * (1.0 - 0.7 * vFalls) * smoothstep(0.2, 0.0, dot(hot, hot)));
  float alpha = bead * own * own * mix(0.85, 0.4, vFalls) * (1.0 - uSolo);
  gl_FragColor = vec4(colour * alpha, alpha);
}`;
