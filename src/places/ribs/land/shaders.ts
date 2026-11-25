// The surfaces of the land. Each takes its light from the rig and ends in rigOut.
import { BED_GLSL, NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const UV_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// A slope read from a data picture (x, y) laid on a surface along its u and v.
const BUMP_GLSL = /* glsl */ `
vec3 bump(vec3 n, vec3 p, vec2 uv, vec2 g) {
  vec3 dp1 = dFdx(p);
  vec3 dp2 = dFdy(p);
  vec2 du1 = dFdx(uv);
  vec2 du2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, n);
  vec3 dp1perp = cross(n, dp1);
  vec3 t = dp2perp * du1.x + dp1perp * du2.x;
  vec3 b = dp2perp * du1.y + dp1perp * du2.y;
  float inv = inversesqrt(max(max(dot(t, t), dot(b, b)), 1e-12));
  return normalize(n + (t * g.x - b * g.y) * inv);
}`;

const HEAD = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
${RIG_GLSL}
${NOISE_GLSL}
${BUMP_GLSL}`;

// Pale bedded stone above the weed line, white streaks under the roosts, rust lichen where a face sees the sky; black and wet below the line.
export const ROCK_FRAGMENT = /* glsl */ `
${HEAD}
varying vec2 vUv;
uniform sampler2D tRock;
uniform sampler2D tRockN;
uniform sampler2D tWeed;
uniform float uTide;
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 ub = vUv / vec2(96.0, 48.0);
  vec2 ud = vUv / vec2(12.0, 6.0);
  vec3 big = texture2D(tRock, ub).rgb;
  vec3 det = texture2D(tRock, ud).rgb;
  vec3 nhb = texture2D(tRockN, ub).rgb;
  vec3 nhd = texture2D(tRockN, ud).rgb;
  vec3 n = bump(n0, vWorld, ud, (nhd.xy - 0.5) * 2.4 + (nhb.xy - 0.5) * 1.6);
  vec3 albedo = det * big * 4.6;
  float y = vWorld.y;
  float tide = uTide + 1.0 + 7.0 * (vnoise(vWorld.xz / 13.0) - 0.5) + 3.0 * (vnoise(vWorld.xz / 2.7) - 0.5) + 3.0 * (nhd.z - 0.5);
  float weed = smoothstep(tide + 0.5, tide - 0.5, y);
  float stain = smoothstep(tide + 16.0, tide, y);
  // White under the roosts: long runs down the face, thicker in some places than others.
  float run = vnoise(vec2(vUv.x * 0.8, vUv.y * 0.03)) * (0.4 + 0.6 * vnoise(vUv * vec2(0.06, 0.04) + 3.0));
  float white = smoothstep(0.34, 0.62, run + 0.3 * (nhd.z - 0.5)) * (1.0 - stain);
  float patches = 0.6 * vnoise(vUv * 0.07 + 9.0) + 0.4 * vnoise(vUv * 0.6);
  float lichen = smoothstep(0.56, 0.72, patches + 0.25 * (nhd.z - 0.5)) * smoothstep(-0.3, 0.5, n0.y) * (1.0 - stain);
  albedo = mix(albedo, vec3(0.5, 0.24, 0.07) * (0.5 + big.r * 2.0), 0.55 * lichen);
  albedo = mix(albedo, vec3(0.62, 0.61, 0.57), 0.5 * white);
  albedo *= mix(1.0, 0.4, stain);
  vec3 wc = texture2D(tWeed, vUv / 7.0).rgb;
  albedo = mix(albedo, wc * 0.9, weed);
  float rough = mix(0.9, 0.38, max(weed, 0.6 * stain));
  float occ = (0.55 + 0.45 * smoothstep(0.25, 0.6, nhd.z)) * (0.7 + 0.3 * smoothstep(0.3, 0.6, nhb.z));
  gl_FragColor = vec4(rigOut(rigShade(vWorld, n, v, albedo, rough, occ)), 1.0);
}`;

// The hanging weed: black and wet, olive and ochre where a frond turns to the light.
export const WEED_FRAGMENT = /* glsl */ `
${HEAD}
varying vec2 vUv;
uniform sampler2D tWeed;
uniform sampler2D tWeedN;
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 ud = vUv / 7.0;
  vec2 ub = vUv / vec2(28.0, 37.0) + 0.37;
  vec3 det = texture2D(tWeed, ud).rgb;
  vec3 big = texture2D(tWeed, ub).rgb;
  vec3 nh = texture2D(tWeedN, ud).rgb;
  vec3 n = bump(n0, vWorld, ud, (nh.xy - 0.5) * 3.0);
  float mass = dot(big, vec3(0.3, 0.5, 0.2)) / 0.055;
  vec3 albedo = det * (0.45 + 0.55 * mass);
  float rough = 0.3 + 0.25 * nh.z;
  float occ = 0.45 + 0.55 * smoothstep(0.2, 0.62, nh.z);
  gl_FragColor = vec4(rigOut(rigShade(vWorld, n, v, albedo, rough, occ)), 1.0);
}`;

// The floor: wet sand with ripple marks, drifts of shingle on what stands highest, dark and mirror wet toward the pools.
export const GROUND_FRAGMENT = /* glsl */ `
${HEAD}
${BED_GLSL}
uniform sampler2D tSand;
uniform sampler2D tSandN;
uniform float uPool;
void main() {
  vec2 xz = vWorld.xz;
  vec3 v = normalize(cameraPosition - vWorld);
  float away = length(cameraPosition - vWorld);
  float close = 1.0 - smoothstep(60.0, 260.0, away);
  vec2 ud = xz / 4.3;
  vec2 ub = xz.yx / 37.0 + 0.37;
  vec3 det = texture2D(tSand, ud).rgb;
  vec3 big = texture2D(tSand, ub).rgb;
  vec3 nh = texture2D(tSandN, ud).rgb;
  float h = vWorld.y + bedFine(xz) * close + 0.06 * (nh.z - 0.5);
  float over = h - uPool;
  // Ripple marks across the run of the tide, bent, coming and going.
  float bend = 2.5 * vnoise(xz * 0.05) + 0.6 * vnoise(xz * 0.31);
  float phase = (xz.y * 0.94 + xz.x * 0.34) * 9.0 + bend * 6.0;
  float marks = smoothstep(0.35, 0.65, vnoise(xz * 0.021 + 5.0)) * close * smoothstep(1.2, 0.1, over);
  vec2 g = (nh.xy - 0.5) * 2.2;
  vec3 n = normalize(vNormal + vec3(g.x, 0.0, -g.y) * 0.5 + vec3(0.34, 0.0, 0.94) * (cos(phase) * 0.22 * marks));
  vec3 albedo = det * (0.5 + 0.5 * big / 0.12);
  // Shingle: pale and dry on the bars.
  float bar = smoothstep(0.25, 0.75, over + 0.5 * (vnoise(xz * 0.09) - 0.5));
  albedo *= mix(0.62, 1.25, bar);
  float wet = smoothstep(0.5, 0.03, over);
  float rough = mix(0.8, 0.1, wet * (0.55 + 0.45 * smoothstep(0.45, 0.6, nh.z)));
  n = normalize(mix(n, normalize(vNormal), 0.6 * wet));
  float occ = 0.6 + 0.4 * smoothstep(0.2, 0.6, nh.z);
  gl_FragColor = vec4(rigOut(rigShade(vWorld, n, v, albedo, rough, occ)), 1.0);
}`;

// Loose rock on the floor: dark and wet, weed on what faces up.
export const BOULDER_FRAGMENT = /* glsl */ `
${HEAD}
uniform sampler2D tBoulder;
uniform sampler2D tBoulderN;
uniform sampler2D tWeed;
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 us = vec2(vWorld.x + vWorld.z * 0.8, vWorld.y * 1.2 + vWorld.z * 0.3) / 2.6;
  vec2 ut = vWorld.xz / 3.1;
  vec3 side = texture2D(tBoulder, us).rgb;
  vec3 nh = texture2D(tBoulderN, us).rgb;
  vec3 wc = texture2D(tWeed, ut).rgb;
  vec3 n = bump(n0, vWorld, us, (nh.xy - 0.5) * 2.6);
  float cover = smoothstep(0.1, 0.6, n0.y + 0.5 * (vnoise(vWorld.xz * 0.9) - 0.5) + 0.3 * (nh.z - 0.5));
  vec3 albedo = mix(side * 1.6, wc * 1.2, cover);
  float rough = mix(0.45, 0.35, cover);
  float occ = 0.5 + 0.5 * smoothstep(0.2, 0.6, nh.z);
  gl_FragColor = vec4(rigOut(rigShade(vWorld, n, v, albedo, rough, occ)), 1.0);
}`;
