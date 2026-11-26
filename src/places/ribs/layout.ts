import * as THREE from 'three';

export interface Rib {
  name: string;
  x: number;
  z: number;
  yaw: number;
  height: number;
  lean: number;
  a: number;
  b: number;
  flare?: number;
  flareTop?: number;
  ledge?: number;
  cut?: number;
  bend?: [number, number, number, number];
  ctrl?: [number, number];
  /** How the blade thins toward its tip: its width is a * (1 - (1 - keep) * t ^ taper). Set on a fin; the near cliff and the stump keep the old girth. */
  taper?: number;
  /** The part of its width a blade keeps at its tip. */
  keep?: number;
}

export const TIDE = 30;
export const POOL = 1.15;
export const SEA = 0;
export const FLOOR = { south: 330, north: -3100, west: -640, east: 820 };

const LEFT = 0;
const RIGHT = Math.PI;

export const RIBS: Rib[] = [
  // The near cliff of the left row: the drowned one hangs in its weed. Its foot is the anchor of two cameras and does not move.
  { name: 'L1', x: -330, z: 0, yaw: LEFT, height: 430, lean: 190, a: 100, b: 95, flare: 20, flareTop: 120 },
  // The great fin of the right row, nearest the establishing camera: it leaves the frame at the top.
  { name: 'R1', x: 405, z: -430, yaw: RIGHT, height: 520, lean: 520, a: 122, b: 60, flare: 20, flareTop: 60, ctrl: [0.42, 0.55], taper: 0.9 },
  // The arch of the left row: it rises, hooks over the strait and its tip comes down again.
  { name: 'L2', x: -311, z: -817, yaw: LEFT, height: 308, lean: 275, a: 42, b: 30, flare: 14, flareTop: 50, bend: [40, 480, 275, 212], taper: 1.3, keep: 0.24 },
  // The sunlit fin of the right row. From the establishing camera the colony's rock stands before its foot; from the colony's camera it
  // is the leaning shape in the haze behind the rock.
  { name: 'R2', x: 508, z: -980, yaw: RIGHT, height: 378, lean: 381, a: 224, b: 70, flare: 14, flareTop: 50, ctrl: [0.42, 0.62], taper: 0.95 },
  // The blade behind the near cliff, hooked toward the strait.
  { name: 'L3', x: -297, z: -532, yaw: LEFT, height: 250, lean: 95, a: 46, b: 34, flare: 14, flareTop: 50, bend: [-6, 235, 95, 250], taper: 1.1 },
  // The small fin in the middle distance.
  { name: 'R3', x: 120, z: -1008, yaw: RIGHT, height: 236, lean: 142, a: 47, b: 28, flare: 12, flareTop: 40, ctrl: [0.4, 0.66], taper: 1.0 },
  // The one broken off at a third of its height.
  { name: 'S', x: -380, z: -1150, yaw: LEFT, height: 420, lean: 150, a: 75, b: 62, flare: 20, flareTop: 60, cut: 128 },
  { name: 'L4', x: -295, z: -2068, yaw: LEFT - 0.1, height: 300, lean: 190, a: 70, b: 40, ctrl: [0.4, 0.7], taper: 1.0 },
  { name: 'R4', x: 222, z: -2061, yaw: RIGHT + 0.1, height: 310, lean: 200, a: 78, b: 40, ctrl: [0.42, 0.66], taper: 0.95 },
  { name: 'L5', x: -330, z: -2620, yaw: LEFT, height: 290, lean: 240, a: 60, b: 36, bend: [40, 420, 240, 210], taper: 1.25, keep: 0.25 },
  { name: 'R5', x: 270, z: -2700, yaw: RIGHT, height: 280, lean: 170, a: 80, b: 40, ctrl: [0.4, 0.68], taper: 1.0 },
  { name: 'L6', x: -420, z: -1480, yaw: LEFT + 0.05, height: 330, lean: 210, a: 85, b: 42, ctrl: [0.38, 0.7], taper: 1.0 },
  { name: 'R6', x: 560, z: -1540, yaw: RIGHT - 0.05, height: 360, lean: 250, a: 95, b: 44, ctrl: [0.4, 0.68], taper: 1.0 },
  { name: 'OL', x: -560, z: 780, yaw: LEFT + 0.2, height: 410, lean: 230, a: 120, b: 60, flare: 20, flareTop: 60, ctrl: [0.36, 0.7], taper: 1.0 },
  { name: 'OR', x: 620, z: 560, yaw: RIGHT - 0.2, height: 470, lean: 290, a: 140, b: 66, flare: 20, flareTop: 60, ctrl: [0.36, 0.7], taper: 1.0 },
];

