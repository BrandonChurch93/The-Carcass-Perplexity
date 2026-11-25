// The crust-walkers: the herd, its walk and its feeding.
// Each animal is a skin of tubes posed on the processor from the time alone (animal.ts); what each one is and does is in herd.ts.
import * as THREE from 'three';
import { secondsInPlace, shotById } from '../../../film/cut';
import { AWAY as STAGED_AWAY, SEAMS, UNIT, WALKERS, seamLine } from '../shared/anchors';
import type { HeartContext, HeartPiece, SteamSource } from '../shared/context';
import { Animal, TUFT_UP, type Env } from './animal';
import { makeBuild, makePlan } from './herd';
import { FRAGMENT, VERTEX } from './material';
import { Skin } from './skin';

export const PARTS: readonly string[] = ['crust-walkers'];

/** Staging by shot: the approved pictures of these shots have fewer animals than the herd, so some are not drawn for the whole of a shot. */
const away = (shot: string, who: number[]): { from: number; to: number; who: number[] } => {
  const s = shotById(shot);
  return { from: secondsInPlace(UNIT, s.first) - 0.3 / 60, to: secondsInPlace(UNIT, s.last) + 0.7 / 60, who };
};
// Who is away in which shot is the root's staging (shared/anchors.ts).
const AWAY = Object.entries(STAGED_AWAY).map(([shot, who]) => away(shot, who));

/** Discs of contact shade for each animal: four pads, the body, the tuft. */
const DISCS = 6;

// The lake bends the ground under each seam line so that the seam is crooked at every size (lake/net.ts). The same bend,
// so that a tuft comes down in the open lava and a pad beside it.
const mix32 = (n: number): number => {
  let h = n | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
};
const cell = (i: number, j: number, s: number): number => mix32(Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 0x9e3779b1)) / 4294967296;
const bendNoise = (x: number, z: number, s: number): number => {
  const i = Math.floor(x);
  const j = Math.floor(z);
  const u = x - i;
  const v = z - j;
  const a = u * u * (3 - 2 * u);
  const b = v * v * (3 - 2 * v);
  return (cell(i, j, s) * (1 - a) + cell(i + 1, j, s) * a) * (1 - b) + (cell(i, j + 1, s) * (1 - a) + cell(i + 1, j + 1, s) * a) * b;
};
const bendX = (x: number, z: number, seed: number): number => 2.2 * (bendNoise(x / 6.5, z / 6.5, seed) - 0.5) + 0.9 * (bendNoise(x / 1.9, z / 1.9, seed + 1) - 0.5);
const bendZ = (x: number, z: number, seed: number): number => 2.2 * (bendNoise(x / 6.5, z / 6.5, seed + 2) - 0.5) + 0.9 * (bendNoise(x / 1.9, z / 1.9, seed + 3) - 0.5);

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function seamField(): Env['seam'] {
  const lines = Object.keys(SEAMS).map((name) => {
    const points = seamLine(name, 40);
    const seed = Math.floor((SEAMS[name] as (typeof SEAMS)[string]).seed * 10);
    let minX = 1e9;
    let maxX = -1e9;
    let minZ = 1e9;
    let maxZ = -1e9;
    for (const p of points) {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minZ = Math.min(minZ, p[1]);
      maxZ = Math.max(maxZ, p[1]);
    }
    return { points, minX, maxX, minZ, maxZ, seed };
  });
  return (x, z) => {
    let d = 60;
    let bx = x + 60;
    let bz = z;
    for (const line of lines) {
      if (x < line.minX - d - 2 || x > line.maxX + d + 2 || z < line.minZ - d - 2 || z > line.maxZ + d + 2) continue;
      const qx = x + bendX(x, z, line.seed);
      const qz = z + bendZ(x, z, line.seed);
      for (let i = 0; i < line.points.length - 1; i++) {
        const a = line.points[i] as [number, number];
        const b = line.points[i + 1] as [number, number];
        const ex = b[0] - a[0];
        const ez = b[1] - a[1];
        const t = Math.min(1, Math.max(0, ((qx - a[0]) * ex + (qz - a[1]) * ez) / (ex * ex + ez * ez || 1)));
        const px = a[0] + ex * t;
        const pz = a[1] + ez * t;
        const dd = Math.hypot(qx - px, qz - pz);
        if (dd < d) {
          d = dd;
          // The place on the crust that the bend carries onto this point of the line.
          bx = x + px - qx;
          bz = z + pz - qz;
          for (let pass = 0; pass < 3; pass++) {
            const wx = px - bendX(bx, bz, line.seed);
            const wz = pz - bendZ(bx, bz, line.seed);
            bx = wx;
            bz = wz;
          }
        }
      }
    }
    return { d, x: bx, z: bz };
  };
}

