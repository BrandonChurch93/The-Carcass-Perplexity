// The dead wader at the rim: the same animal as the living ones, the same skin of tubes, laid down once on its side where it fell.
// Collapsed: the trunk has sunk on its ribs, the neck and the legs lie along the rock, the tendrils are flat and matted.
import * as THREE from 'three';
import { DEAD_WADER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { HALF_H, HALF_W, curve, makeBuild } from '../waders/animal';
import { FRAGMENT, VERTEX } from '../waders/material';
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
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  /** From the animal's own metres (x toward its legs, y up from the rock, z toward its neck) to the world, laid on the ground. */
  const world = (p: V3): V3 => {
    const x = DEAD_WADER.x + (p[0] * cos + p[2] * sin) * k;
    const z = DEAD_WADER.z + (-p[0] * sin + p[2] * cos) * k;
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

  // The trunk on its side: the spine away from the legs, the flank that is up fallen in between the ribs and the hip.
  const bodyRings = 17;
  const bodySides = 16;
  const body = skin.tube(bodyRings, bodySides);
  const bodyLocal = new Float32Array(bodyRings * bodySides * 2);
  for (let i = 0; i < bodyRings; i++) {
    const t = i / (bodyRings - 1);
    const tall = curve(HALF_W, t) * k * 0.86;
    const deep = curve(HALF_H, t) * k * 1.0;
    const sunk = 0.45 * Math.exp(-(((t - 0.62) / 0.16) ** 2)) + 0.12 * Math.sin(t * 23 + 1);
    for (let s = 0; s < bodySides; s++) {
      const phi = (s / bodySides) * Math.PI * 2;
      const c = Math.cos(phi);
      const sn = Math.sin(phi);
      // Up is the first axis: what is above the middle sags, what is below lies flat on the rock.
      const up = c > 0 ? tall * c ** 0.7 * (1 - sunk * smooth(0.2, 0.9, c) * (0.5 + 0.5 * smooth(0.6, -0.4, sn))) : -tall * 0.75 * (-c) ** 0.5;
      const out = deep * (sn > 0 ? sn ** 0.8 : -((-sn) ** 0.9)) * (1 + 0.12 * smooth(0.3, -0.6, c));
      bodyLocal[(i * bodySides + s) * 2] = up;
      bodyLocal[(i * bodySides + s) * 2 + 1] = out;
    }
    for (let s = 0; s <= bodySides; s++) {
      const phi = (s / bodySides) * Math.PI * 2;
      // The around coordinate starts a quarter turn on, so that the ribs the skin draws are on the flank that is up.
      skin.describe(body, i, s, t * b.bodyLen, (phi + Math.PI / 2) * 0.32, 0.5, 0.5 + 0.5 * smooth(-0.6, 0.3, Math.cos(phi)), tall, seed, 0, t);
    }
  }
  const half = 0.5 * (b.bodyLen / k);
  laid.push({ tube: body, centre: (u) => world([0, curve(HALF_W, u) * 0.86 * 0.72, -half + 2 * half * u]), local: bodyLocal, sides: bodySides, rings: bodyRings, first: [0, 1, 0] });

  // The neck: off the chest and along the rock in a slack curve, a little flattened by its own weight.
  const neckRings = 24;
  const neckSides = 9;
  const neck = skin.tube(neckRings, neckSides);
  const neckLocal = new Float32Array(neckRings * neckSides * 2);
  const neckLine: V3[] = [[0, 0.24, half - 0.08], [-0.1, 0.14, half + 0.5], [0.02, 0.09, half + 1.1], [0.32, 0.08, half + 1.7], [0.62, 0.07, half + 2.2], [0.8, 0.06, half + 2.55]];
  for (let i = 0; i < neckRings; i++) {
    const u = i / (neckRings - 1);
    const r = b.neckR * 0.9 * (0.42 + 0.58 * (1 - u) ** 1.6 + 0.16 * smooth(0.86, 0.97, u) - 0.5 * smooth(0.97, 1, u)) * (1 + 0.5 * smooth(0.12, 0, u));
    for (let s = 0; s < neckSides; s++) {
      const phi = (s / neckSides) * Math.PI * 2;
      const rr = r * (1 + 0.1 * Math.cos(phi * 2) + 0.07 * Math.sin(phi * 3 + u * 14 + seed));
      neckLocal[(i * neckSides + s) * 2] = rr * Math.cos(phi) * (0.6 + 0.25 * (1 - u));
      neckLocal[(i * neckSides + s) * 2 + 1] = rr * Math.sin(phi) * 1.12;
    }
    for (let s = 0; s <= neckSides; s++) skin.describe(neck, i, s, u * b.neckLen, (s / neckSides) * 2 * Math.PI * r, 0.5 + 0.3 * u, 0.6 + 0.4 * smooth(-0.5, 0.5, Math.cos((s / neckSides) * Math.PI * 2)), r, seed, 1, u);
  }
  laid.push({ tube: neck, centre: (u) => world(through(neckLine, u)), local: neckLocal, sides: neckSides, rings: neckRings, first: [0, 1, 0] });

  // The legs: folded where they gave way, one pair across the other, the feet knobbed and stiff.
  const legRings = 17;
  const legSides = 7;
  const legLocal = new Float32Array(legRings * legSides * 2);
  const legRadius: number[] = [];
  for (let i = 0; i < legRings; i++) {
    const u = i / (legRings - 1);
    const thigh = 1.1 * (1 - smooth(0, 0.3, u));
    const knuckle = 0.95 * Math.exp(-(((u - 0.47) / 0.035) ** 2)) + 0.6 * Math.exp(-(((u - 0.93) / 0.03) ** 2));
    const foot = 1.3 * smooth(0.95, 1, u);
    const r = b.legR * (0.66 + thigh + knuckle + foot);
    legRadius.push(r);
    for (let s = 0; s < legSides; s++) {
      const phi = (s / legSides) * Math.PI * 2;
      legLocal[(i * legSides + s) * 2] = r * Math.cos(phi) * 0.85;
      legLocal[(i * legSides + s) * 2 + 1] = r * Math.sin(phi);
    }
  }
  const legLines: V3[][] = [
    [[0.12, 0.34, -0.42], [0.5, 0.5, -0.98], [0.76, 0.13, -1.72], [1.02, 0.08, -2.15], [1.25, 0.07, -2.58]],
    [[0.14, 0.1, -0.5], [0.62, 0.09, -1.15], [1.06, 0.085, -1.72], [1.05, 0.07, -2.25], [0.98, 0.06, -2.78]],
    [[0.14, 0.34, 0.4], [0.76, 0.32, 0.06], [1.2, 0.11, -0.58], [1.4, 0.08, -0.98], [1.56, 0.07, -1.36]],
    [[0.16, 0.1, 0.42], [0.7, 0.09, 0.5], [1.26, 0.085, 0.12], [1.52, 0.07, -0.22], [1.76, 0.06, -0.56]],
  ];
  legLines.forEach((line, j) => {
    const tube = skin.tube(legRings, legSides);
    for (let i = 0; i < legRings; i++) {
      const u = i / (legRings - 1);
      for (let s = 0; s <= legSides; s++) skin.describe(tube, i, s, u * b.legLen, (s / legSides) * 2 * Math.PI * (legRadius[i] as number), 0.5, 0.7 + 0.3 * smooth(0.1, 0.4, u), legRadius[i] as number, seed + j, 3, u);
    }
    laid.push({ tube, centre: (u) => world(through(line, u)), local: legLocal, sides: legSides, rings: legRings, first: [0, 1, 0] });
  });

  // The tendrils: stuck to the rock in a matted fan, in clumps, some crossed over others.
  const tRings = 8;
  const tSides = 4;
  const tendrilLocal = new Float32Array(tRings * tSides * 2);
  const tr = 0.017 * k;
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
  const way = Math.atan2(end[2] - before[2], end[0] - before[0]);
  for (let n = 0; n < 22; n++) {
    const tube = skin.tube(tRings, tSides);
    const clump = Math.floor(rng.next() * 5);
    const angle = way + (clump - 2) * 0.42 + rng.range(-0.22, 0.22);
    const length = b.tendrilLen / k * rng.range(0.5, 1.15);
    const bend = rng.range(-0.9, 0.9);
    const lift = 0.012 + 0.012 * rng.next();
    const line: V3[] = [];
    for (let q = 0; q <= 4; q++) {
      const v = q / 4;
      const a = angle + bend * v * v;
      const prev = line[q - 1] ?? [end[0], 0.04, end[2]];
      line.push(q === 0 ? [end[0], 0.04, end[2]] : [prev[0] + Math.cos(a) * length / 4, lift, prev[2] + Math.sin(a) * length / 4]);
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
    uniforms: { ...rig.uniforms, uPixel: { value: 0.0005 }, uSea: { value: -100 }, uDead: { value: 1 } },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('dead-wader', mesh));

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
    },
  };
}
