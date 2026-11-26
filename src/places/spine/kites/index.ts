// The tether-kites: ribbons of skin that stream down the gale from holdfasts in the lee edge of each spire.
// One mesh for every ribbon. Its shape is worked out in the vertex shader from the time alone: waves leave the stalk and travel down the ribbon at
// a share of the wind's speed, each ribbon with its own length of wave, so no two are ever in step.
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

const ALONG = 96;
const ACROSS = 6;

interface Ribbon {
  anchor: Vec3;
  length: number;
  width: number;
  phase: number;
  /** Length of its wave, metres. */
  wave: number;
  sag: number;
  seed: number;
  spire: number;
  /** The share of its length that is its stalk. */
  stalk: number;
}

/** Where the colonies of a spire hold on, as shares of its height, and how many ribbons each has. Few and near the top: the lee of the tip is where the gale is cleanest. */
function colonies(n: number): [number, number][] {
  // The first spire is seen close, at two thirds of its height: three colonies there and one at its tip.
  if (n === FIRST) return [[0.955, 3], [0.865, 2], [0.83, 2], [0.795, 3], [0.765, 2], [0.735, 2], [0.705, 3]];
  if (n === FIRST + 2) return [[0.965, 3], [0.945, 2], [0.9, 1]];
  if (n === FIRST + 1) return [[0.95, 2]];
  if (n === FIRST + 3) return [[0.96, 1], [0.87, 1]];
  // The far peaks: one, or none.
  return (n - FIRST) % 2 === 0 ? [[0.955, 1]] : [];
}

// The shape of a ribbon at a share u of its length. Shared by the ribbons and by nothing else: the stalks are the first fifth of the same strip.
const SHAPE_GLSL = /* glsl */ `
uniform float uTime;
uniform vec4 uWind;
vec3 centreAt(vec3 anchor, vec4 shape, vec4 more, float u) {
  float len = shape.x;
  float along = u * len;
  vec3 wind = normalize(uWind.xyz);
  vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), wind));
  float k = 6.2832 / shape.w;
  // A wave runs down the ribbon at 0.7 of the wind's speed, a second, shorter one a little faster, and the tail whips.
  float c = uWind.w * (0.62 + 0.2 * fract(more.y * 7.3));
  float p1 = k * (along - c * uTime) + shape.z;
  float p2 = k * 1.83 * (along - c * 1.17 * uTime) + shape.z * 2.7;
  float p3 = k * 4.1 * (along - c * 1.3 * uTime) + shape.z * 5.1;
  float grow = smoothstep(0.0, 1.0, u * 1.15) * (0.35 + 0.65 * u);
  float amp = (0.02 + 0.017 * uStageMore.x + 0.012 * step(0.01, uStageMore.y)) * len * grow;
  // In the long lens a ribbon is a few hundred pixels long: its shortest wave would fall between its points and show as corners.
  float whip = 1.0 - uStageMore.x;
  // A gust lifts or drops the whole ribbon slowly.
  float gust = sin(uTime * 0.83 + shape.z * 3.0) * 0.6 + sin(uTime * 1.37 + shape.z) * 0.4 + 0.45 * uStageMore.x * sin(uTime * 2.9 + shape.z * 1.7);
  float fan = (fract(more.y * 13.7) - 0.5) * (more.w > 0.9 ? 0.4 : 0.12);
  // The stalk is a cord with weight and ice on it: it hangs between the rock and the skin it holds.
  float held = clamp(u / more.w, 0.0, 1.0);
  float hang = 0.3 * more.w * len * held * (1.0 - held);
  float lift = fan * along * (1.0 - 0.5 * u) - hang - more.x * len * u * u + amp * (sin(p1) + 0.25 * sin(p2)) + 0.35 * whip * amp * u * u * sin(p3) + (0.03 + 0.035 * uStageMore.x) * len * u * gust;
  float sway = 0.8 * amp * (sin(p1 * 0.77 + 1.9) + 0.4 * sin(p2 * 1.1 + 0.4)) + 0.3 * whip * amp * u * u * sin(p3 * 1.3 + 2.0);
  // The cloth is as long as it is: where it climbs a wave it does not also run on down the wind.
  float drawn = along * (1.0 - 0.06 * grow);
  return anchor + wind * drawn + side * sway + vec3(0.0, lift, 0.0);
}`;

