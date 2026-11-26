// The air of the Spine: the dusk sky, the haze of the height, the cloud sea below, the storm against the ridge and what pours from it, and the spindrift.
// sky.ts is the dome; volume.ts the half-size pass that marches everything between the camera and the scene; noise.ts the block of noise they are cut from.
import * as THREE from 'three';
import { volumeUniforms } from '../../../core/engine';
import { QUAD_VERTEX } from '../../../core/post';
import { FIRST, crest, finEdge, frameAt, spires, tipOf, type Spire } from '../ridge';
import type { Context, Piece } from '../shared/context';
import { stagedSeconds } from '../shared/stage';
import { secondsInPlace, shotById } from '../../../film/cut';
import { CARCASS, INSIDE_FROM, STRIKE_FOV, UNIT, strikeStand, strikeTip } from '../shared/anchors';
import { bakeNoise } from './noise';
import { seaUniforms } from './sea';
import { createSky, skyPictures } from './sky';
import { VOLUME_FRAGMENT } from './volume';

export const PARTS: readonly string[] = ['sky', 'air', 'cloud-sea', 'cloud', 'spindrift'];

const RIDGE = { from: -4300, to: 7700, width: 1024 };
/** The saddles the storm pours through: the index of the spire each one follows. The saddle the trail crosses is kept clear. */
const POURS = [FIRST - 2, FIRST, FIRST + 1, FIRST + 2, FIRST + 3, FIRST + 5];

