// The mud-wallowers: heavy eyeless animals that root in the red brine of the vein with a fringe of tusk-like feelers.
import * as THREE from 'three';
import { BEASTS, F, R, WALLOW_TIME, bearingDir, keyTime, rel } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { Animal, newDrive, walk, type Build, type Plan } from './animal';
import { hideMaterial } from './material';
import { Skin } from './skin';
import { Wet } from './wet';

export const PARTS: readonly string[] = ['wallowers'];

const DISCS = 5;

export function create(ctx: Context): Piece {
  const rng = ctx.rng('wallowers');
  const skin = new Skin();
  const herd: { animal: Animal; plan: Plan; wet: number }[] = [];
  const add = (x: number, z: number, when: number, dir: [number, number], size: number, sink: number, speed: number, root: number): void => {
    const young = size < 0.7 ? 1 - (size - 0.34) / 0.5 : 0;
    const b: Build = { k: size, young: Math.max(0, Math.min(1, young)), seed: rng.range(1, 60), bulk: rng.range(0.94, 1.08), salt: rng.range(0.7, 1) };
    skin.who = herd.length;
    const animal = new Animal(skin, b);
    // The slower it goes the longer its cycle: a walk of about one length of the trunk in three cycles, and never two alike.
    const cycle = rng.range(3.4, 4.6) * (0.75 + 0.25 * size);
    // One that wades stands on the bed it has trodden down; one on a bank stands on the bank.
    const land = ctx.rig.land.height(x, z);
    const ground = sink > 0.15 ? Math.min(land, 0) - sink * b.k : Math.min(Math.max(land, -0.25), ctx.rig.land.shore(x, z) < 0.3 ? -0.14 : 1) - 0.02;
    herd.push({
      animal,
      plan: { at: [x, z], when, dir, speed, ground, cycle, phase: rng.next(), root: Math.min(1, root * 12), hang: Math.asin(Math.max(-0.9, Math.min(0.9, (1.0 - Math.max(0.25, sink + 0.14)) / 1.496))) - 0.517 },
      wet: Math.max(0.5 * b.k, ground + 1.12 * b.k) * rng.range(0.85, 1.1),
    });
  };
  for (const b of BEASTS) {
    const n = Math.hypot(b.head[0], b.head[1]);
    const hd = b.head[0] / n;
    const hl = b.head[1] / n;
    const p = rel(b.d, b.l);
    add(p[0], p[1], WALLOW_TIME, [F[0] * hd + R[0] * hl, F[1] * hd + R[1] * hl], b.size, b.sink, b.speed, b.root);
  }
  // The one on the bank of the pool, seen through the stalks.
  const bank = bearingDir(37);
  const bl = Math.hypot(1, 0.12);
  add(bank[0] * 13.8, bank[1] * 13.8, keyTime('marsh-2'), [-1 / bl, -0.12 / bl], 1, 0.12, 0.2, 0.05);

  const geometry = skin.build();
  for (const h of herd) {
    const a = h.animal;
    for (const t of [a.body, ...a.legs, ...a.feelers]) for (let i = 0; i < t.rings; i++) skin.setWet(t, i, h.wet);
  }
  const material = hideMaterial(ctx);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const wet = new Wet(ctx, herd.length);
  ctx.scene.add(ctx.parts.built('wallowers', mesh, wet.mesh), wet.mesh);

  const discs = ctx.rig.contactDiscs(herd.length * DISCS);
  const drive = newDrive();

  return {
    setTime: (seconds) => {
      (material.uniforms.uSeconds as THREE.IUniform<number>).value = seconds;
      herd.forEach((h, i) => {
        const stood = h.animal.pose(walk(h.plan, h.animal.b, seconds, drive));
        const k = h.animal.b.k;
        for (let j = 0; j < 4; j++) {
          const foot = stood.feet[j] as (typeof stood.feet)[number];
          const off = Math.min(1, foot.lift / (0.2 * k));
          ctx.rig.setDisc(discs, i * DISCS + j, foot.x, foot.z, 0.55 * k * (1 + 0.6 * off), 0.85 * (1 - 0.7 * off));
        }
        ctx.rig.setDisc(discs, i * DISCS + 4, stood.x, stood.z, 1.5 * k, 0.6, 1.9, stood.yaw);
        wet.set(i, stood, k, seconds);
      });
      skin.touch();
      wet.touch();
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      wet.dispose();
    },
  };
}
