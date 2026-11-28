// The dome: the sky of the Spine at dusk. The clear dusk is reckoned (skyClear), thin sheets of stratus lie high on the lee, and the storm is a
// body of cloud marched in its own pass (storm.ts) and laid over both. Only the long lens of the strike keeps a picture (mat/strikesky), which
// flows: it is drawn twice, carried a little way along a field of slow eddies and faded from one copy to the next.
import * as THREE from 'three';
import { DUSK, WIND } from '../shared/anchors';
import type { Context } from '../shared/context';
import { RIG_GLSL } from '../shared/glsl';
import { STORM_SHAPE_GLSL } from './storm';

// The whole sky's picture (mat/skypano): where it starts and how much it spans, round the horizon and up, radians.
const PANO_FROM = [(-70 * Math.PI) / 180, (-4 * Math.PI) / 180] as const;
const PANO_SPAN = [(120 * Math.PI) / 180, (48 * Math.PI) / 180] as const;

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = p.xyww;
}`;

/** The dome's cloud, for the dome and for whatever has to fade into it (the air pass): radiance toward d. */
export const SKY_GLSL = /* glsl */ `
// Staged by shot: x turns the storm wall round the horizon, radians; y opens the lens; z is the size of the bloom about a stroke, as a share of
// the lights' own radii (0 for the whole of them); w lays the pictures so many times smaller for a long lens (0 for their own size).
uniform vec4 uSkyStage;
// Staged by shot: the sky of the strike as one picture behind the long lens (mat/strikesky). x is the heading of its lit cloud, y the height of
// its horizon, both radians; z is how many radians its width takes; w is 1 while it stands.
uniform sampler2D tStrikeSky;
uniform vec4 uPlate;
${STORM_SHAPE_GLSL}
const float STORM_AZ = ${Math.atan2(-WIND[2], -WIND[0]).toFixed(4)};
const float DUSK_AZ = ${Math.atan2(DUSK[2], DUSK[0]).toFixed(4)};
// How bright the pictures stand in the scene: the lens is set for the dusk.
const float SKY_GAIN = 0.28;

