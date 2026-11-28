// The rock of the shelf round the bones: craggy limestone that stands out of the water at the lip. It is a height field of plates,
// each a slab of its own height and tilt with open joints between, pitted by the water, on a fine mesh of its own. A plate either
// stands or lies under the water whole, so the edge of the rock is the broken line of the plates and not a contour. Above the
// waterline it is drawn here; from the waterline down the bed is the lake's.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { vnoise } from '../shared/noise';
import { bonesSeat } from '../skeleton/place';
import { lipAt } from './height';
import { LOD_GLSL, WARM_GLSL } from './lod';

/** The level of the flat the bones lie on, metres over the water. */
export const SHELF_FLAT = 0.055;

const frac = (v: number): number => v - Math.floor(v);
const rnd = (i: number, j: number, s: number): number => frac(Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453);
const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Plate {
  /** How far the point is from the nearest joint, metres. */
  joint: number;
  /** The plate's own numbers, and where its middle is. */
  i: number;
  j: number;
  u: number;
  w: number;
}

/** The plate a point lies on, of plates about `size` across. */
function plateAt(u: number, w: number, size: number, seed: number): Plate {
  const a = u / size;
  const b = w / size;
  const ia = Math.floor(a);
  const ib = Math.floor(b);
  let d1 = 1e9;
  let d2 = 1e9;
  let best: Plate = { joint: 0, i: 0, j: 0, u: 0, w: 0 };
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cu = ia + i + 0.15 + 0.7 * rnd(ia + i, ib + j, seed);
      const cw = ib + j + 0.15 + 0.7 * rnd(ia + i, ib + j, seed + 1);
      const d = Math.hypot(cu - a, cw - b);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        best = { joint: 0, i: ia + i, j: ib + j, u: cu * size, w: cw * size };
      } else if (d < d2) d2 = d;
    }
  }
  best.joint = 0.5 * (d2 - d1) * size;
  return best;
}

