// The shape of the land as one plain function of (x, z): the layout's rough ground with the rock put into it.
// The wall is cut into level lava flows (cliffs and ledges), notched by gullies, with talus fans under them;
// the bench carries tumuli, tilted slabs and a broken edge. On the bench it stays within about a metre of the layout.
import { MOUTH, benchDistance, benchHeight, calderaDistance, lerp, smooth } from '../layout';

const imul = Math.imul;
function hash(i: number, j: number): number {
  let h = (imul(i, 374761393) + imul(j, 668265263)) | 0;
  h = imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Value noise, 0 to 1. */
export function noise(x: number, z: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const fx = x - i;
  const fz = z - j;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j);
  const b = hash(i + 1, j);
  const c = hash(i, j + 1);
  const d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, z: number, octaves: number): number {
  let s = 0;
  let a = 0.5;
  for (let o = 0; o < octaves; o++) {
    s += a * noise(x, z);
    x = x * 2.03 + 17.3;
    z = z * 2.03 + 9.1;
    a *= 0.5;
  }
  return s;
}

// Value noise with its cells flattened: blocks with a level each and a narrow ramp between, so a mesh can follow the joints.
function blocks(x: number, z: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const u = smooth(0.38, 0.62, x - i);
  const v = smooth(0.38, 0.62, z - j);
  const a = hash(i, j);
  const b = hash(i + 1, j);
  const c = hash(i, j + 1);
  const d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Level tables with sheer steps between them: one number in every cell, and the walls between cells a twelfth of a cell wide. */
function tables(x: number, z: number): number {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const u = smooth(0.46, 0.54, x - i);
  const v = smooth(0.46, 0.54, z - j);
  const a = hash(i, j);
  const b = hash(i + 1, j);
  const c = hash(i, j + 1);
  const d = hash(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** 1 on the crest of a ridge line, falling to 0 either side. */
const ridge = (x: number, z: number): number => 1 - Math.abs(2 * noise(x, z) - 1);

const wave = (x: number, z: number): number =>
  Math.sin(x * 0.011 + 1.7 * Math.sin(z * 0.007 + 0.4)) + 0.6 * Math.sin(z * 0.017 + 1.3 * Math.sin(x * 0.009)) + 0.35 * Math.sin((x + z) * 0.031);

// The layout's profile of the wall: metres out from the lake edge, metres up.
const WALL: [number, number][] = [
  [-40, -8],
  [0, 0],
  [60, 26],
  [125, 74],
  [150, 150],
  [172, 206],
  [372, 232],
  [386, 286],
  [432, 298],
  [900, 292],
  [6000, 250],
];

function profile(d: number): number {
  const first = WALL[0] as [number, number];
  if (d <= first[0]) return first[1];
  for (let i = 1; i < WALL.length; i++) {
    const a = WALL[i - 1] as [number, number];
    const b = WALL[i] as [number, number];
    if (d <= b[0]) return lerp(a[1], b[1], (d - a[0]) / (b[0] - a[0]));
  }
  return (WALL[WALL.length - 1] as [number, number])[1];
}

/** The tops of the lava flows the wall is built of, metres above the lake. Thick hard flows stand as cliffs, thin ones as steps. */
// Thick flows of basalt, 9 to 36 m each, with a thin bed of rubble between some of them: a few tiers, not fine strata.
export const FLOWS = [58, 83, 97, 131, 140, 176, 206, 219, 252, 277, 304, 338, 351, 385, 414];

// A smooth height cut into flows: most of each flow's thickness is climbed in the first part of its run (the cliff), the rest is its ledge.
function terrace(h: number, face: number): number {
  if (h <= (FLOWS[0] as number) || h >= (FLOWS[FLOWS.length - 1] as number)) return h;
  let i = 1;
  while ((FLOWS[i] as number) < h) i++;
  const a = FLOWS[i - 1] as number;
  const b = FLOWS[i] as number;
  const t = (h - a) / (b - a);
  const s = t < face ? (0.9 * t) / face : 0.9 + (0.1 * (t - face)) / (1 - face);
  return a + (b - a) * s;
}

/** How tall the wall stands round the lake, as a share of the layout's profile: one number every ten degrees round the lake's centre, from west through north. */
export const RIM = [0.9, 0.9, 0.9, 0.9, 0.85, 0.82, 0.72, 0.89, 0.9, 0.98, 1.03, 1.09, 1.13, 1.12, 1.1, 1.11, 1.13, 1.08, 0.97, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

function rimScale(x: number, z: number): number {
  const a = (Math.atan2(z - 90, x - 190) * 18) / Math.PI + 18;
  const i = Math.floor(a);
  const f = a - i;
  const u = f * f * (3 - 2 * f);
  return lerp(RIM[i % 36] as number, RIM[(i + 1) % 36] as number, u);
}

/** The tops of the flows under the pour, metres above the lake: unlike the even ledges of the talus elsewhere. */
const TIERS = [-20, 3, 8, 24, 30, 51, 58, 80, 88, 112, 400];
// The fall comes down the wall here: beside its channel the wall keeps the shape the fall folder was built on.
const CHANNEL_X = MOUTH.x - 3;

// The crest of the cone of debris left of the fall: from the foot of the cliff to the shore, as x, z, x, z.
export const SPUR: [number, number, number, number] = [-238, -452, -116, -324];

/** How far the flows of the wall dip at (x, z), metres: the ledges wander up and down by some metres over tens of metres, so that none is a level line. */
export function flowDip(x: number, z: number): number {
  const free = smooth(40, 75, Math.abs(x - CHANNEL_X));
  return 5 * (noise(x / 310 + 2, z / 310) - 0.5) + free * (13 * (noise(x / 83 + 5.3, z / 83 + 1.1) - 0.5) + 4.5 * (noise(x / 21 + 0.7, z / 21 + 3.9) - 0.5));
}

/** The caldera wall and the country outside it. */
export function wallAt(x: number, z: number, d: number): number {
  if (d < -40) return -8;
  const up = smooth(70, 150, d) * smooth(520, 440, d);
  // Gullies: narrow lines where the cliff is cut back, and the blunt ribs between them.
  const g = ridge(x / 52 + 3.1, z / 52 + 7.7);
  const gully = g * g * g * 17 * up;
  const rib = (fbm(x / 23, z / 23, 3) - 0.5) * 12 * up;
  // The cliff is broken along its joints into piers some metres wide that stand forward or back of each other. Not at the rim, whose outline is the wide picture's.
  const free = smooth(40, 75, Math.abs(x - CHANNEL_X));
  const pier = free * up * smooth(300, 215, d) * (7 * (blocks(x / 8.3 + 0.21 * z, z / 9.1 - 0.19 * x) - 0.5) + 9 * (blocks(x / 27 + 3.3, z / 31 + 1.7) - 0.5));
  // Away from the fall the wall is broken into masses ten to thirty metres across that stand forward of the crevices between them.
  const wide = smooth(95, 130, Math.abs(x - CHANNEL_X));
  const m1 = ridge(x / 33 + 0.31 * z / 33 + 5.5, z / 41 - 0.2 * x / 41 + 1.9);
  const m2 = ridge(x / 13 + 2.2, z / 15 + 8.4);
  const mass = wide * up * smooth(330, 240, d) * (15 * (0.55 - m1 * m1 * m1) + 5 * (0.5 - m2 * m2));
  const ragged = d + 16 * wave(x * 1.7, z * 1.7) * smooth(20, 160, d) + 14 * wave(x * 0.45 + 300, z * 0.45) * smooth(150, 450, d) - gully + rib + pier + mass;
  let h = profile(ragged) + 3.5 * wave(x * 2.3 + 90, z * 2.3) * smooth(140, 420, d);
  // The rim is set by the wide picture: lower in the west, where the wall is near that camera, higher in the east.
  if (h > 50) h = 50 + (h - 50) * rimScale(x, z);
  if (h > 50) {
    // The flows dip a little, so the bands are level but not ruled.
    const dip = flowDip(x, z);
    const face = 0.2 + 0.3 * noise(x / 37 + 11, z / 37 + 5);
    const cut = terrace(h + dip, face) - dip;
    // Stretches of the wall are massive: there the flows are welded and barely step.
    // Right of the mouth the fall's lens looks at the wall through its longest glass: there every flow keeps its ledge.
    const byMouth = smooth(60, 95, x - CHANNEL_X) * smooth(340, 250, x - CHANNEL_X);
    const stepped = lerp(lerp(1, 0.4 + 0.6 * smooth(0.3, 0.62, noise(x / 97 + 9.1, z / 97 + 4.3)), free), 1, byMouth);
    h = lerp(h, cut, smooth(50, 64, h) * stepped);
  }
  // Fans of talus under the gullies, and the apron's own lumps.
  const apron = smooth(4, 40, d) * smooth(150, 100, d);
  const lumps = 1 - 0.6 * smooth(40, 75, Math.abs(x - CHANNEL_X)) * smooth(260, 200, Math.abs(x - CHANNEL_X));
  h += apron * (5 * g * g + 2.4 * lumps * (fbm(x / 9, z / 9, 3) - 0.5) + 6 * (noise(x / 61, z / 61 + 4) - 0.5));
  // West of that cone the wide view looks along the wall's foot: fans of talus lean against the cliff there, each with its apex up a gully,
  // and bury the lower flows. No other key sees them.
  const west = smooth(-245, -300, x) * smooth(-120, -200, z) * smooth(2, 30, d) * smooth(170, 120, d);
  if (west > 0) {
    const apex = noise(x / 57 + 1.7, z / 57 + 9.2);
    const crest = 46 + 62 * apex * apex + 14 * g * g;
    const fan = Math.min(0.66 * (d - 3) + 2.2 * (fbm(x / 7, z / 7, 2) - 0.5), crest + 0.12 * (d - 3));
    if (fan > h) h = lerp(h, fan, west);
  }
  // Left of the fall a cone of debris lies against the wall: its crest runs down from the cliff to the shore, askew to the wall,
  // and the ground east of the crest falls away toward the channel. From the fall's lens the crest is a diagonal against what lies behind it.
  {
    const ex = SPUR[2] - SPUR[0];
    const ez = SPUR[3] - SPUR[1];
    const len = Math.hypot(ex, ez);
    const t = ((x - SPUR[0]) * ex + (z - SPUR[1]) * ez) / (len * len);
    if (t > -0.15 && t < 1.2) {
      // East of the crest is positive.
      const across = ((x - SPUR[0]) * ez - (z - SPUR[1]) * ex) / len + 7 * (noise(t * 7.3, 1.7) - 0.5) + 2.5 * (noise(t * 31, 5.1) - 0.5);
      const rise = (40 * smooth(-0.1, 0.25, t) * smooth(0.97, 0.42, t) + 3 * smooth(1.2, 0.95, t) * smooth(0.6, 0.9, t)) * (0.8 + 0.4 * noise(t * 5.1 + 3.3, 0.4)) * smooth(-12, -2, d);
      const flank = across > 0 ? smooth(17, 0, across) : Math.exp(across / 70);
      h += rise * flank * flank;
    }
  }
  // Here and there the rock under the talus stands out of it: in ledges beside the channel, in knobs and ribs with broken sides elsewhere.
  const crop = apron * smooth(0.34, 0.58, noise(x / 43 + 7, z / 43 + 2)) * smooth(6, 16, h);
  if (crop > 0) {
    const w = 7.5;
    const q = (h + 2 * noise(x / 31, z / 31 + 9) + free * (9 * noise(x / 37 + 2.2, z / 37 + 6.1) + 3 * noise(x / 11 + 8.1, z / 11)) + 1.6 * blocks(x / 5.3 + 0.3 * z, z / 6.1 - 0.2 * x)) / w;
    const f = q - Math.floor(q);
    const face = 0.14 + 0.2 * noise(x / 13 + 3, z / 13);
    const s = f < face ? (0.9 * f) / face : 0.9 + (0.1 * (f - face)) / (1 - face);
    let cut = (s - f) * w;
    if (free < 1) {
      // Under the pour the flows are of unlike thickness, a thick one over a thin one, and the melt drops over each in turn.
      const at = q * w;
      let i = 1;
      while (i < TIERS.length - 1 && (TIERS[i] as number) < at) i++;
      const a = TIERS[i - 1] as number;
      const b = TIERS[i] as number;
      const t = Math.min(1, Math.max(0, (at - a) / (b - a)));
      const st = t < face ? (0.9 * t) / face : 0.9 + (0.1 * (t - face)) / (1 - face);
      cut = lerp((st - t) * (b - a), cut, free);
    }
    h += crop * cut * lerp(0.8, 0.62, free);
  }
  // Not on the slopes beside the fall, which its lens fills its frame with: those are scree lying at rest, even, with ledges at the channel alone.
  const even = 1 - 0.8 * smooth(260, 200, Math.abs(x - CHANNEL_X));
  const knob = even * free * apron * smooth(0.56, 0.7, noise(x / 17 + 1.3, z / 21 + 6.6) + 0.25 * (noise(x / 5.1 + 2, z / 5.1) - 0.5));
  if (knob > 0) h += knob * (2.5 + 5 * noise(x / 29 + 4.4, z / 29 + 0.9) + 2.2 * (blocks(x / 3.7 + 0.4 * z, z / 4.3 - 0.3 * x) - 0.5) + 1.2 * (noise(x / 1.9, z / 1.9 + 3) - 0.5));
  // The rim and the country outside: broken crags, then long low hills.
  // The rim is a table of flows broken at its edge into blocks: a level skyline with notches, and nothing behind it stands higher.
  // Its top is the top of one flow: level for some tens of metres, then a sheer step to the next block. No dome stands on the skyline.
  const table = 50 + 238 * rimScale(x, z) + 7 * (tables(x / 47 + 0.2 * (z / 47) + 1.3, z / 59 - 0.15 * (x / 59) + 6.1) - 0.5) + 2.6 * (tables(x / 13 + 4.4, z / 17 + 0.9) - 0.5) + 2.2 * (noise(x / 210 + 3, z / 210) - 0.5);
  return Math.min(h, table);
}

// Where the cameras travel on the bench: the push of the wide view, then down to the last rocks of the shore and the push of the line view.
const ROUTE: [number, number][] = [
  [-606.2, 327.4],
  [-579.8, 314.9],
  [-553.8, 302.6],
  [-514.2, 217.6],
  [-508, 214.2],
];

// The wide view's push, with the height of the lens: the ground keeps 3.5 m under it and no rock comes within 3 m of it.
const WIDE_PATH: [number, number, number][] = [
  [-606.2, 28.0, 327.4],
  [-579.8, 24.9, 314.9],
  [-553.8, 17.0, 302.6],
];

/** The nearest point of the wide view's path to (x, z): metres to it over the ground, and the height of the lens there. */
export function widePath(x: number, z: number): [number, number] {
  let best = Infinity;
  let y = 0;
  for (let i = 1; i < WIDE_PATH.length; i++) {
    const a = WIDE_PATH[i - 1] as [number, number, number];
    const b = WIDE_PATH[i] as [number, number, number];
    const ex = b[0] - a[0];
    const ez = b[2] - a[2];
    const t = Math.min(1, Math.max(0, ((x - a[0]) * ex + (z - a[2]) * ez) / (ex * ex + ez * ez)));
    const d = Math.hypot(x - a[0] - ex * t, z - a[2] - ez * t);
    if (d < best) {
      best = d;
      y = a[1] + (b[1] - a[1]) * t;
    }
  }
  return [best, y];
}

// The line view: the lens rides from LINE_PATH[0] to LINE_PATH[1], 1.6 to 2.7 m above the lake, looking 52 degrees east of north.
const LINE_PATH: [[number, number], [number, number]] = [
  [-514.2, 217.6],
  [-508, 214.2],
];
const LINE_LENS: [number, number] = [-510.5, 215.5];
const LINE_AHEAD: [number, number] = [0.788, -0.616];

/** Metres from (x, z) to the path of the line view. */
export function linePathDistance(x: number, z: number): number {
  const [a, b] = LINE_PATH;
  const ex = b[0] - a[0];
  const ez = b[1] - a[1];
  const t = Math.min(1, Math.max(0, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez)));
  return Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t);
}

/** Whether (x, z) lies in the part of the line view that must stay open: right of a quarter of the frame's width, ahead of the lens. */
export function lineOpen(x: number, z: number): boolean {
  const dx = x - LINE_LENS[0];
  const dz = z - LINE_LENS[1];
  const ahead = dx * LINE_AHEAD[0] + dz * LINE_AHEAD[1];
  const right = -dx * LINE_AHEAD[1] + dz * LINE_AHEAD[0];
  return ahead > -4 && ahead < 220 && right > -0.36 * ahead - 1.2;
}

// The crag of the line view: its foot runs from CRAG_A to CRAG_B, its face looks at the lake, its top stands out of the frame.
const CRAG_A: [number, number] = [-510, 207];
const CRAG_ALONG: [number, number] = [0.747, -0.664];

function lineCrag(x: number, z: number): number {
  const dx = x - CRAG_A[0];
  const dz = z - CRAG_A[1];
  const u = dx * CRAG_ALONG[0] + dz * CRAG_ALONG[1];
  if (u < -19 || u > 13) return 0;
  // Behind the foot is positive: away from the lake.
  // Where the line view's frame begins, 8 to 12 m ahead of that lens, a spur of the crag steps two metres out toward the lens's line.
  const v = dx * CRAG_ALONG[1] - dz * CRAG_ALONG[0] + 1.5 * smooth(0, 2.5, u) * smooth(8, 5.5, u);
  if (v < -1.2 || v > 27) return 0;
  // The face is fractured into masses of rock that stand a little forward or back of each other, and the top is broken, never level.
  const column = noise(u / 1.15 + 3.3, 7.7);
  // Each two or three metres of the ridge is a block that stands half a metre forward or back of the next and a fifth taller or shorter,
  // with a sheer side between them: seen along the ridge, the outline goes down in steps and not along one line.
  const proud = smooth(0.42, 0.58, noise(u / 2.1 + 0.7, 9.9)) - 0.5;
  const tall = 0.8 + 0.38 * smooth(0.42, 0.58, noise(u / 1.7 + 6.6, 2.2));
  const vj = v - 1.1 * proud - 0.5 * (column - 0.5) - 0.3 * (noise(u / 0.4, v / 0.4) - 0.5);
  const uj = u + 0.9 * (noise(v / 1.3 + 1.7, 2.9) - 0.5);
  const broken = 2.1 * (noise(u / 2.3 + 9.1, v / 2.9) - 0.5) + 0.9 * (noise(u / 0.9 + 2.2, v / 0.9 + 5.1) - 0.5);
  // Its far end comes down as a weathered ridge does, in lumps a stride across: not in steps and not in a ruled ramp.
  const lump = smooth(0.25, 0.75, noise(u / 1.2 + 3.1, v / 1.0 + 0.7));
  const ue = uj + 1.6 * (lump - 0.5) + 0.7 * (noise(u / 0.5 + 6.7, v / 0.45 + 1.7) - 0.5) + 0.5 * (column - 0.5);
  const end = smooth(8.8, 6.6, ue);
  // Its crest is knobs a forearm to an arm proud of each other, pitted finer than that: no ruled edge against the smoke.
  const crest = 1.0 * (noise(u / 1.2 + 1.1, v / 1.3 + 4.2) - 0.5) + 0.5 * (noise(u / 0.47 + 5.3, v / 0.5 + 0.9) - 0.5) + 0.2 * (noise(u / 0.19 + 7, v / 0.19) - 0.5) + 0.08 * (noise(u / 0.08, v / 0.08 + 2.7) - 0.5);
  const top = (5.3 + 0.6 * broken * smooth(0.3, 2.5, v) + crest) * end * (1 + 0.24 * (noise(u / 1.3 + 4.4, v / 1.3 + 2.6) - 0.5));
  // It is the end of a ridge and not a stump: behind its face a slope of rubble falls back to the bench, and its south end is a ramp of fallen blocks.
  // Neither shows from the line view, which sees the face alone; the wide view sees both.
  const fall = smooth(21, 1.4, v + 3 * noise(u / 3.1, 4.4) + 2.5 * (noise(u / 1.7 + 3, v / 1.7) - 0.5));
  const back = fall * (0.55 + 0.45 * fall);
  const ramp = smooth(-17.5, -3.4, uj + 2.2 * (noise(u / 1.3 + 7.7, v / 1.3) - 0.5) + 2.5 * (noise(u / 4.1 + 1.1, v / 4.1) - 0.5));
  const start = ramp * ramp * (0.35 + 0.65 * ramp);
  // The face, measured on the picture: a sheer foot a man high, a shoulder of knobs a stride and a half deep that stands out toward the lake,
  // and a sheer head behind it. The lens looks along the ridge, so the outline it sees is this section, with the knobs of each metre over the next.
  // Each two metres of the ridge is a block of its own that stands half a metre forward or back of the next, and its head is two blocks,
  // one on the other, not one sheer face: the lens sees every block's edge, so the outline is broken and no ruled line.
  const slab = 2.2 * (smooth(0.2, 0.8, noise(u / 2.6 + 3.7, 1.9)) - 0.65);
  const upper = 1.8 * (smooth(0.2, 0.8, noise(u / 1.9 + 8.2, 5.1)) - 0.6);
  const p = (vj + 1.1) / 2.0 + 0.2 * (smooth(0.2, 0.8, noise(u / 1.0 + 5.9, v / 0.9 + 1.3)) - 0.5) + 0.12 * (noise(u / 0.36 + 2.2, v / 0.33 + 6.1) - 0.5) + 0.3 * slab;
  const knob = noise(u / 0.75 + 0.4, v / 0.6 + 8.8);
  const rise = Math.min(1, Math.max(0, 0.3 * smooth(0, 0.15, p) + 0.11 * smooth(0.12, 0.6, p + 0.16 * (knob - 0.5)) + 0.26 * smooth(0.58, 0.72, p + 0.1 * (knob - 0.5)) + 0.33 * smooth(0.88, 1.04, p + 0.36 * upper) + 0.06 * smooth(0.05, 0.3, p) * (knob - 0.5)));
  // Between two blocks the crest is notched a third of its height.
  const notch = 1 - 0.42 * smooth(0.56, 0.7, noise(u / 2.2 + 1.3, 4.4));
  return top * tall * rise * back * start * notch;
}

/** Metres from (x, z) to the cameras' route on the bench. */
export function routeDistance(x: number, z: number): number {
  let best = Infinity;
  for (let i = 1; i < ROUTE.length; i++) {
    const a = ROUTE[i - 1] as [number, number];
    const b = ROUTE[i] as [number, number];
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    const t = Math.min(1, Math.max(0, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez)));
    best = Math.min(best, Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t));
  }
  return best;
}

