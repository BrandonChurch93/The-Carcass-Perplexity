// The skeleton on the lip: one of the herd, long dead, lying on its side where the floor stops. Every bone is a body of its own, built
// here: ribs bent from the spine, some fallen, vertebrae, a small skull, the long bones of the limbs trailing along the lip. They lie
// half in the crust, stained and cracked, with the weed of the shelf drawn over them strand by strand.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { KEYS } from '../cameras';
import { DEG } from '../layout';
import { lipAt } from '../land/height';
import { vnoise } from '../shared/noise';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { WARM_GLSL } from '../land/lod';

export const PARTS: readonly string[] = ['skeleton'];

/** Where it lies: on the lip, ahead and to the right of the camera of the edge shot, and the bearing its spine lies along. */
export const BONES = { ahead: 6.4, right: 16, along: 112 };

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
    vec3 weed = mix(vec3(0.36, 0.15, 0.035), vec3(0.62, 0.3, 0.07), vnoise(q.xz * 9.0 + vBone.y * 31.0)) * (0.75 + 0.5 * vnoise(q.xz * 160.0 + q.y * 90.0));
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
  n = normalize(abs(det) * n - 0.0045 * lean);

  // Old bone: ivory where the air has had it, bleached on what looks up, yellow and brown where it has lain.
  float tone = vBone.x;
  vec3 bone = mix(vec3(0.7, 0.63, 0.5), vec3(0.96, 0.93, 0.84), tone);
  bone = mix(bone, vec3(0.86, 0.84, 0.76), 0.5 * smoothstep(0.2, 0.9, n.y));
  float stain = 0.6 * vnoise(q.xz * 11.0 + q.y * 7.0 + tone * 40.0) + 0.4 * vnoise(q.xy * 37.0 + q.z * 29.0);
  bone = mix(bone, bone * vec3(0.62, 0.45, 0.27), 0.7 * smoothstep(0.42, 0.64, stain));
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
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  c += glint * rigGlint(vWorld, n, v, 0.3);
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

// The bones are built at the size of a small animal and laid half as large again: it was a grown one.
const SCALE = 1.95;
/** How deep the bones are sunk in the floor, in their own measure. */
const SUNK = 0.025;

/** A number from 0 to 1 that belongs to three others: the bones are the same bones in every frame. */
function hash(a: number, b: number, c: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth lumps over a body, so that nothing is a turned shape: every corner is moved along its normal by `much` metres at most. */
function lumpy(g: THREE.BufferGeometry, much: number, grainSize: number, seed: number): void {
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / grainSize;
    const y = p.getY(i) / grainSize;
    const z = p.getZ(i) / grainSize;
    const k = Math.sin(x * 1.7 + seed) * Math.sin(y * 2.3 + seed * 1.3) * Math.sin(z * 1.9 + seed * 0.7) + 0.5 * Math.sin(x * 4.1 + y * 3.3 + z * 3.7 + seed * 2.1);
    p.setXYZ(i, p.getX(i) + n.getX(i) * k * much, p.getY(i) + n.getY(i) * k * much, p.getZ(i) + n.getZ(i) * k * much);
  }
  g.computeVertexNormals();
}

/** Marks a finished body: its tone, how near its ends each point is (from `ends`), and how much sky it sees. */
function mark(g: THREE.BufferGeometry, tone: number, ends: (i: number) => number, open: number | ((i: number) => number)): THREE.BufferGeometry {
  const count = (g.getAttribute('position') as THREE.BufferAttribute).count;
  const a = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    a[i * 3] = tone;
    a[i * 3 + 1] = ends(i);
    a[i * 3 + 2] = typeof open === 'number' ? open : open(i);
  }
  g.setAttribute('aBone', new THREE.BufferAttribute(a, 3));
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  return g.index ? g.toNonIndexed() : g;
}

