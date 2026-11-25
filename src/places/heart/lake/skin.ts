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
vec2 onCrust(vec2 d, vec2 qx, vec2 qy, float det) {
  return vec2(d.x * qy.y - d.y * qx.y, d.y * qx.x - d.x * qy.x) / det;
}

// The photographed skin is read three times, turned against itself, at 4.3 m, 1.4 m and 0.4 m to a repeat: its mips are
// the fade, so each grain goes out as it nears the size of a pixel and nothing is left to shimmer.
const mat2 TURN_A = mat2(0.7986, 0.6018, -0.6018, 0.7986);
const mat2 TURN_B = mat2(0.9397, -0.3420, 0.3420, 0.9397);
const mat2 TURN_C = mat2(-0.2588, 0.9659, -0.9659, -0.2588);

// Coiled rope: within a patch of a metre or two the cords hang as festoons. Each patch has a way it flowed, and its cords
// bow across that way as open arcs (parabolas, so that none can close into a ring), drawn thin on the flanks and bunched
// toward the front, their width led by a slow noise. They end where the next patch laps on them.
// The phase of the arcs, in folds. Beside it: where a point lies along and across its cord, the two axes of that, and
// how far it is from the edge of its patch, in metres.
vec2 gCoilUV = vec2(0.0);
vec2 gCoilU = vec2(1.0, 0.0);
vec2 gCoilV = vec2(0.0, 1.0);
float gCoilEdge = 1.0;
float coilAt(vec2 q) {
  vec2 w = q + 0.3 * vec2(vnoise(q / 0.8 + 71.0) - 0.5, vnoise(q / 0.8 + 113.0) - 0.5);
  vec2 g = w / 2.6;
  vec2 i = floor(g);
  vec2 f = g - i;
  float best = 1e9;
  float next = 1e9;
  vec2 at = vec2(0.0);
  vec2 id = vec2(0.0);
  for (int a = -1; a <= 1; a++) {
    for (int b = -1; b <= 1; b++) {
      vec2 o = vec2(float(a), float(b));
      vec2 r = hash22(i + o);
      vec2 d = o + r - f;
      float l = dot(d, d);
      if (l < best) {
        next = best;
        best = l;
        at = d;
        id = r;
      } else if (l < next) {
        next = l;
      }
    }
  }
  gCoilEdge = 1.3 * (sqrt(next) - sqrt(best));
  float ang = 2.2 + 1.7 * (id.x - 0.5);
  gCoilV = vec2(cos(ang), sin(ang));
  gCoilU = vec2(-gCoilV.y, gCoilV.x);
  vec2 rel = -2.6 * at;
  float across = dot(rel, gCoilU);
  float s = dot(rel, gCoilV) + (0.35 + 0.5 * id.y) * across * across;
  gCoilUV = vec2(across, s) + 7.0 * id;
  float c = clamp(s, -2.0, 2.0);
  float run = s + 0.14 * c * c;
  return run / (0.12 + 0.05 * id.y) + 13.0 * id.x + 1.5 * (vnoise(q / 0.7 + 19.0) - 0.5) + 0.5 * (vnoise(q / 0.31 + 47.0) - 0.5);
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
  float flow = smoothstep(0.43, 0.57, 0.65 * vnoise(q / 4.1 + 17.0) + 0.35 * vnoise(q / 1.4 + 29.0));
  age += 0.4 * (vnoise(q / 11.0 + 17.0) - 0.5);

  vec3 n = normalize(vNormalG);
  // A face that stands (the wall of a trench, the side of a slab) is a fracture: no fold, toe or cord is drawn on it, and
  // the grain is laid on it by its height, so that nothing runs down it in stripes.
  float steep = 1.0 - smoothstep(0.7, 0.85, n.y);
  // Where the plates of a bank lap, the step from one to the next is a crease with a soft shadow, not a fracture face.
  steep *= 1.0 - 0.7 * gOverlap * smoothstep(0.3, 1.0, bank);
  float lean = length(n.xz);
  vec2 qg = q - (steep * vWorld.y * (1.0 - n.y) / max(lean * lean, 1e-3)) * n.xz;
  float fpGrain = max(fpLong, steep * max(abs(dFdx(vWorld.y)), abs(dFdy(vWorld.y))));
  vec2 slope = slabSlope;
  float crease = 1.0;
  // Every drawn line (where a tongue lies on the next, a fold's floor, a cord, a thread) goes into one sum, and the sum is
  // held to a quarter under its surround: the relief is told by the light on it, not by ink.
  float lines = 1.0;
  float foldPhase = 0.0;
  float foldOn = 0.0;
  float foldSpace = 0.3;
  float foldDeep = 0.1;
  float foldCarried = 0.0;
  float ownCoil = 0.0;
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
  // Lobes and cords, as far as a pixel can tell one from the next. Beyond that the skin is a smooth sheet.
  if (fpLong < 0.7) {
    float lobeHigh = lobeAt(q);
    float has = step(1e-4, gLobeTall);
    float detail = 1.0 - smoothstep(0.3, 0.7, fpLong);
    age += 0.1 * (hash12(gLobeId + 5.3) - 0.5) * detail * has;
    // Where the cells are too coarse to carry a lobe, its dome goes into the normal.
    vec2 fall = -3.0 * gLobeTall * gLobeT2 * gLobeT2 * gLobeGrad;
    slope += fall * min(1.0, 1.2 / max(length(fall), 1e-4)) * calm * (1.0 - steep) * smoothstep(0.5, 1.2, cell) * detail * has;
    // Dark where one tongue lies on the next.
    lines = mix(1.0, 0.8 + 0.2 * smoothstep(0.0, 0.03, lobeHigh - gLobeNext), calm * (1.0 - steep) * step(1e-4, gLobeNext) * (1.0 - smoothstep(0.03, 0.2, fpShort)));
    // Past this a pixel is longer than a sheaf and nothing of the folds is left to draw.
    if (fpLong < 0.4) {
      foldAt(q);
      float skinOn = calm * (1.0 - 0.85 * smoothstep(0.15, 0.5, fresh)) * (1.0 - steep) * (1.0 - broken) * smoothstep(0.0, mix(2.5, 0.4, coil * (1.0 - coilMound)), lake) * (1.0 - smoothstep(0.3, 0.4, fpLong));
      // Ropes come in sheaves that end after a third of a metre to two metres, and broad reaches of the skin carry none:
      // the relief lays that mask into the cover of its folds.
      foldOn = gFoldCover * skinOn;
      foldPhase = gFoldPhase;
      foldSpace = gFoldSpace;
      foldDeep = gFoldDeep;
      foldCarried = foldHeld(vAux.x);
      // Where the relief lays no rope on a bank of the line near the lens, the skin coils there all the same, on whole
      // crust and on the tops of its plates: the picture's whole bank is coils. Only as far as a cord is a dozen pixels
      // or more: farther off, even cords side by side are a field of stripes.
      // Not where the relief lays its ropes round the one that sank: they are half a metre and more apart and carry no cords of the skin's.
      float own = coil * (1.0 - gLapRope) * (1.0 - smoothstep(0.25, 0.6, gFoldCover)) * (1.0 - steep) * (1.0 - slabGap) * (1.0 - max(heap, clinker)) * (1.0 - fresh) * smoothstep(0.0, 2.5, lake) * (1.0 - smoothstep(0.004, 0.012, fpLong));
      if (own > foldOn) {
        foldOn = own;
        foldPhase = coilAt(q) + 9.0 * fract(slabId * 7.31);
        foldSpace = 0.145;
        foldDeep = 0.06;
        foldCarried = 0.0;
        ownCoil = own;
      }
      // The toes between the sheaves: what the cells do not carry of their domes, a dark line where one lies on the next,
      // and a tone of its own for each.
      float toe = step(1e-4, gToeBest) * skinOn;
      slope += gToeSlope * (1.0 - toeHeld(vAux.x)) * toe;
      lines *= mix(1.0, 0.8 + 0.2 * smoothstep(0.0, 0.02, gToeBest - gToeNext), toe * step(1e-4, gToeNext) * (1.0 - smoothstep(0.02, 0.1, fpShort)));
      age += 0.16 * (hash12(gToeId + 3.1) - 0.5) * toe;
    }
  }
  // Folds, and the cords on them, four to a fold: each is drawn as long as a pixel is finer than one of it across its run,
  // so that none can beat against the pixels. All run along the lines of equal phase, and the phase is smooth, so its
  // slope is taken from the screen.
  vec2 phaseD = vec2(dFdx(foldPhase), dFdy(foldPhase));
  float per = max(abs(phaseD.x), abs(phaseD.y));
  float turn = 3.14159 * foldPhase;
  float fold = abs(sin(turn));
  // A fold carries one to four cords, by the fold: cords of 3 to 12 cm lie in one sheaf.
  float strands = mix(4.0, (ownCoil > 0.0 ? 1.0 : 2.0) + floor(2.999 * hash12(vec2(floor(foldPhase), 9.1))), step(0.5, coil));
  float cord = abs(sin(strands * turn));
  float waver = vnoise(q / 0.23 + 61.0);
  float seen = 1.0 - smoothstep(0.05, 0.17, per);
  float foldSeen = foldOn * seen;
  // Only a fold as thick as an arm carries cords.
  float cords = foldOn * (1.0 - smoothstep(0.02, 0.05, per)) * max(smoothstep(0.07, 0.16, foldSpace), 0.8 * coil * (1.0 - gLapRope));
  // The slope of a fold where the cells are too coarse to carry it, and of the cords always.
  float foldRise = foldDeep * 0.7 * 3.14159 * pow(max(fold, 0.06), -0.3) * cos(turn) * sign(sin(turn)) * foldSeen * (1.0 - foldCarried);
  foldRise += 0.1 * foldSpace * 4.0 * 3.14159 * cos(strands * turn) * sign(sin(strands * turn)) * cords * (0.4 + 1.2 * waver);
  // A groove is dark by its depth: a deep narrow one sees a fifth of the sky, a shallow one most of it. Where a pixel no
  // longer tells one fold from the next, what is left is the tone of the folded patch, not a row of black dashes.
  // On coiled rope seen close, one furrow in two or three is deep, narrow and nearly black, here and not there along its
  // run: the others stay shallow, so that the furrows are unevenly spaced and never a row of equal stripes.
  float furrowDeep = coil * (1.0 - smoothstep(mix(0.02, 0.03, coilMound), mix(0.05, 0.09, coilMound), per)) * step(mix(0.7, 0.5, coilMound), hash12(vec2(floor(foldPhase + 0.5), 3.7))) * smoothstep(0.3, 0.55, vnoise(q / 0.8 + 83.0));
  float pitDark = mix(mix(0.88, 0.75, smoothstep(0.2, 0.7, foldDeep / foldSpace)), mix(0.55, 0.74, coilMound), furrowDeep);
  // Where one patch of coils laps on the next there is a crease, the deepest line of the bank.
  float lap = ownCoil * (1.0 - smoothstep(0.0, 0.04, gCoilEdge));
  lines *= 1.0 - 0.5 * lap;
  lines *= mix(1.0, mix(mix(pitDark, 1.0, 0.7), pitDark + (1.0 - pitDark) * smoothstep(0.0, mix(0.8, 0.45, furrowDeep), fold), seen), foldOn);
  lines *= mix(1.0, mix(0.85, mix(0.8, 0.9, coilMound), coil) + mix(0.15, mix(0.2, 0.1, coilMound), coil) * smoothstep(0.0, 0.7, cord), cords);
  float crest = 0.6 * cords * pow(cord, 3.0) + (foldSeen - 0.6 * cords) * pow(fold, 3.0);
  float det = qx.x * qy.y - qx.y * qy.x;
  det = abs(det) > 1e-12 ? det : 1e12;

  // The grain of the skin: grit, pits and the scales of a stretched rope, from the photograph.
  // Each reading is skipped where a pixel is too long to hold any of it.
  float lod = log2(max(fpGrain, 1e-5) * 1024.0) - 1.1;
  vec4 ta = vec4(0.5);
  vec4 tb = vec4(0.5);
  vec4 tc = vec4(0.5);
  if (fpGrain < 0.3) tc = mix(textureLod(tRopeNh, TURN_C * qg / 4.3 + 0.61, lod - 2.1), tc, smoothstep(0.18, 0.3, fpGrain));
  // On the skin's own coils the photograph's strands (they run along its u) are laid along the cord, not across it.
  // On the relief's folds at the line the same: the photograph is laid by the fold's phase, drawn out along its run.
  bool along = ownCoil > 0.0;
  vec2 alongUV = gCoilUV;
  vec2 alongU = gCoilU;
  vec2 alongV = gCoilV;
  if (!along && coil > 0.5 && foldOn > 0.0) {
    along = true;
    alongUV = vec2(0.7 * dot(q, vec2(0.8, 0.6)), 0.11 * foldPhase);
    alongV = gFoldDir;
    alongU = vec2(-gFoldDir.y, gFoldDir.x);
  }
  if (fpGrain < 0.09) ta = mix(textureLod(tRopeNh, along ? alongUV / 1.37 : TURN_A * qg / 1.37, lod - 0.45), ta, smoothstep(0.055, 0.09, fpGrain));
  if (fpGrain < 0.03) tb = mix(textureLod(tRopeNh, along ? alongUV / 0.41 + 0.37 : TURN_B * qg / 0.41 + 0.37, lod + 1.29), tb, smoothstep(0.018, 0.03, fpGrain));
  float grainA = ta.b - 0.5;
  float grainB = tb.b - 0.5;
  float grainC = tc.b - 0.5;
  vec2 fine = (tc.rg - 0.5) * TURN_C * 2.4;
  if (along) {
    vec2 both = (ta.rg - 0.5) * 0.4 + (tb.rg - 0.5) * 1.5;
    fine += both.x * alongU + both.y * alongV;
  } else {
    fine += (ta.rg - 0.5) * TURN_A * 2.8 + (tb.rg - 0.5) * TURN_B * 2.4;
  }
  fine *= 1.1;

  // Threads: on every cord lie strands of two to three centimetres that run with the fold, waver, thin out and start again.
  float tturn = 3.14159 * (13.0 * foldPhase + 1.6 * waver);
  float thread = abs(sin(tturn));
  float threads = foldOn * (1.0 - smoothstep(0.006, 0.014, per)) * smoothstep(0.14, 0.28, foldSpace) * clamp(0.5 + 2.2 * grainA + 0.8 * (waver - 0.5), 0.0, 1.0);
  foldRise += 0.65 * foldSpace * cos(tturn) * sign(sin(tturn)) * threads;
  lines *= mix(1.0, 0.82 + 0.18 * smoothstep(0.0, 0.55, thread), threads);
  crease *= max(lines, mix(0.75, mix(0.55, 0.74, coilMound), max(furrowDeep, lap)));
  slope += clamp(onCrust(phaseD, qx, qy, det), -6.0, 6.0) * clamp(foldRise, -0.8, 0.8) * (1.0 - 0.6 * coilMound);
  age = clamp(clamp(age, 0.0, 1.0) * (1.0 - 0.75 * fresh) + (0.4 + 0.25 * fresh) * (flow - 0.5) + 0.5 * grainC * (1.0 - abs(2.0 * flow - 1.0)), 0.0, 1.0) * (1.0 - 0.8 * young);

  // From afar the lake is one dark dry field: the flows and plates differ less, and a rough face seen low shadows itself.
  float wide = smoothstep(30.0, 130.0, far);
  age = mix(age, 0.32, 0.4 * wide);

  // Spall: in patches the glassy skin has flaked off. What shows is paler and rougher and lies a centimetre or two lower,
  // behind a sharp edge. The edge is never drawn finer than a pixel can hold.
  float spall = 0.0;
  if (fpLong < 0.4 && steep < 0.99) {
    float spallAt = 0.6 * vnoise(q / 0.41 + 51.0) + 0.4 * vnoise(q / 0.14 + 7.0) + 0.35 * grainA;
    float spallFrom = mix(0.8, 0.56, smoothstep(0.35, 0.8, vnoise(q / 3.3 + 91.0)) * (0.35 + 0.65 * age));
    spall = smoothstep(spallFrom, spallFrom + max(0.03, 5.0 * fpLong), spallAt) * (1.0 - smoothstep(0.15, 0.4, fpLong)) * (1.0 - steep) * (1.0 - coil * (1.0 - coilMound));
  }
  fine -= clamp(onCrust(vec2(dFdx(spall), dFdy(spall)), qx, qy, det) * 0.016, -1.3, 1.3) * (1.0 - smoothstep(0.03, 0.08, fpLong));
  // The shape decides what a face looks at (its neighbour, the sky, the melt); the grain only turns the light on it.
  vec3 nShape = normalize(n - vec3(slope.x, 0.0, slope.y) * n.y);
  slope += fine;
  n = normalize(n - vec3(slope.x, 0.0, slope.y) * n.y);

  // Ash: pale dust lies in the hollows of the billow, in grooves and pits, and thick on old plates.
  float hollow = 1.0 - smoothstep(0.2, 0.42, vnoise(q / 2.6 + 1.0));
  float low = max(foldSeen * (1.0 - smoothstep(0.15, 0.7, fold)), 1.0 - smoothstep(0.38, 0.52, ta.b));
  float dust = clamp(max(hollow, smoothstep(0.7, 0.95, age)) * mix(0.15, 1.0, low) + 0.5 * spall * hollow, 0.0, 1.0) * (1.0 - young) * (1.0 - fresh) * (1.0 - steep);

  // Pits: the low grains of the skin are holes of one to five centimetres, and a hole is dark unless dust lies in it.
  crease *= 1.0 - mix(1.0, 0.35, coil * foldOn) * (1.0 - 0.8 * coil * (1.0 - coilMound)) * (0.5 * (1.0 - smoothstep(0.3, 0.44, tb.b)) * (1.0 - smoothstep(0.34, 0.5, ta.b) * 0.5) * (1.0 - dust) + 0.3 * (1.0 - smoothstep(0.3, 0.42, ta.b)) * (1.0 - dust));
  // Old skin is grey and rough, young skin black and glassy: by patch, by plate and by lobe. Grain on all of it.
  vec3 albedo = mix(vec3(0.034, 0.035, 0.037), vec3(0.125, 0.126, 0.129), age) * (0.9 + 0.2 * vnoise(q / 3.1 + 13.0));
  // On coiled rope the tone is told by the cords and their furrows: the photographed grain, read three ways, lies on it as a felt.
  float plain = coil * (1.0 - coilMound) * (1.0 - steep);
  albedo *= clamp(1.0 + mix(1.0, 0.06, plain) * mix(1.0, 0.25, coil * foldOn) * 1.8 * grainA + mix(1.0, 0.6, plain) * mix(1.0, 0.25, coil * foldOn) * 1.3 * grainB + mix(1.0, 0.25, plain) * mix(1.0, 0.3, coil * foldOn) * 1.7 * grainC, 0.3, 2.0);
  // The top of a cord is paler than its flank: worn, and dusted.
  albedo *= 1.0 + 0.4 * coil * (1.0 - coilMound) * crest;
  // The banks of the line are dark charcoal brown, not ash.
  albedo *= mix(vec3(1.0), vec3(0.66, 0.6, 0.59), coil * (1.0 - coilMound));
  // Grit: grains and pits of one to three centimetres, the same in every direction, as far as a pixel holds them.
  float gritOn = (1.0 - smoothstep(0.006, 0.014, fpGrain));
  if (gritOn > 0.0) {
    float g1 = vnoise(qg / 0.027 + 3.0);
    float g2 = vnoise(TURN_A * qg / 0.011 + 9.0) * (1.0 - smoothstep(0.003, 0.006, fpGrain));
    float grit = (0.6 * (g1 - 0.5) + 0.4 * (g2 - 0.5)) * gritOn;
    albedo *= 1.0 + mix(0.5, 0.15, plain) * grit;
    crease *= 1.0 - mix(0.35, 0.1, plain) * gritOn * (1.0 - smoothstep(0.22, 0.38, g1));
    slope -= clamp(onCrust(vec2(dFdx(grit), dFdy(grit)), qx, qy, det) * 0.012, -0.7, 0.7);
  }
  albedo *= mix(vec3(1.0), vec3(0.86, 0.8, 0.77), wide);
  albedo = mix(albedo, vec3(0.07, 0.065, 0.062) * (0.55 + 1.1 * tb.b + 0.6 * grainA), 0.85 * spall);
  albedo = mix(albedo, vec3(0.1, 0.095, 0.092), 0.4 * dust);
  // The floor the group feeds on is dark, with low mounds of grey ash and rubble a metre or three across, and wet patches.
  float mound = 0.0;
  float wet = 0.0;
  albedo *= (1.0 + 0.5 * fresh) * lumpTone * slabTone;
  if (fresh > 0.01) {
    mound = fresh * smoothstep(0.6, 0.72, 0.7 * vnoise(q / 2.1 + 47.0) + 0.3 * vnoise(q / 0.7 + 3.0));
    wet = fresh * (1.0 - flow) * (1.0 - mound) * (1.0 - steep) * (1.0 - rubble) * (1.0 - spall) * smoothstep(0.58, 0.68, 0.7 * vnoise(q / 2.3 + 77.0) + 0.3 * vnoise(q / 0.6 + 19.0));
  }
  albedo = mix(albedo, vec3(0.062, 0.06, 0.059) * (0.7 + 1.2 * tb.b - 0.3), 0.8 * mound);
  // That floor is warm dark basalt and nothing on it is pale: its brights are the fire's, not ash on the tops of plates.
  albedo *= mix(vec3(1.0), vec3(1.08, 0.99, 0.92), fresh) * mix(1.0, min(1.0, 0.115 / max(dot(albedo, vec3(0.3, 0.5, 0.2)), 1e-3)), fresh);
  // Satin only where fresh glass faces the sky, on the tops of ropes: everything else is dead matte.
  float glass = (1.0 - steep) * (1.0 - smoothstep(0.3, 0.6, age)) * (1.0 - spall) * (1.0 - dust) * (1.0 - rubble) * mix(mix(0.5, 0.0, smoothstep(0.08, 0.35, fpLong)), smoothstep(0.45, 0.9, fold), foldSeen) * smoothstep(0.42, 0.56, tb.b + 0.5 * grainA + 0.5);
  // A coiled cord carries a satin line along its top.
  glass = max(glass, coil * (1.0 - coilMound) * crest * (1.0 - spall) * (1.0 - 0.6 * dust) * (1.0 - rubble));
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
  float open = land.g * (1.0 - contactAt(p)) * occ * mix(mix(0.15, 0.45, broke), 1.0, smoothstep(0.3, 0.95, nShape.y));
  // The lake lies level with the crust: its glow from afar reaches only the faces that are turned toward it.
  float wallFace = 1.0 - smoothstep(0.35, 0.9, nShape.y);
  // The warmth of the melt stays on its banks: the open crust takes the cool sky.
  // Strong within a hand of the lip, gone by three metres, most on the faces turned to the seam, and cut where a foot or a
  // body stands between.
  float off = max(bank, 0.0);
  float byMelt = live * smoothstep(0.05, 0.3, gape) * (0.75 * exp(-off / 0.3) + mix(0.08, 0.25, max(fresh, stringOf(net))) * (1.0 - smoothstep(0.4, 3.0, off)));
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
  if (live > 0.5 && gape > 0.03) light += blackbody(meltKelvin(q, net)) * (3.14159 * uCast * mix(0.2, 1.8, torn) * sqrt(gape / (gape + 0.6 * off)) * smoothstep(0.03, 0.15, gape) * (0.16 * (0.9 * exp(-off / 0.3) + 0.1 * (1.0 - smoothstep(0.4, 3.0, off))) + (mix(0.2, 0.7, torn) * toward + 0.06 * wallFace) * (mix(0.92, 0.6, torn) * exp(-off / 0.3) + mix(0.08, 0.4, torn) * (1.0 - smoothstep(0.4, mix(3.0, 7.0, torn), off)))) * clear * mix(1.0, crease, 0.6));
  // The fire of the feeding seams lies low over the lake: of the churned floor it lights the faces that lean toward it.
  float tilt = length(lumpSlope);
  if (tilt > 0.03) light += lakeGlow(p.xz - lumpSlope * (10.0 / tilt), 8.0) * (3.14159 * 2.5 * tilt * (1.0 - contactAt(p)) * mix(1.0, crease, 0.5));
  // The narrow seams, whose heat this sheet draws, light their own lips.
  // Only the faces that look at the seam: the flank of a fold that looks away from it stays dark.
  float facing = steepAway > 0.3 ? smoothstep(0.0, 0.5, -dot(nShape.xz, away)) : 0.5;
  light += gLip * (1.0 - shown * smoothstep(0.12, 0.25, gape)) * (0.1 + 2.0 * wallFace * facing) * crease * clear;
  // The wall of a trench is dark and broken: the melt at its foot lights its lowest third of a metre, and little above.
  // Its faces are broken plate ends, a hand to a forearm across: one looks down at the melt and takes it, the next does not.
  float wallOn = max(steep, shown * (1.0 - smoothstep(-0.03, 0.03, bank)) * smoothstep(0.0, 0.06, vWorld.y - meltLevel(net))) * live * (1.0 - smoothstep(0.1, 0.4, fresh));
  float faceAt = q.x / 0.23 + q.y / 0.31;
  float face = smoothstep(0.35, 0.65, vnoise(vec2(faceAt + 31.0, vWorld.y / 0.1 + 7.0 * floor(faceAt / 2.3))));
  light = skyLight + light * mix(1.0, (0.1 + 1.4 * exp(-max(vWorld.y - meltLevel(net), 0.0) / 0.25)) * mix(0.12, 1.3, face), wallOn);
  // A broken face is duller and browner than the skin.
  albedo = mix(albedo, vec3(0.042, 0.038, 0.036) * clamp(0.75 + 0.5 * tb.b + 0.6 * grainA + 0.5 * grainC, 0.4, 1.7), max(steep, 0.8 * wallOn));
  vec3 c = albedo * light / 3.14159;
  // A cord's flank turned edge on would glint, one pixel wide.
  float nv = clamp(dot(n, v), 0.35 * foldSeen, 1.0);
  // A rough face does not turn into a mirror at a grazing angle.
  float satin = 1.0 - smoothstep(0.4, 0.9, rough);
  float fresnel = mix(0.012, 0.07, satin) + 0.04 * satin * pow(1.0 - nv, 3.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  // The crest of a cord carries a pale line of the sky.
  // What the satin gives back is a grey sheen, not a picture of the sky: a broad dim highlight, never blue, never a glint.
  float sheen = fresnel * open * smoothstep(0.05, 0.18, v.y) * (1.0 - fresh) * (1.0 - wide);
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
    float dull = max(1.0 - smoothstep(5.0, 12.0, groupFar(q)), lineBrim * (1.0 - smoothstep(1.0, 2.0, beside)));
    float byPool = max(stringOf(net) * live * smoothstep(0.3, 0.45, gape) * (1.0 - smoothstep(2.0, 4.0, beside)), lineBrim * (1.0 - smoothstep(0.5, 1.0, beside)));
    float some = smoothstep(0.34, 0.48, vnoise(q / 1.9 + 37.0));
    float third = smoothstep(0.52, 0.6, vnoise(q / 2.7 + 5.0));
    float core = smoothstep(0.5, 0.9, slabGap) * (1.0 - smoothstep(0.04, 0.1, fpLong)) * (1.0 - heap) * (1.0 - steep);
    float lit = core * max(dull * some, byPool * third);
    c *= 1.0 - lit;
    hot += blackbody(mix(960.0, 1200.0, byPool * third) + 40.0 * (2.0 * vnoise(q / 0.4 + 3.0) - 1.0)) * lit;
  }
  // The feeding floor is threaded with fine hot seams of its own, where the form has shut the gaps: crooked lines three
  // to six metres apart, here and not there, thickest near the seam the group feeds at. None is drawn finer than two and
  // a half pixels: a finer one is drawn that wide and dimmer. A stretch in five is a pocket of open melt, wider and hotter.
  float seamOn = fresh * (1.0 - smoothstep(8.0, 48.0, groupFar(q))) * (1.0 - steep) * (1.0 - heap) * (1.0 - slabGap);
  if (seamOn > 0.02) {
    vec2 sq = q / 3.3 + 71.0;
    float sf = 0.65 * vnoise(sq) + 0.35 * vnoise(TURN_A * sq * 2.3 + 11.0);
    vec2 sg = vec2(0.65 * vnoise(sq + vec2(0.1, 0.0)) + 0.35 * vnoise(TURN_A * (sq + vec2(0.1, 0.0)) * 2.3 + 11.0) - sf, 0.65 * vnoise(sq + vec2(0.0, 0.1)) + 0.35 * vnoise(TURN_A * (sq + vec2(0.0, 0.1)) * 2.3 + 11.0) - sf) / 0.1;
    float sl = max(length(sg), 0.3);
    float sd = abs(sf - 0.5) / sl * 3.3;
    vec2 sn = sg / sl;
    float sfoot = max(abs(dot(qx, sn)), abs(dot(qy, sn)));
    float pocket = smoothstep(0.66, 0.74, vnoise(q / 2.3 + 91.0));
    float sown = 0.025 + 0.04 * vnoise(q / 0.7 + 13.0) + 0.12 * pocket;
    float swide = max(sown, 1.25 * sfoot);
    float some = smoothstep(0.36, 0.5, vnoise(q / 7.9 + 23.0)) * seamOn;
    float seam = (1.0 - smoothstep(0.45 * swide, swide, sd)) * sqrt(min(1.0, sown / swide)) * some;
    // What glows, lights: the crust beside a seam is warm for a hand or two.
    c += albedo * blackbody(1100.0) * (0.5 * some * (1.0 - seam) * exp(-max(sd - swide, 0.0) / (0.12 + 2.0 * sfoot)));
    c *= 1.0 - seam;
    hot += blackbody(mix(960.0, 1200.0, pocket) + 40.0 * (2.0 * vnoise(q / 0.4 + 3.0) - 1.0)) * seam;
  }
  float nearMelt = live * smoothstep(0.05, 0.25, gape) * (1.0 - smoothstep(0.2, 4.0, beside)) * smoothstep(0.0, 0.06, beside) * (1.0 - rubble) * calm * (1.0 - heat.x);
  if (nearMelt > 0.0) {
    // Cracks where the thin crust has split: crooked, a hand wide, half a metre to two metres long.
    vec2 cq = q / 0.8 + 43.0;
    float cf = vnoise(cq);
    vec2 cg = vec2(vnoise(cq + vec2(0.12, 0.0)) - cf, vnoise(cq + vec2(0.0, 0.12)) - cf) / 0.12;
    float cl = max(length(cg), 0.25);
    float cd = abs(cf - 0.5) / cl * 0.8;
    vec2 cn = cg / cl;
    float cfoot = max(abs(dot(qx, cn)), abs(dot(qy, cn)));
    float cwide = max(0.035 * (0.4 + vnoise(q / 0.6 + 97.0)), 1.5 * cfoot);
    float split = (1.0 - smoothstep(0.35 * cwide, cwide, cd)) * min(1.0, 0.045 / cwide) * smoothstep(0.5, 0.62, vnoise(q / 1.1 + 59.0));
    float ember = clamp(split * (1.0 - steep) * nearMelt * nearMelt, 0.0, 1.0);
    c *= 1.0 - ember;
    hot += blackbody(1000.0 + 90.0 * nearMelt) * ember;
  }
  gl_FragColor = vec4(rigOut(c * (1.0 - heat.x)) + hot * uLava, 1.0);
  // Last, after every derivative is taken. Far off the crust runs on under the rock, which hides it.
  if (land.b > 1.5 + 0.6 * max(far - 150.0, 0.0)) discard;
}`;
}
