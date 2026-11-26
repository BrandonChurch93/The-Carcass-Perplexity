// The surfaces of the Spine's land: rock and snow in one shader, read by world position so that the ridge, the spires and the mouth of the canal are one body.
import { CANAL_L, EXIT, EXIT_FLARE, EXIT_R, FLARE, MOUTH_R, MOUTH_S, THROAT, first, frameAt } from '../ridge';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const LAND_VERTEX = /* glsl */ `
attribute float aTop;
attribute vec2 aSL;
attribute float aRelief;
attribute vec3 aUp;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTop;
varying vec2 vSL;
varying float vRelief;
varying vec3 vUp;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vTop = aTop;
  vSL = aSL;
  vRelief = aRelief;
  vUp = aUp;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// uKind: 0 the ground, 1 a spire or the rock over the mouth, 2 the inside of the canal.
const LAND_PRELUDE = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTop;
varying vec2 vSL;
varying float vRelief;
varying vec3 vUp;
uniform sampler2D tSpire;
uniform sampler2D tSpireNh;
uniform sampler2D tRubble;
uniform sampler2D tRubbleNh;
uniform sampler2D tSnow;
uniform sampler2D tSnowNh;
uniform sampler2D tCanal;
uniform sampler2D tCanalNh;
uniform sampler2D tScorch;
uniform sampler2D tScorchH;
uniform vec4 uScorch;
uniform vec4 uScorchAxes;
uniform sampler2D tSheet;
uniform sampler2D tSheetH;
uniform vec4 uSheet;
uniform vec4 uSheetMap;
uniform float uSheetDepth;
uniform float uSheetShear;
uniform float uKind;
${RIG_GLSL}
${NOISE_GLSL}

const float MOUTH_S = ${MOUTH_S.toFixed(3)};
const float CANAL_L = ${CANAL_L.toFixed(3)};
const float TRAIL_FROM = ${(first.s - 660).toFixed(3)};
const vec3 SPIRE_MEAN = vec3(0.232, 0.201, 0.191);
const vec3 RUBBLE_MEAN = vec3(0.288, 0.299, 0.345);
const vec3 CANAL_MEAN = vec3(0.288, 0.276, 0.289);
const vec3 SNOW_MEAN = vec3(0.33, 0.372, 0.456);
const vec3 CANAL_ALONG = vec3(${frameAt(first.s).tx.toFixed(4)}, 0.0, ${frameAt(first.s).tz.toFixed(4)});

const float EXIT = ${EXIT.toFixed(3)};
// The canal of the layout (ridge.ts): its radius d metres in from the near mouth, and the l of its axis.
float flareAt(float d) {
  if (d <= 0.0) return ${MOUTH_R.toFixed(1)};
  if (d < ${FLARE.toFixed(1)}) return ${THROAT.toFixed(1)} + ${(MOUTH_R - THROAT).toFixed(1)} * pow(1.0 - d / ${FLARE.toFixed(1)}, 1.6);
  float e = EXIT - d;
  if (e <= 0.0) return ${EXIT_R.toFixed(1)};
  if (e < ${EXIT_FLARE.toFixed(1)}) return ${THROAT.toFixed(1)} + ${(EXIT_R - THROAT).toFixed(1)} * pow(1.0 - e / ${EXIT_FLARE.toFixed(1)}, 1.6);
  return ${THROAT.toFixed(1)};
}
float canalAt(float d) {
  float k = max(0.0, min(d, EXIT + 40.0) - 140.0);
  return CANAL_L + 0.0025 * k * k;
}

// The trail of the layout (anchors.ts): l at s.
float trailAt(float s) {
  float k = clamp((s - MOUTH_S + 160.0) / 150.0, 0.0, 1.0);
  return 2.2 * sin(s / 31.0) * (1.0 - k) + CANAL_L * k * k;
}

// The prints of the runners: two rows of pits along the trail, each with a raised rim of thrown snow. x is depth (-1 pit, +1 rim), yz its slope.
vec3 prints(vec2 sl) {
  float across = sl.y - trailAt(sl.x);
  if (abs(across) > 1.4 || sl.x < TRAIL_FROM || sl.x > MOUTH_S + 6.0) return vec3(0.0);
  float stride = 1.34;
  float row = floor(sl.x / stride);
  float side = mod(row, 2.0) < 0.5 ? -0.28 : 0.28;
  vec2 j = hash22(vec2(row, 3.7)) - 0.5;
  vec2 q = vec2(sl.x - (row + 0.5 + 0.3 * j.x) * stride, across - side - 0.12 * j.y);
  float r = length(q * vec2(1.0, 1.35)) / 0.27;
  float pit = smoothstep(1.0, 0.55, r);
  float rim = smoothstep(1.7, 1.15, r) * smoothstep(0.85, 1.15, r);
  vec2 slope = normalize(q + 1e-4) * (smoothstep(0.5, 1.0, r) * smoothstep(1.25, 1.0, r) * 1.4 - rim * 0.5);
  return vec3(rim * 0.6 - pit, slope);
}

`;

