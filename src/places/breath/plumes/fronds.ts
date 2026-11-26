// How a gill-plume is grown: a few stems rise from one holdfast, arch over toward the shaft and droop at their ends, and each carries
// one frond of the frond picture (plumes/frond.jpg: a stem hung with barbs, the root at its left) as two or three ribbons crossed
// along the stem, so that it has a face from every side. Side fronds leave the stems part way up. Every stem is a tube, and under the
// holdfast a few toes grip the rock. No two fronds share a length, an arch or a droop.
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
  /** 1 for the ones a camera comes close to, less for the far ones: how many fronds are grown and how many ribbons each has. */
  detail: number;
  /** How far over it is combed, 0 to 1. Unset: 0.6. */
  comb?: number;
}

/** Where a thread ends that carries a drop. */
export interface End {
  at: V3;
  root: V3;
  /** The sway of that place: how far along its frond, the bush's phase, how far out on a barb, the frond's phase. */
  sway: [number, number, number, number];
  reach: number;
  tall: number;
}

/** Steps along a frond and across one ribbon of it. */
const ALONG = 22;
const ACROSS = 4;
/** The picture: the part of its width a frond is laid over, and half its height against its width. */
const PIC_FROM = 0.055;
const PIC_TO = 0.985;
const HALF = (0.5 * 768) / 2048;
const SIDES = 7;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Curve {
  points: V3[];
  tangents: V3[];
  /** Two unit vectors across the stem at every point, carried along it without twist. */
  side: V3[];
  over: V3[];
  azimuth: number[];
  elevation: number[];
  length: number;
}

export class Fronds {
  private readonly position: number[] = [];
  private readonly vane: number[] = [];
  private readonly sway: number[] = [];
  private readonly tint: number[] = [];
  private readonly root: number[] = [];
  private readonly index: number[] = [];
  private count = 0;
  private readonly stemPosition: number[] = [];
  private readonly stemNormal: number[] = [];
  private readonly stemVane: number[] = [];
  private readonly stemSway: number[] = [];
  private readonly stemTint: number[] = [];
  private readonly stemRoot: number[] = [];
  private readonly stemIndex: number[] = [];
  private stemCount = 0;
  /** Where barbs end, for the drops. */
  readonly ends: End[] = [];