/** The bench: the layout's shelf of old lava, with what a lava field has at 10 m and 1 m, and a broken edge at the line. */
export function benchAt(x: number, z: number, d0: number): number {
  if (d0 < -3) return -8;
  // The edge is bitten into bays and toes, within a metre of the layout's line.
  const d = d0 + 1.7 * (fbm(x / 3.7 + 9, z / 3.7, 2) - 0.37) - 0.25;
  if (d < 0) return Math.max(-8, 2.5 * d);
  const base = benchHeight(x, z);
  const in1 = smooth(0.4, 7, d);
  // Tumuli: low swollen domes.
  const t = noise(x / 13 + 40, z / 13 + 9);
  const dome = t > 0.55 ? smooth(0.55, 0.85, t) * 1.1 * smooth(2, 12, routeDistance(x, z)) : 0;
  // Pillows: the crust swollen into lobes a few metres across, each with its own height, sagging into the creases between them.
  const sx = x / 4.3 + 1.3 * noise(x / 9, z / 9 + 3);
  const sz = z / 4.3 + 1.3 * noise(x / 9 + 7, z / 9);
  const ci = Math.floor(sx);
  const cj = Math.floor(sz);
  const fx = Math.abs(sx - ci - 0.5) * 2;
  const fz = Math.abs(sz - cj - 0.5) * 2;
  const broken = smooth(0.35, 0.7, noise(x / 31 + 5, z / 31 + 2));
  const pillow = Math.sqrt(Math.max(0, (1 - fx * fx * fx) * (1 - fz * fz * fz)));
  const slab = broken * ((0.25 + 0.5 * hash(ci, cj)) * pillow - 0.3) + 0.22 * (ridge(x / 2.9 + 3.3, z / 2.9 + 0.7) - 0.5);
  const lumps = 0.5 * (fbm(x / 5.5, z / 5.5, 3) - 0.5);
  // Lobes: each flow of pahoehoe ends in a swollen front a forearm high, and the fronts wander like contour lines.
  const lf = 7 * fbm(x / 17 + 3, z / 17 + 8, 2) + 0.35 * noise(x / 2.3, z / 2.3);
  const fq = lf - Math.floor(lf);
  const lobe = 0.36 * (smooth(0, 0.1, fq) - fq);
  let h = base + in1 * (dome + slab + lumps + lobe);
  // Treads and risers: the bench is a stair of flows, each a level tread of slab ending in a broken riser. North of the camera's
  // bench (z under 200) the stair becomes the crag of the wide picture: faces of eight metres and more, jointed into blocks.
  const reach = routeDistance(x, z);
  const crag = smooth(200, 150, z);
  // The fronts of the flows are swollen noses, not cut steps: a front wanders, bulges and sags, and its top is round.
  const joint = lerp(noise(x / 2.9 + 0.31 * z, z / 3.3 - 0.27 * x), blocks(x / 2.9 + 0.31 * z, z / 3.3 - 0.27 * x), 0.35 + 0.4 * crag);
  const w = lerp(2.6, 9.5, crag);
  const q = (h + (1 + 2 * crag) * noise(x / 40, z / 40) + (0.8 + 3.6 * crag) * joint + 2.2 * crag * blocks(x / 11 + 3.7, z / 13 + 1.9) + 0.5 * noise(x / 1.3 + 4.1, z / 1.3 + 2.2)) / w;
  const f = q - Math.floor(q);
  const face = lerp(0.2, 0.09, crag) + 0.12 * noise(x / 17 + 3, z / 17);
  const nose = Math.min(1, f / face);
  const s = f < face ? 0.9 * Math.sqrt(nose * (2 - nose)) : 0.9 + (0.1 * (f - face)) / (1 - face);
  h += smooth(1.2, 4, h) * lerp(0.45 + 0.55 * smooth(3, 14, reach), 1, crag) * lerp(0.7, 1, crag) * (s - f) * w;
  // The crag at the left of the wide picture is a slope of flows and blocks, not a tower: what stands over 26 m is brought down.
  if (h > 26) h = 26 + (h - 26) * lerp(1, 0.4, crag);
  // The wide view's lens passes low over the bench: the ground keeps 3.5 m under it.
  const [off, lens] = widePath(x, z);
  if (off < 8 && h > lens - 3.7) h = lerp(lens - 3.7, h, smooth(2.5, 8, off));
  // The line view: the lens rides a little over the last rocks of the shore, so the ground under it lies low, and nothing
  // stands up in the part of that view where the mouth and the channel show. The crag stands at its left edge.
  const low = linePathDistance(x, z);
  if (low < 3.5 && h > 0.6) h = lerp(0.6, h, smooth(1.6, 3.5, low));
  if (h > 1.25 && lineOpen(x, z)) h = 1.25 + 0.12 * (1 - Math.exp(-(h - 1.25)));
  // Its ramp of rubble stays low beside the path of the line view's lens.
  const stand = Math.min(lineCrag(x, z), 0.6 + 1.1 * Math.max(0, low - 3.5) + 100 * smooth(-7, -4.5, (x - CRAG_A[0]) * CRAG_ALONG[0] + (z - CRAG_A[1]) * CRAG_ALONG[1]));
  if (stand > h) h = stand;
  // The last metres of shore are rubble under ash, not a ramp: lumps a stride across and blocks half buried, a hand to a forearm high.
  // Under the line view's lens they stay low.
  const near = smooth(34, 22, Math.hypot(x - LINE_LENS[0], z - LINE_LENS[1]));
  if (near > 0) {
    const lump = 0.34 * (blocks(x / 1.15 + 0.37 * z, z / 1.3 - 0.29 * x) - 0.5) + 0.3 * (noise(x / 2.7 + 6.3, z / 2.7 + 1.1) - 0.5) + 0.16 * (noise(x / 0.75, z / 0.75 + 4.4) - 0.5);
    h += near * lump * (0.35 + 0.65 * smooth(0.6, 2.6, low)) * smooth(0.3, 1.5, d);
  }
  // The lip at the line: a step of a few hand widths, not a ramp.
  return h * smooth(0, 0.3, d);
}

