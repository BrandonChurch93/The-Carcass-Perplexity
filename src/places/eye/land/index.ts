// The land of the Eye: the socket of pale cliffs with its aprons of scree, the brow that hangs over the east shore, the loose stone,
// and the stream that leaves the lake through the rim beside the wide camera.
import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DEG, shoreAt, smooth } from '../layout';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { vnoise } from '../shared/noise';
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
  if (inPatch(vWorld)) discard;
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float face = smoothstep(0.8, 0.52, n.y);
  Rock k = rockAt(vWorld, n, face);
  // The damp line at the water, and the stone that the lake has wetted darker.
  vec4 land = landAt(vWorld.xz);
  float damp = smoothstep(0.42, 0.03, vWorld.y + 0.1 * vnoise(vWorld.xz * 0.7)) * (1.0 - face);
  k.albedo *= mix(1.0, 0.5, damp) * mix(1.0, 0.55, smoothstep(0.0, -0.12, vWorld.y) * (1.0 - face));
  k.rough = mix(k.rough, 0.35, damp * 0.8);
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
${CUT_GLSL}
void main() {
  if (inPatch(vWorld)) discard;
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
  vLocal = position * length(instanceMatrix[0].xyz) + aTint.z * 37.0;
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vTint = aTint;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const STONE_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec3 vTint;
uniform sampler2D tBoulder;
uniform sampler2D tBoulderNh;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 w = pow(abs(n), vec3(4.0));
  w /= w.x + w.y + w.z;
  float size = 2.6;
  vec2 ux = vLocal.zy / size;
  vec2 uy = vLocal.xz / size;
  vec2 uz = vLocal.xy / size;
  vec3 col = texture2D(tBoulder, ux).rgb * w.x + texture2D(tBoulder, uy).rgb * w.y + texture2D(tBoulder, uz).rgb * w.z;
  vec3 nh = texture2D(tBoulderNh, ux).rgb * w.x + texture2D(tBoulderNh, uy).rgb * w.y + texture2D(tBoulderNh, uz).rgb * w.z;
  vec3 albedo = vec3(0.4, 0.375, 0.34) * (0.35 + 9.5 * dot(col, vec3(0.33))) * (0.72 + 0.5 * vTint.x) * mix(vec3(0.92, 0.95, 1.0), vec3(1.08, 1.0, 0.9), vTint.y);
  vec2 d = nh.xy * 2.0 - 1.0;
  vec3 t = normalize(cross(n, vec3(0.31, 0.9, 0.3)));
  vec3 b = cross(n, t);
  n = normalize(n + (t * d.x + b * d.y) * 0.5);
  // Where the stone meets the ground it is in its own shade, and wet where the ground is.
  vec4 land = landAt(vWorld.xz);
  float foot = smoothstep(0.0, 0.35, vWorld.y - max(land.r, 0.0) + 0.08);
  float damp = smoothstep(0.3, 0.02, vWorld.y);
  albedo *= mix(1.0, 0.55, damp);
  vec3 c = rigShade(vWorld, n, v, clamp(albedo, 0.0, 0.9), 0.9, (0.45 + 0.55 * smoothstep(0.05, 0.5, nh.b)) * mix(0.45, 1.0, foot));
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
  float run = smoothstep(108.0, 98.0, vFlow.x) * smoothstep(14.0, 24.0, vFlow.x);
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
  vec3 c = mix(bed, skyRadiance(r) * mix(0.35, 1.0, open), f);
  // White water where the bed drops, and a pale edge where it laps the stones.
  float foam = smoothstep(0.52, 0.8, a + 0.5 * b * run) * run + smoothstep(0.86, 1.0, abs(vFlow.y)) * 0.25 * smoothstep(0.4, 0.7, b);
  vec3 white = vec3(0.75, 0.78, 0.8) * (skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * uSunDir.y * sunAt(vWorld)) / 3.14159;
  c = mix(c, white, clamp(foam, 0.0, 1.0));
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

  const boulder = { tBoulder: { value: ctx.assets.texture('land/boulder.jpg', { anisotropy: 2 }) }, tBoulderNh: { value: ctx.assets.texture('land/boulder-nh.png', { kind: 'data', anisotropy: 2 }) } };
  const stoneMaterial = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, ...boulder }, vertexShader: STONE_VERTEX, fragmentShader: STONE_FRAGMENT });
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
  const FROM = -14;
  const TO = PATCH.along1 + 60;
  const ACROSS = 7;
  const count = Math.round((TO - FROM) / STEP) + 1;
  const position = new Float32Array(count * ACROSS * 3);
  const flow = new Float32Array(count * ACROSS * 2);
  for (let i = 0; i < count; i++) {
    const along = FROM + i * STEP;
    const half = (1.0 + 0.8 * vnoise(along / 9, 3.3)) * (1 + 2.5 * smooth(18, -10, along));
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
    dispose: () => {
      for (const m of [socket, patch, brow, stream, ...scree]) m.geometry.dispose();
      for (const m of [socketMaterial, patchMaterial, browMaterial, stoneMaterial, streamMaterial]) m.dispose();
    },
  };
}

export { AXIS };
