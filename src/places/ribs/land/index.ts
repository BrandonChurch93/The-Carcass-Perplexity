// The land of the Ribs: the floor of the strait, the blades that stand in it, the weed that hangs from them to the tide line, the ledges of
// the colony's rock and the loose rock on the floor.
import * as THREE from 'three';
import { resolve } from '../../../core/cameras';
import { keyPart, shotById } from '../../../film/cut';
import { shots } from '../cameras';
import { RIBS, weedPoint, type Rib } from '../layout';
import { COLONY, DROWNED, LEVELS, STATIONS } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { RIG_VERTEX } from '../shared/glsl';
import { LAND } from '../shared/rig';
import { bed } from './height';
import { fbm3, noise3, smooth } from './noise';
import { BOULDER_FRAGMENT, GROUND_FRAGMENT, MIRROR_FRAGMENT, MIRROR_VERTEX, ROCK_FRAGMENT, UV_VERTEX, WEED_FRAGMENT, WEED_VERTEX } from './shaders';
import { archShape, bladeShape, boulderShape, floorShape, lathe, lines, relief, skirtShape, turns, weedLump, weedTier, weedTop } from './shapes';

export const PARTS = ['land', 'ribs', 'weed', 'ledges', 'rocks'] as const;

export { bed };

const BLADE: Record<string, { around: number; fine: number }> = {
  L1: { around: 320, fine: 1.3 },
  R1: { around: 256, fine: 1.7 },
  L2: { around: 192, fine: 2 },
  R2: { around: 192, fine: 2 },
  S: { around: 192, fine: 2 },
};

interface Stack {
  x: number;
  z: number;
  foot: number;
  top: number;
  height: number;
}

function stackRock(s: Stack): THREE.BufferGeometry {
  const profile: [number, number][] = [];
  for (let y = -10; y < s.height; y += 1.6) profile.push([y, s.foot + (s.top - s.foot) * smooth(-10, s.height, y)]);
  profile.push([s.height, s.top * 0.9], [s.height + 2.5, s.top * 0.55], [s.height + 3.4, 0.01]);
  return lathe(s.x, s.z, profile, 150, (y, r, angle) => {
    const x = s.x + Math.cos(angle) * r;
    const z = s.z + Math.sin(angle) * r;
    const d = 0.55 * relief(x * 1.6, y * 1.6, z * 1.6) + 4 * (fbm3(x / 16, y / 30, z / 16, 2) - 0.5);
    return [y, Math.max(0.01, r + (r > 1 ? d : 0))];
  });
}

function stackWeed(x0: number, z0: number, radiusAt: (y: number) => number, around: number): THREE.BufferGeometry {
  const rows = 30;
  const span = LEVELS.tide + 5;
  const profile: [number, number][] = [];
  // The radius here only tells the sheet how far round the weed goes, for the size of its picture.
  for (let j = 0; j <= rows; j++) profile.push([(j / rows) * span, radiusAt(10) + 3]);
  return lathe(x0, z0, profile, around, (run, _r, angle) => {
    const f = run / span;
    const far = radiusAt(LEVELS.tide);
    const top = weedTop(x0 + Math.cos(angle) * far, z0 + Math.sin(angle) * far);
    const y = -5 + (top + 5) * f;
    const tuck = smooth(0.9, 1, f);
    const base = radiusAt(Math.max(0, y));
    const x = x0 + Math.cos(angle) * base;
    const z = z0 + Math.sin(angle) * base;
    return [y, base + (2.2 + 1.5 * smooth(12, 0, y) + weedLump(x, y, z) + 0.6 * weedTier(x, y, z)[0]) * (1 - tuck) - 2.5 * tuck];
  });
}

