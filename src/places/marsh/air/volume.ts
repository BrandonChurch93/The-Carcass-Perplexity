// The half-size pass of the marsh's air. It writes the light the air scatters toward the camera in rgb and how much of the scene it lets
// through in alpha: the haze that pales the flats toward the escarpment, the rain that hangs as a curtain over the far flats, and the steam
// of every source any folder has named (ctx.sources.steam).
import { HASH_GLSL } from '../../../core/post';
import { RIG_GLSL } from '../shared/glsl';

export const MAX_STEAM = 12;
export const STEAM_STEPS = 8;
export const MAX_MIST = 8;
/** True: the low steam is drawn as drifting sheets, each column is marched in its own stretch of the view, and the far flats lie under a bank
 *  of mist. False: the columns only, marched together (version 2 of this folder, the cheaper one). */
export const SHEETS: boolean = true;

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
// The warm brine that breathes low steam: x, z of a patch, its radius, how thick its steam lies.
uniform int uMistCount;
uniform vec4 uMist[${MAX_MIST}];
// Where no low steam lies, whatever the patches say: x, z, radius in metres (the wallow, where the animals are to be seen whole).
uniform vec3 uClear[2];
uniform vec4 uBanks[3];
varying vec2 vUv;
${HASH_GLSL}
${RIG_GLSL}

