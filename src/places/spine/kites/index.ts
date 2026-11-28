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
const ALONG = 200;
const ACROSS = 16;
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
  /** The one long kite of its spire, off the highest holdfast: the others of the long lens are wisps beside it. */
  chief?: boolean;
  /** Torn off its cord: it drifts down the wind, a skin and nothing else. */
  loose?: boolean;
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
// x: 1 in the wide shot, where the first spire's kites are thinned and fanned apart. y: 1 in the close shot. z: the second the wide
// shot starts at, from which the loose skins drift.
uniform vec3 uFly;
vec3 kAnchor;
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
  kAnchor = aAnchor;
  if (aLead < -0.5) {
    // A skin that tore loose: it goes down the wind, slower than the gale, sinking a little, and is seen only by the wide lens.
    if (uFly.x < 0.5) return false;
    float gone = uTime - uFly.z;
    kAnchor += normalize(uWind.xyz) * ((5.0 + 5.0 * fract(kSeed * 3.1)) * gone) - vec3(0.0, (0.5 + 1.2 * fract(kSeed * 6.7)) * gone, 0.0);
    kYaw = 0.5 * (2.0 * fract(kSeed * 23.1) - 1.0);
    kClimb = 0.5 * (fract(kSeed * 13.7) - 0.5);
    return true;
  }
  float rank = 2.0 * fract(kSeed * 23.1) - 1.0;
  // Each heads a little off the wind's line, its own way: sky stands between them.
  kYaw = 0.07 * rank;
  kClimb = 0.1 * (fract(kSeed * 13.7) - 0.5);
  if (kThread > 0.5 && fract(kSeed * 11.3) < uStageMore.z) return false;
  if (uStage.w > 0.0) {
    if (abs(aSeed.z - uStage.w) > 0.5) {
      if (uStageMore.x > 0.5) return false;
    } else {
      // In the long lens one kite of the spire is long and broad; the long ones of its other colonies are wisps beside it, the rest short.
      float lead = uStageMore.x > 0.5 ? (aLead > 0.9 ? 1.7 : mix(0.5, 1.0, aLead)) : 1.0;
      // The close lens holds a few of them, each whole and apart from the next: most of the colony is not in the air.
      if (uFly.y > 0.5 && kThread < 0.5 && aLead < 0.5 && fract(kSeed * 17.7) < 0.55) return false;
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
      if (uStageMore.x > 0.5) kHalf *= aLead > 0.9 ? 1.0 : mix(0.3, 0.5, aLead);
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
  vec3 p = kAnchor + dir * d;
  // The cord hangs under its ice between the rock and the knot, and shakes a little.
  float h = clamp(d / kCord, 0.0, 1.0);
  p.y -= kSag * kCord * 4.0 * h * (1.0 - h) * (1.0 + 0.12 * sin(t * 2.9 + kPhase * 3.0));
  float x = max(d - kCord, 0.0);
  float s = x / kBlade;
  float k = 6.2832 / kWave;
  // Gusts go down the line at the wind's own speed and the waves swell where one passes: the outline is never the same a second later.
  float gust = 0.62 + 0.3 * sin(3.3 * (t - x / uWind.w) + kPhase * 4.0) + 0.2 * sin(1.9 * (t - x / uWind.w) + kPhase * 1.3);
  float env = s * sqrt(max(s, 0.0));
  // No two bow alike: each by its own amount, and each with one long slow bend of its own that travels down it.
  float ownAmp = 0.55 + 0.9 * fract(kSeed * 7.7);
  float amp = 0.05 * kBlade * uStageMore.w * gust * ownAmp;
  float bend = 0.045 * kBlade * uStageMore.w * (1.5 - ownAmp) * s * sin(0.42 * k * (x - 0.7 * kSpeed * t) + kPhase * 3.3);
  p += lift * bend + side * (0.6 * bend * cos(kPhase * 2.1));
  float p1 = k * (x - kSpeed * t) + kPhase;
  float p2 = 1.83 * k * (x - 1.17 * kSpeed * t) + kPhase * 2.7;
  float p3 = 0.71 * k * (x - 0.85 * kSpeed * t) + kPhase * 1.9 + 1.3;
  float p4 = 4.3 * k * (x - 1.3 * kSpeed * t) + kPhase * 5.1;
  // The tail whips: a short fast wave on its last third.
  // Far off the short waves are dropped: a few clear loops hold where many would run into a patch.
  float farK = smoothstep(200.0, 450.0, length(cameraPosition - aAnchor) * uReach);
  float whip = 0.3 * amp * s * s * s * sin(p4) * (1.0 - farK);
  p += lift * (amp * env * (sin(p1) + 0.3 * (1.0 - farK) * sin(p2)) + whip) + side * (0.8 * amp * env * (sin(p3) + 0.25 * (1.0 - farK) * cos(p2)) + 0.7 * whip);
  // A wet skin has weight: the far end rides lower than the knot.
  p.y -= 0.035 * kBlade * s * s;
  return p;
}`;

// The skin of a kite is one surface, worked out from the time alone: skinAt gives the point of it at s of its length and v across it
// (-1 to 1). The vertex shader takes the normal from that same surface (two more points of it), so the light follows every bend,
// twist and ripple of the skin and nothing is shaded that is not there.
const BLADE_VERTEX = /* glsl */ `
${KITE_GLSL}
attribute vec2 aAt;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vAt;
varying vec4 vKite;
varying vec3 vSkin;
// The outline: how wide the blade is at s of its length, as a share of its widest. It leaves the knot gathered, opens slowly, is
// widest before its middle and is drawn out to a point. No two alike.
float outline(float s, float sd) {
  float h1 = fract(sd * 3.7);
  float h2 = fract(sd * 5.9);
  float h3 = fract(sd * 8.3);
  float rise = smoothstep(0.0, 0.2 + 0.14 * h1, s);
  // The tail is not drawn out to a point: it stays broad to its end, where it is torn off ragged.
  float tail = mix(1.0 - smoothstep(0.45 + 0.25 * h2, 1.0, s), 1.0, 0.45 + 0.3 * h1);
  float wander = 0.9 + 0.1 * sin(s * 7.0 + sd * 30.0);
  return pow(max(rise, 1e-6), 1.3) * pow(max(tail, 1e-6), 0.85 + 0.6 * h3) * wander;
}
float sWide;
float sHalf;
vec3 skinAt(float s, float v) {
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
  // It stands on its edge in the gale and shows a face. A slow twist travels down it, so its width in the frame comes and goes; a few
  // turn right over once, over a long stretch of their length.
  float way = fract(kSeed * 5.3) < 0.5 ? -1.0 : 1.0;
  float at = 0.28 + 0.26 * fract(kSeed * 2.3) + 0.04 * sin(t * 0.7 + kPhase);
  float turns = fract(kSeed * 8.9);
  float at2 = 0.72 + 0.14 * fract(kSeed * 6.1) + 0.03 * sin(t * 0.5 + kPhase * 1.4);
  float turn = 3.14159 * (step(0.3, turns) * smoothstep(at - 0.2, at + 0.2, s) + step(0.7, turns) * smoothstep(at2 - 0.14, at2 + 0.14, s));
  float roll = 1.5708 + way * (0.15 + 0.45 * fract(kSeed * 9.1)) + (0.22 + 0.4 * fract(kSeed * 4.1)) * smoothstep(0.0, 0.3, s) * sin(0.6 * k * (x - 0.9 * kSpeed * t) + kPhase * 2.0) + 0.25 * s * sin(1.7 * k * (x - 1.2 * kSpeed * t) + kPhase) + turn;
  vec3 across = flat_ * cos(roll) + upward * sin(roll);
  vec3 normal_ = cross(tangent, across);
  float far = length(cameraPosition - c);
  // Far off the strip is the kite's own width and no more: a thin wisp, not a band.
  float farOff = smoothstep(200.0, 450.0, length(cameraPosition - aAnchor) * uReach);
  sWide = mix(1.45, 0.75, farOff) * kHalf * outline(s, kSeed);
  // Far off a blade is never thinner than a pixel and a half: it does not come and go between the pixels.
  sHalf = max(sWide, 0.75 * uPixel * far);
  // The section: a shallow arc the wind fills and empties as a ripple passes (curl is half the angle the arc turns through), and two
  // edges that tremble each in its own time, more toward the tail. Taut: it never folds.
  float kb = 6.2832 / (16.0 * kHalf);
  float curl = (0.42 * sin(kb * (x - kSpeed * t) + kSeed * 40.0) + 0.26 * sin(0.37 * kb * (x - 0.8 * kSpeed * t) + kPhase * 1.3)) * smoothstep(0.02, 0.25, s);
  float flutter = 0.07 * s * sin(2.4 * kb * (x - 1.25 * kSpeed * t) + kSeed * 90.0 + 1.7 * v);
  float av = abs(v);
  float a = curl * v;
  float sx = abs(curl) < 0.05 ? v : sin(a) / curl;
  float sy = abs(curl) < 0.05 ? 0.5 * curl * (v * v - 0.4) : (1.0 - cos(a) - 0.4 * (1.0 - cos(curl))) / curl;
  sy += flutter * av * av * av;
  return c + (across * sx + normal_ * sy) * sHalf;
}
void main() {
  if (!kiteSet() || kThread > 0.5) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float s = aAt.x;
  float v = aAt.y;
  // Two more points of the skin, one down it and one across (toward its middle), give its normal as it is here.
  float ds = s < 0.5 ? 0.004 : -0.004;
  float dv = v < 0.0 ? 0.08 : -0.08;
  vec3 pa = skinAt(s + ds, v);
  vec3 pb = skinAt(s, v + dv);
  vec3 p = skinAt(s, v);
  vec3 n = cross(pa - p, pb - p) * sign(ds * dv);
  vWorld = p;
  vNormal = dot(n, n) > 1e-24 ? normalize(n) : vec3(0.0, 1.0, 0.0);
  vAt = vec4(s, v, s * kBlade, sHalf);
  vKite = vec4(kSeed, aSeed.z, smoothstep(200.0, 450.0, length(cameraPosition - aAnchor) * uReach), sWide / sHalf);
  vSkin = vec3(4.2 * kHalf, kBlade, outline(s, kSeed));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

// A membrane: one thin skin whose thickness changes slowly over it. The thickness says how much of what is behind it shows, how much
// light it scatters back and lets through, and which colour its sheen takes where it catches the sky. Nothing in it is a picture.
const BLADE_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
uniform vec4 uStruck;
uniform vec3 uStruckAt;
uniform vec3 uGlowTint;
uniform vec4 uFilm;
uniform vec4 uBody;
uniform float uVeil;
uniform float uInside;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vAt;
varying vec4 vKite;
varying vec3 vSkin;
void main() {
  float s = vAt.x;
  float v = vAt.y;
  float seed = vKite.x * 97.0;
  float vFar = vKite.z;
  // Where on the skin, in widths of it: the same measure down it and across it, so nothing in it is pulled long.
  vec2 q = vec2(vAt.z / vSkin.x, 0.5 * v);
  // Everything that asks how fast a thing runs over the screen is asked here, before any branch.
  float vW = fwidth(v);
  // One torn place on some of them: long down the blade, its outline uneven. How far a point is from it, 1 at its lip.
  float tornAt = 0.42 + 0.3 * fract(seed * 1.93);
  float tornLong = 0.55 + 0.6 * fract(seed * 2.77);
  vec2 tornOff = vec2((q.x - tornAt * vSkin.y / vSkin.x) / tornLong, (v - 0.5 * (fract(seed * 4.31) - 0.5)) / (0.3 + 0.2 * fract(seed * 6.13)));
  float tear = length(tornOff) + 0.5 * (vnoise(q * vec2(2.6, 3.4) + vec2(seed * 9.1, seed * 4.0)) - 0.5) + 0.25 * (vnoise(q * vec2(7.0, 9.0) + seed * 2.0) - 0.5);
  float tearW = fwidth(tear);
  float sW = fwidth(s);
  // The edge is not ruled: it comes in and goes out along the blade, each side its own way, with a nick here and there.
  float side = smoothstep(-0.3, 0.3, v);
  float ragA = vnoise(vec2(q.x * 1.3 + seed * 2.0, 3.0));
  float ragB = vnoise(vec2(q.x * 1.3 + seed * 5.0, 11.0));
  float nickA = vnoise(vec2(q.x * 2.9 + seed * 7.0, 17.0));
  float nickB = vnoise(vec2(q.x * 2.9 + seed * 3.0, 29.0));
  float toTail = smoothstep(0.5, 1.0, s);
  float rim = 1.0 - (1.0 + 1.6 * toTail) * mix(0.2 * ragA + 0.1 * smoothstep(0.5, 1.0, nickA), 0.2 * ragB + 0.1 * smoothstep(0.5, 1.0, nickB), side);
  // Its end is torn: tongues of it run on, each to its own length, and between them it is gone.
  float endAt = 0.8 + 0.19 * vnoise(vec2(v * 2.6 + seed * 3.0, seed)) - 0.1 * vnoise(vec2(v * 9.0 + seed, 5.0)) ;
  float edgeAt = abs(v) / rim;
  float edgeW = clamp(2.5 * fwidth(edgeAt), 0.03, 1.0);
  // Which way across the skin lies in the world, from how the point and v run over the screen.
  vec3 acrossWay = (dFdx(vWorld) * dFdy(s) - dFdy(vWorld) * dFdx(s)) * sign(dFdx(v) * dFdy(s) - dFdy(v) * dFdx(s));
  vec3 toCamera = normalize(cameraPosition - vWorld);
  // A normal that came out nothing (two faces met in one pixel) looks at the lens: nothing here divides by nothing.
  vec3 n = dot(vNormal, vNormal) > 1e-10 ? normalize(vNormal) : toCamera;
  // Creases: the skin is drawn long by the gale and wrinkles down its length, finely. The light catches along them.
  float broad = vnoise(q * vec2(1.1, 2.0) + seed);
  // They are not pleats: a patch is wrinkled close, the next lies smooth, and the wrinkles run a little aslant and into each other.
  float warp = 3.2 * broad + 2.4 * vnoise(q * vec2(2.3, 1.1) + seed * 7.0);
  float patchy = smoothstep(0.3, 0.72, vnoise(q * vec2(0.8, 1.5) + seed * 11.0));
  float pitch = 3.2 + 3.0 * fract(seed * 0.73);
  float crease = vnoise(vec2(q.x * 0.45 + seed * 3.0, v * pitch + warp)) + 0.5 * vnoise(vec2(q.x * 1.7 + 0.8 * v + seed, v * 2.4 * pitch - 1.3 * q.x + warp));
  float creaseB = vnoise(vec2(q.x * 0.45 + seed * 3.0, (v + 0.06) * pitch + warp)) + 0.5 * vnoise(vec2(q.x * 1.7 + 0.8 * (v + 0.06) + seed, (v + 0.06) * 2.4 * pitch - 1.3 * q.x + warp));
  float creaseOn = (1.0 - vKite.z) * (1.0 - smoothstep(0.02, 0.09, vW)) * (0.25 + 1.3 * patchy);
  // A crease is a fold: the lens looks through more of the skin along it, and it stands dark in the clear body.
  float fold = creaseOn * smoothstep(0.035, 0.11, abs(creaseB - crease));
  n = normalize(n - (dot(acrossWay, acrossWay) > 1e-20 ? normalize(acrossWay) : vec3(0.0)) * ((creaseB - crease) * 2.2 * creaseOn));
  n *= dot(n, toCamera) < 0.0 ? -1.0 : 1.0;
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  // How much of the fine work of the skin a pixel can hold: none far off.
  float fine = (1.0 - vFar) * (1.0 - smoothstep(0.015, 0.06, vW));

  // The thickness: broad slow swells, a rib down the middle, fibres that run its length, veins that leave the rib aslant, and an edge
  // that is rolled. All of it smooth.
  float swell = vnoise(q * vec2(3.6, 4.4) + seed * 1.7);
  float fibre = vnoise(vec2(q.x * 1.2 + seed * 3.0, v * 9.0 + 2.5 * broad));
  float branch = q.x * 3.2 - 1.5 * abs(v) + 0.9 * swell + seed;
  float vein = (1.0 - smoothstep(0.03, 0.2, abs(fract(branch) - 0.5))) * smoothstep(0.05, 0.3, abs(v)) * (1.0 - 0.6 * abs(v));
  float rib = exp(-v * v / 0.006);
  float rolled = smoothstep(0.78, 1.0, edgeAt);
  // Where it is torn: toward its tail the thin places have gone, long ways down it, and the skin round each is drawn thin and rolled.
  float torn = fract(seed * 0.61);
  float isTorn = step(0.55, torn);
  float tearEdge = max(0.04, 2.0 * tearW);
  float hole = isTorn * (1.0 - smoothstep(1.0 - tearEdge, 1.0, tear));
  float lip = isTorn * (1.0 - smoothstep(1.0, 1.22, tear)) * (1.0 - hole);
  float thick = 0.08 + 0.5 * smoothstep(0.15, 0.9, broad) + 1.5 * fold + 0.25 * (swell - 0.5) + fine * (0.3 * (fibre - 0.5) + 0.55 * vein + 0.7 * rib) + 0.6 * rolled * (0.4 + 0.6 * fine) + 0.5 * lip;
  thick = mix(thick, 0.8, 0.6 * vFar);
  // The lens looks through more of it where it is seen aslant.
  float path = thick / max(nv, 0.5);
  float cover = 1.0 - exp(-uBody.z * path);

  // The light on the face the lens sees, and on the other, which comes through. A stroke lights both.
  vec3 onNear = skyIrradiance(n) / 3.14159;
  vec3 onFar = skyIrradiance(-n) / 3.14159;
  vec3 stroke = vec3(0.0);
  if (uStruck.y > 0.0) {
    vec2 off = vWorld.xz - uStruckAt.xz;
    float mine = max(abs(uStruck.x - vKite.y) < 0.5 ? 1.0 : 0.45, 1.0 / (1.0 + dot(off, off) / 250000.0));
    stroke = uGlowTint * (uStruck.y * mine);
    onNear += min(vec3(0.45), 0.3 * emitterIrradiance(vWorld, n));
    onFar += min(vec3(0.45), 0.3 * emitterIrradiance(vWorld, -n));
  }
  // A stroke lights the skin; it does not bleach it.
  onNear /= 1.0 + dot(onNear, vec3(0.3, 0.5, 0.2)) / 0.2;
  onFar /= 1.0 + dot(onFar, vec3(0.3, 0.5, 0.2)) / 0.2;
  // Lilac grey whatever lights it: the skin keeps the light's brightness and a part of its colour.
  onNear = mix(onNear, dot(onNear, vec3(0.3, 0.5, 0.2)) * vec3(1.0, 1.0, 1.03), 0.75);
  onFar = mix(onFar, dot(onFar, vec3(0.3, 0.5, 0.2)) * vec3(1.0, 1.0, 1.03), 0.75);
  float through = exp(-0.55 * path);
  vec3 own = mix(vec3(0.97, 0.96, 1.0), vec3(0.93, 0.94, 1.02), fract(seed * 3.3)) * (0.85 + 0.3 * fract(seed * 5.3));
  // What it scatters back, and what comes through it from behind, violet and strongest through a single skin. Its veins and its rolled
  // edge are a little darker: more skin, wet.
  vec3 c = own * (uBody.x * onNear * (0.75 + 0.25 * nv) + uBody.y * onFar * through * vec3(0.97, 0.94, 1.03));
  c *= (1.0 - fine * (0.3 * vein + 0.3 * rib + 0.2 * (fibre - 0.5)) - 0.15 * rolled - 0.12 * lip) * (1.0 - 0.6 * fold);
  // The last light of the dusk comes through a skin that stands between it and the lens.
  float toDusk = pow(clamp(dot(-toCamera, uWarmDir), 0.0, 1.0), 3.0);
  c += 2.0 * uFilm.y * uWarmColour * toDusk * through;
  c += stroke * (0.01 + 0.05 * through + (0.05 + 0.25 * uVeil) * rolled);
  // Before the long lens the veils are violet grey, darker than the lit cloud.
  c *= mix(vec3(1.0), vec3(0.6, 0.54, 0.82), uVeil);

  // The sheen: the sky the skin gives back, most aslant. Its colour is the film's thickness and the angle, as on a soap film: violet,
  // rose and a pale green that slide over it as it turns, and only where the light catches.
  float aslant = clamp(1.0 - nv, 0.0, 1.0);
  float fres = 0.035 + 0.965 * aslant * aslant * aslant * aslant * aslant;
  vec3 r = reflect(-toCamera, n);
  vec3 mirror = skyRadiance(normalize(r));
  mirror /= 1.0 + dot(mirror, vec3(0.3, 0.5, 0.2)) / 0.8;
  float depth = (0.7 + 1.3 * broad + 0.5 * swell) * sqrt(max(1.0 - (1.0 - nv * nv) / 1.9, 0.0));
  vec3 pearl = 0.5 + 0.5 * cos(6.2832 * (depth * vec3(1.0, 1.22, 1.5) + vec3(0.0, 0.33, 0.6) + seed));
  pearl = mix(vec3(dot(pearl, vec3(0.34, 0.33, 0.33))), pearl, 0.6) + 0.25;
  vec3 above = normalize(vec3(-0.45, 0.72, 0.5));
  vec3 key = dot(skyIrradiance(above), vec3(0.3, 0.5, 0.2)) * 0.3183 * vec3(0.92, 0.9, 1.1);
  key /= 1.0 + dot(key, vec3(0.3, 0.5, 0.2)) / 0.6;
  float ndh = clamp(dot(n, normalize(above + toCamera)), 0.0, 1.0);
  float ndw = clamp(dot(n, normalize(uWarmDir + vec3(0.0, 0.25, 0.0) + toCamera)), 0.0, 1.0);
  vec3 shine = mirror * fres * mix(vec3(1.0), pearl, 0.5 * uFilm.z)
    + key * uFilm.z * (0.4 * pow(max(ndh, 1e-4), 9.0) + 0.5 * pearl * aslant * aslant * sqrt(aslant))
    + key * (0.3 * rolled * fine)
    + key * uFilm.w * (1.6 * pow(max(ndh, 1e-4), 90.0) + 0.9 * pow(max(ndw, 1e-4), 60.0) * vec3(1.3, 0.9, 0.6))
    + stroke * (0.2 * aslant * aslant + 0.25 * pow(max(ndh, 1e-4), 9.0)) * mix(vec3(1.0), pearl, 0.4);
  shine *= (1.0 - 0.5 * vFar) * (1.0 - 0.45 * uVeil);
  // The sheen is on the film, not in it: it shows at its full strength however thin the film.
  c = (c * cover + shine) / max(cover, 0.05);

  // Its edge is let go over a pixel or two, never cut; a strip finer than a pixel is drawn a pixel wide and fainter; its tail runs out.
  float edge = 1.0 - smoothstep(1.0 - edgeW, 1.0, edgeAt);
  float thin = clamp(vKite.w, 0.0, 1.0);
  float ends = smoothstep(0.0, max(0.02, 3.0 * sW), s) * (1.0 - smoothstep(endAt - max(0.012, 3.0 * sW), endAt, s));
  float alpha = cover * edge * ends * (1.0 - hole) * (0.25 + 0.75 * thin) * uBody.w;
  alpha *= mix(1.0, 0.78, vFar);
  // From inside the canal the kites stand far off in the bright mouth: there they are let into the air, pale wisps of the sky's own tone.
  c = mix(c, 1.2 * skyRadiance(-toCamera), 0.8 * uInside);
  alpha *= 1.0 - 0.6 * uInside;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(rigOut(c), alpha * (1.0 - uSolo));
}`;

// The root of a cord is no straight stick: back from where it leaves the rock it turns into the stone and down, as a root does, each its
// own way, and it is gnarled. The husks grow on it.
const ROOT_GLSL = /* glsl */ `
uniform vec3 uInto;
vec3 rootCentre(float d) {
  vec3 p = kiteCentre(d);
  float back = max(-d, 0.0);
  float near = 1.0 - min(abs(aSeed.z - 1.0), 1.0);
  vec3 into = normalize(uInto * (0.6 + 0.8 * fract(kSeed * 9.7)) - vec3(0.0, 0.3 + 0.9 * fract(kSeed * 4.3), 0.0));
  p += into * (0.45 * back * back * near);
  p += vec3(sin(d * 2.3 + kSeed * 40.0), sin(d * 1.7 + kSeed * 70.0), cos(d * 2.9 + kSeed * 20.0)) * (0.09 * min(back, 1.0));
  return p;
}`;

const CORD_VERTEX = /* glsl */ `
${KITE_GLSL}
${ROOT_GLSL}
${NOISE_GLSL}
attribute vec2 aAt;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vAt;
varying vec3 vKite;
varying float vRoot;
varying float vAcross;
void main() {
  if (!kiteSet()) {
    vAcross = 1.0;
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  // A kite's cord runs on a little way into its blade and thins out there; a thread is cord to its end.
  float whole = kThread > 0.5 ? kCord + kBlade : kCord + max(1.2, 0.07 * kBlade);
  // It starts some metres up the wind, inside the rock that holds it.
  float d = aAt.x * (whole + 1.0) - 1.0;
  float e = 0.003 * whole;
  vec3 c = rootCentre(d);
  vec3 tangent = normalize(rootCentre(d + e) - rootCentre(d - e));
  vec3 u = normalize(cross(tangent, vec3(0.0, 1.0, 0.0)));
  vec3 w = cross(u, tangent);
  float far = length(cameraPosition - c);
  // Sinew as thick as a wrist, lumped with ice, knotted where the skin grows from it.
  float lumps = (0.5 * smoothstep(0.45, 0.85, vnoise(vec2(d * 0.55, kSeed * 31.0))) + 0.22 * vnoise(vec2(d * 2.3, kSeed * 17.0))) * (1.0 + 1.3 * uFly.y);
  // Seen close its ice is in beads, a hand or two apart and no two of a size.
  lumps += (1.0 - kThread) * uFly.y * 1.5 * smoothstep(0.38, 0.75, vnoise(vec2(d * 1.9, kSeed * 23.0)));
  float knot = (1.0 - kThread) * exp(-((d - kCord) / 0.6) * ((d - kCord) / 0.6));
  // Before the close lens they are seen for what they are: sinew as thick as a forearm under its ice.
  float r = mix(0.03, 0.02, kThread) * (1.0 + lumps + 2.6 * knot) * (1.0 + 1.6 * uStageMore.x) * (1.0 + 3.0 * uFly.y);
  r *= kThread > 0.5 ? 1.0 - 0.85 * clamp(d / whole, 0.0, 1.0) : 1.0 - 0.9 * smoothstep(kCord + 0.4, whole, d);
  // The holdfast: the cord's own root, swollen where it grips the rock, knuckled, and a little of it inside the stone.
  float root = exp(-max(d, 0.0) / (0.9 + 0.8 * fract(kSeed * 3.1)));
  r += root * (0.13 + 0.11 * fract(kSeed * 6.7)) * (0.45 + 1.1 * vnoise(vec2(aAt.y * 1.3 + kSeed * 50.0, d * 1.9)));
  // In the stone it runs out to nothing.
  r *= 1.0 - 0.5 * smoothstep(0.2, 1.0, -d);
  // Far off it is a line near two pixels wide and no thinner: an encoder holds it where it crosses the dark.
  float least = 0.9 * uPixel * far;
  float thin = min(1.0, r / least);
  r = max(r, least);
  // Its half width in pixels of the film.
  vAcross = r / (uPixel * far);
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
varying float vAcross;
uniform float uInside;
void main() {
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal + vec3(0.0, 1e-7, 0.0));
  float d = vAt.x;
  float seed = vKite.x * 97.0;
  // Twisted fibre, dark and wet, wound round itself at the knot.
  float twist = 0.5 + 0.5 * sin(d * 7.0 + vAt.y * 2.0 + seed);
  float wound = 0.5 + 0.5 * sin(vAt.y * 1.0 + d * 26.0);
  vec3 sinew = mix(vec3(0.085, 0.05, 0.042), vec3(0.03, 0.02, 0.02), mix(twist, wound, vAt.z));
  // Rime on what looks up and into the wind, in beads; thick where the ice has lumped.
  float beads = 0.6 * vnoise(vec2(d * 1.3, seed)) + 0.4 * vnoise(vec2(d * 6.0 + vAt.y, seed + 3.0));
  float rime = smoothstep(0.2, 0.6, 0.5 * n.y - 0.3 * dot(n, normalize(uWind.xyz)) + 0.8 * beads + 0.3) * (1.0 - 0.5 * vAt.z);
  // The ice sits on it in lumps: white on them, and between them the dark sinew under a thin frost.
  float lump = max(smoothstep(0.4, 0.8, vnoise(vec2(d * 0.55, vKite.x * 31.0))), smoothstep(0.38, 0.75, vnoise(vec2(d * 1.9, vKite.x * 23.0))));
  rime = mix(max(0.6 * rime, mix(0.22, 0.9, lump)), 0.5, vKite.z);
  // Where it is no more than a line it is a rimed line, pale against the dark behind it.
  rime = max(rime, 0.8 * (1.0 - vAt.w));
  // The root is old growth, dark and ridged, with the rime packed into its hollows.
  float ridges = vnoise(vec2(vAt.y * 2.6 + seed, d * 3.3));
  sinew = mix(sinew, vec3(0.06, 0.04, 0.035) * (0.5 + ridges), smoothstep(0.1, 0.5, vRoot));
  rime = mix(rime, smoothstep(0.3, 0.7, 0.45 * n.y + 0.9 * ridges - 0.1), smoothstep(0.1, 0.5, vRoot));
  vec3 albedo = mix(sinew, vec3(0.62, 0.66, 0.74), rime);
  vec3 c = rigShade(vWorld, n, toCamera, albedo, mix(0.3, 0.85, rime), 1.0);
  // Thinner than a pixel, it is a fainter line and not a narrower one: it fades by how much of the pixel it would fill. Its edge is let
  // go, not cut: where the cord is a pixel or two across it is clear at its rim and whole along its middle.
  float facing = abs(dot(n, toCamera));
  float rim = clamp(facing / sqrt(min(1.0, 2.0 / max(vAcross, 0.5))), 0.0, 1.0);
  // From inside the canal the cords are far off in the bright mouth: faint lines of the sky's tone.
  c = mix(c, 1.2 * skyRadiance(-toCamera), 0.7 * uInside);
  gl_FragColor = vec4(rigOut(c), max(0.3, vAt.w) * rim * (1.0 - 0.6 * uInside));
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
  // No two alike: most are stubs, a few are long, and many places have none.
  float own = fract(aIce.z * 13.7);
  float len = 0.4 * aIce.y * (0.35 + 1.5 * own * own);
  if (fract(aIce.z * 7.7) < 0.6) len = 0.0;
  vec3 hang = normalize(vec3(0.05 * sin(uTime * 2.3 + aIce.z * 40.0), -1.0, 0.25 * uWind.z / max(uWind.w, 1.0) + 0.05 * sin(uTime * 1.9 + aIce.z * 70.0)));
  float t = position.y;
  float girth = (len * 0.09 + 0.02 + 0.4 * uPixel * far) * step(0.001, len) * pow(1.0 - 0.9 * t, 0.6 + 1.2 * fract(aIce.z * 5.1)) * (1.0 + 0.25 * sin(t * (7.0 + 9.0 * fract(aIce.z * 3.3)) + aIce.z * 50.0)) + 0.07 * len * exp(-((t - 0.93) / 0.06) * ((t - 0.93) / 0.06));
  vec3 u = normalize(cross(hang, vec3(1.0, 0.0, 0.0)));
  vec3 w = cross(hang, u);
  vec3 ring = u * position.x + w * position.z;
  vec3 p = c + vec3(0.0, -0.06 - 0.06 * uFly.y, 0.0) + hang * (t * len) + ring * girth;
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
${ROOT_GLSL}
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
  vec3 on = rootCentre(aPod.x);
  vec3 tangent = normalize(rootCentre(aPod.x + 0.2) - rootCentre(aPod.x - 0.2));
  vec3 beside = normalize(cross(tangent, vec3(0.0, 1.0, 0.0)));
  vec3 over = cross(beside, tangent);
  // It grows out of the cord: out from it, down its length and a little toward the ground.
  vec3 spoke = beside * cos(aPod.y) + over * sin(aPod.y);
  vec3 axis = normalize(tangent * aAxis.x + spoke * aAxis.y - vec3(0.0, aAxis.z, 0.0));
  vec3 u = normalize(cross(axis, vec3(0.0, 1.0, 0.0) + 0.3 * axis.yzx));
  vec3 w = cross(axis, u);
  float y = position.y;
  float turn = atan(position.z, position.x);
  // A gall, not a cone: blunt at both ends, swollen where its seed says, lumped and lopsided, no two alike.
  float t = 0.5 + 0.5 * y;
  float own = fract(aAxis.w * 13.1);
  float belly = mix(0.3, 0.6, own);
  float form = sqrt(max(1.0 - ((t - belly) / (t < belly ? belly : 1.0 - belly)) * ((t - belly) / (t < belly ? belly : 1.0 - belly)), 0.0));
  float lumps = 1.0 + 0.2 * sin(turn * 2.0 + y * 3.1 + aAxis.w * 20.0) * sin(y * 4.3 + aAxis.w * 7.0) + 0.1 * sin(turn * 5.0 - y * 7.0 + aAxis.w * 33.0);
  float girth = mix(0.3, 0.5, fract(aAxis.w * 7.3)) * form * lumps * mix(0.75, 1.25, 0.5 + 0.5 * cos(turn + aAxis.w * 9.0));
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
  vec3 n = normalize(vNormal + vec3(0.0, 1e-7, 0.0));
  float seed = vPod.z * 97.0;
  // Its skin: ridged along its length, unevenly, and cracked across; dark as old kelp, each its own shade, never bright.
  float t = 0.5 + 0.5 * vPod.x;
  float ridge = vnoise(vec2(vPod.y * (2.0 + 2.0 * fract(seed * 0.71)) + seed, t * 2.5 + seed));
  float crack = vnoise(vec2(vPod.y * 5.0 + seed * 3.0, t * 14.0));
  float skin = 0.6 * ridge + 0.4 * crack;
  vec3 husk = mix(vec3(0.06, 0.038, 0.027), vec3(0.3, 0.19, 0.12), skin) * (0.6 + 0.8 * fract(seed * 0.37));
  // The frost has it wherever it looks up or into the gale: in grains, thick in its hollows.
  float frost = 0.6 * vnoise(vec2(vPod.y * 9.0 + seed, t * 17.0)) + 0.4 * vnoise(vWorld.xz * 40.0 + vWorld.y * 23.0);
  float rime = smoothstep(0.32, 0.68, 0.6 * n.y - 0.3 * dot(n, normalize(uWind.xyz)) + 0.5 * frost + 0.2 - 0.25 * (skin - 0.5));
  vec3 c = rigShade(vWorld, n, toCamera, mix(husk, vec3(0.66, 0.7, 0.78), 0.92 * rime), 1.0, 0.45 + 0.55 * smoothstep(0.2, 0.6, skin));
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
  // Skins the gale has torn off drift past the first spire, up the wind of it: small, each alone.
  const adrift = ctx.rng('kites/adrift');
  const tip = tipOf(spires[FIRST] as (typeof spires)[number]);
  const flatWind = Math.hypot(WIND[0], WIND[2]);
  const skins = blades.slice();
  for (let i = 0; i < 5; i++) {
    const back = adrift.range(50, 210);
    const out = adrift.range(-60, 60);
    const length = adrift.range(60, 110);
    skins.push({
      anchor: [tip[0] - (WIND[0] / flatWind) * back - (WIND[2] / flatWind) * out, tip[1] - adrift.range(25, 150), tip[2] - (WIND[2] / flatWind) * back + (WIND[0] / flatWind) * out],
      cord: 0.001,
      blade: length,
      half: adrift.range(3.2, 5),
      phase: adrift.range(0, 6.28),
      wave: length / adrift.range(1.1, 1.8),
      sag: 0,
      seed: adrift.next(),
      spire: 0,
      lead: false,
      loose: true,
    });
  }
  for (let sp = 1; sp <= 8; sp++) {
    const leads = kites.filter((k) => k.lead && k.spire === sp);
    if (leads.length > 0) leads.reduce((a, b) => ((b.anchor[1] as number) > (a.anchor[1] as number) ? b : a)).chief = true;
  }
  const leadOf = (k: Kite): number => (k.loose ? -1 : k.chief ? 1 : k.lead ? 0.6 : 0);

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
          lead[v] = leadOf(k);
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
  const fly = new THREE.Vector3(0, 0, 0);
  const wideShot = during('spine-01');
  const closeShot = during('spine-02');
  const veil = { value: 0 };
  const inside = { value: 0 };
  const film = new THREE.Vector4(1.0, 0.05, 0.5, 0.6);
  // What the near face scatters back, what comes through from the far one, how dense the skin is, and how much of it is drawn.
  const body = new THREE.Vector4(1.05, 1.5, 0.9, 1);
  const struck = new THREE.Vector4(0, 0, 0, 0);
  const struckAt = new THREE.Vector3(0, 0, 0);
  const shared = {
    ...ctx.rig.uniforms,
    uPixel: pixel,
    uReach: reach,
    uStage: { value: stage },
    uStageMore: { value: stageMore },
    uFly: { value: fly },
    uInto: { value: new THREE.Vector3(-lensSide * axes.bx, 0, -lensSide * axes.bz) },
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
      uInside: inside,
      uBody: { value: body },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
  });
  const bladeMesh = new THREE.Mesh(strips(skins, ALONG, ACROSS, (i, j) => [i / ALONG, (j / ACROSS) * 2 - 1], false), bladeMaterial);
  bladeMesh.frustumCulled = false;
  // Drawn after the dome, so that the sky is behind the skin when it is laid over.
  bladeMesh.renderOrder = 12;

  const cordMaterial = new THREE.ShaderMaterial({ vertexShader: CORD_VERTEX, fragmentShader: CORD_FRAGMENT, uniforms: shared, side: THREE.DoubleSide, transparent: true, depthWrite: true });
  const cordMesh = new THREE.Mesh(strips(kites, CORD_ALONG, CORD_ROUND, (i, j) => [i / CORD_ALONG, (j / CORD_ROUND) * Math.PI * 2], true), cordMaterial);
  cordMesh.frustumCulled = false;
  // Laid over what is behind it, after the dome and before the skins.
  cordMesh.renderOrder = 11;

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
      iceLead[v] = leadOf(k);
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
  const ball = new THREE.SphereGeometry(1, 14, 20);
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
    const many = k.half > 0 ? 17 : 6;
    for (let i = 0; i < many; i++) {
      // None sits further down the cord than the cord is thick enough to carry: nothing hangs off it in the air.
      const d = -1.0 + 3.6 * husks.next() ** 1.4;
      const small = 1 - 0.5 * Math.min(1, Math.max(0, (d - 1.5) / 2.5));
      // A few big ones and many small, packed against the root.
      const girthy = husks.range(0.6, 1) * (0.8 + 1.8 * husks.next() ** 2);
      pods.push(d * big, husks.range(0, 2 * Math.PI), husks.range(0.05, 0.42) * big * small, girthy * big * small);
      podAxes.push(husks.range(0.2, 1), husks.range(0.5, 1.1), husks.range(0.1, 0.9), husks.next() + nth * 0.01);
      podAnchor.push(k.anchor[0], k.anchor[1], k.anchor[2]);
      podSize.push(k.cord, k.blade, k.half, k.wave);
      podSeed.push(k.phase, k.seed, k.spire, k.sag);
      podLead.push(leadOf(k));
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
      if (inStrike) stage.set(0.23, 0.27, 0.45, 3);
      else if (inClose) stage.set(0.62, 0.5, 1.05, 1);
      else if (inWide) stage.set(1.25, 1.5, 1, 1);
      else stage.set(1, 1, 1, 0);
      stageMore.set(inStrike ? 1 : 0, inClose ? 0.1 : 0, inStrike ? 0.55 : inWide ? 1 : inClose ? 0.85 : 0, inStrike ? 1.2 : inClose ? 0.6 : 1);
      fly.set(inWide && !inStrike ? 1 : 0, inClose && !inStrike ? 1 : 0, wideShot.from);
      // Seen close the skin is thin and shows its colours; far off it is more of a body.
      // Seen close the film shows its oil colours.
      body.z = inStrike ? 0.3 : inClose ? 0.3 : 1.0;
      film.z = inClose ? 0.7 : 0.35;
      film.w = inClose ? 0.85 : 0.7;
      veil.value = inStrike ? 1 : 0;
      inside.value = stagedSeconds() >= INSIDE_FROM - 1e-4 ? 1 : 0;
      // From inside, the cloud and the mist of the mouth are laid over the kites as over the sky: a skin that held its own depth there
      // would stand as a flat shape cut out of them.
      bladeMaterial.depthWrite = inside.value < 0.5;
      cordMaterial.depthWrite = inside.value < 0.5;
      const flash = flashAt(seconds);
      // The stroke as it burns and nothing after it: between the return strokes the kites are dark.
      struck.set(flash ? flash.spire : 0, flash ? Math.min(1.5, flash.power * 1.2) : 0, 0, 0);
      struckAt.set(flash ? flash.at[0] : 0, flash ? flash.at[1] : 0, flash ? flash.at[2] : 0);
    },
    beforeSample: (renderer, camera) => {
      renderer.getDrawingBufferSize(size);
      // The pixel that counts is the film's at 1920 wide: nothing is drawn finer than that, whatever the size of this render.
      pixel.value = 2 / ((camera.projectionMatrix.elements[5] as number) * Math.min(1080, height || size.y || 2160));
      reach.value = 1 / ((camera.projectionMatrix.elements[5] as number) * 0.3249);
    },
    resize: (_w, h) => {
      height = h;
    },
  };
}
