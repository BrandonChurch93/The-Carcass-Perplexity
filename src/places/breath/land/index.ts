// The rock of the Breath: the tidal shelf, the main shaft with its hoops and the slabs that fell from them, the mouths of the smaller shafts, and the far cliff with its cave.
// rock.ts is the surfaces, shapes.ts is the shapes. This folder also tells the rig the true height of the land, so that the low sun's long shadows are baked from it.
import * as THREE from 'three';
import { terrain } from '../../../core/blockout';
import { DEPTH, RAD, SEA, bearingOf, farGround, ground, lerp, nearLand, rimRadius, smooth } from '../land';
import { SMALLER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { createRock } from './rock';
import { cliff, collar, heap, hoop, mergeGeometries, open, shaftWall, slab, talusHeight } from './shapes';

export const PARTS: readonly string[] = ['land', 'shaft', 'hoops', 'slabs', 'cliff'];

const WORLD = 16000;

/** The levels of the hoops of the main shaft: depth of the middle, radius of the wall there, how far a hoop stands out of the wall. Each lower
 *  one stands further in, so that they step down as terraces. */
const LEVELS: [number, number, number][] = [
  [-3.6, 29.0, 1.9],
  [-10.2, 27.6, 2.1],
  [-17, 26.2, 2.1],
  [-24, 24.8, 2.0],
  [-31.2, 23.4, 2.0],
  [-39.2, 21.8, 1.9],
];
/** What is left of each hoop: level, from and to (bearings in degrees). The east-south-east side, 70 to 150 degrees, is where the wall came
 *  down: no hoop is whole across it, and everywhere else they are broken into lengths. */
const HOOPS: [number, number, number][] = [
  [0, -176, -62],
  [0, -54, 66],
  [0, 156, 186],
  [1, -150, -22],
  [1, -14, 58],
  [1, 162, 204],
  [2, -178, -84],
  [2, -76, 74],
  [3, -140, 48],
  [3, 150, 214],
  [4, -166, 82],
  [5, -120, 60],
  [5, 140, 232],
];

export function create(ctx: Context): Piece {
  // The true land: the layout's ground with the shaft cut into it. How wet the rock is follows its height over the tide.
  ctx.rig.setLand(
    (x, z) => (Math.hypot(x, z) < rimRadius(bearingOf(x, z)) ? -DEPTH : ground(x, z)),
    (x, z) => 1 - smooth((ground(x, z) - SEA - 0.1) / 0.85),
  );

  const rock = createRock(ctx.rig.uniforms, ctx.rng('land/rock'));
  const disposable: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh => {
    disposable.push(g);
    return new THREE.Mesh(g, m);
  };

  // The shelf: fine round the shaft, coarse out to the haze.
  const land = new THREE.Group();
  const near = nearLand(500);
  near.computeVertexNormals();
  land.add(mesh(open(near), rock.shelf));
  const far = terrain(WORLD, WORLD, 160, 160, farGround);
  far.computeVertexNormals();
  land.add(mesh(open(far), rock.shelf));
  ctx.scene.add(ctx.parts.built('land', land));

  // The main shaft's wall and the mouths of the smaller ones.
  const shaft = new THREE.Group();
  const wall = rock.bone(0.25, [0.17, 0.15, 0.13], [0.075, 0.066, 0.06], THREE.DoubleSide);
  shaft.add(mesh(shaftWall(), wall));
  const rubble = rock.bone(0.5, [0.3, 0.265, 0.215], [0.14, 0.12, 0.1], THREE.DoubleSide);
  const fallen = rock.bone(0.8, [0.38, 0.34, 0.275], [0.2, 0.175, 0.14], THREE.DoubleSide);
  const pale = rock.bone(1, [0.46, 0.41, 0.33], [0.27, 0.23, 0.18], THREE.DoubleSide);
  for (const [x, z, r] of SMALLER) shaft.add(mesh(collar(x, z, r), pale));
  ctx.scene.add(ctx.parts.built('shaft', shaft));

  // The hoops: ribs of cartilage that held the airway open, ivory, stained, broken off where the wall fell.
  const hoops = new THREE.Group();
  hoops.add(
    mesh(
      mergeGeometries(
        HOOPS.map(([at, from, to], i) => {
          const [y, r, thick] = LEVELS[at] as [number, number, number];
          return hoop(y - 0.25 * (i % 3), r + 0.15 * (i % 2), from, to, thick * (0.9 + 0.07 * (i % 4)), i * 3.7);
        }),
      ),
      pale,
    ),
  );
  ctx.scene.add(ctx.parts.built('hoops', hoops));

  // The slabs: what the east-south-east side became. They lie from the lip down a heap of rubble to the middle of the shaft.
  const slabs = new THREE.Group();
  const rs = ctx.rng('land/slabs');
  const blocks: THREE.BufferGeometry[] = [];
  // On the rubble: each lies on the slope where it stopped, long side across the fall.
  for (let i = 0; i < 10; i++) {
    const k = i / 9;
    const b = (112 + (rs.next() - 0.5) * 62) * RAD;
    const r = lerp(rimRadius(b) + 1.5, 7, k ** 0.8) + rs.range(-1.5, 1.5);
    const x = Math.sin(b) * r;
    const z = -Math.cos(b) * r;
    const h = rs.range(1.6, 3);
    const y = (r > rimRadius(b) ? ground(x, z) : talusHeight(x, z)) + h * 0.3;
    const slope = r > rimRadius(b) - 1 ? 0.12 : 0.62;
    blocks.push(slab(rs, rs.range(8, 14), h, rs.range(5, 9), [x, y, z], [slope + rs.range(-0.18, 0.3), -b + rs.range(-0.6, 0.6), rs.range(-0.2, 0.2)]));
  }
  // On the terraces: pieces of the hoop above that stopped on the one below. The last is the block the size of a truck on the third hoop.
  for (const [bearing, hoopIndex, w, d, yaw, lean] of [
    [-50, 1, 7, 4, 0.4, 0.2],
    [44, 0, 8, 4.5, -0.3, -0.25],
    [-80, 2, 9, 5, 0.9, 0.3],
    [185, 3, 7, 4, 0.2, -0.3],
    [-4, 3, 8, 4.5, -0.5, 0.25],
    [40, 2, 9.5, 5, 0.35, 0.12],
  ] as const) {
    const [hy, hr, thick] = LEVELS[hoopIndex] as [number, number, number];
    const r = hr - 0.6;
    const b = bearing * RAD;
    blocks.push(slab(rs, w, 3.4, d, [Math.sin(b) * r, hy + thick * 1.35 + 1.3, -Math.cos(b) * r], [lean, -b + yaw, lean * 0.5]));
  }
  slabs.add(mesh(mergeGeometries(blocks), fallen));
  slabs.add(mesh(heap(), rubble));
  ctx.scene.add(ctx.parts.built('slabs', slabs));

  // The cliff, 3 km on.
  ctx.scene.add(ctx.parts.built('cliff', mesh(cliff(), rock.cliff)));

  return {
    dispose: () => {
      for (const g of disposable) g.dispose();
      rock.dispose();
    },
  };
}
