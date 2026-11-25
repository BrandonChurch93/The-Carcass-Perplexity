// The shapes of the Breath's rock: the wall of the main shaft, its hoops, the slabs, the cliff with its cave, the boulders.
// Every one carries `uv` in metres on its own face and `occ`, 1 in the open and less in a hollow.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Rng } from '../../../core/rng';
import { DEPTH, RAD, cliffHeight, cliffPoint, ground, lerp, rimRadius, smooth } from '../land';

export type Point = { at: [number, number, number]; uv: [number, number]; occ?: number };

/** A sheet of columns by rows, wrapped or not, with smooth normals. */
export function sheet(columns: number, rows: number, point: (u: number, v: number) => Point): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(1, 1, columns, rows);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const occ = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const q = point(p.getX(i) + 0.5, 0.5 - p.getY(i));
    p.setXYZ(i, q.at[0], q.at[1], q.at[2]);
    uv.setXY(i, q.uv[0], q.uv[1]);
    occ[i] = q.occ ?? 1;
  }
  g.setAttribute('occ', new THREE.BufferAttribute(occ, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Gives a geometry the `occ` every rock surface reads, 1 everywhere unless told. */
export function open(g: THREE.BufferGeometry, value = 1): THREE.BufferGeometry {
  const n = (g.getAttribute('position') as THREE.BufferAttribute).count;
  g.setAttribute('occ', new THREE.BufferAttribute(new Float32Array(n).fill(value), 1));
  return g;
}

// A smooth field of sines: about -1 to 1, the same wherever it is asked.
const drift = (x: number, y: number, z: number): number => 0.5 * Math.sin(x * 0.9 + 1.7 * Math.sin(z * 0.6 + y * 0.4)) + 0.3 * Math.sin(y * 1.3 + 1.1 * Math.sin(x * 0.7 + 2)) + 0.2 * Math.sin(z * 1.9 + x * 1.3 + y * 0.8);

/** The wall of the main shaft, from under the rim to its floor: it leans in a little as it goes down and is ragged where the hoops have torn away. */
export function shaftWall(): THREE.BufferGeometry {
  return sheet(220, 44, (u, v) => {
    const b = u * 2 * Math.PI;
    const r = rimRadius(b);
    const top = ground(Math.sin(b) * r * 1.002, -Math.cos(b) * r * 1.002) - 0.25;
    const y = lerp(top, -DEPTH, v);
    const torn = 1 + 1.6 * smooth((r - 31) / 5);
    const rr = r - 0.35 - 2.5 * v + torn * (0.55 * drift(b * 9, y * 0.22, 1) + 0.25 * drift(b * 31, y * 0.7, 4)) * smooth(v * 12);
    return { at: [Math.sin(b) * rr, y, -Math.cos(b) * rr], uv: [b * 30, y], occ: lerp(1, 0.55, smooth(v * 2.2)) };
  });
}

/** A hoop of cartilage along part of the wall: from one bearing to another (degrees), at a depth, standing `thick` metres out of the wall. */
export function hoop(y: number, radius: number, from: number, to: number, thick: number, seed: number): THREE.BufferGeometry {
  const length = Math.abs(to - from) * RAD * radius;
  const columns = Math.max(24, Math.round(length / 0.9));
  return sheet(columns, 14, (u, v) => {
    const b = lerp(from, to, u) * RAD;
    const s = u * length;
    // Broken ends: the hoop thins to a torn stub over its last three metres. Along its run it swells and necks as a rib does.
    const end = smooth(Math.min(s, length - s) / 3.2);
    const swell = (0.82 + 0.3 * drift(s * 0.16, seed, 2) + 0.12 * drift(s * 0.7, seed, 5)) * (0.25 + 0.75 * end);
    const a = v * 2 * Math.PI;
    // A flattened section, squarer than a tube: a rib seen end on.
    const cx = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.7;
    const cy = Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** 0.7;
    const wide = thick * 1.15 * swell * (1 + 0.1 * drift(s * 1.1, a * 2, seed));
    const tall = thick * 1.45 * swell;
    const sag = 0.6 * Math.sin(s * 0.11 + seed) + 0.5 * drift(s * 0.05, seed, 9);
    const rr = radius + 0.9 - cx * wide;
    return { at: [Math.sin(b) * rr, y + sag + cy * tall, -Math.cos(b) * rr], uv: [s, a * thick], occ: lerp(0.6, 1, smooth(0.5 - 0.5 * cy + 0.3)) * (0.7 + 0.3 * smooth((y + 45) / 40)) };
  });
}

/** A fallen slab: a block with worn edges, `w` by `h` by `d` metres, turned and set down. */
export function slab(rng: Rng, w: number, h: number, d: number, at: [number, number, number], turn: [number, number, number]): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d, Math.max(3, Math.round(w / 1.2)), Math.max(2, Math.round(h / 0.9)), Math.max(3, Math.round(d / 1.2)));
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const seed = rng.range(0, 50);
  const skew = rng.range(-0.25, 0.25);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    const ax = Math.abs(n.getX(i));
    const ay = Math.abs(n.getY(i));
    if (ay > 0.5) uv.setXY(i, x + seed, z);
    else if (ax > 0.5) uv.setXY(i, z + seed, y);
    else uv.setXY(i, x + seed, y);
    // Worn corners, a face that is not quite flat, a plan that is not quite square.
    const ex = (2 * x) / w;
    const ey = (2 * y) / h;
    const ez = (2 * z) / d;
    const corner = Math.max(0, Math.abs(ex) + Math.abs(ez) - 1.45) * 0.5 + Math.max(0, Math.abs(ex) + Math.abs(ey) - 1.6) * 0.25 + Math.max(0, Math.abs(ez) + Math.abs(ey) - 1.6) * 0.25;
    const k = 1 - 0.55 * corner;
    x = x * k + skew * z * 0.3 + 0.22 * drift(y * 0.8 + seed, z * 0.5, x * 0.4);
    z = z * k + 0.22 * drift(x * 0.5, y * 0.8, z * 0.4 + seed);
    y = y * (1 - 0.3 * corner) + 0.16 * drift(x * 0.45, seed, z * 0.45) + 0.12 * ex * skew * h;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(1, 1, 1)));
  return open(g);
}

