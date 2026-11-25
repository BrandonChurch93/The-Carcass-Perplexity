// Origin: the foot of the first spire, on its axis. The ridge runs toward +x (down the spine, called north here), the storm stands on -z, the cloud sea and the last light lie on +z. The world is about 12 km by 8 km.
import * as THREE from 'three';
import { createBlockout, herd, setFigure, terrain } from '../../core/blockout';
import type { Move, Pose, Vec3 } from '../../core/cameras';
import { through } from '../../core/cameras';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { neutralLook } from '../../core/stage';
import { stream } from '../../core/rng';
import { cut, eventsOf, keyPart, shotById } from '../../film/cut';
import { CANAL_L, FIRST, FLARE, FLOOR, MOUTH_S, S_MAX, S_MIN, THROAT, crest, fin, finEdge, first, flare, frameAt, ground, heightAbove, locate, on, spires, tipOf, world, type Spire } from './ridge';

const RAD = Math.PI / 180;
const WIND: Vec3 = [0.2, 0, 0.98];
const AIR = 0x5b6076;
const AIR_FLASH = 0x6f6d94;
const DENSITY = 0.00028;
const STRIKE_FRAMES = 6;

const heading = (a: Vec3, b: Vec3): number => Math.atan2(b[2] - a[2], b[0] - a[0]) / RAD;
const pitchTo = (a: Vec3, b: Vec3): number => Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2])) / RAD;
const step = (p: Vec3, h: number, dist: number, up = 0): Vec3 => [p[0] + Math.cos(h * RAD) * dist, p[1] + up, p[2] + Math.sin(h * RAD) * dist];

function aimed(position: Vec3, h: number, pitch: number, fov: number, reach = 600): Pose {
  const c = Math.cos(pitch * RAD);
  return { position, aim: [position[0] + Math.cos(h * RAD) * c * reach, position[1] + Math.sin(pitch * RAD) * reach, position[2] + Math.sin(h * RAD) * c * reach], fov };
}

const trail = (s: number): number => 2.2 * Math.sin(s / 31) * (1 - Math.min(1, Math.max(0, (s - MOUTH_S + 160) / 150))) + CANAL_L * Math.min(1, Math.max(0, (s - MOUTH_S + 160) / 150)) ** 2;
const spire = (n: number): Spire => spires[FIRST + n - 1] as Spire;
const tube = (d: number, l: number, h: number): Vec3 => world(MOUTH_S + d, CANAL_L + l, FLOOR + h);
const raised = (p: Vec3, up: number): Vec3 => [p[0], p[1] - heightAbove(p) + up, p[2]];
const MOUTH = tube(0, 0, 8);

const E_S = first.s - 552;
const standE = on(E_S, 0, 8);
const viewE = heading(standE, [first.x, 0, first.z]) + 17;
const keyEstablishing = aimed(standE, viewE, 5.6, 50);
const establishingMove: Move = [
  { at: 0, pose: aimed(on(E_S - 150, -2, 34), viewE - 5, 1.2, 50) },
  { at: 0.34, pose: aimed(on(E_S - 62, -1, 17), viewE - 2, 3.4, 50) },
  { at: keyPart(shotById('spine-01')), pose: keyEstablishing },
  { at: 1, pose: aimed(on(E_S + 44, 2, 6), viewE + 1.5, 5, 50) },
];

const KITE_FOV = 14;
const kiteEdge = finEdge(first, 0.74, 1);
const kiteBack = heading(tipOf(spire(2)), kiteEdge) - 4.6;
const kiteFlat = step(kiteEdge, kiteBack, 200);
const kiteStand: Vec3 = [kiteFlat[0], kiteEdge[1] - 200 * Math.tan(3.5 * RAD), kiteFlat[2]];
const keyKites = aimed(kiteStand, heading(kiteStand, kiteEdge) + 2, 3.5, KITE_FOV);

