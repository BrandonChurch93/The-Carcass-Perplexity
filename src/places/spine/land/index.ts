// The land of the Spine: the knife ridge and its flanks, the spires, and the canal through the first of them.
// height.ts is its shape, meshes.ts what is built on that shape, shaders.ts its rock and snow.
import * as THREE from 'three';
import { FIRST, spires } from '../ridge';
import type { Context, Piece } from '../shared/context';
import { canalFloor, canalShell, crestStrip, flanks, hollow, spireMesh } from './meshes';
import { height } from './height';
import { ICE_FRAGMENT, LAND_DEPTH_FRAGMENT, LAND_FRAGMENT, LAND_VERTEX } from './shaders';
import { RIG_VERTEX } from '../shared/glsl';

export const PARTS: readonly string[] = ['land'];

/** Draw the land's depth first and its colour only where it shows. Off, every fragment of every triangle is shaded, hidden or not. */
const DEPTH_FIRST = true;
/** How many taps the rock pictures take along a grazing face. 4 is the better picture on ground seen at a low angle; 1 is the cheap one. */
const ANISOTROPY = 1;

export function create(ctx: Context): Piece {
  ctx.rig.setLand(height, hollow);

  const picture = (name: string): { value: THREE.Texture } => ({ value: ctx.assets.texture(`mat/${name}.jpg`, { anisotropy: ANISOTROPY }) });
  const data = (name: string): { value: THREE.Texture } => ({ value: ctx.assets.texture(`mat/${name}-nh.png`, { kind: 'data', anisotropy: ANISOTROPY }) });
  const pictures = {
    tSpire: picture('spire'),
    tSpireNh: data('spire'),
    tRubble: picture('rubble'),
    tRubbleNh: data('rubble'),
    tSnow: picture('snow'),
    tSnowNh: data('snow'),
    tCanal: picture('canal'),
    tCanalNh: data('canal'),
  };
  const material = (kind: number, side: THREE.Side = THREE.FrontSide): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({
      vertexShader: LAND_VERTEX,
      fragmentShader: LAND_FRAGMENT,
      uniforms: { ...ctx.rig.uniforms, ...pictures, uKind: { value: kind } },
      side,
      toneMapped: false,
      // The depth is already there (see LAND_DEPTH_FRAGMENT): colour is shaded only where this is the nearest surface.
      depthFunc: DEPTH_FIRST ? THREE.EqualDepth : THREE.LessEqualDepth,
      depthWrite: !DEPTH_FIRST,
    });
  const depthMaterial = (kind: number, side: THREE.Side = THREE.FrontSide): THREE.ShaderMaterial =>
    new THREE.ShaderMaterial({
      vertexShader: LAND_VERTEX,
      fragmentShader: LAND_DEPTH_FRAGMENT,
      uniforms: { ...ctx.rig.uniforms, ...pictures, uKind: { value: kind } },
      side,
      toneMapped: false,
      colorWrite: false,
    });
  const depthOf = new Map<THREE.Material, THREE.ShaderMaterial>();
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
    const first = depthOf.get(m);
    if (first) {
      const depth = new THREE.Mesh(geometry, first);
      depth.frustumCulled = false;
      depth.renderOrder = -10;
      land.add(depth);
    }
  };
  if (DEPTH_FIRST) {
    depthOf.set(groundMaterial, depthMaterial(0));
    depthOf.set(spireMaterial, depthMaterial(1, THREE.DoubleSide));
    depthOf.set(wallMaterial, depthMaterial(2, THREE.DoubleSide));
  }
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
      for (const m of depthOf.values()) m.dispose();
      iceMaterial.dispose();
    },
  };
}
