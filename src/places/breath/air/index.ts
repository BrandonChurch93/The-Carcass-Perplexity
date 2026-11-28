// The sky, the dawn haze, the fog banks and the fog that pours from the cave, the heavy vapour of the shafts, and the breath the main shaft lets out.
// sky.ts is the dome; volume.ts is the one half-size pass that draws everything that is not solid; noise.ts is the block of noise they are cut from.
import * as THREE from 'three';
import { volumeUniforms } from '../../../core/engine';
import { QUAD_VERTEX } from '../../../core/post';
import { smooth } from '../land';
import { EXHALE, SMALLER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { bakeNoise } from './noise';
import { createSky } from './sky';
import { MAX_BODIES, VOLUME_FRAGMENT } from './volume';

export const PARTS: readonly string[] = ['sky', 'air', 'fog', 'vapour', 'exhale'];

/** A far body of vapour or fog: a leaning ellipsoid of lumps. Lengths in metres. */
interface Body {
  part: 'fog' | 'vapour' | 'exhale';
  /** Its centre. */
  at: readonly [number, number, number];
  /** Half its size along its own x, up, and along its own z. */
  size: readonly [number, number, number];
  /** Its turn about y, radians. */
  turn?: number;
  /** Metres sideways (x, z) for each metre of height. */
  lean?: readonly [number, number];
  /** Thickness for a metre of path at its heart. */
  dense: number;
  /** Metres of one repeat of its lumps, and how much of it the lumps leave open (0 a solid mass, 0.6 separate billows). */
  repeat: number;
  open?: number;
  /** Metres a second its lumps climb, and how much of the sun it takes. */
  climb?: number;
  sun?: number;
}

/** How the breath goes, from `u` seconds after the shaft starts to breathe out: the level in the shaft (metres), how far it stands over the lip,
 *  how much lies on the apron of rock beside the lip, how far it has spread along the channel. Each 0 to 1 but the first. */
/** How emptied the shaft is by its breath, 0 to 1: nothing before it, whole three seconds after it, gone in ten more. */
export function spentAt(seconds: number): number {
  const u = seconds - EXHALE;
  const after = (x: number): number => 0.5 * (x + Math.sqrt(x * x + 0.25));
  return smooth((u - 3) / 2.2) * Math.exp(-after(u - 6.5) / 3);
}

export function breathAt(seconds: number): [number, number, number, number] {
  const u = seconds - EXHALE;
  const swell = 0.5 * Math.sin(seconds * 0.9) + 0.3 * Math.sin(seconds * 0.37 + 1);
  // It fills from below for a second, wells up over the mouth for two more, then slides off over the west lip and thins: by three and a
  // half seconds (the end of the shot that looks down the shaft) the rock shows again. Every part is smooth in time: no corner.
  const after = (x: number): number => 0.5 * (x + Math.sqrt(x * x + 0.25));
  // It does not come from nothing: for five seconds before it the pool swells toward the brim and what stands over the wells thickens, so
  // the breath is the top of a rise and not a thing switched on. The swell is gone into the breath by the time the breath is whole.
  const build = smooth((u + 5.5) / 5.5) * Math.exp(-after(u - 3) / 1.5);
  const fill = smooth((u - 0.1) / 1.2);
  const burst = smooth((u - 0.3) / 2.0) * (0.08 + 0.92 * Math.exp(-after(u - 2.3) / 0.9));
  const over = 1 - (1 - 0.22 * build) * (1 - burst);
  // After the breath the shaft stands full of mist nearly to the brim, and it sinks back over the next quarter of a minute.
  const risen = fill * (0.3 + 0.7 * Math.exp(-after(u - 2.6) / 4));
  // The breath spends it: once it has gone over the lip the pool falls a stride or two under where it lay, enough for the far rim to
  // stand clear over it and not so far that the tiers down in the shaft are bared, and it fills again in ten seconds.
  const spent = spentAt(seconds);
  const level = -10 + swell + 3.5 * (1 - (1 - 0.6 * build) * (1 - risen)) + 1.5 * smooth((u - 2.5) / 2.5) * Math.exp(-after(u - 6) / 7) - 2.2 * spent;
  const poured = smooth((u - 1.6) / 1.8) * (0.25 + 0.75 * Math.exp(-after(u - 3.6) / 2.6));
  const apron = 1 - (1 - 0.3 * build) * (1 - poured);
  const spread = smooth((u - 2.2) / 7);
  return [level, over, apron, spread];
}

export function create(ctx: Context): Piece {
  const noise = bakeNoise(ctx.rng('air/noise'));
  const sky = createSky(ctx, noise);
  ctx.scene.add(ctx.parts.built('sky', sky.dome));
  for (const name of ['air', 'fog', 'vapour', 'exhale']) ctx.parts.effect(name, 'built');

  const bodies: Body[] = [];
  // The vapour that stands over the smaller shafts: a column that leans with the wind and widens.
  for (const [x, z, r, tall] of SMALLER) {
    // A column that climbs, leans with the wind as it climbs and opens into a plume that trails off down the wind.
    // Far off it is a heap of steam over its pool, as broad as it is tall, and not a column to the top of the sky.
    const far = Math.hypot(x, z) > 450;
    // A small vent near by is a low puff blown flat down the wind, white at its foot, as the approved pictures have it.
    const rise = r * (2.6 + 3.2 * tall) * (far ? 0.52 : 0.62);
    const lean: [number, number] = far ? [-0.2, 0.07] : [-1.0, 0.36];
    bodies.push({ part: 'vapour', at: [x + lean[0] * rise * 0.5, rise * 0.5, z + lean[1] * rise * 0.5], size: [r * (far ? 1.0 + 0.7 * tall : 1.3 + 0.6 * tall), rise * 0.58, r * (far ? 1.0 + 0.7 * tall : 1.3 + 0.6 * tall)], lean, dense: (far ? 0.6 : 0.4) / r, repeat: r * (far ? 2.6 : 1.9), open: far ? 0.62 : 0.8, climb: far ? 6 + r * 0.04 : 4.5 + r * 0.2, sun: far ? 1.2 : 0.65 });
    bodies.push({ part: 'vapour', at: [x + lean[0] * rise * 1.2, rise * 1.0, z + lean[1] * rise * 1.2], size: [r * (2.4 + 1.6 * tall), rise * 0.3, r * (1.6 + 1.0 * tall)], lean: [-1.4, 0.5], dense: (far ? 0.008 : 0.022) / r, repeat: r * 4.0, open: 0.68, climb: 2.4, sun: 0.5 });
  }
  // The banks that lie out on the flats.
  for (const [x, z, rx, ry, rz] of [
    [-2300, -1500, 1100, 70, 520],
    [-1500, -2900, 900, 90, 600],
    [-3200, 300, 800, 60, 900],
  ] as const) {
    bodies.push({ part: 'fog', at: [x, 20, z], size: [rx, ry, rz], dense: 0.0009, repeat: 300, open: 0.8, climb: 0.4, sun: 0.9 });
  }
  // The banks that lie at the foot of the far cliff, in front of it: heaped and torn, so that the cliff's foot is lost in fog and not in a level band.
  for (const [x, z, rx, ry, rz, turn] of [
    [700, -2300, 620, 55, 260, 0.3],
    [1500, -1900, 560, 70, 240, 0.9],
    [2100, -1150, 520, 60, 230, 1.2],
    [150, -2700, 500, 45, 220, 0.1],
  ] as const) {
    bodies.push({ part: 'fog', at: [x, 26, z], size: [rx, ry, rz], turn, dense: 0.0016, repeat: 460, open: 0.62, climb: 0.5, sun: 0.9 });
  }

  const vec4s = (): THREE.Vector4[] => Array.from({ length: MAX_BODIES }, () => new THREE.Vector4());
  const bodyA = vec4s();
  const bodyB = vec4s();
  const bodyC = vec4s();
  const bodyD = vec4s();
  const seeds = ctx.rng('air/bodies');
  const bodySeed = Array.from({ length: MAX_BODIES }, () => seeds.next() * 5);
  const show = new THREE.Vector4(1, 1, 1, 1);
  const breath = new THREE.Vector4(-9, 0, 0, 0);
  const count = { value: 0 };
  const spent = { value: 0 };

  const volume = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: VOLUME_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      ...volumeUniforms(),
      tNoise: { value: noise },
      uShow: { value: show },
      uBreath: { value: breath },
      uSpent: spent,
      uHaze: { value: new THREE.Vector4(1.6e-3, 6, 4.8e-4, 25) },
      uBodyCount: count,
      uBodyA: { value: bodyA },
      uBodyB: { value: bodyB },
      uBodyC: { value: bodyC },
      uBodyD: { value: bodyD },
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });

  const order: { body: Body; index: number; far: number }[] = [];
  let breathing: Body[] = [];

  return {
    volume,
    setTime: (seconds) => {
      breath.set(...breathAt(seconds));
      spent.value = spentAt(seconds);
      // The breath is the marched vapour's own dome now (volume.ts): no separate bodies are laid for it.
      breathing = [];
    },
    beforeSample: (_renderer, camera) => {
      // The bodies are read every sample, since a folder may push its own sources, and laid nearest first.
      order.length = 0;
      bodies.forEach((body, index) => order.push({ body, index, far: Math.hypot(body.at[0] - camera.position.x, body.at[1] - camera.position.y, body.at[2] - camera.position.z) }));
      breathing.forEach((body, i) => order.push({ body, index: 40 + i, far: Math.hypot(body.at[0] - camera.position.x, body.at[1] - camera.position.y, body.at[2] - camera.position.z) }));
      ctx.sources.steam.forEach((s, i) => {
        if (s.strength <= 0 || s.rise <= 0) return;
        const heavy = s.kind === 'heavy';
        const radius = Math.max(0.05, s.radius);
        const lean = s.lean ?? [0, 0];
        const half = s.rise * 0.5;
        const body: Body = {
          part: 'vapour',
          at: [s.at[0] + lean[0] * half, s.at[1] + half * (heavy ? 0.4 : 1), s.at[2] + lean[1] * half],
          size: [radius * (heavy ? 2.2 : 1.3), half * 1.1, radius * (heavy ? 2.2 : 1.3)],
          lean,
          dense: (s.strength * 1.3) / radius,
          repeat: Math.max(2.2, radius * (heavy ? 3 : 5)),
          open: heavy ? 0.3 : 0.45,
          climb: heavy ? 0.2 : Math.min(3, 1.2 + s.rise * 0.16),
          sun: 1,
        };
        order.push({ body, index: 60 + i, far: Math.hypot(body.at[0] - camera.position.x, body.at[1] - camera.position.y, body.at[2] - camera.position.z) });
      });
      order.sort((a, b) => a.far - b.far || a.index - b.index);
      order.length = Math.min(MAX_BODIES, order.length);
      order.forEach(({ body: b, index }, i) => {
        (bodyA[i] as THREE.Vector4).set(b.at[0], b.at[1], b.at[2], b.turn ?? 0);
        (bodyB[i] as THREE.Vector4).set(b.size[0], b.size[1], b.size[2], b.dense);
        (bodyC[i] as THREE.Vector4).set(b.lean?.[0] ?? 0, b.lean?.[1] ?? 0, b.repeat, b.open ?? 0.35);
        (bodyD[i] as THREE.Vector4).set(b.part === 'fog' ? 1 : b.part === 'exhale' ? 2 : 0, bodySeed[index % MAX_BODIES] as number, b.sun ?? 1, b.climb ?? 0);
      });
      count.value = order.length;
    },
    solo: (part) => {
      const only = (name: string): number => (part === null || part === `breath/${name}` || !PARTS.some((p) => part === `breath/${p}`) ? 1 : 0);
      show.set(only('air'), only('fog'), only('vapour'), only('exhale'));
    },
    dispose: () => {
      sky.dispose();
      volume.dispose();
      noise.dispose();
    },
  };
}
