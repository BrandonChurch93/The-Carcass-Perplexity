// The dead of the thin crust: wallowers that broke through, sank to the belly and were kept by the salt. And one that is still alive in it.
import * as THREE from 'three';
import { DEAD, STUCK, TAU, rel, relYaw } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { newDrive } from '../wallowers/animal';
import { Beast } from '../wallowers/body';
import { mudWallow } from './mud';

export const PARTS: readonly string[] = ['dead'];

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// What the salt has finished with is a mound of it: a low dome of knobs, pink at its foot, with crumbs of salt lying round it. One stands alone
// (the oldest of the dead) and one lies under each kept body as the apron it has grown.
const DOME_GLSL = /* glsl */ `
uniform sampler2D tSaltNh;
uniform vec4 uDome;
uniform vec4 uLumps;
uniform vec2 uTurn;
float domeAt(vec2 xz, float level) {
  vec2 d = xz - uDome.xy;
  vec2 q = vec2(d.x * uTurn.x + d.y * uTurn.y, -d.x * uTurn.y + d.y * uTurn.x) * vec2(1.0, uLumps.y);
  float r = length(q) / uDome.z;
  float body = pow(max(0.0, 1.0 - r * r), 1.4);
  // A second, lower hump leans on the first: no mound of it is round.
  vec2 q2 = q - uLumps.zw * uDome.z;
  float r2 = length(q2) / (0.6 * uDome.z);
  body += 0.55 * pow(max(0.0, 1.0 - r2 * r2), 1.4) * (1.0 - 0.6 * body);
  // The height of the salt picture is needles at its finest: the mound takes only its broad lumps, the needles are left to the light.
  float knobs = textureLod(tSaltNh, xz * 0.3 + uLumps.x, level + 3.0).b;
  float fine = textureLod(tSaltNh, xz * 0.9 + uLumps.x * 1.7, level + 2.0).b;
  float skirt = smoothstep(1.45, 0.7, r);
  return uDome.w * body * (0.8 + 0.4 * knobs) + skirt * ((knobs - 0.42) * 0.1 + (fine - 0.4) * 0.05);
}`;

