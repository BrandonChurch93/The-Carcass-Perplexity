// The brine's own surface, its domes of gas, and what a dome becomes when it tears.
import { F, K1_AT, POOL_R, R, STUCK, rel } from '../shared/anchors';

const STUCK_AT = rel(STUCK[0], STUCK[1]);
import { BRINE_GLSL } from '../shared/brine-glsl';
import { RIG_GLSL } from '../shared/glsl';
import { FIELD_GLSL } from '../land/shaders';

export const MAX_RINGS = 24;

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
vec2 train(vec2 q, vec2 dir, float len, float bend) {
  float k = 6.2832 / len;
  float w = k * sqrt(9.81 / k + 0.000074 * k);
  return dir * cos(k * dot(dir, q) - w * uTime + bend);
}

void main() {
  vec3 p = vWorld;
  vec3 toEye = cameraPosition - p;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 f = fieldAt(p.xz);
  vec4 fine = texture2D(tGrain, p.xz / 1.9);
  // The same shore the land paints: one line for both.
  float s = f.r + (fine.r - 0.5) * 0.1;
  // The surface is laid over the whole shelf, to where the bank comes up through the level: the bank itself cuts the waterline.
  if (s > 0.3) discard;
  // How wide a pixel lies on the brine, metres: what is finer than that is not drawn as a wave, it is left to the sheen.
  float px = max(length(dFdx(p.xz)), length(dFdy(p.xz)));
  float pool = length(p.xz);
  float inPool = smoothstep(${(POOL_R + 2.5).toFixed(1)}, ${(POOL_R - 0.5).toFixed(1)}, pool);

  // Which way the bank lies (toward the land), and so which way the channel runs.
  vec2 bank = vec2(0.0, 1.0);
  vec2 flow = vec2(0.0);
  float nearBy = smoothstep(90.0, 50.0, dist);
  if (nearBy > 0.0) {
    vec2 g = vec2(fieldAt(p.xz + vec2(0.7, 0.0)).r - fieldAt(p.xz - vec2(0.7, 0.0)).r, fieldAt(p.xz + vec2(0.0, 0.7)).r - fieldAt(p.xz - vec2(0.0, 0.7)).r);
    float gl = length(g);
    bank = gl > 1e-4 ? g / gl : bank;
    // The brine drains down the basin, toward the first lens: along the channel where the banks are near, straight down it in the middle.
    vec2 down = ${v2([-F[0], -F[1]])};
    vec2 run = vec2(-bank.y, bank.x);
    run *= clamp(dot(run, down) * 3.0, -1.0, 1.0);
    vec2 dir = normalize(mix(down, run, 0.75 * smoothstep(0.0, 0.5, gl)) + vec2(1e-4));
    // Fastest over the deep middle, still at the bank, and none in the round pool, which has no way through.
    flow = dir * (0.03 + 0.15 * smoothstep(-0.1, -1.6, s)) * (1.0 - inPool) * nearBy;
  }
  // What the flow carries is looked up where it came from: twice, half a turn apart, each fading out as the other fades in, so that the
  // carried pattern never snaps back. No two places turn over together.
  vec4 patchy = texture2D(tGrain, p.xz / 37.0);
  float turn = uTime / 9.0 + patchy.g * 2.0;
  float pa = fract(turn);
  float pb = fract(turn + 0.5);
  float wa = 1.0 - abs(2.0 * pa - 1.0);
  vec2 qa = p.xz - flow * 9.0 * (pa - 0.5);
  vec2 qb = p.xz - flow * 9.0 * (pb - 0.5) + vec2(3.7, 1.9);
  vec4 ca = texture2D(tGrain, qa / 7.3);
  vec4 cb = texture2D(tGrain, qb / 7.3);
  vec4 fa = texture2D(tGrain, qa / 1.7);
  vec4 fb = texture2D(tGrain, qb / 1.7);
  vec4 carried = mix(cb, ca, wa);
  vec4 carriedFine = mix(fb, fa, wa);
  brineSilt = clamp(carried.r * 0.7 + carriedFine.g * 0.3 + 0.25 * (carried.b - 0.5), 0.0, 1.0);

  // There is no wind to speak of: the brine lies near to glass, and what moves on it has a cause.
  // A slow heave of the whole surface, too low to see but in what it mirrors.
  vec2 slope = (texture2D(tGrain, p.xz / 5.3 + vec2(0.013, 0.008) * uTime).ba - 0.5) * 0.035 + (texture2D(tGrain, p.xz / 2.3 - vec2(0.011, 0.017) * uTime).ba - 0.5) * 0.025;
  // The flow dimples the skin where it runs: low boils and seams that go down the channel with it.
  slope += (carriedFine.ba - 0.5) * 0.09 * smoothstep(0.02, 0.12, length(flow)) * smoothstep(0.5, 0.1, px);
  // Where the big ones wade the brine is churned: dark with mud and never still.
  brineMud = 1.0 - smoothstep(5.0, 11.0, length(p.xz - uWade));
  brineSlurry = 1.0 - smoothstep(1.8, 4.2, length(p.xz - vec2(${STUCK_AT[0].toFixed(3)}, ${STUCK_AT[1].toFixed(3)})));
  // A light air crosses in lanes (cat's paws): under one the skin is drawn into wavelets a hand long, five trains of them at five lengths,
  // each bent by what is under it. Between the lanes it is glass. Over the seep pool the gas keeps it troubled.
  vec2 wdir = ${v2(WIND_N)};
  vec2 lane = vec2(dot(p.xz, wdir) - 1.6 * uTime, dot(p.xz, vec2(-wdir.y, wdir.x)));
  float paw = smoothstep(0.5, 0.74, texture2D(tGrain, vec2(lane.x / 41.0, lane.y / 11.0) + patchy.rb * 0.06).g);
  float ruffle = 0.04 + 0.5 * paw + 0.12 * inPool + 0.8 * brineMud;
  vec4 bend = texture2D(tGrain, p.xz / 0.83 + vec2(0.01, 0.007) * uTime);
  vec2 ripples = vec2(0.0);
  ripples += train(p.xz, normalize(wdir + vec2(-wdir.y, wdir.x) * 0.31), 0.41, bend.r * 4.0) * 0.05 * smoothstep(0.2, 0.07, px);
  ripples += train(p.xz, normalize(wdir - vec2(-wdir.y, wdir.x) * 0.47), 0.27, bend.g * 5.0) * 0.055 * smoothstep(0.13, 0.045, px);
  ripples += train(p.xz, normalize(wdir + vec2(-wdir.y, wdir.x) * 0.83), 0.173, bend.b * 5.0) * 0.05 * smoothstep(0.085, 0.03, px);
  ripples += train(p.xz, normalize(wdir - vec2(-wdir.y, wdir.x) * 1.3), 0.117, bend.a * 6.0) * 0.045 * smoothstep(0.058, 0.02, px);
  ripples += train(p.xz, normalize(wdir + vec2(-wdir.y, wdir.x) * 2.4), 0.071, bend.r * 7.0 + 1.3) * 0.035 * smoothstep(0.035, 0.012, px);
  slope += ripples * ruffle * (0.6 + 0.8 * bend.g);

  // How much froth the domes and the bursts have left here.
  float boil = 0.0;
  if (pool < 16.0) {
    // Each seep sends out ring after ring: half a stride from crest to crest, 0.7 m a second, dying with the way they have come.
    for (int i = 0; i < ${MAX_SEEPS}; i++) {
      vec4 seep = uSeeps[i];
      vec2 d = p.xz - seep.xy;
      float r = length(d);
      float beat = 0.6 + 0.4 * sin(uTime * 0.9 + seep.z * 17.0);
      slope += d / max(r, 0.03) * cos(r * 15.0 - uTime * 10.5 + seep.z * 40.0 + (bend.r - 0.5) * 1.2) * seep.w * beat * smoothstep(0.05, 0.35, r) / (1.0 + 0.55 * r * r);
    }
    for (int i = 0; i < ${MAX_RINGS}; i++) {
      if (i >= uRingCount) break;
      vec4 ring = uRings[i];
      vec2 d = p.xz - ring.xy;
      float r = length(d);
      float q = r - ring.z;
      float wide = 0.16 + 0.05 * ring.z;
      float env = exp(-q * q / (wide * wide)) * ring.w;
      if (env < 0.003) continue;
      slope += d / max(r, 0.01) * env * sin(q * 14.0) * 0.3;
      boil = max(boil, env * smoothstep(1.5, 0.25, ring.z));
    }
  }
  // Whatever stands in the brine (the contact map has it) troubles it: the wavelets are steeper round it.
  float stood = contactDrawn(p);
  float ringed = smoothstep(0.0, 0.12, stood) * smoothstep(0.85, 0.35, stood);
  slope *= 1.0 + 1.3 * ringed;
  // The meniscus: in the last two fingers before the bank the brine climbs it, and that lip looks the other way from the rest of the surface.
  float lipAt = smoothstep(0.17, 0.26, s) * smoothstep(40.0, 12.0, dist);
  slope -= bank * 0.55 * lipAt * lipAt;

  // Scum: froth gathers against the bank where the bank holds it, in clumps and strings, never a band. It is the froth's own picture and
  // relief: the tallest bubbles show first, and more of them where more gathers.
  vec4 raft = texture2D(tGrain, p.xz / 6.1);
  vec4 fleck = texture2D(tGrain, p.xz / 0.57);
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
  float strings = smoothstep(0.71, 0.8, carriedFine.r * 0.55 + carried.g * 0.45) * smoothstep(0.03, 0.1, length(flow)) * 0.55;
  want = max(max(want, strings), min(boil * 0.8, 0.6)) * seen;
  vec2 fuv = (p.xz - flow * 9.0 * (pa - 0.5) * step(want, strings * seen + 1e-4)) / 1.5;
  vec4 relief = texture2D(tFrothN, fuv);
  vec3 scum = texture2D(tFroth, fuv).rgb;
  float foam = smoothstep(0.0, 0.16, relief.b - 1.0 + want * 0.8) * step(1e-3, want);
  vec4 froth = vec4((scum * 2.3 + 0.07) * vec3(0.92, 0.74, 0.7), foam * 0.92);
  // The bubbles stand up out of the surface: their own slopes take over from the brine's.
  slope = mix(slope, (relief.rg - 0.5) * vec2(1.0, -1.0) * 1.6, foam);
  vec3 n = normalize(vec3(slope.x, 1.0, slope.y));

  // The bed under the shallows, seen where the line of sight is bent down to it.
  float depth = clamp(max(-s * 0.5 - 0.02, 0.03 * (1.0 - smoothstep(0.12, 0.27, s))), 0.0, 0.7);
  vec2 bedAt = p.xz - v.xz / max(v.y, 0.3) * depth * 0.75 + slope * depth * 3.0;
  vec3 bedTex = texture2D(tBed, bedAt / 2.6).rgb;
  // (Salt has come out of the brine on the shelf: paler in the last hand before the bank.)
  brineBed = bedTex * (0.42 + 0.4 * smoothstep(-0.3, 0.1, s) * fleck.b);
  vec3 lit = brineShade(p, n, v, s, froth);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;

/** The brine's cut along the shore, for the depth the engine lays down first. */
export const BRINE_DEPTH = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform sampler2D tGrain;
${FIELD_GLSL}
void main() {
  float s = fieldAt(vWorld.xz).r + (texture2D(tGrain, vWorld.xz / 1.9).r - 0.5) * 0.1;
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
  vec3 q = vec3(position.x * (1.0 + 0.12 * skirt * skirt) * bulge, position.y * sag, position.z * (1.0 + 0.12 * skirt * skirt) * bulge);
  vec4 w = modelMatrix * instanceMatrix * vec4(q, 1.0);
  vWorld = w.xyz;
  vLocal = position;
  vLife = aLife;
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normalize(normal + vec3(0.0, 1.6 * skirt * skirt, 0.0)));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const DOME_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vLife;
uniform sampler2D tGrain;
${RIG_GLSL}

void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, v) < 0.0) n = -n;
  // The skin drains from the crown toward the foot: thin and clear on top, thick and dark where it meets the pool. Through the thin top the
  // far wall of the dome shows, paler; across it lies the sky, as on any wet bubble.
  float top = smoothstep(0.1, 1.0, vLocal.y);
  vec4 g = texture2D(tGrain, vLocal.xz * 0.9 + vLife.y);
  vec4 run = texture2D(tGrain, vec2(atan(vLocal.z, vLocal.x) * 0.9 + vLife.y, vLocal.y * 0.35));
  // (The skin drains in runs down its sides: thick dark streaks between thinner panes.)
  float thin = clamp(top * (0.35 + 0.65 * vLife.x) + (g.r - 0.5) * 0.45 + (run.r - 0.5) * 0.5 * (1.0 - top), 0.0, 1.0);
  // The skin is a clear film of thick liquid: what is behind it shows through it, stained. It is thick and dark only where it is seen
  // edge on and where it meets the pool.
  // (Cloudy: the brine in the film is milky where it is stretched, and red runs stand in it where it drains.)
  vec3 albedo = mix(vec3(0.075, 0.011, 0.009), vec3(0.25, 0.08, 0.066), thin * (0.55 + 0.45 * smoothstep(0.35, 0.65, g.g)));
  albedo = mix(albedo, vec3(0.09, 0.013, 0.01), smoothstep(0.52, 0.72, run.r) * (1.0 - 0.6 * top) * 0.8);
  vec4 grit = texture2D(tGrain, vLocal.xz * 3.3 + vLife.y * 7.0);
  float solid = 0.0;
  // Torn: the skin opens from one point on its side, the hole's edge ragged and rolled thick, until nothing of it stands.
  float rim = 0.0;
  if (vLife.w > 0.0) {
    vec3 from = normalize(vec3(cos(vLife.y * 40.0) * 0.6, 0.75, sin(vLife.y * 40.0) * 0.6));
    float open = dot(normalize(vLocal), from) + (g.g - 0.5) * 0.22 + (grit.r - 0.5) * 0.08;
    float gone = 1.0 - 2.0 * vLife.w * (0.55 + 0.45 * vLife.w);
    if (open > gone) discard;
    rim = smoothstep(gone - 0.1, gone, open);
    albedo = mix(albedo, vec3(0.03, 0.006, 0.005), rim);
  }
  n = normalize(n + vec3(g.b - 0.5, 0.0, g.a - 0.5) * 0.03);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  float open = skyOpen(vWorld);
  // A film of a clear red liquid over gas. Light crosses it once on the way to the lens: the longer its way through the film (a thick
  // place, or the film seen along itself at the dome's edge), the more is taken, the green and the blue first.
  float thick = (1.0 - thin) * 0.75 + 0.5 * smoothstep(0.25, 0.02, vLocal.y) + 0.1;
  float way = thick / max(nv, 0.22);
  vec3 through = exp(-vec3(0.55, 2.6, 3.0) * way);
