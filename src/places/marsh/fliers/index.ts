// The fliers: long four-winged insects the length of a hand, hanging and darting over the tops of the stalk colonies.
import * as THREE from 'three';
import { R, TAU, makePools, makeStalks } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { RIG_GLSL } from '../shared/glsl';

export const PARTS: readonly string[] = ['fliers'];

const VERTEX = /* glsl */ `
attribute vec4 aStart;
attribute vec4 aWay;
uniform float uSeconds;
uniform vec2 uHeading;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTone;
vec3 flierAt(float t) {
  // Straight on at its own speed, weaving a little and rising and sinking on the air.
  float weave = 0.9 * sin(t * 0.61 + aWay.x) + 0.35 * sin(t * 1.53 + aWay.y);
  vec2 side = vec2(-uHeading.y, uHeading.x);
  return vec3(aStart.x, aStart.y, aStart.z) + vec3(uHeading.x, 0.0, uHeading.y) * (aStart.w * sin(t * 0.47 + aWay.w)) + vec3(side.x, 0.0, side.y) * weave + vec3(0.0, 0.3 * sin(t * 0.83 + aWay.y), 0.0);
}
void main() {
  float t = uSeconds;
  vec3 at = flierAt(t);
  vec3 fwd = normalize(flierAt(t + 0.2) - flierAt(t - 0.2));
  vec3 right = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
  // It banks into its weave.
  float bank = 0.35 * cos(t * 0.61 + aWay.x);
  vec3 up = cross(right, fwd);
  vec3 r2 = right * cos(bank) + up * sin(bank);
  vec3 u2 = up * cos(bank) - right * sin(bank);
  // position: x along the body, y up, z out along the wing. uv.x: 0 the body, 1 the fore wings, 2 the hind wings.
  float pair = uv.x;
  float span = abs(position.z);
  float rate = 9.0 / aWay.z;
  // Bursts of beats and glides between them. The stroke runs out along the wing, and the hind pair comes a quarter beat after the fore pair.
  float work = 0.55 + 0.45 * sin(t * 0.37 + aWay.w);
  float ph = t * rate + aWay.w - (pair - 1.0) * 1.57;
  float stroke = work * (0.62 * sin(ph - 0.45 * span) + 0.1 * sin(2.0 * ph - 0.9 * span)) + 0.12;
  vec3 local = position;
  if (pair > 0.5) {
    local.y += span * sin(stroke);
    local.z = sign(position.z) * span * cos(stroke);
  }
  // The body rides against the wings: down as they go up.
  local.y -= 0.16 * work * sin(ph) * step(pair, 0.5) + 0.16 * work * sin(ph) * step(0.5, pair);
  vec3 p = at + (fwd * local.x + u2 * local.y + r2 * local.z) * aWay.z * 0.8;
  vWorld = p;
  vec3 ln = pair > 0.5 ? vec3(0.0, cos(stroke), -sign(position.z) * sin(stroke)) : normal;
  vNormal = normalize(fwd * ln.x + u2 * ln.y + r2 * ln.z);
  vTone = uv.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTone;
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  if (dot(n, v) < 0.0) n = -n;
  vec3 albedo = mix(vec3(0.1, 0.075, 0.07), vec3(0.3, 0.2, 0.18), vTone);
  vec3 c = rigShade(vWorld, n, v, albedo, 0.7, 1.0);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export function create(ctx: Context): Piece {
  const rng = ctx.rng('fliers');
  const COUNT = 28;
  const tall = makeStalks(makePools()).filter((st) => st.kind !== 2 && st.h > 1.2 && Math.hypot(st.x, st.z) < 45);
  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  // The body: a long spindle with a whip of a tail.
  const RINGS = 9;
  const SIDES = 6;
  for (let i = 0; i <= RINGS; i++) {
    const u = i / RINGS;
    const x = 0.9 - 2.6 * u;
    const r = u < 0.45 ? 0.17 * Math.sin(Math.PI * Math.min(1, u / 0.45 + 0.08) ** 0.7) : 0.035 * (1 - u) + 0.006;
    for (let j = 0; j < SIDES; j++) {
      const a = (j / SIDES) * TAU;
      position.push(x, Math.cos(a) * r * 0.8, Math.sin(a) * r * 1.2);
      normal.push(0, Math.cos(a), Math.sin(a));
      uv.push(0, 0.3 + 0.4 * Math.max(0, Math.cos(a)));
    }
  }
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SIDES; j++) {
      const a = i * SIDES + j;
      const b = i * SIDES + ((j + 1) % SIDES);
      index.push(a, b, a + SIDES, b, b + SIDES, a + SIDES);
    }
  }
  // Two pairs of long narrow wings, each a strip of six parts so that the stroke can run out along it.
  const wing = (x: number, length: number, chord: number, sweep: number, pair: number, side: number): void => {
    const start = position.length / 3;
    const N = 6;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const c = chord * (1 - 0.75 * u * u);
      const z = side * (0.1 + length * u);
      const xm = x - sweep * u * u;
      position.push(xm + c * 0.4, 0, z, xm - c * 0.6, 0, z);
      normal.push(0, 1, 0, 0, 1, 0);
      uv.push(pair, 0.5 * u, pair, 0.9);
    }
    for (let i = 0; i < N; i++) {
      const a = start + i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  };
  for (const side of [-1, 1]) {
    wing(0.45, 1.9, 0.46, 0.5, 1, side);
    wing(-0.15, 1.2, 0.34, 0.6, 2, side);
  }
  const base = new THREE.BufferGeometry();
  base.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  base.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  base.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  base.setIndex(index);

  const start = new Float32Array(COUNT * 4);
  const way = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    // Each keeps to the top of one stalk of the colonies by the pool and the vein.
    const perch = tall[rng.int(tall.length)] as (typeof tall)[number];
    start.set([perch.x + rng.range(-0.8, 0.8), perch.h + rng.range(0.3, 1.2), perch.z + rng.range(-0.8, 0.8), rng.range(0.6, 1.6)], i * 4);
    // The larger the slower its beat.
    const size = rng.range(0.1, 0.16);
    way.set([rng.range(0, TAU), rng.range(0, TAU), size, rng.range(0, TAU)], i * 4);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const name of ['position', 'normal', 'uv']) g.setAttribute(name, base.attributes[name] as THREE.BufferAttribute);
  g.setAttribute('aStart', new THREE.InstancedBufferAttribute(start, 4));
  g.setAttribute('aWay', new THREE.InstancedBufferAttribute(way, 4));
  g.instanceCount = COUNT;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, uSeconds: { value: 0 }, uHeading: { value: new THREE.Vector2(R[0], R[1]) } },
    vertexShader: VERTEX.replace('TAU_F', '6.2831853'),
    fragmentShader: FRAGMENT,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('fliers', mesh));
  return {
    setTime: (seconds) => {
      (material.uniforms.uSeconds as THREE.IUniform<number>).value = seconds;
    },
    dispose: () => {
      g.dispose();
      material.dispose();
    },
  };
}
