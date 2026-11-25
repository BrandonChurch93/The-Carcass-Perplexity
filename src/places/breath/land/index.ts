// The rock of the Breath: the tidal shelf, the main shaft with its hoops and the slabs that fell from them, the mouths of the smaller shafts, and the far cliff with its cave.
// rock.ts is the surfaces, shapes.ts is the shapes. This folder also tells the rig the true height of the land, so that the low sun's long shadows are baked from it.
import * as THREE from 'three';
import { terrain } from '../../../core/blockout';
import { DEPTH, RAD, SEA, bearingOf, farGround, ground, lerp, nearLand, rimRadius, smooth } from '../land';
import { SMALLER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { createRock } from './rock';
import { boulder, cliff, collar, heap, hoop, mergeGeometries, open, shaftWall, slab } from './shapes';

export const PARTS: readonly string[] = ['land', 'shaft', 'hoops', 'slabs', 'cliff'];

const WORLD = 16000;

/** The hoops of the main shaft: depth of its middle, radius of the wall there, from and to (bearings in degrees), how far it stands out of the wall.
 *  The east-south-east side, 70 to 150 degrees, is where the wall came down: no hoop is whole across it. */
const HOOPS: [number, number, number, number, number][] = [
  [-3.2, 29.4, -172, 66, 1.9],
  [-3.6, 29.6, 156, 186, 1.6],
  [-9.4, 28.6, -150, 58, 2.1],
  [-9.8, 28.8, 162, 204, 1.8],
  [-16.2, 27.8, -178, 74, 2.1],
  [-23.2, 27, -140, 48, 2.0],
  [-23.6, 27.2, 150, 214, 1.8],
  [-30.5, 26.2, -166, 82, 2.0],
  [-38.5, 25.3, -120, 60, 1.9],
  [-38.9, 25.5, 140, 232, 1.8],
];

/** The boulders on the near shelf: x, z, half sizes, turn. */
const BOULDERS: [number, number, number, number, number, number][] = [
  [-45.6, 38.2, 5.5, 2.3, 3.6, 0.5],
  [-48.8, 44.6, 4, 2.6, 3, -0.3],
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
  const dark = rock.bone(0.4, [0.3, 0.27, 0.23], [0.14, 0.125, 0.11]);
  const shades = ctx.rig.contactDiscs(BOULDERS.length * 2);
  BOULDERS.forEach(([x, z, rx, ry, rz, turn], i) => {
    land.add(mesh(boulder([x, ground(x, z) + ry * 0.45, z], [rx, ry, rz], turn, i * 7.3), dark));
    ctx.rig.setDisc(shades, i * 2, x, z, Math.max(rx, rz) * 1.25, 0.8);
    ctx.rig.setShadow(shades, i * 2 + 1, x, z, Math.max(rx, rz) * 0.9, ry * 1.4, 0.85);
  });
  ctx.scene.add(ctx.parts.built('land', land));

  // The main shaft's wall and the mouths of the smaller ones.
  const shaft = new THREE.Group();
  const wall = rock.bone(0.25, [0.34, 0.3, 0.25], [0.17, 0.15, 0.13], THREE.DoubleSide);
  shaft.add(mesh(shaftWall(), wall));
  const pale = rock.bone(1, [0.74, 0.68, 0.57], [0.52, 0.46, 0.37], THREE.DoubleSide);
  for (const [x, z, r] of SMALLER) shaft.add(mesh(collar(x, z, r), pale));
  ctx.scene.add(ctx.parts.built('shaft', shaft));

  // The hoops: ribs of cartilage that held the airway open, ivory, stained, broken off where the wall fell.
  const hoops = new THREE.Group();
  hoops.add(mesh(mergeGeometries(HOOPS.map(([y, r, from, to, thick], i) => hoop(y, r, from, to, thick, i * 3.7))), pale));
  ctx.scene.add(ctx.parts.built('hoops', hoops));

  // The slabs: what the east-south-east side became. They lie from the lip down a heap of rubble to the middle of the shaft.
  const slabs = new THREE.Group();
  const rs = ctx.rng('land/slabs');
  const blocks: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 14; i++) {
    const k = i / 13;
    const b = (90 + 46 * rs.next()) * RAD;
    const r = lerp(37, 9, k) + rs.range(-2, 2);
    blocks.push(slab(rs, rs.range(8, 14), rs.range(2, 3.4), rs.range(5.5, 9), [Math.sin(b) * r, lerp(-0.2, -25, k) + rs.range(-1, 1), -Math.cos(b) * r], [rs.range(-0.5, 0.5), rs.range(0, 3), rs.range(-0.55, 0.55)]));
  }
  for (const [x, y, z, w, d, yaw, lean] of [
    [8, -8, -13, 15, 9, 0.5, 0.55],
    [15, -11.5, -6, 12, 8, 1.3, -0.5],
    [18, -16, 2, 13, 9, 2.2, 0.45],
    [4, -15, -7, 9, 7, 0.2, -0.35],
    // The block the size of a truck that rests on the third hoop.
    [11.5, -13.4, -20.5, 9, 4.6, 0.5, 0.14],
  ] as const) {
    blocks.push(slab(rs, w, 3.6, d, [x, y, z], [lean * 0.6, yaw, lean]));
  }
  slabs.add(mesh(mergeGeometries(blocks), pale));
  slabs.add(mesh(heap(19, 50, [14, -37, -4]), wall));
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
