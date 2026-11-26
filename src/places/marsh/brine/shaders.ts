// The brine's own surface, its domes of gas, and what a dome becomes when it tears.
import { BRINE_GLSL } from '../shared/brine-glsl';
import { RIG_GLSL } from '../shared/glsl';
import { FIELD_GLSL } from '../land/shaders';

export const MAX_RINGS = 24;

export const BRINE_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vWorld = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

export const MAX_SEEPS = 8;

export const BRINE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform sampler2D tGrain;
uniform sampler2D tFroth;
uniform sampler2D tRipple;
// How steep the wavelets stand: the slope a full swing of the tile is.
const float RIPPLE = 0.5;
// Drawn rings round whatever stands in the brine (0: none; they read as circles laid on with a pen).
const float WADER_RINGS = 0.0;
// Rafts of scum out on the open brine (0: none; they read as chalk dust).
const float RAFTS = 0.0;
uniform vec2 uWade;
uniform int uRingCount;
// x, z of the middle, radius of the front in metres, strength.
uniform vec4 uRings[${MAX_RINGS}];
// Where gas comes up through the pool's floor all the time: x, z, a number of its own, strength.
uniform vec4 uSeeps[${MAX_SEEPS}];
${RIG_GLSL}
${FIELD_GLSL}
${BRINE_GLSL}

