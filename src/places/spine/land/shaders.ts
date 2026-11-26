// The surfaces of the Spine's land: rock and snow in one shader, read by world position so that the ridge, the spires and the mouth of the canal are one body.
import { CANAL_L, EXIT, EXIT_FLARE, EXIT_R, FLARE, FLOOR, MOUTH_R, MOUTH_S, THROAT, canalL, first, frameAt, world } from '../ridge';
import { DUSK, WIND } from '../shared/anchors';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

const v3 = (p: readonly number[]): string => `vec3(${p.map((k) => k.toFixed(3)).join(', ')})`;
const exitAt = world(MOUTH_S + EXIT, canalL(EXIT), FLOOR + 0.62 * EXIT_R);
const mouthAt = world(MOUTH_S, canalL(0), FLOOR + 0.5 * MOUTH_R);
const exitDir = ((): number[] => {
  const a = world(MOUTH_S + EXIT - 2, canalL(EXIT - 2), 0);
  const b = world(MOUTH_S + EXIT + 2, canalL(EXIT + 2), 0);
  const n = Math.hypot(b[0] - a[0], b[2] - a[2]);
  return [(b[0] - a[0]) / n, 0, (b[2] - a[2]) / n];
})();

// Inside the canal the two mouths are the windows. What each gives a face, what of the sky is seen through the far one, and that sky itself,
// read from the dome's own pictures where they stand (they flow too slowly for a mirror in broken ice to show the difference).
export const WINDOW_GLSL = /* glsl */ `
uniform sampler2D tSkyDusk;
uniform sampler2D tStormWall;
const vec3 EXIT_AT = ${v3(exitAt)};
const vec3 EXIT_DIR = ${v3(exitDir)};
const vec3 MOUTH_AT = ${v3(mouthAt)};
const float EXIT_RADIUS = ${EXIT_R.toFixed(1)};
const float EXIT_FAR = ${EXIT.toFixed(1)};
const float W_STORM_AZ = ${Math.atan2(-WIND[2], -WIND[0]).toFixed(4)};
const float W_DUSK_AZ = ${Math.atan2(DUSK[2], DUSK[0]).toFixed(4)};
float wWrap(float a) {
  return a - 6.28318 * floor((a + 3.14159) / 6.28318);
}
float wMirror(float u) {
  return 1.0 - abs(1.0 - mod(u, 2.0));
}
// The sky toward d as the dome draws it, at rest.
vec3 windowSky(vec3 d, float lod) {
  float el = asin(clamp(d.y, -1.0, 1.0));
  float az = atan(d.z, d.x);
  float turned = wWrap(az - W_STORM_AZ);
  float storm = 1.0 - smoothstep(1.2, 1.75, abs(turned));
  vec3 dusk = textureLod(tSkyDusk, vec2(wMirror(0.62 + wWrap(az - W_DUSK_AZ) / 1.5), clamp(0.045 + el, 0.004, 0.996)), lod).rgb;
  vec3 wall = textureLod(tStormWall, vec2(wMirror(0.5 + turned / 1.87), clamp(0.14 + el / 1.2, 0.004, 0.996)), lod).rgb;
  vec3 c = mix(dusk, wall, storm);
  float warm = clamp((c.r - c.b) * 6.0, 0.0, 1.0);
  return c * mix(vec3(0.9, 0.88, 1.06), vec3(1.25, 1.1, 0.95), warm) * 0.2 + flashCast() * (4.0 * storm);
}
// How much of a ray from p toward d leaves by the far mouth: 1 through its middle, 0 into the rock.
float throughExit(vec3 p, vec3 d) {
  float along = dot(d, EXIT_DIR);
  if (along < 0.02) return 0.0;
  vec3 h = p + d * (dot(EXIT_AT - p, EXIT_DIR) / along) - EXIT_AT;
  vec2 off = vec2(dot(h, vec3(-EXIT_DIR.z, 0.0, EXIT_DIR.x)), h.y * 1.1);
  float turn = atan(off.y, off.x);
  return 1.0 - smoothstep(0.72, 0.9, length(off) / (EXIT_RADIUS * (0.92 + 0.1 * sin(turn * 5.0 + 1.0) + 0.06 * sin(turn * 11.0))));
}
// The light of the two mouths on a face: each by the share of the sky it holds from there, cold, falling off fast into the rock.
vec3 windowLight(vec3 p, vec3 n) {
  vec3 toExit = EXIT_AT - p;
  vec3 toMouth = MOUTH_AT - p;
  float sE = 520.0 / (dot(toExit, toExit) * 3.14159 + 520.0);
  float sM = 0.35 * 900.0 / (dot(toMouth, toMouth) * 3.14159 + 900.0);
  vec3 dE = normalize(toExit);
  vec3 dM = normalize(toMouth);
  vec3 cold = mix(uSkyHorizon, uSkyZenith, 0.4) * 3.14159;
  // What comes in by a mouth has been thrown about by snow and pale rock: it is nearer white than the sky that sent it.
  cold = mix(cold, dot(cold, vec3(0.33)) * vec3(1.06, 1.0, 0.94), 0.7) * 2.1;
  // A flash outside comes in by the mouths and dies with the same fall as their daylight: the rock by a mouth jumps, the deep of the canal hardly.
  cold += flashCast() * 0.9;
  // The far mouth holds the band of dusk: what it gives is warm; the near mouth gives the storm's cold.
  vec3 dusk = mix(cold, vec3(1.5, 0.82, 0.42) * dot(cold, vec3(0.3, 0.5, 0.2)), 0.2);
  vec3 w = dusk * (sE * (0.1 + 0.9 * max(dot(n, dE), 0.0))) + cold * (sM * (0.1 + 0.9 * max(dot(n, dM), 0.0)));
  // The flash of a stroke outside comes in by the far mouth as a narrow pulse: it reaches farther in than the daylight and lights only
  // what is turned to the mouth, a rim and never a fill.
  if (uStrikeAt.w > 0.0) {
    float turned = max(dot(n, dE), 0.0);
    w += vec3(0.76, 0.68, 1.0) * (uStrikeTip.w * 0.6 * turned * turned * turned * 2600.0 / (dot(toExit, toExit) * 3.14159 + 2600.0));
  }
  return w;
}
// The glaze of ice on a face: the far mouth seen in it.
vec3 windowGlaze(vec3 p, vec3 n, vec3 v, float sharp) {
  vec3 r = reflect(-v, n);
  vec3 toExit = EXIT_AT - p;
  float size = EXIT_RADIUS * inversesqrt(dot(toExit, toExit) + 1.0);
  float seen = smoothstep(1.0 - sharp * size * size - 0.02, 1.0 - 0.3 * sharp * size * size, dot(r, normalize(toExit)));
  float nv = clamp(dot(n, v), 0.0, 1.0);
  return windowSky(normalize(vec3(r.x, abs(r.y) + 0.05, r.z)), 5.0) * seen * (0.04 + 0.96 * pow(1.0 - nv, 5.0));
}
`;

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
uniform sampler2D tFace;
uniform sampler2D tFaceH;
// The part of the face photograph that is laid: its bare jointed rock, right of its rimed edge and under its burned top.
const vec4 FACE_RECT = vec4(0.3, 0.0, 0.7, 0.68);
uniform sampler2D tCrust;
uniform sampler2D tCrustH;
// The ground's photograph (mat/crustfield, 40 m by 22 m from straight above): the part of it that has no prints, 40 m by 14.5 m.
const vec4 CRUST_RECT = vec4(0.0, 0.0, 1.0, 0.66);
const vec3 CRUST_SNOW = vec3(0.34, 0.375, 0.445);
uniform sampler2D tLedge;
uniform sampler2D tLedgeNh;
uniform sampler2D tRubble;
uniform sampler2D tRubbleNh;
uniform sampler2D tSnow;
uniform sampler2D tSnowNh;
uniform sampler2D tCanal;
uniform sampler2D tCanalNh;
uniform sampler2D tRime;
uniform sampler2D tScorch;
uniform sampler2D tScorchH;
uniform sampler2D tScorchD;
uniform vec4 uScorch;
uniform vec4 uScorchAxes;
uniform sampler2D tSheet;
uniform sampler2D tSheetH;
uniform vec4 uSheet;
uniform vec4 uSheetMap;
// The height of the frame in pixels, so that what is decided by the size of a pixel is decided the same at every format.
uniform float uTall;
uniform float uWet;
uniform float uSheetDepth;
uniform float uSheetShear;
#ifndef KIND
#define KIND 0
#endif
#ifndef SCORCH
#define SCORCH 0
#endif
// The kind is fixed when the shader is built, one build for each: what a kind never draws is not in its shader, and costs nothing.
const float uKind = float(KIND);
const bool ground = KIND == 0;
${RIG_GLSL}
${NOISE_GLSL}
${WINDOW_GLSL}

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
    // The far mouth is cut wider than the canal, so that from inside the canal's own lip is its edge.
    if (dCanal < 0.5 * EXIT ? length(across * vec2(1.0, low)) < (r - 0.8) * ragged : length(across) < r + 2.5) discard;
    // Behind the arch the ground does not stand inside the canal: where a flank passes through it, it is cut away to the canal's own wall.
    if (uKind < 0.5 && dCanal > 2.5 && dCanal < EXIT - 2.5 && length(across) < r + 0.4) discard;
  }
  gl_FragColor = vec4(rigOut(vec3(0.0)), 1.0);
}`;

export const LAND_FRAGMENT = /* glsl */ `${LAND_PRELUDE}
// A picture laid on a face at one size in metres, with the slopes of its height map. The gradients are given, so that a lookup may stand in a branch.
struct Lay { vec3 c; vec2 t; float pit; };
// The level of detail is worked once from the gradients and both pictures are read at it: a read by level costs far less than a read by gradient.
float lodOf(sampler2D picture, vec2 gx, vec2 gy) {
  return 0.5 * log2(max(max(dot(gx, gx), dot(gy, gy)), 1e-12)) + log2(float(textureSize(picture, 0).x));
}
Lay lay(sampler2D colour, sampler2D nh, vec2 at, vec2 gx, vec2 gy) {
  float lod = lodOf(colour, gx, gy);
  vec3 k = textureLod(nh, at, lod).rgb;
  return Lay(textureLod(colour, at, lod).rgb, (k.rg - 0.5) * vec2(1.0, -1.0), k.b);
}

