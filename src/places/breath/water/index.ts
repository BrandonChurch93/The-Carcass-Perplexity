// The water of the Breath: the tide channel that crosses the shelf, the pools on the flats and the sea beyond.
// One level sheet. What is under it is the lead's land: the sheet is laid over it by depth, clear where it is shallow, so the bed shows.
import * as THREE from 'three';
import type { Context, Piece } from '../shared/context';
import { FRAGMENT, VERTEX } from './shaders';
import { bedMap, waveMap } from './maps';
import { SEA_LEVEL } from '../shared/anchors';
import { MIRROR } from '../waders/mirror';

export const PARTS: readonly string[] = ['sea'];

/** The square of the shelf whose bed is known to a third of a metre: the channel, the rim and what the five cameras stand on. */
const NEAR = { x: -20, z: -40, half: 170, cells: 1024 };
/** The rest, to the horizon. */
const FAR = { x: 0, z: 0, half: 6000, cells: 512 };
const WORLD = 16000;

export function create(ctx: Context): Piece {
  const height = (x: number, z: number): number => ctx.rig.land.height(x, z);
  const near = bedMap(height, SEA_LEVEL, NEAR.x, NEAR.z, NEAR.half, NEAR.cells);
  const far = bedMap(height, SEA_LEVEL, FAR.x, FAR.z, FAR.half, FAR.cells);
  const waves = waveMap(ctx.rng('water-waves'));

  const frame = new THREE.Vector2(3840, 2160);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      tBedNear: { value: near },
      tBedFar: { value: far },
      uBedNear: { value: new THREE.Vector4(NEAR.x - NEAR.half, NEAR.z - NEAR.half, 1 / (2 * NEAR.half), 0) },
      uBedFar: { value: new THREE.Vector4(FAR.x - FAR.half, FAR.z - FAR.half, 1 / (2 * FAR.half), 0) },
      tWave: { value: waves },
      uSea: { value: SEA_LEVEL },
      tMirror: MIRROR.texture,
      uFrame: { value: frame },
    },
    transparent: true,
    depthWrite: true,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  const geometry = new THREE.PlaneGeometry(WORLD, WORLD, 1, 1).rotateX(-Math.PI / 2);
  const sheet = new THREE.Mesh(geometry, material);
  sheet.position.y = SEA_LEVEL;
  sheet.frustumCulled = false;
  sheet.renderOrder = 10;
  ctx.scene.add(ctx.parts.built('sea', sheet));

  return {
    resize: (w, h) => {
      frame.set(w, h);
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      near.dispose();
      far.dispose();
      waves.dispose();
    },
  };
}