#ifdef DROP
  through = vec3(0.0);
#endif
  float kept = dot(through, vec3(0.333));
  // What the film itself gives back: the brine's own red where it is thick, a pale milk where it is stretched over the gas.
  vec3 lit = albedo * skyIrradiance(n) * (open / 3.14159) * (1.0 - kept);
  // The gas under it is steam: a white veil, most through the middle of the dome.
  float veil = 0.11 * sqrt(nv) * (0.4 + 0.6 * top) * kept;
  lit += vec3(0.9, 0.84, 0.82) * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (open / 3.14159) * veil;
  // What the wet skin mirrors, by Fresnel's law for both its faces: the sky above the mirrored horizon, the stand and the flats in a
  // pale band along it, the dark pool under it. That band and the dark under it are what make a bubble read as glass and not as a ball.
  vec3 pond = vec3(0.05, 0.012, 0.01) * skyIrradiance(vec3(0.0, 1.0, 0.0)) / 3.14159 + skyRadiance(vec3(r.x, abs(r.y) + 0.05, r.z)) * 0.1;
  float horizon = r.y + (run.g - 0.5) * 0.06;
  vec3 env = mix(pond, skyRadiance(normalize(vec3(r.x, max(r.y, 0.0) + 0.02, r.z))), smoothstep(-0.03, 0.035, horizon));
  env = mix(env, uSkyGround * 0.75, smoothstep(0.09, 0.0, abs(horizon - 0.02)) * 0.55);
  // The overcast is not even: its brighter quarter stands in the skin as one soft window, cut by the runs.
  float toward = max(dot(r, normalize(vec3(-0.35, 0.8, 0.3))), 0.0);
  env *= 1.0 + (0.5 * smoothstep(0.75, 0.99, toward) + 0.5 * smoothstep(0.972, 0.995, toward)) * (0.6 + 0.8 * run.g);
  float fres = min(1.0, (0.035 + 0.965 * pow(1.0 - nv, 5.0)) * 1.7);
  vec3 mirrored = env * fres * mix(1.0, open, 0.5) * (1.0 - 0.7 * rim);
  // Grit and scum ride on the skin and slide down it with the runs.
  float speck = smoothstep(0.74, 0.8, grit.g * 0.6 + run.b * 0.4) * (1.0 - 0.6 * top);
  lit = mix(lit, vec3(0.05, 0.016, 0.012) * skyIrradiance(n) * (open / 3.14159), speck);
  float cover = clamp(1.0 - kept * (1.0 - fres) * (1.0 - veil * 2.0), 0.0, 1.0);
  cover = max(max(cover, rim), speck);
  gl_FragColor = vec4((lit + mirrored) * (1.0 - uSolo), cover);
}`;

// The crown: the torn skin of a dome, thrown up and outward as a ragged sheet. A unit tube (radius 1, y 0 to 1); aLife.x is its age in seconds,
// aLife.y its own number, aLife.z the dome's size in metres.
export const CROWN_VERTEX = /* glsl */ `
attribute vec4 aLife;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vLife;
void main() {
  float age = aLife.x;
  float size = aLife.z;
  float a = atan(position.z, position.x);
  float k = aLife.y * 6.283;
  // No two tongues of it alike: a few tall, most low, and none evenly spaced.
  float f = 0.4 + 0.15 * sin(a * 3.0 + k * 9.0) + 0.13 * sin(a * 5.0 - k * 4.0) * sin(a + k) + 0.26 * pow(abs(sin(a * 6.5 + k * 3.0)), 3.0) * (0.55 + 0.45 * sin(a * 2.0 - k)) + 0.2 * pow(abs(sin(a * 11.5 + k * 7.0)), 4.0) * (0.5 + 0.5 * sin(a * 3.0 + k * 2.0));
  float finger = pow(clamp(f, 0.14, 1.0), 1.4);
  float h = position.y;
  // The sheet leaves the rim at near 5 m/s and leans outward as it climbs. It is a film: its own tension, not its weight, stops it within
  // an eighth of a second and pulls it back, torn.
  float up = sqrt(size / 0.4) * (4.6 * age - 18.0 * age * age) * (0.34 + 0.66 * finger);
  float out_ = size * (0.85 + (2.6 + 3.0 * finger) * age * (0.45 + 0.55 * h));
  float wob = 1.0 + 0.08 * sin(a * 7.0 + k * 5.0) + 0.05 * sin(a * 13.0 - k * 2.0);
  vec3 q = vec3(position.x * out_ * wob, max(up, 0.0) * h, position.z * out_ * wob);
  vec4 w = modelMatrix * instanceMatrix * vec4(q, 1.0);
  vWorld = w.xyz;
  vLocal = vec3(a, h, finger);
  vLife = aLife;
  vNormal = normalize(vec3(position.x, 0.2 + 0.9 * h, position.z));
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
  // The top of the sheet is torn into tongues, and holes open in it as it stretches.
  vec4 g = texture2D(tGrain, vec2(vLocal.x * 0.6 + vLife.y, vLocal.y * 0.7));
  float tip = 0.35 + 0.65 * vLocal.z;
  float torn = vLocal.y - tip + (g.r - 0.5) * 0.45 + vLife.x * 2.4 * g.g;
  if (torn > 0.0 || vLife.x <= 0.0) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 radial = normalize(vNormal);
  if (dot(radial, v) < 0.0) radial = -radial;
  // The same thick liquid as the dome's skin, thrown: a film where it is stretched, a rolled lip where it ends (surface tension gathers
  // the edge into a bead that looks up at the sky), dark and solid at the foot where it is still the pool.
  float lip = smoothstep(-0.22, 0.0, torn);
  float thick = clamp(1.0 - vLocal.y / tip, 0.0, 1.0);
  vec3 n = normalize(mix(radial, vec3(0.0, 1.0, 0.0), 0.45 * lip * lip) + vec3(g.b - 0.5, 0.0, g.a - 0.5) * 0.14);
  vec3 albedo = mix(vec3(0.14, 0.028, 0.022), vec3(0.06, 0.009, 0.007), max(thick * 0.8, lip * 0.7));
  vec3 lit = albedo * skyIrradiance(n) * (skyOpen(vWorld) / 3.14159);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  float toward = max(dot(r, normalize(vec3(-0.35, 0.8, 0.3))), 0.0);
  float window = 0.3 * smoothstep(0.99, 0.998, toward) * lip + 0.03 * pow(toward, 30.0);
  vec3 mirrored = skyRadiance(r) * vec3(1.0, 0.6, 0.54) * (0.02 + 0.1 * pow(1.0 - nv, 4.0) + 0.5 * window);
  float cover = clamp(0.86 + 0.2 * thick + 0.3 * lip + 0.2 * pow(1.0 - nv, 2.0) + (g.g - 0.5) * 0.2, 0.0, 0.98);
  gl_FragColor = vec4((lit * cover + mirrored) * (1.0 - uSolo), cover);
}`;
