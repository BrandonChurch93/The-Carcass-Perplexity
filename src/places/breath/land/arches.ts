// The arches of the main shaft, by design and not from a picture's relief: a few massive pale bands of mineral that curve along the wall,
// each round in section, standing two to three metres out of the wall over a deep recess, sagging, never level, tapering into the wall at
// one end and broken off ragged at the other. The wall (land/wall.ts) asks this file where they are, so that it is eaten back under each
// one and dark there.
import * as THREE from 'three';
import { DEPTH, RAD, ground, lerp, rimRadius, sat, smooth } from '../land';
import { BEDS_DATA, BEDS_H, BEDS_W } from './hoopbeds';
import { noise3, tube } from './ribs';

/** The sheet of the bedded face of a hoop (land/travface.jpg) as it is laid on it: metres along and metres up, mirrored at each repeat. */
export const FACE = { wide: 6, tall: 4 };
let beds: Uint8Array | null = null;
const mirrored = (t: number): number => {
  const f = t - 2 * Math.floor(t / 2);
  return f > 1 ? 2 - f : f;
};
/** The height of the bedded face, 0 to 1, at metres along a hoop and metres over its middle: the sheet's own beds, as coarse as the mesh
 *  can hold them, so that a ledge of the mesh is a pale bed of the picture. */
function bedAt(s: number, h: number): number {
  if (!beds) {
    const raw = atob(BEDS_DATA);
    beds = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) beds[i] = raw.charCodeAt(i);
  }
  const x = mirrored(s / FACE.wide) * BEDS_W - 0.5;
  const y = (1 - mirrored(h / FACE.tall)) * BEDS_H - 0.5;
  const ix = Math.max(0, Math.min(BEDS_W - 2, Math.floor(x)));
  const iy = Math.max(0, Math.min(BEDS_H - 2, Math.floor(y)));
  const fx = sat(x - ix);
  const fy = sat(y - iy);
  const at = (i: number, j: number): number => (beds as Uint8Array)[j * BEDS_W + i] as number;
  return lerp(lerp(at(ix, iy), at(ix + 1, iy), fx), lerp(at(ix, iy + 1), at(ix + 1, iy + 1), fx), fy) / 255;
}

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
  // It keeps its full section until it is under the rock: closing to a point over five metres, its tip stood free of the wall's courses.
  const into = (d: number): number => 3.4 * a.thick * (1 - sat(d / 22)) ** 2;
  let end = Math.min(sat(s / 1.6), sat((length - s) / 1.6)) ** 0.6;
  // Once its face is a stride inside the rock nothing of it is left: beds of it stood out through the wall further on, as chips in the air.
  const sunk = into(s) + into(length - s);
  end = Math.min(end, 1 - smooth((sunk - 1.35 * a.thick) / (0.5 * a.thick)));
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

/** One arch as a closed skin. `fine` is the size of a cell along it, metres. Its section is a thick bank, not a pipe: a top that falls a
 *  little toward the shaft, a tall face that the sheet's beds step in and out, a lip that hangs, and a belly cut back under it. Bites a
 *  pace or three wide are out of the face where a piece came away. */
