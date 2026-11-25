// Origin: the centre of the lake on the water surface. North is -z, east is +x, y is up. The low sun is in the west (-x). The world is a disc 3.4 km in radius.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createBlockout, herd } from '../../core/blockout';
import type { Pose } from '../../core/cameras';
import { Parts, type Place, type PlaceModule } from '../../core/place';
import { stream } from '../../core/rng';
import { neutralLook } from '../../core/stage';
import { cut, placeOf, secondsInPlace } from '../../film/cut';
import { KEYS, SHORE_TURN, onShore, shots } from './cameras';
import handoff from './handoff.json';
import { DEEP, DEG, FAN, apronWidth, GAP_DIR, GAP_FROM, KNOLL, SHORE, at, gapFloor, landGeometry, landHeight, ringSector, shoreAt, shoreOf, sweep } from './land';

export const DEEP_COLOUR = handoff.water;
const AIR = '#b9b4b6';
const HAZE = 0.000035;

const smooth = (lo: number, hi: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

interface Drinker {
  x: number;
  z: number;
  facing: number;
  size: number;
  down: (t: number) => number;
  walk: number;
}

const NECK_UP = 22;
const NECK_DOWN = 146;
const SHOULDER: [number, number, number] = [0, 1.62, 0.85];

function bodyGeometry(): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = [new THREE.BoxGeometry(0.72, 0.8, 2).translate(0, 1.45, 0)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pieces.push(new THREE.BoxGeometry(0.16, 1.4, 0.18).translate(sx * 0.26, 0.35, sz * 0.8));
  pieces.push(new THREE.BoxGeometry(0.1, 0.5, 0.1).translate(0, 1.5, -1.05));
  return mergeGeometries(pieces);
}

function neckGeometry(): THREE.BufferGeometry {
  return mergeGeometries([
    new THREE.CylinderGeometry(0.15, 0.25, 1.6, 8).translate(0, 0.8, 0),
    new THREE.BoxGeometry(0.2, 0.2, 0.52).translate(0, 1.66, 0.14),
  ]);
}

function writeRing(g: THREE.BufferGeometry, radius: number, width: number): void {
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const n = p.count / 2;
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    p.setXYZ(i * 2, c * (radius - width / 2), 0, s * (radius - width / 2));
    p.setXYZ(i * 2 + 1, c * (radius + width / 2), 0, s * (radius + width / 2));
  }
  p.needsUpdate = true;
}

function ringGeometry(segments: number): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((segments + 1) * 6), 3));
  const index: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  g.setIndex(index);
  return g;
}

function drinkers(): Drinker[] {
  const rng = stream('eye-drinkers');
  const riseAt = secondsInPlace('eye', cut.keyFrames['eye-4'] as number) - 1.7;
  const steady = (v: number, phase: number) => (t: number) => v + 0.04 * Math.sin(t * 0.9 + phase);
  const near = (x: number, out: number, facing: number, size: number, down: (t: number) => number): Drinker => {
    const p = onShore(x, out, 0);
    return { x: p[0], z: p[2], facing: facing + SHORE_TURN, size, down, walk: 0 };
  };
  const front = SHORE - FAN;
  const list: Drinker[] = [
    near(16.9, -6.9, 82, 1, steady(0, 0.3)),
    near(18.6, -5.4, 78, 0.5, steady(0.92, 1.1)),
    near(20.6, -5.05, 76, 1, steady(0.96, 2.2)),
    near(25.75, -1, 283, 1, steady(0.96, 4)),
    { x: -1.5, z: front + 56, facing: 356, size: 1, down: (t) => 0.9 * (1 - smooth(riseAt, riseAt + 0.9, t)), walk: 0 },
    { x: 0.84, z: front + 56.2, facing: 3, size: 0.85, down: (t) => 0.9 * (1 - smooth(riseAt + 0.25, riseAt + 1.2, t)), walk: 0 },
    { x: -153.5, z: 746.1, facing: 80, size: 1, down: steady(0.96, 0.7), walk: 0 },
    { x: -181, z: 707, facing: 250, size: 1, down: steady(0.95, 3.1), walk: 0 },
    { x: -175, z: 698, facing: 110, size: 0.9, down: steady(0.95, 5.2), walk: 0 },
  ];
  for (let i = 0; i < 30; i++) {
    let bearing = rng.range(168, 214);
    if (bearing > 172 && bearing < 184) bearing += bearing < 178 ? -6 : 12;
    const walker = i % 3 === 0;
    const r = shoreAt(bearing) + (walker ? rng.range(14, 30) : rng.range(-7, 2));
    const [x, z] = at(bearing, r);
    const period = rng.range(9, 17);
    const phase = rng.next();
    const calf = i % 9 === 4;
    list.push({
      x,
      z,
      facing: bearing + 180 + rng.range(-50, 50),
      size: calf ? 0.52 : rng.range(0.9, 1.08),
      down: walker ? (t) => smooth(14, 18, t + phase * 4) : (t) => smooth(-0.35, 0.35, Math.sin((t / period + phase) * Math.PI * 2)),
      walk: walker ? rng.range(0.9, 1.3) : 0,
    });
  }
  return list;
}

