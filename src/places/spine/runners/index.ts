// The ridge-runners: the herd sheltering in the canal, the ones still crossing the saddle, and the one the lightning found.
// An animal is a hide of tubes moved by six bones, a coat of some thousands of locks rooted on it, and a beard of tendrils where a face would be.
// Everything it does is worked out from the seconds of the place: the bones on the processor, the coat and the tendrils in the vertex shader.
import * as THREE from 'three';
import type { Vec3 } from '../../../core/cameras';
import type { Context, Piece } from '../shared/context';
import { CANAL_KEY, CANAL_KEY_AT, CARCASS, INSIDE_FROM, RAD, canalFar, carcassAxis, trail, tube } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import { FLOOR, MOUTH_S, first, frameAt, world } from '../ridge';
import { flashAt } from '../strikes/bolt';
import { BODY_FRAGMENT, BODY_VERTEX, LOCK_FRAGMENT, LOCK_VERTEX, TENDRIL_FRAGMENT, TENDRIL_VERTEX } from './material';
import { LIES_AT, scorch } from './scorch';
import { FACE_AT, HIPS, LEG_TOP, NECK_AT, bodyGeometry, coat, lockGeometry, tendrilGeometry } from './shape';

export const PARTS: readonly string[] = ['ridge-runners'];

type Act = 'stand' | 'lie' | 'walk' | 'dead';

interface Role {
  act: Act;
  size: number;
  /** Locks in its coat: the ones the lens comes close to have more. */
  locks: number;
  /** How long its skirt hangs, 1 the usual. */
  skirt: number;
  /** Its coat's colour, scene linear. */
  tone: [number, number, number];
  phase: number;
  inside: boolean;
}

interface Animal {
  role: Role;
  group: THREE.Group;
  bones: THREE.Matrix4[];
  ground: THREE.Vector4;
  coat: THREE.Vector4;
  writhe: THREE.Vector4;
}

const TENDRILS = 34;
const TENDRILS_DEAD = 170;
const SEGMENTS = 5;

const m1 = new THREE.Matrix4();
const m2 = new THREE.Matrix4();
const q1 = new THREE.Quaternion();
const e1 = new THREE.Euler();
const v1 = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);

/** A turn about a point of the animal. */
function about(out: THREE.Matrix4, pivot: [number, number, number], rx: number, ry: number, rz: number, shift?: [number, number, number], scale: THREE.Vector3 = ONE): THREE.Matrix4 {
  q1.setFromEuler(e1.set(rx, ry, rz, 'YXZ'));
  out.compose(v1.set(pivot[0] + (shift ? shift[0] : 0), pivot[1] + (shift ? shift[1] : 0), pivot[2] + (shift ? shift[2] : 0)), q1, scale);
  m2.makeTranslation(-pivot[0], -pivot[1], -pivot[2]);
  return out.multiply(m2);
}