/** A long bone from a to b: a shaft with a knuckle at each end, a little bent. */
function longBone(a: V3, b: V3, radius: number, seed: number): THREE.BufferGeometry {
  const from = new THREE.Vector3(...a);
  const to = new THREE.Vector3(...b);
  const length = from.distanceTo(to);
  const profile: THREE.Vector2[] = [];
  const CUTS = 18;
  for (let i = 0; i <= CUTS; i++) {
    const t = i / CUTS;
    const knuckle = 1.25 * Math.exp(-((t / 0.085) ** 2)) + 1.0 * Math.exp(-(((1 - t) / 0.075) ** 2));
    const cap = Math.sqrt(Math.max(0, 1 - (1 - Math.min(1, Math.min(t, 1 - t) / 0.035)) ** 2));
    profile.push(new THREE.Vector2(Math.max(1e-4, radius * (0.56 + 1.05 * knuckle) * cap), t * length));
  }
  const g = new THREE.LatheGeometry(profile, 9);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  // A little bowed, and not round: flatter one way than the other.
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / length;
    p.setXYZ(i, p.getX(i) * 1.15 + 0.06 * length * Math.sin(Math.PI * t) * (hash(seed, 1, 2) - 0.5), p.getY(i), p.getZ(i) * 0.85);
  }
  const merged = mergeVertices(g.deleteAttribute('uv').deleteAttribute('normal'), 1e-5);
  merged.computeVertexNormals();
  lumpy(merged, radius * 0.22, radius * 1.3, seed);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(seed, 3, 4) * 6.28);
  const mp = merged.getAttribute('position') as THREE.BufferAttribute;
  const ts: number[] = [];
  for (let i = 0; i < mp.count; i++) ts.push(mp.getY(i) / length);
  merged.applyQuaternion(q.multiply(spin)).translate(from.x, from.y, from.z);
  return mark(merged, 0.35 + 0.6 * hash(seed, 5, 6), (i) => Math.max(0, 1 - Math.min(ts[i] as number, 1 - (ts[i] as number)) / 0.16), 1);
}

/** A rib or any thin bent bone along the points given. */
function bent(points: V3[], radius: number, seed: number, open: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const CUTS = 22;
  const g = new THREE.TubeGeometry(curve, CUTS, radius, 6, false);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const centre = new THREE.Vector3();
  // It thins to its tip, and is thick where it joins the spine.
  for (let i = 0; i <= CUTS; i++) {
    const t = i / CUTS;
    curve.getPointAt(t, centre);
    const wide = (1.45 - 0.75 * t) * (t > 0.94 ? 0.6 : 1);
    for (let j = 0; j <= 6; j++) {
      const k = i * 7 + j;
      p.setXYZ(k, centre.x + (p.getX(k) - centre.x) * wide, centre.y + (p.getY(k) - centre.y) * wide, centre.z + (p.getZ(k) - centre.z) * wide);
    }
  }
  const merged = mergeVertices(g.deleteAttribute('uv').deleteAttribute('normal'), 1e-5);
  merged.computeVertexNormals();
  lumpy(merged, radius * 0.11, radius * 2.2, seed);
  const mp = merged.getAttribute('position') as THREE.BufferAttribute;
  const first = new THREE.Vector3(...(points[0] as V3));
  const last = new THREE.Vector3(...(points[points.length - 1] as V3));
  const at = new THREE.Vector3();
  return mark(
    merged,
    0.3 + 0.65 * hash(seed, 7, 8),
    (i) => {
      at.fromBufferAttribute(mp, i);
      return Math.max(0, 1 - Math.min(at.distanceTo(first), at.distanceTo(last)) / (radius * 5));
    },
    open,
  );
}

/** A lump of bone: a vertebra, a knuckle, a plate. `size` is its half extent on each of its own axes. */
function lump(at: V3, size: V3, turn: V3, seed: number, detail = 2, open = 1): THREE.BufferGeometry {
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, detail).deleteAttribute('uv').deleteAttribute('normal'), 1e-5);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  // Squared off a little: a vertebra is a block with wings, not a ball.
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const m = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    const k = 0.72 + 0.28 / m;
    p.setXYZ(i, x * k * size[0], y * k * size[1], z * k * size[2]);
  }
  g.computeVertexNormals();
  lumpy(g, Math.min(...size) * 0.3, Math.max(...size) * 0.45, seed);
  g.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn))).translate(...at);
  return mark(g, 0.3 + 0.6 * hash(seed, 9, 1), () => 0.7, open);
}

