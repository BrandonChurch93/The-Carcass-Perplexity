// The arches of the main shaft, by design and not from a picture's relief: a few massive pale bands of mineral that curve along the wall,
// each round in section, standing two to three metres out of the wall over a deep recess, sagging, never level, tapering into the wall at
// one end and broken off ragged at the other. The wall (land/wall.ts) asks this file where they are, so that it is eaten back under each
// one and dark there.
import * as THREE from 'three';
import { DEPTH, RAD, ground, lerp, rimRadius, sat, smooth } from '../land';
import { noise3, tube } from './ribs';

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
  /** Metres that the `to` end hangs lower than the `from` end, and metres that the middle sags. */
  drop: number;
  sag: number;
  seed: number;
  /** How it wavers round the shaft: metres, how many times round, where it begins (radians). */
  wave: [number, number, number];
  /** Where it is broken through: the bearing of the middle of the break and half its width, degrees. */
  gap?: [number, number];
}

/** The tiers, top down: each a hoop that goes round the whole shaft from one side of the fall to the other (the east-south-east side
 *  came down, bearing 112, land.ts) and turns into the rock there. None runs level: each is tilted and wavers its own way, and three of
 *  them are broken through at one place. Laid as fifteen shorter arches, each with two ends in sight, they read as loaves on a wall. */
export const ARCHES: Arch[] = [
  { tier: 0, y: -4.4, from: 150, to: 431, thick: 2.25, drop: 1.6, sag: 0.6, seed: 1, wave: [1.3, 3, 0.4], gap: [318, 5] },
  { tier: 1, y: -12.6, from: 147, to: 434, thick: 2.6, drop: -3.0, sag: 1.2, seed: 4, wave: [1.9, 2, 2.1] },
  { tier: 2, y: -20.6, from: 152, to: 430, thick: 2.45, drop: 3.4, sag: 0.8, seed: 7, wave: [1.6, 3, 4.0], gap: [226, 4] },
  { tier: 3, y: -29.4, from: 149, to: 433, thick: 2.65, drop: -2.4, sag: 1.4, seed: 10, wave: [2.0, 2, 5.2] },
  { tier: 4, y: -38.6, from: 151, to: 429, thick: 2.5, drop: 2.8, sag: 1.0, seed: 12, wave: [1.7, 3, 1.3], gap: [372, 5] },
  { tier: 5, y: -49.5, from: 148, to: 432, thick: 2.65, drop: -2.0, sag: 1.6, seed: 15, wave: [1.5, 2, 3.3] },
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
  /** How much of its section is left here: 1 along it, 0 where it has closed (at its two ends, inside the rock, and in a break). */
  end: number;
  /** Metres to the nearer face of its break, if it has one: 99 otherwise. */
  broke: number;
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
  const run = (1 + 0.13 * noise3(s * 0.09, s0, 1.5) + 0.06 * noise3(s * 0.31, s0, 4.5));
  const bow = Math.sin(Math.PI * sat(u));
  // The upper tiers hang under the brim and rise and fall with it; the lower ones less.
  const y = a.y + 0.75 * 0.6 ** a.tier * (brim(deg) - 0.5) + a.drop * (u - 0.5) - a.sag * bow + a.wave[0] * Math.sin(a.wave[1] * deg * RAD + a.wave[2]) + 0.45 * noise3(s * 0.05, s0, 9.5);
  // It stands out of the wall in its middle and runs back into it toward a point.
  const centre = shaftRadius(deg * RAD, y) + 0.3 - a.thick * (0.08 + 0.3 * bow * run) + 0.3 * noise3(s * 0.08, s0, 6.5);
  // It turns into the wall at its full section, as a rib does into a spine, and what closes it is inside the rock: an end that stood
  // free was the end of a loaf, and cut square the end of a plank.
  // It goes in over forty metres of its run, slowly: gone in within three, where it met the wall was a blunt end.
  const into = (d: number): number => 2.3 * a.thick * (1 - sat(d / 40)) ** 2;
  let end = Math.min(sat(s / 5), sat((length - s) / 5)) ** 0.6;
  let broke = 99;
  let lost = 0;
  if (a.gap) {
    broke = ((Math.abs(deg - a.gap[0]) - a.gap[1]) * length) / (a.to - a.from);
    // A break is a blunt chipped face a stride deep; between its two faces nothing is left, and the thread of skin that joins them is
    // deep in the rock.
    end = Math.min(end, broke <= 0 ? 0 : Math.sqrt(1 - (1 - sat(broke / 1.7)) ** 2));
    lost = broke < 0 ? 7 * smooth(-broke / 0.8) : 0;
  }
  return { s, length, run, near: s, far: length - s, centre: centre + into(s) + into(length - s) + lost, y, end, broke };
}