void viewRay(out vec3 ro, out vec3 rd, out float far, out float open) {
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
  open = depth >= 1.0 ? 1.0 : 0.0;
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
  vec2 wander = (textureLod(tNoise, vec3(C.x, y * 0.02 - uTime * 0.09, C.x * 1.7), 0.0).ga - 0.5) * (0.4 + 2.2 * h) * A.w;
  vec2 centre = A.xz + B.xy * y + wander;
  vec2 d = (p.xz - centre) / radius;
  float body = exp(-dot(d, d) * 1.7);
  if (body < 0.02) return 0.0;
  // Vapour is drawn out along its rise into strands: the lumps are read taller than they are wide, at two sizes.
  vec3 q = (p - vec3(B.x, 1.0, B.y) * C.y * uTime * 1.7) / C.z + C.x;
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
  // 1 where the view ends on the sky. The sky's low band is a picture of the far distance with its own air in it: only the near air lies over it.
  float open;
  viewRay(ro, rd, far, open);
  vec3 airLight = uAirColour;
  vec3 sum = vec3(0.0);
  float trans = 1.0;

  vec3 steamLit = (uSkyZenith * 0.6 + uSkyHorizon * 0.4) * 0.97;
  ivec2 here = ivec2(gl_FragCoord.xy);
  float jitter = float(hash2(uint(here.x), uint(here.y)) & 1023u) / 1024.0;
#ifdef SHEETS
  // The steam of each source, nearest first, each marched in its own stretch of the view: a far column is cut as finely as a near one.
  // Offsets are tied to the pixel, never to the sample: thin vapour must not flicker.
  if (uShow.z > 0.5) {
    for (int i = 0; i < ${MAX_STEAM}; i++) {
      if (i >= uSteamCount || trans < 0.02) break;
      vec4 A = uSteamA[i];
      vec4 B = uSteamB[i];
      float reach = A.w * 3.6 + 0.5 * B.z * (1.0 + length(B.xy));
      vec3 c = A.xyz + vec3(B.x, 1.0, B.y) * B.z * 0.5;
      vec3 oc = ro - c;
      float b = dot(oc, rd);
      float disc = b * b - dot(oc, oc) + reach * reach;
      if (disc < 0.0) continue;
      disc = sqrt(disc);
      float t0 = max(-b - disc, 0.0);
      float t1 = min(-b + disc, far);
      // Only the part of the stretch between the source's foot and its top is worth the steps.
      if (abs(rd.y) > 1e-4) {
        float ta = (A.y - 0.02 * B.z - ro.y) / rd.y;
        float tb = (A.y + B.z - ro.y) / rd.y;
        t0 = max(t0, min(ta, tb));
        t1 = min(t1, max(ta, tb));
      }
      if (t1 <= t0) continue;
      float dt = (t1 - t0) / float(${STEAM_STEPS});
      for (int k = 0; k < ${STEAM_STEPS}; k++) {
        float sigma = steamAt(ro + rd * (t0 + (float(k) + jitter) * dt), i);
        if (sigma <= 0.0) continue;
        float a = 1.0 - exp(-sigma * dt);
        // Thick steam is a little darker in its heart than at its lit edge.
        sum += trans * a * steamLit * mix(1.0, 0.86, clamp(sigma * 1.5, 0.0, 1.0));
        trans *= 1.0 - a;
      }
    }
    // The low steam: it lies on the warm brine in sheets a hand to a stride up, torn into wisps and carried by the wind. Each sheet is met
    // by the view exactly, so a wisp keeps its edge at any distance.
    if (uMistCount > 0 && abs(rd.y) > 1e-4) {
      vec2 wind = vec2(-0.96, -0.27);
      for (int k = 0; k < 6; k++) {
        // Below the lens the sheets are met from the top one down, above it from the lowest up.
        int level = rd.y < 0.0 ? 5 - k : k;
        float fl = float(level);
        float y = 0.1 + 0.26 * fl + 0.055 * fl * fl;
        float t = (y - ro.y) / rd.y;
        if (t <= 0.25 || t >= far) continue;
        vec3 p = ro + rd * t;
        // No sheet is level: it bellies and lifts, and the view meets it where it really is.
        float belly = textureLod(tNoise, vec3(p.xz / 19.0 + fl * 0.37, 0.4 + uTime * 0.011), 0.0).g - 0.5;
        t = clamp((y + belly * (0.25 + 0.14 * fl) - ro.y) / rd.y, 0.0, far);
        p = ro + rd * t;
        float cover = 0.0;
        for (int m = 0; m < ${MAX_MIST}; m++) {
          if (m >= uMistCount) break;
          vec2 d = (p.xz - uMist[m].xy - wind * y * 1.6) / (uMist[m].z * (1.0 + 0.3 * y));
          cover += uMist[m].w * exp(-dot(d, d));
        }
        cover *= smoothstep(uClear[0].z, uClear[0].z + 7.0, length(p.xz - uClear[0].xy)) * smoothstep(uClear[1].z, uClear[1].z + 7.0, length(p.xz - uClear[1].xy));
        if (cover < 0.004) continue;
        // Carried downwind at the pace of a walk, the upper sheets faster than the lower; pushed about by a second, slower field.
        vec2 at = p.xz - wind * uTime * (0.34 + 0.16 * fl);
        vec2 push = (textureLod(tNoise, vec3(at / 23.0, 0.13 * fl + uTime * 0.017), 0.0).ga - 0.5) * 5.0;
        float big = textureLod(tNoise, vec3((at + push) / 9.5, 0.21 * fl + uTime * 0.03), 0.0).g;
        float small = textureLod(tNoise, vec3((at + push * 1.6) / 2.7, 0.33 * fl - uTime * 0.05), 0.0).b;
        float wisp = smoothstep(0.66, 0.92, big * 0.72 + small * 0.4 + 0.1 * min(cover, 1.0));
        if (wisp <= 0.0) continue;
        // How much of a sheet the view crosses: more the flatter it looks along it, and nothing where a solid stands in it.
        float crossed = min((0.2 + 0.09 * fl) / abs(rd.y), 2.5);
        float a = 1.0 - exp(-wisp * cover * crossed * 0.14 * exp(-y / 1.5));
        a *= smoothstep(0.25, 1.6, t) * smoothstep(0.0, 0.5, far - t);
        sum += trans * a * steamLit * 0.98;
        trans *= 1.0 - a;
      }
    }
  }
#else
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
      float dt = (t1 - t0) / 12.0;
      for (int k = 0; k < 12; k++) {
        vec3 p = ro + rd * (t0 + (float(k) + jitter) * dt);
        float sigma = 0.0;
        for (int i = 0; i < ${MAX_STEAM}; i++) {
          if (i >= uSteamCount) break;
          sigma += steamAt(p, i);
        }
        if (sigma <= 0.0) continue;
        float a = 1.0 - exp(-sigma * dt);
        sum += trans * a * steamLit * mix(1.0, 0.86, clamp(sigma * 1.5, 0.0, 1.0));
        trans *= 1.0 - a;
        if (trans < 0.02) break;
      }
    }
  }
