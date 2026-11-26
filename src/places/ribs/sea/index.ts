// The water of the Ribs: the sea out to the horizon with its swell and surf, the pools and runnels on the floor at low tide, and the bore.
import * as THREE from 'three';
import { resolve } from '../../../core/cameras';
import { shots } from '../cameras';
import { partAtHeight, radii, skirtPad, surface } from '../layout';
import { BORE, FLOOR, LEVELS, RIBS, STATIONS, WIND, shotSpan } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { LAND } from '../shared/rig';
import { cloudShut, inOpening, openingWeight } from '../shared/opening';
import { loopPhase, stagedSeconds } from '../shared/stage';
import { chopTexture, feetTexture, foamTexture } from './chop';
import { createBore, type BoreSite } from './bore';
import { POOL_FRAGMENT, POOL_LOOP_FRAGMENT, POOL_VERTEX, SEA_FRAGMENT, SEA_OPENING_FRAGMENT, SEA_VERTEX, SPRAY_OPENING_FRAGMENT } from './shaders';
import { Spray, rand } from './spray';
import type { Ring } from './tide';
import { BORE_HEIGHT, BORE_SPEED, MAX_RINGS, RING_SOURCE, SWELL, boreFront } from './tide';

export const PARTS: readonly string[] = ['sea', 'surf', 'runnels', 'bore'];

