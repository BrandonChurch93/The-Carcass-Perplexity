// The arches of the main shaft, by design and not from a picture's relief: a few massive pale bands of mineral that curve along the wall,
// each round in section, standing two to three metres out of the wall over a deep recess, sagging, never level, tapering into the wall at
// one end and broken off ragged at the other. The wall (land/wall.ts) asks this file where they are, so that it is eaten back under each
// one and dark there.
import * as THREE from 'three';
import { DEPTH, RAD, ground, lerp, rimRadius, sat, smooth } from '../land';
import { noise3, tube } from './ribs';

export type End = 'point' | 'snap';

export interface Arch {
  /** The tier it belongs to, 0 at the top. */
  tier: number;
  /** Height of its middle, metres. */
  y: number;
  /** Bearings of its two ends, degrees, `from` under `to`. */
  from: number;
  to: number;
  /** Half its height, metres. */
  thick: number;
  ends: [End, End];
  /** Metres that the `to` end hangs lower than the `from` end, and metres that the middle sags. */
  drop: number;
  sag: number;
  seed: number;
}

/** The tiers, top down. The east-south-east side came down (bearing 112, land.ts): every arch that reached it is broken off there. No two
 *  tiers break at the same bearings, and none runs level. */
export const ARCHES: Arch[] = [
  { tier: 0, y: -3.6, from: -58, to: 71, thick: 1.9, ends: ['point', 'snap'], drop: -3.4, sag: 1.6, seed: 1 },
  { tier: 0, y: -5.2, from: -162, to: -70, thick: 1.6, ends: ['point', 'point'], drop: 3.6, sag: 1.0, seed: 2 },
  { tier: 0, y: -4.6, from: 151, to: 216, thick: 1.65, ends: ['snap', 'point'], drop: 2.6, sag: 0.8, seed: 3 },
  { tier: 1, y: -12.2, from: -104, to: 30, thick: 2.15, ends: ['point', 'point'], drop: 5.2, sag: 1.8, seed: 4 },
  { tier: 1, y: -12.6, from: 22, to: 78, thick: 1.8, ends: ['point', 'snap'], drop: -3.2, sag: 0.9, seed: 5 },
  { tier: 1, y: -11.4, from: 147, to: 254, thick: 1.85, ends: ['snap', 'point'], drop: 3.6, sag: 1.4, seed: 6 },
  { tier: 2, y: -20.6, from: -132, to: -14, thick: 1.95, ends: ['point', 'point'], drop: -4.4, sag: 1.7, seed: 7 },
  { tier: 2, y: -20.2, from: -26, to: 74, thick: 2.25, ends: ['point', 'snap'], drop: 4.6, sag: 2.0, seed: 8 },
  { tier: 2, y: -19.4, from: 153, to: 228, thick: 1.85, ends: ['snap', 'point'], drop: 2.4, sag: 1.2, seed: 9 },
  { tier: 3, y: -29.6, from: -78, to: 68, thick: 2.2, ends: ['point', 'snap'], drop: 5.6, sag: 1.8, seed: 10 },
  { tier: 3, y: -28.4, from: 156, to: 278, thick: 1.95, ends: ['snap', 'point'], drop: -4.2, sag: 1.6, seed: 11 },
  { tier: 4, y: -39.0, from: -122, to: 12, thick: 2.1, ends: ['point', 'point'], drop: -4.6, sag: 1.8, seed: 12 },
  { tier: 4, y: -40.0, from: 4, to: 76, thick: 1.95, ends: ['point', 'snap'], drop: 3.4, sag: 1.0, seed: 13 },
  { tier: 4, y: -38.0, from: 150, to: 238, thick: 1.85, ends: ['snap', 'point'], drop: 2.6, sag: 1.2, seed: 14 },
  { tier: 5, y: -49.5, from: -150, to: 64, thick: 2.2, ends: ['point', 'snap'], drop: 5.0, sag: 2.2, seed: 15 },
];

// The height of the brim round the shaft, kept for every quarter of a degree: the ground is costly to ask and the wall asks it for every point.
const BRIM = new Float32Array(1441);
let brimKnown = false;
/** The height of the shelf at the brim of the shaft, at a bearing in degrees. */
export function brim(deg: number): number {
  if (!brimKnown) {
    for (let i = 0; i <= 1440; i++) {
      const b = (i / 4) * RAD;
      const r = rimRadius(b);
      BRIM[i] = ground(Math.sin(b) * r * 1.002, -Math.cos(b) * r * 1.002);
    }
    brimKnown = true;
  }
  const t = (deg - 360 * Math.floor(deg / 360)) * 4;
  const i = Math.min(1439, Math.floor(t));
  return lerp(BRIM[i] as number, BRIM[i + 1] as number, t - i);
}

