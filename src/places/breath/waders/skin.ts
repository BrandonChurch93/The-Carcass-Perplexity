// The skin of the waders: every animal is a set of tubes (body, neck, four legs, tendrils) in one geometry. The Heart's, as it is.
// A tube is rings of vertices round a centre line; the pose writes each ring from a centre, a frame and a table of local offsets,
// and the normals are then taken from the surface itself, so bends, knobs and lumps are lit as they are.
import * as THREE from 'three';

export interface Tube {
  start: number;
  rings: number;
  sides: number;
}

export class Skin {
  private total = 0;
  private readonly tubes: Tube[] = [];
  private readonly index: number[] = [];
  private readonly uv: number[] = [];
  private readonly info: number[] = [];
  private readonly look: number[] = [];
  private readonly whose: number[] = [];
  private readonly rest: number[] = [];
  private readonly restN: number[] = [];
  private readonly pic: number[] = [];
  private readonly limb: number[] = [];
  private readonly bake: number[] = [];
  /** The animal the tubes made from now on belong to. */
  who = 0;
  position = new Float32Array(0);
  normal = new Float32Array(0);
  heat = new Float32Array(0);
  geometry: THREE.BufferGeometry | null = null;

  tube(rings: number, sides: number): Tube {
    const t = { start: this.total, rings, sides };
    const w = sides + 1;
    this.total += rings * w;
    for (let v = t.start; v < this.total; v++) this.whose[v] = this.who;
    this.tubes.push(t);
    for (let i = 0; i < rings - 1; i++) {
      for (let j = 0; j < sides; j++) {
        const a = t.start + i * w + j;
        const b = a + 1;
        const c = a + w;
        const d = c + 1;
        this.index.push(a, b, c, b, d, c);
      }
    }
    return t;
  }

  /** A skin that is no tube: `count` vertices and its own triangles. The pose writes `position` and `normal` from `start` on. */
  blob(count: number, index: Uint32Array): Tube {
    const t = { start: this.total, rings: count, sides: 0 };
    this.total += count;
    for (let v = t.start; v < this.total; v++) this.whose[v] = this.who;
    for (let i = 0; i < index.length; i++) this.index.push(t.start + (index[i] as number));
    return t;
  }

  /** What does not change for a vertex of a blob: where it is on the animal at rest and how its skin faces there, and the same things a tube has. */
  describeAt(v: number, rest: [number, number, number], restN: [number, number, number], uv: [number, number], info: [number, number, number, number], look: [number, number]): void {
    for (let i = 0; i < 3; i++) {
      this.rest[v * 3 + i] = rest[i] as number;
      this.restN[v * 3 + i] = restN[i] as number;
    }
    this.uv[v * 2] = uv[0];
    this.uv[v * 2 + 1] = uv[1];
    for (let i = 0; i < 4; i++) this.info[v * 4 + i] = info[i] as number;
    this.look[v * 2] = look[0];
    this.look[v * 2 + 1] = look[1];
  }

  /** Where a vertex of a blob is in the side view picture of the animal: as trunk, as limb, and how much it is limb. */
  picture(v: number, ax: number, ay: number, bx: number, by: number, limb: number): void {
    this.pic[v * 4] = ax;
    this.pic[v * 4 + 1] = ay;
    this.pic[v * 4 + 2] = bx;
    this.pic[v * 4 + 3] = by;
    this.limb[v] = limb;
  }

  /** Where a vertex of a blob is in the sheet of sculpted relief (waders/relief.jpg), and how much of it is laid there. */
  sculpted(v: number, x: number, y: number, much: number): void {
    this.bake[v * 3] = x;
    this.bake[v * 3 + 1] = y;
    this.bake[v * 3 + 2] = much;
  }

  /** What does not change: `along` and `around` in metres over the skin, how pale, how hidden from the light, the radius of the tube there, a number for the animal. */
  describe(t: Tube, ring: number, side: number, along: number, around: number, pale: number, shade: number, radius: number, seed: number, kind: number, rib: number): void {
    const v = t.start + ring * (t.sides + 1) + side;
    this.uv[v * 2] = along;
    this.uv[v * 2 + 1] = around;
    this.info[v * 4] = pale;
    this.info[v * 4 + 1] = shade;
    this.info[v * 4 + 2] = radius;
    this.info[v * 4 + 3] = seed;
    this.look[v * 2] = kind;
    this.look[v * 2 + 1] = rib;
  }