export function create(ctx: HeartContext): HeartPiece {
  const { rig } = ctx;
  const t0 = rig.flow.t0;
  const env: Env = {
    drift: (x, z, seconds) => rig.flow.drift(x, z, seconds),
    undrift: (x, z, seconds) => {
      const v = rig.flow.velocity(x, z);
      return [x - v[0] * (seconds - t0), z - v[1] * (seconds - t0)];
    },
    seam: seamField(),
  };

  const skin = new Skin();
  const rng = ctx.rng('walkers');
  const herd = WALKERS.map((_, i) => {
    const build = makeBuild(i, rng);
    skin.who = i;
    return new Animal(skin, build, makePlan(i, build, env, t0), env);
  });
  const geometry = skin.build();

  const pixel = { value: 0.001 };
  // The pool each tuft stands in, as a light: x, z, how far it is open.
  const pools = herd.map(() => new THREE.Vector4(0, 0, 0, 0));
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...rig.uniforms,
      uPixel: pixel,
      tHide: { value: ctx.assets.texture('mat/hide.jpg', { anisotropy: 4 }) },
      tHideNh: { value: ctx.assets.texture('mat/hide-nh.png', { kind: 'data', anisotropy: 4 }) },
      tFlake: { value: ctx.assets.texture('mat/flake.jpg', { anisotropy: 4 }) },
      uPools: { value: pools },
      tFlakeNh: { value: ctx.assets.texture('mat/flake-nh.png', { kind: 'data', anisotropy: 4 }) },
    },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('crust-walkers', mesh));

  const discs = rig.contactDiscs(herd.length * DISCS);
  // Where a tuft is in the melt, the pool gives off ash and vapour: a source for the air to draw, for the three whose pictures show them feeding.
  const WISPS = [0, 1, 13];
  const wisps = WISPS.map((i): SteamSource => {
    const k = (herd[i] as Animal).b.k;
    return { at: [0, 0.4, 0], radius: 1.3 * k, strength: 0, rise: 6 * k, kind: 'steam', lean: [0.27, -0.12] };
  });
  ctx.sources.steam.push(...wisps);
  let height = 0;
  const size = new THREE.Vector2();

  return {
    setTime: (seconds) => {
      herd.forEach((animal, i) => {
        const stood = animal.pose(seconds);
        const b = animal.b;
        const here = AWAY.some((a) => seconds >= a.from && seconds <= a.to && a.who.includes(i)) ? 0 : 1;
        // A tuft that is down on a seam stands in a pool, and the pool lights the animal from below.
        const crust = env.undrift(stood.tuft.x, stood.tuft.z, seconds);
        const lit = smooth(1.5 * b.tendrilLen, 0.95 * b.tendrilLen, stood.tuft.y) * smooth(2.6, 1.0, env.seam(crust[0], crust[1]).d);
        (pools[i] as THREE.Vector4).set(stood.tuft.x, stood.tuft.z, lit * here, 1 - here);
        const wisp = wisps[WISPS.indexOf(i)];
        if (wisp) {
          wisp.at[0] = stood.tuft.x;
          wisp.at[2] = stood.tuft.z;
          wisp.strength = 0.25 * lit * here;
        }
        stood.feet.forEach((foot, j) => {
          const off = Math.min(1, foot.lift / (1.2 * b.k));
          rig.setDisc(discs, i * DISCS + j, foot.x, foot.z, b.padR * (2.8 + 1.6 * off), here * 0.9 * (1 - 0.75 * off));
        });
        rig.setDisc(discs, i * DISCS + 4, stood.body.x, stood.body.z, 3.4 * b.k, here * 0.35, 1.5, -stood.body.yaw + Math.PI / 2);
        const low = Math.min(1, Math.max(0, 1 - (stood.tuft.y - TUFT_UP * b.tendrilLen) / (2 * b.k)));
        rig.setDisc(discs, i * DISCS + 5, stood.tuft.x, stood.tuft.z, 1.1 * b.k, here * 0.5 * low);
      });
      skin.touch();
    },
    beforeSample: (renderer, camera) => {
      renderer.getDrawingBufferSize(size);
      pixel.value = 2 / ((camera.projectionMatrix.elements[5] as number) * (height || size.y || 2160));
    },
    resize: (_width, h) => {
      height = h;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
