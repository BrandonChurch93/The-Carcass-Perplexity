// The vessel mouth in the wall, the fall that pours from it to the lake, and the surge.
// path.ts is the course of the river, shape.ts the rock and the bed, look.ts the shaders.
import * as THREE from 'three';
import { MOUTH, smooth } from '../layout';
import type { HeartContext, HeartPiece } from '../shared/context';
import { blackbody } from '../shared/rig';
import { BED_DEPTH, BED_FRAGMENT, BED_VERTEX, GLOW_FRAGMENT, GLOW_VERTEX, GOB_FRAGMENT, GOB_VERTEX, ROCK_DEPTH, ROCK_FRAGMENT, ROCK_VERTEX } from './look';
import { TUBE, WINDOW, createCourse } from './path';
import { bed, face, shell } from './shape';

export const PARTS: readonly string[] = ['vessel-mouth', 'lava-fall', 'surge'];

/** Metres from the lip of the front of the surge, `since` seconds after it starts. It leaves at 20 m/s and gathers speed down the slope. */
const surgeFront = (since: number): number => (since < 0 ? -1000 : 6 + 20 * since + 4.5 * since * since);
/** The second after its start at which the front is `len` metres down the course. */
const surgeReaches = (len: number): number => (len <= 6 ? 0 : (-20 + Math.sqrt(400 + 18 * (len - 6))) / 9);

