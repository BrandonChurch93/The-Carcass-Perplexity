// The ridge-runners: the herd sheltering in the canal, the ones still crossing the saddle, and the one the lightning found.
// An animal is one skin taken from the shape of its pose (skin.ts), a coat of locks in clumps rooted on it, claws, and a beard of tendrils
// where a face would be. Everything it does is worked out from the seconds of the place: the bones on the processor, the coat and the
// tendrils in the vertex shader.
import * as THREE from 'three';
import type { Vec3 } from '../../../core/cameras';
import type { Context, Piece } from '../shared/context';
import { CANAL_KEY, CANAL_KEY_AT, INSIDE_FROM, RAD, canalFar, carcassAxis, carcassBody, carcassView, step, trail, tube } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import { FLOOR, MOUTH_S, first, frameAt, world } from '../ridge';
import { flashAt } from '../strikes/bolt';
import { LOCK_FRAGMENT, LOCK_VERTEX, SKIN_FRAGMENT, SKIN_VERTEX, TENDRIL_FRAGMENT, TENDRIL_VERTEX } from './material';
import { scorch } from './scorch';
import { BONES, claws, coat, lockGeometry, skin, tendrilGeometry, type Joints, type LegPose, type Pose, type Skin, type V3 } from './skin';

export const PARTS: readonly string[] = ['ridge-runners'];

type Act = 'stand' | 'sit' | 'lie' | 'walk' | 'dead';

interface Role {
  act: Act;
  pose: Pose;
  size: number;
  /** The size of the cells its skin is taken on, metres, and the clumps of its coat. */
  cell: number;
  clumps: number;
  long: number;
  /** Its coat's colour, scene linear. */
  tone: [number, number, number];
  phase: number;
  inside: boolean;
  burn: [number, number, number, number];
  tendrils: number;
}

interface Animal {
  role: Role;
  group: THREE.Group;
  joints: Joints;
  bones: THREE.Matrix4[];
  ground: THREE.Vector4;
  coat: THREE.Vector4;
  writhe: THREE.Vector4;
}

const leg = (u: number, us: number, l: number, ls: number, p: number, ps = 0.05): LegPose => ({ upper: [u, us], lower: [l, ls], paw: [p, ps] });

// Standing square, head hung low out of the wind.
const STAND: Pose = { roll: 0, pitch: 0, slack: 1, curl: 0, neck: [-0.5, 0], head: [-0.55, 0], legs: [leg(-0.12, 0.03, 0.1, 0, 1.35), leg(-0.1, 0.03, 0.12, 0, 1.35), leg(0.32, 0.04, -0.36, 0, 1.35), leg(0.28, 0.04, -0.33, 0, 1.35)] };
// Standing at the mouth, looking out: the head up a little, one forefoot ahead.
const WATCH: Pose = { roll: 0, pitch: 0.03, slack: 1, curl: 0.1, neck: [-0.2, 0.15], head: [-0.75, 0.1], legs: [leg(0.1, 0.03, 0.12, 0, 1.3), leg(-0.2, 0.03, 0.1, 0, 1.35), leg(0.22, 0.04, -0.3, 0, 1.35), leg(0.4, 0.04, -0.4, 0, 1.35)] };
// Sitting up on its haunches against the wall, forelegs straight under the chest, the beard hanging before it.
const SIT: Pose = { roll: 0.06, pitch: 0.62, slack: 1, curl: 0.15, neck: [-0.6, 0.1], head: [-0.75, 0.05], legs: [leg(-0.5, 0.06, -0.62, 0, 0.8), leg(-0.55, 0.06, -0.58, 0, 0.8), leg(0.75, 0.5, -1.9, 0.3, 0.9), leg(0.75, 0.5, -1.9, 0.3, 0.9)] };
// Lying on its chest, curled, legs folded under, forepaws out before it, the head down on them.
const LIE: Pose = { roll: 0.12, pitch: 0, slack: 0.95, curl: 0.7, neck: [-0.35, 0.5], head: [-0.4, 0.4], legs: [leg(1.1, 0.3, 1.45, 0.1, 1.5), leg(1.2, 0.35, 1.5, 0.1, 1.5), leg(1.2, 0.5, -1.3, 0.3, 1.4), leg(1.25, 0.55, -1.2, 0.3, 1.4)] };
const LIE2: Pose = { roll: -0.18, pitch: 0.05, slack: 0.95, curl: -0.5, neck: [-0.15, -0.3], head: [-0.7, -0.2], legs: [leg(1.2, 0.35, 1.5, 0.1, 1.5), leg(0.9, 0.3, 1.4, 0.1, 1.5), leg(1.25, 0.55, -1.2, 0.3, 1.4), leg(1.2, 0.5, -1.3, 0.3, 1.4)] };
// The dead one: on its right side, stiff, the four legs straight out toward the lens, the upper pair held off the ground as it froze, the
// neck stretched along the ground.
const DEAD: Pose = {
  roll: 1.32,
  pitch: 0,
  slack: 0.9,
  curl: -0.12,
  neck: [-0.15, -0.1],
  head: [-0.2, -0.15],
  legs: [leg(0.35, 0.22, 0.25, 0, 0.9, 0), leg(-0.25, 0.02, 0.45, 0, 0.8, 0), leg(-0.2, 0.28, -0.45, 0, 0.9, 0), leg(0.3, 0.02, -0.7, 0, 0.8, 0)],
};
/** How far the dead one is turned from square on to the lens, radians: enough that its legs are seen along their length. */
const DEAD_TURN = 0.3;

