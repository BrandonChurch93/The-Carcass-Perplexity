// The colony's rock is a crag, not a cone: three buttresses with gullies between them, cliffs of some twenty metres that stand on
// sloping benches, and on the cliffs a few narrow ledges that slope, pinch out and come back. No line runs round it. Both owners read
// this: the land builds the rock from `cragRadius`, and what nests on it stands where `cragPerch` says.
import { noise3, smooth } from '../land/noise';
import { BUTTRESS, TIDE } from '../layout';

/** A ledge every BAND metres up a cliff, a bench every BENCH; the last LIP of a band is the ledge itself. */
export const CRAG = { band: 6.3, bench: 21, lip: 0.84, mean: 7 };

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

/** The radius of the crag at an angle round its axis and a height, metres. */
export function cragRadius(angle: number, y: number): number {
  const { top, cap, slope } = BUTTRESS;
  const over = Math.max(0, y - top);
  const base = y < top ? cap + (top - y) * slope : cap * Math.max(0, 1 - over / 3);
  // The broad shape comes in above the weed and goes out at the summit.
  const fade = smooth(TIDE - 6, TIDE + 12, y) * smooth(top + 1, top - 14, y);
  const butt = 8 * (Math.pow(lobe(angle, y), 0.8) - 0.6);
  const tb = (y + benchPhase(angle)) / CRAG.bench;
  const fb = tb - Math.floor(tb);
  const bench = 7.5 * (fb < 0.8 ? fb / 0.8 : (1 - fb) / 0.2) - 3.75;
  // Each column stands out of the cliff or back in it.
  const [cell0, across0] = column(angle);
  const pillar = 2.4 * (noise3(cell0 * 4.7 + 0.5, 2.5, 6.5) - 0.5) - 0.5 * (1 - smooth(0, 0.08, Math.min(across0, 1 - across0)));
  const t = (y + cragPhase(angle)) / CRAG.band;
  const k = Math.floor(t);
  const f = t - k;
  const ledge = ledgeWidth(angle, k) * (f < CRAG.lip ? f / CRAG.lip : (1 - f) / (1 - CRAG.lip));
  // The cliff between two ledges is built of blocks: each stands a hand out of the face or is set back, with a joint between.
  const length = 2.4 + 4 * noise3(k * 1.71, 3.3, 0.5);
  const way = (angle * 45) / length + 17 * noise3(k * 0.37, 9.1, 2.5);
  const cell = Math.floor(way);
  const course = Math.floor(f * 3.2);
  const joint = Math.min(way - cell, cell + 1 - way) * length;
  const pick = noise3(cell * 3.73 + 0.5, k * 2.91 + course * 5.3 + 0.5, 4.5);
  const block = (-0.4 + 0.9 * smooth(0.42, 0.5, pick) - 0.3 * (1 - smooth(0, 0.25, joint))) * smooth(0.82, 0.74, f) * smooth(0, 0.04, f);
  return Math.max(0.01, base + fade * (butt + bench + pillar) + (ledge + block) * Math.min(1, base / cap));
}

/**
 * A standing place on the crag: the ledge nearest `height` at `angle` that is wide enough to stand on. `across` runs from 0, against the
 * cliff behind, to 1, the outer lip. Gives the radius from the axis and the height of the rock there.
 */
export function cragPerch(angle: number, height: number, across: number): [number, number] {
  const phase = cragPhase(angle);
  const k0 = Math.floor((height + phase) / CRAG.band);
  let k = k0;
  for (const o of [0, 1, -1, 2, -2, 3, -3]) {
    const y = (k0 + o + 0.92) * CRAG.band - phase;
    if (ledgeWidth(angle, k0 + o) > 1.1 && y > TIDE + 3 && y < BUTTRESS.top - 3) {
      k = k0 + o;
      break;
    }
  }
  const f = 0.975 - 0.115 * Math.min(1, Math.max(0, across));
  const y = (k + f) * CRAG.band - phase;
  return [cragRadius(angle, y), y];
}
