// A kite-wing in the air as a body: a trunk and neck, two legs trailed behind, and two sails each of two panels hinged at the shoulder and at
// the wrist, so that a stroke runs out along the sail and the tip follows the arm. Built anew for every frame on the processor from a pose
// that is a function of the time of the place alone. Its skin is the Builder's picture of the animal seen from over its back (the fliers
// sheet, lower left), thrown onto the body from above. Measures are pixels of that picture: PX of them are a metre at size 1.
import * as THREE from 'three';
import type { BodyMaterials } from './body';

const PX = 105;
/** The middle of the shoulders in the picture, the way the animal heads in it and the way of its right sail (unit, picture x right and y down). */
const O: [number, number] = [450, 696];
const AHEAD: [number, number] = [0.675, -0.738];
const RIGHT: [number, number] = [0.738, 0.675];
/** A patch of the sail's skin, evenly lit: laid where the picture cannot be thrown. */
export const FLIER_FLANK: [number, number, number, number] = [560, 762, 60, 40];

/** The right sail's front and back edges in the picture, shoulder to tip: [pixels out from the middle, pixels ahead of the shoulders]. */
const FRONT: [number, number][] = [[10, 6], [70, 48], [133, 86], [233, 92], [322, 91], [398, 90]];
const BACK: [number, number][] = [[10, -92], [78, -64], [145, -33], [215, -9], [252, 13], [295, 43], [333, 58], [398, 84]];
/** Where the lines across the sail stand, pixels out: the fifth is the wrist. */
const OUT = [10, 41, 72, 103, 133, 186, 239, 292, 345, 398];
const WRIST = 4;
const ROWS = 4;
/** The picture shows the sail swept ahead by its own slant to the lens: taken out, pixels ahead for a pixel out. */
const SWEEP = 0.2;
const WING_VERTS = OUT.length * ROWS;

/** The trunk and neck: [metres ahead of the shoulders, metres up, radius], tail to beak. */
const SPINE: [number, number, number][] = [[-1.08, 0, 0.02], [-0.92, 0, 0.12], [-0.5, 0, 0.18], [-0.08, 0.01, 0.2], [0.16, 0.04, 0.12], [0.5, 0.09, 0.06], [0.88, 0.12, 0.055], [1.04, 0.12, 0.085], [1.3, 0.09, 0.012]];
const SIDES = 6;
const SPINE_VERTS = SPINE.length * SIDES;
/** A leg trailed: [metres ahead of the shoulders, metres up, radius]. */
const LEG: [number, number, number][] = [[-0.9, -0.06, 0.05], [-1.7, -0.12, 0.026], [-2.75, -0.2, 0.02], [-2.95, -0.27, 0.035]];
const LEG_SIDES = 4;
const LEG_VERTS = LEG.length * LEG_SIDES;
const VERTS = 2 * WING_VERTS + SPINE_VERTS + 2 * LEG_VERTS;

/** Metres from the middle of the back to the tip of a sail at size 1. */
export const SAIL_LONG = (OUT[OUT.length - 1] as number) / PX;

const edge = (line: [number, number][], out: number): number => {
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i] as [number, number];
    const b = line[i + 1] as [number, number];
    if (out <= b[0] || i + 2 === line.length) return a[1] + ((b[1] - a[1]) * Math.min(1, Math.max(0, (out - a[0]) / (b[0] - a[0]))));
  }
  return 0;
};
const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface Flying {
  /** The middle of the shoulders, in the place. */
  x: number;
  y: number;
  z: number;
  /** The heading (0 along z), the nose up, the bank (to its right). */
  yaw: number;
  pitch: number;
  roll: number;
  size: number;
  tone: number;
  /** Where the stroke is (radians, the sails level and going down at 0) and how deep it is (0 a glide, 1 full). */
  stroke: number;
  deep: number;
  /** How far the sails are drawn in (0 spread, 1 half folded): a stoop, or a landing's last beat. */
  drawn: number;
  /** The legs let down (0 trailed, 1 hanging). */
  legs: number;
}
export const flying = (): Flying => ({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, size: 1, tone: 1, stroke: 0, deep: 1, drawn: 0, legs: 0 });

/** Many fliers, each set anew from a pose. */
export class Flight {
  readonly mesh: THREE.Mesh;
  private readonly at: Float32Array;
  private readonly way: Float32Array;
  private readonly mix: Float32Array;
  private readonly attributes: THREE.BufferAttribute[];

