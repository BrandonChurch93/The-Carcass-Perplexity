// The half-size pass of the Spine's air. It writes the light the air sends toward the camera in rgb and how much of the scene it lets through in alpha.
// Four things are marched along each view ray, to the scene's depth: the storm that stands against the ridge and leans over it, the cloud that pours
// through the saddles and down the lee, the spindrift that runs over the snow, and the thin haze of the height. The cloud sea far below is found last,
// as a surface with a soft top. All of it reads the rig, so the cloud takes the dusk and the lightning as the rock does.
import { HASH_GLSL } from '../../../core/post';
import { SEA_LEVEL } from '../shared/anchors';
import { RIG_GLSL } from '../shared/glsl';

/** March steps along a view ray, spaced by a constant ratio from NEAR to REACH metres. The cost of the pass is close to linear in STEPS. */
export const STEPS = 22;
export const NEAR = 60;
export const REACH = 14000;

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
const int STEPS = ${STEPS};
const float NEAR = ${NEAR.toFixed(1)};
const float RATIO = ${Math.pow(REACH / NEAR, 1 / STEPS).toFixed(5)};

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

// The storm: a wall that stands off the crest on the gale's side and leans over it with height. 'inside' is metres into its body past its face.
// 'fine' adds the smallest billows: asked for where its surface is shaded, not along the march.
float stormAt(vec3 p, bool detailed, out float inside) {
  vec3 ridge = ridgeAt(p.x);
  float into = ridge.x - p.z;
  float h = p.y - ridge.y;
  inside = -1e4;
  float face = max(430.0 - 0.5 * max(h - 200.0, 0.0), -260.0);
  if (into < face - 900.0 || h > 3900.0) return 0.0;
  vec3 q = p - uWind.xyz * (uTime * 7.0);
  vec4 big = noise(q / 5200.0);
  inside = into - face + (big.r - 0.42) * 1250.0 + (big.g - 0.5) * 700.0;
  // It never comes down on the crest itself: the trail and the lenses stand in clear air.
  inside = min(inside, (into - 160.0) * 2.0 + max(h - 320.0, 0.0) * 1.6);
  float body = smoothstep(-200.0, 420.0, inside) * smoothstep(3300.0, 2200.0, h + 800.0 * big.a);
  if (body <= 0.0) return 0.0;
  vec4 fine = noise(q / 880.0 + vec3(big.ga, 0.0) * 0.35);
  float d = body * 1.2 - 0.5 * (1.0 - fine.r) - 0.12 * (1.0 - fine.b);
  if (detailed) d -= 0.1 * (1.0 - noise(q / 210.0).r);
  return smoothstep(0.28, 0.8, d);
}

// The light on the storm's surface at a point: found once for a ray, where it first meets cloud that is thick enough to have a surface.
vec3 stormFace(vec3 p, float t, vec3 rd) {
  float e = 30.0 + 0.035 * t;
  float unused;
  float d0 = stormAt(p, true, unused);
  vec3 g = vec3(stormAt(p + vec3(e, 0.0, 0.0), true, unused), stormAt(p + vec3(0.0, e, 0.0), true, unused), stormAt(p + vec3(0.0, 0.0, e), true, unused)) - d0;
  vec3 n = normalize(-g + 0.02 * -rd);
  float inside;
  float over = stormAt(p + TO_SKY * 380.0, false, inside);
  float open = exp(-1.6 * over);
  vec3 lit = skyIrradiance(n) * (0.12 + 0.88 * open);
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 d = uEmitters[i].xyz - p;
    float r = uEmitters[i].w;
    float d2 = dot(d, d) + r * r;
    lit += uEmitterRadiance[i] * (3.14159 * r * r / d2 * EMITTER_CAST * (0.5 + 0.5 * dot(n, d) * inversesqrt(d2)));
  }
  return 0.62 * lit / 3.14159;
}

