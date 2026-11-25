// The lake of the Heart: the crust, the lava that shows in its seams, and the crust that founders at the fountains.
// The crust is one sheet. What it shows is read from the net of plates (net.ts), which rides the drift of the lake:
// seams that open, widen, skin over and close, the open pool at the foot of the fall, the torn margin against the rock.
// The same heat is drawn into the rig's glow map, so that what lights the land and the animals is what the camera sees.
import * as THREE from 'three';
import type { HeartContext, HeartPiece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { SUNK } from '../shared/anchors';
import { NET, NET_FINE, POOL, RIDGES, bakeNet } from './net';
import { createFoundering } from './founder';
import { HEAT_GLSL } from './heat';
import { createLava } from './lava';

export const PARTS: readonly string[] = ['crust', 'lava', 'foundering'];

// The height of the crust in metres, one function for every cell of the sheet. `c` is the size of the cells that carry it there:
// every part of the relief fades out before the cells get too coarse to hold it, so nothing swims and nothing pops.
// A billow, broad lobes poured on each other, festoons of cords where the skin was gathered, then the lips, the gaps cut down
// to their floor, pressure ridges and the heaps against the rock.
const RELIEF_GLSL = /* glsl */ `
uniform vec4 uRidge[2];
uniform vec2 uRidgeSize[2];
uniform vec4 uGroupSeam;
// Lobes: the skin is poured in broad overlapping tongues 3 to 10 m across, each a low dome with a soft rounded front, each lying
// on the ones poured before it. The tongues of one stretch of crust run one way. The highest one wins.
#define LOBE 5.5
vec2 gLobeId;
vec2 gLobeGrad;
float gLobeT2;
float gLobeTall;
float gLobeNext;
float lobeAt(vec2 q) {
  vec2 lp = q / LOBE + 0.4 * vec2(vnoise(q / 6.1 + 23.0), vnoise(q / 6.1 + 31.0));
  vec2 base = floor(lp);
  float best = 0.0;
  float next = 0.0;
  float flowTurn = 9.4 * vnoise(q / 60.0 + 3.0);
  float wobble = 0.8 + 0.5 * vnoise(q / 2.1 + 1.3);
  gLobeId = base;
  gLobeGrad = vec2(0.0);
  gLobeT2 = 0.0;
  gLobeTall = 0.0;
  for (int j = 0; j < 3; j++) {
    for (int i = 0; i < 3; i++) {
      vec2 c2 = base + vec2(float(i - 1), float(j - 1));
      vec2 hs = hash22(c2 + 0.37);
      float hr = hash12(c2 + 5.9);
      float R = 0.6 + 0.5 * hr;
      vec2 rel = lp - c2 - 0.1 - 0.8 * hs;
      float turn = flowTurn + 1.5 * (fract(hr * 13.7) - 0.5);
      vec2 along = vec2(cos(turn), sin(turn));
      vec2 side = vec2(-along.y, along.x);
      float narrow = 1.2 + 0.5 * fract(hr * 3.3);
      vec2 loc = vec2(dot(rel, along), narrow * dot(rel, side));
      float t2 = dot(loc, loc) / (R * R) * wobble;
      if (t2 < 1.0) {
        // Thin where it was fed from, thick at its front, and the front is round: no edge anywhere.
        float tall = (0.07 + 0.15 * fract(hr * 7.1)) * (0.3 + 0.7 * smoothstep(-1.0, 0.5, loc.x / R));
        float hgt = tall * (1.0 - t2 * t2 * t2);
        if (hgt > best) {
          next = best;
          best = hgt;
          gLobeId = c2;
          gLobeGrad = (loc.x * along + narrow * loc.y * side) * (2.0 * wobble / (R * R * LOBE));
          gLobeT2 = t2;
          gLobeTall = tall;
        } else if (hgt > next) {
          next = hgt;
        }
      }
    }
  }
  gLobeNext = next;
  return best;
}
// Folds: where the skin was pushed while it was soft it lies in ropes as thick as an arm, 20 to 60 cm from crest to crest,
// in swirls metres across, with smooth skin between the swirls, and they swell and die along their length. Returns the
// profile across one fold, 0 in the crease and 1 on the crest; the cover and depth go to gFoldCover, the count of folds
// crossed to gFoldPhase. On each fold lie cords as thick as a wrist, which only the normal can carry.
float gFoldCover;
float gFoldPhase;
#define BUNDLE 2.4
float foldAt(vec2 q) {
  gFoldPhase = 0.0;
  gFoldCover = 0.0;
  vec2 base = floor(q / BUNDLE);
  vec2 wq = q + 0.6 * vec2(vnoise(q / 1.7 + 5.0), vnoise(q / 1.7 + 31.0));
  float flowTurn = 9.4 * vnoise(q / 60.0 + 3.0);
  float best = 1.0;
  float next = 1.0;
  for (int j = 0; j < 3; j++) {
    for (int i = 0; i < 3; i++) {
      vec2 c2 = base + vec2(float(i - 1), float(j - 1));
      float hr = hash12(c2 + 8.1);
      vec2 rel = wq - (c2 + 0.15 + 0.7 * hash22(c2 + 2.37)) * BUNDLE;
      float d = length(rel) / (0.8 + 1.3 * hr);
      if (d < best) {
        next = best;
        best = d;
        // A bundle is a sheaf of arcs that bulge downstream.
        float turn = flowTurn + 2.6 * (fract(hr * 17.3) - 0.5);
        vec2 along = vec2(cos(turn), sin(turn));
        float side = rel.x * along.y - rel.y * along.x;
        gFoldPhase = (dot(rel, along) + (0.2 + 0.5 * fract(hr * 5.7)) * side * side) / (0.28 + 0.14 * fract(hr * 11.3)) + 7.0 * hr;
      } else if (d < next) {
        next = d;
      }
    }
  }
  if (best >= 1.0) return 1.0;
  // A fold swells and dies along its length, and none runs true.
  gFoldCover = smoothstep(0.0, 0.22, min(1.0 - best, next - best)) * (0.3 + 0.7 * smoothstep(0.2, 0.65, vnoise(q / 0.9 + 19.0)));
  gFoldPhase += 0.45 * vnoise(q / 0.57 + 3.0);
  return abs(sin(3.14159 * gFoldPhase));
}
#define FOLD_DEEP 0.2
// The two pressure ridges the pictures name.
float gRidgeOn;
float ridgeAt(vec2 q, float c) {
  float h = 0.0;
  gRidgeOn = 0.0;
  for (int i = 0; i < 2; i++) {
    vec2 ab = uRidge[i].zw - uRidge[i].xy;
    vec2 rel = q - uRidge[i].xy;
    float t = clamp(dot(rel, ab) / dot(ab, ab), 0.0, 1.0);
    float across = length(rel - ab * t);
    float size = uRidgeSize[i].y;
    if (across > 3.0 * size) continue;
    float side = (rel.x * ab.y - rel.y * ab.x) / length(ab);
    float tall = (0.55 + 0.45 * vnoise(q / (1.9 * size) + 3.0)) * pow(sin(t * 3.14159), 0.6);
    float reach = (side > 0.0 ? 1.0 + 0.5 * vnoise(q / 1.3) : 2.1 + 0.8 * vnoise(q / 2.3 + 9.0)) * size;
    float rise = max(0.0, 1.0 - across / reach);
    // Clinker: a heap of broken blocks, lumpy in outline, with nothing smooth on it.
    float blocks = 0.5 * vnoise(q / (0.45 * size) + 17.0) + 0.32 * vnoise(q / (0.17 * size) + 5.0) + 0.18 * mix(vnoise(q / (0.06 * size) + 2.0), 0.5, smoothstep(0.02, 0.05, c / size));
    h += uRidgeSize[i].x * tall * rise * (0.4 + 1.2 * blocks);
    gRidgeOn = max(gRidgeOn, smoothstep(0.0, 0.15, rise) * smoothstep(0.0, 0.2, tall));
  }
  return h;
}
float gRope;
float gBank;
float gRidge;
// Against the far walls the crust is buckled and heaped: slabs upturned and rafted on each other in a crooked band.
// Along the bench of the near shore, where the cameras stand, it lies flat. Returns how broken the crust is, and leaves the
// height of the heap in gShore.
float gShore;
float shoreAt(vec2 q, float lake, float c) {
  gShore = 0.0;
  if (lake > 40.0) return 0.0;
  float onLake = smoothstep(-1.5, 1.5, lake);
  // The island of rock in the near lake: the crust is broken and heaped a little all round it.
  float isle = (1.0 - smoothstep(9.0, 14.5, length(q - vec2(-453.4, 241.2)))) * step(lake, 7.0);
  float broken = isle;
  if (isle > 0.0) gShore = isle * isle * (0.1 + 0.5 * vnoise(q / 2.3 + 3.0)) * onLake * (1.0 - smoothstep(1.0, 3.0, c));
  float farSide = smoothstep(160.0, 320.0, length(q - vec2(-500.0, 250.0)));
  if (farSide <= 0.0) return broken;
  // The band is 10 to 30 m wide, and here and there the lake comes through to the rock.
  float wideBand = 10.0 + 20.0 * vnoise(q / 47.0 + 61.0);
  float breach = smoothstep(0.22, 0.34, vnoise(q / 31.0 + 71.0));
  float into = clamp(1.0 - lake / wideBand, 0.0, 1.0) * farSide * breach;
  if (into <= 0.0) return broken;
  // Heaps: long ridges that lie along the shore, uneven in height, and upturned slabs on them.
  float heap = 0.35 + 0.65 * vnoise(q / 17.0 + 83.0);
  float crest = 0.5 + 0.5 * sin(lake / (2.5 + 2.5 * vnoise(q / 21.0 + 5.0)) * 3.1 + 5.0 * vnoise(q / 9.0 + 12.0));
  float tall = smoothstep(0.0, 0.35, into) * (0.25 + 0.75 * into) * heap * (0.5 + 0.9 * crest * crest) * 1.9;
  float blocks = vnoise(q / 3.1 + 33.0) * 0.7 + vnoise(q / 1.3 + 9.0) * 0.3 * (1.0 - smoothstep(0.5, 1.2, c));
  tall *= (0.55 + 0.9 * blocks) * (0.35 + 0.65 * onLake);
  gShore += tall * (1.0 - smoothstep(4.0, 9.0, c));
  return max(broken, smoothstep(0.0, 0.3, into));
}
// How far from the seam the group feeds at, metres.
float groupFar(vec2 q) {
  vec2 gab = uGroupSeam.zw - uGroupSeam.xy;
  return length(q - uGroupSeam.xy - gab * clamp(dot(q - uGroupSeam.xy, gab) / dot(gab, gab), 0.0, 1.0));
}
float heightAt(vec2 q, float c) {
  vec4 n = netAt(q);
  float shown = step(1.5, n.g);
  float live = step(1e-3, n.a);
  float gape = 0.0;
  float bank = n.r;
  if (live > 0.5) {
    gape = gapeAt(q, n).x;
    // The torn edge is finer than the far cells: there the wall runs smooth, or it would be cut into teeth.
    float tornLow = (vnoise(q * 1.7 + 11.0) - 0.5) * 0.5;
    float torn = tornLow * (1.0 - smoothstep(0.15, 0.4, c)) + (tornAt(q) - tornLow) * (1.0 - smoothstep(0.03, 0.08, c));
    bank = n.r + torn * smoothstep(0.0, 0.3, n.a) - gape;
  }
  gBank = bank;
  gRope = 0.0;
  float lake = -landAt(q).b;
  float calm = smoothstep(uSunk.z - 5.0, uSunk.z + 5.0, length(q - uSunk.xy));
  float shoreUp = shoreAt(q, lake, c);
  // Some of the shut edges between plates are pressure ridges: slabs upturned and heaped.
  float ridgeUp = 0.0;
  if (live < 0.5 && n.g > 0.45 && c < 3.0) {
    ridgeUp = smoothstep(0.45, 0.6, n.g) * (1.0 - shown) * (0.4 + 1.2 * (n.g - 0.5)) * max(0.0, 1.0 - n.r / (1.0 + 1.5 * vnoise(q / 6.0 + 2.0)));
    ridgeUp *= smoothstep(25.0, 45.0, groupFar(q)) * calm * (1.0 - smoothstep(1.0, 3.0, c)) * smoothstep(14.0, 30.0, lake) * smoothstep(0.3, 0.6, vnoise(q / 13.0 + 40.0));
  }
  gRidge = ridgeUp;

  // A plate rides the melt: it rises and sinks a finger's width, each in its own time.
  float h = 0.015 * sin(uTime * 0.7 + n.b * 9.0) * calm;
  if (ridgeUp > 0.0) h += pow(ridgeUp, 1.5) * (0.5 + 1.2 * vnoise(q / 5.0 + 5.0));

  // The billow of the skin and the lobes on it. The cords are finer than the cells and go into the normal.
  if (c < 1.5) {
    // Nothing of the skin's relief stands above the rock where the lake runs out under the shore.
    float off = smoothstep(0.0, 2.5, lake);
    h += off * (0.42 * (vnoise(q / 2.6 + 1.0) - 0.5) + 0.045 * (vnoise(q / 1.1 + 7.0) - 0.5) * (1.0 - smoothstep(0.25, 0.5, c))) * (1.0 - smoothstep(0.7, 1.5, c)) * calm;
    h += off * lobeAt(q) * (1.0 - smoothstep(0.5, 1.2, c)) * calm * (1.0 - 0.5 * shoreUp);
    if (c < 0.13) {
      float fold = foldAt(q);
      h += off * gFoldCover * FOLD_DEEP * (pow(fold, 0.7) - 0.65) * (1.0 - smoothstep(0.06, 0.13, c)) * calm * (1.0 - shoreUp) * (1.0 - min(1.0, 3.0 * ridgeUp));
    }
  }

  // Where crust has been broken, at the ridges and against the rock, it lies in upturned slabs with rubble between them.
  float rub = max(shoreUp, 0.8 * ridgeUp);
  if (rub > 0.0 && c < 0.7) {
    float saw = fract(dot(q, vec2(0.41, 0.33)) + 1.7 * vnoise(q / 3.7 + 3.0));
    saw = min(saw / 0.8, (1.0 - saw) / 0.2);
    h += rub * calm * 0.45 * saw * (0.3 + 0.7 * vnoise(q / 2.9 + 5.0)) * (1.0 - smoothstep(0.3, 0.7, c));
    if (c < 0.07) h += rub * calm * (0.16 * smoothstep(0.5, 0.75, vnoise(q / 0.27 + 13.0)) * (1.0 - smoothstep(0.03, 0.07, c)) + 0.07 * smoothstep(0.5, 0.75, vnoise(q / 0.11 + 3.0)) * (1.0 - smoothstep(0.012, 0.03, c)));
  }
  h += gShore;

  // Beside a gap the skin is thin and young and sags to the melt, and where it tore its edge is curled up into a thin lip.
  // The gap is cut down: in the seams the pictures name the melt is the lava's mesh, and the floor lies just under it.
  if (live > 0.5) {
    float wide = smoothstep(0.04, 0.25, gape);
    float named = shown * smoothstep(0.2, 0.3, gape);
    // The brim hardly sags: the crust ends in a lip that stands over the melt.
    float brim = mix(-0.02, max(meltLevel(n) + 0.03, -0.05), named);
    h = mix(h, brim + 0.12 * h, exp(-max(bank, 0.0) / 0.7) * wide);
    float lipWide = max(0.06, 2.5 * c);
    float lipAt = (bank - 0.07) / lipWide;
    h += (0.05 + 0.1 * vnoise(q / 0.9 + 5.0)) * exp(-lipAt * lipAt) * (0.06 / lipWide) * wide * smoothstep(0.25, 0.45, vnoise(q / 2.3 + 15.0)) * (1.0 - smoothstep(0.03, 0.08, c));
    float deep = mix(0.03 + 0.25 * min(gape, 0.3), 0.15 - meltLevel(n), named);
    float cut = (1.0 - smoothstep(-max(5.0 * c - 0.035, 0.05), min(2.0 * max(c - 0.04, 0.0), 0.6), bank)) * min(1.0, 2.0 * gape / max(1.5 * c, 1e-3));
    if (gape > 0.45 && n.g < 3.3) cut *= 1.0 - isleAt(q, n.r / max(gape, 1e-3)) * smoothstep(0.45, 0.6, gape) * (1.0 - smoothstep(0.03, 0.08, c));
    h = mix(h, -deep, cut);
  }
  if (c < 3.0) h += ridgeAt(q, c) * (1.0 - smoothstep(1.0, 3.0, c));
  return h;
}`;

const VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec2 vDrift;
${RIG_GLSL}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vDrift = flowVelocity(w.xz) * (uTime - uFlowT0);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// One ring of cells. The cells are fixed in the crust's rest frame: a vertex is a point of the crust, lifted by the relief
// and carried by the drift, so the lattice never slides over the relief.
const RING_VERTEX = /* glsl */ `
uniform vec3 uRing;
uniform vec4 uFocus;
uniform highp sampler2D tBake;
varying vec3 vWorld;
varying vec2 vQ;
varying vec3 vNormalG;
varying vec3 vAux;
varying vec2 vAway;
${RIG_GLSL}
void main() {
  vec2 q = uRing.xy + position.xz * uRing.z;
  vec2 dq = abs(q - uFocus.xy);
  float c = max(uFocus.z, 4.0 * max(dq.x, dq.y) / (uFocus.w - 4.0));
  // The height was laid down for this sample in the ring's own picture: height, the ropes' part of it, metres to the brim.
  ivec2 ij = ivec2(position.xz + 0.5);
  ivec2 last = textureSize(tBake, 0) - 1;
  ivec2 sx = ivec2(ij.x < last.x ? 1 : -1, 0);
  ivec2 sz = ivec2(0, ij.y < last.y ? 1 : -1);
  vec4 here = texelFetch(tBake, ij, 0);
  vec4 atX = texelFetch(tBake, ij + sx, 0);
  vec4 atZ = texelFetch(tBake, ij + sz, 0);
  float smoothH = here.r - here.g;
  vec2 rise = vec2((atX.r - atX.g - smoothH) * float(sx.x), (atZ.r - atZ.g - smoothH) * float(sz.y));
  vNormalG = normalize(vec3(-rise.x, uRing.z, -rise.y));
  // Which way is away from the nearest gap.
  vAway = vec2((atX.b - here.b) * float(sx.x), (atZ.b - here.b) * float(sz.y)) / uRing.z;
  vAux = vec3(1.0, c, here.b);
  float dt = uTime - uFlowT0;
  vec2 p = q + flowVelocity(q) * dt;
  p = q + flowVelocity(p) * dt;
  vWorld = vec3(p.x, here.r, p.y);
  vQ = q;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

// The relief of a ring is worked out once a sample, a point for each vertex, by the part of the machine that is fast at it:
// the blocks of the ring that are in view are drawn as squares into a small picture, one texel a vertex.
const BAKE_VERTEX = /* glsl */ `
uniform vec2 uSpan;
void main() {
  gl_Position = vec4(position.xz / uSpan * 2.0 - 1.0, 0.0, 1.0);
}`;

const BAKE_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uRing;
uniform vec4 uFocus;
uniform sampler2D tRope;
#define LAKE_VERTEX
${NOISE_GLSL}
${RIG_GLSL}
${HEAT_GLSL}
${RELIEF_GLSL}
void main() {
  vec2 q = uRing.xy + floor(gl_FragCoord.xy) * uRing.z;
  vec2 dq = abs(q - uFocus.xy);
  // The size of the cells that are sure to be here, wherever the rings are snapped to.
  float c = max(uFocus.z, 4.0 * max(dq.x, dq.y) / (uFocus.w - 4.0));
  float h = heightAt(q, c);
  gl_FragColor = vec4(h, gRope, clamp(gBank, -8.0, 8.0), 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vQ;
varying vec3 vNormalG;
varying vec3 vAux;
varying vec2 vAway;
uniform sampler2D tRope;
uniform float uLava;
${NOISE_GLSL}
${RIG_GLSL}
#define LAKE_LIP
${HEAT_GLSL}
${RELIEF_GLSL}

// What a mirror on the lake sees toward r: the sky above the walls, the walls and the haze under it, the fume lit by the lake.
vec3 lakeMirror(vec3 r, float rough) {
  float wall = 0.16 + 0.2 * max(-r.z, 0.0);
  float soft = 0.05 + 0.5 * rough;
  float sky = smoothstep(wall - soft, wall + soft, r.y);
  float w = max(dot(normalize(vec3(r.x, max(r.y, 0.0), r.z)), uWarmDir), 0.0);
  vec3 low = uSkyHorizon * 0.3 + uWarmColour * w * w * w * 0.6;
  return mix(low, skyRadiance(vec3(r.x, max(r.y, wall), r.z)), sky);
}

void main() {
  vec2 q = vQ;
  vec4 land = landAt(vWorld.xz);
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  float lake = -land.b;
  vec3 v = toCamera / far;
  vec4 net = netAt(q);
  vec2 qx = dFdx(q);
  vec2 qy = dFdy(q);
  // The footprint of a pixel on the crust: long along the view, short across it.
  float fpLong = max(length(qx), length(qy));
  float fpShort = min(length(qx), length(qy));
  float cell = vAux.y;
  float shown = step(1.5, net.g);
  float live = step(1e-3, net.a);

  vec4 heat = heatAt(q, lake, net, 0.0);
  float gape = gapeAt(q, net).x;
  float bank = heat.z;
  float young = heat.w;
  float calm = smoothstep(uSunk.z - 5.0, uSunk.z + 5.0, length(q - uSunk.xy));

  float broken = shoreAt(q, lake, cell);
  ridgeAt(q, cell);
  float clinker = gRidgeOn;
  broken = max(broken, clinker);
  // The crust the group feeds on is the youngest of the lake: dark, glassy, hardly a day old.
  float fresh = 1.0 - smoothstep(12.0, 55.0, groupFar(q) + 14.0 * (vnoise(q / 17.0 + 8.0) - 0.5));
  // Age lies on the lake in broad patches, and each plate and each lobe has its own on top of that.
  float age = 0.5 + 1.6 * (0.65 * vnoise(q / 110.0 + 4.0) + 0.35 * vnoise(q / 37.0 + 9.0) - 0.5) + 0.5 * (net.b - 0.5);

  vec3 n = normalize(vNormalG);
  vec2 slope = vec2(0.0);
  float crease = 1.0;
  float foldPhase = 0.0;
  float foldOn = 0.0;
  // Lobes and cords, as far as a pixel can tell one from the next. Beyond that the skin is a smooth sheet.
  if (fpLong < 0.7) {
    float lobeHigh = lobeAt(q);
    float has = step(1e-4, gLobeTall);
    float detail = 1.0 - smoothstep(0.3, 0.7, fpLong);
    age += 0.1 * (hash12(gLobeId + 5.3) - 0.5) * detail * has;
    // Where the cells are too coarse to carry a lobe, its dome goes into the normal.
    vec2 fall = -3.0 * gLobeTall * gLobeT2 * gLobeT2 * gLobeGrad;
    slope += fall * min(1.0, 1.2 / max(length(fall), 1e-4)) * calm * smoothstep(0.5, 1.2, cell) * detail * has;
    // Dark where one tongue lies on the next.
    crease = mix(1.0, 0.7 + 0.3 * smoothstep(0.0, 0.03, lobeHigh - gLobeNext), calm * step(1e-4, gLobeNext) * (1.0 - smoothstep(0.03, 0.2, fpShort)));
    // Past this a pixel is longer than a bundle and nothing of the folds is left to draw.
    if (fpLong < 0.4) {
      foldAt(q);
      foldOn = gFoldCover * calm * (1.0 - broken) * smoothstep(0.0, 2.5, lake) * (1.0 - smoothstep(0.3, 0.4, fpLong));
      foldPhase = gFoldPhase;
    }
  }
  // Folds, the cords on them, four to a fold, and the bundles, three folds to a band: each is drawn as long as a pixel is
  // finer than one of it across its run, so that none can beat against the pixels. All run along the lines of equal
  // phase, and the phase is smooth, so its slope is taken from the screen.
  vec2 phaseD = vec2(dFdx(foldPhase), dFdy(foldPhase));
  float per = max(abs(phaseD.x), abs(phaseD.y));
  float turn = 3.14159 * foldPhase;
  float fold = abs(sin(turn));
  float cord = abs(sin(4.0 * turn));
  float band = abs(sin(turn / 3.0));
  float foldSeen = foldOn * (1.0 - smoothstep(0.12, 0.3, per));
  float cords = foldOn * (1.0 - smoothstep(0.02, 0.05, per));
  float bands = foldOn * (1.0 - smoothstep(0.4, 0.95, per)) - foldSeen;
  // The slope of a fold where the cells are too coarse to carry it, and of the cords always.
  float foldRise = FOLD_DEEP * 0.7 * 3.14159 * pow(max(fold, 0.06), -0.3) * cos(turn) * sign(sin(turn)) * foldSeen * smoothstep(0.06, 0.13, cell);
  foldRise += 0.035 * 4.0 * 3.14159 * cos(4.0 * turn) * sign(sin(4.0 * turn)) * cords;
  // Black in the crease and the groove, by how deep a point lies below the crests beside it; a pale line on the crest.
  crease *= mix(1.0, 0.25 + 0.75 * smoothstep(0.0, 0.8, fold), foldSeen - 0.6 * cords);
  crease *= mix(1.0, 0.12 + 0.88 * smoothstep(0.0, 0.7, cord), cords);
  crease *= mix(1.0, 0.72 + 0.28 * smoothstep(0.0, 0.8, band), bands);
  float crest = cords * pow(cord, 3.0) + (foldSeen - cords) * pow(fold, 3.0) + 0.3 * bands * pow(band, 3.0);
  float det = qx.x * qy.y - qx.y * qy.x;
  if (abs(det) > 1e-12) slope += clamp(vec2(phaseD.x * qy.y - phaseD.y * qx.y, phaseD.y * qx.x - phaseD.x * qy.x) / det, -6.0, 6.0) * clamp(foldRise, -0.7, 0.7);
  age = clamp(age, 0.0, 1.0) * (1.0 - 0.8 * young) * (1.0 - 0.7 * fresh);
  n = normalize(n - vec3(slope.x, 0.0, slope.y) * n.y);

  // Old skin is grey and rough, young skin black, smooth and glassy: by patch, by plate and by lobe.
  vec3 albedo = mix(vec3(0.04, 0.0345, 0.032), vec3(0.071, 0.062, 0.058), age) * (0.9 + 0.2 * vnoise(q / 3.1 + 13.0));
  float rough = clamp(0.22 + 0.45 * age + 0.2 * (foldOn - foldSeen) - 0.15 * crest + 0.3 * broken, 0.15, 0.92);

  // How much sky a point sees: less in a crease, between two lobes, below the brim of a gap.
  float below = max(-vWorld.y, 0.0);
  // Broken crust is dark, dull clinker, pitted between its blocks.
  if (broken > 0.0) {
    float pits = 0.35 + 0.65 * smoothstep(0.3, 0.65, 0.6 * vnoise(q / 0.31 + 7.0) + 0.4 * vnoise(q / 0.09 + 3.0));
    albedo = mix(albedo, vec3(0.042, 0.032, 0.028) * (0.6 + 0.8 * vnoise(q / 0.6 + 41.0)), max(clinker, 0.6 * broken));
    crease *= mix(1.0, pits, max(clinker, broken));
  }
  // A joint that no picture names is a fine dark line seen close, and is gone from the wide view.
  float inGap = live * (1.0 - smoothstep(-0.02, 0.06, bank)) * mix(1.0 - smoothstep(0.03, 0.12, fpLong), 1.0, shown);
  float pit = mix(1.0, clamp(1.0 - below / max(2.5 * gape, 0.12), 0.04, 1.0), inGap);
  float occ = crease * pit;
  vec3 p = vec3(vWorld.x, max(vWorld.y, 0.02), vWorld.z);
  // A face that stands steep among folds and lobes looks at its neighbour and not at the sky.
  float open = land.g * (1.0 - contactAt(p)) * occ * mix(0.15, 1.0, smoothstep(0.3, 0.95, n.y));
  // The lake lies level with the crust: its glow from afar reaches only the faces that are turned toward it.
  float wallFace = 1.0 - smoothstep(0.35, 0.9, n.y);
  vec3 light = skyIrradiance(n) * open + lakeIrradianceFar(vec3(p.x, p.y + 1.5, p.z), n) * mix(1.0, occ, 0.5) * (0.12 + 0.6 * wallFace) + emitterIrradiance(p, n) * mix(1.0, occ, 0.7);
  float steepAway = length(vAway);
  vec2 away = steepAway > 0.3 ? vAway / steepAway : vec2(0.0);
  if (shown > 0.5 && live > 0.5) light += meltLight(q, net, bank, below, n, away) * crease;
  // The narrow seams, whose heat this sheet draws, light their own lips.
  light += gLip * (1.0 - shown * smoothstep(0.12, 0.25, gape)) * (0.1 + 1.2 * wallFace) * crease;
  // A broken face is duller and browner than the skin.
  albedo = mix(albedo, vec3(0.05, 0.043, 0.04) * (0.6 + 0.8 * vnoise(vec2(q.x + q.y, vWorld.y * 3.0) * 9.0)), wallFace * inGap);
  vec3 c = albedo * light / 3.14159;
  // A cord's flank turned edge on would glint, one pixel wide.
  float nv = clamp(dot(n, v), 0.35 * foldSeen, 1.0);
  float gloss = (1.0 - rough) * (1.0 - rough);
  float fresnel = (0.03 + 0.97 * pow(1.0 - nv, 4.0)) * (0.09 + 0.24 * gloss);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  // The crest of a cord carries a pale line of the sky.
  c += fresnel * lakeMirror(r, rough) * open * (1.0 - 0.85 * clinker) * (1.0 + 0.9 * crest);

  // Heat: in a gap the cells hold, only its floor glows, and the floor of a deep one is left dark for the lava's own surface.
  float held = smoothstep(1.0, 2.5, 2.0 * gape / max(cell, 1e-3)) * live;
  float floorOnly = smoothstep(0.55, 0.85, vNormalG.y) * smoothstep(0.01, 0.03, below);
  float melt = shown * smoothstep(0.2, 0.3, gape) * smoothstep(0.0, 0.03, meltLevel(net) + below);
  heat.x *= mix(1.0, floorOnly * (1.0 - melt), held);
  heat.x *= smoothstep(900.0, 1010.0, heat.y) * (1.0 - broken);
  vec3 hot = blackbody(heat.y) * heat.x;
  gl_FragColor = vec4(rigOut(c * (1.0 - heat.x)) + hot * uLava, 1.0);
  // Last, after every derivative is taken. Far off the crust runs on under the rock, which hides it.
  if (land.b > 1.5 + 0.6 * max(far - 150.0, 0.0)) discard;
}`;

const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vDrift;
${NOISE_GLSL}
${RIG_GLSL}
${HEAT_GLSL}
void main() {
  vec2 xz = vWorld.xz;
  float shore = landAt(xz).b;
  vec2 q = xz - vDrift;
  vec4 heat = heatAt(q, -shore, netAt(q), 1.0 / uGlowTexels);
  gl_FragColor = vec4(blackbody(heat.y) * heat.x, 1.0);
  if (shore > 1.5) discard;
}`;

// The crust is drawn in square rings of cells that lie in the crust's rest frame. The innermost ring has cells of 2.3 cm
// and sits where the lens meets the lake; each ring out has cells twice as large, and the last is one sheet over the whole
// lake in cells of 6 m. Every ring is snapped to the lattice of the ring outside it, so a vertex is always the same point of
// the crust, and the outer row of each ring uses only the vertices the next ring has, so no gap opens between them.
const CELL = 6;
const RINGS = 8;
const N = 256;
const BLOCK = 16;
const CELL0 = CELL / 2 ** RINGS;
const X0 = Math.floor((NET.minX - 12) / CELL) * CELL;
const Z0 = Math.floor((NET.minZ - 12) / CELL) * CELL;
const SHEET_NX = Math.ceil((NET.minX + NET.width * NET.cell + 12 - X0) / CELL);
const SHEET_NZ = Math.ceil((NET.minZ + NET.height * NET.cell + 12 - Z0) / CELL);

function lattice(nx: number, nz: number): THREE.Float32BufferAttribute {
  const position = new Float32Array((nx + 1) * (nz + 1) * 3);
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      position[(j * (nx + 1) + i) * 3] = i;
      position[(j * (nx + 1) + i) * 3 + 2] = j;
    }
  }
  return new THREE.Float32BufferAttribute(position, 3);
}

interface Ring {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  /** The picture the relief is laid down in, a texel a vertex, and what draws it. */
  target: THREE.WebGLRenderTarget;
  bake: THREE.ShaderMaterial;
  squares: THREE.BufferGeometry;
  corners: THREE.BufferAttribute;
  index: THREE.BufferAttribute;
  uniform: THREE.Vector3;
  nx: number;
  nz: number;
  cell: number;
  /** Blocks are this many cells on a side: what is culled is culled a block at a time. */
  block: number;
  /** The outer row is stitched to a ring outside it. */
  stitched: boolean;
  x0: number;
  z0: number;
}

// The glow map is drawn from straight above on a plain sheet cut to the lake's outline.
function lakeSheet(ctx: HeartContext, cell: number): THREE.BufferGeometry {
  const x0 = NET.minX - 12;
  const z0 = NET.minZ - 12;
  const nx = Math.ceil((NET.width * NET.cell + 24) / cell);
  const nz = Math.ceil((NET.height * NET.cell + 24) / cell);
  const position: number[] = [];
  const faces: number[] = [];
  const index = new Map<number, number>();
  const corner = (i: number, j: number): number => {
    const k = j * (nx + 1) + i;
    let v = index.get(k);
    if (v === undefined) {
      v = position.length / 3;
      position.push(x0 + i * cell, 0, z0 + j * cell);
      index.set(k, v);
    }
    return v;
  };
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      if (ctx.rig.land.shore(x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell) > 2.5 + cell) continue;
      const a = corner(i, j);
      const b = corner(i + 1, j);
      const c = corner(i, j + 1);
      const d = corner(i + 1, j + 1);
      faces.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setIndex(faces);
  return g;
}

export function create(ctx: HeartContext): HeartPiece {
  const net = bakeNet((x, z) => -ctx.rig.land.shore(x, z));
  const shared = {
    ...ctx.rig.uniforms,
    tNet: { value: net.wide },
    uNetRect: { value: new THREE.Vector4(NET.minX, NET.minZ, 1 / (NET.width * NET.cell), 1 / (NET.height * NET.cell)) },
    tNetFine: { value: net.fine },
    uNetFineRect: { value: new THREE.Vector4(NET_FINE.minX, NET_FINE.minZ, 1 / (NET_FINE.width * NET_FINE.cell), 1 / (NET_FINE.height * NET_FINE.cell)) },
    uPool: { value: new THREE.Vector4(POOL.x, POOL.z, 1 / POOL.rx, 1 / POOL.rz) },
    uSunk: { value: new THREE.Vector3(SUNK[0], SUNK[2], 14) },
    tRopeNh: { value: ctx.assets.texture('mat/pahoehoe-nh.png', { kind: 'data' }) },
    tRope: { value: ctx.assets.texture('mat/pahoehoe.jpg') },
    uRidge: { value: RIDGES.map((r) => new THREE.Vector4(r.from[0], r.from[1], r.to[0], r.to[1])) },
    uRidgeSize: { value: RIDGES.map((r) => new THREE.Vector2(r.tall, r.reach)) },
    uGroupSeam: { value: new THREE.Vector4(-458.8, 221.3, -326.8, 179.3) },
  };
  const foundering = createFoundering(ctx);
  Object.assign(shared, foundering.uniforms);
  const lava = { value: 1 };
  const focus = new THREE.Vector4(0, 0, CELL0, N);
  const depthFragment = `precision highp float;\nvarying vec3 vWorld;\n${RIG_GLSL}\nvoid main() { if (landAt(vWorld.xz).b > 1.5 + 0.6 * max(length(cameraPosition - vWorld) - 150.0, 0.0)) discard; gl_FragColor = vec4(0.0); }`;

  const crust = new THREE.Group();
  const ringLattice = lattice(N, N);
  const makeRing = (nx: number, nz: number, cell: number, block: number, stitched: boolean, position: THREE.BufferAttribute): Ring => {
    const uniform = new THREE.Vector3(0, 0, cell);
    const target = new THREE.WebGLRenderTarget(nx + 1, nz + 1, { type: THREE.FloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, generateMipmaps: false });
    const ringUniforms = { uRing: { value: uniform }, uFocus: { value: focus } };
    const material = new THREE.ShaderMaterial({ vertexShader: RING_VERTEX, fragmentShader: FRAGMENT, uniforms: { ...shared, ...ringUniforms, uLava: lava, tBake: { value: target.texture } } });
    material.userData.depthFragment = depthFragment;
    const bake = new THREE.ShaderMaterial({ vertexShader: BAKE_VERTEX, fragmentShader: BAKE_FRAGMENT, uniforms: { ...shared, ...ringUniforms, uSpan: { value: new THREE.Vector2(nx + 1, nz + 1) } }, depthTest: false, depthWrite: false });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', position);
    const index = new THREE.BufferAttribute(new Uint32Array(nx * nz * 6), 1);
    index.setUsage(THREE.DynamicDrawUsage);
    geometry.setIndex(index);
    geometry.setDrawRange(0, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    crust.add(mesh);
    const blocks = Math.ceil(nx / block) * Math.ceil(nz / block);
    const corners = new THREE.BufferAttribute(new Float32Array(blocks * 18), 3);
    corners.setUsage(THREE.DynamicDrawUsage);
    const squares = new THREE.BufferGeometry();
    squares.setAttribute('position', corners);
    squares.setDrawRange(0, 0);
    return { mesh, material, target, bake, squares, corners, index, uniform, nx, nz, cell, block, stitched, x0: 0, z0: 0 };
  };
  const rings: Ring[] = [];
  for (let level = 0; level < RINGS; level++) rings.push(makeRing(N, N, CELL0 * 2 ** level, BLOCK, true, ringLattice));
  const sheet = makeRing(SHEET_NX, SHEET_NZ, CELL, 4, false, lattice(SHEET_NX, SHEET_NZ));
  sheet.x0 = X0;
  sheet.z0 = Z0;
  sheet.uniform.set(X0, Z0, CELL);
  rings.push(sheet);
  ctx.scene.add(ctx.parts.built('crust', crust));
  // The heat in the narrow seams and far off is drawn by the same sheet: alone it is the sheet with everything but its heat blacked.
  ctx.parts.effect('lava', 'built');

  const glowMaterial = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: GLOW_FRAGMENT, uniforms: shared, depthTest: false, depthWrite: false });
  const glow = new THREE.Mesh(lakeSheet(ctx, CELL), glowMaterial);
  glow.frustumCulled = false;
  ctx.rig.glowScene.add(glow);

  // Everything molten is the lava owner's: its meshes are added after the crust, so the depth test lays the melt in the gaps.
  const molten = createLava(ctx, net, shared);

  const bakeScene = new THREE.Scene();
  const bakeCamera = new THREE.Camera();
  const baker: THREE.Mesh<THREE.BufferGeometry, THREE.Material> = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  baker.frustumCulled = false;
  bakeScene.add(baker);

  let now = 0;
  const frustum = new THREE.Frustum();
  const matrix = new THREE.Matrix4();
  const box = new THREE.Box3();
  const ray = new THREE.Vector3();
  const eye = new THREE.Vector3();

  // Where the lens meets the lake: the lowest point of the lake down the middle of the frame, in the crust's rest frame.
  const aim = (camera: THREE.PerspectiveCamera): [number, number] => {
    eye.setFromMatrixPosition(camera.matrixWorld);
    ray.set(0, -0.85, 0.5).unproject(camera).sub(eye).normalize();
    const along = Math.hypot(ray.x, ray.z) || 1e-6;
    const dx = ray.x / along;
    const dz = ray.z / along;
    let reach = ray.y < -1e-4 ? Math.min(900, (-eye.y / ray.y) * along) : 900;
    reach = Math.max(reach, 0);
    // If that point is on the rock, go on along the view to the lake.
    const dry = (r: number): boolean => ctx.rig.land.shore(eye.x + dx * r, eye.z + dz * r) > -0.3;
    if (dry(reach)) {
      let a = reach;
      let b = reach;
      for (let k = 0; k < 400 && dry(b); k++) {
        a = b;
        b += 0.5;
      }
      for (let k = 0; k < 12; k++) {
        const m = 0.5 * (a + b);
        if (dry(m)) a = m;
        else b = m;
      }
      reach = b;
    }
    const x = eye.x + dx * reach;
    const z = eye.z + dz * reach;
    const v = ctx.rig.flow.velocity(x, z);
    const dt = now - ctx.rig.flow.t0;
    return [x - v[0] * dt, z - v[1] * dt];
  };

  const fill = (ring: Ring, hole: [number, number, number, number] | null, slack: number): void => {
    const { nx, nz, cell, block, stitched } = ring;
    const out = ring.index.array as Uint32Array;
    const quad = ring.corners.array as Float32Array;
    const row = nx + 1;
    let count = 0;
    let filled = 0;
    const vertex = (i: number, j: number): number => {
      if (stitched) {
        if ((j === 0 || j === nz) && (i & 1) === 1) i += 1;
        else if ((i === 0 || i === nx) && (j & 1) === 1) j += 1;
      }
      return j * row + i;
    };
    for (let bj = 0; bj < nz; bj += block) {
      const j1 = Math.min(nz, bj + block);
      for (let bi = 0; bi < nx; bi += block) {
        const i1 = Math.min(nx, bi + block);
        const inHole = hole !== null && bi >= hole[0] && i1 <= hole[2] && bj >= hole[1] && j1 <= hole[3];
        if (inHole) continue;
        const xa = ring.x0 + bi * cell;
        const xb = ring.x0 + i1 * cell;
        const za = ring.z0 + bj * cell;
        const zb = ring.z0 + j1 * cell;
        box.min.set(xa - slack, -0.8, za - slack);
        box.max.set(xb + slack, 3.2, zb + slack);
        if (!frustum.intersectsBox(box)) continue;
        // Crust that lies well under the rock is never seen.
        const half = 0.71 * (i1 - bi) * cell;
        if (ctx.rig.land.shore(0.5 * (xa + xb), 0.5 * (za + zb)) > half + 6 + slack) continue;
        // The square that lays down this block's relief: its vertices and one more all round, for the slopes at its rim.
        const ua = Math.max(0, bi - 1);
        const ub = Math.min(nx + 1, i1 + 2);
        const va = Math.max(0, bj - 1);
        const vb = Math.min(nz + 1, j1 + 2);
        quad.set([ua, 0, va, ub, 0, va, ua, 0, vb, ub, 0, va, ub, 0, vb, ua, 0, vb], filled);
        filled += 18;
        const edge = stitched && (bi === 0 || bj === 0 || i1 === nx || j1 === nz);
        const cutByHole = hole !== null && bi < hole[2] && i1 > hole[0] && bj < hole[3] && j1 > hole[1];
        for (let j = bj; j < j1; j++) {
          for (let i = bi; i < i1; i++) {
            if (cutByHole && hole !== null && i >= hole[0] && i < hole[2] && j >= hole[1] && j < hole[3]) continue;
            let a: number;
            let b: number;
            let c: number;
            let d: number;
            if (edge) {
              a = vertex(i, j);
              b = vertex(i + 1, j);
              c = vertex(i, j + 1);
              d = vertex(i + 1, j + 1);
            } else {
              a = j * row + i;
              b = a + 1;
              c = a + row;
              d = c + 1;
            }
            if (a !== c && a !== b && b !== c) {
              out[count++] = a;
              out[count++] = c;
              out[count++] = b;
            }
            if (b !== c && b !== d && c !== d) {
              out[count++] = b;
              out[count++] = c;
              out[count++] = d;
            }
          }
        }
      }
    }
    ring.index.needsUpdate = true;
    ring.mesh.geometry.setDrawRange(0, count);
    ring.corners.needsUpdate = true;
    ring.squares.setDrawRange(0, filled / 3);
  };

  return {
    setTime: (seconds) => {
      now = seconds;
      foundering.setTime(seconds);
      molten.setTime(seconds);
    },
    beforeSample: (renderer, camera) => {
      camera.updateMatrixWorld();
      const [fx, fz] = aim(camera);
      focus.set(fx, fz, CELL0, N);
      matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(matrix);
      // The cells are placed in the rest frame and carried by the drift: a block may lie that far from where its cells say.
      const slack = 0.3 * Math.abs(now - ctx.rig.flow.t0) + 0.5;
      for (let level = 0; level < RINGS; level++) {
        const ring = rings[level] as Ring;
        const outer = ring.cell * 2;
        ring.x0 = Math.floor(fx / outer) * outer - (N / 2) * ring.cell;
        ring.z0 = Math.floor(fz / outer) * outer - (N / 2) * ring.cell;
        ring.uniform.set(ring.x0, ring.z0, ring.cell);
      }
      for (let level = 0; level <= RINGS; level++) {
        const ring = rings[level] as Ring;
        let hole: [number, number, number, number] | null = null;
        if (level > 0) {
          const inner = rings[level - 1] as Ring;
          const hx = Math.round((inner.x0 - ring.x0) / ring.cell);
          const hz = Math.round((inner.z0 - ring.z0) / ring.cell);
          hole = [hx, hz, hx + N / 2, hz + N / 2];
        }
        fill(ring, hole, slack);
      }
      const before = renderer.getRenderTarget();
      for (const ring of rings) {
        if (ring.squares.drawRange.count === 0) continue;
        baker.geometry = ring.squares;
        baker.material = ring.bake;
        renderer.setRenderTarget(ring.target);
        renderer.render(bakeScene, bakeCamera);
      }
      renderer.setRenderTarget(before);
    },
    solo: (part) => {
      lava.value = part === null || part === 'heart/lava' ? 1 : 0;
      foundering.solo(part);
      molten.solo(part);
    },
    dispose: () => {
      for (const ring of rings) {
        ring.mesh.geometry.dispose();
        ring.material.dispose();
        ring.squares.dispose();
        ring.bake.dispose();
        ring.target.dispose();
      }
      glow.geometry.dispose();
      glowMaterial.dispose();
      net.wide.dispose();
      net.fine.dispose();
      foundering.dispose();
      molten.dispose();
    },
  };
}