const BUTTRESS = { root: [445, -322] as [number, number], tip: [222, 52] as [number, number], half: 66 };

/** The buttress, as the layout shapes it, with its faces cut into the same flows as the wall and its foot carried under the lake. */
export function buttressAt(x: number, z: number): number {
  const [rx, rz] = BUTTRESS.root;
  const [tx, tz] = BUTTRESS.tip;
  const ex = tx - rx;
  const ez = tz - rz;
  const len = Math.hypot(ex, ez);
  const along = ((x - rx) * ex + (z - rz) * ez) / len;
  const across = ((x - rx) * ez - (z - rz) * ex) / len;
  const u = along / len;
  if (u < -0.4 || u > 1.3) return -8;
  // Its top, measured on the wide picture: one eroded table that falls evenly from the wall to the tip, and tilts a little toward that camera,
  // so the lens sees a strip of the table over the near cliff. Positive across is the far side.
  const fallen = 0.5 * (Math.min(1, Math.max(0, u / 0.9)) + smooth(0.0, 0.9, u));
  const tilt = 1 + 0.12 * Math.max(-1.2, Math.min(1.2, across / BUTTRESS.half));
  // Its crown is broken tables: level stretches of some tens of metres, sheer steps between them, and smaller blocks on those.
  const crown = 8 * (tables(x / 29 + 0.3 * (z / 29) + 7.3, z / 37 - 0.2 * (x / 37) + 2.9) - 0.5) + 3.4 * (tables(x / 8.3 + 1.1, z / 10.1 + 5.7) - 0.5) + 1.4 * (fbm(x / 5, z / 5, 2) - 0.5);
  // Its end by the wall is sheer and stands free, the highest point of it: a prow, with the saddle behind.
  const top = (lerp(194, 84, fallen) * tilt + crown + 9 * smooth(0.14, -0.02, u)) * smooth(1.12, 0.9, u) * smooth(-0.13, -0.085, u);
  const g = ridge(x / 38 + 1.3, z / 38 + 4.1);
  const half = BUTTRESS.half * (1 - 0.35 * smooth(0.5, 1.1, u)) + 5 * wave(x * 2 + 40, z * 2) - 9 * g * g * g + 5 * (fbm(x / 17, z / 17, 2) - 0.5);
  const edge = Math.abs(across) / half;
  // The brow of the cliff is a corner, not a shoulder.
  const cliff = Math.pow(Math.min(1, Math.max(0, (1 - edge) / 0.26)), 1.3);
  // Talus lies against its near side as a skirt two fifths of the cliff high, hollow in section like any scree; the far side keeps the layout's.
  const lean = Math.min(1, Math.max(0, (1.85 - edge) / 0.9));
  const scree = across < 0 ? 0.4 * (0.3 * lean + 0.7 * lean * lean) : 0.3 * smooth(1.75, 0.95, edge);
  let h = top * Math.max(cliff, scree * smooth(1.2, 0.95, u) * smooth(-0.3, -0.1, u)) + 3 * wave(x * 3, z * 3) * cliff;
  h += smooth(0.95, 1.2, edge) * 2.2 * (fbm(x / 8, z / 8, 3) - 0.5) * smooth(0.5, 6, h);
  return h < 0.5 ? Math.max(-8, 0.5 - (0.5 - h) * 5) : h;
}

