// The stream of the Eye: it comes down the ravine beside the wide camera, falls over the stones of the fan and crosses the beach into the
// lake. Its water is one ribbon laid level across the bed, cut by the ground where the banks rise through it. What moves on it is carried
// by the flow itself: the flow is worked out at every point from the fall of the bed and from the stones that stand in it, which the
// water parts round, piles against and leaves white behind.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { LOD_GLSL } from './lod';
import { smooth } from '../layout';
import { vnoise } from '../shared/noise';
import { landHeight, onAxis, streamAcross, streamFloor } from './height';

/** A stone that stands in the stream: metres along it, metres off its middle, and its radius. */
export interface Standing {
  along: number;
  off: number;
  radius: number;
}

const FROM = -3;
const CELL = 2.2;

/** How deep the water lies over its bed, and its half width, at `along`. */
export const streamDepth = (along: number): number => 0.14 + 0.2 * smooth(24, 44, along);
// The ribbon is laid wider than the water: the ground that comes up through it is its edge.
const halfWidth = (along: number): number => 4.3 + 2.4 * smooth(40, 26, along);
const wetWidth = (along: number): number => 1.5 + 0.9 * vnoise(along / 9, 3.3);
const levelAt = (along: number): number => Math.max(0.012, streamFloor(along) + streamDepth(along));

/** One stone or none to each stretch of the stream, larger where it falls steeply. */
export function standingStones(next: () => number, to: number): Standing[] {
  const cells = Math.ceil((to - FROM) / CELL);
  const stones: Standing[] = [];
  for (let c = 0; c < cells; c++) {
    const along = FROM + (c + 0.25 + 0.5 * next()) * CELL;
    const steep = smooth(0.04, 0.3, (levelAt(along + 0.8) - levelAt(along - 0.8)) / 1.6);
    const off = (next() * 2 - 1) * 0.8 * wetWidth(along);
    const radius = 0.26 + (0.42 + 0.3 * steep) * next() ** 1.6;
    const there = next() < 0.5 + 0.4 * steep && along > 4;
    stones.push({ along, off, radius: there ? radius : 0 });
  }
  return stones;
}

