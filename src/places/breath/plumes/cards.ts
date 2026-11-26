// How a gill-plume is built: a fan of sheets that all leave the holdfast, each a whole spray of the plume picture
// (mat/plume.jpg: arching stems hung with fine drooping threads, drops at their tips). Every sheet stands on edge, turned its own way
// round the root and leaning out of plumb, and is bowed: seen from anywhere the sprays cross and hide each other as a bush does.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';

export type V3 = [number, number, number];

export interface Bush {
  x: number;
  y: number;
  z: number;
  tall: number;
  /** The way it leans, radians: toward the shaft. */
  lean: number;
  /** 1 for the ones the camera comes close to, less for the far ones: how many sprays are grown. */
  detail: number;
}

/** Where the root of the spray is in the picture (across, up), and its height over its width. */
const ROOT_S = 0.425;
const ROOT_T = 0.055;
const ASPECT = 1024 / 1536;
/** Where threads end in a hanging drop, in the picture (across, down). */
const TIPS: readonly [number, number][] = [
  [0.033, 0.55],
  [0.017, 0.69],
  [0.075, 0.805],
  [0.717, 0.808],
  [0.777, 0.9],
  [0.9, 0.675],
  [0.922, 0.708],
  [0.972, 0.567],
  [0.86, 0.52],
  [0.3, 0.5],
];
const NX = 12;
const NY = 8;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface End {
  at: V3;
  stemAt: number;
  phase: number;
  tall: number;
  root: V3;
}

export class Cards {
  private readonly position: number[] = [];
  private readonly vane: number[] = [];
  private readonly sway: number[] = [];
  private readonly tint: number[] = [];
  private readonly root: number[] = [];
  private readonly index: number[] = [];
  private count = 0;
  /** Where the threads end, for the drops. */
  readonly ends: End[] = [];

  grow(bush: Bush, rng: Rng, floor: (x: number, z: number) => number): void {
    const { tall, lean } = bush;
    const root: V3 = [bush.x, bush.y, bush.z];
    const sprays = Math.round(5 + 6 * bush.detail);
    // The heart of the bush: a line from the root up and over toward the lean. What is near it is in the shade of the rest.
    const heart: V3 = [Math.sin(lean) * 0.3 * tall, 0.45 * tall, -Math.cos(lean) * 0.3 * tall];
    const heartLength = Math.hypot(heart[0], heart[1], heart[2]);
    for (let c = 0; c < sprays; c++) {
      const k = ((c + rng.range(0.2, 0.8)) / sprays - 0.5) * 2;
      // Combed toward the shaft by its breath: the widest sprays lie along the lean, the short ones stand out to the sides.
      const heading = lean + 1.25 * k + rng.range(-0.12, 0.12);
      const wide = tall * 1.3 * rng.range(0.6, 1.05) * (1 - 0.3 * Math.abs(k));
      const tilt = 0.6 * k + rng.range(-0.3, 0.3);
      const bend = rng.range(-0.28, 0.28);
      const out = 0.05 * tall * rng.next();
      const about = rng.range(0, 6.283);
      const bx = bush.x + Math.sin(about) * out;
      const bz = bush.z + Math.cos(about) * out;
      const by = Math.max(bush.y, floor(bx, bz));
      const dx = Math.sin(heading);
      const dz = -Math.cos(heading);
      const nx = Math.cos(heading);
      const nz = Math.sin(heading);
      const phase = rng.range(0, 6.283);
      const tone = rng.next();
      const seed = rng.range(1, 90);
      const place = (s: number, t: number): V3 => {
        const a = (s - ROOT_S) * wide;
        const b = (t - ROOT_T) * wide * ASPECT;
        const off = (bend * a * a) / wide + Math.tan(tilt) * b;
        const x = bx + dx * a + nx * off;
        const z = bz + dz * a + nz * off;
        return [x, Math.max(by + b, floor(x, z) + 0.01), z];
      };
      const first = this.count;
      for (let j = 0; j <= NY; j++) {
        for (let i = 0; i <= NX; i++) {
          const s = i / NX;
          const t = j / NY;
          const p = place(s, t);
          const h = Math.min(1, Math.max(0, (p[1] - bush.y) / tall));
          // How far from the heart, as a part of the bush's size.
          const rx = p[0] - bush.x;
          const ry = p[1] - bush.y;
          const rz = p[2] - bush.z;
          const along = Math.min(1, Math.max(0, (rx * heart[0] + ry * heart[1] + rz * heart[2]) / (heartLength * heartLength)));
          const far = Math.hypot(rx - heart[0] * along, ry - heart[1] * along, rz - heart[2] * along) / (0.55 * tall);
          this.position.push(p[0], p[1], p[2]);
          this.vane.push(s, t, seed, 0);
          this.sway.push(h, phase, Math.min(1, Math.abs(s - ROOT_S) * 1.2), seed * 6.283);
          this.tint.push(smooth(0.1, 0.9, far), tone, Math.min(1, Math.hypot(rx, ry, rz) / tall), tall);
          this.root.push(root[0], root[1], root[2]);
        }
      }
      for (let j = 0; j < NY; j++) {
        for (let i = 0; i < NX; i++) {
          const v0 = first + j * (NX + 1) + i;
          const v1 = v0 + NX + 1;
          this.index.push(v0, v0 + 1, v1, v0 + 1, v1 + 1, v1);
        }
      }
      this.count += (NX + 1) * (NY + 1);
      for (const [s, down] of TIPS) {
        const p = place(s, 1 - down);
        this.ends.push({ at: p, stemAt: Math.min(1, Math.max(0, (p[1] - bush.y) / tall)), phase, tall, root });
      }
    }
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    g.setAttribute('aVane', new THREE.Float32BufferAttribute(this.vane, 4));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.sway, 4));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(this.tint, 4));
    g.setAttribute('aRoot', new THREE.Float32BufferAttribute(this.root, 3));
    g.setIndex(this.index);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
    return g;
  }
}
