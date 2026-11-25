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
import { skinFragment } from './skin';

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
// Toes: between the sheaves the skin is not blank. It was laid in low rounded toes, 0.3 to 1.1 m across, each thin where it
// was fed and thick at its soft front, each lying on the ones before it like a tile. Two sizes; the highest wins.
// Leaves gToeNext (the height of the one under the winner), gToeSlope (the slope of the winner, metres a metre), gToeId.
float gToeNext;
vec2 gToeSlope;
vec2 gToeId;
float gToeBest;
vec4 gToe;
vec4 gToeAlong;
void toesOf(vec2 wq, float size, float seed, float flowTurn) {
  vec2 base = floor(wq / size - 0.5);
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      vec2 c2 = base + vec2(float(i), float(j));
      vec2 hs = hash22(c2 + seed);
      float hr = hash12(c2 + seed + 3.7);
      float R = size * (0.42 + 0.33 * hr);
      vec2 rel = wq - (c2 + 0.5 + 0.5 * (hs - 0.5)) * size;
      float turn = flowTurn + 2.4 * (fract(hr * 13.7) - 0.5);
      vec2 along = vec2(cos(turn), sin(turn));
      vec2 side = vec2(along.y, -along.x);
      float a = dot(rel, along) / R;
      float s = dot(rel, side) / R * (1.0 + 0.5 * fract(hr * 23.1));
      float t2 = a * a + s * s;
      if (t2 < 1.0) {
        float tall = R * (0.14 + 0.12 * fract(hr * 7.1)) * (0.45 + 0.55 * smoothstep(-1.0, 0.4, a));
        float hgt = tall * (1.0 - t2 * t2);
        if (hgt > gToeBest) {
          gToeNext = gToeBest;
          gToeBest = hgt;
          gToeId = c2 + seed;
          gToe = vec4(a, s, R, hr);
          gToeAlong = vec4(along, 1.0 + 0.5 * fract(hr * 23.1), 0.0);
          gToeSlope = -4.0 * tall * t2 * (a * along + s * (1.0 + 0.5 * fract(hr * 23.1)) * side) / R;
        } else if (hgt > gToeNext) {
          gToeNext = hgt;
        }
      }
    }
  }
}
float toeAt(vec2 q) {
  vec2 wq = q + 0.4 * vec2(vnoise(q / 1.3 + 41.0), vnoise(q / 1.3 + 57.0));
  float flowTurn = 9.4 * vnoise(q / 60.0 + 3.0);
  gToeBest = 0.0;
  gToeNext = 0.0;
  gToeSlope = vec2(0.0);
  gToeId = vec2(0.0);
  toesOf(wq, 1.0, 71.3, flowTurn);
  toesOf(wq + 0.37, 0.52, 13.9, flowTurn + 0.7);
  return gToeBest;
}
// How much of a toe the cells of size c carry.
float toeHeld(float c) {
  return 1.0 - smoothstep(0.07, 0.16, c);
}
// Folds: where a lobe's skin was pushed against something while it was soft it lies in ropes, in sheaves of arcs that bulge
// downstream. Sheaves come in two sizes (3 to 7 m and 0.5 to 2 m across), the small lying across the large; inside one the
// spacing is very uneven (the phase is warped across the sheaf), each fold has its own depth, swells and thins along its
// length and ends. The toes wear ropes of their own round their fronts, 4 to 9 cm apart, and foldAt leaves the toes as toeAt
// does. Returns the profile across one fold, 0 in the crease and 1 on the crest. Leaves: gFoldCover (0 to 1, how
// much of a fold is here), gFoldPhase (creases at whole numbers), gFoldSpace (metres from crest to crest here), gFoldDeep
// (metres from crease to crest here), gFoldDir (unit, across the folds, downstream).
float gFoldCover = 0.0;
float gFoldPhase = 0.0;
float gFoldSpace = 0.3;
float gFoldDeep = 0.1;
vec2 gFoldDir = vec2(1.0, 0.0);
float gSheafBest;
float gSheafNext;
vec4 gSheaf;
vec3 gSheafAlong;
void sheafAt(vec2 wq, float size, float seed, float flowTurn, float small) {
  vec2 base = floor(wq / size - 0.5);
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      vec2 c2 = base + vec2(float(i), float(j));
      vec2 hs = hash22(c2 + seed);
      float hr = hash12(c2 + seed + 8.1);
      // The middle of a sheaf lies in the middle half of its cell and it reaches at most three quarters of a cell:
      // so four cells are enough to look in.
      vec2 rel = wq - (c2 + 0.5 + 0.5 * (hs - 0.5)) * size;
      float R = size * (0.22 + 0.53 * hr);
      float turn = flowTurn + 2.6 * (fract(hr * 17.3) - 0.5);
      vec2 along = vec2(cos(turn), sin(turn));
      float a = dot(rel, along);
      float s = rel.x * along.y - rel.y * along.x;
      float d = length(vec2(a * (1.0 + fract(hr * 41.3)), s)) / R;
      // One cell in five of the large ones is bare, and two in five of the small.
      float p = (1.0 - d) * (0.7 + 0.6 * fract(hr * 29.1)) * (1.0 + 0.6 * small) * step(0.2 + 0.2 * small, fract(hr * 53.7));
      if (p > gSheafBest) {
        gSheafNext = gSheafBest;
        gSheafBest = p;
        gSheaf = vec4(a, s, R, hr);
        gSheafAlong = vec3(along, small);
      } else if (p > gSheafNext) {
        gSheafNext = p;
      }
    }
  }
}
float foldAt(vec2 q) {
  gFoldPhase = 0.0;
  gFoldCover = 0.0;
  vec2 wq = q + 0.6 * vec2(vnoise(q / 1.7 + 5.0), vnoise(q / 1.7 + 31.0)) + 2.2 * vec2(vnoise(q / 6.3 + 15.0), vnoise(q / 6.3 + 47.0));
  float flowTurn = 9.4 * vnoise(q / 60.0 + 3.0);
  gSheafBest = 0.0;
  gSheafNext = 0.0;
  sheafAt(wq, 4.6, 2.37, flowTurn, 0.0);
  sheafAt(wq, 1.35, 61.7, flowTurn + 1.3, 1.0);
  // The ropes a toe wears round its front: rings about its middle, on its downstream half, out to its rim.
  float toeHigh = toeAt(q);
  float toeCover = 0.0;
  float rho = 0.0;
  if (toeHigh > 0.0) {
    rho = length(gToe.xy);
    toeCover = smoothstep(0.25, 0.5, rho) * smoothstep(-0.8, 0.1, gToe.x / max(rho, 0.01)) * step(0.3, fract(gToe.w * 37.7)) * smoothstep(0.0, 0.012, toeHigh - gToeNext) * smoothstep(0.0, 0.008, toeHigh);
  }
  float sheafCover = smoothstep(0.0, 0.25, min(gSheafBest, gSheafBest - gSheafNext)) * (0.55 + 0.45 * smoothstep(0.0, 0.5, gSheafBest));
  if (max(sheafCover, toeCover) <= 0.0) return 1.0;
  if (toeCover > sheafCover) {
    float hrT = gToe.w;
    float spaceT = 0.04 + 0.05 * fract(hrT * 11.3);
    float uT = rho * gToe.z / spaceT + 5.0 * hrT;
    vec2 wpT = vec2(0.6 * uT + 31.0 * hrT, 2.0 * gToe.y + 5.0 * hrT);
    float t0 = vnoise(wpT);
    float t1 = vnoise(wpT + vec2(0.18, 0.0));
    gFoldSpace = spaceT / max(abs(1.0 + 1.5 * (t1 - t0) / 0.3), 0.25);
    gFoldPhase = uT + 1.5 * t0 + 0.25 * vnoise(q / 0.31 + 3.0);
    gFoldDir = normalize(gToe.x * gToeAlong.xy + gToe.y * gToeAlong.z * vec2(gToeAlong.y, -gToeAlong.x) + 1e-5);
    float ownT = smoothstep(0.2, 0.5, vnoise(vec2(0.7 * gFoldPhase + 17.0 * hrT, 2.5 * atan(gToe.y, gToe.x) + 9.0 * hrT)));
    gFoldDeep = clamp(gFoldSpace * (0.25 + 0.5 * vnoise(vec2(0.9 * gFoldPhase, 7.0 * hrT))), 0.01, 0.2);
    gFoldCover = toeCover * ownT * smoothstep(0.0, 0.2, toeCover - sheafCover);
    return abs(sin(3.14159 * gFoldPhase));
  }
  float a = gSheaf.x;
  float s = gSheaf.y;
  float R = gSheaf.z;
  float hr = gSheaf.w;
  vec2 along = gSheafAlong.xy;
  float space = mix(0.12 + 0.14 * fract(hr * 11.3), 0.055 + 0.07 * fract(hr * 11.3), gSheafAlong.z);
  float bulge = (0.25 + 0.7 * fract(hr * 5.7)) / R;
  float u = (a + bulge * s * s) / space + 7.0 * hr;
  // The spacing: the count of folds runs ahead and falls behind across the sheaf, and not the same along it.
  vec2 wp = vec2(0.6 * u + 31.0 * hr, 1.3 * s / (0.5 * R + 0.4) + 5.0 * hr);
  float w0 = vnoise(wp);
  float w1 = vnoise(wp + vec2(0.18, 0.0));
  float rate = max(abs(1.0 + 1.5 * (w1 - w0) / 0.3), 0.25);
  gFoldSpace = space / rate;
  
  gFoldPhase = u + 1.5 * w0 + 0.3 * vnoise(q / 0.57 + 3.0);
  gFoldDir = normalize(along + 2.0 * bulge * s * vec2(along.y, -along.x));
  // Each fold has its own depth, swells and thins along its run, and ends.
  float own = smoothstep(0.2, 0.55, vnoise(vec2(0.7 * gFoldPhase + 17.0 * hr, s / (0.45 + 0.3 * R) + 9.0 * hr)));
  float swollen = vnoise(vec2(0.8 * gFoldPhase + 3.0 * hr, s / (0.8 + 0.3 * R) + 21.0 * hr));
  gFoldDeep = clamp(gFoldSpace * (0.25 + 0.5 * swollen), 0.012, 0.2);
  gFoldCover = sheafCover * own * smoothstep(0.0, 0.2, sheafCover - toeCover);
  return abs(sin(3.14159 * gFoldPhase));
}
// What the skin still reads under its old name.
#define FOLD_DEEP gFoldDeep
// How much of a fold the cells of size c carry. What they do not carry is for the normal.
float foldHeld(float c) {
  return 1.0 - smoothstep(0.16, 0.34, c / gFoldSpace);
}
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
// The size of the finest thing the sheet may carry at a point: the cell there, or the length of a pixel on the lake if that
// is longer. Relief finer than a pixel is long would only glitter.
uniform vec4 uLens;
float fineAt(vec2 q, float c) {
  vec2 d = q - uLens.xy;
  return max(c, uLens.w * (dot(d, d) + uLens.z * uLens.z) / uLens.z);
}
float gFine;
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
    // Swells of 0.3 to 0.6 m over 2 to 5 m: from a low lens a near one hides the foot of the one behind it.
    float swell = mix(0.42, 0.62, smoothstep(20.0, 45.0, groupFar(q)));
    h += off * (swell * (vnoise(q / 3.1 + 1.0) - 0.5) + 0.22 * (vnoise(q / 1.7 + 27.0) - 0.5) * (1.0 - smoothstep(0.35, 0.7, c)) + 0.045 * (vnoise(q / 1.1 + 7.0) - 0.5) * (1.0 - smoothstep(0.25, 0.5, c))) * (1.0 - smoothstep(0.7, 1.5, c)) * calm;
    h += off * lobeAt(q) * (1.0 - smoothstep(0.5, 1.2, c)) * calm * (1.0 - 0.5 * shoreUp);
    if (gFine < 0.16) {
      float smoothSkin = off * calm * (1.0 - shoreUp) * (1.0 - min(1.0, 3.0 * ridgeUp));
      float fold = foldAt(q);
      h += smoothSkin * gFoldCover * gFoldDeep * (pow(fold, 0.7) - 0.65) * foldHeld(gFine);
      h += smoothSkin * gToeBest * toeHeld(gFine);
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
uniform vec4 uLens;
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
  // The height was laid down for this sample in the ring's own picture: height in two parts (see the bake), metres to the brim.
  ivec2 ij = ivec2(position.xz + 0.5);
  ivec2 last = textureSize(tBake, 0) - 1;
  ivec2 sx = ivec2(ij.x < last.x ? 1 : -1, 0);
  ivec2 sz = ivec2(0, ij.y < last.y ? 1 : -1);
  vec4 here = texelFetch(tBake, ij, 0);
  vec4 atX = texelFetch(tBake, ij + sx, 0);
  vec4 atZ = texelFetch(tBake, ij + sz, 0);
  float high = here.r + here.g;
  vec2 rise = vec2((atX.r - here.r + atX.g - here.g) * float(sx.x), (atZ.r - here.r + atZ.g - here.g) * float(sz.y));
  vNormalG = normalize(vec3(-rise.x, uRing.z, -rise.y));
  // Which way is away from the nearest gap.
  vAway = vec2((atX.b - here.b) * float(sx.x), (atZ.b - here.b) * float(sz.y)) / uRing.z;
  vec2 dl = q - uLens.xy;
  vAux = vec3(max(c, uLens.w * (dot(dl, dl) + uLens.z * uLens.z) / uLens.z), c, here.b);
  float dt = uTime - uFlowT0;
  vec2 p = q + flowVelocity(q) * dt;
  p = q + flowVelocity(p) * dt;
  vWorld = vec3(p.x, high, p.y);
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
  gFine = fineAt(q, c);
  float h = heightAt(q, c);
  // A half float holds a height of a metre to half a millimetre, which shows as steps in the slopes. So the height is laid
  // down in two parts: a whole number of 64ths of a metre, which a half float holds exactly, and what is left over.
  float whole = floor(h * 64.0 + 0.5) / 64.0;
  gl_FragColor = vec4(whole, h - whole, clamp(gBank, -8.0, 8.0), 1.0);
}`;

// The crust's fragment shader lives in skin.ts (the skin owner's). Only the relief is handed to it from here.
const FRAGMENT = skinFragment(RELIEF_GLSL);

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
  // The lens in the crust's rest frame, its height over the lake, and the angle of one pixel of the largest format.
  const lens = new THREE.Vector4(0, 0, 10, 3e-4);
  const depthFragment = `precision highp float;\nvarying vec3 vWorld;\n${RIG_GLSL}\nvoid main() { if (landAt(vWorld.xz).b > 1.5 + 0.6 * max(length(cameraPosition - vWorld) - 150.0, 0.0)) discard; gl_FragColor = vec4(0.0); }`;

  const crust = new THREE.Group();
  const ringLattice = lattice(N, N);
  const makeRing = (nx: number, nz: number, cell: number, block: number, stitched: boolean, position: THREE.BufferAttribute): Ring => {
    const uniform = new THREE.Vector3(0, 0, cell);
    const target = new THREE.WebGLRenderTarget(nx + 1, nz + 1, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, generateMipmaps: false });
    const ringUniforms = { uRing: { value: uniform }, uFocus: { value: focus }, uLens: { value: lens } };
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
      const lv = ctx.rig.flow.velocity(eye.x, eye.z);
      const ldt = now - ctx.rig.flow.t0;
      lens.set(eye.x - lv[0] * ldt, eye.z - lv[1] * ldt, Math.max(eye.y, 0.5), 2 / ((camera.projectionMatrix.elements[5] as number) * 2160));
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