export const ribByName = (name: string): Rib => {
  const rib = RIBS.find((r) => r.name === name);
  if (!rib) throw new Error(`No rib named ${name}`);
  return rib;
};

function control(rib: Rib): [number, number, number, number] {
  const [fu, fy] = rib.ctrl ?? [0.3, 0.85];
  return rib.bend ?? [fu * rib.lean, fy * rib.height, rib.lean, rib.height];
}

function centre(rib: Rib, t: number): { u: number; y: number; nu: number; ny: number } {
  const [u1, y1, u2, y2] = control(rib);
  const k = 2 * (1 - t) * t;
  const u = k * u1 + t * t * u2;
  const y = k * y1 + t * t * y2;
  const du = 2 * (1 - 2 * t) * u1 + 2 * t * u2;
  const dy = 2 * (1 - 2 * t) * y1 + 2 * t * y2;
  if (!rib.bend && rib.taper === undefined) return { u, y, nu: 1, ny: 0 };
  const l = Math.hypot(du, dy) || 1;
  // The foot is cut level (the sea, the weed and the rocks stand round it); above it each section lies square to the spine.
  const turn = Math.min(1, Math.max(0, (t - 0.04) / 0.2));
  return { u, y, nu: 1 + (dy / l - 1) * turn, ny: (-du / l) * turn };
}

/** The spine of a blade as `count` balls from its foot to its tip: centre in the world and the mean radius there. The rig marches the sun against them. */
export function bladeSpine(rib: Rib, count: number): { x: number; y: number; z: number; radius: number }[] {
  const out: { x: number; y: number; z: number; radius: number }[] = [];
  const tTop = rib.cut === undefined ? 1 : partAtHeight(rib, rib.cut);
  for (let k = 0; k < count; k++) {
    const t = (k / (count - 1)) * tTop;
    const [a, b] = radii(rib, t);
    const p = surface(rib, t, 0, 0, 0);
    out.push({ x: p.x, y: p.y, z: p.z, radius: Math.min(a, b) + 0.3 * Math.abs(a - b) });
  }
  return out;
}

