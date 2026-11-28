// The skeleton on the lip: one of the herd, long dead, lying on its side where the floor stops. Every bone is a body of its own, built
// here: ribs bent from the spine, some fallen, vertebrae, a small skull, the long bones of the limbs trailing along the lip. They lie
// half in the crust, stained and cracked, with the weed of the shelf drawn over them strand by strand.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lipAt } from '../land/height';
import { vnoise } from '../shared/noise';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { WARM_GLSL } from '../land/lod';
import { SCALE, bonesSeat } from './place';
import { SCULPT } from './sculpt';

export const PARTS: readonly string[] = ['skeleton'];

/** Where it lies: on the lip, ahead and to the right of the camera of the edge shot, and the bearing its spine lies along. */

const VERTEX = /* glsl */ `
// aBone: the tone of the bone (below nothing: a strand of weed), how near its end the point is, and how much of the sky it sees.
attribute vec3 aBone;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vBone;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vLocal = position;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vBone = aBone;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vBone;
${NOISE_GLSL}
${RIG_GLSL}
${WARM_GLSL}
// The grain of weathered bone: pits, and the long lines it splits along.
float grain(vec3 q) {
  return 0.45 * vnoise(q.xz * 36.0 + q.y * 27.0) + 0.4 * vnoise(q.xy * 95.0 + q.z * 85.0) + 0.15 * vnoise(q.zy * 210.0 + q.x * 155.0);
}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 q = vLocal;
  float lift = vWorld.y;
  // The software renderer shades four pixels together, and a screen derivative taken under a branch takes stale memory from the pixels
  // that did not go that way: no frame then renders the same twice. So the grain of bone is worked out here, for every point,
  // and its lie across the screen taken before any branch.
  float h = grain(q);
  vec3 dx = dFdx(vWorld);
  vec3 dy = dFdy(vWorld);
  vec2 hLie = vec2(dFdx(h), dFdy(h));
  if (dot(n, v) < 0.0) n = -n;
  vec3 albedo;
  float rough;
  float occ;
  float glint;
  // Weed and bone part only in what they are made of: the rig is asked once, after the branch, since it reads its maps and a read
  // under a branch a pixel decides is not the same twice.
  if (vBone.x < 0.0) {
    // Weed: the dark amber of the mats, wet where it lies in the water.
    vec3 weed = mix(vec3(0.2, 0.1, 0.035), vec3(0.56, 0.27, 0.07), fract(vBone.y * 7.31) * (0.5 + 0.5 * vnoise(q.xz * 9.0))) * (0.75 + 0.5 * vnoise(q.xz * 160.0 + q.y * 90.0));
    float wet = smoothstep(0.05, 0.0, lift);
    // A strand is too thin to have a dark side: it is lit as the floor it lies on.
    n = normalize(n + vec3(0.0, 2.0, 0.0));
    albedo = weed * mix(1.0, 0.8, wet);
    rough = mix(0.7, 0.3, wet);
    occ = 0.85 + 0.15 * smoothstep(0.0, 0.1, lift);
    glint = wet * 0.5;
  } else {
  // The relief of its surface turns the light: the lie of the grain, taken across the screen.
  vec3 r1 = cross(dy, n);
  vec3 r2 = cross(n, dx);
  float det = dot(dx, r1);
  vec3 lean = sign(det) * (hLie.x * r1 + hLie.y * r2);
  // Only where a pixel is finer than the grain: on a rib a few pixels wide the lie across the screen is the rib's edge, not its grain.
  n = normalize(abs(det) * n - 0.0045 * smoothstep(0.012, 0.003, length(dx) + length(dy)) * lean);

  // Old bone: ivory where the air has had it, bleached on what looks up, yellow and brown where it has lain.
  float tone = vBone.x;
  vec3 bone = mix(vec3(0.7, 0.63, 0.5), vec3(0.96, 0.93, 0.84), tone);
  bone = mix(bone, vec3(0.86, 0.84, 0.76), 0.5 * smoothstep(0.2, 0.9, n.y));
  float stain = 0.6 * vnoise(q.xz * 11.0 + q.y * 7.0 + tone * 40.0) + 0.4 * vnoise(q.xy * 37.0 + q.z * 29.0);
  bone = mix(bone, bone * vec3(0.62, 0.45, 0.27), 0.4 * smoothstep(0.42, 0.64, stain));
  // Grey where lichen and lime have taken it in patches.
  bone = mix(bone, vec3(0.56, 0.56, 0.5) * (0.7 + 0.6 * h), 0.3 * smoothstep(0.6, 0.74, vnoise(q.xz * 23.0 + q.y * 17.0 + 40.0 + tone * 13.0)));
  // Its ends are spongy and hold the dirt; its shafts are split along fine dark lines.
  float porous = vBone.y * smoothstep(0.45, 0.6, vnoise(q.xz * 130.0 + q.y * 105.0));
  bone *= 1.0 - 0.32 * porous;
  float split = smoothstep(0.03, 0.0, abs(vnoise(q.xz * 33.0 + q.y * 27.0 + 5.0) - 0.5)) * smoothstep(0.25, 0.5, vnoise(q.xz * 6.0 + 3.0 + tone * 9.0));
  bone *= 1.0 - 0.8 * split;
  bone *= 0.9 + 0.2 * h;
  // Where it lies in the floor the floor has taken it: a pale crust of lime up its sides, and the rust of the mats on it below that.
  float crusted = smoothstep(0.06, 0.015, lift + 0.07 * (vnoise(q.xz * 19.0 + 2.0) - 0.5)) * smoothstep(0.35, 0.55, vnoise(q.xz * 43.0 + q.y * 31.0 + 8.0) + 0.25 * (0.05 - lift) / 0.05);
  bone = mix(bone, vec3(0.7, 0.67, 0.58) * (0.75 + 0.5 * h), 0.7 * crusted);
  float grown = smoothstep(0.06, 0.005, lift + 0.06 * (vnoise(q.xz * 27.0 + 6.0) - 0.5));
  bone = mix(bone, bone * vec3(0.55, 0.3, 0.11), 0.85 * grown);
  // The damp line: wet as high as the water creeps up it.
  float damp = smoothstep(0.028, 0.01, lift + 0.012 * (vnoise(q.xz * 60.0) - 0.5));
  bone *= mix(1.0, 0.5, damp);
  // Low down and inside the cage little of the sky is seen.
  occ = vBone.z * (0.6 + 0.4 * smoothstep(0.0, 0.1, lift)) * (0.87 + 0.13 * smoothstep(0.3, 0.6, h));
  albedo = clamp(bone * mix(vec3(1.0), warmSide(n), 0.45), 0.0, 0.95);
  rough = mix(0.8, 0.35, damp);
  glint = damp * 0.6;
  }
  // The rig's contact shade under the bones is meant for the floor: a bone that stands in it would be darkened by its own shade, the
  // ribs most. A bone is lit as a thing above that shade, and what it sees less of the sky for is in its own measure (vBone.z).
  vec3 lit = vWorld + vec3(0.0, vBone.x < 0.0 ? 0.0 : 3.2, 0.0);
  vec3 c = rigShade(lit, n, v, albedo, rough, occ);
  c += glint * rigGlint(lit, n, v, 0.3);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const DEPTH = /* glsl */ `
