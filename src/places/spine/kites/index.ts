// The tether-kites: animals that fly as long blades of wet skin from cords held in the lee edge of each spire.
// A kite is a body in three pieces that share one centre line, worked out in the vertex shaders from the time alone:
// a cord (a round tube that hangs under its ice from the holdfast to a knot), a blade (a lanceolate skin with a section: it bellies,
// twists slowly and tapers to a tail) and what hangs from the cord (ice). Gusts run down the line at the wind's speed and the waves
// they raise follow at about half of it, so the outline changes inside a second and no two kites are ever in step.
// The blade is shaded as a thin wet body: what it scatters from both faces, what it hides of the sky behind it, the sky it mirrors.
import * as THREE from 'three';
import type { Vec3 } from '../../../core/cameras';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { INSIDE_FROM, STRIKE_FROM, WIND, heading, kiteEdge, step } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import { FIRST, finAxes, finEdge, spires, tipOf } from '../ridge';
import { flashAt } from '../strikes/bolt';
import { during } from '../strikes/where';

export const PARTS: readonly string[] = ['tether-kites'];

/** Points down a blade and across its section. */
const ALONG = 150;
const ACROSS = 14;
/** Points down a cord and round it. */
const CORD_ALONG = 72;
const CORD_ROUND = 7;
/** Icicles a cord carries at the most. */
const ICE = 9;

interface Kite {
  anchor: Vec3;
  /** Metres of cord, of blade, and half the blade's width. Negative width: a bare thread, a cord that lost its blade. */
  cord: number;
  blade: number;
  half: number;
  phase: number;
  /** Length of its main wave, metres. */
  wave: number;
  sag: number;
  seed: number;
  spire: number;
  /** The long one of its colony. */
  lead: boolean;
}

/** Where the colonies of a spire hold on, as shares of its height, and how many kites each has. Few and near the top: the lee of the tip is where the gale is cleanest. */
function colonies(n: number): [number, number][] {
  // The first spire is seen close, at two thirds of its height: its colonies are spaced down the edge there, and one at its tip.
  if (n === FIRST) return [[0.955, 3], [0.865, 2], [0.83, 2], [0.795, 3], [0.765, 2], [0.735, 2], [0.705, 3]];
  if (n === FIRST + 2) return [[0.965, 3], [0.945, 2], [0.9, 1]];
  if (n === FIRST + 1) return [[0.95, 2]];
  if (n === FIRST + 3) return [[0.96, 1], [0.87, 1]];
  // The far peaks: one, or none.
  return (n - FIRST) % 2 === 0 ? [[0.955, 1]] : [];
}

// The centre line of a kite and how it is staged by shot. Shared by the blade, the cord and the ice.
const KITE_GLSL = /* glsl */ `
attribute vec3 aAnchor;
attribute vec4 aSize;
attribute vec4 aSeed;
attribute float aLead;
uniform float uTime;
uniform vec4 uWind;
uniform float uPixel;
uniform float uReach;
// x, y, z: the scale of the blade's length, of its width and of the cord's length on the staged spire. w: the staged spire, 0 for none.
uniform vec4 uStage;
// x: 1 before the long lens, where no other spire flies any. y: how much the staged kites climb the wind, as a slope.
// z: the share of the bare threads that are not drawn. w: how hard the waves run (1 as built).
uniform vec4 uStageMore;
// x: 1 in the wide shot, where the first spire's kites are thinned and fanned apart.
uniform vec2 uFly;
float kCord;
float kBlade;
float kHalf;
float kWave;
float kPhase;
float kSeed;
float kSag;
float kYaw;
float kClimb;
float kThread;
float kSpeed;
// Reads the kite in hand and stages it. False where it is not drawn in this shot.
bool kiteSet() {
  kCord = aSize.x;
  kBlade = aSize.y;
  kHalf = abs(aSize.z);
  kThread = aSize.z < 0.0 ? 1.0 : 0.0;
  kWave = aSize.w;
  kPhase = aSeed.x;
  kSeed = aSeed.y;
  kSag = aSeed.w;
  kSpeed = uWind.w * (0.46 + 0.16 * fract(kSeed * 7.3));
  float rank = 2.0 * fract(kSeed * 23.1) - 1.0;
  // Each heads a little off the wind's line, its own way: sky stands between them.
  kYaw = 0.07 * rank;
  kClimb = 0.1 * (fract(kSeed * 13.7) - 0.5);
  if (kThread > 0.5 && fract(kSeed * 11.3) < uStageMore.z) return false;
  if (uStage.w > 0.0) {
    if (abs(aSeed.z - uStage.w) > 0.5) {
      if (uStageMore.x > 0.5) return false;
    } else {
      // In the long lens one kite of each colony is long and the rest are short.
      float lead = uStageMore.x > 0.5 ? mix(0.5, 1.7, aLead) : 1.0;
      if (uFly.x > 0.5 && kThread < 0.5) {
        // The wide lens sees the first spire's kites from the side, all in one sheet of air: fewer fly, and the ones that head toward
        // the lens are the larger.
        if (fract(kSeed * 31.7) < 0.3 || (aLead < 0.5 && fract(kSeed * 17.7) < 0.88)) return false;
        vec3 beside = normalize(cross(vec3(0.0, 1.0, 0.0), normalize(uWind.xyz)));
        kYaw = 0.3 * rank * sign(dot(cameraPosition - aAnchor, beside));
        kClimb = 0.34 * (fract(kSeed * 13.7) - 0.5);
        kBlade *= 1.0 + 0.22 * rank;
        kHalf *= 1.0 + 0.3 * rank;
      }
      kBlade *= uStage.x * lead;
      if (uStageMore.x > 0.5) kHalf *= mix(0.4, 1.0, aLead);
      kWave *= uStage.x * lead;
      kHalf *= uStage.y;
      kCord *= uStage.z;
      kClimb += uStageMore.y;
    }
  }
  if (kThread > 0.5) {
    // A thread is all line: a short hang, then it streams.
    float whole = kCord + kBlade;
    kCord = 0.12 * whole;
    kBlade = 0.88 * whole;
  }
  return true;
}
// The middle of the kite d metres down its line from the holdfast.
vec3 kiteCentre(float d) {
  vec3 wind = normalize(uWind.xyz);
  vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), wind));
  float t = uTime;
  // The whole animal swings about its holdfast as the gale leans on it, slowly, in its own time.
  float g1 = sin(t * 0.47 + kPhase) + 0.6 * sin(t * 1.13 + kPhase * 2.3);
  float g2 = sin(t * 0.61 + kPhase * 1.7) + 0.5 * sin(t * 1.37 + kPhase * 3.1);
  vec3 dir = normalize(wind + vec3(0.0, 1.0, 0.0) * (kClimb + 0.028 * g1) + side * (kYaw + 0.022 * g2));
  vec3 lift = normalize(cross(dir, side));
  vec3 p = aAnchor + dir * d;
  // The cord hangs under its ice between the rock and the knot, and shakes a little.
  float h = clamp(d / kCord, 0.0, 1.0);
  p.y -= kSag * kCord * 4.0 * h * (1.0 - h) * (1.0 + 0.12 * sin(t * 2.9 + kPhase * 3.0));
  float x = max(d - kCord, 0.0);
  float s = x / kBlade;
  float k = 6.2832 / kWave;
  // Gusts go down the line at the wind's own speed and the waves swell where one passes: the outline is never the same a second later.
  float gust = 0.62 + 0.3 * sin(3.3 * (t - x / uWind.w) + kPhase * 4.0) + 0.2 * sin(1.9 * (t - x / uWind.w) + kPhase * 1.3);
  float env = s * sqrt(s);
  float amp = 0.05 * kBlade * uStageMore.w * gust;
  float p1 = k * (x - kSpeed * t) + kPhase;
  float p2 = 1.83 * k * (x - 1.17 * kSpeed * t) + kPhase * 2.7;
  float p3 = 0.71 * k * (x - 0.85 * kSpeed * t) + kPhase * 1.9 + 1.3;
  float p4 = 4.3 * k * (x - 1.3 * kSpeed * t) + kPhase * 5.1;
  // The tail whips: a short fast wave on its last third.
  float whip = 0.3 * amp * s * s * s * sin(p4);
  p += lift * (amp * env * (sin(p1) + 0.3 * sin(p2)) + whip) + side * (0.8 * amp * env * (sin(p3) + 0.25 * cos(p2)) + 0.7 * whip);
  // A wet skin has weight: the far end rides lower than the knot.
  p.y -= 0.035 * kBlade * s * s;
  return p;
}`;

