// The lid: the thin sheet of evening cloud that lies over the socket of the Eye. The camera climbs through it looking straight down,
// and inside it the Eye hands over to the rise. Both places draw it with this one function, from the numbers of handoff.json,
// in the lid's own measure: one unit across is half the height of the view on the water at the cut (212 m in the Eye, 20 km in the rise),
// and one unit up is the height of the camera at the cut. A ray straight down through the same point of the frame is then the same ray
// in both places, so each layer slides against the water as it does on the other side of the cut.
import * as THREE from 'three';

export interface LidNumbers {
  sun: number[];
  sunlit: number[];
  shade: number[];
  inside: number[];
  insideWarm: number[];
  drift: number[];
  erodeFrames: number;
  erodePower: number;
  shadow: number;
}

export interface LidState {
  /** Seconds since the first frame of the rise: negative in the Eye. */
  tau: number;
  /** How far the sheet has broken up: 0 whole, 1 gone. */
  eroded: number;
}

/** The lid at a time, in seconds since the first frame of the rise. A pure function of the time. */
export function lidAt(tau: number, n: LidNumbers, fps: number): LidState {
  const u = Math.min(1, Math.max(0, (tau * fps) / n.erodeFrames));
  return { tau, eroded: u ** n.erodePower };
}

/** The uniforms of the lid. `unit` is the world length of one unit across, `tall` the world height of the camera at the cut. */
export function lidUniforms(n: LidNumbers, centre: [number, number], unit: number, tall: number): Record<string, THREE.IUniform> {
  const v = (a: number[]): THREE.Vector3 => new THREE.Vector3(a[0], a[1], a[2]);
  return {
    // x: 1 while the lid is drawn (0: no surface reads it). y: seconds since the cut. z: how far it has broken up. w: how dark its shade lies on the water.
    uLid: { value: new THREE.Vector4(0, 0, 0, 0) },
    uLidFrame: { value: new THREE.Vector4(centre[0], centre[1], unit, tall) },
    uLidSun: { value: v(n.sun).normalize() },
    uLidSunlit: { value: v(n.sunlit) },
    uLidShade: { value: v(n.shade) },
    uLidInside: { value: v(n.inside) },
    uLidWarm: { value: v(n.insideWarm) },
    uLidDrift: { value: new THREE.Vector2(n.drift[0], n.drift[1]) },
  };
}

