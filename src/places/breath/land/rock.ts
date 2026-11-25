// The rock of the Breath: one tile of noise baked at creation, and the three surfaces cut from it. The shelf (ivory bone-rock, wet, pitted,
// jointed, stained where the tide stands), the bone of the shaft (its wall, its hoops and the slabs that fell from them), and the far cliff.
// All three are lit by the rig alone.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { RIG_GLSL } from '../shared/glsl';

const SIZE = 512;

/** A tile that repeats: r smooth drifts, g pits (1 in a pit), b joints (0 on a joint, rising away from it), a a second smooth field. */
export function bakeRock(rng: Rng): THREE.DataTexture {
  const grads = (period: number): Float32Array => {
    const g = new Float32Array(period * period * 2);
    for (let i = 0; i < period * period; i++) {
      const a = rng.range(0, Math.PI * 2);
      g[i * 2] = Math.cos(a);
      g[i * 2 + 1] = Math.sin(a);
    }
    return g;
  };
  const points = (period: number): Float32Array => {
    const p = new Float32Array(period * period * 2);
    for (let i = 0; i < p.length; i++) p[i] = rng.next();
    return p;
  };
  const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
  const perlin = (g: Float32Array, period: number, x: number, y: number): number => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const u = fade(fx);
    const v = fade(fy);
    let sum = 0;
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 2; i++) {
        const c = (((yi + j) % period) * period + ((xi + i) % period)) * 2;
        sum += ((g[c] as number) * (fx - i) + (g[c + 1] as number) * (fy - j)) * (i ? u : 1 - u) * (j ? v : 1 - v);
      }
    }
    return sum;
  };
  // The two nearest feature points: [nearest, second nearest], in cells.
  const cells = (p: Float32Array, period: number, x: number, y: number): [number, number] => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let a = 9;
    let b = 9;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const c = (((yi + j + period) % period) * period + ((xi + i + period) % period)) * 2;
        const dx = xi + i + (p[c] as number) - x;
        const dy = yi + j + (p[c + 1] as number) - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < a) {
          b = a;
          a = d;
        } else if (d < b) b = d;
      }
    }
    return [a, b];
  };
  const gA = [4, 8, 16, 32, 64].map(grads);
  const gB = [3, 6, 12, 24, 48].map(grads);
  const pits = [9, 23].map(points);
  const joints = points(5);
  const bend = grads(6);
  const data = new Uint8Array(SIZE * SIZE * 4);
  const byte = (v: number): number => Math.round(255 * Math.min(1, Math.max(0, v)));
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const x = (i + 0.5) / SIZE;
      const y = (j + 0.5) / SIZE;
      let a = 0;
      let b = 0;
      let w = 0.5;
      for (let o = 0; o < 5; o++) {
        const pa = [4, 8, 16, 32, 64][o] as number;
        const pb = [3, 6, 12, 24, 48][o] as number;
        a += w * perlin(gA[o] as Float32Array, pa, x * pa, y * pa);
        b += w * perlin(gB[o] as Float32Array, pb, x * pb, y * pb);
        w *= 0.55;
      }
      const [p0] = cells(pits[0] as Float32Array, 9, x * 9, y * 9);
      const [p1] = cells(pits[1] as Float32Array, 23, x * 23, y * 23);
      const pit = Math.max(1 - p0 / 0.34, 0.6 * (1 - p1 / 0.3)) * (0.5 + 1.2 * Math.max(0, 0.5 + 1.1 * b));
      const wx = x * 5 + 0.25 * perlin(bend, 6, x * 6, y * 6);
      const wy = y * 5 + 0.25 * perlin(bend, 6, y * 6 + 2.5, x * 6 + 1.5);
      const [j0, j1] = cells(joints, 5, wx, wy);
      const o = (j * SIZE + i) * 4;
      data[o] = byte(0.5 + 1.1 * a);
      data[o + 1] = byte(pit);
      data[o + 2] = byte((j1 - j0) * 2.2);
      data[o + 3] = byte(0.5 + 1.1 * b);
    }
  }
  const t = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 1;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export const ROCK_VERTEX = /* glsl */ `
attribute float occ;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vOcc;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vUv = uv;
  vOcc = occ;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const COMMON = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying float vOcc;
uniform sampler2D tRock;
${RIG_GLSL}

// The normal of a surface whose height is raised by h metres: from how h changes across the pixel.
vec3 raised(vec3 p, vec3 n, float h) {
  vec3 dpx = dFdx(p);
  vec3 dpy = dFdy(p);
  float hx = dFdx(h);
  float hy = dFdy(h);
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 g = (r1 * hx + r2 * hy) * sign(det);
  return normalize(abs(det) * n - g);
}`;

