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
/** The ground mist: the stretches a view is cut into, where it starts and ends (metres along the view), how high it is read (metres),
 *  how deep a bank stands (metres) and how much of a surface's light a metre of it takes at the ground. */
export const MIST = { steps: 10, near: 5, far: 2400, top: 26, deep: 1.6, thick: 0.0045 };
/** The shade of what stands close: reads of the frame's depth round each texel, the reach as a share of the distance, how far off it
 *  ends (metres) and how deep it goes. */
export const OCC = { ways: 4, taps: 3, reach: 0.12, far: 420, depth: 2.0 };
/** How far the near air is counted over the sky, metres. */
// How fast the rain walks along the horizon, in radians a second. The sky's raining cloud keeps the same pace.
export const RAIN_WALK = 0.016;
// The place's second (uTime is 0 at the place's first frame) at which a shaft stands on the rain's bearing. Set so that one hangs right of
// the middle of the first lens at its key, where the approved picture has it, and behind the wallowers when the fourth comes to them.
export const RAIN_AT = -2.3;
// The shafts stand this far round from the rain's bearing, in radians, and the sky's far picture is turned with them (its sheet is laid by
// the bearing alone and stays where it was). Set so that the one curtain of the first lens hangs right of its middle at its key, where the
// approved picture has it, and so that the first lens sees the far picture as it was taken: the escarpment from its left hand to its middle.
export const RAIN_TURN = 1.142;
export const HAZE_OVER_SKY = 500;
// The shafts of rain stand this far apart along the horizon, in radians: wider than the widest lens, so no lens holds two.
export const RAIN_APART = 1.3;
// The overcast is not one weight: each shot after the first looks another way under it, and its sky and far air keep the share of their
// light that its approved picture shows. From the place's second `from` (the cuts of the film at frames 5833, 6048 and 6263 of a place
// that opens at 5618) the share is `share`. It changes on a cut and never inside a shot.
export const DUSK_SHOTS: { from: number; share: number }[] = [
  { from: (5833 - 5618) / 60, share: 0.62 },
  { from: (6048 - 5618) / 60, share: 0.75 },
  { from: (6263 - 5618) / 60, share: 0.52 },
];
/** GLSL: the share of its light the sky and the far air keep at the place's second t. Shared by the sky and the air pass. */
export const DUSK_GLSL = /* glsl */ `
float duskAt(float t) {
  float d = 1.0;
${DUSK_SHOTS.map((shot) => `  d = mix(d, ${shot.share.toFixed(4)}, step(${shot.from.toFixed(5)}, t));`).join('\n')}
  return d;
}`;
// The lenses that stand low and close (on the colony, the pool and the animals) see the distance go out in the vapour of the flats: their pictures have no far
// flats and no far hills, only a warm grey in which the nearer stalks stand faint. From the place's second `from` the air beyond the
// animals takes up to `depth` (an optical depth) of what lies behind it, coming on between `reach` metres, and gives `light` for it.
// Nothing of it lies between the lens and the animals. It changes on a cut and never inside a shot.
export const SWALLOW = { shots: [{ from: (5833 - 5618) / 60, depth: 0.6 }, { from: (6048 - 5618) / 60, depth: 0.5 }, { from: (6263 - 5618) / 60, depth: 1.3 }, { from: (6586 - 5618) / 60, depth: 0.3 }], reach: [20, 140], light: [0.36, 0.33, 0.35] };
// The cast shade of what stands over the ground: ways up into the sky, reads on each, reach in metres as a share of the distance, depth.
export const CAST = { ways: 3, taps: 3, reach: 0.22, depth: 0.68 };

/** The low air: the vapour that lies on the warm brine and the wet flats, lit from under by them, so warm and pink where the sky's air over it
 *  is cool. How much of a surface's light a metre of it takes at the ground, the height in metres at which it has thinned to a third,
 *  its light, how far it is counted over the sky (metres) and the share of it that counts there (the far picture has its own air, and its
 *  escarpment is to be seen through this one), and how much of the dusk it takes. A lens that stands in it sees the distance
 *  close in it; a lens that stands over it sees through it to the near ground and loses the far flats in it. Near the lens it counts for
 *  the share `near`, and whole from the second of the two distances `whole` on (metres): the near ground keeps its darks. */
