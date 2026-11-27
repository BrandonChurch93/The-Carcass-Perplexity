// The plants as geometry. A stem is a tube about its own line, ringed and capped; a head is a few hundred straps, each a bent ribbon that leaves the
// stem's end, rises and hangs under its own weight. No picture is cut out: an edge is the edge of a mesh. Far off a strap is kept a pixel wide and
// the head carries fewer of them, so that it neither sparkles nor thins to nothing.
import * as THREE from 'three';
import { K1_AT, K2_DIR, K2_RIGHT, TAU } from '../shared/anchors';
import type { Context } from '../shared/context';
import type { Rng } from '../../../core/rng';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { OPEN_GLSL } from './shaders';
import { lineAt, type Wild } from './stands';

// The air over the flats is close to still. Slow fronts cross them and lull; each plant also rocks in its own time. A frond reads the front where
// its plant stands, so a gust is seen to travel from stand to stand.
export const AIR_GLSL = /* glsl */ `
const vec3 WIND = vec3(0.8, 0.0, 0.6);
float airAt(vec2 xz, float t) {
  float along = dot(xz, WIND.xz);
  float across = dot(xz, vec2(-WIND.z, WIND.x));
  float a = sin(along * 0.085 - t * 0.62 + 0.9 * sin(across * 0.031 + t * 0.07));
  float b = sin(along * 0.23 - t * 1.31 + across * 0.11 + 2.0);
  float lull = 0.55 + 0.45 * sin(along * 0.019 - t * 0.17 + 1.3);
  // Gusts: fronts some twelve metres apart that cross the marsh at walking pace times three, rising fast and ebbing slowly, with lulls between.
  float g = 0.5 + 0.5 * sin(along * 0.5 - t * 2.3 + 1.6 * sin(across * 0.19 + t * 0.11));
  float calm = 0.5 + 0.5 * sin(along * 0.045 - t * 0.37 + across * 0.06 + 1.3);
  return (0.65 * a + 0.35 * b) * lull * 0.6 + 0.9 * (g * g * (0.3 + 0.7 * calm) - 0.25);
}
// How far the air carries a point of a stalk: t is how far up its line the point is, h the height of the line.
vec3 swayOf(vec2 xz, float h, float t, float quiver, float rate, float phase) {
  float own = sin(uSeconds * rate + phase) + 0.4 * sin(uSeconds * rate * 2.3 + phase * 1.7);
  float side = sin(uSeconds * rate * 0.77 + phase * 2.3);
  vec3 across = vec3(-WIND.z, 0.0, WIND.x);
  return (WIND * (0.7 * airAt(xz, uSeconds) + 0.5 * own) + across * (0.5 * side)) * (0.026 * quiver * h * t * t);
}
// The size of one pixel at a distance, in metres.
uniform float uViewH;
float pixelAt(vec3 p) {
  return 2.0 * distance(cameraPosition, p) / (projectionMatrix[1][1] * uViewH);
}`;

// The overcast is not even: the quarter of the sky the sun stands behind is brighter. Every plant takes a little more light from that side.
const KEY = new THREE.Vector3(-K2_RIGHT[0] * 0.75 - K2_DIR[0] * 0.3, 0.55, -K2_RIGHT[1] * 0.75 - K2_DIR[1] * 0.3).normalize();
const KEY_GLSL = /* glsl */ `
const vec3 KEY = vec3(${KEY.x.toFixed(4)}, ${KEY.y.toFixed(4)}, ${KEY.z.toFixed(4)});
float keyLight(vec3 n) {
  return 0.56 + 0.6 * clamp(0.5 + 0.5 * dot(n, KEY), 0.0, 1.0);
}`;

