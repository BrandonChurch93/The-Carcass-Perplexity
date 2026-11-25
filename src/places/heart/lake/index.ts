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
// Slabs: rafts a few strides across, each with its own tilt and level, stacked at their edges. Ropes: coils round a point
// beside each slab. Then the lips, the gaps cut down to their floor, rubble, pressure ridges and the heave against the rock.
const RELIEF_GLSL = /* glsl */ `
uniform vec4 uRidge[2];
uniform vec2 uRidgeSize[2];
uniform vec4 uGroupSeam;
#define SLAB 4.3
vec2 gSlabId;
vec2 gSlabId2;
vec2 gSlabP;
float gSlabEdge;
void slabAt(vec2 q) {
  vec2 sp = q / SLAB + 0.3 * vec2(vnoise(q / 2.7 + 3.0), vnoise(q / 2.7 + 11.0)) + 0.05 * vec2(vnoise(q / 0.45 + 5.0), vnoise(q / 0.45 + 17.0));
  vec2 base = floor(sp);
  vec2 pos[9];
  vec2 ids[9];
  float d1 = 1e9;
  vec2 p1 = vec2(0.0);
  vec2 id1 = vec2(0.0);
  for (int j = 0; j < 3; j++) {
    for (int i = 0; i < 3; i++) {
      vec2 c2 = base + vec2(float(i - 1), float(j - 1));
      vec2 p = c2 + 0.15 + 0.7 * hash22(c2);
      float m = hash12(c2 + 7.7);
      // One slab in two is joined to a neighbour, so the slabs differ in size and shape.
      vec2 id = m < 0.28 ? c2 + vec2(1.0, 0.0) : (m < 0.5 ? c2 + vec2(0.0, 1.0) : c2);
      pos[j * 3 + i] = p;
      ids[j * 3 + i] = id;
      vec2 r = p - sp;
      float d = dot(r, r);
      if (d < d1) {
        d1 = d;
        p1 = p;
        id1 = id;
      }
    }
  }
  float e1 = 9.0;
  vec2 id2 = id1 + 1.0;
  for (int k = 0; k < 9; k++) {
    vec2 other = ids[k] - id1;
    if (dot(other, other) > 0.25) {
      vec2 ab = pos[k] - p1;
      float e = dot(0.5 * (p1 + pos[k]) - sp, ab) * inversesqrt(max(dot(ab, ab), 1e-6));
      if (e < e1) {
        e1 = e;
        id2 = ids[k];
      }
    }
  }
  gSlabId = id1;
  gSlabId2 = id2;
  gSlabP = sp;
  gSlabEdge = e1 * SLAB;
}
vec2 slabTilt(vec2 id) {
  return (hash22(id + 3.1) - 0.5) * 0.04;
}
float slabPlane(vec2 id, vec2 sp, float k) {
  return (hash12(id + 9.4) - 0.5) * 0.1 * min(k, 2.0) + dot(slabTilt(id) * k, (sp - id - 0.5) * SLAB);
}
// Lobes: the skin is poured in overlapping tongues 1 to 4 m long, each a low dome with a rounded rim, each lying on the ones
// poured before it. The tongues of one stretch of crust run one way. The highest one wins.
#define LOBE 1.9
vec2 gLobeId;
vec2 gLobeRel;
vec2 gLobeAlong;
float gLobeR;
float gLobeTall;
float gLobeNext;
float lobeAt(vec2 q) {
  vec2 lp = q / LOBE + 0.35 * vec2(vnoise(q / 2.3 + 23.0), vnoise(q / 2.3 + 31.0));
  vec2 base = floor(lp);
  float best = 0.0;
  float next = 0.0;
  float flowTurn = 9.4 * vnoise(q / 23.0 + 3.0);
  float wobble = 0.75 + 0.6 * vnoise(q / 0.7 + 1.3);
  gLobeId = base;
  gLobeRel = vec2(1.0, 0.0);
  gLobeAlong = vec2(1.0, 0.0);
  gLobeR = 1.0;
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
      vec2 loc = vec2(dot(rel, along), (1.25 + 0.5 * fract(hr * 3.3)) * dot(rel, vec2(-along.y, along.x)));
      float t2 = dot(loc, loc) / (R * R) * wobble;
      if (t2 < 1.0) {
        float tall = 0.05 + 0.13 * fract(hr * 7.1);
        float hgt = 0.02 + 0.1 * fract(hr * 29.3) + tall * sqrt(1.0 - t2);
        if (hgt > best) {
          next = best;
          best = hgt;
          gLobeId = c2;
          gLobeRel = rel;
          gLobeAlong = along;
          gLobeR = R;
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
// Ropes follow the curve of their lobe: festoons round a point upstream of it, crowded toward its front, none on its smooth crown.
// They come in bundles and die out along their length. Returns the cover; dir is across the ropes, u runs -1 to 1 across one.
float ropeAt(vec2 q, out vec2 dir, out float u, out float lam) {
  vec2 hh = hash22(gLobeId + 1.7);
  vec2 rel = (gLobeRel + gLobeAlong * gLobeR * (0.7 + 1.3 * hh.y) + vec2(-gLobeAlong.y, gLobeAlong.x) * gLobeR * (hh.x - 0.5)) * LOBE;
  float far = max(length(rel), 1e-3);
  dir = rel / far;
  float hl = hash12(gLobeId + 4.2);
  lam = mix(0.06, 0.24, hl * hl);
  float r = far + 0.6 * vnoise(q / 1.3 + 4.0) + 0.16 * vnoise(q / 0.4 + 9.0);
  u = 2.0 * fract(r / lam) - 1.0;
  float t = length(gLobeRel) / gLobeR;
  float bundle = smoothstep(0.3, 0.62, vnoise(q / 0.55 + gLobeId * 0.37));
  return bundle * smoothstep(0.05, 0.4, t) * (1.0 - smoothstep(0.94, 1.0, t)) * step(0.1, hash12(gLobeId + 6.1)) * step(1e-4, gLobeTall);
}
// The two pressure ridges the pictures name.
float ridgeAt(vec2 q) {
  float h = 0.0;
  for (int i = 0; i < 2; i++) {
    vec2 ab = uRidge[i].zw - uRidge[i].xy;
    vec2 rel = q - uRidge[i].xy;
    float t = clamp(dot(rel, ab) / dot(ab, ab), 0.0, 1.0);
    float side = (rel.x * ab.y - rel.y * ab.x) / length(ab);
    float across = length(rel - ab * t);
    float tall = (0.55 + 0.45 * vnoise(q / (1.9 * uRidgeSize[i].y) + 3.0)) * pow(sin(t * 3.14159), 0.6);
    float reach = (side > 0.0 ? 1.0 + 0.5 * vnoise(q / 1.3) : 2.1 + 0.8 * vnoise(q / 2.3 + 9.0)) * uRidgeSize[i].y;
    float rise = max(0.0, 1.0 - across / reach);
    float slab = vnoise(q / (0.9 * uRidgeSize[i].y) + 17.0);
    rise = mix(rise, floor(rise * 3.0 + slab) / 3.0, 0.25 * smoothstep(0.05, 0.3, rise));
    h += uRidgeSize[i].x * tall * rise;
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
  float farSide = smoothstep(160.0, 320.0, length(q - vec2(-500.0, 250.0)));
  if (farSide <= 0.0) return 0.0;
  // The band is 10 to 30 m wide, and here and there the lake comes through to the rock.
  float wideBand = 10.0 + 20.0 * vnoise(q / 47.0 + 61.0);
  float breach = smoothstep(0.22, 0.34, vnoise(q / 31.0 + 71.0));
  float into = clamp(1.0 - lake / wideBand, 0.0, 1.0) * farSide * breach;
  if (into <= 0.0) return 0.0;
  // Heaps: long ridges that lie along the shore, uneven in height, and upturned slabs on them.
  float heap = 0.35 + 0.65 * vnoise(q / 17.0 + 83.0);
  float crest = 0.5 + 0.5 * sin(lake / (2.5 + 2.5 * vnoise(q / 21.0 + 5.0)) * 3.1 + 5.0 * vnoise(q / 9.0 + 12.0));
  float tall = smoothstep(0.0, 0.35, into) * (0.25 + 0.75 * into) * heap * (0.5 + 0.9 * crest * crest) * 1.9;
  float blocks = vnoise(q / 3.1 + 33.0) * 0.7 + vnoise(q / 1.3 + 9.0) * 0.3 * (1.0 - smoothstep(0.5, 1.2, c));
  tall *= 0.55 + 0.9 * blocks;
  gShore = tall * (1.0 - smoothstep(4.0, 9.0, c));
  return smoothstep(0.0, 0.3, into);
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
    bank = n.r + tornAt(q) * smoothstep(0.0, 0.3, n.a) - gape;
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

  // A plate rides the melt: it rises and sinks a finger's width and tips a little, each in its own time.
  float ride = 0.012 * sin(uTime * (0.5 + 0.5 * fract(n.b * 37.0)) + n.b * 91.0) * calm;
  float h = (n.b - 0.5) * 0.2 * calm * (1.0 - shoreUp) + ride;
  float e = 1.0;
  float pair = 0.0;
  if (c < 1.6) {
    slabAt(q);
    float k = (1.0 + 3.5 * ridgeUp + 4.0 * shoreUp) * calm;
    float held = 1.0 - smoothstep(0.6, 1.6, c);
    float hA = slabPlane(gSlabId, gSlabP, k);
    float hB = slabPlane(gSlabId2, gSlabP, k);
    e = gSlabEdge;
    h += (hA + (hB - hA) * 0.5 * (1.0 - smoothstep(0.0, max(1.3 * c, 0.025), e))) * held;
    pair = hash12(gSlabId + gSlabId2);
    float gw = 0.02 + 0.07 * pair * pair;
    float gwc = max(gw, 0.75 * c);
    h -= (0.03 + 0.1 * pair) * (1.0 - smoothstep(0.0, gwc, e)) * (gw / gwc) * held * step(0.7, pair);
    h += 0.08 * (vnoise(q / 2.6 + 1.0) - 0.5) * held * calm;
  }
  if (ridgeUp > 0.0) h += pow(ridgeUp, 1.5) * (0.5 + 1.2 * vnoise(q / 5.0 + 5.0));

  // The lobes and their ropes.
  if (c < 0.5) {
    float lobes = lobeAt(q);
    lobes = (lobes + 0.03 * (vnoise(q / 0.42 + 19.0) - 0.5) * (1.0 - smoothstep(0.1, 0.2, c))) * (1.0 - smoothstep(0.2, 0.5, c)) * calm;
    h += lobes * (1.0 - 0.5 * shoreUp);
    if (c < 0.1) {
      vec2 dir;
      float u;
      float lam;
      float rope = ropeAt(q, dir, u, lam) * (1.0 - smoothstep(lam / 5.0, lam / 2.5, c)) * calm;
      gRope = 0.3 * lam * sqrt(max(1.0 - u * u, 0.0)) * rope;
      h += gRope;
    }
  }

  // Rubble of broken crust: only where crust has been broken, at the ridges, the shore and a few slab edges.
  float rub = max(shoreUp, 0.8 * ridgeUp);
  rub = max(rub, 0.6 * smoothstep(0.3, 0.0, e) * step(0.85, pair));
  if (rub > 0.0 && c < 0.14) h += rub * calm * (0.16 * smoothstep(0.5, 0.75, vnoise(q / 0.27 + 13.0)) * (1.0 - smoothstep(0.07, 0.14, c)) + 0.07 * smoothstep(0.5, 0.75, vnoise(q / 0.11 + 3.0)) * (1.0 - smoothstep(0.03, 0.055, c)));
  h += gShore;

  // Beside a gap the crust is thin and young and sags toward the melt, its edge curled up a finger or two. The gap is cut down:
  // in the seams the pictures name the melt is the lava's mesh, a hand under the brim, and the floor lies just under it.
  if (live > 0.5) {
    float wide = smoothstep(0.04, 0.25, gape);
    h = mix(h, 0.15 * h - 0.07 * shown, exp(-max(bank, 0.0) / 0.9) * wide);
    h += (0.015 + 0.05 * vnoise(q / 1.3 + 5.0)) * exp(-max(bank, 0.0) / 0.12) * wide * (1.0 - smoothstep(0.3, 0.8, c));
    float deep = mix(0.03 + 0.4 * min(gape, 0.5), 0.15 - meltLevel(n), shown * smoothstep(0.2, 0.3, gape));
    float cut = (1.0 - smoothstep(-max(2.5 * c, 0.05), 0.0, bank)) * min(1.0, 2.0 * gape / max(1.5 * c, 1e-3));
    if (gape > 0.45 && n.g < 3.3) cut *= 1.0 - isleAt(q, n.r / max(gape, 1e-3)) * smoothstep(0.45, 0.6, gape);
    h = mix(h, -deep, cut);
  }
  if (c < 3.0) h += ridgeAt(q) * (1.0 - smoothstep(1.0, 3.0, c));
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
  vec3 low = uSkyHorizon * 0.5 + uWarmColour * w * w * w * 3.0;
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

  slabAt(q);
  float e = gSlabEdge;
  float pair = hash12(gSlabId + gSlabId2);
  float slabAge = hash12(gSlabId + 5.3);
  float broken = shoreAt(q, lake, cell);
  // The crust the group feeds on is the youngest of the lake: dark, glassy, hardly a day old.
  float fresh = 1.0 - smoothstep(12.0, 55.0, groupFar(q) + 14.0 * (vnoise(q / 17.0 + 8.0) - 0.5));
  float age = clamp(0.45 * net.b + 0.85 * slabAge - 0.15 + 0.3 * (vnoise(q / 37.0 + 4.0) - 0.5), 0.0, 1.0) * (1.0 - 0.8 * young) * (1.0 - 0.7 * fresh);

  // The mesh carries the slabs where its cells are small. Where they are not, the slab's tilt goes into the normal.
  vec3 n = normalize(vNormalG);
  vec2 slope = slabTilt(gSlabId) * calm * smoothstep(0.6, 1.6, cell) * (1.0 - smoothstep(1.5, 6.0, fpShort));
  float crease = 1.0;
  float rope = 0.0;
  float seen = 0.0;
  // Lobes and ropes, as far as a pixel can tell one lobe from the next.
  if (fpShort < 1.2) {
    // Where the cells are too coarse to carry a lobe, its dome goes into the normal.
    float lobeHigh = lobeAt(q);
    float lobeFar = length(gLobeRel);
    float t = lobeFar / gLobeR;
    vec2 lobeDir = gLobeRel / max(lobeFar, 1e-3);
    float lobeSeen = calm * smoothstep(0.2, 0.5, cell) * (1.0 - smoothstep(0.3, 0.8, max(abs(dot(qx, lobeDir)), abs(dot(qy, lobeDir))) / (gLobeR * LOBE)));
    slope -= lobeDir * (min(gLobeTall * t / sqrt(max(1.0 - t * t, 0.03)), 1.0) / (gLobeR * LOBE)) * lobeSeen * step(1e-4, gLobeTall);
    // Near black between lobes: where one tongue meets the next.
    crease = mix(1.0, 0.25 + 0.75 * smoothstep(0.0, 0.05, lobeHigh - gLobeNext), calm * step(1e-4, gLobeNext) * (1.0 - smoothstep(0.03, 0.15, fpShort)));
    // Ropes: the mesh lifts them, the normal is theirs here. A rope is kept as long as a pixel is narrower than it across
    // the rope, whatever the pixel's length along it: ropes that run away from the lens stay, ropes that lie across it melt into roughness.
    vec2 dir;
    float u;
    float lam;
    rope = ropeAt(q, dir, u, lam) * calm;
    float across = max(abs(dot(qx, dir)), abs(dot(qy, dir)));
    seen = rope * (1.0 - smoothstep(0.2 * lam, 0.45 * lam, across));
    if (seen > 0.0) {
      float round2 = sqrt(max(1.0 - u * u, 0.0));
      slope -= dir * (0.5 * u / (round2 + 0.35)) * seen;
      crease *= mix(1.0, 0.5 + 0.5 * smoothstep(0.0, 0.5, round2), seen);
    }
  }
  n = normalize(n - vec3(slope.x, 0.0, slope.y) * n.y);

  // Old skin is grey and rough, young skin black, smooth and glassy: by slab and by plate.
  vec3 albedo = mix(vec3(0.05, 0.05, 0.052), vec3(0.12, 0.117, 0.114), age) * (0.9 + 0.2 * vnoise(q / 3.1 + 13.0));
  float rough = clamp(0.22 + 0.45 * age + 0.2 * rope * (1.0 - seen) + 0.3 * broken, 0.15, 0.92);

  // How much sky a point sees: less in a crease, in the crack between two slabs, below the brim of a gap.
  float below = max(-vWorld.y, 0.0);
  float inGap = live * (1.0 - smoothstep(-0.02, 0.06, bank));
  float crack = 1.0 - (0.6 * step(0.7, pair) * (1.0 - smoothstep(0.0, max(0.02 + 0.07 * pair * pair, fpShort), e)) * min(1.0, (0.03 + 0.1 * pair) / max(fpShort, 1e-4))) * (1.0 - smoothstep(1.5, 6.0, fpShort));
  float pit = mix(1.0, clamp(1.0 - below / max(2.5 * gape, 0.12), 0.04, 1.0), inGap);
  float occ = vAux.x * crease * crack * pit;
  vec3 p = vec3(vWorld.x, max(vWorld.y, 0.02), vWorld.z);
  float open = land.g * (1.0 - contactAt(p)) * occ;
  vec3 light = skyIrradiance(n) * open + lakeIrradianceFar(vec3(p.x, p.y + 1.5, p.z), n) * mix(1.0, occ, 0.5) + emitterIrradiance(p, n) * mix(1.0, occ, 0.7);
  // The melt lights the wall of its gap, the lip above it and the crust beside it.
  float wallFace = 1.0 - smoothstep(0.35, 0.9, n.y);
  float steepAway = length(vAway);
  vec2 away = steepAway > 0.3 ? vAway / steepAway : vec2(0.0);
  if (shown > 0.5 && live > 0.5) light += meltLight(q, net, bank, below, n, away) * crease;
  // The narrow seams, whose heat this sheet draws, light their own lips.
  light += gLip * (1.0 - shown * smoothstep(0.12, 0.25, gape)) * (0.1 + 1.2 * wallFace) * crease;
  // A broken face is duller and browner than the skin.
  albedo = mix(albedo, vec3(0.05, 0.043, 0.04) * (0.6 + 0.8 * vnoise(vec2(q.x + q.y, vWorld.y * 3.0) * 9.0)), wallFace * inGap);
  vec3 c = albedo * light / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float gloss = (1.0 - rough) * (1.0 - rough);
  float fresnel = (0.04 + 0.96 * pow(1.0 - nv, 3.5)) * (0.3 + 0.45 * gloss);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  c += fresnel * lakeMirror(r, rough) * uFill / uFill.r * open;

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
    const target = new THREE.WebGLRenderTarget(nx + 1, nz + 1, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, generateMipmaps: false });
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