/** Metres over the water at a place of the bones' own frame (metres along the lip, metres toward the camera of the edge shot). */
export function shelfRock(u: number, w: number, toLip: (u: number, w: number) => number): number {
  // The joints do not run straight: the place is shifted, broadly and finely, before its plate is asked for.
  const su = u + 0.3 * (vnoise(u * 1.3 + 5, w * 1.3 + 2) - 0.5) + 0.08 * (vnoise(u * 4.3 + 5, w * 4.3 + 2) - 0.5);
  const sw = w + 0.3 * (vnoise(u * 1.3 + 11, w * 1.3 + 8) - 0.5) + 0.08 * (vnoise(u * 4.3 + 11, w * 4.3 + 8) - 0.5);
  const p = plateAt(su, sw * 1.25, 0.8, 3);
  const pw = p.w / 1.25;
  const lip = toLip(p.u, pw);
  // The plates the bones lie on are low and nearly level, and all of them stand.
  const under = Math.max(Math.max(-2.3 - p.u, p.u - 3.1), Math.max(-0.9 - pw, pw - 1.45)) < 0.3 * (rnd(p.i, p.j, 5) - 0.5);
  // Whether another plate stands: none beyond the line of the lip, fewer toward the shore and toward the two ends.
  const chance = smooth(0.02, 0.3, lip) * (1 - smooth(1.7, 3.8, lip + 1.4 * (vnoise(p.u * 0.6 + 3, pw * 0.6 + 9) - 0.5))) * (1 - smooth(3.8, 6.4, Math.abs(p.u - 0.6)));
  const stands = under ? lip > -0.25 : chance > 0.03 && rnd(p.i, p.j, 7) < 0.45 + 2 * chance;
  // Its top: highest along the lip, where the crust has grown, and lower where the water crosses it; tilted its own way.
  const crest = smooth(1.6, 0.25, lip);
  const tilt = (rnd(p.i, p.j, 11) - 0.5) * 0.34 * (su - p.u) + (rnd(p.i, p.j, 13) - 0.5) * 0.34 * (sw - pw);
  const top = under ? SHELF_FLAT + 0.024 * (rnd(p.i, p.j, 9) - 0.5) + 0.2 * tilt : 0.012 + 0.03 * crest + (0.03 + 0.1 * crest) * Math.pow(rnd(p.i, p.j, 9), 1.2) + 0.6 * tilt;
  let h = stands ? top : -0.12 - 0.1 * rnd(p.i, p.j, 15);
  const much = under ? 0.45 : 1;
  if (stands) {
    // The top of a plate is not a table: the water has cut it into sharp crests and hollows.
    const ridge = 1 - Math.abs(2 * vnoise(u * 2.9 + 3, w * 2.9 + 7) - 1);
    const ridge2 = 1 - Math.abs(2 * vnoise(u * 7.1 + 9, w * 7.1 + 1) - 1);
    h += much * (0.07 * (Math.pow(ridge, 4) - 0.25) + 0.035 * (Math.pow(ridge2, 3) - 0.3)) * (0.5 + crest);
    // A second, smaller breaking of the same rock: slabs that have split off the top of a plate.
    const q = plateAt(su + 7.3, sw + 2.1, 0.23, 21);
    h += much * ((rnd(q.i, q.j, 23) - 0.45) * 0.06 * (0.4 + crest)) - 0.02 * smooth(0.016, 0.0, q.joint);
    // The joint between two plates is open, and deeper than the water; its edges are worn round.
    // Not every joint has opened: along much of its length a joint is a hairline.
    const gape = smooth(0.38, 0.62, vnoise(u * 1.7 + 40, w * 1.7 + 3));
    h -= (under ? 0.05 : 0.16) * (0.12 + 0.88 * gape) * smooth(0.012 + 0.035 * gape * vnoise(u * 9, w * 9), 0.004, p.joint);
  }
  // Pits the water has eaten, and the grain of the stone.
  const pit = plateAt(u + 1.7, w + 4.4, 0.11, 31);
  const eaten = smooth(0.5, 0.15, Math.hypot(u + 1.7 - pit.u, w + 4.4 - pit.w) / 0.11) * smooth(0.35, 0.65, vnoise(u * 2.3 + 1, w * 2.3 + 6));
  return h - (under ? 0.008 : 0.04) * eaten + (under ? 0.006 : 0.016) * (vnoise(u * 17, w * 17) - 0.5) + 0.008 * (vnoise(u * 43 + 2, w * 43) - 0.5);
}