const BARE = false;
// The ground owner now draws the burned rock under the dead one (scorchfield); this folder's own sheet is kept but not drawn.
const SCORCH = false;
/** Where the dead one lies: right of the middle of the key's frame and a little back from the lens, its head toward the wet rock. */
const BODY_AT = step(step(carcassBody, carcassAxis, 0.35), carcassView, -0.1);
const m2 = new THREE.Matrix4();
const m3 = new THREE.Matrix4();
const q1 = new THREE.Quaternion();
const e1 = new THREE.Euler();
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);

/** A turn about a point of the animal, with a shift after it. */
function about(out: THREE.Matrix4, pivot: V3, rx: number, ry: number, rz: number, shift?: V3, scale: THREE.Vector3 = ONE): THREE.Matrix4 {
  q1.setFromEuler(e1.set(rx, ry, rz, 'YXZ'));
  out.compose(v1.set(pivot[0] + (shift ? shift[0] : 0), pivot[1] + (shift ? shift[1] : 0), pivot[2] + (shift ? shift[2] : 0)), q1, scale);
  m2.makeTranslation(-pivot[0], -pivot[1], -pivot[2]);
  return out.multiply(m2);
}

/** A leg whose foot stays where it stands while its top goes with the trunk by (dx, dz): a lean of the whole leg. */
function lean(out: THREE.Matrix4, top: V3, dx: number, dz: number): THREE.Matrix4 {
  return out.set(1, dx / top[1], 0, 0, 0, 1, 0, 0, 0, dz / top[1], 1, 0, 0, 0, 0, 1);
}

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function create(ctx: Context): Piece {
  const rng = ctx.rng('runners');
  const strip = lockGeometry(5);
  const tendril = tendrilGeometry();
  const shagColour = ctx.assets.texture('mat/shag.jpg', { kind: 'colour', anisotropy: 4 });
  const shagData = ctx.assets.texture('mat/shag-nh.png', { kind: 'data', anisotropy: 4 });
  const lockPicture = ctx.assets.texture('mat/lock.jpg', { kind: 'colour', repeat: false, anisotropy: 4 });
  const burnPicture = ctx.assets.texture('mat/burn.jpg', { kind: 'colour', repeat: false, anisotropy: 4 });
  const door = new THREE.Vector4(canalFar[0], canalFar[1], canalFar[2], 1);
  const open = new THREE.Vector4(0, 0, 0, 0);
  const part = new THREE.Group();
  const skins = new Map<string, { body: Skin; claws: THREE.BufferGeometry }>();
  const skinOf = (pose: Pose, cell: number): { body: Skin; claws: THREE.BufferGeometry } => {
    const key = `${JSON.stringify(pose)}|${cell}`;
    let s = skins.get(key);
    if (!s) {
      const body = skin(pose, cell);
      s = { body, claws: claws(body.joints) };
      skins.set(key, s);
    }
    return s;
  };

  const make = (role: Role): Animal => {
    const bones = Array.from({ length: BONES }, () => new THREE.Matrix4());
    const ground = new THREE.Vector4(0, 0, 0, 0);
    const coatSet = new THREE.Vector4(1, 0.1, 0.0, 0);
    const writhe = new THREE.Vector4(1, 0, 0, 0);
    const { body, claws: horn } = skinOf(role.pose, role.cell);
    const j = body.joints;
    const shared = {
      ...ctx.rig.uniforms,
      uBones: { value: bones },
      uBurn: { value: new THREE.Vector4(...role.burn) },
      uGround: { value: ground },
      uDoor: { value: role.inside ? door : open },
      uDoorArea: { value: 420 },
      uDoorGain: { value: 3 },
      uCoat: { value: coatSet },
      tShag: { value: shagColour },
      tShagData: { value: shagData },
      tLock: { value: lockPicture },
      tBurn: { value: burnPicture },
      uBurnU: { value: new THREE.Vector3(j.fwd[0], j.fwd[1], j.fwd[2]) },
      uBurnV: { value: new THREE.Vector3(j.up[0], j.up[1], j.up[2]) },
      uTone: { value: new THREE.Vector4(role.tone[0], role.tone[1], role.tone[2], rng.next()) },
      uFace: { value: new THREE.Vector4(j.face[0], j.face[1], j.face[2], 0) },
      uLead: { value: new THREE.Vector4(j.lead[0], j.lead[1], j.lead[2], 0) },
      uWrithe: { value: writhe },
    };
    const group = new THREE.Group();
    const hide = new THREE.ShaderMaterial({ vertexShader: SKIN_VERTEX, fragmentShader: SKIN_FRAGMENT, uniforms: shared });
    const skinMesh = new THREE.Mesh(body.geometry, hide);
    // The coat is drawn first: it hides nearly all of the skin, which then costs nothing.
    skinMesh.renderOrder = 2;
    group.add(skinMesh);
    const hornMesh = new THREE.Mesh(horn, hide);
    hornMesh.renderOrder = 2;
    group.add(hornMesh);

    // The wind in the animal's own frame is set when it is placed; the coat is combed back along the body and a little down the gale.
    const c = coat(body, rng, { clumps: role.clumps, locks: 4, long: role.long, burn: role.burn, wind: role.act === 'dead' ? [-0.25, 0, 0.3] : [-0.35, 0, 0] });
    const locks = new THREE.InstancedBufferGeometry();
    locks.index = strip.index;
    locks.setAttribute('position', strip.getAttribute('position'));
    locks.setAttribute('aRoot', new THREE.InstancedBufferAttribute(c.root, 3));
    locks.setAttribute('aCtrl', new THREE.InstancedBufferAttribute(c.ctrl, 3));
    locks.setAttribute('aTip', new THREE.InstancedBufferAttribute(c.tip, 3));
    locks.setAttribute('aCard', new THREE.InstancedBufferAttribute(c.card, 4));
    locks.setAttribute('aLockBones', new THREE.InstancedBufferAttribute(c.bones, 4));
    locks.instanceCount = c.count;
    locks.boundingSphere = body.geometry.boundingSphere;
    const lockMesh = new THREE.Mesh(locks, new THREE.ShaderMaterial({ vertexShader: LOCK_VERTEX, fragmentShader: LOCK_FRAGMENT, uniforms: shared, side: THREE.DoubleSide }));
    lockMesh.renderOrder = 1;
    lockMesh.visible = !BARE;
    group.add(lockMesh);

    const count = role.tendrils;
    const thin = role.act === 'dead' ? 1.1 : 1;
    const hang = new Float32Array(count * 4);
    const limb = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = 0.07 * Math.sqrt(rng.next());
      hang.set([r * Math.cos(a), r * Math.sin(a), Math.sin(a) * rng.range(0.3, 0.9), rng.range(-1, 1)], i * 4);
      // A few long thick ones, many thin ones.
      const big = rng.next() < 0.3;
      limb.set([big ? rng.range(0.5, 0.72) : rng.range(0.26, 0.5), thin * (big ? rng.range(0.022, 0.03) : rng.range(0.011, 0.019)), rng.range(0.2, 1), rng.next()], i * 4);
    }
    const beard = new THREE.InstancedBufferGeometry();
    beard.index = tendril.index;
    beard.setAttribute('position', tendril.getAttribute('position'));
    beard.setAttribute('aHang', new THREE.InstancedBufferAttribute(hang, 4));
    beard.setAttribute('aLimb', new THREE.InstancedBufferAttribute(limb, 4));
    beard.instanceCount = count;
    beard.boundingSphere = body.geometry.boundingSphere;
    group.add(new THREE.Mesh(beard, new THREE.ShaderMaterial({ vertexShader: TENDRIL_VERTEX, fragmentShader: TENDRIL_FRAGMENT, uniforms: shared, side: THREE.DoubleSide })));
    part.add(group);
    return { role, group, joints: j, bones, ground, coat: coatSet, writhe };
  };

  const NONE: [number, number, number, number] = [0, 0, 0, 0];
  const cream = (): [number, number, number] => {
    const k = rng.range(0.85, 1.1);
    const warm = rng.range(0, 1);
    return [0.84 * k, (0.71 - 0.03 * warm) * k, (0.5 - 0.07 * warm) * k];
  };

  // The herd in the canal, along its left wall, out of the wind: where, which way it faces, and what it does.
  const along = Math.atan2(-frameAt(MOUTH_S + CANAL_KEY).tz, frameAt(MOUTH_S + CANAL_KEY).tx);
  const HUDDLE: { d: number; l: number; yaw: number; act: Act; pose: Pose; size: number }[] = [
    { d: CANAL_KEY + 7.5, l: -1.0, yaw: along - 0.3, act: 'stand', pose: WATCH, size: 1.15 },
    { d: CANAL_KEY + 2.9, l: -1.75, yaw: along + 2.5, act: 'lie', pose: LIE, size: 1.2 },
    { d: CANAL_KEY + 3.7, l: -2.15, yaw: along + 2.0, act: 'sit', pose: SIT, size: 1.2 },
    { d: CANAL_KEY + 4.3, l: -1.5, yaw: along + 2.8, act: 'lie', pose: LIE2, size: 1.15 },
    { d: CANAL_KEY + 5.1, l: -2.1, yaw: along + 1.7, act: 'sit', pose: SIT, size: 1.1 },
    { d: CANAL_KEY + 5.6, l: -1.45, yaw: along + 0.6, act: 'lie', pose: LIE, size: 1.05 },
  ];


  const huddle = HUDDLE.map((h, i) => make({ act: h.act, pose: h.pose, size: h.size, cell: 0.018, clumps: 1000, long: 1, tone: cream(), phase: i * 1.9 + 0.4, inside: true, burn: NONE, tendrils: 34 }));
  const CROSSING = 4;
  const crossing = Array.from({ length: CROSSING }, (_, i) => make({ act: 'walk', pose: STAND, size: rng.range(0.9, 1.15), cell: 0.04, clumps: 260, long: 1, tone: cream(), phase: i * 0.37 + rng.next(), inside: false, burn: NONE, tendrils: 12 }));
  // The scorched one: on its side, the bolt's way burned into its upper flank behind the shoulder.
  const deadSkin = skinOf(DEAD, 0.016).body;
  const dj = deadSkin.joints;
  const wd = (d: 0 | 1 | 2): number => (dj.chest[d] as number) - 0.22 * (dj.fwd[d] as number) - 0.1 * (dj.up[d] as number) - 0.2 * (dj.right[d] as number);
  const wound: [number, number, number, number] = [wd(0), wd(1), wd(2), 0.34];
  const dead = make({ act: 'dead', pose: DEAD, size: 1.05, cell: 0.016, clumps: 2400, long: 0.8, tone: [0.92, 0.77, 0.52], phase: 0, inside: false, burn: wound, tendrils: 110 });

  const burned = scorch(ctx);
  burned.drape();
  if (SCORCH) part.add(burned.mesh);
  ctx.scene.add(ctx.parts.built('ridge-runners', part));

  const discs = ctx.rig.contactDiscs(HUDDLE.length + CROSSING + 1);
  const place = (a: Animal, at: Vec3, yaw: number): void => {
    q1.setFromEuler(e1.set(0, yaw, 0, 'YXZ'));
    a.group.position.set(at[0], at[1], at[2]);
    a.group.quaternion.copy(q1);
    a.group.scale.setScalar(a.role.size);
    a.group.updateMatrixWorld(true);
  };
  const still = (a: Animal): void => {
    for (const b of a.bones) b.identity();
  };

  /** What a living animal does where it rests: it breathes, its neck and head swing slowly, and a standing one shifts its weight from side
   * to side over planted feet. `look` turns the head (radians), `shiver` shakes the coat. */
  const idle = (a: Animal, t: number, look: number, shiver: number): void => {
    const ph = a.role.phase;
    const j = a.joints;
    still(a);
    const breath = Math.sin(t * 2.5 + ph) + 0.25 * Math.sin(t * 5.0 + ph * 2);
    const standing = a.role.act === 'stand';
    const sway = standing ? 0.05 * Math.sin(t * 1.05 + ph * 3) + 0.018 * Math.sin(t * 2.3 + ph) : 0;
    const fore = standing ? 0.03 * Math.sin(t * 0.7 + ph * 2) : 0;
    const settle = 0.012 * Math.sin(t * 0.9 + ph * 2);
    (a.bones[0] as THREE.Matrix4).makeTranslation(fore, settle - 0.004 * breath, sway);
    about(a.bones[1] as THREE.Matrix4, j.chest, sway * 0.5, 0, 0.012 * breath, [fore, settle, sway], v2.set(1 + 0.012 * breath, 1 + 0.035 * breath, 1 + 0.05 * breath));
    if (standing)
      for (let i = 0; i < 4; i++) {
        lean(a.bones[4 + i] as THREE.Matrix4, j.tops[i] as V3, fore, sway);
        (a.bones[8 + i] as THREE.Matrix4).copy(a.bones[4 + i] as THREE.Matrix4);
      }
    const ny = 0.16 * Math.sin(t * 0.83 + ph * 2) + 0.07 * Math.sin(t * 1.9 + ph) + look;
    const nz = 0.09 * Math.sin(t * 1.17 + ph) - 0.03;
    about(a.bones[2] as THREE.Matrix4, j.chest, 0.06 * Math.sin(t * 0.6 + ph), ny, nz, [fore, settle, sway]);
    about(m3, j.head, 0.1 * Math.sin(t * 1.3 + ph * 3), 0.12 * Math.sin(t * 1.1 + ph * 5) + 0.6 * look, 0.1 * Math.sin(t * 0.77 + ph * 4));
    (a.bones[3] as THREE.Matrix4).copy(a.bones[2] as THREE.Matrix4).multiply(m3);
    a.coat.set(1, a.role.inside ? 0.12 : 0.5, shiver, a.role.inside ? 0.12 : 0.1);
    a.writhe.set(a.role.act === 'lie' ? 0.6 : 1, 0, 0, 0);
  };

  /** A walk in which each foot stands still on the ground while the trunk goes over it. `dist` is metres gone, `speed` metres a second. */
  const STRIDE = 0.5;
  const DUTY = 0.62;
  const OFFSETS = [0.5, 0, 0.75, 0.25];
  const walk = (a: Animal, dist: number, speed: number): void => {
    const j = a.joints;
    still(a);
    const cycle = dist / (2 * STRIDE * a.role.size) + a.role.phase;
    const go = Math.min(1, speed / 0.5);
    const bob = 0.02 * Math.cos(cycle * 4 * Math.PI) * go;
    // The trunk goes over to the side whose feet are down, and rolls with it; the shoulders and the hips work against each other.
    const swayZ = 0.04 * Math.sin(cycle * 2 * Math.PI + 0.6) * go;
    const twist = 0.07 * Math.sin(cycle * 2 * Math.PI) * go;
    about(a.bones[0] as THREE.Matrix4, j.hip, swayZ * 1.2, -twist, 0.025 * Math.sin(cycle * 4 * Math.PI + 1) * go, [0, bob, swayZ]);
    about(a.bones[1] as THREE.Matrix4, j.chest, swayZ * 1.2, twist, -0.02 * Math.sin(cycle * 4 * Math.PI + 1) * go, [0, bob, swayZ]);
    for (let i = 0; i < 4; i++) {
      const top = j.tops[i] as V3;
      const knee = j.knees[i] as V3;
      const p = (((cycle + (OFFSETS[i] as number)) % 1) + 1) % 1;
      let x: number;
      let lift = 0;
      if (p < DUTY) x = STRIDE * (0.5 - p / DUTY);
      else {
        const k = (p - DUTY) / (1 - DUTY);
        x = STRIDE * (-0.5 + k * k * (3 - 2 * k));
        lift = Math.sin(Math.PI * k);
      }
      // The whole leg swings about its top to carry the foot x ahead of where it rests, and stretches so that a foot on the ground stays
      // on it; in the air the lower leg folds and the foot comes up.
      const swing = Math.atan2(x * go, top[1]);
      const upper = a.bones[4 + i] as THREE.Matrix4;
      about(upper, top, 0, 0, swing, [0, bob, swayZ], v2.set(1, (1 / Math.cos(swing)) * (1 - 0.1 * lift * go), 1));
      about(m3, knee, 0, 0, -0.75 * lift * go * (i < 2 ? -1 : 1));
      (a.bones[8 + i] as THREE.Matrix4).copy(upper).multiply(m3);
    }
    about(a.bones[2] as THREE.Matrix4, j.chest, 0, 0.05 * Math.sin(cycle * 2 * Math.PI), 0.05 * Math.sin(cycle * 4 * Math.PI + 0.8) * go, [0, bob, swayZ]);
    about(m3, j.head, 0, 0, 0.06 * Math.sin(cycle * 4 * Math.PI + 1.6) * go);
    (a.bones[3] as THREE.Matrix4).copy(a.bones[2] as THREE.Matrix4).multiply(m3);
    a.coat.set(1, 0.6, 0, 0.1);
    a.writhe.set(1, 0, 0, 0);
  };

  still(dead);
  dead.coat.set(1, 0.35, 0.0, 0.12);
  dead.writhe.set(0, 1, 0, 0);
  const UP = new THREE.Vector3(0, 1, 0);
  const lie3 = new THREE.Vector3();
  const tilt = new THREE.Quaternion();

  const walked = (u: number): number => (u < -0.8 ? 0 : u < 0.4 ? 0.79 * (u + 0.8) ** 2 : 1.14 + 1.9 * (u - 0.4));

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
        place(a, [at[0], FLOOR, at[2]], i === 0 ? h.yaw + (along - h.yaw) * smooth(-0.8, 1.4, seconds - CANAL_KEY_AT) : h.yaw);
        if (i === 0 && gone > 0.002) {
          const u = seconds - CANAL_KEY_AT;
          walk(a, gone, u < 0.4 ? 1.58 * (u + 0.8) : 1.9);
        } else idle(a, seconds, 0.3 * start * (i % 2 ? 1 : -1), 0.012 * start);
        ctx.rig.setDisc(discs, i, at[0], at[2], 1.1 * a.role.size, 0.75);
      });

      crossing.forEach((a, i) => {
        a.group.visible = !inCanal;
        if (!a.group.visible) return;
        const end = MOUTH_S + 14 - i * 3;
        const free = first.s - 330 + 2.6 * seconds - i * 7;
        const s = Math.min(free, end);
        const l = trail(s);
        const w = world(s, l, 0);
        const y = ctx.rig.land.height(w[0], w[2]);
        const p = world(s, l, y);
        const ahead = world(s + 1, trail(s + 1), 0);
        a.ground.x = y;
        place(a, p, Math.atan2(-(ahead[2] - p[2]), ahead[0] - p[0]));
        if (free < end) walk(a, s - (first.s - 330), 2.6);
        else idle(a, seconds, 0, 0);
        ctx.rig.setDisc(discs, HUDDLE.length + i, p[0], p[2], 1.0 * a.role.size, 0.7);
      });

      // The dead one lies on the land as it is there: the slope under it turns it, so nothing of it hangs in the air or is under the snow.
      const cx = BODY_AT[0];
      const cz = BODY_AT[2];
      const E = 0.8;
      const land = ctx.rig.land;
      const sx = (land.height(cx + E, cz) - land.height(cx - E, cz)) / (2 * E);
      const sz = (land.height(cx, cz + E) - land.height(cx, cz - E)) / (2 * E);
      const gy = 0.5 * land.height(cx, cz) + 0.125 * (land.height(cx + E, cz) + land.height(cx - E, cz) + land.height(cx, cz + E) + land.height(cx, cz - E));
      dead.ground.set(gy - sx * cx - sz * cz, sx, sz, 0);
      lie3.set(-sx, 1, -sz).normalize();
      tilt.setFromUnitVectors(UP, lie3);
      q1.setFromEuler(e1.set(0, -(carcassAxis + 180) * RAD + DEAD_TURN, 0, 'YXZ')).premultiply(tilt);
      dead.group.position.set(cx, gy, cz);
      dead.group.quaternion.copy(q1);
      dead.group.scale.setScalar(dead.role.size);
      dead.group.updateMatrixWorld(true);
      ctx.rig.setDisc(discs, HUDDLE.length + CROSSING, cx, cz, 1.5 * dead.role.size, 0.8);
    },
  };
}
