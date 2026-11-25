// Origin: the middle of the caldera floor, on the lake surface (y = 0). North is -z, toward the far wall and the vessel mouth; +x is east, toward the buttress and the second chamber.
import * as THREE from 'three';
import { createBlockout, herd, terrain } from '../../core/blockout';
import { moved, through, type CameraPath, type Move, type Pose, type Vec3 } from '../../core/cameras';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { neutralLook } from '../../core/stage';
import { stream } from '../../core/rng';
import { cut, eventSeconds, keyPart, secondsInPlace, shotById } from '../../film/cut';
import { BUTTRESS, MOUTH, SHORE_POINTS, SIZE, bearing, benchDistance, benchHeight, buttressHeight, establishing, floor, ground, lerp, smooth, spot, wallHeight } from './layout';
import { LEG_SEGMENTS, NECK_SEGMENTS, poseWalker, setBlob, setSegment, walkerPosition, type Walker, type WalkerMeshes } from './walkers';

const UNIT = 'heart';

const keySeconds = (key: string): number => secondsInPlace(UNIT, cut.keyFrames[key] as number);

const C = {
  skyTop: 0x4b5166,
  skyHorizon: 0x77665f,
  skyBelow: 0x1a1210,
  air: 0x54392f,
  land: 0x2d2725,
  landBand: 0x1f1a19,
  bench: 0x242120,
  benchBand: 0x121111,
  rock: 0x0f0e0e,
  crustA: 0x3a3636,
  crustB: 0x343030,
  seamA: 0xff5e10,
  seamB: 0xffb23a,
  fallA: 0xff7416,
  fallB: 0xffb648,
  mouth: 0x0b0707,
  arch: 0x9a4a22,
  walker: 0x120e0d,
  tuft: 0xdcb98e,
  sunk: 0x4c4846,
  fold: 0x454040,
  fume: 0x5a443a,
  fumeLow: 0x8f4c2c,
  steam: 0x8d8882,
  sulphur: 0xb39a2c,
  spatter: 0xffa238,
  surge: 0xffe9a0,
};

const NEAR = spot(0.365, 0.68);
const GROUP = spot(0.585, 0.545);
const SUNK = spot(0.69, 0.775);
const SPATTER_RIGHT: Vec3[] = [spot(0.8, 0.607), spot(0.86, 0.6), spot(0.93, 0.604), spot(0.985, 0.598)];
const SPATTER_LEFT: Vec3[] = [spot(0.205, 0.55), spot(0.24, 0.545), spot(0.27, 0.548)];
const FALL_FOOT: [number, number] = [MOUTH.x - 6, -326];
const T0 = keySeconds('heart-0');

const from = (p: Vec3, dx: number, dz: number): [number, number] => [p[0] + dx, p[2] + dz];

const WALKERS: Walker[] = [
  { at: from(NEAR, 0, 0), when: T0, heading: 100, speed: 0.4, size: 1.55, feed: 1, phase: 0.1 },
  { at: from(GROUP, 0, 0), when: T0, heading: 126, speed: 0.12, size: 1.2, feed: 1, phase: 0.33 },
  { at: from(GROUP, 20, 8), when: T0, heading: 104, speed: 0.55, size: 1.0, feed: 0.25, phase: 0.62 },
  { at: from(GROUP, 8, -19), when: T0, heading: 72, speed: 0.2, size: 0.92, feed: 0, phase: 0.87 },
  { at: from(GROUP, 37, -15), when: T0, heading: 205, speed: 0.1, size: 0.84, feed: 1, phase: 0.2 },
  { at: from(GROUP, 64, -10), when: T0, heading: 300, speed: 0.3, size: 0.97, feed: 0.6, phase: 0.48 },
  { at: from(spot(0.845, 0.447), 0, 0), when: T0, heading: 250, speed: 0.7, size: 1.05, feed: 0.3, phase: 0.7 },
  { at: from(spot(0.89, 0.446), 0, 0), when: T0, heading: 235, speed: 0.6, size: 0.9, feed: 0.8, phase: 0.05 },
  { at: from(spot(0.55, 0.437), 0, 0), when: T0, heading: 95, speed: 0.8, size: 1.1, feed: 0.2, phase: 0.55 },
  { at: [FALL_FOOT[0] + 92, FALL_FOOT[1] + 46], when: T0, heading: 262, speed: 0.6, size: 1.05, feed: 0.4, phase: 0.3 },
  { at: [FALL_FOOT[0] + 148, FALL_FOOT[1] + 52], when: T0, heading: 255, speed: 0.5, size: 0.9, feed: 1, phase: 0.8 },
  { at: [-250, 60], when: T0, heading: 160, speed: 0.9, size: 1.0, feed: 0.1, phase: 0.15 },
  { at: [-140, 190], when: T0, heading: 20, speed: 0.7, size: 0.88, feed: 0.5, phase: 0.92 },
  { at: [-330, -90], when: T0, heading: 140, speed: 0.8, size: 1.12, feed: 0.2, phase: 0.4 },
];