// The fall lands here: the toe of the wall stays out of its way.
const TOE_CLEAR = -36;

/** The middle of the bare ropy sheet on the crag under the wide lens. */
export const ROPY: [number, number] = [-573, 298];

/** Where a pressure ridge of crust stands off the bench. It is loose rock alone: the land's height does not know it. */
export const SKERRY: [number, number] = [-518, 282.5];

/** The true height of the land, metres. Zero or less is lake. */
// The land with or without the buttress. The wall's ring is drawn without it and the buttress by its own mesh:
// two meshes of one surface show each other through their joins as dotted lines.
function compose(x: number, z: number, spur: boolean, alcove = true): number {
  const d = calderaDistance(x, z);
  let g = wallAt(x, z, d);
  const bd = benchDistance(x, z);
  // The toe of the wall: lobes of talus run out over the layout's shoreline into the lake, so that no straight line is left where the two meet.
  // The land only gains on the lake, by 11 m at most; none of it by the bench, none where the cascade lands.
  if (d > -14 && d < 26 && bd < -30) {
    const keep = smooth(-30, -60, bd) * smooth(13, 24, Math.abs(x - TOE_CLEAR));
    if (keep > 0) {
      const lobe = keep * (7.5 * Math.pow(noise(x / 27 + 3.1, z / 27 + 8.7), 1.5) + 3.5 * noise(x / 8.3 + 1.7, z / 8.3));
      const toe = 0.34 * (d + lobe) + 0.45 * (noise(x / 2.3, z / 2.3 + 6.1) - 0.5) * keep;
      if (toe > g) g = Math.min(toe, g + 3.4);
    }
  }
  const b = benchAt(x, z, bd);
  if (b > g) g = b;
  if (spur) {
    const t = buttressAt(x, z);
    if (t > g) g = t;
  }
  // The alcove the mouth opens into: the wall is cut back to the floor of the mouth, and the fall folder roofs it.
  const ax = Math.abs(x - MOUTH.x);
  const half = MOUTH.width / 2;
  if (alcove && ax < half + 11 && z > MOUTH.z - 60 && z < MOUTH.z + 16 && g > MOUTH.floor) {
    const k = smooth(half + 3, half - 9, ax) * smooth(MOUTH.z - 56, MOUTH.z - 44, z) * smooth(MOUTH.z + 14, MOUTH.z + 4, z);
    return g + (MOUTH.floor - g) * k;
  }
  return g;
}

