// The one half-size pass of the Breath's air. It writes the light the air scatters toward the camera in rgb and how much of the scene it lets
// through in alpha. Three things are in it, nearest first:
//   the heavy vapour of the main shaft, which is a height field (a top over the ground, as a liquid has) marched in a few steps, each step
//   integrated over its own height so that a sheet thinner than a step is still drawn at its true thickness;
//   the far bodies (the plumes of the smaller shafts, the fog banks, the fog that pours from the cave), each one ray-against-ellipsoid, no march;
//   the dawn haze itself, in closed form.
// Everything is lit by the rig: the sky's cold light from above, the low sun wherever the land's baked shadow lets it through.
import { HASH_GLSL } from '../../../core/post';
import { RIG_GLSL } from '../shared/glsl';

export const MAX_BODIES = 16;

/** March steps of the heavy vapour. The cost of the pass is close to linear in this wherever the vapour is in view. */
export const STEPS = 20;

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
  if (depth >= 1.0) far = 30000.0;
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
  return 30.0 + 7.0 * bumpAt(b, 1.9548, 0.733) + 2.2 * bumpAt(b, 3.7525, 0.5236);
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

// The heavy vapour over a place on the ground: the height of its top, how thick it is for a metre (rho), and the height it stands on.
// It is a liquid of a kind: level in the shaft and in the channel, a sheet on the rock between them, thickest where it comes over the lip.
float vapourTop(vec2 xz, float ground, vec2 fold, out float rho, out float foot, out float soft) {
  float r = length(xz);
  float b = atan(xz.x, -xz.y);
  float rim = rimAt(b);
  float inside = smoothstep(rim + 0.6, rim - 1.2, r);
  // The lip it leaves by: west-north-west, where the plumes stand.
  float da = b + 1.2;
  float way = exp(-da * da / 0.42);
  float west = smoothstep(0.35, -0.6, sin(b)) * 0.6 + 0.4 * way;
  float surge = uBreath.y * uShow.w;
  float apron = uBreath.z * uShow.w;
  float spread = uBreath.w * uShow.w;
  float lumps = 0.45 + 1.25 * fold.x;

  // In the shaft: a level, with slow swells, that climbs the wall toward the lip it leaves by.
  float level = mix(-9.0, uBreath.x, uShow.w);
  float lip = 2.3 + 2.6 * surge;
  float climb = way * smoothstep(rim - 17.0, rim - 0.5, r);
  float shaftTop = mix(level, max(level, lip), climb * (0.55 + 0.45 * surge)) + (2.4 + 1.5 * surge) * (fold.x - 0.45) + 0.8 * (fold.y - 0.5);
  // The mass that stands over the mouth when it breathes out: highest toward the lip it leaves by.
  shaftTop += surge * 5.0 * way * smoothstep(rim - 24.0, rim - 6.0, r) * (0.5 + fold.x);

  // On the rock: a sheet that slides from that lip with the wind, and a thin one that creeps over the rim all along the west side.
  float out0 = r - rim;
  float tongue = way * smoothstep(15.0 + 12.0 * apron, 0.0, out0) * (0.55 + 2.0 * apron);
  float creep = west * smoothstep(5.0 + 3.0 * apron, 0.0, out0) * (0.2 + 0.5 * apron);
  float sheet = (tongue + creep) * lumps;
  // In the channel: it lies on the water between the banks, level as the water is, and spreads along it.
  float mid = channelMid(xz.y);
  float reach = 30.0 + 45.0 * spread;
  float along = exp(-pow((xz.y + 10.0 - 6.0 * spread) / reach, 2.0));
  float banks = smoothstep(channelWide(xz.y) + 9.0, channelWide(xz.y) - 2.0, abs(xz.x - mid));
  float pool = SEA_Y + (0.12 + 0.5 * spread + 0.3 * apron) * along * banks * smoothstep(0.3, 0.75, fold.x) * 1.6;
  foot = max(ground, SEA_Y);
  float open = max(foot + sheet, pool);
  // In the shaft it is a mist that thickens with depth, so that the hoops go into it one after the other; the breath is a mass with a top.
  rho = mix(mix(0.16, 0.3, smoothstep(0.3, 1.2, open - foot)), mix(0.1, 0.24, surge), inside);
  soft = mix(clamp(0.45 * (open - foot), 0.12, 2.2), mix(30.0, 9.0, surge), inside);
  foot = mix(foot, -60.0, inside);
  return mix(open, shaftTop, inside);
}

