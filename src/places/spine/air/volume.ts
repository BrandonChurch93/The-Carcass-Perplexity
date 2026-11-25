// The half-size pass of the Spine's air. It writes the light the air sends toward the camera in rgb and how much of the scene it lets through in alpha.
// Four things are marched along each view ray, to the scene's depth: the storm that stands against the ridge and leans over it, the cloud that pours
// through the saddles and down the lee, the spindrift that runs over the snow, and the thin haze of the height. The cloud sea far below is found last,
// as a surface with a soft top. All of it reads the rig, so the cloud takes the dusk and the lightning as the rock does.
import { HASH_GLSL } from '../../../core/post';
import { SEA_LEVEL } from '../shared/anchors';
import { RIG_GLSL } from '../shared/glsl';

/** March steps along a view ray, spaced by a constant ratio from NEAR to REACH metres. The cost of the pass is close to linear in STEPS. */
export const STEPS = 24;
export const NEAR = 14;
export const REACH = 17000;

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
  return e;
}

// The open sky as cloud takes it: the cold light from above, and the last band on what faces it.
vec3 skyOn(float up, vec3 rd) {
  vec3 cold = mix(uSkyHorizon, uSkyZenith, 0.5) * (0.55 + 0.45 * up);
  float toward = max(dot(rd.xz, uWarmDir.xz), 0.0);
  return cold + uWarmColour * (0.035 * toward * toward * up);
}

// The storm: a wall that stands off the crest on the gale's side and leans over it with height. 'near' is how near its lit face a point is (1 at the face).
float stormAt(vec3 p, vec3 ridge, out float near, out float into) {
  into = ridge.x - p.z;
  float h = p.y - ridge.y;
  near = 1.0;
  float face = max(430.0 - 0.5 * max(h - 200.0, 0.0), -260.0);
  if (into < face - 900.0 || h > 3900.0) return 0.0;
  vec3 q = p - uWind.xyz * (uTime * 7.0);
  vec4 big = noise(q / 5200.0);
  float inside = into - face + (big.r - 0.42) * 1250.0 + (big.g - 0.5) * 700.0;
  float body = smoothstep(-200.0, 420.0, inside) * smoothstep(3300.0, 2200.0, h + 800.0 * big.a);
  if (body <= 0.0) return 0.0;
  vec4 fine = noise(q / 880.0 + vec3(big.ga, 0.0) * 0.35);
  near = exp(-max(inside, 0.0) / 520.0);
  return smoothstep(0.28, 0.8, body * 1.2 - 0.5 * (1.0 - fine.r) - 0.12 * (1.0 - fine.b));
}

void main() {
  vec3 ro, rd;
  float far;
  viewRay(ro, rd, far);
  float jitter = rnd(ivec2(gl_FragCoord.xy), uint(uSampleIndex) + 11u);

  // The cloud sea: where the ray comes down to it.
  float seaTop = SEA + 170.0;
  float tSea = rd.y < -1e-4 ? (seaTop - ro.y) / rd.y : 1e9;
  float reach = min(far, tSea);

  vec3 light = vec3(0.0);
  float through = 1.0;
  float t = NEAR * pow(RATIO, jitter);
  for (int i = 0; i < STEPS; i++) {
    if (t >= reach || through < 0.01) break;
    float dt = min(t * (RATIO - 1.0), reach - t);
    vec3 p = ro + rd * (t + 0.5 * dt);
    vec3 ridge = ridgeAt(p.x);
    float near, into;
    float storm = stormAt(p, ridge, near, into) * uShow.z;
    float sigma = storm / 240.0;
    float h = p.y - ridge.y;
    vec3 colour = vec3(0.0);
    if (storm > 0.0) {
      // Its own shade: how much cloud stands between this point and the open sky, up and to the lee.
      vec3 toward = p + TO_SKY * 260.0;
      float nearB, intoB;
      float over = stormAt(toward, ridgeAt(toward.x), nearB, intoB);
      float open = exp(-2.2 * over) * (0.25 + 0.75 * near);
      float up = clamp(0.5 + h / 2400.0, 0.0, 1.0);
      colour = 0.85 * (skyOn(up, rd) * (0.06 + 0.94 * open) + uFlash * (1.2 - near) + strikeLight(p) * 0.2) * sigma;
    }
    // Close to the land: the cloud through the saddles, and the spindrift.
    if (h < 420.0 && h > -1500.0 && t < 7000.0) {
      float above = p.y - landAt(p.xz).r;
      vec3 carried = p - uWind.xyz * (uWind.w * uTime);
      if (ridge.z > 0.02 && above < 300.0 && into > -1300.0) {
        float n = noise(carried / 460.0).r;
        float thick = (50.0 + 190.0 * n) * ridge.z;
        float pour = ridge.z * smoothstep(-1300.0, -200.0, into) * smoothstep(thick, thick * 0.2, above) * smoothstep(0.12, 0.5, n + 0.25 * ridge.z) * uShow.z;
        float s = pour / 90.0;
        float up = clamp(above / max(thick, 1.0), 0.0, 1.0);
        colour += 0.85 * (skyOn(0.5 + 0.5 * up, rd) * (0.35 + 0.65 * up) + uFlash * 0.5 + strikeLight(p) * 0.2) * s;
        sigma += s;
      }
      if (above < 16.0 && t < 900.0) {
        vec2 a = vec2(dot(carried.xz, uWind.xz), dot(carried.xz, vec2(-uWind.z, uWind.x)));
        float n = noise(vec3(a.x / 70.0, a.y / 11.0, p.y / 14.0)).g;
        float s = smoothstep(0.52, 0.8, n) * exp(-max(above, 0.0) / 3.5) * 0.06 * uShow.w * uStage.x;
        colour += 0.9 * (skyOn(1.0, rd) + strikeLight(p) * 0.2) * s;
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
