// The stand-ins of the Breath, from the blockout. A part keeps its stand-in until a folder lists its name in PARTS; then the stand-in is not made at all.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createBlockout, herd, terrain } from '../../../core/blockout';
import type { Vec3 } from '../../../core/cameras';
import type { Parts } from '../../../core/place';
import { stream } from '../../../core/rng';
import { DEPTH, NEAR, RAD, SEA, channelHalf, channelX, cliffHeight, cliffPoint, farGround, ground, lerp, nearLand, onRim, rimRadius, smooth, surface } from '../land';
import { BUSHES, DEAD_WADER, EXHALE, FAR_FLOCK, FEED_AT, NEAR_WADERS, RIM_WADER, RIM_WADER_DOWN_FROM, SEEDLINGS, SMALLER, SUN, footing, type Wader } from './anchors';

const WORLD = 16000;

const C = {
  rock: 0xb8ab9b,
  rockBand: 0x9c8f80,
  wall: 0x4d463e,
  wallBand: 0x5f574c,
  floor: 0x2b2725,
  hoop: 0xd9cbb2,
  slab: 0xcbbfab,
  water: 0x6c8b88,
  sheen: 0x9db0a6,
  sea: 0x7f9a95,
  seaSheen: 0xd8cdb6,
  plume: 0x7c1f2c,
  plumeBand: 0x9c2f39,
  wader: 0xe9dccb,
  tuft: 0xb4586a,
  dead: 0xcdbfae,
  vapour: 0xddd5c9,
  vapourDark: 0xc3bbb0,
  cliff: 0x403a36,
  cliffBand: 0x595149,
  cave: 0x191716,
  skyTop: 0x8b8789,
  skyHorizon: 0xdcc5ad,
  air: 0xd9c4ae,
};

