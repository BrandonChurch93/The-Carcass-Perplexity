// The mud-wallowers: heavy eyeless animals that root in the red brine of the vein with a fringe of tusk-like feelers.
import { BEASTS, F, K1_AT, K1_DIR, R, T0, UNIT, WALLOW_TIME, bearingDir, keyTime, rel } from '../shared/anchors';
import { secondsInPlace, shotsOf } from '../../../film/cut';
import { stagedSeconds } from '../shared/stage';
import type { Context, Piece } from '../shared/context';
import { great, lying, trod, young } from './act';
import { newDrive, type Build, type Plan } from './animal';
import { Beast } from './body';
import { mudWallow } from '../dead/mud';
import { Mire } from './mire';
import { roam } from './roam';
import { Tread } from './tread';
import { Wet } from './wet';

export const PARTS: readonly string[] = ['wallowers'];

const DISCS = 5;
/** The size of a cell of the skin's grid, metres at size 1: the three by the lens of the wallowers, and the rest. */
const CELL_NEAR = 0.03;
const CELL_FAR = 0.065;
// STAGED by shot: the four that lie and wade in the vein to the right of the lens of the wallowers are off the set for its shot. The approved picture has one animal behind the three, far and soft, and these two stood large and cropped at its edge.
const WALLOW_SHOT = shotsOf(UNIT).find((s) => s.id === 'marsh-04');
const WALLOW_SPAN: [number, number] = WALLOW_SHOT ? [secondsInPlace(UNIT, WALLOW_SHOT.first) - 0.004, secondsInPlace(UNIT, WALLOW_SHOT.last) + 0.004] : [0, -1];
const OFF_SET = [6, 7, 8, 9];
// STAGED by shot: in the shot of the seep the ones that stand within 17 m of it are off the set, where one stood large and pale on its far bank,
// and one small one wades far behind its mist, as the approved picture has it. That one is on the set for that shot only.
const SEEP_SHOT = shotsOf(UNIT).find((s) => s.id === 'marsh-03');
const SEEP_SPAN: [number, number] = SEEP_SHOT ? [secondsInPlace(UNIT, SEEP_SHOT.first) - 0.004, secondsInPlace(UNIT, SEEP_SHOT.last) + 0.004] : [0, -1];

