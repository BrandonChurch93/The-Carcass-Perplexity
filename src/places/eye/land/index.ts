// The land of the Eye: the socket of pale cliffs with its aprons of scree, the brow that hangs over the east shore, the loose stone,
// and the stream that leaves the lake through the rim beside the wide camera.
import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DEG, shoreAt, smooth } from '../layout';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { vnoise } from '../shared/noise';
import { KEYS } from '../cameras';
import { AXIS, browCover, landHeight, onAxis, streamAcross, streamBed, wallAt } from './height';
import { PATCH, browGeometry, patchGeometry, socketGeometry, stoneGeometry } from './meshes';
import { ROCK_GLSL, rockUniforms } from './rock';

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
  float damp = smoothstep(1.9, 0.5, vWorld.y + 0.5 * vnoise(vWorld.xz * 0.7)) * (1.0 - face);
  // Under a low eye the wet is a thin dark band above the water and the stones beyond it are dry.
  damp = mix(damp, smoothstep(0.2, 0.05, vWorld.y + 0.12 * vnoise(vWorld.xz * 2.1)) * (1.0 - face), smoothstep(12.0, 4.0, cameraPosition.y));
  k.albedo *= mix(1.0, 0.3, damp) * mix(1.0, 0.28, smoothstep(0.03, -0.12, vWorld.y) * (1.0 - face));
  k.rough = mix(k.rough, 0.8, damp);
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
  // A block is a piece of the scree: the plate of the slope on its three faces, each block from another part of it.
  vec2 at = vTint.yz * 40.0;
  // The plate is a slope of many stones: a block shows a small piece of it large, so that it is one stone with its own cracks, not a heap.
  float grain = mix(0.3, 1.0, smoothstep(12.0, 4.0, cameraPosition.y));
  vec2 ux = vWorld.zy * grain + at;
  vec2 uy = vWorld.xz * grain + at.yx;
  vec2 uz = vWorld.xy * grain - at;
  vec4 col = screeAt(ux) * w.x + screeAt(uy) * w.y + screeAt(uz) * w.z;
  float e = 0.05;
  vec2 d = vec2(screeAt(ux + vec2(e, 0.0)).a - screeAt(ux - vec2(e, 0.0)).a, screeAt(ux + vec2(0.0, e)).a - screeAt(ux - vec2(0.0, e)).a) * w.x
    + vec2(screeAt(uy + vec2(e, 0.0)).a - screeAt(uy - vec2(e, 0.0)).a, screeAt(uy + vec2(0.0, e)).a - screeAt(uy - vec2(0.0, e)).a) * w.y
    + vec2(screeAt(uz + vec2(e, 0.0)).a - screeAt(uz - vec2(e, 0.0)).a, screeAt(uz + vec2(0.0, e)).a - screeAt(uz - vec2(0.0, e)).a) * w.z;
  vec3 albedo = mix(col.rgb, vec3(dot(col.rgb, vec3(0.33))) , 0.6) * vec3(1.32, 1.36, 1.4) * (0.8 + 0.4 * vTint.x);
  vec3 nh = vec3(0.5, 0.5, col.a);
  vec3 t = normalize(cross(n, vec3(0.31, 0.9, 0.3)));
  vec3 b = cross(n, t);
  n = normalize(n - (t * d.x + b * d.y) * 3.0);
  // Where the stone meets the ground it is in its own shade, and wet where the ground is.
  vec4 land = landAt(vWorld.xz);
  float foot = smoothstep(0.0, 0.35, vWorld.y - max(land.r, 0.0) + 0.08);
  // Under a low eye the stones are pebbles: the top of each is in the light whatever its height, only its foot is wet, and each has a tone of its own.
  float lowEye = smoothstep(12.0, 4.0, cameraPosition.y);
  // A pebble is one stone of one tone: the plate of the scree, made for blocks, would blotch it.
  albedo = mix(albedo, vec3(0.4, 0.31, 0.22) * (0.85 + 0.3 * vnoise(vWorld.xz * 60.0 + vWorld.y * 40.0)), 0.8 * lowEye);
  foot = max(foot, lowEye * smoothstep(-0.1, 0.6, normalize(vNormal).y));
  float damp = smoothstep(mix(0.3, 0.07, lowEye), 0.01, vWorld.y);
  // The last half metre of shore before the water is wet: its stones are dark.
  damp = max(damp, 0.75 * lowEye * smoothstep(0.1, 0.03, max(land.r, 0.0)));
  albedo *= mix(1.0, 0.55, damp) * mix(vec3(1.0), mix(vec3(0.5, 0.5, 0.52), vec3(1.5, 1.44, 1.3), vTint.y * vTint.y) * mix(vec3(1.0), vec3(1.15, 0.9, 0.68), step(0.8, vTint.z)), lowEye);
  vec3 c = rigShade(vWorld, n, v, clamp(albedo, 0.0, 0.9), mix(0.9, 0.4, damp), (0.45 + 0.55 * smoothstep(0.05, 0.5, nh.b)) * mix(0.45, 1.0, foot));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const STREAM_VERTEX = /* glsl */ `
attribute vec2 aFlow;
varying vec3 vWorld;
varying vec2 vFlow;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vFlow = aFlow;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// aFlow: x is metres along the stream, y is -1 to 1 across it.
const STREAM_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec2 vFlow;
uniform float uFall[3];
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  // It runs toward the lake: fast and white on the steps and down the face of the spur, slow in the pools between.
  float run = smoothstep(108.0, 98.0, vFlow.x) * smoothstep(26.0, 44.0, vFlow.x);
  for (int i = 0; i < 3; i++) run += smoothstep(3.0, 0.0, abs(vFlow.x - uFall[i]));
  run = min(run, 1.0);
  float speed = 0.9 + 2.6 * run;
  vec2 q = vec2(vFlow.x + uTime * speed, vFlow.y * 2.2);
  vec2 q2 = vec2(vFlow.x + uTime * speed * 0.6, vFlow.y * 2.2);
  float a = fbm(q * vec2(1.3, 2.0));
  float b = fbm(q2 * vec2(3.1, 5.0) + 7.0);
  float e = 0.12;
  float ax = fbm((q + vec2(e, 0.0)) * vec2(1.3, 2.0)) - a;
  float ay = fbm((q + vec2(0.0, e)) * vec2(1.3, 2.0)) - a;
  vec3 n = normalize(vec3(-ax * (2.0 + 5.0 * run), 1.0, -ay * (2.0 + 5.0 * run)));
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  float open = skyOpen(vWorld);
  vec3 bed = vec3(0.2, 0.17, 0.13) * (0.5 + 0.8 * b) * (skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * uSunDir.y * sunAt(vWorld)) / 3.14159;
  // Seen from above it is a dark thread of water between its stones, not a pale ribbon.
  float high = smoothstep(12.0, 40.0, cameraPosition.y);
  vec3 c = mix(bed * mix(1.0, 0.6, high), skyRadiance(r) * mix(0.35, 1.0, open) * 0.5, f * mix(0.8, 0.35, high));
  // White water where the bed drops, and a pale edge where it laps the stones.
  float foam = smoothstep(0.52, 0.8, a + 0.5 * b * run) * run + smoothstep(0.86, 1.0, abs(vFlow.y)) * 0.25 * smoothstep(0.4, 0.7, b);
  vec3 white = vec3(0.75, 0.78, 0.8) * (skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * uSunDir.y * sunAt(vWorld)) / 3.14159;
  c = mix(c, white, clamp(foam, 0.0, 1.0) * mix(0.6, 0.25, high));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

interface Stone {
  x: number;
  z: number;
  size: number;
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
  for (const [along, across, size] of near) {
    const [x, z] = onAxis(along, across);
    put(x, z, size);
  }
  for (let i = 0; i < 5200; i++) {
    const b = rng.range(150, 216);
    const out = -0.6 + 26 * rng.next() ** 1.7;
    const r = shoreAt(b) + out;
    const a = b * DEG;
    put(Math.sin(a) * r, -Math.cos(a) * r, 0.06 + 0.42 * rng.next() ** 4);
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
      const size = 0.03 + 0.2 * rng.next() ** 3.2;
      const x = from[0] + fx * ahead - fz * aside;
      const z = from[2] + fz * ahead + fx * aside;
      if (landHeight(x, z) < -0.1 - 0.4 * size) continue;
      if (vnoise(x / 1.7 + 5, z / 1.7 + 2) < 0.3 && size < 0.09) continue;
      put(x, z, size);
    }
  }

  const boulder = { tScree: rock.tScree as THREE.IUniform, tScreeH: rock.tScreeH as THREE.IUniform };
  const stoneMaterial = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, ...boulder }, vertexShader: STONE_VERTEX, fragmentShader: STONE_FRAGMENT });
  stoneMaterial.userData.depthFragment = NEAR_DEPTH;
  const dummy = new THREE.Object3D();
  const scree: THREE.InstancedMesh[] = [];
  const discs: { x: number; z: number; size: number }[] = [];
  stones.forEach((list, tier) => {
    const VARIANTS = 3;
    for (let k = 0; k < VARIANTS; k++) {
      const mine = list.filter((_, i) => i % VARIANTS === k);
      if (mine.length === 0) continue;
      const merged = mergeVertices(stoneGeometry(tier * 3 + k + 1, tier === 0 ? 3 : tier === 1 ? 2 : 1).deleteAttribute('uv').deleteAttribute('normal'));
      merged.computeVertexNormals();
      // The blocks are broken stone: their faces meet in edges.
      const geometry = tier < 2 ? toCreasedNormals(merged, 0.5) : merged;
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
        if (s.size > 0.4 && tier > 0) discs.push(s);
        else if (tier === 0 && Math.hypot(s.x, s.z) < 1300) discs.push(s);
      });
      geometry.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3));
      mesh.frustumCulled = false;
      scree.push(mesh);
      ctx.scene.add(mesh);
    }
  });
  ctx.parts.built('scree', scree[0] as THREE.InstancedMesh, ...scree.slice(1));
  const shade = ctx.rig.contactDiscs(discs.length);
  discs.forEach((s, i) => {
    // The shade lies along the ground away from the sun, as long as a low sun throws it, and thins with its length.
    const reach = Math.min(3.2, ctx.rig.sun.stretch * 0.5);
    const yaw = ctx.rig.sun.shadowYaw;
    const off = s.size * (reach - 1) * 0.8;
    ctx.rig.setDisc(shade, i, s.x - ctx.rig.sun.direction.x * off, s.z - ctx.rig.sun.direction.z * off, s.size * 1.15, 0.8, reach, yaw);
  });

  // The stream: a ribbon of water laid in the bed of the ravine.
  const STEP = 0.5;
  const FROM = 30;
  const TO = PATCH.along1 + 60;
  const ACROSS = 7;
  const count = Math.round((TO - FROM) / STEP) + 1;
  const position = new Float32Array(count * ACROSS * 3);
  const flow = new Float32Array(count * ACROSS * 2);
  for (let i = 0; i < count; i++) {
    const along = FROM + i * STEP;
    const half = (1.0 + 0.8 * vnoise(along / 9, 3.3)) * (1 - 0.6 * smooth(40, 30, along));
    const level = streamBed(along) + 0.3 - 0.05 * smooth(10, 40, along);
    for (let j = 0; j < ACROSS; j++) {
      const side = (j / (ACROSS - 1)) * 2 - 1;
      const [x, z] = onAxis(along, streamAcross(along) + side * half);
      const o = (i * ACROSS + j) * 3;
      position[o] = x;
      position[o + 1] = level;
      position[o + 2] = z;
      flow[(i * ACROSS + j) * 2] = along;
      flow[(i * ACROSS + j) * 2 + 1] = side;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    for (let j = 0; j < ACROSS - 1; j++) {
      const a = i * ACROSS + j;
      const b = a + ACROSS;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const streamGeometry = new THREE.BufferGeometry();
  streamGeometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  streamGeometry.setAttribute('aFlow', new THREE.BufferAttribute(flow, 2));
  streamGeometry.setIndex(index);
  const streamMaterial = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, uFall: { value: [114, 128.5, 143] } },
    vertexShader: STREAM_VERTEX,
    fragmentShader: STREAM_FRAGMENT,
    side: THREE.DoubleSide,
  });
  const stream = new THREE.Mesh(streamGeometry, streamMaterial);
  stream.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('stream', stream));

  return {
    beforeSample: () => {
      // While a picture of the far world is hung, the brow is in the picture.
      brow.visible = (ctx.rig.uniforms.uNear as THREE.IUniform<THREE.Vector4>).value.w < 0.5;
    },
    dispose: () => {
      for (const m of [socket, patch, brow, stream, ...scree]) m.geometry.dispose();
      for (const m of [socketMaterial, patchMaterial, browMaterial, stoneMaterial, streamMaterial]) m.dispose();
    },
  };
}

export { AXIS };
