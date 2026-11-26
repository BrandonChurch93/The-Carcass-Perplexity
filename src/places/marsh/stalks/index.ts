// The stalk colonies: salt-crusted tubes with crimson plumes round the seep pools, and the small winged insects that live in them.
import * as THREE from 'three';
import { EYE, F as AHEAD, R as ASIDE, K1_AT, K2_AT, K2_DIR, K2_RIGHT, STUCK, TAU, UNIT, distToSegment, makePools, makeStalks, rel, type Stalk } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { secondsInPlace, shotsOf } from '../../../film/cut';
import { stagedSeconds } from '../shared/stage';
import { Fronds, crownOf, dropMesh, frondMesh, matOf, plumeOf, stemMesh, tuftOf, type GrowthUniforms } from './grown';
import { COLLAR_FRAGMENT, COLLAR_VERTEX } from './palms';
import { INSECT_DEPTH, INSECT_FRAGMENT, INSECT_VERTEX } from './shaders';
import { growStands, lineAt, type Wild } from './stands';

export const PARTS: readonly string[] = ['stalks', 'insects'];

// STAGED by shot: in the shot of the thin crust the groves its lens looks across stand low and thick in the haze, hardly above the wallowers' backs,
// as the approved picture has them. In every other shot they stand as the list has them.
const CRUST_SHOT = shotsOf(UNIT).find((s) => s.id === 'marsh-05');
const CRUST_SPAN: [number, number] = CRUST_SHOT ? [secondsInPlace(UNIT, CRUST_SHOT.first) - 0.004, secondsInPlace(UNIT, CRUST_SHOT.last) + 0.004] : [0, -1];

// STAGED by shot: in the wide shot the heads of the stalks seen far off are small drooping tufts on thin stems, six tenths of what they are from near,
// as the approved wide picture has them.
const SHOTS = shotsOf(UNIT);
const SPANS = SHOTS.map((s) => [secondsInPlace(UNIT, s.first) - 0.004, secondsInPlace(UNIT, s.last) + 0.004] as [number, number]);
const WIDE_SHOT = shotsOf(UNIT).find((s) => s.id === 'marsh-01');
const WIDE_SPAN: [number, number] = WIDE_SHOT ? [secondsInPlace(UNIT, WIDE_SHOT.first) - 0.004, secondsInPlace(UNIT, WIDE_SHOT.last) + 0.004] : [0, -1];
// STAGED by shot: the stands of the wide shot (stands.ts) are drawn in that shot only.

/** Stalks nearer than this to where a camera stands are drawn in full. Metres. */
const NEAR = 14;

function instanced(base: THREE.BufferGeometry, count: number, attributes: Record<string, Float32Array>): THREE.InstancedBufferGeometry {
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  for (const name of Object.keys(base.attributes)) g.setAttribute(name, base.attributes[name] as THREE.BufferAttribute);
  for (const name of Object.keys(attributes)) g.setAttribute(name, new THREE.InstancedBufferAttribute(attributes[name] as Float32Array, 4));
  g.instanceCount = count;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
  return g;
}

