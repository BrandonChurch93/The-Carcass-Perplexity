// The half-size pass of the Spine's air. It writes the light the air sends toward the camera in rgb and how much of the scene it lets through in alpha.
// Nothing in it is marched through with a jittered stride, so nothing in it has grain: the storm is a body whose face each view ray walks up to, the
// cloud under the crest (the sea far below, the bank against the lee, the pour through the saddles) is a surface with a soft top, the spindrift is a
// column over the snow, and the haze of the height is worked out in one. All of it reads the rig, so the cloud takes the dusk and the lightning as the rock does.
import { HASH_GLSL } from '../../../core/post';
import { SEA_LEVEL } from '../shared/anchors';
import { RIG_GLSL } from '../shared/glsl';

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
uniform vec4 uShow;
uniform vec4 uStage;
varying vec2 vUv;
${HASH_GLSL}
${RIG_GLSL}

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

// The storm: a wall that stands off the crest on the gale's side and leans over it with height. Metres into its body: positive inside, and
// outside never more than the distance to it, so that a ray can walk up to its face in strides of that length and find it without grain.
// 'fine' adds the smallest billows: asked for where its face is shaded, not on the way.
float stormDome = 0.0;
float stormIn(vec3 p, bool fine) {
  vec3 ridge = ridgeAt(p.x);
  float into = ridge.x - p.z;
  float h = p.y - ridge.y;
  // It stands well off the crest, a wall some kilometres high; with height it leans in, and from about 1200 m over the crest it spreads out
  // over the ridge and the lee as a shelf whose underside rises away.
  // Down the ridge it closes in and comes lower, and beyond the last spires it lies across the ridge with the band under it.
  float along = smoothstep(2400.0, 6000.0, p.x);
  // Down the ridge the storm keeps its own line while the ridge bends away from it into the lee: the far spires stand against open sky.
  float foot = 2600.0 + 0.5 * max(p.x - 2400.0, 0.0);
  float shelf = mix(900.0, 330.0, along);
  // The shelf ends over the lee: beyond it the sky is open, down to the band.
  float face = max(foot - max(h - 200.0, 0.0) - 4.0 * max(h - shelf, 0.0), -1300.0 + 0.7 * max(p.x - 2400.0, 0.0));
  // Metres, near enough: where its face lies back the field across it is steep, and is scaled to the distance.
  float d0 = (into - face) * mix(mix(1.0, 0.7, smoothstep(150.0, 350.0, h)), 0.2, smoothstep(shelf - 80.0, shelf + 250.0, h));
  if (d0 < -1800.0) return d0 + 1150.0;
  vec3 q = p - uWind.xyz * (uTime * 7.0);
  vec4 big = noise(q / 5200.0);
  vec4 mid = noise(q / 1700.0 + vec3(big.ga, 0.0) * 0.2);
  // Billows are domes with creases between them: the lumps of the noise, rounded over.
  float bigR = big.r * (2.0 - big.r);
  float midR = mid.r * (2.0 - mid.r);
  float lumps = (midR - 0.6) * 640.0;
  float d = d0 + (bigR - 0.6) * 1100.0 + (big.g - 0.5) * 600.0 + lumps;
  // It never comes down on the crest itself: the trail and the lenses stand in clear air.
  d = min(d, (into - 160.0) * 2.0 + max(h - 320.0, 0.0) * 1.6);
  // Its top: towers and the gaps between them.
  d = min(d, (2700.0 + 1300.0 * (big.a - 0.5) - h) * 1.2 + lumps);
  if (fine) {
    vec4 f = noise(q / 520.0);
    float fineR = f.r * (2.0 - f.r);
    // The smallest: the cauliflower on each billow, and the torn edge the wind takes off it.
    vec4 s = noise(q / 170.0 + vec3(f.ga, 0.0) * 0.15);
    float smallR = s.r * (2.0 - s.r);
    d += (fineR - 0.6) * 250.0 + (smallR - 0.6) * 80.0 + (f.b - 0.5) * 90.0;
    stormDome = 0.26 * bigR + 0.32 * midR + 0.26 * fineR + 0.16 * smallR;
  }
  return d;
}

