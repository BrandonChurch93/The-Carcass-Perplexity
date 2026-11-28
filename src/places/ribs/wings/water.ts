// Water thrown by an animal, as geometry: a sheet that leaves the pool at one place, stands a moment, is drawn into strings at its lip and
// falls back. Every sheet is a lattice bent on the graphics card along the flight of the water that makes it: where it is at a time is a
// function of that time alone.
import * as THREE from 'three';
import { NOISE_GLSL, RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';

/** The lattice of one sheet: across its lip, and from its lip to its foot. */
const ACROSS = 14;
const DOWN = 9;

const VERTEX = /* glsl */ `
${NOISE_GLSL}
${RIG_GLSL}
attribute vec4 aFrom;
attribute vec4 aThrow;
attribute vec4 aLook;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vAt;
varying vec3 vLight;
varying vec2 vOwn;
// Where the water that is u across the sheet and v down it from the lip has got to. The lip left first and fastest; the foot of the
// sheet last and slowest; each string across it at its own speed, so the lip is drawn into fingers.
vec3 thrownAt(float u, float v) {
  float left = v * 0.34 * aLook.x;
  float a = max(aFrom.w - left, 0.0);
  float finger = 0.8 + 0.4 * vnoise(vec2(u * 3.1 + aLook.y * 61.0, aLook.y * 17.0 + 3.0));
  float quick = mix(1.0, 0.06, v * v) * finger;
  float lean = 0.7 + 0.6 * vnoise(vec2(u * 4.3 + aLook.y * 23.0, aLook.y * 41.0 + 9.0));
  float turn = aThrow.x + 0.5 * aThrow.y * u;
  float reach = aLook.w + aThrow.z * quick * lean * a;
  float high = aThrow.w * quick * a - 4.9 * a * a;
  return vec3(aFrom.x + sin(turn) * reach, aFrom.y + high, aFrom.z + cos(turn) * reach);
}
void main() {
  float u = position.x;
  float v = position.y;
  vec3 p = thrownAt(u, v);
  vec3 across = thrownAt(u + 0.06, v) - p;
  vec3 down = thrownAt(u, v + 0.06) - p;
  vec3 n = cross(across, down);
  vNormal = dot(n, n) > 1e-14 ? normalize(n) : vec3(0.0, 1.0, 0.0);
  vOwn = vec2(p.y - aFrom.y, aLook.y);
  p.y = max(p.y, aFrom.y - 0.01);
  vWorld = p;
  vAt = vec4(u, v, clamp(aFrom.w / aLook.x, 0.0, 1.0), aLook.z);
  vec4 land = landAt(aFrom.xz);
  // Thrown water in the open air is lit from every side.
  vLight = (skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.5 + 0.9 * land.g) + uSunColour * 0.6 * sunAt(aFrom.xyz, land)) / 3.14159;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${NOISE_GLSL}
${RIG_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vAt;
varying vec3 vLight;
varying vec2 vOwn;
void main() {
  float u = vAt.x;
  float v = vAt.y;
  float part = vAt.z;
  float own = vOwn.y;
  vec3 view = normalize(cameraPosition - vWorld);
  vec3 n = dot(vNormal, vNormal) > 1e-8 ? normalize(vNormal) : vec3(0.0, 1.0, 0.0);
  if (dot(n, view) < 0.0) n = -n;
  // Torn into strings from the first, least at its foot and most at its lip, and everywhere as it falls. The strings run the way the water flies.
  float torn = clamp(0.44 + 0.8 * part + 0.42 * (1.0 - v), 0.0, 1.0);
  float strings = 0.6 * vnoise(vec2(u * 5.5 + own * 91.0, v * 1.9 + own * 13.0)) + 0.4 * vnoise(vec2(u * 15.0 + own * 7.0, v * 2.6 + own * 29.0));
  float edge = 0.78 * torn - 0.22;
  float cover = smoothstep(edge, edge + 0.2, strings);
  // A string ends in beads: it is broken along its length as it thins.
  float beads = vnoise(vec2(u * 15.0 + own * 7.0, v * 13.0 + own * 3.0));
  cover *= mix(1.0, smoothstep(0.35, 0.6, beads), smoothstep(0.45, 0.9, torn));
  float side = 1.0 - smoothstep(0.7, 1.0, abs(u));
  float fallen = smoothstep(0.0, 0.03, vOwn.x);
  float spent = 1.0 - smoothstep(0.75, 1.0, part);
  // A film of water is glass; the middle of a string and the rim of the lip are thick and full of air.
  float core = smoothstep(edge + 0.24, edge + 0.5, strings) * (0.45 + 0.9 * beads);
  float rim = (1.0 - smoothstep(0.0, 0.1, v)) * smoothstep(0.3, 0.62, vnoise(vec2(u * 11.0 + own * 37.0, own * 5.0)));
  float air = clamp(0.55 * core * (0.3 + 0.7 * torn) + 0.4 * rim, 0.0, 1.0);
  float glance = 1.0 - max(dot(n, view), 0.0);
  float fres = 0.05 + 0.95 * glance * glance * glance;
  vec3 back = reflect(-view, n);
  back.y = abs(back.y);
  vec3 mirror = skyRadiance(back) + uSunColour * 0.4 * pow(max(dot(back, uSunDir), 0.0), 48.0);
  // Torn water is white with the air in it; whole water is glass, and shows the sky at a glance.
  float body = clamp((0.1 + 0.85 * air) * max(vAt.w, 1.0), 0.0, 1.0);
  vec3 col = mirror * fres * (1.0 - body) + vec3(0.95, 0.96, 0.96) * vLight * (0.8 + 0.25 * n.y) * body;
  // Seen along itself a sheet is a line, and no line of water stands in the air.
  float facing = 0.12 + 0.88 * smoothstep(0.04, 0.3, abs(dot(n, view)));
  float mask = clamp(cover * side * fallen * spent * facing * min(vAt.w, 1.0), 0.0, 1.0) * (1.0 - uSolo);
  float alpha = mask * clamp(body + fres * (1.0 - body), 0.0, 1.0);
  gl_FragColor = vec4(rigOut(col) * mask, alpha);
}`;

export class Thrown {
  readonly mesh: THREE.Mesh;
  private readonly from: THREE.InstancedBufferAttribute;
  private readonly thrown: THREE.InstancedBufferAttribute;
  private readonly look: THREE.InstancedBufferAttribute;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private used = 0;

  constructor(readonly count: number, uniforms: Record<string, THREE.IUniform>) {
    const g = new THREE.InstancedBufferGeometry();
    const at: number[] = [];
    const index: number[] = [];
    for (let j = 0; j <= DOWN; j++) for (let i = 0; i <= ACROSS; i++) at.push((2 * i) / ACROSS - 1, j / DOWN, 0);
    for (let j = 0; j < DOWN; j++) {
      for (let i = 0; i < ACROSS; i++) {
        const a = j * (ACROSS + 1) + i;
        index.push(a, a + 1, a + ACROSS + 2, a, a + ACROSS + 2, a + ACROSS + 1);
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(at, 3));
    g.setIndex(index);
    this.from = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.thrown = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.look = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    for (const a of [this.from, this.thrown, this.look]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aFrom', this.from);
    g.setAttribute('aThrow', this.thrown);
    g.setAttribute('aLook', this.look);
    this.geometry = g;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  begin(): void {
    this.used = 0;
  }

  /**
   * A sheet thrown from (x, y, z) `age` seconds ago: toward `way` (radians, 0 along z) and `wide` radians across, at `out` and `up`
   * metres a second, from `root` metres off its place. It lives `life` seconds. An `alpha` over 1 is water that much thicker.
   */
  put(x: number, y: number, z: number, age: number, way: number, wide: number, out: number, up: number, life: number, seed: number, alpha: number, root = 0): void {
    if (this.used >= this.count || alpha <= 0.003 || age <= 0.004 || age >= life) return;
    this.from.setXYZW(this.used, x, y, z, age);
    this.thrown.setXYZW(this.used, way, wide, out, up);
    this.look.setXYZW(this.used, life, seed, alpha, root);
    this.used++;
  }

  end(): void {
    this.geometry.instanceCount = this.used;
    this.from.needsUpdate = true;
    this.thrown.needsUpdate = true;
    this.look.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
