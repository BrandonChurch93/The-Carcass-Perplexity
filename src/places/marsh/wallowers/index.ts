// The mud-wallowers: heavy eyeless animals that root in the red brine of the vein with a fringe of tusk-like feelers.
import * as THREE from 'three';
import { BEASTS, F, R, WALLOW_TIME, bearingDir, keyTime, rel } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { Animal, newDrive, walk, type Build, type Plan } from './animal';
import { Hair } from './hair';
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
    const b: Build = { k: size, young: Math.max(0, Math.min(1, young)), seed: rng.range(1, 60), bulk: rng.range(0.94, 1.08), salt: rng.range(0.35, 0.6) * (sink > 0.5 ? 0.3 : 1) };
    skin.who = herd.length;
    const animal = new Animal(skin, b);
    // The slower it goes the longer its cycle: a walk of about one length of the trunk in three cycles, and never two alike.
    const cycle = rng.range(3.4, 4.6) * (0.75 + 0.25 * size);
    // One that wades stands on the bed it has trodden down; one on a bank stands on the bank.
    const land = ctx.rig.land.height(x, z);
    const ground = sink > 0.15 ? Math.min(land, 0) - sink * b.k : Math.min(Math.max(land, -0.25), ctx.rig.land.shore(x, z) < 0.3 ? -0.14 : 1) - 0.02;
    // A young one keeps to the shallows: its legs are too short for the bed.
    const stand = size < 0.5 ? Math.max(ground, -0.07) : ground;
    // The head hangs to the mud that is under it, or to the top of the brine.
    const under = Math.max(ctx.rig.land.height(x + dir[0] * 2.3 * b.k, z + dir[1] * 2.3 * b.k), -0.1) - stand + 0.36 * b.k;
    const hang = Math.asin(Math.max(-0.9, Math.min(0.9, (1.2 * b.k - under) / (1.507 * b.k)))) - 0.446;
    herd.push({
      animal,
      plan: { at: [x, z], when, dir, speed, ground: stand, cycle, phase: rng.next(), root: Math.min(1, root * 12), hang },
      wet: sink > 0.5 ? rng.range(0.75, 1.05) * b.k : Math.max(0.5 * b.k, stand + 1.04 * b.k) * rng.range(0.85, 1.1),
    });
  };
  for (const b of BEASTS) {
    const n = Math.hypot(b.head[0], b.head[1]);
    const hd = b.head[0] / n;
    const hl = b.head[1] / n;
    const p = rel(b.d, b.l);
    // TEMPORARY, until the lead sets it in the anchors: the ones that wade nearest the lens of the wide key stand larger in it than anything in the approved picture.
    const size = b.d < 26 ? b.size * 0.6 : b.size;
    add(p[0], p[1], WALLOW_TIME, [F[0] * hd + R[0] * hl, F[1] * hd + R[1] * hl], size, b.sink, b.speed, b.root);
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
  // The one the lens of the wallowers stands by has the fullest coat.
  const hair = new Hair(
    ctx,
    skin,
    herd.map((h, i) => {
      const k = 0.5 + 0.5 * h.animal.b.k;
      // The one the lens stands by is nearly bald, with what hair it has hanging wet from the flank; the one sunk to the back by it is the shaggiest; the young has down.
      if (i === 0) return { animal: h.animal, locks: 420, length: 0.15, width: 0.002, wet: h.wet, stand: 0, tint: 1.0, bare: 1 };
      if (i === 1) return { animal: h.animal, locks: 300, length: 0.05, width: 0.0016, wet: h.wet, stand: 0.1, tint: 1.3, bare: 0.3 };
      if (i === 2) return { animal: h.animal, locks: 1700, length: 0.26, width: 0.003, wet: h.wet, stand: 0, tint: 2.6, bare: 0 };
      return { animal: h.animal, locks: 600, length: 0.2 * k, width: 0.008 * k, wet: h.wet, stand: 0.1, tint: 1.5, bare: rng.next() < 0.4 ? 0.7 : 0 };
    }),
    'wallowers-hair',
  );
  ctx.scene.add(ctx.parts.built('wallowers', mesh, wet.mesh, hair.mesh), wet.mesh, hair.mesh);

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
          // A foot that stands in the brine throws no shade on it: the ring it makes is its contact.
          const dry = ctx.rig.land.shore(foot.x, foot.z) > 0.05 ? 1 : 0;
          ctx.rig.setDisc(discs, i * DISCS + j, foot.x, foot.z, 0.55 * k * (1 + 0.6 * off), 0.85 * (1 - 0.7 * off) * dry);
        }
        ctx.rig.setDisc(discs, i * DISCS + 4, stood.x, stood.z, 1.5 * k, ctx.rig.land.shore(stood.x, stood.z) > 0.05 ? 0.6 : 0.3, 1.9, stood.yaw);
        wet.set(i, stood, k, seconds);
      });
      skin.touch();
      wet.touch();
      hair.touch();
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      wet.dispose();
      hair.dispose();
    },
  };
}
