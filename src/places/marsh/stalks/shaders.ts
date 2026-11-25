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
float nodeAt(float y, float sp, float seed) {
  return (y + 0.045 * sin(y * 6.1 + seed * 20.0) + 0.02 * sin(y * 15.7 + seed * 50.0)) / sp + seed;
}
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
    // No two nodes the same way apart.
    float ny = nodeAt(y, sp, seed);
    float q = fract(ny);
    float node = floor(ny);
    // At every node a collar of salt stands out, thin, ragged, and broken away in places.
    float ragged = 0.55 + 0.6 * wob(a, node + seed) + 0.35 * wob(a * 2.3, node * 1.7 + seed);
    float flare = smoothstep(0.62, 0.93, q) * (1.0 - smoothstep(0.93, 1.0, q)) * max(ragged, 0.0);
    float collar = smoothstep(h - 0.1, h, y);
    r = R * (1.12 - 0.12 * v) * (1.0 + 0.26 * flare + 0.05 * (1.0 - smoothstep(0.0, 0.4, q)) + 0.035 * wob(a + y * 3.0, seed));
    r *= 1.0 + collar * (0.2 + 0.16 * wob(a, seed + 2.0));
    float torn = kind > 1.5 && kind < 2.5 ? 0.07 : 0.035;
    y += collar * torn * (wob(a * 0.7, seed + 5.0) + 0.5 * wob(a * 2.0, seed + 8.0));
    // The foot spreads into the crust.
    r *= 1.0 + 0.5 * exp(-y / 0.09);
  } else if (aSkin < 1.5) {
    // The inside of the mouth.
    float torn = kind > 1.5 && kind < 2.5 ? 0.07 : 0.035;
    y = h + torn * (wob(a * 0.7, seed + 5.0) + 0.5 * wob(a * 2.0, seed + 8.0)) * (1.0 - v) - 0.4 * v;
    r = R * mix(1.0 + 0.2 + 0.16 * wob(a, seed + 2.0), 0.7, smoothstep(0.0, 0.2, v));
  } else {
    // The body of the plume in the mouth: a pointed bud when it is drawn in, a low throat when it is out.
    float open = plumeOpen(kind, aKind.y, seed);
    float len = (kind > 1.5 && kind < 2.5 ? 0.0 : 1.0) * aKind.z * mix(0.22, 0.15, open);
    y = h - 0.06 + len * v;
    r = R * (kind > 1.5 && kind < 2.5 ? 0.0 : 1.0) * mix(1.1, 0.8, open) * pow(max(sin(3.14159 * pow(mix(0.12, 1.0, v), 0.8)), 0.0), 0.8) * (1.0 + 0.07 * sin(a * 3.0 + v * 2.2 + seed * 30.0) + 0.03 * sin(a * 5.0 - v * 3.0));
  }
  vec3 A = vec3(aAxis.x * sin(lean), cos(lean), aAxis.y * sin(lean));
  vec3 U = vec3(aAxis.x * cos(lean), -sin(lean), aAxis.y * cos(lean));
  vec3 W = vec3(-aAxis.y, 0.0, aAxis.x);
  // No stalk is straight: each has grown toward its own light and sagged under its own salt.
  float ba = seed * 37.0;
  float t = clamp(y / h, 0.0, 1.3);
  vec3 bow = (U * cos(ba) + W * sin(ba)) * (aKind.y < -0.5 ? 0.0 : 1.0) * (0.03 + 0.17 * fract(seed * 91.3)) * h * t * t;
  return aBase.xyz + A * y + bow + (U * cos(a) + W * sin(a)) * r;
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
    float q = fract((y + 0.045 * sin(y * 6.1 + seed * 20.0) + 0.02 * sin(y * 15.7 + seed * 50.0)) / sp + seed);
    vec2 uv = vec2(vCoord.x * 0.16, y) / 0.42 + seed * vec2(3.1, 7.7);
    vec3 salt = texture2D(tSalt, uv).rgb;
    vec3 nh = texture2D(tSaltNh, uv).rgb;
    float patchy = fbm(vec2(vCoord.x * 1.3, y * 3.0) + seed * 11.0);
    // Under the salt the tube is horn brown; it shows where the crust has flaked and under each lip, where the brine has run and left rust.
    float bare = smoothstep(0.42, 0.62, patchy + 0.3 * (0.5 - nh.b));
    float under = (1.0 - smoothstep(0.0, 0.3, q)) + 0.6 * smoothstep(0.9, 1.0, q);
    vec3 horn = vec3(0.15, 0.095, 0.06) * (0.6 + 0.8 * nh.b);
    vec3 rust = vec3(0.2, 0.07, 0.03);
    vec3 albedo = (salt * 1.05 + 0.03) * vec3(1.0, 0.93, 0.85);
    albedo = mix(albedo, horn, 0.8 * bare);
    // Some nodes still carry the sheath they grew in: brown paper, split and hanging to a ragged end. And where a plume was shed there is a scar.
    float nodeId = floor((y + 0.045 * sin(y * 6.1 + seed * 20.0) + 0.02 * sin(y * 15.7 + seed * 50.0)) / sp + seed);
    float has = step(hash12(vec2(nodeId, floor(seed * 977.0))), 0.34);
    float rag = 0.25 + 0.5 * vnoise(vec2(vCoord.x * 2.6, nodeId * 3.1 + seed * 9.0));
    float sheath = has * smoothstep(1.0 - rag - 0.06, 1.0 - rag + 0.02, q) * smoothstep(0.38, 0.5, vnoise(vec2(vCoord.x * 1.4 + nodeId, seed * 40.0)));
    float fibre = vnoise(vec2(vCoord.x * 30.0, y * 2.0 + seed * 7.0));
    albedo = mix(albedo, vec3(0.17, 0.105, 0.066) * (0.55 + 0.9 * fibre), 0.9 * sheath);
    float scar = smoothstep(0.8, 0.86, vnoise(vec2(vCoord.x * 2.2, y * 9.0) + seed * 30.0));
    albedo = mix(albedo, vec3(0.045, 0.028, 0.02), 0.85 * scar);
    // One that is dead and broken has lost its salt: it is grey brown and stained.
    float deadStem = step(1.5, vKind.x) * step(vKind.x, 2.5) * step(0.5, fract(seed * 57.0));
    albedo = mix(albedo, albedo * vec3(0.5, 0.4, 0.33) + vec3(0.02, 0.012, 0.008), deadStem);
    // Far off the rings are not seen one by one: a stalk is pale with a stain here and there.
    float away = smoothstep(10.0, 34.0, distance(cameraPosition, vWorld));
    under *= 1.0 - 0.85 * away;
    albedo = mix(albedo, rust, clamp(under * (0.25 + 0.75 * smoothstep(0.35, 0.7, fbm(vec2(vCoord.x * 2.0, y * 9.0) + seed))), 0.0, 0.6));
    albedo = mix(albedo, albedo * vec3(0.8, 0.66, 0.56), away * smoothstep(0.35, 0.65, fbm(vec2(vCoord.x * 0.7, y * 1.3) + seed * 5.0)));
    // The foot stands in red brine and mud.
    float wet = 1.0 - smoothstep(0.1, 0.45 + 0.3 * patchy, vWorld.y);
    albedo = mix(albedo, albedo * vec3(0.5, 0.2, 0.16) + vec3(0.03, 0.005, 0.004), wet);
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(cross(up, n) + 1e-5);
    vec3 B = cross(n, T);
    n = normalize(n - (T * (nh.r - 0.5) + B * (nh.g - 0.5)) * 1.6);
    float occ = mix(0.55 + 0.45 * smoothstep(0.0, 0.35, q), 0.9, away) * (0.75 + 0.25 * nh.b) * (0.6 + 0.4 * smoothstep(0.0, 0.25, y));
    // Seen from inside, through a broken mouth: the dark of the tube.
    c = rigShade(vWorld, n, v, albedo, mix(0.95, 0.4, wet), occ);
    if (!gl_FrontFacing) c = vec3(0.05, 0.028, 0.022) * skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 * 0.25 * skyOpen(vWorld);
  } else if (skin < 1.5) {
    float down = vCoord.w;
    c = vec3(0.07, 0.035, 0.028) * skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 * 0.5 * (1.0 - smoothstep(0.0, 0.35, down)) * skyOpen(vWorld);
  } else {
    // A closed sheath: long scales that lap over each other up to the point.
    float lap = fract(vCoord.w * 3.3 + 0.35 * sin(vCoord.x * 3.0));
    float groove = (0.5 + 0.5 * pow(abs(sin(vCoord.x * 4.5 + vCoord.w * 2.6)), 0.5)) * (0.75 + 0.25 * smoothstep(0.0, 0.3, lap));
    vec3 albedo = mix(vec3(0.035, 0.007, 0.009), vec3(0.1, 0.02, 0.024), vCoord.w) * groove;
    albedo = mix(albedo, vec3(0.03, 0.012, 0.01), smoothstep(0.8, 1.0, vCoord.w));
    // It is not polished: fibres run up it, and salt has dried on it in a bloom, thickest low down where the spray reaches.
    float thread = vnoise(vec2(vCoord.x * 26.0, vCoord.w * 5.0 + seed * 9.0));
    albedo *= 0.7 + 0.6 * thread;
    float bloom = smoothstep(0.42, 0.7, fbm(vec2(vCoord.x * 2.3, vCoord.w * 6.0) + seed * 13.0)) * (1.0 - 0.6 * vCoord.w);
    albedo = mix(albedo, vec3(0.2, 0.15, 0.135), 0.55 * bloom);
    c = rigShade(vWorld, n, v, albedo, 1.0, (0.5 + 0.5 * vCoord.w) * (0.6 + 0.4 * groove));
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const PLUME_SHAPE_GLSL = /* glsl */ `
attribute vec4 aTop;
attribute vec4 aAx;
attribute vec4 aFil;
attribute vec4 aMore;
${OPEN_GLSL}
vec3 filamentPoint(float u, float open, vec3 axis, vec3 radial, vec3 radialBase) {
  float L = aFil.z;
  float R = aTop.w;
  float spread = aFil.y;
  float seed = aFil.w;
  // The whole mop falls to one side, the side the air has combed it to.
  float sa = aMore.y * 40.0;
  vec3 sweep = vec3(cos(sa), 0.0, sin(sa));
  // Out: it leaves the mouth along the tube in a bunch, goes over as its own weight takes it, and its wet end hangs. In: it lies along the bud.
  vec3 d0 = normalize(axis + radial * (0.12 + 0.42 * spread) + sweep * 0.38);
  vec3 outward = normalize(radial * (0.2 + 0.5 * spread) + sweep * 1.0);
  float heavy = 0.75 + 0.5 * fract(seed * 5.3);
  float u2 = u * u;
  // One in eight has died: it hangs brown down the stem.
  float gone = step(fract(seed * 3.1), 0.012);
  vec3 hung = radialBase * R * 0.9 + radial * (R * 0.5 + L * 0.2 * (2.0 * u - u2)) - vec3(0.0, 1.0, 0.0) * L * 0.6 * u * (0.4 + 0.6 * u) + cross(axis, radial) * L * 0.04 * sin(u * 6.0 + seed * 31.0) * u;
  vec3 outP = radialBase * R * 0.5 * (1.0 - 0.5 * u)
    + d0 * L * (0.86 - 0.3 * spread) * (2.0 * u - u2)
    + outward * L * (0.2 + 0.4 * spread) * u2
    - vec3(0.0, 1.0, 0.0) * L * (0.05 + 0.42 * spread * spread) * heavy * u2 * u2
    + cross(axis, radial) * L * 0.05 * sin(u * 5.0 + seed * 31.0) * u
    + radial * L * 0.035 * sin(u * 9.0 + seed * 50.0) * u;
  float bulge = sin(3.14159 * pow(mix(0.12, 1.0, u), 0.8));
  vec3 inP = axis * (0.2 * aMore.z * u - 0.05) + radialBase * R * 0.78 * bulge;
  outP = mix(outP, hung, gone);
  vec3 p = mix(inP, outP, mix(open, 1.0, gone));
  // The air moves it: the whole plume leans and comes back, and each tip swings by itself, slowly, because it is wet.
  float reach = open * u2;
  float gust = sin(uSeconds * 1.1 + aAx.w + dot(aTop.xz, vec2(0.21, 0.17))) + 0.5 * sin(uSeconds * 2.3 + aAx.w * 1.7);
  p += vec3(0.8, 0.0, 0.6) * (0.04 * L * reach * gust);
  p += (radial * sin(uSeconds * 2.6 + seed * 40.0) + sweep * cos(uSeconds * 2.1 + seed * 17.0)) * (0.014 * L * reach * u);
  return aTop.xyz + p;
}
void plumeFrame(out vec3 axis, out vec3 radial, out vec3 radialBase, out float open) {
  axis = aAx.xyz;
  vec3 W = normalize(cross(axis, vec3(0.0, 1.0, 0.0) + vec3(0.0013, 0.0, 0.0021)));
  vec3 U = cross(W, axis);
  radial = U * cos(aFil.x) + W * sin(aFil.x);
  float b = aFil.w * 81.7;
  radialBase = (U * cos(b) + W * sin(b)) * sqrt(fract(aFil.w * 23.7));
  open = plumeOpen(aMore.x, aAx.w, aMore.y);
}`;

export const PLUME_VERTEX = /* glsl */ `
${PLUME_SHAPE_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLook;
varying float vGone;
void main() {
  vec3 axis;
  vec3 radial;
  vec3 radialBase;
  float open;
  plumeFrame(axis, radial, radialBase, open);
  float u = position.y;
  vec3 p = filamentPoint(u, open, axis, radial, radialBase);
  vec3 t = normalize(filamentPoint(u + 0.03, open, axis, radial, radialBase) - p);
  vec3 toCam = normalize(cameraPosition - p);
  vec3 side = normalize(cross(t, toCam));
  float wide = aMore.w * (1.0 - 0.88 * u) * (0.45 + 0.55 * smoothstep(0.0, 0.12, u)) * (0.6 + 0.8 * fract(aFil.w * 41.3));
  p += side * position.x * wide;
  vWorld = p;
  // Round across its width.
  vNormal = normalize(cross(side, t) + side * position.x * 0.9);
  vLook = vec3(u, aFil.w, open);
  vGone = step(fract(aFil.w * 3.1), 0.012);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const PLUME_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLook;
varying float vGone;
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float u = vLook.x;
  float tone = fract(vLook.y * 7.7);
  vec3 albedo = mix(vec3(0.045, 0.005, 0.009), vec3(0.17, 0.011, 0.024), smoothstep(0.0, 0.8, u) * (0.3 + 0.7 * tone));
  // The ends dry paler between two wettings.
  albedo = mix(albedo, vec3(0.3, 0.13, 0.12), 0.5 * smoothstep(0.55, 1.0, u) * step(0.4, tone));
  // Pale where it leaves the mouth.
  albedo = mix(albedo, vec3(0.2, 0.12, 0.09), 0.5 * (1.0 - smoothstep(0.03, 0.22, u)) * vLook.z);
  // Drawn in, the filaments are packed and dark: the bud is a dull sheath.
  albedo *= mix(0.4, 1.0, max(vLook.z, vGone));
  albedo = mix(albedo, vec3(0.05, 0.03, 0.02) * (0.6 + 0.8 * tone), vGone);
  float occ = mix(0.25, 1.0, smoothstep(0.0, 0.6, u)) * mix(0.6, 1.0, max(vLook.z, vGone));
  vec3 c = rigShade(vWorld, n, v, albedo, mix(0.95, 0.55, vLook.z * (1.0 - vGone)), occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

/** The drop at the end of a wet filament: it gathers, hangs and falls. */
export const BEAD_VERTEX = /* glsl */ `
${PLUME_SHAPE_GLSL}
varying vec3 vWorld;
varying vec2 vAt;
varying vec3 vRight;
void main() {
  vec3 axis;
  vec3 radial;
  vec3 radialBase;
  float open;
  plumeFrame(axis, radial, radialBase, open);
  float seed = aFil.w;
  float has = step(fract(seed * 17.3), 0.2) * step(0.45, open) * (1.0 - step(fract(seed * 3.1), 0.012));
  float period = 2.6 + 4.4 * fract(seed * 29.1);
  float c = fract(uSeconds / period + seed * 11.0);
  vec3 tip = filamentPoint(1.0, open, axis, radial, radialBase);
  float grow = smoothstep(0.0, 0.78, c);
  float fall = max(0.0, c - 0.8) * period;
  float r = min(aMore.w, 0.0042) * (0.6 + 0.8 * grow);
  vec3 at = tip - vec3(0.0, r * 0.7 + 4.9 * fall * fall, 0.0);
  float lengthen = 1.0 + 9.8 * fall / 120.0 / max(r, 1e-4) * 0.5;
  if (at.y < 0.02) has = 0.0;
  vec3 toCam = cameraPosition - at;
  vRight = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vAt = position.xy;
  vec3 p = at + (vRight * position.x + vec3(0.0, 1.0, 0.0) * position.y * lengthen) * r * has;
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const BEAD_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vAt;
varying vec3 vRight;
${RIG_GLSL}
void main() {
  float d = dot(vAt, vAt);
  if (d > 1.0) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vRight * vAt.x + vec3(0.0, 1.0, 0.0) * vAt.y + v * sqrt(1.0 - d));
  // Brine, a little red in it: it holds the sky upside down and a bright edge.
  vec3 c = rigShade(vWorld, n, v, vec3(0.1, 0.025, 0.025), 0.12, 1.0);
  c += skyRadiance(vec3(0.0, 1.0, 0.0)) * 0.12 * smoothstep(0.2, -0.6, vAt.y);
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
  vec3 albedo = mix(vec3(0.07, 0.05, 0.035), vec3(0.2, 0.16, 0.1), vTone);
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
  vec3 c = mix(skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 * 0.75, vec3(0.05, 0.035, 0.03), 0.6 * vein) * skyOpen(vWorld);
  float a = (0.22 + 0.3 * vein) * edge * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(c) * (1.0 - uSolo), a);
}`;
