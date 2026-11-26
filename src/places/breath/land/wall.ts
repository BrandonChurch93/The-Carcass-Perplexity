// The wall of the main shaft with its ribs, built from one plate: the picture of a wall of this kind seen face on (mat/shaftwall.jpg, 60 m
// by 33.75 m) and the relief made from it. The relief is the shape: the wall is a dense mesh pushed toward the axis by it, so a rib stands
// metres out of the wall, has a top that catches the sky, a face, and a shut underside, and its silhouette is true from any lens. The picture
// is the colour, laid on the same mesh, so the rust sits on the rib it was painted on and the dark runs sit in the wall's folds.
// The plate goes round the shaft turn and turn about (each repeat the mirror of the last); the one join that cannot mirror is at bearing 190,
// under the south rim, where no lens of the place looks. The cells that stand out as ribs are the part `hoops`; the rest is `shaft`.
import * as THREE from 'three';
import { DEPTH, RAD, ground, lerp, rimRadius, sat, smooth } from '../land';
import { noise3 } from './ribs';
import { WALL_HEIGHT, WALL_METRES, WALL_OPEN, WALL_REACH, WALL_RELIEF, WALL_WIDTH } from './wallplate';

const relief = Uint8Array.from(atob(WALL_RELIEF), (c) => c.charCodeAt(0));
const opens = Uint8Array.from(atob(WALL_OPEN), (c) => c.charCodeAt(0));
/** Metres the plate is tall. */
export const WALL_TALL = (WALL_METRES * WALL_HEIGHT) / WALL_WIDTH;
/** The bearing, degrees, of the left edge of the first repeat: the middle of that repeat faces the lenses of the rim. */
const START = -47;
/** The join, degrees. */
const JOIN = 190;
/** The relief at which the wall stands where the plain shaft would: lower is eaten back, higher stands out. */
const LEVEL = 0.36;
/** Metres of the top of the plate that are not used. */
const SKIP = 3.2;
/** Over this the relief is a rib. */
const RIB = 0.6;

const mirror = (t: number): number => {
  const m = t - 2 * Math.floor(t / 2);
  return m > 1 ? 2 - m : m;
};
const read = (grid: Uint8Array, u: number, v: number): number => {
  const fx = Math.min(WALL_WIDTH - 1.001, Math.max(0, mirror(u) * WALL_WIDTH - 0.5));
  const fy = Math.min(WALL_HEIGHT - 1.001, Math.max(0, mirror(v) * WALL_HEIGHT - 0.5));
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const a = fx - i;
  const b = fy - j;
  const k = j * WALL_WIDTH + i;
  return (((grid[k] as number) * (1 - a) + (grid[k + 1] as number) * a) * (1 - b) + ((grid[k + WALL_WIDTH] as number) * (1 - a) + (grid[k + WALL_WIDTH + 1] as number) * a) * b) / 255;
};

export interface WallPoint {
  at: [number, number, number];
  /** Where it is on the plate, in repeats: across, and down from the brim. */
  u: number;
  v: number;
  /** The relief there, 0 to 1, and how much of the sky overhead the place sees. */
  relief: number;
  open: number;
}

/** The point of the wall at a bearing (radians) and a depth under the brim (metres). */
export function wallPoint(b: number, depth: number): WallPoint {
  // The bearing as degrees from the join round to the join.
  let deg = b / RAD;
  deg -= 360 * Math.floor((deg - (JOIN - 360)) / 360);
  const r0 = rimRadius(b);
  const top = ground(Math.sin(b) * r0 * 1.002, -Math.cos(b) * r0 * 1.002) + 0.02;
  const u = ((deg - START) * RAD * 30) / WALL_METRES;
  // The ribs do not run level round the shaft: each side of every mirror line hangs its own way.
  const hang = smooth(depth / 7) * (1.7 * noise3(deg * 0.031, 4.4, 1.2) + 0.7 * noise3(deg * 0.09, 9.1, 3.3));
  // The plate is read from a little way down it: its own top is dark dripping wall over its first rib, and at the brim that stood as a
  // row of teeth. So the first rib of the plate is the lip of the shaft, or just under it.
  const v = (Math.max(0, depth + hang) + SKIP) / WALL_TALL;
  let h = read(relief, u, v);
  // The plate's ribs are thin and its wall between them is fluted in narrow upright folds: built so, the shaft was a quarry of neat
  // benches over organ pipes. Two things are done to the relief before it is the shape. A rib is made thick: it takes in what stands
  // out within most of a metre above and below it, so it is a heavy rounded band that overhangs. And the wall between the ribs is
  // read broadly along the shaft, so its folds are a few wide hollows and not many pipes.
  const dv = 0.75 / WALL_TALL;
  const band = Math.max(h, 0.94 * Math.max(read(relief, u, v - dv), read(relief, u, v + dv)), 0.82 * Math.max(read(relief, u, v - 2 * dv), read(relief, u, v + 2 * dv)));
  const du = 1.1 / WALL_METRES;
  const broad = (h + read(relief, u - du, v) + read(relief, u + du, v) + read(relief, u - 2.3 * du, v) + read(relief, u + 2.3 * du, v)) / 5;
  h = lerp(broad, band, smooth((band - 0.42) / 0.16));
  const open = read(opens, u, v);
  // At the join the relief goes back to the plain wall, so the two edges meet.
  const join = smooth(Math.min(deg - (JOIN - 360), JOIN - deg) / 5);
  // Where the east-south-east side came down the ribs went with it: they end ragged either side of the fall.
  const torn = smooth((36 - Math.abs(deg - 112) + 5 * noise3(deg * 0.2, depth * 0.3, 7.7)) / 12);
  h = lerp(LEVEL, h, join);
  const stand = (h - LEVEL) * WALL_REACH * (h > LEVEL ? (1 - 0.85 * torn) * (1 + 0.35 * smooth((h - RIB) / 0.25)) : 1);
  const y = top - depth;
  const down = sat(depth / (top + DEPTH));
  const meet = smooth(depth / 0.9);
  const r = r0 + 0.03 - meet * 0.6 - 12 * down - stand * meet;
  // A rib is a ledge: what stands out is lifted a little, so its top lies nearly level and its underside is cut back.
  const lift = 0.13 * Math.max(0, stand) * meet;
  return { at: [Math.sin(b) * r, y + lift, -Math.cos(b) * r], u, v, relief: h, open: lerp(1, open, join) };
}

