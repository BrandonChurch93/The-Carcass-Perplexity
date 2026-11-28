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
  vec3 e;
  if (uDoor.w < 0.5) {
    e = skyIrradiance(n) * runnerOpen(p) + emitterIrradiance(p, n) * min(1.0, 4.0 * skyOpen(p));
  } else {
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
${BURN_GLSL}
uniform float uWhole;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying vec3 vRestNormal;
flat varying float vKind;
void main() {
  mat4 bone = boneOf(aBones);
  vec4 w = modelMatrix * bone * vec4(position, 1.0);
  vNormal = normalize(mat3(modelMatrix) * mat3(bone) * normal);
  // The dead one's wound is a hollow in its flank, not a mark on it: the hide is gone there and the lens looks into the body.
  if (uWhole > 0.5 && aKind < 1.5) {
    float into = burnAt(position) + 0.5 * smoothstep(0.45, 1.0, length(position - uBurn.xyz) / uBurn.w);
    float sink = 1.0 - smoothstep(0.25, 0.85, into);
    w.xyz -= vNormal * (0.05 * length(modelMatrix[0].xyz) * sink * sink * (3.0 - 2.0 * sink));
  }
  vWorld = w.xyz;
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
uniform float uLockKind;
uniform float uWhole;
float groundY(vec3 p) {
  return uGround.x + dot(uGround.yz, p.xz);
}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying vec3 vRestNormal;
flat varying float vKind;
const vec3 SHAG_MEAN = vec3(0.237, 0.215, 0.232);
void main() {
  // Where the picture of the burn lies, and how fast that runs over the screen: worked out here, before any branch, so that the
  // picture is read the same way in every pixel of a block.
  vec3 fromBurn = vRest - uBurn.xyz;
  vec2 burnUv = 0.5 + vec2(dot(fromBurn, uBurnU), dot(fromBurn, uBurnV)) / (max(uBurn.w, 0.001) * 2.3);
  vec2 burnDx = dFdx(burnUv);
  vec2 burnDy = dFdy(burnUv);
  // The way the surface itself faces, hollow and all.
  vec3 faceRaw = cross(dFdx(vWorld), dFdy(vWorld));
  vec3 faceN = faceRaw / max(length(faceRaw), 1e-9);
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  // The close coat under the locks, from the picture of the coat, laid by place on three axes so that it is pulled long nowhere.
  vec3 w = pow(abs(normalize(vRestNormal)), vec3(4.0));
  w /= w.x + w.y + w.z;
  float s = vKind > 3.5 ? 0.3 : 0.55;
  vec3 q = vRest / s + uTone.w * 5.0;
  // How fast the place runs over the screen, found before any branch: the herd's one laying changes axis from one pixel to the next
  // along a seam, and the place itself does not jump there.
  vec3 qDx = dFdx(q);
  vec3 qDy = dFdy(q);
  vec3 shag;
  vec3 lie;
  if (uLockKind > 0.5) {
    // The herd's hide is under its locks and seen from metres away: one laying of the picture, on the axis it faces most.
    bool onX = w.x > max(w.y, w.z);
    bool onY = w.y > w.z;
    vec2 one = onX ? q.zy : (onY ? q.xz : q.xy);
    vec2 oneDx = onX ? qDx.zy : (onY ? qDx.xz : qDx.xy);
    vec2 oneDy = onX ? qDy.zy : (onY ? qDy.xz : qDy.xy);
    shag = textureGrad(tShag, one, oneDx, oneDy).rgb / SHAG_MEAN;
    lie = textureGrad(tShagData, one, oneDx, oneDy).rgb;
  } else {
    shag = (texture2D(tShag, q.zy).rgb * w.x + texture2D(tShag, q.xz).rgb * w.y + texture2D(tShag, q.xy).rgb * w.z) / SHAG_MEAN;
    lie = texture2D(tShagData, q.zy).rgb * w.x + texture2D(tShagData, q.xz).rgb * w.y + texture2D(tShagData, q.xy).rgb * w.z;
  }
  float fine = vnoise3(vRest * 90.0);
  float grain = vnoise3(vRest * vec3(14.0, 40.0, 40.0));
  n = normalize(n + 0.9 * (lie.x - 0.5) * normalize(cross(n, vec3(0.0, 1.0, 0.001))) + 0.9 * (lie.y - 0.5) * vec3(0.0, 1.0, 0.0));
  // Under the locks the roots are in each other's shade.
  // Under the herd's hair the hide is its under-coat, even in tone: no dark of the picture stands between the hairs as a spot.
  vec3 albedo = uTone.rgb * mix(shag, vec3(dot(shag, vec3(0.333))) * 0.9 + 0.25, 0.65 * uLockKind) * mix(0.45, 0.95, smoothstep(0.2, 0.7, lie.b));
  float rough = 0.95;
  float occ = 0.55;
  vec3 pelt = albedo;
  if (vKind > 4.5) {
    // The paw: a short close coat, wet and dark toward the pads.
    albedo = mix(vec3(0.035, 0.03, 0.028), uTone.rgb * shag * 0.75, 0.55 + 0.3 * fine);
    occ = 0.75;
  }
  if (vKind > 5.5) {
    // A claw: dark horn, ridged along its length, worn pale at the tip, wet.
    albedo = mix(vec3(0.03, 0.026, 0.024), vec3(0.12, 0.1, 0.08), smoothstep(0.45, 0.9, grain) * 0.6);
    // The dead one's claws are seen close, on the ice before the lens: grey horn, paler along its ridges, not a black shape.
    if (uWhole > 0.5) albedo = mix(vec3(0.075, 0.062, 0.054), vec3(0.3, 0.25, 0.2), smoothstep(0.3, 0.9, grain));
    rough = 0.62;
    occ = 0.9;
  }
  if (vKind > 6.5) {
    // The face: bare dark skin, creased, where the tendrils root.
    // It is under a short coat of its own, and no edge is drawn where the coat of the head ends.
    albedo = mix(mix(vec3(0.09, 0.066, 0.068), vec3(0.26, 0.18, 0.17), 0.6 * fine + 0.4 * grain), 0.8 * pelt, 0.75);
    rough = 0.95;
    occ = 0.55;
  }
  // Rime where the hide looks up.
  // On the paws it lies in patches between the toes, not as a cap.
  float rime = smoothstep(0.45, 0.9, n.y + 0.5 * (grain - 0.5) + uCoat.w - (vKind > 4.5 ? 0.35 + 0.5 * vnoise3(vRest * 23.0) : 0.0)) * (vKind > 5.5 ? 0.35 : 0.7);
  // Out in the gale the bare of the head is under hoar, in broad patches: nothing on it is one bright point.
  if (vKind > 1.5 && vKind < 2.5 || vKind > 6.5) rime = mix(rime, 0.8 * smoothstep(0.3, 0.6, vnoise3(vRest * 7.0) + 0.25 * n.y), 1.0 - uLockKind);
  // The dead one's face is under the tendrils and wet with what ran out of it: no hoar holds there.
  if (uWhole > 0.5 && vKind > 6.5) rime *= 0.15;
  // The dead one is seen close: what shows between its locks is the under-coat, pale and matted, with the rime in it in patches.
  if (uWhole > 0.5 && vKind < 5.5) {
    // Its own grain is drawn here, hair fine: the picture of a coat is soft at three metres and would lie blurred between the hairs.
    float hairs = vnoise3(vRest * vec3(310.0, 520.0, 310.0)) + 0.6 * vnoise3(vRest * 760.0);
    albedo = uTone.rgb * mix(shag, vec3(dot(shag, vec3(0.333))), 0.5) * mix(0.6, 1.05, smoothstep(0.2, 0.7, lie.b)) * (0.5 + 0.55 * hairs) * (vKind > 4.5 ? 0.8 : 1.0);
    rime *= 0.75 * smoothstep(0.35, 0.7, vnoise3(vRest * 17.0) + 0.3 * (fine - 0.5));
  }
  albedo = mix(albedo, vec3(0.86, 0.88, 0.92), rime);
  // Where the bolt went through: the coat is gone and the skin is charred, split, and raw in the splits.
  float d = burnAt(vRest);
  if (d < 3.0 && vKind < 1.5) {
    // The picture of the burn, laid on the flank: its split runs round the body from the spine toward the belly.
    vec2 uv = burnUv;
    vec3 pic = textureGrad(tBurn, uv, burnDx, burnDy).rgb;
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
    if (uWhole > 0.5) {
      // Seen close, the split itself: open along its middle to wet meat, its lips burned black and curled, ragged along their length.
      // It wanders along its length: the hide tore where it was weakest, not along a rule.
      vec3 astray = normalize(uBurnU) * (0.05 * (vnoise3(vRest * 9.0) - 0.5) + 0.02 * (vnoise3(vRest * 31.0) - 0.5));
      float ragged = burnAt(vRest + astray) + 0.22 * (vnoise3(vRest * 29.0) - 0.5) + 0.14 * (vnoise3(vRest * 95.0) - 0.5);
      // It closes toward its ends.
      ragged += 0.5 * smoothstep(0.45, 1.0, length(vRest - uBurn.xyz) / uBurn.w);
      float core = 1.0 - smoothstep(0.42, 0.52, ragged);
      float lips = smoothstep(0.45, 0.55, ragged) * (1.0 - smoothstep(0.9, 1.3, ragged));
      // Nothing of the picture's square is left round the split: the hide there is singed dark under the coat that lies over it.
      albedo = pelt * mix(0.5, 1.0, smoothstep(0.8, 2.4, d)) * (0.7 + 0.6 * dot(pic, vec3(0.333)));
      // The meat is the picture's own raw hide, seen nearer: its fibres run down the split.
      vec3 near = textureGrad(tBurn, 0.5 + (uv - 0.5) * vec2(3.1, 1.3), burnDx * vec2(3.1, 1.3), burnDy * vec2(3.1, 1.3)).rgb;
      float fibre = vnoise3(vRest * vec3(160.0, 22.0, 160.0));
      // What is in it: dark wet tissue, nearly black in its depth, a dull red only where a fibre stands up into the light; and ice,
      // where what ran out of it froze: grey glaze in patches, and hoar on its upper lip.
      float deep = 1.0 - smoothstep(0.1, 0.45, ragged);
      float lump = vnoise3(vRest * 44.0);
      vec3 meat = mix(vec3(0.2, 0.042, 0.034), vec3(0.045, 0.014, 0.012), smoothstep(0.25, 0.75, 0.6 * fibre + 0.4 * lump)) * min(0.5 + 2.4 * dot(near, vec3(0.333)), 1.1) * mix(1.0, 0.5, deep);
      float glaze = smoothstep(0.58, 0.78, vnoise3(vRest * 21.0 + 3.0) + 0.25 * (vnoise3(vRest * 120.0) - 0.5));
      float hoar = smoothstep(0.55, 0.8, vnoise3(vRest * 260.0) + 0.5 * glaze - 0.25) * glaze;
      meat = mix(meat, vec3(0.07, 0.065, 0.07) * (0.5 + 0.8 * lump), 0.5 * glaze);
      meat = mix(meat, vec3(0.16, 0.16, 0.18), 0.35 * hoar);
      albedo = mix(albedo, (vec3(0.02, 0.015, 0.013) + 0.05 * grain) * (0.5 + 1.2 * vnoise3(vRest * 70.0)), 0.8 * lips);
      albedo = mix(albedo, meat, core);
      rough = mix(rough, mix(0.22, 0.1, glaze) + 0.3 * hoar, core);
      rough = mix(rough, 0.8, lips * (1.0 - core));
      occ = mix(occ, mix(0.8, 0.45, deep), core);
      // The meat lies under the lips of the hide: lit as the hollow faces, its fibres standing in it.
      vec3 inN = dot(faceN, toCamera) < 0.0 ? -faceN : faceN;
      n = normalize(mix(n, inN, 0.45 * max(core, 0.6 * lips)) + 0.55 * core * vec3(vnoise3(vRest * 60.0) - 0.5, 0.35 * (fibre - 0.5), vnoise3(vRest * 60.0 + 9.0) - 0.5));
    }
  }
  // A limb that lies against the split is singed as the flank is: no pale hide stands beside the wound.
  if (uWhole > 0.5 && vKind > 1.5) albedo *= mix(0.3, 1.0, smoothstep(0.7, 2.2, d));
  vec3 e = runnerLight(vWorld, n) * occ;
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  vec3 r2 = reflect(-toCamera, n);
  r2.y = abs(r2.y);
  // A dry coat has no gleam worth its light: only the wet and the horn are asked for one.
  if (rough < 0.9) c += (0.04 + 0.5 * pow(1.0 - nv, 5.0)) * (1.0 - rough) * (1.0 - rough) * runnerLight(vWorld, normalize(r2 + n)) * occ / 3.14159;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The coat as hair: every lock is a handful of strands. Each strand leaves the hide at its own place round the lock's root, runs down
// the lock's curve with its own bends, and is drawn toward the others at the end, as a wet coat mats: so a lock is a clump with loose
// hairs round it and not a blade. A strand is never finer than a pixel of the film: finer, it is drawn a pixel wide and fainter.
export const STRAND_VERTEX = /* glsl */ `
attribute vec3 aRoot;
attribute vec3 aCtrl;
attribute vec3 aTip;
attribute vec4 aCard;
attribute vec4 aLockBones;
attribute vec4 aStrand;
${RIG_GLSL}
${LIGHT_GLSL}
${BONES_GLSL}
uniform vec4 uCoat;
uniform float uLockKind;
uniform float uWhole;
// x: how broad a strand is, as a share of its lock. y: how far the strands of a lock stand apart at the root, in locks' widths.
// z: how much of that is left at the end. w: how much a strand wanders off its lock.
uniform vec4 uStrand;
// x: how long the hair is, as a share of its lock. y: how much the rime clots on it. z: how much of the coat that looks up is crusted.
uniform vec4 uHair;
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
  float hair = aStrand.x;
  float hairAng = fract(aStrand.y + seed * 7.0);
  float hairLong = fract(aStrand.z + seed * 3.1);
  float hairOut = fract(aStrand.w + seed * 5.3);
  float span = distance(r, e);
  // The body under the lock, as the lens sees it: a lock on the side turned from the lens is behind the body and is not drawn.
  vec3 nb = normalize(c - mix(r, e, 0.45) + vec3(0.0, 1e-4, 0.0));
  if (dot(nb, normalize(cameraPosition - r)) < (uWhole > 0.5 ? -0.4 : -0.25)) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  // The wind in the coat: a gust is a front that crosses the animal, slowly; the coat lifts as it passes and falls back behind it, the
  // end of a lock most, and each hair a moment after its lock. Nothing in it shakes of itself: with no gust the coat is still.
  float front = max(0.0, sin(uTime * 1.7 - dot(r, uWind.xyz) * 1.4 + 0.8 * sin(uTime * 0.6) - 0.5 * hair));
  float sway = sin(uTime * (1.3 + 0.9 * seed) + seed * 40.0 + 2.0 * hair);
  float gust = 2.4 * front * front * (1.0 + 0.25 * sway) - 0.4 * front;
  vec3 blow = (uWind.xyz * (0.2 * uCoat.y) + vec3(0.0, 0.05 * uCoat.y, 0.0) * sway) * gust;
  e += blow * span;
  c += blow * span * 0.35;
  e.y = max(e.y, groundY(e) + 0.012);
  // Each hair has its own length; a few are long and stand off the lock.
  float stray = step(0.86, hairOut);
  // Under the long hair is the under-coat: short, close, standing every way, and never drawn together.
  float low = position.z;
  // Where the coat looks up the rime has it: the hair there is short under its load and frozen into white points, lock by lock.
  float crusted = uHair.z * smoothstep(0.75, 1.15, nb.y + uCoat.w + 0.7 * (min(aCard.z, 1.0) - 0.5)) * aCard.w * step(0.3, fract(seed * 6.1));
  float reach = mix(0.5, 1.0, hairLong) * uHair.x * mix(1.0, 0.42, low) * (1.0 - 0.35 * crusted);
  float t = position.y * reach;
  vec3 p = mix(mix(r, c, t), mix(c, e, t), t);
  vec3 way = normalize(mix(c - r, e - c, t) + vec3(0.0, 1e-5, 0.0));
  vec3 toCamera = normalize(cameraPosition - p);
  vec3 side = normalize(cross(way, toCamera));
  vec3 off = normalize(cross(side, way));
  float w = aCard.x * size * (1.0 - 0.38 * uLockKind);
  // Round the root they stand apart, on a disc; toward the end they are drawn together, the strays less.
  float ang = 6.2832 * hairAng;
  float rad = sqrt(0.08 + 0.92 * hairOut) * uStrand.y * w * (1.0 + 0.9 * low);
  float together = mix(mix(1.0, mix(uStrand.z * (1.0 - 0.7 * crusted), 0.75, stray), smoothstep(0.0, 1.0, t)), 1.0 + 0.5 * t, low);
  // No hair is straight: each is bent its own way, more toward its end.
  float bendA = sin(t * (3.0 + 5.0 * fract(hair * 3.3)) + hair * 40.0 + seed * 9.0);
  float bendB = sin(t * (7.0 + 6.0 * fract(hair * 5.9)) + hair * 71.0 + seed * 23.0);
  float lockKink = sin(t * (4.0 + 5.0 * fract(seed * 3.3)) + seed * 40.0) + 0.5 * sin(t * (11.0 + 6.0 * fract(seed * 5.9)) + seed * 71.0);
  float wander = uStrand.w * w * t * (1.0 + 1.5 * stray);
  // And crimped, as a matted coat is: short waves down its length, its own.
  float crimp = 0.22 * w * smoothstep(0.05, 0.4, t) * sin(t * (23.0 + 14.0 * fract(hair * 8.3 + seed)) + hair * 90.0 + seed * 31.0);
  p += side * (cos(ang) * rad * together + 0.55 * w * lockKink * t + wander * (bendA + 0.4 * bendB) + crimp)
     + off * (sin(ang) * rad * together * 0.6 + wander * 0.6 * (bendB - 0.3 * bendA) + 0.35 * w * stray * t * (2.0 - t));
  // And none stands straight, however narrow its lock: each curls over toward its end by a share of its own length, its own way.
  float curlAng = 6.2832 * fract(hair * 6.1 + seed * 1.7);
  float curl = span * t * t * (0.05 + 0.09 * fract(hair * 4.7 + seed * 2.9)) * (1.0 + stray) * (1.0 - 0.6 * low);
  p += (side * cos(curlAng) + off * sin(curlAng)) * curl - vec3(0.0, 0.6 * curl * stray, 0.0);
  // How broad it is: it thins to its end, and is never finer than a pixel of the film.
  float far = length(cameraPosition - p);
  float pixel = 2.0 * far / (projectionMatrix[1][1] * 1080.0);
  float taper = 1.0 - smoothstep(0.55, 1.0, position.y);
  // How much this lock is frosted: it looks up, and it is on the weather side. Rime is not paint on a hair: it stands on it, in
  // clots, and the hair is that much the thicker under it.
  float outline = pow(max(1.0 - abs(dot(nb, toCamera)), 0.0), 3.0) * (1.0 - uDoor.w);
  float up = nb.y - 0.7 * outline;
  float rimed = smoothstep(0.7, 1.2, up + uCoat.w + 0.7 * (min(aCard.z, 1.0) - 0.5)) * aCard.w;
  float clot = rimed * step(0.45, fract(hair * 5.1 + seed * 2.3)) * smoothstep(0.2, 0.5, t) * (0.6 + 0.4 * sin(t * (17.0 + 9.0 * fract(hair * 2.9)) + hair * 50.0));
  float own = uStrand.x * w * (0.7 + 0.6 * fract(hair * 7.7)) * (0.25 + 0.75 * taper) * (1.0 + uHair.y * max(clot, 0.0) + 1.2 * crusted * (1.0 - low));
  // Under the lens the coat is seen hair by hair: there each is a little the broader, so that the coat closes and nothing shows between.
  own *= 1.0 + 0.6 * uWhole * (1.0 - smoothstep(1.2, 3.2, far));
  float drawn = max(own, 0.75 * pixel);
  p += side * (position.x * drawn);
  // Hair takes light from all round: it is lit as something between its lock's way out of the body and the open sky, and each hair
  // a little its own way.
  vec3 n = normalize(nb + vec3(0.0, 0.3, 0.0) + side * (0.3 * cos(ang)) + toCamera * 0.2);
  float occ = mix(0.34 + 0.2 * uDoor.w, 1.0, smoothstep(0.0, 0.7, t)) * (0.7 + 0.5 * fract(seed * 3.77)) * (0.82 + 0.36 * fract(hair * 9.1));
  vec3 lit = runnerLight(p, n) / 3.14159;
  vLight = lit * occ;
  vFrostLight = lit * (uLockKind > 0.5 ? 1.1 : 1.25);
  // x across the strand, y along the lock, z the hair's own number, w how much of the pixel it fills.
  vAt = vec4(position.x, t, fract(hair * 13.7 + seed) * (1.0 - 0.3 * low), clamp(own / drawn, 0.0, 1.0) * (1.0 - smoothstep(0.93, 1.0, position.y)));
  // The loose hairs that stand off the coat where it looks up are hoar from their middle: the outline bristles white.
  vInfo = vec4(max(aCard.z, 2.2 * max(crusted * (1.0 - low), stray * step(0.15, up) * step(0.3, fract(hair * 3.7 + seed)))), position.y, up, aCard.w);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const STRAND_FRAGMENT = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform float uLockKind;
uniform float uWhole;
uniform vec4 uTone;
uniform vec4 uCoat;
varying vec3 vLight;
varying vec3 vFrostLight;
varying vec4 vAt;
varying vec4 vInfo;
void main() {
  float u = vAt.x;
  float t = vAt.y;
  float own = vAt.z;
  // Round: lit across its middle, let go at its edges.
  float round_ = sqrt(max(0.0, 1.0 - u * u));
  float alpha = vAt.w * smoothstep(0.0, 0.55, 1.0 - abs(u));
  float singe = 1.0 - vInfo.w;
  // Cream, each hair its own shade; wet and dark toward the root, where the coat is matted, and paler at its dry end.
  vec3 albedo = uTone.rgb * mix(vec3(0.76, 0.66, 0.54), vec3(1.0, 0.95, 0.87), smoothstep(0.0, 0.8, t)) * (0.8 + 0.5 * own);
  albedo *= mix(uLockKind > 0.5 ? 0.62 : mix(0.45, 0.82, uWhole), 1.0, smoothstep(0.0, 0.55, t));
  albedo = mix(albedo, vec3(0.02, 0.016, 0.014), singe * (0.45 + 0.55 * t));
  vec3 c = albedo * vLight * (0.6 + 0.4 * round_);
  // Rime: on the hair that looks up it lies along the outer half; on the rest it sits at the ends. The clotted spikes round the burn
  // are white from their middle.
  float ring = smoothstep(0.02, 0.2, singe) * (1.0 - smoothstep(0.4, 0.75, singe));
  float frost = smoothstep(0.7, 1.2, vInfo.z + uCoat.w + 0.7 * (min(vInfo.x, 1.0) - 0.5) + 0.9 * ring);
  // It is in grains along a hair, not a coat of paint on it.
  float grains = 0.5 + 0.5 * sin(vInfo.y * (38.0 + 30.0 * own) + own * 90.0);
  float lies = frost * smoothstep(0.12, 0.5, t) * smoothstep(0.2, 0.6, own + 0.6 * frost) * (0.45 + 0.55 * smoothstep(0.2, 0.7, grains));
  float bead = smoothstep(0.78, 0.97, vInfo.y) * step(0.35, fract(own * 7.7));
  float white = clamp(max(max(lies, 0.8 * bead) * (1.0 - singe), smoothstep(1.5, 2.0, vInfo.x) * smoothstep(0.15, 0.6, t)), 0.0, 1.0);
  c = mix(c, vec3(0.86, 0.89, 0.94) * vFrostLight * (0.75 + 0.25 * round_), white);
  if (alpha < 0.03) discard;
  gl_FragColor = vec4(c * (1.0 - uSolo), alpha);
}`;


export const TENDRIL_VERTEX = /* glsl */ `
attribute vec4 aHang;
attribute vec4 aLimb;
${RIG_GLSL}
${LIGHT_GLSL}
${BONES_GLSL}
uniform vec4 uFace;
uniform vec4 uLead;
uniform vec4 uWrithe;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vAt;
varying vec3 vLit;
varying vec3 vGleam;
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
  float fan = 1.3 * aHang.w;
  vec3 flatLead = normalize(vec3(lead.x, 0.0, lead.z));
  vec3 flatAcross = vec3(-flatLead.z, 0.0, flatLead.x);
  vec3 dir = flatLead * cos(fan) + flatAcross * sin(fan);
  vec3 sideways = vec3(-dir.z, 0.0, dir.x);
  float bend = (fract(seed * 7.3) - 0.5) * 2.0;
  float hook = aLimb.z * smoothstep(0.55, 1.0, t);
  float arch = fract(seed * 3.1);
  vec3 spilled = dir * (t - 0.2 * hook * hook - 0.06 * bend * bend * t * t) + sideways * (0.25 * bend * t * t + 0.05 * sin(t * 8.0 + seed * 20.0) * t + 0.02 * sin(t * 21.0 + seed * 31.0) + 0.06 * t * (abs(fract(t * 3.3 + seed * 9.0) - 0.5) - 0.25) + 0.2 * hook * hook * sign(bend))
    + down * (0.3 * t + 0.5 * t * t) + vec3(0.0, 1.0, 0.0) * ((0.03 + 0.17 * arch) * sin(3.14159 * pow(t, 0.7)) + 0.02 * abs(sin(t * 5.0 + seed * 44.0)) * smoothstep(0.1, 0.4, t) + 0.06 * hook * hook * step(0.4, fract(seed * 11.0)));
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
  float r = aLimb.y * size * mix(1.0, 0.68, uWrithe.y) * (1.0 - 0.97 * pow(t, mix(1.6, 0.9, uWrithe.y))) * (1.0 + 0.16 * sin(t * 31.0 + seed * 12.0) + 0.1 * sin(t * 77.0 + seed * 5.0));
  vec3 centre = root + len * pathAt(t, lead, across, seed);
  vec3 ahead = root + len * pathAt(t + 0.03, lead, across, seed);
  float bed = r * 0.85 + 0.01;
  centre.y = max(centre.y, groundY(centre) + bed);
  ahead.y = max(ahead.y, groundY(ahead) + bed);
  vec3 way = normalize(ahead - centre + vec3(0.0, 1e-5, 0.0));
  vec3 u = normalize(cross(way, abs(way.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
  vec3 v = cross(way, u);
  vec3 ring = u * position.x + v * position.z;
  // The dead one's are not smooth: cords run down them as down a root, and rime stands on the side that looks up, in crusts.
  float around = atan(position.z, position.x);
  float cords = sin(around * 3.0 + t * (7.0 + 9.0 * fract(seed * 4.1)) + seed * 30.0) + 0.5 * sin(around * 5.0 - t * 13.0 + seed * 11.0);
  float crust = max(ring.y, 0.0) * (0.5 + 0.5 * sin(t * (37.0 + 16.0 * fract(seed * 6.7)) + seed * 90.0) * sin(t * 17.0 + seed * 17.0)) * smoothstep(0.03, 0.15, t);
  vec3 p = centre + ring * r * (1.0 + uWrithe.y * (0.17 * cords + 0.45 * crust));
  vWorld = p;
  vNormal = normalize(ring);
  vAt = vec3(t, around, seed);
  // Its light is worked out at its rings, not at every point of it: it is round and finely cut, and the light on it is broad.
  vec3 toCamera = normalize(cameraPosition - p);
  vLit = runnerLight(p, vNormal);
  vGleam = runnerLight(p, normalize(reflect(-toCamera, vNormal) + vNormal));
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const TENDRIL_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
uniform vec4 uCoat;
uniform vec4 uWrithe;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vAt;
varying vec3 vLit;
varying vec3 vGleam;
void main() {
  vec3 toCamera = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float t = vAt.x;
  // Bare skin: dark, ringed like a worm's, paler and raw toward the root, wet.
  float rings = smoothstep(0.3, 0.7, fract(t * (22.0 + 10.0 * fract(vAt.z * 3.0)) + 0.4 * sin(vAt.y * 2.0)));
  float blotch = vnoise3(vec3(t * 9.0, vAt.y * 1.5, vAt.z * 40.0));
  vec3 albedo = mix(vec3(0.16, 0.11, 0.11), vec3(0.42, 0.3, 0.29), 0.55 * blotch + 0.3 * (1.0 - t)) * (0.75 + 0.35 * rings);
  // Rime where it looks up, in beads and feathers.
  float crystals = vnoise3(vWorld * 520.0);
  float rime = smoothstep(0.25, 0.75, n.y + 0.3 * uCoat.w - 0.5 + 0.8 * (crystals - 0.5) + 0.4 * (vnoise3(vWorld * 60.0) - 0.5));
  // Dead, the blood is out of it: grey, dull, and the rime thick on it.
  // It is corded like a root: dark in the furrows between the cords, a dry grey on them.
  float cords = sin(vAt.y * 3.0 + t * (7.0 + 9.0 * fract(vAt.z * 4.1)) + vAt.z * 30.0) + 0.5 * sin(vAt.y * 5.0 - t * 13.0 + vAt.z * 11.0);
  float furrow = smoothstep(-0.9, 0.5, cords);
  albedo = mix(albedo, mix(vec3(0.035, 0.028, 0.025), vec3(0.3, 0.26, 0.23), furrow) * (0.55 + 0.7 * blotch) * (0.75 + 0.4 * rings), 0.92 * uWrithe.y);
  // On the dead one's the rime lies in grains and broken patches along what looks up, and the dark cord shows through it.
  rime = mix(rime, 0.78 * smoothstep(0.74, 0.98, n.y * 0.5 + 0.5 + 0.5 * (crystals - 0.5) + 0.65 * (vnoise3(vWorld * 45.0) - 0.5) + 0.4 * (vnoise3(vWorld * 9.0) - 0.5)), uWrithe.y);
  // On a living one in the cold its own breath has frozen on them: they hang frosted, pale as the coat.
  rime = max(rime, (1.0 - uWrithe.y) * (0.45 + 0.4 * crystals));
  albedo = mix(albedo, vec3(0.74, 0.78, 0.84), rime);
  float rough = mix(0.32, 0.85, max(rime, 0.3 * uWrithe.y));
  vec3 e = vLit * (0.55 + 0.45 * t) * mix(1.0, 0.5 + 0.5 * furrow, uWrithe.y * (1.0 - rime));
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, toCamera), 0.0, 1.0);
  c += (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough) * vGleam / 3.14159;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The marks of the one that walks: aAt is the place and the radius, aLook the strength, the kind (0 flat on the floor, 1 snow in the air,
// turned to the lens), the heading and a seed.
export const MARK_VERTEX = /* glsl */ `
attribute vec4 aAt;
attribute vec4 aLook;
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vWorld;
void main() {
  vUv = position.xy;
  vLook = aLook;
  vec3 p;
  if (aLook.y < 0.5 || aLook.y > 2.5) {
    float c = cos(aLook.z);
    float s = sin(aLook.z);
    vec2 q = vec2(position.x * 1.25, position.y);
    p = aAt.xyz + aAt.w * vec3(c * q.x + s * q.y, 0.0, c * q.y - s * q.x);
  } else if (aLook.y < 1.5) {
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    p = aAt.xyz + aAt.w * (right * position.x + up * position.y);
  } else {
    // What the ice shows of a thing standing on it lies from its foot towards the lens, and a thing held over the ice by aLook.z metres
    // begins that much further out as the lens is low.
    vec2 to = cameraPosition.xz - aAt.xz;
    float far = length(to);
    to /= max(far, 1e-3);
    float low = far / max(0.2, cameraPosition.y - aAt.y);
    float along = 0.5 * position.y + 0.5;
    float out0 = aLook.z * low;
    float len = min(aLook.w * low, 0.8 * far);
    vec2 at = aAt.xz + to * (out0 + along * len) + vec2(-to.y, to.x) * position.x * aAt.w * (1.0 + 0.8 * along);
    p = vec3(at.x, aAt.y, at.y);
  }
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const MARK_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vWorld;
void main() {
  float r = length(vUv);
  float grain = vnoise(vUv * 3.0 + vLook.w * 31.0);
  float a;
  vec3 c = vec3(0.0);
  if (vLook.y < 0.5) {
    a = vLook.x * (1.0 - smoothstep(0.3, 1.0, r + 0.3 * (grain - 0.5)));
  } else if (vLook.y < 1.5) {
    a = vLook.x * pow(max(0.0, 1.0 - r), 1.5) * (0.35 + 0.65 * grain);
    c = a * rigShade(vWorld, vec3(0.0, 1.0, 0.0), normalize(cameraPosition - vWorld), vec3(0.8, 0.84, 0.9), 1.0, 1.0);
  } else if (vLook.y < 2.5) {
    float along = 0.5 * vUv.y + 0.5;
    float fine = vnoise(vWorld.xz * 9.0);
    a = vLook.x * (1.0 - vUv.x * vUv.x) * (1.0 - vUv.x * vUv.x) * smoothstep(0.0, 0.04, along) * pow(1.0 - along, 1.6) * (0.75 + 0.5 * fine);
  } else {
    // A print: the rime trodden down under the pad and the four toes ahead of it, not through to the ice, and what was trodden pushed up
    // pale behind it. Its outline is the paw's, broken by the grain of the rime.
    vec2 q = vUv + 0.14 * (vec2(grain, vnoise(vUv * 3.0 + vLook.w * 17.0)) - 0.5);
    float pad = 1.0 - smoothstep(0.6, 1.0, length((q - vec2(-0.2, 0.0)) / vec2(0.4, 0.5)));
    float toes = 1.0 - smoothstep(0.5, 1.0, length((q - vec2(0.42, 0.17)) / 0.19));
    toes = max(toes, 1.0 - smoothstep(0.5, 1.0, length((q - vec2(0.42, -0.17)) / 0.19)));
    toes = max(toes, 1.0 - smoothstep(0.5, 1.0, length((q - vec2(0.22, 0.47)) / 0.17)));
    toes = max(toes, 1.0 - smoothstep(0.5, 1.0, length((q - vec2(0.22, -0.47)) / 0.17)));
    float trod = max(pad, 0.85 * toes);
    float pressed = 0.42 * trod * (0.7 + 0.3 * grain) * vLook.x;
    float heap = 1.0 - smoothstep(0.75, 1.0, length((q - vec2(-0.25, 0.0)) / vec2(0.62, 0.7)));
    float rim = (1.0 - trod) * heap * (0.2 + 0.8 * smoothstep(0.1, -0.7, vUv.x)) * (0.45 + 0.55 * grain) * 0.75 * vLook.x;
    a = 1.0 - (1.0 - pressed) * (1.0 - rim);
    c = rim * rigShade(vWorld, vec3(0.0, 1.0, 0.0), normalize(cameraPosition - vWorld), vec3(0.8, 0.84, 0.9), 1.0, 1.0);
  }
  if (a < 0.004) discard;
  gl_FragColor = vec4(rigOut(c), a * (1.0 - uSolo));
}`;
