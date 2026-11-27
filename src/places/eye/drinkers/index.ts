// The drinkers: tall lean grazers at the water. Each is a body of its own build (body.data.ts: one computed surface, skinned to 26 bones),
// posed from its hooves up in herd.ts and skeleton.ts and drawn with the place's light. The near ones are the full body, the far herd a thinned one.
import * as THREE from 'three';
import { shoreOf } from '../layout';
import { landHeight } from '../land/height';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { during } from '../shared/anchors';
import { FAR_DATA, LEVELS, MID_DATA } from './body.data';
import { createCards } from './cards';
import { CLOSE_COUNT, herd, standPose, wadeOf, type Drinker } from './herd';
import { BONES, solve, type Solved } from './skeleton';

export const PARTS: readonly string[] = ['drinkers'];

const VERTEX = /* glsl */ `
attribute vec4 aBones;
attribute vec4 aWeights;
attribute vec2 aShade;
uniform vec4 uBones[${BONES * 3}];
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying vec3 vRestNormal;
varying vec2 vShade;
void main() {
  vec4 p = vec4(position, 1.0);
  // The head was made a wedge. It is a skull and a muzzle: full over the braincase, drawn in behind the jaw, and a blunt tube to the lips.
  float headed = 0.0;
  for (int k = 0; k < 4; k++) headed += abs(aBones[k] - 7.0) < 0.5 ? aWeights[k] : 0.0;
  vec3 fromSkull = position - vec3(0.0, 3.6, 1.52);
  vec3 muzzleWay = vec3(0.0, -0.1075, 0.9942);
  float h = dot(fromSkull, muzzleWay) / 0.744;
  float girthAt = 1.0 + 0.24 * exp(-pow((h - 0.12) / 0.24, 2.0)) - 0.08 * exp(-pow((h - 0.5) / 0.2, 2.0)) + 0.22 * smoothstep(0.6, 1.0, h);
  p.xyz += headed * ((girthAt - 1.0) * (fromSkull - muzzleWay * dot(fromSkull, muzzleWay)) + muzzleWay * (0.16 * smoothstep(0.25, 1.0, h)));
  vec3 world = vec3(0.0);
  vec3 n = vec3(0.0);
  for (int k = 0; k < 4; k++) {
    float w = aWeights[k];
    int b = int(aBones[k] + 0.5) * 3;
    world += w * vec3(dot(uBones[b], p), dot(uBones[b + 1], p), dot(uBones[b + 2], p));
    n += w * vec3(dot(uBones[b].xyz, normal), dot(uBones[b + 1].xyz, normal), dot(uBones[b + 2].xyz, normal));
  }
  vWorld = world;
  vNormal = normalize(n);
  vRest = position;
  vRestNormal = normal;
  vShade = aShade;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const FRAGMENT = /* glsl */ `
