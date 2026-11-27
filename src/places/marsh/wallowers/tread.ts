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
attribute vec2 iC;
varying vec3 vWorld;
varying vec2 vAt;
varying vec4 vB;
varying float vRise;
varying vec2 vC;
${NOISE_GLSL}
// The mud a pad has pushed out, in radii of the patch: thrown up in two or three lumps to the sides and behind, never a ring. It slumps once the foot has gone.
float collar(vec2 q, vec4 b) {
  float r = length(q);
  float lobes = smoothstep(0.42, 0.75, vnoise(q * 1.7 + b.z * 37.0));
  float lumps = 0.3 + 1.4 * vnoise(q * 4.6 + b.z * 9.0);
  float rim = exp(-pow((r - 0.66 - 0.16 * (vnoise(q * 2.3 + b.z * 5.0) - 0.5)) / 0.13, 2.0));
  return rim * lobes * lumps * (0.4 + 0.6 * b.x) * (1.0 - 0.75 * b.y);
}
void main() {
  // x of the patch runs the way the animal walks.
  vAt = position.xz;
  vB = iB;
  vC = iC;
  float rise = collar(vAt, iB);
  vRise = rise;
  float r = length(vAt);
  vec2 w = vec2(vAt.x * iC.x - vAt.y * iC.y, vAt.x * iC.y + vAt.y * iC.x);
  // Its edge goes down under the mud about it.
  vWorld = iA.xyz + vec3(w.x, 0.0, w.y) * iA.w + vec3(0.0, iA.w * (0.14 * rise - 0.2 * smoothstep(0.55, 1.0, r)), 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vAt;
varying vec4 vB;
varying float vRise;
varying vec2 vC;
uniform sampler2D tMud;
uniform sampler2D tMudNh;
${NOISE_GLSL}
${RIG_GLSL}
const vec3 MUD_MEAN = vec3(0.318, 0.179, 0.155);
void main() {
  vec2 p = vWorld.xz;
  vec3 wide = texture2D(tMudNh, p / 1.1).rgb;
  vec3 fine = texture2D(tMudNh, vec2(p.x * 0.8 - p.y * 0.6, p.x * 0.6 + p.y * 0.8) / 0.43 + 0.3).rgb;
  // The place is pulled about by the clods it is trodden in: no edge of it is a curve drawn with a compass.
  vec2 q = vAt + 0.34 * (vec2(vnoise(vAt * 1.9 + vB.z * 31.0), vnoise(vAt * 1.9 + vB.z * 17.0 + 5.0)) - 0.5) + 0.2 * (wide.rg - 0.5) + 0.1 * (fine.rg - 0.5);
  float r = length(q);
  // The pad: longer than it is wide, with the four dents of the claws before it. An old one has slumped in from its edges.
  float old = vB.y;
  float size = 1.0 - 0.3 * smoothstep(0.3, 1.0, old);
  float pad = length((q - vec2(-0.04, 0.0)) / vec2(0.46, 0.38)) / size;
  float claws = 9.0;
  for (int c = 0; c < 4; c++) {
    float f = (float(c) - 1.5) / 1.5;
    claws = min(claws, length((q - vec2(0.5 - 0.1 * f * f, 0.3 * f)) / vec2(0.16, 0.085)));
  }
  float sunk = min(pad, claws + 0.25 * old) + 0.35 * (fine.b - 0.5);
  float hole = 1.0 - smoothstep(0.6, 1.1, sunk);
  float churn = 1.0 - smoothstep(0.45, 1.0, r + 0.5 * (fine.b - 0.5));
  // Seen: the print, the lumps thrown up round it, and a wet stain of the mud between that thins out into the ground.
  float shown = vB.w * max(max(hole, smoothstep(0.12, 0.3, vRise)), 0.55 * churn);
  // The mud itself is drawn as the wallow it lies in is drawn (dead/mud.ts), so that only what the foot has done to it shows.
  // Read, and the slope of the face taken, before any pixel is dropped: a pixel dropped beside one kept would leave it no neighbour to pick a level from.
  vec3 mw = texture2D(tMudNh, p / 2.0).rgb;
  vec3 mf = texture2D(tMudNh, vec2(p.x * 0.8 - p.y * 0.6, p.x * 0.6 + p.y * 0.8) / 1.37 + 0.3).rgb;
  vec3 tone = texture2D(tMud, p / 2.0).rgb / MUD_MEAN;
  vec3 dx = dFdx(vWorld);
  vec3 dz = dFdy(vWorld);
  if (shown < 0.004) discard;
  tone = mix(vec3(1.0), mix(vec3(dot(tone, vec3(0.3, 0.5, 0.2))), tone, 0.5), 0.6) * (0.9 + 0.2 * mf.b);
  float h0 = 0.62 * mw.b + 0.38 * mf.b;
  vec2 slope = (textureLod(tMudNh, p / 2.0, 2.5).rg - 0.5) * 0.9 + (mw.rg - 0.5) * 0.25 + (mf.rg - 0.5) * 0.1;
  float low = smoothstep(0.5, 0.34, h0);
  slope *= 1.0 - 0.85 * low;
  vec3 flat_ = normalize(cross(dx, dz));
  if (flat_.y < 0.0) flat_ = -flat_;
  vec3 n = normalize(flat_ + vec3(-slope.x, 0.0, slope.y));
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 albedo = vec3(0.08, 0.052, 0.042) * tone * 0.65;
  albedo = mix(albedo, vec3(0.07, 0.022, 0.016) * tone, 0.5 * smoothstep(0.35, 0.6, fbm(p * 2.3 + 7.0)));
  float stand = smoothstep(0.64, 0.52, h0);
  // Fresh mud turned up from under is redder, and shut off from the sky at the foot of each lump.
  float up = smoothstep(0.15, 0.7, vRise);
  albedo = mix(albedo, vec3(0.075, 0.024, 0.018) * tone, 0.55 * up);
  stand *= 1.0 - up;
  // The floor of the print is the mud the pad pressed: dark, smeared flat, and the brine comes up into the low side of it only.
  float lowSide = vnoise(vAt * 2.1 + vB.z * 11.0) + 0.35 * (wide.b - 0.5) - 0.5 * length(q - vec2(0.12, 0.1 * sin(vB.z * 40.0)));
  float pool = max(stand * (1.0 - hole), hole * smoothstep(0.1, 0.6, old) * smoothstep(0.28, 0.4, lowSide));
  albedo = mix(albedo, albedo * 0.62, hole);
  // Its wall leans in: the far side of it is turned to the lens and the sky, the near side is hidden.
  float lip = smoothstep(0.55, 0.85, sunk) * (1.0 - smoothstep(0.85, 1.2, sunk));
  vec2 inward = -normalize(q + 0.0001);
  n = normalize(n + 1.1 * lip * vec3(inward.x * vC.x - inward.y * vC.y, 0.0, inward.x * vC.y + inward.y * vC.x));
  albedo = mix(albedo, vec3(0.085, 0.012, 0.01), 0.9 * pool);
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), max(0.9 * pool, 0.4 * hole)));
  albedo = mix(albedo, albedo * vec3(0.55, 0.36, 0.32), low * (1.0 - hole));
  float rough = mix(mix(1.0, 0.97, low), 0.96, pool);
  // Dark under the leg that stands in it, inside the wall of the print, and between the lumps.
  float wall = hole * (1.0 - smoothstep(0.55, 0.95, min(pad, claws)));
  float occ = (0.6 + 0.4 * smoothstep(0.3, 0.6, h0)) * (1.0 - 0.5 * (1.0 - old) * (1.0 - smoothstep(0.35, 0.7, r)) - 0.3 * (hole - wall)) * (1.0 - 0.35 * smoothstep(0.05, 0.2, vRise) * (1.0 - up));
  vec3 c = rigShade(vWorld, n, v, albedo, rough, occ) * 0.75;
  gl_FragColor = vec4(rigOut(c) * (1.0 - uSolo), shown * (1.0 - uSolo));
}`;

export class Tread {
  readonly mesh: THREE.Mesh;
  private readonly a: Float32Array;
  private readonly b: Float32Array;
  private readonly c: Float32Array;
  private readonly attrA: THREE.InstancedBufferAttribute;
  private readonly attrB: THREE.InstancedBufferAttribute;
  private readonly attrC: THREE.InstancedBufferAttribute;
  private readonly material: THREE.ShaderMaterial;

  constructor(
    private readonly ctx: Context,
    private readonly count: number,
  ) {
    const n = count * PER;
    this.a = new Float32Array(n * 4);
    this.b = new Float32Array(n * 4);
    this.c = new Float32Array(n * 2);
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
    this.attrC = new THREE.InstancedBufferAttribute(this.c, 2);
    this.attrC.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('iC', this.attrC);
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
        const gone = Math.min(1, Math.max(0, left / 0.9));
        // It is fresh for a cycle, then the mud closes on it.
        const fade = Math.min(1, stood / 0.05) * (1 - 0.75 * Math.min(1, Math.max(0, (left - 0.5) / 1.6)));
        const seed = ((((m * 7 + l * 13 + i * 29) % 64) + 64) % 64) / 64;
        // No two are set down square: each is turned a little, the way that foot is carried.
        const turn = sd * 0.2 + 0.5 * (seed - 0.5);
        const q = (i * PER + l * KEPT + j) * 2;
        this.c[q] = fx * Math.cos(turn) - fz * Math.sin(turn);
        this.c[q + 1] = fz * Math.cos(turn) + fx * Math.sin(turn);
        const o = ((i * 4 + l) * KEPT + j) * 4;
        // The top of the mud: the land, and what is trodden up on it.
        this.a[o] = x;
        this.a[o + 1] = Math.max(land.height(x, z), plan.ground + 0.1 * k) + 0.03;
        this.a[o + 2] = z;
        this.a[o + 3] = (0.52 + 0.1 * seed) * k;
        this.b[o] = press;
        this.b[o + 1] = gone;
        this.b[o + 2] = seed;
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
    this.attrC.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
