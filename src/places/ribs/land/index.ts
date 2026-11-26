// The land of the Ribs: the floor of the strait, the blades that stand in it, the weed that hangs from them to the tide line, the ledges of
// the colony's rock and the loose rock on the floor.
import * as THREE from 'three';
import { resolve } from '../../../core/cameras';
import { keyPart, shotById } from '../../../film/cut';
import { shots } from '../cameras';
import { RIBS, ribByName, weedPoint, type Rib } from '../layout';
import { COLONY, DROWNED, LEVELS, STATIONS, shotSpan } from '../shared/anchors';
import { loopPhase, stagedSeconds } from '../shared/stage';
import { CRAG } from '../shared/crag';
import type { Context, Piece } from '../shared/context';
import { RIG_VERTEX } from '../shared/glsl';
import { LAND } from '../shared/rig';
import { bed } from './height';
import { fbm3, noise3, smooth } from './noise';
import { bladeShape, worldSpace, roundSpace } from './blade';
import { BOULDER_FRAGMENT, COLONY_FRAGMENT, GROUND_FRAGMENT, MIRROR_FRAGMENT, MIRROR_LOOP_FRAGMENT, MIRROR_VERTEX, ROCK_FRAGMENT, ROCK_VERTEX, WEED_FRAGMENT, WEED_VERTEX } from './shaders';
import { FIN_FRAGMENT, FIN_OPENING_FRAGMENT, FIN_OPENING_VERTEX, FIN_VERTEX, STACK_FRAGMENT } from './fin';
import { inOpening, openingDark, openingLight, openingWeight } from '../shared/opening';
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
// How far a face of a stack leans in and out with height. At 0.3 the right stack's outline before the bore was a head in profile
// (brow, nose, mouth); at 0.1 the faces stand nearly straight.
const STACK_SWAY = 0.1;
function stackRadius(s: Stack, y: number, angle: number): number {
  const base = s.foot + (s.top - s.foot) * smooth(-10, s.height, y);
  const seed = s.x * 0.013 + s.z * 0.007;
  let r = base * 1.15;
  for (let k = 0; k < 7; k++) {
    const a = k * 0.8976 + 1.3 * noise3(k * 1.7 + 0.5, seed, 0.5);
    const d = base * (0.74 + 0.36 * noise3(k * 2.3 + 0.5, seed, 5.5)) * (1 + STACK_SWAY * (noise3(k * 1.1 + 0.5, y / 45, seed) - 0.5));
    const c = Math.cos(angle - a);
    if (c > 0.2) r = Math.min(r, d / c);
  }
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  // The beds are of unlike thickness (two to one) and dip round the rock.
  const t = (y + 7 * noise3(ca * 1.5 + seed, sa * 1.5, 3.5) + 9 * noise3(y / 26, seed, 1.5)) / BED;
  const band = Math.floor(t);
  const f = t - band;
  const proud = (k: number): number => 1.1 * noise3(k * 1.9 + 0.5, ca * 2.2 + seed, sa * 2.2) * smooth(0.3, 0.6, noise3(k * 0.7 + 0.5, ca * 0.9 + seed, sa * 0.9 + 7));
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
    const d = 0.3 * relief(x * 1.6, y * 1.6, z * 1.6) + 0.6 * (fbm3(x / 9, y / 14, z / 9, 2) - 0.5);
    return [y, Math.max(0.01, base + d)];
  });
}

function stackWeed(x0: number, z0: number, radiusAt: (y: number, angle: number) => number, around: number, proud = 2.2, lower = 0, lumps = 1, level = 0): THREE.BufferGeometry {
  const rows = 30;
  const span = LEVELS.tide + 5;
  const profile: [number, number][] = [];
  // The radius here only tells the sheet how far round the weed goes, for the size of its picture.
  for (let j = 0; j <= rows; j++) profile.push([(j / rows) * span, radiusAt(10, 0) + 3]);
  const g = lathe(x0, z0, profile, around, (run, _r, angle) => {
    const f = run / span;
    const far = radiusAt(LEVELS.tide, angle);
    const ragged = weedTop(x0 + Math.cos(angle) * far, z0 + Math.sin(angle) * far);
    // A stack with a weed line of its own keeps the same ragged hem, an eighth as deep.
    const top = level > 0 ? level + 0.12 * (ragged - LEVELS.tide + 2) : ragged - lower;
    const y = -5 + (top + 5) * f;
    const tuck = smooth(0.9, 1, f);
    const base = radiusAt(Math.max(0, y), angle);
    const x = x0 + Math.cos(angle) * base;
    const z = z0 + Math.sin(angle) * base;
    return [y, base + (proud + 1.5 * smooth(12, 0, y) + lumps * (0.6 * weedLump(x, y, z) + 0.2 * weedTier(x, y, z)[0])) * (1 - tuck) - 2.5 * tuck];
  });
  // v is counted down from the top of the weed, as on the blades' skirts.
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) - span);
  return g;
}