const heightOf = (pose: Pose): number => pose.position[1] - Math.max(0, landHeight(pose.position[0], pose.position[2]));

const place: PlaceModule = {
  unit: 'eye',
  shots,
  heightOf,
  create: (): Place => {
    const parts = new Parts('eye');
    const kit = createBlockout(parts);
    const scene = new THREE.Scene();
    const two = THREE.DoubleSide;

    scene.add(parts.standIn('sky', kit.sky('#4a8cff', '#ecc39c', '#b8a690')));
    kit.air(AIR, HAZE);

    const land = new THREE.Mesh(landGeometry(), kit.flat('#d8b68c', { band: '#b39069', step: 34, side: two }));
    scene.add(parts.standIn('land', land));

    const lake = new THREE.Group();
    lake.add(new THREE.Mesh(new THREE.CircleGeometry(DEEP, 96).rotateX(-Math.PI / 2), kit.flat(DEEP_COLOUR)));
    scene.add(parts.standIn('lake', lake));

    const shallows = new THREE.Mesh(ringSector(DEEP, SHORE + 12, 0, 0, 360, 240), kit.flow('#b46a27', '#8e4c1d', { direction: [1, 0.25], speed: 9, scale: 26, side: two }));
    scene.add(parts.standIn('shallows', shallows));

    const shaft = new THREE.Group();
    shaft.add(new THREE.Mesh(ringSector(DEEP - 7, DEEP + 1, 0.04, 0, 360, 240), kit.flat('#1f4450', { side: two })));
    shaft.add(new THREE.Mesh(ringSector(DEEP + 1, DEEP + 9, 0.2, 0, 360, 240), kit.flat('#cbbf9f', { side: two })));
    scene.add(parts.standIn('shaft', shaft));

    const brow = new THREE.Group();
    const from = 36;
    const to = 148;
    const lipOf = (k: number): { lip: number; back: number } => {
      const q = Math.sin(Math.PI * k) ** 0.55;
      return { lip: 1150 - 290 * q, back: 1122 - 60 * q };
    };
    brow.add(
      new THREE.Mesh(
        sweep(from, to, 72, (b, k) => {
          const { lip } = lipOf(k);
          const lift = 14 * Math.sin(b * DEG * 5 + 1) + 150 * Math.sin(Math.PI * Math.min(1, k * 1.12)) ** 0.8;
          return [
            [1420, 246 + lift],
            [1220, 232 + lift],
            [lip + 24, 220 + lift],
            [lip, 204 + lift],
            [lip + 7, 170 + lift * 0.6],
          ];
        }),
        kit.flat('#c9b594', { band: '#a8916f', step: 34, side: two }),
      ),
    );
    brow.add(
      new THREE.Mesh(
        sweep(from, to, 72, (b, k) => {
          const { lip, back } = lipOf(k);
          const lift = 14 * Math.sin(b * DEG * 5 + 1) + 150 * Math.sin(Math.PI * Math.min(1, k * 1.12)) ** 0.8;
          return [
            [lip + 7, 170 + lift * 0.6],
            [lip + (back - lip) * 0.5, 108],
            [lip + (back - lip) * 0.86, 42],
            [back, 15],
            [1034, 3],
            [SHORE + 1, 1.2],
          ];
        }),
        kit.flat('#514a43', { band: '#463f39', step: 30, side: two }),
      ),
    );
    brow.add(new THREE.Mesh(ringSector(790, SHORE + 2, 0.1, 50, 136, 60), kit.flat('#55351c', { side: two })));
    scene.add(parts.standIn('brow', brow));

    const scree = new THREE.Mesh(
      sweep(128, 262, 134, (b) => {
        const from = shoreAt(b) + 4;
        const to = SHORE + apronWidth(b * DEG) + 26;
        const row: [number, number][] = [];
        for (let i = 0; i <= 44; i++) {
          const r = from + ((to - from) * i) / 44;
          const [x, z] = at(b, r);
          row.push([r, landHeight(x, z) + (i === 0 || i === 44 ? -0.3 : 0.45)]);
        }
        return row;
      }),
      kit.flat('#9c958f', { band: '#8d8680', step: 9, side: two }),
    );
    scene.add(parts.standIn('scree', scree));

    const caves = new THREE.Group();
    const dark = kit.flat('#3d362f');
    for (const [bearing, size, lift] of [
      [2, 34, 22],
      [338, 22, 16],
      [22, 26, 30],
      [312, 20, 12],
      [34, 18, 20],
      [352, 14, 60],
    ] as [number, number, number][]) {
      let r = SHORE + 40;
      let x = 0;
      let z = 0;
      for (; r < SHORE + 300; r += 4) {
        [x, z] = at(bearing, r);
        if (landHeight(x, z) > 60 + lift) break;
      }
      const cave = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), dark);
      cave.position.set(x, 44 + lift, z);
      cave.scale.set(size, size * 0.9, size);
      caves.add(cave);
    }
    land.add(caves);

    const water = kit.flow('#a9bcc4', '#e3e9e8', { direction: GAP_DIR, speed: 4, scale: 2.5, side: two });
    const ribbon: number[] = [];
    const ribbonIndex: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const along = -190 + i * 24;
      const cx = GAP_FROM[0] + GAP_DIR[0] * along;
      const cz = GAP_FROM[1] + GAP_DIR[1] * along;
      const y = Math.max(0.06, gapFloor(along) + 0.75);
      const half = along < 60 ? 7 - along * 0.02 : 5.8;
      ribbon.push(cx + GAP_DIR[1] * half, along < 60 ? 0.06 : y, cz - GAP_DIR[0] * half, cx - GAP_DIR[1] * half, along < 60 ? 0.06 : y, cz + GAP_DIR[0] * half);
      if (i < 40) ribbonIndex.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const streamGeometry = new THREE.BufferGeometry();
    streamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ribbon, 3));
    streamGeometry.setIndex(ribbonIndex);
    scene.add(parts.standIn('stream', new THREE.Mesh(streamGeometry, water)));

    const rng = stream('eye-scatter');
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();

    const NEAR_ROCKS: [number, number, number][] = [
      [-460.3, 1144.1, 5.5],
      [-466.5, 1132.9, 7],
      [-469.2, 1144.8, 6],
    ];
    const ROCKS = 230;
    const rocks = herd(new THREE.DodecahedronGeometry(1, 0), kit.flat('#857f79', { band: '#6f6a65', step: 2.6 }), ROCKS);
    for (let i = 0; i < ROCKS; i++) {
      let x: number;
      let z: number;
      let size: number;
      if (i < 46) {
        const a = rng.range(0, Math.PI * 2);
        const d = rng.range(18, 150);
        x = KNOLL[0] - 10 + Math.sin(a) * d;
        z = KNOLL[1] - 20 + Math.cos(a) * d * 0.8;
        size = rng.range(3, 11);
      } else if (i < 90) {
        const b = rng.range(150, 215);
        [x, z] = at(b, shoreAt(b) + rng.range(3, 60));
        size = rng.range(0.25, 1.1);
      } else {
        [x, z] = at(rng.range(120, 300), SHORE + rng.range(8, 330));
        size = rng.range(1, 6);
      }
      const fixed = NEAR_ROCKS[i];
      if (fixed) [x, z, size] = fixed;
      e.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
      m.compose(v.set(x, landHeight(x, z) + size * 0.25, z), q.setFromEuler(e), s.set(size * rng.range(0.9, 1.5), size * rng.range(0.6, 0.9), size));
      rocks.setMatrixAt(i, m);
    }
    scree.add(rocks);

    const mats = new THREE.Group();
    const matsBearing = (Math.atan2(KEYS.mats.position[0], -KEYS.mats.position[2]) / DEG + 360) % 360;
    const STRIPS = 260;
    const strips = herd(new THREE.BoxGeometry(1, 0.05, 1), kit.flat('#d7a04a'), STRIPS);
    for (let i = 0; i < STRIPS; i++) {
      let bearing = (i / STRIPS) * 360 + rng.range(-0.6, 0.6);
      if (Math.abs(bearing - matsBearing) < 1.4) bearing += 2.8;
      const inner = DEEP + rng.range(14, 160);
      const outer = Math.min(shoreAt(bearing) - 12, inner + rng.range(90, 420));
      const [x, z] = at(bearing, (inner + outer) / 2);
      e.set(0, -bearing * DEG, 0);
      m.compose(v.set(x, 0.12, z), q.setFromEuler(e), s.set(rng.range(1.2, 3.6), 1, outer - inner));
      strips.setMatrixAt(i, m);
    }
    mats.add(strips);
    const THREADS = 2600;
    const threads = herd(new THREE.BoxGeometry(1, 0.05, 1), kit.flat('#e0b055'), THREADS);
    const beds: [number, number, number][] = [
      [KEYS.mats.position[0] + 2, KEYS.mats.position[2] - 11, 27],
      [KEYS.edge.position[0] - 5, KEYS.edge.position[2] + 1, 15],
      [onShore(22, -14, 0)[0], onShore(22, -14, 0)[2], 20],
    ];
    for (let i = 0; i < THREADS; i++) {
      const bed = beds[i % 5 === 4 ? 2 : i % 5 === 3 ? 1 : 0] as [number, number, number];
      const a = rng.range(0, Math.PI * 2);
      const d = bed[2] * Math.sqrt(rng.next());
      const x = bed[0] + Math.sin(a) * d;
      const z = bed[1] + Math.cos(a) * d;
      const r = Math.hypot(x, z);
      const hidden = r < DEEP + 2 || r > shoreOf(x, z) - 2;
      e.set(0, -Math.atan2(x, -z) + rng.range(-0.3, 0.3), 0);
      m.compose(v.set(x, hidden ? -5 : 0.1 + (r < DEEP + 10 ? 0.16 : 0), z), q.setFromEuler(e), s.set(rng.range(0.12, 0.4), 1, rng.range(2.5, 9)));
      threads.setMatrixAt(i, m);
    }
    mats.add(threads);
    scene.add(parts.standIn('mats', mats));

    const skeleton = new THREE.Group();
    const bone = kit.flat('#e9dfc4');
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.3), bone);
    spine.position.set(0, 0.32, 0);
    skeleton.add(spine);
    for (let i = 0; i < 8; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.34 - i * 0.012, 0.025, 4, 10, Math.PI), bone);
      rib.position.set(0, 0.08, -0.2 + i * 0.13);
      skeleton.add(rib);
    }
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.5), bone);
    skull.position.set(0.1, 0.14, -1.45);
    skeleton.add(skull);
    for (const [x, z, turn, length] of [
      [0.45, 0.95, 0.5, 1.3],
      [-0.3, 1.2, -0.2, 1.1],
      [0.5, -0.5, 1.1, 0.9],
    ] as [number, number, number, number][]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, length), bone);
      leg.position.set(x, 0.06, z);
      leg.rotation.y = turn;
      skeleton.add(leg);
    }
    skeleton.position.set(KEYS.edge.position[0] + 1.25, 0.2, KEYS.edge.position[2] - 3.5);
    skeleton.scale.setScalar(0.8);
    skeleton.rotation.y = 40 * DEG;
    scene.add(parts.standIn('skeleton', skeleton));

    const animals = drinkers();
    const pale = kit.flat('#dccab4');
    const bodies = herd(bodyGeometry(), pale, animals.length);
    const necks = herd(neckGeometry(), pale, animals.length);
    const drinkerGroup = new THREE.Group();
    drinkerGroup.add(bodies, necks);
    scene.add(parts.standIn('drinkers', drinkerGroup));

    const ripples = new THREE.Group();
    const lap = herd(new THREE.RingGeometry(0.95, 1, 28).rotateX(-Math.PI / 2), kit.flat('#d3a36c', { side: two }), animals.length * 2);
    ripples.add(lap);
    const CENTRE_RINGS = 12;
    const ringMaterial = kit.flat(handoff.ring, { side: two });
    const centreRings: THREE.Mesh[] = [];
    for (let i = 0; i < CENTRE_RINGS; i++) {
      const ring = new THREE.Mesh(ringGeometry(96), ringMaterial);
      ring.position.y = 0.25;
      ring.frustumCulled = false;
      centreRings.push(ring);
      ripples.add(ring);
    }
    const restRings = handoff.ringRadii.map((ratio) => {
      const ring = new THREE.Mesh(ringGeometry(192), ringMaterial);
      ring.position.y = 0.25;
      ring.frustumCulled = false;
      ripples.add(ring);
      return { ring, radius: ratio * handoff.eyeHalfHeightMetres };
    });
    lake.add(ripples);

    const riser = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2), kit.flat('#2b3d52', { band: '#3a5068', step: 1.5 }));
    const form = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), kit.flat('#9aa3a6'));
    riser.add(dome, form);
    const TIPS = 9;
    const tips = herd(new THREE.ConeGeometry(0.9, 7, 6), kit.flat('#d9d2bf'), TIPS);
    const tipAt: [number, number, number][] = [];
    for (let i = 0; i < TIPS; i++) tipAt.push([(i / TIPS) * 360 + rng.range(-14, 14), rng.range(48, 96), rng.range(0.6, 1.2)]);
    riser.add(tips);
    scene.add(parts.standIn('riser', riser));

    const mist = new THREE.Mesh(
      sweep(-80, 78, 120, (b) => {
        const lump = 7 + 5 * Math.sin(b * DEG * 9) + 3 * Math.sin(b * DEG * 23 + 1);
        return [
          [SHORE - 70, 0.4],
          [SHORE - 30, lump * 0.6],
          [SHORE + 30, lump],
          [SHORE + 90, lump * 1.2],
          [SHORE + 170, lump * 0.5 + 40],
        ];
      }),
      kit.flat('#c3c2c4', { side: two }),
    );
    scene.add(parts.standIn('mist', mist));


    const riseKey = secondsInPlace('eye', cut.keyFrames['eye-4'] as number);
    const endSeconds = secondsInPlace('eye', placeOf('eye').last + 1);
    const ringRest = endSeconds - 1;
    const yAxis = new THREE.Vector3(0, 1, 0);
    const qYaw = new THREE.Quaternion();
    const qPitch = new THREE.Quaternion();
    const xAxis = new THREE.Vector3(1, 0, 0);
    const shoulder = new THREE.Vector3();

    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 40000);

    return {
      unit: 'eye',
      scene,
      camera,
      look: { ...neutralLook(), bloom: 0.02, vignette: 0.1, grain: 0.006 },
      volume: null,
      parts,
      setTime: (seconds) => {
        const t = seconds;
        kit.setTime(t);
        kit.setAir(AIR, HAZE * (1 - smooth(endSeconds - 3, endSeconds - 1.3, t)));

        animals.forEach((d, i) => {
          let x = d.x;
          let z = d.z;
          if (d.walk > 0) {
            const r0 = Math.hypot(x, z);
            const r = Math.max(shoreOf(x, z) - 2.5, r0 - d.walk * Math.max(0, t));
            x *= r / r0;
            z *= r / r0;
          }
          const ground = Math.max(-0.3, landHeight(x, z)) - 0.06;
          const step = d.walk > 0 && Math.hypot(x, z) > shoreOf(x, z) - 2.4 ? 0.05 * Math.sin(t * 5 + i) : 0;
          const yaw = Math.PI - d.facing * DEG;
          qYaw.setFromAxisAngle(yAxis, yaw);
          m.compose(v.set(x, ground + step, z), qYaw, s.setScalar(d.size));
          bodies.setMatrixAt(i, m);
          const down = Math.min(1, Math.max(0, d.down(t)));
          const pitch = (NECK_UP + (NECK_DOWN - NECK_UP) * down) * DEG;
          shoulder.set(...SHOULDER).multiplyScalar(d.size).applyQuaternion(qYaw).add(v);
          qPitch.setFromAxisAngle(xAxis, pitch).premultiply(qYaw);
          m.compose(shoulder, qPitch, s.setScalar(d.size));
          necks.setMatrixAt(i, m);
          const reach = (SHOULDER[2] + 1.75 * Math.sin(pitch)) * d.size;
          const mx = x + Math.sin(d.facing * DEG) * reach;
          const mz = z - Math.cos(d.facing * DEG) * reach;
          const wet = Math.hypot(mx, mz) < shoreOf(mx, mz) - 0.3 ? smooth(0.8, 0.95, down) : 0;
          for (let k = 0; k < 2; k++) {
            const phase = (t / 3.6 + i * 0.37 + k * 0.5) % 1;
            const radius = wet * (0.3 + 4.2 * phase);
            m.compose(v.set(mx, 0.22, mz), q.identity(), s.set(radius, 1, radius));
            lap.setMatrixAt(i * 2 + k, m);
          }
        });
        bodies.instanceMatrix.needsUpdate = true;
        necks.instanceMatrix.needsUpdate = true;
        lap.instanceMatrix.needsUpdate = true;

        centreRings.forEach((ring, i) => {
          let radius = 0;
          let width = 0;
          if (i < 7) {
            const age = t - (-11.6 + 2.6 * i);
            const life = 13.5;
            if (age > 0 && age < life) {
              radius = 6 + 15 * age;
              width = 4.5 * Math.sin((Math.PI * age) / life);
            }
          } else {
            const age = t - (riseKey - 1.2 + 0.62 * (i - 7));
            const life = 2.7;
            if (age > 0 && age < life) {
              radius = 62 + 44 * age;
              width = 5 * Math.sin((Math.PI * age) / life);
            }
          }
          ring.visible = width > 0;
          if (ring.visible) writeRing(ring.geometry, radius, width);
        });

        restRings.forEach(({ ring, radius }, i) => {
          const from = riseKey + 0.3 + 0.1 * (restRings.length - 1 - i);
          const grown = smooth(from, from + ringRest - riseKey - 1.1, t);
          const u = grown * grown * (3 - 2 * grown);
          ring.visible = u > 0;
          if (ring.visible) writeRing(ring.geometry, radius * u, radius * u * handoff.ringWidth);
        });

        const swell = smooth(riseKey - 1.7, riseKey - 0.15, t) * (1 - smooth(riseKey + 0.8, riseKey + 2.5, t));
        const breathe = 1 + 0.04 * Math.sin(t * 2.3);
        dome.visible = swell > 0.001;
        form.visible = dome.visible;
        dome.scale.set(54, 11 * swell * breathe, 54);
        dome.position.y = swell > 0 ? 0 : -5;
        form.scale.set(26, 12.2 * swell * breathe * smooth(0.55, 1, swell), 26);
        form.position.set(6, -0.01, -4);
        tipAt.forEach(([bearing, r, size], i) => {
          const [x, z] = at(bearing, r);
          const up = smooth(0.25 + 0.05 * (i % 4), 0.9, swell);
          m.compose(v.set(x, -3.6 * size + 6.4 * size * up + 0.3 * Math.sin(t * 1.7 + i), z), q.setFromEuler(e.set(0.2 * Math.sin(i * 2.1), 0, 0.25 * Math.cos(i * 1.3))), s.setScalar(up > 0 ? size : 0));
          tips.setMatrixAt(i, m);
        });
        tips.instanceMatrix.needsUpdate = true;

        strips.rotation.y = 0.0016 * Math.sin(t * 0.7);
        threads.position.set(0.25 * Math.sin(t * 0.9), 0, 0.2 * Math.sin(t * 0.6 + 1));
        mist.rotation.y = -0.0035 * t;
        mist.scale.y = 1 + 0.08 * Math.sin(t * 0.5);
      },
      solo: (part) => kit.solo(part),
    };
  },
};

export default place;
