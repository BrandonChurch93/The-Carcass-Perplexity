// One kite-wing: a pale long-legged flier with a tuft of tendrils where a head would be. The body is a handful of tubes and two ribbed sails,
// stored as (along, around, which) and posed in the vertex shader from a few numbers per animal, so a thousand stand, wade and fly from the
// time alone. The drowned one is the same animal, limp.
import * as THREE from 'three';
import { RIG_GLSL } from '../shared/glsl';
import type { Context } from '../shared/context';

/** The pose of one animal. Lengths are metres at size 1; angles are radians. */
export interface Pose {
  /** The hip in the world. */
  x: number;
  y: number;
  z: number;
  /** Heading: 0 faces +z, a quarter turn faces +x. */
  yaw: number;
  size: number;
  /** Body tilt: 0 stands, negative tips the chest down. */
  pitch: number;
  /** 0 the sails are shut along the flanks, 1 they are open. */
  spread: number;
  /** The stroke of the sails: 0 level, positive up. */
  flap: number;
  /** The neck: angle it leaves the body at over the level, how far it bends over its length (negative down), how far it swings aside. */
  rise: number;
  bend: number;
  sweep: number;
  /** An S in the neck. */
  tuck: number;
  /** Feet from the hip: forward and up (negative is down). */
  leftZ: number;
  leftY: number;
  rightZ: number;
  rightY: number;
  roll: number;
  /** The outer sail trails the stroke by this. */
  lag: number;
  /** 0 to 1, one animal's own tint and tuft. */
  seed: number;
}

export const LEG = 1.66;
export const STAND = 1.56;

export const stand = (seed = 0): Pose => ({ x: 0, y: 0, z: 0, yaw: 0, size: 1, pitch: 0, spread: 0, flap: -1.25, rise: 1.32, bend: -0.2, sweep: 0, tuck: 0.3, leftZ: 0, leftY: -STAND, rightZ: 0, rightY: -STAND, roll: 0, lag: 0, seed });

const KEYS: (keyof Pose)[] = ['x', 'y', 'z', 'yaw', 'size', 'pitch', 'spread', 'flap', 'rise', 'bend', 'sweep', 'tuck', 'leftZ', 'leftY', 'rightZ', 'rightY', 'roll', 'lag'];

/** Blend b into a by k, in place. */
export function blend(a: Pose, b: Partial<Pose>, k: number): Pose {
  for (const key of KEYS) {
    const to = b[key];
    if (to !== undefined) a[key] += (to - a[key]) * k;
  }
  return a;
}

export interface Detail {
  around: number;
  along: number;
  tendrils: number;
  toes: boolean;
  sail: [number, number];
}

export const NEAR: Detail = { around: 14, along: 1, tendrils: 44, toes: true, sail: [12, 30] };
export const FAR: Detail = { around: 5, along: 0.34, tendrils: 9, toes: false, sail: [3, 10] };

