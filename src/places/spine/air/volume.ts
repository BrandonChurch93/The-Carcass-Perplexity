// The half-size pass of the Spine's air. It writes the light the air sends toward the camera in rgb and how much of the scene it lets through in alpha.
// Nothing in it is marched through with a jittered stride, so nothing in it has grain: the storm is a body whose face each view ray walks up to, the
// cloud under the crest (the sea far below, the bank against the lee, the pour through the saddles) is a deck of heaps each ray walks to, the spindrift is a
// column over the snow, and the haze of the height is worked out in one. All of it reads the rig, so the cloud takes the dusk and the lightning as the rock does.
import { HASH_GLSL } from '../../../core/post';
import { MOUTH, SEA_LEVEL } from '../shared/anchors';
import { RIG_GLSL } from '../shared/glsl';
import { SEA_GLSL, SEA_MARCH_GLSL, SEA_SHADE_GLSL } from './sea';
import { SKY_GLSL } from './sky';

export const VOLUME_FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler3D;
uniform highp sampler2D tDepth;
uniform mat4 uInvProjection;
uniform mat4 uCameraWorld;
uniform int uSeq;
uniform int uSampleIndex;
uniform highp sampler3D tNoise;
uniform sampler2D tRidge;
uniform vec2 uRidgeSpan;
uniform sampler2D tFar;
uniform vec4 uSteam[8];
uniform vec4 uSteamMore[8];
uniform int uSteamCount;
uniform vec4 uShow;
uniform vec4 uStage;
uniform vec4 uCrest[24];
uniform vec3 uClear;
varying vec2 vUv;
${HASH_GLSL}
${RIG_GLSL}
${SKY_GLSL}

const vec3 TO_SKY = vec3(0.12, 0.8, 0.59);
const float SEA = ${SEA_LEVEL.toFixed(1)};
// The cave mouth of the first spire: the storm's veil of snow starts beyond it.
const vec3 VEIL_FROM = vec3(${MOUTH[0].toFixed(1)}, ${MOUTH[1].toFixed(1)}, ${MOUTH[2].toFixed(1)});

vec4 noise(vec3 p) {
  return textureLod(tNoise, p, 0.0);
}
// The crest under a point: r its z at this x, g its height, b how low the saddle is here (0 at a spire, 1 in the dip of a saddle the cloud pours through).
vec3 ridgeAt(float x) {
  return textureLod(tRidge, vec2((x - uRidgeSpan.x) * uRidgeSpan.y, 0.5), 0.0).rgb;
}
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
  if (depth >= 1.0) far = 60000.0;
}

// What the lightning gives a point of cloud: each round light by the square of the distance, and the storm's own flash inside its body.
vec3 strikeLight(vec3 p) {
  vec3 e = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 d = uEmitters[i].xyz - p;
    float r = uEmitters[i].w;
    e += uEmitterRadiance[i] * (r * r / (dot(d, d) + r * r));
  }
  return e * (EMITTER_CAST * 3.14159);
}

// The air about a stroke, lit by it: the light a ray gathers in passing a round light, in closed form, no farther than what the ray meets.
vec3 strikeGlow(vec3 ro, vec3 rd, float far) {
  vec3 g = vec3(0.0);
  float small = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 q = ro - uEmitters[i].xyz;
    // The staged size is for the great lights of a stroke; a small light (the one at the struck tip) keeps its own.
    float r = uEmitters[i].w * (uEmitters[i].w > 20.0 && uSkyStage.z > 0.0 ? uSkyStage.z : 1.0);
    float b = dot(rd, q);
    float h = sqrt(max(dot(q, q) - b * b, 0.0) + 0.04 * r * r);
    g += uEmitterRadiance[i] * (r * r * (atan((far + b) / h) - atan(b / h)) / h);
    // A small light (the one at a struck tip) blooms in the lens: violet white, gone within some 25 m of it, and hidden by what stands
    // before it. It is summed apart from the great lights and closes on its own, higher ceiling.
    if (uEmitters[i].w < 20.0 && -b > 0.0 && -b < far + 20.0) {
      float off = sqrt(max(dot(q, q) - b * b, 0.0));
      float power = 1.0 - exp(-dot(uEmitterRadiance[i], vec3(0.3, 0.5, 0.2)) / 60000.0);
      small += power * (exp(-off * off / 7.0) + 0.1 * exp(-off / 5.0));
    }
  }
  // Staged by shot: behind the long lens of the strike (spine-04) the cloud's glow is the strike picture's own; the air adds a fifth of its.
  g *= 1.0e-7 * (uSkyStage.z > 0.0 ? 0.2 : 1.0);
  // A glow in the cloud about the stroke, not a lamp over the frame: it closes on a ceiling a little over the dusk sky's own tone.
  return g / (1.0 + dot(g, vec3(0.33)) / 0.07) + vec3(0.84, 0.76, 1.0) * (0.25 * small / (1.0 + small));
}

