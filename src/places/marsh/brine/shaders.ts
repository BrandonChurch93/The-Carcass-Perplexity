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

export const BRINE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform sampler2D tGrain;
uniform int uRingCount;
// Where the seep's mouth is, on the pool's floor.
uniform vec2 uSeep;
// x, z of the middle, radius of the front in metres, strength.
uniform vec4 uRings[${MAX_RINGS}];
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

  // Thick brine hardly ripples: a slow crawl of two swells, the rings that leave the seep's mouth, and the rings of every dome that has burst.
  float closeBy = smoothstep(40.0, 6.0, dist);
  vec2 slope = (texture2D(tGrain, p.xz / 3.7 + vec2(0.011, 0.007) * uTime).ba - 0.5) * 0.09
    + (texture2D(tGrain, p.xz / 0.83 - vec2(0.013, 0.021) * uTime).ba - 0.5) * 0.22 * closeBy;
  vec2 fromSeep = p.xz - uSeep.xy;
  float reach = length(fromSeep);
  if (reach < 16.0) {
    float wob = texture2D(tGrain, p.xz / 9.0).r;
    slope += fromSeep / max(reach, 0.01) * sin(reach * 4.4 - uTime * 2.3 + wob * 5.0) * (0.05 + 0.1 * closeBy) * smoothstep(0.3, 1.5, reach) * smoothstep(13.0, 4.0, reach);
    for (int i = 0; i < ${MAX_RINGS}; i++) {
      if (i >= uRingCount) break;
      vec4 ring = uRings[i];
      vec2 d = p.xz - ring.xy;
      float r = length(d);
      float q = r - ring.z;
      float wide = 0.16 + 0.05 * ring.z;
      float env = exp(-q * q / (wide * wide)) * ring.w;
      if (env < 0.003) continue;
      slope += d / max(r, 0.01) * env * sin(q * 14.0) * 0.5;
    }
  }
  vec3 n = normalize(vec3(slope.x, 1.0, slope.y));
  // Scum in rafts that drift, thickest along the shores.
  vec4 raft = texture2D(tGrain, p.xz / 6.1 + vec2(0.004, 0.0025) * uTime);
  vec4 fleck = texture2D(tGrain, p.xz / 0.57 + vec2(0.004, 0.0025) * uTime * 10.7);
  float foam = 0.75 * smoothstep(0.72, 0.9, raft.g * 0.35 + fleck.r * 0.65 + 0.22 * smoothstep(-1.3, -0.1, s)) * (0.3 + 0.7 * fleck.g) * smoothstep(120.0, 30.0, dist);
  vec3 lit = brineShade(p, n, v, s, foam);
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
  vec3 albedo = mix(vec3(0.05, 0.011, 0.0095), vec3(0.15, 0.062, 0.057), thin * thin);
  n = normalize(n + vec3(g.b - 0.5, 0.0, g.a - 0.5) * 0.1);
  float foot = mix(0.5, 1.0, smoothstep(0.0, 0.35, vLocal.y));
  vec3 lit = albedo * skyIrradiance(n) * (skyOpen(vWorld) * foot / 3.14159);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  // The overcast is not even: a brighter break in it shows on the skin as a soft window.
  float window = pow(max(dot(r, normalize(vec3(-0.35, 0.8, 0.3))), 0.0), 60.0) + 0.5 * pow(max(dot(r, normalize(vec3(0.5, 0.6, -0.4))), 0.0), 200.0);
  lit += skyRadiance(r) * ((0.025 + 0.55 * pow(1.0 - nv, 2.5)) * foot + window * 1.4);
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
  float finger = 0.55 + 0.45 * sin(a * 5.0 + aLife.y * 9.0) * sin(a * 3.0 - aLife.y * 4.0) + 0.25 * sin(a * 11.0 + aLife.y * 3.0);
  float h = position.y;
  // The sheet leaves the rim at 3 m/s and leans outward as it climbs; it falls back under its own weight.
  float up = sqrt(size / 0.4) * (3.0 * age - 4.9 * age * age) * (0.45 + 0.55 * finger);
  float out_ = size * (0.85 + 1.5 * age * (0.4 + 0.6 * h));
  vec3 q = vec3(position.x * out_, max(up, 0.0) * h, position.z * out_);
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
  float torn = vLocal.y - (0.5 + 0.5 * vLocal.z) + (g.r - 0.5) * 0.5 + vLife.x * 0.5 * g.g;
  if (torn > 0.0 || vLife.x <= 0.0) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, v) < 0.0) n = -n;
  // A sheet of brine: dark where it is thick at the foot, clearer and pinker toward its torn edge, wet all over.
  float edge = smoothstep(-0.35, 0.0, torn);
  vec3 albedo = mix(vec3(0.055, 0.012, 0.01), vec3(0.2, 0.075, 0.068), edge * edge);
  n = normalize(n + vec3(g.b - 0.5, (g.r - 0.5) * 0.6, g.a - 0.5) * 0.9);
  vec3 lit = albedo * skyIrradiance(n) * (skyOpen(vWorld) / 3.14159);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  float window = pow(max(dot(r, normalize(vec3(-0.35, 0.8, 0.3))), 0.0), 40.0);
  lit += skyRadiance(r) * (0.03 + 0.5 * pow(1.0 - nv, 3.0) + window * 1.2);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;
