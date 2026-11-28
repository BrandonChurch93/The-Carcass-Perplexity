// The land of the Heart: the caldera wall, the buttress, the country outside, the bench the camera travels on, its loose rock, and the sulphur crack.
// height.ts is the shape (one function of x and z, which the rig bakes), meshes.ts turns it into triangles, shaders.ts is the rock, rocks.ts scatters the loose blocks.
import * as THREE from 'three';
import { BUTTRESS, MOUTH, benchDistance, calderaDistance } from '../layout';
import { secondsInPlace, shotById } from '../../../film/cut';
import { CRACK_FOOT, CRACK_TOP, UNIT } from '../shared/anchors';
import type { HeartContext, HeartPiece } from '../shared/context';
import { stagedSeconds } from '../shared/stage';
import { BUTTE, SPUR, buttressHeight, crackDip, crustAt, flowDip, inArch, landHeight, landHeightUncut, lineChannelDistance, lineChannelRoom, nearCrack, noise, rubbleAt, setCracks, stagedButteHeight, wallHeight, widePath, type Crack } from './height';
import { fracture, type Joints } from './fracture';
import { ribs, sheet, shoreLip, wallRibs, type Rib } from './meshes';
import { scatterRocks } from './rocks';
import { FEET, FEET_FADE, GROUND_FRAGMENT, GROUND_VERTEX, LIP_FRAGMENT } from './shaders';

export const PARTS: readonly string[] = ['land', 'bench', 'sulphur-crack'];