/** How far the plain wall of the shaft stands from the axis at a bearing (radians) and a height. */
export function shaftRadius(b: number, y: number): number {
  const top = brim(b / RAD);
  return rimRadius(b) - 0.57 - 12 * sat((top - y) / (top + DEPTH));
}

/** Chipped mineral: broad lumps, ridges where two breaks meet, and flakes: sheets that have come off and left a step a hand high. */
function broken(x: number, y: number, z: number): number {
  const flake = 2.4 * noise3(x * 0.62 + 11, y * 1.3, z * 0.62 + 3) + 1.1 * noise3(x * 1.7, y * 2.9 + 5, z * 1.7);
  const sheet = Math.floor(flake) + smooth((flake - Math.floor(flake) - 0.78) / 0.22);
  return 0.5 * noise3(x * 0.5, y * 0.5, z * 0.5) + 0.26 * (1 - 2 * Math.abs(noise3(x * 1.3 + 7, y * 1.3, z * 1.3))) + 0.2 * sheet + 0.1 * noise3(x * 3.9, y * 3.9 + 3, z * 3.9);
}

interface Section {
  /** Metres along it, and its whole length. */
  s: number;
  length: number;
  /** How thick it is here against its full section, before its ends close: about 0.4 to 1.15. */
  run: number;
  /** How far from each end, metres. */
  near: number;
  far: number;
  /** The middle of its section: radius from the axis and height. */
  centre: number;
  y: number;
}

const lengths = new Map<Arch, number>();
function sectionAt(a: Arch, deg: number): Section {
  const u = (deg - a.from) / (a.to - a.from);
  let length = lengths.get(a);
  if (length === undefined) {
    length = (a.to - a.from) * RAD * shaftRadius(((a.from + a.to) / 2) * RAD, a.y);
    lengths.set(a, length);
  }
  const s = u * length;
  const s0 = a.seed * 7.31;
  const k0 = a.ends[0] === 'point' ? 0.4 : 1.05;
  const k1 = a.ends[1] === 'point' ? 0.4 : 1.05;
  const run = lerp(k0, k1, smooth(u)) * (1 + 0.13 * noise3(s * 0.09, s0, 1.5) + 0.06 * noise3(s * 0.31, s0, 4.5));
  const bow = Math.sin(Math.PI * sat(u));
  // The upper tiers hang under the brim and rise and fall with it; the lower ones less.
  const y = a.y + 0.75 * 0.6 ** a.tier * (brim(deg) - 0.5) + a.drop * (u - 0.5) - a.sag * bow + 0.45 * noise3(s * 0.05, s0, 9.5);
  // It stands out of the wall in its middle and runs back into it toward a point.
  const centre = shaftRadius(deg * RAD, y) + 0.4 - a.thick * (0.35 + 0.55 * bow * run) + 0.3 * noise3(s * 0.08, s0, 6.5);
  // A pointed end runs back into the rock: it does not stand free of the wall.
  const sunk = (a.ends[0] === 'point' ? 2.6 * (1 - sat(s / 10)) ** 1.6 : 0) + (a.ends[1] === 'point' ? 2.6 * (1 - sat((length - s) / 10)) ** 1.6 : 0);
  return { s, length, run, near: s, far: length - s, centre: centre + sunk, y };
}

// A point runs out over some metres. A break is a face: nearly the whole section a hand from the end, ragged by a hand or two.
const closing = (d: number, kind: End): number => (kind === 'point' ? sat(d / 7) ** 0.6 : sat(d / 0.55) ** 0.2);

