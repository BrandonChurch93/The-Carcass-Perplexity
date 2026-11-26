// The land of the Ribs: the floor of the strait, the blades that stand in it, the weed that hangs from them to the tide line, the ledges of
// the colony's rock and the loose rock on the floor.
import * as THREE from 'three';
import { resolve } from '../../../core/cameras';
import { keyPart, shotById } from '../../../film/cut';
import { shots } from '../cameras';
import { RIBS, ribByName, weedPoint, type Rib } from '../layout';
import { COLONY, DROWNED, LEVELS, STATIONS } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { RIG_VERTEX } from '../shared/glsl';
import { LAND } from '../shared/rig';
import { bed } from './height';
import { fbm3, noise3, smooth } from './noise';
import { bladeShape, worldSpace, roundSpace } from './blade';
import { BOULDER_FRAGMENT, GROUND_FRAGMENT, MIRROR_FRAGMENT, MIRROR_VERTEX, ROCK_FRAGMENT, ROCK_VERTEX, WEED_FRAGMENT, WEED_VERTEX } from './shaders';
import { archShape, boulderShape, floorShape, lathe, lines, relief, skirtShape, turns, weedLump, weedTier, weedTop } from './shapes';

export const PARTS = ['land', 'ribs', 'weed', 'ledges', 'rocks'] as const;

export { bed };

// How fine each blade is cut, and the metres of one repeat of its stone: the near ones show a hand's breadth, the far ones a house.
const BLADE: Record<string, { around: number; fine: number; coarse?: number; grain: number }> = {
  L1: { around: 420, fine: 1.2, coarse: 2.2, grain: 5 },
  R1: { around: 420, fine: 1.8, coarse: 2.4, grain: 12 },
  R2: { around: 320, fine: 1.8, coarse: 2.2, grain: 12 },
  L2: { around: 160, fine: 1.8, coarse: 2.2, grain: 14 },
  L3: { around: 200, fine: 1.8, coarse: 2.2, grain: 12 },
  R3: { around: 192, fine: 2, grain: 16 },
  S: { around: 192, fine: 2, grain: 16 },
  OL: { around: 256, fine: 2, grain: 12 },
  OR: { around: 256, fine: 2, grain: 12 },
};

interface Stack {
  x: number;
  z: number;
  foot: number;
  top: number;
  height: number;
}

// A stack of the gate is rock first: a pillar broken into flat faces, built of beds a few metres thick; each bed stands out or back from
// the one under it, so that there are ledges for weed to hang from and overhangs with bare wet rock under them.
const BED = 6.5;
function stackRadius(s: Stack, y: number, angle: number): number {
  const base = s.foot + (s.top - s.foot) * smooth(-10, s.height, y);
  const seed = s.x * 0.013 + s.z * 0.007;
  let r = base * 1.15;
  for (let k = 0; k < 7; k++) {
    const a = k * 0.8976 + 1.3 * noise3(k * 1.7 + 0.5, seed, 0.5);
    const d = base * (0.74 + 0.36 * noise3(k * 2.3 + 0.5, seed, 5.5)) * (1 + 0.3 * (noise3(k * 1.1 + 0.5, y / 45, seed) - 0.5));
    const c = Math.cos(angle - a);
    if (c > 0.2) r = Math.min(r, d / c);
  }
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const t = (y + 2.5 * noise3(ca * 1.5 + seed, sa * 1.5, 3.5)) / BED;
  const band = Math.floor(t);
  const f = t - band;
  const proud = (k: number): number => 2.6 * noise3(k * 1.9 + 0.5, ca * 2.2 + seed, sa * 2.2) * smooth(0.3, 0.6, noise3(k * 0.7 + 0.5, ca * 0.9 + seed, sa * 0.9 + 7));
  // The bed keeps its place over its whole thickness and gives way to the next in its last tenth.
  return r + proud(band) + (proud(band + 1) - proud(band)) * smooth(0.9, 1, f);
}

