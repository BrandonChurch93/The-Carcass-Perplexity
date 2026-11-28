// The brine's own surface, its domes of gas, and what a dome becomes when it tears.
import { BEASTS, F, K1_AT, POOL_R, R, STUCK, rel } from '../shared/anchors';

const STUCK_AT = rel(STUCK[0], STUCK[1]);
import { BRINE_GLSL } from '../shared/brine-glsl';
import { RIG_GLSL } from '../shared/glsl';
import { FIELD_GLSL } from '../land/shaders';

export const MAX_RINGS = 24;
/** Seconds the skin of a dome takes to draw back from the point it tore at: twenty frames. */
export const TEAR = 0.2;

const WIND_RAW = [R[0] * 0.8 + F[0] * 0.6, R[1] * 0.8 + F[1] * 0.6];
const WIND_LEN = Math.hypot(WIND_RAW[0] as number, WIND_RAW[1] as number);
const WIND_N = [(WIND_RAW[0] as number) / WIND_LEN, (WIND_RAW[1] as number) / WIND_LEN];
const v2 = (a: number[]): string => `vec2(${(a[0] as number).toFixed(4)}, ${(a[1] as number).toFixed(4)})`;

/** How many of the animals the pool answers to with rings (shared/anchors.ts, BEASTS). */
export const MAX_STIR = 16;

