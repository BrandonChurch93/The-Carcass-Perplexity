// What the dead wader has left on the rock under it: the dark stain it lies in, the line of salt where that dried, and the grit against it.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

type V3 = [number, number, number];

/** Metres on the ground from a point to a line of points, in the animal's own metres. */
function toLine(x: number, z: number, line: readonly V3[]): number {
  let best = 1e9;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1] as V3;
    const b = line[i] as V3;
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t));
  }
  return best;
}

const STAIN_VERTEX = /* glsl */ `
attribute float aNear;
varying vec3 vWorld;
varying float vNear;
void main() {
  vWorld = position;
  vNear = aNear;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const STAIN_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying float vNear;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float broad = fbm(vWorld.xz * 2.3);
  float fine = vnoise(vWorld.xz * 17.0);
  float d = vNear + 0.5 * (broad - 0.5) + 0.07 * (fine - 0.5);
  // What ran out of it has soaked the rock dark, darkest under it; where its edge dried there is a pale broken line of salt.
  float stain = smoothstep(0.42, 0.0, d);
  float salt = smoothstep(0.07, 0.0, abs(d - 0.45)) * smoothstep(0.3, 0.7, fine);
  float alpha = max(0.88 * stain * (0.6 + 0.4 * broad), 0.4 * salt);
  if (alpha < 0.004) discard;
  vec3 albedo = mix(vec3(0.62, 0.6, 0.56), mix(vec3(0.05, 0.03, 0.025), vec3(0.1, 0.032, 0.026), fine), smoothstep(0.0, 0.25, stain));
  vec3 colour = rigShade(vWorld, vec3(0.0, 1.0, 0.0), v, albedo, mix(0.9, 0.5, stain), 1.0);
  float keep = 1.0 - uSolo;
  gl_FragColor = vec4(rigOut(colour * alpha), alpha * keep);
}`;

