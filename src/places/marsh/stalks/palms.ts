// The stalks that no lens stands among. Each has its own line (lean, bow, sway of the trunk, kink, fork), drawn as a ribbon of the Builder's
// photograph of a trunk that turns about that line to face the lens and is shaded as the round thing it is; and a head of its own, made of
// several cards of the photographed fan and lock that stand round the end of the line, each with its own turn, droop, size and age.
import { RIG_GLSL } from '../shared/glsl';
import { K1_AT } from '../shared/anchors';
import { OPEN_GLSL } from './shaders';

// The line of a stalk, the same in the trunk's shader and the head's: a head sits on the end its trunk has.
// Every term is linear in the height, so a fork (a stalk whose foot is a point of another's line, aFork) follows a staged change of height exactly.
const SPINE = /* glsl */ `
attribute vec4 aBase;
attribute vec4 aAxis;
attribute vec4 aKind;
attribute vec4 aBend;
attribute vec4 aMore;
attribute vec4 aLook;
attribute vec4 aFork;
uniform vec2 uGrove;
${OPEN_GLSL}
const vec3 WIND = vec3(0.8, 0.0, 0.6);
// STAGED by shot: the groves the lens of the thin crust looks across stand low and thick in its shot (uGrove), and as the list has them in every other.
float stalkHeight() {
  return aBase.w * mix(1.0, uGrove.x, aKind.z);
}
float stalkGust() {
  float ph = aKind.y + dot(aBase.xz, vec2(0.21, 0.17));
  return sin(uSeconds * aMore.w + ph) + 0.5 * sin(uSeconds * aMore.w * 2.1 + aKind.y * 1.7);
}
vec3 spine(float t, out vec3 T) {
  float h = stalkHeight();
  float lean = aAxis.z + 0.01 * aLook.w * sin(uSeconds * 0.7 + aKind.y);
  vec3 A = vec3(aAxis.x * sin(lean), cos(lean), aAxis.y * sin(lean));
  vec3 U = vec3(aAxis.x * cos(lean), -sin(lean), aAxis.y * cos(lean));
  vec3 W = vec3(-aAxis.y, 0.0, aAxis.x);
  // No stalk is straight: each has grown toward its own light, sagged under its own salt, and some have been broken and grown on.
  vec3 bow = (U * cos(aBend.x) + W * sin(aBend.x)) * aBend.y;
  vec3 sway = (U * cos(aMore.x) + W * sin(aMore.x)) * aMore.y;
  vec3 kink = (U * cos(aMore.z) + W * sin(aMore.z)) * aBend.w;
  float past = max(t - aBend.z, 0.0);
  float s = sin(t * 4.7);
  T = normalize(A + 2.0 * bow * t + sway * (s + 4.7 * t * cos(t * 4.7)) + kink * (t > aBend.z ? 1.0 : 0.0));
  // And the air leans on the top of it, each in its own time.
  return aBase.xyz + aFork.xyz * (h / aBase.w) + h * (A * t + bow * t * t + sway * s * t + kink * past) + WIND * (0.016 * aLook.w * h * t * t * stalkGust());
}`;

export const PALM_VERTEX = /* glsl */ `
${SPINE}
varying vec3 vWorld;
varying vec3 vRight;
varying vec4 vUv;
varying vec4 vKind;
varying vec4 vLook;
void main() {
  float h = stalkHeight();
  float D = 2.0 * aAxis.w * mix(1.0, uGrove.y, aKind.z);
  float t = position.y;
  vec3 T;
  vec3 c = spine(t, T);
  vec3 toCam = normalize(cameraPosition - c);
  vRight = normalize(cross(T, toCam));
  // The foot spreads into a collar of crust, and the trunk thins to its mouth.
  float y = t * h;
  float girth = mix(1.1, 0.82, t) * (1.0 + aFork.w * exp(-y / (1.6 * D)));
  vec3 p = c + vRight * (position.x * 1.56 * D * girth);
  vUv = vec4(position.x * 0.23, y / (10.2 * D), 0.0, t);
  vWorld = p;
  vKind = vec4(aKind.x, h, D, aKind.w);
  // The level the stalk comes out of: the brine where it stands in it, the ground where it does not.
  vLook = vec4(aLook.x, aLook.y, aLook.z, max(aBase.y + 0.05, 0.0) + aFork.y * (h / aBase.w));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const CUT = /* glsl */ `
  // The photographed trunk is as long as five of its widths: a taller one runs up it and down it again, each from its own place in it, and one in two is turned over.
  float w = vUv.y + 0.84 * fract(vLook.z);
  float m = mod(max(w - 0.48, 0.0), 0.84);
  float pv = w <= 0.48 ? 0.02 + w : m < 0.42 ? 0.5 - m : 0.08 + (m - 0.42);
  float side = vLook.z > 1.0 ? -1.0 : 1.0;
  vec2 uv = vec2(mix(0.449, 0.413, smoothstep(0.1, 0.4, pv)) + side * vUv.x, pv);
  // A broken one ends in a torn rim.
  float tear = 0.5 + 0.3 * sin(vUv.x * 90.0 + vKind.w * 50.0) + 0.2 * sin(vUv.x * 210.0 + vKind.w * 90.0);
  bool torn = vKind.x > 1.5 && vKind.x < 2.5 && vUv.w > 1.0 - 0.09 / vKind.y * tear;
  // Every read of a picture comes before any discard: the software renderer leaves the slopes of a dropped pixel's neighbours undefined.
  vec4 t = texture2D(tStalk, uv);
  float cover = texture2D(tStalkA, uv).r;
  float away = smoothstep(6.0, 60.0, distance(cameraPosition, vWorld));
  if (torn || cover < mix(0.5, 0.2, away)) discard;
