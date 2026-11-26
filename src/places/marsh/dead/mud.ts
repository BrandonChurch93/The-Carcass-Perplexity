// The grey mud the stuck one has churned up through the broken crust: wet, slow, and moved by every heave.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

const VERTEX = /* glsl */ `
attribute float aEdge;
uniform sampler2D tMudNh;
varying vec3 vWorld;
varying float vEdge;
void main() {
  // Clods: the mud picture's own height lifts it, least at the edge where it runs out over the crust.
  float clod = 1.5 * textureLod(tMudNh, position.xz / 2.0, 2.0).b;
  vWorld = position + vec3(0.0, (clod - 0.6) * 0.06 * smoothstep(0.0, 0.35, aEdge), 0.0);
  vEdge = aEdge;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying float vEdge;
uniform vec4 uAt;
uniform vec2 uHeave;
uniform vec3 uMud;
uniform float uWetness;
uniform sampler2D tMud;
uniform sampler2D tMudNh;
${NOISE_GLSL}
${RIG_GLSL}
const vec3 MUD_MEAN = vec3(0.318, 0.179, 0.155);
void main() {
  vec2 p = vWorld.xz;
  vec2 q = p - uAt.xy;
  float r = length(q);
  // Each heave sends a slow fold out through the mud, and it dies within two metres.
  float fold = cos(r * 5.5 - uHeave.y) * uHeave.x * exp(-r * 0.7);
  vec3 wide = texture2D(tMudNh, p / 2.0).rgb;
  vec3 fine = texture2D(tMudNh, vec2(p.x * 0.8 - p.y * 0.6, p.x * 0.6 + p.y * 0.8) / 1.37 + 0.3).rgb;
  vec3 tone = texture2D(tMud, p / 2.0).rgb / MUD_MEAN;
  tone = mix(vec3(1.0), mix(vec3(dot(tone, vec3(0.3, 0.5, 0.2))), tone, 0.5), 0.6) * (0.9 + 0.2 * fine.b);
  float h0 = 0.62 * wide.b + 0.38 * fine.b;
  vec2 slope = (textureLod(tMudNh, p / 2.0, 2.5).rg - 0.5) * 0.9 + (wide.rg - 0.5) * 0.25 + (fine.rg - 0.5) * 0.1 + (r > 0.001 ? q / r : vec2(0.0)) * fold * 0.9;
  float low = smoothstep(0.5, 0.34, h0);
  slope *= 1.0 - 0.85 * low;
  vec3 n = normalize(vec3(-slope.x, 1.0, slope.y));
  vec3 v = normalize(cameraPosition - vWorld);
  // Brine stands in the hollows; the high places have begun to dry and pale.
  float dry = smoothstep(0.55, 0.75, h0) * smoothstep(0.3, 0.8, vEdge);
  vec3 albedo = uMud * tone * (1.0 - 0.35 * uWetness);
  // Red mud wells up where the animal works it.
  float well = 1.0 - smoothstep(0.25, 0.75, r / uAt.z);
  albedo = mix(albedo, vec3(0.07, 0.022, 0.016) * tone, 0.5 * well * smoothstep(0.35, 0.6, fbm(p * 2.3 + 7.0)));
  albedo = mix(albedo, uMud * 1.35 + 0.006, 0.6 * dry * (1.0 - uWetness));
  // Trodden by a live one it is wet through, and red brine stands in every low place of it.
  float pool = uWetness * smoothstep(0.52 + 0.12 * uWetness, 0.42 + 0.1 * uWetness, h0) * smoothstep(0.1, 0.4, vEdge);
  albedo = mix(albedo, vec3(0.085, 0.012, 0.01), 0.9 * pool);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), 0.9 * pool));
  albedo = mix(albedo, albedo * vec3(0.55, 0.36, 0.32), low);
  // The sky's glint off a wet thing at a low angle is white, and whitens the whole patch: wet mud by a live one is dark, so it is kept dull.
  float rough = mix(mix(1.0, mix(0.86, 0.97, uWetness), low), mix(0.3, 0.96, uWetness), pool);
  float occ = 0.6 + 0.4 * smoothstep(0.3, 0.6, h0);
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ);
  // Wet mud drinks the light: it does not hold the sky as the crust does.
  c *= 0.75;
  // Its edge is not a line: it thins out over the crust it has run onto, clod by clod.
  float a = smoothstep(0.04, 0.3, vEdge + 0.3 * (h0 - 0.5)) * smoothstep(0.0, 0.06, vEdge) * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(c) * (1.0 - uSolo), a);
}`;

export function mudWallow(ctx: Context, x: number, z: number, dir: [number, number], size = 1, tone: [number, number, number] = [0.1, 0.072, 0.054], name = 'dead-mud', wetness = 0, hollow = 0): { mesh: THREE.Mesh; set(heave: number, seconds: number): void; dispose(): void } {
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
      const lift = (1 - 0.6 * wetness) * 0.03 + 0.05 * (1 - u * u) + 0.05 * Math.exp(-(((u - 0.45) / 0.16) ** 2)) * (0.6 + 0.4 * Math.sin(a * 3 + wobble[0][1])) + 0.03 * (1 - u) * Math.sin(px * 3.1 + pz * 1.7) * Math.sin(pz * 2.3 - px * 0.9);
      // Where the crust has given way under it (the land's own hollow, which the rig's height does not know of) the mud lies in the hollow.
      const far = Math.min(1, Math.max(0, (2.25 - Math.hypot(px - x, pz - z)) / 1.15));
      const drop = hollow * far * far * (3 - 2 * far);
      position.push(px, ctx.rig.land.height(px, pz) - drop + lift * Math.min(1, size) * (1 - 0.5 * wetness), pz);
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
    uniforms: { ...ctx.rig.uniforms, uAt: { value: new THREE.Vector4(x, z, 3.0 * size, 0) }, uHeave, uMud: { value: new THREE.Vector3(tone[0], tone[1], tone[2]) }, uWetness: { value: wetness }, tMud: { value: ctx.assets.texture('mat/mud.jpg', { kind: 'colour', anisotropy: 4 }) }, tMudNh: { value: ctx.assets.texture('mat/mud-nh.png', { kind: 'data', anisotropy: 4 }) } },
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