export function arch(a: Arch, fine: number): THREE.BufferGeometry {
  const whole = sectionAt(a, a.to).length;
  const columns = Math.max(24, Math.round(whole / fine));
  const rows = Math.max(28, Math.round((2 * Math.PI * a.thick * 1.15) / (fine * 1.25)));
  const s0 = a.seed * 7.31;
  const E = 0.6;
  return tube(columns, rows, (t, turn) => {
    const deg = lerp(a.from, a.to, t);
    const b = deg * RAD;
    const q = sectionAt(a, deg);
    // More of the rows on the side toward the shaft, which is the side that is seen.
    const ang = turn - 0.5 * Math.sin(turn);
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const end = q.end;
    const k = q.run * (0.01 + 0.99 * end);
    const cx = Math.sign(ca) * Math.abs(ca) ** E;
    const cy = Math.sign(sa) * Math.abs(sa) ** E;
    const out = sat(cx);
    const wide = a.thick * 1.12 * k;
    // The lip hangs lower than the belly behind it, by its own amount along the run.
    const lip = 0.16 + 0.2 * noise3(q.s * 0.23, s0, 3.3) + 0.12 * noise3(q.s * 0.71, s0, 8.1);
    const tall = a.thick * k * (sa > 0 ? 0.8 - 0.1 * out : 0.86 * (1 + lip * smooth(out / 0.7)) * (1 - 0.3 * smooth(-cx / 0.8)));
    // The way the skin faces here, in the section's own plane.
    const nx0 = Math.sign(ca) * Math.abs(ca) ** (2 - E) * tall;
    const ny0 = Math.sign(sa) * Math.abs(sa) ** (2 - E) * wide;
    const nl = Math.hypot(nx0, ny0) || 1;
    const nx = nx0 / nl;
    const ny = ny0 / nl;
    const h = cy * tall;
    const along = q.s + s0 * 3;
    // The beds of the sheet, on the face; a bite out of the face, with the beds bare in it; long lobes on the top and the belly.
    const faced = smooth((nx - 0.25) / 0.5);
    const bite = smooth((noise3(q.s * 0.21 + 3, s0 + h * 0.3, 1.7) + 0.5 * noise3(q.s * 0.6, s0 + h * 0.8, 6.1) - 0.3) / 0.14);
    const bed = bedAt(along, h) - 0.5;
    const lobe = 0.09 * noise3(q.s * 0.11 + 2 * ca, s0 + 2 * sa, 5.5) + 0.05 * (1 - 2 * Math.abs(noise3(q.s * 0.05, s0 + 2.2 * ca, 2.2 * sa)));
    const px = Math.sin(b) * (q.centre - cx * wide);
    const pz = -Math.cos(b) * (q.centre - cx * wide);
    const face = 1 - Math.min(1, Math.max(0, q.broke) / 1.6);
    const push = (faced * ((0.42 + 0.3 * bite) * bed - 0.42 * bite) + (0.05 + 0.14 * face) * broken(px, q.y + h, pz) + lobe * a.thick * (1 - 0.6 * faced)) * Math.min(1, k * 2.2);
    const rr = q.centre - cx * wide - nx * push;
    // The face of a break is not flat: its points stand in and out along the run by a hand or two.
    const toward = a.gap && deg > a.gap[0] ? 1 : -1;
    const b2 = b + (toward * face * (1 - end) * (0.3 + 0.5 * noise3(cx * a.thick * 0.9 + s0, cy * a.thick * 0.9, 7.7) + 0.5 * bed)) / q.centre;
    return {
      at: [Math.sin(b2) * rr, q.y + h + ny * push, -Math.cos(b2) * rr],
      // Metres along it and metres over its middle: the sheet of its face is laid by these.
      uv: [along, h],
      // Its belly and the side against the wall are in its own shade, and a recess between two beds more than a bed that stands out.
      occ: lerp(0.38, 1, smooth(0.6 + 0.5 * sa + 0.3 * ca)) * lerp(0.62, 1.06, smooth(0.5 + 1.4 * push)),
    };
  });
}

/** Each tier is carried on round the side that fell as a narrower band of the same stone, standing a stride out of the wall, from where
 *  the hoop goes under the rock at one end to where it comes out at the other: bearings of the two ends, six heights along it, a seed. */
export const BANDS: { d0: number; d1: number; y: number[]; seed: number }[] = ARCHES.map((a) => {
  const d0 = a.to - 360;
  return { d0, d1: a.from, y: [a.to - 20, a.to - 10, a.to, a.from, a.from + 10, a.from + 20].map((deg) => sectionAt(a, deg).y), seed: a.seed };
});