export const LOW_AIR = { density: 0.0012, height: 9, light: [0.45, 0.375, 0.405], overSky: 4000, skyShare: 0.28, dusk: 0.9, near: 0.15, whole: [60, 900] };
/** Steam is vapour, never a wall: the most of the view a whole depth of it may take, the metres from the lens between which it comes in
 *  (a lens that stands in a column sees through it), the light of its foot over the brine, the height in metres at which it is the sky's, how much of the dusk it takes and how much of the
 *  sky's light its top gives back (vapour is greyer than the sheet it stands against). */
export const STEAM_LOOK = { most: 0.7, near: [0.5, 2.5], foot: [0.56, 0.45, 0.46], whole: 1.6, dusk: 0.8, grey: 0.74 };
/** The rain hangs from its cloud to the flats and no higher: the top of the curtain as the tangent of its height over the horizon. */
export const RAIN_TOP = 0.1;
/** The fourth shot (film frames 6263 to 6585 of a place that opens at 5618, 60 a second) stands low in the wallow's own vapour: the share
 *  of the view the near air takes there and nowhere else. It lifts that shot's darks to the picture's. */
export const WALLOW_VEIL = { from: (6263 - 5618) / 60, to: (6586 - 5618) / 60, share: 0.016 };
/** The seconds of the place between which each zone that is kept clear of low steam holds: the wallow's from the fourth shot on, the
 *  colony's through the second shot (film frames 5833 to 6047). */
export const CLEAR_FROM = { wallow: (6263 - 5618) / 60, colony: [(5833 - 5618) / 60, (6048 - 5618) / 60] as [number, number] };

const f = (v: number): string => v.toFixed(5);
const v3 = (v: readonly number[]): string => `vec3(${v.map(f).join(', ')})`;