/** A heap of rubble under the slabs: a cone with a broken face. */
export function heap(radius: number, height: number, at: [number, number, number]): THREE.BufferGeometry {
  return sheet(48, 16, (u, v) => {
    const a = u * 2 * Math.PI;
    const r = radius * (0.04 + 0.96 * v) * (1 + 0.16 * drift(a * 3, v * 5, 3) + 0.07 * drift(a * 11, v * 15, 7));
    const y = height * (0.5 - v) + 1.4 * drift(a * 5, v * 9, 1);
    return { at: [at[0] + Math.cos(a) * r, at[1] + y, at[2] - Math.sin(a) * r], uv: [a * radius * 0.6, y], occ: 0.6 };
  });
}

/** A boulder that lies on the shelf: half sunk, wider than tall. */
export function boulder(at: [number, number, number], size: [number, number, number], turn: number, seed: number): THREE.BufferGeometry {
  return sheet(40, 20, (u, v) => {
    const a = u * 2 * Math.PI;
    const e = (v - 0.5) * Math.PI;
    const dx = Math.cos(e) * Math.cos(a);
    const dy = -Math.sin(e);
    const dz = Math.cos(e) * Math.sin(a);
    const k = 1 + 0.2 * drift(dx * 2.3 + seed, dy * 2.3, dz * 2.3) + 0.08 * drift(dx * 6 + seed, dy * 6, dz * 6);
    // Flat faces, as a broken block has: the unit ball squared off a little.
    const q = 1 / Math.max(Math.abs(dx), Math.abs(dy) * 0.9, Math.abs(dz)) ** 0.45;
    const x = dx * size[0] * k * q;
    const y = dy * size[1] * k * q;
    const z = dz * size[2] * k * q;
    const c = Math.cos(turn);
    const s = Math.sin(turn);
    return { at: [at[0] + c * x + s * z, at[1] + y, at[2] - s * x + c * z], uv: [a * size[0], e * size[1] * 2 + seed], occ: lerp(0.55, 1, smooth(dy + 0.75)) };
  });
}

/** The mouth of a smaller shaft: a collar of raised rock round a dark throat. */
export function collar(x: number, z: number, r: number): THREE.BufferGeometry {
  return sheet(40, 10, (u, v) => {
    const a = u * 2 * Math.PI;
    const k = 1 + 0.12 * drift(a * 3, x, 1);
    // From the shelf up over the collar and down the throat.
    const out = v < 0.5 ? lerp(r + 5.5, r + 0.6, smooth(v * 2)) : r + 0.6 - 0.8 * (v - 0.5);
    const y = v < 0.5 ? 1.9 * smooth(v * 2) ** 1.4 : lerp(1.9, -22, (v - 0.5) * 2);
    const px = x + Math.cos(a) * out * k;
    const pz = z + Math.sin(a) * out * k;
    return { at: [px, ground(px, pz) - 0.15 + y, pz], uv: [a * r, out + y], occ: v < 0.5 ? 1 : lerp(0.8, 0.05, smooth((v - 0.5) * 3)) };
  });
}

/** The cave: where it is on the cliff's face (metres along it, height) and its half size. */
export const CAVE_MOUTH = { s: 0, y: 215, wide: 430, tall: 105, deep: 300 };

/** The sea cliff with its cave: 10 km of it, the scree at its foot, the face, the land behind. */
export function cliff(): THREE.BufferGeometry {
  return sheet(340, 100, (u, v) => {
    const s = lerp(-4200, 6200, u);
    // Most of the rows are on the face, where the height is.
    const p = v < 0.22 ? lerp(-700, -150, v / 0.22) : v < 0.82 ? lerp(-150, 45, (v - 0.22) / 0.6) : lerp(45, 1300, ((v - 0.82) / 0.18) ** 1.6);
    const taper = smooth((s + 4200) / 700) * smooth((6200 - s) / 700);
    let y = cliffHeight(s, p) * taper + 1.5 - 5 * (1 - smooth((p + 700) / 110));
    // Buttresses and gullies down the face, ledges across it.
    const face = smooth((p + 150) / 60) * (1 - smooth((p - 45) / 200));
    let back = face * (38 * drift(s * 0.0042, y * 0.004, 1) + 16 * drift(s * 0.013, y * 0.012, 5)) + 22 * face * Math.sin(y * 0.045 + 2 * drift(s * 0.002, 0, 3));
    y += (1 - face) * 9 * drift(s * 0.006, p * 0.006, 8);
    // The cave: a wide low arch with a level floor, cut far back into the face.
    const dx = (s - CAVE_MOUTH.s) / CAVE_MOUTH.wide;
    const dy = (y - CAVE_MOUTH.y) / (y > CAVE_MOUTH.y ? CAVE_MOUTH.tall : CAVE_MOUTH.tall * 0.55);
    const inside = 1 - dx * dx - dy * dy;
    const cut = smooth(inside * 2.6) * face;
    back += CAVE_MOUTH.deep * cut;
    const [x, z] = cliffPoint(s, p + back);
    return { at: [x, y, z], uv: [s, y], occ: (1 - 0.94 * smooth(inside * 2.2 + 0.1)) * lerp(0.8, 1, smooth(y / 300)) };
  });
}

export { mergeGeometries };
