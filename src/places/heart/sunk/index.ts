// The one that sank: a crust-walker that did not get off its plate in time. Part of its back and two legs stand out of the crust,
// and the crust it stopped is folded round it. Everything here is made once and rides the crust; nothing else moves.
import * as THREE from 'three';
import type { HeartContext, HeartPiece } from '../shared/context';
import { secondsInPlace, shotById } from '../../../film/cut';
import { SUNK, UNIT, seamLine } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import { blackbody } from '../shared/rig';
import { CARCASS_FRAGMENT, CARCASS_VERTEX, FIELD_FRAGMENT, FIELD_VERTEX, GLOW_FRAGMENT, GLOW_VERTEX } from './shaders';
import { BODY, FIELD, UNDER, FOOT_A, FOOT_B, LEG_A, LEG_B, SLOPE_RANGE, YAW, bakeField, bodyGeometry, fieldGeometry, legGeometry, makeField, ragGeometry } from './shape';

export const PARTS: readonly string[] = ['sunk-walker'];

/** Kelvin of the hottest of the split, where the skin of a rope tore: 1100 to 1200 K along it. */
const TEAR_KELVIN = 1180;
/** How hard the tear lights what is near it, over what its size alone would give. */
const TEAR_GAIN = 1.6;
/** The albedo of the ash caked on a plate of hide: set so the plates on the upper side of the big arch read about 120 105 90 on the display. */
const ASH_ON_HIDE: [number, number, number] = [0.34, 0.28, 0.185];
/** Beyond this the carcass is a few hundred pixels and is drawn with meshes of half the rows. */
const FAR = 150;

/** The settling, at film frame 3740, in the last third of the push of shot heart-04, in the seconds of the place. A slab of the
 *  folded skin beside the split breaks off along a ragged line and tilts in; the face of the break shows the hot inside of
 *  the crust, flares and cools to a dull red; the hull tips toward the split; steam and smoke come out. Before it everything
 *  is at rest, so the loop of the place (7 to 17 s) never holds a part of it. */
const SETTLE_AT = secondsInPlace(UNIT, 3740);
const SETTLE_DROP = 0.1;
const SETTLE_TIP = 0.022;
/** The line of the break, in the local frame: a second branch of the split, a pace in front of its middle, on the level skin
 *  before the folds, where no rope stands between it and the camera of heart-2: it is seen as one line. */
const BREAK: [number, number, number, number] = [-7.6, 5.42, -4.6, 5.62];
/** The split's light on what is round it wavers as its fire does. Every rate is a whole count of turns in 8 s. */
const waver = (seconds: number, at: number): number =>
  0.5 * Math.sin(seconds * 1.5708 + at) + 0.3 * Math.sin(seconds * 3.927 + 2.3 * at) + 0.2 * Math.sin(seconds * 8.6394 + 4.1 * at);
const ramp = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
function settling(seconds: number): { down: number; open: number; puff: number; flare: number; slab: number; ember: number } {
  const t = seconds - SETTLE_AT;
  const down = ramp(0, 0.55, t);
  // The slab goes fast and stops against what is under it.
  const slab = ramp(-0.02, 0.3, t) * (1 - 0.12 * Math.exp(-Math.max(0, t - 0.3) / 0.12) * Math.cos(Math.max(0, t - 0.3) * 21));
  const flare = ramp(-0.02, 0.1, t) * Math.exp(-Math.max(0, t - 0.1) / 1.1);
  const puff = ramp(0.02, 0.4, t) * Math.exp(-Math.max(0, t - 0.4) / 1.6);
  // The face of the break is black again inside four seconds: nothing of it glows to the end of the shot.
  const ember = ramp(-0.02, 0.1, t) * Math.exp(-Math.max(0, t - 0.1) / 0.9) * (1 - ramp(1.5, 3.6, t));
  return { down, open: 0.3 * down + 0.7 * flare, puff, flare, slab, ember };
}

/** Staging by shot. The picture of shot heart-04 has the carcass and its folds as a pale ashy mass seen from low down (folds 58 54 55,
 *  hull 62 54 52), the wide view has them as dark as the crust. In heart-04 the light on them is lifted, as by a card on a set. */
const NEAR_SHOT = ((): { from: number; to: number } => {
  const s = shotById('heart-04');
  return { from: secondsInPlace(UNIT, s.first) - 0.3 / 60, to: secondsInPlace(UNIT, s.last) + 0.7 / 60 };
})();
const LIFT = 2.0;

const COS = Math.cos(YAW);
const SIN = Math.sin(YAW);
const toLocal = (wx: number, wz: number): [number, number] => {
  const dx = wx - SUNK[0];
  const dz = wz - SUNK[2];
  return [dx * COS + dz * SIN, -dx * SIN + dz * COS];
};
const toWorld = (lx: number, lz: number): [number, number] => [lx * COS - lz * SIN, lx * SIN + lz * COS];