const STEM_VERTEX = /* glsl */ `
attribute vec4 aBase;
attribute vec4 aAxis;
attribute vec4 aKind;
attribute vec4 aBend;
attribute vec4 aMore;
attribute vec4 aLook;
attribute vec4 aFork;
uniform vec2 uGrove;
uniform float uLedge;
uniform sampler2D tBarkNh;
${OPEN_GLSL}
${AIR_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vUv;
varying vec4 vKind;
varying vec4 vLook;
float stalkHeight() {
  return aBase.w * mix(1.0, uGrove.x, aKind.z);
}
vec3 spine(float t, out vec3 T) {
  float h = stalkHeight();
  float lean = aAxis.z;
  vec3 A = vec3(aAxis.x * sin(lean), cos(lean), aAxis.y * sin(lean));
  vec3 U = vec3(aAxis.x * cos(lean), -sin(lean), aAxis.y * cos(lean));
  vec3 W = vec3(-aAxis.y, 0.0, aAxis.x);
  vec3 bow = (U * cos(aBend.x) + W * sin(aBend.x)) * aBend.y;
  vec3 sway = (U * cos(aMore.x) + W * sin(aMore.x)) * aMore.y;
  vec3 kink = (U * cos(aMore.z) + W * sin(aMore.z)) * aBend.w;
  // A break is a short bend, not a corner: the tube would pinch at a corner.
  float past = max(t - aBend.z, 0.0);
  float s = sin(t * 4.7);
  T = normalize(A + 2.0 * bow * t + sway * (s + 4.7 * t * cos(t * 4.7)) + kink * smoothstep(aBend.z - 0.03, aBend.z + 0.03, t));
  return aBase.xyz + aFork.xyz * (h / aBase.w) + h * (A * t + bow * t * t + sway * s * t + kink * past) + swayOf(aBase.xz, h, t, aLook.w, aMore.w, aKind.y);
}
float lobes(float a, float s) {
  return sin(a * 2.0 + s * 9.0) * 0.6 + sin(a * 3.0 + s * 23.0) * 0.4;
}
void main() {
  float h = stalkHeight();
  float R = aAxis.w * mix(1.0, uGrove.y, aKind.z);
  float D = 2.0 * R;
  float a = position.x;
  // Rows past 1 are the mouth: the inner edge of the rim, then the hollow.
  float cap = max(position.y - 1.0, 0.0);
  float t = min(position.y, 1.0);
  float seed = aKind.w;
  float dead = aKind.x > 1.5 && aKind.x < 2.5 ? 1.0 : 0.0;
  // A broken one ends in a torn rim: higher on one side than the other.
  float tear = dead * smoothstep(0.9, 1.0, t) * (0.5 + 0.5 * sin(a + seed * 40.0) + 0.12 * sin(a * 5.0 + seed * 90.0));
  float tt = t - tear * 1.3 * R / h - cap * (0.4 + 1.6 * dead) * R / h * step(0.75, cap);
  vec3 T;
  vec3 c = spine(tt, T);
  vec3 A = vec3(aAxis.x * sin(aAxis.z), cos(aAxis.z), aAxis.y * sin(aAxis.z));
  vec3 ref = abs(A.y) > 0.75 ? vec3(aAxis.x, 0.0, aAxis.y) : vec3(0.0, 1.0, 0.0);
  vec3 N1 = normalize(cross(T, ref));
  vec3 N2 = cross(T, N1);
  float y = tt * h;
  // The foot spreads into a collar of crust, and the trunk thins to its mouth.
  float girth = mix(1.08, 0.8, t) * (1.0 + 0.6 * aFork.w * exp(-y / (1.6 * D)));
  // Every node carries a ledge of salt, ragged round the stem. Where the mesh is too coarse to carry them the picture of the bark does.
  float close = step(1.5, uLedge);
  float r = R * girth * (1.0 + 0.05 * lobes(a + y * 2.0, seed) + 0.06 * sin(y * 3.1 / D * 0.2 + seed * 31.0));
  // The picture of the bark goes once round the trunk, seven ledges to a tile. By the lens its ledges and its crust stand out of the trunk
  // as far as the picture says they are high: the ragged lips are the mesh, not paint.
  // No two ledges the same distance apart, and none level all the way round.
  // Each stalk its own count of rings to a metre: seen from far the same banding on every stem is what tells a made thing.
  float vy = y / (3.4 * D) * mix(0.5 + 1.2 * fract(seed * 61.7), 1.0, close);
  vy += 0.06 * sin(vy * 2.1 + seed * 20.0) + 0.02 * sin(vy * 5.3 + seed * 47.0) + 0.012 * sin(vy * 13.7 + a + seed * 7.0);
  vec2 barkUv = vec2(a / 6.28318, vy) + seed * vec2(3.1, 7.7);
  float ledge = 0.0;
  if (close > 0.5) {
    float fineH = textureLod(tBarkNh, barkUv, 2.0).b;
    float broadH = textureLod(tBarkNh, barkUv, 5.0).b;
    // A ledge does not run all the way round: stretches of it have broken off, and what is left stands out further under its crust, in lumps.
    float kept = smoothstep(-0.25, 0.25, sin(a + vy * 9.0 + seed * 13.0) + 0.6 * sin(a * 3.0 - vy * 17.0 + seed * 29.0));
    float lip = max(fineH - broadH, 0.0);
    ledge = smoothstep(0.03, 0.2, lip) * kept;
    float lump = 0.5 + 0.5 * sin(a * 9.0 + vy * 40.0 + seed * 50.0) * sin(a * 4.0 - vy * 71.0);
    r += R * ((0.55 * lip + 0.08 * lump * ledge) * (0.2 + 0.8 * kept) + 0.25 * min(fineH - broadH, 0.0) + 0.08 * (broadH - 0.5)) * (1.0 - 0.5 * dead);
    // The segments of the trunk (the fragment shader paints the same ones): each swells to a ridge at its foot and draws in under the next.
    float ringQ = barkUv.y * (4.6 + 4.4 * fract(seed * 37.7)) + 0.3 * sin(barkUv.y * 4.3 + seed * 17.0) + 0.06 * sin(barkUv.x * 6.28318 + barkUv.y * 3.0) + 0.035 * sin(barkUv.x * 18.84954 + seed * 23.0);
    float ringId = floor(ringQ);
    float ringF = ringQ - ringId;
    float ringK = 0.3 + 0.7 * step(0.33, fract(sin(ringId * 12.9898 + seed * 78.233) * 43758.5453));
    r += R * ringK * (0.13 * (1.0 - smoothstep(0.0, 0.3, ringF)) * (0.5 + 0.5 * kept) - 0.06 * smoothstep(0.7, 0.95, ringF)) * (1.0 - dead);
  }
  // The mouth flares a little, and its wall has a thickness.
  r *= 1.0 + mix(0.16, 0.3, close) * smoothstep(1.0 - mix(1.2, 2.2, close) * R / h, 1.0, t) * (1.0 - dead);
  r *= 1.0 - cap * (cap > 0.75 ? 0.45 : 0.36);
  // Far off a stem is thinner than a pixel: it is kept that wide, or it would break into dashes.
  float px = pixelAt(c);
  float rr = max(r, 0.6 * px);
  vec3 radial = N1 * cos(a) + N2 * sin(a);
  vec3 p = c + radial * rr;
  vWorld = p;
  vNormal = normalize(radial - T * 0.5 * cap);
  vUv = vec4(barkUv, cap, t);
  vKind = vec4(aKind.x, h, clamp(r / rr, 0.0, 1.0), seed);
  vLook = vec4(aLook.x, aLook.y, ledge, max(aBase.y + 0.05, 0.0) + aFork.y * (h / aBase.w));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const STEM_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vUv;
varying vec4 vKind;
varying vec4 vLook;
uniform sampler2D tBark;
uniform sampler2D tBarkNh;
uniform float uCrowned;
uniform float uLedgeF;
${NOISE_GLSL}
${RIG_GLSL}
${KEY_GLSL}
void main() {
  float seed = vKind.w;
  vec2 uv = vUv.xy;
  // A slender stem is not a trunk: its rings are faint, and the rust is on it in stretches, with clean ivory between.
  float plain = 1.0 - step(0.5, uLedgeF);
  vec3 bark = texture2D(tBark, uv, 2.5 * plain).rgb;
  vec3 nh = texture2D(tBarkNh, uv, 2.0 * plain).rgb;
  // Read here, before the discard below: after it the software renderer has no sound slopes to choose a level of the sheet by.
  float ledgeOver = texture2D(tBarkNh, uv + vec2(0.0, 0.035), 3.0).b;
  float rustK = mix(1.0, 0.45 * smoothstep(0.4, 0.75, fbm(vec2(vKind.w * 19.0, vUv.y * 0.5))), plain);
  if (uMirror > 0.5 && vWorld.y < -0.015) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float away = smoothstep(8.0, 70.0, distance(cameraPosition, vWorld));
  float age = vLook.x;
  float deadStem = age > 1.5 ? 1.0 : 0.0;
  // The sheet is the stalk of the approved picture, unrolled: a grainy salt crust over a cream tube, lumps of crystal on the lips of its rings,
  // and rust where the crust has flaked off. Under this sky the sheet at two thirds of its own value is the cream and tan of the picture.
  float luma = dot(bark, vec3(0.3, 0.5, 0.2));
  float flaked = smoothstep(0.6, 1.15, (bark.r - bark.b) / max(luma, 0.05));
  vec3 albedo = bark * vec3(0.72, 0.66, 0.6);
  float patchy = fbm(vec2(vUv.x * 5.0, vUv.y * 2.2) + seed * 11.0);
  float grain = fbm(vUv.xy * vec2(90.0, 60.0));
  // The lumps are crystal: whiter than the crust they stand on. Far off they are not seen as white.
  float crust = smoothstep(0.66, 0.86, nh.b + 0.1 * (patchy - 0.5));
  float crustNear = 1.0 - 0.8 * smoothstep(4.0, 30.0, distance(cameraPosition, vWorld));
  crust = max(crust, 0.6 * vLook.z);
  albedo = mix(albedo, vec3(0.62, 0.58, 0.55) * (0.9 + 0.2 * grain), 0.55 * crust * crustNear);
  // No two the same age: a young one is clean and warm, an old one grey with what has run down it, a dead one has lost its salt.
  albedo *= mix(vec3(1.06, 1.0, 0.95), vec3(0.8, 0.76, 0.74), smoothstep(0.2, 0.9, min(age, 1.0))) * (0.88 + 0.24 * fract(seed * 41.7));
  // No stretch of a trunk the same as the next: the crust is thick and pale over one span of it and thin, stained ochre and brown, over another.
  float zone = smoothstep(0.3, 0.7, fbm(vec2(seed * 9.0 + vUv.x * 0.8, vUv.y * 0.42)));
  albedo *= mix(vec3(0.74, 0.56, 0.45), vec3(1.06, 1.04, 1.02), zone);
  // And no two stalks of one crust: away from the lens one is ivory, the next tan, the next stained brown.
  albedo *= mix(vec3(1.0), mix(vec3(0.92, 0.8, 0.7), vec3(1.05, 1.03, 1.0), smoothstep(0.1, 0.8, fract(seed * 29.1))), 1.0 - step(1.5, uLedgeF));
  // Where the crust has flaked the tube shows: rust, ochre and brown, more of it on an old trunk and in a thin span.
  vec3 rust = bark * vec3(0.95, 0.5, 0.3);
  albedo = mix(albedo, rust, flaked * (0.75 + 0.25 * min(age, 1.0)) * mix(1.0, 0.7, zone) * mix(1.0, 0.5, plain));
  float rusty = smoothstep(0.3, 0.7, fbm(vec2(vUv.x * 3.0, vUv.y * 1.3) + seed * 5.0));
  // And it runs down from a ring: the crust under one is stained orange, in tongues, on the side the brine dries last.
  float tongue = smoothstep(0.35, 0.75, fbm(vec2(vUv.x * 14.0, vUv.y * 1.6) + seed * 9.0));
  float run = smoothstep(0.62, 0.8, ledgeOver) * (1.0 - 0.8 * crust) * (0.3 + 0.7 * tongue) * smoothstep(0.1, 0.5, rusty + 0.25 - 0.3 * zone);
  albedo = mix(albedo, vec3(0.4, 0.15, 0.055), 0.75 * run * (1.0 - away) * rustK);
  // By the lens a trunk is told in segments from across the frame (the same rings the mesh carries, see the vertex shader): a ridge of white
  // crystal, a dark wet seam under it, and ochre and rust run down from the seam, further on one side than the other. No two segments the same
  // height, none level all the way round, and one in three hardly there.
  // No two trunks the same either: each has its own count of segments to a metre.
  float byLens = step(1.5, uLedgeF) * (1.0 - deadStem);
  float ringA = vUv.x * 6.28318;
  float ringQ = vUv.y * (4.6 + 4.4 * fract(seed * 37.7)) + 0.3 * sin(vUv.y * 4.3 + seed * 17.0) + 0.06 * sin(ringA + vUv.y * 3.0) + 0.035 * sin(ringA * 3.0 + seed * 23.0);
  float ringId = floor(ringQ);
  float ringF = ringQ - ringId;
  float ringK = (0.3 + 0.7 * step(0.33, fract(sin(ringId * 12.9898 + seed * 78.233) * 43758.5453))) * byLens;
  float side = smoothstep(0.25, 0.65, fbm(vec2(vUv.x * 3.0 + seed * 3.0, vUv.y * 0.8)));
  float ran = smoothstep(0.25 + 0.5 * (1.0 - side), 0.85, ringF + 0.2 * (tongue - 0.5));
  albedo *= mix(vec3(1.0), vec3(0.95, 0.87, 0.73), byLens);
  albedo = mix(albedo, mix(vec3(0.13, 0.042, 0.012), vec3(0.055, 0.02, 0.008), tongue) * (0.7 + 0.6 * luma), 0.95 * ran * (0.55 + 0.45 * side) * ringK);
  albedo *= mix(vec3(1.0), vec3(0.14, 0.08, 0.06), smoothstep(0.66, 0.84, ringF) * ringK * (0.7 + 0.3 * tongue));
  albedo = mix(albedo, vec3(0.68, 0.65, 0.62) * (0.9 + 0.2 * grain), 0.75 * (1.0 - smoothstep(0.06, 0.2, ringF)) * ringK * smoothstep(0.3, 0.5, patchy));
  float streak = smoothstep(0.25, 0.7, fbm(vec2(vUv.x * 5.5 + seed * 60.0, vUv.y * 0.3))) * min(age, 1.0);
  albedo = mix(albedo, albedo * vec3(0.66, 0.47, 0.4), 0.6 * streak);
  // Far off a stem is seen against pale ground and paler air: it is the horn colour of its tube, with its rings as bands, not chalk.
  float banded = (0.5 + 0.5 * sin(vUv.y * (18.0 + 46.0 * fract(seed * 37.7)) + 2.2 * sin(vUv.y * 5.3 + seed * 17.0) + seed * 30.0)) * smoothstep(0.15, 0.6, fract(seed * 53.1));
  vec3 horn = mix(vec3(1.12, 1.05, 0.97), vec3(1.08, 0.92, 0.8), pow(fract(seed * 29.1), 1.5)) * (0.9 + 0.12 * banded) * mix(0.55, 1.08, smoothstep(0.0, 0.6, vUv.w)) * (0.7 + 0.5 * fract(seed * 17.3));
  albedo = mix(albedo, mix(albedo, vec3(dot(albedo, vec3(0.3, 0.5, 0.2))), 0.45) * horn, smoothstep(6.0, 28.0, distance(cameraPosition, vWorld)) * (1.0 - step(1.5, uLedgeF)));
  // And from further still a living stalk is pale against the red water: the crust is what shows of it, not its stains.
  albedo = mix(albedo, vec3(0.5, 0.45, 0.42) * (0.8 + 0.4 * fract(seed * 17.3)), 0.55 * smoothstep(12.0, 40.0, distance(cameraPosition, vWorld)) * (1.0 - step(1.5, uLedgeF)));
  albedo = mix(albedo, albedo * vec3(0.5, 0.42, 0.37) + vec3(0.012, 0.008, 0.006), deadStem);
  // By the lens the mouth of a living trunk is its husk: brown and fibrous, ragged where the crust begins under it.
  float under = (1.0 - vUv.w) * vKind.y;
  float mouth = step(1.5, uLedgeF) * (1.0 - deadStem) * (1.0 - smoothstep(0.07, 0.15, under + 0.12 * (patchy - 0.5) + 0.03 * sin(vUv.x * 44.0 + seed * 60.0)));
  albedo = mix(albedo, vec3(0.34, 0.17, 0.075) * (0.55 + 0.9 * grain) * (0.7 + 0.3 * sin(vUv.x * 150.0 + seed * 9.0)), 0.9 * mouth);
  float above = vWorld.y - vLook.w;
  // The foot stands in red brine and mud, and the stain of it climbs the foot, higher on one than on the next, and ragged.
  float wet = 1.0 - smoothstep(0.03, 0.03 + vLook.y, above + 0.09 * sin(vUv.x * 9.5 + seed * 30.0) + 0.05 * sin(vWorld.y * 31.0 + seed * 11.0));
  wet = max(wet, deadStem * (1.0 - smoothstep(0.02, 0.2, above)));
  // The ones at the lip of the seep stand in what it throws: wet and red brown to the mouth, the salt left on them in patches.
  float thrown = 1.0 - smoothstep(4.0, 6.5, distance(vWorld.xz, vec2(${K1_AT[0].toFixed(3)}, ${K1_AT[1].toFixed(3)})));
  // What the seep throws soaks in: it darkens the bark and does not shine as the foot in the brine does, or the sky in it would turn the trunk white.
  float shine = max(wet, 0.25 * thrown);
  wet = max(wet, thrown * (0.9 - 0.5 * smoothstep(0.3, 0.55, luma) * smoothstep(-0.2, 0.6, sin(vWorld.y * 5.3 + vUv.x * 15.0 + seed * 40.0))));
  albedo = mix(albedo, albedo * vec3(0.5, 0.2, 0.16) + vec3(0.03, 0.005, 0.004), wet);
  // The relief of the bark turns the light, where it is near enough to be seen.
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 tx = normalize(cross(up, n) + 1e-5);
  vec3 bx = cross(n, tx);
  n = normalize(n - (tx * (nh.r - 0.5) + bx * (nh.g - 0.5)) * 2.2 * (1.0 - away) + (tx * (grain - 0.5) + bx * (patchy - 0.5)) * 0.7 * crust * crustNear);
  float occ = (0.5 + 0.5 * smoothstep(0.0, 0.3, above)) * (0.72 + 0.28 * smoothstep(0.0, 1.5, above)) * mix(0.5 + 0.5 * smoothstep(0.08, 0.5, nh.b), 0.94, away);
  // Under its head a stem stands in the head's shade.
  float below = (1.0 - vUv.w) * vKind.y;
  occ *= mix(1.0, mix(0.55, 0.78, step(1.5, uLedgeF)) + mix(0.45, 0.22, step(1.5, uLedgeF)) * smoothstep(0.0, 0.1 * vKind.y + 0.12, below), uCrowned * (1.0 - deadStem));
  // A stem a few pixels wide is all edge: far off, the sky's glance off its sides is all that would be seen of it, so there it is shaded as
  // the flat thing the lens sees, and keeps its own colour.
  float thin = smoothstep(6.0, 22.0, distance(cameraPosition, vWorld)) * (1.0 - step(1.5, uLedgeF));
  vec3 nl = normalize(mix(n, v + vec3(0.0, 0.35, 0.0), 0.75 * thin));
  vec3 c = rigShade(vWorld, nl, v, albedo * keyLight(n), mix(mix(0.96, 0.45, shine), 0.97, thin), occ);
  // The hollow of the mouth is dark.
  c *= 1.0 - 0.85 * smoothstep(0.2, 0.9, vUv.z);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const PLAIN_DEPTH = /* glsl */ `
