// The brine's own surface, its domes of gas, and what a dome becomes when it tears.
import { F, K1_AT, POOL_R, R, STUCK, rel } from '../shared/anchors';

const STUCK_AT = rel(STUCK[0], STUCK[1]);
import { BRINE_GLSL } from '../shared/brine-glsl';
import { RIG_GLSL } from '../shared/glsl';
import { FIELD_GLSL } from '../land/shaders';

export const MAX_RINGS = 24;
/** Seconds the skin of a dome takes to draw back from the point it tore at: twenty frames. */
export const TEAR = 0.34;

const WIND_RAW = [R[0] * 0.8 + F[0] * 0.6, R[1] * 0.8 + F[1] * 0.6];
const WIND_LEN = Math.hypot(WIND_RAW[0] as number, WIND_RAW[1] as number);
const WIND_N = [(WIND_RAW[0] as number) / WIND_LEN, (WIND_RAW[1] as number) / WIND_LEN];
const v2 = (a: number[]): string => `vec2(${(a[0] as number).toFixed(4)}, ${(a[1] as number).toFixed(4)})`;

export const BRINE_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vWorld = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

export const MAX_SEEPS = 8;

export const BRINE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform sampler2D tGrain;
uniform sampler2D tFroth;
uniform sampler2D tFrothN;
uniform sampler2D tBed;
uniform vec2 uWade;
uniform int uRingCount;
// x, z of the middle, radius of the front in metres, strength.
uniform vec4 uRings[${MAX_RINGS}];
// Where gas comes up through the pool's floor all the time: x, z, a number of its own, strength.
uniform vec4 uSeeps[${MAX_SEEPS}];
${RIG_GLSL}
${FIELD_GLSL}
${BRINE_GLSL}

// One train of wavelets: its slope at q. Short waves on a liquid do not travel together: each length has its own speed (gravity and the skin's
// tension), so the pattern never slides as one sheet.
vec2 train(vec2 q, vec2 dir, float len, float bend, vec2 group) {
  float k = 6.2832 / len;
  float w = k * sqrt(9.81 / k + 0.000074 * k);
  return dir * cos(k * dot(dir, q) - w * uTime + bend + group.y * 7.0) * smoothstep(0.38, 0.66, group.x) * 1.6;
}
// Wavelets go in groups: a few crests, each a few lengths long, that rise and die as the group passes at half the crests' speed. One
// look for two trains of near lengths (rg for the one, ba for the other), read at the level a pixel of this width wants.

// The renderer shades four pixels together, and a value set under a branch or after a discard is not set in the pixel that did not get
// there: its fall across the four, and the level a mipmapped picture picks for itself from that fall, is then not the same twice. So the
// fall of the place on the level is taken once, of the varying, before any branch, and every mipmapped read is given it: as one level,
// worked out once, wherever the grain is laid as wide as it is long (a read that works its level out of two falls costs more).
vec2 gX;
vec2 gY;
// The level of the grain a pixel wants where one tile of it is one metre.
float grainLod;
// The grain, laid so many metres to the tile: levels is the base two logarithm of that.
vec4 grain(vec2 uv, float levels) {
  return textureLod(tGrain, uv, grainLod - levels);
}
vec4 groups(vec2 q, vec2 dir, float len, float levels) {
  float k = 6.2832 / len;
  float w = k * sqrt(9.81 / k + 0.000074 * k);
  vec2 g = vec2(dot(dir, q) - 0.5 * w / k * uTime, dot(vec2(-dir.y, dir.x), q));
  return textureLod(tGrain, vec2(g.x / (len * 21.0), g.y / (len * 13.0)), max(grainLod - levels, 0.0));
}

