// The dead wader at the rim: the same animal as the living ones, the same skin of tubes, laid down once on its side where it fell.
// Collapsed: the trunk has sunk on its ribs, the neck and the legs lie along the rock, the tendrils are flat and matted.
import * as THREE from 'three';
import { DEAD_WADER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { bodyHalfH, bodyHalfW, makeBuild } from '../waders/animal';
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
  const b = makeBuild(k, seed, false);
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

  // The trunk on its side, some days dead: what was round has gone flat, the skin has sunk between the ribs and into the pit of the flank
  // behind them, and the hip and the spine stand out of it.
  const bodyRings = 96;
  const bodySides = 30;
  const body = skin.tube(bodyRings, bodySides);
  const bodyLocal = new Float32Array(bodyRings * bodySides * 2);
  const RIBS = 6;
  const ROLL = 0.42;
  /** The skin at a place on the trunk: how far up from the axis and how far out toward the spine, metres, and how much of the sky it sees. */
  const flank = (t: number, phi: number): [number, number, number] => {
    const c = Math.cos(phi);
    const sn = Math.sin(phi);
    const tall = bodyHalfW(t) * k;
    const deep = bodyHalfH(t) * k;
    const top = Math.max(c, 0);
    // The cage: nine ribs that lean back as they go down from the spine; nothing of them toward the belly or near the two ends.
    const cage = smooth(0.42, 0.5, t) * smooth(0.95, 0.86, t) * smooth(0.05, 0.4, top) * smooth(-0.75, -0.2, sn) * smooth(1, 0.8, sn);
    const at = ((t - 0.44 + 0.09 * (1 - sn) * 0.5 + 0.012 * Math.sin(t * 47 + sn * 5)) / 0.5) * RIBS;
    const rib = (0.5 + 0.5 * Math.cos(at * Math.PI * 2)) ** 3;
    // The pit between the last rib and the hip, where there is nothing under the skin at all.
    const pit = Math.exp(-(((t - 0.31) / 0.1) ** 2)) * smooth(0, 0.5, top) * smooth(0.95, 0.3, Math.abs(sn));
    // The hip: a blade of bone under the skin, and the head of the thigh below it.
    const hip = Math.exp(-(((t - 0.17) / 0.045) ** 2)) * Math.exp(-(((sn - 0.25) / 0.45) ** 2)) * smooth(0, 0.4, top);
    const blade = Math.exp(-(((t - 0.86) / 0.05) ** 2)) * Math.exp(-(((sn - 0.3) / 0.4) ** 2)) * smooth(0, 0.4, top);
    // The spine: a row of knuckles along the edge that is away from the legs.
    const spine = smooth(0.72, 0.97, sn) * smooth(0.06, 0.18, t) * smooth(0.97, 0.85, t);
    const knuckle = spine * (0.5 + 0.5 * Math.cos(t * 26 * Math.PI * 2)) ** 2;
    const slack = (0.012 * k * Math.sin(t * 61 + sn * 9 + 2 * Math.sin(phi * 3 + t * 17)) * smooth(0.2, 0.9, Math.abs(sn)) + 0.02 * k * Math.sin(t * 19 + 3 * Math.sin(phi * 2 + t * 7) + sn * 4)) * (1 - 0.6 * cage);
    let up: number;
    if (c > 0) {
      up = tall * 2.5 * c ** 0.7 * (1 - 0.7 * pit) + cage * k * (0.022 * rib - 0.01) * (0.5 + 0.5 * Math.sin(t * 23 + 1.3) ** 2) * (0.6 + 0.4 * Math.sin(sn * 7 + t * 31)) + k * (0.05 * hip + 0.03 * blade) + 0.012 * k * knuckle + slack * top;
    } else {
      // What lies on the rock is flat on it.
      up = -tall * 0.42 * (-c) ** 0.45;
    }
    const drawn = sn > 0 ? 1 : 1 - 0.3 * smooth(0.6, 0.25, t) * -sn;
    const out = 1.25 * deep * (sn > 0 ? sn ** 0.8 : -((-sn) ** 0.9)) * drawn * (1 + 0.1 * smooth(0.3, -0.6, c)) + 0.014 * k * knuckle;
    const seen = (c > 0 ? 1 : 0.25 + 0.75 * smooth(-0.5, 0, c)) * (1 - 0.62 * cage * (1 - rib)) * (1 - 0.45 * pit) * (1 - 0.3 * spine * (1 - knuckle));
    // It lies rolled a little onto its belly's edge, so the spine is the high line of it and the flank faces away from the legs' side less.
    const rolled = up * Math.cos(ROLL) + out * Math.sin(ROLL);
    return [Math.max(rolled, -tall * 0.42), out * Math.cos(ROLL) - Math.max(up, 0) * Math.sin(ROLL), seen];
  };
  const along = (i: number): number => i / (bodyRings - 1);
  for (let i = 0; i < bodyRings; i++) {
    // Closed and round at both ends, the rings even between.
    const t = 0.004 + 0.992 * along(i);
    for (let s = 0; s < bodySides; s++) {
      const [up, out] = flank(t, (s / bodySides) * Math.PI * 2);
      bodyLocal[(i * bodySides + s) * 2] = up;
      bodyLocal[(i * bodySides + s) * 2 + 1] = out;
    }
    for (let s = 0; s <= bodySides; s++) {
      const phi = (s / bodySides) * Math.PI * 2;
      const seen = flank(t, phi)[2];
      skin.describe(body, i, s, t * b.bodyLen, phi * 0.32, 0.5, seen, bodyHalfW(t) * k, seed, 0, t);
    }
  }
  const half = 0.64 * (b.bodyLen / k);
  const lie = (u: number): number => bodyHalfW(u) * 0.42 - 0.012;
  laid.push({ tube: body, centre: (u) => world([0, lie(0.004 + 0.992 * u), -half + 2 * half * u]), local: bodyLocal, sides: bodySides, rings: bodyRings, first: [0, 1, 0] });

  // The neck: off the chest and along the rock in a slack curve, a little flattened by its own weight.
  const neckRings = 40;
  const neckSides = 9;
  const neck = skin.tube(neckRings, neckSides);
  const neckLocal = new Float32Array(neckRings * neckSides * 2);
  const neckLine: V3[] = [[-0.02, 0.15, half - 0.14], [-0.3, 0.11, half + 0.26], [-0.36, 0.095, half + 0.7], [-0.1, 0.085, half + 1.04], [0.24, 0.075, half + 1.32], [0.36, 0.065, half + 1.64], [0.3, 0.055, half + 1.94]];
  for (let i = 0; i < neckRings; i++) {
    const u = i / (neckRings - 1);
    // The skin of the neck has dried in rings on the cords inside it.
    const r = b.neckR * 2.0 * (0.5 + 0.5 * (1 - u) ** 1.6 + 0.16 * smooth(0.86, 0.97, u) - 0.5 * smooth(0.97, 1, u)) * (1 + 0.6 * smooth(0.12, 0, u)) * (1 + 0.07 * Math.sin(u * 150 + 2 * Math.sin(u * 23)));
    for (let s = 0; s < neckSides; s++) {
      const phi = (s / neckSides) * Math.PI * 2;
      const rr = r * (1 + 0.1 * Math.cos(phi * 2) + 0.07 * Math.sin(phi * 3 + u * 14 + seed));
      neckLocal[(i * neckSides + s) * 2] = rr * Math.cos(phi) * (Math.cos(phi) > 0 ? 0.62 : 0.4);
      neckLocal[(i * neckSides + s) * 2 + 1] = rr * Math.sin(phi) * 1.2;
    }
    for (let s = 0; s <= neckSides; s++) skin.describe(neck, i, s, u * b.neckLen, (s / neckSides) * 2 * Math.PI * r, 0.5 + 0.3 * u, 0.6 + 0.4 * smooth(-0.5, 0.5, Math.cos((s / neckSides) * Math.PI * 2)), r, seed, 1, u);
  }
  laid.push({ tube: neck, centre: (u) => world(through(neckLine, u)), local: neckLocal, sides: neckSides, rings: neckRings, first: [0, 1, 0] });

  // The legs: folded where they gave way, one pair across the other, the feet knobbed and stiff.
  const legRings = 25;
  const legSides = 8;
  const legLocal = new Float32Array(legRings * legSides * 2);
  const legRadius: number[] = [];
  for (let i = 0; i < legRings; i++) {
    const u = i / (legRings - 1);
    const thigh = 2.2 * (1 - smooth(0, 0.48, u)) ** 0.8;
    const knuckle = 0.75 * Math.exp(-(((u - 0.5) / 0.035) ** 2)) + 0.4 * Math.exp(-(((u - 0.93) / 0.03) ** 2));
    const foot = 0.8 * smooth(0.95, 1, u);
    const r = 0.037 * k * (1.0 + thigh * 0.9 + knuckle + foot * 1.1) * (1 + 0.08 * Math.sin(u * 40)) * (1 - 0.6 * smooth(0.985, 1, u)) * (0.45 + 0.55 * smooth(0, 0.08, u));
    legRadius.push(r);
    for (let s = 0; s < legSides; s++) {
      const phi = (s / legSides) * Math.PI * 2;
      legLocal[(i * legSides + s) * 2] = r * Math.cos(phi) * 0.85;
      legLocal[(i * legSides + s) * 2 + 1] = r * Math.sin(phi);
    }
  }
  // Each leg is two straight bones: hip, joint, foot. The line through them turns sharply at the joint.
  const bones: [V3, V3, V3][] = [
    // Hind, upper: off the hip, the joint out on the rock toward the lens, the shank back along it; hind, under: beneath it.
    [[-0.02, 0.2, -0.4], [0.66, 0.5, -0.16], [1.3, 0.06, -0.78]],
    [[0.0, 0.07, -0.46], [0.82, 0.075, -0.98], [1.42, 0.05, -1.66]],
    // Fore, upper: folded at the joint, the shank back under itself; fore, under: bent beneath the chest.
    [[-0.02, 0.17, 0.42], [0.9, 0.12, 0.06], [0.4, 0.055, -0.6]],
    [[0.0, 0.07, 0.48], [0.78, 0.075, 0.5], [0.94, 0.05, -0.3]],
  ];
  const mixed = (a: V3, c: V3, t: number): V3 => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
  const legLines: V3[][] = bones.map(([hip, joint, foot]) => [hip, mixed(hip, joint, 0.5), mixed(hip, joint, 0.94), mixed(joint, foot, 0.06), mixed(joint, foot, 0.5), foot]);
  legLines.forEach((line, j) => {
    const tube = skin.tube(legRings, legSides);
    for (let i = 0; i < legRings; i++) {
      const u = i / (legRings - 1);
      for (let s = 0; s <= legSides; s++) skin.describe(tube, i, s, u * b.legLen, (s / legSides) * 2 * Math.PI * (legRadius[i] as number), 0.5, 0.7 + 0.3 * smooth(0.1, 0.4, u), legRadius[i] as number, seed + j, 3, u);
    }
    laid.push({ tube, centre: (u) => world(through(line, u)), local: legLocal, sides: legSides, rings: legRings, first: [0, 1, 0] });
  });

  // The tendrils: stuck to the rock in a matted fan, in clumps, some crossed over others.
  const tRings = 10;
  const tSides = 4;
  const tendrilLocal = new Float32Array(tRings * tSides * 2);
  const tr = 0.015 * k;
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
  for (let n = 0; n < 96; n++) {
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

  // Weed the tide left on it: dark strands over the flank and the neck, their ends on the rock.
  const weedLocal = new Float32Array(tRings * tSides * 2);
  for (let i = 0; i < tRings; i++) {
    for (let s = 0; s < tSides; s++) {
      const phi = (s / tSides) * Math.PI * 2;
      weedLocal[(i * tSides + s) * 2] = 0.003 * k * Math.cos(phi);
      weedLocal[(i * tSides + s) * 2 + 1] = 0.007 * k * Math.sin(phi);
    }
  }
  for (let n = 0; n < 14; n++) {
    const tube = skin.tube(tRings, tSides);
    const t0 = rng.range(0.14, 0.9);
    const slant = rng.range(-0.16, 0.16);
    const from = rng.range(-1.3, -0.7);
    const to = rng.range(0.6, 1.3);
    const tail = rng.range(0.1, 0.45);
    const line: V3[] = [];
    for (let q = 0; q <= 6; q++) {
      const phi = from + ((to - from) * q) / 6;
      const t = Math.min(0.97, Math.max(0.03, t0 + slant * phi));
      const [up, out] = flank(t, phi);
      // Past the edge of the trunk it lies on the rock.
      const off = Math.max(0, Math.abs(phi) - 1.45);
      line.push([-(out / k) * (1 + 1.4 * off) - Math.sign(phi) * tail * off, Math.max(0.012, lie(t) + up / k + 0.012 - 0.5 * off), -half + 2 * half * t]);
    }
    for (let i = 0; i < tRings; i++) {
      const u = i / (tRings - 1);
      // A tone of 2 and over is weed to the skin's shader.
      for (let s = 0; s <= tSides; s++) skin.describe(tube, i, s, u, (s / tSides) * 0.1, 2, 0.8, 0.012 * k, seed + 100 + n, 2, u);
    }
    laid.push({ tube, centre: (u) => world(through(line, u)), local: weedLocal, sides: tSides, rings: tRings, first: [0, 1, 0] });
  }

  const geometry = skin.build();
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
    dispose: () => {
      geometry.dispose();
      material.dispose();
      ground.dispose();
    },
  };
}
