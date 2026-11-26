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
  float closeBy = smoothstep(40.0, 6.0, dist);
  vec2 slope = (texture2D(tGrain, p.xz / 5.3 + vec2(0.013, 0.008) * uTime).ba - 0.5) * 0.022 + (texture2D(tGrain, p.xz / 3.1 - vec2(0.011, 0.017) * uTime).ba - 0.5) * 0.018;
  // Close to, a fine tremble from the gas: short crossing trains that the heave bends.
  if (dist < 22.0) {
    float chop = smoothstep(22.0, 6.0, dist);
    vec4 slow = texture2D(tGrain, p.xz / 9.0 + vec2(0.002, 0.001) * uTime);
    vec2 bent = p.xz + (slow.rg - 0.5) * 0.4;
    float ph = slow.r * 6.0;
    slope += vec2(0.83, 0.56) * cos(dot(bent, vec2(0.83, 0.56)) * 23.0 - uTime * 11.0 + ph) * 0.006 * chop;
    slope += vec2(-0.37, 0.93) * cos(dot(bent, vec2(-0.37, 0.93)) * 37.0 - uTime * 14.0 - ph * 1.7) * 0.004 * chop;
    slope += vec2(0.26, -0.97) * cos(dot(bent, vec2(0.26, -0.97)) * 13.0 - uTime * 8.3 + ph * 0.6) * 0.008 * chop;
  }
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
      slope += d / max(r, 0.01) * env * sin(q * 14.0) * 0.14;
    }
  }
  // Whatever stands in the brine (the contact map has it) is ringed: the rings leave it slowly and die within a stride.
  float stood = contactDrawn(p);
  float ringed = smoothstep(0.0, 0.12, stood) * smoothstep(0.85, 0.35, stood);
  vec2 lens = normalize(v.xz + vec2(1e-4));
  slope -= lens * sin(stood * 21.0 + uTime * 2.6 + fine.g * 2.0) * 0.035 * ringed;
  vec3 n = normalize(vec3(slope.x, 1.0, slope.y));

  // Scum: a pale pink froth that hugs the shore in a broken line, and rafts of it that turn slowly on the open brine.
  vec2 drift = vec2(0.006, 0.0035) * uTime;
  vec4 raft = texture2D(tGrain, p.xz / 6.1 + drift);
  vec4 fleck = texture2D(tGrain, p.xz / 0.57 + drift * 9.0);
  vec4 bubble = texture2D(tGrain, p.xz / 0.17 + drift * 30.0);
  float seen = smoothstep(70.0, 20.0, dist);
  float hug = smoothstep(-0.16 - 0.5 * smoothstep(0.5, 0.75, raft.r), -0.02, s);
  float foam = smoothstep(0.5, 0.62, fleck.r * 0.5 + bubble.g * 0.25 + hug * 0.42 - 0.12) * hug;
  foam = max(foam, smoothstep(0.66, 0.74, fleck.g * 0.5 + raft.g * 0.38 + bubble.r * 0.12) * smoothstep(-2.5, -0.3, s));
  foam *= seen * (0.55 + 0.45 * bubble.r);
  // Dark clots carried on the slow drift.
  float clot = smoothstep(0.7, 0.76, bubble.r * 0.5 + fleck.g * 0.5) * smoothstep(0.5, 0.65, raft.r) * smoothstep(14.0, 6.0, dist);
  vec3 lit = brineShade(p, n, v, s, foam) * (1.0 - 0.4 * clot * (1.0 - foam));
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
  // What is seen is mostly the brine behind the skin; the thin crown lets the pale air inside show.
  vec3 albedo = mix(vec3(0.062, 0.014, 0.012), vec3(0.17, 0.092, 0.088), thin * thin);
  // Grit and clots carried in the film, and the streaks of its draining.
  vec4 grit = texture2D(tGrain, vLocal.xz * 3.3 + vLife.y * 7.0);
  albedo *= 1.0 - 0.5 * smoothstep(0.6, 0.68, grit.g) - 0.3 * smoothstep(0.55, 0.75, g.g) * (1.0 - top);
  // At its foot the skin is the pool itself, drawn up: no line where one ends and the other starts.
  albedo = mix(albedo, vec3(0.058, 0.0095, 0.008), smoothstep(0.16, 0.0, vLocal.y));
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
  n = normalize(n + vec3(g.b - 0.5, 0.0, g.a - 0.5) * 0.1);
  float foot = mix(0.5, 1.0, smoothstep(0.0, 0.35, vLocal.y));
  vec3 lit = albedo * skyIrradiance(n) * (skyOpen(vWorld) * foot / 3.14159);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  // The overcast is not even: a brighter break in it shows on the skin as a soft window.
  float window = (0.12 * pow(max(dot(r, normalize(vec3(-0.35, 0.8, 0.3))), 0.0), 10.0) + 0.7 * pow(max(dot(r, normalize(vec3(-0.35, 0.8, 0.3))), 0.0), 120.0)) * (0.4 + 1.2 * g.r) + 0.4 * pow(max(dot(r, normalize(vec3(0.5, 0.6, -0.4))), 0.0), 200.0);
  lit += skyRadiance(r) * ((0.03 + 0.34 * pow(1.0 - nv, 3.0)) * (0.6 + 0.8 * g.r) * foot + window * 1.2) * (1.0 - 0.7 * rim);
  gl_FragColor = vec4(rigOut(lit), 1.0);
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
  // The sheet leaves the rim at 2 m/s and leans outward as it climbs; it falls back under its own weight.
  float up = sqrt(size / 0.4) * (2.1 * age - 4.9 * age * age) * (0.25 + 0.75 * finger);
  float out_ = size * (0.85 + (1.1 + 1.6 * finger) * age * (0.3 + 0.7 * h * h));
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
  // The top of the sheet is torn into fingers and holes open in it as it stretches.
  vec4 g = texture2D(tGrain, vec2(vLocal.x * 0.6 + vLife.y, vLocal.y * 0.7));
  float torn = vLocal.y - (0.35 + 0.65 * vLocal.z) + (g.r - 0.5) * 0.7 + vLife.x * 0.9 * g.g;
  if (torn > 0.0 || vLife.x <= 0.0) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, v) < 0.0) n = -n;
  // A sheet of brine: dark where it is thick at the foot, clearer and pinker toward its torn edge, wet all over.
  float edge = smoothstep(-0.35, 0.0, torn);
  vec3 albedo = mix(vec3(0.06, 0.013, 0.011), vec3(0.19, 0.06, 0.053), edge * edge);
  n = normalize(n + vec3(g.b - 0.5, (g.r - 0.5) * 0.6, g.a - 0.5) * 0.5);
  vec3 lit = albedo * skyIrradiance(n) * (skyOpen(vWorld) / 3.14159);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  float window = pow(max(dot(r, normalize(vec3(-0.35, 0.8, 0.3))), 0.0), 50.0);
  lit += skyRadiance(r) * (0.015 + 0.12 * pow(1.0 - nv, 4.0) + window * 0.7);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;
