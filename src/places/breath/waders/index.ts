// The waders: the herd in the tide channel, the far flock on the shallows, and the one that stands over the drop at the rim.
// Each animal is a skin of tubes posed on the processor from the time alone (animal.ts); who each one is and what it does is in herd.ts.
import * as THREE from 'three';
import { SEA_LEVEL, footing } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { Wader, type Env } from './animal';
import { makeHerd } from './herd';
import { FRAGMENT, VERTEX } from './material';
import { makeDrips } from './drips';
import { MIRROR } from './mirror';
import { RIPPLES, makeRipples } from './ripples';
import { Skin } from './skin';

export const PARTS: readonly string[] = ['waders'];

/** Discs of contact shade for an animal that stands on rock: four feet. Its long shadow is one more. */
const DISCS = 5;
/** Drops in the air under one lifted tuft, at most. */
const DROPS = 26;
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

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
  const pictures = {
    tHide: { value: ctx.assets.texture('waders/hide.jpg') },
    tHideNh: { value: ctx.assets.texture('waders/hide-nh.png', { kind: 'data' }) },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...rig.uniforms, ...pictures, uPixel: pixel, uSea: { value: SEA_LEVEL }, uDead: { value: 0 }, uMirror: { value: 0 } },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const drips = makeDrips(DROPS * 12, { ...rig.uniforms, uPixel: pixel });
  const group = new THREE.Group();
  group.add(mesh, drips.mesh);
  ctx.scene.add(ctx.parts.built('waders', group));

  const ripples = makeRipples(96, SEA_LEVEL, rig.uniforms.uSolo as THREE.IUniform);
  const rings = new THREE.WebGLRenderTarget(8, 8, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  rings.texture.generateMipmaps = false;
  RIPPLES.texture.value = rings.texture;
  const wading = members.map((m, i) => (m.near ? i : -1)).filter((i) => i >= 0);

  // The same herd for the water's mirror: drawn upside down under the water's level into a picture of its own, which the water reads.
  const mirrored = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...rig.uniforms, ...pictures, uPixel: pixel, uSea: { value: SEA_LEVEL }, uDead: { value: 0 }, uMirror: { value: 1 } },
    side: THREE.DoubleSide,
  });
  const image = new THREE.Mesh(geometry, mirrored);
  image.frustumCulled = false;
  const mirrorScene = new THREE.Scene();
  mirrorScene.add(image);
  const target = new THREE.WebGLRenderTarget(8, 8, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
  target.texture.generateMipmaps = false;
  MIRROR.texture.value = target.texture;
  const clear = new THREE.Color();

  // Only those near the cameras shade the ground: the far flock is smaller than a cell of the contact map.
  const shading = members.map((m, i) => (m.build.far ? -1 : i)).filter((i) => i >= 0);
  const discs = rig.contactDiscs(shading.length * DISCS);
  let height = 0;
  const size = new THREE.Vector2();

  return {
    setTime: (seconds) => {
      ripples.begin();
      drips.begin();
      herd.forEach((animal, i) => {
        const stood = animal.pose(seconds);
        if (wading.includes(i)) {
          const seed = animal.b.seed;
          stood.feet.forEach((foot, j) => {
            if (foot.wet < 0.02) return;
            // A leg that stands sends a faint ring as the animal shifts; one that has just come down or is drawn through the water sends strong ones.
            ripples.add(foot.x, foot.z, 1.5, 0.3 + 0.5 * foot.carried, foot.since, seed + j * 1.9);
          });
          const sea = SEA_LEVEL;
          if (stood.tuft.y < sea + 0.35 && footing(stood.tuft.x, stood.tuft.z) < sea) {
            // The tuft is worked through the water: the water round it is never still.
            ripples.add(stood.tuft.x, stood.tuft.z, 2.0, 0.75, 0.4, seed * 2.3, 21, 0.42);
          } else if (stood.sinceLift < 9 && footing(stood.tuft.x, stood.tuft.z) < sea) {
            // Lifted: it streams, then drips, for some seconds. Every drop is where the time since the lift puts it.
            const pour = Math.exp(-stood.sinceLift / 3.2);
            const tips = stood.tips;
            const count = Math.min(DROPS, tips.length / 3);
            for (let d = 0; d < count; d++) {
              const tip = Math.floor(hash(seed + d * 3.3) * (tips.length / 3)) * 3;
              const period = 0.34 + 0.5 * hash(seed + d * 7.7);
              const turn = (stood.sinceLift + 3 * hash(seed + d * 1.3)) / period;
              const n = Math.floor(turn);
              if (hash(seed + d * 5.1 + n * 9.7) > 0.25 + 0.75 * pour) continue;
              const fall = (turn - n) * period;
              const x = tips[tip] as number;
              const z = tips[tip + 2] as number;
              const y = (tips[tip + 1] as number) - 4.9 * fall * fall;
              if (y > sea) drips.add(x, y, z, 0.012 + 9.8 * fall * 0.011);
              else if (d % 4 === 0) ripples.add(x, z, 0.55, 0.5 * pour + 0.12, (sea - y) / 3, seed + d, 48, 0.24);
            }
            ripples.add(stood.tuft.x, stood.tuft.z, 0.9, 0.2 + 0.45 * pour, 5, seed, 40, 0.26);
          }
        }
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
      ripples.end(seconds);
      drips.end();
    },
    beforeSample: (renderer, camera) => {
      renderer.getDrawingBufferSize(size);
      pixel.value = 2 / ((camera.projectionMatrix.elements[5] as number) * (height || size.y || 2160));
      const before = renderer.getRenderTarget();
      renderer.getClearColor(clear);
      const alpha = renderer.getClearAlpha();
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, false);
      renderer.render(mirrorScene, camera);
      renderer.setRenderTarget(rings);
      renderer.clear(true, false, false);
      renderer.render(ripples.scene, camera);
      renderer.setClearColor(clear, alpha);
      renderer.setRenderTarget(before);
    },
    resize: (w, h) => {
      height = h;
      target.setSize(Math.max(8, Math.round(w / 2)), Math.max(8, Math.round(h / 2)));
      rings.setSize(Math.max(8, Math.round(w / 2)), Math.max(8, Math.round(h / 2)));
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      mirrored.dispose();
      target.dispose();
      rings.dispose();
      ripples.dispose();
      drips.dispose();
    },
  };
}