void main() {
  gl_FragColor = vec4(0.0);
}`;

// One strap. aTop: where its stalk's line ends in still air, and that line's height. aRoot: the foot of the line, and (staged low) + 2 (the head
// turns up to the light). aAim: the line's direction at its end, and the plant's phase. aFr: the strap's turn about the line, how far it leaves
// the line, its length and half its width. aFr2: its seed, how far it falls, (how far from the line it starts, in millimetres) + how spent,
// its rank among the straps of its plant. aFr3: the plant's kind, seed, quiver and rate.
// With DROP the same strap is not drawn: a bead of water is, hanging from its end.
const FROND_VERTEX = /* glsl */ `
attribute vec4 aTop;
attribute vec4 aRoot;
attribute vec4 aAim;
attribute vec4 aFr;
attribute vec4 aFr2;
attribute vec4 aFr3;
uniform vec2 uGrove;
uniform float uHead;
uniform float uDry;
uniform float uMirror;
${OPEN_GLSL}
${AIR_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vSide;
varying vec4 vF;
varying vec4 vG;
const vec3 UP = vec3(0.0, 1.0, 0.0);
void main() {
  float low = aRoot.w > 1.5 ? aRoot.w - 2.0 : aRoot.w;
  float up = aRoot.w > 1.5 ? 1.0 : 0.0;
  float g = mix(1.0, uGrove.x, low);
  float h = aTop.w * g;
  vec3 sway = swayOf(aRoot.xz, h, 1.0, aFr3.z, aFr3.w, aAim.w);
  vec3 top = aRoot.xyz + (aTop.xyz - aRoot.xyz) * g + sway;
  vec3 T = normalize(mix(aAim.xyz, UP, 0.55 * up));
  float seed = aFr2.x;
  float spent = fract(aFr2.z) / 0.99;
  float from = floor(aFr2.z) * 0.001;
  // What is spent hangs and stays: it does not draw in with the living head.
  // A head opens strap by strap: half open, some of its straps are out and the rest still stand shut in the bundle.
  float head = plumeOpen(aFr3.x, aAim.w, aFr3.y);
  float open = mix(clamp((head * 1.3 - fract(seed * 5.3) - 0.15) / 0.15, 0.0, 1.0), 1.0, step(0.5, spent));
  float len = aFr.z * uHead * (low > 0.5 && uGrove.y > 1.01 ? 0.5 : 1.0) * mix(0.42, 1.0, open);
  float half0 = aFr.w * mix(2.4, 1.0, open);
  // Far off a strap is thinner than a pixel. It is drawn a pixel wide and the head keeps fewer of them, in the measure that each is wider.
  float px = pixelAt(top);
  float thin = clamp(half0 / (0.55 * px), 0.12, 1.0);
  float kept = clamp((thin - aFr2.w) / 0.1 + 1.0, 0.0, 1.0);
  len *= kept;
  vec3 out0 = vec3(cos(aFr.x), 0.0, sin(aFr.x));
  out0 = normalize(out0 - T * dot(out0, T) + vec3(1e-4, 0.0, 0.0));
  // Shut, a head is a bud: every strap leaves the line a little and comes back to it, and they lie on each other like scales.
  float e1 = 0.35 + 0.45 * fract(seed * 3.7);
  float e0 = mix(e1, aFr.y, open);
  vec3 d0 = T * cos(e0) + out0 * sin(e0);
  vec3 H = normalize(vec3(d0.x, 0.0, d0.z) + vec3(out0.x, 0.0, out0.z) * 0.02 + vec3(1e-4, 0.0, 0.0));
  // Open, a strap bends from the upright toward the ground; shut, from its stalk's line outward.
  vec3 A1 = normalize(mix(T, UP, open));
  vec3 O1 = mix(out0, H, open);
  O1 = normalize(O1 - A1 * dot(O1, A1) + vec3(1e-4, 0.0, 0.0));
  float bend0 = mix(e0, acos(clamp(d0.y, -1.0, 1.0)), open);
  float fall = mix(-3.0 * e1, aFr2.y, open);
  // The air is still, but nothing thin and wet holds still: every strap gives slowly on its own time, and the whole head with it on its plant's.
  float headTime = uSeconds * (0.5 + 0.45 * fract(aFr3.y * 5.1)) + aAim.w;
  float slow = sin(uSeconds * (0.8 + 0.7 * fract(seed * 7.7)) + seed * 40.0) + 0.7 * sin(headTime);
  fall += 0.2 * aFr3.z * slow * open;
  bend0 += 0.045 * aFr3.z * sin(headTime + 1.3) * open;
#ifdef DROP
  float s = 0.97;
#else
  float s = position.y;
#endif
  // The strap's line is the sum of its directions from its root: three places along it are enough to take the sum.
  // A strap of a plume the lens stands by is told how late along its length it turns (aFr2.w, below zero), and may hook back under itself.
  float late = aFr2.w < 0.0 ? -aFr2.w : 1.5;
  float most = aFr2.w < 0.0 ? 3.9 : 3.02;
  vec3 at = s * vec3(0.1127, 0.5, 0.8873);
  vec3 bends = clamp(bend0 + fall * pow(max(at, vec3(1e-5)), vec3(late)), vec3(-1.2), vec3(most));
  vec3 weigh = vec3(0.2778, 0.4444, 0.2778);
  vec3 acc = (A1 * dot(cos(bends), weigh) + O1 * dot(sin(bends), weigh)) * s;
  float bend = clamp(bend0 + fall * pow(max(s, 1e-5), late), -1.2, most);
  vec3 d = A1 * cos(bend) + O1 * sin(bend);
  vec3 b = normalize(cross(A1, O1));
  vec3 n = cross(b, d);
  // It is not laid flat: it turns about its own length, each its own way.
  float twist = (fract(seed * 13.3) - 0.5) * 1.6 + (fract(seed * 29.1) - 0.5) * 2.6 * s;
  vec3 side = b * cos(twist) + n * sin(twist);
  vec3 nn = n * cos(twist) - b * sin(twist);
  vec3 p = top + out0 * (0.02 * len + from * mix(0.55, 1.0, open)) - T * (0.03 * len) + acc * len;
  // The air leans on it, most at its end; each strap also swings by itself, slowly, because it is wet, and the swing runs out along it to the end.
  float own = seed * 40.0;
  float rate = 1.5 + 1.7 * fract(seed * 7.7);
  // A gust reaches every head a little after its neighbour, and the end of a strap a little after its root; while it blows the ends flutter.
  float air = airAt(aRoot.xz + 1.5 * vec2(cos(aAim.w), sin(aAim.w)), uSeconds - 0.12 * s);
  float give = len * s * s * aFr3.z;
  p += WIND * (give * 0.15 * air);
  if (uDry < 0.5) {
    p += WIND * (give * 0.03 * sin(uSeconds * rate * 0.6 + own * 1.3 - 2.0 * s));
    p += b * (give * 0.035 * sin(uSeconds * rate * 0.83 + own * 1.7 - 2.5 * s));
    p += n * (give * (0.03 * sin(uSeconds * rate + own - 3.0 * s) + 0.05 * max(air, 0.0) * sin(uSeconds * (7.0 + 5.0 * fract(seed * 3.3)) + own - 5.0 * s)));
  }
#ifdef DROP
  // A bead gathers at the end of a strap, swells, lets go and falls; the next gathers. Most only hang.
  float period = 4.0 + 7.0 * fract(seed * 3.1);
  float cyc = fract(uSeconds / period + seed * 7.0);
  float falls = step(fract(seed * 11.0), 0.4);
  float grown = mix(1.0, smoothstep(0.0, 0.5, cyc), falls);
  float since = max(cyc - 0.88, 0.0) * period * falls;
  float size = (0.0024 + 0.0026 * fract(seed * 17.0)) * grown * step(0.5, kept) * smoothstep(0.55, 0.9, open);
  vec3 ball = position;
  ball.y = ball.y > 0.0 ? ball.y * 1.45 : ball.y;
  p += vec3(0.0, -0.75 * size - 4.9 * since * since, 0.0) + ball * size;
  vWorld = p;
  vNormal = normalize(position * vec3(1.0, 0.8, 1.0));
  vSide = side;
  vF = vec4(s, 0.0, seed, 0.0);
  vG = vec4(1.0);
#else
  // A strap: narrow where it leaves the sheath, widest a fifth of the way out, and drawn out to a point.
  float shape = (0.35 + 0.65 * smoothstep(0.0, 0.2, s)) * (1.0 - pow(s, 2.6));
  float halfW = max(half0 * shape, 0.55 * px * (1.0 - pow(s, 6.0))) * step(0.001, kept);
  p += side * (position.x * halfW);
  vWorld = p;
  vNormal = nn;
  vSide = side;
  vF = vec4(s, position.x, seed, spent);
  // How far out of the heart of the head this point is, for the shade the straps lay on each other.
  vG = vec4(clamp(length(p - top) / max(0.6 * len, 1e-3), 0.0, 1.0), aFr3.y, clamp(half0 * shape / max(halfW, 1e-5), 0.0, 1.0), e0);
#endif
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  // What is small and low is not told in the rippled brine: it is not drawn there.
  if (uMirror > 0.5 && uDry > 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;

const FROND_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vSide;
varying vec4 vF;
varying vec4 vG;
uniform float uWet;
uniform float uLowly;
${RIG_GLSL}
${KEY_GLSL}
void main() {
  if (uMirror > 0.5 && vWorld.y < -0.015) discard;
  vec3 v = normalize(cameraPosition - vWorld);
#ifdef DROP
  // Clear water: it shows what is behind it upside down, the bright sky low in the bead and the dark ground high, and the sky's light on its skin.
  vec3 n = normalize(vNormal);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 radial = n - v * dot(n, v);
  float rho = clamp(length(radial), 0.0, 0.999);
  float turn = 2.0 * (asin(rho) - asin(rho / 1.33));
  vec3 through = normalize(-v * cos(turn) - radial / max(rho, 1e-4) * sin(turn));
  vec3 sky = skyRadiance(vec3(through.x, abs(through.y), through.z));
  vec3 ground = skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 * vec3(0.3, 0.1, 0.1);
  vec3 seen = mix(ground, sky, smoothstep(-0.25, 0.2, through.y));
  vec3 r = reflect(-v, n);
  float f = 0.03 + 0.97 * pow(1.0 - nv, 5.0);
  vec3 c = seen * (1.0 - f) * 0.95 + f * skyRadiance(vec3(r.x, abs(r.y), r.z));
  c += skyRadiance(KEY) * 2.5 * pow(clamp(dot(r, KEY), 0.0, 1.0), 90.0);
  gl_FragColor = vec4(rigOut(c * skyOpen(vWorld)), 1.0);
#else
  float s = vF.x;
  float u = vF.y;
  float seed = vF.z;
  float spent = vF.w;
  // Folded along its rib: the two halves take the light differently.
  vec3 n = normalize(vNormal + vSide * (0.55 * u));
  if (dot(n, v) < 0.0) n = -n;
  // Wine red, each strap and each plant its own; paler and drier toward the end, tan where it leaves the sheath.
  float own = fract(seed * 13.3);
  float plant = fract(vG.y * 41.7);
  vec3 albedo = mix(vec3(0.04, 0.003, 0.009), vec3(0.15, 0.011, 0.026), clamp(0.55 * own + 0.45 * plant + 0.25 * (s - 0.5), 0.0, 1.0));
  // Far off a head is a few pixels of it against pale ground: there it is the red of the lit blade, not of the shade between blades.
  albedo = mix(albedo, albedo * vec3(1.25, 0.7, 0.8), (1.0 - uLowly) * smoothstep(10.0, 34.0, distance(cameraPosition, vWorld)));
  // Further off the red goes dusty: a far head is rose in the haze, not a berry.
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.5, 0.3, 0.2))) * vec3(1.3, 0.85, 0.85), 0.35 * smoothstep(26.0, 70.0, distance(cameraPosition, vWorld)));
  albedo = mix(albedo, vec3(0.2, 0.06, 0.06), 0.45 * smoothstep(0.55, 1.0, s) * fract(seed * 5.1));
  albedo = mix(albedo, vec3(0.2, 0.12, 0.075), 1.0 - smoothstep(0.02, 0.14, s));
  // The rib is darker than the blade, and the blade is ruled along its length.
  albedo *= (0.8 + 0.2 * smoothstep(0.0, 0.35, abs(u))) * (0.93 + 0.07 * sin(u * 11.0 + seed * 50.0));
  // By the lens the red is the approved picture's: a warm rose, brown red in the shade of the head, with pale strands among the dark.
  float fine = step(0.75, uWet);
  vec3 rose = mix(vec3(0.05, 0.006, 0.006), vec3(0.19, 0.022, 0.026), clamp(0.5 * own + 0.5 * plant + 0.3 * (s - 0.4), 0.0, 1.0));
  rose = mix(rose, vec3(0.34, 0.1, 0.1), smoothstep(0.72, 0.95, fract(seed * 91.7)) * smoothstep(0.1, 0.5, s));
  rose = mix(rose, vec3(0.17, 0.085, 0.05), 1.0 - smoothstep(0.02, 0.2 + 0.12 * own, s));
  albedo = mix(albedo, rose, fine);
  albedo = mix(albedo, mix(vec3(0.085, 0.042, 0.034), vec3(0.15, 0.085, 0.06), own), spent);
  // A husk of the mouth: dry, tan, ruled with fibre, darker and stained where it leaves the trunk.
  float husk = fine * smoothstep(0.7, 0.75, spent) * (1.0 - smoothstep(0.85, 0.9, spent));
  vec3 tan_ = mix(vec3(0.1, 0.05, 0.026), vec3(0.26, 0.15, 0.07), own) * (0.8 + 0.2 * sin(u * 9.0 + seed * 70.0)) * mix(0.5, 1.0, smoothstep(0.0, 0.5, s));
  albedo = mix(albedo, mix(tan_, tan_ * vec3(1.0, 0.5, 0.4), 0.5 * smoothstep(0.5, 1.0, s) * step(0.5, own)), husk);
  // Salt has dried on them in grains: along the edges and toward the ends, more on one blade than on the next.
  float grainAt = floor(s * 140.0) + floor(u * 2.0 + 2.0) * 17.0;
  float grain = fract(sin(grainAt * 12.9898 + seed * 78.233) * 43758.5453);
  float salted = uWet * step(0.5, uWet) * smoothstep(0.25, 0.9, s) * smoothstep(0.3, 0.9, abs(u)) * step(1.0 - 0.3 * own, grain);
  albedo = mix(albedo, vec3(0.5, 0.46, 0.45), 0.7 * salted);
  // Dark at the heart of the head, where the straps stand close, and under it.
  float occ = mix(0.3, 1.0, smoothstep(0.0, 0.75, vG.x)) * mix(1.0, 0.8, smoothstep(1.2, 2.4, vG.w));
  // Near the lens the straps are seen to be wet: the white sky lies along them.
  float rough = mix(mix(0.8, 0.9, step(0.5, uWet)), 0.95, spent);
  vec3 c = rigShade(vWorld, n, v, albedo * keyLight(n), rough, occ);
  // Wet, the film of brine on a blade is a mirror only where its fold turns the bright part of the sky to the lens: a thin line down its length.
  vec3 r = reflect(-v, n);
  float line = pow(clamp(dot(r, KEY), 0.0, 1.0), 32.0) + 0.4 * pow(clamp(r.y, 0.0, 1.0), 16.0);
  c += step(0.5, uWet) * (1.0 - spent) * (1.0 - husk) * (0.3 + 0.7 * own) * 0.9 * line * skyRadiance(vec3(r.x, abs(r.y), r.z)) * occ * skyOpen(vWorld);
  // A strap is thin: the sky behind it comes through.
  c += (1.0 - 0.6 * spent) * albedo * vec3(1.2, 0.6, 0.7) * skyIrradiance(-n) / 3.14159 * 0.35 * occ * skyOpen(vWorld);
  // One that is drawn wider than it is carries less of the picture's pixel: it is mixed toward what stands behind a head, which is more head.
  c *= mix(0.8, 1.0, vG.z);
  gl_FragColor = vec4(rigOut(c), 1.0);
