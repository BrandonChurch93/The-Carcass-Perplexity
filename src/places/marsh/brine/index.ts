// The brine of the Blood Marsh: the level red water of the seep pool, the vein and the creeks (part `brine`), the domes of gas that swell on the
// seep pool (part `domes`), and the tearing of a dome into a crown and drops, with the rings it leaves (part `burst`).
// All of it is a function of the place's seconds: every dome has a period and a moment in it, and nothing is remembered between frames.
import * as THREE from 'three';
import { BURST, HERO_DOME, POOL_R, SMALL_BURST, SMALL_DOME, TAU, fract } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { landShared } from '../land';
import { BRINE_DEPTH, BRINE_FRAGMENT, BRINE_VERTEX, CROWN_FRAGMENT, CROWN_VERTEX, DOME_FRAGMENT, DOME_VERTEX, MAX_RINGS } from './shaders';

export const PARTS = ['brine', 'domes', 'burst'] as const;

interface Dome {
  x: number;
  z: number;
  /** Radius at full swell, metres. */
  size: number;
  period: number;
  /** Seconds, in the place, of one of its bursts. */
  burst: number;
  seed: number;
  drops: number;
}

/** The share of a dome's period it spends swelling; the rest is the burst and the still water after it. */
const SWELL = 0.8;
const DROP_LIFE = 1.5;
const RING_LIFE = 5;
const RING_SPEED = 0.9;

