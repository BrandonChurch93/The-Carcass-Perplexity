// The loose rock of the land: pebbles, stones and blocks on the camera's bench, slabs slumped over the line, fallen blocks on the aprons of the wall.
// Every rock is one of a few shapes, turned, squashed and sunk into the ground, with a shade under it in the rig's contact map.
import * as THREE from 'three';
import { MOUTH, SHORE_POINTS, VIEW, benchDistance, calderaDistance } from '../layout';
import type { HeartContext } from '../shared/context';
import { SKERRY, lineOpen, linePathDistance, noise, routeDistance, widePath } from './height';
import { rockShape, type Height } from './meshes';
import { ROCK_FRAGMENT, ROCK_VERTEX } from './shaders';

interface Rock {
  m: THREE.Matrix4;
  seed: [number, number, number, number];
}

interface Kind {
  cells: number;
  planes: number;
  part: 'bench' | 'land';
  /** Small or far: drawn from two reads of the rock picture and no relief. */
  simple: boolean;
  rocks: Rock[][];
}

const SHAPES = 5;

export function scatterRocks(ctx: HeartContext, shared: Record<string, THREE.IUniform>, height: Height): { bench: THREE.Object3D[]; land: THREE.Object3D[]; dispose(): void } {
  const rng = ctx.rng('land/rocks');
  const kind = (cells: number, planes: number, part: 'bench' | 'land', simple = false): Kind => ({ cells, planes, part, simple, rocks: Array.from({ length: SHAPES }, () => []) });
  const kinds = {
    pebble: kind(2, 6, 'bench', true),
    stone: kind(3, 7, 'bench', true),
    block: kind(5, 8, 'bench'),
    hero: kind(9, 9, 'bench'),
    slab: kind(6, 7, 'bench'),
    boulder: kind(4, 8, 'land', true),
    // The same rocks far from every lens: a few pixels each, so few triangles and the plain reading.
    blockFar: kind(3, 7, 'bench', true),
    heroFar: kind(5, 8, 'bench', true),
    slabFar: kind(3, 7, 'bench', true),
    boulderSmall: kind(2, 7, 'land', true),
    boulderMid: kind(3, 8, 'land', true),
  };
  const shades: [number, number, number, number][] = [];

  const q = new THREE.Quaternion();
  const tilt = new THREE.Quaternion();
  const axis = new THREE.Vector3();
  const at = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  interface Options {
    flat?: number;
    sink?: number;
    lean?: [number, number, number];
    onLake?: boolean;
    shade?: boolean;
    /** Allowed to stand up in the open part of the line view. */
    stand?: boolean;
  }
  const put = (kind0: Kind, x: number, z: number, size: number, o: Options = {}): boolean => {
    let k = kind0;
    const reach = routeDistance(x, z);
    if (k === kinds.block && reach > 30 + 25 * size) k = kinds.blockFar;
    else if (k === kinds.hero && reach > 40 + 25 * size) k = kinds.heroFar;
    else if (k === kinds.slab && reach > 40 + 20 * size) k = kinds.slabFar;
    else if (k === kinds.stone && reach > 50) k = kinds.pebble;
    else if (k === kinds.boulder && size < 4) k = size < 2 ? kinds.boulderSmall : kinds.boulderMid;
    const g = height(x, z);
    if (g < 0.05 && !o.onLake) return false;
    const base = Math.max(g, 0.04);
    const half = size / 2;
    const flat = o.flat ?? rng.range(0.5, 0.95);
    scale.set(half * rng.range(0.85, 1.3), half * flat, half * rng.range(0.8, 1.15));
    const sink = o.sink ?? rng.range(0.22, 0.55);
    at.set(x, base + 0.75 * scale.y * (1 - 2 * sink), z);
    // The cameras' room: nothing within 3 m of the wide view's lens, nothing over 0.7 m under the line view's lens,
    // nothing standing up where the line view shows the mouth and the channel.
    const top = at.y + scale.y;
    const [off, lens] = widePath(x, z);
    if (Math.hypot(Math.max(0, off - half * 1.3), Math.max(0, lens - top)) < 3.2) return false;
    if (linePathDistance(x, z) < 1.5 + half * 1.3 && top > 0.68) return false;
    if (!o.stand && top > 1.3 && lineOpen(x, z)) return false;
    // The line view's channel leaves the shore just ahead of its lens: nothing of the bench's lies on the moving crust there.
    if (!o.stand && lineOpen(x, z) && benchDistance(x, z) < (size > 0.45 ? 0.7 : 0.12) + half && Math.hypot(x + 510.5, z - 215.5) < 45) return false;
    q.setFromAxisAngle(UP, rng.range(0, Math.PI * 2));
    if (o.lean) {
      axis.set(o.lean[0], 0, o.lean[1]).normalize();
      tilt.setFromAxisAngle(axis, o.lean[2]);
    } else {
      const a = rng.range(0, Math.PI * 2);
      axis.set(Math.cos(a), 0, Math.sin(a));
      tilt.setFromAxisAngle(axis, rng.range(-0.4, 0.4));
    }
    q.premultiply(tilt);
    (k.rocks[rng.int(SHAPES)] as Rock[]).push({ m: new THREE.Matrix4().compose(at, q, scale), seed: [rng.next(), size, base, rng.range(0.7, 1.2)] });
    if (o.shade ?? size > 0.3) shades.push([x, z, half * 1.5, Math.min(0.75, 0.35 + 0.25 * size)]);
    return true;
  };
  // Sizes follow a power law: many small, few large.
  const sized = (lo: number, hi: number, power = 2.2): number => lo * Math.pow(hi / lo, Math.pow(rng.next(), power));
  // Rocks lie in drifts and leave bare lava between.
  const drift = (x: number, z: number, cell: number): number => noise(x / cell + 13, z / cell + 5);
  // Nothing may stand where the camera passes: the nearer the route, the smaller the rock.
  const fits = (x: number, z: number, size: number): boolean => size < 0.45 + 0.42 * routeDistance(x, z);
  const [vx, , vz] = VIEW.position;
  const yaw = (VIEW.yaw * Math.PI) / 180;

  const BOX = { x0: -598, x1: -484, z0: 184, z1: 324 };
  for (let i = 0; i < 16000; i++) {
    const x = rng.range(BOX.x0, BOX.x1);
    const z = rng.range(BOX.z0, BOX.z1);
    const d = benchDistance(x, z);
    if (d < 0.2) continue;
    const reach = routeDistance(x, z);
    if (rng.next() > Math.exp(-reach / 16)) continue;
    if (drift(x, z, 5) + 0.5 * drift(x, z, 1.3) < 0.62 + 0.25 * rng.next()) continue;
    put(kinds.pebble, x, z, sized(0.05, 0.24, 1.6), { shade: false });
  }
  for (let i = 0; i < 20000; i++) {
    const x = rng.range(BOX.x0 - 20, BOX.x1 + 6);
    const z = rng.range(BOX.z0 - 30, BOX.z1 + 20);
    if (benchDistance(x, z) < 0.3) continue;
    if (rng.next() > Math.exp(-routeDistance(x, z) / 30)) continue;
    if (drift(x, z, 7) + 0.4 * drift(x, z, 2.1) < 0.46 + 0.3 * rng.next()) continue;
    const size = sized(0.22, 0.65);
    if (fits(x, z, size)) put(kinds.stone, x, z, size);
  }
  for (let i = 0; i < 9000; i++) {
    const x = rng.range(-660, -430);
    const z = rng.range(40, 400);
    const d = benchDistance(x, z);
    if (d < 0.5) continue;
    // More of them near the line and under the steep bank.
    const want = 0.25 + 0.75 * Math.exp(-d / 14);
    if (rng.next() > want) continue;
    if (drift(x, z, 11) + 0.3 * drift(x, z, 3) < 0.5 + 0.3 * rng.next()) continue;
    const size = sized(0.6, 1.9);
    if (fits(x, z, size)) put(kinds.block, x, z, size);
  }
  for (let i = 0; i < 2600; i++) {
    const x = rng.range(-640, -440);
    const z = rng.range(60, 390);
    const d = benchDistance(x, z);
    if (d < 1) continue;
    if (drift(x, z, 17) < 0.56 + 0.2 * rng.next()) continue;
    if (rng.next() > 0.3 + 0.7 * Math.exp(-d / 20)) continue;
    const size = sized(1.9, 5.5, 1.8);
    if (fits(x, z, size)) put(kinds.hero, x, z, size, { sink: rng.range(0.3, 0.5) });
  }

  // The foreground of the wide view: blocks of one to three metres below the camera, which passes well over them.
  for (let i = 0; i < 90; i++) {
    const ahead = rng.range(8, 34);
    const side = rng.range(-14, 10);
    const size = sized(0.9, 3, 1.2);
    put(kinds.hero, vx + Math.sin(yaw) * ahead + Math.cos(yaw) * side, vz - Math.cos(yaw) * ahead + Math.sin(yaw) * side, size, { sink: rng.range(0.3, 0.5) });
  }

  // The line view, from the last rocks of the shore: two or three boulders between the crag and the lens at the left edge of the frame,
  // and rubble on the last metres of shore before the lens.
  const lx = -510.5;
  const lz = 215.5;
  const ahead: [number, number] = [0.788, -0.616];
  const right: [number, number] = [0.616, 0.788];
  const near = (a: number, r: number): [number, number] => [lx + ahead[0] * a + right[0] * r, lz + ahead[1] * a + right[1] * r];
  for (const [a, r, size] of [
    [4.1, -3.3, 1.45],
    [6.2, -4.7, 1.2],
    [8.6, -5.6, 1.05],
  ] as [number, number, number][]) {
    const [x, z] = near(a, r);
    put(kinds.hero, x, z, size, { sink: rng.range(0.22, 0.32), flat: rng.range(0.75, 0.95) });
  }
  for (let i = 0; i < 520; i++) {
    const a = rng.range(0.6, 9);
    const r = rng.range(-5.5, 3.2);
    const [x, z] = near(a, r);
    if (benchDistance(x, z) < -0.3) continue;
    if (drift(x, z, 2.3) + 0.4 * drift(x, z, 0.7) < 0.42 + 0.3 * rng.next()) continue;
    const size = sized(0.1, 0.5, 1.5);
    put(size > 0.17 ? kinds.block : kinds.stone, x, z, size, { sink: rng.range(0.2, 0.42), shade: size > 0.2 });
  }
  // The skerry is rock alone, sunk through the crust: the lake does not know it, so its foot is hidden by smaller blocks.
  put(kinds.hero, SKERRY[0], SKERRY[1], 3.6, { sink: 0.25, flat: 1.25, onLake: true, stand: true });
  for (const [dx, dz, size] of [
    [-2.0, 0.7, 1.7],
    [1.5, -1.5, 1.3],
    [-0.7, -2.1, 1.0],
    [1.9, 0.9, 0.9],
    [0.4, 2.0, 1.1],
    [-2.6, -0.9, 0.6],
    [2.6, -0.4, 0.5],
  ] as [number, number, number][]) put(kinds.block, SKERRY[0] + dx, SKERRY[1] + dz, size, { sink: 0.5, onLake: true, stand: true });

  // The line: slabs of the bench's edge that have broken off and slumped onto the crust, and the rubble between them.
  for (let s = 1; s < SHORE_POINTS.length; s++) {
    const a = SHORE_POINTS[s - 1] as [number, number];
    const b = SHORE_POINTS[s] as [number, number];
    if (Math.max(a[1], b[1]) < 60 || Math.min(a[1], b[1]) > 400) continue;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const tx = (b[0] - a[0]) / l;
    const tz = (b[1] - a[1]) / l;
    // The lake is to the left of the way the shore's points run.
    const nx = tz;
    const nz = -tx;
    for (let u = 0; u < l; u += 0.55) {
      const x0 = a[0] + tx * u;
      const z0 = a[1] + tz * u;
      const busy = drift(x0, z0, 9);
      if (rng.next() < 0.22 + 0.5 * busy) {
        const out = rng.range(-1.4, 1.5);
        const size = sized(0.9, 3.6);
        const x = x0 + nx * out;
        const z = z0 + nz * out;
        if (fits(x, z, size)) put(kinds.slab, x, z, size, { flat: rng.range(0.16, 0.34), sink: rng.range(0.2, 0.45), lean: [tx, tz, -rng.range(0.05, 0.5) * (out > -0.5 ? 1 : 0.3)], onLake: true });
      }
      for (let k = 0; k < 2; k++) {
        if (rng.next() > 0.3 + 0.6 * busy) continue;
        const out = rng.range(-0.6, 2.4);
        const size = sized(0.2, 0.8);
        if (fits(x0 + nx * out, z0 + nz * out, size)) put(kinds.stone, x0 + nx * out, z0 + nz * out, size, { onLake: out > -0.5 });
      }
    }
  }

  // The aprons of the north wall and the foot of the buttress: fallen blocks, larger and thicker under the gullies, none in the path of the fall.
  for (let i = 0; i < 40000; i++) {
    const x = rng.range(-480, 640);
    const z = rng.range(-470, 130);
    const d = calderaDistance(x, z);
    const g = height(x, z);
    if (g < 0.5 || g > 150) continue;
    const onButtress = d < -2;
    if (!onButtress && (d < 1 || d > 150)) continue;
    if (onButtress && g > 70) continue;
    if (Math.abs(x - (MOUTH.x - 3)) < 26 && z > MOUTH.z - 10) continue;
    const e = 3;
    const steep = Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
    if (steep > 1.1) continue;
    const nearMouth = Math.abs(x - MOUTH.x) < 230 ? 1 : 0.4;
    if (rng.next() > nearMouth) continue;
    if (drift(x, z, 23) + 0.35 * drift(x, z, 6) < 0.56 + 0.3 * rng.next()) continue;
    put(kinds.boulder, x, z, sized(1.0, 9, 3.4), { shade: false, sink: rng.range(0.3, 0.62), flat: rng.range(0.45, 0.8) });
  }

  const material = new THREE.ShaderMaterial({ vertexShader: ROCK_VERTEX, fragmentShader: ROCK_FRAGMENT, uniforms: shared });
  const simple = new THREE.ShaderMaterial({ vertexShader: ROCK_VERTEX, fragmentShader: ROCK_FRAGMENT, uniforms: shared, defines: { SIMPLE: '' } });
  const geometries: THREE.BufferGeometry[] = [];
  const out = { bench: [] as THREE.Object3D[], land: [] as THREE.Object3D[] };
  Object.values(kinds).forEach((k, ki) => {
    k.rocks.forEach((list, si) => {
      if (!list.length) return;
      const shape = rockShape(ki * 10 + si + 1, k.cells, k.planes);
      geometries.push(shape);
      // One mesh for each square of ground, so that the rocks no lens can see are never sent to be drawn.
      const cell = k.part === 'bench' ? 40 : 160;
      const squares = new Map<string, Rock[]>();
      for (const r of list) {
        const key = Math.floor((r.m.elements[12] as number) / cell) + ' ' + Math.floor((r.m.elements[14] as number) / cell);
        const square = squares.get(key);
        if (square) square.push(r);
        else squares.set(key, [r]);
      }
      for (const rocks of squares.values()) {
        const g = new THREE.BufferGeometry();
        g.setIndex(shape.index);
        g.setAttribute('position', shape.getAttribute('position'));
        g.setAttribute('normal', shape.getAttribute('normal'));
        const seeds = new Float32Array(rocks.length * 4);
        rocks.forEach((r, i) => seeds.set(r.seed, i * 4));
        g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
        geometries.push(g);
        const mesh = new THREE.InstancedMesh(g, k.simple ? simple : material, rocks.length);
        rocks.forEach((r, i) => mesh.setMatrixAt(i, r.m));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        out[k.part].push(mesh);
      }
    });
  });

  const discs = ctx.rig.contactDiscs(shades.length);
  shades.forEach((s, i) => ctx.rig.setDisc(discs, i, s[0], s[1], s[2], s[3]));

  return {
    ...out,
    dispose: () => {
      for (const g of geometries) g.dispose();
      material.dispose();
      simple.dispose();
    },
  };
}