export function partAtHeight(rib: Rib, y: number): number {
  let lo = 0;
  let hi = rib.bend ? 0.6 : 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (centre(rib, mid).y < y) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function radii(rib: Rib, t: number): [number, number] {
  const y = centre(rib, t).y;
  const top = rib.flareTop ?? 1;
  const flare = (rib.flare ?? 0) * Math.pow(Math.max(0, 1 - Math.max(0, y) / top), 1.5);
  // Above its foot a blade thins fast: a thin tall arc, not a horn. The near cliff and the colony's stack keep their girth (things stand on them).
  const slim = rib.name === 'L1' || rib.name === 'S' ? 0 : Math.min(1, Math.max(0, (t - 0.06) / 0.25));
  if (rib.taper !== undefined) {
    const keep = rib.keep ?? 0.035;
    const k = 1 - (1 - keep) * Math.pow(t, rib.taper);
    return [rib.a * k + flare, rib.b * (0.3 + 0.7 * k) * (1 - 0.35 * t) + flare];
  }
  const ka = 1 - 0.9 * Math.pow(t, 1.4);
  const kb = 1 - 0.85 * t;
  return [rib.a * ka * (1 - 0.34 * slim) + flare, rib.b * kb * (1 - 0.28 * slim) + flare];
}

export function skirtPad(y: number): number {
  const k = Math.min(1, Math.max(0, 1 - y / TIDE));
  // Steep: the weed hangs down a face, it does not lie along a slope.
  return 3 + 5 * k * k;
}

export function surface(rib: Rib, t: number, phi: number, ra: number, rb: number): THREE.Vector3 {
  const c = centre(rib, t);
  const u = c.u + c.nu * ra * Math.cos(phi);
  const y = c.y + c.ny * ra * Math.cos(phi);
  const w = rb * Math.sin(phi);
  const cs = Math.cos(rib.yaw);
  const sn = Math.sin(rib.yaw);
  return new THREE.Vector3(rib.x + u * cs - w * sn, y, rib.z + u * sn + w * cs);
}

export function weedPoint(rib: Rib, phi: number, y: number, out = 0): THREE.Vector3 {
  const t = partAtHeight(rib, y);
  const [a, b] = radii(rib, t);
  const pad = skirtPad(y) + out;
  return surface(rib, t, phi, a + pad, b + pad);
}

const AROUND = 28;

function sweep(rings: THREE.Vector3[][]): THREE.BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  for (const ring of rings) for (const p of ring) positions.push(p.x, p.y, p.z);
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < AROUND; i++) {
      const j = (i + 1) % AROUND;
      const a = r * AROUND + i;
      const b = r * AROUND + j;
      const c = (r + 1) * AROUND + i;
      const d = (r + 1) * AROUND + j;
      index.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

function ringOf(rib: Rib, t: number, ra: number, rb: number): THREE.Vector3[] {
  const ring: THREE.Vector3[] = [];
  for (let i = 0; i < AROUND; i++) ring.push(surface(rib, t, (i / AROUND) * Math.PI * 2, ra, rb));
  return ring;
}

export interface Ledge {
  t: number;
  a: number;
  b: number;
  y: number;
}

export function ledgesOf(rib: Rib): Ledge[] {
  const out: Ledge[] = [];
  const top = rib.cut ?? Infinity;
  if (rib.bend) {
    for (let k = 0; k <= 40; k++) {
      const t = k / 40;
      const [a, b] = radii(rib, t);
      out.push({ t, a, b, y: centre(rib, t).y });
    }
    return out;
  }
  let y = -14;
  const peak = centre(rib, 1).y;
  while (y < Math.min(peak, top)) {
    const t = partAtHeight(rib, y);
    const [a, b] = radii(rib, t);
    out.push({ t, a, b, y });
    const fine = rib.ledge !== undefined && y >= TIDE - 6 && y < (rib.flareTop ?? 0) + 20;
    y += fine ? (rib.ledge as number) : y < TIDE ? 22 : Math.max(14, rib.height / 26);
  }
  const t = rib.cut === undefined ? 1 : partAtHeight(rib, rib.cut);
  const [a, b] = radii(rib, t);
  out.push({ t, a, b, y: centre(rib, t).y });
  return out;
}

export function bladeGeometry(rib: Rib): THREE.BufferGeometry {
  const steps = ledgesOf(rib);
  const rings: THREE.Vector3[][] = [];
  for (let k = 0; k < steps.length - 1; k++) {
    const here = steps[k] as Ledge;
    const next = steps[k + 1] as Ledge;
    rings.push(ringOf(rib, here.t, here.a, here.b));
    if (!rib.bend) rings.push(ringOf(rib, next.t, here.a, here.b));
  }
  const last = steps[steps.length - 1] as Ledge;
  rings.push(ringOf(rib, last.t, last.a, last.b));
  rings.push(ringOf(rib, last.t, 0.01, 0.01));
  return sweep(rings);
}

export function skirtGeometry(rib: Rib): THREE.BufferGeometry {
  const rings: THREE.Vector3[][] = [];
  const heights = [-14, 0, 6, 12, 18, 24, TIDE];
  for (const y of heights) {
    const t = partAtHeight(rib, y);
    const [a, b] = radii(rib, t);
    const pad = skirtPad(y);
    rings.push(ringOf(rib, t, a + pad, b + pad));
  }
  const t = partAtHeight(rib, TIDE);
  const [a, b] = radii(rib, t);
  rings.push(ringOf(rib, t, a - 8, b - 8));
  return sweep(rings);
}

const smooth = (lo: number, hi: number, v: number): number => {
  const k = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return k * k * (3 - 2 * k);
};

export function landAt(x: number, z: number): number {
  const edge = Math.min(FLOOR.south - z, z - FLOOR.north, x - FLOOR.west, FLOOR.east - x);
  const wide = Math.sin(x * 0.03 + 1.6 * Math.sin(z * 0.006) + 0.4) * Math.cos(z * 0.011 + 0.9 * Math.sin(x * 0.008));
  const fine = Math.sin(x * 0.071 + z * 0.043 + 1.1) * Math.sin(z * 0.057 - x * 0.019);
  const floor = 0.8 + 0.4 * wide + 0.14 * fine;
  return -32 + (floor + 32) * smooth(-170, 40, edge);
}

export const groundAt = (x: number, z: number): number => Math.max(landAt(x, z), POOL);

export const BUTTRESS = { x: 196, z: -500, top: 84, step: 2.1, slope: 1, cap: 10 };

export const buttressRadius = (y: number): number => BUTTRESS.cap + (BUTTRESS.top - y) * BUTTRESS.slope;
