// The ridge-runners: the herd sheltering in the canal, the ones still crossing the saddle, and the one the lightning found.
// An animal is one skin taken from the shape of its pose (skin.ts), a coat of locks in clumps rooted on it, claws, and a beard of tendrils
// where a face would be. Everything it does is worked out from the seconds of the place: the bones on the processor, the coat and the
// tendrils in the vertex shader.
import * as THREE from 'three';
import type { Vec3 } from '../../../core/cameras';
import type { Context, Piece, SteamSource } from '../shared/context';
import { CANAL_KEY, CANAL_KEY_AT, INSIDE_FROM, MOUTH, RAD, WIND, canalFar, carcassAxis, carcassBody, carcassView, step, trail, tube } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import { FLOOR, MOUTH_S, canalL, first, flare, frameAt, locate, world } from '../ridge';
import { floorRise } from '../land/meshes';
import { flashAt } from '../strikes/bolt';
import { BURN_NARROW, LOCK_FRAGMENT, LOCK_VERTEX, MARK_FRAGMENT, MARK_VERTEX, SKIN_FRAGMENT, SKIN_VERTEX, TENDRIL_FRAGMENT, TENDRIL_VERTEX } from './material';
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
// Sitting with the head up and turned to the mouth.
const SITUP: Pose = { roll: 0.06, pitch: 0.62, slack: 1, curl: 0.15, neck: [-0.1, 0.5], head: [-0.3, 0.4], legs: [leg(-0.5, 0.06, -0.62, 0, 0.8), leg(-0.55, 0.06, -0.58, 0, 0.8), leg(0.75, 0.5, -1.9, 0.3, 0.9), leg(0.75, 0.5, -1.9, 0.3, 0.9)] };
// Lying the other way round, the head lifted off the paws.
const LIE2: Pose = { roll: -0.18, pitch: 0.05, slack: 0.95, curl: -0.5, neck: [0.25, -0.5], head: [-0.3, -0.4], legs: [leg(1.2, 0.35, 1.5, 0.1, 1.5), leg(0.9, 0.3, 1.4, 0.1, 1.5), leg(1.25, 0.55, -1.2, 0.3, 1.4), leg(1.2, 0.5, -1.3, 0.3, 1.4)] };
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

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function create(ctx: Context): Piece {
  const rng = ctx.rng('runners');
  const strip = lockGeometry(5);
  const tendril = tendrilGeometry();
  // The dead one's are seen close: round, and bent in many places.
  const tendrilFine = tendrilGeometry(10, 44);
  const shagColour = ctx.assets.texture('mat/shag.jpg', { kind: 'colour', anisotropy: 4 });
  const shagData = ctx.assets.texture('mat/shag-nh.png', { kind: 'data', anisotropy: 4 });
  const lockPicture = ctx.assets.texture('mat/lock.jpg', { kind: 'colour', repeat: false, anisotropy: 4 });
  const lockFine = ctx.assets.texture('mat/lock-b.jpg', { kind: 'colour', repeat: false, anisotropy: 4 });
  const lockFineCut = ctx.assets.texture('mat/lock-b-a.png', { kind: 'data', repeat: false, anisotropy: 4 });
  const burnPicture = ctx.assets.texture('mat/burn.jpg', { kind: 'colour', repeat: false, anisotropy: 4 });
  const door = new THREE.Vector4(canalFar[0], canalFar[1], canalFar[2], 1);
  const open = new THREE.Vector4(0, 0, 0, 0);
  const near = new THREE.Vector3(MOUTH[0], MOUTH[1], MOUTH[2]);
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
      uDoorGain: { value: 20 },
      uDoorNear: { value: near },
      uCoat: { value: coatSet },
      tShag: { value: shagColour },
      tShagData: { value: shagData },
      tLock: { value: lockPicture },
      tLockB: { value: lockFine },
      tLockBA: { value: lockFineCut },
      uLockKind: { value: role.inside ? 1 : 0 },
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
    // The dead one lies on its right side: the coat of that side is under it, in the snow, and is not grown.
    const under = role.act === 'dead' ? (_p: [number, number, number], n: [number, number, number]): boolean => n[0] * (j.right[0] as number) + n[1] * (j.right[1] as number) + n[2] * (j.right[2] as number) > 0.45 : undefined;
    const c = coat(body, rng, { clumps: role.clumps, locks: 4, long: role.long, burn: role.burn, hang: role.inside ? (role.act === 'stand' ? 0.55 : 0.9) : 0, wind: role.act === 'dead' ? [-0.25, 0, 0.3] : [-0.35, 0, 0], skip: under, burnAxis: [j.fwd[0] as number, j.fwd[1] as number, j.fwd[2] as number], burnNarrow: BURN_NARROW });
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
    group.add(lockMesh);

    const count = role.tendrils;
    const thin = role.act === 'dead' ? 0.36 : 1;
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
    const limbShape = role.act === 'dead' ? tendrilFine : tendril;
    beard.index = limbShape.index;
    beard.setAttribute('position', limbShape.getAttribute('position'));
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
    return [0.86 * k, (0.8 - 0.02 * warm) * k, (0.7 - 0.05 * warm) * k];
  };

  // In the canal the coats are the colour of the wall they lie against: dimmer, a little warmer.
  const dim = (c: [number, number, number], k: number, warm = 0): [number, number, number] => [c[0] * (0.72 + 0.09 * warm) * k, c[1] * 0.75 * k, c[2] * (0.82 - 0.09 * warm) * k];
  // The herd in the canal, along its left wall, out of the wind: where, which way it faces, and what it does.
  const along = Math.atan2(-frameAt(MOUTH_S + CANAL_KEY).tz, frameAt(MOUTH_S + CANAL_KEY).tx);
  const HUDDLE: { d: number; l: number; yaw: number; act: Act; pose: Pose; size: number }[] = [
    // The standing one, against the far mouth; then the huddle along the wall, the nearest at the lens's left hand.
    { d: CANAL_KEY + 4.3, l: -0.85, yaw: along - 1.1, act: 'stand', pose: WATCH, size: 1.45 },
    { d: CANAL_KEY + 1.7, l: -1.6, yaw: along + 2.4, act: 'lie', pose: LIE, size: 1.25 },
    { d: CANAL_KEY + 2.6, l: -2.7, yaw: along + 1.9, act: 'sit', pose: SITUP, size: 1.3 },
    { d: CANAL_KEY + 3.3, l: -1.9, yaw: along + 2.8, act: 'lie', pose: LIE2, size: 1.2 },
    { d: CANAL_KEY + 4.0, l: -2.9, yaw: along + 1.6, act: 'sit', pose: SIT, size: 1.2 },
    { d: CANAL_KEY + 4.9, l: -2.3, yaw: along + 0.6, act: 'lie', pose: LIE, size: 1.1 },
  ];


  const huddle = HUDDLE.map((h, i) => make({ act: h.act, pose: h.pose, size: h.size, cell: 0.018, clumps: 420, long: h.act === 'stand' ? 0.95 : 1, tone: dim(cream(), h.act === 'stand' ? 1.75 : 1.05, h.act === 'stand' ? 0 : 0.5), phase: i * 1.9 + 0.4, inside: true, burn: NONE, tendrils: 34 }));
  // The walkers on the ridge trail are off: far in the wide lens one of them stood for a person, and the approved wide has the trail alone.
  const WALKERS = false;
  const CROSSING = WALKERS ? 4 : 0;
  const crossing = Array.from({ length: CROSSING }, (_, i) => make({ act: 'walk', pose: STAND, size: rng.range(0.9, 1.15), cell: 0.04, clumps: 260, long: 1, tone: cream(), phase: i * 0.37 + rng.next(), inside: false, burn: NONE, tendrils: 12 }));
  // The scorched one: on its side, the bolt's way burned into its upper flank behind the shoulder.
  const deadSkin = skinOf(DEAD, 0.022).body;
  const dj = deadSkin.joints;
  const wd = (d: 0 | 1 | 2): number => (dj.chest[d] as number) - 0.22 * (dj.fwd[d] as number) - 0.1 * (dj.up[d] as number) - 0.2 * (dj.right[d] as number);
  const wound: [number, number, number, number] = [wd(0), wd(1), wd(2), 0.34];
  const dead = make({ act: 'dead', pose: DEAD, size: 1.05, cell: 0.022, clumps: 1400, long: 0.8, tone: [0.92, 0.77, 0.52], phase: 0, inside: false, burn: wound, tendrils: 110 });

  // What the one that walks does to the floor: the dark under each foot that is down, the prints where it stood, and the snow a foot
  // kicks up as it leaves. Flat on the floor, or turned to the lens for the snow.
  const PRINTS = 5;
  const PER_FOOT = 3 + PRINTS;
  const MARKS = 4 * PER_FOOT + 2;
  const markAt = new Float32Array(MARKS * 4);
  const markLook = new Float32Array(MARKS * 4);
  const markAtAttribute = new THREE.InstancedBufferAttribute(markAt, 4);
  const markLookAttribute = new THREE.InstancedBufferAttribute(markLook, 4);
  markAtAttribute.setUsage(THREE.DynamicDrawUsage);
  markLookAttribute.setUsage(THREE.DynamicDrawUsage);
  const card = new THREE.PlaneGeometry(2, 2);
  const marks = new THREE.InstancedBufferGeometry();
  marks.index = card.index;
  marks.setAttribute('position', card.getAttribute('position'));
  marks.setAttribute('aAt', markAtAttribute);
  marks.setAttribute('aLook', markLookAttribute);
  marks.instanceCount = MARKS;
  const markMesh = new THREE.Mesh(marks, new THREE.ShaderMaterial({ vertexShader: MARK_VERTEX, fragmentShader: MARK_FRAGMENT, uniforms: ctx.rig.uniforms, side: THREE.DoubleSide, transparent: true, premultipliedAlpha: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  markMesh.frustumCulled = false;
  markMesh.renderOrder = 3;
  part.add(markMesh);

  ctx.scene.add(ctx.parts.built('ridge-runners', part));

  const discs = ctx.rig.contactDiscs(HUDDLE.length + CROSSING + 1 + 4);
  const FOOT_DISC = HUDDLE.length + CROSSING + 1;
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
  const idle = (a: Animal, t: number, look: number, shiver: number, start = 0, calm = 1): void => {
    const ph = a.role.phase;
    const j = a.joints;
    still(a);
    const breath = Math.sin(t * 2.5 + ph) + 0.25 * Math.sin(t * 5.0 + ph * 2);
    const standing = a.role.act === 'stand';
    // A standing one carries its weight from one side to the other and back, slowly, and never evenly.
    const sway = calm * (standing ? 0.13 * Math.sin(t * 0.9 + ph * 3 + 0.8 * Math.sin(t * 0.37 + ph)) + 0.035 * Math.sin(t * 2.3 + ph) : 0.02 * Math.sin(t * 0.8 + ph * 3));
    const fore = standing ? calm * 0.08 * Math.sin(t * 0.6 + ph * 2) - 0.06 * start : 0;
    // At a flash it drops: a flinch of the whole body, and it comes up again slowly.
    const settle = 0.012 * Math.sin(t * 0.9 + ph * 2) - (standing ? 0.05 : 0.025) * start;
    (a.bones[0] as THREE.Matrix4).makeTranslation(fore, settle - 0.004 * breath, sway);
    about(a.bones[1] as THREE.Matrix4, j.chest, sway * 0.5, 0, 0.012 * breath, [fore, settle, sway], v2.set(1 + 0.015 * breath, 1 + 0.05 * breath, 1 + 0.07 * breath));
    // Each lifts its head in its own time, holds it, and lets it down again; a standing one drops it to the ice between looks.
    const lift = Math.max(0, Math.sin(t * 0.7 + ph * 1.7)) ** 3;
    const ny = (standing ? 0.3 : 0.2) * Math.sin(t * 0.83 + ph * 2 + 0.7 * Math.sin(t * 0.31 + ph * 4)) + 0.07 * Math.sin(t * 1.9 + ph) + look;
    const nz = 0.09 * Math.sin(t * 1.17 + ph) - 0.03 + (standing ? -0.3 * calm * Math.max(0, Math.sin(t * 0.45 + ph)) ** 2 + 0.3 * start : 0.3 * lift + 0.4 * start);
    about(a.bones[2] as THREE.Matrix4, j.chest, 0.06 * Math.sin(t * 0.6 + ph), ny, nz, [fore, settle, sway]);
    about(m3, j.head, 0.1 * Math.sin(t * 1.3 + ph * 3), 0.12 * Math.sin(t * 1.1 + ph * 5) + 0.6 * look, 0.1 * Math.sin(t * 0.77 + ph * 4));
    (a.bones[3] as THREE.Matrix4).copy(a.bones[2] as THREE.Matrix4).multiply(m3);
    // The gale reaches the one at the mouth in gusts: its coat is blown and falls back.
    a.coat.set(1, a.role.inside ? (standing ? 0.5 + 0.35 * Math.sin(t * 1.3 + 1.1 * Math.sin(t * 0.53)) : 0.14 + 0.06 * Math.sin(t * 0.9 + ph)) : 0.5, shiver, a.role.inside ? (standing ? 0.2 : 0.02) : 0.1);
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

  // Breath: three of the herd breathe out vapour. The air folder draws it; an animal only says where and how much.
  const BREATHERS = [0, 2, 3];
  const breaths: SteamSource[] = BREATHERS.map(() => ({ at: [0, 0, 0], radius: 0.2, strength: 0, rise: 2.4, kind: 'steam', lean: [0, 0] }));
  for (const b of breaths) ctx.sources.steam.push(b);
  const muzzle = new THREE.Vector3();
  const facing = new THREE.Vector3();

  still(dead);
  dead.coat.set(1, 0.75, 0.0, 0.12);
  dead.writhe.set(0, 1, 0, 0);
  const UP = new THREE.Vector3(0, 1, 0);
  const lie3 = new THREE.Vector3();
  const tilt = new THREE.Quaternion();

  // The one at the mouth. Its feet are worked out from where each last came down: a footfall is a place on the floor, fixed from the
  // moment the foot lands until it leaves, and the trunk goes over it on legs that bend. All of it is a function of the metres gone.
  const walker = HUDDLE[0] as (typeof HUDDLE)[number];
  const SIZE = walker.size;
  const PACE = 1.5;
  const EASE = PACE / 1.58 - 0.8;
  const EASED = 0.79 * (EASE + 0.8) ** 2;
  const walked = (u: number): number => (u < -0.8 ? 0 : u < EASE ? 0.79 * (u + 0.8) ** 2 : EASED + PACE * (u - EASE));
  const whenGone = (g: number): number => (g <= 0 ? -0.8 : g < EASED ? Math.sqrt(g / 0.79) - 0.8 : EASE + (g - EASED) / PACE);
  const yawOf = (u: number): number => walker.yaw + (along - walker.yaw) * smooth(-0.8, 1.4, u);
  /** The floor of the canal as the land folder builds it (the rig's land is the ridge over the canal, not its floor). */
  const floorAt = (x: number, z: number): number => {
    const at = locate(x, z);
    const d = at.s - MOUTH_S;
    return FLOOR + 0.03 + floorRise(at.l - canalL(d), d, 0.79 * flare(d) + 0.6);
  };
  /** Metres to a stride once it is under way; it sets out in strides half as long. */
  const STRIDE_M = 0.72 * SIZE;
  const SET_OUT = 0.6;
  /** Strides gone at g metres, and the metres at c strides. Before it sets out it is taken to have come in at its short stride, which is
   * how it stands: stopped in a step, no two feet level. */
  const strides = (g: number): number => (g < 0 ? (2 * g) / STRIDE_M : g / STRIDE_M + (SET_OUT / STRIDE_M) * (1 - Math.exp(-g / SET_OUT)));
  const metres = (c: number): number => {
    if (c <= 0) return (c * STRIDE_M) / 2;
    let lo = 0;
    let hi = c * STRIDE_M;
    for (let i = 0; i < 26; i++) {
      const mid = 0.5 * (lo + hi);
      if (strides(mid) < c) lo = mid;
      else hi = mid;
    }
    return 0.5 * (lo + hi);
  };
  /** Where in its stride each foot is as the animal stands: left fore, right fore, left hind, right hind. A hind foot goes first. */
  const PHASE = [0.51, 0.01, 0.76, 0.26];
  /** The share of a stride a foot is down, by the stride it landed at: more as it sets out, when all four are down between steps. */
  const dutyOf = (landed: number): number => 0.64 + 0.14 * (1 - smooth(0.2, 1.6, landed));
  const wj = (huddle[0] as Animal).joints;
  /** Under each paw, in the animal's frame: where it bears on the ground. And where each foot is set down, under the top of its leg. */
  const soles: V3[] = wj.ankles.map((ankle, i) => {
    const toe = wj.toes[i] as V3;
    return [ankle[0] + 0.35 * (toe[0] - ankle[0]), ankle[1] - 0.055 + 0.35 * (toe[1] - 0.035 - ankle[1] + 0.055), ankle[2] + 0.35 * (toe[2] - ankle[2])];
  });
  const under: [number, number][] = wj.tops.map((top, i) => [top[0] + 0.03, (soles[i] as V3)[2]]);
  const hash = (i: number, n: number): number => {
    const v = Math.sin(i * 127.1 + n * 311.7 + 1.3) * 43758.5453;
    return v - Math.floor(v);
  };
  /** Where foot i stands on the floor in its n-th stance, world metres: under its leg as the trunk is half way over it. */
  const footfall = (i: number, n: number, out: THREE.Vector3): void => {
    const landed = n - (PHASE[i] as number);
    const g = 0.5 * (metres(landed) + metres(landed + dutyOf(landed)));
    const yaw = yawOf(whenGone(g));
    const at = tube(walker.d + g, walker.l, 0);
    const rest = under[i] as [number, number];
    // Under way no two steps are one length or quite in line.
    const loose = landed > 0 ? 1 : 0;
    const fx = (rest[0] + loose * 0.06 * (hash(i, n) - 0.5)) * SIZE;
    const fz = (rest[1] + loose * 0.03 * (hash(n, i + 7) - 0.5)) * SIZE;
    const x = at[0] + Math.cos(yaw) * fx + Math.sin(yaw) * fz;
    const z = at[2] - Math.sin(yaw) * fx + Math.cos(yaw) * fz;
    out.set(x, floorAt(x, z), z);
  };

  const top3 = new THREE.Vector3();
  const knee3 = new THREE.Vector3();
  const way = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const grown = new THREE.Vector3();
  /** Bends leg i at its top and its knee so that its sole stands on `p` (the animal's frame) under the trunk as its bones have it. */
  const reach = (a: Animal, i: number, p: THREE.Vector3): void => {
    const top = a.joints.tops[i] as V3;
    const knee = a.joints.knees[i] as V3;
    const sole = soles[i] as V3;
    const l1 = Math.hypot(knee[0] - top[0], knee[1] - top[1], knee[2] - top[2]);
    const l2 = Math.hypot(sole[0] - knee[0], sole[1] - knee[1], sole[2] - knee[2]);
    top3.set(top[0], top[1], top[2]).applyMatrix4(a.bones[i < 2 ? 1 : 0] as THREE.Matrix4);
    way.copy(p).sub(top3);
    const full = 0.998 * (l1 + l2);
    // A leg at its full length gives a little, as sinew does, before the foot would leave the ground.
    const give = Math.min(1.07, Math.max(1, way.length() / full));
    const far = Math.min(way.length(), full * give);
    way.normalize();
    const along1 = (l1 * l1 * give * give - l2 * l2 * give * give + far * far) / (2 * far);
    const off = Math.sqrt(Math.max(0, l1 * l1 * give * give - along1 * along1));
    // The elbow stands back of the leg's line, the knee of a hind leg ahead of it.
    bend.set(i < 2 ? -1 : 1, 0, 0);
    bend.addScaledVector(way, -bend.dot(way)).normalize();
    knee3.copy(top3).addScaledVector(way, along1).addScaledVector(bend, off);
    grown.set(give, give, give);
    from.set(knee[0] - top[0], knee[1] - top[1], knee[2] - top[2]).normalize();
    to.copy(knee3).sub(top3).normalize();
    qa.setFromUnitVectors(from, to);
    const upper = a.bones[4 + i] as THREE.Matrix4;
    upper.compose(top3, qa, grown).multiply(m2.makeTranslation(-top[0], -top[1], -top[2]));
    from.set(sole[0] - knee[0], sole[1] - knee[1], sole[2] - knee[2]).normalize().applyQuaternion(qa);
    to.copy(top3).addScaledVector(way, far).sub(knee3).normalize();
    qb.setFromUnitVectors(from, to).multiply(qa);
    (a.bones[8 + i] as THREE.Matrix4).compose(knee3, qb, grown).multiply(m2.makeTranslation(-knee[0], -knee[1], -knee[2]));
  };

  const m4 = new THREE.Matrix4();
  const m5 = new THREE.Matrix4();
  /** The trunk under way, at c strides: it sinks onto bent legs, goes over to the forefoot that carries, the shoulder over that foot stands
   * up and the hip over the carrying hind foot, and the head nods to each forefoot as it lands. */
  const carry = (a: Animal, c: number, go: number): void => {
    const j = a.joints;
    const w = c * 2 * Math.PI;
    const fore = Math.sin(w - 0.38) * go;
    const hind = Math.cos(w - 0.38) * go;
    const sink = (-0.06 - 0.014 * Math.cos(2 * w + 0.6)) * go;
    const surge = 0.014 * Math.sin(2 * w + 1.2) * go;
    about(m4, j.hip, -0.05 * hind, 0.04 * fore, 0.02 * Math.sin(2 * w + 1) * go, [surge, sink, 0.022 * hind]);
    (a.bones[0] as THREE.Matrix4).premultiply(m4);
    about(m4, j.chest, -0.075 * fore, -0.05 * Math.sin(w - 1.2) * go, -0.02 * Math.sin(2 * w + 1) * go, [surge, sink - 0.012 * Math.abs(fore), 0.032 * fore]);
    (a.bones[1] as THREE.Matrix4).premultiply(m4);
    about(m5, j.chest, 0, 0.05 * fore, 0.06 * Math.sin(2 * w + 0.8) * go);
    m4.multiply(m5);
    (a.bones[2] as THREE.Matrix4).premultiply(m4);
    (a.bones[3] as THREE.Matrix4).premultiply(m4);
    a.coat.set(1, 0.55, 0, 0.14);
  };

  const here = new THREE.Vector3();
  const there = new THREE.Vector3();
  const local = new THREE.Vector3();
  const mark = (n: number, x: number, y: number, z: number, radius: number, alpha: number, kind: number, yaw: number, seed: number): void => {
    markAt.set([x, y, z, radius], n * 4);
    markLook.set([alpha, kind, yaw, seed], n * 4);
  };
  /** Sets its four feet for g metres gone, with the trunk at (x, y, z) heading `yaw`: each on its footfall or on its way to the next, and
   * under each what it does to the floor. */
  const tread = (a: Animal, g: number, x: number, y: number, z: number, yaw: number): void => {
    const c = strides(g);
    const u = whenGone(g);
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    for (let i = 0; i < 4; i++) {
      const p = c + (PHASE[i] as number);
      const n = Math.floor(p);
      const landed = n - (PHASE[i] as number);
      const leaves = landed + dutyOf(landed);
      footfall(i, n, here);
      let lift = 0;
      const base = i * PER_FOOT;
      const paw = 0.085 * SIZE;
      if (c > leaves) {
        // Up, over and down: it is snatched off the floor, and set down more slowly than it left.
        const k = (c - leaves) / (landed + 1 - leaves);
        // What it kicked up as it left: a little snow, thrown back and soon gone.
        const age = u - whenGone(metres(leaves));
        mark(base, here.x - 0.3 * age * cos, here.y + 0.05 + 0.3 * age, here.z + 0.3 * age * sin, 0.09 + 0.55 * age, 0.5 * smooth(0, 0.03, age) * Math.exp(-age / 0.2), 1, 0, hash(i, n + 3));
        footfall(i, n + 1, there);
        const span = here.distanceTo(there);
        lift = Math.sin(Math.PI * Math.pow(k, 0.8)) * Math.min(1, span / (0.3 * SIZE)) * (i < 2 ? 0.08 : 0.065) * SIZE;
        here.lerp(there, k * k * (3 - 2 * k));
      } else mark(base, 0, 0, 0, 0, 0, 1, 0, 0);
      // Under the foot the floor is dark; a foot in the air has let go of it.
      const held = Math.max(0, 1 - lift / (0.05 * SIZE));
      mark(base + 1, here.x, here.y + 0.012, here.z, paw * (1.75 - 0.45 * held), 0.92 * held * held, 0, yaw, hash(i, 1));
      // The ice gives the leg back, drawn out towards the lens: a foot off the floor stands clear of what the ice shows of it.
      mark(base + 2, here.x, here.y + 0.008, here.z, 0.075 * SIZE, 0.72, 2, lift, 1.3);
      ctx.rig.setDisc(discs, FOOT_DISC + i, here.x, here.z, 0.3 * SIZE, held);
      // And where it stood before, its prints.
      const last = c > leaves ? n : n - 1;
      for (let k = 0; k < PRINTS; k++) {
        const m = last - k;
        if (m < 0) {
          mark(base + 3 + k, 0, 0, 0, 0, 0, 3, 0, 0);
          continue;
        }
        footfall(i, m, there);
        mark(base + 3 + k, there.x, there.y + 0.01, there.z, paw * 1.25, 1, 3, yawOf(whenGone(metres(m - (PHASE[i] as number)))), hash(i, m));
      }
      const dx = here.x - x;
      const dz = here.z - z;
      local.set((cos * dx - sin * dz) / SIZE, (here.y + lift - y) / SIZE - 0.004, (sin * dx + cos * dz) / SIZE);
      reach(a, i, local);
    }
    // And the trunk over them, broad and faint.
    mark(4 * PER_FOOT, x, floorAt(x, z) + 0.006, z, 0.3 * SIZE, 0.42, 2, 0.34 * SIZE, 2.6);
    mark(4 * PER_FOOT + 1, x, floorAt(x, z) + 0.004, z, 0.8 * SIZE, 0.5, 0, yaw, 0.37);
    markAtAttribute.needsUpdate = true;
    markLookAttribute.needsUpdate = true;
  };

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
        const u = seconds - CANAL_KEY_AT;
        const gone = i === 0 ? walked(u) : 0;
        const at = tube(h.d + gone, h.l, 0);
        const floor = i === 0 ? floorAt(at[0], at[2]) : FLOOR;
        const yaw = i === 0 ? yawOf(u) : h.yaw;
        a.ground.x = floor;
        place(a, [at[0], floor, at[2]], yaw);
        if (i === 0) {
          // It turns its head to the lens as the lens comes up, and back to the mouth before it goes.
          const turn = 0.55 * smooth(-4.5, -3.2, u) * (1 - smooth(-1.6, -0.5, u));
          const go = smooth(0, 0.4, gone);
          idle(a, seconds, turn - 0.45 * start, 0.03 * start, start, 1 - go);
          if (go > 0) carry(a, strides(gone), go);
          tread(a, gone, at[0], floor, at[2], yaw);
        } else idle(a, seconds, (0.45 + 0.07 * i) * start * (i % 2 ? 1 : -1), 0.03 * start, start);
        ctx.rig.setDisc(discs, i, at[0], at[2], (h.act === 'stand' ? 1.25 : 1.6) * a.role.size, i === 0 ? 0.7 : 1);
        const n = BREATHERS.indexOf(i);
        const b = breaths[n];
        if (!b) return;
        const j = a.joints;
        const head = a.bones[3] as THREE.Matrix4;
        muzzle.set(j.face[0] + 0.06 * j.lead[0], j.face[1] + 0.06 * j.lead[1], j.face[2] + 0.06 * j.lead[2]).applyMatrix4(head).applyMatrix4(a.group.matrixWorld);
        facing.set(j.lead[0], j.lead[1], j.lead[2]).transformDirection(head).transformDirection(a.group.matrixWorld);
        b.at = [muzzle.x, muzzle.y, muzzle.z];
        // It goes out the way the face looks and rises: the gale does not reach in here to carry it.
        const k = 0.2 / 0.55;
        b.lean = [facing.x * 0.8 * k - WIND[0], facing.z * 0.8 * k - WIND[2]];
        const out = Math.max(0, Math.sin(seconds * 2.5 + a.role.phase + 1.9));
        b.strength = 0.75 * out * out;
      });
      if (!inCanal) for (const b of breaths) b.strength = 0;

      crossing.forEach((a, i) => {
        a.group.visible = WALKERS && !inCanal;
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
