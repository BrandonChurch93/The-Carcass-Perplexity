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
}

export const TIDE = 30;
export const POOL = 1.15;
export const SEA = 0;
export const FLOOR = { south: 330, north: -3100, west: -640, east: 820 };

const LEFT = 0;
const RIGHT = Math.PI;

export const RIBS: Rib[] = [
  { name: 'L1', x: -330, z: 0, yaw: LEFT, height: 430, lean: 190, a: 120, b: 95, flare: 20, flareTop: 120 },
  { name: 'R1', x: 425, z: -559, yaw: RIGHT, height: 520, lean: 290, a: 160, b: 95, flare: 70, flareTop: 150 },
  { name: 'L2', x: -390, z: -850, yaw: LEFT + 0.15, height: 370, lean: 115, a: 80, b: 60, flare: 30, flareTop: 60 },
  { name: 'R2', x: 393, z: -1054, yaw: RIGHT - 0.1, height: 405, lean: 277, a: 130, b: 70, flare: 50, flareTop: 50 },
  { name: 'L3', x: -434, z: -1348, yaw: LEFT, height: 473, lean: 410, a: 50, b: 42, flare: 30, flareTop: 60, bend: [100, 740, 410, 350] },
  { name: 'R3', x: 280, z: -1545, yaw: RIGHT, height: 340, lean: 160, a: 60, b: 48, flare: 25, flareTop: 50 },
  { name: 'S', x: -80, z: -1500, yaw: LEFT, height: 420, lean: 150, a: 75, b: 62, flare: 20, flareTop: 60, cut: 135 },
  { name: 'L4', x: -295, z: -2068, yaw: LEFT - 0.1, height: 300, lean: 150, a: 70, b: 50 },
  { name: 'R4', x: 222, z: -2061, yaw: RIGHT + 0.1, height: 310, lean: 140, a: 70, b: 50 },
  { name: 'L5', x: -330, z: -2620, yaw: LEFT, height: 290, lean: 130, a: 65, b: 50 },
  { name: 'R5', x: 270, z: -2700, yaw: RIGHT, height: 280, lean: 130, a: 65, b: 50 },
  { name: 'OL', x: -560, z: 780, yaw: LEFT + 0.2, height: 410, lean: 180, a: 95, b: 70, flare: 20, flareTop: 60 },
  { name: 'OR', x: 620, z: 560, yaw: RIGHT - 0.2, height: 470, lean: 240, a: 115, b: 80, flare: 20, flareTop: 60 },
];

export const ribByName = (name: string): Rib => {
  const rib = RIBS.find((r) => r.name === name);
  if (!rib) throw new Error(`No rib named ${name}`);
  return rib;
};

function control(rib: Rib): [number, number, number, number] {
  return rib.bend ?? [0.3 * rib.lean, 0.85 * rib.height, rib.lean, rib.height];
}

function centre(rib: Rib, t: number): { u: number; y: number; nu: number; ny: number } {
  const [u1, y1, u2, y2] = control(rib);
  const k = 2 * (1 - t) * t;
  const u = k * u1 + t * t * u2;
  const y = k * y1 + t * t * y2;
  const du = 2 * (1 - 2 * t) * u1 + 2 * t * u2;
  const dy = 2 * (1 - 2 * t) * y1 + 2 * t * y2;
  const l = Math.hypot(du, dy) || 1;
  return { u, y, nu: dy / l, ny: -du / l };
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
  return [rib.a * (1 - 0.9 * Math.pow(t, 1.4)) + flare, rib.b * (1 - 0.85 * t) + flare];
}

export function skirtPad(y: number): number {
  const k = Math.min(1, Math.max(0, 1 - y / TIDE));
  return 4 + 10 * k * k;
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
  const floor = 1.16 + 0.4 * wide + 0.14 * fine;
  return -32 + (floor + 32) * smooth(-170, 40, edge);
}

export const groundAt = (x: number, z: number): number => Math.max(landAt(x, z), POOL);

export const BUTTRESS = { x: 270, z: -520, top: 84, step: 2.1, slope: 1.25, cap: 10 };

export const buttressRadius = (y: number): number => BUTTRESS.cap + (BUTTRESS.top - y) * BUTTRESS.slope;