function fallPoint(s: number): Vec3 {
  const z = lerp(MOUTH.z - 4, FALL_FOOT[1] + 30, s);
  const x = MOUTH.x - 22 + 16 * s + 13 * Math.sin(s * 7.5 + 0.6) * smooth(0, 0.25, s) * smooth(1.05, 0.7, s);
  const y = Math.max(Math.max(0, ground(x, z)), lerp(MOUTH.floor + 2, 0, smooth(0, 0.2, s))) + 1.4;
  return [x, y, z];
}

function ribbon(point: (s: number) => Vec3, width: (s: number) => number, steps: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const p = point(s);
    const a = point(Math.max(0, s - 0.01));
    const b = point(Math.min(1, s + 0.01));
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const l = Math.hypot(dx, dz) || 1;
    const w = width(s) / 2;
    positions.push(p[0] - (dz / l) * w, p[1], p[2] + (dx / l) * w, p[0] + (dz / l) * w, p[1], p[2] - (dx / l) * w);
    if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

class Strips {
  private readonly positions: number[] = [];
  private readonly index: number[] = [];

  add(points: [number, number][], width: number | ((i: number) => number), y: number): void {
    const base = this.positions.length / 3;
    points.forEach((p, i) => {
      const a = points[Math.max(0, i - 1)] as [number, number];
      const b = points[Math.min(points.length - 1, i + 1)] as [number, number];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const l = Math.hypot(dx, dz) || 1;
      const w = (typeof width === 'number' ? width : width(i)) / 2;
      this.positions.push(p[0] - (dz / l) * w, y, p[1] + (dx / l) * w, p[0] + (dz / l) * w, y, p[1] - (dx / l) * w);
      if (i < points.length - 1) this.index.push(base + i * 2, base + i * 2 + 2, base + i * 2 + 1, base + i * 2 + 1, base + i * 2 + 2, base + i * 2 + 3);
    });
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setIndex(this.index);
    g.computeBoundingSphere();
    return g;
  }
}

const crooked = (a: [number, number], b: [number, number], n: number, wobble: number, seed: number): [number, number][] => {
  const out: [number, number][] = [];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / l;
  const nz = (b[0] - a[0]) / l;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const k = wobble * (Math.sin(t * 9 + seed) + 0.6 * Math.sin(t * 23 + seed * 3)) * Math.sin(Math.PI * t);
    out.push([lerp(a[0], b[0], t) + nx * k, lerp(a[1], b[1], t) + nz * k]);
  }
  return out;
};

const xz = (p: Vec3): [number, number] => [p[0], p[2]];

function fly(position: Vec3, heading: number, pitch: number, fov: number): Pose {
  const [hx, hz] = bearing(heading);
  const c = Math.cos((pitch * Math.PI) / 180);
  const s = Math.sin((pitch * Math.PI) / 180);
  return { position, aim: [position[0] + hx * c * 200, position[1] + s * 200, position[2] + hz * c * 200], fov };
}

const over = (x: number, z: number, height: number): Vec3 => [x, floor(x, z) + height, z];

const KEY0 = establishing();

const groupAt = walkerPosition(WALKERS[1] as Walker, keySeconds('heart-3'));
const KEY3: Pose = { position: over(groupAt[0] - 53.5, groupAt[1] + 59.5, 3), aim: [groupAt[0] + 6.5, 8.6, groupAt[1] + 2.5], fov: 17 };

const LINE: [number, number] = [-538, 300];
const KEY1 = fly(over(LINE[0], LINE[1], 1.5), 44, -9, 45);
const LINE_DIR = bearing(44);

