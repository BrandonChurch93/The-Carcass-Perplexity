// What the colony sits in: a mat of dried weed and stalk heaped on the ledge under each sitter, hollowed where the body lies, ragged at its
// rim and hung over the ledge's edge where it reaches it. Built once when the place is made: it does not move.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export interface NestAt {
  x: number;
  y: number;
  z: number;
  size: number;
  seed: number;
}

const SPOKES = 22;
const RINGS = 6;

const VERTEX = /* glsl */ `
attribute vec3 aMix;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vMix;
void main() {
  vWorld = position;
  vNormal = normal;
  vMix = aMix;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
${NOISE_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vMix;
// Stalks laid three ways over one another, each wandering: how high the mat stands at a place of it (0 to 1).
float stalks(vec2 p) {
  float high = 0.0;
  for (int i = 0; i < 3; i++) {
    float a = float(i) * 1.05 + 0.4;
    vec2 d = vec2(cos(a), sin(a));
    vec2 q = vec2(dot(p, d), dot(p, vec2(-d.y, d.x)));
    q.y += 0.3 * vnoise(q * 1.7 + float(i) * 7.0);
    float line = abs(fract(q.y * 7.0 + vnoise(q * vec2(0.6, 3.0) + float(i) * 3.0)) - 0.5) * 2.0;
    high = max(high, (1.0 - smoothstep(0.0, 0.6, line)) * (0.45 + 0.55 * vnoise(q * vec2(1.1, 5.0) + float(i) * 13.0)));
  }
  return high;
}
void main() {
  // The size of a pixel on the mat, taken before anything a pixel may or may not do.
  float fine = length(dFdx(vWorld)) + length(dFdy(vWorld));
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n0 = normalize(vNormal);
  n0 *= dot(n0, v) < 0.0 ? -1.0 : 1.0;
  vec2 p = vWorld.xz + vWorld.y * vec2(0.7, 0.45);
  float e = 0.012;
  float here = stalks(p);
  vec2 slope = vec2(stalks(p + vec2(e, 0.0)) - here, stalks(p + vec2(0.0, e)) - here) / e;
  // Finer than a pixel the stalks are no longer drawn one by one: the mat is their mean.
  float seen = 1.0 - smoothstep(0.02, 0.07, fine);
  vec3 n = normalize(n0 - 0.03 * seen * smoothstep(0.0, 0.3, vMix.x) * vec3(slope.x, 0.0, slope.y));
  float lump = vnoise(p * 2.3 + vMix.z * 31.0);
  // Dark dried weed, the upper stalks bleached to straw; white where the sitter has fouled the rim.
  vec3 weed = mix(vec3(0.045, 0.037, 0.026), vec3(0.1, 0.078, 0.046), lump);
  vec3 straw = mix(vec3(0.2, 0.155, 0.085), vec3(0.3, 0.255, 0.18), vnoise(p * 5.0));
  vec3 albedo = mix(weed, straw, mix(0.4, here, seen) * (0.3 + 0.7 * vMix.x) * (0.6 + 0.4 * lump));
  float fouled = smoothstep(0.62, 0.8, vnoise(p * 1.6 + vMix.z * 57.0)) * smoothstep(0.25, 0.7, vMix.x) * 0.35;
  albedo = mix(albedo, vec3(0.42, 0.41, 0.38), fouled);
  // What hangs over the lip is weed, not stalk: dark, in strands that fall, wet brown where the light takes them.
  float hung = 1.0 - smoothstep(0.0, 0.3, vMix.x);
  vec2 fall = vec2(dot(vWorld.xz, vec2(0.8, 0.6)) * 9.0, vWorld.y * 0.8);
  float strand = vnoise(fall + vMix.z * 11.0) * 0.6 + vnoise(fall * vec2(2.3, 1.0) + 5.0) * 0.4;
  albedo = mix(albedo, mix(vec3(0.02, 0.018, 0.013), vec3(0.085, 0.06, 0.03), mix(0.5, strand, seen)), hung);
  // Between the stalks it is dark, and darkest in the hollow and under the rim.
  float occ = vMix.y * mix(mix(0.7, 0.4 + 0.6 * here, seen), 1.0, 0.4);
  vec3 col = rigShade(vWorld, n, v, albedo, 0.9, occ);
  gl_FragColor = vec4(rigOut(col), 1.0);
}`;