const VERTEX = /* glsl */ `
attribute vec3 aAnchor;
attribute vec4 aShape;
attribute vec4 aMore;
attribute vec2 aAt;
uniform float uPixel;
uniform float uReach;
uniform vec4 uStage;
uniform vec3 uStageMore;
${SHAPE_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vAt;
varying vec4 vShape;
varying vec4 vMore;
varying float vThin;
varying float vCord;
varying float vSpine;
varying float vHalf;
varying float vFar;
void main() {
  // Staged by shot: before the long lens of spine-04 the struck spire's ribbons are the size the lens needs, and no other spire flies any.
  vec4 shape = aShape;
  vec4 more = aMore;
  if (uStage.w > 0.0) {
    if (abs(more.z - uStage.w) > 0.5) {
      // uStageMore.x: 1 where the other spires fly none.
      if (uStageMore.x > 0.5) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
      }
    } else {
      // In the long lens one veil of each spire is long and the rest are short, and half of the bare threads are gone.
      float lead = uStageMore.x > 0.5 ? mix(0.5, 1.7, step(350.0, aShape.x)) : 1.0;
      // In the wide lens fewer of the short ribbons fly, so that each is seen apart from the next.
      if (uStage.y > 1.5 && more.w < 0.9 && aShape.x < 180.0 && fract(more.y * 17.7) < 0.7) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
      }
      // uStageMore.z: the share of the bare threads that are not drawn.
      if (more.w > 0.9 && fract(more.y * 11.3) < uStageMore.z) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        return;
      }
      shape.x *= uStage.x * lead;
      shape.w *= uStage.x * lead;
      shape.y *= uStage.y;
      more.w = more.w > 0.9 ? more.w : min(more.w * uStage.z, 0.45);
      // uStageMore.y: how much the staged ribbons climb the wind, as a slope.
      more.x -= uStageMore.y;
    }
  }
  float u = aAt.x;
  float e = 0.004;
  vec3 c = centreAt(aAnchor, shape, more, u);
  vec3 ahead = centreAt(aAnchor, shape, more, u + e);
  vec3 tangent = normalize(ahead - centreAt(aAnchor, shape, more, u - e));
  vec3 wind = normalize(uWind.xyz);
  vec3 flat_ = normalize(cross(vec3(0.0, 1.0, 0.0), wind));
  vec3 upward = normalize(cross(tangent, flat_));
  flat_ = cross(upward, tangent);
  // The ribbon rolls about its own length as the waves pass, and the roll travels with them.
  float k = 6.2832 / shape.w;
  float roll = 0.3 * sin(k * 0.61 * (u * shape.x - uWind.w * 0.7 * uTime) + shape.z * 2.0) + 0.4 * (fract(more.y * 3.1) - 0.5) + 0.35 * sin(k * 1.9 * (u * shape.x - uWind.w * 0.8 * uTime) + shape.z) * u * u;
  // Seen from far along the ridge, a sheet that lay flat on the wind would be a line: the far ones stand more on edge, as a flag does.
  float stand = smoothstep(200.0, 450.0, length(cameraPosition - aAnchor) * uReach);
  // Near, a sheet stands on its edge in the gale as a flag does, and shows its face; somewhere down its length it turns over, half a turn in
  // a few metres, and the turn creeps along it. Far along the ridge a sheet that lay flat on the wind would be a line: they stand on edge too.
  float way = fract(more.y * 5.3) < 0.5 ? -1.0 : 1.0;
  float turnAt = 0.3 + 0.45 * fract(more.y * 2.3) + 0.04 * sin(uTime * 0.7 + shape.z);
  float turn = fract(more.y * 8.9) < 0.65 ? 3.14159 * smoothstep(turnAt - 0.05, turnAt + 0.05, u) : 0.0;
  roll = mix(way * (1.0 + 0.4 * fract(more.y * 9.1)) + 0.8 * roll + turn, way * 0.8 + 0.45 * roll, stand);
  vFar = stand;
  roll = mix(1.5708, roll, smoothstep(more.w, more.w + 0.1, u));
  vec3 across = flat_ * cos(roll) + upward * sin(roll);
  vec3 normal_ = cross(tangent, across);
  // Its width: a cord for the stalk, widening to the blade, a slow taper, and a ragged tail.
  float blade = smoothstep(more.w, more.w + 0.09, u);
  // The strip is as wide as the picture laid on it: the picture's own outline is the ribbon's.
  float halfW = shape.y * blade;
  float far = length(cameraPosition - c);
  float cord = max(0.15, (1.25 + 0.6 * stand) * uPixel * far);
  // Along the stalk the strip is wider than the cord: room for the knots on it and for what hangs from it.
  float thin = max(halfW, cord + 0.95 * (1.0 - smoothstep(more.w + 0.02, more.w + 0.09, u)));
  // The blade cups across its width: its edges lift off the plane.
  float cup = 0.09 * shape.y * blade * sin(u * 14.0 + more.y * 20.0 - uTime * 2.0);
  vec3 p = c + across * (aAt.y * thin) + normal_ * (cup * aAt.y * aAt.y);
  vWorld = p;
  vNormal = normalize(normal_ - across * (2.0 * cup * aAt.y / max(thin, 0.05)) * 0.5);
  vAt = aAt;
  vShape = shape;
  vMore = more;
  vThin = halfW / thin;
  vCord = min(1.0, 0.15 / cord);
  vSpine = cord / thin;
  vHalf = thin;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
uniform vec4 uStruck;
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
varying vec2 vAt;
varying vec4 vShape;
varying vec4 vMore;
varying float vThin;
varying float vCord;
varying float vSpine;
varying float vHalf;
varying float vFar;
void main() {
  float u = vAt.x;
  float v = vAt.y;
  float metres = u * vShape.x;
  float wide = vShape.y;
  float seed = vMore.y * 97.0;
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, toCamera) < 0.0) n = -n;
  float blade = smoothstep(vMore.w, vMore.w + 0.07, u);

  // The skin is the photograph of one whole ribbon, laid once down the blade: its outline, its holes, its veins and its colours are the
  // picture's own. There are two pictures, and each ribbon wears one of them either way up.
  float s = clamp((u - vMore.w) / (1.0 - vMore.w), 0.0, 1.0);
  float vb = v / max(vThin, 0.05);
  float flip = fract(seed * 0.37) < 0.5 ? -1.0 : 1.0;
  float vf = vb * flip;
  vec3 pic;
  float body;
  float relief;
  if (fract(seed * 0.83) < 0.5) {
    vec2 uv = vec2(mix(0.004, 0.97, s), 1.0 - (0.461 + 0.2 * vf));
    pic = texture2D(tFilmA, uv).rgb;
    body = texture2D(tFilmAA, uv).r;
    relief = texture2D(tFilmAH, uv).r;
  } else {
    // This one hangs a torn strip below itself: the picture's window is wider below, and is slid so that its tip meets the cord.
    vec2 uv = vec2(mix(0.006, 0.992, s), 1.0 - mix(0.378 + 0.2 * vf, 0.525 + 0.275 * vf, smoothstep(0.0, 0.2, s)));
    pic = texture2D(tFilmB, uv).rgb;
    body = texture2D(tFilmBA, uv).r;
    relief = texture2D(tFilmBH, uv).r;
  }
  float torn = smoothstep(0.6, 1.0, s);
  // The tail sheds: wisps of it part from the body, run on down the wind, thin and are gone at its end.
  float run = metres - 0.4 * uWind.w * uTime;
  float wisp = vnoise(vec2(run / (3.0 * wide) + seed * 9.0, vb * 1.7 + seed * 5.0)) + 0.35 * (vnoise(vec2(run / (0.8 * wide) + seed, vb * 5.0)) - 0.5);
  float shed = smoothstep(-0.03, 0.05, wisp - mix(-0.3, 0.74, torn * torn));
  float cut = smoothstep(0.35, 0.65, body) * step(abs(vb), 1.0) * shed;
  float edge = 1.0 - abs(vb);
  // The stalk: a cord of wet sinew, knotted where the skin grows from it and here and there along it. Under the blade it runs on as a spine.
  float stalkAt = vMore.w * vShape.x;
  float knots = 1.6 * exp(-pow((metres - stalkAt - 0.6) / 0.75, 2.0)) + 0.7 * smoothstep(0.72, 0.9, vnoise(vec2(metres * 0.45, seed * 3.0)));
  float girth = vSpine * (1.0 + (0.25 * vnoise(vec2(metres * 2.2, seed)) + knots) * vCord);
  float cordHere = 1.0 - smoothstep(0.6, 1.0, abs(v) / girth);
  // A ribbon that is all stalk is a tether with no skin on it: a thread to its end.
  cordHere *= vMore.w > 0.9 ? 1.0 - smoothstep(0.9, 1.0, u) : 1.0 - smoothstep(0.45, 0.8, u);
  // Ice hangs from the cord where its water froze as it dripped: spikes, each with a bead at its end. Only where the lens is near enough to see them.
  float below = -v * vHalf - 0.5 * girth * vHalf;
  float cell = metres / 0.8;
  float h = hash12(vec2(floor(cell), seed));
  float fx = (fract(cell) - 0.5 + 0.8 * (fract(h * 13.0) - 0.5)) * 0.8;
  float lengthOf = 0.06 + 0.95 * fract(h * 7.3) * fract(h * 3.1) * fract(h * 17.9 + 0.3);
  float spike = step(abs(fx), 0.05 * pow(clamp(1.0 - below / lengthOf, 0.0, 1.0), 0.7)) * step(0.0, below) * step(below, lengthOf);
  float bead = 1.0 - smoothstep(0.035, 0.05, length(vec2(fx, below - lengthOf)));
  float ice = max(spike, bead) * step(0.78, h) * (1.0 - blade) * smoothstep(0.6, 1.0, vCord) * smoothstep(0.02, 0.06, u);
  float skin = cut * smoothstep(vMore.w, vMore.w + 0.012, u);
  if (max(skin, max(cordHere, ice)) < 0.02) discard;

  // A glassy film: what is behind it shows through, and it adds the light it scatters and the sky it mirrors. The picture gives it its
  // veins and its folds: thicker there, so less shows through.
  float lum = dot(pic, vec3(0.333));
  float tone = clamp(lum / 0.2, 0.0, 2.2);
  float fold = smoothstep(0.55, 0.9, relief);
  float crease = 1.0 - smoothstep(0.2, 0.6, tone);
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  // Its edge is rolled: a pale line wherever the skin ends, at the picture's own edge and round its holes.
  float rim = (1.0 - smoothstep(0.55, 0.98, body)) * cut + (1.0 - smoothstep(0.0, 0.12, wisp - mix(-0.3, 0.74, torn * torn))) * torn;
  // Its wrinkles catch the sky: the bright lines of the picture's relief.
  float wrinkle = smoothstep(uWrinkle.x, uWrinkle.y, relief);
  // The light in it: the sky on both its faces, the last band through it where the lens looks toward the dusk, the strike.
  vec3 held = 0.5 * (skyIrradiance(n) + skyIrradiance(-n)) / 3.14159;
  if (uStruck.y > 0.0) held += min(vec3(0.6), 0.2 * (emitterIrradiance(vWorld, n) + emitterIrradiance(vWorld, -n)));
  float toDusk = pow(clamp(dot(-toCamera, uWarmDir), 0.0, 1.0), 3.0);
  vec3 lilac = mix(vec3(0.95, 0.9, 1.06), vec3(0.86, 0.82, 1.1), fract(seed * 3.3));
  // The picture's own colour about its mean: lilac, its stains of violet and gold, its veins dark.
  vec3 stain = clamp(pic / vec3(0.22, 0.2, 0.24), 0.3, 2.0);
  // Lilac-grey whatever lights it: the film keeps the light's brightness and little of its colour.
  held = mix(held, dot(held, vec3(0.3, 0.5, 0.2)) * vec3(0.94, 0.92, 1.12), 0.7);
  vec3 c = (uFilm.x * held + uFilm.y * uWarmColour * toDusk) * mix(vec3(1.0), stain, uTone.x) * lilac * (0.8 + 0.4 * fract(seed * 5.3));
  // Before the long lens the veils are violet grey, darker than the lit cloud: what is bright on them is the charge.
  c *= mix(vec3(1.0), vec3(0.6, 0.54, 0.82), uVeil);
  // Thin as a soap film: where it is stretched it takes colours by its thickness and the angle it is seen at.
  float thick = 1.2 + 2.2 * relief + 1.4 * vnoise(vec2(metres / (1.7 * wide) + seed, vb * 1.3)) + 0.8 * (1.0 - nv);
  vec3 sheen = 0.5 + 0.5 * cos(6.2832 * thick * vec3(1.0, 1.17, 1.4));
  c *= mix(vec3(1.0), 0.55 + 0.9 * sheen, uFilm.z * (1.0 - 0.6 * fold));
  // The side away from the sky is darker.
  c *= mix(0.6, 1.08, 0.5 + 0.5 * n.y);
  float fres = 0.04 + 0.96 * pow(1.0 - nv, 4.0);
  vec3 r = reflect(-toCamera, n);
  r.y = abs(r.y) + 0.05;
  vec3 mirror = skyRadiance(normalize(r));
  mirror = mix(mirror, dot(mirror, vec3(0.3, 0.5, 0.2)) * vec3(0.92, 0.94, 1.15), 0.6);
  float glint = smoothstep(0.7, 0.95, relief + 0.25 * (vnoise(vec2(metres * 3.0, vb * 9.0 + seed)) - 0.5));
  // A wet sheen along the edge that leads, and on every fold that faces the sky.
  vec3 shine = mirror * (0.5 * fres + uFilm.w * max(glint, wrinkle) * (0.3 + 0.7 * fres) + 0.6 * rim * (1.0 - 0.6 * uVeil)) * (1.0 - 0.55 * uVeil);
  // When a strike is near the ribbon carries the charge along its edges for a moment, violet white.
  float mine = abs(uStruck.x - vMore.z) < 0.5 ? 1.0 : 0.25;
  // Seen close the film stays glass: violet in its body, and only its folds and its rolled edge take the white of the stroke.
  shine += uGlowTint * (uStruck.y * mine * mix(0.03 + 0.07 * fold + 0.45 * glint * glint + 0.4 * rim, 0.04 + 0.25 * fold + 0.3 * glint + 1.3 * rim, vFar));
  // How much of what is behind it the film hides: little where it is stretched, more at a fold, a vein, its rolled edge, and where it is
  // seen aslant. Far off it is a pale streak.
  float cover = clamp(0.3 + 0.25 * fold + 0.35 * crease + 0.45 * rim * (1.0 - 0.65 * uVeil) + 0.35 * (1.0 - smoothstep(0.1, 0.55, nv)) + 0.4 * vFar, 0.0, 0.94);
  // Lilac-grey, whatever the light: glass, not flesh.
  c = mix(c, dot(c, vec3(0.3, 0.5, 0.2)) * vec3(0.95, 0.97, 1.16), mix(0.2, 0.6, vFar));
  // The shine is on the film, not in it: it shows at its full strength however thin the film.
  c = (c * cover + shine) / max(cover, 0.05);
  float alpha = skin * cover;
  // The cord: dark wet sinew, its fibres twisted along it, round, rimed in beads on top.
  float x = clamp(v / max(girth, 1e-4), -1.0, 1.0);
  vec3 round_ = normalize(n * sqrt(1.0 - x * x) + vec3(0.0, 1.0, 0.0) * x);
  float fibre = 0.5 + 0.5 * sin(metres * 9.0 + x * 5.0 + seed);
  float rimed = smoothstep(0.2, 0.8, x) * smoothstep(0.35, 0.75, 0.6 * vnoise(vec2(metres * 0.9, seed)) + 0.4 * vnoise(vec2(metres * 4.5, seed + 3.0)));
  vec3 sinew = mix(vec3(0.1, 0.055, 0.045), vec3(0.035, 0.022, 0.022), fibre) * (1.0 + 0.8 * min(knots, 1.0));
  rimed *= 1.0 - vFar;
  vec3 cord = rigShade(vWorld, round_, toCamera, mix(sinew, vec3(0.6, 0.64, 0.7), rimed), mix(0.28, 0.8, rimed), 1.0) * (1.0 - 0.5 * vFar);
  float corded = cordHere * (1.0 - 0.75 * blade) * mix(0.3, 1.0, max(vCord, vFar));
  c = mix(c, cord, corded);
  alpha = max(alpha, corded);
  // The ice on it: clear, lit along one side.
  vec3 hung = rigShade(vWorld, normalize(n + vec3(fx * 14.0, 0.3, 0.0)), toCamera, vec3(0.5, 0.56, 0.64), 0.12, 1.0) + 0.35 * skyRadiance(-toCamera);
  c = mix(c, hung, ice * (1.0 - corded));
  alpha = max(alpha, ice);
  // The film is laid over what is behind it; the cord and the ice hide it.
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(rigOut(c), alpha * (1.0 - uSolo));
}`;

