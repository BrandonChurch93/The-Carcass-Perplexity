// The body of a ridge-runner in its rest pose, and where its coat is rooted.
// Metres, in the animal's own frame: x forward, y up, z to its right, feet on y = 0. Six bones move it: 0 the trunk, 1 to 4 the legs
// (fore left, fore right, hind left, hind right), 5 the neck with the tendrils.
import * as THREE from 'three';
import type { Rng } from '../../../core/rng';

export const LEG_TOP = 0.66;
export const HIPS: [number, number, number][] = [
  [0.4, LEG_TOP, -0.23],
  [0.4, LEG_TOP, 0.23],
  [-0.5, LEG_TOP, -0.25],
  [-0.5, LEG_TOP, 0.25],
];
/** Where the neck turns on the trunk, and where the tendrils hang from. */
export const NECK_AT: [number, number, number] = [0.62, 0.84, 0];
export const FACE_AT: [number, number, number] = [1.0, 0.6, 0];

const hump = (x: number): number => Math.exp(-(((x - 0.3) / 0.42) ** 2));
const cap = (x: number): number => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x + 0.05) / 0.86, 3.2)), 0.42);
/** The trunk at x: the height of its middle, its half height and its half width. A high shoulder, a low sloping rump, no waist. */
export function trunkAt(x: number): { y: number; h: number; w: number } {
  const rump = Math.min(1, Math.max(0, (-0.25 - x) / 0.6));
  return { y: 0.8 + 0.13 * hump(x) - 0.12 * rump * rump, h: (0.33 + 0.12 * hump(x)) * cap(x), w: (0.3 + 0.05 * hump(x)) * cap(x) };
}

interface Ring {
  c: [number, number, number];
  /** Two axes of the ring's ellipse, each a vector whose length is the radius that way. */
  a: [number, number, number];
  b: [number, number, number];
}

class Builder {
  position: number[] = [];
  bone: number[] = [];
  kind: number[] = [];
  index: number[] = [];
  tube(rings: Ring[], around: number, bone: number, kind: number): void {
    const base = this.position.length / 3;
    rings.forEach((r) => {
      for (let i = 0; i < around; i++) {
        const t = (i / around) * Math.PI * 2;
        const ca = Math.cos(t);
        const sa = Math.sin(t);
        this.position.push(r.c[0] + r.a[0] * ca + r.b[0] * sa, r.c[1] + r.a[1] * ca + r.b[1] * sa, r.c[2] + r.a[2] * ca + r.b[2] * sa);
        this.bone.push(bone);
        this.kind.push(kind);
      }
    });
    for (let r = 0; r < rings.length - 1; r++) {
      for (let i = 0; i < around; i++) {
        const p0 = base + r * around + i;
        const p1 = base + r * around + ((i + 1) % around);
        this.index.push(p0, p1, p0 + around, p1, p1 + around, p0 + around);
      }
    }
  }
}

export function bodyGeometry(): THREE.BufferGeometry {
  const b = new Builder();
  // The trunk.
  const trunk: Ring[] = [];
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const x = -0.905 + (1.71 * i) / N;
    const t = trunkAt(x);
    trunk.push({ c: [x, t.y, 0], a: [0, 0, Math.max(t.w, 0.004)], b: [0, Math.max(t.h, 0.004), 0] });
  }
  b.tube(trunk, 18, 0, 0);
  // The neck: short, carried low, ending in a blunt stump with no face.
  const neck: Ring[] = [];
  for (let i = 0; i <= 7; i++) {
    const k = i / 7;
    const x = NECK_AT[0] - 0.1 + (FACE_AT[0] - NECK_AT[0] + 0.14) * k;
    const y = NECK_AT[1] + 0.02 - (NECK_AT[1] - FACE_AT[1]) * k * k;
    const r = (0.25 - 0.1 * k) * (i === 7 ? 0.5 : 1);
    neck.push({ c: [x, y, 0], a: [0, 0, r], b: [-0.45 * r * k, r, 0] });
  }
  b.tube(neck, 12, 5, 0);
  // The legs: short and thick, with a broad foot.
  HIPS.forEach((hip, n) => {
    const leg: Ring[] = [];
    const levels: [number, number, number][] = [
      [LEG_TOP + 0.12, 0.17, 0],
      [0.5, 0.15, 0],
      [0.3, 0.115, -0.02],
      [0.14, 0.095, -0.01],
      [0.06, 0.12, 0.03],
      [0.0, 0.13, 0.05],
      [0.0, 0.01, 0.05],
    ];
    for (const [y, r, fwd] of levels) leg.push({ c: [hip[0] + fwd, y, hip[2]], a: [0, 0, r], b: [r * 1.15, 0, 0] });
    b.tube(leg, 10, n + 1, 0);
    // Three hooked claws on each foot.
    for (let c = -1; c <= 1; c++) {
      const claw: Ring[] = [];
      for (let i = 0; i <= 5; i++) {
        const k = i / 5;
        const out = 0.1 + 0.075 * k;
        const r = 0.024 * (1 - 0.88 * k);
        claw.push({ c: [hip[0] + 0.05 + out * Math.cos(c * 0.42), 0.06 - 0.058 * k * k + 0.02 * Math.sin(k * 3.14), hip[2] + out * Math.sin(c * 0.42) + c * 0.035], a: [0, 0, r], b: [0, r * 1.3, 0] });
      }
      b.tube(claw, 6, n + 1, 1);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.position, 3));
  g.setAttribute('aBone', new THREE.Float32BufferAttribute(b.bone, 1));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(b.kind, 1));
  g.setIndex(b.index);
  g.computeVertexNormals();
  return g;
}