export { landHeight };

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
    tAa: { value: ctx.assets.texture('mat/aa-nh.jpg', { kind: 'data', anisotropy: 4 }) },
    uCrackA: { value: new THREE.Vector4((cracks[0] as Crack).ax, (cracks[0] as Crack).az, (cracks[0] as Crack).bx, (cracks[0] as Crack).bz) },
    // Where the vent's stain sits on the crag of the line view: a point high on its lake face, and the stain's reach.
    uStain: { value: new THREE.Vector4(-505.0, 1.9, 203.6, 2.6) },
    // The crest of the cone of debris left of the fall: the ground shader darkens its near flank.
    uSpur: { value: new THREE.Vector4(SPUR[0], SPUR[1], SPUR[2], SPUR[3]) },
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
  const rubbleMaterial = new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: GROUND_FRAGMENT, uniforms: near, defines: { BENCH: '', NEAR: '', RUBBLE: '' } });
  const crackMaterial = new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: GROUND_FRAGMENT, uniforms: near, defines: { BENCH: '', NEAR: '', CRACK: '' } });
  // The bank under the wide view: read at the scale of a hand, and at its rim handed over to the camera's bench.
  const handMaterial = new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: GROUND_FRAGMENT, uniforms: near, defines: { BENCH: '', HAND: '', CORE: '' } });
  const rimMaterial = new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: GROUND_FRAGMENT, uniforms: near, defines: { BENCH: '', NEAR: '', HAND: '' } });
  const lipMaterial = new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: LIP_FRAGMENT, uniforms: shared });
  const butteMaterial = ground({ FAR_LIGHT: '', STAGED: '' });
  const materials: THREE.Material[] = [wallMaterial, benchMaterial, nearMaterial, rubbleMaterial, crackMaterial, handMaterial, rimMaterial, lipMaterial, butteMaterial];
  const geometries: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material): THREE.Mesh => {
    geometries.push(g);
    return new THREE.Mesh(g, m);
  };

  // The wall: ribs every 1.6 m where the long lens looks (round the mouth), 5 m along the rest of the north wall, coarser where it is far or behind the cameras.
  const unit01 = (v: number): number => Math.min(1, Math.max(0, v));
  const spacing = (x: number, z: number): number => {
    if (z < -150 && Math.abs(x + 30) < 215) return 1.6;
    // The stretch the wide lens sees against the sky: cut fine enough to carry the wall's blocks.
    if (z < 0 && x > -700 && x < 330) return 2.5;
    if (z < 0 && x < 760) return 5;
    if (x > 700 && z < 330) return 9;
    return 18;
  };
  // The slopes under the mouth fill the fall's lens: a slope got a row every five metres and showed its faces. There it gets three times its share.
  const underMouth = (x: number, z: number, y: number): number => 1 + 2.2 * unit01((250 - Math.abs(x - MOUTH.x)) / 50) * unit01(-(z + 150) / 40) * unit01((y - 0.5) / 2) * unit01((100 - y) / 15);
  const wallAll = ribs(wallHeight, wallRibs(spacing, -16, 470, [20, 60, 130, 250, 450, 750, 1200, 1900, 2900, 4300, 6000]), 190, 0.8, 0.3, [1.6, 5, 16], flowDip, underMouth, 8);
  // The wall stands whole over the mouth and is opened only inside the arch, a little wider than the arch itself: the fall's rim covers the edge.
  open(wallAll, (x, y, z) => inArch(x, y, z, 1.03));
  // The wall is broken along its joints: blocks the size of a house stand back from the face and leave notches in the rim, smaller ones in them.
  // Not beside the fall, whose channel and arch are built on the land as it is, nor on the aprons, nor where the mesh is too coarse to carry a block.
  const CRAG_JOINTS: Joints[] = [
    { cell: [1.3, 0.9, 1.3], depth: 0.5, seed: 7 },
    { cell: [0.42, 0.3, 0.42], depth: 0.14, seed: 29 },
  ];
  const WALL_JOINTS: Joints[] = [
    { cell: [26, 40, 26], depth: 4.5, seed: 3 },
    { cell: [10, 16, 10], depth: 2, seed: 11 },
  ];
  // Where the long lenses look the face is broken once more, into clefts and ledges of some strides, and every joint of it is a dark crease:
  // forms large enough to stand through the air and a lens focused far in front of them.
  const FACE_JOINTS: Joints[] = [
    { cell: [26, 40, 26], depth: 4.5, seed: 3, crease: 3.2 },
    { cell: [10, 16, 10], depth: 2.6, seed: 11, crease: 2.6 },
    { cell: [5.5, 7.5, 5.5], depth: 1.5, seed: 41, crease: 1.8 },
  ];
  fracture(wallAll, FACE_JOINTS, (x, y, z) => unit01(-z / 40) * unit01((x + 700) / 40) * unit01((330 - x) / 40) * unit01((y - 45) / 30) * unit01((Math.abs(x - MOUTH.x) - 100) / 35));
  // How much of the sky a point sees is found rib by rib, and a flute narrower than two ribs made every other rib dark: lines up the face
  // at the spacing of the ribs. It is evened over three ribs, twice.
  {
    const per = 190 + 11;
    const land = wallAll.getAttribute('aLand') as THREE.BufferAttribute;
    const was = new Float32Array(land.count);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < land.count; i++) was[i] = land.getX(i);
      for (let i = per; i + per < land.count; i++) {
        if (i % per < 190) land.setX(i, 0.25 * (was[i - per] as number) + 0.5 * (was[i] as number) + 0.25 * (was[i + per] as number));
      }
    }
  }
  // The shader's own test of a face (the steeper of the land's slope and the face's, with a twentieth of noise either way), made here for
  // every face: what is all cliff and what is all scree go to materials that have only that half. The rest keeps both.
  // A face that stands wholly above the reach of the lake's rind (4.7 m at most) is told as well (DRY).
  const FACES: Record<string, string>[] = [{}, { SHEER: '' }, { FLAT: '' }, { DRY: '' }, { SHEER: '', DRY: '' }, { FLAT: '', DRY: '' }];
  const byFace = (g: THREE.BufferGeometry, defines: Record<string, string>): THREE.Mesh[] => {
    const p = g.getAttribute('position');
    const n = g.getAttribute('aSlope');
    const all = g.getIndex() as THREE.BufferAttribute;
    const lists: number[][] = FACES.map(() => []);
    const up = (i: number): number => n.getY(i) / Math.max(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)), 1e-9);
    for (let t = 0; t < all.count; t += 3) {
      const a = all.getX(t);
      const b = all.getX(t + 1);
      const c = all.getX(t + 2);
      const ux = p.getX(b) - p.getX(a);
      const uy = p.getY(b) - p.getY(a);
      const uz = p.getZ(b) - p.getZ(a);
      const vx = p.getX(c) - p.getX(a);
      const vy = p.getY(c) - p.getY(a);
      const vz = p.getZ(c) - p.getZ(a);
      const fx = uy * vz - uz * vy;
      const fy = uz * vx - ux * vz;
      const fz = ux * vy - uy * vx;
      const face = Math.abs(fy) / Math.max(Math.hypot(fx, fy, fz), 1e-12);
      const least = Math.min(up(a), up(b), up(c));
      const kind = face < 0.32 ? 1 : face > 0.6 && least > 0.73 ? 2 : 0;
      const dry = Math.min(p.getY(a), p.getY(b), p.getY(c)) > 5 ? 3 : 0;
      (lists[kind + dry] as number[]).push(a, b, c);
    }
    const made: THREE.Mesh[] = [];
    FACES.forEach((face, k) => {
      const list = lists[k] as number[];
      if (list.length === 0) return;
      const part = new THREE.BufferGeometry();
      for (const name of Object.keys(g.attributes)) part.setAttribute(name, g.getAttribute(name));
      part.setIndex(list);
      const material = ground({ ...defines, ...face });
      materials.push(material);
      made.push(mesh(part, material));
    });
    g.dispose();
    return made;
  };
  const wallFaces = byFace(wallAll, { FAR_LIGHT: '' });
  const wall = wallFaces[0] as THREE.Mesh;

  // The buttress: ribs across it, so its sheer faces get rows all the way up. The wall's ring is drawn without it, and it sinks under the ring where the wall is the higher.
  const [rx, rz] = BUTTRESS.root;
  const [tx, tz] = BUTTRESS.tip;
  const len = Math.hypot(tx - rx, tz - rz);
  const ax = (tx - rx) / len;
  const az = (tz - rz) / len;
  const across: Rib[] = [];
  for (let s = -0.34 * len; s <= 1.2 * len; s += 2) {
    const cx = rx + ax * s;
    const cz = rz + az * s;
    const reach = 150;
    across.push({ x: cx - az * reach, z: cz + ax * reach, dx: az, dz: -ax, length: reach * 2, on: true });
  }
  const buttressAll = ribs(buttressHeight, across, 230, 0.6, 0.2, [1.6, 5, 16]);
  trim(buttressAll, -1.2);
  // Its cliffs and its table are broken as the wall's are; the talus against its foot is not.
  fracture(buttressAll, WALL_JOINTS, (_x, y, _z, ny) => unit01((y - 20) / 25) * Math.max(unit01((0.75 - ny) / 0.25), unit01((y - 70) / 30)));
  const buttressFaces = byFace(buttressAll, { FAR_LIGHT: '', BUTTRESS: '' });

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
  // The bank the wide view starts from and passes over lies half outside the camera's bench, and all of it nearer that lens than the
  // camera's bench was cut for. One sheet at a hand and a half, with lumps the sheets round it cannot hold.
  const midBench = mesh(
    sheet(MID.x0, MID.z0, MID.x1, MID.z1, 1, landHeight, (x, z, y) => onBench(x, z, y) && !inside(NEAR, x, z, 1.2) && !inside(FEET, x, z, 1.2)),
    benchMaterial,
  );
  const feetEdge = (x: number, z: number): number => Math.min(x - FEET.x0, FEET.x1 - x, z - FEET.z0, FEET.z1 - z);
  // Cut at 0.2 m only within 13 m of that lens's way, where a cell is tens of pixels; the rest of the bank at 0.5 m, where it is two or three.
  // Cut at 0.15 m over the whole bank, the bench alone cost a second a sample more (frame 2507, uhd, draft): triangles smaller than a pixel.
  const FINE_CELL = 0.2;
  const fineDepth = (x: number, z: number): number => Math.min(13 - widePath(x, z)[0], feetEdge(x, z) - FEET_FADE - 0.5);
  /** What the fine sheet stands above the land: lumps of a forearm, none within 1.2 m of its border. */
  const feetLift = (x: number, z: number): number => {
    const d = fineDepth(x, z);
    if (d <= 1.2) return 0;
    return Math.min(1, (d - 1.2) / 1.5) * (0.08 * (noise(x / 0.62 + 7.3, z / 0.62 + 1.9) - 0.5) + 0.05 * (noise(x / 1.7 + 2.1, z / 1.7 + 8.4) - 0.5));
  };
  const sunk = (d: number): number => 0.05 * (1 - Math.min(1, Math.max(0, d / 1.2)));
  // A sheet sinks at its border under the coarser sheets it meets; where they end it is the land itself, and its lumps come in after that.
  const fineUnder = latticed(FEET.x0, FEET.z0, FEET.x1, FEET.z1, FINE_CELL, landHeight);
  const fineHeight = (x: number, z: number): number => fineUnder(x, z) - sunk(fineDepth(x, z)) + feetLift(x, z);
  const feetFine = mesh(
    sheet(FEET.x0, FEET.z0, FEET.x1, FEET.z1, FINE_CELL, fineHeight, (x, z, y) => onBench(x, z, y + 0.2) && fineDepth(x, z) > 0, 0, 0.1, [0.2, 0.6, 1.0]),
    handMaterial,
  );
  const FEET_CELL = 0.5;
  const feetHeight = (x: number, z: number): number => landHeight(x, z) - sunk(feetEdge(x, z));
  // The middle pays for no reading but its own. The rim, where that reading fades, carries the camera's bench's as well; the two overlap by a cell.
  const feetBench = mesh(
    sheet(FEET.x0, FEET.z0, FEET.x1, FEET.z1, FEET_CELL, feetHeight, (x, z, y) => onBench(x, z, y + 0.2) && inside(FEET, x, z, FEET_FADE) && fineDepth(x, z) < 1.2, 0, 0.3),
    handMaterial,
  );
  const feetRim = mesh(
    sheet(FEET.x0, FEET.z0, FEET.x1, FEET.z1, FEET_CELL, feetHeight, (x, z, y) => onBench(x, z, y + 0.2) && !inside(FEET, x, z, FEET_FADE + 1.5 * FEET_CELL), 0, 0.3),
    rimMaterial,
  );
  const nearBench = mesh(
    sheet(NEAR.x0, NEAR.z0, NEAR.x1, NEAR.z1, 0.35, landHeight, (x, z, y) => onBench(x, z, y) && !nearCrack(x, z, 1.7) && !inside(CRAG, x, z, 1.0) && !inside(FEET, x, z, 1.2), 0, 0.3),
    nearMaterial,
  );
  // The crag that stands at the left edge of the line view, 8 to 14 m from that lens: cut at 0.12 m, so that its outline breaks at a hand's width.
  // It sinks a little under the bench at its border, where the bench's own sheet takes over.
  const cragHeight = (x: number, z: number): number => landHeight(x, z) - 0.06 * (1 - Math.min(1, Math.max(0, Math.min(x - CRAG.x0, CRAG.x1 - x, z - CRAG.z0, CRAG.z1 - z) / 0.6)));
  // A level grid gives an upright face one row of faces as tall as the face: the crag is ribs, whose rows are spread over its surface,
  // and its faces are broken along joints into blocks of an arm's length that stand back a hand or two.
  const cragRibs: Rib[] = [];
  const cragCount = Math.round((CRAG.z1 - CRAG.z0) / 0.12);
  for (let j = 0; j <= cragCount; j++) cragRibs.push({ x: CRAG.x0, z: CRAG.z0 + ((CRAG.z1 - CRAG.z0) * j) / cragCount, dx: 1, dz: 0, length: CRAG.x1 - CRAG.x0, on: true });
  const cragAll = ribs(cragHeight, cragRibs, 300, 0.05, 0.3, [0.15, 0.5]);
  const cragEdge = (x: number, z: number): number => Math.min(x - CRAG.x0, CRAG.x1 - x, z - CRAG.z0, CRAG.z1 - z);
  fracture(cragAll, CRAG_JOINTS, (x, y, z, ny) => unit01((cragEdge(x, z) - 0.7) / 0.8) * unit01((0.85 - ny) / 0.3) * unit01((y - 0.6) / 0.8));
  keepOnly(cragAll, onBench);
  const cragFine = mesh(cragAll, nearMaterial);
  cragFine.renderOrder = -5.2;
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
  // Round the short crack the heap is no blocks but one low mound of crystal crumbs: sulphur painted on the top of a block was a decal.
  const vent = cracks[1] as Crack;
  // Beside the channel the heap is a bed of gravel with single stones on it: only the crowns of its blocks stand out of the bed there,
  // none over a forearm above the crust (see `benchAt`). Scaled down whole, the blocks were smooth swells.
  const stones = (x: number, z: number): number => {
    const near = 1 - unit((lineChannelDistance(x, z) - 4.2) / 1.3);
    const h = rubbleAt(x, z);
    if (near <= 0) return h;
    const bed = 0.035 + 0.03 * noise(x / 0.35 + 2.7, z / 0.35 + 5.9);
    return h <= bed ? h : bed + Math.max(0, h - bed - 0.15 * near) * (1 - 0.3 * near);
  };
  const heapAt = (x: number, z: number): number => {
    const ex = vent.bx - vent.ax;
    const ez = vent.bz - vent.az;
    // The middle of the crack only: the picture's crust is a patch two hands across, not a bank along the whole crack.
    const k = Math.min(0.7, Math.max(0.3, ((x - vent.ax) * ex + (z - vent.az) * ez) / (ex * ex + ez * ez)));
    const d = Math.hypot(x - vent.ax - ex * k, z - vent.az - ez * k) + 0.25 * (noise(x / 0.5 + 6.1, z / 0.5 + 2.3) - 0.5);
    const by = unit((0.44 - d) / 0.22);
    if (by <= 0) return stones(x, z);
    const w = by * by * (3 - 2 * by);
    return stones(x, z) * (1 - w) + w * (0.02 + 0.08 * unit((0.4 - d) / 0.3) + 0.8 * crustAt(x, z));
  };
  const rubbleHeight = (x: number, z: number): number => {
    const base = benchUnder(x, z);
    // It sinks under the bench at its border and stays off the faces of the crag.
    const inside = unit(inPatch(x, z) / 0.8);
    const on = inside * unit((base - 0.08) / 0.14) * unit((2.4 - base) / 0.6);
    const heap = heapAt(x, z);
    const onBench = base - 0.06 + on * (0.06 + heap);
    if (base > 0.3) return onBench;
    // The shore is no kerb: the rubble spills out over the crust, half a metre here and two there, and thins to single stones.
    const reach = 0.3 + 1.1 * noise(x / 1.7 + 3.3, z / 1.7 + 7.1) + 0.4 * (noise(x / 0.45 + 1.2, z / 0.45) - 0.5);
    const edge = 0.2 - 1.5 * reach;
    const t = unit((base - edge) / (0.2 - edge));
    const spill = -0.1 + 0.3 * t + heap * (0.6 + 0.4 * t);
    return Math.max(onBench, base - 0.06 + inside * unit(t / 0.12) * unit(lineChannelRoom(x, z) / 0.5) * (spill - base + 0.06));
  };
  // Where that lens rides and looks, a stone of the heap is hundreds of pixels across and a cell of 7.5 cm was a sliver of a face a finger thick,
  // each shaded on its own: the heap read as fibres. There it is cut at 3.5 cm, and the coarse sheet keeps a hand's width under its border.
  const FINE = { back: -3.8, front: 9.5, left: -5, right: 2 };
  const inFine = (x: number, z: number): number => {
    const s = (x + 510.5) * AHEAD[0] + (z - 215.5) * AHEAD[1];
    const t = -(x + 510.5) * AHEAD[1] + (z - 215.5) * AHEAD[0];
    return Math.min(s - FINE.back, FINE.front - s, t - FINE.left, FINE.right - t);
  };
  const rubble = mesh(sheet(RUBBLE.x0, RUBBLE.z0, RUBBLE.x1, RUBBLE.z1, 0.075, rubbleHeight, (x, z) => inPatch(x, z) > 0 && inFine(x, z) < 0.16, 0, 0.04, [0.2, 0.6], true), rubbleMaterial);
  rubble.renderOrder = -5.4;
  const rubbleFine = mesh(sheet(-516.6, 205.7, -501.7, 219.5, 0.035, rubbleHeight, (x, z) => inFine(x, z) > 0, 0, 0.03, [0.2, 0.6], true), rubbleMaterial);
  rubbleFine.renderOrder = -5.6;
  // The shader is told, corner by corner, what stands over the bed of grit: a block's face is read as broken scoria, the bed as grit under ash.
  for (const g of [rubble.geometry, rubbleFine.geometry]) {
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const l = g.getAttribute('aLand') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) l.setY(i, unit((heapAt(p.getX(i), p.getZ(i)) - 0.055) / 0.05));
  }
  // Both are seen along themselves from a man's height: drawn nearest first, a lump hides what lies behind it before it is shaded.
  nearFirst(rubble.geometry, AHEAD);
  nearFirst(rubbleFine.geometry, AHEAD);
  // The rocks are dealt on the land with the line view's shore as it stood before it was drawn back (see `put` in rocks.ts).
  const dealt = (x: number, z: number): number => (Math.hypot(x + 510.5, z - 215.5) < 40 ? landHeightUncut(x, z) : landHeight(x, z));
  const rocks = scatterRocks(ctx, shared, dealt, feetLift);
  // What stands in front is drawn first, so that what it hides is never shaded: the loose rock, the camera's bench, the rest of the bench, the buttress, the wall.
  for (const r of rocks.bench) r.renderOrder = -6;
  nearBench.renderOrder = -5;
  feetFine.renderOrder = -6;
  feetBench.renderOrder = -5;
  feetRim.renderOrder = -5;
  midBench.renderOrder = -4;
  farBench.renderOrder = -3;
  for (const r of rocks.land) r.renderOrder = -2;
  for (const b of buttressFaces) b.renderOrder = -1;
  // Staging by shot: the butte behind the group stands in shot heart-02 alone.
  // Ribs along that lens's axis, a stride apart: every face it sees is crossed by them and gets rows all the way up.
  const butteRibs: Rib[] = [];
  for (let b = BUTTE.left; b <= BUTTE.right; b += 0.6) {
    butteRibs.push({ x: BUTTE.from[0] + BUTTE.ahead[0] * BUTTE.near - BUTTE.ahead[1] * b, z: BUTTE.from[1] + BUTTE.ahead[1] * BUTTE.near + BUTTE.ahead[0] * b, dx: BUTTE.ahead[0], dz: BUTTE.ahead[1], length: BUTTE.far - BUTTE.near, on: true });
  }
  const butteAll = ribs(stagedButteHeight, butteRibs, 170, 0.4, 0.25, [1.6, 5, 16]);
  trim(butteAll, -0.25);
  fracture(
    butteAll,
    [
      { cell: [7, 11, 7], depth: 1.6, seed: 5 },
      { cell: [2.6, 4, 2.6], depth: 0.6, seed: 23 },
    ],
    (x, y, z, ny) => {
      // Its tops and the ridge left of its sheer end are cut less: a block left standing between two that fell was a tooth on the skyline.
      const b = -(x - BUTTE.from[0]) * BUTTE.ahead[1] + (z - BUTTE.from[1]) * BUTTE.ahead[0];
      const steep = unit01((0.75 - ny) / 0.25);
      return unit01((y - 12) / 6) * Math.max(steep, 0.3 * unit01((y - 24) / 6)) * (0.25 + 0.75 * unit01((b - 11) / 5));
    },
  );
  const butte = mesh(butteAll, butteMaterial);
  butte.renderOrder = -1;
  butte.visible = false;
  const butteShot = shotById('heart-02');
  const butteFrom = secondsInPlace(UNIT, butteShot.first) - 0.3 / 60;
  const butteTo = secondsInPlace(UNIT, butteShot.last) + 0.7 / 60;
  const wallParts = [...wallFaces.slice(1), ...buttressFaces];
  ctx.scene.add(ctx.parts.built('land', wall, ...wallParts, butte, ...rocks.land), ...wallParts, butte, ...rocks.land);
  // The shore of the line view, 80 m of it: where the lens stands on the last rocks, the bench ends in an undercut lip of spatter.
  const lip = mesh(shoreLip(landHeight, benchDistance, noise, [-493.5, 176], 80, (x, z) => inPatch(x, z) > 0.6), lipMaterial);
  lip.renderOrder = -5;
  ctx.scene.add(ctx.parts.built('bench', farBench, midBench, nearBench, feetFine, feetBench, feetRim, cragFine, rubble, rubbleFine, lip, ...rocks.bench), midBench, nearBench, feetFine, feetBench, feetRim, cragFine, rubble, rubbleFine, lip, ...rocks.bench);

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
      // Both cracks only smoke: a dense plume at the foot of the line view's crag hid the crag, and one on the wide view's bank stood as a white puff.
      const long = c.depth > 1;
      ctx.sources.steam.push({
        at: [x, landHeight(x, z) + 0.1, z],
        radius: long ? 0.4 : 0.22,
        strength: (long ? 0.45 : 0.2) * strong,
        rise: (long ? 6 : 3) * (0.7 + 0.3 * strong),
        kind: 'steam',
        lean: long ? [-0.42, 0.2] : [-0.3, -0.35],
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
    },
  };
}

