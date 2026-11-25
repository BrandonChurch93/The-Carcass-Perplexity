// The grey mud the stuck one has churned up through the broken crust: wet, slow, and moved by every heave.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

const VERTEX = /* glsl */ `
attribute float aEdge;
varying vec3 vWorld;
varying float vEdge;
void main() {
  vWorld = position;
  vEdge = aEdge;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying float vEdge;
uniform vec4 uAt;
uniform vec2 uHeave;
${NOISE_GLSL}
${RIG_GLSL}
float mudHeight(vec2 p) {
  vec2 q = p - uAt.xy;
  float r = length(q);
  // Each heave sends a slow fold out through the mud, and it dies within two metres.
  float fold = sin(r * 5.5 - uHeave.y) * uHeave.x * exp(-r * 0.7);
  return 0.5 * fbm(p * 1.1 + 3.0) + 0.3 * fbm(p * 3.7 + 11.0) + 0.1 * fbm(p * 13.0) + 0.16 * fold;
}
void main() {
  vec2 p = vWorld.xz;
  float e = 0.012;
  float h0 = mudHeight(p);
  vec3 n = normalize(vec3(-(mudHeight(p + vec2(e, 0.0)) - h0) / e * 0.4, 1.0, -(mudHeight(p + vec2(0.0, e)) - h0) / e * 0.4));
  vec3 v = normalize(cameraPosition - vWorld);
  // Red brine stands in the hollows; the high places have begun to dry and pale.
  float low = smoothstep(0.52, 0.4, h0);
  float dry = smoothstep(0.55, 0.72, h0) * smoothstep(0.3, 0.8, vEdge);
  vec3 albedo = vec3(0.075, 0.06, 0.05) * (0.75 + 0.5 * fbm(p * 5.0));
  albedo = mix(albedo, vec3(0.15, 0.135, 0.122), dry);
  albedo = mix(albedo, vec3(0.085, 0.024, 0.02), low * 0.8);
  float rough = mix(0.97, 1.0, dry);
  rough = mix(rough, 0.2, low);
  float occ = 0.75 + 0.25 * smoothstep(0.35, 0.6, h0);
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  // Wet mud drinks the light: it does not hold the sky as the crust does.
  c *= mix(0.6, 1.0, low);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export function mudWallow(ctx: Context, x: number, z: number, dir: [number, number]): { mesh: THREE.Mesh; set(heave: number, seconds: number): void; dispose(): void } {
  const rng = ctx.rng('dead-mud');
  const RINGS = 40;
  const SIDES = 120;
  const position: number[] = [];
  const edge: number[] = [];
  const index: number[] = [];
  const wobble = Array.from({ length: 9 }, () => [rng.range(0.03, 0.12), rng.range(0, Math.PI * 2)] as [number, number]);
  for (let i = 0; i <= RINGS; i++) {
    const u = i / RINGS;
    for (let j = 0; j <= SIDES; j++) {
      const a = (j / SIDES) * Math.PI * 2;
      let reach = 1;
      wobble.forEach((w, n) => {
        reach += w[0] * Math.sin(a * (n + 2) + w[1]);
      });
      // Longer along the animal than across it, and a little ahead of it, where it works to get out.
      const along = Math.cos(a) * 4.4 * reach * u + 0.5;
      const across = Math.sin(a) * 3.1 * reach * u;
      const px = x + dir[0] * along - dir[1] * across;
      const pz = z + dir[1] * along + dir[0] * across;
      // It stands a little proud of the trodden crust in the middle and goes under the plates at its edge.
      const lift = 0.05 - 0.15 * Math.pow(u, 3) + 0.03 * Math.sin(px * 3.1 + pz * 1.7) * Math.sin(pz * 2.3 - px * 0.9);
      position.push(px, ctx.rig.land.height(px, pz) + lift, pz);
      edge.push(1 - u);
    }
  }
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SIDES; j++) {
      const a = i * (SIDES + 1) + j;
      index.push(a, a + 1, a + SIDES + 1, a + 1, a + SIDES + 2, a + SIDES + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  geometry.setIndex(index);
  const uHeave = { value: new THREE.Vector2(0, 0) };
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, uAt: { value: new THREE.Vector4(x, z, 0, 0) }, uHeave },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    set: (heave, seconds) => {
      uHeave.value.set(heave, seconds * 1.6);
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
