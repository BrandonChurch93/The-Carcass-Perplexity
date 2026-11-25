// The sky, the air between the camera and everything else, the fume, the steam of every source, and the shimmer of hot air.
// sky.ts is the dome; smoke.ts marches every smoke and vapour at a quarter of the frame, without grain; volume.ts holds the two half-size passes (the haze with
// the smoke laid into it, and the bend of hot air); noise.ts is the block of noise they are cut from.
import * as THREE from 'three';
import { volumeUniforms } from '../../../core/engine';
import { QUAD_VERTEX } from '../../../core/post';
import { secondsInPlace, shotById } from '../../../film/cut';
import { CRACK_FOOT, CRACK_TOP, FALL_FOOT, GROUP, SPATTER_LEFT, SPATTER_RIGHT, SUNK, UNIT } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import type { HeartContext, HeartPiece, HeatSource, SteamSource } from '../shared/context';
import { blackbody } from '../shared/rig';
import { bakeNoise } from './noise';
import { createAsh } from './ash';
import { createSky } from './sky';
import { createSmoke, MAX_BODIES, MAX_STEAM } from './smoke';
import { MAX_HEAT, VOLUME_FRAGMENT, WARP_FRAGMENT } from './volume';

export const PARTS: readonly string[] = ['sky', 'air', 'fume', 'ash'];

/** The open lava under the fume, as one round light of the rig: where it is, how wide, and what part of its face is open at 1400 K. */
const FUME_LIGHT = { at: [760, 25, -40] as const, radius: 150, open: 0.2 };

/** A body of smoke: a leaning dome of lumps that stands on a level base. Lengths in metres, densities for a metre of path. */
interface Body {
  /** Centre of its base (x, z) and the height of that base. */
  at: readonly [number, number];
  base?: number;
  radius: number;
  height: number;
  /** Metres sideways (x, z) for each metre of height. */
  lean: readonly [number, number];
  dense: number;
  /** How much wider its top is than its base, and the share of its height over which it thins toward its foot. */
  widen?: number;
  foot?: number;
  /** Metres of one repeat of its lumps (a billow is about a fifth of it), how hard its edge is, metres a second its lumps climb. */
  repeat: number;
  hard?: number;
  climb?: number;
  colour: readonly [number, number, number];
  /** Light from below: the lava right under it (gain, metres of height it reaches), the whole glowing floor (gain, metres), the round lights (gain). */
  lake?: readonly [number, number];
  floor?: readonly [number, number];
  lights?: number;
  /** How much brighter than its body its sky-lit top is, and how solid it is (1.4 one mass, 0.6 separate billows). */
  tops?: number;
  solid?: number;
  /** Staging by shot: its density in a shot, as a share; `rest` is every other shot. */
  shots?: Readonly<Record<string, number>>;
}

const BROWN = [0.46, 0.34, 0.27] as const;
const GREY = [0.44, 0.38, 0.35] as const;
const ROSE = [0.5, 0.42, 0.33] as const;
/** The view of the walkers' key runs along this (x, z); its right is the second. */
const ALONG = [0.7, -0.71] as const;
const RIGHT = [0.71, 0.7] as const;
const behind = (along: number, right: number): [number, number] => [GROUP[0] + along * ALONG[0] + right * RIGHT[0], GROUP[2] + along * ALONG[1] + right * RIGHT[1]];
/** They lean with the low wind. */
const BANK_LEAN = [-0.35, 0.12] as const;
/** The long lens on the mouth looks along (0.582, -0.813): this is its right, and toward the camera. */
const fromFoot = (right: number, toward: number): [number, number] => [FALL_FOOT[0] + right * 0.813 - toward * 0.582, FALL_FOOT[1] + right * 0.582 + toward * 0.813];

