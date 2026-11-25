// The loose rock of the land: pebbles, stones and blocks on the camera's bench, slabs slumped over the line, fallen blocks on the aprons of the wall.
// Every rock is one of a dozen dense shapes (rock-shape.ts), turned, scaled unevenly and sunk into the ground, with a shade under it in the rig's
// contact map. How finely a rock is drawn is chosen for every sample from its size on screen (see `choose` at the foot of this file).
import * as THREE from 'three';
import { secondsInPlace, shotById } from '../../../film/cut';
import { MOUTH, SHORE_POINTS, VIEW, benchDistance, calderaDistance } from '../layout';
import { UNIT } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import type { HeartContext } from '../shared/context';
import { ROPY, SKERRY, lineOpen, linePathDistance, noise, routeDistance, widePath } from './height';
import { ROCK_FRAGMENT, ROCK_VERTEX } from './rock-shader';
import { ROCK_LEVELS, rockShape, type RockKind, type RockShape } from './rock-shape';

type Height = (x: number, z: number) => number;

interface Rock {
  m: THREE.Matrix4;
  seed: [number, number, number, number];
  shape: number;
  part: 'bench' | 'land';
  /** Seconds of the place between which the rock is on the set. */
  from: number;
  to: number;
}

interface Kind {
  part: 'bench' | 'land';
  /** Out of ten: how many are slabs, how many angular blocks. The rest are rounded clinker. */
  slabs: number;
  blocks: number;
}

/** The dozen shapes: six lumps of clinker, three slabs of crust, three angular blocks. */
const CLINKERS = 6;
const SLABS = 3;
const BLOCKS = 3;
const SHAPE_KINDS: RockKind[] = [...Array<RockKind>(CLINKERS).fill('clinker'), ...Array<RockKind>(SLABS).fill('slab'), ...Array<RockKind>(BLOCKS).fill('block')];

/** The size on screen, in pixels of a frame 2160 high, from which a rock is drawn at each level of detail: 20, 80, 320, 1280, 5120 and 20,480 triangles.
 *  A triangle then covers 2 to 3 pixels, an edge of the outline 1 to 4, and under a pixel the rock is not drawn. */
const LEVEL_FROM = [0.9, 6, 14, 40, 90, 200];
/** The most rocks drawn at once at the two densest levels: the largest on screen get them. */
const LEVEL_MOST = [1e9, 1e9, 1e9, 1e9, 300, 40];
const REFERENCE_HEIGHT = 2160;

