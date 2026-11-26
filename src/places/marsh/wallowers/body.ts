// One mud-wallower as one skin: the surface of `field.ts`, taken once, carried by seventeen bones in the vertex shader and shaded with the
// hide picture laid by position on three axes. A pose is written from a Drive (the gait's, or a still one's) as a pure function of it.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { MID, type Build, type Drive, type Stood } from './animal';
import { BELLY, BONES, CHEST, HEAD, LEG, NECK, PELVIS, wallowerBody, type Skeleton, type V3 } from './field';
import { normals, shell } from './nets';

export interface Hide {
  geometry: THREE.BufferGeometry;
  skeleton: Skeleton;
}

const made = new Map<string, Hide>();

/** The skin of a body, made once for each (young, seed, cell): `cell` is the size of a cell of the grid its surface is taken on, metres. */
export function hideOf(young: number, seed: number, cell: number): Hide {
  const key = `${young}/${seed}/${cell}`;
  const have = made.get(key);
  if (have) return have;
  const body = wallowerBody(young, seed);
  const s = shell(body.field, body.box, cell);
  const bones = new Float32Array(s.count * 3);
  const info = new Float32Array(s.count * 4);
  const out = { a: 0, b: 0, w: 1, leg: 0, horn: 0, lift: 0, fold: 1 };
  for (let v = 0; v < s.count; v++) {
    const x = s.position[v * 3] as number;
    const y = s.position[v * 3 + 1] as number;
    const z = s.position[v * 3 + 2] as number;
    body.weigh(x, y, z, out);
    // The folds lift the smooth skin along its normal: the surface is taken without them and they are pressed into it here.
    s.position[v * 3] = x + (s.normal[v * 3] as number) * out.lift;
    s.position[v * 3 + 1] = y + (s.normal[v * 3 + 1] as number) * out.lift;
    s.position[v * 3 + 2] = z + (s.normal[v * 3 + 2] as number) * out.lift;
    bones[v * 3] = out.a;
    bones[v * 3 + 1] = out.b;
    bones[v * 3 + 2] = out.w;
    info[v * 4] = out.fold;
    info[v * 4 + 1] = out.horn;
    info[v * 4 + 2] = out.leg;
    // Breath shows in the flanks behind the shoulder, not in the back or the legs.
    const ny = s.normal[v * 3 + 1] as number;
    const trunk = out.a === BELLY || out.a === CHEST ? 1 : out.b === BELLY || out.b === CHEST ? 1 - out.w : 0;
    info[v * 4 + 3] = trunk * (1 - out.leg) * (1 - 0.7 * Math.max(0, ny)) * Math.exp(-((x + 0.1) ** 2) / 1.2);
  }
  normals(s.position, s.index, s.normal);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(s.position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(s.normal, 3));
  geometry.setAttribute('aBones', new THREE.BufferAttribute(bones, 3));
  geometry.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
  geometry.setIndex(new THREE.BufferAttribute(s.index, 1));
  const hide = { geometry, skeleton: body.skeleton };
  made.set(key, hide);
  return hide;
}

/** The picture of the heavy one from the side lies on each flank of the body at rest: x from the muzzle to the rump, y from the ground to the back.
 * A leg takes the near leg of the picture, wherever it stands under the trunk. Pixels of the picture, 1774 by 887. */
const PIC_GLSL = /* glsl */ `
uniform vec4 uPic;
vec2 picAt(vec3 p, float leg) {
  float trunk = 180.0 + (uPic.x - p.x) * (1510.0 / (uPic.x - uPic.y));
  float fore = step(0.5 * (uPic.z + uPic.w), p.x);
  float limb = mix(1570.0 + (uPic.w - p.x) * 350.0, 850.0 + (uPic.z - p.x) * 350.0, fore);
  // The head of the picture hangs lower than the head at rest.
  float y = p.y - 0.2 * smoothstep(0.52, 0.88, p.x / uPic.x);
  // Over the back the picture is carried on from the flank, row by row, to the spine: the back is the upper flank of the picture, never its edge.
  float over = max(p.y - 1.27, 0.0) / 0.75;
  y -= (p.y - 1.27 - 0.44 * (1.5708 - atan(abs(p.z) / 0.86, max(over, 0.001)))) * step(1.27, p.y) * (1.0 - leg);
  return vec2(mix(trunk, limb, leg * smoothstep(1.05, 0.5, p.y)) / 1774.0, 1.0 - (824.0 - y * 370.0) / 887.0);
}`;