const SHELF_VERTEX = /* glsl */ `
attribute float aOpen;
attribute float aWeed;
varying float vWeed;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vOpen;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vNormal = normal;
  vOpen = aOpen;
  vWeed = aWeed;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SHELF_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying float vOpen;
varying float vWeed;
uniform sampler2D tFace;
uniform sampler2D tFaceNh;
${NOISE_GLSL}
${RIG_GLSL}
${LOD_GLSL}
${WARM_GLSL}
void main() {
  // Taken before anything else, and every sheet read at the level it gives: see lod.ts.
  takeLod(dFdx(vWorld), dFdy(vWorld));
  // An upright face is not smeared: the sheet is laid a little aslant, so that it runs on down it.
  vec2 at = vWorld.xz + vWorld.y * vec2(0.9, 1.2);
  vec3 skin = textureLod(tFace, at / 1.3, AT(1024.0, 1.3)).rgb;
  vec3 fine = textureLod(tFaceNh, at / 1.3, AT(1024.0, 1.3)).rgb;
  vec3 broad = textureLod(tFaceNh, at / 4.1 + 0.37, AT(1024.0, 4.1)).rgb;
  vec3 grit = textureLod(tFaceNh, at / 0.41 + 0.61, AT(1024.0, 0.41)).rgb;
  vec3 n = normalize(normalize(vNormal) + vec3(fine.r - 0.5 + 0.8 * (broad.r - 0.5), 0.0, fine.g - 0.5 + 0.8 * (broad.g - 0.5)) * 0.9 + vec3(grit.r - 0.5, 0.0, grit.g - 0.5) * 2.2);
  vec3 v = normalize(cameraPosition - vWorld);
  float lift = vWorld.y;
  float open = vOpen;

  // Pale limestone, bleached where it stands dry, mottled by the sheet about its own mean.
  vec3 albedo = mix(vec3(0.6, 0.58, 0.52), vec3(0.72, 0.71, 0.66), smoothstep(0.05, 0.2, lift + 0.08 * (broad.b - 0.5)));
  albedo *= mix(vec3(1.0), skin / vec3(0.34, 0.33, 0.31), 0.3) * (0.85 + 0.3 * fine.b);
  float stain = vnoise(at * 2.3 + 4.0) * 0.6 + vnoise(at * 7.1 + 1.0) * 0.4;
  albedo *= (0.8 + 0.4 * stain) * (0.5 + 1.0 * grit.b);
  // Dirt lies in the joints and the pits; a dark crust of what grows there on the low rock.
  albedo *= mix(0.3, 1.0, smoothstep(0.25, 0.85, open));
  float crust = max(smoothstep(0.7, 0.4, open) * smoothstep(0.4, 0.62, vnoise(at * 5.3 + 9.0)), smoothstep(0.56, 0.7, 0.6 * vnoise(at * 11.0 + 9.0) + 0.4 * vnoise(at * 31.0)) * 0.7);
  albedo = mix(albedo, vec3(0.09, 0.085, 0.06), 0.6 * crust);
  // The rust of the mats where the water washes over it: on the low tops and in the hollows, in streaks that run with the lip.
  float washed = smoothstep(0.14, 0.06, lift + 0.06 * (stain - 0.5)) * smoothstep(0.42, 0.66, 0.6 * vnoise(at * 1.3 + 21.0) + 0.4 * vnoise(at * 4.1 + 2.0) + 0.45 * (1.0 - open));
  albedo = mix(albedo, albedo * vec3(0.62, 0.36, 0.15), 0.85 * washed);
  // The wet weed the bones lie half sunk in: a dark mat on the rock about them, thinner on what stands proud of it.
  float mat = vWeed * smoothstep(1.0, 0.45, open - 0.5 * vnoise(at * 6.1 + 17.0));
  float strand = vnoise(vec2(dot(at, vec2(0.8, 0.6)) * 9.0, dot(at, vec2(-0.6, 0.8)) * 70.0) + 3.0 * vnoise(at * 2.7));
  albedo = mix(albedo, mix(vec3(0.07, 0.035, 0.012), vec3(0.34, 0.16, 0.05), strand), 0.9 * mat);
  // Lichen in pale and rusty patches on the high tops.
  float patches = smoothstep(0.62, 0.76, vnoise(at * 4.7 + 13.0)) * smoothstep(0.1, 0.2, lift) * smoothstep(0.5, 0.9, n.y);
  albedo = mix(albedo, mix(vec3(0.74, 0.72, 0.62), vec3(0.55, 0.36, 0.14), smoothstep(0.5, 0.52, vnoise(at * 1.9 + 31.0))), 0.45 * patches);
  // The wet line: dark as high as the water creeps, with a sheen.
  float damp = max(smoothstep(0.065, 0.02, lift + 0.04 * (vnoise(at * 3.3) - 0.5) + 0.02 * (vnoise(at * 23.0) - 0.5)), 0.7 * mat);
  albedo *= mix(1.0, 0.45, damp);
  float occ = mix(0.35, 1.0, smoothstep(0.1, 0.9, open)) * (0.8 + 0.2 * fine.b);
  vec3 c = rigShade(vWorld, n, v, clamp(albedo * mix(vec3(1.0), warmSide(n), 0.35), 0.0, 0.92), mix(0.9, 0.3, damp), occ);
  c += damp * 0.5 * rigGlint(vWorld, n, v, 0.3);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const SHELF_DEPTH = /* glsl */ `
