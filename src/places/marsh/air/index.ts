// The weather of the Blood Marsh: the white overcast (part `sky`), the haze that pales the flats toward the escarpment (`air`), the curtain of
// rain over the far flats (`rain`), and the steam of the seep pool and of whatever else any folder names in ctx.sources.steam (`steam`).
import * as THREE from 'three';
import { volumeUniforms } from '../../../core/engine';
import { QUAD_VERTEX } from '../../../core/post';
import { DEG, HERO_DOME, K1_AT, K1_DIR, K2_AT, K2_DIR, POOL_R, SMALL_DOME, TAU, VEIN, bearingDir, rel } from '../shared/anchors';
import type { Context, Piece, SteamSource } from '../shared/context';
import { bakeNoise } from './noise';
import { createSky } from './sky';
import { CLEAR_FROM, MAX_MIST, MAX_STEAM, SHEETS, VOLUME_FRAGMENT } from './volume';

// The seconds of the place in which the pool's lens looks (the cuts at frames 6048 and 6263 of a place that opens at 5618).
const SEEP_SHOT = [(6048 - 5618) / 60, (6263 - 5618) / 60] as const;
export const PARTS = ['sky', 'air', 'rain', 'steam'] as const;

export function create(ctx: Context): Piece {
  const noise = bakeNoise(ctx.rng('air/noise'));
  // The rain: middle bearing and half width in radians, distance in metres, thickness.
  const rain = new THREE.Vector4(4 * DEG, 10.5 * DEG, 1800, 2.2);
  const sky = createSky(ctx, noise, rain);
  ctx.scene.add(ctx.parts.built('sky', sky.dome));
  ctx.parts.effect('air', 'built');
  ctx.parts.effect('rain', 'built');
  ctx.parts.effect('steam', 'built');

  // The seep pool's own steam: it leaves the brine where the gas comes up, thickest on the upwind side, and leans with the light wind.
  const own: SteamSource[] = [];
  const rng = ctx.rng('air/steam');
  const lean: [number, number] = [-0.5, -0.12];
  const main = bearingDir(300);
  // (Narrow: three wide ones ran together, from the first lens, into one even wedge of grey with no form in it.)
  // Narrow columns over the seeps, dense at the foot and thinning as they climb, each set where the three near lenses see it as a
  // column and none stands in it: by the west bank, over the left of the pool as the pool's lens sees it, and a lesser one. (A column set
  // near the pool's lens stood as a hard white wedge in the first lens: before that lens the pool has its low sheets only.)
  own.push({ at: [-7.1, 0, -5.1], radius: 0.85, strength: 0.62, rise: 9, kind: 'steam', lean });
  own.push({ at: [-2.5, 0, -6.5], radius: 0.75, strength: 0.4, rise: 7, kind: 'steam', lean });
  own.push({ at: [0.5, 0, -7.5], radius: 0.55, strength: 0.22, rise: 4, kind: 'steam', lean });
  // The vapour of the small dome's seep, as the pool's lens has it at its left hand: a thin wisp no higher than a stalk's knee, left of the domes, which stay dark. It
  // stands only while that lens looks (setTime): from the first lens, high over the pool, the same vapour was a hard white wedge.
  const seep: SteamSource = { at: [SMALL_DOME[0] - 0.75, 0, SMALL_DOME[1] + 0.05], radius: 0.4, strength: 0, rise: 1.3, kind: 'steam', lean };
  own.push(seep);
  // The mist that lies low over the whole pool.
  own.push({ at: [-1, 0, -4], radius: 5, strength: 0.012, rise: 5, kind: 'steam', lean });
  // The low steam that drifts off the warm brine. With SHEETS it lies in sheets over these patches (x, z, radius, thickness); without, it
  // is four wide low columns.
  const drift: [number, number] = [-0.9, -0.25];
  const low: [number, number][] = [
    [K1_AT[0] + K1_DIR[0] * 7 + 2.5, K1_AT[1] + K1_DIR[1] * 7],
    [HERO_DOME[0] + 4, HERO_DOME[1] - 5],
    [-5, -4],
    [3, 2],
  ];
  const vein = (i: number): [number, number] => {
    const node = VEIN[Math.min(i, VEIN.length - 1)] as [number, number, number];
    return [node[0], node[1]];
  };
  const mist: THREE.Vector4[] = [
    new THREE.Vector4(-1, -3, POOL_R * 0.6, 0.7),
    new THREE.Vector4(HERO_DOME[0] + K1_DIR[0] * 12 - 5, HERO_DOME[1] + K1_DIR[1] * 12, 7, 0.6),
    new THREE.Vector4(-3, -9, 7, 0.3),
    new THREE.Vector4(vein(10)[0], vein(10)[1], 9, 0.5),
    new THREE.Vector4(vein(11)[0], vein(11)[1], 12, 0.5),
    new THREE.Vector4(main[0] * 16, main[1] * 16, 11, 0.5),
  ];
  while (mist.length < MAX_MIST) mist.push(new THREE.Vector4(0, 0, 1, 0));
  if (!SHEETS) for (const [x, z] of low) own.push({ at: [x, 0, z], radius: rng.range(3.4, 5), strength: rng.range(0.12, 0.2), rise: rng.range(1.7, 2.6), kind: 'steam', lean: drift });
  for (let i = 0; i < 3; i++) {
    const a = rng.range(0, TAU);
    const r = rng.range(1, POOL_R * 0.75);
    own.push({ at: [Math.sin(a) * r, 0, -Math.cos(a) * r], radius: rng.range(1.2, 2.6), strength: rng.range(0.04, 0.09), rise: rng.range(6, 12), kind: 'steam', lean });
  }
  const seeds = Array.from({ length: 64 }, () => rng.next() * 7);

  const steamA = Array.from({ length: MAX_STEAM }, () => new THREE.Vector4());
  const steamB = Array.from({ length: MAX_STEAM }, () => new THREE.Vector4());
  const steamC = Array.from({ length: MAX_STEAM }, () => new THREE.Vector4());
  const steamCount = { value: 0 };
  const show = new THREE.Vector3(1, 1, 1);
  const clear = [new THREE.Vector3(rel(34, 3.5)[0], rel(34, 3.5)[1], 12), new THREE.Vector3(K2_AT[0] + K2_DIR[0] * 6, K2_AT[1] + K2_DIR[1] * 6, 8)];

  const volume = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: VOLUME_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      ...volumeUniforms(),
      tNoise: { value: noise },
      uShow: { value: show },
      uSteamCount: steamCount,
      uSteamA: { value: steamA },
      uSteamB: { value: steamB },
      uSteamC: { value: steamC },
      uRain: { value: rain },
      uMistCount: { value: 6 },
      uMist: { value: mist },
      // No low steam stands between a lens and what it is set on: round the wallowers, and in front of the lens of the colony. Each zone
      // is kept only while its own lens looks (setTime), so that the pool steams for the lens that is set on the pool.
      uClear: { value: clear },
    },
    defines: SHEETS ? { SHEETS: 1 } : {},
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });

  const order: { source: SteamSource; index: number; far: number; small: number }[] = [];
  // (A radius far under zero is no zone at all.)
  const NONE = -100;

  return {
    volume,
    beforeSample: (_renderer, camera) => {
      // The sources are read every sample, since a folder may move its own: the twelve largest in the frame, nearest first.
      order.length = 0;
      [...own, ...ctx.sources.steam].forEach((source, index) => {
        if (source.strength <= 0 || source.rise <= 0) return;
        const far = Math.hypot(source.at[0] - camera.position.x, source.at[1] - camera.position.y, source.at[2] - camera.position.z);
        order.push({ source, index, far, small: far / (source.rise + source.radius) });
      });
      order.sort((a, b) => a.small - b.small || a.index - b.index);
      order.length = Math.min(MAX_STEAM, order.length);
      order.sort((a, b) => a.far - b.far || a.index - b.index);
      order.forEach(({ source: s, index }, i) => {
        const radius = Math.max(0.05, s.radius);
        (steamA[i] as THREE.Vector4).set(s.at[0], s.at[1], s.at[2], radius);
        (steamB[i] as THREE.Vector4).set(s.lean?.[0] ?? 0, s.lean?.[1] ?? 0, s.rise, (s.strength * 1.4) / radius);
        (steamC[i] as THREE.Vector4).set(seeds[index % seeds.length] as number, Math.min(2.2, 0.6 + s.rise * 0.08), Math.max(1.3, Math.min(radius * 1.5, s.rise * 1.2)), 0);
      });
      steamCount.value = order.length;
    },
    setTime: (seconds) => {
      seep.strength = seconds >= SEEP_SHOT[0] && seconds < SEEP_SHOT[1] ? 0.48 : 0;
      (clear[0] as THREE.Vector3).z = seconds >= CLEAR_FROM.wallow ? 12 : NONE;
      (clear[1] as THREE.Vector3).z = seconds >= CLEAR_FROM.colony[0] && seconds < CLEAR_FROM.colony[1] ? 8 : NONE;
    },
    solo: (part) => {
      show.set(part === null || part === 'marsh/air' ? 1 : 0, part === null || part === 'marsh/rain' ? 1 : 0, part === null || part === 'marsh/steam' ? 1 : 0);
      if (part !== null && !['marsh/air', 'marsh/rain', 'marsh/steam'].includes(part)) show.set(1, 1, 1);
    },
    dispose: () => {
      sky.dispose();
      volume.dispose();
      noise.dispose();
    },
  };
}