void main() {
  gl_FragColor = vec4(0.0);
}`;

// The floor under the bones is not ours to draw, so what the bones take from it is laid over it: one sheet that only darkens.
const SHADE_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// The sheet's map: what it covers in the frame of the bones, and its size.
const MAP = { x0: -1.7, x1: 2.3, z0: -1.0, z1: 1.0, wide: 1536, tall: 768 };

// tShade: r, how closely a bone lies over the floor there; g, whether a bone stands between it and the sun; b, 1 on the floor and 0
// past the lip, where there is no floor to darken.
const SHADE_FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
uniform sampler2D tShade;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec4 land = landAt(vWorld.xz);
  // The sheet is seen nearly edge on, and a level chosen by its long way across the screen would wash a thin bone's shade out: the
  // level is taken from the short way. The map is soft already and does not shimmer for it.
  vec2 texel = vUv * vec2(${MAP.wide}.0, ${MAP.tall}.0);
  float level = log2(max(1.0, min(length(dFdx(texel)), length(dFdy(texel)))));
  vec3 m = textureLod(tShade, vUv, level).rgb;
  // Out of the sun the floor has the sky alone, and that is blue; close under a bone it has little of either, and it is damp there.
  // Where the cliffs have the sun already, the bones still stand between the floor and the bright west of the sky: a fainter shade.
  vec3 f = mix(vec3(1.0), vec3(0.3, 0.36, 0.46), 0.92 * m.g * max(sunOver(land, vWorld), 0.6));
  // Damp, not black: a bone that has gone under the crust leaves a dark line of wet, never a hole.
  f *= mix(vec3(1.0), vec3(0.5, 0.43, 0.37), smoothstep(0.0, 0.32, m.r));
  gl_FragColor = vec4(mix(vec3(1.0), f, m.b), 1.0);
}`;


