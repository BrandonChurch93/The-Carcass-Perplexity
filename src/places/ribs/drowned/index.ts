// The drowned one: a kite-wing the last bore left in the weed of the first rib, head down, sodden, with the weed grown through it and crabs on it.
import * as THREE from 'three';
import { DROWNED, WIND } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { RIG_GLSL } from '../shared/glsl';
import { ribByName, weedPoint } from '../layout';
import { Flock, NEAR, animalMaterial, stand } from '../wings/animal';

export const PARTS: readonly string[] = ['drowned'];

/** It was a big one: the size of the hung body against a feeder's. */
const SIZE = 2;
const STRANDS = 150;
const CRABS = 11;

const WEED_VERTEX = /* glsl */ `
uniform float uTime;
uniform vec3 uDown;
uniform vec3 uOut;
uniform vec3 uAcross;
uniform vec2 uWind;
attribute vec4 aRoot;
attribute vec4 aShape;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vStrand;
void main() {
  // position.x across the blade of the strand (-1 to 1), position.y along it (0 to 1).
  float s = position.y;
  float len = aShape.x;
  float wide = aShape.y * (0.35 + 0.65 * sin(3.14159 * pow(s, 0.6))) * (1.0 + 0.3 * sin(s * 23.0 + aShape.z * 9.0));
  float sway = sin(uTime * 1.3 + aShape.z * 30.0 + s * 3.0) * 0.05 * s * s * len;
  float curl = sin(s * 9.0 + aShape.z * 50.0) * 0.07;
  vec3 across = normalize(uAcross + uOut * (0.6 * sin(s * 5.0 + aShape.z * 17.0)));
  vec3 root = aRoot.xyz;
  // The strand runs down the face, lifting over what it lies across by aRoot.w.
  float lift = aRoot.w * sin(3.14159 * clamp(s * 1.3, 0.0, 1.0));
  vec3 c = root + uDown * (s * len) + uAcross * (sway + curl * len * 0.2 + aShape.w * s * len) + uOut * (lift + 0.04 + 0.05 * sin(s * 13.0 + aShape.z * 70.0)) + vec3(uWind.x, 0.0, uWind.y) * (sway * 0.6);
  vec3 w = c + across * (position.x * wide);
  vWorld = w;
  vNormal = normalize(cross(across, uDown) + across * (position.x * 0.5));
  vStrand = vec3(position.x, s, aShape.z);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const WEED_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vStrand;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  if (dot(n, v) < 0.0) n = -n;
  float rib = abs(vStrand.x);
  float blister = sin(vStrand.y * 60.0 + vStrand.z * 40.0) * sin(vStrand.x * 5.0 + vStrand.y * 17.0);
  n = normalize(n + 0.3 * vec3(blister, 0.0, blister * 0.5));
  vec3 dark = mix(vec3(0.016, 0.02, 0.011), vec3(0.075, 0.055, 0.016), fract(vStrand.z * 7.31));
  vec3 albedo = mix(dark, dark * 2.2 + vec3(0.03, 0.02, 0.0), smoothstep(0.55, 1.0, rib));
  albedo *= 0.8 + 0.4 * blister;
  vec3 col = rigShade(vWorld, n, v, albedo, 0.24, 0.55 + 0.45 * rib);
  gl_FragColor = vec4(rigOut(col), 1.0);
}`;