const KEY2 = fly(over(SUNK[0] - 17, SUNK[2] + 13, 2.4), 41, -2.6, 31);

const MOUTH_AIM: Vec3 = [MOUTH.x + 26, 68, MOUTH.z];
const RETREAT = bearing(214);
const back = (distance: number, height: number, side = 0): Vec3 => {
  const x = MOUTH.x + RETREAT[0] * distance - RETREAT[1] * side;
  const z = MOUTH.z + RETREAT[1] * distance + RETREAT[0] * side;
  return over(x, z, height);
};
const KEY4: Pose = { position: back(760, 5), aim: MOUTH_AIM, fov: 15 };

const shots: Record<string, CameraPath> = {
  'heart-01': through(KEY0, keyPart(shotById('heart-01')), { forward: -88, up: 17, right: -12, turn: 1.5 }, { forward: 72, up: -9, turn: 2.5 }),
  'heart-02': through(KEY3, keyPart(shotById('heart-02')), { right: 13, forward: -14, turn: -6, up: 0.8 }, { right: -13, forward: 12, turn: 6.5, up: -0.4 }),
  'heart-03': [
    { at: 0, pose: fly(over(LINE[0] - LINE_DIR[0] * 24, LINE[1] - LINE_DIR[1] * 24, 4.2), 40, -10.5, 45) },
    { at: keyPart(shotById('heart-03')), pose: KEY1 },
    { at: 1, pose: fly(over(LINE[0] + LINE_DIR[0] * 4.5 - 1.5, LINE[1] + LINE_DIR[1] * 4.5 - 1, 1.1), 47, -7.5, 45) },
  ] satisfies Move,
  'heart-04': [
    { at: 0, pose: moved(KEY2, { right: -3.2, forward: -2.6, up: 0.5, turn: 1.5 }) },
    { at: keyPart(shotById('heart-04')), pose: KEY2 },
    { at: 1, pose: moved(KEY2, { right: 3.2, forward: 3, up: 0.1, turn: -1.5 }) },
  ] satisfies Move,
  'heart-05': [
    { at: 0, pose: { position: back(628, 4), aim: MOUTH_AIM, fov: 15 } },
    { at: keyPart(shotById('heart-05')), pose: KEY4 },
    { at: 1, pose: { position: back(862, 24, 30), aim: [MOUTH_AIM[0], MOUTH_AIM[1] - 8, MOUTH_AIM[2]], fov: 15 } },
  ] satisfies Move,
};

const LOOP_CENTRE = moved(KEY0, { forward: 34, up: -5, right: 16 });
const loopPath: CameraPath = (part) => {
  const a = part * Math.PI * 2;
  const pose = moved(LOOP_CENTRE, { right: 13 * Math.sin(a), forward: 10 * Math.cos(a), up: 1.8 * Math.sin(a + 0.9) });
  return { ...pose, aim: [LOOP_CENTRE.aim[0] + 20 * Math.sin(a), LOOP_CENTRE.aim[1], LOOP_CENTRE.aim[2] + 12 * Math.cos(a)] };
};