`;

export const PALM_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vRight;
varying vec4 vUv;
varying vec4 vKind;
varying vec4 vLook;
uniform sampler2D tStalk;
uniform sampler2D tStalkA;
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
  // No two the same age: a young one is clean and warm, an old one grey with what has run down it, a dead one has lost its salt.
  float age = vLook.x;
  float seed = vKind.w;
  albedo *= mix(vec3(1.1, 1.0, 0.94), vec3(0.74, 0.7, 0.68), smoothstep(0.2, 0.9, age)) * (0.86 + 0.28 * fract(seed * 41.7));
  float streak = smoothstep(0.1, 0.6, sin(vUv.w * vKind.y * (2.0 + 3.0 * fract(seed * 9.1)) + vUv.x * 14.0 + seed * 60.0)) * min(age, 1.0);
  albedo = mix(albedo, albedo * vec3(0.62, 0.42, 0.36), 0.7 * streak);
  float deadStem = age > 1.5 ? 1.0 : 0.0;
  albedo = mix(albedo, albedo * vec3(0.66, 0.54, 0.47) + vec3(0.012, 0.008, 0.006), deadStem);
  float x = clamp(vUv.x / 0.075, -1.0, 1.0);
  vec3 n = normalize(vRight * x + v * sqrt(1.0 - x * x * 0.9));
  float above = vWorld.y - vLook.w;
  float occ = 0.55 + 0.45 * smoothstep(0.0, 0.3, above);
  // The foot stands in red brine and mud, and the stain of it climbs the foot, higher on one than on the next, and ragged.
  float wet = 1.0 - smoothstep(0.03, 0.03 + vLook.y, above + 0.09 * sin(vUv.x * 40.0 + seed * 30.0) + 0.05 * sin(vWorld.y * 31.0 + seed * 11.0));
  // One that lies in the brine is wet through.
  wet = max(wet, deadStem * (1.0 - smoothstep(0.02, 0.2, above)));
  // The ones at the lip of the seep stand in what it throws: wet and red brown to the mouth, the salt left on them in patches.
  float thrown = 1.0 - smoothstep(4.0, 6.5, distance(vWorld.xz, vec2(${K1_AT[0].toFixed(3)}, ${K1_AT[1].toFixed(3)})));
  wet = max(wet, thrown * (0.55 - 0.4 * smoothstep(0.5, 0.75, luma) * smoothstep(-0.2, 0.6, sin(vWorld.y * 5.3 + vUv.x * 30.0 + seed * 40.0))));
  albedo = mix(albedo, albedo * vec3(0.5, 0.2, 0.16) + vec3(0.03, 0.005, 0.004), wet);
  float rough = mix(0.97, 0.5, wet);
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const PALM_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vRight;
varying vec4 vUv;
varying vec4 vKind;
varying vec4 vLook;
uniform sampler2D tStalk;
uniform sampler2D tStalkA;
void main() {
${CUT}
  gl_FragColor = vec4(0.0);
}`;

