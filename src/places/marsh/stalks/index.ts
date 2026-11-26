// The stalk colonies: salt-crusted tubes with crimson plumes round the seep pools, and the small winged insects that live in them.
import * as THREE from 'three';
import { K1_AT, K2_AT, K2_DIR, K2_RIGHT, STUCK, TAU, UNIT, distToSegment, makePools, makeStalks, rel, type Stalk } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { secondsInPlace, shotsOf } from '../../../film/cut';
import { stagedSeconds } from '../shared/stage';
import { LOCK_DEPTH, LOCK_FRAGMENT, LOCK_VERTEX } from './locks';
import { HEAD_DEPTH, HEAD_FRAGMENT, HEAD_VERTEX, PALM_DEPTH, PALM_FRAGMENT, PALM_VERTEX } from './palms';
import { INSECT_DEPTH, INSECT_FRAGMENT, INSECT_VERTEX, STEM_FRAGMENT, STEM_VERTEX } from './shaders';

export const PARTS: readonly string[] = ['stalks', 'insects'];

// STAGED by shot: in the shot of the thin crust the groves its lens looks across stand low and thick in the haze, hardly above the wallowers' backs,
// as the approved picture has them. In every other shot they stand as the list has them.
const CRUST_SHOT = shotsOf(UNIT).find((s) => s.id === 'marsh-05');
const CRUST_SPAN: [number, number] = CRUST_SHOT ? [secondsInPlace(UNIT, CRUST_SHOT.first) - 0.004, secondsInPlace(UNIT, CRUST_SHOT.last) + 0.004] : [0, -1];

// STAGED by shot: in the wide shot the heads of the stalks seen far off are small drooping tufts on thin stems, six tenths of what they are from near,
// as the approved wide picture has them.
const WIDE_SHOT = shotsOf(UNIT).find((s) => s.id === 'marsh-01');
const WIDE_SPAN: [number, number] = WIDE_SHOT ? [secondsInPlace(UNIT, WIDE_SHOT.first) - 0.004, secondsInPlace(UNIT, WIDE_SHOT.last) + 0.004] : [0, -1];

/** Stalks nearer than this to where a camera stands are drawn in full. Metres. */
const NEAR = 14;

/** A tube in (angle, along) with its mouth and the body of the plume: the vertex shader gives it its shape. */

function stemGeometry(rings: number, sides: number): THREE.BufferGeometry {
  const position: number[] = [];
  const skin: number[] = [];
  const index: number[] = [];
  const sheet = (which: number, n: number, bias: (v: number) => number): void => {
    const start = position.length / 3;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= sides; j++) {
        position.push((j / sides) * TAU, bias(i / n), 0);
        skin.push(which);
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < sides; j++) {
        const a = start + i * (sides + 1) + j;
        index.push(a, a + sides + 1, a + 1, a + 1, a + sides + 1, a + sides + 2);
      }
    }
  };
  sheet(0, rings, (v) => v);
  sheet(1, 4, (v) => v);
  sheet(2, 12, (v) => v);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('aSkin', new THREE.Float32BufferAttribute(skin, 1));
  g.setIndex(index);
  return g;
}

/** One stalk that no lens stands among, as its shaders are given it (palms.ts). */
interface Wild {
  x: number; y: number; z: number; h: number;
  dx: number; dz: number; lean: number; R: number;
  kind: number; phase: number; low: number; seed: number;
  bowA: number; bowM: number; kinkT: number; kinkM: number;
  swayA: number; swayM: number; kinkA: number; rate: number;
  /** 0 young to 1 old; 2 dead. */
  age: number; stain: number; uvo: number;
  /** How much the air moves it: 0 for one that lies. */
  quiver: number;
  fork: [number, number, number]; collar: number;
  cards: number[][];
  foot: boolean;
}