void main() {
  vec3 ro, rd;
  float far;
  viewRay(ro, rd, far);
  // One offset for the pixel's march: a pattern that changes with the sample of the frame and not with the frame, so that still cloud is still.
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + 0.618034 * float(uSampleIndex));

  // The cloud sea: where the ray comes down to it.
  float seaTop = SEA + 170.0;
  float tSea = rd.y < -1e-4 ? (seaTop - ro.y) / rd.y : 1e9;
  float reach = min(far, tSea);

  vec3 light = vec3(0.0);
  float through = 1.0;
  float t = NEAR * pow(RATIO, jitter);
  float before = 0.0;
  float tBefore = t;
  bool faced = false;
  vec3 face = vec3(0.0);
  for (int i = 0; i < STEPS; i++) {
    if (t >= reach || through < 0.01) break;
    float dt = min(t * (RATIO - 1.0), reach - t);
    float tAt = t + 0.5 * dt;
    vec3 p = ro + rd * tAt;
    vec3 ridge = ridgeAt(p.x);
    float into = ridge.x - p.z;
    float inside;
    float storm = stormAt(p, false, inside) * uShow.z;
    float sigma = storm / 300.0;
    float h = p.y - ridge.y;
    vec3 colour = vec3(0.0);
    if (storm > 0.0) {
      if (!faced && storm > 0.25) {
        // The surface: between the last step and this one, found by halving.
        float a = before > 0.25 ? tAt : tBefore;
        float b = tAt;
        for (int k = 0; k < 4; k++) {
          float m = 0.5 * (a + b);
          float unused;
          if (stormAt(ro + rd * m, false, unused) > 0.25) b = m; else a = m;
        }
        face = stormFace(ro + rd * b, b, rd);
        faced = true;
      }
      // Thin cloud before the surface takes the open sky; behind the surface the body is the colour of its face, and the storm's own flash is inside it.
      vec3 body = faced ? face : 0.62 * skyOn(0.7, rd);
      colour = (body + 0.6 * (uFlash * clamp(inside / 600.0, 0.0, 1.5) + strikeLight(p) * 0.25)) * sigma;
    }
    before = storm;
    tBefore = tAt;
    // Close to the land: the cloud through the saddles and down the lee.
    if (ridge.z > 0.02 && h < 420.0 && h > -1500.0 && t < 7000.0 && into > -1300.0) {
      float above = p.y - landAt(p.xz).r;
      if (above < 300.0) {
        vec3 carried = p - uWind.xyz * (uWind.w * uTime);
        float n = noise(carried / 460.0).r;
        float thick = (50.0 + 190.0 * n) * ridge.z;
        float pour = ridge.z * smoothstep(-1300.0, -200.0, into) * smoothstep(thick, thick * 0.2, above) * smoothstep(0.12, 0.5, n + 0.25 * ridge.z) * uShow.z;
        float s = pour / 110.0;
        float up = clamp(above / max(thick, 1.0), 0.0, 1.0);
        colour += 0.85 * (skyOn(0.5 + 0.5 * up, rd) * (0.35 + 0.65 * up) + uFlash * 0.5 + strikeLight(p) * 0.2) * s;
        sigma += s;
      }
    }
    if (sigma > 0.0) {
      float kept = exp(-sigma * dt);
      light += through * (1.0 - kept) * colour / sigma;
      through *= kept;
    }
    t *= RATIO;
  }

  // The sea itself: a soft top over a deep body. Its tops take the sky, its hollows are in their own shade.
  if (tSea < far && through > 0.01 && uShow.y > 0.0) {
    float span = 340.0 / max(-rd.y, 0.02);
    float covered = 0.0;
    float lit = 0.0;
    vec3 at = ro + rd * tSea;
    for (int i = 0; i < 6; i++) {
      float f = (float(i) + jitter) / 6.0;
      vec3 p = ro + rd * min(tSea + span * f, far);
      vec3 q = p - uWind.xyz * (uTime * uWind.w * 0.6);
      float n = 0.65 * noise(vec3(q.xz / 3100.0, 0.21)).r + 0.35 * noise(vec3(q.xz / 760.0, 0.63)).b;
      float top = SEA - 170.0 + 340.0 * n;
      float d = smoothstep(top + 25.0, top - 45.0, p.y) * (1.0 - covered);
      lit += d * clamp((p.y - (SEA - 170.0)) / 340.0, 0.0, 1.0);
      covered += d;
      at = p;
    }
    // Whatever the march missed is the body under the top: it closes the view and is in shade.
    covered = 1.0;
    float up = lit;
    vec3 sea = 0.8 * (skyOn(0.3 + 0.7 * up, rd) * (0.3 + 0.7 * up) + uFlash * 0.25 * stormSide(rd) + strikeLight(at) * 0.2);
    // Far off it goes into the haze of the horizon.
    float gone = 1.0 - exp(-tSea / 30000.0);
    sea = mix(sea, uSkyGround, gone);
    light += through * sea * covered;
    through *= 1.0 - covered;
  }

  // The spindrift: snow that runs over the ground in the gale, in streaks, a few metres deep. It is found where the ray meets the ground,
  // and its depth along the ray is that of a layer lying on a slope seen at this angle.
  if (far < 1400.0 && uShow.w * uStage.x > 0.0) {
    vec3 hit = ro + rd * far;
    vec4 land = landAt(hit.xz);
    float above = hit.y - land.r;
    if (above < 6.0) {
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
  float length = min(reach, 30000.0);
  float depth = base * (abs(fall) < 1e-5 ? length : (1.0 - exp(-fall * length)) / fall) * uShow.x;
  float clear = exp(-depth);
  vec3 haze = mix(mix(uSkyHorizon, uSkyZenith, 0.35), uSkyStorm * 1.5, 0.7 * stormSide(rd)) + uFlash * stormSide(rd) * 0.5;
  light = light * clear + haze * (1.0 - clear);
  through *= clear;

  gl_FragColor = vec4(light, through);
}`;