const CRAB_VERTEX = /* glsl */ `
uniform float uTime;
attribute vec4 aAt;
attribute vec4 aFrame;
uniform vec3 uDown;
uniform vec3 uOut;
uniform vec3 uAcross;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vCrab;
void main() {
  // A crab sits flat on the face: its own x and z lie in the face, y stands out of it.
  float turn = aFrame.x + 0.25 * sin(uTime * 0.7 + aFrame.y * 20.0);
  vec3 ax = cos(turn) * uAcross + sin(turn) * uDown;
  vec3 az = -sin(turn) * uAcross + cos(turn) * uDown;
  // It shifts a little, stops, shifts: never far.
  float go = sin(uTime * 0.9 + aFrame.y * 40.0);
  vec3 creep = ax * (0.08 * smoothstep(0.55, 1.0, go) - 0.08 * smoothstep(0.55, 1.0, -go));
  vec3 p = position;
  // Legs lift in turn while it shifts.
  p.y += position.y < 0.3 && abs(position.x) > 0.6 ? 0.12 * max(sin(uTime * 14.0 + position.z * 9.0 + aFrame.y * 7.0), 0.0) * smoothstep(0.5, 0.9, abs(go)) : 0.0;
  vec3 w = aAt.xyz + creep + (ax * p.x + uOut * p.y + az * p.z) * aAt.w;
  vWorld = w;
  vNormal = normalize(ax * normal.x + uOut * normal.y + az * normal.z);
  vCrab = vec3(position.xz, aFrame.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const CRAB_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vCrab;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float shell = 1.0 - smoothstep(0.5, 0.75, length(vCrab.xy));
  float speck = fract(sin(dot(floor(vCrab.xy * 14.0), vec2(12.9898, 78.233)) + vCrab.z * 9.0) * 43758.5453);
  vec3 albedo = mix(vec3(0.42, 0.3, 0.2), vec3(0.56, 0.43, 0.3) * (0.75 + 0.35 * speck), shell);
  vec3 col = rigShade(vWorld, n, v, albedo, 0.35, 0.7 + 0.3 * shell);
  gl_FragColor = vec4(rigOut(col), 1.0);
}`;

function crabShape(): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  const shell = new THREE.SphereGeometry(0.5, 14, 8);
  shell.scale(1.25, 0.42, 1);
  shell.translate(0, 0.3, 0);
  pieces.push(shell);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const a = (k - 1.5) * 0.42;
      for (const [from, to, r] of [
        [[0.5, 0.3], [1.05, 0.62], 0.07],
        [[1.05, 0.62], [1.5, 0.0], 0.05],
      ] as [[number, number], [number, number], number][]) {
        const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
        const leg = new THREE.CylinderGeometry(r * 0.7, r, len, 5, 1);
        leg.rotateZ(-Math.atan2(to[0] - from[0], to[1] - from[1]));
        leg.translate((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0);
        if (side < 0) leg.scale(-1, 1, 1);
        leg.rotateY(a * side);
        pieces.push(leg);
      }
    }
    const claw = new THREE.SphereGeometry(0.2, 8, 6);
    claw.scale(1.5, 0.6, 0.9);
    claw.translate(side * 0.55, 0.28, 0.62);
    pieces.push(claw);
  }
  const positions: number[] = [];
  const normals: number[] = [];
  const index: number[] = [];
  for (const piece of pieces) {
    const g = piece.index ? piece.toNonIndexed() : piece;
    g.computeVertexNormals();
    const first = positions.length / 3;
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      index.push(first + i);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  out.setIndex(index);
  return out;
}

