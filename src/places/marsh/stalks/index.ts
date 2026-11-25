// The stalk colonies: salt-crusted tubes with crimson plumes round the seep pools, and the small winged insects that live in them.
import * as THREE from 'three';
import { K1_AT, K2_AT, K2_DIR, K2_RIGHT, STUCK, TAU, distToSegment, makePools, makeStalks, rel, type Stalk } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { BEAD_FRAGMENT, BEAD_VERTEX, INSECT_FRAGMENT, INSECT_VERTEX, PLUME_FRAGMENT, PLUME_VERTEX, STEM_FRAGMENT, STEM_VERTEX, WING_FRAGMENT, WING_VERTEX } from './shaders';

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
  sheet(2, 6, (v) => v);
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
  const moved: [number, number][] = [[35.4, 0.1], [35.9, -0.4], [35.2, -0.9], [34.6, -1.6]];
  moved.forEach((m, i) => {
    const s = stalks[stalks.length - 4 + i];
    const p = rel(m[0], m[1]);
    s.x = p[0];
    s.z = p[1];
  });
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
  const plumeMaterial = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, uSeconds }, vertexShader: PLUME_VERTEX, fragmentShader: PLUME_FRAGMENT, side: THREE.DoubleSide });

  // The stems, in two finenesses.
  const group = new THREE.Group();
  const sets = [stalks.filter(near), stalks.filter((s) => !near(s))];
  const fils: number[][] = [[], [], [], []];
  let nearFils = 0;
  const discs = ctx.rig.contactDiscs(sets[0].length);
  sets.forEach((set, which) => {
    const base = new Float32Array(set.length * 4);
    const axis = new Float32Array(set.length * 4);
    const kind = new Float32Array(set.length * 4);
    set.forEach((s, i) => {
      const seed = rng.next();
      const R = (s.h > 2.6 ? 0.09 : 0.07) * s.size;
      const dx = Math.cos(s.yaw);
      const dz = -Math.sin(s.yaw);
      base.set([s.x, Math.min(0, ctx.rig.land.height(s.x, s.z)) - 0.05, s.z, s.h + 0.05], i * 4);
      axis.set([dx, dz, s.lean, R], i * 4);
      kind.set([s.kind, s.phase, s.size, seed], i * 4);
      if (which === 0) ctx.rig.setDisc(discs, i, s.x, s.z, R * 5, 0.7);
      if (s.kind === 2) return;
      // The plume: filaments in rings round the mouth, the inner ones standing and the outer ones hanging.
      const ax = [dx * Math.sin(s.lean), Math.cos(s.lean), dz * Math.sin(s.lean)];
      const h = s.h + 0.02;
      const top = [s.x + ax[0] * h, base[i * 4 + 1] + ax[1] * h, s.z + ax[2] * h];
      const count = which === 0 ? 230 : 22;
      const length = (s.kind === 0 ? 0.38 : s.kind === 3 ? 0.34 : 0.3) * s.size * (which === 0 ? 1 : 1.5);
      // Wet filaments cling: they leave the mouth each by itself and go over in locks.
      const locks = Array.from({ length: which === 0 ? 18 : count }, () => [rng.range(0, TAU), Math.pow(rng.next(), 0.7), rng.range(0.65, 1.15)] as [number, number, number]);
      for (let f = 0; f < count; f++) {
        const lock = locks[which === 0 ? rng.int(locks.length) : f] as [number, number, number];
        fils[0].push(top[0], top[1], top[2], R);
        fils[1].push(ax[0], ax[1], ax[2], s.phase);
        fils[2].push(lock[0] + rng.range(-0.11, 0.11), Math.min(1, Math.max(0, lock[1] + rng.range(-0.07, 0.07))), length * lock[2] * rng.range(0.85, 1.08), rng.next());
        fils[3].push(s.kind, seed, length, (which === 0 ? 0.0034 : 0.016) * s.size * rng.range(0.7, 1.3));
      }
      if (which === 0) nearFils = fils[0].length / 4;
    });
    const g = instanced(stemGeometry(which === 0 ? 96 : 10, which === 0 ? 14 : 7), set.length, { aBase: base, aAxis: axis, aKind: kind });
    const mesh = new THREE.Mesh(g, stemMaterial);
    mesh.frustumCulled = false;
    group.add(mesh);
  });

  // One filament: a ribbon of eight parts that the vertex shader bends and turns to the lens.
  const ribbon = new THREE.BufferGeometry();
  const rp: number[] = [];
  const ri: number[] = [];
  const PARTS_OF = 10;
  for (let i = 0; i <= PARTS_OF; i++) rp.push(-1, i / PARTS_OF, 0, 1, i / PARTS_OF, 0);
  for (let i = 0; i < PARTS_OF; i++) ri.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  ribbon.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  ribbon.setIndex(ri);
  const plumes = new THREE.Mesh(
    instanced(ribbon, fils[0].length / 4, { aTop: new Float32Array(fils[0]), aAx: new Float32Array(fils[1]), aFil: new Float32Array(fils[2]), aMore: new Float32Array(fils[3]) }),
    plumeMaterial,
  );
  plumes.frustumCulled = false;
  group.add(plumes);
  // The drops at the ends of the filaments of the near stalks.
  const quad = new THREE.BufferGeometry();
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  const beads = new THREE.Mesh(
    instanced(quad, nearFils, { aTop: new Float32Array(fils[0]), aAx: new Float32Array(fils[1]), aFil: new Float32Array(fils[2]), aMore: new Float32Array(fils[3]) }),
    new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, uSeconds }, vertexShader: BEAD_VERTEX, fragmentShader: BEAD_FRAGMENT, side: THREE.DoubleSide }),
  );
  beads.frustumCulled = false;
  group.add(beads);
  ctx.scene.add(ctx.parts.built('stalks', group));

  // The insects: most round the plumes the camera of the colony looks through, some round the one that is stuck, some over the pool.
  const swarm = ctx.rng('insects');
  const COUNT = 150;
  const home = new Float32Array(COUNT * 4);
  const rate = new Float32Array(COUNT * 4);
  const phase = new Float32Array(COUNT * 4);
  const stuck = rel(STUCK[0], STUCK[1]);
  for (let i = 0; i < COUNT; i++) {
    let p: [number, number, number];
    if (i < 80) {
      const f = swarm.range(2.6, 6.5);
      const r = swarm.range(-1.1, 1.4);
      p = [K2_AT[0] + K2_DIR[0] * f + K2_RIGHT[0] * r, swarm.range(2.3, 3.5), K2_AT[1] + K2_DIR[1] * f + K2_RIGHT[1] * r];
    } else if (i < 120) p = [stuck[0] + swarm.range(-2.5, 2.5), swarm.range(0.6, 2), stuck[1] + swarm.range(-2.5, 2.5)];
    else p = [swarm.range(-6, 6), swarm.range(0.4, 1.6), swarm.range(-6, 9)];
    home.set([p[0], p[1], p[2], swarm.range(0.2, 0.7)], i * 4);
    rate.set([swarm.range(1.2, 3.2), swarm.range(1.5, 3.6), swarm.range(1.1, 3), 0], i * 4);
    phase.set([swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(0, TAU), swarm.range(0.5, 0.8)], i * 4);
  }
  // A body of three parts with two long tails, about four centimetres; x runs forward.
  const body = new THREE.BufferGeometry();
  const bp: number[] = [];
  const bn: number[] = [];
  const bu: number[] = [];
  const bi: number[] = [];
  const spindle = (x0: number, x1: number, r: number, tone: number, bend: number): void => {
    const start = bp.length / 3;
    const RINGS = 5;
    const SIDES = 6;
    for (let i = 0; i <= RINGS; i++) {
      const u = i / RINGS;
      const rr = r * Math.sin(Math.PI * Math.min(1, Math.max(0.02, u)) ** 0.8);
      for (let j = 0; j < SIDES; j++) {
        const a = (j / SIDES) * TAU;
        bp.push(x0 + (x1 - x0) * u, Math.cos(a) * rr + bend * u * u, Math.sin(a) * rr);
        bn.push(0, Math.cos(a), Math.sin(a));
        bu.push(tone, 0);
      }
    }
    for (let i = 0; i < RINGS; i++) {
      for (let j = 0; j < SIDES; j++) {
        const a = start + i * SIDES + j;
        const b = start + i * SIDES + ((j + 1) % SIDES);
        bi.push(a, b, a + SIDES, b, b + SIDES, a + SIDES);
      }
    }
  };
  spindle(0.004, 0.016, 0.0042, 0.2, 0);
  spindle(-0.004, 0.006, 0.0052, 0.5, 0);
  spindle(-0.026, -0.002, 0.0034, 0.9, 0.004);
  spindle(-0.07, -0.024, 0.0008, 0.3, 0.012);
  spindle(-0.066, -0.024, 0.0008, 0.3, -0.004);
  body.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
  body.setAttribute('normal', new THREE.Float32BufferAttribute(bn, 3));
  body.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2));
  body.setIndex(bi);
  const wings = new THREE.BufferGeometry();
  const wp: number[] = [];
  const wu: number[] = [];
  const wi: number[] = [];
  // Two pairs: the fore wings long, the hind wings short.
  for (const [x, len, wide, z] of [[0.004, 0.034, 0.011, 1], [0.004, 0.034, 0.011, -1], [-0.003, 0.016, 0.007, 2], [-0.003, 0.016, 0.007, -2]] as [number, number, number, number][]) {
    const start = wp.length / 3;
    wp.push(x - wide * 0.4, 0, z * 0.5, x + wide * 0.6, 0, z * 0.5, x - wide * 0.5, len, z * 0.5, x + wide * 0.5, len, z * 0.5);
    wu.push(0, 0, 1, 0, 0, 1, 1, 1);
    wi.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
  }
  wings.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  wings.setAttribute('uv', new THREE.Float32BufferAttribute(wu, 2));
  wings.setIndex(wi);
  const bodies = new THREE.Mesh(
    instanced(body, COUNT, { aHome: home, aRate: rate, aPhase: phase }),
    new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, uSeconds }, vertexShader: INSECT_VERTEX, fragmentShader: INSECT_FRAGMENT, side: THREE.DoubleSide }),
  );
  const blades = new THREE.Mesh(
    instanced(wings, COUNT, { aHome: home, aRate: rate, aPhase: phase }),
    new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, uSeconds }, vertexShader: WING_VERTEX, fragmentShader: WING_FRAGMENT, side: THREE.DoubleSide, transparent: true, depthWrite: false }),
  );
  bodies.frustumCulled = false;
  blades.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('insects', bodies, blades));

  return {
    setTime: (seconds) => {
      uSeconds.value = seconds;
    },
  };
}