/** One arch as a closed skin. `fine` is the size of a cell along it, metres. */
export function arch(a: Arch, fine: number): THREE.BufferGeometry {
  const whole = sectionAt(a, a.to).length;
  const columns = Math.max(24, Math.round(whole / fine));
  const rows = Math.max(28, Math.round((2 * Math.PI * a.thick * 1.15) / (fine * 1.25)));
  const s0 = a.seed * 7.31;
  return tube(columns, rows, (t, ang) => {
    const deg = lerp(a.from, a.to, t);
    const b = deg * RAD;
    const q = sectionAt(a, deg);
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    // A broken end is not cut square: it is ragged round the section.
    const end = q.end;
    const k = q.run * (0.01 + 0.99 * end);
    // The section: round, a little wider than tall. Wide and flat on top it read as a plank laid on the wall.
    const cx = Math.sign(ca) * Math.abs(ca) ** 0.92;
    const cy = Math.sign(sa) * Math.abs(sa) ** 0.92;
    const wide = a.thick * 1.12 * k;
    const tall = a.thick * (sa > 0 ? 0.94 : 1.0) * k;
    const px = Math.sin(b) * (q.centre - cx * wide);
    const pz = -Math.cos(b) * (q.centre - cx * wide);
    const py = q.y + cy * tall;
    // Lobes along it, and the breaks. Nothing is pushed where it has closed to a point.
    // It is smooth: long lobes and ridges that run along it, and only here and there a flake off it. A broken end is all breaks.
    const lobe = 0.09 * noise3(q.s * 0.11 + 2 * ca, s0 + 2 * sa, 5.5) + 0.05 * (1 - 2 * Math.abs(noise3(q.s * 0.05, s0 + 2.2 * ca, 2.2 * sa)));
    const face = 1 - Math.min(1, Math.max(0, q.broke) / 1.6);
    const rough = ((0.1 + 0.16 * face) * broken(px, py, pz) + lobe * a.thick) * Math.min(1, k * 2.2);
    const swell = 1 + rough / Math.max(0.3, a.thick);
    const rr = q.centre - cx * wide * swell;
    // The face of a break is not flat: its points stand in and out along the run by a hand or two.
    const toward = a.gap && deg > a.gap[0] ? 1 : -1;
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
    const k = q.run * q.end * smooth((Math.min(q.near, q.far) - 3) / 10);
    if (k <= 0.02) continue;
    const half = a.thick * k;
    const under = q.y - y;
    // The recess: deepest just under the arch, closing over three times its height.
    const recess = smooth((under + 0.3 * half) / (0.9 * half)) * (1 - smooth((under - 1.2 * half) / (3.6 * half)));
    // No recess where it turns into the wall: eaten back there, the wall left its end standing free in the air.
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
    if (d < a.from + 12 || d > a.to - 12) continue;
    const q = sectionAt(a, d);
    if (q.end < 0.9) continue;
    const r = q.centre - 0.3 * a.thick;
    return [Math.sin(d * RAD) * r, q.y + a.thick * 0.9 * q.run, -Math.cos(d * RAD) * r];
  }
  return null;
}

/** The cap of the rim: the thick pale crust the shelf ends in, all round the shaft but where the east-south-east side fell. It lies on the
 *  shelf for a stride, hangs over the wall by one to two metres and droops in lobes, as flowstone does. One closed skin. */
export function cap(fine: number): THREE.BufferGeometry {
  // Not along the south and west lip, where three lenses stand on it: there the shelf's own crust is the rim. Tried there: laid a stride
  // back and raised it was a blank dome under the lens, as hanging plates alone a pale ribbon along the bottom of the frame, and at the
  // west lens its top, seen along itself from two strides, was a dark plate with a knife edge.
  const from = 283;
  const to = 436;
  const back = 1.1;
  const columns = Math.round(((to - from) * RAD * 30) / fine);
  return tube(columns, 22, (t, ang) => {
    const deg = lerp(from, to, t);
    const b = deg * RAD;
    const arc = b * 30;
    const end = sat(Math.min(deg - from, to - deg) / 9) ** 0.7;
    const rim = rimRadius(b);
    // How far it hangs over, and how thick it droops: lobes a pace to a few metres wide, never even.
    const lobe = 1 - Math.abs(noise3(arc * 0.33, 3.3, 9.1));
    // It is a crust, and broken: plates a pace to four long, each standing out over the shaft by its own amount, some of them fallen,
    // with a crack between every two. As one even skin it was a lip of putty.
    const along = arc * 0.42 + 1.1 * noise3(arc * 0.21, 4.4, 7.7);
    const plate = Math.floor(along);
    const inPlate = along - plate;
    const dice = (n: number): number => {
      const h = Math.sin(plate * 127.1 + n * 311.7) * 43758.5453;
      return h - Math.floor(h);
    };
    const crack = smooth(Math.min(inPlate, 1 - inPlate) / 0.07);
    const fallen = dice(1) < 0.22 ? 0.12 : 1;
    // No plate stands out further than it is thick and half again: a thin one a stride out was a knife edge from the low lens.
    const over = (0.3 + 0.75 * dice(2) + 0.25 * lobe * lobe) * fallen * (0.3 + 0.7 * crack) * end;
    const droop = (0.55 + 0.5 * dice(3) + 0.5 * lobe ** 3 * dice(4)) * (0.5 + 0.5 * fallen) * (0.45 + 0.55 * crack) * end;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const across = 0.5 + 0.5 * Math.sign(ca) * Math.abs(ca) ** 0.8;
    const r = rim + back * end - across * (back * end + over);
    const x = Math.sin(b) * r;
    const z = -Math.cos(b) * r;
    // On the shelf it follows the rock; past the brim it keeps the brim's height and sags a little to its lip.
    const out = sat((r - rim) / back);
    const hung = sat((rim - r) / Math.max(over, 0.2));
    const top = lerp(brim(deg), ground(x, z), smooth(out)) + (0.1 * smooth(1 - out) - 0.04) * end - 0.22 * hung * hung;
    // Its underside: thickest a little back from the lip, running back up to the wall behind it.
    const body = smooth(across / 0.45) * (1 - 0.35 * smooth((across - 0.8) / 0.2));
    const chip = 0.2 * broken(x * 1.6, top * 1.6, z * 1.6) * end * smooth(across / 0.3);
    const y = sa > 0 ? top + 0.5 * chip * sa : top - (0.06 + droop * body) * Math.abs(sa) ** 0.7 - chip;
    return {
      at: [x + Math.sin(b) * -chip * 0.6 * hung, y, z + Math.cos(b) * chip * 0.6 * hung],
      uv: [arc + 40, ang * 1.6 + 7],
      occ: lerp(0.4, 1, smooth(0.62 + 0.55 * sa + 0.2 * ca)) * lerp(0.75, 1.05, smooth(0.5 + 3 * chip)),
    };
  });
}
