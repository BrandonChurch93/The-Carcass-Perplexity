// The land of the Heart: the caldera wall, the buttress, the country outside, the bench the camera travels on, its loose rock, and the sulphur crack.
// height.ts is the shape (one function of x and z, which the rig bakes), meshes.ts turns it into triangles, shaders.ts is the rock, rocks.ts scatters the loose blocks.
import * as THREE from 'three';
import { BUTTRESS, benchDistance, calderaDistance } from '../layout';
import { secondsInPlace, shotById } from '../../../film/cut';
import { CRACK_FOOT, CRACK_TOP, UNIT } from '../shared/anchors';
import type { HeartContext, HeartPiece } from '../shared/context';
import { stagedSeconds } from '../shared/stage';
import { BUTTE, FLOWS, buttressHeight, crackDip, flowDip, inArch, landHeight, nearCrack, noise, rubbleAt, setCracks, stagedButteHeight, wallHeight, type Crack } from './height';
import { ribs, sheet, shoreLip, wallRibs, type Rib } from './meshes';
import { scatterRocks } from './rocks';
import { GROUND_FRAGMENT, GROUND_VERTEX, LIP_FRAGMENT } from './shaders';

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
    // The short one lies across the line view, 7 m from its lens: a crust of about 1.5 by 0.8 m.
    { ax: CRACK_FOOT[0] - 0.4, az: CRACK_FOOT[1] - 0.52, bx: CRACK_FOOT[0] + 0.4, bz: CRACK_FOOT[1] + 0.52, width: 0.1, depth: 0.4, seed: 8.4 },
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
    // Where the vent's stain sits on the crag of the line view: a point high on its lake face, and the stain's reach.
    uStain: { value: new THREE.Vector4(-505.0, 0.9, 203.6, 2.6) },
    uCrackB: { value: new THREE.Vector4((cracks[1] as Crack).ax, (cracks[1] as Crack).az, (cracks[1] as Crack).bx, (cracks[1] as Crack).bz) },
  };
  const ground = (defines: Record<string, string>): THREE.ShaderMaterial => new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: GROUND_FRAGMENT, uniforms: shared, defines });
  const wallMaterial = ground({ FAR_LIGHT: '' });
  const benchMaterial = ground({ BENCH: '' });
  // The camera's bench is seen along itself from a few metres up: without anisotropic reads its pictures smear along the view.
  const fine = (file: string, data: boolean): THREE.IUniform => ({ value: ctx.assets.texture(file, data ? { kind: 'data', anisotropy: 4 } : { anisotropy: 4 }) });
  const near = {
    ...shared,
    tLava: fine('mat/pahoehoe.jpg', false),
    tLavaNh: fine('mat/pahoehoe-nh.png', true),
    tTalus: fine('mat/talus.jpg', false),
    tTalusNh: fine('mat/talus-nh.png', true),
  };
  const nearMaterial = new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: GROUND_FRAGMENT, uniforms: near, defines: { BENCH: '', NEAR: '' } });
  const crackMaterial = new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: GROUND_FRAGMENT, uniforms: near, defines: { BENCH: '', NEAR: '', CRACK: '' } });
  const lipMaterial = new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: LIP_FRAGMENT, uniforms: shared });
  const butteMaterial = ground({ FAR_LIGHT: '', STAGED: '' });
  const materials = [wallMaterial, benchMaterial, nearMaterial, crackMaterial, lipMaterial, butteMaterial];
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
  const wallAll = ribs(wallHeight, wallRibs(spacing, -16, 470, [20, 60, 130, 250, 450, 750, 1200, 1900, 2900, 4300, 6000]), 190, 0.8, 0.3, [1.6, 5, 16], flowDip);
  // The wall stands whole over the mouth and is opened only inside the arch, a little wider than the arch itself: the fall's rim covers the edge.
  open(wallAll, (x, y, z) => inArch(x, y, z, 1.03));
  const wall = mesh(wallAll, wallMaterial);

  // The buttress: ribs across it, so its sheer faces get rows all the way up. The wall's ring is drawn without it, and it sinks under the ring where the wall is the higher.
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
  const buttressAll = ribs(buttressHeight, across, 230, 0.6, 0.2, [1.6, 5, 16]);
  trim(buttressAll, -1.2);
  const buttress = mesh(buttressAll, wallMaterial);

  // The bench: 4 m where no camera goes, 1 m round the route, 0.35 m where the camera comes down to it.
  const NEAR = { x0: -592, x1: -486, z0: 172, z1: 322 };
  const MID = { x0: -660, x1: -430, z0: 40, z1: 400 };
  const CRAG = { x0: -512.5, x1: -501, z0: 196, z1: 207.5 };
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
    sheet(NEAR.x0, NEAR.z0, NEAR.x1, NEAR.z1, 0.35, landHeight, (x, z, y) => onBench(x, z, y) && !nearCrack(x, z, 1.7) && !inside(CRAG, x, z, 1.0), 0, 0.3),
    nearMaterial,
  );
  // The crag that stands at the left edge of the line view, 8 to 14 m from that lens: cut at 0.12 m, so that its outline breaks at a hand's width.
  // It sinks a little under the bench at its border, where the bench's own sheet takes over.
  const cragHeight = (x: number, z: number): number => landHeight(x, z) - 0.06 * (1 - Math.min(1, Math.max(0, Math.min(x - CRAG.x0, CRAG.x1 - x, z - CRAG.z0, CRAG.z1 - z) / 0.6)));
  const cragFine = mesh(sheet(CRAG.x0, CRAG.z0, CRAG.x1, CRAG.z1, 0.12, cragHeight, onBench, 0, 0.1), nearMaterial);
  cragFine.renderOrder = -5;
  // The last metres before the line view's lens: rubble a hand to a forearm across, cut far finer than the bench under it.
  const AHEAD: [number, number] = [0.788, -0.616];
  const RUBBLE = { back: -7, front: 15, left: -10, right: 4, x0: -523, z0: 199, x1: -494, z1: 229 };
  // The bench under it, read once on a lattice of a quarter metre.
  const LAT = 0.25;
  const lw = Math.round((RUBBLE.x1 - RUBBLE.x0) / LAT) + 3;
  const lh = Math.round((RUBBLE.z1 - RUBBLE.z0) / LAT) + 3;
  const lattice = new Float32Array(lw * lh);
  for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) lattice[j * lw + i] = landHeight(RUBBLE.x0 + (i - 1) * LAT, RUBBLE.z0 + (j - 1) * LAT);
  const benchUnder = (x: number, z: number): number => {
    const gx = Math.min(lw - 1.001, Math.max(0, (x - RUBBLE.x0) / LAT + 1));
    const gz = Math.min(lh - 1.001, Math.max(0, (z - RUBBLE.z0) / LAT + 1));
    const i = Math.floor(gx);
    const j = Math.floor(gz);
    const u = gx - i;
    const v = gz - j;
    const a = lattice[j * lw + i] as number;
    const b = lattice[j * lw + i + 1] as number;
    const c = lattice[(j + 1) * lw + i] as number;
    const d = lattice[(j + 1) * lw + i + 1] as number;
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const inPatch = (x: number, z: number): number => {
    const s = (x + 510.5) * AHEAD[0] + (z - 215.5) * AHEAD[1];
    const t = -(x + 510.5) * AHEAD[1] + (z - 215.5) * AHEAD[0];
    return Math.min(s - RUBBLE.back, RUBBLE.front - s, t - RUBBLE.left, RUBBLE.right - t);
  };
  const unit = (v: number): number => Math.min(1, Math.max(0, v));
  const rubbleHeight = (x: number, z: number): number => {
    const base = benchUnder(x, z);
    // It sinks under the bench at its border and stays off the faces of the crag.
    const inside = unit(inPatch(x, z) / 0.8);
    const on = inside * unit((base - 0.08) / 0.14) * unit((2.4 - base) / 0.6);
    const onBench = base - 0.06 + on * (0.06 + rubbleAt(x, z));
    if (base > 0.3) return onBench;
    // The shore is no kerb: the rubble spills out over the crust, half a metre here and two there, and thins to single stones.
    const reach = 0.5 + 1.7 * noise(x / 1.7 + 3.3, z / 1.7 + 7.1) + 0.6 * (noise(x / 0.45 + 1.2, z / 0.45) - 0.5);
    const edge = 0.2 - 1.5 * reach;
    const t = unit((base - edge) / (0.2 - edge));
    const spill = -0.07 + 0.27 * Math.sqrt(t) + rubbleAt(x, z) * (0.5 + 0.5 * t);
    return Math.max(onBench, base - 0.06 + inside * unit(t / 0.12) * (spill - base + 0.06));
  };
  const rubble = mesh(sheet(RUBBLE.x0, RUBBLE.z0, RUBBLE.x1, RUBBLE.z1, 0.075, rubbleHeight, (x, z) => inPatch(x, z) > 0, 0, 0.04, [0.2, 0.6]), nearMaterial);
  rubble.renderOrder = -5;
  const rocks = scatterRocks(ctx, shared, landHeight);
  // What stands in front is drawn first, so that what it hides is never shaded: the loose rock, the camera's bench, the rest of the bench, the buttress, the wall.
  for (const r of rocks.bench) r.renderOrder = -6;
  nearBench.renderOrder = -5;
  midBench.renderOrder = -4;
  farBench.renderOrder = -3;
  for (const r of rocks.land) r.renderOrder = -2;
  buttress.renderOrder = -1;
  // Staging by shot: the butte behind the group stands in shot heart-02 alone.
  // Ribs along that lens's axis, a stride apart: every face it sees is crossed by them and gets rows all the way up.
  const butteRibs: Rib[] = [];
  for (let b = BUTTE.left; b <= BUTTE.right; b += 0.6) {
    butteRibs.push({ x: BUTTE.from[0] + BUTTE.ahead[0] * BUTTE.near - BUTTE.ahead[1] * b, z: BUTTE.from[1] + BUTTE.ahead[1] * BUTTE.near + BUTTE.ahead[0] * b, dx: BUTTE.ahead[0], dz: BUTTE.ahead[1], length: BUTTE.far - BUTTE.near, on: true });
  }
  const butteAll = ribs(stagedButteHeight, butteRibs, 170, 0.4, 0.25, [1.6, 5, 16]);
  trim(butteAll, -0.25);
  const butte = mesh(butteAll, butteMaterial);
  butte.renderOrder = -1;
  butte.visible = false;
  const butteShot = shotById('heart-02');
  const butteFrom = secondsInPlace(UNIT, butteShot.first) - 0.3 / 60;
  const butteTo = secondsInPlace(UNIT, butteShot.last) + 0.7 / 60;
  ctx.scene.add(ctx.parts.built('land', wall, buttress, butte, ...rocks.land), buttress, butte, ...rocks.land);
  // The shore of the line view, 80 m of it: where the lens stands on the last rocks, the bench ends in an undercut lip of spatter.
  const lip = mesh(shoreLip(landHeight, benchDistance, noise, [-493.5, 176], 80, (x, z) => inPatch(x, z) > 0.6), lipMaterial);
  lip.renderOrder = -5;
  ctx.scene.add(ctx.parts.built('bench', farBench, midBench, nearBench, cragFine, rubble, lip, ...rocks.bench), midBench, nearBench, cragFine, rubble, lip, ...rocks.bench);

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
    const crackMesh = mesh(ribs(h, list, 56, 0.04, 0.35), crackMaterial);
    crackMesh.renderOrder = -5;
    crackMeshes.push(crackMesh);
    // It steams along its length. The air folder draws these.
    const vents = c.depth > 1 ? 7 : 3;
    for (let i = 0; i < vents; i++) {
      const t = (i + 0.5) / vents;
      const x = c.ax + (c.bx - c.ax) * t;
      const z = c.az + (c.bz - c.az) * t;
      const strong = 0.55 + 0.45 * Math.abs(Math.sin(i * 2.4 + c.seed));
      ctx.sources.steam.push({
        at: [x, landHeight(x, z) + 0.1, z],
        radius: c.depth > 1 ? 0.4 : 0.22,
        // The vent at the foot of the line view's crag: dense pale steam against the crag, as in the line's picture.
        strength: (c.depth > 1 ? 0.45 : 0.3) * strong,
        rise: (c.depth > 1 ? 6 : 4) * (0.7 + 0.3 * strong),
        kind: 'steam',
        lean: c.depth > 1 ? [-0.42, 0.2] : [0.35, 0.02],
      });
    }
  }
  const [crackTop, ...crackRest] = crackMeshes as [THREE.Mesh, ...THREE.Mesh[]];
  ctx.scene.add(ctx.parts.built('sulphur-crack', crackTop, ...crackRest), ...crackRest);

  // The rocks may ask to be told of every sample (their choice of detail by size on screen): passed on as it is.
  const rocksBefore = (rocks as { beforeSample?: HeartPiece['beforeSample'] }).beforeSample;
  return {
    ...(rocksBefore ? { beforeSample: rocksBefore } : {}),
    setTime: () => {
      const staged = stagedSeconds();
      butte.visible = staged >= butteFrom && staged <= butteTo;
    },
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      rocks.dispose();
      (shared.tStrata.value as THREE.Texture).dispose();
    },
  };
}

// Drops the triangles of a surface that lie wholly below a height: what is under the lake is never seen and still costs.
// Drops every triangle with a corner where `hole` says yes.
function open(g: THREE.BufferGeometry, hole: (x: number, y: number, z: number) => boolean): void {
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const index = g.getIndex() as THREE.BufferAttribute;
  const kept: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    if (hole(p.getX(a), p.getY(a), p.getZ(a)) || hole(p.getX(b), p.getY(b), p.getZ(b)) || hole(p.getX(c), p.getY(c), p.getZ(c))) continue;
    kept.push(a, b, c);
  }
  g.setIndex(kept);
}

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
