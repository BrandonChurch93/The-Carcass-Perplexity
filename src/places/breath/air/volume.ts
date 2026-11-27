// The one half-size pass of the Breath's air. It writes the light the air scatters toward the camera in rgb and how much of the scene it lets
// through in alpha. Three things are in it, nearest first:
//   the vapour of the main shaft and the sheet of it that pours over the west lip and lies on the rock: one fog with a soft heaped top,
//   marched, each step weighing the part of its own height that lies in the fog and shaded by what stands between it and the sun;
//   the far bodies (the plumes of the smaller shafts, the fog banks, the fog that pours from the cave), each one ray-against-ellipsoid, no march;
//   the dawn haze itself, in closed form.
// Everything is lit by the rig: the sky's cold light from above, the low sun wherever the land's baked shadow lets it through.
import { HASH_GLSL } from '../../../core/post';
import { RIG_GLSL } from '../shared/glsl';
import { SEA } from '../land';

export const MAX_BODIES = 32;

/** March steps of the vapour of the main shaft. The cost of the pass is close to linear in this wherever the vapour is in view. */
export const STEPS = 28;

export const VOLUME_FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform highp sampler2D tDepth;
uniform mat4 uInvProjection;
uniform mat4 uCameraWorld;
uniform int uSeq;
uniform int uSampleIndex;
uniform highp sampler3D tNoise;
// x air, y fog, z vapour, w exhale: 1 drawn, 0 not.
uniform vec4 uShow;
// x the level of the vapour in the shaft, y how far the breath has come over the lip (0 to 1), z how much lies on the apron, w how far it has spread in the channel.
uniform vec4 uBreath;
uniform float uSpent;
// x thickness of the high haze for a metre at sea level, y its scale height, z the same for the low sea fog, w its scale height.
uniform vec4 uHaze;
uniform int uBodyCount;
uniform vec4 uBodyA[${MAX_BODIES}];
uniform vec4 uBodyB[${MAX_BODIES}];
uniform vec4 uBodyC[${MAX_BODIES}];
uniform vec4 uBodyD[${MAX_BODIES}];
varying vec2 vUv;
${HASH_GLSL}
${RIG_GLSL}

const vec2 WINDV = vec2(-0.94, 0.34);
const vec3 VAPOUR_ALBEDO = vec3(0.93, 0.92, 0.9);
const float SEA_Y = -0.4;