// x its own number, y its size, z the level of its feet, w how much of the sun the ground behind it keeps off it.
uniform vec4 uOwn;
// x how far its head is up, y how much of the low sun still reaches its back where the ground it stands on is in shade.
uniform vec2 uPose;
// The hide sheet: rgb its colour, a its relief.
uniform sampler2D tHide;
// The broad sheet: the loose folds, the scars and the dirt.
uniform sampler2D tFolds;
// Its slope, baked: red along the sheet, green down it, 0.5 level.
uniform sampler2D tSlope;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vRest;
varying vec3 vRestNormal;
varying vec2 vShade;
${NOISE_GLSL}
${RIG_GLSL}
// The sheet laid on the body as it was made, from the two sides that face a point best, so it neither swims nor stretches as the animal moves.
vec4 hideAt(vec3 p, vec3 dx, vec3 dy, ivec3 ma, ivec3 me, vec2 w) {
  vec4 a = textureGrad(tHide, vec2(p[ma.y], p[ma.z]), vec2(dx[ma.y], dx[ma.z]), vec2(dy[ma.y], dy[ma.z]));
  if (w.y > 0.04) a = a * w.x + textureGrad(tHide, vec2(p[me.y], p[me.z]), vec2(dx[me.y], dx[me.z]), vec2(dy[me.y], dy[me.z])) * w.y;
  return a;
}
// The broad sheet on one face of the body. Its folds run across the sheet: on the trunk they are laid to hang down the flank and run on over
// the back, on the neck and the legs to ring the limb.
vec2 faceUv(vec3 p, int axis, bool across) {
  return (axis == 0 ? (across ? p.zy : p.yz) : axis == 1 ? p.xz : p.xy) * vec2(0.4545, 0.606);
}
vec3 foldsOn(vec3 p, vec3 dx, vec3 dy, int a, int b, vec2 w, bool across) {
  // Where one side faces the point almost alone, it alone is read.
  vec3 c = textureGrad(tFolds, faceUv(p, a, across), faceUv(dx, a, across), faceUv(dy, a, across)).rgb;
  if (w.y > 0.04) c = c * w.x + textureGrad(tFolds, faceUv(p, b, across), faceUv(dx, b, across), faceUv(dy, b, across)).rgb * w.y;
  return c;
}
vec3 foldsAt(vec3 p, vec3 dx, vec3 dy, int a, int b, vec2 w, float limb) {
  vec3 c = vec3(0.0);
  if (limb < 0.98) c += (1.0 - limb) * foldsOn(p, dx, dy, a, b, w, false);
  if (limb > 0.02) c += limb * foldsOn(p, dx, dy, a, b, w, true);
  return c;
}
// Two places of the sheet, one over the other in patches; 1 is the sheet's own mean.
vec3 wornAt(vec3 p, vec3 dx, vec3 dy, int a, int b, vec2 w, float limb, float which) {
  vec3 c = vec3(0.0);
  if (which < 0.98) c += (1.0 - which) * foldsAt(p, dx, dy, a, b, w, limb);
  if (which > 0.02) c += which * foldsAt(p * 0.83 + vec3(5.3, 2.9, 7.7), dx * 0.83, dy * 0.83, a, b, w, limb);
  return c / vec3(0.4982, 0.3117, 0.2376);
}
// The slope of the folds across the screen, by the chain rule from the baked slope: no slope is ever taken across the screen from a value read
// under a branch, which the software renderer does not repeat. rx and ry are the body's own step across one pixel.
vec2 slopeOn(vec3 p, vec3 rx, vec3 ry, int a, int b, vec2 w, bool across) {
  vec2 ga = (textureGrad(tSlope, faceUv(p, a, across), faceUv(rx, a, across), faceUv(ry, a, across)).rg - 0.5) * vec2(120.67, -90.5);
  vec2 c = vec2(dot(ga, faceUv(rx, a, across)), dot(ga, faceUv(ry, a, across)));
  if (w.y > 0.04) {
    vec2 gb = (textureGrad(tSlope, faceUv(p, b, across), faceUv(rx, b, across), faceUv(ry, b, across)).rg - 0.5) * vec2(120.67, -90.5);
    c = w.x * c + w.y * vec2(dot(gb, faceUv(rx, b, across)), dot(gb, faceUv(ry, b, across)));
  }
  return c;
}
vec2 slopeAt(vec3 p, vec3 rx, vec3 ry, int a, int b, vec2 w, float limb) {
  vec2 c = vec2(0.0);
  if (limb < 0.98) c += (1.0 - limb) * slopeOn(p, rx, ry, a, b, w, false);
  if (limb > 0.02) c += limb * slopeOn(p, rx, ry, a, b, w, true);
  return c;
}
vec2 leanAt(vec3 p, vec3 rx, vec3 ry, int a, int b, vec2 w, float limb, float which) {
  vec2 c = vec2(0.0);
  if (which < 0.98) c += (1.0 - which) * slopeAt(p, rx, ry, a, b, w, limb);
  if (which > 0.02) c += which * slopeAt(p * 0.83 + vec3(5.3, 2.9, 7.7), rx * 0.83, ry * 0.83, a, b, w, limb);
  return c;
}
// Noise in the body as it was made: it lies the same on the back, the flank and the rump, and goes with the hide as the animal moves.
float n3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), u.x), mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
    mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), u.x), mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), u.x), u.y),
    u.z);
}
// One family of creases: 0 in the crease, 1 on the skin between two. u counts the creases; soft is how many of them one pixel holds.
float crease(float u, float soft) {
  float s = abs(fract(u) - 0.5) * 2.0;
  return mix(smoothstep(0.0, 0.34, s), 0.85, smoothstep(0.2, 0.55, soft));
}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float own = uOwn.x;
  // Seen in the lake it is its tone and no more: the water breaks up the rest.
  bool mirrored = cameraPosition.y < 0.0;
  vec3 at = vRest + own * vec3(13.7, 9.1, 25.3);
  vec3 rn = normalize(vRestNormal);
  // The hide is pale and bare. Its tone drifts over the body: warmer where the skin is thin, greyer where it is thick.
  float drift = n3(at * 1.3);
  float blotch = 0.6 * n3(at * 3.1) + 0.4 * n3(at * 8.3);
  vec3 skin = mix(vec3(0.67, 0.615, 0.5), vec3(0.75, 0.705, 0.6), drift) * (0.92 + 0.16 * blotch);
  vec3 dpx = dFdx(vWorld);
  vec3 dpy = dFdy(vWorld);
  vec3 rx = dFdx(vRest);
  vec3 ry = dFdy(vRest);
  float px = (length(dpx) + length(dpy)) / uOwn.y;
  // Where on the body: along the neck from its root, down the legs, on the flanks of the trunk.
  float along = dot(vRest - vec3(0.0, 2.02, 0.95), vec3(0.0, 0.9407, 0.3393));
  float neck = smoothstep(0.08, 0.4, along) * smoothstep(0.55, 0.75, vRest.z + 0.35 * (vRest.y - 2.0));
  float leg = (1.0 - smoothstep(1.2, 1.5, vRest.y)) * (1.0 - neck);
  float trunk = (1.0 - neck) * (1.0 - leg);
  float flank = trunk * smoothstep(0.3, 0.75, abs(rn.x));
  // Rings where the hide gathers: round the root of the neck and at every joint of a leg. The ribs stand under the hide of the chest.
  float w1 = n3(at * 4.3);
  float w2 = n3(at * 11.0);
  float rings = crease(along * 19.0 + 2.6 * w1 + 0.7 * w2, 19.0 * px);
  float root = 1.0 - smoothstep(0.2, 1.3, along);
  float joint = exp(-pow((vRest.y - 0.78) / 0.17, 2.0)) + exp(-pow((vRest.y - 0.14) / 0.09, 2.0)) + 0.6 * exp(-pow((vRest.y - 1.36) / 0.14, 2.0));
  float legRings = crease(vRest.y * 46.0 + 3.0 * w1 + 1.2 * w2, 46.0 * px);
  float ribs = flank * smoothstep(-0.12, 0.05, vRest.z) * smoothstep(0.6, 0.42, vRest.z) * smoothstep(1.42, 1.62, vRest.y) * smoothstep(2.16, 1.86, vRest.y);
  // The hide hangs loose where the body bends: at the root of the neck, behind the shoulder, in front of the stifle, under the belly. Over the
  // ribs, the hip and the rump it is drawn tight.
  vec3 fromShoulder = (vRest - vec3(0.0, 1.62, 0.62)) / vec3(1.0, 0.42, 0.3);
  vec3 fromStifle = (vRest - vec3(0.0, 1.5, -0.5)) / vec3(1.0, 0.36, 0.26);
  float slackNeck = neck * root * (1.0 - 0.7 * uPose.x);
  float loose = clamp(slackNeck + exp(-dot(fromShoulder.yz, fromShoulder.yz)) + exp(-dot(fromStifle.yz, fromStifle.yz))
    + trunk * smoothstep(-0.1, -0.7, rn.y) + 0.8 * leg * joint, 0.0, 1.0);
  loose = mix(0.1, 1.0, loose * smoothstep(0.15, 0.8, n3(at * 1.9 + 7.0)) * 1.5);
  loose = min(loose, 1.0);
  float relief = slackNeck * 0.004 * rings
    + leg * joint * 0.0026 * legRings
    + ribs * (1.0 - smoothstep(0.005, 0.016, px)) * 0.0022 * (0.5 + w1) * cos(6.2832 * (vRest.z + 0.3 * (vRest.y - 1.9) + 0.03 * w1) / 0.15);
  // The bones under a thin hide: the point of the hip, the blade and the point of the shoulder stand out, and the flank falls in between the
  // last rib and the hip.
  vec2 side = vRest.yz;
  vec2 onBlade = side - vec2(1.86, 0.66);
  float blade = exp(-pow(dot(onBlade, vec2(0.259, 0.966)) / 0.04, 2.0) - pow(dot(onBlade, vec2(0.966, -0.259)) / 0.24, 2.0));
  float bone = trunk * smoothstep(0.25, 0.6, abs(rn.x)) * (exp(-dot(side - vec2(2.02, -0.46), side - vec2(2.02, -0.46)) / 0.011)
    + 0.7 * exp(-dot(side - vec2(1.56, 0.8), side - vec2(1.56, 0.8)) / 0.0081) + 0.6 * blade);
  float hollow = trunk * smoothstep(0.25, 0.6, abs(rn.x)) * exp(-dot((side - vec2(1.88, -0.2)) / vec2(0.17, 0.13), (side - vec2(1.88, -0.2)) / vec2(0.17, 0.13)));
  float ribbed = ribs * (0.5 + w1) * cos(6.2832 * (vRest.z + 0.3 * (vRest.y - 1.9) + 0.03 * w1) / 0.15);
  relief += (1.0 - smoothstep(0.022, 0.05, px)) * (0.02 * bone - 0.022 * hollow + 0.0034 * ribbed);
  float groove = max(0.5 * neck * root * (1.0 - rings), 0.5 * leg * joint * (1.0 - legRings));
  // Every slope across the screen is taken here, above the first branch.
  vec2 slope = vec2(dFdx(relief), dFdy(relief));
  if (!mirrored) {
    vec3 an = abs(rn);
    ivec3 ma = (an.x > an.y && an.x > an.z) ? ivec3(0, 1, 2) : (an.y > an.z) ? ivec3(1, 2, 0) : ivec3(2, 0, 1);
    ivec3 mi = (an.x < an.y && an.x < an.z) ? ivec3(0, 1, 2) : (an.y < an.z) ? ivec3(1, 2, 0) : ivec3(2, 0, 1);
    ivec3 me = ivec3(3) - mi - ma;
    vec2 w = clamp((vec2(an[ma.x], an[me.x]) - 0.5773) / 0.4227, 0.0, 1.0);
    w = (w + 1e-4) / (w.x + w.y + 2e-4);
    vec3 dx = rx * 0.6;
    vec3 dy = ry * 0.6;
    // The loose hide: its folds, scars and dirt, from the broad sheet. Two places of the sheet are worn, one over the other in patches, so no
    // scar is found twice on one animal, and no two animals wear the same.
    float limb = max(neck, leg);
    float which = smoothstep(0.42, 0.58, n3(at * 0.8 + 3.0));
    vec3 folded = wornAt(at, dx, dy, ma.x, me.x, w, limb, which);
    float tone = dot(folded, vec3(0.3, 0.5, 0.2));
    skin *= mix(vec3(1.0), mix(vec3(tone), folded, 0.75), 0.5 + 0.5 * loose);
    // The bottom of a fold holds its own shade and the dirt of years: it is dark, and darkest where the hide hangs loosest.
    skin *= mix(vec3(1.0), vec3(0.5, 0.42, 0.38), 0.85 * loose * smoothstep(0.95, 0.6, tone));
    // The fine sheet, twice: the net of creases, and close to, the pores.
    vec4 broad = hideAt(at * 1.5, dx * 1.5, dy * 1.5, ma, me, w);
    vec4 fine = vec4(0.69, 0.41, 0.32, 0.5);
    if (px < 0.004) fine = hideAt(at.yzx * 4.7, dx.yzx * 4.7, dy.yzx * 4.7, ma.yzx, me.yzx, w);
    vec3 tiled = sqrt(broad.rgb * fine.rgb) / vec3(0.69, 0.41, 0.32);
    skin *= mix(vec3(1.0), tiled, 0.45) * mix(0.9, 1.0, smoothstep(0.22, 0.52, broad.a)) * (0.94 + 0.12 * fine.a);
    // The folds turn the light: the relief's slope across the screen leans the normal.
    slope += 0.06 * loose * leanAt(at, rx, ry, ma.x, me.x, w, limb, which);
    vec3 r1 = cross(dpy, n);
    vec3 r2 = cross(n, dpx);
    float det = dot(dpx, r1);
    vec3 lean = sign(det) * uOwn.y * (slope.x * r1 + slope.y * r2);
    n = normalize(abs(det) * n - lean / max(1.0, length(lean) / (0.55 * abs(det) + 1e-12)));
  }
  // Dirt lies in every crease and hollow.
  skin *= mix(vec3(1.0), vec3(0.5, 0.44, 0.4), 0.75 * groove) * mix(vec3(0.66, 0.6, 0.56), vec3(1.0), vShade.y);
  // Dust and old mud dark along the spine and the withers, and smeared down the shoulder and the haunch.
  float top = trunk * smoothstep(0.45, 0.95, rn.y) * smoothstep(0.5, 0.2, abs(vRest.x) + 0.25 * (blotch - 0.5));
  float smear = trunk * smoothstep(0.5, 0.72, n3(at * vec3(2.2, 1.1, 2.2) + 11.0) + 0.25 * (vRest.y - 1.9));
  // Where rain has run off the back the old dirt stands in streaks down the ribs and the haunch.
  float run = trunk * (1.0 - smoothstep(0.005, 0.016, px)) * smoothstep(1.5, 2.1, vRest.y) * smoothstep(0.56, 0.74, n3(vec3(at.x * 0.6, at.y * 0.45, at.z * 21.0)));
  // And it lies as a ragged grey saddle from the spine down onto the ribs and the rump, where the animal cannot rub it off.
  float saddle = trunk * smoothstep(1.8, 2.14, vRest.y + 0.5 * (n3(at * vec3(1.6, 1.0, 3.4) + 17.0) - 0.5)) * (0.5 + 0.5 * blotch);
  float dirt = clamp(0.85 * top * smoothstep(0.2, 0.6, n3(at * vec3(3.0, 3.0, 1.4) + 5.0)) + 0.46 * smear + 0.4 * run + 0.8 * saddle, 0.0, 1.0);
  skin = mix(skin, skin * vec3(0.46, 0.4, 0.36), dirt);
  // The hide is rubbed pale on the bones and lies in its own shade between the ribs and in the hollow of the flank.
  skin *= 1.0 + (1.0 - smoothstep(0.022, 0.05, px)) * (0.2 * bone - 0.3 * hollow - 0.11 * (0.4 + 1.2 * w2) * (ribs * (0.5 + w1) - ribbed));
  // Each a tone of its own.
  skin *= mix(vec3(0.88, 0.87, 0.86), vec3(1.06, 1.03, 1.0), fract(own * 7.3));
  // The belly and the inside of the legs are paler; the joints of the legs are rubbed dark.
  skin *= 1.0 + 0.1 * smoothstep(0.2, -0.6, rn.y) * trunk;
  float above = (vWorld.y - max(uOwn.z, 0.0)) / uOwn.y;
  float ragged = n3(at * 9.0);
  float knee = leg * (exp(-pow((vRest.y - 0.78) / 0.12, 2.0)) + exp(-pow((vRest.y - 0.14) / 0.07, 2.0)));
  skin *= 1.0 - 0.3 * knee * (0.4 + 0.6 * ragged);
  // Wet and dark where it has stood in the lake, and flecked with the mud it kicked up, thinning to the knee; dry above. The horn of the hoof is dark.
  float wet = 1.0 - smoothstep(0.14, 0.4, above + 0.2 * ragged);
  // Where the leg goes into the lake the water climbs it a finger's width and is dark with the leg's own shade.
  float waterline = (1.0 - smoothstep(0.0, 0.06, above + 0.03 * ragged)) * step(uOwn.z, -0.02);
  float muddy = (1.0 - smoothstep(0.2, 1.25, above + 0.5 * ragged)) * leg;
  skin *= mix(vec3(1.0), vec3(0.5, 0.44, 0.39), 0.85 * muddy * (0.55 + 0.9 * ragged));
  float fleck = smoothstep(0.7, 0.78, n3(at * vec3(110.0, 70.0, 110.0)) * (0.7 + 0.6 * n3(at * 6.0))) * (1.0 - smoothstep(0.3, 1.4, above + 0.6 * ragged));
  float horn = 1.0 - smoothstep(0.075, 0.1, vRest.y + 0.02 * ragged);
  vec3 albedo = mix(skin * mix(vec3(1.0), vec3(0.17, 0.15, 0.14), wet) * (1.0 - 0.78 * waterline), vec3(0.13, 0.1, 0.08), 0.55 * fleck);
  albedo = mix(albedo, vec3(0.05, 0.045, 0.04), horn);
  float occ = mix(0.48, 1.0, vShade.x) * (1.0 - 0.35 * groove);
  vec3 p = vec3(vWorld.x, vWorld.y + 3.2, vWorld.z);
  vec3 c = rigShade(p, n, v, albedo, mix(0.78, 0.6, wet), occ);
  // The two under the last camera stand in the shade of the bluff it looks from. The rig knows no such shade: their feet are at a level of
  // their own. The sun the rig gave them is taken back.
  float sunHere = sunAt(p);
  float lit = 1.0 - uOwn.w;
  c -= albedo * uSunColour * (uOwn.w * max(dot(n, uSunDir), 0.0) * sunHere * (0.4 + 0.6 * occ) / 3.14159);
  // The pale gravel and the water under it throw the sky back up at it, and the lit wall across the lake warms the side turned from the sun.
  c += albedo * skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.16 / 3.14159) * (0.75 - 0.25 * n.y);
  c += rigBounce(p, n, albedo) * occ;
  // A bare hide has a dull sheen, and the low sun comes a little way through it wherever it turns from sight.
  c += rigGlint(p, n, v, 0.5) * (0.35 * occ * (1.0 - dirt) * lit);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float through = pow(1.0 - nv, 2.5) * (0.35 + 0.65 * max(dot(-v, uSunDir), 0.0));
  c += albedo * vec3(1.0, 0.62, 0.45) * uSunColour * (0.2 * through * sunHere * lit * occ / 3.14159);
  // The low sun is warm in a bare hide, and lies along every outline that is turned to it.
  float sunward = dot(n, uSunDir);
  float rim = pow(1.0 - nv, 3.0) * smoothstep(-0.15, 0.5, sunward);
  c += albedo * uSunColour * (vec3(0.05, -0.01, -0.13) * max(sunward, 0.0) + vec3(1.0, 0.7, 0.46) * rim) * (sunHere * lit * (0.4 + 0.6 * occ) / 3.14159);
  // The herd stands on a bank the evening shade has taken, and the dark gravel gives nothing back: a hide there is grey, and darkest at
  // the belly and down the legs. Backs and necks stand up into the last of the sun.
  c *= max(0.14, 1.0 - uPose.y * (0.5 + 1.15 * (1.0 - smoothstep(0.15, 1.15, above)) + 0.9 * max(-n.y, 0.0)));
  c += albedo * uSunColour * (vec3(1.0, 0.9, 0.78) * max(sunward, 0.0) + vec3(1.0, 0.7, 0.46) * rim)
    * (1.6 * uPose.y * (1.0 - sunHere) * smoothstep(0.25, 1.1, above) * (0.4 + 0.6 * occ) / 3.14159);
  // A hide is not chalk: where it turns from the sun the light goes a little way round and into it, and comes out red.
  float turned = max((sunward + 0.42) / 1.42, 0.0) - max(sunward, 0.0);
  c += albedo * uSunColour * vec3(1.0, 0.7, 0.52) * (0.4 * turned * sunHere * lit * (0.4 + 0.6 * occ) / 3.14159);
  // The wet of the leg takes the sun as a film of water does.
  c += 0.25 * wet * lit * rigGlint(p, n, v, 0.16);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