#endif

  // The haze, and the rain inside it at its own distance.
  float curtain = uRain.z / max(length(rd.xz), 0.05);
  float az = atan(rd.x, -rd.z);
  // The shaft walks along the horizon with the wind, a degree in six seconds.
  // A shaft of rain is narrow at its foot and wide under its cloud, and the wind leans it.
  float elev = rd.y / max(length(rd.xz), 0.05);
  float side = abs(az - uRain.x - 0.003 * uTime - 0.55 * elev) / (uRain.y * (1.0 + 1.6 * max(elev, 0.0)));
  float rain = 0.0;
  if (uShow.y > 0.5 && far > curtain && side < 2.6 && rd.y > -0.02 && rd.y < 0.5) {
    float el = elev;
    // It has no side: it thins away to either hand, and what is seen of it is slanting streaks in veils of unlike weight, each veil
    // its own width and its own height.
    float lean = az * 40.0 + el * 22.0;
    float veils = textureLod(tNoise, vec3((az + 0.55 * el) * 2.3 - uTime * 0.004, el * 0.9, 0.4 + uTime * 0.012), 0.0).g;
    float torn = textureLod(tNoise, vec3((az + 0.55 * el) * 7.0, el * 2.6 + 0.3, 0.8 + uTime * 0.02), 0.0).b;
    float streaks = textureLod(tNoise, vec3(lean * 0.33, el * 0.35 - uTime * 0.03, 0.7), 0.0).r * 0.55 + textureLod(tNoise, vec3(lean * 1.3, el * 0.8 - uTime * 0.07, 0.13), 0.0).b * 0.45;
    float body = exp(-side * side * 1.1) * smoothstep(0.25, 0.75, veils * 0.7 + torn * 0.3 + 0.35 * exp(-side * side * 2.0));
    float base = smoothstep(0.42, 0.1 + 0.1 * veils, el) * smoothstep(0.0, 0.07, el);
    rain = uRain.w * body * base * (0.75 + 0.5 * streaks);
  }
  float show = uShow.x;
  // The haze lies in layers: thicker and thinner by the bearing and by how far off it is.
  float layers = far > 250.0 ? 0.8 + 0.4 * textureLod(tNoise, vec3(az * 0.9, log(far) * 0.8, 0.3 + uTime * 0.001), 0.0).r : 1.0;
  // The bank of mist the far flats lie under: it starts some hundreds of strides out, thickens in steps, and stands a few degrees high, so
  // that the land has no last line against the sky.
  float bank = 0.0;
#ifdef SHEETS
  {
    float reach = min(far, mix(9000.0, 1100.0, open));
    float mid = max(ro.y + rd.y * 0.5 * (reach + 230.0), 0.0);
    float steps = 0.75 + 0.5 * textureLod(tNoise, vec3(az * 1.3, log(max(reach, 1.0)) * 1.7, 0.6 + uTime * 0.002), 0.0).g;
    bank = 0.0019 * max(reach - 230.0, 0.0) * exp(-mid / (55.0 * steps)) * steps * show;
    // Over the sky the bank is only the foot of the far picture: it hides the picture's own ground and lets its hills stand.
    bank = mix(bank, 2.2 * exp(-max(elev, 0.0) / 0.011) * show, open);
    // Nearer than that, banks of mist stand over the far pools, each a wall a few strides high, broken along its length and drifting, so
    // the flats go off in steps and not in one grade. (x, z: the way they face; then how far along it; then how thick.)
    for (int k = 0; k < 3; k++) {
      vec4 B = uBanks[k];
      float along = dot(rd.xz, B.xy);
      if (abs(along) < 1e-3) continue;
      float t = (B.z - dot(ro.xz, B.xy)) / along;
      if (t <= 0.0 || t >= far) continue;
      vec3 p = ro + rd * t;
      float lateral = p.x * B.y - p.z * B.x + uTime * 0.35;
      vec4 lay = textureLod(tNoise, vec3(lateral / 120.0 + float(k) * 0.37, 0.31 + float(k) * 0.23, 0.2 + uTime * 0.003), 0.0);
      float top = 2.5 + 7.0 * lay.b;
      bank += B.w * smoothstep(0.42, 0.7, lay.g) * exp(-max(p.y, 0.0) / top) * min(1.0 / abs(along), 4.0) * smoothstep(0.0, 14.0, far - t) * show;
    }
  }
#endif
  if (rain > 0.0) {
    float r = 1.0 - exp(-rain);
    // The air under the raining cloud is in its shade.
    float a = 1.0 - exp(-hazeBetween(ro, rd, 0.0, curtain) * show * layers);
    sum += trans * a * airLight * (1.0 - 0.5 * r);
    trans *= 1.0 - a;
    sum += trans * r * vec3(0.24, 0.25, 0.28);
    trans *= 1.0 - r;
    a = 1.0 - exp(-hazeBetween(ro, rd, curtain, min(far, mix(60000.0, curtain + 600.0, open))) * show * layers - bank);
    sum += trans * a * airLight * (1.0 - 0.3 * r);
    trans *= 1.0 - a;
  } else {
    float a = 1.0 - exp(-hazeBetween(ro, rd, 0.0, min(far, mix(60000.0, 700.0, open))) * show * layers - bank);
    sum += trans * a * airLight;
    trans *= 1.0 - a;
  }
  gl_FragColor = vec4(sum, trans);
}`;
