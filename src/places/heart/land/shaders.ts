// The shaders of the land. One ground shader in three variants (the wall and the country, the bench, the bench by the camera)
// and one for the loose rocks. All take their light from the rig, composed here from the functions under rigShade so that
// the land map is read once for each pixel.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { BUTTRESS, MOUTH } from '../layout';
import { WALL_TONE } from './rock';

const BUTTRESS_LINE = `vec4(${BUTTRESS.root[0].toFixed(1)}, ${BUTTRESS.root[1].toFixed(1)}, ${BUTTRESS.tip[0].toFixed(1)}, ${BUTTRESS.tip[1].toFixed(1)})`;

export const GROUND_VERTEX = /* glsl */ `
attribute vec3 aSlope;
attribute vec2 aLand;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vLand;
void main() {
  vWorld = position;
  vNormal = aSlope;
  vLand = aLand;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

// The tones of the rock, set by measuring the frames against the pictures under the frozen light (version 2):
// charcoal basalt at dusk. Albedo of the wall near 0.1, of the ropy bench 0.05 to 0.09, ash in hollows 0.2 at most.
const BENCH_TONE = 0.62;
const BENCH_FACE_TONE = 0.58;

const COMMON = /* glsl */ `
precision highp float;
${NOISE_GLSL}
${RIG_GLSL}

// The lake leaves a black rind on whatever stands in it, to an uneven height, so the level line where land meets
// lake does not read as a ruled edge from the far lenses. Kept off the bench, whose shore has its own lip.
float lakeRind(vec3 p) {
  float top = 0.3 + 3.2 * pow(vnoise(p.xz / 23.0 + 5.0), 1.5) + 1.2 * vnoise(p.xz / 4.3);
  float away = max(smoothstep(-440.0, -400.0, p.x), smoothstep(12.0, 9.0, distance(p.xz, vec2(-453.4, 241.2))));
  return (1.0 - smoothstep(0.45 * top, top, p.y)) * away;
}

// rigShade with the land map already read. The lake's light is read with four taps near the lake and with one above it
// (FAR_LIGHT: always one); only a glazed face (GLAZE) is given the sky and the lake as a mirror would see them.
// No material asks for GLAZE now: the rock of the bench is dry and matte.
vec3 landShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ, vec4 land, float shade, float graze) {
  float above = p.y - land.r;
  float vis = mix(land.g, 1.0, clamp(above / 80.0, 0.0, 1.0));
  float open = vis * (1.0 - shade) * occ;
  #ifdef FAR_LIGHT
  vec3 lake = lakeIrradianceFar(p, n);
  #else
  vec3 lake;
  if (p.y > 8.0) lake = lakeIrradianceFar(p, n);
  else if (p.y < 5.0) lake = lakeIrradiance(p, n);
  else lake = mix(lakeIrradiance(p, n), lakeIrradianceFar(p, n), (p.y - 5.0) / 3.0);
  #endif
  vec3 sky = skyIrradiance(n);
  // A gap closed to the sky is half open to the fire, which comes from the side and from below.
  // What stands over a gap closes it to the fire as well, though less: the fire comes in from the side.
  vec3 e = sky * open + (lake + emitterIrradiance(p, n)) * (pow(occ, 0.75) * (1.0 - 0.75 * shade) * graze);
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  // Clinker and ash are matte: a rough face keeps no sheen even seen along itself.
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * 2.0 * (1.0 - rough) * (1.0 - rough);
  #ifdef GLAZE
  vec3 r = reflect(-v, n);
  // A glazed face that looks down at the lake carries the lake in it.
  vec3 glint = vec3(0.0);
  if (r.y < 0.0 && rough < 0.8) {
    float reach = min(max(p.y, 0.3) / max(-r.y, 0.08), 60.0);
    glint = lakeGlow(p.xz + r.xz * reach, 0.6 + reach * rough) * occ;
  }
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), sky / 3.14159, rough * rough);
  return c + f * (env * open + glint);
  #else
  return c + f * sky * (open / 3.14159);
  #endif
}

float segmentDistance(vec2 p, vec4 s) {
  vec2 e = s.zw - s.xy;
  float t = clamp(dot(p - s.xy, e) / dot(e, e), 0.0, 1.0);
  return length(p - s.xy - e * t);
}
`;

// Defines: BENCH (ropy lava on the flats, the sulphur of the crack), NEAR (a second, finer reading of the rock for the camera's bench), FAR_LIGHT, GLAZE,
// BUTTRESS (its tone), STAGED (the butte staged for one shot).
/** The bank the wide view starts from and passes over, x and z in metres: the ground cut fine under that lens, and read at the scale of a hand. */
export const FEET = { x0: -620, x1: -552, z0: 256, z1: 346 };
/** How far inside that box the reading at the scale of a hand comes in, metres. */
export const FEET_FADE = 6;

export const GROUND_FRAGMENT = /* glsl */ `
${COMMON}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vLand;
uniform sampler2D tCliff;
uniform sampler2D tCliffNh;
uniform sampler2D tLava;
uniform sampler2D tLavaNh;
uniform sampler2D tTalus;
uniform sampler2D tTalusNh;
uniform sampler2D tBoulder;
uniform sampler2D tBoulderNh;
uniform sampler2D tSulphur;
uniform vec4 uCrackA;
uniform vec4 uCrackB;
uniform vec4 uStain;
uniform vec4 uSpur;