function stackRock(s: Stack): THREE.BufferGeometry {
  const profile: [number, number][] = [];
  for (let y = -10; y < s.height; y += 0.8) profile.push([y, s.foot + (s.top - s.foot) * smooth(-10, s.height, y)]);
  profile.push([s.height, s.top * 0.9], [s.height + 2.5, s.top * 0.55], [s.height + 3.4, 0.01]);
  return lathe(s.x, s.z, profile, 180, (y, r, angle) => {
    if (r <= 1 || y >= s.height) return [y, Math.max(0.01, r)];
    const base = stackRadius(s, y, angle);
    const x = s.x + Math.cos(angle) * base;
    const z = s.z + Math.sin(angle) * base;
    const d = 0.45 * relief(x * 1.6, y * 1.6, z * 1.6) + 1.6 * (fbm3(x / 9, y / 14, z / 9, 2) - 0.5);
    return [y, Math.max(0.01, base + d)];
  });
}

function stackWeed(x0: number, z0: number, radiusAt: (y: number, angle: number) => number, around: number, proud = 2.2): THREE.BufferGeometry {
  const rows = 30;
  const span = LEVELS.tide + 5;
  const profile: [number, number][] = [];
  // The radius here only tells the sheet how far round the weed goes, for the size of its picture.
  for (let j = 0; j <= rows; j++) profile.push([(j / rows) * span, radiusAt(10, 0) + 3]);
  const g = lathe(x0, z0, profile, around, (run, _r, angle) => {
    const f = run / span;
    const far = radiusAt(LEVELS.tide, angle);
    const top = weedTop(x0 + Math.cos(angle) * far, z0 + Math.sin(angle) * far);
    const y = -5 + (top + 5) * f;
    const tuck = smooth(0.9, 1, f);
    const base = radiusAt(Math.max(0, y), angle);
    const x = x0 + Math.cos(angle) * base;
    const z = z0 + Math.sin(angle) * base;
    return [y, base + (proud + 1.5 * smooth(12, 0, y) + 0.6 * weedLump(x, y, z) + 0.2 * weedTier(x, y, z)[0]) * (1 - tuck) - 2.5 * tuck];
  });
  // v is counted down from the top of the weed, as on the blades' skirts.
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) - span);
  return g;
}

function colonyRock(): THREE.BufferGeometry {
  const { x, z, top, step, radiusAt } = COLONY;
  const profile: [number, number][] = [];
  const kinds: number[] = [];
  const tierOf: number[] = [];
  const firstTier = Math.floor((LEVELS.tide - 8) / step);
  for (let y = -10; y < firstTier * step; y += 3) {
    profile.push([y, radiusAt(y) + 0.6]);
    kinds.push(0);
    tierOf.push(0);
  }
  const tiers = Math.round(top / step);
  for (let k = firstTier; k < tiers; k++) {
    const y = k * step;
    const r = radiusAt(y + step);
    // A riser from its foot to the slab that lies on it; the slab's under side, its broken outer edge, and the level part of the ledge
    // (the 1.7 m against the next riser, where the colony stands).
    profile.push([y, r], [y + step * 0.45, r + 0.12], [y + step - 0.5, r - 0.1], [y + step - 0.34, r], [y + step, r], [y + step, r - 0.4]);
    kinds.push(1, 2, 3, 4, 5, 6);
    for (let i = 0; i < 6; i++) tierOf.push(k);
  }
  profile.push([top + 0.4, 0.01]);
  kinds.push(0);
  tierOf.push(0);
  // The slabs: each ledge is a row of blocks of its own lengths; a block stands out over the riser or is broken back, and tips down or up.
  const slab = (angle: number, k: number): [number, number] => {
    const length = 2.6 + 4.5 * noise3(k * 1.71, 3.3, 0.5);
    const way = (angle * 62) / length + 17 * noise3(k * 0.37, 9.1, 2.5);
    const cell = Math.floor(way);
    const edge = Math.min(way - cell, cell + 1 - way) * length;
    const pick = noise3(cell * 3.73 + 0.5, k * 2.91 + 0.5, 4.5);
    const out = -0.35 + 1.45 * smooth(0.3, 0.75, pick);
    const tip = 0.5 * (noise3(cell * 5.19 + 0.5, k * 1.37 + 0.5, 8.5) - 0.42);
    // The joint between two blocks is a notch a hand wide.
    return [out - 0.5 * (1 - smooth(0, 0.35, edge)), tip];
  };
  return lathe(x, z, profile, 720, (y, r, angle, row) => {
    const kind = kinds[row] as number;
    if (kind === 0) return [y, r];
    const k = tierOf[row] as number;
    const px = x + Math.cos(angle) * r;
    const pz = z + Math.sin(angle) * r;
    const wide = 0.9 * (noise3(px / 9, y / 9, pz / 9) - 0.5) + 1.4 * (noise3(px / 23, y / 40, pz / 23) - 0.5);
    const block = noise3(px / 1.7, y / 2.1, pz / 1.7) - 0.5;
    // A ledge keeps its height and its inner corner to a hand's width, so that what nests on it stands on it; the riser and the edge are broken.
    if (kind === 1) return [y + 0.08 * block, r + 0.2 * block];
    if (kind === 6) return [y + 0.06 * block, r];
    // Hollows where a block has dropped out of a riser: dark under the ledge above.
    const gone = 0.9 * smooth(0.55, 0.8, noise3(px / 3.4 + 1.9, y / 2.6, pz / 3.4));
    if (kind === 2) return [y, r + 0.3 * wide + 0.45 * block - gone + 0.2 * (noise3(px / 0.5, y / 0.5, pz / 0.5) - 0.5)];
    const [out, tip] = slab(angle, k);
    if (kind === 3) return [y, r + 0.3 * wide + 0.3 * block - 0.5 * gone + 0.4 * Math.min(out, 0)];
    const ragged = 0.25 * (noise3(px / 0.8, y, pz / 0.8) - 0.5);
    if (kind === 4) return [y - Math.max(tip, -0.1), r + out + ragged - 0.12];
    return [y - tip + 0.05 * block, r + out + ragged];
  });
}