const WIND_ANGLE = Math.atan2(WIND_N[1] as number, WIND_N[0] as number);
const omega = (len: number): number => {
  const k = (Math.PI * 2) / len;
  return Math.sqrt(9.81 * k + 0.000074 * k * k * k);
};
// The standing ripple of the place, length by length: metres from crest to crest, the turn off the light air's way, the lean it gives
// the skin, and which slow patch of the pool lets it through (a look at the grain that main has taken already). Each length runs at
// its own speed, by gravity and the skin's tension, so the pattern never slides as one sheet.
const AMBIENT: [number, number, number, string][] = [
  [0.91, -0.38, 0.05, 'heave.g'],
  [0.61, 0.1, 0.05, 'carried.g'],
  [0.43, -0.75, 0.055, 'carried.a'],
  [0.29, 0.47, 0.06, 'fine.g'],
  [0.197, -1.12, 0.065, 'carriedFine.r'],
  [0.131, 0.96, 0.065, 'heave.r'],
  [0.089, -0.33, 0.06, 'fine.b'],
  [0.061, 1.41, 0.05, 'carriedFine.a'],
  [0.043, -1.52, 0.04, 'fine.a'],
];
// One wave is kept only where the lens can tell its crests apart along the way it runs: the pixel's footprint on the pool is long
// toward the lens and short across, so a low lens keeps the crests that run toward it and loses the ones that lie across. What is
// lost is not gone: it is counted, and widens what the pixel mirrors.
const ambientWaves = AMBIENT.map(([len, turn, lean, patch], i) => {
  const near = i < 3 ? '' : i < 7 ? ' * nearShort' : ' * nearFine';
  const ang = WIND_ANGLE + turn;
  const k = (Math.PI * 2) / len;
  return `  {
    vec2 d = vec2(${Math.cos(ang).toFixed(4)}, ${Math.sin(ang).toFixed(4)});
    float seenAs = smoothstep(${(0.42 * len).toFixed(4)}, ${(0.14 * len).toFixed(4)}, max(abs(dot(gX, d)), abs(dot(gY, d))));
    float lets = ${lean.toFixed(3)} * smoothstep(0.3, 0.68, ${patch})${near};
    ripples += d * (lets * seenAs * cos(${k.toFixed(3)} * dot(d, bent) - ${omega(len).toFixed(3)} * uTime + ${(i * 2.39).toFixed(2)}));
    lost += lets * lets * (1.0 - seenAs * seenAs);
  }`;
});
// (The lengths under a third of a metre are asked for only within some strides of the lens, the two finest within ten metres: past
// that no lens of the place can tell their crests apart, and they are counted as lost at their mean.)
const lostMean = (from: number): string => AMBIENT.slice(from).reduce((sum, w) => sum + 0.2 * w[2] * w[2], 0).toFixed(5);
const ambientLong = ambientWaves.slice(0, 3).join('\n');
const ambientShort = ambientWaves.slice(3, 7).join('\n');
const ambientFine = ambientWaves.slice(7).join('\n');
// The ring round all the animals: outside it no pixel asks any of them.
const STIR_AT = BEASTS.slice(0, MAX_STIR).map((b) => ({ at: rel(b.d, b.l), reach: 1.9 * b.size + 8 }));
const STIR_MID = [STIR_AT.reduce((sum, b) => sum + (b.at[0] as number), 0) / Math.max(STIR_AT.length, 1), STIR_AT.reduce((sum, b) => sum + (b.at[1] as number), 0) / Math.max(STIR_AT.length, 1)];
const STIR_REACH = STIR_AT.reduce((far, b) => Math.max(far, Math.hypot((b.at[0] as number) - (STIR_MID[0] as number), (b.at[1] as number) - (STIR_MID[1] as number)) + b.reach), 0);
// What an animal sends out as it shifts in the brine: rings of three lengths, in packets that leave it one after another.
const STIR: [number, number][] = [
  [0.34, 0.13],
  [0.19, 0.11],
  [0.107, 0.075],
];
const stirWaves = STIR.map(([len, lean], j) => {
  const k = (Math.PI * 2) / len;
  const w = omega(len);
  const group = (0.5 * w) / k;
  return `      {
        float seenAs = smoothstep(${(0.42 * len).toFixed(4)}, ${(0.14 * len).toFixed(4)}, across);
        float packet = 0.5 + 0.5 * sin((0.8 + 0.5 * own) * (uTime - out2 / ${group.toFixed(4)}) + own * ${(19 + j * 7).toFixed(1)});
        float lets = ${lean.toFixed(3)} * reachOut * packet;
        ripples += u * (lets * seenAs * cos(${k.toFixed(3)} * out2 - ${w.toFixed(3)} * uTime + own * ${(31 + j * 11).toFixed(1)}));
        lost += lets * lets * (1.0 - seenAs * seenAs);
      }`;
}).join('\n');

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
// The animals that stand or lie in the brine: x, z, the reach of the body in metres, a number of its own.
uniform vec4 uStir[${MAX_STIR}];
uniform int uStirCount;
${RIG_GLSL}
${FIELD_GLSL}
${BRINE_GLSL}

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
  // (The wake is longer than the thing is wide: it is asked for a stride up the flow and again two strides up, where it has thinned.)
  float wake = speed > 0.06 ? max(contactDrawn(p - vec3(flow.x, 0.0, flow.y) / speed * 0.7), 0.6 * contactDrawn(p - vec3(flow.x, 0.0, flow.y) / speed * 1.9) * smoothstep(0.35, 0.6, carriedFine.g)) * smoothstep(0.06, 0.25, speed) : 0.0;
  slope += (carried.ba - 0.5) * 0.5 * wake;
  // Where the big ones wade the brine is churned: dark with mud and never still.
  brineMud = 1.0 - smoothstep(5.0, 11.0, length(p.xz - uWade));
  brineSlurry = 1.0 - smoothstep(1.8, 4.2, length(p.xz - vec2(${STUCK_AT[0].toFixed(3)}, ${STUCK_AT[1].toFixed(3)})));
  // The skin is never glass. A light air keeps a low ripple on it, more in this patch and less in that, and whatever lives in it
  // sends its own rings out. Every wave is counted, not looked up: a length, a way and a speed of its own.
  vec4 bend = grain(p.xz / 0.83 + vec2(0.01, 0.007) * uTime, -0.2688);
  // (No crest is ruled: the place a wave is asked at is pushed about a hand's breadth by the grain.)
  vec2 bent = p.xz + (bend.rg - 0.5) * 0.05 + (fine.ba - 0.5) * 0.15;
  vec2 ripples = vec2(0.0);
  float lost = 0.0;
  float ruffle = 0.42 + 0.5 * smoothstep(0.35, 0.75, carried.a) + 2.2 * speed + 0.25 * inPool + 1.3 * brineMud;
  // (No length stops at a line on the pool: each gives out over some strides before the place where it is no longer asked for.)
  float nearShort = smoothstep(30.0, 21.0, dist);
  float nearFine = smoothstep(10.0, 6.5, dist);
  if (dist < 120.0) {
${ambientLong}
    if (dist < 30.0) {
${ambientShort}
      if (dist < 10.0) {
${ambientFine}
      } else lost += ${lostMean(7)};
    } else lost += ${lostMean(3)};
    ripples *= ruffle;
    lost *= ruffle * ruffle;
    // From a lens that stands over the place and not in it, a ripple whose crests happen to run toward it would be the only one left, drawn
    // as ruled lines side by side: far off the light air's ripple is told only if every way of it can be, or it is all counted as lost.
    float keepFar = mix(smoothstep(0.13, 0.05, px), 1.0, smoothstep(34.0, 18.0, dist) * smoothstep(2.6, 1.8, cameraPosition.y));
    lost += 0.5 * dot(ripples, ripples) * (1.0 - keepFar * keepFar);
    ripples *= keepFar;
    if (dist < 60.0 && length(p.xz - ${v2(STIR_MID)}) < ${STIR_REACH.toFixed(2)})
    for (int i = 0; i < ${MAX_STIR}; i++) {
      if (i >= uStirCount) break;
      vec4 beast = uStir[i];
      vec2 dv = p.xz - beast.xy;
      float r = length(dv);
      if (r > beast.z + 8.0) continue;
      vec2 u = dv / max(r, 0.05);
      float own = beast.w;
      // (Metres out from the hide, which is no circle.)
      float out2 = r - beast.z * (0.72 + 0.2 * sin(atan(u.y, u.x) * 2.0 + own * 9.0)) + (bend.b - 0.5) * 0.28 + (fine.g - 0.5) * 0.36;
      float reachOut = smoothstep(-0.15, 0.2, out2) * exp(-max(out2, 0.0) / 2.4) / (1.0 + 0.45 * max(out2, 0.0));
      float across = max(abs(dot(gX, u)), abs(dot(gY, u)));
${stirWaves}
    }
  }
  // (Near the lens every wavelet is seen for itself and turns its own piece of the sky: far off they are averaged into the sheen.)
  float nearGain = 1.0 + 1.0 * smoothstep(14.0, 4.0, dist);
  slope += ripples;
  // (Only for a lens that stands in the place: from the far bank the wallow is one more red reach of the vein.)
  brineSheen = 0.12 + 0.88 * max(brineMud, 1.0 - smoothstep(9.0, 24.0, length(p.xz - vec2(${STUCK_AT[0].toFixed(3)}, ${STUCK_AT[1].toFixed(3)})))) * smoothstep(40.0, 22.0, dist);
  // (A lens that stands over the round pool on the far bank looks along it from a long way: every wavelet turns its face from that lens
  // or hides behind the next, and what the pool gives back of the white sky is less than half of what glass would. It stays red.)
  brineSheen *= 1.0 - 0.6 * inPool * smoothstep(1.8, 2.6, cameraPosition.y);
  brineRough = clamp(sqrt(lost) * 4.0 + 0.5 * smoothstep(0.02, 0.3, px) + 0.6 * inPool, 0.0, 1.0);

  // How much froth the domes and the bursts have left here.
  float boil = 0.0;
  vec2 swell = vec2(0.0);
  float footFoam = 0.0;
  // (What a ring that has run some strides still carries when it comes to the bank: there it steepens and breaks.)
  float surf = 0.0;
  // (Rings whose crests the lens cannot tell apart are not drawn: far off and seen low they would run together into streaks.)
  float told = smoothstep(0.2, 0.07, px);
  if (pool < 16.0) {
    // Each seep sends out ring after ring: half a stride from crest to crest, 0.7 m a second, dying with the way they have come.
    for (int i = 0; i < ${MAX_SEEPS}; i++) {
      vec4 seep = uSeeps[i];
      vec2 d = p.xz - seep.xy;
      float r = length(d);
      float beat = 0.6 + 0.4 * sin(uTime * 0.9 + seep.z * 17.0);
      slope += d / max(r, 0.03) * cos(r * 15.0 - uTime * 10.5 + seep.z * 40.0 + (bend.r - 0.5) * 1.2) * seep.w * beat * nearGain * told * smoothstep(0.05, 0.35, r) / (1.0 + 0.55 * r * r);
    }
    for (int i = 0; i < ${MAX_RINGS}; i++) {
      if (i >= uRingCount) break;
      vec4 ring = uRings[i];
      vec2 d = p.xz - ring.xy;
      float r = length(d);
      float wide = 0.16 + 0.07 * ring.z;
      // (A ring with its height below nothing is the one that stands at a dome's foot: froth gathers in a thin line against the skin.)
      float amp = abs(ring.w);
      if (ring.w < 0.0) footFoam = max(footFoam, exp(-(r - ring.z + 0.07) * (r - ring.z + 0.07) / 0.0064) * smoothstep(0.0, 0.3, amp));
      if (abs(r - ring.z) > 3.2 * wide + 0.25) continue;
      // No ring is a circle drawn with a compass: the front runs ahead here and lags there, and is higher where more was thrown.
      // (Its unevenness is a few slow turns round it, each ring's own: counted, not looked up, for a pixel asks every ring.)
      vec2 u = d / max(r, 0.01);
      vec4 own = fract(ring.x * vec4(1.37, 2.91, 0.83, 3.57) + ring.y * vec4(0.71, 1.93, 2.47, 0.59)) * 2.0 - 1.0;
      float two = u.x * u.x - u.y * u.y;
      float three = u.x * (4.0 * u.x * u.x - 3.0);
      float lag = 0.2 * two * own.x + 0.2 * (2.0 * u.x * u.y) * own.y + 0.16 * three * own.z + 0.14 * u.y * (3.0 - 4.0 * u.y * u.y) * own.w;
      float thrown = 0.5 + 0.3 * u.x * own.w + 0.3 * u.y * own.z + 0.2 * two * own.y - 0.2 * three * own.x;
      float q = r - ring.z - lag * (0.16 + 0.34 * ring.z);
      float env = exp(-q * q / (wide * wide)) * amp * (0.45 + 1.1 * clamp(thrown, 0.0, 1.0));
      if (env < 0.003) continue;
      // The long waves lead and the short ones follow: the crests are closer behind the front than before it.
      vec2 front = d / max(r, 0.01) * env * sin(q * (14.0 - 22.0 * q)) * 0.3 * nearGain * mix(0.4, 1.0, told);
      slope += front;
      swell += front;
      boil = max(boil, env * smoothstep(1.5, 0.25, ring.z));
      surf = max(surf, env * smoothstep(0.6, 1.4, ring.z));
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
    slope += off * (0.32 * ringed * sin(stood * 30.0 + uTime * 5.5 + patchy.r * 9.0) + 0.75 * smoothstep(0.6, 0.92, stood)) * smoothstep(30.0, 10.0, dist);
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
  // (They are what shows the flow from the far bank: rafts a stride or two long that go down the channel at its own speed, more of
  // them in the fast middle, and they are seen from further off than the froth that lies still at a bank.)
  float seenFar = smoothstep(110.0, 45.0, dist);
  float far = smoothstep(14.0, 38.0, dist);
  float strings = max(smoothstep(0.66 - 0.07 * far, 0.76 - 0.06 * far, carriedFine.r * 0.55 + carried.g * 0.45 + 0.2 * far * (speed - 0.2)) * smoothstep(0.03, 0.1, speed) * 0.7, wake * smoothstep(0.4, 0.6, carriedFine.r) * 0.7);
  // (And scum catches on whatever stands in it.)
  // A ring breaks on the bank: in the last hand before the lip its front stands up, and leaves a broken line of froth where it fell.
  float breaks = min(surf * 1.6, 0.75) * smoothstep(-0.34, -0.03, s) * smoothstep(0.25, 0.6, fleck.r * 0.6 + raft.a * 0.4);
  want = max(max(max(want, breaks), max(max(min(boil * 0.8, 0.45), footFoam * 0.7), collar * smoothstep(0.35, 0.6, fleck.g) * 0.8)) * seen, strings * seenFar);
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
    vec2 fuv = (p.xz + stand - flow * 9.0 * (pa - 0.5) * step(want, strings * seenFar + 1e-4)) / 0.62;
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
  brineBed = bedTex * vec3(0.2, 0.1, 0.085) * (0.7 + 0.6 * fleck.b) * (1.0 - 0.62 * brineMud);
  vec3 lit = brineShade(p, n, v, s, froth, gX, gY) * (1.0 - 0.3 * sill);
  // Silt hangs in it in slow clouds a hand to a stride across, paler here and darker there: under a dome and in a thing's mirror image,
  // where no sky lies on it, the brine is still not one flat red.
  lit *= 1.0 + (0.24 * (heave.g - 0.5) + 0.16 * (fine.r - 0.5)) * smoothstep(40.0, 10.0, dist) * (1.0 - foam);
  // Where a thing stands in it the brine is drawn up it in a lip: under the lip it looks down into itself, dark and wet, and the lip's
  // back carries a line of the sky. In stirred mud, which mirrors little, the rings it sends out show as light and dark.
  float wetLine = smoothstep(0.62, 0.9, stood) * smoothstep(30.0, 10.0, dist) * (1.0 - foam);
  lit *= 1.0 - 0.5 * wetLine;
  lit += uSkyZenith * 0.045 * smoothstep(0.42, 0.58, stood) * smoothstep(0.74, 0.6, stood) * smoothstep(30.0, 10.0, dist) * (1.0 - foam);
  lit *= 1.0 + 0.16 * ringed * sin(stood * 30.0 + uTime * 5.5 + patchy.r * 9.0) * clamp(brineMud + brineSlurry, 0.0, 1.0);
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
  if (aLife.w > 0.0) {
    // Torn, the gas is out and nothing holds the skin up. What is left of it falls, slackens into folds that run back from the hole,
    // is drawn away from the hole as the edge runs, and carries the brine the edge has rolled up as a thick bead along it.
    vec3 from = normalize(vec3(cos(aLife.y * 40.0) * 0.72, 0.69, sin(aLife.y * 40.0) * 0.72));
    vec3 at = normalize(position);
    vec3 side = normalize(cross(from, vec3(0.0, 1.0, 0.0)));
    vec3 over = cross(side, from);
    float about = atan(dot(at, side), dot(at, over));
    float gap = dot(at, from) + aLife.w * (0.1 * sin(about * 3.0 + aLife.y * 20.0) + 0.06 * sin(about * 5.0 - aLife.y * 45.0));
    float gone = 1.0 - 2.0 * aLife.w * (0.55 + 0.45 * aLife.w);
    float back = max(gone - gap, 0.0);
    float fat = 0.03 + 0.045 * aLife.w;
    float nearEdge = exp(-back / 0.35);
    float held = smoothstep(0.0, 0.22, position.y);
    float fold = 0.6 * sin(about * 9.0 + aLife.y * 50.0 + back * 6.0) + 0.4 * sin(about * 17.0 - aLife.y * 31.0);
    q += at * (fold * 0.06 * aLife.w * held * (0.3 + 0.7 * nearEdge) + 0.8 * fat * exp(-back * back / (fat * fat)));
    q += (at * dot(at, from) - from) * (0.12 * aLife.w * nearEdge * held);
    q.y *= 1.0 - 0.5 * aLife.w * aLife.w * (0.5 + 0.5 * nearEdge);
  }
  vec4 w = modelMatrix * instanceMatrix * vec4(q, 1.0);
  vWorld = w.xyz;
  vLocal = position;
  vLife = aLife;
#ifdef DROP
  // (A bead drawn out along its way is no ball: its faces turn as the drawing-out turns them, not as the ball's did.)
  mat3 im = mat3(instanceMatrix);
  vNormal = normalize(mat3(modelMatrix) * (im[0] * (normal.x / max(dot(im[0], im[0]), 1e-12)) + im[1] * (normal.y / max(dot(im[1], im[1]), 1e-12)) + im[2] * (normal.z / max(dot(im[2], im[2]), 1e-12))));
  w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
#else
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normalize(normal + vec3(0.0, 0.7 * skirt * skirt, 0.0)));
#endif
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
  float film = mix(0.85, 0.06 + 0.14 * (1.0 - life.x), smoothstep(0.0, mix(0.7, 0.34, life.x), at.y)) + 0.2 * runs + (b.r - 0.5) * 0.3 * (1.0 - 0.5 * top) + 0.5 * smoothstep(0.2, 0.0, at.y);
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
  vec3 bead = vec3(0.11, 0.013, 0.009) * skyIrradiance(n) * (open / 3.14159);
  float graze = 1.0 - max(dot(n, v), 0.0);
  // (A string of brine is thin: toward its edge the lens looks through less of it, and the white sky behind comes through red.)
  bead += vec3(0.2, 0.022, 0.014) * skyIrradiance(up) * (open / 3.14159) * graze * graze;
  bead += skyRadiance(normalize(vec3(rd.x, abs(rd.y) + 0.02, rd.z))) * (0.012 + 0.1 * graze * graze * graze * graze * max(rd.y, 0.0) + 0.45 * smoothstep(0.955, 0.992, td)) * mix(1.0, open, 0.5);
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
    vec3 from = normalize(vec3(cos(vLife.y * 40.0) * 0.72, 0.69, sin(vLife.y * 40.0) * 0.72));
    // The film that has drawn back is rolled up in the hole's edge, and the edge runs ahead here and hangs back there: no two parts alike.
    vec4 ragged = grainAt(vLocal.xz * 0.13 + vLife.y * 3.0, 0.13);
    // (No hole is round: its edge runs ahead in three or five great lobes, the same the skin's own shape is moved by.)
    vec3 side = normalize(cross(from, vec3(0.0, 1.0, 0.0)));
    float about = atan(dot(at, side), dot(at, cross(side, from)));
    float gap = dot(at, from) + vLife.w * (0.1 * sin(about * 3.0 + vLife.y * 20.0) + 0.06 * sin(about * 5.0 - vLife.y * 45.0)) + (ragged.g - 0.5) * 0.05 + (ragged.r - 0.5) * 0.11 * vLife.w + (grit.b - 0.5) * 0.03;
    float gone = 1.0 - 2.0 * vLife.w * (0.55 + 0.45 * vLife.w);
    if (gap > gone) discard;
    // A rolled bead, thicker the further it has run: dark, and round enough to carry a line of the sky along its back.
    float fat = 0.03 + 0.045 * vLife.w;
    rim = smoothstep(gone - fat, gone - fat * 0.6, gap);
    glint = smoothstep(gone - fat * 0.75, gone - fat * 0.5, gap) * smoothstep(gone - fat * 0.1, gone - fat * 0.4, gap);
    // (Behind the edge the film is gathered: thicker for a hand's breadth.)
    film.x += 0.3 * smoothstep(gone - 2.5 * fat, gone - fat, gap);
    // (What still stands is the same thin skin, seen from inside on the far side: it is not a wall of brine.)
    // (And it is stretched as it goes: the further the hole has run, the thinner and the paler what is left of it.)
    film.x *= (gl_FrontFacing ? 0.75 : 0.45) * mix(1.0, 0.3, smoothstep(0.1, 0.8, vLife.w));
  }
  // The skin is never smooth as blown glass: it carries the pool's small waves up with it, and they run down it.
  n = normalize(n + vec3(g.b - 0.5, 0.0, g.a - 0.5) * 0.07 + vec3(grit.b - 0.5, 0.0, grit.a - 0.5) * 0.05 * (1.0 - 0.5 * top));
  float nv = clamp(dot(n, v), 0.0, 1.0);
  // The near wall. Light crosses it once on the way to the lens: the longer its way through the film (a thick place, or the film seen
  // along itself at the dome's edge), the more is taken, the green and the blue first.
  vec3 through = exp(-FILM_TAKES * film.x / max(nv, mix(0.5, 0.2, whole)));
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
  fres *= mix(0.15, 1.0, smoothstep(0.02, 0.12, vLocal.y)) * (1.0 - 0.8 * rim);
  // Scum rides on the skin where the runs have left it, and grit from the pool's floor: both hide what is behind them.
  // (Scum is a stain, soft at its edge and never whole: what the runs left behind, rust in the red. The lumps in it are few and pale.)
  float scum = 0.3 * smoothstep(0.68, 0.94, g.g * 0.75 + grit.r * 0.1 + 0.15 * scumTex.r + 0.12 * film.y) * smoothstep(0.03, 0.2, vLocal.y);
  float speck = smoothstep(0.86, 0.885, grit.g * 0.6 + fleck.b * 0.4) * smoothstep(0.25, 0.45, vLocal.y);
  float covered = max(max(scum, speck), rim);
  // A lens down at the pool's level looks along the skin and not across it: the film stands thicker in the way from the crown down to
  // the wall, and hides the far bank's straight line behind it. (From a stride up the skin is looked through, and stays glass.)
  float veil = 0.16 * smoothstep(0.85, 0.3, vLocal.y) * smoothstep(0.2, 0.07, v.y) * whole;
