// The tether-kites: ribbons of skin that stream down the gale from holdfasts in the lee edge of each spire.
// One mesh for every ribbon. Its shape is worked out in the vertex shader from the time alone: waves leave the stalk and travel down the ribbon at
// a share of the wind's speed, each ribbon with its own length of wave, so no two are ever in step.
import * as THREE from 'three';
import type { Vec3 } from '../../../core/cameras';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { WIND } from '../shared/anchors';
import { FIRST, finEdge, spires } from '../ridge';
import { ditherAt, flashAt } from '../strikes/bolt';

export const PARTS: readonly string[] = ['tether-kites'];

const ALONG = 80;
const ACROSS = 4;

interface Ribbon {
  anchor: Vec3;
  length: number;
  width: number;
  phase: number;
  /** Length of its wave, metres. */
  wave: number;
  sag: number;
  seed: number;
  spire: number;
  /** The share of its length that is its stalk. */
  stalk: number;
}

/** Where the colonies of a spire hold on, as shares of its height, and how many ribbons each has. Few and near the top: the lee of the tip is where the gale is cleanest. */
function colonies(n: number): [number, number][] {
  // The first spire is seen close, at two thirds of its height: three colonies there and one at its tip.
  if (n === FIRST) return [[0.955, 3], [0.845, 2], [0.795, 3], [0.752, 2], [0.705, 3]];
  if (n === FIRST + 2) return [[0.965, 3], [0.9, 1]];
  if (n === FIRST + 1) return [[0.95, 2]];
  if (n === FIRST + 3) return [[0.96, 2], [0.87, 1]];
  return [[0.955, 2]];
}

// The shape of a ribbon at a share u of its length. Shared by the ribbons and by nothing else: the stalks are the first fifth of the same strip.
const SHAPE_GLSL = /* glsl */ `
uniform float uTime;
uniform vec4 uWind;
vec3 centreAt(vec3 anchor, vec4 shape, vec4 more, float u) {
  float len = shape.x;
  float along = u * len;
  vec3 wind = normalize(uWind.xyz);
  vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), wind));
  float k = 6.2832 / shape.w;
  // A wave runs down the ribbon at 0.7 of the wind's speed, a second, shorter one a little faster, and the tail whips.
  float c = uWind.w * (0.62 + 0.2 * fract(more.y * 7.3));
  float p1 = k * (along - c * uTime) + shape.z;
  float p2 = k * 1.83 * (along - c * 1.17 * uTime) + shape.z * 2.7;
  float p3 = k * 4.1 * (along - c * 1.3 * uTime) + shape.z * 5.1;
  float grow = smoothstep(0.0, 1.0, u * 1.15) * (0.35 + 0.65 * u);
  float amp = 0.03 * len * grow;
  // A gust lifts or drops the whole ribbon slowly.
  float gust = sin(uTime * 0.83 + shape.z * 3.0) * 0.6 + sin(uTime * 1.37 + shape.z) * 0.4;
  float fan = (fract(more.y * 13.7) - 0.5) * 0.3;
  // The stalk is a cord with weight and ice on it: it hangs between the rock and the skin it holds.
  float held = clamp(u / more.w, 0.0, 1.0);
  float hang = 0.3 * more.w * len * held * (1.0 - held);
  float lift = fan * along * (1.0 - 0.5 * u) - hang - more.x * len * u * u + amp * (sin(p1) + 0.45 * sin(p2)) + 0.35 * amp * u * u * sin(p3) + 0.03 * len * u * gust;
  float sway = 0.8 * amp * (sin(p1 * 0.77 + 1.9) + 0.4 * sin(p2 * 1.1 + 0.4)) + 0.3 * amp * u * u * sin(p3 * 1.3 + 2.0);
  // The cloth is as long as it is: where it climbs a wave it does not also run on down the wind.
  float drawn = along * (1.0 - 0.06 * grow);
  return anchor + wind * drawn + side * sway + vec3(0.0, lift, 0.0);
}`;