// The vapour's thickness gathered from its top down to d metres under it: thin at the top, where it frays, full a little way in.
float column(float d, float soft) {
  d = max(d, 0.0);
  return d < soft ? d * d / (2.0 * soft) : d - 0.5 * soft;
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
  thick = (t1 - t0) * m * B.w;
  mid = ro + rd * at;
  vec3 n = o + d * t0;
  n = vec3(cy * n.x - sy * n.z, n.y, sy * n.x + cy * n.z) / B.xyz;
  sunward = dot(normalize(n), uSunDir);
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
  vec3 ambient = 0.62 * uSkyHorizon + 0.38 * uSkyZenith;
  vec3 colour = vec3(0.0);
  float through = 1.0;

  // The heavy vapour: marched only where it can be, a drum round the shaft and the channel beside it, from the shaft's depth to a little over the rock.
  vec2 middle = vec2(-28.0, -6.0);
  float drum = 92.0;
  float roof = 5.0 + 11.0 * uBreath.y + 2.0 * uBreath.z;
  if (uShow.z + uShow.w > 0.0) {
    float t0 = 0.0;
    float t1 = far;
    if (abs(rd.y) > 1e-5) {
      float ta = (roof - ro.y) / rd.y;
      float tb = (-52.0 - ro.y) / rd.y;
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
      float jitter = rnd(ivec2(gl_FragCoord.xy), 11u);
      // Where the ray ends on something, the vapour lies near that end: the steps close up toward it.
      bool ends = t1 >= far - 0.01;
      float before = t0;
      vec3 sunStep = vec3(uSunDir.x, 0.0, uSunDir.z) * 1.6;
      for (int i = 0; i < ${STEPS}; i++) {
        float u = (float(i) + jitter) / ${STEPS}.0;
        float un = (float(i) + 1.0) / ${STEPS}.0;
        float k = ends ? 1.0 - (1.0 - un) * (1.0 - un) : un;
        float kj = ends ? 1.0 - (1.0 - u) * (1.0 - u) : u;
        float tEnd = mix(t0, t1, k);
        float tAt = mix(t0, t1, kj);
        float dl = tEnd - before;
        float ya = ro.y + rd.y * before;
        float yb = ro.y + rd.y * tEnd;
        before = tEnd;
        vec3 p = ro + rd * tAt;
        vec4 land = landAt(p.xz);
        // Nothing is read from the noise where the ray is well above anything the vapour can reach.
        float lo = min(ya, yb);
        if (lo > max(land.r, SEA_Y) + roof - 1.5 && lo > uBreath.x + 9.0 + 9.0 * uBreath.y) continue;
        float drift = uTime * 0.55;
        vec3 q = vec3((p.xz - WINDV * drift) / 13.0, uTime * 0.021).xzy;
        vec4 n0 = textureLod(tNoise, q, 0.0);
        vec4 n1 = textureLod(tNoise, q * 3.7 + vec3(0.31, uTime * 0.03, 0.17), 0.0);
        vec2 fold = vec2(0.72 * n0.r + 0.28 * n1.b, n0.g);
        float rho;
        float foot;
        float soft;
        float top = vapourTop(p.xz, land.r, fold, rho, foot, soft);
        float thickness = top - foot;
        if (thickness <= 0.02 || lo >= top) continue;
        float hi = max(ya, yb);
        float dy = max(hi - lo, 0.03);
        float held = (column(top - max(lo, foot), soft) - column(top - max(lo, foot) - dy, soft)) / dy;
        float tau = rho * dl * held * (uShow.z + uShow.w > 1.5 ? 1.0 : 0.9);
        if (tau <= 0.0005) continue;
        // The top's own shape toward the sun: a fold that faces it is bright, the one behind it is in its shade.
        vec4 ns = textureLod(tNoise, vec3((p.xz + sunStep.xz - WINDV * drift) / 13.0, uTime * 0.021).xzy, 0.0);
        float slope = (0.72 * (n0.r - ns.r)) * 2.2 + 0.5;
        float crest = clamp(0.35 + 0.9 * fold.x, 0.0, 1.0);
        float lit = clamp(slope, 0.0, 1.0);
        float sun = sunSeen(land, max(p.y, top - 0.4));
        float depth = clamp((top - p.y) / clamp(thickness, 0.5, 14.0), 0.0, 1.0);
        vec3 light = ambient * (0.5 + 0.5 * crest) * mix(1.0, 0.72, depth) * mix(0.55, 1.0, skyOpen(vec3(p.x, max(top, p.y), p.z)))
          + uSunColour * (sun * phase * (0.25 + 0.75 * lit) * mix(1.0, 0.45, depth));
        float gone = exp(-tau);
        colour += through * (1.0 - gone) * VAPOUR_ALBEDO * light;
        through *= gone;
        if (through < 0.01) break;
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
    float shown = D.x > 0.5 ? uShow.y : uShow.z;
    if (shown < 0.5) continue;
    float thick;
    float at;
    float sunward;
    vec3 mid;
    if (!bodyAt(i, ro, rd, far, thick, at, sunward, mid)) continue;
    vec4 C = uBodyC[i];
    vec3 q = (mid - vec3(0.0, uBodyD[i].w * uTime, 0.0)) / C.z + D.y;
    q.xz -= WINDV * (uTime * 0.6 / C.z);
    vec4 n0 = textureLod(tNoise, q, 0.0);
    vec4 n1 = textureLod(tNoise, q * 3.1 + 0.37, 0.0);
    float lumps = 0.62 * n0.r + 0.2 * n1.b + 0.3 * n0.g;
    float tau = thick * smoothstep(C.w - 0.22, C.w + 0.3, lumps);
    if (tau <= 0.002) continue;
    float here = air * hazeDepth(ro, rd, at);
    float seg = exp(-(here - done));
    colour += through * (1.0 - seg) * haze;
    through *= seg;
    done = here;
    float tops = clamp(0.5 + 0.5 * sunward + 0.5 * (n0.r - 0.4), 0.0, 1.0);
    vec3 light = ambient * (0.7 + 0.3 * tops) + uSunColour * (sunAt(mid) * phase * (0.2 + 0.8 * tops) * D.z);
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