/** One arch as a closed skin. `fine` is the size of a cell along it, metres. */
export function arch(a: Arch, fine: number): THREE.BufferGeometry {
  const whole = sectionAt(a, a.to).length;
  const columns = Math.max(24, Math.round(whole / fine));
  const rows = Math.max(28, Math.round((2 * Math.PI * a.thick * 1.15) / (fine * 1.25)));
  const s0 = a.seed * 7.31;
  // A broken end takes a twelfth of the columns for its last metre and a half: its face is steep and would be a few long triangles.
  const cap = Math.min(0.2, 1.5 / whole);
  const along = (t: number, kind: End): number => (kind === 'snap' ? (t < 1 / 12 ? t * 12 * cap : cap + ((t - 1 / 12) / (5 / 12)) * (0.5 - cap)) : t);
  return tube(columns, rows, (t, ang) => {
    const u = t < 0.5 ? along(t, a.ends[0]) : 1 - along(1 - t, a.ends[1]);
    const deg = lerp(a.from, a.to, u);
    const b = deg * RAD;
    const q = sectionAt(a, deg);
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    // A broken end is not cut square: it is ragged round the section.
    const end = Math.min(closing(q.near, a.ends[0]), closing(q.far, a.ends[1]));
    const k = q.run * (0.01 + 0.99 * end);
    // The section: wider than tall, its top flatter than its belly (dust and broken stone lie on it), a little square.
    const cx = Math.sign(ca) * Math.abs(ca) ** 0.8;
    const cy = Math.sign(sa) * Math.abs(sa) ** (sa > 0 ? 0.6 : 0.72);
    const wide = a.thick * 1.6 * k;
    const tall = a.thick * (sa > 0 ? 0.78 : 1.0) * k;
    const px = Math.sin(b) * (q.centre - cx * wide);
    const pz = -Math.cos(b) * (q.centre - cx * wide);
    const py = q.y + cy * tall;
    // Lobes along it, and the breaks. Nothing is pushed where it has closed to a point.
    // It is smooth: long lobes and ridges that run along it, and only here and there a flake off it. A broken end is all breaks.
    const lobe = 0.09 * noise3(q.s * 0.11 + 2 * ca, s0 + 2 * sa, 5.5) + 0.05 * (1 - 2 * Math.abs(noise3(q.s * 0.05, s0 + 2.2 * ca, 2.2 * sa)));
    const face = 1 - Math.min(1, Math.min(a.ends[0] === 'snap' ? q.near : 99, a.ends[1] === 'snap' ? q.far : 99) / 1.6);
    const rough = ((0.1 + 0.3 * face) * broken(px, py, pz) + lobe * a.thick) * Math.min(1, k * 2.2);
    const swell = 1 + rough / Math.max(0.3, a.thick);
    const rr = q.centre - cx * wide * swell;
    // The face of a break is not flat: its points stand in and out along the run by a hand or two.
    const toward = q.near < q.far ? 1 : -1;
    const b2 = b + (toward * face * (1 - end) * (0.3 + 0.5 * noise3(cx * a.thick * 0.9 + s0, cy * a.thick * 0.9, 7.7))) / q.centre;
    return {
      at: [Math.sin(b2) * rr, q.y + cy * tall * swell, -Math.cos(b2) * rr],
      uv: [q.s + s0 * 3, ang * a.thick * 1.1],
      // Its belly and the side against the wall are in its own shade, and a hollow of its own surface more than a brow.
      occ: lerp(0.38, 1, smooth(0.6 + 0.5 * sa + 0.3 * ca)) * lerp(0.7, 1.05, smooth(0.5 + 1.6 * rough)),
    };
  });
}

/** What the arches do to the wall at a bearing (degrees) and a height: `back` is how far the wall is eaten back there, 0 to 1 (the recess
 *  under an arch), `shut` how much of the sky an arch overhead takes from it, 0 to 1, and `on` how near the place is to the foot or the
 *  top of an arch, 0 to 1 (where rust and damp gather). */
export function archesOver(deg: number, y: number): { back: number; shut: number; on: number } {
  let back = 0;
  let shut = 0;
  let on = 0;
  for (const a of ARCHES) {
    // The same arch may be asked a turn on: bearings wrap.
    let d = deg;
    while (d < a.from - 8) d += 360;
    while (d > a.to + 8) d -= 360;
    if (d < a.from - 8 || y > a.y + 13 || y < a.y - 20) continue;
    const q = sectionAt(a, Math.min(a.to, Math.max(a.from, d)));
    const end = Math.min(closing(q.near + (d < a.from ? (d - a.from) * 0.5 : 0), a.ends[0]), closing(q.far + (d > a.to ? (a.to - d) * 0.5 : 0), a.ends[1])) * smooth((Math.min(d - a.from, a.to - d) + 8) / 8);
    const k = q.run * end;
    if (k <= 0.02) continue;
    const half = a.thick * k;
    const under = q.y - y;
    // The recess: deepest just under the arch, closing over three times its height.
    const recess = smooth((under + 0.3 * half) / (0.9 * half)) * (1 - smooth((under - 1.2 * half) / (3.6 * half)));
    back = Math.max(back, k * recess);
    const shade = smooth((under + 0.6 * half) / (0.8 * half)) * (1 - smooth((under - 1.5 * half) / (5.5 * half)));
    shut = Math.max(shut, Math.min(1, k * 1.15) * shade);
    on = Math.max(on, k * (1 - smooth((Math.abs(under) - 0.9 * half) / (1.2 * half))));
  }
  return { back, shut, on };
}

/** The top of the arch of a tier at a bearing (degrees), where a fallen block can lie, or null if no arch of that tier is there. */
export function archTop(deg: number, tier: number): [number, number, number] | null {
  for (const a of ARCHES) {
    if (a.tier !== tier) continue;
    let d = deg;
    while (d < a.from) d += 360;
    while (d > a.to) d -= 360;
    if (d < a.from + 4 || d > a.to - 2) continue;
    const q = sectionAt(a, d);
    const r = q.centre - 0.3 * a.thick;
    return [Math.sin(d * RAD) * r, q.y + a.thick * 0.72 * q.run, -Math.cos(d * RAD) * r];
  }
  return null;
}
