// The body of a drinker, at rest: a long-necked, eyeless grazer with a deep chest and thin legs, standing with its neck straight up.
// It is one mesh; each vertex says which part it belongs to, and the vertex shader bends the parts.
import * as THREE from 'three';

/** Metres, at size 1. The shader has the same numbers. */
export const BODY = {
  neckPivot: [0, 1.62, 0.85] as [number, number, number],
  neckLength: 1.45,
  headLength: 0.62,
  hipFront: [0.21, 1.2, 0.74] as [number, number, number],
  hipRear: [0.21, 1.26, -0.78] as [number, number, number],
  knee: 0.6,
  leg: 1.2,
};

interface Ring {
  at: [number, number, number];
  rx: number;
  ry: number;
  /** part, how far along the part (0 to 1), and two numbers the part needs. */
  bone: [number, number, number, number];
}

class Builder {
  readonly position: number[] = [];
  readonly bone: number[] = [];
  readonly index: number[] = [];

  tube(rings: Ring[], sides: number): void {
    const base = this.position.length / 3;
    const n = rings.length;
    for (let i = 0; i < n; i++) {
      const a = (rings[Math.max(0, i - 1)] as Ring).at;
      const b = (rings[Math.min(n - 1, i + 1)] as Ring).at;
      const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      const ref = Math.abs(t.y) > 0.7 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
      const side = new THREE.Vector3().crossVectors(ref, t).normalize();
      const up = new THREE.Vector3().crossVectors(t, side).normalize();
      const ring = rings[i] as Ring;
      for (let k = 0; k < sides; k++) {
        const phi = (k / sides) * Math.PI * 2;
        const c = Math.cos(phi) * ring.rx;
        const s = Math.sin(phi) * ring.ry;
        this.position.push(ring.at[0] + side.x * c + up.x * s, ring.at[1] + side.y * c + up.y * s, ring.at[2] + side.z * c + up.z * s);
        this.bone.push(...ring.bone);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      for (let k = 0; k < sides; k++) {
        const a = base + i * sides + k;
        const b = base + i * sides + ((k + 1) % sides);
        const c = a + sides;
        const d = b + sides;
        this.index.push(a, b, c, b, d, c);
      }
    }
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    g.setAttribute('aBone', new THREE.Float32BufferAttribute(this.bone, 4));
    g.setIndex(this.index);
    g.computeVertexNormals();
    return g;
  }
}

export function drinkerGeometry(): THREE.BufferGeometry {
  const b = new Builder();
  // The trunk: rump, tucked waist, deep chest, the root of the neck. The ribs show as shallow rings.
  const trunk: [number, number, number, number][] = [
    [-1.14, 1.5, 0.03, 0.03],
    [-1.08, 1.49, 0.16, 0.17],
    [-0.96, 1.47, 0.26, 0.28],
    [-0.78, 1.45, 0.315, 0.34],
    [-0.58, 1.45, 0.31, 0.33],
    [-0.38, 1.46, 0.275, 0.29],
    [-0.2, 1.45, 0.27, 0.3],
    [-0.02, 1.43, 0.3, 0.35],
    [0.16, 1.41, 0.325, 0.39],
    [0.34, 1.39, 0.345, 0.43],
    [0.52, 1.38, 0.355, 0.455],
    [0.68, 1.39, 0.35, 0.45],
    [0.82, 1.42, 0.32, 0.41],
    [0.94, 1.47, 0.26, 0.34],
    [1.02, 1.52, 0.17, 0.24],
    [1.06, 1.55, 0.04, 0.05],
  ];
  b.tube(
    trunk.map(([z, y, rx, ry], i) => ({ at: [0, y, z], rx: rx * (i > 5 && i < 12 && i % 2 === 0 ? 0.985 : 1), ry, bone: [0, (z + 1.14) / 2.2, 0, 0] })),
    20,
  );
  // The neck, straight up from its root, and the head: a long snout that tapers to nothing, with no eyes.
  const [px, py, pz] = BODY.neckPivot;
  const neck: Ring[] = [];
  const NECK = 12;
  for (let i = 0; i <= NECK; i++) {
    const s = i / NECK;
    const r = 0.2 - 0.09 * s ** 0.7 + 0.06 * Math.exp(-((s / 0.12) ** 2));
    neck.push({ at: [px, py - 0.12 + (BODY.neckLength + 0.12) * s, pz - 0.05 * (1 - s)], rx: r * 0.86, ry: r * 1.08, bone: [1, s, 0, 0] });
  }
  b.tube(neck, 14);
  const top = py + BODY.neckLength;
  const head: Ring[] = [];
  const profile: [number, number][] = [
    [-0.16, 0.03],
    [-0.12, 0.085],
    [-0.04, 0.118],
    [0.06, 0.125],
    [0.16, 0.112],
    [0.28, 0.09],
    [0.4, 0.068],
    [0.5, 0.052],
    [0.58, 0.04],
    [0.62, 0.015],
  ];
  for (const [along, r] of profile) head.push({ at: [px, top + 0.03 - 0.1 * along, pz + along], rx: r * 0.9, ry: r * 1.05, bone: [2, 1, 0, 0] });
  b.tube(head, 12);
  // Two small ears laid back.
  for (const side of [-1, 1]) {
    b.tube(
      [0, 0.35, 0.7, 1].map((s) => ({ at: [px + side * (0.085 + 0.03 * s), top + 0.1 + 0.11 * s, pz - 0.07 - 0.12 * s] as [number, number, number], rx: 0.035 * (1 - s) + 0.004, ry: 0.016 * (1 - s) + 0.003, bone: [2, 1, 0, 0] as [number, number, number, number] })),
      6,
    );
  }
  // The legs: thigh or shoulder, knee, cannon, hoof.
  const legs: [[number, number, number], number, number][] = [
    [[-BODY.hipFront[0], BODY.hipFront[1], BODY.hipFront[2]], 0, 1],
    [[BODY.hipFront[0], BODY.hipFront[1], BODY.hipFront[2]], 1, 1],
    [[-BODY.hipRear[0], BODY.hipRear[1], BODY.hipRear[2]], 2, -1],
    [[BODY.hipRear[0], BODY.hipRear[1], BODY.hipRear[2]], 3, -1],
  ];
  for (const [hip, id, front] of legs) {
    const rings: Ring[] = [];
    const shape: [number, number, number, number][] = [
      // down from the hip (0 to 1), radius across, radius along, lean along the body
      [-0.16, 0.1, 0.15, 0],
      [-0.06, 0.125, 0.2, 0],
      [0.06, 0.12, 0.2, 0],
      [0.18, 0.1, 0.165, 0.01],
      [0.3, 0.078, 0.12, 0.02],
      [0.42, 0.06, 0.082, 0.02],
      [0.48, 0.058, 0.07, 0.015],
      [0.52, 0.062, 0.072, 0.01],
      [0.58, 0.05, 0.058, 0],
      [0.7, 0.04, 0.046, -0.005],
      [0.82, 0.037, 0.042, -0.005],
      [0.9, 0.04, 0.046, 0],
      [0.94, 0.05, 0.056, 0.01],
      [0.985, 0.056, 0.066, 0.02],
      [1.0, 0.03, 0.034, 0.02],
    ];
    for (const [s, rx, rz, lean] of shape) {
      rings.push({ at: [hip[0], hip[1] - s * BODY.leg, hip[2] + lean * (front > 0 ? 1 : -2.2) * BODY.leg], rx, ry: rz * (front > 0 ? 1 : 1.12), bone: [3, s, id, s > 0.5 ? 1 : 0] });
    }
    b.tube(rings, 10);
  }
  // The tail: short, held down.
  b.tube(
    [0, 0.25, 0.5, 0.75, 1].map((s) => ({ at: [0, 1.5 - 0.42 * s, -1.1 - 0.1 * Math.sin(s * 2)] as [number, number, number], rx: 0.045 * (1 - 0.7 * s), ry: 0.045 * (1 - 0.7 * s), bone: [4, s, 0, 0] as [number, number, number, number] })),
    6,
  );
  return b.build();
}
