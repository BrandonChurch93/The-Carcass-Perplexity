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
// The outline: how wide the blade is at s of its length, as a share of its widest. It leaves the knot gathered, is widest a third of the
// way down and runs out to a tail. Its two edges are not alike.
float outline(float s, float sd) {
  float h1 = fract(sd * 3.7);
  float h2 = fract(sd * 5.9);
  float h3 = fract(sd * 8.3);
  float rise = smoothstep(0.0, 0.07 + 0.08 * h1, s);
  float tail = pow(1.0 - smoothstep(0.3 + 0.25 * h2, 1.0, s), 0.7 + 0.7 * h3);
  float wander = 1.0 + 0.12 * sin(s * 8.0 + sd * 30.0) + 0.06 * sin(s * 21.0 + sd * 70.0);
  return max(0.03, (0.07 + 0.93 * rise) * tail * wander);
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
  float roll = 1.5708 + way * (0.2 + 0.4 * fract(kSeed * 9.1)) + 0.65 * sin(0.8 * k * (x - 0.9 * kSpeed * t) + kPhase * 2.0) + 0.4 * s * sin(2.1 * k * (x - 1.2 * kSpeed * t) + kPhase) + turn;
  vec3 across = flat_ * cos(roll) + upward * sin(roll);
  vec3 normal_ = cross(tangent, across);
  float far = length(cameraPosition - c);
  float wide = kHalf * outline(s, kSeed + (v > 0.0 ? 0.37 : 0.0));
  // Far off a blade is never thinner than a pixel and a half: it does not come and go between the pixels.
  float half_ = max(wide, 0.75 * uPixel * far);
  // The section: an arc the wind fills and empties as the waves pass (curl is half the angle the arc turns through), and two edges that
  // flutter each in its own time, harder toward the tail.
  float kb = 6.2832 / (7.0 * kHalf);
  float curl = (0.6 * sin(kb * (x - kSpeed * t) + kSeed * 40.0) + 0.45 * sin(0.37 * kb * (x - 0.8 * kSpeed * t) + kPhase * 1.3)) * smoothstep(0.02, 0.2, s);
  float flutter = 0.2 * (0.15 + 0.85 * s) * sin(2.8 * kb * (x - 1.25 * kSpeed * t) + kSeed * 90.0 + 1.7 * v);
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
  vAt = vec4(s, v, x, half_);
  vKite = vec4(kSeed, aSeed.z, smoothstep(200.0, 450.0, length(cameraPosition - aAnchor) * uReach), wide / half_);
  vSkin = vec3(curl, kHalf, kBlade);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const BLADE_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
uniform vec4 uStruck;
uniform vec3 uStruckAt;
uniform vec3 uGlowTint;
// x: how much of a body the skin is (its scatter), y: how much it hides of what is behind it, z: the strength of its colours, w: of its sheen.
uniform vec4 uFilm;
uniform float uVeil;
uniform sampler2D tSkin;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vAt;
varying vec4 vKite;
varying vec3 vSkin;
const vec3 SKIN_MEAN = vec3(0.321, 0.267, 0.355);
void main() {
  float s = vAt.x;
  float v = vAt.y;
  float metres = vAt.z;
  float seed = vKite.x * 97.0;
  float far = vKite.z;
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float face = dot(n, toCamera) < 0.0 ? -1.0 : 1.0;
  n *= face;

  // Where the skin is: inside its outline, less the holes the wind has worked open, the rents in from its edges and the split of its tail.
  // inside is in shares of the half width, 0 at an edge.
  float lie = v;
  float ragged = 0.05 * (vnoise(vec2(metres * 0.9 + seed, 3.0 * sign(v))) - 0.5) + 0.03 * (vnoise(vec2(metres * 3.1, seed + sign(v))) - 0.5);
  float inside = 1.0 - abs(lie) + ragged * smoothstep(0.1, 0.3, s);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float h = fract(seed * (0.731 + 0.417 * fi));
    if (h > 0.6) continue;
    vec2 at = vec2(0.26 + 0.5 * fract(h * 7.7 + 0.3 * fi), (fract(h * 13.3) - 0.5) * 1.1);
    vec2 size = vec2(2.2 + 4.5 * fract(h * 29.1), 0.22 + 0.3 * fract(h * 17.9));
    vec2 q = vec2((s - at.x) * vSkin.z / (size.x * vSkin.y), (lie - at.y) / size.y);
    float hole = length(q) - 1.0 + 0.5 * (vnoise(vec2(atan(q.y, q.x) * 2.2 + seed, fi)) - 0.5);
    inside = min(inside, hole * size.y);
  }
  // The tail is split in two, deeper toward its end.
  float splitFrom = 0.62 + 0.25 * fract(seed * 0.293);
  float splitAt = (fract(seed * 0.611) - 0.5) * 0.7 + 0.25 * sin(s * 9.0 + seed);
  float gap = 0.4 * smoothstep(splitFrom, 1.0, s);
  inside = min(inside, abs(lie - splitAt) - gap + 1.0 - smoothstep(splitFrom, splitFrom + 0.05, s));
  float soft = max(1.5 * fwidth(lie), 0.02);
  float cut = smoothstep(0.0, soft, inside) * vKite.w;
  if (cut < 0.01) discard;
  // Its edge is rolled back on itself: a thicker lip wherever the skin ends.
  float lip = 1.0 - smoothstep(0.0, 0.1 + 2.0 * soft, inside);

  // The skin itself: a sheet of veined film laid down the blade, each kite on its own part of it.
  vec2 uv = vec2(metres / 48.0 + seed * 0.37, lie * vSkin.y / 24.0 + seed * 0.61);
  // Its colours are read broad, as patches: the fine of the sheet is only in its relief.
  vec3 pic = texture2D(tSkin, uv, 3.5).rgb;
  float relief = dot(texture2D(tSkin, uv, 1.0).rgb, vec3(0.333));
  // Its creases are in its surface: the sheet's relief turns the normal.
  vec3 px = dFdx(vWorld);
  vec3 py = dFdy(vWorld);
  vec3 r1 = cross(py, n);
  vec3 r2 = cross(n, px);
  float det = dot(px, r1);
  vec3 slope = (r1 * dFdx(relief) + r2 * dFdy(relief)) * (sign(det) / max(abs(det), 1e-7));
  n = normalize(n - (1.0 - far) * 0.12 * slope / (1.0 + 0.5 * length(slope)));
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);

  // How many skins thick it is: thin where it is stretched over a belly, a body where it is gathered at the knot, at its lip, along a
  // crease, and wherever it is seen aslant.
  float drift = vnoise(vec2(metres / (2.4 * vSkin.y) + seed * 3.0, lie * 1.1 + seed));
  float knot = 1.0 - smoothstep(0.0, 0.22, s);
  float crease = smoothstep(0.03, 0.12, relief - 0.33);
  float belly = smoothstep(0.2, 1.0, abs(vSkin.x)) * (1.0 - lie * lie);
  float thick = 0.16 + 0.85 * drift * drift + 2.2 * knot + 1.3 * lip + 0.35 * crease - 0.2 * belly + 0.35 * far;
  float path = thick / max(nv, 0.3);
  float cover = (1.0 - exp(-uFilm.y * path)) * cut;

  // The light on the face the lens sees and on the one it does not, and the trough of the section in its own shade.
  float hollow = smoothstep(0.2, 1.2, face * vSkin.x) * (1.0 - 0.5 * lie * lie);
  float back = smoothstep(0.2, 1.2, -face * vSkin.x) * (1.0 - 0.5 * lie * lie);
  vec3 onNear = skyIrradiance(n) / 3.14159 * (1.0 - 0.45 * hollow);
  vec3 onFar = skyIrradiance(-n) / 3.14159 * (1.0 - 0.45 * back);
  if (uStruck.y > 0.0) {
    vec2 off = vWorld.xz - uStruckAt.xz;
    float mine = max(abs(uStruck.x - vKite.y) < 0.5 ? 1.0 : 0.3, 1.0 / (1.0 + dot(off, off) / 250000.0));
    onNear += min(vec3(0.6), 0.3 * emitterIrradiance(vWorld, n)) + uGlowTint * (0.04 * uStruck.y * mine);
    onFar += min(vec3(0.6), 0.3 * emitterIrradiance(vWorld, -n)) + uGlowTint * (0.07 * uStruck.y * mine);
  }
  // The film's own colour: lilac grey, with the sheet's stains of rose, violet and gold about its mean.
  vec3 stain = mix(vec3(1.0), clamp(pic / SKIN_MEAN, 0.5, 1.8), uFilm.z);
  vec3 body = vec3(0.7, 0.74, 1.0) * stain * mix(vec3(1.0), vec3(0.62, 0.56, 0.84), uVeil);
  // What it scatters: a pale haze of the light on its two faces, a little even where it is thinnest, so that it stands pale before a
  // dark sky and the sky is still seen through it.
  float thin = 0.8 * uFilm.y;
  float haze = cut * (thin + (1.0 - thin) * (1.0 - exp(-0.8 * path)));
  vec3 above = normalize(vec3(-0.45, 0.72, 0.5));
  vec3 key = skyIrradiance(above) / 3.14159;
  vec3 c = body * (uFilm.x * (0.55 * onNear + 0.75 * onFar) * haze + 0.25 * key * lip * cut);

  // Wet: it gives the sky back, more aslant, and the colours of a thin film slide over it as it turns.
  float fres = 0.07 + 0.93 * pow(1.0 - nv, 4.0);
  vec3 r = reflect(-toCamera, n);
  vec3 mirror = skyRadiance(normalize(r));
  float film = 0.9 * relief + 1.2 * drift + 1.5 * (1.0 - nv) + seed;
  vec3 tints = 0.5 + 0.5 * cos(6.2832 * (film + vec3(0.0, 0.3333, 0.6667)));
  vec3 pearl = mix(vec3(1.0), 0.45 + 1.1 * (vec3(0.62, 0.42, 1.0) * tints.x + vec3(1.0, 0.52, 0.74) * tints.y + vec3(1.0, 0.82, 0.55) * tints.z) / (tints.x + tints.y + tints.z), uFilm.z);
  float ndh = clamp(dot(n, normalize(above + toCamera)), 0.0, 1.0);
  // The brightest of the sky on a wet skin: a soft light down every fold that turns to it.
  vec3 shine = uFilm.w * pearl * mix(vec3(1.0), vec3(0.7, 0.62, 1.0), uVeil) * (mirror * fres * (1.0 + 2.0 * lip) + key * vec3(0.8, 0.72, 1.0) * (1.6 * pow(ndh, 40.0) + 0.07 * pow(ndh, 6.0)) * (1.0 - 0.5 * far)) * cut;
  float alpha = clamp(cover + fres * uFilm.w * cut * (1.0 - cover), 0.0, 1.0);
  gl_FragColor = vec4(rigOut(c + shine), alpha * (1.0 - uSolo));
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
  float whole = kThread > 0.5 ? kCord + kBlade : kCord + 1.2;
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
  float r = mix(0.03, 0.02, kThread) * (1.0 + lumps + 2.6 * knot);
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
  rime = mix(max(rime, 0.3), 0.5, vKite.z);
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
  vec3 husk = mix(vec3(0.05, 0.028, 0.018), vec3(0.24, 0.13, 0.07), grain * (0.5 + 0.5 * rows)) * (0.55 + 0.9 * fract(seed * 0.37));
  float frost = vnoise(vec2(vPod.y * 9.0 + seed, vPod.x * 17.0));
  float rime = smoothstep(0.5, 0.85, 0.55 * n.y - 0.25 * dot(n, normalize(uWind.xyz)) + 0.55 * frost + 0.2 * smoothstep(0.3, 1.0, vPod.x)) * 0.8;
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
  const film = new THREE.Vector4(1.0, 0.75, 0.6, 1.0);
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
      tSkin: { value: ctx.assets.texture('mat/kiteskin.jpg', { kind: 'colour', repeat: true, anisotropy: 8 }) },
    },
    side: THREE.DoubleSide,
    transparent: true,
    premultipliedAlpha: true,
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
      else if (inClose) stage.set(0.46, 0.4, 1.6, 1);
      else if (inWide) stage.set(1.25, 1.15, 1, 1);
      else stage.set(1, 1, 1, 0);
      stageMore.set(inStrike ? 1 : 0, inClose ? 0.1 : 0, inStrike ? 0.55 : inWide ? 1 : inClose ? 0.85 : 0, inStrike ? 1.5 : 1);
      fly.set(inWide && !inStrike ? 1 : 0, inClose && !inStrike ? 1 : 0);
      // Seen close the skin is thin and shows its colours; far off it is more of a body.
      if (inStrike) film.set(0.3, 0.4, 0.5, 1.4);
      else if (inClose) film.set(0.22, 0.16, 0.9, 0.6);
      else film.set(0.5, 0.5, 0.4, 1.0);
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
