// The stalks that no lens stands among, each drawn from the Builder's photograph of a whole one: its trunk on a card that turns about the
// stalk's own line to face the lens, shaded as the round thing it is, and its mop on two more, one of them the other way round and behind.
import { RIG_GLSL } from '../shared/glsl';
import { K1_AT } from '../shared/anchors';
import { OPEN_GLSL } from './shaders';

export const PALM_VERTEX = /* glsl */ `
attribute vec4 aBase;
attribute vec4 aAxis;
attribute vec4 aKind;
varying vec3 vWorld;
varying vec3 vRight;
varying vec4 vUv;
varying vec4 vKind;
uniform vec2 uGrove;
uniform float uHead;
${OPEN_GLSL}
void main() {
  // STAGED by shot: the groves the lens of the thin crust looks across stand low and thick in its shot (uGrove), and as the list has them in every other.
  float h = aBase.w * mix(1.0, uGrove.x, aKind.z);
  float D = 2.0 * aAxis.w * mix(1.0, uGrove.y, aKind.z);
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
    // The fan at its top is the photograph of one, with the end of its stalk in it: that end is laid on the end of this stalk, as wide and
    // along its line, and the straps arch over to the side the stalk leans. A second, smaller, is behind it the other way round.
    float open = plumeOpen(kind, aKind.y, seed);
    float wide = 19.0 * D * uHead * mix(1.0, 0.5 / uGrove.y, aKind.z * (uGrove.y > 1.01 ? 1.0 : 0.0)) * (0.85 + 0.4 * fract(seed * 57.3)) * (kind > 2.5 ? 0.8 : 1.0) * (kind > 1.5 && kind < 2.5 ? 0.0 : 1.0) * (piece > 1.5 ? 0.8 : 1.0);
    vec3 er = normalize(cross(T, toCam));
    float flip = (dot(vec3(A.x, 0.0, A.z), er) + 0.2 * (fract(seed * 23.7) - 0.5) < 0.0 ? -1.0 : 1.0) * (piece > 1.5 ? -1.0 : 1.0);
    er *= flip;
    vec3 xw = 0.891 * er + 0.454 * T;
    vec3 yw = -0.454 * er + 0.891 * T;
    vec2 q = vec2(position.x + 0.5, position.y);
    float reach = clamp((q.y - 0.15) / 0.8, 0.0, 1.0) * clamp(q.x * 1.6, 0.0, 1.0);
    p = c + xw * ((q.x - 0.225) * wide * mix(0.45, 1.0, open)) + yw * ((q.y - 0.125) * wide * 0.667);
    p += wind * (0.05 * wide * reach * gust) + er * (0.025 * wide * reach * sin(uSeconds * 2.6 + seed * 40.0 + q.x * 9.0));
    p += toCam * (piece > 1.5 ? -0.03 : 0.012);
    vRight = er;
    vUv = vec4(q, piece, flip);
  }
  vWorld = p;
  vKind = vec4(kind, h, D, seed);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const CUT = /* glsl */ `
  vec2 uv = vUv.xy;
  bool torn = false;
  if (vUv.z < 0.5) {
    // The photographed trunk is as long as five of its widths: a taller one runs up it and down it again.
    float w = vUv.y;
    float m = mod(max(w - 0.48, 0.0), 0.84);
    float pv = w <= 0.48 ? 0.02 + w : m < 0.42 ? 0.5 - m : 0.08 + (m - 0.42);
    uv = vec2(mix(0.449, 0.413, smoothstep(0.1, 0.4, pv)) + vUv.x, pv);
    // A broken one ends in a torn rim.
    float tear = 0.5 + 0.3 * sin(vUv.x * 90.0 + vKind.w * 50.0) + 0.2 * sin(vUv.x * 210.0 + vKind.w * 90.0);
    torn = vKind.x > 1.5 && vKind.x < 2.5 && vUv.w > 1.0 - 0.09 / vKind.y * tear;
  }
  // Every read of a picture comes before any discard: the software renderer leaves the slopes of a dropped pixel's neighbours undefined.
  vec4 t = texture2D(tStalk, uv);
  float cover = texture2D(tStalkA, uv).r;
  vec4 fan = texture2D(tFan, vUv.xy);
  float fanCover = texture2D(tFanA, vUv.xy).r;
  float away = smoothstep(6.0, 60.0, distance(cameraPosition, vWorld));
  bool mop = vUv.z > 0.5;
  if (mop) t = fan;
  // The fan is drawn larger than its stalk in the photograph: the stalk's end in it is left out below the collar.
  fanCover *= smoothstep(0.1, 0.13, vUv.y);
  // Far off a strap is thinner than a pixel: it is kept at a lower cover, or the fan would thin to nothing.
  if (mop ? fanCover < mix(0.5, 0.22, away) : (torn || cover < mix(0.5, 0.2, away))) discard;