export function landHeight(x: number, z: number): number {
  return compose(x, z, true);
}

/** The land as the wall's ring draws it: everything but the buttress, and the wall standing whole over the mouth.
 *  The alcove is a slot open to the sky in `landHeight` (a height field has no roof); the drawn wall keeps its face there
 *  and the mesh is opened only inside the arch, where the fall's tube shows. */
export function wallHeight(x: number, z: number): number {
  return compose(x, z, false, false);
}

/** Whether a point of the wall's face lies inside the arch of the mouth, scaled by k: the hole the wall's mesh leaves for the fall's tube.
 *  The arch is the fall's: a superellipse of power 2.5, MOUTH.width / 2 wide at the sill and MOUTH.height - 10 tall, standing on the floor. */
export function inArch(x: number, y: number, z: number, k: number): boolean {
  if (z > MOUTH.z + 40 || z < MOUTH.z - 110) return false;
  const qx = Math.abs(x - MOUTH.x) / (MOUTH.width / 2);
  const qy = (y - MOUTH.floor - 0.7) / (MOUTH.height - 10);
  if (qy < -0.03) return false;
  return Math.pow(Math.pow(qx, 2.5) + Math.pow(Math.max(qy, 0), 2.5), 0.4) < k;
}

/** The buttress as its own mesh draws it: the land where the buttress is the top of it, sunk out of sight below the rest. */
export function buttressHeight(x: number, z: number): number {
  const all = compose(x, z, true);
  return all - 6 * smooth(0.6, 0, all - compose(x, z, false));
}

