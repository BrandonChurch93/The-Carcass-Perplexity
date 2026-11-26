// The half-size pass of the marsh's air. It writes the light the air scatters toward the camera in rgb and how much of the scene it lets
// through in alpha: the haze that pales the flats toward the escarpment, the rain that hangs as a curtain over the far flats, and the steam
// of every source any folder has named (ctx.sources.steam).
import { HASH_GLSL } from '../../../core/post';
import { RIG_GLSL } from '../shared/glsl';

export const MAX_STEAM = 12;
export const STEAM_STEPS = 12;

export const VOLUME_FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform highp sampler2D tDepth;
uniform mat4 uInvProjection;
uniform mat4 uCameraWorld;
uniform int uSeq;
uniform int uSampleIndex;
uniform highp sampler3D tNoise;
// x air, y rain, z steam: 1 drawn, 0 not.
uniform vec3 uShow;
uniform int uSteamCount;
// x, y, z of the foot and its radius; lean on x and z, rise, thickness for a metre; own number, speed of rise, size of its lumps.
uniform vec4 uSteamA[${MAX_STEAM}];
uniform vec4 uSteamB[${MAX_STEAM}];
uniform vec4 uSteamC[${MAX_STEAM}];
// Where the rain hangs: bearing of its middle and half width in radians, distance in metres, thickness.
uniform vec4 uRain;
varying vec2 vUv;
${HASH_GLSL}
${RIG_GLSL}

