// The land of the Ribs: the floor of the strait, the blades that stand in it, the weed that hangs from them to the tide line, the ledges of
// the colony's rock and the loose rock on the floor.
import * as THREE from 'three';
import { resolve } from '../../../core/cameras';
import { shots } from '../cameras';
import { RIBS, type Rib } from '../layout';
import { COLONY, LEVELS, STATIONS } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { RIG_VERTEX } from '../shared/glsl';
import { LAND } from '../shared/rig';
import { bed } from './height';
import { fbm3, noise3, smooth } from './noise';
import { BOULDER_FRAGMENT, GROUND_FRAGMENT, ROCK_FRAGMENT, UV_VERTEX, WEED_FRAGMENT } from './shaders';
import { archShape, bladeShape, boulderShape, floorShape, lathe, lines, relief, skirtShape, turns, weedLump, weedTop } from './shapes';

export const PARTS = ['land', 'ribs', 'weed', 'ledges', 'rocks'] as const;

export { bed };

const BLADE: Record<string, { around: number; fine: number }> = {
  L1: { around: 320, fine: 1.2 },
  R1: { around: 256, fine: 1.5 },
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
  const profile: [number, number][] = [];
  for (let j = 0; j <= rows; j++) profile.push([j / rows, 0]);
  return lathe(x0, z0, profile, around, (f, _r, angle) => {
    const far = radiusAt(LEVELS.tide);
    const top = weedTop(x0 + Math.cos(angle) * far, z0 + Math.sin(angle) * far);
    const y = -5 + (top + 5) * f;
    const tuck = smooth(0.9, 1, f);
    const base = radiusAt(Math.max(0, y));
    const x = x0 + Math.cos(angle) * base;
    const z = z0 + Math.sin(angle) * base;
    return [y, base + (2.2 + 1.5 * smooth(12, 0, y) + weedLump(x, y, z)) * (1 - tuck) - 2.5 * tuck];
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
    const wide = 0.9 * (noise3(px / 9, y / 9, pz / 9) - 0.5);
    const block = noise3(px / 1.7, y / 2.1, pz / 1.7) - 0.5;
    if (kind === 1) return [y + 0.12 * block, r + 0.35 * wide + 0.25 * block];
    if (kind === 2) return [y, r + 0.35 * wide + 0.5 * block + 0.2 * (noise3(px / 0.5, y / 0.5, pz / 0.5) - 0.5)];
    return [y + 0.1 * block, r + 0.35 * wide + 0.5 * block - 0.5 * Math.max(0, noise3(px / 0.8, y, pz / 0.8) - 0.45)];
  });
}