function decode(text: string): Uint8Array {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function bodyGeometry(text: string, level: { vertices: number; triangles: number; lo: number[]; hi: number[] }): THREE.BufferGeometry {
  const bytes = decode(text);
  const n = level.vertices;
  const view = new DataView(bytes.buffer);
  const position = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) {
    const lo = level.lo[i % 3] as number;
    const hi = level.hi[i % 3] as number;
    position[i] = lo + (view.getUint16(i * 2, true) / 65535) * (hi - lo);
  }
  let o = n * 6;
  const normal = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) normal[i] = view.getInt8(o + i) / 127;
  o += n * 3;
  const bones = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) bones[i] = bytes[o + i] as number;
  o += n * 4;
  const weights = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) weights[i] = (bytes[o + i] as number) / 255;
  o += n * 4;
  const shade = new Float32Array(n * 2);
  for (let i = 0; i < n * 2; i++) shade[i] = (bytes[o + i] as number) / 255;
  o += n * 2;
  const index = new Uint16Array(level.triangles * 3);
  for (let i = 0; i < index.length; i++) index[i] = view.getUint16(o + i * 2, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  g.setAttribute('aBones', new THREE.BufferAttribute(bones, 4));
  g.setAttribute('aWeights', new THREE.BufferAttribute(weights, 4));
  g.setAttribute('aShade', new THREE.BufferAttribute(shade, 2));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

interface Drawn {
  animal: Drinker;
  index: number;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  bones: Float32Array;
  own: THREE.Vector4;
  pose: THREE.Vector2;
  solved: Solved;
}

const CLOSE = CLOSE_COUNT;

export function create(ctx: Context): Piece {
  // The animals a close shot is about are bodies while their shot runs: the four of the shore and the three beyond the mats. The herd is
  // bodies in the wide shot, on the coarsest mesh, each with its own build, pose and time. In every other shot an animal is still a card.
  const all = herd(ctx.rng('drinkers-bodies'), ctx.events.rise - 1.7);
  const cast = all.map((_, index) => index);
  // The two under the last camera stay cards in every shot: their slender necks are the approved picture's, and the unit keeps them as they are.
  const shotOf = (index: number): string => (index < 4 ? 'eye-04' : index < 6 ? 'none' : index < CLOSE ? 'eye-02' : 'eye-01');
  const animals = cast.map((index) => all[index] as Drinker);
  const cards = createCards(ctx);
  const mid = bodyGeometry(MID_DATA, LEVELS.mid);
  const far = bodyGeometry(FAR_DATA, LEVELS.far);
  const tHide = { value: ctx.assets.texture('drinker/hide.png', { repeat: true, anisotropy: 1 }) };
  const tFolds = { value: ctx.assets.texture('drinker/folds.jpg', { repeat: true, anisotropy: 1 }) };
  const tSlope = { value: ctx.assets.texture('drinker/folds-n.png', { kind: 'data', repeat: true, anisotropy: 1 }) };
  const drawn: Drawn[] = animals.map((animal, i) => {
    const index = cast[i] as number;
    const bones = new Float32Array(BONES * 12);
    const own = new THREE.Vector4(animal.own, animal.build.size, 0, animal.level === undefined ? 0 : 0.45);
    const pose = new THREE.Vector2(0, index < CLOSE ? 0 : 0.45);
    const material = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms, uBones: { value: bones }, uOwn: { value: own }, uPose: { value: pose }, tHide, tFolds, tSlope },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      // The surface is wound with its outside as its back: only that side is drawn.
      side: THREE.BackSide,
    });
    const mesh = new THREE.Mesh(index < CLOSE ? mid : far, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    ctx.scene.add(mesh);
    ctx.reflected.push(mesh);
    return { animal, index, mesh, material, bones, own, pose, solved: solve(animal.build, standPose(animal, 0, () => 0, 1), bones) };
  });
  // Each body darkens the ground it stands on, as its card did.
  const shade = ctx.rig.contactDiscs(drawn.length);
  const sun = ctx.rig.sun;
  ctx.parts.built('drinkers', (cards.meshes[0] as THREE.Mesh), ...cards.meshes.slice(1), ...drawn.map((d) => d.mesh));
  for (let i = 0; i < 22; i++) ctx.laps.push({ x: 0, z: 0, strength: 0, offset: i * 0.37 });
  const scratch = new Float32Array(BONES * 12);
  const ground = (x: number, z: number): number => landHeight(x, z);
  const wetAt = (x: number, z: number): boolean => Math.hypot(x, z) < shoreOf(x, z) - 0.2;

  // The pose at t: one that drinks has its neck let down just as far as brings its mouth to the water where it stands.
  const poseAt = (d: Drinker, t: number, into: Float32Array): Solved => {
    if (d.down(t) < 0.5 || d.level !== undefined) return solve(d.build, standPose(d, t, ground, 1), into);
    let lo = 0.6;
    let hi = 1.3;
    for (let i = 0; i < 12; i++) {
      const mid = 0.5 * (lo + hi);
      const muzzle = solve(d.build, { ...standPose(d, t, ground, mid), neck: [mid, mid, mid, mid, mid] }, into).muzzle;
      if (muzzle[1] > Math.max(0, ground(muzzle[0], muzzle[2])) - 0.04 * d.build.size) lo = mid;
      else hi = mid;
    }
    return solve(d.build, standPose(d, t, ground, 0.5 * (lo + hi)), into);
  };

  return {
    setTime: (t) => {
      const running = ['eye-01', 'eye-02', 'eye-04', 'eye-05'].find((id) => during(id));
      const isBody = (index: number): boolean => index < cast.length && shotOf(index) === running;
      let lap = cards.setTime(t, isBody);
      const ring = (x: number, z: number, strength: number): void => {
        const slot = ctx.laps[lap];
        if (!slot || strength <= 0) return;
        slot.x = x;
        slot.z = z;
        slot.strength = strength;
        lap++;
      };
      for (const g of drawn) {
        const d = g.animal;
        const bodies = isBody(g.index);
        g.mesh.visible = bodies;
        const size = d.build.size;
        if (!bodies) {
          ctx.rig.setDisc(shade, g.index, d.x, d.z, 0, 0);
          continue;
        }
        const solved = poseAt(d, t, g.bones);
        g.pose.x = Math.min(1, Math.max(0, 1 - d.down(t)));
        g.solved = solved;
        // Where it stands just now: the middle of its four hooves. One that walks is not where it was placed.
        const cx = 0.25 * solved.hooves.reduce((sum, h) => sum + h[0], 0);
        const cz = 0.25 * solved.hooves.reduce((sum, h) => sum + h[2], 0);
        // Its shade on the ground, long the way the low sun throws it. Far off it is all that sets the animal on the gravel, so it is full there.
        const herdOf = g.index >= CLOSE;
        const long = herdOf ? 1.6 : 2.6;
        const off = size * 1.5 * (long - 1) * 0.5;
        ctx.rig.setDisc(shade, g.index, cx - sun.direction.x * off, cz - sun.direction.z * off, size * (herdOf ? 1.5 : 1.2), d.level === undefined ? (herdOf ? 1 : 0.7) : 0, long, sun.shadowYaw);
        g.own.z = d.level ?? Math.max(wadeOf(d), ground(cx, cz));
        // The herd is far off: one ring round each that wades, and one where a mouth is in the water, while there are rings to give.
        if (herdOf) {
          if (wetAt(cx, cz) && g.own.z < -0.02) ring(cx, cz, 0.7);
          if (wetAt(solved.muzzle[0], solved.muzzle[2]) && d.down(t) > 0.9) ring(solved.muzzle[0], solved.muzzle[2], 1.0);
          continue;
        }
        // Rings where its mouth is in the water, and round a hoof that has just come down or is about to leave.
        const low = d.down(t);
        if (wetAt(solved.muzzle[0], solved.muzzle[2])) ring(solved.muzzle[0], solved.muzzle[2], 1.3 * Math.min(1, Math.max(0, (low - 0.86) / 0.1)));
        const was = poseAt(d, t - 0.45, scratch).hooves.map((h) => h[1]);
        for (let pair = 0; pair < 2; pair++) {
          const a = solved.hooves[pair * 2] as [number, number, number];
          const b = solved.hooves[pair * 2 + 1] as [number, number, number];
          const stir = Math.max(a[1], b[1]) - g.own.z;
          const at = a[1] > b[1] ? a : b;
          // A hoof that stands still leaves the water still: the ring is there while it lifts and for a moment after it is set down.
          const before = Math.max(was[pair * 2] as number, was[pair * 2 + 1] as number) - g.own.z;
          if (wetAt(at[0], at[2]) && g.own.z < -0.02) ring(at[0], at[2], Math.min(1.2, 9 * Math.max(stir, 0.7 * before)));
        }
      }
      // And a faint ring round every leg that stands in the lake: the animal breathes and shifts, and the water at its legs is never quite still.
      for (const g of drawn) {
        if (!g.mesh.visible || g.own.z > -0.02 || g.index >= CLOSE) continue;
        for (const h of g.solved.hooves) if (wetAt(h[0], h[2]) && h[1] - g.own.z < 0.02) ring(h[0], h[2], 0.3);
      }
      for (; lap < ctx.laps.length; lap++) {
        const slot = ctx.laps[lap];
        if (slot) slot.strength = 0;
      }
    },
    dispose: () => {
      cards.dispose();
      mid.dispose();
      far.dispose();
      for (const g of drawn) g.material.dispose();
    },
  };
}
