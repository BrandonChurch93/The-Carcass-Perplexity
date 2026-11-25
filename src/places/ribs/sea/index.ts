// The water of the Ribs: the sea out to the horizon with its swell and surf, the pools and runnels on the floor at low tide, and the bore.
import * as THREE from 'three';
import { resolve } from '../../../core/cameras';
import { shots } from '../cameras';
import { partAtHeight, radii, skirtPad, surface } from '../layout';
import { FLOOR, LEVELS, RIBS, WIND, shotSpan } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { LAND } from '../shared/rig';
import { stagedSeconds } from '../shared/stage';
import { chopTexture, feetTexture, foamTexture } from './chop';
import { BORE_FRAGMENT, BORE_VERTEX, POOL_FRAGMENT, POOL_VERTEX, SEA_FRAGMENT, SEA_VERTEX } from './shaders';
import { Spray, rand } from './spray';
import type { Ring } from './tide';
import { BORE_HEIGHT, BORE_SPEED, MAX_RINGS, RING_SOURCE, SWELL, boreArrives, boreFront } from './tide';

export const PARTS: readonly string[] = ['sea', 'surf', 'runnels', 'bore'];

const FEET_REACH = 40;

/** A disc of rings round the lens, close where the lens is: the vertex shader carries it with the lens and lays the swell on it in the world. */
function seaDisc(): THREE.BufferGeometry {
  const AROUND = 320;
  const radii: number[] = [0];
  let r = 0.6;
  while (r < 45000) {
    radii.push(r);
    r = r * 1.016 + 0.1;
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
      index.push(a, b, c, b, d, c);
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
    // The fine relief can dip under the level between corners: keep any cell that comes near it.
    if (Math.max(d00, d10, d01, d11) < -0.3) return;
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
  const foamMap = foamTexture(rng);

  const feet = RIBS.map((rib) => {
    const t = partAtHeight(rib, 0);
    const [a, b] = radii(rib, t);
    const c = surface(rib, t, 0, 0, 0);
    return { x: c.x, z: c.z, a: a + skirtPad(0), b: b + skirtPad(0), yaw: rib.yaw };
  });
  const feetMap = feetTexture(LAND, feet, FEET_REACH);

  const eye = new THREE.Vector3();
  const shared = { tChop: { value: chop }, tFoam: { value: foamMap }, uWind: { value: new THREE.Vector2(WIND.to[0], WIND.to[1]) } };

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
  const ringList: Ring[] = Array.from({ length: MAX_RINGS }, () => ({ x: 0, z: 0, phase: 0, strength: 0 }));
  const ringCount = { value: 0 };
  const poolMaterial = new THREE.ShaderMaterial({
    vertexShader: POOL_VERTEX,
    fragmentShader: POOL_FRAGMENT(MAX_RINGS),
    uniforms: { ...rig.uniforms, ...shared, uRings: { value: rings }, uRingCount: ringCount, uPoolLevel: { value: LEVELS.pool } },
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
  const CREST = 700;
  const FACE = 340;
  const PLUME = 130;
  const AHEAD = 90;
  const boreSpray = new Spray(burstAt.length * BURST + CREST + FACE + PLUME + AHEAD, { ...rig.uniforms, ...shared });
  ctx.scene.add(ctx.parts.built('bore', bore, boreSpray.mesh), boreSpray.mesh);
  const lineAt = (x: number, seconds: number): number => 20 * Math.sin(x * 0.0076 + 1.3) + 8 * Math.sin(x * 0.021 + seconds * 0.25) + 3 * Math.sin(x * 0.09 - seconds * 0.6);
  const feeding = shotSpan('ribs-04');

  return {
    setTime: (seconds) => {
      const staged = stagedSeconds();
      const frontZ = boreFront(seconds);
      front.value = frontZ;

      ringCount.value = staged >= feeding.from && staged <= feeding.to ? MAX_RINGS : 0;
      for (const ring of ringList) ring.strength = 0;
      RING_SOURCE.at?.(seconds, ringList);
      ringList.forEach((ring, i) => (rings[i] as THREE.Vector4).set(ring.x, ring.z, ring.phase, ring.strength));

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
      // Water torn off the crest by its own speed: born on the crest in heads, thrown up and ahead, left behind as it falls.
      const highAt = (x: number): number => BORE_HEIGHT * (0.3 + 0.7 * Math.min(1, Math.max(0, (950 - Math.abs(x - 80)) / 430)));
      const wide = (i: number, salt: number): number => gate[0] - 330 + 660 * rand(i, salt);
      for (let i = 0; i < CREST; i++) {
        const x = wide(i, 11);
        const life = 1.0 + 1.2 * rand(i, 12);
        const beat = seconds / life + rand(i, 13);
        const n = Math.floor(beat);
        const a = (beat - n) * life;
        const born = seconds - a;
        const H = highAt(x);
        const z0 = boreFront(born) + lineAt(x, born) - H * (0.25 + 0.3 * rand(i, n + 14));
        const y = H * (0.84 + 0.2 * rand(i, n + 15)) + (6 + 9 * rand(i, n + 16)) * a - 4.4 * a * a;
        const z = z0 + BORE_SPEED * (1.03 - 0.3 * a / life) * a;
        const fade = Math.min(1, a / 0.1) * Math.max(0, 1 - a / life);
        boreSpray.put(x, y + 1, z, (1.3 + 2.6 * a) * (0.7 + 0.6 * rand(i, n + 17)), 0.95 * fade, rand(i, n + 18), rand(i, n + 19) * 6.28, 1.25);
      }
      // White heads that tumble down the face in front of the wall.
      for (let i = 0; i < FACE; i++) {
        const x = wide(i, 41);
        const life = 0.9 + 0.8 * rand(i, 42);
        const beat = seconds / life + rand(i, 43);
        const n = Math.floor(beat);
        const a = (beat - n) * life;
        const H = highAt(x);
        const uc = Math.max(0.03, 0.3 + 0.65 * rand(i, n + 44) - 0.45 * a / life);
        const y = H * (1 - Math.pow(1 - uc, 2.2)) + 1.5 * rand(i, n + 45);
        const z = frontZ + lineAt(x, seconds) - 0.75 * H * uc + H * (0.26 * Math.sin(Math.PI * uc) + 0.14) + 1.5 * a;
        const fade = Math.min(1, a / 0.15) * Math.min(1, (life - a) / 0.3);
        boreSpray.put(x, y, z, (1.7 + 1.8 * rand(i, n + 46)) * (1 + 0.5 * a), 0.9 * fade, rand(i, n + 47), rand(i, n + 48) * 6.28, 0.9);
      }
      // The plume: fine water that stands over the wall and hides its top, carried ahead of it by the wind.
      for (let i = 0; i < PLUME; i++) {
        const x = wide(i, 21);
        const life = 3.2 + 2 * rand(i, 22);
        const beat = seconds / life + rand(i, 23);
        const n = Math.floor(beat);
        const a = (beat - n) * life;
        const born = seconds - a;
        const H = highAt(x);
        const z0 = boreFront(born) + lineAt(x, born) - H * (0.2 + 0.5 * rand(i, n + 24));
        const y = H * (0.85 + 0.3 * rand(i, n + 25)) + (5 + 5 * rand(i, n + 26)) * a - 0.5 * a * a;
        const z = z0 + BORE_SPEED * (0.96 + 0.1 * rand(i, n + 27)) * a;
        const fade = Math.min(1, a / 0.7) * Math.max(0, 1 - a / life);
        boreSpray.put(x, y, z, (8 + 5 * a) * (0.7 + 0.6 * rand(i, n + 28)), 0.34 * fade, rand(i, n + 29), rand(i, n + 30) * 6.28, 1.15);
      }
      // Ahead of the wall: the air it pushes is full of water, low over the flats, and reaches the lens before the wall does.
      for (let i = 0; i < AHEAD; i++) {
        const x = gate[0] - 200 + 400 * rand(i, 31);
        const life = 2.2 + 1.5 * rand(i, 32);
        const beat = seconds / life + rand(i, 33);
        const n = Math.floor(beat);
        const a = (beat - n) * life;
        const born = seconds - a;
        const z0 = boreFront(born) + lineAt(x, born) + 2;
        const reach = 1.25 + 0.75 * rand(i, n + 34);
        const z = z0 + BORE_SPEED * reach * a;
        const y = 1.5 + (2 + 5 * rand(i, n + 35)) * a + 4 * rand(i, n + 36);
        const fade = Math.min(1, a / 0.5) * Math.max(0, 1 - a / life);
        boreSpray.put(x, y, z, (5 + 6 * a) * (0.7 + 0.6 * rand(i, n + 37)), 0.1 * fade, rand(i, n + 38), rand(i, n + 39) * 6.28, 0.7);
      }
      boreSpray.end();
    },
    beforeSample: (_renderer, camera) => {
      eye.copy(camera.position);
    },
    dispose: () => {
      chop.dispose();
      foamMap.dispose();
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