export function create(ctx: Context): Piece {
  const scatter = ctx.rng('drowned');
  const rib = ribByName(DROWNED.rib);
  const hang = new THREE.Vector3(...DROWNED.at(0));
  const next = weedPoint(rib, DROWNED.phi + 0.02, DROWNED.height);
  const below = weedPoint(rib, DROWNED.phi, DROWNED.height - 4);
  // The face of the weed there: north along it (away from the establishing camera), down it, and out of it.
  const north = new THREE.Vector3(-(next.x - hang.x), 0, -(next.z - hang.z)).normalize();
  const down = below.clone().sub(hang).normalize();
  const out = new THREE.Vector3().crossVectors(north, down).normalize();
  if (out.dot(new THREE.Vector3(...DROWNED.at(1)).sub(hang)) < 0) out.negate();
  const across = new THREE.Vector3().crossVectors(down, out).normalize();

  // The body: hung by the hips, chest and neck down the face, legs and sails slack.
  const yaw = Math.atan2(north.x, north.z);
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const lean = Math.acos(Math.min(1, Math.max(-1, -down.y))) * Math.sign(out.dot(right) || 1);
  const material = animalMaterial(ctx, -100, true);
  const body = new Flock(NEAR, material, 1);
  const pose = stand(0.63);
  const hip = hang.clone().addScaledVector(out, 0.36 * SIZE).addScaledVector(down, -0.6);
  Object.assign(pose, {
    x: hip.x,
    y: hip.y,
    z: hip.z,
    yaw,
    size: SIZE,
    roll: lean,
    pitch: -1.25,
    rise: -1.2,
    bend: -0.45,
    sweep: 0.25,
    tuck: 0.12,
    spread: 0.3,
    flap: -1.05,
    lag: -0.5,
    leftZ: 0.3,
    leftY: -1.62,
    rightZ: -0.25,
    rightY: -1.5,
  });
  body.put(0, pose);
  body.commit();

  const frame = { uDown: { value: down }, uOut: { value: out }, uAcross: { value: across }, uWind: { value: new THREE.Vector2(...WIND.to) } };

  // Weed: strands that hang down the face round it, and strands that lie over it.
  const blade = new THREE.PlaneGeometry(2, 1, 2, 18).translate(0, 0.5, 0);
  const weed = new THREE.InstancedBufferGeometry();
  weed.setAttribute('position', blade.getAttribute('position'));
  weed.setIndex(blade.getIndex());
  weed.instanceCount = STRANDS;
  const roots = new Float32Array(STRANDS * 4);
  const shapes = new Float32Array(STRANDS * 4);
  for (let i = 0; i < STRANDS; i++) {
    const over = i < 26;
    const u = over ? scatter.range(-0.6, 2.9) : scatter.range(-5, 7);
    const up = over ? scatter.range(0.6, 2.4) : scatter.range(-2, 5);
    const root = hang.clone().addScaledVector(north, u).addScaledVector(down, -up);
    roots.set([root.x, root.y, root.z, over ? scatter.range(0.45, 0.8) * SIZE * 0.55 : scatter.range(0, 0.12)], i * 4);
    shapes.set([over ? scatter.range(2.2, 4.6) : scatter.range(1.4, 5.2), over ? scatter.range(0.05, 0.13) : scatter.range(0.07, 0.24), scatter.next(), scatter.range(-0.12, 0.12)], i * 4);
  }
  weed.setAttribute('aRoot', new THREE.InstancedBufferAttribute(roots, 4));
  weed.setAttribute('aShape', new THREE.InstancedBufferAttribute(shapes, 4));
  const weedMaterial = new THREE.ShaderMaterial({ vertexShader: WEED_VERTEX, fragmentShader: WEED_FRAGMENT, uniforms: { ...ctx.rig.uniforms, ...frame }, side: THREE.DoubleSide });
  const strands = new THREE.Mesh(weed, weedMaterial);
  strands.frustumCulled = false;

  // Crabs: on the body and in the weed beside it.
  const crab = crabShape();
  const crabs = new THREE.InstancedBufferGeometry();
  crabs.setAttribute('position', crab.getAttribute('position'));
  crabs.setAttribute('normal', crab.getAttribute('normal'));
  crabs.setIndex(crab.getIndex());
  crabs.instanceCount = CRABS;
  const at = new Float32Array(CRABS * 4);
  const turn = new Float32Array(CRABS * 4);
  for (let i = 0; i < CRABS; i++) {
    const on = i < 5;
    const p = hang
      .clone()
      .addScaledVector(north, on ? scatter.range(0.1, 1.8) : scatter.range(-2.5, 4.5))
      .addScaledVector(down, on ? scatter.range(-0.5, 1.2) : scatter.range(-2, 3.5))
      .addScaledVector(out, on ? 0.62 * SIZE * 0.5 + 0.2 : 0.16);
    at.set([p.x, p.y, p.z, scatter.range(0.1, 0.17)], i * 4);
    turn.set([scatter.range(0, 6.28), scatter.next(), 0, 0], i * 4);
  }
  crabs.setAttribute('aAt', new THREE.InstancedBufferAttribute(at, 4));
  crabs.setAttribute('aFrame', new THREE.InstancedBufferAttribute(turn, 4));
  const crabMaterial = new THREE.ShaderMaterial({ vertexShader: CRAB_VERTEX, fragmentShader: CRAB_FRAGMENT, uniforms: { ...ctx.rig.uniforms, ...frame } });
  const crabMesh = new THREE.Mesh(crabs, crabMaterial);
  crabMesh.frustumCulled = false;

  ctx.scene.add(ctx.parts.built('drowned', body.mesh, strands, crabMesh));

  return {
    dispose: () => {
      material.dispose();
      weedMaterial.dispose();
      crabMaterial.dispose();
      weed.dispose();
      crabs.dispose();
    },
  };
}