function limb(from: Vec3, to: Vec3, radius: number): THREE.BufferGeometry {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const d = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(radius, radius, d.length(), 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

function waderBody(up: boolean): THREE.BufferGeometry {
  const list: THREE.BufferGeometry[] = [];
  for (const sx of [-0.24, 0.24]) for (const sz of [-0.5, 0.5]) list.push(limb([sx, 0, sz], [sx * 0.8, 2.15, sz * 0.9], 0.075));
  const trunk = new THREE.CapsuleGeometry(0.47, 1.0, 3, 8);
  trunk.rotateX(Math.PI / 2 - 0.12);
  trunk.translate(0, 2.4, 0);
  list.push(trunk);
  if (up) list.push(limb([0, 2.5, 0.7], [0, 3.25, 1.2], 0.12), limb([0, 3.25, 1.2], [0, 3.85, 1.15], 0.1));
  else list.push(limb([0, 2.45, 0.7], [0, 1.6, 1.5], 0.12), limb([0, 1.6, 1.5], [0, 0.5, 1.8], 0.1));
  return mergeGeometries(list);
}

function waderTuft(up: boolean): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(0.34, 0.75, 6);
  if (up) g.translate(0, 3.75, 1.3);
  else g.translate(0, 0.3, 1.85);
  return g;
}

const matrix = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const vec = new THREE.Vector3();
const size3 = new THREE.Vector3();

function place(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, yaw: number, pitch: number, size: number): void {
  euler.set(pitch, yaw, 0, 'YXZ');
  quat.setFromEuler(euler);
  matrix.compose(vec.set(x, y, z), quat, size3.setScalar(size));
  mesh.setMatrixAt(index, matrix);
  mesh.instanceMatrix.needsUpdate = true;
}

/** How far the breath of the shaft has come out, 0 to 1, at `t` seconds of the place. The stand-ins and the plumes' sway share it. */
export function surgeAt(t: number): number {
  const u = t - EXHALE;
  return u < 3.4 ? smooth((u - 1.5) / 1.9) : 0.06 + 0.94 * Math.exp(-(u - 3.4) / 0.9);
}

export interface StandIns {
  setTime(seconds: number): void;
  solo(part: string | null): void;
}

export function createStandIns(scene: THREE.Scene, parts: Parts, owned: ReadonlySet<string>): StandIns {
  const has = (name: string): boolean => !owned.has(name);
  const kit = createBlockout(parts);
  const ticks: ((t: number) => void)[] = [];

  if (has('sky')) {
    const sun = new THREE.Vector3(Math.sin(SUN.bearing * RAD) * Math.cos(SUN.elevation * RAD), Math.sin(SUN.elevation * RAD), -Math.cos(SUN.bearing * RAD) * Math.cos(SUN.elevation * RAD)).multiplyScalar(9000);
    const glow: THREE.Mesh[] = [];
    for (const [radius, r, g, b, push] of [
      [3000, 1.25, 1.12, 0.98, 1.06],
      [2100, 1.55, 1.34, 1.1, 1.04],
      [1300, 2.1, 1.75, 1.35, 1.02],
      [620, 3.4, 2.8, 2.1, 1.01],
      [240, 9, 8, 6.5, 1],
    ] as const) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), kit.flat(0xffffff));
      (m.material.uniforms.uColour as THREE.IUniform<THREE.Color>).value.setRGB(r, g, b);
      m.position.copy(sun).multiplyScalar(push);
      m.lookAt(0, 0, 0);
      glow.push(m);
    }
    const sky = new THREE.Group();
    sky.add(kit.sky(C.skyTop, C.skyHorizon, C.skyHorizon), ...glow);
    scene.add(parts.standIn('sky', sky));
  }

  if (has('land')) {
    const rock = kit.flat(C.rock, { band: C.rockBand, step: 0.55, amount: 0.5 });
    const land = new THREE.Group();
    land.add(new THREE.Mesh(nearLand(250), rock));
    land.add(new THREE.Mesh(terrain(WORLD, WORLD, 160, 160, farGround), rock));
    const boulderRock = kit.flat(0x4b433d, { band: 0x3d3632, step: 0.5, amount: 0.5 });
    for (const [x, z, rx, ry, rz, turn] of [
      [-45.6, 38.2, 5.5, 2.3, 3.6, 0.5],
      [-48.8, 44.6, 4, 2.6, 3, -0.3],
      [-26.5, 38.5, 4.5, 1.7, 3.2, -0.6],
      [-22.5, 36, 3.5, 1.4, 2.6, 0.2],
    ] as const) {
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), boulderRock);
      boulder.position.set(x, ground(x, z) + 0.1, z);
      boulder.scale.set(rx, ry, rz);
      boulder.rotation.y = turn;
      land.add(boulder);
    }
    scene.add(parts.standIn('land', land));
  }

  if (has('sea')) {
    const sea = new THREE.Group();
    const tide = kit.flow(C.water, C.sheen, { direction: [0.25, 0.97], speed: 1.4, scale: 0.55 });
    const sheet = new THREE.Shape([new THREE.Vector2(-NEAR / 2, -NEAR / 2), new THREE.Vector2(NEAR / 2, -NEAR / 2), new THREE.Vector2(NEAR / 2, NEAR / 2), new THREE.Vector2(-NEAR / 2, NEAR / 2)]);
    const lip: THREE.Vector2[] = [];
    for (let i = 0; i < 72; i++) lip.push(new THREE.Vector2(...onRim(-i * 5, 1.3)).multiply(new THREE.Vector2(1, -1)));
    sheet.holes.push(new THREE.Path(lip));
    const inner = new THREE.Mesh(new THREE.ShapeGeometry(sheet, 32).rotateX(-Math.PI / 2), tide);
    inner.position.y = SEA;
    sea.add(inner);
    const open = kit.flow(C.sea, C.seaSheen, { direction: [0.25, 0.97], speed: 3, scale: 18 });
    const edge = (WORLD - NEAR) / 2;
    const mid = (WORLD + NEAR) / 4;
    for (const [w, d, x, z] of [
      [WORLD, edge, 0, -mid],
      [WORLD, edge, 0, mid],
      [edge, NEAR, -mid, 0],
      [edge, NEAR, mid, 0],
    ] as const) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), open);
      m.position.set(x, SEA, z);
      sea.add(m);
    }
    scene.add(parts.standIn('sea', sea));
  }

  if (has('shaft')) {
    const shaft = new THREE.Group();
    const wallGeo = surface(96, 8, (u, v) => {
      const b = u * 2 * Math.PI;
      const r = rimRadius(b);
      const top = ground(Math.sin(b) * r * 1.002, -Math.cos(b) * r * 1.002) - 0.3;
      const rr = r - 0.4 - 2.5 * v;
      return [Math.sin(b) * rr, lerp(top, -DEPTH, v), -Math.cos(b) * rr];
    });
    shaft.add(new THREE.Mesh(wallGeo, kit.flat(C.wall, { band: C.wallBand, step: 5, amount: 0.6, side: THREE.DoubleSide })));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(42, 40).rotateX(-Math.PI / 2), kit.flat(C.floor));
    floor.position.y = -DEPTH + 1;
    shaft.add(floor);
    const dark = kit.flat(C.floor);
    const collar = kit.flat(C.slab);
    for (const [x, z, r] of SMALLER) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2), dark);
      hole.position.set(x, 1.25, z);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(r + 1.5, r + 4, 1.9, 24, 1, true), collar);
      ring.position.set(x, 0.3, z);
      shaft.add(hole, ring);
    }
    scene.add(parts.standIn('shaft', shaft));
  }

  if (has('hoops')) {
    const hoops = new THREE.Group();
    const bone = kit.flat(C.hoop, { band: 0xbba98c, step: 1.4, amount: 0.5 });
    const arcs: [number, number, number, number, number][] = [
      [-2.4, 28.4, -100, -12, 1.8],
      [-2.6, 28.4, -2, 78, 1.8],
      [-9, 27.4, -64, 30, 1.8],
      [-9.3, 27.4, 42, 96, 1.7],
      [-15.5, 26.4, -118, 40, 1.7],
      [-22, 25.4, -40, 110, 1.7],
      [-29, 24.4, -130, 60, 1.6],
      [-37, 23.4, -70, 120, 1.6],
    ];
    for (const [y, r, from, to, thick] of arcs) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const b = lerp(from, to, i / 24) * RAD;
        points.push(new THREE.Vector3(Math.sin(b) * r, y + 0.5 * Math.sin(i * 0.9 + y), -Math.cos(b) * r));
      }
      hoops.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, thick, 6), bone));
    }
    scene.add(parts.standIn('hoops', hoops));
  }

  if (has('slabs')) {
    const slabs = new THREE.Group();
    const stone = kit.flat(C.slab, { band: 0xa99c88, step: 1.6, amount: 0.5 });
    const rs = stream('breath-slabs');
    for (let i = 0; i < 12; i++) {
      const k = i / 11;
      const b = (92 + 44 * rs.next()) * RAD;
      const r = lerp(36, 9, k) + rs.range(-2, 2);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(rs.range(8, 14), rs.range(2, 3.4), rs.range(5.5, 9)), stone);
      slab.position.set(Math.sin(b) * r, lerp(-0.5, -24, k) + rs.range(-1, 1), -Math.cos(b) * r);
      slab.rotation.set(rs.range(-0.5, 0.5), rs.range(0, 3), rs.range(-0.55, 0.55));
      slabs.add(slab);
    }
    for (const [x, y, z, w, d, yaw, lean] of [
      [8, -8, -13, 15, 9, 0.5, 0.55],
      [15, -11.5, -6, 12, 8, 1.3, -0.5],
      [18, -16, 2, 13, 9, 2.2, 0.45],
      [4, -15, -7, 9, 7, 0.2, -0.35],
    ] as const) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 3.6, d), stone);
      slab.position.set(x, y, z);
      slab.rotation.set(lean * 0.6, yaw, lean);
      slabs.add(slab);
    }
    const pile = new THREE.Mesh(new THREE.ConeGeometry(17, 48, 9), kit.flat(0x8a7f71, { band: 0x9c9080, step: 3, amount: 0.6 }));
    pile.position.set(14, -36, -4);
    slabs.add(pile);
    scene.add(parts.standIn('slabs', slabs));
  }

  if (has('cliff')) {
    const cliffGeo = surface(130, 36, (u, v) => {
      const s = lerp(-4200, 6200, u);
      const p = lerp(-700, 1300, v);
      const [x, z] = cliffPoint(s, p);
      const taper = smooth((s + 4200) / 700) * smooth((6200 - s) / 700);
      return [x, cliffHeight(s, p) * taper + 1.5 - 5 * (1 - smooth((p + 700) / 110)), z];
    });
    const cliff = new THREE.Group();
    cliff.add(new THREE.Mesh(cliffGeo, kit.flat(C.cliff, { band: C.cliffBand, step: 46, amount: 0.7, side: THREE.DoubleSide })));
    const cave = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), kit.flat(C.cave));
    const mouth = cliffPoint(0, -84);
    cave.position.set(mouth[0], 232, mouth[1]);
    cave.scale.set(400, 96, 70);
    cave.rotation.y = Math.atan2(0.935, -0.354);
    cliff.add(cave);
    scene.add(parts.standIn('cliff', cliff));
  }

  if (has('fog')) {
    const fog = new THREE.Group();
    const pour = surface(24, 12, (u, v) => {
      const s = lerp(-330, 420, u) + 620 * v;
      const p = lerp(-150, -900, v);
      const [x, z] = cliffPoint(s, p);
      return [x, cliffHeight(s, p) + 14 + 46 * Math.sin(Math.PI * u) * (1 - 0.5 * v), z];
    });
    fog.add(new THREE.Mesh(pour, kit.flow(C.vapour, C.vapourDark, { direction: [-0.97, 0.05], speed: 16, scale: 46, side: THREE.DoubleSide })));
    const bankMat = kit.flow(C.vapour, 0xcfc4b6, { direction: [1, 0.2], speed: 7, scale: 120 });
    const banks: THREE.Mesh[] = [];
    for (const [x, z, rx, ry, rz] of [
      [-2300, -1500, 1100, 70, 520],
      [-1500, -2900, 900, 90, 600],
      [-3200, 300, 800, 60, 900],
    ] as const) {
      const bank = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), bankMat);
      bank.position.set(x, 4, z);
      bank.scale.set(rx, ry, rz);
      banks.push(bank);
      fog.add(bank);
    }
    scene.add(parts.standIn('fog', fog));
    ticks.push((t) => {
      banks.forEach((bank, i) => {
        bank.position.y = 4 + 6 * Math.sin(t * 0.25 + i * 2);
        bank.scale.y = [70, 90, 60][i]! * (1 + 0.08 * Math.sin(t * 0.3 + i));
      });
    });
  }

  const dome = new THREE.SphereGeometry(1, 28, 14);
  const heavy = kit.flow(C.vapour, C.vapourDark, { direction: [-0.94, 0.34], speed: 2.4, scale: 2.6 });

  if (has('vapour')) {
    const vapour = new THREE.Group();
    const fill = new THREE.Mesh(dome, heavy);
    const tongue = new THREE.Mesh(dome, heavy);
    const pool = new THREE.Mesh(dome, heavy);
    vapour.add(fill, tongue, pool);
    const column = kit.flow(0xfff3df, 0xf1e2cc, { direction: [0.9, 0.3], speed: 3, scale: 9 });
    const plumes: THREE.Mesh[][] = SMALLER.map(([x, z, r, tall]) => {
      const puffs: THREE.Mesh[] = [];
      for (let i = 0; i < 3; i++) {
        const puff = new THREE.Mesh(dome, column);
        puff.userData.at = [x, z, r, i, tall];
        puffs.push(puff);
        vapour.add(puff);
      }
      return puffs;
    });
    scene.add(parts.standIn('vapour', vapour));
    ticks.push((t) => {
      const u = t - EXHALE;
      const surge = surgeAt(t);
      const low = smooth(u / 1.3) * (1 - 0.8 * smooth((u - 3.4) / 1.5));
      const sigh = Math.sin(t * 0.9);
      fill.position.set(-24, -33, 6);
      fill.scale.set(5, 19 + 1.2 * sigh + 6 * low, 7);
      tongue.position.set(-26, -4 + 0.5 * surge, -8);
      tongue.scale.set(4, 2.6 + 0.4 * sigh + 0.6 * surge, 5);
      pool.position.set(-35.5 + 0.6 * sigh, 0.2, -14);
      pool.scale.set(5.5, 1 + 0.1 * sigh, 8);
      plumes.forEach((puffs) => {
        puffs.forEach((puff) => {
          const [x, z, r, i, tall] = puff.userData.at as [number, number, number, number, number];
          const swell = 1 + 0.12 * Math.sin(t * 0.7 + i * 2 + x);
          const lift = r * tall * (0.5 + 1.25 * i);
          puff.position.set(x + r * 0.8 * i * (1 + 0.1 * Math.sin(t * 0.5 + i)), 1 + lift * swell, z - r * 0.2 * i);
          puff.scale.set(r * (0.9 + 0.4 * i) * swell, r * tall * (0.9 + 0.25 * i), r * (0.9 + 0.4 * i));
        });
      });
    });
  }

  if (has('exhale')) {
    const exhale = new THREE.Group();
    const breath = kit.flow(0xe6dfd4, C.vapour, { direction: [-0.9, 0.44], speed: 5, scale: 3.4 });
    const puffs = Array.from({ length: 10 }, (_, i) => new THREE.Mesh(dome, i % 2 ? heavy : breath));
    const apron = new THREE.Mesh(dome, breath);
    const cap = new THREE.Mesh(dome, breath);
    const pooled = new THREE.Mesh(dome, breath);
    exhale.add(...puffs, apron, cap, pooled);
    scene.add(parts.standIn('exhale', exhale));
    ticks.push((t) => {
      const u = t - EXHALE;
      const surge = surgeAt(t);
      const grow = smooth(surge * 6);
      const spread = smooth((u - 1.8) / 7);
      const body1 = smooth((u - 2.6) / 1.8);
      const top = -9 + 31 * surge;
      puffs.forEach((puff, i) => {
        const f = (i / puffs.length + t * 0.11) % 1;
        const turn = i * 2.4 + t * 0.3;
        const wide = 1 + 3.2 * f;
        const r = (1.2 + 1.8 * f) * Math.sin(Math.PI * f) ** 0.6 * grow * (0.6 + 0.4 * surge) + 0.001;
        puff.position.set(-21 + Math.cos(turn) * wide - 7 * f * f * surge, -12 + (top + 12) * f, -9 + Math.sin(turn) * wide);
        puff.scale.set(r, r, r);
      });
      cap.position.set(-27 - 5 * surge, -3 + 5 * surge - 2 * spread, -14);
      cap.scale.set((3.5 + 1.5 * surge) * grow + 0.001, (1.6 + 1.2 * surge) * grow + 0.001, (3 + 1.5 * surge) * grow + 0.001);
      apron.position.set(-36, 0.3 - 3 * (1 - body1), -10);
      apron.scale.set(5.5, 0.05 + 0.9 * body1 - 0.4 * spread, 4.5);
      pooled.position.set(-47, -0.1 - 3 * (1 - body1), -13 + 17 * spread);
      pooled.scale.set(5, 0.05 + 0.8 * smooth((u - 3.4) / 2.5), 6 + 5 * spread);
    });
  }

  if (has('gill-plumes')) {
    const weed = kit.flat(C.plume, { band: C.plumeBand, step: 0.9, amount: 0.6 });
    const frondGeo = new THREE.ConeGeometry(0.12, 1, 5).rotateX(Math.PI).translate(0, 0.5, 0);
    const fronds: { mesh: THREE.Mesh; tilt: number; phase: number }[] = [];
    const gill = new THREE.Group();
    const rp = stream('breath-plumes');
    const root = (x: number, z: number, height: number, lean: number): void => {
      const count = height > 3 ? 22 : 10;
      for (let i = 0; i < count; i++) {
        const k = ((i * 0.618) % 1) - 0.5;
        const mesh = new THREE.Mesh(frondGeo, weed);
        const length = height * (1 - 0.5 * Math.abs(k)) * rp.range(0.7, 1.1);
        mesh.scale.set(length * 0.5, length, length * 0.5);
        mesh.position.set(x, ground(x, z) - 0.2, z);
        mesh.rotation.order = 'YXZ';
        mesh.rotation.y = lean + k * 3.4 + rp.range(-0.2, 0.2);
        const tilt = 0.3 + 1.5 * Math.abs(k) * rp.range(0.5, 1) + rp.range(0, 0.2);
        fronds.push({ mesh, tilt, phase: rp.range(0, 6.28) });
        gill.add(mesh);
      }
    };
    for (const [bearing, out, height] of BUSHES) {
      const [x, z] = onRim(bearing, out);
      root(x, z, height, Math.atan2(-x, -z));
    }
    for (const [x, z, height] of SEEDLINGS) root(x, z, height, Math.atan2(-x, -z));
    scene.add(parts.standIn('gill-plumes', gill));
    ticks.push((t) => {
      const surge = surgeAt(t);
      for (const f of fronds) f.mesh.rotation.x = f.tilt + 0.06 * Math.sin(t * 1.3 + f.phase) + 0.03 * Math.sin(t * 2.9 + f.phase * 1.7) - 0.3 * surge * (0.6 + 0.4 * Math.sin(t * 5 + f.phase));
    });
  }

  if (has('waders')) {
    const pale = kit.flat(C.wader, { band: 0xd6c4b4, step: 0.5, amount: 0.5 });
    const pink = kit.flat(C.tuft);
    const rw = stream('breath-waders');
    const flock: Wader[] = [...NEAR_WADERS];
    for (let i = 0; i < FAR_FLOCK.count; i++) {
      const b = rw.range(FAR_FLOCK.bearing[0], FAR_FLOCK.bearing[1]) * RAD;
      const d = rw.range(FAR_FLOCK.distance[0], FAR_FLOCK.distance[1]);
      flock.push({ x: Math.sin(b) * d, z: -Math.cos(b) * d, heading: rw.range(0, 360), speed: rw.range(0.15, 0.45), size: rw.range(0.9, 1.12), up: rw.next() < 0.35, phase: rw.range(0, 6.28) });
    }
    const total = flock.length + 1;
    const herds = {
      up: herd(waderBody(true), pale, total),
      down: herd(waderBody(false), pale, total),
      upTuft: herd(waderTuft(true), pink, total),
      downTuft: herd(waderTuft(false), pink, total),
    };
    const waders = new THREE.Group();
    waders.add(herds.up, herds.down, herds.upTuft, herds.downTuft);
    scene.add(parts.standIn('waders', waders));
    const setWader = (i: number, w: Wader, t: number, up: boolean): void => {
      const h = w.heading * RAD;
      const walk = w.speed * (t - FEED_AT) + 0.25 * Math.sin(t * 0.4 + w.phase);
      let x = w.x + Math.sin(h) * walk;
      const z = w.z - Math.cos(h) * walk;
      if (i < 9) x = Math.max(channelX(z) - channelHalf(z) + 1.5, Math.min(channelX(z) + channelHalf(z) - 2.5, x));
      const y = footing(x, z);
      const yaw = Math.PI - h + 0.08 * Math.sin(t * 0.5 + w.phase * 2);
      const dip = up ? 0.03 * Math.sin(t * 0.8 + w.phase) : 0.07 * Math.sin(t * 1.7 + w.phase);
      place(up ? herds.up : herds.down, i, x, y, z, yaw, dip, w.size);
      place(up ? herds.upTuft : herds.downTuft, i, x, y, z, yaw, dip, w.size);
      place(up ? herds.down : herds.up, i, 0, -500, 0, 0, 0, 0.001);
      place(up ? herds.downTuft : herds.upTuft, i, 0, -500, 0, 0, 0, 0.001);
    };
    ticks.push((t) => {
      flock.forEach((w, i) => setWader(i, w, t, w.up));
      setWader(flock.length, RIM_WADER, t, t < RIM_WADER_DOWN_FROM);
    });
  }

  if (has('dead-wader')) {
    const pink = kit.flat(C.tuft);
    const corpse = new THREE.Group();
    const fallen = mergeGeometries([
      new THREE.CapsuleGeometry(0.47, 1.0, 3, 8).rotateX(Math.PI / 2).scale(1, 0.75, 1).translate(0, 0.36, 0),
      limb([0, 0.3, 0.7], [-0.9, 0.14, 1.5], 0.12),
      limb([-0.9, 0.14, 1.5], [-2.3, 0.12, 1.3], 0.1),
      limb([0.2, 0.3, 0.4], [2.2, 0.1, 0.9], 0.08),
      limb([0.2, 0.3, 0.3], [2.3, 0.1, 0.2], 0.08),
      limb([0.2, 0.3, -0.4], [2.1, 0.1, -0.2], 0.08),
      limb([0.2, 0.3, -0.5], [1.9, 0.1, -1.1], 0.08),
    ]);
    const body = new THREE.Mesh(fallen, kit.flat(C.dead, { band: 0xb5a594, step: 0.3, amount: 0.5 }));
    const fan = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.3, 6).rotateZ(-Math.PI / 2).scale(1, 0.25, 1).translate(-2.9, 0.1, 1.25), pink);
    corpse.add(body, fan);
    corpse.position.set(DEAD_WADER.x, ground(DEAD_WADER.x, DEAD_WADER.z) - 0.02, DEAD_WADER.z);
    corpse.rotation.y = DEAD_WADER.turn;
    corpse.scale.setScalar(DEAD_WADER.size);
    scene.add(parts.standIn('dead-wader', corpse));
  }

  // The blockout's own fog on its own materials. Once the air folder draws the air, the stand-ins that are left keep a thin one so they sit in the place.
  if (has('air')) kit.air(C.air, 0.00022);
  else kit.setAir(C.air, 0.00022);

  return {
    setTime: (seconds) => {
      kit.setTime(seconds);
      for (const tick of ticks) tick(seconds);
    },
    solo: (part) => kit.solo(part),
  };
}