export function create(ctx: Context): Piece {
  const rng = ctx.rng('wallowers');
  const herd: { beast: Beast; plan: Plan; onBank: boolean; sunk: boolean; floor: number; paw: number }[] = [];
  // TEMPORARY, until the anchors give it: where the lens of the wallowers stands.
  const lens = rel(27.7, 3);
  // When each has its head up. The first three are the ones by the lens of the wallowers: heads down in the mud at its key, as in the approved picture, and up before and after it.
  const LOOKS = [10.4, 13.1, 11.3];
  const add = (x: number, z: number, when: number, dir: [number, number], size: number, sink: number, speed: number, root: number): void => {
    const young = size < 0.7 ? 1 - (size - 0.34) / 0.5 : 0;
    const b: Build = { k: size, young: Math.max(0, Math.min(1, young)), seed: rng.range(1, 60), bulk: rng.range(0.94, 1.08), salt: rng.range(0.5, 1) * (sink > 0.5 ? 0.3 : 1) };
    // The slower it goes the longer its cycle: a walk of about one length of the trunk in three cycles, and never two alike.
    const cycle = rng.range(3.4, 4.6) * (0.75 + 0.25 * size) * (speed > 0.24 ? 0.72 : 1);
    // One that wades stands on the bed it has trodden down; one on a bank stands on the bank.
    const land = ctx.rig.land.height(x, z);
    const ground = sink > 0.15 ? Math.min(land, 0) - sink * b.k : Math.min(Math.max(land, -0.25), ctx.rig.land.shore(x, z) < 0.3 ? -0.14 : 1) - 0.02;
    // A young one keeps to the shallows: its legs are too short for the bed.
    // One on a bank has sunk into it to the ankle and further: the mud is soft.
    const sunkIn = (size < 0.5 ? Math.max(ground, -0.07) : ground) - (sink > 0.15 ? 0 : (size < 0.5 ? 0.1 : 0.12) * b.k);
    // In shallows it goes in no deeper than the ankle.
    // STAGED for the lens of the wallowers: the great one stands in the mud of the bank to the shins, its belly clear of it.
    const hero = herd.length === 0;
    const stand = (sink > 0.15 ? sunkIn : Math.max(sunkIn, land - 0.1)) - (hero ? 0.05 * b.k : 0);
    // The head hangs to the mud that is under it, or to the top of the brine.
    const under = Math.max(ctx.rig.land.height(x + dir[0] * 2.3 * b.k, z + dir[1] * 2.3 * b.k), -0.1) - stand + (hero ? 1.3 : herd.length === 1 ? 0.85 : 0.6) * b.k - 0.06 * b.k;
    const hang = Math.min(0.4, Math.asin(Math.max(-0.9, Math.min(0.9, (1.16 * b.k - under) / (1.42 * b.k)))) - 0.785);
    const near = herd.length < 3;
    // The one by the lens of the wallowers has rolled and is wet all over; the rest that lie in the brine have dried down to a hand above it.
    const wet = sink > 0.5 ? (herd.length === 2 ? rng.range(1.0, 1.4) : 0.4 * rng.range(1.0, 1.4) - 0.05) * b.k : Math.max(0.5 * b.k, stand + 0.85 * b.k) * rng.range(0.9, 1.1);
    herd.push({
      // The one that lies in the brine before the lens of the wallowers is wet all over its back: skin, with the mud of the brine low on it.
      beast: new Beast(ctx, b, { cell: near ? CELL_NEAR : CELL_FAR, wet, relief: near ? 0.012 : 0, reach: hero ? 1.6 : near ? 1.3 : 1, ...(hero ? { droop: 2.1 } : herd.length === 1 ? { droop: 1.8 } : {}), ...(near ? { coat: (herd.length === 2 ? [1.45, 9, 0, 0] : [0.84, 1.95, 0, 0]) as [number, number, number, number], tendrils: 10, hang: 0, ...(herd.length === 2 ? { tint: 0.4 } : {}), thick: hero ? 5.2 : herd.length === 2 ? 3.4 : 5.0, long: hero ? 0.72 : herd.length === 1 ? 0.7 : 0.8 } : {}) }),
      plan: { at: [x, z], when, dir, speed, ground: stand, cycle, phase: rng.next(), root: Math.min(1, root * 12), hang, look: LOOKS[herd.length] ?? 1.7 + herd.length * 2.9 },
      onBank: sink <= 0.15,
      sunk: sink > 0.75,
      floor: sink <= 0.15 ? Math.max(ctx.rig.land.height(x + dir[0] * 2.3 * b.k, z + dir[1] * 2.3 * b.k), 0) + 0.03 : -1e9,
      paw: herd.length === 2 ? ((lens[0] - x) * -dir[1] + (lens[1] - z) * dir[0] > 0 ? 3 : 1) : -1,
    });
  };
  for (const b of BEASTS) {
    const n = Math.hypot(b.head[0], b.head[1]);
    const hd = b.head[0] / n;
    const hl = b.head[1] / n;
    // STAGED for the lens of the wallowers: the young one stands on the bank a stride behind where the anchors have it, whole in that frame beside the great one's rump,
    // and the one behind the three is five metres further off and to the right, small and in the haze, as the approved picture has them.
    const p = herd.length === 1 ? rel(34.25, 5.5) : herd.length === 3 ? rel(49, 9.5) : rel(b.d, b.l);
    // TEMPORARY, until the lead sets it in the anchors: the ones that wade nearest the lens of the wide key stand larger in it than anything in the approved picture.
    // STAGED for the lens of the wallowers: the great one is a tenth smaller than the anchors have it, and fills as much of that frame as the approved picture gives it.
    const size = b.d < 26 ? b.size * 0.6 : herd.length === 0 ? b.size * 0.9 : b.size;
    // STAGED for the wide key: the two that lie in the brine nearest its lens lie across its view, as the approved picture has them, and not tail on.
    const dir: [number, number] = b.d < 26 ? [0.25 * F[0] - 0.97 * R[0], 0.25 * F[1] - 0.97 * R[1]] : [F[0] * hd + R[0] * hl, F[1] * hd + R[1] * hl];
    // STAGED by distance: the ones that wade away from the lens of the wallowers go at a walk that is seen from far off, and are where the anchors put them half way between the wide key and the key of the wallowers.
    // The one behind the three is where the anchors put it at the key of the wallowers: far and to the right of the young one, as the approved picture has it.
    const far = herd.length > 3 && b.sink < 0.75;
    add(p[0], p[1], far ? 0.5 * (T0 + WALLOW_TIME) : WALLOW_TIME, dir, size, b.sink, far ? b.speed * 1.5 + 0.06 : b.speed, b.root);
  }
  // STAGED for the lens of the colony: one wades the far shallows of the pool, side on, right of the middle of that view.
  const bank = bearingDir(37);
  const bl = Math.hypot(1, 0.12);
  add(bank[0] * 11.5, bank[1] * 11.5, keyTime('marsh-2'), [-1 / bl, -0.12 / bl], 0.74, 0.12, 0.2, 0.05);
  // It wades: the brine is over its knees and its belly is just clear of it.
  (herd[herd.length - 1] as (typeof herd)[number]).plan.ground = -0.15;
  // STAGED for the lens of the seep: the small one far behind its mist, side on.
  // The colony's wader stands in that view too, large and close: it is off the set for that shot with the ones near the seep.
  const bySeep = herd.map((h, i) => i === herd.length - 1 || Math.hypot(h.plan.at[0] - K1_AT[0], h.plan.at[1] - K1_AT[1]) < 17);
  add(K1_AT[0] + K1_DIR[0] * 33 - K1_DIR[1] * 5.6, K1_AT[1] + K1_DIR[1] * 33 + K1_DIR[0] * 5.6, keyTime('marsh-1'), [K1_DIR[1], -K1_DIR[0]], 0.6, 0.3, 0.16, 0.05);
  const seepWader = herd.length - 1;

  // The two that lay in the channel nearest the lens of the wide key are off the set: that near they did not hold as animals, and nothing that cannot is kept close.
  const tooNear = herd.map((_, i) => i < BEASTS.length && (BEASTS[i] as (typeof BEASTS)[number]).d < 26);
  const wet = new Wet(ctx, herd.length);
  const tread = new Tread(ctx, 2);
  // Where one roots on a bank it has trodden the crust into red mud and pushed it up round its legs.
  const wallows = herd
    .filter((h) => h.onBank && ctx.rig.land.shore(h.plan.at[0], h.plan.at[1]) > -0.02)
    .map((h, i) => mudWallow(ctx, h.plan.at[0] + h.plan.dir[0] * 0.5 * h.beast.b.k, h.plan.at[1] + h.plan.dir[1] * 0.5 * h.beast.b.k, h.plan.dir, 1.05 * h.beast.b.k, [0.08, 0.052, 0.042], 'wallowers-mud-' + i, 1));
  // The great one and the young one stand in the wallow they have trodden: liquid mud to the shin (mire.ts), level, over the bed of churned mud.
  const great0 = herd[0] as (typeof herd)[number];
  const young0 = herd[1] as (typeof herd)[number];
  const mireLevel = great0.plan.ground + 0.26 * great0.beast.b.k;
  const mire = new Mire(ctx, great0.plan.at[0] - great0.plan.dir[0] * 0.2, great0.plan.at[1] - great0.plan.dir[1] * 0.2, great0.plan.dir, 4.4, 2.0, mireLevel);
  // The young one stands in the same sheet, where it is shallow, to its own shin.
  young0.plan.ground = Math.max(mireLevel, ctx.rig.land.height(young0.plan.at[0], young0.plan.at[1]) + 0.025) - 0.2 * young0.beast.b.k;
  // Their feelers rake the top of it.
  great0.floor = mireLevel - 0.02;
  young0.floor = Math.max(mireLevel, ctx.rig.land.height(young0.plan.at[0], young0.plan.at[1]) + 0.025) - 0.01;
  const meshes = [...herd.flatMap((h) => [h.beast.mesh, h.beast.feelers]), wet.mesh, ...wallows.map((w) => w.mesh), tread.mesh, mire.mesh];
  ctx.parts.built('wallowers', ...(meshes as [(typeof meshes)[number], ...typeof meshes]));
  for (const mesh of meshes) ctx.scene.add(mesh);

  const discs = ctx.rig.contactDiscs(herd.length * DISCS);
  const drive = newDrive();
  // STAGED for the shot of the wallowers: the three by its lens are acted (act.ts) while the camera stands in that shot, and walk with the herd in every other.
  // +1 where `to` lies to the left of the animal, -1 to its right.
  const leftOf = (h: (typeof herd)[number], to: [number, number]): number => ((to[0] - h.plan.at[0]) * -h.plan.dir[1] + (to[1] - h.plan.at[1]) * h.plan.dir[0] < 0 ? 1 : -1);
  const cast = herd.slice(0, 3).map((h) => leftOf(h, lens));
  const toGreat = herd.length > 1 ? leftOf(herd[1] as (typeof herd)[number], (herd[0] as (typeof herd)[number]).plan.at) : 1;

  return {
    setTime: (seconds) => {
      const staged = stagedSeconds();
      const cleared = staged >= WALLOW_SPAN[0] && staged <= WALLOW_SPAN[1];
      const seep = staged >= SEEP_SPAN[0] && staged <= SEEP_SPAN[1];
      herd.forEach((h, i) => {
        const on = !(cleared && OFF_SET.includes(i)) && !(seep && bySeep[i]) && (i !== seepWader || seep) && !tooNear[i];
        h.beast.mesh.visible = on;
        h.beast.feelers.visible = on;
        const acted = cleared && i < 3;
        const t = seconds - WALLOW_TIME;
        // The one Drive serves them all in turn: what only an acted one sets is put back for the rest.
        drive.acted = 0;
        drive.under = 0;
        if (acted && i === 0) great(h.plan, h.beast.b, seconds, t, cast[0] as number, drive);
        else if (acted && i === 1) young(h.plan, h.beast.b, seconds, t, toGreat, drive);
        else if (acted) lying(h.plan, h.beast.b, seconds, t, cast[2] as number, drive);
        const driven = acted ? drive : roam(h.plan, h.beast.b, seconds, h.sunk, drive);
        driven.floor = h.floor;
        // STAGED for the lens of the wallowers: the great one's feelers are turned down and spread into the mud like the fingers of a hand, as the approved picture has them.
        if (i === 0) driven.splay += 0.3;
        // One that lies in the brine lies nose down: the back stands out of it and falls away to the head.
        if (h.sunk && h.paw < 0) {
          // It wallows: it rolls a little to one side and the other, comes up as it fills its chest and settles as it empties it.
          const seed = h.beast.b.seed;
          driven.pitch += 0.11 + 0.035 * Math.sin(seconds * 1.3 + seed * 3);
          driven.headPitch += 0.25;
          driven.roll += 0.09 * Math.sin(seconds * 1.05 + seed * 7) + 0.04 * Math.sin(seconds * 2.3 + seed);
          driven.bob += h.beast.b.k * (0.045 * Math.sin(seconds * 1.6 + seed * 9) + 0.02 * Math.sin(seconds * 2.9 + seed * 2));
        }
        if (h.paw >= 0 && !acted) {
          // STAGED for the lens of the wallowers: the one that lies in the brine before it.
          // It is a low wet hump: it rolls and breathes, and holds its head at the top of the brine, the feelers spread on it.
          const seed = h.beast.b.seed;
          driven.roll += 0.07 * Math.sin(seconds * 1.05 + seed * 7) + 0.03 * Math.sin(seconds * 2.3 + seed);
          driven.bob += h.beast.b.k * (0.04 * Math.sin(seconds * 1.6 + seed * 9) + 0.02 * Math.sin(seconds * 2.9 + seed * 2));
          driven.pitch += 0.02;
          driven.headPitch -= 0.1 + 0.06 * Math.sin(seconds * 1.4 + seed);
          driven.splay += 0.25;
        }
        const stood = h.beast.pose(driven, seconds);
        const k = h.beast.b.k;
        for (let j = 0; j < 4; j++) {
          const foot = stood.feet[j] as (typeof stood.feet)[number];
          const off = Math.min(1, foot.lift / (0.2 * k));
          // A foot that stands in the brine throws no shade on it: the ring it makes is its contact.
          const dry = ctx.rig.land.shore(foot.x, foot.z) > 0.05 ? 1 : 0;
          ctx.rig.setDisc(discs, i * DISCS + j, foot.x, foot.z, 0.55 * k * (1 + 0.6 * off), on ? 0.85 * (1 - 0.7 * off) * dry : 0);
        }
        ctx.rig.setDisc(discs, i * DISCS + 4, stood.x, stood.z, 1.5 * k, on ? (ctx.rig.land.shore(stood.x, stood.z) > 0.05 ? 0.6 : 0.3) : 0, 1.9, stood.yaw);
        wet.set(i, stood, k, seconds, on ? 1 : 0, i > 2);
        if (i < 2) {
          for (let j = 0; j < 4; j++) {
            const foot = stood.feet[j] as (typeof stood.feet)[number];
            mire.leg(i * 4 + j, foot.x, foot.z, on ? foot.lift / (0.12 * k) : 0, 0.15 * k);
          }
          mire.snout(i, stood.muzzle.x, stood.muzzle.z, on ? (mireLevel + 0.1 * k - stood.muzzle.y) / (0.12 * k) : 0, 0.2 * k);
          if (acted) tread.set(i, h.plan, h.beast.b, (trod[i] as (typeof trod)[number]).s, (trod[i] as (typeof trod)[number]).pace, on ? 1 : 0);
          else tread.hide(i);
        }
      });
      mire.set(seconds, 1);
      wet.touch();
      tread.touch();
    },
    dispose: () => {
      for (const h of herd) h.beast.dispose();
      wet.dispose();
      tread.dispose();
      mire.dispose();
      for (const w of wallows) w.dispose();
    },
  };
}
