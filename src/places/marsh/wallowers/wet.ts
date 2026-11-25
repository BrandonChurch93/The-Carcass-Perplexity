// What the brine does round a wallower: drops that swell under the belly and the chin and fall, the ring each makes, and the rings that
// leave a leg or a muzzle standing in the brine. Every instance is a pure function of the seconds.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import type { Stood } from './animal';

export const DROPS = 12;
const FOOT_RINGS = 3;
const PER = DROPS * 2 + 4 * FOOT_RINGS + 2;

const VERTEX = /* glsl */ `
attribute vec4 iA;
attribute vec4 iB;
varying vec3 vWorld;
varying vec2 vAt;
varying vec4 vB;
varying float vSize;
varying vec3 vRight;
void main() {
  vB = iB;
  vSize = iA.w;
  vec3 world;
  if (iB.x < 0.5) {
    // A drop: a streak as long as it falls while the shutter is open, and the thread it draws out behind it. It faces the lens.
    vec3 toCam = cameraPosition - iA.xyz;
    vRight = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
    float hw = iA.w * 0.5;
    float top = hw + iB.z;
    float bottom = -hw - iB.y;
    float y = mix(bottom, top, position.y * 0.5 + 0.5);
    vAt = vec2(position.x * hw, y);
    world = iA.xyz + vRight * position.x * hw + vec3(0.0, y, 0.0);
  } else {
    vRight = vec3(1.0, 0.0, 0.0);
    vAt = position.xy;
    world = iA.xyz + vec3(position.x, 0.0, position.y) * iA.w;
  }
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vAt;
varying vec4 vB;
varying float vSize;
varying vec3 vRight;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  if (vB.x < 0.5) {
    float hw = vSize * 0.5;
    // The body of the drop, drawn out down its fall, and the thread above it, thinning as it goes up.
    float yy = vAt.y - clamp(vAt.y, -vB.y, 0.0);
    float body = length(vec2(vAt.x, yy)) / hw;
    float up = clamp(vAt.y / max(vB.z, 1e-4), 0.0, 1.0);
    float thread = abs(vAt.x) / (hw * mix(0.55, 0.12, up));
    float d = min(body, vAt.y > 0.0 ? thread : 9.0);
    if (d > 1.0) discard;
    float ux = clamp(vAt.x / hw, -1.0, 1.0);
    vec3 n = normalize(vRight * ux + v * sqrt(max(0.0, 1.0 - ux * ux)) + vec3(0.0, 0.25, 0.0));
    vec3 c = rigShade(vWorld, n, v, vec3(0.085, 0.022, 0.017), 0.16, 1.0);
    gl_FragColor = vec4(rigOut(c), 1.0);
    return;
  }
  // A ring on the brine: a crest that shows more of the sky and the trough inside it that shows less.
  float r = length(vAt);
  float w = vB.z;
  float wob = 0.03 * (vnoise(vec2(atan(vAt.y, vAt.x) * 2.5, vB.w * 9.0)) - 0.5);
  float crest = exp(-pow((r - 0.86 + wob) / w, 2.0));
  float trough = exp(-pow((r - 0.86 + wob + 2.1 * w) / (1.3 * w), 2.0));
  float skim = pow(1.0 - clamp(v.y, 0.0, 1.0), 3.0);
  vec3 sky = skyRadiance(normalize(vec3(-v.x, abs(v.y) + 0.25, -v.z))) * skyOpen(vWorld);
  vec3 c = mix(vec3(0.04, 0.013, 0.011), sky * (0.14 + 0.3 * skim), crest / max(crest + trough, 1e-4));
  float a = clamp(vB.y, 0.0, 1.0) * clamp(crest * 0.4 + trough * 0.12, 0.0, 1.0) * (1.0 - uSolo);
  if (a < 0.004) discard;
  gl_FragColor = vec4(rigOut(c) * (1.0 - uSolo), a);
}`;

const fract = (v: number): number => v - Math.floor(v);

export class Wet {
  readonly mesh: THREE.Mesh;
  private readonly a: Float32Array;
  private readonly b: Float32Array;
  private readonly attrA: THREE.InstancedBufferAttribute;
  private readonly attrB: THREE.InstancedBufferAttribute;
  /** For each drop: along, across, period, phase, width, where (0 belly, 1 chin). */
  private readonly drops: Float32Array;
  private readonly material: THREE.ShaderMaterial;

