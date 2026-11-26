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

// The air about a stroke, lit by it: the light a ray gathers in passing a round light, in closed form, no farther than what the ray meets.
vec3 strikeGlow(vec3 ro, vec3 rd, float far) {
  vec3 g = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 q = ro - uEmitters[i].xyz;
    // The staged size is for the great lights of a stroke; a small light (the one at the struck tip) keeps its own.
    float r = uEmitters[i].w * (uEmitters[i].w > 20.0 && uSkyStage.z > 0.0 ? uSkyStage.z : 1.0);
    float b = dot(rd, q);
    float h = sqrt(max(dot(q, q) - b * b, 0.0) + 0.04 * r * r);
    g += uEmitterRadiance[i] * (r * r * (atan((far + b) / h) - atan(b / h)) / h);
  }
  g *= 1.0e-7;
  // A glow in the cloud about the stroke, not a lamp over the frame: it closes on a ceiling a little over the dusk sky's own tone.
  return g / (1.0 + dot(g, vec3(0.33)) / 0.07);
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
const float CLOUD_UNDER = 130.0;
const vec3 SEA_MEAN = vec3(0.113, 0.127, 0.201);
// The deck's own light: what the sky gives its heads, and what the dusk gives the faces that look at it.
const vec3 SEA_COLD = vec3(0.115, 0.125, 0.18);
const vec3 SEA_WARM = vec3(0.16, 0.085, 0.045);
float seaLod = 1.0;
float seaTop(vec3 p, bool fine) {
  vec3 q = p - uWind.xyz * (uTime * 38.0);
  vec3 q2 = p - vec3(0.62, 0.0, 0.78) * (uTime * 74.0);
  // Its lumps are those of the picture of a cloud deck seen from above (mat/cloudsea, 10 km a repeat), laid twice at two sizes so no repeat shows.
  float deck = textureLod(tSeaNh, q.xz / 10000.0, seaLod).b;
  // The smaller lumps run faster and a little across the larger: the deck rolls.
  float lumps = textureLod(tSeaNh, q2.zx / 2900.0 + 0.37, seaLod + 1.0).b;
  float n = 0.5 * deck + 0.5 * lumps;
  // Its heads: the same deck at the size of one heap of cloud, rolling on its own way, and the small of them.
  if (fine) {
    vec3 q3 = p - vec3(0.3, 0.0, 0.95) * (uTime * 52.0);
    n += 0.3 * (textureLod(tSeaNh, q3.xz / 870.0 + 0.61, max(seaLod - 1.0, 0.0)).b - 0.5) + 0.1 * (noise(vec3(q2.xz / 210.0, 0.43 + uTime * 0.02)).r - 0.5);
  }
  vec3 ridge = ridgeAt(p.x);
  float lee = p.z - ridge.x;
  // The sea lies close under the crest on both hands, level to the horizon, and stands a little higher against the rock:
  // the ridge is a knife out of cloud, and its flanks go down into it.
  float bank = smoothstep(900.0, 120.0, abs(lee));
  float top = ridge.y - CLOUD_UNDER + 360.0 * (n - 0.5) + 70.0 * bank;
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

  // The cloud under the crest: a surface with a soft top, found by walking to it.
  float seaAt = -1.0;
  float tSea = ro.y > BANK_TOP ? (rd.y < -1e-4 ? (BANK_TOP - ro.y) / rd.y : 1e9) : 0.0;
  if (tSea < far && uShow.y > 0.0) {
    float t = tSea;
    float fall = max(-rd.y, 0.0) + 0.6;
    vec3 p = ro + rd * t;
    bool found = false;
    for (int i = 0; i < 24; i++) {
      float d = p.y - seaTop(p, false);
      if (d < 3.0 + 0.004 * t) {
        found = true;
        break;
      }
      t += max(d, 4.0 + 0.012 * t) / fall;
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
  // Open sky keeps the dome's own masses: the near air softens them and does not wash them out.
  // The open sky is the dome's own picture, masses and all: no air is laid over it. The air is of what stands in it.
  bool openSky = seaAt <= 0.0 && far > 50000.0;
  if (openSky) stormAir = 0.0;
  stormAir *= 0.6;

  if (seaAt > 0.0 && through > 0.01) {
    float t = seaAt;
    vec3 p = ro + rd * t;
    seaLod = max(0.0, log2(t * 0.00035));
    vec3 domeFar = skyCloud(ro, normalize(vec3(rd.x, 0.035, rd.z)), 5.0);
    // Its light is a picture's: a cloud deck seen low across its top (the foot of mat/far), laid by the way the eye looks, the last band
    // toward the dusk, and flowing as the dome's cloud flows. The surface found above only says where the cloud stands before the land.
    float az = atan(rd.z, rd.x);
    float dip = asin(clamp(-rd.y, 0.0, 1.0));
    // The picture's cloud runs from its horizon down 15 degrees; lower than that it is laid again, turned over, so nothing is pulled long.
    float zoomF = uSkyStage.w > 0.0 ? uSkyStage.w : 1.0;
    float down = dip * zoomF / 0.26;
    down = 1.0 - abs(1.0 - mod(down, 2.0));
    vec2 uvF = vec2(0.86 + wrapPi(az - DUSK_AZ) * zoomF / 1.55, 0.32 - 0.305 * down);
    // A long lens would draw the picture's own grain large: there it is read soft and gives the tone alone, and the billows below give the form.
    float lodF = clamp(log2(0.6 / uInvProjection[1][1]) - log2(zoomF), 0.0, 4.0);
    vec3 sea = flowing(tFar, uvF, vec2(0.016, 0.0), 24.0, lodF) * SKY_GAIN;
    // The billows of the surface itself, broad and soft: their heads a little lighter, their hollows a little darker.
    float h0 = seaTop(p, true);
    float head = smoothstep(-150.0, 150.0, h0 - (ridgeAt(p.x).y - CLOUD_UNDER));
    // Each billow leans: the face toward the last light is lit warm, the face away from it is in its own shade, so the deck is heaps of
    // cloud with light on them and not a level sheet.
    vec3 toDusk = vec3(cos(DUSK_AZ), 0.0, sin(DUSK_AZ));
    float reachS = 110.0 + 0.03 * t;
    float lean = clamp((h0 - seaTop(p + toDusk * reachS, true)) / reachS * 2.4, -1.0, 1.0);
    // The picture gives its grain; the tone is the deck's own: cold from the sky on its heads, deep blue-violet in its hollows, and the
    // dusk on what faces it.
    float grainS = clamp(dot(sea, vec3(0.33)) / max(dot(flowing(tFar, uvF, vec2(0.016, 0.0), 24.0, 5.0) * SKY_GAIN, vec3(0.33)), 1e-4), 0.7, 1.4);
    vec3 cold = SEA_COLD * (0.1 + 0.6 * head * head) * (1.0 + 0.6 * lean);
    vec3 warm = 0.6 * SEA_WARM * smoothstep(0.0, 0.8, lean) * (0.25 + 0.75 * head) * (1.0 - 0.7 * stormSide(rd));
    sea = (cold + warm) * grainS;
    // Toward the storm the deck lies under the wall, darker; it takes the flash and each strike.
    float lit = clamp(cloudLit(ro, normalize(vec3(rd.x, 0.03, rd.z))) + 0.12 * min(dot(uFlash, vec3(0.33)), 1.0) * stormSide(rd), 0.0, 1.5);
    sea = sea * (1.0 - 0.5 * stormSide(rd)) * (1.0 + 0.7 * lit) + vec3(0.05, 0.035, 0.1) * lit * 0.5 + min(strikeLight(p) * 0.02, vec3(0.01));
    // At the horizon it goes into the dome's own cloud.
    float gone = 1.0 - exp(-t / 30000.0);
    // Behind the long lens of the strike the sea is the picture's own: the surface here only rolls it, and far out it is the picture alone.
    vec2 uvP = vec2(0.0);
    float plate = uPlate.w > 0.0 ? plateAt(az, -dip, uvP) : 0.0;
    if (plate > 0.0) {
      vec3 seaP = skyCloud(ro, rd, 0.0);
      sea = mix(sea, seaP * (0.8 + 0.3 * head) * (1.0 + 0.4 * lean), plate);
      domeFar = mix(domeFar, seaP, plate);
      gone = mix(gone, smoothstep(2500.0, 7000.0, t), plate);
    }
    sea = mix(sea, domeFar, max(gone * gone, smoothstep(0.035 / zoomF, 0.0, dip) * (1.0 - plate)));
    // Under the storm wall the sea goes into the wall's own foot: no line stands between them.
    sea = mix(sea, domeFar, stormSide(rd) * smoothstep(0.14, 0.0, dip));
    // Its edge against the land is soft: the cloud thins where it laps the rock.
    float lap = 0.94 * smoothstep(0.0, 1.0, (far - t) / (140.0 + 0.05 * t));
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
      column *= uClear.z > 0.0 ? smoothstep(0.4 * uClear.z, uClear.z, length(hit.xz - uClear.xy)) : 1.0;
      // Close to the lens the same snow is seen as it is: snakes a hand deep and a pace wide, running fast along the ground.
      if (far < 90.0) {
        float snake = 0.6 * noise(vec3(a.x / 9.0, a.y / 1.1, 0.5)).r + 0.4 * noise(vec3(a.x / 2.6, a.y / 0.33, 0.9)).b;
        column += smoothstep(0.47, 0.7, snake) * (0.5 + n) * 2.6 / max(abs(rd.y) + 0.12, 0.15) * exp(-max(above, 0.0) / 0.5) * smoothstep(90.0, 25.0, far) * (uClear.z > 0.0 ? smoothstep(0.8, 2.0, length(hit.xz - uClear.xy)) : 1.0);
      }
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
      float wide = (3.0 + 0.16 * x) * (0.5 + 0.5 * size);
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
      float thick = clamp(body * smoothstep(0.2, 0.7, torn) * (0.6 + 1.2 * gust) * 2.4, 0.0, 0.9) * uShow.w * uStage.x * clearOf;
      // Staged by shot: before the long lens of the strike a plume is a thin smoke of snow, not a bank.
      thick *= 1.0 - 0.75 * uPlate.w;
      vec3 pale = 1.7 * (skyOn(1.0, rd) + min(strikeLight(at) * 0.25, vec3(0.12, 0.1, 0.2)));
      light += through * thick * pale;
      through *= 1.0 - thick;
    }
  }

  // What is seen of the dome through the air: its cloud, softened, toward a ray lifted to the horizon.
  vec3 toDome = normalize(vec3(rd.x, max(rd.y, 0.035), rd.z));
  // Open sky is read sharp: the air before it is the same cloud, and a soft copy laid over it would wash its masses out.
  vec3 domeAir = skyCloud(ro, toDome, far > 50000.0 ? 1.0 : 5.0);
  // Where the strike's own sky stands, the air is that picture's: nothing is laid over the open sky, and the haze before a far spire is
  // the cloud behind it, read soft.
  vec2 uvQ = vec2(0.0);
  float plateOn = uPlate.w > 0.0 ? plateAt(atan(rd.z, rd.x), asin(clamp(rd.y, -1.0, 1.0)), uvQ) : 0.0;
  if (plateOn > 0.0) {
    domeAir = mix(domeAir, skyCloud(ro, rd, 5.0), plateOn);
    if (far > 50000.0) stormAir *= 1.0 - plateOn;
  }
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
    float depthV = exp(-max(ro.y - crestY, -60.0) / tall) * (abs(fallV) < 1e-5 ? reachV : (1.0 - exp(-fallV * reachV)) / fallV) / 850.0;
    float azV = atan(rd.z, rd.x);
    float bands = noise(vec3(azV * 0.9 - uTime * 0.013, rd.y * 2.6 + uTime * 0.004, 0.37)).g;
    depthV *= (0.65 + 0.7 * bands) * uShow.x * uStage.y;
    float veiled = 1.0 - exp(-depthV);
    // Open sky and the sea of cloud keep their own masses: the veil is of the ridge's air.
    if (far > 50000.0) veiled = 0.0;
    // The sea of cloud is seen from above through thin air: it keeps its lumps and its lit edge.
    if (seaAt > 0.0 && far <= seaAt + 1.0) veiled = min(veiled, 0.3);
    // Blown snow is the storm's cold violet; the warm band stays on the horizon and does not stain the air.
    vec3 snowAir = mix(domeAir * 0.9, mix(uSkyHorizon, uSkyZenith, 0.35) * 0.55, 0.65) + vec3(0.006, 0.005, 0.011);
    light = light * (1.0 - veiled) + snowAir * veiled;
    through *= 1.0 - veiled;
    // Scud: torn cloud that races low past the spires on the gale, paler than the storm behind it (staged by shot, uStage.w).
    if (uStage.w > 0.0 && far > 120.0) {
      float scud = 0.7 * noise(vec3(azV * 0.8 - uTime * 0.05, rd.y * 5.0 + uTime * 0.006, 0.61)).r + 0.3 * noise(vec3(azV * 2.6 - uTime * 0.14, rd.y * 15.0, 0.2)).b;
      float wisp = uStage.w * uShow.x * smoothstep(350.0, 1500.0, far) * smoothstep(0.5, 0.85, scud) * 0.32;
      light = light * (1.0 - wisp) + (snowAir * 1.5 + vec3(0.008, 0.008, 0.012)) * wisp;
      through *= 1.0 - wisp;
    }
  }

  // The snow before the lens: flecks in the gale, each a few times longer than it is wide, of many sizes, in gusts, at six depths. Each depth
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
    for (int k = 0; k < 6; k++) {
      float dist = 1.6 * pow(2.0, float(k)) * lens;
      if (dist * 0.8 > far) break;
      vec2 pc = onLens * dist;
      // No two depths fly quite the same way: the gale is not one stream.
      float turn = 0.36 * (rnd(ivec2(k, 3), 5u) - 0.5);
      vec2 d1 = e1 * cos(turn) + e2 * sin(turn);
      vec2 d2 = vec2(-d1.y, d1.x);
      float wideS = dist * 0.0021 / max(lens, 1.0);
      float cellQ = wideS * 11.0;
      // A fleck, not a line: a few times longer than it is wide, as the approved pictures draw their snow.
      float cellA = wideS * 16.0;
      float along = dot(pc, d1);
      float q = (dot(pc, d2) + 2.5 * wideS * sin(along / (9.0 * cellA) + float(k) * 1.7)) / cellQ;
      float qc = floor(q);
      float a = (along - (uWind.w * across * (0.7 + 0.6 * rnd(ivec2(int(qc), k), 7u))) * uTime) / cellA + 37.0 * rnd(ivec2(int(qc), k), 11u);
      float ac = floor(a);
      ivec2 cell = ivec2(int(qc), int(ac));
      // They come in gusts: a clump of them, then none.
      float gustL = noise(vec3(pc / (30.0 * cellQ) - d1 * (uTime * 0.6), float(k) * 0.31)).g;
      if (rnd(cell, uint(23 + k)) > (0.42 - 0.04 * float(k)) * smoothstep(0.3, 0.7, gustL)) continue;
      float dq = (q - qc - 0.25 - 0.5 * rnd(cell, uint(31 + k))) * cellQ;
      // Each is brightest in its middle and gone at its ends, and no two are one length.
      float lengthOf = 0.3 + 0.4 * rnd(cell, uint(41 + k));
      float fa = (a - ac - 0.02) / lengthOf;
      float lengthS = fa > 0.0 && fa < 1.0 ? 4.0 * fa * (1.0 - fa) : 0.0;
      // No two are one size: most are small, a few are big and soft.
      float sizeOf = rnd(cell, uint(67 + k));
      float thin = wideS * (0.35 + 1.5 * sizeOf * sizeOf) * (0.5 + 0.5 * lengthS);
      float flake = exp(-dq * dq / (thin * thin)) * lengthS * lengthS * (0.04 + 0.2 * rnd(cell, uint(59 + k))) * (1.0 - 0.5 * sizeOf);
      fly += hid * flake;
      hid *= 1.0 - flake;
    }
    // Against the open sky blown snow is the sky's own tone and is lost; it shows against the rock and the snow.
    fly *= uShow.w * uStage.z * mix(1.0, 0.2, smoothstep(120.0, 700.0, far));
    vec3 flakes = 1.1 * (skyOn(1.0, rd) + min(strikeLight(ro + rd * 6.0) * 0.2, vec3(0.06, 0.05, 0.1)));
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
  float depth = base * (abs(fall) < 1e-5 ? length : (1.0 - exp(-fall * length)) / fall) * uShow.x;
  float clear = exp(-depth);
  vec3 haze = mix(mix(uSkyHorizon, uSkyZenith, 0.35) * 0.6, domeAir, 0.7);
  light = light * clear + haze * (1.0 - clear);
  through *= clear;

  light += strikeGlow(ro, rd, min(far, 30000.0)) * uShow.x;
  gl_FragColor = vec4(light, through);
}`;