/** The skull: small, long in the snout, lying on its cheek. It has no hollow in it that looks out. */
function skull(at: V3, heading: number, seed: number): THREE.BufferGeometry[] {
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 16).deleteAttribute('uv').deleteAttribute('normal'), 1e-5);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const shaded: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    // Along it: the round of the braincase behind, the long narrowing of the face before it.
    const t = (x + 1) / 2;
    const girth = 0.34 + 0.66 * Math.exp(-(((t - 0.24) / 0.3) ** 2)) - 0.1 * Math.exp(-(((t - 0.52) / 0.1) ** 2));
    // The crown is ridged, the cheek below it flat.
    const ridge = 1 + 0.12 * Math.max(0, y) * Math.exp(-(((t - 0.3) / 0.25) ** 2));
    // Blunt at both ends, not drawn to a point, and wide at the cheeks.
    const blunt = Math.max(1 - x * x, 0.03) ** -0.3;
    const cheek = 1 + 0.2 * Math.exp(-(((t - 0.44) / 0.07) ** 2)) * (1 - 0.6 * Math.abs(y));
    // Hollows of shade on the side that lies up: the long one behind the cheek, where the jaw's muscle sat, the notch of the nose, and
    // the line the jaw closed along. None is round and none is deep, so that none looks out.
    const side = Math.max(0, -z);
    const fossa = side * Math.exp(-(((t - 0.36) / 0.13) ** 2) - ((y - 0.3) / 0.28) ** 2);
    const nose = side * Math.exp(-(((t - 0.86) / 0.07) ** 2) - ((y - 0.25) / 0.3) ** 2);
    const jaw = side * Math.exp(-(((y + 0.42 - 0.3 * (t - 0.6)) / 0.07) ** 2)) * Math.min(1, Math.max(0, (t - 0.3) / 0.12));
    const hollow = Math.min(1, 0.55 * fossa + 0.4 * nose + 0.22 * jaw);
    shaded.push(1 - Math.min(0.72, 1.2 * fossa + 0.9 * nose + 0.75 * jaw));
    p.setXYZ(i, x * 0.25, y * 0.105 * girth * ridge * blunt, z * 0.085 * girth * blunt * cheek * (1 - hollow));
  }
  g.computeVertexNormals();
  lumpy(g, 0.004, 0.035, seed);
  // On its cheek, the snout tipped into the crust.
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.35, heading, -0.12, 'YXZ'));
  g.applyQuaternion(q).translate(...at);
  const mp = g.getAttribute('position') as THREE.BufferAttribute;
  const head = mark(g, 0.62, (i) => 0.25 + 0.5 * hash(mp.getX(i) * 40, mp.getZ(i) * 40, seed), (i) => shaded[i] as number);
  // The jaw has come away and lies beside it.
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  const place = (u: number, w: number, y: number): V3 => [at[0] + c * u + s * w, y, at[2] - s * u + c * w];
  const jaw = bent([place(-0.13, 0.13, 0.03), place(-0.06, 0.145, 0.022), place(0.03, 0.15, 0.016), place(0.11, 0.17, 0.012), place(0.14, 0.2, 0.03)], 0.0085, seed + 3, 0.9);
  return [head, jaw];
}

/** One strand of weed along the points given. */
function strand(points: V3[], radius: number, seed: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, Math.max(8, points.length * 4), radius, 4, false);
  g.deleteAttribute('uv');
  const count = (g.getAttribute('position') as THREE.BufferAttribute).count;
  const a = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    a[i * 3] = -1;
    a[i * 3 + 1] = hash(seed, 2, 9);
    a[i * 3 + 2] = 1;
  }
  g.setAttribute('aBone', new THREE.BufferAttribute(a, 3));
  return g.toNonIndexed();
}

/** The bones, in their own frame: x along the spine from the skull (negative) to the hind feet, y up from the floor, z toward the camera
 * of the edge shot. It lies on its side, its back to the deep and its belly to that camera. */