/** The top of the nth rib down from the brim at a bearing (degrees): where a fallen block can lie. */
export function ledge(bearing: number, nth: number): [number, number, number] {
  const b = bearing * RAD;
  let seen = -1;
  let was = true;
  for (let depth = 0.5; depth < 60; depth += 0.2) {
    const q = wallPoint(b, depth);
    const is = q.relief > RIB + 0.08;
    if (is && !was) {
      seen += 1;
      if (seen === nth) {
        const r = Math.hypot(q.at[0], q.at[2]) + 1.3;
        return [Math.sin(b) * r, q.at[1], -Math.cos(b) * r];
      }
    }
    was = is;
  }
  const q = wallPoint(b, 20 + nth * 6);
  return q.at;
}

/** The wall as two meshes that share every point: the ribs, and the wall between them. */
export function buildWall(): { ribs: THREE.BufferGeometry; wall: THREE.BufferGeometry } {
  const columns = 1056;
  // 17.5 cm rows for the 42 m a lens can see into; coarser below, in the mist.
  const fineRows = 240;
  const rows = fineRows + 40;
  const count = (columns + 1) * (rows + 1);
  const position = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const occ = new Float32Array(count);
  const rib = new Uint8Array(count);
  for (let j = 0; j <= rows; j++) {
    const depth = j <= fineRows ? j * 0.175 : 42 + ((j - fineRows) / 40) * (DEPTH - 42 + 2);
    for (let i = 0; i <= columns; i++) {
      const b = (JOIN - 360 + (i / columns) * 360) * RAD;
      const q = wallPoint(b, depth);
      const k = j * (columns + 1) + i;
      position.set(q.at, k * 3);
      uv[k * 2] = q.u;
      uv[k * 2 + 1] = 1 - q.v;
      occ[k] = q.open;
      rib[k] = q.relief > RIB ? 1 : 0;
    }
  }
  const all: number[] = [];
  const ribsIndex: number[] = [];
  const wallIndex: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * (columns + 1) + i;
      const c = a + columns + 1;
      // Seen from inside the shaft.
      const quad = [a, c, a + 1, a + 1, c, c + 1];
      all.push(...quad);
      ((rib[a] as number) + (rib[a + 1] as number) + (rib[c] as number) + (rib[c + 1] as number) >= 2 ? ribsIndex : wallIndex).push(...quad);
    }
  }
  const whole = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(position, 3);
  whole.setAttribute('position', positions);
  whole.setIndex(new THREE.BufferAttribute(new Uint32Array(all), 1));
  whole.computeVertexNormals();
  const normals = whole.getAttribute('normal') as THREE.BufferAttribute;
  whole.setIndex(null);
  const uvs = new THREE.BufferAttribute(uv, 2);
  const occs = new THREE.BufferAttribute(occ, 1);
  const part = (index: number[]): THREE.BufferGeometry => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', positions);
    g.setAttribute('normal', normals);
    g.setAttribute('uv', uvs);
    g.setAttribute('occ', occs);
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(index), 1));
    g.computeBoundingSphere();
    return g;
  };
  return { ribs: part(ribsIndex), wall: part(wallIndex) };
}
