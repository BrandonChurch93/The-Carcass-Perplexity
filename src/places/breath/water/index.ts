// The water of the Breath: the tide channel that crosses the shelf, the pools on the flats and the sea beyond.
// One level sheet. What is under it is the lead's land: the sheet is laid over it by depth, clear where it is shallow, so the bed shows.
import * as THREE from 'three';
import type { Context, Piece } from '../shared/context';
import { FRAGMENT, VERTEX } from './shaders';
import { bedMap, waveMap } from './maps';
import { SEA_LEVEL } from '../shared/anchors';
import { MIRROR } from '../waders/mirror';
import { RIPPLES } from '../waders/ripples';

export const PARTS: readonly string[] = ['sea'];

/** The bed beyond the shelf, to the horizon. On the shelf the water reads the rig's own land. */
const FAR = { x: 0, z: 0, half: 6000, cells: 512 };
const WORLD = 16000;

export function create(ctx: Context): Piece {
  const height = (x: number, z: number): number => ctx.rig.land.height(x, z);
  const far = bedMap(height, SEA_LEVEL, FAR.x, FAR.z, FAR.half, FAR.cells);
  const waves = waveMap(ctx.rng('water-waves'));
  // The small ripples seen near a lens: many, of every bearing, none much longer than a hand, so the square they repeat in does not show.
  const ripples = waveMap(ctx.rng('water-ripples'), 512, 9, 44, 0.5, 90);

  const frame = new THREE.Vector2(3840, 2160);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      tBedFar: { value: far },
      uBedFar: { value: new THREE.Vector4(FAR.x - FAR.half, FAR.z - FAR.half, 1 / (2 * FAR.half), 0) },
      tWave: { value: waves },
      tRipple: { value: ripples },
      uSea: { value: SEA_LEVEL },
      tMirror: MIRROR.texture,
      tRings: RIPPLES.texture,
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
      far.dispose();
      waves.dispose();
      ripples.dispose();
    },
  };
}
