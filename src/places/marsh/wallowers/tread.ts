// What a foot does to the mud it stands in: a collar of mud pushed up round the leg, that swells as the weight comes onto it, and the print it
// leaves when it is drawn out, with red brine standing in it. Every one is a pure function of the distance its animal has walked.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { LEG_AT, type Build, type Plan } from './animal';
import type { Stride } from './gait';

/** For each foot: the place it stands on, and the three before it. */
const KEPT = 3;
const PER = 4 * KEPT;
const RINGS = 12;
const SIDES = 36;

const VERTEX = /* glsl */ `
attribute vec4 iA;
attribute vec4 iB;
varying vec3 vWorld;
varying vec2 vAt;
varying vec4 vB;
varying float vRise;
${NOISE_GLSL}
// The mud round a leg, in radii of the patch: a collar that stands up where the pad has pushed it out, lumpy round its run.
float collar(vec2 q, vec4 b) {
  float r = length(q);
  float a = atan(q.y, q.x);
  float lumps = 0.55 + 0.9 * vnoise(vec2(a * 1.9 + b.z * 17.0, b.z * 5.0)) * (0.6 + 0.8 * vnoise(q * 5.0 + b.z * 9.0));
  float rim = exp(-pow((r - 0.62) / 0.15, 2.0));
  return rim * lumps * (0.45 + 0.55 * b.x) * (1.0 - 0.45 * b.y);
}
void main() {
  vAt = position.xz;
  vB = iB;
  float rise = collar(vAt, iB);
  vRise = rise;
  float r = length(vAt);
  // Its edge goes down under the mud about it.
  vWorld = iA.xyz + vec3(position.x, 0.0, position.z) * iA.w + vec3(0.0, iA.w * (0.12 * rise - 0.2 * smoothstep(0.55, 1.0, r)), 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vAt;
varying vec4 vB;
varying float vRise;
uniform sampler2D tMud;
uniform sampler2D tMudNh;
${NOISE_GLSL}
${RIG_GLSL}
const vec3 MUD_MEAN = vec3(0.318, 0.179, 0.155);
void main() {
  float r = length(vAt);
  float shown = vB.w * (1.0 - smoothstep(0.5, 0.95, r + 0.55 * (vnoise(vAt * 3.0 + vB.z * 31.0) - 0.5) + 0.25 * (vnoise(vAt * 9.0 + vB.z * 7.0) - 0.5)));
  if (shown < 0.004) discard;
  vec2 p = vWorld.xz;
  vec3 wide = texture2D(tMudNh, p / 1.1).rgb;
  vec3 fine = texture2D(tMudNh, vec2(p.x * 0.8 - p.y * 0.6, p.x * 0.6 + p.y * 0.8) / 0.43 + 0.3).rgb;
  vec3 tone = texture2D(tMud, p / 1.1).rgb / MUD_MEAN;
  tone = mix(vec3(1.0), mix(vec3(dot(tone, vec3(0.3, 0.5, 0.2))), tone, 0.5), 0.6) * (0.85 + 0.3 * fine.b);
  // The slope of the collar, from its own height, and the clods of the mud on it.
  vec3 dx = dFdx(vWorld);
  vec3 dz = dFdy(vWorld);
  vec3 flat_ = normalize(cross(dx, dz));
  if (flat_.y < 0.0) flat_ = -flat_;
  vec2 slope = (wide.rg - 0.5) * 0.7 + (fine.rg - 0.5) * 0.35;
  vec3 n = normalize(flat_ + vec3(-slope.x, 0.0, slope.y));
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 albedo = vec3(0.046, 0.022, 0.018) * tone;
  // Fresh mud turned up from under is red and wet.
  albedo = mix(albedo, vec3(0.07, 0.02, 0.015) * tone, 0.55 * smoothstep(0.25, 0.8, vRise));
  float rough = mix(0.95, 0.8, smoothstep(0.2, 0.9, vRise) * fine.b);
  // The print of a foot that has gone: a pad's breadth of dark, and brine come up into it.
  float hole = vB.y * (1.0 - smoothstep(0.34, 0.6, r + 0.3 * (wide.b - 0.5) + 0.2 * (vnoise(vAt * 5.0 + vB.z * 3.0) - 0.5)));
  float pool = hole * smoothstep(0.0, 0.5, vB.y) * smoothstep(0.75, 0.5, fine.b * 0.5 + r);
  albedo = mix(albedo, vec3(0.03, 0.012, 0.01), 0.8 * hole);
  albedo = mix(albedo, vec3(0.06, 0.01, 0.008), 0.9 * pool);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), 0.5 * pool));
  // Dark where the leg stands in it, and inside the wall of the print.
  float occ = 1.0 - 0.6 * (1.0 - vB.y) * (1.0 - smoothstep(0.4, 0.66, r)) - 0.5 * hole;
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ * (0.75 + 0.25 * fine.b));
  gl_FragColor = vec4(rigOut(c * 0.75) * (1.0 - uSolo), shown * (1.0 - uSolo));
}`;