const frac = (x: number): number => x - Math.floor(x);

/** `under` is the top of the rock under a place, looked for from a height down. */
export function nestMats(ctx: Context, at: NestAt[], under: (x: number, z: number, from: number) => number): { mesh: THREE.Mesh; draw: (on: boolean) => void; dispose: () => void } {
  const per = 1 + SPOKES * RINGS;
  const position = new Float32Array(at.length * per * 3);
  const mix = new Float32Array(at.length * per * 3);
  const index: number[] = [];
  at.forEach((nest, k) => {
    const v0 = k * per;
    const k1 = frac(nest.seed * 29.3);
    const k2 = frac(nest.seed * 61.7);
    const k3 = frac(nest.seed * 97.1);
    const wide = (0.85 + 0.3 * k1) * nest.size;
    const high = (0.5 + 0.22 * k2) * nest.size;
    const put = (v: number, x: number, y: number, z: number, top: number, occ: number): void => {
      position[v * 3] = x;
      position[v * 3 + 1] = y;
      position[v * 3 + 2] = z;
      mix[v * 3] = top;
      mix[v * 3 + 1] = occ;
      mix[v * 3 + 2] = nest.seed;
    };
    // The middle is the hollow the body lies in.
    put(v0, nest.x, nest.y + 0.45 * high, nest.z, 0.5, 0.5);
    for (let r = 0; r < RINGS; r++) {
      const part = (r + 1) / RINGS;
      for (let s = 0; s < SPOKES; s++) {
        const a = (s / SPOKES) * Math.PI * 2;
        const lobe = 1 + 0.2 * Math.sin(2 * a + k1 * 6.3) + 0.12 * Math.sin(5 * a + k2 * 6.3) + 0.08 * Math.sin(9 * a + k3 * 6.3);
        // The rim is ragged: every second stalk end stands out past its neighbours.
        const ragged = r === RINGS - 1 ? (s % 2 === 0 ? 1 : 0.8) + 0.14 * frac(Math.sin(s * 12.99 + nest.seed * 78.2) * 43758.5) : 1;
        const out = wide * lobe * part * ragged;
        const x = nest.x + Math.cos(a) * out;
        const z = nest.z + Math.sin(a) * out;
        const rock = under(x, z, nest.y + 0.2);
        // Heaped highest in a ring about the hollow, falling to the rock at the rim.
        const heap = high * (Math.pow(Math.max(0, 1 - part * part), 0.5) - 0.3 * Math.exp(-(part * part) / 0.06)) * (0.8 + 0.4 * frac(Math.sin(s * 7.31 + r * 3.7 + nest.seed * 41.3) * 9631.7));
        // Past the ledge's edge it hangs, a hand or two down the face.
        const over = rock < nest.y - 0.15;
        const y = over ? nest.y - Math.min(nest.y - rock, (0.5 + 0.9 * frac(Math.sin(s * 5.17 + nest.seed * 19.9) * 7717.3)) * nest.size) : nest.y - 0.03 + heap;
        put(v0 + 1 + r * SPOKES + s, x, y, z, over ? 0 : Math.min(1, 0.35 + heap / high), over ? 0.8 : 0.45 + 0.55 * Math.min(1, part * 1.2));
      }
    }
    for (let s = 0; s < SPOKES; s++) {
      const t = (s + 1) % SPOKES;
      index.push(v0, v0 + 1 + t, v0 + 1 + s);
      for (let r = 0; r + 1 < RINGS; r++) {
        const a = v0 + 1 + r * SPOKES + s;
        const b = v0 + 1 + r * SPOKES + t;
        const c = v0 + 1 + (r + 1) * SPOKES + s;
        const d = v0 + 1 + (r + 1) * SPOKES + t;
        index.push(a, b, c, b, d, c);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aMix', new THREE.BufferAttribute(mix, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms: { ...ctx.rig.uniforms }, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    draw: (on) => geometry.setDrawRange(0, on ? index.length : 0),
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
