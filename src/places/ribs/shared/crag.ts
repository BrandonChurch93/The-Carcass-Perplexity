// The colony's rock is a crag, not a cone: three buttresses with gullies between them, cliffs of some twenty metres that stand on
// sloping benches, and on the cliffs a few narrow ledges that slope, pinch out and come back. No line runs round it. Both owners read
// this: the land builds the rock from `cragRadius`, and what nests on it stands where `cragPerch` says.
import { noise3, smooth } from '../land/noise';
import { BUTTRESS, TIDE } from '../layout';

/** A bench every BENCH metres up; the mesh's rows are ROW apart. (BAND, LIP and MEAN are the old coursed cliff's, kept for the lines below.) */
export const CRAG = { band: 6.3, bench: 21, lip: 0.84, mean: 7, row: 0.3 };

/** 1 on the crest of a buttress, 0 in the bed of a gully. The buttresses lean a little as they rise. */
const lobe = (angle: number, y: number): number => {
  const a = angle + 0.004 * (y - 50);
  return 0.5 + 0.5 * Math.cos(3 * a + 0.9 * Math.sin(2 * a + 1.3) + 0.6);
};

/** The rock stands in columns some six metres wide, split by upright joints: `[which column, how far across it (0 to 1)]`. */
const column = (angle: number): [number, number] => {
  const way = angle * 7 + 0.3 * Math.sin(angle * 19);
  const cell = Math.floor(way);
  return [cell - 44 * Math.floor(cell / 44), way - cell];
};

/** How far the ledge lines are lifted at an angle: they climb and fall round the rock, and step at every joint. */
export const cragPhase = (angle: number): number => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const [cell, across] = column(angle);
  const jump = 4.4 * (noise3(cell * 3.1 + 0.5, 0.5, 0.5) - 0.5);
  const tilt = 2.2 * (noise3(cell * 1.7 + 0.5, 5.5, 2.5) - 0.5) * (across - 0.5);
  // No ledge line runs straight for more than a few strides: it steps at every break in the rock and wanders between them.
  const run = angle * 45;
  const piece = Math.floor(run / 2.7 + 0.4 * noise3(run / 9, 1.5, 7.5));
  const stepped = 0.9 * (noise3(piece * 2.9 + 0.5, 6.5, 3.5) - 0.5);
  const wander = 0.7 * (noise3(run / 1.6, 4.5, 9.5) - 0.5);
  return 10 * noise3(c * 1.9 + 3.1, s * 1.9, 0.5) + jump + tilt + stepped + wander;
};

const benchPhase = (angle: number): number => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return 26 * noise3(c * 1.3 + 9, s * 1.3, 2.5) + 6 * noise3(column(angle)[0] * 2.3 + 0.5, 7.5, 1.5);
};

/** The width of ledge `k` at an angle, metres: it pinches out to nothing over a third of its length. */
export const ledgeWidth = (angle: number, k: number): number => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // Its lip is crumbled: bitten back and standing out by turns, every stride or two.
  const crumble = 0.55 + 0.9 * noise3(angle * 45 / 1.9, k * 2.3 + 0.5, 1.5);
  return 2.6 * smooth(0.36, 0.58, noise3(c * 6.1 + k * 3.7, s * 6.1, k * 1.3 + 0.5)) * crumble;
};

/** One of the crag's blocks at a place on its face: the height of its middle, how far it stands out, and how near its edge the place is. */
type Block = { middle: number; proud: number; edge: number };