/** A leg whose foot stands at (dx, lift, dz) from its rest and whose top follows the trunk: a lean of the whole leg, not a slide. */
function leg(out: THREE.Matrix4, hip: [number, number, number], footX: number, footZ: number, lift: number, topX: number, topY: number, topZ: number): THREE.Matrix4 {
  const sy = (LEG_TOP + topY - lift) / LEG_TOP;
  out.set(1, (topX - footX) / LEG_TOP, 0, footX, 0, sy, 0, lift, 0, (topZ - footZ) / LEG_TOP, 1, footZ, 0, 0, 0, 1);
  // The lean is about the leg's own line, not the animal's middle.
  m2.makeTranslation(-hip[0], 0, -hip[2]);
  out.multiply(m2);
  m2.makeTranslation(hip[0], 0, hip[2]);
  return out.premultiply(m2);
}

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function create(ctx: Context): Piece {
  const rng = ctx.rng('runners');
  const pixel = { value: 0.0005 };
  const body = bodyGeometry();
  body.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.6, 0), 2.6);
  const strip = lockGeometry(SEGMENTS);
  const tendril = tendrilGeometry();
  const door = new THREE.Vector4(canalFar[0], canalFar[1], canalFar[2], 1);
  const open = new THREE.Vector4(0, 0, 0, 0);
  const part = new THREE.Group();

  const make = (role: Role, burn: THREE.Vector4): Animal => {
    const bones = Array.from({ length: 6 }, () => new THREE.Matrix4());
    const ground = new THREE.Vector4(0, 0, 0, 0);
    const coatSet = new THREE.Vector4(1, 0.1, 0.02, 0);
    const writhe = new THREE.Vector4(1, 0, 0, 0);
    const shared = {
      ...ctx.rig.uniforms,
      uBones: { value: bones },
      uBurn: { value: burn },
      uGround: { value: ground },
      uDoor: { value: role.inside ? door : open },
      uDoorArea: { value: 420 },
      uPixel: pixel,
      uCoat: { value: coatSet },
      uTone: { value: new THREE.Vector4(role.tone[0], role.tone[1], role.tone[2], rng.next()) },
      uFace: { value: new THREE.Vector4(FACE_AT[0], FACE_AT[1], FACE_AT[2], 0) },
      uWrithe: { value: writhe },
      uHairs: { value: role.locks > 3000 ? 3 : 2 },
      uDoorGain: { value: 3 },
    };
    const group = new THREE.Group();
    const hide = new THREE.Mesh(body, new THREE.ShaderMaterial({ vertexShader: BODY_VERTEX, fragmentShader: BODY_FRAGMENT, uniforms: shared, side: THREE.DoubleSide }));
    group.add(hide);

    const c = coat(rng, role.locks, role.skirt, role.act === 'dead');
    const locks = new THREE.InstancedBufferGeometry();
    locks.index = strip.index;
    locks.setAttribute('position', strip.getAttribute('position'));
    locks.setAttribute('aRoot', new THREE.InstancedBufferAttribute(c.root, 3));
    locks.setAttribute('aDir', new THREE.InstancedBufferAttribute(c.dir, 3));
    locks.setAttribute('aLock', new THREE.InstancedBufferAttribute(c.lock, 4));
    locks.instanceCount = c.count;
    locks.boundingSphere = body.boundingSphere;
    group.add(new THREE.Mesh(locks, new THREE.ShaderMaterial({ vertexShader: LOCK_VERTEX, fragmentShader: LOCK_FRAGMENT, uniforms: shared, side: THREE.DoubleSide })));

    const count = role.act === 'dead' ? TENDRILS_DEAD : TENDRILS;
    const thin = role.act === 'dead' ? 0.45 : 1;
    const hang = new Float32Array(count * 4);
    const limb = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = 0.11 * Math.sqrt(rng.next());
      hang.set([r * Math.cos(a) - 0.02, r * Math.sin(a), Math.sin(a) * rng.range(0.3, 0.9), rng.range(-1, 1)], i * 4);
      // A few long thick ones, many thin ones.
      const big = rng.next() < 0.3;
      limb.set([big ? rng.range(0.55, 0.75) : rng.range(0.3, 0.55), thin * (big ? rng.range(0.024, 0.032) : rng.range(0.012, 0.02)), rng.range(0.2, 1), rng.next()], i * 4);
    }
    const beard = new THREE.InstancedBufferGeometry();
    beard.index = tendril.index;
    beard.setAttribute('position', tendril.getAttribute('position'));
    beard.setAttribute('aHang', new THREE.InstancedBufferAttribute(hang, 4));
    beard.setAttribute('aLimb', new THREE.InstancedBufferAttribute(limb, 4));
    beard.instanceCount = count;
    beard.boundingSphere = body.boundingSphere;
    group.add(new THREE.Mesh(beard, new THREE.ShaderMaterial({ vertexShader: TENDRIL_VERTEX, fragmentShader: TENDRIL_FRAGMENT, uniforms: shared, side: THREE.DoubleSide })));
    part.add(group);
    return { role, group, bones, ground, coat: coatSet, writhe };
  };

  const NONE = new THREE.Vector4(0, 0, 0, 0);
  const cream = (): [number, number, number] => {
    const k = rng.range(0.85, 1.1);
    const warm = rng.range(0, 1);
    return [0.8 * k, (0.73 - 0.03 * warm) * k, (0.6 - 0.08 * warm) * k];
  };

  // The herd in the canal, along its left wall, out of the wind: where, which way it faces, and what it does.
  const along = Math.atan2(-frameAt(MOUTH_S + CANAL_KEY).tz, frameAt(MOUTH_S + CANAL_KEY).tx);
  const HUDDLE: { d: number; l: number; yaw: number; act: Act; size: number; skirt: number }[] = [
    { d: CANAL_KEY + 4.3, l: 0.1, yaw: along - 1.6, act: 'stand', size: 1.0, skirt: 0.8 },
    { d: CANAL_KEY + 3.2, l: -1.5, yaw: along + 2.5, act: 'lie', size: 1.05, skirt: 1.0 },
    { d: CANAL_KEY + 2.5, l: -2.4, yaw: along + 2.3, act: 'lie', size: 1.15, skirt: 1.0 },
    { d: CANAL_KEY + 1.6, l: -2.6, yaw: along + 1.9, act: 'lie', size: 1.2, skirt: 1.0 },
    { d: CANAL_KEY + 0.6, l: -2.6, yaw: along + 0.5, act: 'stand', size: 1.1, skirt: 0.7 },
  ];
  const huddle = HUDDLE.map((h, i) => make({ act: h.act, size: h.size, locks: 36000, skirt: h.skirt, tone: cream(), phase: i * 1.9 + 0.4, inside: true }, NONE));
  const CROSSING = 4;
  const crossing = Array.from({ length: CROSSING }, (_, i) => make({ act: 'walk', size: rng.range(0.9, 1.15), locks: 5000, skirt: 1, tone: cream(), phase: i * 0.37 + rng.next(), inside: false }, NONE));
  // The scorched one: on its side, the bolt's way burned along its upper flank.
  const dead = make({ act: 'dead', size: 1.15, locks: 110000, skirt: 0.5, tone: [0.86, 0.8, 0.68], phase: 0, inside: false }, new THREE.Vector4(-0.02, 1.2, -1, 0.15));

  const burned = scorch(ctx);
  burned.drape();
  part.add(burned.mesh);
  ctx.scene.add(ctx.parts.built('ridge-runners', part));

  const discs = ctx.rig.contactDiscs(HUDDLE.length + CROSSING + 1);
  const place = (a: Animal, at: Vec3, yaw: number, roll = 0, pitch = 0): void => {
    q1.setFromEuler(e1.set(roll, yaw, pitch, 'YXZ'));
    a.group.position.set(at[0], at[1], at[2]);
    a.group.quaternion.copy(q1);
    a.group.scale.setScalar(a.role.size);
    a.group.updateMatrixWorld(true);
  };

  /** Standing: it breathes, shifts its weight from side to side over planted feet, and its neck swings slowly. `look` turns the neck (radians). */
  const stand = (a: Animal, t: number, look: number, shiver: number): void => {
    const ph = a.role.phase;
    const breath = Math.sin(t * 1.9 + ph);
    const sway = 0.04 * Math.sin(t * 0.52 + ph * 3) + 0.012 * Math.sin(t * 1.3 + ph);
    const fore = 0.02 * Math.sin(t * 0.33 + ph * 2);
    (a.bones[0] as THREE.Matrix4).compose(v1.set(fore, -0.006 * breath, sway), q1.setFromEuler(e1.set(sway * 0.5, 0, 0.012 * breath, 'YXZ')), new THREE.Vector3(1, 1 + 0.018 * breath, 1 + 0.03 * breath));
    HIPS.forEach((hip, i) => leg(a.bones[i + 1] as THREE.Matrix4, hip, 0, 0, 0, fore, 0, sway));
    about(a.bones[5] as THREE.Matrix4, NECK_AT, 0.2 * Math.sin(t * 0.31 + ph), 0.28 * Math.sin(t * 0.41 + ph * 2) + look, 0.1 * Math.sin(t * 0.63 + ph) - 0.05, [fore, 0, sway]);
    a.coat.set(a.role.inside ? 0.8 * a.role.skirt + 0.3 : 1.2, a.role.inside ? 0.05 : 0.5, 0.012 + shiver, a.role.inside ? 0.14 : 0.2);
    a.writhe.set(1, 0, 0, 0);
  };

  /** Lying on its chest with its legs folded under it and its neck down. */
  const lie = (a: Animal, t: number, shiver: number): void => {
    const ph = a.role.phase;
    const breath = Math.sin(t * 1.5 + ph);
    const down = -0.4;
    (a.bones[0] as THREE.Matrix4).compose(v1.set(0, down - 0.004 * breath, 0), q1.setFromEuler(e1.set(0.14 * Math.sin(ph * 5), 0, -0.04, 'YXZ')), new THREE.Vector3(1, 1 + 0.02 * breath, 1.06 + 0.035 * breath));
    HIPS.forEach((hip, i) => {
      const m = a.bones[i + 1] as THREE.Matrix4;
      // Folded: the leg is a third of its height. A foreleg lies out ahead of the chest with its paw flat on the ground; a hind foot
      // lies just ahead of its hip.
      const out = i < 2 ? 0.62 : 0.12;
      const slope = i < 2 ? -0.62 : 0;
      m.set(1, slope, 0, out, 0, 0.36, 0, 0.0, 0, 0, 1, (hip[2] > 0 ? 1 : -1) * (i < 2 ? 0.1 : 0.06), 0, 0, 0, 1);
    });
    about(a.bones[5] as THREE.Matrix4, NECK_AT, 0.25 * Math.sin(ph * 3) + 0.06 * Math.sin(t * 0.37 + ph), 0.5 * Math.sin(ph * 7) + 0.1 * Math.sin(t * 0.29 + ph), -0.35 + 0.05 * Math.sin(t * 0.5 + ph), [0, down, 0]);
    a.coat.set(0.8, 0.04, 0.012 + shiver, 0.14);
    a.writhe.set(0.6, 0, 0, 0);
  };

  /** A walk in which each foot stands still on the ground while the trunk goes over it. `dist` is metres gone, `speed` metres a second. */
  const STRIDE = 1.05;
  const DUTY = 0.62;
  const OFFSETS = [0.5, 0, 0.75, 0.25];
  const walk = (a: Animal, dist: number, speed: number): void => {
    const size = a.role.size;
    const cycle = dist / (STRIDE * size) + a.role.phase;
    const go = Math.min(1, speed / 0.5);
    const bob = 0.022 * Math.cos(cycle * 4 * Math.PI) * go;
    // The trunk goes over to the side whose feet are down, and rolls with it.
    const swayZ = 0.045 * Math.sin(cycle * 2 * Math.PI + 0.6) * go;
    (a.bones[0] as THREE.Matrix4).compose(v1.set(0, bob, swayZ), q1.setFromEuler(e1.set(swayZ * 1.2, 0, 0.03 * Math.sin(cycle * 4 * Math.PI + 1) * go, 'YXZ')), ONE);
    HIPS.forEach((hip, i) => {
      const p = (((cycle + (OFFSETS[i] as number)) % 1) + 1) % 1;
      let x: number;
      let lift = 0;
      if (p < DUTY) x = STRIDE * (0.5 - p / DUTY);
      else {
        const k = (p - DUTY) / (1 - DUTY);
        const ease = k * k * (3 - 2 * k);
        x = STRIDE * (-0.5 + ease);
        lift = 0.16 * Math.sin(Math.PI * k) * (0.6 + 0.4 * k);
      }
      leg(a.bones[i + 1] as THREE.Matrix4, hip, x * 0.5 * go, 0, lift * go, 0, bob, swayZ);
    });
    about(a.bones[5] as THREE.Matrix4, NECK_AT, 0, 0.06 * Math.sin(cycle * 2 * Math.PI), -0.12 + 0.06 * Math.sin(cycle * 4 * Math.PI + 0.8) * go, [0, bob, swayZ]);
    a.coat.set(1.2, 0.55, 0.01, 0.15);
    a.writhe.set(1, 0, 0, 0);
  };

  // The dead one does not move: its bones are set once. It lies collapsed across the frame, long and low, half on its far side so the
  // burned flank faces the lens and the sky: the trunk slack and flattened, the legs of the near side thrown out toward the lens with
  // their paws on the ground, a far foreleg out from under the chest, the neck fallen forward with the face on the rock.
  const ROLL = 0.45;
  const SLACK = 0.72;
  /** How high the middle of its trunk lies over the ground, and so how high its own origin does, in its own metres. */
  const REST = 0.9 * SLACK;
  const LIFT = 0.25 - REST * Math.cos(ROLL);
  const over = (v: [number, number, number]): number => LIFT + v[1] * Math.cos(ROLL) - v[2] * Math.sin(ROLL);
  /** A leg thrown out: swung `fore` toward the head, twisted `twist` about itself, and let fall until its paw is `paw` over the ground. */
  const thrown = (bone: number, fore: number, twist: number, long: number, paw: number, shift: [number, number, number]): void => {
    const hip = HIPS[bone - 1] as [number, number, number];
    const top = over([hip[0] + shift[0], hip[1] + shift[1], hip[2] + shift[2]]);
    const fallen = Math.PI / 2 - ROLL + Math.asin(Math.min(1, Math.max(-1, (paw - top) / (LEG_TOP * long * Math.cos(fore)))));
    about(dead.bones[bone] as THREE.Matrix4, hip, fallen, twist, fore, shift, new THREE.Vector3(1, long, 1));
  };
  (dead.bones[0] as THREE.Matrix4).makeScale(1.1, SLACK, 1.15);
  const SUNK = -LEG_TOP * (1 - SLACK);
  thrown(1, 1.0, -0.2, 1.1, 0.07, [0.02, SUNK, 0.05]);
  thrown(2, 1.2, 0.1, 1.15, 0.07, [0.1, SUNK, -0.2]);
  thrown(3, 0.95, 0, 1.05, 0.07, [0, SUNK, 0.05]);
  thrown(4, 0.9, 0, 0.8, 0.07, [0, SUNK, -0.1]);
  about(dead.bones[5] as THREE.Matrix4, NECK_AT, 0.2, 0.3, -0.12, [0.04, -NECK_AT[1] * (1 - SLACK), 0]);
  dead.coat.set(0.66, 0.45, 0.0, 0.3);
  dead.writhe.set(0, 1, 0, 0);
  const UP = new THREE.Vector3(0, 1, 0);
  const lie3 = new THREE.Vector3();
  const tilt = new THREE.Quaternion();

  const walked = (u: number): number => (u < -0.8 ? 0 : u < 0.4 ? 0.79 * (u + 0.8) ** 2 : 1.14 + 1.9 * (u - 0.4));
  const size = new THREE.Vector2();
  let height = 0;

  return {
    setTime: (seconds) => {
      const staged = stagedSeconds();
      const inCanal = staged > INSIDE_FROM - 1e-4;
      const flash = flashAt(seconds);
      // A flash at the mouth: every animal flinches, the coat lifts, and the necks turn to the light a moment after.
      const start = flash && flash.age > 0 ? Math.exp(-flash.age / 0.5) * smooth(0.03, 0.16, flash.age) : 0;

      huddle.forEach((a, i) => {
        a.group.visible = inCanal;
        if (!inCanal) return;
        const h = HUDDLE[i] as (typeof HUDDLE)[number];
        // The one at the mouth walks on after the key: its feet keep their places as it goes.
        const gone = i === 0 ? walked(seconds - CANAL_KEY_AT) : 0;
        const at = tube(h.d + gone, h.l, 0);
        a.ground.x = FLOOR;
        // As it sets off it turns to the way it goes.
        place(a, [at[0], FLOOR, at[2]], i === 0 ? h.yaw + (along - h.yaw) * smooth(-0.8, 1.4, seconds - CANAL_KEY_AT) : h.yaw);
        if (h.act === 'lie') lie(a, seconds, 0.05 * start);
        else if (i === 0 && gone > 0.002) {
          const u = seconds - CANAL_KEY_AT;
          walk(a, gone, u < 0.4 ? 1.58 * (u + 0.8) : 1.9);
        } else stand(a, seconds, 0.35 * start * (i % 2 ? 1 : -1), 0.06 * start);
        ctx.rig.setDisc(discs, i, at[0], at[2], 1.1 * a.role.size, 0.75);
      });

      crossing.forEach((a, i) => {
        a.group.visible = !inCanal;
        if (!a.group.visible) return;
        const end = MOUTH_S + 14 - i * 3;
        const free = first.s - 330 + 2.6 * seconds - i * 7;
        const s = Math.min(free, end);
        const l = trail(s);
        const f = frameAt(s);
        const y = ctx.rig.land.height(...(world(s, l, 0).filter((_, k) => k !== 1) as [number, number]));
        const p = world(s, l, y);
        const ahead = world(s + 1, trail(s + 1), 0);
        void f;
        a.ground.x = y;
        place(a, p, Math.atan2(-(ahead[2] - p[2]), ahead[0] - p[0]));
        if (free < end) walk(a, s - (first.s - 330), 2.6);
        else stand(a, seconds, 0, 0);
        ctx.rig.setDisc(discs, HUDDLE.length + i, p[0], p[2], 1.0 * a.role.size, 0.7);
      });

      // The dead one lies on the land as it is there: the slope under it turns it, so nothing of it hangs in the air or is under the snow.
      const cx = LIES_AT[0];
      const cz = LIES_AT[2];
      const E = 0.8;
      const land = ctx.rig.land;
      const sx = (land.height(cx + E, cz) - land.height(cx - E, cz)) / (2 * E);
      const sz = (land.height(cx, cz + E) - land.height(cx, cz - E)) / (2 * E);
      const gy = 0.5 * land.height(cx, cz) + 0.125 * (land.height(cx + E, cz) + land.height(cx - E, cz) + land.height(cx, cz + E) + land.height(cx, cz - E));
      dead.ground.set(gy - sx * cx - sz * cz, sx, sz, 0);
      lie3.set(-sx, 1, -sz).normalize();
      tilt.setFromUnitVectors(UP, lie3);
      q1.setFromEuler(e1.set(ROLL, -(carcassAxis + 180) * RAD, 0, 'YXZ')).premultiply(tilt);
      const up = LIFT * dead.role.size;
      dead.group.position.set(cx + lie3.x * up, gy + lie3.y * up, cz + lie3.z * up);
      dead.group.quaternion.copy(q1);
      dead.group.scale.setScalar(dead.role.size);
      dead.group.updateMatrixWorld(true);
      ctx.rig.setDisc(discs, HUDDLE.length + CROSSING, cx, cz, 1.5 * dead.role.size, 0.8);
      void CARCASS;
    },
    beforeSample: (renderer, camera) => {
      renderer.getDrawingBufferSize(size);
      pixel.value = 2 / ((camera.projectionMatrix.elements[5] as number) * (height || size.y || 2160));
    },
    resize: (_w, h) => {
      height = h;
    },
  };
}
