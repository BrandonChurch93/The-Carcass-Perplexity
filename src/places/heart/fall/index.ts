// The vessel mouth in the wall, the fall that pours from it to the lake, and the surge.
// path.ts is the course of the river, shape.ts the rock and the bed, look.ts the shaders.
import * as THREE from 'three';
import { MOUTH, smooth } from '../layout';
import type { HeartContext, HeartPiece } from '../shared/context';
import { blackbody } from '../shared/rig';
import { BED_DEPTH, BED_FRAGMENT, BED_VERTEX, GLOW_FRAGMENT, GLOW_VERTEX, GOB_FRAGMENT, GOB_VERTEX, ROCK_DEPTH, ROCK_FRAGMENT, ROCK_VERTEX } from './look';
import { FAN_FROM, TUBE, WINDOW, createCourse } from './path';
import { apronSlope, bed, face, shell } from './shape';

export const PARTS: readonly string[] = ['vessel-mouth', 'lava-fall', 'surge'];

/** Seconds before the surge breaks over the lip in which the glow in the tube and the head at the lip come up. */
const LEAD = 0.24;
/** Metres from the lip of the front of the surge, `since` seconds after it breaks over the lip. It leaves at 25 m/s and gathers speed down the slope. */
const surgeFront = (since: number): number => (since < 0 ? 0 : 25 * since + 5 * since * since);
/** The second after its start at which the front is `len` metres down the course. */
const surgeReaches = (len: number): number => (len <= 0 ? 0 : (-25 + Math.sqrt(625 + 20 * len)) / 10);

