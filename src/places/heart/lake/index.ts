// The lake of the Heart: the crust, the lava that shows in its seams, and the crust that founders at the fountains.
// The crust is one sheet. What it shows is read from the net of plates (net.ts), which rides the drift of the lake:
// seams that open, widen, skin over and close, the open pool at the foot of the fall, the torn margin against the rock.
// The same heat is drawn into the rig's glow map, so that what lights the land and the animals is what the camera sees.
import * as THREE from 'three';
import type { HeartContext, HeartPiece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { secondsInPlace, shotById } from '../../../film/cut';
import { LINE, SEAMS, SUNK, UNIT } from '../shared/anchors';
import { LINE_BEND_GLSL, NET, NET_FINE, POOL, RIDGES, bakeNet } from './net';
import { createFoundering } from './founder';
import { HEAT_GLSL } from './heat';
import { createLava } from './lava';
import { skinFragment } from './skin';
import { POUR_GLSL, ROUGH_GLSL, SHEET_GLSL } from './sheet';

export const PARTS: readonly string[] = ['crust', 'lava', 'foundering'];

/** The pads that press the crust now: x, z, the radius of the pad in metres, and its load from 0 (lifted) to 1 (the full weight on it).
 *  The walkers fill it in their setTime, each sample; the crust sags, cracks and darkens under each. Sixteen at most, all nought by default. */
export const PAD_DENTS: THREE.Vector4[] = Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, 0, 0));