const BODIES: readonly Body[] = [
  // The banks that rise off the lake behind and beside the feeding group. The two far ones stand across the right edge of the long lens on the mouth, so they are not drawn there.
  { at: behind(115, 6), radius: 30, height: 30, lean: BANK_LEAN, dense: 0.019, repeat: 48, hard: 2.6, climb: 2.2, colour: ROSE, foot: 0.06, lake: [0.45, 8], floor: [0.9, 7], lights: 0.2, tops: 0.9, solid: 0.6, shots: { 'heart-01': 0.08 } },
  { at: behind(150, 52), radius: 38, height: 26, lean: BANK_LEAN, dense: 0.016, repeat: 60, hard: 2.6, climb: 2.2, colour: ROSE, foot: 0.06, lake: [0.45, 8], floor: [0.9, 7], lights: 0.2, tops: 0.9, solid: 0.6, shots: { 'heart-01': 0.08 } },
  { at: behind(190, -8), radius: 44, height: 32, lean: BANK_LEAN, dense: 0.017, repeat: 70, hard: 2.6, climb: 2.2, colour: ROSE, foot: 0.06, lake: [0.45, 8], floor: [0.9, 7], lights: 0.2, tops: 0.9, solid: 0.6, shots: { 'heart-01': 0.08, 'heart-05': 0 } },
  { at: behind(240, 6), radius: 55, height: 30, lean: BANK_LEAN, dense: 0.016, repeat: 88, hard: 2.6, climb: 2.2, colour: ROSE, foot: 0.06, lake: [0.45, 8], floor: [0.9, 7], lights: 0.2, tops: 0.9, solid: 0.6, shots: { 'heart-01': 0.08, 'heart-05': 0 } },
  // What stands behind them in the feeding picture: warm brown smoke over the open lake, thin enough for the buttress to stand in it. Staged for that shot.
  { at: behind(430, -110), radius: 140, height: 34, lean: [-0.2, 0.08], dense: 0.003, repeat: 160, hard: 2.2, climb: 1.2, colour: ROSE, foot: 0, floor: [1.5, 26], tops: 0.6, solid: 0.5, shots: { 'heart-02': 1, rest: 0 } },
  { at: behind(430, 290), radius: 300, height: 95, lean: [-0.2, 0.08], dense: 0.009, repeat: 220, hard: 2.2, climb: 1.2, colour: ROSE, foot: 0.15, floor: [0.7, 40], tops: 0.25, solid: 0.5, shots: { 'heart-02': 1, rest: 0 } },
  // And what lies on the lake between the lens and those banks: a thin sheet, so that the far crust goes into the smoke and no line stands where the lake ends.
  { at: behind(250, 0), radius: 230, height: 6, lean: [0, 0], dense: 0.0045, repeat: 70, hard: 2.2, climb: 0.3, colour: ROSE, foot: 0, lake: [0.15, 8], floor: [0.3, 7], lights: 0.2, tops: 0.9, solid: 0.9, shots: { 'heart-02': 1, rest: 0 } },
  // The smoke off the fan and the foot of the fall, for the long lens: strongest low, thinning upward, leaning right along the wall.
  { at: fromFoot(-34, 34), radius: 40, height: 45, lean: [0.26, 0.18], dense: 0.011, widen: 0.5, repeat: 96, hard: 2.2, climb: 3, colour: ROSE, foot: 0.06, lake: [0.28, 10], floor: [0.4, 22], lights: 0.9, tops: 0.85, solid: 0.3, shots: { 'heart-05': 1, rest: 0.08 } },
  { at: fromFoot(2, 26), radius: 44, height: 60, lean: [0.2, 0.14], dense: 0.011, widen: 0.4, repeat: 110, hard: 2.2, climb: 3.4, colour: ROSE, foot: 0.06, lake: [0.28, 10], floor: [0.4, 22], lights: 0.9, tops: 0.85, solid: 0.3, shots: { 'heart-05': 1, rest: 0.08 } },
  { at: fromFoot(22, 48), radius: 34, height: 38, lean: [0.16, 0.11], dense: 0.013, widen: 0.3, repeat: 84, hard: 2.2, climb: 2.4, colour: ROSE, foot: 0.08, lake: [0.28, 10], floor: [0.4, 22], lights: 0.9, tops: 0.85, solid: 0.3, shots: { 'heart-05': 1, rest: 0.08 } },
  // The plume of the wide view: one column that stands behind the west shoulder of the buttress, its source hidden by it, and widens as it climbs out of the picture. Off in the feeding shot, whose long lens would catch only one flank of it as a grey streak.
  { at: [505, -285], radius: 70, height: 700, lean: [-0.16, -0.18], dense: 0.02, widen: 7, foot: 0.08, repeat: 200, hard: 2.4, climb: 5, colour: GREY, floor: [0.1, 150], tops: 1.8, solid: 0.6, shots: { 'heart-02': 0 } },
  // The low haze east of the buttress, over the open lava there: the strongest colour of the wide view after the lava itself.
  { at: [760, -40], base: -25, radius: 150, height: 150, lean: [-0.1, -0.05], dense: 0.008, widen: 0.2, repeat: 130, hard: 1.1, climb: 2, colour: BROWN, foot: 0.12, lake: [0.5, 30], floor: [2.6, 70], lights: 1, tops: 0.4, solid: 0.6 },
];

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

  const heatA = Array.from({ length: MAX_HEAT }, () => new THREE.Vector4());
  const heatB = Array.from({ length: MAX_HEAT }, () => new THREE.Vector4());
  // Staging by shot: what each body's density is in each shot of the place.
  const shots = ['heart-01', 'heart-02', 'heart-03', 'heart-04', 'heart-05'].map((id) => {
    const shot = shotById(id);
    // The span holds the open shutter of its first and last frame.
    return { id, from: secondsInPlace(UNIT, shot.first) - 0.3 / 60, to: secondsInPlace(UNIT, shot.last) + 0.7 / 60 };
  });
  const smoke = createSmoke(ctx.rig.uniforms, noise, skyMean);
  const su = smoke.uniforms;
  const steamA = (su.uSteamA as THREE.IUniform<THREE.Vector4[]>).value;
  const steamB = (su.uSteamB as THREE.IUniform<THREE.Vector4[]>).value;
  const steamC = (su.uSteamC as THREE.IUniform<THREE.Vector4[]>).value;
  const bodyB = (su.uBodyB as THREE.IUniform<THREE.Vector4[]>).value;
  const bodySeeds = ctx.rng('air/bodies');
  const count = Math.min(MAX_BODIES, BODIES.length);
  for (let i = 0; i < count; i++) {
    const b = BODIES[i] as Body;
    const base = b.base ?? 0;
    ((su.uBodyA as THREE.IUniform<THREE.Vector4[]>).value[i] as THREE.Vector4).set(b.at[0], b.at[1], b.radius, b.height);
    (bodyB[i] as THREE.Vector4).set(b.lean[0], b.lean[1], bodySeeds.next() * 5, b.dense);
    ((su.uBodyC as THREE.IUniform<THREE.Vector4[]>).value[i] as THREE.Vector4).set(b.lake?.[0] ?? 0, b.lake?.[1] ?? 10, b.lights ?? 0, base);
    ((su.uBodyD as THREE.IUniform<THREE.Vector4[]>).value[i] as THREE.Vector4).set(b.climb ?? 2, b.widen ?? 0, b.repeat, b.hard ?? 2);
    ((su.uBodyE as THREE.IUniform<THREE.Vector4[]>).value[i] as THREE.Vector4).set(b.colour[0], b.colour[1], b.colour[2], b.foot ?? 0);
    ((su.uBodyF as THREE.IUniform<THREE.Vector4[]>).value[i] as THREE.Vector4).set(b.floor?.[0] ?? 0, b.floor?.[1] ?? 100, b.tops ?? 2.2, b.solid ?? 1.4);
  }
  (su.uBodyCount as THREE.IUniform<number>).value = count;
  let phase = 0;
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
    ...smoke.layers,
  });
  const warp = pass(WARP_FRAGMENT, {
    uHeatCount: { value: 0 },
    uHeatA: { value: heatA },
    uHeatB: { value: heatB },
  });

  const ash = createAsh(ctx.rng('air/ash'), ctx.rig.uniforms, skyMean);
  ctx.scene.add(ctx.parts.built('ash', ash.mesh));

  const order: { source: SteamSource; index: number; far: number; small: number }[] = [];

  return {
    volume,
    warp,
    setTime: (seconds) => {
      const staged = stagedSeconds();
      const shot = shots.find((x) => staged >= x.from && staged <= x.to)?.id ?? '';
      for (let i = 0; i < count; i++) {
        const b = BODIES[i] as Body;
        (bodyB[i] as THREE.Vector4).w = b.dense * (b.shots?.[shot] ?? b.shots?.rest ?? 1);
      }
      // Where the near sheet of smoke ends and the far one begins, shot by shot: the banks go with the vapours at hand wherever rock stands between them and the far plume.
      (su.uSplit as THREE.IUniform<number>).value = shot === 'heart-05' ? 450 : shot === 'heart-02' ? 110 : 600;
      // The four offsets of the march move on with time, so that no pattern stands still over the frames.
      phase = (((seconds * 60 + 0.5) % 1) * 61.8034) % 1;
    },
    beforeSample: (renderer, camera) => {
      // The mean of the sky the rig lights with: what a point of open air receives from above.
      skyMean.copy(horizon).multiplyScalar(0.45).addScaledVector(zenith, 0.55).addScaledVector(warm, 0.12);

      // The sources are read every sample, since a folder may move its own, and drawn nearest first.
      const steam = ctx.sources.steam.length > 0 ? ctx.sources.steam : local.steam;
      order.length = 0;
      steam.forEach((source, index) => {
        // The fume at the fall's foot is drawn as a body of smoke of its own, not as a column of vapour.
        if (source.strength <= 0 || source.rise <= 0 || source.kind === 'fume') return;
        const far = Math.hypot(source.at[0] - camera.position.x, source.at[1] - camera.position.y, source.at[2] - camera.position.z);
        order.push({ source, index, far, small: far / (source.rise + source.radius) });
      });
      // The sixteen that are largest in the frame, then nearest first: the shader lays them front to back.
      order.sort((a, b) => a.small - b.small || a.index - b.index);
      order.length = Math.min(MAX_STEAM, order.length);
      order.sort((a, b) => a.far - b.far || a.index - b.index);
      const drawn = order.length;
      for (let i = 0; i < drawn; i++) {
        const { source: s, index } = order[i] as (typeof order)[number];
        const smoke = s.kind !== 'steam';
        const radius = Math.max(0.05, s.radius);
        (steamA[i] as THREE.Vector4).set(s.at[0], s.at[1], s.at[2], radius);
        // Thickness for a metre of path: a source of strength 1 is all but opaque across its own foot.
        // Smoke is held thin enough to see through across its own foot: no source stands as a dark trunk.
        (steamB[i] as THREE.Vector4).set(s.lean?.[0] ?? 0, s.lean?.[1] ?? 0, s.rise, (smoke ? Math.min(s.strength * 2.4, 0.7) : s.strength * 1.4) / radius);
        // Steam is quick, smoke is slow; the grain of each is set by the size of its foot.
        const speed = s.kind === 'fume' ? 4.5 : smoke ? Math.min(4, 1 + s.rise * 0.035) : Math.min(3, 1.2 + s.rise * 0.16);
        (steamC[i] as THREE.Vector4).set(steamSeed[index % steamSeed.length] as number, speed, s.kind === 'fume' ? radius * 2.5 : smoke ? Math.max(3.5, radius * 5) : Math.max(5, radius * 14), s.kind === 'fume' ? 2 : smoke ? 1 : 0);
      }
      (su.uSteamCount as THREE.IUniform<number>).value = drawn;
      if (show.fume.value > 0.5) smoke.render(renderer, camera, phase);

      const heat = ctx.sources.heat.length > 0 ? ctx.sources.heat : local.heat;
      const heats = Math.min(MAX_HEAT, heat.length);
      for (let i = 0; i < heats; i++) {
        const h = heat[i] as HeatSource;
        (heatA[i] as THREE.Vector4).set(h.at[0], h.at[1], h.at[2], Math.max(0.05, h.radius));
        (heatB[i] as THREE.Vector4).set(Math.max(0.05, h.height), h.strength, 0, 0);
      }
      (warp.uniforms.uHeatCount as THREE.IUniform<number>).value = heats;
    },
    resize: (width, height) => {
      ash.resize(width, height);
      smoke.resize(width, height);
    },
    solo: (part) => {
      show.air.value = part === 'heart/fume' ? 0 : 1;
      show.fume.value = part === 'heart/air' ? 0 : 1;
    },
    dispose: () => {
      sky.dispose();
      ash.dispose();
      volume.dispose();
      smoke.dispose();
      warp.dispose();
      noise.dispose();
    },
  };
}