  build(): THREE.BufferGeometry {
    this.position = new Float32Array(this.total * 3);
    this.normal = new Float32Array(this.total * 3);
    this.heat = new Float32Array(this.total);
    const g = new THREE.BufferGeometry();
    const dynamic = (a: Float32Array, n: number): THREE.BufferAttribute => {
      const at = new THREE.BufferAttribute(a, n);
      at.setUsage(THREE.DynamicDrawUsage);
      return at;
    };
    g.setAttribute('position', dynamic(this.position, 3));
    g.setAttribute('normal', dynamic(this.normal, 3));
    g.setAttribute('aHeat', dynamic(this.heat, 1));
    const fill = (a: number[], n: number): Float32Array => {
      const out = new Float32Array(this.total * n);
      for (let i = 0; i < out.length; i++) out[i] = a[i] ?? 0;
      return out;
    };
    g.setAttribute('aUv', new THREE.BufferAttribute(fill(this.uv, 2), 2));
    g.setAttribute('aInfo', new THREE.BufferAttribute(fill(this.info, 4), 4));
    g.setAttribute('aLook', new THREE.BufferAttribute(fill(this.look, 2), 2));
    g.setAttribute('aWho', new THREE.BufferAttribute(fill(this.whose, 1), 1));
    g.setAttribute('aRest', new THREE.BufferAttribute(fill(this.rest, 3), 3));
    g.setAttribute('aRestN', new THREE.BufferAttribute(fill(this.restN, 3), 3));
    g.setAttribute('aPic', new THREE.BufferAttribute(fill(this.pic, 4), 4));
    g.setAttribute('aLimb', new THREE.BufferAttribute(fill(this.limb, 1), 1));
    g.setAttribute('aBake', new THREE.BufferAttribute(fill(this.bake, 3), 3));
    g.setIndex(this.index);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
    this.geometry = g;
    return g;
  }

  /** One ring: centre c, the two axes of its plane n and b, and `sides` pairs of offsets in that plane starting at `at`. */
  ring(t: Tube, i: number, cx: number, cy: number, cz: number, nx: number, ny: number, nz: number, bx: number, by: number, bz: number, local: Float32Array, at: number, scale = 1): void {
    const w = t.sides + 1;
    const p = this.position;
    let o = (t.start + i * w) * 3;
    for (let j = 0; j < w; j++) {
      const k = at + (j === t.sides ? 0 : j) * 2;
      const x = (local[k] as number) * scale;
      const y = (local[k + 1] as number) * scale;
      p[o++] = cx + nx * x + bx * y;
      p[o++] = cy + ny * x + by * y;
      p[o++] = cz + nz * x + bz * y;
    }
  }

  setHeat(t: Tube, i: number, value: number): void {
    const w = t.sides + 1;
    const o = t.start + i * w;
    for (let j = 0; j < w; j++) this.heat[o + j] = value;
  }

  /** Normals of a tube from its own surface. Call after every ring is written. */
  normals(t: Tube): void {
    const w = t.sides + 1;
    const p = this.position;
    const n = this.normal;
    for (let i = 0; i < t.rings; i++) {
      const up = Math.min(t.rings - 1, i + 1);
      const down = Math.max(0, i - 1);
      for (let j = 0; j < t.sides; j++) {
        const next = (j + 1) % t.sides;
        const prev = (j + t.sides - 1) % t.sides;
        const a = (t.start + i * w + next) * 3;
        const b = (t.start + i * w + prev) * 3;
        const c = (t.start + up * w + j) * 3;
        const d = (t.start + down * w + j) * 3;
        const ux = (p[a] as number) - (p[b] as number);
        const uy = (p[a + 1] as number) - (p[b + 1] as number);
        const uz = (p[a + 2] as number) - (p[b + 2] as number);
        const vx = (p[c] as number) - (p[d] as number);
        const vy = (p[c + 1] as number) - (p[d + 1] as number);
        const vz = (p[c + 2] as number) - (p[d + 2] as number);
        let x = uy * vz - uz * vy;
        let y = uz * vx - ux * vz;
        let z = ux * vy - uy * vx;
        const l = Math.hypot(x, y, z);
        if (l > 1e-12) {
          x /= l;
          y /= l;
          z /= l;
        } else {
          // A closed end: the ring is a point, so the normal is the axis of the tube, outward.
          const s = i === 0 ? -1 : 1;
          const l2 = Math.hypot(vx, vy, vz) || 1;
          x = (s * vx) / l2;
          y = (s * vy) / l2;
          z = (s * vz) / l2;
        }
        const o = (t.start + i * w + j) * 3;
        n[o] = x;
        n[o + 1] = y;
        n[o + 2] = z;
      }
      const first = (t.start + i * w) * 3;
      const last = (t.start + i * w + t.sides) * 3;
      n[last] = n[first] as number;
      n[last + 1] = n[first + 1] as number;
      n[last + 2] = n[first + 2] as number;
    }
  }

  touch(): void {
    const g = this.geometry;
    if (!g) return;
    (g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('normal') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('aHeat') as THREE.BufferAttribute).needsUpdate = true;
  }
}