const BLADE_VERTEX = /* glsl */ `
${KITE_GLSL}
attribute vec2 aAt;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vAt;
varying vec4 vKite;
varying vec3 vSkin;
varying vec3 vAcross;
varying float vGather;
// The outline: how wide the blade is at s of its length, as a share of its widest. A ribbon: it leaves the knot gathered, keeps much of
// a width all its length, wandering, and runs out to a tail. Its two edges are not alike.
float outline(float s, float sd) {
  float h1 = fract(sd * 3.7);
  float h2 = fract(sd * 5.9);
  float h3 = fract(sd * 8.3);
  float rise = smoothstep(0.0, 0.05 + 0.06 * h1, s);
  float tail = pow(1.0 - smoothstep(0.62 + 0.2 * h2, 1.0, s), 0.6 + 0.6 * h3);
  float wander = 0.86 + 0.14 * sin(s * 5.0 + sd * 30.0);
  return max(0.03, (0.12 + 0.88 * rise) * mix(0.45, 1.0, tail) * wander);
}
void main() {
  if (!kiteSet() || kThread > 0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float s = aAt.x;
  float v = aAt.y;
  float x = s * kBlade;
  float d = kCord + x;
  float e = 0.004 * kBlade;
  vec3 c = kiteCentre(d);
  vec3 tangent = normalize(kiteCentre(d + e) - kiteCentre(d - e));
  vec3 wind = normalize(uWind.xyz);
  vec3 flat_ = normalize(cross(vec3(0.0, 1.0, 0.0), wind));
  vec3 upward = normalize(cross(tangent, flat_));
  flat_ = cross(upward, tangent);
  float t = uTime;
  float k = 6.2832 / kWave;
  // It stands on its edge in the gale and shows a face. A slow twist travels down it, so its width in the frame comes and goes, and
  // some turn right over once along their length.
  float way = fract(kSeed * 5.3) < 0.5 ? -1.0 : 1.0;
  float at = 0.32 + 0.36 * fract(kSeed * 2.3) + 0.05 * sin(t * 0.7 + kPhase);
  float turn = step(0.55, fract(kSeed * 8.9)) * 3.14159 * smoothstep(at - 0.15, at + 0.15, s);
  float roll = 1.5708 + way * (0.2 + 0.4 * fract(kSeed * 9.1)) + (0.3 + 0.7 * fract(kSeed * 4.1)) * sin(0.8 * k * (x - 0.9 * kSpeed * t) + kPhase * 2.0) + 0.4 * s * sin(2.1 * k * (x - 1.2 * kSpeed * t) + kPhase) + turn;
  vec3 across = flat_ * cos(roll) + upward * sin(roll);
  vec3 normal_ = cross(tangent, across);
  float far = length(cameraPosition - c);
  // Where it has wound on itself it is gathered to a rope, and opens again.
  float neck = 1.0 - 0.78 * step(0.3, fract(kSeed * 6.1)) * exp(-pow((s - 0.22 - 0.5 * fract(kSeed * 4.7)) / 0.04, 2.0));
  float wide = 2.1 * kHalf * neck * outline(s, kSeed);
  // Far off a blade is never thinner than a pixel and a half: it does not come and go between the pixels.
  float half_ = max(wide, 0.75 * uPixel * far);
  // The section: an arc the wind fills and empties as the waves pass (curl is half the angle the arc turns through), and two edges that
  // flutter each in its own time, harder toward the tail.
  float kb = 6.2832 / (7.0 * kHalf);
  float curl = (0.95 * sin(kb * (x - kSpeed * t) + kSeed * 40.0) + 0.6 * sin(0.37 * kb * (x - 0.8 * kSpeed * t) + kPhase * 1.3)) * smoothstep(0.02, 0.2, s);
  float flutter = 0.12 * (0.15 + 0.85 * s) * sin(2.8 * kb * (x - 1.25 * kSpeed * t) + kSeed * 90.0 + 1.7 * v);
  float av = abs(v);
  float a = curl * v;
  float sx = abs(curl) < 0.05 ? v : sin(a) / curl;
  float sy = abs(curl) < 0.05 ? 0.5 * curl * (v * v - 0.4) : (1.0 - cos(a) - 0.4 * (1.0 - cos(curl))) / curl;
  float dx = cos(a);
  float dy = sin(a) + 3.0 * flutter * v * av;
  sy += flutter * av * av * av;
  vec3 p = c + (across * sx + normal_ * sy) * half_;
  vWorld = p;
  vNormal = normalize(normal_ * dx - across * dy);
  vAcross = normalize(across * dx + normal_ * dy);
  vAt = vec4(s, v, x, half_);
  vKite = vec4(kSeed, aSeed.z, smoothstep(200.0, 450.0, length(cameraPosition - aAnchor) * uReach), wide / half_);
  vSkin = vec3(curl, kHalf, kBlade);
  vGather = (1.0 - neck) / 0.78;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const BLADE_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
uniform vec4 uStruck;
uniform vec3 uStruckAt;
uniform vec3 uBody;
uniform vec3 uGlowTint;
uniform vec4 uFilm;
uniform vec2 uWrinkle;
uniform vec2 uTone;
uniform sampler2D tFilmA;
uniform sampler2D tFilmAA;
uniform sampler2D tFilmAH;
uniform sampler2D tFilmB;
uniform sampler2D tFilmBA;
uniform sampler2D tFilmBH;
uniform float uVeil;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vAt;
varying vec4 vKite;
varying vec3 vSkin;
varying float vGather;
varying vec3 vAcross;
void main() {
  float u = vAt.x;
  float v = vAt.y;
  float metres = vAt.z;
  float wide = 2.0 * vSkin.x;
  float seed = vKite.x * 97.0;
  float vFar = vKite.z;
  float vNear = 0.0;
  float vThin = vKite.w;
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  // Which of its two faces the lens sees: 1 the one the section's normal leaves, -1 the other.
  float face = dot(n, toCamera) < 0.0 ? -1.0 : 1.0;
  n *= face;
  float blade = smoothstep(0.0, 0.0 + 0.07, u);

  // The skin is the photograph of a ribbon, its middle laid down the blade: its holes, its veins, its colours and stretches of its edge
  // are the picture's own; the outline is the blade's. There are two pictures, and each ribbon wears one of them either way up.
  float s = clamp((u - 0.0) / (1.0 - 0.0), 0.0, 1.0);
  float vb = v / max(vThin, 0.05);
  float flip = fract(seed * 0.37) < 0.5 ? -1.0 : 1.0;
  float vf = vb * flip;
  // The strip holds the whole of the picture's ribbon and a margin of black round it: the outline of a kite is the picture's own, with its
  // own few tears, and nothing is cut into it here. (How fast the picture runs over the screen is worked out before any branch.)
  bool first = fract(seed * 0.83) < 0.5;
  vec2 uv = vec2(mix(0.015, 0.985, s), 1.0 - ((first ? 0.47 : 0.415) + 0.2 * vf));
  vec2 uvDx = dFdx(uv);
  vec2 uvDy = dFdy(uv);
  vec3 pic;
  float body;
  float relief;
  if (first) {
    pic = textureGrad(tFilmA, uv, uvDx, uvDy).rgb;
    body = textureGrad(tFilmAA, uv, uvDx, uvDy).r;
    relief = textureGrad(tFilmAH, uv, uvDx, uvDy).r;
  } else {
    pic = textureGrad(tFilmB, uv, uvDx, uvDy).rgb;
    body = textureGrad(tFilmBA, uv, uvDx, uvDy).r;
    relief = textureGrad(tFilmBH, uv, uvDx, uvDy).r;
  }
  // Far off the picture's outline is finer than a pixel: there the blade's own width is the outline.
  float cut = mix(smoothstep(0.35, 0.65, body), 1.0, vFar) * step(abs(vb), 1.0);
  float lip = (1.0 - smoothstep(0.5, 0.8, body)) * cut * (1.0 - vFar);
  float skin = cut * smoothstep(0.0, 0.012, u);
  if (skin < 0.02) discard;

  // A thin body, not a card: the skin has two faces and a thickness, and the light is on it, in it and through it. The picture gives it its
  // veins and its small folds; the section gives it its belly, its back and the rope where it is wrung.
  float lum = dot(pic, vec3(0.333));
  float tone = clamp(lum / 0.2, 0.0, 2.2);
  float fold = smoothstep(0.55, 0.9, relief);
  float crease = 1.0 - smoothstep(0.2, 0.6, tone);
  // It is folded down its length: two or three broad folds across its width, that wander slowly and run into each other, a stretch of it
  // pulled smooth and the next gathered. Nothing finer than that is turned into the light: fine wrinkles flicker.
  float wob = vnoise(vec2(metres * 0.1 + seed, vb * 0.8));
  float phase = vb * (2.2 + 1.6 * fract(seed * 0.173)) + 3.0 * wob + metres * 0.06;
  float gathered = mix(0.25, 1.0, smoothstep(0.3, 0.7, vnoise(vec2(metres * 0.04 + seed * 5.0, vb * 0.5 + seed))));
  n = normalize(n + normalize(vAcross) * (0.7 * cos(phase) * gathered * (1.0 - 0.6 * vFar)));
  float pleat = smoothstep(0.2, 1.0, sin(phase) * gathered);
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  float gather = vGather;
  // Far off: its gathered middle (core), and how far a place is from its two thin ends (mid).
  float mid = smoothstep(0.03, 0.28, s) * (1.0 - smoothstep(0.4, 0.9, s));
  float core = vFar * max(mid * (1.0 - smoothstep(0.1, 0.6, abs(vb))), gather);
  // The lens looks into the trough of the section, or at its back.
  float hollow = smoothstep(0.2, 1.3, face * vSkin.x);
  float back = smoothstep(0.2, 1.3, -face * vSkin.x);
  float belly = smoothstep(0.25, 1.2, abs(vSkin.x)) * (1.0 - vb * vb) * (1.0 - gather);
  // Its edge is rolled: a line wherever the skin ends, at the picture's own edge, round its holes and along every string of its tail.
  float rim = (1.0 - smoothstep(0.55, 0.98, body)) * cut;
  rim = min(rim + 0.6 * lip, 1.0);
  // Its wrinkles catch the sky: the bright lines of the picture's relief.
  float wrinkle = smoothstep(uWrinkle.x, uWrinkle.y, relief);
  // How many skins thick it is here: one where it is stretched over a belly, more at a vein, a fold or its rolled edge, several where it
  // is wrung. The lens looks through more of it where it is seen aslant.
  float thick = 0.5 + 0.8 * fold + 0.7 * crease + 2.4 * gather + 1.1 * rim - 0.3 * belly + 0.5 * pleat;
  float path = thick / max(nv, 0.28);
  float through = exp(-0.45 * path) * (1.0 - 0.5 * vFar);
  // The light on the face the lens sees and on the one it does not. Most of it comes from overhead and from the lee, where the dusk is: a face
  // turned from it is in its own shade, and the inside of a trough is shaded by its walls.
  vec3 above = normalize(vec3(-0.45, 0.72, 0.5));
  float litNear = smoothstep(-0.55, 0.75, dot(n, above)) * (1.0 - 0.6 * hollow * (1.0 - 0.5 * vb * vb));
  float litFar = smoothstep(-0.55, 0.75, -dot(n, above)) * (1.0 - 0.6 * back * (1.0 - 0.5 * vb * vb));
  vec3 onNear = skyIrradiance(n) / 3.14159;
  vec3 onFar = skyIrradiance(-n) / 3.14159;
  if (uStruck.y > 0.0) {
    onNear += min(vec3(0.6), 0.3 * emitterIrradiance(vWorld, n));
    onFar += min(vec3(0.6), 0.3 * emitterIrradiance(vWorld, -n));
  }
  // Lilac-grey whatever lights it: the film keeps the light's brightness and little of its colour.
  onNear = mix(onNear, dot(onNear, vec3(0.3, 0.5, 0.2)) * vec3(0.94, 0.92, 1.12), 0.7);
  onFar = mix(onFar, dot(onFar, vec3(0.3, 0.5, 0.2)) * vec3(0.94, 0.92, 1.12), 0.7);
  float toDusk = pow(clamp(dot(-toCamera, uWarmDir), 0.0, 1.0), 3.0);
  vec3 lilac = mix(vec3(0.95, 0.9, 1.06), vec3(0.86, 0.82, 1.1), fract(seed * 3.3));
  // The picture's own colour about its mean: lilac, its stains of violet and gold, its veins dark.
  vec3 stain = clamp(pic / vec3(0.22, 0.2, 0.24), 0.3, 2.0);
  // What the near face scatters back, and what comes through from the far one: violet, and strongest through a single stretched skin.
  // A single stretched skin scatters little and is nearly clear; a fold of several is a body, and grey.
  float dense = mix(mix(0.2, 1.0, 1.0 - exp(-0.7 * (path - 0.5))), 0.75, vFar);
  // Seen close, where a single skin faces the lens it is clear as glass: what is behind it shows, and it is bright only at its folds, its
  // edges and where it is seen aslant.
  float clear = (1.0 - vFar) * smoothstep(0.15, 0.6, nv) * exp(-1.2 * max(thick - 0.5, 0.0));
  vec3 key = dot(skyIrradiance(above), vec3(0.3, 0.5, 0.2)) * 0.3183 * vec3(0.9, 0.86, 1.16);
  vec3 c = uFilm.x * (uBody.x * dense * (1.0 - 0.35 * gather) * onNear * mix(0.12, 1.3, litNear) + uBody.y * onFar * mix(0.12, 1.3, litFar) * through * vec3(0.8, 0.68, 1.3)) + 2.0 * uFilm.y * uWarmColour * toDusk * through;
  c *= mix(vec3(1.0), stain, uTone.x) * lilac * (0.8 + 0.4 * fract(seed * 5.3)) * (1.0 - 0.25 * vFar) * (1.0 - 0.8 * clear) * (1.0 + 0.25 * vNear);
  // Before the long lens the veils are violet grey, darker than the lit cloud: what is bright on them is the charge.
  c *= mix(vec3(1.0), vec3(0.6, 0.54, 0.82), uVeil);
  // The film's colour is its thickness and the angle it is seen at, as on a soap film: the picture's relief and a slow drift along it
  // are the thickness, and the tint runs through violet, pink and pale green across a fold as the skin turns from the lens.
  float drift = vnoise(vec2(metres / (2.4 * wide) + seed * 3.0, vb * 1.1 + seed));
  float film = 0.7 * drift + 1.1 * (1.0 - nv) + seed;
  vec3 tints = pow(0.5 + 0.5 * cos(6.2832 * (film + vec3(0.0, 0.3333, 0.6667))), vec3(3.0));
  // (Violet is the widest of its three bands and green the narrowest.)
  tints *= vec3(1.9, 1.0, 0.6);
  vec3 pearl = (vec3(0.56, 0.4, 1.0) * tints.x + vec3(1.0, 0.5, 0.8) * tints.y + vec3(0.6, 1.0, 0.76) * tints.z) / (tints.x + tints.y + tints.z);
  c *= mix(vec3(1.0), 1.6 * pearl, 0.9 * uFilm.z * (1.0 - vFar) * (1.0 - gather));
  float fres = 0.04 + 0.96 * pow(1.0 - nv, 4.0);
  vec3 r = reflect(-toCamera, n);
  r.y = abs(r.y) + 0.05;
  vec3 mirror = skyRadiance(normalize(r));
  mirror = mix(mirror, dot(mirror, vec3(0.3, 0.5, 0.2)) * vec3(0.92, 0.94, 1.15), 0.6);
  float glint = smoothstep(0.7, 0.95, relief + 0.25 * (vnoise(vec2(metres * 3.0, vb * 9.0 + seed)) - 0.5));
  // The edge is not lit along its whole length: the line comes and goes with the film's thickness, and seen close it is thin.
  float lineHere = mix(mix(0.25, 1.0, smoothstep(0.35, 0.65, drift)), 1.0, vFar);
  rim *= lineHere;
  // Far down the ridge a kite is a pale body with a lighter edge, not two bright lines with nothing between them.
  float distant = vFar * (1.0 - uVeil);
  rim *= 1.0 - 0.55 * distant;
  // A wet sheen on the face that looks up, on every fold, and along the rolled edge.
  vec3 shine = mirror * (0.5 * fres * litNear + 0.5 * uFilm.w * max(glint, wrinkle) * (0.3 + 0.7 * fres) * (0.35 + 0.65 * litNear) * (1.0 - 0.5 * clear) + mix(1.0, 0.6, vFar) * rim * (1.0 - 0.6 * uVeil)) * (1.0 - 0.55 * uVeil);
  // Pearl: aslant the film gives the sky back tinted by its thickness, violet, then pink, then a pale green, and the tints slide as it
  // turns. Its rolled edge catches the light.
  shine += key * (pearl * (3.2 * uFilm.z * pow(1.0 - nv, 3.0) * (1.0 - 0.7 * gather) * (0.3 + 0.7 * litNear)) + vec3(0.95, 0.95, 1.1) * (0.9 * rim * (1.0 - 0.6 * uVeil))) * (1.0 - 0.8 * vFar);
  // Seen close the film is mother of pearl on the whole of a face that looks at the sky, not only aslant: a sheen on a skin that is
  // otherwise clear, brighter on its veins. None of its colour is the picture's.
  float skyward = smoothstep(-0.3, 0.7, dot(n, above));
  shine += key * mix(vec3(1.0), 1.5 * pearl, 0.8) * (0.11 * uFilm.z * (1.0 - vFar) * (1.0 - gather) * min(tone, 1.6) * mix(0.2, 1.25, skyward));
  // And the picture's own colours are that sheen: its pinks, its violets and the pale green of its veins, bright where the face takes the
  // sky and where the light of the dusk comes through it from behind.
  vec3 hue = clamp(pic / max(lum, 0.03), 0.5, 1.8);
  hue = mix(vec3(dot(hue, vec3(0.333))), hue, 1.15);
  shine += key * hue * (uFilm.z * (1.0 - vFar) * (1.0 - 0.5 * gather) * min(tone, 1.8) * (0.13 * mix(0.25, 1.2, skyward) + 0.1 * litFar)) * mix(0.22, 1.0, max(fold, wrinkle)) * (1.0 - 0.6 * crease);
  // The brightest of the sky on a wet skin: a line of light down every fold that turns to it, which is what says the section is round.
  float ndh = clamp(dot(n, normalize(above + toCamera)), 0.0, 1.0);
  shine += key * (1.0 - 0.6 * uVeil) * (1.5 * pow(ndh, 70.0) + 0.1 * pow(ndh, 14.0)) * vec3(0.94, 0.94, 1.1);
  // A stroke lights the kites near it for the frames it burns: their edges, their strings and the thin of their bellies flare violet
  // white, and are dark again between the return strokes.
  vec2 off = vWorld.xz - uStruckAt.xz;
  float mine = max(abs(uStruck.x - vKite.y) < 0.5 ? 1.0 : 0.3, 1.0 / (1.0 + dot(off, off) / 250000.0));
  float aslant = 1.0 - smoothstep(0.1, 0.5, nv);
  shine += uGlowTint * (uStruck.y * mine * mix(0.03 + 0.07 * fold + 0.45 * glint * glint + 0.35 * rim * lineHere + 0.2 * aslant + 0.07 * belly, (0.04 + 0.25 * fold + 0.3 * glint + 0.8 * rim + 0.5 * aslant + 0.16 * belly) * (1.0 - 0.6 * core), vFar));
  // How much of what is behind it the skin hides. Far off it is more of a body: its lit face pale, its other face dark.
  // Far off each is a darker body where it is gathered, along its middle and at its wrung places, and thin toward its two ends and its
  // edges, where the sky shows through it.
  float cover = clamp((1.0 - exp(-0.33 * path)) * (1.0 - 0.8 * clear) * mix(1.0, 0.3 + 0.55 * mid, vFar) + vFar * (0.03 + 0.2 * mid + 0.3 * core) * (1.0 + 0.3 * vNear) + 0.16 * distant, 0.0, 0.95);
  // Seen close a single skin is nearly clear: the sky stands behind it.
  cover *= mix(0.6, 1.0, vFar);
  c *= 1.0 - 0.7 * core;
  // Lilac-grey, whatever the light: glass, not flesh.
  c = mix(c, dot(c, vec3(0.3, 0.5, 0.2)) * vec3(0.95, 0.97, 1.16), mix(0.2, 0.6, vFar));
  // The shine is on the film, not in it: it shows at its full strength however thin the film.
  c = (c * cover + shine) / max(cover, 0.05);
  float alpha = skin * cover;
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(rigOut(c), alpha * (1.0 - uSolo));
}`;

