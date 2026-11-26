// The rock of the Breath: the tidal shelf, the main shaft with its hoops and the slabs that fell from them, the mouths of the smaller shafts, and the far cliff with its cave.
// rock.ts is the surfaces, shapes.ts is the shapes. This folder also tells the rig the true height of the land, so that the low sun's long shadows are baked from it.
import * as THREE from 'three';
import { terrain } from '../../../core/blockout';
import { DEPTH, NEAR, RAD, SEA, bearingOf, farGround, ground, lerp, midGround, rimRadius, smooth } from '../land';
import { SMALLER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { createCliff } from '../air/sky';
import { bakeNear } from './field';
import { createRock, type Surface } from './rock';
import { block, rib, type Rib } from './ribs';
import { buildWall, ledge } from './wall';
import { collar, heap, mergeGeometries, open, talusHeight } from './shapes';

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
  const strata = surface('strata', [0.298, 0.223, 0.16], 2.5, 1.1);
  const ivory = surface('hoop', [0.493, 0.392, 0.288], 2.2, 1.0);
  const seep = surface('wall', [0.077, 0.061, 0.033], 4, 1.0);
  // The plate of the shelf, laid turn and turn about so that it has no edge (land.ts lays its relief the same way).
  const plate = ctx.assets.texture('mat/shelfplate.jpg', { kind: 'colour', repeat: true, anisotropy: 4 });
  plate.wrapS = THREE.MirroredRepeatWrapping;
  plate.wrapT = THREE.MirroredRepeatWrapping;
  const nearMap = bakeNear(ctx.rng('land/near'));
  const rock = createRock(ctx.rig.uniforms, ctx.rng('land/rock'), surface('wetrock', [0.153, 0.133, 0.107], 1.5, 1), plate, surface('cliff', [0.291, 0.273, 0.265], 200, 22), nearMap);
  const disposable: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh => {
    disposable.push(g);
    return new THREE.Mesh(g, m);
  };

  // The shelf: fine round the shaft, coarse out to the haze.
  const land = new THREE.Group();
  land.add(mesh(open(nearMap.mesh(512)), rock.shelf));
  const mid = terrain(NEAR, NEAR, 300, 300, midGround);
  mid.computeVertexNormals();
  land.add(mesh(open(mid), rock.shelf));
  const far = terrain(WORLD, WORLD, 160, 160, farGround);
  far.computeVertexNormals();
  land.add(mesh(open(far), rock.shelf));
  ctx.scene.add(ctx.parts.built('land', land));

  // The main shaft's wall and its ribs: one mesh shaped by the wall plate's relief and coloured by its picture (land/wall.ts).
  const mirrored = (name: string, kind: 'colour' | 'data'): THREE.Texture => {
    const t = ctx.assets.texture(name, { kind, repeat: true, anisotropy: 2 });
    t.wrapS = THREE.MirroredRepeatWrapping;
    t.wrapT = THREE.MirroredRepeatWrapping;
    return t;
  };
  const built = buildWall();
  const wall = rock.wall(mirrored('mat/shaftwall.jpg', 'colour'), mirrored('mat/shaftwall-h.png', 'data'), ivory, surface('wetrock', [0.153, 0.133, 0.107], 1.5, 1));
  const shaft = new THREE.Group();
  shaft.add(mesh(built.wall, wall));
  const rubble = rock.bone(0.3, [0.34, 0.3, 0.25], [0.13, 0.115, 0.095], surface('scree', [0.287, 0.229, 0.184], 3, 1.2), THREE.DoubleSide);
  const pale = rock.bone(1, [0.6, 0.56, 0.49], [0.42, 0.385, 0.33], surface('shelf', [0.438, 0.363, 0.302], 6, 0.9), THREE.DoubleSide);
  for (const [x, z, r] of SMALLER) shaft.add(mesh(collar(x, z, r), pale));
  ctx.scene.add(ctx.parts.built('shaft', shaft));

  // The ribs: the cells of the same mesh that stand out of the wall.
  const hoops = new THREE.Group();
  hoops.add(mesh(built.ribs, wall));
  ctx.scene.add(ctx.parts.built('hoops', hoops));

  // The slabs: what the east-south-east side became. They lie from the lip down a heap of rubble to the middle of the shaft.
  const slabs = new THREE.Group();
  const rs = ctx.rng('land/slabs');
  const blocks: THREE.BufferGeometry[] = [];
  // On the rubble: each lies on the slope where it stopped, long side across the fall.
  for (let i = 0; i < 46; i++) {
    const k = rs.next();
    const b = (112 + (rs.next() - 0.5) * 60) * RAD;
    const r = lerp(rimRadius(b) + 1.5, 13, k ** 0.8) + rs.range(-1.5, 1.5);
    const x = Math.sin(b) * r;
    const z = -Math.cos(b) * r;
    // A few great slabs and many lesser blocks.
    const big = i < 6 ? 0.8 : rs.next() ** 2.2;
    const h = lerp(0.7, 3.2, big) * rs.range(0.8, 1.2);
    const y = (r > rimRadius(b) ? ground(x, z) : talusHeight(x, z)) + h * 0.3;
    const slope = r > rimRadius(b) - 1 ? 0.12 : 0.62;
    blocks.push(block(i + 1, [lerp(1.6, 11, big) * rs.range(0.8, 1.25), h, lerp(1.2, 6.5, big) * rs.range(0.8, 1.2)], [x, y, z], [slope + rs.range(-0.25, 0.35), -b + rs.range(-0.9, 0.9), rs.range(-0.3, 0.3)]));
  }
  // On the ribs: pieces of the ring above that stopped on the one below, leaning on the wall.
  for (const [bearing, nth, w, d, yaw, lean] of [
    [-58, 1, 6.5, 3.6, 0.4, 0.35],
    [38, 0, 7.5, 4, -0.3, -0.4],
    [-84, 2, 8.5, 4.4, 0.9, 0.45],
    [-8, 2, 7.5, 4, -0.5, 0.4],
    [30, 2, 9, 4.6, 0.35, 0.3],
    [12, 1, 5.5, 3.2, 0.6, -0.45],
  ] as const) {
    const b = bearing * RAD;
    const [x, y, z] = ledge(bearing, nth);
    blocks.push(block(20 + bearing * 0.37, [w, 2.4, d], [x, y + 0.9, z], [lean, -b + yaw, lean * 0.6]));
  }
  // The fallen slabs are the shelf's own stone, broken: its beds show on their sides, and they are wet and stained, not pale.
  const face = mirrored('land/slabface.jpg', 'colour');
  const fallen = rock.bone(0.5, [0.36, 0.32, 0.27], [0.07, 0.06, 0.05], { colour: face, data: ctx.assets.texture('mat/shelf-nh.png', { kind: 'data', repeat: true, anisotropy: 1 }), mean: [0.42, 0.36, 0.3], metres: 5.5, relief: 1.6 }, THREE.DoubleSide);
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
