// The stalk colonies: salt-crusted tubes with crimson plumes round the seep pools, and the small winged insects that live in them.
import * as THREE from 'three';
import { K1_AT, K2_AT, K2_DIR, K2_RIGHT, STUCK, TAU, distToSegment, makePools, makeStalks, rel, type Stalk } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { LOCK_DEPTH, LOCK_FRAGMENT, LOCK_VERTEX } from './locks';
import { PALM_DEPTH, PALM_FRAGMENT, PALM_VERTEX } from './palms';
import { INSECT_DEPTH, INSECT_FRAGMENT, INSECT_VERTEX, STEM_FRAGMENT, STEM_VERTEX } from './shaders';

export const PARTS: readonly string[] = ['stalks', 'insects'];

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
  sheet(1, 3, (v) => v);
  sheet(2, 12, (v) => v);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('aSkin', new THREE.Float32BufferAttribute(skin, 1));
  g.setIndex(index);
  return g;
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
      if (clump.next() < 0.3) forks.push({ ...s, x: s.x + clump.range(-0.08, 0.08), z: s.z + clump.range(-0.08, 0.08), h: s.h * clump.range(0.45, 0.8), lean: s.lean + clump.range(0.25, 0.5), yaw: s.yaw + clump.range(1.3, 5), kind: clump.next() < 0.3 ? 2 : s.kind, size: s.size * 0.85, phase: clump.range(0, 6.28) });
    });
    stalks.push(...forks);
  }
  const k3 = rel(27.7, 3);
  const k4 = rel(24.6, 19.6);
  const k2a: [number, number] = [K2_AT[0] - K2_RIGHT[0] * 3.2, K2_AT[1] - K2_RIGHT[1] * 3.2];
  const k2b: [number, number] = [K2_AT[0] + K2_RIGHT[0] * 3.2, K2_AT[1] + K2_RIGHT[1] * 3.2];
  const near = (s: Stalk): boolean =>
    distToSegment(s.x, s.z, k2a, k2b) < NEAR || Math.hypot(s.x - K1_AT[0], s.z - K1_AT[1]) < NEAR || Math.hypot(s.x - k3[0], s.z - k3[1]) < NEAR || Math.hypot(s.x - k4[0], s.z - k4[1]) < NEAR;

  const uSeconds = { value: 0 };
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
  const stood = stalks.filter(near);
  const discs = ctx.rig.contactDiscs(stood.length);
  stood.forEach((s, i) => ctx.rig.setDisc(discs, i, s.x, s.z, (s.h > 2.6 ? 0.09 : 0.07) * s.size * 5, 0.7));
  {
    const rest = stalks.filter((s) => !closeOf(s));
    const base = new Float32Array(rest.length * 4);
    const axis = new Float32Array(rest.length * 4);
    const kind = new Float32Array(rest.length * 4);
    rest.forEach((s, i) => {
      const tall = s.h * (0.45 + 0.75 * rng.next());
      base.set([s.x, Math.min(0, ctx.rig.land.height(s.x, s.z)) - 0.05, s.z, tall + 0.05], i * 4);
      axis.set([Math.cos(s.yaw), -Math.sin(s.yaw), s.lean * 1.5 + rng.range(0, 0.2), (s.h > 2.6 ? 0.09 : 0.07) * s.size * rng.range(0.9, 1.25)], i * 4);
      kind.set([s.kind, s.phase, s.size, rng.next()], i * 4);
    });
    const palm = new THREE.BufferGeometry();
    const pp: number[] = [];
    const pi: number[] = [];
    const sheet = (piece: number, nx: number, ny: number): void => {
      const start = pp.length / 3;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) pp.push(i / nx - 0.5, j / ny, piece);
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const a = start + j * (nx + 1) + i;
          pi.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1);
        }
      }
    };
    sheet(2, 4, 4);
    sheet(0, 1, 10);
    sheet(1, 4, 4);
    palm.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    palm.setIndex(pi);
    // No anisotropy on a picture whose cover is tested: the cut would then depend on an extension the film may not have.
    const palmMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        uSeconds,
        tStalk: { value: ctx.assets.texture('mat/stalk.jpg', { kind: 'colour', repeat: false }) },
        tStalkA: { value: ctx.assets.texture('mat/stalk-a.png', { kind: 'data', repeat: false }) },
      },
      vertexShader: PALM_VERTEX,
      fragmentShader: PALM_FRAGMENT,
      side: THREE.DoubleSide,
    });
    palmMaterial.userData.depthFragment = PALM_DEPTH;
    const mesh = new THREE.Mesh(instanced(palm, rest.length, { aBase: base, aAxis: axis, aKind: kind }), palmMaterial);
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  sets.forEach((set, which) => {
    const base = new Float32Array(set.length * 4);
    const axis = new Float32Array(set.length * 4);
    const kind = new Float32Array(set.length * 4);
    set.forEach((s, i) => {
      let seed = rng.next();
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
      if (close) for (let n = 0; n < 4000 && ((seed * 91.3) % 1 > 0.12 || (seed * 13.7) % 1 < 0.36 || !combed(seed)); n++) seed = rng.next();
      const tall = close ? s.h : s.h * (0.45 + 0.75 * rng.next());
      const lean = close ? s.lean : s.lean * 1.5 + rng.range(0, 0.2);
      const R = (s.h > 2.6 ? 0.09 : 0.07) * s.size * (close ? 1.15 : 0.72);
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
      const length = (s.kind === 0 ? (close ? 0.43 : 0.31) : s.kind === 3 ? 0.3 : 0.25) * s.size * (close ? 1 : which === 0 ? 1.6 : 2.1);
      // The plume: cards of the photographed lock that stand round the mouth, most through its axis and a few leaning out, so that it is a tuft from every side.
      const bud = s.kind === 1;
      const through = which === 0 ? (close ? (bud ? 5 : 3) : bud ? 3 : 3) : bud ? 0 : 2;
      const leaning = close && !bud ? 2 : 0;
      const turn = rng.range(0, Math.PI);
      for (let c = 0; c < through + leaning; c++) {
        const out = c >= through;
        const angle = out ? turn + ((c - through + rng.range(-0.2, 0.2)) / leaning) * TAU : turn + ((c + rng.range(-0.25, 0.25)) / through) * Math.PI;
        fils[0].push(top[0], top[1], top[2], (length / 0.8) * rng.range(0.82, 1.15) * (out ? 0.8 : 1));
        fils[1].push(ax[0], ax[1], ax[2], s.phase);
        fils[2].push(angle, out ? rng.range(0.45, 0.85) : rng.range(-0.12, 0.12), s.kind, seed);
        fils[3].push(rng.next() < 0.5 ? -1 : 1, (close ? 1.5 : 0.8) * rng.range(0.85, 1.15), close ? rng.range(0.45, 0.7) : rng.range(0.2, 0.5), rng.next());
      }
    });
    const g = instanced(stemGeometry(which === 0 ? 96 : 10, which === 0 ? 14 : 7), set.length, { aBase: base, aAxis: axis, aKind: kind });
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
      p = [perch[0] + swarm.range(-0.3, 0.3), perch[1] + swarm.range(-0.05, 0.3), perch[2] + swarm.range(-0.3, 0.3)];
      home.set([p[0], p[1], p[2], swarm.range(0.12, 0.3)], i * 4);
      rate.set([swarm.range(1.2, 3.2), swarm.range(1.5, 3.6), swarm.range(1.1, 3), 0], i * 4);
      phase.set([swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(0.7, 1.1)], i * 4);
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
    },
  };
}
