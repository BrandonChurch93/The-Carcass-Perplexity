// The one half-size pass of the Breath's air. It writes the light the air scatters toward the camera in rgb and how much of the scene it lets
// through in alpha. Three things are in it, nearest first:
//   the vapour of the main shaft, a density in space cut from the block of noise and marched, each step shaded by what stands between it
//   and the sun: it fills the shaft, wells up over the brim when the shaft breathes out, pours over the west lip and thins on the rock;
//   the far bodies (the plumes of the smaller shafts, the fog banks, the fog that pours from the cave), each one ray-against-ellipsoid, no march;
//   the dawn haze itself, in closed form.
// Everything is lit by the rig: the sky's cold light from above, the low sun wherever the land's baked shadow lets it through.
import { HASH_GLSL } from '../../../core/post';
import { RIG_GLSL } from '../shared/glsl';

export const MAX_BODIES = 32;

/** March steps of the vapour of the main shaft. The cost of the pass is close to linear in this wherever the vapour is in view. */
export const STEPS = 36;

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

// The vapour of the main shaft as a density in space: metres of path it takes to dim by 1/e, inverted. Three things, one field:
//   what stands in the shaft, a body under a top that is thin and frayed; the top climbs the west wall to the lip it leaves by;
//   the breath, which lifts that top over the brim as a dome and lets it down again;
//   what pours over the west-north-west lip and lies on the rock, sliding with the wind and thinning as it goes.
// All of it is eaten by the block of noise, which climbs and drifts: so it has billows with gaps between them, and they well up.
// fine 1 reads the small billows too (the march); 0 does not (the taps toward the sun).
float vapourRho(vec3 p, float ground, float fine) {
  float r = length(p.xz);
  float b = atan(p.x, -p.z);
  float rim = rimAt(b);
  float out0 = r - rim;
  float da = b + 1.2;
  float way = exp(-da * da / 0.5);
  float west = smoothstep(0.35, -0.6, sin(b));
  float surge = uBreath.y * uShow.w;
  float apron = uBreath.z * uShow.w;
  vec3 q = p - vec3(WINDV.x * 0.7, 0.9, WINDV.y * 0.7) * uTime;
  vec4 n0 = textureLod(tNoise, q.xzy / 23.0, 0.0);
  float shape = 0.8 * n0.r + 0.2 * n0.a;
  if (fine > 0.5) shape += 0.34 * (textureLod(tNoise, q.xzy / 7.3 + 0.31, 0.0).b - 0.5);

  // In the shaft.
  float level = mix(-8.0, uBreath.x + 1.0, uShow.w);
  float toLip = smoothstep(-24.0, -1.0, out0);
  float top = level + (8.0 * way + 2.5 * west) * toLip * (1.0 - 0.7 * surge) + surge * (8.0 + 5.0 * smoothstep(rim, 6.0, r));
  float under = top - p.y;
  float cover = smoothstep(-5.0 - 5.0 * surge, 5.0, under);
  float inside = smoothstep(0.8, -1.5, out0 - 3.0 * smoothstep(0.0, 4.0, p.y) * (0.3 + 0.7 * surge));
  float body = (0.006 + 0.03 * smoothstep(0.0, 22.0, under)) * mix(0.3, 1.3, smoothstep(12.0, -22.0, p.x + 0.4 * p.z)) * (1.0 + 0.8 * surge);
  float rho = inside * body * smoothstep(0.0, 0.4, cover * 0.9 + shape * 1.3 - 0.95);

  // On the rock by the lip.
  float foot = max(ground, SEA_Y);
  float above = p.y - foot;
  float tall = ((0.6 + 1.2 * apron + 3.0 * surge) * way + 0.45 * west * (0.4 + 0.6 * apron)) * exp(-max(out0, 0.0) / (6.0 + 15.0 * apron + 5.0 * surge));
  float lies = smoothstep(tall * 1.7 + 0.4, tall * 0.15, above) * smoothstep(-2.5, 0.8, out0) * step(-0.3, above);
  float pour = (0.01 + 0.02 * apron + 0.02 * surge) * min(1.0, tall * 1.5) * smoothstep(0.0, 0.35, lies * 0.8 + shape * 1.2 - 1.0);
  return max(rho, pour) * uShow.z;
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
  vec3 ambient = 0.62 * uSkyHorizon + 0.38 * uSkyZenith + 0.12 * uGlowColour;
  vec3 colour = vec3(0.0);
  float through = 1.0;

  // The vapour of the main shaft: marched through a drum round the shaft and the lip it pours over, from down in the shaft to a little over
  // the dome of the breath. Each step asks the density where it is, and asks it again at three places toward the sun: what stands between
  // the step and the sun shades it, so a billow has a lit side and a dark one, and where the view runs toward the sun its thin edges burn.
  // The steps are even and are not jittered: one sample a frame at the low tier would leave a jitter as speckle. The density is soft enough
  // (nothing in it is smaller than two steps) that they do not band.
  vec2 middle = vec2(-7.0, -3.0);
  float drum = 54.0;
  float roof = 6.0 + 12.0 * uBreath.y * uShow.w + 3.0 * uBreath.z * uShow.w;
  if (uShow.z > 0.5) {
    float t0 = 0.0;
    float t1 = far;
    if (abs(rd.y) > 1e-5) {
      float ta = (roof - ro.y) / rd.y;
      float tb = (-44.0 - ro.y) / rd.y;
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
      for (int i = 0; i < ${STEPS}; i++) {
        vec3 p = ro + rd * (t0 + (float(i) + 0.5) * dl);
        vec4 land = landAt(p.xz);
        float rho = vapourRho(p, land.r, 1.0);
        if (rho <= 0.0004) continue;
        float tau = rho * dl;
        // Toward the sun: 2, 6 and 15 metres on.
        float shade = 3.5 * vapourRho(p + uSunDir * 2.0, land.r, 0.0) + 6.0 * vapourRho(p + uSunDir * 6.0, land.r, 0.0) + 10.0 * vapourRho(p + uSunDir * 15.0, land.r, 0.0);
        float sun = sunSeen(land, p.y);
        // Down the shaft the sky closes to a disc overhead, and what is deep in the vapour is under the rest of it.
        float sunk = clamp(1.0 + min(p.y, 0.0) / 30.0, 0.08, 1.0);
        float deep = exp(-18.0 * rho);
        vec3 light = ambient * sunk * sunk * (0.3 + 0.7 * deep)
          + uSunColour * (sun * (0.35 * phase * exp(-1.3 * shade) + 0.03 * exp(-0.3 * shade)));
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
    vec3 light = ambient * tint * (0.7 + 0.3 * tops) * (0.25 + 0.75 * sunkBody) + uSunColour * (sunAt(mid) * sunkBody * phase * (0.2 + 0.8 * tops) * D.z);
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
