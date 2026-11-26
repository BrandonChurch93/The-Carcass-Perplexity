// The water of the Breath: the tide channel that crosses the shelf, the pools on the flats and the sea beyond.
// One level sheet. What is under it is the lead's land: the sheet is laid over it by depth, clear where it is shallow, so the bed shows.
import * as THREE from 'three';
import type { Context, Piece } from '../shared/context';
import { FRAGMENT, VERTEX } from './shaders';
import { bandMap, bedMap } from './maps';
import { SEA_LEVEL, WIND, shotSpan } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import { MIRROR } from '../waders/mirror';
import { RIPPLES } from '../waders/ripples';

export const PARTS: readonly string[] = ['sea'];

/** The bed beyond the shelf, to the horizon. On the shelf the water reads the rig's own land. */
const FAR = { x: 0, z: 0, half: 6000, cells: 512 };
const WORLD = 16000;
const GRID = 200;

export function create(ctx: Context): Piece {
  const height = (x: number, z: number): number => ctx.rig.land.height(x, z);
  const far = bedMap(height, SEA_LEVEL, FAR.x, FAR.z, FAR.half, FAR.cells);
  // Two squares of waves; the shader lays each down several times over at unlike sizes and bearings, each size with its own speed (shaders.ts).
  const waves = bandMap(ctx.rng('water-waves'));
  const ripples = bandMap(ctx.rng('water-ripples'));

  const frame = new THREE.Vector2(3840, 2160);
  // Staged by shot: the wide view from above (breath-01) sees the channel as green water over pale silt from its first frame to its last.
  const high = { value: 0 };
  const wide = shotSpan('breath-01');
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
      uWind: { value: new THREE.Vector2(WIND[0], WIND[1]).normalize() },
      uHigh: high,
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
  // The sheet is a grid, fine at the shaft and coarse far out. As one quad sixteen kilometres wide its depth was worked out across the whole
  // of it, and at some places of a travelling lens it came out a hand deeper than it is: the bed then stood through it for a frame.
  const geometry = new THREE.PlaneGeometry(2, 2, GRID, GRID).rotateX(-Math.PI / 2);
  const at = geometry.getAttribute('position') as THREE.BufferAttribute;
  const spread = (u: number): number => 0.5 * WORLD * (0.02 * u + 0.98 * u * u * u);
  for (let i = 0; i < at.count; i++) at.setXYZ(i, spread(at.getX(i)), 0, spread(at.getZ(i)));
  at.needsUpdate = true;
  const sheet = new THREE.Mesh(geometry, material);
  sheet.position.y = SEA_LEVEL;
  sheet.frustumCulled = false;
  sheet.renderOrder = 10;
  ctx.scene.add(ctx.parts.built('sea', sheet));

  return {
    setTime: () => {
      const at = stagedSeconds();
      high.value = at >= wide[0] && at <= wide[1] ? 1 : 0;
    },
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
