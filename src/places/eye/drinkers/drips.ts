// Water falling from them: from a muzzle that has just come up out of the lake, and from a belly the wading has wetted. Each drop leaves at a
// moment of its own and falls as a thing falls. Where each is at t is told from t alone.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { RIG_GLSL, RIG_VERTEX } from '../shared/glsl';

const FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // A drop is a lens and a mirror: it holds the sky above it and the lake below, and the low sun stands in it as a point.
  vec3 r = reflect(-v, n);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  vec3 through = skyRadiance(normalize(vec3(-r.x, abs(r.y) + 0.15, -r.z)));
  vec3 c = mix(0.55 * through, skyRadiance(normalize(vec3(r.x, abs(r.y) + 0.05, r.z))), 0.08 + 0.92 * pow(1.0 - nv, 4.0));
  c += rigGlint(vWorld, n, v, 0.1);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export interface Drips {
  readonly mesh: THREE.InstancedMesh;
  /** Before the drops of a frame are set. */
  begin(): void;
  /** One drop in the air: where it is, how big, how fast it falls (metres a second). */
  put(x: number, y: number, z: number, radius: number, speed: number): void;
  end(): void;
  dispose(): void;
}

export function createDrips(ctx: Context, most: number): Drips {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const material = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms }, vertexShader: RIG_VERTEX, fragmentShader: FRAGMENT });
  const mesh = new THREE.InstancedMesh(geometry, material, most);
  mesh.frustumCulled = false;
  mesh.count = 0;
  ctx.scene.add(mesh);
  const m = new THREE.Matrix4();
  let n = 0;
  return {
    mesh,
    begin: () => {
      n = 0;
    },
    put: (x, y, z, radius, speed) => {
      if (n >= most) return;
      // It is drawn out the way it falls, the faster the longer.
      m.makeScale(radius, radius * (1.25 + 0.22 * speed), radius);
      m.setPosition(x, y, z);
      mesh.setMatrixAt(n++, m);
    },
    end: () => {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** How far a thing has fallen after `age` seconds, metres, and how fast it falls then. The air slows a drop little in so short a fall. */
export const fallen = (age: number): [number, number] => [0.5 * 9.81 * age * age, 9.81 * age];