const DOME_VERTEX = /* glsl */ `
varying vec3 vWorld;
${DOME_GLSL}
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  world.y += domeAt(world.xz, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const DOME_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform sampler2D tSalt;
uniform float uGround;
${NOISE_GLSL}
${RIG_GLSL}
${DOME_GLSL}
const vec3 RIME_MEAN = vec3(0.389, 0.306, 0.282);
void main() {
  vec2 xz = vWorld.xz;
  float e = 0.02;
  float hx = domeAt(xz + vec2(e, 0.0), 1.5) - domeAt(xz - vec2(e, 0.0), 1.5);
  float hz = domeAt(xz + vec2(0.0, e), 1.5) - domeAt(xz - vec2(0.0, e), 1.5);
  vec3 wideN = texture2D(tSaltNh, xz * 0.55 + uLumps.x).rgb;
  vec3 fineN = texture2D(tSaltNh, xz * 1.9 + uLumps.x * 1.7).rgb;
  vec3 n = normalize(vec3(-hx / (2.0 * e) - (fineN.r - 0.5) * 0.9, 1.0, -hz / (2.0 * e) - (fineN.g - 0.5) * 0.9));
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 wide = texture2D(tSalt, xz * 0.55 + uLumps.x).rgb / RIME_MEAN;
  vec3 fine = texture2D(tSalt, xz * 1.9 + uLumps.x * 1.7).rgb / RIME_MEAN;
  float knob = 0.6 * wideN.b + 0.4 * fineN.b;
  // Near the lens the grains of it show: the same salt again, a hand across.
  vec3 grainN = texture2D(tSaltNh, xz * 6.3 + uLumps.x * 0.7).rgb;
  vec3 grainC = texture2D(tSalt, xz * 6.3 + uLumps.x * 0.7).rgb / RIME_MEAN;
  float nearBy = 1.0 - smoothstep(4.0, 12.0, length(cameraPosition - vWorld));
  n = normalize(n - vec3(grainN.r - 0.5, 0.0, grainN.g - 0.5) * 1.3 * nearBy);
  vec3 albedo = vec3(0.345, 0.305, 0.288) * mix(mix(wide, fine, 0.5), grainC, 0.45 * nearBy) * (0.74 + 0.4 * mix(knob, grainN.b, 0.5 * nearBy));
  // The brine wicks up into the foot of it, and what ran out of the body it grew on still stains it.
  float above = vWorld.y - uGround;
  float stain = (1.0 - smoothstep(0.0, 0.22, above + 0.14 * (vnoise(xz * 3.0 + uLumps.x) - 0.5))) * (0.45 + 0.55 * vnoise(xz * 1.3 + uLumps.x * 2.0));
  albedo = mix(albedo, albedo * vec3(0.78, 0.47, 0.43), 0.75 * stain);
  float occ = (0.55 + 0.45 * smoothstep(0.2, 0.6, knob)) * (0.7 + 0.3 * smoothstep(0.0, 0.15, above));
  vec3 c = rigShade(vWorld, n, v, albedo, mix(0.96, 0.6, 0.5 * stain), occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The kept body itself: the picture of one, stood on the apron as a card that leans back and turns to the lens, raised by its own relief.
// The picture is of a dead one seen from the side and a little above, which is how every lens here sees them.
const BODY_GLSL = /* glsl */ `
uniform sampler2D tPic;
uniform sampler2D tRelief;
uniform float uFlip;
uniform vec4 uBody;
uniform vec4 uShape;
varying vec2 vUv;
varying vec2 vCard;
varying vec3 vWorld;
varying vec3 vRight;
varying vec3 vUp;
float bodyCover(vec2 uv) {
  vec3 pic = texture2D(tPic, uv).rgb;
  return max(smoothstep(0.03, 0.07, max(pic.r, max(pic.g, pic.b))), smoothstep(0.05, 0.1, textureLod(tRelief, uv, 2.0).r));
}
// What is left of each is a different heap: one whole, one slumped to an end, one broken in the middle into two.
float bodyTop(vec2 c) {
  float f = 1.0;
  if (uShape.x > 1.5) f = 0.3 + 0.7 * pow(abs(cos(3.14159 * (c.x * 1.05 + 0.12))), 0.8);
  else if (uShape.x > 0.5) f = mix(0.26, 1.0, smoothstep(0.08, 0.72, c.x));
  if (uShape.x > 0.5) {
    f *= smoothstep(0.0, 0.12, c.x) * (1.0 - smoothstep(0.88, 1.0, c.x));
    f += 0.035 * sin(c.x * 31.0 + uShape.w) + 0.02 * sin(c.x * 83.0 + uShape.w * 1.7);
  }
  return uBody.w + (1.0 - uBody.w) * f;
}`;

const BODY_VERTEX = /* glsl */ `
uniform vec4 uAt;
${BODY_GLSL}
void main() {
  vec2 uv = vec2(position.x + 0.5, 0.5 - position.z);
  vCard = uv;
  vUv = vec2(mix(uShape.y, uShape.z, mix(uv.x, 1.0 - uv.x, uFlip)), uv.y);
  vec2 tc = normalize(cameraPosition.xz - uAt.xz);
  vec3 toLens = vec3(tc.x, 0.0, tc.y);
  vRight = vec3(tc.y, 0.0, -tc.x);
  vUp = vec3(0.0, cos(uBody.z), 0.0) - toLens * sin(uBody.z);
  vec3 nrm = toLens * cos(uBody.z) + vec3(0.0, sin(uBody.z), 0.0);
  float swell = textureLod(tRelief, vUv, 5.0).r;
  // Each has gone down its own way: rolled so that one end of it is under the crust.
  float roll = uAt.w;
  vec3 r2 = vRight * cos(roll) + vUp * sin(roll);
  vec3 u2 = vUp * cos(roll) - vRight * sin(roll);
  vRight = r2;
  vUp = u2;
  vWorld = vec3(uAt.x, uAt.y, uAt.z) + vRight * (position.x * uBody.x) + vUp * ((uv.y - uBody.w) * uBody.y) + nrm * (swell * 0.3 * uBody.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

const BODY_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec4 uAt;
uniform sampler2D tSalt;
uniform float uSeed;
${NOISE_GLSL}
${RIG_GLSL}
${BODY_GLSL}
const vec3 LUMA = vec3(0.3, 0.5, 0.2);
const vec3 RIME_MEAN = vec3(0.389, 0.306, 0.282);
void main() {
  float top = bodyTop(vCard);
  float covered = bodyCover(vUv) * (1.0 - step(top, vCard.y));
  float lip = smoothstep(top - 0.12, top, vCard.y) * step(0.5, uShape.x);
  vec3 pic = texture2D(tPic, vUv).rgb;
  float l0 = dot(pic, LUMA);
  // Its form from the relief, blurred; its ribs and knobs from the light and dark of the picture.
  vec2 e = vec2(8.0 / 1672.0, 8.0 / 941.0);
  float sign_ = mix(1.0, -1.0, uFlip);
  float hx = (textureLod(tRelief, vUv + vec2(e.x, 0.0), 3.5).r - textureLod(tRelief, vUv - vec2(e.x, 0.0), 3.5).r) * sign_;
  float hy = textureLod(tRelief, vUv + vec2(0.0, e.y), 3.5).r - textureLod(tRelief, vUv - vec2(0.0, e.y), 3.5).r;
  vec2 de = vec2(1.5 / 1672.0, 1.5 / 941.0);
  float lx = (dot(texture2D(tPic, vUv + vec2(de.x, 0.0)).rgb, LUMA) - l0) * sign_;
  float ly = dot(texture2D(tPic, vUv + vec2(0.0, de.y)).rgb, LUMA) - l0;
  // Over all of it the salt has grown: clumps the size of a fist and needles between them.
  vec2 cq = vUv * vec2(uBody.x, uBody.y) * 1.6 + uSeed;
  vec3 clump = texture2D(tSalt, cq).rgb / RIME_MEAN;
  float cl = dot(clump, LUMA);
  vec2 cs = vec2(dot(texture2D(tSalt, cq + vec2(0.004, 0.0)).rgb / RIME_MEAN, LUMA) - cl, dot(texture2D(tSalt, cq + vec2(0.0, 0.004)).rgb / RIME_MEAN, LUMA) - cl);
  float crusted = smoothstep(0.25, 0.6, vnoise(vUv * vec2(9.0, 5.0) + uSeed) * 0.6 + 0.4 * cl);
  vec3 face = normalize(cross(vRight, vUp));
  // The card stands, but what it shows is a heap that faces the sky as much as the lens: its light is taken half from above.
  vec3 n = normalize(face * 0.6 - vRight * (hx * 4.0 + lx * 0.3 / (l0 + 0.1) + cs.x * 1.6) - vUp * (hy * 4.0 + ly * 0.3 / (l0 + 0.1) + cs.y * 1.6) + vec3(0.0, 0.9, 0.0) + vUp * (1.2 * lip));
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 rime = texture2D(tSalt, vWorld.xz * 2.0 + vWorld.y * 1.3 + uSeed).rgb / RIME_MEAN;
  // Every read of a picture comes before any discard: the software renderer leaves the slopes of a dropped pixel's neighbours undefined.
  if (covered < 0.5) discard;
  if (uMirror > 0.5 && vWorld.y < -0.015) discard;
  // The picture is of one the salt kept, under the same sky: its colours are the heap's. Salt white on the knobs, bone and dried hide between.
  vec3 albedo = pic * 0.6 * mix(vec3(1.0), rime, 0.25);
  float hollow = smoothstep(0.04, 0.3, l0);
  vec3 crust = vec3(0.335, 0.292, 0.272) * (0.6 + 0.45 * cl);
  albedo = mix(albedo, crust, 0.3 * crusted * hollow);
  float above = vWorld.y - uAt.y;
  float stain = (1.0 - smoothstep(0.0, 0.16, above + 0.12 * (vnoise(vWorld.xz * 3.0 + uSeed) - 0.5)));
  // Where it meets the crust the brine wicks up into the salt and it is pink.
  albedo = mix(albedo, albedo * vec3(0.78, 0.47, 0.43), 0.7 * stain);
  float occ = (0.62 + 0.38 * hollow) * (0.7 + 0.3 * smoothstep(0.0, 0.25, above));
  vec3 c = rigShade(vWorld, n, v, albedo, 0.97, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const BODY_DEPTH = /* glsl */ `
precision highp float;
${BODY_GLSL}
void main() {
  if (bodyCover(vUv) * (1.0 - step(bodyTop(vCard), vCard.y)) < 0.5) discard;
  gl_FragColor = vec4(0.0);
}`;

function grid(across: number, down: number): THREE.BufferGeometry {
  const position = new Float32Array((across + 1) * (down + 1) * 3);
  const index = new Uint32Array(across * down * 6);
  let p = 0;
  for (let j = 0; j <= down; j++) for (let i = 0; i <= across; i++) position.set([i / across - 0.5, 0, j / down - 0.5], p++ * 3);
  let q = 0;
  for (let j = 0; j < down; j++)
    for (let i = 0; i < across; i++) {
      const a = j * (across + 1) + i;
      const b = a + across + 1;
      index.set([a, b, a + 1, a + 1, b, b + 1], q);
      q += 6;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

// What each of the dead is, in the order of the anchors. No two the lens of the thin crust sees are in one state:
// 'kept' is the whole animal on its belly, back and head out, grown over with salt; 'heap' is one fallen in on itself, bone showing (the picture);
// 'mound' is the oldest, only salt; 'fallen' lies on its side as it went down.
type State = 'kept' | 'heap' | 'mound' | 'fallen';
const STATES: State[] = ['heap', 'heap', 'heap', 'mound', 'fallen', 'heap'];
// The picture each heap is: the one fallen in with its bones out, the one whole under its salt with its feelers before it, the oldest and lowest.
const HEAPS = [0, 1, 2, 0, 0, 1];
const PICTURES = [
  { name: 'deadone', aspect: 941 / 1672, long: 3.3, sunk: [0.22, 0.5] },
  { name: 'deadone-b', aspect: 887 / 1774, long: 3.4, sunk: [0.24, 0.3] },
  { name: 'deadone-c', aspect: 941 / 1672, long: 2.9, sunk: [0.34, 0.4] },
] as const;
const KINDS = [1, 0, 2];
const FALLEN = DEAD[4] as (typeof DEAD)[number];

export function create(ctx: Context): Piece {
  const rng = ctx.rng('dead');
  // TEMPORARY, until the anchors give it: where the lens of the stuck one stands. The dead it looks across are taken finer.
  const lens = rel(24.6, 19.6);
  const fineGrid = grid(110, 110);
  const coarseGrid = grid(48, 48);
  const bodyGrid = grid(40, 24);
  const bodies: { mesh: THREE.Mesh; material: THREE.ShaderMaterial }[] = [];
  const kept: Beast[] = [];
  const nearest = DEAD.reduce((a, b) => (Math.hypot(a.d - STUCK[0], a.l - STUCK[1]) < Math.hypot(b.d - STUCK[0], b.l - STUCK[1]) ? a : b));
  const tPics = PICTURES.map((p) => ctx.assets.texture(`mat/${p.name}.jpg`, { kind: 'colour', repeat: false }));
  const tReliefs = PICTURES.map((p) => ctx.assets.texture(`mat/${p.name}-h.png`, { kind: 'data', repeat: false }));
  const tSalt = ctx.assets.texture('mat/rime.jpg', { kind: 'colour', anisotropy: 4 });
  const tSaltNh = ctx.assets.texture('mat/rime-nh.png', { kind: 'data', anisotropy: 4 });
  const cards: { mesh: THREE.Mesh; material: THREE.ShaderMaterial; x: number; z: number; yaw: number; size: number }[] = [];
  DEAD.forEach((d, index) => {
    const state = STATES[index] ?? 'heap';
    const p = rel(d.d, d.l);
    const ground = Math.min(0.1, ctx.rig.land.height(p[0], p[1]));
    const size = 3.7 * d.size * rng.range(0.92, 1.08);
    // The mound: all of the oldest, and the apron under each of the others.
    const alone = state === 'mound';
    const radius = (alone ? 1.75 : state === 'heap' ? 1.25 : 1.5) * d.size * rng.range(0.9, 1.1);
    const high = (alone ? 0.62 : state === 'heap' ? 0.2 : 0.1) * d.size * rng.range(0.85, 1.1);
    const lean = rng.range(0, TAU);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        tSalt: { value: tSalt },
        tSaltNh: { value: tSaltNh },
        uDome: { value: new THREE.Vector4(p[0], p[1], radius, high) },
        uLumps: { value: new THREE.Vector4(rng.range(1, 60), rng.range(1.0, 1.7), 0.5 * Math.cos(lean), 0.5 * Math.sin(lean)) },
        uTurn: { value: new THREE.Vector2(Math.cos(d.yaw), Math.sin(d.yaw)) },
        uGround: { value: ground },
      },
      vertexShader: DOME_VERTEX,
      fragmentShader: DOME_FRAGMENT,
    });
    const near = Math.hypot(p[0] - lens[0], p[1] - lens[1]) < 9;
    const mesh = new THREE.Mesh(near ? fineGrid : coarseGrid, material);
    // The grid lies a finger under the crust: only the mound and the knobs round it stand out of the ground.
    mesh.position.set(p[0], ground - 0.035, p[1]);
    mesh.scale.set(radius * 3.1, 1, radius * 3.1);
    mesh.frustumCulled = false;
    mesh.updateMatrixWorld();
    cards.push({ mesh, material, x: p[0], z: p[1], yaw: d.yaw, size });
    if (state === 'kept') {
      // On its belly as it sank, the back and the head out, the feelers spread on the salt where the head came down.
      const k = 0.92 * d.size;
      const beast = new Beast(ctx, { k, young: 0, seed: 7.3 + index * 11.9, bulk: 0.94, salt: 0.3 }, { cell: near ? 0.03 : 0.065, wet: ground - 5, crust: 1, relief: 0 });
      const lie = newDrive();
      // STAGED for the lens of the thin crust: its head is toward that lens and a little to its right, as the approved picture has the nearest of them.
      const to = [lens[0] - p[0], lens[1] - p[1]];
      const tl = Math.hypot(to[0] as number, to[1] as number);
      const c = Math.cos(0.75);
      const sn = Math.sin(0.75);
      lie.dir = [((to[0] as number) * c - (to[1] as number) * sn) / tl, ((to[0] as number) * sn + (to[1] as number) * c) / tl];
      lie.ox = p[0];
      lie.oz = p[1];
      lie.oy = ground - 1.3 * k;
      lie.pitch = -0.3;
      lie.roll = 0.16;
      lie.bend = -0.1;
      lie.headPitch = -0.3;
      lie.headYaw = 0.25;
      lie.breath = -1;
      lie.splay = 0.55;
      lie.floor = ground + 0.03;
      lie.curl.fill(0.55);
      lie.feet.forEach((foot, l) => {
        foot[0] = (l % 2 === 1 ? 0.83 : -1.17) * k;
        foot[1] = 0;
        foot[2] = (l < 2 ? -0.68 : 0.68) * k;
      });
      beast.pose(lie, 0);
      kept.push(beast);
      return;
    }
    if (state !== 'heap') return;
    // The body: about three metres of it, sunk in its apron to a different depth each, the furthest gone the deepest.
    const under = d === nearest ? 1 : 0;
    const which = HEAPS[index] ?? 0;
    const picture = PICTURES[which] as (typeof PICTURES)[number];
    // The first picture is also drawn slumped to an end and broken in two; the others are whole.
    const kind = which === 0 ? (KINDS[bodies.length % KINDS.length] as number) : 0;
    const crop: [number, number] = kind === 1 ? [0, 0.72] : kind === 2 ? [0.22, 1] : [0, 1];
    const wide = picture.long * d.size * rng.range(0.75, 1.2) * (crop[1] - crop[0]) * (kind === 0 ? 1 : 1.15);
    const bodyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        tPic: { value: tPics[which] },
        tRelief: { value: tReliefs[which] },
        tSalt: { value: tSalt },
        uFlip: { value: rng.next() < 0.5 ? 1 : 0 },
        uAt: { value: new THREE.Vector4(p[0], ground + 0.04 + 0.5 * high, p[1], under ? 0 : (rng.next() < 0.5 ? -1 : 1) * rng.range(0.08, 0.3)) },
        uShape: { value: new THREE.Vector4(kind, crop[0], crop[1], rng.range(0, 6)) },
        uBody: { value: new THREE.Vector4(wide, (wide * picture.aspect) / (crop[1] - crop[0]) / (kind === 0 ? 1 : 1.15), under ? 0.95 : rng.range(0.45, 0.85), under ? 0.6 : rng.range(picture.sunk[0], picture.sunk[1])) },
        uSeed: { value: rng.range(1, 60) },
      },
      vertexShader: BODY_VERTEX,
      fragmentShader: BODY_FRAGMENT,
      side: THREE.DoubleSide,
    });
    bodyMaterial.userData.depthFragment = BODY_DEPTH;
    const body = new THREE.Mesh(bodyGrid, bodyMaterial);
    body.frustumCulled = false;
    bodies.push({ mesh: body, material: bodyMaterial });
  });
  // The live one: sunk to the shoulders, head up, working to get out and getting nowhere.
  const at = rel(STUCK[0], STUCK[1]);
  const yaw = relYaw(-0.97, -0.03);
  // The crust has given way under it: the land's hollow is 0.2 m deep here, and the rig's land height does not include it.
  const ground = Math.min(0.1, ctx.rig.land.height(at[0], at[1])) - 0.2;
  const stuck = new Beast(ctx, { k: 1, young: 0, seed: 23.7, bulk: 1, salt: 0.5 }, { cell: 0.03, wet: ground + 0.26, mudded: 1, relief: 0.022, tendrils: 15, hang: 0.5, thick: 1.6, long: 0.8, droop: 0.9, line: ground + 0.13 });
  const live = newDrive();
  const mud = mudWallow(ctx, at[0], at[1], [Math.cos(yaw), -Math.sin(yaw)], 0.8, [0.1, 0.072, 0.054], 'dead-mud', 0.6, 0.2);
  // One of the dead is not yet a heap: it lies on its side as it fell, half under, caked and salted, the upper legs stiff in the air.
  const fa = rel(FALLEN.d, FALLEN.l);
  const fl = Math.hypot(lens[0] - fa[0], lens[1] - fa[1]);
  // STAGED for the lens of the thin crust: it lies a stride and a half to the left of its anchor as that lens sees it, whole in the frame.
  const fp: [number, number] = [fa[0] - ((lens[1] - fa[1]) / fl) * 1.7, fa[1] + ((lens[0] - fa[0]) / fl) * 1.7];
  const fGround = Math.min(0.1, ctx.rig.land.height(fp[0], fp[1]));
  const fallen = new Beast(ctx, { k: 0.85, young: 0, seed: 41.3, bulk: 0.86, salt: 0.3 }, { cell: 0.03, wet: fGround - 5, crust: 1, relief: 0 });
  const lie = newDrive();
  {
    const k = 0.85;
    const across: [number, number] = [-(lens[1] - fp[1]), lens[0] - fp[0]];
    const al = Math.hypot(across[0], across[1]);
    lie.dir = [across[0] / al, across[1] / al];
    // Its legs lie toward the lens of the thin crust.
    if (lie.dir[1] * (lens[0] - fp[0]) - lie.dir[0] * (lens[1] - fp[1]) < 0) lie.dir = [-lie.dir[0], -lie.dir[1]];
    lie.ox = fp[0];
    lie.oz = fp[1];
    lie.oy = fGround - 0.42 * k;
    lie.roll = 1.32;
    lie.shift = -1.12 * k;
    lie.pitch = 0.06;
    lie.bend = 0.12;
    lie.headPitch = 0.3;
    lie.headYaw = -0.25;
    lie.breath = -1;
    lie.splay = 0.12;
    lie.floor = -1e9;
    lie.curl.fill(0.9);
    lie.feet.forEach((foot, l) => {
      const upper = l < 2;
      const fore = l % 2 === 1;
      foot[0] = (fore ? 1.05 : -1.5) * k;
      foot[1] = (upper ? (fore ? 0.48 : 0.3) : -0.6) * k;
      foot[2] = (upper ? -1.25 : -0.9) * k * 0.86;
    });
    fallen.pose(lie, 0);
  }
  // Round each dead one the crust is stained dark: what ran out of it, and the mud it sank into.
  const stains = cards.map((c, i) => mudWallow(ctx, c.x, c.z, [Math.cos(c.yaw), -Math.sin(c.yaw)], 0.14 * c.size, [0.05, 0.022, 0.017], 'dead-stain-' + i, 1, 0, false));
  const meshes = [...cards.map((c) => c.mesh), ...bodies.map((b) => b.mesh), ...kept.flatMap((k) => [k.mesh, k.feelers]), stuck.mesh, stuck.feelers, fallen.mesh, fallen.feelers, mud.mesh, ...stains.map((w) => w.mesh)];
  ctx.parts.built('dead', ...(meshes as [(typeof meshes)[number], ...typeof meshes]));
  for (const mesh of meshes) ctx.scene.add(mesh);

  const discs = ctx.rig.contactDiscs(cards.length + 1);
  cards.forEach((c, i) => ctx.rig.setDisc(discs, i, c.x, c.z, 0.42 * c.size, 0.3, 1.8, c.yaw));

  return {
    setTime: (seconds) => {
      // A heave every few seconds: it gathers, strains up and forward, holds, and sinks back to where it was.
      const period = 5.2;
      const c = seconds / period + 0.3;
      const u = c - Math.floor(c);
      const heave = smooth(0.08, 0.34, u) * (1 - smooth(0.42, 0.9, u));
      const tremble = heave * 0.012 * Math.sin(seconds * 23);
      live.ox = at[0];
      live.oz = at[1];
      live.oy = ground - 1.74 + 0.12 * heave + tremble;
      live.dir = [Math.cos(yaw), -Math.sin(yaw)];
      live.surge = 0.1 * heave;
      live.pitch = -0.66 - 0.06 * heave;
      live.roll = 0.05 * Math.sin(seconds * 0.9) + 0.05 * heave * Math.sin(seconds * 2.7);
      live.shift = 0.04 * Math.sin(seconds * 0.9 - 0.6);
      live.bend = 0.04 * Math.sin(seconds * 0.6);
      live.headPitch = -0.5 - 0.14 * heave + 0.05 * Math.sin(seconds * 1.7);
      live.headYaw = 0.3 * Math.sin(seconds * 0.43) + 0.1 * Math.sin(seconds * 1.1);
      live.breath = Math.sin(seconds * 2.4);
      live.splay = 0.12 + 0.2 * heave;
      live.floor = ground + 0.07;
      live.curl[0] = 0.85 + 0.35 * heave;
      // The feet are held by the mud: they stay where they are while the trunk strains above them.
      live.feet.forEach((foot, l) => {
        const side = l < 2 ? -1 : 1;
        const fore = l % 2 === 1 ? 1 : -1;
        foot[0] = (fore > 0 ? 0.78 : -1.22) + 0.05;
        foot[1] = 0;
        foot[2] = side * 0.68;
      });
      const stood = stuck.pose(live, seconds);
      ctx.rig.setDisc(discs, cards.length, stood.x, stood.z, 1.7, 0.3, 1.7, stood.yaw);
      mud.set(heave, seconds);
    },
    dispose: () => {
      fineGrid.dispose();
      coarseGrid.dispose();
      for (const c of cards) c.material.dispose();
      for (const b of bodies) b.material.dispose();
      for (const k of kept) k.dispose();
      bodyGrid.dispose();
      stuck.dispose();
      fallen.dispose();
      mud.dispose();
      for (const w of stains) w.dispose();
    },
  };
}
