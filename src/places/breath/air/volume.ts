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
// The noise that climbs in the shaft, at a place: x and y the heaps, z (asked for with fine) the billows.
vec3 risingNoise(vec3 p, float fine) {
  vec3 q = p - vec3(WINDV.x * 0.4, 0.9, WINDV.y * 0.4) * uTime;
  q.xz -= WINDV * (0.55 * max(p.y + 1.0, 0.0));
  vec4 n0 = textureLod(tNoise, q.xzy / 27.0, 0.0);
  float small = 0.5;
  if (fine > 0.5) small = textureLod(tNoise, (q.xzy - vec3(WINDV.x, WINDV.y, 1.0) * (0.35 * uTime)) / 15.0 + 0.31, 0.0).b;
  // The valleys between the lumps of the block are creases: they are flattened, so a billow is round and what lies between two is level.
  return vec3(n0.r, n0.g, smoothstep(0.3, 0.92, small));
}
// The top of the vapour in the shaft over a place, before its heaps.
float shaftTop(vec2 xz) {
  float surge = uBreath.y * uShow.w;
  float west = smoothstep(3.0, -19.0, xz.x);
  vec2 da = xz - vec2(-18.6, -7.2);
  vec2 db = xz - vec2(-9.0, 13.0);
  float well = exp(-dot(da, da) / 170.0) + 0.6 * exp(-dot(db, db) / 80.0);
  return uBreath.x + 6.5 - 15.0 * (1.0 - west) + 5.0 * well + 6.0 * surge * (0.15 + 0.85 * west);
}
// Thickness for a metre of path of the vapour in the shaft, over a span of height. under: how far the place lies below the top.
float shaftRho(vec3 p, float hy, float out0, float way, vec3 n, out float under) {
  float surge = uBreath.y * uShow.w;
  // The top is not a level: it stands in towers that climb to the brim and over it, with gaps between them down into the dark.
  // Over the two wells it stands as steam the more often: there the heaps climb past the brim into the light.
  vec2 da = p.xz - vec2(-21.0, -12.0);
  vec2 db = p.xz - vec2(-9.0, 13.0);
  float wells = 1.5 * exp(-dot(da, da) / 110.0) + 0.7 * exp(-dot(db, db) / 90.0);
  // Once the breath has spread the mist settles between its heaps: the heaps stand as high, the hollows between them open down to the hoops.
  float settled = uBreath.w * uShow.w;
  float top = shaftTop(p.xz) + (24.0 + 6.0 * settled) * smoothstep(0.44, 0.82, n.x + 0.14 * wells) - 8.0 - 5.0 * settled + 6.0 * (n.z - 0.5);
  // The top is softer the higher it stands: over the brim it thins into the air over some metres.
  // While it pours the mass is smeared by its own speed; once it stands, its heaps have an edge.
  float soft = mix(2.6 + 0.3 * max(p.y + 4.0, 0.0), 2.0 + 0.16 * max(p.y + 4.0, 0.0), smoothstep(0.1, 0.4, settled));
  under = top - p.y;
  // A heap is a body: its skin is torn by the billows, with air in it, and a few metres in it is whole and hides what is behind it.
  float skin = smoothstep(0.36, 0.72, 0.55 * n.z + 0.45 * n.y);
  float rho = (0.05 + 0.02 * surge) * layerMean(top, soft, p.y, hy) * mix(1.5 * skin, 1.0, smoothstep(1.0, 9.0, under));
  // Deeper it is thicker: the bottom is never seen.
  rho *= 1.0 + 1.2 * smoothstep(6.0, 22.0, under);
  // It wells up on the west and is thin on the east, where the wall and the arches stand clear of it.
  rho *= mix(0.1, 1.15, smoothstep(4.0, -14.0, p.x));
  // Over the brim it is in the wind and thins as it climbs: wisps, and at the breath a body.
  rho *= exp(-max(p.y, 0.0) / (8.0 + 7.0 * wells + 14.0 * surge));
  // Inside the wall; over the brim it leans out on the west, and at the breath all round.
  return rho * smoothstep(0.8, -1.5, out0 - smoothstep(-1.0, 3.0, p.y) * (8.0 * way + 5.0 * surge));
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
  float da = b + 1.2;
  way = exp(-da * da / 0.4);
  out0 = r - rimAt(b);
  float surge = uBreath.y * uShow.w;
  if (out0 < 0.8 + smoothstep(-1.0, 3.0, p.y) * (8.0 * way + 5.0 * surge)) return true;
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
  // The rays of the sun, as the lens sees them: a fan round the sun's place, slow to change, none at the sun itself or far from it,
  // and none looking down the shaft, where the light does not reach.
  float rays = smoothstep(0.3, 0.8, toSun) * smoothstep(0.999, 0.97, toSun) * smoothstep(-0.5, -0.2, rd.y);
  float fan = 0.0;
  if (rays > 0.01) {
    vec3 rayU = normalize(vec3(uSunDir.z, 0.0, -uSunDir.x));
    vec3 rayV = cross(uSunDir, rayU);
    float round0 = atan(dot(rd, rayV), dot(rd, rayU)) / 6.2831853;
    fan = smoothstep(0.3, 0.9, textureLod(tNoise, vec3(round0 * 2.6, 0.17, 0.3 + 0.008 * uTime), 0.0).g);
  }
  float roof = 8.0 + 10.0 * uBreath.y * uShow.w;
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
      for (int i = 0; i < ${STEPS}; i++) {
        float t = t0 + (float(i) + first) * dl;
        vec3 p = ro + rd * t;
        float out0;
        float way;
        if (!vapourNear(p, out0, way)) continue;
        vec4 land = landAt(p.xz);
        float rho = 0.0;
        float sunTau = 0.0;
        float under = 0.0;
        if (out0 < 9.0 + 5.0 * uBreath.y) {
          vec3 n = risingNoise(p, 1.0);
          rho = shaftRho(p, hy, out0, way, n, under);
          if (rho > 0.0004 && p.y - land.b > -2.6) {
            // Toward the sun, six metres on: the sun is low, so this is the next heap along.
            vec3 ps = p + uSunDir * 6.0;
            float unders;
            float os = length(ps.xz) - rimAt(atan(ps.x, -ps.z));
            sunTau = 9.0 * shaftRho(ps, 1.0, os, way, vec3(risingNoise(ps, 0.0).xy, 0.5), unders);
            // The sun is low: to reach a place a metre under the top its light has come seven metres through the fog.
            sunTau += 3.2 * rho * max(min(under, unders + 1.0), 0.0);
          }
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
        rho *= smoothstep(roof, roof - 4.0, p.y) * smoothstep(2.0, 14.0, t) * uShow.z;
        if (rho <= 0.0004) continue;
        float tau = rho * dl;
        // The rim's shadow in the vapour is three metres deep and stands higher and lower by the heaps: light gets about in it.
        float sun = smoothstep(-2.6, 1.2, p.y - land.b) * sunCloud(p.xz);
        // Looking up the light, the sun comes through the vapour in rays: what stands between it and a place (the banks, the fronds, the
        // heaps up the light) lets it through in bars that run along the sun's own line, so they fan from the sun in the frame.
        sun *= mix(1.0, 0.82 + 0.4 * fan, rays);
        // Down the shaft the sky closes to a disc overhead, and what lies deep under the top is in the shade of what lies over it.
        float sunk = clamp(1.0 + min(p.y - 1.0, 0.0) / 26.0, 0.22, 1.0);
        float roofed = exp(-0.09 * max(under, 0.0));
        // The far side of the shaft faces the low sun: the fog there takes its warmth second hand, from the lit wall over it.
        float facing = smoothstep(-25.0, 20.0, -dot(p.xz, normalize(uSunDir.xz)));
        vec3 light = (vec3(0.145, 0.155, 0.17) * sunk * sunk + uSunColour * (0.007 * facing * sunk * sunk)) * (0.2 + 0.8 * roofed)
          + mix(uSunColour, vec3(2.5), 0.55) * (sun * (0.22 * min(phase, 1.8) * exp(-1.6 * sunTau) + (0.02 + 0.1 * toSun * toSun) * exp(-0.22 * sunTau)));
        float gone = exp(-tau);
        colour += through * (1.0 - gone) * VAPOUR_ALBEDO * light;
        through *= gone;
        if (through < 0.015) break;
      }
    }
  }

  // Rays in the air up the light: the damp air between the lens and the low sun is lit in bars, by the gaps in what stands up the light
  // of it. The bars are far longer than the place, so from anywhere in it they fan from the sun the same way: the more air a pixel looks
  // through, the more of them it carries, so what is near stands dark before them.
  if (rays > 0.01 && uShow.z > 0.5) {
    // After the breath the air over the place is damp with what it let out, and carries them the more.
    colour += through * mix(uSunColour, vec3(2.4), 0.3) * ((0.022 + 0.08 * uBreath.w * uShow.w) * rays * fan * min(far, 90.0) / 90.0);
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
        girth *= 0.82 + 0.2 * sin(1.7 * rise - 0.5 * uTime + 40.0 * D.y) + 0.12 * sin(3.1 * rise - 0.8 * uTime + 17.0 * D.y);
        float m = clamp(min(1.0 - dot(qn, qn), 1.0 - dot(qn.xz, qn.xz) / (girth * girth)), 0.0, 1.0);
        if (m <= 0.0) continue;
        vec3 q = (pw - vec3(0.0, uBodyD[i].w * uTime, 0.0)) / C.z + D.y;
        q.xz -= WINDV * (uTime * 2.0 / C.z) * up;
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
        vec3 light = ambient * (0.45 + 0.55 * n0.r) + mix(uSunColour, vec3(2.2), 0.6) * (sunHere * min(phase, 2.4) * 0.5 * glow * D.z);
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
    q.xz -= WINDV * (uTime * 2.0 / C.z);
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
