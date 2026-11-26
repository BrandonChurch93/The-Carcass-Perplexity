// The land of the Eye: the socket of pale cliffs with its aprons of scree, the brow that hangs over the east shore, the loose stone,
// and the stream that leaves the lake through the rim beside the wide camera.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DEG, shoreAt, smooth } from '../layout';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { vnoise } from '../shared/noise';
import { KEYS } from '../cameras';
import { AXIS, axisOf, browCover, landHeight, onAxis, streamAcross, wallAt } from './height';
import { PATCH, browGeometry, patchGeometry, pebbleGeometry, socketGeometry, stoneGeometry } from './meshes';
import { BLOCK_FRAGMENT, BLOCK_VERTEX, ballGeometry, blockUniforms } from './blocks';
import { ROCK_GLSL, rockUniforms } from './rock';
import { createStream, standingStones } from './stream';

export const PARTS: readonly string[] = ['land', 'brow', 'scree', 'stream'];

const CUT_GLSL = /* glsl */ `
uniform vec4 uPatch;
uniform vec4 uAxis;
uniform float uCut;
bool inPatch(vec3 p) {
  vec2 q = p.xz - uAxis.xy;
  float along = dot(q, uAxis.zw);
  float across = dot(q, vec2(uAxis.w, -uAxis.z));
  return uCut > 0.5 && along > uPatch.x + 1.2 && along < uPatch.y - 1.2 && across > uPatch.z + 1.2 && across < uPatch.w - 1.2;
}`;