void viewRay(out vec3 ro, out vec3 rd, out float far) {
  // The engine lays this half-size pass over the scene by depth, and takes each texel to have been marched to the depth of the full-size pixel at twice its index.
  ivec2 pixel = 2 * ivec2(gl_FragCoord.xy);
  float depth = texelFetch(tDepth, pixel, 0).r;
  vec2 uv = (vec2(pixel) + 0.5) / vec2(textureSize(tDepth, 0));
  vec4 view = uInvProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 world = (uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
  ro = uCameraWorld[3].xyz;
  rd = world - ro;
  far = length(rd);
  rd /= far;
  if (depth >= 1.0) far = 60000.0;
}

// Thickness of the haze along the view from a to b metres: it thins with height, so the sum has a closed form.
float hazeBetween(vec3 ro, vec3 rd, float a, float b) {
  float k = uAir.y;
  float y = max(ro.y + rd.y * a, 0.0);
  float slope = rd.y * k;
  float len = b - a;
  float run = abs(slope * len) < 1e-3 ? len : (1.0 - exp(-slope * len)) / slope;
  return uAir.x * exp(-y * k) * run;
}

// The steam of source i at p: a column that widens and thins as it rises, torn into lumps that climb.
float steamAt(vec3 p, int i) {
  vec4 A = uSteamA[i];
  vec4 B = uSteamB[i];
  vec4 C = uSteamC[i];
  float y = p.y - A.y;
  float h = y / B.z;
  if (h < -0.02 || h > 1.0) return 0.0;
  h = max(h, 0.0);
  // Far from the column there is nothing, and nothing is read.
  float radius = A.w * (1.0 + 2.6 * h);
  vec2 off = p.xz - A.xz - B.xy * y;
  float reach = radius * 1.6 + (0.2 + 1.1 * h) * A.w;
  if (dot(off, off) > reach * reach) return 0.0;
  // A slow wander of the whole column, more the higher it is.
  vec2 wander = (textureLod(tNoise, vec3(C.x, y * 0.02 - uTime * 0.03, C.x * 1.7), 0.0).ga - 0.5) * (0.4 + 2.2 * h) * A.w;
  vec2 centre = A.xz + B.xy * y + wander;
  vec2 d = (p.xz - centre) / radius;
  float body = exp(-dot(d, d) * 1.7);
  if (body < 0.02) return 0.0;
  // Vapour is drawn out along its rise into strands: the lumps are read taller than they are wide, at two sizes.
  vec3 q = (p - vec3(B.x, 1.0, B.y) * C.y * uTime) / C.z + C.x;
  q.y *= 0.45;
  float lumps = textureLod(tNoise, q, 0.0).r * 0.55 + textureLod(tNoise, q * 3.1 + 0.31, 0.0).b * 0.45;
  // Torn: there is clear air between the strands, more of it the higher they are.
  float shape = smoothstep(0.4 + 0.22 * h, 0.82, lumps * (0.75 + 0.6 * body));
  return B.w * shape * body * pow(1.0 - h, 1.2) * smoothstep(-0.02, 0.1, h + 0.02);
}

void main() {
  vec3 ro;
  vec3 rd;
  float far;
  viewRay(ro, rd, far);
  vec3 airLight = uAirColour;
  vec3 sum = vec3(0.0);
  float trans = 1.0;

  // The steam, marched only where the view passes a source. Offsets are tied to the pixel, never to the sample: thin vapour must not flicker.
  if (uShow.z > 0.5 && uSteamCount > 0) {
    float t0 = 1e9;
    float t1 = -1.0;
    for (int i = 0; i < ${MAX_STEAM}; i++) {
      if (i >= uSteamCount) break;
      vec4 A = uSteamA[i];
      vec4 B = uSteamB[i];
      float reach = A.w * 3.6 + 0.5 * B.z * (1.0 + length(B.xy));
      vec3 c = A.xyz + vec3(B.x, 1.0, B.y) * B.z * 0.5;
      vec3 oc = ro - c;
      float b = dot(oc, rd);
      float disc = b * b - dot(oc, oc) + reach * reach;
      if (disc < 0.0) continue;
      disc = sqrt(disc);
      if (-b + disc < 0.0) continue;
      t0 = min(t0, max(-b - disc, 0.0));
      t1 = max(t1, -b + disc);
    }
    t1 = min(t1, far);
    if (t1 > t0) {
      ivec2 pixel = ivec2(gl_FragCoord.xy);
      float jitter = float(hash2(uint(pixel.x), uint(pixel.y)) & 1023u) / 1024.0;
      float dt = (t1 - t0) / float(${STEAM_STEPS});
      vec3 lit = (uSkyZenith * 0.6 + uSkyHorizon * 0.4) * 0.97;
      for (int k = 0; k < ${STEAM_STEPS}; k++) {
        vec3 p = ro + rd * (t0 + (float(k) + jitter) * dt);
        float sigma = 0.0;
        for (int i = 0; i < ${MAX_STEAM}; i++) {
          if (i >= uSteamCount) break;
          sigma += steamAt(p, i);
        }
        if (sigma <= 0.0) continue;
        float a = 1.0 - exp(-sigma * dt);
        // Thick steam is a little darker in its heart than at its lit edge.
        sum += trans * a * lit * mix(1.0, 0.86, clamp(sigma * 1.5, 0.0, 1.0));
        trans *= 1.0 - a;
        if (trans < 0.02) break;
      }
    }
  }

  // The haze, and the rain inside it at its own distance.
  float curtain = uRain.z / max(length(rd.xz), 0.05);
  float az = atan(rd.x, -rd.z);
  float side = abs(az - uRain.x) / uRain.y;
  float rain = 0.0;
  if (uShow.y > 0.5 && far > curtain && side < 1.9 && rd.y > -0.02 && rd.y < 0.4) {
    float el = rd.y / max(length(rd.xz), 0.05);
    // Streaks that lean with the wind, in sheets of unlike weight.
    float lean = az * 40.0 + el * 9.0;
    float sheets = textureLod(tNoise, vec3(az * 1.7, 0.2, 0.4 + uTime * 0.002), 0.0).g;
    float streaks = textureLod(tNoise, vec3(lean * 0.33, el * 0.35 - uTime * 0.01, 0.7), 0.0).r * 0.55 + textureLod(tNoise, vec3(lean * 1.3, el * 0.8 - uTime * 0.02, 0.13), 0.0).b * 0.45;
    float edge = smoothstep(1.5, 0.0, side + (sheets - 0.5) * 1.6);
    edge *= edge;
    float base = smoothstep(0.3, 0.07 + 0.08 * sheets, el) * smoothstep(-0.004, 0.012, el);
    rain = uRain.w * edge * base * (0.35 + 1.3 * sheets) * (0.55 + 0.9 * streaks);
  }
  float show = uShow.x;
  // The haze lies in layers: thicker and thinner by the bearing and by how far off it is.
  float layers = far > 250.0 ? 0.8 + 0.4 * textureLod(tNoise, vec3(az * 0.9, log(far) * 0.8, 0.3 + uTime * 0.001), 0.0).r : 1.0;
  if (rain > 0.0) {
    float r = 1.0 - exp(-rain);
    // The air under the raining cloud is in its shade.
    float a = 1.0 - exp(-hazeBetween(ro, rd, 0.0, curtain) * show * layers);
    sum += trans * a * airLight * (1.0 - 0.5 * r);
    trans *= 1.0 - a;
    sum += trans * r * vec3(0.24, 0.25, 0.28);
    trans *= 1.0 - r;
    a = 1.0 - exp(-hazeBetween(ro, rd, curtain, far) * show * layers);
    sum += trans * a * airLight * (1.0 - 0.3 * r);
    trans *= 1.0 - a;
  } else {
    float a = 1.0 - exp(-hazeBetween(ro, rd, 0.0, far) * show * layers);
    sum += trans * a * airLight;
    trans *= 1.0 - a;
  }
  gl_FragColor = vec4(sum, trans);
}`;