function colonyRock(): THREE.BufferGeometry {
  const { x, z, top, step, radiusAt } = COLONY;
  const profile: [number, number][] = [];
  const kinds: number[] = [];
  const firstTier = Math.floor((LEVELS.tide - 8) / step);
  for (let y = -10; y < firstTier * step; y += 3) {
    profile.push([y, radiusAt(y) + 0.6]);
    kinds.push(0);
  }
  const tiers = Math.round(top / step);
  for (let k = firstTier; k < tiers; k++) {
    const y = k * step;
    const r = radiusAt(y + step);
    profile.push([y, r], [y + step * 0.45, r + 0.12], [y + step - 0.18, r + 0.04], [y + step, r - 0.3]);
    kinds.push(1, 2, 2, 3);
  }
  profile.push([top + 0.4, 0.01]);
  kinds.push(0);
  return lathe(x, z, profile, 600, (y, r, angle, row) => {
    const kind = kinds[row] as number;
    if (kind === 0) return [y, r];
    const px = x + Math.cos(angle) * r;
    const pz = z + Math.sin(angle) * r;
    // A tread keeps its height and its inner corner to a hand's width, so that what nests on it stands on it; the riser and the edge are broken.
    const wide = 0.9 * (noise3(px / 9, y / 9, pz / 9) - 0.5) + 1.4 * (noise3(px / 23, y / 40, pz / 23) - 0.5);
    const block = noise3(px / 1.7, y / 2.1, pz / 1.7) - 0.5;
    if (kind === 1) return [y + 0.12 * block, r + 0.35 * wide + 0.25 * block];
    // Hollows where a block has dropped out of a riser: dark under the ledge above.
    const gone = 1.1 * smooth(0.55, 0.8, noise3(px / 3.4 + 1.9, y / 2.6, pz / 3.4));
    if (kind === 2) return [y, r + 0.35 * wide + 0.5 * block - gone + 0.2 * (noise3(px / 0.5, y / 0.5, pz / 0.5) - 0.5)];
    return [y + 0.1 * block, r + 0.35 * wide + 0.5 * block - 0.5 * Math.max(0, noise3(px / 0.8, y, pz / 0.8) - 0.45)];
  });
}

