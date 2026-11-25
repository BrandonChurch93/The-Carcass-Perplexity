// The land of the Heart: the caldera wall, the buttress, the country outside, the bench the camera travels on, its loose rock, and the sulphur crack.
// height.ts is the shape (one function of x and z, which the rig bakes), meshes.ts turns it into triangles, shaders.ts is the rock, rocks.ts scatters the loose blocks.
import * as THREE from 'three';
import { BUTTRESS, benchDistance, calderaDistance } from '../layout';
import { CRACK_FOOT, CRACK_TOP } from '../shared/anchors';
import type { HeartContext, HeartPiece } from '../shared/context';
import { FLOWS, crackDip, landHeight, nearCrack, setCracks, type Crack } from './height';
import { ribs, sheet, wallRibs, type Rib } from './meshes';
import { scatterRocks } from './rocks';
import { GROUND_FRAGMENT, GROUND_VERTEX } from './shaders';

export const PARTS: readonly string[] = ['land', 'bench', 'sulphur-crack'];

export { landHeight };

// One row of numbers for each third of a metre of height: which flow it is in, how hard and dark that flow is, and how far up the flow.
function strataTexture(): THREE.DataTexture {
  const W = 1024;
  const data = new Uint8Array(W * 4);
  const tops = [0, ...FLOWS, 400];
  for (let i = 0; i < W; i++) {
    const y = ((i + 0.5) / W) * 340;
    let k = 1;
    while ((tops[k] as number) < y) k++;
    const a = tops[k - 1] as number;
    const b = tops[k] as number;
    const thick = b - a;
    const r = Math.abs(Math.sin(k * 12.9898 + 4.1) * 43758.5453) % 1;
    const tone = thick > 14 ? 0.25 + 0.3 * r : 0.6 + 0.4 * r;
    data[i * 4] = Math.round(255 * r);
    data[i * 4 + 1] = Math.round(255 * tone);
    data[i * 4 + 2] = Math.round((255 * (y - a)) / thick);
    data[i * 4 + 3] = Math.round(255 * Math.min(1, thick / 32));
  }
  const t = new THREE.DataTexture(data, W, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export function create(ctx: HeartContext): HeartPiece {
  // The two cracks: the long one up on the bench, the short one by the line.
  // The long one runs askew to the wide view, so it shows its length and its width.
  const along: [number, number] = [0.451, 0.892];
  const cracks: Crack[] = [
    { ax: CRACK_TOP[0] - along[0] * 5.2, az: CRACK_TOP[2] - along[1] * 5.2, bx: CRACK_TOP[0] + along[0] * 5.2, bz: CRACK_TOP[2] + along[1] * 5.2, width: 0.3, depth: 1.3, seed: 3.1 },
    { ax: CRACK_FOOT[0] - 0.4, az: CRACK_FOOT[1] - 1.9, bx: CRACK_FOOT[0] + 0.5, bz: CRACK_FOOT[1] + 1.6, width: 0.14, depth: 0.5, seed: 8.4 },
  ];
  setCracks(cracks);
  ctx.rig.setLand(landHeight);

  const shared = {
    ...ctx.rig.uniforms,
    tCliff: { value: ctx.assets.texture('mat/cliff.jpg') },
    tCliffNh: { value: ctx.assets.texture('mat/cliff-nh.png', { kind: 'data' }) },
    tLava: { value: ctx.assets.texture('mat/pahoehoe.jpg') },
    tLavaNh: { value: ctx.assets.texture('mat/pahoehoe-nh.png', { kind: 'data' }) },
    tTalus: { value: ctx.assets.texture('mat/talus.jpg') },
    tTalusNh: { value: ctx.assets.texture('mat/talus-nh.png', { kind: 'data' }) },
    tBoulder: { value: ctx.assets.texture('mat/boulder.jpg') },
    tBoulderNh: { value: ctx.assets.texture('mat/boulder-nh.png', { kind: 'data' }) },
    tSulphur: { value: ctx.assets.texture('mat/sulphur.jpg') },
    tStrata: { value: strataTexture() },
    uCrackA: { value: new THREE.Vector4((cracks[0] as Crack).ax, (cracks[0] as Crack).az, (cracks[0] as Crack).bx, (cracks[0] as Crack).bz) },
    uCrackB: { value: new THREE.Vector4((cracks[1] as Crack).ax, (cracks[1] as Crack).az, (cracks[1] as Crack).bx, (cracks[1] as Crack).bz) },
  };
  const ground = (defines: Record<string, string>): THREE.ShaderMaterial => new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: GROUND_FRAGMENT, uniforms: shared, defines });
  const wallMaterial = ground({ FAR_LIGHT: '' });
  const benchMaterial = ground({ BENCH: '' });
  const nearMaterial = ground({ BENCH: '', NEAR: '', GLAZE: '' });
  const crackMaterial = ground({ BENCH: '', NEAR: '', CRACK: '' });
  const materials = [wallMaterial, benchMaterial, nearMaterial, crackMaterial];
  const geometries: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh => {
    geometries.push(g);
    return new THREE.Mesh(g, m);
  };

  // The wall: ribs every 1.6 m where the long lens looks (round the mouth), 5 m along the rest of the north wall, coarser where it is far or behind the cameras.
  const spacing = (x: number, z: number): number => {
    if (z < -150 && Math.abs(x + 30) < 215) return 1.6;
    if (z < 0 && x > -620 && x < 760) return 5;
    if (x > 700 && z < 330) return 9;
    return 18;
  };
  const wall = mesh(ribs(landHeight, wallRibs(spacing, -3, 470, [20, 60, 130, 250, 450, 750, 1200, 1900, 2900, 4300, 6000]), 190), wallMaterial);

  // The buttress: ribs across it, so its sheer faces get rows all the way up. Where it runs into the wall, the wall's ring draws it.
  const [rx, rz] = BUTTRESS.root;
  const [tx, tz] = BUTTRESS.tip;
  const len = Math.hypot(tx - rx, tz - rz);
  const ax = (tx - rx) / len;
  const az = (tz - rz) / len;
  const across: Rib[] = [];
  for (let s = -0.34 * len; s <= 1.2 * len; s += 3) {
    const cx = rx + ax * s;
    const cz = rz + az * s;
    const reach = 150;
    across.push({ x: cx - az * reach, z: cz + ax * reach, dx: az, dz: -ax, length: reach * 2, on: true });
  }
  const buttressHeight = (x: number, z: number): number => (calderaDistance(x, z) > 0 ? -8 : landHeight(x, z));
  const buttressAll = ribs(buttressHeight, across, 230, 0.6, 0.2);
  trim(buttressAll, -1.2);
  const buttress = mesh(buttressAll, wallMaterial);

  // The bench: 4 m where no camera goes, 1 m round the route, 0.35 m where the camera comes down to it.
  const NEAR = { x0: -592, x1: -486, z0: 186, z1: 322 };
  const MID = { x0: -660, x1: -430, z0: 40, z1: 400 };
  const inside = (r: typeof NEAR, x: number, z: number, margin: number): boolean => x > r.x0 + margin && x < r.x1 - margin && z > r.z0 + margin && z < r.z1 - margin;
  const onBench = (x: number, z: number, y: number): boolean => y > -1.2 && calderaDistance(x, z) < -2 && benchDistance(x, z) > -4;
  const farBench = mesh(
    sheet(-1140, -344, 220, 524, 4, landHeight, (x, z, y) => onBench(x, z, y) && !inside(MID, x, z, 4.5) && (x < -280 || z > 380)),
    benchMaterial,
  );
  const midBench = mesh(
    sheet(MID.x0, MID.z0, MID.x1, MID.z1, 1, landHeight, (x, z, y) => onBench(x, z, y) && !inside(NEAR, x, z, 1.2)),
    benchMaterial,
  );
  const nearBench = mesh(
    sheet(NEAR.x0, NEAR.z0, NEAR.x1, NEAR.z1, 0.35, landHeight, (x, z, y) => onBench(x, z, y) && !nearCrack(x, z, 1.7), 0, 0.3),
    nearMaterial,
  );
  const rocks = scatterRocks(ctx, shared, landHeight);
  ctx.scene.add(ctx.parts.built('land', wall, buttress, ...rocks.land), buttress, ...rocks.land);
  ctx.scene.add(ctx.parts.built('bench', farBench, midBench, nearBench, ...rocks.bench), midBench, nearBench, ...rocks.bench);

  // The sulphur crack: the fissure itself, cut finer than the bench round it, with its lips. The stain and the crystals are in the bench's shader, so they fade out across both.
  const crackMeshes: THREE.Mesh[] = [];
  for (const c of cracks) {
    const l = Math.hypot(c.bx - c.ax, c.bz - c.az);
    const ux = (c.bx - c.ax) / l;
    const uz = (c.bz - c.az) / l;
    const reach = 2.6;
    const list: Rib[] = [];
    const gap = Math.max(0.06, c.width * 0.4);
    for (let s = -1.6; s <= l + 1.6; s += gap) list.push({ x: c.ax + ux * s - uz * reach, z: c.az + uz * s + ux * reach, dx: uz, dz: -ux, length: reach * 2, on: true });
    const h = (x: number, z: number): number => landHeight(x, z) - crackDip(x, z) + 0.03;
    crackMeshes.push(mesh(ribs(h, list, 56, 0.04, 0.35), crackMaterial));
    // It steams along its length. The air folder draws these.
    const vents = c.depth > 1 ? 7 : 3;
    for (let i = 0; i < vents; i++) {
      const t = (i + 0.5) / vents;
      const x = c.ax + (c.bx - c.ax) * t;
      const z = c.az + (c.bz - c.az) * t;
      const strong = 0.55 + 0.45 * Math.abs(Math.sin(i * 2.4 + c.seed));
      ctx.sources.steam.push({
        at: [x, landHeight(x, z) + 0.1, z],
        radius: c.depth > 1 ? 0.55 : 0.28,
        strength: (c.depth > 1 ? 0.8 : 0.6) * strong,
        rise: (c.depth > 1 ? 14 : 6) * (0.7 + 0.3 * strong),
        kind: 'steam',
        lean: [-0.42, 0.2],
      });
    }
  }
  const [crackTop, ...crackRest] = crackMeshes as [THREE.Mesh, ...THREE.Mesh[]];
  ctx.scene.add(ctx.parts.built('sulphur-crack', crackTop, ...crackRest), ...crackRest);

  return {
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      rocks.dispose();
      (shared.tStrata.value as THREE.Texture).dispose();
    },
  };
}

// Drops the triangles of a surface that lie wholly below a height: what is under the lake is never seen and still costs.
function trim(g: THREE.BufferGeometry, below: number): void {
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const index = g.getIndex() as THREE.BufferAttribute;
  const kept: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    if (p.getY(a) > below || p.getY(b) > below || p.getY(c) > below) kept.push(a, b, c);
  }
  g.setIndex(kept);
}