export function create(ctx: HeartContext): HeartPiece {
  const land = (x: number, z: number): number => ctx.rig.land.height(x, z);
  const course = createCourse(land);
  const river = bed(course, land);
  const surgeAt = ctx.events.surge;

  const shared = {
    ...ctx.rig.uniforms,
    uWindow: { value: new THREE.Vector4(WINDOW.normal[0], WINDOW.normal[1], WINDOW.normal[2], WINDOW.offset) },
    uArch: { value: new THREE.Vector4(MOUTH.x, TUBE.floor, TUBE.half(0), TUBE.crown(0)) },
    uFlare: { value: 1 },
    uSurge: { value: new THREE.Vector4(-1000, 0, 0, 0) },
    tCliff: { value: ctx.assets.texture('mat/cliff.jpg') },
    tCliffNh: { value: ctx.assets.texture('mat/cliff-nh.png', { kind: 'data' }) },
    tTalus: { value: ctx.assets.texture('mat/talus.jpg') },
    tCrust: { value: ctx.assets.texture('mat/crust-skin.jpg') },
    tCrustNh: { value: ctx.assets.texture('mat/crust-skin-nh.png', { kind: 'data' }) },
    tBoulderNh: { value: ctx.assets.texture('mat/boulder-nh.png', { kind: 'data' }) },
  };

  const rockMaterial = new THREE.ShaderMaterial({ vertexShader: ROCK_VERTEX, fragmentShader: ROCK_FRAGMENT, uniforms: shared });
  rockMaterial.userData.depthFragment = ROCK_DEPTH;
  const tube = new THREE.Mesh(shell(), rockMaterial);
  const cliff = new THREE.Mesh(face(), rockMaterial);
  ctx.scene.add(ctx.parts.built('vessel-mouth', tube, cliff), cliff);

  const bedMaterial = new THREE.ShaderMaterial({ vertexShader: BED_VERTEX, fragmentShader: BED_FRAGMENT, uniforms: shared });
  bedMaterial.userData.depthFragment = BED_DEPTH;
  const stream = new THREE.Mesh(river.geometry, bedMaterial);
  ctx.scene.add(ctx.parts.built('lava-fall', stream));

  const glowMaterial = new THREE.ShaderMaterial({ vertexShader: GLOW_VERTEX, fragmentShader: GLOW_FRAGMENT, uniforms: shared, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = new THREE.Mesh(river.geometry, glowMaterial);
  glow.frustumCulled = false;
  ctx.rig.glowScene.add(glow);

  // The round lights: the mouth, the body of the fall, its foot, and the surge.
  const spot = (len: number, lift: number): THREE.Vector3 => {
    const p = course.at(len);
    return new THREE.Vector3(p.x, river.height(p.x, p.z) + lift, p.z);
  };
  const hot = (kelvin: number, share: number): THREE.Vector3 => new THREE.Vector3(...blackbody(kelvin)).multiplyScalar(share);
  const mouthLight = { position: new THREE.Vector3(MOUTH.x - 22, TUBE.floor + 3, TUBE.lipZ - 5), radius: 12, radiance: hot(1400, 0.4) };
  const bodyLight = { position: spot(52, 3), radius: 11, radiance: hot(1420, 0.55) };
  const footLight = { position: spot(course.length - 26, 3), radius: 20, radiance: hot(1330, 0.4) };
  const surgeLight = { position: spot(0, 4), radius: 9, radiance: new THREE.Vector3() };
  ctx.rig.emitters.push(mouthLight, bodyLight, footLight, surgeLight);
  const base = [mouthLight, bodyLight, footLight].map((l) => l.radiance.clone());

  // The air over the fall: heat along it and at the mouth, fume where it meets the lake and from the mouth.
  for (const len of [8, 45, 85, 125, 160]) {
    const p = spot(len, 0);
    ctx.sources.heat.push({ at: [p.x, p.y, p.z], radius: 14, height: 40, strength: 0.8 });
  }
  ctx.sources.heat.push({ at: [MOUTH.x - 10, TUBE.floor, TUBE.lipZ - 6], radius: 40, height: 50, strength: 1 });
  const footAt = spot(course.length - 8, 0);
  const footFume = { at: [footAt.x + 14, 1, footAt.z + 4] as [number, number, number], radius: 34, strength: 0.6, rise: 150, kind: 'fume' as const, lean: [0.3, -0.1] as [number, number] };
  const mouthFume = { at: [MOUTH.x - 6, TUBE.floor + MOUTH.height + 6, TUBE.lipZ - 20] as [number, number, number], radius: 26, strength: 0.14, rise: 120, kind: 'smoke' as const, lean: [0.15, 0.1] as [number, number] };
  ctx.sources.steam.push(footFume, mouthFume);

  // The surge's gobs: thrown from the lip when it starts and from each cascade as the front passes.
  const GOBS = 420;
  const rng = ctx.rng('fall/surge');
  const gobGeometry = new THREE.IcosahedronGeometry(1, 1);
  const seed = new THREE.InstancedBufferAttribute(new Float32Array(GOBS * 4), 4);
  gobGeometry.setAttribute('aSeed', seed);
  const gobMaterial = new THREE.ShaderMaterial({ vertexShader: GOB_VERTEX, fragmentShader: GOB_FRAGMENT, uniforms: shared });
  const gobs = new THREE.InstancedMesh(gobGeometry, gobMaterial, GOBS);
  gobs.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('surge', gobs));
  const CASCADES = [0, ...course.falls];
  const throws = Array.from({ length: GOBS }, (_, i) => {
    const from = i < 170 ? 0 : (CASCADES[1 + (i % (CASCADES.length - 1))] as number);
    const p = course.at(from + rng.range(-3, 3));
    const side = rng.range(-1, 1);
    const out = rng.range(7, 24);
    return {
      from,
      delay: rng.range(0, i < 170 ? 0.9 : 1.6) * rng.next() - (i < 170 ? 0.14 : 0.05),
      at: new THREE.Vector3(p.x - p.dz * side * p.half, river.height(p.x, p.z) + 1, p.z + p.dx * side * p.half),
      velocity: new THREE.Vector3(p.dx * out + rng.range(-6, 6), rng.range(1, 8) + 10 * Math.pow(rng.next(), 2), p.dz * out + rng.range(-6, 6)),
      size: 0.09 + 0.5 * Math.pow(rng.next(), 3),
    };
  });
  const dummy = new THREE.Object3D();
  const way = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  return {
    setTime: (seconds) => {
      const since = seconds - surgeAt;
      const front = surgeFront(since);
      // The flare: at once, then it settles to a fall that runs fuller than before.
      const flare = since < 0 ? 1 : 1.55 + 2.6 * Math.exp(-since / 0.9);
      shared.uFlare.value = flare;
      shared.uSurge.value.set(front, since < 0 ? 0 : 1, since < 0 ? 0 : Math.exp(-since / 0.45), course.length);
      mouthLight.radiance.copy(base[0] as THREE.Vector3).multiplyScalar(flare);
      bodyLight.radiance.copy(base[1] as THREE.Vector3).multiplyScalar(1 + 0.6 * smooth(40, 64, front));
      footLight.radiance.copy(base[2] as THREE.Vector3).multiplyScalar(1 + 0.5 * smooth(course.length - 60, course.length - 20, front));
      if (since >= 0) {
        const p = course.at(Math.min(course.length - 10, Math.max(0, front)));
        surgeLight.position.set(p.x, river.height(p.x, p.z) + 5, p.z);
        surgeLight.radius = 10 + 5 * Math.exp(-since / 0.5);
        surgeLight.radiance.set(...blackbody(1470)).multiplyScalar((0.9 + 0.8 * Math.exp(-since / 0.5)) * smooth(course.length + 20, course.length - 30, front));
      } else surgeLight.radiance.set(0, 0, 0);

      for (let i = 0; i < GOBS; i++) {
        const t = throws[i] as (typeof throws)[number];
        // Each gob leaves when the front reaches the place it is thrown from.
        const age = since - surgeReaches(t.from) - t.delay;
        const y = t.at.y + t.velocity.y * age - 4.9 * age * age;
        const x = t.at.x + t.velocity.x * age;
        const z = t.at.z + t.velocity.z * age;
        const live = since >= 0 && age > 0 && y > Math.max(0, land(x, z)) - 0.5;
        const size = live ? t.size : 0;
        // A gob is drawn out along its flight, the more the faster it goes.
        way.set(t.velocity.x, t.velocity.y - 9.8 * age, t.velocity.z);
        const speed = way.length();
        dummy.position.set(x, live ? y : -500, z);
        dummy.quaternion.setFromUnitVectors(UP, way.divideScalar(Math.max(speed, 0.001)));
        dummy.scale.set(size, size * (1.2 + 0.045 * speed), size);
        dummy.updateMatrix();
        gobs.setMatrixAt(i, dummy.matrix);
        // Small ones chill in a second, big ones stay yellow to the ground.
        seed.setX(i, Math.max(900, 1470 - (38 / Math.pow(t.size, 0.9)) * Math.max(0, age)));
      }
      gobs.instanceMatrix.needsUpdate = true;
      seed.needsUpdate = true;
    },
    dispose: () => {
      for (const m of [tube, cliff, stream]) m.geometry.dispose();
      gobGeometry.dispose();
      rockMaterial.dispose();
      bedMaterial.dispose();
      glowMaterial.dispose();
      gobMaterial.dispose();
    },
  };
}