const KNOB_VERTEX = /* glsl */ `
${NOISE_GLSL}
attribute vec4 aSeed;
attribute vec4 aHold;
uniform vec2 uKnobStage;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vSeed;
void main() {
  // A lump of flesh, not a ball: it bulges and folds its own way.
  vec3 at = position * 2.2 + aSeed.xyz * 30.0;
  float bulge = 0.34 * (vnoise3(at) - 0.5) + 0.16 * (vnoise3(at * 2.7) - 0.5);
  vec3 local = position * (1.0 + bulge);
  vec4 w = modelMatrix * instanceMatrix * vec4(local, 1.0);
  // Staged by shot: before the long lens the cluster is drawn in about its holdfast, and only the struck spire keeps any.
  w.xyz = aHold.xyz + (w.xyz - aHold.xyz) * uKnobStage.x;
  if (uKnobStage.y > 0.0 && abs(aHold.w - uKnobStage.y) > 0.5) w.xyz = vec3(0.0, -90000.0, 0.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vLocal = position;
  vSeed = aSeed;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const KNOB_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vSeed;
void main() {
  vec3 toCamera = normalize(cameraPosition - vWorld);
  // Knotted flesh: brown, wet, creased where it has swollen into the crack and folded on itself, darker in the creases.
  vec3 at = vLocal * 2.2 + vSeed.xyz * 30.0;
  float e = 0.06;
  float f0 = vnoise3(at * 2.7) + 0.5 * vnoise3(at * 6.5);
  vec3 slope = vec3(vnoise3((at + vec3(e, 0.0, 0.0)) * 2.7) + 0.5 * vnoise3((at + vec3(e, 0.0, 0.0)) * 6.5), vnoise3((at + vec3(0.0, e, 0.0)) * 2.7) + 0.5 * vnoise3((at + vec3(0.0, e, 0.0)) * 6.5), vnoise3((at + vec3(0.0, 0.0, e)) * 2.7) + 0.5 * vnoise3((at + vec3(0.0, 0.0, e)) * 6.5)) - f0;
  vec3 n = normalize(vNormal - 0.35 * slope / e * 0.2);
  float crease = 1.0 - smoothstep(0.0, 0.1, abs(vnoise3(at * 1.9 + 7.0) - 0.5));
  float sinews = 0.5 + 0.5 * sin(vLocal.y * 16.0 + 5.0 * vnoise3(at * 1.3));
  vec3 flesh = mix(vec3(0.055, 0.024, 0.022), vec3(0.022, 0.012, 0.012), 0.6 * crease + 0.3 * sinews) * (0.75 + 0.5 * f0 * 0.66);
  // Rime on what looks up and into the wind, in soft drifts.
  float rime = smoothstep(0.8, 1.05, n.y * 0.6 - dot(n, normalize(uWind.xyz)) * 0.45 + 0.55 * vnoise3(vWorld * 1.7) + 0.2 * (f0 - 0.75)) * (1.0 - 0.7 * crease);
  vec3 albedo = mix(flesh, vec3(0.68, 0.72, 0.78), rime);
  vec3 c = rigShade(vWorld, n, toCamera, albedo, mix(0.36, 0.9, rime), 1.0 - 0.65 * crease);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The holdfast as it was photographed: a cluster of frosted husks with its stalks leaving down the wind. A card that turns about the wind's
// line to face the lens, laid over the edge of the rock where the ribbons are held.
const HOLD_VERTEX = /* glsl */ `
attribute vec4 aHold;
attribute vec4 aSeed;
uniform vec2 uKnobStage;
uniform vec3 uGale;
varying vec3 vWorld;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;
void main() {
  vec3 wind = normalize(vec3(uGale.x, 0.0, uGale.z));
  vec3 toLens = cameraPosition - aHold.xyz;
  vec3 n = normalize(toLens - wind * dot(toLens, wind));
  vec3 up = cross(n, wind);
  if (up.y < 0.0) up = -up;
  // Tilted a little, each its own way, so that the stalks leave up or down the sky.
  float tilt = (aSeed.z - 0.5) * 0.7;
  vec3 along = normalize(wind * cos(tilt) + up * sin(tilt));
  vec3 rise = normalize(cross(along, n)) * sign(dot(cross(along, n), up));
  float size = aSeed.x * uKnobStage.x;
  vec3 p = aHold.xyz + along * ((position.x - 0.3) * size) + rise * ((position.y - 0.5) * aSeed.y * size / 1.5) + n * (0.12 * size);
  if (uKnobStage.y > 0.0 && abs(aHold.w - uKnobStage.y) > 0.5) p = vec3(0.0, -90000.0, 0.0);
  vWorld = p;
  vUv = position.xy;
  vN = n;
  vT = along;
  vB = rise * aSeed.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const HOLD_FRAGMENT = /* glsl */ `
${RIG_GLSL}
uniform sampler2D tHold;
uniform sampler2D tHoldH;
varying vec3 vWorld;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vT;
varying vec3 vB;
void main() {
  float h = texture2D(tHoldH, vUv).r;
  // The picture's own stalks end in nothing: they are left out past their first length, and the cords that hold the ribbons stand for them.
  float a = smoothstep(0.03, 0.1, h) * (1.0 - smoothstep(0.5, 0.6, vUv.x));
  if (a < 0.03) discard;
  vec3 pic = texture2D(tHold, vUv).rgb;
  vec2 e = vec2(1.5 / 1536.0, 1.5 / 1024.0);
  float hx = texture2D(tHoldH, vUv + vec2(e.x, 0.0)).r - texture2D(tHoldH, vUv - vec2(e.x, 0.0)).r;
  float hy = texture2D(tHoldH, vUv + vec2(0.0, e.y)).r - texture2D(tHoldH, vUv - vec2(0.0, e.y)).r;
  vec3 n = normalize(vN - (vT * hx + vB * hy) * 5.0);
  vec3 toCamera = normalize(cameraPosition - vWorld);
  // The picture was lit flat from the front: it is the husks' own colour, and their rime where it is pale.
  float pale = smoothstep(0.12, 0.4, dot(pic, vec3(0.333)));
  vec3 c = rigShade(vWorld, n, toCamera, pic * 1.5, mix(0.45, 0.9, pale), mix(0.45, 1.0, smoothstep(0.1, 0.6, h)));
  gl_FragColor = vec4(rigOut(c), a * (1.0 - uSolo));
}`;

/** The knobs of flesh the second owner modelled at each holdfast. Off: the photographed cluster stands there instead. */
const KNOBS_ON = false;

export function create(ctx: Context): Piece {
  const rng = ctx.rng('kites');
  const ribbons: Ribbon[] = [];
  const holdfasts: { anchor: Vec3; spire: number; count: number }[] = [];
  // The face of the first spire that the lens of key spine-2 stands before: its holdfasts sit on that face, by the edge.
  const stand = step(kiteEdge, heading(tipOf(spires[FIRST + 1] as (typeof spires)[number]), kiteEdge) - 16, 78);
  const axes = finAxes(spires[FIRST] as (typeof spires)[number]);
  const lensSide = (stand[0] - kiteEdge[0]) * axes.bx + (stand[2] - kiteEdge[2]) * axes.bz > 0 ? 1 : -1;
  spires.forEach((sp, n) => {
    const near = n === FIRST;
    const reach = near ? 1 : n === FIRST + 2 ? 1.9 : n === FIRST + 1 ? 0.6 : 0.85;
    for (const [share, count] of colonies(n)) {
      const t = share + rng.range(-0.008, 0.008);
      let held = false;
      for (let i = 0; i < count; i++) {
        // A colony is a few ribbons of one holdfast: one long streamer, the rest shorter, none alike.
        const length = (i === 0 ? rng.range(190, 260) : rng.range(70, 170)) * reach;
        const at = t + (i - (count - 1) / 2) * 0.006;
        const anchor = finEdge(sp, at, near ? 1.02 : 1.04, near ? lensSide * rng.range(0.5, 0.57) : rng.range(-0.25, 0.25));
        if (!held) holdfasts.push({ anchor, spire: n - FIRST + 1, count });
        held = true;
        ribbons.push({
          anchor,
          length,
          width: near ? (i === 0 ? rng.range(6, 8.5) : rng.range(3, 5.5)) : rng.range(10, 15) * (i === 0 ? 1 : 0.75),
          phase: rng.range(0, 6.28),
          wave: length / rng.range(2.2, 4.2),
          sag: n === FIRST + 2 ? rng.range(0.06, 0.16) : rng.range(0.01, 0.06),
          seed: rng.next(),
          spire: n - FIRST + 1,
          stalk: rng.range(14, 30) * (near ? 0.4 : 1.6) / length,
        });
      }
      // And bare tethers from the same holdfast: threads with no skin on them, that lost it or never grew it.
      const threads = ctx.rng(`kites/threads/${n}/${share}`);
      const bare = n === FIRST + 2 ? 3 : near ? 2 : 0;
      for (let i = 0; i < bare; i++) {
        const length = threads.range(60, 190) * reach;
        ribbons.push({
          anchor: finEdge(sp, t + threads.range(-0.008, 0.008), near ? 1.02 : 1.04, near ? lensSide * threads.range(0.5, 0.57) : threads.range(-0.25, 0.25)),
          length,
          width: 0.3,
          phase: threads.range(0, 6.28),
          wave: length / threads.range(1.6, 3.4),
          sag: threads.range(0.0, 0.1),
          seed: threads.next(),
          spire: n - FIRST + 1,
          stalk: 0.999,
        });
      }
    }
  });

  // The film is laid over what is behind it, so the ribbons are drawn the farthest first, as the lens of key spine-2 sees them.
  const farness = (rb: Ribbon): number => Math.hypot(rb.anchor[0] + WIND[0] * rb.length * 0.4 - stand[0], rb.anchor[1] - stand[1], rb.anchor[2] + WIND[2] * rb.length * 0.4 - stand[2]);
  ribbons.sort((a, b) => farness(b) - farness(a));

  const per = (ALONG + 1) * (ACROSS + 1);
  const anchor = new Float32Array(ribbons.length * per * 3);
  const shape = new Float32Array(ribbons.length * per * 4);
  const more = new Float32Array(ribbons.length * per * 4);
  const at = new Float32Array(ribbons.length * per * 2);
  const index: number[] = [];
  ribbons.forEach((rb, r) => {
    for (let i = 0; i <= ALONG; i++) {
      for (let j = 0; j <= ACROSS; j++) {
        const v = r * per + i * (ACROSS + 1) + j;
        anchor.set(rb.anchor, v * 3);
        shape.set([rb.length, rb.width, rb.phase, rb.wave], v * 4);
        more.set([rb.sag, rb.seed, rb.spire, rb.stalk], v * 4);
        at.set([i / ALONG, (j / ACROSS) * 2 - 1], v * 2);
        if (i < ALONG && j < ACROSS) index.push(v, v + 1, v + ACROSS + 1, v + 1, v + ACROSS + 2, v + ACROSS + 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ribbons.length * per * 3), 3));
  geometry.setAttribute('aAnchor', new THREE.BufferAttribute(anchor, 3));
  geometry.setAttribute('aShape', new THREE.BufferAttribute(shape, 4));
  geometry.setAttribute('aMore', new THREE.BufferAttribute(more, 4));
  geometry.setAttribute('aAt', new THREE.BufferAttribute(at, 2));
  geometry.setIndex(index);

  const pixel = { value: 0.0005 };
  // How long the lens is beside that of key spine-2, and the staging of spine-04: the scale of length, of width and of the stalk's share,
  // and the one spire that flies ribbons.
  const reach = { value: 1 };
  const stage = new THREE.Vector4(1, 1, 1, 0);
  const stageMore = new THREE.Vector3(0, 0, 0);
  const wideShot = during('spine-01');
  const veil = { value: 0 };
  const film = new THREE.Vector4(1.0, 0.05, 0.15, 0.9);
  const closeShot = during('spine-02');
  const struck = new THREE.Vector4(0, 0, 0, 0);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      uPixel: pixel,
      uReach: reach,
      uStage: { value: stage },
      uStageMore: { value: stageMore },
      uStruck: { value: struck },
      uGlowTint: { value: new THREE.Vector3(1.0, 0.72, 2.8) },
      // How much the film gives back of the sky on it and of the dusk through it, how strong its colours, how strong its glints.
      uFilm: { value: film },
      uWrinkle: { value: new THREE.Vector2(0.5, 0.85) },
      // How much of the picture's own colour the film keeps, and how dark its drawn veins are.
      uTone: { value: new THREE.Vector2(0.85, 0.25) },
      uVeil: veil,
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
  const kites = new THREE.Mesh(geometry, material);
  kites.frustumCulled = false;
  // Drawn after the dome, so that the sky is behind the film when it is laid over.
  kites.renderOrder = 12;

  const knobStage = new THREE.Vector2(1, 0);
  // The holdfasts: a cluster of leathery knobs in the crack each stalk comes from.
  const KNOBS = 9;
  const knobGeometry = new THREE.SphereGeometry(1, 22, 16);
  const knobs = new THREE.InstancedMesh(knobGeometry, new THREE.ShaderMaterial({ vertexShader: KNOB_VERTEX, fragmentShader: KNOB_FRAGMENT, uniforms: { ...ctx.rig.uniforms, uKnobStage: { value: knobStage } } }), ribbons.length * KNOBS);
  const seeds = new Float32Array(ribbons.length * KNOBS * 4);
  const holds = new Float32Array(ribbons.length * KNOBS * 4);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const out = new THREE.Vector3(WIND[0], 0.25, WIND[2]).normalize();
  ribbons.forEach((rb, r) => {
    for (let k = 0; k < KNOBS; k++) {
      const girth = rb.spire === 1 ? 8 : Math.min(Math.max(rb.width * 2.3, 11), 15);
      const size = girth * (k === 0 ? 0.34 : rng.range(0.13, 0.28));
      const off = k === 0 ? 0 : girth * rng.range(0.25, 0.7);
      const a = rng.range(0, Math.PI * 2);
      // Each knob points out of the rock, down the wind, a little its own way.
      const aim = new THREE.Vector3(out.x + rng.range(-0.5, 0.5), out.y + rng.range(-0.4, 0.5), out.z + rng.range(-0.5, 0.5)).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
      m.compose(new THREE.Vector3(rb.anchor[0] + Math.cos(a) * off * 0.5, rb.anchor[1] + Math.sin(a) * off, rb.anchor[2] + Math.cos(a * 1.7) * off * 0.4), q, new THREE.Vector3(size * 0.62, size * 1.15, size * 0.62));
      knobs.setMatrixAt(r * KNOBS + k, m);
      seeds.set([rng.next(), rng.next(), rng.next(), rng.next()], (r * KNOBS + k) * 4);
      holds.set([rb.anchor[0], rb.anchor[1], rb.anchor[2], rb.spire], (r * KNOBS + k) * 4);
    }
  });
  knobGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  knobGeometry.setAttribute('aHold', new THREE.InstancedBufferAttribute(holds, 4));
  knobs.instanceMatrix.needsUpdate = true;
  knobs.frustumCulled = false;

  // One photographed cluster for each colony, and a second, smaller and the other way up, where the colony is large.
  const clusters: number[] = [];
  const clusterSeeds: number[] = [];
  const cards = ctx.rng('kites/holdfasts');
  for (const hold of holdfasts) {
    const size = (hold.spire === 1 ? 19 : 30) * cards.range(0.85, 1.2);
    clusters.push(hold.anchor[0], hold.anchor[1], hold.anchor[2], hold.spire);
    clusterSeeds.push(size, cards.next() < 0.5 ? -1 : 1, cards.next(), 0);
    if (hold.count >= 3) {
      clusters.push(hold.anchor[0], hold.anchor[1] - 0.3 * size, hold.anchor[2], hold.spire);
      clusterSeeds.push(size * 0.7, cards.next() < 0.5 ? -1 : 1, cards.next(), 0);
    }
  }
  const cardGeometry = new THREE.InstancedBufferGeometry();
  cardGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]), 3));
  cardGeometry.setIndex([0, 1, 2, 0, 2, 3]);
  cardGeometry.setAttribute('aHold', new THREE.InstancedBufferAttribute(new Float32Array(clusters), 4));
  cardGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(clusterSeeds), 4));
  cardGeometry.instanceCount = clusters.length / 4;
  const holdMaterial = new THREE.ShaderMaterial({
    vertexShader: HOLD_VERTEX,
    fragmentShader: HOLD_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      uKnobStage: { value: knobStage },
      uGale: { value: new THREE.Vector3(WIND[0], WIND[1], WIND[2]) },
      tHold: { value: ctx.assets.texture('mat/holdfast.jpg', { kind: 'colour', repeat: false, anisotropy: 8 }) },
      tHoldH: { value: ctx.assets.texture('mat/holdfast-h.png', { kind: 'data', repeat: false, anisotropy: 8 }) },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: true,
  });
  const husks = new THREE.Mesh(cardGeometry, holdMaterial);
  husks.frustumCulled = false;
  husks.renderOrder = 11;
  knobs.visible = KNOBS_ON;

  ctx.scene.add(ctx.parts.built('tether-kites', kites, knobs, husks));
  ctx.scene.add(knobs);
  ctx.scene.add(husks);

  const size = new THREE.Vector2();
  let height = 0;
  return {
    setTime: (seconds) => {
      const inStrike = stagedSeconds() >= STRIKE_FROM - 1e-4 && stagedSeconds() < INSIDE_FROM - 1e-4;
      // Staged by shot. spine-04, the long lens: the struck spire's ribbons at the size that lens needs, no other spire flies any.
      // spine-02, the close lens on the first spire: its ribbons short enough to be whole in the frame, on long ropes, climbing the wind.
      const inClose = stagedSeconds() >= closeShot.from && stagedSeconds() <= closeShot.to;
      // spine-01, the wide lens from far down the ridge: the first spire's ribbons twice as broad, most of its bare threads not drawn.
      const inWide = stagedSeconds() >= wideShot.from && stagedSeconds() <= wideShot.to;
      if (inStrike) stage.set(0.17, 0.32, 2.6, 3);
      else if (inClose) stage.set(1.0, 0.62, 0.3, 1);
      else if (inWide) stage.set(1, 1.6, 1, 1);
      else stage.set(1, 1, 1, 0);
      stageMore.set(inStrike ? 1 : 0, inClose ? 0.16 : 0, inStrike ? 0.55 : inWide ? 1 : inClose ? 0.85 : 0);
      // Seen close the film shows its oil colours.
      film.z = inClose ? 0.42 : 0.15;
      veil.value = inStrike ? 1 : 0;
      knobStage.set(inStrike ? 0.3 : 1, inStrike ? 3 : 0);
      const flash = flashAt(seconds);
      // The charge lingers in the ribbons a little after the stroke.
      struck.set(flash ? flash.spire : 0, flash ? Math.min(1.5, flash.power * 1.2 + 0.5 * Math.exp(-Math.max(0, flash.age) / 0.35) * (flash.age > 0 ? 1 : 0)) : 0, 0, 0);
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