export function create(ctx: HeartContext): HeartPiece {
  const lakeSeam = seamLine('sunk', 28).map(([x, z]) => toLocal(x, z));
  const field = makeField(lakeSeam);
  const baked = bakeField(field);

  const group = new THREE.Group();
  group.rotation.y = -YAW;

  // Every tap of a stretched texture is paid for here: two is what the folds need at the bench's angle.
  const anis = { anisotropy: 2 };
  const shared = {
    ...ctx.rig.uniforms,
    tRelief: { value: baked.relief },
    tMask: { value: baked.mask },
    tLines: { value: baked.lines },
    tAlong: { value: baked.along },
    uField: { value: new THREE.Vector4(FIELD.cx - FIELD.half, FIELD.cz - FIELD.half, 1 / (2 * FIELD.half), SLOPE_RANGE) },
    uTurn: { value: new THREE.Vector2(COS, SIN) },
    uOrigin: { value: new THREE.Vector2(SUNK[0], SUNK[2]) },
    uTearKelvin: { value: TEAR_KELVIN },
    uTearGain: { value: TEAR_GAIN },
    uTearOpen: { value: 0 },
    uTearColour: { value: new THREE.Vector3(...blackbody(TEAR_KELVIN)) },
    uTear: { value: baked.tear.points.map((p) => new THREE.Vector3(p[0], p[1] + 0.03, p[2])) },
    uAsh: { value: new THREE.Vector3(...ASH_ON_HIDE) },
    uLift: { value: 1 },
    uBranch: { value: new THREE.Vector4(...BREAK) },
    uSlab: { value: 0 },
    uFlare: { value: 0 },
    tSkin: { value: ctx.assets.texture('mat/crust-skin.jpg', anis) },
    // Only the normal of the ropy skin is read along the view: the two others are a tone and a grit, and each tap is paid
    // for on half the frame at heart-2.
    tSkinNh: { value: ctx.assets.texture('mat/crust-skin-nh.png', { kind: 'data' }) },
    tRopy: { value: ctx.assets.texture('mat/pahoehoe.jpg') },
    tRopyNh: { value: ctx.assets.texture('mat/pahoehoe-nh.png', { kind: 'data', anisotropy: 2 }) },
  };

  const fieldMaterial = new THREE.ShaderMaterial({ vertexShader: FIELD_VERTEX, fragmentShader: FIELD_FRAGMENT, uniforms: shared });
  // The sheet is drawn wherever the skin is: where it is not, the field lies under the lake's crust (UNDER) and is left out, so
  // the front of the skin meets the crust as one body meets another.
  const skin = (x: number, z: number): boolean => baked.at(x, z) > UNDER + 0.04;
  // Fine where the ropes are and the bench sees them; the far side of the heap and the thin sheet beyond get wider cells.
  const inner = (x: number, z: number): boolean => Math.abs(x + 1.5) < 8.8 && z > -3.0 && z < 7.1;
  const fine = new THREE.Mesh(
    fieldGeometry(baked, 0.04, (x, z) => inner(x, z) && skin(x, z)),
    fieldMaterial,
  );
  const coarse = new THREE.Mesh(
    fieldGeometry(baked, 0.07, (x, z) => !(Math.abs(x + 1.5) < 8.66 && z > -2.86 && z < 6.96) && skin(x, z)),
    fieldMaterial,
  );
  const farSheet = new THREE.Mesh(fieldGeometry(baked, 0.14, skin), fieldMaterial);

  const carcassMaterial = new THREE.ShaderMaterial({
    vertexShader: CARCASS_VERTEX,
    fragmentShader: CARCASS_FRAGMENT,
    uniforms: {
      ...shared,
      tHide: { value: ctx.assets.texture('mat/hide.jpg', anis) },
      tHideNh: { value: ctx.assets.texture('mat/hide-nh.png', { kind: 'data', anisotropy: 2 }) },
      tFlake: { value: ctx.assets.texture('mat/flake.jpg', anis) },
      tFlakeNh: { value: ctx.assets.texture('mat/flake-nh.png', { kind: 'data', anisotropy: 2 }) },
    },
  });
  const carcass = (geometry: THREE.BufferGeometry): THREE.Mesh => new THREE.Mesh(geometry, carcassMaterial);
  const legShapeA = { points: LEG_A, knee: 0.468, scale: 1.5, seed: 1.7, rings: 560, round: 64, tendon: 0, cover: 1 };
  const legShapeB = { points: LEG_B, knee: 0.34, scale: 0.82, seed: 4.1, rings: 360, round: 36, tendon: 0, cover: 0 };
  // What hangs and stirs: rags of hide under the arches of the two legs.
  // Each is [where it is held, its length, its half width, its turn, its seed].
  const RAGS: [[number, number, number], number, number, number, number][] = [
    [[2.2, 3.5, 0.6], 1.05, 0.085, 1.9, 1],
    [[2.28, 3.38, 0.56], 0.55, 0.05, 0.6, 2],
    [[2.08, 3.72, 0.64], 0.38, 0.06, 2.7, 3],
    [[-0.3, 3.1, 0.86], 0.8, 0.07, -0.4, 4],
    [[-0.2, 3.22, 0.82], 0.42, 0.045, 0.9, 5],
    [[1.0, 3.19, -3.04], 0.9, 0.075, 0.9, 6],
    [[1.12, 3.16, -3.0], 0.5, 0.05, 2.2, 7],
  ];
  const hanging = RAGS.map(([at, length, half, yaw, seed]) => carcass(ragGeometry(at, length, half, yaw, seed)));
  const near = new THREE.Group();
  const bodies = [carcass(bodyGeometry(baked, 290, 240, true)), carcass(bodyGeometry(baked, 180, 150))] as const;
  near.add(bodies[0], carcass(legGeometry(legShapeA, baked).geometry), carcass(legGeometry(legShapeB, baked).geometry), fine, coarse);
  const far = new THREE.Group();
  far.add(
    bodies[1],
    carcass(legGeometry({ ...legShapeA, rings: 350, round: 40 }, baked).geometry),
    carcass(legGeometry({ ...legShapeB, rings: 260, round: 30 }, baked).geometry),
    farSheet,
  );
  far.visible = false;
  for (const m of [fine, coarse, farSheet]) m.position.y = 0.02;
  group.add(near, far, ...hanging);
  // Drawn from the front to the back, so what is hidden is not shaded: the carcass before its folds, the folds before the lake
  // under them. The sheets are sorted the same way in themselves, the bench side first (shape.ts).
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) o.renderOrder = o.material === carcassMaterial ? -3 : -2;
  });
  coarse.renderOrder = -1;
  const meshes: THREE.Mesh[] = [];
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.frustumCulled = false;
      meshes.push(o);
    }
  });
  ctx.scene.add(ctx.parts.built('sunk-walker', group));

  // The split lights what is near it through the same map as the lake. It is a few centimetres wide: drawn 1.25 m wide, dimmer by that much.
  const strip: number[] = [];
  const stripIndex: number[] = [];
  const TEAR = baked.tear.points.map((p) => [p[0], p[2]] as [number, number]);
  let tearLength = 0;
  TEAR.forEach(([x, z], i) => {
    const a = TEAR[Math.max(0, i - 1)] as [number, number];
    const b = TEAR[Math.min(TEAR.length - 1, i + 1)] as [number, number];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    if (i > 0) tearLength += Math.hypot(x - a[0], z - a[1]);
    const nx = (-(b[1] - a[1]) / l) * 0.625;
    const nz = ((b[0] - a[0]) / l) * 0.625;
    strip.push(x + nx, 0.5, z + nz, x - nx, 0.5, z - nz);
    if (i > 0) stripIndex.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
  });
  const glowGeometry = new THREE.BufferGeometry();
  glowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(strip, 3));
  glowGeometry.setIndex(stripIndex);
  const hot = blackbody(TEAR_KELVIN - 40);
  const radiance = new THREE.Vector3(hot[0], hot[1], hot[2]).multiplyScalar(baked.tear.area / Math.max(0.5, tearLength * 1.25));
  const glowMaterial = new THREE.ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    uniforms: { uRadiance: { value: radiance.clone() } },
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.frustumCulled = false;
  glow.rotation.y = -YAW;
  ctx.rig.glowScene.add(glow);

  // What stands over the crust hides the sky from it: the body, the feet of the two arches, the span of the first.
  const SHADES: [number, number, number, number][] = [
    [BODY.centre.x, BODY.centre.z, 4.8, 0.55],
    [FOOT_A[0], FOOT_A[1], 1.8, 0.5],
    [FOOT_B[0], FOOT_B[1], 1.5, 0.45],
    [1.0, 0.4, 3.6, 0.16],
  ];
  const discs = ctx.rig.contactDiscs(SHADES.length);

  const tearMid = TEAR[1] as [number, number];
  // A faint smoke that drifts low off each length of the split, and the warm air over it. Nothing here stands as a column.
  const smokeRest = TEAR.map((_, i) => ({ strength: 0.07 + 0.02 * ((i * 2) % 3), rise: 1.0 + 0.4 * ((i + 1) % 3) }));
  const smokes = TEAR.map((_, i) => ({
    at: [0, 0.3, 0] as [number, number, number],
    radius: 0.45 + 0.15 * i,
    strength: (smokeRest[i] as (typeof smokeRest)[number]).strength,
    rise: (smokeRest[i] as (typeof smokeRest)[number]).rise,
    kind: 'smoke' as const,
    lean: [-0.5 + 0.2 * i, 0.3 - 0.15 * i] as [number, number],
  }));
  const heat = { at: [0, 0.2, 0] as [number, number, number], radius: 1.2, height: 2.0, strength: 0.25 };
  // The steam that comes off the break as it opens: nothing before it, gone a second or two after.
  const BURSTS: [number, number][] = [0.22, 0.5, 0.78].map((t) => [BREAK[0] + (BREAK[2] - BREAK[0]) * t, BREAK[1] + (BREAK[3] - BREAK[1]) * t]);
  const bursts = BURSTS.map((_, i) => ({
    at: [0, 0.35, 0] as [number, number, number],
    radius: 0.5 + 0.1 * i,
    strength: 0,
    rise: 2.4 + 0.5 * ((i + 1) % 3),
    kind: 'steam' as const,
    lean: [-0.3 + 0.2 * i, 0.2] as [number, number],
  }));
  ctx.sources.steam.push(...smokes, ...bursts);
  ctx.sources.heat.push(heat);

  const place = (seconds: number): void => {
    const [x, z] = ctx.rig.flow.drift(SUNK[0], SUNK[2], seconds);
    group.position.set(x, 0, z);
    glow.position.set(x, 0, z);
    SHADES.forEach(([lx, lz, radius, strength], i) => {
      const [wx, wz] = toWorld(lx, lz);
      ctx.rig.setDisc(discs, i, x + wx, z + wz, radius, strength);
    });
    const [tx, tz] = toWorld(tearMid[0], tearMid[1]);
    heat.at[0] = x + tx;
    heat.at[2] = z + tz;
    const staged = stagedSeconds();
    const nearShot = staged >= NEAR_SHOT.from && staged <= NEAR_SHOT.to;
    shared.uLift.value = nearShot ? LIFT : 1;
    // From the wide view the smoke of the split gathered into a pale ball beside the hull: there it is thin.
    const smoky = nearShot ? 1 : 0.25;
    const now = settling(seconds);
    // The hull tips toward the split as it goes down: its far end by a hand's width, its end under the legs by half of that.
    for (const body of bodies) {
      body.position.y = -0.5 * SETTLE_DROP * now.down;
      body.rotation.z = SETTLE_TIP * now.down;
    }
    shared.uSlab.value = now.slab;
    shared.uFlare.value = now.ember;
    bursts.forEach((burst, i) => {
      const [bx, bz] = toWorld((BURSTS[i] as [number, number])[0], (BURSTS[i] as [number, number])[1]);
      burst.at[0] = x + bx;
      burst.at[2] = z + bz;
      burst.strength = 0.5 * now.puff;
    });
    shared.uTearOpen.value = now.open;
    shared.uTearGain.value = TEAR_GAIN * (1 + 1.5 * now.open);
    (glowMaterial.uniforms.uRadiance as THREE.IUniform<THREE.Vector3>).value.copy(radiance).multiplyScalar((1 + 3 * now.open) * (1 + 0.22 * waver(seconds, 0.7)));
    heat.strength = 0.25 * (1 + now.puff);
    smokes.forEach((smoke, i) => {
      const [sx, sz] = toWorld((TEAR[i] as [number, number])[0], (TEAR[i] as [number, number])[1]);
      const rest = smokeRest[i] as (typeof smokeRest)[number];
      smoke.at[0] = x + sx;
      smoke.at[2] = z + sz;
      // Each length of the split breathes its smoke out in its own time.
      const breath = waver(seconds, 1.9 * i + 0.4);
      smoke.strength = smoky * rest.strength * (1 + 5 * now.puff) * (1 + 0.6 * breath);
      smoke.rise = rest.rise * (1 + 0.8 * now.puff) * (1 + 0.25 * breath);
    });
  };
  place(ctx.rig.flow.t0);

  const here = new THREE.Vector3();
  return {
    setTime: place,
    beforeSample: (_renderer, camera) => {
      const close = camera.position.distanceTo(here.set(group.position.x, 2, group.position.z)) < FAR;
      near.visible = close;
      far.visible = !close;
    },
    dispose: () => {
      for (const m of meshes) m.geometry.dispose();
      fieldMaterial.dispose();
      carcassMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      baked.relief.dispose();
      baked.mask.dispose();
      baked.lines.dispose();
      baked.along.dispose();
    },
  };
}