// The land is drawn twice: first its depth alone, with the mouths of the canal cut out of the ground, then its colour only where it is the
// nearest thing. The colour is dear and a software renderer shades every fragment it is given, so nothing hidden is shaded.
export const LAND_DEPTH_FRAGMENT = /* glsl */ `${LAND_PRELUDE}
void main() {
  // The mouths of the canal: the rock wall over each stands across it, and is open where the canal passes through.
  float dCanal = vSL.x - MOUTH_S;
  // Staged by shot: the far end of the canal is open only for the shot inside it (uUnder is staged up there). From outside the blade's back is whole, so nothing bright shows down the canal.
  if (uKind < 1.5 && dCanal > (uKind > 0.5 ? -42.0 : -1.0) && dCanal < EXIT + (uKind > 0.5 ? 42.0 : 1.0) && vWorld.y > CANAL_FLOOR - 0.2 && (uUnder > 1.5 || dCanal < 0.5 * EXIT)) {
    float r = flareAt(dCanal);
    // The opening is broken rock, not a drawn circle: its edge stands in and out with the beds. The near mouth is a low arch, broader than it is high.
    vec2 across = vec2(vSL.y - canalAt(dCanal), vWorld.y - (CANAL_FLOOR + 0.62 * r));
    float turn = atan(across.y, across.x);
    float ragged = 0.72 + 0.26 * vnoise(vec2(turn * 2.3 + 5.0, 0.7)) + 0.12 * (vnoise(vec2(turn * 8.0 + 1.0, 2.9)) - 0.5) - 0.1 * vnoise(vec2(vWorld.y * 0.9, vSL.y * 0.9));
    float low = dCanal < 0.5 * EXIT ? 1.0 + 0.75 * smoothstep(-0.2, 0.7, across.y / r) : 1.0 + 0.25 * smoothstep(0.0, 1.0, across.y / r);
    if (length(across * vec2(1.0, low)) < (r - 0.8) * ragged) discard;
  }
  gl_FragColor = vec4(rigOut(vec3(0.0)), 1.0);
}`;

