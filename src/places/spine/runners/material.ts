// The surfaces of a ridge-runner in the light of the rig: the hide under the coat, the claws, the locks of the coat, the tendrils.
import { NOISE_GLSL, RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';

// The light on an animal. In the open it is the rig's, as on any surface. Inside the canal the land's map knows nothing of the roof, so the
// animal takes its light from the mouth alone: the dusk and the storm seen through it, and the lightning as it lights the snow and the air outside.
const LIGHT_GLSL = /* glsl */ `
uniform vec4 uDoor;
uniform float uDoorArea;
uniform float uDoorGain;
vec3 runnerLight(vec3 p, vec3 n) {
  if (uDoor.w < 0.5) {
    // The animal's own shade on the ground is not shade on the animal: the land's sky alone, opening with height.
    vec4 land = landAt(p.xz);
    return skyIrradiance(n) * mix(land.g, 1.0, clamp((p.y - land.r) / 80.0, 0.0, 1.0)) + emitterIrradiance(p, n);
  }
  vec3 d = uDoor.xyz - p;
  float d2 = dot(d, d);
  vec3 way = d * inversesqrt(d2);
  vec3 level = normalize(vec3(way.x, 0.12, way.z));
  vec3 seen = skyRadiance(level) + emitterIrradiance(uDoor.xyz, level) * (0.75 / 3.14159);
  float facing = clamp((dot(n, way) + 0.3) / 1.3, 0.0, 1.0);
  // The walls and the ice throw a little of it back from every side.
  return 3.14159 * uDoorGain * seen * (uDoorArea / (d2 + uDoorArea)) * (facing * facing + 0.14 + 0.1 * max(-n.y, 0.0));
}`;

const BONES_GLSL = /* glsl */ `
uniform mat4 uBones[6];
uniform vec4 uBurn;
uniform vec4 uGround;`;

// The way of the bolt through the animal: a stripe down the flank from the spine toward the belly, a hand wide, leaning toward the rump as it
// goes down, with a second, thinner fork. 0 on its line, 1 at its edge. uBurn: where it starts (x, y, z) and its width.
const BURN_GLSL = /* glsl */ `
float burnAt(vec3 rest) {
  float down = clamp((uBurn.y - rest.y) / 0.62, -0.2, 1.2);
  float line = uBurn.x - 0.22 * down - 0.06 * sin(down * 9.0);
  float fork = uBurn.x + 0.26 - 0.1 * down + 0.05 * sin(down * 7.0 + 2.0);
  float across = min(abs(rest.x - line), abs(rest.x - fork) * 1.9 + 0.35 * uBurn.w);
  float side = smoothstep(0.02, -0.12, (rest.z - 0.02) * sign(uBurn.z));
  float ends = smoothstep(0.0, 0.12, down + 0.1) * smoothstep(1.15, 0.85, down);
  return across / uBurn.w + (1.0 - side * ends) * 4.0;
}`;

export const BODY_VERTEX = /* glsl */ `
attribute float aBone;
attribute float aKind;
${BONES_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying float vKind;
void main() {
  mat4 bone = uBones[int(aBone + 0.5)];
  vec4 w = modelMatrix * bone * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * mat3(bone) * normal);
  vRest = position;
  vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const BODY_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${LIGHT_GLSL}
uniform vec4 uBurn;
${BURN_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying float vKind;
void main() {
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float grain = vnoise3(vRest * vec3(14.0, 40.0, 40.0));
  float fine = vnoise3(vRest * 90.0);
  // Under the coat: matted under-fur, dark because the coat stands over it.
  vec3 albedo = mix(vec3(0.24, 0.22, 0.19), vec3(0.4, 0.37, 0.33), grain) * (0.75 + 0.5 * fine);
  float rough = 0.95;
  float occ = 0.45;
  if (vKind > 0.5) {
    // A claw: dark horn, ridged along its length, worn pale at the tip.
    albedo = mix(vec3(0.035, 0.03, 0.028), vec3(0.2, 0.17, 0.13), smoothstep(0.55, 0.9, grain) * 0.6);
    rough = 0.45;
    occ = 0.85;
  }
  // Where the bolt went through: the coat is gone and the skin is charred, split, and raw in the splits.
  float burnt = 0.0;
  if (uBurn.w > 0.0) {
    float d = burnAt(vRest);
    float ragged = d + 0.3 * (vnoise3(vRest * 7.0) - 0.5) + 0.12 * (fine - 0.5);
    burnt = 1.0 - smoothstep(0.75, 1.05, ragged);
    float split = 1.0 - smoothstep(0.0, 0.07, abs(vnoise3(vRest * vec3(3.0, 9.0, 9.0) + 3.0) - 0.5));
    float splitFine = 1.0 - smoothstep(0.0, 0.05, abs(vnoise3(vRest * vec3(9.0, 26.0, 26.0)) - 0.5));
    vec3 char_ = mix(vec3(0.018, 0.015, 0.014), vec3(0.09, 0.06, 0.045), fine * grain);
    vec3 raw = mix(vec3(0.22, 0.035, 0.02), vec3(0.42, 0.16, 0.09), fine);
    vec3 skin = mix(char_, raw, max(split, 0.6 * splitFine) * (1.0 - smoothstep(0.5, 0.95, ragged)));
    // Toward the edge of the burn the skin is scorched brown and blistered, not black.
    skin = mix(skin, vec3(0.16, 0.09, 0.05) * (0.6 + 0.8 * fine), smoothstep(0.55, 0.95, ragged) * 0.8);
    albedo = mix(albedo, skin, burnt);
    rough = mix(rough, 0.5 - 0.25 * split, burnt);
    occ = mix(occ, 0.9 - 0.4 * split, burnt);
  }
  vec3 e = runnerLight(vWorld, n) * occ;
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  c += (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough) * e / 3.14159;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const LOCK_VERTEX = /* glsl */ `
attribute vec3 aRoot;
attribute vec3 aDir;
attribute vec4 aLock;
${RIG_GLSL}
${NOISE_GLSL}
${LIGHT_GLSL}
${BONES_GLSL}
${BURN_GLSL}
uniform float uPixel;
uniform vec4 uCoat;
uniform vec4 uTone;
varying vec3 vColour;
varying vec3 vAt;
varying float vSeed;
void main() {
  int which = int(aLock.z + 0.5);
  mat4 bone = uBones[which];
  vec3 root = (modelMatrix * bone * vec4(aRoot, 1.0)).xyz;
  vec3 n = normalize(mat3(modelMatrix) * mat3(bone) * aDir);
  float size = length(modelMatrix[0].xyz);
  float seed = aLock.y;
  float t = position.y;
  float len = aLock.x * size * uCoat.x;
  float wide = aLock.w * size;

  // The burn: locks inside it are gone, locks at its edge are singed to black stubs.
  float singe = 0.0;
  if (uBurn.w > 0.0) {
    float d = burnAt(aRoot) + 0.3 * (vnoise3(aRoot * 7.0) - 0.5);
    singe = 1.0 - smoothstep(0.9, 2.3, d);
    len *= mix(1.0, 0.15 + 0.3 * fract(seed * 9.1), smoothstep(0.0, 0.7, singe));
    if (d < 0.75 + 0.2 * fract(seed * 5.3)) len = 0.0;
  }

  // A lock leaves the hide at a slant toward the rump, bends under its own weight, and narrows to a point: a wet spike of hair, not a curtain.
  vec3 comb = normalize(mat3(modelMatrix) * vec3(-1.0, 0.0, 0.0));
  float off = 0.4 + 0.45 * fract(seed * 13.7);
  float fall = 0.45 + 0.5 * fract(seed * 3.3);
  vec3 wind = normalize(uWind.xyz);
  // The gale takes the loose end: a steady lean and a flutter that runs through the coat as gusts pass over the animal.
  float gust = 0.5 + 0.5 * sin(uTime * (4.0 + 5.0 * fract(seed * 7.1)) + seed * 40.0 - dot(root, wind) * 3.0);
  float wave = 0.5 + 0.5 * sin(uTime * 1.9 - dot(root, wind) * 1.4 + 1.3 * sin(uTime * 0.7 + root.x));
  float blow = uCoat.y * (0.3 + 0.4 * gust + 0.5 * wave);
  // The animal breathes and shivers: the coat lifts a little with each.
  float lift = 1.0 + uCoat.z * (0.5 + 0.5 * sin(uTime * 23.0 + seed * 60.0));
  // Each lock leans a little its own way, so the coat is tousled.
  vec3 own = normalize(cross(n, comb) + vec3(1e-4)) * (0.5 * (fract(seed * 41.0) - 0.5));
  vec3 lean = comb * 0.45 + own + vec3(0.0, -1.0, 0.0) * (fall * 0.35);
  vec3 p = root + len * (n * (off * lift * (t - 0.5 * t * t)) + lean * t + vec3(0.0, -1.0, 0.0) * (fall * 0.5 * t * t) + wind * (blow * t * t));
  vec3 tangent = n * (off * lift * (1.0 - t)) + lean + vec3(0.0, -1.0, 0.0) * (fall * t) + wind * (blow * 2.0 * t);
  // Nothing hangs through the ground: a lock that reaches it lies on it.
  p.y = max(p.y, uGround.x + 0.012 + 0.02 * fract(seed * 17.0));
  vec3 toCamera = cameraPosition - p;
  float far = length(toCamera);
  toCamera /= far;
  vec3 side = normalize(cross(tangent, toCamera));
  float w = max(wide * (1.0 - 0.88 * t), 0.75 * uPixel * far);
  p += side * (position.x * w);

  // Light at the lock: the hide's way of facing, turned a little to the lens, and darker toward the root where the coat stands over it.
  vec3 facing = normalize(n + 0.35 * toCamera + vec3(0.0, 0.25, 0.0));
  float deep = mix(0.4, 1.0, pow(t, 0.5));
  vec3 e = runnerLight(p, facing) * deep;
  // Colour: grey-brown at the root, dirty cream along the lock, and rime on the ends of what looks up or into the wind.
  float patch_ = vnoise3(aRoot * 2.6 + uTone.w * 31.0);
  float stain = vnoise3(aRoot * 7.0 + 9.0);
  vec3 cream = mix(uTone.rgb, uTone.rgb * vec3(0.72, 0.64, 0.52), 0.75 * smoothstep(0.35, 0.8, patch_)) * (0.8 + 0.4 * fract(seed * 23.0));
  // The skirt and the legs are soiled.
  cream *= mix(vec3(0.62, 0.55, 0.47), vec3(1.0), smoothstep(0.1, 0.75, aRoot.y + 0.3 * stain));
  vec3 albedo = mix(cream * 0.6, cream, smoothstep(0.0, 0.5, t));
  float windward = n.y * 0.55 - dot(n, wind) * 0.55 + 0.6 * (stain - 0.5) + uCoat.w;
  float rime = smoothstep(0.1, 0.6, windward) * smoothstep(0.25, 0.9, t + 0.3 * fract(seed * 31.0));
  albedo = mix(albedo, vec3(0.78, 0.81, 0.86), rime * 0.85);
  albedo = mix(albedo, vec3(0.02, 0.017, 0.015), smoothstep(0.05, 0.5, singe) * (0.55 + 0.45 * t));
  vColour = albedo * e / 3.14159;
  vAt = vec3(position.x, t, w / max(uPixel * far, 1e-6));
  vSeed = seed;
  if (len <= 0.0) p = vec3(0.0, -1e5, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const LOCK_FRAGMENT = /* glsl */ `
${RIG_UNIFORMS_GLSL}
varying vec3 vColour;
varying vec3 vAt;
uniform float uHairs;
varying float vSeed;
void main() {
  // One lock is a few hairs: each wanders a little and ends at its own length. Far off, where a hair is thinner than a pixel, the lock is whole.
  float t = vAt.y;
  float count = uHairs;
  float across = (vAt.x * 0.5 + 0.5) * count;
  float id = floor(across);
  float h = fract(sin((id + 1.0) * 12.9898 + vSeed * 78.233) * 43758.5453);
  float f = fract(across) - 0.5 + 0.22 * sin(t * (4.0 + 7.0 * h) + h * 40.0);
  float ends = 0.55 + 0.45 * h;
  float through_ = t / ends;
  float hair = step(abs(f), (0.3 + 0.25 * t) * (1.0 - through_ * through_ * through_)) * step(t, ends);
  float near = smoothstep(0.8, 2.2, vAt.z * 2.0 / count);
  if (mix(1.0, hair, near) < 0.5) discard;
  gl_FragColor = vec4(vColour * (mix(1.0, 0.72 + 0.56 * h, near) * (1.0 - uSolo)), 1.0);
}`;

export const TENDRIL_VERTEX = /* glsl */ `
attribute vec4 aHang;
attribute vec4 aLimb;
${BONES_GLSL}
uniform float uTime;
uniform vec4 uFace;
uniform vec4 uWrithe;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vAt;
void main() {
  mat4 bone = uBones[5];
  float t = position.y;
  float seed = aLimb.w;
  float size = length(modelMatrix[0].xyz);
  // aHang: where it leaves the stump (y, z on its face) and how it splays; aLimb: length, thickness, how much it curls, a seed.
  vec3 from = uFace.xyz + vec3(0.0, aHang.x, aHang.y);
  vec3 out_ = normalize(vec3(0.55, -0.2 + 0.6 * aHang.x, aHang.z));
  vec3 root = (modelMatrix * bone * vec4(from, 1.0)).xyz;
  vec3 lead = normalize(mat3(modelMatrix) * mat3(bone) * out_);
  vec3 across = normalize(cross(lead, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0));
  float len = aLimb.x * size;
  // Alive, a tendril hangs, and a slow wave runs down it, each at its own pace; its end curls and feels about.
  float pace = 0.9 + 1.3 * fract(seed * 5.7);
  float wr = uWrithe.x * (0.25 + 0.75 * t);
  float s1 = sin(uTime * pace - t * 4.0 + seed * 30.0);
  float s2 = sin(uTime * pace * 0.63 - t * 6.5 + seed * 17.0);
  float curl = aLimb.z * t * t * (1.0 + 0.5 * uWrithe.x * sin(uTime * pace * 0.8 + seed * 9.0));
  vec3 down = vec3(0.0, -1.0, 0.0);
  // uWrithe.y: 0 hanging from a standing animal, 1 spilled on the ground from a dead one.
  vec3 hangs = lead * (0.3 * t - 0.12 * t * t) + down * (0.25 * t + 0.6 * t * t) + across * (0.12 * wr * s1 + 0.05 * aHang.w * t) + lead * (0.1 * wr * s2 - 0.35 * curl * t) + down * (-0.25 * curl * t);
  vec3 flatLead = normalize(vec3(lead.x, 0.0, lead.z) + across * (0.9 * aHang.w));
  vec3 spilled = flatLead * (0.9 * t - 0.25 * aLimb.z * t * t * t) + across * (0.14 * sin(t * 6.0 + seed * 20.0) * t + 0.22 * sin(t * 13.0 + seed * 31.0) * t * t + 0.5 * aLimb.z * t * t * sign(aHang.w)) + down * (1.2 * t) + vec3(0.0, 0.1 * aLimb.z * t * t * step(0.6, fract(seed * 11.0)), 0.0);
  vec3 centre = root + len * mix(hangs, spilled, uWrithe.y);
  float r = aLimb.y * size * (1.0 - 0.8 * pow(t, 1.4)) * (1.0 + 0.12 * sin(t * 26.0 + seed * 12.0));
  centre.y = max(centre.y, uGround.x + r * 0.8);
  // The ring of the tube, across the way it runs. The way is taken from the hanging shape: near enough for a cord this thin.
  vec3 way = normalize(mix(lead * (0.3 - 0.24 * t) + down * (0.25 + 1.2 * t), flatLead, uWrithe.y));
  vec3 u = normalize(cross(way, across));
  vec3 v = cross(way, u);
  vec3 ring = u * position.x + v * position.z;
  vec3 p = centre + ring * r;
  vWorld = p;
  vNormal = normalize(ring);
  vAt = vec3(t, atan(position.z, position.x), seed);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const TENDRIL_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${LIGHT_GLSL}
uniform vec4 uCoat;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vAt;
void main() {
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float t = vAt.x;
  // Bare skin: dark, ringed like a worm's, paler and raw toward the root, wet.
  float rings = smoothstep(0.3, 0.7, fract(t * (22.0 + 10.0 * fract(vAt.z * 3.0)) + 0.4 * sin(vAt.y * 2.0)));
  float blotch = vnoise3(vec3(t * 9.0, vAt.y * 1.5, vAt.z * 40.0));
  vec3 albedo = mix(vec3(0.05, 0.035, 0.035), vec3(0.17, 0.1, 0.09), 0.55 * blotch + 0.3 * (1.0 - t)) * (0.75 + 0.35 * rings);
  // Rime where it looks up, in beads.
  float rime = smoothstep(0.45, 0.8, n.y * 0.55 + 0.5 * uCoat.w + 0.8 * (vnoise3(vWorld * 45.0) - 0.5)) * smoothstep(0.3, 0.6, vnoise3(vWorld * 11.0) + 0.5 * uCoat.w);
  albedo = mix(albedo, vec3(0.74, 0.78, 0.84), rime);
  float rough = mix(0.32, 0.85, rime);
  vec3 e = runnerLight(vWorld, n) * (0.55 + 0.45 * t);
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  vec3 r = reflect(-toCamera, n);
  c += (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough) * runnerLight(vWorld, normalize(r + n)) / 3.14159;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