export function scatterRocks(ctx: HeartContext, shared: Record<string, THREE.IUniform>, height: Height): { bench: THREE.Object3D[]; land: THREE.Object3D[]; beforeSample(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void; dispose(): void } {
  const rng = ctx.rng('land/rocks');
  const shapes: RockShape[] = SHAPE_KINDS.map((k, i) => rockShape(i + 1, k));
  const kind = (part: 'bench' | 'land', slabs = 0, blocks = 0): Kind => ({ part, slabs, blocks });
  const kinds = {
    pebble: kind('bench'),
    lump: kind('bench'),
    stone: kind('bench', 0, 1),
    block: kind('bench', 0, 2.5),
    hero: kind('bench', 0, 6),
    slab: kind('bench', 10),
    boulder: kind('land', 0, 4),
    crag: kind('land', 0, 10),
  };
  const shapeOf = (k: Kind): number => {
    const r = rng.next() * 10;
    if (r < k.slabs) return CLINKERS + rng.int(SLABS);
    if (r < k.slabs + k.blocks) return CLINKERS + SLABS + rng.int(BLOCKS);
    return rng.int(CLINKERS);
  };
  const rocks: Rock[] = [];
  const ALWAYS: [number, number] = [-1e9, 1e9];
  const during = (shot: string): [number, number] => {
    const s = shotById(shot);
    return [secondsInPlace(UNIT, s.first) - 0.3 / 60, secondsInPlace(UNIT, s.last) + 0.7 / 60];
  };
  const shades: [number, number, number, number][] = [];

  const q = new THREE.Quaternion();
  const tilt = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const at = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const turned = new THREE.Matrix4();

  interface Options {
    flat?: number;
    sink?: number;
    lean?: [number, number, number];
    onLake?: boolean;
    shade?: boolean;
    /** Allowed to stand up in the open part of the line view. */
    stand?: boolean;
    tone?: number;
    /** Its long side lies this way (radians about the upright), and is this many times its width. */
    yaw?: number;
    long?: number;
    /** On the set for one shot only: seconds of the place, from and to. */
    only?: [number, number];
  }
  const turnAny = (): THREE.Quaternion => {
    // A turn about any axis, every turn as likely as another.
    const u = rng.next();
    const a = rng.range(0, Math.PI * 2);
    const b = rng.range(0, Math.PI * 2);
    return new THREE.Quaternion(Math.sqrt(1 - u) * Math.sin(a), Math.sqrt(1 - u) * Math.cos(a), Math.sqrt(u) * Math.sin(b), Math.sqrt(u) * Math.cos(b));
  };
  const put = (k: Kind, x: number, z: number, size: number, o: Options = {}): boolean => {
    const g = height(x, z);
    if (g < 0.05 && !o.onLake) return false;
    const base = Math.max(g, 0.04);
    const half = size / 2;
    const shape = shapeOf(k);
    const isSlab = SHAPE_KINDS[shape] === 'slab';
    // A slab's shape is already a plate, a little under half as thick as it is wide.
    const flat = isSlab ? Math.min(1, (o.flat ?? rng.range(0.13, 0.3)) / 0.42) : (o.flat ?? rng.range(0.55, 0.95));
    scale.set(half * rng.range(0.85, 1.3) * (o.long ?? 1), half * flat, half * rng.range(0.8, 1.15));
    if (isSlab || o.lean) {
      q.setFromAxisAngle(UP, o.yaw ?? rng.range(0, Math.PI * 2));
      if (o.lean) {
        axis.set(o.lean[0], 0, o.lean[1]).normalize();
        tilt.setFromAxisAngle(axis, o.lean[2]);
      } else {
        const a = rng.range(0, Math.PI * 2);
        axis.set(Math.cos(a), 0, Math.sin(a));
        tilt.setFromAxisAngle(axis, rng.range(-0.3, 0.3));
      }
      q.premultiply(tilt);
    } else {
      q.copy(turnAny());
    }
    // How high the turned and squashed rock stands, and how much of that is under the ground: a fifth to a third on the bench, up to half in the scree.
    turned.makeRotationFromQuaternion(q);
    const e = turned.elements;
    const sh = shapes[shape] as RockShape;
    const tall = 0.5 * (sh.high - sh.low) * (isSlab ? scale.y : Math.hypot((e[1] as number) * scale.x, (e[5] as number) * scale.y, (e[9] as number) * scale.z));
    const sunk = Math.min(k.part === 'land' ? 0.5 : 0.36, Math.max(0.2, o.sink ?? rng.range(0.2, 0.33)));
    at.set(x, base + tall * (1 - 2 * sunk), z);
    // The cameras' room: nothing within 3 m of the wide view's lens, nothing over 0.7 m under the line view's lens,
    // nothing standing up where the line view shows the mouth and the channel.
    const top = at.y + tall;
    const [off, lens] = widePath(x, z);
    if (Math.hypot(Math.max(0, off - half * 1.3), Math.max(0, lens - top)) < 3.2) return false;
    if (linePathDistance(x, z) < 1.5 + half * 1.3 && top > 0.68) return false;
    if (!o.stand && top > 1.3 && lineOpen(x, z)) return false;
    // Nothing of the bench's stands on the crag beside that lens: from below it would hang in the steam.
    if (!o.stand && g > 2.2 && Math.hypot(x + 510.5, z - 215.5) < (size > 1 ? 70 : 30)) return false;
    // Round that lens the picture has boulders of 0.3 to 1.2 m and nothing larger.
    if (!o.stand && size > 1.3 && Math.hypot(x + 510.5, z - 215.5) < 18) return false;
    // The line view's channel leaves the shore just ahead of its lens: nothing of the bench's lies on the moving crust there.
    if (!o.stand && lineOpen(x, z) && benchDistance(x, z) < (size > 0.45 ? 0.7 : 0.12) + half && Math.hypot(x + 510.5, z - 215.5) < 45) return false;
    // Nor does anything lie on the shore's rind or beyond it where that view looks down on the shore.
    if (!o.stand && benchDistance(x, z) < 0.75 + half && Math.hypot(x + 510.5, z - 215.5) < 70) return false;
    const [from, to] = o.only ?? ALWAYS;
    rocks.push({ m: new THREE.Matrix4().compose(at, q, scale), seed: [rng.next(), size, base, o.tone ?? rng.range(0.6, 1.25)], shape, part: k.part, from, to });
    if (o.shade ?? size > 0.3) shades.push([x, z, half * 1.5, Math.min(0.75, 0.35 + 0.25 * size)]);
    return true;
  };
  // A rock stood by hand: its shape, its place, the height of its top, its half width and how tall it is from top to buried foot.
  const stand = (shape: number, x: number, z: number, top: number, half: number, tall: number, tone: number, only: [number, number] = ALWAYS, part: 'bench' | 'land' = 'bench'): void => {
    const sh = shapes[shape] as RockShape;
    const sy = tall / (sh.high - sh.low);
    at.set(x, top - sh.high * sy, z);
    scale.set(half * rng.range(0.9, 1.15), sy, half * rng.range(0.9, 1.15));
    q.setFromAxisAngle(UP, rng.range(0, Math.PI * 2));
    rocks.push({ m: new THREE.Matrix4().compose(at, q, scale), seed: [rng.next(), 2 * half, Math.max(height(x, z), 0), tone], shape, part, from: only[0], to: only[1] });
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
    const count = 5 + rng.int(8);
    for (let c = 0; c < count; c++) {
      const a = rng.range(0, Math.PI * 2);
      const r = size * rng.range(0.4, 0.75);
      const chip = Math.max(0.05, size * sized(0.06, 0.3, 1.5));
      put(chip > 0.28 ? kinds.block : kinds.stone, x + Math.cos(a) * r, z + Math.sin(a) * r, chip, { sink: rng.range(0.25, 0.36), shade: false });
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
    // Round the line view the rock is boulders of scoria, not plates.
    const plates = Math.hypot(x + 510.5, z - 215.5) > 20;
    if (plates && rng.next() < 0.62) {
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

  // Its picture has boulders of 1 to 3 m in a few clusters on that slope, each with its rubble, and bare lava between.
  for (let i = 0; i < 9; i++) {
    const ahead = rng.range(10, 46);
    const side = rng.range(-13, 13);
    const cx = vx + Math.sin(yaw) * ahead + Math.cos(yaw) * side;
    const cz = vz - Math.cos(yaw) * ahead + Math.sin(yaw) * side;
    if (Math.hypot(cx - ROPY[0], cz - ROPY[1]) < 16) continue;
    const count = 3 + rng.int(4);
    for (let c = 0; c < count; c++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(0.4, 3.6);
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const size = sized(1, 3, 1.3);
      if (benchDistance(x, z) > 1.5 && put(kinds.hero, x, z, size, { sink: rng.range(0.25, 0.36), flat: rng.range(0.6, 0.9), tone: rng.range(0.75, 1.2) })) chips(x, z, size);
    }
  }

  // The line view, from the last rocks of the shore: two or three boulders between the crag and the lens at the left edge of the frame,
  // and rubble on the last metres of shore before the lens.
  const lx = -510.5;
  const lz = 215.5;
  const ahead: [number, number] = [0.788, -0.616];
  const right: [number, number] = [0.616, 0.788];
  const near = (a: number, r: number): [number, number] => [lx + ahead[0] * a + right[0] * r, lz + ahead[1] * a + right[1] * r];
  // Its picture has dark rounded boulders of scoria, 0.3 to 1.2 m, at the foot of the crag on the left, round the vent, and smaller ones
  // close under the lens along the bottom of the frame. No two alike: each is its own shape, turn and squash.
  for (const [a, r, size, flat] of [
    [5.6, -4.3, 1.1, 0.85],
    [7.4, -5.2, 1.2, 0.8],
    [9.4, -5.9, 1.05, 0.9],
    [6.3, -3.3, 0.6, 0.7],
    [8.3, -4.0, 0.8, 0.75],
    [7.6, -2.9, 0.42, 0.8],
    [10.6, -4.6, 0.9, 0.7],
    [11.8, -5.8, 1.15, 0.85],
    [9.4, -3.2, 0.5, 0.65],
    [12.6, -4.1, 0.7, 0.8],
    [4.6, -3.2, 0.55, 0.75],
    [13.9, -5.2, 0.95, 0.8],
  ] as [number, number, number, number][]) {
    const [x, z] = near(a, r);
    if (put(kinds.lump, x, z, size, { sink: rng.range(0.24, 0.33), flat })) chips(x, z, size);
  }
  for (let i = 0; i < 90; i++) {
    const a = rng.range(1.6, 5.2);
    const r = rng.range(-3.8, 1.1);
    const [x, z] = near(a, r);
    if (benchDistance(x, z) < 0.3) continue;
    put(kinds.lump, x, z, sized(0.18, 0.5, 1.4), { sink: rng.range(0.24, 0.33), flat: rng.range(0.6, 0.9) });
  }
  for (let i = 0; i < 700; i++) {
    const a = rng.range(0.6, 12);
    const r = rng.range(-6.5, 3.2);
    const [x, z] = near(a, r);
    if (benchDistance(x, z) < -0.3) continue;
    if (drift(x, z, 2.3) + 0.4 * drift(x, z, 0.7) < 0.42 + 0.3 * rng.next()) continue;
    const size = sized(0.06, 0.4, 1.5);
    put(kinds.lump, x, z, size, { sink: rng.range(0.2, 0.33), shade: size > 0.2 });
  }
  // Its picture's bottom edge is rock very near the lens, soft and dark: four boulders of clinker 0.9 to 1.9 m ahead and left of the axis, their tops
  // half a metre under the lens, which passes over and to the right of them. The view to the line, right of the middle, stays open.
  for (const [shape, a, r, top, half] of [
    [0, 1.9, -1.5, 1.15, 0.5],
    [3, 1.5, -1.0, 1.27, 0.45],
    [1, 1.15, -0.5, 1.26, 0.33],
    [4, 0.95, -0.27, 1.24, 0.2],
  ] as [number, number, number, number, number][]) {
    const [x, z] = near(a, r);
    stand(shape, x, z, top, half, (top - height(x, z)) * 1.35, rng.range(0.55, 0.8));
    shades.push([x, z, half * 1.5, 0.6]);
  }
  // Set by hand, past every rule of the scatter: a rock given whole, by its place, its half sizes and its turn.
  // The island of the feeding group's view: its middle and the reach of its skirt, for whoever breaks the crust round it.
  const ISLAND: [number, number] = [-453.4, 241.2];
  const ISLAND_RADIUS = 9.5;
  const set = (k: Kind, x: number, y: number, z: number, sx: number, sy: number, sz: number, turn: THREE.Quaternion, tone: number, foot = 0.04, only: [number, number] = ALWAYS): void => {
    const shape = shapeOf(k);
    at.set(x, y, z);
    scale.set(sx, SHAPE_KINDS[shape] === 'slab' ? sy / 0.42 : sy, sz);
    rocks.push({ m: new THREE.Matrix4().compose(at, turn, scale), seed: [rng.next(), 2 * Math.max(sx, sz), foot, tone], shape, part: k.part, from: only[0], to: only[1] });
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
    // Staged for that shot alone: the wide view's picture has open crust here.
    const staged = during('heart-02');
    const pile = (ahead: number, left: number, y: number, half: number, tall: number): void => {
      const x = -454.9 + fx * ahead - rx * left;
      const z = 250.3 + fz * ahead - rz * left;
      axis.set(rng.range(-1, 1), 0, rng.range(-1, 1)).normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(axis, rng.range(-0.34, 0.34)).multiply(tilt.setFromAxisAngle(UP, rng.range(0, 6.28)));
      set(kinds.hero, x, y, z, half * rng.range(0.9, 1.15), tall, half * rng.range(0.9, 1.15), q, rng.range(0.42, 0.62), y - tall, staged);
    };
    for (const [ahead, left, y, half, tall] of [
      [7.2, 3.5, 2.3, 2.0, 2.7],
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
    // The one that shows at the key: a boulder of clinker on the pile, 7 m from the lens, filling the bottom left corner of the frame out of focus.
    stand(2, -454.9 + fx * 7.0 - rx * 2.25, 250.3 + fz * 7.0 - rz * 2.25, 5.95, 0.95, 1.2, 0.36, staged);
    stand(5, -454.9 + fx * 7.0 - rx * 1.65, 250.3 + fz * 7.0 - rz * 1.65, 5.6, 0.42, 0.9, 0.32, staged);
    // It is an island the crust breaks against: a skirt of upturned plates and rubble round its foot.
    const [ix, iz] = ISLAND;
    for (let i = 0; i < 150; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(5.2, ISLAND_RADIUS) * (0.9 + 0.2 * noise(Math.cos(a) * 2 + 5, Math.sin(a) * 2 + 9));
      const x = ix + Math.cos(a) * r;
      const z = iz + Math.sin(a) * r;
      if (i < 46) put(kinds.slab, x, z, sized(1.2, 3.2, 1.5), { flat: rng.range(0.1, 0.2), sink: rng.range(0.2, 0.42), lean: [-Math.sin(a), Math.cos(a), rng.range(0.25, 0.75)], onLake: true, stand: true, shade: false, only: staged });
      else put(i < 90 ? kinds.block : kinds.stone, x, z, sized(0.2, 1.1, 1.6), { sink: rng.range(0.25, 0.5), onLake: true, stand: true, shade: false, only: staged });
    }
  }

  // The slopes beside the fall, as the longest lens sees them: no stone lies singly there. Angular blocks of 2 to 6 m stand in rows along the slope,
  // as ledges that have broken up, and in a heap at its foot, each with its rubble packed against its downhill side and black gaps between.
  const onSlope = (x: number, z: number): boolean => x > MOUTH.x - 150 && x < MOUTH.x + 120 && z > -460 && z < -324;
  {
    const e = 2;
    const fallen = (x: number, z: number, size: number, tone: number, a: number, long = 1): boolean =>
      put(kinds.crag, x, z, size, { shade: false, sink: rng.range(0.36, 0.5), flat: rng.range(0.6, 1.1), tone, yaw: -a, long, lean: [Math.cos(a), Math.sin(a), rng.range(-0.3, 0.3)] });
    for (let run = 0; run < 420; run++) {
      let x = rng.range(MOUTH.x - 150, MOUTH.x + 120);
      let z = rng.range(-456, -330);
      const left = x < MOUTH.x - 28;
      if (!left && x < MOUTH.x + 24) continue;
      if (!left && rng.next() < 0.5) continue;
      const g0 = height(x, z);
      if (g0 < 1 || g0 > 82) continue;
      const tone = rng.range(0.4, 0.95);
      const way = rng.next() < 0.5 ? 1 : -1;
      const length = rng.range(8, 40);
      for (let gone = 0; gone < length; ) {
        if (x > MOUTH.x - 28 && x < MOUTH.x + 24) break;
        const g = height(x, z);
        if (g < 0.6 || g > 84) break;
        const gx = height(x + e, z) - height(x - e, z);
        const gz = height(x, z + e) - height(x, z - e);
        const gl = Math.hypot(gx, gz);
        if (gl < 1e-3 || gl / (2 * e) > 1.6) break;
        // Along the slope, level, and the rubble down it.
        const tx = (-gz / gl) * way;
        const tz = (gx / gl) * way;
        const size = sized(0.7, 6.5, 2.6);
        if (fallen(x, z, size, tone * rng.range(0.7, 1.3), Math.atan2(tz, tx), rng.range(1.0, 1.35))) {
          const count = 1 + rng.int(4);
          for (let c = 0; c < count; c++) {
            const along = rng.range(-0.6, 0.6) * size;
            const down = rng.range(0.25, 0.9) * size;
            fallen(x + tx * along - (gx / gl) * down, z + tz * along - (gz / gl) * down, size * sized(0.14, 0.5, 1.4), tone * rng.range(0.75, 1.2), rng.range(0, 6.28));
          }
        }
        const pace = size * rng.range(0.7, 1.6);
        const off = rng.range(-0.25, 0.25) * size;
        x += tx * pace + (gx / gl) * off;
        z += tz * pace + (gz / gl) * off;
        gone += pace;
      }
    }
    // The heap at the foot, where the slope meets the lake.
    for (let i = 0; i < 2600; i++) {
      const x = rng.range(MOUTH.x - 150, MOUTH.x + 120);
      const z = rng.range(-352, -326);
      if (x > MOUTH.x - 28 && x < MOUTH.x + 24) continue;
      const g = height(x, z);
      if (g < 0.4 || g > 7) continue;
      if (drift(x, z, 13) + 0.3 * drift(x, z, 4) < 0.42 + 0.25 * rng.next()) continue;
      fallen(x, z, sized(0.6, 5.5, 2.4), rng.range(0.35, 1.0), rng.range(0, 6.28));
    }
  }

  // The fan of fallen rock at the foot of the fall, either side of where the cascade lands: the biggest blocks have rolled to the bottom.
  for (let i = 0; i < 9000; i++) {
    const x = rng.range(-90, -20);
    const z = rng.range(-350, -322);
    if (x > -48 && x < -24) continue;
    if (onSlope(x, z)) continue;
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
      if (Math.hypot(x0 + 510.5, z0 - 215.5) > 20 && rng.next() < 0.22 + 0.5 * busy) {
        const out = rng.range(-1.4, 1.5);
        const size = sized(0.9, 3.6);
        const x = x0 + nx * out;
        const z = z0 + nz * out;
        if (fits(x, z, size)) put(kinds.slab, x, z, size, { flat: rng.range(0.16, 0.34), sink: rng.range(0.2, 0.45), lean: [tx, tz, -rng.range(0.05, 0.5) * (out > -0.5 ? 1 : 0.3)], onLake: true });
      }
      // A row of chunks at the edge itself, where the wide view looks along the shore.
      if (rng.next() < 0.1 + 0.5 * busy) {
        const out = rng.range(-0.2, 1.3);
        const size = sized(0.5, 1.6, 1.5);
        if (fits(x0 + nx * out, z0 + nz * out, size)) put(kinds.block, x0 + nx * out, z0 + nz * out, size, { sink: rng.range(0.25, 0.36), onLake: out < 0.3 });
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
    if (onSlope(x, z)) continue;
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
    put(kinds.boulder, x, z, sized(1.0, 9, 3.4), { shade: false, sink: rng.range(0.3, 0.62), flat: rng.range(0.45, 0.8) });
  }

  // The toe of the north wall, as the long lenses see it: rubble of every size on the lobes of talus that run out into the lake, and off them onto the crust.
  // From a lens three metres up the shore is one level line whatever its plan, so blocks stand off it on the crust as well, thinning out over thirty metres.
  for (let i = 0; i < 44000; i++) {
    const x = rng.range(-330, 330);
    const z = rng.range(-352, -296);
    const g = height(x, z);
    if (g > 9) continue;
    const afloat = g < 0.05;
    if (!afloat && onSlope(x, z)) continue;
    if (Math.abs(x - (MOUTH.x - 6)) < (afloat ? 22 : 13)) continue;
    if (afloat && rng.next() > Math.exp(calderaDistance(x, z) / 13)) continue;
    if (drift(x, z, 14) + 0.4 * drift(x, z, 3.1) < 0.3 + 0.35 * rng.next()) continue;
    const size = afloat ? sized(0.5, 5.5, 1.4) : sized(0.25, 3.2, 2.0);
    put(kinds.boulder, x, z, size, { shade: false, sink: rng.range(0.2, 0.5), flat: afloat ? rng.range(0.4, 0.8) : rng.range(0.45, 0.9), onLake: afloat });
  }

  // The ledges of the wall beside the mouth carry what has fallen onto them.
  for (let i = 0; i < 9000; i++) {
    const x = rng.range(MOUTH.x - 190, MOUTH.x + 190);
    const z = rng.range(MOUTH.z - 30, MOUTH.z + 60);
    if (onSlope(x, z)) continue;
    const g = height(x, z);
    if (g < 45 || g > 160) continue;
    const e = 2;
    const steep = Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
    if (steep > 0.55) continue;
    put(kinds.boulder, x, z, sized(1.2, 4.5, 2.2), { shade: false, sink: rng.range(0.25, 0.5), flat: rng.range(0.5, 0.85) });
  }

  const discs = ctx.rig.contactDiscs(shades.length);
  shades.forEach((s, i) => ctx.rig.setDisc(discs, i, s[0], s[1], s[2], s[3]));

  const drawn = draw(ctx, shared, shapes, rocks);
  return {
    bench: drawn.bench,
    land: drawn.land,
    beforeSample: drawn.beforeSample,
    dispose: () => {
      drawn.dispose();
      for (const s of shapes) for (const g of s.levels) g.dispose();
    },
  };
}

interface Bucket {
  mesh: THREE.InstancedMesh;
  seeds: THREE.InstancedBufferAttribute;
  room: number;
  count: number;
}

/**
 * Draws the rocks. For every sample, each rock in view is put at the level of detail its size on screen asks for (`choose`), so a rock that
 * fills a tenth of the frame has twenty thousand triangles and the same rock seen from across the lake has twenty. The choice depends on
 * the camera and the time alone, so a frame is the same whenever it is rendered.
 */
function draw(ctx: HeartContext, shared: Record<string, THREE.IUniform>, shapes: RockShape[], rocks: Rock[]): { bench: THREE.Object3D[]; land: THREE.Object3D[]; beforeSample(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void; dispose(): void } {
  const fine = new THREE.ShaderMaterial({ vertexShader: ROCK_VERTEX, fragmentShader: ROCK_FRAGMENT, uniforms: shared });
  const simple = new THREE.ShaderMaterial({ vertexShader: ROCK_VERTEX, fragmentShader: ROCK_FRAGMENT, uniforms: shared, defines: { SIMPLE: '' } });
  const n = rocks.length;
  const groups = 2 * shapes.length;
  const groupOf = new Uint16Array(n);
  const centre = new Float32Array(n * 3);
  const reach = new Float32Array(n);
  const across = new Float32Array(n);
  const matrices = new Float32Array(n * 16);
  const seeds = new Float32Array(n * 4);
  const inGroup = new Uint32Array(groups);
  rocks.forEach((r, i) => {
    const e = r.m.elements;
    const g = (r.part === 'bench' ? 0 : shapes.length) + r.shape;
    groupOf[i] = g;
    inGroup[g] = (inGroup[g] as number) + 1;
    matrices.set(e, i * 16);
    seeds.set(r.seed, i * 4);
    centre[i * 3] = e[12] as number;
    centre[i * 3 + 1] = e[13] as number;
    centre[i * 3 + 2] = e[14] as number;
    const sx = Math.hypot(e[0] as number, e[1] as number, e[2] as number);
    const sy = Math.hypot(e[4] as number, e[5] as number, e[6] as number);
    const sz = Math.hypot(e[8] as number, e[9] as number, e[10] as number);
    reach[i] = Math.max(sx, sy, sz) * (shapes[r.shape] as RockShape).reach;
    // The width it shows: of its three half sizes, the middle one, doubled.
    across[i] = 2 * 0.9 * (sx + sy + sz - Math.max(sx, sy, sz) - Math.min(sx, sy, sz));
  });

  const out = { bench: [] as THREE.Object3D[], land: [] as THREE.Object3D[] };
  const geometries: THREE.BufferGeometry[] = [];
  const buckets: (Bucket | null)[] = [];
  for (let g = 0; g < groups; g++) {
    const shape = shapes[g % shapes.length] as RockShape;
    for (let level = 0; level < ROCK_LEVELS; level++) {
      const room = Math.min(inGroup[g] as number, LEVEL_MOST[level] as number);
      if (!room) {
        buckets.push(null);
        continue;
      }
      const from = shape.levels[level] as THREE.BufferGeometry;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', from.getAttribute('position'));
      geometry.setAttribute('normal', from.getAttribute('normal'));
      geometry.setAttribute('aCave', from.getAttribute('aCave'));
      geometry.setIndex(from.getIndex());
      const seedAttribute = new THREE.InstancedBufferAttribute(new Float32Array(room * 4), 4);
      seedAttribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('aSeed', seedAttribute);
      geometries.push(geometry);
      const mesh = new THREE.InstancedMesh(geometry, level >= 3 ? fine : simple, room);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.count = 0;
      out[g < shapes.length ? 'bench' : 'land'].push(mesh);
      buckets.push({ mesh, seeds: seedAttribute, room, count: 0 });
    }
  }

  const want = new Int8Array(n);
  const pixels = new Float32Array(n);
  const view = new THREE.Matrix4();
  const planes = new Float32Array(24);
  const last = new Float32Array(33).fill(NaN);

  const choose = (camera: THREE.Camera): void => {
    // Who is on the set follows the stage clock (the camera's shot), not the world's seconds.
    const seconds = stagedSeconds();
    const cm = camera.matrixWorld.elements;
    const pm = camera.projectionMatrix.elements;
    let same = last[32] === seconds;
    for (let i = 0; i < 16 && same; i++) same = last[i] === cm[i] && last[16 + i] === pm[i];
    if (same) return;
    last.set(cm, 0);
    last.set(pm, 16);
    last[32] = seconds;

    // The six planes of the view, pointing inward.
    view.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const v = view.elements;
    for (let p = 0; p < 6; p++) {
      const row = p >> 1;
      const sign = p & 1 ? -1 : 1;
      const a = (v[3] as number) + sign * (v[row] as number);
      const b = (v[7] as number) + sign * (v[4 + row] as number);
      const c = (v[11] as number) + sign * (v[8 + row] as number);
      const d = (v[15] as number) + sign * (v[12 + row] as number);
      const l = Math.hypot(a, b, c) || 1;
      planes[p * 4] = a / l;
      planes[p * 4 + 1] = b / l;
      planes[p * 4 + 2] = c / l;
      planes[p * 4 + 3] = d / l;
    }
    const ex = cm[12] as number;
    const ey = cm[13] as number;
    const ez = cm[14] as number;
    const focal = (REFERENCE_HEIGHT / 2) * (pm[5] as number);
    const crowd: number[][] = [[], []];
    for (let i = 0; i < n; i++) {
      want[i] = -1;
      const r = rocks[i] as Rock;
      if (seconds < r.from || seconds > r.to) continue;
      const x = centre[i * 3] as number;
      const y = centre[i * 3 + 1] as number;
      const z = centre[i * 3 + 2] as number;
      // A little room round the rock, for the lens that looks from beside the camera's middle.
      const room = (reach[i] as number) * 1.15 + 0.05;
      let seen = true;
      for (let p = 0; p < 24 && seen; p += 4) seen = (planes[p] as number) * x + (planes[p + 1] as number) * y + (planes[p + 2] as number) * z + (planes[p + 3] as number) > -room;
      if (!seen) continue;
      const px = ((across[i] as number) * focal) / Math.max(0.3, Math.hypot(x - ex, y - ey, z - ez));
      if (px < (LEVEL_FROM[0] as number)) continue;
      let level = 0;
      while (level < ROCK_LEVELS - 1 && px >= (LEVEL_FROM[level + 1] as number)) level++;
      want[i] = level;
      pixels[i] = px;
      if (level >= ROCK_LEVELS - 2) (crowd[level - (ROCK_LEVELS - 2)] as number[]).push(i);
    }
    // The two densest levels go to the largest on screen; the rest step down one.
    for (let c = 1; c >= 0; c--) {
      const level = ROCK_LEVELS - 2 + c;
      const list = crowd[c] as number[];
      const most = LEVEL_MOST[level] as number;
      if (list.length <= most) continue;
      list.sort((a, b) => (pixels[b] as number) - (pixels[a] as number) || a - b);
      for (let k = most; k < list.length; k++) {
        const i = list[k] as number;
        want[i] = level - 1;
        if (c === 1) (crowd[0] as number[]).push(i);
      }
    }
    for (const b of buckets) if (b) b.count = 0;
    for (let i = 0; i < n; i++) {
      let level = want[i] as number;
      if (level < 0) continue;
      let b = buckets[(groupOf[i] as number) * ROCK_LEVELS + level] as Bucket;
      // A group's densest buckets hold fewer than the group: the overflow steps down.
      while (b.count >= b.room) b = buckets[(groupOf[i] as number) * ROCK_LEVELS + --level] as Bucket;
      const at = b.count++;
      (b.mesh.instanceMatrix.array as Float32Array).set(matrices.subarray(i * 16, i * 16 + 16), at * 16);
      (b.seeds.array as Float32Array).set(seeds.subarray(i * 4, i * 4 + 4), at * 4);
    }
    for (const b of buckets) {
      if (!b) continue;
      b.mesh.count = b.count;
      if (!b.count) continue;
      b.mesh.instanceMatrix.clearUpdateRanges();
      b.mesh.instanceMatrix.addUpdateRange(0, b.count * 16);
      b.mesh.instanceMatrix.needsUpdate = true;
      b.seeds.clearUpdateRanges();
      b.seeds.addUpdateRange(0, b.count * 4);
      b.seeds.needsUpdate = true;
    }
  };

  // The scene calls this at the start of every render of it, before it looks for what to draw: the one moment at which the camera
  // of the sample is known to a part of the land. Whatever the scene did there before, it still does.
  type Before = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, target: unknown) => void;
  const host = ctx.scene as unknown as { onBeforeRender: Before };
  const before = host.onBeforeRender;
  host.onBeforeRender = (renderer, scene, camera, target) => {
    before.call(ctx.scene, renderer, scene, camera, target);
    choose(camera);
  };

  return {
    ...out,
    beforeSample: (_renderer: THREE.WebGLRenderer, camera: THREE.Camera) => choose(camera),
    dispose: () => {
      host.onBeforeRender = before;
      for (const g of geometries) g.dispose();
      fine.dispose();
      simple.dispose();
    },
  };
}
