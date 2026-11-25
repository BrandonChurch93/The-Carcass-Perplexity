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

// Defines: BENCH (ropy lava on the flats, the sulphur of the crack), NEAR (a second, finer reading of the rock for the camera's bench), FAR_LIGHT, GLAZE.
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
uniform sampler2D tStrata;
uniform vec4 uCrackA;
uniform vec4 uCrackB;
uniform vec4 uStain;

// Every picture is read with slopes taken from the world position at the top of main: a read inside a branch that took its own slope
// would take it from a neighbour that never computed the coordinate, and the frame would differ from one page load to the next.
#define PICK(t, uv, gx, gy) textureGrad(t, uv, gx, gy)
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
  // Where the mesh steps up in a single row of faces its smoothed normal still looks at the sky: the face itself says how steep it is,
  // so no picture laid from above is drawn out down a wall.
  vec3 ng = normalize(cross(wx, wy));
  ng *= sign(dot(ng, n0) + 1e-5);
  float slope = max(1.0 - n0.y, 0.88 - abs(ng.y));
  vec3 nk = n0 + 0.6 * ng;
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
  float kx = smoothstep(0.4, 0.6, nk.x * nk.x / (nk.x * nk.x + nk.z * nk.z + 1e-5));
  if (steep > 0.003) {
    // The wall: each lava flow reads the cliff picture at its own place, so the bands run level and no two repeat.
    #ifdef BENCH
    vec4 flow = PICK(tStrata, vec2((vWorld.y + 3.0 * (big - 0.5)) / 340.0, 0.5), vec2(wx.y / 340.0, 0.0), vec2(wy.y / 340.0, 0.0));
    float shift = flow.r * 7.0;
    const float wander = 0.0;
    #else
    // The wall's flows dip and wander (vLand.y, the same number the shape was cut with), and the cliff picture wanders with them:
    // no band of it is a level line, and no flow starts the picture afresh.
    vec4 flow = PICK(tStrata, vec2((vWorld.y + vLand.y) / 340.0, 0.5), vec2(wx.y / 340.0, 0.0), vec2(wy.y / 340.0, 0.0));
    float shift = 0.0;
    float wander = (vLand.y + 26.0 * (vnoise(vec2((vWorld.x + vWorld.z) / 57.0, vWorld.y / 90.0)) - 0.5)) / 140.0;
    #endif
    #ifndef BENCH
    // Round the mouth the wall turns through every direction: there the picture is laid by world position on three axes, with no jump from flow to flow.
    float beside = abs(vWorld.x - (${MOUTH.x.toFixed(1)}));
    float alcove = smoothstep(${(MOUTH.width / 2 + 27).toFixed(1)}, ${(MOUTH.width / 2 + 7).toFixed(1)}, beside) * smoothstep(${(MOUTH.z - 72).toFixed(1)}, ${(MOUTH.z - 58).toFixed(1)}, vWorld.z);
    shift *= 1.0 - alcove;
    #endif
    // The low crags of the bench are the same rock seen close: the picture at a fifth of the size.
    #ifdef BENCH
    const float CLIFF = 13.0;
    #else
    // The wall's picture is laid large: its beds are flows ten to twenty metres thick, not strata.
    const float CLIFF = 140.0;
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
    // The beds of the picture count for less than the masses of the rock, and what the large picture cannot hold is read again
    // at the scale of a block: broken faces a metre or two across, with their own shade.
    cliff = mix(vec3(dot(cliff, vec3(0.3333))), cliff, 0.6) * 0.5 + 0.5 * vec3(0.105, 0.096, 0.088);
    if (px < 0.7) {
      vec2 fq = (kx > 0.5 ? vWorld.zy : vWorld.xy) / 17.0 + vec2(0.37, 0.11);
      vec3 fr = PICK(tBoulderNh, fq, (kx > 0.5 ? wx.zy : wx.xy) / 17.0, (kx > 0.5 ? wy.zy : wy.xy) / 17.0).rgb;
      float on = smoothstep(0.7, 0.3, px);
      cliff *= mix(1.0, 0.5 + 1.0 * fr.b, on);
      cliffNh.b = mix(cliffNh.b, cliffNh.b * (0.4 + 1.2 * fr.b), on);
      bump += on * 0.9 * ((kx > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0)) * (fr.r - 0.5) - vec3(0.0, 1.0, 0.0) * (fr.g - 0.5));
    }
    #endif
    // Hard flows are darker and stand proud, the rubble between them is paler; streaks run down the face.
    float streak = vnoise(vec2((vWorld.x + vWorld.z) * 0.21, vWorld.y * 0.018 + big * 2.0));
    #ifdef BENCH
    cliff *= (0.7 + 0.8 * flow.g) * (0.75 + 0.5 * streak);
    cliff = mix(cliff, vec3(0.2, 0.185, 0.165) * (0.5 + cliffNh.b), 0.6 * smoothstep(0.5, 0.85, flow.b * (0.4 + 0.9 * big)) * smoothstep(0.4, 0.7, streak));
    // Each flow sits on the rubble of the one below and overhangs it a little: a line of shade at its foot.
    ledge = 0.55 + 0.45 * smoothstep(0.0, 0.09, flow.b);
    #else
    // The wall is one dark rock in masses tens of metres across, some sooted, some weathered paler; the flows only tint it.
    float mass = vnoise3(vWorld / 43.0 + 2.7);
    cliff *= (0.93 + 0.14 * flow.g) * (0.7 + 0.6 * streak) * (0.5 + 1.0 * mass);
    // The shade under each flow's foot is there in stretches, where the flow overhangs, and not along the whole wall.
    float hangs = smoothstep(0.32, 0.6, vnoise(vec2((vWorld.x - vWorld.z) / 11.0, flow.r * 91.0)));
    ledge = 1.0 - 0.6 * hangs * (1.0 - smoothstep(0.0, 0.12, flow.b));
    // Fractures: sheets of broken rock that stand near upright in the wall, tens of metres tall, and finer ones between them.
    // The rock between two fractures is a face of its own that leans its own way, so a light from the side picks the faces out.
    vec3 fp = vec3(vWorld.x, vWorld.y * 0.17, vWorld.z);
    float f1 = vnoise3(fp / 7.5 + 3.1);
    vec3 along = normalize(vec3(-n0.z, 0.0, n0.x) + 1e-4);
    float w1 = 0.022 + px / 7.5;
    float crack = (1.0 - smoothstep(0.4 * w1, w1, abs(f1 - 0.5))) * smoothstep(1.6, 0.5, px);
    float f2 = vnoise3(fp / 2.3 + 9.7);
    float w2 = 0.03 + px / 2.3;
    float fineCrack = (1.0 - smoothstep(0.4 * w2, w2, abs(f2 - 0.5))) * smoothstep(0.5, 0.12, px);
    ledge *= (1.0 - 0.7 * crack) * (1.0 - 0.6 * fineCrack);
    lean += along * (f1 - 0.5) * 1.5 * smoothstep(1.6, 0.5, px);
    cliff *= mix(0.84, 1.14, smoothstep(0.42, 0.58, f2));
    // A thick flow cools into columns: upright prisms two or three metres across in its lower two thirds, each face leaning its own way,
    // a black joint between them. The rubbly top of the flow has none.
    float run = (kx > 0.5 ? vWorld.z : vWorld.x) + 0.3 * sin(vWorld.y * 0.9 + 7.0 * flow.r);
    float c1 = vnoise(vec2(run / 1.9 + 9.0 * flow.r, flow.r * 53.0));
    float columns = smoothstep(0.3, 0.55, flow.a) * smoothstep(0.78, 0.6, flow.b) * smoothstep(1.3, 0.45, px) * smoothstep(0.35, 0.6, vnoise(vWorld.xz / 71.0 + 6.2));
    float wj = 0.05 + px / 1.9;
    lean += along * (c1 - 0.5) * 1.6 * columns;
    ledge *= 1.0 - 0.7 * columns * (1.0 - smoothstep(0.3 * wj, wj, abs(c1 - 0.5)));
    cliff *= 1.0 - 0.22 * columns;
    // A few fresh breaks, buff against the soot.
    float fresh = smoothstep(0.7, 0.82, vnoise(vec2(vWorld.x + vWorld.z, vWorld.y * 1.3) / 13.0 + 5.3)) * smoothstep(0.5, 0.62, f2);
    cliff = mix(cliff, vec3(0.2, 0.172, 0.135) * (0.55 + 0.9 * cliffNh.b), 0.55 * fresh);
    #endif
    #ifndef BENCH
    // What a long lens resolves: the overhang's shade deepens and rubble lies pale on the ledge at the top of each flow.
    float fineLens = smoothstep(0.3, 0.1, px);
    ledge = mix(ledge, 0.28 + 0.72 * smoothstep(0.0, 0.16, flow.b), fineLens * smoothstep(96.0, 124.0, beside));
    cliff = mix(cliff, vec3(0.19, 0.185, 0.175) * (0.5 + cliffNh.b), 0.6 * fineLens * smoothstep(0.86, 0.97, flow.b));
    float h = kx > 0.5 ? vWorld.z : vWorld.x;
    // Gullies: narrow chutes cut back into the face every thirty metres or so, in shade, running down through many flows.
    float gn = vnoise(vec2(h / 26.0, 3.7 + vWorld.y / 420.0));
    float gully = smoothstep(0.075, 0.015, abs(gn - 0.5)) * smoothstep(0.9, 0.3, px) * smoothstep(96.0, 124.0, beside);
    cliff *= 1.0 - 0.45 * gully;
    ledge *= 1.0 - 0.5 * gully;
    #endif
  }

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
    float ropy = smoothstep(0.42, 0.58, vnoise(vWorld.xz / 23.0 + 11.0) + 0.3 * (mid - 0.5) - 0.9 * smoothstep(0.06, 0.2, slope) + 0.7 * smoothstep(19.0, 11.0, length(vWorld.xz - vec2(-573.0, 298.0))));
    // The last metres before the line are rubble and clinker under ash, lumpy and matte: no sheet of glass lies there.
    ropy *= smoothstep(3.0, 9.0, land.b + 5.0 * (mid - 0.5));
    sheet = ropy;
    const float TALUS = 5.0;
    #else
    const float ropy = 0.0;
    const float TALUS = 8.0;
    #endif
    if (ropy < 0.997) {
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
      plain = mix(plain, vec3(0.15, 0.14, 0.13) * (0.5 + plainNh.b), 0.55 * smoothstep(0.5, 0.8, fan) * smoothstep(0.08, 0.3, slope));
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
      vec3 lavaA = PICK(tLava, q1, 2.83 * wx.xz / 11.0, 2.83 * wy.xz / 11.0).rgb;
      vec3 lavaNhA = PICK(tLavaNh, q1, 2.83 * wx.xz / 11.0, 2.83 * wy.xz / 11.0).rgb;
      vec3 lavaNhB = PICK(tLavaNh, q2, TURN * wx.xz / 29.0, TURN * wy.xz / 29.0).rgb;
      vec3 lava = lavaA * (0.6 + 0.9 * lavaNhB.b) * (0.8 + 0.4 * big);
      vec2 lavaTip = 0.4 * (lavaNhA.rg - 0.5) * vec2(1.0, -1.0) + 0.9 * (TURN * ((lavaNhB.rg - 0.5) * vec2(1.0, -1.0)));
      plain = mix(plain, lava, ropy);
      plainNh = mix(plainNh, vec3(lavaNhA.rg, lavaNhA.b * (0.5 + lavaNhB.b)), ropy);
      tip = mix(tip, lavaTip * 2.0, ropy);
      fold = mix(lavaNhA.b, lavaNhB.b, 0.6);
      // The skin of a billow is satin: a broad dull sheen on its back, no streak of white along a rope.
      rough = mix(0.92, 0.84, ropy * smoothstep(0.35, 0.7, lavaNhB.b));
    }
    #endif
  }

  vec3 albedo = mix(plain, cliff, steep);
  // The pictures' rock leans warm (red over blue near 1.2): charcoal with a little brown, never blue.
  albedo = mix(albedo, dot(albedo, vec3(0.3333)) * vec3(1.07, 0.99, 0.92), 0.8);
  #ifdef BENCH
  // The faces of the bench's crags are broken rock with ash on every ledge, paler than the glassy flats.
  albedo *= mix(${BENCH_TONE.toFixed(2)}, ${BENCH_FACE_TONE.toFixed(2)}, steep);
  #else
  albedo *= ${WALL_TONE.toFixed(2)};
  #endif
  float height = mix(plainNh.b, cliffNh.b, steep);
  #ifndef BENCH
  // The buttress stands in the lake: the flank that looks at the fountains is baked by them, its lower faces rusted and paler than the rest.
  vec4 spur = ${BUTTRESS_LINE};
  float onSpur = smoothstep(${(BUTTRESS.half * 2.4).toFixed(1)}, ${(BUTTRESS.half * 1.6).toFixed(1)}, segmentDistance(vWorld.xz, spur));
  if (onSpur > 0.0) {
    vec2 along = spur.zw - spur.xy;
    float toTip = clamp(dot(vWorld.xz - spur.xy, along) / dot(along, along), 0.0, 1.0);
    float baked = onSpur * smoothstep(-0.2, 0.5, dot(n0.xz, vec2(-0.97, 0.25)) + 0.3 * (big - 0.5)) * smoothstep(0.25, 0.7, toTip) * smoothstep(130.0, 20.0, vWorld.y + 40.0 * (mid - 0.5));
    albedo = mix(albedo, (albedo + 0.015) * vec3(2.9, 1.7, 1.15), 0.85 * baked);
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
  #else
  const float TIP = 0.55;
  #endif
  vec3 n = normalize(n0 + (vec3(tip.x, 0.0, tip.y) * (1.0 - steep) * TIP + bump * steep * 1.1 * sign(vec3(n0.x, 1.0, n0.z))) * mix(0.3, 1.0, sharp) + lean * steep);
  float occ = mix(1.0, 0.3 + 0.7 * smoothstep(0.15, 0.6, height), mix(0.5, 1.0, sharp) * (1.0 - 0.25 * ash)) * mix(1.0, ledge, steep);
  // The sky lights only what it can see: joints, gaps between slabs and the foot of every face are closed in by the ground round them.
  float closedIn = clamp(vLand.x * 1.7 - 0.25 * (height - 0.5), 0.0, 0.93);
  occ *= (1.0 - closedIn) * (1.0 - closedIn);

  #ifdef NEAR
  // The camera's bench: the same rock read again at the scale of a hand.
  float close = smoothstep(32.0, 9.0, far);
  if (close > 0.0) {
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
    albedo *= mix(vec3(1.0), fine * 20.0, (steep > 0.5 ? 0.4 : 0.5) * close);
    vec2 t2 = TURN * ((fineNh.rg - 0.5) * vec2(1.0, -1.0));
    n = normalize(n + vec3(t2.x, 0.0, t2.y) * 0.7 * close * (1.0 - steep));
    occ *= mix(1.0, 0.6 + 0.4 * smoothstep(0.2, 0.6, fineNh.b), close);
  }
  #endif

  #ifdef BENCH
  // The sulphur of the crack: pale crystals on the lips and on what faces up, yellow round them, orange-brown stain fading out over metres.
  float dc = min(segmentDistance(vWorld.xz, uCrackA), segmentDistance(vWorld.xz, uCrackB) * 4.2);
  if (dc < 9.0) {
    // Read through the height as well, or a riser carries the stain in stripes.
    vec2 sp = vWorld.xz + vWorld.y * vec2(0.83, 0.61);
    vec3 sul = PICK(tSulphur, sp / 2.0, (wx.xz + wx.y * vec2(0.83, 0.61)) / 2.0, (wy.xz + wy.y * vec2(0.83, 0.61)) / 2.0).rgb;
    float grain = 0.6 * vnoise(sp / 0.7) + 0.4 * vnoise(sp / 0.13) * sharp;
    // Crystals grow where the gas comes out: in clumps along the lips, not in a band.
    float clump = vnoise(sp / 2.1 + 5.0);
    float up = smoothstep(0.45, 0.12, slope);
    float crust = smoothstep(3.6, 0.4, dc + 3.4 * (clump - 0.45) + 1.6 * (grain - 0.5) - 1.2 * (height - 0.5)) * (0.2 + 0.8 * up);
    float stain = smoothstep(8.0, 1.0, dc + 9.0 * (mid - 0.5) + 4.0 * (clump - 0.5)) * (0.2 + 0.3 * up);
    // Lemon where the crystals are thin, cream where they are thick, olive only in the stain round them.
    vec3 yellow = mix(vec3(0.6, 0.5, 0.14), vec3(0.8, 0.76, 0.56), smoothstep(3.4, 0.9, dc + grain + clump));
    albedo = mix(albedo, albedo * vec3(1.55, 1.4, 0.7) + vec3(0.025, 0.022, 0.005), stain);
    albedo = mix(albedo, mix(sul * 1.4, yellow, 0.8) * (0.8 + 0.4 * grain), crust);
    rough = mix(rough, 0.95, crust);
  }
  // By the line the rock is glazed black with spatter, and nothing pale survives.
  float rind = smoothstep(2.2, 0.2, land.b + 1.2 * (mid - 0.5));
  albedo *= mix(1.0, 0.85, rind);
  // A face that stands over the lake's edge is sooted and spattered by it: the darkest rock of the bench.
  albedo *= mix(1.0, 0.55, steep * smoothstep(8.0, 2.5, land.b + 3.0 * (mid - 0.5)));
  // The crag of the line view carries the vent's stain high on its face.
  vec3 toStain = vWorld - uStain.xyz;
  float sd = length(toStain * vec3(1.0, 0.75, 1.0)) / uStain.w;
  if (sd < 1.6) {
    float blot = vnoise(vWorld.xz / 0.9 + vWorld.y * vec2(1.3, 0.7));
    float on = smoothstep(1.35, 0.35, sd + 0.9 * (blot - 0.5)) * (0.35 + 0.65 * steep);
    albedo = mix(albedo, albedo * vec3(1.5, 1.25, 0.7) + vec3(0.012, 0.009, 0.002), 0.45 * on);
    albedo = mix(albedo, vec3(0.42, 0.37, 0.16) * (0.55 + 0.9 * height), 0.6 * on * smoothstep(0.62, 0.9, blot + 0.4 * (height - 0.5)));
  }
  #endif

  // Under an overhang of rock, or deep in a gap, less of everything arrives.
  #ifdef FAR_LIGHT
  // Nothing stands over the wall.
  const float shade = 0.0;
  #else
  float shade = contactAt(vWorld) * smoothstep(4.0, 0.0, vWorld.y - land.r);
  #endif
  albedo = mix(albedo, vec3(0.04, 0.038, 0.038) * (0.7 + 0.6 * mid), 0.92 * lakeRind(vWorld));
  // The fire lies low and its light comes in along the ground: on rough level ground the crowns of the rubble take it and the pits between them
  // lie in each other's shade. A face that stands up takes it whole.
  #ifdef BENCH
  float graze = mix(1.0, 0.2 + 0.8 * smoothstep(0.35, 0.8, height), (1.0 - steep) * smoothstep(0.5, 0.8, n0.y));
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
