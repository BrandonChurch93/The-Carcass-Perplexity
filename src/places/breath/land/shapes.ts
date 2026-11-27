// The shapes of the Breath's rock: the wall of the main shaft, its hoops, the slabs, the cliff with its cave, the boulders.
// Every one carries `uv` in metres on its own face and `occ`, 1 in the open and less in a hollow.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RAD, ground, lerp, rimRadius, smooth } from '../land';

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

/** The height of the rubble where the east-south-east wall came down: a ramp from the broken rim to the middle of the shaft. */
export function talusHeight(x: number, z: number): number {
  const b = Math.atan2(x, -z);
  const r = Math.hypot(x, z);
  const rim = rimRadius(b);
  let d = Math.abs(b - 112 * RAD);
  if (d > Math.PI) d = 2 * Math.PI - d;
  const across = smooth((31 * RAD - d) / (15 * RAD));
  // The fan reaches a third of the way to the axis: beyond it the shaft is open and the mist fills it.
  const down = smooth((rim - r) / (rim - 9));
  // Its head lies two tiers under the brim: the wall and its ribs stand over it, and no block stands at the level of a lens on the rim.
  const top = ground(Math.sin(b) * rim * 1.002, -Math.cos(b) * rim * 1.002) - 11;
  // Part way down it a band of the old tiers still holds: a ledge four metres deep, where the largest of the blocks stopped.
  const stepped = down < 0.2 ? down : down < 0.38 ? 0.2 + (down - 0.2) * 0.15 : 0.227 + (down - 0.38) * 1.247;
  return lerp(top, -30, stepped ** 0.8) - 44 * (1 - across) - 40 * smooth((11 - r) / 5) + 1.1 * drift(x * 0.33, 1, z * 0.33) + 0.5 * drift(x * 0.9, 4, z * 0.9);
}

/** The rubble itself: a fan from the broken rim down into the shaft. */
export function heap(): THREE.BufferGeometry {
  return sheet(170, 86, (u, v) => {
    const b = lerp(66, 158, u) * RAD;
    const r = lerp(rimRadius(b) - 0.2, 5, v);
    const x = Math.sin(b) * r;
    const z = -Math.cos(b) * r;
    // Broken stone of every size, not a ramp: lumps a few metres across with ridges where two of them meet, and smaller ones on those.
    const lumps = 1.25 * (1 - 2 * Math.abs(drift(x * 0.21, 2.5, z * 0.21))) + 0.6 * (1 - 2 * Math.abs(drift(x * 0.55, 6.5, z * 0.55))) + 0.2 * drift(x * 1.6, 8.5, z * 1.6);
    return { at: [x, talusHeight(x, z) + lumps * smooth(v * 12), z], uv: [x, z], occ: lerp(0.95, 0.5, smooth(v * 1.3)) * lerp(0.6, 1, smooth(0.5 + 0.6 * lumps)) };
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
    // Not a turned ring: the mouth is lobed, wide one way and pinched another, and its collar stands higher on one side.
    const k = 1 + 0.12 * drift(a * 3, x, 1) + 0.2 * Math.sin(2 * a + x) + 0.1 * Math.sin(3 * a + 1.7 * z);
    // From the shelf up over the collar and down the throat.
    const out = v < 0.5 ? lerp(r + 5.5, r + 0.6, smooth(v * 2)) : r + 0.6 - 0.8 * (v - 0.5);
    const high = 1.9 * (0.55 + 0.45 * Math.sin(a + 0.7 * x) + 0.2 * Math.sin(4 * a + z));
    const y = v < 0.5 ? high * smooth(v * 2) ** 1.4 : lerp(high, -22, (v - 0.5) * 2);
    const px = x + Math.cos(a) * out * k;
    const pz = z + Math.sin(a) * out * k;
    return { at: [px, ground(px, pz) - 0.15 + y, pz], uv: [a * r, out + y], occ: v < 0.5 ? 1 : lerp(0.8, 0.05, smooth((v - 0.5) * 3)) };
  });
}

export { mergeGeometries };