export class Tread {
  readonly mesh: THREE.Mesh;
  private readonly a: Float32Array;
  private readonly b: Float32Array;
  private readonly attrA: THREE.InstancedBufferAttribute;
  private readonly attrB: THREE.InstancedBufferAttribute;
  private readonly material: THREE.ShaderMaterial;

  constructor(
    private readonly ctx: Context,
    private readonly count: number,
  ) {
    const n = count * PER;
    this.a = new Float32Array(n * 4);
    this.b = new Float32Array(n * 4);
    const position: number[] = [];
    const index: number[] = [];
    for (let i = 0; i <= RINGS; i++) {
      // Rings stand closer where the collar is.
      const u = 0.02 + 0.98 * (i / RINGS);
      for (let j = 0; j <= SIDES; j++) {
        const a = (j / SIDES) * Math.PI * 2;
        position.push(Math.cos(a) * u, 0, Math.sin(a) * u);
      }
    }
    for (let i = 0; i < RINGS; i++) {
      for (let j = 0; j < SIDES; j++) {
        const p = i * (SIDES + 1) + j;
        index.push(p, p + SIDES + 1, p + 1, p + 1, p + SIDES + 1, p + SIDES + 2);
      }
    }
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geometry.setIndex(index);
    this.attrA = new THREE.InstancedBufferAttribute(this.a, 4);
    this.attrB = new THREE.InstancedBufferAttribute(this.b, 4);
    this.attrA.setUsage(THREE.DynamicDrawUsage);
    this.attrB.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('iA', this.attrA);
    geometry.setAttribute('iB', this.attrB);
    geometry.instanceCount = n;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        ...ctx.rig.uniforms,
        tMud: { value: ctx.assets.texture('mat/mud.jpg', { kind: 'colour', anisotropy: 4 }) },
        tMudNh: { value: ctx.assets.texture('mat/mud-nh.png', { kind: 'data', anisotropy: 4 }) },
      },
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

  /** The places of the feet of walker `i`, which has gone `s` metres from `plan.at` at the stride `g`. `shown` 0 takes them all away. */
  set(i: number, plan: Plan, b: Build, s: number, g: Stride, shown: number): void {
    const { k } = b;
    const land = this.ctx.rig.land;
    const c = s / g.length + g.phase;
    const half = 0.5 * g.length * g.duty;
    const fx = plan.dir[0];
    const fz = plan.dir[1];
    for (let l = 0; l < 4; l++) {
      const [lx, sd] = LEG_AT[l] as [number, number];
      const off = -(lx > 0 ? 0.25 : 0) + (sd * g.lead > 0 ? 0.5 : 0);
      const cl = c + off;
      const n = Math.floor(cl);
      for (let j = 0; j < KEPT; j++) {
        const m = n - j;
        // Where the trunk was when this foot came down for the m-th time, and the foot half a stand ahead of its place under it.
        const along = (m - g.phase - off) * g.length + (lx + 0.03) * k + half;
        const across = sd * 0.68 * k * b.bulk;
        const x = plan.at[0] + fx * along - fz * across;
        const z = plan.at[1] + fz * along + fx * across;
        // How long it has been stood on, in cycles, and how long since it was left.
        const stood = cl - m;
        const left = stood - g.duty;
        const press = Math.min(1, stood / 0.12) * (1 - Math.min(1, Math.max(0, (stood - 0.6 * g.duty) / (0.4 * g.duty))));
        const gone = Math.min(1, Math.max(0, left / 0.08));
        const fade = Math.min(1, stood / 0.05) * (1 - Math.min(1, Math.max(0, (left - 1.2) / 0.9)));
        const o = ((i * 4 + l) * KEPT + j) * 4;
        // The top of the mud: the land, and what is trodden up on it.
        this.a[o] = x;
        this.a[o + 1] = Math.max(land.height(x, z), plan.ground + 0.1 * k) + 0.03;
        this.a[o + 2] = z;
        this.a[o + 3] = 0.56 * k;
        this.b[o] = press;
        this.b[o + 1] = gone;
        this.b[o + 2] = (((m * 7 + l * 13 + i * 29) % 64) + 64) % 64 / 64;
        this.b[o + 3] = shown * fade;
      }
    }
  }

  hide(i: number): void {
    for (let j = 0; j < PER; j++) this.b[(i * PER + j) * 4 + 3] = 0;
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
