// The half-size pass of the Spine's air. It writes the light the air sends toward the camera in rgb and how much of the scene it lets through in alpha.
// Nothing in it is marched through with a jittered stride, so nothing in it has grain: the storm is a body whose face each view ray walks up to, the
// cloud under the crest (the sea far below, the bank against the lee, the pour through the saddles) is a surface with a soft top, the spindrift is a
// column over the snow, and the haze of the height is worked out in one. All of it reads the rig, so the cloud takes the dusk and the lightning as the rock does.
import { HASH_GLSL } from '../../../core/post';
import { SEA_LEVEL } from '../shared/anchors';
import { RIG_GLSL } from '../shared/glsl';
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
uniform sampler2D tDeck;
uniform sampler2D tSeaNh;
uniform vec4 uSteam[8];
uniform vec4 uSteamMore[8];
uniform int uSteamCount;
uniform vec4 uShow;
uniform vec4 uStage;
varying vec2 vUv;
${HASH_GLSL}
${RIG_GLSL}
${SKY_GLSL}

const vec3 TO_SKY = vec3(0.12, 0.8, 0.59);
const float SEA = ${SEA_LEVEL.toFixed(1)};
// Nothing of the cloud under the crest stands higher than this.
const float BANK_TOP = 240.0;

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
    float bank = noise(q / 4300.0).r;
    float thick = smoothstep(250.0 + 900.0 * bank, 2600.0 + 900.0 * bank, into) * smoothstep(3200.0, 600.0, h);
    // And the cloud that comes over the low saddles with the gale, close on the crest.
    thick += 0.5 * ridge.z * smoothstep(-500.0, 60.0, into) * smoothstep(900.0, 100.0, abs(into)) * smoothstep(160.0, -40.0, h) * smoothstep(0.35, 0.7, noise(q / 900.0).g);
    depth += thick * span * (2.0 * f / 6.0);
  }
  return depth / 5200.0;
}