export function create(ctx: Context): Piece {
  ctx.rig.setLand(bed);
  const tex = ctx.assets.texture;
  // The Builder's material pictures of the place: bone-stone for the blades, coursed ledge for the colony, hanging weed, the wet flat, shore rock.
  const rockC = tex('mat/bone.jpg');
  const rockN = tex('mat/bone-nh.png', { kind: 'data' });
  const weedC = tex('mat/weed.jpg');
  const weedN = tex('mat/weed-nh.png', { kind: 'data' });
  const sandC = tex('mat/flat.jpg', { anisotropy: 2 });
  const shingleC = tex('mat/shingle.jpg', { anisotropy: 4 });
  const shingleN = tex('mat/shingle-nh.png', { kind: 'data', anisotropy: 4 });
  const plateC = tex('mat/plate.jpg', { anisotropy: 4 });
  const plateN = tex('land/plate-nh.png', { kind: 'data', anisotropy: 4 });
  const wallC = tex('mat/wall.jpg', { anisotropy: 4 });
  const wallN = tex('land/wall-nh.png', { kind: 'data', anisotropy: 4 });
  const ledgeC = tex('mat/ledge.jpg');
  const ledgeN = tex('mat/ledge-nh.png', { kind: 'data' });
  const colonyC = tex('mat/colony.jpg', { anisotropy: 4 });
  const colonyN = tex('land/colony-nh.png', { kind: 'data', anisotropy: 4 });
  for (const t of [plateC, plateN, wallC, wallN, colonyC, colonyN]) {
    t.wrapS = THREE.MirroredRepeatWrapping;
    t.wrapT = THREE.MirroredRepeatWrapping;
  }
  // The land's own pictures made from the Builder's sheets (assets-src/ribs/land/make-sheets.py): the fin drawn out flat, slopes of the plates.
  const finC = tex('land/fin.jpg', { repeat: false });
  const finN = tex('land/fin-nh.png', { kind: 'data', repeat: false });
  const boulderC = tex('mat/rock.jpg');
  const boulderN = tex('mat/rock-nh.png', { kind: 'data' });

  const material = (vertexShader: string, fragmentShader: string, own: Record<string, THREE.IUniform>): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { ...ctx.rig.uniforms, ...own } });

  const ground = material(RIG_VERTEX, GROUND_FRAGMENT, { tPlate: { value: plateC }, tPlateN: { value: plateN }, tShingle: { value: shingleC }, tShingleN: { value: shingleN }, tSand: { value: sandC }, uPool: { value: LEVELS.pool } });
  const stone = (grain: number, lift: number): THREE.ShaderMaterial =>
    material(ROCK_VERTEX, ROCK_FRAGMENT, {
      tRock: { value: rockC },
      tRockN: { value: rockN },
      tWide: { value: grain > 0 ? finC : rockC },
      tWideN: { value: grain > 0 ? finN : rockN },
      uFin: { value: grain > 0 ? 1 : 0 },
      uLift: { value: lift },
      tWeed: { value: weedC },
      uTide: { value: LEVELS.tide },
      uTier: { value: 0 },
      uGrain: { value: new THREE.Vector2(Math.abs(grain), Math.abs(grain) * 4.7) },
      uRockTint: { value: grain > 0 ? new THREE.Vector3(1.35, 1.33, 1.3) : new THREE.Vector3(1.75, 1.72, 1.66) },
    });
  const stones = new Map<number, THREE.ShaderMaterial>();
  const stoneOf = (grain: number, lift = 4): THREE.ShaderMaterial => {
    const key = grain * 64 + lift;
    let m = stones.get(key);
    if (!m) {
      m = stone(grain, lift);
      stones.set(key, m);
    }
    return m;
  };
  // A grain below zero is stone that is no blade: it has no sheet of its own.
  const rock = stoneOf(-12);
  const roostRock = material(ROCK_VERTEX, ROCK_FRAGMENT, { tRock: { value: colonyC }, tRockN: { value: colonyN }, tWide: { value: ledgeC }, tWideN: { value: ledgeN }, uFin: { value: 0 }, uLift: { value: 0 }, tWeed: { value: weedC }, uTide: { value: LEVELS.tide }, uTier: { value: COLONY.step }, uGrain: { value: new THREE.Vector2(27, 6.3) }, uRockTint: { value: new THREE.Vector3(2.7, 2.65, 2.55) } });
  const hangs = (proud: number, bare = 0): THREE.ShaderMaterial =>
    material(WEED_VERTEX, WEED_FRAGMENT, { tWall: { value: wallC }, tWallN: { value: wallN }, tWeed: { value: weedC }, tWeedN: { value: weedN }, tBare: { value: boulderC }, tBareN: { value: boulderN }, uProud: { value: proud }, uBare: { value: bare } });
  // The near cliff's weed is cut fine enough to carry the hanks of the sheet; the others' is not.
  const weed = hangs(0.5);
  const weedNear = hangs(0.9);
  // The gate's stacks: weed in clumps, bare rock between.
  const weedGate = hangs(0.5, 1);
  const boulder = material(RIG_VERTEX, BOULDER_FRAGMENT, { tBoulder: { value: boulderC }, tBoulderN: { value: boulderN }, tWeed: { value: weedC }, uWeedy: { value: 1 }, uPool: { value: LEVELS.pool } });
  const pebble = material(RIG_VERTEX, BOULDER_FRAGMENT, { tBoulder: { value: shingleC }, tBoulderN: { value: shingleN }, tWeed: { value: weedC }, uWeedy: { value: 0 }, uPool: { value: LEVELS.pool } });

  // The floor: fine where the cameras stand on it, coarse out to the edge of what the rig knows, where it lies deep under the sea.
  const xs = lines(LAND.minX, LAND.maxX, -340, 420, 6, 60);
  const zs = lines(LAND.minZ, LAND.maxZ, -1560, 260, 6, 60);
  // The mesh lies under the lowest the fine relief can go, so that no sheet of water is cut by a triangle: the shader draws the bed where it is.
  const floor = new THREE.Mesh(floorShape(xs, zs, (x, z) => bed(x, z) - 0.14), ground);
  // The blades mirrored in the wet floor, the far ones first.
  const glass = new THREE.ShaderMaterial({
    vertexShader: MIRROR_VERTEX,
    fragmentShader: MIRROR_FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, uPool: { value: LEVELS.pool }, uTide: { value: LEVELS.tide } },
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const mirrors = new THREE.Group();
  [...(RIBS as Rib[])].sort((a, b) => a.z - b.z).forEach((rib, i) => {
    const image = new THREE.Mesh(bladeShape(rib, { around: 40, fine: 7 }), glass);
    image.frustumCulled = false;
    image.renderOrder = 2 + i * 0.01;
    mirrors.add(image);
  });
  ctx.scene.add(ctx.parts.built('land', floor, mirrors));

  const blades = new THREE.Group();
  const skirts = new THREE.Group();
  const add = (group: THREE.Group, geometry: THREE.BufferGeometry, stuff: THREE.Material): THREE.Mesh => {
    const mesh = new THREE.Mesh(geometry, stuff);
    group.add(mesh);
    return mesh;
  };
  for (const rib of RIBS as Rib[]) {
    const cut = BLADE[rib.name] ?? { around: 128, fine: 2.5, grain: 30 };
    add(blades, bladeShape(rib, cut), stoneOf(cut.grain, Math.min(8, 0.11 * rib.b + 0.02 * rib.a)));
    const phis = rib.name === 'L1' ? turns(200, { from: -0.3, to: 1.3, count: 640 }) : turns(160);
    add(skirts, skirtShape(rib, { phis, rows: rib.name === 'L1' ? 84 : 32, ...(rib.name === DROWNED.rib ? { calm: [DROWNED.phi, DROWNED.height] as [number, number] } : {}) }), rib.name === 'L1' ? weedNear : weed);
  }

  // The two stacks of the gate, and the arch rock.
  for (const post of STATIONS.posts) {
    const s: Stack = { x: post[0], z: post[1], foot: 27, top: 15, height: 150 };
    add(blades, worldSpace(stackRock(s)), rock);
    add(skirts, stackWeed(s.x, s.z, (y, angle) => stackRadius(s, y, angle), 220, 0.9), weedGate);
  }
  const arch = add(blades, worldSpace(archShape(68, 45, 13, 19, 96, 64)), rock);
  arch.position.set(STATIONS.arch[0], 0, STATIONS.arch[1]);
  arch.rotation.y = Math.atan2(STATIONS.establish[0] - STATIONS.arch[0], STATIONS.establish[1] - STATIONS.arch[1]);
  ctx.scene.add(ctx.parts.built('ribs', blades));

  // The colony's rock: ledges above the tide line, weed below.
  const ledges = new THREE.Mesh(roundSpace(colonyRock(), COLONY.x, COLONY.z, 60, Math.atan2(COLONY.side[1], COLONY.side[0]) + Math.PI), roostRock);
  ctx.scene.add(ctx.parts.built('ledges', ledges));
  add(skirts, stackWeed(COLONY.x, COLONY.z, (y) => COLONY.radiusAt(y), 420), weed);
  ctx.scene.add(ctx.parts.built('weed', skirts));

  // Loose rock: fallen from the blades round their feet, and smaller pieces out on the floor. None on the paths of the cameras.
  const tracks: [number, number][] = [];
  for (const path of Object.values(shots)) {
    for (let k = 0; k <= 96; k++) {
      const pose = resolve(path, k / 96, 0);
      tracks.push([pose.position[0], pose.position[2]]);
    }
  }
  const nearTrack = (x: number, z: number, reach: number): boolean => tracks.some((p) => Math.hypot(x - p[0], z - p[1]) < reach);
  const scatter = ctx.rng('rocks');
  const placed: { x: number; z: number; size: number; yaw: number; tilt: number; kind: number; sink: number }[] = [];
  const KINDS = 4;
  const ribFeet = (rib: Rib, count: number, lo: number, hi: number, reach: number): void => {
    for (let i = 0; i < count; i++) {
      const phi = scatter.range(0, Math.PI * 2);
      const out = 6 + reach * Math.pow(scatter.next(), 2.2);
      const x = rib.x + Math.cos(rib.yaw) * (rib.a + out) * Math.cos(phi) - Math.sin(rib.yaw) * (rib.b + out) * Math.sin(phi);
      const z = rib.z + Math.sin(rib.yaw) * (rib.a + out) * Math.cos(phi) + Math.cos(rib.yaw) * (rib.b + out) * Math.sin(phi);
      const size = lo + (hi - lo) * Math.pow(scatter.next(), 2.2);
      // Every other one is kept: fewer rocks at a foot, each lower in the sand.
      const rock = { x, z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.25, 0.25), kind: scatter.int(KINDS), sink: scatter.range(0.2, 0.5) + 0.12 };
      if (i % 2 === 0) placed.push(rock);
    }
  };
  for (const rib of RIBS as Rib[]) ribFeet(rib, rib.name === 'L1' ? 90 : 50, 0.5, rib.name === 'L1' ? 5 : 8, rib.name === 'L1' ? 60 : 70);
  // The mound of fallen rock at the foot of the first left rib, on the side the strait sees.
  const first = RIBS[0] as Rib;
  for (let i = 0; i < 90; i++) {
    const phi = scatter.range(-0.1, 1.2);
    const out = 2 + 34 * Math.pow(scatter.next(), 1.6);
    const at = weedPoint(first, phi, 0, out);
    const size = (1 + 4.2 * Math.pow(scatter.next(), 1.8)) * (1 - out / 60);
    const rock = { x: at.x, z: at.z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.25, 0.25), kind: scatter.int(KINDS), sink: scatter.range(0.15, 0.4) + 0.2 };
    if (i % 2 === 0) placed.push(rock);
  }
  for (let i = 0; i < 260; i++) {
    const x = scatter.range(-300, 380);
    const z = scatter.range(-1500, 260);
    const size = 0.18 + 1.1 * Math.pow(scatter.next(), 3);
    placed.push({ x, z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.3, 0.3), kind: scatter.int(KINDS), sink: scatter.range(0.25, 0.6) });
  }
  // Cobbles and half sunk stones, in drifts: thick where the floor stands proud, thin in the pools.
  for (let i = 0; i < 1500; i++) {
    const near = i < 800;
    const x = near ? STATIONS.establish[0] + scatter.range(-170, 330) : scatter.range(-300, 380);
    const z = near ? STATIONS.establish[1] - 420 * Math.pow(scatter.next(), 1.6) + 30 : scatter.range(-1500, 200);
    const size = 0.05 + 0.3 * Math.pow(scatter.next(), 4);
    const drift = fbm3(x / 23, 0.5, z / 23, 2);
    const yaw = scatter.range(0, 6.283);
    const tilt = scatter.range(-0.3, 0.3);
    const kind = scatter.int(KINDS);
    const sink = scatter.range(0.2, 0.55);
    if (drift > 0.42 + 0.2 * scatter.next()) placed.push({ x, z, size, yaw, tilt, kind, sink });
  }
  const ground0 = ctx.rig.land.height;
  // Stones of a fist's to a head's size close under the lens of each key on the floor: thick on the bars, a few in the films of water.
  const yawOf = (aim: number[], from: number[]): number => Math.atan2((aim[0] as number) - (from[0] as number), -((aim[2] as number) - (from[2] as number)));
  const strew = (path: (typeof shots)[string], part: number, count: number, from: number, to: number, half: number): void => {
    const pose = resolve(path, part, 0);
    const yaw = yawOf(pose.aim, pose.position);
    for (let i = 0; i < count; i++) {
      const r = from + (to - from) * Math.pow(scatter.next(), 1.9);
      const a = yaw + scatter.range(-half, half);
      const x = pose.position[0] + Math.sin(a) * r;
      const z = pose.position[2] - Math.cos(a) * r;
      const size = 0.012 + 0.03 * scatter.next() + 0.1 * Math.pow(scatter.next(), 12);
      const yaw2 = scatter.range(0, 6.283);
      const tilt = scatter.range(-0.3, 0.3);
      const kind = scatter.int(KINDS);
      const sink = scatter.range(0.4, 0.7);
      const drift = noise3(x / 4.1, 0.5, z / 4.1) * 0.6 + noise3(x / 1.3, 2.5, z / 1.3) * 0.4;
      if (drift > 0.4 + 0.35 * scatter.next()) placed.push({ x, z, size, yaw: yaw2, tilt, kind, sink });
    }
  };
  strew(shots['ribs-02'] as (typeof shots)[string], keyPart(shotById('ribs-02')), 4500, 1.5, 40, 0.62);
  strew(shots['ribs-04'] as (typeof shots)[string], keyPart(shotById('ribs-04')), 1200, 5, 110, 0.3);
  strew(shots['ribs-06'] as (typeof shots)[string], keyPart(shotById('ribs-06')), 1500, 2, 60, 0.55);
  // At the foot of every blade what has fallen from it: weed-grown blocks against the wall, smaller ones out on the flat.
  const wide = resolve(shots['ribs-02'] as (typeof shots)[string], keyPart(shotById('ribs-02')), 0).position;
  const hung = weedPoint(ribByName(DROWNED.rib), DROWNED.phi, 2);
  for (const rib of RIBS) {
    for (let i = 0; i < 26; i++) {
      const out = 12 * Math.pow(scatter.next(), 1.6);
      const at = weedPoint(rib, scatter.range(0, 6.283), 2, out - 0.5);
      const size = (1 + 4.5 * Math.pow(scatter.next(), 2.2)) * (1 - 0.045 * out);
      const rock = { x: at.x, z: at.z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.4, 0.4), kind: scatter.int(KINDS), sink: scatter.range(0.3, 0.5) };
      if (Math.hypot(at.x - wide[0], at.z - wide[2]) > 16 && Math.hypot(at.x - hung.x, at.z - hung.z) > 18) placed.push(rock);
    }
  }
  // Heaps of cast weed lying in the standing water before the wide lens: low, dark, half drowned.
  {
    const pose = resolve(shots['ribs-02'] as (typeof shots)[string], keyPart(shotById('ribs-02')), 0);
    const yaw = yawOf(pose.aim, pose.position);
    for (let i = 0; i < 40; i++) {
      const r = 7 + 130 * Math.pow(scatter.next(), 1.5);
      const a = yaw + scatter.range(-0.62, 0.5);
      const x = pose.position[0] + Math.sin(a) * r;
      const z = pose.position[2] - Math.cos(a) * r;
      const size = (0.5 + 1.6 * Math.pow(scatter.next(), 2)) * (0.7 + r / 120);
      if (bed(x, z) < LEVELS.pool + 0.05) placed.push({ x, z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.12, 0.12), kind: scatter.int(KINDS), sink: scatter.range(0.6, 0.74) });
    }
  }
  const kept = placed.filter((p) => !nearTrack(p.x, p.z, p.size < 0.3 ? 0.4 + p.size : p.sink > 0.555 ? 1.5 + p.size : 4 + p.size * 2.5) && bed(p.x, p.z) > -1.5);
  STATIONS.foreground.forEach(([x, z, size], i) => {
    kept.push({ x, z, size, yaw: 1.3 + i * 2.4, tilt: 0.1, kind: i % KINDS, sink: 0.55 });
    // A heap, not one stone: smaller rock against its sides.
    for (let k = 0; k < 9; k++) {
      const a = scatter.range(0, 6.283);
      const r = size * scatter.range(0.75, 1.5);
      kept.push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, size: size * scatter.range(0.22, 0.5), yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.3, 0.3), kind: scatter.int(KINDS), sink: scatter.range(0.3, 0.5) });
    }
  });
  const squat = [0.5, 0.58, 0.38, 0.45];
  const rocks = new THREE.Group();
  const dummy = new THREE.Object3D();
  const shades = ctx.rig.contactDiscs(kept.filter((p) => p.size > 0.3).length);
  let shade = 0;
  // Three grades of shape: rock over a metre, stones, and pebbles of a few facets.
  const grade = (size: number): number => (size >= 0.3 ? 0 : size >= 0.09 ? 1 : 2);
  const DETAIL = [4, 2, 0];
  for (let kind = 0; kind < KINDS * 3; kind++) {
    const g = Math.floor(kind / KINDS);
    const mine = kept.filter((p) => p.kind === kind % KINDS && grade(p.size) === g);
    if (mine.length === 0) continue;
    const herd = new THREE.InstancedMesh(boulderShape((kind % KINDS) + 1, DETAIL[g] as number, squat[kind % KINDS] as number), g === 0 ? boulder : pebble, mine.length);
    herd.frustumCulled = false;
    herd.frustumCulled = false;
    mine.forEach((p, i) => {
      dummy.position.set(p.x, ground0(p.x, p.z) + p.size * (squat[kind % KINDS] as number) * (1 - 2 * p.sink) * 0.5, p.z);
      dummy.rotation.set(p.tilt, p.yaw, p.tilt * 0.6);
      // A heap of weed lies lower and wider than a stone.
      if (p.sink > 0.555) dummy.scale.set(p.size * 1.25, p.size * 0.6, p.size);
      else dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      herd.setMatrixAt(i, dummy.matrix);
      if (p.size > 0.3) ctx.rig.setDisc(shades, shade++, p.x, p.z, p.size * 1.5, 0.5);
    });
    herd.instanceMatrix.needsUpdate = true;
    rocks.add(herd);
  }
  ctx.scene.add(ctx.parts.built('rocks', rocks));

  return {
    dispose: () => {
      for (const group of [blades, skirts, rocks, mirrors]) group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      floor.geometry.dispose();
      ledges.geometry.dispose();
      for (const m of [ground, roostRock, weed, weedNear, boulder, pebble, glass, ...stones.values()]) m.dispose();
    },
  };
}
