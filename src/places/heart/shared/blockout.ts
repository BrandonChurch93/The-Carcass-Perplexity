// The stand-ins of the Heart, from the blockout. A part keeps its stand-in until a folder lists its name in PARTS; then the stand-in is not made at all.
import * as THREE from 'three';
import { createBlockout, herd, terrain } from '../../../core/blockout';
import type { Vec3 } from '../../../core/cameras';
import type { Parts } from '../../../core/place';
import { stream } from '../../../core/rng';
import { BUTTRESS, MOUTH, SHORE_POINTS, SIZE, bearing, benchDistance, benchHeight, buttressHeight, floor, ground, lerp, smooth, spot, wallHeight } from '../layout';
import { CRACK_TOP, FALL_FOOT, GROUP, LINE, SPATTER_LEFT, SPATTER_RIGHT, SUNK, SURGE, WALKERS, seamLine } from './anchors';
import { LEG_SEGMENTS, NECK_SEGMENTS, poseWalker, setBlob, setSegment, type WalkerMeshes } from './standin-walkers';

const C = {
  skyTop: 0x4b5166,
  skyHorizon: 0x77665f,
  skyBelow: 0x1a1210,
  air: 0x54392f,
  land: 0x2d2725,
  landBand: 0x1f1a19,
  buttress: 0x1d1918,
  buttressBand: 0x121010,
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
  tuft: 0xf0a04a,
  sunk: 0x1c1918,
  fold: 0x454040,
  fume: 0x5a443a,
  fumeLow: 0x8f4c2c,
  steam: 0x8d8882,
  sulphur: 0xb39a2c,
  spatter: 0xffa238,
  surge: 0xffe9a0,
};