// The top of the cloud under the crest: far out the sea itself, billowed; against the lee of the ridge a bank some hundreds of metres under the crest,
// so that the flank goes down into cloud; and in the saddles the storm's cloud, which comes over the crest and falls down the lee into the bank.
const float CLOUD_UNDER = 190.0;
const vec3 SEA_MEAN = vec3(0.113, 0.127, 0.201);
float seaLod = 1.0;
float seaTop(vec3 p, bool fine) {
  vec3 q = p - uWind.xyz * (uTime * 38.0);
  vec3 q2 = p - vec3(0.62, 0.0, 0.78) * (uTime * 74.0);
  // Its lumps are those of the picture of a cloud deck seen from above (mat/cloudsea, 10 km a repeat), laid twice at two sizes so no repeat shows.
  float deck = textureLod(tSeaNh, q.xz / 10000.0, seaLod).b;
  // The smaller lumps run faster and a little across the larger: the deck rolls.
  float lumps = textureLod(tSeaNh, q2.zx / 2900.0 + 0.37, seaLod + 1.0).b;
  float n = 0.62 * deck + 0.38 * lumps;
  if (fine) n += 0.12 * (noise(vec3(q2.xz / 210.0, 0.43 + uTime * 0.02)).r - 0.5);
  vec3 ridge = ridgeAt(p.x);
  float lee = p.z - ridge.x;
  // The sea lies close under the crest on both hands, level to the horizon, and stands a little higher against the rock:
  // the ridge is a knife out of cloud, and its flanks go down into it.
  float bank = smoothstep(900.0, 120.0, abs(lee));
  float top = ridge.y - CLOUD_UNDER + 300.0 * (n - 0.5) + 70.0 * bank;
  if (ridge.z > 0.01 && lee > -700.0 && lee < 1500.0) {
    vec3 c = p - uWind.xyz * (uTime * uWind.w);
    float m = 0.45 * noise(vec3(c.xz / 520.0, 0.37)).r + 0.2 * noise(vec3(c.xz / 140.0, 0.81)).b + 0.35 * textureLod(tSeaNh, c.xz / 1300.0 + 0.11, seaLod).b;
    float gone = 1.0 - ridge.z * smoothstep(-700.0, -160.0, lee) * smoothstep(1500.0, 150.0, lee);
    float pour = ridge.y + (140.0 * m - 30.0) * ridge.z - 0.5 * max(lee, 0.0) - 700.0 * gone * gone;
    top = max(top, pour);
  }
  return top;
}

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
    float curl = noise(c / (wide * 5.0 + 24.0)).r;
    float body = exp(-dot(off, off) / (wide * wide)) * (1.0 - x / rise) * smoothstep(0.0, 0.06, x / rise + 0.02);
    float thick = clamp(strength * body * (0.4 + 1.5 * curl) * 1.3, 0.0, 0.9) * uShow.x;
    vec3 pale = (smoke ? 0.3 : 0.85) * (skyOn(1.0, rd) + strikeLight(at) * 0.25);
    light += through * thick * pale;
    through *= 1.0 - thick;
  }

  // The cloud under the crest: a surface with a soft top, found by walking to it.
  float seaAt = -1.0;
  float tSea = ro.y > BANK_TOP ? (rd.y < -1e-4 ? (BANK_TOP - ro.y) / rd.y : 1e9) : 0.0;
  if (tSea < far && uShow.y > 0.0) {
    float t = tSea;
    float fall = max(-rd.y, 0.0) + 0.6;
    vec3 p = ro + rd * t;
    bool found = false;
    for (int i = 0; i < 16; i++) {
      float d = p.y - seaTop(p, false);
      if (d < 3.0 + 0.004 * t) {
        found = true;
        break;
      }
      t += max(d, 4.0) / fall;
      p = ro + rd * t;
      if (t > far || (rd.y > 0.0 && p.y > BANK_TOP)) break;
    }
    // A ray that has not come down to it by then meets it far out, where it is level.
    if (!found && rd.y < -1e-4) {
      t = max(t, (ridgeAt(p.x).y - CLOUD_UNDER - ro.y) / rd.y);
      found = true;
    }
    if (found && t < far) seaAt = t;
  }

  // The storm's air between the lens and whatever the ray meets.
  float stormAir = 0.0;
  if (uShow.z > 0.0) stormAir = 1.0 - exp(-stormDepth(ro, rd, seaAt > 0.0 ? min(seaAt, far) : far));

  if (seaAt > 0.0 && through > 0.01) {
    float t = seaAt;
    vec3 p = ro + rd * t;
    seaLod = max(0.0, log2(t * 0.00035));
    vec3 domeFar = skyCloud(ro, normalize(vec3(rd.x, 0.035, rd.z)), 5.0);
    float e = 30.0 + 0.02 * t;
    float h0 = seaTop(p, true);
    vec3 n = normalize(vec3(h0 - seaTop(p + vec3(e, 0.0, 0.0), true), e, h0 - seaTop(p + vec3(0.0, 0.0, e), true)));
    // Far off the billows close up into a level floor.
    float gone = 1.0 - exp(-t / 26000.0);
    n = normalize(mix(n, vec3(0.0, 1.0, 0.0), gone));
    // Its hollows are in their own shade: the tops stand in the light.
    float hollowed = smoothstep(-0.25, 0.5, (seaTop(p + vec3(n.x, 0.0, n.z) * 500.0, false) - h0) / 500.0);
    float w = max(dot(n, uWarmDir), 0.0);
    float wn = clamp((w + 0.25) / 1.25, 0.0, 1.0);
    vec3 sea = 0.5 * ((skyIrradiance(n) / 3.14159 - uWarmColour * (0.19 * wn * wn)) * (1.0 - 0.82 * hollowed) + uFlash * 0.25 * stormSide(rd) + strikeLight(p) * 0.15);
    // The deck's own tone: pale on the heads of its lumps, blue-grey between them.
    vec3 qs = p - uWind.xyz * (uTime * 38.0);
    vec3 tint = clamp(textureLod(tDeck, qs.xz / 10000.0, seaLod).rgb / SEA_MEAN, 0.45, 1.9);
    // Cloud is not snow: it is the greyer and the bluer of the two, and only the heads of its billows come near the snow's value.
    sea *= mix(vec3(1.0), tint, 0.75) * vec3(0.66, 0.69, 0.78) * (0.75 + 0.5 * smoothstep(-0.1, 0.5, n.y - 0.75 + 0.6 * w));
    sea = mix(sea, mix(uSkyGround, domeFar, 0.6), gone);
    // Its edge against the land is soft: the cloud thins where it laps the rock.
    float lap = smoothstep(0.0, 1.0, (far - t) / (260.0 + 0.1 * t));
    light += through * sea * lap;
    through *= 1.0 - lap;
    far = min(far, t);
  }

  // The spindrift: snow that runs over the ground in the gale, in streaks, a few metres deep. It is found where the ray meets the ground,
  // and its depth along the ray is that of a layer lying on a slope seen at this angle.
  if (far < 1400.0 && uShow.w * uStage.x > 0.0) {
    vec3 hit = ro + rd * far;
    vec4 land = landAt(hit.xz);
    float above = hit.y - land.r;
    if (above < 6.0 && above > -2.0 && land.a < 0.3) {
      vec3 carried = hit - uWind.xyz * (uWind.w * 0.7 * uTime);
      vec2 a = vec2(dot(carried.xz, uWind.xz), dot(carried.xz, vec2(-uWind.z, uWind.x)));
      float n = 0.6 * noise(vec3(a.x / 90.0, a.y / 13.0, 0.3)).g + 0.4 * noise(vec3(a.x / 21.0, a.y / 3.7, 0.7)).a;
      float column = smoothstep(0.5, 0.78, n) * 3.2 / max(abs(rd.y) + 0.12, 0.15) * exp(-max(above, 0.0) / 2.5);
      float kept = exp(-0.11 * column * smoothstep(1400.0, 500.0, far) * uShow.w * uStage.x);
      vec3 snow = 0.9 * (skyOn(1.0, rd) + strikeLight(hit) * 0.2);
      light = light + through * (1.0 - kept) * snow;
      through *= kept;
    }
  }

  // What is seen of the dome through the air: its cloud, softened, toward a ray lifted to the horizon.
  vec3 toDome = normalize(vec3(rd.x, max(rd.y, 0.035), rd.z));
  vec3 domeAir = skyCloud(ro, toDome, 5.0);
  if (stormAir > 0.0) {
    light = light * (1.0 - stormAir) + domeAir * stormAir;
    through *= 1.0 - stormAir;
  }

  // The haze of the height: thin on the ridge, thicker toward the sea.
  float scale = 1100.0;
  float base = exp(-(ro.y - SEA) / scale) / 26000.0;
  float fall = rd.y / scale;
  float length = min(far, 30000.0);
  float depth = base * (abs(fall) < 1e-5 ? length : (1.0 - exp(-fall * length)) / fall) * uShow.x;
  float clear = exp(-depth);
  vec3 haze = mix(mix(uSkyHorizon, uSkyZenith, 0.35) * 0.6, domeAir, 0.7);
  light = light * clear + haze * (1.0 - clear);
  through *= clear;

  gl_FragColor = vec4(light, through);
}`;