// The light the storm's face sends back at a point of it: slate, a little lighter on what stands out of it and looks up, darker in its clefts,
// where the light inside shows when a strike is in it.
vec3 stormFace(vec3 p, float t, vec3 rd) {
  float e = 22.0 + 0.012 * t;
  float d0 = stormIn(p, true);
  float dome = stormDome;
  vec3 g = vec3(stormIn(p + vec3(e, 0.0, 0.0), true), stormIn(p + vec3(0.0, e, 0.0), true), stormIn(p + vec3(0.0, 0.0, e), true)) - d0;
  vec3 n = normalize(-g - 0.6 * e * rd);
  vec3 ridge = ridgeAt(p.x);
  float h = p.y - ridge.y;
  // How far the face here stands out of the body: the field a little way out along the normal.
  float lump = smoothstep(-0.1, 0.9, -stormIn(p + n * 300.0, false) / 300.0);
  // Its billows: light on the round of each dome, dark in the creases between.
  float shade = smoothstep(0.52, 0.95, dome) * mix(1.0, 0.5, smoothstep(300.0, 2600.0, h)) * (0.35 + 0.65 * lump) * (0.3 + 0.7 * smoothstep(-0.35, 0.6, n.y) + 0.2 * max(dot(n, uWarmDir), 0.0));
  shade = clamp(shade, 0.0, 1.0);
  vec3 c = mix(uSkyStorm * 0.27 + vec3(0.0006, 0.0, 0.0014), mix(uSkyHorizon, uSkyZenith, 0.45) * 0.3, shade);
  // Low down it is lighter: the snow in the air under it.
  vec3 q = p - uWind.xyz * (uTime * 30.0);
  float streak = noise(vec3(q.x / 420.0, q.y / 5200.0 + q.z / 1400.0, q.z / 420.0)).g;
  float under = smoothstep(500.0, -500.0, h);
  c = mix(c, mix(uSkyHorizon, uSkyZenith, 0.4) * (0.14 + 0.12 * streak), 0.4 * under);
  vec3 within = uFlash * 0.3;
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 d = uEmitters[i].xyz - p;
    float r = uEmitters[i].w;
    float d2 = dot(d, d) + r * r;
    float fall = r * r / d2 * EMITTER_CAST * 3.14159;
    c += uEmitterRadiance[i] * (fall * (0.55 + 0.45 * dot(n, d) * inversesqrt(d2)) * (0.3 + 0.7 * lump) * 0.05);
    // The bolt is in the cloud: the cloud about it glows from inside, most in its creases.
    // The bolt is in the cloud: the cloud behind it glows from inside, most in its creases, a pool of light about the channel as it is seen.
    vec3 off = d - rd * dot(d, rd);
    // The pool keeps its size in the frame, so a long lens does not turn it into a veil.
    float reach = min(1.7 * r + 120.0, 0.25 * uInvProjection[1][1] * max(t + dot(d, rd), 0.0) + 20.0);
    within += uEmitterRadiance[i] * (r / 260.0) * (0.008 * exp(-dot(off, off) / (reach * reach)) + 0.0006 * exp(-dot(off, off) / (9.0 * reach * reach)));
  }
  return c + within * (0.15 + 0.85 * smoothstep(0.82, 0.38, dome)) * (0.6 + 0.4 * lump);
}