// The ray of this pixel: where it starts, where it goes, and how far it gets before it meets the scene.
void viewRay(out vec3 ro, out vec3 rd, out float far, out float veil) {
  ivec2 pixel = 2 * ivec2(gl_FragCoord.xy);
  float depth = texelFetch(tDepth, pixel, 0).r;
  vec2 uv = (vec2(pixel) + 0.5) / vec2(textureSize(tDepth, 0));
  vec4 view = uInvProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 world = (uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
  ro = uCameraWorld[3].xyz;
  rd = world - ro;
  far = length(rd);
  rd /= far;
  veil = far;
  // The sky stands behind everything: a plume or a bank is seen whole against it. The haze over the sky itself is that of the far ground's
  // end and thins to nothing a degree over the horizon: the far picture holds its own mist, and a second veil over it was a ruled band.
  if (depth >= 1.0) {
    far = 30000.0;
    veil = 3200.0 * smoothstep(0.022, 0.0, rd.y);
  }
}

// The colour the haze has toward d: the sky of that bearing at the horizon, so that the dome and the air meet without a line.
vec3 hazeColour(vec3 d) {
  return skyRadiance(normalize(vec3(d.x, clamp(d.y, 0.0, 1.0), d.z)));
}

// Thickness of the air from the camera to t along the ray: two layers that thin with height.
float hazeDepth(vec3 ro, vec3 rd, float t) {
  float dy = abs(rd.y) < 1e-4 ? 1e-4 : rd.y;
  float y0 = max(ro.y, -6.0);
  float y1 = max(ro.y + dy * t, -6.0);
  float span = max(abs(y1 - y0), 1e-3);
  float ka = uHaze.y * abs(exp(-y0 / uHaze.y) - exp(-y1 / uHaze.y)) / span;
  float kb = uHaze.w * abs(exp(-y0 / uHaze.w) - exp(-y1 / uHaze.w)) / span;
  // The low layer is the damp of the flats: past a kilometre and a half it counts a quarter, or the far cliff's foot is lost in a level band.
  return t * uHaze.x * ka + (min(t, 1500.0) + 0.25 * max(t - 1500.0, 0.0)) * uHaze.z * kb;
}

float bumpAt(float b, float centre, float width) {
  float d = mod(abs(b - centre), 6.2831853);
  if (d > 3.14159265) d = 6.2831853 - d;
  return d < width ? 0.5 + 0.5 * cos(3.14159265 * d / width) : 0.0;
}
// The layout's own numbers (land.ts): the rim of the main shaft and the tide channel.
float rimAt(float b) {
  return 30.0 + 7.0 * bumpAt(b, 1.9548, 0.733) + 2.2 * bumpAt(b, 3.7525, 0.5236) + sin(5.0 * b + 1.0) + 0.5 * sin(11.0 * b + 0.5) + 0.4 * sin(29.0 * b + 2.0);
}
float softly(float v) {
  return 0.5 * (v + sqrt(v * v + 64.0));
}
float channelMid(float z) {
  return -50.0 + 0.4 * softly(z - 5.0) - 0.3 * softly(-z - 10.0);
}
float channelWide(float z) {
  return 5.0 + 2.5 * clamp((5.0 - z) / 15.0, 0.0, 1.0) + 14.0 * clamp((-5.0 - z) / 40.0, 0.0, 1.0);
}

// The vapour of the main shaft and the sheet of it on the rock, as one field. It is a fog with a soft heaped top, not a set of shapes:
// at a place it has a top (metres), a softness (the metres over which it thins to nothing above that top) and a thickness for a metre of
// path below it. The march does not ask the density at a point: each step asks how much of its own span of height lies under the top
// (layerMean), so a layer thinner than a step is still weighed exactly and neither bands nor boils.
//   In the shaft the top stands at the brim and over it on the west, where it wells up (two wells), and sinks to the east, where the
//   ledges and the dark of the shaft show: the heaps of the top are the block of noise, climbing at a walk and bent down the wind once
//   they clear the brim.
//   Over the west lip it lies on the rock a stride deep, sliding down the wind, lower and more torn the farther it has come.
//   The breath lifts the top into a dome over the west half and feeds the sheet: the same field, swollen.
float rampArea(float u, float s) {
  u = max(u, 0.0);
  return u < s ? u * u / (2.0 * s) : u - 0.5 * s;
}
// How much of a span of height (y - hy to y + hy) lies under a top that thins over soft metres: 0 to 1.
float layerMean(float top, float soft, float y, float hy) {
  if (hy < 0.04) return clamp((top - y) / soft, 0.0, 1.0);
  return clamp((rampArea(top - y + hy, soft) - rampArea(top - y - hy, soft)) / (2.0 * hy), 0.0, 1.0);
}
// The noise the vapour of the shaft is cut from, at a place: x the heaps (round lumps, 31 m a repeat), y a smooth drift, z and w (asked for
// with fine) a smooth field and fine billows at a third of that size, taller than wide, pushed about by the large one and climbing faster
// than it, so that a wisp shears and turns over as it climbs and never rides up as one printed pattern.
vec4 risingNoise(vec3 p, float fine) {
  vec3 q = p - vec3(WINDV.x * 0.35, 0.8, WINDV.y * 0.35) * uTime;
  q.xz -= WINDV * (0.7 * max(p.y + 1.0, 0.0));
  vec4 n0 = textureLod(tNoise, q.xzy / 31.0, 0.0);
  vec2 mid = vec2(0.3 + 0.4 * n0.a, 0.5);
  if (fine > 0.5) {
    vec3 w = q + vec3(5.0 * (n0.g - 0.5), -0.75 * uTime, 5.0 * (n0.a - 0.5));
    mid = textureLod(tNoise, w.xzy * vec3(1.0, 1.0, 0.55) / 11.0 + 0.37, 0.0).gb;
  }
  return vec4(n0.r, n0.g, mid);
}
// The fine grain of a wisp, read once for a pixel at the depth where its vapour lies (never at every step): threads and small billows a
// hand to a stride across, drawn out upward, climbing a little faster than the body they are cut into.
float wispDetail(vec3 p) {
  vec3 q = p - vec3(WINDV.x * 0.5, 1.5, WINDV.y * 0.5) * uTime;
  q.xz -= WINDV * (0.7 * max(p.y + 1.0, 0.0));
  vec4 push = textureLod(tNoise, q.xzy / 19.0 + 0.71, 0.0);
  vec3 w = (q + 2.4 * vec3(push.g - 0.5, 0.0, push.a - 0.5)).xzy * vec3(1.0, 1.0, 0.6);
  float billow = textureLod(tNoise, w / 6.7 + 0.11, 0.0).b;
  float thread = textureLod(tNoise, (w - vec3(0.0, 0.0, 0.3 * uTime)) / 2.9 + 0.53, 0.0).g;
  return 0.6 * billow + 0.4 * (1.0 - abs(2.0 * thread - 1.0));
}
// How far past the wall the vapour may stand at a height: over the brim it leans out on the west and, the higher it has climbed, down the wind.
float leanOut(float y, float way, float surge) {
  return smoothstep(-1.0, 3.0, y) * (5.0 * way + 5.0 * surge) + 0.9 * max(y, 0.0) * (0.25 + 0.75 * way);
}
// Where the top of the pool stands at a place before its heaps, and how near the place is to the two wells (where the vapour climbs; a
// column widens as it climbs). The pool stands to the brim only against the west wall; over the middle and the east of the shaft it lies
// deep, under the hoops, and the breath lifts it in the west and hardly at all in the east.
float poolLevel(vec3 p, float surge, out float wells, out float west) {
  west = smoothstep(6.0, -17.0, p.x);
  float wide = max(p.y + 8.0, 0.0);
  vec2 da = p.xz - vec2(-20.0, -10.0);
  vec2 db = p.xz - vec2(-9.0, 13.0);
  wells = min(exp(-dot(da, da) / (40.0 + 4.0 * wide)) + (0.1 + 0.85 * surge) * exp(-dot(db, db) / (36.0 + 4.0 * wide)), 1.0);
  vec2 dh = p.xz - vec2(-27.0, -8.0);
  float high = exp(-dot(dh, dh) / 400.0);
  return uBreath.x + 0.5 + 4.5 * high - (9.0 + 5.0 * surge) * (1.0 - west) + 6.5 * surge * west * west;
}
// Thickness for a metre of path of the vapour in the shaft, over a span of height. Two things in one field:
//   the pool: fog that lies deep in the shaft, with a soft heaped top far under the brim. It is deep on the east, where the wall, its beds
//   and the hoops stand clear of it, and stands highest on the west over the two wells. The breath lifts it to the brim and over.
//   the wisps: what leaves the pool and climbs. Thin sheets and columns with air between them, most of them over the wells, fewer and
//   thinner the higher they have climbed, bent down the wind once they clear the brim. The wall is read through them.
// under: how far the place lies below the top of the pool.
float shaftRho(vec3 p, float hy, float out0, float way, vec4 n, out float under, out float core) {
  float surge = uBreath.y * uShow.w;
  float settled = uBreath.w * uShow.w;
  float wells;
  float west;
  float level = poolLevel(p, surge, wells, west);
  float top = level + 12.0 * (n.x - 0.6) + 7.0 * (n.w - 0.5);
  under = top - p.y;
  float pool = (0.24 + 0.04 * surge) * layerMean(top, 1.6 - 0.8 * west + 2.5 * surge, p.y, hy) * mix(0.4, 1.0, west);
  core = (0.12 + 0.5 * smoothstep(0.7, 0.4, 0.55 * n.x + 0.45 * n.w)) * smoothstep(-1.0, 1.0, under);
  // The columns climb from the pool's top over the wells: billows with an edge and clear air between them, fewer the higher they have climbed.
  float h = -under;
  float spent = uSpent * uShow.w;
  float reach = 5.0 + 5.0 * wells + 4.0 * settled + 12.0 * surge + 7.0 * spent;
  float f = clamp(h / reach, 0.0, 1.0);
  float inside = 0.7 * n.x + 0.3 * n.w + 0.9 * (wells - 0.6) + 0.14 * surge + 0.04 * settled - 0.3 * f - 0.5;
  float body = smoothstep(0.0, 0.1, inside) * (1.0 - f * f) * smoothstep(-3.0, 0.5, h);
  core = max(core, 0.55 * smoothstep(0.08, 0.3, inside) * step(0.0, h));
  // Inside the wall; over the brim it leans out.
  // Over the emptied pool what climbs is in strands with the dark of the drop between them, not a veil.
  body *= mix(1.0, 3.0 * smoothstep(0.57, 0.7, n.w) * smoothstep(0.48, 0.68, n.x), spent);
  return (pool + (0.022 + 0.05 * surge + 0.06 * spent) * body) * smoothstep(0.8, -1.5, out0 - leanOut(p.y, way, surge));
}
// The height over which there is none of it at a place, from the same numbers as shaftRho and no picture: the highest a heap can stand
// and, where a well is near, the highest its column can climb.
float shaftCeiling(vec3 p) {
  float surge = uBreath.y * uShow.w;
  float wells;
  float west;
  float level = poolLevel(p, surge, wells, west);
  float ceiling = level + 10.0 + 2.5 * surge;
  if (wells > 0.1 - 0.28 * surge) ceiling += 5.0 + 5.0 * wells + (4.0 * uBreath.w + 7.0 * uSpent) * uShow.w + 12.0 * surge;
  return ceiling;
}
// The ground the sheet lies on at a place: the rock, or the tide. Inside the brim the land is the pit, so there it is the lip beside it.
float pourFoot(vec2 xz, float out0) {
  vec2 at = out0 < 1.0 ? xz * (1.0 + (1.0 - out0) / max(length(xz), 1.0)) : xz;
  return max(landAt(at).r, SEA_Y);
}
// The sheet on the rock by the west lip: x its top, y its softness, z its thickness for a metre of path. It leaves the brim a stride deep
// and whole, slides down the wind at a brisk walk, lies lower the farther it has come, and is torn to shreds in thirty metres.
vec3 pourAt(vec3 p, float way, float out0, float fine) {
  float surge = uBreath.y * uShow.w;
  float apron = uBreath.z * uShow.w;
  float gone = max(out0, 0.0) / (16.0 + 14.0 * apron + 8.0 * surge);
  float far0 = 1.0 - exp(-gone);
  vec3 q = p - vec3(WINDV.x * 2.4, -0.2, WINDV.y * 2.4) * uTime;
  float big = textureLod(tNoise, q.xzy / 27.0, 0.0).r;
  float small = 0.5;
  if (fine > 0.5) small = textureLod(tNoise, (q.xzy - vec3(WINDV.x, WINDV.y, 0.0) * (0.8 * uTime)) / 15.0 + 0.31, 0.0).b;
  float n = 0.45 * big + 0.55 * small;
  float tall = (1.7 + 1.1 * apron + 4.0 * surge) * way * exp(-gone) * (0.35 + 1.3 * big);
  float shred = smoothstep(0.3 + 0.26 * far0, 0.5 + 0.26 * far0, n);
  float rho = (0.075 + 0.03 * apron + 0.05 * surge) * smoothstep(0.2, 1.0, tall) * shred * smoothstep(-2.0, 0.5, out0) * (0.6 + 0.8 * small);
  // It does not reach the herds' water: thirty metres from the lip there is none, a little farther when the shaft breathes out.
  rho *= smoothstep(30.0 + 20.0 * surge, 14.0 + 10.0 * surge, out0);
  return vec3(pourFoot(p.xz, out0) + tall, 0.3 + 0.45 * tall, rho);
}
// Whether any of it can be at a place: asked first, with no picture read, so that a step out over the shelf costs nothing.
bool vapourNear(vec3 p, out float out0, out float way) {
  float r = length(p.xz);
  float b = atan(p.x, -p.z);
  float da = b + 1.3;
  way = exp(-da * da / 0.45);
  out0 = r - rimAt(b);
  float surge = uBreath.y * uShow.w;
  if (out0 < 0.8 + leanOut(p.y, way, surge)) return true;
  return way >= 0.02 && p.y < 3.0 + (5.0 + 7.0 * surge) * way;
}

// One body of far vapour or fog: the ray against a leaning ellipsoid. It gives how thick it is along the ray, where the ray is deepest in it,
// and how much of the sun its near side takes.
bool bodyAt(int i, vec3 ro, vec3 rd, float far, out float thick, out float at, out float sunward, out vec3 mid, out vec3 qa, out vec3 qb, out float span) {
  vec4 A = uBodyA[i];
  vec4 B = uBodyB[i];
  vec4 C = uBodyC[i];
  float cy = cos(A.w);
  float sy = sin(A.w);
  vec3 o = ro - A.xyz;
  o.xz -= C.xy * o.y;
  vec3 d = rd;
  d.xz -= C.xy * d.y;
  o = vec3(cy * o.x + sy * o.z, o.y, -sy * o.x + cy * o.z) / B.xyz;
  d = vec3(cy * d.x + sy * d.z, d.y, -sy * d.x + cy * d.z) / B.xyz;
  float a = dot(d, d);
  float h = dot(o, d);
  float c = dot(o, o) - 1.0;
  float disc = h * h - a * c;
  if (disc <= 0.0) return false;
  float s = sqrt(disc);
  float t0 = max((-h - s) / a, 0.0);
  float t1 = min((-h + s) / a, far);
  if (t1 <= t0) return false;
  at = 0.5 * (t0 + t1);
  qa = o + d * t0;
  qb = o + d * t1;
  span = t1 - t0;
  vec3 q = o + d * at;
  float m = clamp(1.0 - dot(q, q), 0.0, 1.0);
  thick = (t1 - t0) * B.w;
  sunward = m;
  mid = ro + rd * at;
  return true;
}

void main() {
  vec3 ro;
  vec3 rd;
  float far;
  float veil;
  viewRay(ro, rd, far, veil);
  float toSun = max(dot(rd, uSunDir), 0.0);
  // Vapour throws the sun forward: it glows where the view runs toward the sun and is plain white to the side.
  float phase = 0.3 + 0.9 * toSun * toSun + 1.6 * pow(toSun, 12.0);
  vec3 ambient = 0.8 * uSkyHorizon + 0.5 * uSkyZenith + 0.25 * uGlowColour;
  vec3 colour = vec3(0.0);
  float through = 1.0;

  // The vapour of the main shaft and its sheet on the rock: marched through a drum round the shaft and the lip it pours over, from down in
  // the shaft to a little over the dome of the breath. Each step weighs the part of its own height that lies in the vapour, and asks the
  // field once more some metres toward the sun: what stands there shades it, so a heap has a lit side and a dark one.
  // Every pixel starts its steps a different part of a step on, by a fixed pattern of the pixel and the sample (no state): neighbours
  // cut the body at different depths and the eye joins them, where even steps left rings. The field is soft, so the pattern does not
  // show as grain at one sample a frame.
  vec2 middle = vec2(-9.0, -3.0);
  float drum = 47.0;
  float surge = uBreath.y * uShow.w;
  float roof = 11.0 + 10.0 * surge;
  // The light of the place on vapour, from the rig: the sky's own grey with the glow of the sun's half of it, and the low sun, warm.
  vec3 skyGrey = 0.52 * uSkyHorizon + 0.1 * uSkyZenith;
  vec3 skyGlow = (0.16 + 0.3 * toSun * toSun) * uGlowColour;
  vec3 skyLight = skyGrey + skyGlow;
  vec3 sunLight = mix(uSunColour, vec3(2.5), 0.45);
  vec3 skyWay = normalize(vec3(uSunDir.x, 0.55, uSunDir.z));
  if (uShow.z > 0.5) {
    float t0 = 0.0;
    float t1 = far;
    if (abs(rd.y) > 1e-5) {
      float ta = (roof - ro.y) / rd.y;
      float tb = (-30.0 - ro.y) / rd.y;
      t0 = max(t0, min(ta, tb));
      t1 = min(t1, max(ta, tb));
    } else if (ro.y > roof) {
      t1 = -1.0;
    }
    vec2 oc = ro.xz - middle;
    float a = dot(rd.xz, rd.xz);
    float h = dot(oc, rd.xz);
    float disc = h * h - a * (dot(oc, oc) - drum * drum);
    if (disc > 0.0 && a > 1e-8) {
      float s = sqrt(disc);
      t0 = max(t0, (-h - s) / a);
      t1 = min(t1, (-h + s) / a);
    } else {
      t1 = -1.0;
    }
    if (t1 > t0) {
      float dl = (t1 - t0) / ${STEPS}.0;
      // A step that runs level still crosses heaps that stand up beside it: it is weighed as if it spanned some height, so the top of a heap
      // comes in over a step and not at one.
      float hy = 0.5 * dl * max(abs(rd.y), 0.6);
      float first = fract(0.1 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) + float(uSampleIndex) * 0.6180339);
      // What the march gathers stands apart until its end: its grain is cut into it there, once, at the depth where most of it lies.
      vec3 lit = vec3(0.0);
      float thru = 1.0;
      float depthSum = 0.0;
      float weightSum = 0.0;
      for (int i = 0; i < ${STEPS}; i++) {
        float t = t0 + (float(i) + first) * dl;
        vec3 p = ro + rd * t;
        float out0;
        float way;
        if (!vapourNear(p, out0, way)) continue;
        float rho = 0.0;
        float sunTau = 0.0;
        float under = 0.0;
        float core = 0.0;
        float pooled = 0.0;
        // No picture is read where the place stands clear over all the pool and its columns can reach.
        if (out0 < 9.0 + 0.9 * max(p.y, 0.0) + 5.0 * uBreath.y && p.y < shaftCeiling(p)) {
          vec4 n = risingNoise(p, 1.0);
          pooled = shaftRho(p, hy, out0, way, n, under, core);
          rho = pooled;
        }
        if (way >= 0.02 && out0 > -2.0) {
          vec3 lay = pourAt(p, way, out0, 1.0);
          // Never a wash on the lens: within a few metres of the camera the sheet is not there.
          float sheet = lay.z * layerMean(lay.x, lay.y, p.y, hy) * smoothstep(3.0, 11.0, t);
          if (sheet > 0.0004) {
            vec3 next = pourAt(p + uSunDir * 3.0, way, out0, 0.0);
            sunTau += 9.0 * next.z * clamp((next.x - p.y) / max(next.y, 0.3), 0.0, 1.5) * sheet / (rho + sheet);
            rho += sheet;
          }
        }
        rho *= smoothstep(roof, roof - 5.0, p.y) * smoothstep(2.0, 14.0, t) * uShow.z;
        if (rho <= 0.0004) continue;
        vec4 land = landAt(p.xz);
        // What stands between the place and its light, asked once some metres on: in the sun, toward the sun (it is low, so this is the
        // next heap along); in the rim's shadow, toward the bright half of the sky over the sun. A heap has a lit side and a dark one
        // either way, and a hollow between two heaps is dark.
        bool sunned = p.y - land.b > -2.6;
        float skyTau = 0.0;
        if (pooled > 0.0004) {
          vec3 ps = p + (sunned ? uSunDir * 5.0 : skyWay * 4.5);
          float unders;
          float os = length(ps.xz) - rimAt(atan(ps.x, -ps.z));
          float cores;
          skyTau = shaftRho(ps, 1.0, os, way, risingNoise(ps, 0.0), unders, cores);
          // The sun is low: to reach a place a metre under the pool's top its light has come seven metres through the fog.
          if (sunned) sunTau += 7.0 * skyTau + 3.2 * pooled * clamp(min(under, unders + 1.0), 0.0, 8.0) + 2.5 * pooled;
        }
        float tau = rho * dl;
        // The rim's shadow in the vapour is three metres deep and stands higher and lower by the heaps: light gets about in it.
        float sun = smoothstep(-2.6, 1.2, p.y - land.b) * sunCloud(p.xz);
        // Down the shaft the sky closes to a disc overhead, and what lies deep under the pool's top is in the shade of what lies over it.
        float sunk = clamp(1.0 + min(p.y - 1.0, 0.0) / 40.0, 0.45, 1.0);
        float roofed = exp(-0.3 * max(under, 0.0));
        // The far side of the shaft faces the low sun: the fog there takes its warmth second hand, from the lit wall over it.
        float facing = smoothstep(-25.0, 20.0, -dot(p.xz, normalize(uSunDir.xz)));
        // The heart of a billow is in its own shade: its edge is what the sky lights.
        float open = exp(-14.0 * skyTau);
        vec3 light = ((skyGrey * (0.42 + 0.63 * open) + skyGlow * (0.25 + 1.15 * open)) * sunk + uSunColour * (0.008 * facing * sunk)) * (0.45 + 0.55 * roofed) * (1.0 - core)
          + sunLight * (sun * (0.09 * min(phase, 1.9) * exp(-1.5 * sunTau) + (0.012 + 0.04 * toSun * toSun) * exp(-0.22 * sunTau)));
        float gone = exp(-tau);
        float w = thru * (1.0 - gone);
        lit += w * VAPOUR_ALBEDO * light;
        depthSum += w * t;
        weightSum += w;
        thru *= gone;
        if (thru < 0.015) break;
      }
      float veiled = 1.0 - thru;
      if (veiled > 0.004) {
        // The grain of its skin: small billows lit and creased on a whole fog, threads with air between them where it is a thin veil.
        float grain = wispDetail(ro + rd * (depthSum / weightSum));
        float cut = clamp(veiled * mix(0.3 + 1.4 * smoothstep(0.25, 0.8, grain), 1.0, smoothstep(0.3, 0.75, veiled)), 0.0, 1.0);
        lit *= (cut / veiled) * (0.55 + 0.9 * grain);
        thru = 1.0 - cut;
      }
      colour = lit;
      through = thru;
    }
  }

  // The damp air up the light: the more air a pixel looks through toward the low sun, the more of its glow it carries, so what is
  // near stands dark before it. No bars are drawn in it: the wisps themselves are what the light is seen in.
  float glare = smoothstep(0.5, 0.97, toSun) * smoothstep(-0.5, -0.2, rd.y);
  if (glare > 0.01 && uShow.z > 0.5) {
    colour += through * mix(uSunColour, vec3(2.4), 0.3) * ((0.012 + 0.03 * uBreath.w * uShow.w) * 1.6 * glare * (1.0 - exp(-far / 220.0)));
  }

  // The mist on the ground: banks a knee to a head deep that lie on the water and the wet shelf and drift with the wind, torn at their
  // edges. The ray is asked at four places in the layer; none lies within a few metres of the lens.
  if (uShow.z > 0.5 && abs(rd.y) > 1e-4) {
    float ya = ${SEA.toFixed(2)} + 0.1;
    float yb = ${SEA.toFixed(2)} + 2.6;
    float ta = (ya - ro.y) / rd.y;
    float tb = (yb - ro.y) / rd.y;
    float m0 = max(min(ta, tb), 0.0);
    float m1 = min(max(ta, tb), min(far, 700.0));
    if (m1 > m0) {
      float tau = 0.0;
      float sunny = 0.0;
      float sum = 0.0;
      for (int i = 0; i < 4; i++) {
        float t = mix(m0, m1, (float(i) + 0.5) / 4.0);
        vec3 p = ro + rd * t;
        vec4 land = landAt(p.xz);
        // It lies where the ground is low and wet, and not in the shaft.
        float lies = smoothstep(1.6, 0.2, land.r - (${SEA.toFixed(2)})) * smoothstep(-3.0, -1.0, land.r) * smoothstep(7.0, 22.0, t) * smoothstep(700.0, 250.0, t);
        if (lies <= 0.0) continue;
        vec2 w = p.xz - WINDV * (2.6 * uTime);
        float bank = textureLod(tNoise, vec3(w / 83.0, 0.13 + 0.004 * uTime), 0.0).r;
        float torn = textureLod(tNoise, vec3(w / 19.0 + 0.4, 0.61 + 0.03 * uTime), 0.0).g;
        float rho = 0.02 * smoothstep(0.42, 0.72, 0.6 * bank + 0.4 * torn) * lies * smoothstep(0.0, 1.1, ya + 0.5 + 2.0 * bank * (0.5 + torn) - p.y);
        tau += rho * (m1 - m0) / 4.0;
        sum += rho;
        sunny += rho * sunSeen(land, p.y) * sunCloud(p.xz);
      }
      // Its top is heaped by the banks' own noise, not level: seen from a standing height it was a ruled band under the horizon.
      tau = min(tau, 0.5);
      if (tau > 0.001) {
        float gone = exp(-tau);
        vec3 light = 1.6 * skyLight + sunLight * (0.1 * phase * sunny / max(sum, 1e-6));
        colour += through * (1.0 - gone) * VAPOUR_ALBEDO * light;
        through *= gone;
      }
    }
  }

  // The haze and the far bodies, nearest first: each body stands in the haze at its own distance.
  vec3 haze = hazeColour(rd);
  float air = uShow.x;
  float done = 0.0;
  for (int i = 0; i < ${MAX_BODIES}; i++) {
    if (i >= uBodyCount || through < 0.01) break;
    vec4 D = uBodyD[i];
    float shown = D.x > 1.5 ? uShow.w : D.x > 0.5 ? uShow.y : uShow.z;
    if (shown < 0.5) continue;
    float thick;
    float at;
    float sunward;
    vec3 mid;
    vec3 qa;
    vec3 qb;
    float span;
    if (!bodyAt(i, ro, rd, far, thick, at, sunward, mid, qa, qb, span)) continue;
    vec4 C = uBodyC[i];
    if (D.x < 0.5 && uBodyB[i].y > 1.2) {
      // The plume of a smaller shaft is not one reading at its middle (that was a pale disc that kept its face to the lens): the ray
      // is cut at five places in it. At each the plume has its own lumps, climbing, so they pass one another as the lens moves; it is
      // thick and broad at its foot and thins as it climbs, torn more the higher, and its axis stands up from the vent and bends over
      // down the wind the higher it has climbed.
      vec2 bend = normalize(C.xy + vec2(1e-5, 0.0)) / uBodyB[i].xz * min(uBodyB[i].x, uBodyB[i].z);
      float tauAll = 0.0;
      vec3 lit = vec3(0.0);
      float thru = 1.0;
      float here = air * hazeDepth(ro, rd, at);
      float seg = exp(-max(here - done, 0.0));
      colour += through * (1.0 - seg) * haze;
      through *= seg;
      done = max(done, here);
      float sunHere = sunCloud(mid.xz);
      // Near the lens the five cuts would show as shells: there each pixel takes them a little apart.
      float cut = 0.12 * smoothstep(400.0, 80.0, at) * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      for (int k = 0; k < 5; k++) {
        float f = (float(k) + fract(0.5 + cut + float(uSampleIndex) * 0.6180339)) / 5.0;
        vec3 qn = mix(qa, qb, f);
        vec3 pw = ro + rd * (at + (f - 0.5) * span);
        float up = clamp(0.5 + 0.5 * qn.y, 0.0, 1.0);
        qn.xz += bend * (0.3 * (1.0 - qn.y * qn.y));
        // Broad from its foot: steam off hot water spreads as soon as it leaves it.
        float girth = 0.72 + 0.28 * up;
        // It leaves the water in heaves, and each heave climbs as a swelling of the column: its edge is a pile of them, never a ruled line.
        float rise = qn.y * uBodyB[i].y / uBodyB[i].x;
        // Three or four of them stand in its height at once and climb with its lumps, so it keeps its whole shape while they pass up it:
        // one swelling as long as the column swells and shrinks all of it together, and it beats like a bladder.
        float climbed = rise - uBodyD[i].w * uTime / uBodyB[i].x;
        girth *= 0.9 + 0.1 * sin(9.0 * climbed + 40.0 * D.y) + 0.06 * sin(15.0 * climbed + 17.0 * D.y);
        float m = clamp(min(1.0 - dot(qn, qn), 1.0 - dot(qn.xz, qn.xz) / (girth * girth)), 0.0, 1.0);
        if (m <= 0.0) continue;
        vec3 q = (pw - vec3(0.0, uBodyD[i].w * uTime, 0.0)) / C.z + D.y;
        q.xz -= WINDV * (uTime * 6.0 / C.z) * up;
        vec4 n0 = textureLod(tNoise, q * 0.5, 0.0);
        float fineN = textureLod(tNoise, q * 0.85 + 0.37, 0.0).b;
        float lumps = 0.6 * n0.r + 0.2 * fineN + 0.3 * n0.g;
        float open = (0.35 + 1.0 * C.w) * (0.8 + 0.8 * up);
        float body = smoothstep(0.0, 0.22, m - open * (2.15 - 2.9 * lumps)) * smoothstep(0.0, 0.12, m);
        float rho = uBodyB[i].w * mix(2.4, 0.5, smoothstep(0.1, 0.95, up)) * body;
        float tau = rho * span / 5.0;
        if (tau <= 0.0005) continue;
        // Backlit: where a billow is thin the sun comes through it and it burns, where it is thick it stands grey against its own rim.
        float glow = (0.3 + 1.0 * exp(-3.2 * body * m * (1.3 - up))) * clamp(0.55 + 1.5 * (fineN - 0.45), 0.25, 1.4);
        vec3 light = ambient * (0.45 + 0.55 * n0.r) + mix(uSunColour, vec3(2.2), 0.35) * (sunHere * min(phase, 2.4) * 0.5 * glow * D.z);
        float gone = exp(-tau);
        lit += thru * (1.0 - gone) * light;
        thru *= gone;
      }
      // Far off it stands in the same haze as the ground under it and takes half its colour from that: never a white cut-out on the sky.
      float seat = 0.55 * smoothstep(250.0, 700.0, at);
      colour += through * mix(VAPOUR_ALBEDO * lit, (1.0 - thru) * haze, seat);
      through *= thru;
      continue;
    }
    vec3 q = (mid - vec3(0.0, uBodyD[i].w * uTime, 0.0)) / C.z + D.y;
    q.xz -= WINDV * (uTime * (D.x > 0.5 && D.x < 1.5 ? 9.0 : 2.0) / C.z);
    vec4 n0 = textureLod(tNoise, q, 0.0);
    vec4 n1 = textureLod(tNoise, q * 3.1 + 0.37, 0.0);
    // The fine lumps are for far off: near the lens they are smaller than a pixel's step along the ray and would boil.
    float lumps = 0.62 * n0.r + 0.2 * mix(0.45, n1.b, smoothstep(2.0, 9.0, at / C.z)) + 0.3 * n0.g;
    // Billows: the body is whole in its middle and eaten by its own lumps toward its edge. sunward carries how deep the ray runs in it.
    float tau = thick * sunward * sunward * smoothstep(0.0, 0.7, sunward - (0.55 + 1.1 * C.w) * (1.0 - 1.35 * lumps));
    if (tau <= 0.002) continue;
    float here = air * hazeDepth(ro, rd, at);
    float seg = exp(-max(here - done, 0.0));
    colour += through * (1.0 - seg) * haze;
    through *= seg;
    done = max(done, here);
    float tops = clamp(0.25 + 1.1 * n0.r + 0.3 * (1.0 - sunward), 0.0, 1.0);
    // Toward the sun a body burns warm; away from it it is thin and blue grey.
    // What stands down in the shaft is under its own wall: it takes the sky from a disc overhead, and no sun.
    float sunkBody = clamp(1.0 + min(mid.y - 1.0, 0.0) / 14.0, 0.0, 1.0);
    vec3 tint = D.x > 1.5 ? vec3(0.86, 0.78, 0.68) : D.x > 0.5 ? vec3(0.72, 0.8, 0.92) * 0.85 : vec3(1.0);
    // White steam: gold only on its side toward the sun, and grey in its own shade.
    vec3 light = ambient * tint * (0.5 + 0.5 * tops) * (0.25 + 0.75 * sunkBody) + mix(uSunColour, vec3(2.2), 0.8) * (sunAt(mid) * sunkBody * min(phase, 1.6) * 0.3 * (0.1 + 0.9 * tops * tops) * D.z);
    float gone = exp(-tau);
    colour += through * (1.0 - gone) * VAPOUR_ALBEDO * light;
    through *= gone;
  }
  float all = air * hazeDepth(ro, rd, veil);
  float seg = exp(-max(all - done, 0.0));
  colour += through * (1.0 - seg) * haze;
  through *= seg;
  gl_FragColor = vec4(colour, through);
}`;
