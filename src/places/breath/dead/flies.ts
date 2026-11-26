// The flies over the dead one: small, dark, never still. Where each is depends on the time alone.
import * as THREE from 'three';
import { RIG_GLSL } from '../shared/glsl';

const VERTEX = /* glsl */ `
attribute vec3 aFly;
attribute vec3 aSmear;
varying vec2 vAt;
varying float vThin;
void main() {
  vec3 toEye = cameraPosition - aFly;
  float far = length(toEye);
  float len = length(aSmear);
  vec3 along = aSmear / max(len, 1e-5);
  vec3 across = normalize(cross(along, toEye));
  // A fly is a few millimetres: drawn no narrower than a pixel and thinned by as much as it was widened.
  float wide = max(0.006, 0.0005 * far);
  vThin = 0.006 / wide;
  vec3 p = aFly + across * position.x * wide + along * position.y * (len + wide);
  vAt = vec2(position.x, position.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vAt;
varying float vThin;
${RIG_GLSL}
void main() {
  float body = max(0.0, 1.0 - dot(vAt, vAt));
  float alpha = smoothstep(0.0, 0.5, body) * 0.85 * vThin * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(vec3(0.012, 0.01, 0.009)) * alpha, alpha);
}`;

export interface Flies {
  mesh: THREE.Mesh;
  setTime(seconds: number): void;
  dispose(): void;
}

/** `homes` are the places on the carcass they keep coming back to, in the world; `next` gives numbers 0 to 1 at creation. */
export function makeFlies(count: number, homes: [number, number, number][], next: () => number, uniforms: Record<string, THREE.IUniform>): Flies {
  const geometry = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(2, 2);
  geometry.setAttribute('position', plane.getAttribute('position'));
  geometry.setIndex(plane.getIndex());
  const at = new Float32Array(count * 3);
  const smear = new Float32Array(count * 3);
  const aFly = new THREE.InstancedBufferAttribute(at, 3);
  const aSmear = new THREE.InstancedBufferAttribute(smear, 3);
  aFly.setUsage(THREE.DynamicDrawUsage);
  aSmear.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aFly', aFly);
  geometry.setAttribute('aSmear', aSmear);
  geometry.instanceCount = count;
  const each: { home: [number, number, number]; reach: number; high: number; rate: number[]; phase: number[] }[] = [];
  for (let i = 0; i < count; i++) {
    const home = homes[Math.floor(next() * homes.length) % homes.length] as [number, number, number];
    each.push({
      home,
      reach: 0.12 + 0.5 * next() ** 2,
      high: 0.1 + 0.45 * next() ** 1.5,
      rate: [2.1 + 3.4 * next(), 3.3 + 4.1 * next(), 1.7 + 3.9 * next(), 5.1 + 4.3 * next(), 0.31 + 0.4 * next()],
      phase: [6.28 * next(), 6.28 * next(), 6.28 * next(), 6.28 * next(), 6.28 * next()],
    });
  }
  const where = (i: number, t: number): [number, number, number] => {
    const f = each[i]!;
    const [r0, r1, r2, r3, r4] = f.rate as [number, number, number, number, number];
    const [p0, p1, p2, p3, p4] = f.phase as [number, number, number, number, number];
    // It hangs near its place, darts off and comes back: the wide loop is slow, the small one quick.
    const wander = 0.55 + 0.45 * Math.sin(t * r4 + p4);
    const x = f.home[0] + f.reach * wander * (Math.sin(t * r0 + p0) + 0.35 * Math.sin(t * r3 + p3));
    const z = f.home[2] + f.reach * wander * (Math.cos(t * r1 + p1) + 0.35 * Math.cos(t * r3 * 1.13 + p0));
    const y = f.home[1] + 0.05 + f.high * (0.5 + 0.35 * Math.sin(t * r2 + p2) + 0.15 * Math.sin(t * r3 * 0.71 + p1));
    return [x, y, z];
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 20;
  return {
    mesh,
    setTime: (seconds) => {
      for (let i = 0; i < count; i++) {
        const p = where(i, seconds);
        // The shutter is open a fiftieth of a second: the fly is drawn along what it flew in that time.
        const q = where(i, seconds + 0.02);
        at.set([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], i * 3);
        smear.set([(q[0] - p[0]) / 2, (q[1] - p[1]) / 2, (q[2] - p[2]) / 2], i * 3);
      }
      aFly.needsUpdate = true;
      aSmear.needsUpdate = true;
    },
    dispose: () => {
      geometry.dispose();
      plane.dispose();
      material.dispose();
    },
  };
}
