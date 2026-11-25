// The sky, the air between the camera and everything else, the fume, the steam of every source, and the shimmer of hot air.
// sky.ts is the dome; volume.ts holds the two half-size passes (the light of the air, and the bend of hot air); noise.ts is the block of noise they are cut from.
import * as THREE from 'three';
import { volumeUniforms } from '../../../core/engine';
import { QUAD_VERTEX } from '../../../core/post';
import { CRACK_FOOT, CRACK_TOP, FALL_FOOT, SPATTER_LEFT, SPATTER_RIGHT, SUNK } from '../shared/anchors';
import type { HeartContext, HeartPiece, HeatSource, SteamSource } from '../shared/context';
import { blackbody } from '../shared/rig';
import { bakeNoise } from './noise';
import { createSky } from './sky';
import { MAX_HEAT, MAX_STEAM, VOLUME_FRAGMENT, WARP_FRAGMENT } from './volume';

export const PARTS: readonly string[] = ['sky', 'air', 'fume'];

/** The open lava under the fume, as one round light of the rig: where it is, how wide, and what part of its face is open at 1400 K. */
const FUME_LIGHT = { at: [760, 25, -40] as const, radius: 150, open: 0.2 };

/** Until the other folders push their own, the vapours and the hot air the pictures show. Used only when the lists are empty. */
function standIns(ctx: HeartContext): { steam: SteamSource[]; heat: HeatSource[] } {
  const on = (x: number, z: number, lift = 0): [number, number, number] => [x, Math.max(0, ctx.rig.land.height(x, z)) + lift, z];
  const steam: SteamSource[] = [];
  for (let i = 0; i < 4; i++) {
    const k = i / 3;
    const x = CRACK_FOOT[0] + (CRACK_TOP[0] - CRACK_FOOT[0]) * k;
    const z = CRACK_FOOT[1] + (CRACK_TOP[2] - CRACK_FOOT[1]) * k;
    steam.push({ at: on(x, z), radius: 1.5 + 0.6 * k, strength: 0.7 + 0.3 * k, rise: 8 + 5 * k, kind: 'steam', lean: [-0.55, 0.2] });
  }
  for (const p of [SPATTER_RIGHT[1], SPATTER_RIGHT[2], SPATTER_LEFT[1]]) {
    if (p) steam.push({ at: [p[0], 0.5, p[2]], radius: 13, strength: 0.6, rise: 70, kind: 'smoke', lean: [-0.35, 0.1] });
  }
  steam.push({ at: [FALL_FOOT[0], 1, FALL_FOOT[1]], radius: 20, strength: 0.6, rise: 90, kind: 'smoke', lean: [-0.25, 0.1] });
  steam.push({ at: [SUNK[0] + 1, 0.3, SUNK[2] - 1], radius: 1.6, strength: 0.3, rise: 6, kind: 'smoke', lean: [-0.5, 0.2] });
  const heat: HeatSource[] = [{ at: [FALL_FOOT[0], 0, FALL_FOOT[1]], radius: 60, height: 40, strength: 0.6 }];
  return { steam, heat };
}