const VERTEX = /* glsl */ `
attribute vec3 aAnchor;
attribute vec4 aShape;
attribute vec4 aMore;
attribute vec2 aAt;
uniform float uPixel;
${SHAPE_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vAt;
varying vec4 vShape;
varying vec4 vMore;
varying float vThin;
varying float vCord;
varying float vSpine;
varying float vHalf;
varying float vFar;
void main() {
  float u = aAt.x;
  float e = 0.004;
  vec3 c = centreAt(aAnchor, aShape, aMore, u);
  vec3 ahead = centreAt(aAnchor, aShape, aMore, u + e);
  vec3 tangent = normalize(ahead - centreAt(aAnchor, aShape, aMore, u - e));
  vec3 wind = normalize(uWind.xyz);
  vec3 flat_ = normalize(cross(vec3(0.0, 1.0, 0.0), wind));
  vec3 upward = normalize(cross(tangent, flat_));
  flat_ = cross(upward, tangent);
  // The ribbon rolls about its own length as the waves pass, and the roll travels with them.
  float k = 6.2832 / aShape.w;
  float roll = 0.7 * sin(k * 0.61 * (u * aShape.x - uWind.w * 0.7 * uTime) + aShape.z * 2.0) + 0.8 * (fract(aMore.y * 3.1) - 0.5) + 0.6 * sin(k * 1.9 * (u * aShape.x - uWind.w * 0.8 * uTime) + aShape.z) * u * u;
  // Seen from far along the ridge, a sheet that lay flat on the wind would be a line: the far ones stand more on edge, as a flag does.
  float stand = smoothstep(200.0, 450.0, length(cameraPosition - aAnchor));
  roll = mix(roll, (fract(aMore.y * 5.3) < 0.5 ? -1.1 : 1.1) + 0.45 * roll, stand);
  vFar = stand;
  roll = mix(1.5708, roll, smoothstep(aMore.w, aMore.w + 0.1, u));
  vec3 across = flat_ * cos(roll) + upward * sin(roll);
  vec3 normal_ = cross(tangent, across);
  // Its width: a cord for the stalk, widening to the blade, a slow taper, and a ragged tail.
  float blade = smoothstep(aMore.w, aMore.w + 0.09, u);
  float breadth = 0.75 + 0.25 * sin(u * 9.0 + aMore.y * 40.0) * sin(u * 23.0 + aMore.y * 11.0);
  float halfW = 0.5 * aShape.y * blade * breadth * (1.0 - 0.4 * smoothstep(0.6, 1.0, u)) * (1.0 + 0.5 * stand);
  float far = length(cameraPosition - c);
  float cord = max(0.15, (0.9 + 0.8 * stand) * uPixel * far);
  // Along the stalk the strip is wider than the cord: room for the knots on it and for what hangs from it.
  float thin = max(halfW, cord + 0.95 * (1.0 - smoothstep(aMore.w + 0.02, aMore.w + 0.09, u)));
  // The blade cups across its width: its edges lift off the plane.
  float cup = 0.22 * aShape.y * blade * sin(u * 14.0 + aMore.y * 20.0 - uTime * 2.0);
  vec3 p = c + across * (aAt.y * thin) + normal_ * (cup * aAt.y * aAt.y);
  vWorld = p;
  vNormal = normalize(normal_ - across * (2.0 * cup * aAt.y / max(thin, 0.05)) * 0.5);
  vAt = aAt;
  vShape = aShape;
  vMore = aMore;
  vThin = halfW / thin;
  vCord = min(1.0, 0.15 / cord);
  vSpine = cord / thin;
  vHalf = thin;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
uniform vec4 uStruck;
uniform vec3 uGlowTint;
uniform float uDither;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vAt;
varying vec4 vShape;
varying vec4 vMore;
varying float vThin;
varying float vCord;
varying float vSpine;
varying float vHalf;
varying float vFar;
void main() {
  float u = vAt.x;
  float v = vAt.y;
  float metres = u * vShape.x;
  float wide = vShape.y;
  float seed = vMore.y * 97.0;
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, toCamera) < 0.0) n = -n;
  float blade = smoothstep(vMore.w, vMore.w + 0.07, u);

  // The edge is frayed, more toward the tail, and the tail is torn into tatters; some ribbons are slit.
  float edge = 1.0 - abs(v);
  float fray = (0.05 + 0.5 * smoothstep(0.45, 1.0, u)) * (0.35 * vnoise(vec2(metres / (0.35 * wide), seed)) + 0.65 * vnoise(vec2(metres / (1.6 * wide), seed + 5.0)));
  float tatter = smoothstep(0.7, 1.0, u) * smoothstep(0.42, 0.62, vnoise(vec2(metres / (2.5 * wide) + seed, v * 2.2 + seed)));
  float slit = step(0.55, fract(seed * 0.37)) * smoothstep(0.35, 0.5, u) * (1.0 - smoothstep(0.02, 0.05, abs(v - 0.5 * sin(metres / (4.0 * wide) + seed) - 0.1) - 0.02 - 0.1 * vnoise(vec2(metres / wide, seed))));
  // Holes where the gale has gone through it, more of them toward the tail, each with a rolled rim.
  float worn = vnoise(vec2(metres / (1.3 * wide) + seed * 3.0, v * 1.7 + seed)) + 0.35 * (vnoise(vec2(metres / (0.3 * wide), v * 6.0 + seed)) - 0.5);
  float gate = mix(0.84, 0.62, smoothstep(0.2, 0.9, u));
  float hole = smoothstep(gate, gate + 0.03, worn);
  float rim = smoothstep(gate - 0.09, gate, worn) * (1.0 - hole);
  float cut = smoothstep(fray, fray + 0.06, edge) * (1.0 - tatter) * (1.0 - slit) * (1.0 - hole);
  // The stalk: a cord of wet sinew, knotted where the skin grows from it and here and there along it. Under the blade it runs on as a spine.
  float stalkAt = vMore.w * vShape.x;
  float knots = 1.6 * exp(-pow((metres - stalkAt - 0.6) / 0.75, 2.0)) + 0.7 * smoothstep(0.72, 0.9, vnoise(vec2(metres * 0.45, seed * 3.0)));
  float girth = vSpine * (1.0 + (0.25 * vnoise(vec2(metres * 2.2, seed)) + knots) * vCord);
  float cordHere = 1.0 - smoothstep(0.6, 1.0, abs(v) / girth);
  cordHere *= 1.0 - smoothstep(0.45, 0.8, u);
  // Ice hangs from the cord where its water froze as it dripped: spikes, each with a bead at its end. Only where the lens is near enough to see them.
  float below = -v * vHalf - 0.5 * girth * vHalf;
  float cell = metres / 0.8;
  float h = hash12(vec2(floor(cell), seed));
  float fx = (fract(cell) - 0.5 + 0.25 * (fract(h * 13.0) - 0.5)) * 0.8;
  float lengthOf = 0.16 + 0.6 * fract(h * 7.3) * fract(h * 3.1);
  float spike = step(abs(fx), 0.05 * pow(clamp(1.0 - below / lengthOf, 0.0, 1.0), 0.7)) * step(0.0, below) * step(below, lengthOf);
  float bead = 1.0 - smoothstep(0.035, 0.05, length(vec2(fx, below - lengthOf)));
  float ice = max(spike, bead) * step(0.4, h) * (1.0 - blade) * smoothstep(0.6, 1.0, vCord) * smoothstep(0.02, 0.06, u);
  float skin = cut * blade;
  if (max(skin, max(cordHere, ice)) < 0.02) discard;

  // The skin: thin and wet, pale as fish skin, with veins that run its length and creases across it.
  float vein = 1.0 - smoothstep(0.0, 0.09, abs(fract(v * (1.6 + 1.4 * fract(seed)) + 1.1 * vnoise(vec2(metres / (1.4 * wide), seed)) + 0.25 * vnoise(vec2(metres / (0.3 * wide), seed + 9.0))) - 0.5));
  float fine = vnoise(vec2(metres / (0.12 * wide), v * 9.0 + seed));
  float crease = smoothstep(0.55, 0.8, vnoise(vec2(metres / (0.5 * wide) + seed, v * 1.3)));
  float rolled = 1.0 - smoothstep(fray + 0.05, fray + 0.22, edge);
  rolled = max(rolled, rim);
  // The edge that meets the wind is a thick wet welt.
  float welt = smoothstep(0.72, 0.9, v) * blade;
  float thick = clamp(0.2 + 0.55 * rolled + 0.4 * vein + 0.22 * crease + 0.12 * fine + 0.7 * welt, 0.0, 1.0);

  // Pale violet, bruised darker along the veins and in blotches where it has been beaten against itself.
  float bruise = smoothstep(0.5, 0.8, vnoise(vec2(metres / (3.0 * wide) + seed * 7.0, v * 0.9 + seed * 2.0)));
  vec3 albedo = mix(vec3(0.8, 0.76, 0.98), vec3(0.4, 0.32, 0.62), clamp(0.45 * vein + 0.25 * crease + 0.3 * bruise + 0.5 * welt, 0.0, 1.0));
  // Light comes through it: the far side's light counts as much as the near side's, and the lightning shows through from behind.
  vec3 e = 0.5 * (skyIrradiance(n) + skyIrradiance(-n)) + 0.6 * (emitterIrradiance(vWorld, n) + emitterIrradiance(vWorld, -n));
  // The skin scatters what falls on it from every side: it takes the cold of the whole sky more than the warmth of the horizon's band.
  e = mix(e, vec3(dot(e, vec3(0.3, 0.5, 0.2))) * vec3(0.9, 0.8, 1.3), 0.7);
  vec3 c = albedo * e / 3.14159 * (1.0 + 0.3 * thick);
  // The sheen: a wet film, violet where it is seen flat and blue-green at a glance.
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  float fres = 0.08 + 0.92 * pow(1.0 - nv, 4.0);
  // An oil film on it: violet seen flat, rose as it turns, green at a glance, and the bands wander over the sheet.
  float glance = pow(1.0 - nv, 1.3) + 0.5 * (vnoise(vec2(metres / (2.0 * wide) + seed, v * 1.4 + seed * 5.0)) - 0.5) + 0.12 * (fine - 0.5);
  vec3 film = mix(vec3(0.62, 0.5, 1.0), vec3(1.0, 0.5, 0.72), smoothstep(0.12, 0.4, glance));
  film = mix(film, vec3(0.45, 0.95, 0.68), smoothstep(0.48, 0.8, glance));
  vec3 r = reflect(-toCamera, n);
  r.y = abs(r.y) + 0.05;
  vec3 mirror = skyRadiance(normalize(r)) + emitterIrradiance(vWorld, n) * 0.08;
  c += mirror * (fres * 0.9) * mix(vec3(0.85, 0.8, 1.0), film, 0.7);
  // The rolled edges and the creases are wet ridges: each carries a line of the sky's light.
  c += mirror * (1.3 * rolled + 0.9 * crease * fine + 0.5 * vein + 2.4 * exp(-pow((v - 0.84) / 0.035, 2.0)) * blade) * mix(vec3(0.92, 0.86, 1.05), film, 0.3);
  // What is behind it shows through it, stained: the band at the horizon, the storm, the bolt.
  c += albedo * film * skyRadiance(-toCamera) * (0.45 * (1.0 - 0.7 * thick));
  c += albedo * e / 3.14159 * 0.3 * film * (1.0 - thick);

  // When its spire is struck the ribbon carries the charge: its edges and veins glow dim violet-blue, and its tatters spark.
  float mine = abs(uStruck.x - vMore.z) < 0.5 ? 1.0 : 0.12;
  float charge = uStruck.y * mine * (0.8 * rolled + 0.35 * vein + 1.5 * tatter * step(0.7, fine));
  c += uGlowTint * charge;

  // The small ones behind are thinner skins than the great ones.
  float alpha = clamp(0.3 + 0.5 * thick + 0.45 * fres, 0.0, 0.96) * skin * mix(0.72, 1.0, smoothstep(4.0, 9.0, wide));
  // From far its two edges are what draws it: dark lines round a pale sheet.
  float hem = vFar * smoothstep(0.66, 0.9, abs(v)) * skin;
  c *= 1.0 - 0.8 * hem;
  alpha = max(alpha + 0.22 * vFar * skin, 0.9 * hem);
  // The cord: dark wet sinew, its fibres twisted along it, round, rimed in beads on top.
  float x = clamp(v / max(girth, 1e-4), -1.0, 1.0);
  vec3 round_ = normalize(n * sqrt(1.0 - x * x) + vec3(0.0, 1.0, 0.0) * x);
  float fibre = 0.5 + 0.5 * sin(metres * 9.0 + x * 5.0 + seed);
  float rimed = smoothstep(0.2, 0.8, x) * smoothstep(0.35, 0.75, 0.6 * vnoise(vec2(metres * 0.9, seed)) + 0.4 * vnoise(vec2(metres * 4.5, seed + 3.0)));
  vec3 sinew = mix(vec3(0.1, 0.055, 0.045), vec3(0.035, 0.022, 0.022), fibre) * (1.0 + 0.8 * min(knots, 1.0));
  rimed *= 1.0 - vFar;
  vec3 cord = rigShade(vWorld, round_, toCamera, mix(sinew, vec3(0.6, 0.64, 0.7), rimed), mix(0.28, 0.8, rimed), 1.0) * (1.0 - 0.5 * vFar);
  float corded = cordHere * (1.0 - 0.75 * blade) * mix(0.3, 1.0, max(vCord, vFar));
  c = mix(c, cord, corded);
  alpha = max(alpha, corded);
  // The ice on it: clear, lit along one side.
  vec3 hung = rigShade(vWorld, normalize(n + vec3(fx * 14.0, 0.3, 0.0)), toCamera, vec3(0.5, 0.56, 0.64), 0.12, 1.0) + 0.35 * skyRadiance(-toCamera);
  c = mix(c, hung, ice * (1.0 - corded));
  alpha = max(alpha, 0.85 * ice);
  // It is seen through by leaving pixels out, not by blending: every pixel it keeps has its own depth, so the air draws over it as over rock, and
  // the storm behind shows through the pixels it leaves. The pattern moves with each sample of a frame, and the samples add up to its true cover.
  float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + uDither);
  if (alpha <= grain) discard;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const KNOB_VERTEX = /* glsl */ `
