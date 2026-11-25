// The skin of the crust: its fragment shader. What the surface looks like below the scale of a fold.
// The relief (index.ts) hands it the fold, the plate and the normal; the heat (heat.ts) hands it the melt.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
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
}
