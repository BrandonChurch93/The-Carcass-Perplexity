// The water of the Ribs: the sea out to the horizon with its swell and surf, the pools and runnels on the floor at low tide, and the bore.
import * as THREE from 'three';
import { resolve } from '../../../core/cameras';
import { shots } from '../cameras';
import { partAtHeight, radii, skirtPad, surface } from '../layout';
import { FLOOR, LEVELS, RIBS, WIND, shotSpan } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { LAND } from '../shared/rig';
import { stagedSeconds } from '../shared/stage';
import { chopTexture, feetTexture } from './chop';
import { BORE_FRAGMENT, BORE_VERTEX, POOL_FRAGMENT, POOL_VERTEX, SEA_FRAGMENT, SEA_VERTEX } from './shaders';
import { Spray, rand } from './spray';
import { BORE_HEIGHT, BORE_SPEED, MAX_RINGS, RINGS, SWELL, boreArrives, boreFront } from './tide';

export const PARTS: readonly string[] = ['sea', 'surf', 'runnels', 'bore'];

const FEET_REACH = 40;

/** A disc of rings round the lens, close where the lens is: the vertex shader carries it with the lens and lays the swell on it in the world. */
function seaDisc(): THREE.BufferGeometry {
  const AROUND = 224;
  const radii: number[] = [0];
  let r = 0.6;
  while (r < 45000) {
    radii.push(r);
    r = r * 1.05 + 0.12;
  }
  const positions: number[] = [];
  const index: number[] = [];
  radii.forEach((radius, ring) => {
    for (let i = 0; i < AROUND; i++) {
      const a = ((i + (ring % 2) * 0.5) / AROUND) * Math.PI * 2;
      positions.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    }
  });
  for (let ring = 0; ring < radii.length - 1; ring++) {
    for (let i = 0; i < AROUND; i++) {
      const j = (i + 1) % AROUND;
      const a = ring * AROUND + i;
      const b = ring * AROUND + j;
      const c = (ring + 1) * AROUND + i;
      const d = (ring + 1) * AROUND + j;
      index.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  return g;
}

/** The sheet of the pools: level, fine where a lens comes near, each corner knowing how deep the water stands over the bed there. */
function poolSheet(height: (x: number, z: number) => number, tracks: [number, number][]): THREE.BufferGeometry {
  const positions: number[] = [];
  const depths: number[] = [];
  const ROOT = 12;
  const near = (x: number, z: number): number => {
    let d = 1e9;
    for (const t of tracks) d = Math.min(d, Math.hypot(x - t[0], z - t[1]));
    return d;
  };
  const depthAt = (x: number, z: number): number => LEVELS.pool - height(x, z);
  const cell = (x: number, z: number, size: number, d: number): void => {
    const want = Math.min(ROOT, Math.max(0.4, d * 0.022));
    if (size > want * 1.5) {
      const h = size / 2;
      for (const [ox, oz] of [[0, 0], [h, 0], [0, h], [h, h]] as const) cell(x + ox, z + oz, h, near(x + ox + h / 2, z + oz + h / 2));
      return;
    }
    const d00 = depthAt(x, z);
    const d10 = depthAt(x + size, z);
    const d01 = depthAt(x, z + size);
    const d11 = depthAt(x + size, z + size);
    if (Math.max(d00, d10, d01, d11) < -0.02) return;
    positions.push(x, LEVELS.pool, z, x, LEVELS.pool, z + size, x + size, LEVELS.pool, z, x + size, LEVELS.pool, z, x, LEVELS.pool, z + size, x + size, LEVELS.pool, z + size);
    depths.push(d00, d01, d10, d10, d01, d11);
  };
  for (let z = FLOOR.north; z < FLOOR.south; z += ROOT) {
    for (let x = FLOOR.west; x < FLOOR.east; x += ROOT) {
      // The floor's rim falls into the sea: no pool stands there.
      if (height(x + ROOT / 2, z + ROOT / 2) < 0.1) continue;
      cell(x, z, ROOT, near(x + ROOT / 2, z + ROOT / 2));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aDepth', new THREE.Float32BufferAttribute(depths, 1));
  g.computeBoundingSphere();
  return g;
}

/** The bore's sheet: x across the strait and s metres behind the front, close-meshed on the face and where the last shot looks. */
function boreSheet(focusX: number): THREE.BufferGeometry {
  const xs: number[] = [];
  let x = focusX;
  let step = 0.7;
  const right: number[] = [];
  while (x < 2600) {
    right.push(x);
    if (x > focusX + 170) step = Math.min(60, step * 1.06);
    x += step;
  }
  x = focusX - 0.7;
  step = 0.7;
  const left: number[] = [];
  while (x > -2400) {
    left.push(x);
    if (x < focusX - 170) step = Math.min(60, step * 1.06);
    x -= step;
  }
  xs.push(...left.reverse(), ...right);
  const ss: number[] = [];
  let s = -16;
  while (s < 0) {
    ss.push(s);
    s += 2;
  }
  step = 0.4;
  while (s < 5000) {
    ss.push(s);
    if (s > BORE_HEIGHT * 1.1) step = Math.min(220, step * 1.12);
    s += step;
  }
  const positions: number[] = [];
  const index: number[] = [];
  for (const sv of ss) for (const xv of xs) positions.push(xv, sv, 0);
  const W = xs.length;
  for (let j = 0; j < ss.length - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      const a = j * W + i;
      index.push(a, a + 1, a + W, a + 1, a + W + 1, a + W);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  return g;
}

export function create(ctx: Context): Piece {
  const { rig } = ctx;
  const rng = ctx.rng('sea');
  const chop = chopTexture(rng, WIND.to);

  const feet = RIBS.map((rib) => {
    const t = partAtHeight(rib, 0);
    const [a, b] = radii(rib, t);
    const c = surface(rib, t, 0, 0, 0);
    return { x: c.x, z: c.z, a: a + skirtPad(0), b: b + skirtPad(0), yaw: rib.yaw };
  });
  const feetMap = feetTexture(LAND, feet, FEET_REACH);

  const eye = new THREE.Vector3();
  const shared = { tChop: { value: chop }, uWind: { value: new THREE.Vector2(WIND.to[0], WIND.to[1]) } };

  const seaMaterial = new THREE.ShaderMaterial({
    vertexShader: SEA_VERTEX,
    fragmentShader: SEA_FRAGMENT,
    uniforms: { ...rig.uniforms, ...shared, uEye: { value: eye }, tFeet: { value: feetMap }, uFeetReach: { value: FEET_REACH } },
  });
  const sea = new THREE.Mesh(seaDisc(), seaMaterial);
  sea.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('sea', sea));

  const tracks: [number, number][] = [];
  for (const [id, path] of Object.entries(shots)) {
    if (id === 'ribs-01') continue;
    for (let k = 0; k <= 12; k++) {
      const pose = resolve(path, k / 12, 0);
      tracks.push([pose.position[0], pose.position[2]]);
    }
  }
  const rings = Array.from({ length: MAX_RINGS }, () => new THREE.Vector4());
  const ringCount = { value: 0 };
  const poolMaterial = new THREE.ShaderMaterial({
    vertexShader: POOL_VERTEX,
    fragmentShader: POOL_FRAGMENT(MAX_RINGS),
    uniforms: { ...rig.uniforms, ...shared, uRings: { value: rings }, uRingCount: ringCount },
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const pools = new THREE.Mesh(poolSheet((x, z) => rig.land.height(x, z), tracks), poolMaterial);
  pools.renderOrder = 1;
  ctx.scene.add(ctx.parts.built('runnels', pools));

  const front = { value: 0 };
  const gate = resolve(shots['ribs-06'] as (typeof shots)[string], 0.5, 0).position;
  const boreMaterial = new THREE.ShaderMaterial({
    vertexShader: BORE_VERTEX,
    fragmentShader: BORE_FRAGMENT,
    uniforms: { ...rig.uniforms, ...shared, uFront: front, uBoreHeight: { value: BORE_HEIGHT } },
  });
  const bore = new THREE.Mesh(boreSheet(gate[0]), boreMaterial);
  bore.frustumCulled = false;

  // Thrown water. The surf at the feet of the blades that stand in the sea: one burst each time a crest of the swell arrives.
  const main = SWELL[0] as [number, number, number, number];
  const k = (Math.PI * 2) / main[2];
  const w = Math.sqrt(9.81 * k);
  const period = (Math.PI * 2) / w;
  const surfAt: { x: number; z: number; lag: number; power: number; id: number }[] = [];
  feet.forEach((foot, n) => {
    for (let i = 0; i < 9; i++) {
      // The side the swell strikes.
      const a = Math.atan2(-main[1], -main[0]) + (i - 4) * 0.33 + rng.range(-0.1, 0.1);
      const cs = Math.cos(foot.yaw);
      const sn = Math.sin(foot.yaw);
      const lx = Math.cos(a) * cs + Math.sin(a) * sn;
      const lz = -Math.cos(a) * sn + Math.sin(a) * cs;
      const q = 1 / Math.hypot(lx / foot.a, lz / foot.b);
      const x = foot.x + (lx * cs - lz * sn) * q * 1.01;
      const z = foot.z + (lx * sn + lz * cs) * q * 1.01;
      if (rig.land.height(x, z) > -0.6) continue;
      surfAt.push({ x, z, lag: (k * (x * main[0] + z * main[1])) / w, power: rng.range(0.5, 1) * (1 - Math.abs(i - 4) * 0.12), id: n * 16 + i });
    }
  });
  const PUFFS = 7;
  const surf = new Spray(surfAt.length * PUFFS, { ...rig.uniforms, ...shared });
  ctx.scene.add(ctx.parts.built('surf', surf.mesh));
  for (const e of surfAt) if (e.id % 3 === 0) ctx.sources.steam.push({ at: [e.x, 1, e.z], radius: 9, strength: 0.25 * e.power, rise: 14, kind: 'spray', lean: [WIND.to[0] * 0.8, WIND.to[1] * 0.8] });

  // Where the bore breaks on a blade or a stack it bursts up white.
  const burstAt = feet.map((foot, n) => ({ x: foot.x, z: foot.z + foot.b * 0.6, reach: Math.max(foot.a, foot.b), id: n })).filter((b) => b.z > -2400 && b.z < 400);
  const BURST = 46;
  const CREST = 150;
  const boreSpray = new Spray(burstAt.length * BURST + CREST * 2, { ...rig.uniforms, ...shared });
  ctx.scene.add(ctx.parts.built('bore', bore, boreSpray.mesh));
  // The smoke off the crest belongs to the air: a row of sources that travels with the front.
  for (let i = 0; i < 9; i++) {
    ctx.sources.steam.push({ at: [gate[0] - 280 + i * 70, BORE_HEIGHT * 0.8, boreFront(ctx.events.bore) - 14], radius: 46, strength: 0.6, rise: 34, kind: 'spray', lean: [0, -0.9], speed: BORE_SPEED, since: ctx.events.bore });
  }

  const lineAt = (x: number, seconds: number): number => 20 * Math.sin(x * 0.0076 + 1.3) + 8 * Math.sin(x * 0.021 + seconds * 0.25) + 3 * Math.sin(x * 0.09 - seconds * 0.6);
  const feeding = shotSpan('ribs-04');

  return {
    setTime: (seconds) => {
      const staged = stagedSeconds();
      const frontZ = boreFront(seconds);
      front.value = frontZ;

      ringCount.value = staged >= feeding.from && staged <= feeding.to ? MAX_RINGS : 0;
      RINGS.forEach((ring, i) => (rings[i] as THREE.Vector4).set(ring.x, ring.z, ring.phase, ring.strength));

      surf.begin();
      for (const e of surfAt) {
        // Buried by the bore: no surf under the wall.
        if (e.z < frontZ) continue;
        const beat = (seconds - e.lag) / period;
        const n = Math.floor(beat);
        const age = (beat - n) * period;
        const power = e.power * (0.45 + 0.55 * rand(e.id, n));
        for (let j = 0; j < PUFFS; j++) {
          const seed = e.id * 131 + j;
          const a = age - 0.25 * rand(seed, n + 7);
          if (a < 0 || a > 3.6) continue;
          const up = (7 + 9 * rand(seed, n + 1)) * power;
          const out = 1.5 + 3 * rand(seed, n + 2);
          const side = (rand(seed, n + 3) - 0.5) * 9;
          const y = 0.4 + up * a - 3.4 * a * a;
          if (y < -1) continue;
          const drift = a * (2 + 1.5 * a);
          const x = e.x + side * (-main[1]) - main[0] * out * a + WIND.to[0] * drift;
          const z = e.z + side * main[0] - main[1] * out * a + WIND.to[1] * drift;
          const fade = Math.min(1, a / 0.2) * Math.max(0, 1 - a / 3.4);
          surf.put(x, y, z, (1.6 + 2.6 * a) * (0.7 + 0.6 * rand(seed, n + 4)), 0.75 * fade * power, rand(seed, n + 5), rand(seed, n + 6) * 6.28, 1.25);
        }
      }
      surf.end();

      boreSpray.begin();
      for (const b of burstAt) {
        const hit = boreArrives(b.z) ;
        const since = seconds - hit;
        if (since < -0.2 || since > 7) continue;
        for (let j = 0; j < BURST; j++) {
          const seed = 9000 + b.id * 97 + j;
          const a = since - 0.9 * rand(seed, 1);
          if (a < 0 || a > 5.5) continue;
          const up = 16 + 22 * rand(seed, 2);
          const side = (rand(seed, 3) - 0.5) * 2.2 * b.reach;
          const y = 4 + up * a - 4.2 * a * a;
          if (y < 0) continue;
          const fwd = (6 + 14 * rand(seed, 4)) * a;
          const fade = Math.min(1, a / 0.25) * Math.max(0, 1 - a / 5.2);
          boreSpray.put(b.x + side, y, b.z + fwd + 4, (5 + 6 * a) * (0.7 + 0.6 * rand(seed, 5)), 0.85 * fade, rand(seed, 6), rand(seed, 7) * 6.28, 1.3);
        }
      }
      // Water torn off the crest by its own speed: born on the crest, left behind and lifted.
      for (let i = 0; i < CREST * 2; i++) {
        const lane = i % CREST;
        const x = gate[0] - 300 + lane * 4 + 3 * rand(i, 11);
        const life = 1.4 + 1.2 * rand(i, 12);
        const beat = seconds / life + rand(i, 13);
        const n = Math.floor(beat);
        const a = (beat - n) * life;
        const born = seconds - a;
        const z0 = boreFront(born) + lineAt(x, born) - BORE_HEIGHT * (0.35 + 0.3 * rand(i, n + 14));
        const y = BORE_HEIGHT * (0.92 + 0.2 * rand(i, n + 15)) + (5 + 5 * rand(i, n + 16)) * a - 2.5 * a * a;
        const z = z0 + BORE_SPEED * (0.55 - 0.2 * a / life) * a;
        const fade = Math.min(1, a / 0.2) * Math.max(0, 1 - a / life);
        boreSpray.put(x, y + 1, z, (3.5 + 5 * a) * (0.7 + 0.6 * rand(i, n + 17)), 0.6 * fade, rand(i, n + 18), rand(i, n + 19) * 6.28, 1.2);
      }
      boreSpray.end();
    },
    beforeSample: (_renderer, camera) => {
      eye.copy(camera.position);
    },
    dispose: () => {
      chop.dispose();
      feetMap.dispose();
      sea.geometry.dispose();
      seaMaterial.dispose();
      pools.geometry.dispose();
      poolMaterial.dispose();
      bore.geometry.dispose();
      boreMaterial.dispose();
      surf.dispose();
      boreSpray.dispose();
    },
  };
}