/** A fissure in the bench. Too narrow for the rig's map: only the crack's own mesh and the shader know it. */
export interface Crack {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  /** Half the width of the opening and its depth, metres. */
  width: number;
  depth: number;
  seed: number;
}

let cracks: Crack[] = [];
export function setCracks(list: Crack[]): void {
  cracks = list;
}

function crackFrame(c: Crack, x: number, z: number): [number, number, number] {
  const l = Math.hypot(c.bx - c.ax, c.bz - c.az);
  const ux = (c.bx - c.ax) / l;
  const uz = (c.bz - c.az) / l;
  const t = (x - c.ax) * ux + (z - c.az) * uz;
  const s = (x - c.ax) * uz - (z - c.az) * ux;
  const k = c.width / 0.3;
  return [t, s - k * (0.25 * Math.sin(t * 1.9 + c.seed) + 0.12 * Math.sin(t * 5.3 + c.seed * 2)), l];
}

/** True within `reach` metres of a crack: the bench leaves a hole there for the crack's own mesh. */
export function nearCrack(x: number, z: number, reach: number): boolean {
  for (const c of cracks) {
    const [t, s, l] = crackFrame(c, x, z);
    if (t > -reach * 0.5 && t < l + reach * 0.5 && Math.abs(s) < reach) return true;
  }
  return false;
}