// The height of the crust in metres, one function for every cell of the sheet. `c` is the size of the cells that carry it there:
// every part of the relief fades out before the cells get too coarse to hold it, so nothing swims and nothing pops.
// A billow, broad lobes poured on each other, festoons of cords where the skin was gathered, then the lips, the gaps cut down
// to their floor, pressure ridges and the heaps against the rock.
const RELIEF_GLSL = /* glsl */ `
uniform vec4 uLens;
uniform vec4 uHill;
uniform vec4 uRidge[2];
uniform vec2 uRidgeSize[2];
uniform vec4 uGroupSeam;
// The photographed crust (rope-nh: r, g the slope of its height, b the height), laid without a repeat. The lake is cut into
// three-cornered patches a third of the sheet across; each corner reads the sheet turned and shifted its own way, and where
// they meet the higher lies on the lower, as one toe of lava on the next. It is laid at three sizes, metres to the long side
// of the sheet, and stands so many metres from its deepest furrow to its highest crest. The height carries the two larger
// as far as its cells hold them; the skin paints all three at the same places.
#define SHEET_D 0.9
#define SHEET_M 6.4
#define SHEET_L 25.6
#define SHEET_TALL_D 0.01
#define SHEET_TALL_M 0.06
#define SHEET_TALL_L 0.24
${SHEET_GLSL}
${POUR_GLSL}
${ROUGH_GLSL}
// What of the height is the sheet's, metres: the lattice leaves it out of its own normal, for the skin has the sheet's slope whole.
float gSheetHigh = 0.0;
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
// The mound of the one that sank (x, z, the flat radius).
uniform vec3 uMound;
// How broken the crust is at the point brokenAt was last asked about (0 until it is asked).
float gBroke = 0.0;
// How much the plates at a point are flat and level (0 to 1): the floor the group feeds on is plates nearly level, with thin
// gaps and a few tilted rims; its relief is in the rims and the gaps.
float gFlat = 0.0;
// The coils at the line: within 11 to 15 m of the lens of key heart-1 the crust is thick lobes that lap, 1.9 to 2.8 m across,
// each a sheet 4 to 8 cm thick that is thin where it was fed and ends at its front in a step with a crease at its foot. Each
// wears one sheaf of cords, 11 to 14 cm apart, arcs about a point behind the lobe (0.5 to 4 m radius) that bunch up toward
// the front. Leaves gLapHigh (metres the lobes stand here) and what foldAt leaves. Returns how much of a cord is here.
float gLapHigh = 0.0;
// The cell the lobes are laid for: a step is four cells wide at the least.
float gLapCell = 0.0234;
float gLapDeep;
// Ropes (round the one that sank): 1 where the folds here are ropes the height carries whole, and their true spacing in
// metres. There gFoldSpace is 0.06 and gFoldDeep 0, so that the paint lays no cords or threads of its own on a rope and
// adds no slope: four painted cords to a rope of 0.65 m are stripes of 16 cm again.
float gLapRope = 0.0;
float gLapSpace = 0.125;
float lapAt(vec2 q, float big) {
  // Round the one that sank (big 1) the lobes are larger, their sheets 10 to 14 cm thick, and they wear ropes, not cords:
  // 4 to 7 a lobe, 0.55 to 0.8 m apart and 6 to 26 cm high. The lens there is under a metre up and looks along the floor:
  // at 15 m a cord of 20 cm is ten pixels and a field of them is stripes.
  float size = mix(1.9, 3.3, big);
  vec2 wq = q + 0.5 * vec2(vnoise(q / 1.9 + 15.0), vnoise(q / 1.9 + 47.0));
  float flowTurn = 9.4 * vnoise(q / 60.0 + 3.0);
  vec2 base = floor(wq / size - 0.5);
  float edge = max(0.1, 4.0 * gLapCell);
  float rough = 1.0 + 0.24 * (vnoise(q / 0.55 + 7.0) - 0.5);
  float high = 0.0;
  float top = -1.0;
  float cover = 0.0;
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      vec2 c2 = base + vec2(float(i), float(j));
      vec2 hs = hash22(c2 + 87.3);
      float hr = hash12(c2 + 93.1);
      float R = size * (0.5 + 0.25 * hr);
      vec2 rel = wq - (c2 + 0.5 + 0.5 * (hs - 0.5)) * size;
      float turn = flowTurn + 1.6 * (fract(hr * 17.3) - 0.5);
      vec2 along = vec2(cos(turn), sin(turn));
      float a = dot(rel, along);
      float s = rel.x * along.y - rel.y * along.x;
      float even = length(vec2(a, s * (1.0 + 0.4 * fract(hr * 23.1)))) / R;
      float t = even * rough;
      if (t < 1.3) {
        float front = smoothstep(-0.9, 0.5, a / R);
        float thick = mix(0.05 + 0.035 * fract(hr * 7.1), 0.1 + 0.04 * fract(hr * 7.1), big) * (0.15 + 0.85 * front);
        float on = 1.0 - smoothstep(1.0 - edge / R, 1.0, t);
        float foot = ((t - 1.0) * R - 0.3 * edge) / (0.55 * edge);
        high += thick * on - (0.035 + 0.02 * fract(hr * 3.3)) * (1.0 + 0.6 * big) * front * exp(-foot * foot);
        if (t < 1.0 && hr > top) {
          top = hr;
          // The point the arcs bend about lies behind the lobe, half its radius outside it at the least: no closed ring.
          float ac = a + (1.5 + 0.5 * fract(hr * 5.7)) * R;
          float rho = length(vec2(ac, s));
          // The lobes nearest the lens of the key (their middles within 3.5 to 5 m of it) wear cords of 3.6 to 4.6 cm: finer
          // than the cells carry, so the height leaves their tops smooth (foldHeld) and the paint draws them.
          float nearLens = 1.0 - smoothstep(3.5, 5.0, length((c2 + 0.5 + 0.5 * (hs - 0.5)) * size - vec2(-510.5, 215.5)));
          float space = mix(mix(0.11 + 0.03 * fract(hr * 11.3), 0.036 + 0.01 * fract(hr * 11.3), nearLens), 0.55 + 0.25 * fract(hr * 11.3), big);
          float u = (rho + 0.12 * R * even * even * even) / space + 7.0 * hr + mix(0.5 * vnoise(vec2(1.5 * rho + 31.0 * hr, 1.5 * s / R + 5.0 * hr)), 0.8 * vnoise(vec2(0.5 * rho + 31.0 * hr, 0.8 * s / R + 5.0 * hr)), big);
          gFoldPhase = u;
          gFoldSpace = space / (1.0 + 0.3 * t * t);
          gFoldDir = (ac * along + s * vec2(along.y, -along.x)) / max(rho, 1e-3);
          // Round the one that sank the ropes are uneven: very unequal in depth, some all but gone, and unequally spaced.
          float own = vnoise(vec2(0.9 * u + 3.0 * hr, 2.0 * s / R + 21.0 * hr));
          gLapDeep = mix((space / 0.125) * (0.045 + 0.04 * smoothstep(0.3, 0.95, t)) * (0.7 + 0.6 * own), (0.12 + 0.08 * smoothstep(0.3, 0.95, t)) * (0.5 + 0.8 * smoothstep(0.25, 0.75, own)), big);
          cover = on;
        }
      }
    }
  }
  gLapHigh = high;
  return cover;
}
float foldAt(vec2 q) {
  gFoldPhase = 0.0;
  gFoldCover = 0.0;
  gLapHigh = 0.0;
  gLapRope = 0.0;
  // Where a pixel is longer on the lake than a fold is wide the single fold is gone: the sheaves must not show as marks.
  vec2 lensOff = q - uLens.xy;
  float pixelLong = uLens.w * (dot(lensOff, lensOff) + uLens.z * uLens.z) / uLens.z;
  if (pixelLong > 0.19) {
    gToeBest = 0.0;
    gToeNext = 0.0;
    gToeSlope = vec2(0.0);
    gToeId = vec2(0.0);
    return 1.0;
  }
  // The ropes a toe wears round its front: rings about its middle, on its downstream half, out to its rim.
  toeAt(q);
  // Two places wear the lobes: the banks of the line, and the floor round the one that sank from 5 to 7 m out of its middle
  // to 24 to 28 m (its own apron, feet and seam lie inside that and stay as they are).
  float lapLine = 1.0 - smoothstep(11.0, 15.0, length(q - vec2(-505.0, 213.0)));
  float sunkFar = length(q - uMound.xy);
  float lapSunk = smoothstep(5.0, 7.0, sunkFar) * (1.0 - smoothstep(24.0, 28.0, sunkFar));
  float lapZone = max(lapLine, lapSunk) * (1.0 - gFlat);
  if (lapZone > 0.0) {
    lapAt(q, step(lapLine, lapSunk));
    gLapHigh *= lapZone;
    gToeBest *= 1.0 - lapZone;
    gToeNext *= 1.0 - lapZone;
    gToeSlope *= 1.0 - lapZone;
  }
  return 1.0;
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
    if (uRidgeSize[i].x < 0.01) continue;
    vec2 ab = uRidge[i].zw - uRidge[i].xy;
    float len = length(ab);
    vec2 rel = q - uRidge[i].xy;
    float tm = dot(rel, ab) / len;
    float size = uRidgeSize[i].y;
    // The line of the ridge is crooked.
    float side = (rel.x * ab.y - rel.y * ab.x) / len + 1.3 * size * (vnoise(vec2(tm / 7.0, 3.0 + 9.0 * float(i))) - 0.5);
    if (tm < -1.0 || tm > len + 1.0 || abs(side) > 3.2 * size) continue;
    // A line of slabs, each 1.5 to 4.5 m long, pushed up on edge: a long back that leans on the crust behind it and a short
    // broken face toward the lens, each its own height, its crest a little off the line, one in five fallen flat.
    // The slabs are of unlike length, 3 to 9 m: shorter, the mesh of the far lake draws each as a tent.
    float u = tm / (2.5 * size) + 1.7 * vnoise(vec2(tm / (3.4 * size) + 7.0, 2.0));
    float k = floor(u);
    float fu = u - k;
    vec2 hk = hash22(vec2(k, 17.0 + float(i)));
    float ends = smoothstep(0.0, 0.12 * len, tm) * (1.0 - smoothstep(0.88 * len, len, tm));
    float tall = uRidgeSize[i].x * (0.2 + 0.8 * hk.x * hk.x) * ends * mix(0.15, 1.0, step(0.33, hk.y));
    float back = (1.6 + 1.2 * hk.y) * size;
    float face = max(0.35 * size, 3.0 * c);
    float s = side - (hk.y - 0.5) * 0.8 * size;
    float profile = clamp(s > 0.0 ? 1.0 - s / face : 1.0 + s / back, 0.0, 1.0);
    float whole = smoothstep(0.0, 0.12, fu) * (1.0 - smoothstep(0.88, 1.0, fu));
    float slab = tall * profile * (0.35 + 0.65 * whole) * (0.75 + 0.5 * (fu - 0.5) * (hk.x > 0.5 ? 1.0 : -1.0));
    // Rubble at its foot, on both sides.
    float rise = max(0.0, 1.0 - abs(side) / (2.6 * size));
    float rubble = 0.3 * size * rise * ends * (0.5 * vnoise(q / (0.45 * size) + 17.0) + 0.5 * mix(vnoise(q / (0.17 * size) + 5.0), 0.5, smoothstep(0.03, 0.07, c / size)));
    h += slab + rubble * (1.0 - 0.7 * profile);
    gRidgeOn = max(gRidgeOn, smoothstep(0.0, 0.15, rise) * ends);
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
float heapAt(vec2 q, float lake, float c) {
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
// How much the crust at a point is the youngest of the lake, the floor the group feeds on (0 to 1): it does not reach the
// line at the shore. Where it is, the skin is the rough broken basalt of sheet.ts and no rope.
float freshAt(vec2 q) {
  return (1.0 - smoothstep(12.0, 55.0, groupFar(q) + 14.0 * (vnoise(q / 17.0 + 8.0) - 0.5))) * smoothstep(20.0, 42.0, length(q - vec2(${LINE[0].toFixed(1)}, ${LINE[1].toFixed(1)})));
}
float roughOn(float fresh) {
  return smoothstep(0.05, 0.45, fresh);
}
// Metres from the middle of the channel at the line (the same crooked line the net lays down), and which way is away from it.
uniform vec4 uLineSeam;
${LINE_BEND_GLSL}
vec2 gLineAway;
// How far along the channel at the line the point lies, 0 where it leaves the shore to 1 past the lens of key heart-1.
float gLineT = 0.0;
float gLineFar = 100.0;
float lineFar(vec2 q) {
  vec2 ab = uLineSeam.zw - uLineSeam.xy;
  float l = length(ab);
  float t = clamp(dot(q - uLineSeam.xy, ab) / (l * l), 0.0, 1.0);
  float k = 0.9 * (sin(t * 9.0 + 2.1) + 0.6 * sin(t * 23.0 + 6.3)) * sin(3.14159 * t) + lineBend(t);
  vec2 d = q - uLineSeam.xy - ab * t - vec2(-ab.y, ab.x) / l * k;
  float far = length(d);
  gLineAway = d / max(far, 1e-3);
  gLineT = t;
  gLineFar = far;
  return far;
}
// The mound of the one that sank: the crust lies flat under it and is itself again a few metres out (uMound: x, z, the flat radius).
float calmAt(vec2 q) {
  return smoothstep(uMound.z - 0.4, uMound.z + 4.0, length(q - uMound.xy));
}
// The pads that press the crust now (PAD_DENTS: x, z in the world, radius, load). Under a loaded pad the young crust sags
// into a dish 7 cm deep and is pushed up into a low lip round it. Returns the metres to add, how much of the point is dish
// and how much of it is the cracked line round the dish. p is a point of the world; edge bends the line.
uniform vec4 uPadDents[16];
vec3 dentAt(vec2 p, float edge) {
  vec3 got = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    vec4 d = uPadDents[i];
    float t = length(p - d.xy) / max(d.z, 0.01);
    float dish = (1.0 - smoothstep(0.5, 1.2, t)) * d.w;
    float lip = exp(-(t - 1.4) * (t - 1.4) / 0.06) * d.w;
    got.x += 0.022 * lip - 0.07 * dish;
    got.y = max(got.y, dish);
    got.z = max(got.z, (1.0 - smoothstep(0.0, 0.07, abs(t - 1.08 - 0.3 * edge))) * d.w);
  }
  return got;
}
// Where pads stand (x, z, radius): there the crust is broken only a little, so that a pad has ground under it.
uniform vec3 uPads[5];
// How broken the crust is out on the lake, 0 to 1: in patches within 40 m of the seam the group feeds at, in bands along
// the banks of the line, and in a ring round the one that sank. Leaves in gLean which way the slabs there lean (xy, a unit
// vector up the slope) and how surely (z).
vec3 gLean;
// How much a point is ground a pad stands on (0 to 1): there slabs lie nearly level and their gaps are narrow.
float gPadCalm;
// How much a point must lie low (0 to 1): plates there are level, with no rim and no mound.
float gLow;
// On the banks of the line the crust lies in thin plates that overlap: more of them ride on their neighbours (a plate rides
// when its number is over gRaftFrom) and the gaps between them are shallow (gOverlap, 0 to 1).
float gRaftFrom;
float gOverlap;
// The size of the plates at the point, metres (1.9 on the broken floors, 3 on the banks of the line), and how far the gaps
// between the plates are shut (0 to 1): on the feeding floor away from the seam the floor is one sheet.
float gSlabSize;
float gShut;
float brokenAt(vec2 q) {
  gFlat = 0.0;
  gRaftFrom = 0.67;
  gOverlap = 0.0;
  gSlabSize = 1.9;
  gShut = 0.0;
  gLean = vec3(0.0);
  gPadCalm = 0.0;
  gLow = 0.0;
  float b = 0.0;
  float g = groupFar(q);
  if (g < 54.0) {
    // The whole floor the group feeds on is broken, more in some places than in others.
    float patchy = vnoise(q / 8.3 + 5.0) * 0.7 + vnoise(q / 3.1 + 9.0) * 0.3;
    b = (1.0 - smoothstep(36.0, 54.0, g)) * mix(0.5, 1.0, smoothstep(0.38, 0.62, patchy));
    gFlat = 1.0 - smoothstep(36.0, 54.0, g);
    gShut = gFlat * smoothstep(3.5, 6.0, g);
  }
  // The banks of the line, 8 m to either side: a few large plates, 2 to 4 m across, flat on top and nearly level, one in
  // four riding up on its neighbour, parted by narrow deep cracks. The plates there are of their own size, so the broken
  // ground of the floor ends a metre short of them and theirs ends at 8 m: no plate is cut by the border.
  float l = lineFar(q);
  if (l < 9.0) {
    b *= smoothstep(8.0, 9.0, l);
    if (l < 8.0) {
      gOverlap = 1.0;
      b = 0.45 * (1.0 - smoothstep(6.5, 8.0, l));
      gFlat = 0.0;
      gShut = 0.0;
      gSlabSize = 3.0;
      gRaftFrom = 0.75;
      // The plates on the bank lean in a little: they go down toward the melt.
      gLean = vec3(gLineAway, 0.5 * (1.0 - smoothstep(1.5, 3.0, l)));
    }
  }
  // Round the one that sank the crust is whole: ropy folds run from it to the lens, no broken slabs.
  for (int i = 0; i < 4; i++) gPadCalm = max(gPadCalm, 1.0 - smoothstep(uPads[i].z, uPads[i].z + 3.0, length(q - uPads[i].xy)));
  b *= 1.0 - 0.35 * gPadCalm;
  // On the lens side of the hero's pool the crust lies low, or it hides the pool.
  gLow = 1.0 - smoothstep(uPads[4].z, uPads[4].z + 3.0, length(q - uPads[4].xy));
  b *= 1.0 - 0.5 * gLow;
  gBroke = b;
  return b;
}
// How broken the crust is: the heaps against the far walls and round the island, and the broken places out on the lake.
float shoreAt(vec2 q, float lake, float c) {
  float heap = heapAt(q, lake, c);
  return max(heap, brokenAt(q));
}
// Broken crust: slabs of 0.5 to 3 m, each a plane with its own tilt (to 25 degrees where the crust is most broken) and its own
// level, one in three rafted on its neighbours, with a raised rim, and gaps of 4 to 25 cm between them with rubble in them.
// Call brokenAt first (it leaves gLean). Returns the height to add. Leaves in gSlabEdge how much of the point is gap (0 on
// a slab, 1 in the rubble), in gSlabId a number for the slab, in gSlabSlope the slope of its plane and in gSlabRim metres to its edge.
float gSlabEdge;
float gSlabId;
vec2 gSlabSlope;
float gSlabRim;
// How much of a slab of size L the cells of size c carry: it needs five cells across at the least.
float slabHeld(float c, float L) {
  return 1.0 - smoothstep(0.1 * L, 0.22 * L, c);
}
// The plane of slab k at a point that lies s (in lattice units) from the slab's middle: x is its height there, yz its slope.
// How much the slabs at the point move in time, 0 to 1: at the active margins (the lip of the line, the brim of the string
// outside the pads) a slab rocks and rides up and down slowly, each in its own time; cooled ground stays fixed.
float gRock;
vec3 slabPlane(vec2 k, vec2 s, float broken, float L, float drop) {
  vec2 r1 = hash22(k);
  vec2 r2 = hash22(k + 31.7);
  float raft = step(gRaftFrom, fract(r1.x * 7.0 + r1.y * 3.0));
  float a = 6.2832 * r2.x;
  vec2 dir = normalize(mix(vec2(cos(a), sin(a)), gLean.xy, gLean.z));
  // Most plates lie within a few degrees of level; one in four is tilted by 10 to 25 degrees. A large slab cannot stand as
  // steep as a small one: its high edge is never more than half a metre up.
  float tilt = min(min(min((0.04 + 0.42 * r2.y * r2.y * r2.y * r2.y) * broken, mix(1.0, 0.07, gOverlap)), 0.55 / L), mix(mix(0.47, 0.13, gPadCalm), 0.025, gLow));
  // On the banks of the line the plates lap like shingles: each lies 0 to 15 cm over or under its neighbour.
  float level = mix(0.26 * (r1.x - 0.4) + 0.16 * raft, 0.55 * (r1.x - 0.5) + 0.16 * raft, gOverlap) * broken * min(1.0, L / 1.5) - drop * step(0.67, fract(r2.x * 5.0 + r1.y * 3.0));
  // On the feeding floor five plates in six lie level and the sixth keeps its tilt.
  float lies = gFlat * step(0.17, fract(r1.y * 13.0 + r2.x * 7.0));
  tilt *= (1.0 - 0.85 * lies) * (1.0 - 0.4 * gFlat);
  level *= 1.0 - 0.8 * gFlat;
  if (gRock > 0.0) {
    // Two slabs in three move: up to 6 degrees of tilt and 4 cm of rise, over 8 to 18 seconds.
    float moves = gRock * step(0.33, fract(r1.x * 11.0 + r2.y * 5.0));
    tilt += moves * mix(0.1, 0.035, gOverlap) * sin(uTime * (0.35 + 0.45 * r1.y) + 6.2832 * r2.x);
    level += moves * 0.04 * sin(uTime * (0.3 + 0.4 * r2.y) + 6.2832 * r1.x);
  }
  return vec3(level * (1.0 - 0.6 * gPadCalm) * (1.0 - 0.85 * gLow) + dot(dir * tilt, s) * L, dir * tilt);
}
// size is the lattice the slabs are cut on, metres; drop is how far one slab in three has gone down, metres.
float slabAt(vec2 q, float broken, float c, float size, float drop) {
  gSlabEdge = 0.0;
  gSlabId = 0.0;
  gSlabSlope = vec2(0.0);
  gSlabRim = 9.0;
  if (broken <= 0.01) return 0.0;
  float L = size;
  vec2 p = (q + 0.58 * L * vec2(vnoise(q / (2.7 * L) + 17.0), vnoise(q / (2.7 * L) + 53.0))) / L;
  // On the banks of the line the border between two plates is a crooked line.
  if (gOverlap > 0.0) p += 0.12 * gOverlap * vec2(vnoise(q / (0.6 * L) + 5.0), vnoise(q / (0.6 * L) + 29.0));
  vec2 cell = floor(p);
  vec2 f = p - cell;
  float d1 = 9.0;
  float d2 = 9.0;
  float d3 = 9.0;
  vec2 s1 = vec2(0.0);
  vec2 k1 = vec2(0.0);
  vec2 s2 = vec2(0.0);
  vec2 k2 = vec2(0.0);
  vec2 s3 = vec2(0.0);
  vec2 k3 = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 r = hash22(cell + g);
      vec2 s = g + 0.06 + 0.88 * r - f;
      // A slab that rides on its neighbours reaches out over them.
      float d = length(s) - 0.22 * step(gRaftFrom, fract(r.x * 7.0 + r.y * 3.0));
      if (d < d1) {
        d3 = d2;
        s3 = s2;
        k3 = k2;
        d2 = d1;
        s2 = s1;
        k2 = k1;
        d1 = d;
        s1 = s;
        k1 = cell + g;
      } else if (d < d2) {
        d3 = d2;
        s3 = s2;
        k3 = k2;
        d2 = d;
        s2 = s;
        k2 = cell + g;
      } else if (d < d3) {
        d3 = d;
        s3 = s;
        k3 = cell + g;
      }
    }
  }
  float e = 0.5 * (d2 - d1) * L;
  vec2 r1 = hash22(k1);
  vec2 r2 = hash22(k1 + 31.7);
  float raft = step(gRaftFrom, fract(r1.x * 7.0 + r1.y * 3.0));
  vec3 own = slabPlane(k1, -s1, broken, L, drop);
  gSlabSlope = own.yz;
  gSlabId = r1.y;
  gSlabRim = e;
  // Its edge is turned up, here more and there not at all: 5 to 25 cm, wide enough for the cells to carry.
  float rimWide = max(0.1, 3.0 * c);
  float rimHigh = 0.03 * broken + (0.05 + 0.2 * r2.y) * broken * smoothstep(0.3, 0.62, vnoise(q / 1.1 + 40.0 * r1.x)) * (1.0 - 0.6 * gPadCalm) * (1.0 - 0.9 * gLow) * (1.0 - 0.9 * gOverlap) * (1.0 - gShut) * (1.0 - 0.6 * gFlat);
  // Rubble the sheet can carry: a lump needs four cells across, or it stands as a spike.
  float rubble = 0.13 * smoothstep(0.4, 0.7, vnoise(q / 0.21 + 3.0)) * (1.0 - smoothstep(0.025, 0.04, c)) + 0.1 * smoothstep(0.35, 0.7, vnoise(q / 0.45 + 9.0)) * (1.0 - smoothstep(0.05, 0.09, c));
  // The floor of the gap lies under the slabs it parts, so it is one floor from either side, and where three slabs meet it
  // lies under all three: a floor that jumped from slab to slab would stand as a row of teeth and spikes.
  float beside = slabPlane(k2, -s2, broken, L, drop).x;
  if (d3 - d2 < 0.15) beside = mix(min(beside, slabPlane(k3, -s3, broken, L, drop).x), beside, smoothstep(0.0, 0.15, d3 - d2));
  float bed = min(min(own.x, beside), 0.0) - mix(0.06 + 0.12 * broken, 0.065 * broken, gOverlap) * (1.0 - gShut) * (1.0 - 0.4 * gFlat) + rubble * smoothstep(0.3, 0.7, broken) * (1.0 - gShut) * (1.0 - gOverlap);
  // The gap is as wide as the crust is broken; a rafted slab ends in a step down onto its neighbour, with no gap on its side.
  float gapHalf = mix(0.02 + 0.1 * r2.x * smoothstep(0.3, 0.8, broken), 0.012, gOverlap) * (1.0 - 0.8 * raft) * (1.0 - 0.5 * gPadCalm) * (1.0 - gShut);
  // The broken edge of a slab is a face the cells can carry: four cells wide at the least and never steeper than about
  // 70 degrees, or each triangle of it shades its own way and the edge stands as a row of teeth.
  // Off the feeding floor a plate ends in a step onto its neighbour, seen close and askew: there the face is wider still.
  float edgeWide = max(max(mix(0.05, 0.1, gOverlap), mix(3.5, 2.5, gFlat) * c), mix(mix(0.62, 0.5, gFlat), 1.3, gOverlap) * (own.x + rimHigh - bed));
  float inner = gapHalf + edgeWide;
  float plane = own.x + rimHigh * exp(-max(e - inner, 0.0) / rimWide);
  // Each plate of the banks is a low pillow, 3 to 6 cm higher in its middle: the low light gives it a lit and a shaded side.
  plane += gOverlap * (broken / 0.45) * (0.03 + 0.03 * r2.x) * smoothstep(0.0, 0.3 * L, e);
  gSlabEdge = (1.0 - smoothstep(gapHalf, gapHalf + max(0.04, 2.5 * c), e)) * (1.0 - gShut) * (1.0 - 0.7 * gOverlap);
  return mix(plane, bed, 1.0 - smoothstep(gapHalf, inner, e)) * slabHeld(c, L);
}
// The size of the finest thing the sheet may carry at a point: the cell there, or the length of a pixel on the lake if that
// is longer. Relief finer than a pixel is long would only glitter.
float fineAt(vec2 q, float c) {
  vec2 d = q - uLens.xy;
  return max(c, uLens.w * (dot(d, d) + uLens.z * uLens.z) / uLens.z);
}
float gFine;
// The top of the bank at the line, metres: not even. In stretches of 2 to 4 m the trench is a shallow runnel, the brim 8 to
// 15 cm over the melt (which lies at -0.3 there), in others a deeper cut, 20 to 30 cm. More of it is shallow upstream, where
// the channel leaves the shore. Call lineFar before it.
float lineBrim(vec2 q) {
  float runnel = smoothstep(0.4, 0.62, vnoise(q / 3.1 + 57.0) + 0.3 * (0.65 - gLineT));
  float rough = vnoise(q / 1.3 + 91.0);
  return -0.3 + mix(0.2 + 0.1 * rough, 0.08 + 0.07 * rough, runnel);
}
// How much of a mound of ash and rubble is at the point, 0 to 1 (after heightAt).
float gMound;
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
    // Its fine part (a decimetre in and out every 0.2 m) is a fluted wall, and seen along its length the flutes stand as a
    // comb of spikes: the wall takes a third of it on the finest cells and next to none on the cells after them.
    float torn = tornLow * (1.0 - smoothstep(0.15, 0.4, c)) + (tornAt(q) - tornLow) * 0.35 * (1.0 - smoothstep(0.02, 0.06, c));
    bank = n.r + torn * smoothstep(0.0, 0.3, n.a) - gape;
  }
  gBank = bank;
  gRope = 0.0;
  float lake = -landAt(q).b;
  float calm = calmAt(q);
  float shoreUp = heapAt(q, lake, c);
  float broke = brokenAt(q);
  // Some of the shut edges between plates are pressure ridges: slabs upturned and heaped.
  float ridgeUp = 0.0;
  if (live < 0.5 && n.g > 0.45 && c < 3.0) {
    ridgeUp = smoothstep(0.45, 0.6, n.g) * (1.0 - shown) * (0.4 + 1.2 * (n.g - 0.5)) * max(0.0, 1.0 - n.r / (1.0 + 1.5 * vnoise(q / 6.0 + 2.0)));
    ridgeUp *= smoothstep(25.0, 45.0, groupFar(q)) * calm * (1.0 - smoothstep(1.0, 3.0, c)) * smoothstep(14.0, 30.0, lake) * smoothstep(0.3, 0.6, vnoise(q / 13.0 + 40.0));
  }
  gRidge = ridgeUp;

  // A plate rides the melt: it rises and sinks a finger's width, each in its own time.
  float h = 0.015 * sin(uTime * 0.7 + n.b * 9.0) * calm;
  // The folds and the toes, kept apart from the swell: beside a gap the swell is levelled and they are not.
  float fine = 0.0;
  if (ridgeUp > 0.0) h += pow(ridgeUp, 1.5) * (0.5 + 1.2 * vnoise(q / 5.0 + 5.0));

  // Far out, where a pixel is longer than a billow, the crust still lies in long low swells: the sheet carries them everywhere.
  float seamFar = groupFar(q);
  h += 0.3 * (vnoise(vec2(dot(q, vec2(0.8, 0.6)) / 11.0, dot(q, vec2(-0.6, 0.8)) / 29.0) + 3.0) - 0.5) * calm * smoothstep(-1.0, 3.0, lake) * smoothstep(1.5, 8.0, seamFar);
  // The billow of the skin and the lobes on it. The cords are finer than the cells and go into the normal.
  if (c < 1.5) {
    // Nothing of the skin's relief stands above the rock where the lake runs out under the shore.
    // The relief runs to the shore and a little under the land's skirt, so that the line where crust meets rock is crooked.
    float off = smoothstep(-1.0, 0.5, lake);
    // Swells of 0.3 to 0.6 m over 2 to 5 m: from a low lens a near one hides the foot of the one behind it.
    // Along the seam the group feeds at the swell lies down: the pools of the string must be seen from a lens 5 degrees up.
    float gFar = seamFar;
    // On the floor the group feeds on the plates are nearly level: the swell is a fifth of what it is out on the lake.
    float floorLevel = mix(0.2, 1.0, smoothstep(36.0, 54.0, gFar));
    float swell = floorLevel * mix(0.42, 0.62, smoothstep(20.0, 45.0, gFar)) * mix(0.12, 1.0, smoothstep(1.5, 8.0, gFar));
    h += off * (swell * (vnoise(q / 3.1 + 1.0) - 0.5) + 0.22 * floorLevel * smoothstep(1.5, 8.0, gFar) * (vnoise(q / 1.7 + 27.0) - 0.5) * (1.0 - smoothstep(0.35, 0.7, c)) + 0.045 * (vnoise(q / 1.1 + 7.0) - 0.5) * (1.0 - smoothstep(0.25, 0.5, c))) * (1.0 - smoothstep(0.7, 1.5, c)) * calm;
    // The poured slabs, their steps and gaps, and the ropes and swells of the sheet as far as the cells hold them: a mip
    // whose texel is a cell and a half.
    float sheetOn = off * calm * (1.0 - shoreUp) * (1.0 - min(1.0, 3.0 * ridgeUp)) * (1.0 - 0.7 * broke);
    float held = 1.0 - smoothstep(0.6, 1.5, c);
    float pour = pourHigh(q, gFine);
    gSheetHigh = gPourSheet * sheetOn * held;
    fine += (pour - gPourSheet) * sheetOn * held + gSheetHigh;
    // The plates and joints of the rough floor, as far as the cells hold them: a joint lies lower than the plates it parts,
    // so a pad that stands on it meets broken ground and not a level line.
    float roughHeld = roughOn(freshAt(q)) * (1.0 - smoothstep(0.05, 0.12, c)) * off * calm * (1.0 - shoreUp);
    if (roughHeld > 0.0) {
      float roughHigh = (ROUGH_TALL_C * (roughAt(q, ROUGH_C, 1.5 * gFine, 3.0).z - 0.5) + ROUGH_TALL_F * (roughAt(q, ROUGH_F, 1.5 * gFine, 41.0).z - 0.5)) * roughHeld;
      gSheetHigh += roughHigh;
      fine += roughHigh;
    }
  }

  // Where crust has been broken, at the ridges and against the rock, it lies in upturned slabs with rubble between them.
  float rub = max(shoreUp, 0.8 * ridgeUp);
  if (rub > 0.0 && c < 0.7) {
    float saw = fract(dot(q, vec2(0.41, 0.33)) + 1.7 * vnoise(q / 3.7 + 3.0));
    saw = min(saw / 0.8, (1.0 - saw) / 0.2);
    h += rub * calm * 0.45 * saw * (0.3 + 0.7 * vnoise(q / 2.9 + 5.0)) * (1.0 - smoothstep(0.3, 0.7, c));
    if (c < 0.045) h += rub * calm * 0.16 * smoothstep(0.5, 0.75, vnoise(q / 0.27 + 13.0)) * (1.0 - smoothstep(0.025, 0.045, c));
  }
  h += gShore;
  // Out on the lake the broken crust lies in slabs.
  gMound = 0.0;
  if (broke > 0.01 && c < 0.6) {
    gRock = live * shown * (1.0 - smoothstep(1.0, 3.0, bank)) * (1.0 - gPadCalm) * (1.0 - gLow);
    h += slabAt(q, broke, c, gSlabSize, 0.0) * smoothstep(0.0, 1.5, lake);
    gRock = 0.0;
    // Low mounds of ash and rubble, 1 to 3 m across, lie on the broken crust.
    gMound = smoothstep(0.62, 0.84, vnoise(q / 2.3 + 71.0) * 0.8 + vnoise(q / 0.9 + 13.0) * 0.2) * smoothstep(0.3, 0.6, broke) * (1.0 - gPadCalm) * (1.0 - gLow);
    h += gMound * (1.0 - 0.75 * gFlat) * (0.1 + 0.16 * vnoise(q / 0.6 + 3.0) * (1.0 - smoothstep(0.1, 0.2, c))) * slabHeld(c, 1.9) * smoothstep(0.0, 1.5, lake) * (1.0 - gOverlap);
  }

  // The banks of the line fall to the brim over 3 m. Laid from the line itself and not from the net: where the nearest
  // joint of the net stops being the line (1 to 3 m behind the brim) a fall laid from the net ends in a step, a dark toothed
  // line that made two banks of one.
  if (gOverlap > 0.0) {
    float lineFall = exp(-max(gLineFar - 1.0, 0.0) / 3.0) * smoothstep(0.0, 0.08, gLineT) * (1.0 - smoothstep(0.92, 1.0, gLineT)) * (1.0 - smoothstep(6.0, 8.0, gLineFar));
    h = mix(h, lineBrim(q) + 0.18 * h, lineFall);
  }
  // Beside a gap the skin is thin and young and sags to the melt, and where it tore its edge is curled up into a thin lip.
  // The gap is cut down: in the seams the pictures name the melt is the lava's mesh, and the floor lies just under it.
  if (live > 0.5) {
    float wide = smoothstep(0.04, 0.25, gape);
    float named = shown * smoothstep(0.2, 0.3, gape);
    // The brim hardly sags: the crust ends in a lip that stands over the melt.
    // The brim hardly sags. Where the melt lies deep (the line, the fountains) it lies in a trench: the crust keeps its
    // thickness to the broken edge and its top stands a foot over the melt, uneven along the bank.
    float level = meltLevel(n);
    float heatClass = n.g - 2.0;
    float trench = named * max(1.0 - smoothstep(0.01, 0.05, heatClass), step(1.3, heatClass));
    float brim = mix(-0.02, mix(max(level + 0.03, -0.05), level + 0.17 + 0.1 * vnoise(q / 1.3 + 91.0), trench), named);
    // A seam the melt stands high in (the string the group feeds at) is an opening all the same: its bank on the far side
    // from the lens of the shot that looks into it stands 10 to 25 cm over the melt, a broken wall the melt lights, and
    // the bank on the near side stays low, so the lens sees over it into the gap.
    float onBrim = named * (1.0 - smoothstep(0.01, 0.05, heatClass));
    brim = mix(brim, lineBrim(q), onBrim);
    float shallow = named * (1.0 - trench);
    if (shallow > 0.0 && bank < 2.5) {
      vec2 toLens = normalize(vec2(-454.9, 250.3) - q);
      float farSide = smoothstep(0.02, 0.2, n.r - netAt(q + 0.4 * toLens).r);
      brim = mix(brim, level + 0.1 + 0.16 * vnoise(q / 1.3 + 91.0), shallow * farSide * (1.0 - 0.6 * gPadCalm));
    }
    h = mix(h, brim + mix(0.12, 0.18, trench) * h, exp(-max(bank, 0.0) / mix(0.7, 1.5, trench)) * wide * (1.0 - onBrim * smoothstep(0.8, 1.6, bank)));
    // The folds end short of the broken edge: carried over it they would stand as a row of teeth on the wall.
    // At the line the plate ends in a rounded lip, with no broken slabs on it. Within 2.5 m of the brim nothing of the crust
    // (a crack between plates least of all) lies under a hand over the melt: under it the melt would show through.
    float onLine = named * (1.0 - smoothstep(0.01, 0.05, heatClass));
    if (onLine > 0.0 && bank < 2.5) {
      // Rounded, not cut: the crease of a hard floor through the wall of a crack stands as a row of small teeth.
      float over = h - level - 0.06;
      h = mix(h, level + 0.06 + 0.5 * (over + sqrt(over * over + 0.0016)), 1.0 - smoothstep(1.7, 2.5, bank));
    }
    float wallTop = min(2.0 * max(c - 0.04, 0.0), 0.6);
    float fineOn = mix(1.0, smoothstep(wallTop + 0.02, wallTop + 0.3, bank), wide);
    h += fine * fineOn;
    gSheetHigh *= fineOn;
    float lipWide = max(0.1, 5.0 * c);
    float lipAt = (bank - 0.07) / lipWide;
    h += (0.05 + 0.1 * vnoise(q / 0.9 + 5.0)) * exp(-lipAt * lipAt) * (0.06 / lipWide) * wide * smoothstep(0.25, 0.45, vnoise(q / 2.3 + 15.0)) * (1.0 - smoothstep(0.03, 0.08, c));
    float deep = mix(0.03 + 0.25 * min(gape, 0.3), 0.15 - meltLevel(n), named);
    // The wall is a rough fracture face, five cells wide at the least and straight in section: a wall of one or two cells
    // shades each triangle its own way and stands as a row of teeth.
    float wallWide = max(5.0 * c, 0.1);
    float wallRough = 0.35 * wallWide * (vnoise(q / max(8.0 * c, 0.25) + 3.0) - 0.5);
    // Its top and its foot are rounded over a cell and a half: a sharp crease askew to the lattice stands as a saw.
    float cut = smoothstep(0.0, 1.0, (wallTop - bank - wallRough) / wallWide) * min(1.0, 2.0 * gape / max(1.5 * c, 1e-3));
    // An island in the stream is a raft of thin crust: it floats a hand above the melt, it does not stand as high as the banks.
    float bed = -deep;
    // Its outline is the lava's isleAt, with an edge three cells wide: a wall of one cell would stand as a row of teeth.
    if (gape > 0.45 && n.g < 3.3) {
      float isleWide = 2.2 * c;
      float isle = smoothstep(0.6 - isleWide, 0.66 + isleWide, vnoise(q / 1.7 + 31.0) * 0.72 + vnoise(q / 0.45 + 7.0) * 0.28) * (1.0 - smoothstep(0.4, 0.62, n.r / max(gape, 1e-3)));
      bed = mix(bed, level + 0.04 + 0.03 * vnoise(q / 0.6 + 21.0), isle * smoothstep(0.45, 0.6, gape) * (1.0 - smoothstep(0.03, 0.08, c)));
    }
    h = mix(h, bed, cut);
    gSheetHigh *= 1.0 - cut;
  } else {
    h += fine;
  }
  if (c < 3.0) h += ridgeAt(q, c) * (1.0 - smoothstep(1.0, 3.0, c));
  h += dentAt(q + flowVelocity(q) * (uTime - uFlowT0), 0.0).x * smoothstep(0.05, 0.4, bank) * (1.0 - smoothstep(0.1, 0.3, c));
  // The swell of crust beside the lens of the long shot at the fall (uHill: x, z, how much of it stands): a tumulus 3 m high,
  // its top level with the bottom of that frame, out of focus.
  if (uHill.z > 0.0) {
    vec2 dh = q - uHill.xy;
    float hillA = dot(dh, vec2(0.582, -0.813));
    float hillB = dot(dh, vec2(0.813, 0.582));
    float hr = length(vec2(hillA / 1.6, hillB));
    if (hr < 7.6) {
      float over = max(hr - 2.0, 0.0);
      // It is no dome with a level top: one crest runs across the view, half a metre above the rest, and the crest is broken into
      // blocks 0.3 to 0.9 m across that stand a hand to a forearm proud. Through the blur its outline reads as heaped crust.
      float crest = exp(-hillA * hillA / 1.7);
      float top = 2.4 - 0.096 * over * over + 0.5 * crest;
      float knob = crest * (0.36 * (vnoise(vec2(hillB / 0.7, 3.0)) - 0.5) + 0.2 * (vnoise(vec2(hillB / 0.28, 7.0)) - 0.5)) + 0.12 * (vnoise(q / 0.9 + 9.0) - 0.5);
      knob *= smoothstep(0.3, 1.2, top);
      h = mix(h, top + knob, smoothstep(0.0, 0.8, top) * uHill.z);
      gSheetHigh *= 1.0 - smoothstep(0.0, 0.8, top) * uHill.z;
    }
  }
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

// The size of the cells that are sure to be at a point, wherever the rings are snapped to. A ring's middle may lie ahead of the
// focus along the view (uShift, in the ring's own cells), so that the fine cells are spent where the lens looks.
const CELL_GLSL = /* glsl */ `
uniform vec4 uFocus;
uniform vec2 uShift;
float cellAt(vec2 q) {
  vec2 d = q - uFocus.xy;
  vec2 m = max(d / (uFocus.w + uShift), -d / (uFocus.w - uShift));
  return max(uFocus.z, 2.0 * max(m.x, m.y));
}`;

// One ring of cells. The cells are fixed in the crust's rest frame: a vertex is a point of the crust, lifted by the relief
// and carried by the drift, so the lattice never slides over the relief.
const RING_VERTEX = /* glsl */ `
uniform vec3 uRing;
uniform vec4 uLens;
uniform highp sampler2D tBake;
${CELL_GLSL}
varying vec3 vWorld;
varying vec2 vQ;
varying vec3 vNormalG;
varying vec3 vAux;
varying vec2 vAway;
${RIG_GLSL}
void main() {
  vec2 q = uRing.xy + position.xz * uRing.z;
  float c = cellAt(q);
  // The height was laid down for this sample in the ring's own picture: height in two parts (see the bake), metres to the brim.
  ivec2 ij = ivec2(position.xz + 0.5);
  ivec2 last = textureSize(tBake, 0) - 1;
  ivec2 sx = ivec2(ij.x < last.x ? 1 : -1, 0);
  ivec2 sz = ivec2(0, ij.y < last.y ? 1 : -1);
  vec4 here = texelFetch(tBake, ij, 0);
  vec4 atX = texelFetch(tBake, ij + sx, 0);
  vec4 atZ = texelFetch(tBake, ij + sz, 0);
  float high = here.r + here.g + here.a;
  // The slope is taken from the vertices on both sides. Taken from one side only it lies half a cell off, and along an
  // edge that runs askew to the lattice every other vertex is lit as the face and the next as the top: a row of teeth.
  ivec2 bx = ivec2(ij.x > 0 ? 1 : 0, 0);
  ivec2 bz = ivec2(0, ij.y > 0 ? 1 : 0);
  ivec2 fx = ivec2(ij.x < last.x ? 1 : 0, 0);
  ivec2 fz = ivec2(0, ij.y < last.y ? 1 : 0);
  vec4 x0 = texelFetch(tBake, ij - bx, 0);
  vec4 x1 = texelFetch(tBake, ij + fx, 0);
  vec4 z0 = texelFetch(tBake, ij - bz, 0);
  vec4 z1 = texelFetch(tBake, ij + fz, 0);
  vec2 rise = vec2((x1.r - x0.r + x1.g - x0.g) / float(bx.x + fx.x), (z1.r - z0.r + z1.g - z0.g) / float(bz.y + fz.y));
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
uniform sampler2D tRope;
${CELL_GLSL}
#define LAKE_VERTEX
${NOISE_GLSL}
${RIG_GLSL}
${HEAT_GLSL}
${RELIEF_GLSL}
void main() {
  vec2 q = uRing.xy + floor(gl_FragCoord.xy) * uRing.z;
  float c = cellAt(q);
  gFine = fineAt(q, c);
  float h = heightAt(q, c);
  // A half float holds a height of a metre to half a millimetre, which shows as steps in the slopes. So the height is laid
  // down in two parts: a whole number of 64ths of a metre, which a half float holds exactly, and what is left over.
  // The sheet's part goes apart, in the fourth place.
  float own = h - gSheetHigh;
  float whole = floor(own * 64.0 + 0.5) / 64.0;
  gl_FragColor = vec4(whole, own - whole, clamp(gBank, -8.0, 8.0), gSheetHigh);
}`;

/**
 * For whoever stands things on the crust (the loose rock). GLSL for a vertex shader; put NOISE_GLSL and RIG_GLSL before it.
 * `vec3 crustAt(vec2 q)`: q is a point of the crust in its rest frame (where it lies at the reference time uFlowT0, which is
 * world x and z there); the answer is where that point is now in the world: x and z carried by the drift, y the top of the crust.
 * Its uniforms are `crustUniforms`, filled when the lake is created: hand the same objects to the material.
 */
export const CRUST_HEIGHT_GLSL = /* glsl */ `
uniform sampler2D tRope;
${CELL_GLSL}
#define LAKE_VERTEX
${HEAT_GLSL}
${RELIEF_GLSL}
vec3 crustAt(vec2 q) {
  float c = cellAt(q);
  gFine = fineAt(q, c);
  float h = heightAt(q, c);
  float dt = uTime - uFlowT0;
  vec2 p = q + flowVelocity(q) * dt;
  p = q + flowVelocity(p) * dt;
  return vec3(p.x, h, p.y);
}`;
export const crustUniforms: Record<string, THREE.IUniform> = {};

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
  vec4 net = netAt(q);
  vec4 heat = heatAt(q, -shore, net, 1.0 / uGlowTexels);
  // The channel at the line is drawn wider than its seam was, with pools, and nearer its bank: what it gives the rig is what
  // the narrower one gave.
  float onLine = step(1.5, net.g) * (1.0 - smoothstep(0.01, 0.04, net.g - 2.0));
  gl_FragColor = vec4(blackbody(heat.y) * heat.x * mix(1.0, 0.28, onLine), 1.0);
  if (shore > 1.5) discard;
}`;

// The crust is drawn in square rings of cells that lie in the crust's rest frame. The innermost ring has cells of 2.3 cm
// and sits where the lens meets the lake; each ring out has cells twice as large, and the last is one sheet over the whole
// lake in cells of 6 m. Every ring is snapped to the lattice of the ring outside it, so a vertex is always the same point of
// the crust, and the outer row of each ring uses only the vertices the next ring has, so no gap opens between them.
const CELL = 6;
const RINGS = 8;
// A ring has room for this many cells on a side. A wide lens uses 256 of them; a long lens, whose view is a narrow wedge
// that runs far over the lake, uses them all and sets each ring ahead of the focus.
const N = 512;
const SPAN_WIDE = 256;
const BLOCK = 16;
const CELL0 = CELL / 2 ** RINGS;
// Where the rings are set for shot heart-02: a point of the floor 54 m from the lens of key heart-3, toward the group.
const FLOOR_FOCUS: readonly [number, number] = [-417.0, 211.8];
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
    tPour: { value: ctx.assets.texture('mat/coil-nt.jpg', { kind: 'data', anisotropy: 4 }) },
    tPourNh: { value: ctx.assets.texture('mat/coil-nh.jpg', { kind: 'data' }) },
    tRough: { value: ctx.assets.texture('mat/rough-nt.jpg', { kind: 'data' }) },
    tMeltNh: { value: ctx.assets.texture('mat/melt-nh.jpg', { kind: 'data', anisotropy: 2 }) },
    uRidge: { value: RIDGES.map((r) => new THREE.Vector4(r.from[0], r.from[1], r.to[0], r.to[1])) },
    uRidgeSize: { value: RIDGES.map((r) => new THREE.Vector2(r.tall, r.reach)) },
    uGroupSeam: { value: new THREE.Vector4(-458.8, 221.3, -326.8, 179.3) },
    uLineSeam: { value: new THREE.Vector4(SEAMS.line!.from[0], SEAMS.line!.from[1], SEAMS.line!.to[0], SEAMS.line!.to[1]) },
    // The middle of the mound of the one that sank, as its owner gives it, and the radius the crust keeps flat under it.
    uMound: { value: new THREE.Vector3(SUNK[0] - 1.48, SUNK[2] - 3.2, 5) },
    // The hero at its pool, walker 0 in its two shots, walker 13.
    // The swell beside the lens of key heart-4: 10.5 m ahead of it and 4 m to its left. On the set for shot heart-05 only.
    uHill: { value: new THREE.Vector4(-455 + 10.5 * 0.582 - 4 * 0.813, 178 - 10.5 * 0.813 - 4 * 0.582, 0, 0) },
    uPadDents: { value: PAD_DENTS },
    uPads: { value: [new THREE.Vector3(-410, 197, 7), new THREE.Vector3(-508.7, 226.8, 7), new THREE.Vector3(-494.3, 209.8, 7), new THREE.Vector3(-423.5, 166.1, 7), new THREE.Vector3(-407.6, 206.5, 4.5)] },
  };
  const foundering = createFoundering(ctx);
  Object.assign(shared, foundering.uniforms);
  const lava = { value: 1 };
  const focus = new THREE.Vector4(0, 0, CELL0, SPAN_WIDE / 2 - 2);
  const shift = new THREE.Vector2(0, 0);
  // The lens in the crust's rest frame, its height over the lake, and the angle of one pixel of the largest format.
  const lens = new THREE.Vector4(0, 0, 10, 3e-4);
  Object.assign(crustUniforms, shared, { uFocus: { value: focus }, uShift: { value: shift }, uLens: { value: lens } });
  const depthFragment = `precision highp float;\nvarying vec3 vWorld;\n${RIG_GLSL}\nvoid main() { if (landAt(vWorld.xz).b > 1.5 + 0.6 * max(length(cameraPosition - vWorld) - 150.0, 0.0)) discard; gl_FragColor = vec4(0.0); }`;

  const crust = new THREE.Group();
  const ringLattice = lattice(N, N);
  const makeRing = (nx: number, nz: number, cell: number, block: number, stitched: boolean, position: THREE.BufferAttribute): Ring => {
    const uniform = new THREE.Vector3(0, 0, cell);
    const target = new THREE.WebGLRenderTarget(nx + 1, nz + 1, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, generateMipmaps: false });
    const ringUniforms = { uRing: { value: uniform }, uFocus: { value: focus }, uShift: { value: shift }, uLens: { value: lens } };
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
  const hillShot = shotById('heart-05');
  const hillFrom = secondsInPlace(UNIT, hillShot.first) - 0.3 / 60;
  const hillTo = secondsInPlace(UNIT, hillShot.last) + 0.7 / 60;
  const floorShot = shotById('heart-02');
  const floorFrom = secondsInPlace(UNIT, floorShot.first) - 0.3 / 60;
  const floorTo = secondsInPlace(UNIT, floorShot.last) + 0.7 / 60;
  const frustum = new THREE.Frustum();
  const matrix = new THREE.Matrix4();
  const box = new THREE.Box3();
  const ray = new THREE.Vector3();
  const eye = new THREE.Vector3();

  // Where the lens meets the lake: the lowest point of the lake down the middle of the frame, in the crust's rest frame.
  const heading = { x: 1, z: 0, slant: 1 };
  const aim = (camera: THREE.PerspectiveCamera, further: number): [number, number] => {
    eye.setFromMatrixPosition(camera.matrixWorld);
    ray.set(0, -0.85, 0.5).unproject(camera).sub(eye).normalize();
    const along = Math.hypot(ray.x, ray.z) || 1e-6;
    const dx = ray.x / along;
    const dz = ray.z / along;
    let reach = ray.y < -1e-4 ? Math.min(900, (-eye.y / ray.y) * along) : 900;
    reach = Math.max(reach, 0) * further;
    heading.x = dx;
    heading.z = dz;
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
    heading.slant = Math.hypot(reach, eye.y);
    const v = ctx.rig.flow.velocity(x, z);
    const dt = now - ctx.rig.flow.t0;
    return [x - v[0] * dt, z - v[1] * dt];
  };

  const fill = (ring: Ring, hole: [number, number, number, number] | null, slack: number, span: number): void => {
    const { cell, block, stitched } = ring;
    // A ring uses the first span cells of its lattice each way; the sheet uses all of its own.
    const nx = stitched ? span : ring.nx;
    const nz = stitched ? span : ring.nz;
    const out = ring.index.array as Uint32Array;
    const quad = ring.corners.array as Float32Array;
    const row = ring.nx + 1;
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
        const ub = Math.min(ring.nx + 1, i1 + 2);
        const va = Math.max(0, bj - 1);
        const vb = Math.min(ring.nz + 1, j1 + 2);
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
      shared.uHill.value.z = seconds >= hillFrom && seconds <= hillTo ? 1 : 0;
      foundering.setTime(seconds);
      molten.setTime(seconds);
    },
    beforeSample: (renderer, camera) => {
      camera.updateMatrixWorld();
      // A long lens: the focus goes a third further in, the rings use all their cells and lie ahead of it.
      const tall = camera.projectionMatrix.elements[5] as number;
      const long = tall > 4.5;
      const span = long ? N : SPAN_WIDE;
      const ahead = long ? N / 4 : 0;
      let [fx, fz] = aim(camera, long ? 1.35 : 1);
      // In the shot of the group at the seam the lens is sharp at the feet, 60 to 76 m out, and soft on the floor in front of
      // them: the fine cells are spent on the floor from 45 m out to the group, at one place for the whole shot.
      if (long && now >= floorFrom && now <= floorTo) {
        const v = ctx.rig.flow.velocity(FLOOR_FOCUS[0], FLOOR_FOCUS[1]);
        const dt = now - ctx.rig.flow.t0;
        fx = FLOOR_FOCUS[0] - v[0] * dt;
        fz = FLOOR_FOCUS[1] - v[1] * dt;
        heading.slant = Math.hypot(FLOOR_FOCUS[0] - eye.x, eye.y, FLOOR_FOCUS[1] - eye.z);
      }
      const pixel = 2 / (tall * 2160);
      // No ring finer than a pixel and a half is wide there: its cells would be spent on what the lens cannot see.
      const least = Math.max(CELL0, 3 * pixel * heading.slant);
      const first = Math.min(3, Math.floor(Math.log2(least / CELL0)));
      const along = Math.max(Math.abs(heading.x), Math.abs(heading.z)) || 1;
      shift.set((ahead * heading.x) / along, (ahead * heading.z) / along);
      focus.set(fx, fz, least, span / 2 - 2);
      const lv = ctx.rig.flow.velocity(eye.x, eye.z);
      const ldt = now - ctx.rig.flow.t0;
      lens.set(eye.x - lv[0] * ldt, eye.z - lv[1] * ldt, Math.max(eye.y, 0.5), pixel);
      matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(matrix);
      // The cells are placed in the rest frame and carried by the drift: a block may lie that far from where its cells say.
      const slack = 0.3 * Math.abs(now - ctx.rig.flow.t0) + 0.5;
      for (let level = 0; level < RINGS; level++) {
        const ring = rings[level] as Ring;
        const outer = ring.cell * 2;
        ring.x0 = Math.floor((fx + shift.x * ring.cell) / outer) * outer - (span / 2) * ring.cell;
        ring.z0 = Math.floor((fz + shift.y * ring.cell) / outer) * outer - (span / 2) * ring.cell;
        ring.uniform.set(ring.x0, ring.z0, ring.cell);
      }
      for (let level = 0; level <= RINGS; level++) {
        const ring = rings[level] as Ring;
        if (level < first) {
          ring.mesh.geometry.setDrawRange(0, 0);
          ring.squares.setDrawRange(0, 0);
          continue;
        }
        let hole: [number, number, number, number] | null = null;
        if (level > first) {
          const inner = rings[level - 1] as Ring;
          const hx = Math.round((inner.x0 - ring.x0) / ring.cell);
          const hz = Math.round((inner.z0 - ring.z0) / ring.cell);
          hole = [hx, hz, hx + span / 2, hz + span / 2];
        }
        fill(ring, hole, slack, span);
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