const STREAM_VERTEX = /* glsl */ `
attribute vec2 aFlow;
attribute vec3 aWater;
varying vec3 vWorld;
varying vec2 vFlow;
varying vec3 vWater;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vFlow = aFlow;
  vWater = aWater;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// aFlow: metres along the stream (it runs toward the lake, where this falls to nothing) and metres off its middle.
// aWater: the depth of the water over the ground, how steeply the bed falls there, 0 to 1, and how lately the water has fallen, 0 to 1.
const STREAM_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec2 vFlow;
varying vec3 vWater;
uniform sampler2D tStones;
uniform vec3 uCells;
uniform sampler2D tGrit;
${NOISE_GLSL}
${RIG_GLSL}
${LOD_GLSL}
// Froth as the flow draws it out: threads of it, long along the water and thin across it. This is 1 on the line of a thread.
float froth(vec2 q) {
  float a = 1.0 - abs(2.0 * vnoise(q * vec2(0.45, 3.1)) - 1.0);
  float b = 1.0 - abs(2.0 * vnoise(q * vec2(1.3, 8.7) + 3.7) - 1.0);
  return 0.6 * a + 0.4 * b;
}
void main() {
  // Taken before any branch, and the bed read with it: see rock.ts.
  takeLod(dFdx(vWorld), dFdy(vWorld));
  float depth = vWater.x;
  // The water's edge is where the ground comes up through it, and it is not a ruled line.
  if (depth < 0.07 * vnoise(vWorld.xz * 1.9) + 0.03 * vnoise(vWorld.xz * 7.3) - 0.02) discard;
  float fall = vWater.y;
  // Down the stream is the way the water goes.
  vec2 p = vec2(-vFlow.x, vFlow.y);
  float churned = vWater.z;
  float speed = 0.6 + 3.4 * fall;
  vec2 flow = vec2(speed, 0.0);
  float piled = 0.0;
  float wake = 0.0;
  float cell = floor((vFlow.x - uCells.x) / uCells.y);
  for (int i = -1; i <= 2; i++) {
    float c = cell + float(i);
    if (c < 0.0 || c > uCells.z - 1.0) continue;
    vec4 st = texelFetch(tStones, ivec2(int(c), 0), 0);
    if (st.z <= 0.0) continue;
    vec2 d = p - vec2(-st.x, st.y);
    float r = st.z;
    float far = max(length(d), 0.6 * r);
    // The water parts round a stone as round a post.
    float m = r * r / (far * far * far * far);
    flow += speed * m * vec2(d.y * d.y - d.x * d.x, -2.0 * d.x * d.y);
    // It piles against the side that meets it, and behind the stone it is torn white in a tail that widens and dies.
    piled += smoothstep(r + 0.5, r + 0.05, far) * smoothstep(0.2, -0.6, d.x / far);
    float behind = max(d.x, 0.0);
    float width = r * (0.75 + 0.3 * behind / r);
    wake += smoothstep(0.0, 0.5 * r, d.x) * exp(-behind / (3.2 * r)) * smoothstep(width, 0.35 * width, abs(d.y));
  }
  // What rides on the water is carried down the flow, and made again before it is drawn out of shape: two turns, half a turn apart.
  float turn = 1.0;
  float t1 = uTime / turn;
  float t2 = t1 + 0.5;
  float f1 = fract(t1);
  float f2 = fract(t2);
  vec2 q1 = p - flow * (f1 * turn) + floor(t1) * vec2(3.7, 1.3);
  vec2 q2 = p - flow * (f2 * turn) + floor(t2) * vec2(5.9, 2.1) + 11.0;
  float w1 = 1.0 - abs(2.0 * f1 - 1.0);
  float a1 = froth(q1);
  float a2 = froth(q2);
  float ridden = mix(a2, a1, w1);
  // White where it falls, where it piles and where it is torn, and a thread of it along the shallows of each bank.
  // It runs over a stony bed all the way down: every few metres a riffle breaks it, whether the bed falls there or not.
  float riffle = smoothstep(0.46, 0.72, vnoise(vec2(vFlow.x / 1.5, 7.0))) * smoothstep(1.9, 0.5, abs(vFlow.y + 0.9 * (vnoise(vec2(vFlow.x / 4.3, 2.0)) - 0.5)));
  // Between its riffles it is glass, and a riffle is white in lumps, where a stone of the bed stands near the top.
  float lumps = smoothstep(0.3, 0.62, vnoise(vec2(vFlow.x * 1.3, vFlow.y * 3.1) + 11.0));
  float much = clamp(0.03 + 0.75 * riffle * (0.35 + 0.65 * lumps) + 0.85 * max(fall, 0.85 * churned) + 0.5 * piled + 0.7 * wake + 0.12 * smoothstep(0.1, 0.03, depth), 0.0, 1.0);
  // Glass for the most part: the white is threads, and they thicken only where the water has been broken.
  float white = smoothstep(0.9 - 0.56 * much, 1.06 - 0.4 * much, ridden) * smoothstep(0.02, 0.2, much);
  // The skin of the water: small waves that go with it, higher where it runs fast.
  float rough = 0.07 + 0.3 * fall + 0.3 * piled + 0.25 * wake + 0.2 * riffle;
  vec2 lean = vec2(mix(vnoise(q2 * vec2(1.3, 3.9) + 5.0), vnoise(q1 * vec2(1.3, 3.9) + 5.0), w1), mix(vnoise(q2 * vec2(1.3, 3.9) + 21.0), vnoise(q1 * vec2(1.3, 3.9) + 21.0), w1)) - 0.5;
  vec3 n = normalize(vec3(lean.x * rough, 1.0, lean.y * rough));
  vec3 v = normalize(cameraPosition - vWorld);
  // Under it the bed: wet stones, darker the deeper they lie.
  vec3 bed = textureLod(tGrit, vWorld.xz / 2.3 + lean * 0.04, AT(1024.0, 2.3)).rgb * vec3(0.1, 0.11, 0.115) * exp(-depth * 2.6);
  vec3 albedo = mix(bed, vec3(0.88, 0.92, 0.97), white);
  vec3 c = rigShade(vWorld, mix(vec3(0.0, 1.0, 0.0), n, white), v, albedo, 1.0, 1.0);
  // The sky lies on what is not white, more the lower the eye.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);
  // It lies in a bed among stones: what it mirrors is the sky overhead, not the glow at the rim.
  r.y = max(abs(r.y), 0.7);
  c = mix(c, 0.55 * skyRadiance(normalize(r)) * skyOpen(vWorld), (0.03 + 0.97 * pow(1.0 - nv, 5.0)) * (1.0 - white));
  c += (1.0 - white) * 0.6 * rigGlint(vWorld, n, v, 0.1);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export function createStream(ctx: Context, stones: Standing[], to: number, grit: THREE.Texture): { mesh: THREE.Mesh; material: THREE.ShaderMaterial; dispose: () => void } {
  const STEP = 0.4;
  const ACROSS = 19;
  const count = Math.round((to - FROM) / STEP) + 1;
  const position = new Float32Array(count * ACROSS * 3);
  const flow = new Float32Array(count * ACROSS * 2);
  const water = new Float32Array(count * ACROSS * 3);
  const fallAt = (along: number): number => smooth(0.02, 0.14, (levelAt(along + 0.5) - levelAt(along - 0.5)) / 1.0);
  for (let i = 0; i < count; i++) {
    const along = FROM + i * STEP;
    const half = halfWidth(along);
    const level = levelAt(along);
    const fall = fallAt(along);
    // Below a fall the water is white for a few metres more.
    let churned = 0;
    for (let u = 0.5; u <= 6; u += 0.5) churned = Math.max(churned, fallAt(along + u) * Math.exp(-u / 2.4));
    for (let j = 0; j < ACROSS; j++) {
      const off = ((j / (ACROSS - 1)) * 2 - 1) * half;
      const [x, z] = onAxis(along, streamAcross(along) + off);
      const o = i * ACROSS + j;
      position[o * 3] = x;
      position[o * 3 + 1] = level;
      position[o * 3 + 2] = z;
      flow[o * 2] = along;
      flow[o * 2 + 1] = off;
      water[o * 3] = level - landHeight(x, z);
      water[o * 3 + 1] = fall;
      water[o * 3 + 2] = churned;
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
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aFlow', new THREE.BufferAttribute(flow, 2));
  geometry.setAttribute('aWater', new THREE.BufferAttribute(water, 3));
  geometry.setIndex(index);

  // The stones, one to a stretch, where the water can look them up: along, off, radius.
  const data = new Uint16Array(stones.length * 4);
  stones.forEach((s, i) => {
    data[i * 4] = THREE.DataUtils.toHalfFloat(s.along);
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(s.off);
    data[i * 4 + 2] = THREE.DataUtils.toHalfFloat(s.radius);
    data[i * 4 + 3] = THREE.DataUtils.toHalfFloat(1);
  });
  const lookup = new THREE.DataTexture(data, stones.length, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  lookup.minFilter = THREE.NearestFilter;
  lookup.magFilter = THREE.NearestFilter;
  lookup.needsUpdate = true;

  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, tStones: { value: lookup }, uCells: { value: new THREE.Vector3(FROM, CELL, stones.length) }, tGrit: { value: grit } },
    vertexShader: STREAM_VERTEX,
    fragmentShader: STREAM_FRAGMENT,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    material,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      lookup.dispose();
    },
  };
}