#endif
}`;

/** The straps of every head, as they are given to the shader. */
export class Fronds {
  readonly top: number[] = [];
  readonly root: number[] = [];
  readonly aim: number[] = [];
  readonly fr: number[] = [];
  readonly fr2: number[] = [];
  readonly fr3: number[] = [];
  count = 0;

  /** One strap at the end of the line `w`. */
  add(w: Wild, end: [number, number, number], aim: [number, number, number], turn: number, leave: number, length: number, half: number, seed: number, fall: number, spent: number, rank: number, up: boolean, plantSeed: number, from = 0): void {
    this.top.push(end[0], end[1], end[2], w.h);
    this.root.push(w.x, w.y, w.z, w.low + (up ? 2 : 0));
    this.aim.push(aim[0], aim[1], aim[2], w.phase);
    this.fr.push(turn, leave, length, half);
    this.fr2.push(seed, fall, Math.min(spent, 1) * 0.99 + Math.floor(from * 1000), rank);
    this.fr3.push(w.kind, plantSeed, w.quiver, w.rate);
    this.count++;
  }
}

const endOf = (w: Wild): { end: [number, number, number]; aim: [number, number, number] } => {
  const end = lineAt(w, 1);
  const before = lineAt(w, 0.97);
  const d = [end[0] - before[0], end[1] - before[1], end[2] - before[2]];
  const l = Math.hypot(d[0] as number, d[1] as number, d[2] as number) || 1;
  // lineAt has the fork's offset in it and the shader adds the staged height to the whole line from its foot: the end is given from the foot.
  return { end, aim: [(d[0] as number) / l, (d[1] as number) / l, (d[2] as number) / l] };
};

/** A stalk that is not one of the colony's own trunks is this much of the girth it was given: a slender stalk, not a palm's trunk. Its head keeps its size. */
export const SLIM = 0.6;

/**
 * The head of a line. On a stalk that stands it is a fan: one to three sparse sprays of long thin straps that leave the line upward and to one
 * side, like spread fingers, and only curve over at their ends. No head is round and none droops evenly all round. The cards a stalk was dressed
 * with (index.ts and stands.ts) say which way the fan is swept, how big it is, and how much of it is ragged or spent.
 * `hung` is the old leaf that hangs down a stem. `fine` is how many straps a card is worth, by how near a lens ever comes.
 */
export function crownOf(list: Fronds, w: Wild, rng: Rng, fine: number, broad: number, hung: boolean, swept = 0, slim = SLIM): void {
  if (w.cards.length === 0) return;
  const { end, aim } = endOf(w);
  if (!hung) {
    const c0 = w.cards[0] as number[];
    let size = 0;
    let ragged = 0;
    let spent = 0;
    for (const c of w.cards) {
      size = Math.max(size, c[2] as number);
      ragged = Math.max(ragged, c[5] as number);
      spent += (c[6] as number) / w.cards.length;
    }
    // Every plant its own: the size of its head, the number of its sprays and how open they stand are taken from its seed.
    const u = (w.seed * 7.31) % 1;
    const v = (w.seed * 13.7) % 1;
    const q = (w.seed * 29.3) % 1;
    // Seen from far a head is a small tuft at the tip of a pale stalk, and the stalk below it is bare: no head longer than its stalk can show.
    const off = fine <= 13;
    const wide = Math.min(1.5, (19 * 2 * w.R * size) / slim, (off ? 0.42 : 0.5) * w.h) * (1.15 + 0.9 * u * u + 0.25 * swept);
    // How far a head arches over to its side is the plant's own: one stands swept up, the next hangs its ends.
    const arch = (off ? 1.25 : 1) * (0.6 + 1.0 * ((w.seed * 41.3) % 1));
    // Its sprays stand to one side of the first, never either side of it: a head has no middle to be even about.
    const hand = (w.seed * 53.9) % 1 < 0.5 ? -1 : 1;
    const sprays = off || v < 0.4 ? 1 : v < 0.82 ? 2 : 3;
    const each = Math.max(sprays === 1 ? 3 : 2, Math.round(fine * (0.75 + 0.6 * q) * (1 - 0.4 * ragged)));
    let first = true;
    for (let j = 0; j < sprays; j++) {
      const turn = (c0[0] as number) + hand * j * rng.range(0.45, 0.85) + rng.normal() * 0.12;
      const tilt = rng.range(0.22, 0.6) + (j > 0 ? 0.15 : 0);
      const reach = j === 0 ? 1 : rng.range(0.4, 0.8) / j;
      for (let k = 0; k < each; k++) {
        const sp = spent > 0.5 ? (rng.next() < spent ? 1 : 0) : rng.next() < spent ? 1 : 0;
        // A mop that hangs to its side, never a crown that droops evenly all round.
        const az = turn + rng.normal() * 0.55;
        const leave = sp ? rng.range(1.2, 1.9) : Math.max(0.06, tilt + (off ? 0.4 : 0.15) + rng.normal() * 0.25);
        const length = 0.95 * wide * reach * rng.range(0.5, 1.1) * (1 - ragged * rng.range(0, 0.6));
        const fall = sp ? rng.range(1.2, 2.2) : arch + rng.range(-0.2, off ? 0.9 : 0.7);
        // The first strap of a head is the last to go when the head is thinned for distance: no head thins to nothing.
        list.add(w, end, aim, az, leave, length, Math.min(0.026, Math.max(0.008, length * rng.range(0.026, 0.042))) * broad, rng.next(), fall, sp, first ? 0 : 0.75 * rng.next(), !w.bare, w.seed);
        first = false;
      }
    }
    return;
  }
  for (const c of w.cards) {
    const turn = c[0] as number;
    const droop = c[1] as number;
    const wide = Math.min(1.5, 19 * 2 * w.R * (c[2] as number));
    const ragged = c[5] as number;
    const spent = c[6] as number;
    const n = Math.max(2, Math.round(fine * (1 - 0.4 * ragged)));
    for (let k = 0; k < n; k++) {
      // The fall of a leaf: straps that leave to one side, arch over and hang by their ends.
      const az = turn + rng.normal() * 0.6;
      const leave = Math.min(2.6, Math.max(0.15, 0.55 + droop * 0.7 + rng.normal() * 0.28));
      const length = 0.72 * wide * rng.range(0.5, 1.0) * (1 - ragged * rng.range(0, 0.6));
      const fall = rng.range(1.5, 2.8);
      const sp = spent > 0.5 ? spent : rng.next() < spent ? 1 : 0;
      list.add(w, end, aim, az, leave + 0.35 * sp, length, Math.min(0.02, Math.max(0.006, length * rng.range(0.028, 0.048))) * broad, rng.next(), fall, sp, rng.next(), false, w.seed);
    }
  }
}

// A foot on the ground with no stem on it, for what grows from the ground itself.
function footOf(rng: Rng, x: number, y: number, z: number, quiver: number): Wild {
  let seed = rng.next();
  // A seed whose head never snaps shut.
  for (let k = 0; k < 50 && (seed * 13.7) % 1 < 0.36; k++) seed = rng.next();
  return {
    x, y, z, h: 0.02, dx: 1, dz: 0, lean: 0, R: 0.02, kind: 0, phase: rng.range(0, TAU), low: 0, seed,
    bowA: 0, bowM: 0, kinkT: 2, kinkM: 0, swayA: 0, swayM: 0, kinkA: 0, rate: rng.range(1.2, 2.4),
    age: 0, stain: 0, uvo: 0, quiver, fork: [0, 0, 0], collar: 0, cards: [], foot: false,
  };
}

/** A tuft on the ground: straps from one foot, with no stem. */
export function tuftOf(list: Fronds, rng: Rng, x: number, y: number, z: number, h: number, wide: number, dead: number, n: number): void {
  const w = footOf(rng, x, y, z, 1.4);
  const end: [number, number, number] = [x, y + 0.02, z];
  for (let k = 0; k < n; k++) {
    const az = rng.range(0, TAU);
    const leave = Math.abs(rng.normal()) * 0.5 + 0.08;
    const length = h * rng.range(0.6, 1.25) * (1 + 0.35 * Math.min(1.5, wide / Math.max(h, 0.05) - 1) * Math.min(1, leave));
    const sp = rng.next() < dead ? 1 : 0;
    list.add(w, end, [0, 1, 0], az, leave + 0.3 * sp, length, Math.max(0.004, length * rng.range(0.016, 0.03)), rng.next(), rng.range(0.5, 1.6), sp, k === 0 ? 0 : rng.next(), false, w.seed);
  }
}

/**
 * A creeping mat: short fat leaves that lie close to the wet ground, thick at its heart and ragged at its edge. `per` is how many feet stand
 * on a square metre of it, and far off each leaf is `broad` times as wide.
 */
export function matOf(list: Fronds, rng: Rng, ground: (x: number, z: number) => number, x: number, z: number, r: number, h: number, dead: number, per: number, broad: number): void {
  const n = Math.round(per * Math.PI * r * r * 0.55);
  const lobe = [rng.range(0, TAU), rng.range(0, TAU)];
  for (let k = 0; k < n; k++) {
    const a = rng.range(0, TAU);
    const edge = 0.72 + 0.2 * Math.sin(a * 3 + (lobe[0] as number)) + 0.12 * Math.sin(a * 7 + (lobe[1] as number));
    const d = r * edge * Math.pow(rng.next(), 0.62);
    const px = x + Math.cos(a) * d;
    const pz = z + Math.sin(a) * d;
    const y = ground(px, pz);
    if (y < 0.004) continue;
    const w = footOf(rng, px, y - 0.01, pz, 0.8);
    const end: [number, number, number] = [px, y + 0.004, pz];
    const gone = rng.next() < dead ? 1 : 0;
    const heart = 1 - 0.45 * (d / Math.max(r, 0.05));
    for (let j = 0; j < 3; j++) {
      const length = (0.045 + 0.42 * h) * rng.range(0.6, 1.35) * heart * Math.sqrt(broad);
      list.add(w, end, [0, 1, 0], rng.range(0, TAU), rng.range(0.75, 1.5), length, length * rng.range(0.11, 0.18) * broad, rng.next(), rng.range(0.1, 0.8), gone, j === 0 ? 0 : rng.next(), false, w.seed);
    }
  }
}

/**
 * The plume of a stalk the lens stands among: some hundreds of narrow wet blades from the mouth of the trunk, combed toward `comb`, that rise,
 * arch over and weep, the short broad leaves of the sheath round their roots, and the beads of water at the ends of some. A bud is the same
 * blades shut: the shader lays them on each other.
 */
export function plumeOf(list: Fronds, drops: Fronds, w: Wild, rng: Rng, length: number, comb: number): void {
  const { end, aim } = endOf(w);
  const bud = w.kind === 1;
  const n = bud ? 240 : w.kind === 3 ? 380 : 500;
  // Wet filaments hold to each other: the plume is some tens of locks. A lock leaves the mouth close to the trunk's own line, stands for most of
  // its length, then arches over and hangs or hooks at its end: how late it turns (the fourth number) is the lock's, so its filaments stay
  // together. The locks on the side the air has combed them to leave wider and fall further; a few on the other side stand and hook back.
  const locks: [number, number, number, number, number][] = [];
  const lockCount = bud ? 14 : w.kind === 3 ? 22 : 34;
  for (let k = 0; k < lockCount; k++) {
    const az = comb + rng.normal() * 1.25;
    const toward = Math.max(0, Math.cos(az - comb));
    const heart = rng.next() < 0.38;
    const leave = heart ? 0.03 + Math.abs(rng.normal()) * 0.1 : 0.1 + Math.abs(rng.normal()) * 0.2 + 0.28 * toward * rng.next();
    const reach = rng.range(0.5, 1.1) * (heart ? 1.05 : 0.8 + 0.25 * toward);
    const fall = heart ? rng.range(1.2, 3.0) : rng.range(1.6, 2.8) + 1.4 * toward * rng.next();
    locks.push([az, leave, reach, fall, rng.range(2.0, 3.6)]);
  }
  for (let k = 0; k < n; k++) {
    const lock = locks[rng.int(locks.length)] as [number, number, number, number, number];
    // The first filaments are the cores of the locks, one each: broad, and as long as the lock is. The rest lie on a core; one in twelve strays.
    const core = k < locks.length;
    const own = core ? (locks[k] as [number, number, number, number, number]) : lock;
    const stray = !core && rng.next() < 0.085;
    const az = own[0] + (core ? 0 : rng.normal() * (stray ? 0.45 : 0.045));
    const leave = Math.max(0.02, own[1] + (core ? 0 : rng.normal() * (stray ? 0.16 : 0.022)));
    // A lock thins to its end: its filaments are of unlike length, and a few are short and young.
    const len = length * own[2] * (core ? 1 : (stray ? rng.range(0.5, 1.2) : 1 - 0.55 * Math.pow(rng.next(), 1.6)) * (rng.next() < 0.07 ? rng.range(0.3, 0.6) : 1));
    const fall = own[3] + (core ? 0 : rng.normal() * (stray ? 0.5 : 0.06));
    const half = bud ? rng.range(0.006, 0.011) : core ? rng.range(0.008, 0.013) : rng.range(0.003, 0.0065);
    const seed = rng.next();
    const from = w.R * 0.7 * Math.sqrt(rng.next());
    const late = -(own[4] + (core ? 0 : stray ? rng.range(-0.5, 0.5) : rng.range(-0.05, 0.05)));
    list.add(w, end, aim, az, leave, len, half, seed, fall, 0, late, false, w.seed, from);
    if (!bud && rng.next() < (core ? 0.5 : 0.06)) drops.add(w, end, aim, az, leave, len, half, seed, fall, 0, late, false, w.seed, from);
  }
  // The husks of the mouth: short dry tan straps round the roots of the filaments, that lean out and curl at their ends.
  const husks = bud ? 12 : 19;
  for (let k = 0; k < husks; k++) {
    list.add(w, end, aim, (k / husks) * TAU + rng.range(-0.3, 0.3), rng.range(0.15, 0.65), w.R * rng.range(0.9, 2.6), w.R * rng.range(0.13, 0.24), rng.next(), rng.range(0.6, 2.6), HUSK, -rng.range(1.2, 2.4), false, w.seed, w.R * 0.95);
  }
}

/**
 * Takes from `rng` exactly what a plume took of it before the plumes were made as they are now. The trunks by the lens of the colony draw their
 * lines from the same stream, one after the other: with this they stand where the key's picture has them, whatever a plume is made of.
 */
export function plumeDrawn(w: Wild, rng: Rng): void {
  const lockCount = w.kind === 1 ? 14 : 30;
  for (let k = 0; k < lockCount; k++) {
    rng.normal();
    rng.normal();
    rng.next();
    rng.range(0, 1);
    rng.range(0, 1);
  }
  const n = w.kind === 1 ? 260 : w.kind === 3 ? 320 : 440;
  for (let k = 0; k < n; k++) {
    rng.int(lockCount);
    rng.next();
    rng.normal();
    rng.normal();
    rng.range(0, 1);
    if (rng.next() < 0.08) rng.range(0, 1);
    rng.normal();
    rng.range(0, 1);
    rng.next();
    rng.next();
    if (w.kind !== 1) rng.next();
  }
  for (let k = 0; k < 18; k++) for (let j = 0; j < 6; j++) rng.next();
}

/** What a husk of the mouth carries where a strap carries how spent it is. */
const HUSK = 0.8;

export interface GrowthUniforms {
  uSeconds: THREE.IUniform<number>;
  uGrove: THREE.IUniform<THREE.Vector2>;
  uHead: THREE.IUniform<number>;
  uViewH: THREE.IUniform<number>;
}

function strip(segments: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const p: number[] = [];
  const index: number[] = [];
  for (let j = 0; j <= segments; j++) p.push(-1, j / segments, 0, 1, j / segments, 0);
  for (let j = 0; j < segments; j++) {
    const a = j * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(index);
  return g;
}

function tube(rings: number, sides: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const p: number[] = [];
  const index: number[] = [];
  const rows: number[] = [];
  for (let i = 0; i <= rings; i++) rows.push(i / rings);
  rows.push(1.5, 2);
  rows.forEach((v) => {
    for (let j = 0; j <= sides; j++) p.push((j / sides) * TAU, v, 0);
  });
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j;
      index.push(a, a + sides + 1, a + 1, a + 1, a + sides + 1, a + sides + 2);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setIndex(index);
  return g;
}

function instanced(base: THREE.BufferGeometry, count: number, attributes: Record<string, Float32Array>): THREE.InstancedBufferGeometry {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const name of Object.keys(base.attributes)) g.setAttribute(name, base.attributes[name] as THREE.BufferAttribute);
  for (const name of Object.keys(attributes)) g.setAttribute(name, new THREE.InstancedBufferAttribute(attributes[name] as Float32Array, 4));
  g.instanceCount = count;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
  return g;
}

/**
 * What a mesh of straps is told: `dry` keeps it out of the brine's mirror, `wet` gives its straps the sheen of water, and `small` says its
 * straps are too small on the picture to hide anything: it is drawn once, not a second time for depth alone.
 */
export interface FrondLook {
  dry?: boolean;
  wet?: number;
  small?: boolean;
  low?: boolean;
}

function frondGeometry(base: THREE.BufferGeometry, list: Fronds): THREE.InstancedBufferGeometry {
  return instanced(base, list.count, {
    aTop: new Float32Array(list.top), aRoot: new Float32Array(list.root), aAim: new Float32Array(list.aim),
    aFr: new Float32Array(list.fr), aFr2: new Float32Array(list.fr2), aFr3: new Float32Array(list.fr3),
  });
}

/** The meshes of the straps: `segments` pieces along each. */
export function frondMesh(ctx: Context, u: GrowthUniforms, list: Fronds, segments: number, look: FrondLook = {}): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, ...u, uDry: { value: look.dry ? 1 : 0 }, uWet: { value: look.wet ?? 0 }, uLowly: { value: look.low ? 1 : 0 } },
    vertexShader: FROND_VERTEX,
    fragmentShader: FROND_FRAGMENT,
    side: THREE.DoubleSide,
  });
  if (!look.small) material.userData.depthFragment = PLAIN_DEPTH;
  const mesh = new THREE.Mesh(frondGeometry(strip(segments), list), material);
  mesh.frustumCulled = false;
  return mesh;
}

/** The beads of water that hang from the ends of the straps of `list`. */
export function dropMesh(ctx: Context, u: GrowthUniforms, list: Fronds): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, ...u, uDry: { value: 1 }, uWet: { value: 1 } },
    defines: { DROP: 1 },
    vertexShader: FROND_VERTEX,
    fragmentShader: FROND_FRAGMENT,
  });
  material.userData.depthFragment = PLAIN_DEPTH;
  const ball = new THREE.SphereGeometry(1, 10, 7);
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', ball.attributes.position as THREE.BufferAttribute);
  base.setIndex(ball.index);
  const mesh = new THREE.Mesh(frondGeometry(base, list), material);
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * The tubes of the stems: `lines` is what index.ts gives every line. `ledges` is 1 where the mesh is fine enough to carry the ledges of the nodes,
 * and 2 by the lens, where it carries the relief of the crust as well.
 */
export function stemMesh(ctx: Context, u: GrowthUniforms, count: number, lines: Record<string, Float32Array>, rings: number, sides: number, ledges: number, small = false): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...ctx.rig.uniforms, ...u, uLedge: { value: ledges }, uLedgeF: { value: ledges }, uCrowned: { value: 1 },
      tBark: { value: ctx.assets.texture('growth/stalk.jpg', { kind: 'colour', anisotropy: 4 }) },
      tBarkNh: { value: ctx.assets.texture('growth/stalk-nh.jpg', { kind: 'data', anisotropy: 4 }) },
    },
    vertexShader: STEM_VERTEX,
    fragmentShader: STEM_FRAGMENT,
  });
  if (!small) material.userData.depthFragment = PLAIN_DEPTH;
  const mesh = new THREE.Mesh(instanced(tube(rings, sides), count, lines), material);
  mesh.frustumCulled = false;
  return mesh;
}