  constructor(
    private readonly ctx: Context,
    count: number,
  ) {
    const rng = ctx.rng('wallowers-wet');
    const n = count * PER;
    this.a = new Float32Array(n * 4);
    this.b = new Float32Array(n * 4);
    this.drops = new Float32Array(count * DROPS * 6);
    for (let i = 0; i < count * DROPS; i++) {
      const chin = i % DROPS >= DROPS - 4 ? 1 : 0;
      this.drops.set([rng.range(-1, 1), rng.range(-1, 1), rng.range(1.5, 4.2), rng.next(), rng.range(0.008, 0.014), chin], i * 6);
    }
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    this.attrA = new THREE.InstancedBufferAttribute(this.a, 4);
    this.attrB = new THREE.InstancedBufferAttribute(this.b, 4);
    this.attrA.setUsage(THREE.DynamicDrawUsage);
    this.attrB.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('iA', this.attrA);
    geometry.setAttribute('iB', this.attrB);
    geometry.instanceCount = n;
    this.material = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  private put(o: number, x: number, y: number, z: number, size: number, kind: number, p1: number, p2: number, seed: number): void {
    this.a[o] = x;
    this.a[o + 1] = y;
    this.a[o + 2] = z;
    this.a[o + 3] = size;
    this.b[o] = kind;
    this.b[o + 1] = p1;
    this.b[o + 2] = p2;
    this.b[o + 3] = seed;
  }

  /** The drops and rings of animal `i`, standing as `stood` at `seconds`. `alive` 0 leaves it dry. */
  set(i: number, stood: Stood, k: number, seconds: number, alive = 1): void {
    const land = this.ctx.rig.land;
    const fx = Math.cos(stood.yaw);
    const fz = -Math.sin(stood.yaw);
    let o = i * PER * 4;
    for (let j = 0; j < DROPS; j++) {
      const q = (i * DROPS + j) * 6;
      const along = this.drops[q] as number;
      const across = this.drops[q + 1] as number;
      const period = this.drops[q + 2] as number;
      const width = (this.drops[q + 4] as number) * (0.6 + 0.4 * k);
      const chin = (this.drops[q + 5] as number) > 0.5;
      const from = chin ? stood.muzzle : stood.belly;
      const x = from.x + fx * along * (chin ? 0.18 : 1.15) * k - fz * across * (chin ? 0.25 : 0.32) * k;
      const z = from.z + fz * along * (chin ? 0.18 : 1.15) * k + fx * across * (chin ? 0.25 : 0.32) * k;
      const y0 = from.y + (chin ? 0.02 : 0.1 * along * along) * k;
      const brine = land.shore(x, z) < 0;
      const level = brine ? 0 : land.height(x, z);
      const drop = y0 - level;
      const c = fract(seconds / period + (this.drops[q + 3] as number));
      const SWELL = 0.3;
      if (alive < 0.5 || drop < 0.06) {
        this.put(o, 0, -1000, 0, 0, 0, 0, 0, 0);
        this.put(o + 4, 0, -1000, 0, 0, 1, 0, 0.05, 0);
      } else if (c < SWELL) {
        // It gathers and hangs.
        const g = c / SWELL;
        this.put(o, x, y0 - width * 0.5 * g, z, width * (0.35 + 0.65 * g), 0, width * 0.3 * g, 0.012, 0);
        this.put(o + 4, 0, -1000, 0, 0, 1, 0, 0.05, 0);
      } else {
        const t = (c - SWELL) * period;
        const hit = Math.sqrt((2 * drop) / 9.0);
        if (t < hit) {
          const speed = 9.0 * t;
          // The brine is thick: it draws a thread behind it that parts a tenth of a second on.
          const thread = Math.min(0.5 * 9.0 * t * t, 0.14) * Math.max(0, 1 - t / 0.16);
          this.put(o, x, y0 - 0.5 * 9.0 * t * t, z, width, 0, speed / 120, thread, 0);
          this.put(o + 4, 0, -1000, 0, 0, 1, 0, 0.05, 0);
        } else {
          const age = Math.min(1, (t - hit) / Math.max(0.2, (1 - SWELL) * period - hit));
          this.put(o, 0, -1000, 0, 0, 0, 0, 0, 0);
          if (brine) this.put(o + 4, x, level + 0.004, z, 0.03 + 0.3 * Math.sqrt(age), 1, 0.45 * (1 - age) * (1 - age), 0.06, j);
          else this.put(o + 4, 0, -1000, 0, 0, 1, 0, 0.05, 0);
        }
      }
      o += 8;
    }
    // The legs: a ring that hugs each one where it stands in the brine, and slow rings going out from it, harder as the foot is set down.
    for (let l = 0; l < 4; l++) {
      const foot = stood.feet[l] as (typeof stood.feet)[number];
      const wade = alive > 0.5 && land.shore(foot.x, foot.z) < -0.02;
      for (let r = 0; r < FOOT_RINGS; r++) {
        if (!wade) this.put(o, 0, -1000, 0, 0, 1, 0, 0.05, 0);
        else if (r === 0) this.put(o, foot.x, 0.005, foot.z, 0.38 * k, 1, 0.75, 0.07, l + 0.5);
        else {
          const age = fract(seconds / 2.9 + r * 0.5 + l * 0.27 + i * 0.37);
          this.put(o, foot.x, 0.004, foot.z, (0.4 + 1.15 * age) * k, 1, 0.5 * (1 - age) * (1 - age), 0.045 / (0.4 + 1.15 * age), l + r * 7);
        }
        o += 4;
      }
    }
    // The muzzle, raking the surface.
    for (let r = 0; r < 2; r++) {
      const m = stood.muzzle;
      const near = alive > 0.5 && land.shore(m.x, m.z) < -0.02 && m.y < 0.45 * k;
      const age = fract(seconds / 2.1 + r * 0.5 + i * 0.61);
      if (near) this.put(o, m.x + fx * 0.2 * k, 0.004, m.z + fz * 0.2 * k, (0.3 + 0.9 * age) * k, 1, 0.5 * (1 - age) * (1 - age), 0.05 / (0.3 + 0.9 * age), 40 + r);
      else this.put(o, 0, -1000, 0, 0, 1, 0, 0.05, 0);
      o += 4;
    }
  }

  touch(): void {
    this.attrA.needsUpdate = true;
    this.attrB.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