// A height read once on a lattice and looked up between its points: the land's own function costs too much to ask twenty times a vertex.
function latticed(x0: number, z0: number, x1: number, z1: number, cell: number, height: (x: number, z: number) => number): (x: number, z: number) => number {
  const w = Math.round((x1 - x0) / cell) + 3;
  const h = Math.round((z1 - z0) / cell) + 3;
  const sx = (x1 - x0) / (w - 3);
  const sz = (z1 - z0) / (h - 3);
  const lattice = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) lattice[j * w + i] = height(x0 + (i - 1) * sx, z0 + (j - 1) * sz);
  return (x, z) => {
    const gx = Math.min(w - 1.001, Math.max(0, (x - x0) / sx + 1));
    const gz = Math.min(h - 1.001, Math.max(0, (z - z0) / sz + 1));
    const i = Math.floor(gx);
    const j = Math.floor(gz);
    const u = gx - i;
    const v = gz - j;
    const a = lattice[j * w + i] as number;
    const b = lattice[j * w + i + 1] as number;
    const c = lattice[(j + 1) * w + i] as number;
    const d = lattice[(j + 1) * w + i + 1] as number;
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
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

function keepOnly(g: THREE.BufferGeometry, keep: (x: number, z: number, y: number) => boolean): void {
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const index = g.getIndex() as THREE.BufferAttribute;
  const ok = new Uint8Array(p.count);
  for (let i = 0; i < p.count; i++) ok[i] = keep(p.getX(i), p.getZ(i), p.getY(i)) ? 1 : 0;
  const kept: number[] = [];
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    const b = index.getX(i + 1);
    const c = index.getX(i + 2);
    if (ok[a] && ok[b] && ok[c]) kept.push(a, b, c);
  }
  g.setIndex(kept);
}

/** Orders the faces of g by how far they lie along a lens's axis, nearest first: what stands in front is drawn first and what it hides is never shaded. */
function nearFirst(g: THREE.BufferGeometry, ahead: readonly [number, number]): void {
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const index = g.getIndex() as THREE.BufferAttribute;
  const count = index.count / 3;
  const along = new Float64Array(count);
  const order = new Uint32Array(count);
  for (let f = 0; f < count; f++) {
    const a = index.getX(f * 3);
    const b = index.getX(f * 3 + 1);
    const c = index.getX(f * 3 + 2);
    along[f] = (p.getX(a) + p.getX(b) + p.getX(c)) * ahead[0] + (p.getZ(a) + p.getZ(b) + p.getZ(c)) * ahead[1];
    order[f] = f;
  }
  order.sort((i, j) => (along[i] as number) - (along[j] as number) || i - j);
  const sorted: number[] = [];
  for (let f = 0; f < count; f++) {
    const at = (order[f] as number) * 3;
    sorted.push(index.getX(at), index.getX(at + 1), index.getX(at + 2));
  }
  g.setIndex(sorted);
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
