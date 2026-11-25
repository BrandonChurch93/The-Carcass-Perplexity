// The stand-ins of the Ribs, from the blockout. A part keeps its stand-in until a folder lists its name in PARTS; then the stand-in is not made at all.
import * as THREE from 'three';
import { createBlockout, herd, setFigure, terrain } from '../../../core/blockout';
import { resolve } from '../../../core/cameras';
import type { Parts } from '../../../core/place';
import { stream } from '../../../core/rng';
import { eventSeconds } from '../../../film/cut';
import { shots, STATIONS } from '../cameras';
import { BUTTRESS, FLOOR, POOL, RIBS, TIDE, bladeGeometry, buttressRadius, groundAt, landAt, ribByName, skirtGeometry, weedPoint } from '../layout';

const BORE_SPEED = 55;
const BORE_HEIGHT = 28;
const WORLD = 26000;
const LAND = { width: 2400, depth: 4400, columns: 140, rows: 250, centre: [50, -1300] as [number, number] };

const FEEDERS = 44;
const FLIERS = 460;
const FLEEING = 9;
const COLONY = 900;
const ROCKS = 170;
const CLOUDS = 30;
const TRACK_SAMPLES = 96;
const SPRAY = 70;

function ribbon(y: number, keep: (lo: number, hi: number) => boolean): THREE.BufferGeometry {
  const positions: number[] = [];
  const dx = LAND.width / LAND.columns;
  const dz = LAND.depth / LAND.rows;
  const x0 = LAND.centre[0] - LAND.width / 2;
  const z0 = LAND.centre[1] - LAND.depth / 2;
  for (let j = 0; j < LAND.rows; j++) {
    for (let i = 0; i < LAND.columns; i++) {
      const xa = x0 + i * dx;
      const xb = xa + dx;
      const za = z0 + j * dz;
      const zb = za + dz;
      const h = [landAt(xa, za), landAt(xb, za), landAt(xa, zb), landAt(xb, zb)];
      if (!keep(Math.min(...h), Math.max(...h))) continue;
      positions.push(xa, y, za, xa, y, zb, xb, y, za, xb, y, za, xa, y, zb, xb, y, zb);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeBoundingSphere();
  return g;
}

const STREAKS: [number, number][] = [[-66, 6], [-44, 8], [-23, 10], [0, 12]];
const STREAK_STEP = 16;

function shoreStreaks(y: number): THREE.BufferGeometry {
  const positions: number[] = [];
  STREAKS.forEach(([inset, width], n) => {
    const w = FLOOR.west + inset;
    const e = FLOOR.east - inset;
    const s = FLOOR.south - inset;
    const north = FLOOR.north + inset;
    const sides: [number, number, number, number][] = [[w, s, e, s], [e, s, e, north], [e, north, w, north], [w, north, w, s]];
    for (const [ax, az, bx, bz] of sides) {
      const length = Math.hypot(bx - ax, bz - az);
      const dx = (bx - ax) / length;
      const dz = (bz - az) / length;
      const steps = Math.ceil(length / STREAK_STEP);
      let last: [number, number, number, number] | null = null;
      for (let i = 0; i <= steps; i++) {
        const d = (i / steps) * length;
        const sway = 5 * Math.sin(d * 0.013 + n * 2.1) + 2.5 * Math.sin(d * 0.041 + n * 0.7);
        const half = 0.5 * width * (0.7 + 0.3 * Math.sin(d * 0.023 + n * 1.3));
        const x = ax + dx * d;
        const z = az + dz * d;
        const here: [number, number, number, number] = [x + dz * (sway - half), z - dx * (sway - half), x + dz * (sway + half), z - dx * (sway + half)];
        if (last) positions.push(last[0], y, last[1], here[0], y, here[1], last[2], y, last[3], last[2], y, last[3], here[0], y, here[1], here[2], y, here[3]);
        last = here;
      }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeBoundingSphere();
  return g;
}

function join(pieces: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const piece of pieces) {
    const flat = piece.index ? piece.toNonIndexed() : piece;
    const p = flat.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) positions.push(p.getX(i), p.getY(i), p.getZ(i));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeBoundingSphere();
  return g;
}

function feederShape(): THREE.BufferGeometry {
  const legA = new THREE.BoxGeometry(0.12, 1.6, 0.12).translate(0.22, 0.8, 0.1);
  const legB = new THREE.BoxGeometry(0.12, 1.6, 0.12).translate(-0.22, 0.8, -0.25);
  const body = new THREE.CapsuleGeometry(0.42, 0.9, 2, 8).rotateX(Math.PI / 2 - 0.25).translate(0, 1.95, 0);
  const wings = new THREE.ConeGeometry(0.62, 2.1, 6).rotateX(-1.15).translate(0, 2.45, -0.75);
  const neck = new THREE.BoxGeometry(0.16, 0.16, 2.3).rotateX(0.82).translate(0, 1.05, 1.45);
  const tuft = new THREE.ConeGeometry(0.3, 0.7, 5).translate(0, 0.4, 2.25);
  return join([legA, legB, body, wings, neck, tuft]);
}

function flierShape(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const v = [0, 0, 0.6, 0, 0, -0.5, -1.6, 0.5, -0.2, 0, 0, 0.6, 1.6, 0.5, -0.2, 0, 0, -0.5];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  const body = new THREE.BoxGeometry(0.42, 0.4, 1.7).translate(0, -0.05, 0.3);
  return join([g, body]);
}

function drownedShape(): THREE.BufferGeometry {
  const tilt = 0.95;
  const along = (d: number): [number, number] => [-Math.sin(tilt) * d, Math.cos(tilt) * d];
  const pieces: THREE.BufferGeometry[] = [new THREE.CapsuleGeometry(0.75, 3.4, 2, 10).rotateZ(tilt).translate(0, 0, 0.9)];
  for (const d of [2, 1.3, -1.2, -1.9]) {
    const [x, y] = along(d);
    const length = d > 0 ? 3.6 : 4.6;
    pieces.push(new THREE.BoxGeometry(0.26, length, 0.26).translate(x + (d > 0 ? -0.2 : 0.2), y - length / 2, 1.1));
  }
  const [hx, hy] = along(-2.6);
  pieces.push(new THREE.BoxGeometry(0.3, 3.4, 0.3).translate(hx + 0.4, hy - 1.7, 0.9));
  pieces.push(new THREE.ConeGeometry(0.5, 1.8, 5).rotateX(Math.PI).translate(hx + 0.4, hy - 4.2, 0.9));
  return join(pieces);
}

function buttressShape(from: number, to: number): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [];
  for (let y = from; y < to; y += BUTTRESS.step) {
    const r = buttressRadius(y + BUTTRESS.step);
    pieces.push(new THREE.CylinderGeometry(r, r, BUTTRESS.step + (y === from ? 16 : 0), 44, 1).translate(BUTTRESS.x, y + BUTTRESS.step / 2 - (y === from ? 8 : 0), BUTTRESS.z));
  }
  return join(pieces);
}

export interface StandIns {
  setTime(seconds: number): void;
  solo(part: string | null): void;
}

export function createStandIns(scene: THREE.Scene, parts: Parts, skip: ReadonlySet<string>): StandIns {
  const kit = createBlockout(parts);
  const has = (name: string): boolean => !skip.has(name);
  // A stand-in whose part a folder has taken is made (others are placed by it) and not drawn.
  const put = (name: string, object: THREE.Object3D, ...more: THREE.Object3D[]): void => {
    if (has(name)) scene.add(parts.standIn(name, object, ...more), ...more);
  };
  const boreAt = eventSeconds('ribs', 'bore');
  if (boreAt === null) throw new Error('The cut list has no bore for the ribs');

  put('sky', kit.sky(0x35404d, 0x8794a0, 0x6c787c));
  if (has('air')) kit.air(0x8e9ba6, 0.00027);

  const sand = kit.flat(0x55595a, { band: 0x4b4f50, step: 0.5, amount: 0.5 });
  put('land', new THREE.Mesh(terrain(LAND.width, LAND.depth, LAND.columns, LAND.rows, landAt, LAND.centre), sand));

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD, 160, 160).rotateX(-Math.PI / 2), kit.flow(0x44605f, 0x2c4648, { scale: 36, speed: 13, direction: [0.25, -1] }));
  put('sea', sea);

  const pools = new THREE.Mesh(ribbon(POOL, (lo) => lo > 0.2), kit.flow(0xa9b6bf, 0x565b5c, { scale: 6, speed: 0.6, direction: [0.3, 1] }));
  put('runnels', pools);

  const surf = new THREE.Mesh(shoreStreaks(0.45), kit.flow(0xe9edeb, 0x9db0ad, { scale: 15, speed: 8, direction: [0.2, -1], side: THREE.DoubleSide }));
  put('surf', surf);

  const rock = kit.flat(0xc4c0b3, { band: 0xa89c86, step: 26, amount: 0.5, side: THREE.DoubleSide });
  const weed = kit.flat(0x1e211b, { band: 0x35321f, step: 7, amount: 0.7, side: THREE.DoubleSide });
  const blades = new THREE.Group();
  const skirts = new THREE.Group();
  for (const rib of RIBS) {
    blades.add(new THREE.Mesh(bladeGeometry(rib), rock));
    skirts.add(new THREE.Mesh(skirtGeometry(rib), weed));
  }
  for (const post of STATIONS.posts) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(9, 24, 76, 14, 6), weed);
    stack.position.set(post[0], 30, post[1]);
    skirts.add(stack);
  }
  const tideStep = Math.ceil(TIDE / BUTTRESS.step) * BUTTRESS.step;
  skirts.add(new THREE.Mesh(buttressShape(0, tideStep), weed));
  put('ribs', blades);
  put('weed', skirts);
  put('ledges', new THREE.Mesh(buttressShape(tideStep, BUTTRESS.top), kit.flat(0xa8a394, { band: 0x8a7a5e, step: BUTTRESS.step * 2, amount: 0.6 })));

  const tracks: [number, number][] = [];
  for (const path of Object.values(shots)) {
    for (let k = 0; k <= TRACK_SAMPLES; k++) {
      const pose = resolve(path, k / TRACK_SAMPLES, 0);
      tracks.push([pose.position[0], pose.position[2]]);
    }
  }
  const nearTrack = (x: number, z: number, reach: number): boolean => tracks.some((p) => Math.hypot(x - p[0], z - p[1]) < reach);

  const arch = new THREE.Mesh(new THREE.TorusGeometry(34, 12, 8, 20, Math.PI), kit.flat(0x8d8674, { band: 0x6a6455, step: 18, amount: 0.8 }));
  arch.scale.set(1, 1.45, 1.6);
  arch.position.set(STATIONS.arch[0], -6, STATIONS.arch[1]);
  arch.rotation.y = Math.atan2(STATIONS.establish[0] - STATIONS.arch[0], STATIONS.establish[1] - STATIONS.arch[1]);
  blades.add(arch);

  const scatter = stream('ribs-scatter');
  const stone = kit.flat(0x22251f, { band: 0x3a3622, step: 1.5, amount: 0.6 });
  const rocks = herd(new THREE.DodecahedronGeometry(1, 0), stone, ROCKS);
  for (let i = 0; i < ROCKS; i++) {
    let x: number;
    let z: number;
    let size: number;
    if (i < 46) {
      const p = weedPoint(ribByName('L1'), scatter.range(-0.5, 1.9), 0, scatter.range(2, 40));
      x = p.x;
      z = p.z;
      size = scatter.range(2, 6);
    } else if (i < 120) {
      const rib = RIBS[1 + scatter.int(8)] as (typeof RIBS)[number];
      const p = weedPoint(rib, scatter.range(0, Math.PI * 2), 0, scatter.range(2, 60));
      x = p.x;
      z = p.z;
      size = scatter.range(2, 9);
    } else {
      x = scatter.range(-230, 330);
      z = scatter.range(-1300, 200);
      size = scatter.range(0.5, 1.6);
    }
    if (nearTrack(x, z, 10 + size * 2)) size = 0.001;
    setFigure(rocks, i, x, groundAt(x, z) - size * 0.25, z, scatter.range(0, 6), [size * scatter.range(1, 1.6), size * 0.75, size]);
  }
  put('rocks', rocks);

  const cloudStuff = kit.flat(0x4a5562);
  const clouds = herd(new THREE.SphereGeometry(1, 12, 6), cloudStuff, CLOUDS);
  const cloudSeed: { x: number; y: number; z: number; size: [number, number, number] }[] = [];
  for (let i = 0; i < CLOUDS; i++) {
    cloudSeed.push({ x: scatter.range(-7000, 7000), y: scatter.range(1000, 1900), z: scatter.range(-6500, 4500), size: [scatter.range(700, 1700), scatter.range(60, 150), scatter.range(450, 1000)] });
  }
  put('cloud', clouds);

  const pale = kit.flat(0xd3ccc0, { side: THREE.DoubleSide });
  const feeders = herd(feederShape(), pale, FEEDERS);
  const feederSeed: { x: number; z: number; yaw: number; size: number; pace: number }[] = [];
  for (const f of STATIONS.feeders) feederSeed.push({ x: f[0], z: f[1], yaw: f[2], size: f[3], pace: 0 });
  while (feederSeed.length < FEEDERS) {
    const x = scatter.range(-200, 300);
    const z = scatter.range(-1250, 90);
    if (nearTrack(x, z, 30)) continue;
    feederSeed.push({ x, z, yaw: scatter.range(0, Math.PI * 2), size: scatter.range(0.95, 1.2), pace: scatter.range(0.2, 0.7) });
  }

  const fliers = herd(flierShape(), pale, FLIERS - FLEEING);
  const fleeing = herd(flierShape(), kit.flat(0x6f6a62, { side: THREE.DoubleSide }), FLEEING);
  const homes = ['R1', 'R1', 'R1', 'R2', 'L2', 'L1', 'L3', 'R3', 'OL', 'OR'];
  const flierSeed: { cx: number; cz: number; radius: number; y: number; rate: number; phase: number; squash: number }[] = [];
  for (let i = 0; i < FLIERS - FLEEING; i++) {
    const rib = ribByName(homes[scatter.int(homes.length)] as string);
    const low = i < 110;
    const home = low ? { ...rib, x: BUTTRESS.x, z: BUTTRESS.z, lean: 0, height: 0, yaw: 0 } : rib;
    const radius = low ? scatter.range(78, 130) : scatter.range(60, 330);
    const cz = home.z + scatter.range(-60, 60);
    const cx = home.x + Math.cos(home.yaw) * home.lean * scatter.range(0, 0.6);
    flierSeed.push({ cx, cz, radius, y: low ? scatter.range(38, 80) : scatter.range(70, home.height + 60), rate: (scatter.next() < 0.5 ? 1 : -1) * scatter.range(11, 19) / radius, phase: scatter.range(0, Math.PI * 2), squash: scatter.range(0.55, 1) });
  }

  const colony = herd(new THREE.ConeGeometry(0.55, 2, 5).translate(0, 1, 0), pale, COLONY);
  const facing = Math.atan2(STATIONS.colonySide[1], STATIONS.colonySide[0]);
  for (let i = 0; i < COLONY; i++) {
    const tier = Math.floor(scatter.range(TIDE + 2, BUTTRESS.top - 6) / BUTTRESS.step) * BUTTRESS.step;
    const r = buttressRadius(tier + BUTTRESS.step) + scatter.range(0.5, BUTTRESS.step * BUTTRESS.slope - 0.4);
    const a = facing + scatter.normal() * 0.55;
    setFigure(colony, i, BUTTRESS.x + Math.cos(a) * r, tier, BUTTRESS.z + Math.sin(a) * r, scatter.range(0, 6), scatter.range(0.8, 1.25));
  }
  put('kite-wings', feeders, fliers, fleeing, colony);

  const drowned = new THREE.Mesh(drownedShape(), kit.flat(0xd9c6bd, { side: THREE.DoubleSide }));
  const hang = weedPoint(ribByName('L1'), STATIONS.drownedPhi, STATIONS.drownedHeight, 0.3);
  const hangNext = weedPoint(ribByName('L1'), STATIONS.drownedPhi + 0.02, STATIONS.drownedHeight, 0.3);
  drowned.position.copy(hang);
  drowned.rotation.y = Math.atan2(hangNext.z - hang.z, -(hangNext.x - hang.x));
  drowned.scale.setScalar(1.1);
  drowned.rotation.order = 'YXZ';
  drowned.rotation.x = -0.36;
  put('drowned', drowned);

  const bore = new THREE.Group();
  const depth = 9000;
  const flood = new THREE.Mesh(new THREE.BoxGeometry(16000, BORE_HEIGHT, depth, 80, 1, 50), kit.flow(0x4c6665, 0x314c4d, { scale: 30, speed: BORE_SPEED, direction: [0, 1] }));
  flood.position.set(0, BORE_HEIGHT / 2 - 4, -depth / 2 - 14);
  const wallStuff = kit.flow(0xf6f8f6, 0xb4c2c1, { scale: 11, speed: BORE_SPEED * 1.7, direction: [0, 1] });
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, 16000, 16, 100, true).rotateZ(Math.PI / 2), wallStuff);
  (roll.material as THREE.Material).side = THREE.DoubleSide;
  roll.position.set(0, 12, -17);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(16000, 16, 26, 100, 1, 1), wallStuff);
  crest.position.set(0, BORE_HEIGHT + 2, -34);
  const plumes = herd(new THREE.SphereGeometry(1, 8, 6), kit.flat(0xeef2f0), SPRAY);
  const plumeSeed: { x: number; size: number; phase: number }[] = [];
  for (let i = 0; i < SPRAY; i++) plumeSeed.push({ x: -1400 + (2800 * i) / SPRAY + scatter.range(-14, 14), size: scatter.range(9, 17), phase: scatter.range(0, 6) });
  bore.add(flood, roll, crest, plumes);
  put('bore', bore);

  const flee = STATIONS.flee;

  const setTime = (seconds: number): void => {
    kit.setTime(seconds);
    const front = STATIONS.gateZ + (seconds - boreAt) * BORE_SPEED;
    bore.position.z = front;
    for (let i = 0; i < SPRAY; i++) {
      const p = plumeSeed[i] as (typeof plumeSeed)[number];
      const lift = 0.5 + 0.5 * Math.sin(seconds * 2.3 + p.phase);
      setFigure(plumes, i, p.x, BORE_HEIGHT + 8 + 10 * lift, -30 - 12 * lift, 0, [p.size * 1.5, p.size * (0.7 + 0.5 * lift), p.size]);
    }
    for (let i = 0; i < CLOUDS; i++) {
      const c = cloudSeed[i] as (typeof cloudSeed)[number];
      const x = ((((c.x + seconds * 24 + 7000) % 14000) + 14000) % 14000) - 7000;
      setFigure(clouds, i, x, c.y, c.z, 0, c.size);
    }
    for (let i = 0; i < FEEDERS; i++) {
      const f = feederSeed[i] as (typeof feederSeed)[number];
      const x = f.x + Math.sin(f.yaw) * f.pace * seconds;
      const z = f.z + Math.cos(f.yaw) * f.pace * seconds;
      const flooded = z < front + 40;
      setFigure(feeders, i, x, flooded ? -40 : groundAt(x, z) - 0.25, z, f.yaw, f.size);
    }
    for (let i = 0; i < flierSeed.length; i++) {
      const f = flierSeed[i] as (typeof flierSeed)[number];
      const a = f.phase + f.rate * seconds;
      const flap = Math.sin(seconds * 5.5 + f.phase * 7);
      setFigure(fliers, i, f.cx + Math.cos(a) * f.radius, f.y + 9 * Math.sin(a * 2.3 + f.phase), f.cz + Math.sin(a) * f.radius * f.squash, (f.rate > 0 ? 0 : Math.PI) - a, [1, flap, 1]);
    }
    for (let i = 0; i < FLEEING; i++) {
      const lead = seconds - boreAt;
      const side = (i - (FLEEING - 1) / 2) / FLEEING;
      const x = flee[0] + side * 44 - 9 * lead + 3 * Math.sin(i * 2.4);
      const z = flee[1] - 16 * ((i * 5) % 7) / 7 + 17 * lead;
      const y = 2.6 + 2.2 * ((i * 3) % 4) / 4 + 0.5 * lead;
      setFigure(fleeing, i, x, y, z, Math.atan2(-9, 17), [1.6, 1.6 * (1.2 + 1.3 * Math.sin(seconds * 9 + i * 1.9)), 1.6]);
    }
  };

  return { setTime, solo: (part) => kit.solo(part) };
}
