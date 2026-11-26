// The body of a drinker, at rest: a long-necked, eyeless grazer with a deep chest and thin legs, standing with its neck straight up.
// It is one mesh; each vertex says which part it belongs to, and the vertex shader bends the parts.
import * as THREE from 'three';

/** Metres, at size 1. The shader has the same numbers. */
export const BODY = {
  neckPivot: [0, 1.56, 0.66] as [number, number, number],
  neckLength: 1.5,
  headLength: 0.5,
  hipFront: [0.21, 1.2, 0.55] as [number, number, number],
  hipRear: [0.21, 1.26, -0.58] as [number, number, number],
  knee: 0.6,
  leg: 1.2,
};

const smoothAt = (lo: number, hi: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
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
    [0.34, 1.4, 0.335, 0.4],
    [0.52, 1.39, 0.345, 0.42],
    [0.68, 1.4, 0.34, 0.415],
    [0.82, 1.43, 0.31, 0.385],
    [0.94, 1.47, 0.26, 0.34],
    [1.02, 1.52, 0.17, 0.24],
    [1.06, 1.55, 0.04, 0.05],
  ];
  b.tube(
    trunk.map(([z, y, rx, ry], i) => ({ at: [0, y, z * 0.74], rx: rx * (i > 5 && i < 12 && i % 2 === 0 ? 0.985 : 1), ry, bone: [0, (z + 1.14) / 2.2, 0, 0] })),
    20,
  );
  // Under the skin: the ridge of the spine with the withers and the croup, the points of the hips, the blades of the shoulders, the ribs, the hollow of the flank.
  const bell = (v: number, at: number, width: number): number => Math.exp(-(((v - at) / width) ** 2));
  for (let i = 0; i < b.position.length; i += 3) {
    const x = b.position[i] as number;
    const y = b.position[i + 1] as number;
    const z = (b.position[i + 2] as number) / 0.74;
    const dy = y - 1.44;
    const reach = Math.hypot(x, dy);
    if (reach < 0.02) continue;
    const up = Math.atan2(dy, Math.abs(x));
    let out = 0;
    out += smoothAt(0.95, 1.45, up) * (0.04 + 0.055 * bell(z, 0.52, 0.2) + 0.06 * bell(z, -0.6, 0.22));
    out += 0.095 * bell(z, -0.62, 0.11) * bell(up, 0.75, 0.3);
    out += 0.075 * bell(z, 0.5, 0.16) * bell(up, 0.35, 0.45);
    out -= 0.085 * bell(z, -0.3, 0.16) * bell(up, 0.45, 0.4);
    out -= 0.016 * (0.5 + 0.5 * Math.sin(z * 50)) * smoothAt(-0.22, -0.05, z) * (1 - smoothAt(0.3, 0.46, z)) * bell(up, 0.0, 0.75);
    const k = 1 + out / reach;
    b.position[i] = x * k;
    b.position[i + 1] = 1.44 + dy * k;
  }
  // The neck, straight up from its root, and the head: a short blunt snout, with no eyes and no ears.
  const [px, py, pz] = BODY.neckPivot;
  const neck: Ring[] = [];
  const NECK = 12;
  for (let i = 0; i <= NECK; i++) {
    const s = i / NECK;
    const r = 0.215 - 0.115 * s ** 0.75 + 0.07 * Math.exp(-((s / 0.16) ** 2));
    neck.push({ at: [px, py - 0.12 + (BODY.neckLength + 0.12) * s, pz - 0.05 * (1 - s)], rx: r * 0.74, ry: r * 1.18, bone: [1, s, 0, 0] });
  }
  b.tube(neck, 14);
  const top = py + BODY.neckLength;
  const head: Ring[] = [];
  const profile: [number, number][] = [
    [-0.13, 0.035],
    [-0.1, 0.085],
    [-0.03, 0.118],
    [0.06, 0.122],
    [0.15, 0.106],
    [0.25, 0.082],
    [0.34, 0.066],
    [0.42, 0.058],
    [0.47, 0.046],
    [0.5, 0.014],
  ];
  for (const [along, r] of profile) head.push({ at: [px, top + 0.03 - 0.1 * along, pz + along], rx: r * 0.9, ry: r * 1.05, bone: [2, 1, 0, 0] });
  b.tube(head, 12);
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
      [-0.16, 0.09, 0.14, 0],
      [-0.06, 0.115, 0.2, 0],
      [0.06, 0.11, 0.2, 0],
      [0.18, 0.09, 0.16, 0.012],
      [0.3, 0.066, 0.105, 0.024],
      [0.4, 0.05, 0.066, 0.024],
      [0.46, 0.052, 0.06, 0.018],
      [0.5, 0.064, 0.074, 0.012],
      [0.54, 0.058, 0.066, 0.004],
      [0.6, 0.04, 0.046, 0],
      [0.72, 0.03, 0.036, -0.006],
      [0.84, 0.028, 0.034, -0.006],
      [0.9, 0.036, 0.044, 0],
      [0.93, 0.046, 0.054, 0.006],
      [0.95, 0.04, 0.05, 0.012],
      [0.965, 0.052, 0.066, 0.02],
      [0.995, 0.06, 0.078, 0.028],
      [1.0, 0.03, 0.04, 0.028],
    ];
    for (const [s, rx, rz, lean] of shape) {
      rings.push({ at: [hip[0], hip[1] - s * BODY.leg, hip[2] + lean * (front > 0 ? 1 : -2.2) * BODY.leg], rx, ry: rz * (front > 0 ? 1 : 1.12), bone: [3, s, id, s > 0.5 ? 1 : 0] });
    }
    b.tube(rings, 10);
  }
  // The tail: short, held down.
  b.tube(
    [0, 0.25, 0.5, 0.75, 1].map((s) => ({ at: [0, 1.5 - 0.42 * s, -0.82 - 0.1 * Math.sin(s * 2)] as [number, number, number], rx: 0.045 * (1 - 0.7 * s), ry: 0.045 * (1 - 0.7 * s), bone: [4, s, 0, 0] as [number, number, number, number] })),
    6,
  );
  return b.build();
}
