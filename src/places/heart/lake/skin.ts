// The skin of the crust: its fragment shader. What the surface looks like below the scale of a fold.
// The relief (index.ts) hands it the fold, the plate and the normal; the heat (heat.ts) hands it the melt.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { LINE } from '../shared/anchors';
import { HEAT_GLSL } from './heat';

// `RELIEF_GLSL` is the form owner's, in index.ts: it is passed in so that this file never reaches back into that one.
export function skinFragment(RELIEF_GLSL: string): string {
  return /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vQ;
varying vec3 vNormalG;
varying vec3 vAux;
varying vec2 vAway;
uniform sampler2D tRope;
uniform sampler2D tRopeNh;
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

// The slope on the crust, in height per metre, of a quantity that changes by d from one pixel to the next.
// The grain of the skin at the size of a finger tip, from points scattered one to a cell: x, how far the nearest lies (in cells);
// y, how far the border between the two nearest; z, a number of the nearest. No branch in it: its slope is taken in main.
vec3 gritAt(vec2 p) {
  vec2 c = floor(p);
  vec2 f = p - c;
  float d1 = 9.0;
  float d2 = 9.0;
  float tag = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 h = hash22(c + o + 13.7);
      vec2 r = o + h - f;
      float d = dot(r, r);
      d2 = min(d2, max(d1, d));
      tag = mix(tag, fract(h.x * 17.3 + h.y * 5.1), step(d, d1));
      d1 = min(d1, d);
    }
  }
  d1 = sqrt(d1);
  return vec3(d1, sqrt(d2) - d1, tag);
}

vec2 onCrust(vec2 d, vec2 qx, vec2 qy, float det) {
  return vec2(d.x * qy.y - d.y * qx.y, d.y * qx.x - d.x * qy.x) / det;
}