// The open sky as cloud takes it: the cold light from above, and the last band on what faces it.
vec3 skyOn(float up, vec3 rd) {
  vec3 cold = mix(uSkyHorizon, uSkyZenith, 0.5) * (0.55 + 0.45 * up);
  float toward = max(dot(rd.xz, uWarmDir.xz), 0.0);
  return cold + uWarmColour * (0.035 * toward * toward * up);
}

// The storm's near air: on the gale's side the air thickens with the distance into the storm, in slow banks, and takes the colour of the
// dome's own cloud behind it, so that whatever stands in it goes into the storm wall and no surface is ever seen. The depth is summed at
// fixed places along the ray, never jittered, and every term of it is wide: there is no grain in it and no edge.
float stormDepth(vec3 ro, vec3 rd, float reach) {
  float depth = 0.0;
  float span = min(reach, 24000.0);
  for (int i = 0; i < 6; i++) {
    float f = (float(i) + 0.5) / 6.0;
    // Nearer places count closer together: the bank's near edge is where the eye is.
    float t = span * f * f;
    vec3 p = ro + rd * t;
    vec3 ridge = ridgeAt(p.x);
    float into = ridge.x - p.z;
    float h = p.y - ridge.y;
    vec3 q = p - (uWind.xyz + vec3(0.6, 0.0, 0.0)) * (uTime * 22.0);
    // (Each picture of the bank is read only where it can count: a read that comes to nothing is still paid for.)
    float thick = 0.0;
    if (into > 250.0 && h < 3200.0) {
      float bank = noise(q / 4300.0).r;
      thick = smoothstep(250.0 + 900.0 * bank, 2600.0 + 900.0 * bank, into) * smoothstep(3200.0, 600.0, h);
    }
    // And the cloud that comes over the low saddles with the gale, close on the crest.
    float saddle = 0.5 * ridge.z * smoothstep(-500.0, 60.0, into) * smoothstep(900.0, 100.0, abs(into)) * smoothstep(160.0, -40.0, h);
    if (saddle > 0.0005) thick += saddle * smoothstep(0.35, 0.7, noise(q / 900.0).g);
    depth += thick * span * (2.0 * f / 6.0);
  }
  return depth / 5200.0;
}

${SEA_GLSL}

