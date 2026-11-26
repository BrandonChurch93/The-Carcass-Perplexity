// The dead wader at the rim: the same animal as the living ones, the same one skin on the same bones, laid down once on its side where it fell.
// Collapsed: the trunk has gone flat and sunk between its ribs, the legs lie where they folded, the neck lies along the rock in a slack
// curve, the tendrils are flat and matted.
import * as THREE from 'three';
import { DEAD_WADER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { makeBuild } from '../waders/animal';
import { BONES, FETLOCK, Fields, NECK_BONES, buildBody } from '../waders/body';
import { makeFlies } from './flies';
import { makeGround } from './ground';
import { DEPTH_FRAGMENT, FRAGMENT, VERTEX } from '../waders/material';
import { Skin, type Tube } from '../waders/skin';

export const PARTS: readonly string[] = ['dead-wader'];

type V3 = [number, number, number];

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A point on a smooth line through `points` (Catmull-Rom), u from 0 to 1. */
function through(points: readonly V3[], u: number): V3 {
  const n = points.length - 1;
  const at = Math.min(n - 1e-6, Math.max(0, u * n));
  const i = Math.floor(at);
  const t = at - i;
  const p0 = points[Math.max(0, i - 1)] as V3;
  const p1 = points[i] as V3;
  const p2 = points[i + 1] as V3;
  const p3 = points[Math.min(n, i + 2)] as V3;
  const out: V3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const a = p0[c] as number;
    const b = p1[c] as number;
    const d = p2[c] as number;
    const e = p3[c] as number;
    out[c] = 0.5 * (2 * b + (d - a) * t + (2 * a - 5 * b + 4 * d - e) * t * t + (3 * b - a - 3 * d + e) * t * t * t);
  }
  return out;
}

