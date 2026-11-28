// The gill-plumes: crimson feathered growths on the lip of the shaft and a few seedlings away from it.
// Every bush is grown once from the seeded stream (sprays.ts): stalks that leave one holdfast and fork, and fork again, down to wet filaments.
// Each bush is its own two meshes, so one that is out of the frame costs nothing. The sway and the drops are in the vertex shaders (shaders.ts).
import * as THREE from 'three';
import { BUSHES, SEA_LEVEL, SEEDLINGS, WIND, bushAt, onRim, shotSpan } from '../shared/anchors';
import { stagedSeconds } from '../shared/stage';
import { surgeAt } from '../shared/blockout';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { grow, type Bush, type Grown, type Tip } from './sprays';
import { DROP_FRAGMENT, DROP_VERTEX, STEM_FRAGMENT, STEM_VERTEX, THREAD_FRAGMENT, THREAD_VERTEX } from './shaders';

export const PARTS: readonly string[] = ['gill-plumes'];

/** Staged, metres: see where the bushes are placed. */
const HERO_WEST = 4.6;
/** Which of `BUSHES` stands on the south lip at the right edge of the wide lens. */
const SOUTH = 6;

/** Staged for shot breath-01 only: which of the bushes of the lip stay on the set as the few tufts of key breath-0 (the index in the list
 *  of bushes as it is built in `create`), and how much of the sun comes through the mass there. */
const WIDE_TUFTS: readonly number[] = [];
const WIDE_GLOW = 0.3;
const WIDE_SHADE = 0.6;
/** Metres round the bush of the south lip within which the growth is part of its clump. */
const SOUTH_CLUMP = 6;
/** Staged for shot breath-05 only: the lens of that shot, the radius of the lens in metres and the distance of sharp focus in metres. */
const RIM_LENS: readonly [number, number] = [0.0084, 6.2];

/** Staged for shot breath-05 only: the growth that stands behind and beside the wader at the rim in the picture of key breath-2, and the low shoots
 *  on the plate between it and the lens. x, z, height in metres. They stand where the lens of breath-03 walks, so no other shot has them. */
const RIM_GROWTH: ReadonlyArray<readonly [number, number, number, number]> = [
  [-30.4, 11.0, 5.2, 0.5],
  [-28.0, 9.0, 4.0, 0.5],
  [-34.0, 13.5, 2.4, 0.5],
  [-30.6, 18.0, 0.9, 0.45],
  [-32.4, 19.3, 0.7, 0.45],
  [-30.8, 21.6, 0.55, 0.45],
  [-33.6, 16.6, 0.8, 0.45],
  [-34.9, 20.4, 0.6, 0.45],
];

