// The gill-plumes: crimson feathered growths on the lip of the shaft and a few seedlings away from it.
// Every bush is grown once from the seeded stream (fronds.ts): stems that arch from one holdfast, each carrying a frond of the frond picture.
// The sway and the drops are in the vertex shaders (shaders.ts).
import * as THREE from 'three';
import { BUSHES, SEA_LEVEL, SEEDLINGS, WIND, bushAt, onRim, shotSpan } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import { surgeAt } from '../shared/blockout';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { Fronds, type Bush } from './fronds';
import { DROP_FRAGMENT, DROP_VERTEX, STEM_FRAGMENT, STEM_VERTEX, VANE_DEPTH, VANE_FRAGMENT, VANE_VERTEX } from './shaders';

export const PARTS: readonly string[] = ['gill-plumes'];

/** Staged, metres: see where the bushes are placed. */
const HERO_WEST = 3.6;

/** Staged for shot breath-05 only: the growth that stands behind and beside the wader at the rim in the picture of key breath-2, and the low shoots
 *  on the plate between it and the lens. x, z, height in metres. They stand where the lens of breath-03 walks, so no other shot has them. */
const RIM_GROWTH: ReadonlyArray<readonly [number, number, number, number]> = [
  [-28.6, 10.6, 4.6, 1],
  [-30.4, 8.2, 4.2, 1],
  [-31.6, 12.9, 2.6, 1],
  [-33.6, 10.4, 3.2, 0.5],
  [-32.4, 19.3, 1.0, 0.5],
  [-30.8, 21.6, 0.75, 0.5],
  [-33.6, 16.6, 1.2, 0.5],
  [-34.9, 20.4, 0.8, 0.5],
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
  // Knotted wet flesh, the colour of a root: pale where it swells, wine-dark in its folds.
  float knot = fbm(vWorld.xz * 9.0 + vWorld.y * 5.0);
  float fold = smoothstep(0.35, 0.6, knot);
  vec3 albedo = mix(vec3(0.1, 0.02, 0.025), vec3(0.36, 0.22, 0.2), fold);
  vec3 colour = rigShade(vWorld, n, v, albedo, 0.4, 0.35 + 0.5 * fold);
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

export function create(ctx: Context): Piece {
  const { rig } = ctx;
  const rng = ctx.rng('gill-plumes');
  const floor = (x: number, z: number): number => rig.land.height(x, z);
  const bushes: Bush[] = [];
  BUSHES.forEach(([, , tall], i) => {
    const at = bushAt(i);
    // Staged: the two that the lens of key breath-3 stands by are rooted a stride further west of the lip than their anchors, so that
    // the nearer is cut by the left edge of that frame and the farther has its holdfast in the lower left of it, as in the picture.
    // Staged: the one on the south-west lip stands where the lens of key breath-4 now does. It is rooted three metres to that lens's left
    // and a stride ahead of it, so that its fronds hang into the upper left of that frame, as the picture has them.
    const [x, z] = i === 1 ? [at[0] - HERO_WEST, at[1] - 0.5] : i === 0 ? [at[0] + 0.1, at[1] - 0.7] : i === 5 ? [-11.5, 29.5] : at;
    // Three stand in front of a camera at the lip: every frond is grown. The others are seen from far off.
    bushes.push({ x, y: floor(x, z), z, tall: i === 0 ? tall * 1.2 : i === 5 ? tall * 1.25 : tall, lean: Math.atan2(-x, z), detail: i < 2 || i === 5 ? 1 : 0.5 });
  });
  // Between the tall ones the lip is grown over: low dense growth in a crescent along the rim where the anchored bushes stand, seen from the wide key
  // as one dark red band. None stands where a lens passes: they keep to the far side of the tall ones from every camera at the lip.
  const fill = ctx.rng('gill-plume-fill');
  for (let j = 0; j < 16; j++) {
    const bearing = -72 + (j + fill.next()) * (50 / 16);
    const [x, z] = onRim(bearing, fill.range(0.8, 5.5));
    bushes.push({ x, y: floor(x, z), z, tall: fill.range(1.4, 2.6), lean: Math.atan2(-x, z), detail: 0.4 });
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
    bushes.push({ x, y, z, tall, lean: Math.atan2(-x, z), detail: 0.4 });
  }
  for (const [x, z, tall] of SEEDLINGS) bushes.push({ x, y: floor(x, z), z, tall, lean: Math.atan2(-x, z), detail: 0.4 });

  const grown = new Fronds();
  for (const bush of bushes) grown.grow(bush, rng, floor);
  const { fronds: vaneGeometry, stems: stemGeometry } = grown.build();

  const rimRng = ctx.rng('gill-plume-rim');
  const rimBushes: Bush[] = RIM_GROWTH.map(([x, z, tall, detail]) => ({ x, y: floor(x, z), z, tall, lean: Math.atan2(-x, z), detail, mound: 1 }));
  const rimGrown = new Fronds();
  for (const bush of rimBushes) rimGrown.grow(bush, rimRng, floor);
  const rimBuilt = rimGrown.build();

  const pixel = { value: 0.001 };
  const seconds = { value: 0 };
  const surge = { value: 0 };
  const uniforms = {
    ...rig.uniforms,
    uPixel: pixel,
    uSeconds: seconds,
    uSurge: surge,
    uWind: { value: new THREE.Vector2(WIND[0], WIND[1]) },
    tFrond: { value: ctx.assets.texture('plumes/frond.jpg', { repeat: false }) },
    tFrondA: { value: ctx.assets.texture('plumes/frond-a.png', { kind: 'data', repeat: false }) },
    tFrondB: { value: ctx.assets.texture('plumes/frond-b.jpg', { repeat: false }) },
    tFrondBA: { value: ctx.assets.texture('plumes/frond-b-a.png', { kind: 'data', repeat: false }) },
  };
  const vaneMaterial = new THREE.ShaderMaterial({ vertexShader: VANE_VERTEX, fragmentShader: VANE_FRAGMENT, uniforms, side: THREE.DoubleSide });
  // The fog reads the depth laid before the picture: the ribbons say there which of their pixels are threads.
  vaneMaterial.userData.depthFragment = VANE_DEPTH;
  const vaneMesh = new THREE.Mesh(vaneGeometry, vaneMaterial);
  vaneMesh.frustumCulled = false;
  const stemMaterial = new THREE.ShaderMaterial({ vertexShader: STEM_VERTEX, fragmentShader: STEM_FRAGMENT, uniforms });
  const stemMesh = new THREE.Mesh(stemGeometry, stemMaterial);
  stemMesh.frustumCulled = false;

  // The holdfasts: a knotted lump in the rock under every bush, lumpier than round, half sunk.
  const lump = new THREE.IcosahedronGeometry(1, 4);
  const lumps: THREE.BufferGeometry[] = [];
  const holdfastMaterial = new THREE.ShaderMaterial({ vertexShader: RIG_VERTEX, fragmentShader: HOLDFAST_FRAGMENT, uniforms: { ...rig.uniforms } });
  const group = new THREE.Group();
  group.add(vaneMesh, stemMesh);
  const rimGroup = new THREE.Group();
  const rimVanes = new THREE.Mesh(rimBuilt.fronds, vaneMaterial);
  rimVanes.frustumCulled = false;
  const rimStems = new THREE.Mesh(rimBuilt.stems, stemMaterial);
  rimStems.frustumCulled = false;
  rimGroup.add(rimVanes, rimStems);
  group.add(rimGroup);
  for (const b of [...bushes, ...rimBushes]) {
    const g = lump.clone();
    const at = g.getAttribute('position') as THREE.BufferAttribute;
    const seed = rng.range(0, 50);
    for (let i = 0; i < at.count; i++) {
      const x = at.getX(i);
      const y = at.getY(i);
      const z = at.getZ(i);
      const swell = 1 + 0.28 * Math.sin(x * 5 + seed) * Math.sin(z * 4.3 + seed * 1.3) + 0.2 * Math.sin(y * 7 + x * 3 + seed * 2.1) + 0.12 * Math.sin(x * 11 + z * 9 + seed);
      const r = 0.05 * b.tall * swell;
      at.setXYZ(i, b.x + x * r * 1.25, b.y + y * r * 0.8 + 0.02 * b.tall, b.z + z * r * 1.25);
    }
    g.computeVertexNormals();
    lumps.push(g);
    const m = new THREE.Mesh(g, holdfastMaterial);
    m.frustumCulled = false;
    (rimBushes.includes(b) ? rimGroup : group).add(m);
  }
  lump.dispose();

  // The wet ends drip: at the end of a barb a drop hangs and swells, lets go and falls, each on its own slow beat.
  const drops = ctx.rng('gill-plume-drops');
  const dropGeometry = new THREE.BufferGeometry();
  {
    const position: number[] = [];
    const sway: number[] = [];
    const tint: number[] = [];
    const root: number[] = [];
    const drop: number[] = [];
    const corner: number[] = [];
    const index: number[] = [];
    let count = 0;
    const quad = (end: (typeof grown.ends)[number], every: number, offset: number, size: number, falls: number, ground: number): void => {
      for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        position.push(end.at[0], end.at[1], end.at[2]);
        sway.push(...end.sway);
        tint.push(0, 0, end.reach, end.tall);
        root.push(end.root[0], end.root[1], end.root[2]);
        drop.push(every, offset, size, falls);
        corner.push(cx, cy, ground);
      }
      index.push(count, count + 1, count + 2, count, count + 2, count + 3);
      count += 4;
    };
    for (const end of grown.ends) {
      if (drops.next() < 0.3) continue;
      const every = drops.range(1.3, 5.5);
      const offset = drops.range(0, 9);
      const size = drops.range(0.0045, 0.0085);
      const ground = floor(end.at[0], end.at[2]);
      quad(end, every, offset, size, 0, ground);
      quad(end, every, offset, size, 1, ground);
    }
    dropGeometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    dropGeometry.setAttribute('aSway', new THREE.Float32BufferAttribute(sway, 4));
    dropGeometry.setAttribute('aTint', new THREE.Float32BufferAttribute(tint, 4));
    dropGeometry.setAttribute('aRoot', new THREE.Float32BufferAttribute(root, 3));
    dropGeometry.setAttribute('aDrop', new THREE.Float32BufferAttribute(drop, 4));
    dropGeometry.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 3));
    dropGeometry.setIndex(index);
    dropGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4000);
  }
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
  const dropMesh = new THREE.Mesh(dropGeometry, dropMaterial);
  dropMesh.frustumCulled = false;
  dropMesh.renderOrder = 20;
  group.add(dropMesh);
  ctx.scene.add(ctx.parts.built('gill-plumes', group));

  // Each bush stands in its own shade on the rock, and throws a long one away from the sun.
  const discs = rig.contactDiscs(bushes.length * 2);
  bushes.forEach((b, i) => {
    rig.setDisc(discs, i * 2, b.x + Math.sin(b.lean) * 0.2 * b.tall, b.z - Math.cos(b.lean) * 0.2 * b.tall, 0.42 * b.tall, 0.7);
    rig.setShadow(discs, i * 2 + 1, b.x, b.z, 0.35 * b.tall, 0.8 * b.tall, 0.5);
  });

  const rimDiscs = rig.contactDiscs(rimBushes.length * 2);
  const rimSpan = shotSpan('breath-05');

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
      vaneGeometry.dispose();
      vaneMaterial.dispose();
      stemGeometry.dispose();
      rimBuilt.fronds.dispose();
      rimBuilt.stems.dispose();
      stemMaterial.dispose();
      dropGeometry.dispose();
      dropMaterial.dispose();
      holdfastMaterial.dispose();
      for (const g of lumps) g.dispose();
    },
  };
}