export function create(ctx: Context): Piece {
  const rng = ctx.rng('stalks');
  const stalks = makeStalks(makePools());
  // TEMPORARY, until the lead moves them in the anchors: the four stalks by the hero wallower stand between the lens of marsh-3 and its head.
  // They go behind and to the left of the muzzle, where the approved picture has them.
  const moved: [number, number][] = [[37.0, -0.3], [37.6, -0.9], [36.8, -1.5], [36.2, -2.2]];
  moved.forEach((m, i) => {
    const s = stalks[stalks.length - 4 + i];
    const p = rel(m[0], m[1]);
    s.x = p[0];
    s.z = p[1];
  });
  // TEMPORARY, until the lead's list does it: the stalks stand in clumps with open flat between, some fork from the foot, and some are dead and broken off.
  // Every fifth one is the heart of a clump; those within reach of it are drawn in toward it. The ones the lens of the colony stands among, and the four by the hero, stay.
  {
    const clump = ctx.rng('stalks-clumps');
    const own = (s: Stalk, i: number): boolean => Math.hypot(s.x - K2_AT[0], s.z - K2_AT[1]) < 9 || i >= stalks.length - 4;
    const hearts = stalks.filter((s, i) => !own(s, i) && i % 5 === 0).map((s) => [s.x, s.z] as [number, number]);
    const forks: Stalk[] = [];
    stalks.forEach((s, i) => {
      if (own(s, i)) return;
      let best = 1e9;
      let heart: [number, number] | undefined;
      for (const h of hearts) {
        const d = Math.hypot(h[0] - s.x, h[1] - s.z);
        if (d < best) {
          best = d;
          heart = h;
        }
      }
      if (heart && best > 0.01 && best < 16) {
        const keep = clump.range(0.16, 0.42);
        s.x = heart[0] + (s.x - heart[0]) * keep;
        s.z = heart[1] + (s.z - heart[1]) * keep;
      }
      if (clump.next() < 0.16) {
        s.kind = 2;
        s.h *= clump.range(0.3, 0.7);
      }
      if (clump.next() < 0.14) forks.push({ ...s, x: s.x + clump.range(-0.08, 0.08), z: s.z + clump.range(-0.08, 0.08), h: s.h * clump.range(0.45, 0.8), lean: s.lean + clump.range(0.25, 0.5), yaw: s.yaw + clump.range(1.3, 5), kind: clump.next() < 0.3 ? 2 : s.kind, size: s.size * 0.85, phase: clump.range(0, 6.28) });
    });
    stalks.push(...forks);
  }
  // TEMPORARY, until the lead's list has them: the colonies go on out to the haze. A few groups stand at the water's edge beyond the last of the list,
  // and the flats between are bare, as the approved wide picture has them: each group its own height and lean.
  {
    const far = ctx.rng('stalks-far');
    let placed = 0;
    for (let c = 0; c < 400 && placed < 9; c++) {
      const d = far.range(40, 150);
      const p = rel(d, far.range(-0.62, 0.62) * d);
      const h = far.range(1.9, 3.3);
      const count = 3 + far.int(5);
      const edge = ctx.rig.land.shore(p[0], p[1]);
      if (edge < 0.1 || edge > 2.5) continue;
      placed++;
      for (let n = 0; n < count; n++) {
        const a = far.range(0, TAU);
        const r = far.range(0.15, 1.5);
        const roll = far.next();
        stalks.push({ x: p[0] + Math.cos(a) * r, z: p[1] + Math.sin(a) * r, h: h * far.range(0.55, 1.15), lean: far.range(0.02, 0.22), yaw: far.range(0, TAU), kind: roll < 0.62 ? 0 : roll < 0.76 ? 3 : roll < 0.88 ? 1 : 2, size: far.range(0.8, 1.15), phase: far.range(0, TAU) });
      }
    }
  }
  const backFrom = stalks.length;
  // STAGED for the lens of the wallowers: three groups stand in the haze behind the great one, on the banks of the vein, fading out as the approved picture has them.
  {
    const back = ctx.rng('stalks-back');
    for (const g of [[50, 5.2], [57.5, 0.6], [66, 8.5]] as [number, number][]) {
      const p = rel(g[0], g[1]);
      const h = back.range(2.4, 3.3);
      for (let n = 0; n < 5; n++) {
        const a = back.range(0, TAU);
        const r = back.range(0.2, 1.6);
        const roll = back.next();
        stalks.push({ x: p[0] + Math.cos(a) * r, z: p[1] + Math.sin(a) * r, h: h * back.range(0.55, 1.15), lean: back.range(0.05, 0.25), yaw: back.range(0, TAU), kind: roll < 0.7 ? 0 : roll < 0.85 ? 3 : 2, size: back.range(0.85, 1.15), phase: back.range(0, TAU) });
      }
    }
  }
  const staged4 = new Set<Stalk>(stalks.slice(backFrom));
  const k3 = rel(27.7, 3);
  const k4 = rel(24.6, 19.6);
  const k2a: [number, number] = [K2_AT[0] - K2_RIGHT[0] * 3.2, K2_AT[1] - K2_RIGHT[1] * 3.2];
  const k2b: [number, number] = [K2_AT[0] + K2_RIGHT[0] * 3.2, K2_AT[1] + K2_RIGHT[1] * 3.2];
  const near = (s: Stalk): boolean =>
    distToSegment(s.x, s.z, k2a, k2b) < NEAR || Math.hypot(s.x - K1_AT[0], s.z - K1_AT[1]) < NEAR || Math.hypot(s.x - k3[0], s.z - k3[1]) < NEAR || Math.hypot(s.x - k4[0], s.z - k4[1]) < NEAR;

  const uSeconds = { value: 0 };
  const uGrove = { value: new THREE.Vector2(1, 1) };
  const uHead = { value: 1 };
  const uViewH = { value: 2160 };
  const crowns: THREE.Mesh[][] = [];
  const salt = ctx.assets.texture('wallowers/salt.jpg', { kind: 'colour', anisotropy: 4 });
  // Those the lens of the colony stands among are built whole; every other one is the photograph of a stalk, on cards.
  const group = new THREE.Group();
  const wide = new THREE.Group();
  let wideShade: THREE.Object3D | null = null;
  const closeOf = (s: Stalk): boolean => Math.hypot(s.x - K2_AT[0], s.z - K2_AT[1]) < 6.5;
  const sets = [stalks.filter(closeOf)];
  const fils: number[][] = [[], [], [], []];
  const perches: [number, number, number][] = [];
  const clings: Wild[] = [];
  // TEMPORARY, until the lead's list does it: the open flats are bare. A stalk of the list that stands more than two metres from a water's edge is not drawn,
  // but for those a lens stands among: the approved wide picture has a few loose clumps by the seep and by the vein, and almost none on the flats.
  const kept = (s: Stalk): boolean =>
    ctx.rig.land.shore(s.x, s.z) < 2 || Math.hypot(s.x - K1_AT[0], s.z - K1_AT[1]) < 9 || Math.hypot(s.x - K2_AT[0], s.z - K2_AT[1]) < 12 || Math.hypot(s.x - k3[0], s.z - k3[1]) < 13 || staged4.has(s);
  const lines = (list: Wild[]): Record<string, Float32Array> => {
    const o = { aBase: new Float32Array(list.length * 4), aAxis: new Float32Array(list.length * 4), aKind: new Float32Array(list.length * 4), aBend: new Float32Array(list.length * 4), aMore: new Float32Array(list.length * 4), aLook: new Float32Array(list.length * 4), aFork: new Float32Array(list.length * 4) };
    list.forEach((w, i) => {
      o.aBase.set([w.x, w.y, w.z, w.h], i * 4);
      o.aAxis.set([w.dx, w.dz, w.lean, w.R], i * 4);
      o.aKind.set([w.kind, w.phase, w.low, w.seed], i * 4);
      o.aBend.set([w.bowA, w.bowM, w.kinkT, w.kinkM], i * 4);
      o.aMore.set([w.swayA, w.swayM, w.kinkA, w.rate], i * 4);
      o.aLook.set([w.age, w.stain, w.uvo, w.quiver], i * 4);
      o.aFork.set([w.fork[0], w.fork[1], w.fork[2], w.collar], i * 4);
    });
    return o;
  };
  const uSway = { value: 1 };
  const growth: GrowthUniforms = { uSeconds, uGrove, uHead, uViewH, uSway };
  // The ones the lens of the colony stands among shade the ground as they did. Every other one that is drawn does it below, where it is made.
  const stood = stalks.filter((s) => closeOf(s));
  const discs = ctx.rig.contactDiscs(stood.length);
  stood.forEach((s, i) => ctx.rig.setDisc(discs, i, s.x, s.z, (s.h > 2.6 ? 0.09 : 0.07) * s.size * 5, 0.7));
  {
    const rest = stalks.filter((s) => !closeOf(s));
    // STAGED for the lens of the thin crust: the groves it looks across are marked, and stand low and thick in its shot.
    const low = new Set<Stalk>();
    const k4to = rel(27.6, 10.07);
    const k4l = Math.hypot(k4to[0] - k4[0], k4to[1] - k4[1]);
    for (const s of rest) {
      const along = ((s.x - k4[0]) * (k4to[0] - k4[0]) + (s.z - k4[1]) * (k4to[1] - k4[1])) / k4l;
      const off = Math.hypot(s.x - k4[0], s.z - k4[1]);
      if (along > 9 && off < 60 && along > 0.55 * off) {
        low.add(s);
      }
    }
    // TEMPORARY, until the lead's list does it: a tall stalk that is shut stood as a bare pole with a bud on it. The tall ones are half open, and the shut ones are the young: short.
    // Those at the lip of the seep keep what the list gives them.
    for (const s of rest) {
      if (s.kind !== 1 || Math.hypot(s.x - K1_AT[0], s.z - K1_AT[1]) < 8) continue;
      if (s.h > 3.2) s.kind = 3;
      else s.h *= 0.6;
    }
    // A stand of living things: every stalk has its own line (bow, sway, kink, fork), girth, age and head, and the stand has its old giants,
    // its young in their lee, its dead standing broken and its dead lying in the brine. `rng` gives what it always gave, in the same order, so that
    // the stalks the keys show stay the height they were; everything new is drawn from `wild`.
    const wild = ctx.rng('stalks-wild');
    const wilds: Wild[] = [];
    const lee = [0.8, 0.6];
    // The foot of a line: the bed where it stands in the brine, the ground where it does not.
    const levelAt = (x: number, z: number): number => ctx.rig.land.height(x, z) - 0.05;
    // Its own stream: what `wild` gives each stalk stays what it gave before the cards had a shape of their own.
    const shapes = ctx.rng('stalks-cards');
    const dress = (w: Wild, style: number, scale: number): void => {
      // style: 0 a full mop, 1 ragged, 2 spent and hanging, 3 young and tight, 4 a bud, 5 half out.
      const turn = wild.range(0, TAU);
      const card = (k: number, n: number, droop: number, size: number, lock: number, ragged: number, spent: number): void => {
        w.cards.push([turn + ((k + wild.range(-0.3, 0.3)) / n) * TAU, droop, size * scale, lock + shapes.range(0, 0.45), wild.next(), ragged, spent, wild.range(-0.035, 0.035)]);
      };
      if (style === 0) {
        const n = 4 + wild.int(3);
        const droop = wild.range(0.1, 0.65);
        for (let k = 0; k < n; k++) card(k, n, droop + wild.range(-0.3, 0.4), wild.range(0.75, 1.25), 0, wild.next() < 0.3 ? wild.range(0.2, 0.5) : 0, 0);
        if (wild.next() < 0.35) card(0.5, n, wild.range(-0.2, 0.2), wild.range(0.5, 0.75), 1, 0, 0);
      } else if (style === 1) {
        const n = 1 + wild.int(3);
        for (let k = 0; k < n; k++) card(k, n, wild.range(0, 1.1), wild.range(0.6, 1.1), 0, wild.range(0.5, 1), wild.next() < 0.4 ? wild.range(0.3, 0.8) : 0);
      } else if (style === 2) {
        const n = 2 + wild.int(2);
        for (let k = 0; k < n; k++) card(k, n, wild.range(1.7, 2.4), wild.range(0.4, 0.7), 0, wild.range(0.5, 0.95), wild.range(0.8, 1));
      } else if (style === 3) {
        const n = 1 + wild.int(2);
        for (let k = 0; k < n; k++) card(k, n, wild.range(-0.25, 0.25), wild.range(0.5, 0.85), 1, 0, 0);
        if (wild.next() < 0.5) card(0.5, n, wild.range(-0.5, 0), wild.range(0.5, 0.8), 0, 0.2, 0);
      } else if (style === 4) {
        card(0, 1, wild.range(-0.15, 0.15), wild.range(0.4, 0.6), 1, 0, 0);
      } else {
        const n = 2 + wild.int(2);
        for (let k = 0; k < n; k++) card(k, n, wild.range(-0.4, 0.3), wild.range(0.7, 1.1), 0, wild.next() < 0.4 ? 0.4 : 0, 0);
        card(0.5, n, wild.range(-0.2, 0.2), wild.range(0.6, 0.9), 1, 0, 0);
      }
    };
    // A short stalk carries a small head: the head is as wide as the trunk is thick, and no wider than the stalk can hold up.
    const headFor = (tall: number): number => Math.pow(Math.min(1.1, Math.max(0.12, tall / 2.6)), 0.9);
    const headOf = (kind: number): number => {
      if (kind === 1) return 4;
      if (kind === 3) return 5;
      const roll = wild.next();
      return roll < 0.54 ? 0 : roll < 0.73 ? 1 : roll < 0.84 ? 2 : 3;
    };
    rest.forEach((s) => {
      const r1 = rng.next();
      const r2 = rng.range(0, 0.2);
      const r3 = rng.range(0.5, 0.72);
      const seed = rng.next();
      if (!kept(s)) return;
      // The groups staged behind the great wallower are a key's own: they keep their lines and sizes as the ones by a lens do.
      const anchored = near(s) || staged4.has(s);
      const lowly = low.has(s);
      // What stands behind a subject in a key's picture (the groves across the thin crust, the far side of the colony's water) grows no taller and
      // carries no wider a head than it did there.
      const ahead2 = (s.x - K2_AT[0]) * K2_DIR[0] + (s.z - K2_AT[1]) * K2_DIR[1];
      const aside2 = Math.abs((s.x - K2_AT[0]) * K2_RIGHT[0] + (s.z - K2_AT[1]) * K2_RIGHT[1]);
      const backdrop = lowly || (ahead2 > 0 && ahead2 < 90 && aside2 < 0.9 * ahead2 + 3);
      // Seedling to old giant. The ones a key's lens stands by keep their height, give or take a little.
      const cls = wild.next();
      const grown = anchored || lowly ? wild.range(0.86, 1.14) : cls < 0.15 ? wild.range(1.25, 1.65) : cls < 0.7 ? wild.range(0.85, 1.2) : cls < 0.9 ? wild.range(0.55, 0.8) : wild.range(0.3, 0.5);
      const grow = backdrop ? Math.min(grown, 1.15) : grown;
      const tall = s.h * (0.45 + 0.75 * r1) * grow;
      const girth = anchored ? wild.range(0.95, 1.08) : Math.pow(grow, 0.5) * wild.range(0.95, 1.35);
      const R = (s.h > 2.6 ? 0.09 : 0.07) * s.size * r3 * girth;
      const leaner = !anchored && wild.next() < 0.14 ? wild.range(0.2, 0.5) : 0;
      const kinked = wild.next() < 0.34;
      const old = grow > 1.25 || wild.next() < 0.2;
      const w: Wild = {
        x: s.x, y: anchored || backdrop ? Math.min(0, levelAt(s.x, s.z) + 0.05) - 0.05 : levelAt(s.x, s.z), z: s.z, h: tall + 0.05, dx: Math.cos(s.yaw), dz: -Math.sin(s.yaw), lean: s.lean * 1.5 + r2 + leaner, R,
        kind: s.kind, phase: s.phase, low: lowly ? 1 : 0, seed,
        bowA: wild.range(0, TAU), bowM: wild.range(0.03, 0.22), kinkT: kinked ? wild.range(0.25, 0.8) : 2, kinkM: kinked ? wild.range(0.12, 0.5) : 0,
        swayA: wild.range(0, TAU), swayM: wild.next() < 0.5 ? wild.range(0.02, 0.085) : wild.range(0, 0.02), kinkA: wild.range(0, TAU), rate: wild.range(0.7, 1.6) / Math.sqrt(Math.max(tall, 0.6) / 2.5),
        age: s.kind === 2 ? 2 : anchored ? wild.range(0, 0.4) : old ? wild.range(0.6, 1) : wild.range(0, 0.55), stain: anchored ? wild.range(0.1, 0.4) : wild.range(0.12, 1.1), uvo: wild.range(0, 2), quiver: 1,
        fork: [0, 0, 0], collar: wild.range(0.7, 1.6), cards: [], foot: true,
      };
      if (anchored) {
        // By a key's lens a stalk keeps the line the key's picture has it on: the bow it always had, no kink, hardly a sway.
        w.bowA = seed * 37;
        w.bowM = 0.05 + 0.2 * ((seed * 91.3) % 1);
        w.kinkT = 2;
        w.kinkM = 0;
        w.swayM = Math.min(w.swayM, 0.012);
        w.collar = 0.5 * w.collar;
      }
      // The ones the lens of the wallowers looks past stay exactly as its picture has them: no collar, and a head on its trunk's line.
      w.bare = staged4.has(s) || Math.hypot(s.x - k3[0], s.z - k3[1]) < NEAR;
      // The ones at the left of the wallowers' picture end inside its frame, each under an open head that weeps into it.
      const from3 = Math.hypot(s.x - k3[0], s.z - k3[1]);
      const framed = from3 < 12.5 && s.kind !== 2 && w.h > 1.8;
      if (framed) w.h = from3 < 7 ? 1.4 + 0.4 * ((seed * 7.7) % 1) : 2.5 + 0.3 * ((seed * 7.7) % 1);
      wilds.push(w);
      // And its head keeps the size in frame: a mop of cards all round is wider than the one fan it was, so each card is smaller.
      if (s.kind !== 2) dress(w, headOf(s.kind), (0.6 + 0.7 * wild.next()) * headFor(tall) * (staged4.has(s) ? 0.6 : anchored || backdrop ? 0.86 : 1));
      if (framed) {
        const turn = -0.2 + 0.7 * ((seed * 3.3) % 1);
        // No two the same: one full, one thin and ragged, each with a fall of older straps to its own side.
        const big = 0.65 + 0.7 * ((seed * 11.3) % 1);
        const torn = 0.2 + 0.6 * ((seed * 17.9) % 1);
        w.cards = [[turn, 0.4, 0.5 * big, 1.2, 0, torn, 0], [turn + 0.3, 0.6, 0.6 * big, 0.2, 0, 0.4, 0], [turn - 1.1, 0.9, 0.45 * big, 0.2, 0, 0.6, 0.4]];
      }
      // A fork: a second trunk that leaves this one part of the way up, goes out and turns up.
      if (!lowly && tall > 1.5 && wild.next() < 0.2 && !anchored) {
        const t0 = wild.range(0.28, 0.66);
        const at = lineAt(w, t0);
        const a = wild.range(0, TAU);
        const kind = wild.next() < 0.25 ? 2 : s.kind === 2 ? 0 : s.kind;
        const f: Wild = {
          ...w, h: tall * (1 - t0) * wild.range(0.45, 1.05), dx: Math.cos(a), dz: Math.sin(a), lean: wild.range(0.5, 1.05), R: R * wild.range(0.55, 0.8),
          kind, phase: wild.range(0, TAU), seed: wild.next(),
          bowA: Math.PI + wild.range(-0.4, 0.4), bowM: wild.range(0.22, 0.48), kinkT: 2, kinkM: 0, swayM: wild.range(0, 0.04), rate: w.rate * wild.range(1.1, 1.5),
          age: kind === 2 ? 2 : w.age, stain: 0.02, uvo: wild.range(0, 2), fork: [at[0] - w.x, at[1] - w.y, at[2] - w.z], collar: 0, cards: [], foot: false,
        };
        wilds.push(f);
        if (kind !== 2) dress(f, headOf(kind), wild.range(0.7, 1) * headFor(f.h));
      }
      if (anchored) return;
      // Dense cores: more trunks from nearly the same foot, splayed out from it.
      if (!lowly && grow > 0.8 && wild.next() < 0.42) {
        const n = 1 + wild.int(4);
        for (let k = 0; k < n; k++) {
          const a = wild.range(0, TAU);
          const d = wild.range(0.1, 0.55);
          const x = s.x + Math.cos(a) * d;
          const z = s.z + Math.sin(a) * d;
          const h = tall * wild.range(0.4, 1.1);
          const kind = wild.next() < 0.12 ? 2 : wild.next() < 0.2 ? 3 : 0;
          const kinks = wild.next() < 0.3;
          const b: Wild = {
            x, y: levelAt(x, z), z, h, dx: Math.cos(a), dz: Math.sin(a), lean: wild.range(0.04, 0.4), R: R * wild.range(0.6, 1) * Math.pow(h / tall, 0.4),
            kind, phase: wild.range(0, TAU), low: 0, seed: wild.next(),
            bowA: wild.range(0, TAU), bowM: wild.range(0.03, 0.2), kinkT: kinks ? wild.range(0.25, 0.8) : 2, kinkM: kinks ? wild.range(0.12, 0.45) : 0,
            swayA: wild.range(0, TAU), swayM: wild.next() < 0.5 ? wild.range(0.02, 0.08) : wild.range(0, 0.02), kinkA: wild.range(0, TAU), rate: wild.range(0.7, 1.6) / Math.sqrt(Math.max(h, 0.6) / 2.5),
            age: kind === 2 ? 2 : wild.range(0, 0.8), stain: wild.range(0.12, 1.1), uvo: wild.range(0, 2), quiver: 1, fork: [0, 0, 0], collar: wild.range(0.7, 1.6), cards: [], foot: true,
          };
          wilds.push(b);
          if (kind !== 2) dress(b, headOf(kind), (0.8 + 0.35 * wild.next()) * headFor(h));
        }
      }
      // The young stand in the lee of the old.
      if (tall > 2 && wild.next() < 0.6) {
        const n = 1 + wild.int(5);
        for (let k = 0; k < n; k++) {
          const along = wild.range(0.2, 1.7);
          const across = wild.range(-0.6, 0.6) * (0.4 + along);
          const x = s.x + lee[0] * along - lee[1] * across;
          const z = s.z + lee[1] * along + lee[0] * across;
          const h = wild.range(0.14, 0.95);
          const yaw = wild.range(0, TAU);
          const kind = wild.next() < 0.55 ? 1 : 0;
          // None where the brine is deep: a seedling stands on the crust or in the shallows.
          if (ctx.rig.land.height(x, z) < -0.12) continue;
          const y: Wild = {
            x, y: levelAt(x, z), z, h, dx: Math.cos(yaw), dz: Math.sin(yaw), lean: wild.range(0, 0.28), R: wild.range(0.016, 0.03) * (0.7 + 0.6 * h),
            kind, phase: wild.range(0, TAU), low: lowly ? 1 : 0, seed: wild.next(),
            bowA: wild.range(0, TAU), bowM: wild.range(0.03, 0.3), kinkT: 2, kinkM: 0, swayA: wild.range(0, TAU), swayM: wild.range(0, 0.06), kinkA: 0, rate: wild.range(1.5, 2.6),
            age: wild.range(0, 0.25), stain: wild.range(0.04, 0.2), uvo: wild.range(0, 2), quiver: 1.6, fork: [0, 0, 0], collar: wild.range(0.4, 1), cards: [], foot: true,
          };
          wilds.push(y);
          dress(y, kind === 1 ? 4 : 3, wild.range(0.8, 1.2) * headFor(h) * 2);
        }
      }
      // And the dead lie where they fell, half in the brine.
      if (!lowly && wild.next() < 0.16) {
        const a = wild.range(0, TAU);
        const d = wild.range(0.4, 2.6);
        const x = s.x + Math.cos(a) * d;
        const z = s.z + Math.sin(a) * d;
        const yaw = wild.range(0, TAU);
        const rr = R * wild.range(0.8, 1.2);
        const broken = wild.next() < 0.5;
        wilds.push({
          x, y: Math.max(0, ctx.rig.land.height(x, z)) - 0.05 + rr * wild.range(0.1, 0.7), z, h: wild.range(1.1, 3.6), dx: Math.cos(yaw), dz: Math.sin(yaw), lean: wild.range(1.5, 1.6), R: rr,
          kind: 2, phase: 0, low: 0, seed: wild.next(),
          bowA: wild.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2, bowM: wild.range(0.02, 0.16), kinkT: broken ? wild.range(0.3, 0.7) : 2, kinkM: broken ? wild.range(0.15, 0.5) : 0,
          swayA: Math.PI / 2, swayM: wild.range(0, 0.03), kinkA: wild.next() < 0.5 ? Math.PI / 2 : -Math.PI / 2, rate: 1,
          age: 2, stain: 0.1, uvo: wild.range(0, 2), quiver: 0, fork: [0, 0, 0], collar: 0, cards: [], foot: false,
        });
      }
    });
    // Each one shades the ground it stands on, and one that lies shades the length of it.
    const feet = wilds.filter((w) => w.foot || w.quiver === 0);
    const shade = ctx.rig.contactDiscs(feet.length);
    feet.forEach((w, i) => {
      if (w.foot) ctx.rig.setDisc(shade, i, w.x, w.z, Math.max(0.12, w.R * 6.5), 0.7);
      else ctx.rig.setDisc(shade, i, w.x + w.dx * w.h * 0.5, w.z + w.dz * w.h * 0.5, w.R * 3.5, 0.6, (w.h * 0.5) / (w.R * 3.5), Math.atan2(-w.dz, w.dx));
    });
    // Every stalk no lens stands among is a tube about its own line, and its head is straps (grown.ts). How fine each is made goes by how near
    // a lens ever comes to it.
    const eyeA = rel(-6, 3);
    const eyeB = rel(12, -3);
    const reach = (w: Wild): number =>
      Math.min(distToSegment(w.x, w.z, eyeA, eyeB), distToSegment(w.x, w.z, k2a, k2b), Math.hypot(w.x - K1_AT[0], w.z - K1_AT[1]), Math.hypot(w.x - k3[0], w.z - k3[1]), Math.hypot(w.x - k4[0], w.z - k4[1]));
    const lensOf: Record<string, (w: Wild) => number> = {
      'marsh-01': (w) => distToSegment(w.x, w.z, eyeA, eyeB),
      'marsh-02': (w) => distToSegment(w.x, w.z, k2a, k2b),
      'marsh-03': (w) => Math.max(0, Math.hypot(w.x - K1_AT[0], w.z - K1_AT[1]) - 8),
      'marsh-04': (w) => Math.hypot(w.x - k3[0], w.z - k3[1]),
      'marsh-05': (w) => Math.hypot(w.x - k4[0], w.z - k4[1]),
    };
    const fineOf = (d: number): number => (d < 9 ? 40 : d < 18 ? 28 : d < 36 ? 13 : d < 80 ? 5 : 3);
    const broadOf = (d: number): number => (d < 18 ? 0.62 : d < 36 ? 1.4 : d < 80 ? 2.5 : 3.6);
    {
      const footed = wilds.filter((w) => w.foot && !w.bare);
      const foot = new Float32Array(footed.length * 4);
      const foot2 = new Float32Array(footed.length * 4);
      const collars = ctx.rng('stalks-collars');
      footed.forEach((w, i) => {
        const ground = ctx.rig.land.height(w.x, w.z);
        const thick = w.R * (w.low ? 1.2 : 1);
        foot.set([w.x, Math.max(0, ground), w.z, thick * collars.range(2.3, 4.2) + 0.015], i * 4);
        foot2.set([thick * collars.range(0.8, 2.1), collars.next(), ground < 0 ? 1 : 0, 0], i * 4);
      });
      const ring = new THREE.BufferGeometry();
      const rp: number[] = [];
      const ri: number[] = [];
      const SIDES = 10;
      const RINGS = 4;
      for (let j = 0; j <= RINGS; j++) for (let i = 0; i <= SIDES; i++) rp.push((i / SIDES) * TAU, j / RINGS, 0);
      for (let j = 0; j < RINGS; j++) {
        for (let i = 0; i < SIDES; i++) {
          const a = j * (SIDES + 1) + i;
          ri.push(a, a + 1, a + SIDES + 1, a + 1, a + SIDES + 2, a + SIDES + 1);
        }
      }
      ring.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
      ring.setIndex(ri);
      const collarMaterial = new THREE.ShaderMaterial({
        uniforms: { ...ctx.rig.uniforms, tSalt: { value: salt } },
        vertexShader: COLLAR_VERTEX,
        fragmentShader: COLLAR_FRAGMENT,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(instanced(ring, footed.length, { aFoot: foot, aFoot2: foot2 }), collarMaterial);
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    const fronds = ctx.rng('stalks-fronds');
    {
      // STAGED by shot: a head is made as fine as the lens of the shot needs it, and no finer. Each shot has the heads made for its own lens;
      // the others are not drawn. The stalks, their lines and the size of their heads are the same in every shot.
      SHOTS.forEach((shot, which) => {
        const from = lensOf[shot.id] ?? reach;
        const nearF = new Fronds();
        const farF = new Fronds();
        const own = ctx.rng('stalks-fronds-' + shot.id);
        for (const w of wilds) crownOf(from(w) < 22 ? nearF : farF, w, own, fineOf(from(w)), broadOf(from(w)), false, 0.5 + 0.4 * ((w.seed * 5.9) % 1));
        // The stems the same way: by the lens of the shot the ledges of the bark are the mesh, far off a stem is a plain tube.
        const closeW = wilds.filter((w) => from(w) < 7);
        const nearW = wilds.filter((w) => from(w) >= 7 && from(w) < 22);
        const farW = wilds.filter((w) => from(w) >= 22);
        const meshes = [
          frondMesh(ctx, growth, nearF, 7, { wet: 0.5 }), frondMesh(ctx, growth, farF, 3, { small: true }),
          stemMesh(ctx, growth, closeW.length, lines(closeW), 150, 24, 2), stemMesh(ctx, growth, nearW.length, lines(nearW), 24, 9, 1), stemMesh(ctx, growth, farW.length, lines(farW), 6, 5, 0, true),
        ];
        if (shot.id === 'marsh-03') for (const m of [meshes[2], meshes[3]]) (((m as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uRust as THREE.IUniform<number>).value = 1;
        crowns[which] = meshes;
        group.add(...meshes);
      });
    }
    // The stands of the wide shot: more stems and their heads, the leaf that hangs down the stems, and the growth at their feet.
    const stands = growStands(ctx, wilds, uSeconds);
    {
      // The wide lens walks 16 m forward and turns 23 degrees in all: what stands behind it or beyond the sides of all it sees is not made.
      const seen = (x: number, z: number): boolean => {
        const d = (x - EYE[0]) * AHEAD[0] + (z - EYE[1]) * AHEAD[1] + 7;
        const l = (x - EYE[0]) * ASIDE[0] + (z - EYE[1]) * ASIDE[1] + 1.5;
        return d > 0 && Math.abs(l) < d * 1.33 + 7;
      };
      const nearS = stands.stems.slice(0, stands.near).filter((w) => seen(w.x, w.z));
      const farS = stands.stems.slice(stands.near).filter((w) => seen(w.x, w.z));
      wide.add(stemMesh(ctx, growth, nearS.length, lines(nearS), 8, 5, 0, true), stemMesh(ctx, growth, farS.length, lines(farS), 4, 5, 0, true));
      const nearF = new Fronds();
      const midF = new Fronds();
      const farF = new Fronds();
      const low = new Fronds();
      const listOf = (d: number): Fronds => (d < 20 ? nearF : d < 38 ? midF : farF);
      const wideOf = lensOf['marsh-01'] ?? reach;
      for (const w of stands.stems) if (seen(w.x, w.z)) crownOf(listOf(wideOf(w)), w, fronds, fineOf(wideOf(w)), broadOf(wideOf(w)), false, 0.75);
      for (const w of stands.leaves) if (seen(w.x, w.z) && wideOf(w) < 38) crownOf(listOf(wideOf(w)), w, fronds, fineOf(wideOf(w)) * 0.35, broadOf(wideOf(w)) * 1.2, true);
      // The understorey near the lens: each tuft a few straps from one foot.
      const t0 = stands.tufts[0] as number[];
      const t1 = stands.tufts[1] as number[];
      const t2 = stands.tufts[2] as number[];
      for (let i = 0; i < t0.length / 4; i++) {
        const x = t0[i * 4] as number;
        const z = t0[i * 4 + 2] as number;
        const d = Math.hypot(x - eyeB[0], z - eyeB[1]);
        if (!seen(x, z)) continue;
        tuftOf(low, fronds, x, t0[i * 4 + 1] as number, z, t0[i * 4 + 3] as number, t1[i * 4] as number, t2[i * 4 + 1] as number, d < 14 ? 10 : d < 30 ? 7 : 4);
      }
      // The mat near the lens: leaves on the ground, not a picture of them.
      const m0 = stands.mats[0] as number[];
      const m1 = stands.mats[1] as number[];
      const creep = new Fronds();
      for (let i = 0; i < m0.length / 4; i++) {
        const x = m0[i * 4] as number;
        const z = m0[i * 4 + 2] as number;
        const d = distToSegment(x, z, eyeA, eyeB);
        if (d > 60 || !seen(x, z)) continue;
        matOf(creep, fronds, (px, pz) => ctx.rig.land.height(px, pz), x, z, m0[i * 4 + 3] as number, m1[i * 4] as number, m1[i * 4 + 3] as number, d < 10 ? 130 : d < 22 ? 42 : d < 40 ? 15 : 6, d < 10 ? 1.2 : d < 22 ? 1.9 : d < 40 ? 3.6 : 5.5);
      }
      wide.add(frondMesh(ctx, growth, creep, 2, { dry: true, small: true, low: true }));
      wide.add(frondMesh(ctx, growth, nearF, 4), frondMesh(ctx, growth, midF, 3, { small: true }), frondMesh(ctx, growth, farF, 2, { dry: true, small: true }), frondMesh(ctx, growth, low, 2, { dry: true, small: true, low: true }), stands.group);
    }
    wideShade = stands.shade;
    group.add(wide);
  }
  // The ones the lens of the colony stands among draw from their own stream: nothing done to the far ones changes them.
  const own = ctx.rng('stalks-close');
  const closeSet = new THREE.Group();
  const closeFar = new THREE.Group();
  let closeRust: THREE.IUniform<number> | undefined;
  // They are built whole: a trunk fine enough to carry its ledges and its crust in relief, and a plume of blades, each one a mesh.
  {
    const closeW: Wild[] = [];
    const blades = new Fronds();
    const beads = new Fronds();
    // The air has combed their plumes the way the approved picture has them: across the lens to its right, a little away from it.
    const want = Math.atan2(K2_RIGHT[1] + 0.3 * K2_DIR[1], K2_RIGHT[0] + 0.3 * K2_DIR[0]);
    for (const s of sets[0] as Stalk[]) {
      let seed = own.next();
      // Those the lens stands among bow least, and none of them is shut when it looks: the open ones are open.
      for (let n = 0; n < 4000 && ((seed * 91.3) % 1 > 0.12 || (seed * 13.7) % 1 < 0.36); n++) seed = own.next();
      const R = (s.h > 2.6 ? 0.09 : 0.07) * s.size * 0.85;
      const w: Wild = {
        x: s.x, y: Math.min(0, ctx.rig.land.height(s.x, s.z)) - 0.05, z: s.z, h: s.h + 0.05, dx: Math.cos(s.yaw), dz: -Math.sin(s.yaw), lean: s.lean, R,
        kind: s.kind, phase: s.phase, low: 0, seed,
        bowA: seed * 37, bowM: 0.03 + 0.17 * ((seed * 91.3) % 1), kinkT: 2, kinkM: 0, swayA: 0, swayM: 0, kinkA: 0, rate: own.range(0.8, 1.3),
        age: s.kind === 2 ? 2 : own.range(0.1, 0.5), stain: own.range(0.15, 0.4), uvo: 0, quiver: 0.6, fork: [0, 0, 0], collar: 0.5, cards: [], foot: true,
      };
      // The head it carries when it is seen from the other shots: a heart that stands and a fall to the side the air has combed it.
      if (s.kind !== 2) w.cards = s.kind === 1 ? [[want, 0.1, 0.3, 1.1, 0, 0, 0]] : [[want, 0.35, 0.42, 1.2, 0, 0.1, 0], [want, 0.5, 0.42, 0.2, 0, 0.1, 0]];
      closeW.push(w);
      if (s.kind === 2) continue;
      if (s.kind !== 1) perches.push(lineAt(w, 1));
      clings.push(w);
      plumeOf(blades, beads, w, own, (s.kind === 0 ? 0.4 : s.kind === 3 ? 0.4 : 0.6) * s.size, want + own.range(-0.3, 0.3));
    }
    closeSet.add(stemMesh(ctx, growth, closeW.length, lines(closeW), 150, 28, 2), frondMesh(ctx, growth, blades, 14, { wet: 1 }), dropMesh(ctx, growth, beads));
    // Seen from the other shots they are far off, and are made as the far ones are.
    const plain = new Fronds();
    const less = ctx.rng('stalks-close-far');
    for (const w of closeW) if (w.kind !== 2) crownOf(plain, w, less, 12, 1.3, false);
    const farStems = stemMesh(ctx, growth, closeW.length, lines(closeW), 14, 8, 1);
    closeRust = ((farStems as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uRust as THREE.IUniform<number>;
    closeFar.add(farStems, frondMesh(ctx, growth, plain, 5));
    group.add(closeSet, closeFar);
  }
  ctx.scene.add(ctx.parts.built('stalks', group));

  // The insects: most round the plumes the camera of the colony looks through, some round the one that is stuck, some over the pool.
  const swarm = ctx.rng('insects');
  const COUNT = 156;
  const home = new Float32Array(COUNT * 4);
  const rate = new Float32Array(COUNT * 4);
  const phase = new Float32Array(COUNT * 4);
  const stuck = rel(STUCK[0], STUCK[1]);
  const ahead = (u: [number, number, number]): number => (u[0] - K2_AT[0]) * K2_DIR[0] + (u[2] - K2_AT[1]) * K2_DIR[1];
  const aside = (u: [number, number, number]): number => Math.abs((u[0] - K2_AT[0]) * K2_RIGHT[0] + (u[2] - K2_AT[1]) * K2_RIGHT[1]);
  const nearPerches = perches.filter((u) => ahead(u) > 0.8 && ahead(u) < 4 && aside(u) < 0.45 * ahead(u)).sort((u, w) => ahead(u) - ahead(w)).slice(0, 3);
  const nearClings = clings.filter((w) => ahead([w.x, 0, w.z]) > 0.8 && ahead([w.x, 0, w.z]) < 4.5 && aside([w.x, 0, w.z]) < 0.6 * ahead([w.x, 0, w.z])).sort((u, w) => ahead([u.x, 0, u.z]) - ahead([w.x, 0, w.z])).slice(0, 4);
  for (let i = 0; i < COUNT; i++) {
    let p: [number, number, number];
    if (i < 12 && nearClings.length > 0) {
      // Some have settled: they cling to the bark under a head, head up, on the side the lens sees, wings held up and closed over the back.
      const w = nearClings[i % nearClings.length] as Wild;
      const t = swarm.range(0.72, 0.985);
      const at = lineAt(w, t);
      const next = lineAt(w, t + 0.01);
      const face = Math.atan2(K2_AT[1] - at[2], K2_AT[0] - at[0]) + swarm.range(-1.25, 1.25);
      const out = [Math.cos(face), 0, Math.sin(face)];
      const along = [next[0] - at[0], next[1] - at[1], next[2] - at[2]];
      const dot = (out[0] as number) * (along[0] as number) + (out[2] as number) * (along[2] as number);
      const len = Math.hypot(along[0] as number, along[1] as number, along[2] as number);
      const o = [(out[0] as number) - (dot * (along[0] as number)) / (len * len), -(dot * (along[1] as number)) / (len * len), (out[2] as number) - (dot * (along[2] as number)) / (len * len)];
      const ol = Math.hypot(o[0] as number, o[1] as number, o[2] as number);
      const off = w.R * (1.08 - 0.28 * t) + 0.006;
      home.set([at[0] + ((o[0] as number) / ol) * off, at[1] + ((o[1] as number) / ol) * off, at[2] + ((o[2] as number) / ol) * off, 0], i * 4);
      rate.set([(o[0] as number) / ol, (o[1] as number) / ol, (o[2] as number) / ol, 1], i * 4);
      phase.set([swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(1, 1.45)], i * 4);
      continue;
    }
    if (i < 38 && nearPerches.length > 0) {
      // STAGED for the lens of the colony: a dozen keep to the two plumes nearest it, close in among the strands.
      const perch = nearPerches[i % nearPerches.length] as [number, number, number];
      p = [perch[0] + swarm.range(-0.45, 0.45), perch[1] + swarm.range(0.1, 0.6), perch[2] + swarm.range(-0.45, 0.45)];
      home.set([p[0], p[1], p[2], swarm.range(0.16, 0.34)], i * 4);
      rate.set([swarm.range(1.2, 3.2), swarm.range(1.5, 3.6), swarm.range(1.1, 3), 0], i * 4);
      phase.set([swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(1.3, 1.9)], i * 4);
      continue;
    }
    if (i < 106 && perches.length > 0) {
      // They live in the plumes: each keeps to the one it was hatched in.
      const perch = perches[swarm.int(perches.length)] as [number, number, number];
      p = [perch[0] + swarm.range(-0.55, 0.55), perch[1] + swarm.range(-0.1, 0.6), perch[2] + swarm.range(-0.55, 0.55)];
    } else if (i < 146) p = [stuck[0] + swarm.range(-1.7, 1.7), swarm.range(0.1, 0.7), stuck[1] + swarm.range(-1.7, 1.7)];
    else p = [swarm.range(-6, 6), swarm.range(0.4, 1.6), swarm.range(-6, 9)];
    home.set([p[0], p[1], p[2], swarm.range(0.2, 0.7)], i * 4);
    rate.set([swarm.range(1.2, 3.2), swarm.range(1.5, 3.6), swarm.range(1.1, 3), 0], i * 4);
    phase.set([swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(0, TAU), i >= 106 && i < 146 ? swarm.range(0.45, 0.8) : swarm.range(1.3, 2.1)], i * 4);
  }
  // One insect: the photograph cut in three, the body and the wings of each side, hinged along the body.
  const bug = new THREE.BufferGeometry();
  const bp: number[] = [];
  const bi: number[] = [];
  for (const [x0, x1, piece] of [[-0.07, 0.07, 0], [-0.5, -0.04, 1], [0.04, 0.5, -1]] as [number, number, number][]) {
    const start = bp.length / 3;
    bp.push(x0, -0.57, piece, x1, -0.57, piece, x0, 0.43, piece, x1, 0.43, piece);
    bi.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
  }
  bug.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
  bug.setIndex(bi);
  const bugs = new THREE.Mesh(
    instanced(bug, COUNT, { aHome: home, aRate: rate, aPhase: phase }),
    new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms, uSeconds, tInsect: { value: ctx.assets.texture('mat/insect.jpg', { kind: 'colour', repeat: false }) } },
      vertexShader: INSECT_VERTEX,
      fragmentShader: INSECT_FRAGMENT,
      side: THREE.DoubleSide,
    }),
  );
  (bugs.material as THREE.ShaderMaterial).userData.depthFragment = INSECT_DEPTH;
  bugs.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('insects', bugs));

  return {
    setTime: (seconds) => {
      uSeconds.value = seconds;
      const staged = stagedSeconds();
      if (staged >= CRUST_SPAN[0] && staged <= CRUST_SPAN[1]) uGrove.value.set(0.4, 1.2);
      else uGrove.value.set(1, 1);
      const inWide = staged >= WIDE_SPAN[0] && staged <= WIDE_SPAN[1];
      uHead.value = inWide ? 1.15 : 1;
      uSway.value = inWide ? 2.4 : 1;
      wide.visible = inWide;
      // The heads made for the shot that is on: between shots, those of the one that is nearest in time.
      let on = 0;
      let off = Infinity;
      SPANS.forEach((span, i) => {
        const d = staged < span[0] ? span[0] - staged : staged > span[1] ? staged - span[1] : 0;
        if (d < off) {
          off = d;
          on = i;
        }
      });
      crowns.forEach((meshes, i) => {
        for (const m of meshes) m.visible = i === on;
      });
      if (wideShade) wideShade.visible = inWide;
      const among = SHOTS[on]?.id === 'marsh-02';
      closeSet.visible = among;
      closeFar.visible = !among;
      if (closeRust) closeRust.value = SHOTS[on]?.id === 'marsh-03' ? 1 : 0;
    },
    resize: (_width, height) => {
      uViewH.value = height;
    },
  };
}
