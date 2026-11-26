// The rock of the Breath: the tidal shelf, the main shaft with its hoops and the slabs that fell from them, the mouths of the smaller shafts, and the far cliff with its cave.
// rock.ts is the surfaces, shapes.ts is the shapes. This folder also tells the rig the true height of the land, so that the low sun's long shadows are baked from it.
import * as THREE from 'three';
import { terrain } from '../../../core/blockout';
import { DEPTH, NEAR, RAD, SEA, bearingOf, farGround, ground, lerp, midGround, rimRadius, smooth } from '../land';
import { SMALLER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { bakeNear } from './field';
import { createRock, type Surface } from './rock';
import { block, rib, wall as shaftWall, wallRadius, type Rib } from './ribs';
import { cliff, collar, heap, mergeGeometries, open, talusHeight } from './shapes';

export const PARTS: readonly string[] = ['land', 'shaft', 'hoops', 'slabs', 'cliff'];

const WORLD = 16000;

/** The levels of the ribs of the main shaft: the height of the middle of each ring of them, metres. */
const LEVELS = [-4.4, -10.6, -17.4, -24.6, -31.8, -39.2];
/** What is left of each ring. The east-south-east side, 70 to 150 degrees, is where the wall came down: nothing spans it. Elsewhere each ring
 *  is broken into lengths that taper to a point in the wall or are snapped off, and every one hangs its own way. */
const P = 'point' as const;
const S = 'snap' as const;
const RIBS: Rib[] = [
  { y: LEVELS[0] as number, from: -172, to: -96, thick: 1.5, ends: [P, S], drop: -1.6, sag: 0.9, seed: 1 },
  { y: (LEVELS[0] as number) - 0.9, from: -88, to: -22, thick: 1.35, ends: [S, P], drop: 1.9, sag: 0.5, seed: 2 },
  { y: (LEVELS[0] as number) + 0.3, from: -30, to: 64, thick: 1.6, ends: [P, S], drop: -1.2, sag: 1.2, seed: 3 },
  { y: LEVELS[0] as number, from: 158, to: 196, thick: 1.2, ends: [S, P], drop: 1.0, sag: 0.3, seed: 4 },
  { y: LEVELS[1] as number, from: -156, to: -84, thick: 1.6, ends: [P, P], drop: 2.2, sag: 0.8, seed: 5 },
  { y: (LEVELS[1] as number) + 0.8, from: -92, to: 4, thick: 1.75, ends: [S, P], drop: -2.4, sag: 1.4, seed: 6 },
  { y: (LEVELS[1] as number) - 0.6, from: -6, to: 60, thick: 1.4, ends: [P, S], drop: 1.4, sag: 0.6, seed: 7 },
  { y: LEVELS[1] as number, from: 160, to: 206, thick: 1.3, ends: [S, P], drop: -1.2, sag: 0.4, seed: 8 },
  { y: LEVELS[2] as number, from: -182, to: -88, thick: 1.7, ends: [P, S], drop: 2.0, sag: 1.3, seed: 9 },
  { y: (LEVELS[2] as number) + 0.7, from: -80, to: -8, thick: 1.5, ends: [S, P], drop: -1.8, sag: 0.7, seed: 10 },
  { y: (LEVELS[2] as number) - 0.5, from: -14, to: 76, thick: 1.65, ends: [P, S], drop: 1.5, sag: 1.0, seed: 11 },
  { y: LEVELS[3] as number, from: -144, to: -58, thick: 1.6, ends: [P, P], drop: -2.2, sag: 1.1, seed: 12 },
  { y: (LEVELS[3] as number) + 0.5, from: -52, to: 46, thick: 1.7, ends: [S, P], drop: 1.6, sag: 1.2, seed: 13 },
  { y: LEVELS[3] as number, from: 152, to: 212, thick: 1.4, ends: [P, S], drop: 1.2, sag: 0.5, seed: 14 },
  { y: LEVELS[4] as number, from: -168, to: -40, thick: 1.7, ends: [S, P], drop: -2.0, sag: 1.5, seed: 15 },
  { y: (LEVELS[4] as number) - 0.4, from: -34, to: 82, thick: 1.6, ends: [P, S], drop: 1.8, sag: 1.0, seed: 16 },
  { y: LEVELS[5] as number, from: -122, to: 58, thick: 1.6, ends: [P, P], drop: 1.5, sag: 1.4, seed: 17 },
  { y: LEVELS[5] as number, from: 142, to: 230, thick: 1.5, ends: [S, P], drop: -1.4, sag: 0.8, seed: 18 },
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
  land.add(mesh(open(nearMap.mesh(960)), rock.shelf));
  const mid = terrain(NEAR, NEAR, 500, 500, midGround);
  mid.computeVertexNormals();
  land.add(mesh(open(mid), rock.shelf));
  const far = terrain(WORLD, WORLD, 160, 160, farGround);
  far.computeVertexNormals();
  land.add(mesh(open(far), rock.shelf));
  ctx.scene.add(ctx.parts.built('land', land));

  // The main shaft's wall and the mouths of the smaller ones.
  const shaft = new THREE.Group();
  const wall = rock.bone(0.2, [0.17, 0.165, 0.14], [0.06, 0.06, 0.05], seep, THREE.DoubleSide);
  shaft.add(mesh(shaftWall(LEVELS), wall));
  const rubble = rock.bone(0.5, [0.3, 0.27, 0.22], [0.12, 0.105, 0.085], strata, THREE.DoubleSide);
  const pale = rock.bone(1, [0.7, 0.64, 0.52], [0.42, 0.37, 0.29], ivory, THREE.DoubleSide);
  // The brim is the shelf's own top beds seen edge on: the layered rim.
  const beds = rock.bone(0.9, [0.5, 0.46, 0.39], [0.24, 0.215, 0.175], strata, THREE.DoubleSide);
  for (const [x, z, r] of SMALLER) shaft.add(mesh(collar(x, z, r), pale));
  ctx.scene.add(ctx.parts.built('shaft', shaft));

  // The ribs: cartilage that held the airway open, ivory, rust-stained, each hanging its own way, pointed or snapped where the wall let go.
  const hoops = new THREE.Group();
  hoops.add(mesh(mergeGeometries(RIBS.map((r) => rib(r))), pale));
  // The brim itself: the topmost bed of the shelf stands out over the drop as a ledge, thick and broken, wherever the wall has not fallen.
  const brim = (b: number): [number, number] => {
    const r = rimRadius(b);
    return [r - 0.3, ground(Math.sin(b) * (r + 1.2), -Math.cos(b) * (r + 1.2)) - 0.85];
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
        ).map(([from, to], i) => rib({ y: 0, from, to, thick: 1.15 + 0.1 * (i % 3), ends: [S, S], drop: 0, sag: 0, flat: 0.55, seed: 41 + i, follow: brim })),
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
  for (let i = 0; i < 12; i++) {
    const k = i / 11;
    const b = (112 + (rs.next() - 0.5) * 62) * RAD;
    const r = lerp(rimRadius(b) + 1.5, 7, k ** 0.8) + rs.range(-1.5, 1.5);
    const x = Math.sin(b) * r;
    const z = -Math.cos(b) * r;
    const h = rs.range(1.8, 3.4);
    const y = (r > rimRadius(b) ? ground(x, z) : talusHeight(x, z)) + h * 0.28;
    const slope = r > rimRadius(b) - 1 ? 0.12 : 0.62;
    blocks.push(block(i + 1, [rs.range(7, 13), h, rs.range(4, 8)], [x, y, z], [slope + rs.range(-0.18, 0.3), -b + rs.range(-0.6, 0.6), rs.range(-0.25, 0.25)]));
  }
  // On the ribs: pieces of the ring above that stopped on the one below, leaning on the wall.
  for (const [bearing, level, w, d, yaw, lean] of [
    [-50, 1, 6.5, 3.6, 0.4, 0.35],
    [44, 0, 7.5, 4, -0.3, -0.4],
    [-80, 2, 8.5, 4.4, 0.9, 0.45],
    [185, 3, 6.5, 3.6, 0.2, -0.3],
    [-4, 3, 7.5, 4, -0.5, 0.4],
    [40, 2, 9, 4.6, 0.35, 0.3],
    [-118, 1, 5, 3, -0.7, 0.5],
    [12, 1, 5.5, 3.2, 0.6, -0.45],
  ] as const) {
    const y = LEVELS[level] as number;
    const b = bearing * RAD;
    const r = wallRadius(b, y) - 1.7;
    blocks.push(block(20 + bearing * 0.37, [w, 2.6, d], [Math.sin(b) * r, y + 2.5, -Math.cos(b) * r], [lean, -b + yaw, lean * 0.6]));
  }
  slabs.add(mesh(mergeGeometries(blocks), pale));
  slabs.add(mesh(heap(), rubble));
  ctx.scene.add(ctx.parts.built('slabs', slabs));

  // The cliff, 3 km on.
  ctx.scene.add(ctx.parts.built('cliff', mesh(cliff(), rock.cliff)));

  return {
    dispose: () => {
      for (const g of disposable) g.dispose();
      rock.dispose();
      nearMap.dispose();
    },
  };
}