const hash = (i: number, j: number, k: number): number => {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/**
 * The face is built in courses, as bedded rock is: each course `high` metres tall and dipping a few degrees round the rock, cut by
 * upright joints into blocks of unlike width, each course shifted along from the one under it. A block's top is level along its
 * course, so it is a ledge and not a stair; no upright joint runs on through two courses.
 */
const blockAt = (angle: number, y: number, wide: number, high: number, seed: number): Block => {
  const columns = Math.max(3, Math.round((Math.PI * 2 * 45) / wide));
  const turn = angle / (Math.PI * 2);
  const u = (turn - Math.floor(turn)) * columns;
  // The beds are not level: they dip and climb round the rock, a few degrees, each size of block its own way.
  const lean = 6 * noise3(Math.cos(angle) * 2.6 + seed, Math.sin(angle) * 2.6, 0.5) + 1.6 * noise3(angle * 9 + seed, 3.5, 1.5);
  // And they are faulted: every few strides round the rock the courses step up or down by a part of their height.
  const fault = Math.floor(u * 0.7 + 0.3 * Math.sin(angle * 23 + seed));
  const v = (y + lean) / high + 0.5 * hash(fault, 3, seed);
  const j = Math.floor(v);
  const along = u + 0.5 * hash(j, 7, seed);
  const wrap = (i: number): number => ((i % columns) + columns) % columns;
  // The joint on the left of block i of this course: thrown off its place by up to a third of a block.
  const jointAt = (i: number): number => i + 0.66 * (hash(wrap(i), j, seed) - 0.5) + 0.5 * (hash(wrap(i), j, seed + 5) - 0.5) * (v - j - 0.5);
  let i = Math.floor(along);
  if (along < jointAt(i)) i -= 1;
  else if (along >= jointAt(i + 1)) i += 1;
  const left = jointAt(i);
  const right = jointAt(i + 1);
  // No face stands square to the wall: each block is turned a little, and one in five is fallen out or stands far proud.
  const h3 = hash(wrap(i), j, seed + 3) - 0.5;
  const turned = 0.7 * (hash(wrap(i), j, seed + 4) - 0.5) * ((along - left) / Math.max(0.2, right - left) - 0.5);
  const proud = h3 * (Math.abs(h3) > 0.4 ? 1.7 : 1) + turned;
  const edge = Math.min(along - left, right - along, (Math.min(v - j, j + 1 - v) * high) / wide);
  return { middle: (j + 0.5) * high - lean, proud, edge: Math.max(0, edge) };
};

/** The crag without its blocks: the cone, its buttresses and gullies, its benches and its standing columns. */
const cragBody = (angle: number, y: number): number => {
  const { top, cap, slope } = BUTTRESS;
  const over = Math.max(0, y - top);
  const base = y < top ? cap + (top - y) * slope : cap * Math.max(0, 1 - over / 3);
  // The broad shape comes in above the weed and goes out at the summit.
  const fade = smooth(TIDE - 6, TIDE + 12, y) * smooth(top + 1, top - 14, y);
  const butt = 8 * (Math.pow(lobe(angle, y), 0.8) - 0.6);
  const tb = (y + benchPhase(angle)) / CRAG.bench;
  const fb = tb - Math.floor(tb);
  const bench = 5 * (fb < 0.8 ? fb / 0.8 : (1 - fb) / 0.2) - 2.5;
  // Each column stands out of the cliff or back in it.
  const [cell0, across0] = column(angle);
  const pillar = 2.4 * (noise3(cell0 * 4.7 + 0.5, 2.5, 6.5) - 0.5) - 0.5 * (1 - smooth(0, 0.08, Math.min(across0, 1 - across0)));
  return base + fade * (butt + bench + pillar);
};

/**
 * The radius of the crag at an angle round its axis and a height, metres. The rock is built of blocks of three sizes, each with an
 * upright face and a top that is a ledge: the body's slope is taken at the middle of the block a place lies in, not at the place.
 */
export function cragRadius(angle: number, y: number): number {
  const { top, cap } = BUTTRESS;
  if (y > top - 1 || y < TIDE - 4) return Math.max(0.01, cragBody(angle, y));
  const big = blockAt(angle, y, 11, 7.5, 11);
  const mid = blockAt(angle, y, 4.2, 2.8, 23);
  const small = blockAt(angle, y, 1.9, 1.3, 37);
  // How much of a block the rock is here: all of it on the cliff, none at the summit and in the weed.
  const cut = smooth(top - 1, top - 9, y) * smooth(TIDE - 4, TIDE + 5, y);
  const at = y + cut * (0.55 * (big.middle - y) + 0.3 * (mid.middle - y) + 0.15 * (small.middle - y));
  const body = cragBody(angle, at);
  const stand = 1.5 * big.proud + 0.9 * mid.proud + 0.35 * small.proud;
  // The joints between blocks are worn back a hand.
  const joint = 0.3 * (1 - smooth(0, 0.07, big.edge)) + 0.2 * (1 - smooth(0, 0.1, mid.edge)) + 0.1 * (1 - smooth(0, 0.12, small.edge));
  return Math.max(0.01, body + cut * (stand - joint) * Math.min(1, body / cap));
}

/**
 * A standing place on the crag: the top of the block nearest `height` at `angle` that is deep enough to stand on. `across` runs from
 * 0, the outer lip, to 1, against the face behind. Gives the radius from the axis and the height of the rock there, on the mesh's own
 * rows (CRAG.row apart), so that what stands there stands on what is drawn.
 */
export function cragPerch(angle: number, height: number, across: number): [number, number] {
  const row = CRAG.row;
  const j0 = Math.round(height / row);
  let found = j0;
  let depth = 0;
  for (let o = 0; o < 28; o++) {
    for (const j of o === 0 ? [j0] : [j0 + o, j0 - o]) {
      const y = j * row;
      if (y < TIDE + 2 || y > BUTTRESS.top - 2) continue;
      const d = cragRadius(angle, y) - cragRadius(angle, y + row);
      if (d > 0.9) {
        found = j;
        depth = d;
        break;
      }
      if (d > depth) {
        found = j;
        depth = d;
      }
    }
    if (depth > 0.9) break;
  }
  const outer = cragRadius(angle, found * row);
  const inner = cragRadius(angle, (found + 1) * row);
  const deep = Math.max(0.05, outer - inner);
  const back = Math.min(deep, 0.2 + Math.min(1, Math.max(0, across)) * Math.max(0, deep - 0.5));
  return [outer - back, found * row + (row * back) / deep];
}
