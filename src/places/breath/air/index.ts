// The sky, the dawn haze, the fog banks and the fog that pours from the cave, the heavy vapour of the shafts, and the breath the main shaft lets out.
// sky.ts is the dome; volume.ts is the one half-size pass that draws everything that is not solid; noise.ts is the block of noise they are cut from.
import * as THREE from 'three';
import { volumeUniforms } from '../../../core/engine';
import { QUAD_VERTEX } from '../../../core/post';
import { cliffHeight, cliffPoint, smooth } from '../land';
import { EXHALE, SMALLER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { bakeNoise } from './noise';
import { createSky } from './sky';
import { MAX_BODIES, VOLUME_FRAGMENT } from './volume';

export const PARTS: readonly string[] = ['sky', 'air', 'fog', 'vapour', 'exhale'];

/** A far body of vapour or fog: a leaning ellipsoid of lumps. Lengths in metres. */
interface Body {
  part: 'fog' | 'vapour';
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
export function breathAt(seconds: number): [number, number, number, number] {
  const u = seconds - EXHALE;
  const swell = 0.5 * Math.sin(seconds * 0.9) + 0.3 * Math.sin(seconds * 0.37 + 1);
  const fill = smooth((u - 0.3) / 2.2);
  const over = u < 3.4 ? smooth((u - 1.4) / 2.0) : 0.1 + 0.9 * Math.exp(-(u - 3.4) / 1.7);
  const level = -9 + swell + 5 * fill * (u < 3.4 ? 1 : 0.35 + 0.65 * Math.exp(-(u - 3.4) / 5)) + 5.5 * over;
  const apron = smooth((u - 2.4) / 2.0) * (0.3 + 0.7 * Math.exp(-Math.max(0, u - 5) / 9));
  const spread = smooth((u - 2.8) / 7);
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
    const rise = r * (2 + 2.2 * tall);
    bodies.push({ part: 'vapour', at: [x - 0.3 * rise * 0.5, rise * 0.5, z + 0.1 * rise * 0.5], size: [r * (1.5 + 1.2 * tall), rise * 0.55, r * (1.5 + 1.2 * tall)], lean: [-0.3, 0.1], dense: 0.2 / r, repeat: r * 4.2, open: 0.38, climb: 2.2 + r * 0.12, sun: 1 });
  }
  // What hangs over the west side of the main shaft and drifts off it with the wind: thin, frayed, a few metres over the rim.
  for (const [x, y, z, rx, ry, rz, dense] of [
    [-26, 4.5, -9, 13, 4.5, 11, 0.016],
    [-17, 3, 6, 15, 3.5, 13, 0.012],
    [-40, 3.2, -4, 12, 2.6, 9, 0.012],
  ] as const) {
    bodies.push({ part: 'vapour', at: [x, y, z], size: [rx, ry, rz], dense, repeat: 11, open: 0.42, climb: 0.5, sun: 1 });
  }
  // The fog that pours from the cave and down the scree under it, and lies along the foot of the cliff.
  const turn = Math.atan2(-0.984, -0.177);
  for (const [s, p, lift, long, tall, deep, dense] of [
    [60, -190, 60, 560, 60, 150, 0.003],
    [240, -420, 60, 520, 70, 210, 0.003],
    [520, -700, 18, 700, 60, 300, 0.0025],
    [-900, -620, 30, 900, 70, 260, 0.0016],
  ] as const) {
    const [x, z] = cliffPoint(s, p);
    bodies.push({ part: 'fog', at: [x, cliffHeight(s, p) + lift, z], size: [long, tall, deep], turn, dense, repeat: 260, open: 0.3, climb: -3, sun: 0.7 });
  }
  // The banks that lie out on the flats.
  for (const [x, z, rx, ry, rz] of [
    [-2300, -1500, 1100, 70, 520],
    [-1500, -2900, 900, 90, 600],
    [-3200, 300, 800, 60, 900],
  ] as const) {
    bodies.push({ part: 'fog', at: [x, 20, z], size: [rx, ry, rz], dense: 0.0016, repeat: 520, open: 0.25, climb: 0.4, sun: 0.8 });
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

  const volume = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: VOLUME_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      ...volumeUniforms(),
      tNoise: { value: noise },
      uShow: { value: show },
      uBreath: { value: breath },
      uHaze: { value: new THREE.Vector4(0.6e-4, 420, 1.5e-4, 60) },
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

  return {
    volume,
    setTime: (seconds) => {
      breath.set(...breathAt(seconds));
    },
    beforeSample: (_renderer, camera) => {
      // The bodies are read every sample, since a folder may push its own sources, and laid nearest first.
      order.length = 0;
      bodies.forEach((body, index) => order.push({ body, index, far: Math.hypot(body.at[0] - camera.position.x, body.at[1] - camera.position.y, body.at[2] - camera.position.z) }));
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
        order.push({ body, index: bodies.length + i, far: Math.hypot(body.at[0] - camera.position.x, body.at[1] - camera.position.y, body.at[2] - camera.position.z) });
      });
      order.sort((a, b) => a.far - b.far || a.index - b.index);
      order.length = Math.min(MAX_BODIES, order.length);
      order.forEach(({ body: b, index }, i) => {
        (bodyA[i] as THREE.Vector4).set(b.at[0], b.at[1], b.at[2], b.turn ?? 0);
        (bodyB[i] as THREE.Vector4).set(b.size[0], b.size[1], b.size[2], b.dense);
        (bodyC[i] as THREE.Vector4).set(b.lean?.[0] ?? 0, b.lean?.[1] ?? 0, b.repeat, b.open ?? 0.35);
        (bodyD[i] as THREE.Vector4).set(b.part === 'fog' ? 1 : 0, bodySeed[index % MAX_BODIES] as number, b.sun ?? 1, b.climb ?? 0);
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
