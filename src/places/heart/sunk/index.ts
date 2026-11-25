// The one that sank: a crust-walker that did not get off its plate in time. Part of its back and two legs stand out of the crust,
// and the crust it stopped is folded round it. Everything here is made once and rides the crust; nothing else moves.
import * as THREE from 'three';
import type { HeartContext, HeartPiece } from '../shared/context';
import { SUNK, seamLine } from '../shared/anchors';
import { blackbody } from '../shared/rig';
import { CARCASS_FRAGMENT, CARCASS_VERTEX, FIELD_FRAGMENT, FIELD_VERTEX, GLOW_FRAGMENT, GLOW_VERTEX } from './shaders';
import { BODY, FIELD, FOOT_A, FOOT_B, LEG_A, LEG_B, SLOPE_RANGE, YAW, bakeField, bodyGeometry, fieldGeometry, legGeometry, makeField, padGeometry } from './shape';

export const PARTS: readonly string[] = ['sunk-walker'];

/** Kelvin of the hottest of the split, where the skin of a rope tore: 1100 to 1200 K along it. */
const TEAR_KELVIN = 1180;
/** How hard the tear lights what is near it, over what its size alone would give. */
const TEAR_GAIN = 3.0;
/** The albedo of the ash caked on a plate of hide: set so the plates on the upper side of the big arch read about 150 130 110 on the display. */
const ASH_ON_HIDE: [number, number, number] = [0.55, 0.45, 0.29];
/** Beyond this the carcass is a few hundred pixels and is drawn with meshes of half the rows. */
const FAR = 150;

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
    uField: { value: new THREE.Vector4(FIELD.cx - FIELD.half, FIELD.cz - FIELD.half, 1 / (2 * FIELD.half), SLOPE_RANGE) },
    uTurn: { value: new THREE.Vector2(COS, SIN) },
    uOrigin: { value: new THREE.Vector2(SUNK[0], SUNK[2]) },
    uTearKelvin: { value: TEAR_KELVIN },
    uTearGain: { value: TEAR_GAIN },
    uTearColour: { value: new THREE.Vector3(...blackbody(TEAR_KELVIN)) },
    uTear: { value: baked.tear.points.map((p) => new THREE.Vector3(p[0], p[1] + 0.03, p[2])) },
    uAsh: { value: new THREE.Vector3(...ASH_ON_HIDE) },
    tSkin: { value: ctx.assets.texture('mat/crust-skin.jpg', anis) },
    tSkinNh: { value: ctx.assets.texture('mat/crust-skin-nh.png', { kind: 'data', anisotropy: 2 }) },
    tRopy: { value: ctx.assets.texture('mat/pahoehoe.jpg', anis) },
    tRopyNh: { value: ctx.assets.texture('mat/pahoehoe-nh.png', { kind: 'data', anisotropy: 2 }) },
  };

  // The relief is opaque where it is whole, so it hides the lake under it; only its rim is laid over the lake's crust.
  const fieldMaterial = new THREE.ShaderMaterial({ vertexShader: FIELD_VERTEX, fragmentShader: FIELD_FRAGMENT, uniforms: shared });
  const rimMaterial = new THREE.ShaderMaterial({
    vertexShader: FIELD_VERTEX,
    fragmentShader: FIELD_FRAGMENT,
    uniforms: shared,
    defines: { RIM: 1 },
    transparent: true,
    depthWrite: false,
  });
  const WHOLE = FIELD.half - 5.2;
  const radial = (x: number, z: number): number => Math.hypot(x - FIELD.cx, z - FIELD.cz);
  // The far side of the heap is hidden from the bench by the mound: it gets the coarse sheet.
  const inner = (x: number, z: number): boolean => Math.abs(x + 1.5) < 8.8 && z > -3.0 && z < 7.1;
  // Fine near the carcass, coarser toward the rim where the relief dies away.
  const fine = new THREE.Mesh(
    fieldGeometry(baked, 0.04, (x, z) => inner(x, z) && radial(x, z) < WHOLE),
    fieldMaterial,
  );
  const coarse = new THREE.Mesh(
    fieldGeometry(baked, 0.1, (x, z) => !(Math.abs(x + 1.5) < 8.5 && z > -2.7 && z < 6.8) && radial(x, z) < WHOLE),
    fieldMaterial,
  );
  const rim = new THREE.Mesh(
    fieldGeometry(baked, 0.25, (x, z) => radial(x, z) >= WHOLE - 0.13 && radial(x, z) < FIELD.half - 1.9),
    rimMaterial,
  );
  const farSheet = new THREE.Mesh(
    fieldGeometry(baked, 0.14, (x, z) => radial(x, z) < WHOLE),
    fieldMaterial,
  );

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
  const legShapeA = { points: LEG_A, knee: 0.44, scale: 1.5, seed: 1.7, rings: 560, round: 64, tendon: 0 };
  const legShapeB = { points: LEG_B, knee: 0.34, scale: 0.82, seed: 4.1, rings: 360, round: 36, tendon: 0 };
  // What hangs and stirs: rags of hide under the arches of the two legs.
  const hanging = [padGeometry([2.45, 3.74, 0.55], 0.62, 0.55, 1.9, 40, 40), padGeometry([-0.55, 3.5, 0.84], 0.46, 0.7, -0.4, 40, 40), padGeometry([1.0, 3.17, -3.04], 0.7, 0.6, 0.9, 40, 40)].map(carcass);
  const near = new THREE.Group();
  near.add(carcass(bodyGeometry(baked, 290, 240, true)), carcass(legGeometry(legShapeA, baked).geometry), carcass(legGeometry(legShapeB, baked).geometry), fine, coarse);
  const far = new THREE.Group();
  far.add(
    carcass(bodyGeometry(baked, 180, 150)),
    carcass(legGeometry({ ...legShapeA, rings: 350, round: 40 }, baked).geometry),
    carcass(legGeometry({ ...legShapeB, rings: 260, round: 30 }, baked).geometry),
    farSheet,
  );
  far.visible = false;
  for (const m of [fine, coarse, rim, farSheet]) m.position.y = 0.02;
  group.add(near, far, ...hanging, rim);
  // Drawn from the front to the back, so what is hidden is not shaded: the carcass before its folds, the folds before the lake
  // under them. The sheets are sorted the same way in themselves, the bench side first (shape.ts).
  group.traverse((o) => {
    if (o instanceof THREE.Mesh && o !== rim) o.renderOrder = o.material === carcassMaterial ? -3 : -2;
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
  const glowMaterial = new THREE.ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    uniforms: { uRadiance: { value: new THREE.Vector3(hot[0], hot[1], hot[2]).multiplyScalar(baked.tear.area / Math.max(0.5, tearLength * 1.25)) } },
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
  // A faint smoke that drifts low off the split, and the warm air over it. Nothing here stands as a column.
  const smoke = { at: [0, 0.3, 0] as [number, number, number], radius: 1.0, strength: 0.12, rise: 1.6, kind: 'smoke' as const, lean: [-0.3, 0.3] as [number, number] };
  const heat = { at: [0, 0.2, 0] as [number, number, number], radius: 1.2, height: 2.0, strength: 0.25 };
  ctx.sources.steam.push(smoke);
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
    smoke.at[0] = heat.at[0] = x + tx;
    smoke.at[2] = heat.at[2] = z + tz;
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
      rimMaterial.dispose();
      carcassMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      baked.relief.dispose();
      baked.mask.dispose();
      baked.lines.dispose();
    },
  };
}