export function create(ctx: Context): Piece {
  const { grain, field } = landShared();
  const rng = ctx.rng('brine/domes');

  const domes: Dome[] = [
    { x: HERO_DOME[0], z: HERO_DOME[1], size: 0.62, period: 10.4, burst: BURST, seed: 0.37, drops: 46 },
    { x: SMALL_DOME[0], z: SMALL_DOME[1], size: 0.4, period: 7.6, burst: SMALL_BURST, seed: 0.81, drops: 30 },
  ];
  for (let i = 0; i < 9; i++) {
    const a = rng.range(0, TAU);
    const r = rng.range(0.6, POOL_R * 0.62);
    const period = rng.range(3.6, 7.5);
    domes.push({ x: Math.sin(a) * r - 1.5, z: Math.cos(a) * r - 1, size: rng.range(0.14, 0.36), period, burst: rng.range(0, period), seed: rng.next(), drops: 10 });
  }

  const uniforms = { ...ctx.rig.uniforms, tGrain: { value: grain } };
  const rings = Array.from({ length: MAX_RINGS }, () => new THREE.Vector4());
  const ringCount = { value: 0 };

  const surface = new THREE.ShaderMaterial({
    vertexShader: BRINE_VERTEX,
    fragmentShader: BRINE_FRAGMENT,
    uniforms: { ...uniforms, tFieldNear: { value: field.near }, tFieldFar: { value: field.far }, uRings: { value: rings }, uRingCount: ringCount },
    toneMapped: false,
  });
  surface.userData.depthFragment = BRINE_DEPTH;
  const plane = new THREE.PlaneGeometry(500, 500, 1, 1).rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(plane, surface);
  water.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('brine', water));

  const skin = new THREE.ShaderMaterial({ vertexShader: DOME_VERTEX, fragmentShader: DOME_FRAGMENT, uniforms, toneMapped: false });
  const ball = new THREE.SphereGeometry(1, 40, 16, 0, TAU, 0, Math.PI / 2);
  const domeLife = new THREE.InstancedBufferAttribute(new Float32Array(domes.length * 4), 4);
  ball.setAttribute('aLife', domeLife);
  const domeMesh = new THREE.InstancedMesh(ball, skin, domes.length);
  domeMesh.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('domes', domeMesh));

  const dropCount = domes.reduce((n, d) => n + d.drops, 0);
  const bead = new THREE.SphereGeometry(1, 12, 8);
  const dropLife = new THREE.InstancedBufferAttribute(new Float32Array(dropCount * 4), 4);
  bead.setAttribute('aLife', dropLife);
  const dropMesh = new THREE.InstancedMesh(bead, skin, dropCount);
  dropMesh.frustumCulled = false;
  // What each drop is thrown with: direction round the dome, speed out, speed up, size. Fixed at creation.
  const throwRng = ctx.rng('brine/drops');
  const thrown = new Float32Array(dropCount * 5);
  for (let i = 0; i < dropCount; i++) {
    thrown[i * 5] = throwRng.range(0, TAU);
    thrown[i * 5 + 1] = throwRng.range(0.25, 1.9);
    thrown[i * 5 + 2] = throwRng.range(1.6, 4.6);
    thrown[i * 5 + 3] = 0.008 + 0.026 * Math.pow(throwRng.next(), 2.2);
    thrown[i * 5 + 4] = throwRng.next();
  }

  const crownMaterial = new THREE.ShaderMaterial({ vertexShader: CROWN_VERTEX, fragmentShader: CROWN_FRAGMENT, uniforms, side: THREE.DoubleSide, toneMapped: false });
  const tube = new THREE.CylinderGeometry(1, 1, 1, 72, 10, true).translate(0, 0.5, 0);
  const crownLife = new THREE.InstancedBufferAttribute(new Float32Array(domes.length * 4), 4);
  tube.setAttribute('aLife', crownLife);
  const crownMesh = new THREE.InstancedMesh(tube, crownMaterial, domes.length);
  crownMesh.frustumCulled = false;
  const burst = new THREE.Group();
  burst.add(crownMesh, dropMesh);
  ctx.scene.add(ctx.parts.built('burst', burst));

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();

  const setTime = (t: number): void => {
    let ring = 0;
    let drop = 0;
    domes.forEach((d, i) => {
      // Where the dome is in its life: 0 at the moment it starts to swell, SWELL when it tears.
      const cycle = fract((t - d.burst) / d.period + SWELL);
      const swell = cycle < SWELL ? cycle / SWELL : 0;
      const age = cycle >= SWELL ? (cycle - SWELL) * d.period : -1;
      // It rises slowly, then quickly at the last: gas gathers under a skin that gives.
      const grow = swell <= 0 ? 0 : 0.25 * swell + 0.75 * Math.pow(swell, 2.6);
      const r = d.size * (0.35 + 0.65 * grow) * (swell > 0 ? 1 : 0);
      const tall = r * (0.25 + 0.75 * grow);
      m.makeScale(r, tall, r).setPosition(d.x, -0.01, d.z);
      domeMesh.setMatrixAt(i, m);
      domeLife.setXYZW(i, grow, d.seed, d.size, 0);

      // The crown stands for a third of a second and is gone.
      const crowned = age >= 0 && age < 0.55 * Math.sqrt(d.size / 0.4);
      m.makeScale(1, 1, 1).setPosition(d.x, 0, d.z);
      crownMesh.setMatrixAt(i, m);
      crownLife.setXYZW(i, crowned ? age : 0, d.seed, d.size, 0);

      for (let k = 0; k < d.drops; k++, drop++) {
        const a = thrown[drop * 5] as number;
        const out = (thrown[drop * 5 + 1] as number) * Math.sqrt(d.size / 0.4);
        const rise = (thrown[drop * 5 + 2] as number) * Math.sqrt(d.size / 0.4);
        const size = (thrown[drop * 5 + 3] as number) * (0.6 + d.size);
        const y = age < 0 ? -1 : 0.25 * d.size + rise * age - 4.905 * age * age;
        if (age < 0 || age > DROP_LIFE || y < -size) {
          m.makeScale(0, 0, 0);
          dropMesh.setMatrixAt(drop, m);
          continue;
        }
        const reach = d.size * 0.8 + out * age;
        pos.set(d.x + Math.cos(a) * reach, y, d.z + Math.sin(a) * reach);
        // A drop in flight is drawn out along its way and trails a thinner tail.
        dir.set(Math.cos(a) * out, rise - 9.81 * age, Math.sin(a) * out);
        const speed = dir.length();
        q.setFromUnitVectors(up, dir.divideScalar(speed || 1));
        scale.set(size, size * (1 + 0.22 * speed), size);
        m.compose(pos, q, scale);
        dropMesh.setMatrixAt(drop, m);
        dropLife.setXYZW(drop, 0.5, thrown[drop * 5 + 4] as number, size, 0);
      }

      // Rings: one from the tear, a second and a third from the skin and the drops falling back.
      if (age >= 0) {
        for (let k = 0; k < 3 && ring < MAX_RINGS; k++) {
          const since = age - k * 0.42;
          if (since <= 0 || since > RING_LIFE) continue;
          const fade = Math.min(1, since * 6) * Math.pow(1 - since / RING_LIFE, 1.5) * (k === 0 ? 1 : 0.6);
          (rings[ring++] as THREE.Vector4).set(d.x, d.z, d.size * 0.8 + RING_SPEED * since, fade * (0.35 + d.size));
        }
      } else if (ring < MAX_RINGS && swell > 0.5) {
        // A swelling dome pushes a low ripple ahead of its foot.
        (rings[ring++] as THREE.Vector4).set(d.x, d.z, r + 0.12, 0.25 * grow);
      }
    });
    ringCount.value = ring;
    domeMesh.instanceMatrix.needsUpdate = true;
    domeLife.needsUpdate = true;
    crownMesh.instanceMatrix.needsUpdate = true;
    crownLife.needsUpdate = true;
    dropMesh.instanceMatrix.needsUpdate = true;
    dropLife.needsUpdate = true;
  };

  return {
    setTime,
    dispose: () => {
      plane.dispose();
      ball.dispose();
      bead.dispose();
      tube.dispose();
      surface.dispose();
      skin.dispose();
      crownMaterial.dispose();
    },
  };
}