// The shelf: wet bone-rock in level plates, each a hand higher than the next, with scalloped edges and a line of shade under each edge.
// The low plates hold a film of water that mirrors the sky. Smooth and broad from far off; the grain shows only near the lens.
export const SHELF_FRAGMENT = /* glsl */ `
${COMMON}
void main() {
  vec3 p = vWorld;
  vec3 toEye = cameraPosition - p;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 n = normalize(vNormal);
  vec4 land = landAt(p.xz);
  vec4 a = texture2D(tRock, p.xz / 83.0);
  vec4 b = texture2D(tRock, p.xz / 11.3 + 0.37);
  vec4 c = texture2D(tRock, p.xz / 2.1 + 0.11);

  // The plates: the contours of a slow field, so that their edges are scalloped. t counts plates; a riser is never thinner than a pixel.
  float t = 5.5 * a.r + 0.45 * b.a;
  float level = floor(t);
  float f = t - level;
  float w = clamp(1.3 * fwidth(t), 0.05, 1.0);
  float keep = 1.0 - smoothstep(0.3, 0.9, w);
  float rise = smoothstep(1.0 - w, 1.0, f);
  // Each plate is a shallow dish: a raised dry brink at its outer edge, and its back, under the next edge, is low, shaded and holds water.
  float back = smoothstep(0.25, 0.7, f) * (1.0 - rise);
  float foot = smoothstep(1.0 - w - 0.22, 1.0 - w, f) * (1.0 - rise) * keep;
  float brink = smoothstep(0.2, 0.0, f) * keep;
  float h = (0.3 * (level + rise) + 0.05 * brink - 0.04 * back) * keep + 0.07 * b.r + 0.028 * c.r + 0.012 * c.g;

  // Water stands at the back of the low plates and wherever the ground itself is low.
  float pool = land.a + 1.5 * (0.5 - a.a) + 0.5 * (0.5 - b.r);
  float film = clamp(smoothstep(0.1, 0.4, pool + 0.5 * back) * back + smoothstep(0.55, 0.75, pool), 0.0, 1.0) * (1.0 - rise);
  float wet = clamp(0.6 + 0.6 * pool + 0.3 * back, 0.0, 1.0);
  n = raised(p, n, h * (1.0 - 0.75 * film));
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), 0.6 * film));

  vec3 rock = mix(vec3(0.3, 0.265, 0.22), vec3(0.56, 0.51, 0.43), clamp(0.5 + 1.8 * (a.a - 0.5) + 0.9 * (b.r - 0.5) + 0.5 * (c.a - 0.5), 0.0, 1.0));
  rock = mix(rock, vec3(0.66, 0.61, 0.52), 0.6 * brink);
  // Tea-brown where water has stood and dried, olive weed along the tide line.
  float stain = smoothstep(0.5, 0.72, b.a + 0.5 * (a.r - 0.5));
  rock = mix(rock, rock * vec3(0.62, 0.47, 0.34), 0.6 * stain);
  float tide = smoothstep(0.8, 0.0, abs(p.y + 0.05)) * smoothstep(0.4, 0.62, b.r);
  rock = mix(rock, vec3(0.085, 0.095, 0.05), 0.55 * tide);
  vec3 albedo = rock * mix(1.0, 0.6, wet) * (1.0 - 0.22 * back * keep - 0.35 * foot);
  albedo = mix(albedo, albedo * vec3(0.5, 0.56, 0.56), film);
  float rough = mix(mix(0.55, 0.3, wet), 0.1, film);
  float occ = (1.0 - 0.2 * back * keep - 0.4 * foot) * vOcc;
  gl_FragColor = vec4(rigOut(rigShade(p, n, v, albedo, rough, occ)), 1.0);
}`;