export function create(ctx: Context): Piece {
  ctx.rig.setLand(bed);
  const tex = ctx.assets.texture;
  const rockC = tex('land/rock.jpg');
  const rockN = tex('land/rock-nh.jpg', { kind: 'data' });
  const weedC = tex('land/weed.jpg');
  const weedN = tex('land/weed-nh.png', { kind: 'data' });
  const sandC = tex('land/sand.jpg', { anisotropy: 4 });
  const sandN = tex('land/sand-nh.png', { kind: 'data', anisotropy: 4 });
  const boulderC = tex('land/boulder.jpg');
  const boulderN = tex('land/boulder-nh.png', { kind: 'data' });

  const material = (vertexShader: string, fragmentShader: string, own: Record<string, THREE.IUniform>): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { ...ctx.rig.uniforms, ...own } });

  const ground = material(RIG_VERTEX, GROUND_FRAGMENT, { tSand: { value: sandC }, tSandN: { value: sandN }, tWeed: { value: weedC }, uPool: { value: LEVELS.pool } });
  const rock = material(UV_VERTEX, ROCK_FRAGMENT, { tRock: { value: rockC }, tRockN: { value: rockN }, tWeed: { value: weedC }, uTide: { value: LEVELS.tide } });
  const weed = material(UV_VERTEX, WEED_FRAGMENT, { tWeed: { value: weedC }, tWeedN: { value: weedN } });
  const boulder = material(RIG_VERTEX, BOULDER_FRAGMENT, { tBoulder: { value: boulderC }, tBoulderN: { value: boulderN }, tWeed: { value: weedC } });

  // The floor: fine where the cameras stand on it, coarse out to the edge of what the rig knows, where it lies deep under the sea.
  const xs = lines(LAND.minX, LAND.maxX, -340, 420, 3, 60);
  const zs = lines(LAND.minZ, LAND.maxZ, -1560, 260, 3, 60);
  // The mesh lies under the lowest the fine relief can go, so that no sheet of water is cut by a triangle: the shader draws the bed where it is.
  const floor = new THREE.Mesh(floorShape(xs, zs, (x, z) => bed(x, z) - 0.14), ground);
  ctx.scene.add(ctx.parts.built('land', floor));

  const blades = new THREE.Group();
  const skirts = new THREE.Group();
  const add = (group: THREE.Group, geometry: THREE.BufferGeometry, stuff: THREE.Material): THREE.Mesh => {
    const mesh = new THREE.Mesh(geometry, stuff);
    group.add(mesh);
    return mesh;
  };
  for (const rib of RIBS as Rib[]) {
    add(blades, bladeShape(rib, BLADE[rib.name] ?? { around: 160, fine: 2 }), rock);
    const phis = rib.name === 'L1' ? turns(240, { from: -0.5, to: 1.5, count: 560 }) : turns(200);
    add(skirts, skirtShape(rib, { phis, rows: rib.name === 'L1' ? 52 : 30 }), weed);
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
  const ledges = new THREE.Mesh(colonyRock(), rock);
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
      const out = 14 + reach * Math.pow(scatter.next(), 1.7);
      const x = rib.x + Math.cos(rib.yaw) * (rib.a + out) * Math.cos(phi) - Math.sin(rib.yaw) * (rib.b + out) * Math.sin(phi);
      const z = rib.z + Math.sin(rib.yaw) * (rib.a + out) * Math.cos(phi) + Math.cos(rib.yaw) * (rib.b + out) * Math.sin(phi);
      const size = lo + (hi - lo) * Math.pow(scatter.next(), 2.2);
      placed.push({ x, z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.25, 0.25), kind: scatter.int(KINDS), sink: scatter.range(0.2, 0.5) });
    }
  };
  for (const rib of RIBS as Rib[]) ribFeet(rib, rib.name === 'L1' ? 150 : 70, 0.5, rib.name === 'L1' ? 4.5 : 6, rib.name === 'L1' ? 70 : 90);
  for (let i = 0; i < 520; i++) {
    const x = scatter.range(-300, 380);
    const z = scatter.range(-1500, 260);
    const size = 0.18 + 1.1 * Math.pow(scatter.next(), 3);
    placed.push({ x, z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.3, 0.3), kind: scatter.int(KINDS), sink: scatter.range(0.25, 0.6) });
  }
  const ground0 = ctx.rig.land.height;
  const kept = placed.filter((p) => !nearTrack(p.x, p.z, 4 + p.size * 2.5) && bed(p.x, p.z) > -1.5);
  STATIONS.foreground.forEach(([x, z, size], i) => kept.push({ x, z, size, yaw: 1.3 + i * 2.4, tilt: 0.1, kind: i % KINDS, sink: 0.62 }));
  const squat = [0.62, 0.8, 0.5, 0.7];
  const rocks = new THREE.Group();
  const dummy = new THREE.Object3D();
  const shades = ctx.rig.contactDiscs(kept.length);
  let shade = 0;
  for (let kind = 0; kind < KINDS; kind++) {
    const mine = kept.filter((p) => p.kind === kind);
    const herd = new THREE.InstancedMesh(boulderShape(kind + 1, 4, squat[kind] as number), boulder, mine.length);
    herd.frustumCulled = false;
    mine.forEach((p, i) => {
      dummy.position.set(p.x, ground0(p.x, p.z) + p.size * (squat[kind] as number) * (1 - 2 * p.sink) * 0.5, p.z);
      dummy.rotation.set(p.tilt, p.yaw, p.tilt * 0.6);
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      herd.setMatrixAt(i, dummy.matrix);
      ctx.rig.setDisc(shades, shade++, p.x, p.z, p.size * 1.7, 0.75);
    });
    herd.instanceMatrix.needsUpdate = true;
    rocks.add(herd);
  }
  ctx.scene.add(ctx.parts.built('rocks', rocks));

  return {
    dispose: () => {
      for (const group of [blades, skirts, rocks]) group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      floor.geometry.dispose();
      ledges.geometry.dispose();
      for (const m of [ground, rock, weed, boulder]) m.dispose();
    },
  };
}
