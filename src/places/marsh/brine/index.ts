// The brine of the Blood Marsh: the level red water of the seep pool, the vein and the creeks (part `brine`), the domes of gas that swell on the
// seep pool (part `domes`), and the tearing of a dome into a crown and drops, with the rings it leaves (part `burst`).
// All of it is a function of the place's seconds: every dome has a period and a moment in it, and nothing is remembered between frames.
import * as THREE from 'three';
import { BURST, HERO_DOME, POOL_R, SMALL_BURST, SMALL_DOME, TAU, fract, rel } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { landShared } from '../land';
import { bakeRipple } from '../land/tiles';
import { BRINE_DEPTH, BRINE_FRAGMENT, BRINE_VERTEX, CROWN_FRAGMENT, CROWN_VERTEX, DOME_FRAGMENT, DOME_VERTEX, MAX_RINGS, MAX_SEEPS } from './shaders';

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
/** Seconds a dome takes to tear open from one side and fall back: ten frames. */
const TEAR = 0.17;
const DROP_LIFE = 1.5;
const RING_LIFE = 5;
const RING_SPEED = 0.9;

export function create(ctx: Context): Piece {
  const { grain, field, plates } = landShared();
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

  const uniforms = { ...ctx.rig.uniforms, tGrain: { value: grain }, tPlates: { value: plates } };
  const rings = Array.from({ length: MAX_RINGS }, () => new THREE.Vector4());
  const ringCount = { value: 0 };
  // Where gas comes up all the time: the main seep under the steam, and lesser ones over the pool's floor.
  const seepRng = ctx.rng('brine/seeps');
  const seeps = Array.from({ length: MAX_SEEPS }, (_, i) => {
    if (i === 0) return new THREE.Vector4(-3.4, -1.6, 0.31, 0.06);
    // Gas comes up under each of the two great domes before and after it stands: their rings never stop.
    if (i === 1) return new THREE.Vector4(HERO_DOME[0], HERO_DOME[1], 0.67, 0.075);
    if (i === 2) return new THREE.Vector4(SMALL_DOME[0], SMALL_DOME[1], 0.13, 0.06);
    const a = seepRng.range(0, TAU);
    const r = seepRng.range(1.5, POOL_R * 0.8);
    return new THREE.Vector4(Math.sin(a) * r, Math.cos(a) * r, seepRng.next(), seepRng.range(0.015, 0.04));
  });

  // The mirror: the scene as the level brine sees it, drawn a quarter of the frame's size before every sample.
  const MIRROR_SHARE = 4;
  const mirror = new THREE.WebGLRenderTarget(480, 270, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  mirror.texture.generateMipmaps = false;
  const under = new THREE.PerspectiveCamera();
  const blank = (ctx.rig.uniforms.tMirror as THREE.IUniform<THREE.Texture>).value;
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const eye = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const upward = new THREE.Vector3();

  const surface = new THREE.ShaderMaterial({
    vertexShader: BRINE_VERTEX,
    fragmentShader: BRINE_FRAGMENT,
    uniforms: { ...uniforms, uWade: { value: new THREE.Vector2(...rel(34.3, 3)) }, tFieldNear: { value: field.near }, tFieldFar: { value: field.far }, uRings: { value: rings }, uRingCount: ringCount, uSeeps: { value: seeps }, tRipple: { value: bakeRipple(ctx.rng('brine/ripple')) }, tFroth: { value: ctx.assets.texture('mat/froth.jpg', { kind: 'colour', repeat: true, anisotropy: 4 }) } },
    toneMapped: false,
  });
  surface.userData.depthFragment = BRINE_DEPTH;
  // The surface is laid only where there is brine: squares of two metres, kept where any of their ground is within a stride of a shore.
  const cell = 2;
  const half = 250;
  const count = (half * 2) / cell;
  const wetCell = new Uint8Array(count * count);
  for (let j = 0; j < count; j++) {
    for (let i = 0; i < count; i++) {
      let least = 9;
      for (let v = 0; v <= 4 && least > 0.6; v++) {
        for (let u = 0; u <= 4; u++) least = Math.min(least, field.shore(-half + (i + u / 4) * cell, -half + (j + v / 4) * cell));
      }
      wetCell[j * count + i] = least < 0.6 ? 1 : 0;
    }
  }
  const corners: number[] = [];
  for (let j = 0; j < count; j++) {
    let i = 0;
    while (i < count) {
      if (!wetCell[j * count + i]) {
        i++;
        continue;
      }
      let end = i;
      while (end < count && wetCell[j * count + end]) end++;
      const x0 = -half + i * cell;
      const x1 = -half + end * cell;
      const z0 = -half + j * cell;
      const z1 = z0 + cell;
      corners.push(x0, 0, z0, x0, 0, z1, x1, 0, z0, x1, 0, z0, x0, 0, z1, x1, 0, z1);
      i = end;
    }
  }
  const plane = new THREE.BufferGeometry();
  plane.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3));
  const water = new THREE.Mesh(plane, surface);
  water.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('brine', water));

  // The skin of a dome is a film: drawn over what is behind it, premultiplied, after everything solid.
  const skin = new THREE.ShaderMaterial({
    vertexShader: DOME_VERTEX, fragmentShader: DOME_FRAGMENT, uniforms, toneMapped: false, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const dropSkin = new THREE.ShaderMaterial({ vertexShader: DOME_VERTEX, fragmentShader: DOME_FRAGMENT, uniforms, defines: { DROP: 1 }, toneMapped: false });
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
  const dropMesh = new THREE.InstancedMesh(bead, dropSkin, dropCount);
  dropMesh.frustumCulled = false;
  // What each drop is thrown with: direction round the dome, speed out, speed up, size. Fixed at creation.
  const throwRng = ctx.rng('brine/drops');
  const thrown = new Float32Array(dropCount * 5);
  for (let i = 0; i < dropCount; i++) {
    thrown[i * 5] = throwRng.range(0, TAU);
    thrown[i * 5 + 1] = throwRng.range(0.25, 1.9);
    thrown[i * 5 + 2] = throwRng.range(1.6, 4.6);
    thrown[i * 5 + 3] = 0.004 + 0.02 * Math.pow(throwRng.next(), 2.6);
    thrown[i * 5 + 4] = throwRng.next();
  }

  const crownMaterial = new THREE.ShaderMaterial({
    vertexShader: CROWN_VERTEX, fragmentShader: CROWN_FRAGMENT, uniforms, side: THREE.DoubleSide, toneMapped: false, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
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
      // The skin does not vanish: it opens from one side over ten frames and sags as the gas leaves it.
      const tear = age >= 0 && age < TEAR ? age / TEAR : 0;
      const full = age >= 0 && age < TEAR ? 1 : grow;
      const r = d.size * (0.35 + 0.65 * full) * (swell > 0 || tear > 0 || (age >= 0 && age < TEAR) ? 1 : 0);
      const tall = r * (0.22 + 0.5 * full) * (1 - 0.5 * tear * tear);
      m.makeScale(r, tall, r).setPosition(d.x, -0.01, d.z);
      domeMesh.setMatrixAt(i, m);
      domeLife.setXYZW(i, full, d.seed, d.size, age >= 0 && age < TEAR ? Math.max(tear, 0.04) : 0);

      // The crown and the drops leave when the skin is half open.
      const flung = age >= 0 ? age - TEAR * 0.5 : -1;
      // The crown stands for a third of a second and is gone.
      const crowned = flung >= 0 && flung < 0.59 * Math.sqrt(d.size / 0.4);
      m.makeScale(1, 1, 1).setPosition(d.x, 0, d.z);
      crownMesh.setMatrixAt(i, m);
      crownLife.setXYZW(i, crowned ? flung : 0, d.seed, d.size, 0);

      for (let k = 0; k < d.drops; k++, drop++) {
        const a = thrown[drop * 5] as number;
        const out = (thrown[drop * 5 + 1] as number) * Math.sqrt(d.size / 0.4);
        const rise = (thrown[drop * 5 + 2] as number) * Math.sqrt(d.size / 0.4);
        const size = (thrown[drop * 5 + 3] as number) * (0.6 + d.size);
        const y = flung < 0 ? -1 : 0.25 * d.size + rise * flung - 4.905 * flung * flung;
        if (flung < 0 || flung > DROP_LIFE || y < -size) {
          m.makeScale(0, 0, 0);
          dropMesh.setMatrixAt(drop, m);
          continue;
        }
        const reach = d.size * 0.8 + out * flung;
        pos.set(d.x + Math.cos(a) * reach, y, d.z + Math.sin(a) * reach);
        // A drop in flight is drawn out along its way and trails a thinner tail.
        dir.set(Math.cos(a) * out, rise - 9.81 * flung, Math.sin(a) * out);
        const speed = dir.length();
        q.setFromUnitVectors(up, dir.divideScalar(speed || 1));
        scale.set(size, size * (1 + 0.22 * speed), size);
        m.compose(pos, q, scale);
        dropMesh.setMatrixAt(drop, m);
        dropLife.setXYZW(drop, 0.5, thrown[drop * 5 + 4] as number, size, 0);
      }

      // Where each of the larger drops comes down it leaves a ring of its own.
      if (flung > 0 && i < 2) {
        const first = drop - d.drops;
        for (let k = 0; k < 7 && ring < MAX_RINGS; k++) {
          const a = thrown[(first + k * 5) * 5] as number;
          const out = (thrown[(first + k * 5) * 5 + 1] as number) * Math.sqrt(d.size / 0.4);
          const rise = (thrown[(first + k * 5) * 5 + 2] as number) * Math.sqrt(d.size / 0.4);
          const lands = (rise + Math.sqrt(rise * rise + 4.905 * d.size)) / 9.81;
          const since = flung - lands;
          if (since <= 0 || since > 1.6) continue;
          const reach = d.size * 0.8 + out * lands;
          (rings[ring++] as THREE.Vector4).set(d.x + Math.cos(a) * reach, d.z + Math.sin(a) * reach, 0.04 + 0.55 * since, 0.5 * Math.min(1, since * 10) * Math.pow(1 - since / 1.6, 1.5));
        }
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
        (rings[ring++] as THREE.Vector4).set(d.x, d.z, r + 0.14, 0.55 * grow);
        // And, round the larger ones, a second, wider and lower, that left it a breath ago.
        if (ring < MAX_RINGS && d.size > 0.3) (rings[ring++] as THREE.Vector4).set(d.x, d.z, r * 1.7 + 0.5, 0.3 * grow);
        if (ring < MAX_RINGS && d.size > 0.3) (rings[ring++] as THREE.Vector4).set(d.x, d.z, r * 2.5 + 1.1, 0.18 * grow);
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
    resize: (width, height) => {
      mirror.setSize(Math.max(8, Math.round(width / MIRROR_SHARE)), Math.max(8, Math.round(height / MIRROR_SHARE)));
    },
    beforeSample: (renderer, camera) => {
      const u = ctx.rig.uniforms;
      // The lens, put as far under the brine's level as it stands over it, looking up at the same things.
      eye.setFromMatrixPosition(camera.matrixWorld);
      ahead.set(0, 0, -1).transformDirection(camera.matrixWorld);
      upward.set(0, 1, 0).transformDirection(camera.matrixWorld);
      under.position.set(eye.x, -eye.y, eye.z);
      under.up.set(upward.x, -upward.y, upward.z);
      under.lookAt(eye.x + ahead.x, -eye.y - ahead.y, eye.z + ahead.z);
      under.near = camera.near;
      under.far = camera.far;
      under.projectionMatrix.copy(camera.projectionMatrix);
      under.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
      under.updateMatrixWorld(true);
      (u.uMirrorMatrix as THREE.IUniform<THREE.Matrix4>).value.copy(bias).multiply(under.projectionMatrix).multiply(under.matrixWorldInverse);
      (u.tMirror as THREE.IUniform<THREE.Texture>).value = blank;
      (u.uMirror as THREE.IUniform<number>).value = 1;
      water.visible = false;
      renderer.setRenderTarget(mirror);
      renderer.clear(true, true, false);
      renderer.render(ctx.scene, under);
      renderer.setRenderTarget(null);
      water.visible = true;
      (u.uMirror as THREE.IUniform<number>).value = 0;
      (u.tMirror as THREE.IUniform<THREE.Texture>).value = mirror.texture;
    },
    dispose: () => {
      mirror.dispose();
      plane.dispose();
      ball.dispose();
      bead.dispose();
      tube.dispose();
      surface.dispose();
      skin.dispose();
      dropSkin.dispose();
      crownMaterial.dispose();
    },
  };
}