export const LAND_FRAGMENT = /* glsl */ `${LAND_PRELUDE}
// A picture laid on a face at one size in metres, with the slopes of its height map. The gradients are given, so that a lookup may stand in a branch.
struct Lay { vec3 c; vec2 t; float pit; };
Lay lay(sampler2D colour, sampler2D nh, vec2 at, vec2 gx, vec2 gy) {
  vec3 k = textureGrad(nh, at, gx, gy).rgb;
  return Lay(textureGrad(colour, at, gx, gy).rgb, (k.rg - 0.5) * vec2(1.0, -1.0), k.b);
}

void main() {
  float dCanal = vSL.x - MOUTH_S;
  vec3 smoothN = normalize(vNormal);
  if (!gl_FrontFacing) smoothN = -smoothN;
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  vec3 v = toCamera / far;
  bool spire = uKind > 0.5 && uKind < 1.5;
  // The rock over the canal is the spire's own face, carried by the ground.
  float porch = uKind < 0.5 && dCanal > 0.0 && dCanal < EXIT ? 1.0 - smoothstep(4.0, 26.0, abs(vSL.y - canalAt(dCanal)) - flareAt(dCanal)) : 0.0;
  bool plates = spire || porch > 0.5;
  bool inside = uKind > 1.5;
  // Broken rock is flat faces that meet in edges: a little of the face of the triangle itself with the round of the mesh.
  vec3 facet = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(facet, smoothN) < 0.0) facet = -facet;
  vec3 n0 = inside ? smoothN : normalize(mix(smoothN, facet, spire ? 0.35 : 0.15 + 0.3 * clamp(vTop, 0.0, 1.0)));

  // The rock is read from the material pictures of the place, each at one size in metres whatever way the face looks: a picture is laid
  // on the two upright planes it can lie flat on and on the level one, and each face takes them by how squarely it looks at each. Nothing
  // is laid on a plane the face is edge on to, so nothing is pulled long.
  vec3 up = normalize(vUp);
  vec3 bx = spire ? normalize(vec3(up.z, 0.0, -up.x)) : vec3(0.0, 0.0, 1.0);
  vec3 ax = spire ? cross(bx, up) : vec3(1.0, 0.0, 0.0);
  // Along the beds (up the lean), and the two ways across them.
  float pu = dot(vWorld, up);
  float pa = dot(vWorld, ax);
  float pb = dot(vWorld, bx);
  vec3 w = vec3(dot(n0, ax), n0.y, dot(n0, bx));
  w *= w;
  float top = spire ? smoothstep(0.55, 0.8, w.y) : inside ? 0.0 : smoothstep(0.4, 0.75, w.y);
  float wa = w.x * w.x / max(w.x * w.x + w.z * w.z, 1e-5);
  float close = smoothstep(420.0, 60.0, far);
  vec3 rock = vec3(0.0);
  vec2 t = vec2(0.0);
  float pit = 0.5;
  // What the lays below would be spent on unseen: ground the snow buries whole, and a spire's broad face where its sheet covers it.
  // The gale strips the flanks to ribs of dark rock that run down the fall, and leaves the snow in the lee of each.
  float steep = smoothstep(0.96, 0.8, smoothN.y);
  float rib = uKind < 0.5 ? steep * (smoothstep(0.42, 0.7, vnoise(vec2(vSL.x / 17.0, vSL.y / 120.0 + 3.0)) + 0.25 * (vnoise(vWorld.xz * 0.21) - 0.5)) * 0.8 - 0.55 * dot(n0.xz, uWind.xz) * smoothstep(0.0, 1.0, -dot(n0.xz, uWind.xz) * 3.0)) : 0.0;
  float lie0 = mix(smoothN.y, n0.y, 0.35) - 0.07 + 0.12 * dot(n0.xz, uWind.xz) + 0.16 * (vnoise(vWorld.xz * 0.09) - 0.5) - rib;
  bool buried = uKind < 0.5 && porch <= 0.0 && lie0 - 0.42 * clamp(vTop, 0.0, 1.0) > 0.57;
  vec3 sheetAx = vec3(uSheet.z, 0.0, uSheet.w);
  vec2 sheetUv = vec2((dot(vWorld.xz - uSheet.xy, uSheet.zw) + uSheetShear * vWorld.y) * uSheetMap.x + uSheetMap.y, vWorld.y * uSheetMap.z + uSheetMap.w);
  vec3 sheetC = vec3(0.0);
  float sheet = 0.0;
  if (!inside && (spire || porch > 0.0)) {
    sheetC = texture2D(tSheet, sheetUv).rgb;
    float facing = abs(dot(smoothN, vec3(-sheetAx.z, 0.0, sheetAx.x)));
    sheet = smoothstep(0.035, 0.1, max(sheetC.r, max(sheetC.g, sheetC.b))) * smoothstep(0.12, 0.35, facing) * smoothstep(0.0, 0.06, sheetUv.y) * (spire ? 1.0 : porch);
  }
  bool covered = spire && sheet > 0.98 && top < 0.001;
  vec3 across = normalize(mix(ax, bx, step(0.5, wa)));
  vec3 upAlong = up;
  if (inside) {
    float r = flareAt(dCanal);
    vec2 axis = vec2(vSL.y - canalAt(dCanal), vWorld.y - (CANAL_FLOOR + 0.62 * r));
    // The rock of the canal by world position on three planes, at the picture's one real size (4 m): nothing is laid along or round the tube.
    vec3 tw = pow(abs(n0), vec3(4.0));
    tw /= tw.x + tw.y + tw.z;
    vec2 pX = vWorld.zy / 4.0;
    vec2 pY = vWorld.xz / 4.0 + 0.31;
    vec2 pZ = vWorld.xy / 4.0 + 0.67;
    vec3 c1 = texture2D(tCanal, pX).rgb * tw.x + texture2D(tCanal, pY).rgb * tw.y + texture2D(tCanal, pZ).rgb * tw.z;
    vec3 n1 = texture2D(tCanalNh, pX).rgb * tw.x + texture2D(tCanalNh, pY).rgb * tw.y + texture2D(tCanalNh, pZ).rgb * tw.z;
    // Slabs: the same rock again at five times the size, turned, to break the wall into blocks larger than the picture.
    vec2 qX = vec2(vWorld.z + 0.35 * vWorld.y, vWorld.y - 0.35 * vWorld.z) / 19.0 + 0.13;
    vec2 qZ = vec2(vWorld.x + 0.35 * vWorld.y, vWorld.y - 0.35 * vWorld.x) / 19.0 + 0.53;
    vec3 n2 = texture2D(tCanalNh, qX).rgb * tw.x + texture2D(tCanalNh, pY * 0.21).rgb * tw.y + texture2D(tCanalNh, qZ).rgb * tw.z;
    rock = c1 * (0.55 + 0.9 * n2.b) * 1.2;
    t = ((n1.rg - 0.5) * 1.3 + (n2.rg - 0.5) * 1.6) * vec2(1.0, -1.0);
    pit = 0.55 * n1.b + 0.45 * n2.b;
    upAlong = tw.y > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    across = tw.x > max(tw.y, tw.z) ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  } else if (buried) {
    rock = RUBBLE_MEAN * 1.5;
  } else if (covered) {
    // Under the sheet only the grain of the tile shows, at its fine size, on the plane the face looks along.
    vec2 atG = (wa > 0.5 ? vec2(pb, pu) : vec2(pa, pu) + 4.1) / 8.3;
    Lay f = lay(tSpire, tSpireNh, atG, dFdx(atG), dFdy(atG));
    rock = f.c * 2.7;
    t = 1.3 * f.t;
    pit = 0.25 + 0.5 * f.pit;
  } else {
    vec3 side = vec3(0.0);
    vec3 level = vec3(0.0);
    vec2 tSide = vec2(0.0);
    vec2 tLevel = vec2(0.0);
    float pSide = 0.5;
    float pLevel = 0.5;
    // The two upright lays: one on the plane across ax, one on the plane across bx.
    vec2 atA = vec2(pb, pu);
    vec2 atB = vec2(pa, pu);
    vec2 gAx = dFdx(atA);
    vec2 gAy = dFdy(atA);
    vec2 gBx = dFdx(atB);
    vec2 gBy = dFdy(atB);
    vec2 atL = vec2(dot(vWorld.xz, vec2(0.82, 0.57)), dot(vWorld.xz, vec2(-0.57, 0.82)));
    vec2 gLx = dFdx(atL);
    vec2 gLy = dFdy(atL);
    if (top < 0.999) {
      float sum = 0.0;
      if (plates) {
        if (wa > 0.03) {
          Lay a = lay(tSpire, tSpireNh, atA / 30.0, gAx / 30.0, gAy / 30.0);
          vec3 c2 = textureGrad(tSpire, atA / 103.0 + 0.37, gAx / 103.0, gAy / 103.0).rgb;
          side += wa * a.c * (0.4 + 0.6 * c2 / SPIRE_MEAN);
          tSide += wa * a.t * 1.2;
          pSide = a.pit;
          if (close > 0.0) {
            Lay f = lay(tSpire, tSpireNh, atA / 8.3 + 0.13, gAx / 8.3, gAy / 8.3);
            side += wa * a.c * (0.4 + 0.6 * c2 / SPIRE_MEAN) * (f.c / SPIRE_MEAN - 1.0) * 0.6 * close;
            tSide += wa * close * 1.1 * f.t;
            pSide = mix(pSide, pSide * (0.5 + f.pit), close);
          }
          sum += wa;
        }
        if (wa < 0.97) {
          float wb = 1.0 - wa;
          Lay a = lay(tSpire, tSpireNh, atB / 30.0 + 0.5, gBx / 30.0, gBy / 30.0);
          vec3 c2 = textureGrad(tSpire, atB / 103.0 + 0.71, gBx / 103.0, gBy / 103.0).rgb;
          side += wb * a.c * (0.4 + 0.6 * c2 / SPIRE_MEAN);
          tSide += wb * a.t * 1.2;
          pSide = mix(a.pit, pSide, wa);
          if (close > 0.0) {
            Lay f = lay(tSpire, tSpireNh, atB / 8.3 + 0.63, gBx / 8.3, gBy / 8.3);
            side += wb * a.c * (0.4 + 0.6 * c2 / SPIRE_MEAN) * (f.c / SPIRE_MEAN - 1.0) * 0.6 * close;
            tSide += wb * close * 1.1 * f.t;
            pSide = mix(pSide, pSide * (0.5 + f.pit), close * wb);
          }
        }
        side *= 2.7;
      } else {
        // The ground's own cliffs are broken rock, not jointed plates: the picture of blocks half in snow, which has no grain.
        if (wa > 0.03) {
          Lay a = lay(tRubble, tRubbleNh, atA / 23.0, gAx / 23.0, gAy / 23.0);
          vec3 c2 = textureGrad(tRubble, atA.yx / 67.0 + 0.37, gAx.yx / 67.0, gAy.yx / 67.0).rgb;
          side += wa * a.c * (0.45 + 0.55 * c2 / RUBBLE_MEAN);
          tSide += wa * a.t * 1.2;
          pSide = a.pit;
        }
        if (wa < 0.97) {
          float wb = 1.0 - wa;
          Lay a = lay(tRubble, tRubbleNh, atB / 23.0 + 0.5, gBx / 23.0, gBy / 23.0);
          vec3 c2 = textureGrad(tRubble, atB.yx / 67.0 + 0.71, gBx.yx / 67.0, gBy.yx / 67.0).rgb;
          side += wb * a.c * (0.45 + 0.55 * c2 / RUBBLE_MEAN);
          tSide += wb * a.t * 1.2;
          pSide = mix(a.pit, pSide, wa);
        }
        side *= 1.5;
      }
    }
    if (top > 0.001) {
      Lay a = lay(tRubble, tRubbleNh, atL / 19.0, gLx / 19.0, gLy / 19.0);
      level = a.c;
      tLevel = a.t * 1.2;
      pLevel = a.pit;
      if (close > 0.0) {
        Lay f = lay(tRubble, tRubbleNh, atL / 5.0 + 0.21, gLx / 5.0, gLy / 5.0);
        level = mix(level, 0.5 * level + 0.5 * f.c, 0.8 * close);
        tLevel += close * 1.1 * f.t;
        pLevel = mix(pLevel, 0.5 * pLevel + 0.5 * f.pit, close);
      }
      level *= 1.5;
    }
    rock = mix(side, level, top);
    t = mix(tSide, tLevel, top);
    pit = mix(pSide, pLevel, top);
  }
  vec3 nRock = normalize(n0 + mix(across * t.x + upAlong * t.y, vec3(t.x, 0.0, t.y), top));
  // A spire is cut from its feature sheet: the sheet lies on its two broad faces, square on, and gives them their rock, their joints and
  // their snow, whole, at the size of the spire. The tiles stay under it as its grain, and take over on the thin ends where the sheet
  // would be seen edge on. The rock over the mouth takes the first spire's sheet too, so the mouth stands in one face.
  {
    vec3 sa = sheetAx;
    vec2 uv = sheetUv;
    vec3 sc = sheetC;
    if (sheet > 0.0) {
      vec2 px = 3.0 / vec2(textureSize(tSheetH, 0));
      float h0 = texture2D(tSheetH, uv).r;
      float da = (texture2D(tSheetH, uv + vec2(px.x, 0.0)).r - h0) / px.x * uSheetMap.x;
      float dy = (texture2D(tSheetH, uv + vec2(0.0, px.y)).r - h0) / px.y * uSheetMap.z;
      float grain = dot(rock, vec3(0.33)) / (2.7 * dot(SPIRE_MEAN, vec3(0.33)));
      rock = mix(rock, sc * 1.5 * (0.8 + 0.2 * grain), sheet);
      nRock = normalize(mix(nRock, normalize(n0 + 0.35 * (across * t.x + upAlong * t.y)), sheet) - sheet * uSheetDepth * 0.3 * (sa * da + vec3(0.0, dy, 0.0)));
      pit = mix(pit, 0.25 + 0.6 * h0, 0.6 * sheet);
    }
  }

  // Colour: the picture's own, broken by the beds of the rock in broad masses.
  float bed = vnoise(vec2(dot(vWorld, vec3(0.011, 0.034, 0.017)), dot(vWorld.xz, vec2(0.004, -0.003))) * 3.0);
  float blotch = vnoise(vWorld.xz * 0.021 + vWorld.y * 0.013);
  vec3 tone = mix(vec3(0.82, 0.79, 0.78), vec3(1.06, 1.0, 0.93), smoothstep(0.3, 0.7, 0.6 * bed + 0.4 * blotch));
  // The plates of a spire are grey rock: their picture's brown is taken half out, and the sheet keeps its own colour.
  if (plates) rock = mix(rock, vec3(dot(rock, vec3(0.3, 0.5, 0.2))) * vec3(0.96, 0.98, 1.06), 0.55 * (1.0 - sheet));
  tone = mix(tone, vec3(1.0), sheet);
  vec3 albedo = min(rock * (inside ? vec3(1.0) : tone), vec3(0.9));
  float rough = 0.85;
  float occ = 0.45 + 0.55 * smoothstep(0.2, 0.7, pit);

  // The burn: the top of a spire is black glass where the lightning has come to it, time after time, and streaked below.
  float burn = 0.0;
  if (spire) {
    float ragged = vnoise(vWorld.xz * 0.21 + vWorld.y * 0.05) * 14.0 + vnoise(vec2(dot(vWorld.xz, vec2(0.7, 0.7)) * 0.9, vWorld.y * 0.06)) * 22.0;
    burn = smoothstep(52.0, 16.0, vTop + ragged - 12.0);
    albedo = mix(albedo, vec3(0.011, 0.011, 0.013) * (0.6 + 0.8 * pit), burn);
    rough = mix(rough, 0.45, burn);
  }

  // Snow lies where the face leans back, deeper in the lee and in the hollows of the rock; rime frosts what faces the gale.
  float lee = dot(n0.xz, uWind.xz);
  float lie = mix(smoothN.y, n0.y, spire ? 1.0 : 0.35) + (spire ? 0.1 : 0.14) * (pit - 0.5) + 0.12 * lee + 0.16 * (vnoise(vWorld.xz * 0.09) - 0.5);
  // Rock that stands out of the snow keeps it only on its level tops.
  float bare = spire ? 0.0 : clamp(vTop, 0.0, 1.0);
  float snow = smoothstep(0.36, 0.56, lie - 0.42 * bare - rib);
  if (spire) {
    // On a spire the snow keeps to the ledges and the gullies: where the body of the rock leans back, and where a slab stands in from its neighbours.
    float held = 0.55 * smoothN.y + 0.45 * n0.y + 0.2 * smoothstep(1.0, -7.0, vRelief) + 0.14 * (pit - 0.5) + 0.1 * lee + 0.12 * (vnoise(vWorld.xz * 0.07 + vWorld.y * 0.05) - 0.5);
    snow = smoothstep(0.62, 0.76, held) * (1.0 - sheet);
    // A spire stands in the drift at its foot.
    float above = vWorld.y - landAt(vWorld.xz).r;
    snow = max(snow, smoothstep(5.0, 0.5, above + 3.0 * (pit - 0.5)));
    occ *= 0.55 + 0.45 * smoothstep(0.0, 14.0, above);
    float proud = smoothstep(-9.0, 5.0, vRelief);
    occ *= 0.4 + 0.6 * proud;
    albedo *= 0.75 + 0.25 * proud;
  }
  if (!spire) snow *= 1.0 - sheet;
  snow *= 1.0 - burn;
  float rime = smoothstep(0.15, 0.7, -lee) * smoothstep(0.35, 0.75, pit + 0.3 * vnoise(vWorld.xz * 0.6 + vWorld.y * 0.4)) * (1.0 - burn);
  if (inside) {
    snow = smoothstep(1.6, 0.2, vWorld.y - CANAL_FLOOR + 1.2 * (pit - 0.5)) * 0.85;
    // Rime: thick on the lip of each mouth where the gale reaches, thinner on what stands proud farther in.
    float lip = exp(-max(min(dCanal, EXIT - dCanal), 0.0) / 9.0);
    rime = smoothstep(0.62 - 0.4 * lip, 0.85 - 0.3 * lip, pit) * (0.45 + 0.55 * lip);
    // The canal is black from outside: what the sky gives its walls is gone a few metres in.
    float lit = uUnder > 1.5 ? 1.0 : exp(-max(min(dCanal, EXIT - dCanal) - 1.0, 0.0) / 7.0);
    snow *= lit;
    rime *= lit;
    occ *= 0.04 + 0.96 * lit;
  }
  albedo = mix(albedo, vec3(0.62, 0.66, 0.72), 0.55 * rime);

  // The snow's own surface: wind crust in long ripples, and the prints.
  vec3 nSnow = normalize(mix(smoothN, n0, 0.35));
  float snowOcc = 1.0;
  vec3 snowTint = vec3(1.0);
  if (snow > 0.0 && !inside) {
    // Wind-packed snow from its picture, laid across the gale: broad for the drifts' skin far off, fine under the lens.
    vec2 q = vec2(dot(vWorld.xz, vec2(0.98, -0.2)), dot(vWorld.xz, vec2(0.2, 0.98)));
    vec2 qx = dFdx(q);
    vec2 qy = dFdy(q);
    Lay b = lay(tSnow, tSnowNh, q / 27.0 + 0.4, qx / 27.0, qy / 27.0);
    snowTint = b.c / SNOW_MEAN;
    // On a steep face the level picture would be pulled long: there the snow keeps its tone and loses its ripple.
    float flat_ = smoothstep(0.35, 0.7, n0.y);
    vec2 g = b.t * 0.9 * flat_;
    snowTint = mix(vec3(1.0), snowTint, 0.4 + 0.6 * flat_);
    if (close > 0.0 && !spire) {
      Lay f = lay(tSnow, tSnowNh, q / 4.0, qx / 4.0, qy / 4.0);
      snowTint = mix(snowTint, snowTint * f.c / SNOW_MEAN, 0.7 * close * flat_);
      g += close * 1.2 * f.t * flat_;
      vec3 p = prints(vSL);
      g += 1.6 * p.yz;
      snowOcc = 1.0 + 0.8 * min(p.x, 0.0);
      // Wind crust: the scoops between the ridges are scoured hard and lie darker than the soft snow on their crests.
      snowOcc *= 1.0 - 0.35 * close * flat_ * smoothstep(0.6, 0.25, f.pit);
    }
    nSnow = normalize(nSnow + vec3(g.x, 0.0, g.y));
  }
  // Under a sky without a sun a drift shows by which way its faces lean: the lean of the snow is drawn out for the light.
  if (!spire) nSnow = normalize(vec3(nSnow.x * 2.4, nSnow.y, nSnow.z * 2.4));
  vec3 n = normalize(mix(nRock, nSnow, snow));
  // Packed by the wind in long plates, the snow is glazed and blue-grey; between them it lies soft and white.
  float plate = smoothstep(0.4, 0.62, vnoise(vec2(dot(vWorld.xz, vec2(0.98, -0.2)) * 0.19, dot(vWorld.xz, vec2(0.2, 0.98)) * 0.045)));
  albedo = mix(albedo, mix(vec3(0.78, 0.84, 0.93), vec3(0.56, 0.64, 0.78), 0.55 * plate) * clamp(snowTint, 0.4, 1.1), snow);
  rough = mix(rough, 0.7 - 0.3 * plate, snow);
  occ = mix(occ, snowOcc, snow);
  if (!spire) occ *= landHollow(vWorld, n0, 5.0);
  // Where the bolt came to ground: the burned wet rock under the dead one, a plate 14 m across laid square to the lens of that shot.
  if (uKind < 0.5) {
    vec2 dS = vWorld.xz - uScorch.xy;
    vec2 uvS = vec2(dot(dS, uScorchAxes.xy) / 14.0, dot(dS, uScorchAxes.zw) / 7.88) + 0.5;
    vec2 eS = abs(uvS - 0.5);
    if (max(eS.x, eS.y) < 0.5) {
      // Seen low across it, the plate's fine bright lines would lie down into ripples like water: it is read soft, and its contrast is held in.
      vec3 sc = texture2D(tScorch, uvS, 1.0).rgb;
      float lum = dot(sc, vec3(0.3, 0.5, 0.2));
      sc = mix(vec3(0.12, 0.11, 0.115), sc * 1.3, 0.6);
      // The plate's own snow goes into the snow of the place at its rim; its burn keeps to the middle, ragged by the picture's own dark.
      float out_ = length((uvS - 0.5) * vec2(1.0, 0.5625)) / 0.23;
      // Tongues of new snow lie across it down the gale.
      float tongue = vnoise(vec2(dot(vWorld.xz, uWind.xz) * 0.35, dot(vWorld.xz, vec2(-uWind.z, uWind.x)) * 1.6));
      float scorch = smoothstep(1.0, 0.55, out_ + 0.9 * (lum - 0.3) + 0.7 * (tongue - 0.45));
      vec2 px = 4.0 / vec2(textureSize(tScorchH, 0));
      float h0 = texture2D(tScorchH, uvS).r;
      float du = (texture2D(tScorchH, uvS + vec2(px.x, 0.0)).r - h0) / (px.x * 14.0);
      float dv = (texture2D(tScorchH, uvS + vec2(0.0, px.y)).r - h0) / (px.y * 7.88);
      // Burned rock, wet but broken: it is rough, and only its hollows hold a little water. The relief is laid at a low strength.
      vec3 nS = normalize(vec3(0.0, 1.0, 0.0) - 0.012 * (vec3(uScorchAxes.x, 0.0, uScorchAxes.y) * du + vec3(uScorchAxes.z, 0.0, uScorchAxes.w) * dv));
      albedo = mix(albedo, sc, scorch);
      n = normalize(mix(n, nS, scorch));
      rough = mix(rough, 1.0, scorch);
      occ = mix(occ, 0.6 + 0.4 * h0, scorch);
    }
  }

  // The rock that stands over the canal is in the open, though the canal's roof is behind it: it is lit as from above that roof.
  vec3 lightAt = !inside && dCanal > 0.0 && dCanal < EXIT && abs(vSL.y - canalAt(dCanal)) < 60.0 ? vWorld + vec3(0.0, 16.0, 0.0) : vWorld;
  vec3 c = rigShade(lightAt, n, v, albedo, rough, occ);
  if (inside && uUnder > 1.5) {
    // Inside, the two mouths are the windows: each lights the rock that faces it by the share of the sky it holds from there.
    vec3 lift = vec3(0.0, CANAL_FLOOR + 9.0 - vWorld.y, 0.0);
    vec3 toMouth = -CANAL_ALONG * max(dCanal, 1.0) + lift;
    vec3 toExit = CANAL_ALONG * max(EXIT - dCanal, 1.0) + lift;
    float sM = 900.0 / (dot(toMouth, toMouth) * 3.14159 + 900.0);
    float sE = 700.0 / (dot(toExit, toExit) * 3.14159 + 700.0) * exp(-max(EXIT - dCanal, 0.0) / 70.0);
    vec3 dM = normalize(toMouth);
    vec3 dE = normalize(toExit);
    vec3 window = skyIrradiance(dM) * sM * (0.2 + 0.8 * max(dot(n, dM), 0.0)) + skyIrradiance(dE) * sE * (0.2 + 0.8 * max(dot(n, dE), 0.0));
    c += albedo * window * (0.35 + 0.65 * pit) * 2.2;
  }
  // Seen from outside the canal is black; the shot inside it is exposed for it (uUnder is staged up from that cut).
  if (inside && uUnder < 1.5) {
    float shown = exp(-max(min(dCanal, EXIT - dCanal) - 1.0, 0.0) / 9.0);
    c = c * (0.03 + 0.97 * shown) + vec3(0.0035, 0.0045, 0.0085) * (1.0 - shown);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The floor of the canal: dark wet ice down the middle, a mirror for the mouth, with wind-packed snow banked against the walls and lying
// on it in tongues. The snow is the snow picture of the place; the ice heaves gently, with no small ripple to ring the mouth's light.
export const ICE_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vAcross;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vAcross = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const ICE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vAcross;
uniform sampler2D tSnow;
uniform sampler2D tSnowNh;
${RIG_GLSL}
${NOISE_GLSL}

float heave(vec2 p) {
  return vnoise(p * 0.31) + 0.35 * vnoise(p * 0.9 + 4.1);
}

void main() {
  vec3 toCamera = cameraPosition - vWorld;
  vec3 v = normalize(toCamera);
  float e = 0.3;
  float h0 = heave(vWorld.xz);
  vec3 nIce = normalize(vec3((h0 - heave(vWorld.xz + vec2(e, 0.0))) / e * 0.22, 1.0, (h0 - heave(vWorld.xz + vec2(0.0, e))) / e * 0.22));
  // The snow: against each wall, in from it by a bank's breadth that comes and goes, and in tongues across the ice.
  vec2 q = vec2(vAcross.y, vAcross.x * 6.0);
  vec3 sC = texture2D(tSnow, q / 4.0).rgb;
  vec3 sN = texture2D(tSnowNh, q / 4.0).rgb;
  vec3 sB = texture2D(tSnowNh, q / 13.0 + 0.3).rgb;
  float bank = abs(vAcross.x) + 0.45 * (vnoise(vec2(vAcross.y * 0.21, vAcross.x > 0.0 ? 3.7 : 9.2)) - 0.5) + 0.3 * (sB.b - 0.5);
  float tongue = smoothstep(0.62, 0.8, vnoise(vec2(vAcross.y * 0.13 + vAcross.x * 0.7, 5.5)) + 0.25 * (sB.b - 0.5));
  float snow = max(smoothstep(0.5, 0.68, bank + 0.1 * (sN.b - 0.5)), 0.85 * tongue);
  // Frost on the ice between: where the picture's small ridges stand, in patches.
  float frost = smoothstep(0.5, 0.8, vnoise(vWorld.xz * 0.45 + 3.3)) * smoothstep(0.35, 0.7, sN.b);
  vec3 nSnow = normalize(vec3((sN.r - 0.5) * 1.6 + (sB.r - 0.5), 1.0, -(sN.g - 0.5) * 1.6 - (sB.g - 0.5)));
  vec3 n = normalize(mix(nIce, nSnow, max(snow, 0.5 * frost)));
  vec3 albedo = mix(vec3(0.05, 0.065, 0.09), vec3(0.5, 0.55, 0.62), 0.5 * frost);
  albedo = mix(albedo, vec3(0.8, 0.84, 0.9) * clamp(sC / vec3(0.33, 0.372, 0.456), 0.5, 1.1), snow);
  float rough = mix(mix(0.1, 0.6, frost), 0.8, snow);
  // Snow under the wall stands in its shade.
  float occ = 1.0 - 0.45 * snow * smoothstep(0.6, 1.0, abs(vAcross.x));
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