// The bone of the shaft: uBone 0 is the dark wet wall between the hoops, 1 the ivory cartilage of a hoop or a slab. Tea-brown stains run down it.
export const BONE_FRAGMENT = /* glsl */ `
${COMMON}
uniform float uBone;
uniform vec3 uPale;
uniform vec3 uDark;
void main() {
  vec3 p = vWorld;
  vec3 v = normalize(cameraPosition - p);
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec4 a = texture2D(tRock, vUv / 17.0);
  vec4 b = texture2D(tRock, vUv / 3.1 + 0.23);
  // Streaks that run down the face: the same tile, drawn out along the fall line.
  vec4 run = texture2D(tRock, vec2(vUv.x / 5.3, vUv.y / 41.0) + 0.5);
  float pit = smoothstep(0.35, 0.8, b.g);
  float joint = smoothstep(0.08, 0.0, a.b);
  float h = 0.22 * a.r + 0.07 * b.r - 0.06 * pit - 0.12 * joint;
  n = raised(p, n, h);
  float up = clamp(n.y, 0.0, 1.0);
  vec3 base = mix(uDark, uPale, clamp(0.5 + 1.5 * (a.r - 0.5) + 0.6 * (b.a - 0.5), 0.0, 1.0));
  float stain = smoothstep(0.45, 0.75, run.r + 0.35 * (a.a - 0.5)) * (1.0 - 0.6 * up);
  vec3 albedo = mix(base, base * vec3(0.5, 0.36, 0.24), 0.75 * stain * uBone + 0.3 * stain);
  // Under water level in the rock, and wherever the vapour condenses, it is dark and wet.
  float wet = clamp(0.45 + 0.5 * smoothstep(-2.0, -14.0, p.y) + 0.3 * stain, 0.0, 1.0);
  albedo *= (1.0 - 0.5 * joint - 0.35 * pit) * mix(1.0, 0.62, wet);
  float rough = mix(0.85, 0.38, wet);
  float occ = (1.0 - 0.5 * joint - 0.3 * pit) * vOcc;
  gl_FragColor = vec4(rigOut(rigShade(p, n, v, albedo, rough, occ)), 1.0);
}`;

// The far cliff: level strata of dark rock, pale ledges that hold scree, and the dark of the cave.
export const CLIFF_FRAGMENT = /* glsl */ `
${COMMON}
void main() {
  vec3 p = vWorld;
  vec3 v = normalize(cameraPosition - p);
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  vec4 a = texture2D(tRock, vec2(vUv.x / 2300.0, vUv.y / 520.0));
  vec4 b = texture2D(tRock, vec2(vUv.x / 410.0, vUv.y / 120.0) + 0.31);
  float strata = texture2D(tRock, vec2(vUv.x / 9000.0 + 0.1 * a.r, vUv.y / 260.0)).a;
  float h = 30.0 * a.r + 9.0 * b.r + 14.0 * strata - 10.0 * smoothstep(0.1, 0.0, a.b);
  n = raised(p, n, h);
  float ledge = smoothstep(0.5, 0.8, normalize(vNormal).y * (gl_FrontFacing ? 1.0 : -1.0) + 0.25 * (n.y - 0.3));
  vec3 rock = mix(vec3(0.022, 0.024, 0.03), vec3(0.075, 0.073, 0.072), clamp(0.5 + 2.2 * (strata - 0.5) + 0.6 * (b.r - 0.5), 0.0, 1.0));
  // Ledges, the scree and the top hold snow.
  vec3 albedo = mix(rock, vec3(0.62, 0.64, 0.68), ledge * smoothstep(0.3, 0.5, b.a + 0.25 * ledge));
  float occ = vOcc * (0.6 + 0.4 * b.r);
  gl_FragColor = vec4(rigOut(rigShade(p, n, v, albedo * vOcc, 0.85, occ)), 1.0);
}`;

export interface RockKit {
  shelf: THREE.ShaderMaterial;
  cliff: THREE.ShaderMaterial;
  bone(amount: number, pale: [number, number, number], dark: [number, number, number], side?: THREE.Side): THREE.ShaderMaterial;
  dispose(): void;
}

export function createRock(uniforms: Record<string, THREE.IUniform>, rng: Rng): RockKit {
  const tile = bakeRock(rng);
  const made: THREE.ShaderMaterial[] = [];
  const make = (fragmentShader: string, extra: Record<string, THREE.IUniform> = {}, side: THREE.Side = THREE.FrontSide): THREE.ShaderMaterial => {
    const m = new THREE.ShaderMaterial({ vertexShader: ROCK_VERTEX, fragmentShader, uniforms: { ...uniforms, tRock: { value: tile }, ...extra }, side, toneMapped: false });
    made.push(m);
    return m;
  };
  return {
    shelf: make(SHELF_FRAGMENT),
    cliff: make(CLIFF_FRAGMENT, {}, THREE.DoubleSide),
    bone: (amount, pale, dark, side) => make(BONE_FRAGMENT, { uBone: { value: amount }, uPale: { value: new THREE.Vector3(...pale) }, uDark: { value: new THREE.Vector3(...dark) } }, side),
    dispose: () => {
      for (const m of made) m.dispose();
      tile.dispose();
    },
  };
}