export interface Coat {
  root: Float32Array;
  dir: Float32Array;
  /** Length in metres, a seed, the bone, the width in metres. */
  lock: Float32Array;
  count: number;
}

/** Where each lock of the coat is rooted. `longer` scales the skirt of the flanks. */
export function coat(rng: Rng, count: number, longer: number): Coat {
  const root = new Float32Array(count * 3);
  const dir = new Float32Array(count * 3);
  const lock = new Float32Array(count * 4);
  const put = (i: number, p: number[], n: number[], length: number, bone: number, width: number): void => {
    const l = Math.hypot(n[0] as number, n[1] as number, n[2] as number) || 1;
    root.set(p, i * 3);
    dir.set([(n[0] as number) / l, (n[1] as number) / l, (n[2] as number) / l], i * 3);
    lock.set([length, rng.next(), bone, width], i * 4);
  };
  for (let i = 0; i < count; i++) {
    const pick = rng.next();
    if (pick < 0.7) {
      // The trunk. More locks on the back and the flanks than under the belly.
      const x = -0.9 + 1.68 * rng.next();
      let ang = rng.range(-Math.PI, Math.PI);
      if (Math.abs(ang) > 2.4 && rng.next() < 0.6) ang = rng.range(-2.2, 2.2);
      const t = trunkAt(x);
      const sy = Math.cos(ang);
      const sz = Math.sin(ang);
      const flank = Math.pow(Math.abs(sz), 1.5);
      // Short on the back, longer down the flanks, a fringe under the belly, a mane on the hump.
      const under = Math.max(0, -sy);
      const length = (0.1 + 0.1 * flank * longer + 0.12 * under * longer + 0.1 * hump(x) * Math.max(0, sy)) * rng.range(0.7, 1.3);
      put(i, [x, t.y + t.h * sy, t.w * sz], [0.25 * (x + 0.05), sy / Math.max(t.h, 0.05), sz / Math.max(t.w, 0.05)], length, 0, rng.range(0.022, 0.045));
    } else if (pick < 0.82) {
      // The neck and the mane that falls over where a face would be.
      const k = rng.next();
      const ang = rng.range(-Math.PI, Math.PI);
      const x = NECK_AT[0] - 0.1 + (FACE_AT[0] - NECK_AT[0] + 0.1) * k;
      const y = NECK_AT[1] + 0.02 - (NECK_AT[1] - FACE_AT[1]) * k * k;
      const r = 0.25 - 0.1 * k;
      put(i, [x, y + r * Math.cos(ang), r * Math.sin(ang)], [0.5, Math.cos(ang), Math.sin(ang)], rng.range(0.12, 0.24), 5, rng.range(0.022, 0.04));
    } else {
      // The legs, feathered to the foot.
      const n = Math.floor(rng.next() * 4) % 4;
      const hip = HIPS[n] as [number, number, number];
      const y = rng.range(0.03, LEG_TOP + 0.1);
      const ang = rng.range(-Math.PI, Math.PI);
      const r = 0.1 + 0.07 * (y / LEG_TOP);
      put(i, [hip[0] + r * Math.cos(ang), y, hip[2] + r * Math.sin(ang)], [Math.cos(ang), 0.1, Math.sin(ang)], rng.range(0.07, 0.14) * (0.7 + 0.5 * (y / LEG_TOP)), n + 1, rng.range(0.02, 0.035));
    }
  }
  return { root, dir, lock, count };
}

/** One lock: a strip of `segments` spans, x across (-1 to 1) and y along (0 to 1). */
export function lockGeometry(segments: number): THREE.BufferGeometry {
  const position: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    position.push(-1, i / segments, 0, 1, i / segments, 0);
    if (i < segments) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setIndex(index);
  return g;
}

/** One tendril: a tube along y (0 to 1), radius 1, to be bent in the vertex shader. */
export function tendrilGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(1, 1, 1, 6, 12, true);
  g.translate(0, 0.5, 0);
  return g;
}
