// The gill-plumes: crimson feathered growths on the lip of the shaft and a few seedlings away from it.
// Every bush is grown once from the seeded stream (cards.ts): a fan of sprays cut from the plume picture, standing on a holdfast.
// The sway is in the vertex shader.
import * as THREE from 'three';
import { BUSHES, SEEDLINGS, WIND, bushAt } from '../shared/anchors';
import { surgeAt } from '../shared/blockout';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { Cards, type Bush } from './cards';
import { VANE_DEPTH, VANE_FRAGMENT, VANE_VERTEX } from './shaders';
import { makeDrips } from '../waders/drips';

export const PARTS: readonly string[] = ['gill-plumes'];

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
    const [x, z] = bushAt(i);
    // Three stand in front of a camera at the lip: every frond is grown. The others are seen from far off.
    bushes.push({ x, y: floor(x, z), z, tall, lean: Math.atan2(-x, z), detail: i < 2 || i === 5 ? 1 : 0.5 });
  });
  for (const [x, z, tall] of SEEDLINGS) bushes.push({ x, y: floor(x, z), z, tall, lean: Math.atan2(-x, z), detail: 0.4 });

  const vanes = new Cards();
  // The wet tips drip: the ends of the threads of the bushes that a camera comes close to, each with its own slow beat.
  interface Tip { x: number; y: number; z: number; h: number; phase: number; tall: number; ax: number; az: number; every: number; offset: number; ground: number }
  const tips: Tip[] = [];
  const drops = ctx.rng('gill-plume-drops');
  for (const bush of bushes) {
    const before = vanes.ends.length;
    vanes.grow(bush, rng, floor);
    if (bush.detail < 1) continue;
    for (let e = before; e < vanes.ends.length; e++) {
      const end = vanes.ends[e] as (typeof vanes.ends)[number];
      const keep = drops.next() < 0.5;
      const every = drops.range(1.6, 5);
      const offset = drops.range(0, 9);
      if (!keep) continue;
      const rl = Math.hypot(end.root[0], end.root[2]) || 1;
      tips.push({ x: end.at[0], y: end.at[1], z: end.at[2], h: end.stemAt, phase: end.phase, tall: end.tall, ax: end.root[0] / rl, az: end.root[2] / rl, every, offset, ground: floor(end.at[0], end.at[2]) });
    }
  }
  const vaneGeometry = vanes.build();

  const pixel = { value: 0.001 };
  const seconds = { value: 0 };
  const surge = { value: 0 };
  const uniforms = {
    ...rig.uniforms,
    uPixel: pixel,
    uSeconds: seconds,
    uSurge: surge,
    uWind: { value: new THREE.Vector2(WIND[0], WIND[1]) },
    tPlume: { value: ctx.assets.texture('plumes/spray.jpg', { repeat: false }) },
    tPlumeA: { value: ctx.assets.texture('plumes/spray-a.png', { kind: 'data', repeat: false }) },
  };
  const vaneMaterial = new THREE.ShaderMaterial({ vertexShader: VANE_VERTEX, fragmentShader: VANE_FRAGMENT, uniforms, side: THREE.DoubleSide });
  // The fog reads the depth laid before the picture: the sprays say there which of their pixels are threads.
  vaneMaterial.userData.depthFragment = VANE_DEPTH;
  const vaneMesh = new THREE.Mesh(vaneGeometry, vaneMaterial);
  vaneMesh.frustumCulled = false;

  // The holdfasts: a knotted lump in the rock under every bush, lumpier than round, half sunk.
  const lump = new THREE.IcosahedronGeometry(1, 4);
  const lumps: THREE.BufferGeometry[] = [];
  const holdfastMaterial = new THREE.ShaderMaterial({ vertexShader: RIG_VERTEX, fragmentShader: HOLDFAST_FRAGMENT, uniforms: { ...rig.uniforms } });
  const group = new THREE.Group();
  group.add(vaneMesh);
  for (const b of bushes) {
    const g = lump.clone();
    const at = g.getAttribute('position') as THREE.BufferAttribute;
    const seed = rng.range(0, 50);
    for (let i = 0; i < at.count; i++) {
      const x = at.getX(i);
      const y = at.getY(i);
      const z = at.getZ(i);
      const swell = 1 + 0.28 * Math.sin(x * 5 + seed) * Math.sin(z * 4.3 + seed * 1.3) + 0.2 * Math.sin(y * 7 + x * 3 + seed * 2.1) + 0.12 * Math.sin(x * 11 + z * 9 + seed);
      const r = 0.05 * b.tall * swell;
      at.setXYZ(i, b.x + x * r * 1.25, b.y + y * r * 0.62 + 0.01 * b.tall, b.z + z * r * 1.25);
    }
    g.computeVertexNormals();
    lumps.push(g);
    const m = new THREE.Mesh(g, holdfastMaterial);
    m.frustumCulled = false;
    group.add(m);
  }
  lump.dispose();
  const drips = makeDrips(Math.max(1, tips.length), uniforms);
  group.add(drips.mesh);
  ctx.scene.add(ctx.parts.built('gill-plumes', group));

  // Each bush stands in its own shade on the rock, and throws a long one away from the sun.
  const discs = rig.contactDiscs(bushes.length * 2);
  bushes.forEach((b, i) => {
    rig.setDisc(discs, i * 2, b.x + Math.sin(b.lean) * 0.2 * b.tall, b.z - Math.cos(b.lean) * 0.2 * b.tall, 0.42 * b.tall, 0.7);
    rig.setShadow(discs, i * 2 + 1, b.x, b.z, 0.35 * b.tall, 0.8 * b.tall, 0.5);
  });

  let height = 0;
  const size = new THREE.Vector2();
  return {
    setTime: (t) => {
      seconds.value = t;
      surge.value = surgeAt(t);
      drips.begin();
      for (const tip of tips) {
        const fallen = (((t + tip.offset) % tip.every) + tip.every) % tip.every;
        if (fallen > 0.55) continue;
        // It left the tip where the sway had the tip then (the stem's part of the sway in shaders.ts), and falls from there.
        const then = t - fallen;
        const a = tip.h * tip.h * tip.tall;
        const slow = Math.sin(then * 1.25 - tip.h * 2.6 + tip.phase) + 0.45 * Math.sin(then * 0.53 + tip.phase * 1.7);
        const quick = Math.sin(then * 3.1 - tip.h * 5 + tip.phase * 2.3);
        const shake = 0.6 + 0.4 * Math.sin(then * 6.3 - tip.h * 7 + tip.phase * 3.1);
        const blown = surgeAt(then);
        const push = (0.07 * slow + 0.024 * quick) * a;
        const x = tip.x + WIND[0] * push + tip.ax * 0.2 * blown * shake * a;
        const z = tip.z + WIND[1] * push + tip.az * 0.2 * blown * shake * a;
        const y = tip.y + (0.11 * blown * shake - 0.02 * slow) * a - 4.9 * fallen * fallen;
        if (y < tip.ground) continue;
        // The shutter is open a fiftieth of a second: a drop that has fallen a while is a short streak.
        drips.add(x, y, z, Math.min(0.024, Math.max(0.006, 9.8 * fallen * 0.006)));
      }
      drips.end();
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
      holdfastMaterial.dispose();
      drips.dispose();
      for (const g of lumps) g.dispose();
    },
  };
}