${NOISE_GLSL}
attribute vec4 aSeed;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vSeed;
void main() {
  // A lump of flesh, not a ball: it bulges and folds its own way.
  vec3 at = position * 2.2 + aSeed.xyz * 30.0;
  float bulge = 0.34 * (vnoise3(at) - 0.5) + 0.16 * (vnoise3(at * 2.7) - 0.5);
  vec3 local = position * (1.0 + bulge);
  vec4 w = modelMatrix * instanceMatrix * vec4(local, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vLocal = position;
  vSeed = aSeed;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const KNOB_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vSeed;
void main() {
  vec3 toCamera = normalize(cameraPosition - vWorld);
  // Knotted flesh: brown, wet, creased where it has swollen into the crack and folded on itself, darker in the creases.
  vec3 at = vLocal * 2.2 + vSeed.xyz * 30.0;
  float e = 0.06;
  float f0 = vnoise3(at * 2.7) + 0.5 * vnoise3(at * 6.5);
  vec3 slope = vec3(vnoise3((at + vec3(e, 0.0, 0.0)) * 2.7) + 0.5 * vnoise3((at + vec3(e, 0.0, 0.0)) * 6.5), vnoise3((at + vec3(0.0, e, 0.0)) * 2.7) + 0.5 * vnoise3((at + vec3(0.0, e, 0.0)) * 6.5), vnoise3((at + vec3(0.0, 0.0, e)) * 2.7) + 0.5 * vnoise3((at + vec3(0.0, 0.0, e)) * 6.5)) - f0;
  vec3 n = normalize(vNormal - 0.35 * slope / e * 0.2);
  float crease = 1.0 - smoothstep(0.0, 0.1, abs(vnoise3(at * 1.9 + 7.0) - 0.5));
  float sinews = 0.5 + 0.5 * sin(vLocal.y * 16.0 + 5.0 * vnoise3(at * 1.3));
  vec3 flesh = mix(vec3(0.15, 0.085, 0.06), vec3(0.075, 0.04, 0.036), 0.6 * crease + 0.3 * sinews) * (0.75 + 0.5 * f0 * 0.66);
  // Rime on what looks up and into the wind, in soft drifts.
  float rime = smoothstep(0.62, 0.92, n.y * 0.6 - dot(n, normalize(uWind.xyz)) * 0.45 + 0.55 * vnoise3(vWorld * 1.7) + 0.2 * (f0 - 0.75)) * (1.0 - 0.7 * crease);
  vec3 albedo = mix(flesh, vec3(0.68, 0.72, 0.78), rime);
  vec3 c = rigShade(vWorld, n, toCamera, albedo, mix(0.36, 0.9, rime), 1.0 - 0.65 * crease);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export function create(ctx: Context): Piece {
  const rng = ctx.rng('kites');
  const ribbons: Ribbon[] = [];
  spires.forEach((sp, n) => {
    const near = n === FIRST;
    const reach = near ? 1 : n === FIRST + 2 ? 1.9 : n === FIRST + 1 ? 0.6 : 0.85;
    for (const [share, count] of colonies(n)) {
      const t = share + rng.range(-0.008, 0.008);
      for (let i = 0; i < count; i++) {
        // A colony is a few ribbons of one holdfast: one long streamer, the rest shorter, none alike.
        const length = (i === 0 ? rng.range(190, 260) : rng.range(70, 170)) * reach;
        // Over 0.86 of its height the lee prong of the split top stands lower than the storm's: the holdfast goes down with it.
        const at = t + (i - (count - 1) / 2) * 0.006;
        const k = Math.max(0, (at - 0.86) / 0.14);
        const anchor = finEdge(sp, at, 0.93, rng.range(-0.25, 0.25));
        anchor[1] -= k * k * 0.04 * sp.tip + k * 4.5;
        ribbons.push({
          anchor,
          length,
          width: near ? (i === 0 ? rng.range(8.5, 12) : rng.range(3, 5.5)) : rng.range(10, 15) * (i === 0 ? 1 : 0.75),
          phase: rng.range(0, 6.28),
          wave: length / rng.range(2.2, 4.2),
          sag: n === FIRST + 2 ? rng.range(0.06, 0.16) : rng.range(0.01, 0.06),
          seed: rng.next(),
          spire: n - FIRST + 1,
          stalk: rng.range(14, 30) * (near ? 1 : 1.6) / length,
        });
      }
    }
  });

  const per = (ALONG + 1) * (ACROSS + 1);
  const anchor = new Float32Array(ribbons.length * per * 3);
  const shape = new Float32Array(ribbons.length * per * 4);
  const more = new Float32Array(ribbons.length * per * 4);
  const at = new Float32Array(ribbons.length * per * 2);
  const index: number[] = [];
  ribbons.forEach((rb, r) => {
    for (let i = 0; i <= ALONG; i++) {
      for (let j = 0; j <= ACROSS; j++) {
        const v = r * per + i * (ACROSS + 1) + j;
        anchor.set(rb.anchor, v * 3);
        shape.set([rb.length, rb.width, rb.phase, rb.wave], v * 4);
        more.set([rb.sag, rb.seed, rb.spire, rb.stalk], v * 4);
        at.set([i / ALONG, (j / ACROSS) * 2 - 1], v * 2);
        if (i < ALONG && j < ACROSS) index.push(v, v + 1, v + ACROSS + 1, v + 1, v + ACROSS + 2, v + ACROSS + 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ribbons.length * per * 3), 3));
  geometry.setAttribute('aAnchor', new THREE.BufferAttribute(anchor, 3));
  geometry.setAttribute('aShape', new THREE.BufferAttribute(shape, 4));
  geometry.setAttribute('aMore', new THREE.BufferAttribute(more, 4));
  geometry.setAttribute('aAt', new THREE.BufferAttribute(at, 2));
  geometry.setIndex(index);

  const pixel = { value: 0.0005 };
  const struck = new THREE.Vector4(0, 0, 0, 0);
  const dither = { value: 0.5 };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, uPixel: pixel, uDither: dither, uStruck: { value: struck }, uGlowTint: { value: new THREE.Vector3(1.3, 1.05, 2.8) } },
    side: THREE.DoubleSide,
  });
  const kites = new THREE.Mesh(geometry, material);
  kites.frustumCulled = false;
  kites.renderOrder = 4;

  // The holdfasts: a cluster of leathery knobs in the crack each stalk comes from.
  const KNOBS = 9;
  const knobGeometry = new THREE.SphereGeometry(1, 22, 16);
  const knobs = new THREE.InstancedMesh(knobGeometry, new THREE.ShaderMaterial({ vertexShader: KNOB_VERTEX, fragmentShader: KNOB_FRAGMENT, uniforms: { ...ctx.rig.uniforms } }), ribbons.length * KNOBS);
  const seeds = new Float32Array(ribbons.length * KNOBS * 4);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const out = new THREE.Vector3(WIND[0], 0.25, WIND[2]).normalize();
  ribbons.forEach((rb, r) => {
    for (let k = 0; k < KNOBS; k++) {
      const girth = Math.min(rb.width, 4.2);
      const size = girth * (k === 0 ? 0.34 : rng.range(0.13, 0.28));
      const off = k === 0 ? 0 : girth * rng.range(0.25, 0.7);
      const a = rng.range(0, Math.PI * 2);
      // Each knob points out of the rock, down the wind, a little its own way.
      const aim = new THREE.Vector3(out.x + rng.range(-0.5, 0.5), out.y + rng.range(-0.4, 0.5), out.z + rng.range(-0.5, 0.5)).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
      m.compose(new THREE.Vector3(rb.anchor[0] + Math.cos(a) * off * 0.5, rb.anchor[1] + Math.sin(a) * off, rb.anchor[2] + Math.cos(a * 1.7) * off * 0.4), q, new THREE.Vector3(size * 0.62, size * 1.15, size * 0.62));
      knobs.setMatrixAt(r * KNOBS + k, m);
      seeds.set([rng.next(), rng.next(), rng.next(), rng.next()], (r * KNOBS + k) * 4);
    }
  });
  knobGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  knobs.instanceMatrix.needsUpdate = true;
  knobs.frustumCulled = false;

  ctx.scene.add(ctx.parts.built('tether-kites', kites, knobs));
  ctx.scene.add(knobs);

  const size = new THREE.Vector2();
  let height = 0;
  return {
    setTime: (seconds) => {
      const flash = flashAt(seconds);
      dither.value = ditherAt(seconds);
      // The charge lingers in the ribbons a little after the stroke.
      struck.set(flash ? flash.spire : 0, flash ? Math.min(1.5, flash.power * 1.2 + 0.5 * Math.exp(-Math.max(0, flash.age) / 0.35) * (flash.age > 0 ? 1 : 0)) : 0, 0, 0);
    },
    beforeSample: (renderer, camera) => {
      renderer.getDrawingBufferSize(size);
      pixel.value = 2 / ((camera.projectionMatrix.elements[5] as number) * (height || size.y || 2160));
    },
    resize: (_w, h) => {
      height = h;
    },
  };
}
