// The water of the Ribs: the sea out to the horizon with its swell and surf, the pools and runnels on the floor at low tide, and the bore.
import * as THREE from 'three';
import { resolve } from '../../../core/cameras';
import { shots } from '../cameras';
import { partAtHeight, radii, skirtPad, surface, type Rib } from '../layout';
import { BORE, FLOOR, LEVELS, RIBS, STATIONS, WIND, shotSpan } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { LAND } from '../shared/rig';
import { STRIKE, cloudShut, inOpening, openingLight, openingWeight } from '../shared/opening';
import { loopPhase, stagedSeconds } from '../shared/stage';
import { chopTexture, feetTexture, foamTexture } from './chop';
import { createBore, type BoreSite } from './bore';
import { POOL_FRAGMENT, POOL_LOOP_FRAGMENT, POOL_VERTEX, SEA_FRAGMENT, SEA_OPENING_FRAGMENT, SEA_OPENING_VERTEX, SEA_VERTEX } from './shaders';
import { Spray, rand } from './spray';
import { Spindrift } from './spindrift';
import { Burst, STRIKE_CARDS, type Strike } from './strike';
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
  const ahead = new THREE.Vector3();
  const shared = { tChop: { value: chop }, tFoam: { value: foamMap }, uWind: { value: new THREE.Vector2(WIND.to[0], WIND.to[1]) } };

  const foamPicture = ctx.assets.texture('mat/foam.jpg', { kind: 'colour' });
  const seaUniforms = { ...rig.uniforms, ...shared, uEye: { value: eye }, tFeet: { value: feetMap }, uFeetReach: { value: FEET_REACH }, tFoamPic: { value: foamPicture }, tFoamNh: { value: ctx.assets.texture('mat/foam-nh.png', { kind: 'data' }) } };
  const seaMaterial = new THREE.ShaderMaterial({
    vertexShader: SEA_VERTEX,
    fragmentShader: SEA_FRAGMENT,
    uniforms: seaUniforms,
  });
  // The approach draws the sea with its own text (shaders.ts): the film's material is the one above, untouched, for every other frame.
  const openSea = new THREE.Vector4(1, 0, 0, 1);
  const openGlint = { value: 0 };
  // The white water a strike leaves on the sea round the foot: x, z of its middle, its reach in metres, how white.
  const wash = [new THREE.Vector4(0, 0, 1, 0), new THREE.Vector4(0, 0, 1, 0)];
  const seaOpening = new THREE.ShaderMaterial({
    vertexShader: SEA_OPENING_VERTEX,
    fragmentShader: SEA_OPENING_FRAGMENT,
    uniforms: { ...seaUniforms, uOpenSea: { value: openSea }, uOpenGlint: openGlint, uWash: { value: wash } },
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
  const breaker = new Burst(STRIKE_CARDS * 2, { ...rig.uniforms, ...shared });
  breaker.mesh.visible = false;
  // And the spindrift off the crests of the approach's gale.
  const spindrift = new Spindrift(3600, { ...rig.uniforms, ...shared, uOpenSea: { value: openSea } });
  spindrift.mesh.visible = false;
  ctx.scene.add(ctx.parts.built('surf', surf.mesh, breaker.mesh, spindrift.mesh), breaker.mesh, spindrift.mesh);
  // The surf's own haze is not handed to the air: at a blade's foot it stood as a grey column with straight sides.

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
  for (const [dx, radius, strength] of [] as [number, number, number][]) {
    ctx.sources.steam.push({ at: [gate[0] + dx, 6, boreFront(BORE) - 55], radius, strength, rise: 48, kind: 'spray', lean: [0.1, -0.5], speed: BORE_SPEED, since: BORE });
  }
  const feeding = shotSpan('ribs-04');

  // The approach: one heavy swell of the set breaks on the shore before the first blade as the film opens. White water is thrown up the
  // height of a tower, hangs and comes down at the pace of its size (it falls as water falls: that is what says how big it is), and the wind
  // takes the top of it off down the shore. Drawn only while the camera stands in the approach.
  /** The approach: how much more of the sky's light the open water keeps than the ground under the shut cloud. */
  const SEA_OPEN = { lift: 1.5, swell: 0.7 };
  // A sea of the set breaking on a blade: where the open water meets its foot on the side the swell comes from, and the stone's face above it.
  const strikeOn = (rib: Rib, seconds: number, height: number, width: number, id: number, at: [number, number], out: [number, number]): Strike => {
    const cs = Math.cos(rib.yaw);
    const sn = Math.sin(rib.yaw);
    const STEP = 3;
    const rows = Array.from({ length: Math.ceil((height * 1.1) / STEP) + 2 }, (_v, n) => {
      const t = partAtHeight(rib, n * STEP);
      const [a, b] = radii(rib, t);
      const c = surface(rib, t, 0, 0, 0);
      return { x: c.x, z: c.z, a: a + (n === 0 ? skirtPad(0) : 0), b: b + (n === 0 ? skirtPad(0) : 0) };
    });
    const onRow = (row: (typeof rows)[number], along: number): [number, number] => {
      // The place on the section's rim that looks out to sea, and so many metres round the rim from it.
      const turn = along / Math.max(row.a, row.b);
      const dx = out[0] * Math.cos(turn) - out[1] * Math.sin(turn);
      const dz = out[0] * Math.sin(turn) + out[1] * Math.cos(turn);
      const lu = dx * cs + dz * sn;
      const lw = -dx * sn + dz * cs;
      const q = 1 / Math.hypot(lu / row.a, lw / row.b);
      return [row.x + (lu * cs - lw * sn) * q, row.z + (lu * sn + lw * cs) * q];
    };
    const face = (along: number, y: number): [number, number] => {
      const at = Math.min(rows.length - 1.001, Math.max(0, y / STEP));
      const n = Math.floor(at);
      const lo = onRow(rows[n] as (typeof rows)[number], along);
      const hi = onRow(rows[n + 1] as (typeof rows)[number], along);
      return [lo[0] + (hi[0] - lo[0]) * (at - n), lo[1] + (hi[1] - lo[1]) * (at - n)];
    };
    const foot = face(0, 0);
    const [x, z] = at;
    // Where a shore lies between the sea and the stone the water goes up into the air, not up the blade.
    if (Math.hypot(x - foot[0], z - foot[1]) > 14) return { x, z, out, seconds, width, height, lean: [0, 0], id };
    const up = face(0, height * 0.6);
    return {
      x,
      z,
      out,
      seconds,
      width,
      height,
      lean: [(up[0] - foot[0]) / (height * 0.6), (up[1] - foot[1]) / (height * 0.6)],
      face: (along, y) => {
        const on = face(along, y);
        return [on[0] + (x - foot[0]), on[1] + (z - foot[1])];
      },
      id,
    };
  };
  // The opening's strikes: the place, the times and the height are the opening's own (shared/opening.ts), read here and not copied.
  const struck = RIBS.find((r) => r.name === STRIKE.blade) as Rib;
  const strikes: Strike[] = STRIKE.times.map((seconds, n) => strikeOn(struck, seconds, STRIKE.height * (n === 0 ? 1 : STRIKE.lesser), STRIKE.half * 2, n + 1, [STRIKE.foot[0], STRIKE.foot[2]], [0, 1]));
  const windTo: [number, number] = [WIND.to[0] * WIND.speed, WIND.to[1] * WIND.speed];

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
          // On the open shore the swell breaks knee high: its spray is a low lit haze over the surf line, not a column.
          const low = e.id >= 1000 ? 0.24 : 1;
          const up = (7 + 9 * rand(seed, n + 1)) * power * low;
          const out = 1.5 + 3 * rand(seed, n + 2);
          const side = (rand(seed, n + 3) - 0.5) * 9;
          const y = 0.4 + up * a - 3.4 * a * a;
          if (y < -1) continue;
          const drift = a * (2 + 1.5 * a);
          const x = e.x + side * (-main[1]) - main[0] * out * a + WIND.to[0] * drift;
          const z = e.z + side * main[0] - main[1] * out * a + WIND.to[1] * drift;
          const fade = Math.min(1, a / 0.2) * Math.max(0, 1 - a / 3.4);
          surf.put(x, y, z, (1.6 + 2.6 * a) * (0.7 + 0.6 * rand(seed, n + 4)) * Math.max(1, e.power * 1.5) * (0.4 + 0.6 * low), (0.75 - 0.4 * (1 - low)) * fade * Math.min(1.2, power), rand(seed, n + 5), rand(seed, n + 6) * 6.28, 1.25);
        }
      }
      surf.end();

      bore.setTime(seconds, run);

      sea.material = inOpening() ? seaOpening : seaMaterial;
      openSea.x = 1 + SEA_OPEN.lift * cloudShut(seconds);
      openSea.z = openingWeight(seconds);
      openGlint.value = openingLight(seconds);
      openSea.w = 1 + SEA_OPEN.swell * openingWeight(seconds);
      breaker.mesh.visible = inOpening();
      if (breaker.mesh.visible) breaker.setTime(seconds, strikes, windTo);
      strikes.forEach((s, n) => {
        const a = seconds - s.seconds;
        const reach = 0.5 * s.width * (0.75 + 0.1 * Math.max(a, 0)) + 7 * Math.max(a, 0);
        const on = inOpening() && a > 0 ? Math.min(1, a / 0.5) * Math.min(1, Math.max(0, (12 - a) / 8)) : 0;
        (wash[n] as THREE.Vector4).set(s.x + s.out[0] * reach * 0.3, s.z + s.out[1] * reach * 0.3, reach, 0.95 * on);
      });
      spindrift.mesh.visible = inOpening();
      spindrift.gale.y = openingWeight(seconds);
    },
    beforeSample: (_renderer, camera) => {
      eye.copy(camera.position);
      if (spindrift.mesh.visible) {
        camera.getWorldDirection(ahead);
        const flat = Math.hypot(ahead.x, ahead.z) || 1;
        spindrift.field.x = eye.x + (ahead.x / flat) * 0.44 * spindrift.field.z;
        spindrift.field.y = eye.z + (ahead.z / flat) * 0.44 * spindrift.field.z;
      }
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
      spindrift.dispose();
    },
  };
}