// The top of the cloud under the crest: far out the sea itself, billowed; against the lee of the ridge a bank some hundreds of metres under the crest,
// so that the flank goes down into cloud; and in the saddles the storm's cloud, which comes over the crest and falls down the lee into the bank.
const float CLOUD_UNDER = 300.0;
float seaTop(vec3 p, bool fine) {
  vec3 q = p - uWind.xyz * (uTime * uWind.w * 0.6);
  float n = 0.65 * noise(vec3(q.xz / 3100.0, 0.21)).r + 0.35 * noise(vec3(q.xz / 760.0, 0.63)).b;
  if (fine) n += 0.14 * (noise(vec3(q.xz / 210.0, 0.43)).r - 0.5);
  vec3 ridge = ridgeAt(p.x);
  float lee = p.z - ridge.x;
  // The sea lies close under the crest on both hands, level to the horizon, and stands a little higher against the rock:
  // the ridge is a knife out of cloud, and its flanks go down into it.
  float bank = smoothstep(900.0, 120.0, abs(lee));
  float top = ridge.y - CLOUD_UNDER + 300.0 * (n - 0.5) + 70.0 * bank;
  if (ridge.z > 0.01 && lee > -700.0 && lee < 1500.0) {
    vec3 c = p - uWind.xyz * (uTime * uWind.w);
    float m = 0.6 * noise(vec3(c.xz / 520.0, 0.37)).r + 0.4 * noise(vec3(c.xz / 140.0, 0.81)).b;
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

  // The storm: its face is found by walking up to it.
  float reach = seaAt > 0.0 ? seaAt : far;
  if (uShow.z > 0.0 && through > 0.01) {
    float t = 80.0;
    float last = t;
    float nearest = -1e5;
    bool hit = false;
    for (int i = 0; i < 22; i++) {
      if (t >= reach) break;
      float d = stormIn(ro + rd * t, false);
      nearest = max(nearest, d);
      if (d > 0.0) {
        hit = true;
        break;
      }
      last = t;
      t += max(-d * 0.45, 14.0 + 0.012 * t);
    }
    // A ray that runs along its face for kilometres has not met it yet: it is looked for further on in a few long strides, since far down
    // the ridge the storm lies across it.
    bool strode = false;
    if (!hit && t < reach) {
      for (int k = 0; k < 4; k++) {
        float at = min(t + 700.0 * float((k + 1) * (k + 1)), reach);
        float d = stormIn(ro + rd * at, false);
        nearest = max(nearest, d);
        if (d > 0.0) {
          hit = true;
          strode = true;
          t = at;
          break;
        }
        last = at;
        if (at >= reach) break;
      }
    }
    if (hit) {
      for (int k = 0; k < 8; k++) {
        if (k >= 4 && !strode) break;
        float m = 0.5 * (last + t);
        if (stormIn(ro + rd * m, false) > 0.0) t = m; else last = m;
      }
      // Where the land stands just behind its face, or the ray is out of it again a little way on, it is thin.
      float deep = stormIn(ro + rd * (t + 380.0), false);
      float body = clamp((reach - t) / 220.0, 0.0, 1.0) * (0.45 + 0.55 * smoothstep(-40.0, 260.0, deep));
      light += through * stormFace(ro + rd * t, t, rd) * body;
      through *= 1.0 - body;
    } else if (nearest > -220.0) {
      // A ray that only grazes it passes through its ragged edge.
      float thin = 0.45 * smoothstep(-220.0, 0.0, nearest);
      light += through * thin * mix(uSkyStorm * 0.38, mix(uSkyHorizon, uSkyZenith, 0.45) * 0.3, 0.3);
      through *= 1.0 - thin;
    }
  }

  if (seaAt > 0.0 && through > 0.01) {
    float t = seaAt;
    vec3 p = ro + rd * t;
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
    vec3 sea = 0.5 * ((skyIrradiance(n) / 3.14159 - uWarmColour * (0.19 * wn * wn)) * (1.0 - 0.7 * hollowed) + uFlash * 0.25 * stormSide(rd) + strikeLight(p) * 0.15);
    sea = mix(sea, uSkyGround, gone);
    // Its edge against the land is soft: the cloud thins where it laps the rock.
    float lap = clamp((far - t) / 160.0, 0.0, 1.0);
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

  // The haze of the height: thin on the ridge, thicker toward the sea.
  float scale = 1100.0;
  float base = exp(-(ro.y - SEA) / scale) / 26000.0;
  float fall = rd.y / scale;
  float length = min(far, 30000.0);
  float depth = base * (abs(fall) < 1e-5 ? length : (1.0 - exp(-fall * length)) / fall) * uShow.x;
  float clear = exp(-depth);
  vec3 haze = mix(mix(uSkyHorizon, uSkyZenith, 0.35), uSkyStorm * 1.5, 0.7 * stormSide(rd)) + uFlash * stormSide(rd) * 0.5;
  light = light * clear + haze * (1.0 - clear);
  through *= clear;

  gl_FragColor = vec4(light, through);
}`;