const CORD_VERTEX = /* glsl */ `
${KITE_GLSL}
${NOISE_GLSL}
attribute vec2 aAt;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vAt;
varying vec3 vKite;
varying float vRoot;
void main() {
  if (!kiteSet()) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  // A kite's cord runs on a little way into its blade and thins out there; a thread is cord to its end.
  float whole = kThread > 0.5 ? kCord + kBlade : kCord + max(1.2, 0.07 * kBlade);
  // It starts some metres up the wind, inside the rock that holds it.
  float d = aAt.x * (whole + 6.0) - 6.0;
  float e = 0.003 * whole;
  vec3 c = kiteCentre(d);
  vec3 tangent = normalize(kiteCentre(d + e) - kiteCentre(d - e));
  vec3 u = normalize(cross(tangent, vec3(0.0, 1.0, 0.0)));
  vec3 w = cross(u, tangent);
  float far = length(cameraPosition - c);
  // Sinew as thick as a wrist, lumped with ice, knotted where the skin grows from it.
  float lumps = 0.5 * smoothstep(0.45, 0.85, vnoise(vec2(d * 0.55, kSeed * 31.0))) + 0.22 * vnoise(vec2(d * 2.3, kSeed * 17.0));
  float knot = (1.0 - kThread) * exp(-pow((d - kCord) / 0.6, 2.0));
  float r = mix(0.03, 0.02, kThread) * (1.0 + lumps + 2.6 * knot) * (1.0 + 1.6 * uStageMore.x);
  r *= kThread > 0.5 ? 1.0 - 0.85 * clamp(d / whole, 0.0, 1.0) : 1.0 - 0.9 * smoothstep(kCord + 0.4, whole, d);
  // The holdfast: the cord's own root, swollen where it grips the rock, knuckled, and a little of it inside the stone.
  float root = exp(-max(d, 0.0) / (0.9 + 0.8 * fract(kSeed * 3.1)));
  r += root * (0.17 + 0.14 * fract(kSeed * 6.7)) * (0.55 + 0.9 * vnoise(vec2(aAt.y * 1.3 + kSeed * 50.0, d * 1.9)));
  // Far off it is a line a pixel and a third wide and no thinner.
  float least = 0.65 * uPixel * far;
  float thin = min(1.0, r / least);
  r = max(r, least);
  vec3 ring = u * cos(aAt.y) + w * sin(aAt.y);
  vec3 p = c + ring * r;
  vWorld = p;
  vNormal = ring;
  vAt = vec4(d, aAt.y, knot, thin);
  vRoot = root;
  vKite = vec3(kSeed, kThread, smoothstep(200.0, 450.0, length(cameraPosition - aAnchor) * uReach));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const CORD_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vAt;
varying vec3 vKite;
varying float vRoot;
void main() {
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float d = vAt.x;
  float seed = vKite.x * 97.0;
  // Twisted fibre, dark and wet, wound round itself at the knot.
  float twist = 0.5 + 0.5 * sin(d * 7.0 + vAt.y * 2.0 + seed);
  float wound = 0.5 + 0.5 * sin(vAt.y * 1.0 + d * 26.0);
  vec3 sinew = mix(vec3(0.085, 0.05, 0.042), vec3(0.03, 0.02, 0.02), mix(twist, wound, vAt.z));
  // Rime on what looks up and into the wind, in beads; thick where the ice has lumped.
  float beads = 0.6 * vnoise(vec2(d * 1.3, seed)) + 0.4 * vnoise(vec2(d * 6.0 + vAt.y, seed + 3.0));
  float rime = smoothstep(0.2, 0.6, 0.5 * n.y - 0.3 * dot(n, normalize(uWind.xyz)) + 0.8 * beads + 0.3) * (1.0 - 0.5 * vAt.z);
  rime = mix(max(rime, 0.62), 0.5, vKite.z);
  // The root is old growth, dark and ridged, with the rime packed into its hollows.
  float ridges = vnoise(vec2(vAt.y * 2.6 + seed, d * 3.3));
  sinew = mix(sinew, vec3(0.06, 0.04, 0.035) * (0.5 + ridges), smoothstep(0.1, 0.5, vRoot));
  rime = mix(rime, smoothstep(0.3, 0.7, 0.45 * n.y + 0.9 * ridges - 0.1), smoothstep(0.1, 0.5, vRoot));
  vec3 albedo = mix(sinew, vec3(0.62, 0.66, 0.74), rime);
  vec3 c = rigShade(vWorld, n, toCamera, albedo, mix(0.3, 0.85, rime), 1.0);
  // Thinner than a pixel, it is a fainter line and not a narrower one.
  gl_FragColor = vec4(rigOut(c * mix(0.45, 1.0, vAt.w)), 1.0);
}`;