const CARCASS = on(first.s - 655, 1.5, 0);
const CARCASS_FOV = 48;
const carcassView = heading(CARCASS, MOUTH) + 15;
const carcassStand = raised(step(CARCASS, carcassView + 190, 2.1), 0.7);
const keyCarcass = aimed(carcassStand, carcassView, -7.4, CARCASS_FOV, 40);
const carcassMove: Move = [
  { at: 0, pose: aimed(raised(step(carcassStand, carcassView + 176, 10), 3), carcassView - 2.5, -10, CARCASS_FOV, 40) },
  { at: keyPart(shotById('spine-03')), pose: keyCarcass },
  { at: 1, pose: aimed(raised(step(carcassStand, carcassView + 10, 0.7), 0.66), carcassView + 0.6, -7.1, CARCASS_FOV, 40) },
];

const STRIKE_FOV = 10;
const STRIKE_REACH = 1650;
const strikeTip = tipOf(spire(3));
const strikePass = world(spire(2).s, 20, 0);
const strikeBack = heading(strikeTip, strikePass);
const strikeFlat = step(strikeTip, strikeBack, STRIKE_REACH);
const strikeStand: Vec3 = [strikeFlat[0], strikeTip[1] - STRIKE_REACH * Math.tan(4.2 * RAD), strikeFlat[2]];
const keyStrike = aimed(strikeStand, heading(strikeStand, strikeTip) + 2.5, 1.8, STRIKE_FOV, 1700);

const canalStand = tube(FLARE + 9.5, -0.6, 0.7);
const canalOut = tube(FLARE, 0, 2.2);
const keyCanal = aimed(canalStand, heading(canalStand, canalOut) - 16, 0, 54, 30);
const canalStart = tube(FLARE - 10, -0.8, 1.6);
const canalEnd = tube(FLARE + 27, -0.4, 1.1);

const canalMove: Move = [
  { at: 0, pose: aimed(canalStart, heading(canalStart, tube(0, 0, 2)) - 6, 1.5, 54, 30) },
  { at: keyPart(shotById('spine-05')), pose: keyCanal },
  { at: 1, pose: aimed(canalEnd, heading(canalEnd, canalOut) - 7, 0.5, 54, 30) },
];

const shots: Record<string, Move> = {
  'spine-01': establishingMove,
  'spine-02': through(keyKites, keyPart(shotById('spine-02')), { right: -13, forward: -16, up: -3 }, { right: 13, forward: 16, up: 3 }),
  'spine-03': carcassMove,
  'spine-04': through(keyStrike, keyPart(shotById('spine-04')), { forward: -6, right: -1 }, { forward: 170, right: 26, up: 8 }),
  'spine-05': canalMove,
};

interface Bolt {
  group: THREE.Group;
  dome: THREE.Mesh;
  from: number;
}

function ribbonCount(n: number): number {
  if (n === FIRST) return 11;
  if (n === FIRST - 1) return 7;
  if (n === FIRST + 1) return 3;
  if (n === FIRST + 2) return 7;
  return 3;
}

