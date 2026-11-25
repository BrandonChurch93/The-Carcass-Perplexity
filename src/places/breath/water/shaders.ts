// The water in the light of the rig: what the sky puts on it, what shows through it, and the low sun's glitter.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { SUN_GLSL } from './sun';

export const VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform sampler2D tBedNear;
uniform sampler2D tBedFar;
uniform vec4 uBedNear;
uniform vec4 uBedFar;
uniform sampler2D tWave;
uniform float uSea;
${NOISE_GLSL}
${RIG_GLSL}
${SUN_GLSL}
void main() {
  vec2 xz = vWorld.xz;
  vec2 un = (xz - uBedNear.xy) * uBedNear.z;
  vec2 uf = (xz - uBedFar.xy) * uBedFar.z;
  vec2 edge = min(un, 1.0 - un);
  float inNear = smoothstep(0.0, 0.02, min(edge.x, edge.y));
  vec4 bedN = texture2D(tBedNear, un);
  vec4 bedF = texture2D(tBedFar, uf);
  vec4 bed = mix(bedF, bedN, inNear);
  if (bed.g > 0.5) discard;
  float depth = bed.r * 2.5 - 0.5;
  if (depth < -0.03) discard;

  vec3 toEye = cameraPosition - vWorld;
  float far = length(toEye);
  vec3 v = toEye / far;

  // Two sheets of small waves crossing, carried down the channel; a third, slow and large, so the far water is not one tone.
  vec2 drift = vec2(0.25, 0.97);
  vec2 g1 = texture2D(tWave, xz * 0.21 + drift * uTime * 0.085).rg - 0.5;
  vec2 g2 = texture2D(tWave, vec2(xz.y, -xz.x) * 0.067 + vec2(0.31, -0.17) * uTime * 0.05).rg - 0.5;
  vec3 g3 = texture2D(tWave, xz * 0.0113 + drift * uTime * 0.006).rgb - 0.5;
  // Shallow water over a bed is nearly still: the waves grow with the depth.
  float deep = smoothstep(0.0, 0.5, depth);
  vec2 slope = (g1 * 0.16 + g2 * 0.2) * (0.35 + 0.65 * deep) + g3.rg * 0.1;
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));

  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.02;
  r = normalize(r);
  vec3 mirror = skyRadiance(r) * skyOpen(vWorld);
  mirror += sunGlitter(r, n, v, far, xz);

  // What is in the water: fine silt lit by the sky. The bed shows through it where it is thin.
  float path = depth / max(nv, 0.25);
  vec3 through = exp(-path * vec3(1.9, 0.75, 0.9));
  float clear = dot(through, vec3(0.3, 0.5, 0.2));
  vec3 body = vec3(0.07, 0.2, 0.19) * skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 * skyOpen(vWorld);
  // The line of weed and damp at the water's edge.
  float rim = smoothstep(0.06, 0.0, depth);

  vec3 colour = fresnel * mirror + (1.0 - fresnel) * (1.0 - clear) * body;
  float alpha = 1.0 - (1.0 - fresnel) * clear * (1.0 - 0.35 * rim);
  alpha *= smoothstep(-0.03, 0.01, depth);
  colour *= smoothstep(-0.03, 0.01, depth);
  float keep = 1.0 - uSolo;
  gl_FragColor = vec4(rigOut(colour), alpha * keep);
}`;
