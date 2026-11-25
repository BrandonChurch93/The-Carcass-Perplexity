// The gill-plumes: crimson feathered growths on the lip of the shaft and a few seedlings away from it.
// Every bush is grown once from the seeded stream (bush.ts): its stems are ribbons (ribbons.ts), its barbs are drawn on vanes (vanes.ts),
// and it stands on a holdfast. The sway is in the vertex shader.
import * as THREE from 'three';
import { BUSHES, SEEDLINGS, WIND, bushAt } from '../shared/anchors';
import { surgeAt } from '../shared/blockout';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { growBush, type Bush } from './bush';
import { Ribbons } from './ribbons';
import { STEM_FRAGMENT, STEM_VERTEX, VANE_FRAGMENT, VANE_VERTEX } from './shaders';
import { Vanes } from './vanes';

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
    // The first two stand in front of the camera of the lip: every frond is grown. The others are seen from far off.
    bushes.push({ x, y: floor(x, z), z, tall, lean: Math.atan2(-x, z), detail: i < 2 ? 1 : 0.5 });
  });
  for (const [x, z, tall] of SEEDLINGS) bushes.push({ x, y: floor(x, z), z, tall, lean: Math.atan2(-x, z), detail: 0.4 });

  const stems = new Ribbons();
  const vanes = new Vanes();
  for (const bush of bushes) growBush(stems, vanes, bush, rng, floor);
  const stemGeometry = stems.build();
  const vaneGeometry = vanes.build();

  const pixel = { value: 0.001 };
  const seconds = { value: 0 };
  const surge = { value: 0 };
  const uniforms = { ...rig.uniforms, uPixel: pixel, uSeconds: seconds, uSurge: surge, uWind: { value: new THREE.Vector2(WIND[0], WIND[1]) } };
  const stemMaterial = new THREE.ShaderMaterial({ vertexShader: STEM_VERTEX, fragmentShader: STEM_FRAGMENT, uniforms, side: THREE.DoubleSide });
  const vaneMaterial = new THREE.ShaderMaterial({ vertexShader: VANE_VERTEX, fragmentShader: VANE_FRAGMENT, uniforms, side: THREE.DoubleSide });
  const stemMesh = new THREE.Mesh(stemGeometry, stemMaterial);
  const vaneMesh = new THREE.Mesh(vaneGeometry, vaneMaterial);
  stemMesh.frustumCulled = false;
  vaneMesh.frustumCulled = false;

  // The holdfasts: a knotted lump in the rock under every bush, lumpier than round, half sunk.
  const lump = new THREE.IcosahedronGeometry(1, 4);
  const lumps: THREE.BufferGeometry[] = [];
  const holdfastMaterial = new THREE.ShaderMaterial({ vertexShader: RIG_VERTEX, fragmentShader: HOLDFAST_FRAGMENT, uniforms: { ...rig.uniforms } });
  const group = new THREE.Group();
  group.add(stemMesh, vaneMesh);
  for (const b of bushes) {
    const g = lump.clone();
    const at = g.getAttribute('position') as THREE.BufferAttribute;
    const seed = rng.range(0, 50);
    for (let i = 0; i < at.count; i++) {
      const x = at.getX(i);
      const y = at.getY(i);
      const z = at.getZ(i);
      const swell = 1 + 0.28 * Math.sin(x * 5 + seed) * Math.sin(z * 4.3 + seed * 1.3) + 0.2 * Math.sin(y * 7 + x * 3 + seed * 2.1) + 0.12 * Math.sin(x * 11 + z * 9 + seed);
      const r = 0.09 * b.tall * swell;
      at.setXYZ(i, b.x + x * r * 1.25, b.y + y * r * 0.62 + 0.01 * b.tall, b.z + z * r * 1.25);
    }
    g.computeVertexNormals();
    lumps.push(g);
    const m = new THREE.Mesh(g, holdfastMaterial);
    m.frustumCulled = false;
    group.add(m);
  }
  lump.dispose();
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
    },
    beforeSample: (renderer, camera) => {
      renderer.getDrawingBufferSize(size);
      pixel.value = 2 / ((camera.projectionMatrix.elements[5] as number) * (height || size.y || 2160));
    },
    resize: (_width, h) => {
      height = h;
    },
    dispose: () => {
      stemGeometry.dispose();
      vaneGeometry.dispose();
      stemMaterial.dispose();
      vaneMaterial.dispose();
      holdfastMaterial.dispose();
      for (const g of lumps) g.dispose();
    },
  };
}