void main() {
  float dCanal = vSL.x - MOUTH_S;
  vec3 smoothN = normalize(vNormal);
  if (!gl_FrontFacing) smoothN = -smoothN;
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  vec3 v = toCamera / far;
  const bool spire = KIND == 1;
  // The rock over the canal is the spire's own face, carried by the ground.
  float porch = 0.0;
  if (ground) porch = dCanal > 0.0 && dCanal < EXIT ? 1.0 - smoothstep(4.0, 26.0, abs(vSL.y - canalAt(dCanal)) - flareAt(dCanal)) : 0.0;
  bool plates = spire || porch > 0.5;
  const bool inside = KIND == 2;
  // Broken rock is flat faces that meet in edges: a little of the face of the triangle itself with the round of the mesh.
  vec3 facet = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(facet, smoothN) < 0.0) facet = -facet;
  // (Only a little: the two triangles of every quad of the mesh lean two ways, and more of the facet would comb the face along their diagonals.)
  vec3 n0 = inside ? smoothN : normalize(mix(smoothN, facet, spire ? 0.08 : 0.25 * clamp(vTop, 0.0, 1.0)));

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
  float ledgeSnow = 0.0;
  float fineRock = 0.0;
  float crustRock = 0.0;
  vec3 crustTint = vec3(1.0);
  float wallRime = 0.0;
  vec3 wallRimeC = vec3(0.7);
  // What the lays below would be spent on unseen: ground the snow buries whole, and a spire's broad face where its sheet covers it.
  // The gale strips the flanks to ribs of dark rock that run down the fall, and leaves the snow in the lee of each.
  float steep = smoothstep(0.985, 0.85, smoothN.y);
  float rib = uKind < 0.5 ? steep * (smoothstep(0.42, 0.7, vnoise(vWorld.xz / 23.0 + 3.0) + 0.25 * (vnoise(vWorld.xz * 0.21) - 0.5)) * 0.8 - 0.55 * dot(n0.xz, uWind.xz) * smoothstep(0.0, 1.0, -dot(n0.xz, uWind.xz) * 3.0)) : 0.0;
  float lie0 = mix(smoothN.y, n0.y, 0.35) - 0.07 + 0.12 * dot(n0.xz, uWind.xz) + 0.16 * (vnoise(vWorld.xz * 0.09) - 0.5) - rib;
  // About the dead one the snow is thin: the gale has scoured the place where the bolt came down, and rock shows through it.
  float thin = 0.0;
  if (ground) thin = smoothstep(30.0, 9.0, length(vWorld.xz - uScorch.xy));
  bool buried = false;
  // (Nothing of the ground is taken as buried whole any more: its snow and its stones are both the photograph's.)
  vec3 sheetAx = vec3(uSheet.z, 0.0, uSheet.w);
  vec2 sheetUv = vec2((dot(vWorld.xz - uSheet.xy, uSheet.zw) + uSheetShear * vWorld.y) * uSheetMap.x + uSheetMap.y, vWorld.y * uSheetMap.z + uSheetMap.w);
  vec3 sheetC = vec3(0.0);
  float sheet = 0.0;
  if (!inside) if (spire || porch > 0.0) {
    sheetC = textureLod(tSheet, sheetUv, lodOf(tSheet, dFdx(sheetUv), dFdy(sheetUv))).rgb;
    float facing = abs(dot(smoothN, vec3(-sheetAx.z, 0.0, sheetAx.x)));
    sheet = smoothstep(0.035, 0.1, max(sheetC.r, max(sheetC.g, sheetC.b))) * smoothstep(0.26, 0.55, facing) * smoothstep(0.0, 0.06, sheetUv.y) * (spire ? 1.0 : porch);
  }
  // Close to, a sheet is drawn larger than it was made and would go soft: how close is told by how many of its texels a pixel covers.
  float near = smoothstep(1.4, 0.3, length(fwidth(sheetUv) * vec2(textureSize(tSheet, 0))) * uTall / 1080.0);
  vec3 across = normalize(mix(ax, bx, step(0.5, wa)));
  vec3 upAlong = up;
  if (inside) {
    float r = flareAt(dCanal);
    vec2 axis = vec2(vSL.y - canalAt(dCanal), vWorld.y - (CANAL_FLOOR + 0.62 * r));
    // The rock of the canal by world position on three planes, its beds 7 m to the picture so they read broad and water-worn: nothing is laid along or round the tube.
    vec3 tw = pow(abs(n0), vec3(4.0));
    tw /= tw.x + tw.y + tw.z;
    vec2 pX = vWorld.zy / 7.0;
    vec2 pY = vWorld.xz / 7.0 + 0.31;
    vec2 pZ = vWorld.xy / 7.0 + 0.67;
    vec3 c1 = texture2D(tCanal, pX).rgb * tw.x + texture2D(tCanal, pY).rgb * tw.y + texture2D(tCanal, pZ).rgb * tw.z;
    vec3 n1 = texture2D(tCanalNh, pX).rgb * tw.x + texture2D(tCanalNh, pY).rgb * tw.y + texture2D(tCanalNh, pZ).rgb * tw.z;
    // Slabs: the same rock again at five times the size, turned, to break the wall into blocks larger than the picture.
    vec2 qX = vec2(vWorld.z + 0.35 * vWorld.y, vWorld.y - 0.35 * vWorld.z) / 19.0 + 0.13;
    vec2 qZ = vec2(vWorld.x + 0.35 * vWorld.y, vWorld.y - 0.35 * vWorld.x) / 19.0 + 0.53;
    vec3 n2 = texture2D(tCanalNh, qX).rgb * tw.x + texture2D(tCanalNh, pY * 0.21).rgb * tw.y + texture2D(tCanalNh, qZ).rgb * tw.z;
    // Water-worn stone in level beds, cream and brown as its picture has it; broad darker bands run through it, larger than the picture.
    float band = vnoise(vec2(vWorld.y * 0.42 + 0.6 * n2.b, 0.035 * (vWorld.x + vWorld.z)));
    rock = c1 * 1.9 * mix(vec3(1.04, 1.0, 0.93), vec3(0.5, 0.42, 0.36), smoothstep(0.42, 0.78, band)) * (0.62 + 0.76 * n2.b);
    t = ((n1.rg - 0.5) * 0.22 + (n2.rg - 0.5) * 0.6) * vec2(1.0, -1.0);
    pit = 0.55 * n1.b + 0.45 * n2.b;
    // Rime: the frost picture at its own 3 m, only round each mouth where the gale reaches; farther in the rock is bare and wet.
    vec3 rimeC = texture2D(tRime, vWorld.zy / 3.0).rgb * tw.x + texture2D(tRime, vWorld.xz / 3.0 + 0.4).rgb * tw.y + texture2D(tRime, vWorld.xy / 3.0 + 0.7).rgb * tw.z;
    float frost = smoothstep(0.32, 0.62, dot(rimeC, vec3(0.33)));
    float lipW = exp(-max(min(dCanal, EXIT - dCanal) - 2.0, 0.0) / 9.0);
    wallRime = clamp(frost * 1.5 * lipW * lipW + 0.8 * lipW * lipW * lipW, 0.0, 1.0) * (0.45 + 0.55 * smoothstep(0.25, 0.55, pit + 0.7 * lipW));
    wallRimeC = rimeC;
    // Under frost the rock's grain is filled.
    t *= 1.0 - 0.9 * wallRime;
    upAlong = tw.y > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    across = tw.x > max(tw.y, tw.z) ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  } else if (buried) {
    rock = RUBBLE_MEAN * 1.5;
  } else {
    // One upright lay, on whichever of the two upright planes the face looks at more squarely, and one level lay. A lay that is never
    // seen is still paid for on every pixel, so each kind has only its own.
    bool onA = wa > 0.5;
    vec2 atS = onA ? vec2(pb, pu) : vec2(pa, pu) + 17.3;
    vec2 gSx = onA ? vec2(dFdx(pb), dFdx(pu)) : vec2(dFdx(pa), dFdx(pu));
    vec2 gSy = onA ? vec2(dFdy(pb), dFdy(pu)) : vec2(dFdy(pa), dFdy(pu));
    if (spire) {
      // A spire's slabs stand metres out of its face, and the side of a slab looks another way than the face it stands on: each flat
      // of the rock takes the plane it is itself most square to, the level one too, so no slab's side is a picture pulled long.
      vec3 nc = normalize(mix(smoothN, facet, 0.75));
      vec3 wc = abs(vec3(dot(nc, ax), dot(nc, up), dot(nc, bx)));
      if (wc.y > max(wc.x, wc.z)) {
        atS = vec2(pa, pb) + 41.7;
        gSx = vec2(dFdx(pa), dFdx(pb));
        gSy = vec2(dFdy(pa), dFdy(pb));
      } else if (wc.x > wc.z) {
        atS = vec2(pb, pu);
        gSx = vec2(dFdx(pb), dFdx(pu));
        gSy = vec2(dFdy(pb), dFdy(pu));
      } else {
        atS = vec2(pa, pu) + 17.3;
        gSx = vec2(dFdx(pa), dFdx(pu));
        gSy = vec2(dFdy(pa), dFdy(pu));
      }
    }
#if KIND == 1
    {
      // A spire's rock is a photograph of a frost-shattered face (mat/kiteface, 50 m square, its burned top and its rimed edge left out), laid
      // on the upright plane the face looks at most squarely, at its real size where the lens is near. It turns over at its edges and has no seam.
      vec2 atA = atS / 35.0;
      vec2 atB = vec2(atS.x + 0.21 * atS.y, atS.y - 0.21 * atS.x) / 112.0 + vec2(0.37, 0.61);
      float lodA = lodOf(tFace, gSx / 50.0, gSy / 50.0);
      // Far off its joints would be finer than a pixel and the face a smooth skin: there the same rock is laid three times larger, so a far
      // spire is cut by joints it can show.
      float which = smoothstep(1.6, 2.2, lodA);
      vec2 eps = vec2(max(0.004, exp2(lodA) / 1254.0), 0.0);
      vec3 cF = vec3(0.0);
      vec3 hF = vec3(0.0);
      if (which < 0.99) {
        vec2 q = FACE_RECT.xy + FACE_RECT.zw * vec2(wMirror(atA.x), wMirror(atA.y));
        vec2 qx = FACE_RECT.xy + FACE_RECT.zw * vec2(wMirror(atA.x + eps.x / FACE_RECT.z), wMirror(atA.y));
        vec2 qy = FACE_RECT.xy + FACE_RECT.zw * vec2(wMirror(atA.x), wMirror(atA.y + eps.x / FACE_RECT.w));
        cF += (1.0 - which) * textureLod(tFace, q, lodA).rgb;
        hF += (1.0 - which) * vec3(textureLod(tFaceH, q, lodA).r, textureLod(tFaceH, qx, lodA).r, textureLod(tFaceH, qy, lodA).r);
      }
      if (which > 0.01) {
        float lodB = lodA - 1.68;
        vec2 q = FACE_RECT.xy + FACE_RECT.zw * vec2(wMirror(atB.x), wMirror(atB.y));
        vec2 qx = FACE_RECT.xy + FACE_RECT.zw * vec2(wMirror(atB.x + eps.x / FACE_RECT.z), wMirror(atB.y));
        vec2 qy = FACE_RECT.xy + FACE_RECT.zw * vec2(wMirror(atB.x), wMirror(atB.y + eps.x / FACE_RECT.w));
        cF += which * textureLod(tFace, q, lodB).rgb;
        hF += which * vec3(textureLod(tFaceH, q, lodB).r, textureLod(tFaceH, qx, lodB).r, textureLod(tFaceH, qy, lodB).r);
      }
      // Under the lens a texel of that lay is many pixels wide: there the same rock is laid again six times finer, as the grain, the cracks
      // and the small edges of the blocks, in colour and in relief.
      float fine = smoothstep(1.2, -0.6, lodA);
      fineRock = fine;
      vec2 tFine = vec2(0.0);
      if (fine > 0.01) {
        // (The picture of broken blocks, which has no grain: the face photograph again at this size would hatch the rock like wood.)
        vec2 atD = vec2(atS.x - 0.31 * atS.y, atS.y + 0.31 * atS.x);
        Lay d = lay(tRubble, tRubbleNh, atD / 6.5 + vec2(0.13, 0.71), gSx / 6.5, gSy / 6.5);
        cF *= mix(vec3(1.0), clamp(d.c / RUBBLE_MEAN, 0.35, 1.8), 0.6 * fine);
        tFine = d.t * 1.1 * fine;
        hF.x = mix(hF.x, 0.5 * hF.x + 0.5 * d.pit, fine);
      }
      // The photograph's own snow lies on its ledges: pale and without colour.
      float paleF = dot(cF, vec3(0.3, 0.5, 0.2));
      ledgeSnow = smoothstep(0.42, 0.62, paleF) * smoothstep(0.16, 0.05, max(cF.r, max(cF.g, cF.b)) - min(cF.r, min(cF.g, cF.b)));
      // Grey-tan stone under a cold sky: half of the photograph's brown is taken out, and the dusk puts its own warmth on the lee.
      rock = mix(cF, vec3(dot(cF, vec3(0.3, 0.5, 0.2))) * vec3(1.03, 0.99, 0.93), 0.75) * 1.15;
      // Its relief, from the photograph's height: the joints are cut a hand deep at this size, the plates between them stand flat.
      t = vec2(hF.y - hF.x, hF.z - hF.x) * (-0.55 / (eps.x * 50.0));
      t = clamp(t, vec2(-1.6), vec2(1.6)) + tFine;
      pit = hF.x;
    }
#elif KIND == 0
    // The ground's own cliffs are broken rock, not jointed plates: the picture of blocks half in snow, which has no grain.
    vec3 side = vec3(0.0);
    vec2 tSide = vec2(0.0);
    float pSide = 0.5;
    if (top < 0.999) {
      Lay a = lay(tRubble, tRubbleNh, atS / 23.0, gSx / 23.0, gSy / 23.0);
      vec3 c2 = textureLod(tRubble, atS.yx / 67.0 + 0.37, lodOf(tRubble, gSx / 67.0, gSy / 67.0)).rgb;
      side = 1.5 * a.c * (0.45 + 0.55 * c2 / RUBBLE_MEAN);
      tSide = a.t * 1.2;
      pSide = a.pit;
    }
    vec3 level = vec3(0.0);
    vec2 tLevel = vec2(0.0);
    float pLevel = 0.5;
    if (top > 0.001) {
      // What lies level is a photograph of wind crust with dark ribs and stones standing out of it, from straight above, laid on the
      // level at its one real size and turned over at its edges. Its pale is the place's snow and its dark the place's rock.
      vec2 atL = vec2(dot(vWorld.xz, vec2(0.82, 0.57)), dot(vWorld.xz, vec2(-0.57, 0.82)));
      vec2 gLx = vec2(dot(dFdx(vWorld.xz), vec2(0.82, 0.57)), dot(dFdx(vWorld.xz), vec2(-0.57, 0.82)));
      vec2 gLy = vec2(dot(dFdy(vWorld.xz), vec2(0.82, 0.57)), dot(dFdy(vWorld.xz), vec2(-0.57, 0.82)));
      vec2 uvC = atL / vec2(40.0, 14.5);
      float lodC = lodOf(tCrust, gLx / 40.0, gLy / 40.0);
      float eC = max(0.003, exp2(lodC) / 1688.0);
      vec2 q = CRUST_RECT.xy + CRUST_RECT.zw * vec2(wMirror(uvC.x), wMirror(uvC.y));
      vec2 qx = CRUST_RECT.xy + CRUST_RECT.zw * vec2(wMirror(uvC.x + eC), wMirror(uvC.y));
      vec2 qy = CRUST_RECT.xy + CRUST_RECT.zw * vec2(wMirror(uvC.x), wMirror(uvC.y + eC * 40.0 / 14.5 * CRUST_RECT.w / CRUST_RECT.w));
      vec3 cC = textureLod(tCrust, q, lodC).rgb;
      vec3 hC = vec3(textureLod(tCrustH, q, lodC).r, textureLod(tCrustH, qx, lodC).r, textureLod(tCrustH, qy, lodC).r);
      float lumC = dot(cC, vec3(0.3, 0.5, 0.2));
      crustRock = smoothstep(0.25, 0.13, lumC);
      vec2 slope = clamp(vec2(hC.y - hC.x, hC.z - hC.x) * (-0.55 / (eC * 40.0)), vec2(-1.3), vec2(1.3)) * mix(0.3, 1.0, crustRock);
      // Back to the world's own two level ways.
      tLevel = vec2(0.82 * slope.x - 0.57 * slope.y, 0.57 * slope.x + 0.82 * slope.y);
      pLevel = hC.x;
      crustTint = cC / CRUST_SNOW;
      level = cC * 1.7;
      if (close > 0.0) {
        Lay f = lay(tRubble, tRubbleNh, atL / 5.0 + 0.21, gLx / 5.0, gLy / 5.0);
        level = mix(level, level * f.c / RUBBLE_MEAN, 0.6 * close);
        tLevel += close * 0.8 * f.t * crustRock;
      }
    }
    rock = mix(side, level, top);
    t = mix(tSide, tLevel, top);
    pit = mix(pSide, pLevel, top);
#endif
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
      float lodH = lodOf(tSheetH, dFdx(uv), dFdy(uv));
      float h0 = textureLod(tSheetH, uv, lodH).r;
      float da = (textureLod(tSheetH, uv + vec2(px.x, 0.0), lodH).r - h0) / px.x * uSheetMap.x;
      float dy = (textureLod(tSheetH, uv + vec2(0.0, px.y), lodH).r - h0) / px.y * uSheetMap.z;
      // Far off the sheet is the rock, whole. Close to it would be a picture pulled large and soft: there it gives only the broad tone
      // of its masses, and the rock's own tiles, at their true size, are the crag, in colour and in relief.
      // Far off the rock of the sheet is dark and its snow is pale: the rock is let down, the snow kept.
      // The sheet says where the spire's great masses are dark and where pale; the rock itself is the photograph, at every distance.
      float mass = clamp(0.5 + 0.5 * dot(sc, vec3(0.33)) / 0.16, 0.62, 1.3);
      rock = mix(rock, rock * mass, sheet);
      nRock = normalize(nRock - sheet * uSheetDepth * mix(0.2, 0.08, near) * (sa * da + vec3(0.0, dy, 0.0)));
      pit = mix(pit, mix(0.25 + 0.6 * h0, pit, 0.8 * near), 0.6 * sheet);
    }
  }

  // Colour: the picture's own, broken by the beds of the rock in broad masses.
  float bed = vnoise(vec2(dot(vWorld, vec3(0.011, 0.034, 0.017)), dot(vWorld.xz, vec2(0.004, -0.003))) * 3.0);
  float blotch = vnoise(vWorld.xz * 0.021 + vWorld.y * 0.013);
  vec3 tone = mix(vec3(0.82, 0.79, 0.78), vec3(1.06, 1.0, 0.93), smoothstep(0.3, 0.7, 0.6 * bed + 0.4 * blotch));
  // The plates of a spire are grey rock: their picture's brown is taken half out, and the sheet keeps its own colour.
  if (plates && !spire) rock = mix(rock, vec3(dot(rock, vec3(0.3, 0.5, 0.2))) * vec3(0.96, 0.98, 1.06), 0.55 * (1.0 - sheet));
  tone = mix(tone, vec3(1.0), sheet);
  vec3 albedo = min(rock * (inside ? vec3(1.0) : tone), vec3(0.9));
  // A spire's rock is tan where the dusk lights it: a quarter of its pictures' brown is taken out, no more.
  float rough = 0.85;
  float occ = 0.45 + 0.55 * smoothstep(0.2, 0.7, pit);
  // Close to, the cracks of a spire are dark.
  if (spire) albedo *= mix(1.0, 1.25 * (0.3 + 0.7 * smoothstep(0.06, 0.32, pit)), near);

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
  if (ground) {
    // The photograph's ribs and stones stand out of the snow, more of them where the gale has the ground and none in the deep of a drift.
    float drift = vnoise(vWorld.xz / 47.0 + 7.3);
    snow *= 1.0 - top * crustRock * smoothstep(0.52, 0.34, drift);
  }
  if (ground) if (thin > 0.0) {
    // The rubble picture is blocks half in snow: where it is dark there is a stone or a rib of rock, wet and dark, and the snow stops at it.
    float stone = thin * smoothstep(0.34, 0.2, dot(rock, vec3(0.33)) / 1.5 + 0.12 * (vnoise(vWorld.xz * 0.35) - 0.5));
    snow *= 1.0 - 0.92 * stone;
    albedo *= mix(1.0, 0.5, stone);
    rough = mix(rough, 0.32, stone);
  }
  if (spire) {
    // On a spire the snow keeps to the ledges and the gullies: where the body of the rock leans back, and where a slab stands in from its neighbours.
    float held = 0.55 * smoothN.y + 0.45 * n0.y + 0.2 * smoothstep(1.0, -7.0, vRelief) + 0.14 * (pit - 0.5) + 0.1 * lee + 0.12 * (vnoise(vWorld.xz * 0.07 + vWorld.y * 0.05) - 0.5);
    snow = smoothstep(0.62, 0.76, held) * (1.0 - sheet);
    // Close to, the sheet's own snow is gone with its picture: snow lies on what the broken rock turns up to the sky, block by block.
    snow = mix(snow, max(ledgeSnow, smoothstep(0.78, 0.9, 0.4 * held + 0.6 * nRock.y + 0.25 * (pit - 0.5))), near * sheet);
    snow = max(snow, ledgeSnow * (1.0 - sheet));
    // Snow lies on every ledge of the rock: wherever the broken face itself turns up flatter than some forty degrees, and deeper low down
    // and to windward, so the spire stands out of the ridge's own snow.
    float above = vWorld.y - landAt(vWorld.xz).r;
    float low = smoothstep(280.0, 20.0, above);
    // (the lee faces keep their rock: the gale lays its snow on what looks into it)
    low *= smoothstep(-0.25, 0.45, -dot(smoothN.xz, uWind.xz));
    snow = max(snow, smoothstep(0.5 - 0.3 * low, 0.7 - 0.3 * low, 0.7 * nRock.y + 0.3 * smoothN.y + 0.25 * (pit - 0.5) - 0.08 * lee) * (1.0 - burn));
    // Under the lens snow lies only on what the rock itself turns up to the sky; a slab's side keeps none.
    snow *= mix(1.0, smoothstep(0.25, 0.6, 0.5 * (nRock.y + facet.y)), fineRock);
    // A spire stands in the drift at its foot.
    snow = max(snow, smoothstep(5.0, 0.5, above + 3.0 * (pit - 0.5)));
    occ *= 0.55 + 0.45 * smoothstep(0.0, 14.0, above);
    float proud = smoothstep(-9.0, 5.0, vRelief);
    occ *= 0.4 + 0.6 * proud;
    albedo *= 0.75 + 0.25 * proud;
  }
  if (!spire) snow *= 1.0 - sheet;
  snow *= 1.0 - burn;
  if (spire) {
    // Staged by shot (uWet): there the snow keeps to the lee ledges, and the bare rock is wet and near black.
    snow *= mix(1.0, smoothstep(-0.15, 0.3, lee) * smoothstep(0.55, 0.8, n0.y + 0.25 * nRock.y), uWet);
    albedo *= mix(1.0, 0.3, uWet);
    rough = mix(rough, 0.3, uWet);
  }
  float rime = smoothstep(0.15, 0.7, -lee) * smoothstep(0.35, 0.75, pit + 0.3 * vnoise(vWorld.xz * 0.6 + vWorld.y * 0.4)) * (1.0 - burn);
  if (inside) {
    snow = smoothstep(1.6, 0.2, vWorld.y - CANAL_FLOOR + 1.2 * (pit - 0.5)) * 0.85;
    rime = 0.0;
    // The canal is black from outside: what the sky gives its walls is gone a few metres in.
    float lit = uUnder > 1.5 ? 1.0 : exp(-max(min(dCanal, EXIT - dCanal) - 1.0, 0.0) / 7.0);
    snow *= lit;
    rime *= lit;
    occ *= 0.04 + 0.96 * lit;
  }
  if (spire) if (rime + 0.3 > 0.02) {
    // Rime on a spire is the frost picture at its own 3 m, feathered crystal by crystal: thick to windward, a dusting in the lee.
    vec3 rw = abs(smoothN);
    vec3 gx = dFdx(vWorld) / 3.0;
    vec3 gy = dFdy(vWorld) / 3.0;
    bool rX = rw.x > max(rw.y, rw.z);
    bool rY = rw.y > rw.z;
    vec2 atR = rX ? vWorld.zy / 3.0 : rY ? vWorld.xz / 3.0 + 0.4 : vWorld.xy / 3.0 + 0.7;
    vec3 frostC = textureLod(tRime, atR, lodOf(tRime, rX ? gx.zy : rY ? gx.xz : gx.xy, rX ? gy.zy : rY ? gy.xz : gy.xy)).rgb;
    float frostL = dot(frostC, vec3(0.33));
    float crystals = smoothstep(0.15, 0.38, frostL * (0.55 + 0.9 * pit));
    // What looks into the gale is crusted whole, feather on feather; the lee keeps frost only in its cracks.
    float windward = smoothstep(0.05, 0.55, -dot(smoothN.xz, uWind.xz));
    float cover = clamp(0.5 * rime + 0.22 * windward * (1.0 - burn) + 0.42 * smoothstep(0.45, 0.2, pit) * (1.0 - burn) + 0.3 * smoothstep(0.25, 0.6, nRock.y) * (1.0 - burn), 0.0, 0.95) * mix(crystals, 1.0, 0.25 * windward);
    // Staged by shot (uWet): the struck spire in the long lens is wet black rock, with frost only in its cracks.
    cover *= 1.0 - 0.85 * uWet;
    albedo = mix(albedo, min(frostC * 1.6, vec3(0.9)) * vec3(0.93, 0.97, 1.06), cover);
    // The feathers stand out of the rock: their own relief, from the frost picture's light and dark across the face.
    vec3 dPx = dFdx(vWorld);
    vec3 dPy = dFdy(vWorld);
    vec3 gradF = dFdx(frostL) * dPx / max(dot(dPx, dPx), 1e-8) + dFdy(frostL) * dPy / max(dot(dPy, dPy), 1e-8);
    nRock = normalize(nRock - cover * clamp(0.5 * gradF, vec3(-1.5), vec3(1.5)));
    rough = mix(rough, 0.55, cover);
    occ = mix(occ, 0.55 + 0.45 * smoothstep(0.2, 0.6, frostL), 0.7 * cover);
    rime = 0.0;
  }
  albedo = mix(albedo, vec3(0.62, 0.66, 0.72), 0.55 * rime);
  if (inside) {
    albedo = mix(albedo, min(wallRimeC * 1.25, vec3(0.9)) * vec3(0.94, 0.97, 1.05), wallRime);
    rough = mix(0.36, 0.9, wallRime);
  }

  // The snow's own surface: wind crust in long ripples, and the prints.
  vec3 nSnow = normalize(mix(smoothN, n0, 0.35));
  float snowOcc = 1.0;
  vec3 snowTint = vec3(1.0);
  if (!inside) if (snow > 0.0) {
    // Wind-packed snow from its picture, laid across the gale: broad for the drifts' skin far off, fine under the lens.
    vec2 q = vec2(dot(vWorld.xz, vec2(0.98, -0.2)), dot(vWorld.xz, vec2(0.2, 0.98)));
    vec2 qx = dFdx(q);
    vec2 qy = dFdy(q);
    // On a steep face a level picture would be pulled long: there the snow keeps its tone and loses its ripple.
    float flat_ = smoothstep(0.35, 0.7, n0.y);
    vec2 g = vec2(0.0);
#if KIND == 0
    {
      // The ground's snow is its photograph's: the crust, the scoops and the tails behind the stones, in tone and in relief.
      // Seen from far its scoops are under the size of a pixel: the drift keeps its broad tone and lies smooth.
      float footprint = length(fwidth(vWorld.xz));
      float wide = smoothstep(0.03, 0.25, footprint);
      snowTint = mix(vec3(1.0), clamp(crustTint, 0.45, 1.2), top * mix(1.0, 0.4, wide));
      g = t * top * mix(1.0, 0.3, wide);
      // Under the lens a texel of it is many pixels wide: the packed snow's own picture at 4 m, and again at 0.9 m for its grain.
      float fine = smoothstep(0.05, 0.012, footprint) * flat_;
      if (fine > 0.01) {
        Lay f = lay(tSnow, tSnowNh, q / 4.0, qx / 4.0, qy / 4.0);
        snowTint *= mix(vec3(1.0), f.c / SNOW_MEAN, 0.55 * fine);
        g += fine * 0.9 * f.t;
        snowOcc *= 1.0 - 0.3 * fine * smoothstep(0.6, 0.25, f.pit);
        float grain = smoothstep(0.012, 0.003, footprint);
        if (grain > 0.01) {
          Lay k = lay(tSnow, tSnowNh, q.yx / 0.9 + 0.37, qx.yx / 0.9, qy.yx / 0.9);
          snowTint *= mix(vec3(1.0), k.c / SNOW_MEAN, 0.5 * grain);
          g += grain * 0.7 * k.t.yx;
        }
      }
      // The prints of the herd: a line of pits to the mouth, seen as far as a pit is wider than a pixel, and the trough they tread.
      float seen = smoothstep(0.3, 0.08, footprint);
      if (seen > 0.0) {
        vec3 p = prints(vSL);
        g += 1.6 * p.yz * seen;
        snowOcc *= 1.0 + 0.85 * min(p.x, 0.0) * seen;
      }
    }
#else
    {
      // Wind-packed snow from its picture, laid across the gale.
      Lay b = lay(tSnow, tSnowNh, q / 27.0 + 0.4, qx / 27.0, qy / 27.0);
      snowTint = mix(vec3(1.0), b.c / SNOW_MEAN, 0.6 * flat_);
      // Far off the drifts are smooth: their ripple is under the size of a pixel and would only be grain.
      g = b.t * 0.9 * flat_ * smoothstep(1400.0, 350.0, far);
    }
#endif
    nSnow = normalize(nSnow + vec3(g.x, 0.0, g.y));
  }
  // Under a sky without a sun a drift shows by which way its faces lean: the lean of the snow is drawn out for the light.
  if (!spire) nSnow = normalize(vec3(nSnow.x * 1.5, nSnow.y, nSnow.z * 1.5));
  vec3 n = normalize(mix(nRock, nSnow, snow));
  // Packed by the wind in long plates, the snow is glazed and blue-grey; between them it lies soft and white.
  float plate = (ground ? 0.35 : 1.0) * smoothstep(0.4, 0.62, vnoise(vec2(dot(vWorld.xz, vec2(0.98, -0.2)) * 0.11, dot(vWorld.xz, vec2(0.2, 0.98)) * 0.08)));
  albedo = mix(albedo, mix(vec3(0.78, 0.84, 0.93), vec3(0.56, 0.64, 0.78), 0.55 * plate) * clamp(snowTint, 0.4, 1.1), snow);
  rough = mix(rough, 0.88 - 0.3 * plate, snow);
  occ = mix(occ, snowOcc, snow);
  if (!spire) occ *= landHollow(vWorld, n0, 5.0);
  // Where the bolt came to ground: the burned wet rock under the dead one, a plate 14 m across laid square to the lens of that shot.