void main() {
  vec3 ro, rd;
  float far;
  viewRay(ro, rd, far);

  vec3 light = vec3(0.0);
  float through = 1.0;

  // What a strike leaves on a tip: steam, and smoke off the burn, carried down the gale and rising a little as it goes. Each is a plume about
  // a line from its source; the ray takes what lies about the point where it passes nearest that line.
  for (int i = 0; i < 8; i++) {
    if (i >= uSteamCount) break;
    bool smoke = uSteamMore[i].x > 1.5;
    float strength = smoke ? uSteamMore[i].x - 2.0 : uSteamMore[i].x;
    if (strength <= 0.001) continue;
    vec3 from = uSteam[i].xyz;
    float rise = uSteamMore[i].y;
    vec3 dir = normalize(uWind.xyz + vec3(uSteamMore[i].z, 0.2, uSteamMore[i].w));
    vec3 w0 = ro - from;
    float b = dot(rd, dir);
    float x = clamp((dot(dir, w0) - b * dot(rd, w0)) / max(1.0 - b * b, 1e-4), 0.0, rise);
    vec3 on = from + dir * x;
    float tr = dot(on - ro, rd);
    if (tr < 0.0 || tr > far) continue;
    vec3 at = ro + rd * tr;
    vec3 off = at - on;
    float wide = uSteam[i].w + 0.2 * x;
    vec3 c = at - uWind.xyz * (uTime * uWind.w * 0.5);
    // A torn puff, not a fan: one size of tear for the whole of it, holes where the noise is low, and its light the sky's and the flash's.
    // A breath is a small source (under 1 m): its tears are of its own size, and it has no holes.
    bool breath = uSteam[i].w < 1.0;
    float tear = breath ? 0.9 : uSteam[i].w * 4.0 + 18.0;
    float curl = noise(vec3(dot(c, uWind.xyz) / (2.5 * tear), c.y / tear, (c.x - c.z) / tear)).r;
    float fine = noise(c / (0.37 * tear) + 0.3).g;
    float body = exp(-dot(off, off) / (wide * wide)) * (1.0 - x / rise) * (1.0 - x / rise) * smoothstep(0.0, 0.06, x / rise + 0.02);
    float thick = clamp(strength * body * (breath ? 0.35 + 0.65 * smoothstep(0.2, 0.7, 0.7 * curl + 0.3 * fine) : smoothstep(0.3, 0.72, 0.7 * curl + 0.3 * fine)) * 1.6, 0.0, breath ? 0.3 : 0.5) * uShow.x;
    // The flash lights it violet and no brighter than a cloud: it is vapour, not a lamp.
    vec3 pale = (smoke ? 0.25 : 0.6) * (skyOn(1.0, rd) + min(strikeLight(at) * 0.6, vec3(0.2, 0.17, 0.32)));
    light += through * thick * pale;
    through *= 1.0 - thick;
  }

${SEA_MARCH_GLSL}

  // The storm's air between the lens and whatever the ray meets.
  float stormAir = 0.0;
  if (uShow.z > 0.0) stormAir = 1.0 - exp(-stormDepth(ro, rd, seaAt > 0.0 ? min(seaAt, far) : far));
  // Open sky keeps the dome's own masses: the near air softens them and does not wash them out.
  // The open sky is the dome's own picture, masses and all: no air is laid over it. The air is of what stands in it.
  bool openSky = seaAt <= 0.0 && far > 50000.0;
  if (openSky) stormAir = 0.0;
  stormAir *= 0.6;

${SEA_SHADE_GLSL}

  // The spindrift: snow that runs over the ground in the gale, in streaks, a few metres deep. It is found where the ray meets the ground,
  // and its depth along the ray is that of a layer lying on a slope seen at this angle.
  if (far < 1400.0 && uShow.w * uStage.x > 0.0) {
    vec3 hit = ro + rd * far;
    vec4 land = landAt(hit.xz);
    float above = hit.y - land.r;
    if (above < 6.0 && above > -2.0 && land.a < 0.3) {
      vec2 downW = normalize(uWind.xz);
      vec2 a = vec2(dot(hit.xz, downW), dot(hit.xz, vec2(-downW.y, downW.x)));
      // By the dead one the running snow meets a body: it runs round it as a stream runs round a stone (the stream's own lines are what
      // the snow is read along), banks up on the side the gale strikes, and leaves a thin, ragged wake in the lee.
      float met = 1.0;
      if (uClear.z > 0.0) {
        vec2 rel = hit.xz - uClear.xy;
        vec2 b = vec2(dot(rel, downW), dot(rel, vec2(-downW.y, downW.x)));
        float r2 = max(dot(b, b), 0.01);
        float k = min(uClear.z * uClear.z / r2, 1.0);
        a += vec2(b.x * k, -b.y * k);
        float r = sqrt(r2);
        float struck = smoothstep(3.2 * uClear.z, uClear.z, r) * max(-b.x / r, 0.0);
        float torn = noise(vec3(b.x / 7.0 - uTime * 0.6, b.y / 2.3, 0.21)).g;
        float lee = step(0.0, b.x) * smoothstep((1.25 - 0.6 * torn) * uClear.z, 0.35 * uClear.z, abs(b.y)) * exp(-b.x / (4.0 * uClear.z));
        met = (1.0 + 1.1 * struck) * (1.0 - 0.6 * lee);
      }
      a.x -= uWind.w * 0.7 * uTime;
      float n = 0.6 * noise(vec3(a.x / 90.0, a.y / 13.0, 0.3)).g + 0.4 * noise(vec3(a.x / 21.0, a.y / 3.7, 0.7)).a;
      float column = smoothstep(0.5, 0.78, n) * 3.2 / max(abs(rd.y) + 0.12, 0.15) * exp(-max(above, 0.0) / 2.5) * met;
      column *= uClear.z > 0.0 ? smoothstep(0.4 * uClear.z, uClear.z, length(hit.xz - uClear.xy)) : 1.0;
      // Close to the lens the same snow is seen as it is: snakes a hand deep and a pace wide, running fast along the ground.
      if (far < 90.0) {
        float snake = 0.6 * noise(vec3(a.x / 9.0, a.y / 1.1, 0.5)).r + 0.4 * noise(vec3(a.x / 2.6, a.y / 0.33, 0.9)).b;
        column += smoothstep(0.47, 0.7, snake) * (0.5 + n) * 2.6 / max(abs(rd.y) + 0.12, 0.15) * exp(-max(above, 0.0) / 0.5) * smoothstep(90.0, 25.0, far) * met * (uClear.z > 0.0 ? smoothstep(0.8, 2.0, length(hit.xz - uClear.xy)) : 1.0);
      }
      // About the body and its burn no snow runs on the ground: bands that cross the burn and take no notice of the body read as a
      // surface that slides. It runs beyond, where the air behind the body softens it.
      if (uClear.z > 0.0) column *= smoothstep(1.7 * uClear.z, 4.0 * uClear.z, length(hit.xz - uClear.xy));
      float kept = exp(-0.11 * column * smoothstep(1400.0, 500.0, far) * uShow.w * uStage.x);
      vec3 snow = 0.9 * (skyOn(1.0, rd) + min(strikeLight(hit) * 0.2, vec3(0.1, 0.085, 0.17)));
      light = light + through * (1.0 - kept) * snow;
      through *= kept;
    }
  }

  // Near the dead one (spine-03) the running snow is held off, so the body and the burn are seen: uClear is the place, its z the reach (0 when not staged).
  // The plumes: snow torn off each crest and carried down the gale, long and ragged, thinning as it goes.
  vec3 gale = normalize(vec3(uWind.x, 0.04, uWind.z));
  if (uShow.w > 0.0) {
    for (int i = 0; i < 24; i++) {
      float size = uCrest[i].w;
      if (size <= 0.0) continue;
      vec3 from = uCrest[i].xyz;
      float reach = 190.0 * size;
      vec3 w0 = ro - from;
      float b = dot(rd, gale);
      float x = clamp((dot(gale, w0) - b * dot(rd, w0)) / max(1.0 - b * b, 1e-4), 0.0, reach);
      vec3 on = from + gale * x;
      float tr = dot(on - ro, rd);
      if (tr < 0.0 || tr > far) continue;
      vec3 at = ro + rd * tr;
      vec3 off = at - on;
      float wide = (5.0 + 0.2 * x) * (0.5 + 0.5 * size);
      // A lens standing in a plume sees through it, not a wall of it.
      float clearOf = smoothstep(0.5 * wide, 5.0 * wide, tr);
      float d2 = dot(off, off) / (wide * wide);
      if (d2 > 6.0) continue;
      vec3 c = at - uWind.xyz * (uTime * uWind.w * 0.6);
      float along = dot(c, uWind.xyz);
      vec3 q = c - uWind.xyz * along;
      // One size of tear for the whole plume: a size that grew along it would comb it into bars.
      float torn = noise(vec3(along / (90.0 * size + 30.0), q.y / (14.0 * size + 5.0), (q.x - q.z) / (14.0 * size + 5.0))).r;
      float gust = noise(vec3(along / 260.0, float(i) * 0.37, 0.11)).g;
      float k = x / reach;
      float body = exp(-d2) * (1.0 - k) * (1.0 - k) * smoothstep(0.0, 0.05, k + 0.01);
      float thick = clamp(body * smoothstep(0.2, 0.7, torn) * (0.6 + 1.2 * gust) * 2.3, 0.0, 0.46) * uShow.w * uStage.x * clearOf;
      // Staged by shot: before the long lens of the strike a plume is a thin smoke of snow, not a bank.
      thick *= 1.0 - 0.75 * uPlate.w;
      vec3 pale = 0.95 * (skyOn(1.0, rd) + min(strikeLight(at) * 0.25, vec3(0.12, 0.1, 0.2)));
      light += through * thick * pale;
      through *= 1.0 - thick;
    }
  }

  // What is seen of the dome through the air: its cloud, softened, toward a ray lifted to the horizon.
  vec3 toDome = normalize(vec3(rd.x, max(rd.y, 0.075), rd.z));
  // Open sky is read sharp: the air before it is the same cloud, and a soft copy laid over it would wash its masses out.
  vec3 domeAir = skyCloud(ro, toDome, far > 50000.0 ? 1.0 : 5.0);
  // Where the strike's own sky stands, the air is that picture's: nothing is laid over the open sky, and the haze before a far spire is
  // the cloud behind it, read soft.
  vec2 uvQ = vec2(0.0);
  float plateOn = uPlate.w > 0.0 ? plateAt(atan(rd.z, rd.x), asin(clamp(rd.y, -1.0, 1.0)), uvQ) : 0.0;
#if PLATE == 1
  if (plateOn > 0.0) {
    domeAir = mix(domeAir, skyCloud(ro, rd, 2.5), plateOn);
    // Before the strike's sky the storm's near air is thin: the picture keeps its dark masses and its sea its billows.
    stormAir *= far > 50000.0 ? 1.0 - plateOn : 1.0 - 0.75 * plateOn;
  }
#endif
  if (stormAir > 0.0) {
    light = light * (1.0 - stormAir) + domeAir * stormAir;
    through *= 1.0 - stormAir;
  }

  // The storm's snow in the air: a veil that thickens with the distance and thins with the height over the crest, so the gaps between the
  // spires fill and each spire farther off is more of a ghost. It runs in bands down the gale. Its colour is the dome's own cloud behind it.
  if (uShow.x * uStage.y > 0.0) {
    float crestY = ridgeAt(ro.x).y;
    float reachV = far > 50000.0 ? 2200.0 : min(far, 9000.0);
    float tall = 240.0;
    float fallV = max(rd.y, 0.0) / tall;
    // It starts beyond the first spire: the spire, its cave mouth and the sea beside it stand in clear air, whatever the lens's distance.
    // (Not from inside the canal: through its mouth the ridge beyond stands in the veil from the lens on.)
    float startV = uStage.z < 0.75 ? 0.0 : length(VEIL_FROM.xz - ro.xz) + 140.0;
    reachV = max(reachV - startV, 0.0);
    float depthV = exp(-max(ro.y - crestY, -60.0) / tall - fallV * startV) * (abs(fallV) < 1e-5 ? reachV : (1.0 - exp(-fallV * reachV)) / fallV) / 850.0;
    float azV = atan(rd.z, rd.x);
    float bands = noise(vec3(azV * 0.9 - uTime * 0.013, rd.y * 2.6 + uTime * 0.004, 0.37)).g;
    depthV *= (0.65 + 0.7 * bands) * uShow.x * uStage.y;
    // Mist stands in banks between one spire and the next, and lies low: each spire is in more or less of it by where it stands, its foot
    // more than its tip.
    if (far < 50000.0 && uStage.z >= 0.75) {
      vec3 hitV = ro + rd * far;
      float bank = noise(vec3(hitV.xz / 800.0 - uWind.xz * (uTime * 0.012), 0.21)).r;
      float lowV = exp(-max(hitV.y - crestY + 50.0, 0.0) / 140.0);
      depthV *= (0.5 + 1.0 * bank) * (0.65 + 1.1 * lowV);
    }
    float veiled = 1.0 - exp(-depthV);
    // On the ridge a far spire is never the veil alone: it keeps a fifth of its own light and shade, and more in a flash, when the veil
    // is lit and would be a flat fill.
    if (uStage.z >= 0.75) veiled = min(veiled, 0.8) * (1.0 - 0.5 * clamp(uStrikeTop.w, 0.0, 1.0));
    // Open sky and the sea of cloud keep their own masses: the veil is of the ridge's air.
    if (far > 50000.0) veiled = 0.0;
    // The sea of cloud is seen from above through thin air: it keeps its lumps and its lit edge.
    if (seaAt > 0.0 && far <= seaAt + 1.0) veiled = min(veiled, 0.3) * (1.0 - seaGone);
    // Blown snow is the storm's cold violet; the warm band stays on the horizon and does not stain the air.
    vec3 snowAir = mix(domeAir * 0.9, mix(uSkyHorizon, uSkyZenith, 0.35) * 0.55, 0.65) + vec3(0.006, 0.006, 0.009);
    light = light * (1.0 - veiled) + snowAir * veiled;
    through *= 1.0 - veiled;
    // By the dead one the lens is low and close: the air behind the body is thick with blown snow, and the first spire and its mouth
    // stand back in it, pale and soft, as far behind the body as they are.
    if (uClear.z > 0.0 && far < 50000.0) {
      float behind = min(1.0 - exp(-max(far - 14.0, 0.0) / 540.0), far > 50000.0 ? 0.4 : 0.72) * uShow.x;
      light = light * (1.0 - behind) + snowAir * 0.5 * behind;
      through *= 1.0 - behind;
    }
    // Scud: torn cloud that races low past the spires on the gale, paler than the storm behind it (staged by shot, uStage.w).
    if (uStage.w > 0.0 && far > 120.0) {
      float scud = 0.7 * noise(vec3(azV * 0.8 - uTime * 0.05, rd.y * 5.0 + uTime * 0.006, 0.61)).r + 0.3 * noise(vec3(azV * 2.6 - uTime * 0.14, rd.y * 15.0, 0.2)).b;
      float wisp = uStage.w * uShow.x * smoothstep(350.0, 1500.0, far) * smoothstep(0.5, 0.85, scud) * 0.32;
      light = light * (1.0 - wisp) + (snowAir * 1.5 + vec3(0.008, 0.008, 0.012)) * wisp;
      through *= 1.0 - wisp;
    }
  }

  // The driven snow of the ridge: veils of it at three depths, each a place in the world that the gale carries, drawn out down the wind and
  // torn into gusts. A veil is metres across and thin, never a flake; the lens moves through them, and the near one crosses it fastest.
  if (uShow.w * uStage.x > 0.0) {
    float lensV = uInvProjection[1][1] / 0.466;
    vec3 downV = normalize(vec3(uWind.x, -0.1, uWind.z));
    vec3 acrossV = normalize(vec3(-uWind.z, 0.0, uWind.x));
    vec3 upV = cross(acrossV, downV);
    float crestV = ridgeAt(ro.x).y;
    float driven = 0.0;
    float keptV = 1.0;
    for (int j = 0; j < 3; j++) {
      // (By the dead one the first of them flies between the lens and the body, an arm's length off.)
      bool dead = uClear.z > 0.0;
      float dist = dead ? (j == 0 ? 2.2 : j == 1 ? 40.0 : 150.0) : (j == 0 ? 26.0 : j == 1 ? 95.0 : 340.0) / lensV;
      float before = smoothstep(dist, dist * 1.3, far);
      if (before <= 0.0) break;
      float grain = dead ? (j == 0 ? 2.4 : j == 1 ? 9.0 : 30.0) : (j == 0 ? 7.0 : j == 1 ? 20.0 : 56.0) / sqrt(lensV);
      vec3 at = ro + rd * dist;
      vec3 p = at - downV * (uWind.w * (0.8 + 0.12 * float(j)) * uTime);
      // Sheets that lie flat on the gale, long down it and broad across it, soft: seen along the wind they are level bands, never lines that
      // fall.
      vec3 q = vec3(dot(p, downV) / (grain * 6.0), dot(p, upV) / (grain * 1.6), dot(p, acrossV) / (grain * 5.0));
      float streak = 0.7 * noise(q + vec3(0.0, 0.0, 0.31 * float(j))).g + 0.3 * noise(q * vec3(2.1, 2.3, 2.1) + 0.37).a;
      float gust = noise(vec3(q.x * 0.21, 0.37 * float(j) + 0.13, q.z * 0.17)).b;
      float veil = smoothstep(0.42, 0.74, streak) * smoothstep(0.36, 0.7, gust) * before;
      // It thins with the height over the crest, and against the open sky it is the sky's own tone and all but lost.
      veil *= exp(-max(at.y - crestV - 30.0, 0.0) / 170.0) * (far > 50000.0 ? 0.2 : 1.0);
      veil *= dead ? (j == 0 ? 0.07 : j == 1 ? 0.14 : 0.18) : (j == 0 ? 0.16 : j == 1 ? 0.3 : 0.4);
      driven += keptV * veil;
      keptV *= 1.0 - veil;
    }
    // Through the strike's long lens the veils lie a kilometre deep before the spire: thinned there, or the spire is a ghost in milk.
    driven *= uShow.w * uStage.x * (uSkyStage.z > 0.0 ? 0.3 : 1.0);
    vec3 snowV = 0.85 * (skyOn(1.0, rd) + min(strikeLight(ro + rd * (95.0 / lensV)) * 0.2, vec3(0.1, 0.085, 0.17)));
    light = light * (1.0 - driven) + snowV * driven;
    through *= 1.0 - driven;
  }

  // The snow before the lens: streaks in the gale, soft and few, each many times longer than it is wide, in gusts, at three depths. Each depth
  // is a plane across the lens; the flakes lie in cells of it, down the gale as the lens sees it, so every one is a pure function of time.
  // The planes turn against the camera's own turning, so a pan sweeps through the snow and does not carry it.
  if (uShow.w * uStage.z > 0.0) {
    vec3 right = uCameraWorld[0].xyz;
    vec3 upC = uCameraWorld[1].xyz;
    vec3 fwd = -uCameraWorld[2].xyz;
    vec3 wDir = normalize(vec3(uWind.x, -0.07, uWind.z));
    vec2 wc = vec2(dot(wDir, right), dot(wDir, upC));
    float across = max(length(wc), 0.2);
    vec2 e1 = wc / max(length(wc), 1e-3);
    vec2 e2 = vec2(-e1.y, e1.x);
    vec2 onLens = vec2(dot(rd, right), dot(rd, upC)) / max(dot(rd, fwd), 0.05) + vec2(atan(fwd.z, fwd.x), asin(clamp(fwd.y, -1.0, 1.0)));
    float lens = 0.466 / uInvProjection[1][1];
    float fly = 0.0;
    float hid = 1.0;
    // Staged by shot (uStage.z under 0.75): from inside the canal the snow flies only out beyond the far mouth, at the three depths past it.
    bool beyond = uStage.z < 0.75;
    for (int j = 0; j < 3; j++) {
      // On the ridge no flake is drawn: streaks at this size read as dashes laid on the lens. The snow there is the veil's.
      if (!beyond) break;
      int k = beyond ? j + 5 : 2 * j;
      float dist = (beyond ? 1.6 : 1.1) * pow(2.0, float(k)) * lens;
      if (dist * 0.8 > far) break;
      vec2 pc = onLens * dist;
      // No two depths fly quite the same way: the gale is not one stream.
      float turn = 0.36 * (rnd(ivec2(k, 3), 5u) - 0.5);
      vec2 d1 = e1 * cos(turn) + e2 * sin(turn);
      vec2 d2 = vec2(-d1.y, d1.x);
      float wideS = dist * (beyond ? 0.0021 : 0.0027) / max(lens, 1.0);
      float cellQ = wideS * (beyond ? 11.0 : 14.0);
      // Snow that crosses the lens in a gale is drawn out by the open shutter: a soft streak, not a fleck.
      float cellA = wideS * (beyond ? 16.0 : 46.0);
      float along = dot(pc, d1);
      float q = (dot(pc, d2) + 2.5 * wideS * sin(along / (9.0 * cellA) + float(k) * 1.7)) / cellQ;
      float qc = floor(q);
      float a = (along - (uWind.w * across * (0.7 + 0.6 * rnd(ivec2(int(qc), k), 7u))) * uTime) / cellA + 37.0 * rnd(ivec2(int(qc), k), 11u);
      float ac = floor(a);
      ivec2 cell = ivec2(int(qc), int(ac));
      // They come in gusts: a clump of them, then none.
      float chance = rnd(cell, uint(23 + k));
      if (chance > 0.46 - 0.04 * float(k)) continue;
      float gustL = noise(vec3(pc / (30.0 * cellQ) - d1 * (uTime * 0.6), float(k) * 0.31)).g;
      if (chance > (0.46 - 0.04 * float(k)) * smoothstep(0.3, 0.7, gustL)) continue;
      float dq = (q - qc - 0.25 - 0.5 * rnd(cell, uint(31 + k))) * cellQ;
      // Each is brightest in its middle and gone at its ends, and no two are one length.
      float lengthOf = 0.3 + 0.4 * rnd(cell, uint(41 + k));
      float fa = (a - ac - 0.02) / lengthOf;
      float lengthS = fa > 0.0 && fa < 1.0 ? 4.0 * fa * (1.0 - fa) : 0.0;
      // A streak holds its breadth and its light along its length and fades only at its ends; a fleck (beyond the mouth) swells in its middle.
      if (!beyond) {
        lengthS = sqrt(sqrt(lengthS));
        // No two fly quite level with each other: the gale tumbles.
        dq += (rnd(cell, uint(83 + k)) - 0.5) * 0.16 * (fa - 0.5) * lengthOf * cellA;
      }
      // No two are one size: most are small, a few are big and soft.
      float sizeOf = rnd(cell, uint(67 + k));
      float thin = wideS * (beyond ? 0.35 + 1.5 * sizeOf * sizeOf : 0.65 + 1.7 * sizeOf * sizeOf) * (0.5 + 0.5 * lengthS);
      float flake = exp(-dq * dq / (thin * thin)) * lengthS * lengthS * (beyond ? 0.04 + 0.2 * rnd(cell, uint(59 + k)) : 0.14 + 0.42 * rnd(cell, uint(59 + k))) * (1.0 - 0.4 * sizeOf);
      fly += hid * flake;
      hid *= 1.0 - flake;
    }
    // Against the open sky blown snow is the sky's own tone and is lost; it shows against the rock and the snow.
    fly *= uShow.w * (beyond ? 3.0 : uStage.z) * mix(1.0, beyond ? 0.45 : 0.2, smoothstep(120.0, 700.0, far));
    vec3 flakes = (beyond ? 1.1 : 2.1) * (skyOn(1.0, rd) + min(strikeLight(ro + rd * 6.0) * 0.2, vec3(0.06, 0.05, 0.1)));
    light = light * (1.0 - fly) + flakes * fly;
    through *= 1.0 - fly;
  }

  // The haze of the height: thin on the ridge, thicker toward the sea.
  float scale = 1100.0;
  float base = exp(-(ro.y - SEA) / scale) / 26000.0;
  float fall = rd.y / scale;
  // Down to the top of the cloud and no farther: what lies under it is the cloud's own.
  float length = min(seaAt > 0.0 ? min(far, seaAt) : far, 30000.0);
  // The strike's own sky has its air in it: before it the haze is only of what stands nearer than the picture.
  if (plateOn > 0.0) length = min(length, mix(30000.0, 5000.0, plateOn));
  if (openSky) length = 0.0;
  // Where the sea has gone into the dome's foot it is the open sky's, and takes no more haze than the sky over it: no line at the horizon.
  float depth = base * (abs(fall) < 1e-5 ? length : (1.0 - exp(-fall * length)) / fall) * uShow.x * (1.0 - seaGone);
  float clear = exp(-depth);
  vec3 haze = mix(mix(uSkyHorizon, uSkyZenith, 0.35) * 0.6, domeAir, 0.7);
  light = light * clear + haze * (1.0 - clear);
  through *= clear;

  light += strikeGlow(ro, rd, min(far, 30000.0)) * uShow.x;
  gl_FragColor = vec4(light, through);
}`;
