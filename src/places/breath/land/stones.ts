// Loose stone on the shelf where a lens comes near: chips of the crust a thumb to a forearm long, lying in drifts, each a small solid of
// its own, bedded a third of its height in the rock. The shelf's shader gives the crust its relief; what stands clear of the crust and
// throws a shadow down the shelf has to be a thing, and these are.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';
import { RAD, SEA, rimRadius, bearingOf } from '../land';

/** Where the lenses stand near the ground: x, z, the bearing they look along (degrees). */
const LENSES: [number, number, number][] = [
  [-8.6, 31.2, 13],
  [-32.5, 5, 12],
  [-50.7, -19.5, 15],
  [-28.5, 28.3, 12],
];

export interface Stones {
  geometry: THREE.BufferGeometry;
  /** The ones big enough to throw a shadow the contact map can hold: x, z, radius, height. */
  shades: [number, number, number, number][];
}

/** `heightAt` is the shelf as its mesh has it; `keepOff` are places nothing may lie (x, z, radius). */
export function scatter(rng: Rng, heightAt: (x: number, z: number) => number, keepOff: [number, number, number][]): Stones {
  // A chip a hand long has eighty faces; grit a thumb long has twenty, and is a few pixels from the nearest lens.
  const solid = (detail: number): [number, number, number][] => {
    const base = new THREE.IcosahedronGeometry(1, detail).getAttribute('position') as THREE.BufferAttribute;
    const out: [number, number, number][] = [];
    for (let i = 0; i < base.count; i++) out.push([base.getX(i), base.getY(i), base.getZ(i)]);
    return out;
  };
  const coarse = solid(0);
  const fine = solid(1);
  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const occ: number[] = [];
  const shades: [number, number, number, number][] = [];
  const planes: [number, number, number, number][] = [];
  const at = new Float32Array(fine.length * 3);

  const lay = (x: number, z: number, long: number): void => {
    if (Math.hypot(x, z) < rimRadius(bearingOf(x, z)) + 0.6) return;
    for (const [kx, kz, kr] of keepOff) if (Math.hypot(x - kx, z - kz) < kr) return;
    const dirs = long > 0.065 ? fine : coarse;
    const count = dirs.length;
    const y0 = heightAt(x, z);
    if (y0 < SEA + 0.12) return;
    // Not on an edge: a stone there hangs in the air on one side.
    if (Math.abs(heightAt(x + 0.3, z) - heightAt(x - 0.3, z)) + Math.abs(heightAt(x, z + 0.3) - heightAt(x, z - 0.3)) > 0.22) return;
    // A chip is a flat thing: as wide as it is long or a little less, a third to a half as thick. It is what a few breaks leave.
    const wide = long * rng.range(0.55, 0.95);
    const thick = long * rng.range(0.28, 0.55);
    planes.length = 0;
    for (let k = 0; k < 9; k++) {
      const a = rng.range(0, 2 * Math.PI);
      const e = rng.range(-1, 1);
      const s = Math.sqrt(1 - e * e);
      planes.push([s * Math.cos(a), e, s * Math.sin(a), rng.range(0.62, 1)]);
    }
    const yaw = rng.range(0, 2 * Math.PI);
    const tilt = rng.range(-0.3, 0.3);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const sink = thick * rng.range(0.1, 0.45);
    for (let i = 0; i < count; i++) {
      const d = dirs[i] as [number, number, number];
      let r = 1;
      for (const [nx, ny, nz, far] of planes) {
        const along = d[0] * nx + d[1] * ny + d[2] * nz;
        if (along > 0.05) r = Math.min(r, far / along);
      }
      const px = d[0] * r * long * 0.5;
      const py = d[1] * r * thick * 0.5;
      const pz = d[2] * r * wide * 0.5;
      // Tilted about its long side, then turned.
      const ty = py * ct - pz * st;
      const tz = py * st + pz * ct;
      at[i * 3] = x + px * cy + tz * sy;
      at[i * 3 + 1] = y0 + ty + thick * 0.5 - sink;
      at[i * 3 + 2] = z - px * sy + tz * cy;
    }
    for (let i = 0; i < count; i += 3) {
      const ax = at[i * 3] as number;
      const ay = at[i * 3 + 1] as number;
      const az = at[i * 3 + 2] as number;
      const ux = (at[i * 3 + 3] as number) - ax;
      const uy = (at[i * 3 + 4] as number) - ay;
      const uz = (at[i * 3 + 5] as number) - az;
      const vx = (at[i * 3 + 6] as number) - ax;
      const vy = (at[i * 3 + 7] as number) - ay;
      const vz = (at[i * 3 + 8] as number) - az;
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      for (let k = 0; k < 3; k++) {
        const j = (i + k) * 3;
        const yy = at[j + 1] as number;
        position.push(at[j] as number, yy, at[j + 2] as number);
        normal.push(nx, ny, nz);
        uv.push((at[j] as number) + 3.7 * long, (at[j + 2] as number) + yy);
        // Where it meets the rock it is in its own shade and holds the damp.
        occ.push(0.6 + 0.4 * Math.min(1, Math.max(0, (yy - y0) / (0.6 * thick))));
      }
    }
    if (long > 0.07) shades.push([x, z, 0.5 * wide, thick - sink]);
  };

  for (const [lx, lz, bearing] of LENSES) {
    const fx = Math.sin(bearing * RAD);
    const fz = -Math.cos(bearing * RAD);
    // Drifts: a few big chips with the small ones gathered round and down the shelf from them.
    // Only where the lens looks as it travels: a wedge that opens from some metres behind where it stands at its key.
    for (let c = 0; c < 64; c++) {
      const a = rng.range(-0.52, 0.52);
      const d = Math.sqrt(rng.range(9, 484));
      const cx = lx + fx * (d * Math.cos(a) - 6) - fz * d * Math.sin(a);
      const cz = lz + fz * (d * Math.cos(a) - 6) + fx * d * Math.sin(a);
      const spread = rng.range(0.35, 1.3);
      const big = Math.round(rng.range(2, 8));
      for (let i = 0; i < big; i++) {
        const b = rng.range(0, 2 * Math.PI);
        const e = spread * Math.sqrt(rng.next());
        lay(cx + Math.cos(b) * e, cz + Math.sin(b) * e, 0.07 + 0.3 * rng.next() ** 3.2);
      }
      // And one or two that lie alone.
      for (let i = 0; i < 2; i++) lay(cx + rng.range(-3, 3), cz + rng.range(-3, 3), rng.range(0.05, 0.2));
      for (let i = 0; i < 22; i++) {
        const b = rng.range(0, 2 * Math.PI);
        const e = 1.5 * spread * rng.next();
        lay(cx + Math.cos(b) * e, cz + Math.sin(b) * e, rng.range(0.018, 0.06));
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(position), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normal), 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  geometry.setAttribute('occ', new THREE.BufferAttribute(new Float32Array(occ), 1));
  geometry.computeBoundingSphere();
  return { geometry, shades };
}