void main() {
  gl_FragColor = vec4(0.0);
}`;

export function createShelf(ctx: Context, sheets: Record<string, THREE.IUniform>): { mesh: THREE.Mesh; dispose: () => void } {
  const seat = bonesSeat();
  const world = (u: number, w: number): [number, number] => [seat.x + seat.along[0] * u + seat.toCamera[0] * w, seat.z + seat.along[1] * u + seat.toCamera[1] * w];
  const toLip = (u: number, w: number): number => {
    const [x, z] = world(u, w);
    return Math.hypot(x, z) - lipAt(Math.atan2(x, -z));
  };
  const CELL = 0.022;
  const U0 = -6.4;
  const W0 = -2.6;
  const wide = Math.round(13.8 / CELL) + 1;
  const tall = Math.round(6.6 / CELL) + 1;
  const height = new Float32Array(wide * tall);
  for (let j = 0; j < tall; j++) for (let i = 0; i < wide; i++) height[j * wide + i] = shelfRock(U0 + i * CELL, W0 + j * CELL, toLip);
  // How much of the sky a place sees: how far it lies under the rock about it, at two reaches.
  const blurred = (reach: number): Float32Array => {
    const pass = new Float32Array(wide * tall);
    const out = new Float32Array(wide * tall);
    for (let j = 0; j < tall; j++) {
      let sum = 0;
      for (let i = -reach; i < wide; i++) {
        if (i + reach < wide) sum += Math.max(height[j * wide + i + reach] as number, 0);
        if (i - reach - 1 >= 0) sum -= Math.max(height[j * wide + i - reach - 1] as number, 0);
        if (i >= 0) pass[j * wide + i] = sum / (Math.min(wide - 1, i + reach) - Math.max(0, i - reach) + 1);
      }
    }
    for (let i = 0; i < wide; i++) {
      let sum = 0;
      for (let j = -reach; j < tall; j++) {
        if (j + reach < tall) sum += pass[(j + reach) * wide + i] as number;
        if (j - reach - 1 >= 0) sum -= pass[(j - reach - 1) * wide + i] as number;
        if (j >= 0) out[j * wide + i] = sum / (Math.min(tall - 1, j + reach) - Math.max(0, j - reach) + 1);
      }
    }
    return out;
  };
  const near = blurred(2);
  const far = blurred(7);
  const position = new Float32Array(wide * tall * 3);
  const open = new Float32Array(wide * tall);
  const weed = new Float32Array(wide * tall);
  for (let j = 0; j < tall; j++) {
    for (let i = 0; i < wide; i++) {
      const o = j * wide + i;
      const [x, z] = world(U0 + i * CELL, W0 + j * CELL);
      const h = height[o] as number;
      position[o * 3] = x;
      position[o * 3 + 1] = h;
      position[o * 3 + 2] = z;
      const u = U0 + i * CELL;
      const w = W0 + j * CELL;
      const off = Math.max(Math.max(-1.9 - u, u - 3.0), Math.max(-0.75 - w, w - 1.3));
      weed[o] = smooth(0.55, -0.25, off + 0.6 * (vnoise(u * 1.9 + 7, w * 1.9 + 3) - 0.5)) * (0.5 + 0.5 * smooth(0.3, 0.6, vnoise(u * 5.3, w * 5.3 + 9)));
      open[o] = Math.min(1, Math.max(0, 0.8 - 22 * ((near[o] as number) - h) - 7 * ((far[o] as number) - h)));
    }
  }
  // Only what stands out of the water, and the faces that go down into it, is kept.
  const index: number[] = [];
  const up = (o: number): boolean => (height[o] as number) > -0.02;
  for (let j = 0; j < tall - 1; j++) {
    for (let i = 0; i < wide - 1; i++) {
      const a = j * wide + i;
      const b = a + wide;
      if (!(up(a) || up(a + 1) || up(b) || up(b + 1))) continue;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aOpen', new THREE.BufferAttribute(open, 1));
  geometry.setAttribute('aWeed', new THREE.BufferAttribute(weed, 1));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, tFace: sheets.tFace as THREE.IUniform, tFaceNh: sheets.tFaceNh as THREE.IUniform },
    vertexShader: SHELF_VERTEX,
    fragmentShader: SHELF_FRAGMENT,
    side: THREE.DoubleSide,
  });
  material.userData.depthFragment = SHELF_DEPTH;
  const mesh = new THREE.Mesh(geometry, material);
  geometry.computeBoundingSphere();
  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