const LAND_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
${NOISE_GLSL}
${RIG_GLSL}
${ROCK_GLSL}
${CUT_GLSL}
void main() {
  if (inPatch(vWorld) || beyondNear(vWorld)) discard;
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float face = smoothstep(0.8, 0.52, n.y);
  Rock k = rockAt(vWorld, n, face);
  // The damp line at the water, and the stone that the lake has wetted darker.
  vec4 land = landAt(vWorld.xz);
  float damp = smoothstep(1.35, 0.7, vWorld.y + 0.7 * vnoise(vWorld.xz * 0.11) + 0.12 * vnoise(vWorld.xz * 1.3)) * (1.0 - face);
  // Under a low eye the wet is a thin dark band above the water and the stones beyond it are dry.
  damp = mix(damp, smoothstep(0.2, 0.05, vWorld.y + 0.12 * vnoise(vWorld.xz * 2.1)) * (1.0 - face), smoothstep(12.0, 4.0, cameraPosition.y));
  k.albedo *= mix(1.0, 0.36, damp) * mix(1.0, 0.28, smoothstep(0.03, -0.12, vWorld.y) * (1.0 - face));
  // Damp gravel is dark, not glossy: only under the low eye does the wet band take a sheen.
  k.rough = mix(k.rough, 0.8, damp * smoothstep(12.0, 4.0, cameraPosition.y));
  // Under the brow the wall and the scree stand in a cave: the further back from the water, the less of the sky they see.
  float bearing = degrees(atan(vWorld.x, -vWorld.z));
  float roofed = smoothstep(26.0, 52.0, bearing) * (1.0 - smoothstep(116.0, 142.0, bearing));
  float cave = roofed * smoothstep(40.0, 150.0, land.b) * smoothstep(176.0, 130.0, vWorld.y);
  k.occ *= 1.0 - 0.93 * cave;
  k.albedo *= 1.0 - 0.6 * cave;
  vec3 c = rigShade(vWorld, k.normal, v, k.albedo, k.rough, k.occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const LAND_DEPTH = /* glsl */ `
varying vec3 vWorld;
uniform vec4 uNear;
${CUT_GLSL}
void main() {
  if (inPatch(vWorld) || (uNear.w > 0.5 && length(vWorld.xz - uNear.xy) > uNear.z)) discard;
  gl_FragColor = vec4(0.0);
}`;

const NEAR_DEPTH = /* glsl */ `
varying vec3 vWorld;
uniform vec4 uNear;
void main() {
  if (uNear.w > 0.5 && length(vWorld.xz - uNear.xy) > uNear.z) discard;
  gl_FragColor = vec4(0.0);
}`;

const BROW_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
${NOISE_GLSL}
${RIG_GLSL}
${ROCK_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  Rock k = rockAt(vWorld, n, 1.0);
  // The under side holds its own dark: the roof sees the ground and not the sky.
  float under = smoothstep(0.1, -0.5, n.y);
  vec3 c = rigShade(vWorld, k.normal, v, k.albedo * mix(1.0, 0.5, under), k.rough, k.occ * mix(1.0, 0.3, under));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const STONE_VERTEX = /* glsl */ `
attribute vec3 aTint;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec3 vTint;
void main() {
  vec4 p = instanceMatrix * vec4(position, 1.0);
  // From the rim a chip the size of a hand is not a stone: the ground's own picture holds those.
  if (cameraPosition.y > 20.0 && length(instanceMatrix[0].xyz) < 0.75) p = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec4 w = modelMatrix * p;
  vWorld = w.xyz;
  vLocal = position * vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz)) + aTint.z * 37.0;
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const STONE_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec3 vTint;
uniform sampler2D tScree;
uniform sampler2D tScreeH;
vec4 screeAt(vec2 xz) {
  vec2 uv = xz / vec2(24.0, 13.51);
  return vec4(texture2D(tScree, uv).rgb, texture2D(tScreeH, uv).r);
}
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  if (beyondNear(vWorld)) discard;
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 w = pow(abs(n), vec3(4.0));
  w /= w.x + w.y + w.z;
  // A face that shows a tenth of itself is not read: the two that count share the stone.
  w = max(w - 0.1, 0.0);
  w /= w.x + w.y + w.z;
  // A block is a piece of the scree: the plate of the slope on its three faces, each block from another part of it.
  vec2 at = vTint.yz * 40.0;
  // The plate is a slope of many stones: a block shows a small piece of it large, so that it is one stone with its own cracks, not a heap.
  float grain = mix(0.5, 1.0, smoothstep(12.0, 4.0, cameraPosition.y));
  vec2 ux = vWorld.zy * grain + at;
  vec2 uy = vWorld.xz * grain + at.yx;
  vec2 uz = vWorld.xy * grain - at;
  // The lie of the relief, from one step each way on each face: the height at the point itself is already known.
  float e = 0.1;
  vec2 d = vec2(0.0);
  vec4 col = vec4(0.0);
  if (w.x > 0.0) {
    vec4 k = screeAt(ux);
    col += k * w.x;
    d += vec2(texture2D(tScreeH, (ux + vec2(e, 0.0)) / vec2(24.0, 13.51)).r - k.a, texture2D(tScreeH, (ux + vec2(0.0, e)) / vec2(24.0, 13.51)).r - k.a) * w.x;
  }
  if (w.y > 0.0) {
    vec4 k = screeAt(uy);
    col += k * w.y;
    d += vec2(texture2D(tScreeH, (uy + vec2(e, 0.0)) / vec2(24.0, 13.51)).r - k.a, texture2D(tScreeH, (uy + vec2(0.0, e)) / vec2(24.0, 13.51)).r - k.a) * w.y;
  }
  if (w.z > 0.0) {
    vec4 k = screeAt(uz);
    col += k * w.z;
    d += vec2(texture2D(tScreeH, (uz + vec2(e, 0.0)) / vec2(24.0, 13.51)).r - k.a, texture2D(tScreeH, (uz + vec2(0.0, e)) / vec2(24.0, 13.51)).r - k.a) * w.z;
  }
  vec3 albedo = mix(col.rgb, vec3(dot(col.rgb, vec3(0.33))) , 0.6) * vec3(1.32, 1.36, 1.4) * (0.8 + 0.4 * vTint.x) * mix(vec3(1.32, 1.18, 0.98), vec3(1.0), smoothstep(12.0, 4.0, cameraPosition.y));
  vec3 nh = vec3(0.5, 0.5, col.a);
  vec3 t = normalize(cross(n, vec3(0.31, 0.9, 0.3)));
  vec3 b = cross(n, t);
  // A pebble is worn smooth: the plate's cracks are not raised on it.
  n = normalize(n - (t * d.x + b * d.y) * mix(3.0, 0.5, smoothstep(12.0, 4.0, cameraPosition.y)));
  // Where the stone meets the ground it is in its own shade, and wet where the ground is.
  vec4 land = landAt(vWorld.xz);
  float foot = smoothstep(0.0, 0.35, vWorld.y - max(land.r, 0.0) + 0.08);
  // Under a low eye the stones are pebbles: the top of each is in the light whatever its height, only its foot is wet, and each has a tone of its own.
  float lowEye = smoothstep(12.0, 4.0, cameraPosition.y);
  // A pebble is one stone of one tone: the plate of the scree, made for blocks, would blotch it.
  // Three kinds of stone lie mixed on the shore: pale limestone of the wall, dark chert, and stone the lake has stained with rust.
  // Each has its grain; some are banded and some carry a white vein.
  float kind = vTint.z;
  float mott = vnoise(vLocal.xz * 9.0 + vLocal.y * 13.0);
  float speck = vnoise(vLocal.xz * 110.0 + vLocal.y * 83.0);
  vec3 pebble = kind < 0.45 ? vec3(0.5, 0.47, 0.42) : (kind < 0.76 ? vec3(0.15, 0.15, 0.16) : vec3(0.4, 0.25, 0.14));
  pebble *= 0.72 + 0.4 * mott + 0.2 * (speck - 0.5);
  float band = smoothstep(0.3, 0.5, abs(fract(dot(vLocal, vec3(0.3, 1.0, 0.2)) * 17.0 + 2.0 * mott) - 0.5));
  pebble *= mix(1.0, 0.78 + 0.4 * band, step(0.5, fract(kind * 7.0)));
  float vein = smoothstep(0.035, 0.0, abs(dot(vLocal, vec3(0.6, 0.5, -0.62)) + 0.12 * mott - 0.3 * (fract(kind * 29.0) - 0.5))) * step(0.8, fract(kind * 13.0));
  pebble = mix(pebble, vec3(0.7, 0.68, 0.63), 0.6 * vein);
  albedo = mix(albedo, pebble * (0.8 + 0.4 * vTint.y), lowEye);
  foot = max(foot, lowEye * smoothstep(-0.1, 0.6, normalize(vNormal).y));
  float damp = smoothstep(mix(0.3, 0.1 + 0.06 * vnoise(vWorld.xz * 3.0), lowEye), 0.01, vWorld.y);
  // The last half metre of shore before the water is wet: its stones are dark.
  damp = max(damp, 0.75 * lowEye * smoothstep(0.1, 0.03, max(land.r, 0.0)));
  albedo *= mix(1.0, 0.5, damp);
  vec3 c = rigShade(vWorld, n, v, clamp(albedo, 0.0, 0.9), mix(0.9, 0.4, damp), (0.45 + 0.55 * smoothstep(0.05, 0.5, nh.b)) * mix(0.45, 1.0, foot));
  // A wet pebble carries the low sun on its crown.
  if (lowEye * damp > 0.02) c += lowEye * damp * 0.5 * rigGlint(vWorld, n, v, 0.35);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

interface Stone {
  x: number;
  z: number;
  size: number;
  /** It stands in the stream. */
  wet?: boolean;
}

export function create(ctx: Context): Piece {
  ctx.rig.setLand(landHeight, browCover);
  const rock = rockUniforms(ctx);
  const [ox, oz] = onAxis(0, 0);
  const [ux, uz] = onAxis(1, 0);
  const cut = {
    uPatch: { value: new THREE.Vector4(PATCH.along0, PATCH.along1, PATCH.across0, PATCH.across1) },
    uAxis: { value: new THREE.Vector4(ox, oz, ux - ox, uz - oz) },
  };

  const socketMaterial = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, ...rock, ...cut, uCut: { value: 1 } }, vertexShader: RIG_VERTEX, fragmentShader: LAND_FRAGMENT });
  socketMaterial.userData.depthFragment = LAND_DEPTH;
  const patchMaterial = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, ...rock, ...cut, uCut: { value: 0 } }, vertexShader: RIG_VERTEX, fragmentShader: LAND_FRAGMENT });
  patchMaterial.userData.depthFragment = LAND_DEPTH;
  const socket = new THREE.Mesh(socketGeometry(), socketMaterial);
  const patch = new THREE.Mesh(patchGeometry(), patchMaterial);
  socket.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('land', socket, patch));
  ctx.scene.add(patch);

  const browMaterial = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, ...rock }, vertexShader: RIG_VERTEX, fragmentShader: BROW_FRAGMENT, side: THREE.DoubleSide });
  const brow = new THREE.Mesh(browGeometry(), browMaterial);
  ctx.scene.add(ctx.parts.built('brow', brow));

  // The loose stone: blocks on the aprons under the wall, boulders on the spur and in the ravine, cobbles on the beach.
  const rng = ctx.rng('scree');
  const stones: Stone[][] = [[], [], []];
  const put = (x: number, z: number, size: number): void => {
    if (landHeight(x, z) < -0.3) return;
    (stones[size > 2.2 ? 0 : size > 0.5 ? 1 : 2] as Stone[]).push({ x, z, size });
  };
  for (let i = 0; i < 2600; i++) {
    const b = rng.range(0, 360);
    const a = b * DEG;
    const wall = wallAt(a);
    const s = rng.next() ** 0.6;
    const r = shoreAt(b) + 34 + s * (wall.foot - 22);
    put(Math.sin(a) * r, -Math.cos(a) * r, 1.4 + 7.5 * rng.next() ** 3 * (0.4 + 0.6 * s));
  }
  for (let i = 0; i < 3400; i++) {
    const along = rng.range(4, PATCH.along1 - 4);
    const across = rng.range(PATCH.across0 + 3, PATCH.across1 - 3);
    const size = 0.22 + 3.4 * rng.next() ** 4;
    // The path of the wide camera is kept clear of anything it could pass through.
    if (Math.abs(across) < 3.2 + size && size > 0.45) continue;
    if (Math.abs(across - streamAcross(along)) < 1.6 + size) continue;
    const clump = vnoise(along / 14 + 3, across / 14 + 8);
    if (clump < 0.42 && size < 1.2) continue;
    const [x, z] = onAxis(along, across);
    put(x, z, size);
  }
  // The shoulders of the spur are piles of fallen blocks, each its own stone.
  for (let i = 0; i < 600; i++) {
    const along = rng.range(40, 215);
    const side = rng.next() < 0.5 ? -1 : 1;
    const across = side * (9 + 62 * rng.next() ** 1.4);
    const size = 0.7 + 3.6 * rng.next() ** 2.2;
    if (Math.abs(across - streamAcross(along)) < 1.4 + size * 0.7) continue;
    if (vnoise(along / 23 + 9, across / 23 + 2) < 0.34) continue;
    const [x, z] = onAxis(along, across);
    put(x, z, size);
  }
  // The blocks the wide shot looks past, at the foot of its frame.
  const near: [number, number, number][] = [
    [128, 17, 4.6],
    [121, 22, 5.6],
    [133, 12.5, 2.6],
    [114, 15, 3.2],
    [109, 25, 4.2],
    [126, -19, 4.4],
    [119, -27, 5.2],
    [132, -8, 2.2],
    [113, -17, 3],
    [107, -31, 4],
    [137, 9, 1.5],
    [138, -6.5, 1.3],
    [136, 10, 4.2],
    [130.5, 13.5, 5],
    [137, -9.5, 3.6],
    [131.5, -13, 4.8],
    [126, -15, 3.2],
    [123, 16.5, 3.8],
  ];
  // The corners of the wide picture are piles of blocks, none larger than the atlas can hold sharp at that nearness: on the right
  // against the frame, on the left beyond the stream.
  near.push([135, 9.2, 3.6], [132.5, 10.5, 2.8], [129.5, 14, 4.4], [134.5, -8.3, 3.4], [131, -7.8, 4.6], [133.7, -5.9, 3.6], [128.5, -6.1, 3.4], [130.2, -10.6, 3.2], [133.5, -9.7, 3.0], [135.9, -7.4, 2.4], [127.1, -8.7, 2.2], [136.6, 6.7, 3.0], [131.5, -20.5, 4.4], [139.5, 11.5, 3.4], [134.5, 16, 4.4], [141, 8.4, 2.3], [137.5, 14.5, 3.1], [143, 12.5, 2.6], [139, -21, 3.6], [135, -24, 4.6], [141.5, -19.5, 2.5], [131, -25.5, 4], [137.5, -26.5, 3]);
  for (const [along, across, size] of near) {
    // None stands in the water: one that would is set on the bank on its own side.
    const mid = streamAcross(along);
    const room = 2.6 + size * 0.5;
    const set = Math.abs(across - mid) < room ? mid + (across < mid ? -room : room) : across;
    const [x, z] = onAxis(along, set);
    put(x, z, size > 2.2 && Math.abs(set) >= 12 ? size * 1.2 : size);
  }
  // Round every block of the spur lie the pieces that broke from it, three and more to each, and loose stones lie in drifts down the
  // slope between: no block stands alone on bare ground.
  {
    const kin = ctx.rng('scree-kin');
    const small: Stone[] = [];
    const clear = (along: number, across: number, size: number): boolean =>
      Math.abs(across - streamAcross(along)) > 1.2 + size && (Math.abs(across) > 2.6 + size || size < 0.45) && along > 14;
    for (const s of [...(stones[0] as Stone[]), ...(stones[1] as Stone[])]) {
      const [along, across] = axisOf(s.x, s.z);
      if (along < 20 || along > 228 || Math.abs(across) > 62 || s.size < 0.9) continue;
      const count = 3 + Math.floor(kin.next() * 3);
      for (let i = 0; i < count; i++) {
        const size = Math.max(0.28, s.size * (0.1 + 0.34 * kin.next() ** 2));
        const turn = kin.range(0, Math.PI * 2);
        const out = s.size * (0.5 + 0.75 * kin.next());
        const a = along + Math.cos(turn) * out;
        const c = across + Math.sin(turn) * out;
        if (!clear(a, c, size)) continue;
        const [x, z] = onAxis(a, c);
        small.push({ x, z, size });
      }
    }
    for (let i = 0; i < 2600; i++) {
      const along = kin.range(34, 222);
      const across = kin.range(-52, 52);
      const size = 0.3 + 1.1 * kin.next() ** 3;
      if (vnoise(along / 9 + 13, across / 9 + 4) < 0.58 || !clear(along, across, size)) continue;
      const [x, z] = onAxis(along, across);
      small.push({ x, z, size });
    }
    for (const s of small) if (landHeight(s.x, s.z) > -0.1) (stones[1] as Stone[]).push(s);
  }
  for (let i = 0; i < 5200; i++) {
    const b = rng.range(150, 216);
    const out = -0.6 + 26 * rng.next() ** 1.7;
    const r = shoreAt(b) + out;
    const a = b * DEG;
    const size = 0.06 + 0.42 * rng.next() ** 4;
    // They lie gathered, in heaps and strings with bare gravel between, and only a stone here and there alone.
    const heap = 0.65 * vnoise(Math.sin(a) * r / 8 + 21, -Math.cos(a) * r / 8 + 5) + 0.35 * vnoise(Math.sin(a) * r / 2.7, -Math.cos(a) * r / 2.7 + 9);
    if (heap < 0.56 && (((i * 2654435761) >>> 0) / 4294967296) > 0.06) continue;
    put(Math.sin(a) * r, -Math.cos(a) * r, size * (1 + 1.4 * smooth(0.56, 0.75, heap)));
  }
  // The fan under the spur: blocks of every size from a man's head to a hut, thick at its sides and thinner down its middle.
  for (let i = 0; i < 1500; i++) {
    const along = rng.range(31, 122);
    const across = rng.range(PATCH.across0 + 6, PATCH.across1 - 6);
    const size = 0.45 + 4.2 * rng.next() ** 2.6;
    if (along > 84 && Math.abs(across) < 3.2 + size) continue;
    if (Math.abs(across - streamAcross(along)) < 1.4 + size * 0.7) continue;
    if (vnoise(along / 16 + 31, across / 16 + 7) < 0.3 + 0.2 * smooth(40, 8, Math.abs(across)) && size < 2.4) continue;
    const [x, z] = onAxis(along, across);
    put(x, z, size);
  }
  // The shingle before the shore camera: real stones from a pebble to a small boulder, thickest near the lens and at the water, some of
  // them standing in it. The ground between them is drawn stone by stone in the shader; these are the ones that catch the light.
  {
    const from = KEYS.shore.position;
    const to = KEYS.shore.aim;
    const reach = Math.hypot(to[0] - from[0], to[2] - from[2]);
    const fx = (to[0] - from[0]) / reach;
    const fz = (to[2] - from[2]) / reach;
    for (let i = 0; i < 13000; i++) {
      const ahead = 2 + 26 * rng.next() ** 1.5;
      const aside = rng.range(-1, 1) * (3.5 + 0.42 * ahead);
      // Mostly small, a cobble here and there, and now and then a stone the size of a head.
      const size = 0.03 + 0.2 * rng.next() ** 3.2 + 0.3 * (((i * 2654435761) >>> 0) / 4294967296) ** 14;
      const x = from[0] + fx * ahead - fz * aside;
      const z = from[2] + fz * ahead + fx * aside;
      const ground = landHeight(x, z);
      if (ground < -0.1 - 0.4 * size) continue;
      // In the flooded shallows only the stones that stand out of the water are kept, and fewer of them.
      if (ground < 0.0 && (size < 0.05 || vnoise(x / 0.9 + 3, z / 0.9 + 8) < (ahead < 13 ? 0.22 : 0.55))) continue;
      const flooded = ground < 0.0 && ahead < 13;
      // They lie in drifts: bare grit between, where only the larger ones stand.
      if (vnoise(x / 1.7 + 5, z / 1.7 + 2) < 0.3 && size < 0.09) continue;
      if (!flooded && vnoise(x / 3.4 + 11, z / 3.4 + 7) < 0.46 && size < 0.14) continue;
      put(x, z, size);
    }
  }

  const boulder = { tScree: rock.tScree as THREE.IUniform, tScreeH: rock.tScreeH as THREE.IUniform };
  const stoneMaterial = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, ...boulder }, vertexShader: STONE_VERTEX, fragmentShader: STONE_FRAGMENT });
  stoneMaterial.userData.depthFragment = NEAR_DEPTH;
  const dummy = new THREE.Object3D();
  const scree: THREE.InstancedMesh[] = [];
  const discs: { x: number; z: number; size: number }[] = [];
  // The stones that stand in the stream: the water is told of each, and each is a block like the rest.
  const STREAM_TO = PATCH.along1 + 60;
  const wash = ctx.rng('stream');
  const standing = standingStones(() => wash.next(), STREAM_TO);
  const inStream: Stone[] = [];
  for (const s of standing) {
    if (s.radius <= 0) continue;
    const [x, z] = onAxis(s.along, streamAcross(s.along) + s.off);
    inStream.push({ x, z, size: s.radius / 0.58, wet: true });
  }
  // And boulders down both its banks, their feet in it.
  for (let along = 3; along < STREAM_TO; along += 1.6 + 2.4 * wash.next()) {
    const side = wash.next() < 0.5 ? -1 : 1;
    const size = 0.6 + 2.1 * wash.next() ** 2;
    const off = side * (1.5 + 1.2 * vnoise(along / 9, 3.3) + size * 0.42 + 0.9 * wash.next());
    const [x, z] = onAxis(along, streamAcross(along) + off);
    if (landHeight(x, z) > -0.1) inStream.push({ x, z, size, wet: true });
  }
  // The pebbles of the shore keep their own small shapes.
  {
    const list = stones[2] as Stone[];
    const VARIANTS = 7;
    for (let k = 0; k < VARIANTS; k++) {
      // The larger ones are cut finer: their outlines are seen. Seven shapes, so that no two neighbours are the same stone.
      const mine = list.filter((s, i) => (s.size > 0.1 ? i % 3 : 3 + (i % 4)) === k);
      if (mine.length === 0) continue;
      // Most are worn round by the lake; two shapes in seven are broken pieces that have come down the fan since.
      const fine = k < 3 ? 2 : 1;
      const geometry = mergeVertices((k === 2 || k === 6 ? stoneGeometry(6 + k + 1, fine) : pebbleGeometry(6 + k + 1, fine)).deleteAttribute('uv').deleteAttribute('normal'));
      geometry.computeVertexNormals();
      const tints = new Float32Array(mine.length * 3);
      const mesh = new THREE.InstancedMesh(geometry, stoneMaterial, mine.length);
      mine.forEach((s, i) => {
        const sink = rng.range(0.18, 0.5);
        dummy.position.set(s.x, landHeight(s.x, s.z) - sink * s.size * 0.72 + 0.3 * s.size, s.z);
        dummy.rotation.set(rng.range(-0.35, 0.35), rng.range(0, Math.PI * 2), rng.range(-0.35, 0.35));
        dummy.scale.set(s.size * rng.range(0.75, 1.25), s.size * rng.range(0.6, 1.1), s.size * rng.range(0.75, 1.25));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        tints[i * 3] = rng.next();
        tints[i * 3 + 1] = rng.next();
        tints[i * 3 + 2] = rng.next();
        if (s.size > 0.4) discs.push(s);
      });
      geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3));
      // They lie in one drift before the shore camera: a lens that does not hold the drift does not draw them.
      mesh.computeBoundingSphere();
      scree.push(mesh);
      ctx.scene.add(mesh);
    }
  }
  // The blocks: each a broken stone raised from the atlas. How finely one is cut goes by how near a camera ever comes to it.
  const blockMaterials: THREE.ShaderMaterial[] = [];
  const balls: THREE.BufferGeometry[] = [];
  const block = blockUniforms(ctx);
  {
    const eyes = [KEYS.wide.position, KEYS.mats.position, KEYS.edge.position, KEYS.shore.position, KEYS.centre.position];
    // How finely a block is cut goes by its size and by how near the wide camera ever passes: that camera comes down the axis.
    const classes: { detail: number; smoothing: number; list: Stone[] }[] = [
      { detail: 12, smoothing: 0, list: [] },
      { detail: 6, smoothing: 1, list: [] },
      { detail: 3, smoothing: 2, list: [] },
      { detail: 2, smoothing: 3, list: [] },
      { detail: 1, smoothing: 3, list: [] },
    ];
    for (const s of [...(stones[0] as Stone[]), ...(stones[1] as Stone[]), ...inStream]) {
      let reach = Infinity;
      for (const e of eyes) reach = Math.min(reach, Math.hypot(s.x - e[0], s.z - e[2]));
      const [along, across] = axisOf(s.x, s.z);
      const pass = Math.hypot(Math.max(0, Math.abs(along - 150) - 52), across);
      const k = pass < 48 && s.size > 2.3 ? 0 : pass < 90 && s.size > 1.1 ? 1 : pass < 40 || (reach < 330 && s.size > 1.1) ? 2 : reach < 330 ? 3 : 4;
      (classes[k] as { list: Stone[] }).list.push(s);
      if (s.size > 0.5 && (s.size <= 2.2 || Math.hypot(s.x, s.z) < 1300)) discs.push(s);
    }
    for (const c of classes) {
      if (c.list.length === 0) continue;
      const ball = ballGeometry(c.detail);
      const tints = new Float32Array(c.list.length * 3);
      const seats = new Float32Array(c.list.length * 4);
      const placed = new Float32Array(c.list.length * 16);
      const material = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, ...block, uSmooth: { value: c.smoothing } }, vertexShader: BLOCK_VERTEX, fragmentShader: BLOCK_FRAGMENT });
      material.userData.depthFragment = NEAR_DEPTH;
      blockMaterials.push(material);
      c.list.forEach((s, i) => {
        // A stone of the atlas is about 0.8 from its middle to its faces.
        const half = s.size * 0.58;
        const sy = half * rng.range(0.6, 1.0);
        const ground = landHeight(s.x, s.z);
        const e = Math.max(0.4, s.size * 0.5);
        // It lies bedded in the slope: a third of it and more is under the ground.
        const gx = (landHeight(s.x + e, s.z) - landHeight(s.x - e, s.z)) / (2 * e);
        const gz = (landHeight(s.x, s.z + e) - landHeight(s.x, s.z - e)) / (2 * e);
        // On a slope it is sunk by as much again as its downhill side would stand clear.
        dummy.position.set(s.x, ground + sy * rng.range(0.06, 0.36) - 0.28 * half * Math.min(1, Math.hypot(gx, gz)), s.z);
        dummy.rotation.set(rng.range(-0.4, 0.4), rng.range(0, Math.PI * 2), rng.range(-0.4, 0.4));
        dummy.scale.set(half * rng.range(0.8, 1.3), sy, half * rng.range(0.8, 1.3));
        dummy.updateMatrix();
        dummy.matrix.toArray(placed, i * 16);
        tints[i * 3] = rng.next();
        tints[i * 3 + 1] = rng.next();
        tints[i * 3 + 2] = rng.next();
        // The stone it is, and eight more if it stands in the stream.
        seats[i * 4] = (Math.floor(rng.next() * 8) % 8) + (s.wet ? 8 : 0);
        seats[i * 4 + 1] = ground;
        seats[i * 4 + 2] = gx;
        seats[i * 4 + 3] = gz;
      });
      // The stones go to the lens in lots, each lot the stones of one stretch of ground: a lot the lens does not hold is not drawn, and
      // raising a stone is where its cost lies. The crater is cut in sectors of 20 degrees about the lake, the spur in lengths of 40 m.
      const lots = new Map<number, number[]>();
      c.list.forEach((s, i) => {
        const [along, across] = axisOf(s.x, s.z);
        const onSpur = along > -10 && along < 340 && Math.abs(across) < 130;
        const lot = onSpur ? 100 + Math.floor((along + 10) / 40) : Math.floor(((Math.atan2(s.x, -s.z) / DEG + 360) % 360) / 20);
        const list = lots.get(lot);
        if (list) list.push(i);
        else lots.set(lot, [i]);
      });
      for (const key of [...lots.keys()].sort((a, b) => a - b)) {
        const lot = lots.get(key) as number[];
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(ball.getIndex());
        geometry.setAttribute('position', ball.getAttribute('position'));
        const lotTints = new Float32Array(lot.length * 3);
        const lotSeats = new Float32Array(lot.length * 4);
        const mesh = new THREE.InstancedMesh(geometry, material, lot.length);
        let largest = 0;
        lot.forEach((i, k) => {
          mesh.setMatrixAt(k, dummy.matrix.fromArray(placed, i * 16));
          lotTints.set(tints.subarray(i * 3, i * 3 + 3), k * 3);
          lotSeats.set(seats.subarray(i * 4, i * 4 + 4), k * 4);
          largest = Math.max(largest, (c.list[i] as Stone).size);
        });
        geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(lotTints, 3));
        geometry.setAttribute('aSeat', new THREE.InstancedBufferAttribute(lotSeats, 4));
        // The ball is raised into a stone past its own round: the lot's bound is let out by as much.
        mesh.computeBoundingSphere();
        (mesh.boundingSphere as THREE.Sphere).radius += largest;
        scree.push(mesh);
        ctx.scene.add(mesh);
      }
      balls.push(ball);
    }
  }
  ctx.parts.built('scree', scree[0] as THREE.InstancedMesh, ...scree.slice(1));
  const shade = ctx.rig.contactDiscs(discs.length * 2);
  discs.forEach((s, i) => {
    // Under the stone itself the sky is hidden whatever the sun does.
    ctx.rig.setDisc(shade, discs.length + i, s.x, s.z, s.size * 1.2, 0.95);
    // The shade lies along the ground away from the sun, as long as a low sun throws it, and thins with its length.
    const reach = Math.min(3.2, ctx.rig.sun.stretch * 0.5);
    const yaw = ctx.rig.sun.shadowYaw;
    const off = s.size * (reach - 1) * 0.8;
    // The spur and the south shore are in the shade of the evening: no stone there throws a shadow of its own.
    const [along, across] = axisOf(s.x, s.z);
    const shaded = along > -20 && along < 260 && Math.abs(across) < 110;
    ctx.rig.setDisc(shade, i, s.x - ctx.rig.sun.direction.x * off, s.z - ctx.rig.sun.direction.z * off, s.size * 1.15, shaded ? 0 : 0.8, reach, yaw);
  });

  const stream = createStream(ctx, standing, STREAM_TO, block.tGrit?.value as THREE.Texture);
  ctx.scene.add(ctx.parts.built('stream', stream.mesh));

  return {
    beforeSample: () => {
      // While a picture of the far world is hung, the brow is in the picture.
      brow.visible = (ctx.rig.uniforms.uNear as THREE.IUniform<THREE.Vector4>).value.w < 0.5;
    },
    dispose: () => {
      for (const m of [socket, patch, brow, ...scree]) m.geometry.dispose();
      for (const b of balls) b.dispose();
      for (const m of [socketMaterial, patchMaterial, browMaterial, stoneMaterial, ...blockMaterials]) m.dispose();
      stream.dispose();
    },
  };
}

export { AXIS };
