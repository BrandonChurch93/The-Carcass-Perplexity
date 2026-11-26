// The gill-plumes: crimson feathered growths on the lip of the shaft and a few seedlings away from it.
// Every bush is grown once from the seeded stream (fronds.ts): limbs that lean from one holdfast and fork, hung with wet threads in locks.
// Each bush is its own two meshes, so one that is out of the frame costs nothing. The sway and the drops are in the vertex shaders (shaders.ts).
import * as THREE from 'three';
import { BUSHES, SEA_LEVEL, SEEDLINGS, WIND, bushAt, onRim, shotSpan } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import { surgeAt } from '../shared/blockout';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { grow, type Bush, type Grown, type Tip } from './fronds';
import { DROP_FRAGMENT, DROP_VERTEX, STEM_FRAGMENT, STEM_VERTEX, THREAD_FRAGMENT, THREAD_VERTEX } from './shaders';

export const PARTS: readonly string[] = ['gill-plumes'];

/** Staged, metres: see where the bushes are placed. */
const HERO_WEST = 3.6;

/** Staged for shot breath-05 only: the growth that stands behind and beside the wader at the rim in the picture of key breath-2, and the low shoots
 *  on the plate between it and the lens. x, z, height in metres. They stand where the lens of breath-03 walks, so no other shot has them. */
const RIM_GROWTH: ReadonlyArray<readonly [number, number, number, number]> = [
  [-28.3, 11.5, 4.6, 1],
  [-27.2, 13.2, 3.4, 1],
  [-31.0, 12.5, 3.4, 1],
  [-32.8, 14.4, 2.6, 1],
  [-30.6, 18.0, 2.2, 1],
  [-32.4, 19.3, 1.0, 0.5],
  [-30.8, 21.6, 0.75, 0.5],
  [-33.6, 16.6, 1.2, 0.5],
  [-34.9, 20.4, 0.8, 0.5],
];

/** Staged for shot breath-02: where each hanging one is rooted (x, z), how tall, and the point on the ground it leans over (x, z). */
const HANG: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [-13.1, 30.4, 7.6, -11.4, 28.3],
  [-14.5, 28.4, 6.6, -12.5, 26.2],
];

const HOLDFAST_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // Wet flesh, the colour of the limbs that leave it: pale and pink where it swells, wine-dark in its folds.
  float knot = fbm(vWorld.xz * 7.0 + vWorld.y * 4.0);
  float fold = smoothstep(0.25, 0.6, knot);
  vec3 albedo = mix(vec3(0.3, 0.1, 0.09), vec3(0.8, 0.6, 0.54), fold) * (0.85 + 0.3 * vnoise(vWorld.xz * 60.0 + vWorld.y * 40.0));
  vec3 colour = rigShade(vWorld, n, v, albedo, 0.4, 0.35 + 0.5 * fold);
  // Under the bush the lit rock throws its warm light back up into it.
  colour += albedo * uSunColour * (0.07 * sunAt(vec3(vWorld.x, vWorld.y + 4.0, vWorld.z)) * (0.6 - 0.4 * n.y));
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