// The ice on a cord: spikes where its water froze as it dripped, each with a bead at its end.
const ICE_VERTEX = /* glsl */ `
${KITE_GLSL}
attribute vec3 aIce;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vDown;
void main() {
  if (!kiteSet() || kThread > 0.5 || uStageMore.x > 0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float d = aIce.x * kCord;
  vec3 c = kiteCentre(d);
  float far = length(cameraPosition - c);
  // Far off a spike is less than a pixel and would only glitter: it is left out.
  if (far * uReach > 420.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  // It hangs straight down from the underside of the cord, and swings a little as the cord shakes.
  float len = 0.4 * aIce.y;
  if (fract(aIce.z * 7.7) < 0.45) len = 0.0;
  vec3 hang = normalize(vec3(0.05 * sin(uTime * 2.3 + aIce.z * 40.0), -1.0, 0.25 * uWind.z / max(uWind.w, 1.0) + 0.05 * sin(uTime * 1.9 + aIce.z * 70.0)));
  float t = position.y;
  float girth = (len * 0.09 + 0.02 + 0.4 * uPixel * far) * step(0.001, len) * (1.0 - 0.85 * t) + 0.07 * len * exp(-pow((t - 0.93) / 0.06, 2.0));
  vec3 u = normalize(cross(hang, vec3(1.0, 0.0, 0.0)));
  vec3 w = cross(hang, u);
  vec3 ring = u * position.x + w * position.z;
  vec3 p = c + vec3(0.0, -0.06, 0.0) + hang * (t * len) + ring * girth;
  vWorld = p;
  vNormal = ring;
  vDown = t;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const ICE_FRAGMENT = /* glsl */ `