/** Staged for shot breath-02: where each hanging one is rooted (x, z), how tall, and the point on the ground it leans over (x, z). */
const HANG: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [-18.3, 24.8, 7.9, -9.1, 19.5],
  [-19.9, 22.0, 7.0, -11.1, 16.7],
  // A lower one: the mass goes on down the left edge of that frame, as key breath-4 has it, and no nearer its middle.
  [-16.5, 28.0, 5.9, -11.0, 26.6],
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
  // It is wrinkled as a root is: creases cross it, dark at the bottom of each, and the light picks out their edges.
  vec2 q = vWorld.xz * 23.0 + vWorld.y * vec2(15.0, -11.0);
  float w0 = fbm(q);
  n = normalize(n + 1.6 * vec3(w0 - fbm(q + vec2(0.3, 0.0)), 0.0, w0 - fbm(q + vec2(0.0, 0.3))));
  float crease = smoothstep(0.3, 0.55, w0);
  vec3 albedo = mix(vec3(0.1, 0.03, 0.035), vec3(0.46, 0.2, 0.19), fold) * (0.8 + 0.4 * vnoise(vWorld.xz * 60.0 + vWorld.y * 40.0)) * (0.4 + 0.6 * crease);
  vec3 colour = rigShade(vWorld, n, v, albedo, 0.28, 0.3 + 0.7 * fold);
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
    // The farther stops short of the right third of that frame, which is the pit's and the steam's; the nearer is kept low beside it.
    // Staged: the one on the south-west lip stands where the lens of key breath-4 now does. It is rooted five metres to that lens's
    // left and behind it, out of its frame; what hangs into that frame is grown for that shot alone (HANG).
    const [x, z] = i === 1 ? [-36.31, -1.13] : i === 0 ? [at[0] - 1.17, at[1] - 2.1] : i === 5 ? onBrim(-13.5, 33.5) : at;
    // Two stand in front of a camera at the lip: every frond is grown. The others are seen from far off.
    // The one on the south-west lip is by the wide lens: there it is a low fountain, not a tall plume in the corner of that frame.
    bushes.push({ x, y: floor(x, z), z, tall: i === 1 ? tall * 0.6 : i === 5 ? tall * 0.11 : i === 0 ? tall * 1.3 : tall, lean: i === 1 ? Math.atan2(0.35, 0.94) : Math.atan2(-x, z), detail: i < 2 ? 1 : 0.5, habit: i < 2 ? 'sweep' : 'fountain', ...(i === 0 ? { spread: 0.85, full: 1.0 } : i === 1 ? { full: 0.95 } : i === 5 ? { full: 0.4 } : {}) });
  });
  // Between the tall ones the lip is grown over: low dense growth in a crescent along the rim where the anchored bushes stand, seen from the wide key
  // as one dark red band. None stands where a lens passes: they keep to the far side of the tall ones from every camera at the lip.
  const fill = ctx.rng('gill-plume-fill');
  for (let j = 0; j < 16; j++) {
    const bearing = -72 + (j + fill.next()) * (50 / 16);
    const [x, z] = onRim(bearing, fill.range(0.8, 5.5));
    bushes.push({ x, y: floor(x, z), z, tall: fill.range(1.4, 2.6), lean: Math.atan2(-x, z), detail: 0.4, habit: 'fountain', full: 0.92 });
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
    bushes.push({ x, y, z, tall, lean: Math.atan2(-x, z), detail: 0.4, habit: 'fountain', full: 0.92 });
  }
  // A seedling whose anchor is under the water is not grown: nothing of this kind roots in the channel.
  for (const [x, z, tall] of SEEDLINGS) if (floor(x, z) > SEA_LEVEL + 0.03) bushes.push({ x, y: floor(x, z), z, tall: tall * 0.7, lean: Math.atan2(-x, z), detail: 0.5, habit: 'fountain', full: 0.45 });

  const grown: Grown[] = bushes.map((bush) => grow(bush, rng, floor));

  const rimRng = ctx.rng('gill-plume-rim');
  // The low ones on the plate are sprigs: a few stems. The tall ones are bushes of coral, each of its own build.
  const rimBushes: Bush[] = RIM_GROWTH.map(([x, z, tall, detail]) => ({ x, y: floor(x, z), z, tall, lean: Math.atan2(-x, z), detail, habit: 'fountain', full: tall < 1 ? 0.4 : 1 }));
  // In that shot the two tall ones by the lens of breath-03 are low domes too (see setTime).
  for (let i = 0; i < 2; i++) {
    const b = bushes[i] as Bush;
    rimBushes.push({ x: b.x, y: b.y, z: b.z, tall: i === 0 ? 3.0 : 3.4, lean: b.lean, detail: 0.5, habit: 'fountain' });
  }
  const rimGrown: Grown[] = rimBushes.map((bush) => grow(bush, rimRng, floor));
  // Those fountains are the dark mass the wide lens of breath-01 sees. For the lens at the rim (breath-05) the same places carry bushes of
  // coral, each grown of its own numbers: forking stems clothed in short brush, no two of one build.
  const coralRng = ctx.rng('gill-plume-coral');
  const coralGrown: Grown[] = rimBushes.map((bush) => grow({ ...bush, habit: 'coral' }, coralRng, floor));
  // Staged by shot (breath-02): two tall weeping ones on the south-west lip, rooted to the left of that lens and leaning across its upper left
  // corner, so that their locks hang into the frame from above and from the left, as the picture has them. No other shot has them.
  const hangRng = ctx.rng('gill-plume-hang');
  const hangBushes: Bush[] = HANG.map(([hx, hz, tall, tx, tz]) => {
    const [x, z] = onBrim(hx, hz);
    return { x, y: floor(x, z), z, tall, lean: Math.atan2(tx - x, z - tz), detail: 1, habit: 'hang', reach: 1.65, full: tall < 6.5 ? 1 : 2.4 };
  });
  const hangGrown: Grown[] = hangBushes.map((bush) => grow(bush, hangRng, floor));

  const pixel = { value: 0.001 };
  const seconds = { value: 0 };
  const surge = { value: 0 };
  const lensOf = { value: new THREE.Vector2(0, 1) };
  const uniforms = {
    ...rig.uniforms,
    uPixel: pixel,
    uSeconds: seconds,
    uSurge: surge,
    uWind: { value: new THREE.Vector2(WIND[0], WIND[1]) },
    uStagger: { value: 0 },
    uLens: lensOf,
  };
  // Opaque and whole: the engine lays their depth first, and a strip behind another costs only that. Each bush has its own two
  // materials (one program for all of them), because its sway is worked from its own root.
  const materials: THREE.ShaderMaterial[] = [];
  const meshes = (g: Grown, into: THREE.Group, glow = 1, stagger = 0): { glow: { value: number }; shade: { value: number } } => {
    // `glow`: how much of the sun comes through its hair. The ones that hang into the pit are seen from above, in the pit's shade.
    const glowOf = { value: glow };
    const shadeOf = { value: 1 };
    const own = { ...uniforms, uBush: { value: g.root }, uTall: { value: g.tall }, uGlow: glowOf, uShade: shadeOf, uStagger: { value: stagger } };
    const threadMaterial = new THREE.ShaderMaterial({ vertexShader: THREAD_VERTEX, fragmentShader: THREAD_FRAGMENT, uniforms: own, side: THREE.DoubleSide });
    const stemMaterial = new THREE.ShaderMaterial({ vertexShader: STEM_VERTEX, fragmentShader: STEM_FRAGMENT, uniforms: own });
    materials.push(threadMaterial, stemMaterial);
    into.add(new THREE.Mesh(g.threads, threadMaterial), new THREE.Mesh(g.stems, stemMaterial));
    return { glow: glowOf, shade: shadeOf };
  };

  // The holdfasts: a knotted lump in the rock under every bush, lumpier than round, half sunk.
  const lump = new THREE.IcosahedronGeometry(1, 4);
  const lumps: THREE.BufferGeometry[] = [];
  const holdfastMaterial = new THREE.ShaderMaterial({ vertexShader: RIG_VERTEX, fragmentShader: HOLDFAST_FRAGMENT, uniforms: { ...rig.uniforms } });
  const group = new THREE.Group();
  const rimGroup = new THREE.Group();
  const hangGroup = new THREE.Group();
  const heroGroup = new THREE.Group();
  const domeGroup = new THREE.Group();
  // The one on the south lip is cut by the right edge of the wide lens of breath-01, as in its picture: it is kept dark there, as the others are.
  const southGroup = new THREE.Group();
  // Staged for shot breath-01 alone: the wide lens has one dark mass on the lip, behind the wader, and a few tufts (key breath-0). The rest
  // of the growth on the lip is off the set for that shot and stands in every other.
  const lipGroup = new THREE.Group();
  // The clump at the right edge of that lens is the one on the south lip with what stands round it: all of it stays as it is.
  const bySouth = (i: number): boolean => {
    const b = bushes[i] as Bush;
    const s = bushes[SOUTH] as Bush;
    return Math.hypot(b.x - s.x, b.z - s.z) < SOUTH_CLUMP;
  };
  const homeOf = (i: number): THREE.Group => (i < 2 ? heroGroup : i === SOUTH ? southGroup : WIDE_TUFTS.includes(i) || bySouth(i) ? group : lipGroup);
  grown.forEach((g, i) => meshes(g, homeOf(i), i < 2 ? 1.5 : i === 5 || i === SOUTH ? 0.4 : 1, i < 2 ? 1 : 0));
  const wideGroup = new THREE.Group();
  const massGlow = rimGrown.map((g) => meshes(g, wideGroup));
  coralGrown.forEach((g, i) => meshes(g, i >= RIM_GROWTH.length ? domeGroup : rimGroup));
  for (const g of hangGrown) meshes(g, hangGroup, 0.4);
  group.add(rimGroup, hangGroup, heroGroup, domeGroup, southGroup, lipGroup, wideGroup);
  for (const b of [...bushes, ...rimBushes]) {
    const g = lump.clone();
    const at = g.getAttribute('position') as THREE.BufferAttribute;
    const seed = rng.range(0, 50);
    let low = b.y;
    for (let k = 0; k < 8; k++) low = Math.min(low, floor(b.x + Math.cos(k * 0.785) * 0.08 * b.tall, b.z + Math.sin(k * 0.785) * 0.08 * b.tall));
    for (let i = 0; i < at.count; i++) {
      const x = at.getX(i);
      const y = at.getY(i);
      const z = at.getZ(i);
      // It grips with roots: ridges run out from under the limbs and die into the rock, no two of a length.
      const round = Math.atan2(z, x);
      const roots = Math.pow(0.5 + 0.5 * Math.sin(round * 5 + seed + 1.3 * Math.sin(round * 2 + seed * 0.7)), 2);
      const swell = 0.8 + 0.6 * roots * (1 - 0.6 * Math.max(y, 0)) + 0.12 * Math.sin(y * 4 + x * 2 + seed * 2.1);
      const r = 0.075 * b.tall * swell;
      // A foot spread on the rock: wide, low, and set as low as the lowest rock under it, so that it never hangs over a hollow.
      at.setXYZ(i, b.x + x * r * 1.9, low - 0.004 * b.tall + y * r * 0.75, b.z + z * r * 1.9);
      // The lump is smooth: its normal is the ball's, flattened as the lump is.
      const nl = Math.hypot(x / 1.7, y / 0.75, z / 1.7) || 1;
      (g.getAttribute('normal') as THREE.BufferAttribute).setXYZ(i, x / 1.7 / nl, y / 0.75 / nl, z / 1.7 / nl);
    }
    lumps.push(g);
    const m = new THREE.Mesh(g, holdfastMaterial);
    m.frustumCulled = false;
    (rimBushes.includes(b) ? (rimBushes.indexOf(b) >= RIM_GROWTH.length ? domeGroup : rimGroup) : homeOf(bushes.indexOf(b))).add(m);
  }
  lump.dispose();

  // The wet ends drip: at the point of a lock a drop hangs and swells, lets go and falls, each on its own slow beat. One set of them for
  // the bushes that are always there and one each for the staged ones, shown with them.
  const drops = ctx.rng('gill-plume-drops');
  const dropsOf = (all: Grown[], share: number): THREE.BufferGeometry => {
    const geometry = new THREE.BufferGeometry();
    const fields: Record<'aA' | 'aB' | 'aC' | 'aSway' | 'aTint' | 'aDrop' | 'aBush', number[]> = { aA: [], aB: [], aC: [], aSway: [], aTint: [], aDrop: [], aBush: [] };
    const position: number[] = [];
    const corner: number[] = [];
    const index: number[] = [];
    let count = 0;
    const quad = (g: Grown, tip: Tip, every: number, offset: number, size: number, falls: number, ground: number): void => {
      for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
        position.push(tip.a[0], tip.a[1], tip.a[2]);
        fields.aA.push(...tip.a);
        fields.aB.push(...tip.b);
        fields.aC.push(...tip.c);
        fields.aSway.push(...tip.sway);
        fields.aTint.push(tip.tint[0], tip.tint[1], tip.tint[2], g.tall);
        fields.aBush.push(g.root.x, g.root.y, g.root.z, g.root.w);
        fields.aDrop.push(every, offset, size, falls);
        corner.push(cx, cy, ground);
      }
      index.push(count, count + 1, count + 2, count, count + 2, count + 3);
      count += 4;
    };
    for (const g of all) {
      // Only a point with open air under it drips where it can be seen: the others drip into the bush. `share` is how many drip, a bush.
      const open = g.tips.filter((tip) => tip.under > 0.9);
      for (const tip of open) {
        // They gather: the locks of one part of the bush run with water and their neighbours hold none. Most are small, a few heavy.
        const cell = Math.sin(Math.floor(tip.a[0] * 2.6) * 12.9898 + Math.floor(tip.a[1] * 2.6) * 78.233 + Math.floor(tip.a[2] * 2.6) * 37.719) * 43758.5453;
        const run = cell - Math.floor(cell) < 0.4 ? 2.5 : 0;
        if (drops.next() > (run * share) / Math.max(1, open.length)) continue;
        const every = drops.range(2.2, 8);
        const offset = drops.range(0, 11);
        const size = 0.007 + 0.022 * drops.next() ** 2.2;
        const x = tip.a[0] + tip.b[0] + tip.c[0];
        const z = tip.a[2] + tip.b[2] + tip.c[2];
        const ground = floor(x, z);
        quad(g, tip, every, offset, size, 0, ground);
        quad(g, tip, every, offset, size, 1, ground);
        // A drop seldom falls alone: a smaller one follows it off the same point.
        quad(g, tip, every, offset - 0.17, size * 0.7, 1, ground);
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
  const dropGeometries = [dropsOf(nearOnes, 150), dropsOf([], 0), dropsOf(hangGrown, 90)];
  const dropMaterialOf = (stagger: number): THREE.ShaderMaterial => new THREE.ShaderMaterial({
    vertexShader: DROP_VERTEX,
    fragmentShader: DROP_FRAGMENT,
    uniforms: { ...uniforms, uStagger: { value: stagger } },
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  // The drops of the two tall ones leave limbs that move stalk by stalk, as those do.
  const dropMaterials = [dropMaterialOf(1), dropMaterialOf(0)];
  [heroGroup, rimGroup, hangGroup].forEach((into, i) => {
    const dropMesh = new THREE.Mesh(dropGeometries[i] as THREE.BufferGeometry, dropMaterials[i === 0 ? 0 : 1] as THREE.ShaderMaterial);
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
  const wideSpan = shotSpan('breath-01');
  const hangDiscs = rig.contactDiscs(hangBushes.length);
  const hangSpan = shotSpan('breath-02');

  let height = 0;
  const size = new THREE.Vector2();
  return {
    setTime: (t) => {
      seconds.value = t;
      surge.value = surgeAt(t);
      // Staged by shot: the growth by the rim wader is on the set for breath-05, and for the wide lens of breath-01.
      const at = stagedSeconds();
      const shown = at >= rimSpan[0] && at <= rimSpan[1];
      const wide = at >= wideSpan[0] && at <= wideSpan[1];
      // The two tall ones are grown for the lens that stands among them (breath-03). From the rim's lens they stood over the wader as
      // two trees, and from the wide lens they were two dark lumps on the lip, where the pictures have low spreading brush: in those
      // two shots low domes stand in their place (the last two of the rim's bushes).
      const low = shown || wide;
      lensOf.value.set(shown ? RIM_LENS[0] : 0, shown ? 1 / RIM_LENS[1] : 1);
      lipGroup.visible = !wide;
      // From the wide lens the mass is dark crimson, not lit through.
      for (const m of massGlow) {
        m.glow.value = wide ? WIDE_GLOW : 1;
        m.shade.value = wide ? WIDE_SHADE : 1;
      }
      bushes.forEach((b, i) => {
        if (i < 2 || homeOf(i) !== lipGroup) return;
        rig.setDisc(discs, i * 2, b.x + Math.sin(b.lean) * 0.2 * b.tall, b.z - Math.cos(b.lean) * 0.2 * b.tall, 0.42 * b.tall, wide ? 0 : 0.7);
        rig.setShadow(discs, i * 2 + 1, b.x, b.z, 0.35 * b.tall, 0.8 * b.tall, wide ? 0 : 0.5);
      });
      // The mounds at the rim are the dark red mass on the lip that the wide lens sees.
      rimGroup.visible = shown;
      wideGroup.visible = wide;
      heroGroup.visible = !low;
      domeGroup.visible = shown;
      for (let i = 0; i < 2; i++) {
        const b = bushes[i] as Bush;
        rig.setDisc(discs, i * 2, b.x + Math.sin(b.lean) * 0.2 * b.tall, b.z - Math.cos(b.lean) * 0.2 * b.tall, 0.42 * b.tall, low ? 0 : 0.7);
        rig.setShadow(discs, i * 2 + 1, b.x, b.z, 0.35 * b.tall, 0.8 * b.tall, low ? 0 : 0.5);
      }
      const hung = at >= hangSpan[0] && at <= hangSpan[1];
      hangGroup.visible = hung;
      hangBushes.forEach((b, i) => rig.setShadow(hangDiscs, i, b.x, b.z, 0.2 * b.tall, 0.4 * b.tall, hung ? 0.5 : 0));
      rimBushes.forEach((b, i) => {
        const here = low;
        rig.setDisc(rimDiscs, i * 2, b.x + Math.sin(b.lean) * 0.2 * b.tall, b.z - Math.cos(b.lean) * 0.2 * b.tall, 0.42 * b.tall, here ? 0.7 : 0);
        rig.setShadow(rimDiscs, i * 2 + 1, b.x, b.z, 0.35 * b.tall, 0.8 * b.tall, here ? 0.5 : 0);
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
      for (const g of [...grown, ...rimGrown, ...coralGrown, ...hangGrown]) {
        g.threads.dispose();
        g.stems.dispose();
      }
      for (const m of materials) m.dispose();
      for (const g of dropGeometries) g.dispose();
      for (const m of dropMaterials) m.dispose();
      holdfastMaterial.dispose();
      for (const g of lumps) g.dispose();
    },
  };
}
