// The rock of the Breath: the tidal shelf, the main shaft with its hoops and the slabs that fell from them, the mouths of the smaller shafts, and the far cliff with its cave.
// rock.ts is the surfaces, shapes.ts is the shapes. This folder also tells the rig the true height of the land, so that the low sun's long shadows are baked from it.
import * as THREE from 'three';
import { terrain } from '../../../core/blockout';
import { DEPTH, RAD, SEA, bearingOf, farGround, ground, lerp, nearLand, rimRadius, smooth } from '../land';
import { SMALLER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { createRock, type Surface } from './rock';
import { cliff, collar, heap, hoop, mergeGeometries, open, shaftWall, slab, talusHeight } from './shapes';

export const PARTS: readonly string[] = ['land', 'shaft', 'hoops', 'slabs', 'cliff'];

const WORLD = 16000;

/** The levels of the hoops of the main shaft: depth of the middle, radius of the wall there, how far a hoop stands out of the wall. Each lower
 *  one stands further in, so that they step down as terraces. */
const LEVELS: [number, number, number][] = [
  [-3.6, 29.0, 1.9],
  [-10.6, 27.6, 2.1],
  [-17.6, 26.2, 2.1],
  [-24.6, 24.8, 2.0],
  [-31.6, 23.4, 2.0],
  [-38.6, 21.8, 1.9],
];
/** What is left of each hoop: level, from and to (bearings in degrees). The east-south-east side, 70 to 150 degrees, is where the wall came
 *  down: no hoop is whole across it, and everywhere else they are broken into lengths. */
const HOOPS: [number, number, number][] = [
  [0, -176, -62],
  [0, -53, 66],
  [0, 156, 186],
  [1, -150, -90],
  [1, -81, 58],
  [1, 162, 204],
  [2, -178, -84],
  [2, -75, 74],
  [3, -140, -61],
  [3, -52, 48],
  [3, 150, 214],
  [4, -166, 18],
  [4, 28, 82],
  [5, -120, 60],
  [5, 140, 232],
];

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
  const strata = surface('strata', [0.298, 0.223, 0.16], 5, 1.6);
  const ivory = surface('hoop', [0.493, 0.392, 0.288], 4, 0.9);
  const seep = surface('wall', [0.077, 0.061, 0.033], 6, 1.6);
  const rock = createRock(ctx.rig.uniforms, ctx.rng('land/rock'), surface('shelf', [0.438, 0.363, 0.302], 6, 0.09), surface('cliff', [0.291, 0.273, 0.265], 200, 22));
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
  const wall = rock.bone(0.25, [0.12, 0.115, 0.105], [0.05, 0.048, 0.045], seep, THREE.DoubleSide);
  shaft.add(mesh(shaftWall(), wall));
  const rubble = rock.bone(0.5, [0.3, 0.265, 0.215], [0.14, 0.12, 0.1], strata, THREE.DoubleSide);
  const fallen = rock.bone(0.8, [0.38, 0.34, 0.275], [0.2, 0.175, 0.14], strata, THREE.DoubleSide);
  const pale = rock.bone(1, [0.62, 0.56, 0.46], [0.36, 0.31, 0.24], ivory, THREE.DoubleSide);
  // The brim is the shelf's own top beds seen edge on: the layered rim.
  const beds = rock.bone(0.9, [0.44, 0.4, 0.34], [0.2, 0.18, 0.145], strata, THREE.DoubleSide);
  for (const [x, z, r] of SMALLER) shaft.add(mesh(collar(x, z, r), pale));
  ctx.scene.add(ctx.parts.built('shaft', shaft));

  // The hoops: ribs of cartilage that held the airway open, ivory, stained, broken off where the wall fell.
  const hoops = new THREE.Group();
  hoops.add(
    mesh(
      mergeGeometries(
        HOOPS.map(([at, from, to], i) => {
          const [y, r, thick] = LEVELS[at] as [number, number, number];
          return hoop(y, r + 0.15 * (i % 2), from, to, thick * (0.9 + 0.07 * (i % 4)), i * 3.7);
        }),
      ),
      pale,
    ),
  );
  // The brim itself: the topmost bed of the shelf stands out over the drop as a ledge, thick and broken, wherever the wall has not fallen.
  const brim = (b: number): [number, number] => {
    const r = rimRadius(b);
    return [r + 0.4, ground(Math.sin(b) * (r + 1.2), -Math.cos(b) * (r + 1.2)) - 1.0];
  };
  hoops.add(
    mesh(
      mergeGeometries(
        (
          [
            [-178, -40],
            [-34, 22],
            [27, 66],
            [158, 181],
          ] as const
        ).map(([from, to], i) => hoop(0, 30, from, to, 1.1 + 0.1 * (i % 3), 41 + i * 5.3, brim)),
      ),
      beds,
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