#ifdef THROUGH
  // (At its foot the skin stands in the meniscus the pool draws up it, which looks down at the dark pool: a dark line round the dome.)
  vec3 passes = through * throughFar * (1.0 - fres) * (1.0 - covered) * (1.0 - veil) * mix(0.86, 1.0, smoothstep(0.01, 0.1, vLocal.y));
  gl_FragColor = vec4(passes, 1.0);
#else
  vec3 fallsOn = skyIrradiance(n) * (open / 3.14159);
  vec3 fromAbove = skyIrradiance(up) * (open / 3.14159);
  // What the film itself gives back: the brine's own red, more of it where more of it stands.
  vec3 lit = FILM_BODY * fallsOn * (1.0 - through.g);
  // The far wall is lit from outside and shows its lit side through itself: a red lamp behind the near wall. The gas between is steam,
  // and holds a little of that light.
  vec3 inside = FILM_BODY * fromAbove * (1.0 - throughFar.g) + vec3(0.74, 0.65, 0.63) * fromAbove * 0.045 * (1.0 - 0.32 * top) * whole;
  // (Under the far wall's foot the line of sight comes down on the pool inside, which mirrors that lit wall: brightest at its foot,
  // dying toward the near side. Without it a dome seen from low and close stands on a dark drum.)
  inside += FILM_BODY * fromAbove * 0.5 * (1.0 - far) * whole * smoothstep(-0.7, 0.0, leaves.y);
  // (The far wall is wet on the inside too: the window stands in it a second time, small and low on the other side.)
  float towardFar = max(dot(reflect(-v, nFar), ${DOME_KEY}), 0.0);
  inside += uSkyZenith * 0.12 * smoothstep(0.9, 0.995, towardFar) * far;
  lit += through * inside;
  lit += veil * fromAbove * mix(vec3(0.23, 0.13, 0.125), vec3(0.12, 0.027, 0.023), smoothstep(0.75, 0.15, vLocal.y)) * mix(0.7, 1.1, through.g) * (1.0 - covered);
  lit *= mix(0.8, 1.0, smoothstep(0.01, 0.1, vLocal.y));
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
  float window = smoothstep(0.8, 0.985, toward);
  float hot = smoothstep(0.972, 1.0, toward);
  env += uSkyZenith * (1.1 * window * window + 16.0 * hot * hot * hot) * (1.0 - 0.6 * film.y) * (0.6 + 0.4 * g.r);
  lit += env * fres * mix(1.0, open, 0.5) * vec3(1.0, 0.95, 0.93);
  lit += skyRadiance(up) * 0.035 * glint * smoothstep(0.35, 0.7, grit.r) * mix(1.0, open, 0.5);
  vec3 onTop = mix(vec3(0.34, 0.25, 0.2) * (0.5 + fleck.r), vec3(0.27, 0.11, 0.06) * (0.5 + 0.9 * scumTex.g), (1.0 - speck) * (1.0 - rim));
  // (The rolled edge of a torn skin is the brine itself, gathered: dark.)
  onTop = mix(onTop, vec3(0.085, 0.013, 0.01), rim);
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
  // (The strings and the drops are thrown as bodies of their own: what stands here is only the low swell of the pool's lip.)
  float finger = lobe * 0.6;
  // Thrown, it only rises and falls. The side the tear reached first is up first, the far side a third of a second after it.
  float lead = ${(0.7 * TEAR).toFixed(3)} / dur * (0.5 - 0.5 * cos(a - aLife.y * 40.0));
  float xa = clamp((x - lead) / (1.0 - lead), 0.0, 1.0);
  float rise = 4.0 * xa * (1.0 - xa);
  float tall = size * rise * (0.07 + 0.22 * lobe * own) * (0.8 + 0.2 * sin(a * 5.0 + k));
  float h = position.y * tall;
  // It leaves the pool leaning out and leans further as it falls; a finger leans more than the wall between.
  float lean = 0.25 + 0.6 * xa + 0.2 * finger;
  float foot = size * (0.78 + 0.3 * xa) * (1.0 + 0.16 * sin(a * 2.0 + k * 3.0) + 0.09 * sin(a * 3.0 + k * 2.0) + 0.06 * sin(a * 5.0 - k));
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