/** Metres the ground is lowered by a crack at (x, z): the fissure, less its raised and crusted lips. */
export function crackDip(x: number, z: number): number {
  let dip = 0;
  for (const c of cracks) {
    const [t, s, l] = crackFrame(c, x, z);
    const a = Math.abs(s);
    if (t < -0.4 || t > l + 0.4 || a > 2) continue;
    const taper = smooth(-0.3, 1.2, t) * smooth(l + 0.3, l - 1.2, t);
    const w = c.width * (0.55 + 0.9 * noise(t * 0.9 + c.seed, 3.3)) * taper + 0.01;
    const fissure = c.depth * taper * smooth(w, w * 0.2, a);
    const lip = 0.5 * c.width * taper * Math.exp(-(((a - w * 1.4) / (c.width * 1.1)) ** 2)) * (0.3 + 1.4 * noise(x * 2.7 + c.seed, z * 2.7));
    const crust = 0.045 * noise(x / 0.12, z / 0.12) * smooth(1.5, 0.2, a) * taper;
    dip += fissure - lip - crust;
  }
  return dip;
}

/** The wall alone, without the bench and the buttress: what stands against the sky. Used to fit the rim to the wide picture. */
export function wallOnly(x: number, z: number): number {
  return wallAt(x, z, calderaDistance(x, z));
}

// One size of stones: a stone in most cells of a grid, each with its own place, size and height, its outline bent by noise so it is not a dome.
function stones(x: number, z: number, cell: number, share: number, seed: number): number {
  const gx = x / cell;
  const gz = z / cell;
  const i0 = Math.floor(gx);
  const j0 = Math.floor(gz);
  let top = 0;
  for (let j = j0 - 1; j <= j0 + 1; j++) {
    for (let i = i0 - 1; i <= i0 + 1; i++) {
      const a = hash(i + seed, j - seed);
      if (a > share) continue;
      const cx = (i + 0.2 + 0.6 * hash(i + 7 * seed, j + 3)) * cell;
      const cz = (j + 0.2 + 0.6 * hash(i + 5, j + 11 * seed)) * cell;
      const r = cell * (0.26 + 0.24 * hash(i + 13, j + 17 + seed));
      // Each stone is longer one way than the other.
      const t = 6.283 * hash(i + 23 + seed, j + 29);
      const ux = (x - cx) * Math.cos(t) + (z - cz) * Math.sin(t);
      const uz = -(x - cx) * Math.sin(t) + (z - cz) * Math.cos(t);
      const d = Math.hypot(ux, uz * 1.5) / r + 0.5 * (noise(x / (cell * 0.23) + seed, z / (cell * 0.23)) - 0.5);
      if (d >= 1) continue;
      const h = r * (0.5 + 0.5 * hash(i + 31, j + 37 + seed)) * Math.pow(1 - d * d * d, 0.6);
      if (h > top) top = h;
    }
  }
  return top;
}

/** The rubble of the last metres of shore under the line view's lens, metres above `landHeight`: stones a hand to a forearm across
 *  lying against each other. Drawn by a mesh of its own, far finer than the bench; nothing stands on it, so it is not in `landHeight`. */
export function rubbleAt(x: number, z: number): number {
  return Math.max(0.85 * stones(x, z, 0.66, 0.5, 1), stones(x, z, 0.34, 0.75, 4), 0.6 * stones(x, z, 0.17, 0.8, 9)) + 0.02;
}

// The butte of the feeding picture (shot heart-02 alone): the approved picture has a dark flat-topped mass over the right of its frame, close behind
// the group. The buttress of the place is a kilometre off through that lens and lost in the smoke, so a butte is staged for that shot as a piece of
// set is: built for that one lens, in the lens's own frame (a: metres ahead of the key's lens, b: metres right of its axis).
// Its near face stands 205 m ahead. Frame x of the key is 50 + 177.6 * b / a per cent; a point h metres up at 205 m stands at frame y 52 - 1.54 * (h - 6.3) per cent.
const BUTTE_FROM: [number, number] = [-455.6, 249.8];
const BUTTE_AHEAD: [number, number] = [0.701, -0.713];
/** Where the staged butte is meshed, in the frame of the lens of key heart-3: metres ahead and metres right. */
export const BUTTE = { from: BUTTE_FROM, ahead: BUTTE_AHEAD, near: 158, far: 246, left: -30, right: 92 };

