// The vanes of a frond: on each side of its stem a sheet of fine barbs that leave the stem sideways and hang.
// The sheet is a strip of geometry; the barbs themselves, their wet locks and the beads at their tips are drawn on it by the fragment shader.
import * as THREE from 'three';
import type { V3 } from './ribbons';

export interface Frond {
  points: V3[];
  /** Height in the bush (0 to 1) at each point: what the sway reads. */
  at: number[];
  phase: number;
  /** Length of the barbs in metres at each point. */
  barb: number[];
  /** How far the barbs droop at each point, radians below level at their tips. */
  droop: number[];
  twist: number;
  seed: number;
  open: number;
  tone: number;
  tall: number;
  root: V3;
  /** 0 at the holdfast, 1 at the outermost tips, at each point. */
  reach: number[];
}

const ACROSS = 5;

export class Vanes {
  private readonly position: number[] = [];
  private readonly vane: number[] = [];
  private readonly sway: number[] = [];
  private readonly tint: number[] = [];
  private readonly root: number[] = [];
  private readonly index: number[] = [];
  private count = 0;
  /** Where the barbs end, for the drops: a point for every few centimetres of every vane. */
  readonly ends: { at: V3; stemAt: number; phase: number; tall: number; root: V3 }[] = [];

  add(f: Frond): void {
    const n = f.points.length;
    let along = 0;
    // Four vanes: one to each side that hangs, and over each a shorter one that leaves the stem higher and falls sooner, so the frond is full from every side.
    for (const [side, layer] of [[-1, 0], [1, 0], [-1, 1], [1, 1]] as const) {
      along = 0;
      const first = this.count;
      for (let i = 0; i < n; i++) {
        const p = f.points[i] as V3;
        const a = f.points[Math.max(0, i - 1)] as V3;
        const b = f.points[Math.min(n - 1, i + 1)] as V3;
        if (i > 0) along += Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]);
        let tx = b[0] - a[0];
        let ty = b[1] - a[1];
        let tz = b[2] - a[2];
        const tl = Math.hypot(tx, ty, tz) || 1;
        tx /= tl;
        ty /= tl;
        tz /= tl;
        // Sideways from the stem, level; where the stem stands upright any level direction will do.
        let sx = -tz;
        let sz = tx;
        const sl = Math.hypot(sx, sz);
        if (sl < 0.05) {
          sx = 1;
          sz = 0;
        } else {
          sx /= sl;
          sz /= sl;
        }
        sx *= side;
        sz *= side;
        const length = (f.barb[i] as number) * (layer === 0 ? 1 : 0.7);
        const droop = (f.droop[i] as number) * (layer === 0 ? 1 : 1.25);
        let x = p[0];
        let y = p[1];
        let z = p[2];
        for (let q = 0; q <= ACROSS; q++) {
          const v = q / ACROSS;
          if (q > 0) {
            // A barb leaves the stem a little above level, swept toward the frond's tip, and its own wet weight takes it down.
            const vm = (q - 0.5) / ACROSS;
            const elevation = (layer === 0 ? 0.3 : 0.75) + f.twist * side - ((layer === 0 ? 0.3 : 0.75) + droop) * vm ** (layer === 0 ? 1.2 : 0.8);
            const sweep = 0.5;
            const c = Math.cos(elevation);
            const ds = length / ACROSS;
            x += (sx * Math.cos(sweep) + tx * Math.sin(sweep)) * c * ds;
            y += (Math.sin(elevation) + ty * Math.sin(sweep) * c) * ds;
            z += (sz * Math.cos(sweep) + tz * Math.sin(sweep)) * c * ds;
          }
          this.position.push(x, y, z);
          this.vane.push(along, v, f.seed + side * 0.37 + layer * 1.91, length);
          this.sway.push(f.at[i] as number, f.phase, v * Math.min(1, (length / f.tall) * 6), f.seed * 6.283);
          this.tint.push(f.open, f.tone, f.reach[i] as number, f.tall);
          this.root.push(f.root[0], f.root[1], f.root[2]);
        }
        if (layer === 0 && i % 2 === 0 && length > 0.04) this.ends.push({ at: [x, y, z], stemAt: f.at[i] as number, phase: f.phase, tall: f.tall, root: f.root });
        if (i < n - 1) {
          for (let q = 0; q < ACROSS; q++) {
            const v0 = first + i * (ACROSS + 1) + q;
            const v1 = v0 + ACROSS + 1;
            this.index.push(v0, v0 + 1, v1, v0 + 1, v1 + 1, v1);
          }
        }
      }
      this.count += n * (ACROSS + 1);
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