float wrapPi(float a) {
  return a - 6.28318 * floor((a + 3.14159) / 6.28318);
}
float mirrored(float u) {
  return 1.0 - abs(1.0 - mod(u, 2.0));
}
// The whole sky as one picture (mat/skypano): 120 degrees round the horizon from 70 on the storm's side of the ridge's line to 50 on the
// lee, from 4 under the level to 44 over it. It drifts with the gale, toward the lee. Its flow (mat/skyflow) is how each place of it turns.
uniform sampler2D tSkyPano;
uniform sampler2D tSkyFlow;
const vec2 PANO_FROM = vec2(${PANO_FROM[0].toFixed(5)}, ${PANO_FROM[1].toFixed(5)});
const vec2 PANO_SPAN = vec2(${PANO_SPAN[0].toFixed(5)}, ${PANO_SPAN[1].toFixed(5)});
const float PANO_DOT = ${(PANO_SPAN[0] / 4096).toFixed(7)};
const float PANO_DRIFT = 0.009;
const float FLOW_RATE = 0.014;
const float FLOW_PERIOD = 6.5;
const float SCUD_OVER = 650.0;
vec2 panoUv(float az, float el) {
  // The cloud travels at layered speeds: what stands low and far hardly moves, what hangs high over the ridge goes with the gale.
  return (vec2(wrapPi(az) - uSkyStage.x - PANO_DRIFT * (uTime - 12.0) * mix(0.3, 1.3, smoothstep(0.0, 0.5, el)), el) - PANO_FROM) / PANO_SPAN;
}
vec3 panoRead(vec2 uv, float lod) {
  return textureLod(tSkyPano, vec2(mirrored(uv.x), clamp(uv.y, 0.004, 0.996)), lod).rgb;
}
// The picture as the storm stands between strokes: what glows violet in it is the cloud lit from inside, which is dark until a light
// reaches it; what is orange in it is the last light, and stands only toward the last light.
vec3 panoAtRest(vec3 c, float toLast, float el, float lit) {
  // The storm is slate and violet, never green: where the flow's fade has left more green than the picture has, it is taken back.
  c.g = min(c.g, 0.5 * (c.r + c.b));
  float body = dot(c, vec3(0.3, 0.5, 0.2));
  float warm = clamp((c.r - c.b) * 6.0, 0.0, 1.0);
  float glowing = clamp((0.5 * (c.r + c.b) - c.g) * 12.0 - 0.35, 0.0, 1.0) * (1.0 - warm);
  c = mix(c, body * vec3(0.88, 0.9, 1.14) * mix(1.0, 0.5, glowing), glowing * (1.0 - lit));
  c = mix(c, body * vec3(0.94, 0.9, 1.13), 0.3 * (1.0 - warm));
  c *= 1.0 + 0.8 * lit;
  c = mix(c, body * vec3(0.7, 0.84, 1.1), warm * max(max(1.0 - smoothstep(0.6, 0.9, toLast), 0.9 * smoothstep(0.012, 0.05, el)), 0.7));
  return c;
}
// A picture at uv, flowing: two copies half a period apart, each carried along the eddies from where it started.
vec3 flowing(sampler2D picture, vec2 uv, vec2 drift, float period, float lod) {
  // Read very soft (as the colour of haze), the picture's flow is under the size of what is read: one read, where it stands.
  if (lod > 3.5) return textureLod(picture, vec2(mirrored(uv.x), clamp(uv.y, 0.004, 0.996)), lod).rgb;
  // The band of the dusk and the far deck under it hold still and keep their layers, as light on a far horizon does. The cloud over them
  // is carried, each height at its own pace, the higher the faster.
  float lifted = smoothstep(0.4, 0.62, uv.y);
  if (lifted <= 0.0) return textureLod(picture, vec2(mirrored(uv.x), clamp(uv.y, 0.004, 0.996)), lod).rgb;
  vec2 eddy = textureLod(tNoise, vec3(uv * vec2(1.3, 0.9), 0.31), 0.0).rg - 0.5 + 0.5 * (textureLod(tNoise, vec3(uv * vec2(3.7, 2.9) + 0.4, 0.67), 0.0).ba - 0.5);
  vec2 flow = (drift * (0.45 + 1.1 * smoothstep(0.5, 1.0, uv.y)) + 0.035 * eddy) * lifted;
  float a = fract(uTime / period);
  float b = fract(uTime / period + 0.5);
  vec2 ua = uv - flow * (a - 0.5);
  vec2 ub = uv - flow * (b - 0.5) ;
  vec3 ca = textureLod(picture, vec2(mirrored(ua.x), clamp(ua.y, 0.004, 0.996)), lod).rgb;
  vec3 cb = textureLod(picture, vec2(mirrored(ub.x), clamp(ub.y, 0.004, 0.996)), lod).rgb;
  return mix(ca, cb, abs(1.0 - 2.0 * a));
}
// How much the cloud toward d is lit from inside: each round light of the rig as the lens sees it, and the rig's flash on the storm side.
float cloudLit(vec3 from, vec3 d) {
  float lit = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 q = uEmitters[i].xyz - from;
    float along = dot(d, q);
    if (along <= 0.0) continue;
    float r = uEmitters[i].w * (uEmitters[i].w > 20.0 && uSkyStage.z > 0.0 ? uSkyStage.z : 1.0);
    // By metres, not by angle: how far the ray passes from the light, in the light's own radii. A long lens and a wide one see the same bloom.
    float off = sqrt(max(dot(q, q) - along * along, 0.0)) / r;
    float power = dot(uEmitterRadiance[i], vec3(0.3, 0.5, 0.2)) * uEmitters[i].w * uEmitters[i].w;
    float high = smoothstep(150.0, 900.0, uEmitters[i].y);
    // However strong the light is made, the cloud about it is lit to a bloom and no further: a core a radius wide, and a faint breadth of four.
    lit += (1.0 - exp(-power * (0.25 + 0.75 * high) / 8.0e6)) * (exp(-off * off * 1.4) + 0.2 * exp(-off / 2.2));
  }
  return lit;
}
// How much of the strike's sky stands toward d, and where on it.
float plateAt(float az, float el, out vec2 uv) {
  uv = vec2(0.43 + wrapPi(az - uPlate.x) / uPlate.z, 0.32 + (el - uPlate.y) / (uPlate.z * 0.5625));
  return uPlate.w * (1.0 - smoothstep(0.44, 0.5, abs(uv.x - 0.5))) * (1.0 - smoothstep(0.44, 0.5, abs(uv.y - 0.5)));
}
// The strike's sky: storm cloud lit from inside about the stroke, the last band low on the lee, the sea of cloud under it. The picture is of
// the lit moment; between strokes its glow sinks to embers that flicker, and each stroke brings it up whole.
vec3 plateCloud(vec2 uv, float lod) {
  vec3 c = flowing(tStrikeSky, uv, vec2(0.02, 0.0), 22.0, lod);
  float m = dot(c, vec3(0.3, 0.5, 0.2));
  float warm = clamp((c.r - c.b) * 6.0, 0.0, 1.0);
  float glowing = smoothstep(0.1, 0.45, m) * (1.0 - warm);
  float ember = 0.22 + 0.5 * pow(textureLod(tNoise, vec3(uTime * 0.21, 0.37, 0.61), 0.0).r, 3.0) + 0.4 * pow(textureLod(tNoise, vec3(uTime * 0.83, 0.71, 0.13), 0.0).g, 4.0);
  float lit = clamp(ember + 1.5 * dot(uFlash, vec3(0.33)), 0.0, 1.0);
  return c * mix(mix(1.0, 0.3, glowing), 1.0 + 0.2 * glowing, lit) * SKY_GAIN * 1.0;
}
// Stratus: thin sheets high on the lee, beyond the storm's shelf, long across the gale. Toward the last light they are seen edge on, dark
// bars with the band on their bellies.
vec3 stratus(vec3 c, vec3 from, vec3 d) {
  if (d.y < 0.004) return c;
  float toDusk = 0.5 + 0.5 * dot(d.xz, LAST_LIGHT) * inversesqrt(max(dot(d.xz, d.xz), 1e-6));
  for (int i = 0; i < 2; i++) {
    float high = i == 0 ? 6.8 : 4.3;
    float t = (high - from.y * 0.001) / d.y;
    if (t > 150.0) continue;
    vec2 p = from.xz * 0.001 + d.xz * t;
    float along = dot(p, LAST_LIGHT);
    if (along < 12.0) continue;
    float across = p.x * LAST_LIGHT.y - p.y * LAST_LIGHT.x;
    vec3 uv = vec3(along / 13.0 - 0.0026 * uTime, across / 37.0, 0.37 + 0.31 * float(i) + 0.0005 * uTime);
    float n = 0.65 * textureLod(tNoise, uv, 0.0).g + 0.35 * textureLod(tNoise, uv * vec3(2.7, 2.3, 1.0) + 0.31, 0.0).a;
    float cover = smoothstep(0.52, 0.74, n) * smoothstep(12.0, 18.0, along) * (1.0 - smoothstep(32.0, 75.0, t));
    if (cover <= 0.0) continue;
    float air = exp(-t * 0.022);
    vec3 body = mix(skyClear(vec3(d.x, 0.03, d.z)) * 0.6, vec3(0.018, 0.022, 0.038), air);
    body += vec3(0.07, 0.026, 0.008) * pow(toDusk, 6.0) * exp(-d.y / 0.07) * (1.0 - smoothstep(0.55, 0.85, n));
    c = mix(c, body, 0.88 * cover);
  }
  return c;
}
// On the storm's side the snow it drops and the sea's own vapour stand low as a pale mist, in banks that the gale carries: the foot of the
// storm wall goes into it, and so does the far end of the sea under it.
float mistHeads(float az, float el) {
  return 0.52 * textureLod(tNoise, vec3(az * 2.6 - uTime * 0.007, el * 5.5 + 0.3, 0.41), 0.0).r
    + 0.3 * textureLod(tNoise, vec3(az * 6.5 - uTime * 0.012, el * 13.0 + 0.7, 0.17), 0.0).r
    + 0.18 * textureLod(tNoise, vec3(az * 15.0 - uTime * 0.02, el * 30.0 + 0.2, 0.59), 0.0).b;
}
vec3 stormMist(vec3 c, vec3 d, float el, bool fine) {
  float toStorm = -dot(d.xz, GALE) * inversesqrt(max(dot(d.xz, d.xz), 1e-6));
  float side = smoothstep(0.05, 0.75, toStorm);
  if (side <= 0.0) return c;
  float az = atan(d.z, d.x);
  float banks = textureLod(tNoise, vec3(az * 0.7 - uTime * 0.004, el * 2.2, 0.83), 0.0).r;
  // It stands in heads, not as a wall: each bank has a top that the gale tears, pale where it rises and dark at its foot, where the far
  // sea goes into it.
  // (Read soft, as the colour of the air, it has none of its fine.)
  float raw = fine ? mistHeads(az, el) : textureLod(tNoise, vec3(az * 2.6 - uTime * 0.007, el * 5.5 + 0.3, 0.41), 0.0).r;
  float heads = smoothstep(0.3, 0.7, raw);
  // Lit from over it by the sky: a head is pale on its top, where it thins upward, and dark under its overhang.
  float crown = fine ? clamp(0.5 + 6.0 * (raw - mistHeads(az, el + 0.014)), 0.0, 1.0) : 0.5;
  float top = 0.03 + 0.1 * banks + 0.1 * heads;
  float body = 1.0 - smoothstep(0.55 * top, 1.2 * top, max(el, 0.0) + 0.05 * (heads - 0.5));
  float mist = side * mix(exp(-max(el, 0.0) / (0.06 + 0.1 * banks)), body, 0.8) * (0.45 + 0.5 * banks);
  vec3 pale = vec3(0.19, 0.2, 0.25) * mix(0.74, 1.12, smoothstep(0.0, 0.8 * top, max(el, 0.0) + 0.02 * (heads - 0.5))) * (0.5 + 0.95 * heads * smoothstep(0.004, 0.03, el)) * mix(0.72, 1.3, crown);
  return mix(c, pale, 0.75 * mist);
}
// The storm with none of its billows, for what fades into the sky: its dark where it stands, and the rig's lights on it.
const float FOOT_AIR = 0.8;
vec3 skyBroad(vec3 from, vec3 d) {
  // The band of the dusk is a line on the horizon and the dome's alone: air, snow and the far sea take the cold sky over it, never its orange.
  // At its very foot it is thinner and darker: the far sea goes into it there, and the sea's lit tops keep their shape against it.
  // (Not on the storm's side: there the mist of the fall is the foot, and is one tone over the horizon and under it.)
  float low = mix(FOOT_AIR, 1.0, max(smoothstep(0.0, 0.07, d.y), smoothstep(0.05, 0.75, -dot(d.xz, GALE) * inversesqrt(max(dot(d.xz, d.xz), 1e-6)))));
  float toLast = 0.5 + 0.5 * dot(d.xz, LAST_LIGHT) * inversesqrt(max(dot(d.xz, d.xz), 1e-6));
  float el = asin(clamp(max(d.y, 0.07), -1.0, 1.0));
  float lit = clamp(cloudLit(from, d) + 0.12 * min(dot(uFlash, vec3(0.33)), 1.0) * (1.0 - smoothstep(0.7, 0.95, toLast)), 0.0, 1.0);
  // The whole sky's picture read very soft, cold: the storm's dark where it stands and the dusk where it is clear.
  vec3 c = panoAtRest(panoRead(panoUv(atan(d.z, d.x), max(el, 0.1)), 6.5), 0.0, el, lit);
  c = dot(c, vec3(0.3, 0.5, 0.2)) * vec3(0.8, 0.92, 1.16);
  c = stormMist(c, d, asin(clamp(d.y, -1.0, 1.0)), false);
  c = mix(c, vec3(0.022, 0.022, 0.03), smoothstep(0.6, 0.76, el));
  return c * (SKY_GAIN * low);
}
vec3 skyAtRest(vec3 from, vec3 d, float lod) {
  float el = asin(clamp(d.y, -1.0, 1.0));
  float az = atan(d.z, d.x);
  vec2 uvP = vec2(0.0);
  float plate = uPlate.w > 0.0 ? plateAt(az, el, uvP) : 0.0;
  if (plate >= 1.0) return plateCloud(uvP, lod);
  vec3 c = skyBroad(from, d) * (1.0 + uSkyStage.y);
  return plate > 0.0 ? mix(c, plateCloud(uvP, lod), plate) : c;
}
// How much of a stroke's light the cloud toward d holds: the channel is a line of light from the tip up into the cloud, and the cloud
// about it is lit through, by metres from the line as the lens sees it, far wider where the channel is inside the cloud.
float strikeReach(vec3 from, vec3 d) {
  float lit = 0.0;
  // A light shorter than any channel (one cloud lit from inside) lights as little cloud round itself as it is long.
  float breadth = clamp(length(uStrikeTop.xyz - uStrikeTip.xyz) / 420.0, 0.3, 1.0);
  float wide = smoothstep(0.7, 1.0, breadth) * mix(0.25, 1.0, smoothstep(1.4, 1.8, uSkyStage.y));
  for (int i = 0; i < 5; i++) {
    // From a little over the tip to well inside the cloud over the channel's top: the light is most where the channel is in the cloud.
    float f = 0.1 + 0.3 * float(i);
    vec3 q = mix(uStrikeTip.xyz, uStrikeTop.xyz, f) - from;
    float along = dot(d, q);
    if (along <= 0.0) continue;
    float r = mix(85.0, 360.0, clamp(f, 0.0, 1.0)) * breadth;
    float off2 = max(dot(q, q) - along * along, 0.0) / (r * r);
    // A peak at the channel and a breadth round it: never a disc with an edge.
    // And far round it the storm's whole wall takes a share: a stroke lights the cloud for a kilometre, not a patch of it.
    lit += (0.05 + 0.2 * f) * (0.8 / (1.0 + 3.0 * off2) + 0.2 / (1.0 + 0.7 * off2) * mix(0.5, 1.0, smoothstep(1.4, 1.8, uSkyStage.y)) + 0.14 * wide / (1.0 + 0.1 * off2));
  }
  return lit;
}
// The cloud in the flash of a stroke: what stands round the channel is lit from inside, its pale bodies far more than its dark ones and
// in uneven masses, so that the cloud's own shapes stand in the light; the last band keeps its orange.
vec3 strikeCloud(vec3 c, vec3 from, vec3 d) {
  float masses = textureLod(tNoise, d * 1.7 + vec3(0.13, 0.41, 0.77), 0.0).r + 0.5 * textureLod(tNoise, d * 4.3 + vec3(0.61, 0.07, 0.29), 0.0).g;
  float lit = uStrikeTop.w * strikeReach(from, d) * smoothstep(-0.03, 0.05, d.y) * mix(0.22, 1.0, smoothstep(0.0, 0.06, d.y)) * (0.35 + 0.9 * masses);
  // Far from the channel the storm stays dark in a stroke: the light is about the bolt, and the land takes the flash, not the whole sky.
  // (Out of the canal's mouth the lit cloud is all the sky there is, and keeps its breadth.)
  lit = mix(lit * lit / (lit + 1.4), lit, smoothstep(1.4, 1.8, uSkyStage.y));
  float body = dot(c, vec3(0.3, 0.5, 0.2));
  float warm = clamp((c.r - c.b) * 30.0, 0.0, 1.0);
  float shape = smoothstep(0.025, 0.13, body);
  // Violet is the stroke's own, close round it; the storm it lights from afar goes pale grey violet, as the pictures have it.
  float core = smoothstep(0.22, 0.9, lit);
  return c * (1.0 + 3.0 * lit * (1.0 - 0.8 * warm) * mix(vec3(0.84, 0.8, 0.98), vec3(0.78, 0.5, 1.0), core)) + mix(vec3(0.78, 0.74, 0.98), vec3(0.62, 0.32, 1.0), core) * (lit * (0.012 + 0.11 * shape) * (1.0 - warm));
}
vec3 skyCloud(vec3 from, vec3 d, float lod) {
  vec3 c = skyAtRest(from, d, lod);
  if (uStrikeTop.w > 0.0) c = strikeCloud(c, from, d);
  return c;
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler3D;
varying vec3 vDir;
uniform highp sampler3D tNoise;
uniform sampler2D tStormWall;
uniform sampler2D tStorm;
uniform vec4 uStormFrame;
${RIG_GLSL}
${SKY_GLSL}

// Under the storm's base runs scud: torn cloud a few hundred metres over the lens, carried on the gale and changing as it goes. It is
// near: it crosses the storm behind it, and shifts against it as the lens moves. xyz its colour, w how much of the sky it hides.
vec4 scudOver(vec3 from, vec3 d, float toLast, float lit) {
  if (d.y <= 0.02) return vec4(0.0);
  float t = SCUD_OVER / d.y;
  vec2 p = (from.xz + d.xz * t - GALE * (48.0 * uTime)) / 2500.0;
  float far = smoothstep(9000.0, 3500.0, t);
  float lumps = textureLod(tNoise, vec3(p, 0.43 + 0.006 * uTime), 0.0).r;
  float ragged = textureLod(tNoise, vec3(p * 3.3 + 0.21, 0.17 + 0.011 * uTime), 0.0).b;
  float thick = smoothstep(0.53, 0.8, lumps + 0.26 * (ragged - 0.5) * smoothstep(6000.0, 2000.0, t));
  float cover = thick * far * smoothstep(0.02, 0.08, d.y) * (1.0 - smoothstep(0.72, 0.95, toLast));
  // Thin at its torn edge it is pale vapour; where it is thick it is darker than the storm behind it.
  vec3 c = mix(vec3(0.15, 0.155, 0.19), vec3(0.036, 0.04, 0.058), smoothstep(0.25, 1.0, thick)) * (1.0 + 2.0 * lit);
  return vec4(c, 0.85 * cover);
}

// The sky is one picture of the whole of it as the ridge's lenses see it (mat/skypano): the storm with its heads and its fall of snow on
// the gale's side, the clear dusk on the lee. It turns over: every place of it is carried along its own flow (mat/skyflow), out of the
// heads and round the masses, drawn twice half a period apart and faded from one copy to the next, each place at its own moment.
vec3 skyPainted(vec3 from, vec3 d, float foot) {
  float el = asin(clamp(d.y, -1.0, 1.0));
  float az = atan(d.z, d.x);
  vec2 uv = panoUv(az, el);
  float lod = max(log2(max(foot, 1e-6) / PANO_DOT), 0.0);
  vec3 f = textureLod(tSkyFlow, vec2(mirrored(uv.x), clamp(uv.y, 0.004, 0.996)), 0.0).rgb;
  // The band of the dusk holds still: low on the horizon nothing of the picture is carried, and its layers keep their own edges.
  vec2 carried = (f.rg - 0.5) * (2.0 * FLOW_RATE * FLOW_PERIOD) / PANO_SPAN * smoothstep(0.03, 0.13, el);
  float a = fract(uTime / FLOW_PERIOD + f.b);
  float b = fract(a + 0.5);
  float w = abs(1.0 - 2.0 * a);
  vec3 c = mix(panoRead(uv - carried * (a - 0.5), lod), panoRead(uv - carried * (b - 0.5), lod), w);
  // Two copies half faded are softer than one: the fine of the cloud is given back by as much as the fade took, where the cloud moves.
  vec3 soft = panoRead(uv, lod + 3.5);
  float moving = smoothstep(0.05, 0.4, 2.0 * length(f.rg - 0.5));
  c = max(soft + (c - soft) * mix(1.0, inversesqrt(w * w + (1.0 - w) * (1.0 - w)), moving), vec3(0.0));
  float nearAll = cloudLit(from, d);
  float near = nearAll * (1.0 - 0.7 * smoothstep(0.5, 0.9, 0.5 + 0.5 * dot(d.xz, LAST_LIGHT) * inversesqrt(max(dot(d.xz, d.xz), 1e-6))) * (1.0 - smoothstep(1.4, 1.8, uSkyStage.y)));
  // Lit through, the cloud about a bolt shows its large forms and none of its fine: light inside a cloud is soft.
  c = mix(c, soft, 0.8 * smoothstep(0.06, 0.45, near));
  float toLast = 0.5 + 0.5 * dot(d.xz, LAST_LIGHT) * inversesqrt(max(dot(d.xz, d.xz), 1e-6));
  // The whole storm takes a little of a strike; the bloom about the bolt is the light, and the rest of the storm stays dark.
  float lit = near * near / (near + 1.0) + 0.03 * min(dot(uFlash, vec3(0.33)), 1.0) * (1.0 - smoothstep(0.7, 0.95, toLast));
  // The cloud's heads stand out of its dark: a little more between them than the picture holds.
  c *= clamp(pow(max(dot(c, vec3(0.3, 0.5, 0.2)) / 0.078, 0.01), 0.3), 0.75, 1.4);
  c = panoAtRest(c, toLast, el, clamp(lit, 0.0, 1.0));
  vec4 scud = scudOver(from, d, toLast, clamp(lit, 0.0, 1.0));
  c = mix(c, scud.rgb, scud.a);
  c = stormMist(c, d, el, true);
  // About the bolt the cloud glows from inside, violet, most where it is thick and pale.
  c += mix(vec3(0.46, 0.45, 0.58), vec3(0.42, 0.33, 0.8), smoothstep(0.35, 1.3, near)) * clamp(near * near / (near + 1.0), 0.0, 3.0) * (0.03 + 1.3 * dot(c, vec3(0.33)));
  // Overhead the picture ends: the cloud closes over in its own dark.
  c = mix(c, vec3(0.022, 0.022, 0.03), smoothstep(0.6, 0.76, el));
  // Where the lens is opened (by the dead one, in the canal), the storm is opened less than the land: it stays a dark storm.
  // Out of the canal's mouth it is the light itself: there it is as open as the land, and the cloud lit from inside shows whole.
  float mouth = smoothstep(1.4, 1.8, uSkyStage.y);
  c *= SKY_GAIN * mix(vec3(1.0 / (1.0 + 0.37 * uSkyStage.y)), vec3(0.8, 0.72, 0.92), mouth);
  // In a stroke the cloud keeps its forms: its darks take less of the light than its pale heads. (Out of the mouth the lit cloud is the
  // light of the canal, and stands at more than its share.)
  // (Toward the last light the sky is clear of the storm, and there is little there for a stroke to light.)
  if (uStrikeTop.w > 0.0) c = mix(c, strikeCloud(c, from, d), mix(0.38 * (1.0 - 0.75 * smoothstep(0.5, 0.9, toLast)), 2.3, mouth));
  return c;
}

void main() {
  vec3 d = normalize(vDir);
  float foot = length(fwidth(d));
  float az = atan(d.z, d.x);
  float el = asin(clamp(d.y, -1.0, 1.0));
  vec2 uvQ = vec2(0.0);
  float plateOn = uPlate.w > 0.0 ? plateAt(az, el, uvQ) : 0.0;
  vec3 c = vec3(0.0);
  if (plateOn < 1.0) {
    c = stratus(skyClear(d), cameraPosition, d);
    if (uStormFrame.z > 0.5) {
      // The storm's pass is smaller than the frame: read over a little more than one of its own dots, so no stair shows on a thin lit edge.
      vec2 at = gl_FragCoord.xy * uStormFrame.xy;
      vec2 by = uStormFrame.xy * uStormFrame.w;
      vec4 storm = 0.4 * textureLod(tStorm, at, 0.0) + 0.15 * (textureLod(tStorm, at + by, 0.0) + textureLod(tStorm, at - by, 0.0) + textureLod(tStorm, at + vec2(by.x, -by.y), 0.0) + textureLod(tStorm, at + vec2(-by.x, by.y), 0.0));
      c = c * storm.a + storm.rgb;
    } else {
      c = skyPainted(cameraPosition, d, foot);
    }
    // Under the level the dome is what the air pass takes for the far end of the sea: the band of the dusk is a line on the sea's edge, and
    // nothing of it shows under that edge where the sea's own cloud ends.
    c *= 1.0 + uSkyStage.y;
    // (It is read as the sea reads it, flash and all: in a strike the sea's far end and the sky's foot light as one.)
    vec3 seaAir = skyCloud(cameraPosition, normalize(vec3(d.x, 0.0003, d.z)), 0.0);
    // Under the level the foot is the far sea's own last rows, pale cold cloud with a share of the sky's foot in it, and not the dark of
    // the cloud over the band: left as that dark it lay under the band as a ruled bar a degree deep, between the band and a pale sea.
    // (On the storm's side the sea goes into the wall's foot whole, and the foot stays the wall's.)
    float inFall = smoothstep(0.05, 0.75, -dot(d.xz, GALE) * inversesqrt(max(dot(d.xz, d.xz), 1e-6)));
    float sunk = smoothstep(0.0, -0.005, d.y);
    float banks = textureLod(tNoise, vec3(az * 3.1 + uTime * 0.0006, 0.31, 0.57), 0.0).g;
    vec3 lastRows = mix(vec3(0.124, 0.14, 0.227) * (0.72 + 0.3 * banks), seaAir, 0.42);
    seaAir = mix(seaAir, lastRows, sunk * (1.0 - inFall) * (1.0 - plateOn));
    c = mix(c, seaAir, sunk);
    // The sky's foot stands in the air the far sea stands in: the horizon is no ruled line between a pale sea and a dark storm, the one goes
    // into the other over a degree or two. Toward the last light the band keeps its line.
    float toLast = 0.5 + 0.5 * dot(d.xz, LAST_LIGHT) * inversesqrt(max(dot(d.xz, d.xz), 1e-6));
    // The far sea's tops are lumps, not a level: the air stands higher here and lower there along the horizon, and under the band it is low.
    float lumps = textureLod(tNoise, vec3(az * 3.1 + uTime * 0.0006, 0.31, 0.57), 0.0).g + 0.5 * textureLod(tNoise, vec3(az * 9.7 - uTime * 0.0011, 0.63, 0.19), 0.0).r;
    float tallAir = mix(0.02, 0.011, pow(toLast, 3.0)) * (0.2 + 1.2 * lumps);
    // On the storm's side the mist of its fall stands down to the sea and is the foot itself: no darker bar lies along the horizon there.
    c = mix(c, seaAir, 0.92 * exp(-max(d.y, 0.0) / tallAir) * (1.0 - 0.8 * smoothstep(0.55, 0.85, toLast)) * (1.0 - 0.9 * inFall));
    // The last band of orange: a thin bright line low on the horizon toward the last light, broken along its length by the far cloud that
    // stands before it, with a little of its glow in the air over it. It is the one warm thing in the frame, in a flash too.
    // It is short: a stretch of the horizon about the last light, not a ring round it.
    // Out of the canal the horizon lies under the far ridge: there the band stands a little higher and runs longer, so it is seen to
    // run on behind the ridge and is not a patch in the mouth's corner.
    float canal = smoothstep(1.4, 1.8, uSkyStage.y);
    float side = smoothstep(mix(0.84, 0.55, canal), 0.985, toLast);
    // No ruled stroke: it lies a little higher here and lower there, and far cloud before it cuts it into lengths.
    float lies = 0.0075 + 0.0045 * (lumps - 0.75) + 0.036 * canal;
    float line = exp(-pow((d.y - lies) / mix(0.0062, 0.0085, canal), 2.0)) + 0.2 * exp(-max(d.y, 0.0) / 0.035) * smoothstep(-0.004, 0.004, d.y);
    float cutBy = textureLod(tNoise, vec3(az * 3.7 + uTime * 0.0006, d.y * 52.0 + az * 1.3, 0.11), 0.0).b;
    float lengths = (0.08 + 1.1 * smoothstep(0.35, 1.0, lumps)) * (0.1 + 0.9 * smoothstep(0.4, 0.62, cutBy));
    // (Where the lens is opened for the dark, the band is opened with the sky.)
    float band = side * line * lengths * (1.0 - plateOn);
    // The line is the light itself, seen under the far cloud: the pale air it stands in gives way to it, so it is orange and not peach.
    c = c * (1.0 - 0.55 * min(band, 1.0)) + vec3(0.56, 0.235, 0.075) * band * (1.0 + 0.6 * uSkyStage.y);
  }
  if (plateOn > 0.0) {
    // The far sea's tops stand over the picture's level line: heads of cloud, here higher and there lower, that the gale carries along.
    float tops = 0.65 * textureLod(tNoise, vec3(uvQ.x * 2.3 - uTime * 0.004, 0.27, 0.55), 0.0).r
      + 0.35 * textureLod(tNoise, vec3(uvQ.x * 7.1 - uTime * 0.009, 0.63, 0.21), 0.0).r
      + 0.1 * textureLod(tNoise, vec3(uvQ.x * 19.0 - uTime * 0.016, 0.11, 0.83), 0.0).b;
    // Only the sea's own top is moved. Under it the deck is lifted with it, less the deeper; over it the sky stands where the picture
    // has it and gives way within a hair of the top. Moved a tenth of the picture up and down, every layer of the band took the sea's
    // wave and all their edges rippled as one.
    float lift = 0.048 * (tops - 0.38);
    // (The picture's sea ends at 0.281 of its height. The line was taken at 0.32, in the middle of the band.)
    float over = uvQ.y - 0.281 - lift;
    // (Over a raised top the sky is not drawn down to meet it: every row of the picture between its level and the top, the foot of the
    // band among them, then lay in a hair along the top as a red line. The top stands before the sky, and its edge is a pixel soft.)
    float seam = 0.0;
    if (over < 0.0) uvQ.y -= lift * exp(-over * over / 0.0036);
    else if (lift > 0.0) seam = 1.0 - smoothstep(0.0, 0.0008, over);
    else uvQ.y = max(uvQ.y, 0.281 + 0.003 * clamp(over / max(-lift, 1e-5), 0.0, 1.0));
    vec3 held = plateCloud(uvQ, 0.0);
    if (seam > 0.0) held = mix(held, plateCloud(vec2(uvQ.x, 0.281), 0.0), seam);
    // The picture's own sea, under its level, is the far end of the deck the air pass draws, and answers a stroke as that deck does.
    // Left dark while the deck went pale under it, it lay on the deck's last row as a dark bar with a ruled foot, the frame across.
    float sunkP = smoothstep(0.004, -0.012, over) * (1.0 + smoothstep(-0.008, -0.03, over));
    if (uStrikeTop.w > 0.0) held += STRIKE_COLOUR * vec3(0.86, 0.84, 1.0) * (min(uStrikeTop.w * 0.008, 0.05) * sunkP);
    // And it stands in the air the deck stands in: between strokes too the deck's last row is slate, and the picture's sea was black on it.
    held += vec3(0.005, 0.0068, 0.0125) * sunkP;
    // On the storm's side of the long lens stands the wall of falling snow: the fall of the whole sky's picture, seen large and soft, where
    // the strike's own picture is only dark.
    vec2 uvW = vec2(0.03 + 0.3 * uvQ.x + 0.0006 * uTime, 0.1 + 0.75 * (uvQ.y - 0.32));
    vec3 wall = panoAtRest(panoRead(uvW, 0.0), 0.0, el, 0.0) * (SKY_GAIN * 1.5);
    held = mix(held, max(held, wall), (1.0 - smoothstep(0.12, 0.62, uvQ.x)) * smoothstep(0.33, 0.52, uvQ.y + 0.07 * (tops - 0.55)));
    // The scud crosses the long lens too, large and soft: the sky behind the spire is weather that moves, not a picture hung there.
    vec4 scudP = scudOver(cameraPosition, d, 0.0, 0.0);
    held = mix(held, scudP.rgb * SKY_GAIN, 0.4 * scudP.a);
    held = strikeCloud(held, cameraPosition, d);
    // Through a long lens the picture is seen larger than it was made: the same cloud, four times smaller, gives it the detail it lacks
    // there, as much as the lens asks for.
    vec2 uvT = vec2(az, el) * 2.3 + vec2(uTime * 0.0012, 0.0);
    // (From the picture's upper half, where it is heads of cloud: its lower half is the fall of snow, and the fine of that stood in
    // the far deck and the band as upright streaks.)
    uvT = vec2(mirrored(uvT.x), 0.45 + 0.55 * mirrored(uvT.y / 0.55 + 0.2));
    if (foot < 0.0009) {
      float fine = dot(textureLod(tStormWall, uvT, 0.0).rgb, vec3(0.33));
      float broad = dot(textureLod(tStormWall, uvT, 4.5).rgb, vec3(0.33));
      held *= mix(1.0, clamp(fine / max(broad, 0.01), 0.6, 1.5), 0.85 * smoothstep(0.0009, 0.0002, foot));
    }
    c = mix(c, held, plateOn);
    // Behind the long lens the band is the picture's own: what is orange in it is the last light, and is as bright as on the open ridge.
    float heatP = clamp((held.r - held.b) * 9.0, 0.0, 1.0);
    c = mix(c, c * vec3(2.2, 1.5, 0.95) + vec3(0.04, 0.014, 0.002) * heatP, plateOn * heatP);
    // And it is a glow under the cloud's deck, not a stripe: the warm of the picture read soft stands in the air about the band.
    vec3 heldSoft = plateCloud(uvQ, 5.0);
    c += vec3(0.085, 0.036, 0.014) * (plateOn * clamp((heldSoft.r - heldSoft.b) * 14.0, 0.0, 1.0));
  }
  // (No far spire is drawn on the dome. Behind the strike's long lens three stood against the band, dark blades with their feet in the
  // air over the sea: the far ridge is built in every shot, and the picture is held with no spire in it.)
  // Under the horizon there is only the cloud sea, which the air pass draws.
  vec2 uvP = vec2(0.0);
  c = mix(c, uSkyGround, smoothstep(0.0, -0.06, d.y) * (1.0 - (uPlate.w > 0.0 ? plateAt(az, el, uvP) : 0.0)));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

/** The pictures the dome's cloud is read from, for any material that carries SKY_GLSL. */
export function skyPictures(ctx: Context): Record<string, THREE.IUniform> {
  return {
    uSkyStage: { value: new THREE.Vector4(0, 0, 0, 0) },
    uPlate: { value: new THREE.Vector4(0, 0, 1, 0) },
    tStrikeSky: { value: ctx.assets.texture('mat/strikesky.jpg', { repeat: false }) },
    tSkyPano: { value: ctx.assets.texture('mat/skypano.jpg', { repeat: false }) },
    tSkyFlow: { value: ctx.assets.texture('mat/skyflow.png', { repeat: false, kind: 'data' }) },
    tStormWall: { value: ctx.assets.texture('mat/stormwall.jpg', { repeat: false }) },
  };
}

export interface Sky {
  dome: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
  dispose(): void;
}

export function createSky(ctx: Context, noise: THREE.Data3DTexture, uniforms: Record<string, THREE.IUniform>): Sky {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, ...uniforms, tNoise: { value: noise } },
    side: THREE.BackSide,
    // At the far plane and drawn last, so that the engine can reject it wherever anything stands in front.
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    depthWrite: false,
    toneMapped: false,
  });
  const geometry = new THREE.SphereGeometry(1, 48, 24);
  const dome = new THREE.Mesh(geometry, material);
  dome.frustumCulled = false;
  dome.renderOrder = 10;
  return {
    dome,
    uniforms,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
