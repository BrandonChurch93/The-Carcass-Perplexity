// The ground of the Blood Marsh: the flats, the banks and beds of every pool and channel, the rock rise under the first camera, the hummocks,
// the escarpment six kilometres out (part `land`), and the thin crust round the one that is stuck (part `crust`).
import * as THREE from 'three';
import { F, K1_AT, K1_DIR, R, STUCK, TAU, rel, smooth } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { createField, fbm, vnoise, type Field } from './field';
import { patchGeometry, ringsGeometry } from './mesh';
import { LAND_FRAGMENT, LAND_VERTEX, RELIEF } from './shaders';
import { bakeGrain, bakePlates } from './tiles';

export const PARTS = ['land', 'crust'] as const;

/** The patch of thin crust that is built finely: its middle and half sizes along the establishing view's forward and right. */
const PATCH = { at: [27.5, 13.2] as [number, number], half: [7.5, 7.5] as [number, number], cell: 0.03 };
/** The foot of the rock rise the first lens looks down on, built finely for the same reason. */
/** The bank the third lens lies on, a hand above the salt. */
const BANK = { ahead: 2.6, half: [2.2, 3.4] as [number, number], cell: 0.02 };
const ROCK = { at: [9.25, -8.5] as [number, number], half: [10.75, 8.0] as [number, number], cell: 0.05 };

/** How many reads across a slanting pixel the pictures of heights and slopes get: 4 as the colours do, or 1, which is cheaper and softer far off. */
const DATA_SHARP: number = 1;

let shared: { field: Field; grain: THREE.DataTexture; plates: THREE.DataTexture } | null = null;
/** What the land knows, for the brine: the same field and the same grain. Made by the land's `create`. */
export function landShared(): { field: Field; grain: THREE.DataTexture; plates: THREE.DataTexture } {
  if (!shared) throw new Error('The land is made before the brine');
  return shared;
}

