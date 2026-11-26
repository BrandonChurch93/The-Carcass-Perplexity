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
uniform vec3 uMud;
${NOISE_GLSL}
${RIG_GLSL}
float mudHeight(vec2 p) {
  vec2 q = p - uAt.xy;
  float r = length(q);
  // Each heave sends a slow fold out through the mud, and it dies within two metres.
  float fold = sin(r * 5.5 - uHeave.y) * uHeave.x * exp(-r * 0.7);
  return 0.55 * fbm(p * 1.1 + 3.0) + 0.25 * fbm(p * 2.9 + 11.0) + 0.16 * fold;
}
void main() {
  vec2 p = vWorld.xz;
  float e = 0.012;
  float h0 = mudHeight(p);
  vec3 n = normalize(vec3(-(mudHeight(p + vec2(e, 0.0)) - h0) / e * 0.16, 1.0, -(mudHeight(p + vec2(0.0, e)) - h0) / e * 0.16));
  vec3 v = normalize(cameraPosition - vWorld);
  // Red brine stands in the hollows; the high places have begun to dry and pale.
  float low = smoothstep(0.52, 0.4, h0);
  float dry = smoothstep(0.55, 0.72, h0) * smoothstep(0.3, 0.8, vEdge);
  vec3 albedo = uMud * (0.75 + 0.5 * fbm(p * 5.0));
  // Red mud wells up where the animal works it.
  float well = 1.0 - smoothstep(0.25, 0.75, length((p - uAt.xy)) / uAt.z);
  albedo = mix(albedo, vec3(0.1, 0.03, 0.022), 0.55 * well * smoothstep(0.35, 0.6, fbm(p * 2.3 + 7.0)));
  albedo = mix(albedo, uMud * 1.5 + 0.012, dry);
  albedo = mix(albedo, vec3(0.05, 0.015, 0.012), low * 0.6);
  float rough = mix(0.97, 1.0, dry);
  rough = mix(rough, 0.35, low);
  float occ = 0.75 + 0.25 * smoothstep(0.35, 0.6, h0);
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  // Wet mud drinks the light: it does not hold the sky as the crust does.
  c *= mix(0.5, 0.75, low);
  // Its edge is not a line: it thins out over the crust it has run onto.
  float a = smoothstep(0.04, 0.3, vEdge + 0.14 * (fbm(p * 4.0) - 0.5)) * smoothstep(0.0, 0.06, vEdge) * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(c) * (1.0 - uSolo), a);
}`;

export function mudWallow(ctx: Context, x: number, z: number, dir: [number, number], size = 1, tone: [number, number, number] = [0.1, 0.072, 0.054], name = 'dead-mud'): { mesh: THREE.Mesh; set(heave: number, seconds: number): void; dispose(): void } {
  const rng = ctx.rng(name);
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
      const along = (Math.cos(a) * 3.3 * reach * u + 0.4) * size;
      const across = Math.sin(a) * 2.2 * reach * u * size;
      const px = x + dir[0] * along - dir[1] * across;
      const pz = z + dir[1] * along + dir[0] * across;
      // It stands a little proud of the trodden crust in the middle and goes under the plates at its edge.
      // Pushed up in a low rim round the body, and thinning to nothing over the crust.
      const lift = 0.04 + 0.09 * (1 - u * u) + 0.07 * Math.exp(-(((u - 0.45) / 0.16) ** 2)) * (0.6 + 0.4 * Math.sin(a * 3 + wobble[0][1])) + 0.03 * (1 - u) * Math.sin(px * 3.1 + pz * 1.7) * Math.sin(pz * 2.3 - px * 0.9);
      position.push(px, ctx.rig.land.height(px, pz) + lift * Math.min(1, size), pz);
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
    uniforms: { ...ctx.rig.uniforms, uAt: { value: new THREE.Vector4(x, z, 3.0 * size, 0) }, uHeave, uMud: { value: new THREE.Vector3(tone[0], tone[1], tone[2]) } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
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