`;

export const PALM_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vRight;
varying vec4 vUv;
varying vec4 vKind;
uniform sampler2D tStalk;
uniform sampler2D tStalkA;
uniform sampler2D tFan;
uniform sampler2D tFanA;
${RIG_GLSL}
void main() {
${CUT}
  if (uMirror > 0.5 && vWorld.y < -0.015) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  float luma = max(t.r, max(t.g, t.b));
  // Far off the photograph is a few texels and the black round it is mixed into them: its hue holds, its light is given back.
  luma = mix(luma, max(luma, 0.42), smoothstep(0.15, 0.7, away));
  // The hue is the photograph's; its light is taken out of it at an edge, where the black round it would draw an outline.
  vec3 hue = t.rgb / max(luma, 0.03);
  float red = smoothstep(0.25, 0.6, (t.r - t.g) / max(t.r, 0.03));
  vec3 pale = mix(vec3(1.0), hue, 0.55) * (0.04 + 0.4 * smoothstep(0.02, 0.7, luma));
  vec3 crimson = mix(vec3(dot(hue, vec3(0.3, 0.5, 0.2))), hue, 0.92) * (0.035 + 0.26 * smoothstep(0.02, 0.5, luma));
  vec3 albedo = mix(pale, crimson, red);
  vec3 n;
  float occ;
  float rough = 0.97;
  if (vUv.z < 0.5) {
    float x = clamp(vUv.x / 0.075, -1.0, 1.0);
    n = normalize(vRight * x + v * sqrt(1.0 - x * x * 0.9));
    occ = 0.6 + 0.4 * smoothstep(0.0, 0.3, vWorld.y);
    // The foot stands in red brine and mud.
    // And the stain of it climbs the foot, higher on one than on the next, and ragged.
    float wet = 1.0 - smoothstep(0.05, 0.45 + 0.9 * fract(vKind.w * 7.3), vUv.w * vKind.y + 0.09 * sin(vUv.x * 40.0 + vKind.w * 30.0) + 0.05 * sin(vWorld.y * 31.0 + vKind.w * 11.0));
    // The ones at the lip of the seep stand in what it throws: wet and red brown to the mouth, the salt left on them in patches.
    float thrown = 1.0 - smoothstep(4.0, 6.5, distance(vWorld.xz, vec2(${K1_AT[0].toFixed(3)}, ${K1_AT[1].toFixed(3)})));
    wet = max(wet, thrown * (0.55 - 0.4 * smoothstep(0.5, 0.75, luma) * smoothstep(-0.2, 0.6, sin(vWorld.y * 5.3 + vUv.x * 30.0 + vKind.w * 40.0))));
    albedo = mix(albedo, albedo * vec3(0.5, 0.2, 0.16) + vec3(0.03, 0.005, 0.004), wet);
    rough = mix(0.97, 0.5, wet);
  } else {
    float out_ = (vUv.x - 0.3) * 1.4;
    n = normalize(vRight * out_ + vec3(0.0, 0.5, 0.0) + v * 0.7);
    // Dark at the heart of it, where the straps stand close.
    occ = mix(0.5, 1.0, smoothstep(0.15, 0.6, length(vUv.xy - vec2(0.3, 0.2)))) * (vUv.z > 1.5 ? 0.75 : 1.0);
    rough = mix(0.92, 0.6, red);
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
uniform sampler2D tFan;
uniform sampler2D tFanA;
void main() {
${CUT}
  gl_FragColor = vec4(0.0);
}`;