  grow(bush: Bush, rng: Rng, floor: (x: number, z: number) => number): void {
    const { tall, lean } = bush;
    const comb = bush.comb ?? 0.6;
    const root: V3 = [bush.x, bush.y, bush.z];
    const bushPhase = rng.range(0, 6.283);
    // The heart of the bush: a line from the root up and over toward the lean. What is near it is in the shade of the rest.
    const heart: V3 = [Math.sin(lean) * 0.32 * tall, 0.42 * tall, -Math.cos(lean) * 0.32 * tall];
    const heartLength2 = heart[0] * heart[0] + heart[1] * heart[1] + heart[2] * heart[2];
    const within = (p: V3): number => {
      const rx = p[0] - bush.x;
      const ry = p[1] - bush.y;
      const rz = p[2] - bush.z;
      const along = Math.min(1, Math.max(0, (rx * heart[0] + ry * heart[1] + rz * heart[2]) / heartLength2));
      return smooth(0.08, 0.85, Math.hypot(rx - heart[0] * along, ry - heart[1] * along, rz - heart[2] * along) / (0.5 * tall));
    };
    const reachOf = (p: V3): number => Math.hypot(p[0] - bush.x, p[1] - bush.y, p[2] - bush.z) / tall;

    /** A stem's line: it leaves `from` at an azimuth and elevation, turns toward `toAzimuth` and sinks to `endElevation` at its tip. */
    const curve = (from: V3, azimuth: number, elevation: number, toAzimuth: number, endElevation: number, length: number, power: number): Curve => {
      const c: Curve = { points: [], tangents: [], side: [], over: [], azimuth: [], elevation: [], length };
      const wobble = rng.range(0, 6.283);
      const kink = rng.range(0.06, 0.2);
      let p: V3 = [from[0], from[1], from[2]];
      let side: V3 = [Math.cos(azimuth), 0, Math.sin(azimuth)];
      const roll = rng.range(-0.6, 0.6);
      for (let i = 0; i <= ALONG; i++) {
        const u = i / ALONG;
        const el = elevation + (endElevation - elevation) * u ** power + kink * Math.sin(u * 7 + wobble) * u;
        const az = azimuth + (toAzimuth - azimuth) * smooth(0, 0.8, u) + kink * Math.sin(u * 5.3 + wobble * 1.7);
        const t: V3 = [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
        if (i > 0) {
          p = [p[0] + (t[0] * length) / ALONG, p[1] + (t[1] * length) / ALONG, p[2] + (t[2] * length) / ALONG];
          // Where it comes down to the rock it lies on it.
          const f = floor(p[0], p[2]) + 0.03;
          if (p[1] < f && u > 0.25) p[1] = f;
        }
        const d = side[0] * t[0] + side[1] * t[1] + side[2] * t[2];
        let s: V3 = [side[0] - t[0] * d, side[1] - t[1] * d, side[2] - t[2] * d];
        const sl = Math.hypot(s[0], s[1], s[2]) || 1;
        s = [s[0] / sl, s[1] / sl, s[2] / sl];
        side = s;
        const o: V3 = [t[1] * s[2] - t[2] * s[1], t[2] * s[0] - t[0] * s[2], t[0] * s[1] - t[1] * s[0]];
        const cr = Math.cos(roll);
        const sr = Math.sin(roll);
        c.points.push(p);
        c.tangents.push(t);
        c.side.push([s[0] * cr + o[0] * sr, s[1] * cr + o[1] * sr, s[2] * cr + o[2] * sr]);
        c.over.push([o[0] * cr - s[0] * sr, o[1] * cr - s[1] * sr, o[2] * cr - s[2] * sr]);
        c.azimuth.push(az);
        c.elevation.push(el);
      }
      return c;
    };

    /** The ribbons of one frond along a stem's line. `from` is how far along its parent the frond is rooted and `phase` is its parent's: the
     *  frond's own nod is a function of both, so a side frond stays on its stem. Dead ones and toes (phase 0, from 0, short) hardly nod. */
    /** A place on a stem's line, `u` of the way along it. */
    const on = (c: Curve, u: number): { p: V3; s: V3; o: V3 } => {
      const f = Math.min(ALONG - 1e-4, Math.max(0, u * ALONG));
      const i = Math.floor(f);
      const k = f - i;
      const mix = (a: V3, b: V3): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      return { p: mix(c.points[i] as V3, c.points[i + 1] as V3), s: mix(c.side[i] as V3, c.side[i + 1] as V3), o: mix(c.over[i] as V3, c.over[i + 1] as V3) };
    };
    const ribbons = (c: Curve, blades: number, wide: number, dead: boolean, drops: number, phase: number, from: number, bare = 0): void => {
      const tone = rng.next();
      const half = HALF * c.length * (1 - bare) * wide;
      for (let b = 0; b < blades; b++) {
        const turn = (b / blades) * Math.PI + rng.range(-0.25, 0.25);
        const ct = Math.cos(turn);
        const st = Math.sin(turn);
        const mirror = rng.next() < 0.5 ? -1 : 1;
        const seed = rng.range(1, 90);
        // Each ribbon reads its own stretch of the picture, so two crossed ones never show the same barb at the same place.
        const slide = rng.range(0, 0.035);
        const sag = rng.range(0.45, 0.95);
        // Most ribbons are of the sparse ragged frond, the rest of the full one: no bush is one picture.
        const ragged = rng.next() < 0.7;
        const first = this.count;
        for (let i = 0; i <= ALONG; i++) {
          const u = i / ALONG;
          // The barbs begin a way up the stem: below them it is bare.
          const { p, s, o } = on(c, bare + (1 - bare) * u);
          const ax: V3 = [s[0] * ct + o[0] * st, s[1] * ct + o[1] * st, s[2] * ct + o[2] * st];
          for (let j = 0; j <= ACROSS; j++) {
            const v = (j / ACROSS) * 2 - 1;
            // A barb is wet and hangs: the further out on it, the lower, and the ones that start upward are short and fall over.
            const up = v * ax[1] > 0 ? 1 - 0.55 * Math.min(1, Math.abs(ax[1]) * 1.6) : 1;
            const hang = sag * half * v * v * (0.4 + 0.6 * u) * (2 - up);
            const q: V3 = [p[0] + ax[0] * v * half * up, p[1] + ax[1] * v * half * up - hang, p[2] + ax[2] * v * half * up];
            const f = floor(q[0], q[2]) + 0.015;
            if (q[1] < f) q[1] = f;
            this.position.push(q[0], q[1], q[2]);
            this.vane.push(PIC_FROM + slide + (PIC_TO - PIC_FROM - 0.035) * u, 0.5 + 0.5 * v * mirror, seed, (dead ? 1 : 0) + (ragged ? 2 : 0));
            this.sway.push(from + (1 - from) * (bare + (1 - bare) * u), bushPhase, Math.abs(v), phase);
            this.tint.push(within(q), tone, reachOf(q), tall);
            this.root.push(root[0], root[1], root[2]);
          }
        }
        for (let i = 0; i < ALONG; i++) {
          for (let j = 0; j < ACROSS; j++) {
            const v0 = first + i * (ACROSS + 1) + j;
            const v1 = v0 + ACROSS + 1;
            this.index.push(v0, v0 + 1, v1, v0 + 1, v1 + 1, v1);
          }
        }
        this.count += (ALONG + 1) * (ACROSS + 1);
        // Drops hang where barbs end along the low edge of a ribbon.
        for (let d = 0; d < drops; d++) {
          const u = rng.range(0.3, 0.98);
          const { p, s, o } = on(c, bare + (1 - bare) * u);
          const ax: V3 = [s[0] * ct + o[0] * st, s[1] * ct + o[1] * st, s[2] * ct + o[2] * st];
          const v = (ax[1] > 0 ? -1 : 1) * rng.range(0.55, 0.8) * (1 - 0.5 * smooth(0.8, 1, u));
          const hang = sag * half * v * v * (0.4 + 0.6 * u);
          const q: V3 = [p[0] + ax[0] * v * half, p[1] + ax[1] * v * half - hang, p[2] + ax[2] * v * half];
          if (q[1] < floor(q[0], q[2]) + 0.15) continue;
          this.ends.push({ at: q, root, sway: [from + (1 - from) * (bare + (1 - bare) * u), bushPhase, Math.abs(v), phase], reach: reachOf(q), tall });
        }
      }
    };

    /** The stem itself: a tube that thins toward the tip. */
    const tube = (c: Curve, thick: number, upTo: number, flesh: number, phase: number, from: number, nod = 1): void => {
      const seed = rng.range(1, 90);
      const last = Math.max(2, Math.round(upTo * ALONG));
      const first = this.stemCount;
      for (let i = 0; i <= last; i++) {
        const u = i / ALONG;
        const p = c.points[i] as V3;
        const s = c.side[i] as V3;
        const o = c.over[i] as V3;
        const r = thick * (0.1 + 0.9 * (1 - u / upTo) ** 2.2) * (1 + 0.18 * Math.sin(u * 23 + seed));
        for (let k = 0; k < SIDES; k++) {
          const a = (k / SIDES) * Math.PI * 2;
          const nx = s[0] * Math.cos(a) + o[0] * Math.sin(a);
          const ny = s[1] * Math.cos(a) + o[1] * Math.sin(a);
          const nz = s[2] * Math.cos(a) + o[2] * Math.sin(a);
          const q: V3 = [p[0] + nx * r, p[1] + ny * r, p[2] + nz * r];
          this.stemPosition.push(q[0], q[1], q[2]);
          this.stemNormal.push(nx, ny, nz);
          this.stemVane.push(u * c.length, k / SIDES, seed, flesh * (1 - smooth(0.0, 0.45, u)));
          this.stemSway.push(nod * (from + (1 - from) * u), bushPhase, 0, phase);
          this.stemTint.push(within(q), 0.5, reachOf(q), tall);
          this.stemRoot.push(root[0], root[1], root[2]);
        }
      }
      for (let i = 0; i < last; i++) {
        for (let k = 0; k < SIDES; k++) {
          const v0 = first + i * SIDES + k;
          const v1 = first + i * SIDES + ((k + 1) % SIDES);
          this.stemIndex.push(v0, v1, v0 + SIDES, v1, v1 + SIDES, v0 + SIDES);
        }
      }
      this.stemCount += (last + 1) * SIDES;
    };

    const close = bush.detail >= 1;
    const mains = close ? 10 : bush.detail >= 0.5 ? 5 : 3 + (rng.next() < 0.4 ? 1 : 0);
    const blades = 2;
    for (let m = 0; m < mains; m++) {
      // From the crown of the bush to its skirt: the first rise nearly straight and bend over only at their ends, the last go out low
      // and hang. Each leaves the holdfast its own way round and all are combed toward the lean.
      const rank = Math.min(1, Math.max(0, (m + rng.range(-0.3, 0.3)) / (mains - 1)));
      const k = rng.range(-0.5, 0.5);
      // One in five grows out of the back of the bush and is turned over it by the wind.
      const back = m % 5 === 3;
      const long = (1.32 - 0.6 * rank) * rng.range(0.78, 1.05) * (back ? 0.7 : 1);
      const length = tall * long;
      const out = 0.035 * tall * rng.next();
      const about = rng.range(0, 6.283);
      const from: V3 = [bush.x + Math.sin(about) * out, bush.y + 0.03 * tall, bush.z + Math.cos(about) * out];
      const azimuth = lean + (back ? Math.PI + 1.2 * k : 2.3 * k) + rng.range(-0.25, 0.25);
      const elevation = (back ? 1.25 : 1.5 - 0.8 * rank) + rng.range(-0.12, 0.1);
      const c = curve(from, azimuth, elevation, lean + (back ? 1.6 * k : (1 - comb) * 2.3 * k) + rng.range(-0.2, 0.2), -0.25 - 0.8 * rank ** 0.7 + rng.range(-0.25, 0.2), length, rng.range(1.3, 2.1));
      const phase = rng.range(0, 6.283);
      ribbons(c, blades, rng.range(0.38, 0.62), false, close ? 5 : 0, phase, 0, rng.range(0.12, 0.3));
      tube(c, tall * 0.011 * (0.7 + 0.5 * long), 0.8, 1, phase, 0);
      // Side fronds leave the stem part way up, shorter, each its own way.
      const sides = close ? 1 + (rng.next() < 0.5 ? 1 : 0) : bush.detail >= 0.5 ? 1 : rng.next() < 0.5 ? 1 : 0;
      for (let s = 0; s < sides; s++) {
        const at = Math.round(rng.range(0.14, 0.5) * ALONG);
        const p = c.points[at] as V3;
        const way = (rng.next() < 0.5 ? -1 : 1) * rng.range(0.35, 0.95);
        const child = curve(p, (c.azimuth[at] as number) + way, (c.elevation[at] as number) + rng.range(-0.35, 0.35), lean + way * (1 - comb), rng.range(-1.25, -0.4), length * rng.range(0.42, 0.72) * (1 - (0.4 * at) / ALONG), rng.range(1.0, 1.6));
        ribbons(child, 2, rng.range(0.45, 0.7), false, close ? 3 : 0, phase, at / ALONG, 0.06);
        tube(child, tall * 0.007, 0.7, 0, phase, at / ALONG);
      }
    }
    // Low down a frond or two is dead: brown, broken short, lying out over the rock.
    const fallen = close ? 2 : rng.next() < 0.35 ? 1 : 0;
    for (let d = 0; d < fallen; d++) {
      const azimuth = lean + (rng.next() < 0.5 ? -1 : 1) * rng.range(1.3, 2.6);
      const from: V3 = [bush.x, bush.y + 0.02 * tall, bush.z];
      const c = curve(from, azimuth, rng.range(0.25, 0.5), azimuth + rng.range(-0.5, 0.5), rng.range(-0.9, -0.5), tall * rng.range(0.4, 0.6), 0.8);
      ribbons(c, 2, rng.range(0.7, 0.9), true, 0, 0, 0);
      tube(c, tall * 0.008, 0.75, 0.6, 0, 0);
    }
    // The toes of the holdfast: they leave it low and go into the cracks of the rock.
    const toes = close ? 7 : 4;
    for (let t = 0; t < toes; t++) {
      const azimuth = ((t + rng.next()) / toes) * Math.PI * 2;
      const from: V3 = [bush.x, bush.y + 0.05 * tall, bush.z];
      const c = curve(from, azimuth, rng.range(-0.1, 0.25), azimuth + rng.range(-0.6, 0.6), rng.range(-1.3, -0.8), tall * rng.range(0.13, 0.22), 0.7);
      for (const p of c.points) p[1] = Math.max(p[1], floor(p[0], p[2]) - 0.03 * tall);
      tube(c, tall * rng.range(0.018, 0.028), 1.0, 1, 0, 0, 0);
    }
  }

  build(): { fronds: THREE.BufferGeometry; stems: THREE.BufferGeometry } {
    const fronds = new THREE.BufferGeometry();
    fronds.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    fronds.setAttribute('aVane', new THREE.Float32BufferAttribute(this.vane, 4));
    fronds.setAttribute('aSway', new THREE.Float32BufferAttribute(this.sway, 4));
    fronds.setAttribute('aTint', new THREE.Float32BufferAttribute(this.tint, 4));
    fronds.setAttribute('aRoot', new THREE.Float32BufferAttribute(this.root, 3));
    fronds.setIndex(this.index);
    fronds.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
    const stems = new THREE.BufferGeometry();
    stems.setAttribute('position', new THREE.Float32BufferAttribute(this.stemPosition, 3));
    stems.setAttribute('normal', new THREE.Float32BufferAttribute(this.stemNormal, 3));
    stems.setAttribute('aVane', new THREE.Float32BufferAttribute(this.stemVane, 4));
    stems.setAttribute('aSway', new THREE.Float32BufferAttribute(this.stemSway, 4));
    stems.setAttribute('aTint', new THREE.Float32BufferAttribute(this.stemTint, 4));
    stems.setAttribute('aRoot', new THREE.Float32BufferAttribute(this.stemRoot, 3));
    stems.setIndex(this.stemIndex);
    stems.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
    return { fronds, stems };
  }
}
