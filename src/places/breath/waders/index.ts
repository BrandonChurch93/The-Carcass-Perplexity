// The waders: the herd in the tide channel, the far flock on the shallows, and the one that stands over the drop at the rim.
// Each animal is a skin of tubes posed on the processor from the time alone (animal.ts); who each one is and what it does is in herd.ts.
import * as THREE from 'three';
import { SEA_LEVEL, footing } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { Wader, type Env } from './animal';
import { makeHerd } from './herd';
import { FRAGMENT, VERTEX } from './material';
import { Skin } from './skin';

export const PARTS: readonly string[] = ['waders'];

/** Discs of contact shade for an animal that stands on rock: four feet. Its long shadow is one more. */
const DISCS = 5;

export function create(ctx: Context): Piece {
  const { rig } = ctx;
  const env: Env = { ground: (x, z) => footing(x, z), sea: SEA_LEVEL };
  const skin = new Skin();
  const members = makeHerd(ctx.rng('waders'));
  const herd = members.map((m, i) => {
    skin.who = i;
    return new Wader(skin, m.build, m.plan, env);
  });
  const geometry = skin.build();

  const pixel = { value: 0.001 };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...rig.uniforms, uPixel: pixel, uSea: { value: SEA_LEVEL }, uDead: { value: 0 } },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('waders', mesh));

  // Only those near the cameras shade the ground: the far flock is smaller than a cell of the contact map.
  const shading = members.map((m, i) => (m.build.far ? -1 : i)).filter((i) => i >= 0);
  const discs = rig.contactDiscs(shading.length * DISCS);
  let height = 0;
  const size = new THREE.Vector2();

  return {
    setTime: (seconds) => {
      herd.forEach((animal, i) => {
        const stood = animal.pose(seconds);
        const slot = shading.indexOf(i);
        if (slot < 0) return;
        const k = animal.b.k;
        stood.feet.forEach((foot, j) => {
          // A foot under water shades the bed very little: the water scatters the light.
          const dry = foot.wet > 0.02 ? 0.25 : 1;
          const off = Math.min(1, foot.lift / (0.5 * k));
          rig.setDisc(discs, slot * DISCS + j, foot.x, foot.z, 0.16 * k * (1 + 1.5 * off), 0.85 * dry * (1 - 0.7 * off));
        });
        const wet = (stood.feet[0]!.wet + stood.feet[2]!.wet) / 2 > 0.02 ? 0.35 : 1;
        rig.setShadow(discs, slot * DISCS + 4, stood.body.x, stood.body.z, 0.55 * k, 2.6 * k, 0.55 * wet);
      });
      skin.touch();
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