export function create(ctx: HeartContext): HeartPiece {
  const noise = bakeNoise(ctx.rng('air/noise'));
  const sky = createSky(ctx, noise);
  ctx.scene.add(ctx.parts.built('sky', sky.dome));
  ctx.parts.effect('air', 'built');
  ctx.parts.effect('fume', 'built');

  const local = standIns(ctx);
  const seeds = ctx.rng('air/steam');
  const steamSeed = Array.from({ length: 64 }, () => seeds.next() * 7);

  const u = ctx.rig.uniforms;
  const zenith = (u.uSkyZenith as THREE.IUniform<THREE.Vector3>).value;
  const horizon = (u.uSkyHorizon as THREE.IUniform<THREE.Vector3>).value;
  const warm = (u.uWarmColour as THREE.IUniform<THREE.Vector3>).value;
  const skyMean = new THREE.Vector3();
  const fume = { position: new THREE.Vector3(...FUME_LIGHT.at), radius: FUME_LIGHT.radius, radiance: new THREE.Vector3(...blackbody(1400)).multiplyScalar(FUME_LIGHT.open) };
  ctx.rig.emitters.push(fume);

  const steamA = Array.from({ length: MAX_STEAM }, () => new THREE.Vector4());
  const steamB = Array.from({ length: MAX_STEAM }, () => new THREE.Vector4());
  const steamC = Array.from({ length: MAX_STEAM }, () => new THREE.Vector4());
  const heatA = Array.from({ length: MAX_HEAT }, () => new THREE.Vector4());
  const heatB = Array.from({ length: MAX_HEAT }, () => new THREE.Vector4());
  const show = { air: { value: 1 }, fume: { value: 1 } };

  const pass = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({
      vertexShader: QUAD_VERTEX,
      fragmentShader,
      uniforms: { ...ctx.rig.uniforms, ...volumeUniforms(), tNoise: { value: noise }, uShowAir: show.air, ...uniforms },
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      toneMapped: false,
    });

  const volume = pass(VOLUME_FRAGMENT, {
    uShowFume: show.fume,
    uSkyMean: { value: skyMean },
    uSteamCount: { value: 0 },
    uSteamA: { value: steamA },
    uSteamB: { value: steamB },
    uSteamC: { value: steamC },
  });
  const warp = pass(WARP_FRAGMENT, {
    uHeatCount: { value: 0 },
    uHeatA: { value: heatA },
    uHeatB: { value: heatB },
  });

  const order: { source: SteamSource; index: number; far: number; small: number }[] = [];

  return {
    volume,
    warp,
    beforeSample: (_renderer, camera) => {
      // The mean of the sky the rig lights with: what a point of open air receives from above.
      skyMean.copy(horizon).multiplyScalar(0.45).addScaledVector(zenith, 0.55).addScaledVector(warm, 0.12);

      // The sources are read every sample, since a folder may move its own, and drawn nearest first.
      const steam = ctx.sources.steam.length > 0 ? ctx.sources.steam : local.steam;
      order.length = 0;
      steam.forEach((source, index) => {
        if (source.strength <= 0 || source.rise <= 0) return;
        const far = Math.hypot(source.at[0] - camera.position.x, source.at[1] - camera.position.y, source.at[2] - camera.position.z);
        order.push({ source, index, far, small: far / (source.rise + source.radius) });
      });
      // The sixteen that are largest in the frame, then nearest first: the shader lays them front to back.
      order.sort((a, b) => a.small - b.small || a.index - b.index);
      order.length = Math.min(MAX_STEAM, order.length);
      order.sort((a, b) => a.far - b.far || a.index - b.index);
      const count = order.length;
      for (let i = 0; i < count; i++) {
        const { source: s, index } = order[i] as (typeof order)[number];
        const smoke = s.kind !== 'steam';
        const radius = Math.max(0.05, s.radius);
        (steamA[i] as THREE.Vector4).set(s.at[0], s.at[1], s.at[2], radius);
        // Thickness for a metre of path: a source of strength 1 is all but opaque across its own foot.
        (steamB[i] as THREE.Vector4).set(s.lean?.[0] ?? 0, s.lean?.[1] ?? 0, s.rise, (s.strength * (smoke ? 2.4 : 1.4)) / radius);
        // Steam is quick, smoke is slow; the grain of each is set by the size of its foot.
        const speed = smoke ? Math.min(4, 1 + s.rise * 0.035) : Math.min(3.2, 1.2 + s.rise * 0.16);
        (steamC[i] as THREE.Vector4).set(steamSeed[index % steamSeed.length] as number, speed, s.kind === 'fume' ? radius * 2.5 : smoke ? Math.max(3.5, radius * 5) : Math.max(5, radius * 14), s.kind === 'fume' ? 2 : smoke ? 1 : 0);
      }
      (volume.uniforms.uSteamCount as THREE.IUniform<number>).value = count;

      const heat = ctx.sources.heat.length > 0 ? ctx.sources.heat : local.heat;
      const heats = Math.min(MAX_HEAT, heat.length);
      for (let i = 0; i < heats; i++) {
        const h = heat[i] as HeatSource;
        (heatA[i] as THREE.Vector4).set(h.at[0], h.at[1], h.at[2], Math.max(0.05, h.radius));
        (heatB[i] as THREE.Vector4).set(Math.max(0.05, h.height), h.strength, 0, 0);
      }
      (warp.uniforms.uHeatCount as THREE.IUniform<number>).value = heats;
    },
    solo: (part) => {
      show.air.value = part === 'heart/fume' ? 0 : 1;
      show.fume.value = part === 'heart/air' ? 0 : 1;
    },
    dispose: () => {
      sky.dispose();
      volume.dispose();
      warp.dispose();
      noise.dispose();
    },
  };
}