/** A point of a stalk's line in still air, as the shader's spine() has it. */
function lineAt(w: Wild, t: number): [number, number, number] {
  const A = [w.dx * Math.sin(w.lean), Math.cos(w.lean), w.dz * Math.sin(w.lean)];
  const U = [w.dx * Math.cos(w.lean), -Math.sin(w.lean), w.dz * Math.cos(w.lean)];
  const W = [-w.dz, 0, w.dx];
  const base = [w.x + w.fork[0], w.y + w.fork[1], w.z + w.fork[2]];
  const at = (c: number): number => {
    const dir = (angle: number): number => (U[c] as number) * Math.cos(angle) + (W[c] as number) * Math.sin(angle);
    return (base[c] as number) + w.h * ((A[c] as number) * t + dir(w.bowA) * w.bowM * t * t + dir(w.swayA) * w.swayM * Math.sin(t * 4.7) * t + dir(w.kinkA) * w.kinkM * Math.max(t - w.kinkT, 0));
  };
  return [at(0), at(1), at(2)];
}

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
  const salt = ctx.assets.texture('wallowers/salt.jpg', { kind: 'colour', anisotropy: 4 });
  const saltNh = ctx.assets.texture('wallowers/salt-nh.png', { kind: 'data', anisotropy: 4 });
  const stemMaterial = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, uSeconds, tSalt: { value: salt }, tSaltNh: { value: saltNh } },
    vertexShader: STEM_VERTEX,
    fragmentShader: STEM_FRAGMENT,
    side: THREE.DoubleSide,
  });
  const plumeMaterial = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, uSeconds, tLock: { value: ctx.assets.texture('mat/lock.jpg', { kind: 'colour', repeat: false }) } },
    vertexShader: LOCK_VERTEX,
    fragmentShader: LOCK_FRAGMENT,
    side: THREE.DoubleSide,
  });
  plumeMaterial.userData.depthFragment = LOCK_DEPTH;

  // Those the lens of the colony stands among are built whole; every other one is the photograph of a stalk, on cards.
  const group = new THREE.Group();
  const closeOf = (s: Stalk): boolean => Math.hypot(s.x - K2_AT[0], s.z - K2_AT[1]) < 6.5;
  const sets = [stalks.filter(closeOf)];
  const fils: number[][] = [[], [], [], []];
  const perches: [number, number, number][] = [];
  // TEMPORARY, until the lead's list does it: the open flats are bare. A stalk of the list that stands more than two metres from a water's edge is not drawn,
  // but for those a lens stands among: the approved wide picture has a few loose clumps by the seep and by the vein, and almost none on the flats.
  const kept = (s: Stalk): boolean =>
    ctx.rig.land.shore(s.x, s.z) < 2 || Math.hypot(s.x - K1_AT[0], s.z - K1_AT[1]) < 9 || Math.hypot(s.x - K2_AT[0], s.z - K2_AT[1]) < 12 || Math.hypot(s.x - k3[0], s.z - k3[1]) < 13 || staged4.has(s);
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
    const levelAt = (x: number, z: number): number => Math.min(0, ctx.rig.land.height(x, z)) - 0.05;
    const dress = (w: Wild, style: number, scale: number): void => {
      // style: 0 a full mop, 1 ragged, 2 spent and hanging, 3 young and tight, 4 a bud, 5 half out.
      const turn = wild.range(0, TAU);
      const card = (k: number, n: number, droop: number, size: number, lock: number, ragged: number, spent: number): void => {
        w.cards.push([turn + ((k + wild.range(-0.3, 0.3)) / n) * TAU, droop, size * scale, lock, wild.next(), ragged, spent, wild.range(-0.035, 0.035)]);
      };
      if (style === 0) {
        const n = 4 + wild.int(3);
        const droop = wild.range(-0.25, 0.5);
        for (let k = 0; k < n; k++) card(k, n, droop + wild.range(-0.3, 0.45), wild.range(0.95, 1.6), 0, wild.next() < 0.3 ? wild.range(0.2, 0.5) : 0, 0);
        if (wild.next() < 0.6) card(0.5, n, wild.range(-0.2, 0.2), wild.range(0.7, 1.05), 1, 0, 0);
      } else if (style === 1) {
        const n = 1 + wild.int(3);
        for (let k = 0; k < n; k++) card(k, n, wild.range(-0.2, 1.1), wild.range(0.7, 1.35), 0, wild.range(0.5, 1), wild.next() < 0.4 ? wild.range(0.3, 0.8) : 0);
      } else if (style === 2) {
        const n = 2 + wild.int(2);
        for (let k = 0; k < n; k++) card(k, n, wild.range(1.5, 2.25), wild.range(0.6, 1.15), 0, wild.range(0.2, 0.8), wild.range(0.75, 1));
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
      const anchored = near(s);
      const lowly = low.has(s);
      // Seedling to old giant. The ones a key's lens stands by keep their height, give or take a little.
      const cls = wild.next();
      const grow = anchored || lowly ? wild.range(0.86, 1.14) : cls < 0.14 ? wild.range(1.3, 1.75) : cls < 0.6 ? wild.range(0.85, 1.2) : cls < 0.86 ? wild.range(0.55, 0.8) : wild.range(0.28, 0.5);
      const tall = s.h * (0.45 + 0.75 * r1) * grow;
      const girth = Math.pow(grow, 0.6) * wild.range(0.85, 1.2);
      const R = (s.h > 2.6 ? 0.09 : 0.07) * s.size * r3 * girth;
      const leaner = !anchored && wild.next() < 0.14 ? wild.range(0.2, 0.5) : 0;
      const kinked = wild.next() < 0.34;
      const old = grow > 1.25 || wild.next() < 0.2;
      const w: Wild = {
        x: s.x, y: levelAt(s.x, s.z), z: s.z, h: tall + 0.05, dx: Math.cos(s.yaw), dz: -Math.sin(s.yaw), lean: s.lean * 1.5 + r2 + leaner, R,
        kind: s.kind, phase: s.phase, low: lowly ? 1 : 0, seed,
        bowA: wild.range(0, TAU), bowM: wild.range(0.03, 0.22), kinkT: kinked ? wild.range(0.25, 0.8) : 2, kinkM: kinked ? wild.range(0.12, 0.5) : 0,
        swayA: wild.range(0, TAU), swayM: wild.next() < 0.5 ? wild.range(0.02, 0.085) : wild.range(0, 0.02), kinkA: wild.range(0, TAU), rate: wild.range(0.7, 1.6) / Math.sqrt(Math.max(tall, 0.6) / 2.5),
        age: s.kind === 2 ? 2 : old ? wild.range(0.6, 1) : wild.range(0, 0.55), stain: wild.range(0.12, 1.1), uvo: wild.range(0, 2), quiver: 1,
        fork: [0, 0, 0], collar: wild.range(0.7, 1.6), cards: [], foot: true,
      };
      wilds.push(w);
      if (s.kind !== 2) dress(w, headOf(s.kind), (0.8 + 0.35 * wild.next()) * Math.min(1.15, Math.pow(grow, 0.3)));
      // A fork: a second trunk that leaves this one part of the way up, goes out and turns up.
      if (!lowly && tall > 1.5 && wild.next() < 0.2) {
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
        if (kind !== 2) dress(f, headOf(kind), wild.range(0.55, 0.85));
      }
      if (anchored) return;
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
            x, y: Math.max(levelAt(x, z), ctx.rig.land.height(x, z) - 0.03), z, h, dx: Math.cos(yaw), dz: Math.sin(yaw), lean: wild.range(0, 0.28), R: wild.range(0.016, 0.03) * (0.7 + 0.6 * h),
            kind, phase: wild.range(0, TAU), low: lowly ? 1 : 0, seed: wild.next(),
            bowA: wild.range(0, TAU), bowM: wild.range(0.03, 0.3), kinkT: 2, kinkM: 0, swayA: wild.range(0, TAU), swayM: wild.range(0, 0.06), kinkA: 0, rate: wild.range(1.5, 2.6),
            age: wild.range(0, 0.25), stain: wild.range(0.04, 0.2), uvo: wild.range(0, 2), quiver: 1.6, fork: [0, 0, 0], collar: wild.range(0.4, 1), cards: [], foot: true,
          };
          wilds.push(y);
          dress(y, kind === 1 ? 4 : 3, wild.range(0.7, 1.1));
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
    const sheet = (nx: number, ny: number): THREE.BufferGeometry => {
      const g = new THREE.BufferGeometry();
      const pp: number[] = [];
      const pi: number[] = [];
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) pp.push(i / nx - 0.5, j / ny, 0);
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const a = j * (nx + 1) + i;
          pi.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1);
        }
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
      g.setIndex(pi);
      return g;
    };
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
    // No anisotropy on a picture whose cover is tested: the cut would then depend on an extension the film may not have.
    const tStalk = { value: ctx.assets.texture('mat/stalk.jpg', { kind: 'colour', repeat: false }) };
    const tStalkA = { value: ctx.assets.texture('mat/stalk-a.png', { kind: 'data', repeat: false }) };
    const tFan = { value: ctx.assets.texture('mat/fan.jpg', { kind: 'colour', repeat: false }) };
    const tFanA = { value: ctx.assets.texture('mat/fan-a.png', { kind: 'data', repeat: false }) };
    const tLock = { value: ctx.assets.texture('mat/lock.jpg', { kind: 'colour', repeat: false }) };
    const palmMaterial = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms, uSeconds, uGrove, tStalk, tStalkA },
      vertexShader: PALM_VERTEX,
      fragmentShader: PALM_FRAGMENT,
      side: THREE.DoubleSide,
    });
    palmMaterial.userData.depthFragment = PALM_DEPTH;
    const trunks = new THREE.Mesh(instanced(sheet(1, 16), wilds.length, lines(wilds)), palmMaterial);
    trunks.frustumCulled = false;
    group.add(trunks);
    const carded: Wild[] = [];
    const c1: number[] = [];
    const c2: number[] = [];
    for (const w of wilds) {
      for (const c of w.cards) {
        carded.push(w);
        c1.push(c[0], c[1], c[2], c[3]);
        c2.push(c[4], c[5], c[6], c[7]);
      }
    }
    const headMaterial = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms, uSeconds, uGrove, uHead, tFan, tFanA, tLock },
      vertexShader: HEAD_VERTEX,
      fragmentShader: HEAD_FRAGMENT,
      side: THREE.DoubleSide,
    });
    headMaterial.userData.depthFragment = HEAD_DEPTH;
    const heads = new THREE.Mesh(instanced(sheet(4, 4), carded.length, { ...lines(carded), aCard: new Float32Array(c1), aCard2: new Float32Array(c2) }), headMaterial);
    heads.frustumCulled = false;
    group.add(heads);
  }
  // The ones the lens of the colony stands among draw from their own stream: nothing done to the far ones changes them.
  const own = ctx.rng('stalks-close');
  sets.forEach((set, which) => {
    const base = new Float32Array(set.length * 4);
    const axis = new Float32Array(set.length * 4);
    const kind = new Float32Array(set.length * 4);
    set.forEach((s, i) => {
      let seed = own.next();
      const close = closeOf(s);
      // Away from the lens of the colony they are slender, of every height, and lean as they please.
      // Those the lens of the colony looks through keep the place the approved picture gives them: they bow least.
      // Those the lens stands among bow least, and none of them is shut when it looks: the open ones are open.
      // And the air has combed their plumes the way the approved picture has them: across the lens to its right, a little away from it.
      const combed = (v: number): boolean => {
        const want = Math.atan2(K2_RIGHT[1] + 0.3 * K2_DIR[1], K2_RIGHT[0] + 0.3 * K2_DIR[0]);
        const off = Math.abs(((Math.fround(v) * 40 - want) % TAU + TAU + Math.PI) % TAU - Math.PI);
        return off < 0.45;
      };
      if (close) for (let n = 0; n < 4000 && ((seed * 91.3) % 1 > 0.12 || (seed * 13.7) % 1 < 0.36 || !combed(seed)); n++) seed = own.next();
      const tall = close ? s.h : s.h * (0.45 + 0.75 * own.next());
      const lean = close ? s.lean : s.lean * 1.5 + own.range(0, 0.2);
      const R = (s.h > 2.6 ? 0.09 : 0.07) * s.size * (close ? 0.85 : 0.72);
      const dx = Math.cos(s.yaw);
      const dz = -Math.sin(s.yaw);
      base.set([s.x, Math.min(0, ctx.rig.land.height(s.x, s.z)) - 0.05, s.z, tall + 0.05], i * 4);
      axis.set([dx, dz, lean, R], i * 4);
      kind.set([s.kind, s.phase, s.size, seed], i * 4);
      if (s.kind === 2) return;
      // The plume: filaments in rings round the mouth, the inner ones standing and the outer ones hanging.
      const A = [dx * Math.sin(lean), Math.cos(lean), dz * Math.sin(lean)];
      const U = [dx * Math.cos(lean), -Math.sin(lean), dz * Math.cos(lean)];
      const W = [-dz, 0, dx];
      // The bow of the stem, as the vertex shader makes it: the plume sits on its end and stands along it.
      const ba = seed * 37;
      const hh = tall + 0.05;
      const h = tall + 0.02;
      const t = h / hh;
      const bow = (0.03 + 0.17 * ((seed * 91.3) % 1)) * hh;
      const B = [0, 1, 2].map((c) => ((U[c] as number) * Math.cos(ba) + (W[c] as number) * Math.sin(ba)) * bow);
      const top = [s.x + (A[0] as number) * h + (B[0] as number) * t * t, base[i * 4 + 1] + (A[1] as number) * h + (B[1] as number) * t * t, s.z + (A[2] as number) * h + (B[2] as number) * t * t];
      const axl = [0, 1, 2].map((c) => (A[c] as number) * hh + 2 * (B[c] as number) * t);
      const an = Math.hypot(axl[0] as number, axl[1] as number, axl[2] as number);
      const ax = axl.map((c) => c / an);
      // A bud keeps its filaments inside its sheath and a broken one has none: neither is given any to draw.
      if (close && s.kind !== 1) perches.push([top[0], top[1], top[2]]);
      // The ones the lens of the colony looks through are a hand's length away: theirs are drawn at their true size. Further off a plume is a mop as long as an arm.
      const length = (s.kind === 0 ? (close ? 0.38 : 0.31) : s.kind === 3 ? 0.24 : 0.25) * s.size * (close ? 1 : which === 0 ? 1.6 : 2.1);
      // The plume: cards of the photographed lock that stand round the mouth, most through its axis and a few leaning out, so that it is a tuft from every side.
      const bud = s.kind === 1;
      const through = which === 0 ? (close ? (bud ? 5 : 3) : bud ? 3 : 3) : bud ? 0 : 2;
      const leaning = close && !bud ? 2 : 0;
      const turn = own.range(0, Math.PI);
      for (let c = 0; c < through + leaning; c++) {
        const out = c >= through;
        const angle = out ? turn + ((c - through + own.range(-0.2, 0.2)) / leaning) * TAU : turn + ((c + own.range(-0.25, 0.25)) / through) * Math.PI;
        fils[0].push(top[0], top[1], top[2], (length / 0.8) * own.range(0.82, 1.15) * (out ? 0.8 : 1));
        fils[1].push(ax[0], ax[1], ax[2], s.phase);
        fils[2].push(angle, out ? own.range(0.45, 0.85) : own.range(-0.12, 0.12), s.kind, seed);
        fils[3].push(own.next() < 0.5 ? -1 : 1, (close ? 1.5 : 0.8) * own.range(0.85, 1.15), close ? own.range(0.45, 0.7) : own.range(0.2, 0.5), own.next());
      }
    });
    const g = instanced(stemGeometry(which === 0 ? 96 : 10, which === 0 ? 18 : 7), set.length, { aBase: base, aAxis: axis, aKind: kind });
    const mesh = new THREE.Mesh(g, stemMaterial);
    mesh.frustumCulled = false;
    group.add(mesh);
  });

  // One card of the lock: a grid the vertex shader bends.
  const card = new THREE.BufferGeometry();
  const cp: number[] = [];
  const ci: number[] = [];
  const CX = 6;
  const CY = 5;
  for (let j = 0; j <= CY; j++) for (let i = 0; i <= CX; i++) cp.push(i / CX - 0.5, j / CY, 0);
  for (let j = 0; j < CY; j++) {
    for (let i = 0; i < CX; i++) {
      const a = j * (CX + 1) + i;
      ci.push(a, a + 1, a + CX + 1, a + 1, a + CX + 2, a + CX + 1);
    }
  }
  card.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
  card.setIndex(ci);
  const plumes = new THREE.Mesh(
    instanced(card, fils[0].length / 4, { aTop: new Float32Array(fils[0]), aAx: new Float32Array(fils[1]), aLay: new Float32Array(fils[2]), aVar: new Float32Array(fils[3]) }),
    plumeMaterial,
  );
  plumes.frustumCulled = false;
  group.add(plumes);
  ctx.scene.add(ctx.parts.built('stalks', group));

  // The insects: most round the plumes the camera of the colony looks through, some round the one that is stuck, some over the pool.
  const swarm = ctx.rng('insects');
  const COUNT = 130;
  const home = new Float32Array(COUNT * 4);
  const rate = new Float32Array(COUNT * 4);
  const phase = new Float32Array(COUNT * 4);
  const stuck = rel(STUCK[0], STUCK[1]);
  const ahead = (u: [number, number, number]): number => (u[0] - K2_AT[0]) * K2_DIR[0] + (u[2] - K2_AT[1]) * K2_DIR[1];
  const aside = (u: [number, number, number]): number => Math.abs((u[0] - K2_AT[0]) * K2_RIGHT[0] + (u[2] - K2_AT[1]) * K2_RIGHT[1]);
  const nearPerches = perches.filter((u) => ahead(u) > 0.8 && ahead(u) < 4 && aside(u) < 0.45 * ahead(u)).sort((u, w) => ahead(u) - ahead(w)).slice(0, 3);
  for (let i = 0; i < COUNT; i++) {
    let p: [number, number, number];
    if (i < 12 && nearPerches.length > 0) {
      // STAGED for the lens of the colony: a dozen keep to the two plumes nearest it, close in among the strands.
      const perch = nearPerches[i % nearPerches.length] as [number, number, number];
      p = [perch[0] + swarm.range(-0.45, 0.45), perch[1] + swarm.range(0.1, 0.6), perch[2] + swarm.range(-0.45, 0.45)];
      home.set([p[0], p[1], p[2], swarm.range(0.16, 0.34)], i * 4);
      rate.set([swarm.range(1.2, 3.2), swarm.range(1.5, 3.6), swarm.range(1.1, 3), 0], i * 4);
      phase.set([swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(1.3, 1.9)], i * 4);
      continue;
    }
    if (i < 80 && perches.length > 0) {
      // They live in the plumes: each keeps to the one it was hatched in.
      const perch = perches[swarm.int(perches.length)] as [number, number, number];
      p = [perch[0] + swarm.range(-0.55, 0.55), perch[1] + swarm.range(-0.1, 0.6), perch[2] + swarm.range(-0.55, 0.55)];
    } else if (i < 120) p = [stuck[0] + swarm.range(-1.7, 1.7), swarm.range(0.1, 0.7), stuck[1] + swarm.range(-1.7, 1.7)];
    else p = [swarm.range(-6, 6), swarm.range(0.4, 1.6), swarm.range(-6, 9)];
    home.set([p[0], p[1], p[2], swarm.range(0.2, 0.7)], i * 4);
    rate.set([swarm.range(1.2, 3.2), swarm.range(1.5, 3.6), swarm.range(1.1, 3), 0], i * 4);
    phase.set([swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(0, TAU), i >= 80 && i < 120 ? swarm.range(0.45, 0.8) : swarm.range(1.3, 2.1)], i * 4);
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
      uHead.value = staged >= WIDE_SPAN[0] && staged <= WIDE_SPAN[1] ? 0.6 : 1;
    },
  };
}