export function stagedButteHeight(x: number, z: number): number {
  const dx = x - BUTTE_FROM[0];
  const dz = z - BUTTE_FROM[1];
  const a = dx * BUTTE_AHEAD[0] + dz * BUTTE_AHEAD[1];
  const b = -dx * BUTTE_AHEAD[1] + dz * BUTTE_AHEAD[0];
  // The plan of its near face: bays and noses, and piers that stand a stride forward or back of each other.
  // Its cliffs are fluted: narrow clefts where the rock is cut back, some strides apart, and the blunt columns between them.
  const cleft = 1 - Math.abs(2 * noise(b / 3.3 + 2.2, 0.9) - 1);
  const groove = 1 - Math.abs(2 * noise(b / 1.4 + 7.1, 5.3) - 1);
  const face = 205 + 7 * (noise(b / 23 + 1.3, 4.1) - 0.5) + 3.2 * (blocks(b / 5.3 + 0.7, 2.2) - 0.5) + 1.2 * (blocks(b / 1.9 + 3.1, 6.6) - 0.5) + 2.6 * cleft * cleft * cleft + 0.8 * groove * groove * groove;
  const s = a - face;
  if (s < -50 || s > 40 || b < -30 || b > 94) return -2;
  // The top: a horn at the left end, then it falls away gently to the right and comes down in two shoulders. Its rim is broken blocks.
  const fall = b < 24 ? 0 : b < 43 ? (b - 24) * 0.3 : 5.7 + (b - 43) * 0.16;
  const shoulders = 1.7 * smooth(45.5, 47, b + 0.5 * noise(s / 2.3, 1.7)) + 1.9 * smooth(55, 56.3, b + 0.5 * noise(s / 2.3, 5.1)) + 3 * smooth(68, 70, b);
  // The horn is a worn head, not a box: it rises over some strides, its brow toward the sheer end is rounded off, and it runs into the crest.
  const horn = 2.2 * smooth(13.5, 19, b) * smooth(31, 20, b) - 3.2 * Math.pow(smooth(18.5, 13.5, b), 2);
  const worn = smooth(20, 30, b);
  const crest = (0.7 + 0.9 * worn) * (blocks(b / 3.7 + 0.4, s / 9 + 1.1) - 0.5) + 0.5 * worn * (blocks(b / 1.3 + 5.2, s / 3.1 + 0.3) - 0.5) + 0.9 * (noise(b / 2.9 + 1.4, s / 4.3 + 0.6) - 0.5) + 0.3 * (noise(b / 0.45, s / 0.45 + 2.7) - 0.5);
  const top = 38.5 - fall - shoulders + horn + crest;
  // Three beds: a low band on its talus, a ledge under rubble that leans back, and the sheer upper cliff, in places with a narrow ledge half way up.
  const foot = 13 + 5 * (noise(b / 31 + 7.7, 0.3) - 0.5);
  // Left of the sheer end the low band is a ridge under talus: its crest rolls, and does not step.
  const sheer = smooth(9, 17, b);
  const lower = foot + 11 + 2.4 * sheer * (blocks(b / 6.1 + 2.9, 5.5) - 0.5) + (1 - sheer) * (2.6 * (noise(b / 13 + 4.4, 2.1) - 0.5) + 0.9 * (noise(b / 3.1 + 0.8, 6.3) - 0.5));
  const d1 = 4 + 5 * noise(b / 11 + 3.3, 9.2) + 2.2 * (blocks(b / 4.3 + 9.1, 1.7) - 0.5);
  const d2 = 4.5 * Math.max(0, blocks(b / 7.3 + 1.9, 3.3) - 0.4);
  const t = Math.min(1, Math.max(0, (s + 34) / 34));
  const apron = foot * Math.pow(t, 1.25) + 1.3 * t * (noise(x / 2.7, z / 2.7) - 0.5) + 0.5 * t * (noise(x / 0.9 + 3, z / 0.9) - 0.5);
  const ledge = 2.5 * Math.min(1, Math.max(0, s / d1)) + 0.8 * (noise(x / 1.7 + 5, z / 1.7) - 0.5) * smooth(0, 2, s);
  const low = apron + (lower - foot) * smooth(0, 1.3, s + 0.5 * (noise(b / 0.7, 3.9) - 0.5)) + ledge;
  const mid = lower + 2.5 + (0.45 + 0.2 * (blocks(b / 9.1 + 4.4, 8.8) - 0.5)) * (top - lower - 2.5);
  let upper = (mid - lower - 2.5) * smooth(d1, d1 + 1.5, s + 0.5 * (noise(b / 0.6 + 2, 1.1) - 0.5)) + (top - mid) * smooth(d1 + d2, d1 + d2 + 1.4, s + 0.4 * (noise(b / 0.5, 6.3) - 0.5));
  // The left end of the cliff is sheer, and seen edge on by that lens. Left of it the low band comes down as a ridge of crags and talus.
  const end = 14 + 0.1 * Math.max(0, s) + 1.6 * (noise(s / 3 + 1.1, 7.7) - 0.5);
  const lean = (b - end + 0.6) * 22 + 6 * (blocks(s / 2.1 + 3.3, b / 1.7) - 0.5) + 2 * (noise(s / 0.6, b / 0.6 + 4.2) - 0.5);
  upper = Math.max(0, Math.min(upper, lean));
  // It comes down as scree does, hollow in section, and its crest is no row of teeth.
  const run = Math.min(1, Math.max(0, 1 - (end - b) / 38));
  const ridge = Math.min(1, Math.max(0, Math.pow(run, 1.5) + 0.04 * (noise(b / 4.1 + 6.2, s / 6.7) - 0.5) * smooth(end, end - 6, b) * smooth(0, 0.15, run)));
  const out = smooth(93, 82, b) * smooth(38, 30, s);
  return (low * ridge + upper) * out - 0.5;
}
