// The ground of the Blood Marsh: the flats, the banks and beds of every pool and channel, the rock rise under the first camera, the hummocks,
// the escarpment six kilometres out (part `land`), and the thin crust round the one that is stuck (part `crust`).
import * as THREE from 'three';
import { F, R, STUCK, TAU, rel, smooth } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { createField, fbm, type Field } from './field';
import { patchGeometry, ringsGeometry } from './mesh';
import { LAND_FRAGMENT, LAND_VERTEX } from './shaders';
import { bakeGrain, bakePlates } from './tiles';

export const PARTS = ['land', 'crust'] as const;

/** The patch of thin crust that is built finely: its middle and half sizes along the establishing view's forward and right. */
const PATCH = { at: [27.5, 13.2] as [number, number], half: [7.5, 7.5] as [number, number], cell: 0.08 };

let shared: { field: Field; grain: THREE.DataTexture; plates: THREE.DataTexture } | null = null;
/** What the land knows, for the brine: the same field and the same grain. Made by the land's `create`. */
export function landShared(): { field: Field; grain: THREE.DataTexture; plates: THREE.DataTexture } {
  if (!shared) throw new Error('The land is made before the brine');
  return shared;
}

// The escarpment: a ring of cliff round the basin, six kilometres out, with the flats running up to its foot.
function scarp(): THREE.BufferGeometry {
  const seg = 720;
  const radii = [2900, 4400, 5100, 5400, 5650, 5800, 5950, 6100, 6250, 6700, 7200, 12500];
  const lift = [-0.6, -0.6, -0.6, 8, 25, 70, 130, 180, 215, 240, 250, 300];
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = ((i % seg) / seg) * TAU;
    const tall = 0.8 + 0.3 * Math.sin(a * 3 + 1.2) + 0.16 * Math.sin(a * 7 + 2.1) + 0.08 * Math.sin(a * 13 + 0.4) + 0.2 * (fbm(Math.sin(a) * 9 + 20, Math.cos(a) * 9 + 20, 4) - 0.5);
    const wob = 1 + 0.035 * Math.sin(a * 5 + 0.5) + 0.02 * Math.sin(a * 11 + 1.7) + 0.03 * (fbm(Math.sin(a) * 14 + 5, Math.cos(a) * 14 + 5, 4) - 0.5);
    for (let j = 0; j < radii.length; j++) {
      const r = (radii[j] as number) * (j < 2 ? 1 : wob);
      const gully = j > 2 && j < 10 ? 1 + 0.35 * (fbm(Math.sin(a) * 60 + j * 0.7, Math.cos(a) * 60, 3) - 0.5) : 1;
      pos.push(Math.sin(a) * r, (lift[j] as number) * (j < 3 ? 1 : tall * gully), -Math.cos(a) * r);
    }
    if (i < seg) {
      for (let j = 0; j < radii.length - 1; j++) {
        const b = i * radii.length + j;
        const c = b + radii.length;
        idx.push(b, b + 1, c, b + 1, c + 1, c);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

export function create(ctx: Context): Piece {
  const field = createField();
  const grain = bakeGrain(ctx.rng('land/grain'));
  const plates = bakePlates(ctx.rng('land/plates'));
  shared = { field, grain, plates };

  const centre = rel(PATCH.at[0], PATCH.at[1]);
  // Where a point is in the fine patch: metres inside its edge, negative outside.
  const inPatch = (x: number, z: number): number => {
    const dx = x - centre[0];
    const dz = z - centre[1];
    return Math.min(PATCH.half[0] - Math.abs(dx * F[0] + dz * F[1]), PATCH.half[1] - Math.abs(dx * R[0] + dz * R[1]));
  };
  const stuck = rel(STUCK[0], STUCK[1]);
  // The thin crust's own relief: plates that have sagged and tilted, and the hole the stuck one has trodden.
  const crustHeight = (x: number, z: number): number => {
    const base = field.height(x, z);
    const thin = field.thin(x, z);
    if (thin <= 0) return base;
    const sag = 0.07 * (fbm(x / 0.9, z / 0.9, 3) - 0.5) + 0.03 * (fbm(x / 0.23, z / 0.23, 2) - 0.5);
    const hole = Math.hypot(x - stuck[0], z - stuck[1]);
    const trodden = -0.16 * smooth(2.3, 0.6, hole) + 0.05 * Math.exp(-(((hole - 2.4) / 0.5) ** 2));
    return base + thin * (sag + trodden) * smooth(0, 1, inPatch(x, z));
  };
  // The land's own mesh lies a little under the fine patch, so the patch is what is seen there.
  const landHeight = (x: number, z: number): number => field.height(x, z) - 0.3 * smooth(0.3, 0.7, inPatch(x, z));

  ctx.rig.setLand(field.height, field.shore, field.thin);

  const material = new THREE.ShaderMaterial({
    vertexShader: LAND_VERTEX,
    fragmentShader: LAND_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      tFieldNear: { value: field.near },
      tFieldFar: { value: field.far },
      tPlates: { value: plates },
      tGrain: { value: grain },
    },
    toneMapped: false,
  });

  const ground = new THREE.Mesh(ringsGeometry(landHeight, rel(16, 4), 192, 0.25, 8), material);
  ground.frustumCulled = false;
  const far = new THREE.Mesh(scarp(), material);
  far.frustumCulled = false;
  const land = new THREE.Group();
  land.add(ground, far);
  ctx.scene.add(ctx.parts.built('land', land));

  const patch = new THREE.Mesh(
    patchGeometry((x, z) => crustHeight(x, z) + 0.012, centre, F, PATCH.half[0] * 2, PATCH.half[1] * 2, PATCH.cell, () => [0, 0]),
    material,
  );
  ctx.scene.add(ctx.parts.built('crust', patch));

  return {
    dispose: () => {
      ground.geometry.dispose();
      far.geometry.dispose();
      patch.geometry.dispose();
      material.dispose();
      field.dispose();
      grain.dispose();
      plates.dispose();
      shared = null;
    },
  };
}