function colonyRock(): THREE.BufferGeometry {
  const { x, z, top } = COLONY;
  // Level rows a hand apart: the blocks of the crag are cut by them, and what nests on it stands on these same rows.
  const profile: [number, number][] = [];
  for (let j = Math.floor(-16 / CRAG.row); j * CRAG.row < top + 3; j++) profile.push([j * CRAG.row, 10]);
  const around = 900;
  const g = lathe(x, z, profile, around, (y, _r, angle) => {
    const r = COLONY.cragAt(angle, y);
    if (r <= 1) return [y, r];
    const px = x + Math.cos(angle) * r;
    const pz = z + Math.sin(angle) * r;
    // The faces are rough rock; a block's top is left nearly as it is, so that what nests on it stands on it.
    const d = 0.12 * relief(px * 1.3, y * 1.3, pz * 1.3) + 0.25 * (fbm3(px / 5, y / 5, pz / 5, 2) - 0.5);
    return [y, Math.max(0.01, r + d)];
  });
  // What hangs from a ledge is drawn by how far under its lip a place is: each point carries the metres down from the lip over it,
  // and how deep that ledge is (a deep one holds a crowd).
  const position = g.getAttribute('position') as THREE.BufferAttribute;
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const cols = around + 1;
  const rows = profile.length;
  const reach = (k: number): number => Math.hypot(position.getX(k) - x, position.getZ(k) - z);
  for (let i = 0; i < cols; i++) {
    let lip = 1e3;
    let deep = 0;
    for (let j = rows - 2; j >= 0; j--) {
      const k = j * cols + i;
      const out = reach(k) - reach(k + cols);
      if (out > 0.7) {
        lip = position.getY(k);
        deep = out;
      }
      uv.setXY(k, Math.min(30, lip - position.getY(k)), deep);
    }
    uv.setXY((rows - 1) * cols + i, 30, 0);
  }
  return g;
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
  const ledgeN = tex('mat/ledge-nh.png', { kind: 'data' });
  const nearC = tex('mat/nearbar.jpg', { anisotropy: 2 });
  const nearN = tex('land/nearbar-nh.png', { kind: 'data', anisotropy: 2 });
  for (const t of [plateC, plateN, wallC, wallN, nearC, nearN]) {
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

  const gateAt = new THREE.Vector2(STATIONS.posts[0][0] + 64, STATIONS.posts[0][1] + 74 - 22);
  const ground = material(RIG_VERTEX, GROUND_FRAGMENT, { tPlate: { value: plateC }, tPlateN: { value: plateN }, tShingle: { value: shingleC }, tShingleN: { value: shingleN }, tSand: { value: sandC }, tNear: { value: nearC }, tNearN: { value: nearN }, uPool: { value: LEVELS.pool }, uPath: { value: new THREE.Vector4(0, 0, 0, -1) }, uGate: { value: gateAt } });
  {
    // A lane of standing water runs down the middle of the strait toward the gap, from where the wide lens stands: it holds the sky.
    const pose = resolve(shots['ribs-02'] as (typeof shots)[string], keyPart(shotById('ribs-02')), 0);
    const dx = (pose.aim[0] as number) - (pose.position[0] as number);
    const dz = (pose.aim[2] as number) - (pose.position[2] as number);
    const l = Math.hypot(dx, dz) || 1;
    (ground.uniforms.uPath as THREE.IUniform).value.set(pose.position[0], pose.position[2], dx / l, dz / l);
  }
  const colonyC = tex('mat/colony.jpg', { anisotropy: 2 });
  const colonyN = tex('land/colony-nh.png', { kind: 'data', anisotropy: 2 });
  for (const t of [colonyC, colonyN]) t.wrapS = THREE.MirroredRepeatWrapping;
  const stone = (grain: number, lift: number): THREE.ShaderMaterial =>
    grain > 0
      ? material(FIN_VERTEX, FIN_FRAGMENT, { tRock: { value: rockC }, tWide: { value: finC }, tWideN: { value: finN }, tWeed: { value: weedC }, tColony: { value: colonyC }, tColonyN: { value: colonyN }, uTide: { value: LEVELS.tide }, uGrain: { value: grain }, uLift: { value: lift }, uRock: { value: 95 }, uCap: { value: grain === 5 ? 1 : 0 } })
      : material(ROCK_VERTEX, ROCK_FRAGMENT, {
          tRock: { value: rockC },
          tRockN: { value: rockN },
          tWide: { value: rockC },
          tWideN: { value: rockN },
          uFin: { value: 0 },
          uLift: { value: lift },
          tWeed: { value: weedC },
          uTide: { value: LEVELS.tide },
          uTier: { value: 0 },
          uGrain: { value: new THREE.Vector2(Math.abs(grain), Math.abs(grain) * 4.7) },
          uRockTint: { value: new THREE.Vector3(1.75, 1.72, 1.66) },
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
  // Staged: on the colony's rock the weed line stands at the foot of the colony's frame, where the picture of it has its weed.
  const roostRock = material(ROCK_VERTEX, COLONY_FRAGMENT, { tRock: { value: boulderC }, tColony: { value: colonyC }, tColonyN: { value: colonyN }, tWideN: { value: ledgeN }, uFin: { value: 0 }, uLift: { value: 0 }, tWeed: { value: weedC }, uTide: { value: LEVELS.tide }, uKelp: { value: 46.3 } });
  const hangs = (proud: number, bare = 0): THREE.ShaderMaterial =>
    material(WEED_VERTEX, WEED_FRAGMENT, { tWall: { value: wallC }, tWallN: { value: wallN }, tWeed: { value: weedC }, tWeedN: { value: weedN }, tBare: { value: boulderC }, tBareN: { value: boulderN }, uProud: { value: proud }, uBare: { value: bare } });
  // The near cliff's weed is cut fine enough to carry the hanks of the sheet; the others' is not.
  const weed = hangs(0.5);
  const weedNear = hangs(0.6);
  // The gate's stacks: weed in clumps, bare rock between.
  const weedGate = hangs(0.15, 0);
  const boulder = material(RIG_VERTEX, BOULDER_FRAGMENT, { tBoulder: { value: boulderC }, tBoulderN: { value: boulderN }, tWeed: { value: weedC }, tWeedN: { value: weedN }, uWeedy: { value: 1 }, uPool: { value: LEVELS.pool }, uGate: { value: gateAt } });
  const pebble = material(RIG_VERTEX, BOULDER_FRAGMENT, { tBoulder: { value: shingleC }, tBoulderN: { value: shingleN }, tWeed: { value: weedC }, tWeedN: { value: weedN }, uWeedy: { value: 0 }, uPool: { value: LEVELS.pool }, uGate: { value: gateAt } });

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
  const glassLoop = glass.clone();
  glassLoop.uniforms = glass.uniforms;
  glassLoop.fragmentShader = MIRROR_LOOP_FRAGMENT;
  const mirrors = new THREE.Group();
  [...(RIBS as Rib[])].sort((a, b) => a.z - b.z).forEach((rib, i) => {
    const image = new THREE.Mesh(bladeShape(rib, { around: 40, fine: 7 }), glass);
    image.frustumCulled = false;
    image.renderOrder = 2 + i * 0.01;
    mirrors.add(image);
  });
  ctx.scene.add(ctx.parts.built('land', floor, mirrors));

  const blades = new THREE.Group();
  const openBlades: { mesh: THREE.Mesh; film: THREE.ShaderMaterial; staged: THREE.ShaderMaterial }[] = [];
  const skirts = new THREE.Group();
  const add = (group: THREE.Group, geometry: THREE.BufferGeometry, stuff: THREE.Material): THREE.Mesh => {
    const mesh = new THREE.Mesh(geometry, stuff);
    group.add(mesh);
    return mesh;
  };
  for (const rib of RIBS as Rib[]) {
    const cut = BLADE[rib.name] ?? { around: 128, fine: 2.5, grain: 30 };
    const blade = add(blades, bladeShape(rib, cut), stoneOf(cut.grain, rib.name === 'L1' ? 4 : Math.round(Math.min(14, Math.max(4, 0.1 * rib.a)))));
    // The approach draws a blade with its own text (fin.ts) and its own seed: the film's material is the one above, for every other frame.
    const film = blade.material as THREE.ShaderMaterial;
    if (film.fragmentShader === FIN_FRAGMENT) {
      const staged = new THREE.ShaderMaterial({ vertexShader: FIN_OPENING_VERTEX, fragmentShader: FIN_OPENING_FRAGMENT, uniforms: { ...film.uniforms, uOpenStone: { value: new THREE.Vector2(0, 0.137 + 0.618 * openBlades.length) }, uOpenLight: { value: new THREE.Vector2(0, 0) } } });
      openBlades.push({ mesh: blade, film, staged });
    }
    const phis = rib.name === 'L1' ? turns(200, { from: -0.3, to: 1.3, count: 640 }) : turns(160);
    add(skirts, skirtShape(rib, { phis, rows: rib.name === 'L1' ? 84 : 32, ...(rib.name === DROWNED.rib ? { calm: [DROWNED.phi, DROWNED.height] as [number, number] } : {}) }), rib.name === 'L1' ? weedNear : weed);
  }

  // The two stacks of the gate, and the arch rock.
  // The two are unlike: on the left a wall that leaves the frame, on the right a sloping buttress standing further back.
  // Staged for the gate's shot only: from the strait the left one stands in the middle of the way out as a tower, which the picture of the
  // strait does not hold.
  const gateStacks: THREE.Mesh[] = [];
  const gateShot = shotSpan('ribs-06');
  STATIONS.posts.forEach((post, n) => {
    const s: Stack = n === 0 ? { x: post[0], z: post[1], foot: 33, top: 24, height: 170 } : { x: post[0], z: post[1], foot: 36, top: 7, height: 96 };
    const sheet = n === 0 ? 'stack-a' : 'stack-b';
    const stackC = tex(`land/${sheet}.jpg`, { anisotropy: 2 });
    const stackN = tex(`land/${sheet}-nh.png`, { kind: 'data', anisotropy: 2 });
    for (const t of [stackC, stackN]) t.wrapS = THREE.MirroredRepeatWrapping;
    // The picture goes round the pillar a whole number of times, so that it meets itself at the back.
    const girth = 2 * Math.PI * s.foot;
    const lays = 2 * Math.round(girth / 68);
    const pillar = material(RIG_VERTEX, STACK_FRAGMENT, { tStack: { value: stackC }, tStackN: { value: stackN }, tRock: { value: boulderC }, tWeed: { value: weedC }, uStack: { value: new THREE.Vector4(s.x, s.z, s.foot, girth / lays) } });
    gateStacks.push(add(blades, worldSpace(stackRock(s)), pillar));
    // At the gate the weed stands lower, as its picture has it: a black wet wall hung with weed, the pale cap over it.
    gateStacks.push(add(skirts, stackWeed(s.x, s.z, (y, angle) => stackRadius(s, y, angle), 220, 0.7, 11, 0.2), weedGate));
  });
  const arch = add(blades, worldSpace(archShape(68, 45, 13, 19, 96, 64)), rock);
  arch.position.set(STATIONS.arch[0], 0, STATIONS.arch[1]);
  arch.rotation.y = Math.atan2(STATIONS.establish[0] - STATIONS.arch[0], STATIONS.establish[1] - STATIONS.arch[1]);
  ctx.scene.add(ctx.parts.built('ribs', blades));

  // The colony's rock: ledges above the tide line, weed below.
  const ledges = new THREE.Mesh(roundSpace(colonyRock(), COLONY.x, COLONY.z, 60, Math.atan2(COLONY.side[1], COLONY.side[0]) + Math.PI), roostRock);
  ctx.scene.add(ctx.parts.built('ledges', ledges));
  // The crag draws its own weed line; the skirt hangs under it, out of the colony's frame.
  // It hangs clear of every ledge and block: a curtain over the widest the rock stands within a few metres of a place, not a skin on it.
  const curtain = (y: number, angle: number): number => {
    let r = 0;
    for (const dy of [-3, -1.5, 0, 1.5, 3]) for (const da of [-0.03, 0, 0.03]) r = Math.max(r, COLONY.cragAt(angle + da, Math.max(0, y + dy)));
    return r;
  };
  add(skirts, stackWeed(COLONY.x, COLONY.z, curtain, 420, 0.5, 9), weed);
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
  for (let i = 0; i < 700; i++) {
    const x = scatter.range(-300, 380);
    const z = scatter.range(-1500, 260);
    const size = 0.12 + 1.7 * Math.pow(scatter.next(), 3.5);
    const rock = { x, z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.3, 0.3), kind: scatter.int(KINDS), sink: scatter.range(0.25, 0.6) };
    // In groups, bare flat between them: a strewing at even spacing reads as one.
    // The groups are drawn out across the strait, as the tide leaves them.
    if (fbm3(x / 70, 1.5, z / 17, 2) > 0.58) placed.push(rock);
  }
  // Cobbles and half sunk stones, in drifts: thick where the floor stands proud, thin in the pools.
  for (let i = 0; i < 3000; i++) {
    const near = i < 1600;
    const x = near ? STATIONS.establish[0] + scatter.range(-170, 330) : scatter.range(-300, 380);
    const z = near ? STATIONS.establish[1] - 420 * Math.pow(scatter.next(), 1.6) + 30 : scatter.range(-1500, 200);
    const size = 0.05 + 0.3 * Math.pow(scatter.next(), 4);
    const drift = fbm3(x / 48, 0.5, z / 12, 2);
    const yaw = scatter.range(0, 6.283);
    const tilt = scatter.range(-0.3, 0.3);
    const kind = scatter.int(KINDS);
    const sink = scatter.range(0.2, 0.55);
    if (drift > 0.56 + 0.1 * scatter.next()) placed.push({ x, z, size, yaw, tilt, kind, sink });
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
      const size = 0.02 + 0.045 * scatter.next() + 0.34 * Math.pow(scatter.next(), 7);
      const yaw2 = scatter.range(0, 6.283);
      const tilt = scatter.range(-0.3, 0.3);
      const kind = scatter.int(KINDS);
      const sink = scatter.range(0.4, 0.7);
      const drift = noise3(x / 9, 0.5, z / 2.6) * 0.65 + noise3(x / 1.3, 2.5, z / 1.3) * 0.35;
      // Thick on the bars that stand out of the water, a few in the sheets.
      if (drift + 0.9 * Math.min(0.3, Math.max(0, bed(x, z) - LEVELS.pool - 0.05)) > 0.5 + 0.3 * scatter.next()) placed.push({ x, z, size, yaw: yaw2, tilt, kind, sink });
    }
  };
  strew(shots['ribs-02'] as (typeof shots)[string], keyPart(shotById('ribs-02')), 2600, 1.2, 40, 0.62);
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
  // Weed-grown rock close under the gate's lens, left and right of its way: dark, out of focus, the flat between them clear.
  {
    const pose = resolve(shots['ribs-06'] as (typeof shots)[string], keyPart(shotById('ribs-06')), 0);
    const yaw = yawOf(pose.aim, pose.position);
    for (let i = 0; i < 44; i++) {
      const r = 2.6 + 30 * Math.pow(scatter.next(), 1.7);
      const side = i % 2 === 0 ? -1 : 1;
      const a = yaw + side * scatter.range(0.2, 0.62) * (r < 8 ? 1 : 0.7);
      const x = pose.position[0] + Math.sin(a) * r;
      const z = pose.position[2] - Math.cos(a) * r;
      const size = (0.45 + 1.1 * Math.pow(scatter.next(), 2)) * (0.6 + r / 30);
      if (!nearTrack(x, z, 1.6 + size)) placed.push({ x, z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.15, 0.15), kind: scatter.int(KINDS), sink: scatter.range(0.45, 0.66) });
    }
    // And the low heaps right under the lens at its key, clear of its way: (metres ahead, metres to the right, size).
    const ahead0: [number, number, number][] = [[4.4, 2.3, 1.3], [5.8, 3.6, 1.7], [3.8, 0.7, 0.45], [9.5, -4.4, 1.5], [8.2, -1.2, 0.7], [8, 4.6, 1.2], [11, 1.5, 0.9], [7, 1.2, 0.5]];
    ahead0.forEach(([f, rt, size], i) => {
      const x = pose.position[0] + Math.sin(yaw) * f + Math.cos(yaw) * rt;
      const z = pose.position[2] - Math.cos(yaw) * f + Math.sin(yaw) * rt;
      placed.push({ x, z, size, yaw: 1.3 + i * 2.1, tilt: 0.1 * Math.sin(i * 1.7), kind: i % KINDS, sink: 0.36 + 0.05 * (i % 3) });
    });
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
  // Black rocks and heaps of wrack out on the flat before the wide lens, in knots of a few: what gives the floor its dark marks.
  {
    const pose = resolve(shots['ribs-02'] as (typeof shots)[string], keyPart(shotById('ribs-02')), 0);
    const yaw = yawOf(pose.aim, pose.position);
    for (let knot = 0; knot < 46; knot++) {
      const r = 9 + 230 * Math.pow(scatter.next(), 1.7);
      const a = yaw + scatter.range(-0.55, 0.6);
      const kx = pose.position[0] + Math.sin(a) * r;
      const kz = pose.position[2] - Math.cos(a) * r;
      const lumps = 2 + scatter.int(5);
      const heap = scatter.next() < 0.55;
      for (let i = 0; i < lumps; i++) {
        const x = kx + scatter.range(-1, 1) * (1.5 + r / 30);
        const z = kz + scatter.range(-1, 1) * (1.5 + r / 30);
        const size = (0.35 + 1.1 * Math.pow(scatter.next(), 2)) * (0.6 + r / 110);
        placed.push({ x, z, size, yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.15, 0.15), kind: scatter.int(KINDS), sink: heap ? scatter.range(0.58, 0.7) : scatter.range(0.38, 0.52) });
      }
    }
  }
  // What lies on the flat is gathered: long patches drawn out along the strait with bare wet sand between them, the rubble under the
  // near cliff, and what each low lens has close under it. Three stones in four of an even strewing are taken away.
  const gateAt0 = resolve(shots['ribs-06'] as (typeof shots)[string], keyPart(shotById('ribs-06')), 0).position;
  const feedAt0 = resolve(shots['ribs-04'] as (typeof shots)[string], keyPart(shotById('ribs-04')), 0).position;
  const cliff = RIBS[0] as Rib;
  const gathered = (x: number, z: number, size: number): boolean => {
    if (Math.hypot(x - cliff.x, z - cliff.z) < 150) return true;
    if (Math.hypot(x - (gateAt0[0] as number), z - (gateAt0[2] as number)) < 70 || Math.hypot(x - (feedAt0[0] as number), z - (feedAt0[2] as number)) < 60) return true;
    const patch0 = fbm3(x / 42 + 7.3, 3.5, z / 130, 2) + 0.12 * noise3(x / 6, 8.5, z / 6);
    return patch0 > (size < 0.09 ? 0.42 : 0.44);
  };
  const kept = placed.filter((p) => gathered(p.x, p.z, p.size) && !nearTrack(p.x, p.z, p.size < 0.3 ? 0.4 + p.size : p.sink > 0.555 ? 1.5 + p.size : 4 + p.size * 2.5) && bed(p.x, p.z) > -1.5);
  STATIONS.foreground.forEach(([x, z, size], i) => {
    kept.push({ x, z, size, yaw: 1.3 + i * 2.4, tilt: 0.1, kind: i % KINDS, sink: 0.55 });
    // A heap, not one stone: smaller rock against its sides.
    for (let k = 0; k < 9; k++) {
      const a = scatter.range(0, 6.283);
      const r = size * scatter.range(0.75, 1.5);
      kept.push({ x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, size: Math.min(0.9, size * scatter.range(0.22, 0.5)), yaw: scatter.range(0, 6.283), tilt: scatter.range(-0.3, 0.3), kind: scatter.int(KINDS), sink: scatter.range(0.3, 0.5) });
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
    setTime: (seconds) => {
      const opening = inOpening() ? openingWeight(seconds + 4) : 0;
      for (const b of openBlades) {
        b.mesh.material = opening > 0 ? b.staged : b.film;
        (b.staged.uniforms.uOpenStone as THREE.IUniform<THREE.Vector2>).value.x = Math.min(1, opening * 2.5);
        (b.staged.uniforms.uOpenLight as THREE.IUniform<THREE.Vector2>).value.set(openingDark(seconds), openingLight(seconds));
      }
      const staged = stagedSeconds();
      const atGate = staged >= gateShot.from && staged <= gateShot.to;
      for (const m of gateStacks) m.visible = atGate;
      for (const image of mirrors.children) (image as THREE.Mesh).material = loopPhase() === null ? glass : glassLoop;
    },
    dispose: () => {
      for (const group of [blades, skirts, rocks, mirrors]) group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      for (const b of openBlades) b.staged.dispose();
      floor.geometry.dispose();
      ledges.geometry.dispose();
      for (const m of [ground, roostRock, weed, weedNear, boulder, pebble, glass, glassLoop, ...stones.values()]) m.dispose();
    },
  };
}