const place: PlaceModule = {
  unit: 'spine',
  shots,
  heightOf: (pose) => heightAbove(pose.position),
  create: (): Place => {
    const parts = new Parts('spine');
    const kit = createBlockout(parts);
    const scene = new THREE.Scene();
    const rng = stream('spine-blockout');

    const sky = new THREE.Group();
    sky.add(kit.sky(0x1f1f2c, 0x6c7187, 0x4c5266));
    const glow = kit.sky(0x77758a, 0xf08f3c, 0xb4764a);
    glow.geometry = new THREE.SphereGeometry(1, 32, 3, 4 * RAD, 172 * RAD, 88.8 * RAD, 1.4 * RAD);
    glow.renderOrder = -9;
    sky.add(glow);
    scene.add(parts.standIn('sky', sky));

    const land = new THREE.Group();
    const snow = kit.flat(0xb4bccb, { band: 0x929aad, step: 28 });
    const far = kit.flat(0xa7afc0, { band: 0x878fa3, step: 60 });
    const sList: number[] = [];
    for (let s = S_MIN + 40; s < S_MAX - 40; ) {
      sList.push(s);
      s += s > MOUTH_S - 30 && s < MOUTH_S + FLARE + 20 ? 2.5 : 10;
    }
    const half = [0, 2, 5, 9, 14, 20, 28, 38, 50, 65, 85, 110, 140, 180, 230, 290, 360, 440, 520];
    const lee = [0, 2, 5, 9, 14, 19, 22, 24, 26, 28, 31, 34, 38, 42, 46, 50, 54, 58, 61, 64, 66, 68, 70, 73, 78, 85, 110, 140, 180, 230, 290, 360, 440, 520];
    const lList = [...half.slice(1).reverse().map((v) => -v), ...lee];
    const rows = lList.length;
    const strip = new Float32Array(sList.length * rows * 3);
    sList.forEach((s, i) => {
      lList.forEach((l, j) => {
        const edge = j === 0 || j === rows - 1 ? 45 : 0;
        const p = world(s, l, ground(s, l) - edge);
        strip.set(p, (i * rows + j) * 3);
      });
    });
    const index: number[] = [];
    for (let i = 0; i < sList.length - 1; i++) {
      for (let j = 0; j < rows - 1; j++) {
        const a = i * rows + j;
        const b = a + 1;
        const c = a + rows;
        const d = c + 1;
        index.push(a, b, c, b, d, c);
      }
    }
    const stripGeometry = new THREE.BufferGeometry();
    stripGeometry.setAttribute('position', new THREE.BufferAttribute(strip, 3));
    stripGeometry.setIndex(index);
    stripGeometry.computeBoundingSphere();
    land.add(new THREE.Mesh(stripGeometry, snow));
    const flank = (x: number, z: number): number => {
      const at = locate(x, z);
      return ground(at.s, at.l) - 22 - (Math.abs(at.l) < 480 ? 30 : 0);
    };
    land.add(new THREE.Mesh(terrain(12400, 8000, 200, 130, flank, [1600, 1300]), far));

    const rock = kit.flat(0x7b776f, { band: 0x8d8f98, step: 34, amount: 0.6, side: THREE.DoubleSide });
    const burned = kit.flat(0x15151b, { side: THREE.DoubleSide });
    const RINGS = 20;
    const AROUND = 18;
    for (const sp of spires) {
      const f = frameAt(sp.s);
      const pos: number[] = [];
      for (let r = 0; r <= RINGS; r++) {
        const t = r / RINGS;
        const p = fin(sp, t);
        for (let a = 0; a < AROUND; a++) {
          const ang = (a / AROUND) * Math.PI * 2;
          const l = p.centre + Math.cos(ang) * p.half;
          const along = Math.sin(ang) * p.thick;
          pos.push(sp.x + f.nx * l + f.tx * along, p.y, sp.z + f.nz * l + f.tz * along);
        }
      }
      const split = RINGS - 2;
      const make = (from: number, to: number): THREE.BufferGeometry => {
        const idx: number[] = [];
        for (let r = from; r < to; r++) {
          for (let a = 0; a < AROUND; a++) {
            const p0 = r * AROUND + a;
            const p1 = r * AROUND + ((a + 1) % AROUND);
            idx.push(p0, p0 + AROUND, p1, p1, p0 + AROUND, p1 + AROUND);
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        g.computeBoundingSphere();
        return g;
      };
      const body = new THREE.Mesh(make(0, split), rock);
      const cap = new THREE.Mesh(make(split, RINGS), burned);
      land.add(body, cap);
    }

    const wall = kit.flat(0x15161d, { band: 0x1d1e28, step: 1.3, side: THREE.DoubleSide });
    const hood = kit.flat(0x7b776f, { band: 0x9aa0ae, step: 9, side: THREE.DoubleSide });
    const ice = kit.flat(0x8f9bb5, { band: 0x7f8aa6, step: 0.5, side: THREE.DoubleSide });
    const dList: number[] = [];
    for (let d = -5; d <= 120; d += d < FLARE + 30 ? 2.5 : 10) dList.push(d);
    const SEG = 20;
    const shell = (grow: number, lip: boolean): THREE.BufferGeometry => {
      const pos: number[] = [];
      const ring = (d: number, extra: number): void => {
        const f = frameAt(MOUTH_S + d);
        const r = flare(d) + extra;
        const cy = FLOOR + 0.62 * flare(d);
        for (let a = 0; a <= SEG; a++) {
          const ang = (a / SEG) * Math.PI * 2;
          const l = CANAL_L + Math.cos(ang) * r;
          pos.push(f.x + f.nx * l, cy + Math.sin(ang) * r, f.z + f.nz * l);
        }
      };
      let count = 0;
      if (lip) {
        ring(dList[0] as number, 0);
        count++;
      }
      for (const d of dList) {
        if (lip && d > FLARE + 8) break;
        ring(d, grow);
        count++;
      }
      const idx: number[] = [];
      for (let r = 0; r < count - 1; r++) {
        for (let a = 0; a < SEG; a++) {
          const p0 = r * (SEG + 1) + a;
          idx.push(p0, p0 + SEG + 1, p0 + 1, p0 + 1, p0 + SEG + 1, p0 + SEG + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeBoundingSphere();
      return g;
    };
    land.add(new THREE.Mesh(shell(0, false), wall), new THREE.Mesh(shell(5, true), hood));
    const floorPos: number[] = [];
    const floorIdx: number[] = [];
    dList.forEach((d, i) => {
      const f = frameAt(MOUTH_S + d);
      const w = 0.79 * flare(d);
      floorPos.push(f.x + f.nx * (CANAL_L - w), FLOOR + 0.03, f.z + f.nz * (CANAL_L - w), f.x + f.nx * (CANAL_L + w), FLOOR + 0.03, f.z + f.nz * (CANAL_L + w));
      if (i > 0) floorIdx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i - 1, 2 * i + 1, 2 * i);
    });
    const floorGeometry = new THREE.BufferGeometry();
    floorGeometry.setAttribute('position', new THREE.Float32BufferAttribute(floorPos, 3));
    floorGeometry.setIndex(floorIdx);
    floorGeometry.computeBoundingSphere();
    land.add(new THREE.Mesh(floorGeometry, ice));
    const endCap = new THREE.Mesh(new THREE.CircleGeometry(THROAT + 1, 12), wall);
    endCap.position.set(...tube(119, 0, 2));
    endCap.lookAt(...tube(0, 0, 2));
    land.add(endCap);

    const TRACKS = 405;
    const tracks = herd(new THREE.BoxGeometry(0.5, 0.12, 0.34), kit.flat(0x7c859b), TRACKS);
    for (let i = 0; i < TRACKS; i++) {
      const s = first.s - 653 + i * 1.34;
      const l = trail(s) + (i % 2 ? 0.28 : -0.28);
      const p = on(s, l, 0.05);
      setFigure(tracks, i, p[0], p[1], p[2], 0);
    }
    land.add(tracks);
    scene.add(parts.standIn('land', land));

    const sea = new THREE.Mesh(new THREE.PlaneGeometry(96000, 96000, 1, 1).rotateX(-Math.PI / 2), kit.flow(0x8b90a2, 0x6f7589, { direction: [WIND[0], WIND[2]], speed: 26, scale: 520 }));
    sea.position.set(1600, -2000, 1300);
    scene.add(parts.standIn('cloud-sea', sea));

    const cloud = new THREE.Group();
    const ball = new THREE.SphereGeometry(1, 14, 9);
    const WALL = 96;
    const bank = herd(ball, kit.flat(0x232336, { band: 0x2d2e45, step: 130 }), WALL);
    const bankAt: { s: number; l: number; y: number; r: number; phase: number }[] = [];
    for (let i = 0; i < WALL; i++) {
      const layer = i % 3;
      bankAt.push({ s: S_MIN + 300 + (i / WALL) * (S_MAX - S_MIN - 3000) + rng.range(-120, 120), l: -620 - layer * 420 - rng.range(0, 220), y: -700 + layer * 620 + rng.range(-200, 260), r: 420 + layer * 150 + rng.range(0, 220), phase: rng.range(0, 6.28) });
    }
    cloud.add(bank);
    const POUR = 44;
    const pour = herd(ball, kit.flat(0x7c8198, { band: 0x8a8fa5, step: 40 }), POUR);
    const pourAt: { s: number; l: number; r: number; rise: number }[] = [];
    const saddles = [FIRST - 2, FIRST, FIRST + 1, FIRST + 2, FIRST + 3];
    for (let i = 0; i < POUR; i++) {
      const k = saddles[i % saddles.length] as number;
      const a = spires[k] as Spire;
      const b = spires[k + 1] as Spire;
      pourAt.push({ s: a.s + (b.s - a.s) * rng.range(0.3, 0.58), l: rng.range(0, 1), r: rng.range(55, 120), rise: rng.range(0.1, 0.5) });
    }
    cloud.add(pour);
    const HAIL = 420;
    const hailGeometry = new THREE.BoxGeometry(46, 1.2, 1.2).rotateZ(-73 * RAD).rotateY(-Math.atan2(WIND[2], WIND[0]));
    const hail = herd(hailGeometry, kit.flat(0x8a8fa8), HAIL);
    const hailAt: { x: number; z: number; phase: number }[] = [];
    for (let i = 0; i < HAIL; i++) {
      const p = world(rng.range(first.s - 1000, first.s + 2700), -rng.range(260, 1000), 0);
      hailAt.push({ x: p[0], z: p[2], phase: rng.next() });
    }
    cloud.add(hail);
    scene.add(parts.standIn('cloud', cloud));

    const DRIFT = 520;
    const drift = herd(new THREE.BoxGeometry(7, 0.16, 0.5), kit.flat(0xc8cfdd), DRIFT);
    const driftAt: { s: number; l: number; lift: number; size: number; yaw: number }[] = [];
    for (let i = 0; i < DRIFT; i++) {
      const nearField = i < 300;
      let s = nearField ? rng.range(first.s - 860, first.s + 260) : rng.range(first.s + 260, first.s + 3000);
      if (s > MOUTH_S - 14 && s < MOUTH_S + FLARE + 8) s += FLARE + 40;
      const f = frameAt(s);
      driftAt.push({ s, l: rng.next(), lift: rng.range(0.6, 7), size: nearField ? rng.range(0.25, 0.7) : rng.range(2.5, 5), yaw: Math.atan2(-f.nz, f.nx) });
    }
    scene.add(parts.standIn('spindrift', drift));

    const SEGMENTS = 22;
    const ribbons: { anchor: Vec3; length: number; width: number; phase: number; wave: number; sag: number }[] = [];
    spires.forEach((sp, n) => {
      const count = ribbonCount(n);
      for (let i = 0; i < count; i++) {
        const near = n === FIRST;
        const low = n === FIRST + 1 ? 0.42 : near ? 0.66 : 0.6;
        const high = n === FIRST + 1 ? 0.55 : 0.975;
        const t = low + (high - low) * ((i + rng.range(0.15, 0.85)) / count);
        const reach = near ? 1 : n === FIRST + 2 ? 1.25 : 0.8;
        ribbons.push({ anchor: finEdge(sp, t, 0.92, rng.range(-0.6, 0.6)), length: rng.range(110, 230) * reach, width: near ? rng.range(2.2, 5) : rng.range(6, 10), phase: rng.range(0, 6.28), wave: rng.range(1.2, 2.2), sag: n === FIRST + 2 ? rng.range(0.1, 0.2) : rng.range(0.01, 0.06) });
      }
    });
    const ribbonPos = new Float32Array(ribbons.length * (SEGMENTS + 1) * 2 * 3);
    const ribbonIdx: number[] = [];
    ribbons.forEach((_, r) => {
      const base = r * (SEGMENTS + 1) * 2;
      for (let q = 0; q < SEGMENTS; q++) {
        const a = base + q * 2;
        ribbonIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const ribbonGeometry = new THREE.BufferGeometry();
    const ribbonAttribute = new THREE.BufferAttribute(ribbonPos, 3);
    ribbonGeometry.setAttribute('position', ribbonAttribute);
    ribbonGeometry.setIndex(ribbonIdx);
    const kites = new THREE.Mesh(ribbonGeometry, kit.flat(0xb9acd9, { side: THREE.DoubleSide }));
    kites.frustumCulled = false;
    const knobs = herd(new THREE.SphereGeometry(1, 7, 5), kit.flat(0x2b2523), ribbons.length);
    ribbons.forEach((rb, i) => setFigure(knobs, i, rb.anchor[0], rb.anchor[1], rb.anchor[2], 0, rb.width * 0.8));
    scene.add(parts.standIn('tether-kites', kites, knobs));
    scene.add(knobs);
    const side: Vec3 = [-WIND[2], 0, WIND[0]];
    const streamRibbons = (time: number): void => {
      ribbons.forEach((rb, r) => {
        for (let q = 0; q <= SEGMENTS; q++) {
          const u = q / SEGMENTS;
          const along = u * rb.length;
          const lift = -rb.sag * rb.length * u * u + 0.055 * rb.length * u * Math.sin(u * rb.wave * 6.28 - time * 2.6 + rb.phase);
          const sway = 0.04 * rb.length * u * Math.sin(u * rb.wave * 4.1 - time * 2.1 + rb.phase * 1.7);
          const twist = 0.55 * Math.sin(u * 5 - time * 3.1 + rb.phase);
          const w = 0.5 * rb.width * (0.08 + 0.92 * Math.min(1, u / 0.16)) * (1 - 0.45 * u * u * u);
          const cx = rb.anchor[0] + WIND[0] * along + side[0] * sway;
          const cy = rb.anchor[1] + lift;
          const cz = rb.anchor[2] + WIND[2] * along + side[2] * sway;
          const wx = Math.sin(twist) * side[0] * w;
          const wy = Math.cos(twist) * w;
          const wz = Math.sin(twist) * side[2] * w;
          const o = (r * (SEGMENTS + 1) + q) * 6;
          ribbonPos[o] = cx + wx;
          ribbonPos[o + 1] = cy + wy;
          ribbonPos[o + 2] = cz + wz;
          ribbonPos[o + 3] = cx - wx;
          ribbonPos[o + 4] = cy - wy;
          ribbonPos[o + 5] = cz - wz;
        }
      });
      ribbonAttribute.needsUpdate = true;
    };

    const runners = new THREE.Group();
    const HERD = 5;
    const CROSSING = 4;
    const body = new THREE.CapsuleGeometry(0.42, 0.7, 3, 10).rotateZ(Math.PI / 2);
    const coat = kit.flat(0xd9d4c8);
    const animals = herd(body, coat, HERD + CROSSING + 1);
    runners.add(animals);
    const scorch = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.1, 9), kit.flat(0x3b3a42));
    const scorchAt = step(CARCASS, carcassView + 185, 1.0);
    scorch.position.set(scorchAt[0], CARCASS[1] + 0.03, scorchAt[2]);
    scorch.scale.set(1.2, 1, 0.62);
    scorch.rotation.y = -carcassView * RAD;
    runners.add(scorch);
    const outward = Math.atan2(-frameAt(MOUTH_S + FLARE).tz, frameAt(MOUTH_S + FLARE).tx);
    const huddle: { d: number; l: number; size: [number, number, number]; y: number; yaw: number }[] = [
      { d: FLARE + 4.9, l: 0.5, size: [1, 1.6, 1], y: 0.68, yaw: outward + 1.85 },
      { d: FLARE + 6.3, l: 1.5, size: [1.05, 0.85, 1.2], y: 0.36, yaw: outward + 0.5 },
      { d: FLARE + 7.0, l: 2.4, size: [1, 1.6, 1.1], y: 0.68, yaw: outward - 0.4 },
      { d: FLARE + 7.9, l: 2.2, size: [0.8, 1.7, 1.05], y: 0.72, yaw: outward + 1.2 },
      { d: FLARE + 8.9, l: 1.8, size: [1, 1.5, 1.1], y: 0.64, yaw: outward + 0.5 },
    ];
    scene.add(parts.standIn('ridge-runners', runners));

    const strikes: Bolt[] = [];
    const bright = kit.flat(0xf4ecff);
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const saddleHit = on(first.s - 300, 22, 0);
    const targets: { to: Vec3; thick: number; rise: number; lean: Vec3 | null; branch: Vec3 | null }[] = [
      { to: tipOf(spire(2)), thick: 7, rise: 1150, lean: null, branch: null },
      { to: tipOf(spire(3)), thick: 9, rise: 1150, lean: null, branch: null },
      { to: tipOf(spire(5)), thick: 9, rise: 1150, lean: null, branch: null },
      { to: strikeTip, thick: 2.6, rise: 420, lean: [120, 0, 60], branch: tipOf(spire(4)) },
      { to: tipOf(spire(0)), thick: 4, rise: 1150, lean: null, branch: null },
      { to: saddleHit, thick: 2.2, rise: 1150, lean: null, branch: null },
    ];
    eventsOf('spine').forEach((event, n) => {
      const target = targets[n % targets.length] as (typeof targets)[number];
      const jag = stream(`spine-${event.id}`);
      const group = new THREE.Group();
      const drift: Vec3 = target.lean ?? [jag.range(-200, 260), 0, -jag.range(260, 620)];
      const top: Vec3 = [target.to[0] + drift[0], target.to[1] + target.rise, target.to[2] + drift[2]];
      const line = (from: Vec3, to: Vec3, pieces: number, thick: number, wander: number): void => {
        let prev = new THREE.Vector3(...from);
        for (let i = 1; i <= pieces; i++) {
          const k = i / pieces;
          const next = new THREE.Vector3(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k);
          if (i < pieces) next.add(new THREE.Vector3(jag.range(-1, 1), jag.range(-0.3, 0.3), jag.range(-1, 1)).multiplyScalar(wander));
          const piece = new THREE.Mesh(unit, bright);
          piece.position.copy(prev).add(next).multiplyScalar(0.5);
          piece.lookAt(next);
          piece.scale.set(thick, thick, prev.distanceTo(next) + thick * 0.5);
          group.add(piece);
          prev = next;
        }
      };
      line(top, target.to, 13, target.thick, target.rise * 0.05);
      const mid: Vec3 = [top[0] + (target.to[0] - top[0]) * 0.45, top[1] + (target.to[1] - top[1]) * 0.45, top[2] + (target.to[2] - top[2]) * 0.45];
      line(mid, target.branch ?? [mid[0] + jag.range(120, 320), mid[1] - jag.range(150, 300), mid[2] + jag.range(-200, 200)], 6, target.thick * 0.55, target.rise * 0.03);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(target.thick * 2.6, 8, 6), bright);
      spark.position.set(...target.to);
      group.add(spark);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), kit.flat(0x9d8ee0));
      halo.position.set(top[0], top[1] + 60, top[2] - 200);
      halo.scale.set(target.rise * 0.45, target.rise * 0.2, target.rise * 0.36);
      group.add(halo);
      const dome = kit.sky(0x2a2742, 0x6f6c96, 0x5d5e7e);
      dome.renderOrder = -9.5;
      group.add(dome);
      group.visible = false;
      scene.add(parts.standIn(event.id, group));
      strikes.push({ group, dome, from: event.seconds });
    });

    kit.air(AIR, DENSITY);
    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.25, 52000);
    const insideFrom = (shotById('spine-05').first - shotById('spine-01').first) / cut.fps;
    const wallColour = wall.uniforms.uColour as THREE.IUniform<THREE.Color>;
    const wallBand = wall.uniforms.uBand as THREE.IUniform<THREE.Color>;

    return {
      unit: 'spine',
      scene,
      camera,
      look: { ...neutralLook(), bloom: 0.03, vignette: 0.1, grain: 0.006 },
      volume: null,
      parts,
      setTime: (seconds) => {
        kit.setTime(seconds);
        let flash = false;
        for (const strike of strikes) {
          const age = seconds - strike.from;
          strike.group.visible = age > -1e-4 && age < STRIKE_FRAMES / cut.fps - 1e-4;
          flash = flash || strike.group.visible;
        }
        kit.setAir(flash ? AIR_FLASH : AIR, flash ? DENSITY * 1.15 : DENSITY);
        const inside = seconds > insideFrom - 1e-4;
        wallColour.value.set(inside ? (flash ? 0x8d86b8 : 0x6f7286) : 0x15161d);
        wallBand.value.set(inside ? (flash ? 0x7a73a6 : 0x5d6075) : 0x1d1e28);

        bankAt.forEach((b, i) => {
          const p = world(b.s + 14 * seconds, b.l + 40 * Math.sin(seconds * 0.11 + b.phase), 0);
          setFigure(bank, i, p[0], b.y + 30 * Math.sin(seconds * 0.17 + b.phase), p[2], 0, [b.r * 1.5, b.r, b.r]);
        });
        pourAt.forEach((c, i) => {
          const u = (c.l + seconds * 0.035) % 1;
          const l = -520 + u * 1000;
          const over = Math.max(ground(c.s, l), crest(c.s) - Math.max(0, l) * 0.55);
          const p = world(c.s, l, over + c.r * c.rise);
          setFigure(pour, i, p[0], p[1], p[2], 0, [c.r * 1.7, c.r * 0.7, c.r * 1.3]);
        });
        hailAt.forEach((h, i) => {
          const fall = ((h.phase + seconds * 0.034) % 1) * 1400;
          setFigure(hail, i, h.x + WIND[0] * 0.3 * fall, 760 - fall, h.z + WIND[2] * 0.3 * fall, 0);
        });
        driftAt.forEach((d, i) => {
          const u = (d.l + seconds * 0.16) % 1;
          const l = -70 + u * 230;
          const y = Math.max(ground(d.s, l), crest(d.s) - Math.max(0, l) * 0.2) + d.lift * (1 + u * 2);
          const p = world(d.s, l, y);
          setFigure(drift, i, p[0], p[1], p[2], d.yaw, d.size);
        });
        streamRibbons(seconds);

        huddle.forEach((h, i) => {
          const shift = i === 0 ? 0.12 * Math.sin(seconds * 0.9) : 0.03 * Math.sin(seconds * 1.3 + i);
          const p = tube(h.d + shift, h.l, h.y + 0.015 * Math.sin(seconds * 2.2 + i * 1.9));
          setFigure(animals, i, p[0], p[1], p[2], h.yaw + (i === 0 ? 0.08 * Math.sin(seconds * 0.7) : 0), h.size);
        });
        for (let i = 0; i < CROSSING; i++) {
          const s = Math.min(first.s - 330 + 4.2 * seconds - i * 7, MOUTH_S + 14 - i * 3);
          const p = on(s, trail(s), 0.66 + 0.08 * Math.abs(Math.sin(seconds * 7 + i)));
          const f = frameAt(s);
          setFigure(animals, HERD + i, p[0], p[1], p[2], Math.atan2(-f.tz, f.tx), [1, 1.5, 1]);
        }
        setFigure(animals, HERD + CROSSING, CARCASS[0], CARCASS[1] + 0.27, CARCASS[2], (-carcassView - 80) * RAD, [1.35, 0.85, 1.3]);
      },
      solo: (part) => kit.solo(part),
    };
  },
};

export default place;
