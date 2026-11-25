// The loose rock of the land: pebbles, stones and blocks on the camera's bench, slabs slumped over the line, fallen blocks on the aprons of the wall.
// Every rock is one of a few shapes, turned, squashed and sunk into the ground, with a shade under it in the rig's contact map.
import * as THREE from 'three';
import { MOUTH, SHORE_POINTS, VIEW, benchDistance, calderaDistance } from '../layout';
import type { HeartContext } from '../shared/context';
import { ROPY, SKERRY, lineOpen, linePathDistance, noise, routeDistance, widePath } from './height';
import { rockShape, type Height } from './meshes';
import { ROCK_FRAGMENT, ROCK_VERTEX } from './shaders';

interface Rock {
  m: THREE.Matrix4;
  seed: [number, number, number, number];
}

interface Kind {
  /** The finest the shape is ever split (see rockShape). Each rock takes the coarsest split its size in the frame allows. */
  detail: number;
  part: 'bench' | 'land';
  /** Always drawn from two reads of the rock picture and no relief. A rock small in the frame is drawn so whatever its kind. */
  simple: boolean;
  /** By split, by plain or full reading, by shape. */
  rocks: Rock[][][][];
}

const SHAPES = 5;
// The fallen blocks of the aprons are the scree's own rock: as pale as it, told from it by their shade and not by their tone.
const LAND_TONE = 1.9;
const DETAILS = 5;
// Pixels across a rock at 3840 wide for each split: under 14 pixels eight faces are enough, a rock that fills a tenth of the frame gets them all.
const SPLIT_AT = [14, 48, 150, 460];
// Radians a pixel of the widest frame subtends through the bench's lenses, and metres of slope a pixel of the fall's long lens covers.
const PIXEL = 0.00019;
const FALL_PIXEL = 0.046;

