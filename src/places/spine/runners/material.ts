// The surfaces of a ridge-runner in the light of the rig: the skin (hide, paws, claws, the bare face), the coat (locks in clumps, cut from
// the picture of the coat), the tendrils.
import { NOISE_GLSL, RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';

// The light on an animal. In the open it is the rig's, as on any surface. Inside the canal the land's map knows nothing of the roof, so the
// animal takes its light from the mouth alone: the dusk and the storm seen through it, and the lightning as it lights the snow and the air outside.
const LIGHT_GLSL = /* glsl */ `
uniform vec4 uDoor;
uniform float uDoorArea;
uniform float uDoorGain;
uniform vec3 uDoorNear;
float runnerOpen(vec3 p) {
  vec4 land = landAt(p.xz);
  float vis = mix(land.g, 1.0, clamp((p.y - land.r) / 80.0, 0.0, 1.0));
  float roof = CANAL_FLOOR + land.a;
  float under = smoothstep(0.3, 1.0, land.a) * smoothstep(roof + 1.5, roof + 0.5, p.y);
  return mix(vis, min(land.b * uUnder, 1.0), under);
}
vec3 runnerLight(vec3 p, vec3 n) {
  vec3 e = skyIrradiance(n) * runnerOpen(p) + emitterIrradiance(p, n) * min(1.0, 4.0 * skyOpen(p));
  if (uDoor.w > 0.5) {
    // Inside the canal the two mouths are the windows, as they are for the rock about it: cold light on what faces them, by the share
    // of the sky each holds from there, and a part of it from all round off the ice and the rimed wall.
    vec3 d = uDoor.xyz - p;
    vec3 back = uDoorNear - p;
    float d2 = dot(d, d);
    vec3 way = d * inversesqrt(d2);
    float sE = 800.0 / (d2 * 3.14159 + 800.0);
    float sM = 900.0 / (dot(back, back) * 3.14159 + 900.0);
    vec3 cold = mix(uSkyHorizon, uSkyZenith, 0.4) * 3.14159;
    // A coat holds light in itself and gives it back warmer than the ice does.
    cold = mix(cold, dot(cold, vec3(0.3, 0.5, 0.2)) * vec3(1.14, 1.0, 0.84), 0.55);
    float up = 0.75 + 0.25 * n.y;
    // The far mouth is the window; the mouth behind the lens is far off and gives the shade its little light.
    e = cold * uDoorGain * up * (sE * (0.14 + 0.86 * max(dot(n, way), 0.0)) + 0.3 * sM * (0.3 + 0.7 * max(dot(n, normalize(back)), 0.0)));
    // The flash comes in by the far mouth.
    vec3 level = normalize(vec3(way.x, 0.12, way.z));
    vec3 flash = emitterIrradiance(uDoor.xyz, level) * (1.0 / 3.14159) + uFlash;
    e += flash * uDoorArea / (d2 + uDoorArea) * (0.35 + 0.65 * max(dot(n, way), 0.0)) * 3.0;
    // Seen against the mouth, the light comes through the ends of the coat along its outline: a cold rim.
    vec3 toLens = normalize(cameraPosition - p);
    float through = pow(1.0 - abs(dot(n, toLens)), 4.0) * smoothstep(0.1, 0.8, dot(way, -toLens));
    // The rim is warm from the slit of last light at the horizon, and violet in a flash.
    vec3 warm = dot(cold, vec3(0.333)) * vec3(1.7, 0.9, 0.45);
    e += (cold * 1.5 + warm * 3.5 + flash * 3.0) * sE * 2.5 * through;
  }
  return e;
}`;

const BONES_GLSL = /* glsl */ `
uniform mat4 uBones[12];
uniform vec4 uGround;
// b: the two bones of a place and the weight of the first.
mat4 boneOf(vec3 b) {
  return uBones[int(b.x + 0.5)] * b.z + uBones[int(b.y + 0.5)] * (1.0 - b.z);
}
// The ground under an animal is a plane: its height at the world's origin, and its slope along x and z.
float groundY(vec3 p) {
  return uGround.x + dot(uGround.yz, p.xz);
}`;

// Where the bolt went through, in the animal's own metres at rest: uBurn is the middle of the wound and how far the burn reaches.
// 0 in the split, 1 at the edge of the bare patch, over 1 in the singed coat round it.
/** How much narrower the burn is along the body than round it, less one. */
export const BURN_NARROW = 1.5;
const BURN_GLSL = /* glsl */ `
const float BURN_NARROW = ${BURN_NARROW.toFixed(2)};
uniform vec4 uBurn;
uniform vec3 uBurnU;
float burnAt(vec3 rest) {
  if (uBurn.w <= 0.0) return 9.0;
  // Narrow along the body, long round it: the way the stroke ran over the flank.
  vec3 r = rest - uBurn.xyz;
  r += uBurnU * (dot(r, uBurnU) * BURN_NARROW);
  return length(r) / uBurn.w;
}`;

export const SKIN_VERTEX = /* glsl */ `
attribute vec3 aBones;
attribute float aKind;
${BONES_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying vec3 vRestNormal;
varying float vKind;
void main() {
  mat4 bone = boneOf(aBones);
  vec4 w = modelMatrix * bone * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * mat3(bone) * normal);
  vRest = position;
  vRestNormal = normal;
  vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const SKIN_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${LIGHT_GLSL}
${BURN_GLSL}
uniform vec4 uTone;
uniform vec4 uCoat;
uniform vec4 uGround;
uniform sampler2D tShag;
uniform sampler2D tShagData;
uniform sampler2D tBurn;
uniform vec3 uBurnV;
float groundY(vec3 p) {
  return uGround.x + dot(uGround.yz, p.xz);
}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying vec3 vRestNormal;
varying float vKind;
const vec3 SHAG_MEAN = vec3(0.237, 0.215, 0.232);
void main() {
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  // The close coat under the locks, from the picture of the coat, laid by place on three axes so that it is pulled long nowhere.
  vec3 w = pow(abs(normalize(vRestNormal)), vec3(4.0));
  w /= w.x + w.y + w.z;
  float s = vKind > 3.5 ? 0.3 : 0.55;
  vec3 q = vRest / s + uTone.w * 5.0;
  vec3 shag = (texture2D(tShag, q.zy).rgb * w.x + texture2D(tShag, q.xz).rgb * w.y + texture2D(tShag, q.xy).rgb * w.z) / SHAG_MEAN;
  vec3 lie = texture2D(tShagData, q.zy).rgb * w.x + texture2D(tShagData, q.xz).rgb * w.y + texture2D(tShagData, q.xy).rgb * w.z;
  float fine = vnoise3(vRest * 90.0);
  float grain = vnoise3(vRest * vec3(14.0, 40.0, 40.0));
  n = normalize(n + 0.9 * (lie.x - 0.5) * normalize(cross(n, vec3(0.0, 1.0, 0.001))) + 0.9 * (lie.y - 0.5) * vec3(0.0, 1.0, 0.0));
  // Under the locks the roots are in each other's shade.
  vec3 albedo = uTone.rgb * shag * mix(0.45, 0.95, smoothstep(0.2, 0.7, lie.b));
  float rough = 0.95;
  float occ = 0.55;
  if (vKind > 4.5) {
    // The paw: a short close coat, wet and dark toward the pads.
    albedo = mix(vec3(0.035, 0.03, 0.028), uTone.rgb * shag * 0.75, 0.55 + 0.3 * fine);
    occ = 0.75;
  }
  if (vKind > 5.5) {
    // A claw: dark horn, ridged along its length, worn pale at the tip, wet.
    albedo = mix(vec3(0.03, 0.026, 0.024), vec3(0.12, 0.1, 0.08), smoothstep(0.45, 0.9, grain) * 0.6);
    rough = 0.62;
    occ = 0.9;
  }
  if (vKind > 6.5) {
    // The face: bare dark skin, creased, where the tendrils root.
    albedo = mix(vec3(0.03, 0.022, 0.024), vec3(0.11, 0.07, 0.065), 0.6 * fine + 0.4 * grain);
    rough = 0.5;
    occ = 0.6;
  }
  // Rime where the hide looks up.
  // On the paws it lies in patches between the toes, not as a cap.
  float rime = smoothstep(0.45, 0.9, n.y + 0.5 * (grain - 0.5) + uCoat.w - (vKind > 4.5 ? 0.35 + 0.5 * vnoise3(vRest * 23.0) : 0.0)) * (vKind > 5.5 ? 0.35 : 0.7);
  albedo = mix(albedo, vec3(0.86, 0.88, 0.92), rime);
  // Where the bolt went through: the coat is gone and the skin is charred, split, and raw in the splits.
  float d = burnAt(vRest);
  if (d < 3.0) {
    // The picture of the burn, laid on the flank: its split runs round the body from the spine toward the belly.
    vec3 r = vRest - uBurn.xyz;
    vec2 uv = 0.5 + vec2(dot(r, uBurnU), dot(r, uBurnV)) / (uBurn.w * 2.3);
    vec3 pic = texture2D(tBurn, uv).rgb;
    // The picture is a scorched hide as it is: a raw split, the coat singed to tight dark curls either side of it, paler outward. It is
    // laid as it was photographed, no hollow cut in it and nothing crushed to black: what the lens sees in the wound is hide and hair.
    vec2 edge = abs(uv - 0.5) * 2.0;
    float on = (1.0 - smoothstep(0.6, 0.95, max(edge.x, edge.y))) * smoothstep(0.03, 0.1, max(pic.r, max(pic.g, pic.b)));
    float raw = smoothstep(0.02, 0.1, pic.r - 1.25 * pic.g);
    vec3 hide = pic * vec3(0.95, 0.84, 0.8);
    // The split is deepest in its middle and wet there.
    hide = mix(hide, vec3(0.16, 0.045, 0.03) * (0.5 + 2.0 * pic.r), 0.6 * raw);
    albedo = mix(albedo, hide, on);
    rough = mix(rough, mix(0.92, 0.5, raw), on);
    occ = mix(occ, mix(0.85, 0.6, raw), on);
  }
  vec3 e = runnerLight(vWorld, n) * occ;
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  vec3 r2 = reflect(-toCamera, n);
  r2.y = abs(r2.y);
  c += (0.04 + 0.5 * pow(1.0 - nv, 5.0)) * (1.0 - rough) * (1.0 - rough) * runnerLight(vWorld, normalize(r2 + n)) * occ / 3.14159;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// A lock of the coat: a ribbon laid on a curve from its root over a bend to its end, turned to the lens. Its light is worked out at
// each of its points; the picture of the coat gives it its hairs.
export const LOCK_VERTEX = /* glsl */ `
attribute vec3 aRoot;
attribute vec3 aCtrl;
attribute vec3 aTip;
attribute vec4 aCard;
attribute vec4 aLockBones;
${RIG_GLSL}
${LIGHT_GLSL}
${BONES_GLSL}
uniform vec4 uCoat;
varying vec3 vLight;
varying vec3 vFrostLight;
varying vec4 vAt;
varying vec4 vInfo;
void main() {
  mat4 bone = modelMatrix * boneOf(aLockBones.xyz);
  float size = length(modelMatrix[0].xyz);
  vec3 r = (bone * vec4(aRoot, 1.0)).xyz;
  vec3 c = (bone * vec4(aCtrl, 1.0)).xyz;
  vec3 e = (bone * vec4(aTip, 1.0)).xyz;
  float seed = aCard.y;
  // The wind in the coat: uCoat.y how hard it blows, uCoat.z a shiver. The end of a lock moves most, each at its own pace.
  float span = distance(r, e);
  float gust = sin(uTime * (5.0 + 4.0 * seed) + seed * 40.0 + dot(r, vec3(3.1, 0.0, 2.3))) + 0.6 * sin(uTime * (11.0 + 7.0 * fract(seed * 7.3)) + seed * 91.0)
    + 0.9 * sin(uTime * 2.3 - dot(r, uWind.xyz) * 2.5);
  vec3 blow = (uWind.xyz * (0.1 * uCoat.y) + vec3(0.0, 0.05 * uCoat.y, 0.0) * sin(uTime * 7.0 + seed * 13.0)) * gust + uCoat.z * vec3(sin(uTime * 31.0 + seed * 50.0), 0.0, cos(uTime * 27.0 + seed * 70.0));
  e += blow * span;
  c += blow * span * 0.35;
  e.y = max(e.y, groundY(e) + 0.012);
  float t = position.y;
  vec3 p = mix(mix(r, c, t), mix(c, e, t), t);
  vec3 way = normalize(mix(c - r, e - c, t) + vec3(0.0, 1e-5, 0.0));
  vec3 toCamera = normalize(cameraPosition - p);
  vec3 side = normalize(cross(way, toCamera));
  // Broad where it leaves the body, drawn in to its end.
  float w = aCard.x * size;
  p += side * (position.x * w);
  // It is lit as the body under it is, and a little as itself: the coat reads as the body's shape, with each lock catching its own light.
  vec3 nb = normalize(c - mix(r, e, 0.45) + vec3(0.0, 1e-4, 0.0));
  // Hair takes light from all round: the lock is lit as something between its own way out of the body and the open sky.
  vec3 n = normalize(nb + vec3(0.0, 0.3, 0.0) + side * (0.35 * position.x) + toCamera * 0.2);
  // Roots stand in each other's shade.
  float occ = mix(0.12 + 0.43 * uDoor.w, 1.0, smoothstep(0.05, 0.85, t)) * (0.7 + 0.5 * fract(seed * 3.77));
  vLight = runnerLight(p, n) * occ / 3.14159;
  vFrostLight = runnerLight(p, normalize(n + vec3(0.0, 0.8, 0.0))) / 3.14159;
  vAt = vec4(position.x, t, seed, aCard.z);
  // How much this lock is frosted: it looks up, and it is on the weather side.
  // Along the outline in the open the locks stand clear of the rime and dark against the snow behind them.
  float outline = pow(1.0 - abs(dot(nb, toCamera)), 3.0) * (1.0 - uDoor.w);
  float up = nb.y - 0.7 * outline;
  vInfo = vec4(aCard.x * size * 2.0, span, up, aCard.w);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const LOCK_FRAGMENT = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform sampler2D tLock;
uniform vec4 uTone;
uniform vec4 uCoat;
varying vec3 vLight;
varying vec3 vFrostLight;
varying vec4 vAt;
varying vec4 vInfo;
const vec3 LOCK_MEAN = vec3(0.158, 0.142, 0.145);
void main() {
  float u = vAt.x;
  float t = vAt.y;
  float seed = vAt.z;
  // One of the eight locks of the picture, either way round. The picture is on black: where it is black there is no hair.
  float which = floor(fract(seed * 9.73) * 8.0);
  float flip = fract(seed * 5.31) < 0.5 ? -1.0 : 1.0;
  vec2 uv = vec2((which + 0.5 + 0.47 * u * flip) / 8.0, 1.0 - (0.03 + 0.925 * t));
  vec3 pic = texture2D(tLock, uv).rgb;
  float cover = max(pic.r, max(pic.g, pic.b));
  if (cover < 0.085) discard;
  float lum = dot(pic, vec3(0.333)) / 0.148;
  float singe = 1.0 - vInfo.w;
  vec3 albedo = uTone.rgb * pic / LOCK_MEAN * 0.8 * (0.85 + 0.3 * fract(seed * 7.31));
  // Wet and dark toward the root, where the coat is matted.
  albedo *= mix(0.55, 1.0, smoothstep(0.0, 0.5, t));
  albedo = mix(albedo, vec3(0.02, 0.016, 0.014), singe * (0.45 + 0.55 * t));
  vec3 c = albedo * vLight;
  // Rime and packed snow: on the locks that look up it lies thick on the bright hairs, on the others it beads the ends.
  // Rime gathers on the fur round the burn, where the steam of it froze.
  float ring = smoothstep(0.02, 0.2, singe) * (1.0 - smoothstep(0.4, 0.75, singe));
  float frost = smoothstep(0.7, 1.2, vInfo.z + uCoat.w + 0.7 * (vAt.w - 0.5) + 0.9 * ring);
  float lies = frost * smoothstep(0.1, 0.5, t) * smoothstep(0.9, 1.7, lum + 0.35 * frost);
  float bead = smoothstep(0.75, 1.0, t) * smoothstep(1.0, 1.6, lum) * (0.3 + 0.5 * vAt.w);
  float white = clamp(max(max(lies, bead) * (1.0 - singe), smoothstep(1.5, 2.0, vAt.w) * smoothstep(0.15, 0.6, t) * smoothstep(0.6, 1.3, lum)), 0.0, 1.0);
  c = mix(c, vec3(0.86, 0.89, 0.94) * vFrostLight, white);
  gl_FragColor = vec4(c * (1.0 - uSolo), 1.0);
}`;

export const TENDRIL_VERTEX = /* glsl */ `
attribute vec4 aHang;
attribute vec4 aLimb;
${BONES_GLSL}
uniform float uTime;
uniform vec4 uFace;
uniform vec4 uLead;
uniform vec4 uWrithe;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vAt;
// aHang: where it leaves the face (up and across on it), how it splays, and its side; aLimb: length, thickness, how much it curls, a seed.
// The middle of a tendril at t along it, in metres from its root. uWrithe.x: how alive it is. uWrithe.y: 0 hanging from a living animal,
// 1 spilled over the ground from a dead one.
vec3 pathAt(float t, vec3 lead, vec3 across, float seed) {
  vec3 down = vec3(0.0, -1.0, 0.0);
  // Alive, a tendril hangs, and a slow wave runs down it, each at its own pace; its end curls and feels about.
  float pace = 0.9 + 1.3 * fract(seed * 5.7);
  float wr = uWrithe.x * (0.25 + 0.75 * t);
  float s1 = sin(uTime * pace - t * 4.0 + seed * 30.0);
  float s2 = sin(uTime * pace * 0.63 - t * 6.5 + seed * 17.0);
  float curl = aLimb.z * t * t * (1.0 + 0.5 * uWrithe.x * sin(uTime * pace * 0.8 + seed * 9.0));
  vec3 hangs = lead * (0.3 * t - 0.12 * t * t) + down * (0.25 * t + 0.6 * t * t) + across * (0.12 * wr * s1 + 0.09 * aHang.w * t + 0.05 * sin(t * 7.0 + seed * 50.0))
    + lead * (0.1 * wr * s2 - 0.35 * curl * t) + down * (-0.25 * curl * t);
  // Dead, it lies fanned over the rock where the head fell: slack, kinked like a root, arched off the ground and frozen so, its end curled.
  float fan = 1.5 * aHang.w;
  vec3 flatLead = normalize(vec3(lead.x, 0.0, lead.z));
  vec3 flatAcross = vec3(-flatLead.z, 0.0, flatLead.x);
  vec3 dir = flatLead * cos(fan) + flatAcross * sin(fan);
  vec3 sideways = vec3(-dir.z, 0.0, dir.x);
  float bend = (fract(seed * 7.3) - 0.5) * 2.0;
  float hook = aLimb.z * smoothstep(0.55, 1.0, t);
  float arch = fract(seed * 3.1);
  vec3 spilled = dir * (t - 0.45 * hook * hook - 0.12 * bend * bend * t * t) + sideways * (0.8 * bend * t * t + 0.1 * sin(t * 8.0 + seed * 20.0) * t + 0.045 * sin(t * 21.0 + seed * 31.0) + 0.12 * t * (abs(fract(t * 3.3 + seed * 9.0) - 0.5) - 0.25) + 0.45 * hook * hook * sign(bend))
    + down * (1.3 * t) + vec3(0.0, 1.0, 0.0) * (0.07 * arch * arch * sin(3.14159 * pow(t, 0.8)) + 0.03 * abs(sin(t * 5.0 + seed * 44.0)) * smoothstep(0.1, 0.4, t) + 0.14 * hook * hook * step(0.4, fract(seed * 11.0)));
  return mix(hangs, spilled, uWrithe.y);
}
void main() {
  mat4 bone = uBones[3];
  float t = position.y;
  float seed = aLimb.w;
  float size = length(modelMatrix[0].xyz);
  vec3 l0 = normalize(uLead.xyz);
  vec3 a0 = normalize(cross(l0, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0));
  vec3 b0 = cross(a0, l0);
  vec3 from = uFace.xyz + b0 * aHang.x + a0 * aHang.y;
  vec3 out_ = normalize(l0 + b0 * (-0.25 + 4.0 * aHang.x) + a0 * aHang.z);
  vec3 root = (modelMatrix * bone * vec4(from, 1.0)).xyz;
  vec3 lead = normalize(mat3(modelMatrix) * mat3(bone) * out_);
  vec3 across = normalize(cross(lead, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0));
  float len = aLimb.x * size * (1.0 + 0.1 * uWrithe.y);
  // Thick where it leaves the face, knuckled along its length, a point at its end.
  float r = aLimb.y * size * (1.0 - 0.97 * pow(t, mix(1.6, 0.7, uWrithe.y))) * (1.0 + 0.16 * sin(t * 31.0 + seed * 12.0) + 0.1 * sin(t * 77.0 + seed * 5.0));
  vec3 centre = root + len * pathAt(t, lead, across, seed);
  vec3 ahead = root + len * pathAt(t + 0.03, lead, across, seed);
  float bed = r * 0.85 + 0.01;
  centre.y = max(centre.y, groundY(centre) + bed);
  ahead.y = max(ahead.y, groundY(ahead) + bed);
  vec3 way = normalize(ahead - centre + vec3(0.0, 1e-5, 0.0));
  vec3 u = normalize(cross(way, abs(way.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
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
uniform vec4 uWrithe;
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
  vec3 albedo = mix(vec3(0.028, 0.02, 0.022), vec3(0.09, 0.055, 0.052), 0.55 * blotch + 0.3 * (1.0 - t)) * (0.75 + 0.35 * rings);
  // Rime where it looks up, in beads and feathers.
  float crystals = vnoise3(vWorld * 520.0);
  float rime = smoothstep(0.25, 0.75, n.y + 0.3 * uCoat.w - 0.5 + 0.8 * (crystals - 0.5) + 0.4 * (vnoise3(vWorld * 60.0) - 0.5));
  // Dead, the blood is out of it: grey, dull, and the rime thick on it.
  albedo = mix(albedo, vec3(0.04, 0.03, 0.032) * (0.6 + 0.8 * blotch), 0.6 * uWrithe.y);
  rime = mix(rime, 0.7 * smoothstep(0.55, 0.9, n.y * 0.5 + 0.5 + 0.45 * (crystals - 0.5) + 0.25 * (vnoise3(vWorld * 45.0) - 0.5)), uWrithe.y);
  albedo = mix(albedo, vec3(0.74, 0.78, 0.84), rime);
  float rough = mix(0.32, 0.85, max(rime, 0.6 * uWrithe.y));
  vec3 e = runnerLight(vWorld, n) * (0.55 + 0.45 * t);
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  vec3 r = reflect(-toCamera, n);
  c += (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough) * runnerLight(vWorld, normalize(r + n)) / 3.14159;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