/** The parts of one animal as grids of (along, around, which), with the part number beside. */
export function animalGeometry(detail: Detail): THREE.BufferGeometry {
  const at: number[] = [];
  const part: number[] = [];
  const index: number[] = [];
  const grid = (which: number, id: number, ns: number, na: number, turn: boolean): void => {
    const first = at.length / 3;
    for (let i = 0; i <= ns; i++) {
      for (let j = 0; j <= na; j++) {
        at.push(i / ns, turn ? (j / na) * Math.PI * 2 : j / na, id);
        part.push(which);
      }
    }
    for (let i = 0; i < ns; i++) {
      for (let j = 0; j < na; j++) {
        const a = first + i * (na + 1) + j;
        const b = a + na + 1;
        index.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  };
  const n = (count: number): number => Math.max(2, Math.round(count * detail.along));
  grid(0, 0, n(14), detail.around + 2, true);
  grid(1, 0, n(22), detail.around, true);
  for (let k = 0; k < detail.tendrils; k++) grid(2, k, n(7), Math.max(3, detail.around >> 2), true);
  for (const leg of [3, 4]) {
    grid(leg, 0, n(6), Math.max(4, detail.around - 4), true);
    grid(leg, 1, n(6), Math.max(4, detail.around - 6), true);
    if (detail.toes) for (let k = 0; k < 4; k++) grid(leg, 2 + k, 3, 5, true);
  }
  for (const sail of [5, 6]) grid(sail, 0, detail.sail[0], detail.sail[1], false);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(at, 3));
  geometry.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  geometry.setIndex(index);
  return geometry;
}

const POSE_GLSL = /* glsl */ `
attribute vec4 aPlace;
attribute vec4 aBody;
attribute vec4 aNeck;
attribute vec4 aFeet;
attribute vec4 aMore;
attribute float aPart;
uniform float uDead;
const float PI = 3.14159265;
const float NECK = 1.5;
const float THIGH = 0.8;
const float SHANK = 0.86;
const float SPAN = 2.5;
const float SPARS = 5.0;

vec3 bodyAxis() {
  float p = 0.32 + aBody.y;
  return vec3(0.0, sin(p), cos(p));
}
vec3 neckDir(float s) {
  float th = aNeck.x + aNeck.y * (0.35 * s + 0.65 * s * s) + aMore.z * cos(PI * s);
  float ps = aNeck.z * s * s;
  float c = cos(th);
  return vec3(sin(ps) * c, sin(th), cos(ps) * c);
}
vec3 neckAt(float s, vec3 base) {
  vec3 p = base;
  float h = s / 8.0;
  for (int i = 0; i < 8; i++) p += neckDir((float(i) + 0.5) * h) * (h * NECK);
  return p;
}
vec3 ring(vec3 c, vec3 t, vec3 side, float r, float a) {
  vec3 other = normalize(cross(t, side));
  return c + r * (cos(a) * side + sin(a) * other);
}
vec3 anySide(vec3 t) {
  vec3 ref = abs(t.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  return normalize(cross(ref, t));
}
float knob(float s, float at, float wide) {
  float d = (s - at) / wide;
  return exp(-d * d);
}

// A point of the animal about its hip: x right, y up, z ahead. s runs along a part, a around it (or across a sail), id picks one of several.
vec3 animalAt(float part, float s, float a, float id) {
  vec3 d = bodyAxis();
  vec3 nb = vec3(0.0, d.z, -d.y);
  vec3 X = vec3(1.0, 0.0, 0.0);
  if (part < 0.5) {
    float r = 0.235 * pow(max(sin(PI * pow(s, 0.8)), 0.0), 0.65);
    // The drowned one is sunk in on its ribs.
    r *= 1.0 - uDead * (0.3 + 0.1 * sin(s * 47.0) * smoothstep(0.25, 0.4, s) * (1.0 - smoothstep(0.75, 0.9, s)) * abs(cos(a)));
    float deep = 1.0 + 0.25 * max(-sin(a), 0.0) * smoothstep(0.15, 0.8, s);
    return d * ((s - 0.5) * 0.95) + r * (cos(a) * 0.8 * X + sin(a) * deep * nb);
  }
  vec3 base = d * 0.36 + nb * 0.1;
  if (part < 1.5) {
    vec3 t = neckDir(s);
    float ps = aNeck.z * s * s;
    // A thin neck, the bones of it standing through the skin.
    float r = mix(0.1, 0.042, pow(s, 0.7)) + 0.075 * exp(-s * 9.0) + 0.02 * knob(s, 0.965, 0.05);
    r *= 1.0 + 0.16 * pow(abs(sin(s * 34.0)), 5.0) * smoothstep(0.08, 0.2, s);
    r *= 1.0 - smoothstep(0.985, 1.0, s) * 0.6;
    return ring(neckAt(s, base), t, vec3(cos(ps), 0.0, -sin(ps)), r, a);
  }
  if (part < 2.5) {
    vec3 tip = neckAt(1.0, base);
    vec3 t1 = neckDir(1.0);
    vec3 sideN = vec3(cos(aNeck.z), 0.0, -sin(aNeck.z));
    vec3 upN = normalize(cross(t1, sideN));
    float az = id * 2.39996 + aNeck.w * 6.28;
    float fan = 0.06 + 0.42 * fract(id * 0.618 + aNeck.w);
    vec3 dir = normalize(t1 + fan * (cos(az) * sideN + sin(az) * upN));
    float len = 0.7 + 0.6 * fract(id * 0.381 + aNeck.w * 3.0);
    float sway = 0.09 * sin(uTime * 1.7 + id * 2.1 + aNeck.w * 40.0) + 0.05 * sin(uTime * 4.1 + id * 3.7);
    vec3 c = tip + len * (dir * s + vec3(sway * s * s, -0.75 * s * s, 0.6 * sway * s * s));
    vec3 t = normalize(dir + vec3(2.0 * sway * s, -1.5 * s, 1.2 * sway * s));
    float r = mix(0.03, 0.008, s) + 0.006 * knob(s, 0.94, 0.05);
    return ring(c, t, anySide(t), r, a);
  }
  if (part < 4.5) {
    float sg = part < 3.5 ? -1.0 : 1.0;
    vec3 hip = vec3(sg * 0.12, -0.12, -0.05);
    vec2 f = sg < 0.0 ? aFeet.xy : aFeet.zw;
    vec2 dv = vec2(f.x, f.y) - hip.zy;
    float full = max(length(dv), 1e-3);
    vec2 u = dv / full;
    float l = min(full, (THIGH + SHANK) * 0.998);
    float ca = clamp((THIGH * THIGH + l * l - SHANK * SHANK) / (2.0 * THIGH * l), -1.0, 1.0);
    float sa = sqrt(1.0 - ca * ca);
    vec2 w = vec2(u.y, -u.x);
    vec2 kn = hip.zy + THIGH * (ca * u + sa * w);
    vec3 knee = vec3(sg * 0.125, kn.y, kn.x);
    vec2 ft = hip.zy + l * u;
    vec3 foot = vec3(sg * 0.13, ft.y, ft.x);
    if (id < 0.5) {
      vec3 t = normalize(knee - hip);
      float r = mix(0.085, 0.03, smoothstep(0.0, 0.55, s)) + 0.014 * knob(s, 1.0, 0.07);
      return ring(mix(hip, knee, s), t, X, r, a);
    }
    if (id < 1.5) {
      vec3 t = normalize(foot - knee);
      float r = 0.024 + 0.02 * knob(s, 0.0, 0.06) + 0.012 * knob(s, 1.0, 0.05);
      return ring(mix(knee, foot, s), t, X, r, a);
    }
    float k = id - 2.0;
    float ang = k < 2.5 ? (k - 1.0) * 0.6 : PI;
    float len = k < 2.5 ? 0.24 - 0.04 * abs(k - 1.0) : 0.1;
    vec3 t = vec3(sin(ang), 0.0, cos(ang));
    return ring(foot + vec3(0.0, 0.014, 0.0) + t * (len * s), t, vec3(t.z, 0.0, -t.x), mix(0.02, 0.007, s), a);
  }
  float sg = part < 5.5 ? -1.0 : 1.0;
  vec3 sh = d * 0.22 + nb * 0.2 + X * (sg * 0.15);
  // Over 1 the sails are a tent: fanned full but hung down round the body, drawn in short.
  float tent = clamp((aBody.z - 1.4) / 0.6, 0.0, 1.0);
  float spread = min(aBody.z, 1.0);
  // A folded sail hangs by its own weight, not by the tilt of the body: lean the fold back to level as the body tips.
  float lean = aBody.y * (1.0 - spread) * 0.5;
  vec3 dl = d * cos(lean) - nb * sin(lean);
  vec3 nl = nb * cos(lean) + d * sin(lean);
  float phi = mix(mix(-1.36, -0.98, a), mix(0.42, -1.3, a), spread);
  float reach = mix(0.52, 1.0, spread) * SPAN * mix(1.0, mix(0.8, 0.62, spread), a * a) * mix(1.0, 0.62, tent);
  float web = abs(sin(PI * a * SPARS));
  float along = s * reach * (1.0 - 0.14 * s * s * web * mix(0.8, 1.0, spread));
  float ang = aBody.w * (0.4 + 0.6 * s) + aMore.w * s * s;
  vec3 outw = X * (sg * cos(ang)) + nl * sin(ang);
  vec3 nrm = -X * (sg * sin(ang)) + nl * cos(ang);
  float fold = (1.0 - spread) * (0.07 * sqrt(s) * cos(2.0 * PI * a * SPARS) + 0.3 * sqrt(sin(PI * clamp(s * 1.1, 0.0, 1.0)) + 1e-4)) + spread * 0.05 * sin(PI * s) * (1.0 - a) + 0.012 * web * spread + tent * 0.05 * sqrt(s) * cos(2.0 * PI * a * SPARS);
  return sh + along * (cos(phi) * outw + sin(phi) * dl) + nrm * fold;
}

vec3 animalToWorld(vec3 p) {
  float cr = cos(aMore.x);
  float sr = sin(aMore.x);
  p = vec3(p.x * cr - p.y * sr, p.x * sr + p.y * cr, p.z) * aBody.x;
  float cy = cos(aPlace.w);
  float sy = sin(aPlace.w);
  return aPlace.xyz + vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
}`;

export const ANIMAL_VERTEX = /* glsl */ `
uniform float uTime;
${POSE_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vSkin;
varying vec3 vLocal;
varying vec2 vSeed;
varying float vOpen;
void main() {
  float turn = aPart > 4.5 ? 0.012 : 0.07;
  vec3 p = animalAt(aPart, position.x, position.y, position.z);
  float ds = position.x > 0.5 ? -0.012 : 0.012;
  vec3 ps = (animalAt(aPart, position.x + ds, position.y, position.z) - p) * sign(ds);
  vec3 pa = animalAt(aPart, position.x, position.y + turn, position.z) - p;
  vec3 n = cross(pa, ps);
  float l = length(n);
  n = l > 1e-9 ? n / l : normalize(ps);
  vLocal = p;
  vec3 w = animalToWorld(p);
  vNormal = normalize(animalToWorld(p + n * 0.01) - w);
  vWorld = w;
  vSkin = vec4(aPart, position.x, position.y, position.z);
  vSeed = vec2(aNeck.w, aBody.x);
  vOpen = aBody.z > 1.4 ? 0.0 : min(aBody.z, 1.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

export const ANIMAL_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tHide;
uniform float uPool;
uniform float uDead;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vSkin;
varying vec3 vLocal;
varying vec2 vSeed;
varying float vOpen;
const float PI = 3.14159265;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float part = vSkin.x;
  float s = vSkin.y;
  float a = vSkin.z;
  bool sail = part > 4.5;
  if (sail && dot(n, v) < 0.0) n = -n;
  // The hide: one picture laid along each part.
  vec2 uv = sail ? vec2(s * 1.3, a * 1.1) : vec2(s * (part < 0.5 ? 0.9 : part < 1.5 ? 1.6 : 0.8), a / 6.2832 * (part < 0.5 ? 1.0 : 0.3));
  vec3 hide = texture2D(tHide, uv + vSeed.x * 7.0).rgb;
  float grain = dot(hide, vec3(0.3333));
  float tone = clamp(0.35 + 0.65 * grain / 0.065, 0.5, 1.45);
  // Close to, the hide is creased and pored: the same picture laid fine.
  vec3 fine = texture2D(tHide, uv * vec2(7.0, 5.0) + vSeed.x * 3.0).rgb;
  float fineG = dot(fine, vec3(0.3333));
  float crease = clamp(0.5 + 0.5 * fineG / 0.065, 0.55, 1.4);
  if (!sail) {
    tone *= crease;
    n = normalize(n + 5.0 * (fine - fineG) + 0.1 * vec3(0.0, sin(s * 160.0 + 30.0 * grain), 0.0));
  }
  vec3 ivory = mix(vec3(0.5, 0.485, 0.45), vec3(0.64, 0.62, 0.575), vSeed.x);
  vec3 albedo = ivory;
  // Wet: they live in the spray, and the sky lies along every back.
  float rough = 0.24;
  float occ = 1.0;
  if (part < 0.5) {
    float belly = smoothstep(-0.2, -0.9, sin(a));
    albedo = mix(ivory * vec3(0.9, 0.88, 0.9), ivory * vec3(1.12, 1.02, 0.98), belly);
    // Bare and thin over the breast: the blood shows through.
    albedo = mix(albedo, vec3(0.6, 0.45, 0.42), 0.35 * smoothstep(0.55, 0.9, s) * (0.5 + 0.5 * crease));
    albedo *= mix(0.78, 1.0, smoothstep(0.0, 0.3, s));
    occ = mix(0.62, 1.0, smoothstep(-0.8, 0.3, n.y));
    // The frame shows through: ribs down each flank, the keel of the breast, the knobs of the spine along the back.
    float flank = 1.0 - abs(sin(a));
    float cage = smoothstep(0.3, 0.42, s) * smoothstep(0.88, 0.72, s);
    float ribs = 0.5 + 0.5 * cos(s * 52.0 + 2.5 * sin(a));
    float between = cage * (0.35 + 0.65 * flank) * (1.0 - ribs);
    albedo *= 1.0 - 0.38 * between;
    occ *= 1.0 - 0.45 * between;
    float spine = smoothstep(0.93, 1.0, sin(a)) * (0.5 + 0.5 * cos(s * 90.0));
    albedo = mix(albedo, ivory * 1.25, 0.5 * spine + 0.35 * cage * (0.35 + 0.65 * flank) * smoothstep(0.75, 1.0, ribs));
  } else if (part < 1.5) {
    albedo = mix(ivory, vec3(0.42, 0.37, 0.33), smoothstep(0.8, 1.0, s));
    albedo *= 0.9 + 0.1 * sin(s * 150.0);
  } else if (part < 2.5) {
    albedo = mix(vec3(0.4, 0.34, 0.3), vec3(0.72, 0.68, 0.6), smoothstep(0.05, 0.9, s));
    rough = 0.4;
  } else if (part < 4.5) {
    float scale = 0.85 + 0.15 * sin(s * (vSkin.w < 0.5 ? 60.0 : 110.0));
    albedo = mix(vec3(0.42, 0.39, 0.35), vec3(0.3, 0.27, 0.24), vSkin.w < 1.5 ? smoothstep(0.2, 1.0, s) * step(0.5, vSkin.w) : 1.0) * scale;
    occ = mix(0.7, 1.0, smoothstep(0.0, 0.5, s + vSkin.w));
    rough = 0.5;
  } else {
    float spar = abs(sin(PI * a * 5.0));
    float bone = 1.0 - smoothstep(0.0, 0.16, spar);
    vec3 skin = mix(vec3(0.56, 0.54, 0.49), vec3(0.68, 0.65, 0.59), vSeed.x);
    // Each panel between two spars is a worn sheet: paler along the spar, stained toward its lower edge, veined.
    float panel = fract(a * 5.0);
    skin *= 0.78 + 0.3 * panel;
    skin *= 0.86 + 0.14 * sin(s * 90.0 + 6.0 * hide.r * 12.0);
    albedo = mix(skin, vec3(0.3, 0.27, 0.24), bone * 0.8);
    float edge = smoothstep(0.72, 1.0, s);
    albedo = mix(albedo, vec3(0.6, 0.36, 0.16), edge * 0.5);
    // Folded, the skin lies layer on layer: dull orange brown, dark, the light no longer through it.
    albedo = mix(mix(vec3(0.5, 0.42, 0.33), vec3(0.66, 0.27, 0.06), smoothstep(0.3, 0.95, s)) * (0.6 + 0.55 * panel), albedo, smoothstep(0.15, 0.7, vOpen));
    n = normalize(n + 0.25 * (hide - grain));
    rough = 0.4;
  }
  albedo *= tone;
  // Legs that stand in a pool are dark and wet to just over the water.
  float wetLeg = (1.0 - smoothstep(uPool + 0.02, uPool + 0.3, vWorld.y)) * step(2.5, part) * step(part, 4.5);
  albedo *= 1.0 - 0.45 * wetLeg;
  rough = mix(rough, 0.2, wetLeg);
  // The drowned one: grey, sodden, the hide gone in patches to what is under it.
  if (uDead > 0.5) {
    float rot = smoothstep(0.16, 0.3, texture2D(tHide, uv * 0.37 + 0.3).g);
    albedo = mix(vec3(0.2, 0.09, 0.08), mix(vec3(0.5, 0.47, 0.44), vec3(0.33, 0.36, 0.3), texture2D(tHide, uv * 0.21).r * 3.0) * tone, rot);
    rough = mix(0.25, 0.45, rot);
  }
  vec3 col = rigShade(vWorld, n, v, albedo, rough, occ);
  if (sail) {
    // Light comes through the stretched skin of a sail.
    vec4 land = landAt(vWorld.xz);
    col += albedo * vec3(1.1, 0.93, 0.76) * smoothstep(0.15, 0.7, vOpen) * (uSunColour * max(dot(-n, uSunDir), 0.0) * sunAt(vWorld, land) * 0.6 + skyIrradiance(-n) * 0.5) / PI;
  }
  // An open sail is bone pale: what colour it has is at its edge.
  if (sail) col = mix(col, vec3(dot(col, vec3(0.3, 0.6, 0.1))) * vec3(1.04, 1.0, 0.94), 0.7 * smoothstep(0.15, 0.7, vOpen) * (1.0 - 0.6 * smoothstep(0.72, 1.0, s))) * mix(0.62, 1.2, smoothstep(0.15, 0.7, vOpen));
  gl_FragColor = vec4(rigOut(col), 1.0);
}`;

export function animalMaterial(ctx: Context, pool: number, dead = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: ANIMAL_VERTEX,
    fragmentShader: ANIMAL_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      tHide: { value: ctx.assets.texture('wings/hide.jpg', { kind: 'colour' }) },
      uPool: { value: pool },
      uDead: { value: dead ? 1 : 0 },
    },
    side: THREE.DoubleSide,
  });
}

