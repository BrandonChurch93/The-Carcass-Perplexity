// The land of the Spine: the knife ridge and its flanks, the spires, and the canal through the first of them.
// height.ts is its shape, meshes.ts what is built on that shape, shaders.ts its rock and snow.
import * as THREE from 'three';
import { FIRST, spires } from '../ridge';
import type { Context, Piece } from '../shared/context';
import { canalFloor, canalShell, crestStrip, flanks, hollow, spireMesh } from './meshes';
import { height } from './height';
import { ICE_FRAGMENT, LAND_FRAGMENT, LAND_VERTEX } from './shaders';
import { RIG_VERTEX } from '../shared/glsl';

export const PARTS: readonly string[] = ['land'];

export function create(ctx: Context): Piece {
  ctx.rig.setLand(height, hollow);

  const rock = ctx.assets.texture('land/cliff.jpg', { anisotropy: 4 });
  const rockNh = ctx.assets.texture('land/cliff-nh.png', { kind: 'data', anisotropy: 4 });
  const material = (kind: number, side: THREE.Side = THREE.FrontSide): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({
      vertexShader: LAND_VERTEX,
      fragmentShader: LAND_FRAGMENT,
      uniforms: { ...ctx.rig.uniforms, tRock: { value: rock }, tRockNh: { value: rockNh }, uKind: { value: kind } },
      side,
      toneMapped: false,
    });
  const groundMaterial = material(0);
  const spireMaterial = material(1, THREE.DoubleSide);
  const wallMaterial = material(2, THREE.DoubleSide);
  const iceMaterial = new THREE.ShaderMaterial({
    vertexShader: RIG_VERTEX,
    fragmentShader: ICE_FRAGMENT,
    uniforms: { ...ctx.rig.uniforms },
    toneMapped: false,
  });

  const land = new THREE.Group();
  const made: THREE.BufferGeometry[] = [];
  const add = (geometry: THREE.BufferGeometry, m: THREE.Material): void => {
    made.push(geometry);
    const mesh = new THREE.Mesh(geometry, m);
    mesh.frustumCulled = false;
    land.add(mesh);
  };
  add(crestStrip(), groundMaterial);
  add(flanks(), groundMaterial);
  spires.forEach((sp, i) => add(spireMesh(sp, ctx.rng(`land/spire-${i}`), i >= FIRST - 1 && i <= FIRST + 3), spireMaterial));
  add(canalShell(ctx.rng('land/canal-wall'), 0), wallMaterial);
  add(canalFloor(), iceMaterial);
  ctx.scene.add(ctx.parts.built('land', land));

  return {
    dispose: () => {
      for (const g of made) g.dispose();
      groundMaterial.dispose();
      spireMaterial.dispose();
      wallMaterial.dispose();
      iceMaterial.dispose();
    },
  };
}