export function create(ctx: HeartContext): HeartPiece {
  const land = (x: number, z: number): number => ctx.rig.land.height(x, z);
  const course = createCourse(apronSlope);
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
  const mouthLight = { position: new THREE.Vector3(MOUTH.x - 30, TUBE.floor + 4, TUBE.lipZ - 8), radius: 15, radiance: hot(1400, 0.16) };
  const bodyLight = { position: spot(52, 6), radius: 18, radiance: hot(1400, 0.14) };
  const footLight = { position: spot(course.length - 30, 5), radius: 22, radiance: hot(1380, 0.2) };
  const surgeLight = { position: spot(0, 4), radius: 9, radiance: new THREE.Vector3() };
  ctx.rig.emitters.push(mouthLight, bodyLight, footLight, surgeLight);
  const base = [mouthLight, bodyLight, footLight].map((l) => l.radiance.clone());
  const bodyAt = surgeReaches(45);
  const footLightAt = surgeReaches(course.length - 26);

  // The air over the fall: heat along it and at the mouth, fume where it meets the lake and from the mouth.
  for (const len of [8, 40, 72, 104, 138]) {
    const p = spot(len, 0);
    ctx.sources.heat.push({ at: [p.x, p.y, p.z], radius: 14, height: 40, strength: 0.8 });
  }
  ctx.sources.heat.push({ at: [MOUTH.x - 10, TUBE.floor, TUBE.lipZ - 6], radius: 40, height: 50, strength: 1 });
  // The fume leaves the fan where it meets the lake, east of its middle, and leans east and out over the lake; smoke leaves its west edge.
  const footAt = spot(course.length - 8, 0);
  const footFume = { at: [footAt.x + 12, 1, footAt.z + 2] as [number, number, number], radius: 24, strength: 0.32, rise: 130, kind: 'fume' as const, lean: [0.4, 0.15] as [number, number] };
  const fanAt = spot(FAN_FROM + 24, 0);
  const fanSmoke = { at: [fanAt.x - 20, 2, fanAt.z + 4] as [number, number, number], radius: 15, strength: 0.2, rise: 70, kind: 'smoke' as const, lean: [0.35, 0.1] as [number, number] };
  const mouthFume = { at: [MOUTH.x - 6, TUBE.floor + MOUTH.height + 6, TUBE.lipZ - 20] as [number, number, number], radius: 26, strength: 0.14, rise: 120, kind: 'smoke' as const, lean: [0.15, 0.1] as [number, number] };
  ctx.sources.steam.push(footFume, fanSmoke, mouthFume);

  // The surge's gobs: thrown from the lip when it starts and from each cascade as the front passes.
  const GOBS = 300;
  // Besides the surge's, a few gobs are always in the air at the foot of each cascade. Their cycle is a quarter of the eight second loop.
  const SPATTER = 60;
  const CYCLE = 2;
  const rng = ctx.rng('fall/surge');
  const gobGeometry = new THREE.IcosahedronGeometry(1, 1);
  const seed = new THREE.InstancedBufferAttribute(new Float32Array((GOBS + SPATTER) * 4), 4);
  for (let i = 0; i < GOBS + SPATTER; i++) seed.setY(i, rng.next());
  gobGeometry.setAttribute('aSeed', seed);
  const gobMaterial = new THREE.ShaderMaterial({ vertexShader: GOB_VERTEX, fragmentShader: GOB_FRAGMENT, uniforms: shared });
  const gobs = new THREE.InstancedMesh(gobGeometry, gobMaterial, GOBS + SPATTER);
  gobs.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('surge', gobs));
  const CASCADES = [0, ...course.falls];
  const throws = Array.from({ length: GOBS }, (_, i) => {
    // The first 90 leave the lip, the last 60 the foot where the swollen fan meets the lake, the rest the drops.
    const foot = i >= GOBS - 60;
    const from = i < 90 ? 0 : foot ? course.length - rng.range(2, 22) : (CASCADES[1 + (i % (CASCADES.length - 1))] as number);
    const p = course.at(from + rng.range(-3, 3));
    const side = rng.range(-1, 1) * (foot ? 0.8 : 1);
    const out = rng.range(4, 13);
    return {
      from,
      foot,
      // They leave in fits: most with the front, some in a later clutch.
      delay: 0.02 + 1.6 * Math.pow(rng.next(), 2.5) + (rng.next() < 0.3 ? rng.range(0.4, 1.5) : 0),
      at: new THREE.Vector3(p.x - p.dz * side * p.half, river.height(p.x, p.z) + 1, p.z + p.dx * side * p.half),
      velocity: new THREE.Vector3(p.dx * out + rng.range(-3, 3), rng.range(1, 5) + 6 * Math.pow(rng.next(), 2), p.dz * out + rng.range(-3, 3)),
      size: 0.2 + 0.4 * Math.pow(rng.next(), 2.5),
    };
  });
  const spatter = Array.from({ length: SPATTER }, (_, i) => {
    const from = (course.falls[i % course.falls.length] as number) + rng.range(1, 5);
    const p = course.at(from);
    const side = rng.range(-0.8, 0.8);
    const out = rng.range(0.5, 3.5);
    return {
      phase: rng.range(0, CYCLE),
      at: new THREE.Vector3(p.x - p.dz * side * p.half, river.height(p.x, p.z) + 0.3, p.z + p.dx * side * p.half),
      velocity: new THREE.Vector3(p.dx * out + rng.range(-1.2, 1.2), rng.range(1, 4.5), p.dz * out + rng.range(-1.2, 1.2)),
      size: 0.17 + 0.15 * Math.pow(rng.next(), 3),
    };
  });
  const dummy = new THREE.Object3D();
  const way = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  return {
    setTime: (seconds) => {
      const since = seconds - surgeAt;
      const front = surgeFront(since);
      // Nothing switches. The glow in the tube and the head at the lip come up over the lead, the head tips over the lip at the strike,
      // and from there each light rises as the front reaches what it lights.
      const up = smooth(-LEAD, 0.3, since);
      const after = Math.max(since, 0);
      shared.uFlare.value = 1 + up * (0.6 + 1.4 * Math.exp(-after / 0.9));
      shared.uSurge.value.set(front, smooth(-LEAD, 0.1, since), smooth(-LEAD, 0, since) * Math.exp(-after / 0.5), course.length);
      // The round light in the mouth also lights the fume before it, so it rises far less than the river's own light on the rim does.
      mouthLight.radiance.copy(base[0] as THREE.Vector3).multiplyScalar(1 + up * (0.2 + 0.5 * Math.exp(-after / 0.9)));
      bodyLight.radiance.copy(base[1] as THREE.Vector3).multiplyScalar(1 + 0.8 * smooth(bodyAt - 0.3, bodyAt + 0.5, since));
      footLight.radiance.copy(base[2] as THREE.Vector3).multiplyScalar(1 + 0.9 * smooth(footLightAt - 0.3, footLightAt + 0.6, since));
      const p = course.at(Math.min(course.length - 10, Math.max(0, front + 6)));
      surgeLight.position.set(p.x, river.height(p.x, p.z) + 3, p.z);
      surgeLight.radius = 9 + 3 * Math.exp(-after / 0.5);
      surgeLight.radiance.set(...blackbody(1470)).multiplyScalar(smooth(-0.05, 0.4, since) * (0.9 + 0.3 * Math.exp(-after / 0.5)) * smooth(course.length + 20, course.length - 30, front));

      for (let i = 0; i < GOBS; i++) {
        const t = throws[i] as (typeof throws)[number];
        // Each gob leaves when the front reaches the place it is thrown from.
        const age = since - surgeReaches(t.from) - t.delay;
        const y = t.at.y + t.velocity.y * age - 4.9 * age * age;
        const x = t.at.x + t.velocity.x * age;
        const z = t.at.z + t.velocity.z * age;
        const live = age > 0 && y > Math.max(0, river.height(x, z)) - 0.5;
        const size = live ? t.size : 0;
        // A gob is drawn out along its flight, the more the faster it goes.
        way.set(t.velocity.x, t.velocity.y - 9.8 * age, t.velocity.z);
        const speed = way.length();
        dummy.position.set(x, live ? y : -500, z);
        dummy.quaternion.setFromUnitVectors(UP, way.divideScalar(Math.max(speed, 0.001)));
        dummy.scale.set(size, size * (1.5 + 0.09 * speed), size);
        dummy.updateMatrix();
        gobs.setMatrixAt(i, dummy.matrix);
        // A clot leaves yellow, reddens and goes black in the air, the small ones first.
        seed.setX(i, Math.max(650, 1500 - (330 + 55 / t.size) * Math.max(0, age)));
      }
      for (let i = 0; i < SPATTER; i++) {
        const t = spatter[i] as (typeof spatter)[number];
        const age = (((seconds + t.phase) % CYCLE) + CYCLE) % CYCLE;
        const y = t.at.y + t.velocity.y * age - 4.9 * age * age;
        const live = y > t.at.y - 2.5;
        way.set(t.velocity.x, t.velocity.y - 9.8 * age, t.velocity.z);
        const speed = way.length();
        dummy.position.set(t.at.x + t.velocity.x * age, live ? y : -500, t.at.z + t.velocity.z * age);
        dummy.quaternion.setFromUnitVectors(UP, way.divideScalar(Math.max(speed, 0.001)));
        const size = live ? t.size : 0;
        dummy.scale.set(size, size * (1.2 + 0.045 * speed), size);
        dummy.updateMatrix();
        gobs.setMatrixAt(GOBS + i, dummy.matrix);
        seed.setX(GOBS + i, Math.max(700, 1470 - (60 / Math.pow(t.size, 0.9)) * age));
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