/** Many animals of one detail, each placed by a pose. */
export class Flock {
  readonly mesh: THREE.Mesh;
  private readonly place: THREE.InstancedBufferAttribute;
  private readonly body: THREE.InstancedBufferAttribute;
  private readonly neck: THREE.InstancedBufferAttribute;
  private readonly feet: THREE.InstancedBufferAttribute;
  private readonly more: THREE.InstancedBufferAttribute;

  constructor(detail: Detail, material: THREE.ShaderMaterial, readonly count: number) {
    const shape = animalGeometry(detail);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', shape.getAttribute('position'));
    geometry.setAttribute('aPart', shape.getAttribute('aPart'));
    geometry.setIndex(shape.getIndex());
    geometry.instanceCount = count;
    const attribute = (name: string): THREE.InstancedBufferAttribute => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
      a.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, a);
      return a;
    };
    this.place = attribute('aPlace');
    this.body = attribute('aBody');
    this.neck = attribute('aNeck');
    this.feet = attribute('aFeet');
    this.more = attribute('aMore');
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
  }

  put(i: number, p: Pose): void {
    this.place.setXYZW(i, p.x, p.y, p.z, p.yaw);
    this.body.setXYZW(i, p.size, p.pitch, p.spread, p.flap);
    this.neck.setXYZW(i, p.rise, p.bend, p.sweep, p.seed);
    this.feet.setXYZW(i, p.leftZ, p.leftY, p.rightZ, p.rightY);
    this.more.setXYZW(i, p.roll, 0, p.tuck, p.lag);
  }

  /** Put an animal out of sight. */
  hide(i: number): void {
    this.place.setXYZW(i, 0, -500, 0, 0);
    this.body.setXYZW(i, 0, 0, 0, 0);
  }

  commit(): void {
    this.place.needsUpdate = true;
    this.body.needsUpdate = true;
    this.neck.needsUpdate = true;
    this.feet.needsUpdate = true;
    this.more.needsUpdate = true;
  }
}
