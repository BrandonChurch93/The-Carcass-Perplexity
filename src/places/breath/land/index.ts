// The rock of the Breath: the tidal shelf, the main shaft with its hoops and the slabs that fell from them, the mouths of the smaller shafts, and the far cliff with its cave.
// rock.ts is the surfaces, shapes.ts is the shapes. This folder also tells the rig the true height of the land, so that the low sun's long shadows are baked from it.
import * as THREE from 'three';
import { terrain } from '../../../core/blockout';
import { DEPTH, FINE, NEAR, RAD, SEA, bearingOf, farGround, ground, lerp, midGround, rimRadius, smooth } from '../land';
import { DEAD_WADER, SMALLER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { createCliff } from '../air/sky';
import { bakeNear } from './field';
import { createRock, type Surface } from './rock';
import { block } from './ribs';
import { FACE, archTop } from './arches';
import { buildWall } from './wall';
import { collar, heap, mergeGeometries, open, talusHeight } from './shapes';
import { scatter } from './stones';

export const PARTS: readonly string[] = ['land', 'shaft', 'hoops', 'slabs', 'cliff'];

const WORLD = 16000;

export function create(ctx: Context): Piece {
  // The true land: the layout's ground with the shaft cut into it. How wet the rock is follows its height over the tide.
  ctx.rig.setLand(
    (x, z) => (Math.hypot(x, z) < rimRadius(bearingOf(x, z)) ? -DEPTH : ground(x, z)),
    (x, z) => 1 - smooth((ground(x, z) - SEA - 0.1) / 0.85),
  );

  // The material pictures of the place (assets-src/breath/mat/RECIPE.md): colour and height, lit by the rig like everything else.
  const surface = (name: string, mean: [number, number, number], metres: number, relief: number, anisotropy = 1): Surface => ({
    colour: ctx.assets.texture(`mat/${name}.jpg`, { kind: 'colour', repeat: true, anisotropy }),
    data: ctx.assets.texture(`mat/${name}-nh.png`, { kind: 'data', repeat: true, anisotropy }),
    mean,
    metres,
    relief,
  });
  const tile = (name: string, mean: [number, number, number], metres: number): Surface => ({
    colour: ctx.assets.texture(`land/${name}.jpg`, { kind: 'colour', repeat: true, anisotropy: 8 }),
    data: ctx.assets.texture(`land/${name}-nh.png`, { kind: 'data', repeat: true, anisotropy: 4 }),
    mean,
    metres,
    relief: 1,
  });
  const seep = surface('wall', [0.077, 0.061, 0.033], 4, 1.0);
  // The plate of the shelf, laid turn and turn about so that it has no edge (land.ts lays its relief the same way).
  const plate = ctx.assets.texture('mat/shelfplate.jpg', { kind: 'colour', repeat: true, anisotropy: 4 });
  plate.wrapS = THREE.MirroredRepeatWrapping;
  plate.wrapT = THREE.MirroredRepeatWrapping;
  const nearMap = bakeNear(ctx.rng('land/near'));
  const rock = createRock(ctx.rig.uniforms, ctx.rng('land/rock'), surface('wetrock', [0.153, 0.133, 0.107], 1.5, 1), plate, nearMap, {
    pad: ctx.assets.texture('mat/drypad.jpg', { kind: 'colour', anisotropy: 4 }),
    padHeight: ctx.assets.texture('mat/drypad-h.png', { kind: 'data' }),
    pebbles: surface('pebbles', [0.31, 0.272, 0.234], 1.5, 1, 4),
    crust: tile('crust', [0.307, 0.255, 0.218], 2.3),
    gravel: tile('gravel', [0.316, 0.259, 0.215], 1.35),
  });
  const disposable: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh => {
    disposable.push(g);
    return new THREE.Mesh(g, m);
  };

  // The shelf: fine round the shaft, coarse out to the haze.
  const land = new THREE.Group();
  land.add(mesh(open(nearMap.mesh(512)), rock.shelf));
  // Loose chips of the crust where a lens comes near (land/stones.ts), each seated on the shelf as its mesh has it, each with its shadow.
  const cell = FINE.size / 512;
  const drawn = (x: number, z: number): number => {
    const gx = (x - FINE.minX) / cell;
    const gz = (z - FINE.minZ) / cell;
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;
    const h = (i: number, j: number): number => nearMap.heightAt(FINE.minX + i * cell, FINE.minZ + j * cell);
    return fx + fz <= 1 ? h(ix, iz) + fx * (h(ix + 1, iz) - h(ix, iz)) + fz * (h(ix, iz + 1) - h(ix, iz)) : h(ix + 1, iz + 1) + (1 - fx) * (h(ix, iz + 1) - h(ix + 1, iz + 1)) + (1 - fz) * (h(ix + 1, iz) - h(ix + 1, iz + 1));
  };
  const loose = scatter(ctx.rng('land/stones'), drawn, [[DEAD_WADER.x, DEAD_WADER.z, 1.7]]);
  const chips = rock.bone(1, [0.8, 0.76, 0.69], [0.56, 0.52, 0.45], { ...tile('crust', [0.307, 0.255, 0.218], 0.6) }, THREE.FrontSide);
  land.add(mesh(loose.geometry, chips));
  const thrown = ctx.rig.contactDiscs(loose.shades.length);
  // The shadow begins at the chip's far edge: laid under the chip it shades the chip itself (the rig shades whatever stands in a disc).
  const [wayX, wayZ] = ctx.rig.sun.shadowWay;
  loose.shades.forEach(([x, z, radius, tall], i) => ctx.rig.setShadow(thrown, i, x + wayX * radius * 0.9, z + wayZ * radius * 0.9, radius * 0.5, tall * 0.6, 0.6));
  const mid = terrain(NEAR, NEAR, 300, 300, midGround);
  mid.computeVertexNormals();
  land.add(mesh(open(mid), rock.shelf));
  const far = terrain(WORLD, WORLD, 160, 160, farGround);
  far.computeVertexNormals();
  land.add(mesh(open(far), rock.shelf));
  ctx.scene.add(ctx.parts.built('land', land));

  // The main shaft: the dark bedded wall, and the pale arches that stand out of it (land/wall.ts, land/arches.ts).
  const mirrored = (name: string, kind: 'colour' | 'data', anisotropy = 2): THREE.Texture => {
    const t = ctx.assets.texture(name, { kind, repeat: true, anisotropy });
    t.wrapS = THREE.MirroredRepeatWrapping;
    t.wrapT = THREE.MirroredRepeatWrapping;
    return t;
  };
  const built = buildWall();
  const wall = rock.pit(0, seep);
  // The hoops: the sheet of a broken bedded face and the sheet of the outer skin (assets-src/breath/land/RECIPE.md), mirrored at each repeat.
  const sheet = (name: string, mean: [number, number, number], metres: number, relief: number): Surface => ({
    colour: mirrored(`land/${name}.jpg`, 'colour', 1),
    data: mirrored(`land/${name}-h.png`, 'data', 1),
    mean,
    metres,
    relief,
  });
  const arches = rock.hoop(sheet('travface', [0.385, 0.259, 0.159], FACE.wide, 0.2), FACE.tall, sheet('travskin', [0.467, 0.29, 0.157], 3.2, 0.2));
  const shaft = new THREE.Group();
  shaft.add(mesh(built.wall, wall));
  const rubble = rock.bone(0.68, [0.55, 0.52, 0.46], [0.27, 0.25, 0.22], surface('scree', [0.287, 0.229, 0.184], 2.2, 1.2), THREE.DoubleSide);
  const pale = rock.bone(1, [0.6, 0.56, 0.49], [0.42, 0.385, 0.33], surface('shelf', [0.438, 0.363, 0.302], 6, 0.9), THREE.DoubleSide);
  for (const [x, z, r] of SMALLER) shaft.add(mesh(collar(x, z, r), pale));
  ctx.scene.add(ctx.parts.built('shaft', shaft));

  // The arches.
  const hoops = new THREE.Group();
  for (const g of built.ribs) hoops.add(mesh(g, arches));
  ctx.scene.add(ctx.parts.built('hoops', hoops));

  // The slabs: what the east-south-east side became. They lie from the lip down a heap of rubble to the middle of the shaft.
  const slabs = new THREE.Group();
  const rs = ctx.rng('land/slabs');
  const blocks: THREE.BufferGeometry[] = [];
  // On the rubble: each lies on the slope where it stopped, long side across the fall.
  for (let i = 0; i < 28; i++) {
    const k = rs.next();
    const b = (108 + (rs.next() - 0.5) * 44) * RAD;
    const r = lerp(rimRadius(b) - 4.5, 13, k ** 0.8) + rs.range(-1.5, 1.5);
    const x = Math.sin(b) * r;
    const z = -Math.cos(b) * r;
    // A few great slabs and many lesser blocks.
    const big = i < 2 ? 0.8 : 0.6 * rs.next() ** 2.2;
    const h = lerp(0.8, 4.4, big) * rs.range(0.8, 1.2);
    const y = (r > rimRadius(b) ? ground(x, z) : talusHeight(x, z)) - h * 0.2;
    const slope = r > rimRadius(b) - 1 ? 0.12 : 0.62;
    blocks.push(block(i + 1, [lerp(1.6, 11, big) * rs.range(0.8, 1.25), h, lerp(1.2, 6.5, big) * rs.range(0.8, 1.2)], [x, y, z], [slope + rs.range(-0.25, 0.35), -b + rs.range(-0.9, 0.9), rs.range(-0.3, 0.3)], 14));
  }
  // On the ledge in the rubble: three great blocks side by side where the band stopped them, each leaning on the slope behind it.
  for (const [bearing, long, tall, deep, yaw] of [
    [90, 7.5, 3.3, 4.6, 0.5],
    [98, 9.5, 3.9, 5.4, -0.35],
    [106, 6.5, 3.0, 4.2, 0.8],
  ] as const) {
    const b = bearing * RAD;
    const r = rimRadius(b) - 0.29 * (rimRadius(b) - 9);
    const x = Math.sin(b) * r;
    const z = -Math.cos(b) * r;
    blocks.push(block(90 + bearing, [long, tall, deep], [x, talusHeight(x, z) + tall * 0.22, z], [0.28, -b + yaw, 0.12 * yaw], 22));
  }
  // On the hoops: pieces of the ring above that stopped on the one below. Each lies flat on the top of a hoop, sunk a hand into the grit
  // there, with the lesser pieces that came down with it beside it. Where no hoop is under one it is not laid: hung on the wall at a
  // guessed depth they were bricks in the air.
  for (const [bearing, nth, w, d, yaw, lean] of [
    [-58, 1, 6.5, 3.6, 0.4, 0.35],
    [38, 0, 7.5, 4, -0.3, -0.4],
    [-84, 2, 8.5, 4.4, 0.9, 0.45],
    [-8, 2, 7.5, 4, -0.5, 0.4],
    [30, 2, 9, 4.6, 0.35, 0.3],
    [12, 1, 5.5, 3.2, 0.6, -0.45],
  ] as const) {
    const b = bearing * RAD;
    const seat = archTop(bearing, nth);
    if (!seat) continue;
    // A block, not a plank: as deep as a man is tall, tipped where it stopped, a corner of it down in the grit.
    blocks.push(block(20 + bearing * 0.37, [w * 0.62, 2.5, d * 0.8], [seat[0], seat[1] + 0.75, seat[2]], [lean * 0.6, -b + yaw, lean * 0.45], 80));
    for (let k = 0; k < 4; k++) {
      const side = (k % 2 === 0 ? 1 : -1) * (w * 0.3 + 0.6 + 1.1 * rs.next() + k * 0.5);
      const at = archTop(bearing + (side / Math.hypot(seat[0], seat[2])) / RAD, nth);
      const size = rs.range(0.7, 1.9);
      if (!at) continue;
      const out = rs.range(-0.6, 0.9);
      blocks.push(block(60 + k + bearing * 0.21, [size * rs.range(0.9, 1.5), size * 0.55, size], [at[0] - Math.sin(b) * out, at[1] + size * 0.2, at[2] + Math.cos(b) * out], [rs.range(-0.2, 0.2), rs.range(0, 6.28), rs.range(-0.2, 0.2)], 70));
    }
  }
  // The fallen slabs are the tiers' own stone, broken: cream like the tiers they fell from, plain on their broken faces. Drawn with the
  // tiers' bedded sheet they were striped like a sweet.
  const fallen = rock.bone(0.9, [0.74, 0.7, 0.62], [0.47, 0.43, 0.36], { ...tile('crust', [0.307, 0.255, 0.218], 5.5) }, THREE.DoubleSide);
  slabs.add(mesh(mergeGeometries(blocks), fallen));
  slabs.add(mesh(heap(), rubble));

  ctx.scene.add(ctx.parts.built('slabs', slabs));

  // The cliff, 3 km on: the far picture's own, laid on the sky (air/sky.ts).
  const farCliff = createCliff(ctx);
  ctx.scene.add(ctx.parts.built('cliff', farCliff.mesh));

  return {
    dispose: () => {
      for (const g of disposable) g.dispose();
      rock.dispose();
      nearMap.dispose();
      farCliff.dispose();
    },
  };
}