// Every picture is read with slopes taken from the world position at the top of main: a read inside a branch that took its own slope
// would take it from a neighbour that never computed the coordinate, and the frame would differ from one page load to the next.
#define PICK(t, uv, gx, gy) textureGrad(t, uv, gx, gy)
#ifdef HAND
// Plates of cooled lava. x: how far p lies from the nearest gap between two plates, in cells. y: a number of the plate's own.
vec2 plates(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float d1 = 8.0;
  float d2 = 8.0;
  float own = 0.0;
  for (int b = -1; b <= 1; b++) {
    for (int a = -1; a <= 1; a++) {
      vec2 c = vec2(float(a), float(b));
      vec2 h = hash22(i + c);
      float d = length(c + 0.15 + 0.7 * h - f);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        own = h.x;
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  return vec2(0.5 * (d2 - d1), own);
}
#endif
const mat2 TURN = mat2(0.7986, -0.6018, 0.6018, 0.7986);

void main() {
  vec3 n0 = normalize(vNormal);
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  vec3 v = toCamera / far;
  vec4 land = landAt(vWorld.xz);
  float big = vnoise(vWorld.xz / 47.0 + 3.0);
  float mid = vnoise(vWorld.xz / 6.1);
  // Every picture is read with its own gradients, so a read inside a branch is as well defined as one outside.
  vec3 wx = dFdx(vWorld);
  vec3 wy = dFdy(vWorld);
  // Metres of ground under one pixel: what is finer than this is left out, whatever the lens.
  float px = max(length(wx), length(wy));
  float sharp = smoothstep(0.8, 0.12, px);
  // The rubble under the line view's lens.
  float byLens = smoothstep(26.0, 12.0, distance(vWorld.xz, vec2(-510.5, 215.5))) * smoothstep(3.0, 1.5, vWorld.y);
  #ifdef BENCH
  // The bank the wide view stands on and passes over. Its lens is 4 to 30 m from that ground and a pixel of the film is 2 to 10 mm of it,
  // where the pictures laid for the far views (5, 11 and 29 m a tile) give 1 to 3 cm a texel: there the rock is read again at the size it was taken at.
  // Only the sheets of that bank are built with HAND: every read below is paid by every pixel of a material, drawn on or not.
  // Its middle is built with CORE as well, without what cannot reach it: the line view's rubble (58 m off), the sulphur of the cracks
  // (12 m off, and it ends at 9) and the stained crag (70 m off).
  #ifdef HAND
  vec2 inFeet = min(vWorld.xz - vec2(${FEET.x0.toFixed(1)}, ${FEET.z0.toFixed(1)}), vec2(${FEET.x1.toFixed(1)}, ${FEET.z1.toFixed(1)}) - vWorld.xz);
  float hand = smoothstep(0.0, ${FEET_FADE.toFixed(1)}, min(inFeet.x, inFeet.y)) * smoothstep(64.0, 32.0, far);
  #else
  float hand = 0.0;
  #endif
  #endif
  // Where the mesh steps up in a single row of faces its smoothed normal still looks at the sky: the face itself says how steep it is,
  // so no picture laid from above is drawn out down a wall.
  vec3 ng = normalize(cross(wx, wy));
  ng *= sign(dot(ng, n0) + 1e-5);
  // Not on the heap under the line view's lens: its lumps are a few faces each, and a steepness told face by face showed every one of them.
  float slope = max(1.0 - n0.y, (0.88 - abs(ng.y)) * (1.0 - byLens));
  #ifdef BENCH
  float steep = smoothstep(0.25, 0.39, slope + 0.1 * (mid - 0.5));
  #else
  float steep = smoothstep(0.35, 0.49, slope + 0.12 * (mid - 0.5));
  #endif

  vec3 cliff = vec3(0.0);
  vec3 cliffNh = vec3(0.5);
  vec3 bump = vec3(0.0);
  vec3 lean = vec3(0.0);
  float ledge = 1.0;
  // Which upright plane a face's pictures are laid on, from the smooth normal of the land and not from the triangle's own:
  // the two layings cross over a quarter turn of the face, so no triangle's edge shows as a change of grain.
  float kx = smoothstep(0.26, 0.74, n0.x * n0.x / (n0.x * n0.x + n0.z * n0.z + 1e-5));
  if (steep > 0.003 && byLens < 0.999) {
    // The wall: each lava flow reads the cliff picture at its own place, so the bands run level and no two repeat.
    // The wall and the crags of the bench are massive rock broken along joints, and no stack of beds: nothing of them is read by its height.
    float shift = 0.0;
    const float wander = 0.0;
    #ifndef BENCH
    // Round the mouth the wall turns through every direction: there the picture is laid by world position on three axes, with no jump from flow to flow.
    float beside = abs(vWorld.x - (${MOUTH.x.toFixed(1)}));
    float alcove = smoothstep(${(MOUTH.width / 2 + 27).toFixed(1)}, ${(MOUTH.width / 2 + 7).toFixed(1)}, beside) * smoothstep(${(MOUTH.z - 72).toFixed(1)}, ${(MOUTH.z - 58).toFixed(1)}, vWorld.z);
    shift *= 1.0 - alcove;
    #endif
    // The picture is three wide to two tall. The low crags of the bench are the same rock seen close: the picture at an eighth of the size.
    #ifdef BENCH
    const vec2 CLIFF = vec2(19.5, 13.0);
    #else
    // On the wall a texel of it is a hand's width: what the long lens resolves.
    const vec2 CLIFF = vec2(150.0, 100.0);
    #endif
    cliffNh = vec3(0.0);
    if (kx > 0.003) {
      vec2 uv = vWorld.zy / CLIFF + vec2(shift, wander);
      vec3 c = PICK(tCliff, uv, wx.zy / CLIFF, wy.zy / CLIFF).rgb;
      vec3 r = PICK(tCliffNh, uv, wx.zy / CLIFF, wy.zy / CLIFF).rgb;
      cliff += c * kx;
      cliffNh += r * kx;
      bump += kx * (vec3(0.0, 0.0, 1.0) * (r.r - 0.5) - vec3(0.0, 1.0, 0.0) * (r.g - 0.5));
    }
    if (kx < 0.997) {
      vec2 uv = vWorld.xy / CLIFF + vec2(shift, wander);
      vec3 c = PICK(tCliff, uv, wx.xy / CLIFF, wy.xy / CLIFF).rgb;
      vec3 r = PICK(tCliffNh, uv, wx.xy / CLIFF, wy.xy / CLIFF).rgb;
      cliff += c * (1.0 - kx);
      cliffNh += r * (1.0 - kx);
      bump += (1.0 - kx) * (vec3(1.0, 0.0, 0.0) * (r.r - 0.5) - vec3(0.0, 1.0, 0.0) * (r.g - 0.5));
    }
    #ifdef HAND
    // Under the wide lens the picture of the crags is enlarged five to ten times and its beds are streaks: there it counts for half.
    cliff = mix(cliff, vec3(0.103, 0.086, 0.079), 0.5 * hand);
    bump *= 1.0 - 0.4 * hand;
    #endif
    #ifndef BENCH
    float ky = alcove * smoothstep(0.12, 0.45, n0.y * n0.y);
    if (ky > 0.003) {
      vec2 uv = vWorld.xz / CLIFF;
      vec3 c = PICK(tCliff, uv, wx.xz / CLIFF, wy.xz / CLIFF).rgb;
      vec3 r = PICK(tCliffNh, uv, wx.xz / CLIFF, wy.xz / CLIFF).rgb;
      cliff = mix(cliff, c, ky);
      cliffNh = mix(cliffNh, r, ky);
      bump *= 1.0 - ky;
    }
    #endif
    #ifndef BENCH
    // What the large picture cannot hold is read again at the scale of a block: broken faces a metre or two across, with their own shade.
    cliff *= 1.3;
    if (px < 0.7) {
      // Laid on both upright planes and crossed by the face's direction, as the cliff picture is.
      // A face that looks squarely along one axis is read on one plane only: the other counts for nothing there.
      vec3 frz = vec3(0.5);
      vec3 frx = vec3(0.5);
      if (kx > 0.003) frz = PICK(tBoulderNh, vWorld.zy / 17.0 + vec2(0.37, 0.11), wx.zy / 17.0, wy.zy / 17.0).rgb;
      if (kx < 0.997) frx = PICK(tBoulderNh, vWorld.xy / 17.0 + vec2(0.37, 0.11), wx.xy / 17.0, wy.xy / 17.0).rgb;
      vec3 fr = mix(frx, frz, kx);
      float on = smoothstep(0.7, 0.3, px);
      #ifdef STAGED
      // The staged butte is seen soft, far behind the focus: blocks a metre or two across would read as spots on it.
      on *= 0.3;
      #endif
      cliff *= mix(1.0, 0.5 + 1.0 * fr.b, on);
      cliffNh.b = mix(cliffNh.b, cliffNh.b * (0.4 + 1.2 * fr.b), on);
      bump += on * 0.9 * (kx * vec3(0.0, 0.0, 1.0) * (frz.r - 0.5) + (1.0 - kx) * vec3(1.0, 0.0, 0.0) * (frx.r - 0.5) - vec3(0.0, 1.0, 0.0) * (fr.g - 0.5));
    }
    #endif
    // Hard flows are darker and stand proud, the rubble between them is paler; streaks run down the face.
    float streak = vnoise(vec2((vWorld.x + vWorld.z) * 0.21, vWorld.y * 0.018 + big * 2.0));
    #ifdef BENCH
    // One dark rock in masses a few metres across, as the wall is in masses of tens.
    cliff *= 1.1 * (0.8 + 0.4 * streak) * (0.6 + 0.8 * vnoise3(vWorld / 5.3 + 2.7));
    #else
    // The wall is one dark rock in masses tens of metres across, some sooted, some weathered paler.
    float mass = vnoise3(vWorld / 43.0 + 2.7);
    cliff *= (0.87 + 0.26 * streak) * (0.5 + 1.0 * mass);
    // A few fresh breaks, buff against the soot.
    float fresh = smoothstep(0.7, 0.82, vnoise(vec2(vWorld.x + vWorld.z, vWorld.y * 1.3) / 13.0 + 5.3)) * smoothstep(0.45, 0.65, cliffNh.b);
    cliff = mix(cliff, vec3(0.2, 0.172, 0.135) * (0.55 + 0.9 * cliffNh.b), 0.55 * fresh);
    // What a long lens resolves: here and there a block is broken back to fresh rock, buff and cream, and catches the fire's light.
    // Right of the mouth, and on the wall that stands behind the ramp's head left of it; not on the ramp.
    float fineLens = smoothstep(0.3, 0.1, px);
    float buffSide = max(smoothstep(66.0, 94.0, vWorld.x - (${MOUTH.x.toFixed(1)})), smoothstep(-100.0, -118.0, vWorld.x) * smoothstep(-215.0, -180.0, vWorld.x) * smoothstep(60.0, 85.0, vWorld.y));
    if (fineLens * buffSide > 0.0) {
      float buff = smoothstep(0.56, 0.68, vnoise3(vWorld / vec3(17.0, 11.0, 17.0) + 1.3)) * smoothstep(0.45, 0.7, cliffNh.b);
      cliff = mix(cliff, vec3(0.5, 0.37, 0.19) * (0.5 + cliffNh.b), 0.85 * fineLens * buff * buffSide);
    }
    #endif
  }

  #ifdef BENCH
  // The heap of clinker under the line view's lens has no cliff in it: the side of a lump is a broken face of the same clinker, not a face of
  // bedded rock a hundred times its size, whose beds would ring every lump like the grain of wood.
  bump *= 1.0 - byLens;
  lean *= 1.0 - byLens;
  ledge = mix(ledge, 1.0, byLens);
  cliff = mix(cliff, vec3(0.05, 0.042, 0.037), byLens);
  #endif
  // The flats.
  vec3 plain = vec3(0.0);
  vec3 plainNh = vec3(0.5);
  vec2 tip = vec2(0.0);
  float rough = 0.92;
  float sheet = 0.0;
  float fold = 0.5;
  if (steep < 0.997) {
    #ifdef BENCH
    // Ropy sheets on the level treads, cinder and rubble on everything that slopes, in patches tens of metres across.
    float ropy = smoothstep(0.42, 0.58, vnoise(vWorld.xz / 23.0 + 11.0) + 0.3 * (mid - 0.5) - 0.9 * smoothstep(0.06, 0.2, slope) + 0.7 * smoothstep(19.0, 11.0, length(vWorld.xz - vec2(-573.0, 298.0))) * smoothstep(0.34, 0.16, slope));
    // The last metres before the line are rubble and clinker under ash, lumpy and matte: no sheet of glass lies there.
    ropy *= smoothstep(3.0, 9.0, land.b + 5.0 * (mid - 0.5));
    // Nor in the heap of clinker under the line view's lens.
    ropy *= 1.0 - byLens;
    sheet = ropy;
    const float TALUS = 5.0;
    #else
    const float ropy = 0.0;
    const float TALUS = 8.0;
    #endif
    // Under the line view's lens none of this is kept: the heap has its own reading below.
    if (ropy < 0.997 && byLens < 0.999) {
      vec2 p1 = vWorld.xz / TALUS;
      vec3 talus = PICK(tTalus, p1, wx.xz / TALUS, wy.xz / TALUS).rgb;
      plainNh = PICK(tTalusNh, p1, wx.xz / TALUS, wy.xz / TALUS).rgb;
      plain = talus * (0.8 + 0.7 * big) * (0.85 + 0.3 * mid);
      #ifndef BENCH
      // The apron is rubble in every size: the same relief again three and a half times larger, so that blocks of metres lie in the scree and its gaps are black.
      vec3 coarse = PICK(tTalusNh, TURN * vWorld.xz / 27.0 + 0.31, TURN * wx.xz / 27.0, TURN * wy.xz / 27.0).rgb;
      plain *= (0.5 + 1.0 * coarse.b) * (0.62 + 0.76 * vnoise(vWorld.xz / 29.0 + 4.1));
      plainNh = vec3(plainNh.rg + 1.6 * (TURN * (coarse.rg - 0.5)), plainNh.b * (0.35 + 1.3 * coarse.b));
      // The ledges up the wall are the black tops of flows under a little rubble, not pale scree.
      plain *= mix(0.78, 0.6, smoothstep(48.0, 85.0, vWorld.y));
      #endif
      // Fans of fine pale scree run down the fall line between the coarse dark rubble.
      vec2 fall = n0.xz / max(length(n0.xz), 1e-3);
      float fan = vnoise(vec2(dot(vWorld.xz, vec2(-fall.y, fall.x)) / 9.0, vWorld.y / 55.0 + big));
      #ifdef BENCH
      // Not on the heap of clinker under the line view's lens: there the fall line turns round every lump and the fans would wrinkle it.
      plain = mix(plain, vec3(0.15, 0.14, 0.13) * (0.5 + plainNh.b), 0.55 * smoothstep(0.5, 0.8, fan) * smoothstep(0.08, 0.3, slope) * (1.0 - byLens));
      #else
      // Under a cliff the apron is scree before it is anything else: pale against the faces above it.
      plain = mix(plain, vec3(0.15, 0.14, 0.13) * (0.5 + plainNh.b), (0.1 + 0.45 * smoothstep(0.35, 0.75, fan)) * smoothstep(0.08, 0.3, slope));
      #endif
      tip = (plainNh.rg - 0.5) * vec2(1.0, -1.0);
    }
    #ifdef BENCH
    if (ropy > 0.003) {
      // Folds a hand to a forearm thick, in ropes that run metres: large enough to read from the wide lens.
      vec2 q1 = vWorld.xz / 11.0;
      vec2 q2 = TURN * vWorld.xz / 29.0 + 0.71;
      // The fine ropes are read a level and a half down the picture's pyramid: they are there, faintly, at the fronts of the billows, and never as stripes.
      // Under the wide lens they are read as sharp as the picture is.
      float soft = mix(2.83, 1.0, hand);
      vec3 lavaA = PICK(tLava, q1, soft * wx.xz / 11.0, soft * wy.xz / 11.0).rgb;
      vec3 lavaNhA = PICK(tLavaNh, q1, soft * wx.xz / 11.0, soft * wy.xz / 11.0).rgb;
      vec3 lavaNhB = PICK(tLavaNh, q2, TURN * wx.xz / 29.0, TURN * wy.xz / 29.0).rgb;
      // Close to, the billows of the large picture count for less than the ropes on them: magnified, they are a smear.
      vec3 lava = mix(lavaA, vec3(0.0708, 0.0672, 0.0702), 0.5 * hand) * mix(0.6 + 0.9 * lavaNhB.b, 1.05, 0.5 * hand) * (0.8 + 0.4 * big);
      vec2 lavaTip = (0.4 - 0.15 * hand) * (lavaNhA.rg - 0.5) * vec2(1.0, -1.0) + (0.9 - 0.4 * hand) * (TURN * ((lavaNhB.rg - 0.5) * vec2(1.0, -1.0)));
      plain = mix(plain, lava, ropy);
      plainNh = mix(plainNh, vec3(lavaNhA.rg, lavaNhA.b * (0.5 + lavaNhB.b)), ropy);
      tip = mix(tip, lavaTip * 2.0, ropy);
      fold = mix(lavaNhA.b, lavaNhB.b, 0.6 - 0.3 * hand);
      // The skin of a billow is satin: a broad dull sheen on its back, no streak of white along a rope.
      rough = mix(0.92, 0.84, ropy * smoothstep(0.35, 0.7, lavaNhB.b));
    }
    #endif
  }

  vec3 albedo = mix(plain, cliff, steep);
  // The pictures' rock leans warm (red over blue near 1.2): charcoal with a little brown, never blue.
  #ifdef BENCH
  albedo = mix(albedo, dot(albedo, vec3(0.3333)) * vec3(1.07, 0.99, 0.92), 0.8);
  #else
  // The wall keeps the browns and rusts of its picture.
  albedo = mix(albedo, dot(albedo, vec3(0.3333)) * vec3(1.07, 0.99, 0.92), mix(0.8, 0.4, steep));
  #endif
  #ifdef BENCH
  // The faces of the bench's crags are broken rock with ash on every ledge, paler than the glassy flats.
  albedo *= mix(${BENCH_TONE.toFixed(2)}, ${BENCH_FACE_TONE.toFixed(2)}, steep);
  #else
  albedo *= ${WALL_TONE.toFixed(2)};
  #endif
  float height = mix(plainNh.b, cliffNh.b, steep);
  #ifndef BENCH
  // The wall west of the fall's cone, measured against the wide picture (60 58 62 there, where this rock gave 41 36 35): pale ash lies on it.
  albedo *= 1.0 + 0.5 * smoothstep(-245.0, -300.0, vWorld.x) * smoothstep(-120.0, -200.0, vWorld.z);
  // The buttress stands in the lake: the flank that looks at the fountains is baked by them, its lower faces rusted and paler than the rest.
  vec4 spur = ${BUTTRESS_LINE};
  float onSpur = smoothstep(${(BUTTRESS.half * 2.4).toFixed(1)}, ${(BUTTRESS.half * 1.6).toFixed(1)}, segmentDistance(vWorld.xz, spur));
  if (onSpur > 0.0) {
    vec2 along = spur.zw - spur.xy;
    float toTip = clamp(dot(vWorld.xz - spur.xy, along) / dot(along, along), 0.0, 1.0);
    float baked = onSpur * smoothstep(-0.2, 0.5, dot(n0.xz, vec2(-0.97, 0.25)) + 0.3 * (big - 0.5)) * smoothstep(0.25, 0.7, toTip) * smoothstep(130.0, 20.0, vWorld.y + 40.0 * (mid - 0.5));
    // A butte of the darkest rock in the caldera, eroded and sooted; only the flank the fountains bake is paler.
    // Measured against the wide picture: its butte is the darkest rock of the far shore.
    albedo *= mix(1.0, 0.54, onSpur);
    albedo = mix(albedo, (albedo + 0.015) * vec3(2.9, 1.7, 1.15), 0.4 * baked);
  }
  #endif
  #ifdef BENCH
  // The folds of a ropy sheet: black in the creases, the skin grey on the crests.
  albedo *= mix(1.0, 0.5 + 1.0 * smoothstep(0.2, 0.8, fold), sheet);
  // Ash settles on everything that faces up, thickest in the hollows, thin on the glass of the ropy sheets; faces and undersides keep their black.
  float ash = smoothstep(0.38, 0.05, slope) * (1.0 - steep) * mix(0.1, 1.0, smoothstep(0.66, 0.34, height)) * mix(0.6, 1.0, smoothstep(0.3, 0.6, mid)) * mix(0.92, 0.38 + 0.24 * smoothstep(14.0, 30.0, distance(vWorld.xz, vec2(-573.0, 298.0))), sheet);
  // By the line the ash lies thicker: what falls out of the lake's fume settles first on the last metres of shore.
  ash *= 0.55 * smoothstep(0.62, 0.3, height) * mix(1.0, 2.5, smoothstep(14.0, 4.0, land.b));
  albedo = mix(albedo, mix(vec3(0.168, 0.158, 0.148), vec3(0.2, 0.188, 0.176), smoothstep(14.0, 4.0, land.b)) * (0.72 + 0.56 * mid), ash);
  #else
  // Fumaroles stain the wall where gas comes out of it: cream and sulphur yellow in streaks that run down from a joint, in a few places.
  float fume = smoothstep(0.63, 0.8, vnoise(vWorld.xz / 41.0 + 8.3) + 0.25 * (mid - 0.5)) * smoothstep(170.0, 70.0, vWorld.y) * smoothstep(6.0, 28.0, vWorld.y);
  if (fume > 0.0) {
    float runs = smoothstep(0.42, 0.7, vnoise(vec2((vWorld.x + vWorld.z) * 0.33, vWorld.y * 0.03 + big * 2.0)));
    albedo = mix(albedo, mix(vec3(0.3, 0.26, 0.12), vec3(0.34, 0.32, 0.26), smoothstep(0.4, 0.7, mid)) * (0.55 + 0.9 * height), 0.6 * fume * runs * mix(0.5, 1.0, steep));
  }
  // Ash lies in the hollows of what faces up.
  const float ash = 0.0;
  albedo = mix(albedo, vec3(0.135, 0.13, 0.125) * (0.7 + 0.6 * mid), 0.55 * smoothstep(0.5, 0.22, height) * (1.0 - steep));
  #endif
  #ifdef BENCH
  const float TIP = 1.0;
  // Nothing laid from above bends the light on the heap under the line view's lens: on the side of a lump it is drawn out into fibres.
  tip *= 1.0 - byLens;
  #else
  const float TIP = 0.55;
  #endif
  vec3 n = normalize(n0 + (vec3(tip.x, 0.0, tip.y) * (1.0 - steep) * TIP + bump * steep * 1.1 * sign(vec3(n0.x, 1.0, n0.z))) * mix(0.3, 1.0, sharp) + lean * steep);
  float occ = mix(1.0, 0.3 + 0.7 * smoothstep(0.15, 0.6, height), mix(0.5, 1.0, sharp) * (1.0 - 0.25 * ash)) * mix(1.0, ledge, steep);
  // The sky lights only what it can see: joints, gaps between slabs and the foot of every face are closed in by the ground round them.
  #ifdef BENCH
  // On the bench the rubble is open: a gap between two stones still sees a quarter of the sky.
  float closedIn = clamp(vLand.x * 1.7 - 0.25 * (height - 0.5), 0.0, 0.5);
  #else
  float closedIn = clamp(vLand.x * 1.7 - 0.25 * (height - 0.5), 0.0, 0.93);
  #endif
  occ *= (1.0 - closedIn) * (1.0 - closedIn);

  #ifdef NEAR
  // The camera's bench: the same rock read again at the scale of a hand.
  // Not under the wide lens, which has its own reading below.
  float close = smoothstep(32.0, 9.0, far) * (1.0 - hand);
  if (close * (1.0 - byLens) > 0.0) {
    // On a face the picture is read larger and counts for less, or its pits repeat up the riser.
    float tile = steep > 0.5 ? 2.3 : 1.3;
    vec3 ws = vWorld / tile;
    vec3 gx = wx / tile;
    vec3 gy = wy / tile;
    vec2 jog = vec2(mid, big) * 0.4;
    vec3 fine;
    vec3 fineNh;
    if (steep > 0.5) {
      if (kx > 0.5) {
        fine = PICK(tBoulder, ws.zy + jog, gx.zy, gy.zy).rgb;
        fineNh = PICK(tBoulderNh, ws.zy + jog, gx.zy, gy.zy).rgb;
      } else {
        fine = PICK(tBoulder, ws.xy + jog, gx.xy, gy.xy).rgb;
        fineNh = PICK(tBoulderNh, ws.xy + jog, gx.xy, gy.xy).rgb;
      }
    } else {
      fine = PICK(tBoulder, TURN * ws.xz + jog, TURN * gx.xz, TURN * gy.xz).rgb;
      fineNh = PICK(tBoulderNh, TURN * ws.xz + jog, TURN * gx.xz, TURN * gy.xz).rgb;
    }
    // The skin of a ropy sheet is smooth: it is not read again as clinker.
    close *= 1.0 - 0.8 * sheet;
    // Not on the heap under the line view's lens: a picture laid from above is drawn out down the side of every lump there.
    float laid = close * (1.0 - byLens);
    albedo *= mix(vec3(1.0), fine * 20.0, (steep > 0.5 ? 0.22 : 0.5) * laid);
    vec2 t2 = TURN * ((fineNh.rg - 0.5) * vec2(1.0, -1.0));
    n = normalize(n + vec3(t2.x, 0.0, t2.y) * 0.7 * laid * (1.0 - steep));
    occ *= mix(1.0, 0.6 + 0.4 * smoothstep(0.2, 0.6, fineNh.b), laid);
  }
  #endif

  #ifdef HAND
  {
    // Laid from above and only on what lies level: a slope keeps the grain it reads on three planes below, so nothing is drawn out down a face.
    vec3 tw = n0 * n0;
    tw *= tw;
    float level = tw.y / (tw.x + tw.y + tw.z);
    // One read a picture, of its height and tilt only, over a round footprint of the pixel's own area: a read drawn out along the view
    // costs up to four times as much, and what a round one leaves unsmoothed the samples of a frame average.
    float foot = sqrt(length(cross(wx, wy)));
    // The bank is not one grain: smooth skin in one place, a field of rubble a few strides on, dust lying in pockets.
    float field = vnoise(vWorld.xz / 4.7 + 6.3);
    float rubble = smoothstep(0.52, 0.7, field);
    float dust = smoothstep(0.6, 0.78, vnoise(vWorld.xz / 3.1 + 11.7)) * level;
    // The skin of the rock, scoria at its true size: 2 mm a texel.
    const float SKIN = 1.9;
    vec2 fs = vec2(foot / SKIN, 0.0);
    vec3 skin = PICK(tBoulderNh, TURN * vWorld.xz / SKIN + 0.37, fs, fs.yx).rgb;
    vec2 skinTip = TURN * ((skin.rg - 0.5) * vec2(1.0, -1.0));
    // A ropy sheet close to: ropes a hand to a forearm thick, in curved families a stride or two across with smooth skin between, lost under the dust.
    const float ROPE = 5.6;
    float festoon = smoothstep(0.4, 0.6, vnoise(vWorld.xz / 2.6 + 3.9));
    float ropes = sheet * level * festoon * (1.0 - rubble) * (1.0 - dust);
    vec2 fr = vec2(foot / ROPE, 0.0);
    vec3 rope = PICK(tLavaNh, vWorld.xz / ROPE + vec2(0.23, 0.61), fr, fr.yx).rgb;
    vec2 ropeTip = (rope.rg - 0.5) * vec2(1.0, -1.0);
    // Whatever else lies level is rubble at its true size: stones of a finger to a hand, bedded in grit.
    float loose = max(1.0 - sheet, rubble) * level;
    vec2 fl = vec2(foot / 1.7, 0.0);
    vec3 bed = PICK(tTalusNh, TURN * vWorld.xz / 1.7 + vec2(0.57, 0.19), fl, fl.yx).rgb;
    vec2 looseTip = TURN * ((bed.rg - 0.5) * vec2(1.0, -1.0));
    // Old lava cracked as it cooled: plates a stride or two across with a gap of a finger between them, each plate a tone of its own.
    // A gap narrower than a pixel is drawn a pixel wide and that much fainter.
    vec2 bent = vWorld.xz + 0.55 * vec2(vnoise(vWorld.xz / 0.9 + 2.2), vnoise(vWorld.xz / 0.9 + 7.5));
    vec2 plate = plates(bent / 1.7);
    float drawn = max(0.009, 0.7 * px);
    float cracked = hand * level * (1.0 - dust) * (0.009 / drawn) * (1.0 - smoothstep(0.35 * drawn, drawn, plate.x * 1.7));
    albedo *= mix(1.0, 0.88 + 0.24 * plate.y, hand * level);
    float skinOn = hand * level * mix(1.0, 0.6, sheet) * mix(0.35, 1.25, smoothstep(0.3, 0.6, field)) * (1.0 - 0.85 * dust);
    float bare = 1.0 - 0.8 * dust;
    albedo *= mix(1.0, 0.35 + 1.3 * skin.b, 0.7 * skinOn) * mix(1.0, 0.5 + 1.0 * rope.b, 0.6 * hand * ropes) * mix(1.0, 0.4 + 1.2 * bed.b, 0.7 * hand * loose * bare);
    vec2 flatTip = skinTip * 1.1 * skinOn + (ropeTip * 1.2 * ropes + looseTip * 1.4 * loose * bare) * hand;
    n = normalize(n + vec3(flatTip.x, 0.0, flatTip.y));
    float fine = mix(skin.b, mix(bed.b, mix(0.5, rope.b, festoon), sheet * (1.0 - rubble)), 0.65);
    float pits = hand * level * bare;
    occ *= mix(1.0, 0.4 + 0.6 * smoothstep(0.15, 0.6, fine), pits) * (1.0 - 0.85 * cracked);
    albedo *= 1.0 - 0.6 * cracked;
    // Ash and grit lie in the pits and the creases, a finger wide.
    albedo = mix(albedo, vec3(0.17, 0.16, 0.148), 0.25 * pits * smoothstep(0.42, 0.18, fine) * mix(1.0, 0.6, sheet));
    albedo = mix(albedo, vec3(0.105, 0.098, 0.09) * (0.85 + 0.3 * bed.b), 0.7 * hand * dust);
    // A face of the bank, close to: grit read through the rock itself, so it lies the same on a face that looks any way.
    albedo *= mix(1.0, 0.72 + 0.56 * vnoise3(vWorld / 0.035), hand * (1.0 - level));
    height = mix(height, 0.5 * (height + fine), pits);
  }
  #endif
  #ifdef BENCH
  #ifndef CORE
  // The rubble under the line view's lens, measured against the picture: near black clinker and grit, with no drawn pattern on it.
  // Its grain is read on three planes and summed, so nothing is drawn out down a slope.
  if (byLens > 0.0) {
    // The heap is read as its stones are: the scoria's relief on three planes, at the size of a stone and again at the size of a finger,
    // so every lump carries pits and broken faces on its sides as on its top.
    // A plane counts only where the lump looks its way: most pixels read one, a turn of the lump two, and the pits are read on the nearest plane alone.
    vec3 tw = n0 * n0;
    tw *= tw;
    tw = max(tw / (tw.x + tw.y + tw.z) - 0.2, 0.0);
    tw /= tw.x + tw.y + tw.z;
    vec3 bent = vec3(0.0);
    float relief = 0.0;
    const float LUMP = 0.9;
    const float PIT = 0.21;
    if (tw.x > 0.0) {
      vec3 r = PICK(tBoulderNh, vWorld.zy / LUMP + 0.31, wx.zy / LUMP, wy.zy / LUMP).rgb;
      relief += tw.x * r.b;
      bent += tw.x * (vec3(0.0, -1.0, 0.0) * (r.g - 0.5) + vec3(0.0, 0.0, 1.0) * (r.r - 0.5));
    }
    if (tw.y > 0.0) {
      vec3 r = PICK(tBoulderNh, vWorld.xz / LUMP + 0.53, wx.xz / LUMP, wy.xz / LUMP).rgb;
      relief += tw.y * r.b;
      bent += tw.y * (vec3(0.0, 0.0, -1.0) * (r.g - 0.5) + vec3(1.0, 0.0, 0.0) * (r.r - 0.5));
    }
    if (tw.z > 0.0) {
      vec3 r = PICK(tBoulderNh, vWorld.xy / LUMP + 0.77, wx.xy / LUMP, wy.xy / LUMP).rgb;
      relief += tw.z * r.b;
      bent += tw.z * (vec3(0.0, -1.0, 0.0) * (r.g - 0.5) + vec3(1.0, 0.0, 0.0) * (r.r - 0.5));
    }
    vec3 f;
    if (tw.y >= tw.x && tw.y >= tw.z) {
      f = PICK(tBoulderNh, vWorld.xz / PIT + 0.19, wx.xz / PIT, wy.xz / PIT).rgb;
      bent += 0.8 * sharp * (vec3(0.0, 0.0, -1.0) * (f.g - 0.5) + vec3(1.0, 0.0, 0.0) * (f.r - 0.5));
    } else if (tw.x >= tw.z) {
      f = PICK(tBoulderNh, vWorld.zy / PIT + 0.67, wx.zy / PIT, wy.zy / PIT).rgb;
      bent += 0.8 * sharp * (vec3(0.0, -1.0, 0.0) * (f.g - 0.5) + vec3(0.0, 0.0, 1.0) * (f.r - 0.5));
    } else {
      f = PICK(tBoulderNh, vWorld.xy / PIT + 0.41, wx.xy / PIT, wy.xy / PIT).rgb;
      bent += 0.8 * sharp * (vec3(0.0, -1.0, 0.0) * (f.g - 0.5) + vec3(1.0, 0.0, 0.0) * (f.r - 0.5));
    }
    float pits = f.b;
    float grain = mix(relief, 0.5 * (relief + pits), sharp);
    // Near black clinker, measured against the picture, a little brown, black in its pits.
    vec3 clinker = vec3(0.06, 0.052, 0.047) * (0.35 + 1.1 * smoothstep(0.1, 0.75, grain)) * (0.7 + 0.6 * pits);
    albedo = mix(albedo, clinker, byLens);
    n = normalize(n + bent * 2.4 * byLens);
    occ *= mix(1.0, 0.3 + 0.7 * smoothstep(0.15, 0.6, grain), byLens);
    height = mix(height, grain, byLens);
  }
  #endif
  // A slope of the bench is broken rock, and no picture laid from above is drawn out down it: its grain is read on three planes,
  // lumps of a third of a metre and pits finer than that, and half of whatever was laid there gives way to it.
  float broken = smoothstep(0.22, 0.42, slope) * (1.0 - byLens);
  if (broken > 0.0) {
    float lumpTone = (vnoise(vWorld.xz / 0.37 + 2.9) + vnoise(vWorld.xy / 0.37 + 6.1) + vnoise(vWorld.zy / 0.37 + 0.7)) / 3.0;
    float pitTone = (vnoise(vWorld.xz / 0.07 + 4.3) + vnoise(vWorld.xy / 0.07 + 1.2) + vnoise(vWorld.zy / 0.07 + 8.8)) / 3.0;
    vec3 even = vec3(dot(albedo, vec3(0.3333)));
    albedo = mix(albedo, mix(albedo, even * vec3(1.05, 1.0, 0.95), 0.5) * (0.55 + 0.9 * lumpTone + 0.6 * (pitTone - 0.5) * sharp), 0.7 * broken);
  }
  #ifndef CORE
  // The sulphur of the crack: pale crystals on the lips and on what faces up, yellow round them, orange-brown stain fading out over metres.
  float dc = min(segmentDistance(vWorld.xz, uCrackA), segmentDistance(vWorld.xz, uCrackB) * 4.2);
  if (dc < 9.0) {
    // Read through the height as well, or a riser carries the stain in stripes.
    vec2 sp = vWorld.xz + vWorld.y * vec2(0.83, 0.61);
    vec3 sul = PICK(tSulphur, sp / 2.0, (wx.xz + wx.y * vec2(0.83, 0.61)) / 2.0, (wy.xz + wy.y * vec2(0.83, 0.61)) / 2.0).rgb;
    float grain = 0.6 * vnoise(sp / 0.7) + 0.4 * vnoise(sp / 0.13) * sharp;
    // Crystals grow where the gas comes out: in clumps along the lips, not in a band.
    float clump = vnoise(sp / 2.1 + 5.0);
    // By the smooth normal, not the face's own: read by the face, the crust lay in stripes along the rows of the mesh.
    float up = smoothstep(0.45, 0.12, 1.0 - n0.y);
    // A thin crust of crumbs a finger across, within arm's reach of the lips: the dark rock shows through it wherever the lens is near enough to tell.
    float crumb = mix(1.0, (0.25 + 0.75 * smoothstep(0.35, 0.6, vnoise(sp / 0.021 + 3.9))) * smoothstep(0.3, 0.55, vnoise(sp / 0.14 + 8.1) + 0.5 * (0.5 - height)), sharp);
    float crust = smoothstep(2.0, 0.3, dc + 3.4 * (clump - 0.45) + 1.6 * (grain - 0.5) - 1.2 * (height - 0.5)) * (0.2 + 0.8 * up) * crumb;
    // Under the line view's lens the stain is thin: the picture's rubble there is dark clinker with one bright crust, not olive ground.
    float stain = smoothstep(8.0, 1.0, dc + 9.0 * (mid - 0.5) + 4.0 * (clump - 0.5)) * (0.2 + 0.3 * up) * (1.0 - 0.92 * byLens);
    // Olive where the crystals are thin, lemon where they are thick: no cream, which read as pale slabs.
    vec3 yellow = mix(vec3(0.5, 0.4, 0.08), vec3(0.9, 0.78, 0.22), smoothstep(3.4, 0.9, dc + grain + clump));
    albedo = mix(albedo, albedo * vec3(1.55, 1.4, 0.7) + vec3(0.025, 0.022, 0.005), stain);
    // Crystals stand on the crust: pale points a finger across.
    yellow = mix(yellow, vec3(1.0, 0.92, 0.5), smoothstep(0.62, 0.82, vnoise(sp / 0.045 + 7.3)) * sharp);
    albedo = mix(albedo, mix(sul * 1.4, yellow, 0.85) * (1.1 + 0.5 * grain) * mix(1.0, 1.7, byLens), crust);
    rough = mix(rough, 0.95, crust);
  }
  #endif
  // By the line the rock is glazed black with spatter, and nothing pale survives.
  float rind = smoothstep(2.2, 0.2, land.b + 1.2 * (mid - 0.5));
  albedo *= mix(1.0, 0.85, rind);
  // A face that stands over the lake's edge is sooted and spattered by it: the darkest rock of the bench.
  // The crag of the line view carries the vent's stain high on its face.
  vec3 toStain = vWorld - uStain.xyz;
  float sd = length(toStain * vec3(1.0, 0.75, 1.0)) / uStain.w;
  float onCrag = smoothstep(3.4, 1.8, sd) * steep;
  albedo *= mix(1.0, 0.55, steep * smoothstep(8.0, 2.5, land.b + 3.0 * (mid - 0.5)) * (1.0 - onCrag));
  #ifndef CORE
  // The crag itself, measured on the picture: weathered grey-brown rock that catches the sky, paler where a face has broken off lately.
  float broke = vnoise(vWorld.xz / 0.8 + vWorld.y * vec2(1.3, 0.7) + 3.1);
  albedo *= mix(vec3(1.0), vec3(1.0, 0.95, 0.93) * (0.9 + 0.6 * smoothstep(0.4, 0.62, broke)), onCrag);
  // Its faces take the sky: dark basalt, a little browner above a man's height, each broken face its own tone, over the black clinker at its foot.
  float cragLit = smoothstep(3.6, 2.0, sd) * smoothstep(1.3, 2.6, vWorld.y + 0.6 * (broke - 0.5));
  albedo *= mix(vec3(1.0), vec3(1.3, 1.2, 1.1) * (0.75 + 0.5 * smoothstep(0.3, 0.7, vnoise(vWorld.xz / 0.37 + vWorld.y * vec2(2.1, 1.3) + 5.5))), cragLit);
  // It is broken along joints, and every break that looks up carries ash and takes the sky: the tops of its blocks are pale grey against
  // the dark of their sides, as in the line's picture. Without this the crag was one dark wedge.
  albedo *= mix(vec3(1.0), mix(vec3(0.8), vec3(2.3, 2.3, 2.35), smoothstep(0.1, 0.5, n0.y + 0.25 * (height - 0.5))), cragLit);
  // One mound of crystals at the vent itself: lemon, crusted, cream on its crown. The brightest thing of the near ground.
  float knob = vnoise(vWorld.xz / 0.16 + vWorld.y * vec2(2.3, 1.7) + 1.9);
  // Small, and a crust, not a coat: half a metre round the crack, olive with lemon on its knobs, the dark rock showing through it.
  float gap = smoothstep(0.38, 0.56, vnoise(vWorld.xz / 0.33 + vWorld.y * vec2(1.1, 0.8) + 6.4));
  // A heap of crumbs, whole within a forearm of the crack and ragged at its edge: each crumb its own tone, a dark one here and there.
  float crumbTone = vnoise(vWorld.xz / 0.021 + vWorld.y * vec2(31.0, 23.0) + 3.9);
  float mound = smoothstep(0.42, 0.2, segmentDistance(vWorld.xz, uCrackB) + 0.2 * (knob - 0.5) + 0.25 * (1.0 - gap)) * (0.55 + 0.45 * smoothstep(0.25, 0.45, crumbTone));
  albedo = mix(albedo, mix(vec3(0.6, 0.48, 0.1), vec3(1.0, 0.88, 0.36), smoothstep(0.35, 0.8, knob)) * (0.45 + 0.9 * crumbTone), mound);
  rough = mix(rough, 0.95, mound);
  if (sd < 1.6) {
    float blot = vnoise(vWorld.xz / 0.9 + vWorld.y * vec2(1.3, 0.7));
    float on = smoothstep(1.35, 0.35, sd + 0.9 * (blot - 0.5)) * (0.5 + 0.5 * steep) * smoothstep(3.6, 2.2, vWorld.y + 0.8 * (blot - 0.5));
    albedo = mix(albedo, albedo * vec3(1.5, 1.25, 0.7) + vec3(0.012, 0.009, 0.002), 0.15 * on);
    albedo = mix(albedo, mix(vec3(0.34, 0.27, 0.1), vec3(0.5, 0.4, 0.14), smoothstep(0.5, 0.8, blot)) * (0.6 + 0.8 * height), 0.25 * on * smoothstep(0.38, 0.66, blot + 0.4 * (height - 0.5)));
  }
  #endif
  #endif

  // Under an overhang of rock, or deep in a gap, less of everything arrives.
  #ifdef FAR_LIGHT
  // Nothing stands over the wall.
  const float shade = 0.0;
  #else
  float shade = contactAt(vWorld) * smoothstep(4.0, 0.0, vWorld.y - land.r);
  #endif
  albedo = mix(albedo, vec3(0.04, 0.038, 0.038) * (0.7 + 0.6 * mid), 0.92 * lakeRind(vWorld));
  #ifdef FAR_LIGHT
  // The cone of debris left of the fall, as the fall's picture has it: a dark ramp of rubble down to the fan, darker than the wall behind
  // its crest, with blocks a stride or two across lying pale on it. Its near flank only: east of the crest the fall lights it.
  vec2 spurRun = uSpur.zw - uSpur.xy;
  float spurLength = length(spurRun);
  float spurAt = dot(vWorld.xz - uSpur.xy, spurRun) / (spurLength * spurLength);
  float spurOff = ((vWorld.x - uSpur.x) * spurRun.y - (vWorld.z - uSpur.y) * spurRun.x) / spurLength;
  float ramp = smoothstep(-0.1, 0.12, spurAt) * smoothstep(1.2, 1.0, spurAt) * smoothstep(10.0, -2.0, spurOff + 8.0 * (mid - 0.5)) * smoothstep(-170.0, -70.0, spurOff) * (1.0 - 0.6 * steep);
  // Fine scree with a stone bedded in it here and there, not a field of boulders.
  // None of this is worked out where it counts for nothing: off the ramp, on the cliffs, and under every lens but the long one.
  if (ramp > 0.0) {
    float block = smoothstep(0.68, 0.8, vnoise(vWorld.xz / 1.9 + vWorld.y * vec2(0.4, 0.3) + 4.1)) * smoothstep(1.2, 0.4, px);
    float scree = vnoise(vWorld.xz / 0.45 + vWorld.y * vec2(0.7, 0.5) + 2.3) * smoothstep(0.5, 0.15, px);
    albedo *= mix(1.0, 0.42 + 0.45 * block + 0.16 * (mid - 0.5) + 0.12 * (scree - 0.5), ramp);
    // The ramp is warm brown scree, not grey rock.
    albedo *= mix(vec3(1.0), vec3(1.08, 0.98, 0.9), ramp);
  }
  // What the long lens resolves on every slope of scree below the cliffs: pale chips a hand across and dark blocks a stride across, crisp,
  // read in all three axes so that nothing is drawn out down the slope. The ground between them is dark: the picture's is near black.
  float longLens = smoothstep(0.3, 0.1, px) * (1.0 - steep) * smoothstep(110.0, 80.0, vWorld.y);
  if (longLens > 0.0) {
    float chips = smoothstep(0.63, 0.7, vnoise3(vWorld / 0.34 + 1.1));
    float clods = smoothstep(0.58, 0.64, vnoise3(vWorld / 1.3 + 3.3));
    albedo *= mix(1.0, 0.72 * (1.0 + 1.7 * chips) * (1.0 - 0.55 * clods), longLens);
  }
  // The wall that stands behind the ramp's head is the fire's own: baked buff, the palest rock of that frame.
  float behind = smoothstep(-100.0, -118.0, vWorld.x) * smoothstep(-215.0, -180.0, vWorld.x) * smoothstep(0.3, 0.8, steep) * smoothstep(48.0, 72.0, vWorld.y) * smoothstep(200.0, 150.0, vWorld.y + 40.0 * (big - 0.5));
  albedo *= mix(vec3(1.0), vec3(1.9, 1.6, 1.2) * (0.75 + 0.5 * mid), behind);
  #endif
  #ifdef BUTTRESS
  // The buttress, measured on the wide picture: darker and warmer than the wall behind it, its table paler than its cliffs.
  albedo *= vec3(0.8, 0.71, 0.67) * mix(1.15, 0.78, steep);
  // A skirt of talus lies against its near side, in the shape and in cones of tone above it: paler than the cliffs and without their joints.
  float coneRun = dot(vWorld.xz, vec2(0.25, 0.97));
  float coneTop = 16.0 + 30.0 * vnoise(vec2(coneRun / 34.0, 1.7)) + 6.0 * (mid - 0.5);
  // How far a point lies off the buttress's axis: negative is its near side, where the talus is.
  vec4 axis = ${BUTTRESS_LINE};
  vec2 axisRun = axis.zw - axis.xy;
  float offAxis = ((vWorld.x - axis.x) * axisRun.y - (vWorld.z - axis.y) * axisRun.x) / length(axisRun);
  float skirt = max(smoothstep(coneTop + 6.0, coneTop - 6.0, vWorld.y) * smoothstep(-0.25, 0.25, dot(n0.xz, vec2(-0.87, 0.5))), (1.0 - steep) * smoothstep(84.0, 66.0, vWorld.y) * smoothstep(-40.0, -54.0, offAxis));
  float grit = vnoise(vWorld.xz / 2.7 + vWorld.y * vec2(0.5, 0.3) + 8.1);
  albedo = mix(albedo, vec3(0.1, 0.086, 0.076) * (0.7 + 0.4 * mid + 0.3 * grit) * (0.9 + 0.2 * big), 0.8 * skirt);
  #endif
  #ifdef STAGED
  // The staged butte of the feeding picture stands dark against its smoke: sooted brown rock, a little paler on its ledges and its talus.
  albedo *= vec3(0.68, 0.6, 0.55) * mix(1.25, 0.9, steep);
  #endif
  // The fire lies low and its light comes in along the ground: on rough level ground the crowns of the rubble take it and the pits between them
  // lie in each other's shade. A face that stands up takes it whole.
  #ifdef BENCH
  float graze = mix(1.0, 0.2 + 0.8 * smoothstep(0.35, 0.8, height), (1.0 - steep) * smoothstep(0.5, 0.8, n0.y));
  // The crag of the line view stands behind its own fallen blocks and the fume of the vent: the fire reaches its face thinly.
  graze *= mix(1.0, 0.12, smoothstep(4.2, 2.4, sd));
  #else
  const float graze = 1.0;
  #endif
  vec3 c = landShade(vWorld, n, v, albedo, rough, occ, land, shade, graze);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The spatter rind of the shore: black glass, read by world position on three axes so that nothing is stretched down its face,
// ash only on the part of its top that lies back on the bench.
export const LIP_FRAGMENT = /* glsl */ `
${COMMON}
varying vec3 vWorld;
varying vec3 vNormal;
uniform sampler2D tBoulderNh;

void main() {
  vec3 n0 = normalize(vNormal);
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  vec3 v = toCamera / far;
  vec4 land = landAt(vWorld.xz);
  vec3 w = n0 * n0;
  float top = smoothstep(0.3, 0.7, w.y);
  vec3 across = w.x > w.z ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
  vec3 r = mix(texture2D(tBoulderNh, (w.x > w.z ? vWorld.zy : vWorld.xy) / 0.9).rgb, texture2D(tBoulderNh, vWorld.xz / 0.9).rgb, top);
  vec2 t = (r.rg - 0.5) * vec2(1.0, -1.0);
  vec3 r2 = mix(texture2D(tBoulderNh, (w.x > w.z ? vWorld.zy : vWorld.xy) / 0.23 + 0.37).rgb, texture2D(tBoulderNh, vWorld.xz / 0.23 + 0.37).rgb, top);
  t = t * 1.5 + 0.45 * (r2.rg - 0.5) * vec2(1.0, -1.0);
  vec3 n = normalize(n0 + mix(across * t.x + vec3(0.0, 1.0, 0.0) * t.y, vec3(t.x, 0.0, t.y), top) * 1.1);
  // Ash in the pits of the top; the rest is spatter gone dull: dark, lumpy and matte, with no glint on it.
  float ash = smoothstep(0.55, 0.9, n0.y) * smoothstep(0.55, 0.25, r.b) * 0.6;
  vec3 albedo = mix(vec3(0.05, 0.046, 0.043) * (0.6 + 0.8 * r.b), vec3(0.165, 0.155, 0.145), ash);
  float rough = 0.9;
  float occ = (0.3 + 0.7 * smoothstep(0.2, 0.65, r.b)) * (0.5 + 0.5 * r2.b) * mix(0.3, 1.0, smoothstep(-0.4, 0.3, n0.y));
  vec3 c = landShade(vWorld, n, v, albedo, rough, occ, land, 0.0, 1.0);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