/** The path of the fall in the blockout, from the lip of the mouth (s = 0) to the lake (s = 1). */
export function fallPoint(s: number): Vec3 {
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

export interface StandIns {
  setTime(seconds: number): void;
  solo(part: string | null): void;
}

export function createStandIns(scene: THREE.Scene, parts: Parts, skip: ReadonlySet<string>): StandIns {
  const kit = createBlockout(parts);
  const rng = stream('heart-blockout');
  const ticks: ((seconds: number) => void)[] = [];
  const has = (name: string): boolean => !skip.has(name);

  if (has('sky')) scene.add(parts.standIn('sky', kit.sky(C.skyTop, C.skyHorizon, C.skyBelow)));
  if (has('air')) kit.air(C.air, skip.size > 0 ? 0 : 0.00072);

  if (has('land')) {
    const landMaterial = kit.flat(C.land, { band: C.landBand, step: 26, amount: 0.8 });
    const walls = new THREE.Mesh(terrain(3000, 1840, 300, 184, wallHeight, [150, 60]), landMaterial);
    const outer = new THREE.Mesh(
      terrain(SIZE, SIZE, 96, 96, (x, z) => (Math.abs(x - 150) < 1420 && Math.abs(z - 60) < 840 ? -30 : wallHeight(x, z) - 3)),
      landMaterial,
    );
    const [rx, rz] = BUTTRESS.root;
    const [tx, tz] = BUTTRESS.tip;
    const buttress = new THREE.Mesh(terrain(640, 760, 128, 152, buttressHeight, [(rx + tx) / 2, (rz + tz) / 2]), kit.flat(C.buttress, { band: C.buttressBand, step: 9, amount: 0.7 }));
    scene.add(parts.standIn('land', walls, outer, buttress), outer, buttress);
  }

  if (has('bench')) {
    const bench = new THREE.Group();
    bench.add(new THREE.Mesh(terrain(640, 880, 128, 176, benchHeight, [-640, 100]), kit.flat(C.bench, { band: C.benchBand, step: 3.2, amount: 0.7 })));
    const rocks = herd(new THREE.BoxGeometry(1, 1, 1), kit.flat(C.rock), 90);
    const rocksRng = stream('heart-blockout/rocks');
    for (let i = 0; i < 90; i++) {
      const nearCamera = i < 40;
      const p = nearCamera ? spot(rocksRng.range(0.02, 0.75), rocksRng.range(0.72, 0.99)) : spot(rocksRng.range(0.0, 0.42), rocksRng.range(0.56, 0.86));
      const onBench = benchDistance(p[0], p[2]) > 15;
      const size = onBench ? rocksRng.range(0.7, nearCamera ? 2.6 : 4.2) : 0;
      setBlob(rocks, i, [p[0], p[1] + size * 0.25, p[2]], [size * rocksRng.range(0.8, 1.6), size * rocksRng.range(0.6, 1), size * rocksRng.range(0.8, 1.4)], rocksRng.range(0, 3), rocksRng.range(-0.3, 0.3));
    }
    bench.add(rocks);
    scene.add(parts.standIn('bench', bench));
  }

  if (has('crust')) {
    const crust = new THREE.Mesh(new THREE.PlaneGeometry(3400, 2200, 136, 88).rotateX(-Math.PI / 2).translate(150, 0, 60), kit.flow(C.crustA, C.crustB, { scale: 46, speed: 0.7, direction: [0.8, 0.6] }));
    scene.add(parts.standIn('crust', crust));
  }

  if (has('lava')) {
    const seams = new Strips();
    const seamRng = stream('heart-blockout/seams');
    for (let i = 0; i < 110; i++) {
      let x = seamRng.range(-520, 1150);
      let z = seamRng.range(-330, 480);
      if (ground(x, z) > -2) continue;
      let heading = seamRng.range(0, 360);
      const far = Math.hypot(x + 580, z - 315);
      const width = 0.8 + far / 210;
      const line: [number, number][] = [[x, z]];
      const count = 4 + seamRng.int(9);
      for (let j = 0; j < count; j++) {
        heading += seamRng.range(-48, 48);
        const [hx, hz] = bearing(heading);
        const step = seamRng.range(16, 52);
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
    seams.add(shore, (i) => 0.3 + 0.18 * Math.abs(Math.sin(i * 0.9)), 0.42);
    seams.add(seamLine('line', 14), (i) => 1.5 - 0.06 * i, 0.3);
    seams.add(seamLine('group', 22), (i) => 0.8 + 0.9 * Math.abs(Math.sin(i * 0.7)), 0.2);
    seams.add(seamLine('nearA', 10), 1.3, 0.2);
    seams.add(seamLine('nearB', 14), 1.1, 0.2);
    seams.add(seamLine('spatterRight', 12), 3.4, 0.22);
    seams.add(seamLine('spatterLeft', 8), 2.6, 0.22);
    seams.add(seamLine('sunk', 5), 0.7, 0.2);
    const seamMaterial = kit.flow(C.seamA, C.seamB, { scale: 2.6, speed: 1.1, direction: [0.5, 0.86], side: THREE.DoubleSide });
    const lava = new THREE.Group();
    lava.add(new THREE.Mesh(seams.geometry(), seamMaterial));
    const fan = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), kit.flow(C.fallA, C.fallB, { scale: 9, speed: 3, direction: [0.25, 0.97] }));
    fan.scale.set(104, 1, 40);
    fan.position.set(FALL_FOOT[0] + 34, 0.3, FALL_FOOT[1] + 22);
    const pool = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10), kit.flow(C.fallA, C.fallB, { scale: 9, speed: 3, direction: [0.25, 0.97] }));
    pool.scale.set(96, 11, 42);
    pool.position.set(FALL_FOOT[0] + 34, 0, FALL_FOOT[1] + 22);
    lava.add(fan, pool);
    scene.add(parts.standIn('lava', lava));
    const seamA = new THREE.Color(C.seamA);
    const seamB = new THREE.Color(C.seamB);
    ticks.push((seconds) => {
      const pulse = 0.5 + 0.5 * Math.sin(seconds * 1.05);
      (seamMaterial.uniforms.uA as THREE.IUniform<THREE.Color>).value.copy(seamA).multiplyScalar(0.72 + 0.28 * pulse);
      (seamMaterial.uniforms.uB as THREE.IUniform<THREE.Color>).value.copy(seamB).multiplyScalar(0.78 + 0.22 * pulse);
    });
  }

  if (has('lava-fall')) {
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
  }

  let archMaterial: THREE.ShaderMaterial | null = null;
  if (has('vessel-mouth')) {
    const mouth = new THREE.Group();
    const hole = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), kit.flat(C.mouth, { side: THREE.DoubleSide }));
    hole.scale.set(MOUTH.width / 2 + 8, MOUTH.height * 0.82, 16);
    hole.position.set(MOUTH.x, MOUTH.floor - 2, MOUTH.z - 4);
    archMaterial = kit.flat(C.arch);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 8, 28, Math.PI), archMaterial);
    arch.scale.set(MOUTH.width / 2 + 14, MOUTH.height * 0.82 + 7, 60);
    arch.position.set(MOUTH.x, MOUTH.floor - 2, MOUTH.z - 2);
    mouth.add(hole, arch);
    scene.add(parts.standIn('vessel-mouth', mouth));
    const archColour = new THREE.Color(C.arch);
    const archHot = new THREE.Color(0xff9a3a);
    const material = archMaterial;
    ticks.push((seconds) => {
      const since = seconds - SURGE;
      (material.uniforms.uColour as THREE.IUniform<THREE.Color>).value.copy(archColour).lerp(archHot, since < 0 ? 0 : smooth(0, 0.5, since) * (0.55 + 0.45 * smooth(5, 1.2, since)));
    });
  }

  if (has('crust-walkers')) {
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
    ticks.push((seconds) => WALKERS.forEach((w, i) => poseWalker(meshes, i, w, seconds, floor)));
  }

  if (has('sunk-walker')) {
    const sunk = new THREE.Group();
    const sunkMaterial = kit.flat(C.sunk);
    const lump = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), sunkMaterial);
    lump.scale.set(3.2, 1.5, 2.3);
    lump.position.set(-1.5, 0.3, 0);
    const ARCH = 9;
    const limbs = herd(new THREE.CylinderGeometry(1, 1, 1, 7), sunkMaterial, ARCH + 3);
    const archAt = (t: number): Vec3 => [0.2 + 6.4 * t - 1.1 * Math.sin(Math.PI * t), 0.6 + 7.4 * Math.sin(Math.PI * Math.pow(t, 0.8)), 0.4 + 1.4 * t];
    for (let i = 0; i < ARCH; i++) setSegment(limbs, i, archAt(i / ARCH), archAt((i + 1) / ARCH), 0.56 - 0.02 * i);
    const lowAt = (t: number): Vec3 => [0.3 + 5 * t, 0.8 + 3.2 * Math.sin(Math.PI * t), -1 - 2 * t];
    for (let i = 0; i < 3; i++) setSegment(limbs, ARCH + i, lowAt(i / 3), lowAt((i + 1) / 3), 0.4);
    const folds = herd(new THREE.TorusGeometry(1, 0.07, 6, 20).rotateX(Math.PI / 2), kit.flat(C.fold), 3);
    setBlob(folds, 0, [-1.5, 0.2, 0], [4.6, 2.4, 3.4]);
    setBlob(folds, 1, [-1.2, 0.15, 0.3], [6, 2, 4.6], 0.4);
    setBlob(folds, 2, [-0.6, 0.1, -0.2], [7.6, 1.6, 5.8], 1.1);
    sunk.add(lump, limbs, folds);
    sunk.position.set(SUNK[0], 0, SUNK[2]);
    sunk.rotation.y = -0.7;
    sunk.scale.setScalar(0.8);
    scene.add(parts.standIn('sunk-walker', sunk));
  }

  if (has('foundering')) {
    const foundering = new THREE.Group();
    const SPARKS = 44;
    const sparkRng = stream('heart-blockout/sparks');
    const sparks = herd(new THREE.SphereGeometry(1, 6, 4), kit.flat(C.spatter), SPARKS);
    const sparkSeeds = Array.from({ length: SPARKS }, (_, i) => {
      const line = i < 30 ? SPATTER_RIGHT : SPATTER_LEFT;
      const t = sparkRng.next() * (line.length - 1);
      const a = line[Math.floor(t)] as Vec3;
      const b = line[Math.min(line.length - 1, Math.floor(t) + 1)] as Vec3;
      const f = t - Math.floor(t);
      return { x: lerp(a[0], b[0], f), z: lerp(a[2], b[2], f), period: sparkRng.range(1.1, 2.3), phase: sparkRng.next(), height: sparkRng.range(4, i < 30 ? 15 : 8), throwX: sparkRng.range(-4, 4), throwZ: sparkRng.range(-4, 4), size: sparkRng.range(0.3, 0.75) };
    });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 15), kit.flat(C.crustA));
    const plateAt = SPATTER_RIGHT[1] as Vec3;
    foundering.add(sparks, plate);
    scene.add(parts.standIn('foundering', foundering));
    ticks.push((seconds) => {
      sparkSeeds.forEach((s, i) => {
        const f = (seconds / s.period + s.phase) % 1;
        const arc = 4 * f * (1 - f);
        setBlob(sparks, i, [s.x + s.throwX * f, 0.3 + s.height * arc, s.z + s.throwZ * f], [s.size, s.size * 1.5, s.size]);
      });
      const sink = smooth(0, 26, seconds);
      plate.position.set(plateAt[0] + 6, 1.2 - 5 * sink, plateAt[2] - 22);
      plate.rotation.set(0.1 + 0.34 * sink, 0.5, 0.05 + 0.1 * sink);
    });
  }

  if (has('fume')) {
    const FUME = 40;
    const fume = herd(new THREE.IcosahedronGeometry(1, 2), kit.flat(C.fume), FUME);
    const LOW = 16;
    const fumeLow = herd(new THREE.IcosahedronGeometry(1, 2), kit.flat(C.fumeLow), LOW);
    const fumeRng = stream('heart-blockout/fume');
    const fumeSeeds = Array.from({ length: FUME + LOW }, () => ({ x: fumeRng.range(-1, 1), z: fumeRng.range(-1, 1), k: fumeRng.range(0.75, 1.3) }));
    const fumeGroup = new THREE.Group();
    fumeGroup.add(fume, fumeLow);
    scene.add(parts.standIn('fume', fumeGroup));
    ticks.push((seconds) => {
      for (let i = 0; i < FUME; i++) {
        const s = fumeSeeds[i] as { x: number; z: number; k: number };
        const age = (seconds / 44 + i / FUME) % 1;
        const r = (30 + 105 * age) * s.k * smooth(0, 0.07, age) * smooth(1, 0.86, age);
        setBlob(fume, i, [500 + s.x * 60 - 420 * age * age, 150 + 640 * Math.pow(age, 0.8), -390 + s.z * 50 - 200 * age], [r, r * 0.8, r]);
      }
      for (let i = 0; i < LOW; i++) {
        const s = fumeSeeds[FUME + i] as { x: number; z: number; k: number };
        const age = (seconds / 32 + i / LOW) % 1;
        const r = (34 + 70 * age) * s.k * smooth(0, 0.1, age) * smooth(1, 0.8, age);
        setBlob(fumeLow, i, [760 + s.x * 300 + 160 * age, 8 + 130 * age, -40 + s.z * 220], [r * 1.5, r * 0.6, r * 1.2]);
      }
    });
  }

  if (has('sulphur-crack')) {
    const crack = new THREE.Group();
    const crackFoot: Vec3 = [LINE[0] + 5.5, Math.max(0.3, benchHeight(LINE[0] + 5.5, LINE[1] - 14)) + 0.1, LINE[1] - 14];
    const patches = herd(new THREE.CylinderGeometry(1, 1.15, 0.5, 9), kit.flat(C.sulphur), 2);
    setBlob(patches, 0, CRACK_TOP, [5.5, 1, 3.4], 0.6);
    setBlob(patches, 1, crackFoot, [1.5, 0.6, 0.9], 1.9);
    const STEAM = 22;
    const steam = herd(new THREE.IcosahedronGeometry(1, 1), kit.flat(C.steam), STEAM);
    crack.add(patches, steam);
    scene.add(parts.standIn('sulphur-crack', crack));
    ticks.push((seconds) => {
      for (let i = 0; i < STEAM; i++) {
        const top = i % 2 === 0;
        const base = top ? CRACK_TOP : crackFoot;
        const age = (seconds / (top ? 5.5 : 4.2) + i * 0.618) % 1;
        const r = (top ? 1 : 0.5) * (0.4 + 1.5 * age) * smooth(1, 0.7, age);
        setBlob(steam, i, [base[0] + Math.sin(i * 2.3) * 1.6 - 5 * age * age, base[1] + 0.4 + (top ? 11 : 6) * age, base[2] + Math.cos(i * 1.7) * 1.2 + 2.5 * age], [r, r, r]);
      }
    });
  }

  if (has('surge')) {
    const GOBS = 30;
    const SPRAY = 14;
    const surgeRng = stream('heart-blockout/surge');
    const surge = herd(new THREE.SphereGeometry(1, 10, 7), kit.flat(C.surge), GOBS + SPRAY + 1);
    const spraySeeds = Array.from({ length: SPRAY }, () => ({ vx: surgeRng.range(-13, 13), vy: surgeRng.range(24, 46), vz: surgeRng.range(6, 24), size: surgeRng.range(1.6, 3.6) }));
    scene.add(parts.standIn('surge', surge));
    ticks.push((seconds) => {
      const since = seconds - SURGE;
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
    });
  }

  return {
    setTime: (seconds) => {
      kit.setTime(seconds);
      for (const tick of ticks) tick(seconds);
    },
    solo: (part) => kit.solo(part),
  };
}
