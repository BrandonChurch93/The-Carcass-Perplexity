// The plume of a stalk as the Builder's photograph of one: a fan of wet crimson filaments on cards that stand round the mouth, every card bent by
// the air in the vertex shader. Drawn in, the same cards close to a pointed bundle.
import { RIG_GLSL } from '../shared/glsl';
import { OPEN_GLSL } from './shaders';

export const LOCK_VERTEX = /* glsl */ `
attribute vec4 aTop;
attribute vec4 aAx;
attribute vec4 aLay;
attribute vec4 aVar;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vOut;
varying vec4 vUv;
${OPEN_GLSL}
void main() {
  float open = plumeOpen(aLay.z, aAx.w, aLay.w);
  vec3 A = aAx.xyz;
  vec3 W = normalize(cross(A, vec3(0.0013, 1.0, 0.0021)));
  vec3 U = cross(W, A);
  vec3 R = U * cos(aLay.x) + W * sin(aLay.x);
  vec3 N = cross(A, R);
  vec3 up = A * cos(aLay.y) + N * sin(aLay.y);
  vec3 nn = N * cos(aLay.y) - A * sin(aLay.y);
  float u = position.x;
  float v = position.y;
  float H = aTop.w;
  float shut = 1.0 - open;
  // Drawn in, the fan closes to a pointed bundle that stands in the mouth.
  float wide = aVar.y * mix(1.0, 0.36 * (1.0 - 0.8 * v * v), shut);
  vec3 p = R * (u * wide * H) + up * (v * mix(1.0, 0.85, shut) * H - 0.035);
  // The air has combed it: the further out the further over, and the wet ends hang.
  float sa = aLay.w * 40.0;
  vec3 sweep = vec3(cos(sa), 0.0, sin(sa));
  float reach = open * v * v;
  p += sweep * (aVar.z * H * reach);
  p.y -= 0.3 * aVar.z * H * reach * v;
  float gust = sin(uSeconds * 1.1 + aAx.w + dot(aTop.xz, vec2(0.21, 0.17))) + 0.5 * sin(uSeconds * 2.3 + aAx.w * 1.7);
  p += vec3(0.8, 0.0, 0.6) * (0.05 * H * reach * gust);
  // Each lock swings by itself, slowly, because it is wet.
  float own = aVar.w * 40.0 + u * 9.0;
  p += (R * sin(uSeconds * 2.6 + own) + nn * cos(uSeconds * 2.1 + own * 1.3)) * (0.022 * H * reach);
  vWorld = aTop.xyz + p;
  vNormal = nn;
  vOut = normalize(p + A * (0.1 * H));
  vUv = vec4(0.5 + u * 0.96 * aVar.x, 0.115 + v * 0.855, v, open);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

const CUT = /* glsl */ `
  vec4 t = texture2D(tLock, vUv.xy);
  float luma = max(t.r, max(t.g, t.b));
  // Far off a filament is thinner than a pixel: it is kept at a lower light, or the plume would thin to nothing.
  if (luma < mix(0.07, 0.034, smoothstep(3.0, 30.0, distance(cameraPosition, vWorld)))) discard;
`;

export const LOCK_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vOut;
varying vec4 vUv;
uniform sampler2D tLock;
${RIG_GLSL}
void main() {
${CUT}
  vec3 v = normalize(cameraPosition - vWorld);
  // The hue is the photograph's; its light is taken out of it at the edge of a filament, where the black round it would draw an outline.
  vec3 hue = t.rgb / max(luma, 0.02);
  float away = smoothstep(3.0, 30.0, distance(cameraPosition, vWorld));
  vec3 albedo = mix(vec3(dot(hue, vec3(0.3, 0.5, 0.2))), hue, 0.88) * (0.028 + 0.15 * mix(smoothstep(0.02, 0.5, luma), 0.75, away));
  float bead = smoothstep(0.55, 0.9, min(t.g, t.b));
  vec3 n = normalize(vNormal * sign(dot(vNormal, v) + 1e-5) * 0.6 + vOut + vec3(0.0, 0.3, 0.0) + v * 0.7);
  float occ = mix(0.42, 1.0, smoothstep(0.0, 0.6, vUv.z)) * mix(0.6, 1.0, vUv.w);
  vec3 c = rigShade(vWorld, n, v, albedo, mix(0.96, 0.4, bead), occ);
  // Wet and thin: the sky behind a filament comes through it.
  c += albedo * skyIrradiance(-n) / 3.14159 * 0.3 * occ * skyOpen(vWorld);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const LOCK_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec4 vUv;
uniform sampler2D tLock;
void main() {
${CUT}
  gl_FragColor = vec4(0.0);
}`;