  constructor(materials: BodyMaterials, readonly count: number) {
    const total = count * VERTS;
    this.at = new Float32Array(total * 3);
    this.way = new Float32Array(total * 3);
    this.mix = new Float32Array(total * 3);
    const px = new Float32Array(total * 2);
    const hide = new Float32Array(total * 2);
    const index: number[] = [];
    const set = (v: number, out: number, ahead: number, thrown: number, occ: number): void => {
      px[v * 2] = O[0] + AHEAD[0] * ahead + RIGHT[0] * out;
      px[v * 2 + 1] = O[1] + AHEAD[1] * ahead + RIGHT[1] * out;
      hide[v * 2] = ahead * 0.9 + 300;
      hide[v * 2 + 1] = out * 0.9 + 300;
      this.mix[v * 3] = thrown;
      this.mix[v * 3 + 1] = occ;
      this.mix[v * 3 + 2] = 1;
    };
    for (let i = 0; i < count; i++) {
      const v0 = i * VERTS;
      for (let side = 0; side < 2; side++) {
        const w0 = v0 + side * WING_VERTS;
        for (let k = 0; k < OUT.length; k++) {
          const out = OUT[k] as number;
          const front = edge(FRONT, out) + 7;
          const back = edge(BACK, out) - 9;
          for (let j = 0; j < ROWS; j++) set(w0 + k * ROWS + j, out, front + ((back - front) * j) / (ROWS - 1), 2, 1);
          if (k + 1 < OUT.length) {
            for (let j = 0; j + 1 < ROWS; j++) {
              const a = w0 + k * ROWS + j;
              index.push(a, a + ROWS, a + 1, a + 1, a + ROWS, a + ROWS + 1);
            }
          }
        }
      }
      const b0 = v0 + 2 * WING_VERTS;
      for (let r = 0; r < SPINE.length; r++) {
        const ring = SPINE[r] as [number, number, number];
        for (let k = 0; k < SIDES; k++) {
          const a = (k / SIDES) * Math.PI * 2;
          // The picture is thrown on from over the back: where the trunk turns to the side the sail's skin is laid.
          set(b0 + r * SIDES + k, -Math.sin(a) * ring[2] * PX * 0.9, ring[0] * PX, smooth(0.3, 0.75, Math.abs(Math.cos(a))), 1 - 0.2 * smooth(0.1, 1, -Math.cos(a)));
          if (r + 1 < SPINE.length) {
            const p = b0 + r * SIDES + k;
            const q = b0 + r * SIDES + ((k + 1) % SIDES);
            index.push(p, q, p + SIDES, q, q + SIDES, p + SIDES);
          }
        }
      }
      for (let leg = 0; leg < 2; leg++) {
        const l0 = b0 + SPINE_VERTS + leg * LEG_VERTS;
        for (let r = 0; r < LEG.length; r++) {
          for (let k = 0; k < LEG_SIDES; k++) {
            set(l0 + r * LEG_SIDES + k, 20 + k * 9, r * 40 + leg * 70, 0, 0.9);
            if (r + 1 < LEG.length) {
              const p = l0 + r * LEG_SIDES + k;
              const q = l0 + r * LEG_SIDES + ((k + 1) % LEG_SIDES);
              index.push(p, q, p + LEG_SIDES, q, q + LEG_SIDES, p + LEG_SIDES);
            }
          }
        }
      }
      this.hide(i);
    }
    const geometry = new THREE.BufferGeometry();
    const attribute = (name: string, data: Float32Array, size: number, moves: boolean): THREE.BufferAttribute => {
      const a = new THREE.BufferAttribute(data, size);
      if (moves) a.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, a);
      return a;
    };
    this.attributes = [attribute('position', this.at, 3, true), attribute('normal', this.way, 3, true), attribute('aMix', this.mix, 3, true)];
    attribute('aPx', px, 2, false);
    attribute('aHide', hide, 2, false);
    geometry.setIndex(index);
    this.mesh = new THREE.Mesh(geometry, materials.body);
    this.mesh.frustumCulled = false;
  }

  hide(i: number): void {
    const from = i * VERTS * 3;
    this.at.fill(0, from, from + VERTS * 3);
    for (let v = 0; v < VERTS; v++) this.at[from + v * 3 + 1] = -500;
  }

  put(i: number, p: Flying): void {
    if (p.size <= 0) {
      this.hide(i);
      return;
    }
    const v0 = i * VERTS;
    const at = this.at;
    const way = this.way;
    const sy = Math.sin(p.yaw);
    const cy = Math.cos(p.yaw);
    const sp = Math.sin(p.pitch);
    const cp = Math.cos(p.pitch);
    const sr = Math.sin(p.roll);
    const cr = Math.cos(p.roll);
    // Ahead, up and left of the body in the place: nose up by the pitch, then banked to its right about the way ahead.
    const fx = sy * cp;
    const fy = sp;
    const fz = cy * cp;
    const u0x = -sy * sp;
    const u0y = cp;
    const u0z = -cy * sp;
    const l0x = -cy;
    const l0z = sy;
    const ux = u0x * cr - l0x * sr;
    const uy = u0y * cr;
    const uz = u0z * cr - l0z * sr;
    const lx = l0x * cr + u0x * sr;
    const ly = u0y * sr;
    const lz = l0z * cr + u0z * sr;
    const size = p.size;
    // The body rides up on the down stroke and sinks on the up stroke.
    const ride = 0.1 * p.deep * Math.sin(p.stroke - 1.2) * size;
    const ox = p.x + ux * ride;
    const oy = p.y + uy * ride;
    const oz = p.z + uz * ride;
    const out = (n: number, a: number, b: number, c: number): void => {
      at[n] = ox + (fx * a + ux * b + lx * c) * size;
      at[n + 1] = oy + (fy * a + uy * b + ly * c) * size;
      at[n + 2] = oz + (fz * a + uz * b + lz * c) * size;
    };
    const turn = (n: number, a: number, b: number, c: number): void => {
      way[n] = fx * a + ux * b + lx * c;
      way[n + 1] = fy * a + uy * b + ly * c;
      way[n + 2] = fz * a + uz * b + lz * c;
    };
    // The stroke: the arm goes down faster than it comes up, the hand follows it a quarter of a beat late, and on the way up the hand is
    // drawn in so that the sail spills the air it would have to lift.
    const s = p.stroke;
    const arm = 0.16 + p.deep * (0.62 * Math.cos(s + 0.25 * Math.sin(s)) - 0.08) - 0.5 * p.drawn;
    const hand = arm + p.deep * 0.5 * Math.cos(s - 1.15) - 0.25 * p.drawn;
    const rising = Math.max(0, -Math.sin(s - 0.5));
    const fold = 1 - 0.22 * p.deep * rising - 0.45 * p.drawn;
    const reach = 1 - 0.2 * p.drawn;
    const wrist = (OUT[WRIST] as number) / PX;
    const ca = Math.cos(arm);
    const sa = Math.sin(arm);
    const ch = Math.cos(hand);
    const sh = Math.sin(hand);
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? 1 : -1;
      let n = (v0 + side * WING_VERTS) * 3;
      for (let k = 0; k < OUT.length; k++) {
        const q = (OUT[k] as number) / PX;
        const front = edge(FRONT, OUT[k] as number) + 7;
        const back = edge(BACK, OUT[k] as number) - 9;
        const far = k <= WRIST ? q * reach : wrist * reach + (q - wrist) * fold;
        const side0 = k <= WRIST ? q * reach * ca : wrist * reach * ca + (q - wrist) * fold * ch;
        const up0 = k <= WRIST ? q * reach * sa : wrist * reach * sa + (q - wrist) * fold * sh;
        const c = k < WRIST ? ca : k === WRIST ? Math.cos(0.5 * (arm + hand)) : ch;
        const sn = k < WRIST ? sa : k === WRIST ? Math.sin(0.5 * (arm + hand)) : sh;
        for (let j = 0; j < ROWS; j++) {
          const along = front + ((back - front) * j) / (ROWS - 1);
          // Drawn in, the hand swings back as well as in; and the skin bellies up between its front and back edges.
          const ahead = (along - SWEEP * (OUT[k] as number)) / PX - (k > WRIST ? (q - wrist) * (1 - fold) * 0.9 : 0) - 0.25 * p.drawn * far;
          const belly = 0.05 * Math.sin((Math.PI * j) / (ROWS - 1)) * (1 - 0.6 * p.drawn);
          out(n, ahead, up0 + belly * c + 0.02, sign * (0.08 + side0 - belly * sn));
          turn(n, 0, c, -sign * sn);
          n += 3;
        }
      }
    }
    let n = (v0 + 2 * WING_VERTS) * 3;
    for (let r = 0; r < SPINE.length; r++) {
      const ring = SPINE[r] as [number, number, number];
      for (let k = 0; k < SIDES; k++) {
        const a = (k / SIDES) * Math.PI * 2;
        const c = Math.cos(a);
        const sn = Math.sin(a);
        out(n, ring[0], ring[1] + c * ring[2] * 0.85, sn * ring[2]);
        turn(n, 0, c, sn);
        n += 3;
      }
    }
    for (let leg = 0; leg < 2; leg++) {
      const sign = leg === 0 ? 1 : -1;
      for (let r = 0; r < LEG.length; r++) {
        const ring = LEG[r] as [number, number, number];
        // Let down, a leg swings about the hip from behind to under.
        const back = ring[0] - (LEG[0] as [number, number, number])[0];
        const low = ring[1] - (LEG[0] as [number, number, number])[1];
        const swing = 1.25 * p.legs;
        const ax = (LEG[0] as [number, number, number])[0] + back * Math.cos(swing) - low * Math.sin(swing);
        const ay = (LEG[0] as [number, number, number])[1] + low * Math.cos(swing) + back * Math.sin(swing);
        for (let k = 0; k < LEG_SIDES; k++) {
          const a = (k / LEG_SIDES) * Math.PI * 2;
          const c = Math.cos(a);
          const sn = Math.sin(a);
          out(n, ax, ay + c * ring[2], sign * (0.07 + 0.02 * r) + sn * ring[2]);
          turn(n, 0, c, sn);
          n += 3;
        }
      }
    }
    for (let v = 0; v < VERTS; v++) this.mix[(v0 + v) * 3 + 2] = p.tone;
  }

  commit(): void {
    for (const a of this.attributes) a.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}