const GRIT_VERTEX = /* glsl */ `
attribute float aTone;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTone;
void main() {
  vWorld = position;
  vNormal = normal;
  vTone = aTone;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const GRIT_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vTone;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float speck = vnoise(vWorld.xz * 160.0 + vWorld.y * 90.0);
  vec3 albedo = mix(vec3(0.16, 0.14, 0.125), vec3(0.36, 0.33, 0.3), vTone) * (0.8 + 0.4 * speck);
  // Salt has dried on what faces up.
  albedo = mix(albedo, vec3(0.74, 0.72, 0.68), 0.5 * smoothstep(0.5, 0.95, n.y) * smoothstep(0.35, 0.7, speck + 0.3 * vTone));
  float occ = 0.5 + 0.5 * smoothstep(-0.4, 0.5, n.y);
  vec3 colour = rigShade(vWorld, n, v, albedo, 0.85, occ);
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

export function makeGround(ctx: Context, world: (p: V3) => V3, lines: readonly (readonly V3[])[], k: number): { group: THREE.Group; dispose(): void } {
  const rng = ctx.rng('dead-wader-ground');
  const trunk = lines[0] as readonly V3[];
  /** How far a place is from the animal: nothing under the trunk, more under a limb than beside it. */
  const near = (x: number, z: number): number => {
    let d = toLine(x, z, trunk) - 0.34;
    for (let i = 1; i < lines.length; i++) d = Math.min(d, toLine(x, z, lines[i] as readonly V3[]) * (i === 1 ? 1.5 : 2.1) + 0.14);
    return d;
  };

  // The stain: a sheet laid on the rock, a finger above it.
  const x0 = -1.5;
  const x1 = 2.6;
  const z0 = -3.6;
  const z1 = 4.4;
  const nx = 50;
  const nz = 96;
  const positions = new Float32Array((nx + 1) * (nz + 1) * 3);
  const nears = new Float32Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx;
      const z = z0 + ((z1 - z0) * j) / nz;
      const w = world([x, 0.075 / k, z]);
      const o = j * (nx + 1) + i;
      positions.set(w, o * 3);
      // Nothing of it at the edge of the sheet.
      const border = Math.min(i, nx - i, j, nz - j) / 4;
      nears[o] = near(x, z) + Math.max(0, 1 - border) * 2;
    }
  }
  const index: number[] = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      index.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2);
    }
  }
  const stainGeometry = new THREE.BufferGeometry();
  stainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  stainGeometry.setAttribute('aNear', new THREE.BufferAttribute(nears, 1));
  stainGeometry.setIndex(index);
  const stainMaterial = new THREE.ShaderMaterial({
    vertexShader: STAIN_VERTEX,
    fragmentShader: STAIN_FRAGMENT,
    uniforms: { ...ctx.rig.uniforms },
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const stain = new THREE.Mesh(stainGeometry, stainMaterial);
  stain.frustumCulled = false;
  stain.renderOrder = 4;

  // The grit: small broken stones, most of them close against the body where the wind and the tide have left them.
  const base = new THREE.IcosahedronGeometry(1, 1);
  const basePositions = base.getAttribute('position');
  const count = 300;
  const each = basePositions.count;
  const gritPositions = new Float32Array(count * each * 3);
  const gritNormals = new Float32Array(count * each * 3);
  const gritTones = new Float32Array(count * each);
  for (let n = 0; n < count; n++) {
    let x = 0;
    let z = 0;
    for (let tries = 0; tries < 8; tries++) {
      const line = lines[rng.int(lines.length)] as readonly V3[];
      const at = rng.next() * (line.length - 1);
      const i = Math.min(line.length - 2, Math.floor(at));
      const a = line[i] as V3;
      const b = line[i + 1] as V3;
      const f = at - i;
      const angle = rng.range(0, Math.PI * 2);
      const out = 0.12 + 1.5 * rng.next() ** 2.2;
      x = a[0] + (b[0] - a[0]) * f + Math.cos(angle) * out;
      z = a[2] + (b[2] - a[2]) * f + Math.sin(angle) * out;
      if (toLine(x, z, trunk) > 0.4) break;
    }
    const size = (0.006 + 0.02 * rng.next() ** 3) * k;
    const sx = size * rng.range(0.7, 1.5);
    const sy = size * rng.range(0.3, 0.7);
    const sz = size * rng.range(0.7, 1.5);
    const turn = rng.range(0, Math.PI * 2);
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    const centre = world([x, 0, z]);
    const tone = rng.next();
    const lump = rng.range(0, 40);
    for (let v = 0; v < each; v++) {
      const px = basePositions.getX(v);
      const py = basePositions.getY(v);
      const pz = basePositions.getZ(v);
      // Broken, not round: each corner stands in or out by its own amount, the same wherever two faces share it.
      const h = Math.sin(px * 12.9 + py * 78.2 + pz * 37.7 + lump) * 43758.5;
      const bump = 0.72 + 0.5 * (h - Math.floor(h));
      const lx = px * sx * bump;
      const ly = py * sy * bump;
      const lz = pz * sz * bump;
      const o = (n * each + v) * 3;
      gritPositions[o] = centre[0] + lx * c + lz * s;
      gritPositions[o + 1] = centre[1] + ly + 0.022;
      gritPositions[o + 2] = centre[2] - lx * s + lz * c;
      const ax = px / sx;
      const ay = py / sy;
      const az = pz / sz;
      const al = Math.hypot(ax, ay, az) || 1;
      gritNormals[o] = (ax * c + az * s) / al;
      gritNormals[o + 1] = ay / al;
      gritNormals[o + 2] = (-ax * s + az * c) / al;
      gritTones[n * each + v] = tone;
    }
  }
  base.dispose();
  const gritGeometry = new THREE.BufferGeometry();
  gritGeometry.setAttribute('position', new THREE.BufferAttribute(gritPositions, 3));
  gritGeometry.setAttribute('normal', new THREE.BufferAttribute(gritNormals, 3));
  gritGeometry.setAttribute('aTone', new THREE.BufferAttribute(gritTones, 1));
  const gritMaterial = new THREE.ShaderMaterial({ vertexShader: GRIT_VERTEX, fragmentShader: GRIT_FRAGMENT, uniforms: { ...ctx.rig.uniforms } });
  const grit = new THREE.Mesh(gritGeometry, gritMaterial);
  grit.frustumCulled = false;

  const group = new THREE.Group();
  group.add(stain, grit);
  return {
    group,
    dispose: () => {
      stainGeometry.dispose();
      stainMaterial.dispose();
      gritGeometry.dispose();
      gritMaterial.dispose();
    },
  };
}