void main() {
  vec3 p = vWorld;
  vec3 toEye = cameraPosition - p;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 f = fieldAt(p.xz);
  vec4 fine = texture2D(tGrain, p.xz / 1.9);
  // The same shore the land paints: one line for both.
  float s = f.r + (fine.r - 0.5) * 0.1;
  if (s > 0.0) discard;

  // There is no wind: the brine lies as a mirror, and what moves on it has a cause. A slow heave of the whole surface, too low to see but
  // in what it mirrors; the rings that leave every place gas comes up; the rings of each dome; the rings round whatever stands in it.
  // Nothing in nature is ruffled evenly: the gas troubles the brine in patches some strides wide and leaves glass between them.
  vec4 patchy = texture2D(tGrain, p.xz / 37.0 + vec2(0.0009, 0.0005) * uTime);
  float ruffle = 0.3 + 1.25 * smoothstep(0.38, 0.7, patchy.r);
  // Two fields of low swell cross and never travel as one: the surface works, it does not slide.
  vec2 slope = ((texture2D(tGrain, p.xz / 5.3 + vec2(0.013, 0.008) * uTime).ba - 0.5) * 0.2 + (texture2D(tGrain, p.xz / 2.3 - vec2(0.011, 0.017) * uTime).ba - 0.5) * 0.16) * ruffle;
  // Close to, the skin is never glass: small wavelets from the gas cross it every way, two fields of them sliding through each other, so
  // that no crest travels and every slope winks. (The tile keeps its smaller copies: far off the wavelets close up to nothing.)
  float chop = smoothstep(60.0, 6.0, dist) * ruffle;
  vec4 rA = texture2D(tRipple, p.xz / 2.3 + vec2(0.031, 0.017) * uTime);
  vec4 rB = texture2D(tRipple, vec2(p.z, -p.x) / 1.37 - vec2(0.023, 0.039) * uTime);
  slope += ((rA.rg - 0.5) + (rB.ba - 0.5) * 0.7) * RIPPLE * chop;
  float pool = length(p.xz);
  if (pool < 16.0) {
    // Each seep sends out ring after ring: half a stride from crest to crest, 0.7 m a second, dying with the way they have come.
    for (int i = 0; i < ${MAX_SEEPS}; i++) {
      vec4 seep = uSeeps[i];
      vec2 d = p.xz - seep.xy;
      float r = length(d);
      float beat = 0.6 + 0.4 * sin(uTime * 0.9 + seep.z * 17.0);
      slope += d / max(r, 0.03) * cos(r * 15.0 - uTime * 10.5 + seep.z * 40.0) * seep.w * beat * smoothstep(0.05, 0.35, r) / (1.0 + 0.55 * r * r);
    }
    for (int i = 0; i < ${MAX_RINGS}; i++) {
      if (i >= uRingCount) break;
      vec4 ring = uRings[i];
      vec2 d = p.xz - ring.xy;
      float r = length(d);
      float q = r - ring.z;
      float wide = 0.16 + 0.05 * ring.z;
      float env = exp(-q * q / (wide * wide)) * ring.w;
      if (env < 0.003) continue;
      slope += d / max(r, 0.01) * env * sin(q * 14.0) * 0.26;
    }
  }
  // Whatever stands in the brine (the contact map has it) is ringed: the rings leave it slowly and die within a stride.
  float stood = contactDrawn(p);
  float ringed = smoothstep(0.0, 0.12, stood) * smoothstep(0.85, 0.35, stood);
  // What stands in the brine troubles it: the wavelets are steeper round it.
  slope *= 1.0 + 1.3 * ringed;
  vec2 lens = normalize(v.xz + vec2(1e-4));
  // (Broken arcs, not drawn circles: the body shifts its weight and each shift sends one low swell, bent by the swell already there.)
  slope -= lens * sin(stood * 11.0 + uTime * 2.1 + fine.r * 5.0 + patchy.g * 4.0) * WADER_RINGS * ringed * smoothstep(0.25, 0.6, fine.b + 0.3 * sin(uTime * 0.7 + patchy.b * 9.0));
  vec3 n = normalize(vec3(slope.x, 1.0, slope.y));

  // Scum: a pale pink froth that hugs the shore in a broken line, and rafts of it that turn slowly on the open brine.
  vec2 drift = vec2(0.006, 0.0035) * uTime;
  vec4 raft = texture2D(tGrain, p.xz / 6.1 + drift);
  vec4 fleck = texture2D(tGrain, p.xz / 0.57 + drift * 9.0);
  vec4 bubble = texture2D(tGrain, p.xz / 0.17 + drift * 30.0);
  float seen = smoothstep(70.0, 20.0, dist);
  // Where the big ones wade the bed lies a hand under the brine for metres: that is not a bank, and no scum gathers on it.
  float wade = smoothstep(4.0, 6.5, length(p.xz - uWade));
  float hug = smoothstep(-0.1 - 0.4 * smoothstep(0.42, 0.7, raft.r), -0.02, s) * mix(0.25, 1.0, wade);
  // The froth is its picture: bubbles and pink scum on black, shown where the froth gathers, and thickest where it gathers most.
  // Close to a lens the rafts of scum are seen for what they are; far off only the line at the shore is.
  float rafts = smoothstep(20.0, 8.0, dist);
  // (The rafts keep to the bank: out on the open brine they read as a speckle of noise.)
  float want = max(hug, RAFTS * mix(0.6, 0.8, rafts) * smoothstep(0.66 - 0.07 * rafts, 0.76 - 0.05 * rafts, fleck.g * 0.45 + raft.g * 0.55) * smoothstep(-1.1 - 0.5 * rafts, -0.2, s) * wade) * seen;
  vec3 scum = texture2D(tFroth, p.xz / 1.5 + drift * 3.0).rgb;
  float foam = want * smoothstep(0.03, 0.16, dot(scum, vec3(0.333)) - 0.2 * (1.0 - want) + (bubble.r - 0.5) * 0.06);
  vec4 froth = vec4(scum * 1.5 + 0.05, foam);
  // Dark clots carried on the slow drift.
  float clot = smoothstep(0.7, 0.76, bubble.r * 0.5 + fleck.g * 0.5) * smoothstep(0.5, 0.65, raft.r) * smoothstep(14.0, 6.0, dist);
  vec3 lit = brineShade(p, n, v, s, froth) * (1.0 - 0.4 * clot * (1.0 - foam));
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;

/** The brine's cut along the shore, for the depth the engine lays down first. */
export const BRINE_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform sampler2D tGrain;
${FIELD_GLSL}
void main() {
  float s = fieldAt(vWorld.xz).r + (texture2D(tGrain, vWorld.xz / 1.9).r - 0.5) * 0.1;
  if (s > 0.0) discard;
  gl_FragColor = vec4(0.0);
}`;

// A dome of gas under a skin of brine, a drop thrown from one, and the crown of a burst. One unit ball or one unit tube, placed for each
// by its instance matrix; aLife.x is 0 to 1 how far the dome has swollen (the skin thins as it swells), aLife.y a number of its own.
export const DOME_VERTEX = /* glsl */ `
attribute vec4 aLife;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vLife;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vLocal = position;
  vLife = aLife;
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const DOME_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vLife;
uniform sampler2D tGrain;
${RIG_GLSL}

void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, v) < 0.0) n = -n;
  // The skin drains from the crown toward the foot: thin and clear on top, thick and dark where it meets the pool. Through the thin top the
  // far wall of the dome shows, paler; across it lies the sky, as on any wet bubble.
  float top = smoothstep(0.1, 1.0, vLocal.y);
  vec4 g = texture2D(tGrain, vLocal.xz * 0.9 + vLife.y);
  float thin = clamp(top * (0.35 + 0.65 * vLife.x) + (g.r - 0.5) * 0.3, 0.0, 1.0);
  // The skin is a clear film of thick liquid: what is behind it shows through it, stained. It is thick and dark only where it is seen
  // edge on and where it meets the pool.
  vec3 albedo = mix(vec3(0.045, 0.006, 0.005), vec3(0.11, 0.022, 0.018), thin);
  vec4 grit = texture2D(tGrain, vLocal.xz * 3.3 + vLife.y * 7.0);
  float solid = 0.0;
  // Torn: the skin opens from one point on its side, the hole's edge ragged and rolled thick, until nothing of it stands.
  float rim = 0.0;
  if (vLife.w > 0.0) {
    vec3 from = normalize(vec3(cos(vLife.y * 40.0) * 0.6, 0.75, sin(vLife.y * 40.0) * 0.6));
    float open = dot(normalize(vLocal), from) + (g.g - 0.5) * 0.22 + (grit.r - 0.5) * 0.08;
    float gone = 1.0 - 2.3 * vLife.w * (0.6 + 0.4 * vLife.w);
    if (open > gone) discard;
    rim = smoothstep(gone - 0.1, gone, open);
    albedo = mix(albedo, vec3(0.03, 0.006, 0.005), rim);
  }
  n = normalize(n + vec3(g.b - 0.5, 0.0, g.a - 0.5) * 0.035);
  float foot = mix(0.5, 1.0, smoothstep(0.0, 0.35, vLocal.y));
  vec3 lit = albedo * skyIrradiance(n) * (skyOpen(vWorld) * foot / 3.14159);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  // The overcast is not even: the brighter quarter of it shows on the wet skin as one sharp window, and a second, faint, from the far wall.
  float toward = max(dot(r, normalize(vec3(-0.35, 0.8, 0.3))), 0.0);
  float window = 1.6 * smoothstep(0.985, 0.996, toward) + 0.12 * pow(toward, 40.0);
  float sheen = (0.012 + 0.2 * pow(1.0 - nv, 5.0)) * foot;
  vec3 mirrored = skyRadiance(r) * (sheen + window) * (1.0 - 0.7 * rim);
  // How much of what is behind the film is hidden: next to nothing through its face, most at its edge (the film seen along itself) and
  // at its foot, where it is the pool drawn up, and all of it at a torn hole's rolled rim.
  float along = pow(1.0 - nv, 2.2);
  float cover = clamp(0.1 + 0.2 * (1.0 - thin) + 0.75 * along + 0.8 * smoothstep(0.2, 0.02, vLocal.y), 0.0, 0.97);
  cover = max(cover, rim);
