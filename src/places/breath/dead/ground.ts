// What has gathered against the dead wader: the grit it is half bedded in. Its stain is in the rock itself (land/rock.ts): as a sheet
// laid a finger over the rock it won and lost its depth test against the drawn land as the lens moved, and the ground under the body
// flipped between pale and red.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

type V3 = [number, number, number];

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
  vec3 albedo = mix(vec3(0.3, 0.27, 0.235), vec3(0.6, 0.56, 0.49), vTone) * (0.8 + 0.4 * speck);
  // Salt has dried on what faces up.
  albedo = mix(albedo, vec3(0.74, 0.72, 0.68), 0.5 * smoothstep(0.5, 0.95, n.y) * smoothstep(0.35, 0.7, speck + 0.3 * vTone));
  float occ = 0.5 + 0.5 * smoothstep(-0.4, 0.5, n.y);
  // The body's own shade on the rock is a dark disc: read through it each grain was a black bead. They are lit above it and shaded by hand.
  vec3 colour = rigShade(vWorld + vec3(0.0, 5.0, 0.0), n, v, albedo, 0.85, 0.7 * occ);
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

export function makeGround(ctx: Context, world: (p: V3) => V3, lines: readonly (readonly V3[])[], k: number): { group: THREE.Group; dispose(): void } {
  const rng = ctx.rng('dead-wader-ground');
  // The grit: broken stones from a grain to a knuckle, heaped against the body on the side the wind and the tide come from, so that its
  // low edge is in them and not on them. Each is a small solid with flat broken faces.
  const base = new THREE.IcosahedronGeometry(1, 0);
  const basePositions = base.getAttribute('position');
  const count = 2600;
  const each = basePositions.count;
  const gritPositions = new Float32Array(count * each * 3);
  const gritNormals = new Float32Array(count * each * 3);
  const gritTones = new Float32Array(count * each);
  for (let n = 0; n < count; n++) {
    const line = lines[rng.int(lines.length)] as readonly V3[];
    const at = rng.next() * (line.length - 1);
    const i = Math.min(line.length - 2, Math.floor(at));
    const a = line[i] as V3;
    const b = line[i + 1] as V3;
    const f = at - i;
    const angle = rng.range(0, Math.PI * 2);
    const out = 0.01 + 0.6 * rng.next() ** 1.7;
    const side = rng.next() < 0.78 ? -Math.abs(Math.sin(angle)) : 0.6 * Math.abs(Math.sin(angle));
    const x = a[0] + (b[0] - a[0]) * f + Math.cos(angle) * out;
    const z = a[2] + (b[2] - a[2]) * f + side * out;
    // Most are grains; the knuckles lie where the heap is.
    const size = (0.004 + 0.02 * rng.next() ** 3 * (0.4 + 0.6 * Math.exp(-out / 0.2))) * k;
    const sx = size * rng.range(0.7, 1.5);
    const sy = size * rng.range(0.4, 0.8);
    const sz = size * rng.range(0.7, 1.5);
    const turn = rng.range(0, Math.PI * 2);
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    const centre = world([x, 0, z]);
    // The heap: three fingers high at the body, gone a forearm out from it.
    const heap = 0.035 * k * Math.exp(-out / 0.13) * rng.range(0.2, 1);
    const tone = rng.next();
    const lump = rng.range(0, 40);
    for (let v = 0; v < each; v++) {
      const px = basePositions.getX(v);
      const py = basePositions.getY(v);
      const pz = basePositions.getZ(v);
      // Broken, not round: each corner stands in or out by its own amount, the same wherever two faces share it.
      const h = Math.sin(px * 12.9 + py * 78.2 + pz * 37.7 + lump) * 43758.5;
      const bump = 0.62 + 0.6 * (h - Math.floor(h));
      const lx = px * sx * bump;
      const ly = py * sy * bump;
      const lz = pz * sz * bump;
      const o = (n * each + v) * 3;
      gritPositions[o] = centre[0] + lx * c + lz * s;
      gritPositions[o + 1] = centre[1] + ly + heap + 0.3 * sy;
      gritPositions[o + 2] = centre[2] - lx * s + lz * c;
      gritTones[n * each + v] = tone;
    }
    // Flat faces: the normal of each triangle from its own three corners.
    for (let t = 0; t < each; t += 3) {
      const o = (n * each + t) * 3;
      const ux = (gritPositions[o + 3] as number) - (gritPositions[o] as number);
      const uy = (gritPositions[o + 4] as number) - (gritPositions[o + 1] as number);
      const uz = (gritPositions[o + 5] as number) - (gritPositions[o + 2] as number);
      const vx = (gritPositions[o + 6] as number) - (gritPositions[o] as number);
      const vy = (gritPositions[o + 7] as number) - (gritPositions[o + 1] as number);
      const vz = (gritPositions[o + 8] as number) - (gritPositions[o + 2] as number);
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1;
      for (let q = 0; q < 3; q++) {
        gritNormals[o + q * 3] = nx / nl;
        gritNormals[o + q * 3 + 1] = ny / nl;
        gritNormals[o + q * 3 + 2] = nz / nl;
      }
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
  group.add(grit);
  return {
    group,
    dispose: () => {
      gritGeometry.dispose();
      gritMaterial.dispose();
    },
  };
}
