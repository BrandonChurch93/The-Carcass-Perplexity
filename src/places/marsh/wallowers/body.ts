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
uniform float uSeed;
uniform float uNear;
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
  float side = smoothstep(0.06, 0.3, abs(nr.z)) * cover;
  vec3 pic = texture2D(tPic, uv).rgb;
  vec2 e = vec2(2.0 / 1774.0, 2.0 / 887.0);
  float l0 = dot(pic, LUMA);
  float lx = dot(texture2D(tPic, uv + vec2(e.x, 0.0)).rgb, LUMA);
  float ly = dot(texture2D(tPic, uv + vec2(0.0, e.y)).rgb, LUMA);
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

  // The slope of the skin: from the light and dark of the picture on the flanks (a crease is dark), from the tile elsewhere, and the tile's grain over all near the lens.
  float tile = mix(1.2, 0.45 * uNear, side);
  vec2 sx = (hx.rg - 0.5) * tile;
  vec2 sy = (hy.rg - 0.5) * tile;
  vec2 sz = (hz.rg - 0.5) * tile;
  vec3 bump = w.x * vec3(0.0, sx.y, sx.x) + w.y * vec3(sy.x, 0.0, sy.y) + w.z * vec3(sz.x, sz.y, 0.0);
  vec2 slope = vec2(lx - l0, ly - l0) / (l0 + 0.04);
  // In the picture u runs from the muzzle back and v up.
  bump += vec3(slope.x, -slope.y, 0.0) * 1.6 * side;
  vec3 nb = normalize(nr - (bump - nr * dot(bump, nr)) * (1.0 - 0.7 * horn));
  mat3 r = mat3(vR0, vR1, vR2);
  vec3 ng = normalize(r * nr);
  vec3 n = normalize(r * nb);
  vec3 v = normalize(cameraPosition - vWorld);

  float patchy = vnoise3(q * 1.7 + uSeed);
  float grain = 0.5 + (height - 0.5) * (1.0 - side) + (l0 / (dot(soft.rgb, LUMA) / max(soft.a, 0.3) + 0.02) - 1.0) * 0.5 * side;
  // Dry salt blooms on what looks at the sky and stands out of the creases.
  float dry = clamp(uSalt, 0.0, 1.0);
  float dust = dry * smoothstep(0.1, 0.8, ng.y) * smoothstep(0.4, 0.75, grain + 0.3 * (patchy - 0.5)) * (1.0 - horn);

  // Wet: what has been under the brine is dark and red and shines. The line is ragged, and the brine still runs from it in threads.
  float lane = vnoise(vec2(q.x * 7.0 + q.z * 5.0, uSeed));
  float thread = smoothstep(0.5, 0.8, vnoise(vec2((q.x + q.z) * 31.0, vWorld.y * 1.3 - uSeconds * 0.3) + uSeed * 9.0));
  float ragged = 0.45 * (patchy - 0.5) + 0.22 * (lane - 0.5) + 0.12 * (grain - 0.5);
  float wet = 1.0 - smoothstep(uWet - 0.1 + ragged, uWet + 0.06 + ragged, vWorld.y);
  float damp = 1.0 - smoothstep(uWet + ragged, uWet + 0.35 + ragged + 0.25 * lane, vWorld.y);
  dust *= 1.0 - damp;
  albedo = mix(albedo, vec3(0.21, 0.18, 0.155) * (0.7 + 0.5 * grain), 0.45 * dust);
  // The stuck one is plastered with the grey mud it lies in: wet and dark below, drying pale and cracking on the back.
  float smear = uMudded * smoothstep(0.3, 0.6, patchy + 0.5 * damp + 0.3 * (1.0 - grain));
  albedo = mix(albedo, mix(vec3(0.13, 0.115, 0.1), vec3(0.05, 0.043, 0.038), damp) * (0.6 + 0.6 * grain), 0.85 * smear);
  // The claws: old ivory, grooved, stained at the root.
  vec3 ivory = vec3(0.15, 0.115, 0.08) * (0.7 + 0.5 * height) * mix(vec3(1.0), tone, 0.35);
  albedo = mix(albedo, mix(ivory, albedo * 1.3, 0.5 * side), horn);
  albedo = mix(albedo, albedo * vec3(0.72, 0.52, 0.45), damp * (1.0 - wet) * (1.0 - uMudded));
  vec3 soaked = mix(albedo * vec3(0.5, 0.26, 0.2) + vec3(0.012, 0.002, 0.001), albedo * 0.55, uMudded);
  albedo = mix(albedo, soaked, wet);
  albedo = mix(albedo, albedo * vec3(0.6, 0.36, 0.3), 0.6 * thread * damp * (1.0 - wet));
  // Thick mud on whatever stands in it.
  float deep = 1.0 - smoothstep(0.02, 0.2 + 0.25 * lane, vWorld.y);
  albedo = mix(albedo, mix(vec3(0.05, 0.014, 0.01), vec3(0.05, 0.043, 0.038), uMudded) * (0.7 + 0.6 * grain), 0.8 * deep);

  float rough = mix(0.93, 0.42, max(wet, 0.7 * thread * damp));
  rough = mix(rough, 0.34, deep);
  rough = mix(rough, 0.6, horn * (1.0 - deep));
  rough = mix(rough, 1.0, 0.7 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0));
  // What a fold hides from the sky, and what the body hides from it: the belly, the throat, the insides of the legs. The picture brings its own shade.
  float occ = (0.55 + 0.45 * smoothstep(0.0, 0.85, fold)) * (0.5 + 0.5 * smoothstep(-0.95, 0.25, ng.y)) * mix(crease, 1.0, side);
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
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLook;
void main() {
  float s = position.x;
  float a = iShape.z * 40.0;
  // Each rakes to its own time: curled, then flicked out.
  float curl = max(0.15, uCurl + 0.28 * sin(uSeconds * (2.1 + 1.9 * fract(a)) + a) + 0.1 * sin(uSeconds * 5.3 + a * 2.3));
  vec3 dir = normalize(iOut + vec3(0.5, 0.35, 0.0) * uSplay);
  vec3 c = vec3(-0.75, -1.0, -0.4 * iOut.z);
  vec3 bend = normalize(c - dir * dot(c, dir));
  float t = curl * s;
  vec3 centre = iAt + iShape.x * ((sin(t) / curl) * dir + ((1.0 - cos(t)) / curl) * bend);
  vec3 tangent = cos(t) * dir + sin(t) * bend;
  vec3 n1 = -sin(t) * dir + cos(t) * bend;
  vec3 n2 = cross(tangent, n1);
  // Thick where it leaves the lip, a long taper, a blunt tip.
  float radius = iShape.y * (0.16 + 0.84 * pow(1.0 - s, 0.8)) * (1.0 + 0.12 * sin(s * 23.0 + a));
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
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float s = vLook.x;
  // Old ivory: grooved along its length, ringed where it grew, stained dark at the root and red where it has been in the mud.
  float groove = vnoise(vec2(vLook.y * 3.0 + vLook.z * 9.0, s * 2.0));
  float ring = vnoise(vec2(s * 46.0 + vLook.z * 5.0, vLook.y * 0.7));
  vec3 albedo = vec3(0.125, 0.092, 0.06) * (0.62 + 0.3 * groove + 0.2 * ring);
  albedo = mix(albedo, vec3(0.05, 0.03, 0.022), 0.75 * (1.0 - smoothstep(0.0, 0.16, s)));
  float wet = 1.0 - smoothstep(uWet - 0.05, uWet + 0.12 + 0.1 * groove, vWorld.y);
  albedo = mix(albedo, albedo * vec3(0.6, 0.3, 0.22) + vec3(0.008, 0.001, 0.001), 0.8 * wet);
  albedo = mix(albedo, vec3(0.05, 0.018, 0.012), 0.5 * smoothstep(0.75, 1.0, s));
  float rough = mix(0.6, 0.36, wet);
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
    const hide = hideOf(b.young > 0.5 ? 1 : 0, 1, look.cell * (b.young > 0.5 ? 1.8 : 1));
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
        uSeed: { value: seed },
        uNear: { value: look.relief ? 1 : 0.4 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
    });
    this.mesh = new THREE.Mesh(hide.geometry, this.material);
    this.mesh.frustumCulled = false;

    const lip = this.skeleton.lip;
    const at = new Float32Array(lip.length * 3);
    const out = new Float32Array(lip.length * 3);
    const shape = new Float32Array(lip.length * 4);
    const rng = ctx.rng(`wallower-feelers-${seed.toFixed(3)}`);
    lip.forEach((l, i) => {
      at.set(l.at, i * 3);
      out.set(l.out, i * 3);
      const mid = 1 - Math.abs(i / (lip.length - 1) - 0.5) * 0.6;
      shape.set([rng.range(0.42, 0.78) * mid * (1 - 0.25 * b.young), rng.range(0.03, 0.043) * (1 + 0.2 * b.young), rng.next(), rng.next()], i * 4);
    });
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = tube().index;
    geometry.setAttribute('position', tube().getAttribute('position'));
    geometry.setAttribute('iAt', new THREE.InstancedBufferAttribute(at, 3));
    geometry.setAttribute('iOut', new THREE.InstancedBufferAttribute(out, 3));
    geometry.setAttribute('iShape', new THREE.InstancedBufferAttribute(shape, 4));
    geometry.instanceCount = lip.length;
    this.feelerMaterial = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms, uHead: { value: this.head }, uSeconds: { value: 0 }, uSplay: { value: 0.3 }, uCurl: { value: 1 }, uFloor: { value: -1e9 }, uWet: { value: look.wet } },
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
