// Strands drawn as ribbons that turn to face the camera: a centre line, a tangent and a half width at every point.
// A stem is a ribbon lit as a round rod; a filament is a ribbon a few millimetres wide. One geometry holds every bush.
import * as THREE from 'three';

export type V3 = [number, number, number];

export interface Strand {
  points: V3[];
  /** Half width in metres at each point. */
  half: number[];
  /** 0 a stem, 1 a filament. */
  kind: number;
  /** What moves it: how far up the bush its stem is where it roots (0 to 1), the stem's phase, its own phase. */
  stemAt: (u: number) => number;
  stemPhase: number;
  phase: number;
  /** How hidden from the sky and the sun inside the bush (1 open, 0 buried), a number for its colour, the height of its bush, the bush's root. */
  open: number;
  tone: number;
  tall: number;
  root: V3;
  /** Where along its bush the strand is, 0 at the holdfast and 1 at the outermost tips. */
  reach: (u: number) => number;
}

export class Ribbons {
  private readonly position: number[] = [];
  private readonly tangent: number[] = [];
  private readonly side: number[] = [];
  private readonly sway: number[] = [];
  private readonly tint: number[] = [];
  private readonly root: number[] = [];
  private readonly index: number[] = [];
  private count = 0;
  strands = 0;

  add(s: Strand): void {
    const n = s.points.length;
    for (let i = 0; i < n; i++) {
      const p = s.points[i] as V3;
      const a = s.points[Math.max(0, i - 1)] as V3;
      const b = s.points[Math.min(n - 1, i + 1)] as V3;
      let tx = b[0] - a[0];
      let ty = b[1] - a[1];
      let tz = b[2] - a[2];
      const l = Math.hypot(tx, ty, tz) || 1;
      tx /= l;
      ty /= l;
      tz /= l;
      const u = i / (n - 1);
      for (const e of [-1, 1]) {
        this.position.push(p[0], p[1], p[2]);
        this.tangent.push(tx, ty, tz);
        this.side.push(e, s.half[i] as number, u, s.kind);
        this.sway.push(s.stemAt(u), s.stemPhase, s.kind > 0.5 ? u : 0, s.phase);
        this.tint.push(s.open, s.tone, s.reach(u), s.tall);
        this.root.push(s.root[0], s.root[1], s.root[2]);
      }
      if (i < n - 1) {
        const v = this.count + i * 2;
        this.index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    }
    this.count += n * 2;
    this.strands++;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    g.setAttribute('aTangent', new THREE.Float32BufferAttribute(this.tangent, 3));
    g.setAttribute('aSide', new THREE.Float32BufferAttribute(this.side, 4));
    g.setAttribute('aSway', new THREE.Float32BufferAttribute(this.sway, 4));
    g.setAttribute('aTint', new THREE.Float32BufferAttribute(this.tint, 4));
    g.setAttribute('aRoot', new THREE.Float32BufferAttribute(this.root, 3));
    g.setIndex(this.index);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
    return g;
  }
}
