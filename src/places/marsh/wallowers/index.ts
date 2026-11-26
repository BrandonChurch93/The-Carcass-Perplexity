// The mud-wallowers: heavy eyeless animals that root in the red brine of the vein with a fringe of tusk-like feelers.
import { BEASTS, F, R, WALLOW_TIME, bearingDir, keyTime, rel } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { newDrive, walk, type Build, type Plan } from './animal';
import { Beast } from './body';
import { mudWallow } from '../dead/mud';
import { Wet } from './wet';

export const PARTS: readonly string[] = ['wallowers'];

const DISCS = 5;
/** The size of a cell of the skin's grid, metres at size 1: the three by the lens of the wallowers, and the rest. */
const CELL_NEAR = 0.024;
const CELL_FAR = 0.05;

export function create(ctx: Context): Piece {
  const rng = ctx.rng('wallowers');
  const herd: { beast: Beast; plan: Plan; onBank: boolean; floor: number; paw: number }[] = [];
  // TEMPORARY, until the anchors give it: where the lens of the wallowers stands.
  const lens = rel(27.7, 3);
  // When each has its head up. The first three are the ones by the lens of the wallowers: heads down in the mud at its key, as in the approved picture, and up before and after it.
  const LOOKS = [10.4, 13.1, 11.3];
  const add = (x: number, z: number, when: number, dir: [number, number], size: number, sink: number, speed: number, root: number): void => {
    const young = size < 0.7 ? 1 - (size - 0.34) / 0.5 : 0;
    const b: Build = { k: size, young: Math.max(0, Math.min(1, young)), seed: rng.range(1, 60), bulk: rng.range(0.94, 1.08), salt: rng.range(0.5, 1) * (sink > 0.5 ? 0.3 : 1) };
    // The slower it goes the longer its cycle: a walk of about one length of the trunk in three cycles, and never two alike.
    const cycle = rng.range(3.4, 4.6) * (0.75 + 0.25 * size);
    // One that wades stands on the bed it has trodden down; one on a bank stands on the bank.
    const land = ctx.rig.land.height(x, z);
    const ground = sink > 0.15 ? Math.min(land, 0) - sink * b.k : Math.min(Math.max(land, -0.25), ctx.rig.land.shore(x, z) < 0.3 ? -0.14 : 1) - 0.02;
    // A young one keeps to the shallows: its legs are too short for the bed.
    // One on a bank has sunk into it to the ankle and further: the mud is soft.
    const stand = (size < 0.5 ? Math.max(ground, -0.07) : ground) - (sink > 0.15 ? 0 : (size < 0.5 ? 0.1 : 0.2) * b.k);
    // The head hangs to the mud that is under it, or to the top of the brine.
    const under = Math.max(ctx.rig.land.height(x + dir[0] * 2.3 * b.k, z + dir[1] * 2.3 * b.k), -0.1) - stand + 0.6 * b.k;
    const hang = Math.min(0.4, Math.asin(Math.max(-0.9, Math.min(0.9, (1.2 * b.k - under) / (1.507 * b.k)))) - 0.446);
    const near = herd.length < 3;
    const wet = sink > 0.5 ? rng.range(1.0, 1.4) * b.k : Math.max(0.6 * b.k, stand + 1.2 * b.k) * rng.range(0.9, 1.1);
    herd.push({
      beast: new Beast(ctx, b, { cell: near ? CELL_NEAR : CELL_FAR, wet, relief: near ? 0.012 : 0 }),
      plan: { at: [x, z], when, dir, speed, ground: stand, cycle, phase: rng.next(), root: Math.min(1, root * 12), hang, look: LOOKS[herd.length] ?? 1.7 + herd.length * 2.9 },
      onBank: sink <= 0.15,
      floor: sink <= 0.15 ? ctx.rig.land.height(x + dir[0] * 2.3 * b.k, z + dir[1] * 2.3 * b.k) + 0.03 : -1e9,
      paw: herd.length === 2 ? ((lens[0] - x) * -dir[1] + (lens[1] - z) * dir[0] > 0 ? 3 : 1) : -1,
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

  const wet = new Wet(ctx, herd.length);
  // Where one roots on a bank it has trodden the crust into red mud and pushed it up round its legs.
  const wallows = herd
    .filter((h) => h.onBank)
    .map((h, i) => mudWallow(ctx, h.plan.at[0] + h.plan.dir[0] * 0.5 * h.beast.b.k, h.plan.at[1] + h.plan.dir[1] * 0.5 * h.beast.b.k, h.plan.dir, 1.05 * h.beast.b.k, [0.075, 0.034, 0.025], 'wallowers-mud-' + i, 1));
  const meshes = [...herd.flatMap((h) => [h.beast.mesh, h.beast.feelers]), wet.mesh, ...wallows.map((w) => w.mesh)];
  ctx.parts.built('wallowers', ...(meshes as [(typeof meshes)[number], ...typeof meshes]));
  for (const mesh of meshes) ctx.scene.add(mesh);

  const discs = ctx.rig.contactDiscs(herd.length * DISCS);
  const drive = newDrive();

  return {
    setTime: (seconds) => {
      herd.forEach((h, i) => {
        const driven = walk(h.plan, h.beast.b, seconds, drive);
        driven.floor = h.floor;
        if (h.paw >= 0) {
          // STAGED for the lens of the wallowers: the one that lies in the brine before it rests a forefoot on the top of it and paddles.
          const foot = driven.feet[h.paw] as [number, number, number];
          foot[0] += (0.62 + 0.08 * Math.sin(seconds * 0.9)) * h.beast.b.k;
          foot[1] = -h.plan.ground - (0.1 + 0.03 * Math.sin(seconds * 0.9 + 1.2)) * h.beast.b.k;
          foot[2] *= 1.25;
        }
        const stood = h.beast.pose(driven, seconds);
        const k = h.beast.b.k;
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
      wet.touch();
    },
    dispose: () => {
      for (const h of herd) h.beast.dispose();
      wet.dispose();
      for (const w of wallows) w.dispose();
    },
  };
}
