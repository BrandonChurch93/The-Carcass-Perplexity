// The skeleton on the lip: one of the herd, long dead, lying where the floor stops with the mats grown over its feet.
// It is the picture of a skeleton and the relief of that picture: a sheet raised by the relief, so that the cage of the ribs stands
// off the ground and turns as the camera moves, lit by the place.
import * as THREE from 'three';
import { KEYS } from '../cameras';
import { DEG } from '../layout';
import { lipAt } from '../land/height';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const PARTS: readonly string[] = ['skeleton'];

/** Where it lies: on the lip, ahead and to the right of the camera of the edge shot. Its length in metres, how far its bones stand off its sheet, and how far the sheet is tipped up off the ground toward that camera, in degrees. */
export const BONES = { ahead: 6.4, right: 16, back: 0.7, length: 3.3, stand: 0.22, tip: 36, along: 112 };

const VERTEX = /* glsl */ `
uniform sampler2D tBoneH;
uniform float uStand;
varying vec3 vWorld;
varying vec2 vUv;
varying vec3 vAcross;
varying vec3 vUp;
varying vec3 vOut;
void main() {
  vUv = uv;
  // A softened read of the relief: the form of each bone, without its grain.
  float h = textureLod(tBoneH, uv, 5.0).r;
  vec4 w = modelMatrix * vec4(position + normal * (h * uStand), 1.0);
  vWorld = w.xyz;
  vAcross = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
  vUp = normalize(mat3(modelMatrix) * vec3(0.0, 1.0, 0.0));
  vOut = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D tBone;
uniform sampler2D tBoneH;
varying vec3 vWorld;
varying vec2 vUv;
varying vec3 vAcross;
varying vec3 vUp;
varying vec3 vOut;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  float h = texture2D(tBoneH, vUv).r;
  if (h < 0.06) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 e = vec2(0.0025, 0.0);
  vec2 g = vec2(textureLod(tBoneH, vUv + e.xy, 1.5).r - textureLod(tBoneH, vUv - e.xy, 1.5).r, textureLod(tBoneH, vUv + e.yx * 3.0, 1.5).r - textureLod(tBoneH, vUv - e.yx * 3.0, 1.5).r);
  vec3 n = normalize(vOut - (vAcross * g.x + vUp * g.y) * 1.1);
  // Old bone: ivory where the air has had it, stained amber where it lies in the weed.
  vec3 picture = texture2D(tBone, vUv).rgb;
  float grey = dot(picture, vec3(0.3, 0.5, 0.2));
  vec3 bone = mix(picture, vec3(grey) * vec3(0.92, 0.93, 0.84), 0.85) * 2.9;
  // Weathered: each bone has its stains, dark in its hollows and its ends.
  bone *= (0.62 + 0.5 * vnoise(vUv * vec2(60.0, 20.0))) * (0.55 + 0.45 * smoothstep(0.08, 0.45, h));
  float low = smoothstep(0.14, 0.0, vWorld.y + 0.1 * (vnoise(vWorld.xz * 5.0) - 0.5));
  vec3 albedo = mix(bone, bone * vec3(0.62, 0.36, 0.14), 0.6 * low);
  // The weed of the shelf has grown over it: strands lie across the low bones and hang from the ribs.
  float lie = vnoise(vec2(dot(vWorld.xz, vec2(0.82, 0.57)) * 26.0, dot(vWorld.xz, vec2(-0.57, 0.82)) * 2.2 + 3.0 * vnoise(vWorld.xz * 1.7)));
  float grown = smoothstep(0.6, 0.72, lie) * smoothstep(0.3, 0.05, vWorld.y + 0.2 * (vnoise(vWorld.xz * 2.3 + 9.0) - 0.5));
  albedo = mix(albedo, vec3(0.3, 0.13, 0.035) * (0.6 + 0.8 * vnoise(vWorld.xz * 40.0)), 0.85 * grown);
  vec3 c = rigShade(vWorld, n, v, clamp(albedo, 0.0, 0.92), 0.75, 0.35 + 0.65 * smoothstep(0.1, 0.55, h));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const DEPTH = /* glsl */ `
uniform sampler2D tBoneH;
varying vec2 vUv;
void main() {
  if (texture2D(tBoneH, vUv).r < 0.06) discard;
  gl_FragColor = vec4(0.0);
}`;

export function create(ctx: Context): Piece {
  const picture = ctx.assets.texture('mat/skeleton.jpg', { anisotropy: 8 });
  const relief = ctx.assets.texture('mat/skeleton-h.png', { kind: 'data', anisotropy: 4 });
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, tBone: { value: picture }, tBoneH: { value: relief }, uStand: { value: BONES.stand } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.DoubleSide,
  });
  material.userData.depthFragment = DEPTH;
  const tall = (BONES.length * 724) / 2172;
  const geometry = new THREE.PlaneGeometry(BONES.length, tall, 360, 120);
  geometry.translate(0, tall / 2, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  // Ahead and to the right of the camera of the edge shot, then out to the rim of the lip from there.
  const from = KEYS.edge.position;
  const px = from[0] + Math.sin(BONES.right * DEG) * BONES.ahead;
  const pz = from[2] - Math.cos(BONES.right * DEG) * BONES.ahead;
  const a = Math.atan2(px, -pz);
  const r = lipAt(a) + BONES.back;
  const x = Math.sin(a) * r;
  const z = -Math.cos(a) * r;
  // Along the lip, its neck toward the left of the edge shot, its sheet tipped up toward that camera.
  const along = new THREE.Vector3(Math.sin(BONES.along * DEG), 0, -Math.cos(BONES.along * DEG));
  const toCamera = new THREE.Vector3(Math.sin((BONES.along + 90) * DEG), 0, -Math.cos((BONES.along + 90) * DEG));
  const up = toCamera.clone().multiplyScalar(-Math.cos(BONES.tip * DEG)).add(new THREE.Vector3(0, Math.sin(BONES.tip * DEG), 0));
  const out = new THREE.Vector3().crossVectors(along, up);
  mesh.matrixAutoUpdate = false;
  mesh.matrix.makeBasis(along, up, out).setPosition(x + toCamera.x * 0.5 - along.x * 0.9, -0.06, z + toCamera.z * 0.5 - along.z * 0.9);
  mesh.matrixWorldNeedsUpdate = true;
  ctx.scene.add(ctx.parts.built('skeleton', mesh));
  const shade = ctx.rig.contactDiscs(1);
  ctx.rig.setDisc(shade, 0, x + toCamera.x * 1.2 - along.x * 0.9, z + toCamera.z * 1.2 - along.z * 0.9, 1.9, 0.5, 1.0, ctx.rig.sun.shadowYaw);
  return {
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