const VERTEX = /* glsl */ `
attribute vec3 aBones;
attribute vec4 aInfo;
uniform mat4 uBones[${BONES}];
uniform float uK;
uniform float uBreath;
uniform float uDisp;
uniform vec3 uShift;
uniform sampler2D tPic;
uniform sampler2D tPicA;
#ifdef CRUSTED
uniform sampler2D tRimeNh;
#endif
varying vec3 vRest;
varying vec3 vRestN;
varying vec3 vWorld;
varying vec4 vInfo;
varying vec3 vR0;
varying vec3 vR1;
varying vec3 vR2;
${PIC_GLSL}
void main() {
  float lift = 0.0;
  #ifdef CRUSTED
  {
    // Salt has grown on it in knobs: thick on what faces the sky, thin on the legs and the claws.
    vec3 cq = (position * uK + uShift) * RIME_SCALE;
    vec3 cw = pow(abs(normal), vec3(4.0));
    cw /= cw.x + cw.y + cw.z;
    float knob = cw.x * textureLod(tRimeNh, cq.zy, 1.0).b + cw.y * textureLod(tRimeNh, cq.xz, 1.0).b + cw.z * textureLod(tRimeNh, cq.xy, 1.0).b;
    float wide = cw.x * textureLod(tRimeNh, cq.zy * 0.31, 2.0).b + cw.y * textureLod(tRimeNh, cq.xz * 0.31, 2.0).b + cw.z * textureLod(tRimeNh, cq.xy * 0.31, 2.0).b;
    lift = ((knob - 0.35) * 0.05 + (wide - 0.4) * 0.11) * (1.0 - 0.6 * aInfo.z) * (1.0 - aInfo.y) / uK;
  }
  #endif
  if (uDisp > 0.0) {
    // The folds painted in the picture stand out of the skin where it is seen from the side: light is high, dark is the crease.
    vec2 uv = picAt(position, aInfo.z);
    float side = smoothstep(0.25, 0.6, abs(normal.z)) * smoothstep(0.5, 0.9, textureLod(tPicA, uv, 2.0).r);
    float fine = dot(textureLod(tPic, uv, 1.0).rgb, vec3(0.3, 0.5, 0.2));
    float wide = dot(textureLod(tPic, uv, 4.5).rgb, vec3(0.3, 0.5, 0.2));
    lift = clamp((fine - wide) / (wide + 0.03), -0.7, 0.5) * uDisp * side * (1.0 - aInfo.y);
  }
  vec3 rest = position + normal * (lift + uBreath * aInfo.w);
  mat4 ma = uBones[int(aBones.x + 0.5)];
  mat4 mb = uBones[int(aBones.y + 0.5)];
  vec4 p = vec4(rest, 1.0);
  vWorld = mix((mb * p).xyz, (ma * p).xyz, aBones.z);
  mat3 r = mat3(mb) * (1.0 - aBones.z) + mat3(ma) * aBones.z;
  vR0 = r[0];
  vR1 = r[1];
  vR2 = r[2];
  vRest = position;
  vRestN = normal;
  vInfo = aInfo;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vRest;
varying vec3 vRestN;
varying vec3 vWorld;
varying vec4 vInfo;
varying vec3 vR0;
varying vec3 vR1;
varying vec3 vR2;
uniform sampler2D tPic;
uniform sampler2D tPicA;
uniform sampler2D tHide;
uniform sampler2D tHideNh;
uniform float uK;
uniform vec3 uShift;
uniform float uSeconds;
uniform float uWet;
uniform float uSalt;
uniform float uMudded;
uniform float uCrust;
uniform float uFloorY;
uniform float uSeed;
uniform float uNear;
#ifdef CRUSTED
uniform sampler2D tRime;
uniform sampler2D tRimeNh;
const vec3 RIME_MEAN = vec3(0.389, 0.306, 0.282);
#endif
${NOISE_GLSL}
${RIG_GLSL}
${PIC_GLSL}
const vec3 HIDE_MEAN = vec3(0.165, 0.102, 0.072);
const vec3 LUMA = vec3(0.3, 0.5, 0.2);

void main() {
  vec3 nr = normalize(vRestN);
  vec3 q = vRest * uK + uShift;
  vec3 w = pow(abs(nr), vec3(4.0));
  w /= w.x + w.y + w.z;
  float fold = vInfo.x;
  float horn = vInfo.y;

  // The picture, on the flank it was taken of and on the other. Where the skin turns away from the side (the back, the brow, the breast, between
  // the legs) the picture would smear: there the hide tile carries the grain and the picture, blurred, only the colour.
  vec2 uv = picAt(vRest, vInfo.z);
  float cover = smoothstep(0.45, 0.85, textureLod(tPicA, uv, 1.5).r);
  float top = smoothstep(0.25, 0.6, nr.y) * smoothstep(1.2, 1.6, vRest.y) * (1.0 - vInfo.z);
  float side = max(smoothstep(0.06, 0.3, abs(nr.z)), top) * cover;
  // On a young one the plate is a third the size: its pores would read as down, so it is taken softer and the folds are left.
  vec3 pic = texture2D(tPic, uv, 1.7 * (1.0 - smoothstep(0.4, 0.8, uK))).rgb;
  vec2 e = vec2(3.0 / 1774.0, 3.0 / 887.0);
  float l0 = dot(textureLod(tPic, uv, 1.6).rgb, LUMA);
  float lx = dot(textureLod(tPic, uv + vec2(e.x, 0.0), 1.6).rgb, LUMA);
  float ly = dot(textureLod(tPic, uv + vec2(0.0, e.y), 1.6).rgb, LUMA);
  vec4 soft = vec4(textureLod(tPic, uv, 5.0).rgb, textureLod(tPicA, uv, 5.0).r);
  float y = vRest.y;
  vec3 plain = mix(vec3(0.15, 0.075, 0.055), vec3(0.19, 0.14, 0.115), smoothstep(0.45, 1.25, y));
  vec3 wash = mix(plain, soft.rgb / max(soft.a, 0.3), smoothstep(0.5, 0.9, soft.a));

  vec3 hide = w.x * texture2D(tHide, q.zy).rgb + w.y * texture2D(tHide, q.xz).rgb + w.z * texture2D(tHide, q.xy).rgb;
  vec3 hx = texture2D(tHideNh, q.zy).rgb;
  vec3 hy = texture2D(tHideNh, q.xz).rgb;
  vec3 hz = texture2D(tHideNh, q.xy).rgb;
  float height = w.x * hx.b + w.y * hy.b + w.z * hz.b;
  vec3 tone = hide / HIDE_MEAN;
  tone = mix(vec3(1.0), mix(vec3(dot(tone, LUMA)), tone, 0.4), 0.6);
  float crease = 0.75 + 0.25 * smoothstep(0.15, 0.62, height);
  vec3 tiled = wash * tone * crease;
  vec3 albedo = mix(tiled, pic, side) * 0.8;
  // A warm tan with pink in it; the deep red is the mud's, lower down.
  albedo = mix(vec3(dot(albedo, LUMA)) * vec3(1.14, 0.95, 0.82), albedo, 0.5);

  // The slope of the skin: from the light and dark of the picture on the flanks (a crease is dark), from the tile elsewhere, and the tile's grain over all near the lens.
  float tile = mix(1.2, 0.45 * uNear, side);
  vec2 sx = (hx.rg - 0.5) * tile;
  vec2 sy = (hy.rg - 0.5) * tile;
  vec2 sz = (hz.rg - 0.5) * tile;
  vec3 bump = w.x * vec3(0.0, sx.y, sx.x) + w.y * vec3(sy.x, 0.0, sy.y) + w.z * vec3(sz.x, sz.y, 0.0);
  vec2 slope = vec2(lx - l0, ly - l0) / (l0 + 0.04);
  // In the picture u runs from the muzzle back and v up.
  bump += vec3(slope.x, -slope.y * (1.0 - top), slope.y * top * sign(vRest.z)) * 1.5 * side;
  #ifdef CRUSTED
  vec3 rq = q * RIME_SCALE;
  vec3 rx = texture2D(tRimeNh, rq.zy).rgb;
  vec3 ry = texture2D(tRimeNh, rq.xz).rgb;
  vec3 rz = texture2D(tRimeNh, rq.xy).rgb;
  float rimeH = w.x * rx.b + w.y * ry.b + w.z * rz.b;
  vec3 rime = (w.x * texture2D(tRime, rq.zy).rgb + w.y * texture2D(tRime, rq.xz).rgb + w.z * texture2D(tRime, rq.xy).rgb) / RIME_MEAN;
  // Where the salt has grown: over all that faces the sky, less on the legs, and broken away in places so that the dried hide shows.
  float saltOn = smoothstep(0.3, 0.5, 0.45 * vnoise3(q * 2.1 + uSeed * 4.0) + 0.3 * rimeH + 0.4 * smoothstep(-0.5, 0.5, nr.y) + 0.12 - 0.3 * vInfo.z) * (1.0 - horn);
  vec2 rsx = (rx.rg - 0.5) * 1.6 * saltOn;
  vec2 rsy = (ry.rg - 0.5) * 1.6 * saltOn;
  vec2 rsz = (rz.rg - 0.5) * 1.6 * saltOn;
  bump = bump * (1.0 - 0.8 * saltOn) + w.x * vec3(0.0, rsx.y, rsx.x) + w.y * vec3(rsy.x, 0.0, rsy.y) + w.z * vec3(rsz.x, rsz.y, 0.0);
  #endif
  vec3 nb = normalize(nr - (bump - nr * dot(bump, nr)) * (1.0 - 0.7 * horn));
  mat3 r = mat3(vR0, vR1, vR2);
  vec3 ng = normalize(r * nr);
  vec3 n = normalize(r * nb);
  vec3 v = normalize(cameraPosition - vWorld);

  float patchy = vnoise3(q * 1.7 + uSeed);
  float grain = 0.5 + (height - 0.5) * (1.0 - side) + (l0 / (dot(soft.rgb, LUMA) / max(soft.a, 0.3) + 0.02) - 1.0) * 0.5 * side;
  // Dry salt blooms on what looks at the sky and stands out of the creases.
  float dry = clamp(uSalt, 0.0, 1.0);
  float dust = dry * smoothstep(0.1, 0.8, ng.y) * smoothstep(0.3, 0.9, grain + 0.5 * (patchy - 0.5)) * (1.0 - horn);

  // Wet: what has been under the brine is dark and red and shines. The line is ragged, and the brine still runs from it in threads.
  float lane = vnoise(vec2(q.x * 7.0 + q.z * 5.0, uSeed));
  float thread = smoothstep(0.5, 0.8, vnoise(vec2((q.x + q.z) * 31.0, vWorld.y * 1.3 - uSeconds * 0.3) + uSeed * 9.0));
  float ragged = 0.75 * (patchy - 0.5) + 0.3 * (lane - 0.5) + 0.14 * (grain - 0.5);
  // A small one is wet as far up its own side as a large one is up its side.
  float kk = clamp(uK, 0.3, 1.0);
  ragged *= kk;
  float wet = 1.0 - smoothstep(uWet - 0.1 * kk + ragged, uWet + 0.06 * kk + ragged, vWorld.y);
  float damp = 1.0 - smoothstep(uWet - 0.15 * kk + ragged, uWet + (0.34 + 0.26 * lane) * kk + ragged, vWorld.y);
  dust *= 1.0 - damp;
  albedo = mix(albedo, vec3(0.26, 0.225, 0.195) * (0.7 + 0.5 * grain), 0.5 * dust);
  // The stuck one is plastered with the grey mud it lies in: wet and dark below, drying pale and cracking on the back.
  float smear = uMudded * smoothstep(0.3, 0.55, 0.55 * patchy + 0.45 * vnoise3(q * 5.3 + uSeed * 2.0) + 0.5 * damp + 0.25 * (1.0 - grain));
  albedo = mix(albedo, mix(vec3(0.235, 0.165, 0.14), vec3(0.1, 0.045, 0.036), damp) * mix(0.5, 1.3, smoothstep(0.25, 0.8, grain)), 0.72 * smear);
  // Where it dried thickest it has caked into pale plates, each with a dark edge where it has lifted from the hide.
  float plate = vnoise3(q * 2.6 + uSeed * 5.0) + 0.25 * (vnoise3(q * 9.0 + uSeed) - 0.5);
  float cake = uMudded * (1.0 - damp) * smoothstep(0.4, 0.46, plate);
  albedo = mix(albedo, vec3(0.35, 0.275, 0.24) * (0.55 + 0.7 * grain), 0.85 * cake);
  // The edge of a plate shows only where it has lifted: here and there, never all the way round.
  albedo *= 1.0 - 0.65 * uMudded * (1.0 - damp) * smoothstep(0.36, 0.4, plate) * (1.0 - smoothstep(0.4, 0.44, plate)) * smoothstep(0.22, 0.55, vnoise3(q * 1.9 + uSeed * 11.0));
  // The cake has cracked as it dried: fine dark lines through each plate.
  float crack = abs(vnoise3(q * 11.0 + uSeed * 7.0) - 0.5);
  albedo *= 1.0 - 0.55 * cake * (1.0 - smoothstep(0.0, 0.035, crack));
  // On the ones that feed, mud is daubed and clotted on the lower third, where they have lain in it.
  float daub = (1.0 - uMudded) * damp * (1.0 - wet) * (1.0 - horn) * smoothstep(0.42, 0.52, plate);
  albedo = mix(albedo, vec3(0.095, 0.052, 0.042) * (0.55 + 0.7 * grain), 0.7 * daub);
  // Mud lies in every crease of it.
  albedo *= mix(1.0, mix(0.5, 1.08, smoothstep(0.2, 0.7, grain)), uMudded);
  // And where the mud has dried the longest, on its back, the salt has come out of it white.
  albedo = mix(albedo, vec3(0.26, 0.24, 0.22) * (0.5 + 0.8 * grain), 0.5 * uMudded * (1.0 - damp) * smoothstep(0.2, 0.8, ng.y) * smoothstep(0.45, 0.7, vnoise3(q * 4.3 + uSeed * 3.0)));
  // A dead one: the hide has dried dark and tight, and salt has grown over most of it in clumps.
  #ifdef CRUSTED
  // The hide under it has dried to the colour of old bone and leather; the salt on it is dirty white, pink in its hollows.
  vec3 dried = mix(vec3(0.2, 0.125, 0.085), vec3(0.085, 0.05, 0.036), smoothstep(0.55, 0.3, grain)) * (0.75 + 0.5 * patchy);
  vec3 saltC = vec3(0.335, 0.292, 0.272) * mix(vec3(1.0), rime, 0.85) * (0.72 + 0.4 * rimeH);
  albedo = mix(dried, saltC, saltOn);
  // Where it meets the crust the brine wicks up into the salt: pink at the foot.
  float foot = 1.0 - smoothstep(0.0, 0.3, vWorld.y - uFloorY + 0.12 * (patchy - 0.5));
  albedo = mix(albedo, albedo * vec3(0.8, 0.5, 0.46), 0.7 * foot);
  #endif
  // The claws: old ivory, grooved, stained at the root.
  vec3 ivory = vec3(0.15, 0.115, 0.08) * (0.7 + 0.5 * height) * mix(vec3(1.0), tone, 0.35);
  albedo = mix(albedo, mix(ivory, albedo * 1.3, 0.5 * side), horn);
  albedo = mix(albedo, albedo * vec3(0.95, 0.68, 0.56), damp * (1.0 - wet) * (1.0 - uMudded));
  // The stuck one's head is the wettest of it: it has been under and come up again.
  float headWet = uMudded * smoothstep(0.5, 0.82, vRest.x / uPic.x) * (1.0 - horn);
  albedo = mix(albedo, vec3(0.15, 0.09, 0.07) * (0.5 + 0.8 * grain), 0.55 * headWet);
  vec3 soaked = mix(albedo * vec3(0.8, 0.43, 0.33) + vec3(0.008, 0.002, 0.001), albedo * 0.55, uMudded);
  albedo = mix(albedo, soaked, wet);
  albedo = mix(albedo, albedo * vec3(0.6, 0.36, 0.3), 0.6 * thread * damp * (1.0 - wet));
  // Thick mud on whatever stands in it.
  float deep = 1.0 - smoothstep(0.02, 0.2 + 0.25 * lane, vWorld.y);
  albedo = mix(albedo, mix(vec3(0.05, 0.014, 0.01), vec3(0.05, 0.022, 0.018), uMudded) * (0.7 + 0.6 * grain), 0.8 * deep);

  // Wet hide does not shine all over under a white sky: it glistens on the tops of its folds.
  float glint = smoothstep(0.55, 0.95, grain);
  float rough = mix(0.93, mix(0.74, 0.44, glint), max(wet, 0.7 * thread * damp));
  rough = mix(rough, 0.7, headWet * glint);
  rough = mix(rough, 0.34, deep);
  rough = mix(rough, 0.6, horn * (1.0 - deep));
  rough = mix(rough, 1.0, 0.7 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0));
  // What a fold hides from the sky, and what the body hides from it: the belly, the throat, the insides of the legs. The picture brings its own shade.
  float occ = (0.55 + 0.45 * smoothstep(0.0, 0.85, fold)) * (0.5 + 0.5 * smoothstep(-0.95, 0.25, ng.y)) * mix(crease, 1.0, side);
  #ifdef CRUSTED
  occ = mix(occ, (0.6 + 0.4 * smoothstep(0.15, 0.6, rimeH)) * (0.6 + 0.4 * smoothstep(-0.9, 0.2, ng.y)) * (0.55 + 0.45 * smoothstep(0.0, 0.25, vWorld.y - uFloorY)), saltOn);
  rough = mix(rough, 0.97, saltOn);
  #endif
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const FEELER_VERTEX = /* glsl */ `
attribute vec3 iAt;
attribute vec3 iOut;
attribute vec4 iShape;
uniform mat4 uHead;
uniform float uSeconds;
uniform float uSplay;
uniform float uCurl;
uniform float uFloor;
uniform float uHang;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLook;
void main() {
  float s = position.x;
  float a = iShape.z * 40.0;
  // Each rakes to its own time: curled, then flicked out.
  float curl = max(0.3, 1.15 * uCurl + 0.16 * sin(uSeconds * (1.3 + 1.2 * fract(a)) + a) + 0.05 * sin(uSeconds * 3.3 + a * 2.3));
  // They hang: whatever way the head is held, each bends toward the ground under it.
  vec3 down = normalize(transpose(mat3(uHead)) * vec3(0.0, -1.0, 0.0));
  vec3 dir = normalize(iOut + vec3(0.5, 0.35, 0.0) * uSplay + down * (0.9 * uHang));
  vec3 c = down + vec3(-0.25, 0.0, -0.25 * iOut.z);
  vec3 bend = normalize(c - dir * dot(c, dir));
  curl *= 1.0 + 0.5 * uHang;
  float t = curl * s;
  vec3 centre = iAt + iShape.x * ((sin(t) / curl) * dir + ((1.0 - cos(t)) / curl) * bend);
  vec3 tangent = cos(t) * dir + sin(t) * bend;
  vec3 n1 = -sin(t) * dir + cos(t) * bend;
  vec3 n2 = cross(tangent, n1);
  // Thick where it leaves the lip, a long taper, a blunt tip.
  float knuckle = exp(-pow((s - 0.3) / 0.05, 2.0)) + 0.7 * exp(-pow((s - 0.58) / 0.045, 2.0));
  float radius = iShape.y * (0.1 + 0.9 * pow(1.0 - s, mix(1.15, 0.7, uHang))) * (1.0 + 0.06 * sin(s * 23.0 + a) + 0.16 * knuckle * (1.0 - uHang));
  vec3 rim = n1 * position.y + n2 * position.z;
  vec4 world = uHead * vec4(centre + rim * radius, 1.0);
  world.y = max(world.y, uFloor + 0.004 * position.y);
  vWorld = world.xyz;
  vNormal = normalize(mat3(uHead) * rim);
  vLook = vec3(s, atan(position.z, position.y), iShape.w);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const FEELER_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLook;
uniform float uWet;
uniform float uHang;
uniform float uSalted;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float s = vLook.x;
  // Old ivory: grooved along its length, ringed where it grew, stained dark at the root and red where it has been in the mud.
  float groove = vnoise(vec2(vLook.y * 3.0 + vLook.z * 9.0, s * 2.0));
  float ring = vnoise(vec2(s * 46.0 + vLook.z * 5.0, vLook.y * 0.7));
  vec3 albedo = vec3(0.17, 0.12, 0.08) * (0.55 + 0.4 * groove + 0.25 * ring);
  albedo = mix(albedo, vec3(0.07, 0.042, 0.03), 0.75 * (1.0 - smoothstep(0.0, 0.14, s)));
  // Creased at its joints like a finger, and the mud it rakes dries on it.
  float crease = exp(-pow((s - 0.26) / 0.012, 2.0)) + exp(-pow((s - 0.34) / 0.012, 2.0)) + exp(-pow((s - 0.55) / 0.012, 2.0)) + exp(-pow((s - 0.62) / 0.012, 2.0));
  albedo *= 1.0 - 0.5 * min(crease, 1.0) * (1.0 - uHang);
  albedo = mix(albedo, vec3(0.2, 0.165, 0.135) * (0.7 + 0.5 * groove), 0.6 * uHang);
  albedo = mix(albedo, vec3(0.1, 0.075, 0.06), 0.5 * smoothstep(0.45, 0.7, vnoise(vec2(s * 9.0 + vLook.z * 30.0, vLook.y * 1.5))));
  float wet = 1.0 - smoothstep(uWet - 0.05, uWet + 0.12 + 0.1 * groove, vWorld.y);
  albedo = mix(albedo, albedo * vec3(0.6, 0.3, 0.22) + vec3(0.008, 0.001, 0.001), 0.8 * wet);
  albedo = mix(albedo, vec3(0.03, 0.017, 0.012), 0.8 * smoothstep(0.8, 1.0, s));
  // On a dead one they are bare bone-yellow with salt grown on the upper side in knobs.
  float knobs = smoothstep(0.42, 0.6, vnoise(vec2(s * 14.0 + vLook.z * 50.0, vLook.y * 2.0)) + 0.25 * n.y);
  albedo = mix(albedo, mix(vec3(0.26, 0.17, 0.105) * (0.6 + 0.5 * groove), vec3(0.33, 0.29, 0.27), knobs), uSalted);
  float rough = mix(0.95, 0.7, wet);
  float occ = (0.5 + 0.5 * smoothstep(0.0, 0.3, s)) * (0.55 + 0.45 * smoothstep(-0.9, 0.3, n.y));
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const FEELER_RINGS = 14;
const FEELER_SIDES = 9;
let feelerTube: THREE.BufferGeometry | null = null;
function tube(): THREE.BufferGeometry {
  if (feelerTube) return feelerTube;
  const position: number[] = [];
  const index: number[] = [];
  for (let i = 0; i < FEELER_RINGS; i++) {
    for (let j = 0; j < FEELER_SIDES; j++) {
      const a = (j / FEELER_SIDES) * Math.PI * 2;
      position.push(i / (FEELER_RINGS - 1), Math.cos(a), Math.sin(a));
      if (i < FEELER_RINGS - 1) {
        const p = i * FEELER_SIDES + j;
        const q = i * FEELER_SIDES + ((j + 1) % FEELER_SIDES);
        index.push(p, q, p + FEELER_SIDES, q, q + FEELER_SIDES, p + FEELER_SIDES);
      }
    }
  }
  feelerTube = new THREE.BufferGeometry();
  feelerTube.setAttribute('position', new THREE.BufferAttribute(new Float32Array(position), 3));
  feelerTube.setIndex(index);
  return feelerTube;
}

export interface Look {
  /** The size of a cell of the skin's grid, metres at size 1: small for one the lens stands by. */
  cell: number;
  /** The level, in the world, under which it is soaked. */
  wet: number;
  /** 1 for the one stuck in grey mud. */
  mudded?: number;
  /** 0 a live one. A dead one is grown over with salt, the hide dark and dried where it shows through. */
  crust?: number;
  /** How many thin feelers hang from its lip in place of the hand of thick ones. */
  tendrils?: number;
  /** With tendrils: how far they hang, 1 straight down as a comb (the default), 0.3 a fan that rakes forward. And how thick, 1 as the comb. */
  hang?: number;
  thick?: number;
  /** How long the hand of thick feelers is, 1 as built. */
  reach?: number;
  /** How far the hide picture lifts the skin, metres. 0 for one seen from afar. */
  relief?: number;
}

const m = new THREE.Matrix4();
const t1 = new THREE.Matrix4();
const t2 = new THREE.Matrix4();
const q1 = new THREE.Quaternion();
const va = new THREE.Vector3();
const vb = new THREE.Vector3();
const vc = new THREE.Vector3();
const vd = new THREE.Vector3();
const ve = new THREE.Vector3();
const euler = new THREE.Euler();

/** Turn by `rot` about the point `at`, written into `out`. */
function about(out: THREE.Matrix4, at: V3, rot: THREE.Matrix4): THREE.Matrix4 {
  return out.makeTranslation(at[0], at[1], at[2]).multiply(rot).multiply(t2.makeTranslation(-at[0], -at[1], -at[2]));
}

export class Beast {
  readonly mesh: THREE.Mesh;
  readonly feelers: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  readonly feelerMaterial: THREE.ShaderMaterial;
  readonly stood: Stood = { x: 0, z: 0, yaw: 0, feet: [0, 1, 2, 3].map(() => ({ x: 0, z: 0, lift: 0 })), muzzle: { x: 0, y: 0, z: 0 }, belly: { x: 0, y: 0, z: 0 } };
  private readonly skeleton: Skeleton;
  private readonly bones = new Float32Array(BONES * 16);
  private readonly mats: THREE.Matrix4[] = Array.from({ length: BONES }, () => new THREE.Matrix4());
  private readonly world = new THREE.Matrix4();
  private readonly trunk = new THREE.Matrix4();
  private readonly head = new THREE.Matrix4();

  constructor(
    ctx: Context,
    readonly b: Build,
    look: Look,
  ) {
    const hide = hideOf(b.young > 0.5 ? 1 : 0, 1, look.cell * (b.young > 0.5 ? 1.3 : 1));
    this.skeleton = hide.skeleton;
    const seed = b.seed;
    const lx = b.young > 0.5 ? 0.9 : 1;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        tPic: { value: ctx.assets.texture('mat/wallower.jpg', { kind: 'colour', repeat: false, anisotropy: 4 }) },
        tPicA: { value: ctx.assets.texture('mat/wallower-a.png', { kind: 'data', repeat: false }) },
        tHide: { value: ctx.assets.texture('mat/hide.jpg', { kind: 'colour', anisotropy: 4 }) },
        tHideNh: { value: ctx.assets.texture('mat/hide-nh.png', { kind: 'data', anisotropy: 4 }) },
        uPic: { value: new THREE.Vector4(2.5 * lx, -2.14 * lx, 0.76 * lx, -1.24 * lx) },
        uBones: { value: this.bones },
        uK: { value: b.k },
        uBreath: { value: 0 },
        uDisp: { value: look.relief ?? 0 },
        uShift: { value: new THREE.Vector3(seed * 0.37, seed * 0.19, seed * 0.53) },
        uSeconds: { value: 0 },
        uWet: { value: look.wet },
        uSalt: { value: b.salt },
        uMudded: { value: look.mudded ?? 0 },
        uCrust: { value: look.crust ?? 0 },
        uFloorY: { value: look.wet + 5 },
        uSeed: { value: seed },
        uNear: { value: look.relief ? 1 : 0.4 },
        ...(look.crust
          ? {
              tRime: { value: ctx.assets.texture('mat/rime.jpg', { kind: 'colour', anisotropy: 4 }) },
              tRimeNh: { value: ctx.assets.texture('mat/rime-nh.png', { kind: 'data', anisotropy: 4 }) },
            }
          : {}),
      },
      defines: look.crust ? { CRUSTED: 1, RIME_SCALE: '1.3' } : {},
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
    });
    this.mesh = new THREE.Mesh(hide.geometry, this.material);
    this.mesh.frustumCulled = false;

    const rng = ctx.rng(`wallower-feelers-${seed.toFixed(3)}`);
    // The fringe of the lip as the body gives it: a hand of thick claws. Or, on one that asks for it, three times as many, thin and long.
    const base = this.skeleton.lip;
    const many = look.tendrils ?? 0;
    const lip = many
      ? Array.from({ length: many }, (_, i) => {
          const f = (i / (many - 1)) * (base.length - 1);
          const a = base[Math.min(base.length - 2, Math.floor(f))] as (typeof base)[number];
          const b2 = base[Math.min(base.length - 2, Math.floor(f)) + 1] as (typeof base)[number];
          const w = f - Math.min(base.length - 2, Math.floor(f));
          const row = (i % 3) * 0.045;
          return {
            at: [a.at[0] + (b2.at[0] - a.at[0]) * w - row, a.at[1] + (b2.at[1] - a.at[1]) * w + rng.range(-0.02, 0.05) + row * 0.6, a.at[2] + (b2.at[2] - a.at[2]) * w] as V3,
            out: [a.out[0] + (b2.out[0] - a.out[0]) * w + rng.range(-0.45, 0.45), a.out[1] + (b2.out[1] - a.out[1]) * w - rng.range(0, 0.3), a.out[2] + (b2.out[2] - a.out[2]) * w + rng.range(-0.45, 0.45)] as V3,
          };
        })
      : base;
    const at = new Float32Array(lip.length * 3);
    const out = new Float32Array(lip.length * 3);
    const shape = new Float32Array(lip.length * 4);
    lip.forEach((l, i) => {
      at.set(l.at, i * 3);
      out.set(l.out, i * 3);
      const mid = 1 - Math.abs(i / (lip.length - 1) - 0.5) * 0.6;
      if (many) shape.set([rng.range(0.38, 1.05) * mid, (0.014 + 0.01 * rng.next()) * (look.thick ?? 1), rng.next(), rng.next()], i * 4);
      else shape.set([rng.range(0.56, 0.86) * mid * (1 - 0.25 * b.young) * (look.reach ?? 1), (0.042 + 0.016 * rng.next()) * (1 + 0.2 * b.young), rng.next(), rng.next()], i * 4);
    });
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = tube().index;
    geometry.setAttribute('position', tube().getAttribute('position'));
    geometry.setAttribute('iAt', new THREE.InstancedBufferAttribute(at, 3));
    geometry.setAttribute('iOut', new THREE.InstancedBufferAttribute(out, 3));
    geometry.setAttribute('iShape', new THREE.InstancedBufferAttribute(shape, 4));
    geometry.instanceCount = lip.length;
    this.feelerMaterial = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms, uHead: { value: this.head }, uSeconds: { value: 0 }, uSplay: { value: 0.3 }, uCurl: { value: 1 }, uFloor: { value: -1e9 }, uWet: { value: look.wet }, uHang: { value: many ? (look.hang ?? 1) : 0 }, uSalted: { value: look.crust ? 1 : 0 } },
      vertexShader: FEELER_VERTEX,
      fragmentShader: FEELER_FRAGMENT,
    });
    this.feelers = new THREE.Mesh(geometry, this.feelerMaterial);
    this.feelers.frustumCulled = false;
  }

  /** Stand as the Drive says, at `seconds` (for what runs and rakes). */
  pose(d: Drive, seconds: number): Stood {
    const k = this.b.k;
    const sk = this.skeleton;
    const yaw = Math.atan2(-d.dir[1], d.dir[0]);
    this.world.makeRotationY(yaw).scale(va.set(k, k, k * this.b.bulk)).setPosition(d.ox, d.oy, d.oz);
    // The trunk's own motion: pitch about its middle, roll about the ground under it, then the shifts.
    this.trunk
      .makeTranslation(d.surge / k, d.bob / k, d.shift / k)
      .multiply(m.makeRotationX(d.roll))
      .multiply(t1.makeTranslation(0, MID, 0))
      .multiply(m.makeRotationZ(-d.pitch))
      .multiply(t1.makeTranslation(0, -MID, 0));
    const M = this.mats;
    (M[PELVIS] as THREE.Matrix4).copy(this.trunk).multiply(about(t1, sk.joint[BELLY] as V3, m.makeRotationY(-d.bend)));
    (M[BELLY] as THREE.Matrix4).copy(this.trunk).multiply(t1.makeTranslation(0, 0, d.sway / k));
    (M[CHEST] as THREE.Matrix4).copy(this.trunk).multiply(about(t1, sk.joint[CHEST] as V3, m.makeRotationY(d.bend)));
    (M[NECK] as THREE.Matrix4).copy(M[CHEST] as THREE.Matrix4).multiply(about(t1, sk.joint[NECK] as V3, m.makeRotationFromEuler(euler.set(0, d.headYaw * 0.4, -d.headPitch * 0.4, 'YZX'))));
    (M[HEAD] as THREE.Matrix4).copy(M[NECK] as THREE.Matrix4).multiply(about(t1, sk.joint[HEAD] as V3, m.makeRotationFromEuler(euler.set(0, d.headYaw * 0.6, -d.headPitch * 0.6, 'YZX'))));

    for (let l = 0; l < 4; l++) {
      const hind = l % 2 === 0;
      const hip = sk.hip[l] as V3;
      const knee = sk.knee[l] as V3;
      const ankle = sk.ankle[l] as V3;
      const foot = d.feet[l] as [number, number, number];
      // The hip rides on the trunk; the foot is where the gait put it, on the ground.
      const H = va.set(hip[0], hip[1], hip[2]).applyMatrix4(M[hind ? PELVIS : CHEST] as THREE.Matrix4);
      const A = vb.set(foot[0] / k, foot[1] / k + ankle[1], foot[2] / k / this.b.bulk);
      const l1 = Math.hypot(knee[0] - hip[0], knee[1] - hip[1], knee[2] - hip[2]);
      const l2 = Math.hypot(ankle[0] - knee[0], ankle[1] - knee[1], ankle[2] - knee[2]);
      const HA = vc.copy(A).sub(H);
      const far = Math.min(HA.length(), (l1 + l2) * 0.995);
      HA.normalize();
      // A hind knee stands forward of the line from hip to foot and a fore elbow behind it, both a little out from the body.
      const pole = vd.set(hind ? 1 : -1, 0.1, 0.35 * Math.sign(hip[2]));
      pole.addScaledVector(HA, -pole.dot(HA)).normalize();
      const along = (l1 * l1 - l2 * l2 + far * far) / (2 * far);
      const off = Math.sqrt(Math.max(0, l1 * l1 - along * along));
      const K = ve.copy(H).addScaledVector(HA, along).addScaledVector(pole, off);
      A.copy(H).addScaledVector(HA, far);
      const bone = LEG + 3 * l;
      q1.setFromUnitVectors(vc.set(knee[0] - hip[0], knee[1] - hip[1], knee[2] - hip[2]).normalize(), vd.copy(K).sub(H).normalize());
      (M[bone] as THREE.Matrix4).makeRotationFromQuaternion(q1).setPosition(0, 0, 0);
      (M[bone] as THREE.Matrix4).premultiply(t1.makeTranslation(H.x, H.y, H.z)).multiply(t2.makeTranslation(-hip[0], -hip[1], -hip[2]));
      q1.setFromUnitVectors(vc.set(ankle[0] - knee[0], ankle[1] - knee[1], ankle[2] - knee[2]).normalize(), vd.copy(A).sub(K).normalize());
      (M[bone + 1] as THREE.Matrix4).makeRotationFromQuaternion(q1);
      (M[bone + 1] as THREE.Matrix4).premultiply(t1.makeTranslation(K.x, K.y, K.z)).multiply(t2.makeTranslation(-knee[0], -knee[1], -knee[2]));
      // A lifted foot hangs toe down.
      const lift = foot[1] / k;
      (M[bone + 2] as THREE.Matrix4).makeRotationZ(-Math.min(0.7, lift * 2.6));
      (M[bone + 2] as THREE.Matrix4).premultiply(t1.makeTranslation(A.x, A.y, A.z)).multiply(t2.makeTranslation(-ankle[0], -ankle[1], -ankle[2]));
      const f = this.stood.feet[l] as (typeof this.stood.feet)[number];
      va.set(A.x, 0, A.z).applyMatrix4(this.world);
      f.x = va.x;
      f.z = va.z;
      f.lift = foot[1];
    }
    for (let i = 0; i < BONES; i++) {
      m.multiplyMatrices(this.world, M[i] as THREE.Matrix4);
      m.toArray(this.bones, i * 16);
    }
    this.head.multiplyMatrices(this.world, M[HEAD] as THREE.Matrix4);
    const u = this.material.uniforms;
    (u.uBreath as THREE.IUniform<number>).value = 0.022 * d.breath;
    (u.uSeconds as THREE.IUniform<number>).value = seconds;
    const fu = this.feelerMaterial.uniforms;
    (fu.uSeconds as THREE.IUniform<number>).value = seconds;
    (fu.uSplay as THREE.IUniform<number>).value = d.splay;
    (fu.uCurl as THREE.IUniform<number>).value = d.curl[0] ?? 1;
    (fu.uFloor as THREE.IUniform<number>).value = d.floor;

    const s = this.stood;
    va.set(0, 0, 0).applyMatrix4(m.multiplyMatrices(this.world, this.trunk));
    s.x = va.x;
    s.z = va.z;
    s.yaw = yaw;
    va.set(sk.muzzle[0], sk.muzzle[1], sk.muzzle[2]).applyMatrix4(this.head);
    s.muzzle.x = va.x;
    s.muzzle.y = va.y;
    s.muzzle.z = va.z;
    va.set(sk.belly[0], sk.belly[1], sk.belly[2]).applyMatrix4(m.multiplyMatrices(this.world, M[BELLY] as THREE.Matrix4));
    s.belly.x = va.x;
    s.belly.y = va.y;
    s.belly.z = va.z;
    return s;
  }

  dispose(): void {
    this.material.dispose();
    this.feelerMaterial.dispose();
    this.feelers.geometry.dispose();
  }
}