// One card of a head. aCard: its turn about the stalk's line, its droop, its size, which photograph (0 the fan, 1 the lock).
// aCard2: its own seed, how ragged, how spent, its place toward the lens among the cards of its head.
export const HEAD_VERTEX = /* glsl */ `
${SPINE}
attribute vec4 aCard;
attribute vec4 aCard2;
uniform float uHead;
varying vec3 vWorld;
varying vec3 vRight;
varying vec4 vUv;
varying vec4 vHead;
void main() {
  float D = 2.0 * aAxis.w * mix(1.0, uGrove.y, aKind.z);
  vec3 T;
  vec3 c = spine(1.0, T);
  vec3 toCam = normalize(cameraPosition - c);
  // A card stands out from the line to its own side. One that points at the lens is seen narrow, and comes round as the lens does: it never jumps.
  vec3 out0 = vec3(cos(aCard.x), 0.0, sin(aCard.x));
  out0 = normalize(out0 - T * dot(out0, T) + vec3(1e-4, 0.0, 0.0));
  vec3 er = normalize(out0 - toCam * (0.85 * dot(out0, toCam)));
  float open = plumeOpen(aKind.x, aKind.y, aKind.w);
  float lock = aCard.w;
  float wide = 19.0 * D * uHead * mix(1.0, 0.5 / uGrove.y, aKind.z * (uGrove.y > 1.01 ? 1.0 : 0.0)) * aCard.z;
  // The fan is the photograph of one with the end of its stalk in it, a quarter turn off upright: that end is laid along this stalk's line.
  float turn = mix(0.4712, 0.0, lock) - aCard.y - 0.35 * (1.0 - open) * (1.0 - lock);
  vec3 xw = er * cos(turn) + T * sin(turn);
  vec3 yw = -er * sin(turn) + T * cos(turn);
  vec2 q = vec2(position.x + 0.5, position.y);
  vec2 pivot = mix(vec2(0.225, 0.125), vec2(0.5, 0.115), lock);
  float reach = clamp((q.y - 0.15) / 0.8, 0.0, 1.0) * mix(clamp(q.x * 1.6, 0.0, 1.0), 1.0, lock);
  vec3 p = c + xw * ((q.x - pivot.x) * wide * mix(0.45, 1.0, open)) + yw * ((q.y - pivot.y) * wide * 0.667);
  float own = aCard2.x * 40.0;
  p += WIND * (0.05 * wide * reach * stalkGust()) + er * (0.025 * wide * reach * sin(uSeconds * (2.0 + 1.2 * fract(aCard2.x * 7.7)) + own + q.x * 9.0));
  p += toCam * aCard2.w;
  vRight = er;
  vWorld = p;
  vUv = vec4(q, lock, aCard2.x);
  vHead = vec4(aCard2.y, aCard2.z, length((q - pivot) * vec2(1.0, 0.667)), aKind.x);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const HEAD_CUT = /* glsl */ `
  // Every read of a picture comes before any discard: the software renderer leaves the slopes of a dropped pixel's neighbours undefined.
  vec4 fan = texture2D(tFan, vUv.xy);
  float fanCover = texture2D(tFanA, vUv.xy).r;
  vec4 lk = texture2D(tLock, vUv.xy);
  float away = smoothstep(6.0, 60.0, distance(cameraPosition, vWorld));
  bool isLock = vUv.z > 0.5;
  vec4 t = isLock ? lk : fan;
  // The fan is drawn larger than its stalk in the photograph: the stalk's end in it is left out below the collar.
  float cover = isLock ? smoothstep(0.03, 0.2, max(lk.r, max(lk.g, lk.b))) * smoothstep(0.1, 0.13, vUv.y) : fanCover * smoothstep(0.1, 0.13, vUv.y);
  // A ragged head has lost the ends of its straps, some more than others.
  float tornAt = 0.5 + 0.5 * sin(vUv.x * 23.0 + vUv.w * 40.0) * sin(vUv.y * 17.0 + vUv.w * 70.0);
  cover *= 1.0 - vHead.x * smoothstep(0.18, 0.5, vHead.z * (0.55 + 0.9 * tornAt));
  // Far off a strap is thinner than a pixel: it is kept at a lower cover, or the head would thin to nothing.
  if (cover < mix(0.5, 0.22, away)) discard;
`;

export const HEAD_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vRight;
varying vec4 vUv;
varying vec4 vHead;
uniform sampler2D tFan;
uniform sampler2D tFanA;
uniform sampler2D tLock;
${RIG_GLSL}
void main() {
${HEAD_CUT}
  if (uMirror > 0.5 && vWorld.y < -0.015) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  float luma = max(t.r, max(t.g, t.b));
  luma = mix(luma, max(luma, 0.42), smoothstep(0.15, 0.7, away));
  vec3 hue = t.rgb / max(luma, 0.03);
  float red = smoothstep(0.25, 0.6, (t.r - t.g) / max(t.r, 0.03));
  vec3 pale = mix(vec3(1.0), hue, 0.55) * (0.04 + 0.4 * smoothstep(0.02, 0.7, luma));
  vec3 crimson = mix(vec3(dot(hue, vec3(0.3, 0.5, 0.2))), hue, 0.92) * (0.035 + 0.26 * smoothstep(0.02, 0.5, luma));
  vec3 albedo = mix(pale, crimson, red);
  // Each head its own red, and a spent one has gone to brown paper.
  float own = fract(vUv.w * 13.3);
  albedo *= mix(vec3(0.78, 0.8, 0.86), vec3(1.2, 1.0, 0.92), own);
  float spent = vHead.y;
  albedo = mix(albedo, vec3(0.2, 0.125, 0.085) * (0.25 + 1.1 * smoothstep(0.02, 0.6, luma)), spent);
  float out_ = (vUv.x - mix(0.3, 0.5, vUv.z)) * 1.4;
  vec3 n = normalize(vRight * out_ + vec3(0.0, 0.5, 0.0) + v * 0.7);
  // Dark at the heart of it, where the straps stand close.
  float occ = mix(0.45, 1.0, smoothstep(0.08, 0.5, vHead.z));
  float rough = mix(0.92, 0.6, red * (1.0 - spent));
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  c += red * (1.0 - spent) * albedo * skyIrradiance(-n) / 3.14159 * 0.3 * occ * skyOpen(vWorld);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const HEAD_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vRight;
varying vec4 vUv;
varying vec4 vHead;
uniform sampler2D tFan;
uniform sampler2D tFanA;
uniform sampler2D tLock;
void main() {
${HEAD_CUT}
  gl_FragColor = vec4(0.0);
}`;