// Staged by shot: the burn is compiled in only for the shot by the dead one (spine-03). No other lens sees it, and a software renderer pays
// for it on every pixel of the ground otherwise.
#if SCORCH == 1
  if (uKind < 0.5) {
    vec2 dS = vWorld.xz - uScorch.xy;
    vec2 uvS = vec2(dot(dS, uScorchAxes.xy) / 7.0, dot(dS, uScorchAxes.zw) / 3.94) + 0.5;
    vec2 eS = abs(uvS - 0.5);
    if (max(eS.x, eS.y) < 0.5) {
      // Seen low across it, the plate's fine bright lines would lie down into ripples like water: it is read soft, and its contrast is held in.
      vec3 sc = texture2D(tScorch, uvS).rgb;
      float lum = dot(sc, vec3(0.3, 0.5, 0.2));
      // Burned rock is dark and wet; under the lens the burn's own close picture (2.4 m) gives it its cracks and glass.
      vec3 near_ = texture2D(tScorchD, dS / 2.4).rgb;
      float close = smoothstep(0.02, 0.004, length(fwidth(vWorld.xz)));
      sc = clamp(sc * 3.2 * mix(vec3(1.0), near_ / 0.16, 0.9 * close), vec3(0.018, 0.018, 0.02), vec3(0.6));
      // The plate's own snow goes into the snow of the place at its rim; its burn keeps to the middle, ragged by the picture's own dark.
      float out_ = length((uvS - 0.5) * vec2(1.0, 0.9)) / 0.26;
      // Tongues of new snow lie across it down the gale.
      float tongue = vnoise(vec2(dot(vWorld.xz, uWind.xz) * 0.35, dot(vWorld.xz, vec2(-uWind.z, uWind.x)) * 1.6));
      float scorch = 0.85 * smoothstep(1.0, 0.55, out_ + 0.9 * (lum - 0.3) + 0.7 * (tongue - 0.45));
      vec2 px = 4.0 / vec2(textureSize(tScorchH, 0));
      float h0 = texture2D(tScorchH, uvS).r;
      float du = (texture2D(tScorchH, uvS + vec2(px.x, 0.0)).r - h0) / (px.x * 7.0);
      float dv = (texture2D(tScorchH, uvS + vec2(0.0, px.y)).r - h0) / (px.y * 3.94);
      // Burned rock, wet but broken: it is rough, and only its hollows hold a little water. The relief is laid at a low strength.
      vec3 nS = normalize(vec3(0.0, 1.0, 0.0) - 0.022 * (vec3(uScorchAxes.x, 0.0, uScorchAxes.y) * du + vec3(uScorchAxes.z, 0.0, uScorchAxes.w) * dv));
      albedo = mix(albedo, sc, scorch);
      n = normalize(mix(n, nS, scorch));
      // Melt water stands in its hollows and glints; its heads are wet rock.
      rough = mix(rough, 0.1 + 0.55 * smoothstep(0.25, 0.6, h0), scorch);
      occ = mix(occ, 0.6 + 0.4 * h0, scorch);
    }
  }
