// The one half-size pass of the Breath's air. It writes the light the air scatters toward the camera in rgb and how much of the scene it lets
// through in alpha. Three things are in it, nearest first:
//   the vapour of the main shaft, a density in space cut from the block of noise and marched, each step shaded by what stands between it
//   and the sun: it fills the shaft and wells up over the brim when the shaft breathes out;
//   the sheet of it that pours over the west lip and lies on the rock: too thin for the march's steps, so it is not marched. It is laid
//   as a layer on the ground whose depth along the ray is worked out, not stepped;
//   the far bodies (the plumes of the smaller shafts, the fog banks, the fog that pours from the cave), each one ray-against-ellipsoid, no march;
//   the dawn haze itself, in closed form.
// Everything is lit by the rig: the sky's cold light from above, the low sun wherever the land's baked shadow lets it through.
import { HASH_GLSL } from '../../../core/post';
import { RIG_GLSL } from '../shared/glsl';
import { SEA } from '../land';

export const MAX_BODIES = 32;

/** March steps of the vapour of the main shaft. The cost of the pass is close to linear in this wherever the vapour is in view. */
export const STEPS = 16;

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
void viewRay(out vec3 ro, out vec3 rd, out float far) {
  ivec2 pixel = 2 * ivec2(gl_FragCoord.xy);
  float depth = texelFetch(tDepth, pixel, 0).r;
  vec2 uv = (vec2(pixel) + 0.5) / vec2(textureSize(tDepth, 0));
  vec4 view = uInvProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 world = (uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
  ro = uCameraWorld[3].xyz;
  rd = world - ro;
  far = length(rd);
  rd /= far;
  // The sky stands where the far ground ends, so that the far picture on it is veiled as the ground under it is and no more.
  if (depth >= 1.0) far = 9000.0 * smoothstep(0.045, 0.0, rd.y);
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
  return t * (uHaze.x * ka + uHaze.z * kb);
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

// The vapour of the main shaft as a density in space: metres of path it takes to dim by 1/e, inverted. It is in separate masses with
// clear air between them, so the dark of the shaft and its wall show through and the low sun gets in behind each:
//   low in the shaft it lies in a layer with a heaped top, twenty metres down, in the shaft's own shade: the bottom is never seen;
//   out of the layer stand three columns where it wells up, two on the west and one near the middle, each some metres through, made
//   of billows that climb. They widen as they climb, lean with the wind once they clear the brim, and tear to wisps some metres over it;
//   over the west lip it comes out and lies on the rock a metre or three deep, sliding down the wind and torn to shreds in thirty metres;
//   the breath lifts the layer and the columns and thickens them, and lets them down again.
// fine 1 reads the small billows too (the march); 0 does not (the taps toward the sun). t is the distance from the lens.
float column(vec3 p, vec2 foot, float wide, float head, float n) {
  // The axis wanders a little with height and leans down the wind over the brim.
  vec2 axis = foot + WINDV * (0.55 * max(p.y + 2.0, 0.0)) + 2.0 * vec2(sin(0.21 * p.y + foot.x), cos(0.17 * p.y + foot.y));
  vec2 d = p.xz - axis;
  float w = wide * (1.0 + 0.012 * (p.y + 40.0));
  // Billows: the edge of the column is where the noise says, not a tube.
  // Over the brim only the hearts of the billows are left: torn wisps with air between, not a veil.
  float core = exp(-dot(d, d) / (w * w));
  float shape = core + 1.9 * (n - 0.5) * smoothstep(0.02, 0.3, core) - 0.3 * smoothstep(-3.0, 8.0, p.y);
  return smoothstep(0.4, 0.85, shape) * smoothstep(head, head - 6.0, p.y + 5.0 * (n - 0.5));
}
// Whether any of it can be at a place: asked first, with no picture read, so that a step out over the shelf costs nothing.
// How high the lens stands: 0 for a lens low at the rim, 1 for one high over the shelf. The vapour is drawn two ways by it. A low lens
// sees it as it was built for those lenses: the columns' heads stand over the brim, soft and large behind the weed, and the layer on the
// rock is marched. From high across the shelf those heads were round pale puffs a few metres through, cut by one or two steps of the
// march, and stood still: there the heads stay under the brim and the layer is the sheet laid in main.
// It is the height and not the distance because the first shot ends three metres from where the last begins: no reach from the shaft
// tells them apart. Shots two to five stay under 7 m and are all the first way; the first shot comes down through the fade after its key.
float lensFar = 0.0;
bool vapourNear(vec3 p) {
  float r = length(p.xz);
  if (r < 28.0) return true;
  float b = atan(p.x, -p.z);
  float da = b + 1.2;
  float way = exp(-da * da / 0.4);
  float surge = uBreath.y * uShow.w;
  float out0 = r - rimAt(b);
  if (out0 < 0.7 + 7.0 * way + 5.0 * surge) return true;
  return way >= 0.02 && p.y < 2.5 + (4.5 + 7.0 * surge) * way;
}
float vapourRho(vec3 p, float ground, float fine, float t) {
  float r = length(p.xz);
  float b = atan(p.x, -p.z);
  float rim = rimAt(b);
  float out0 = r - rim;
  float da = b + 1.2;
  float way = exp(-da * da / 0.4);
  float surge = uBreath.y * uShow.w;
  float apron = uBreath.z * uShow.w;
  // Out on the shelf, away from the west lip, there is none: no noise is read there.
  if (way < 0.02 && out0 > 0.6 + 5.0 * surge + 7.0 * way) return 0.0;
  // It climbs at a walk and drifts a little with the wind: heavy steam, whose small billows turn over only a little faster than its heaps.
  vec3 q = p - vec3(WINDV.x * 0.4, 0.85, WINDV.y * 0.4) * uTime;
  vec4 n0 = textureLod(tNoise, q.xzy / 27.0, 0.0);
  float big = n0.r;
  float small = 0.5;
  if (fine > 0.5) small = textureLod(tNoise, (q.xzy - vec3(WINDV.x, WINDV.y, 1.0) * (0.3 * uTime)) / 8.3 + 0.31, 0.0).b;
  float n = 0.45 * big + 0.55 * small;

  // The layer low in the shaft, heaped.
  // It stands high on the west, where it wells up and spills over the low lip, and low in the middle and the east: the core stays dark.
  float west = smoothstep(4.0, -20.0, p.x);
  float top = uBreath.x + 2.5 - 12.0 * (1.0 - west) + 7.0 * (big - 0.45) + 2.5 * (small - 0.5) + 6.0 * surge;
  float under = top - p.y;
  float rho = (0.03 + 0.07 * smoothstep(0.0, 10.0, under)) * smoothstep(0.0, 2.0 + 3.0 * n0.g, under) * (0.55 + 0.9 * small);
  // The columns.
  float lift = 9.0 * surge;
  // The two ways are faded one into the other, never slid: a head that climbed as the lens came down would be vapour that rises.
  float cols = 0.0;
  if (lensFar < 0.999) cols = (1.0 - lensFar) * (column(p, vec2(-19.0, -9.0), 2.7, 6.0 + lift, n) + 0.6 * column(p, vec2(-10.0, 11.0), 2.2, 1.0 + lift, n) + 0.8 * column(p, vec2(-2.0, -5.0), 3.2, -5.0 + 1.5 * lift, n));
  if (lensFar > 0.001) cols += lensFar * (column(p, vec2(-19.0, -9.0), 2.7, -1.0 + lift, n) + 0.6 * column(p, vec2(-10.0, 11.0), 2.2, -4.0 + lift, n) + 0.8 * column(p, vec2(-2.0, -5.0), 3.2, -6.0 + 1.5 * lift, n));
  rho = max(rho, (0.11 + 0.1 * surge) * min(cols, 1.0));
  // Over the brim the columns' heads are torn: thinner the higher.
  rho *= mix(1.0, 0.6, smoothstep(1.0, 9.0, p.y));
  // Inside the wall; over the brim it leans out on the west, and at the breath all round.
  rho *= smoothstep(0.6, -1.2, out0 - smoothstep(0.0, 3.0, p.y) * (7.0 * way + 5.0 * surge));

  if (lensFar > 0.999) return rho * uShow.z;
  // On the rock by the west lip, for a lens at the rim: a layer with its own top, thick at the brim and torn into shreds as it slides off
  // down the wind.
  float foot = max(ground, SEA_Y);
  float gone = max(out0, 0.0) / (16.0 + 14.0 * apron + 8.0 * surge);
  float tall = (1.5 + 0.9 * apron + 4.0 * surge) * way * exp(-gone) * (0.35 + 1.3 * big);
  float lies = smoothstep(0.0, 0.5 + 0.5 * tall, foot + tall - p.y) * smoothstep(-2.5, 0.5, out0) * step(foot - 0.3, p.y);
  float shred = smoothstep(0.54 + 0.1 * (1.0 - exp(-gone)), 0.68 + 0.12 * (1.0 - exp(-gone)), n);
  // Never a wash on the lens: within a few metres of the camera the layer on the rock is not there.
  float pour = (0.04 + 0.02 * apron + 0.05 * surge) * smoothstep(0.3, 1.2, tall) * lies * shred * smoothstep(3.0, 11.0, t);
  return max(rho, pour * (1.0 - lensFar)) * uShow.z;
}

// The ground the sheet lies on at a place: the rock, or the tide. Inside the brim the land is the pit, so there it is the lip beside it.
float pourFoot(vec2 xz, float out0) {
  vec2 at = out0 < 1.0 ? xz * (1.0 + (1.0 - out0) / max(length(xz), 1.0)) : xz;
  return max(landAt(at).r, SEA_Y);
}
// The sheet on the rock by the west lip, as what a ray that crosses it at p meets: x how deep it stands there in metres, y its thickness
// for a metre of path. It leaves the brim a stride deep and whole, slides down the wind at a brisk walk (so it is seen to move from one
// frame to the next), lies lower the farther it has come, and is torn to shreds in thirty metres.
vec2 pourAt(vec3 p, float way, float out0) {
  float surge = uBreath.y * uShow.w;
  float apron = uBreath.z * uShow.w;
  float gone = max(out0, 0.0) / (16.0 + 14.0 * apron + 8.0 * surge);
  float far0 = 1.0 - exp(-gone);
  vec3 q = p - vec3(WINDV.x * 2.6, -0.2, WINDV.y * 2.6) * uTime;
  float big = textureLod(tNoise, q.xzy / 27.0, 0.0).r;
  float small = textureLod(tNoise, (q.xzy - vec3(WINDV.x, WINDV.y, 0.0) * (0.9 * uTime)) / 8.3 + 0.31, 0.0).b;
  float n = 0.45 * big + 0.55 * small;
  float tall = (1.7 + 0.9 * apron + 4.0 * surge) * way * exp(-gone) * (0.35 + 1.3 * big);
  float shred = smoothstep(0.34 + 0.24 * far0, 0.5 + 0.26 * far0, n);
  float rho = (0.085 + 0.02 * apron + 0.05 * surge) * smoothstep(0.25, 1.0, tall) * shred * smoothstep(-2.5, 0.5, out0) * (0.6 + 0.8 * small);
  // It does not reach the herds' water: thirty metres from the lip there is none, a little farther when the shaft breathes out.
  rho *= smoothstep(30.0 + 20.0 * surge, 14.0 + 10.0 * surge, out0);
  return vec2(tall, rho);
}

// One body of far vapour or fog: the ray against a leaning ellipsoid. It gives how thick it is along the ray, where the ray is deepest in it,
// and how much of the sun its near side takes.
bool bodyAt(int i, vec3 ro, vec3 rd, float far, out float thick, out float at, out float sunward, out vec3 mid) {
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
  viewRay(ro, rd, far);
  float toSun = max(dot(rd, uSunDir), 0.0);
  // Vapour throws the sun forward: it glows where the view runs toward the sun and is plain white to the side.
  float phase = 0.3 + 0.9 * toSun * toSun + 1.6 * pow(toSun, 12.0);
  vec3 ambient = 0.8 * uSkyHorizon + 0.5 * uSkyZenith + 0.25 * uGlowColour;
  vec3 colour = vec3(0.0);
  float through = 1.0;

  // The vapour of the main shaft: marched through a drum round the shaft and the lip it pours over, from down in the shaft to a little over
  // the dome of the breath. Each step asks the density where it is, and asks it again at three places toward the sun: what stands between
  // the step and the sun shades it, so a billow has a lit side and a dark one, and where the view runs toward the sun its thin edges burn.
  // The steps are even and are not jittered: one sample a frame at the low tier would leave a jitter as speckle. The density is soft enough
  // (nothing in it is smaller than two steps) that they do not band.
  // The sheet over the west lip, first: it is a layer on the ground a stride deep, thinner than any step of the march, so the ray is not
  // stepped through it. Where the ray meets the middle of the layer is found (three tries: the ground is stepped and the layer is as deep
  // as its own noise says) and what the ray passes there is the layer's depth over the ray's fall, less what the scene hides of it.
  // Nothing in it hangs on where a step lands: it neither bands nor boils, at one sample a frame or at four.
  vec3 sheetLight = vec3(0.0);
  float sheetGone = 1.0;
  float sheetAt = 1e9;
  lensFar = smoothstep(7.4, 10.4, ro.y);
  if (uShow.z > 0.5 && lensFar > 0.0 && rd.y < -1e-3) {
    float t = min(far, (1.6 - ro.y) / rd.y);
    bool met = t > 0.0;
    vec3 p = ro;
    float way = 0.0;
    float out0 = 0.0;
    float foot = 0.0;
    vec2 lay = vec2(0.0);
    for (int i = 0; i < 3; i++) {
      if (!met) break;
      p = ro + rd * t;
      float b = atan(p.x, -p.z);
      float da = b + 1.2;
      way = exp(-da * da / 0.4);
      out0 = length(p.xz) - rimAt(b);
      if (way < 0.02 || out0 < -2.5 || out0 > 34.0 + 20.0 * uBreath.y * uShow.w) {
        met = false;
        break;
      }
      foot = pourFoot(p.xz, out0);
      lay = pourAt(p, way, out0);
      t = (foot + 0.5 * lay.x - ro.y) / rd.y;
      met = t > 0.0;
    }
    if (met && lay.x > 0.05 && lay.y > 0.0004) {
      float top = max((foot + lay.x - ro.y) / rd.y, 0.0);
      float bottom = min((foot - ro.y) / rd.y, far);
      // Never a wall of it along a level ray.
      // It is a thing seen from across the shelf. From a lens that stands in it (the weed at the rim, the herds in the channel) it was a
      // pale slab with a ruled top between the lens and whatever stood on the rock, so near a lens it is not drawn.
      float path = min(bottom - top, 14.0) * smoothstep(16.0, 40.0, t) * lensFar;
      if (path > 0.0) {
        float own = lay.x * lay.y;
        // The heap next toward the sun shades this one: a heap has a lit side and a dark one.
        vec2 next = pourAt(p + uSunDir * 3.0, way, out0);
        float sun = sunSeen(landAt(p.xz), foot + lay.x) * sunCloud(p.xz);
        sheetLight = VAPOUR_ALBEDO * (vec3(0.33, 0.292, 0.25) * (0.5 + 0.5 * exp(-4.0 * own))
          + mix(uSunColour, vec3(2.2), 0.12) * (sun * (0.3 * min(phase, 1.4) * exp(-7.0 * next.x * next.y - 2.0 * own) + 0.035)));
        sheetGone = exp(-lay.y * path);
        sheetAt = t;
      }
    }
  }

  vec2 middle = vec2(-9.0, -3.0);
  float drum = 47.0;
  float roof = 9.5 + 10.0 * uBreath.y * uShow.w;
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
      // The four samples of a frame of the film each start their steps a different part of a step on: together they cut the body several times as fine.
      float first = fract(0.125 + float(uSampleIndex) * 0.6180339);
      for (int i = 0; i < ${STEPS}; i++) {
        float t = t0 + (float(i) + first) * dl;
        vec3 p = ro + rd * t;
        // The sheet takes its place among the steps, by its distance.
        if (t > sheetAt) {
          colour += through * (1.0 - sheetGone) * sheetLight;
          through *= sheetGone;
          sheetAt = 1e9;
          sheetGone = 1.0;
        }
        if (!vapourNear(p)) continue;
        vec4 land = landAt(p.xz);
        float rho = vapourRho(p, land.r, 1.0, t);
        if (rho <= 0.0006) continue;
        float tau = rho * dl;
        // Toward the sun, 4 metres on: the sun is low, so this is the next heap along, and a heap has a lit side and a dark one.
        // (One tap, not three: the march was the dearest thing in the place.)
        float shade = 13.0 * vapourRho(p + uSunDir * 4.0, land.r, 0.0, t);
        // What lies in the thick of a heap is in that heap's shade.
        float roofed = exp(-9.0 * rho);
        float sun = sunSeen(land, p.y) * sunCloud(p.xz);
        // Down the shaft the sky closes to a disc overhead.
        float sunk = clamp(1.0 + min(p.y - 1.0, 0.0) / 26.0, 0.22, 1.0);
        // The far side of the shaft faces the low sun: the fog there takes its warmth second hand, from the lit wall over it.
        float facing = smoothstep(-25.0, 20.0, -dot(p.xz, normalize(uSunDir.xz)));
        vec3 light = (vec3(0.33, 0.292, 0.25) * sunk * sunk * sunk + uSunColour * (0.06 * facing * sunk * sunk)) * (0.3 + 0.7 * roofed)
          + mix(uSunColour, vec3(2.2), 0.12) * (sun * (0.3 * min(phase, 1.4) * exp(-1.1 * shade) + 0.035 * exp(-0.2 * shade)));
        float gone = exp(-tau);
        colour += through * (1.0 - gone) * VAPOUR_ALBEDO * light;
        through *= gone;
        if (through < 0.01) break;
      }
    }
  }

  // The sheet, where no step of the march lay beyond it.
  colour += through * (1.0 - sheetGone) * sheetLight;
  through *= sheetGone;

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
        vec3 light = vec3(0.2, 0.205, 0.215) + mix(uSunColour, vec3(2.2), 0.6) * (0.1 * phase * sunny / max(sum, 1e-6));
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
    if (!bodyAt(i, ro, rd, far, thick, at, sunward, mid)) continue;
    vec4 C = uBodyC[i];
    vec3 q = (mid - vec3(0.0, uBodyD[i].w * uTime, 0.0)) / C.z + D.y;
    q.xz -= WINDV * (uTime * 2.0 / C.z);
    vec4 n0 = textureLod(tNoise, q, 0.0);
    vec4 n1 = textureLod(tNoise, q * 3.1 + 0.37, 0.0);
    // The fine lumps are for far off: near the lens they are smaller than a pixel's step along the ray and would boil.
    float lumps = 0.62 * n0.r + 0.2 * mix(0.45, n1.b, smoothstep(2.0, 9.0, at / C.z)) + 0.3 * n0.g;
    // Billows: the body is whole in its middle and eaten by its own lumps toward its edge. sunward carries how deep the ray runs in it.
    float tau = thick * sunward * sunward * smoothstep(0.0, 0.7, sunward - (0.55 + 1.1 * C.w) * (1.0 - 1.35 * lumps));
    if (tau <= 0.002) continue;
    float here = air * hazeDepth(ro, rd, at);
    float seg = exp(-(here - done));
    colour += through * (1.0 - seg) * haze;
    through *= seg;
    done = here;
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
  float all = air * hazeDepth(ro, rd, far);
  float seg = exp(-max(all - done, 0.0));
  colour += through * (1.0 - seg) * haze;
  through *= seg;
  gl_FragColor = vec4(colour, through);
}`;