${RIG_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying float vDown;
void main() {
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal + vec3(0.0, -0.2, 0.0));
  // Clear ice: it shows the sky behind it bent, and the dusk along one side.
  vec3 seen = skyRadiance(normalize(-toCamera + 0.6 * n));
  vec3 c = rigShade(vWorld, n, toCamera, vec3(0.4, 0.45, 0.55), 0.1, 1.0) + 0.55 * seen + 0.4 * skyRadiance(normalize(vec3(-0.6, 0.18, 0.78))) * pow(clamp(dot(n, normalize(vec3(-0.6, 0.18, 0.78))), 0.0, 1.0), 2.0) * (0.4 + 0.6 * vDown);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The holdfast: a knot of husks where a cord goes into the rock, each a blunt body with its scales in rows, dark, and rimed where it
// looks up or into the gale.
const POD_VERTEX = /* glsl */ `
${KITE_GLSL}
// x: metres down the cord, y: the angle round it, z: how far off it, w: the husk's length.
attribute vec4 aPod;
// How much it points down the cord, out from it and at the ground; its seed.
attribute vec4 aAxis;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vPod;
void main() {
  if (!kiteSet()) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vec3 on = kiteCentre(aPod.x);
  vec3 tangent = normalize(kiteCentre(aPod.x + 0.2) - kiteCentre(aPod.x - 0.2));
  vec3 beside = normalize(cross(tangent, vec3(0.0, 1.0, 0.0)));
  vec3 over = cross(beside, tangent);
  // It grows out of the cord: out from it, down its length and a little toward the ground.
  vec3 spoke = beside * cos(aPod.y) + over * sin(aPod.y);
  vec3 axis = normalize(tangent * aAxis.x + spoke * aAxis.y - vec3(0.0, aAxis.z, 0.0));
  vec3 u = normalize(cross(axis, vec3(0.0, 1.0, 0.0) + 0.3 * axis.yzx));
  vec3 w = cross(axis, u);
  float y = position.y;
  float turn = atan(position.z, position.x);
  // Blunt at its root, widest a third of the way along, drawn out to a point; the scales stand out of it.
  float t = 0.5 + 0.5 * y;
  float girth = 0.36 * (1.0 - 0.5 * t) * (1.0 + 0.13 * sin(turn * 5.0 + y * 4.0 + aAxis.w * 20.0) * sin(y * 9.0 + aAxis.w * 7.0));
  vec3 centre = on + spoke * aPod.z + axis * (0.4 * aPod.w);
  vec3 p = centre + aPod.w * (axis * (0.5 * y) + (u * position.x + w * position.z) * girth);
  vWorld = p;
  vNormal = normalize(axis * (position.y * 0.5) + (u * position.x + w * position.z) * 1.6);
  vPod = vec3(y, turn, aAxis.w);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const POD_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vPod;
void main() {
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float seed = vPod.z * 97.0;
  float rows = smoothstep(-0.2, 0.9, sin(vPod.x * 9.0 + 1.2 * sin(vPod.y * 5.0 + seed)));
  float grain = vnoise(vec2(vPod.y * 4.0 + seed, vPod.x * 9.0));
  // Brown as old kelp, each husk its own shade, and frost on what looks up, in the rows and on the tip.
  vec3 husk = mix(vec3(0.07, 0.042, 0.028), vec3(0.3, 0.19, 0.115), grain * (0.5 + 0.5 * rows)) * (0.6 + 0.8 * fract(seed * 0.37));
  float frost = vnoise(vec2(vPod.y * 9.0 + seed, vPod.x * 17.0));
  float rime = smoothstep(0.42, 0.8, 0.55 * n.y - 0.25 * dot(n, normalize(uWind.xyz)) + 0.55 * frost + 0.12 + 0.2 * smoothstep(0.3, 1.0, vPod.x)) * 0.85;
  vec3 c = rigShade(vWorld, n, toCamera, mix(husk, vec3(0.62, 0.66, 0.74), rime), 1.0, 0.45 + 0.55 * rows);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export function create(ctx: Context): Piece {
  const rng = ctx.rng('kites');
  const kites: Kite[] = [];
  // The face of the first spire that the lens of key spine-2 stands before: its holdfasts sit on that face, by the edge.
  const stand = step(kiteEdge, heading(tipOf(spires[FIRST + 1] as (typeof spires)[number]), kiteEdge) - 16, 78);
  const axes = finAxes(spires[FIRST] as (typeof spires)[number]);
  const lensSide = (stand[0] - kiteEdge[0]) * axes.bx + (stand[2] - kiteEdge[2]) * axes.bz > 0 ? 1 : -1;
  // A holdfast sits in the rock of the spire's lee edge, on the face `across` says (in shares of the fin's thickness): the fin's section
  // is a rounded one, so off its middle line the edge stands a little back. The built rock stands some metres in or out of the fin's
  // smooth body, so the cord and its knot of husks start inside it.
  const seat = (sp: (typeof spires)[number], t: number, across: number): Vec3 => finEdge(sp, t, 0.97 * Math.cbrt(1 - Math.abs(across) ** 3), across);
  spires.forEach((sp, n) => {
    const near = n === FIRST;
    const reach = near ? 1 : n === FIRST + 2 ? 1.9 : n === FIRST + 1 ? 0.6 : 0.85;
    for (const [share, count] of colonies(n)) {
      const t = share + rng.range(-0.008, 0.008);
      for (let i = 0; i < count; i++) {
        // A colony is a few kites of one holdfast: one long, the rest shorter, none alike.
        const length = (i === 0 ? rng.range(190, 260) : rng.range(70, 170)) * reach;
        const at = t + (i - (count - 1) / 2) * 0.006;
        const across = near ? lensSide * rng.range(0.7, 0.78) : rng.range(-0.25, 0.25);
        const anchor = seat(sp, at, across);
        const half = near ? (i === 0 ? rng.range(4.6, 6.4) : rng.range(2.6, 4.2)) : rng.range(10, 15) * (i === 0 ? 1 : 0.75);
        const waves = rng.range(1.25, 2.1);
        const sag = rng.range(0.05, 0.13);
        const cord = rng.range(14, 30) * (near ? 0.4 : 1.6);
        kites.push({ anchor, cord, blade: length - cord, half, phase: rng.range(0, 6.28), wave: (length - cord) / waves, sag, seed: rng.next(), spire: n - FIRST + 1, lead: i === 0 });
      }
      // And bare threads from the same holdfast: cords with no skin on them, that lost it or never grew it.
      const threads = ctx.rng(`kites/threads/${n}/${share}`);
      const bare = n === FIRST + 2 ? 3 : near ? 2 : 0;
      for (let i = 0; i < bare; i++) {
        const length = threads.range(60, 190) * reach;
        const at = t + threads.range(-0.008, 0.008);
        const across = near ? lensSide * threads.range(0.7, 0.78) : threads.range(-0.25, 0.25);
        kites.push({
          anchor: seat(sp, at, across),
          cord: 0.12 * length,
          blade: 0.88 * length,
          half: -1,
          phase: threads.range(0, 6.28),
          wave: length / threads.range(1.6, 3.4),
          sag: threads.range(0.0, 0.1),
          seed: threads.next(),
          spire: n - FIRST + 1,
          lead: false,
        });
      }
    }
  });

  // Between the colonies of the first spire fly narrow ones on cords of their own: the thinner ones under the strong.
  const narrow = ctx.rng('kites/narrow');
  for (const share of [0.85, 0.812, 0.78, 0.75, 0.72]) {
    const length = narrow.range(100, 170);
    const cord = narrow.range(14, 30) * 0.4;
    kites.push({
      anchor: seat(spires[FIRST] as (typeof spires)[number], share + narrow.range(-0.004, 0.004), lensSide * narrow.range(0.7, 0.78)),
      cord,
      blade: length - cord,
      half: narrow.range(1.6, 2.6),
      phase: narrow.range(0, 6.28),
      wave: (length - cord) / narrow.range(1.25, 2.1),
      sag: narrow.range(0.05, 0.13),
      seed: narrow.next(),
      spire: 1,
      lead: false,
    });
  }

  // The skin is laid over what is behind it, so the kites are drawn the farthest first, as the lens of key spine-2 sees them.
  const farness = (k: Kite): number => Math.hypot(k.anchor[0] + WIND[0] * k.blade * 0.4 - stand[0], k.anchor[1] - stand[1], k.anchor[2] + WIND[2] * k.blade * 0.4 - stand[2]);
  kites.sort((a, b) => farness(b) - farness(a));
  const blades = kites.filter((k) => k.half > 0);

  /** One mesh of every kite in `list`, each a grid of `down` by `round` cells whose points carry the kite and where on it they are. */
  const strips = (list: Kite[], down: number, round: number, at: (i: number, j: number) => [number, number], closed: boolean): THREE.BufferGeometry => {
    const each = (down + 1) * (round + 1);
    const total = list.length * each;
    const anchor = new Float32Array(total * 3);
    const size = new Float32Array(total * 4);
    const seed = new Float32Array(total * 4);
    const lead = new Float32Array(total);
    const where = new Float32Array(total * 2);
    const index: number[] = [];
    list.forEach((k, n) => {
      const first = n * each;
      for (let i = 0; i <= down; i++) {
        for (let j = 0; j <= round; j++) {
          const v = first + i * (round + 1) + j;
          anchor.set(k.anchor, v * 3);
          size.set([k.cord, k.blade, k.half, k.wave], v * 4);
          seed.set([k.phase, k.seed, k.spire, k.sag], v * 4);
          lead[v] = k.lead ? 1 : 0;
          where.set(at(i, j), v * 2);
          if (i < down && j < round) {
            if (closed) index.push(v, v + round + 1, v + 1, v + 1, v + round + 1, v + round + 2);
            else index.push(v, v + 1, v + round + 1, v + 1, v + round + 2, v + round + 1);
          }
        }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    g.setAttribute('aAnchor', new THREE.BufferAttribute(anchor, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 4));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    g.setAttribute('aLead', new THREE.BufferAttribute(lead, 1));
    g.setAttribute('aAt', new THREE.BufferAttribute(where, 2));
    g.setIndex(index);
    return g;
  };

  const pixel = { value: 0.0005 };
  // How long the lens is beside that of key spine-2.
  const reach = { value: 1 };
  const stage = new THREE.Vector4(1, 1, 1, 0);
  const stageMore = new THREE.Vector4(0, 0, 0, 1);
  const fly = new THREE.Vector2(0, 0);
  const wideShot = during('spine-01');
  const closeShot = during('spine-02');
  const veil = { value: 0 };
  const film = new THREE.Vector4(1.0, 0.05, 0.15, 0.9);
  const struck = new THREE.Vector4(0, 0, 0, 0);
  const struckAt = new THREE.Vector3(0, 0, 0);
  const shared = {
    ...ctx.rig.uniforms,
    uPixel: pixel,
    uReach: reach,
    uStage: { value: stage },
    uStageMore: { value: stageMore },
    uFly: { value: fly },
  };

  const bladeMaterial = new THREE.ShaderMaterial({
    vertexShader: BLADE_VERTEX,
    fragmentShader: BLADE_FRAGMENT,
    uniforms: {
      ...shared,
      uStruck: { value: struck },
      uStruckAt: { value: struckAt },
      uGlowTint: { value: new THREE.Vector3(1.0, 0.72, 2.8) },
      uFilm: { value: film },
      uVeil: veil,
      uBody: { value: new THREE.Vector3(0.6, 1.2, 0.035) },
      uWrinkle: { value: new THREE.Vector2(0.5, 0.85) },
      uTone: { value: new THREE.Vector2(0.85, 0.25) },
      tFilmA: { value: ctx.assets.texture('mat/kitefilm-a.jpg', { kind: 'colour', repeat: false, anisotropy: 8 }) },
      tFilmAA: { value: ctx.assets.texture('mat/kitefilm-a-a.png', { kind: 'data', repeat: false, anisotropy: 8 }) },
      tFilmAH: { value: ctx.assets.texture('mat/kitefilm-a-h.png', { kind: 'data', repeat: false, anisotropy: 8 }) },
      tFilmB: { value: ctx.assets.texture('mat/kitefilm-b.jpg', { kind: 'colour', repeat: false, anisotropy: 8 }) },
      tFilmBA: { value: ctx.assets.texture('mat/kitefilm-b-a.png', { kind: 'data', repeat: false, anisotropy: 8 }) },
      tFilmBH: { value: ctx.assets.texture('mat/kitefilm-b-h.png', { kind: 'data', repeat: false, anisotropy: 8 }) },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
  });
  const bladeMesh = new THREE.Mesh(strips(blades, ALONG, ACROSS, (i, j) => [i / ALONG, (j / ACROSS) * 2 - 1], false), bladeMaterial);
  bladeMesh.frustumCulled = false;
  // Drawn after the dome, so that the sky is behind the skin when it is laid over.
  bladeMesh.renderOrder = 12;

  const cordMaterial = new THREE.ShaderMaterial({ vertexShader: CORD_VERTEX, fragmentShader: CORD_FRAGMENT, uniforms: shared, side: THREE.DoubleSide });
  const cordMesh = new THREE.Mesh(strips(kites, CORD_ALONG, CORD_ROUND, (i, j) => [i / CORD_ALONG, (j / CORD_ROUND) * Math.PI * 2], true), cordMaterial);
  cordMesh.frustumCulled = false;

  // The ice: a spike is a cone of a few sides; each cord has its own, where its seed says, longest where the cord hangs lowest.
  const spike = new THREE.CylinderGeometry(1, 1, 1, 6, 8, true);
  spike.translate(0, 0.5, 0);
  const iceGeometry = new THREE.InstancedBufferGeometry();
  iceGeometry.index = spike.index;
  iceGeometry.setAttribute('position', spike.getAttribute('position'));
  const hung = ctx.rng('kites/ice');
  const iceCount = blades.length * ICE;
  const iceAnchor = new Float32Array(iceCount * 3);
  const iceSize = new Float32Array(iceCount * 4);
  const iceSeed = new Float32Array(iceCount * 4);
  const iceLead = new Float32Array(iceCount);
  const iceAt = new Float32Array(iceCount * 3);
  blades.forEach((k, n) => {
    for (let i = 0; i < ICE; i++) {
      const v = n * ICE + i;
      iceAnchor.set(k.anchor, v * 3);
      iceSize.set([k.cord, k.blade, k.half, k.wave], v * 4);
      iceSeed.set([k.phase, k.seed, k.spire, k.sag], v * 4);
      iceLead[v] = k.lead ? 1 : 0;
      const at = (i + hung.range(0.15, 0.85)) / ICE;
      // Few long ones, many short.
      iceAt.set([0.06 + 0.9 * at, 0.25 + 1.9 * hung.next() ** 3 + 0.9 * Math.sin(Math.PI * at) * hung.next(), hung.next()], v * 3);
    }
  });
  iceGeometry.setAttribute('aAnchor', new THREE.InstancedBufferAttribute(iceAnchor, 3));
  iceGeometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(iceSize, 4));
  iceGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(iceSeed, 4));
  iceGeometry.setAttribute('aLead', new THREE.InstancedBufferAttribute(iceLead, 1));
  iceGeometry.setAttribute('aIce', new THREE.InstancedBufferAttribute(iceAt, 3));
  iceGeometry.instanceCount = iceCount;
  const iceMesh = new THREE.Mesh(iceGeometry, new THREE.ShaderMaterial({ vertexShader: ICE_VERTEX, fragmentShader: ICE_FRAGMENT, uniforms: shared, side: THREE.DoubleSide }));
  iceMesh.frustumCulled = false;

  // The husks: a few round each cord where it leaves the rock, strung a little way down the wind's line so that the rock, whose face
  // is not the layout's, always has some of them standing out of it.
  const ball = new THREE.SphereGeometry(1, 12, 9);
  const podGeometry = new THREE.InstancedBufferGeometry();
  podGeometry.index = ball.index;
  podGeometry.setAttribute('position', ball.getAttribute('position'));
  const husks = ctx.rng('kites/husks');
  const flat = Math.hypot(WIND[0], WIND[2]);
  const down: Vec3 = [WIND[0] / flat, 0, WIND[2] / flat];
  const beside: Vec3 = [down[2], 0, -down[0]];
  const pods: number[] = [];
  const podAxes: number[] = [];
  // They grow on the cord's root in one knot, packed, most of them where it comes out of the rock and fewer and smaller down its first
  // metres: wherever the rock ends, the ones at its face are the ones seen.
  const podAnchor: number[] = [];
  const podSize: number[] = [];
  const podSeed: number[] = [];
  const podLead: number[] = [];
  kites.forEach((k, nth) => {
    const big = k.spire === 1 ? 1 : 1.7;
    const many = k.half > 0 ? 13 : 5;
    for (let i = 0; i < many; i++) {
      const d = -2 + 6 * husks.next() ** 1.5;
      const small = 1 - 0.5 * Math.min(1, Math.max(0, (d - 1.5) / 2.5));
      pods.push(d * big, husks.range(0, 2 * Math.PI), husks.range(0.05, 0.3) * big * small, husks.range(1.2, 2.2) * big * small);
      podAxes.push(husks.range(0.2, 1), husks.range(0.5, 1.1), husks.range(0.1, 0.9), husks.next() + nth * 0.01);
      podAnchor.push(k.anchor[0], k.anchor[1], k.anchor[2]);
      podSize.push(k.cord, k.blade, k.half, k.wave);
      podSeed.push(k.phase, k.seed, k.spire, k.sag);
      podLead.push(k.lead ? 1 : 0);
    }
  });
  podGeometry.setAttribute('aAnchor', new THREE.InstancedBufferAttribute(new Float32Array(podAnchor), 3));
  podGeometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(new Float32Array(podSize), 4));
  podGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(podSeed), 4));
  podGeometry.setAttribute('aLead', new THREE.InstancedBufferAttribute(new Float32Array(podLead), 1));
  podGeometry.setAttribute('aPod', new THREE.InstancedBufferAttribute(new Float32Array(pods), 4));
  podGeometry.setAttribute('aAxis', new THREE.InstancedBufferAttribute(new Float32Array(podAxes), 4));
  podGeometry.instanceCount = pods.length / 4;
  const podMesh = new THREE.Mesh(podGeometry, new THREE.ShaderMaterial({ vertexShader: POD_VERTEX, fragmentShader: POD_FRAGMENT, uniforms: shared }));
  podMesh.frustumCulled = false;

  ctx.scene.add(ctx.parts.built('tether-kites', bladeMesh, cordMesh, iceMesh, podMesh));
  ctx.scene.add(cordMesh);
  ctx.scene.add(iceMesh);
  ctx.scene.add(podMesh);

  const size = new THREE.Vector2();
  let height = 0;
  return {
    setTime: (seconds) => {
      const inStrike = stagedSeconds() >= STRIKE_FROM - 1e-4 && stagedSeconds() < INSIDE_FROM - 1e-4;
      // Staged by shot. spine-04, the long lens: the struck spire's kites at the size that lens needs, no other spire flies any.
      // spine-02, the close lens on the first spire: its kites on long cords, climbing the wind, short enough that the lens holds most of one.
      const inClose = stagedSeconds() >= closeShot.from && stagedSeconds() <= closeShot.to;
      // spine-01, the wide lens from far down the ridge: the first spire's kites broader, its bare threads not drawn.
      const inWide = stagedSeconds() >= wideShot.from && stagedSeconds() <= wideShot.to;
      if (inStrike) stage.set(0.17, 0.32, 0.45, 3);
      else if (inClose) stage.set(0.4, 0.5, 1.05, 1);
      else if (inWide) stage.set(1.25, 1.15, 1, 1);
      else stage.set(1, 1, 1, 0);
      stageMore.set(inStrike ? 1 : 0, inClose ? 0.1 : 0, inStrike ? 0.55 : inWide ? 1 : inClose ? 0.85 : 0, inStrike ? 1.5 : 1);
      fly.set(inWide && !inStrike ? 1 : 0, inClose && !inStrike ? 1 : 0);
      // Seen close the skin is thin and shows its colours; far off it is more of a body.
      // Seen close the film shows its oil colours.
      film.z = inClose ? 0.9 : 0.15;
      film.w = inClose ? 0.55 : 0.9;
      veil.value = inStrike ? 1 : 0;
      const flash = flashAt(seconds);
      // The stroke as it burns and nothing after it: between the return strokes the kites are dark.
      struck.set(flash ? flash.spire : 0, flash ? Math.min(1.5, flash.power * 1.2) : 0, 0, 0);
      struckAt.set(flash ? flash.at[0] : 0, flash ? flash.at[1] : 0, flash ? flash.at[2] : 0);
    },
    beforeSample: (renderer, camera) => {
      renderer.getDrawingBufferSize(size);
      pixel.value = 2 / ((camera.projectionMatrix.elements[5] as number) * (height || size.y || 2160));
      reach.value = 1 / ((camera.projectionMatrix.elements[5] as number) * 0.3249);
    },
    resize: (_w, h) => {
      height = h;
    },
  };
}
