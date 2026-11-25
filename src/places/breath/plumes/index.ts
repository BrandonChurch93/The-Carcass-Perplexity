// The gill-plumes: crimson feathered growths on the lip of the shaft and a few seedlings away from it.
// Every bush is grown once from the seeded stream (bush.ts) into one geometry of ribbons (ribbons.ts); the sway is in the vertex shader.
import * as THREE from 'three';
import { BUSHES, SEEDLINGS, WIND, bushAt, ground } from '../shared/anchors';
import { surgeAt } from '../shared/blockout';
import type { Context, Piece } from '../shared/context';
import { growBush, type Bush, type Tip } from './bush';
import { Ribbons } from './ribbons';
import { FRAGMENT, VERTEX } from './shaders';

export const PARTS: readonly string[] = ['gill-plumes'];

export function create(ctx: Context): Piece {
  const { rig } = ctx;
  const rng = ctx.rng('gill-plumes');
  const bushes: Bush[] = [];
  BUSHES.forEach(([, , tall], i) => {
    const [x, z] = bushAt(i);
    // The first two stand in front of the camera of the lip: every filament is grown. The others are seen from far off.
    bushes.push({ x, y: ground(x, z), z, tall, lean: Math.atan2(-x, z), detail: i < 2 ? 1 : 0.4 });
  });
  for (const [x, z, tall] of SEEDLINGS) bushes.push({ x, y: ground(x, z), z, tall, lean: Math.atan2(-x, z), detail: 0.4 });

  const ribbons = new Ribbons();
  const tips: Tip[] = [];
  bushes.forEach((bush, i) => growBush(ribbons, tips, bush, i, rng));
  const geometry = ribbons.build();

  const pixel = { value: 0.001 };
  const seconds = { value: 0 };
  const surge = { value: 0 };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...rig.uniforms, uPixel: pixel, uSeconds: seconds, uSurge: surge, uWind: { value: new THREE.Vector2(WIND[0], WIND[1]) } },
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('gill-plumes', mesh));

  // Each bush stands in its own shade on the rock, and throws a long one away from the sun.
  const discs = rig.contactDiscs(bushes.length * 2);
  bushes.forEach((b, i) => {
    rig.setDisc(discs, i * 2, b.x + Math.sin(b.lean) * 0.2 * b.tall, b.z - Math.cos(b.lean) * 0.2 * b.tall, 0.42 * b.tall, 0.7);
    rig.setShadow(discs, i * 2 + 1, b.x, b.z, 0.35 * b.tall, 0.8 * b.tall, 0.5);
  });

  let height = 0;
  const size = new THREE.Vector2();
  return {
    setTime: (t) => {
      seconds.value = t;
      surge.value = surgeAt(t);
    },
    beforeSample: (renderer, camera) => {
      renderer.getDrawingBufferSize(size);
      pixel.value = 2 / ((camera.projectionMatrix.elements[5] as number) * (height || size.y || 2160));
    },
    resize: (_width, h) => {
      height = h;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