// Needs vnoise before it.
export const LID_GLSL = /* glsl */ `
uniform vec4 uLid;
uniform vec4 uLidFrame;
uniform vec3 uLidSun;
uniform vec3 uLidSunlit;
uniform vec3 uLidShade;
uniform vec3 uLidInside;
uniform vec3 uLidWarm;
uniform vec2 uLidDrift;

const int LID_LAYERS = 11;
// From the top down. x: height. y: how much of the layer is open when the sheet is whole (under 0: none). z: how thick it is.
const vec3 LID_LAYER[11] = vec3[11](
  vec3(1.064, 0.42, 0.9), vec3(1.043, 0.26, 1.6), vec3(1.022, 0.04, 2.6), vec3(1.0, -0.12, 3.6), vec3(0.979, -0.04, 3.2), vec3(0.957, 0.06, 2.6),
  vec3(0.934, 0.12, 1.8), vec3(0.905, 0.34, 1.2), vec3(0.872, 0.46, 0.9), vec3(0.838, 0.54, 0.7), vec3(0.803, 0.6, 0.55));

// The large shape of the sheet: where it is thick and where it will open. One field for every layer, so a gap is a well through all of them.
float lidBig(vec2 q) {
  vec2 d = uLidDrift * uLid.y;
  return 0.55 * vnoise(q * 2.3 + vec2(3.1, 7.7) + d) + 0.45 * vnoise(q * 6.7 + vec2(11.3, 2.4) + d * 1.7);
}

// How open the sheet is at a place: it breaks up with time, it thins toward its rim, and it opens first a little off the middle.
float lidOpen(vec2 q) {
  return 1.05 * uLid.z + 0.9 * smoothstep(0.55, 1.4, length(q));
}

// The first gap: long, a little off the middle, and bent by the large shape of the sheet, so that its edge is the edge of the cloud.
float lidWell(vec2 q, float big) {
  vec2 w = q - vec2(0.05, -0.035) + (big - 0.5) * vec2(0.16, -0.11);
  w = vec2(0.8 * w.x + 0.6 * w.y, -0.6 * w.x + 0.8 * w.y);
  return 0.36 * smoothstep(0.08, 0.36, uLid.z) * exp(-w.x * w.x / 0.016 - w.y * w.y / 0.004);
}

// The cloud between the eye and whatever lies at 'far' along the ray: rgb is its light, a is how much of what lies behind comes through.
vec4 lidOver(vec3 ro, vec3 rd, float far) {
  float camA = ro.y / uLidFrame.w;
  float squash = uLidFrame.z / uLidFrame.w;
  vec3 ld = normalize(vec3(rd.x, rd.y * squash, rd.z));
  float down = max(-ld.y, 0.3);
  // The low sun is on one side of the frame: the cloud on that side is warm, on the other blue grey.
  vec2 sunSide = normalize(uLidSun.xz);
  float side = clamp(0.5 + 0.9 * dot(ld.xz, sunSide), 0.0, 1.0);
  // The light that gets in from the side of the sun is not even, and it moves through the white as the lens climbs.
  side = clamp(side + 0.5 * (vnoise(ld.xz * 1.4 + sunSide * camA * 34.0) - 0.5), 0.0, 1.0);
  vec3 within = mix(uLidInside, uLidWarm, side);
  // How far the lens has come out of the top: under it the cloud is lit by what gets in, over it by the sun and the sky.
  float above = smoothstep(0.995, 1.03, camA);
  // As it breaks up the sheet thins too, and the last of it is gone before it stops being drawn.
  float thin = mix(1.0, 0.3, uLid.z) * (1.0 - smoothstep(0.88, 1.0, uLid.z));
  vec2 d = uLidDrift * uLid.y;
  // The fibres of the cloud lie along the wind.
  vec2 wind = normalize(uLidDrift);
  mat2 comb = mat2(wind.x * 0.92, -wind.y, wind.y * 0.92, wind.x);
  vec3 sum = vec3(0.0);
  float tr = 1.0;
  // The cloud the lens itself stands in: soft, uneven, and nearly all there is for the few frames either side of the cut.
  float fog = 0.95 * exp(-pow((camA - 0.997) / 0.019, 2.0));
  if (fog > 0.001) {
    float uneven = 0.82 + 0.36 * vnoise(ld.xz * 2.6 - wind * camA * 26.0);
    float a = fog * (0.9 + 0.1 * uneven);
    sum += a * within * uneven;
    tr *= 1.0 - a;
  }
  for (int i = 0; i < LID_LAYERS; i++) {
    vec3 layer = LID_LAYER[i];
    float near = camA - layer.x;
    if (near <= 0.0) continue;
    float t = (layer.x * uLidFrame.w - ro.y) / rd.y;
    if (t > far) break;
    vec2 q = (ro.xz + rd.xz * t - uLidFrame.xy) / uLidFrame.z;
    float open = layer.y + lidOpen(q);
    if (open >= 1.0) continue;
    float big = lidBig(q);
    open += lidWell(q, big);
    // No fine cloud can close what the large shape leaves this open.
    if ((0.56 * big - 0.06) * 1.6 + 0.5 <= open) continue;
    vec2 f = comb * q;
    float finest = vnoise(f * 113.0 + layer.x * 53.0 + d * 9.0);
    // Close to the lens the cloud has grain the eye can still see: it is too fine to draw once the sheet is far below.
    float close = 1.0 - smoothstep(0.1, 0.3, near);
    if (close > 0.0) finest = mix(finest, 0.55 * finest + 0.45 * vnoise(f * 290.0 + layer.x * 71.0 - d * 14.0), close);
    float fine = 0.5 * vnoise(f * 19.0 + layer.x * 37.0 + d * 3.0) + 0.3 * vnoise(f * 47.0 + layer.x * 91.0 - d * 5.0) + 0.2 * finest;
    float h = 0.56 * big + 0.44 * fine;
    float n = clamp((h - 0.5) * 1.6 + 0.5, 0.0, 1.0);
    float cover = smoothstep(open - 0.07, open + 0.45, n);
    if (cover <= 0.0) continue;
    float a = 1.0 - exp(-1.5 * layer.z * thin * cover * cover * min(near / 0.02, 1.0) / down);
    vec3 colour = within * (0.62 + 0.76 * mix(fine, 0.6 * fine + 0.4 * finest, close));
    if (above > 0.0) {
      // The low sun reaches a place on the sheet when the cloud toward it stands no higher: every lump has a lit side and a side in shade.
      vec2 toSun = q + sunSide * 0.03;
      vec2 fs = comb * toSun;
      float hs = 0.56 * lidBig(toSun) + 0.44 * (0.5 * vnoise(fs * 19.0 + layer.x * 37.0 + d * 3.0) + 0.3 * vnoise(fs * 47.0 + layer.x * 91.0 - d * 5.0) + 0.2 * finest);
      float lit = clamp(0.5 + 6.0 * (h - hs) + 0.5 * (cover - 0.75), 0.0, 1.0);
      lit = lit * lit * (3.0 - 2.0 * lit) * mix(0.4, 1.0, tr);
      vec3 top = mix(uLidShade, uLidSunlit, lit) * (0.5 + 1.0 * n);
      colour = mix(colour, top, above);
    }
    sum += tr * a * colour;
    tr *= 1.0 - a;
    if (tr < 0.01) break;
  }
  // The shade of the sheet lies on the water under it.
  if (uLid.w > 0.0 && tr > 0.01) {
    vec2 g = (ro.xz + rd.xz * far - uLidFrame.xy) / uLidFrame.z - sunSide * 0.12;
    float big = lidBig(g);
    float open = -0.12 + lidOpen(g) + lidWell(g, big);
    float shadow = smoothstep(open, open + 0.38, clamp((big - 0.5) * 1.6 + 0.5, 0.0, 1.0));
    tr *= 1.0 - uLid.w * thin * shadow;
  }
  return vec4(sum, tr);
}`;