// The photographed skin is read three times, turned against itself, at 4.3 m, 1.4 m and 0.4 m to a repeat: its mips are
// the fade, so each grain goes out as it nears the size of a pixel and nothing is left to shimmer.
const mat2 TURN_A = mat2(0.7986, 0.6018, -0.6018, 0.7986);
const mat2 TURN_B = mat2(0.9397, -0.3420, 0.3420, 0.9397);
const mat2 TURN_C = mat2(-0.2588, 0.9659, -0.9659, -0.2588);

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
  // The swell beside the lens of the long shot at the fall is out of focus from its first frame to its last: it is shaded
  // as crust seen from thirty metres, and what the blur would take is not computed.
  float blurred = 0.0;
  if (uHill.z > 0.0) {
    vec2 dh = q - uHill.xy;
    blurred = uHill.z * (1.0 - smoothstep(6.4, 7.6, length(vec2(dot(dh, vec2(0.582, -0.813)) / 1.6, dot(dh, vec2(0.813, 0.582))))));
    fpLong = max(fpLong, 0.45 * blurred);
    fpShort = max(fpShort, 0.2 * blurred);
  }
  float cell = vAux.y;
  float shown = step(1.5, net.g);
  float live = step(1e-3, net.a);

  vec4 heat = heatAt(q, lake, net, 0.0);
  // Out on the lake the paint rides its plate, and each plate is of a day of its own.
  vec2 ride = gPlateShift;
  float plated = step(1e-3, gPlateHalf + abs(ride.x) + abs(ride.y)) * plateZone(q, lake, net);
  float plateAge = (gPlateId - 0.5) * plated;
  float gape = gapeAt(q, net).x;
  // Metres to the brim as the relief laid it (negative in the gap): what is painted on a lip or a wall follows the
  // shape that is there, not the finer tear of the heat, which would hang down a smooth wall as a comb.
  float bank = vAux.z;
  float young = heat.w;
  float calm = calmAt(q);

  // Heaps at the shore, and out on the lake the crust broken into slabs: a slab is a plate of skin with a tilt of its own,
  // and between two slabs lies a gap with rubble in it.
  float heap = heapAt(q, lake, cell);
  float broke = brokenAt(q);
  float broken = max(heap, broke);
  float slabGap = 0.0;
  float slabTone = 1.0;
  float slabId = 0.0;
  vec2 slabSlope = vec2(0.0);
  if (broke > 0.01 && cell < 0.6) {
    slabAt(q, broke, cell, gSlabSize, 0.0);
    float onLake = smoothstep(0.0, 1.5, lake);
    // A gap is drawn while a pixel is finer than it: from afar the broken ground is a tone, not a net of black lines.
    // Most joints between slabs are shut: a hairline of tone. A gap stands open only within a few metres of a pool or of
    // the seam the group feeds at, and not every one there.
    float nearPool = live * smoothstep(0.2, 0.4, gape) * (1.0 - smoothstep(1.5, 4.0, net.r - gape));
    float gapOpen = max(nearPool, 1.0 - smoothstep(3.0, 8.0, groupFar(q))) * smoothstep(0.38, 0.52, vnoise(q / 2.3 + 37.0));
    // Where the plates of a bank lap one on the next there is no gap at all, only the crease at the foot of the step.
    // The hairline is the skin's own, from the distance to the plate's edge, so it stays where the relief shuts its gap to
    // nothing. It is two centimetres wide or a pixel and a half and dimmer, and it dies out here and there along its run,
    // so the joints do not close into tiles.
    float hairWide = max(0.02, 1.5 * fpShort);
    float hair = (1.0 - smoothstep(0.5 * hairWide, hairWide, gSlabRim)) * min(1.0, 0.02 / hairWide) * smoothstep(0.3, 0.45, vnoise(q / 1.3 + 71.0));
    slabGap = mix(0.35 * max(smoothstep(0.7, 0.95, gSlabEdge), hair), gSlabEdge, gapOpen * (1.0 - gOverlap)) * onLake * (1.0 - smoothstep(0.06, 0.25, fpLong));
    slabSlope = gSlabSlope * ((1.0 - slabHeld(cell, gSlabSize)) * (1.0 - gSlabEdge) * onLake);
    // A slab differs little from the next: the tone lies across many of them in patches of three to ten metres.
    slabId = gSlabId;
    slabTone = (0.93 + 0.14 * fract(gSlabId * 7.31 + 0.17)) * (0.8 + 0.4 * smoothstep(0.3, 0.7, vnoise(q / 6.3 + 11.0)));
  }
  ridgeAt(q, cell);
  float clinker = gRidgeOn;
  broken = max(broken, clinker);
  // Loose rubble: the heaps, the ridges and the gaps between slabs.
  float rubble = max(max(heap, clinker), slabGap);
  // The crust the group feeds on is the youngest of the lake: dark, glassy, hardly a day old.
  // It does not reach the line at the shore, which has the old ropy skin of the picture taken there.
  float fresh = (1.0 - smoothstep(12.0, 55.0, groupFar(q) + 14.0 * (vnoise(q / 17.0 + 8.0) - 0.5))) * smoothstep(20.0, 42.0, length(q - vec2(${LINE[0].toFixed(1)}, ${LINE[1].toFixed(1)})));
  // The banks of the line near the lens of its picture, and the ground round the one that sank, are coiled rope: there a
  // furrow is deep and nearly black. Everywhere else no line lies more than a quarter under its surround.
  float coilMound = 1.0 - smoothstep(20.0, 28.0, length(q - uMound.xy));
  float coil = max(1.0 - smoothstep(12.0, 20.0, length(q - vec2(${LINE[0].toFixed(1)}, ${LINE[1].toFixed(1)}))), coilMound);
  // Age lies on the lake in broad patches, and each plate and each lobe has its own on top of that.
  float age = 0.5 + 1.6 * (0.65 * vnoise(q / 110.0 + 4.0) + 0.35 * vnoise(q / 37.0 + 9.0) - 0.5) + 0.5 * (net.b - 0.5);
  // Within a plate, flows of other days lie side by side, two to six metres across, with an edge between them:
  // wet black glass beside matte ash grey. Near the feeding group too, where all of it is young.
  float flow = smoothstep(0.43, 0.57, 0.65 * vnoise((q + ride) / 4.1 + 17.0) + 0.35 * vnoise((q + ride) / 1.4 + 29.0));
  age += 0.4 * (vnoise((q + ride) / 11.0 + 17.0) - 0.5) + 0.7 * plateAge;

  vec3 n = normalize(vNormalG);
  // A face that stands (the wall of a trench, the side of a slab) is a fracture: no fold, toe or cord is drawn on it, and
  // the grain is laid on it by its height, so that nothing runs down it in stripes.
  float steep = 1.0 - smoothstep(0.7, 0.85, n.y);
  // Where the plates of a bank lap, the step from one to the next is a crease with a soft shadow, not a fracture face.
  steep *= 1.0 - 0.7 * gOverlap * smoothstep(0.3, 1.0, bank);
  float lean = length(n.xz);
  vec2 qg = q + ride - (steep * vWorld.y * (1.0 - n.y) / max(lean * lean, 1e-3)) * n.xz;
  float fpGrain = max(fpLong, steep * max(abs(dFdx(vWorld.y)), abs(dFdy(vWorld.y))));
  vec2 slope = slabSlope;
  float crease = 1.0;
  // Every drawn line (where a tongue lies on the next, a fold's floor, a cord, a thread) goes into one sum, and the sum is
  // held to a quarter under its surround: the relief is told by the light on it, not by ink.
  float lines = 1.0;
  // Round the feeding group the crust is churned: lumps of a quarter to three quarters of a metre, with hollows between
  // them, so that the light of the seam shades it. A face turned to the seam is lit, a face turned to the lens is dark.
  float churn = smoothstep(0.0, 0.35, fresh) * (1.0 - steep) * mix(0.55, 1.0, smoothstep(0.3, 0.6, vnoise(q / 5.7 + 3.0))) * (1.0 - smoothstep(0.3, 0.6, fpLong)) * (1.0 - 0.6 * broke) * (1.0 - slabGap);
  vec2 lumpSlope = vec2(0.0);
  float lumpLow = 0.0;
  float lumpTone = 1.0;
  if (churn > 0.0) {
    vec2 l1 = q / 0.62 + 23.0;
    float a1 = vnoise(l1);
    vec2 g1 = vec2(vnoise(l1 + vec2(0.1, 0.0)) - a1, vnoise(l1 + vec2(0.0, 0.1)) - a1) / 0.1;
    vec2 l2 = TURN_B * q / 0.27 + 5.0;
    float a2 = vnoise(l2);
    vec2 g2 = vec2(vnoise(l2 + vec2(0.1, 0.0)) - a2, vnoise(l2 + vec2(0.0, 0.1)) - a2) / 0.1;
    float keep2 = 1.0 - smoothstep(0.12, 0.25, fpLong);
    lumpSlope = (0.34 / 0.62) * g1 + (0.11 / 0.27) * keep2 * (g2 * TURN_B);
    lumpSlope *= churn * min(1.0, 0.65 / max(length(lumpSlope), 1e-4));
    lumpLow = churn * (0.75 * (1.0 - smoothstep(0.22, 0.46, a1)) + 0.4 * keep2 * (1.0 - smoothstep(0.25, 0.45, a2)));
    slope += lumpSlope;
    // A hollow between two lumps sees a third of the sky, and a face that leans sees less of it than a top.
    crease *= (1.0 - 0.8 * min(lumpLow, 1.0)) * (1.0 - 0.5 * smoothstep(0.12, 0.55, length(lumpSlope)));
    // Each lump is a piece of another day: one dusted with ash, the next bare.
    lumpTone = 1.0 + 0.45 * churn * (2.0 * smoothstep(0.35, 0.65, vnoise(q / 1.3 + 67.0)) - 1.0);
  }
  float det = qx.x * qy.y - qx.y * qy.x;
  det = abs(det) > 1e-12 ? det : 1e12;

  // The skin itself is the poured crust (sheet.ts): one whole reading of the slab sheet a slab, the higher slab on the lower.
  // The reading takes the footprint of the pixel, so a rope seen low keeps its edge across the view, and what a pixel
  // cannot hold the mips give as the mean: nothing is left to shimmer.
  vec2 gx = dFdx(qg);
  vec2 gy = dFdy(qg);
  float lx = max(length(gx), 1e-6);
  float ly = max(length(gy), 1e-6);
  // Seen very low a pixel is thirty times as long as it is wide: past two and a half the long way is cut, or the reading would
  // blur what lies across it.
  gx *= min(1.0, 2.5 * ly / lx);
  gy *= min(1.0, 2.5 * lx / ly);
  float fpS = max(min(lx, ly), 0.025 * blurred);
  vec3 skinM = pourAt(qg, gx, gy);
  float roped = gPourKind;
  float slabTag = gPourTag;
  // The black gap where a slab ends on the next: a hand wide or a pixel and dimmer. The lower slab lies in the shade of
  // the upper for a hand or two.
  float gapWide = max(0.009, 0.2 * fpS);
  // It is open along some of its run and shut along the rest, and from afar it is gone: the far lake is no net of lines.
  float pourGap = (1.0 - smoothstep(0.35 * gapWide, gapWide, gPourEdge)) * min(1.0, 0.009 / gapWide) * (1.0 - steep) * (1.0 - smoothstep(0.012, 0.035, fpS)) * smoothstep(0.42, 0.62, 0.6 * vnoise(q / 1.9 + 23.0) + 0.4 * vnoise(q / 0.6 + 7.0));
  float pourShade = (1.0 - gPourOver) * exp(-gPourEdge / 0.03) * (1.0 - smoothstep(0.012, 0.04, fpS)) * (1.0 - steep);
  // Under the lens the skin of a slab has wrinkles of its own: the sheet once more, a quarter of its size, laid as its slab is.
  float nearOn = 1.0 - smoothstep(0.004, 0.012, fpS);
  vec3 skinD = vec3(0.0, 0.0, 0.5);
  if (nearOn > 0.0) {
    mat2 turnD = gPourTurn * TURN_A;
    vec2 scaleD = vec2(1.0, 2.0) / SHEET_D;
    vec3 nt = textureGrad(tPour, (turnD * qg) * scaleD + gPourShift.yx, (turnD * gx) * scaleD, (turnD * gy) * scaleD).rgb;
    skinD = mix(skinD, vec3((vec2(nt.r - 0.5, 0.5 - nt.g) * turnD) * (819.2 / SHEET_D), nt.b), nearOn * mix(0.35, 0.8, roped));
  }
  vec3 skinL = vec3(0.0, 0.0, 0.5);
  // From afar the lake is one dark field: no slab is told from the next by its tone.
  float slabSeen = 1.0 - smoothstep(0.012, 0.04, fpS);
  // A crest is worn pale, a furrow is black glass, and each slab is of its own day.
  float tone = clamp(0.78 + mix(2.4, 0.5, smoothstep(0.004, 0.02, fpS)) * (skinM.z - 0.5), 0.1, 1.7) * (1.0 - 0.85 * pourGap) * (1.0 + 0.22 * (slabTag - 0.5) * slabSeen);
  // Round the one that sank the picture's ropes stand out hard: crests worn pale, furrows black, wherever a cord is told at all.
  tone *= mix(1.0, 0.4 + 1.9 * smoothstep(0.25, 0.8, skinM.z), coilMound * (1.0 - smoothstep(0.03, 0.1, fpS)));
  // The light on the crust is the flat light of an overcast sky: the paint leans a cord half again as steep as it stands.
  vec2 fine = 1.5 * POUR_TALL * gPourSpan * skinM.xy + SHEET_TALL_D * skinD.xy;
  float grainA = skinM.z - 0.5;
  // A furrow sees a sixth of the sky, a crest all of it.
  crease *= mix(1.0, smoothstep(0.05, 0.5, skinM.z), mix(0.85, 0.3, smoothstep(0.004, 0.02, fpS))) * mix(1.0, smoothstep(0.1, 0.5, skinD.z), 0.4) * (1.0 - 0.6 * pourShade) * (1.0 - 0.8 * pourGap);
  float crest = smoothstep(0.55, 0.85, skinM.z);
  crease *= max(lines, 0.75);
  // Under a loaded pad the crust is pressed dark, and the line where the dish breaks from the crust round it is a crack.
  vec3 dent = dentAt(vWorld.xz, vnoise(q / 0.11 + 5.0) - 0.5);
  float dentCrack = dent.z * (1.0 - smoothstep(0.01, 0.04, fpS)) * smoothstep(0.25, 0.4, vnoise(q / 0.23 + 31.0));
  tone *= (1.0 - 0.3 * dent.y) * (1.0 - 0.7 * dentCrack);
  crease *= (1.0 - 0.3 * dent.y) * (1.0 - 0.6 * dentCrack);
  // A satin slab is young black glass, a roped one older and duller.
  age += (0.2 * (slabTag - 0.5) - 0.15 * (1.0 - roped)) * slabSeen;
  age = clamp(clamp(age, 0.0, 1.0) * (1.0 - 0.75 * fresh) + (0.4 + 0.25 * fresh) * (flow - 0.5) + 0.5 * (skinL.z - 0.5) * (1.0 - abs(2.0 * flow - 1.0)), 0.0, 1.0) * (1.0 - 0.8 * young);

  // From afar the lake is one dark dry field: the flows and plates differ less, and a rough face seen low shadows itself.
  float wide = smoothstep(30.0, 130.0, far);
  age = mix(age, 0.32, 0.4 * wide);

  // Spall: in patches the glassy skin has flaked off. What shows is paler and rougher and lies a centimetre or two lower,
  // behind a sharp edge. The edge is never drawn finer than a pixel can hold.
  // Read for every pixel, with no branch round it: its slope is taken from one pixel to the next.
  float spallAt = 0.6 * vnoise(q / 0.41 + 51.0) + 0.4 * vnoise(q / 0.14 + 7.0) + 0.35 * grainA;
  float spallFrom = mix(0.8, 0.56, smoothstep(0.35, 0.8, vnoise(q / 3.3 + 91.0)) * (0.35 + 0.65 * age));
  float spall = smoothstep(spallFrom, spallFrom + max(0.03, 5.0 * fpLong), spallAt) * (1.0 - smoothstep(0.15, 0.4, fpLong)) * (1.0 - steep) * (1.0 - coil * (1.0 - coilMound));
  fine -= clamp(onCrust(vec2(dFdx(spall), dFdy(spall)), qx, qy, det) * 0.016, -1.3, 1.3) * (1.0 - smoothstep(0.03, 0.08, fpLong));
  // The skin under the lens is not clay. Bubbles burst in it as it froze: pits a few millimetres across, more in one patch
  // than the next. The glass on it is crazed into chips as wide as a thumb, each tilted a hair and of its own shade, and the
  // cracks between them hold ash. All of it lies in the crust, at its own size, and is gone where a pixel is wider than it.
  float fpG = sqrt(fpS * fpLong);
  float gritNear = (1.0 - smoothstep(0.005, 0.014, fpG)) * (1.0 - steep);
  float chipNear = (1.0 - smoothstep(0.014, 0.04, fpG)) * (1.0 - steep);
  vec3 gritS = gritAt(q / 0.013);
  vec3 gritL = gritAt(q / 0.045 + 7.0);
  float bubbly = smoothstep(0.3, 0.62, 0.6 * vnoise(q / 0.8 + 37.0) + 0.4 * vnoise(q / 0.21 + 11.0));
  float vesicle = (1.0 - smoothstep(0.1, 0.3, gritS.x)) * smoothstep(0.42, 0.5, gritS.z) * mix(0.25, 1.0, bubbly) * gritNear;
  float crackLine = (1.0 - smoothstep(0.0, max(0.06, 1.2 * fpS / 0.045), gritL.y)) * chipNear;
  float crackle = crackLine * smoothstep(0.35, 0.6, vnoise(q / 0.55 + 71.0));
  // Between the chip and the slab the skin is mottled, a palm across and a finger across.
  float mottle = (vnoise(q / 0.11 + 5.0) - 0.5) * (1.0 - smoothstep(0.03, 0.09, fpG)) + 0.7 * (vnoise(q / 0.031 + 9.0) - 0.5) * chipNear;
  float chip = (gritL.z - 0.5) * chipNear;
  float speck = (gritS.z - 0.5) * gritNear;
  float gritTall = 0.002 * chip + 0.001 * speck - 0.0035 * vesicle - 0.002 * crackle;
  fine += clamp(onCrust(vec2(dFdx(gritTall), dFdy(gritTall)), qx, qy, det), -1.0, 1.0);
  tone *= (1.0 + 0.6 * chip + 0.4 * speck + 0.55 * mottle) * (1.0 - 0.65 * vesicle);
  // A standing face is the broken edge of the skin: its layers show, a finger thick, and it is rough.
  tone *= mix(1.0, 0.55 + 0.9 * vnoise(vec2(dot(q, vec2(0.71, 0.71)) / 0.07, vWorld.y / 0.012)), steep * (1.0 - smoothstep(0.014, 0.04, fpG)));
  crease *= (1.0 - 0.5 * vesicle) * (1.0 - 0.35 * crackle);
  // The shape decides what a face looks at (its neighbour, the sky, the melt); the grain only turns the light on it.
  vec3 nShape = normalize(n - vec3(slope.x, 0.0, slope.y) * n.y);
  slope += fine;
  n = normalize(n - vec3(slope.x, 0.0, slope.y) * n.y);

  // Ash: pale dust lies in the hollows of the billow, in grooves and pits, and thick on old plates.
  float hollow = 1.0 - smoothstep(0.2, 0.42, vnoise(q / 2.6 + 1.0));
  float low = 1.0 - smoothstep(0.3, 0.5, skinM.z);
  float dust = clamp(max(hollow, smoothstep(0.7, 0.95, age)) * mix(0.15, 1.0, low) + 0.5 * spall * hollow, 0.0, 1.0) * (1.0 - young) * (1.0 - fresh) * (1.0 - steep);

  // Old skin is grey and rough, young skin black and glassy: by patch, by plate and by lobe. Grain on all of it.
  vec3 albedo = mix(vec3(0.034, 0.035, 0.037), vec3(0.125, 0.126, 0.129), age) * (0.9 + 0.2 * vnoise(q / 3.1 + 13.0));
  // The tone within a patch is the photograph's: pale worn crests, black furrows, glass and grit.
  albedo *= 0.85 * clamp(tone, 0.1, 4.0) * (1.0 + 0.8 * (skinD.z - 0.5));
  // The mean of what is left out on the blurred swell: its grooves and its spall darken and warm it by a tenth.
  albedo *= mix(vec3(1.0), vec3(0.99, 0.9, 0.885), blurred);
  // The banks of the line are dark charcoal brown, not ash.
  // The crust at the line is as the picture has it under that sky: a lit grey with a breath of violet, not charcoal. Round
  // the one that sank it is a third paler than it was.
  albedo *= mix(vec3(1.0), vec3(3.2, 2.9, 3.05), coil * (1.0 - coilMound) * (1.0 - fresh)) * mix(1.0, 1.08, coilMound);
  albedo *= mix(vec3(1.0), vec3(0.86, 0.8, 0.77), wide);
  albedo = mix(albedo, vec3(0.07, 0.065, 0.062) * (0.55 + 1.1 * skinD.z + 0.6 * grainA), 0.85 * spall);
  albedo = mix(albedo, vec3(0.1, 0.095, 0.092), 0.4 * dust);
  albedo = mix(albedo, mix(vec3(0.02), vec3(0.11, 0.105, 0.1), smoothstep(0.3, 0.7, age) * (1.0 - fresh)), 0.7 * crackle);
  // The floor the group feeds on is dark, with low mounds of grey ash and rubble a metre or three across, and wet patches.
  float mound = 0.0;
  float wet = 0.0;
  albedo *= lumpTone * slabTone;
  if (fresh > 0.01) {
    mound = fresh * smoothstep(0.6, 0.72, 0.7 * vnoise(q / 2.1 + 47.0) + 0.3 * vnoise(q / 0.7 + 3.0));
    wet = fresh * (1.0 - flow) * (1.0 - mound) * (1.0 - steep) * (1.0 - rubble) * (1.0 - spall) * smoothstep(0.58, 0.68, 0.7 * vnoise(q / 2.3 + 77.0) + 0.3 * vnoise(q / 0.6 + 19.0));
  }
  albedo = mix(albedo, vec3(0.062, 0.06, 0.059) * (0.7 + 1.2 * skinD.z - 0.3), 0.8 * mound);
  // That floor is cool dark basalt and nothing on it is pale: its brights are the fire's, not ash on the tops of plates.
  albedo *= mix(vec3(1.0), vec3(0.95, 0.99, 1.05), fresh) * mix(1.0, min(1.0, 0.045 / max(dot(albedo, vec3(0.3, 0.5, 0.2)), 1e-3)), fresh);
  // Satin only where fresh glass faces the sky, on the tops of ropes and on the smooth slabs: everything else is dead matte.
  float glass = (1.0 - steep) * (1.0 - smoothstep(mix(0.3, 0.6, crest), mix(0.75, 1.0, crest), age)) * (1.0 - spall) * (1.0 - dust) * (1.0 - rubble) * max(crest, 0.35 * (1.0 - smoothstep(0.08, 0.35, fpLong)));
  glass *= (1.0 - vesicle) * (1.0 - crackle) * (1.0 + 0.6 * chip);
  float rough = mix(mix(0.93, 0.4, clamp(glass * (1.0 - mound), 0.0, 1.0)), 0.2, wet);

  // How much sky a point sees: less in a crease, between two lobes, below the brim of a gap.
  float below = max(-vWorld.y, 0.0);
  // Broken crust is dark, dull clinker, pitted between its blocks.
  if (rubble > 0.0) {
    float pits = 0.35 + 0.65 * smoothstep(0.3, 0.65, 0.6 * vnoise(q / 0.31 + 7.0) + 0.4 * vnoise(q / 0.09 + 3.0));
    albedo = mix(albedo, mix(vec3(0.034, 0.031, 0.03), vec3(0.055, 0.051, 0.048), slabGap * (1.0 - max(heap, clinker))) * (0.6 + 0.8 * vnoise(q / 0.6 + 41.0)), max(max(clinker, 0.6 * heap), 0.6 * slabGap));
    crease *= mix(1.0, pits, max(heap, clinker)) * (1.0 - 0.3 * slabGap);
  }
  // A joint that no picture names is a fine dark line seen close, and is gone from the wide view.
  float inGap = live * (1.0 - smoothstep(-0.02, 0.06, bank)) * mix(1.0 - smoothstep(0.03, 0.12, fpLong), 1.0, shown);
  float pit = mix(1.0, clamp(1.0 - below / max(2.5 * gape, 0.12), 0.04, 1.0), inGap);
  // Up a standing face the shade is told by height alone: what the ground plan lays on it would hang down it in stripes.
  pit = mix(pit, 0.3 + 0.7 * smoothstep(-0.3, 0.0, vWorld.y), steep);
  // On the feeding floor the hollows are shallow: a top is no paler than the floor's middle tone, a hollow not far under it.
  crease = mix(crease, 1.0, 0.2 * fresh);
  float occ = crease * pit;
  vec3 p = vec3(vWorld.x, max(vWorld.y, 0.02), vWorld.z);
  // A face that stands steep among folds and lobes looks at its neighbour and not at the sky.
  float bare = 1.0 - contactAt(p);
  float open = land.g * bare * occ * mix(mix(0.15, 0.45, broke), 1.0, smoothstep(0.3, 0.95, nShape.y));
  // The lake lies level with the crust: its glow from afar reaches only the faces that are turned toward it.
  float wallFace = 1.0 - smoothstep(0.35, 0.9, nShape.y);
  // The warmth of the melt stays on its banks: the open crust takes the cool sky.
  // Strong within a hand of the lip, gone by three metres, most on the faces turned to the seam, and cut where a foot or a
  // body stands between.
  float off = max(bank, 0.0);
  float byMelt = live * smoothstep(0.05, 0.3, gape) * (0.75 * exp(-off / 0.6) + mix(0.2, 0.3, max(fresh, stringOf(net))) * (1.0 - smoothstep(0.8, 3.0, off)));
  float steepAway = length(vAway);
  vec2 away = steepAway > 0.3 ? vAway / steepAway : vec2(0.0);
  // Which way a face looks is told by its plate and, where it stands, by the wall itself: never by the folds on it, whose
  // flanks would take the fire as a row of stripes.
  vec3 nPlate = normalize(mix(normalize(vec3(-slabSlope.x, 1.0, -slabSlope.y)), normalize(vNormalG), steep));
  float toward = max(-dot(nPlate.xz, away) + 0.65 * dot(lumpSlope, away), 0.0);
  float clear = 1.0 - contactAt(vec3(p.x - 0.8 * away.x, p.y, p.z - 0.8 * away.y));
  vec3 skyLight = skyIrradiance(n) * open;
  vec3 light = lakeIrradianceFar(vec3(p.x, p.y + 1.5, p.z), n) * mix(1.0, occ, 0.5) * (0.12 + 0.6 * wallFace + 0.9 * toward) * mix(0.12, mix(1.6, 0.5, steep) * clear, byMelt) + emitterIrradiance(p, n) * mix(1.0, occ, mix(0.7, 1.0, churn));
  if (shown > 0.5 && live > 0.5) light += meltLight(q, net, bank, below, normalize(mix(nPlate, n, 0.15)), away) * mix(1.0, crease, 0.5) * clear;
  // A seam the walkers have torn open to feed is bare melt and lights its banks for a metre or three; the line is skinned
  // over for most of its width and lights little more than its lip.
  float torn = smoothstep(0.04, 0.07, net.g - 2.0) * (1.0 - step(3.3, net.g));
  // The wash of a wide gap on its banks: the grains that face the fire and the lit air over the melt.
  if (live > 0.5 && gape > 0.03) light += blackbody(meltKelvin(q, net)) * (3.14159 * uCast * mix(0.2, 1.8, torn) * sqrt(gape / (gape + 0.6 * off)) * smoothstep(0.03, 0.15, gape) * (0.16 * (0.9 * exp(-off / 0.3) + 0.1 * (1.0 - smoothstep(0.4, 3.0, off))) + (mix(0.2, 0.7, torn) * toward + 0.06 * wallFace) * (mix(0.92, 0.6, torn) * exp(-off / 0.3) + mix(0.08, 0.4, torn) * (1.0 - smoothstep(0.4, mix(3.0, 7.0, torn), off)))) * min(clear, bare) * mix(1.0, crease, 0.6));
  // The fire of the feeding seams lies low over the lake: of the churned floor it lights the faces that lean toward it.
  float tilt = length(lumpSlope);
  if (tilt > 0.03) light += lakeGlow(p.xz - lumpSlope * (10.0 / tilt), 8.0) * (3.14159 * 2.5 * tilt * bare * mix(1.0, crease, 0.5));
  // The narrow seams, whose heat this sheet draws, light their own lips.
  // Only the faces that look at the seam: the flank of a fold that looks away from it stays dark.
  float facing = steepAway > 0.3 ? smoothstep(0.0, 0.5, -dot(nShape.xz, away)) : 0.5;
  light += gLip * (1.0 - shown * smoothstep(0.12, 0.25, gape)) * (0.1 + 2.0 * wallFace * facing) * crease * clear;
  // The wall of a trench is dark and broken: the melt at its foot lights its lowest third of a metre, and little above.
  // Its faces are broken plate ends, a hand to a forearm across: one looks down at the melt and takes it, the next does not.
  float wallOn = max(steep, shown * (1.0 - smoothstep(-0.03, 0.03, bank)) * smoothstep(0.0, 0.06, vWorld.y - meltLevel(net))) * live * (1.0 - smoothstep(0.1, 0.4, fresh));
  float faceAt = q.x / 0.23 + q.y / 0.31;
  float face = smoothstep(0.35, 0.65, vnoise(vec2(faceAt + 31.0, vWorld.y / 0.1 + 7.0 * floor(faceAt / 2.3))));
  // The grey of the crust at the line is what it shows under the sky. Of the fire it takes what the dark skin took: the
  // plate stays grey and is warm only at the brim.
  vec3 fireTone = mix(vec3(1.0), vec3(0.66, 0.6, 0.59) / vec3(3.2, 2.9, 3.05), coil * (1.0 - coilMound) * (1.0 - fresh));
  fireTone = mix(fireTone, vec3(1.0), max(steep, 0.8 * wallOn));
  light = skyLight + fireTone * light * mix(1.0, (0.1 + 1.4 * exp(-max(vWorld.y - meltLevel(net), 0.0) / 0.25)) * mix(0.12, 1.3, face), wallOn);
  // A broken face is duller and browner than the skin.
  albedo = mix(albedo, vec3(0.042, 0.038, 0.036) * clamp(0.75 + 0.5 * skinD.z + 0.6 * grainA + 0.5 * (skinL.z - 0.5), 0.4, 1.7), max(steep, 0.8 * wallOn));
  vec3 c = albedo * light / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  // A rough face does not turn into a mirror at a grazing angle.
  float satin = 1.0 - smoothstep(0.4, 0.9, rough);
  // The satin of a crest does: seen low, the tops of the cords carry the pale of the sky and the furrows stay black.
  float fresnel = mix(0.012, 0.07, satin) + mix(0.04, 0.55, crest) * satin * pow(1.0 - nv, 3.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  // The crest of a cord carries a pale line of the sky.
  // What the satin gives back is a grey sheen, not a picture of the sky: a broad dim highlight, never blue, never a glint.
  float sheen = fresnel * open * max(smoothstep(0.05, 0.18, v.y), 0.8 * crest * (1.0 - smoothstep(0.004, 0.015, fpS))) * (1.0 - fresh) * (1.0 - wide);
  vec3 mirror = vec3(0.0);
  if (sheen > 2e-4) {
    mirror = lakeMirror(r, rough);
    mirror = mix(mirror, vec3(dot(mirror, vec3(0.3, 0.5, 0.2))), 0.5);
  }
  // A wet patch mirrors the fire beyond it as a streak that runs toward the lens: the melt as the glow map holds it, looked
  // for along the mirrored ray while that is still low over the lake.
  if (wet > 0.01) {
    vec3 rw = reflect(-v, normalize(mix(nShape, n, 0.4)));
    float flat2 = max(length(rw.xz), 1e-3);
    vec2 along = rw.xz / flat2;
    float rise = max(rw.y, 0.03) / flat2;
    vec3 fire = lakeGlow(p.xz + along * 1.0, 0.4) * 0.3 * (1.0 - smoothstep(0.5, 1.2, 1.0 * rise));
    fire += lakeGlow(p.xz + along * 2.5, 0.6) * 0.3 * (1.0 - smoothstep(0.5, 1.2, 2.5 * rise));
    fire += lakeGlow(p.xz + along * 5.0, 1.2) * 0.25 * (1.0 - smoothstep(0.5, 1.2, 5.0 * rise));
    fire += lakeGlow(p.xz + along * 9.0, 2.0) * 0.15 * (1.0 - smoothstep(0.5, 1.2, 9.0 * rise));
    c += fire * (wet * clear * 3.0 * (0.04 + 0.6 * pow(1.0 - max(nv, 0.1), 3.0)) * (1.0 - smoothstep(0.25, 0.6, fpLong)));
  }
  // Over a wet patch at the feeding group stands smoke, not sky.
  // Seen from low over the lake the crust gives back nothing of the sky: it is rough, and a rough face shadows itself.
  c += (1.0 - 0.8 * wet) * sheen * mirror * (1.0 - 0.85 * rubble) * (1.0 + 0.9 * crest);
  // The floor the group feeds on is wet glass: seen low it gives back the grey of the air over the far lake, on its flats
  // and its wet patches, and nothing in its hollows, on its mounds or its rubble.
  float glaze = fresh * (1.0 - steep) * (1.0 - rubble) * (1.0 - mound) * (0.3 + 0.7 * wet) * crease * clear;
  if (glaze > 0.01) {
    vec3 air = lakeMirror(r, 0.45);
    air = mix(air, vec3(dot(air, vec3(0.3, 0.5, 0.2))) * vec3(0.92, 0.98, 1.08), 0.75);
    c += air * (glaze * (0.02 + 0.3 * pow(1.0 - nv, 4.0)));
  }

  // Heat: in a gap the cells hold, only its floor glows, and the floor of a deep one is left dark for the lava's own surface.
  float held = smoothstep(1.0, 2.5, 2.0 * gape / max(cell, 1e-3)) * live;
  float floorOnly = smoothstep(0.55, 0.85, vNormalG.y) * smoothstep(0.01, 0.03, below);
  float melt = shown * smoothstep(0.2, 0.3, gape) * smoothstep(0.0, 0.03, meltLevel(net) + below);
  heat.x *= mix(1.0, floorOnly * (1.0 - melt), held);
  // Nor does the wall of a named seam glow between its foot and its brim: by height alone, so that no edge of it is cut
  // by the facets of the mesh.
  heat.x *= 1.0 - shown * smoothstep(0.03, 0.08, vWorld.y - meltLevel(net)) * smoothstep(0.02, 0.06, below);
  heat.x *= smoothstep(900.0, 1010.0, heat.y) * (1.0 - max(heap, clinker));
  vec3 hot = blackbody(heat.y) * heat.x;
  // Hairline glow: within a few metres of open melt the crust is thin, and in its grooves short cracks show dull red.
  // They fade away from the melt, and none is drawn finer than three pixels: a finer one is drawn that wide and dimmer.
  // None follows a fold: a row of red lines side by side is a pattern, not a crack.
  float beside = net.r - gape;
  // The gaps between slabs: near the seam the group feeds at, and at the brim of the line, some of them show the melt under
  // the crust, dull red; one in three beside a pool is hotter. Away from the melt all are cold. None is lit finer than a pixel holds.
  if (slabGap > 0.3) {
    float lineBrim = shown * live * (1.0 - smoothstep(0.01, 0.05, net.g - 2.0)) * smoothstep(0.2, 0.3, gape);
    float dull = max(1.0 - smoothstep(3.0, 6.0, groupFar(q)), lineBrim * (1.0 - smoothstep(1.0, 2.0, beside)));
    float byPool = max(stringOf(net) * live * smoothstep(0.3, 0.45, gape) * (1.0 - smoothstep(2.0, 4.0, beside)), lineBrim * (1.0 - smoothstep(0.5, 1.0, beside)));
    float some = smoothstep(0.34, 0.48, vnoise(q / 1.9 + 37.0));
    float third = smoothstep(0.52, 0.6, vnoise(q / 2.7 + 5.0));
    float core = smoothstep(0.5, 0.9, slabGap) * (1.0 - smoothstep(0.04, 0.1, fpLong)) * (1.0 - heap) * (1.0 - steep);
    float lit = core * max(dull * some, byPool * third);
    c *= 1.0 - lit;
    hot += blackbody(mix(960.0, 1200.0, byPool * third) + 40.0 * (2.0 * vnoise(q / 0.4 + 3.0) - 1.0)) * lit;
  }
  // The feeding floor is cracked where its slabs meet: along some of their borders, here and not there, the gap is open to the
  // melt, a thread of yellow white a finger or two wide with a dull red lip. No crack is a line of its own: each is the edge of
  // a slab, so it turns where the slab turns and ends where three meet. From afar they are gone.
  float seamOn = fresh * (1.0 - smoothstep(8.0, 34.0, groupFar(q))) * (1.0 - steep) * (1.0 - heap) * (1.0 - slabGap) * (1.0 - smoothstep(0.03, 0.09, fpS));
  if (seamOn > 0.02) {
    float pocket = smoothstep(0.35, 0.75, vnoise(q / 13.0 + 91.0));
    float sown = 0.003 + 0.002 * vnoise(q / 2.1 + 13.0) + 0.006 * pocket;
    float swide = max(sown, 0.3 * fpS);
    float some = smoothstep(0.5, 0.64, 0.7 * vnoise(q / 9.0 + 23.0) + 0.3 * vnoise(q / 2.3 + 61.0)) * seamOn;
    float seam = (1.0 - smoothstep(0.4 * swide, swide, gPourEdge)) * min(1.0, sown / swide) * some;
    // What glows, lights: the crust beside a crack is warm for a hand.
    c += albedo * blackbody(1150.0) * (0.3 * some * (1.0 - seam) * exp(-max(gPourEdge - swide, 0.0) / 0.03));
    c *= 1.0 - seam;
    hot += blackbody(mix(1120.0, 1360.0, pocket * some) + 40.0 * (2.0 * vnoise(q / 0.4 + 3.0) - 1.0)) * seam;
  }
  float nearMelt = live * smoothstep(0.05, 0.25, gape) * (1.0 - smoothstep(0.2, 4.0, beside)) * smoothstep(0.0, 0.06, beside) * (1.0 - rubble) * calm * (1.0 - heat.x);
  if (nearMelt > 0.0) {
    // Where the thin crust has split it is along its own furrows: the deepest of them show the melt, here and not there.
    float split = (1.0 - smoothstep(0.06, 0.2, skinM.z)) * smoothstep(0.45, 0.62, vnoise(q / 1.1 + 59.0)) * (1.0 - smoothstep(0.02, 0.06, fpS));
    float ember = clamp(split * (1.0 - steep) * nearMelt * nearMelt, 0.0, 1.0);
    c *= 1.0 - ember;
    hot += blackbody(1000.0 + 90.0 * nearMelt) * ember;
  }
  // At the lip itself the skin is a hand thick and crazed, and the melt under it shows in the crazing: sparks of orange,
  // most at the brim, none a metre back.
  float lipGlow = crackLine * live * smoothstep(0.05, 0.25, gape) * (1.0 - smoothstep(0.03, 0.45, beside)) * smoothstep(0.0, 0.04, beside) * (1.0 - rubble) * calm * (1.0 - heat.x) * smoothstep(0.56, 0.7, 0.6 * vnoise(q / 0.06 + 43.0) + 0.4 * vnoise(q / 0.31 + 17.0));
  c *= 1.0 - lipGlow;
  hot += blackbody(1120.0 + 220.0 * gritL.z) * lipGlow;
  gl_FragColor = vec4(rigOut(c * (1.0 - heat.x)) + hot * uLava, 1.0);
  // Last, after every derivative is taken. Far off the crust runs on under the rock, which hides it.
  if (land.b > 1.5 + 0.6 * max(far - 150.0, 0.0)) discard;
}`;
}