// The crest as the volume reads it: for each x, the z of the crest, its height, and how far down a pouring saddle that x is.
function ridgeTexture(): THREE.DataTexture {
  const data = new Uint16Array(RIDGE.width * 4);
  const rows: { x: number; z: number; y: number; dip: number }[] = [];
  const firstS = (spires[0] as Spire).s;
  const lastS = (spires[spires.length - 1] as Spire).s;
  for (let s = firstS; s <= lastS; s += 8) {
    const f = frameAt(s);
    let k = 0;
    while (k < spires.length - 2 && s > (spires[k + 1] as Spire).s) k++;
    const a = spires[k] as Spire;
    const b = spires[k + 1] as Spire;
    const part = Math.min(1, Math.max(0, (s - a.s) / (b.s - a.s)));
    const dip = POURS.includes(k) ? 0.5 - 0.5 * Math.cos(2 * Math.PI * Math.pow(part, 0.756)) : 0;
    rows.push({ x: f.x, z: f.z, y: crest(s), dip });
  }
  let at = 0;
  for (let i = 0; i < RIDGE.width; i++) {
    const x = RIDGE.from + ((i + 0.5) / RIDGE.width) * (RIDGE.to - RIDGE.from);
    while (at < rows.length - 2 && (rows[at + 1] as (typeof rows)[number]).x < x) at++;
    const a = rows[at] as (typeof rows)[number];
    const b = rows[at + 1] as (typeof rows)[number];
    const k = Math.min(1, Math.max(0, (x - a.x) / (b.x - a.x)));
    // Beyond the ends of the ridge the crest runs on straight.
    const slope = (b.z - a.z) / (b.x - a.x);
    const z = x < a.x ? a.z + slope * (x - a.x) : x > b.x ? b.z + slope * (x - b.x) : a.z + (b.z - a.z) * k;
    data[i * 4] = THREE.DataUtils.toHalfFloat(z);
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat(a.y + (b.y - a.y) * k);
    data[i * 4 + 2] = THREE.DataUtils.toHalfFloat(a.dip + (b.dip - a.dip) * k);
    data[i * 4 + 3] = THREE.DataUtils.toHalfFloat(1);
  }
  const t = new THREE.DataTexture(data, RIDGE.width, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

const STRIKE_FROM = secondsInPlace(UNIT, shotById('spine-04').first);
const CARCASS_FROM = secondsInPlace(UNIT, shotById('spine-03').first);

export function create(ctx: Context): Piece {
  const noise = bakeNoise(ctx.rng('air/noise'));
  const sea = seaUniforms(ctx);
  const pictures = skyPictures(ctx);
  const skyStage = (pictures.uSkyStage as THREE.IUniform<THREE.Vector4>).value;
  const plate = (pictures.uPlate as THREE.IUniform<THREE.Vector4>).value;
  const sky = createSky(ctx, noise, pictures);
  ctx.scene.add(ctx.parts.built('sky', sky.dome));
  ctx.parts.effect('air', 'built');
  ctx.parts.effect('cloud-sea', 'built');
  ctx.parts.effect('cloud', 'built');
  ctx.parts.effect('spindrift', 'built');

  const ridge = ridgeTexture();
  // What is drawn when one effect is shown alone: the haze, the sea, the storm and its pour, the spindrift.
  const show = new THREE.Vector4(1, 1, 1, 1);
  const stage = new THREE.Vector4(1, 1, 1, 0);
  // Where the snow is torn off: the tip of each spire and the shoulder of its lee edge, with the size of the plume by the spire's height.
  const crests = Array.from({ length: 24 }, () => new THREE.Vector4());
  spires.slice(0, 12).forEach((sp, i) => {
    const tip = tipOf(sp);
    const shoulder = finEdge(sp, 0.7, 1);
    const size = Math.min(1, Math.max(0.3, sp.tip / 300));
    (crests[2 * i] as THREE.Vector4).set(tip[0], tip[1] - 2, tip[2], size);
    (crests[2 * i + 1] as THREE.Vector4).set(shoulder[0], shoulder[1], shoulder[2], 0.7 * size);
  });
  const clear = new THREE.Vector3(CARCASS[0], CARCASS[2], 0);
  // The sources of steam and smoke the other folders have named (ctx.sources.steam): at most eight are drawn, the first eight.
  const steam = Array.from({ length: 8 }, () => new THREE.Vector4());
  const steamMore = Array.from({ length: 8 }, () => new THREE.Vector4());
  const volume = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: VOLUME_FRAGMENT,
    defines: { PLATE: 0 },
    uniforms: {
      ...ctx.rig.uniforms,
      ...volumeUniforms(),
      ...pictures,
      tNoise: { value: noise },
      tRidge: { value: ridge },
      ...sea.uniforms,
      tFar: { value: ctx.assets.texture('mat/far.jpg', { repeat: false }) },
      uSteam: { value: steam },
      uSteamMore: { value: steamMore },
      uSteamCount: { value: 0 },
      uRidgeSpan: { value: new THREE.Vector2(RIDGE.from, 1 / (RIDGE.to - RIDGE.from)) },
      uShow: { value: show },
      uStage: { value: stage },
      uCrest: { value: crests },
      uClear: { value: clear },
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });

  return {
    volume,
    setTime: () => {
      const sources = ctx.sources.steam;
      const count = Math.min(8, sources.length);
      for (let i = 0; i < count; i++) {
        const source = sources[i];
        if (!source) continue;
        (steam[i] as THREE.Vector4).set(source.at[0], source.at[1], source.at[2], source.radius);
        // Smoke is told from steam by its strength standing over 1: it is drawn grey.
        (steamMore[i] as THREE.Vector4).set(source.kind === 'smoke' ? 2 + source.strength : source.strength, source.rise, source.lean?.[0] ?? 0, source.lean?.[1] ?? 0);
      }
      (volume.uniforms.uSteamCount as THREE.IUniform<number>).value = count;
      // Staged by shot: inside the canal the gale does not reach, so no spindrift runs over its floor.
      stage.x = stagedSeconds() >= INSIDE_FROM - 1e-4 ? 0 : 1;
      // Staged by shot: the veil is thinner for the long lens of the strike (spine-04), which looks through 900 m of it, and inside the canal;
      // the flakes do not fly inside the canal, only out beyond its far mouth (0.5), where the veil is thicker for the storm seen from shelter; by the dead one (spine-03) the running snow is held off 10 m round it and the veil is a fifth, so the spire behind keeps its rock.
      const inStrike = stagedSeconds() >= STRIKE_FROM - 1e-4 && stagedSeconds() < INSIDE_FROM - 1e-4;
      const inCarcass = stagedSeconds() >= CARCASS_FROM - 1e-4 && stagedSeconds() < STRIKE_FROM - 1e-4;
      stage.y = stagedSeconds() >= INSIDE_FROM - 1e-4 ? 4 : inStrike ? 0.2 : inCarcass ? 0.22 : 1;
      // Staged by shot: the strike's own sky and sea (the plate) are compiled into the air only for its shot (spine-04); a software renderer
      // pays for them on every pixel otherwise.
      const plateOn = inStrike ? 1 : 0;
      if (volume.defines.PLATE !== plateOn) {
        volume.defines.PLATE = plateOn;
        volume.needsUpdate = true;
      }
      stage.z = stagedSeconds() >= INSIDE_FROM - 1e-4 ? 0.5 : 1;
      clear.z = inCarcass ? 3.5 : 0;
      // Staged by shot: by the dead one (spine-03) scud races low past the spires.
      stage.w = inCarcass ? 1 : 0;
      // Staged by shot: in the long lens of the strike (spine-04) the storm wall stands 33 degrees further round, so that it ends right of the struck spire and the dusk shows beyond.
      skyStage.x = stagedSeconds() >= STRIKE_FROM - 1e-4 && stagedSeconds() < INSIDE_FROM - 1e-4 ? 0.572 : 0;
      // Staged by shot: in the long lens of the strike (spine-04) the bloom about the stroke is a sixth of the lights' own size, as its picture has it.
      skyStage.z = inStrike ? 0.085 : 0;
      // Staged by shot: for that lens the dome's pictures are laid four times smaller, so that its cloud has masses and edges at the size the lens sees.
      skyStage.w = 0;
      // The strike's own sky stands behind its long lens: its lit cloud behind the struck tip, its horizon on the sea's.
      plate.set(Math.atan2(strikeTip[2] - strikeStand[2], strikeTip[0] - strikeStand[0]), -0.009, ((STRIKE_FOV * 16) / 9) * 1.2 * (Math.PI / 180), inStrike ? 1 : 0);
      // Staged by shot: by the dead one (spine-03) the lens is opened for the dusk (the rig's sky light is opened by the same there).
      skyStage.y = stagedSeconds() >= CARCASS_FROM - 1e-4 && stagedSeconds() < STRIKE_FROM - 1e-4 ? 1.3 : 0;
    },
    solo: (part) => {
      const only = (name: string): number => (part === null || !part.startsWith('spine/') || !PARTS.includes(part.slice(6)) || part === 'spine/sky' || part === `spine/${name}` ? 1 : 0);
      show.set(only('air'), only('cloud-sea'), only('cloud'), only('spindrift'));
    },
    dispose: () => {
      sky.dispose();
      volume.dispose();
      noise.dispose();
      sea.dispose();
      ridge.dispose();
    },
  };
}