function create(): Place {
  const parts = new Parts(UNIT);
  const kit = createBlockout(parts);
  const scene = new THREE.Scene();
  const rng = stream('heart-blockout');

  scene.add(parts.standIn('sky', kit.sky(C.skyTop, C.skyHorizon, C.skyBelow)));
  kit.air(C.air, 0.00072);

  const landMaterial = kit.flat(C.land, { band: C.landBand, step: 26, amount: 0.8 });
  const walls = new THREE.Mesh(terrain(3000, 1840, 300, 184, wallHeight, [150, 60]), landMaterial);
  const outer = new THREE.Mesh(
    terrain(SIZE, SIZE, 96, 96, (x, z) => (Math.abs(x - 150) < 1420 && Math.abs(z - 60) < 840 ? -30 : wallHeight(x, z) - 3)),
    landMaterial,
  );
  const [rx, rz] = BUTTRESS.root;
  const [tx, tz] = BUTTRESS.tip;
  const buttress = new THREE.Mesh(terrain(640, 760, 128, 152, buttressHeight, [(rx + tx) / 2, (rz + tz) / 2]), landMaterial);
  scene.add(parts.standIn('land', walls, outer, buttress), outer, buttress);

  const bench = new THREE.Group();
  bench.add(new THREE.Mesh(terrain(640, 880, 160, 220, benchHeight, [-640, 100]), kit.flat(C.bench, { band: C.benchBand, step: 3.2, amount: 0.7 })));
  const rocks = herd(new THREE.BoxGeometry(1, 1, 1), kit.flat(C.rock), 90);
  for (let i = 0; i < 90; i++) {
    const nearCamera = i < 40;
    const p = nearCamera ? spot(rng.range(0.02, 0.75), rng.range(0.72, 0.99)) : spot(rng.range(0.0, 0.42), rng.range(0.56, 0.86));
    const onBench = benchDistance(p[0], p[2]) > 15;
    const size = onBench ? rng.range(0.7, nearCamera ? 2.6 : 4.2) : 0;
    setBlob(rocks, i, [p[0], p[1] + size * 0.25, p[2]], [size * rng.range(0.8, 1.6), size * rng.range(0.6, 1), size * rng.range(0.8, 1.4)], rng.range(0, 3), rng.range(-0.3, 0.3));
  }
  bench.add(rocks);
  scene.add(parts.standIn('bench', bench));

  const crust = new THREE.Mesh(new THREE.PlaneGeometry(3400, 2200, 136, 88).rotateX(-Math.PI / 2).translate(150, 0, 60), kit.flow(C.crustA, C.crustB, { scale: 46, speed: 0.7, direction: [0.8, 0.6] }));
  scene.add(parts.standIn('crust', crust));

  const seams = new Strips();
  for (let i = 0; i < 110; i++) {
    let x = rng.range(-520, 1150);
    let z = rng.range(-330, 480);
    if (ground(x, z) > -2) continue;
    let heading = rng.range(0, 360);
    const far = Math.hypot(x + 580, z - 315);
    const width = 0.8 + far / 210;
    const line: [number, number][] = [[x, z]];
    const count = 4 + rng.int(9);
    for (let j = 0; j < count; j++) {
      heading += rng.range(-48, 48);
      const [hx, hz] = bearing(heading);
      const step = rng.range(16, 52);
      x += hx * step;
      z += hz * step;
      if (ground(x, z) > -2) break;
      line.push([x, z]);
    }
    if (line.length > 2) seams.add(line, (j) => width * (0.35 + 0.65 * Math.sin((Math.PI * (j + 0.5)) / line.length)), 0.12 + (i % 7) * 0.01);
  }
  const shore: [number, number][] = [];
  for (let i = 2; i < 10; i++) {
    const a = SHORE_POINTS[i] as [number, number];
    const b = SHORE_POINTS[i + 1] as [number, number];
    for (let j = 0; j < 8; j++) {
      const t = j / 8;
      const k = 0.5 * Math.sin((i * 8 + j) * 1.7) + 0.3 * Math.sin((i * 8 + j) * 0.6);
      shore.push([lerp(a[0], b[0], t) + 0.9 + k, lerp(a[1], b[1], t) + k * 0.4]);
    }
  }
  seams.add(shore, (i) => 0.3 + 0.18 * Math.abs(Math.sin(i * 0.9)) + 0.25 * smooth(60, 12, Math.hypot((shore[i] as [number, number])[0] - LINE[0], (shore[i] as [number, number])[1] - LINE[1])), 0.42);
  seams.add(crooked(from(GROUP, -46, 22), from(GROUP, 86, -20), 22, 5, 1.3), (i) => 0.8 + 0.9 * Math.abs(Math.sin(i * 0.7)), 0.2);
  seams.add(crooked(xz(spot(0.37, 0.61)), xz(spot(0.47, 0.682)), 10, 2, 0.4), 1.3, 0.2);
  seams.add(crooked(xz(spot(0.47, 0.682)), xz(spot(0.71, 0.668)), 14, 3, 2.1), 1.1, 0.2);
  seams.add(crooked(xz(SPATTER_RIGHT[0] as Vec3), xz(SPATTER_RIGHT[3] as Vec3), 12, 4, 0.9), 3.4, 0.22);
  seams.add(crooked(xz(SPATTER_LEFT[0] as Vec3), xz(SPATTER_LEFT[2] as Vec3), 8, 2, 2.9), 2.6, 0.22);
  seams.add(crooked(from(SUNK, -5, -4.5), from(SUNK, 2, -6.5), 5, 0.5, 0.3), 0.7, 0.2);
  const seamMaterial = kit.flow(C.seamA, C.seamB, { scale: 2.6, speed: 1.1, direction: [0.5, 0.86], side: THREE.DoubleSide });
  const lava = new THREE.Group();
  lava.add(new THREE.Mesh(seams.geometry(), seamMaterial));
  const fan = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), kit.flow(C.fallA, C.fallB, { scale: 9, speed: 3, direction: [0.25, 0.97] }));
  fan.scale.set(104, 1, 40);
  fan.position.set(FALL_FOOT[0] + 34, 0.3, FALL_FOOT[1] + 22);
  lava.add(fan);
  scene.add(parts.standIn('lava', lava));

  const fallMaterial = kit.flow(C.fallA, C.fallB, { scale: 7, speed: 16, direction: [0.1, 1], side: THREE.DoubleSide });
  const fall = new THREE.Group();
  fall.add(new THREE.Mesh(ribbon(fallPoint, (s) => 17 + 30 * s * s + 7 * Math.sin(s * 11) + 70 * smooth(0.72, 1, s), 60), fallMaterial));
  fall.add(
    new THREE.Mesh(
      ribbon(
        (s) => {
          const p = fallPoint(0.3 + 0.7 * s);
          return [p[0] + 26 * Math.sin(Math.PI * s) + 30 * s, p[1] + 0.2, p[2]];
        },
        (s) => 6 + 12 * s,
        40,
      ),
      fallMaterial,
    ),
  );
  scene.add(parts.standIn('lava-fall', fall));

  const mouth = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), kit.flat(C.mouth, { side: THREE.DoubleSide }));
  hole.scale.set(MOUTH.width / 2 + 8, MOUTH.height * 0.82, 16);
  hole.position.set(MOUTH.x, MOUTH.floor - 2, MOUTH.z - 4);
  const archMaterial = kit.flat(C.arch);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 8, 28, Math.PI), archMaterial);
  arch.scale.set(MOUTH.width / 2 + 14, MOUTH.height * 0.82 + 7, 60);
  arch.position.set(MOUTH.x, MOUTH.floor - 2, MOUTH.z - 2);
  mouth.add(hole, arch);
  scene.add(parts.standIn('vessel-mouth', mouth));

  const walkerMaterial = kit.flat(C.walker);
  const count = WALKERS.length;
  const meshes: WalkerMeshes = {
    bodies: herd(new THREE.SphereGeometry(1, 12, 8), walkerMaterial, count),
    legs: herd(new THREE.CylinderGeometry(1, 1, 1, 6), walkerMaterial, count * LEG_SEGMENTS),
    necks: herd(new THREE.CylinderGeometry(1, 1, 1, 6), walkerMaterial, count * NECK_SEGMENTS),
    tufts: herd(new THREE.ConeGeometry(1, 1, 7), kit.flat(C.tuft), count),
  };
  const walkers = new THREE.Group();
  walkers.add(meshes.bodies, meshes.legs, meshes.necks, meshes.tufts);
  scene.add(parts.standIn('crust-walkers', walkers));

  const sunk = new THREE.Group();
  const sunkMaterial = kit.flat(C.sunk);
  const lump = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), sunkMaterial);
  lump.scale.set(3.2, 1.5, 2.3);
  lump.position.set(-1.5, 0.3, 0);
  const limbs = herd(new THREE.CylinderGeometry(1, 1, 1, 7), sunkMaterial, 4);
  setSegment(limbs, 0, [0, 1.2, 0.4], [2.6, 6.6, 1], 0.5);
  setSegment(limbs, 1, [2.6, 6.6, 1], [5.2, 0, 1.8], 0.42);
  setSegment(limbs, 2, [0.3, 1, -1], [2.8, 3.7, -2.4], 0.44);
  setSegment(limbs, 3, [2.8, 3.7, -2.4], [5.6, 0, -3], 0.36);
  const folds = herd(new THREE.TorusGeometry(1, 0.07, 6, 20).rotateX(Math.PI / 2), kit.flat(C.fold), 3);
  setBlob(folds, 0, [-1.5, 0.2, 0], [4.6, 2.4, 3.4]);
  setBlob(folds, 1, [-1.2, 0.15, 0.3], [6, 2, 4.6], 0.4);
  setBlob(folds, 2, [-0.6, 0.1, -0.2], [7.6, 1.6, 5.8], 1.1);
  sunk.add(lump, limbs, folds);
  sunk.position.set(SUNK[0], 0, SUNK[2]);
  sunk.rotation.y = -0.7;
  sunk.scale.setScalar(0.8);
  scene.add(parts.standIn('sunk-walker', sunk));

  const foundering = new THREE.Group();
  const SPARKS = 44;
  const sparks = herd(new THREE.SphereGeometry(1, 6, 4), kit.flat(C.spatter), SPARKS);
  const sparkSeeds = Array.from({ length: SPARKS }, (_, i) => {
    const line = i < 30 ? SPATTER_RIGHT : SPATTER_LEFT;
    const t = rng.next() * (line.length - 1);
    const a = line[Math.floor(t)] as Vec3;
    const b = line[Math.min(line.length - 1, Math.floor(t) + 1)] as Vec3;
    const f = t - Math.floor(t);
    return { x: lerp(a[0], b[0], f), z: lerp(a[2], b[2], f), period: rng.range(1.1, 2.3), phase: rng.next(), height: rng.range(4, i < 30 ? 15 : 8), throwX: rng.range(-4, 4), throwZ: rng.range(-4, 4), size: rng.range(0.3, 0.75) };
  });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 15), kit.flat(C.crustA));
  const plateAt = SPATTER_RIGHT[1] as Vec3;
  foundering.add(sparks, plate);
  scene.add(parts.standIn('foundering', foundering));

  const FUME = 40;
  const fume = herd(new THREE.IcosahedronGeometry(1, 2), kit.flat(C.fume), FUME);
  const LOW = 16;
  const fumeLow = herd(new THREE.IcosahedronGeometry(1, 2), kit.flat(C.fumeLow), LOW);
  const fumeSeeds = Array.from({ length: FUME + LOW }, () => ({ x: rng.range(-1, 1), z: rng.range(-1, 1), k: rng.range(0.75, 1.3) }));
  const fumeGroup = new THREE.Group();
  fumeGroup.add(fume, fumeLow);
  scene.add(parts.standIn('fume', fumeGroup));

  const crack = new THREE.Group();
  const crackTop = spot(0.1, 0.645);
  const crackFoot: Vec3 = [LINE[0] + 0.5, benchHeight(LINE[0] + 0.5, LINE[1] - 8) + 0.1, LINE[1] - 8];
  const patches = herd(new THREE.CylinderGeometry(1, 1.15, 0.5, 9), kit.flat(C.sulphur), 2);
  setBlob(patches, 0, crackTop, [5.5, 1, 3.4], 0.6);
  setBlob(patches, 1, crackFoot, [1.5, 0.6, 0.9], 1.9);
  const STEAM = 22;
  const steam = herd(new THREE.IcosahedronGeometry(1, 1), kit.flat(C.steam), STEAM);
  crack.add(patches, steam);
  scene.add(parts.standIn('sulphur-crack', crack));

  const GOBS = 30;
  const SPRAY = 14;
  const surge = herd(new THREE.SphereGeometry(1, 10, 7), kit.flat(C.surge), GOBS + SPRAY + 1);
  const spraySeeds = Array.from({ length: SPRAY }, () => ({ vx: rng.range(-13, 13), vy: rng.range(24, 46), vz: rng.range(6, 24), size: rng.range(1.6, 3.6) }));
  scene.add(parts.standIn('surge', surge));
  const surgeAt = eventSeconds(UNIT, 'surge') ?? 1e9;

  const seamA = new THREE.Color(C.seamA);
  const seamB = new THREE.Color(C.seamB);
  const archColour = new THREE.Color(C.arch);
  const archHot = new THREE.Color(0xff9a3a);
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.4, 40000);

  return {
    unit: UNIT,
    scene,
    camera,
    look: { ...neutralLook(), bloom: 0.02, vignette: 0.1, grain: 0.006 },
    volume: null,
    parts,
    setTime: (seconds) => {
      kit.setTime(seconds);
      const pulse = 0.5 + 0.5 * Math.sin(seconds * 1.05);
      (seamMaterial.uniforms.uA as THREE.IUniform<THREE.Color>).value.copy(seamA).multiplyScalar(0.72 + 0.28 * pulse);
      (seamMaterial.uniforms.uB as THREE.IUniform<THREE.Color>).value.copy(seamB).multiplyScalar(0.78 + 0.22 * pulse);

      WALKERS.forEach((w, i) => poseWalker(meshes, i, w, seconds, floor));

      sparkSeeds.forEach((s, i) => {
        const f = (seconds / s.period + s.phase) % 1;
        const arc = 4 * f * (1 - f);
        setBlob(sparks, i, [s.x + s.throwX * f, 0.3 + s.height * arc, s.z + s.throwZ * f], [s.size, s.size * 1.5, s.size]);
      });
      const sink = smooth(0, 26, seconds);
      plate.position.set(plateAt[0] + 6, 1.2 - 5 * sink, plateAt[2] - 22);
      plate.rotation.set(0.1 + 0.34 * sink, 0.5, 0.05 + 0.1 * sink);

      for (let i = 0; i < FUME; i++) {
        const s = fumeSeeds[i] as { x: number; z: number; k: number };
        const age = (seconds / 70 + i / FUME) % 1;
        const r = (30 + 105 * age) * s.k * smooth(0, 0.07, age) * smooth(1, 0.86, age);
        setBlob(fume, i, [620 + s.x * 70 + 1150 * age * age, 120 + 620 * Math.pow(age, 0.8), -330 + s.z * 60 - 260 * age], [r, r * 0.8, r]);
      }
      for (let i = 0; i < LOW; i++) {
        const s = fumeSeeds[FUME + i] as { x: number; z: number; k: number };
        const age = (seconds / 46 + i / LOW) % 1;
        const r = (34 + 70 * age) * s.k * smooth(0, 0.1, age) * smooth(1, 0.8, age);
        setBlob(fumeLow, i, [760 + s.x * 300 + 160 * age, 8 + 130 * age, -40 + s.z * 220], [r * 1.5, r * 0.6, r * 1.2]);
      }

      for (let i = 0; i < STEAM; i++) {
        const top = i % 2 === 0;
        const base = top ? crackTop : crackFoot;
        const age = (seconds / (top ? 5.5 : 4.2) + i * 0.618) % 1;
        const r = (top ? 1 : 0.5) * (0.4 + 1.5 * age) * smooth(1, 0.7, age);
        setBlob(steam, i, [base[0] + Math.sin(i * 2.3) * 1.6 - 5 * age * age, base[1] + 0.4 + (top ? 11 : 6) * age, base[2] + Math.cos(i * 1.7) * 1.2 + 2.5 * age], [r, r, r]);
      }

      const since = seconds - surgeAt;
      (archMaterial.uniforms.uColour as THREE.IUniform<THREE.Color>).value.copy(archColour).lerp(archHot, since < 0 ? 0 : smooth(0, 0.5, since) * (0.55 + 0.45 * smooth(5, 1.2, since)));
      const lip = fallPoint(0);
      const swell = since < 0 ? 0 : smooth(0, 0.7, since);
      setBlob(surge, GOBS + SPRAY, [lip[0], lip[1] + 4, lip[2] + 4], [34 * swell, 17 * swell, 20 * swell]);
      for (let i = 0; i < GOBS; i++) {
        const own = since - i * 0.1;
        const run = own < 0 ? 0 : Math.min(1, own * 0.16);
        const size = own < 0 ? 0 : smooth(0, 0.5, own) * (8 + 5 * Math.sin(i * 1.9) + 9 * run);
        const p = fallPoint(run);
        setBlob(surge, i, [p[0] + 5 * Math.sin(i * 2.7), p[1] + 1.5, p[2]], [size * 1.25, size * 0.55, size]);
      }
      spraySeeds.forEach((s, i) => {
        const own = since - i * 0.05;
        const live = own > 0 && own < 9;
        const y = lip[1] + 6 + s.vy * own - 4.9 * own * own;
        const size = live && y > 0 ? s.size : 0;
        setBlob(surge, GOBS + i, [lip[0] + s.vx * own, y, lip[2] + 6 + s.vz * own], [size, size * 1.6, size]);
      });
    },
    solo: (part) => kit.solo(part),
  };
}

const place: PlaceModule = {
  unit: UNIT,
  shots,
  loop: { path: loopPath, timeOffset: 7 },
  heightOf: (pose) => pose.position[1] - floor(pose.position[0], pose.position[2]),
  create,
};

export default place;