/** True: the escarpment is a built ring of cliff (wave 2). False: it is the far picture on the sky, and the ring is level flats. */
const SCARP_BUILT: boolean = false;

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
      // (The cliff itself is the far picture on the sky, air/sky.ts: this ring is the level flats running out under it to the haze.)
      pos.push(Math.sin(a) * r, SCARP_BUILT ? (lift[j] as number) * (j < 3 ? 1 : tall * gully) : -0.6, -Math.cos(a) * r);
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
  // Round the stuck one the crust has given way: a hollow of wet mud two strides across, and round it the slabs it broke into, each
  // tipped its own way, most with the broken edge down in the mud and the far edge standing up out of the flat.
  /** What the wallow does to a spot of the crust: metres it is moved up, how much of it is the hollow's mud, how much a tipped slab. */
  const wallow = (x: number, z: number): [number, number, number] => {
    const dx = x - stuck[0];
    const dz = z - stuck[1];
    const hole = Math.hypot(dx, dz);
    if (hole > 4.2) return [0, 0, 0];
    const rim = 2.0 + 0.5 * (fbm(x / 0.9 + 9, z / 0.9, 2) - 0.5);
    const mud = smooth(rim + 0.12, rim - 0.12, hole);
    const up = -0.2 * smooth(rim + 0.25, rim - 0.9, hole) + 0.03 * (fbm(x / 0.35, z / 0.35 + 4, 2) - 0.5) * mud;
    return [up, mud, 0];
  };
  const crustHeight = (x: number, z: number): number => {
    const base = field.height(x, z);
    const thin = field.thin(x, z);
    if (thin <= 0) return base;
    const mud = 0.02 * (fbm(x / 0.9, z / 0.9, 3) - 0.5) + wallow(x, z)[0];
    return base + thin * mud * smooth(0, 1, inPatch(x, z));
  };
  // The land's own mesh lies a little under the fine patch, so the patch is what is seen there.
  const landHeight = (x: number, z: number): number =>
    field.height(x, z) - 0.3 * smooth(0.3, 0.7, Math.max(inPatch(x, z), inside(x, z, bankCentre, BANK.half, K1_DIR))) - 0.6 * smooth(0.3, 0.9, inside(x, z, rockCentre, ROCK.half));
  // How deep a point sits among its neighbours, near and wide: clefts are dark because the sky does not reach into them.
  // (The neighbours are taken along the patch's own rows, whole cells away, and every height is kept once it is worked out: a neighbour
  // is then a vertex the patch has already asked for.)
  const kept = (h: (x: number, z: number) => number): ((x: number, z: number) => number) => {
    const known = new Map<number, number>();
    return (x, z) => {
      const key = Math.round(x * 1000) * 2097152 + Math.round(z * 1000);
      let y = known.get(key);
      if (y === undefined) {
        y = h(x, z);
        known.set(key, y);
      }
      return y;
    };
  };
  const hollowOf = (h: (x: number, z: number) => number, u: [number, number], a: number, b: number, da: number, db: number) => (x: number, z: number): [number, number] => {
    const here = h(x, z);
    const ring = (r: number): number => (h(x + u[0] * r, z + u[1] * r) + h(x - u[0] * r, z - u[1] * r) + h(x - u[1] * r, z + u[0] * r) + h(x + u[1] * r, z - u[0] * r)) / 4;
    return [Math.min(1, Math.max(0, (ring(a) - here) / da)), Math.min(1, Math.max(0, (ring(b) - here) / db))];
  };


  ctx.rig.setLand(field.height, field.shore, field.thin);

  const material = new THREE.ShaderMaterial({
    vertexShader: LAND_VERTEX,
    fragmentShader: LAND_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      tFieldNear: { value: field.near },
      tFieldFar: { value: field.far },
      tSilt: { value: ctx.assets.texture('mat/silt.jpg', { kind: 'colour', repeat: true, anisotropy: 1 }) },
      tSiltN: { value: ctx.assets.texture('mat/silt-nh.png', { kind: 'data', repeat: true, anisotropy: DATA_SHARP }) },
      tPan: { value: ctx.assets.texture('mat/pan.jpg', { kind: 'colour', repeat: true, anisotropy: 1 }) },
      tPanN: { value: ctx.assets.texture('mat/pan-nh.jpg', { kind: 'data', repeat: true, anisotropy: DATA_SHARP }) },
      tSlick: { value: ctx.assets.texture('mat/slick.jpg', { kind: 'colour', repeat: true, anisotropy: 1 }) },
      tSlickN: { value: ctx.assets.texture('mat/slick-nh.jpg', { kind: 'data', repeat: true, anisotropy: DATA_SHARP }) },
      tGrain: { value: grain },
      tCrust: { value: ctx.assets.texture('mat/crust.jpg', { kind: 'colour', repeat: true, anisotropy: 1 }) },
      tCrustN: { value: ctx.assets.texture('mat/crust-nh.png', { kind: 'data', repeat: true, anisotropy: DATA_SHARP }) },
      tRock: { value: ctx.assets.texture('mat/rocktop.jpg', { kind: 'colour', repeat: true, anisotropy: 4 }) },
      tRockN: { value: ctx.assets.texture('mat/rocktop-nh.jpg', { kind: 'data', repeat: true, anisotropy: DATA_SHARP }) },
      tRockS: { value: ctx.assets.texture('mat/rockside.jpg', { kind: 'colour', repeat: true, anisotropy: 4 }) },
      tRockSN: { value: ctx.assets.texture('mat/rockside-nh.jpg', { kind: 'data', repeat: true, anisotropy: DATA_SHARP }) },
    },
    toneMapped: false,
  });

  // The only discard of the ground is in the brine's mirror: for the depth the engine lays down first the ground is whole.
  material.userData.depthFragment = 'void main() { gl_FragColor = vec4(0.0); }';
  const ground = new THREE.Mesh(ringsGeometry(landHeight, rel(16, 4), 192, 0.25, 8), material);
  ground.frustumCulled = false;
  const far = new THREE.Mesh(scarp(), material);
  far.frustumCulled = false;
  const land = new THREE.Group();
  land.add(ground, far);
  const rockHeight = kept(field.height);
  const hollow = hollowOf(rockHeight, F, ROCK.cell * 2, ROCK.cell * 12, 0.05, 0.34);
  // A fine patch is raised by the pictures' heights in its vertices; the raising dies out toward its rim, where the plain ground takes over.
  const raised = (c: [number, number], half: [number, number], cell: number, along: [number, number] = F): THREE.ShaderMaterial => {
    const m = new THREE.ShaderMaterial({
      vertexShader: LAND_VERTEX,
      fragmentShader: LAND_FRAGMENT,
      uniforms: { ...material.uniforms, uCell: { value: cell }, uPatch: { value: new THREE.Vector4(c[0], c[1], half[0], half[1]) }, uAlong: { value: new THREE.Vector2(along[0], along[1]) } },
      defines: RELIEF ? { RELIEF: 1 } : {},
      toneMapped: false,
    });
    m.userData.depthFragment = material.userData.depthFragment;
    return m;
  };
  const footMaterial = raised(rockCentre, ROCK.half, ROCK.cell);
  const foot = new THREE.Mesh(patchGeometry(rockHeight, rockCentre, F, ROCK.half[0] * 2, ROCK.half[1] * 2, ROCK.cell, hollow), footMaterial);
  const bankMaterial = raised(bankCentre, BANK.half, BANK.cell, K1_DIR);
  const bank = new THREE.Mesh(patchGeometry(field.height, bankCentre, K1_DIR, BANK.half[0] * 2, BANK.half[1] * 2, BANK.cell, () => [0, 0]), bankMaterial);
  land.add(foot, bank);
  ctx.scene.add(ctx.parts.built('land', land));

  const crustMaterial = raised(centre, PATCH.half, PATCH.cell);
  const patch = new THREE.Mesh(patchGeometry((x, z) => crustHeight(x, z) + 0.012, centre, F, PATCH.half[0] * 2, PATCH.half[1] * 2, PATCH.cell, (x, z) => { const w = wallow(x, z); return [w[1], w[2]]; }), crustMaterial);
  ctx.scene.add(ctx.parts.built('crust', patch));

  return {
    dispose: () => {
      ground.geometry.dispose();
      far.geometry.dispose();
      foot.geometry.dispose();
      bank.geometry.dispose();
      patch.geometry.dispose();
      material.dispose();
      footMaterial.dispose();
      bankMaterial.dispose();
      crustMaterial.dispose();
      field.dispose();
      grain.dispose();
      plates.dispose();
      shared = null;
    },
  };
}