export function create(ctx: Context): Piece {
  ctx.rig.setLand(bed);
  const tex = ctx.assets.texture;
  // The Builder's material pictures of the place: bone-stone for the blades, coursed ledge for the colony, hanging weed, the wet flat, shore rock.
  const rockC = tex('mat/bone.jpg');
  const rockN = tex('mat/bone-nh.png', { kind: 'data' });
  const ledgeC = tex('mat/ledge.jpg');
  const ledgeN = tex('mat/ledge-nh.png', { kind: 'data' });
  const weedC = tex('mat/weed.jpg');
  const weedN = tex('mat/weed-nh.png', { kind: 'data' });
  const sandC = tex('mat/flat.jpg', { anisotropy: 2 });
  const shingleC = tex('land/shingle.jpg', { anisotropy: 2 });
  const shingleN = tex('land/shingle-nh.jpg', { kind: 'data', anisotropy: 2 });
  const boulderC = tex('mat/rock.jpg');
  const boulderN = tex('mat/rock-nh.png', { kind: 'data' });

  const material = (vertexShader: string, fragmentShader: string, own: Record<string, THREE.IUniform>): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { ...ctx.rig.uniforms, ...own } });

  const ground = material(RIG_VERTEX, GROUND_FRAGMENT, { tShingle: { value: shingleC }, tShingleN: { value: shingleN }, tSand: { value: sandC }, tWeed: { value: weedC }, uPool: { value: LEVELS.pool } });
  const rock = material(UV_VERTEX, ROCK_FRAGMENT, { tRock: { value: rockC }, tRockN: { value: rockN }, tWeed: { value: weedC }, uTide: { value: LEVELS.tide }, uTier: { value: 0 } });
  const roostRock = material(UV_VERTEX, ROCK_FRAGMENT, { tRock: { value: ledgeC }, tRockN: { value: ledgeN }, tWeed: { value: weedC }, uTide: { value: LEVELS.tide }, uTier: { value: COLONY.step } });
  const weed = material(WEED_VERTEX, WEED_FRAGMENT, { tWeed: { value: weedC }, tWeedN: { value: weedN } });
  const boulder = material(RIG_VERTEX, BOULDER_FRAGMENT, { tBoulder: { value: boulderC }, tBoulderN: { value: boulderN }, tWeed: { value: weedC }, uWeedy: { value: 1 } });
  const pebble = material(RIG_VERTEX, BOULDER_FRAGMENT, { tBoulder: { value: boulderC }, tBoulderN: { value: boulderN }, tWeed: { value: weedC }, uWeedy: { value: 0 } });

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
    add(blades, bladeShape(rib, BLADE[rib.name] ?? { around: 128, fine: 2.5 }), rock);
    const phis = rib.name === 'L1' ? turns(200, { from: -0.3, to: 1.3, count: 640 }) : turns(160);
    add(skirts, skirtShape(rib, { phis, rows: rib.name === 'L1' ? 84 : 32, ...(rib.name === DROWNED.rib ? { calm: [DROWNED.phi, DROWNED.height] as [number, number] } : {}) }), weed);
  }

  // The two stacks of the gate, and the arch rock.
  for (const post of STATIONS.posts) {
    const s: Stack = { x: post[0], z: post[1], foot: 25, top: 10, height: 66 };
    add(blades, stackRock(s), rock);
    add(skirts, stackWeed(s.x, s.z, (y) => s.foot + (s.top - s.foot) * smooth(-10, s.height, y), 160), weed);
  }
  const arch = add(blades, archShape(68, 45, 13, 19, 96, 64), rock);
  arch.position.set(STATIONS.arch[0], 0, STATIONS.arch[1]);
  arch.rotation.y = Math.atan2(STATIONS.establish[0] - STATIONS.arch[0], STATIONS.establish[1] - STATIONS.arch[1]);
  ctx.scene.add(ctx.parts.built('ribs', blades));

  // The colony's rock: ledges above the tide line, weed below.
  const ledges = new THREE.Mesh(colonyRock(), roostRock);
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
      placed.push({ x, z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.25, 0.25), kind: scatter.int(KINDS), sink: scatter.range(0.2, 0.5) });
    }
  };
  for (const rib of RIBS as Rib[]) ribFeet(rib, rib.name === 'L1' ? 190 : 150, 0.6, rib.name === 'L1' ? 5.5 : 13, rib.name === 'L1' ? 60 : 70);
  // The mound of fallen rock at the foot of the first left rib, on the side the strait sees.
  const first = RIBS[0] as Rib;
  for (let i = 0; i < 90; i++) {
    const phi = scatter.range(-0.1, 1.2);
    const out = 2 + 34 * Math.pow(scatter.next(), 1.6);
    const at = weedPoint(first, phi, 0, out);
    const size = (1 + 4.2 * Math.pow(scatter.next(), 1.8)) * (1 - out / 60);
    placed.push({ x: at.x, z: at.z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.25, 0.25), kind: scatter.int(KINDS), sink: scatter.range(0.15, 0.4) });
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
  const kept = placed.filter((p) => !nearTrack(p.x, p.z, p.size < 0.3 ? 0.4 + p.size : 4 + p.size * 2.5) && bed(p.x, p.z) > -1.5);
  STATIONS.foreground.forEach(([x, z, size], i) => {
    kept.push({ x, z, size, yaw: 1.3 + i * 2.4, tilt: 0.1, kind: i % KINDS, sink: 0.55 });
    // A heap, not one stone: smaller rock against its sides.
    for (let k = 0; k < 9; k++) {
      const a = scatter.range(0, 6.283);
      const r = size * scatter.range(0.75, 1.5);
      kept.push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, size: size * scatter.range(0.22, 0.5), yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.3, 0.3), kind: scatter.int(KINDS), sink: scatter.range(0.3, 0.5) });
    }
  });
  const squat = [0.6, 0.72, 0.45, 0.55];
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
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      herd.setMatrixAt(i, dummy.matrix);
      if (p.size > 0.3) ctx.rig.setDisc(shades, shade++, p.x, p.z, p.size * 1.7, 0.75);
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
      for (const m of [ground, rock, roostRock, weed, boulder, pebble, glass]) m.dispose();
    },
  };
}