/** How far a band stands out of the wall at a bearing (degrees, -180 to 180) and a height, 0 to 1. The wall's shader asks the same (BAND_GLSL). */
export function bandAt(deg: number, y: number): number {
  let most = 0;
  for (const b of BANDS) {
    if (deg < b.d0 - 20 || deg > b.d1 + 20) continue;
    const h = b.y as [number, number, number, number, number, number];
    const span = b.d1 - b.d0;
    const f = sat((deg - b.d0) / span);
    const mid =
      h[0] +
      (h[1] - h[0]) * sat((deg - (b.d0 - 20)) / 10) +
      (h[2] - h[1]) * sat((deg - (b.d0 - 10)) / 10) +
      (h[3] - h[2]) * f +
      (h[4] - h[3]) * sat((deg - b.d1) / 10) +
      (h[5] - h[4]) * sat((deg - b.d1 - 10) / 10) +
      0.9 * Math.sin(Math.PI * f) * Math.sin(7 * f + b.seed);
    const held = Math.max(1 - smooth(f / 0.1), 1 - smooth((1 - f) / 0.1));
    const gate = Math.max(held, smooth((Math.sin(10 * f + 2.1 * b.seed) + 0.45 * Math.sin(27 * f + b.seed) + 1.0 + 0.3 * Math.sin(deg * 0.9 + b.seed)) / 0.2)) * smooth((deg - (b.d0 - 20)) / 10) * smooth((b.d1 + 20 - deg) / 10);
    // As thick as the hoop where it takes over from it, a third of that along the wall, its top and its underside notched every few
    // paces, and where it is broken it ends in a blunt face: thinned to a point there, each piece was a smooth lens on the wall.
    const half = (0.85 + 0.25 * Math.sin(13 * f + 1.7 * b.seed) + 0.9 * held + 0.2 * Math.sin(deg * 0.83 + 3 * b.seed) + 0.13 * Math.sin(deg * 1.9 + b.seed) * Math.sin(deg * 0.41 + 2 * b.seed)) * (0.6 + 0.4 * gate);
    const t = (y - mid - 0.22 * Math.sin(deg * 1.1 + 2 * b.seed) * Math.sin(deg * 0.29 + b.seed)) / half;
    // A shelf, not a roll: its top stands out square to a lip, and under the lip it falls back into the wall.
    if (Math.abs(t) < 1) most = Math.max(most, gate * (t > 0 ? Math.sqrt(1 - t ** 4) : 1 - t * t));
  }
  return most;
}

const glsl = (v: number): string => v.toFixed(4);
/** The same in the wall's shader. */
export const BAND_GLSL = /* glsl */ `
float bandOne(float deg, float y, float d0, float d1, float ya, float yb, float yc, float yd, float ye, float yf, float seed) {
  float f = clamp((deg - d0) / (d1 - d0), 0.0, 1.0);
  float mid = ya + (yb - ya) * clamp((deg - (d0 - 20.0)) / 10.0, 0.0, 1.0) + (yc - yb) * clamp((deg - (d0 - 10.0)) / 10.0, 0.0, 1.0) + (yd - yc) * f
    + (ye - yd) * clamp((deg - d1) / 10.0, 0.0, 1.0) + (yf - ye) * clamp((deg - d1 - 10.0) / 10.0, 0.0, 1.0) + 0.9 * sin(3.14159265 * f) * sin(7.0 * f + seed);
  float held = max(1.0 - smoothstep(0.0, 0.1, f), 1.0 - smoothstep(0.0, 0.1, 1.0 - f));
  float gate = max(held, smoothstep(0.0, 0.2, sin(10.0 * f + 2.1 * seed) + 0.45 * sin(27.0 * f + seed) + 1.0 + 0.3 * sin(deg * 0.9 + seed))) * smoothstep(d0 - 20.0, d0 - 10.0, deg) * smoothstep(d1 + 20.0, d1 + 10.0, deg);
  float halfTall = (0.85 + 0.25 * sin(13.0 * f + 1.7 * seed) + 0.9 * held + 0.2 * sin(deg * 0.83 + 3.0 * seed) + 0.13 * sin(deg * 1.9 + seed) * sin(deg * 0.41 + 2.0 * seed)) * (0.6 + 0.4 * gate);
  float t = (y - mid - 0.22 * sin(deg * 1.1 + 2.0 * seed) * sin(deg * 0.29 + seed)) / halfTall;
  float tt = t * t;
  return gate * (t > 0.0 ? sqrt(max(0.0, 1.0 - tt * tt)) : max(0.0, 1.0 - tt));
}
float bandOn(float deg, float y) {
  float most = 0.0;
${BANDS.map((b) => `  most = max(most, bandOne(deg, y, ${glsl(b.d0)}, ${glsl(b.d1)}, ${b.y.map(glsl).join(', ')}, ${glsl(b.seed)}));`).join('\n')}
  return most;
}`;

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
    // No recess where it turns into the wall: eaten back there, the wall left its end standing free in the air. It opens only where the
    // arch is whole: begun where the arch goes under the rock, its end wall stood as a pale upright sliver below the arch's end.
    back = Math.max(back, k * recess * smooth((Math.min(q.near, q.far) - 8) / 10));
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
    if (d < a.from + 28 || d > a.to - 28) continue;
    const q = sectionAt(a, d);
    if (q.end < 0.9) continue;
    // The middle of its top, a little toward the shaft from where the wall meets it.
    const r = q.centre - 0.3 * a.thick;
    return [Math.sin(d * RAD) * r, q.y + a.thick * 0.77 * q.run, -Math.cos(d * RAD) * r];
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
