// The dead of the thin crust: wallowers that broke through, sank to the belly and were caked over by the salt. And one that is still alive in it.
import * as THREE from 'three';
import { DEAD, STUCK, rel, relYaw } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { Animal, FEELERS, newDrive, type Drive } from '../wallowers/animal';
import { Hair } from '../wallowers/hair';
import { hideMaterial } from '../wallowers/material';
import { Skin } from '../wallowers/skin';
import { mudWallow } from './mud';

export const PARTS: readonly string[] = ['dead'];

const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function create(ctx: Context): Piece {
  const rng = ctx.rng('dead');
  const skin = new Skin();
  const bodies: { animal: Animal; drive: Drive; wet: number }[] = [];
  const nearest = DEAD.reduce((a, b) => (Math.hypot(a.d - STUCK[0], a.l - STUCK[1]) < Math.hypot(b.d - STUCK[0], b.l - STUCK[1]) ? a : b));
  for (const d of DEAD) {
    const p = rel(d.d, d.l);
    const k = 0.8 * d.size;
    skin.who = bodies.length;
    const animal = new Animal(skin, { k, young: 0, seed: rng.range(1, 60), bulk: rng.range(0.95, 1.15), salt: 1.6 });
    const drive = newDrive();
    drive.ox = p[0];
    drive.oz = p[1];
    // The one that lies nearest the live one is the furthest gone: it stands no higher than a knee, and the lens of the thin crust looks over it.
    const under = d === nearest ? 1 : 0;
    drive.oy = Math.min(0.1, ctx.rig.land.height(p[0], p[1])) - rng.range(0.34, 0.46) * k - under * 0.3 * k;
    drive.dir = [Math.cos(d.yaw), -Math.sin(d.yaw)];
    drive.squash = rng.range(0.66, 0.84) - under * 0.14;
    drive.cave = rng.range(0.35, 0.7);
    drive.roll = rng.range(-0.22, 0.22);
    drive.pitch = rng.range(-0.05, 0.1);
    drive.bend = rng.range(-0.12, 0.12);
    drive.headYaw = rng.range(-0.7, 0.7);
    drive.headPitch = rng.range(-0.25, 0.1);
    drive.splay = rng.range(0.5, 1.1);
    for (let f = 0; f < FEELERS; f++) drive.curl[f] = rng.range(0.3, 1.5);
    drive.shrunk = rng.range(0.38, 0.5);
    drive.feet.forEach((foot, l) => {
      const side = l < 2 ? -1 : 1;
      const fore = l % 2 === 1 ? 1 : -1;
      // The legs stand out from under the crust, shrunk to the bone and drawn up at the knee as the salt dried them, the feet still held by the mud.
      const out = d.limbs || rng.next() < 0.5 ? 1 : 0;
      const land = ctx.rig.land.height(p[0], p[1]) - drive.oy;
      foot[0] = (fore * 1.0 + rng.range(-0.3, 0.3)) * k + fore * out * rng.range(0.2, 0.7) * k;
      foot[1] = out ? land - 0.03 : rng.range(0.25, 0.4) * k;
      foot[2] = side * (out ? rng.range(1.25, 1.75) : rng.range(0.5, 0.7)) * k;
      drive.knee[l] = out ? rng.range(0.25, 0.6) * k : 0;
    });
    bodies.push({ animal, drive, wet: -10 });
  }
  // The live one: sunk to the shoulders, head up, working to get out and getting nowhere.
  const at = rel(STUCK[0], STUCK[1]);
  const yaw = relYaw(-0.97, -0.03);
  skin.who = bodies.length;
  const stuck = new Animal(skin, { k: 1, young: 0, seed: 23.7, bulk: 1, salt: -1 });
  const live = newDrive();
  const ground = Math.min(0.1, ctx.rig.land.height(at[0], at[1]));
  bodies.push({ animal: stuck, drive: live, wet: ground + 0.3 });

  const geometry = skin.build();
  for (const b of bodies) for (const t of [b.animal.body, ...b.animal.legs, ...b.animal.feelers]) for (let i = 0; i < t.rings; i++) skin.setWet(t, i, b.wet);
  const material = hideMaterial(ctx);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const mud = mudWallow(ctx, at[0], at[1], [Math.cos(yaw), -Math.sin(yaw)]);
  // The live one is matted: hair in wet ropes, salt dried on their ends. The dead are furred with crystal that has grown out of their crust.
  // TEMPORARY, until the anchors give it: where the lens of the stuck one stands. The dead it looks across carry all their crystals, the others a quarter (all at 2600 costs about 0.3 s a sample more at the wide key).
  const lens = rel(24.6, 19.6);
  const FROST_NEAR = 2400;
  const FROST_FAR = 600;
  const coat = new Hair(ctx, skin, [{ animal: stuck, locks: 320, length: 0.3, width: 0.008, wet: ground + 0.3, stand: 0, tint: 2.1, bare: 0, salt: 3 }], 'dead-coat');
  const frost = new Hair(
    ctx,
    skin,
    bodies.filter((b) => b.animal !== stuck).map((b) => ({ animal: b.animal, locks: Math.hypot(b.drive.ox - lens[0], b.drive.oz - lens[1]) < 9 ? FROST_NEAR : FROST_FAR, length: 0.05 * b.animal.b.k, width: 0.0045, wet: -10, stand: 1.2, tint: 5.2, bare: 0, fall: 0.05 })),
    'dead-frost',
  );
  // Round each dead one the crust is stained dark: what ran out of it, and the mud it sank into.
  const stains = bodies
    .filter((b) => b.animal !== stuck)
    .map((b, i) => mudWallow(ctx, b.drive.ox, b.drive.oz, b.drive.dir, 0.72 * b.animal.b.k, [0.03, 0.019, 0.015], 'dead-stain-' + i));
  ctx.scene.add(ctx.parts.built('dead', mesh, mud.mesh, coat.mesh, frost.mesh, ...stains.map((w) => w.mesh)), mud.mesh, coat.mesh, frost.mesh, ...stains.map((w) => w.mesh));

  const discs = ctx.rig.contactDiscs(bodies.length);
  bodies.forEach((b, i) => {
    if (b.animal === stuck) return;
    const stood = b.animal.pose(b.drive);
    ctx.rig.setDisc(discs, i, stood.x, stood.z, 1.5 * b.animal.b.k, 0.75, 1.8, stood.yaw);
  });
  // The dead do not move: their crystals are stood on them once.
  frost.touch();

  return {
    setTime: (seconds) => {
      // A heave every few seconds: it gathers, strains up and forward, holds, and sinks back to where it was.
      const period = 5.2;
      const c = seconds / period + 0.3;
      const u = c - Math.floor(c);
      const heave = smooth(0.08, 0.34, u) * (1 - smooth(0.42, 0.9, u));
      const tremble = heave * 0.012 * Math.sin(seconds * 23);
      live.ox = at[0];
      live.oz = at[1];
      live.oy = ground - 1.56 + 0.12 * heave + tremble;
      live.dir = [Math.cos(yaw), -Math.sin(yaw)];
      live.surge = 0.1 * heave;
      live.pitch = -0.5 - 0.06 * heave;
      live.roll = 0.05 * Math.sin(seconds * 0.9) + 0.05 * heave * Math.sin(seconds * 2.7);
      live.shift = 0.04 * Math.sin(seconds * 0.9 - 0.6);
      live.bend = 0.04 * Math.sin(seconds * 0.6);
      live.headPitch = -0.5 - 0.14 * heave + 0.05 * Math.sin(seconds * 1.7);
      live.headYaw = 0.3 * Math.sin(seconds * 0.43) + 0.1 * Math.sin(seconds * 1.1);
      live.breath = Math.sin(seconds * 2.4);
      live.sway = 0;
      live.squash = 1;
      live.splay = 0.2 + 0.25 * heave;
      live.floor = ground + 0.1;
      for (let f = 0; f < FEELERS; f++) live.curl[f] = 0.85 + 0.3 * Math.sin(seconds * (1.3 + 0.37 * f) + f * 2.1) + 0.35 * heave;
      // The feet are held by the mud: they stay where they are while the trunk strains above them.
      live.feet.forEach((foot, l) => {
        const side = l < 2 ? -1 : 1;
        const fore = l % 2 === 1 ? 1 : -1;
        foot[0] = (fore > 0 ? 0.78 : -1.22) + 0.05;
        foot[1] = 0;
        foot[2] = side * 0.68;
      });
      const stood = stuck.pose(live);
      ctx.rig.setDisc(discs, bodies.length - 1, stood.x, stood.z, 1.7, 0.8, 1.7, stood.yaw);
      mud.set(heave, seconds);
      skin.touch();
      coat.touch();
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      mud.dispose();
      coat.dispose();
      for (const w of stains) w.dispose();
      frost.dispose();
    },
  };
}