const FEET_REACH = 40;
/** How closely a draining film follows the bed above the level of the pools (1 would be the bed itself), and how high over that level one still runs, metres. */
const DRAIN = 0.9;
const DRAIN_REACH = 1.6;

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
    if (Math.max(d00, d10, d01, d11) < -DRAIN_REACH - 0.15) return;
    // Over the level the water does not stand, it drains: a film that follows the bed down, lying in its fine lows.
    const y00 = LEVELS.pool + DRAIN * Math.max(-d00, 0);
    const y10 = LEVELS.pool + DRAIN * Math.max(-d10, 0);
    const y01 = LEVELS.pool + DRAIN * Math.max(-d01, 0);
    const y11 = LEVELS.pool + DRAIN * Math.max(-d11, 0);
    positions.push(x, y00, z, x, y01, z + size, x + size, y10, z, x + size, y10, z, x, y01, z + size, x + size, y11, z + size);
    depths.push(d00, d01, d10, d10, d01, d11);
  };
  for (let z = FLOOR.north; z < FLOOR.south; z += ROOT) {
    for (let x = FLOOR.west; x < FLOOR.east; x += ROOT) {
      // The floor's rim falls into the sea: no pool stands there.
      if (Math.max(height(x + ROOT / 2, z + ROOT / 2), height(x, z), height(x + ROOT, z + ROOT), height(x + ROOT, z), height(x, z + ROOT)) < -0.6) continue;
      cell(x, z, ROOT, near(x + ROOT / 2, z + ROOT / 2));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aDepth', new THREE.Float32BufferAttribute(depths, 1));
  g.computeBoundingSphere();
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

  const foamPicture = ctx.assets.texture('mat/foam.jpg', { kind: 'colour' });
  const seaUniforms = { ...rig.uniforms, ...shared, uEye: { value: eye }, tFeet: { value: feetMap }, uFeetReach: { value: FEET_REACH }, tFoamPic: { value: foamPicture } };
  const seaMaterial = new THREE.ShaderMaterial({
    vertexShader: SEA_VERTEX,
    fragmentShader: SEA_FRAGMENT,
    uniforms: seaUniforms,
  });
  // The approach draws the sea with its own text (shaders.ts): the film's material is the one above, untouched, for every other frame.
  const openSea = new THREE.Vector4(1, 0, 0, 0);
  const seaOpening = new THREE.ShaderMaterial({
    vertexShader: SEA_VERTEX,
    fragmentShader: SEA_OPENING_FRAGMENT,
    uniforms: { ...seaUniforms, uOpenSea: { value: openSea } },
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
  const front = { value: 0 };
  const poolMaterial = new THREE.ShaderMaterial({
    vertexShader: POOL_VERTEX,
    fragmentShader: POOL_FRAGMENT(MAX_RINGS),
    uniforms: { ...rig.uniforms, ...shared, uRings: { value: rings }, uRingCount: ringCount, uPoolLevel: { value: LEVELS.pool }, uFront: front, uBoreHeight: { value: BORE_HEIGHT }, uDrain: { value: new THREE.Vector2(DRAIN, DRAIN_REACH) }, tFoamPic: { value: foamPicture } },
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const pools = new THREE.Mesh(poolSheet((x, z) => rig.land.height(x, z), tracks), poolMaterial);
  // The same sheet for the card loop: the film's material with the loop's text, on the film's own uniforms.
  const poolLoop = poolMaterial.clone();
  poolLoop.uniforms = poolMaterial.uniforms;
  poolLoop.fragmentShader = POOL_LOOP_FRAGMENT(MAX_RINGS);
  pools.renderOrder = 1;
  ctx.scene.add(ctx.parts.built('runnels', pools));

  const gate = resolve(shots['ribs-06'] as (typeof shots)[string], 0.5, 0).position;
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
  // The first blade stands at the edge of the flat: the swell breaks on the shore before its foot and is thrown up against it.
  feet.forEach((foot, n) => {
    if (rig.land.height(foot.x, foot.z) < -0.6 || foot.z < -100) return;
    for (let i = 0; i < 12; i++) {
      const x = foot.x + (i - 5.5) * 24 + rng.range(-8, 8);
      let z = foot.z;
      while (z < foot.z + 600 && rig.land.height(x, z) > -0.8) z += 4;
      if (z >= foot.z + 600 || Math.abs(x - gate[0]) < 1 || x > -262) continue;
      surfAt.push({ x, z: z + rng.range(0, 10), lag: (k * (x * main[0] + z * main[1])) / w + rng.range(0, 0.25) * period, power: rng.range(1.5, 2.3), id: n * 16 + i + 1000 });
    }
  });
  const PUFFS = 7;
  const surf = new Spray(surfAt.length * PUFFS, { ...rig.uniforms, ...shared });
  // The breaker of the approach (below) is thrown water of the same part.
  const breaker = new Spray(560, { ...rig.uniforms, ...shared }, SPRAY_OPENING_FRAGMENT);
  breaker.mesh.visible = false;
  ctx.scene.add(ctx.parts.built('surf', surf.mesh, breaker.mesh), breaker.mesh);
  for (const e of surfAt) if (e.id % 3 === 0) ctx.sources.steam.push({ at: [e.x, 1, e.z], radius: 9, strength: 0.25 * e.power, rise: 14, kind: 'spray', lean: [WIND.to[0] * 0.8, WIND.to[1] * 0.8] });

  // Where the bore breaks on a blade or a stack it bursts up white; the two cliffs of the gate stand close to the last shot's lens.
  const sites: BoreSite[] = feet
    .map((foot, n) => ({ x: foot.x, z: foot.z, reach: Math.max(foot.a, foot.b), id: n, near: Math.hypot(foot.x - gate[0], foot.z - gate[2]) < 130 }))
    .filter((b) => b.z > -2400 && b.z < 400);
  // And the two stacks the last shot looks between: the burst up the nearer one is the tallest thing in its frame.
  STATIONS.posts.forEach((post, n) => sites.push({ x: post[0], z: post[1], reach: n === 0 ? 34 : 37, id: feet.length + n, near: true, power: n === 0 ? 1.2 : 0.55 }));
  const bore = createBore(rig.uniforms, foamMap, front, LEVELS.pool, [gate[0], gate[2]], sites, {
    wallA: ctx.assets.texture('mat/borewall-a.jpg', { kind: 'colour', repeat: false }),
    wallB: ctx.assets.texture('mat/borewall-c.jpg', { kind: 'colour', repeat: false }),
    foam: foamPicture,
    spray: ctx.assets.texture('mat/spray.jpg', { kind: 'colour', repeat: false }),
  });
  ctx.scene.add(ctx.parts.built('bore', bore.wall, bore.back, bore.curtain, bore.cards), bore.back, bore.curtain, bore.cards);
  // The air over and behind the wall is full of water: four columns that travel with the front, drawn by the air folder in the place's light.
  for (const [dx, radius, strength] of [[-70, 40, 0.05], [0, 50, 0.04], [75, 45, 0.05], [-260, 80, 0.03], [280, 80, 0.03]] as const) {
    ctx.sources.steam.push({ at: [gate[0] + dx, 6, boreFront(BORE) - 55], radius, strength, rise: 48, kind: 'spray', lean: [0.1, -0.5], speed: BORE_SPEED, since: BORE });
  }
  const feeding = shotSpan('ribs-04');

  // The approach: one heavy swell of the set breaks on the shore before the first blade as the film opens. White water is thrown up the
  // height of a tower, hangs and comes down at the pace of its size (it falls as water falls: that is what says how big it is), and the wind
  // takes the top of it off down the shore. Drawn only while the camera stands in the approach.
  const BREAKER = { x: -322, half: 70, cards: 560, strikes: -0.8, speed: 42 };
  let breakerZ = 200;
  while (breakerZ < 420 && rig.land.height(BREAKER.x, breakerZ) > -0.8) breakerZ += 4;
  /** The approach: how much more of the sky's light the open water keeps than the ground under the shut cloud. */
  const SEA_OPEN = { lift: 1.5 };
  const JETS = 22;
  const breakerAt = (seconds: number): void => {
    breaker.begin();
    // What hangs of it is gone by the time the lens is at the blade's foot: the foot is seen dark through thin air.
    const late = Math.min(1, Math.max(0, (seconds - 3.5) / 3));
    const thin = 1 - 0.85 * late * late * (3 - 2 * late);
    for (let j = 0; j < BREAKER.cards; j++) {
      const id = 90000 + j;
      // The water goes up in fingers: each card belongs to one, follows it up a little behind the last, and is thrown a little wide of it.
      const jet = 91000 + Math.floor(rand(id, 1) * JETS);
      const along = (rand(jet, 1) - 0.5) * 0.9 + (rand(id, 12) - 0.5) * 0.1;
      // One tall burst where the swell meets the rock square, low shoulders along the rest, and it strikes from one end to the other.
      const peak = Math.exp(-((along + 0.08) * (along + 0.08)) / 0.03);
      // A few fingers go far above the rest.
      const reachUp = rand(jet, 2);
      const power = (0.3 + 0.7 * peak) * (0.55 + 0.45 * reachUp * reachUp) * (0.9 + 0.1 * rand(id, 2));
      const a = seconds - (BREAKER.strikes + 0.9 * (along + 0.5) + 0.35 * rand(jet, 3) + 0.7 * rand(id, 3));
      if (a < 0) continue;
      const up = BREAKER.speed * power;
      const side = (rand(jet, 4) - 0.5) * 11 + (rand(id, 13) - 0.5) * 2.5;
      const x0 = BREAKER.x + along * 2 * BREAKER.half;
      const z0 = breakerZ + 12 * rand(jet, 5);
      const torn = rand(id, 5) < 0.36;
      // Heavy water goes up and comes down; the finest of it stops in the air near the top and goes with the wind.
      const top = (0.62 + 0.3 * rand(id, 6)) * (up / 9.81);
      const lean = side / Math.max(up, 1);
      if (!torn || a < top) {
        const y = 0.5 + up * a - 4.905 * a * a;
        if (y < -3) continue;
        const vy = up - 9.81 * a;
        const out = (2 + 4 * rand(jet, 7)) * a;
        const fade = Math.min(1, a / 0.18) * (torn ? 1 : Math.min(1, Math.max(0, (y + 3) / 8)));
        // Water that is moving is drawn out along its way: strings going up, strings coming down, a head where it hangs.
        const drawn = 1.15 + 1.7 * Math.min(1, Math.abs(vy) / 22);
        breaker.put(x0 + side * a + WIND.to[0] * 0.6 * a * a, y, z0 + out + WIND.to[1] * 0.6 * a * a, (1.5 + 1.1 * a) * (0.55 + 0.9 * rand(id, 8)), 0.88 * fade, rand(id, 9), -lean + (rand(id, 10) - 0.5) * 0.3, drawn);
        continue;
      }
      const b = a - top;
      const life = 3.5 + 3.5 * rand(id, 11);
      if (b > life) continue;
      const y1 = 0.5 + up * top - 4.905 * top * top;
      const vy = up - 9.81 * top;
      // What is left of its rise dies in a second; then it sinks slowly and the wind has it.
      const y = y1 + vy * 0.9 * (1 - Math.exp(-b / 0.9)) - 1.3 * b;
      const gone = 14 * (b - 1.2 * (1 - Math.exp(-b / 1.2)));
      const out = (2 + 4 * rand(jet, 7)) * top;
      breaker.put(x0 + side * top + WIND.to[0] * (0.6 * top * top + gone), y, z0 + out + WIND.to[1] * (0.6 * top * top + gone), (1.5 + 1.1 * top + 3.6 * b) * (0.55 + 0.9 * rand(id, 8)), 0.27 * Math.pow(1 - b / life, 1.5) * thin, rand(id, 9), (rand(id, 10) - 0.5) * 0.7 + 0.12 * b, 1.15 + 0.25 * b);
    }
    breaker.end();
  };

  return {
    setTime: (seconds) => {
      const staged = stagedSeconds();
      // In the card loop the wall stands off where the loop's first frame has it: it would have to come back.
      const run = loopPhase() === null ? seconds : staged;
      pools.material = loopPhase() === null ? poolMaterial : poolLoop;
      const frontZ = boreFront(run);
      front.value = frontZ;

      ringCount.value = staged >= feeding.from && staged <= feeding.to ? MAX_RINGS : 0;
      for (const ring of ringList) {
        ring.strength = 0;
        ring.stand = undefined;
      }
      RING_SOURCE.at?.(seconds, ringList);
      ringList.forEach((ring, i) => {
        (rings[i] as THREE.Vector4).set(ring.x, ring.z, ring.phase, ring.strength);
      });

      // In the approach the shore's own surf is seen from a mile out, small against the foot of the blade: the one breaker of the set
      // (below) is the tall water. It is itself again before the camera has passed it. Exactly 1 outside the approach.
      const shore = inOpening() ? 1 - 0.62 * (1 - Math.min(1, Math.max(0, (seconds - 12.5) / 3.5))) : 1;
      surf.begin();
      for (const e of surfAt) {
        // Buried by the bore: no surf under the wall.
        if (e.z < frontZ) continue;
        const beat = (seconds - e.lag) / period;
        const n = Math.floor(beat);
        const age = (beat - n) * period;
        const power = e.power * (0.45 + 0.55 * rand(e.id, n)) * (e.id >= 1000 ? shore : 1);
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
          surf.put(x, y, z, (1.6 + 2.6 * a) * (0.7 + 0.6 * rand(seed, n + 4)) * Math.max(1, e.power * 1.5), 0.75 * fade * Math.min(1.2, power), rand(seed, n + 5), rand(seed, n + 6) * 6.28, 1.25);
        }
      }
      surf.end();

      bore.setTime(seconds, run);

      sea.material = inOpening() ? seaOpening : seaMaterial;
      openSea.x = 1 + SEA_OPEN.lift * cloudShut(seconds);
      openSea.y = inOpening() ? Math.min(1, Math.max(0, (13 - seconds) / 6)) : 0;
      openSea.z = openingWeight(seconds);
      breaker.mesh.visible = inOpening();
      if (breaker.mesh.visible) breakerAt(seconds);
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
      seaOpening.dispose();
      pools.geometry.dispose();
      poolMaterial.dispose();
      poolLoop.dispose();
      bore.dispose();
      surf.dispose();
      breaker.dispose();
    },
  };
}