void main() {
  gX = dFdx(vWorld.xz);
  gY = dFdy(vWorld.xz);
  fieldDx = gX;
  fieldDy = gY;
  float grainSize = float(textureSize(tGrain, 0).x);
  grainLod = log2(max(max(length(gX), length(gY)) * grainSize, 1e-6));
  vec3 p = vWorld;
  // (Two things are wanted with their own fall across the pixel, so they are read here, before the shore's discard, where all four
  // pixels read them: how soon each place turns over what the flow carries, and what stands in the brine.)
  vec4 patchy = grain(p.xz / 37.0, 5.2095);
  vec2 turns = vec2(dFdx(patchy.g), dFdy(patchy.g));
  float stood = contactDrawn(p);
  vec2 stoodFall = vec2(dFdx(stood), dFdy(stood));
  vec3 toEye = cameraPosition - p;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 f = fieldAt(p.xz);
  vec4 fine = grain(p.xz / 1.9, 0.9260);
  // The same shore the land paints: one line for both.
  float s = f.r + (fine.r - 0.5) * 0.1;
  // The surface is laid over the whole shelf, to where the bank comes up through the level: the bank itself cuts the waterline.
  if (s > 0.3) discard;
  // How wide a pixel lies on the brine, metres: what is finer than that is not drawn as a wave, it is left to the sheen.
  float px = max(length(gX), length(gY));
  float pool = length(p.xz);
  float inPool = smoothstep(${(POOL_R + 2.5).toFixed(1)}, ${(POOL_R - 0.5).toFixed(1)}, pool);

  // Which way the bank lies (toward the land), and so which way the channel runs.
  vec2 bank = vec2(0.0, 1.0);
  vec2 flow = vec2(0.0);
  float nearBy = smoothstep(90.0, 50.0, dist);
  // (The round pool has no way through and no bank but at its rim: there the bed is not asked which way it lies.)
  if (nearBy > 0.0 && (inPool < 1.0 || s > 0.1)) {
    vec2 g = vec2(fieldAt(p.xz + vec2(0.7, 0.0)).r - fieldAt(p.xz - vec2(0.7, 0.0)).r, fieldAt(p.xz + vec2(0.0, 0.7)).r - fieldAt(p.xz - vec2(0.0, 0.7)).r);
    float gl = length(g);
    bank = gl > 1e-4 ? g / gl : bank;
    // The brine drains down the basin, toward the first lens: along the channel where the banks are near, straight down it in the middle.
    vec2 down = ${v2([-F[0], -F[1]])};
    vec2 run = vec2(-bank.y, bank.x);
    run *= clamp(dot(run, down) * 3.0, -1.0, 1.0);
    vec2 dir = normalize(mix(down, run, 0.75 * smoothstep(0.0, 0.5, gl)) + vec2(1e-4));
    // Fastest over the deep middle, still at the bank, faster where the banks close in (the same brine has to pass), and none in the round
    // pool, which has no way through.
    float narrow = smoothstep(-2.2, 0.2, fieldAt(p.xz - bank * 3.5).r);
    flow = dir * (0.04 + (0.16 + 0.4 * narrow) * smoothstep(-0.05, -1.2, s)) * (1.0 - inPool) * nearBy;
  }
  // What the flow carries is looked up where it came from: twice, half a turn apart, each fading out as the other fades in, so that the
  // carried pattern never snaps back. No two places turn over together.
  float turn = uTime / 9.0 + patchy.g * 2.0;
  float pa = fract(turn);
  float pb = fract(turn + 0.5);
  float wa = 1.0 - abs(2.0 * pa - 1.0);
  vec2 qa = p.xz - flow * 9.0 * (pa - 0.5);
  vec2 qb = p.xz - flow * 9.0 * (pb - 0.5) + vec2(3.7, 1.9);
  // (The turn-over is not the same in two neighbours, so what is carried is drawn out across a pixel by more than the pixel's own width:
  // by the turn-over's own fall, and the carried grain is read that much softer.)
  vec2 qx = gX - flow * (18.0 * turns.x);
  vec2 qy = gY - flow * (18.0 * turns.y);
  float carriedLod = log2(max(max(length(qx), length(qy)) * grainSize, 1e-6));
  vec4 ca = textureLod(tGrain, qa / 7.3, carriedLod - ${Math.log2(7.3).toFixed(4)});
  vec4 cb = textureLod(tGrain, qb / 7.3, carriedLod - ${Math.log2(7.3).toFixed(4)});
  vec4 fa = textureLod(tGrain, qa / 1.7, carriedLod - ${Math.log2(1.7).toFixed(4)});
  vec4 fb = textureLod(tGrain, qb / 1.7, carriedLod - ${Math.log2(1.7).toFixed(4)});
  vec4 carried = mix(cb, ca, wa);
  vec4 carriedFine = mix(fb, fa, wa);
  brineSilt = clamp(carried.r * 0.7 + carriedFine.g * 0.3 + 0.25 * (carried.b - 0.5), 0.0, 1.0);

  // There is no wind to speak of: the brine lies near to glass, and what moves on it has a cause.
  // A slow heave of the whole surface, too low to see but in what it mirrors.
  vec4 heave = grain(p.xz / 4.1 + vec2(0.013, 0.008) * uTime, 2.0356);
  vec2 slope = (heave.ba - 0.5) * 0.035 + (heave.rg - 0.5) * 0.025;
  // The flow dimples the skin where it runs: low boils and seams that go down the channel with it.
  float speed = length(flow);
  slope += (carriedFine.ba - 0.5) * (0.07 + 0.25 * speed) * smoothstep(0.02, 0.12, speed) * smoothstep(0.5, 0.1, px);
  // What stands in the current leaves a wake down the flow from it: the skin broken, and scum caught in it.
  float wake = speed > 0.06 ? contactDrawn(p - vec3(flow.x, 0.0, flow.y) / speed * 0.7) * smoothstep(0.06, 0.25, speed) : 0.0;
  slope += (carried.ba - 0.5) * 0.5 * wake;
  // Where the big ones wade the brine is churned: dark with mud and never still.
  brineMud = 1.0 - smoothstep(5.0, 11.0, length(p.xz - uWade));
  brineSlurry = 1.0 - smoothstep(1.8, 4.2, length(p.xz - vec2(${STUCK_AT[0].toFixed(3)}, ${STUCK_AT[1].toFixed(3)})));
  // A light air crosses in lanes (cat's paws): under one the skin is drawn into wavelets a hand long, five trains of them at five lengths,
  // each bent by what is under it. Between the lanes it is glass. Over the seep pool the gas keeps it troubled.
  vec2 wdir = ${v2(WIND_N)};
  vec2 lane = vec2(dot(p.xz, wdir) - 1.6 * uTime, dot(p.xz, vec2(-wdir.y, wdir.x)));
  vec2 wcross = vec2(-wdir.y, wdir.x);
  float paw = smoothstep(0.5, 0.74, textureGrad(tGrain, vec2(lane.x / 41.0, lane.y / 11.0) + patchy.rb * 0.06, vec2(dot(gX, wdir) / 41.0, dot(gX, wcross) / 11.0), vec2(dot(gY, wdir) / 41.0, dot(gY, wcross) / 11.0)).g);
  // Outside the lanes it is not glass either: the flow, the gas and what wades keep a low ripple on it, more here and less there.
  float ruffle = 0.3 + 0.55 * smoothstep(0.3, 0.75, carried.a) + 2.2 * speed + 0.9 * paw + 0.12 * inPool + 0.8 * brineMud;
  vec4 bend = grain(p.xz / 0.83 + vec2(0.01, 0.007) * uTime, -0.2688);
  vec2 ripples = vec2(0.0);
  // (No train is everywhere: each comes and goes in patches of its own, or the six would weave one cloth. And a wave is drawn only where
  // a lens can tell its crests apart: finer than that it would be grit.)
  if (px < 0.12) {
    vec4 e = groups(p.xz, wdir, 0.55, 2.8379);
    ripples += train(p.xz, normalize(wdir - wcross * 0.17), 0.73, bend.b * 3.0 + 2.1, e.rg) * 0.1 * smoothstep(0.25, 0.7, carried.g) * smoothstep(0.12, 0.06, px);
    ripples += train(p.xz, normalize(wdir + wcross * 0.31), 0.41, bend.r * 4.0, e.ba) * 0.1 * fine.g * smoothstep(0.068, 0.034, px);
  }
  if (px < 0.045) {
    vec4 e = groups(p.xz, normalize(wdir + wcross * 0.2), 0.22, 1.5160);
    ripples += train(p.xz, normalize(wdir - wcross * 0.47), 0.27, bend.g * 5.0, e.rg) * 0.11 * smoothstep(0.3, 0.7, carriedFine.r) * smoothstep(0.045, 0.022, px);
    ripples += train(p.xz, normalize(wdir + wcross * 0.83), 0.173, bend.b * 5.0, e.ba) * 0.1 * smoothstep(0.35, 0.75, fine.b) * smoothstep(0.029, 0.0145, px);
  }
  if (px < 0.02) {
    vec4 e = groups(p.xz, normalize(wdir - wcross * 0.6), 0.09, 0.2265);
    ripples += train(p.xz, normalize(wdir - wcross * 1.3), 0.117, bend.a * 6.0, e.rg) * 0.09 * smoothstep(0.35, 0.75, carriedFine.a) * smoothstep(0.02, 0.01, px);
    ripples += train(p.xz, normalize(wdir + wcross * 2.4), 0.071, bend.r * 7.0 + 1.3, e.ba) * 0.07 * smoothstep(0.3, 0.7, fine.a) * smoothstep(0.012, 0.006, px);
  }
  // (Near the lens every wavelet is seen for itself and turns its own piece of the sky: far off they are averaged into the sheen.)
  float nearGain = 1.0 + 1.0 * smoothstep(14.0, 4.0, dist);
  slope += ripples * ruffle * (0.6 + 0.8 * bend.g) * nearGain;

  // How much froth the domes and the bursts have left here.
  float boil = 0.0;
  if (pool < 16.0) {
    // Each seep sends out ring after ring: half a stride from crest to crest, 0.7 m a second, dying with the way they have come.
    for (int i = 0; i < ${MAX_SEEPS}; i++) {
      vec4 seep = uSeeps[i];
      vec2 d = p.xz - seep.xy;
      float r = length(d);
      float beat = 0.6 + 0.4 * sin(uTime * 0.9 + seep.z * 17.0);
      slope += d / max(r, 0.03) * cos(r * 15.0 - uTime * 10.5 + seep.z * 40.0 + (bend.r - 0.5) * 1.2) * seep.w * beat * nearGain * smoothstep(0.05, 0.35, r) / (1.0 + 0.55 * r * r);
    }
    for (int i = 0; i < ${MAX_RINGS}; i++) {
      if (i >= uRingCount) break;
      vec4 ring = uRings[i];
      vec2 d = p.xz - ring.xy;
      float r = length(d);
      float wide = 0.16 + 0.07 * ring.z;
      if (abs(r - ring.z) > 3.2 * wide + 0.25) continue;
      // No ring is a circle drawn with a compass: the front runs ahead here and lags there, and is higher where more was thrown.
      // (Its unevenness is a few slow turns round it, each ring's own: counted, not looked up, for a pixel asks every ring.)
      vec2 u = d / max(r, 0.01);
      vec4 own = fract(ring.x * vec4(1.37, 2.91, 0.83, 3.57) + ring.y * vec4(0.71, 1.93, 2.47, 0.59)) * 2.0 - 1.0;
      float two = u.x * u.x - u.y * u.y;
      float three = u.x * (4.0 * u.x * u.x - 3.0);
      float lag = 0.2 * two * own.x + 0.2 * (2.0 * u.x * u.y) * own.y + 0.16 * three * own.z + 0.14 * u.y * (3.0 - 4.0 * u.y * u.y) * own.w;
      float thrown = 0.5 + 0.3 * u.x * own.w + 0.3 * u.y * own.z + 0.2 * two * own.y - 0.2 * three * own.x;
      float q = r - ring.z - lag * (0.1 + 0.22 * ring.z);
      float env = exp(-q * q / (wide * wide)) * ring.w * (0.45 + 1.1 * clamp(thrown, 0.0, 1.0));
      if (env < 0.003) continue;
      // The long waves lead and the short ones follow: the crests are closer behind the front than before it.
      slope += d / max(r, 0.01) * env * sin(q * (14.0 - 22.0 * q)) * 0.3 * nearGain;
      boil = max(boil, env * smoothstep(1.5, 0.25, ring.z));
    }
  }
  // Whatever stands in the brine (the contact map has it) is met by it: the brine climbs the thing in a tight lip, the wavelets that reach it
  // are turned and stand steeper, and it sends its own small rings out as it sways.
  float ringed = smoothstep(0.0, 0.12, stood) * smoothstep(0.85, 0.35, stood);
  float collar = 0.0;
  if (stood > 0.01) {
    // (Which way the thing stands from here is read off the map's fall across the pixel, taken at the top.)
    float det = gX.x * gY.y - gX.y * gY.x;
    vec2 lean = abs(det) > 1e-12 ? -vec2(gY.y * stoodFall.x - gX.y * stoodFall.y, gX.x * stoodFall.y - gY.x * stoodFall.x) / det : vec2(0.0);
    float ll = length(lean);
    vec2 off = ll > 1e-4 ? lean / ll : vec2(0.0);
    slope *= 1.0 + 1.3 * ringed;
    slope += off * (0.1 * ringed * sin(stood * 30.0 + uTime * 5.5 + patchy.r * 9.0) + 0.75 * smoothstep(0.6, 0.92, stood)) * smoothstep(30.0, 10.0, dist);
    collar = smoothstep(0.45, 0.8, stood) * (1.0 - brineMud);
  }
  // The meniscus: in the last two fingers before the bank the brine climbs it, and that lip looks the other way from the rest of the surface.
  float lipAt = smoothstep(0.17, 0.26, s) * smoothstep(40.0, 12.0, dist);
  slope -= bank * 0.55 * lipAt * lipAt;

  // Scum: froth gathers against the bank where the bank holds it, in clumps and strings, never a band. It is the froth's own picture and
  // relief: the tallest bubbles show first, and more of them where more gathers.
  vec4 raft = grain(p.xz / 6.1, 2.6088);
  vec4 fleck = grain(p.xz / 0.57, -0.8110);
  float seen = smoothstep(70.0, 20.0, dist);
  // Where the big ones wade the bed lies a hand under the brine for metres: that is not a bank, and no scum gathers on it.
  float wade = smoothstep(4.0, 6.5, length(p.xz - uWade));
  float holds = smoothstep(0.46, 0.7, raft.b * 0.65 + fleck.r * 0.35);
  float reach = 0.1 + 0.55 * smoothstep(0.45, 0.75, raft.r);
  float want = smoothstep(-reach, 0.1, s) * holds * mix(0.3, 1.0, wade);
  // (Under the third lens's bank the pool's own froth is driven in: clusters of it a stride out from the lip.)
  float lip = smoothstep(8.5, 5.0, length(p.xz - vec2(${K1_AT[0].toFixed(3)}, ${K1_AT[1].toFixed(3)})));
  want = max(want, lip * smoothstep(-0.9, -0.06, s) * smoothstep(0.6, 0.78, fleck.g * 0.4 + raft.g * 0.6 + 0.3 * smoothstep(-0.5, -0.04, s)));
  // What the flow carries off the banks goes down the channel in thin strings.
  float strings = max(smoothstep(0.66, 0.76, carriedFine.r * 0.55 + carried.g * 0.45) * smoothstep(0.03, 0.1, speed) * 0.7, wake * smoothstep(0.4, 0.6, carriedFine.r) * 0.7);
  // (And scum catches on whatever stands in it.)
  want = max(max(want, strings), max(min(boil * 0.8, 0.45), collar * smoothstep(0.35, 0.6, fleck.g) * 0.8)) * seen;
  // (Bubbles a finger to a hand across: the froth's picture is laid small, and a second time larger where a clump stands, so no tile shows.)
  float foam = 0.0;
  vec4 froth = vec4(0.0);
  vec2 frothSlope = vec2(0.0);
  vec2 fdx = gX / 0.62;
  vec2 fdy = gY / 0.62;
  float sill = 0.0;
  if (want > 1e-3) {
    // Froth stands a finger over the level: a lens low over it sees each clump's near face drawn short and its far side run on over the
    // brine behind it, and looks into none of its pits.
    float graze = 1.0 - smoothstep(0.1, 0.5, v.y);
    vec2 stand = v.xz / max(v.y, 0.12) * 0.014 * smoothstep(0.1, 0.7, want);
    vec2 fuv = (p.xz + stand - flow * 9.0 * (pa - 0.5) * step(want, strings * seen + 1e-4)) / 0.62;
    vec4 relief = textureGrad(tFrothN, fuv, fdx, fdy);
    vec4 clump = textureLod(tFrothN, fuv * 0.31 + 0.37, log2(max(px / 2.0 * float(textureSize(tFrothN, 0).x), 1.0)));
    vec3 scum = textureLod(tFroth, fuv, log2(max(px / 0.62 * float(textureSize(tFroth, 0).x), 2.0)) - 1.0).rgb;
    float high = relief.b * 0.62 + clump.b * 0.38;
    // (A clump is whole or it is not there: the froth's own gaps cut it, and only its edge thins to single bubbles.)
    float dense = smoothstep(0.2, 0.75, want);
    float over = high - 1.1 + dense * (1.12 + 0.12 * graze);
    foam = smoothstep(0.0, 0.1, over);
    // (Where little gathers only the pale bubbles stand: the red between them in the froth's picture is the brine, and is left to it,
    // or a thin clump would lie on the pool as a flat red flake.)
    foam *= mix(smoothstep(0.4, 0.58, scum.g), 1.0, smoothstep(0.2, 0.55, want));
    // (Round every clump the brine is drawn up to it and lies in its shade: a dark wet line, which is what sets it on the surface.)
    sill = smoothstep(-0.06, 0.0, over) * (1.0 - foam);
    // Its own colours, as the picture has them: cream where the bubbles are small and dry, red where the brine stands in them. Dark down
    // between the bubbles, where the sky does not reach.
    float pit = mix(smoothstep(0.25, 0.75, relief.b), 1.0, 0.45 * graze);
    // (The side of a bubble that faces the lens has the bank or the brine behind it, not the sky: it is the darker side.)
    pit *= 1.0 - 0.3 * graze * smoothstep(0.0, 0.3, dot((relief.rg - 0.5) * vec2(1.0, -1.0), normalize(v.xz + vec2(1e-5))));
    froth = vec4((scum * 1.25 + 0.02) * (0.4 + 0.6 * pit) * mix(vec3(1.0, 0.8, 0.74), vec3(1.0), smoothstep(0.5, 0.8, high)), foam * 0.95);
    frothSlope = (relief.rg - 0.5) * vec2(1.0, -1.0) * 2.6;
  }
  // The bubbles stand up out of the surface: their own slopes take over from the brine's.
  slope = mix(slope, frothSlope, foam);
  vec3 n = normalize(vec3(slope.x, 1.0, slope.y));

  // The bed under the shallows, seen where the line of sight is bent down to it.
  float depth = clamp(max(-s * 0.5 - 0.02, 0.03 * (1.0 - smoothstep(0.12, 0.27, s))), 0.0, 0.7);
  vec2 bedAt = p.xz - v.xz / max(v.y, 0.3) * depth * 0.75 + slope * depth * 3.0;
  // (Under more than half a metre of it the bed gives back a fiftieth of its light: there it is not looked up.)
  vec3 bedTex = vec3(0.45, 0.4, 0.36);
  if (depth < 0.6) bedTex = textureGrad(tBed, bedAt / 2.6, fdx * (0.62 / 2.6), fdy * (0.62 / 2.6)).rgb;
  // (Wet and stained: the bed under the shallows is darker than the dry crust beside it, never paler.)
  brineBed = bedTex * vec3(0.2, 0.1, 0.085) * (0.7 + 0.6 * fleck.b);
  vec3 lit = brineShade(p, n, v, s, froth, gX, gY) * (1.0 - 0.3 * sill);
  // The cloud is brightest overhead: a wavelet that leans to the lens far enough stands the high sky on its face. Small hard glints
  // on the crests, and the body between them stays its own red.
  // (Counted by how far the wavelet lifts the mirrored ray over the level pool's, or a lens that looks down would find the glint on all of it.)
  float high = reflect(-v, n).y - v.y;
  float glint = smoothstep(0.24, 0.48, high);
  lit += uSkyZenith * 0.17 * glint * glint * (1.0 - 0.7 * foam) * skyOpen(p) * smoothstep(60.0, 20.0, dist);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;

/** The brine's cut along the shore, for the depth the engine lays down first. */
export const BRINE_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform sampler2D tGrain;
${FIELD_GLSL}
void main() {
  // (Read exactly as the surface reads it, or the two would not cut the same shore.)
  vec2 gx = dFdx(vWorld.xz);
  vec2 gy = dFdy(vWorld.xz);
  fieldDx = gx;
  fieldDy = gy;
  float s = fieldAt(vWorld.xz).r + (textureLod(tGrain, vWorld.xz / 1.9, log2(max(max(length(gx), length(gy)) * float(textureSize(tGrain, 0).x), 1e-6)) - log2(1.9)).r - 0.5) * 0.1;
  if (s > 0.3) discard;
  gl_FragColor = vec4(0.0);
}`;

// A dome of gas under a skin of brine, a drop thrown from one, and the crown of a burst. One unit ball or one unit tube, placed for each
// by its instance matrix; aLife.x is 0 to 1 how far the dome has swollen (the skin thins as it swells), aLife.y a number of its own.
export const DOME_VERTEX = /* glsl */ `
attribute vec4 aLife;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vLife;
void main() {
  // Where the skin meets the pool the brine is drawn up it: the foot flares out in a low skirt.
  float skirt = smoothstep(0.16, 0.0, position.y);
  // No dome is a ball: the skin sags to one side and bulges where the gas pushes.
  float az = atan(position.z, position.x);
  float bulge = 1.0 + (0.07 * sin(az * 2.0 + aLife.y * 30.0) + 0.045 * sin(az * 5.0 + aLife.y * 70.0 + position.y * 4.0)) * smoothstep(0.0, 0.25, position.y);
  float sag = 1.0 - 0.1 * position.y * (0.5 + 0.5 * sin(az * 1.0 + aLife.y * 50.0));
  vec3 q = vec3(position.x * (1.0 + 0.05 * skirt * skirt) * bulge, position.y * sag, position.z * (1.0 + 0.05 * skirt * skirt) * bulge);
  vec4 w = modelMatrix * instanceMatrix * vec4(q, 1.0);
  vWorld = w.xyz;
  vLocal = position;
  vLife = aLife;
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normalize(normal + vec3(0.0, 0.7 * skirt * skirt, 0.0)));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Where the overcast is thinnest over the pool: its window stands on the upper side of every wet round thing, to the right of the third lens.
const DOME_KEY = 'vec3(0.5075, 0.8374, 0.2030)';

// The skin of a dome is drawn twice over what is behind it. With THROUGH it gives the share of that light the film lets pass, red, green
// and blue each for itself (the mesh multiplies what is there by it); without, the light the film itself sends to the lens (added on top).
// One alpha could not do it: a red film takes the green and the blue of what is behind it and leaves the red.
// With DROP it is a bead of the same brine, solid.
export const DOME_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vLife;
uniform sampler2D tGrain;
uniform sampler2D tFroth;
${RIG_GLSL}

// What a unit of the film's thickness takes of red, green and blue.
const vec3 FILM_TAKES = vec3(0.95, 2.9, 3.2);
// The colour the brine in the film gives back to the light that falls on it.
const vec3 FILM_BODY = vec3(0.035, 0.008, 0.0065);

// How wide a pixel lies on the unit dome, set in the first line of main of the varying: every picture is read at the level that width
// asks for, never at one it picks for itself (which is not the same twice after a discard or under a branch).
float pxDome = 0.0;
vec4 grainAt(vec2 uv, float turns) {
  return textureLod(tGrain, uv, log2(max(pxDome * turns * float(textureSize(tGrain, 0).x), 1.0)));
}
// How thick the film is at a place on the unit dome. It drains from the crown to the foot: thin on top, thinner the more the dome has
// swollen, thick where it meets the pool, and thick in the runs that go down its sides. b: how much of a run is here.
vec2 filmAt(vec3 at, vec4 life) {
  float top = smoothstep(0.05, 1.0, at.y);
  // (A run keeps to its meridian: the picture is read along the way out from the crown, which has no seam.)
  vec2 mer = at.xz / max(length(at.xz), 0.08);
  vec4 a = grainAt(mer * 0.43 + life.y * 3.0 + at.y * 0.05, 0.6);
  vec4 c = grainAt(mer * 1.31 + life.y * 5.0 - at.y * 0.11, 1.8);
  vec4 b = grainAt(at.xz * 0.7 + life.y, 0.7);
  float runs = max(smoothstep(0.45, 0.8, a.r) * (1.0 - 0.7 * top), 0.7 * smoothstep(0.5, 0.8, c.g) * (1.0 - top) * (1.0 - top));
  float film = mix(0.85, 0.06 + 0.14 * (1.0 - life.x), smoothstep(0.0, 0.7, at.y)) + 0.2 * runs + (b.r - 0.5) * 0.3 * (1.0 - 0.5 * top) + 0.5 * smoothstep(0.2, 0.0, at.y);
  return vec2(clamp(film, 0.05, 2.0), runs);
}

void main() {
  pxDome = max(length(dFdx(vLocal)), length(dFdy(vLocal)));
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  // (The far wall is drawn only while the skin is open, when it is seen through the hole.)
  if (!gl_FrontFacing && vLife.w <= 0.0) discard;
  if (dot(n, v) < 0.0) n = -n;
  float open = skyOpen(vWorld);
  vec3 up = vec3(0.0, 1.0, 0.0);
#ifdef DROP
  // A bead of dark brine: one small window of the sky on its upper side and no pale limb.
  vec3 rd = reflect(-v, n);
  float td = max(dot(rd, ${DOME_KEY}), 0.0);
  vec3 bead = vec3(0.085, 0.011, 0.008) * skyIrradiance(n) * (open / 3.14159);
  bead += skyRadiance(normalize(vec3(rd.x, abs(rd.y) + 0.02, rd.z))) * (0.03 + 0.5 * smoothstep(0.9, 0.99, td)) * mix(1.0, open, 0.5);
  gl_FragColor = vec4(bead * (1.0 - uSolo), 1.0);
#else
  vec3 at = normalize(vLocal);
  float top = smoothstep(0.1, 1.0, vLocal.y);
  vec2 film = filmAt(at, vLife);
  vec4 g = grainAt(vLocal.xz * 0.9 + vLife.y, 0.9);
  vec4 grit = grainAt(vLocal.xz * 3.3 + vLife.y * 7.0, 3.3);
  vec4 fleck = grainAt(vLocal.xz * 9.1 + vLife.y * 11.0, 9.1);
  vec3 scumTex = textureLod(tFroth, vLocal.xz * 0.8 + vLife.y * 2.0, log2(max(pxDome * 0.8 * float(textureSize(tFroth, 0).x), 1.0))).rgb;
  // Torn: the skin opens from one point on its side, the hole's edge ragged and rolled thick, until nothing of it stands.
  float rim = 0.0;
  float glint = 0.0;
  float whole = 1.0;
  if (vLife.w > 0.0) {
    whole = 0.0;
    vec3 from = normalize(vec3(cos(vLife.y * 40.0) * 0.35, 0.94, sin(vLife.y * 40.0) * 0.35));
    // The film that has drawn back is rolled up in the hole's edge, and the edge runs ahead here and hangs back there: no two parts alike.
    vec4 ragged = grainAt(vLocal.xz * 0.13 + vLife.y * 3.0, 0.13);
    float gap = dot(at, from) + (ragged.g - 0.5) * 0.05 + (ragged.r - 0.5) * 0.11 * vLife.w + (grit.b - 0.5) * 0.03;
    float gone = 1.0 - 2.0 * vLife.w * (0.55 + 0.45 * vLife.w);
    if (gap > gone) discard;
    // A rolled bead, thicker the further it has run: dark, and round enough to carry a line of the sky along its back.
    float fat = 0.035 + 0.07 * vLife.w;
    rim = smoothstep(gone - fat, gone - fat * 0.6, gap);
    glint = smoothstep(gone - fat * 0.75, gone - fat * 0.5, gap) * smoothstep(gone - fat * 0.1, gone - fat * 0.4, gap);
    // (Behind the edge the film is gathered: thicker for a hand's breadth.)
    film.x += 0.6 * smoothstep(gone - 4.0 * fat, gone - fat, gap);
  }
  // The skin is never smooth as blown glass: it carries the pool's small waves up with it, and they run down it.
  n = normalize(n + vec3(g.b - 0.5, 0.0, g.a - 0.5) * 0.07 + vec3(grit.b - 0.5, 0.0, grit.a - 0.5) * 0.05 * (1.0 - 0.5 * top));
  float nv = clamp(dot(n, v), 0.0, 1.0);
  // The near wall. Light crosses it once on the way to the lens: the longer its way through the film (a thick place, or the film seen
  // along itself at the dome's edge), the more is taken, the green and the blue first.
  vec3 through = exp(-FILM_TAKES * film.x / max(nv, 0.2));
  // The far wall, seen through the near one while the dome is whole: the line of sight goes on through the gas and leaves by the far
  // side of the skin, or comes down on the pool inside. (The dome is a ball pressed flat: in its own measure the line is straight.)
  float wide = vLife.z * (0.35 + 0.65 * vLife.x);
  float tall = wide * (0.22 + 0.5 * vLife.x);
  vec3 dl = vec3(-v.x / wide, -v.y / tall, -v.z / wide);
  vec3 leaves = at - dl * (2.0 * dot(at, dl) / dot(dl, dl));
  float far = smoothstep(-0.03, 0.06, leaves.y) * whole;
  vec3 atFar = normalize(vec3(leaves.x, max(leaves.y, 0.0), leaves.z));
  vec2 filmFar = filmAt(atFar, vLife);
  vec3 nFar = normalize(vec3(atFar.x / wide, atFar.y / tall, atFar.z / wide));
  vec3 throughFar = mix(vec3(1.0), exp(-FILM_TAKES * filmFar.x / max(abs(dot(nFar, v)), 0.25)), far);
  // What the wet skin mirrors, by Fresnel's law: the sky above the mirrored horizon, the stand and the bank as a dark broken band on
  // it, the pool under it. That band and the dark under it are what make a bubble read as glass and not as a ball.
  float fres = min(0.03 + 0.97 * pow(1.0 - nv, 5.0), 0.32);
  // (Where the skin runs out into the pool it mirrors no more than the pool does, and scum on it mirrors nothing.)
  fres *= mix(0.15, 1.0, smoothstep(0.04, 0.26, vLocal.y)) * (1.0 - 0.8 * rim);
  // Scum rides on the skin where the runs have left it, and grit from the pool's floor: both hide what is behind them.
  // (Scum is a stain, soft at its edge and never whole: what the runs left behind, rust in the red. The lumps in it are few and pale.)
  float scum = 0.55 * smoothstep(0.6, 0.92, g.g * 0.75 + grit.r * 0.1 + 0.15 * scumTex.r + 0.12 * film.y) * smoothstep(0.25, 0.6, vLocal.y);
  float speck = smoothstep(0.86, 0.885, grit.g * 0.6 + fleck.b * 0.4) * smoothstep(0.25, 0.45, vLocal.y);
  float covered = max(max(scum, speck), rim);
#ifdef THROUGH
  // (At its foot the skin stands in the meniscus the pool draws up it, which looks down at the dark pool: a dark line round the dome.)
  vec3 passes = through * throughFar * (1.0 - fres) * (1.0 - covered) * mix(0.5, 1.0, smoothstep(0.02, 0.26, vLocal.y));
  gl_FragColor = vec4(passes, 1.0);
#else
  vec3 fallsOn = skyIrradiance(n) * (open / 3.14159);
  vec3 fromAbove = skyIrradiance(up) * (open / 3.14159);
  // What the film itself gives back: the brine's own red, more of it where more of it stands.
  vec3 lit = FILM_BODY * fallsOn * (1.0 - through.g);
  // The far wall is lit from outside and shows its lit side through itself: a red lamp behind the near wall. The gas between is steam,
  // and holds a little of that light.
  vec3 inside = FILM_BODY * fromAbove * (1.0 - throughFar.g) + vec3(0.74, 0.65, 0.63) * fromAbove * 0.075 * (0.3 + 0.7 * top) * whole;
  // (The far wall is wet on the inside too: the window stands in it a second time, small and low on the other side.)
  float towardFar = max(dot(reflect(-v, nFar), ${DOME_KEY}), 0.0);
  inside += uSkyZenith * 0.12 * smoothstep(0.9, 0.995, towardFar) * far;
  lit += through * inside;
  lit *= mix(0.45, 1.0, smoothstep(0.02, 0.26, vLocal.y));
  vec3 r = reflect(-v, n);
  float horizon = r.y + (g.g - 0.5) * 0.05;
  vec3 sky = skyRadiance(normalize(vec3(r.x, max(r.y, 0.0) + 0.02, r.z)));
  vec4 stand = grainAt(r.xz / max(length(r.xz), 0.05) * 0.9 + 0.31, 2.0);
  // (The pool lies in a ring of stalks and bank: only the skin's crown looks over them at the sky. The ring is dark and soft-topped.)
  float overRing = smoothstep(0.0, 0.3, horizon + (stand.r - 0.5) * 0.16);
  sky = mix(vec3(0.3, 0.265, 0.26) * fromAbove, sky, overRing);
  vec3 pond = vec3(0.05, 0.012, 0.01) * fromAbove + skyRadiance(vec3(r.x, abs(r.y) + 0.05, r.z)) * 0.08;
  vec3 env = mix(pond, sky, smoothstep(-0.02, 0.02, horizon));
  // The overcast is not even: its brighter quarter stands in the skin as one soft window with a hot middle, cut by the runs.
  // (Soft: a window in cloud has no edge, and the skin it stands in is not smooth.)
  float toward = max(dot(r, ${DOME_KEY}), 0.0) + (grit.r - 0.5) * 0.012;
  float window = smoothstep(0.55, 0.97, toward);
  float hot = smoothstep(0.93, 1.0, toward);
  env += uSkyZenith * (2.4 * window * window + 26.0 * hot * hot * hot) * (1.0 - 0.6 * film.y) * (0.6 + 0.4 * g.r);
  lit += env * fres * mix(1.0, open, 0.5) * vec3(1.0, 0.95, 0.93);
  lit += skyRadiance(up) * 0.035 * glint * smoothstep(0.35, 0.7, grit.r) * mix(1.0, open, 0.5);
  vec3 onTop = mix(vec3(0.34, 0.25, 0.2) * (0.5 + fleck.r), vec3(0.27, 0.11, 0.06) * (0.5 + 0.9 * scumTex.g), (1.0 - speck) * (1.0 - rim));
  // (The rolled edge of a torn skin is the brine itself, gathered: dark.)
  onTop = mix(onTop, vec3(0.05, 0.008, 0.006), rim);
  lit = mix(lit, onTop * fallsOn, covered);
  gl_FragColor = vec4(lit * (1.0 - uSolo), 0.0);
#endif
#endif
}`;

// What the pool throws up when a dome's skin is gone: the film's edge comes down on the pool all round and the brine it had gathered is
// flung up and out in a thin wall, higher in a few fingers than between them, which stands a moment, leans out and falls back. A unit
// tube (radius 1, y 0 at the pool to 1 at the wall's edge); aLife.x is seconds since it left the pool, aLife.y the dome's own number,
// aLife.z its size in metres.
export const CROWN_LIFE = 0.62;
export const CROWN_VERTEX = /* glsl */ `
attribute vec4 aLife;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vLife;
void main() {
  float size = aLife.z;
  float a = atan(position.z, position.x);
  float k = aLife.y * 6.283 + 2.1;
  float dur = ${CROWN_LIFE.toFixed(2)} * sqrt(size / 0.4);
  float x = clamp(aLife.x / dur, 0.0, 1.0);
  // Seven to nine fingers, never evenly set and no two as tall. (Each is where the edge's bead was thickest when it came down.)
  float count = 7.0 + floor(fract(aLife.y * 7.3) * 3.0);
  float turn = count * a + k * 3.0 + 0.8 * sin(a * 2.0 + k) + 0.5 * sin(a * 3.0 - k * 2.0);
  // (The edge is a row of round lobes, and only the fullest of them throws a thin jet on: a row of spikes is a toy crown.)
  float lobe = pow(0.5 + 0.5 * cos(turn), 2.0);
  float own = 0.62 + 0.38 * sin(a * 3.0 + k * 5.0) * sin(a + k * 2.0);
  float jet = pow(0.5 + 0.5 * cos(turn), 6.0) * smoothstep(0.55, 0.85, own);
  float finger = max(lobe * 0.6, jet);
  // Thrown, it only rises and falls. The side the tear reached first is up first.
  float lead = 0.12 * (0.5 + 0.5 * cos(a - aLife.y * 40.0));
  float xa = clamp((x - lead) / (1.0 - lead), 0.0, 1.0);
  float rise = 4.0 * xa * (1.0 - xa);
  float tall = size * rise * (0.2 + 0.24 * lobe * own + 0.14 * jet) * (0.8 + 0.2 * sin(a * 5.0 + k));
  float h = position.y * tall;
  // It leaves the pool leaning out and leans further as it falls; a finger leans more than the wall between.
  float lean = 0.25 + 0.6 * xa + 0.2 * finger;
  float foot = size * (0.78 + 0.3 * xa) * (1.0 + 0.06 * sin(a * 2.0 + k * 3.0) + 0.04 * sin(a * 5.0 - k));
  float out2 = foot + lean * h * (0.6 + 0.4 * position.y);
  vec4 w = modelMatrix * instanceMatrix * vec4(cos(a) * out2, h - 0.004, sin(a) * out2, 1.0);
  vWorld = w.xyz;
  vLocal = vec3(a, position.y, finger);
  vLife = vec4(tall > 0.0 && aLife.x > 0.0 ? clamp(xa, 0.001, 1.0) : 0.0, aLife.y, tall, own);
  vNormal = normalize(vec3(cos(a), -lean, sin(a)));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const CROWN_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vLife;
uniform sampler2D tGrain;
${RIG_GLSL}

void main() {
  // (Taken before the discard: see the surface.)
  float level = log2(max(max(length(dFdx(vWorld)), length(dFdy(vWorld))) * float(textureSize(tGrain, 0).x), 1e-6));
  if (vLife.x <= 0.0) discard;
  // The wall is a sheet of brine a finger thick at the pool and thin as a film at its edge, where it is rolled into a bead again. The
  // grain runs up it: it was drawn out as it was thrown.
  float up01 = vLocal.y;
  // (Round it by whole tiles, read off the normal: the turn itself has a seam across one strip of the tube.)
  float around = atan(vNormal.z, vNormal.x) / 6.2832;
  vec4 g = textureLod(tGrain, vec2(around * 12.0 + vLife.y * 3.0, vWorld.y * 0.9), level + 2.0);
  vec4 fine = textureLod(tGrain, vec2(around * 33.0 + vLife.y, vWorld.y * 4.1 + 0.3), level + 3.4);
  // (Between the fingers the sheet is thinnest, and as it falls it breaks there into holes: what is left is the fingers and the bead.)
  float web = smoothstep(0.2, 0.9, up01) * (1.0 - vLocal.z);
  float holed = smoothstep(0.42, 0.5, g.r * 0.7 + fine.g * 0.3 + 0.55 * web * smoothstep(0.35, 0.9, vLife.x) - 0.25);
  float bead = smoothstep(0.9, 0.97, up01 + 0.03 * (fine.r - 0.5));
  if (holed > 0.5 && bead < 0.5) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, v) < 0.0) n = -n;
  n = normalize(n + vec3(g.b - 0.5, (fine.b - 0.5) * 0.6, g.a - 0.5) * 0.3);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  float open = skyOpen(vWorld);
  vec3 above = skyIrradiance(vec3(0.0, 1.0, 0.0)) * (open / 3.14159);
  // (It was drawn out unevenly: thick runs and thin between them, up the wall.)
  float thick = (mix(1.4, 0.55, smoothstep(0.05, 0.7, up01)) + 0.2 * bead + 0.5 * vLocal.z) * (0.55 + 0.9 * fine.g);
  // The brine itself, and the light that comes through the thin of it from the sky behind: red where it is thick, pale where it is film.
  vec3 takes = exp(-vec3(0.95, 2.9, 3.2) * thick * 1.6);
  vec3 lit = vec3(0.07, 0.011, 0.0085) * above * (1.0 - takes.g) + above * takes * 0.018;
  // It is wet on both sides: the sky stands in it over the mirrored horizon, the dark pool under, and the cloud's window on every bend.
  vec3 pond = vec3(0.05, 0.012, 0.01) * above + skyRadiance(vec3(r.x, abs(r.y) + 0.05, r.z)) * 0.1;
  vec3 env = mix(pond, skyRadiance(normalize(vec3(r.x, max(r.y, 0.0) + 0.02, r.z))), smoothstep(-0.05, 0.08, r.y + (g.g - 0.5) * 0.1));
  float toward = max(dot(r, ${DOME_KEY}), 0.0);
  env += uSkyZenith * 2.2 * pow(smoothstep(0.86, 1.0, toward), 3.0);
  float fres = min(0.025 + 0.97 * pow(1.0 - nv, 5.0), 0.05);
  vec3 mirrored = env * vec3(1.0, 0.92, 0.9) * fres * mix(1.0, open, 0.5) * (0.45 + 1.1 * g.r);
  // It comes up out of the level and goes back into it: at its foot and at both ends of its life it is the pool.
  float cover = (1.0 - 0.85 * takes.r * (1.0 - 0.5 * bead)) * smoothstep(0.0, 0.08, up01) * smoothstep(0.0, 0.06, vLife.x) * smoothstep(1.0, 0.9, vLife.x);
  gl_FragColor = vec4((lit * cover + mirrored * smoothstep(0.0, 0.08, up01)) * (1.0 - uSolo), cover);
}`;
