// The waders: the herd in the tide channel, the far flock on the shallows, and the one that stands over the drop at the rim.
// Each animal is a skin of tubes posed on the processor from the time alone (animal.ts); who each one is and what it does is in herd.ts.
import * as THREE from 'three';
import { NEAR_WADERS, RIM_WADER, SEA_LEVEL, footing, shotSpan } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import type { Context, Piece } from '../shared/context';
import { Wader, type Env } from './animal';
import { makeHerd } from './herd';
import { DEPTH_FRAGMENT, FRAGMENT, VERTEX } from './material';
import { makeDrips } from './drips';
import { MIRROR } from './mirror';
import { RIPPLES, makeRipples } from './ripples';
import { Skin } from './skin';

export const PARTS: readonly string[] = ['waders'];

/** Discs of contact shade for an animal that stands on rock: four feet. Its long shadow is one more. */
const DISCS = 5;
/** Drops in the air under one lifted tuft, at most. */
const DROPS = 104;
/** Metres of water a wader stands in at most. */
const WADE = 0.14;
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

export function create(ctx: Context): Piece {
  const { rig } = ctx;
  // Staged: where the channel is deep the waders keep to its shallows, so a foot stands a hand under the water and a lifted one comes clear of it.
  const env: Env = { ground: (x, z) => Math.max(footing(x, z), SEA_LEVEL - WADE), sea: SEA_LEVEL };
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
    tWader: { value: ctx.assets.texture('mat/wader.jpg', { repeat: false }) },
    tWaderA: { value: ctx.assets.texture('mat/wader-a.png', { kind: 'data', repeat: false }) },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...rig.uniforms, ...pictures, uPixel: pixel, uSea: { value: SEA_LEVEL }, uDead: { value: 0 }, uMirror: { value: 0 } },
  });
  material.userData.depthFragment = DEPTH_FRAGMENT;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const drips = makeDrips(DROPS * 10, { ...rig.uniforms, uPixel: pixel });
  const group = new THREE.Group();
  group.add(mesh, drips.mesh);
  ctx.scene.add(ctx.parts.built('waders', group));

  const ripples = makeRipples(144, SEA_LEVEL, rig.uniforms.uSolo as THREE.IUniform);
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

  // Staged: the one at the rim stands there in the wide view and in the two views of the rim. In the view down the shaft (breath-02), where
  // it would stand large in the lens, it is out on the flats with the others; in the view of the plumes (breath-03) it is the one that
  // stands in the lit mist behind the first of them, neck up.
  const rim = herd[NEAR_WADERS.length] as Wader;
  const AWAY = { x: -58, z: -98 };
  // Staged: in the view of the plumes it stands on the rock behind the weed, where its neck and mop rise clear of the fronds beside the sun.
  // Staged: in the view of the plumes it is a whole animal far off in the vapour, seen in the gap between the fronds, as the picture has it.
  const MIST = { x: -37.2, z: -39.75, heading: 85 };
  // Staged: in the view of the rim it stands clear of the growth, before it, where the picture of the rim has it.
  const RIM_NEAR = { x: -28.0, z: 17.4, heading: 38 };
  const rimUp = rim.plan.up;
  const rimCarry = rim.plan.carry;
  const MIST_UP: [number, number][] = [[-5, 60]];
  const RAD = Math.PI / 180;
  const shaft = shotSpan('breath-02');
  const mist = shotSpan('breath-03');
  const rimView = shotSpan('breath-05');
  // Staged: in the wide view only the three in the channel are near. The others of the herd are half as far again out on the flats, small, as the
  // picture has them; in the view in the channel they are where they were.
  const wide = shotSpan('breath-01');
  const WIDE_FROM = { x: -41.5, z: 42.3 };
  const outer = herd.map((animal, i) => (i >= 3 && i !== NEAR_WADERS.length && wading.includes(i) ? { animal, x: animal.plan.x, z: animal.plan.z } : null)).filter((o) => o !== null);

  return {
    setTime: (seconds) => {
      const at = stagedSeconds();
      const away = at >= shaft[0] && at <= shaft[1];
      const misted = at >= mist[0] && at <= mist[1];
      const nearRim = at >= rimView[0] && at <= rimView[1];
      rim.plan.x = away ? AWAY.x : misted ? MIST.x : nearRim ? RIM_NEAR.x : RIM_WADER.x;
      rim.plan.z = away ? AWAY.z : misted ? MIST.z : nearRim ? RIM_NEAR.z : RIM_WADER.z;
      rim.plan.heading = (misted ? MIST.heading : nearRim ? RIM_NEAR.heading : RIM_WADER.heading) * RAD;
      rim.plan.up = misted ? MIST_UP : rimUp;
      rim.plan.carry = misted ? 1 : rimCarry;
      const out = at >= wide[0] && at <= wide[1] ? 1.5 : 1;
      for (const o of outer) {
        o.animal.plan.x = WIDE_FROM.x + (o.x - WIDE_FROM.x) * out;
        o.animal.plan.z = WIDE_FROM.z + (o.z - WIDE_FROM.z) * out;
      }
      ripples.begin();
      drips.begin();
      herd.forEach((animal, i) => {
        const stood = animal.pose(seconds);
        if (wading.includes(i)) {
          const seed = animal.b.seed;
          stood.feet.forEach((foot, j) => {
            if (foot.wet < 0.02) return;
            // A leg that stands sends a faint ring as the animal shifts; one that has just come down or is drawn through the water sends strong ones.
            // Where the shank crosses the water's level the water is told of it: none while the foot is carried clear.
            const inWater = Math.min(1, Math.max(0, (SEA_LEVEL + 0.02 - foot.y) / 0.05));
            ripples.add(foot.x, foot.z, 1.5, 0.3 + 0.5 * foot.carried, foot.since, seed + j * 1.9, 26, 0.36, 0.034 * animal.b.k, inWater);
            // A foot that has just come down throws a crown of drops; each is where the time since it landed puts it.
            if (foot.since < 0.6) {
              for (let d = 0; d < 18; d++) {
                const turn = hash(seed + j * 3.1 + d * 1.7) * Math.PI * 2;
                const outward = 0.25 + 0.9 * hash(seed + j * 5.3 + d * 2.9);
                const upward = 0.9 + 1.7 * hash(seed + j * 7.7 + d * 0.61);
                const y = SEA_LEVEL + upward * foot.since - 4.9 * foot.since * foot.since;
                if (y > SEA_LEVEL) drips.add(foot.x + Math.cos(turn) * (0.03 + outward * foot.since), y, foot.z + Math.sin(turn) * (0.03 + outward * foot.since), 0.008 + 0.012 * Math.abs(upward - 9.8 * foot.since) * 0.5);
              }
            }
            // A foot carried through the air streams what it lifted.
            if (foot.lift > 0.04) {
              for (let d = 0; d < 6; d++) {
                const fall = (((seconds * 1.3 + hash(seed + j * 2.3 + d * 4.1)) % 1) + 1) % 1 * 0.3;
                const y = foot.y - 4.9 * fall * fall;
                if (y > SEA_LEVEL) drips.add(foot.x + 0.02 * (hash(seed + d * 9.1) - 0.5), y, foot.z + 0.02 * (hash(seed + d * 6.7) - 0.5), 0.01 + 9.8 * fall * 0.01);
              }
            }
          });
          const sea = SEA_LEVEL;
          if (stood.tuft.y < sea + 0.35 && footing(stood.tuft.x, stood.tuft.z) < sea) {
            // The tuft is worked through the water: the water round it is never still.
            ripples.add(stood.tuft.x, stood.tuft.z, 2.0, 0.75, 0.4, seed * 2.3, 21, 0.42, 0.2 * animal.b.k, Math.min(1, Math.max(0, (sea + 0.35 - stood.tuft.y) / 0.2)));
            // And it throws water: small drops in short arcs, a few at any moment, each where the time since it was thrown puts it.
            for (let d = 0; d < 26; d++) {
              const period = 0.3 + 0.45 * hash(seed + d * 4.7);
              const turn = seconds / period + hash(seed + d * 2.1);
              const n = Math.floor(turn);
              if (hash(seed + d * 1.9 + n * 6.3) > 0.55) continue;
              const since = (turn - n) * period;
              const way = hash(seed + d * 8.3 + n * 3.7) * Math.PI * 2;
              const outward = 0.15 + 0.7 * hash(seed + d * 5.9 + n * 1.3);
              const upward = 0.7 + 1.5 * hash(seed + d * 3.1 + n * 7.9);
              const from = 0.04 + 0.1 * hash(seed + d * 6.1 + n * 2.9);
              const y = sea + upward * since - 4.9 * since * since;
              if (y > sea) drips.add(stood.tuft.x + Math.cos(way) * (from + outward * since), y, stood.tuft.z + Math.sin(way) * (from + outward * since), 0.006 + 0.006 * Math.abs(upward - 9.8 * since));
            }
          } else if (stood.sinceLift < 9 && footing(stood.tuft.x, stood.tuft.z) < sea) {
            // Lifted: it streams, then drips, for some seconds. Every drop is where the time since the lift puts it.
            const pour = Math.exp(-stood.sinceLift / 3.2);
            const tips = stood.tips;
            const count = Math.min(DROPS, tips.length / 3);
            for (let d = 0; d < count; d++) {
              // Ten of the tips run in streams, a bead after a bead down one line; the rest drip singly.
              const stream = d % 10;
              const run = d < 80;
              const tipAt = run ? stream : d;
              const period = run ? 0.4 + 0.1 * hash(seed + stream * 7.7) : 0.22 + 0.26 * hash(seed + d * 7.7);
              const turn = (stood.sinceLift + (run ? (Math.floor(d / 10) / 8 + 0.03 * hash(seed + d * 1.3)) * period : 3 * hash(seed + d * 1.3))) / period;
              const tip = Math.floor(hash(seed + tipAt * 3.3) * (tips.length / 3)) * 3;
              const n = Math.floor(turn);
              if (hash(seed + d * 5.1 + n * 9.7) > 0.25 + 0.75 * pour) continue;
              const fall = (turn - n) * period;
              const x = tips[tip] as number;
              const z = tips[tip + 2] as number;
              const y = (tips[tip + 1] as number) - 4.9 * fall * fall;
              if (y > sea) drips.add(x, y, z, 0.012 + 9.8 * fall * (run ? 0.021 : 0.012));
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
        const wet = (stood.feet[0]!.wet + stood.feet[2]!.wet) / 2 > 0.02 ? 0.24 : 1;
        rig.setShadow(discs, slot * DISCS + 4, stood.body.x, stood.body.z, 0.55 * k, 2.6 * k, 0.8 * wet);
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
