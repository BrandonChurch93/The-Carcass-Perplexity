// The surfaces of a ridge-runner in the light of the rig: the hide under the coat, the claws, the locks of the coat, the tendrils.
import { NOISE_GLSL, RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';

// The light on an animal. In the open it is the rig's, as on any surface. Inside the canal the land's map knows nothing of the roof, so the
// animal takes its light from the mouth alone: the dusk and the storm seen through it, and the lightning as it lights the snow and the air outside.
const LIGHT_GLSL = /* glsl */ `
uniform vec4 uDoor;
uniform float uDoorArea;
uniform float uDoorGain;
// The sky an animal sees: the land's, opening with height, and under the canal's roof the share the land's map gives (the walls take the same).
// The animal's own shade on the ground is not shade on the animal, so the contact map is left out.
float runnerOpen(vec3 p) {
  vec4 land = landAt(p.xz);
  float vis = mix(land.g, 1.0, clamp((p.y - land.r) / 80.0, 0.0, 1.0));
  float roof = CANAL_FLOOR + land.a;
  float under = smoothstep(0.3, 1.0, land.a) * smoothstep(roof + 1.5, roof + 0.5, p.y);
  return mix(vis, min(land.b * uUnder, 1.0), under);
}
vec3 runnerLight(vec3 p, vec3 n) {
  // Under the roof the lightning reaches an animal as it reaches the wall beside it.
  vec3 e = skyIrradiance(n) * runnerOpen(p) + emitterIrradiance(p, n) * min(1.0, 4.0 * skyOpen(p));
  if (uDoor.w > 0.5) {
    // Inside the canal the mouth is a window: what faces it takes the dusk and the storm seen through it, and the flash, as a rim.
    vec3 d = uDoor.xyz - p;
    float d2 = dot(d, d);
    vec3 way = d * inversesqrt(d2);
    vec3 level = normalize(vec3(way.x, 0.12, way.z));
    vec3 seen = skyRadiance(level) + emitterIrradiance(uDoor.xyz, level) * (1.0 / 3.14159);
    float facing = clamp((dot(n, way) + 0.2) / 1.2, 0.0, 1.0);
    e += 3.14159 * uDoorGain * seen * (uDoorArea / (d2 + uDoorArea)) * facing * facing;
  }
  return e;
}`;

const BONES_GLSL = /* glsl */ `
uniform mat4 uBones[6];
uniform vec4 uBurn;
uniform vec4 uGround;
// The ground under an animal is a plane: its height at the world's origin, and its slope along x and z.
float groundY(vec3 p) {
  return uGround.x + dot(uGround.yz, p.xz);
}`;

// The way of the bolt through the animal: a stripe down the flank from the spine toward the belly, a hand wide, leaning toward the rump as it
// goes down, with a second, thinner fork. 0 on its line, 1 at its edge. uBurn: where it starts (x, y, z) and its width.
const BURN_GLSL = /* glsl */ `
float burnAt(vec3 rest) {
  float down = clamp((uBurn.y - rest.y) / 0.7, -0.2, 1.2);
  float line = uBurn.x - 0.22 * down - 0.06 * sin(down * 9.0);
  float fork = uBurn.x + 0.26 - 0.1 * down + 0.05 * sin(down * 7.0 + 2.0);
  float across = min(abs(rest.x - line), abs(rest.x - fork) * 3.0 + 1.6 * uBurn.w);
  float side = smoothstep(-0.16, 0.02, rest.z * sign(uBurn.z));
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
varying float vLeg;
void main() {
  vLeg = aBone > 0.5 && aBone < 4.5 ? 1.0 : 0.0;
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
uniform vec4 uTone;
uniform vec4 uCoat;
uniform sampler2D tShag;
uniform sampler2D tShagData;
${BURN_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying float vKind;
varying float vLeg;
// The picture of the coat: matted locks that hang from the top of the tile to its foot, 0.8 m to a repeat. It is laid at two sizes, and the
// animal's own large shapes shift it so no repeat shows. Returns the colour over the tile's mean; gives the slope and the height.
const vec3 SHAG_MEAN = vec3(0.237, 0.215, 0.232);
vec3 shagAt(vec2 m, out vec3 lie) {
  vec2 a = m / 0.8;
  vec2 b = m / 0.29 + vec2(0.37, 0.61);
  vec3 ca = texture2D(tShag, a).rgb;
  vec3 cb = texture2D(tShag, b).rgb;
  vec3 da = texture2D(tShagData, a).rgb;
  vec3 db = texture2D(tShagData, b).rgb;
  lie = vec3((da.rg - 0.5) + 0.6 * (db.rg - 0.5), 0.6 * da.b + 0.4 * db.b);
  return mix(ca, cb, 0.4) / SHAG_MEAN;
}
void main() {
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  // The hide is drawn from both sides, and the side that is seen is the outside.
  if (dot(n, toCamera) < 0.0) n = -n;
  float grain = vnoise3(vRest * vec3(14.0, 40.0, 40.0));
  float fine = vnoise3(vRest * 90.0);
  // The coat that lies close on the body, from the picture: it hangs from the spine down the flanks and down each leg. The locks stand
  // over it and break its edge.
  float around = atan(vRest.z, vRest.y - 0.85);
  vec2 lay = vLeg > 0.5 ? vec2(vRest.x + vRest.z, vRest.y) : vec2(vRest.x, -abs(around) * 0.34);
  lay += 0.07 * vec2(vnoise3(vRest * 2.3 + 5.0), vnoise3(vRest * 2.3 + 23.0)) + uTone.w * 3.0;
  vec3 lie;
  vec3 shag = shagAt(lay, lie);
  {
    vec3 dpx = dFdx(vWorld);
    vec3 dpy = dFdy(vWorld);
    vec2 dux = dFdx(lay);
    vec2 duy = dFdy(lay);
    float turn = sign(dux.x * duy.y - dux.y * duy.x);
    vec3 tu = (dpx * duy.y - dpy * dux.y) * turn;
    vec3 tv = (dpy * dux.x - dpx * duy.x) * turn;
    float most = max(dot(tu, tu), dot(tv, tv));
    if (most > 1e-20) n = normalize(n - 1.6 * (lie.x * tu + lie.y * tv) * inversesqrt(most));
  }
  vec3 albedo = uTone.rgb * 1.1 * shag * mix(0.62, 1.0, smoothstep(0.15, 0.6, lie.z));
  // Rime and packed snow where the coat looks up.
  albedo = mix(albedo, vec3(0.88, 0.89, 0.91), smoothstep(0.35, 0.8, n.y + 2.0 * uCoat.w + 0.6 * (lie.z - 0.5) + 0.5 * (grain - 0.5)) * 0.75);
  // The shanks and the feet carry a short, close coat that the locks do not hide: paler, streaked along the leg, rimed where it looks up.
  float shank = 1.0 - smoothstep(0.3, 0.46, vRest.y);
  float nap = vnoise3(vRest * vec3(60.0, 9.0, 60.0));
  albedo = mix(albedo, uTone.rgb * mix(0.62, 1.0, nap) * (0.85 + 0.3 * fine), 0.5 * shank);
  // The pads under the feet are bare and dark.
  float pad = 1.0 - smoothstep(0.004, 0.02, vRest.y);
  albedo = mix(albedo, vec3(0.06, 0.048, 0.044) * (0.7 + 0.6 * fine), pad);
  float rough = 0.95 + 0.05 * pad;
  float occ = 0.6;
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
    float torn = smoothstep(0.4, 0.62, vnoise3(vRest * vec3(5.0, 13.0, 13.0) + 11.0));
    vec3 skin = mix(char_, raw * 0.8, clamp(max(split, 0.6 * splitFine) + 0.55 * torn, 0.0, 1.0) * (1.0 - smoothstep(0.55, 0.98, ragged)));
    // Toward the edge of the burn the skin is scorched brown and blistered, not black.
    skin = mix(skin, vec3(0.16, 0.09, 0.05) * (0.6 + 0.8 * fine), smoothstep(0.55, 0.95, ragged) * 0.8);
    // Round it, under the singed coat, the hide is scorched dark.
    albedo = mix(albedo, vec3(0.085, 0.04, 0.028) * (0.6 + 0.8 * fine), (1.0 - smoothstep(1.0, 3.4, ragged)) * 0.9);
    // Down the middle the hide is split open to the raw flesh, wet and dark red.
    float gash = 1.0 - smoothstep(0.12, 0.42, ragged + 0.25 * (vnoise3(vRest * vec3(4.0, 15.0, 15.0) + 7.0) - 0.5));
    vec3 flesh = mix(vec3(0.075, 0.006, 0.006), vec3(0.3, 0.035, 0.022), clamp(0.9 * fine * grain + 0.5 * splitFine + 0.3 * torn, 0.0, 1.0));
    // Black crust lies over it in flakes.
    float crust = smoothstep(0.5, 0.62, vnoise3(vRest * vec3(11.0, 30.0, 30.0) + 19.0));
    skin = mix(skin, mix(flesh, char_, 0.85 * crust), gash * 0.92);
    albedo = mix(albedo, skin, burnt);
    rough = mix(rough, 0.8 - 0.35 * max(split, gash), burnt);
    occ = mix(occ, 0.9 - 0.4 * split, burnt);
  }
  vec3 e = runnerLight(vWorld, n) * occ;
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  // A dull sheen and no more: hide and char are not mirrors, even seen along them.
  c += (0.04 + 0.08 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough) * e / 3.14159;
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
uniform vec4 uWrithe;
varying vec3 vColour;
varying vec4 vFrost;
varying vec3 vAt;
varying float vSeed;
vec3 gRoot;
vec3 gOut;
vec3 gNormal;
vec3 gLean;
vec3 gBlown;
vec3 gLock;
// A lock at t along it: it leaves the hide standing, bends over with its lean and its weight, is carried by the wind, and lies on the ground
// where it reaches it. Nothing hangs through the ground.
vec3 lockAt(float t) {
  vec3 p = gRoot + gLock.x * (gOut * (t - 0.5 * t * t) + gLean * t + vec3(0.0, -1.0, 0.0) * (gLock.y * 0.5 * t * t) + gBlown * (t * t));
  // Nor through the hide it grows from: where its weight would take it in, it lies on the hide.
  p += gNormal * max(0.0, gLock.x * 0.14 * t - dot(p - gRoot, gNormal));
  p.y = max(p.y, groundY(p) + gLock.z);
  return p;
}
void main() {
  int which = int(aLock.z + 0.5);
  mat4 bone = uBones[which];
  vec3 root = (modelMatrix * bone * vec4(aRoot, 1.0)).xyz;
  vec3 n = normalize(mat3(modelMatrix) * mat3(bone) * aDir);
  float size = length(modelMatrix[0].xyz);
  float seed = aLock.y;
  float t = position.y;
  float len = aLock.x * size * uCoat.x;
  // Seen square on, the coat is the matted picture on the body and the locks over it are short; at the body's edge they are long and
  // break the outline. A lock that would be a hand long or less on the picture is left out, three in four.
  float square = smoothstep(0.05, 0.6, dot(n, normalize(cameraPosition - root)));
  len *= mix(1.0, 0.4, square);
  if (fract(seed * 77.7) < 0.75 * square) len = 0.0;
  float wide = aLock.w * size;

  // The burn: locks inside it are gone, locks at its edge are singed to black stubs.
  float singe = 0.0;
  if (uBurn.w > 0.0) {
    float d = burnAt(aRoot) + 0.3 * (vnoise3(aRoot * 7.0) - 0.5);
    singe = 1.0 - smoothstep(0.8, 2.6, d);
    // Round the wound the coat is not gone but burned short and matted down.
    len *= mix(1.0, 0.25 + 0.3 * fract(seed * 9.1), smoothstep(0.0, 0.7, singe));
    if (d < 0.8 + 0.25 * fract(seed * 5.3)) len = 0.0;
  }

  // A lock leaves the hide at a slant toward the rump, bends under its own weight, and narrows to a point: a wet spike of hair, not a curtain.
  vec3 comb = normalize(mat3(modelMatrix) * vec3(-1.0, 0.0, 0.0));
  // A long coat hangs: it stands off the hide less and falls more.
  float droop = smoothstep(1.0, 1.8, uCoat.x);
  float off = (0.4 + 0.45 * fract(seed * 13.7)) * (1.0 - 0.65 * droop) * (1.0 - 0.7 * smoothstep(0.1, 0.6, singe));
  float fall = 0.45 + 0.5 * fract(seed * 3.3) + 1.1 * droop;
  vec3 wind = normalize(uWind.xyz);
  // The gale takes the loose end: a steady lean and a flutter that runs through the coat as gusts pass over the animal.
  float gust = 0.5 + 0.5 * sin(uTime * (4.0 + 5.0 * fract(seed * 7.1)) + seed * 40.0 - dot(root, wind) * 3.0);
  float wave = 0.5 + 0.5 * sin(uTime * 1.9 - dot(root, wind) * 1.4 + 1.3 * sin(uTime * 0.7 + root.x));
  float blow = uCoat.y * (0.3 + 0.4 * gust + 0.5 * wave) * (0.4 + 0.9 * fract(seed * 19.0));
  // The animal breathes and shivers: the coat lifts a little with each.
  float lift = 1.0 + uCoat.z * (0.5 + 0.5 * sin(uTime * 23.0 + seed * 60.0));
  // Each lock leans a little its own way, and the coat parts in tufts and cowlicks a hand wide, so it is tousled and not combed.
  vec3 tuft = vec3(vnoise3(aRoot * 9.0 + 3.0), vnoise3(aRoot * 9.0 + 17.0), vnoise3(aRoot * 9.0 + 41.0)) - 0.5;
  tuft = mat3(modelMatrix) * mat3(bone) * tuft / size;
  vec3 own = normalize(cross(n, comb) + vec3(1e-4)) * (0.6 * (fract(seed * 41.0) - 0.5)) + tuft * 1.5;
  vec3 lean = comb * 0.4 + own + vec3(0.0, -1.0, 0.0) * (fall * 0.35);
  gRoot = root;
  gOut = n * (off * lift);
  gNormal = n;
  gLean = lean;
  gBlown = wind * blow;
  gLock = vec3(len, fall, 0.012 + 0.02 * fract(seed * 17.0));
  vec3 p = lockAt(t);
  // The way the lock runs where it is, as it lies: a lock pressed to the ground runs along the ground.
  vec3 tangent = lockAt(t + 0.12) - p;
  tangent = dot(tangent, tangent) > 1e-10 ? tangent : lean;
  vec3 chord = lockAt(1.0) - root;
  vec3 toCamera = cameraPosition - p;
  float far = length(toCamera);
  toCamera /= far;
  vec3 side = normalize(cross(tangent, toCamera));
  // A lock seen end on is a point, not a card.
  float edgeOn = clamp(2.2 * length(cross(normalize(tangent), toCamera)) - 0.15, 0.04, 1.0);
  // And it is never wider than a third of what the lens sees of its length.
  float w = max(min(wide * edgeOn * (1.0 - 0.88 * t), 0.1 * length(cross(chord, toCamera))), 0.75 * uPixel * far);
  p += side * (position.x * w);

  // Light at the lock: the hide's way of facing, turned a little to the lens, darker toward the root where the coat stands over it and in the
  // partings between tufts.
  vec3 facing = normalize(n + 0.3 * toCamera + vec3(0.0, 0.25, 0.0));
  float clump = vnoise3(aRoot * 14.0 + 5.0);
  float deep = mix(0.42, 1.0, pow(t, 0.6)) * (0.72 + 0.45 * clump);
  // Close to the ground the coat is in the body's own shade.
  // A dead one lies in the open, low: only what is pressed to the ground is shaded.
  deep *= mix(0.45, 1.0, smoothstep(0.0, mix(0.35, 0.1, uWrithe.y) * size, p.y - groundY(p)));
  vec3 e = runnerLight(p, facing) * deep;
  // The coat's edge against the far sky takes the light that comes through it from behind: the band at the horizon, warm.
  float edge = 1.0 - abs(dot(n, toCamera));
  vec3 behind = normalize(vec3(-toCamera.x, 0.04, -toCamera.z));
  e += 3.14159 * 0.55 * edge * edge * edge * smoothstep(0.2, 0.8, t) * skyRadiance(behind) * runnerOpen(p);
  // Colour: warm cream, greyer and yellower in patches, soiled at the skirt and the legs, and rime on the ends of what looks up or into the wind.
  float patch_ = vnoise3(aRoot * 2.6 + uTone.w * 31.0);
  float stain = vnoise3(aRoot * 7.0 + 9.0);
  vec3 cream = mix(uTone.rgb, uTone.rgb * vec3(0.8, 0.7, 0.55), 0.7 * smoothstep(0.4, 0.8, patch_)) * (0.82 + 0.36 * fract(seed * 23.0));
  cream *= mix(vec3(0.7, 0.62, 0.52), vec3(1.0), smoothstep(0.1, 0.7, aRoot.y + 0.3 * stain));
  vec3 albedo = mix(cream * 0.62, cream, smoothstep(0.0, 0.5, t));
  float windward = n.y * 0.55 - dot(n, wind) * 0.55 + 0.6 * (stain - 0.5) + uCoat.w;
  float rime = smoothstep(0.1, 0.6, windward) * smoothstep(0.3, 0.85, t + 0.3 * fract(seed * 31.0));
  albedo = mix(albedo, vec3(0.9, 0.9, 0.91), rime * min(0.45 + 1.2 * max(uCoat.w, 0.0), 0.9));
  // The singed edge of the burn: rust, then black.
  albedo = mix(albedo, vec3(0.4, 0.14, 0.055), smoothstep(0.0, 0.4, singe) * 0.75 * (0.5 + 0.5 * fract(seed * 29.0)));
  albedo = mix(albedo, vec3(0.26, 0.035, 0.02), smoothstep(0.4, 0.75, singe) * 0.75 * step(0.4, fract(seed * 37.0)));
  albedo = mix(albedo, vec3(0.02, 0.017, 0.015), smoothstep(0.4, 0.85, singe) * (0.55 + 0.45 * t) * (0.6 + 0.4 * fract(seed * 43.0)));
  vColour = albedo * e / 3.14159;
  // Rime in a clump on the end of the lock, in the light of the open end.
  vFrost = vec4(vec3(0.9, 0.91, 0.93) * runnerLight(p, normalize(facing + vec3(0.0, 0.6, 0.0))) / 3.14159, rime * (1.0 - smoothstep(0.0, 0.3, singe)));
  vAt = vec3(position.x, t, w / max(uPixel * far, 1e-6));
  vSeed = seed;
  if (len <= 0.0) p = vec3(0.0, -1e5, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const LOCK_FRAGMENT = /* glsl */ `
${RIG_UNIFORMS_GLSL}
varying vec3 vColour;
varying vec4 vFrost;
varying vec3 vAt;
uniform float uHairs;
varying float vSeed;
void main() {
  // One lock is a few hairs: each wanders a little and ends at its own length, and where the lock is rimed each ends in a clump of frost.
  // Far off, where a hair is thinner than a pixel, the lock is whole.
  float t = vAt.y;
  float count = uHairs;
  float across = (vAt.x * 0.5 + 0.5) * count;
  float id = floor(across);
  float h = fract(sin((id + 1.0) * 12.9898 + vSeed * 78.233) * 43758.5453);
  float f = fract(across) - 0.5 + 0.22 * sin(t * (4.0 + 7.0 * h) + h * 40.0);
  float ends = 0.6 + 0.4 * h;
  float through_ = t / ends;
  float clump = vFrost.w * smoothstep(0.62, 0.9, through_) * step(0.35, h);
  float hair = step(abs(f), mix((0.24 + 0.14 * t) * (1.0 - through_ * through_ * through_), 0.5, clump)) * step(t, ends);
  float near = smoothstep(0.8, 2.2, vAt.z * 2.0 / count);
  if (mix(1.0, hair, near) < 0.5) discard;
  vec3 c = mix(vColour * mix(1.0, 0.72 + 0.56 * h, near), vFrost.rgb, mix(vFrost.w * smoothstep(0.5, 0.9, t) * 0.6, clump, near));
  gl_FragColor = vec4(c * (1.0 - uSolo), 1.0);
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
// aHang: where it leaves the stump (y, z on its face), how it splays, and its side; aLimb: length, thickness, how much it curls, a seed.
// The middle of a tendril at t along it, in metres from its root. uWrithe.x: how alive it is. uWrithe.y: 0 hanging from a standing animal,
// 1 spilled over the ground from a dead one.
vec3 pathAt(float t, vec3 lead, vec3 across, float seed) {
  vec3 down = vec3(0.0, -1.0, 0.0);
  // Alive, a tendril hangs, and a slow wave runs down it, each at its own pace; its end curls and feels about.
  float pace = 0.9 + 1.3 * fract(seed * 5.7);
  float wr = uWrithe.x * (0.25 + 0.75 * t);
  float s1 = sin(uTime * pace - t * 4.0 + seed * 30.0);
  float s2 = sin(uTime * pace * 0.63 - t * 6.5 + seed * 17.0);
  float curl = aLimb.z * t * t * (1.0 + 0.5 * uWrithe.x * sin(uTime * pace * 0.8 + seed * 9.0));
  vec3 hangs = lead * (0.3 * t - 0.12 * t * t) + down * (0.25 * t + 0.6 * t * t) + across * (0.12 * wr * s1 + 0.05 * aHang.w * t + 0.05 * sin(t * 7.0 + seed * 50.0))
    + lead * (0.1 * wr * s2 - 0.35 * curl * t) + down * (-0.25 * curl * t);
  // Dead, it lies fanned over the rock where the head fell: slack, kinked like a root, its end curled up off the ground as it froze.
  float fan = 1.5 * aHang.w;
  vec3 flatLead = normalize(vec3(lead.x, 0.0, lead.z));
  vec3 flatAcross = vec3(-flatLead.z, 0.0, flatLead.x);
  vec3 dir = flatLead * cos(fan) + flatAcross * sin(fan);
  vec3 sideways = vec3(-dir.z, 0.0, dir.x);
  float bend = (fract(seed * 7.3) - 0.5) * 2.0;
  float hook = aLimb.z * smoothstep(0.55, 1.0, t);
  vec3 spilled = dir * (t - 0.3 * hook * hook) + sideways * (0.45 * bend * t * t + 0.1 * sin(t * 8.0 + seed * 20.0) * t + 0.045 * sin(t * 21.0 + seed * 31.0) + 0.3 * hook * hook * sign(bend))
    + down * (1.3 * t) + vec3(0.0, 1.0, 0.0) * (0.05 * abs(sin(t * 5.0 + seed * 44.0)) * step(0.3, t) * fract(seed * 3.1) + 0.2 * hook * hook * step(0.7, fract(seed * 11.0)));
  return mix(hangs, spilled, uWrithe.y);
}
void main() {
  mat4 bone = uBones[5];
  float t = position.y;
  float seed = aLimb.w;
  float size = length(modelMatrix[0].xyz);
  vec3 from = uFace.xyz + vec3(0.0, aHang.x, aHang.y);
  vec3 out_ = normalize(vec3(0.55, -0.2 + 0.6 * aHang.x, aHang.z));
  vec3 root = (modelMatrix * bone * vec4(from, 1.0)).xyz;
  vec3 lead = normalize(mat3(modelMatrix) * mat3(bone) * out_);
  vec3 across = normalize(cross(lead, vec3(0.0, 1.0, 0.0)) + vec3(1e-4, 0.0, 0.0));
  float len = aLimb.x * size;
  // Thick where it leaves the face, knuckled along its length, a point at its end.
  float r = aLimb.y * size * (1.0 - 0.85 * pow(t, 1.2)) * (1.0 + 0.16 * sin(t * 31.0 + seed * 12.0) + 0.1 * sin(t * 77.0 + seed * 5.0));
  vec3 centre = root + len * pathAt(t, lead, across, seed);
  vec3 ahead = root + len * pathAt(t + 0.03, lead, across, seed);
  // The dead one's lie on the burned rock, which stands a little over the land.
  float bed = r * 0.85 + 0.05 * uWrithe.y;
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
  float crystals = vnoise3(vWorld * 520.0);
  float rime = smoothstep(0.25, 0.75, n.y + 0.5 * uCoat.w - 0.1 + 1.3 * (crystals - 0.5) + 0.4 * (vnoise3(vWorld * 60.0) - 0.5));
  albedo = mix(albedo, vec3(0.74, 0.78, 0.84), rime);
  float rough = mix(0.32, 0.85, rime);
  vec3 e = runnerLight(vWorld, n) * (0.55 + 0.45 * t);
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  vec3 r = reflect(-toCamera, n);
  c += (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough) * runnerLight(vWorld, normalize(r + n)) / 3.14159;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;