function bones(next: () => number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const range = (a: number, b: number): number => a + (b - a) * next();
  // The spine from the root of the neck to the hips sags where the ribs have let go.
  const spine = (x: number): V3 => [x, 0.055 + 0.035 * Math.sin((x + 0.35) * 3.2), -0.17 + 0.04 * Math.sin(x * 4.1 + 0.5)];
  // How high the cage stands over the floor at x and z: the weed is drawn over this.
  const RIBS = 12;
  const ribX = (i: number): number => -0.31 + i * 0.066;
  const full = (i: number): number => 0.62 + 0.38 * Math.sin((Math.PI * (i + 1.5)) / (RIBS + 2));
  const stands: number[] = [];
  for (let i = 0; i < RIBS; i++) {
    // The cage is whole: every rib stands, each to its own height.
    const r = next();
    stands.push(0.86 + 0.14 * r);
  }
  for (let i = 0; i < RIBS; i++) {
    const x = ribX(i);
    const s = full(i);
    // Each rib has its own length, height and twist: no two of a carcass that has lain a season keep step.
    const own = (k: number): number => {
      const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    const up = (stands[i] as number) * (0.72 + 0.33 * own(1));
    const [, sy, sz] = spine(x);
    // The vertebra it hangs from, and the blade that stands off its back.
    out.push(lump([x, sy, sz], [0.026, 0.027, 0.03], [range(-0.3, 0.3), range(-0.2, 0.2), range(-0.3, 0.3)], i + 1));
    out.push(bent([[x, sy + 0.01, sz - 0.02], [x + 0.012, sy + 0.03, sz - 0.07], [x + 0.03, sy + 0.035 * range(0.4, 1), sz - 0.085 - 0.05 * s]], 0.0075, i + 31, 1));
    if (up < 0) continue;
    // They have slumped together toward the hips, each a little out of step with the next.
    const lean = 0.05 + 0.03 * Math.sin(i * 0.9 + 1) + range(-0.01, 0.01) + 0.04 * (own(2) - 0.42);
    const w = 0.8 + 0.3 * own(3);
    const tw = 0.05 * (own(4) - 0.5);
    const short = next() < 0.0 ? range(0.55, 0.8) : 1;
    const pts: V3[] = [
      [x, sy + 0.012, sz + 0.015],
      [x + lean * 0.3, sy + 0.14 * s * up + 0.02, sz + 0.035],
      [x + lean * 0.7 + tw, 0.05 + 0.31 * s * up, sz + 0.15 * s * w],
      [x + lean - tw, 0.045 + 0.29 * s * up, sz + 0.29 * s * w],
      [x + lean * 1.25 - 2 * tw, 0.035 + 0.15 * s * up, sz + 0.39 * s * w],
      [x + lean * 1.4 - tw, 0.02 + 0.04 * s * up, sz + 0.44 * s * w],
    ];
    const snapped = own(5) < 0.1;
    const kept = short < 1 ? pts.slice(0, 4 + (short > 0.68 ? 1 : 0)) : snapped ? pts.slice(0, 5) : pts;
    out.push(bent(kept, 0.0085 + 0.0015 * s, i + 51, 0.85));
    // The rib of the side it lies on shows only where it comes out from under.
    if (next() < 0.35) out.push(bent([[x + 0.01, 0.04, sz + 0.1], [x + 0.04, 0.048, sz + 0.26 * s], [x + 0.1, 0.044, sz + 0.4 * s], [x + 0.18, 0.03, sz + 0.47 * s]], 0.009, i + 71, 0.9));
  }
  // The loins and the hips.
  for (let i = 0; i < 6; i++) {
    const x = ribX(RIBS) + i * 0.058;
    const [, sy, sz] = spine(x);
    out.push(lump([x, sy, sz + range(-0.012, 0.012)], [0.03, 0.028, 0.034], [range(-0.3, 0.3), range(-0.3, 0.3), range(-0.3, 0.3)], i + 91));
    out.push(bent([[x, sy, sz + 0.02], [x + 0.01, sy - 0.005, sz + 0.07], [x + 0.025, 0.02, sz + 0.11]], 0.008, i + 101, 0.9));
  }
  const hip = ribX(RIBS) + 6 * 0.058;
  out.push(lump([hip + 0.06, 0.07, -0.13], [0.12, 0.035, 0.07], [0.5, 0.3, 0.35], 111, 3));
  out.push(lump([hip + 0.1, 0.03, -0.02], [0.11, 0.02, 0.06], [0.1, -0.4, -0.1], 112, 3));
  out.push(lump([hip + 0.2, 0.045, -0.16], [0.05, 0.02, 0.03], [0.2, 0.2, 0.2], 113, 2));
  // The tail: a few small bones trailing off.
  for (let i = 0; i < 6; i++) out.push(lump([hip + 0.22 + i * 0.045 + range(-0.008, 0.008), 0.018, -0.2 - i * 0.022 + range(-0.01, 0.01)], [0.017 - i * 0.0015, 0.011, 0.012], [0, range(-0.5, 0.5), 0], i + 121, 1));
  // The neck lies out along the floor, its bones come a little apart, toward the skull.
  let nx = -0.36;
  let nz = -0.165;
  let heading = 0.38;
  for (let i = 0; i < 7; i++) {
    heading += range(-0.05, 0.2);
    const len = 0.082 - i * 0.003;
    const mx = nx - Math.cos(heading) * len * 0.5;
    const mz = nz + Math.sin(heading) * len * 0.5;
    out.push(lump([mx + range(-0.006, 0.006), 0.03 + range(-0.006, 0.008), mz + range(-0.008, 0.008)], [len * 0.47, 0.022, 0.026], [range(-0.4, 0.4), heading + range(-0.15, 0.15), range(-0.15, 0.15)], i + 131, 2));
    nx -= Math.cos(heading) * (len + 0.012);
    nz += Math.sin(heading) * (len + 0.012);
  }
  out.push(...skull([nx - 0.14, 0.055, nz + 0.06], -heading - 0.5, 141));
  // The shoulder blade has slid off the cage and lies on it.
  out.push(lump([-0.2, 0.2, -0.03], [0.1, 0.008, 0.05], [0.5, 0.5, -0.5], 151, 3, 0.9));
  // The limbs. The hind ones trail along the lip; one fore limb lies out before the cage and the other is under it.
  const limb = (joints: V3[], radius: number, seed: number): void => {
    for (let i = 0; i + 1 < joints.length; i++) {
      const a = joints[i] as V3;
      const b = joints[i + 1] as V3;
      // The joints have come apart: each bone lies a little off the last.
      const gap: V3 = [range(-0.006, 0.006), 0, range(-0.008, 0.008)];
      const t = 0.025;
      out.push(
        longBone(
          [a[0] + (b[0] - a[0]) * t + gap[0], a[1], a[2] + (b[2] - a[2]) * t + gap[2]],
          [b[0] - (b[0] - a[0]) * t + gap[0], b[1], b[2] - (b[2] - a[2]) * t + gap[2]],
          radius * (1 - 0.14 * i),
          seed + i,
        ),
      );
    }
    const end = joints[joints.length - 1] as V3;
    for (let i = 0; i < 3; i++) out.push(lump([end[0] + 0.03 + i * 0.035 + range(-0.01, 0.01), 0.014, end[2] + range(-0.03, 0.03)], [0.017, 0.01, 0.011], [0, range(-0.8, 0.8), 0], seed + 10 + i, 1));
  };
  limb([[hip + 0.08, 0.06, -0.04], [hip + 0.36, 0.035, 0.13], [hip + 0.7, 0.028, 0.02], [hip + 0.99, 0.022, 0.1], [hip + 1.1, 0.018, 0.13]], 0.03, 161);
  limb([[hip + 0.1, 0.035, -0.17], [hip + 0.33, 0.03, -0.3], [hip + 0.66, 0.024, -0.22], [hip + 0.93, 0.02, -0.31], [hip + 1.02, 0.016, -0.3]], 0.028, 171);
  limb([[-0.19, 0.035, 0.26], [-0.07, 0.03, 0.47], [0.24, 0.024, 0.55], [0.5, 0.02, 0.5], [0.58, 0.016, 0.52]], 0.026, 181);
  limb([[-0.3, 0.03, 0.2], [-0.5, 0.026, 0.33], [-0.52, 0.022, 0.62]], 0.024, 191);

  // The weed of the shelf: strands come up out of the water before it and lie over the limbs and the low bones.
  const cage = (x: number, z: number): number => {
    const i = Math.max(0, Math.min(RIBS - 1, Math.round((x + 0.31) / 0.066)));
    if (x < -0.34 || x > ribX(RIBS - 1) + 0.03) return 0;
    const up = Math.max(0, stands[i] as number);
    const w = (z + 0.17) / (0.44 * full(i));
    return w < 0 || w > 1 ? 0 : 0.27 * full(i) * up * Math.sin(Math.PI * Math.min(1, w * 1.15)) ** 0.7;
  };
  let lock = 0;
  for (let k = 0; k < 18; k++) {
    // They lie in locks of a few strands each.
    if (k % 4 === 0) lock = range(-1.0, 1.5);
    const x0 = lock + range(-0.06, 0.06);
    const drift = range(-0.35, 0.35);
    const z0 = range(0.3, 0.62);
    const z1 = next() < 0.5 ? range(-0.02, 0.2) : range(-0.3, -0.12);
    const wave = range(0, 6.28);
    const pts: V3[] = [];
    const CUTS = 14;
    for (let i = 0; i <= CUTS; i++) {
      const t = i / CUTS;
      const z = z0 + (z1 - z0) * t;
      const x = x0 + drift * t * t + 0.07 * Math.sin(t * 5 + wave);
      // It lies on the floor and over the low bones, and under the cage on the ribs of the side that is down: none hangs on the cage.
      pts.push([x, 0.008 + 0.006 * hash(k, i, 3) + (cage(x, z) > 0.02 ? 0.03 : 0), z]);
    }
    out.push(strand(pts, range(0.006, 0.012), k));
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
  // Ahead and to the right of the camera of the edge shot, then out to the rim of the lip from there.
  const from = KEYS.edge.position;
  const px = from[0] + Math.sin(BONES.right * DEG) * BONES.ahead;
  const pz = from[2] - Math.cos(BONES.right * DEG) * BONES.ahead;
  const a = Math.atan2(px, -pz);
  const lipPoint = (angle: number): [number, number] => [Math.sin(angle) * lipAt(angle), -Math.cos(angle) * lipAt(angle)];
  // It lies the way the lip runs there, its skull toward the left of the edge shot and its belly toward that camera: `along` is only
  // the side of the lip its hind end points to.
  const span = 2.6 / lipAt(a);
  const [ax, az] = lipPoint(a - span);
  const [bx, bz] = lipPoint(a + span);
  const along = new THREE.Vector3(bx - ax, 0, bz - az).normalize();
  if (along.x * Math.sin(BONES.along * DEG) - along.z * Math.cos(BONES.along * DEG) < 0) along.negate();
  const toCamera = new THREE.Vector3(-along.z, 0, along.x);
  if (toCamera.x * Math.sin(a) - toCamera.z * Math.cos(a) < 0) toCamera.negate();
  // As near the lip as its ragged line lets every bone lie on the floor: the hind limb that trails farthest back is 0.35 from the spine.
  const [lx, lz] = lipPoint(a);
  let back = 0;
  for (let pass = 0; pass < 3; pass++) {
    let short = -Infinity;
    for (let u = -1.35; u <= 1.85; u += 0.2) {
      const qx = lx + (along.x * (u - 0.35) + toCamera.x * (back - 0.36)) * SCALE;
      const qz = lz + (along.z * (u - 0.35) + toCamera.z * (back - 0.36)) * SCALE;
      short = Math.max(short, lipAt(Math.atan2(qx, -qz)) + 0.1 - Math.hypot(qx, qz));
    }
    back += short / SCALE;
  }
  const x = lx + (toCamera.x * back - along.x * 0.35) * SCALE;
  const z = lz + (toCamera.z * back - along.z * 0.35) * SCALE;
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
