// The ground of the Blood Marsh: the flats, the banks and beds of every pool and channel, the rock rise under the first camera, the hummocks,
// the escarpment six kilometres out (part `land`), and the thin crust round the one that is stuck (part `crust`).
import * as THREE from 'three';
import { F, K1_AT, K1_DIR, R, STUCK, TAU, rel, smooth } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { createField, fbm, type Field } from './field';
import { patchGeometry, ringsGeometry } from './mesh';
import { LAND_FRAGMENT, LAND_VERTEX } from './shaders';
import { bakeGrain, bakePlates } from './tiles';

export const PARTS = ['land', 'crust'] as const;

/** The patch of thin crust that is built finely: its middle and half sizes along the establishing view's forward and right. */
const PATCH = { at: [27.5, 13.2] as [number, number], half: [7.5, 7.5] as [number, number], cell: 0.04 };
/** The foot of the rock rise the first lens looks down on, built finely for the same reason. */
/** The bank the third lens lies on, a hand above the salt. */
const BANK = { ahead: 2.6, half: [2.2, 3.4] as [number, number], cell: 0.02 };
const ROCK = { at: [10.5, -8.5] as [number, number], half: [9.5, 7.5] as [number, number], cell: 0.07 };

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
  const rockCentre = rel(ROCK.at[0], ROCK.at[1]);
  const bankCentre: [number, number] = [K1_AT[0] + K1_DIR[0] * BANK.ahead, K1_AT[1] + K1_DIR[1] * BANK.ahead];
  // Where a point is in a fine patch: metres inside its edge, negative outside.
  const inside = (x: number, z: number, c: [number, number], half: [number, number], along: [number, number] = F): number => {
    const dx = x - c[0];
    const dz = z - c[1];
    return Math.min(half[0] - Math.abs(dx * along[0] + dz * along[1]), half[1] - Math.abs(-dx * along[1] + dz * along[0]));
  };
  const inPatch = (x: number, z: number): number => inside(x, z, centre, PATCH.half);
  const stuck = rel(STUCK[0], STUCK[1]);
  // The thin crust's own relief: what is left of it lies on the mud as slabs a stride across, each sagged and tilted its own way; between
  // them the mud is lower, and lowest where the stuck one has trodden it.
  const SLAB = 0.46;
  const hash = (i: number, j: number, k: number): number => {
    const n = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };
  /** The slab a point is on: metres inside its edge, whether it is still there, its own shade, and its top above the mud's mean. */
  const slabAt = (x0: number, z0: number): { edge: number; kept: boolean; shade: number; top: number } => {
    // Broken crust has no straight edges and no one size.
    const x = x0 + 0.34 * (fbm(x0 / 0.7 + 3, z0 / 0.7, 3) - 0.5) + 0.07 * (fbm(x0 / 0.13, z0 / 0.13 + 8, 2) - 0.5);
    const z = z0 + 0.34 * (fbm(x0 / 0.7, z0 / 0.7 + 6, 3) - 0.5) + 0.07 * (fbm(x0 / 0.13 + 5, z0 / 0.13, 2) - 0.5);
    const gx = Math.floor(x / SLAB);
    const gz = Math.floor(z / SLAB);
    let d1 = 9;
    let d2 = 9;
    let bi = 0;
    let bj = 0;
    let bx = 0;
    let bz = 0;
    for (let j = gz - 1; j <= gz + 1; j++) {
      for (let i = gx - 1; i <= gx + 1; i++) {
        const fx = (i + 0.15 + 0.7 * hash(i, j, 1)) * SLAB;
        const fz = (j + 0.15 + 0.7 * hash(i, j, 2)) * SLAB;
        const d = Math.hypot(x - fx, z - fz);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          bi = i;
          bj = j;
          bx = fx;
          bz = fz;
        } else if (d < d2) d2 = d;
      }
    }
    const hole = Math.hypot(bx - stuck[0], bz - stuck[1]);
    // Whole away from the stuck one, where nothing has trodden it: hairline cracks, no gaps, hardly a tilt.
    const whole = smooth(3.6, 6.5, hole + 2.5 * (fbm(bx / 3.1, bz / 3.1 + 2, 2) - 0.5));
    const chance = 0.02 + 0.85 * fbm(bx / 2.3 + 4, bz / 2.3, 2) + whole;
    const kept = hash(bi, bj, 3) < chance;
    const lean = 0.12 * (1 - 0.85 * whole);
    const tiltX = (hash(bi, bj, 4) - 0.5) * lean;
    const tiltZ = (hash(bi, bj, 5) - 0.5) * lean;
    return { edge: (d2 - d1) * 0.5 - 0.012 + 0.06 * whole, kept, shade: hash(bi, bj, 6) * (1 - 0.7 * whole) + 0.35 * whole, top: (0.006 + 0.022 * hash(bi, bj, 7)) * (1 - 0.6 * whole) + tiltX * (x - bx) + tiltZ * (z - bz) };
  };
  const crustHeight = (x: number, z: number): number => {
    const base = field.height(x, z);
    const thin = field.thin(x, z);
    if (thin <= 0) return base;
    const hole = Math.hypot(x - stuck[0], z - stuck[1]);
    const mud = -0.012 + 0.03 * (fbm(x / 0.9, z / 0.9, 3) - 0.5) + 0.016 * (fbm(x / 0.17, z / 0.17, 2) - 0.5) - 0.12 * smooth(2.3, 0.6, hole) + 0.04 * Math.exp(-(((hole - 2.4) / 0.5) ** 2));
    const slab = slabAt(x, z);
    const on = slab.kept ? smooth(0, 0.035, slab.edge) : 0;
    return base + thin * (mud * (1 - on) + slab.top * on) * smooth(0, 1, inPatch(x, z));
  };
  const crustPaint = (x: number, z: number): [number, number] => {
    const slab = slabAt(x, z);
    return [slab.kept ? Math.min(0.12, slab.edge) : -0.05, slab.shade];
  };
  // The land's own mesh lies a little under the fine patch, so the patch is what is seen there.
  const landHeight = (x: number, z: number): number =>
    field.height(x, z) - 0.3 * smooth(0.3, 0.7, Math.max(inPatch(x, z), inside(x, z, rockCentre, ROCK.half), inside(x, z, bankCentre, BANK.half, K1_DIR)));
  // Round knobs packed side by side, 0 to 1: one to a cell, each a part of a ball.
  const knobs = (x: number, z: number, cell: number): number => {
    const gx = Math.floor(x / cell);
    const gz = Math.floor(z / cell);
    let best = 0;
    for (let j = gz - 1; j <= gz + 1; j++) {
      for (let i = gx - 1; i <= gx + 1; i++) {
        const n1 = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
        const n2 = Math.sin(i * 269.5 + j * 183.3) * 43758.5453;
        const n3 = Math.sin(i * 419.2 + j * 371.9) * 43758.5453;
        const fx = (i + 0.2 + 0.6 * (n1 - Math.floor(n1))) * cell;
        const fz = (j + 0.2 + 0.6 * (n2 - Math.floor(n2))) * cell;
        const size = 0.5 + 0.5 * (n3 - Math.floor(n3));
        const d = Math.hypot(x - fx, z - fz) / (cell * 0.75 * size);
        if (d < 1) best = Math.max(best, size * Math.sqrt(1 - d * d));
      }
    }
    return best;
  };
  // The salt the brine leaves at its edge grows in lumps like a cauliflower's: only the fine patches are fine enough to carry them.
  const frilled = (x: number, z: number): number => {
    const base = field.height(x, z);
    const s = field.shore(x, z);
    if (s < 0.03 || s > 1.2) return base;
    const env = smooth(0.03, 0.16, s) * smooth(0.8, 0.25, s + 0.5 * (fbm(x / 0.9 + 5, z / 0.9, 2) - 0.5));
    const c = fbm(x / 0.37 + 2, z / 0.37, 2);
    return base + env * (0.015 + (0.3 + 0.7 * smooth(0.35, 0.65, c)) * (0.06 * knobs(x, z, 0.11) + 0.035 * knobs(x + 3.3, z, 0.042)));
  };
  // How deep a point sits among its neighbours, near and wide: clefts are dark because the sky does not reach into them.
  const hollowOf = (h: (x: number, z: number) => number, a: number, b: number, da: number, db: number) => (x: number, z: number): [number, number] => {
    const here = h(x, z);
    const near = (h(x + a, z) + h(x - a, z) + h(x, z + a) + h(x, z - a)) / 4;
    const wide = (h(x + b, z) + h(x - b, z) + h(x, z + b) + h(x, z - b)) / 4;
    return [Math.min(1, Math.max(0, (near - here) / da)), Math.min(1, Math.max(0, (wide - here) / db))];
  };


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
      tCrust: { value: ctx.assets.texture('mat/crust.jpg', { kind: 'colour', repeat: true, anisotropy: 4 }) },
      tCrustN: { value: ctx.assets.texture('mat/crust-nh.png', { kind: 'data', repeat: true, anisotropy: 4 }) },
      tMud: { value: ctx.assets.texture('mat/mud.jpg', { kind: 'colour', repeat: true, anisotropy: 4 }) },
      tMudN: { value: ctx.assets.texture('mat/mud-nh.png', { kind: 'data', repeat: true, anisotropy: 4 }) },
      tRock: { value: ctx.assets.texture('mat/rock.jpg', { kind: 'colour', repeat: true, anisotropy: 4 }) },
      tRockN: { value: ctx.assets.texture('mat/rock-nh.png', { kind: 'data', repeat: true, anisotropy: 4 }) },
      uBank: { value: new THREE.Vector3(bankCentre[0], bankCentre[1], 3.6) },
    },
    toneMapped: false,
  });

  const ground = new THREE.Mesh(ringsGeometry(landHeight, rel(16, 4), 192, 0.25, 8), material);
  ground.frustumCulled = false;
  const far = new THREE.Mesh(scarp(), material);
  far.frustumCulled = false;
  const land = new THREE.Group();
  land.add(ground, far);
  const hollow = hollowOf(field.height, 0.16, 0.5, 0.07, 0.3);
  const foot = new THREE.Mesh(patchGeometry(field.height, rockCentre, F, ROCK.half[0] * 2, ROCK.half[1] * 2, ROCK.cell, hollow), material);
  const bank = new THREE.Mesh(
    patchGeometry(frilled, bankCentre, K1_DIR, BANK.half[0] * 2, BANK.half[1] * 2, BANK.cell, hollowOf(frilled, 0.02, 0.07, 0.01, 0.03)),
    material,
  );
  land.add(foot, bank);
  ctx.scene.add(ctx.parts.built('land', land));

  const crustMaterial = new THREE.ShaderMaterial({
    vertexShader: LAND_VERTEX,
    fragmentShader: LAND_FRAGMENT,
    uniforms: material.uniforms,
    defines: { CRUST: 1 },
    toneMapped: false,
  });
  const patch = new THREE.Mesh(patchGeometry((x, z) => crustHeight(x, z) + 0.012, centre, F, PATCH.half[0] * 2, PATCH.half[1] * 2, PATCH.cell, crustPaint), crustMaterial);
  ctx.scene.add(ctx.parts.built('crust', patch));

  return {
    dispose: () => {
      ground.geometry.dispose();
      far.geometry.dispose();
      foot.geometry.dispose();
      bank.geometry.dispose();
      patch.geometry.dispose();
      material.dispose();
      crustMaterial.dispose();
      field.dispose();
      grain.dispose();
      plates.dispose();
      shared = null;
    },
  };
}