export function create(ctx: Context): Piece {
  const { rig } = ctx;
  const rng = ctx.rng('gill-plumes');
  const floor = (x: number, z: number): number => rig.land.height(x, z);
  const bushes: Bush[] = [];
  /** A place at the lip moved straight out from the shaft until it is on the brim and not on a ledge under it. */
  const onBrim = (x: number, z: number): [number, number] => {
    for (let k = 0; k < 40 && floor(x, z) < 0.2; k++) {
      x *= 1.006;
      z *= 1.006;
    }
    return [x, z];
  };
  BUSHES.forEach(([, , tall], i) => {
    const at = bushAt(i);
    // Staged: the two that the lens of key breath-3 stands by are rooted a stride further west of the lip than their anchors, so that
    // the nearer is cut by the left edge of that frame and the farther has its holdfast in the lower left of it, as in the picture.
    // Staged: the one on the south-west lip stands where the lens of key breath-4 now does. It is rooted five metres to that lens's
    // left and behind it, out of its frame; what hangs into that frame is grown for that shot alone (HANG).
    const [x, z] = i === 1 ? [at[0] - HERO_WEST, at[1] + 0.6] : i === 0 ? [at[0] + 0.1, at[1] - 0.7] : i === 5 ? onBrim(-13.5, 33.5) : at;
    // Two stand in front of a camera at the lip: every frond is grown. The others are seen from far off.
    bushes.push({ x, y: floor(x, z), z, tall: i === 0 ? tall * 1.2 : tall, lean: Math.atan2(-x, z), detail: i < 2 ? 1 : 0.5, mound: i < 2 ? 0 : i === 5 ? 0.3 : 0.6, tidy: i === 5 });
  });
  // Between the tall ones the lip is grown over: low dense growth in a crescent along the rim where the anchored bushes stand, seen from the wide key
  // as one dark red band. None stands where a lens passes: they keep to the far side of the tall ones from every camera at the lip.
  const fill = ctx.rng('gill-plume-fill');
  for (let j = 0; j < 16; j++) {
    const bearing = -72 + (j + fill.next()) * (50 / 16);
    const [x, z] = onRim(bearing, fill.range(0.8, 5.5));
    bushes.push({ x, y: floor(x, z), z, tall: fill.range(1.4, 2.6), lean: Math.atan2(-x, z), detail: 0.4, mound: 0.7 });
  }
  // And on the lip west of the first tall one, toward the channel: the low end of the crescent, left of every lens that stands at the lip
  // (the breath-03 lens at x -32.5 looks north past it; from the rim's lens it is small red tufts at the left).
  const [bx, bz] = bushAt(0);
  for (let j = 0; j < 14; j++) {
    const x = bx - fill.range(3.5, 10.5);
    const z = bz + fill.range(-3, 9.5);
    const tall = fill.range(0.9, 1.9);
    const y = floor(x, z);
    if (y < SEA_LEVEL + 0.12) continue;
    bushes.push({ x, y, z, tall, lean: Math.atan2(-x, z), detail: 0.4, mound: 0.7 });
  }
  // A seedling whose anchor is under the water is not grown: nothing of this kind roots in the channel.
  for (const [x, z, tall] of SEEDLINGS) if (floor(x, z) > SEA_LEVEL + 0.03) bushes.push({ x, y: floor(x, z), z, tall, lean: Math.atan2(-x, z), detail: 0.4 });

  const grown: Grown[] = bushes.map((bush) => grow(bush, rng, floor));

  const rimRng = ctx.rng('gill-plume-rim');
  const rimBushes: Bush[] = RIM_GROWTH.map(([x, z, tall, detail]) => ({ x, y: floor(x, z), z, tall, lean: Math.atan2(-x, z), detail, mound: 1 }));
  const rimGrown: Grown[] = rimBushes.map((bush) => grow(bush, rimRng, floor));
  // Staged by shot (breath-02): two tall weeping ones on the south-west lip, rooted to the left of that lens and leaning across its upper left
  // corner, so that their locks hang into the frame from above and from the left, as the picture has them. No other shot has them.
  const hangRng = ctx.rng('gill-plume-hang');
  const hangBushes: Bush[] = HANG.map(([hx, hz, tall, tx, tz]) => {
    const [x, z] = onBrim(hx, hz);
    return { x, y: floor(x, z), z, tall, lean: Math.atan2(tx - x, z - tz), detail: 1, mound: 0, weep: 1, tidy: true };
  });
  const hangGrown: Grown[] = hangBushes.map((bush) => grow(bush, hangRng, floor));

  const pixel = { value: 0.001 };
  const seconds = { value: 0 };
  const surge = { value: 0 };
  const uniforms = {
    ...rig.uniforms,
    uPixel: pixel,
    uSeconds: seconds,
    uSurge: surge,
    uWind: { value: new THREE.Vector2(WIND[0], WIND[1]) },
  };
  // Opaque and whole: the engine lays their depth first, and a thread behind another costs only that.
  const threadMaterial = new THREE.ShaderMaterial({ vertexShader: THREAD_VERTEX, fragmentShader: THREAD_FRAGMENT, uniforms, side: THREE.DoubleSide });
  const stemMaterial = new THREE.ShaderMaterial({ vertexShader: STEM_VERTEX, fragmentShader: STEM_FRAGMENT, uniforms });
  const meshes = (g: Grown, into: THREE.Group): void => {
    into.add(new THREE.Mesh(g.threads, threadMaterial), new THREE.Mesh(g.stems, stemMaterial));
  };

  // The holdfasts: a knotted lump in the rock under every bush, lumpier than round, half sunk.
  const lump = new THREE.IcosahedronGeometry(1, 4);
  const lumps: THREE.BufferGeometry[] = [];
  const holdfastMaterial = new THREE.ShaderMaterial({ vertexShader: RIG_VERTEX, fragmentShader: HOLDFAST_FRAGMENT, uniforms: { ...rig.uniforms } });
  const group = new THREE.Group();
  const rimGroup = new THREE.Group();
  const hangGroup = new THREE.Group();
  for (const g of grown) meshes(g, group);
  for (const g of rimGrown) meshes(g, rimGroup);
  for (const g of hangGrown) meshes(g, hangGroup);
  group.add(rimGroup, hangGroup);
  for (const b of [...bushes, ...rimBushes]) {
    const g = lump.clone();
    const at = g.getAttribute('position') as THREE.BufferAttribute;
    const seed = rng.range(0, 50);
    for (let i = 0; i < at.count; i++) {
      const x = at.getX(i);
      const y = at.getY(i);
      const z = at.getZ(i);
      const swell = 1 + 0.2 * Math.sin(x * 3 + seed) * Math.sin(z * 2.6 + seed * 1.3) + 0.12 * Math.sin(y * 4 + x * 2 + seed * 2.1);
      const r = 0.055 * b.tall * swell;
      at.setXYZ(i, b.x + x * r * 1.25, b.y + y * r * 0.8 + 0.02 * b.tall, b.z + z * r * 1.25);
      // The lump is smooth: its normal is the ball's, flattened as the lump is.
      const nl = Math.hypot(x / 1.25, y / 0.8, z / 1.25) || 1;
      (g.getAttribute('normal') as THREE.BufferAttribute).setXYZ(i, x / 1.25 / nl, y / 0.8 / nl, z / 1.25 / nl);
    }
    lumps.push(g);
    const m = new THREE.Mesh(g, holdfastMaterial);
    m.frustumCulled = false;
    (rimBushes.includes(b) ? rimGroup : group).add(m);
  }
  lump.dispose();

  // The wet ends drip: at the point of a lock a drop hangs and swells, lets go and falls, each on its own slow beat. One set of them for
  // the bushes that are always there and one each for the staged ones, shown with them.
  const drops = ctx.rng('gill-plume-drops');
  const dropsOf = (all: Grown[], share: number): THREE.BufferGeometry => {
    const geometry = new THREE.BufferGeometry();
    const fields: Record<'aA' | 'aB' | 'aC' | 'aSway' | 'aTint' | 'aDrop', number[]> = { aA: [], aB: [], aC: [], aSway: [], aTint: [], aDrop: [] };
    const position: number[] = [];
    const corner: number[] = [];
    const index: number[] = [];
    let count = 0;
    const quad = (tip: Tip, every: number, offset: number, size: number, falls: number, ground: number): void => {
      for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        position.push(tip.a[0], tip.a[1], tip.a[2]);
        fields.aA.push(...tip.a);
        fields.aB.push(...tip.b);
        fields.aC.push(...tip.c);
        fields.aSway.push(...tip.sway);
        fields.aTint.push(...tip.tint);
        fields.aDrop.push(every, offset, size, falls);
        corner.push(cx, cy, ground);
      }
      index.push(count, count + 1, count + 2, count, count + 2, count + 3);
      count += 4;
    };
    for (const g of all) {
      for (const tip of g.tips) {
        if (drops.next() > share) continue;
        const every = drops.range(3, 11);
        const offset = drops.range(0, 11);
        const size = drops.range(0.006, 0.014);
        const x = tip.a[0] + tip.b[0] + tip.c[0];
        const z = tip.a[2] + tip.b[2] + tip.c[2];
        const ground = floor(x, z);
        quad(tip, every, offset, size, 0, ground);
        quad(tip, every, offset, size, 1, ground);
      }
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    for (const [name, values] of Object.entries(fields)) geometry.setAttribute(name, new THREE.Float32BufferAttribute(values, 4));
    geometry.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 3));
    geometry.setIndex(index);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
    return geometry;
  };
  // Only the bushes a lens comes close to have drops that can be seen.
  const nearOnes = grown.filter((_g, i) => (bushes[i] as Bush).detail >= 1);
  const dropGeometries = [dropsOf(nearOnes, 0.14), dropsOf([], 0), dropsOf(hangGrown, 0.14)];
  const dropMaterial = new THREE.ShaderMaterial({
    vertexShader: DROP_VERTEX,
    fragmentShader: DROP_FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  [group, rimGroup, hangGroup].forEach((into, i) => {
    const dropMesh = new THREE.Mesh(dropGeometries[i] as THREE.BufferGeometry, dropMaterial);
    dropMesh.frustumCulled = false;
    dropMesh.renderOrder = 20;
    into.add(dropMesh);
  });
  ctx.scene.add(ctx.parts.built('gill-plumes', group));

  // Each bush stands in its own shade on the rock, and throws a long one away from the sun.
  const discs = rig.contactDiscs(bushes.length * 2);
  bushes.forEach((b, i) => {
    rig.setDisc(discs, i * 2, b.x + Math.sin(b.lean) * 0.2 * b.tall, b.z - Math.cos(b.lean) * 0.2 * b.tall, 0.42 * b.tall, 0.7);
    rig.setShadow(discs, i * 2 + 1, b.x, b.z, 0.35 * b.tall, 0.8 * b.tall, 0.5);
  });

  const rimDiscs = rig.contactDiscs(rimBushes.length * 2);
  const rimSpan = shotSpan('breath-05');
  const hangDiscs = rig.contactDiscs(hangBushes.length);
  const hangSpan = shotSpan('breath-02');

  let height = 0;
  const size = new THREE.Vector2();
  return {
    setTime: (t) => {
      seconds.value = t;
      surge.value = surgeAt(t);
      // Staged by shot: the growth by the rim wader is on the set for breath-05 alone.
      const at = stagedSeconds();
      const shown = at >= rimSpan[0] && at <= rimSpan[1];
      rimGroup.visible = shown;
      const hung = at >= hangSpan[0] && at <= hangSpan[1];
      hangGroup.visible = hung;
      hangBushes.forEach((b, i) => rig.setShadow(hangDiscs, i, b.x, b.z, 0.2 * b.tall, 0.4 * b.tall, hung ? 0.5 : 0));
      rimBushes.forEach((b, i) => {
        rig.setDisc(rimDiscs, i * 2, b.x + Math.sin(b.lean) * 0.2 * b.tall, b.z - Math.cos(b.lean) * 0.2 * b.tall, 0.42 * b.tall, shown ? 0.7 : 0);
        rig.setShadow(rimDiscs, i * 2 + 1, b.x, b.z, 0.35 * b.tall, 0.8 * b.tall, shown ? 0.5 : 0);
      });
    },
    beforeSample: (renderer, camera) => {
      renderer.getDrawingBufferSize(size);
      pixel.value = 2 / ((camera.projectionMatrix.elements[5] as number) * (height || size.y || 2160));
    },
    resize: (_width, h) => {
      height = h;
    },
    dispose: () => {
      for (const g of [...grown, ...rimGrown, ...hangGrown]) {
        g.threads.dispose();
        g.stems.dispose();
      }
      threadMaterial.dispose();
      stemMaterial.dispose();
      for (const g of dropGeometries) g.dispose();
      dropMaterial.dispose();
      holdfastMaterial.dispose();
      for (const g of lumps) g.dispose();
    },
  };
}