/** The map the sheet reads, worked out once from the bones themselves: `sun` points to the sun in the frame of the bones. */
function shadeMap(geometry: THREE.BufferGeometry, sun: V3, sunk: number, inFromLip: (x: number, z: number) => number): THREE.DataTexture {
  const { x0, x1, z0, z1, wide, tall } = MAP;
  const near = new Float32Array(wide * tall);
  const hidden = new Float32Array(wide * tall);
  const p = geometry.getAttribute('position') as THREE.BufferAttribute;
  const b = geometry.getAttribute('aBone') as THREE.BufferAttribute;
  const sx = wide / (x1 - x0);
  const sz = tall / (z1 - z0);
  const fill = (into: Float32Array, value: number, ax: number, az: number, bx: number, bz: number, cx: number, cz: number): void => {
    const area = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    if (Math.abs(area) < 1e-9) return;
    const i0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const i1 = Math.min(wide - 1, Math.ceil(Math.max(ax, bx, cx)));
    const j0 = Math.max(0, Math.floor(Math.min(az, bz, cz)));
    const j1 = Math.min(tall - 1, Math.ceil(Math.max(az, bz, cz)));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const u = i + 0.5;
        const w = j + 0.5;
        const e0 = ((bx - ax) * (w - az) - (bz - az) * (u - ax)) / area;
        const e1 = ((cx - bx) * (w - bz) - (cz - bz) * (u - bx)) / area;
        const e2 = ((ax - cx) * (w - cz) - (az - cz) * (u - cx)) / area;
        // A little over the edge, so that a bone thinner than a cell still leaves its line.
        if (e0 < -0.02 || e1 < -0.02 || e2 < -0.02) continue;
        const o = j * wide + i;
        if (value > (into[o] as number)) into[o] = value;
      }
    }
  };
  for (let t = 0; t + 2 < p.count; t += 3) {
    if (b.getX(t) < 0) continue;
    const xs: number[] = [];
    const zs: number[] = [];
    const hx: number[] = [];
    const hz: number[] = [];
    let high = 0;
    for (let k = 0; k < 3; k++) {
      const y = Math.max(0, p.getY(t + k) - sunk);
      high += y / 3;
      xs.push((p.getX(t + k) - x0) * sx);
      zs.push((p.getZ(t + k) - z0) * sz);
      hx.push((p.getX(t + k) - (sun[0] / sun[1]) * y - x0) * sx);
      hz.push((p.getZ(t + k) - (sun[2] / sun[1]) * y - z0) * sz);
    }
    fill(near, Math.max(0.12, 1 - high / 0.11), xs[0] as number, zs[0] as number, xs[1] as number, zs[1] as number, xs[2] as number, zs[2] as number);
    fill(hidden, 1, hx[0] as number, hz[0] as number, hx[1] as number, hz[1] as number, hx[2] as number, hz[2] as number);
  }
  // Soft, as a shade is: twice over the rows and twice over the columns.
  const soften = (a: Float32Array, reach: number): Float32Array => {
    let from = a;
    for (let pass = 0; pass < 4; pass++) {
      const to = new Float32Array(wide * tall);
      const acrossRows = pass % 2 === 0;
      const lines = acrossRows ? tall : wide;
      const length = acrossRows ? wide : tall;
      const stride = acrossRows ? 1 : wide;
      for (let l = 0; l < lines; l++) {
        const base = acrossRows ? l * wide : l;
        let sum = 0;
        for (let i = -reach; i <= reach; i++) sum += from[base + Math.max(0, Math.min(length - 1, i)) * stride] as number;
        for (let i = 0; i < length; i++) {
          to[base + i * stride] = sum / (2 * reach + 1);
          sum += (from[base + Math.min(length - 1, i + reach + 1) * stride] as number) - (from[base + Math.max(0, i - reach) * stride] as number);
        }
      }
      from = to;
    }
    return from;
  };
  const close = soften(near, 3);
  const round = soften(near, 14);
  const thrown = soften(hidden, 2);
  const data = new Uint8Array(wide * tall * 4);
  for (let i = 0; i < wide * tall; i++) {
    data[i * 4] = Math.round(255 * Math.min(1, 0.6 * (close[i] as number) + 0.9 * (round[i] as number)));
    const inside = inFromLip(x0 + ((i % wide) + 0.5) / sx, z0 + (Math.floor(i / wide) + 0.5) / sz);
    // The lip is drawn more ragged than it is reckoned: a thrown shade stops well short of it.
    data[i * 4 + 1] = Math.round(255 * Math.min(1, thrown[i] as number) * Math.max(0, Math.min(1, (inside - 0.3) / 0.3)));
    data[i * 4 + 2] = inside > 0.08 ? 255 : 0;
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, wide, tall, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

type V3 = [number, number, number];

/** How deep the bones are sunk in the floor, in their own measure. */
const SUNK = 0.017;

/** A number from 0 to 1 that belongs to three others: the bones are the same bones in every frame. */
function hash(a: number, b: number, c: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** One strand of weed along the points given: a flat blade that narrows to nothing at its tip. */
function strand(points: V3[], radius: number, seed: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const cuts = Math.max(8, points.length * 3);
  const g = new THREE.TubeGeometry(curve, cuts, radius, 4, false);
  g.deleteAttribute('uv');
  const position = g.getAttribute('position') as THREE.BufferAttribute;
  const count = position.count;
  const a = new Float32Array(count * 3);
  const centre = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const t = Math.floor(i / 5) / cuts;
    curve.getPointAt(t, centre);
    const wide = Math.pow(Math.max(0, 1 - t), 0.6) * (0.55 + 0.45 * Math.min(1, t * 6)) * (0.8 + 0.4 * hash(seed, Math.floor(t * 9), 5));
    position.setXYZ(i, centre.x + (position.getX(i) - centre.x) * wide, centre.y + (position.getY(i) - centre.y) * wide * 0.4, centre.z + (position.getZ(i) - centre.z) * wide);
    a[i * 3] = -1;
    a[i * 3 + 1] = hash(seed, 2, 9);
    a[i * 3 + 2] = 1;
  }
  g.setAttribute('aBone', new THREE.BufferAttribute(a, 3));
  g.computeVertexNormals();
  return g.toNonIndexed();
}

/** The bones as they were sculpted (assets-src/eye/skeleton/make_bones.py), in their own frame: x along the spine from the skull
 * (negative) to the hind feet, y up from the floor, z toward the camera of the edge shot. It lies on its side, come apart, its back
 * to the deep and its belly to that camera. */
function sculpted(): THREE.BufferGeometry {
  const bytes = (text: string): Uint8Array => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  const at = new Uint16Array(bytes(SCULPT.position).buffer);
  const marks = bytes(SCULPT.bone);
  const position = new Float32Array(SCULPT.corners * 3);
  const bone = new Float32Array(SCULPT.corners * 3);
  for (let i = 0; i < position.length; i++) {
    const low = SCULPT.low[i % 3] as number;
    position[i] = low + ((at[i] as number) / 65535) * ((SCULPT.high[i % 3] as number) - low);
    bone[i] = (marks[i] as number) / 255;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aBone', new THREE.BufferAttribute(bone, 3));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(bytes(SCULPT.index).buffer), 1));
  g.computeVertexNormals();
  return g.toNonIndexed();
}

function bones(next: () => number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [sculpted()];
  const range = (a: number, b: number): number => a + (b - a) * next();
  // The weed of the shelf has grown over it in tufts: each a root with a handful of short blades that lie where the water left
  // them, most of them on the side the water comes from, some across the limbs, the fallen ribs and the low bones.
  const over = (x: number, z: number): number => (x > -0.34 && x < 0.5 && z > -0.2 && z < 0.3 ? 0.03 : x < -0.6 && z > 0.1 ? 0.018 : 0.01);
  for (let lock = 0; lock < 46; lock++) {
    const rx = range(-1.15, 1.75);
    const rz = next() < 0.7 ? range(0.05, 0.75) : range(-0.4, 0.05);
    const lie = range(-0.9, 0.9) + (rz > 0.3 ? Math.PI : 0);
    const blades = 4 + Math.floor(range(0, 6));
    const reach = range(0.09, 0.3);
    for (let b = 0; b < blades; b++) {
      const turn = lie + range(-0.75, 0.75);
      const length = reach * range(0.45, 1.1);
      const curl = range(-1.6, 1.6);
      const wave = range(0, 6.28);
      const pts: V3[] = [];
      const CUTS = 7;
      for (let i = 0; i <= CUTS; i++) {
        const t = i / CUTS;
        const heading = turn + curl * t * t + 0.35 * Math.sin(t * 7 + wave);
        const prev = pts[i - 1];
        const x: number = prev ? prev[0] + (Math.sin(heading) * length) / CUTS : rx + range(-0.012, 0.012);
        const z: number = prev ? prev[2] + (Math.cos(heading) * length) / CUTS : rz + range(-0.012, 0.012);
        pts.push([x, SUNK + 0.003 + 0.005 * hash(lock, b * 16 + i, 3) + over(x, z) * Math.sin(Math.PI * Math.min(1, t * 1.3)), z]);
      }
      out.push(strand(pts, range(0.0035, 0.007), lock * 16 + b));
    }
  }
  return out;
}

export function create(ctx: Context): Piece {
  const rng = ctx.rng('skeleton');
  const geometry = mergeGeometries(bones(() => rng.next()), false);
  const material = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms }, vertexShader: VERTEX, fragmentShader: FRAGMENT, side: THREE.DoubleSide });
  material.userData.depthFragment = DEPTH;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const seat = bonesSeat();
  const along = new THREE.Vector3(seat.along[0], 0, seat.along[1]);
  const toCamera = new THREE.Vector3(seat.toCamera[0], 0, seat.toCamera[1]);
  const x = seat.x;
  const z = seat.z;
  mesh.matrixAutoUpdate = false;
  // Sunk into the crust: the lower half of every bone that lies on the floor is under it.
  mesh.matrix.makeBasis(along.clone().multiplyScalar(SCALE), new THREE.Vector3(0, SCALE, 0), toCamera.clone().multiplyScalar(SCALE)).setPosition(x, -SUNK * SCALE, z);
  mesh.matrixWorldNeedsUpdate = true;
  // What the bones take from the floor: the sheet lies a hair over it and multiplies what is drawn there.
  const sunDir = ctx.rig.sun.direction;
  const map = shadeMap(geometry, [sunDir.x * along.x + sunDir.z * along.z, sunDir.y, sunDir.x * toCamera.x + sunDir.z * toCamera.z], SUNK, (u, w) => {
    const qx = x + (along.x * u + toCamera.x * w) * SCALE;
    const qz = z + (along.z * u + toCamera.z * w) * SCALE;
    return Math.hypot(qx, qz) - lipAt(Math.atan2(qx, -qz));
  });
  const sheetGeometry = new THREE.PlaneGeometry(MAP.x1 - MAP.x0, MAP.z1 - MAP.z0).rotateX(-Math.PI / 2).translate((MAP.x0 + MAP.x1) / 2, 0, (MAP.z0 + MAP.z1) / 2);
  // After the turn the sheet's v runs against z: its map is read the same way.
  const uv = sheetGeometry.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const sheetMaterial = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, tShade: { value: map } },
    vertexShader: SHADE_VERTEX,
    fragmentShader: SHADE_FRAGMENT,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.SrcColorFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const sheet = new THREE.Mesh(sheetGeometry, sheetMaterial);
  sheet.frustumCulled = false;
  sheet.matrixAutoUpdate = false;
  sheet.matrix.makeBasis(along.clone().multiplyScalar(SCALE), new THREE.Vector3(0, SCALE, 0), toCamera.clone().multiplyScalar(SCALE)).setPosition(x, 0.004, z);
  sheet.matrixWorldNeedsUpdate = true;
  ctx.scene.add(sheet);
  ctx.scene.add(ctx.parts.built('skeleton', mesh, sheet));
  // The floor under it sees less of the sky: under the cage most, under the skull, the hips and the limbs a little.
  const shades: [number, number, number, number][] = [
    [0.05, 0.02, 0.42, 0.75],
    [-0.25, 0.0, 0.3, 0.6],
    [0.5, -0.08, 0.3, 0.6],
    [-0.95, 0.0, 0.24, 0.5],
    [-0.62, -0.08, 0.16, 0.4],
    [1.1, 0.0, 0.26, 0.4],
    [1.5, 0.0, 0.2, 0.35],
    [0.1, 0.5, 0.22, 0.35],
  ];
  const shade = ctx.rig.contactDiscs(shades.length);
  shades.forEach(([u, w, radius, strength], i) => {
    // The cage stands highest and throws its shade a little way along the ground from the sun; the rest is the dark under a thing that lies.
    const thrown = i === 0 ? 2.2 : 1;
    const off = radius * SCALE * (thrown - 1) * 0.8;
    ctx.rig.setDisc(shade, i, x + (along.x * u + toCamera.x * w) * SCALE - ctx.rig.sun.direction.x * off, z + (along.z * u + toCamera.z * w) * SCALE - ctx.rig.sun.direction.z * off, radius * SCALE, strength, thrown, ctx.rig.sun.shadowYaw);
  });
  return {
    dispose: () => {
      geometry.dispose();
      material.dispose();
      sheetGeometry.dispose();
      sheetMaterial.dispose();
      map.dispose();
    },
  };
}
