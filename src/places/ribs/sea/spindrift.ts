// Spindrift: the wind takes the tops off the heaviest crests and carries them down the sea as torn smoke. Each card is born on a crest of the
// swell (it climbs to it from where it was dealt, in the vertex shader, by the swell's own slope), is carried off with the wind, lifts and
// sinks, and thins to nothing; then it is dealt a new place. All of it from the time alone. Drawn in a square of sea before the lens.
import * as THREE from 'three';
import { RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';
import { SWELL_GLSL } from './shaders';
import { rand } from './spray';

const VERTEX = /* glsl */ `
${RIG_GLSL}
uniform vec2 uWind;
uniform vec4 uOpenSea;
uniform vec4 uField;
uniform vec2 uGale;
attribute vec4 aSeed;
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vLight;
varying vec3 vBack;
${SWELL_GLSL}
void main() {
  float life = 1.5 + 1.5 * aSeed.z;
  float clock = uTime / life + aSeed.w;
  float turn = floor(clock);
  float age = (clock - turn) * life;
  float born = uTime - age;
  // A new place each life, somewhere in the square that goes with the lens.
  vec2 pb = fract(aSeed.xy + turn * vec2(0.618, 0.7549)) * uField.z;
  pb += uField.z * floor((uField.xy - pb) / uField.z + 0.5);
  vec2 off = abs(pb - uField.xy) / (0.5 * uField.z);
  // Up the slope to the crest, as it stood when the card was born.
  vec2 g;
  float h = swellAt(pb, born, 0.5, 0.9, 2.4, g);
  pb += g * min(34.0, 7.0 / max(length(g), 1e-4));
  h = swellAt(pb, born, 0.5, 0.9, 2.4, g);
  pb += g * min(24.0, 4.0 / max(length(g), 1e-4));
  h = swellAt(pb, born, 0.5, 0.9, 2.4, g);
  vec4 land = landAt(pb);
  float calm = smoothstep(0.2, 4.5, -land.r);
  h *= calm * uOpenSea.w;
  pb += swellPush(pb, born, 0.5, 0.9, 2.4) * calm * uOpenSea.w;
  float crest = smoothstep(uGale.x, uGale.x + 1.3, h);
  // Off with the wind: slow as it leaves the water, then at the wind's own pace; up a little and down again.
  float gone = age - 0.45 * (1.0 - exp(-age / 0.45));
  float rise = (0.3 + 1.3 * aSeed.z) * (1.0 - exp(-age / 0.5)) - 0.22 * age * age;
  vec3 at = vec3(pb.x, h + 0.25 + rise, pb.y) + vec3(uWind.x, 0.0, uWind.y) * (15.0 * gone);
  vec4 centre = viewMatrix * vec4(at, 1.0);
  // Drawn out the way the wind carries it across the picture, as the lens sees that way from here: blown at the lens it is a round veil.
  vec4 next = viewMatrix * vec4(at + vec3(uWind.x, 0.06, uWind.y) * 2.0, 1.0);
  vec2 way = (next.xy * (centre.z / min(next.z, -1.0)) - centre.xy) * 0.5;
  float across = length(way);
  vec2 along = across > 0.03 ? way / across : vec2(1.0, 0.0);
  float size = (0.6 + 0.7 * aSeed.x) * (0.5 + 1.3 * age);
  float drawn = 1.0 + 2.4 * min(across, 1.0);
  centre.xy += (along * position.x * drawn + vec2(-along.y, along.x) * position.y * 0.62) * size;
  vUv = position.xy;
  float range = -centre.z;
  float alpha = smoothstep(0.0, 0.12, age) * pow(1.0 - age / life, 1.4) * crest * (1.0 - smoothstep(0.7, 1.0, max(off.x, off.y)));
  alpha *= smoothstep(7.0, 26.0, range) * uGale.y * 0.7;
  vLook = vec4(alpha, aSeed.w * 17.0 + turn * 0.37, age / life, drawn);
  float sun = sunAt(at, land);
  vec3 sunCool = mix(uSunColour, vec3(dot(uSunColour, vec3(0.3333))), 0.6);
  vLight = (skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.5 + 0.7 * land.g) + sunCool * 0.6 * sun) / 3.14159;
  // Spray between the lens and the light burns: warm where the low sun stands behind it, silver under the break.
  vec3 ray = normalize(at - cameraPosition);
  vBack = uSunColour * pow(max(dot(ray, uSunDir), 0.0), 3.0) * sun * 0.4 + skyRadiance(uSkyBreak) * pow(max(dot(ray, uSkyBreak), 0.0), 3.0) * 0.3 * land.g;
  if (alpha < 0.004) centre = vec4(0.0, 0.0, 1e6, 1.0);
  gl_Position = projectionMatrix * centre;
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${RIG_UNIFORMS_GLSL}
uniform sampler2D tFoam;
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vLight;
varying vec3 vBack;
void main() {
  vec2 seed = vLook.y * vec2(3.1, 7.3);
  // Torn smoke: thick at the head it left the crest by, in strings down the wind.
  vec4 t = texture2D(tFoam, vUv * vec2(0.11 * vLook.w, 0.2) + seed);
  vec4 fine = texture2D(tFoam, vUv * vec2(0.3 * vLook.w, 0.75) + seed.yx);
  float r2 = dot(vUv, vUv);
  float body = 1.0 - smoothstep(0.05, 1.0, r2 + 1.0 * (t.r - 0.5) + 0.45 * (fine.g - 0.5));
  float strings = smoothstep(0.25 + 0.4 * vLook.z, 0.75 + 0.3 * vLook.z, 0.55 * t.g + 0.45 * fine.r + 0.2 * (0.5 - vUv.x));
  body *= 1.0 - smoothstep(0.55, 1.0, max(abs(vUv.x), abs(vUv.y)));
  float alpha = clamp(body * (0.3 + 0.7 * strings) * vLook.x, 0.0, 1.0) * (1.0 - uSolo);
  vec3 col = vec3(0.95, 0.96, 0.96) * (vLight * (0.5 + 0.4 * fine.a) + vBack * (0.7 + 0.6 * strings));
  gl_FragColor = vec4(col * alpha, alpha);
}`;

export class Spindrift {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  /** x, z of the middle of the square the cards are dealt in, its side in metres. */
  readonly field = new THREE.Vector4(0, 0, 340, 0);
  /** Metres a crest must stand over the level sea before the wind takes its top, and how thick the spray is (0 none). */
  readonly gale = new THREE.Vector2(2.9, 0);

  constructor(count: number, uniforms: Record<string, THREE.IUniform>) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) for (let k = 0; k < 4; k++) seed[i * 4 + k] = rand(9100 + k, i);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
    g.instanceCount = count;
    this.geometry = g;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { ...uniforms, uField: { value: this.field }, uGale: { value: this.gale } },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
