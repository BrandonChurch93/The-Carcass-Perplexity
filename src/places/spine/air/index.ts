// The air of the Spine: the dusk sky, the haze of the height, the cloud sea below, the storm against the ridge and what pours from it, and the spindrift.
// sky.ts is the dome; volume.ts the half-size pass that marches everything between the camera and the scene; noise.ts the block of noise they are cut from.
import * as THREE from 'three';
import { volumeUniforms } from '../../../core/engine';
import { QUAD_VERTEX } from '../../../core/post';
import { FIRST, crest, frameAt, spires, type Spire } from '../ridge';
import type { Context, Piece } from '../shared/context';
import { stagedSeconds } from '../shared/stage';
import { INSIDE_FROM } from '../shared/anchors';
import { bakeNoise } from './noise';
import { createSky } from './sky';
import { VOLUME_FRAGMENT } from './volume';

export const PARTS: readonly string[] = ['sky', 'air', 'cloud-sea', 'cloud', 'spindrift'];

const RIDGE = { from: -4300, to: 7700, width: 1024 };
/** The saddles the storm pours through: the index of the spire each one follows. The saddle the trail crosses is kept clear. */
const POURS = [FIRST - 2, FIRST, FIRST + 1, FIRST + 2, FIRST + 3, FIRST + 5];

// The crest as the volume reads it: for each x, the z of the crest, its height, and how far down a pouring saddle that x is.
function ridgeTexture(): THREE.DataTexture {
  const data = new Uint16Array(RIDGE.width * 4);
  const rows: { x: number; z: number; y: number; dip: number }[] = [];
  const firstS = (spires[0] as Spire).s;
  const lastS = (spires[spires.length - 1] as Spire).s;
  for (let s = firstS; s <= lastS; s += 8) {
    const f = frameAt(s);
    let k = 0;
    while (k < spires.length - 2 && s > (spires[k + 1] as Spire).s) k++;
    const a = spires[k] as Spire;
    const b = spires[k + 1] as Spire;
    const part = Math.min(1, Math.max(0, (s - a.s) / (b.s - a.s)));
    const dip = POURS.includes(k) ? 0.5 - 0.5 * Math.cos(2 * Math.PI * Math.pow(part, 0.756)) : 0;
    rows.push({ x: f.x, z: f.z, y: crest(s), dip });
  }
  let at = 0;
  for (let i = 0; i < RIDGE.width; i++) {
    const x = RIDGE.from + ((i + 0.5) / RIDGE.width) * (RIDGE.to - RIDGE.from);
    while (at < rows.length - 2 && (rows[at + 1] as (typeof rows)[number]).x < x) at++;
    const a = rows[at] as (typeof rows)[number];
    const b = rows[at + 1] as (typeof rows)[number];
    const k = Math.min(1, Math.max(0, (x - a.x) / (b.x - a.x)));
    // Beyond the ends of the ridge the crest runs on straight.
    const slope = (b.z - a.z) / (b.x - a.x);
    const z = x < a.x ? a.z + slope * (x - a.x) : x > b.x ? b.z + slope * (x - b.x) : a.z + (b.z - a.z) * k;
    data[i * 4] = THREE.DataUtils.toHalfFloat(z);
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(a.y + (b.y - a.y) * k);
    data[i * 4 + 2] = THREE.DataUtils.toHalfFloat(a.dip + (b.dip - a.dip) * k);
    data[i * 4 + 3] = THREE.DataUtils.toHalfFloat(1);
  }
  const t = new THREE.DataTexture(data, RIDGE.width, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

export function create(ctx: Context): Piece {
  const noise = bakeNoise(ctx.rng('air/noise'));
  const sky = createSky(ctx, noise);
  ctx.scene.add(ctx.parts.built('sky', sky.dome));
  ctx.parts.effect('air', 'built');
  ctx.parts.effect('cloud-sea', 'built');
  ctx.parts.effect('cloud', 'built');
  ctx.parts.effect('spindrift', 'built');

  const ridge = ridgeTexture();
  // What is drawn when one effect is shown alone: the haze, the sea, the storm and its pour, the spindrift.
  const show = new THREE.Vector4(1, 1, 1, 1);
  const stage = new THREE.Vector4(1, 0, 0, 0);
  const volume = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: VOLUME_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      ...volumeUniforms(),
      tNoise: { value: noise },
      tRidge: { value: ridge },
      uRidgeSpan: { value: new THREE.Vector2(RIDGE.from, 1 / (RIDGE.to - RIDGE.from)) },
      uShow: { value: show },
      uStage: { value: stage },
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });

  return {
    volume,
    setTime: () => {
      // Staged by shot: inside the canal the gale does not reach, so no spindrift runs over its floor.
      stage.x = stagedSeconds() >= INSIDE_FROM - 1e-4 ? 0 : 1;
    },
    solo: (part) => {
      const only = (name: string): number => (part === null || !part.startsWith('spine/') || !PARTS.includes(part.slice(6)) || part === 'spine/sky' || part === `spine/${name}` ? 1 : 0);
      show.set(only('air'), only('cloud-sea'), only('cloud'), only('spindrift'));
    },
    dispose: () => {
      sky.dispose();
      volume.dispose();
      noise.dispose();
      ridge.dispose();
    },
  };
}