export const VOLUME_FRAGMENT = /* glsl */ `
precision highp float;
#define MIST_STEPS ${MIST.steps}
#define MIST_NEAR ${f(MIST.near)}
#define MIST_FAR ${f(MIST.far)}
#define MIST_TOP ${f(MIST.top)}
#define MIST_DEEP ${f(MIST.deep)}
#define MIST_THICK ${f(MIST.thick)}
#define HAZE_OVER_SKY ${f(HAZE_OVER_SKY)}
#define RAIN_WALK ${f(RAIN_WALK)}
#define RAIN_AT ${f(RAIN_AT)}
#define RAIN_TURN ${f(RAIN_TURN)}
#define OCC_TAPS ${OCC.taps}
#define OCC_WAYS ${OCC.ways}
#define OCC_REACH ${f(OCC.reach)}
#define OCC_FAR ${f(OCC.far)}
#define OCC_DEPTH ${f(OCC.depth)}
#define CAST_WAYS ${CAST.ways}
#define CAST_TAPS ${CAST.taps}
#define CAST_REACH ${f(CAST.reach)}
#define CAST_DEPTH ${f(CAST.depth)}
#define RAIN_APART ${f(RAIN_APART)}
#define SWALLOW_A ${f(SWALLOW.reach[0] as number)}
#define SWALLOW_B ${f(SWALLOW.reach[1] as number)}
#define SWALLOW_LIGHT ${v3(SWALLOW.light)}
#define LOW_DENSITY ${f(LOW_AIR.density)}
#define LOW_K ${f(1 / LOW_AIR.height)}
#define LOW_LIGHT ${v3(LOW_AIR.light)}
#define LOW_OVER_SKY ${f(LOW_AIR.overSky)}
#define LOW_SKY_SHARE ${f(LOW_AIR.skyShare)}
#define LOW_DUSK ${f(LOW_AIR.dusk)}
#define LOW_NEAR ${f(LOW_AIR.near)}
#define LOW_WHOLE_A ${f(LOW_AIR.whole[0] as number)}
#define LOW_WHOLE_B ${f(LOW_AIR.whole[1] as number)}
#define STEAM_MOST ${f(STEAM_LOOK.most)}
#define STEAM_NEAR_A ${f(STEAM_LOOK.near[0] as number)}
#define STEAM_NEAR_B ${f(STEAM_LOOK.near[1] as number)}
#define STEAM_FOOT ${v3(STEAM_LOOK.foot)}
#define STEAM_WHOLE ${f(STEAM_LOOK.whole)}
#define STEAM_DUSK ${f(STEAM_LOOK.dusk)}
#define STEAM_GREY ${f(STEAM_LOOK.grey)}
#define RAIN_TOP ${f(RAIN_TOP)}
#define VEIL_FROM ${f(WALLOW_VEIL.from)}
#define VEIL_TO ${f(WALLOW_VEIL.to)}
#define VEIL_SHARE ${f(WALLOW_VEIL.share)}
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
varying vec2 vUv;
${HASH_GLSL}
${RIG_GLSL}
${DUSK_GLSL}

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

// The place at a full-size pixel, as the camera sees it (x right, y up, the view down -z).
vec2 occTexel;
vec2 occLens;
vec3 seenAt(ivec2 px) {
  // (The lens is taken as square on its axis, which spares a whole matrix for each read.)
  px = clamp(px, ivec2(0), textureSize(tDepth, 0) - 1);
  vec2 ndc = (vec2(px) + 0.5) * occTexel * 2.0 - 1.0;
  float w = uInvProjection[2][3] * (texelFetch(tDepth, px, 0).r * 2.0 - 1.0) + uInvProjection[3][3];
  return vec3(ndc * occLens, uInvProjection[3][2]) / w;
}
float closedIn(ivec2 pixel) {
  occTexel = 1.0 / vec2(textureSize(tDepth, 0));
  occLens = vec2(uInvProjection[0][0], uInvProjection[1][1]);
  vec3 P = seenAt(pixel);
  float dist = -P.z;
  if (dist > OCC_FAR) return 1.0;
  // The surface's facing, from the nearer neighbour on each side, so that an edge does not bend it.
  vec3 l = seenAt(pixel - ivec2(2, 0));
  vec3 r = seenAt(pixel + ivec2(2, 0));
  vec3 d = seenAt(pixel - ivec2(0, 2));
  vec3 u = seenAt(pixel + ivec2(0, 2));
  vec3 dx = abs(r.z - P.z) < abs(P.z - l.z) ? r - P : P - l;
  vec3 dy = abs(u.z - P.z) < abs(P.z - d.z) ? u - P : P - d;
  vec3 n = normalize(cross(dx, dy));
  // The reach grows with distance, so that a far animal still stands on its own shade; near the lens it is a hand to a stride.
  float reach = clamp(OCC_REACH * dist, 0.5, 8.0);
  float pixels = 0.5 * reach / (dist * uInvProjection[1][1]) * float(textureSize(tDepth, 0).y);
  pixels = min(pixels, 0.2 * float(textureSize(tDepth, 0).y));
  ivec2 here = ivec2(gl_FragCoord.xy);
  float turn = 6.2832 / float(OCC_WAYS) * float(hash2(uint(here.x) + uint(uSampleIndex) * 977u, uint(here.y) + uint(uSampleIndex) * 331u) & 1023u) / 1024.0;
  // Four ways out from the point, turned for each texel and each sample of the frame; on each the highest thing within reach counts,
  // which is steadier from one texel to the next than a scatter of reads.
  float start = float(hash2(uint(here.y) + uint(uSampleIndex) * 193u, uint(here.x) + uint(uSampleIndex) * 59u) & 1023u) / 1024.0;
  float sum = 0.0;
  for (int i = 0; i < OCC_WAYS; i++) {
    float a = turn + 6.2832 * float(i) / float(OCC_WAYS);
    vec2 way = vec2(cos(a), sin(a));
    float high = 0.0;
    for (int k = 0; k < OCC_TAPS; k++) {
      float f = (float(k) + 0.3 + 0.7 * start) / float(OCC_TAPS);
      vec3 v = seenAt(pixel + ivec2(way * (2.0 + pixels * f * f))) - P;
      float len = length(v) + 1e-4;
      high = max(high, (dot(n, v) / len - 0.1) * max(1.0 - len * len / (reach * reach), 0.0));
    }
    sum += high;
  }
  float open = clamp(1.0 - OCC_DEPTH * sum / float(OCC_WAYS), 0.0, 1.0);
  // The cast shade: from ground that faces the sky, a few ways up into it, each leaning a different way; where a body or a stalk
  // stands in one, that part of the sky is gone. (What stands in the way is taken to be as thick as it is near: a body, not a wall.)
  vec3 up = vec3(uCameraWorld[0].y, uCameraWorld[1].y, uCameraWorld[2].y);
  // (Far off the shade of a body is smaller than a texel: none is looked for there.)
  float level = smoothstep(0.25, 0.7, dot(n, up)) * smoothstep(220.0, 140.0, dist);
  float shaded = 0.0;
  if (level > 0.0) {
    vec3 east = vec3(uCameraWorld[0].x, uCameraWorld[1].x, uCameraWorld[2].x);
    vec3 south = vec3(uCameraWorld[0].z, uCameraWorld[1].z, uCameraWorld[2].z);
    float high = clamp(CAST_REACH * dist, 0.9, 4.5);
    vec3 from = P + n * (0.012 * dist + 0.02);
    for (int i = 0; i < CAST_WAYS; i++) {
      float a = turn * float(OCC_WAYS) / float(CAST_WAYS) + 6.2832 * float(i) / float(CAST_WAYS);
      vec3 way = normalize(up + 0.75 * (cos(a) * east + sin(a) * south));
      for (int k = 0; k < CAST_TAPS; k++) {
        float f = (float(k) + 0.25 + 0.75 * start) / float(CAST_TAPS);
        float s = high * f * f;
        vec3 Q = from + way * s;
        vec2 ndc = Q.xy / (occLens * -Q.z);
        if (abs(ndc.x) > 1.0 || abs(ndc.y) > 1.0) break;
        float before = seenAt(ivec2((ndc * 0.5 + 0.5) / occTexel)).z - Q.z;
        if (before > 0.03 * dist + 0.1 * s && before < 0.5 + 1.2 * s) {
          shaded += 1.0 - 0.8 * f;
          break;
        }
      }
    }
  }
  open *= 1.0 - CAST_DEPTH * level * shaded / float(CAST_WAYS);
  return mix(1.0, 0.36 + 0.64 * open, smoothstep(OCC_FAR, OCC_FAR * 0.4, dist));
}

// How much of the haze counts at t metres: the near air is clear and the far closes, as over a salt flat on a still wet day.
float nearThin(float t) {
  return mix(0.45, 0.8, smoothstep(80.0, 1400.0, t));
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
// The same sum for the low air.
float lowBetween(vec3 ro, vec3 rd, float a, float b) {
  float y = max(ro.y + rd.y * a, 0.0);
  float slope = rd.y * LOW_K;
  float len = b - a;
  float run = abs(slope * len) < 1e-3 ? len : (1.0 - exp(-slope * len)) / slope;
  return LOW_DENSITY * exp(-y * LOW_K) * run;
}

// The steam of source i at p: a column that widens and thins as it rises, torn into lumps that climb.
float steamShade;
float steamSide;
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
  // (Soft strands: a hard edge on them is cut into dots by the few steps a view takes through a column.)
  float shape = smoothstep(0.27 + 0.26 * h, 0.82, lumps * (0.75 + 0.6 * body));
  // How deep in the column's heart this is: low and on the axis is deep, the top and the rim are not.
  steamShade = body * (1.0 - h) * (0.45 + 0.55 * shape);
  // The rim toward the brighter side of the overcast is the lit one.
  steamSide = dot(d, RIG_KEY) * (1.0 - body);
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
  // The far air greys with the sky as the rain comes on.
  float dusk = duskAt(uTime);
  vec3 sum = vec3(0.0);
  float trans = 1.0;

  // Steam takes the sky's light, so it greys with the sky as the rain comes on: it is never brighter than the overcast behind it.
  // Its foot takes the light the brine throws up.
  vec3 steamLit = (uSkyZenith * 0.6 + uSkyHorizon * 0.4) * STEAM_GREY * mix(1.0, dusk, STEAM_DUSK);
  vec3 steamFoot = STEAM_FOOT * mix(1.0, dusk, STEAM_DUSK);
  ivec2 here = ivec2(gl_FragCoord.xy);
  // (Half a step of play, and a different one for each sample of a frame: the frame's samples together are smoother than any one.)
  float jitter = 0.25 + 0.5 * float(hash2(uint(here.x) + uint(uSampleIndex) * 131u, uint(here.y) + uint(uSampleIndex) * 71u) & 1023u) / 1024.0;
#ifdef SHEETS
  // The steam of each source, nearest first, each marched in its own stretch of the view: a far column is cut as finely as a near one.
  // Offsets are tied to the pixel, never to the sample: thin vapour must not flicker.
  if (uShow.z > 0.5) {
    for (int i = 0; i < ${MAX_STEAM}; i++) {
      if (i >= uSteamCount || trans < 0.02) break;
      vec4 A = uSteamA[i];
      vec4 B = uSteamB[i];
      // Only the part of the view between the source's foot and its top is worth the steps, and of that only what lies inside a round
      // wall set about the column. (The column leans: in a space that leans with it it stands straight, and the view is still a line.)
      float t0 = 0.0;
      float t1 = far;
      if (abs(rd.y) > 1e-4) {
        float ta = (A.y - 0.02 * B.z - ro.y) / rd.y;
        float tb = (A.y + B.z - ro.y) / rd.y;
        t0 = max(t0, min(ta, tb));
        t1 = min(t1, max(ta, tb));
      } else if (ro.y < A.y - 0.02 * B.z || ro.y > A.y + B.z) continue;
      if (t1 <= t0) continue;
      // The wall is as wide as the column is at the highest point the view reaches in it (steamAt's own bound).
      float highest = clamp((ro.y + rd.y * (rd.y > 0.0 ? t1 : t0) - A.y) / B.z, 0.0, 1.0);
      float wall = A.w * (1.8 + 5.26 * highest);
      vec2 o = ro.xz - A.xz - B.xy * (ro.y - A.y);
      vec2 v = rd.xz - B.xy * rd.y;
      float vv = dot(v, v);
      if (vv < 1e-8) {
        if (dot(o, o) > wall * wall) continue;
      } else {
        float b = dot(o, v) / vv;
        float disc = b * b - (dot(o, o) - wall * wall) / vv;
        if (disc < 0.0) continue;
        disc = sqrt(disc);
        t0 = max(t0, -b - disc);
        t1 = min(t1, -b + disc);
      }
      if (t1 <= t0) continue;
      float dt = (t1 - t0) / float(${STEAM_STEPS});
      for (int k = 0; k < ${STEAM_STEPS}; k++) {
        float tk = t0 + (float(k) + jitter) * dt;
        vec3 p = ro + rd * tk;
        float sigma = steamAt(p, i);
        if (sigma <= 0.0) continue;
        float a = (1.0 - exp(-sigma * dt)) * smoothstep(STEAM_NEAR_A, STEAM_NEAR_B, tk);
        // Steam is white where the sky reaches it, on its top and its rim, and grey in its heart, where its own body stands over it.
        sum += trans * a * mix(steamFoot, steamLit, smoothstep(0.0, STEAM_WHOLE, p.y - A.y)) * (mix(1.1, 0.62, smoothstep(0.05, 0.7, steamShade)) + 0.12 * steamSide);
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
        // (One sheet's wisps stand nearly over the next one's, a little downwind: together they are plumes that lean, with clear brine
        // between them. Sheets torn each its own way lay one over another into an even film, a flat soft card.)
        vec2 at = p.xz - wind * (uTime * (0.34 + 0.05 * fl) + 1.1 * y);
        vec2 push = (textureLod(tNoise, vec3(at / 23.0, 0.13 + 0.04 * fl + uTime * 0.017), 0.0).ga - 0.5) * 5.0;
        float big = textureLod(tNoise, vec3((at + push) / 9.5, 0.21 + 0.05 * fl + uTime * 0.03), 0.0).g;
        float small = textureLod(tNoise, vec3((at + push * 1.6) / 2.7, 0.33 + 0.09 * fl - uTime * 0.05), 0.0).b;
        float wisp = smoothstep(0.66, 0.92, big * 0.72 + small * 0.4 + 0.1 * min(cover, 1.0));
        if (wisp <= 0.0) continue;
        // How much of a sheet the view crosses: more the flatter it looks along it, and nothing where a solid stands in it.
        float crossed = min((0.2 + 0.09 * fl) / abs(rd.y), 2.5);
        float a = 1.0 - exp(-wisp * cover * crossed * 0.05 * exp(-y / 1.5));
        a *= smoothstep(0.25, 1.6, t) * smoothstep(0.0, 0.5, far - t);
        sum += trans * a * mix(steamFoot, steamLit, smoothstep(0.0, STEAM_WHOLE, y)) * 0.98;
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
        sum += trans * a * steamLit * (mix(1.1, 0.62, smoothstep(0.05, 0.7, steamShade)) + 0.12 * steamSide);
        trans *= 1.0 - a;
        if (trans < 0.02) break;
      }
    }
  }
#endif
  // However many columns and sheets a view crosses, what stands behind them is still seen through them.
  float steamed = 1.0 - trans;
  if (steamed > 0.0) {
    float keep = STEAM_MOST * (1.0 - exp(-steamed / STEAM_MOST)) / steamed;
    sum *= keep;
    trans = 1.0 - steamed * keep;
  }

  // The haze, and the rain inside it at its own distance.
  float curtain = uRain.z / max(length(rd.xz), 0.05);
  float az = atan(rd.x, -rd.z);
  // The shaft walks along the horizon with the wind, a degree a second, and the sky's raining cloud walks with it.
  // A shaft of rain is narrow at its foot and wide under its cloud, and the wind leans it.
  float elev = rd.y / max(length(rd.xz), 0.05);
  float walk = az - uRain.x - RAIN_TURN + RAIN_WALK * (uTime - RAIN_AT);
  // One shaft after another along the horizon, each its own width and weight; only the first is drawn: the place has one curtain, and
  // the lens of the thin crust, which the walk would bring a second one to, has a dry sky in its picture.
  float shaft = floor(walk / RAIN_APART + 0.5);
  walk -= shaft * RAIN_APART;
  float own = fract(sin(shaft * 12.9898 + 4.1) * 43758.5453);
  // The foot of a shaft trails behind its cloud: every streak leans the same way.
  // (Far off and seen square on, the trails hang straight.)
  float lean = walk + 0.02 * elev;
  float side = abs(lean) / (uRain.y * (0.8 + 0.5 * own) * (1.0 + 1.6 * max(elev, 0.0)));
  float rain = 0.0;
  if (uShow.y > 0.5 && far > curtain && side < 2.6 && rd.y > -0.02 && elev < RAIN_TOP && abs(shaft) < 0.5) {
    float el = elev;
    // It has no side: it thins away to either hand, and what is seen of it is slanting trails in veils of unlike weight, each veil
    // its own width and its own height. The veils walk with the shaft, change as they go, and their trails come down.
    float veils = textureLod(tNoise, vec3(lean * 2.3 + own, el * 0.9 + uTime * 0.018, 0.4 + uTime * 0.03), 0.0).g;
    float torn = textureLod(tNoise, vec3(lean * 7.0 + uTime * 0.005, el * 2.6 + 0.3 + uTime * 0.05, 0.8 + uTime * 0.04 + lean * 1.47), 0.0).b;
    // The trails: broad ones a degree or two across, which a small screen still shows, and fine ones inside them. They are the
    // lesser part of the veil: where the gaps between them are narrow, the gaps are what is seen, as pale beams.
    // (The noise is a tile, and a trail is a small part of it: each field slides through the tile's depth as it goes along the horizon,
    // so that no trail comes again a tile further on. Read flat, the veil was a comb of the same few teeth.)
    float broad = textureLod(tNoise, vec3(lean * 15.0 + own * 3.0, el * 0.22 + uTime * 0.02, 0.7 + uTime * 0.01 + lean * 2.55), 0.0).g;
    float fine = textureLod(tNoise, vec3(lean * 58.0, el * 0.5 + uTime * 0.045, 0.13 + lean * 9.86), 0.0).b;
    // The trails come down: each is made of heavier and lighter lengths, and those fall the height of the veil in two and a half seconds.
    float fall = textureLod(tNoise, vec3(lean * 31.0 + 0.4, el * 12.0 + uTime * 0.6, 0.37 + uTime * 0.02 + lean * 5.89), 0.0).g;
    float streaks = smoothstep(0.3, 0.75, broad * 0.14 + fine * 0.36 + fall * 0.5);
    float body = exp(-side * side * 1.1) * smoothstep(0.25, 0.75, veils * 0.7 + torn * 0.3 + 0.35 * exp(-side * side * 2.0));
    // It hangs from the belly of its cloud, whole under it and thinner as it comes down: much of it never reaches the flats.
    // (Its top is the cloud's belly, soft and a little uneven; each trail is its own length, and few come all the way down.)
    float top = RAIN_TOP * (0.85 + 0.4 * (veils - 0.5));
    float reachDown = 0.3 + 0.6 * textureLod(tNoise, vec3(lean * 61.0 + 0.7, 0.21 + uTime * 0.05 + lean * 7.93, 0.6 + uTime * 0.01 + lean * 14.03), 0.0).g;
    float base = smoothstep(top, top * 0.55, el) * mix(reachDown, 1.0, smoothstep(0.0, top * 0.45, el)) * smoothstep(-0.004, 0.012, el);
    rain = uRain.w * (0.7 + 0.6 * own) * body * base * (0.66 + 0.5 * streaks);
  }
  float show = uShow.x;
  // Where the view ends on the sky only the near air lies over it (the far picture has its own), but for its foot: there the air closes
  // over the picture's own ground, so the flats run out into white and have no last line.
  float reach = min(far, mix(60000.0, HAZE_OVER_SKY, open));
  float foot = 2.2 * exp(-max(elev, 0.0) / 0.006) * open * show;
  // The far air is not one even sheet. The overcast lets more light down in one place than in another, and the vapour lies on the flats
  // in banks: both stand in stretches, half a kilometre across and a hundred metres across, that travel with the wind, and a lens a few
  // metres up sees them edge on, as band behind band to the horizon. The air also lies in strata, thicker and thinner, which a level
  // view sees as long bands along the horizon. Near the lens there is too little air for any of it to show.
  // (Each field is read no finer than the stretch of flat one row of a small screen covers there, by distance alone and not by the
  // frame's size: far off the bands close into their mean, and nothing in them can flicker.)
  float farShare = smoothstep(80.0, 500.0, far);
  float along = mix(min(far, 5000.0), 1400.0, open);
  vec2 over = ro.xz + rd.xz / max(length(rd.xz), 0.05) * along - vec2(-0.96, -0.27) * 2.4 * uTime;
  float grain = along * along / max(ro.y, 1.0) * 0.0009;
  vec2 patchy = smoothstep(vec2(0.32), vec2(0.68), textureLod(tNoise, vec3(over / 900.0, 0.23 + uTime * 0.004), clamp(log2(grain / 14.0), 0.0, 6.0)).rg);
  vec2 banks = smoothstep(vec2(0.32), vec2(0.68), textureLod(tNoise, vec3(over / 240.0 + 0.37, 0.57 + uTime * 0.006), clamp(log2(grain / 3.75), 0.0, 6.0)).rg);
  float strata = smoothstep(0.32, 0.68, textureLod(tNoise, vec3(az * 1.3 + uTime * 0.003, elev * 22.0, 0.61 + uTime * 0.006), 0.0).b);
  float lightField = 0.5 * patchy.r + 0.5 * banks.r;
  float airLit = mix(1.0, 0.8 + 0.4 * lightField, farShare);
  float airBody = mix(1.0, 0.25 + 1.5 * mix(0.5 * patchy.g + 0.5 * banks.g, strata, 0.4), farShare);
  // (Low over the flats the far air takes the warm light of the low air: the flats fade into pink grey, not into white.)
  vec3 farLight = mix(airLight, LOW_LIGHT * 1.18, 0.55 * exp(-abs(elev) / 0.03)) * airLit;

  // The ground mist. It lies on the flats a few strides deep, thick in banks and thin between them, and the banks travel with the wind.
  // The view is cut into stretches that lengthen with distance, and each stretch reads the banks no finer than its own length (the noise's
  // smaller copies), so a far stretch takes the mean of what it crosses and nothing in it can flicker.
  float ta = MIST_NEAR;
  float tb = min(reach, MIST_FAR);
  if (rd.y > 1e-4) tb = min(tb, (MIST_TOP - ro.y) / rd.y);
  if (ro.y > MIST_TOP) {
    if (rd.y < -1e-4) ta = max(ta, (MIST_TOP - ro.y) / rd.y);
    else tb = -1.0;
  }
  float done = 0.0;
  if (show > 0.5 && tb > ta * 1.02) {
    float a0 = 1.0 - exp(-hazeBetween(ro, rd, 0.0, ta) * nearThin(0.5 * ta));
    sum += trans * a0 * airLight;
    trans *= 1.0 - a0;
    float ratio = pow(tb / ta, 1.0 / float(MIST_STEPS));
    float t0 = ta;
    vec2 wind = vec2(-0.96, -0.27) * 1.6 * uTime;
    for (int k = 0; k < MIST_STEPS; k++) {
      float t1 = t0 * ratio;
      float dt = t1 - t0;
      vec3 p = ro + rd * (t0 + dt * jitter);
      vec2 at = p.xz - wind;
      float lodBig = clamp(log2(dt / 20.0), 0.0, 6.0);
      float lodSmall = clamp(log2(dt / 6.0), 0.0, 6.0);
      vec4 big = textureLod(tNoise, vec3(at / 640.0, 0.37 + uTime * 0.002), lodBig);
      vec4 small = textureLod(tNoise, vec3(at / 190.0 + 0.5, 0.71 + uTime * 0.006), lodSmall);
      float shape = smoothstep(0.4, 0.68, big.g * 0.68 + small.a * 0.32);
      // Its top stands higher in a bank than between two. (Near the lens a bank is thinner than far off: seen from within, mist is
      // mostly the white of the distance.)
      float top = MIST_DEEP * (0.45 + 0.9 * shape + 0.5 * small.g);
      float sigma = MIST_THICK * (0.12 + 2.3 * shape) * exp(-max(p.y, 0.0) / top) * smoothstep(MIST_NEAR, MIST_NEAR * 6.0, t0 + dt * jitter) * mix(0.08, 1.0, smoothstep(60.0, 700.0, t0));
      float tau = sigma * dt + hazeBetween(ro, rd, t0, t1) * nearThin(t0 + 0.5 * dt);
      float a = 1.0 - exp(-tau);
      // A bank is white on top, where the whole sky lights it, and greyer in its depth, where its own top stands over it.
      float lit = exp(-sigma * top * 22.0 * exp(-max(p.y, 0.0) / top));
      // (A bank's foot stands in the low air and takes its light.)
      sum += trans * a * mix(LOW_LIGHT * 1.12, airLight, smoothstep(0.0, 10.0, p.y)) * airLit * mix(0.8, 1.08, lit) * mix(1.0, dusk, smoothstep(200.0, 2000.0, t0));
      trans *= 1.0 - a;
      t0 = t1;
    }
    done = tb;
  }
  float a = 1.0 - exp(-hazeBetween(ro, rd, done, max(reach, done)) * nearThin(0.5 * (done + max(reach, done))) * show - foot);
  sum += trans * a * farLight * mix(1.0, dusk, smoothstep(200.0, 2000.0, 0.5 * (done + max(reach, done))));
  trans *= 1.0 - a;
  if (rain > 0.0) {
    // The veil hangs far off in the air and is seen through it. Falling rain under an overcast is darker than whatever is behind it,
    // the sky or the far flats: it takes their light and gives little of its own.
    float r = 0.72 * (1.0 - exp(-rain)) * exp(-0.3 * hazeBetween(ro, rd, 0.0, curtain) * show);
    sum *= 1.0 - 0.8 * r;
    trans *= 1.0 - r;
  }
  // The low air lies over all of it: the foot of the rain and the last of the flats go out in it, and the horizon has no line.
  float low = lowBetween(ro, rd, 0.0, mix(far, LOW_OVER_SKY, open)) * mix(LOW_NEAR, 1.0, smoothstep(LOW_WHOLE_A, LOW_WHOLE_B, far)) * mix(1.0, LOW_SKY_SHARE, open) * airBody;
  low += VEIL_SHARE * step(VEIL_FROM, uTime) * step(uTime, VEIL_TO) * (1.0 - exp(-far * 0.4));
  float lowTaken = (1.0 - exp(-low)) * show;
  sum = sum * (1.0 - lowTaken) + LOW_LIGHT * airLit * mix(1.0, dusk, LOW_DUSK) * lowTaken;
  trans *= 1.0 - lowTaken;
  // The distance swallowed, for the lenses set close on the animals (SWALLOW). Over the sky it lies on the far picture's hills only.
  float swallow = 0.0;
${SWALLOW.shots.map((shot) => `  swallow = mix(swallow, ${shot.depth.toFixed(3)}, step(${shot.from.toFixed(5)}, uTime));`).join('\n')}
  float swallowed = (1.0 - exp(-swallow * smoothstep(SWALLOW_A, SWALLOW_B, far) * mix(1.0, exp(-max(elev, 0.0) / 0.05), open))) * show;
  sum = sum * (1.0 - swallowed) + SWALLOW_LIGHT * swallowed;
  trans *= 1.0 - swallowed;
  // What the nearness of things takes from a surface's light is taken before the air lies over it.
  // So is the slow shade of the cloud that crosses the flats.
  // (And the far flats stand in the same lit and shaded stretches as the air over them: a white flat in shade is grey, and has distance.)
  if (open < 0.5) trans *= closedIn(2 * here) * mix(rigCloud((ro + rd * far).xz), 1.0, smoothstep(2000.0, 6000.0, far)) * mix(1.0, 0.52 + 0.6 * lightField, farShare);
  gl_FragColor = vec4(sum, trans);
}`;