export function create(ctx: Context): Piece {
  const { rig } = ctx;
  const k = DEAD_WADER.size;
  const rng = ctx.rng('dead-wader');
  const seed = 41.7;
  const b = makeBuild(k, seed, false, 0.0135, { chest: 1.05, belly: 1.25, sway: -0.5, gaunt: 1.35 });
  const skin = new Skin();
  // The anchor's turn is that of the stand-in, whose length lay across the animal's own axis here: the spine lies across the view from the rim.
  const turn = DEAD_WADER.turn - 1.07;
  const SHIFT = 0.9;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  /** From the animal's own metres (x toward its legs, y up from the rock, z toward its neck) to the world, laid on the ground. */
  const world = (p: V3): V3 => {
    // The anchor is under its chest, not its middle: the whole of it, with the fan of its tendrils, is inside the frame of the rim's picture.
    const x = DEAD_WADER.x + (p[0] * cos + (p[2] - SHIFT) * sin) * k;
    const z = DEAD_WADER.z + (-p[0] * sin + (p[2] - SHIFT) * cos) * k;
    return [x, rig.land.height(x, z) + p[1] * k, z];
  };

  interface Laid {
    tube: Tube;
    centre: (u: number) => V3;
    local: Float32Array;
    sides: number;
    rings: number;
    /** The axis in the ring's plane that the first local offset lies along; the other is the tangent crossed with it. */
    first: V3;
  }
  const laid: Laid[] = [];

  // The animal, as the living ones are built, and its bones laid down. Its own metres here: x toward its legs, y up from the rock, z toward
  // its neck. It lies on its right side: its back is toward -x, its right side is on the rock.
  const body = buildBody(b, b.cell * k);
  const fields = new Fields(b);
  const blob = skin.blob(body.count, body.index);
  for (let v = 0; v < body.count; v++) {
    skin.describeAt(
      blob.start + v,
      [body.rest[v * 3] as number, body.rest[v * 3 + 1] as number, body.rest[v * 3 + 2] as number],
      [body.restN[v * 3] as number, body.restN[v * 3 + 1] as number, body.restN[v * 3 + 2] as number],
      [body.ribS[v] as number, body.cage[v] as number],
      [body.legT[v] as number, body.shade[v] as number, body.radius[v] as number, seed],
      [4, body.neckU[v] as number],
    );
  }
  const O = new Float32Array(BONES * 3);
  const E = new Float32Array(BONES * 9);
  const bone = (i: number, o: V3, e1: V3, e2: V3, e3: V3): void => {
    O.set(o, i * 3);
    E.set(e1, i * 9);
    E.set(e2, i * 9 + 3);
    E.set(e3, i * 9 + 6);
  };
  const unit = (a: V3): V3 => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const cross = (a: V3, c: V3): V3 => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
  // The trunk: what was round has gone flat under its own weight. Its middle is this high off the rock; it is rolled a little toward its belly.
  const FLAT = 0.6;
  const MID = 0.105 * k;
  const ROLL = 0.22;
  const F: V3 = [0, 0, 1];
  const U: V3 = [-Math.cos(ROLL), Math.sin(ROLL), 0];
  const R: V3 = [-Math.sin(ROLL), -Math.cos(ROLL), 0];
  bone(0, [0, MID, 0], F, U, [R[0] * FLAT, R[1] * FLAT, R[2] * FLAT]);
  /** A place on the animal at rest (fore, up, right), where the trunk's bone puts it. */
  const onTrunk = (f: number, u: number, r: number): V3 => [U[0] * u + R[0] * FLAT * r, MID + U[1] * u + R[1] * FLAT * r, f];

  // The legs: each is where it folded. A limb is given by the bearing of its two bones on the rock (radians from +x toward +z) and by how
  // high its joint stands; the feet lie on the rock.
  const l1 = b.legLen * b.knee;
  const l2 = b.legLen * (FETLOCK - b.knee);
  const l3 = b.legLen * (1 - FETLOCK);
  // Left hind (uppermost): its joint stands up, tented. Left fore: across the other. Right hind and right fore: flat under them.
  const LIMBS: { thigh: number; shank: number; joint: number; hoof: number }[] = [
    { thigh: 0.42, shank: -0.78, joint: 0.3, hoof: -0.5 },
    { thigh: -0.5, shank: -1.02, joint: 0.1, hoof: -1.3 },
    { thigh: -0.12, shank: -0.52, joint: 0.045, hoof: -0.3 },
    { thigh: 0.3, shank: -0.74, joint: 0.045, hoof: -1.0 },
  ];
  const legLines: V3[][] = [];
  LIMBS.forEach((limb, j) => {
    const h = fields.hips[j] as V3;
    const hip = onTrunk(h[0], h[1], h[2]);
    const span = (from: V3, to: number, bearing: number, length: number): V3 => {
      const fall = Math.max(-0.95, Math.min(0.95, (to - from[1]) / length));
      const flat = Math.sqrt(1 - fall * fall);
      return [Math.cos(bearing) * flat, fall, Math.sin(bearing) * flat];
    };
    const d1 = span(hip, limb.joint * k, limb.thigh, l1);
    const joint: V3 = [hip[0] + d1[0] * l1, hip[1] + d1[1] * l1, hip[2] + d1[2] * l1];
    const d2 = span(joint, 0.03 * k, limb.shank, l2);
    const fet: V3 = [joint[0] + d2[0] * l2, joint[1] + d2[1] * l2, joint[2] + d2[2] * l2];
    const d3: V3 = unit([Math.cos(limb.hoof), -0.08, Math.sin(limb.hoof)]);
    const frame = (at: number, o: V3, a: V3): void => {
      const dt = R[0] * a[0] + R[1] * a[1] + R[2] * a[2];
      const across = unit([R[0] - dt * a[0], R[1] - dt * a[1], R[2] - dt * a[2]]);
      const third = cross(a, across);
      bone(at, o, across, a, [-third[0], -third[1], -third[2]]);
    };
    frame(1 + j, hip, d1);
    frame(5 + j, joint, d2);
    frame(9 + j, fet, d3);
    const end: V3 = [fet[0] + d3[0] * l3, fet[1] + d3[1] * l3, fet[2] + d3[2] * l3];
    const inK = (p: V3): V3 => [p[0] / k, p[1] / k, p[2] / k];
    legLines.push([inK(hip), inK(joint), inK(fet), inK(end)]);
  });

  // The neck: off the chest, down onto the rock, and along it in a slack curve; a little flattened by its own weight.
  const seg = b.neckLen / NECK_BONES;
  const nb = fields.neckBase;
  let at = onTrunk(nb[0], nb[1], nb[2]);
  const neckLine: V3[] = [];
  const neckAt: V3[] = [];
  let endDir: V3 = [0, 0, 1];
  for (let i = 0; i < NECK_BONES; i++) {
    const u = (i + 0.5) / NECK_BONES;
    // The bearing of the neck on the rock, radians from +z toward -x: it leaves toward the back, swings across and ends toward the legs.
    const bearing = 0.8 * Math.cos(u * 3.5) + 0.12 * Math.sin(u * 9 + 1);
    const lie = Math.max(0.5 * fields.neckRadius((i + 1) / NECK_BONES), 0.022 * k);
    const fall = Math.max(-0.6, Math.min(0.2, (lie - at[1]) / seg));
    const flat = Math.sqrt(1 - fall * fall);
    const a: V3 = [-Math.sin(bearing) * flat, fall, Math.cos(bearing) * flat];
    // Across the neck is the animal's right, which is down here: the neck is flattened on that axis.
    const dt = R[0] * a[0] + R[1] * a[1] + R[2] * a[2];
    const across = unit([R[0] - dt * a[0], R[1] - dt * a[1], R[2] - dt * a[2]]);
    const third = cross(a, across);
    const press = 0.62 + 0.3 * (1 - smooth(0, 0.3, u));
    bone(13 + i, at, [across[0] * press, across[1] * press, across[2] * press], a, [third[0] * 1.12, third[1] * 1.12, third[2] * 1.12]);
    neckAt.push(at);
    neckLine.push([at[0] / k, at[1] / k, at[2] / k]);
    at = [at[0] + a[0] * seg, at[1] + a[1] * seg, at[2] + a[2] * seg];
    endDir = a;
  }
  neckLine.push([at[0] / k, at[1] / k, at[2] / k]);
  const half = 0.5 * (b.bodyLen / k);

  // The tendrils: stuck to the rock in a matted fan, in clumps, some crossed over others.
  const tRings = 10;
  const tSides = 4;
  const tendrilLocal = new Float32Array(tRings * tSides * 2);
  const tr = 0.009 * k;
  for (let i = 0; i < tRings; i++) {
    const u = i / (tRings - 1);
    const r = tr * (1 - 0.7 * u ** 1.4);
    for (let s = 0; s < tSides; s++) {
      const phi = (s / tSides) * Math.PI * 2;
      tendrilLocal[(i * tSides + s) * 2] = r * Math.cos(phi) * 0.6;
      tendrilLocal[(i * tSides + s) * 2 + 1] = r * Math.sin(phi) * 1.3;
    }
  }
  const end = neckLine[neckLine.length - 1] as V3;
  const before = neckLine[neckLine.length - 2] as V3;
  const way = Math.atan2(end[2] - before[2], end[0] - before[0]) - 0.1;
  for (let n = 0; n < 150; n++) {
    const tube = skin.tube(tRings, tSides);
    const clump = Math.floor(rng.next() * 7);
    const angle = way + (clump - 3) * 0.2 + rng.range(-0.2, 0.2);
    const length = b.tendrilLen / k * rng.range(0.6, 1.7);
    const bend = rng.range(-0.8, 0.8);
    const lift = 0.014 + 0.03 * rng.next() ** 3;
    const line: V3[] = [];
    const kink = rng.range(0, 6.28);
    for (let q = 0; q <= 6; q++) {
      const v = q / 6;
      // Each lies as it dried: wavy, like a root.
      const a = angle + bend * v * v + 0.55 * Math.sin(q * 1.7 + kink) * (0.4 + 0.6 * v);
      const prev = line[q - 1] ?? [end[0], 0.04, end[2]];
      line.push(q === 0 ? [end[0], 0.04, end[2]] : [prev[0] + (Math.cos(a) * length) / 6, lift, prev[2] + (Math.sin(a) * length) / 6]);
    }
    const tone = rng.next();
    const tseed = seed + n;
    for (let i = 0; i < tRings; i++) {
      const u = i / (tRings - 1);
      for (let s = 0; s <= tSides; s++) skin.describe(tube, i, s, u * length, (s / tSides) * 0.1, tone, 0.8, tr * (1 - 0.7 * u ** 1.4), tseed, 2, u);
    }
    laid.push({ tube, centre: (u) => world(through(line, u)), local: tendrilLocal, sides: tSides, rings: tRings, first: [0, 1, 0] });
  }

  const geometry = skin.build();
  // The one skin follows its bones, as a living one's does; then it gives way: it sinks between the ribs and into the pit of the flank,
  // hangs in slack folds, and whatever of it reaches the rock lies flat on it.
  {
    const own = new Float32Array(body.count * 3);
    const { weight, local, cage, ribS, rest } = body;
    for (let v = 0; v < body.count; v++) {
      let x = 0;
      let y = 0;
      let z = 0;
      let wT = 0;
      for (let n = 0; n < 3; n++) {
        const w = weight[v * 3 + n] as number;
        if (w === 0) continue;
        const id = body.bone[v * 3 + n] as number;
        if (id === 0) wT += w;
        const i = id * 9;
        const j = id * 3;
        const q = v * 9 + n * 3;
        const a = local[q] as number;
        const c = local[q + 1] as number;
        const d = local[q + 2] as number;
        x += w * ((O[j] as number) + (E[i] as number) * a + (E[i + 3] as number) * c + (E[i + 6] as number) * d);
        y += w * ((O[j + 1] as number) + (E[i + 1] as number) * a + (E[i + 4] as number) * c + (E[i + 7] as number) * d);
        z += w * ((O[j + 2] as number) + (E[i + 2] as number) * a + (E[i + 5] as number) * c + (E[i + 8] as number) * d);
      }
      // The side of the trunk that faces up is its left: negative on the animal's right axis.
      const f = (rest[v * 3] as number) / k;
      const u = (rest[v * 3 + 1] as number) / k;
      const top = smooth(0.0, 0.1, -(rest[v * 3 + 2] as number) / k) * wT;
      const rib = (0.5 + 0.5 * Math.cos((ribS[v] as number) * Math.PI * 2)) ** 1.4;
      const ribbed = cage[v] as number;
      const pit = Math.exp(-(((f + 0.12) / 0.16) ** 2)) * smooth(-0.3, 0.02, u) * smooth(0.2, 0.08, u);
      const belly = smooth(0.0, -0.22, u) * smooth(0.3, -0.1, f);
      const fold = Math.sin(f * 31 + 3 * Math.sin(u * 17 + f * 5) + seed) * 0.5 + Math.sin(f * 67 + u * 41) * 0.25;
      y -= top * k * (0.02 * ribbed * (1 - rib) + 0.05 * pit + 0.04 * belly * (1 - ribbed) - 0.008 * fold * (1 - 0.6 * ribbed));
      const floor = 0.012 * k;
      if (y < floor) y = floor - (floor - y) * 0.04;
      own[v * 3] = x;
      own[v * 3 + 1] = y;
      own[v * 3 + 2] = z;
    }
    const p = skin.position;
    const nrm = skin.normal;
    const start = blob.start * 3;
    for (let v = 0; v < body.count; v++) {
      const w = world([(own[v * 3] as number) / k, (own[v * 3 + 1] as number) / k, (own[v * 3 + 2] as number) / k]);
      p.set(w, start + v * 3);
      nrm[start + v * 3] = 0;
      nrm[start + v * 3 + 1] = 0;
      nrm[start + v * 3 + 2] = 0;
    }
    const ix = body.index;
    for (let t = 0; t < ix.length; t += 3) {
      const a = start + (ix[t] as number) * 3;
      const c = start + (ix[t + 1] as number) * 3;
      const d = start + (ix[t + 2] as number) * 3;
      const e1x = (p[c] as number) - (p[a] as number);
      const e1y = (p[c + 1] as number) - (p[a + 1] as number);
      const e1z = (p[c + 2] as number) - (p[a + 2] as number);
      const e2x = (p[d] as number) - (p[a] as number);
      const e2y = (p[d + 1] as number) - (p[a + 1] as number);
      const e2z = (p[d + 2] as number) - (p[a + 2] as number);
      const fx = e1y * e2z - e1z * e2y;
      const fy = e1z * e2x - e1x * e2z;
      const fz = e1x * e2y - e1y * e2x;
      for (const o of [a, c, d]) {
        nrm[o] = (nrm[o] as number) + fx;
        nrm[o + 1] = (nrm[o + 1] as number) + fy;
        nrm[o + 2] = (nrm[o + 2] as number) + fz;
      }
    }
    for (let v = 0; v < body.count; v++) {
      const o = start + v * 3;
      const l = Math.hypot(nrm[o] as number, nrm[o + 1] as number, nrm[o + 2] as number) || 1;
      nrm[o] = (nrm[o] as number) / l;
      nrm[o + 1] = (nrm[o + 1] as number) / l;
      nrm[o + 2] = (nrm[o + 2] as number) / l;
    }
  }
  for (const l of laid) {
    for (let i = 0; i < l.rings; i++) {
      const u = i / (l.rings - 1);
      const c = l.centre(u);
      const a = l.centre(Math.max(0, u - 0.02));
      const d = l.centre(Math.min(1, u + 0.02));
      let tx = d[0] - a[0];
      let ty = d[1] - a[1];
      let tz = d[2] - a[2];
      const tl = Math.hypot(tx, ty, tz) || 1;
      tx /= tl;
      ty /= tl;
      tz /= tl;
      // The first axis is up, squared to the line; the second is the line crossed with it, so the skin faces outward.
      const dot = l.first[0] * tx + l.first[1] * ty + l.first[2] * tz;
      let nx = l.first[0] - tx * dot;
      let ny = l.first[1] - ty * dot;
      let nz = l.first[2] - tz * dot;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const bx = ty * nz - tz * ny;
      const by = tz * nx - tx * nz;
      const bz = tx * ny - ty * nx;
      skin.ring(l.tube, i, c[0], c[1], c[2], nx, ny, nz, bx, by, bz, l.local, i * l.sides * 2);
    }
    skin.normals(l.tube);
  }
  skin.touch();

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...rig.uniforms,
      tHide: { value: ctx.assets.texture('mat/skin.jpg') },
      tHideNh: { value: ctx.assets.texture('mat/skin-nh.png', { kind: 'data' }) },
      uPixel: { value: 0.0005 },
      uSea: { value: -100 },
      uDead: { value: 1 },
      uMirror: { value: 0 },
    },
    side: THREE.DoubleSide,
  });
  material.userData.depthFragment = DEPTH_FRAGMENT;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  // What it has left on the rock: the stain it lies in, a line of salt where that dried, and the grit that has gathered against it.
  const lines: V3[][] = [[[0, 0, -half], [0, 0, half]], neckLine, ...legLines];
  const ground = makeGround(ctx, world, lines, k);
  const group = new THREE.Group();
  group.add(mesh, ground.group);
  // Flies: over the belly, the hip, the root of the neck and the mop.
  const flyRng = ctx.rng('dead-wader-flies');
  const flies = makeFlies(46, [world([0.1, 0.25, -0.3]), world([0.1, 0.25, 0.25]), world([0.0, 0.3, -0.6]), world([-0.2, 0.15, half + 0.4]), world([0.3, 0.08, half + 1.9]), world([0.6, 0.1, -0.5])], () => flyRng.next(), rig.uniforms);
  group.add(flies.mesh);
  ctx.scene.add(ctx.parts.built('dead-wader', group));

  // It has lain here: the rock under it is in its shade and damp.
  const spots: [V3, number, number][] = [
    [[0, 0, 0], 0.7, 0.9],
    [[0, 0, 0.5], 0.5, 0.8],
    [[0, 0, -0.5], 0.5, 0.8],
    [[0, 0, half + 0.8], 0.3, 0.7],
    [[0.3, 0, half + 1.7], 0.3, 0.6],
    [[0.9, 0, half + 2.9], 0.5, 0.55],
    [[0.8, 0, -0.3], 0.5, 0.55],
    [[0.8, 0, -1.5], 0.5, 0.55],
    [[1.1, 0, -2.4], 0.5, 0.45],
  ];
  const discs = rig.contactDiscs(spots.length);
  spots.forEach(([p, radius, strength], i) => {
    const w = world(p);
    rig.setDisc(discs, i, w[0], w[2], radius * k, strength);
  });

  return {
    setTime: (seconds) => flies.setTime(seconds),
    dispose: () => {
      flies.dispose();
      geometry.dispose();
      material.dispose();
      ground.dispose();
    },
  };
}