#ifdef DROP
  cover = 1.0;
#endif
  gl_FragColor = vec4((lit * cover + mirrored) * (1.0 - uSolo), cover);
}`;

// The crown: the torn skin of a dome, thrown up and outward as a ragged sheet. A unit tube (radius 1, y 0 to 1); aLife.x is its age in seconds,
// aLife.y its own number, aLife.z the dome's size in metres.
export const CROWN_VERTEX = /* glsl */ `
attribute vec4 aLife;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vLife;
void main() {
  float age = aLife.x;
  float size = aLife.z;
  float a = atan(position.z, position.x);
  float k = aLife.y * 6.283;
  // No two tongues of it alike: a few tall, most low, and none evenly spaced.
  float f = 0.42 + 0.3 * sin(a * 2.0 + k * 9.0) + 0.26 * sin(a * 5.0 - k * 4.0) * sin(a + k) + 0.2 * sin(a * 9.0 + k * 3.0) + 0.12 * sin(a * 17.0 + k * 7.0);
  float finger = pow(clamp(f, 0.04, 1.0), 1.6);
  float h = position.y;
  // The sheet leaves the rim at 3 m/s and leans outward as it climbs; it falls back under its own weight.
  float up = sqrt(size / 0.4) * (2.9 * age - 4.9 * age * age) * (0.3 + 0.7 * finger);
  float out_ = size * (0.85 + (0.7 + 1.1 * finger) * age * (0.25 + 0.75 * h * h));
  float wob = 1.0 + 0.08 * sin(a * 7.0 + k * 5.0) + 0.05 * sin(a * 13.0 - k * 2.0);
  vec3 q = vec3(position.x * out_ * wob, max(up, 0.0) * h, position.z * out_ * wob);
  vec4 w = modelMatrix * instanceMatrix * vec4(q, 1.0);
  vWorld = w.xyz;
  vLocal = vec3(a, h, finger);
  vLife = aLife;
  vNormal = normalize(vec3(position.x, 0.35, position.z));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const CROWN_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vLife;
uniform sampler2D tGrain;
${RIG_GLSL}

void main() {
  // The top of the sheet is torn into tongues, and holes open in it as it stretches.
  vec4 g = texture2D(tGrain, vec2(vLocal.x * 0.6 + vLife.y, vLocal.y * 0.7));
  float tip = 0.35 + 0.65 * vLocal.z;
  float torn = vLocal.y - tip + (g.r - 0.5) * 0.45 + vLife.x * 0.7 * g.g;
  if (torn > 0.0 || vLife.x <= 0.0) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 radial = normalize(vNormal);
  if (dot(radial, v) < 0.0) radial = -radial;
  // The same thick liquid as the dome's skin, thrown: a film where it is stretched, a rolled lip where it ends (surface tension gathers
  // the edge into a bead that looks up at the sky), dark and solid at the foot where it is still the pool.
  float lip = smoothstep(-0.22, 0.0, torn);
  float thick = clamp(1.0 - vLocal.y / tip, 0.0, 1.0);
  vec3 n = normalize(mix(radial, vec3(0.0, 1.0, 0.0), 0.45 * lip * lip) + vec3(g.b - 0.5, 0.0, g.a - 0.5) * 0.14);
  vec3 albedo = mix(vec3(0.25, 0.055, 0.045), vec3(0.07, 0.01, 0.008), max(thick * 0.8, lip * 0.5));
  vec3 lit = albedo * skyIrradiance(n) * (skyOpen(vWorld) / 3.14159);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  float toward = max(dot(r, normalize(vec3(-0.35, 0.8, 0.3))), 0.0);
  float window = 0.9 * smoothstep(0.988, 0.997, toward) + 0.06 * pow(toward, 30.0);
  vec3 mirrored = skyRadiance(r) * (0.014 + 0.09 * pow(1.0 - nv, 5.0) + window * (1.0 - 0.85 * lip));
  float cover = clamp(0.62 + 0.35 * thick + 0.4 * lip + 0.3 * pow(1.0 - nv, 2.0), 0.0, 0.97);
  gl_FragColor = vec4((lit * cover + mirrored) * (1.0 - uSolo), cover);
}`;