export function scatterRocks(ctx: HeartContext, shared: Record<string, THREE.IUniform>, height: Height): { bench: THREE.Object3D[]; land: THREE.Object3D[]; dispose(): void } {
  const rng = ctx.rng('land/rocks');
  const kind = (detail: number, part: 'bench' | 'land', simple = false): Kind => ({
    detail,
    part,
    simple,
    rocks: Array.from({ length: DETAILS }, () => [0, 1].map(() => Array.from({ length: SHAPES }, () => [] as Rock[]))),
  });
  const kinds = {
    pebble: kind(1, 'bench', true),
    stone: kind(2, 'bench', true),
    block: kind(3, 'bench'),
    hero: kind(4, 'bench'),
    slab: kind(3, 'bench'),
    boulder: kind(3, 'land', true),
  };
  // The coarsest split that still holds the rock's outline where the nearest lens sees it.
  const splitOf = (k: Kind, x: number, z: number, size: number): [number, number] => {
    const inFallLens = Math.abs(x - MOUTH.x) < 250 && z < -290;
    const pixels = k.part === 'land' ? size / (inFallLens ? FALL_PIXEL : 0.075) : size / (Math.max(routeDistance(x, z), 2.5) * PIXEL);
    let d = 0;
    while (d < k.detail && pixels > (SPLIT_AT[d] as number)) d++;
    return [d, k.simple || pixels < 70 ? 1 : 0];
  };
  const shades: [number, number, number, number][] = [];

  const q = new THREE.Quaternion();
  const tilt = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const at = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  interface Options {
    flat?: number;
    sink?: number;
    lean?: [number, number, number];
    onLake?: boolean;
    shade?: boolean;
    /** Allowed to stand up in the open part of the line view. */
    stand?: boolean;
  }
  const put = (kind0: Kind, x: number, z: number, size: number, o: Options = {}): boolean => {
    const k = kind0;
    const g = height(x, z);
    if (g < 0.05 && !o.onLake) return false;
    // Nothing sits on the crest of the line view's crag: a stone on a stump is a hat.
    const cu = (x + 510) * 0.747 - (z - 207) * 0.664;
    const cv = -(x + 510) * 0.664 - (z - 207) * 0.747;
    if (size > 0.4 && g > 2 && cu > -7 && cu < 11 && cv > -1.5 && cv < 10) return false;
    const base = Math.max(g, 0.04);
    const half = size / 2;
    const flat = o.flat ?? rng.range(0.5, 0.95);
    scale.set(half * rng.range(0.85, 1.3), half * flat, half * rng.range(0.8, 1.15));
    const sink = o.sink ?? rng.range(0.22, 0.55);
    at.set(x, base + 0.75 * scale.y * (1 - 2 * sink), z);
    // The cameras' room: nothing within 3 m of the wide view's lens, nothing over 0.7 m under the line view's lens,
    // nothing standing up where the line view shows the mouth and the channel.
    const top = at.y + scale.y;
    const [off, lens] = widePath(x, z);
    if (Math.hypot(Math.max(0, off - half * 1.3), Math.max(0, lens - top)) < 3.2) return false;
    if (linePathDistance(x, z) < 1.5 + half * 1.3 && top > 0.68) return false;
    if (!o.stand && top > 1.3 && lineOpen(x, z)) return false;
    // The line view's channel leaves the shore just ahead of its lens: nothing of the bench's lies on the moving crust there.
    if (!o.stand && lineOpen(x, z) && benchDistance(x, z) < (size > 0.45 ? 0.7 : 0.12) + half && Math.hypot(x + 510.5, z - 215.5) < 45) return false;
    // Nor does anything lie on the shore's rind or beyond it where that view looks down on the shore.
    if (!o.stand && benchDistance(x, z) < 0.75 + half && Math.hypot(x + 510.5, z - 215.5) < 70) return false;
    q.setFromAxisAngle(UP, rng.range(0, Math.PI * 2));
    if (o.lean) {
      axis.set(o.lean[0], 0, o.lean[1]).normalize();
      tilt.setFromAxisAngle(axis, o.lean[2]);
    } else {
      const a = rng.range(0, Math.PI * 2);
      axis.set(Math.cos(a), 0, Math.sin(a));
      tilt.setFromAxisAngle(axis, rng.range(-0.4, 0.4));
    }
    q.premultiply(tilt);
    const [split, plain] = splitOf(k, x, z, size);
    const tone = k.part === 'land' ? LAND_TONE : 1;
    (((k.rocks[split] as Rock[][][])[plain] as Rock[][])[rng.int(SHAPES)] as Rock[]).push({ m: new THREE.Matrix4().compose(at, q, scale), seed: [rng.next(), size, base, rng.range(0.7, 1.2) * tone] });
    if (o.shade ?? size > 0.3) shades.push([x, z, half * 1.5, Math.min(0.75, 0.35 + 0.25 * size)]);
    return true;
  };
  // Sizes follow a power law: many small, few large.
  const sized = (lo: number, hi: number, power = 2.2): number => lo * Math.pow(hi / lo, Math.pow(rng.next(), power));
  // Rocks lie in drifts and leave bare lava between.
  const drift = (x: number, z: number, cell: number): number => noise(x / cell + 13, z / cell + 5);
  // Nothing may stand where the camera passes: the nearer the route, the smaller the rock.
  const fits = (x: number, z: number, size: number): boolean => size < 0.45 + 0.42 * routeDistance(x, z);
  // A big block lies where the ground can carry it: not on a riser, not hung over an edge.
  const level = (x: number, z: number, size: number): boolean => {
    const r = 0.6 * size;
    return Math.abs(height(x + r, z) - height(x - r, z)) + Math.abs(height(x, z + r) - height(x, z - r)) < 0.5 * size;
  };
  const [vx, , vz] = VIEW.position;
  const yaw = (VIEW.yaw * Math.PI) / 180;

  const BOX = { x0: -598, x1: -484, z0: 184, z1: 324 };
  for (let i = 0; i < 9000; i++) {
    const x = rng.range(BOX.x0, BOX.x1);
    const z = rng.range(BOX.z0, BOX.z1);
    const d = benchDistance(x, z);
    if (d < 0.2) continue;
    const reach = routeDistance(x, z);
    if (rng.next() > Math.exp(-reach / 16)) continue;
    if (drift(x, z, 5) + 0.5 * drift(x, z, 1.3) < 0.62 + 0.25 * rng.next()) continue;
    put(kinds.pebble, x, z, sized(0.05, 0.24, 1.6), { shade: false });
  }
  for (let i = 0; i < 13000; i++) {
    const x = rng.range(BOX.x0 - 20, BOX.x1 + 6);
    const z = rng.range(BOX.z0 - 30, BOX.z1 + 20);
    if (benchDistance(x, z) < 0.3) continue;
    if (rng.next() > Math.exp(-routeDistance(x, z) / 30)) continue;
    if (drift(x, z, 7) + 0.4 * drift(x, z, 2.1) < 0.46 + 0.3 * rng.next()) continue;
    const size = sized(0.22, 0.65);
    if (fits(x, z, size)) put(kinds.stone, x, z, size);
  }
  for (let i = 0; i < 9000; i++) {
    const x = rng.range(-660, -430);
    const z = rng.range(40, 400);
    const d = benchDistance(x, z);
    if (d < 0.5) continue;
    // More of them near the line and under the steep bank.
    const want = 0.25 + 0.75 * Math.exp(-d / 14);
    if (rng.next() > want) continue;
    if (drift(x, z, 11) + 0.3 * drift(x, z, 3) < 0.5 + 0.3 * rng.next()) continue;
    const size = sized(0.6, 1.9);
    if (fits(x, z, size)) put(kinds.block, x, z, size);
  }
  for (let i = 0; i < 2600; i++) {
    const x = rng.range(-640, -440);
    const z = rng.range(60, 390);
    const d = benchDistance(x, z);
    if (d < 1) continue;
    if (drift(x, z, 17) < 0.56 + 0.2 * rng.next()) continue;
    if (rng.next() > 0.3 + 0.7 * Math.exp(-d / 20)) continue;
    const size = sized(1.9, 5.5, 1.8);
    if (fits(x, z, size) && level(x, z, size)) put(kinds.hero, x, z, size, { sink: rng.range(0.3, 0.5) });
  }

  // Nothing lies clean on a floor: what broke off a block lies round its foot, from a fist to a head.
  const chips = (x: number, z: number, size: number): void => {
    const count = 4 + rng.int(7);
    for (let c = 0; c < count; c++) {
      const a = rng.range(0, Math.PI * 2);
      const r = size * rng.range(0.45, 0.85);
      const chip = sized(0.1, 0.5, 1.4);
      put(chip > 0.28 ? kinds.block : kinds.stone, x + Math.cos(a) * r, z + Math.sin(a) * r, chip, { sink: rng.range(0.25, 0.5), shade: false });
    }
  };

  // Plates of the old flows' crust, broken and tilted, and blocks of one to four metres among them: the camera's bench is broken rock, not gravel.
  for (let i = 0; i < 5200; i++) {
    const x = rng.range(BOX.x0 - 10, BOX.x1 + 6);
    const z = rng.range(BOX.z0 - 20, BOX.z1 + 12);
    if (benchDistance(x, z) < 0.8) continue;
    if (rng.next() > Math.exp(-routeDistance(x, z) / 38)) continue;
    if (drift(x, z, 13) + 0.3 * drift(x, z, 4) < 0.44 + 0.3 * rng.next()) continue;
    // The ropy sheet under the wide lens stays bare.
    if (Math.hypot(x - ROPY[0], z - ROPY[1]) < 15) continue;
    if (rng.next() < 0.62) {
      const size = sized(1.0, 3.6, 1.6);
      const a = rng.range(0, Math.PI * 2);
      if (fits(x, z, size) && level(x, z, size) && put(kinds.slab, x, z, size, { flat: rng.range(0.13, 0.26), sink: rng.range(0.1, 0.4), lean: [Math.cos(a), Math.sin(a), rng.range(0.08, 0.5)] })) chips(x, z, size);
    } else {
      const size = sized(1.0, 4.0, 1.7);
      if (fits(x, z, size) && level(x, z, size) && put(kinds.hero, x, z, size, { sink: rng.range(0.25, 0.48), flat: rng.range(0.55, 0.9) })) chips(x, z, size);
    }
  }

  // The foreground of the wide view: blocks of one to three metres below the camera, which passes well over them.
  for (let i = 0; i < 60; i++) {
    const ahead = rng.range(8, 40);
    const side = rng.range(-14, 12);
    const size = sized(0.9, 3, 1.5);
    if (Math.hypot(vx + Math.sin(yaw) * ahead + Math.cos(yaw) * side - ROPY[0], vz - Math.cos(yaw) * ahead + Math.sin(yaw) * side - ROPY[1]) < 13 + size) continue;
    put(kinds.hero, vx + Math.sin(yaw) * ahead + Math.cos(yaw) * side, vz - Math.cos(yaw) * ahead + Math.sin(yaw) * side, size, { sink: rng.range(0.3, 0.5) });
  }

  // The line view, from the last rocks of the shore: two or three boulders between the crag and the lens at the left edge of the frame,
  // and rubble on the last metres of shore before the lens.
  const lx = -510.5;
  const lz = 215.5;
  const ahead: [number, number] = [0.788, -0.616];
  const right: [number, number] = [0.616, 0.788];
  const near = (a: number, r: number): [number, number] => [lx + ahead[0] * a + right[0] * r, lz + ahead[1] * a + right[1] * r];
  for (const [a, r, size] of [
    [4.1, -3.3, 1.45],
    [6.2, -4.7, 1.2],
    [8.6, -5.6, 1.05],
  ] as [number, number, number][]) {
    const [x, z] = near(a, r);
    put(kinds.hero, x, z, size, { sink: rng.range(0.22, 0.32), flat: rng.range(0.75, 0.95) });
  }
  for (let i = 0; i < 520; i++) {
    const a = rng.range(0.6, 9);
    const r = rng.range(-5.5, 3.2);
    const [x, z] = near(a, r);
    if (benchDistance(x, z) < -0.3) continue;
    if (drift(x, z, 2.3) + 0.4 * drift(x, z, 0.7) < 0.42 + 0.3 * rng.next()) continue;
    const size = sized(0.1, 0.5, 1.5);
    put(size > 0.17 ? kinds.block : kinds.stone, x, z, size, { sink: rng.range(0.2, 0.42), shade: size > 0.2 });
  }
  // Set by hand, past every rule of the scatter: a rock given whole, by its place, its half sizes and its turn.
  // The island of the feeding group's view: its middle and the reach of its skirt, for whoever breaks the crust round it.
  const ISLAND: [number, number] = [-453.4, 241.2];
  const ISLAND_RADIUS = 9.5;
  const set = (k: Kind, x: number, y: number, z: number, sx: number, sy: number, sz: number, turn: THREE.Quaternion, tone: number, foot = 0.04): void => {
    at.set(x, y, z);
    scale.set(sx, sy, sz);
    const [split, plain] = splitOf(k, x, z, 2 * Math.max(sx, sz));
    (((k.rocks[split] as Rock[][][])[plain] as Rock[][])[rng.int(SHAPES)] as Rock[]).push({ m: new THREE.Matrix4().compose(at, turn, scale), seed: [rng.next(), 2 * Math.max(sx, sz), foot, tone] });
  };
  const yawTo = (tx: number, tz: number): THREE.Quaternion => new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(-tz, tx));

  // The skerry: a pressure ridge of the lake's own crust, plates tilted up against each other along the shore, on a thin dark rind.
  // The lake does not know it, so the rind is rock too: one plate lying flat in the crust under the rest (tone under 0.5 keeps the ash off it).
  {
    const [cx, cz] = SKERRY;
    const gx = benchDistance(cx + 1.5, cz) - benchDistance(cx - 1.5, cz);
    const gz = benchDistance(cx, cz + 1.5) - benchDistance(cx, cz - 1.5);
    const gl = Math.hypot(gx, gz) || 1;
    const tx = -gz / gl;
    const tz = gx / gl;
    const ax = -tz;
    const az = tx;
    const along = yawTo(tx, tz);
    // The rind: thin dark plates overlapping, so that its edge is broken and not a rectangle.
    for (let i = 0; i < 7; i++) {
      const u = -2.7 + (5.4 * i) / 6;
      const w = 1.25 - 0.45 * Math.abs(u) / 2.7;
      set(kinds.hero, cx + tx * u + ax * rng.range(-0.25, 0.25), 0.012 + 0.004 * i, cz + tz * u + az * rng.range(-0.25, 0.25), rng.range(0.85, 1.2), 0.05, w * rng.range(0.85, 1.15), along.clone().multiply(tilt.setFromAxisAngle(UP, rng.range(-0.6, 0.6))), 0.47);
    }
    // Plates 0.2 to 0.4 m thick, pushed up from both sides and leaning on each other along the crest.
    for (let i = 0; i < 8; i++) {
      const u = -2.3 + (4.6 * i) / 7 + rng.range(-0.2, 0.2);
      const side = i % 2 ? 1 : -1;
      const end = 1 - 0.4 * Math.pow(Math.abs(u) / 2.3, 2);
      const halfAcross = rng.range(0.75, 1.05) * end;
      const halfThick = rng.range(0.1, 0.2);
      const lean = rng.range(0.5, 0.85);
      const rise = halfAcross * Math.sin(lean);
      const y = Math.min(0.08 + 0.5 * rise, 1.12 - rise - halfThick * Math.cos(lean));
      const off = side * (halfAcross * Math.cos(lean) - 0.12 + 0.2 * rng.next());
      axis.set(tx, 0, tz);
      const q = new THREE.Quaternion().setFromAxisAngle(axis, side * lean).multiply(along).multiply(tilt.setFromAxisAngle(UP, rng.range(-0.28, 0.28)));
      set(kinds.slab, cx + tx * u + ax * off, y, cz + tz * u + az * off, rng.range(0.75, 1.15) * end, halfThick, halfAcross, q, rng.range(0.85, 1.1), 0.02);
    }
    for (let i = 0; i < 14; i++) {
      const u = rng.range(-3.1, 3.1);
      const off = rng.range(-1.5, 1.5);
      put(kinds.stone, cx + tx * u + ax * off, cz + tz * u + az * off, rng.range(0.2, 0.55), { sink: 0.45, flat: rng.range(0.3, 0.6), onLake: true, stand: true, shade: false });
    }
  }

  // The view of the feeding group: one dark pile of blocks low in the bottom left corner of its frame, 7 m ahead of the lens and left of its axis.
  // Only its top shows there, and the lens passes over and to the right of it.
  {
    const yaw3 = (44.5 * Math.PI) / 180;
    const fx = Math.sin(yaw3);
    const fz = -Math.cos(yaw3);
    const rx = Math.cos(yaw3);
    const rz = Math.sin(yaw3);
    const pile = (ahead: number, left: number, y: number, half: number, tall: number): void => {
      const x = -454.9 + fx * ahead - rx * left;
      const z = 250.3 + fz * ahead - rz * left;
      axis.set(rng.range(-1, 1), 0, rng.range(-1, 1)).normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(axis, rng.range(-0.34, 0.34)).multiply(tilt.setFromAxisAngle(UP, rng.range(0, 6.28)));
      set(kinds.hero, x, y, z, half * rng.range(0.9, 1.15), tall, half * rng.range(0.9, 1.15), q, rng.range(0.42, 0.62), y - tall);
    };
    for (const [ahead, left, y, half, tall] of [
      [7.2, 3.5, 2.3, 2.0, 2.7],
      [7.0, 2.7, 5.28, 0.78, 0.52],
      [8.5, 2.9, 4.5, 0.85, 0.75],
      [5.9, 2.6, 1.7, 1.15, 1.8],
      [9.6, 3.6, 1.4, 1.7, 1.6],
      [4.8, 4.6, 1.0, 1.7, 1.3],
      [7.6, 6.2, 1.2, 1.9, 1.5],
      [6.0, 4.9, 3.3, 1.1, 0.9],
      [11.4, 5.0, 0.5, 1.5, 0.8],
      [3.4, 6.6, 0.4, 1.4, 0.7],
      [6.4, 8.3, 0.4, 1.4, 0.7],
      [9.8, 7.2, 0.5, 1.5, 0.8],
      [2.6, 3.9, 0.3, 1.1, 0.55],
      [12.6, 3.4, 0.3, 1.0, 0.5],
    ] as [number, number, number, number, number][]) pile(ahead, left, y, half, tall);
    // It is an island the crust breaks against: a skirt of upturned plates and rubble round its foot.
    const [ix, iz] = ISLAND;
    for (let i = 0; i < 150; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(5.2, ISLAND_RADIUS) * (0.9 + 0.2 * noise(Math.cos(a) * 2 + 5, Math.sin(a) * 2 + 9));
      const x = ix + Math.cos(a) * r;
      const z = iz + Math.sin(a) * r;
      if (i < 46) put(kinds.slab, x, z, sized(1.2, 3.2, 1.5), { flat: rng.range(0.1, 0.2), sink: rng.range(0.2, 0.42), lean: [-Math.sin(a), Math.cos(a), rng.range(0.25, 0.75)], onLake: true, stand: true, shade: false });
      else put(i < 90 ? kinds.block : kinds.stone, x, z, sized(0.2, 1.1, 1.6), { sink: rng.range(0.25, 0.5), onLake: true, stand: true, shade: false });
    }
  }

  // The fan of fallen rock at the foot of the fall, either side of where the cascade lands: the biggest blocks have rolled to the bottom.
  for (let i = 0; i < 9000; i++) {
    const x = rng.range(-90, -20);
    const z = rng.range(-350, -322);
    if (x > -48 && x < -24) continue;
    const g = height(x, z);
    if (g < 0.05) continue;
    if (rng.next() < 0.5 * Math.max(0, (-76 - x) / 14)) continue;
    const up = Math.min(1, g / 8);
    const size = i < 2600 ? 0.5 + 2.5 * Math.pow(rng.next(), 2.2) * (1 - 0.7 * up) : sized(0.15, 1.6, 1.8);
    put(kinds.boulder, x, z, size, { shade: false, sink: rng.range(0.2, 0.45), flat: rng.range(0.5, 0.9) });
  }

  // The line: slabs of the bench's edge that have broken off and slumped onto the crust, and the rubble between them.
  for (let s = 1; s < SHORE_POINTS.length; s++) {
    const a = SHORE_POINTS[s - 1] as [number, number];
    const b = SHORE_POINTS[s] as [number, number];
    if (Math.max(a[1], b[1]) < 60 || Math.min(a[1], b[1]) > 400) continue;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const tx = (b[0] - a[0]) / l;
    const tz = (b[1] - a[1]) / l;
    // The lake is to the left of the way the shore's points run.
    const nx = tz;
    const nz = -tx;
    for (let u = 0; u < l; u += 0.55) {
      const x0 = a[0] + tx * u;
      const z0 = a[1] + tz * u;
      const busy = drift(x0, z0, 9);
      if (rng.next() < 0.22 + 0.5 * busy) {
        const out = rng.range(-1.4, 1.5);
        const size = sized(0.9, 3.6);
        const x = x0 + nx * out;
        const z = z0 + nz * out;
        if (fits(x, z, size)) put(kinds.slab, x, z, size, { flat: rng.range(0.16, 0.34), sink: rng.range(0.2, 0.45), lean: [tx, tz, -rng.range(0.05, 0.5) * (out > -0.5 ? 1 : 0.3)], onLake: true });
      }
      for (let k = 0; k < 2; k++) {
        if (rng.next() > 0.3 + 0.6 * busy) continue;
        const out = rng.range(-0.6, 2.4);
        const size = sized(0.2, 0.8);
        if (fits(x0 + nx * out, z0 + nz * out, size)) put(kinds.stone, x0 + nx * out, z0 + nz * out, size, { onLake: out > -0.5 });
      }
    }
  }

  // The aprons of the north wall and the foot of the buttress: fallen blocks, larger and thicker under the gullies, none in the path of the fall.
  for (let i = 0; i < 40000; i++) {
    const x = rng.range(-480, 640);
    const z = rng.range(-470, 130);
    const d = calderaDistance(x, z);
    const g = height(x, z);
    if (g < 0.5 || g > 150) continue;
    const onButtress = d < -2;
    if (!onButtress && (d < 1 || d > 150)) continue;
    if (onButtress && g > 70) continue;
    if (Math.abs(x - (MOUTH.x - 3)) < 26 && z > MOUTH.z - 10) continue;
    const e = 3;
    const steep = Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
    if (steep > 1.1) continue;
    const nearMouth = Math.abs(x - MOUTH.x) < 230 ? 1 : 0.4;
    if (rng.next() > nearMouth) continue;
    if (drift(x, z, 23) + 0.35 * drift(x, z, 6) < 0.56 + 0.3 * rng.next()) continue;
    // Where the fall's long lens reads the slope a block on the scree is a dot: most of what fell there is under it.
    if (Math.abs(x - MOUTH.x) < 250 && z < -290 && rng.next() > 0.1) continue;
    put(kinds.boulder, x, z, sized(1.0, 9, 3.4), { shade: false, sink: rng.range(0.5, 0.82), flat: rng.range(0.45, 0.8) });
  }

  // The toe of the north wall, as the long lenses see it: rubble of every size on the lobes of talus that run out into the lake, and off them onto the crust.
  // From a lens three metres up the shore is one level line whatever its plan, so blocks stand off it on the crust as well, thinning out over thirty metres.
  for (let i = 0; i < 44000; i++) {
    const x = rng.range(-330, 330);
    const z = rng.range(-352, -296);
    const g = height(x, z);
    if (g > 9) continue;
    const afloat = g < 0.05;
    if (Math.abs(x - (MOUTH.x - 6)) < (afloat ? 22 : 13)) continue;
    if (afloat && rng.next() > Math.exp(calderaDistance(x, z) / 13)) continue;
    if (drift(x, z, 14) + 0.4 * drift(x, z, 3.1) < 0.3 + 0.35 * rng.next()) continue;
    const size = afloat ? sized(0.5, 5.5, 1.4) : sized(0.25, 3.2, 2.0);
    // Outside the fall's long lens a stone under 0.7 m is less than a few pixels to every camera.
    if (size < 0.7 && (x < MOUTH.x - 225 || x > MOUTH.x + 130)) continue;
    put(kinds.boulder, x, z, size, { shade: false, sink: rng.range(0.2, 0.5), flat: afloat ? rng.range(0.4, 0.8) : rng.range(0.45, 0.9), onLake: afloat });
  }

  // The ledges of the wall beside the mouth carry what has fallen onto them.
  for (let i = 0; i < 9000; i++) {
    const x = rng.range(MOUTH.x - 190, MOUTH.x + 190);
    const z = rng.range(MOUTH.z - 30, MOUTH.z + 60);
    const g = height(x, z);
    if (g < 45 || g > 160) continue;
    const e = 2;
    const steep = Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
    if (steep > 0.55) continue;
    if (rng.next() < 0.2) put(kinds.boulder, x, z, sized(1.2, 4.5, 2.2), { shade: false, sink: rng.range(0.45, 0.7), flat: rng.range(0.5, 0.85) });
  }

  // The slope under the wide view: heaps of broken blocks from a fist to a car door, piled against each other where the bench sags, with dark gaps between them.
  for (let i = 0; i < 70; i++) {
    const ahead = rng.range(10, 85);
    const side = rng.range(-38, 16);
    const cx = vx + Math.sin(yaw) * ahead + Math.cos(yaw) * side;
    const cz = vz - Math.cos(yaw) * ahead + Math.sin(yaw) * side;
    const count = 14 + rng.int(30);
    const spread = rng.range(1.4, 4.2);
    if (Math.hypot(cx - ROPY[0], cz - ROPY[1]) < 16 + spread || benchDistance(cx, cz) < 2 + spread) continue;
    for (let c = 0; c < count; c++) {
      const a = rng.range(0, Math.PI * 2);
      const r = spread * Math.pow(rng.next(), 0.7);
      const x = cx + Math.cos(a) * r * 1.5;
      const z = cz + Math.sin(a) * r;
      const size = sized(0.3, 1.3, 1.3) * (1.15 - 0.45 * (r / spread));
      if (fits(x, z, size)) put(size > 0.5 ? kinds.block : kinds.stone, x, z, size, { sink: rng.range(0.05, 0.3), flat: rng.range(0.6, 0.95) });
    }
  }

  const material = new THREE.ShaderMaterial({ vertexShader: ROCK_VERTEX, fragmentShader: ROCK_FRAGMENT, uniforms: shared });
  const simple = new THREE.ShaderMaterial({ vertexShader: ROCK_VERTEX, fragmentShader: ROCK_FRAGMENT, uniforms: shared, defines: { SIMPLE: '' } });
  const geometries: THREE.BufferGeometry[] = [];
  const out = { bench: [] as THREE.Object3D[], land: [] as THREE.Object3D[] };
  const shapes = new Map<number, THREE.BufferGeometry>();
  Object.values(kinds).forEach((k, ki) => {
    k.rocks.forEach((byReading, split) => {
      byReading.forEach((byShape, plain) => {
        byShape.forEach((list, si) => {
          if (!list.length) return;
          const id = ((ki % 3) * SHAPES + si + 1) * 8 + split;
          let shape = shapes.get(id);
          if (!shape) {
            shape = rockShape((ki % 3) * SHAPES + si + 1, split);
            shapes.set(id, shape);
            geometries.push(shape);
          }
          // One mesh for each square of ground, so that the rocks no lens can see are never sent to be drawn.
          const cell = k.part === 'bench' ? 40 : 160;
          const squares = new Map<string, Rock[]>();
          for (const r of list) {
            const key = Math.floor((r.m.elements[12] as number) / cell) + ' ' + Math.floor((r.m.elements[14] as number) / cell);
            const square = squares.get(key);
            if (square) square.push(r);
            else squares.set(key, [r]);
          }
          for (const rocks of squares.values()) {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', shape.getAttribute('position'));
            g.setAttribute('normal', shape.getAttribute('normal'));
            g.setIndex(shape.getIndex());
            const seeds = new Float32Array(rocks.length * 4);
            rocks.forEach((r, i) => seeds.set(r.seed, i * 4));
            g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
            geometries.push(g);
            const mesh = new THREE.InstancedMesh(g, plain ? simple : material, rocks.length);
            rocks.forEach((r, i) => mesh.setMatrixAt(i, r.m));
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
            out[k.part].push(mesh);
          }
        });
      });
    });
  });

  const discs = ctx.rig.contactDiscs(shades.length);
  shades.forEach((s, i) => ctx.rig.setDisc(discs, i, s[0], s[1], s[2], s[3]));

  return {
    ...out,
    dispose: () => {
      for (const g of geometries) g.dispose();
      material.dispose();
      simple.dispose();
    },
  };
}
