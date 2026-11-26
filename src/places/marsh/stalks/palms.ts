// The stalks that no lens stands among, each drawn from the Builder's photograph of a whole one: its trunk on a card that turns about the
// stalk's own line to face the lens, shaded as the round thing it is, and its mop on two more, one of them the other way round and behind.
import { RIG_GLSL } from '../shared/glsl';
import { OPEN_GLSL } from './shaders';

export const PALM_VERTEX = /* glsl */ `
attribute vec4 aBase;
attribute vec4 aAxis;
attribute vec4 aKind;
varying vec3 vWorld;
varying vec3 vRight;
varying vec4 vUv;
varying vec4 vKind;
${OPEN_GLSL}
void main() {
  float h = aBase.w;
  float D = 2.0 * aAxis.w;
  float kind = aKind.x;
  float seed = aKind.w;
  float lean = aAxis.z + 0.01 * sin(uSeconds * 0.7 + aKind.y);
  vec3 A = vec3(aAxis.x * sin(lean), cos(lean), aAxis.y * sin(lean));
  vec3 U = vec3(aAxis.x * cos(lean), -sin(lean), aAxis.y * cos(lean));
  vec3 W = vec3(-aAxis.y, 0.0, aAxis.x);
  // No stalk is straight: each has grown toward its own light and sagged under its own salt. And the air leans on the top of it.
  float ba = seed * 37.0;
  vec3 bowv = (U * cos(ba) + W * sin(ba)) * (0.05 + 0.2 * fract(seed * 91.3)) * h;
  float gust = sin(uSeconds * 1.1 + aKind.y + dot(aBase.xz, vec2(0.21, 0.17))) + 0.5 * sin(uSeconds * 2.3 + aKind.y * 1.7);
  vec3 wind = vec3(0.8, 0.0, 0.6);
  float piece = position.z;
  float t = piece < 0.5 ? position.y : 1.0;
  vec3 c = aBase.xyz + A * (t * h) + bowv * t * t + wind * (0.012 * h * t * t * gust);
  vec3 T = normalize(A * h + 2.0 * bowv * t);
  vec3 toCam = normalize(cameraPosition - c);
  vec3 p;
  if (piece < 0.5) {
    vRight = normalize(cross(T, toCam));
    p = c + vRight * (position.x * 1.56 * D);
    vUv = vec4(position.x * 0.23, t * h / (10.2 * D), 0.0, t);
  } else {
    float open = plumeOpen(kind, aKind.y, seed);
    float k = clamp(h / (13.0 * D), 0.9, 1.7) * (kind > 2.5 ? 0.7 : 1.0) * (kind > 1.5 && kind < 2.5 ? 0.0 : 1.0) * (piece > 1.5 ? 0.8 : 1.0);
    float flip = (fract(seed * 23.7) < 0.5 ? -1.0 : 1.0) * (piece > 1.5 ? -1.0 : 1.0);
    vec2 q = vec2(mix(0.10, 0.94, position.x + 0.5), mix(0.50, 1.0, position.y));
    vec3 upv = normalize(T + vec3(0.0, 0.6, 0.0));
    vRight = normalize(cross(upv, toCam));
    float reach = clamp((q.y - 0.535) / 0.4, 0.0, 1.0);
    reach *= reach;
    p = c + vRight * ((q.x - 0.42) / 0.147 * D * k * flip * mix(0.3, 1.0, open)) + upv * ((q.y - 0.535) * 10.2 * D * k * mix(0.55, 1.0, open));
    p += wind * (0.3 * D * k * reach * gust) + vRight * (0.12 * D * k * reach * sin(uSeconds * 2.6 + seed * 40.0 + q.x * 9.0));
    p += toCam * (piece > 1.5 ? -0.03 : 0.012);
    vUv = vec4(q, piece, flip);
  }
  vWorld = p;
  vKind = vec4(kind, h, D, seed);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const CUT = /* glsl */ `
  vec2 uv = vUv.xy;
  if (vUv.z < 0.5) {
    // The photographed trunk is as long as five of its widths: a taller one runs up it and down it again.
    float w = vUv.y;
    float m = mod(max(w - 0.48, 0.0), 0.84);
    float pv = w <= 0.48 ? 0.02 + w : m < 0.42 ? 0.5 - m : 0.08 + (m - 0.42);
    uv = vec2(mix(0.449, 0.413, smoothstep(0.1, 0.4, pv)) + vUv.x, pv);
    // A broken one ends in a torn rim.
    float tear = 0.5 + 0.3 * sin(vUv.x * 90.0 + vKind.w * 50.0) + 0.2 * sin(vUv.x * 210.0 + vKind.w * 90.0);
    if (vKind.x > 1.5 && vKind.x < 2.5 && vUv.w > 1.0 - 0.09 / vKind.y * tear) discard;
  }
  vec4 t = texture2D(tStalk, uv);
  float cover = texture2D(tStalkA, uv).r;
  float away = smoothstep(6.0, 60.0, distance(cameraPosition, vWorld));
  if (cover < mix(0.5, 0.2, away)) discard;
`;

export const PALM_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vRight;
varying vec4 vUv;
varying vec4 vKind;
uniform sampler2D tStalk;
uniform sampler2D tStalkA;
${RIG_GLSL}
void main() {
${CUT}
  if (uMirror > 0.5 && vWorld.y < -0.015) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  float luma = max(t.r, max(t.g, t.b));
  // The hue is the photograph's; its light is taken out of it at an edge, where the black round it would draw an outline.
  vec3 hue = t.rgb / max(luma, 0.03);
  float red = smoothstep(0.25, 0.6, (t.r - t.g) / max(t.r, 0.03));
  vec3 pale = mix(vec3(1.0), hue, 0.6) * (0.03 + 0.3 * smoothstep(0.02, 0.7, luma));
  vec3 crimson = mix(vec3(dot(hue, vec3(0.3, 0.5, 0.2))), hue, 0.9) * (0.03 + 0.2 * smoothstep(0.02, 0.5, luma));
  vec3 albedo = mix(pale, crimson, red);
  vec3 n;
  float occ;
  float rough = 0.97;
  if (vUv.z < 0.5) {
    float x = clamp(vUv.x / 0.075, -1.0, 1.0);
    n = normalize(vRight * x + v * sqrt(1.0 - x * x * 0.9));
    occ = 0.6 + 0.4 * smoothstep(0.0, 0.3, vWorld.y);
    // The foot stands in red brine and mud.
    float wet = 1.0 - smoothstep(0.02, 0.22, vWorld.y);
    albedo = mix(albedo, albedo * vec3(0.5, 0.2, 0.16) + vec3(0.03, 0.005, 0.004), wet);
    rough = mix(0.97, 0.5, wet);
  } else {
    float out_ = (uv.x - 0.5) * 1.6 * vUv.w;
    n = normalize(vRight * out_ + vec3(0.0, 0.5, 0.0) + v * 0.7);
    occ = mix(0.5, 1.0, smoothstep(0.52, 0.8, uv.y)) * (vUv.z > 1.5 ? 0.7 : 1.0);
  }
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  c += red * albedo * skyIrradiance(-n) / 3.14159 * 0.3 * occ * skyOpen(vWorld);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const PALM_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vRight;
varying vec4 vUv;
varying vec4 vKind;
uniform sampler2D tStalk;
uniform sampler2D tStalkA;
void main() {
${CUT}
  gl_FragColor = vec4(0.0);
}`;