#endif

  // The rock that stands over the canal is in the open, though the canal's roof is behind it: it is lit as from above that roof.
  vec3 lightAt = vWorld;
  if (!inside) if (dCanal > 0.0 && dCanal < EXIT && abs(vSL.y - canalAt(dCanal)) < 60.0) lightAt.y += 16.0;
  vec3 c = rigShade(lightAt, n, v, albedo, rough, occ);
  if (inside) if (uUnder > 1.5) {
    // Inside, the two mouths are the windows: cold light on what faces them, and the far mouth seen in the glaze of ice on the rock.
    c += albedo * windowLight(vWorld, normalize(mix(n, normalize(EXIT_AT + vec3(0.0, 6.0, 0.0) - vWorld), 0.55 * wallRime))) * (0.3 + 0.7 * pit) * (6.5 + 2.5 * wallRime) / 3.14159 + windowGlaze(vWorld, n, v, 2.5) * (1.0 - wallRime) * 1.6;
  }
  if (inside) if (uUnder < 1.5) {
    float shown = exp(-max(min(dCanal, EXIT - dCanal) - 1.0, 0.0) / 9.0);
    c = c * (0.03 + 0.97 * shown) + vec3(0.0035, 0.0045, 0.0085) * (1.0 - shown);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The floor of the canal: the ice floor picture (8 m across, snow banked at its edges, stones and ridges in it), laid at its one size and
// turned over every second length, with its relief lit at a low strength. The ice is wet: it mirrors the far mouth and the sky in it.
export const ICE_VERTEX = /* glsl */ `
attribute float aHalf;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vAcross;
varying float vHalf;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vAcross = uv;
  vHalf = aHalf;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const ICE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vAcross;
varying float vHalf;
uniform sampler2D tIce;
uniform sampler2D tIceH;
${RIG_GLSL}
${NOISE_GLSL}
${WINDOW_GLSL}

void main() {
  vec3 toCamera = cameraPosition - vWorld;
  vec3 v = normalize(toCamera);
  // Metres across the floor from its middle, and along it.
  vec2 m = vec2(vAcross.x * vHalf, vAcross.y);
  // The plate lies once across the middle of the floor, its own snow at its two edges; beyond them the floor is the snow banked at the walls.
  vec2 uv = vec2(clamp(0.5 + m.x / 8.0, 0.015, 0.985), wMirror(m.y / 11.55));
  vec2 gx = dFdx(m) / vec2(8.0, 11.55);
  vec2 gy = dFdy(m) / vec2(8.0, 11.55);
  vec3 plate = textureGrad(tIce, uv, gx, gy).rgb;
  float lum = dot(plate, vec3(0.3, 0.5, 0.2));
  // Its slopes, from the relief read a little soft; which way they lean in the world follows the turning over of the plate.
  vec2 px = 3.0 / vec2(textureSize(tIceH, 0));
  float h0 = textureGrad(tIceH, uv, gx, gy).r;
  float du = (textureGrad(tIceH, uv + vec2(px.x, 0.0), gx, gy).r - h0) / (px.x * 8.0);
  float dv = (textureGrad(tIceH, uv + vec2(0.0, px.y), gx, gy).r - h0) / (px.y * 11.55);
  dv *= mod(floor(m.y / 11.55), 2.0) < 0.5 ? 1.0 : -1.0;
  vec3 along = normalize(dFdx(vWorld) * dFdy(m.x) - dFdy(vWorld) * dFdx(m.x));
  if (dot(along, EXIT_DIR) < 0.0) along = -along;
  vec3 side = vec3(-along.z, 0.0, along.x);
  // Snow where the plate is pale and stands high: there the floor is matt. Elsewhere it is wet ice.
  float snow = smoothstep(0.1, 0.32, lum) * smoothstep(0.3, 0.6, h0 + lum);
  // Melt water runs down the middle, wandering: smooth, dark and glossy, the mouth whole in it. Snow is banked against both walls.
  float wander = 2.2 * (vnoise(vec2(m.y * 0.11, 3.0)) - 0.5);
  float run = smoothstep(1.5, 0.6, abs(m.x - wander) + 0.6 * (vnoise(m * 0.9) - 0.5));
  float bank = max(smoothstep(0.34, 0.74, abs(m.x) / max(vHalf, 1.0) + 0.3 * (vnoise(m * 0.35) - 0.5)), smoothstep(3.3, 3.95, abs(m.x)));
  // Where the floor stands over the ice it is the drift itself: its snow, and its own lean from the mesh.
  float raised = smoothstep(0.03, 0.14, vWorld.y - CANAL_FLOOR - 0.03);
  bank = max(bank * step(m.x, 0.0), raised);
  run *= 1.0 - raised;
  snow = max(snow * (1.0 - run), bank);
  vec3 up = normalize(mix(vec3(0.0, 1.0, 0.0), normalize(vNormal), raised));
  vec3 n = normalize(up - (side * du + along * dv) * mix(0.035, 0.12, snow) * (1.0 - 0.85 * run) * (1.0 - bank)
    - bank * 0.25 * vec3(vnoise(m * 1.3) - 0.5, 0.0, vnoise(m * 1.3 + 5.1) - 0.5));
  vec3 ice = min(plate * 4.2 + 0.26, vec3(0.7)) * mix(1.0, 0.3, run);
  vec3 albedo = mix(ice, mix(min(plate * 2.6, vec3(0.86)), vec3(0.78, 0.83, 0.9), bank), snow);
  float occ = 0.6 + 0.4 * smoothstep(0.1, 0.5, h0);
  vec3 c = rigShade(vWorld, n, v, albedo, 1.0, occ) + albedo * windowLight(vWorld, normalize(n + 0.6 * normalize(EXIT_AT - vWorld))) * occ * 5.0 / 3.14159;
  // The mirror: the far mouth and the sky in it, broken by the ice's own heave; outside the mouth it mirrors the dark of the rock.
  vec3 nm = normalize(vec3(0.0, 1.0, 0.0) - (side * du + along * dv) * 0.02 * (1.0 - 0.8 * run) + 0.012 * vec3(vnoise(vWorld.xz * 0.7) - 0.5, 0.0, vnoise(vWorld.xz * 0.7 + 7.3) - 0.5));
  vec3 r = reflect(-v, nm);
  r.y = abs(r.y);
  float nv = clamp(dot(nm, v), 0.0, 1.0);
  float fres = mix(0.04 + 0.96 * pow(1.0 - nv, 5.0), 0.12 + 0.88 * pow(1.0 - nv, 3.0), run);
  float open = uUnder > 1.5 ? throughExit(vWorld, r) : 0.0;
  // Where it does not mirror the mouth it mirrors the wall over it: pale stone under the mouths' light.
  vec3 wallSeen = vec3(0.3, 0.32, 0.36) * windowLight(vWorld + r * 9.0, -r) * 3.2 / 3.14159;
  vec3 seen = windowSky(r, 1.0 + 3.0 * snow) * open + wallSeen * (1.0 - open);
  c += seen * fres * (1.0 - 0.92 * snow) * (0.75 + 0.25 * smoothstep(0.2, 0.05, lum));
  if (uUnder < 1.5) {
    // From outside the canal is dark a few metres in: its floor with it.
    float shown = exp(-max(min(vAcross.y, EXIT_FAR - vAcross.y) - 1.0, 0.0) / 9.0);
    c = c * (0.03 + 0.97 * shown) + vec3(0.0035, 0.0045, 0.0085) * (1.0 - shown);
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The icicles on the lip of the far mouth and along the roof behind it: ice, pale against the rock and dark against the sky, with the
// sky seen through them bent.
export const ICICLE_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vAlong;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vAlong = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const ICICLE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vAlong;
${RIG_GLSL}
${WINDOW_GLSL}

void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, v) < 0.0) n = -n;
  vec3 albedo = mix(vec3(0.62, 0.68, 0.76), vec3(0.4, 0.48, 0.6), vAlong.y);
  vec3 c = rigShade(vWorld, n, v, albedo, 0.3, 1.0) + albedo * windowLight(vWorld, n) * 3.2 / 3.14159;
  if (uUnder > 1.5) {
    // What is behind it, seen through it and bent: the sky where the far mouth is behind, the dark rock elsewhere.
    vec3 bent = normalize(-v - 0.45 * n);
    c += windowSky(normalize(vec3(bent.x, abs(bent.y) + 0.03, bent.z)), 3.0) * throughExit(vWorld, bent) * 0.55;
    c += windowGlaze(vWorld, n, v, 6.0) * 3.0;
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The crag near the long lens of the strike: dark broken rock with snow lying on it in patches. It is seen far out of focus, so it is patches
// of the two and their light, and nothing finer.
export const CRAG_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
export const CRAG_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
${RIG_GLSL}
${NOISE_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 at = vec2(vWorld.x * 0.8 + vWorld.z * 0.6, vWorld.y);
  float broad = fbm(at * 1.7 + 4.0);
  float fine = fbm(at * 6.5 + 11.0);
  // Snow lies where the rock is level and in its hollows; the faces between are bare.
  // (In its hollows: the rock's edges stand dark out of it, as veins between the drifts, and it is thin old snow, not white.)
  float veins = smoothstep(0.07, 0.025, abs(fine - 0.5)) + smoothstep(0.05, 0.02, abs(broad - 0.52));
  float snow = smoothstep(0.5, 0.42, 0.55 * broad + 0.45 * fbm(at * 3.4 + 7.0)) * smoothstep(-0.25, 0.25, n.y) * (1.0 - min(veins, 1.0)) * 0.75;
  vec3 rock = mix(vec3(0.07, 0.052, 0.045), vec3(0.34, 0.23, 0.16), smoothstep(0.3, 0.75, fine) * smoothstep(0.35, 0.6, broad + 0.2));
  vec3 albedo = mix(rock, vec3(0.5, 0.53, 0.6), snow);
  n = normalize(n + (1.0 - snow) * 0.9 * (vec3(fine, broad, 1.0 - fine) - 0.5));
  // It stands in the open off the spire's edge: the sky lights it whole (the land's own shelter is of the ground under it, far below),
  // and the stroke lights the side that looks at it.
  float occ = mix(0.55 + 0.45 * fine, 1.0, snow);
  // Its tone is set by number against its picture, where it is lit brown stone and pale snow: the snow of the spire's shoulder under it
  // throws the sky back up at it.
  vec3 c = albedo * (skyIrradiance(n) * 3.6 + emitterIrradiance(vWorld, n)) * occ / 3.14159;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
